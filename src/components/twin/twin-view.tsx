'use client';

import { resolveModelType } from './equipment-models';
/** Approximate bounding size (m) of each machine, used to scale focus distance. */
const FOCUS_SIZE: Record<string, number> = { chiller: 7, 'cooking-kettle': 6.5, 'stone-mill': 5, 'soaking-tank': 5.5, 'receiving-dock': 5.5, packaging: 5, 'metal-detector': 4 };
import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { TwinDTO, StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';
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
import { brand, stationStatus as statusPalette, radius, status as themeStatus } from '@/theme/asadra';

const TwinCanvas = dynamic(() => import('./twin-canvas'), { ssr: false });

interface TwinViewProps {
  dto: TwinDTO;
  locale: Locale;
}

/** Max toasts shown simultaneously */
const MAX_TOASTS = 3;

interface Toast {
  id: number;
  message: string;
  kind: 'breach' | 'info' | 'error';
  onAction?: () => void;
  actionLabel?: string;
}

/**
 * Client component: orchestrates twin UI.
 * ToastStack replaces the old inline breach banner.
 * Brand purple glass theme throughout.
 */
export default function TwinView({ dto: baseDto, locale }: TwinViewProps) {
  const t = getDictionary(locale);
  const dir = 'ltr' as const;

  const [selectedStation, setSelectedStation] = useState<StationDTO | null>(null);
  const [showFlow, setShowFlow] = useState(true);
  const [showSeparation, setShowSeparation] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Guided tour
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

  // Live DTO
  const [liveDto, setLiveDto] = useState<TwinDTO>(baseDto);

  // Simulator
  const [liveMode, setLiveMode] = useState(true);
  const [simState, setSimState] = useState<SimulatorState | null>(null);
  const breachShownRef = useRef(false);
  const simStateRef = useRef<SimulatorState | null>(null);
  simStateRef.current = simState;

  // Camera actions ref — wired to TwinCanvas
  const cameraActionRef = useRef<{
    fitView: () => void;
    topView: () => void;
    focusStation: (x: number, z: number, size?: number) => void;
  } | null>(null);

  // True when camera has been focused on a specific station (shows "Back to overview")
  const [stationFocused, setStationFocused] = useState(false);

  // ── Toast helpers ────────────────────────────────────────────────────────────
  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    setToasts((prev) => {
      const next = [...prev, { ...toast, id: ++toastId.current }];
      return next.slice(-MAX_TOASTS);
    });
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Tour sync ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tourActive && liveDto.tourSteps.length > 0) {
      setTourTarget(liveDto.tourSteps[tourIndex]?.position ?? null);
    } else {
      setTourTarget(null);
    }
  }, [tourActive, tourIndex, liveDto.tourSteps]);

  // ── Load saved overlay on mount ──────────────────────────────────────────────
  useEffect(() => {
    const overlay = loadOverlay();
    if (Object.keys(overlay.stationPositions).length > 0) {
      setLiveDto(applyOverlayToDto(baseDto, overlay));
    }
  }, [baseDto]);

  // ── Import handler ───────────────────────────────────────────────────────────
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
          chainResult: liveDto.chainResult,
          tourSteps: importedTourSteps,
        };
        clearOverlay();
        setLiveDto(newDto);
      } catch {
        setImportError('Invalid JSON file');
      }
    };
    window.addEventListener('twin-import', handler);
    return () => window.removeEventListener('twin-import', handler);
  }, [liveDto.chainResult]);

  // ── Simulator tick ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!liveMode) return;

    if (!simStateRef.current) {
      const stations = baseDto.stations.map((s) => ({
        id: s.id, name: s.name, controlType: s.controlType,
        position: s.position, zoneId: s.zoneId, fields: s.fields,
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
        id: s.id, name: s.name, controlType: s.controlType,
        position: s.position, zoneId: s.zoneId, fields: s.fields,
      }));
      const next = tickSimulator(prev, { stations, seedReadings: [] });
      setSimState(next);

      if (next.coolingBreaching && !breachShownRef.current) {
        breachShownRef.current = true;
        const temp = next.coolingTemp.toFixed(1);
        const coolingStation = baseDto.stations.find((s) => s.id === COOLING_STATION_ID);
        const limitLabel = coolingStation?.fields.find((f) => f.key === 'temp')?.max ?? COOLING_LIMIT;
        pushToast({
          kind: 'breach',
          message: `CCP breach: Cooling ${temp}°C > ${limitLabel}°C`,
        });
      }
      if (!next.coolingBreaching) {
        breachShownRef.current = false;
      }

      const now = new Date();
      const updatedStations: StationDTO[] = baseDto.stations.map((s) => {
        const simReadings = (next.readings.get(s.id) ?? []).slice(0, 5);
        const station = {
          id: s.id, name: s.name, controlType: s.controlType,
          position: s.position, zoneId: s.zoneId, fields: s.fields,
        };
        return {
          ...s,
          status: next.staleStationId === s.id ? 'STALE' : getStationStatus(station, simReadings[0] ?? null, now),
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
        setSimState(null);
        simStateRef.current = null;
        breachShownRef.current = false;
        setToasts([]);
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

  const handleCorrectiveAction = useCallback((toastId: number) => {
    dismissToast(toastId);
    setSimState((prev) => {
      if (!prev) return prev;
      const fixed = applyCorrectiveAction(prev);
      breachShownRef.current = false;
      const now = new Date();
      const updatedStations: StationDTO[] = baseDto.stations.map((s) => {
        const simReadings = (fixed.readings.get(s.id) ?? []).slice(0, 5);
        const station = {
          id: s.id, name: s.name, controlType: s.controlType,
          position: s.position, zoneId: s.zoneId, fields: s.fields,
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
  }, [baseDto, dismissToast]);

  const handleStationClick = useCallback(
    (station: StationDTO) => {
      if (!tourActive) {
        setSelectedStation((prev) => (prev?.id === station.id ? null : station));
        // Animate camera to focus on the clicked station
        cameraActionRef.current?.focusStation(station.position.x, station.position.z, FOCUS_SIZE[resolveModelType(station.id, station.nameEn ?? station.name)] ?? 4.5);
        setStationFocused(true);
      }
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

  const handleStationMove = useCallback(
    (id: string, x: number, z: number) => {
      const overlay = loadOverlay();
      overlay.stationPositions[id] = { x, z };
      saveOverlay(overlay);
      setLiveDto(applyOverlayToDto(baseDto, overlay));
    },
    [baseDto],
  );

  const handleReset = useCallback(() => {
    clearOverlay();
    setLiveDto(baseDto);
    setImportError(null);
  }, [baseDto]);

  const handleExport = useCallback(() => {
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
        id: s.id, name: s.name, controlType: s.controlType,
        position: s.position, zoneId: s.zoneId, fields: s.fields,
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

  const handleImport = useCallback(() => { setImportError(null); }, []);

  const issueCount = liveDto.separationIssues.length;

  // Panel presence affects ToastStack right margin
  const panelOpen = selectedStation !== null;

  return (
    <>
      {/* ── Side panel ───────────────────────────────────────────────────────── */}
      <SidePanel
        station={selectedStation ? liveDto.stations.find((s) => s.id === selectedStation.id) ?? selectedStation : null}
        locale={locale}
        dir={dir}
        onClose={() => setSelectedStation(null)}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <TwinHeader dto={liveDto} locale={locale} dir={dir} liveMode={liveMode} />

        {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', direction: dir }}>
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
            onFitView={() => cameraActionRef.current?.fitView()}
            onTopView={() => cameraActionRef.current?.topView()}
          />

          {/* Separator */}
          <span style={{ width: '1px', height: '1.5rem', background: `${brand[300]}66` }} />

          {/* Guided tour button */}
          {!tourActive ? (
            <button
              onClick={startTour}
              disabled={liveDto.tourSteps.length === 0}
              style={{
                padding: '0.38rem 0.9rem',
                borderRadius: radius.pill,
                border: `1px solid ${themeStatus.ok}66`,
                background: `rgba(255,255,255,0.85)`,
                color: themeStatus.ok,
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: liveDto.tourSteps.length === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                opacity: liveDto.tourSteps.length === 0 ? 0.4 : 1,
                boxShadow: '0 1px 4px rgba(104,65,176,0.10)',
              }}
            >
              🎓 {t.tour.start}
            </button>
          ) : (
            <button
              onClick={exitTour}
              style={{
                padding: '0.38rem 0.9rem',
                borderRadius: radius.pill,
                border: `1px solid ${themeStatus.ok}`,
                background: `${themeStatus.ok}18`,
                color: themeStatus.ok,
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

        </div>

        {/* Edit mode banner */}
        {editMode && (
          <div
            style={{
              padding: '0.4rem 0.75rem',
              background: `${brand[50]}`,
              border: `1px solid ${brand[300]}`,
              borderRadius: radius.sm,
              fontSize: '0.85rem',
              color: brand[700],
              direction: dir,
            }}
          >
            {t.twin.editModeBanner}
          </div>
        )}

        {/* Import error */}
        {importError && (
          <div
            style={{
              padding: '0.4rem 0.75rem',
              background: `rgba(220,38,38,0.06)`,
              border: `1px solid ${themeStatus.deviation}55`,
              borderRadius: radius.sm,
              fontSize: '0.85rem',
              color: '#b91c1c',
              direction: dir,
            }}
          >
            {t.twin.importError}: {importError}
          </div>
        )}

        {/* ── Status summary bar ───────────────────────────────────────────────── */}
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
            const displayName = station.nameEn ?? station.name;
            const sc = stationColor(station.status);
            return (
              <button
                key={station.id}
                onClick={() => !editMode && handleStationClick(station)}
                style={{
                  padding: '0.3rem 0.8rem',
                  borderRadius: radius.pill,
                  background: selectedStation?.id === station.id ? brand[50] : 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(10px)',
                  color: brand[700],
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  border: `1px solid ${selectedStation?.id === station.id ? brand[500] : sc + '66'}`,
                  boxShadow: station.status === 'OUT_OF_RANGE' ? `0 0 8px ${themeStatus.deviation}44` : '0 1px 3px rgba(104,65,176,0.08)',
                  cursor: editMode ? 'default' : 'pointer',
                  transition: 'border-color 0.15s',
                }}
                title={`${displayName} — ${t.status[station.status as keyof typeof t.status]}`}
              >
                <span
                  style={{
                    width: 8, height: 8, borderRadius: 999,
                    background: sc,
                    flexShrink: 0,
                  }}
                />
                {displayName}
              </button>
            );
          })}
        </div>

        {/* Empty state */}
        {liveDto.stations.length === 0 && liveDto.zones.length === 0 && (
          <div
            data-testid="empty-state"
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: brand[400],
              fontSize: '1rem',
              border: `1px dashed ${brand[300]}`,
              borderRadius: radius.md,
              direction: dir,
            }}
          >
            {t.twin.emptyState}
          </div>
        )}

        {/* ── 3-D Canvas ───────────────────────────────────────────────────────── */}
        <div style={{ position: 'relative' }}>
          {/* ── Toast stack — bottom-right inside the canvas area ── */}
          <ToastStack
            toasts={toasts}
            dir={dir}
            panelOpen={panelOpen}
            locale={locale}
            onDismiss={dismissToast}
            onCorrectiveAction={handleCorrectiveAction}
            t={t}
          />
          <TwinCanvas
            dto={liveDto}
            locale={locale}
            dir={dir}
            showFlow={showFlow}
            showSeparation={showSeparation}
            editMode={editMode && !tourActive}
            selectedStationId={selectedStation?.id ?? null}
            tourActive={tourActive}
            onStationClick={handleStationClick}
            onStationMove={handleStationMove}
            onFloorDoubleClick={() => setStationFocused(false)}
            cameraActionRef={cameraActionRef}
          />

          {/* ── Back-to-overview button — appears while a station is focused ── */}
          {stationFocused && !tourActive && (
            <button
              onClick={() => {
                cameraActionRef.current?.fitView();
                setStationFocused(false);
                setSelectedStation(null);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '0.35rem 0.85rem',
                borderRadius: radius.pill,
                background: 'rgba(255,255,255,0.92)',
                border: `1px solid ${brand[300]}`,
                color: brand[700],
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(65,34,142,0.15)',
                backdropFilter: 'blur(8px)',
                zIndex: 10,
              }}
            >
              {t.twin.backToOverview}
            </button>
          )}

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

        {/* ── Info row ─────────────────────────────────────────────────────────── */}
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
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: radius.pill,
              background: issueCount > 0 ? `rgba(220,38,38,0.06)` : `rgba(22,163,74,0.08)`,
              border: `1px solid ${issueCount > 0 ? themeStatus.deviation : themeStatus.ok}`,
              color: issueCount > 0 ? '#b91c1c' : '#15803d',
              fontWeight: 600,
            }}
          >
            {issueCount > 0 ? `${issueCount} ${t.twin.issues}` : t.twin.noIssues}
          </span>

          <span style={{ color: brand[400] }}>
            {liveDto.flowSegments.length} {t.twin.flowSegments}
          </span>

          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: radius.pill,
              background: liveDto.chainResult.valid ? `rgba(22,163,74,0.08)` : `rgba(217,119,6,0.08)`,
              border: `1px solid ${liveDto.chainResult.valid ? themeStatus.ok : themeStatus.expiring}`,
              color: liveDto.chainResult.valid ? '#15803d' : '#92400e',
              fontWeight: 600,
            }}
          >
            {liveDto.chainResult.valid ? t.twin.chainVerified : t.twin.chainInvalid}
          </span>
        </div>

        {/* ── Separation issues list ───────────────────────────────────────────── */}
        {issueCount > 0 && (
          <ul
            style={{
              margin: 0,
              padding: '0 0 0 1.25rem',
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

// ── ToastStack ────────────────────────────────────────────────────────────────
// Absolutely positioned inside the canvas container — bottom-right corner.
// At 1920px width the panel is 340px wide; we use right:16px so the toast never
// overlaps the issues list below the canvas.

interface ToastStackProps {
  toasts: Toast[];
  dir: 'rtl' | 'ltr';
  panelOpen: boolean;
  locale: Locale;
  onDismiss: (id: number) => void;
  onCorrectiveAction: (id: number) => void;
  t: ReturnType<typeof getDictionary>;
}

function ToastStack({ toasts, dir, panelOpen, locale, onDismiss, onCorrectiveAction, t }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        // Keep left of the side panel when it is open
        right: panelOpen ? '356px' : '16px',
        width: 'min(420px, calc(100% - 32px))',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        direction: dir,
        pointerEvents: 'none', // let clicks through to the canvas
      }}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          locale={locale}
          onDismiss={() => onDismiss(toast.id)}
          onAction={() => onCorrectiveAction(toast.id)}
          t={t}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  locale,
  onDismiss,
  onAction,
  t,
}: {
  toast: Toast;
  locale: Locale;
  onDismiss: () => void;
  onAction: () => void;
  t: ReturnType<typeof getDictionary>;
}) {
  const isBreachKind = toast.kind === 'breach';
  const borderColor = isBreachKind ? themeStatus.deviation : brand[400];

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem',
        paddingBlock: '0.65rem',
        paddingInline: '1rem',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${borderColor}`,
        boxShadow: `0 4px 20px rgba(104,65,176,0.15)`,
        borderRadius: radius.md,
        fontSize: '0.9rem',
        color: '#1c1830',
        fontWeight: 500,
        pointerEvents: 'auto', // re-enable clicks on the toast item itself
      }}
    >
      {/* Icon — pulsed for breach */}
      <span
        style={{
          fontSize: '1.1rem',
          flexShrink: 0,
          animation: isBreachKind ? 'pulse-icon 1s ease-in-out infinite' : undefined,
          display: 'inline-block',
        }}
      >
        🚨
      </span>

      {/* Message — wraps normally */}
      <span style={{ flex: 1, lineHeight: 1.45 }}>{toast.message}</span>

      {/* Corrective action button */}
      {isBreachKind && (
        <button
          onClick={onAction}
          style={{
            padding: '0.3rem 0.75rem',
            borderRadius: radius.sm,
            border: `2px solid ${themeStatus.deviation}`,
            background: themeStatus.deviation,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          ✓ {t.twin.correctiveAction}
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        aria-label={t.twin.dismiss}
        style={{
          padding: '0.2rem 0.4rem',
          borderRadius: radius.sm,
          border: `1px solid ${brand[300]}55`,
          background: 'transparent',
          color: brand[400],
          cursor: 'pointer',
          fontSize: '0.85rem',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stationColor(status: string): string {
  return statusPalette[status as keyof typeof statusPalette] ?? statusPalette.NO_DATA;
}

function applyOverlayToDto(base: TwinDTO, overlay: LayoutOverlay): TwinDTO {
  const updatedStations = base.stations.map((s) => {
    const override = overlay.stationPositions[s.id];
    if (!override) return s;
    return { ...s, position: { ...s.position, ...override } };
  });

  // Type inference cannot narrow a partial object literal to TwinDataset without
  // this cast — the domain functions do not access the fields we omit.
  const minimalDataset = {
    schemaVersion: 1 as const,
    source: { kind: 'seed' as const },
    site: { id: '', name: '', widthM: base.siteWidth, depthM: base.siteDepth },
    allergens: [],
    zones: base.zones,
    stations: updatedStations.map((s) => ({
      id: s.id, name: s.name, controlType: s.controlType,
      position: s.position, zoneId: s.zoneId, fields: s.fields,
    })),
    process: { id: 'live', name: 'live', steps: [], edges: [] },
    readings: [],
  } as unknown as import('@/domain/schema').TwinDataset;

  return {
    ...base,
    stations: updatedStations,
    flowSegments: buildFlowPaths(minimalDataset),
    separationIssues: findSeparationIssues(minimalDataset),
  };
}

// ── TwinHeader ────────────────────────────────────────────────────────────────

function TwinHeader({
  dto,
  locale,
  dir,
  liveMode,
}: {
  dto: TwinDTO;
  locale: Locale;
  dir: 'rtl' | 'ltr';
  liveMode: boolean;
}) {
  const t = getDictionary(locale);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const ccps = dto.stations.filter((s) => s.controlType === 'CCP');
  const ok = ccps.filter((s) => s.status === 'OK').length;
  const open = dto.stations.filter((s) => s.status === 'OUT_OF_RANGE').length;
  // English-only: he conditional removed

  const kpi = (label: string, value: string, color: string) => (
    <div
      style={{
        padding: '0.45rem 0.9rem',
        borderRadius: radius.md,
        background: brand[50],
        border: `1px solid ${brand[100]}`,
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: brand[400],
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        flexWrap: 'wrap',
        direction: dir,
        padding: '0.6rem 1rem',
        borderRadius: radius.lg,
        background: 'rgba(255,255,255,0.92)',
        border: `1px solid ${brand[100]}`,
        backdropFilter: 'blur(14px)',
        boxShadow: `0 2px 12px rgba(104,65,176,0.10)`,
      }}
    >
      {/* Logo tile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.md,
            background: `linear-gradient(135deg, ${brand[500]} 0%, ${brand[700]} 100%)`,
            display: 'grid',
            placeItems: 'center',
            fontWeight: 900,
            color: '#fff',
            fontSize: 20,
            boxShadow: `0 2px 8px ${brand[500]}44`,
          }}
        >
          A
        </div>
        <div>
          <div
            style={{
              fontWeight: 900,
              letterSpacing: '0.18em',
              fontSize: '1.05rem',
              color: brand[700],
            }}
          >
            ASADRA
          </div>
          <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: brand[400] }}>
            {t.twin.title} — {dto.siteNameEn ?? dto.siteName}
          </h1>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* KPI tiles */}
      {kpi('CCPs OK', `${ok}/${ccps.length}`, ok === ccps.length ? themeStatus.ok : themeStatus.deviation)}
      {kpi('Open deviations', String(open), open ? themeStatus.deviation : themeStatus.ok)}
      {kpi(
        'Chain integrity',
        dto.chainResult.valid ? 'Verified ✓' : 'Broken',
        dto.chainResult.valid ? themeStatus.ok : themeStatus.expiring,
      )}

      {/* Clock */}
      <div style={{ textAlign: 'center', minWidth: 110 }}>
        <div
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '1.25rem',
            color: brand[700],
            fontWeight: 700,
          }}
          suppressHydrationWarning
        >
          {now ? now.toLocaleTimeString('en-GB') : '--:--:--'}
        </div>
        <div style={{ fontSize: '0.7rem', color: liveMode ? themeStatus.ok : brand[300], letterSpacing: '0.1em' }}>
          {liveMode ? '● LIVE' : '❚❚ PAUSED'}
        </div>
      </div>
    </header>
  );
}
