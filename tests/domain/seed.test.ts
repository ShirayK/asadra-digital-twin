/**
 * tests/domain/seed.test.ts
 *
 * Validates that data/seed/hummus-plant.json conforms to TwinDatasetSchema
 * and that the demo seed contains the required demo features (Prompt 2):
 *   - One out-of-range cooling reading (9°C > 5°C limit with corrective action)
 *   - An edge from a non-CCP step in a RAW/LOW_RISK zone to a HIGH_CARE zone
 *     (fires RAW_TO_HIGH_CARE_WITHOUT_CCP)
 *   - An edge from a SESAME zone to a non-SESAME zone
 *     (fires ALLERGEN_CROSS_CONTACT)
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { TwinDatasetSchema, type TwinDataset } from '@/domain/schema';
import seedJson from '../../data/seed/hummus-plant.json';

// ──────────────────────────────────────────────────────────────────────────────
// Parse once and assert valid
// ──────────────────────────────────────────────────────────────────────────────

const parseResult = TwinDatasetSchema.safeParse(seedJson);
const seed: TwinDataset = parseResult.success ? parseResult.data : ({} as TwinDataset);

describe('hummus-plant.json seed', () => {
  it('passes zod schema validation', () => {
    if (!parseResult.success) {
      console.error(parseResult.error.format());
    }
    expect(parseResult.success).toBe(true);
  });

  it('contains exactly 20 readings', () => {
    expect(seed.readings).toHaveLength(20);
  });

  it('has a valid SHA-256 hash chain', () => {
    const GENESIS = '0'.repeat(64);
    let prevHash = GENESIS;

    for (const reading of seed.readings) {
      // prevHash of first reading must be genesis
      expect(reading.prevHash).toBe(prevHash);

      // Recompute expected hash
      const input = reading.prevHash + reading.stationId + reading.recordedAt + JSON.stringify(reading.values);
      const expected = createHash('sha256').update(input, 'utf8').digest('hex');
      expect(reading.hash).toBe(expected);

      prevHash = reading.hash!;
    }
  });

  it('includes at least one out-of-range cooling reading (9°C with corrective action)', () => {
    const outOfRange = seed.readings.find(
      (r) => r.stationId === 's-cooling' && r.values['temp'] === 9 && r.correctiveAction,
    );
    expect(outOfRange).toBeDefined();
    expect(outOfRange!.values['temp']).toBe(9);
    expect(outOfRange!.correctiveAction).toBeTruthy();
  });

  it('has an edge from a non-CCP step in RAW/LOW_RISK zone to a HIGH_CARE zone', () => {
    const stationById = Object.fromEntries(seed.stations.map((s) => [s.id, s]));
    const stepById = Object.fromEntries(seed.process.steps.map((s) => [s.id, s]));
    const zoneById = Object.fromEntries(seed.zones.map((z) => [z.id, z]));

    const separationEdge = seed.process.edges.find((edge) => {
      const fromStep = stepById[edge.from];
      const toStep = stepById[edge.to];
      if (!fromStep || !toStep) return false;

      // Resolve source zone via station
      const fromStation = fromStep.stationId ? stationById[fromStep.stationId] : undefined;
      const fromZoneId = fromStation?.zoneId ?? fromStep.position ? undefined : undefined;
      const fromZone = fromStation?.zoneId ? zoneById[fromStation.zoneId] : undefined;

      // Resolve destination zone via station
      const toStation = toStep.stationId ? stationById[toStep.stationId] : undefined;
      const toZone = toStation?.zoneId ? zoneById[toStation.zoneId] : undefined;

      if (!fromZone || !toZone) return false;

      const fromIsRawOrLow = fromZone.hygieneClass === 'RAW' || fromZone.hygieneClass === 'LOW_RISK';
      const toIsHighCare = toZone.hygieneClass === 'HIGH_CARE';
      // Source step must NOT be CCP (fromStation controlType !== 'CCP')
      const sourceIsNotCCP = fromStation?.controlType !== 'CCP';

      return fromIsRawOrLow && toIsHighCare && sourceIsNotCCP;
    });

    expect(separationEdge).toBeDefined();
  });

  it('has an edge from a SESAME zone to a zone without SESAME', () => {
    const stationById = Object.fromEntries(seed.stations.map((s) => [s.id, s]));
    const stepById = Object.fromEntries(seed.process.steps.map((s) => [s.id, s]));
    const zoneById = Object.fromEntries(seed.zones.map((z) => [z.id, z]));

    const allergenEdge = seed.process.edges.find((edge) => {
      const fromStep = stepById[edge.from];
      const toStep = stepById[edge.to];
      if (!fromStep || !toStep) return false;

      const fromStation = fromStep.stationId ? stationById[fromStep.stationId] : undefined;
      const toStation = toStep.stationId ? stationById[toStep.stationId] : undefined;

      const fromZone = fromStation?.zoneId ? zoneById[fromStation.zoneId] : undefined;
      const toZone = toStation?.zoneId ? zoneById[toStation.zoneId] : undefined;

      if (!fromZone || !toZone) return false;

      return fromZone.allergenCodes.includes('SESAME') && !toZone.allergenCodes.includes('SESAME');
    });

    expect(allergenEdge).toBeDefined();
  });

  it('site is 30x20 metres', () => {
    expect(seed.site.widthM).toBe(30);
    expect(seed.site.depthM).toBe(20);
  });

  it('has exactly 6 zones covering the required hygiene classes', () => {
    const classes = seed.zones.map((z) => z.hygieneClass);
    expect(classes).toContain('RAW');
    expect(classes).toContain('LOW_RISK');
    expect(classes).toContain('HIGH_CARE');
    expect(classes).toContain('PACKAGING');
    expect(classes).toContain('STORAGE');
  });

  it('has at least one CCP station for cooking (min 90°C)', () => {
    const cooking = seed.stations.find((s) => s.id === 's-cooking');
    expect(cooking).toBeDefined();
    expect(cooking!.controlType).toBe('CCP');
    const tempField = cooking!.fields.find((f) => f.key === 'temp');
    expect(tempField?.min).toBe(90);
  });

  it('has at least one CCP station for cooling (max 5°C)', () => {
    const cooling = seed.stations.find((s) => s.id === 's-cooling');
    expect(cooling).toBeDefined();
    expect(cooling!.controlType).toBe('CCP');
    const tempField = cooling!.fields.find((f) => f.key === 'temp');
    expect(tempField?.max).toBe(5);
  });
});
