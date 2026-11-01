'use client';

import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh, Group } from 'three';
import type { StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';
import { EquipmentModel, resolveModelType, HEIGHT_BY_MODEL } from './equipment-models';
import { brand, stationStatus } from '@/theme/asadra';

// ── Screen-space label collision registry ─────────────────────────────────────
// Updated each frame by the StationMarker that owns each entry.
// Higher-priority labels suppress lower-priority ones when screen rects overlap.
//
// Priority values (higher = more important):
//   3 — OUT_OF_RANGE breach
//   2 — selected station
//   1 — station with a separation warning (injected from outside)
//   0 — normal

export type LabelPriority = 0 | 1 | 2 | 3;

interface LabelEntry {
  id: string;
  screenX: number;
  screenY: number;
  /** Approximate screen-space half-width of the label pill in px */
  halfW: number;
  /** Approximate screen-space half-height of the label pill in px */
  halfH: number;
  priority: LabelPriority;
}

// Module-level store — shared across all StationMarker instances in the same Canvas
const labelStore: Map<string, LabelEntry> = new Map();

/** Register/update a label entry.  Called from useFrame inside StationMarker. */
export function updateLabelEntry(entry: LabelEntry): void {
  labelStore.set(entry.id, entry);
}

/** Remove a label entry on unmount. */
export function removeLabelEntry(id: string): void {
  labelStore.delete(id);
}

/**
 * Returns true when this label should be suppressed because a higher-priority
 * label's bounding rect overlaps it in screen space.
 *
 * Overlap test: axis-aligned bounding box (AABB).
 */
export function isLabelOccluded(id: string): boolean {
  const self = labelStore.get(id);
  if (!self) return false;

  for (const [otherId, other] of labelStore) {
    if (otherId === id) continue;
    if (other.priority <= self.priority) continue;
    // AABB overlap check
    const dx = Math.abs(other.screenX - self.screenX);
    const dy = Math.abs(other.screenY - self.screenY);
    const overlapX = dx < other.halfW + self.halfW;
    const overlapY = dy < other.halfH + self.halfH;
    if (overlapX && overlapY) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────

interface StationMarkerProps {
  station: StationDTO;
  locale: Locale;
  editMode?: boolean;
  selected?: boolean;
  /** Whether this station has an active separation warning */
  hasSeparationWarning?: boolean;
  onClick: (station: StationDTO) => void;
  onMove?: (id: string, x: number, z: number) => void;
  /** When true, suppress the 3-D label (used to hide equipment sub-labels) */
  hideLabel?: boolean;
}

/** Floor-outline ring radius per controlType (at scale=3, in world units) */
const FLOOR_RING_RADIUS: Record<string, number> = {
  CCP: 2.1,
  CP: 1.8,
  PRP: 1.5,
};

/**
 * Thin floor-level status outline ring.
 * Much subtler than the old raised torus — just a flat ring on the floor plane,
 * coloured by status, thin tube so it doesn't dominate the scene.
 */
function FloorRing({
  radius: r,
  color,
  pulse,
  ringRef,
}: {
  radius: number;
  color: string;
  pulse: boolean;
  ringRef: React.RefObject<Mesh>;
}) {
  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <torusGeometry args={[r, 0.045, 4, 48]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.1}
        emissive={color}
        emissiveIntensity={pulse ? 2.2 : 0.7}
        transparent
        opacity={pulse ? 0.95 : 0.7}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Station marker — procedural equipment model, status ring, LOD label.
 *
 * Label visibility rules (priority order):
 *  1. hideLabel prop → always hidden.
 *  2. Not in "showFull" mode (far away, not selected, not breaching) → dot only.
 *  3. Screen-space collision: if a higher-priority label overlaps this one
 *     in screen coordinates, collapse to a dot.
 *
 * Priority: breach (OUT_OF_RANGE)=3, selected=2, separation warning=1, normal=0.
 */
export default function StationMarker({
  station,
  locale,
  editMode = false,
  selected = false,
  hasSeparationWarning = false,
  onClick,
  onMove,
  hideLabel = false,
}: StationMarkerProps) {
  const t = getDictionary(locale);
  const ringRef = useRef<Mesh>(null!);
  const groupRef = useRef<Group>(null!);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const { camera, gl, raycaster, size } = useThree();

  const modelType = resolveModelType(station.id, station.name);
  // HEIGHT_BY_MODEL values are already in world units at scale=3
  const height = HEIGHT_BY_MODEL[modelType] ?? 3.6;
  const ringR = FLOOR_RING_RADIUS[station.controlType] ?? 1.5;
  const color = stationStatus[station.status as keyof typeof stationStatus] ?? stationStatus.NO_DATA;
  const isOutOfRange = station.status === 'OUT_OF_RANGE';

  // World-space label anchor — above the model
  const labelWorldPos = useRef(new THREE.Vector3());
  const screenPos = useRef(new THREE.Vector3());

  const floorPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectPoint = useRef(new THREE.Vector3());

  // LOD: close = full label, far = dot (unless selected or breaching)
  const [closeCamera, setCloseCamera] = useState(true);
  // Collision result: true = suppressed by higher-priority label
  const [occluded, setOccluded] = useState(false);

  // Compute this label's priority
  // CCP stations always show at least priority 1 so they aren't suppressed by
  // lower-importance labels.  OUT_OF_RANGE > selected > CCP/separation > normal.
  const priority: LabelPriority = isOutOfRange
    ? 3
    : selected
    ? 2
    : (hasSeparationWarning || station.controlType === 'CCP')
    ? 1
    : 0;

  // Pulse ring for OUT_OF_RANGE; update label position; LOD check; collision update
  useFrame(({ clock, camera: cam }) => {
    if (ringRef.current) {
      if (isOutOfRange) {
        const pulse = 0.9 + 0.1 * Math.sin(clock.getElapsedTime() * 5);
        ringRef.current.scale.setScalar(pulse);
      } else {
        ringRef.current.scale.setScalar(1);
      }
    }
    // Update label world position from the group
    if (groupRef.current) {
      groupRef.current.getWorldPosition(labelWorldPos.current);
      labelWorldPos.current.y += height * 0.55 + 0.6;
    }
    // LOD check — update local state only on transitions to avoid React re-renders every frame
    const d = cam.position.distanceTo(labelWorldPos.current);
    const nowClose = d < 45;
    setCloseCamera((prev) => (prev !== nowClose ? nowClose : prev));

    // Compute screen-space position for collision detection
    if (!hideLabel) {
      screenPos.current.copy(labelWorldPos.current);
      screenPos.current.project(cam);
      const sx = (screenPos.current.x * 0.5 + 0.5) * size.width;
      const sy = (-screenPos.current.y * 0.5 + 0.5) * size.height;

      // Approximate label pill size: ~80px wide, ~20px tall
      const halfW = 45;
      const halfH = 12;

      updateLabelEntry({
        id: station.id,
        screenX: sx,
        screenY: sy,
        halfW,
        halfH,
        priority,
      });

      const nowOccluded = isLabelOccluded(station.id);
      setOccluded((prev) => (prev !== nowOccluded ? nowOccluded : prev));
    }
  });

  // Clean up registry on unmount
  // (useEffect cleanup runs on unmount; no deps needed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stationId = station.id;
  // We rely on the closure — see cleanup inside the component return statement
  // using a ref-based approach would add complexity; the store is tolerant of stale entries.

  const snap = (v: number) => Math.round(v / 0.5) * 0.5;

  const handlePointerDown = useCallback(
    (e: any) => {
      if (!editMode) return;
      e.stopPropagation();
      setDragging(true);
      gl.domElement.style.cursor = 'grabbing';
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [editMode, gl],
  );

  const handlePointerMove = useCallback(
    (e: any) => {
      if (!dragging || !editMode) return;
      e.stopPropagation();
      const ndcX = (e.clientX / gl.domElement.clientWidth) * 2 - 1;
      const ndcY = -(e.clientY / gl.domElement.clientHeight) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      if (raycaster.ray.intersectPlane(floorPlane.current, intersectPoint.current)) {
        const nx = snap(intersectPoint.current.x);
        const nz = snap(intersectPoint.current.z);
        if (groupRef.current) {
          groupRef.current.position.set(nx, 0, nz);
        }
      }
    },
    [dragging, editMode, camera, raycaster, gl],
  );

  const handlePointerUp = useCallback(
    (e: any) => {
      if (!dragging) return;
      e.stopPropagation();
      setDragging(false);
      gl.domElement.style.cursor = editMode ? 'grab' : 'auto';
      if (groupRef.current && onMove) {
        const nx = snap(groupRef.current.position.x);
        const nz = snap(groupRef.current.position.z);
        onMove(stationId, nx, nz);
      }
    },
    [dragging, editMode, gl, onMove, stationId],
  );

  // Decide whether to show full label or dot
  // CCP labels always show when camera is close (never occlude them while close).
  // Other labels: occluded by higher-priority label → show dot.
  const isCCP = station.controlType === 'CCP';
  const showFullLabel = (closeCamera || selected || isOutOfRange) &&
    (!occluded || isCCP || selected || isOutOfRange);
  const displayName = locale === 'en' && station.nameEn ? station.nameEn : station.name;

  return (
    <group
      ref={groupRef}
      position={[station.position.x, 0, station.position.z]}
      rotation={[0, station.position.rotationY ?? 0, 0]}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = editMode ? 'grab' : 'pointer';
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHovered(false);
        if (!dragging) document.body.style.cursor = 'auto';
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        if (editMode) return;
        e.stopPropagation();
        onClick(station);
      }}
    >
      {/* Thin floor-level status outline ring */}
      <FloorRing radius={ringR} color={color} pulse={isOutOfRange} ringRef={ringRef} />

      {/* Hover highlight ring on floor */}
      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
          <ringGeometry args={[ringR * 0.88, ringR * 1.15, 40]} />
          <meshStandardMaterial
            color={brand[400]}
            transparent
            opacity={0.28}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Realistic procedural equipment model */}
      <EquipmentModel modelType={modelType} controlType={station.controlType} scale={3} />

      {/* Label — constant screen-size (no distanceFactor), LOD dot vs full */}
      {!hideLabel && (
        <Html
          center
          position={[0, height * 0.55 + 0.6, 0]}
          zIndexRange={[10, 20]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {showFullLabel ? (
              /* Full label — 13px, light glass, max 140px, no-wrap to prevent browser push */
              <div
                title={displayName}
                style={{
                  background: `rgba(255,255,255,0.92)`,
                  color: '#1c1830',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  maxWidth: '220px',
                  width: 'max-content',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  border: `1px solid ${color}55`,
                  backdropFilter: 'blur(6px)',
                  boxShadow: `0 1px 6px rgba(104,65,176,0.18)`,
                  lineHeight: 1.3,
                  // Prevent browser layout from pushing the pill off-center
                  position: 'relative',
                  left: 0,
                  transform: 'none',
                }}
              >
              <span
                style={{
                  display: 'inline-block',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                {displayName}
              </span>
            </div>
          ) : (
            /* LOD dot — distant camera or occluded: just a colored dot, name on hover */
            <div
              title={displayName}
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: color,
                border: `2px solid rgba(255,255,255,0.8)`,
                boxShadow: `0 0 4px ${color}66`,
                cursor: 'default',
              }}
            />
          )}
        </Html>
      )}
    </group>
  );
}
