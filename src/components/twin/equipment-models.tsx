'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';

// ─── Brand / material constants ───────────────────────────────────────────────

const STEEL_COLOR = '#b8c4cc';
const STEEL_PAINTED = '#d4dde5';  // lighter painted panel colour
const BRAND_PURPLE = '#41228e';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** A round face-on gauge (pressure / temperature) with needle. */
function Gauge({
  position,
  s = 1,
  rotY = 0,
}: {
  position: [number, number, number];
  s?: number;
  rotY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* bezel */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09 * s, 0.09 * s, 0.04 * s, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* face */}
      <mesh position={[0, 0, 0.022 * s]}>
        <circleGeometry args={[0.075 * s, 16]} />
        <meshStandardMaterial color="#ede9fe" emissive="#a78bfa" emissiveIntensity={0.5} roughness={0.1} />
      </mesh>
      {/* needle */}
      <mesh position={[0.015 * s, 0.02 * s, 0.026 * s]} rotation={[0, 0, -0.7]}>
        <boxGeometry args={[0.007 * s, 0.055 * s, 0.003 * s]} />
        <meshBasicMaterial color="#dc2626" />
      </mesh>
    </group>
  );
}

/** Small brand plate (purple rectangle). */
function BrandPlate({
  position,
  s = 1,
}: {
  position: [number, number, number];
  s?: number;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.22 * s, 0.07 * s, 0.01 * s]} />
      <meshStandardMaterial color={BRAND_PURPLE} roughness={0.5} metalness={0.3} emissive={BRAND_PURPLE} emissiveIntensity={0.25} />
    </mesh>
  );
}

/** Side ladder: two rails + rungs. */
function Ladder({ height, x, s = 1 }: { height: number; x: number; s?: number }) {
  const rungs = Math.max(3, Math.round(height / (0.14 * s)));
  return (
    <group position={[x, 0, 0]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, height / 2, side * 0.08 * s]}>
          <boxGeometry args={[0.022 * s, height, 0.022 * s]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {Array.from({ length: rungs }).map((_, i) => (
        <mesh key={i} position={[0, (i + 0.5) * (height / rungs), 0]}>
          <boxGeometry args={[0.016 * s, 0.016 * s, 0.16 * s]} />
          <meshStandardMaterial color="#eab308" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Low-poly worker in hygiene whites: torso, head, hairnet cap (sitting on head),
 * arms, legs.  Gently bobs and sways to suggest activity.
 */
export function WorkerFigure({
  position,
  color = '#f0f4f8',
  phase = 0,
}: {
  position: [number, number, number];
  color?: string;
  phase?: number;
}) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      // subtle bob
      ref.current.position.y = position[1] + Math.abs(Math.sin(clock.elapsedTime * 1.4 + phase)) * 0.025;
      // gentle look-around sway
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.45 + phase) * 0.45;
    }
  });

  // All geometry is authored at scale≈1, then the group scales to match
  // the world-unit scale of 3.05 that previous code used.
  return (
    <group ref={ref} position={position} scale={3.05}>
      {/* ── Legs ──────────────────────────────────────────────────── */}
      {/* Left leg */}
      <mesh castShadow position={[-0.055, 0.16, 0]}>
        <boxGeometry args={[0.08, 0.32, 0.08]} />
        <meshStandardMaterial color="#dbeafe" roughness={0.8} />
      </mesh>
      {/* Right leg */}
      <mesh castShadow position={[0.055, 0.16, 0]}>
        <boxGeometry args={[0.08, 0.32, 0.08]} />
        <meshStandardMaterial color="#dbeafe" roughness={0.8} />
      </mesh>
      {/* Shoes */}
      {([-0.055, 0.055] as number[]).map((lx, i) => (
        <mesh key={i} castShadow position={[lx, 0.025, 0.02]}>
          <boxGeometry args={[0.09, 0.045, 0.14]} />
          <meshStandardMaterial color="#374151" roughness={0.9} />
        </mesh>
      ))}

      {/* ── Torso ─────────────────────────────────────────────────── */}
      <mesh castShadow position={[0, 0.52, 0]}>
        <boxGeometry args={[0.22, 0.38, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* White coat collar/lapel strip */}
      <mesh position={[0, 0.63, 0.071]}>
        <boxGeometry args={[0.06, 0.12, 0.005]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
      </mesh>

      {/* ── Arms ──────────────────────────────────────────────────── */}
      {/* Left arm (slightly forward) */}
      <mesh castShadow position={[-0.155, 0.52, 0.02]} rotation={[0.18, 0, 0.25]}>
        <boxGeometry args={[0.075, 0.32, 0.075]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Right arm */}
      <mesh castShadow position={[0.155, 0.52, 0.02]} rotation={[0.18, 0, -0.25]}>
        <boxGeometry args={[0.075, 0.32, 0.075]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Gloved hands */}
      {([-0.165, 0.165] as number[]).map((hx, i) => (
        <mesh key={i} castShadow position={[hx, 0.32, 0.04]}>
          <sphereGeometry args={[0.045, 7, 5]} />
          <meshStandardMaterial color="#bbf7d0" roughness={0.8} />
        </mesh>
      ))}

      {/* ── Neck ──────────────────────────────────────────────────── */}
      <mesh position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.04, 0.045, 0.07, 7]} />
        <meshStandardMaterial color="#f1c27d" roughness={0.8} />
      </mesh>

      {/* ── Head ──────────────────────────────────────────────────── */}
      <mesh castShadow position={[0, 0.84, 0]}>
        <boxGeometry args={[0.16, 0.18, 0.15]} />
        <meshStandardMaterial color="#f1c27d" roughness={0.8} />
      </mesh>
      {/* Simple face: two eyes */}
      {([-0.04, 0.04] as number[]).map((ex, i) => (
        <mesh key={i} position={[ex, 0.85, 0.076]}>
          <sphereGeometry args={[0.018, 6, 5]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
      ))}

      {/* ── Hairnet cap: dome sits ON the head, not floating above ── */}
      {/* Back of head coverage */}
      <mesh position={[0, 0.88, -0.01]}>
        <sphereGeometry args={[0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.9} transparent opacity={0.92} />
      </mesh>
      {/* Cap brim band */}
      <mesh position={[0, 0.82, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.09, 0.015, 5, 18]} />
        <meshStandardMaterial color="#7c3aed" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ─── 1. RECEIVING DOCK ─────────────────────────────────────────────────────────
/**
 * Loading dock: raised platform, stacked sacks on pallets, pallet jack,
 * platform scale with digital display, temp probe post.
 */
export function ReceivingDockModel({ scale: s = 1 }: { scale?: number }) {
  return (
    <group>
      {/* Dock platform */}
      <mesh castShadow receiveShadow position={[0, 0.08 * s, 0]}>
        <boxGeometry args={[1.8 * s, 0.16 * s, 1.3 * s]} />
        <meshStandardMaterial color="#475569" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Dock bumper strip */}
      <mesh position={[0, 0.13 * s, -0.66 * s]}>
        <boxGeometry args={[1.8 * s, 0.1 * s, 0.06 * s]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Pallet #1 with stacked sacks */}
      <SackPallet position={[-0.5 * s, 0.16 * s, 0.1 * s]} s={s} />
      {/* Pallet #2 */}
      <SackPallet position={[0.55 * s, 0.16 * s, 0.05 * s]} s={s} color="#d4a76a" />

      {/* Pallet jack */}
      <PalletJack position={[0.05 * s, 0.16 * s, 0.52 * s]} s={s} />

      {/* Platform scale */}
      <PlatformScale position={[-0.6 * s, 0.16 * s, 0.58 * s]} s={s} />

      {/* Temp probe post */}
      <mesh castShadow position={[0.78 * s, 0.7 * s, 0.18 * s]}>
        <cylinderGeometry args={[0.025 * s, 0.025 * s, 1.1 * s, 6]} />
        <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0.78 * s, 0.6 * s, 0.35 * s]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05 * s, 0.05 * s, 0.13 * s, 8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.4} />
      </mesh>

      <BrandPlate position={[0, 0.22 * s, 0.66 * s]} s={s} />
    </group>
  );
}

function SackPallet({
  position,
  s = 1,
  color = '#c8a85e',
}: {
  position: [number, number, number];
  s?: number;
  color?: string;
}) {
  return (
    <group position={position}>
      {/* wooden pallet deck */}
      <mesh castShadow>
        <boxGeometry args={[0.6 * s, 0.08 * s, 0.5 * s]} />
        <meshStandardMaterial color="#7c5a2e" roughness={0.9} />
      </mesh>
      {/* Boards on deck */}
      {[-0.2, 0, 0.2].map((bx) => (
        <mesh key={bx} position={[bx * s, 0.045 * s, 0]}>
          <boxGeometry args={[0.04 * s, 0.02 * s, 0.5 * s]} />
          <meshStandardMaterial color="#6b4a1e" roughness={0.95} />
        </mesh>
      ))}
      {/* Sacks stack */}
      {[0, 1, 2].map((row) => (
        <mesh key={row} castShadow position={[0, (0.08 + 0.14 + row * 0.18) * s, 0]}>
          <boxGeometry args={[(0.56 - row * 0.03) * s, 0.16 * s, (0.46 - row * 0.02) * s]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}
      {/* stretch wrap */}
      <mesh position={[0, (0.08 + 0.14 + 0.18) * s, 0]}>
        <boxGeometry args={[0.58 * s, 0.01 * s, 0.48 * s]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

function PalletJack({
  position,
  s = 1,
}: {
  position: [number, number, number];
  s?: number;
}) {
  return (
    <group position={position}>
      {/* Frame body */}
      <mesh castShadow>
        <boxGeometry args={[0.12 * s, 0.08 * s, 0.55 * s]} />
        <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Two fork tines */}
      {[-0.05, 0.05].map((ox) => (
        <mesh key={ox} position={[ox * s, -0.03 * s, 0.05 * s]}>
          <boxGeometry args={[0.03 * s, 0.04 * s, 0.65 * s]} />
          <meshStandardMaterial color="#9f1239" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Handle */}
      <mesh position={[0, 0.28 * s, -0.22 * s]} rotation={[-0.4, 0, 0]}>
        <cylinderGeometry args={[0.018 * s, 0.018 * s, 0.55 * s, 6]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Wheels */}
      {[-0.05, 0.05].map((ox) =>
        [-0.25, 0.27].map((oz) => (
          <mesh key={`${ox}${oz}`} position={[ox * s, -0.05 * s, oz * s]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05 * s, 0.05 * s, 0.03 * s, 10]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
        )),
      )}
    </group>
  );
}

function PlatformScale({
  position,
  s = 1,
}: {
  position: [number, number, number];
  s?: number;
}) {
  return (
    <group position={position}>
      {/* Scale platform */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.38 * s, 0.05 * s, 0.32 * s]} />
        <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Display column */}
      <mesh castShadow position={[0.15 * s, 0.32 * s, 0]}>
        <boxGeometry args={[0.04 * s, 0.55 * s, 0.04 * s]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Display head */}
      <mesh position={[0.15 * s, 0.62 * s, 0.06 * s]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.14 * s, 0.08 * s, 0.04 * s]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Display screen */}
      <mesh position={[0.15 * s, 0.62 * s, 0.09 * s]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.1 * s, 0.04 * s, 0.005 * s]} />
        <meshStandardMaterial color="#c4b5fd" emissive="#7c3aed" emissiveIntensity={1.0} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ─── 2. SOAKING TANK ───────────────────────────────────────────────────────────
/**
 * Large open-top stainless tank on heavy legs, water level sight glass on side,
 * fill/drain pipes, overflow weir, thermometer.
 */
export function SoakingTankModel({ scale: s = 1 }: { scale?: number }) {
  const r = 0.48 * s;
  const h = 1.0 * s;
  const legH = 0.3 * s;

  return (
    <group position={[0, legH, 0]}>
      {/* Main cylindrical body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 24]} />
        <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Open top rim */}
      <mesh position={[0, h / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r + 0.015 * s, 0.025 * s, 6, 24]} />
        <meshStandardMaterial color="#8a9bb0" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Water surface (teal/blue, slightly transparent) */}
      <mesh position={[0, h * 0.32, 0]}>
        <cylinderGeometry args={[r * 0.97, r * 0.97, 0.01 * s, 24]} />
        <meshStandardMaterial color="#e9e5f5" transparent opacity={0.72} roughness={0.05} metalness={0} emissive="#a78bfa" emissiveIntensity={0.15} />
      </mesh>
      {/* Weld seam rings */}
      {[-h * 0.2, h * 0.2].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 1.004, 0.007 * s, 4, 24]} />
          <meshStandardMaterial color="#9aaab5" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}
      {/* Sight glass on side */}
      <mesh position={[r + 0.015 * s, 0, 0]}>
        <boxGeometry args={[0.025 * s, h * 0.7, 0.08 * s]} />
        <meshStandardMaterial color="#f1eefb" transparent opacity={0.8} roughness={0.05} metalness={0.1} emissive="#c4b5fd" emissiveIntensity={0.2} />
      </mesh>
      {/* Fill pipe (inlet top) */}
      <mesh position={[0, h / 2 + 0.18 * s, r * 0.5]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.04 * s, 0.04 * s, 0.38 * s, 8]} />
        <meshStandardMaterial color="#8a9bb0" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Drain pipe (bottom outlet) */}
      <mesh position={[0, -h / 2 - 0.05 * s, r * 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04 * s, 0.04 * s, 0.2 * s, 8]} />
        <meshStandardMaterial color="#8a9bb0" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Butterfly valve on drain */}
      <mesh position={[0, -h / 2 - 0.05 * s, r * 0.3 + 0.1 * s]}>
        <cylinderGeometry args={[0.06 * s, 0.06 * s, 0.04 * s, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Legs */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([lx, lz], i) => (
        <mesh key={i} castShadow position={[lx * r * 0.72, -h / 2 - legH / 2, lz * r * 0.72]}>
          <cylinderGeometry args={[0.04 * s, 0.04 * s, legH, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* Side thermometer */}
      <mesh position={[-r - 0.02 * s, h * 0.1, 0]}>
        <cylinderGeometry args={[0.025 * s, 0.025 * s, 0.22 * s, 8]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.3} />
      </mesh>
      <Gauge position={[-r - 0.02 * s, h * 0.25, 0]} s={s} rotY={-Math.PI / 2} />
      <Ladder height={h + legH + 0.05} x={-r - 0.06 * s} s={s} />
      <BrandPlate position={[0, h * 0.1, r + 0.02 * s]} s={s} />
    </group>
  );
}

// ─── 3. COOKING KETTLE (CCP) ────────────────────────────────────────────────
/**
 * Jacketed steam kettle: hemispherical bottom, tilt trunnions, lid with vent,
 * pressure gauge, steam pipe, animated steam particles.
 */
export function CookingKettleModel({ scale: s = 1 }: { scale?: number }) {
  const r = 0.52 * s;
  const hCyl = 0.85 * s;
  const legH = 0.4 * s;

  // Steam particle refs
  const steamRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!steamRef.current) return;
    const t = clock.elapsedTime;
    steamRef.current.children.forEach((c, i) => {
      const phase = (t * 0.9 + i * 0.28) % 1;
      c.position.y = legH + hCyl + r * 0.5 + phase * 1.2 * s;
      c.position.x = Math.sin(t * 1.5 + i * 1.2) * 0.08 * s;
      const op = Math.max(0, 1 - phase * 1.6);
      (c as Mesh).scale.setScalar(0.5 + phase * 1.5);
      ((c as Mesh).material as THREE.MeshStandardMaterial).opacity = op * 0.55;
    });
  });

  // Tilt wheel animation
  const wheelRef = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (wheelRef.current) wheelRef.current.rotation.z += dt * 0.5;
  });

  return (
    <group>
      {/* Tilt trunnion supports (two pedestals) */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh castShadow position={[side * (r + 0.22 * s), legH * 0.6, 0]}>
            <boxGeometry args={[0.12 * s, legH * 1.2, 0.18 * s]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
          </mesh>
          {/* Trunnion pin */}
          <mesh position={[side * (r + 0.22 * s), legH * 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06 * s, 0.06 * s, 0.14 * s, 10]} />
            <meshStandardMaterial color={STEEL_COLOR} metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Kettle assembly at tilt pivot height */}
      <group position={[0, legH, 0]}>
        {/* Cylindrical upper body */}
        <mesh castShadow receiveShadow position={[0, hCyl / 2, 0]}>
          <cylinderGeometry args={[r, r, hCyl, 24]} />
          <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.22} />
        </mesh>
        {/* Hemispherical bottom */}
        <mesh castShadow position={[0, 0, 0]}>
          <sphereGeometry args={[r, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.22} />
        </mesh>
        {/* Heating jacket band */}
        <mesh position={[0, hCyl * 0.25, 0]}>
          <cylinderGeometry args={[r + 0.045 * s, r + 0.045 * s, hCyl * 0.6, 24]} />
          <meshStandardMaterial color="#9fb0be" roughness={0.4} metalness={0.7} transparent opacity={0.65} />
        </mesh>
        {/* Steam inlet to jacket (bottom) */}
        <mesh position={[r + 0.05 * s, hCyl * 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04 * s, 0.04 * s, 0.14 * s, 8]} />
          <meshStandardMaterial color="#8a9bb0" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Condensate outlet (bottom jacket) */}
        <mesh position={[-r - 0.05 * s, hCyl * 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035 * s, 0.035 * s, 0.12 * s, 8]} />
          <meshStandardMaterial color="#8a9bb0" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Lid */}
        <mesh castShadow position={[0, hCyl, 0]}>
          <cylinderGeometry args={[r * 0.98, r, 0.06 * s, 24]} />
          <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.22} />
        </mesh>
        {/* Lid dome */}
        <mesh position={[0, hCyl + 0.02 * s, 0]}>
          <sphereGeometry args={[r * 0.88, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#c8d0d8" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Vent nozzle on lid */}
        <mesh position={[0.08 * s, hCyl + 0.35 * s, 0]}>
          <cylinderGeometry args={[0.04 * s, 0.04 * s, 0.55 * s, 8]} />
          <meshStandardMaterial color="#8a9bb0" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Two large pressure gauges */}
        <Gauge position={[0, hCyl * 0.55, r + 0.02 * s]} s={s * 1.2} />
        <Gauge position={[r + 0.02 * s, hCyl * 0.55, 0]} s={s} rotY={Math.PI / 2} />

        {/* Tilt hand-wheel on right trunnion */}
        <group position={[r + 0.3 * s, hCyl * 0.5, 0]}>
          <mesh ref={wheelRef} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.16 * s, 0.025 * s, 6, 20]} />
            <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.35} />
          </mesh>
          {/* Spokes */}
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} rotation={[0, 0, (k * Math.PI) / 2]}>
              <boxGeometry args={[0.005 * s, 0.3 * s, 0.012 * s]} />
              <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
        </group>

        <Ladder height={hCyl + 0.3} x={-r - 0.07 * s} s={s} />
        <BrandPlate position={[0, hCyl * 0.6, r + 0.02 * s]} s={s} />
      </group>

      {/* Animated steam puffs */}
      <group ref={steamRef}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[0, legH + hCyl + 0.5 * s, 0]}>
            <sphereGeometry args={[0.22 * s, 8, 6]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.45} roughness={1} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── 4. STONE MILL / TAHINI GRINDER ────────────────────────────────────────────
/**
 * Stone mill: large hopper on top feeding between two grinding stones,
 * motor block on the side, outlet spout below, support frame.
 */
export function StoneMill({ scale: s = 1 }: { scale?: number }) {
  // Slow upper-stone rotation
  const stoneRef = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (stoneRef.current) stoneRef.current.rotation.y += dt * 0.6;
  });

  const stoneR = 0.4 * s;

  return (
    <group>
      {/* Support frame base */}
      <mesh castShadow receiveShadow position={[0, 0.1 * s, 0]}>
        <boxGeometry args={[0.95 * s, 0.2 * s, 0.75 * s]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Frame uprights */}
      {[[-0.4, -0.3], [0.4, -0.3], [0.4, 0.3], [-0.4, 0.3]].map(([fx, fz], i) => (
        <mesh key={i} castShadow position={[fx * s, 0.55 * s, fz * s]}>
          <boxGeometry args={[0.07 * s, 0.9 * s, 0.07 * s]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* Cross-beam */}
      <mesh position={[0, 0.95 * s, 0]}>
        <boxGeometry args={[0.92 * s, 0.07 * s, 0.7 * s]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Lower stone (stationary) */}
      <mesh castShadow position={[0, 0.55 * s, 0]}>
        <cylinderGeometry args={[stoneR, stoneR, 0.18 * s, 32]} />
        <meshStandardMaterial color="#78716c" roughness={0.95} metalness={0.02} />
      </mesh>
      {/* Groove pattern on lower stone */}
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <mesh key={k} position={[0, 0.64 * s, 0]} rotation={[0, (k * Math.PI) / 6, 0]}>
          <boxGeometry args={[stoneR * 1.8, 0.01 * s, 0.02 * s]} />
          <meshStandardMaterial color="#57534e" roughness={1} />
        </mesh>
      ))}

      {/* Upper stone (rotating) */}
      <mesh ref={stoneRef} castShadow position={[0, 0.82 * s, 0]}>
        <cylinderGeometry args={[stoneR * 0.97, stoneR * 0.97, 0.18 * s, 32]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Central spindle hole in upper stone */}
      <mesh position={[0, 0.82 * s, 0]}>
        <cylinderGeometry args={[0.05 * s, 0.05 * s, 0.2 * s, 10]} />
        <meshStandardMaterial color="#292524" roughness={0.8} />
      </mesh>

      {/* Enclosure ring around stones */}
      <mesh position={[0, 0.68 * s, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[stoneR + 0.08 * s, 0.06 * s, 6, 32]} />
        <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Feed hopper (conical) */}
      <mesh castShadow position={[0, 1.38 * s, 0]}>
        <cylinderGeometry args={[0.28 * s, 0.11 * s, 0.55 * s, 16]} />
        <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Hopper lid */}
      <mesh castShadow position={[0, 1.67 * s, 0]}>
        <cylinderGeometry args={[0.3 * s, 0.28 * s, 0.07 * s, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Hopper viewing window */}
      <mesh position={[0.25 * s, 1.45 * s, 0]}>
        <boxGeometry args={[0.03 * s, 0.22 * s, 0.1 * s]} />
        <meshStandardMaterial color="#f1eefb" transparent opacity={0.75} roughness={0.05} emissive="#c4b5fd" emissiveIntensity={0.1} />
      </mesh>

      {/* Motor block */}
      <mesh castShadow position={[0.58 * s, 0.62 * s, 0]}>
        <boxGeometry args={[0.24 * s, 0.28 * s, 0.26 * s]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Motor cooling fins */}
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} position={[0.72 * s, (0.52 + k * 0.07) * s, 0]}>
          <boxGeometry args={[0.02 * s, 0.02 * s, 0.24 * s]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Drive shaft */}
      <mesh position={[0.35 * s, 0.62 * s, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035 * s, 0.035 * s, 0.24 * s, 8]} />
        <meshStandardMaterial color={STEEL_COLOR} metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Outlet spout */}
      <mesh castShadow position={[0.12 * s, 0.3 * s, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.04 * s, 0.06 * s, 0.32 * s, 8]} />
        <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Outlet receiving tray */}
      <mesh position={[0.28 * s, 0.1 * s, 0]}>
        <boxGeometry args={[0.22 * s, 0.04 * s, 0.18 * s]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
      </mesh>

      <BrandPlate position={[0, 0.35 * s, 0.38 * s]} s={s} />
    </group>
  );
}

// ─── 5. BLAST CHILLER (CCP) ─────────────────────────────────────────────────────
/**
 * Insulated blast chiller: twin-door stainless cabinet, recognizable condensing
 * unit on top with spinning fans, cooling fins, pipes, and a -18°C temp display.
 */
export function ChillerModel({ scale: s = 1 }: { scale?: number }) {
  const w = 1.2 * s;
  const h = 1.5 * s;
  const d = 0.85 * s;
  // Condensing unit dimensions
  const cuW = w * 0.9;
  const cuH = 0.42 * s;
  const cuD = d * 0.85;
  const cuBase = h; // sits on top of cabinet

  return (
    <group>
      {/* ── Cabinet body ───────────────────────────────────────────── */}
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#dde4ea" roughness={0.45} metalness={0.35} />
      </mesh>

      {/* Left door panel */}
      <mesh castShadow position={[-w * 0.26, h * 0.48, d / 2 + 0.007 * s]}>
        <boxGeometry args={[w * 0.43, h * 0.78, 0.016 * s]} />
        <meshStandardMaterial color="#c8d8e4" roughness={0.35} metalness={0.55} />
      </mesh>
      {/* Right door panel */}
      <mesh castShadow position={[w * 0.26, h * 0.48, d / 2 + 0.007 * s]}>
        <boxGeometry args={[w * 0.43, h * 0.78, 0.016 * s]} />
        <meshStandardMaterial color="#c8d8e4" roughness={0.35} metalness={0.55} />
      </mesh>
      {/* Door gap line */}
      <mesh position={[0, h * 0.48, d / 2 + 0.009 * s]}>
        <boxGeometry args={[0.012 * s, h * 0.78, 0.005 * s]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Door handles */}
      {([-1, 1] as number[]).map((side) => (
        <mesh key={side} castShadow position={[side * w * 0.08, h / 2, d / 2 + 0.05 * s]}>
          <boxGeometry args={[0.055 * s, h * 0.3, 0.05 * s]} />
          <meshStandardMaterial color="#8a9fae" roughness={0.15} metalness={0.92} />
        </mesh>
      ))}
      {/* Hinges */}
      {([-1, 1] as number[]).map((side) =>
        ([-h * 0.28, h * 0.28] as number[]).map((y, j) => (
          <mesh key={`${side}${j}`} castShadow position={[side * w * 0.44, h / 2 + y, d / 2 + 0.018 * s]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025 * s, 0.025 * s, 0.065 * s, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
          </mesh>
        )),
      )}

      {/* Door seals / gasket lines */}
      <mesh position={[0, h * 0.48, d / 2 + 0.002 * s]}>
        <boxGeometry args={[w * 0.93, h * 0.83, 0.005 * s]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} transparent opacity={0.25} />
      </mesh>

      {/* ── Temperature display on front panel — "-18°C" style ─────── */}
      {/* Display housing */}
      <mesh position={[w * 0.3, h * 0.88, d / 2 + 0.016 * s]}>
        <boxGeometry args={[0.22 * s, 0.075 * s, 0.014 * s]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Screen glow */}
      <mesh position={[w * 0.3, h * 0.88, d / 2 + 0.025 * s]}>
        <boxGeometry args={[0.17 * s, 0.048 * s, 0.005 * s]} />
        <meshStandardMaterial color={BRAND_PURPLE} emissive={BRAND_PURPLE} emissiveIntensity={2.0} roughness={0.05} toneMapped={false} />
      </mesh>

      <BrandPlate position={[-w * 0.32, h * 0.08, d / 2 + 0.02 * s]} s={s} />

      {/* ══ Condensing Unit on Top ════════════════════════════════════ */}
      <group position={[0, cuBase, 0]}>
        {/* Main condensing unit box */}
        <mesh castShadow position={[0, cuH / 2, 0]}>
          <boxGeometry args={[cuW, cuH, cuD]} />
          <meshStandardMaterial color="#b0bec8" roughness={0.4} metalness={0.65} />
        </mesh>

        {/* ── Cooling fins on the back face ─── */}
        {Array.from({ length: 10 }).map((_, k) => (
          <mesh key={k} position={[(-cuW / 2 + (k + 0.5) * (cuW / 10)), cuH * 0.5, -cuD / 2 - 0.008 * s]}>
            <boxGeometry args={[cuW / 10 - 0.006 * s, cuH * 0.85, 0.022 * s]} />
            <meshStandardMaterial color="#8a9bb0" metalness={0.8} roughness={0.25} />
          </mesh>
        ))}

        {/* ── Two top-mounted fan grilles (horizontal, exhausting upward) ── */}
        <ChillerTopFan position={[-cuW * 0.26, cuH + 0.003 * s, 0]} s={s} />
        <ChillerTopFan position={[ cuW * 0.26, cuH + 0.003 * s, 0]} s={s} />

        {/* ── Compressor bump on top-right ─── */}
        <mesh castShadow position={[cuW * 0.36, cuH + 0.065 * s, -cuD * 0.18]}>
          <boxGeometry args={[0.18 * s, 0.13 * s, 0.15 * s]} />
          <meshStandardMaterial color="#7a8a9a" roughness={0.5} metalness={0.6} />
        </mesh>

        {/* ── Refrigerant pipes: two bent runs ─── */}
        {/* Liquid line (thin) */}
        <mesh position={[cuW * 0.45, cuH * 0.65, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02 * s, 0.02 * s, 0.35 * s, 7]} />
          <meshStandardMaterial color="#c0ccd6" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Suction line (fatter, insulated) */}
        <mesh position={[cuW * 0.48, cuH * 0.3, cuD * 0.1]} rotation={[0.5, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.038 * s, 0.038 * s, 0.28 * s, 7]} />
          <meshStandardMaterial color="#64748b" roughness={0.7} metalness={0.2} />
        </mesh>

        {/* ── Small brand / temp label on front of CU ─── */}
        <mesh position={[-cuW * 0.28, cuH * 0.55, cuD / 2 + 0.008 * s]}>
          <boxGeometry args={[0.18 * s, 0.06 * s, 0.008 * s]} />
          <meshStandardMaterial color={BRAND_PURPLE} roughness={0.4} emissive={BRAND_PURPLE} emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Top-mounted fan grille for the condensing unit — fan exhausts upward.
 * Grille faces +Y (flat on top surface of CU box).
 */
function ChillerTopFan({
  position,
  s = 1,
}: {
  position: [number, number, number];
  s?: number;
}) {
  const blades = useRef<Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.y += dt * 9;
  });
  const r = 0.15 * s;
  return (
    <group position={position}>
      {/* Grille surround */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r, 0.018 * s, 5, 22]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Inner ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.55, 0.006 * s, 4, 18]} />
        <meshStandardMaterial color="#64748b" metalness={0.75} />
      </mesh>
      {/* Cross guard bars */}
      {[0, 1].map((k) => (
        <mesh key={k} rotation={[0, (k * Math.PI) / 2, 0]}>
          <boxGeometry args={[r * 2, 0.006 * s, 0.006 * s]} />
          <meshStandardMaterial color="#475569" metalness={0.7} />
        </mesh>
      ))}
      {/* Spinning blades */}
      <group ref={blades}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} rotation={[0, (k * Math.PI) / 2, 0]} position={[0, 0.005 * s, 0]}>
            <boxGeometry args={[r * 1.7, 0.007 * s, 0.048 * s]} />
            <meshStandardMaterial color="#1e293b" metalness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Legacy side-mounted fan (kept for any other callers) */
function ChillerFan({
  position,
  s = 1,
}: {
  position: [number, number, number];
  s?: number;
}) {
  const blades = useRef<Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.x += dt * 8;
  });
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      {/* grill ring */}
      <mesh>
        <torusGeometry args={[0.19 * s, 0.022 * s, 6, 24]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>
      {[0.07, 0.13].map((rr) => (
        <mesh key={rr}>
          <torusGeometry args={[rr * s, 0.005 * s, 4, 20]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
      ))}
      <group ref={blades} rotation={[0, Math.PI / 2, 0]}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} rotation={[(k * Math.PI) / 2, 0, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[0.008 * s, 0.32 * s, 0.05 * s]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── 6. METAL DETECTOR (CCP) ─────────────────────────────────────────────────
/**
 * Real-scale compact metal detector sitting on the packaging conveyor:
 *  - Stainless conveyor belt
 *  - Compact rectangular aperture box (1.2 × 0.9 × 0.5 relative to belt width)
 *  - Blinking green/red beacon on top
 *  - Touch-screen control panel on right post
 *  - Stainless reject flap + open bin beside the belt (not covering it)
 */
export function MetalDetectorModel({ scale: s = 1 }: { scale?: number }) {
  const beltW     = 1.8 * s;
  const beltH     = 0.72 * s;
  const beltDepth = 0.55 * s;
  const frameT    = 0.038 * s;

  // Aperture box — compact, stainless
  const apW  = 0.50 * s;
  const apH  = 0.38 * s;
  const apD  = beltDepth * 0.88;
  const wall = 0.052 * s;

  const beaconRef = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (beaconRef.current) {
      const on = Math.sin(clock.elapsedTime * 2.8) > 0;
      ((beaconRef.current).material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 2.0 : 0.3;
    }
  });

  const steelMat = { color: STEEL_COLOR, metalness: 0.88, roughness: 0.18 } as const;

  return (
    <group>
      {/* ── Conveyor ────────────────────────────────────────────────── */}
      {([-1, 1] as number[]).map((side) => (
        <mesh key={side} castShadow position={[0, beltH - 0.03 * s, side * (beltDepth / 2)]}>
          <boxGeometry args={[beltW, 0.05 * s, frameT]} />
          <meshStandardMaterial {...steelMat} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, beltH, 0]}>
        <boxGeometry args={[beltW, 0.028 * s, beltDepth]} />
        <meshStandardMaterial color="#2d3748" roughness={0.85} metalness={0.1} />
      </mesh>
      {[-0.75, -0.38, 0, 0.38, 0.75].map((rx) => (
        <mesh key={rx} position={[rx * s, beltH - 0.022 * s, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.026 * s, 0.026 * s, beltDepth * 1.02, 9]} />
          <meshStandardMaterial {...steelMat} />
        </mesh>
      ))}
      {([-0.75, 0.75] as number[]).map((rx) =>
        ([-1, 1] as number[]).map((side) => (
          <mesh key={`${rx}${side}`} castShadow position={[rx * s, beltH * 0.45, side * (beltDepth * 0.44)]}>
            <boxGeometry args={[frameT, beltH * 0.9, frameT]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.35} />
          </mesh>
        )),
      )}

      {/* ── Aperture box — centred on belt surface ─────────────────── */}
      <group position={[0, beltH, 0]}>
        {/* Left wall */}
        <mesh castShadow position={[-(apW / 2 + wall / 2), apH / 2 + wall, 0]}>
          <boxGeometry args={[wall, apH + wall * 2, apD]} />
          <meshStandardMaterial {...steelMat} color="#cad4de" />
        </mesh>
        {/* Right wall */}
        <mesh castShadow position={[apW / 2 + wall / 2, apH / 2 + wall, 0]}>
          <boxGeometry args={[wall, apH + wall * 2, apD]} />
          <meshStandardMaterial {...steelMat} color="#cad4de" />
        </mesh>
        {/* Bottom slab */}
        <mesh castShadow position={[0, wall / 2, 0]}>
          <boxGeometry args={[apW + wall * 2, wall, apD]} />
          <meshStandardMaterial {...steelMat} color="#cad4de" />
        </mesh>
        {/* Top slab */}
        <mesh castShadow position={[0, apH + wall * 1.5, 0]}>
          <boxGeometry args={[apW + wall * 2, wall, apD]} />
          <meshStandardMaterial {...steelMat} color="#cad4de" />
        </mesh>
        {/* Inner sensor emitters */}
        {([-1, 1] as number[]).map((side) => (
          <mesh key={side} position={[side * apW / 2, apH / 2 + wall, apD * 0.1]}>
            <boxGeometry args={[0.011 * s, apH * 0.72, 0.038 * s]} />
            <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.55} roughness={0.2} metalness={0.2} />
          </mesh>
        ))}

        {/* Beacon stem */}
        <mesh position={[0, apH + wall * 2 + 0.03 * s, 0]}>
          <cylinderGeometry args={[0.011 * s, 0.011 * s, 0.05 * s, 7]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Blinking beacon */}
        <mesh ref={beaconRef} position={[0, apH + wall * 2 + 0.068 * s, 0]}>
          <sphereGeometry args={[0.033 * s, 8, 6]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2.0} roughness={0.08} transparent opacity={0.92} />
        </mesh>

        {/* Control panel arm */}
        <mesh castShadow position={[apW / 2 + wall + 0.038 * s, apH + wall, apD / 3]}>
          <boxGeometry args={[0.06 * s, 0.038 * s, 0.055 * s]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* Panel housing */}
        <mesh castShadow position={[apW / 2 + wall + 0.095 * s, apH + wall + 0.055 * s, apD / 3]}>
          <boxGeometry args={[0.15 * s, 0.11 * s, 0.075 * s]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Touch screen */}
        <mesh position={[apW / 2 + wall + 0.144 * s, apH + wall + 0.055 * s, apD / 3]}>
          <boxGeometry args={[0.008 * s, 0.075 * s, 0.055 * s]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.85} roughness={0.1} />
        </mesh>
      </group>

      {/* ── Reject flap + bin — beside belt (not on it) ─────────────── */}
      <mesh castShadow
        position={[beltW * 0.35, beltH + 0.022 * s, beltDepth * 0.62]}
        rotation={[0, 0, 0.16]}
      >
        <boxGeometry args={[0.2 * s, 0.016 * s, 0.18 * s]} />
        <meshStandardMaterial {...steelMat} color="#c8d4dd" />
      </mesh>
      <group position={[beltW * 0.35, 0, beltDepth * 0.66 + 0.16 * s]}>
        <mesh castShadow>
          <boxGeometry args={[0.3 * s, 0.055 * s, 0.26 * s]} />
          <meshStandardMaterial {...steelMat} />
        </mesh>
        <mesh castShadow position={[0, 0.088 * s, 0.13 * s]}>
          <boxGeometry args={[0.3 * s, 0.175 * s, 0.011 * s]} />
          <meshStandardMaterial {...steelMat} />
        </mesh>
        <mesh castShadow position={[0, 0.088 * s, -0.13 * s]}>
          <boxGeometry args={[0.3 * s, 0.175 * s, 0.011 * s]} />
          <meshStandardMaterial {...steelMat} />
        </mesh>
        <mesh castShadow position={[-0.15 * s, 0.088 * s, 0]}>
          <boxGeometry args={[0.011 * s, 0.175 * s, 0.26 * s]} />
          <meshStandardMaterial {...steelMat} />
        </mesh>
        <mesh position={[0.155 * s, 0.09 * s, 0]}>
          <boxGeometry args={[0.007 * s, 0.095 * s, 0.2 * s]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
      </group>

      <BrandPlate position={[0, beltH + apH + wall * 2.5 + 0.075 * s, 0]} s={s} />
    </group>
  );
}

// ─── 7. PACKAGING MACHINE ─────────────────────────────────────────────────────
/**
 * Filling line: conveyor with tubs, filling nozzles, sealing head,
 * carton stacker, control panel with display.
 */
export function PackagingMachineModel({ scale: s = 1 }: { scale?: number }) {
  const fw = 1.2 * s;
  const fh = 0.95 * s;
  const fd = 0.7 * s;

  const convRef = useRef<Group>(null);
  const nozzleRef = useRef<Group>(null);
  useFrame((_, dt) => {
    // tubs move along conveyor
    if (convRef.current) {
      convRef.current.children.forEach((c) => {
        c.position.x += dt * 0.22 * s;
        if (c.position.x > fw * 0.5) c.position.x -= fw * 0.9;
      });
    }
    // filling nozzles bob up/down
    if (nozzleRef.current) {
      const t2 = Date.now() * 0.001;
      nozzleRef.current.position.y = fh + 0.1 * s + Math.abs(Math.sin(t2 * 1.8)) * 0.08 * s;
    }
  });

  return (
    <group>
      {/* Main machine frame */}
      <mesh castShadow receiveShadow position={[0, fh / 2, 0]}>
        <boxGeometry args={[fw, fh, fd]} />
        <meshStandardMaterial color={STEEL_PAINTED} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Frame corner posts */}
      {[[-0.55, -0.32], [0.55, -0.32], [0.55, 0.32], [-0.55, 0.32]].map(([px, pz], i) => (
        <mesh key={i} castShadow position={[px * s, fh / 2, pz * s]}>
          <boxGeometry args={[0.06 * s, fh + 0.1, 0.06 * s]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}

      {/* Infeed hopper */}
      <mesh castShadow position={[-fw * 0.32, fh + 0.32 * s, 0]}>
        <cylinderGeometry args={[0.24 * s, 0.1 * s, 0.6 * s, 14]} />
        <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Hopper lid */}
      <mesh position={[-fw * 0.32, fh + 0.63 * s, 0]}>
        <cylinderGeometry args={[0.26 * s, 0.24 * s, 0.06 * s, 14]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Filling nozzles (animated group) */}
      <group ref={nozzleRef} position={[0, fh + 0.1 * s, 0]}>
        {[-0.2, 0, 0.2].map((nx) => (
          <mesh key={nx} position={[nx * s, 0, 0]}>
            <cylinderGeometry args={[0.04 * s, 0.025 * s, 0.22 * s, 8]} />
            <meshStandardMaterial color={STEEL_COLOR} metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
        {/* Nozzle manifold */}
        <mesh position={[0, 0.12 * s, 0]}>
          <boxGeometry args={[0.56 * s, 0.05 * s, 0.06 * s]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Sealing head cross-bar */}
      <mesh castShadow position={[fw * 0.2, fh * 0.72, 0]}>
        <boxGeometry args={[0.13 * s, 0.2 * s, fd * 0.82]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Heat-seal band */}
      <mesh position={[fw * 0.2, fh * 0.62, 0]}>
        <boxGeometry args={[0.015 * s, 0.04 * s, fd * 0.72]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.6} roughness={0.3} />
      </mesh>

      {/* Conveyor belt top */}
      <mesh receiveShadow position={[0, fh, 0]}>
        <boxGeometry args={[fw * 0.9, 0.04 * s, fd * 0.62]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Moving tubs */}
      <group ref={convRef}>
        {[-0.38, -0.13, 0.12, 0.37].map((tx, k) => (
          <mesh key={k} castShadow position={[tx * s, fh + 0.07 * s, 0]}>
            <cylinderGeometry args={[0.065 * s, 0.055 * s, 0.1 * s, 12]} />
            <meshStandardMaterial color="#fde68a" roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Output conveyor */}
      <ConveyorBelt position={[fw * 0.5 + 0.7 * s, fh * 0.38, 0]} length={1.3 * s} width={fd * 0.6} s={s} />

      {/* Carton stacker area */}
      <group position={[fw * 0.5 + 1.4 * s, 0, 0]}>
        {[0, 1, 2].map((row) => (
          <mesh key={row} castShadow position={[0, (0.12 + row * 0.14) * s, 0]}>
            <boxGeometry args={[0.3 * s, 0.12 * s, fd * 0.55]} />
            <meshStandardMaterial color={row % 2 ? '#fef3c7' : '#fde68a'} roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Control panel */}
      <mesh castShadow position={[fw * 0.5 + 0.08 * s, fh * 0.68, 0]}>
        <boxGeometry args={[0.12 * s, 0.32 * s, fd * 0.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Screen */}
      <mesh position={[fw * 0.5 + 0.15 * s, fh * 0.68, 0]}>
        <boxGeometry args={[0.02 * s, 0.18 * s, 0.22 * s]} />
        <meshStandardMaterial color="#c4b5fd" roughness={0.1} emissive="#7c3aed" emissiveIntensity={0.7} />
      </mesh>

      <BrandPlate position={[0, fh * 0.12, fd / 2 + 0.02 * s]} s={s} />
    </group>
  );
}

function ConveyorBelt({
  position,
  length,
  width,
  s = 1,
}: {
  position: [number, number, number];
  length: number;
  width: number;
  s?: number;
}) {
  const rollers = useRef<Mesh[]>([]);
  const n = 8;
  useFrame((_, dt) => {
    rollers.current.forEach((m) => m && (m.rotation.y -= dt * 5));
  });
  return (
    <group position={position}>
      {[-1, 1].map((side) => (
        <mesh key={side} castShadow position={[0, 0, (side * width) / 2]}>
          <boxGeometry args={[length, 0.06 * s, 0.03 * s]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: n }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) rollers.current[i] = m;
          }}
          position={[-length / 2 + (i + 0.5) * (length / n), 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.032 * s, 0.032 * s, width, 10]} />
          <meshStandardMaterial color={STEEL_COLOR} metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
      {[-1, 1].map((side) =>
        [-1, 1].map((e) => (
          <mesh key={`${side}${e}`} position={[(e * length) / 2.2, -0.15 * s, (side * width) / 2]}>
            <boxGeometry args={[0.03 * s, 0.3 * s, 0.03 * s]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        )),
      )}
    </group>
  );
}

// ─── Station model type registry ─────────────────────────────────────────────

export type EquipmentModelType =
  | 'receiving-dock'
  | 'soaking-tank'
  | 'cooking-kettle'
  | 'stone-mill'
  | 'chiller'
  | 'metal-detector'
  | 'packaging'
  | 'generic';

/**
 * Map station ID / name to the correct equipment model type.
 * Falls back to 'generic'.
 */
export function resolveModelType(id: string, name: string): EquipmentModelType {
  const i = id.toLowerCase();
  const n = name.toLowerCase();

  if (i.includes('receiving') || i.includes('receive') || n.includes('קבלה')) return 'receiving-dock';
  if (i.includes('cooling') || i.includes('chiller') || n.includes('קירור')) return 'chiller';
  if (i.includes('metal') || i.includes('detector') || n.includes('גלאי')) return 'metal-detector';
  if (i.includes('packaging') || i.includes('pack') || n.includes('אריזה')) return 'packaging';
  if (i.includes('cooking') || i.includes('cook') || n.includes('בישול')) return 'cooking-kettle';
  if (i.includes('tahini') || n.includes('טחינה') || i.includes('grind') || i.includes('mill')) return 'stone-mill';
  if (i.includes('soaking') || i.includes('soak') || n.includes('השריה')) return 'soaking-tank';

  return 'generic';
}

// ─── Generic machine fallback ─────────────────────────────────────────────────

export function GenericMachineModel({
  scale: s = 1,
  controlType = 'PRP',
}: {
  scale?: number;
  controlType?: string;
}) {
  const colors: Record<string, string> = {
    CCP: '#7c3aed',
    CP: '#1d4ed8',
    PRP: '#374151',
  };
  const color = colors[controlType] ?? '#374151';
  const h = controlType === 'CCP' ? 1.2 * s : controlType === 'CP' ? 1.0 * s : 0.8 * s;

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[0.8 * s, h, 0.6 * s]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.55} />
      </mesh>
      <mesh castShadow position={[0, h * 0.65, 0.31 * s]}>
        <boxGeometry args={[0.35 * s, 0.22 * s, 0.02 * s]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, h * 0.65, 0.325 * s]}>
        <sphereGeometry args={[0.04 * s, 8, 6]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.7} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ─── EquipmentModel (public entry point) ─────────────────────────────────────

/**
 * Label anchor heights in world units at scale=3.
 * Values = actual model top-height (model_units * scale=3) + small clearance.
 */
const HEIGHT_BY_MODEL: Record<EquipmentModelType, number> = {
  'receiving-dock': 4.2,   // dock ~0.4 + sack stack ~0.9 → ~1.3 * 3 ≈ 3.9
  'soaking-tank':   5.2,   // tank h=1.0 + legH=0.3 + fill pipe ≈ 1.5 * 3 = 4.5
  'cooking-kettle': 6.0,   // legH=0.4 + hCyl=0.85 + vent top ≈ 1.8 * 3 = 5.4
  'stone-mill':     5.8,   // hopper lid 1.7 * 3 = 5.1
  'chiller':        6.8,   // cabinet h=1.5 + CU h=0.42 + fans ≈ 2.0 * 3 = 6.0, +headroom
  'metal-detector': 3.8,   // compact: beltH 0.72 + apH 0.38 + wall + beacon ≈ 1.2 * 3 = 3.6
  'packaging':      5.0,   // frame fh=0.95 + hopper + lid ≈ 1.7 * 3 = 5.1
  'generic':        3.9,
};

const WORKER_SPOT: Partial<Record<EquipmentModelType, [number, number, number]>> = {
  'receiving-dock':  [0.2,  0,  0.75],
  'cooking-kettle':  [0.8,  0,  0.65],
  'chiller':         [-0.9, 0,  0.65],
  'packaging':       [-0.3, 0,  0.75],
  // Metal detector worker stands beside the reject bin, not inside/over the belt
  'metal-detector':  [0.55, 0,  0.62],
  'stone-mill':      [-0.8, 0,  0.65],
};

export function EquipmentModel({
  modelType,
  controlType,
  scale = 1,
}: {
  modelType: EquipmentModelType;
  controlType: string;
  scale?: number;
}) {
  const worker = WORKER_SPOT[modelType];
  return (
    <group>
      <EquipmentBody modelType={modelType} controlType={controlType} scale={scale} />
      {worker && (
        <WorkerFigure
          position={[worker[0] * scale, 0, worker[2] * scale]}
          phase={worker[0] * 3}
        />
      )}
    </group>
  );
}

function EquipmentBody({
  modelType,
  controlType,
  scale = 1,
}: {
  modelType: EquipmentModelType;
  controlType: string;
  scale?: number;
}) {
  switch (modelType) {
    case 'receiving-dock':  return <ReceivingDockModel scale={scale} />;
    case 'soaking-tank':    return <SoakingTankModel scale={scale} />;
    case 'cooking-kettle':  return <CookingKettleModel scale={scale} />;
    case 'stone-mill':      return <StoneMill scale={scale} />;
    case 'chiller':         return <ChillerModel scale={scale} />;
    case 'metal-detector':  return <MetalDetectorModel scale={scale} />;
    case 'packaging':       return <PackagingMachineModel scale={scale} />;
    default:                return <GenericMachineModel scale={scale} controlType={controlType} />;
  }
}

// Export HEIGHT_BY_MODEL so station-marker can use it
export { HEIGHT_BY_MODEL };
