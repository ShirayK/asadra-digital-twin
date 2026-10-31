'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { TwinDTO, StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary, locales } from '@/i18n';
import { loadOverlay, saveOverlay, clearOverlay } from '@/adapters/local-overlay';
import type { LayoutOverlay } from '@/adapters/local-overlay';
import { TwinDatasetSchema } from '@/domain/schema';
import { getStationStatus } from '@/domain/status';
import { buildFlowPaths } from '@/domain/flow';
import { findSeparationIssues } from '@/domain/separation';
import {
  initSimulatorState,
  tickSimulator,
  applyCorrectiveAction,
  TICK_MS,
  COOLING_STATION_ID,
  COOLING_LIMIT,
} from '@/domain/simulator';
import type { SimulatorState } from '@/domain/simulator';
import SidePanel from './side-panel';
import TwinToolbar from './twin-toolbar';
import GuidedTourCard, { setTourTarget } from './guided-tour';

// Load the 3-D canvas only on the client (no SSR) — Prompt 5 implementation
const TwinCanvas = dynamic(() => import('./twin-canvas'), { ssr: false });

interface TwinViewProps {
  dto: TwinDTO;
  locale: Locale;
}

/**
 * Client component that receives the precomputed DTO from the server and
 * orchestrates the twin UI: status summary, toolbar, 3-D canvas, and issues list.
 * Prompt 8: edit mode — drag stations, Reset, Export, Import with local-overlay.
 */
export default function TwinView({ dto: baseDto, locale }: TwinViewProps) {
  const t = getDictionary(locale);
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  const [selectedStation, setSelectedStation] = useState<StationDTO | null>(null);
  const [showFlow, setShowFlow] = useState(true);
  const [showSeparation, setShowSeparation] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Guided tour state (Prompt 9)
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

  // Live DTO that may be updated by overlay or import
  const [liveDto, setLiveDto] = useState<TwinDTO>(baseDto);

  // ── Simulator state (Session 14) ─────────────────────────────────────────
  const [liveMode, setLiveMode] = useState(false);
  const [simState, setSimState] = useState<SimulatorState | null>(null);
  const [breachToast, setBreachToast] = useState<string | null>(null);
  // Ref to track whether breach toast has been shown for the current drift cycle
  const breachShownRef = useRef(false);
  // Stable ref to latest simState for use in interval callback
  const simStateRef = useRef<SimulatorState | null>(null);
  simStateRef.current = simState;

  // Keep camera lerp target in sync with the active tour step
  useEffect(() => {
    if (tourActive && liveDto.tourSteps.length > 0) {
      setTourTarget(liveDto.tourSteps[tourIndex]?.position ?? null);
    } else {
      setTourTarget(null);
    }
  }, [tourActive, tourIndex, liveDto.tourSteps]);

  // Load saved overlay on mount and apply it
  useEffect(() => {
    const overlay = loadOverlay();
    if (Object.keys(overlay.stationPositions).length > 0) {
      setLiveDto(applyOverlayToDto(baseDto, overlay));
    }
  }, [baseDto]);

  // Listen for import events dispatched by the toolbar's file input
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      setImportError(null);
      try {
        const parsed = JSON.parse(text);
        const result = TwinDatasetSchema.safeParse(parsed);
        if (!result.success) {
          setImportError(result.error.errors.map((e) => e.message).join('; '));
          return;
        }
        const dataset = result.data;
        const now = new Date();
        // Recompute all derived data from imported dataset
        const readingsByStation = new Map<string, typeof dataset.readings>();
        for (const reading of dataset.readings) {
          const list = readingsByStation.get(reading.stationId) ?? [];
          list.push(reading);
          readingsByStation.set(reading.stationId, list);
        }
        for (const [id, list] of readingsByStation) {
          readingsByStation.set(id, list.slice().sort(
            (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
          ));
        }
        const stations: StationDTO[] = dataset.stations.map((s) => {
          const readings = readingsByStation.get(s.id) ?? [];
          return {
            id: s.id,
            name: s.name,
            nameEn: s.nameEn,
            controlType: s.controlType,
            position: s.position,
            zoneId: s.zoneId,
            fields: s.fields,
            status: getStationStatus(s, readings[0] ?? null, now),
            lastReadings: readings.slice(0, 5),
          };
        });
        // Rebuild tour steps from the imported dataset
        const importedStationMap = new Map(dataset.stations.map((s) => [s.id, s]));
        const importedTourSteps = dataset.process.steps
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((step) => {
            const st = step.stationId ? importedStationMap.get(step.stationId) : undefined;
            const pos = st
              ? { x: st.position.x, z: st.position.z }
              : (step.position ?? { x: dataset.site.widthM / 2, z: dataset.site.depthM / 2 });
            return {
              id: step.id,
              name: step.name,
              type: step.type,
              sortOrder: step.sortOrder,
              position: pos,
              fields: st?.fields ?? [],
              controlType: st?.controlType,
            };
          });
        const newDto: TwinDTO = {
          siteName: dataset.site.name,
          siteWidth: dataset.site.widthM,
          siteDepth: dataset.site.depthM,
          zones: dataset.zones,
          stations,
          flowSegments: buildFlowPaths(dataset),
          separationIssues: findSeparationIssues(dataset),
          chainResult: liveDto.chainResult, // keep existing chain result (async, not recomputed client-side)
          tourSteps: importedTourSteps,
        };
        // Clear overlay since imported dataset has explicit positions
        clearOverlay();
        setLiveDto(newDto);
      } catch {
        setImportError('Invalid JSON file');
      }
    };
    window.addEventListener('twin-import', handler);
    return () => window.removeEventListener('twin-import', handler);
  }, [liveDto.chainResult]);

  // ── Simulator tick effect (Session 14) ───────────────────────────────────
  useEffect(() => {
    if (!liveMode) return;

    // On first activation, initialise from baseDto dataset
    if (!simStateRef.current) {
      const stations = baseDto.stations.map((s) => ({
        id: s.id,
        name: s.name,
        controlType: s.controlType,
        position: s.position,
        zoneId: s.zoneId,
        fields: s.fields,
      }));
      const allReadings = baseDto.stations.flatMap((s) => s.lastReadings);
      const initial = initSimulatorState({ stations, seedReadings: allReadings });
      setSimState(initial);
      simStateRef.current = initial;
    }

    const intervalId = setInterval(() => {
      const prev = simStateRef.current;
      if (!prev) return;

      const stations = baseDto.stations.map((s) => ({
        id: s.id,
        name: s.name,
        controlType: s.controlType,
        position: s.position,
        zoneId: s.zoneId,
        fields: s.fields,
      }));
      const next = tickSimulator(prev, { stations, seedReadings: [] });
      setSimState(next);

      // Show breach toast once per drift-up cycle
      if (next.coolingBreaching && !breachShownRef.current) {
        breachShownRef.current = true;
        const temp = next.coolingTemp.toFixed(1);
        const coolingStation = baseDto.stations.find((s) => s.id === COOLING_STATION_ID);
        const limitLabel = coolingStation?.fields.find((f) => f.key === 'temp')?.max ?? COOLING_LIMIT;
        setBreachToast(`CCP breach: Cooling ${temp}°C > ${limitLabel}°C`);
      }
      if (!next.coolingBreaching) {
        breachShownRef.current = false;
      }

      // Rebuild liveDto with simulated readings
      const now = new Date();
      const updatedStations: StationDTO[] = baseDto.stations.map((s) => {
        const simReadings = (next.readings.get(s.id) ?? []).slice(0, 5);
        const station = {
          id: s.id,
          name: s.name,
          controlType: s.controlType,
          position: s.position,
          zoneId: s.zoneId,
          fields: s.fields,
        };
        return {
          ...s,
          status: getStationStatus(station, simReadings[0] ?? null, now),
          lastReadings: simReadings,
        };
      });
      setLiveDto((prev) => ({ ...prev, stations: updatedStations }));
    }, TICK_MS);

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode, baseDto]);

  const handleToggleLive = useCallback(() => {
    setLiveMode((v) => {
      if (v) {
        // Pausing — reset sim state so next activation re-initialises
        setSimState(null);
        simStateRef.current = null;
        breachShownRef.current = false;
        setBreachToast(null);
        // Restore base dto
        const overlay = loadOverlay();
        setLiveDto(
          Object.keys(overlay.stationPositions).length > 0
            ? applyOverlayToDto(baseDto, overlay)
            : baseDto,
        );
      }
      return !v;
    });
  }, [baseDto]);

  const handleCorrectiveAction = useCallback(() => {
    setBreachToast(null);
    setSimState((prev) => {
      if (!prev) return prev;
      const fixed = applyCorrectiveAction(prev);
      breachShownRef.current = false;
      // Immediately update liveDto so the station goes green
      const now = new Date();
      const updatedStations: StationDTO[] = baseDto.stations.map((s) => {
        const simReadings = (fixed.readings.get(s.id) ?? []).slice(0, 5);
        const station = {
          id: s.id,
          name: s.name,
          controlType: s.controlType,
          position: s.position,
          zoneId: s.zoneId,
          fields: s.fields,
        };
        return {
          ...s,
          status: getStationStatus(station, simReadings[0] ?? null, now),
          lastReadings: simReadings,
        };
      });
      setLiveDto((prev) => ({ ...prev, stations: updatedStations }));
      return fixed;
    });
  }, [baseDto]);

  const handleStationClick = useCallback(
    (station: StationDTO) => {
      if (!tourActive) setSelectedStation((prev) => (prev?.id === station.id ? null : station));
    },
    [tourActive],
  );

  const startTour = useCallback(() => {
    setTourActive(true);
    setTourIndex(0);
    setSelectedStation(null);
    setEditMode(false);
  }, []);

  const exitTour = useCallback(() => {
    setTourActive(false);
    setTourTarget(null);
  }, []);

  const tourNext = useCallback(() => {
    setTourIndex((i) => Math.min(i + 1, liveDto.tourSteps.length - 1));
  }, [liveDto.tourSteps.length]);

  const tourPrev = useCallback(() => {
    setTourIndex((i) => Math.max(i - 1, 0));
  }, []);

  /** Called by StationMarker when a drag completes in edit mode */
  const handleStationMove = useCallback(
    (id: string, x: number, z: number) => {
      const overlay = loadOverlay();
      overlay.stationPositions[id] = { x, z };
      saveOverlay(overlay);
      // Update liveDto with new position and recompute separation/flow
      const updatedDto = applyOverlayToDto(baseDto, overlay);
      setLiveDto(updatedDto);
    },
    [baseDto],
  );

  const handleReset = useCallback(() => {
    clearOverlay();
    setLiveDto(baseDto);
    setImportError(null);
  }, [baseDto]);

  const handleExport = useCallback(() => {
    // Build a full TwinDataset by merging overlay into a base dataset shape
    // We reconstruct a minimal exportable TwinDataset from liveDto + baseDto
    const overlay = loadOverlay();
    // We need the raw dataset — reconstruct station positions from liveDto
    const exportData = {
      schemaVersion: 1,
      source: { kind: 'manual', exportedAt: new Date().toISOString() },
      site: {
        id: 'hummus-plant',
        name: liveDto.siteName,
        widthM: liveDto.siteWidth,
        depthM: liveDto.siteDepth,
      },
      allergens: [],
      zones: liveDto.zones,
      stations: liveDto.stations.map((s) => ({
        id: s.id,
        name: s.name,
        controlType: s.controlType,
        position: s.position,
        zoneId: s.zoneId,
        fields: s.fields,
      })),
      process: { id: 'exported', name: 'exported', steps: [], edges: [] },
      readings: liveDto.stations.flatMap((s) => s.lastReadings),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twin-layout-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [liveDto]);

  const handleImport = useCallback(() => {
    // Actual import is handled by the file input in TwinToolbar via 'twin-import' event
    setImportError(null);
  }, []);

  const issueCount = liveDto.separationIssues.length;

  return (
    <>
      {/* ── Side panel (Prompt 6) ───────────────────────────────────────────── */}
      <SidePanel
        station={selectedStation}
        locale={locale}
        dir={dir}
        onClose={() => setSelectedStation(null)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* ── Toolbar (Prompt 7 + 8 + 9) ────────────────────────────────── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', direction: dir }}>
          <TwinToolbar
            locale={locale}
            dir={dir}
            showFlow={showFlow}
            showSeparation={showSeparation}
            issueCount={issueCount}
            editMode={editMode}
            liveMode={liveMode}
            onToggleFlow={() => setShowFlow((v) => !v)}
            onToggleSeparation={() => setShowSeparation((v) => !v)}
            onToggleEdit={() => {
              setEditMode((v) => !v);
              setSelectedStation(null);
            }}
            onToggleLive={handleToggleLive}
            onReset={handleReset}
            onExport={handleExport}
            onImport={handleImport}
          />

          {/* Separator */}
          <span style={{ width: '1px', height: '1.5rem', background: '#e5e7eb' }} />

          {/* Guided tour button (Prompt 9) */}
          {!tourActive ? (
            <button
              onClick={startTour}
              disabled={liveDto.tourSteps.length === 0}
              style={{
                padding: '0.3rem 0.9rem',
                borderRadius: '4px',
                border: '2px solid #22c55e',
                background: '#f7f8fa',
                color: '#166534',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: liveDto.tourSteps.length === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                opacity: liveDto.tourSteps.length === 0 ? 0.4 : 1,
              }}
            >
              🎓 {t.tour.start}
            </button>
          ) : (
            <button
              onClick={exitTour}
              style={{
                padding: '0.3rem 0.9rem',
                borderRadius: '4px',
                border: '2px solid #22c55e',
                background: '#22c55e',
                color: '#fff',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              🎓 {t.tour.exit}
            </button>
          )}

          {/* Separator */}
          <span style={{ width: '1px', height: '1.5rem', background: '#e5e7eb' }} />

          {/* Language switcher (Prompt 10) */}
          <div
            style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', fontSize: '0.8rem' }}
            aria-label={t.nav.language}
          >
            {locales.map((l) => (
              <Link
                key={l}
                href={`/${l}/twin`}
                style={{
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: l === locale ? 'var(--color-accent, #3b82d4)' : '#e5e7eb',
                  background: l === locale ? 'var(--color-accent, #3b82d4)' : '#f7f8fa',
                  color: l === locale ? '#fff' : '#1f2328',
                  fontWeight: l === locale ? 700 : 400,
                  textDecoration: 'none',
                }}
              >
                {l === 'he' ? 'עב' : 'EN'}
              </Link>
            ))}
          </div>
        </div>

        {/* Edit mode banner */}
        {editMode && (
          <div
            style={{
              padding: '0.4rem 0.75rem',
              background: '#f3f0ff',
              border: '1px solid #7c5cd8',
              borderRadius: '4px',
              fontSize: '0.85rem',
              color: '#4c1d95',
              direction: dir,
            }}
          >
            {t.twin.editModeBanner}
          </div>
        )}

        {/* ── Breach toast (Session 14) ──────────────────────────────────── */}
        {breachToast && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 1rem',
              background: '#fef2f2',
              border: '2px solid #ef4444',
              borderRadius: '6px',
              fontSize: '0.9rem',
              color: '#b91c1c',
              fontWeight: 600,
              animation: 'pulse 1s infinite',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🚨</span>
            <span style={{ flex: 1 }}>{breachToast}</span>
            <button
              onClick={handleCorrectiveAction}
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: '4px',
                border: '2px solid #ef4444',
                background: '#ef4444',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✓ Apply corrective action
            </button>
            <button
              onClick={() => setBreachToast(null)}
              aria-label="Dismiss"
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid #fca5a5',
                background: 'transparent',
                color: '#b91c1c',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Import error */}
        {importError && (
          <div
            style={{
              padding: '0.4rem 0.75rem',
              background: '#fef2f2',
              border: '1px solid #ef4444',
              borderRadius: '4px',
              fontSize: '0.85rem',
              color: '#b91c1c',
              direction: dir,
            }}
          >
            {t.twin.importError}: {importError}
          </div>
        )}

        {/* ── Status summary bar ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            fontSize: '0.875rem',
            direction: dir,
          }}
        >
          {liveDto.stations.map((station) => {
            const displayName = locale === 'en' && station.nameEn ? station.nameEn : station.name;
            return (
              <button
                key={station.id}
                onClick={() => !editMode && handleStationClick(station)}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  background: statusColor(station.status),
                  color: '#fff',
                  fontWeight: 500,
                  border: selectedStation?.id === station.id ? '2px solid #fff' : '2px solid transparent',
                  cursor: editMode ? 'default' : 'pointer',
                }}
                title={`${displayName} — ${t.status[station.status as keyof typeof t.status]}`}
              >
                {displayName}
              </button>
            );
          })}
        </div>

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {liveDto.stations.length === 0 && liveDto.zones.length === 0 && (
          <div
            data-testid="empty-state"
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#57606a',
              fontSize: '1rem',
              border: '1px dashed #e5e7eb',
              borderRadius: '8px',
              direction: dir,
            }}
          >
            {t.twin.emptyState}
          </div>
        )}

        {/* ── 3-D Canvas + guided tour overlay ──────────────────────────── */}
        <div style={{ position: 'relative' }}>
          <TwinCanvas
            dto={liveDto}
            locale={locale}
            dir={dir}
            showFlow={showFlow}
            showSeparation={showSeparation}
            editMode={editMode && !tourActive}
            tourActive={tourActive}
            onStationClick={handleStationClick}
            onStationMove={handleStationMove}
          />

          {/* Guided tour card overlay (Prompt 9) */}
          {tourActive && liveDto.tourSteps.length > 0 && (
            <GuidedTourCard
              steps={liveDto.tourSteps}
              currentIndex={tourIndex}
              locale={locale}
              dir={dir}
              onNext={tourNext}
              onPrev={tourPrev}
              onExit={exitTour}
            />
          )}
        </div>

        {/* ── Info row: issues + chain ───────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            fontSize: '0.875rem',
            alignItems: 'center',
            direction: dir,
          }}
        >
          {/* Separation issues badge */}
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              background: issueCount > 0 ? '#ef4444' : '#22c55e',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            {issueCount > 0
              ? `${issueCount} ${t.twin.issues}`
              : t.twin.noIssues}
          </span>

          {/* Flow segment count */}
          <span style={{ color: '#57606a' }}>
            {liveDto.flowSegments.length} {t.twin.flowSegments}
          </span>

          {/* Chain verification */}
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              background: liveDto.chainResult.valid ? '#22c55e' : '#f59e0b',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            {liveDto.chainResult.valid ? t.twin.chainVerified : t.twin.chainInvalid}
          </span>
        </div>

        {/* ── Separation issues list ─────────────────────────────────────── */}
        {issueCount > 0 && (
          <ul
            style={{
              margin: 0,
              padding: dir === 'rtl' ? '0 1.25rem 0 0' : '0 0 0 1.25rem',
              fontSize: '0.875rem',
              color: '#b91c1c',
              direction: dir,
            }}
          >
            {liveDto.separationIssues.map((issue, i) => (
              <li key={i}>
                {t.separation[issue.kind as keyof typeof t.separation]}
                {issue.allergenCode ? ` (${issue.allergenCode})` : ''}
                {' — '}
                {issue.fromStepId} → {issue.toStepId}
              </li>
            ))}
          </ul>
        )}

      </div>
    </>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case 'OK':
      return '#22c55e';
    case 'OUT_OF_RANGE':
      return '#ef4444';
    case 'STALE':
      return '#f59e0b';
    case 'NO_DATA':
    default:
      return '#94a3b8';
  }
}

/**
 * Applies a layout overlay to a DTO — updates station positions and
 * recomputes separation issues based on new positions.
 * Readings are never touched (append-only constraint).
 */
function applyOverlayToDto(base: TwinDTO, overlay: LayoutOverlay): TwinDTO {
  const updatedStations = base.stations.map((s) => {
    const override = overlay.stationPositions[s.id];
    if (!override) return s;
    return { ...s, position: { ...s.position, ...override } };
  });

  // Recompute flow and separation with updated positions.
  // We need a full TwinDataset shape — the domain functions only use
  // zones, stations, process (steps/edges), and allergens.
  // schemaVersion / source / site / readings are required by the Zod type
  // but not accessed by buildFlowPaths / findSeparationIssues.
  // Using `as unknown as TwinDataset` is safe here because the domain
  // functions do not read the fields we omit. Type inference cannot narrow
  // a partial object literal to TwinDataset without this cast.
  const minimalDataset = {
    schemaVersion: 1 as const,
    source: { kind: 'seed' as const },
    site: { id: '', name: '', widthM: base.siteWidth, depthM: base.siteDepth },
    allergens: [],
    zones: base.zones,
    stations: updatedStations.map((s) => ({
      id: s.id,
      name: s.name,
      controlType: s.controlType,
      position: s.position,
      zoneId: s.zoneId,
      fields: s.fields,
    })),
    process: {
      id: 'live',
      name: 'live',
      steps: [],
      edges: [],
    },
    readings: [],
  } as unknown as import('@/domain/schema').TwinDataset;

  return {
    ...base,
    stations: updatedStations,
    flowSegments: buildFlowPaths(minimalDataset),
    separationIssues: findSeparationIssues(minimalDataset),
  };
}
