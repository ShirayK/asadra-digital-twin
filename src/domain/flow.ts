import type { TwinDataset, ProcessEdge } from './schema';

export interface FlowSegment {
  from: { x: number; z: number };
  to: { x: number; z: number };
  edge: ProcessEdge;
}

/**
 * Builds a list of 3D floor-plane segments for all process edges.
 * Step position is resolved by:
 *   1. The station linked via stationId (station.position)
 *   2. The step's own position field
 * Edges where either endpoint has no resolvable position are silently skipped.
 */
export function buildFlowPaths(dataset: TwinDataset): FlowSegment[] {
  const { process, stations } = dataset;

  // Map from step id → {x, z} position
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const stepPositions = new Map<string, { x: number; z: number }>();

  for (const step of process.steps) {
    if (step.stationId) {
      const station = stationById.get(step.stationId);
      if (station) {
        stepPositions.set(step.id, { x: station.position.x, z: station.position.z });
        continue;
      }
    }
    if (step.position) {
      stepPositions.set(step.id, { x: step.position.x, z: step.position.z });
    }
  }

  const segments: FlowSegment[] = [];

  for (const edge of process.edges) {
    const from = stepPositions.get(edge.from);
    const to = stepPositions.get(edge.to);
    if (!from || !to) {
      continue; // skip edges with unresolvable positions
    }
    segments.push({ from, to, edge });
  }

  return segments;
}
