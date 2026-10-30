import type { Station, Reading } from './schema';

export type StationStatus = 'OK' | 'OUT_OF_RANGE' | 'NO_DATA' | 'STALE';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Determines the status of a station based on its last reading.
 *
 * - NO_DATA: no reading provided
 * - STALE: reading is older than 24 hours relative to `now`
 * - OUT_OF_RANGE: any field value violates its min/max, or correctiveAction is non-empty
 * - OK: reading is recent and all values are within limits
 */
export function getStationStatus(
  station: Station,
  lastReading: Reading | null | undefined,
  now: Date,
): StationStatus {
  if (!lastReading) {
    return 'NO_DATA';
  }

  const recordedAt = new Date(lastReading.recordedAt);
  if (now.getTime() - recordedAt.getTime() > STALE_THRESHOLD_MS) {
    return 'STALE';
  }

  // Non-empty correctiveAction signals out-of-range
  if (lastReading.correctiveAction && lastReading.correctiveAction.trim() !== '') {
    return 'OUT_OF_RANGE';
  }

  // Check each field value against its limits
  for (const field of station.fields) {
    const value = lastReading.values[field.key];
    if (value === undefined) {
      continue; // field not present in this reading — not a violation
    }
    if (field.min !== undefined && value < field.min) {
      return 'OUT_OF_RANGE';
    }
    if (field.max !== undefined && value > field.max) {
      return 'OUT_OF_RANGE';
    }
  }

  return 'OK';
}
