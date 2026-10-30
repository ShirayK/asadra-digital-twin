import type { TwinDataset, Station } from '../domain/schema';

const OVERLAY_KEY = 'asadra-twin-layout-overlay';

export interface LayoutOverlay {
  stationPositions: Record<string, { x: number; z: number; rotationY?: number }>;
}

/**
 * Merges a saved layout overlay from localStorage onto a base TwinDataset.
 * Readings are never modified by the overlay (append-only constraint).
 * Safe to call on the server with an empty overlay.
 */
export function mergeOverlay(base: TwinDataset, overlay: LayoutOverlay): TwinDataset {
  return {
    ...base,
    stations: base.stations.map((station: Station) => {
      const override = overlay.stationPositions[station.id];
      if (!override) return station;
      return {
        ...station,
        position: {
          ...station.position,
          ...override,
        },
      };
    }),
  };
}

/**
 * Loads the layout overlay from localStorage (browser only).
 * Returns an empty overlay if not found or on parse error.
 */
export function loadOverlay(): LayoutOverlay {
  if (typeof window === 'undefined') return { stationPositions: {} };
  try {
    const raw = localStorage.getItem(OVERLAY_KEY);
    if (!raw) return { stationPositions: {} };
    return JSON.parse(raw) as LayoutOverlay;
  } catch {
    return { stationPositions: {} };
  }
}

/**
 * Saves the layout overlay to localStorage (browser only).
 */
export function saveOverlay(overlay: LayoutOverlay): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay));
}

/**
 * Clears the layout overlay from localStorage (browser only).
 */
export function clearOverlay(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OVERLAY_KEY);
}
