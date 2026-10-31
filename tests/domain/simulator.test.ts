import { describe, it, expect } from 'vitest';
import {
  initSimulatorState,
  tickSimulator,
  applyCorrectiveAction,
  COOLING_STATION_ID,
  COOLING_LIMIT,
  COOLING_BREACH_TARGET,
} from '../../src/domain/simulator';
import type { Station, Reading } from '../../src/domain/schema';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const coolingStation: Station = {
  id: COOLING_STATION_ID,
  name: 'קירור (CCP)',
  controlType: 'CCP',
  position: { x: 10, z: 14 },
  zoneId: 'z-highcare',
  fields: [{ key: 'temp', label: 'temp', unit: '°C', max: COOLING_LIMIT }],
};

const cookingStation: Station = {
  id: 's-cooking',
  name: 'בישול (CCP)',
  controlType: 'CCP',
  position: { x: 13, z: 4 },
  zoneId: 'z-soaking',
  fields: [{ key: 'temp', label: 'temp', unit: '°C', min: 90 }],
};

const metalDetector: Station = {
  id: 's-metal-detector',
  name: 'גלאי מתכות (CCP)',
  controlType: 'CCP',
  position: { x: 20, z: 14 },
  zoneId: 'z-packaging',
  fields: [{ key: 'test_passed', label: 'test_passed', unit: '', min: 1, max: 1 }],
};

const stations = [coolingStation, cookingStation, metalDetector];

const seedReadings: Reading[] = [
  {
    id: 'r-seed-cooling',
    stationId: COOLING_STATION_ID,
    recordedAt: '2026-10-30T08:00:00.000Z',
    values: { temp: 4 },
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    hash: 'abc123',
  },
  {
    id: 'r-seed-cooking',
    stationId: 's-cooking',
    recordedAt: '2026-10-30T07:00:00.000Z',
    values: { temp: 93 },
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    hash: 'def456',
  },
];

const config = { stations, seedReadings };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('initSimulatorState', () => {
  it('rebases seed readings to within last 30 min', () => {
    const before = Date.now();
    const state = initSimulatorState(config);
    const after = Date.now();

    const coolingList = state.readings.get(COOLING_STATION_ID)!;
    expect(coolingList.length).toBeGreaterThan(0);

    const ts = new Date(coolingList[0].recordedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before - 31 * 60_000);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('initialises cooling temp below limit', () => {
    const state = initSimulatorState(config);
    expect(state.coolingTemp).toBeLessThanOrEqual(COOLING_LIMIT);
  });

  it('starts not breaching', () => {
    const state = initSimulatorState(config);
    expect(state.coolingBreaching).toBe(false);
  });

  it('creates a readings list for every station', () => {
    const state = initSimulatorState(config);
    for (const s of stations) {
      expect(state.readings.has(s.id)).toBe(true);
    }
  });
});

describe('tickSimulator', () => {
  it('appends a new reading per station on each tick', () => {
    let state = initSimulatorState(config);
    const before = new Map<string, number>();
    for (const s of stations) {
      before.set(s.id, state.readings.get(s.id)?.length ?? 0);
    }
    state = tickSimulator(state, config);
    for (const s of stations) {
      const after = state.readings.get(s.id)?.length ?? 0;
      expect(after).toBeGreaterThan(before.get(s.id)!);
    }
  });

  it('cooling drifts above limit after repeated ticks', () => {
    let state = initSimulatorState(config);
    // Run up to 20 ticks — cooling should eventually breach
    for (let i = 0; i < 20; i++) {
      state = tickSimulator(state, config);
      if (state.coolingBreaching) break;
    }
    expect(state.coolingBreaching).toBe(true);
  });

  it('cooling temp approaches breach target', () => {
    let state = initSimulatorState(config);
    for (let i = 0; i < 20; i++) {
      state = tickSimulator(state, config);
    }
    expect(state.coolingTemp).toBeGreaterThan(COOLING_LIMIT);
  });

  it('non-cooling readings have values object with at least one key', () => {
    let state = initSimulatorState(config);
    state = tickSimulator(state, config);
    const list = state.readings.get('s-cooking')!;
    expect(Object.keys(list[0].values).length).toBeGreaterThan(0);
  });
});

describe('applyCorrectiveAction', () => {
  it('resets cooling temp to below limit', () => {
    // First get to a breaching state
    let state = initSimulatorState(config);
    for (let i = 0; i < 20; i++) {
      state = tickSimulator(state, config);
      if (state.coolingBreaching) break;
    }
    expect(state.coolingBreaching).toBe(true);

    const fixed = applyCorrectiveAction(state);
    expect(fixed.coolingBreaching).toBe(false);
    expect(fixed.coolingTemp).toBeLessThanOrEqual(COOLING_LIMIT);
  });

  it('sets driftingUp to false after corrective action', () => {
    let state = initSimulatorState(config);
    for (let i = 0; i < 20; i++) {
      state = tickSimulator(state, config);
      if (state.coolingBreaching) break;
    }
    const fixed = applyCorrectiveAction(state);
    expect(fixed.driftingUp).toBe(false);
  });
});
