import type { Reading } from './schema';

export interface ChainVerificationResult {
  valid: boolean;
  /** Index of the first invalid link (0-based), or -1 if chain is valid / empty */
  firstInvalidIndex: number;
}

/**
 * Computes SHA-256 of `input` using the Web Crypto API.
 * Returns a lower-case hex string.
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies the integrity of an append-only reading chain.
 *
 * Each reading's hash is expected to equal:
 *   sha256(prevHash + stationId + recordedAt + JSON.stringify(values))
 *
 * Readings without a `hash` field are skipped (considered unverified, not invalid).
 *
 * Returns `{ valid: true, firstInvalidIndex: -1 }` if all hashed readings verify,
 * or `{ valid: false, firstInvalidIndex: N }` for the first broken link.
 */
export async function verifyReadingChain(
  readings: Reading[],
): Promise<ChainVerificationResult> {
  for (let i = 0; i < readings.length; i++) {
    const reading = readings[i];

    // Skip readings that have no hash (unverified, not invalid)
    if (!reading.hash) {
      continue;
    }

    const prevHash = reading.prevHash ?? '';
    const input = prevHash + reading.stationId + reading.recordedAt + JSON.stringify(reading.values);
    const expected = await sha256(input);

    if (expected !== reading.hash) {
      return { valid: false, firstInvalidIndex: i };
    }
  }

  return { valid: true, firstInvalidIndex: -1 };
}
