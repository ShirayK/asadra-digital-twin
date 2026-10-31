/**
 * Client-side live CCP simulator.
 *
 * - Re-bases seed reading timestamps relative to now so all readings appear
 *   fresh (not STALE).
 * - Every 3 s emits one new reading per station with small noise, keeping all
 *   stations OK — except the cooling CCP (s-cooling) which drifts toward 9 °C
 *   and triggers an OUT_OF_RANGE breach.
 * - Corrective action callback resets the cooling station back to ≤ 4 °C and
 *   marks it OK.
 *
 * Pure domain module: no React, no I/O — only deterministic logic +
 * Math.random() noise. The simulation state is passed in/out so the caller
 * (twin-view) stays in full control.
 */

import type { Reading, Station } from './schema';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SimReading extends Omit<Reading, 'hash' | 'prevHash'> {
  hash?: string;
  prevHash?: string;
}

export interface SimulatorState {
  /** Current simulated readings, newest-first per station */
  readings: Map<string, SimReading[]>;
  /** Whether the cooling CCP is currently breaching */
  coolingBreaching: boolean;
  /** Current simulated cooling temp */
  coolingTemp: number;
  /** Drift direction: true = drifting up (toward breach) */
  driftingUp: boolean;
}

export interface SimulatorConfig {
  /** Stations from the seed dataset */
  stations: Station[];
  /** Seed readings (used only once to initialise the timestamp window) */
  seedReadings: Reading[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TICK_MS = 3_000;
const COOLING_STATION_ID = 's-cooling';
const COOLING_LIMIT = 4; // °C — must stay ≤ this
const COOLING_BREACH_TARGET = 9; // °C — drifts to this then holds
const NOISE_AMPLITUDE = 0.2; // ± °C for non-drifting stations

// ── Initialiser ───────────────────────────────────────────────────────────────

/**
 * Build an initial SimulatorState by rebasing all seed readings so their
 * timestamps are within the last 30 minutes (all appear "fresh", not STALE).
 */
export function initSimulatorState(config: SimulatorConfig): SimulatorState {
  const now = Date.now();
  const readings = new Map<string, SimReading[]>();

  // Group seed readings by station, sort newest-first, and rebase timestamps
  const byStation = new Map<string, Reading[]>();
  for (const r of config.seedReadings) {
    const list = byStation.get(r.stationId) ?? [];
    list.push(r);
    byStation.set(r.stationId, list);
  }

  for (const [stationId, list] of byStation) {
    const sorted = list.slice().sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
    // Rebase: most recent reading gets now-5s, older ones step back 3 min each
    const rebased: SimReading[] = sorted.map((r, i) => ({
      ...r,
      recordedAt: new Date(now - 5_000 - i * 3 * 60_000).toISOString(),
    }));
    readings.set(stationId, rebased);
  }

  // Ensure every station has at least an empty list
  for (const s of config.stations) {
    if (!readings.has(s.id)) {
      readings.set(s.id, []);
    }
  }

  // Cooling starts within-range at 3 °C, about to drift up
  const coolingTemp = 3;
  return { readings, coolingBreaching: false, coolingTemp, driftingUp: true };
}

// ── Tick ──────────────────────────────────────────────────────────────────────

/** Small deterministic-ish noise: ±amplitude */
function noise(amplitude: number): number {
  return (Math.random() - 0.5) * 2 * amplitude;
}

/**
 * Advance the simulation by one tick.
 * Returns the new state (immutable update — previous state is not mutated).
 */
export function tickSimulator(
  prev: SimulatorState,
  config: SimulatorConfig,
  now: Date = new Date(),
): SimulatorState {
  const readings = new Map(prev.readings);

  // Drift cooling temp
  let { coolingTemp, driftingUp } = prev;
  if (driftingUp) {
    coolingTemp = Math.min(coolingTemp + 0.5 + noise(0.1), COOLING_BREACH_TARGET);
  } else {
    // After corrective action: snap down
    coolingTemp = Math.max(coolingTemp - 1.5 + noise(0.05), 1);
    if (coolingTemp <= COOLING_LIMIT) driftingUp = false; // stay low
  }

  const coolingBreaching = coolingTemp > COOLING_LIMIT;

  for (const station of config.stations) {
    const prev_list = readings.get(station.id) ?? [];
    let values: Record<string, number>;

    if (station.id === COOLING_STATION_ID) {
      values = { temp: parseFloat(coolingTemp.toFixed(1)) };
    } else {
      // Generate a within-range value with small noise
      const field = station.fields[0];
      if (!field) continue;
      const mid =
        field.min !== undefined && field.max !== undefined
          ? (field.min + field.max) / 2
          : field.max !== undefined
            ? field.max - 1
            : field.min !== undefined
              ? field.min + 1
              : 1;
      const value = mid + noise(NOISE_AMPLITUDE);
      // For boolean-ish fields (test_passed, seal_ok), keep at 1
      values = { [field.key]: field.key === 'temp' || field.key === 'duration_h' ? parseFloat(value.toFixed(1)) : 1 };
    }

    const newReading: SimReading = {
      id: `sim-${station.id}-${now.getTime()}`,
      stationId: station.id,
      recordedAt: now.toISOString(),
      values,
    };

    // Prepend (newest-first), keep last 20
    readings.set(station.id, [newReading, ...prev_list].slice(0, 20));
  }

  return { readings, coolingBreaching, coolingTemp, driftingUp };
}

/**
 * Apply corrective action: reset cooling temp to within-range and mark drift down.
 */
export function applyCorrectiveAction(prev: SimulatorState): SimulatorState {
  return {
    ...prev,
    coolingTemp: COOLING_LIMIT - 1, // 3 °C — clearly back in range
    driftingUp: false,
    coolingBreaching: false,
  };
}

export { TICK_MS, COOLING_STATION_ID, COOLING_BREACH_TARGET, COOLING_LIMIT };
