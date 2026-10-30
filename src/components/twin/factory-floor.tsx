'use client';

import { Grid } from '@react-three/drei';

interface FactoryFloorProps {
  widthM: number;
  depthM: number;
}

/**
 * Factory floor: a flat plane + grid overlay sized to the site dimensions.
 * The floor sits at y = 0; width runs along X, depth along Z.
 */
export default function FactoryFloor({ widthM, depthM }: FactoryFloorProps) {
  return (
    <group>
      {/* Floor mesh */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[widthM / 2, 0, depthM / 2]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>

      {/* Grid overlay */}
      <Grid
        position={[widthM / 2, 0.01, depthM / 2]}
        args={[widthM, depthM]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#9ca3af"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#6b7280"
        fadeDistance={80}
        fadeStrength={1}
        infiniteGrid={false}
      />
    </group>
  );
}
