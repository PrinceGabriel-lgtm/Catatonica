// ─── VoidAmbient public API surface ───
// The engine is imported by app-main, router, and data — if a rename or
// refactor drops one of these methods, the typeof guards that used to
// protect callers are gone (module import means it's always "defined"),
// so this asserts the contract explicitly.
import { describe, it, expect } from 'vitest';
import { VoidAmbient } from '../src/engines/void-ambient.js';

describe('VoidAmbient API', () => {
  it('exposes the methods its importers call', () => {
    for (const fn of ['init', 'start', 'pulse', 'setIntensity', 'setCatatons']) {
      expect(typeof VoidAmbient[fn], `VoidAmbient.${fn}`).toBe('function');
    }
  });
});
