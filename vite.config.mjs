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
import { copyFileSync, mkdirSync } from 'node:fs';

const root = dirname(fileURLToPath(import.meta.url));

// Deployed files Vite won't see as graph assets: copied verbatim.
// sw.js caches /app.html and /session.html by literal path — filenames
// in dist must never change.
// Engines live in src/engines and are bundled as modules since Day 3.
const PASSTHROUGH = [
  'sw.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
];

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Everything ships unhashed at stable paths: sw.js precaches by
        // literal path (OFFLINE_ASSETS), and cache-busting is the CACHE
        // version bump on every deploy — the hand-rolled sw contract.
        assetFileNames: '[name][extname]',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
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
      writeBundle() {
        mkdirSync(resolve(root, 'dist'), { recursive: true });
        for (const f of PASSTHROUGH) {
          copyFileSync(resolve(root, f), resolve(root, 'dist', f));
        }
      },
    },
  ],
});
