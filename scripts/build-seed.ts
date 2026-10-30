/**
 * scripts/build-seed.ts
 *
 * Generates data/seed/hummus-plant.json with a valid SHA-256 hash chain.
 *
 * Hash formula (from docs/SPEC.md §5):
 *   hash = sha256(prevHash + stationId + recordedAt + JSON.stringify(values))
 *
 * Run with:
 *   node --loader ts-node/esm scripts/build-seed.ts
 * Or (after compiling):
 *   node scripts/build-seed.mjs
 *
 * The generated JSON is written to data/seed/hummus-plant.json.
 * NOTE: The seed file must never be modified by runtime app code (AGENTS.md §2).
 *       This script is a build-time tool only.
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, '../data/seed/hummus-plant.json');

// ──────────────────────────────────────────────────────────────────────────────
// Hash helper
// ──────────────────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute hash for a reading according to the spec formula:
 *   sha256(prevHash + stationId + recordedAt + JSON.stringify(values))
 */
function readingHash(
  prevHash: string,
  stationId: string,
  recordedAt: string,
  values: Record<string, number>,
): string {
  return sha256(prevHash + stationId + recordedAt + JSON.stringify(values));
}

// ──────────────────────────────────────────────────────────────────────────────
// Raw readings (before hashing) – ~20 readings over the last 24 hours
// Base time: 2026-10-30T12:00:00Z (seed exportedAt)
// ──────────────────────────────────────────────────────────────────────────────

interface RawReading {
  id: string;
  stationId: string;
  recordedAt: string;
  values: Record<string, number>;
  correctiveAction?: string;
}

const rawReadings: RawReading[] = [
  // 2026-10-29 12:00 – 24h ago (start of window)
  { id: 'r-001', stationId: 's-receiving-temp', recordedAt: '2026-10-29T12:00:00.000Z', values: { temp: 3 } },
  { id: 'r-002', stationId: 's-soaking',        recordedAt: '2026-10-29T12:30:00.000Z', values: { duration_h: 10 } },
  { id: 'r-003', stationId: 's-cooking',         recordedAt: '2026-10-29T13:00:00.000Z', values: { temp: 93 } },
  { id: 'r-004', stationId: 's-tahini-mix',      recordedAt: '2026-10-29T13:15:00.000Z', values: { temp: 22 } },
  { id: 'r-005', stationId: 's-cooling',         recordedAt: '2026-10-29T14:00:00.000Z', values: { temp: 4 } },
  { id: 'r-006', stationId: 's-metal-detector',  recordedAt: '2026-10-29T15:00:00.000Z', values: { test_passed: 1 } },
  { id: 'r-007', stationId: 's-packaging',       recordedAt: '2026-10-29T15:30:00.000Z', values: { seal_ok: 1 } },

  // 2026-10-29 evening batch
  { id: 'r-008', stationId: 's-receiving-temp', recordedAt: '2026-10-29T18:00:00.000Z', values: { temp: 5 } },
  { id: 'r-009', stationId: 's-cooking',         recordedAt: '2026-10-29T19:00:00.000Z', values: { temp: 91 } },
  { id: 'r-010', stationId: 's-cooling',         recordedAt: '2026-10-29T20:00:00.000Z', values: { temp: 4 } },
  { id: 'r-011', stationId: 's-metal-detector',  recordedAt: '2026-10-29T21:00:00.000Z', values: { test_passed: 1 } },

  // 2026-10-30 morning batch – includes ONE out-of-range cooling reading (9°C > 5°C limit)
  { id: 'r-012', stationId: 's-receiving-temp', recordedAt: '2026-10-30T06:00:00.000Z', values: { temp: 4 } },
  { id: 'r-013', stationId: 's-soaking',        recordedAt: '2026-10-30T06:30:00.000Z', values: { duration_h: 12 } },
  { id: 'r-014', stationId: 's-cooking',         recordedAt: '2026-10-30T07:00:00.000Z', values: { temp: 96 } },
  { id: 'r-015', stationId: 's-tahini-mix',      recordedAt: '2026-10-30T07:15:00.000Z', values: { temp: 21 } },
  {
    id: 'r-016',
    stationId: 's-cooling',
    recordedAt: '2026-10-30T08:00:00.000Z',
    values: { temp: 9 },
    // OUT-OF-RANGE: 9°C > max 5°C → triggers OUT_OF_RANGE status
    correctiveAction: 'הכנס לקירור מהיר — נמדד 9°C מול גבול 5°C',
  },
  { id: 'r-017', stationId: 's-cooling',         recordedAt: '2026-10-30T09:00:00.000Z', values: { temp: 3 } },
  { id: 'r-018', stationId: 's-metal-detector',  recordedAt: '2026-10-30T09:30:00.000Z', values: { test_passed: 1 } },
  { id: 'r-019', stationId: 's-packaging',        recordedAt: '2026-10-30T10:00:00.000Z', values: { seal_ok: 1 } },
  { id: 'r-020', stationId: 's-receiving-temp',  recordedAt: '2026-10-30T11:00:00.000Z', values: { temp: 6 } },
];

// ──────────────────────────────────────────────────────────────────────────────
// Build readings with hash chain
// ──────────────────────────────────────────────────────────────────────────────

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const readings = rawReadings.map((r, i) => {
  const prevHash = i === 0 ? GENESIS_HASH : readingHash(
    i === 1 ? GENESIS_HASH : readings[i - 1]!.hash,
    rawReadings[i - 1]!.stationId,
    rawReadings[i - 1]!.recordedAt,
    rawReadings[i - 1]!.values,
  );
  const hash = readingHash(prevHash, r.stationId, r.recordedAt, r.values);
  return { ...r, prevHash, hash };
}) as Array<RawReading & { hash: string; prevHash: string }>;

// Fix: the above has a recursion issue – recompute imperatively
const builtReadings: Array<RawReading & { hash: string; prevHash: string }> = [];
let prevHash = GENESIS_HASH;
for (const r of rawReadings) {
  const hash = readingHash(prevHash, r.stationId, r.recordedAt, r.values);
  builtReadings.push({ ...r, prevHash, hash });
  prevHash = hash;
}

// ──────────────────────────────────────────────────────────────────────────────
// Assemble the full TwinDataset
// ──────────────────────────────────────────────────────────────────────────────

const dataset = {
  schemaVersion: 1,
  source: { kind: 'seed', exportedAt: '2026-10-30T12:00:00.000Z' },
  site: {
    id: 'hummus-demo',
    name: 'מפעל חומוס — דמו',
    widthM: 30,
    depthM: 20,
  },
  allergens: [
    { code: 'SESAME', name: 'שומשום' },
    { code: 'GLUTEN', name: 'גלוטן' },
  ],
  zones: [
    { id: 'z-receiving',  name: 'קבלה',           hygieneClass: 'RAW',       x: 3,  z: 4,  width: 6,  depth: 6,  allergenCodes: [] },
    { id: 'z-soaking',    name: 'השריה ובישול',    hygieneClass: 'LOW_RISK',  x: 10, z: 4,  width: 6,  depth: 6,  allergenCodes: [] },
    { id: 'z-tahini',     name: 'טחינה',            hygieneClass: 'LOW_RISK',  x: 17, z: 4,  width: 6,  depth: 6,  allergenCodes: ['SESAME'] },
    { id: 'z-highcare',   name: 'קירור ואזור נקי',  hygieneClass: 'HIGH_CARE', x: 10, z: 14, width: 10, depth: 6,  allergenCodes: [] },
    { id: 'z-packaging',  name: 'אריזה',            hygieneClass: 'PACKAGING', x: 22, z: 14, width: 6,  depth: 6,  allergenCodes: [] },
    { id: 'z-storage',    name: 'מחסן קירור',       hygieneClass: 'STORAGE',   x: 27, z: 4,  width: 4,  depth: 6,  allergenCodes: [] },
  ],
  stations: [
    {
      id: 's-receiving-temp',
      name: 'מדד טמפרטורה — קבלה',
      controlType: 'PRP',
      position: { x: 3, z: 4 },
      zoneId: 'z-receiving',
      fields: [
        { key: 'temp', label: 'טמפרטורה', unit: '°C', max: 8, monitoringFrequency: 'כל משלוח', correctiveActionText: 'דחה משלוח אם > 8°C' },
      ],
    },
    {
      id: 's-soaking',
      name: 'תחנת השריה',
      controlType: 'CP',
      position: { x: 10, z: 4 },
      zoneId: 'z-soaking',
      fields: [
        { key: 'duration_h', label: 'זמן השריה', unit: 'שעות', min: 8, max: 16, monitoringFrequency: 'כל אצווה' },
      ],
    },
    {
      id: 's-cooking',
      name: 'בישול (CCP)',
      controlType: 'CCP',
      position: { x: 13, z: 4 },
      zoneId: 'z-soaking',
      fields: [
        { key: 'temp', label: 'טמפרטורה', unit: '°C', min: 90, monitoringFrequency: 'רציף', correctiveActionText: 'הפסק בישול ובדוק ציוד אם < 90°C' },
      ],
    },
    {
      id: 's-tahini-mix',
      name: 'ערבול טחינה',
      controlType: 'CP',
      position: { x: 17, z: 4 },
      zoneId: 'z-tahini',
      fields: [
        { key: 'temp', label: 'טמפרטורה', unit: '°C', max: 30, monitoringFrequency: 'כל אצווה', correctiveActionText: 'קרר אם > 30°C' },
      ],
    },
    {
      id: 's-cooling',
      name: 'קירור (CCP)',
      controlType: 'CCP',
      position: { x: 10, z: 14 },
      zoneId: 'z-highcare',
      fields: [
        { key: 'temp', label: 'טמפרטורה', unit: '°C', max: 5, monitoringFrequency: 'כל שעה', correctiveActionText: 'הכנס לקירור מהיר אם > 5°C' },
      ],
    },
    {
      id: 's-metal-detector',
      name: 'גלאי מתכות (CCP)',
      controlType: 'CCP',
      position: { x: 20, z: 14 },
      zoneId: 'z-packaging',
      fields: [
        { key: 'test_passed', label: 'עבר בדיקה', unit: '', min: 1, max: 1, monitoringFrequency: 'כל אצווה', correctiveActionText: 'בידוד אצווה ובדיקה חוזרת' },
      ],
    },
    {
      id: 's-packaging',
      name: 'אריזה',
      controlType: 'PRP',
      position: { x: 22, z: 14 },
      zoneId: 'z-packaging',
      fields: [
        { key: 'seal_ok', label: 'איטום תקין', unit: '', min: 1, max: 1, monitoringFrequency: 'כל אצווה' },
      ],
    },
  ],
  process: {
    id: 'proc-hummus',
    name: 'תהליך ייצור חומוס',
    steps: [
      { id: 'step-receive', name: 'קבלת חומרי גלם', type: 'MATERIAL_INPUT', sortOrder: 1, stationId: 's-receiving-temp' },
      { id: 'step-soak',    name: 'השריה',           type: 'CP',            sortOrder: 2, stationId: 's-soaking' },
      { id: 'step-cook',    name: 'בישול',           type: 'CCP',           sortOrder: 3, stationId: 's-cooking' },
      // step-tahini: CP in SESAME zone → edge to HIGH_CARE fires both separation checks
      { id: 'step-tahini',  name: 'ערבול טחינה',     type: 'CP',            sortOrder: 4, stationId: 's-tahini-mix' },
      { id: 'step-cool',    name: 'קירור',            type: 'CCP',           sortOrder: 5, stationId: 's-cooling' },
      { id: 'step-detect',  name: 'גלאי מתכות',      type: 'CCP',           sortOrder: 6, stationId: 's-metal-detector' },
      { id: 'step-pack',    name: 'אריזה',            type: 'PACKAGING',     sortOrder: 7, stationId: 's-packaging' },
      { id: 'step-output',  name: 'מוצר מוגמר',      type: 'OUTPUT',        sortOrder: 8, position: { x: 27, z: 14 } },
    ],
    edges: [
      { from: 'step-receive', to: 'step-soak' },
      { from: 'step-soak',    to: 'step-cook' },
      { from: 'step-cook',    to: 'step-cool' },
      // INTENTIONAL DEMO: step-tahini is CP (not CCP) in LOW_RISK zone with SESAME allergen.
      // Edge to step-cool (HIGH_CARE, no SESAME) fires:
      //   1. RAW_TO_HIGH_CARE_WITHOUT_CCP (LOW_RISK non-CCP → HIGH_CARE)
      //   2. ALLERGEN_CROSS_CONTACT (SESAME zone → non-SESAME zone)
      { from: 'step-tahini',  to: 'step-cool',  label: 'DEMO: LOW_RISK+SESAME(CP) → HIGH_CARE — fires both separation checks' },
      { from: 'step-cool',    to: 'step-detect' },
      { from: 'step-detect',  to: 'step-pack' },
      { from: 'step-pack',    to: 'step-output' },
    ],
  },
  readings: builtReadings,
};

writeFileSync(OUTPUT, JSON.stringify(dataset, null, 2) + '\n', 'utf8');
console.log(`✅  Wrote ${builtReadings.length} readings with hash chain to ${OUTPUT}`);
