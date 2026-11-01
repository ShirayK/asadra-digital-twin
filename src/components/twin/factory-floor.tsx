'use client';

import { useMemo } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { Zone } from '@/domain/schema';

interface FactoryFloorProps {
  widthM: number;
  depthM: number;
  zones?: Zone[];
}

/** Wall height in metres — lowered so interior is visible from overhead angle */
const WALL_H = 1.0;
/** Perimeter wall thickness */
const WALL_T = 0.22;

/**
 * Zone hygiene class → emissive glow colour for floor outline.
 * PACKAGING uses deep indigo-purple #5b21b6 (matches zone-mesh.tsx).
 */
const ZONE_EMISSIVE: Record<string, string> = {
  RAW: '#ef4444',
  LOW_RISK: '#f59e0b',
  HIGH_CARE: '#22c55e',
  PACKAGING: '#5b21b6', // deep indigo-purple, distinct from STORAGE
  STORAGE: '#8b5cf6',
  NON_FOOD: '#6b7280',
};

/**
 * Cinematic dark industrial factory floor:
 * - Dark epoxy floor (#1b2230) with MeshReflectorMaterial subtle reflection
 * - Glowing emissive floor outlines for zones (no pale fills)
 * - Low perimeter walls (1 m) so interior is visible
 * - Ceiling beams retained for depth
 */
export default function FactoryFloor({ widthM, depthM, zones = [] }: FactoryFloorProps) {
  const cx = widthM / 2;
  const cz = depthM / 2;

  /** Four-sided emissive outline strips at zone perimeter (y = 0.004) */
  const zoneOutlines = useMemo(() => {
    const lines: {
      key: string;
      pos: [number, number, number];
      rot: [number, number, number];
      len: number;
      color: string;
    }[] = [];

    zones.forEach((z) => {
      const x0 = z.x - z.width / 2;
      const x1 = z.x + z.width / 2;
      const z0 = z.z - z.depth / 2;
      const z1 = z.z + z.depth / 2;
      const midX = (x0 + x1) / 2;
      const midZ = (z0 + z1) / 2;
      const w = z.width;
      const d = z.depth;
      const color = ZONE_EMISSIVE[z.hygieneClass] ?? '#6b7280';
      const STRIPE = 0.18; // width of the glowing strip

      lines.push(
        {
          key: `${z.id}-n`,
          pos: [midX, 0.004, z0],
          rot: [-Math.PI / 2, 0, 0],
          len: w,
          color,
        },
        {
          key: `${z.id}-s`,
          pos: [midX, 0.004, z1],
          rot: [-Math.PI / 2, 0, 0],
          len: w,
          color,
        },
        {
          key: `${z.id}-e`,
          pos: [x1, 0.004, midZ],
          rot: [-Math.PI / 2, 0, Math.PI / 2],
          len: d,
          color,
        },
        {
          key: `${z.id}-w`,
          pos: [x0, 0.004, midZ],
          rot: [-Math.PI / 2, 0, Math.PI / 2],
          len: d,
          color,
        },
      );
      void STRIPE; // used implicitly in geometry below
    });
    return lines;
  }, [zones]);

  return (
    <group>
      {/* ── Dark epoxy floor with subtle purple-tinted reflection ────────────── */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]}>
        <planeGeometry args={[widthM, depthM]} />
        {/* MeshReflectorMaterial gives subtle mirror reflections on the dark floor.
            Slight purple tint (#1a1530) to unify with brand lighting. */}
        <MeshReflectorMaterial
          color="#1a1530"
          roughness={0.55}
          metalness={0.05}
          mixBlur={10}
          mixStrength={0.45}
          resolution={512}
          blur={[500, 120]}
          mirror={0.22}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          depthScale={0}
        />
      </mesh>

      {/* ── Glowing emissive zone outlines (replaces pale fills) ─────────────── */}
      {zoneOutlines.map(({ key, pos, rot, len, color }) => (
        <mesh key={key} position={pos} rotation={rot as [number, number, number]}>
          <planeGeometry args={[len, 0.18]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.6}
            roughness={0.1}
            metalness={0.0}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* ── Perimeter walls — 1 m high so interior is visible ───────────────── */}
      {/* North wall (z = 0) */}
      <mesh castShadow receiveShadow position={[cx, WALL_H / 2, -WALL_T / 2]}>
        <boxGeometry args={[widthM + WALL_T * 2, WALL_H, WALL_T]} />
        <meshStandardMaterial color="#141a26" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* South wall */}
      <mesh castShadow receiveShadow position={[cx, WALL_H / 2, depthM + WALL_T / 2]}>
        <boxGeometry args={[widthM + WALL_T * 2, WALL_H, WALL_T]} />
        <meshStandardMaterial color="#141a26" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* West wall */}
      <mesh castShadow receiveShadow position={[-WALL_T / 2, WALL_H / 2, cz]}>
        <boxGeometry args={[WALL_T, WALL_H, depthM]} />
        <meshStandardMaterial color="#121820" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* East wall */}
      <mesh castShadow receiveShadow position={[widthM + WALL_T / 2, WALL_H / 2, cz]}>
        <boxGeometry args={[WALL_T, WALL_H, depthM]} />
        <meshStandardMaterial color="#121820" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* ── Ceiling beams / truss (dark steel) ───────────────────────────────── */}
      {[0.25, 0.75].map((frac) => (
        <mesh key={frac} castShadow position={[cx, WALL_H + 0.1, frac * depthM]}>
          <boxGeometry args={[widthM, 0.2, 0.18]} />
          <meshStandardMaterial color="#0d1117" roughness={0.8} metalness={0.4} />
        </mesh>
      ))}

      {/* ── Zone name signs (dark wall-mounted plates with emissive tint) ──── */}
      {zones.map((z) => {
        const x0 = z.x - z.width / 2;
        const x1 = z.x + z.width / 2;
        const signZ = z.z - z.depth / 2;
        const signX = (x0 + x1) / 2;
        const color = ZONE_EMISSIVE[z.hygieneClass] ?? '#6b7280';

        return (
          <group key={`sign-${z.id}`}>
            {/* Sign backing plate */}
            <mesh position={[signX, WALL_H * 0.7, signZ + 0.06]}>
              <boxGeometry args={[1.2, 0.28, 0.04]} />
              <meshStandardMaterial
                color="#0d1117"
                emissive={color}
                emissiveIntensity={0.3}
                roughness={0.5}
                metalness={0.5}
              />
            </mesh>
            {/* Glowing strip */}
            <mesh position={[signX, WALL_H * 0.7, signZ + 0.085]}>
              <boxGeometry args={[1.0, 0.1, 0.01]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.2}
                roughness={0.1}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
