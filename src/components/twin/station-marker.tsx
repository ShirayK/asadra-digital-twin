'use client';

import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh, Group } from 'three';
import type { StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';

interface StationMarkerProps {
  station: StationDTO;
  locale: Locale;
  editMode?: boolean;
  onClick: (station: StationDTO) => void;
  onMove?: (id: string, x: number, z: number) => void;
}

/** CCP is taller so it stands out — bigger than before */
const HEIGHT_BY_TYPE: Record<string, number> = {
  CCP: 2.0,
  CP: 1.4,
  PRP: 1.0,
};

/** Radius of the station body — larger for readability */
const RADIUS_BY_TYPE: Record<string, number> = {
  CCP: 0.6,
  CP: 0.45,
  PRP: 0.35,
};

const STATUS_COLORS: Record<string, string> = {
  OK: '#22c55e',
  OUT_OF_RANGE: '#ef4444',
  NO_DATA: '#9ca3af',
  STALE: '#f59e0b',
};

/** Equipment shape geometry per control type: CCP = hexagonal prism, CP = box, PRP = cylinder */
function EquipmentBody({
  controlType,
  height,
  radius,
  hovered,
  color,
}: {
  controlType: string;
  height: number;
  radius: number;
  hovered: boolean;
  color: string;
}) {
  const mat = (
    <meshStandardMaterial
      color={hovered ? '#e2e8f0' : '#1e293b'}
      roughness={0.35}
      metalness={0.3}
    />
  );

  if (controlType === 'CCP') {
    // Hexagonal prism for CCP — distinctive shape
    return (
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 6]} />
        {mat}
      </mesh>
    );
  }
  if (controlType === 'CP') {
    // Rounded box for CP
    return (
      <mesh castShadow receiveShadow>
        <boxGeometry args={[radius * 2, height, radius * 2]} />
        {mat}
      </mesh>
    );
  }
  // PRP — simple cylinder
  return (
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius * 1.1, height, 12]} />
      {mat}
    </mesh>
  );
}

/** Status indicator ring at the top of the body */
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
    <mesh ref={ringRef} position={[0, height / 2 + 0.05, 0]}>
      <torusGeometry args={[radius * 1.4, 0.1, 8, 32]} />
      <meshStandardMaterial color={color} roughness={0.2} emissive={color} emissiveIntensity={pulse ? 0.6 : 0.1} />
    </mesh>
  );
}

/**
 * Station marker with equipment-like shape, always-visible label, status ring.
 * In edit mode, supports dragging on the floor plane with 0.5m snapping.
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

  const height = HEIGHT_BY_TYPE[station.controlType] ?? 1.0;
  const radius = RADIUS_BY_TYPE[station.controlType] ?? 0.4;
  const color = STATUS_COLORS[station.status] ?? '#9ca3af';
  const isOutOfRange = station.status === 'OUT_OF_RANGE';

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
      // Capture pointer so we receive move events outside the mesh
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
          groupRef.current.position.set(nx, height / 2, nz);
        }
      }
    },
    [dragging, editMode, camera, raycaster, gl, height],
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
      position={[station.position.x, height / 2, station.position.z]}
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
        if (editMode) return; // no panel open in edit mode
        e.stopPropagation();
        onClick(station);
      }}
    >
      {/* Equipment-like body shape */}
      <EquipmentBody
        controlType={station.controlType}
        height={height}
        radius={radius}
        hovered={hovered}
        color={color}
      />

      {/* Status ring at top */}
      <StatusRing
        radius={radius}
        height={height}
        color={color}
        pulse={isOutOfRange}
        ringRef={ringRef}
      />

      {/* Always-visible label — no longer hover-only */}
      <Html
        center
        position={[0, height / 2 + 0.7, 0]}
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
