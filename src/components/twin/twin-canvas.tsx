'use client';

import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, SoftShadows, Environment, ContactShadows } from '@react-three/drei';
import type { TwinDTO, StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import FactoryFloor from './factory-floor';
import ZoneMesh from './zone-mesh';
import StationMarker from './station-marker';
import FlowArrows from './flow-arrows';
import SeparationOverlay from './separation-overlay';
import Legend from './legend';
import { GuidedTourCamera } from './guided-tour';

interface TwinCanvasProps {
  dto: TwinDTO;
  locale: Locale;
  dir?: 'ltr' | 'rtl';
  showFlow?: boolean;
  showSeparation?: boolean;
  editMode?: boolean;
  /** When true, the GuidedTourCamera lerp is active (frameloop switches to "always") */
  tourActive?: boolean;
  onStationClick?: (station: StationDTO) => void;
  onStationMove?: (id: string, x: number, z: number) => void;
}

/**
 * Main 3-D scene.
 * Loaded with dynamic({ ssr: false }) from twin-view.tsx.
 * frameloop="demand" for performance — OrbitControls invalidates on interaction.
 * Edit mode allows dragging station markers.
 */
export default function TwinCanvas({
  dto,
  locale,
  dir = 'ltr',
  showFlow = true,
  showSeparation = true,
  editMode = false,
  tourActive = false,
  onStationClick,
  onStationMove,
}: TwinCanvasProps) {
  const handleStationClick = useCallback(
    (station: StationDTO) => {
      onStationClick?.(station);
    },
    [onStationClick],
  );

  const handleStationMove = useCallback(
    (id: string, x: number, z: number) => {
      onStationMove?.(id, x, z);
    },
    [onStationMove],
  );

  // Camera positioned to tightly frame the whole site
  const cx = dto.siteWidth / 2;
  const cz = dto.siteDepth / 2;
  const camDist = Math.max(dto.siteWidth, dto.siteDepth) * 0.9;
  const camY = camDist * 0.65;
  const camZ = cz + camDist * 0.8;

  return (
    <div style={{ position: 'relative', width: '100%', height: '700px' }}>
      <Canvas
        frameloop={editMode || tourActive ? 'always' : 'demand'}
        shadows
        camera={{
          position: [cx - dto.siteWidth * 0.15, camY, camZ],
          fov: 45,
          near: 0.1,
          far: 500,
        }}
        style={{ background: '#1a2235', borderRadius: '10px' }}
        gl={{ antialias: true }}
      >
        {/* ── Environment (warehouse HDRI — no external download, uses drei's built-in preset) ── */}
        <Environment preset="warehouse" />

        {/* ── Hemisphere sky/ground ambient ── */}
        <hemisphereLight args={['#d8e8f5', '#4a4030', 0.55]} />

        {/* ── Key directional light with soft shadows ── */}
        <directionalLight
          position={[dto.siteWidth * 0.6, 25, dto.siteDepth * 0.7]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={120}
          shadow-camera-left={-dto.siteWidth}
          shadow-camera-right={dto.siteWidth}
          shadow-camera-top={dto.siteDepth}
          shadow-camera-bottom={-dto.siteDepth}
          shadow-bias={-0.0005}
        />

        {/* ── Fill light from opposite side ── */}
        <directionalLight
          position={[-dto.siteWidth * 0.4, 12, -dto.siteDepth * 0.4]}
          intensity={0.4}
        />

        {/* ── Warm overhead fill (factory ceiling lights feel) ── */}
        <pointLight position={[cx, 8, cz]} intensity={0.8} distance={40} decay={1.5} />

        {/* ── Soft shadow helper (PCF) ── */}
        <SoftShadows samples={16} focus={0.6} size={25} />

        {/* ── Contact shadows on the floor for grounding ── */}
        <ContactShadows
          position={[cx, 0.01, cz]}
          width={dto.siteWidth * 1.1}
          height={dto.siteDepth * 1.1}
          far={10}
          blur={1.5}
          opacity={0.4}
          frames={1}
        />

        {/* ── Guided tour camera lerp ── */}
        {tourActive && <GuidedTourCamera />}

        {/* ── OrbitControls — invalidates canvas on interaction ── */}
        <OrbitControls
          target={[cx, 0, cz]}
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2.05}
        />

        {/* ── Factory floor (concrete, walls, partitions, safety lines, signs) ── */}
        <FactoryFloor widthM={dto.siteWidth} depthM={dto.siteDepth} zones={dto.zones} />

        {/* ── Zones (hygiene overlays + labels — kept for separation overlay context) ── */}
        {dto.zones.map((zone) => (
          <ZoneMesh key={zone.id} zone={zone} locale={locale} />
        ))}

        {/* ── Station markers (realistic equipment models) ── */}
        {dto.stations.map((station) => (
          <StationMarker
            key={station.id}
            station={station}
            locale={locale}
            editMode={editMode}
            onClick={handleStationClick}
            onMove={handleStationMove}
          />
        ))}

        {/* ── Flow arrows ── */}
        {showFlow && <FlowArrows segments={dto.flowSegments} />}

        {/* ── Separation overlay ── */}
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
