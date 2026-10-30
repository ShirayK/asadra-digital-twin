'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { FlowSegment } from '@/domain/flow';

interface FlowArrowsProps {
  segments: FlowSegment[];
}

/**
 * Renders flow segments as animated dashed lines in the 3-D scene.
 * Each segment gets an individual dash-offset animation to indicate direction.
 * The Line component from @react-three/drei is loaded lazily (client-only).
 */
export default function FlowArrows({ segments }: FlowArrowsProps) {
  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((seg, i) => (
        <AnimatedFlowLine key={`${seg.edge.from}-${seg.edge.to}-${i}`} segment={seg} />
      ))}
    </>
  );
}

/** Animates the dashOffset of a single line segment to simulate flowing movement. */
function AnimatedFlowLine({ segment }: { segment: FlowSegment }) {
  const { Line } = require('@react-three/drei') as typeof import('@react-three/drei');

  // height slightly above the floor so it's visible
  const Y = 0.05;

  const points: [number, number, number][] = [
    [segment.from.x, Y, segment.from.z],
    [segment.to.x, Y, segment.to.z],
  ];

  // We store a mutable offset reference and update it each frame.
  // dashOffset is passed as a prop to Line — to animate it we use a ref-tracked value
  // and force the material update via a ref to the Line's internal material.
  const offsetRef = useRef(0);
  // drei Line does not expose a typed material ref in its public API
  const lineRef = useRef<any>(null); // eslint-disable-line

  useFrame((_, delta) => {
    offsetRef.current -= delta * 0.6; // move "forward" each frame
    if (lineRef.current?.material) {
      lineRef.current.material.dashOffset = offsetRef.current;
      lineRef.current.material.needsUpdate = true;
    }
  });

  return (
    <Line
      ref={lineRef}
      points={points}
      color="#60a5fa"
      lineWidth={2}
      dashed
      dashSize={0.4}
      gapSize={0.25}
      dashOffset={0}
    />
  );
}
