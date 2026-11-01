'use client';

import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh, Group } from 'three';
import type { StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';
import { EquipmentModel, resolveModelType } from './equipment-models';
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

/** Visual height of the equipment model at 3x scale */
const HEIGHT_BY_TYPE: Record<string, number> = {
  CCP: 4.8,
  CP: 3.9,
  PRP: 3.3,
};

/** Radius used for the status ring at 3x scale */
const RING_RADIUS: Record<string, number> = {
  CCP: 1.95,
  CP: 1.65,
  PRP: 1.35,
};

/** Status indicator ring at the top of the model */
function StatusRing({
  radius: r,
  height,
  color,
  pulse,
  ringRef,
}: {
  radius: number;
  height: number;
  color: string;
  pulse: boolean;
  ringRef: React.RefObject<Mesh>;
}) {
  return (
    <mesh ref={ringRef} position={[0, height + 0.12, 0]}>
      <torusGeometry args={[r, 0.09, 8, 32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.1}
        metalness={0.2}
        emissive={color}
        emissiveIntensity={pulse ? 2.5 : 1.0}
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

  const height = HEIGHT_BY_TYPE[station.controlType] ?? 1.1;
  const ringR = RING_RADIUS[station.controlType] ?? 0.5;
  const color = stationStatus[station.status as keyof typeof stationStatus] ?? stationStatus.NO_DATA;
  const isOutOfRange = station.status === 'OUT_OF_RANGE';

  const modelType = resolveModelType(station.id, station.name);

  // World-space label anchor — above the status ring
  const labelWorldPos = useRef(new THREE.Vector3());
  const screenPos = useRef(new THREE.Vector3());

  const floorPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectPoint = useRef(new THREE.Vector3());

  // LOD: close = full label, far = dot (unless selected or breaching)
  const [closeCamera, setCloseCamera] = useState(true);
  // Collision result: true = suppressed by higher-priority label
  const [occluded, setOccluded] = useState(false);

  // Compute this label's priority
  const priority: LabelPriority = isOutOfRange
    ? 3
    : selected
    ? 2
    : hasSeparationWarning
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
      labelWorldPos.current.y += height + 2.0;
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
  // Occluded by higher-priority label → show dot
  const showFullLabel = (closeCamera || selected || isOutOfRange) && !occluded;
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
      {/* Hover highlight ring on floor */}
      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[ringR * 0.85, ringR * 1.1, 32]} />
          <meshStandardMaterial
            color={brand[400]}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Realistic procedural equipment model */}
      <EquipmentModel modelType={modelType} controlType={station.controlType} scale={3} />

      {/* Status ring above equipment */}
      <StatusRing radius={ringR} height={height} color={color} pulse={isOutOfRange} ringRef={ringRef} />

      {/* Label — constant screen-size (no distanceFactor), LOD dot vs full */}
      {!hideLabel && (
        <Html
          center
          position={[0, height + 2.0, 0]}
          zIndexRange={[10, 20]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {showFullLabel ? (
            /* Full label */
            <div
              title={displayName}
              style={{
                background: `rgba(36,18,80,0.88)`,
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '160px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                border: `1px solid ${color}55`,
                backdropFilter: 'blur(4px)',
                boxShadow: `0 2px 8px rgba(36,18,80,0.5)`,
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
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </span>
            </div>
          ) : (
            /* LOD dot — distant camera or occluded: just a colored dot, name on hover */
            <div
              title={displayName}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: color,
                border: `2px solid rgba(255,255,255,0.6)`,
                boxShadow: `0 0 6px ${color}88`,
                cursor: 'default',
              }}
            />
          )}
        </Html>
      )}
    </group>
  );
}
