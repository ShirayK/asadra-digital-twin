'use client';

import { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import PlantProps from './plant-props';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import type { TwinDTO, StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import FactoryFloor from './factory-floor';
import ZoneMesh from './zone-mesh';
import StationMarker from './station-marker';
import FlowArrows from './flow-arrows';
import SeparationOverlay from './separation-overlay';
import Legend from './legend';
import { GuidedTourCamera } from './guided-tour';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

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
 * Main 3-D scene — cinematic dark industrial look (Bob session 13).
 * - Dark background #0b0f17, fog
 * - Auto-rotates slowly until user interacts
 * - Bloom + Vignette postprocessing
 * - frameloop="always" while auto-rotating, "demand" after first interaction
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

  // Track whether the user has interacted (stops auto-rotate, switches to demand)
  const [userInteracted, setUserInteracted] = useState(false);
  const orbitRef = useRef<OrbitControlsImpl>(null);

  // Camera: compute a position that fits the whole plant in view
  const cx = dto.siteWidth / 2;
  const cz = dto.siteDepth / 2;
  // Use the larger of width/depth to ensure the whole floor is visible
  const plantSpan = Math.max(dto.siteWidth, dto.siteDepth);
  // Distance chosen so the plant fills ~75% of the FOV (fov=40°, half = 20°)
  const fitDist = (plantSpan / 2) / Math.tan((20 * Math.PI) / 180) * 0.62;
  const camY = fitDist * 0.85;
  const camZ = cz + fitDist * 0.75;

  // Auto-rotate active until user interacts
  const autoRotate = !userInteracted && !editMode && !tourActive;
  // frameloop="always" while auto-rotating or in edit/tour; otherwise "demand"
  const frameloop: 'always' | 'demand' = editMode || tourActive || autoRotate ? 'always' : 'demand';

  return (
    <div style={{ position: 'relative', width: '100%', height: '700px' }}>
      <Canvas
        frameloop={frameloop}
        shadows
        camera={{
          position: [cx, camY, camZ],
          fov: 40,
          near: 0.1,
          far: 500,
        }}
        style={{ background: '#0b0f17', borderRadius: '10px' }}
        gl={{ antialias: true }}
        onPointerDown={() => {
          if (!userInteracted) setUserInteracted(true);
        }}
      >
        {/* ── Fog for atmospheric depth ────────────────────────────────── */}
        <fog attach="fog" args={['#0b0f17', 40, 160]} />

        {/* ── Dark warehouse environment (ambient reflections) ─────────── */}
        <Environment preset="night" />

        {/* ── Dim ambient — keeps scene readable in dark mode ─────────── */}
        <ambientLight intensity={0.08} />

        {/* ── Hemisphere sky/ground — very dark industrial ────────────── */}
        <hemisphereLight args={['#1a2a3a', '#0a0d14', 0.3]} />

        {/* ── Cool key directional light — industrial overhead ────────── */}
        <directionalLight
          position={[dto.siteWidth * 0.6, 25, dto.siteDepth * 0.7]}
          intensity={0.9}
          color="#b0c8e8"
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

        {/* ── Dim fill from opposite side ─────────────────────────────── */}
        <directionalLight
          position={[-dto.siteWidth * 0.4, 12, -dto.siteDepth * 0.4]}
          intensity={0.15}
          color="#203040"
        />

        {/* ── Guided tour camera lerp ───────────────────────────────────── */}
        {tourActive && <GuidedTourCamera />}

        {/* ── OrbitControls — auto-rotates until user interacts ─────────── */}
        <OrbitControls
          ref={orbitRef}
          target={[cx, 0, cz]}
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={120}
          maxPolarAngle={Math.PI / 2.05}
          autoRotate={autoRotate}
          autoRotateSpeed={0.4}
          onStart={() => {
            if (!userInteracted) setUserInteracted(true);
          }}
        />

        {/* ── Scene contents wrapped in Bounds for camera fit on load ──── */}
        <SceneContents
            dto={dto}
            locale={locale}
            showFlow={showFlow}
            showSeparation={showSeparation}
            editMode={editMode}
            onStationClick={handleStationClick}
            onStationMove={handleStationMove}
          />

        {/* ── Post-processing: Bloom + Vignette ────────────────────────── */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.35}
            luminanceSmoothing={0.4}
            intensity={1.2}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.35} darkness={0.7} />
        </EffectComposer>
      </Canvas>

      {/* Legend overlay */}
      <Legend locale={locale} dir={dir} />
    </div>
  );
}

// ── SceneContents ─────────────────────────────────────────────────────────────
// Rendered inside <Bounds> so drei can measure the bounding box and fit the
// camera on mount.

interface SceneContentsProps {
  dto: TwinDTO;
  locale: Locale;
  showFlow: boolean;
  showSeparation: boolean;
  editMode: boolean;
  onStationClick: (station: StationDTO) => void;
  onStationMove: (id: string, x: number, z: number) => void;
}

function SceneContents({
  dto,
  locale,
  showFlow,
  showSeparation,
  editMode,
  onStationClick,
  onStationMove,
}: SceneContentsProps) {
  // Fit the camera to the scene on mount only
  // Camera framing is computed analytically in TwinCanvas (manual fix after
  // Bob ran out of Bobcoins: drei <Bounds> over-fitted to walls/ground).

  return (
    <>
      {/* ── Factory floor (dark epoxy, walls, emissive outlines) ──────── */}
      <FactoryFloor widthM={dto.siteWidth} depthM={dto.siteDepth} zones={dto.zones} />

      <PlantProps zones={dto.zones} />

      {/* ── Zones (kept for separation overlay context) ────────────────── */}
      {dto.zones.map((zone) => (
        <ZoneMesh key={zone.id} zone={zone} locale={locale} />
      ))}

      {/* ── Station markers (3x scale equipment models) ────────────────── */}
      {dto.stations.map((station) => (
        <StationMarker
          key={station.id}
          station={station}
          locale={locale}
          editMode={editMode}
          onClick={onStationClick}
          onMove={onStationMove}
        />
      ))}

      {/* ── Flow arrows (emissive bright cyan for bloom glow) ──────────── */}
      {showFlow && <FlowArrows segments={dto.flowSegments} />}

      {/* ── Separation overlay ──────────────────────────────────────────── */}
      {showSeparation && (
        <SeparationOverlay
          issues={dto.separationIssues}
          flowSegments={dto.flowSegments}
          locale={locale}
        />
      )}
    </>
  );
}

