'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';

// ─── Detail helpers (manual polish after Bob budget) ──────────────────────────

/** Round pressure/temperature gauge with a glowing face and needle. */
function Gauge({ position, scale = 1, rotationY = 0 }: { position: [number, number, number]; scale?: number; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09 * scale, 0.09 * scale, 0.04 * scale, 18]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.022 * scale]}>
        <circleGeometry args={[0.075 * scale, 18]} />
        <meshStandardMaterial color="#ede9fe" emissive="#a78bfa" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.02 * scale, 0.02 * scale, 0.026 * scale]} rotation={[0, 0, -0.8]}>
        <boxGeometry args={[0.008 * scale, 0.06 * scale, 0.004 * scale]} />
        <meshBasicMaterial color="#dc2626" />
      </mesh>
    </group>
  );
}

/** Side ladder: two rails with rungs. */
function Ladder({ height, x, scale = 1 }: { height: number; x: number; scale?: number }) {
  const rungs = Math.max(3, Math.round(height / (0.14 * scale)));
  return (
    <group position={[x, 0, 0]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, height / 2, side * 0.09 * scale]}>
          <boxGeometry args={[0.025 * scale, height, 0.025 * scale]} />
          <meshStandardMaterial color="#facc15" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {Array.from({ length: rungs }).map((_, i) => (
        <mesh key={i} position={[0, (i + 0.5) * (height / rungs), 0]}>
          <boxGeometry args={[0.018 * scale, 0.018 * scale, 0.18 * scale]} />
          <meshStandardMaterial color="#eab308" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Stylised capsule worker in hygiene whites, gently bobbing. */
export function WorkerFigure({ position, color = '#f8fafc', phase = 0 }: { position: [number, number, number]; color?: string; phase?: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.abs(Math.sin(clock.elapsedTime * 1.6 + phase)) * 0.03;
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.5 + phase) * 0.6;
    }
  });
  return (
    <group ref={ref} position={position} scale={3.05}>
      <mesh castShadow position={[0, 0.48, 0]}>
        <capsuleGeometry args={[0.13, 0.42, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.11, 14, 10]} />
        <meshStandardMaterial color="#f1c27d" roughness={0.8} />
      </mesh>
      {/* hairnet cap */}
      <mesh position={[0, 1.04, 0]}>
        <sphereGeometry args={[0.115, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── Shared materials (created once, reused) ──────────────────────────────────

function SteelMat({ color = '#b0b8c1', roughness = 0.25, metalness = 0.85 }: {
  color?: string;
  roughness?: number;
  metalness?: number;
}) {
  return (
    <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
  );
}

function PipeMat() {
  return <meshStandardMaterial color="#8a9bb0" roughness={0.3} metalness={0.9} />;
}

// ─── Stainless steel tank / kettle ────────────────────────────────────────────
/**
 * Vertical cylinder with a domed top cap, four legs, and a side pipe.
 * Used for soaking tank, cooking kettle, tahini mixer.
 */
export function TankModel({
  scale = 1,
  color = '#c5cdd4',
}: {
  scale?: number;
  color?: string;
}) {
  const r = 0.38 * scale;
  const h = 1.0 * scale;
  const legH = 0.28 * scale;

  return (
    <group position={[0, legH, 0]}>
      {/* Tank body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 20]} />
        <SteelMat color={color} />
      </mesh>

      {/* Domed top cap */}
      <mesh castShadow position={[0, h / 2, 0]}>
        <sphereGeometry args={[r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <SteelMat color={color} />
      </mesh>

      {/* Conical bottom */}
      <mesh castShadow position={[0, -h / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[r, 0.22 * scale, 20]} />
        <SteelMat color={color} roughness={0.3} />
      </mesh>

      {/* Four legs */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([lx, lz], i) => (
        <mesh key={i} castShadow position={[lx * r * 0.7, -h / 2 - legH / 2, lz * r * 0.7]}>
          <cylinderGeometry args={[0.035 * scale, 0.035 * scale, legH, 6]} />
          <SteelMat color="#7a8590" />
        </mesh>
      ))}

      {/* Side outlet pipe */}
      <mesh castShadow position={[r + 0.1 * scale, -h * 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045 * scale, 0.045 * scale, 0.22 * scale, 8]} />
        <PipeMat />
      </mesh>

      {/* Manway ring on dome */}
      <mesh position={[0, h / 2 + 0.09 * scale, 0]}>
        <torusGeometry args={[r * 0.32, 0.03 * scale, 6, 16]} />
        <SteelMat color="#8a9aa8" roughness={0.2} />
      </mesh>

      {/* Weld seams */}
      {[-h * 0.25, h * 0.25].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 1.005, 0.008 * scale, 4, 24]} />
          <SteelMat color="#9aa6b2" />
        </mesh>
      ))}

      {/* Ladder to the manway */}
      <group position={[0, -h / 2 - legH, 0]}>
        <Ladder height={h + legH + r * 0.6} x={-r - 0.06 * scale} scale={scale} />
      </group>

      {/* Gauge */}
      <Gauge position={[0, h * 0.15, r + 0.02 * scale]} scale={scale} />
    </group>
  );
}

// ─── Cooking kettle (larger, with heating jacket indicators) ──────────────────
export function KettleModel({ scale = 1 }: { scale?: number }) {
  const r = 0.5 * scale;
  const h = 1.1 * scale;
  const legH = 0.32 * scale;

  return (
    <group position={[0, legH, 0]}>
      {/* Main kettle body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 0.9, h, 24]} />
        <meshStandardMaterial color="#c8cfd5" roughness={0.2} metalness={0.88} />
      </mesh>

      {/* Dome top */}
      <mesh castShadow position={[0, h / 2, 0]}>
        <sphereGeometry args={[r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8cfd5" roughness={0.2} metalness={0.88} />
      </mesh>

      {/* Heating jacket band */}
      <mesh position={[0, -h * 0.1, 0]}>
        <cylinderGeometry args={[r + 0.04 * scale, r + 0.04 * scale, h * 0.55, 24]} />
        <meshStandardMaterial color="#9fb0be" roughness={0.35} metalness={0.7} transparent opacity={0.7} />
      </mesh>

      {/* Steam pipe up */}
      <mesh castShadow position={[0.06 * scale, h / 2 + 0.25 * scale, 0]}>
        <cylinderGeometry args={[0.04 * scale, 0.04 * scale, 0.45 * scale, 8]} />
        <PipeMat />
      </mesh>

      <Gauge position={[0, h * 0.25, r + 0.06 * scale]} scale={scale * 1.2} />
      <Gauge position={[r + 0.06 * scale, h * 0.25, 0]} scale={scale} rotationY={Math.PI / 2} />
      <group position={[0, -h / 2 - legH, 0]}>
        <Ladder height={h + legH + r * 0.5} x={-r - 0.08 * scale} scale={scale} />
      </group>

      {/* Four heavy legs */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([lx, lz], i) => (
        <mesh key={i} castShadow position={[lx * r * 0.65, -h / 2 - legH / 2, lz * r * 0.65]}>
          <cylinderGeometry args={[0.05 * scale, 0.055 * scale, legH, 6]} />
          <meshStandardMaterial color="#6b7a86" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Blast chiller / cold room ─────────────────────────────────────────────────
/**
 * Insulated box with a door panel, hinges, and a handle strip.
 */
export function ChillerModel({ scale = 1 }: { scale?: number }) {
  const w = 1.1 * scale;
  const h = 1.3 * scale;
  const d = 0.85 * scale;

  return (
    <group>
      {/* Insulated box */}
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#dde4ea" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Door panel (slightly proud) */}
      <mesh castShadow position={[0, h / 2, d / 2 + 0.008 * scale]}>
        <boxGeometry args={[w * 0.72, h * 0.82, 0.015 * scale]} />
        <meshStandardMaterial color="#b5c5d5" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Door handle */}
      <mesh castShadow position={[w * 0.28, h / 2, d / 2 + 0.04 * scale]}>
        <boxGeometry args={[0.06 * scale, h * 0.35, 0.055 * scale]} />
        <meshStandardMaterial color="#8899aa" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Two hinges */}
      {[-h * 0.28, h * 0.28].map((y, i) => (
        <mesh key={i} castShadow position={[-w * 0.32, h / 2 + y, d / 2 + 0.02 * scale]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03 * scale, 0.03 * scale, 0.07 * scale, 8]} />
          <meshStandardMaterial color="#778899" roughness={0.25} metalness={0.9} />
        </mesh>
      ))}

      {/* Fan grills on the side */}
      {[h * 0.3, h * 0.7].map((y, i) => (
        <ChillerFan key={i} position={[w / 2 + 0.01 * scale, y, 0]} scale={scale} />
      ))}
      {/* Status strip above door */}
      <mesh position={[0, h * 0.95, d / 2 + 0.012 * scale]}>
        <boxGeometry args={[w * 0.6, 0.04 * scale, 0.01 * scale]} />
        <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={1.2} />
      </mesh>

      {/* Compressor box on top-back */}
      <mesh castShadow position={[0, h + 0.12 * scale, -d * 0.2]}>
        <boxGeometry args={[w * 0.55, 0.22 * scale, d * 0.55]} />
        <meshStandardMaterial color="#9aaabb" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

function ChillerFan({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const blades = useRef<Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.x += dt * 6;
  });
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <torusGeometry args={[0.18 * scale, 0.02 * scale, 6, 24]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>
      {[0.06, 0.12].map((rr) => (
        <mesh key={rr}>
          <torusGeometry args={[rr * scale, 0.006 * scale, 4, 20]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
      ))}
      <group ref={blades} rotation={[0, Math.PI / 2, 0]}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} rotation={[(k * Math.PI) / 2, 0, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[0.01 * scale, 0.3 * scale, 0.05 * scale]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── Metal detector arch ───────────────────────────────────────────────────────
export function MetalDetectorModel({ scale = 1 }: { scale?: number }) {
  const w = 0.9 * scale;
  const h = 1.5 * scale;
  const thick = 0.12 * scale;
  const d = 0.28 * scale;

  return (
    <group>
      {/* Left upright */}
      <mesh castShadow receiveShadow position={[-w / 2, h / 2, 0]}>
        <boxGeometry args={[thick, h, d]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Right upright */}
      <mesh castShadow receiveShadow position={[w / 2, h / 2, 0]}>
        <boxGeometry args={[thick, h, d]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Top beam */}
      <mesh castShadow position={[0, h, 0]}>
        <boxGeometry args={[w + thick, thick, d]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Sensor panel left */}
      <mesh position={[-w / 2, h * 0.5, d * 0.1]}>
        <boxGeometry args={[0.04 * scale, h * 0.6, 0.08 * scale]} />
        <meshStandardMaterial color="#2563eb" roughness={0.3} metalness={0.3} emissive="#1a3a80" emissiveIntensity={0.4} />
      </mesh>

      {/* Sensor panel right */}
      <mesh position={[w / 2, h * 0.5, d * 0.1]}>
        <boxGeometry args={[0.04 * scale, h * 0.6, 0.08 * scale]} />
        <meshStandardMaterial color="#2563eb" roughness={0.3} metalness={0.3} emissive="#1a3a80" emissiveIntensity={0.4} />
      </mesh>

      {/* Control box on right upright */}
      <mesh castShadow position={[w / 2 + 0.12 * scale, h * 0.65, 0]}>
        <boxGeometry args={[0.2 * scale, 0.25 * scale, d * 0.8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Control display */}
      <mesh position={[w / 2 + 0.23 * scale, h * 0.65, 0]}>
        <boxGeometry args={[0.02 * scale, 0.12 * scale, 0.14 * scale]} />
        <meshStandardMaterial color="#22c55e" roughness={0.1} metalness={0.1} emissive="#22c55e" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// ─── Packaging machine ─────────────────────────────────────────────────────────
/**
 * Horizontal form-fill-seal style machine: main frame + hopper + sealing head + conveyor out.
 */
export function PackagingMachineModel({ scale = 1 }: { scale?: number }) {
  const fw = 1.1 * scale;
  const fh = 0.9 * scale;
  const fd = 0.65 * scale;

  return (
    <group>
      {/* Main frame */}
      <mesh castShadow receiveShadow position={[0, fh / 2, 0]}>
        <boxGeometry args={[fw, fh, fd]} />
        <meshStandardMaterial color="#b8c4ce" roughness={0.35} metalness={0.65} />
      </mesh>

      {/* Hopper on top */}
      <mesh castShadow position={[-fw * 0.25, fh + 0.22 * scale, 0]}>
        <cylinderGeometry args={[0.22 * scale, 0.1 * scale, 0.42 * scale, 12]} />
        <meshStandardMaterial color="#8a9fae" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Sealing head (cross-beam) */}
      <mesh castShadow position={[fw * 0.18, fh * 0.75, 0]}>
        <boxGeometry args={[0.12 * scale, 0.18 * scale, fd * 0.8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Control panel */}
      <mesh castShadow position={[fw * 0.5 + 0.05 * scale, fh * 0.7, 0]}>
        <boxGeometry args={[0.1 * scale, 0.3 * scale, fd * 0.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Screen */}
      <mesh position={[fw * 0.5 + 0.11 * scale, fh * 0.7, 0]}>
        <boxGeometry args={[0.02 * scale, 0.18 * scale, 0.22 * scale]} />
        <meshStandardMaterial color="#c4b5fd" roughness={0.1} emissive="#7c3aed" emissiveIntensity={0.6} />
      </mesh>

      {/* Output conveyor with animated rollers and moving packs */}
      <Conveyor position={[fw * 0.5 + 0.7 * scale, fh * 0.32, 0]} length={1.2 * scale} width={fd * 0.7} scale={scale} />
    </group>
  );
}

function Conveyor({ position, length, width, scale = 1 }: { position: [number, number, number]; length: number; width: number; scale?: number }) {
  const rollers = useRef<Mesh[]>([]);
  const packs = useRef<Group>(null);
  const n = 9;
  useFrame((_, dt) => {
    rollers.current.forEach((m) => m && (m.rotation.y -= dt * 5));
    if (packs.current) {
      packs.current.children.forEach((c) => {
        c.position.x += dt * 0.25 * scale;
        if (c.position.x > length / 2) c.position.x -= length;
      });
    }
  });
  return (
    <group position={position}>
      {[-1, 1].map((side) => (
        <mesh key={side} castShadow position={[0, 0, (side * width) / 2]}>
          <boxGeometry args={[length, 0.08 * scale, 0.03 * scale]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: n }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => { if (m) rollers.current[i] = m; }}
          position={[-length / 2 + (i + 0.5) * (length / n), 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.035 * scale, 0.035 * scale, width, 10]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {[-1, 1].map((side) =>
        [-1, 1].map((e) => (
          <mesh key={`${side}${e}`} position={[(e * length) / 2.3, -0.16 * scale, (side * width) / 2]}>
            <boxGeometry args={[0.03 * scale, 0.32 * scale, 0.03 * scale]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        )),
      )}
      <group ref={packs}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} castShadow position={[-length / 2 + (k * length) / 3, 0.08 * scale, 0]}>
            <boxGeometry args={[0.16 * scale, 0.09 * scale, 0.12 * scale]} />
            <meshStandardMaterial color="#fde68a" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── Receiving dock with pallets ───────────────────────────────────────────────
export function ReceivingDockModel({ scale = 1 }: { scale?: number }) {
  return (
    <group>
      {/* Dock bumper / platform edge */}
      <mesh castShadow receiveShadow position={[0, 0.06 * scale, -0.5 * scale]}>
        <boxGeometry args={[1.4 * scale, 0.12 * scale, 0.18 * scale]} />
        <meshStandardMaterial color="#374151" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Two pallets stacked */}
      <Pallet scale={scale} position={[-0.4 * scale, 0, 0]} />
      <Pallet scale={scale} position={[0.4 * scale, 0, 0]} />

      {/* Temp probe post */}
      <mesh castShadow position={[0.72 * scale, 0.55 * scale, 0.1 * scale]}>
        <cylinderGeometry args={[0.03 * scale, 0.03 * scale, 1.1 * scale, 6]} />
        <SteelMat color="#aab5be" />
      </mesh>
      {/* Probe sensor head */}
      <mesh castShadow position={[0.72 * scale, 0.55 * scale, 0.38 * scale]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055 * scale, 0.055 * scale, 0.14 * scale, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

function Pallet({ scale = 1, position }: { scale?: number; position: [number, number, number] }) {
  const pw = 0.6 * scale;
  const ph = 0.14 * scale;
  const pd = 0.5 * scale;

  return (
    <group position={position}>
      {/* Pallet deck */}
      <mesh castShadow receiveShadow position={[0, ph / 2, 0]}>
        <boxGeometry args={[pw, ph, pd]} />
        <meshStandardMaterial color="#a07850" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Deck boards gaps (just visual suggestion via color) */}
      <mesh position={[0, ph + 0.01 * scale, 0]}>
        <boxGeometry args={[pw, 0.015 * scale, pd]} />
        <meshStandardMaterial color="#8a6640" roughness={0.95} metalness={0.02} />
      </mesh>
      {/* Load boxes stacked on pallet */}
      <mesh castShadow position={[0, ph + 0.18 * scale, 0]}>
        <boxGeometry args={[pw * 0.85, 0.32 * scale, pd * 0.85]} />
        <meshStandardMaterial color="#e8c878" roughness={0.85} metalness={0.0} />
      </mesh>
    </group>
  );
}

// ─── Generic machine fallback ─────────────────────────────────────────────────
export function GenericMachineModel({
  scale = 1,
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
  const h = controlType === 'CCP' ? 1.2 * scale : controlType === 'CP' ? 1.0 * scale : 0.8 * scale;

  return (
    <group>
      {/* Main body */}
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[0.8 * scale, h, 0.6 * scale]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.55} />
      </mesh>
      {/* Control panel face */}
      <mesh castShadow position={[0, h * 0.65, 0.31 * scale]}>
        <boxGeometry args={[0.35 * scale, 0.22 * scale, 0.02 * scale]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Indicator light */}
      <mesh position={[0, h * 0.65, 0.325 * scale]}>
        <sphereGeometry args={[0.04 * scale, 8, 6]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.7} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ─── Station ID → model type lookup ───────────────────────────────────────────
export type EquipmentModelType =
  | 'tank'
  | 'kettle'
  | 'chiller'
  | 'metal-detector'
  | 'packaging'
  | 'receiving-dock'
  | 'generic';

/**
 * Given a station id and name (lowercased), return the equipment model type.
 * Falls back to 'generic'.
 */
export function resolveModelType(id: string, name: string): EquipmentModelType {
  const n = name.toLowerCase();
  const i = id.toLowerCase();

  if (i.includes('receiving') || i.includes('receive') || n.includes('קבלה')) return 'receiving-dock';
  if (i.includes('cooling') || i.includes('chiller') || n.includes('קירור')) return 'chiller';
  if (i.includes('metal') || i.includes('detector') || n.includes('גלאי')) return 'metal-detector';
  if (i.includes('packaging') || i.includes('pack') || n.includes('אריזה')) return 'packaging';
  if (i.includes('cooking') || i.includes('cook') || n.includes('בישול')) return 'kettle';
  if (i.includes('soaking') || i.includes('soak') || i.includes('tahini') || i.includes('mix')) return 'tank';

  return 'generic';
}

/** Render the right equipment model for a station, offset so it sits on the floor. */
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
      {worker && <WorkerFigure position={[worker[0] * scale, 0, worker[2] * scale]} phase={worker[0] * 3} />}
    </group>
  );
}

const WORKER_SPOT: Partial<Record<EquipmentModelType, [number, number, number]>> = {
  'receiving-dock': [0.2, 0, 0.75],
  kettle: [0.8, 0, 0.6],
  chiller: [-0.9, 0, 0.6],
  packaging: [-0.3, 0, 0.75],
  'metal-detector': [0.6, 0, 0.55],
};

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
    case 'receiving-dock':
      return <ReceivingDockModel scale={scale} />;
    case 'chiller':
      return <ChillerModel scale={scale} />;
    case 'metal-detector':
      return <MetalDetectorModel scale={scale} />;
    case 'packaging':
      return <PackagingMachineModel scale={scale} />;
    case 'kettle':
      return <KettleModel scale={scale} />;
    case 'tank':
      return <TankModel scale={scale} />;
    default:
      return <GenericMachineModel scale={scale} controlType={controlType} />;
  }
}
