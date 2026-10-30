import { describe, it, expect } from 'vitest';
import { TwinDatasetSchema } from '@/domain/schema';

/** Minimal valid dataset used as a baseline for invalid-dataset tests. */
const baseValid = {
  schemaVersion: 1 as const,
  source: { kind: 'seed' as const },
  site: { id: 's', name: 'Site', widthM: 10, depthM: 10 },
  allergens: [{ code: 'SESAME', name: 'Sesame' }],
  zones: [
    { id: 'z1', name: 'Zone A', hygieneClass: 'RAW' as const, x: 0, z: 0, width: 5, depth: 5, allergenCodes: [] },
    { id: 'z2', name: 'Zone B', hygieneClass: 'HIGH_CARE' as const, x: 6, z: 0, width: 5, depth: 5, allergenCodes: [] },
  ],
  stations: [
    {
      id: 'st1',
      name: 'Station 1',
      controlType: 'CCP' as const,
      position: { x: 1, z: 1 },
      zoneId: 'z1',
      fields: [{ key: 'temp', label: 'Temperature', unit: '°C', min: 90 }],
    },
  ],
  process: {
    id: 'p1',
    name: 'Process',
    steps: [
      { id: 'step-a', name: 'Step A', type: 'MATERIAL_INPUT' as const, sortOrder: 1, stationId: 'st1' },
      { id: 'step-b', name: 'Step B', type: 'OUTPUT' as const, sortOrder: 2 },
    ],
    edges: [{ from: 'step-a', to: 'step-b' }],
  },
  readings: [
    {
      id: 'r1',
      stationId: 'st1',
      recordedAt: '2026-10-30T10:00:00.000Z',
      values: { temp: 92 },
    },
  ],
};

describe('TwinDatasetSchema', () => {
  // ── Valid dataset ──────────────────────────────────────────────────────────

  it('validates the hummus-plant seed', async () => {
    const seed = await import('../../data/seed/hummus-plant.json');
    const result = TwinDatasetSchema.safeParse(seed);
    if (!result.success) {
      console.error(result.error.format());
    }
    expect(result.success).toBe(true);
  });

  it('accepts a minimal valid dataset', () => {
    const result = TwinDatasetSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it('accepts a station without zoneId (zoneId optional)', () => {
    const data = {
      ...baseValid,
      stations: [{ ...baseValid.stations[0], zoneId: undefined }],
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts a process step without stationId (position used instead)', () => {
    const data = {
      ...baseValid,
      process: {
        ...baseValid.process,
        steps: [
          { id: 'step-a', name: 'Step A', type: 'MATERIAL_INPUT' as const, sortOrder: 1, position: { x: 1, z: 1 } },
          { id: 'step-b', name: 'Step B', type: 'OUTPUT' as const, sortOrder: 2 },
        ],
      },
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts a station with externalRef for future Asadra integration', () => {
    const data = {
      ...baseValid,
      stations: [
        {
          ...baseValid.stations[0],
          externalRef: { system: 'asadra' as const, stationId: 'ext-123' },
        },
      ],
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  // ── Invalid: cross-reference violations ───────────────────────────────────

  it('rejects a zone that references an unknown allergen code', () => {
    const data = {
      ...baseValid,
      zones: [
        { ...baseValid.zones[0], allergenCodes: ['UNKNOWN_ALLERGEN'] },
        ...baseValid.zones.slice(1),
      ],
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects a station with a zoneId that does not exist', () => {
    const data = {
      ...baseValid,
      stations: [{ ...baseValid.stations[0], zoneId: 'non-existent-zone' }],
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects a process step referencing an unknown stationId', () => {
    const data = {
      ...baseValid,
      process: {
        ...baseValid.process,
        steps: [
          { id: 'step-a', name: 'Step A', type: 'MATERIAL_INPUT' as const, sortOrder: 1, stationId: 'no-such-station' },
          { id: 'step-b', name: 'Step B', type: 'OUTPUT' as const, sortOrder: 2 },
        ],
      },
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects an edge whose "from" endpoint is not a known step id', () => {
    const data = {
      ...baseValid,
      process: {
        ...baseValid.process,
        edges: [{ from: 'ghost-step', to: 'step-b' }],
      },
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects an edge whose "to" endpoint is not a known step id', () => {
    const data = {
      ...baseValid,
      process: {
        ...baseValid.process,
        edges: [{ from: 'step-a', to: 'ghost-step' }],
      },
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects a reading that references an unknown stationId', () => {
    const data = {
      ...baseValid,
      readings: [{ ...baseValid.readings[0], stationId: 'no-such-station' }],
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects a dataset with duplicate step sortOrder', () => {
    const data = {
      ...baseValid,
      process: {
        ...baseValid.process,
        steps: [
          { id: 'step-a', name: 'Step A', type: 'MATERIAL_INPUT' as const, sortOrder: 1 },
          { id: 'step-b', name: 'Step B', type: 'OUTPUT' as const, sortOrder: 1 }, // duplicate
        ],
      },
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  // ── Invalid: schema-level type violations ─────────────────────────────────

  it('rejects schemaVersion other than 1', () => {
    const result = TwinDatasetSchema.safeParse({ ...baseValid, schemaVersion: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects a zone with a non-positive width', () => {
    const data = {
      ...baseValid,
      zones: [{ ...baseValid.zones[0], width: -1 }],
    };
    const result = TwinDatasetSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
