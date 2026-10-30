import { describe, it, expect } from 'vitest';
import { TwinDatasetSchema } from '@/domain/schema';

describe('TwinDatasetSchema', () => {
  it('validates the hummus-plant seed', async () => {
    // Dynamic import so vitest does not need fs at module load time
    const seed = await import('../../data/seed/hummus-plant.json');
    const result = TwinDatasetSchema.safeParse(seed);
    if (!result.success) {
      console.error(result.error.format());
    }
    expect(result.success).toBe(true);
  });

  it('rejects a dataset with a missing allergen code reference', () => {
    const result = TwinDatasetSchema.safeParse({
      schemaVersion: 1,
      source: { kind: 'seed' },
      site: { id: 's', name: 'Site', widthM: 10, depthM: 10 },
      allergens: [],
      zones: [
        {
          id: 'z1',
          name: 'Zone',
          hygieneClass: 'RAW',
          x: 0,
          z: 0,
          width: 5,
          depth: 5,
          allergenCodes: ['SESAME'], // not in allergens array
        },
      ],
      stations: [],
      process: { id: 'p', name: 'Process', steps: [], edges: [] },
      readings: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a dataset with duplicate sortOrder', () => {
    const result = TwinDatasetSchema.safeParse({
      schemaVersion: 1,
      source: { kind: 'seed' },
      site: { id: 's', name: 'Site', widthM: 10, depthM: 10 },
      allergens: [],
      zones: [],
      stations: [],
      process: {
        id: 'p',
        name: 'Process',
        steps: [
          { id: 'a', name: 'A', type: 'MATERIAL_INPUT', sortOrder: 1 },
          { id: 'b', name: 'B', type: 'OUTPUT', sortOrder: 1 }, // duplicate
        ],
        edges: [],
      },
      readings: [],
    });
    expect(result.success).toBe(false);
  });
});
