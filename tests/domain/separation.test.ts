import { describe, it, expect } from 'vitest';
import { findSeparationIssues } from '@/domain/separation';
import type { TwinDataset } from '@/domain/schema';

// ── Dataset factory ───────────────────────────────────────────────────────────

/**
 * Builds a minimal dataset with:
 *  - z-raw  (RAW,      x:5,z:5, w:10,d:10) — center (5,5), covers 0–10 on both axes
 *  - z-high (HIGH_CARE, x:5,z:25, w:10,d:10) — center (5,25)
 *  - z-sesame (LOW_RISK, x:25,z:5, w:10,d:10, allergenCodes:['SESAME'])
 *  - z-clean  (HIGH_CARE, x:25,z:25, w:10,d:10, allergenCodes:[])
 *
 * Stations are positioned at the center of each zone.
 * Steps link to those stations.
 */
function makeDataset(overrides: Partial<TwinDataset> = {}): TwinDataset {
  const base: TwinDataset = {
    schemaVersion: 1,
    source: { kind: 'seed' },
    site: { id: 'test', name: 'Test', widthM: 40, depthM: 40 },
    allergens: [{ code: 'SESAME', name: 'Sesame' }],
    zones: [
      {
        id: 'z-raw',
        name: 'Raw Zone',
        hygieneClass: 'RAW',
        x: 5, z: 5, width: 10, depth: 10,
        allergenCodes: [],
      },
      {
        id: 'z-high',
        name: 'High Care',
        hygieneClass: 'HIGH_CARE',
        x: 5, z: 25, width: 10, depth: 10,
        allergenCodes: [],
      },
      {
        id: 'z-sesame',
        name: 'Sesame Zone',
        hygieneClass: 'LOW_RISK',
        x: 25, z: 5, width: 10, depth: 10,
        allergenCodes: ['SESAME'],
      },
      {
        id: 'z-clean',
        name: 'Clean Zone',
        hygieneClass: 'HIGH_CARE',
        x: 25, z: 25, width: 10, depth: 10,
        allergenCodes: [],
      },
    ],
    stations: [
      {
        id: 's-raw',
        name: 'Raw Station',
        controlType: 'CP',
        position: { x: 5, z: 5 },
        zoneId: 'z-raw',
        fields: [],
      },
      {
        id: 's-high',
        name: 'High Care Station',
        controlType: 'CCP',
        position: { x: 5, z: 25 },
        zoneId: 'z-high',
        fields: [],
      },
      {
        id: 's-sesame',
        name: 'Sesame Station',
        controlType: 'CP',
        position: { x: 25, z: 5 },
        zoneId: 'z-sesame',
        fields: [],
      },
      {
        id: 's-clean',
        name: 'Clean Station',
        controlType: 'CCP',
        position: { x: 25, z: 25 },
        zoneId: 'z-clean',
        fields: [],
      },
    ],
    process: {
      id: 'proc',
      name: 'Process',
      steps: [
        { id: 'step-raw', name: 'Raw Step', type: 'CP', sortOrder: 1, stationId: 's-raw' },
        { id: 'step-high', name: 'High Step', type: 'CCP', sortOrder: 2, stationId: 's-high' },
        { id: 'step-sesame', name: 'Sesame Step', type: 'CP', sortOrder: 3, stationId: 's-sesame' },
        { id: 'step-clean', name: 'Clean Step', type: 'CCP', sortOrder: 4, stationId: 's-clean' },
      ],
      edges: [],
    },
    readings: [],
  };

  return { ...base, ...overrides };
}

// ── RAW_TO_HIGH_CARE_WITHOUT_CCP ─────────────────────────────────────────────

describe('findSeparationIssues — RAW_TO_HIGH_CARE_WITHOUT_CCP', () => {
  it('detects the issue when a non-CCP step in RAW zone connects to HIGH_CARE', () => {
    const dataset = makeDataset();
    dataset.process.edges = [{ from: 'step-raw', to: 'step-high' }]; // CP → HIGH_CARE

    const issues = findSeparationIssues(dataset);
    const match = issues.filter((i) => i.kind === 'RAW_TO_HIGH_CARE_WITHOUT_CCP');
    expect(match).toHaveLength(1);
    expect(match[0].fromStepId).toBe('step-raw');
    expect(match[0].toStepId).toBe('step-high');
  });

  it('does NOT fire when source step type is CCP', () => {
    const dataset = makeDataset();
    // Add a CCP step in the raw zone
    dataset.process.steps.push({
      id: 'step-raw-ccp',
      name: 'Raw CCP',
      type: 'CCP',
      sortOrder: 10,
      stationId: 's-raw',
    });
    dataset.process.edges = [{ from: 'step-raw-ccp', to: 'step-high' }];

    const issues = findSeparationIssues(dataset);
    const match = issues.filter((i) => i.kind === 'RAW_TO_HIGH_CARE_WITHOUT_CCP');
    expect(match).toHaveLength(0);
  });

  it('fires for LOW_RISK → HIGH_CARE without CCP', () => {
    const dataset = makeDataset();
    // z-sesame is LOW_RISK; step-sesame is CP
    dataset.process.edges = [{ from: 'step-sesame', to: 'step-high' }];

    const issues = findSeparationIssues(dataset);
    const match = issues.filter((i) => i.kind === 'RAW_TO_HIGH_CARE_WITHOUT_CCP');
    expect(match).toHaveLength(1);
  });

  it('does NOT fire when destination zone is not HIGH_CARE', () => {
    const dataset = makeDataset();
    // Add a LOW_RISK destination zone
    dataset.zones.push({
      id: 'z-low2',
      name: 'Low Risk 2',
      hygieneClass: 'LOW_RISK',
      x: 15, z: 5, width: 4, depth: 4,
      allergenCodes: [],
    });
    dataset.stations.push({
      id: 's-low2',
      name: 'Low2 Station',
      controlType: 'CP',
      position: { x: 15, z: 5 },
      zoneId: 'z-low2',
      fields: [],
    });
    dataset.process.steps.push({
      id: 'step-low2', name: 'Low2', type: 'CP', sortOrder: 11, stationId: 's-low2',
    });
    dataset.process.edges = [{ from: 'step-raw', to: 'step-low2' }]; // RAW → LOW_RISK

    const issues = findSeparationIssues(dataset);
    const match = issues.filter((i) => i.kind === 'RAW_TO_HIGH_CARE_WITHOUT_CCP');
    expect(match).toHaveLength(0);
  });
});

// ── ALLERGEN_CROSS_CONTACT ────────────────────────────────────────────────────

describe('findSeparationIssues — ALLERGEN_CROSS_CONTACT', () => {
  it('detects allergen cross-contact when sesame zone connects to sesame-free zone', () => {
    const dataset = makeDataset();
    dataset.process.edges = [{ from: 'step-sesame', to: 'step-clean' }];

    const issues = findSeparationIssues(dataset);
    const match = issues.filter((i) => i.kind === 'ALLERGEN_CROSS_CONTACT');
    expect(match).toHaveLength(1);
    expect(match[0].allergenCode).toBe('SESAME');
    expect(match[0].fromStepId).toBe('step-sesame');
    expect(match[0].toStepId).toBe('step-clean');
  });

  it('does NOT fire when destination zone also has the allergen', () => {
    const dataset = makeDataset();
    // z-clean2 also has SESAME
    dataset.zones.push({
      id: 'z-sesame2',
      name: 'Sesame Zone 2',
      hygieneClass: 'HIGH_CARE',
      x: 35, z: 5, width: 4, depth: 4,
      allergenCodes: ['SESAME'],
    });
    dataset.stations.push({
      id: 's-sesame2',
      name: 'Sesame2',
      controlType: 'CCP',
      position: { x: 35, z: 5 },
      zoneId: 'z-sesame2',
      fields: [],
    });
    dataset.process.steps.push({
      id: 'step-sesame2', name: 'Sesame2', type: 'CCP', sortOrder: 12, stationId: 's-sesame2',
    });
    dataset.process.edges = [{ from: 'step-sesame', to: 'step-sesame2' }];

    const issues = findSeparationIssues(dataset);
    const match = issues.filter((i) => i.kind === 'ALLERGEN_CROSS_CONTACT');
    expect(match).toHaveLength(0);
  });

  it('does NOT fire when source zone has no allergens', () => {
    const dataset = makeDataset();
    // RAW zone has no allergens, HIGH_CARE has no allergens — no cross-contact
    dataset.process.edges = [{ from: 'step-raw', to: 'step-high' }];

    const issues = findSeparationIssues(dataset);
    const match = issues.filter((i) => i.kind === 'ALLERGEN_CROSS_CONTACT');
    expect(match).toHaveLength(0);
  });

  it('fires once per allergen when multiple allergens are present', () => {
    const dataset = makeDataset();
    dataset.allergens.push({ code: 'GLUTEN', name: 'Gluten' });
    // z-sesame gets both allergens
    const sesameZone = dataset.zones.find((z) => z.id === 'z-sesame')!;
    sesameZone.allergenCodes = ['SESAME', 'GLUTEN'];

    dataset.process.edges = [{ from: 'step-sesame', to: 'step-clean' }];

    const issues = findSeparationIssues(dataset);
    const match = issues.filter((i) => i.kind === 'ALLERGEN_CROSS_CONTACT');
    expect(match).toHaveLength(2);
    const codes = match.map((i) => i.allergenCode).sort();
    expect(codes).toEqual(['GLUTEN', 'SESAME']);
  });
});

// ── Position-based zone resolution ───────────────────────────────────────────

describe('findSeparationIssues — position-based zone resolution', () => {
  it('resolves zone by station position when zoneId is absent', () => {
    const dataset = makeDataset();

    // Remove zoneId from s-raw so it must be resolved by position
    const rawStation = dataset.stations.find((s) => s.id === 's-raw')!;
    const { zoneId: _removed, ...rawStationNoZone } = rawStation;
    dataset.stations = dataset.stations.map((s) =>
      s.id === 's-raw' ? rawStationNoZone : s,
    );

    dataset.process.edges = [{ from: 'step-raw', to: 'step-high' }];

    const issues = findSeparationIssues(dataset);
    const match = issues.filter((i) => i.kind === 'RAW_TO_HIGH_CARE_WITHOUT_CCP');
    // s-raw is at (5,5), inside z-raw (center 5,5, 10×10 → 0–10)
    expect(match).toHaveLength(1);
  });

  it('skips edge when step position is outside all zones', () => {
    const dataset = makeDataset();

    // Move s-raw far outside any zone
    dataset.stations = dataset.stations.map((s) =>
      s.id === 's-raw'
        ? { ...s, position: { x: 100, z: 100 }, zoneId: undefined }
        : s,
    );

    dataset.process.edges = [{ from: 'step-raw', to: 'step-high' }];

    // Can't resolve zone → edge is skipped, no issue
    const issues = findSeparationIssues(dataset);
    expect(issues).toHaveLength(0);
  });
});

// ── Combined scenario matching the seed data ─────────────────────────────────

describe('findSeparationIssues — seed scenario', () => {
  it('fires both checks for the tahini→cooling edge in the demo seed', async () => {
    // Dynamically import seed to avoid hard-coding it here
    const seedJson = await import('../../data/seed/hummus-plant.json', {
      assert: { type: 'json' },
    });
    const { TwinDatasetSchema } = await import('@/domain/schema');
    const dataset = TwinDatasetSchema.parse(seedJson.default);

    const issues = findSeparationIssues(dataset);

    const rawHighCare = issues.filter((i) => i.kind === 'RAW_TO_HIGH_CARE_WITHOUT_CCP');
    const allergen = issues.filter((i) => i.kind === 'ALLERGEN_CROSS_CONTACT');

    expect(rawHighCare.length).toBeGreaterThanOrEqual(1);
    expect(allergen.length).toBeGreaterThanOrEqual(1);
    const sesameIssue = allergen.find((i) => i.allergenCode === 'SESAME');
    expect(sesameIssue).toBeDefined();
  });
});
