'use client';

import { useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SeparationIssue } from '@/domain/separation';
import type { FlowSegment } from '@/domain/flow';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';

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
 * Each segment shows a tooltip explaining the rule.
 * Clicking an issue smoothly moves the camera to focus on it.
 */
export default function SeparationOverlay({
  issues,
  flowSegments,
  locale,
}: SeparationOverlayProps) {
  if (issues.length === 0) return null;

  // Build a lookup: "fromStepId->toStepId" → segment positions
  const segmentMap = new Map<string, FlowSegment>();
  for (const seg of flowSegments) {
    segmentMap.set(`${seg.edge.from}->${seg.edge.to}`, seg);
  }

  // Resolve positions for each issue
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
        <IssueSegment key={i} resolved={ri} locale={locale} />
      ))}
    </>
  );
}

// Target for smooth camera animation
let cameraTarget: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;

/** Renders one red issue segment with tooltip and click-to-focus. */
function IssueSegment({
  resolved,
  locale,
}: {
  resolved: ResolvedIssue;
  locale: Locale;
}) {
  const { Line, Html } = require('@react-three/drei') as typeof import('@react-three/drei');
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);

  const t = getDictionary(locale);

  const Y = 0.12; // slightly higher than flow arrows so it's visible on top
  const from: [number, number, number] = [resolved.from.x, Y, resolved.from.z];
  const to: [number, number, number] = [resolved.to.x, Y, resolved.to.z];
  const mid = {
    x: (resolved.from.x + resolved.to.x) / 2,
    z: (resolved.from.z + resolved.to.z) / 2,
  };

  // Tooltip explanation text
  const tooltipText = t.separation[resolved.issue.kind];
  const allergenSuffix =
    resolved.issue.allergenCode ? ` (${resolved.issue.allergenCode})` : '';

  // Animate camera toward the target on click
  useFrame(() => {
    if (!cameraTarget) return;
    camera.position.lerp(cameraTarget.pos, 0.05);
  });

  function focusIssue() {
    // Position camera above and in front of the midpoint
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
      {/* Red dashed line for this issue */}
      <Line
        points={[from, to]}
        color="#ef4444"
        lineWidth={hovered ? 4 : 3}
        dashed
        dashSize={0.3}
        gapSize={0.15}
      />

      {/* Sphere at midpoint for clickability */}
      <mesh position={[mid.x, Y + 0.15, mid.z]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color={hovered ? '#fca5a5' : '#ef4444'}
          roughness={0.4}
          emissive="#ef4444"
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>

      {/* Tooltip on hover */}
      {hovered && (
        <Html
          position={[mid.x, 1.2, mid.z]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              background: 'rgba(185,28,28,0.92)',
              color: '#fef2f2',
              fontSize: '11px',
              fontWeight: 500,
              padding: '5px 9px',
              borderRadius: '5px',
              whiteSpace: 'normal',
              maxWidth: '220px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>⚠ {tooltipText}{allergenSuffix}</div>
            <div style={{ opacity: 0.85, fontSize: '10px' }}>
              {resolved.issue.fromStepId} → {resolved.issue.toStepId}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
