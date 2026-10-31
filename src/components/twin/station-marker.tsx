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

interface StationMarkerProps {
  station: StationDTO;
  locale: Locale;
  editMode?: boolean;
  onClick: (station: StationDTO) => void;
  onMove?: (id: string, x: number, z: number) => void;
}

/** Visual height of the equipment model (used to position status ring and label above it) */
const HEIGHT_BY_TYPE: Record<string, number> = {
  CCP: 1.6,
  CP: 1.3,
  PRP: 1.1,
};

/** Radius used for the status ring */
const RING_RADIUS: Record<string, number> = {
  CCP: 0.65,
  CP: 0.55,
  PRP: 0.45,
};

const STATUS_COLORS: Record<string, string> = {
  OK: '#22c55e',
  OUT_OF_RANGE: '#ef4444',
  NO_DATA: '#9ca3af',
  STALE: '#f59e0b',
};

/** Status indicator ring at the top of the model */
function StatusRing({
  radius,
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
      <torusGeometry args={[radius, 0.09, 8, 32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.3}
        emissive={color}
        emissiveIntensity={pulse ? 0.7 : 0.15}
      />
    </mesh>
  );
}

/**
 * Station marker that renders a realistic procedural equipment model,
 * with the existing status ring, label, drag-in-edit-mode, and click behaviour.
 */
export default function StationMarker({
  station,
  locale,
  editMode = false,
  onClick,
  onMove,
}: StationMarkerProps) {
  const t = getDictionary(locale);
  const ringRef = useRef<Mesh>(null!);
  const groupRef = useRef<Group>(null!);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const { camera, gl, raycaster } = useThree();

  const height = HEIGHT_BY_TYPE[station.controlType] ?? 1.1;
  const ringR = RING_RADIUS[station.controlType] ?? 0.5;
  const color = STATUS_COLORS[station.status] ?? '#9ca3af';
  const isOutOfRange = station.status === 'OUT_OF_RANGE';

  const modelType = resolveModelType(station.id, station.name);

  // Floor plane for raycasting during drag
  const floorPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectPoint = useRef(new THREE.Vector3());

  // Pulse ring for OUT_OF_RANGE
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    if (isOutOfRange) {
      const pulse = 0.9 + 0.1 * Math.sin(clock.getElapsedTime() * 5);
      ringRef.current.scale.setScalar(pulse);
    } else {
      ringRef.current.scale.setScalar(1);
    }
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

  return (
    <group
      ref={groupRef}
      // Equipment models are built from y=0 (floor level), so group sits at y=0
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
          <meshStandardMaterial color="#ffffff" transparent opacity={0.25} depthWrite={false} />
        </mesh>
      )}

      {/* Realistic procedural equipment model */}
      <EquipmentModel
        modelType={modelType}
        controlType={station.controlType}
        scale={1}
      />

      {/* Status ring above equipment */}
      <StatusRing
        radius={ringR}
        height={height}
        color={color}
        pulse={isOutOfRange}
        ringRef={ringRef}
      />

      {/* Always-visible label */}
      <Html
        center
        position={[0, height + 0.75, 0]}
        distanceFactor={14}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          style={{
            background: 'rgba(15,23,42,0.85)',
            color: '#f1f5f9',
            fontSize: '12px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            border: `1.5px solid ${color}`,
          }}
        >
          <span>{station.name}</span>
          <span
            style={{
              background: color,
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            {station.controlType} · {t.status[station.status as keyof typeof t.status]}
          </span>
        </div>
      </Html>
    </group>
  );
}
