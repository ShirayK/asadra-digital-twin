'use client';

import { useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SeparationIssue } from '@/domain/separation';
import type { FlowSegment } from '@/domain/flow';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';
import { brand, status as themeStatus, glass } from '@/theme/asadra';

interface SeparationOverlayProps {
  issues: SeparationIssue[];
  /** All flow segments — used to resolve edge endpoint positions */
  flowSegments: FlowSegment[];
  locale: Locale;
}

interface ResolvedIssue {
  issue: SeparationIssue;
  from: { x: number; z: number };
  to: { x: number; z: number };
}

/**
 * Draws red line segments over process edges that have separation issues.
 * Labels use constant screen size (no distanceFactor), stacked vertically via
 * position offset so they do not overlap station labels.
 * Clicking an issue smoothly moves the camera to focus on it.
 */
export default function SeparationOverlay({
  issues,
  flowSegments,
  locale,
}: SeparationOverlayProps) {
  if (issues.length === 0) return null;

  const segmentMap = new Map<string, FlowSegment>();
  for (const seg of flowSegments) {
    segmentMap.set(`${seg.edge.from}->${seg.edge.to}`, seg);
  }

  const resolved: ResolvedIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.fromStepId}->${issue.toStepId}`;
    const seg = segmentMap.get(key);
    if (seg) {
      resolved.push({ issue, from: seg.from, to: seg.to });
    }
  }

  if (resolved.length === 0) return null;

  return (
    <>
      {resolved.map((ri, i) => (
        <IssueSegment key={i} index={i} resolved={ri} locale={locale} />
      ))}
    </>
  );
}

// Module-level camera lerp target
let cameraTarget: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;

/** Renders one issue segment with warning badge and click-to-focus. */
function IssueSegment({
  resolved,
  locale,
  index = 0,
}: {
  index?: number;
  resolved: ResolvedIssue;
  locale: Locale;
}) {
  const { Line, Html } = require('@react-three/drei') as typeof import('@react-three/drei');
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);

  const t = getDictionary(locale);

  const Y = 0.35;
  const from: [number, number, number] = [resolved.from.x, Y, resolved.from.z];
  const to: [number, number, number] = [resolved.to.x, Y, resolved.to.z];
  // Midpoint of the edge segment in world space
  const rawMidX = (resolved.from.x + resolved.to.x) / 2;
  const rawMidZ = (resolved.from.z + resolved.to.z) / 2;
  // Offset the chip AWAY from the belt/conveyor line — perpendicular offset in Z,
  // raised high enough (Y > belt height ≈ 2.16) so it floats above equipment.
  // Stagger multiple chips along Z so they don't overlap each other.
  const mid = {
    x: rawMidX,
    z: rawMidZ + 3.2 + index * 1.2,
  };

  const tooltipText = t.separation[resolved.issue.kind];
  const allergenSuffix = resolved.issue.allergenCode ? ` (${resolved.issue.allergenCode})` : '';

  const glowRef = useRef<THREE.Mesh>(null);
  const iconRef = useRef<THREE.Group>(null);
  const dx = resolved.to.x - resolved.from.x;
  const dz = resolved.to.z - resolved.from.z;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);

  // Badge sits high enough above the belt (belt surface ≈ 2.16 u at scale=3)
  // so the chip floats above equipment without covering it.
  const BADGE_Y = 4.0;

  useFrame(({ clock }) => {
    const t2 = clock.elapsedTime;
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.35 + 0.25 * Math.sin(t2 * 4);
    }
    if (iconRef.current) {
      iconRef.current.position.y = BADGE_Y - 1.2 + Math.sin(t2 * 2) * 0.12;
      iconRef.current.rotation.y = t2 * 1.2;
    }
    if (!cameraTarget) return;
    camera.position.lerp(cameraTarget.pos, 0.05);
  });

  function focusIssue() {
    cameraTarget = {
      pos: new THREE.Vector3(mid.x, 12, mid.z + 8),
      look: new THREE.Vector3(mid.x, 0, mid.z),
    };
  }

  return (
    <group
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
        focusIssue();
      }}
    >
      {/* Dashed warning line */}
      <Line
        points={[from, to]}
        color={themeStatus.deviation}
        lineWidth={hovered ? 10 : 8}
        dashed
        dashSize={0.5}
        gapSize={0.25}
      />

      {/* Glowing halo tube */}
      <mesh ref={glowRef} position={[mid.x, Y - 0.05, mid.z]} rotation={[Math.PI / 2, 0, -ang]}>
        <cylinderGeometry args={[0.28, 0.28, len, 12, 1, true]} />
        <meshBasicMaterial
          color={themeStatus.deviation}
          transparent
          opacity={0.45}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Floating 3-D warning icon — raised above conveyor */}
      <group ref={iconRef} position={[mid.x, BADGE_Y - 1.2, mid.z]}>
        <mesh>
          <cylinderGeometry args={[0.7, 0.7, 0.12, 3]} />
          <meshStandardMaterial
            color="#facc15"
            emissive="#f59e0b"
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.95, 0.05, 8, 32]} />
          <meshBasicMaterial color={themeStatus.deviation} toneMapped={false} />
        </mesh>
      </group>

      {/*
       * Always-visible badge — stacked above station label height.
       * No distanceFactor → constant screen size.
       * zIndexRange keeps it under the UI panels (zIndex 30+).
       */}
      <Html
        position={[mid.x, BADGE_Y, mid.z]}
        center
        zIndexRange={[11, 21]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          style={{
            background: `rgba(120,20,20,0.92)`,
            border: `1px solid ${themeStatus.deviation}`,
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 9px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            boxShadow: `0 0 12px rgba(220,38,38,0.6)`,
          }}
        >
          ⚠ {tooltipText}{allergenSuffix}
        </div>
      </Html>

      {/* Sphere at midpoint for clickability — raised so it's above conveyors */}
      <mesh position={[mid.x, BADGE_Y - 0.4, mid.z]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color={hovered ? '#fca5a5' : themeStatus.deviation}
          roughness={0.4}
          emissive={themeStatus.deviation}
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>

      {/* Hover tooltip — constant screen size, stacked below badge */}
      {hovered && (
        <Html
          position={[mid.x, 1.2, mid.z]}
          center
          zIndexRange={[11, 21]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              background: `rgba(120,20,20,0.92)`,
              color: '#fef2f2',
              fontSize: '11px',
              fontWeight: 500,
              padding: '5px 9px',
              borderRadius: '6px',
              whiteSpace: 'normal',
              maxWidth: '220px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>
              ⚠ {tooltipText}{allergenSuffix}
            </div>
            <div style={{ opacity: 0.85, fontSize: '10px' }}>
              {resolved.issue.fromStepId} → {resolved.issue.toStepId}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
