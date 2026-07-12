    /* ─────────────────────────────────────────────────────────────
       Pass 2.5A — Emergent Spiral Landing

       Catatons (units of earned stillness) appear scattered across
       deep space, then drift inward bit by bit along spiral paths —
       the milky-way pattern EMERGES from the falling itself, down
       toward the single point of thought. As the pattern
       crystallizes, a beautiful light forms at the centre; the field
       settles toward stillness. Some catatons hold their ground and
       gather late, on their own time. Forever after, the glow's
       pulse births new catatons, slowly — the field is never dead.
       Formation plays once per session (sessionStorage); the life
       pulse plays always. The user experiences the doctrine before
       reading it.

         — Immanuel Gabriel, Pass 2.5A
       ───────────────────────────────────────────────────────────── */
    (function() {
      'use strict';

      const canvas = document.getElementById('spiralLanding');
      if (!canvas || !canvas.getContext) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const reducedMotion = !!(window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

      let skipAnimation = false;
      try {
        skipAnimation = sessionStorage.getItem('catatonica_landing_seen') === '1';
      } catch (e) { /* storage may be blocked; default to playing animation */ }
      if (reducedMotion) skipAnimation = true;

      function detectPerformance() {
        const isMobile = window.innerWidth < 768;
        const cores = navigator.hardwareConcurrency || 4;
        const lowEnd = cores < 4;
        if (isMobile || lowEnd) return { count: 250, bgStars: 30 };
        return { count: 500, bgStars: 50 };
      }

      let perf = detectPerformance();
      let W = 0, H = 0, CX = 0, CY = 0, maxR = 0, dpr = 1;
      let particles = [];
      let bgStars = [];
      let newborns = [];       // life-pulse catatons, born in steady state
      let nextBirthAtSec = 0;  // postConvergeSec of the next birth window
      let startTime = null;
      let running = false;
      let convergenceComplete = false;

      // ─── Pass 2.5A.1 v3 — the spiral collapse (founder refinement) ───
      // The catatons drift inward BIT BY BIT along spiral paths — the
      // milky-way pattern EMERGES from the infall itself. No vanishing
      // into a point, no re-explosion: the galaxy forms out of the
      // falling. As the pattern crystallizes, a beautiful light forms at
      // the centre. The field settles toward stillness — and the glow's
      // pulse keeps birthing new catatons, slowly, forever.
      const FORM_END     = 38000;  // outer-most collapsers seated by here
      const CORE_BIRTH   = 16000;  // the light begins once the pattern reads
      const GLOW_SETTLE  = 12000;  // brilliance -> milky calm, after FORM_END
      const FLAG_AT_MS   = 40000;  // steady-state behaviors phase in
      const CORE_R       = 90;     // core glow radius
      const LIFE_MIN_GAP = 18;     // seconds between life-pulse births (min)
      const LIFE_MAX_GAP = 40;     // seconds between life-pulse births (max)

      // Two-arm logarithmic spiral parameters.
      const ARM_OFFSETS = [0, Math.PI];
      const TIGHTNESS = 0.32;
      const BASE_RADIUS = 4;

      // ─── Pass 2.5B — the Collapse ───
      // Clicking through to the app does not cut away: the galaxy you
      // watched form collapses into the singularity it was always pointing
      // at, and you fall through it. ~1300ms, three beats: inhale, fall,
      // dive. Ends on the app's darkest tone; app.html receives the
      // arrival and breathes open.
      const COLLAPSE_MS = 1300;
      let collapseStartMs = null;
      let collapseNavUrl = null;

      function resize() {
        const cssW = window.innerWidth;
        const cssH = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.floor(cssW * dpr));
        canvas.height = Math.max(1, Math.floor(cssH * dpr));
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        W = cssW;
        H = cssH;
        CX = W / 2;
        CY = H / 2;
        maxR = Math.min(W, H) * 0.5;
      }

      function nearestArmDistance(r, theta) {
        if (r < 6) return 0;
        const armT = Math.log(r / BASE_RADIUS) / TIGHTNESS;
        let bestDist = Infinity;
        for (let i = 0; i < ARM_OFFSETS.length; i++) {
          const armTheta = armT + ARM_OFFSETS[i];
          let diff = ((theta - armTheta) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
          const arc = Math.abs(diff) * r;
          if (arc < bestDist) bestDist = arc;
        }
        return bestDist;
      }

      function makeBgStar() {
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          size: 0.3 + Math.random() * 0.6,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.3 + Math.random() * 0.8,
          hueRoll: Math.random()
        };
      }

      // v3 life pulse: a cataton born into the formed field, seated on the
      // arms with the same density law as the founding population.
      function makeNewborn(nowPost) {
        for (let i = 0; i < 40; i++) {
          const u = Math.random();
          const r = Math.pow(u, 0.55) * maxR;
          const theta = Math.random() * Math.PI * 2;
          const armDist = nearestArmDistance(r, theta);
          const armWidth = 14 + r * 0.18;
          let density = Math.exp(-(armDist * armDist) / (2 * armWidth * armWidth));
          density = density * 0.85 + 0.08;
          if (Math.random() >= density) continue;
          return {
            baseR: r, baseTheta: theta,
            size: 0.35 + Math.pow(Math.random(), 1.6) * 1.5,
            hueRoll: Math.random(),
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.4 + Math.random() * 1.4,
            driftPhase: Math.random() * Math.PI * 2,
            driftAmp: 0.5 + Math.random() * 1.0,
            driftSpeed: 0.0003 + Math.random() * 0.0007,
            radialPosition: r / maxR,
            bornSec: nowPost,
            dieSec: null
          };
        }
        return null;
      }

      function generateParticles() {
        particles = [];
        bgStars = [];
        const TARGET_COUNT = perf.count;
        let attempts = 0;
        while (particles.length < TARGET_COUNT && attempts < TARGET_COUNT * 25) {
          attempts++;
          const u = Math.random();
          const r = Math.pow(u, 0.55) * maxR;
          const theta = Math.random() * Math.PI * 2;
          const armDist = nearestArmDistance(r, theta);
          const armWidth = 14 + r * 0.18;
          let density = Math.exp(-(armDist * armDist) / (2 * armWidth * armWidth));
          density = density * 0.85 + 0.08;
          if (Math.random() >= density) continue;

          const tx = CX + Math.cos(theta) * r;
          const ty = CY + Math.sin(theta) * r;

          let sx, sy;
          if (Math.random() < 0.7) {
            sx = Math.random() * W;
            sy = Math.random() * H;
          } else {
            const ang = Math.random() * Math.PI * 2;
            const rad = maxR * (1.1 + Math.random() * 0.4);
            sx = CX + Math.cos(ang) * rad;
            sy = CY + Math.sin(ang) * rad;
          }

          const radialPosition = r / maxR;

          // Spiral infall pre-computation: birth position in polar form,
          // plus the total angle the cataton sweeps on its way home —
          // 0.8 to 1.8 extra turns, more for catatons born far out, all
          // in the rotation's own direction. The galaxy forms out of the
          // falling itself.
          const birthR = Math.hypot(sx - CX, sy - CY);
          const birthTheta = Math.atan2(sy - CY, sx - CX);
          let deltaBase = (theta - birthTheta) % (Math.PI * 2);
          if (deltaBase < 0) deltaBase += Math.PI * 2;
          // Extra turns must be WHOLE turns — the fractional part of the
          // journey lives entirely in deltaBase, or the cataton lands off
          // its seat and snaps. Outer catatons are likelier to take the
          // longer, two-turn fall.
          const extraTurns = 1 + (Math.random() < radialPosition * 0.8 ? 1 : 0);
          const spiralDelta = deltaBase + extraTurns * Math.PI * 2;
          // ~1 in 5 holds its ground while the rest spiral in — the
          // stragglers drift home late, on their own time. Nothing
          // disappears; some moments just take longer to gather.
          const loose = Math.random() < 0.22;

          particles.push({
            baseR: r,
            baseTheta: theta,
            tx: tx, ty: ty,
            sx: sx, sy: sy,
            birthR: birthR,
            birthTheta: birthTheta,
            spiralDelta: spiralDelta,
            loose: loose,
            formStart: loose
              ? FLAG_AT_MS + radialPosition * 8000 + Math.random() * 3000
              : radialPosition * 8000 + Math.random() * 2000,
            formDur: loose ? 26000 : 16000 + radialPosition * 14000,
            size: 0.35 + Math.pow(Math.random(), 1.6) * 1.5,
            hueRoll: Math.random(),
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.4 + Math.random() * 1.4,
            driftPhase: Math.random() * Math.PI * 2,
            driftAmp: 0.5 + Math.random() * 1.0,
            driftSpeed: 0.0003 + Math.random() * 0.0007,
            radialPosition: radialPosition
          });
        }

        for (let i = 0; i < perf.bgStars; i++) bgStars.push(makeBgStar());
      }

      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      function easeInCubic(t) { return t * t * t; }

      function getColor(hueRoll, alpha) {
        if (hueRoll < 0.45) return 'rgba(122,160,216,' + alpha + ')';
        if (hueRoll < 0.72) return 'rgba(74,111,165,'  + alpha + ')';
        if (hueRoll < 0.92) return 'rgba(155,184,224,' + alpha + ')';
        return 'rgba(232,212,168,' + alpha + ')';
      }

      function render(elapsedMs) {
        ctx.clearRect(0, 0, W, H);
        const elapsedSec = elapsedMs / 1000;

        // Collapse beats (0 when not collapsing): inhale 0–15%, fall
        // 15–70%, dive 30–100%. The field keeps living underneath — the
        // pull simply overtakes it.
        let cP = 0;
        if (collapseStartMs !== null) cP = Math.min(1, (elapsedMs - collapseStartMs) / COLLAPSE_MS);
        const cInhale = cP > 0 ? easeInOutCubic(Math.min(1, cP / 0.15)) : 0;
        const cPull = cP > 0.15 ? easeInCubic(Math.min(1, (cP - 0.15) / 0.55)) : 0;
        const cDive = cP > 0.3 ? easeInCubic(Math.min(1, (cP - 0.3) / 0.7)) : 0;

        // Steady-state global time. Zero during convergence; grows after the flag.
        let postConvergeSec = 0;
        if (skipAnimation) {
          postConvergeSec = elapsedSec;
        } else if (elapsedMs >= FLAG_AT_MS) {
          if (!convergenceComplete) {
            convergenceComplete = true;
            try { sessionStorage.setItem('catatonica_landing_seen', '1'); } catch (e) {}
          }
          postConvergeSec = (elapsedMs - FLAG_AT_MS) / 1000;
        }

        // The field rotates from the very first frame — the infall and the
        // rotation share one angular direction, so the spiral paths and the
        // formed disc are a single continuous motion.
        const globalRotation = reducedMotion ? 0 : elapsedSec * 0.011;
        const fieldPulse = (reducedMotion || postConvergeSec === 0)
          ? 1
          : 1 + 0.06 * Math.sin(postConvergeSec * 0.35);

        // Background "deep space" stars — never converge, only twinkle.
        const twAmpStar = reducedMotion ? 0.05 : 0.22;
        for (let i = 0; i < bgStars.length; i++) {
          const s = bgStars[i];
          const tw = (1 - twAmpStar) + twAmpStar * Math.sin(elapsedSec * s.twinkleSpeed + s.twinklePhase);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = getColor(s.hueRoll, 0.32 * tw);
          ctx.fill();
        }

        // v3: the pattern forms FIRST, then the light. The core is born at
        // CORE_BIRTH (once the inner spiral starts to read), grows with the
        // crystallizing pattern, reaches full brilliance exactly as the last
        // collapsers seat — the reward for waiting — then settles into the
        // milky calm at 62% of peak. A glow you sit inside, not a spotlight.
        let coreEase = 1, coreScale = 1;
        if (!skipAnimation && !reducedMotion) {
          coreEase = Math.max(0, Math.min(1, (elapsedMs - CORE_BIRTH) / (FORM_END - CORE_BIRTH)));
          coreScale = 0.25 + 0.75 * easeInOutCubic(coreEase);
        }
        let coreGlow = 0.62;
        if (!skipAnimation && !reducedMotion) {
          if (elapsedMs < FORM_END) {
            coreGlow = 0.62 + 0.38 * easeInOutCubic(coreEase);
          } else {
            coreGlow = 1 - 0.38 * easeInOutCubic(Math.min(1, (elapsedMs - FORM_END) / GLOW_SETTLE));
          }
        }
        // Collapsing: the singularity returns to full brilliance as it feeds.
        if (cP > 0) coreGlow = coreGlow + (1 - coreGlow) * Math.min(1, cP * 2);
        if (coreEase > 0) {
          // Pass 2.5A.1 — living singularity breath: three offset sine
          // frequencies so the breathing never repeats exactly (one sine
          // read as a metronome), plus a low-frequency bloom every ~10.5s
          // — the core briefly intensifies ~15% then settles, like
          // receiving a thought.
          let corePulse = 1;
          if (!reducedMotion && postConvergeSec > 0) {
            const breath = 0.022 * Math.sin(postConvergeSec * 0.60)
                         + 0.014 * Math.sin(postConvergeSec * 0.23 + 1.7)
                         + 0.009 * Math.sin(postConvergeSec * 1.07 + 4.1);
            const bloomWave = Math.sin(postConvergeSec * (Math.PI * 2 / 10.5) + 2.6);
            const bloom = 0.15 * Math.pow(Math.max(0, bloomWave), 6);
            corePulse = 1 + breath + bloom;
          }
          let coreRadius = CORE_R * coreScale * corePulse;
          // The dive: the singularity grows to swallow the frame.
          if (cDive > 0) coreRadius += (Math.hypot(W, H) * 0.8 - coreRadius) * cDive;
          // Broad Milky-Way halo the whole disc glows within — very faint,
          // half the field wide. This is the "milkiness."
          const haloR = maxR * 0.5;
          const halo = ctx.createRadialGradient(CX, CY, 0, CX, CY, haloR);
          halo.addColorStop(0,   'rgba(232,220,196,' + (0.10  * coreEase * coreGlow) + ')');
          halo.addColorStop(0.5, 'rgba(140,150,190,' + (0.045 * coreEase * coreGlow) + ')');
          halo.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = halo;
          ctx.fillRect(CX - haloR, CY - haloR, haloR * 2, haloR * 2);
          // Pass 2.5A.1 — chromatic singularity: cream-white → gold-white →
          // warm gold → cool blue rim. Not just bright white.
          const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreRadius);
          grad.addColorStop(0,    'rgba(255,250,235,' + (0.88 * coreEase * coreGlow) + ')');
          grad.addColorStop(0.18, 'rgba(248,232,196,' + (0.60 * coreEase * coreGlow) + ')');
          grad.addColorStop(0.42, 'rgba(214,169,78,'  + (0.30 * coreEase * coreGlow) + ')');
          grad.addColorStop(0.72, 'rgba(100,135,196,' + (0.10 * coreEase * coreGlow) + ')');
          grad.addColorStop(1,    'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(CX - coreRadius, CY - coreRadius, coreRadius * 2, coreRadius * 2);
        }

        // Catatons.
        const twAmp = reducedMotion ? 0.05 : 0.22;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // "Home" = steady-state target. During convergence (postConvergeSec=0),
          // home is fixed at (tx, ty); after the flag, home rotates/pulses/drifts.
          const theta = p.baseTheta + globalRotation;
          const driftR = (reducedMotion || postConvergeSec === 0)
            ? 0
            : p.driftAmp * Math.sin(postConvergeSec * p.driftSpeed * 1000 + p.driftPhase);
          const r = (p.baseR + driftR) * fieldPulse;
          const homeX = CX + Math.cos(theta) * r;
          const homeY = CY + Math.sin(theta) * r;

          let x, y, alphaMul;
          const t01 = skipAnimation
            ? 1
            : Math.max(0, Math.min(1, (elapsedMs - p.formStart) / p.formDur));
          if (t01 >= 1) {
            x = homeX; y = homeY;
            alphaMul = 1;
          } else {
            // Spiral infall — polar interpolation from birth to seat. The
            // radius eases home bit by bit while the angle sweeps in the
            // rotation's own direction: the milky-way pattern emerges from
            // the falling itself. Fully visible the whole way — nothing
            // dissolves, nothing disappears.
            const e = easeInOutCubic(t01);
            const rr = p.birthR + (r - p.birthR) * e;
            const th = p.birthTheta + p.spiralDelta * e + globalRotation * e;
            x = CX + Math.cos(th) * rr;
            y = CY + Math.sin(th) * rr;
            alphaMul = 0.5 + 0.5 * e;
          }

          const twinkle = (1 - twAmp) + twAmp * Math.sin(elapsedSec * p.twinkleSpeed + p.twinklePhase);
          const outerFade = 1 - Math.pow(p.radialPosition, 3) * 0.35;
          let alpha = Math.min(1, twinkle * alphaMul * outerFade);

          // Collapse: inhale draws the field in 8%, then the fall pulls
          // every cataton — loose ones too — into the singularity, each
          // dimming into the light it feeds.
          if (cP > 0) {
            x = CX + (x - CX) * (1 - 0.08 * cInhale);
            y = CY + (y - CY) * (1 - 0.08 * cInhale);
            x += (CX - x) * cPull;
            y += (CY - y) * cPull;
            alpha *= (1 - 0.1 * cInhale) * (1 - 0.85 * cPull);
          }

          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = getColor(p.hueRoll, alpha);
          ctx.fill();

          if (p.size > 1.0) {
            ctx.beginPath();
            ctx.arc(x, y, p.size * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = getColor(p.hueRoll, alpha * 0.18);
            ctx.fill();
          }
        }

        // ─── v3 life pulse: the glow births new catatons, slowly, forever ───
        // Rides the bloom cycle — life leaves the centre on the pulse. Pool
        // is capped at 12% of the founding count; at capacity the oldest
        // newborn quietly returns to the dark as a new one arrives.
        if (!reducedMotion && postConvergeSec > 0) {
          if (nextBirthAtSec === 0) {
            nextBirthAtSec = postConvergeSec + LIFE_MIN_GAP + Math.random() * (LIFE_MAX_GAP - LIFE_MIN_GAP);
          }
          const lifeWave = Math.sin(postConvergeSec * (Math.PI * 2 / 10.5) + 2.6);
          if (postConvergeSec >= nextBirthAtSec && lifeWave > 0.55) {
            const maxExtra = Math.round(perf.count * 0.12);
            const nb = makeNewborn(postConvergeSec);
            if (nb) {
              if (newborns.length >= maxExtra) {
                const oldest = newborns.find(function(n) { return n.dieSec === null; });
                if (oldest) oldest.dieSec = postConvergeSec;
              }
              newborns.push(nb);
            }
            nextBirthAtSec = postConvergeSec + LIFE_MIN_GAP + Math.random() * (LIFE_MAX_GAP - LIFE_MIN_GAP);
          }
          for (let i = newborns.length - 1; i >= 0; i--) {
            const n = newborns[i];
            const fadeIn = Math.min(1, (postConvergeSec - n.bornSec) / 5);
            const fadeOut = n.dieSec === null ? 1 : 1 - Math.min(1, (postConvergeSec - n.dieSec) / 6);
            if (fadeOut <= 0) { newborns.splice(i, 1); continue; }
            const thetaN = n.baseTheta + globalRotation;
            const driftN = n.driftAmp * Math.sin(postConvergeSec * n.driftSpeed * 1000 + n.driftPhase);
            const rN = (n.baseR + driftN) * fieldPulse;
            let nx = CX + Math.cos(thetaN) * rN;
            let ny = CY + Math.sin(thetaN) * rN;
            const twN = (1 - twAmp) + twAmp * Math.sin(elapsedSec * n.twinkleSpeed + n.twinklePhase);
            let aN = Math.min(1, twN * easeInOutCubic(fadeIn) * fadeOut * (1 - Math.pow(n.radialPosition, 3) * 0.35));
            if (cP > 0) {
              nx = CX + (nx - CX) * (1 - 0.08 * cInhale);
              ny = CY + (ny - CY) * (1 - 0.08 * cInhale);
              nx += (CX - nx) * cPull;
              ny += (CY - ny) * cPull;
              aN *= (1 - 0.1 * cInhale) * (1 - 0.85 * cPull);
            }
            ctx.beginPath();
            ctx.arc(nx, ny, n.size * (0.4 + 0.6 * fadeIn), 0, Math.PI * 2);
            ctx.fillStyle = getColor(n.hueRoll, aN);
            ctx.fill();
          }
        }

        // Bright pinpoint at the very center, gently twinkling.
        if (coreEase > 0) {
          const coreSize = 3 + coreEase * 2.5;
          const pinTwinkle = reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(elapsedSec * 1.3);
          ctx.beginPath();
          ctx.arc(CX, CY, coreSize, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,248,224,' + (coreEase * pinTwinkle * (0.55 + 0.45 * coreGlow)) + ')';
          ctx.fill();
        }

        // Pass 2.5A.1 — inner spiral: 12 tiny cool catatons forever falling
        // into the singularity and dissolving. The core consumes catatons —
        // moments of silence singling down to one idea. Skipped entirely
        // under prefers-reduced-motion (it is pure motion).
        if (coreEase > 0 && !reducedMotion) {
          for (let i = 0; i < 12; i++) {
            const cycle = 7 + (i % 4) * 1.35;                       // staggered fall times
            const prog = ((elapsedSec / cycle) + i / 12) % 1;       // 0 → 1, forever
            const rr = (1 - prog) * (CORE_R * 0.85) * coreEase;     // rim → center
            const ang = i * 2.399 + prog * 5.5 + globalRotation * 3; // golden-angle starts, ~0.9 turn in
            const fade = Math.sin(prog * Math.PI);                  // born faint, bright mid-fall, dissolve
            ctx.beginPath();
            ctx.arc(CX + Math.cos(ang) * rr, CY + Math.sin(ang) * rr, 0.9, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(190,205,235,' + (0.5 * fade * coreEase) + ')';
            ctx.fill();
          }
        }

        // Collapse finale: cream-white flash as you pass through the light,
        // then the dark of the app's deepest tone rises. Navigate at black.
        if (cP > 0) {
          const flash = Math.max(0, Math.min(1, (cP - 0.55) / 0.33));
          if (flash > 0) {
            ctx.fillStyle = 'rgba(255,250,235,' + (0.92 * easeInOutCubic(flash)) + ')';
            ctx.fillRect(0, 0, W, H);
          }
          const veil = Math.max(0, Math.min(1, (cP - 0.85) / 0.15));
          if (veil > 0) {
            ctx.fillStyle = 'rgba(2,1,10,' + easeInOutCubic(veil) + ')';
            ctx.fillRect(0, 0, W, H);
          }
          if (cP >= 1 && collapseNavUrl) {
            const dest = collapseNavUrl;
            collapseNavUrl = null;
            try { sessionStorage.setItem('catatonica_arrival', '1'); } catch (e) {}
            window.location.href = dest;
          }
        }
      }

      function loop(now) {
        if (!running) return;
        if (startTime === null) startTime = now;
        render(now - startTime);
        requestAnimationFrame(loop);
      }

      function start() {
        if (running) return;
        running = true;
        startTime = null;
        requestAnimationFrame(loop);
      }

      function onResize() {
        const oldCX = CX, oldCY = CY, oldMaxR = maxR;
        // Re-evaluate performance tier in case the user crossed the mobile breakpoint.
        perf = detectPerformance();
        resize();
        if (oldMaxR === 0) return;
        const ratio = maxR / oldMaxR;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.tx = CX + (p.tx - oldCX) * ratio;
          p.ty = CY + (p.ty - oldCY) * ratio;
          p.sx = CX + (p.sx - oldCX) * ratio;
          p.sy = CY + (p.sy - oldCY) * ratio;
          p.baseR *= ratio;
          p.birthR *= ratio;
        }
        for (let i = 0; i < newborns.length; i++) newborns[i].baseR *= ratio;
        bgStars = [];
        for (let i = 0; i < perf.bgStars; i++) bgStars.push(makeBgStar());
      }

      // Every door into the app falls through the singularity. Plain links
      // are the fallback: modifier/middle clicks and dead-canvas cases
      // navigate normally.
      function bindCollapse() {
        document.querySelectorAll('a[href="app.html"]').forEach(function(a) {
          a.addEventListener('click', function(ev) {
            if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
            ev.preventDefault();
            if (collapseStartMs !== null) return; // already falling
            if (reducedMotion || !running || startTime === null) {
              // Reduced motion / dead field: 200ms fade to the same dark.
              try { sessionStorage.setItem('catatonica_arrival', '1'); } catch (e) {}
              const v = document.createElement('div');
              v.style.cssText = 'position:fixed;inset:0;background:#02010a;opacity:0;transition:opacity 200ms ease;z-index:10000;pointer-events:none;';
              document.body.appendChild(v);
              requestAnimationFrame(function() { v.style.opacity = '1'; });
              setTimeout(function() { window.location.href = 'app.html'; }, 230);
              return;
            }
            collapseNavUrl = this.getAttribute('href');
            collapseStartMs = performance.now() - startTime;
            document.body.style.pointerEvents = 'none';
          });
        });
      }

      function init() {
        resize();
        generateParticles();
        window.addEventListener('resize', onResize);
        bindCollapse();
        start();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
