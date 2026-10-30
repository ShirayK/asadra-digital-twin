/**
 * tests/domain/empty-dataset.test.ts
 *
 * Verifies that all domain functions handle an empty TwinDataset gracefully,
 * which is the foundation for the "empty state" UI behaviour.
 */

import { describe, it, expect } from 'vitest';
import { TwinDatasetSchema, type TwinDataset } from '@/domain/schema';
import { getStationStatus } from '@/domain/status';
import { buildFlowPaths } from '@/domain/flow';
import { findSeparationIssues } from '@/domain/separation';
import { verifyReadingChain } from '@/domain/chain';

const emptyDataset: TwinDataset = {
  schemaVersion: 1,
  source: { kind: 'seed' },
  site: { id: 'empty', name: 'Empty site', widthM: 10, depthM: 10 },
  allergens: [],
  zones: [],
  stations: [],
  process: {
    id: 'proc-empty',
    name: 'Empty process',
    steps: [],
    edges: [],
  },
  readings: [],
};

describe('empty TwinDataset', () => {
  it('passes zod schema validation', () => {
    const result = TwinDatasetSchema.safeParse(emptyDataset);
    expect(result.success).toBe(true);
  });

  it('buildFlowPaths returns an empty array', () => {
    expect(buildFlowPaths(emptyDataset)).toHaveLength(0);
  });

  it('findSeparationIssues returns an empty array', () => {
    expect(findSeparationIssues(emptyDataset)).toHaveLength(0);
  });

  it('verifyReadingChain reports valid for zero readings', async () => {
    const result = await verifyReadingChain([]);
    expect(result.valid).toBe(true);
    expect(result.firstInvalidIndex).toBe(-1);
  });

  it('getStationStatus returns NO_DATA when there are no stations to call it on', () => {
    // Confirms the function handles null reading (the case when a station has no readings)
    const fakeStation = {
      id: 'x',
      name: 'X',
      controlType: 'CCP' as const,
      position: { x: 0, z: 0 },
      fields: [],
    };
    expect(getStationStatus(fakeStation, null, new Date())).toBe('NO_DATA');
  });
});
