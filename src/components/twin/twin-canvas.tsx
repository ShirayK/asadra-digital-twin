'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  /** Called when the user double-clicks the floor (triggers fit view from parent) */
  onFloorDoubleClick?: () => void;
  /** Ref forwarded in so TwinView can trigger fit/top/focus camera moves */
  cameraActionRef?: React.MutableRefObject<{
    fitView: () => void;
    topView: () => void;
    focusStation: (x: number, z: number, size?: number) => void;
  } | null>;
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
  onFloorDoubleClick,
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

  // ── Compute tight bounding box of all stations + zone extents ─────────────
  // Used by fit-view and top-view to frame the full plant with margin.
  const sceneBounds = useRef<{
    minX: number; maxX: number; minZ: number; maxZ: number;
  } | null>(null);

  if (!sceneBounds.current) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const s of dto.stations) {
      minX = Math.min(minX, s.position.x);
      maxX = Math.max(maxX, s.position.x);
      minZ = Math.min(minZ, s.position.z);
      maxZ = Math.max(maxZ, s.position.z);
    }
    for (const z of dto.zones) {
      minX = Math.min(minX, z.x - z.width / 2);
      maxX = Math.max(maxX, z.x + z.width / 2);
      minZ = Math.min(minZ, z.z - z.depth / 2);
      maxZ = Math.max(maxZ, z.z + z.depth / 2);
    }
    // Fallback: use site extents if no stations/zones
    if (!isFinite(minX)) {
      minX = 0; maxX = dto.siteWidth; minZ = 0; maxZ = dto.siteDepth;
    }
    sceneBounds.current = { minX, maxX, minZ, maxZ };
  }

  const { minX, maxX, minZ, maxZ } = sceneBounds.current;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const sceneW = maxX - minX;
  const sceneD = maxZ - minZ;

  // Camera distance: must frame the larger span, accounting for fov=40 and
  // typical landscape aspect (~1.8). Target ~80% canvas fill → tighter margin.
  const FOV_RAD = (40 * Math.PI) / 180;
  // Fit the wider axis; for a PerspectiveCamera the visible half-extent at
  // distance d = d * tan(fov/2).  We want half-span ≤ visible extent.
  // 0.90 margin fills ~80% of the canvas at 1920×1080.
  const halfSpan = Math.max(sceneW, sceneD) / 2 * 0.72;
  const fitDist = halfSpan / Math.tan(FOV_RAD / 2);
  const camY = fitDist * 0.82;
  const camZ = cz + fitDist * 0.68;

  const [focusAnimating, setFocusAnimating] = useState(false);
  const autoRotate = !userInteracted && !editMode && !tourActive;
  const frameloop: 'always' | 'demand' = editMode || tourActive || autoRotate || focusAnimating ? 'always' : 'demand';

  // ── Fit / Top / Focus camera actions ──────────────────────────────────────
  // We expose these via cameraActionRef so TwinView toolbar buttons can trigger them.
  // The actual implementation lives in CameraActions (inside the Canvas) because
  // it needs access to useThree.
  const fitViewTrigger = useRef(0);
  const topViewTrigger = useRef(0);
  const focusTrigger = useRef<{ x: number; z: number; size?: number } | null>(null);

  if (cameraActionRef) {
    cameraActionRef.current = {
      fitView: () => { fitViewTrigger.current += 1; },
      topView: () => { topViewTrigger.current += 1; },
      focusStation: (x: number, z: number, size = 4.5) => { setUserInteracted(true); focusTrigger.current = { x, z, size }; },
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
    <div style={{ position: 'relative', width: '100%', height: 'clamp(460px, calc(100vh - 210px), 760px)' }}>
      <Canvas
        frameloop={frameloop}
        shadows
        camera={{
          position: [cx, camY, camZ],
          fov: 40,
          near: 0.1,
          far: 1000,
        }}
        style={{ background: '#eef0f6', borderRadius: '12px' }}
        gl={{ antialias: true }}
        onPointerDown={() => {
          if (!userInteracted) setUserInteracted(true);
        }}
      >
        {/* ── Fog — light scene: near-white to match canvas bg ────────────── */}
        <fog attach="fog" args={['#eef0f6', 60, 280]} />

        {/* ── Environment — studio for neutral bright illumination ─────────── */}
        <Environment preset="warehouse" />

        {/* ── Lighting — bright like a clean food-factory with daylight ──────── */}
        {/* Strong ambient: fills shadows without darkness */}
        <ambientLight intensity={0.65} color="#f8f6ff" />
        {/* Hemisphere: warm white sky, cool light floor */}
        <hemisphereLight args={['#ffffff', '#dbd5f5', 0.70]} />
        {/* Key light — daylight white from high angle, casts soft shadows */}
        <directionalLight
          position={[dto.siteWidth * 0.6, 30, dto.siteDepth * 0.7]}
          intensity={1.4}
          color="#ffffff"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={160}
          shadow-camera-left={-dto.siteWidth}
          shadow-camera-right={dto.siteWidth}
          shadow-camera-top={dto.siteDepth}
          shadow-camera-bottom={-dto.siteDepth}
          shadow-bias={-0.0005}
        />
        {/* Fill light — soft purple-white from opposite side */}
        <directionalLight
          position={[-dto.siteWidth * 0.4, 14, -dto.siteDepth * 0.4]}
          intensity={0.55}
          color="#e8e0ff"
        />
        {/* Top bounce light — mimics industrial ceiling panels */}
        <pointLight
          position={[dto.siteWidth * 0.5, 18, dto.siteDepth * 0.5]}
          intensity={0.60}
          color="#f5f3ff"
          distance={dto.siteWidth * 3}
          decay={1.5}
        />

        {/* ── Guided tour ──────────────────────────────────────────────────── */}
        {tourActive && <GuidedTourCamera />}

        {/* ── Cinematic fly-in ─────────────────────────────────────────────── */}
        <CinematicFlyIn end={[cx, camY, camZ]} target={[cx, 0, cz]} />

        {/* ── Camera actions (Fit / Top / Focus) ──────────────────────────── */}
        <CameraActions
          fitTrigger={fitViewTrigger}
          topTrigger={topViewTrigger}
          focusTrigger={focusTrigger}
          sceneW={sceneW}
          sceneD={sceneD}
          cx={cx}
          cz={cz}
          orbitRef={orbitRef}
          onFocusAnimating={setFocusAnimating}
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
          onFloorDoubleClick={() => {
            fitViewTrigger.current += 1;
            onFloorDoubleClick?.();
          }}
        />

        {/* ── Post-processing — minimal bloom, no dark vignette ────────────── */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.88}
            luminanceSmoothing={0.3}
            intensity={0.18}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.55} darkness={0.20} />
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
// Fit: frames the full plant bounding box with correct aspect-ratio math.
// Top: straight-down orthographic-like view of the full plant.

interface CameraActionsProps {
  fitTrigger: React.MutableRefObject<number>;
  topTrigger: React.MutableRefObject<number>;
  focusTrigger: React.MutableRefObject<{ x: number; z: number; size?: number } | null>;
  sceneW: number;
  sceneD: number;
  cx: number;
  cz: number;
  orbitRef: React.RefObject<OrbitControlsImpl>;
  onFocusAnimating?: (v: boolean) => void;
}

function CameraActions({ fitTrigger, topTrigger, focusTrigger, sceneW, sceneD, cx, cz, orbitRef, onFocusAnimating }: CameraActionsProps) {
  const { camera, size } = useThree();
  const lastFit = useRef(0);
  const lastTop = useRef(0);
  const lastFocus = useRef<{ x: number; z: number; size?: number } | null>(null);
  const animTarget = useRef<{ pos: THREE.Vector3; orbitTarget: THREE.Vector3 } | null>(null);
  const orbitAnimTarget = useRef<THREE.Vector3>(new THREE.Vector3(cx, 0, cz));

  const computeFitPos = useCallback((): { pos: THREE.Vector3; orbitTarget: THREE.Vector3 } => {
    // Use actual viewport aspect to ensure both width and depth fit in view
    const aspect = size.width / size.height;
    const FOV_RAD = (40 * Math.PI) / 180;
    // Half-angles for both axes
    const hFovRad = Math.atan(Math.tan(FOV_RAD / 2) * aspect);
    // Distance needed to fill ~80% of canvas — tighter margin than before
    const MARGIN = 1.1;
    const dForWidth = (sceneW / 2 * MARGIN) / Math.tan(hFovRad);
    const dForDepth = (sceneD / 2 * MARGIN * 0.75) / Math.tan(FOV_RAD / 2); // depth is foreshortened at 45°
    const dist = Math.max(dForWidth, dForDepth);
    // 45-degree elevation angle provides good fit view
    const posY = dist * Math.sin(Math.PI / 4);
    const posZOffset = dist * Math.cos(Math.PI / 4);
    return {
      pos: new THREE.Vector3(cx, posY, cz + posZOffset),
      orbitTarget: new THREE.Vector3(cx, 0, cz),
    };
  }, [size, sceneW, sceneD, cx, cz]);

  const computeTopPos = useCallback((): { pos: THREE.Vector3; orbitTarget: THREE.Vector3 } => {
    // Top view: camera directly above the scene center looking straight down.
    // Distance to frame entire plant with margin.
    const aspect = size.width / size.height;
    const FOV_RAD = (40 * Math.PI) / 180;
    const hFovRad = Math.atan(Math.tan(FOV_RAD / 2) * aspect);
    const MARGIN = 1.20;
    const dForWidth = (sceneW / 2 * MARGIN) / Math.tan(hFovRad);
    const dForDepth = (sceneD / 2 * MARGIN * 0.75) / Math.tan(FOV_RAD / 2); // depth is foreshortened at 45°
    const dist = Math.max(dForWidth, dForDepth);
    return {
      pos: new THREE.Vector3(cx, dist, cz),
      orbitTarget: new THREE.Vector3(cx, 0, cz),
    };
  }, [size, sceneW, sceneD, cx, cz]);

  /**
   * Compute a close-up perspective of a station at world position (x, z).
   * Frames the machine so it fills ~60% of canvas height.
   * Camera at 40° elevation, orbit target at the machine center (y=2).
   */
  const computeFocusPos = useCallback((x: number, z: number, size = 4.5): { pos: THREE.Vector3; orbitTarget: THREE.Vector3 } => {
    // Target the machine's mid-height; distance scales with machine size so it fills ~55% of the view.
    const orbitTarget = new THREE.Vector3(x, Math.min(2.5, size * 0.35), z);
    const FOV_RAD = (40 * Math.PI) / 180;
    const dist = Math.max(9, (size * 1.25) / (2 * 0.55 * Math.tan(FOV_RAD / 2)));
    const EL_RAD = (50 * Math.PI) / 180;
    // Approach from the plant centre outward, so the camera sits outside the station and nothing is in between.
    let dx = x - cx, dz = z - cz;
    const len = Math.hypot(dx, dz);
    if (len < 1) { dx = 0; dz = 1; } else { dx /= len; dz /= len; }
    // Blend toward the default front (+z) view so text labels stay readable.
    dx = dx * 0.7; dz = dz * 0.7 + 0.3;
    const l2 = Math.hypot(dx, dz) || 1; dx /= l2; dz /= l2;
    const horiz = dist * Math.cos(EL_RAD);
    return {
      pos: new THREE.Vector3(x + dx * horiz, orbitTarget.y + dist * Math.sin(EL_RAD), z + dz * horiz),
      orbitTarget,
    };
  }, [cx, cz]);

  useFrame(() => {
    // Check for new triggers
    if (fitTrigger.current !== lastFit.current) {
      lastFit.current = fitTrigger.current;
      const { pos, orbitTarget } = computeFitPos();
      animTarget.current = { pos, orbitTarget };
      orbitAnimTarget.current = orbitTarget.clone();
      onFocusAnimating?.(true);
    }
    if (topTrigger.current !== lastTop.current) {
      lastTop.current = topTrigger.current;
      const { pos, orbitTarget } = computeTopPos();
      animTarget.current = { pos, orbitTarget };
      orbitAnimTarget.current = orbitTarget.clone();
      onFocusAnimating?.(true);
    }
    if (focusTrigger.current !== lastFocus.current) {
      lastFocus.current = focusTrigger.current;
      if (focusTrigger.current) {
        const { pos, orbitTarget } = computeFocusPos(focusTrigger.current.x, focusTrigger.current.z, focusTrigger.current.size);
        animTarget.current = { pos, orbitTarget };
        orbitAnimTarget.current = orbitTarget.clone();
        onFocusAnimating?.(true);
      }
    }

    if (!animTarget.current) return;

    camera.position.lerp(animTarget.current.pos, 0.08);

    const dist = camera.position.distanceTo(animTarget.current.pos);
    if (dist < 0.25) {
      camera.position.copy(animTarget.current.pos);
      // Snap the orbit target too, otherwise it stops part-way when the
      // demand frameloop goes idle and the focused station ends up off-centre.
      orbitRef.current?.target.copy(orbitAnimTarget.current);
      orbitRef.current?.update();
      animTarget.current = null;
      onFocusAnimating?.(false);
    }

    if (orbitRef.current) {
      orbitRef.current.target.lerp(orbitAnimTarget.current, 0.08);
      orbitRef.current.update();
    }
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
  /** Called when the user double-clicks the floor — triggers fit view */
  onFloorDoubleClick?: () => void;
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
  onFloorDoubleClick,
}: SceneContentsProps) {
  // Build a set of station IDs that appear in active separation issues.
  // Separation issues reference step IDs, but flow segments carry the resolved
  // {x, z} positions.  Match station positions (±0.01 tolerance) to the
  // segment endpoints to find which stations have a warning.
  const separationStationIds = useMemo(() => {
    if (dto.separationIssues.length === 0) return new Set<string>();

    const issueKeys = new Set(
      dto.separationIssues.flatMap((iss) => [
        `${iss.fromStepId}->${iss.toStepId}`,
      ]),
    );

    const warnPositions: Array<{ x: number; z: number }> = [];
    for (const seg of dto.flowSegments) {
      const key = `${seg.edge.from}->${seg.edge.to}`;
      if (issueKeys.has(key)) {
        warnPositions.push(seg.from, seg.to);
      }
    }

    const result = new Set<string>();
    for (const st of dto.stations) {
      for (const wp of warnPositions) {
        if (
          Math.abs(st.position.x - wp.x) < 0.5 &&
          Math.abs(st.position.z - wp.z) < 0.5
        ) {
          result.add(st.id);
          break;
        }
      }
    }
    return result;
  }, [dto.separationIssues, dto.flowSegments, dto.stations]);

  return (
    <>
      <FactoryFloor
        widthM={dto.siteWidth}
        depthM={dto.siteDepth}
        zones={dto.zones}
        onDoubleClick={onFloorDoubleClick}
      />
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
          hasSeparationWarning={separationStationIds.has(station.id)}
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
