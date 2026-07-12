# CLAUDE.md — Catatonica

> This file is tracked in a PUBLIC repo. Product doctrine and engineering discipline only.
> Personal/founder context lives outside the repo. Secrets never appear here or anywhere in the repo.

## What this is

**Catatonica** — a stillness practice for high-intensity minds. *"The Art of Doing Nothing."*
Not a timer. Not a meditation app. A discipline: named, tracked, earned.
Live at https://catatonica.app. Vanilla HTML/CSS/JS — no UI framework, and **zero runtime dependencies shipped to the user**. Since Pass 2.8 (THE VESSEL) the repo builds with Vite (dev-only, multi-page mode) and tests with Vitest; the output is still plain static files. Do not add UI frameworks or runtime npm deps — dev-tooling stays minimal and the shipped page stays vanilla.

## Locked vocabulary — use verbatim, never paraphrase

- **Cataton** — the unit of earned stillness. 1 Cataton = 1 minute.
- **Situation** — what the user is carrying. Named, not solved.
- **Planned Obsolescence** — the ritual of release.
- **The Chronicle** — the persistent practice record.
- **The Order of the Still Voice** — the doctrine/community layer.
- **The Field** — the medium of becoming, modeled on the Higgs field. Load-bearing doctrine: session visuals are a cosmological event (broken void → clumping → warmth → star), never decoration.

## Sacred markers — never modify, verify after every pass

1. The founder's-note CSS comment ("A deep that represents the abyss…") — present in `index.html`, `app.html`, `chronicle.html`, `session.html` (each page head) AND `src/styles/tokens.css`. Never edit, never let it drop out of a rewrite.
2. The IP footer notice on public pages.
3. `doctrine/` — tracked in git deliberately. It is the timestamped IP anchor. Never delete, never "clean up".
4. The palette `:root` variables — retone only inside an approved pass.

## Sources of truth — read, don't recall

Old context docs drift. Never quote versions, colors, file lists, or cache names from memory or from planning docs — read them from the repo in-session:

- Design tokens: the `:root` block of the page you're editing (`index.html` is canonical for the landing).
- Service-worker cache version: `sw.js` (`CACHE` constant).
- What shipped last: `git log --oneline -5`.
- Roadmap and pass specs: `notes/` (gitignored, local-only planning docs).

Known corrections to older planning docs (verified 2026-07-10): the session file is `session.html` only (the `catatonica-session.html` alias no longer exists — keep `sw.js` and all links pointing at `session.html`); sw cache is `catatonica-v3`; `chronicle.html` exists; the landing `--void` is Prussian `#0d1b2a`.

## Repo map

| File | Role |
|---|---|
| `index.html` | Landing page shell — head, founder's note, markup (Vite entry) |
| `app.html` | Dashboard shell — markup + Collapse receiver + Turnstile trampoline |
| `session.html` | Session shell — **behavior locked**; markup only since Pass 2.8 |
| `chronicle.html` | The Chronicle shell |
| `src/styles/` | `tokens.css` (founder's note + app `:root`), one CSS file per page |
| `src/lib/` | `state.js` (S object), `supabase.js` (client+constants), `ui.js`, `auth.js` (all 5 flows), `data.js` (loadData + **no-loss protocol**) |
| `src/views/` | `router.js` (view state machine), `intro.js`, `dashboard.js`, `overlays.js` |
| `src/engines/` | `void-ambient.js` (palette is constructor input), `spiral-landing.js` (2.5A galaxy), `void-sounds.js` (unwired until Pass 3) — **load-bearing; do not modify outside a dedicated pass** |
| `src/*-main.js` | Per-page entry modules (app-main wires lib+views; others hold page logic verbatim) |
| `sw.js` | Hand-rolled service worker — bump `CACHE` on every deploy; `OFFLINE_ASSETS` must match dist paths (`npm test` enforces) |
| `vite.config.mjs` | MPA entries, unhashed output names (sw contract), passthrough copies |
| `tests/` | Vitest suite — run `npm test` before every commit |
| `manifest.json`, icons | PWA shell |
| `terms/privacy/refund.html` | Legal pages |
| `supabase-migration-security.sql` | RLS migration reference |
| `doctrine/` | Public IP anchor (tracked, deploy-excluded) |
| `notes/` | Local planning docs (gitignored, deploy-excluded) |

## Stack

Cloudflare Pages (hosting) · Supabase magic-link auth · Stripe sandbox (live processing from Namibia unresolved; Paystack is the next candidate) · PWA (manifest + sw).

## Working discipline (locked by the founder — non-negotiable)

1. **Survey first.** Read-only scout, report what exists, then propose the smallest diff. Stop and report before any destructive edit.
2. **Work in passes.** One pass per session. Whole-number passes are architectural; point passes (X.Y, X.Y.Z) are surgical. Don't start a pass you can't finish.
3. **Smallest possible diff.** No drive-by refactors, no "while I was here."
4. **Root-cause before fix.** The first plausible explanation is often wrong (precedent: the 2.5A.3 nav bug was a CSS cascade override, not a missing `position: sticky`).
5. **Verification ladder before "done":**
   - `npm run build` green, then `npm test` green;
   - serve the BUILD (`npm run preview`) and exercise the change in a real browser — dist is what ships, not the source tree;
   - parity when restructuring: identical probes against production and the preview must return identical results (computed styles, CSS rule counts, click-through state transitions);
   - test incognito + `prefers-reduced-motion` + mobile emulation;
   - confirm all sacred markers intact (see `doctrine-check` skill) — in source AND in dist;
   - re-read the whole diff as a hostile reviewer.
6. **Git protocol:** show `git status` + diff summary at the end of a pass. **Do not commit or push unless told "commit and push."** The founder commits; a commit exists only when its hash is on origin.
7. **Deploy** (founder-approved, after live verification): `npm run build`, bump `sw.js` CACHE version, then `npx wrangler pages deploy dist --project-name=catatonica --branch=main`. Branch previews: same command with `--branch=<branch>` — never touches production.
8. When something feels weird, stop and ask. Don't retry harder.

## Design floor

- The void is alive, not black. Deep-space Prussian field, warm gold Cataton accents, cool teal periphery — read exact values from `:root`.
- Fonts: Cormorant Garamond (display) + DM Mono (labels) + Outfit (body).
- Accessibility is floor, not polish: `prefers-reduced-motion` fallbacks on every animation, WCAG AA contrast, 44px touch targets, real labels.
- Performance: particle work must hold 60fps on mobile; halve particle counts on small screens (existing pattern in the 2.5A IIFE).
- Best visuals are the ones you don't watch. The user is meant to sit, not consume. When in doubt, subtract.
