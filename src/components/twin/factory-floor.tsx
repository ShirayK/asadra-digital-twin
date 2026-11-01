'use client';

import { useMemo } from 'react';
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
 * Zone hygiene class → border color for floor outline.
 * Uses same status colors but at reduced emissive for a light scene.
 */
const ZONE_BORDER: Record<string, string> = {
  RAW: '#ef4444',
  LOW_RISK: '#f59e0b',
  HIGH_CARE: '#16a34a',
  PACKAGING: '#5b21b6', // deep indigo-purple
  STORAGE: '#8765c6',
  NON_FOOD: '#9ca3af',
};

/**
 * Light modern food-factory floor:
 * - Light grey/white epoxy floor (#f0eff8) with subtle purple-tinted reflection
 * - Tinted floor areas per zone with purple-family borders
 * - Low perimeter walls (1 m) in light off-white / stainless steel tone
 * - No ceiling beams (open bright factory feel)
 */
export default function FactoryFloor({ widthM, depthM, zones = [] }: FactoryFloorProps) {
  const cx = widthM / 2;
  const cz = depthM / 2;

  /** Light tinted zone fill planes */
  const zoneFills = useMemo(() => {
    return zones.map((z) => {
      const color = ZONE_BORDER[z.hygieneClass] ?? '#9ca3af';
      return { key: z.id, x: z.x, z: z.z, w: z.width, d: z.depth, color };
    });
  }, [zones]);

  /** Four-sided border strips at zone perimeter (y = 0.005) */
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
      const color = ZONE_BORDER[z.hygieneClass] ?? '#9ca3af';

      lines.push(
        {
          key: `${z.id}-n`,
          pos: [midX, 0.005, z0],
          rot: [-Math.PI / 2, 0, 0],
          len: w,
          color,
        },
        {
          key: `${z.id}-s`,
          pos: [midX, 0.005, z1],
          rot: [-Math.PI / 2, 0, 0],
          len: w,
          color,
        },
        {
          key: `${z.id}-e`,
          pos: [x1, 0.005, midZ],
          rot: [-Math.PI / 2, 0, Math.PI / 2],
          len: d,
          color,
        },
        {
          key: `${z.id}-w`,
          pos: [x0, 0.005, midZ],
          rot: [-Math.PI / 2, 0, Math.PI / 2],
          len: d,
          color,
        },
      );
    });
    return lines;
  }, [zones]);

  return (
    <group>
      {/* ── Light epoxy floor — white/grey with a very subtle purple shimmer ── */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial
          color="#f0eff8"
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>

      {/* ── Light tinted zone fills — very translucent, brand-family hues ───── */}
      {zoneFills.map(({ key, x, z, w, d, color }) => (
        <mesh key={`fill-${key}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.002, z]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.07}
            depthWrite={false}
            roughness={0.8}
          />
        </mesh>
      ))}

      {/* ── Purple-family zone border strips ─────────────────────────────────── */}
      {zoneOutlines.map(({ key, pos, rot, len, color }) => (
        <mesh key={key} position={pos} rotation={rot as [number, number, number]}>
          <planeGeometry args={[len, 0.14]} />
          <meshStandardMaterial
            color={color}
            roughness={0.4}
            metalness={0.0}
            transparent
            opacity={0.75}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* ── Perimeter walls — light stainless steel / off-white ──────────────── */}
      {/* North wall (z = 0) */}
      <mesh castShadow receiveShadow position={[cx, WALL_H / 2, -WALL_T / 2]}>
        <boxGeometry args={[widthM + WALL_T * 2, WALL_H, WALL_T]} />
        <meshStandardMaterial color="#e8e6f0" roughness={0.5} metalness={0.25} />
      </mesh>
      {/* South wall */}
      <mesh castShadow receiveShadow position={[cx, WALL_H / 2, depthM + WALL_T / 2]}>
        <boxGeometry args={[widthM + WALL_T * 2, WALL_H, WALL_T]} />
        <meshStandardMaterial color="#e8e6f0" roughness={0.5} metalness={0.25} />
      </mesh>
      {/* West wall */}
      <mesh castShadow receiveShadow position={[-WALL_T / 2, WALL_H / 2, cz]}>
        <boxGeometry args={[WALL_T, WALL_H, depthM]} />
        <meshStandardMaterial color="#ece9f4" roughness={0.5} metalness={0.25} />
      </mesh>
      {/* East wall */}
      <mesh castShadow receiveShadow position={[widthM + WALL_T / 2, WALL_H / 2, cz]}>
        <boxGeometry args={[WALL_T, WALL_H, depthM]} />
        <meshStandardMaterial color="#ece9f4" roughness={0.5} metalness={0.25} />
      </mesh>
    </group>
  );
}
