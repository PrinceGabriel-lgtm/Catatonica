  // ── URL PARAMS ──
  const urlParams = new URLSearchParams(window.location.search);
  const sessionCtx = urlParams.has('mode') ? {
    sitId:    urlParams.get('sitId') || null,
    mode:     urlParams.get('mode') || 'silence',
    duration: parseInt(urlParams.get('duration')) || 10,
    userId:   urlParams.get('userId') || null,
    catatons: parseInt(urlParams.get('catatons')) || 0,
  } : null;

  // ── STATE ──
  const state = {
    mode:         sessionCtx?.mode || 'silence',
    duration:     sessionCtx?.duration || 10,
    sitId:        sessionCtx?.sitId || null,
    catatons:     sessionCtx?.catatons || 0,
    secondsLeft:  0,
    totalSeconds: 0,
    timer:        null,
    audioCtx:     null,
    soundNodes:   [],
    breathPhase:  'in',
    breathTimer:  null,
    running:      false,
  };

  if (sessionCtx) {
    document.querySelectorAll('.mode-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === state.mode));
    document.querySelectorAll('.dur-btn').forEach(b =>
      b.classList.toggle('active', parseInt(b.dataset.min) === state.duration));
    setTimeout(() => startSession(), 120);
  }

  // ── CURSOR ──
  const cursorEl = document.getElementById('cursor');
  const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hasHover) {
    let mx = 0, my = 0;
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      cursorEl.style.left = mx + 'px'; cursorEl.style.top = my + 'px';
    });
    document.querySelectorAll('button, a').forEach(el => {
      el.addEventListener('mouseenter', () => { cursorEl.style.width='8px'; cursorEl.style.height='8px'; });
      el.addEventListener('mouseleave', () => { cursorEl.style.width='4px'; cursorEl.style.height='4px'; });
    });
  }

  // ── ESCAPE PANEL ──
  const panel = document.getElementById('escapePanel');
  let panelOpen = false;
  document.getElementById('escapeHandle').addEventListener('click', () => {
    panelOpen = !panelOpen;
    panel.classList.toggle('open', panelOpen);
  });

  // ── MODE & DURATION SELECTION ──
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
    });
  });
  document.querySelectorAll('.dur-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.duration = parseInt(btn.dataset.min);
    });
  });

  // ── SCREEN TRANSITIONS ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.add('hidden');
      if (s.id !== id) setTimeout(() => s.classList.add('gone'), 900);
    });
    const target = document.getElementById(id);
    if (!target) return;
    target.classList.remove('gone');
    requestAnimationFrame(() => requestAnimationFrame(() => target.classList.remove('hidden')));
  }

  // ── BEGIN ──
  document.getElementById('beginBtn').addEventListener('click', startSession);

  function startSession() {
    state.secondsLeft  = state.duration * 60;
    state.totalSeconds = state.duration * 60;
    state.running      = true;

    showScreen('sessionScreen');

    // Mode label flash
    const ind = document.getElementById('modeIndicator');
    const modeNames = { silence: 'The Void', sound: 'The Threshold', visual: 'The Ignition' };
    ind.textContent = modeNames[state.mode] || '';
    ind.classList.add('visible');
    setTimeout(() => ind.classList.add('faded'), 3000);

    if (state.mode === 'sound')  startAmbientSound();
    if (state.mode === 'visual') startBreathCycle();

    updatePanel();
    state.timer = setInterval(tick, 1000);
    voidEngine.start(state.mode, state.catatons);
  }

  // ── TIMER ──
  function tick() {
    state.secondsLeft--;
    if (state.secondsLeft <= 0) {
      clearInterval(state.timer);
      endSession(false);
    } else {
      updatePanel();
    }
  }

  function updatePanel() {
    const m = Math.floor(state.secondsLeft / 60);
    const s = state.secondsLeft % 60;
    document.getElementById('panelTimer').textContent =
      String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    const progress = 1 - (state.secondsLeft / state.totalSeconds);
    document.getElementById('progressRing').style.strokeDashoffset =
      175.9 - progress * 175.9;
    const earned = Math.max(0, Math.floor((state.totalSeconds - state.secondsLeft) / 60));
    document.getElementById('panelCatatons').textContent =
      earned + (earned === 1 ? ' Cataton earned' : ' Catatons earned');
  }

  // ── END ──
  function endSession(early = false) {
    clearInterval(state.timer);
    stopAmbientSound();
    stopBreathCycle();
    state.running = false;
    panel.classList.remove('open');
    panelOpen = false;

    voidEngine.triggerStar();
    playBell();

    const elapsed = state.totalSeconds - state.secondsLeft;
    const catatonsEarned = Math.max(1, Math.round(state.duration * (elapsed / state.totalSeconds)));

    if (state.sitId) {
      sessionStorage.setItem('cat_session_result', JSON.stringify({
        sitId: state.sitId, catatonsEarned, completed: !early,
      }));
    }

    setTimeout(() => {
      voidEngine.stop();
      const elapsedMin = Math.floor(elapsed / 60);
      const elapsedSec = elapsed % 60;
      document.getElementById('completeDuration').textContent = early
        ? `${elapsedMin}m ${elapsedSec}s · +${catatonsEarned} Catatons`
        : `${state.duration} minutes · +${catatonsEarned} Catatons`;

      const quotes = [
        'The mind that rests, decides better.',
        'You gave yourself permission to stop. That takes more courage than you think.',
        'What surfaces in silence is more honest than anything the noise told you.',
        'The gaps you protect are where the next version of you is built.',
        'Stillness is not the absence of thought — it is the condition for better ones.',
        'You stayed. That is enough.',
        'Something in you just became more real.',
        'Nothing you carry is meant to be carried forever.',
      ];
      document.getElementById('completeQuote').textContent =
        quotes[Math.floor(Math.random() * quotes.length)];
      decorateCompleteMark((state.catatons || 0) + catatonsEarned);
      showScreen('completeScreen');
    }, early ? 900 : 2200);
  }

  function decorateCompleteMark(totalCatatons) {
    const mark = document.getElementById('completeMark');
    if (!mark) return;
    mark.querySelectorAll('.complete-mark-ring, .complete-mark-arm').forEach(el => el.remove());
    const dot = mark.querySelector('.complete-mark-dot');

    if (totalCatatons >= 1) {
      const r1 = document.createElement('div');
      r1.className = 'complete-mark-ring r1';
      mark.insertBefore(r1, dot);
    }
    if (totalCatatons >= 10) {
      const r2 = document.createElement('div');
      r2.className = 'complete-mark-ring r2';
      mark.insertBefore(r2, dot);
    }
    if (totalCatatons >= 25) {
      const r3 = document.createElement('div');
      r3.className = 'complete-mark-ring r3';
      mark.insertBefore(r3, dot);
    }
    if (totalCatatons >= 40) {
      const r4 = document.createElement('div');
      r4.className = 'complete-mark-ring r4';
      mark.insertBefore(r4, dot);

      const arm1 = document.createElement('div');
      arm1.className = 'complete-mark-arm';
      mark.insertBefore(arm1, dot);

      const arm2 = document.createElement('div');
      arm2.className = 'complete-mark-arm a2';
      mark.insertBefore(arm2, dot);
    }
  }

  document.getElementById('exitBtn').addEventListener('click', () => endSession(true));
  document.getElementById('goAgainBtn').addEventListener('click', () => {
    window.location.href = state.sitId ? 'app.html' : 'session.html';
  });

  // ── BELL ──
  // Struck bowl — small bowl, dry close room. Pass 2 exit sound.
  //   Fundamental 440Hz sine + 880Hz overtone at 30%, through a
  //   2kHz low-pass. 10ms attack, 2.5s exponential decay, peak 0.25.
  function playBell() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const now = ac.currentTime;
      const attack = 0.010;
      const decay  = 2.500;
      const peak   = 0.25;

      const lpf = ac.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 2000;
      lpf.Q.value = 0.7;
      lpf.connect(ac.destination);

      // Fundamental — 440Hz sine
      const fund = ac.createOscillator();
      fund.type = 'sine';
      fund.frequency.value = 440;
      const fundGain = ac.createGain();
      fundGain.gain.setValueAtTime(0.0001, now);
      fundGain.gain.linearRampToValueAtTime(peak, now + attack);
      fundGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
      fund.connect(fundGain);
      fundGain.connect(lpf);

      // Overtone — 880Hz at 30% amplitude
      const over = ac.createOscillator();
      over.type = 'sine';
      over.frequency.value = 880;
      const overGain = ac.createGain();
      overGain.gain.setValueAtTime(0.0001, now);
      overGain.gain.linearRampToValueAtTime(peak * 0.30, now + attack);
      overGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
      over.connect(overGain);
      overGain.connect(lpf);

      const stopAt = now + attack + decay + 0.05;
      fund.start(now); over.start(now);
      fund.stop(stopAt); over.stop(stopAt);

      // Release the AudioContext after the tone finishes
      setTimeout(() => { try { ac.close(); } catch(e) {} }, (attack + decay + 0.2) * 1000);
    } catch(e) {}
  }

  // ── AMBIENT SOUND (Threshold: pressurized, wave-based) ──
  function startAmbientSound() {
    try {
      const ac = new AudioContext();
      state.audioCtx = ac;
      state.soundNodes = [];

      // Brown noise base
      const bufSize = ac.sampleRate * 8;
      const buf = ac.createBuffer(2, bufSize, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < bufSize; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      }
      const noise = ac.createBufferSource();
      noise.buffer = buf; noise.loop = true;

      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 110;

      const master = ac.createGain();
      master.gain.setValueAtTime(0, ac.currentTime);
      master.gain.linearRampToValueAtTime(0.1, ac.currentTime + 4);

      noise.connect(lp); lp.connect(master); master.connect(ac.destination);
      noise.start();
      state.soundNodes.push(noise, master);

      // Slow pressure wave on gain
      const lfo = ac.createOscillator();
      const lfoG = ac.createGain();
      lfo.frequency.value = 0.055; lfoG.gain.value = 0.05;
      lfo.connect(lfoG); lfoG.connect(master.gain);
      lfo.start();
      state.soundNodes.push(lfo);

      // Sub tones
      [58, 87].forEach((freq, i) => {
        const osc = ac.createOscillator(), g = ac.createGain();
        osc.frequency.value = freq; osc.type = 'sine'; g.gain.value = 0.035;
        const tl = ac.createOscillator(), tlg = ac.createGain();
        tl.frequency.value = 0.04 + i * 0.02; tlg.gain.value = 0.018;
        tl.connect(tlg); tlg.connect(g.gain); tl.start();
        osc.connect(g); g.connect(ac.destination); osc.start();
        state.soundNodes.push(osc, g, tl);
      });
    } catch(e) {}
  }

  function stopAmbientSound() {
    try {
      const master = state.soundNodes[1];
      if (master?.gain && state.audioCtx) {
        master.gain.linearRampToValueAtTime(0, state.audioCtx.currentTime + 1.5);
      }
      setTimeout(() => {
        state.soundNodes.forEach(n => { try { n.stop?.(); } catch(e){} });
        state.audioCtx?.close(); state.audioCtx = null; state.soundNodes = [];
      }, 1600);
    } catch(e) {}
  }

  // ── BREATH CYCLE ──
  function startBreathCycle() {
    state.breathPhase = 'in';
    runBreath();
  }
  function runBreath() {
    const dur = state.breathPhase === 'in' ? 4000 :
                state.breathPhase === 'hold' ? 2000 : 5000;
    state.breathTimer = setTimeout(() => {
      const prev = state.breathPhase;
      if (prev === 'in')   state.breathPhase = 'hold';
      else if (prev === 'hold') state.breathPhase = 'out';
      else state.breathPhase = 'in';
      // Fire shockwave at the moment exhale begins
      if (state.breathPhase === 'out') voidEngine.addShockwave();
      if (state.running) runBreath();
    }, dur);
  }
  function stopBreathCycle() { clearTimeout(state.breathTimer); }

  // ═══════════════════════════════════════════════════════════════
  // ── THE VOID ENGINE — Cosmological particle system
  //
  // The void begins broken. Particles are fragments: cold, dim,
  // scattered. As session progresses, gravity strengthens. Particles
  // clump, warm from teal → violet → amber → gold. A star is born.
  // ═══════════════════════════════════════════════════════════════
  const voidEngine = (() => {
    const canvas = document.getElementById('voidCanvas');
    const ctx    = canvas.getContext('2d');

    let W = 0, H = 0, CX = 0, CY = 0;
    let particles  = [];   // main cosmological particles
    let dust       = [];   // background micro-dust (depth)
    let shockwaves = [];   // Ignition: breath-exhale rings
    let waveRings  = [];   // Threshold: pressure wave rings
    let starFlash  = 0;    // 0→1, completion star burst intensity
    let t          = 0;    // global tick
    let sessionProgress = 0; // 0→1 over session duration (linear, from timer)
    let warmProg   = 0;    // front-loaded warmth driver = pow(sessionProgress,0.6)
    let mode       = 'silence';
    let userCatatons = 0;
    let isSession  = false;
    let running    = false;
    let animId     = null;

    function getStage(c) {
      if (c < 10) return 0; // broken void
      if (c < 30) return 1; // first light
      if (c < 70) return 2; // proto-star
      return 3;             // galaxy
    }

    function resizeCanvas() {
      const oldW = W || window.innerWidth;
      const oldH = H || window.innerHeight;
      W = window.innerWidth;
      H = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      CX = W / 2; CY = H / 2;
      // Rescale particle positions proportionally
      if (particles.length && oldW) {
        const sx = W / oldW, sy = H / oldH;
        const ocx = oldW / 2, ocy = oldH / 2;
        particles.forEach(p => {
          p.x = CX + (p.x - ocx) * sx;
          p.y = CY + (p.y - ocy) * sy;
        });
        dust.forEach(d => { d.x *= sx; d.y *= sy; });
      }
    }

    // ── PARTICLE FACTORY ──
    function makeParticle(stage) {
      const angle = Math.random() * Math.PI * 2;
      const maxR  = Math.min(W, H) * 0.42;
      const minR  = 55;
      // Higher stage = tighter initial scatter (proto-formation)
      const scatter = [1.0, 0.78, 0.58, 0.42][stage];
      const dist    = (minR + Math.random() * (maxR - minR)) * scatter;
      const isFragment = Math.random() < [0.58, 0.32, 0.12, 0.04][stage];

      return {
        x:  CX + Math.cos(angle) * dist,
        y:  CY + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        mass:  0.5 + Math.random() * 1.8,
        size:  0.3 + Math.random() * 1.8,
        hue:   214 + Math.random() * 14,
        sat:   30  + Math.random() * 22,
        lit:  10   + Math.random() * 16,
        alpha: 0.05 + Math.random() * 0.32,
        orbit: 0.00012 + Math.random() * 0.00028,
        fragment:  isFragment,
        fragAngle: Math.random() * Math.PI * 2,
        fragSpin:  (Math.random() - 0.5) * 0.018,
        shimmer:   Math.random() * Math.PI * 2,
        sSpeed:    0.008 + Math.random() * 0.018,
      };
    }

    // ── MICRO-DUST FACTORY ──
    function makeDust() {
      return {
        x:       Math.random() * W,
        y:       Math.random() * H,
        vx:      (Math.random() - 0.5) * 0.06,
        vy:      (Math.random() - 0.5) * 0.06,
        size:    0.15 + Math.random() * 0.35,
        alpha:   0.02 + Math.random() * 0.05,
        hue:     220 + Math.random() * 50,  // deep violet dust, not teal (2.5C)
        twinkle: Math.random() * Math.PI * 2,
      };
    }

    function initParticles() {
      const stage = getStage(userCatatons);
      const count = [280, 325, 370, 415][stage];
      particles = [];
      dust      = [];
      for (let i = 0; i < count; i++) particles.push(makeParticle(stage));
      for (let i = 0; i < 140; i++)   dust.push(makeDust());
      shockwaves = []; waveRings = [];
      t = 0; sessionProgress = 0;
    }

    // ── PHYSICS ──
    function update() {
      const stage    = getStage(userCatatons);
      const gravity  = isSession ? 0.00005 + sessionProgress * 0.00030 : 0.000006;
      const maxSpeed = isSession ? 0.55 + sessionProgress * 0.9 : 0.22;

      particles.forEach(p => {
        const dx   = CX - p.x;
        const dy   = CY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // ── Central gravity (grows stronger through session) ──
        p.vx += (dx / dist) * gravity * p.mass;
        p.vy += (dy / dist) * gravity * p.mass;

        // ── Mode-specific forces ──
        if (mode === 'silence') {
          // Orbital tendency: particles naturally want to orbit the center
          // The universe expands and contracts — meditative, slow
          const orbStr = p.orbit * (1 - sessionProgress * 0.55);
          p.vx += (-dy / dist) * orbStr;
          p.vy += ( dx / dist) * orbStr;
          // Cosmic breath: whole field gently expands/contracts
          const breathe = Math.sin(t * 0.00045) * 0.000022;
          p.vx += (p.x - CX) * breathe;
          p.vy += (p.y - CY) * breathe;

        } else if (mode === 'sound') {
          // Pressure waves from center — labor, something being born
          const waveAng = t * 0.0022 + dist * 0.009;
          const wavePush = Math.sin(waveAng) * 0.00032 * (1 + sessionProgress * 1.2);
          p.vx += (dx / dist) * wavePush;
          p.vy += (dy / dist) * wavePush;
          // Turbulence — pressure, not peace
          if (Math.random() < 0.25) {
            p.vx += (Math.random() - 0.5) * 0.016;
            p.vy += (Math.random() - 0.5) * 0.016;
          }
          // Chaotic orbital
          p.vx += (-dy / dist) * p.orbit * 0.4 * (Math.random() > 0.5 ? 1 : -1);
          p.vy += ( dx / dist) * p.orbit * 0.4 * (Math.random() > 0.5 ? 1 : -1);

        } else if (mode === 'visual') {
          // Breath-synchronized cosmology
          // Inhale: drawn toward center (compression)
          // Hold: gentle orbit at equilibrium
          // Exhale: pushed outward — a small Big Bang
          const bForce = state.breathPhase === 'in'   ?  0.00068 :
                         state.breathPhase === 'hold'  ?  0.000045 : -0.00048;
          p.vx += (dx / dist) * bForce;
          p.vy += (dy / dist) * bForce;
          if (state.breathPhase === 'hold') {
            p.vx += (-dy / dist) * p.orbit;
            p.vy += ( dx / dist) * p.orbit;
          }
        }

        // ── Shockwave interaction (Ignition exhale rings) ──
        shockwaves.forEach(sw => {
          const pdx = p.x - CX, pdy = p.y - CY;
          const pd  = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
          const diff = Math.abs(pd - sw.r);
          if (diff < 38) {
            const force = (1 - diff / 38) * sw.force;
            p.vx += (pdx / pd) * force;
            p.vy += (pdy / pd) * force;
          }
        });

        // Friction
        p.vx *= 0.983;
        p.vy *= 0.983;

        // Speed cap
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > maxSpeed) { p.vx *= maxSpeed / speed; p.vy *= maxSpeed / speed; }

        p.x += p.vx;
        p.y += p.vy;

        // Soft boundary (no hard wrap — particles drift back from edge)
        const boundary = Math.min(W, H) * 0.54;
        if (dist > boundary) {
          p.vx += (dx / dist) * 0.0025;
          p.vy += (dy / dist) * 0.0025;
        }

        // Fragment rotation
        if (p.fragment) p.fragAngle += p.fragSpin;

        // Shimmer
        p.shimmer += p.sSpeed;

        // ── COLOR EVOLUTION (Pass 2.5C) ──
        // The field is a temperature: cold indigo at the rim → warm gold at
        // the core, warming as you sit. Founder read (2026-07): warmth was
        // too back-loaded (flat blue the first half), never reached gold even
        // late, and the three modes felt identical (mode changed motion, not
        // palette). Fixes: warmProg front-loads the curve (set in loop); a
        // higher base (0.34) warms the whole field, not just the core; each
        // mode biases its temperature into a character (silence coolest,
        // sound warmer/amber, visual hottest) — but all converge to the same
        // gold→white star at the warm end.
        const coreDist = Math.sqrt((p.x - CX) ** 2 + (p.y - CY) ** 2);
        const coreProx = Math.max(0, 1 - coreDist / (Math.min(W, H) * 0.32));
        const modeWarm = mode === 'visual' ? 1.28 : mode === 'sound' ? 1.12 : 1.0;
        const warmth   = isSession ? Math.min(1, warmProg * (0.34 + coreProx * 0.66) * modeWarm) : 0;
        // Cold end is deep indigo-violet (not bright blue) and dark/desaturated
        // — the water too dark to see the bottom. Warmth is the emergent light.
        const coldHue  = mode === 'sound' ? 226 : mode === 'visual' ? 240 : 232;

        if (warmth < 0.30) {
          const w = warmth / 0.30;
          p.hue = coldHue + w * (256 - coldHue); // deep indigo-violet → violet
          p.sat = 24  + w * 46;
          p.lit = 7   + w * 17 + coreProx * 12;
        } else if (warmth < 0.64) {
          const w = (warmth - 0.30) / 0.34;
          p.hue = 256 - w * 214;  // violet → amber
          p.sat = 74  + w * 12;
          p.lit = 28  + w * 32 + coreProx * 24;
        } else {
          const w = (warmth - 0.64) / 0.36;
          p.hue = 42  - w * 6;    // amber → gold
          p.sat = 86  - w * 62;   // desaturate toward warm white
          p.lit = 60  + w * 34;
        }

        const shimVal = Math.sin(p.shimmer) * 0.055;
        p.alpha = 0.06
          + coreProx * (isSession ? warmProg * 0.90 : 0.08)
          + (isSession ? Math.min(1, warmProg * 1.8) * 0.09 : 0)
          + warmth * 0.10   // warm particles carry more light
          + shimVal;
        p.alpha = Math.max(0.03, Math.min(0.98, p.alpha));
      });

      // Dust drift (slow, never attracted to center)
      dust.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        d.twinkle += 0.007;
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
      });

      // Update shockwave rings
      shockwaves = shockwaves.filter(sw => sw.r < sw.maxR);
      shockwaves.forEach(sw => {
        sw.r     += sw.speed;
        sw.alpha *= 0.972;
        sw.force *= 0.94;
      });

      // Threshold pressure rings — Pass 2.5C: far sparser (was every 72
      // ticks → a thicket of rings that fractured the field) and dimmer, so
      // they read as slow water swells, not a diagram of concentric circles.
      if (mode === 'sound' && isSession && t % 150 === 0) {
        waveRings.push({ r: 6, maxR: Math.min(W, H) * 0.52, alpha: 0.10 * (0.4 + sessionProgress * 0.6) });
      }
      waveRings = waveRings.filter(r => r.r < r.maxR);
      waveRings.forEach(r => { r.r += 1.6; r.alpha *= 0.992; });

      // Star flash decay
      if (starFlash > 0) starFlash *= 0.93;
    }

    // ── RENDER ──
    function render() {
      // ─────────────────────────────────────────────────────────
      // TRAIL EFFECT: fade instead of clearRect.
      // This is what makes particles feel alive — comet tails,
      // motion arcs, the sense that something moved through space.
      // Lower alpha = longer trails (more ghostly history).
      // ─────────────────────────────────────────────────────────
      const trailAlpha = isSession
        ? 0.11 + (1 - sessionProgress) * 0.07
        : 0.22;
      // Pass 2.5C — trails fade into the deep water (#05050f), not the old
      // Prussian blue (13,27,42) that washed the whole field cold-blue.
      ctx.fillStyle = `rgba(5,5,15,${trailAlpha})`;
      ctx.fillRect(0, 0, W, H);

      // ── NEBULA BACKGROUND (Pass 2.5C — deep water warming to the star) ──
      // Was an hsla hue sweep anchored at 182 (teal) — that cyan cast, and
      // its soft edge, were the "weird blue circle". Now it is an RGB lerp
      // from deep violet (the water at rest) to warm amber (the star's heat),
      // so it genuinely reaches gold and never passes through teal. Warmth
      // and reach are driven by warmProg (front-loaded).
      const nebR = isSession ? 70 + warmProg * Math.min(W, H) * 0.40 : 55;
      // cold deep-violet → warm amber; a hair warmer for sound, deepest for visual
      const nebWp = isSession ? Math.min(1, warmProg * (mode === 'visual' ? 0.92 : mode === 'sound' ? 1.08 : 1.0)) : 0;
      const nr = Math.round(26 + (212 - 26) * nebWp);
      const ng = Math.round(15 + (169 - 15) * nebWp);
      const nb = Math.round(52 + (95  - 52) * nebWp);
      const nA = isSession ? 0.10 + warmProg * 0.30 : 0.06;

      const neb = ctx.createRadialGradient(CX, CY, 0, CX, CY, nebR);
      if (isSession) {
        neb.addColorStop(0,    `rgba(${nr},${ng},${nb},${nA * 0.55})`);
        neb.addColorStop(0.4,  `rgba(${nr},${ng},${nb},${nA * 0.26})`);
        neb.addColorStop(0.75, `rgba(${Math.round(nr*0.5)},${Math.round(ng*0.5)},${Math.round(nb*0.6)},${nA * 0.10})`);
      } else {
        // idle: a barely-there deep-violet breath, never Prussian blue
        neb.addColorStop(0,   'rgba(20,14,40,0.05)');
        neb.addColorStop(0.5, 'rgba(12,8,26,0.02)');
      }
      neb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, W, H);

      // Secondary offset nebula for depth and asymmetry (soft, no hard edge)
      if (isSession && sessionProgress > 0.08) {
        const ox = CX + Math.sin(t * 0.00035) * 45;
        const oy = CY + Math.cos(t * 0.00028) * 32;
        const neb2 = ctx.createRadialGradient(ox, oy, 0, ox, oy, nebR * 0.55);
        neb2.addColorStop(0, `rgba(${nr},${ng},${Math.round(nb*1.1)},${nA * 0.22})`);
        neb2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = neb2;
        ctx.fillRect(0, 0, W, H);
      }

      // ── STAGE 3: Galaxy spiral arm hints ──
      if (getStage(userCatatons) === 3 && isSession && sessionProgress > 0.5) {
        const intensity = Math.min(1, (sessionProgress - 0.5) * 2);
        const armA = 0.04 * intensity;
        ctx.save();
        ctx.globalAlpha = armA;
        for (let arm = 0; arm < 2; arm++) {
          ctx.beginPath();
          const base = arm * Math.PI + t * 0.000065;
          for (let r = 14; r < Math.min(W, H) * 0.44; r += 1.2) {
            const a  = base + r * 0.019;
            const px = CX + Math.cos(a) * r;
            const py = CY + Math.sin(a) * r;
            r === 14 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.strokeStyle = 'rgba(212,168,48,0.9)';
          ctx.lineWidth   = 0.6;
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── THRESHOLD: pressure wave swells (deep indigo, not teal) ──
      waveRings.forEach(r => {
        ctx.beginPath();
        ctx.arc(CX, CY, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(74,86,150,${r.alpha})`;
        ctx.lineWidth   = 0.7;
        ctx.stroke();
      });

      // ── IGNITION: Exhale shockwave rings ──
      shockwaves.forEach(sw => {
        const p = sw.r / sw.maxR;
        ctx.beginPath();
        ctx.arc(CX, CY, sw.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212,168,48,${sw.alpha})`;
        ctx.lineWidth   = 2 * (1 - p);
        ctx.stroke();
        // Inner echo ring
        if (sw.r > 20) {
          ctx.beginPath();
          ctx.arc(CX, CY, sw.r * 0.65, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(212,197,161,${sw.alpha * 0.22})`;
          ctx.lineWidth   = 0.5;
          ctx.stroke();
        }
      });

      // ── BACKGROUND DUST ──
      dust.forEach(d => {
        const tw = 0.45 + 0.55 * Math.sin(d.twinkle);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${d.hue},18%,55%,${d.alpha * tw})`;
        ctx.fill();
      });

      // ── MAIN PARTICLES ──
      particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);

        const fragFade = sessionProgress / 0.52; // fragments fully resolve by 52% session

        if (p.fragment && sessionProgress < 0.52) {
          // Rotating broken shard — the void's debris
          const len = p.size * (2.8 - fragFade * 1.8);
          ctx.rotate(p.fragAngle);
          ctx.beginPath();
          ctx.moveTo(-len, 0);
          ctx.lineTo( len, 0);
          ctx.strokeStyle = `hsla(${p.hue},${p.sat}%,${p.lit}%,${p.alpha * (1 - fragFade * 0.45)})`;
          ctx.lineWidth = Math.max(0.3, p.size * 0.55);
          ctx.stroke();
          // Perpendicular cross on heavier fragments
          if (p.mass > 1.3 && fragFade < 0.7) {
            ctx.beginPath();
            ctx.moveTo(0, -len * 0.55);
            ctx.lineTo(0,  len * 0.55);
            ctx.stroke();
          }
        } else {
          // Particle — grows in size as session progresses
          const r = Math.max(0.25, p.size * (0.4 + (isSession ? sessionProgress * 1.0 : 0.08)));
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${p.lit}%,${p.alpha})`;
          ctx.fill();

          // Glow halo for hot particles near the forming core
          if (p.lit > 32 && isSession) {
            ctx.beginPath();
            ctx.arc(0, 0, r * 4, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${p.lit}%,${p.alpha * 0.1})`;
            ctx.fill();
          }
        }
        ctx.restore();
      });

      // ── CORE FORMATION ──
      // Emerges at 12% session progress — the star nucleus forming
      if (isSession && sessionProgress > 0.12) {
        const cp = Math.min(1, (sessionProgress - 0.12) / 0.52);

        // Outer halo glow
        const haloR = 45 + cp * 90;
        const halo  = ctx.createRadialGradient(CX, CY, 0, CX, CY, haloR);
        halo.addColorStop(0,   `rgba(212,168,48,${cp * 0.20})`);
        halo.addColorStop(0.45,`rgba(180,120,30,${cp * 0.07})`);
        halo.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, W, H);

        // Pulsating emission rings (3 staggered rings emanating from core)
        for (let i = 0; i < 3; i++) {
          const pulse = ((t * 0.007 + i * 0.333) % 1);
          const pR = cp * (12 + pulse * 68);
          const pA = cp * 0.30 * (1 - pulse) * (1 - pulse);
          ctx.beginPath();
          ctx.arc(CX, CY, pR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(212,168,48,${pA})`;
          ctx.lineWidth   = 1.8 * (1 - pulse);
          ctx.stroke();
        }

        // Inner stellar nucleus
        const coreR = 1.8 + cp * 9 + Math.sin(t * 0.022) * cp * 2.2;
        const core  = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreR * 5);
        const cA    = cp * 0.92;
        core.addColorStop(0,   `rgba(255,248,210,${cA})`);
        core.addColorStop(0.25,`rgba(240,200,80,${cA * 0.65})`);
        core.addColorStop(0.6, `rgba(190,130,35,${cA * 0.22})`);
        core.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, W, H);
      }

      // ── IGNITION: Breath ring (visual feedback layer) ──
      if (mode === 'visual') {
        const phase = state.breathPhase;
        const cycleLen = phase === 'in' ? 4000 : phase === 'hold' ? 2000 : 5000;
        const cycleP   = (t % cycleLen) / cycleLen;
        const bR = phase === 'in'   ? 18 + cycleP * 110 :
                   phase === 'hold' ? 128 :
                                      128 - cycleP * 90;
        const bA = phase === 'hold' ? 0.055 : 0.035 + cycleP * 0.045;
        ctx.beginPath();
        ctx.arc(CX, CY, Math.max(1, bR), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212,168,48,${bA * (isSession ? 1 : 0.25)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Second ring at 1.7x
        ctx.beginPath();
        ctx.arc(CX, CY, Math.max(1, bR * 1.7), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212,168,48,${bA * 0.35 * (isSession ? 1 : 0.25)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // ── STAR BIRTH FLASH (on session completion) ──
      if (starFlash > 0.01) {
        const sf  = ctx.createRadialGradient(CX, CY, 0, CX, CY, Math.min(W, H) * 0.6 * Math.min(1, starFlash * 1.2));
        sf.addColorStop(0,   `rgba(255,255,255,${starFlash * 0.92})`);
        sf.addColorStop(0.08,`rgba(255,235,150,${starFlash * 0.65})`);
        sf.addColorStop(0.3, `rgba(212,168,48,${starFlash * 0.22})`);
        sf.addColorStop(0.7, `rgba(94,60,10,${starFlash * 0.06})`);
        sf.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = sf;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // ── MAIN LOOP ──
    let firstFrameRendered = false;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hideLoader() {
      const el = document.getElementById('catLoader');
      if (el) el.classList.add('hidden');
    }
    function loop() {
      t++;
      if (isSession && state.totalSeconds > 0) {
        sessionProgress = Math.max(0, Math.min(1, 1 - (state.secondsLeft / state.totalSeconds)));
      }
      // Front-loaded warmth: rises fast early so the first minutes already
      // move off cold blue (pow<1). Idle sessionProgress is 0 → warmProg 0.
      warmProg = Math.pow(sessionProgress, 0.6);
      if (!reduceMotion) update();
      render();
      if (!firstFrameRendered) { firstFrameRendered = true; hideLoader(); }
      if (!running) return;
      if (reduceMotion) {
        animId = setTimeout(loop, 166);
      } else {
        animId = requestAnimationFrame(loop);
      }
    }

    return {
      start(m, catatons) {
        mode         = m;
        userCatatons = catatons;
        isSession    = true;
        // Don't re-init — idle void transitions seamlessly into session
      },

      stop() {
        running   = false;
        isSession = false;
        if (animId) { cancelAnimationFrame(animId); clearTimeout(animId); animId = null; }
      },

      addShockwave() {
        shockwaves.push({
          r: 10, maxR: Math.min(W, H) * 0.58,
          alpha: 0.55, force: 0.42, speed: 3.8,
        });
      },

      triggerStar() {
        starFlash = 1.0;
      },

      // Boot the idle void (runs on setup screen before session starts)
      initIdle(catatons) {
        userCatatons = catatons || 0;
        resizeCanvas();
        initParticles();
        if (!running) {
          running = true;
          loop();
        }
      },

      resize() {
        resizeCanvas();
      },
    };
  })();

  // ── RESIZE ──
  window.addEventListener('resize', () => voidEngine.resize());

  // ── BOOT ── idle void starts immediately on page load
  voidEngine.initIdle(state.catatons);

  // ── KEYBOARD ──
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      panelOpen = !panelOpen;
      panel.classList.toggle('open', panelOpen);
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
