/**
 * Client-side live CCP simulator.
 *
 * - Re-bases seed reading timestamps relative to now so all readings appear
 *   fresh (not STALE).
 * - Every 3 s emits one new reading per station with small noise, keeping all
 *   stations OK — except the cooling CCP (s-cooling) which drifts toward 9 °C
 *   and triggers an OUT_OF_RANGE breach.
 * - Corrective action callback resets the cooling station back to 3 °C and
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
  /** Total ticks since init (drives the periodic STALE episode) */
  tickCount?: number;
  /** Ticks elapsed since the last corrective action (null = none pending) */
  ticksSinceCorrective?: number | null;
  /** Station currently simulated as STALE (sensor dropout), if any */
  staleStationId?: string | null;
  /** Remaining ticks of the current STALE episode */
  staleTicksLeft?: number;
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
const COOLING_LIMIT = 5; // °C — matches seed critical limit (s-cooling max)
const COOLING_BREACH_TARGET = 9; // °C — drifts to this then holds
/** After a corrective action, cooling resumes drifting after this many ticks
 * (6 × 3 s ≈ 18 s, then ~6 ticks of drift → breach again ≈ 45 s later). */
const RESUME_DRIFT_AFTER_TICKS = 6;
/** Every N ticks a non-cooling CCP sensor drops out briefly (STALE). */
const STALE_EVERY_TICKS = 20;
const STALE_DURATION_TICKS = 3;
const STALE_STATION_ID = 's-cooking';
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
  const tickCount = (prev.tickCount ?? 0) + 1;
  let ticksSinceCorrective = prev.ticksSinceCorrective ?? null;
  if (ticksSinceCorrective !== null) {
    ticksSinceCorrective += 1;
    if (ticksSinceCorrective >= RESUME_DRIFT_AFTER_TICKS) {
      driftingUp = true; // cycle: equipment drifts again → new breach
      ticksSinceCorrective = null;
    }
  }
  // Periodic sensor dropout on another CCP
  let staleStationId = prev.staleStationId ?? null;
  let staleTicksLeft = prev.staleTicksLeft ?? 0;
  if (staleTicksLeft > 0) {
    staleTicksLeft -= 1;
    if (staleTicksLeft === 0) staleStationId = null;
  } else if (tickCount % STALE_EVERY_TICKS === 0 && config.stations.some((s) => s.id === STALE_STATION_ID)) {
    staleStationId = STALE_STATION_ID;
    staleTicksLeft = STALE_DURATION_TICKS;
  }
  if (driftingUp) {
    coolingTemp = Math.min(coolingTemp + 0.4 + noise(0.1), COOLING_BREACH_TARGET);
  } else {
    // After corrective action: snap down
    coolingTemp = Math.max(coolingTemp - 1.5 + noise(0.05), 1);
    if (coolingTemp <= COOLING_LIMIT) driftingUp = false; // stay low
  }

  const coolingBreaching = coolingTemp > COOLING_LIMIT;

  for (const station of config.stations) {
    if (station.id === staleStationId) continue; // no reading while sensor is offline
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

  return { readings, coolingBreaching, coolingTemp, driftingUp, tickCount, ticksSinceCorrective, staleStationId, staleTicksLeft };
}

/**
 * Apply corrective action: reset cooling temp to within-range and mark drift down.
 */
export function applyCorrectiveAction(prev: SimulatorState): SimulatorState {
  return {
    ...prev,
    coolingTemp: COOLING_LIMIT - 2, // 3 °C — clearly back in range
    driftingUp: false,
    coolingBreaching: false,
    ticksSinceCorrective: 0,
  };
}

export { RESUME_DRIFT_AFTER_TICKS, STALE_EVERY_TICKS, STALE_DURATION_TICKS, STALE_STATION_ID };
export { TICK_MS, COOLING_STATION_ID, COOLING_BREACH_TARGET, COOLING_LIMIT };
