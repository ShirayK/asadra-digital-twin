import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mergeOverlay,
  loadOverlay,
  saveOverlay,
  clearOverlay,
  type LayoutOverlay,
} from '../../src/adapters/local-overlay';
import type { TwinDataset } from '../../src/domain/schema';

// ──────────────────────────────────────────────────────────────────────────────
// Minimal TwinDataset fixture
// ──────────────────────────────────────────────────────────────────────────────

function makeDataset(positions: Record<string, { x: number; z: number }>): TwinDataset {
  return {
    schemaVersion: 1,
    source: { kind: 'seed' },
    site: { id: 'test', name: 'Test Plant', widthM: 20, depthM: 15 },
    allergens: [],
    zones: [],
    stations: Object.entries(positions).map(([id, pos]) => ({
      id,
      name: `Station ${id}`,
      controlType: 'PRP' as const,
      position: { x: pos.x, z: pos.z },
      fields: [],
    })),
    process: { id: 'p1', name: 'Process', steps: [], edges: [] },
    readings: [],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// mergeOverlay tests
// ──────────────────────────────────────────────────────────────────────────────

describe('mergeOverlay', () => {
  it('returns base dataset unchanged when overlay is empty', () => {
    const base = makeDataset({ s1: { x: 1, z: 2 } });
    const overlay: LayoutOverlay = { stationPositions: {} };
    const result = mergeOverlay(base, overlay);
    expect(result.stations[0].position).toEqual({ x: 1, z: 2 });
  });

  it('applies position override from overlay', () => {
    const base = makeDataset({ s1: { x: 1, z: 2 }, s2: { x: 5, z: 6 } });
    const overlay: LayoutOverlay = { stationPositions: { s1: { x: 10, z: 20 } } };
    const result = mergeOverlay(base, overlay);
    expect(result.stations.find((s) => s.id === 's1')!.position).toEqual({ x: 10, z: 20 });
    // s2 is untouched
    expect(result.stations.find((s) => s.id === 's2')!.position).toEqual({ x: 5, z: 6 });
  });

  it('preserves rotationY from base when overlay does not supply it', () => {
    const base = makeDataset({ s1: { x: 1, z: 2 } });
    base.stations[0].position.rotationY = 1.57;
    const overlay: LayoutOverlay = { stationPositions: { s1: { x: 3, z: 4 } } };
    const result = mergeOverlay(base, overlay);
    // rotationY kept from base
    expect(result.stations[0].position.rotationY).toBe(1.57);
    expect(result.stations[0].position.x).toBe(3);
    expect(result.stations[0].position.z).toBe(4);
  });

  it('overlay can supply rotationY and it overrides base', () => {
    const base = makeDataset({ s1: { x: 1, z: 2 } });
    base.stations[0].position.rotationY = 0;
    const overlay: LayoutOverlay = { stationPositions: { s1: { x: 3, z: 4, rotationY: 0.78 } } };
    const result = mergeOverlay(base, overlay);
    expect(result.stations[0].position.rotationY).toBe(0.78);
  });

  it('does not modify readings (append-only constraint)', () => {
    const base = makeDataset({ s1: { x: 1, z: 2 } });
    base.readings = [
      {
        id: 'r1',
        stationId: 's1',
        recordedAt: new Date().toISOString(),
        values: { temp: 3 },
      },
    ];
    const overlay: LayoutOverlay = { stationPositions: { s1: { x: 10, z: 10 } } };
    const result = mergeOverlay(base, overlay);
    expect(result.readings).toHaveLength(1);
    expect(result.readings[0].id).toBe('r1');
  });

  it('ignores overlay entries for unknown station ids', () => {
    const base = makeDataset({ s1: { x: 1, z: 2 } });
    const overlay: LayoutOverlay = { stationPositions: { nonexistent: { x: 99, z: 99 } } };
    const result = mergeOverlay(base, overlay);
    expect(result.stations[0].position).toEqual({ x: 1, z: 2 });
  });

  it('applies overlays for multiple stations in one call', () => {
    const base = makeDataset({
      s1: { x: 1, z: 2 },
      s2: { x: 3, z: 4 },
      s3: { x: 5, z: 6 },
    });
    const overlay: LayoutOverlay = {
      stationPositions: {
        s1: { x: 10, z: 20 },
        s3: { x: 50, z: 60 },
      },
    };
    const result = mergeOverlay(base, overlay);
    expect(result.stations.find((s) => s.id === 's1')!.position.x).toBe(10);
    expect(result.stations.find((s) => s.id === 's2')!.position.x).toBe(3); // untouched
    expect(result.stations.find((s) => s.id === 's3')!.position.x).toBe(50);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// localStorage helpers (mocked in jsdom/vitest)
// ──────────────────────────────────────────────────────────────────────────────

describe('loadOverlay / saveOverlay / clearOverlay', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadOverlay returns empty overlay when nothing saved', () => {
    const overlay = loadOverlay();
    expect(overlay).toEqual({ stationPositions: {} });
  });

  it('saveOverlay persists and loadOverlay retrieves it', () => {
    const overlay: LayoutOverlay = { stationPositions: { s1: { x: 5, z: 7 } } };
    saveOverlay(overlay);
    const loaded = loadOverlay();
    expect(loaded).toEqual(overlay);
  });

  it('clearOverlay removes the saved overlay', () => {
    saveOverlay({ stationPositions: { s1: { x: 1, z: 2 } } });
    clearOverlay();
    const loaded = loadOverlay();
    expect(loaded).toEqual({ stationPositions: {} });
  });

  it('loadOverlay returns empty overlay on malformed JSON', () => {
    localStorage.setItem('asadra-twin-layout-overlay', '{ broken json ');
    const loaded = loadOverlay();
    expect(loaded).toEqual({ stationPositions: {} });
  });
});
