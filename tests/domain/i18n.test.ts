/**
 * Prompt 10 — i18n key parity test
 *
 * All locale JSON files must have exactly the same set of keys (recursively).
 * This catches missing translations early and enforces the Hebrew-first rule
 * (Hebrew is the reference; every other locale must match it exactly).
 */

import { describe, it, expect } from 'vitest';
import he from '../../src/i18n/he.json';
import en from '../../src/i18n/en.json';

/** Collect all dot-separated key paths from a nested object. */
function collectKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return [prefix];
  }
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    keys.push(...collectKeys(v, path));
  }
  return keys;
}

const heKeys = new Set(collectKeys(he));
const enKeys = new Set(collectKeys(en));

describe('i18n key parity', () => {
  it('en.json has every key that he.json has', () => {
    const missing = [...heKeys].filter((k) => !enKeys.has(k));
    expect(missing, `Keys in he.json missing from en.json: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('he.json has every key that en.json has', () => {
    const missing = [...enKeys].filter((k) => !heKeys.has(k));
    expect(missing, `Keys in en.json missing from he.json: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('both locale files have the same total key count', () => {
    expect(heKeys.size).toBe(enKeys.size);
  });
});
