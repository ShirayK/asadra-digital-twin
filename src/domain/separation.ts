import type { TwinDataset, Zone } from './schema';

export type SeparationIssueKind = 'RAW_TO_HIGH_CARE_WITHOUT_CCP' | 'ALLERGEN_CROSS_CONTACT';

export interface SeparationIssue {
  kind: SeparationIssueKind;
  fromStepId: string;
  toStepId: string;
  /** For ALLERGEN_CROSS_CONTACT: the allergen code responsible */
  allergenCode?: string;
}

/** Returns true if point (px, pz) is inside the zone rectangle (center + half-size). */
function pointInZone(zone: Zone, px: number, pz: number): boolean {
  const halfW = zone.width / 2;
  const halfD = zone.depth / 2;
  return (
    px >= zone.x - halfW &&
    px <= zone.x + halfW &&
    pz >= zone.z - halfD &&
    pz <= zone.z + halfD
  );
}

/**
 * Resolves the zone for a given {x, z} position.
 * If no zone contains the point, returns undefined.
 */
function resolveZoneForPoint(
  zones: Zone[],
  x: number,
  z: number,
): Zone | undefined {
  return zones.find((zone) => pointInZone(zone, x, z));
}

/**
 * Finds food-safety separation issues in the dataset:
 *
 * 1. RAW_TO_HIGH_CARE_WITHOUT_CCP: an edge whose source step is NOT a CCP step and whose
 *    source zone is RAW or LOW_RISK and whose destination zone is HIGH_CARE.
 *
 * 2. ALLERGEN_CROSS_CONTACT: an edge from a zone that carries allergen A to a zone
 *    that does NOT carry allergen A.
 *
 * Zone resolution: use station.zoneId if the step has a stationId; otherwise resolve by
 * point-in-rectangle against the step/station position.
 */
export function findSeparationIssues(dataset: TwinDataset): SeparationIssue[] {
  const { zones, stations, process } = dataset;

  const stationById = new Map(stations.map((s) => [s.id, s]));
  const stepById = new Map(process.steps.map((s) => [s.id, s]));
  const zoneById = new Map(zones.map((z) => [z.id, z]));

  /** Resolves the Zone for a given step id. Returns undefined if unresolvable. */
  function getZoneForStep(stepId: string): Zone | undefined {
    const step = stepById.get(stepId);
    if (!step) return undefined;

    if (step.stationId) {
      const station = stationById.get(step.stationId);
      if (station) {
        // Prefer explicit zoneId
        if (station.zoneId) {
          return zoneById.get(station.zoneId);
        }
        // Fall back to position-based resolution
        return resolveZoneForPoint(zones, station.position.x, station.position.z);
      }
    }

    // No station — use step.position if available
    if (step.position) {
      return resolveZoneForPoint(zones, step.position.x, step.position.z);
    }

    return undefined;
  }

  const issues: SeparationIssue[] = [];

  for (const edge of process.edges) {
    const fromStep = stepById.get(edge.from);
    if (!fromStep) continue;

    const fromZone = getZoneForStep(edge.from);
    const toZone = getZoneForStep(edge.to);

    if (!fromZone || !toZone) continue;

    // ── Check 1: RAW_TO_HIGH_CARE_WITHOUT_CCP ───────────────────────────────
    const fromIsLowHygiene =
      fromZone.hygieneClass === 'RAW' || fromZone.hygieneClass === 'LOW_RISK';
    const toIsHighCare = toZone.hygieneClass === 'HIGH_CARE';
    const fromStepIsCCP = fromStep.type === 'CCP';

    if (fromIsLowHygiene && toIsHighCare && !fromStepIsCCP) {
      issues.push({
        kind: 'RAW_TO_HIGH_CARE_WITHOUT_CCP',
        fromStepId: edge.from,
        toStepId: edge.to,
      });
    }

    // ── Check 2: ALLERGEN_CROSS_CONTACT ─────────────────────────────────────
    for (const allergenCode of fromZone.allergenCodes) {
      if (!toZone.allergenCodes.includes(allergenCode)) {
        issues.push({
          kind: 'ALLERGEN_CROSS_CONTACT',
          fromStepId: edge.from,
          toStepId: edge.to,
          allergenCode,
        });
      }
    }
  }

  return issues;
}
