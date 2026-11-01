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

interface StationMarkerProps {
  station: StationDTO;
  locale: Locale;
  editMode?: boolean;
  selected?: boolean;
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

/**
 * LOD hook: returns true when the camera is closer than `threshold` units
 * to the given world-space position.  Used to collapse distant labels to dots.
 */
function useLabelLod(
  position: THREE.Vector3Like,
  threshold = 45,
): boolean {
  const { camera } = useThree();
  const closeRef = useRef(true);

  useFrame(() => {
    const d = camera.position.distanceTo(position as THREE.Vector3);
    closeRef.current = d < threshold;
  });

  // Return current value — re-render is driven by the Html component polling
  return closeRef.current;
}

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
 * Label LOD rules:
 *  - Camera < 45 u away → full label for all stations.
 *  - Camera ≥ 45 u away → colored dot only, except for selected station and
 *    breached (OUT_OF_RANGE) stations which always show the full label.
 */
export default function StationMarker({
  station,
  locale,
  editMode = false,
  selected = false,
  onClick,
  onMove,
  hideLabel = false,
}: StationMarkerProps) {
  const t = getDictionary(locale);
  const ringRef = useRef<Mesh>(null!);
  const groupRef = useRef<Group>(null!);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const { camera, gl, raycaster } = useThree();

  const height = HEIGHT_BY_TYPE[station.controlType] ?? 1.1;
  const ringR = RING_RADIUS[station.controlType] ?? 0.5;
  const color = stationStatus[station.status as keyof typeof stationStatus] ?? stationStatus.NO_DATA;
  const isOutOfRange = station.status === 'OUT_OF_RANGE';

  const modelType = resolveModelType(station.id, station.name);

  // World-space label anchor — above the status ring
  const labelWorldPos = useRef(new THREE.Vector3());

  const floorPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectPoint = useRef(new THREE.Vector3());

  // LOD: close = full label, far = dot (unless selected or breaching)
  const [closeCamera, setCloseCamera] = useState(true);

  // Pulse ring for OUT_OF_RANGE; update label position; LOD check
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
  });

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
        onMove(station.id, nx, nz);
      }
    },
    [dragging, editMode, gl, onMove, station.id],
  );

  // Decide whether to show full label or dot
  const showFullLabel = closeCamera || selected || isOutOfRange;
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
            /* LOD dot — distant camera: just a colored dot, name on hover */
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
