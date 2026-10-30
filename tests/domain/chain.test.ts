import { describe, it, expect } from 'vitest';
import { verifyReadingChain } from '@/domain/chain';
import type { Reading } from '@/domain/schema';

// ── SHA-256 helper (duplicated here for test data generation) ─────────────────

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function buildChain(
  entries: Array<{ stationId: string; recordedAt: string; values: Record<string, number>; correctiveAction?: string }>,
  firstPrevHash = '0000000000000000000000000000000000000000000000000000000000000000',
): Promise<Reading[]> {
  const readings: Reading[] = [];
  let prevHash = firstPrevHash;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const input = prevHash + e.stationId + e.recordedAt + JSON.stringify(e.values);
    const hash = await sha256(input);
    readings.push({
      id: `r-${String(i + 1).padStart(3, '0')}`,
      stationId: e.stationId,
      recordedAt: e.recordedAt,
      values: e.values,
      correctiveAction: e.correctiveAction,
      prevHash,
      hash,
    });
    prevHash = hash;
  }

  return readings;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('verifyReadingChain', () => {
  it('returns valid for an empty readings array', async () => {
    const result = await verifyReadingChain([]);
    expect(result.valid).toBe(true);
    expect(result.firstInvalidIndex).toBe(-1);
  });

  it('returns valid for a single correct reading', async () => {
    const readings = await buildChain([
      { stationId: 's-1', recordedAt: '2026-10-30T10:00:00.000Z', values: { temp: 4 } },
    ]);
    const result = await verifyReadingChain(readings);
    expect(result.valid).toBe(true);
    expect(result.firstInvalidIndex).toBe(-1);
  });

  it('returns valid for a multi-reading chain', async () => {
    const readings = await buildChain([
      { stationId: 's-1', recordedAt: '2026-10-30T10:00:00.000Z', values: { temp: 4 } },
      { stationId: 's-2', recordedAt: '2026-10-30T11:00:00.000Z', values: { temp: 92 } },
      { stationId: 's-3', recordedAt: '2026-10-30T12:00:00.000Z', values: { temp: 3 } },
    ]);
    const result = await verifyReadingChain(readings);
    expect(result.valid).toBe(true);
    expect(result.firstInvalidIndex).toBe(-1);
  });

  it('returns invalid at index 0 when the first hash is wrong', async () => {
    const readings = await buildChain([
      { stationId: 's-1', recordedAt: '2026-10-30T10:00:00.000Z', values: { temp: 4 } },
    ]);
    readings[0].hash = 'badhash';

    const result = await verifyReadingChain(readings);
    expect(result.valid).toBe(false);
    expect(result.firstInvalidIndex).toBe(0);
  });

  it('returns invalid at the correct index when a middle link is broken', async () => {
    const readings = await buildChain([
      { stationId: 's-1', recordedAt: '2026-10-30T10:00:00.000Z', values: { temp: 4 } },
      { stationId: 's-2', recordedAt: '2026-10-30T11:00:00.000Z', values: { temp: 92 } },
      { stationId: 's-3', recordedAt: '2026-10-30T12:00:00.000Z', values: { temp: 3 } },
    ]);
    readings[1].hash = 'tampered';

    const result = await verifyReadingChain(readings);
    expect(result.valid).toBe(false);
    expect(result.firstInvalidIndex).toBe(1);
  });

  it('detects tampering of values (hash mismatch due to changed values)', async () => {
    const readings = await buildChain([
      { stationId: 's-1', recordedAt: '2026-10-30T10:00:00.000Z', values: { temp: 4 } },
      { stationId: 's-2', recordedAt: '2026-10-30T11:00:00.000Z', values: { temp: 92 } },
    ]);
    // Tamper with the values of reading[0] — hash no longer matches
    readings[0].values = { temp: 99 };

    const result = await verifyReadingChain(readings);
    expect(result.valid).toBe(false);
    expect(result.firstInvalidIndex).toBe(0);
  });

  it('skips readings without a hash field', async () => {
    const readings: Reading[] = [
      {
        id: 'r-001',
        stationId: 's-1',
        recordedAt: '2026-10-30T10:00:00.000Z',
        values: { temp: 4 },
        // no hash or prevHash
      },
    ];
    const result = await verifyReadingChain(readings);
    expect(result.valid).toBe(true);
    expect(result.firstInvalidIndex).toBe(-1);
  });

  it('skips hash-less entries and still validates hashed entries that follow', async () => {
    // Build a single valid reading
    const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const stationId = 's-2';
    const recordedAt = '2026-10-30T11:00:00.000Z';
    const values = { temp: 92 };
    const input = prevHash + stationId + recordedAt + JSON.stringify(values);
    const hash = await sha256(input);

    const readings: Reading[] = [
      {
        id: 'r-001',
        stationId: 's-1',
        recordedAt: '2026-10-30T10:00:00.000Z',
        values: { temp: 4 },
        // no hash — skipped
      },
      {
        id: 'r-002',
        stationId,
        recordedAt,
        values,
        prevHash,
        hash,
      },
    ];

    const result = await verifyReadingChain(readings);
    expect(result.valid).toBe(true);
  });

  it('validates the actual seed readings chain', async () => {
    const seedJson = await import('../../data/seed/hummus-plant.json', {
      assert: { type: 'json' },
    });
    const { TwinDatasetSchema } = await import('@/domain/schema');
    const dataset = TwinDatasetSchema.parse(seedJson.default);

    const result = await verifyReadingChain(dataset.readings);
    expect(result.valid).toBe(true);
    expect(result.firstInvalidIndex).toBe(-1);
  });
});
