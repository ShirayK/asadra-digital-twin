import { createDefaultSource } from '@/adapters/json-file-source';
import { getStationStatus, type StationStatus } from '@/domain/status';
import { buildFlowPaths, type FlowSegment } from '@/domain/flow';
import { findSeparationIssues, type SeparationIssue } from '@/domain/separation';
import { verifyReadingChain, type ChainVerificationResult } from '@/domain/chain';
import type { Reading, Station, Zone, ProcessStep, StationField } from '@/domain/schema';
import { getDictionary, locales, defaultLocale, type Locale } from '@/i18n';
import TwinView from '@/components/twin/twin-view';

export const dynamic = 'force-dynamic';

/** Serialisable DTO passed from Server → Client component. */
export interface StationDTO {
  id: string;
  name: string;
  /** English name, optional — present when nameEn is set in seed data */
  nameEn?: string;
  controlType: Station['controlType'];
  position: { x: number; z: number; rotationY?: number };
  zoneId?: string;
  fields: Station['fields'];
  status: StationStatus;
  /** Last 5 readings, newest first */
  lastReadings: Reading[];
}

/** A process step enriched with the linked station's fields for the guided tour. */
export interface TourStep {
  id: string;
  name: string;
  type: ProcessStep['type'];
  sortOrder: number;
  /** Camera focus position resolved from the linked station or step.position */
  position: { x: number; z: number };
  /** Station fields (limits, monitoring, corrective action) — present when a station is linked */
  fields: StationField[];
  /** controlType of the linked station, if any */
  controlType?: Station['controlType'];
}

export interface TwinDTO {
  siteName: string;
  /** English site name */
  siteNameEn?: string;
  siteWidth: number;
  siteDepth: number;
  zones: Zone[];
  stations: StationDTO[];
  flowSegments: FlowSegment[];
  separationIssues: SeparationIssue[];
  chainResult: ChainVerificationResult;
  /** Process steps in sortOrder, enriched for the guided tour (Prompt 9) */
  tourSteps: TourStep[];
}

// English text for the guided tour on /en (seed data is authored in Hebrew)
const TOUR_EN_NAMES: Record<string, string> = {
  'step-receive': 'Raw material receiving',
  'step-soak': 'Chickpea soaking',
  'step-cook': 'Cooking',
  'step-tahini': 'Tahini mixing',
  'step-cool': 'Cooling',
  'step-detect': 'Metal detection',
  'step-pack': 'Packaging',
  'step-output': 'Finished product',
};
const FIELD_EN: Record<string, string> = {
  temp: 'Temperature',
  duration_h: 'Soak time',
  test_passed: 'Test passed',
  seal_ok: 'Seal OK',
};
const FREQ_EN: Record<string, string> = {
  'כל משלוח': 'Every delivery',
  'כל אצווה': 'Every batch',
  'רציף': 'Continuous',
  'כל שעה': 'Hourly',
};
const CA_EN: Record<string, string> = {
  'דחה משלוח אם > 8°C': 'Reject delivery if > 8°C',
  'הפסק בישול ובדוק ציוד אם < 90°C': 'Stop cooking and inspect equipment if < 90°C',
  'קרר אם > 30°C': 'Chill if > 30°C',
  'הכנס לקירור מהיר אם > 5°C': 'Move to blast chiller if > 5°C',
  'בידוד אצווה ובדיקה חוזרת': 'Quarantine batch and re-test',
};

export default async function TwinPage({ params }: { params: { locale: string } }) {
  const locale = (locales.includes(params.locale as Locale)
    ? params.locale
    : defaultLocale) as Locale;
  const t = getDictionary(locale);

  // ── Load & validate dataset (server-side only) ────────────────────────────
  const source = createDefaultSource();
  const dataset = await source.load();

  const now = new Date();

  // ── Compute station statuses and last 5 readings ──────────────────────────
  // Build a map: stationId → readings sorted newest-first
  const readingsByStation = new Map<string, Reading[]>();
  for (const reading of dataset.readings) {
    const list = readingsByStation.get(reading.stationId) ?? [];
    list.push(reading);
    readingsByStation.set(reading.stationId, list);
  }
  // Sort each list newest-first
  for (const [id, list] of readingsByStation) {
    readingsByStation.set(
      id,
      list.slice().sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
      ),
    );
  }

  const stationDTOs: StationDTO[] = dataset.stations.map((station) => {
    const readings = readingsByStation.get(station.id) ?? [];
    const lastReading = readings[0] ?? null;
    const status = getStationStatus(station, lastReading, now);
    return {
      id: station.id,
      name: station.name,
      nameEn: station.nameEn,
      controlType: station.controlType,
      position: station.position,
      zoneId: station.zoneId,
      fields: station.fields,
      status,
      lastReadings: readings.slice(0, 5),
    };
  });

  // ── Flow segments ──────────────────────────────────────────────────────────
  const flowSegments = buildFlowPaths(dataset);

  // ── Separation issues ──────────────────────────────────────────────────────
  const separationIssues = findSeparationIssues(dataset);

  // ── Chain verification (async, uses Web Crypto) ───────────────────────────
  const chainResult = await verifyReadingChain(dataset.readings);

  // ── Build guided tour steps ────────────────────────────────────────────────
  const stationMap = new Map(dataset.stations.map((s) => [s.id, s]));
  const isEn = locale === 'en';
  const tourSteps: TourStep[] = dataset.process.steps
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((step) => {
      const station = step.stationId ? stationMap.get(step.stationId) : undefined;
      const position = station
        ? { x: station.position.x, z: station.position.z }
        : (step.position ?? { x: dataset.site.widthM / 2, z: dataset.site.depthM / 2 });
      return {
        id: step.id,
        name: isEn ? (TOUR_EN_NAMES[step.id] ?? station?.nameEn ?? step.name) : step.name,
        type: step.type,
        sortOrder: step.sortOrder,
        position,
        fields: (station?.fields ?? []).map((f) =>
          isEn
            ? {
                ...f,
                label: FIELD_EN[f.key] ?? f.label,
                unit: f.unit === 'שעות' ? 'h' : f.unit,
                monitoringFrequency: f.monitoringFrequency ? FREQ_EN[f.monitoringFrequency] ?? f.monitoringFrequency : undefined,
                correctiveActionText: f.correctiveActionText ? CA_EN[f.correctiveActionText] ?? f.correctiveActionText : undefined,
              }
            : f,
        ),
        controlType: station?.controlType,
      };
    });

  const dto: TwinDTO = {
    siteName: dataset.site.name,
    siteNameEn: dataset.site.nameEn,
    siteWidth: dataset.site.widthM,
    siteDepth: dataset.site.depthM,
    zones: dataset.zones,
    stations: stationDTOs,
    flowSegments,
    separationIssues,
    chainResult,
    tourSteps,
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem 1.25rem',
        gap: '1rem',
        background: 'radial-gradient(1200px 600px at 50% -10%, #13233d 0%, #0a0f1a 60%)',
      }}
    >

      <TwinView dto={dto} locale={locale} />
    </main>
  );
}
