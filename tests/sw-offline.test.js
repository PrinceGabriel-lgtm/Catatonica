// ─── sw.js ↔ build output consistency ───
// The service worker precaches OFFLINE_ASSETS by literal path. Pages no
// longer inline their CSS/JS, so every local path listed MUST exist in
// dist/ or offline-first-visit silently breaks (caught by hand in Pass
// 2.8 Day 3 — this test makes the catch permanent). Run `npm run build`
// first; the test skips when dist/ is absent.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(resolve(root, 'sw.js'), 'utf8');
const hasDist = existsSync(resolve(root, 'dist'));

describe('sw.js offline contract', () => {
  it('declares a versioned cache name', () => {
    expect(sw).toMatch(/const CACHE = 'catatonica-v\d+'/);
  });

  it('still precaches session.html by its real name (no dead aliases)', () => {
    expect(sw).toContain("'/session.html'");
    expect(sw).not.toContain('catatonica-session');
  });

  it.skipIf(!hasDist)('every local OFFLINE_ASSETS path exists in dist/', () => {
    const paths = [...sw.matchAll(/'(\/[^']+)'/g)].map(m => m[1]);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(existsSync(resolve(root, 'dist' + p)), `missing in dist: ${p}`).toBe(true);
    }
  });
});
