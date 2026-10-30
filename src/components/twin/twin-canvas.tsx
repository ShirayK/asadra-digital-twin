'use client';

import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, SoftShadows } from '@react-three/drei';
import type { TwinDTO, StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import FactoryFloor from './factory-floor';
import ZoneMesh from './zone-mesh';
import StationMarker from './station-marker';
import FlowArrows from './flow-arrows';
import SeparationOverlay from './separation-overlay';
import Legend from './legend';

interface TwinCanvasProps {
  dto: TwinDTO;
  locale: Locale;
  dir?: 'ltr' | 'rtl';
  showFlow?: boolean;
  showSeparation?: boolean;
  onStationClick?: (station: StationDTO) => void;
}

/**
 * Main 3-D scene.
 * Loaded with dynamic({ ssr: false }) from twin-view.tsx.
 * Uses frameloop="demand" for performance — OrbitControls invalidates on interaction.
 */
export default function TwinCanvas({
  dto,
  locale,
  dir = 'ltr',
  showFlow = true,
  showSeparation = true,
  onStationClick,
}: TwinCanvasProps) {
  const [, forceUpdate] = useState(0);

  const handleStationClick = useCallback(
    (station: StationDTO) => {
      onStationClick?.(station);
    },
    [onStationClick],
  );

  // Camera positioned to view the whole site
  const camX = dto.siteWidth / 2;
  const camZ = dto.siteDepth * 1.8;
  const camY = Math.max(dto.siteWidth, dto.siteDepth) * 0.8;

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px' }}>
      <Canvas
        frameloop="demand"
        shadows
        camera={{
          position: [camX, camY, camZ],
          fov: 50,
          near: 0.1,
          far: 500,
        }}
        style={{ background: '#0f172a', borderRadius: '8px' }}
        gl={{ antialias: true }}
      >
        {/* Soft ambient lighting */}
        <ambientLight intensity={0.5} />
        {/* Key directional light with shadows */}
        <directionalLight
          position={[dto.siteWidth * 0.5, 20, dto.siteDepth * 0.5]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        {/* Fill light from opposite side */}
        <directionalLight
          position={[-dto.siteWidth * 0.3, 10, -dto.siteDepth * 0.3]}
          intensity={0.4}
        />

        {/* Soft shadow helper */}
        <SoftShadows samples={10} focus={0.5} />

        {/* OrbitControls — invalidates canvas on interaction */}
        <OrbitControls
          target={[dto.siteWidth / 2, 0, dto.siteDepth / 2]}
          enableDamping
          dampingFactor={0.1}
          minDistance={5}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2.1}
        />

        {/* Factory floor */}
        <FactoryFloor widthM={dto.siteWidth} depthM={dto.siteDepth} />

        {/* Zones */}
        {dto.zones.map((zone) => (
          <ZoneMesh key={zone.id} zone={zone} locale={locale} />
        ))}

        {/* Station markers */}
        {dto.stations.map((station) => (
          <StationMarker
            key={station.id}
            station={station}
            locale={locale}
            onClick={handleStationClick}
          />
        ))}

        {/* Flow arrows (Prompt 7) */}
        {showFlow && <FlowArrows segments={dto.flowSegments} />}

        {/* Separation overlay (Prompt 7) */}
        {showSeparation && (
          <SeparationOverlay
            issues={dto.separationIssues}
            flowSegments={dto.flowSegments}
            locale={locale}
          />
        )}
      </Canvas>

      {/* Legend overlay */}
      <Legend locale={locale} dir={dir} />
    </div>
  );
}
