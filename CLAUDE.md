# CLAUDE.md — Catatonica

> This file is tracked in a PUBLIC repo. Product doctrine and engineering discipline only.
> Personal/founder context lives outside the repo. Secrets never appear here or anywhere in the repo.

## What this is

**Catatonica** — a stillness practice for high-intensity minds. *"The Art of Doing Nothing."*
Not a timer. Not a meditation app. A discipline: named, tracked, earned.
Live at https://catatonica.app. Vanilla HTML/CSS/JS. Zero dependencies. Zero build step. That is a feature, not a gap — do not introduce frameworks, bundlers, or npm runtime deps.

## Locked vocabulary — use verbatim, never paraphrase

- **Cataton** — the unit of earned stillness. 1 Cataton = 1 minute.
- **Situation** — what the user is carrying. Named, not solved.
- **Planned Obsolescence** — the ritual of release.
- **The Chronicle** — the persistent practice record.
- **The Order of the Still Voice** — the doctrine/community layer.
- **The Field** — the medium of becoming, modeled on the Higgs field. Load-bearing doctrine: session visuals are a cosmological event (broken void → clumping → warmth → star), never decoration.

## Sacred markers — never modify, verify after every pass

1. The founder's-note CSS comment ("A deep that represents the abyss…") — present in `index.html`, `app.html`, `chronicle.html`, `session.html`. Never edit, never let it drop out of a rewrite.
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
| `index.html` | Landing — spiral galaxy Field (Pass 2.5A), doctrine sections, pricing, waitlist |
| `app.html` | Dashboard — Supabase auth, onboarding, Situations, state-machine view router (Pass 2.0.4) |
| `session.html` | The session — canvas void engine, three modes, hidden timer (Escape panel) |
| `chronicle.html` | The Chronicle — practice history |
| `void-ambient.js` | Portable ambient particle field used by app.html — **load-bearing; do not modify outside a dedicated pass** |
| `void-sounds.js` | Web Audio synthesis engine (no audio files) |
| `sw.js` | Service worker — bump `CACHE` version when shipped assets change |
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
   - serve locally (`python -m http.server 8000`) and exercise the change in a real browser;
   - test incognito + `prefers-reduced-motion` + mobile emulation;
   - confirm all sacred markers intact (see `doctrine-check` skill);
   - re-read the whole diff as a hostile reviewer.
6. **Git protocol:** show `git status` + diff summary at the end of a pass. **Do not commit or push unless told "commit and push."** The founder commits; a commit exists only when its hash is on origin.
7. **Deploy** (founder-approved, after live verification): `npx wrangler pages deploy . --project-name=catatonica --branch=main` from the repo root.
8. When something feels weird, stop and ask. Don't retry harder.

## Design floor

- The void is alive, not black. Deep-space Prussian field, warm gold Cataton accents, cool teal periphery — read exact values from `:root`.
- Fonts: Cormorant Garamond (display) + DM Mono (labels) + Outfit (body).
- Accessibility is floor, not polish: `prefers-reduced-motion` fallbacks on every animation, WCAG AA contrast, 44px touch targets, real labels.
- Performance: particle work must hold 60fps on mobile; halve particle counts on small screens (existing pattern in the 2.5A IIFE).
- Best visuals are the ones you don't watch. The user is meant to sit, not consume. When in doubt, subtract.
