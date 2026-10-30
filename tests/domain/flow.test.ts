import { describe, it, expect } from 'vitest';
import { buildFlowPaths } from '@/domain/flow';
import type { TwinDataset } from '@/domain/schema';

// ── Minimal dataset factory ───────────────────────────────────────────────────

function makeDataset(overrides: Partial<TwinDataset> = {}): TwinDataset {
  return {
    schemaVersion: 1,
    source: { kind: 'seed' },
    site: { id: 'test', name: 'Test Site', widthM: 20, depthM: 10 },
    allergens: [],
    zones: [],
    stations: [
      {
        id: 's-a',
        name: 'Station A',
        controlType: 'CCP',
        position: { x: 1, z: 2 },
        fields: [],
      },
      {
        id: 's-b',
        name: 'Station B',
        controlType: 'CP',
        position: { x: 5, z: 6 },
        fields: [],
      },
    ],
    process: {
      id: 'proc',
      name: 'Process',
      steps: [
        { id: 'step-a', name: 'Step A', type: 'CCP', sortOrder: 1, stationId: 's-a' },
        { id: 'step-b', name: 'Step B', type: 'CP', sortOrder: 2, stationId: 's-b' },
      ],
      edges: [{ from: 'step-a', to: 'step-b' }],
    },
    readings: [],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildFlowPaths', () => {
  it('returns a segment for a simple A→B edge resolved via station positions', () => {
    const dataset = makeDataset();
    const segments = buildFlowPaths(dataset);

    expect(segments).toHaveLength(1);
    expect(segments[0].from).toEqual({ x: 1, z: 2 });
    expect(segments[0].to).toEqual({ x: 5, z: 6 });
    expect(segments[0].edge).toEqual({ from: 'step-a', to: 'step-b' });
  });

  it('resolves step position from step.position when there is no stationId', () => {
    const dataset = makeDataset();
    dataset.process.steps = [
      { id: 'step-a', name: 'Step A', type: 'CCP', sortOrder: 1, position: { x: 3, z: 7 } },
      { id: 'step-b', name: 'Step B', type: 'OUTPUT', sortOrder: 2, position: { x: 9, z: 1 } },
    ];
    dataset.process.edges = [{ from: 'step-a', to: 'step-b' }];

    const segments = buildFlowPaths(dataset);
    expect(segments).toHaveLength(1);
    expect(segments[0].from).toEqual({ x: 3, z: 7 });
    expect(segments[0].to).toEqual({ x: 9, z: 1 });
  });

  it('prefers station position over step.position when both are present', () => {
    const dataset = makeDataset();
    // Add step.position in addition to stationId
    dataset.process.steps = [
      {
        id: 'step-a',
        name: 'Step A',
        type: 'CCP',
        sortOrder: 1,
        stationId: 's-a', // station at (1, 2)
        position: { x: 99, z: 99 }, // should be ignored
      },
      { id: 'step-b', name: 'Step B', type: 'CP', sortOrder: 2, stationId: 's-b' },
    ];

    const segments = buildFlowPaths(dataset);
    expect(segments[0].from).toEqual({ x: 1, z: 2 }); // station wins
  });

  it('skips an edge when the source step has no resolvable position', () => {
    const dataset = makeDataset();
    // step-a has no stationId and no position
    dataset.process.steps = [
      { id: 'step-a', name: 'Step A', type: 'MATERIAL_INPUT', sortOrder: 1 },
      { id: 'step-b', name: 'Step B', type: 'CP', sortOrder: 2, stationId: 's-b' },
    ];
    dataset.process.edges = [{ from: 'step-a', to: 'step-b' }];

    const segments = buildFlowPaths(dataset);
    expect(segments).toHaveLength(0);
  });

  it('skips an edge when the destination step has no resolvable position', () => {
    const dataset = makeDataset();
    dataset.process.steps = [
      { id: 'step-a', name: 'Step A', type: 'CCP', sortOrder: 1, stationId: 's-a' },
      { id: 'step-b', name: 'Step B', type: 'OUTPUT', sortOrder: 2 }, // no position
    ];
    dataset.process.edges = [{ from: 'step-a', to: 'step-b' }];

    const segments = buildFlowPaths(dataset);
    expect(segments).toHaveLength(0);
  });

  it('returns multiple segments for multiple edges', () => {
    const dataset = makeDataset();
    dataset.stations.push({
      id: 's-c',
      name: 'Station C',
      controlType: 'PRP',
      position: { x: 10, z: 10 },
      fields: [],
    });
    dataset.process.steps = [
      { id: 'step-a', name: 'Step A', type: 'CCP', sortOrder: 1, stationId: 's-a' },
      { id: 'step-b', name: 'Step B', type: 'CP', sortOrder: 2, stationId: 's-b' },
      { id: 'step-c', name: 'Step C', type: 'PRP', sortOrder: 3, stationId: 's-c' },
    ];
    dataset.process.edges = [
      { from: 'step-a', to: 'step-b' },
      { from: 'step-b', to: 'step-c' },
    ];

    const segments = buildFlowPaths(dataset);
    expect(segments).toHaveLength(2);
  });

  it('returns an empty array when there are no edges', () => {
    const dataset = makeDataset();
    dataset.process.edges = [];
    expect(buildFlowPaths(dataset)).toHaveLength(0);
  });

  it('falls back to step.position when stationId does not match any station', () => {
    const dataset = makeDataset();
    dataset.process.steps = [
      {
        id: 'step-a',
        name: 'Step A',
        type: 'CCP',
        sortOrder: 1,
        stationId: 'non-existent-station',
        position: { x: 7, z: 8 },
      },
      { id: 'step-b', name: 'Step B', type: 'CP', sortOrder: 2, stationId: 's-b' },
    ];

    const segments = buildFlowPaths(dataset);
    expect(segments).toHaveLength(1);
    expect(segments[0].from).toEqual({ x: 7, z: 8 });
  });
});
