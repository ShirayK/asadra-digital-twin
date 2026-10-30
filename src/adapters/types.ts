import type { TwinDataset } from '../domain/schema';

/**
 * Abstraction for loading a TwinDataset.
 * MVP implementations: JsonFileSource, LocalOverlaySource.
 * Future (NOT in MVP): AsadraApiSource — see docs/INTEGRATION.md.
 */
export interface TwinDataSource {
  load(): Promise<TwinDataset>;
}
