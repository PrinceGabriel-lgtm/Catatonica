/* ─── PASS 2.8 THE VESSEL — Day 0 scaffold ───
   Wraps the EXISTING pages untouched. All seven HTML files are entries;
   inline non-module scripts pass through as-is. Static assets that Vite
   does not process (plain-script engines, sw, PWA shell) are copied
   verbatim into dist so the output matches the live site byte-for-byte
   in behavior. No page content is transformed beyond what Vite's HTML
   entry handling requires. */
import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFileSync } from 'node:fs';

const root = dirname(fileURLToPath(import.meta.url));

// Deployed files Vite won't see as graph assets: copied verbatim.
// sw.js caches /app.html and /session.html by literal path — filenames
// in dist must never change.
// void-sounds.js stays in the repo (Pass 3 ports it to /engines) but is
// referenced by no page, so it does not ship.
const PASSTHROUGH = [
  'sw.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'void-ambient.js',
];

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Keep referenced assets (manifest.json) at their original
        // root path, unhashed — sw.js caches '/manifest.json' literally.
        assetFileNames: '[name][extname]',
      },
      input: {
        index: resolve(root, 'index.html'),
        app: resolve(root, 'app.html'),
        session: resolve(root, 'session.html'),
        chronicle: resolve(root, 'chronicle.html'),
        terms: resolve(root, 'terms.html'),
        privacy: resolve(root, 'privacy.html'),
        refund: resolve(root, 'refund.html'),
      },
    },
  },
  plugins: [
    {
      name: 'catatonica-passthrough',
      closeBundle() {
        for (const f of PASSTHROUGH) {
          copyFileSync(resolve(root, f), resolve(root, 'dist', f));
        }
      },
    },
  ],
});
