'use client';

import { useMemo } from 'react';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { Zone } from '@/domain/schema';

interface FactoryFloorProps {
  widthM: number;
  depthM: number;
  zones?: Zone[];
}

/** Wall height in metres */
const WALL_H = 3.2;
/** Perimeter wall thickness */
const WALL_T = 0.22;
/** Glass partition height */
const GLASS_H = 2.8;
/** Glass partition thickness */
const GLASS_T = 0.05;

/** Zone hygiene class → subtle floor tint (very low opacity, layered on concrete) */
const ZONE_FLOOR_TINT: Record<string, string> = {
  RAW: '#ef4444',
  LOW_RISK: '#f59e0b',
  HIGH_CARE: '#22c55e',
  PACKAGING: '#3b82f6',
  STORAGE: '#8b5cf6',
  NON_FOOD: '#6b7280',
};

/** Safety-yellow stripe colour */
const SAFETY_YELLOW = '#fbbf24';

/**
 * Enhanced factory floor:
 * - Concrete / epoxy floor (light grey, receives shadows)
 * - Subtle grid overlay (1 m cells + 5 m sections)
 * - Zone floor tints (semi-transparent, hygiene-class colour)
 * - Low perimeter walls (concrete colour, cast shadows)
 * - Glass partitions at boundaries of HIGH_CARE zone
 * - Yellow safety floor lines around zone boundaries
 * - Zone name signs (world-space plane with HTML replaced by geometry text)
 */
export default function FactoryFloor({ widthM, depthM, zones = [] }: FactoryFloorProps) {
  const cx = widthM / 2;
  const cz = depthM / 2;

  // Safety lines: stripes along zone perimeter edges, y = 0.003
  const safetyLines = useMemo(() => {
    const lines: {
      key: string;
      pos: [number, number, number];
      rot: [number, number, number];
      len: number;
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
      const off = 0.3; // inset from zone edge

      // four edges as floor stripe segments
      lines.push(
        { key: `${z.id}-n`, pos: [midX, 0.003, z0 + off], rot: [-Math.PI / 2, 0, 0], len: w },
        { key: `${z.id}-s`, pos: [midX, 0.003, z1 - off], rot: [-Math.PI / 2, 0, 0], len: w },
        { key: `${z.id}-e`, pos: [x1 - off, 0.003, midZ], rot: [-Math.PI / 2, 0, Math.PI / 2], len: d },
        { key: `${z.id}-w`, pos: [x0 + off, 0.003, midZ], rot: [-Math.PI / 2, 0, Math.PI / 2], len: d },
      );
    });
    return lines;
  }, [zones]);

  // Glass partitions: place between HIGH_CARE zone and its neighbours
  const glassPartitions = useMemo(() => {
    const parts: {
      key: string;
      pos: [number, number, number];
      rot: [number, number, number];
      len: number;
    }[] = [];

    const highCare = zones.find((z) => z.hygieneClass === 'HIGH_CARE');
    if (!highCare) return parts;

    const x0 = highCare.x - highCare.width / 2;
    const x1 = highCare.x + highCare.width / 2;
    const z0 = highCare.z - highCare.depth / 2;
    const z1 = highCare.z + highCare.depth / 2;
    const midX = (x0 + x1) / 2;
    const midZ = (z0 + z1) / 2;

    // North partition (lower z edge)
    parts.push({
      key: 'hc-north',
      pos: [midX, GLASS_H / 2, z0],
      rot: [0, 0, 0],
      len: highCare.width,
    });
    // South partition
    parts.push({
      key: 'hc-south',
      pos: [midX, GLASS_H / 2, z1],
      rot: [0, 0, 0],
      len: highCare.width,
    });
    // West partition
    parts.push({
      key: 'hc-west',
      pos: [x0, GLASS_H / 2, midZ],
      rot: [0, Math.PI / 2, 0],
      len: highCare.depth,
    });

    return parts;
  }, [zones]);

  return (
    <group>
      {/* ── Concrete / epoxy floor ──────────────────────────────────────── */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial color="#c8ccc9" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* ── Grid overlay ────────────────────────────────────────────────── */}
      <Grid
        position={[cx, 0.002, cz]}
        args={[widthM, depthM]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#a8acaa"
        sectionSize={5}
        sectionThickness={0.9}
        sectionColor="#888c89"
        fadeDistance={70}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* ── Zone floor tints ────────────────────────────────────────────── */}
      {zones.map((z) => {
        const tint = ZONE_FLOOR_TINT[z.hygieneClass] ?? '#6b7280';
        return (
          <mesh key={z.id} rotation={[-Math.PI / 2, 0, 0]} position={[z.x, 0.001, z.z]}>
            <planeGeometry args={[z.width, z.depth]} />
            <meshStandardMaterial color={tint} transparent opacity={0.12} depthWrite={false} />
          </mesh>
        );
      })}

      {/* ── Yellow safety floor lines ────────────────────────────────────── */}
      {safetyLines.map(({ key, pos, rot, len }) => (
        <mesh key={key} position={pos} rotation={rot as [number, number, number]}>
          <planeGeometry args={[len, 0.12]} />
          <meshStandardMaterial
            color={SAFETY_YELLOW}
            roughness={0.7}
            metalness={0.0}
            transparent
            opacity={0.75}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* ── Perimeter walls ──────────────────────────────────────────────── */}
      {/* North wall (z = 0) */}
      <mesh castShadow receiveShadow position={[cx, WALL_H / 2, -WALL_T / 2]}>
        <boxGeometry args={[widthM + WALL_T * 2, WALL_H, WALL_T]} />
        <meshStandardMaterial color="#b5b9b6" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* South wall */}
      <mesh castShadow receiveShadow position={[cx, WALL_H / 2, depthM + WALL_T / 2]}>
        <boxGeometry args={[widthM + WALL_T * 2, WALL_H, WALL_T]} />
        <meshStandardMaterial color="#b5b9b6" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* West wall */}
      <mesh castShadow receiveShadow position={[-WALL_T / 2, WALL_H / 2, cz]}>
        <boxGeometry args={[WALL_T, WALL_H, depthM]} />
        <meshStandardMaterial color="#b0b4b1" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* East wall */}
      <mesh castShadow receiveShadow position={[widthM + WALL_T / 2, WALL_H / 2, cz]}>
        <boxGeometry args={[WALL_T, WALL_H, depthM]} />
        <meshStandardMaterial color="#b0b4b1" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* ── Ceiling beams / truss suggestion (two cross-beams) ───────────── */}
      {[0.25, 0.75].map((frac) => (
        <mesh key={frac} castShadow position={[cx, WALL_H + 0.1, frac * depthM]}>
          <boxGeometry args={[widthM, 0.25, 0.2]} />
          <meshStandardMaterial color="#a0a4a1" roughness={0.8} metalness={0.15} />
        </mesh>
      ))}

      {/* ── Transparent glass partitions (HIGH_CARE boundary) ───────────── */}
      {glassPartitions.map(({ key, pos, rot, len }) => (
        <mesh key={key} position={pos} rotation={rot as [number, number, number]}>
          <boxGeometry args={[len, GLASS_H, GLASS_T]} />
          <meshStandardMaterial
            color="#a8d8f0"
            transparent
            opacity={0.18}
            roughness={0.05}
            metalness={0.1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* ── Zone name signs (world-space wall-mounted plates) ──────────── */}
      {zones.map((z) => {
        const x0 = z.x - z.width / 2;
        const x1 = z.x + z.width / 2;
        const signZ = z.z - z.depth / 2; // north edge of zone
        const signX = (x0 + x1) / 2;
        const tint = ZONE_FLOOR_TINT[z.hygieneClass] ?? '#6b7280';

        return (
          <group key={`sign-${z.id}`}>
            {/* Sign backing plate */}
            <mesh position={[signX, 2.2, signZ + 0.06]}>
              <boxGeometry args={[1.2, 0.3, 0.04]} />
              <meshStandardMaterial color={tint} roughness={0.5} metalness={0.3} />
            </mesh>
            {/* White text strip (represents text) */}
            <mesh position={[signX, 2.2, signZ + 0.085]}>
              <boxGeometry args={[1.0, 0.16, 0.01]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} metalness={0.0} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
