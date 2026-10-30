import path from 'path';
import fs from 'fs/promises';
import { TwinDatasetSchema, type TwinDataset } from '../domain/schema';
import type { TwinDataSource } from './types';

/**
 * Loads a TwinDataset from a local JSON seed file and validates it with Zod.
 * Server-side only — uses Node.js `fs`.
 */
export class JsonFileSource implements TwinDataSource {
  private readonly filePath: string;

  constructor(relativePath: string) {
    this.filePath = path.resolve(process.cwd(), relativePath);
  }

  async load(): Promise<TwinDataset> {
    const raw = await fs.readFile(this.filePath, 'utf-8');
    const json: unknown = JSON.parse(raw);
    return TwinDatasetSchema.parse(json);
  }
}

/**
 * Default source: the hummus plant demo seed.
 */
export function createDefaultSource(): TwinDataSource {
  return new JsonFileSource('data/seed/hummus-plant.json');
}
