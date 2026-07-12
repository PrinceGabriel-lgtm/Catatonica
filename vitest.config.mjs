/* ─── PASS 2.8 — permanent test suite config ───
   Deliberately separate from vite.config.mjs: tests don't want the
   passthrough plugin or MPA inputs. happy-dom gives module imports a
   DOM (several modules register listeners at import time). */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
  },
});
