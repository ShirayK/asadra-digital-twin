'use client';

/**
 * Procedural set dressing: storage racks with pallets, packaging pallets,
 * overhead process pipes between tanks, and a high-care conveyor.
 * Purely decorative (no interaction, no domain logic).
 * Manual addition after Bob ran out of Bobcoins.
 */
import type { Zone } from '@/domain/schema';

const STEEL = { color: '#8a97a8', metalness: 0.85, roughness: 0.3 } as const;

function Pallet({ x, z, h = 0.9, color = '#c08a4a' }: { x: number; z: number; h?: number; color?: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.14, 1.0]} />
        <meshStandardMaterial color="#6b4a2b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.14 + h / 2, 0]} castShadow>
        <boxGeometry args={[1.1, h, 0.9]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* stretch-wrap band */}
      <mesh position={[0, 0.14 + h * 0.6, 0]}>
        <boxGeometry args={[1.12, 0.05, 0.92]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function Rack({ x, z, len }: { x: number; z: number; len: number }) {
  const levels = [0, 1.3, 2.6];
  const posts = [-len / 2, 0, len / 2];
  return (
    <group position={[x, 0, z]}>
      {posts.map((px) =>
        [-0.5, 0.5].map((pz) => (
          <mesh key={`${px}${pz}`} position={[0, 1.8, 0]} castShadow>
            <boxGeometry args={[0.08, 3.6, 0.08]} />
            <meshStandardMaterial color="#f97316" metalness={0.4} roughness={0.5} />
          </mesh>
        )).map((m, i) => <group key={i} position={[px, 0, [-0.5, 0.5][i]]}>{m}</group>),
      )}
      {levels.map((ly) => (
        <group key={ly}>
          <mesh position={[0, ly + 0.05, 0]} castShadow>
            <boxGeometry args={[len, 0.08, 1.05]} />
            <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
          </mesh>
          {[-len / 4, len / 4].map((px, i) => (
            <group key={i} position={[0, ly + 0.09, 0]}>
              <Pallet x={px} z={0} h={0.8} color={(ly + i) % 2 ? '#d6a35c' : '#e5e7eb'} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function Pipe({ from, to, y = 2.4, color = '#cbd5e1' }: { from: [number, number]; to: [number, number]; y?: number; color?: string }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  return (
    <group>
      <mesh position={[(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2]} rotation={[Math.PI / 2, 0, -ang]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, len, 12]} />
        <meshStandardMaterial color={color} {...{ metalness: 0.9, roughness: 0.25 }} />
      </mesh>
      {[from, to].map((p, i) => (
        <mesh key={i} position={[p[0], y / 2 + 0.6, p[1]]}>
          <cylinderGeometry args={[0.07, 0.07, y - 1.2, 10]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      ))}
    </group>
  );
}

export default function PlantProps({ zones }: { zones: Zone[] }) {
  const byId = Object.fromEntries(zones.map((z) => [z.id, z]));
  const st = byId['z-storage'];
  const pk = byId['z-packaging'];
  const hc = byId['z-highcare'];
  return (
    <group>
      {st && (
        <>
          <Rack x={st.x} z={st.z - 1.6} len={3.2} />
          <Rack x={st.x} z={st.z + 1.6} len={3.2} />
        </>
      )}
      {pk && (
        <>
          <Pallet x={pk.x + 1.8} z={pk.z + 1.9} h={1.1} />
          <Pallet x={pk.x + 0.4} z={pk.z + 1.9} h={0.7} color="#e5e7eb" />
          <Pallet x={pk.x + 1.8} z={pk.z - 1.9} h={0.9} />
        </>
      )}
      {/* Process piping: soaking → cooking → tahini, glowing stainless */}
      <Pipe from={[10, 4]} to={[13, 4]} y={3.6} />
      <Pipe from={[13, 4]} to={[17, 4]} y={3.9} color="#93c5fd" />
      {hc && (
        /* High-care conveyor from cooling toward metal detector */
        <group position={[hc.x + 2.5, 0, hc.z]}>
          <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
            <boxGeometry args={[5, 0.12, 0.8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          {[-2.3, 0, 2.3].map((x) => (
            <mesh key={x} position={[x, 0.42, 0]}>
              <boxGeometry args={[0.08, 0.84, 0.7]} />
              <meshStandardMaterial {...STEEL} />
            </mesh>
          ))}
          {[-1.6, -0.4, 0.8, 2].map((x) => (
            <mesh key={x} position={[x, 1.02, 0]} castShadow>
              <boxGeometry args={[0.45, 0.22, 0.35]} />
              <meshStandardMaterial color="#fde68a" roughness={0.7} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
