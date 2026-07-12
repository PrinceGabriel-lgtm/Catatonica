# Catatonica

> *The Art of Doing Nothing.*

A stillness practice for high-intensity minds. Not meditation. Not a timer. A structured discipline — name what you're carrying, sit with it, earn your silence, let it go.

**Live:** [catatonica.app](https://catatonica.app)

---

## What it is

Most productivity apps are built to fill your time. Catatonica is built to protect your emptiness.

You name a **situation** — a decision, a transition, a pressure that won't lift. You enter a **session** of planned silence. Every minute earns a **Cataton** — a permanent unit of stillness that accumulates across your lifetime. When you're ready, a ritual called **Planned Obsolescence** lets you release what you've been carrying, crystallize your Catatons, and begin something new.

It's a practice, not a feature set.

---

## The mechanics

### Situations
What you're carrying. Named, not solved. The act of naming is the first act of the practice.

### Sessions
Three modes:
- **The Void** — pure silence
- **The Threshold** — ambient soundscape (pressurized tones)
- **The Ignition** — breathing visual guide

### Catatons
1 Cataton = 1 minute of earned stillness. They accumulate permanently and never reset. As they grow, you move through the four stages of the Order of the Still Voice:

| Stage | Catatons | Unlocks |
|-------|----------|---------|
| Acknowledgement | 0–9 | The Void |
| Acceptance | 10–29 | + The Threshold |
| Receiving | 30–69 | + The Ignition |
| The Threshold | 70+ | All states |

### Planned Obsolescence
After enough sessions with a situation, a release ritual unlocks. You write what you're letting go. The text dissolves. The Catatons crystallize. The situation enters your Chronicle as past tense. A new chapter opens.

### The Chronicle
Your permanent record — sessions grouped by situation, Catatons earned, stages crossed, things released.

---

## Tech stack

| Layer | Tool |
|-------|------|
| Hosting | Cloudflare Pages |
| Auth | Supabase (magic link, Google) + Cloudflare Turnstile |
| Payments | Stripe Payment Links (test mode — live processing pending) |
| PWA | Web App Manifest + Service Worker |
| Audio | Web Audio API (generated — no audio files) |
| Frontend | Vanilla HTML/CSS/JS — no framework |
| Build | Vite (multi-page) — dev-only; ships plain static files, zero runtime dependencies |

---

## File structure

```
index.html              ← Landing page (spiral galaxy Field)
app.html                ← Dashboard (auth-gated)
session.html            ← The session (canvas void engine, three modes)
chronicle.html          ← The Chronicle (practice history)
void-ambient.js         ← Portable ambient particle field
void-sounds.js          ← Web Audio synthesis engine (not yet wired in)
manifest.json           ← PWA manifest
sw.js                   ← Service worker (see CACHE constant for version)
icon-192.png            ← App icon
icon-512.png            ← App icon (high-res)
terms/privacy/refund.html  ← Legal pages
doctrine/               ← Public IP anchor (tracked, deploy-excluded)
```

---

## Session data flow

Session context passes from `app.html` to the session screen via **URL parameters** — not sessionStorage, which PWA environments can drop between navigations.

```
app.html → session.html?mode=silence&duration=10&sitId=abc123
```

The session screen reads params on load and auto-starts immediately. No intermediate setup screen when launched from the app.

---

## Pricing

| Tier | Price | What's included |
|------|-------|----------------|
| Still | Free | Void mode, sessions up to 10 min, unlimited situations, full Chronicle, Planned Obsolescence |
| Deep | $9/mo | All three modes, unlimited session length, priority features |
| The Order | $29/mo | Everything + community, shared ceremonies, direct founder access *(coming soon)* |

---

## Payments (Stripe)

Payment links are hardcoded in `app.html` under the `STRIPE` config block. To switch from sandbox to live:

1. Go to Stripe Dashboard → Payment Links
2. Create live equivalents of the test links
3. Replace `buy.stripe.com/test_...` with `buy.stripe.com/...` in `app.html`
4. Deploy (see below)

---

## Deploy

Deploys are manual, founder-run, from the repo root:

```bash
npm run build
npx wrangler pages deploy dist --project-name=catatonica --branch=main
# live in ~60 seconds at catatonica.app
```

---

## The philosophy

> *Nothing you carry is meant to be carried forever.*

Planned Obsolescence is the core doctrine — not as a tech concept, but as a practice. You decide when something becomes past tense. Not when the pressure lifts. Not when the answer arrives. When you are ready.

The Order of the Still Voice is the name for the community that holds this practice. The progression through stages is real. The Catatons are permanent. The Chronicle is your record.

This isn't a wellness app. It's a tool for people in the middle of something real.

---

*Built by [Prince Gabriel](https://github.com/PrinceGabriel-lgtm)*
