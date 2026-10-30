import { describe, it, expect } from 'vitest';
import { getStationStatus } from '@/domain/status';
import type { Station, Reading } from '@/domain/schema';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    id: 'test-station',
    name: 'Test Station',
    controlType: 'CCP',
    position: { x: 0, z: 0 },
    fields: [
      { key: 'temp', label: 'Temperature', unit: '°C', min: 0, max: 5 },
    ],
    ...overrides,
  };
}

function makeReading(overrides: Partial<Reading> = {}): Reading {
  return {
    id: 'r-001',
    stationId: 'test-station',
    recordedAt: new Date().toISOString(),
    values: { temp: 3 },
    ...overrides,
  };
}

const NOW = new Date('2026-10-30T12:00:00.000Z');

// ── NO_DATA ───────────────────────────────────────────────────────────────────

describe('getStationStatus — NO_DATA', () => {
  it('returns NO_DATA when lastReading is null', () => {
    const station = makeStation();
    expect(getStationStatus(station, null, NOW)).toBe('NO_DATA');
  });

  it('returns NO_DATA when lastReading is undefined', () => {
    const station = makeStation();
    expect(getStationStatus(station, undefined, NOW)).toBe('NO_DATA');
  });
});

// ── STALE ─────────────────────────────────────────────────────────────────────

describe('getStationStatus — STALE', () => {
  it('returns STALE when reading is exactly 24h 1s old', () => {
    const station = makeStation();
    const reading = makeReading({
      recordedAt: new Date(NOW.getTime() - 24 * 3600 * 1000 - 1000).toISOString(),
    });
    expect(getStationStatus(station, reading, NOW)).toBe('STALE');
  });

  it('returns STALE when reading is 48h old', () => {
    const station = makeStation();
    const reading = makeReading({
      recordedAt: new Date(NOW.getTime() - 48 * 3600 * 1000).toISOString(),
    });
    expect(getStationStatus(station, reading, NOW)).toBe('STALE');
  });

  it('does NOT return STALE when reading is exactly 24h old (boundary — within threshold)', () => {
    const station = makeStation();
    // Exactly at the threshold boundary should NOT be stale (> not >=)
    const reading = makeReading({
      recordedAt: new Date(NOW.getTime() - 24 * 3600 * 1000).toISOString(),
    });
    // Should be OK or OUT_OF_RANGE — not STALE
    const status = getStationStatus(station, reading, NOW);
    expect(status).not.toBe('STALE');
  });
});

// ── OUT_OF_RANGE ──────────────────────────────────────────────────────────────

describe('getStationStatus — OUT_OF_RANGE', () => {
  it('returns OUT_OF_RANGE when value exceeds max', () => {
    const station = makeStation(); // max: 5
    const reading = makeReading({ values: { temp: 9 } });
    expect(getStationStatus(station, reading, NOW)).toBe('OUT_OF_RANGE');
  });

  it('returns OUT_OF_RANGE when value is below min', () => {
    const station = makeStation({
      fields: [{ key: 'temp', label: 'Temperature', unit: '°C', min: 90 }],
    });
    const reading = makeReading({ values: { temp: 85 } });
    expect(getStationStatus(station, reading, NOW)).toBe('OUT_OF_RANGE');
  });

  it('returns OUT_OF_RANGE when correctiveAction is non-empty', () => {
    const station = makeStation();
    const reading = makeReading({
      values: { temp: 3 }, // in range
      correctiveAction: 'כנס לקירור מהיר',
    });
    expect(getStationStatus(station, reading, NOW)).toBe('OUT_OF_RANGE');
  });

  it('does not treat whitespace-only correctiveAction as out-of-range', () => {
    const station = makeStation();
    const reading = makeReading({
      values: { temp: 3 },
      correctiveAction: '   ',
    });
    // whitespace-only is treated as empty → OK
    expect(getStationStatus(station, reading, NOW)).toBe('OK');
  });

  it('returns OUT_OF_RANGE when one of multiple field values is out of range', () => {
    const station = makeStation({
      fields: [
        { key: 'temp', label: 'Temperature', unit: '°C', min: 0, max: 5 },
        { key: 'ph', label: 'pH', unit: '', min: 4, max: 7 },
      ],
    });
    const reading = makeReading({ values: { temp: 3, ph: 8 } });
    expect(getStationStatus(station, reading, NOW)).toBe('OUT_OF_RANGE');
  });
});

// ── OK ────────────────────────────────────────────────────────────────────────

describe('getStationStatus — OK', () => {
  it('returns OK when reading is recent and all values within limits', () => {
    const station = makeStation(); // max: 5
    const reading = makeReading({ values: { temp: 3 } });
    expect(getStationStatus(station, reading, NOW)).toBe('OK');
  });

  it('returns OK when value is exactly at max (boundary)', () => {
    const station = makeStation(); // max: 5
    const reading = makeReading({ values: { temp: 5 } });
    expect(getStationStatus(station, reading, NOW)).toBe('OK');
  });

  it('returns OK when value is exactly at min (boundary)', () => {
    const station = makeStation(); // min: 0
    const reading = makeReading({ values: { temp: 0 } });
    expect(getStationStatus(station, reading, NOW)).toBe('OK');
  });

  it('returns OK when a field has no limits (only key/label)', () => {
    const station = makeStation({
      fields: [{ key: 'temp', label: 'Temperature' }],
    });
    const reading = makeReading({ values: { temp: 999 } });
    expect(getStationStatus(station, reading, NOW)).toBe('OK');
  });

  it('returns OK when a field in the station is absent from reading values', () => {
    const station = makeStation({
      fields: [
        { key: 'temp', label: 'Temperature', unit: '°C', min: 0, max: 5 },
        { key: 'ph', label: 'pH', unit: '', min: 4, max: 7 },
      ],
    });
    // Only 'temp' present; 'ph' is absent — not a violation
    const reading = makeReading({ values: { temp: 3 } });
    expect(getStationStatus(station, reading, NOW)).toBe('OK');
  });

  it('returns OK for a station with no fields', () => {
    const station = makeStation({ fields: [] });
    const reading = makeReading({ values: {} });
    expect(getStationStatus(station, reading, NOW)).toBe('OK');
  });
});
