/**
 * VoidAmbient — The universe at rest
 * A quieter sibling of the session voidEngine. Particles drift, not coalesce.
 * The doctrine made visible: even at rest, the void breathes.
 */
const VoidAmbient = (function() {
  'use strict';

  let canvas = null, ctx = null;
  let W = 0, H = 0, CX = 0, CY = 0;
  let particles = [], dust = [], pulseWaves = [];
  let config = { density: 'low', temperature: 'cold', catatons: 0, responsive: true };
  let intensity = 0.5, targetIntensity = 0.5;
  let running = false, animId = null, t = 0;
  let mouse = { x: -1000, y: -1000, active: false, idleTime: 0 };

  const ROTATION_SPEED = (Math.PI * 2) / (120 * 60); // Full rotation every ~120s

  function getStage(c) {
    if (c < 10) return 0;
    if (c < 30) return 1;
    if (c < 70) return 2;
    return 3;
  }

  function getParticleCount() {
    const base = config.density === 'low' ? 60 : 120;
    return base + [0, 8, 16, 24][getStage(config.catatons)];
  }

  function resize() {
    if (!canvas) return;
    const oldW = W || window.innerWidth, oldH = H || window.innerHeight;
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    CX = W / 2; CY = H / 2;
    if (particles.length && oldW && oldH) {
      const sx = W / oldW, sy = H / oldH;
      particles.forEach(p => { p.x = CX + (p.x - oldW/2) * sx; p.y = CY + (p.y - oldH/2) * sy; });
      dust.forEach(d => { d.x *= sx; d.y *= sy; });
    }
  }

  function makeParticle() {
    const angle = Math.random() * Math.PI * 2;
    const maxR = Math.min(W, H) * 0.48, minR = 30;
    const dist = (minR + Math.sqrt(Math.random()) * (maxR - minR)) * (0.7 + Math.random() * 0.3);
    const hue = config.temperature === 'cold' ? { min: 180, max: 200 } : { min: 220, max: 280 };
    return {
      x: CX + Math.cos(angle) * dist, y: CY + Math.sin(angle) * dist,
      baseDist: dist, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
      size: 0.4 + Math.random() * 1.2,
      hue: hue.min + Math.random() * (hue.max - hue.min),
      sat: 20 + Math.random() * 25, lit: 10 + Math.random() * 15,
      alpha: 0.08 + Math.random() * 0.22,
      shimmer: Math.random() * Math.PI * 2, shimmerSpeed: 0.004 + Math.random() * 0.008,
      breathPhase: Math.random() * Math.PI * 2, pulseBoost: 0
    };
  }

  function makeDust() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.03, vy: (Math.random() - 0.5) * 0.03,
      size: 0.15 + Math.random() * 0.25, alpha: 0.015 + Math.random() * 0.035,
      hue: 180 + Math.random() * 40, twinkle: Math.random() * Math.PI * 2
    };
  }

  function initParticles() {
    particles = []; dust = []; pulseWaves = [];
    for (let i = 0; i < getParticleCount(); i++) particles.push(makeParticle());
    for (let i = 0; i < 50; i++) dust.push(makeDust());
  }

  function update() {
    const stage = getStage(config.catatons);
    const breathCycle = Math.sin(t * (Math.PI * 2) / (10 * 60));
    const breathScale = 1 + breathCycle * 0.02 * intensity;

    if (config.responsive) {
      mouse.idleTime++;
      if (mouse.idleTime > 180) mouse.active = false;
    }

    particles.forEach(p => {
      const dx = p.x - CX, dy = p.y - CY;
      const currentAngle = Math.atan2(dy, dx);
      const newAngle = currentAngle + ROTATION_SPEED;
      const breathOffset = Math.sin(t * (Math.PI * 2) / (10 * 60) + p.breathPhase);
      const targetDist = p.baseDist * (1 + breathOffset * 0.025 * intensity);
      const targetX = CX + Math.cos(newAngle) * targetDist * breathScale;
      const targetY = CY + Math.sin(newAngle) * targetDist * breathScale;

      p.vx += (targetX - p.x) * 0.001;
      p.vy += (targetY - p.y) * 0.001;

      if (config.responsive && mouse.active) {
        const mdx = mouse.x - p.x, mdy = mouse.y - p.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 200 && mDist > 10) {
          const force = (1 - mDist / 200) * 0.0008 * intensity;
          p.vx += (mdx / mDist) * force;
          p.vy += (mdy / mDist) * force;
        }
      }

      p.vx *= 0.992; p.vy *= 0.992;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.3) { p.vx *= 0.3 / speed; p.vy *= 0.3 / speed; }
      p.x += p.vx; p.y += p.vy;

      const pDist = Math.sqrt((p.x - CX) ** 2 + (p.y - CY) ** 2);
      const boundary = Math.max(W, H) * 0.55;
      if (pDist > boundary) {
        p.vx += ((CX - p.x) / pDist) * 0.003;
        p.vy += ((CY - p.y) / pDist) * 0.003;
      }

      p.shimmer += p.shimmerSpeed;
      if (p.pulseBoost > 0) p.pulseBoost *= 0.96;

      if (stage >= 2 && Math.random() < 0.0003 && p.hue > 200) {
        p.hue = 35 + Math.random() * 10;
        p.sat = 40 + Math.random() * 20;
        p.lit = 18 + Math.random() * 8;
      }
    });

    dust.forEach(d => {
      d.x += d.vx; d.y += d.vy; d.twinkle += 0.005;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
    });

    pulseWaves = pulseWaves.filter(pw => pw.radius < pw.maxRadius);
    pulseWaves.forEach(pw => {
      pw.radius += pw.speed; pw.alpha *= 0.985;
      particles.forEach(p => {
        const pDist = Math.sqrt((p.x - CX) ** 2 + (p.y - CY) ** 2);
        const diff = Math.abs(pDist - pw.radius);
        if (diff < 40) p.pulseBoost = Math.max(p.pulseBoost, (1 - diff / 40) * pw.alpha * 2);
      });
    });

    if (Math.abs(intensity - targetIntensity) > 0.001) {
      intensity += (targetIntensity - intensity) * 0.02;
    }
  }

  function render() {
    const stage = getStage(config.catatons);
    const trailAlpha = 0.08 + (1 - intensity) * 0.12;
    ctx.fillStyle = `rgba(1,6,10,${trailAlpha})`;
    ctx.fillRect(0, 0, W, H);

    // Nebula glow
    const nebRadius = 50 + intensity * Math.min(W, H) * 0.15;
    const nebHue = config.temperature === 'cold' ? 185 : 240;
    const nebAlpha = 0.04 + intensity * 0.06;
    const neb = ctx.createRadialGradient(CX, CY, 0, CX, CY, nebRadius);
    neb.addColorStop(0, `hsla(${nebHue},35%,5%,${nebAlpha})`);
    neb.addColorStop(0.6, `hsla(${nebHue},25%,3%,${nebAlpha * 0.4})`);
    neb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, W, H);

    // Stage 3: spiral arm hints
    if (stage === 3) {
      ctx.save();
      ctx.globalAlpha = 0.025 * intensity;
      for (let arm = 0; arm < 2; arm++) {
        ctx.beginPath();
        const base = arm * Math.PI + t * 0.00003;
        for (let r = 10; r < Math.min(W, H) * 0.35; r += 2) {
          const a = base + r * 0.012, px = CX + Math.cos(a) * r, py = CY + Math.sin(a) * r;
          r === 10 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = 'rgba(180,140,60,0.8)';
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Pulse waves
    pulseWaves.forEach(pw => {
      ctx.beginPath();
      ctx.arc(CX, CY, pw.radius, 0, Math.PI * 2);
      const pwHue = config.temperature === 'cold' ? 190 : 250;
      ctx.strokeStyle = `hsla(${pwHue},40%,50%,${pw.alpha})`;
      ctx.lineWidth = 1.5 * (1 - pw.radius / pw.maxRadius);
      ctx.stroke();
    });

    // Dust
    dust.forEach(d => {
      const tw = 0.5 + 0.5 * Math.sin(d.twinkle);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${d.hue},15%,45%,${d.alpha * tw * intensity})`;
      ctx.fill();
    });

    // Particles
    particles.forEach(p => {
      const shimVal = Math.sin(p.shimmer) * 0.04;
      const boost = p.pulseBoost;
      const size = p.size * (0.6 + intensity * 0.4);
      const alpha = Math.min(0.9, (p.alpha + shimVal) * intensity + boost * 0.4);
      const lit = p.lit + boost * 30;

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, size), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${lit}%,${alpha})`;
      ctx.fill();

      if (alpha > 0.25 || boost > 0.3) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${lit}%,${alpha * 0.08})`;
        ctx.fill();
      }
    });
  }

  function loop() {
    if (!running) return;
    t++; update(); render();
    animId = requestAnimationFrame(loop);
  }

  function onMouseMove(e) {
    if (!config.responsive) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
    mouse.idleTime = 0;
  }

  function onMouseLeave() {
    mouse.active = false;
    mouse.idleTime = 999;
  }

  return {
    init: function(options) {
      canvas = options.canvas;
      if (!canvas) { console.warn('VoidAmbient: No canvas'); return; }
      ctx = canvas.getContext('2d');
      config.density = options.density || 'low';
      config.temperature = options.temperature || 'cold';
      config.catatons = options.catatons || 0;
      config.responsive = options.responsive !== false;
      resize();
      initParticles();
      window.addEventListener('resize', resize);
      if (config.responsive) {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseleave', onMouseLeave);
      }
    },

    start: function() {
      if (running) return;
      running = true; t = 0;
      loop();
    },

    stop: function() {
      running = false;
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      particles = []; dust = []; pulseWaves = [];
    },

    pulse: function() {
      pulseWaves.push({ radius: 5, maxRadius: Math.min(W, H) * 0.6, speed: 3, alpha: 0.35 });
    },

    setIntensity: function(value) {
      targetIntensity = Math.max(0, Math.min(1, value));
    },

    setCatatons: function(n) {
      const oldStage = getStage(config.catatons);
      config.catatons = n || 0;
      const newStage = getStage(config.catatons);
      if (newStage > oldStage) {
        const target = getParticleCount();
        while (particles.length < target) particles.push(makeParticle());
      }
    }
  };
})();
