'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
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
import { brand } from '@/theme/asadra';

interface TwinCanvasProps {
  dto: TwinDTO;
  locale: Locale;
  dir?: 'ltr' | 'rtl';
  showFlow?: boolean;
  showSeparation?: boolean;
  editMode?: boolean;
  selectedStationId?: string | null;
  /** When true, the GuidedTourCamera lerp is active (frameloop switches to "always") */
  tourActive?: boolean;
  onStationClick?: (station: StationDTO) => void;
  onStationMove?: (id: string, x: number, z: number) => void;
  /** Ref forwarded in so TwinView can trigger fit/top camera moves */
  cameraActionRef?: React.MutableRefObject<{ fitView: () => void; topView: () => void } | null>;
}

/**
 * Main 3-D scene.
 * Camera: fov 40, far 1000, minDistance 3, maxDistance 300.
 * OrbitControls: damping 0.06, screenSpacePanning, zoomSpeed 1.2.
 * Keyboard: F → fit view, +/= → zoom in, - → zoom out.
 */
export default function TwinCanvas({
  dto,
  locale,
  dir = 'ltr',
  showFlow = true,
  showSeparation = true,
  editMode = false,
  selectedStationId = null,
  tourActive = false,
  onStationClick,
  onStationMove,
  cameraActionRef,
}: TwinCanvasProps) {
  const handleStationClick = useCallback(
    (station: StationDTO) => { onStationClick?.(station); },
    [onStationClick],
  );

  const handleStationMove = useCallback(
    (id: string, x: number, z: number) => { onStationMove?.(id, x, z); },
    [onStationMove],
  );

  const [userInteracted, setUserInteracted] = useState(false);
  const orbitRef = useRef<OrbitControlsImpl>(null);

  // Analytical camera framing
  const cx = dto.siteWidth / 2;
  const cz = dto.siteDepth / 2;
  const plantSpan = Math.max(dto.siteWidth, dto.siteDepth);
  const fitDist = (plantSpan / 2) / Math.tan((20 * Math.PI) / 180) * 0.62;
  const camY = fitDist * 0.85;
  const camZ = cz + fitDist * 0.75;

  const autoRotate = !userInteracted && !editMode && !tourActive;
  const frameloop: 'always' | 'demand' = editMode || tourActive || autoRotate ? 'always' : 'demand';

  // ── Fit / Top camera actions ───────────────────────────────────────────────
  // We expose these via cameraActionRef so TwinView toolbar buttons can trigger them.
  // The actual implementation lives in CameraActions (inside the Canvas) because
  // it needs access to useThree.
  const fitViewTrigger = useRef(0);
  const topViewTrigger = useRef(0);

  if (cameraActionRef) {
    cameraActionRef.current = {
      fitView: () => { fitViewTrigger.current += 1; },
      topView: () => { topViewTrigger.current += 1; },
    };
  }

  // Keyboard shortcuts: F = fit, +/= = zoom in, - = zoom out
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when focused on a text input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'f' || e.key === 'F') {
        fitViewTrigger.current += 1;
      } else if (e.key === '+' || e.key === '=') {
        orbitRef.current?.dollyIn?.(1.15);
        orbitRef.current?.update?.();
      } else if (e.key === '-') {
        orbitRef.current?.dollyOut?.(1.15);
        orbitRef.current?.update?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '700px' }}>
      <Canvas
        frameloop={frameloop}
        shadows
        camera={{
          position: [cx, camY, camZ],
          fov: 40,
          near: 0.1,
          far: 1000,
        }}
        style={{ background: '#0b0a14', borderRadius: '12px' }}
        gl={{ antialias: true }}
        onPointerDown={() => {
          if (!userInteracted) setUserInteracted(true);
        }}
      >
        {/* ── Fog ────────────────────────────────────────────────────────── */}
        <fog attach="fog" args={['#0b0a14', 40, 220]} />

        {/* ── Environment ─────────────────────────────────────────────────── */}
        <Environment preset="night" />

        {/* ── Lighting ────────────────────────────────────────────────────── */}
        <ambientLight intensity={0.07} />
        <hemisphereLight args={['#1a1030', '#0a0810', 0.28]} />
        <directionalLight
          position={[dto.siteWidth * 0.6, 25, dto.siteDepth * 0.7]}
          intensity={0.85}
          color="#cbb8f0"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={140}
          shadow-camera-left={-dto.siteWidth}
          shadow-camera-right={dto.siteWidth}
          shadow-camera-top={dto.siteDepth}
          shadow-camera-bottom={-dto.siteDepth}
          shadow-bias={-0.0005}
        />
        <directionalLight
          position={[-dto.siteWidth * 0.4, 12, -dto.siteDepth * 0.4]}
          intensity={0.12}
          color="#241250"
        />

        {/* ── Guided tour ──────────────────────────────────────────────────── */}
        {tourActive && <GuidedTourCamera />}

        {/* ── Cinematic fly-in ─────────────────────────────────────────────── */}
        <CinematicFlyIn end={[cx, camY, camZ]} target={[cx, 0, cz]} />

        {/* ── Camera actions (Fit / Top) ───────────────────────────────────── */}
        <CameraActions
          fitTrigger={fitViewTrigger}
          topTrigger={topViewTrigger}
          fitPos={[cx, camY, camZ]}
          target={[cx, 0, cz]}
          orbitRef={orbitRef}
        />

        {/* ── OrbitControls ────────────────────────────────────────────────── */}
        <OrbitControls
          ref={orbitRef}
          target={[cx, 0, cz]}
          enableDamping
          dampingFactor={0.06}
          minDistance={3}
          maxDistance={300}
          zoomSpeed={1.2}
          screenSpacePanning
          maxPolarAngle={Math.PI / 2.05}
          autoRotate={autoRotate}
          autoRotateSpeed={0.4}
          onStart={() => {
            if (!userInteracted) setUserInteracted(true);
          }}
        />

        {/* ── Scene ────────────────────────────────────────────────────────── */}
        <SceneContents
          dto={dto}
          locale={locale}
          showFlow={showFlow}
          showSeparation={showSeparation}
          editMode={editMode}
          selectedStationId={selectedStationId}
          onStationClick={handleStationClick}
          onStationMove={handleStationMove}
        />

        {/* ── Post-processing ──────────────────────────────────────────────── */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.35}
            luminanceSmoothing={0.4}
            intensity={1.1}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.35} darkness={0.65} />
        </EffectComposer>
      </Canvas>

      {/* Legend overlay */}
      <Legend locale={locale} dir={dir} />
    </div>
  );
}

// ── CameraActions ─────────────────────────────────────────────────────────────
// Runs inside the Canvas, has access to useThree.
// Smoothly animates camera to fit or top view when triggered.

interface CameraActionsProps {
  fitTrigger: React.MutableRefObject<number>;
  topTrigger: React.MutableRefObject<number>;
  fitPos: [number, number, number];
  target: [number, number, number];
  orbitRef: React.RefObject<OrbitControlsImpl>;
}

function CameraActions({ fitTrigger, topTrigger, fitPos, target, orbitRef }: CameraActionsProps) {
  const { camera } = useThree();
  const lastFit = useRef(0);
  const lastTop = useRef(0);
  const animTarget = useRef<[number, number, number] | null>(null);

  useFrame(() => {
    // Check for new triggers
    if (fitTrigger.current !== lastFit.current) {
      lastFit.current = fitTrigger.current;
      animTarget.current = fitPos;
    }
    if (topTrigger.current !== lastTop.current) {
      lastTop.current = topTrigger.current;
      // Top view: directly above the center
      animTarget.current = [target[0], Math.max(fitPos[1] * 1.5, 40), target[2]];
    }

    if (!animTarget.current) return;

    const dest = animTarget.current;
    const destVec = new THREE.Vector3(dest[0], dest[1], dest[2]);
    camera.position.lerp(destVec, 0.08);

    const dist = camera.position.distanceTo(destVec);

    if (dist < 0.5) {
      camera.position.set(...dest);
      animTarget.current = null;
    }

    // Keep orbit controls target synced
    orbitRef.current?.update?.();
  });

  return null;
}

// ── SceneContents ─────────────────────────────────────────────────────────────

interface SceneContentsProps {
  dto: TwinDTO;
  locale: Locale;
  showFlow: boolean;
  showSeparation: boolean;
  editMode: boolean;
  selectedStationId: string | null;
  onStationClick: (station: StationDTO) => void;
  onStationMove: (id: string, x: number, z: number) => void;
}

function SceneContents({
  dto,
  locale,
  showFlow,
  showSeparation,
  editMode,
  selectedStationId,
  onStationClick,
  onStationMove,
}: SceneContentsProps) {
  return (
    <>
      <FactoryFloor widthM={dto.siteWidth} depthM={dto.siteDepth} zones={dto.zones} />
      <PlantProps zones={dto.zones} />

      {dto.zones.map((zone) => (
        <ZoneMesh key={zone.id} zone={zone} locale={locale} />
      ))}

      {dto.stations.map((station) => (
        <StationMarker
          key={station.id}
          station={station}
          locale={locale}
          editMode={editMode}
          selected={station.id === selectedStationId}
          onClick={onStationClick}
          onMove={onStationMove}
        />
      ))}

      {showFlow && <FlowArrows segments={dto.flowSegments} />}

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

/**
 * Cinematic 3s fly-in on load.
 */
function CinematicFlyIn({ end, target }: { end: [number, number, number]; target: [number, number, number] }) {
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const DURATION = 3;
  useFrame(({ clock }) => {
    if (done.current) return;
    if (start.current === null) start.current = clock.elapsedTime;
    const t = Math.min((clock.elapsedTime - start.current) / DURATION, 1);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const dx = end[0] - target[0];
    const dz = end[2] - target[2];
    const r0 = Math.hypot(dx, dz);
    const a0 = Math.atan2(dx, dz);
    const ang = a0 - (1 - e) * 1.4;
    const r = r0 * (1 + (1 - e) * 1.2);
    const y = end[1] * (1 + (1 - e) * 1.6);
    camera.position.set(target[0] + Math.sin(ang) * r, y, target[2] + Math.cos(ang) * r);
    camera.lookAt(target[0], target[1], target[2]);
    if (t >= 1) done.current = true;
  });
  return null;
}
