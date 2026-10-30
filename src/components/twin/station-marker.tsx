'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';

interface StationMarkerProps {
  station: StationDTO;
  locale: Locale;
  onClick: (station: StationDTO) => void;
}

/** CCP is taller so it stands out */
const HEIGHT_BY_TYPE: Record<string, number> = {
  CCP: 1.0,
  CP: 0.7,
  PRP: 0.5,
};

const STATUS_COLORS: Record<string, string> = {
  OK: '#22c55e',
  OUT_OF_RANGE: '#ef4444',
  NO_DATA: '#9ca3af',
  STALE: '#f59e0b',
};

/** Radius of the cylinder body */
const RADIUS = 0.3;

/**
 * Cylinder marker per station with a status-colored ring.
 * OUT_OF_RANGE ring pulses.  Hover changes cursor.
 */
export default function StationMarker({ station, locale, onClick }: StationMarkerProps) {
  const t = getDictionary(locale);
  const ringRef = useRef<Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  const height = HEIGHT_BY_TYPE[station.controlType] ?? 0.5;
  const color = STATUS_COLORS[station.status] ?? '#9ca3af';
  const isOutOfRange = station.status === 'OUT_OF_RANGE';

  // Pulse ring for OUT_OF_RANGE stations
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    if (isOutOfRange) {
      const pulse = 0.85 + 0.15 * Math.sin(clock.getElapsedTime() * 4);
      ringRef.current.scale.setScalar(pulse);
    } else {
      ringRef.current.scale.setScalar(1);
    }
  });

  // position: x runs along X, z along Z, body sits on the floor (y = height/2)
  return (
    <group
      position={[station.position.x, height / 2, station.position.z]}
      rotation={[0, station.position.rotationY ?? 0, 0]}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(station);
      }}
    >
      {/* Body */}
      <mesh>
        <cylinderGeometry args={[RADIUS, RADIUS, height, 16]} />
        <meshStandardMaterial
          color={hovered ? '#e2e8f0' : '#1e293b'}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Status ring — sits at the top of the cylinder */}
      <mesh ref={ringRef} position={[0, height / 2, 0]}>
        <torusGeometry args={[RADIUS * 1.35, 0.07, 8, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>

      {/* Hover tooltip (Html label) — only when hovered */}
      {hovered && (
        <group position={[0, height / 2 + 0.5, 0]}>
          {/* Use a simple drei-Html tooltip replacement via a mesh-based label isn't feasible
              without drei Html; we rely on Html here for simplicity */}
          <HoverLabel
            name={station.name}
            controlType={station.controlType}
            status={station.status}
            t={t}
          />
        </group>
      )}
    </group>
  );
}

/** Inline component — renders an Html overlay on hover */
function HoverLabel({
  name,
  controlType,
  status,
  t,
}: {
  name: string;
  controlType: string;
  status: string;
  t: ReturnType<typeof getDictionary>;
}) {
  // Import Html lazily to avoid SSR issues — module is already client-only
  const { Html } = require('@react-three/drei') as typeof import('@react-three/drei');
  const statusColor = STATUS_COLORS[status] ?? '#9ca3af';

  return (
    <Html center distanceFactor={10} style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <div
        style={{
          background: 'rgba(15,23,42,0.88)',
          color: '#f1f5f9',
          fontSize: '11px',
          fontWeight: 500,
          padding: '4px 8px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
        }}
      >
        <span>{name}</span>
        <span style={{ opacity: 0.75 }}>
          {t.controlType[controlType as keyof typeof t.controlType]}
        </span>
        <span
          style={{
            background: statusColor,
            padding: '1px 5px',
            borderRadius: '3px',
            fontSize: '10px',
          }}
        >
          {t.status[status as keyof typeof t.status]}
        </span>
      </div>
    </Html>
  );
}
