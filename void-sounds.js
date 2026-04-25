/**
 * VoidSounds — Web Audio API sound engine for Catatonica
 * Pure synthesis, no external audio files required
 */

const VoidSounds = (function() {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────

  let ctx = null;
  let initialized = false;

  // Gain nodes for mixing
  let masterGain = null;
  let ambientGain = null;
  let uiGain = null;
  let cosmicGain = null;

  // Envelope constants (in seconds) to prevent clicks
  const ATTACK_MIN = 0.01;      // 10ms minimum attack
  const RELEASE_MIN = 0.035;    // 35ms minimum release
  const RELEASE_TAIL = 0.008;   // 8ms final linear ramp to true zero

  // Current ambient state
  let currentAmbient = null;
  let ambientNodes = [];
  let ambientStartTime = 0;

  // Settings with defaults
  let settings = {
    master: 0.7,
    ambient: 0.8,
    ui: 0.4,
    cosmic: 0.9,
    ambientEnabled: true,
    uiEnabled: true,
    cosmicEnabled: true
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  function createPinkNoise(audioContext, duration) {
    // Pink noise: equal energy per octave (falls off at 3dB/octave)
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    return buffer;
  }

  function stopNodes(nodes) {
    nodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {
        // Node may already be stopped
      }
    });
  }

  function safeAttack(gainNode, targetValue, startTime) {
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(targetValue, startTime + ATTACK_MIN);
  }

  function safeRelease(gainNode, startTime, duration) {
    const releaseStart = startTime + duration - RELEASE_MIN - RELEASE_TAIL;
    gainNode.gain.setValueAtTime(gainNode.gain.value, releaseStart);
    gainNode.gain.exponentialRampToValueAtTime(0.001, releaseStart + RELEASE_MIN);
    gainNode.gain.linearRampToValueAtTime(0, releaseStart + RELEASE_MIN + RELEASE_TAIL);
  }

  function stopTime(startTime, duration) {
    return startTime + duration + 0.01;
  }

  function applyGainSettings() {
    if (!initialized) return;
    masterGain.gain.setValueAtTime(settings.master, ctx.currentTime);
    ambientGain.gain.setValueAtTime(settings.ambientEnabled ? settings.ambient : 0, ctx.currentTime);
    uiGain.gain.setValueAtTime(settings.uiEnabled ? settings.ui : 0, ctx.currentTime);
    cosmicGain.gain.setValueAtTime(settings.cosmicEnabled ? settings.cosmic : 0, ctx.currentTime);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Ambient Soundscapes
  // ─────────────────────────────────────────────────────────────────────────────

  const ambients = {
    /**
     * hush — sustained low drone, cathedral quiet
     */
    hush: function() {
      const nodes = [];
      const gainNodes = [];
      const now = ctx.currentTime;

      // Low drone at ~45Hz (raised ~40% from 0.12 to 0.168)
      const droneOsc = ctx.createOscillator();
      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(45, now);

      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0, now);
      droneGain.gain.linearRampToValueAtTime(0.168, now + ATTACK_MIN);

      droneOsc.connect(droneGain);
      droneOsc.start(now);
      nodes.push(droneOsc);
      gainNodes.push(droneGain);

      // Slow breathing LFO on drone filter
      const breathFilter = ctx.createBiquadFilter();
      breathFilter.type = 'lowpass';
      breathFilter.frequency.setValueAtTime(200, now);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.05, now);

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(100, now);

      lfo.connect(lfoGain);
      lfoGain.connect(breathFilter.frequency);
      lfo.start(now);
      nodes.push(lfo);

      droneGain.connect(breathFilter);
      breathFilter.connect(ambientGain);

      // 90Hz presence layer with slow left-right panning
      const presenceOsc = ctx.createOscillator();
      presenceOsc.type = 'sine';
      presenceOsc.frequency.setValueAtTime(90, now);

      const presenceGain = ctx.createGain();
      presenceGain.gain.setValueAtTime(0, now);
      presenceGain.gain.linearRampToValueAtTime(0.05, now + ATTACK_MIN);

      const panner = ctx.createStereoPanner();
      const panLfo = ctx.createOscillator();
      panLfo.type = 'sine';
      panLfo.frequency.setValueAtTime(0.04, now);

      const panLfoGain = ctx.createGain();
      panLfoGain.gain.setValueAtTime(0.6, now);

      panLfo.connect(panLfoGain);
      panLfoGain.connect(panner.pan);

      presenceOsc.connect(presenceGain);
      presenceGain.connect(panner);
      panner.connect(ambientGain);

      presenceOsc.start(now);
      panLfo.start(now);
      nodes.push(presenceOsc, panLfo);
      gainNodes.push(presenceGain);

      // High whisper layer with pink noise modulation
      const noiseBuffer = createPinkNoise(ctx, 4);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const whisperFilter = ctx.createBiquadFilter();
      whisperFilter.type = 'bandpass';
      whisperFilter.frequency.setValueAtTime(2200, now);
      whisperFilter.Q.setValueAtTime(8, now);

      const whisperGain = ctx.createGain();
      whisperGain.gain.setValueAtTime(0, now);
      whisperGain.gain.linearRampToValueAtTime(0.015, now + ATTACK_MIN);

      noiseSource.connect(whisperFilter);
      whisperFilter.connect(whisperGain);
      whisperGain.connect(ambientGain);
      noiseSource.start(now);
      nodes.push(noiseSource);
      gainNodes.push(whisperGain);

      // Store gain nodes for graceful release
      nodes.gainNodes = gainNodes;

      return nodes;
    },

    /**
     * deep — ocean-like swells, 6-second breath cycles
     */
    deep: function() {
      const nodes = [];
      const gainNodes = [];
      const now = ctx.currentTime;

      // Pink noise through lowpass for main ocean texture
      const noiseBuffer = createPinkNoise(ctx, 6);
      const oceanNoise = ctx.createBufferSource();
      oceanNoise.buffer = noiseBuffer;
      oceanNoise.loop = true;

      const oceanFilter = ctx.createBiquadFilter();
      oceanFilter.type = 'lowpass';
      oceanFilter.frequency.setValueAtTime(240, now);
      oceanFilter.Q.setValueAtTime(1, now);

      // Envelope wrapper for ocean gain (handles attack, LFO modulates within)
      const oceanEnvelope = ctx.createGain();
      oceanEnvelope.gain.setValueAtTime(0, now);
      oceanEnvelope.gain.linearRampToValueAtTime(1, now + ATTACK_MIN);
      gainNodes.push(oceanEnvelope);

      const oceanGain = ctx.createGain();
      oceanGain.gain.setValueAtTime(0.14, now);

      // LFO for 6-second breath cycle (0.167Hz)
      const breathLfo = ctx.createOscillator();
      breathLfo.type = 'sine';
      breathLfo.frequency.setValueAtTime(0.167, now);

      const breathLfoGain = ctx.createGain();
      breathLfoGain.gain.setValueAtTime(0.085, now);

      const breathOffset = ctx.createConstantSource();
      breathOffset.offset.setValueAtTime(0.135, now);

      breathLfo.connect(breathLfoGain);
      breathLfoGain.connect(oceanGain.gain);
      breathOffset.connect(oceanGain.gain);
      breathLfo.start(now);
      breathOffset.start(now);
      nodes.push(breathLfo, breathOffset);

      oceanNoise.connect(oceanFilter);
      oceanFilter.connect(oceanGain);
      oceanGain.connect(oceanEnvelope);
      oceanEnvelope.connect(ambientGain);
      oceanNoise.start(now);
      nodes.push(oceanNoise);

      // Deep rumble layer: noise through bandpass at 80Hz
      const rumbleNoise = ctx.createBufferSource();
      rumbleNoise.buffer = noiseBuffer;
      rumbleNoise.loop = true;

      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'bandpass';
      rumbleFilter.frequency.setValueAtTime(80, now);
      rumbleFilter.Q.setValueAtTime(2, now);

      const rumbleGain = ctx.createGain();
      rumbleGain.gain.setValueAtTime(0, now);
      rumbleGain.gain.linearRampToValueAtTime(0.04, now + ATTACK_MIN);
      gainNodes.push(rumbleGain);

      rumbleNoise.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(ambientGain);
      rumbleNoise.start(now);
      nodes.push(rumbleNoise);

      nodes.gainNodes = gainNodes;

      return nodes;
    },

    /**
     * forming — crystalline tones emerging over session
     */
    forming: function() {
      const nodes = [];
      const gainNodes = [];
      const now = ctx.currentTime;

      // Harmonic series from 220Hz
      const harmonics = [220, 440, 660, 880, 1320];
      const fadeInTimes = [0, 20, 25, 30, 180]; // 5th harmonic at 3 minutes

      harmonics.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const gain = ctx.createGain();
        const targetGain = 0.04 / (index + 1); // Quieter higher harmonics

        gain.gain.setValueAtTime(0, now);

        // Fade in at scheduled time (minimum attack time enforced)
        const fadeStart = now + fadeInTimes[index];
        const fadeDuration = Math.max(ATTACK_MIN, 20 + Math.random() * 20);

        gain.gain.setValueAtTime(0, fadeStart);
        gain.gain.linearRampToValueAtTime(targetGain, fadeStart + fadeDuration);

        osc.connect(gain);
        gain.connect(ambientGain);
        osc.start(now);
        nodes.push(osc);
        gainNodes.push(gain);
      });

      // Subtle shimmer: very quiet high frequency modulation
      const shimmerOsc = ctx.createOscillator();
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(1760, now);

      const shimmerGain = ctx.createGain();
      shimmerGain.gain.setValueAtTime(0, now);
      shimmerGain.gain.linearRampToValueAtTime(0.008, now + 60);
      gainNodes.push(shimmerGain);

      const shimmerLfo = ctx.createOscillator();
      shimmerLfo.type = 'sine';
      shimmerLfo.frequency.setValueAtTime(0.1, now);

      const shimmerLfoGain = ctx.createGain();
      shimmerLfoGain.gain.setValueAtTime(0.004, now);

      shimmerLfo.connect(shimmerLfoGain);
      shimmerLfoGain.connect(shimmerGain.gain);

      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(ambientGain);
      shimmerOsc.start(now);
      shimmerLfo.start(now);
      nodes.push(shimmerOsc, shimmerLfo);

      nodes.gainNodes = gainNodes;

      return nodes;
    },

    /**
     * threshold — pressurized wave tones for birthing mode
     */
    threshold: function() {
      const nodes = [];
      const gainNodes = [];
      const now = ctx.currentTime;

      // Envelope wrapper for drones (LFO modulates within)
      const droneEnvelope = ctx.createGain();
      droneEnvelope.gain.setValueAtTime(0, now);
      droneEnvelope.gain.linearRampToValueAtTime(1, now + ATTACK_MIN);
      gainNodes.push(droneEnvelope);

      // Low drone at 60Hz
      const droneOsc = ctx.createOscillator();
      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(60, now);

      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.15, now);

      droneOsc.connect(droneGain);
      droneGain.connect(droneEnvelope);
      droneOsc.start(now);
      nodes.push(droneOsc);

      // Harmonic at 90Hz
      const harmOsc = ctx.createOscillator();
      harmOsc.type = 'sine';
      harmOsc.frequency.setValueAtTime(90, now);

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.10, now);

      harmOsc.connect(harmGain);
      harmGain.connect(droneEnvelope);
      harmOsc.start(now);
      nodes.push(harmOsc);

      droneEnvelope.connect(ambientGain);

      // Wave pulse LFO at 0.15Hz modulating amplitude
      const pulseLfo = ctx.createOscillator();
      pulseLfo.type = 'sine';
      pulseLfo.frequency.setValueAtTime(0.15, now);

      const pulseLfoGain = ctx.createGain();
      pulseLfoGain.gain.setValueAtTime(0.05, now);

      pulseLfo.connect(pulseLfoGain);
      pulseLfoGain.connect(droneGain.gain);
      pulseLfoGain.connect(harmGain.gain);
      pulseLfo.start(now);
      nodes.push(pulseLfo);

      // Bandpass sweep 200Hz → 800Hz over 30s, then back
      const sweepNoise = ctx.createBufferSource();
      sweepNoise.buffer = createPinkNoise(ctx, 4);
      sweepNoise.loop = true;

      const sweepFilter = ctx.createBiquadFilter();
      sweepFilter.type = 'bandpass';
      sweepFilter.Q.setValueAtTime(3, now);

      // Sweep automation (30s each direction, looping conceptually)
      sweepFilter.frequency.setValueAtTime(200, now);
      sweepFilter.frequency.linearRampToValueAtTime(800, now + 30);
      sweepFilter.frequency.linearRampToValueAtTime(200, now + 60);
      sweepFilter.frequency.linearRampToValueAtTime(800, now + 90);
      sweepFilter.frequency.linearRampToValueAtTime(200, now + 120);

      const sweepGain = ctx.createGain();
      sweepGain.gain.setValueAtTime(0, now);
      sweepGain.gain.linearRampToValueAtTime(0.06, now + ATTACK_MIN);
      gainNodes.push(sweepGain);

      sweepNoise.connect(sweepFilter);
      sweepFilter.connect(sweepGain);
      sweepGain.connect(ambientGain);
      sweepNoise.start(now);
      nodes.push(sweepNoise);

      nodes.gainNodes = gainNodes;

      return nodes;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // UI Sounds
  // ─────────────────────────────────────────────────────────────────────────────

  const ui = {
    /**
     * press — subtle button feedback, ~120ms
     */
    press: function() {
      if (!initialized || !settings.uiEnabled) return;

      const now = ctx.currentTime;
      const duration = 0.12;

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + ATTACK_MIN);
      gain.gain.setValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(gain);
      gain.connect(uiGain);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    },

    /**
     * enter — stepping through a threshold, resonant pulse
     */
    enter: function() {
      if (!initialized || !settings.uiEnabled) return;

      const now = ctx.currentTime;
      const duration = 1.25;

      // Two sine waves in perfect fifth
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(110, now);
      osc1.frequency.linearRampToValueAtTime(115.5, now + duration);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(165, now);
      osc2.frequency.linearRampToValueAtTime(173.25, now + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
      gain.gain.setValueAtTime(0.12, now + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(uiGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.01);
      osc2.stop(now + duration + 0.01);
    },

    /**
     * name — crystalline FM bell when situation is named
     */
    name: function() {
      if (!initialized || !settings.uiEnabled) return;

      const now = ctx.currentTime;
      const duration = 1.25;

      // FM synthesis: carrier 880Hz, modulator 440Hz, index 2
      const modulator = ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(440, now);

      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(880, now);

      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(880, now);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(0.18, now + ATTACK_MIN);
      envelope.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
      envelope.gain.linearRampToValueAtTime(0, now + duration);

      carrier.connect(envelope);
      envelope.connect(uiGain);

      modulator.start(now);
      carrier.start(now);
      modulator.stop(now + duration + 0.01);
      carrier.stop(now + duration + 0.01);
    },

    /**
     * begin — session begin swell
     */
    begin: function() {
      if (!initialized || !settings.uiEnabled) return;

      const now = ctx.currentTime;
      const duration = 1.85;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.8);
      gain.gain.setValueAtTime(0.3, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(gain);
      gain.connect(uiGain);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    },

    /**
     * bell — struck bowl exit tone (Pass 2).
     *   440Hz sine fundamental + 880Hz overtone at 30%, routed through a
     *   2kHz low-pass. 10ms attack, 2.5s exponential decay, peak 0.25.
     *   A small bowl struck in a dry close room — no reverb, native nodes only.
     */
    bell: function() {
      if (!initialized || !settings.uiEnabled) return;

      const now = ctx.currentTime;
      const attack = 0.010;
      const decay  = 2.500;
      const peak   = 0.25;

      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 2000;
      lpf.Q.value = 0.7;
      lpf.connect(uiGain);

      const fund = ctx.createOscillator();
      fund.type = 'sine';
      fund.frequency.setValueAtTime(440, now);
      const fundGain = ctx.createGain();
      fundGain.gain.setValueAtTime(0.0001, now);
      fundGain.gain.linearRampToValueAtTime(peak, now + attack);
      fundGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
      fund.connect(fundGain);
      fundGain.connect(lpf);

      const over = ctx.createOscillator();
      over.type = 'sine';
      over.frequency.setValueAtTime(880, now);
      const overGain = ctx.createGain();
      overGain.gain.setValueAtTime(0.0001, now);
      overGain.gain.linearRampToValueAtTime(peak * 0.30, now + attack);
      overGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
      over.connect(overGain);
      overGain.connect(lpf);

      const stopAt = now + attack + decay + 0.05;
      fund.start(now); over.start(now);
      fund.stop(stopAt); over.stop(stopAt);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Cosmic Events
  // ─────────────────────────────────────────────────────────────────────────────

  const cosmic = {
    /**
     * clump — faint chime for first particle attraction
     */
    clump: function() {
      if (!initialized || !settings.cosmicEnabled) return;

      const now = ctx.currentTime;
      const duration = 0.85;

      // FM bell at 660Hz, very quiet
      const modulator = ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(330, now);

      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(660, now);

      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(660, now);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(0.08, now + ATTACK_MIN);
      envelope.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
      envelope.gain.linearRampToValueAtTime(0, now + duration);

      carrier.connect(envelope);
      envelope.connect(cosmicGain);

      modulator.start(now);
      carrier.start(now);
      modulator.stop(now + duration + 0.01);
      carrier.stop(now + duration + 0.01);
    },

    /**
     * ignition — bass swell when star core forms
     */
    ignition: function() {
      if (!initialized || !settings.cosmicEnabled) return;

      const now = ctx.currentTime;
      const duration = 3.05;

      // Sine sweep 45Hz → 90Hz
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(45, now);
      osc.frequency.linearRampToValueAtTime(90, now + 2);

      // Bandpass filter sweep 200Hz → 400Hz
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(2, now);
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.linearRampToValueAtTime(400, now + 2);

      // Envelope: swell 0→0.4 over 1.5s, hold 500ms, decay 1s
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 1.5);
      gain.gain.setValueAtTime(0.4, now + 2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(cosmicGain);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    },

    /**
     * stageCross — reverent C major chord, 3 seconds
     */
    stageCross: function() {
      if (!initialized || !settings.cosmicEnabled) return;

      const now = ctx.currentTime;
      const duration = 3.05;

      // C major: C4, E4, G4
      const freqs = [261.63, 329.63, 392.00];
      const oscs = [];

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0, now);
      mainGain.gain.linearRampToValueAtTime(0.18, now + 0.5);
      mainGain.gain.setValueAtTime(0.18, now + 2.4);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
      mainGain.gain.linearRampToValueAtTime(0, now + duration);

      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(mainGain);
        osc.start(now);
        osc.stop(now + duration + 0.01);
        oscs.push(osc);
      });

      mainGain.connect(cosmicGain);

      // Octave C that fades in during sustain
      const octaveOsc = ctx.createOscillator();
      octaveOsc.type = 'sine';
      octaveOsc.frequency.setValueAtTime(523.25, now);

      const octaveGain = ctx.createGain();
      octaveGain.gain.setValueAtTime(0, now);
      octaveGain.gain.setValueAtTime(0, now + 0.5);
      octaveGain.gain.linearRampToValueAtTime(0.1, now + 2);
      octaveGain.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
      octaveGain.gain.linearRampToValueAtTime(0, now + duration);

      octaveOsc.connect(octaveGain);
      octaveGain.connect(cosmicGain);

      octaveOsc.start(now);
      octaveOsc.stop(now + duration + 0.01);
    },

    /**
     * ritual — emotional minor-to-major progression, 5 seconds
     */
    ritual: function() {
      if (!initialized || !settings.cosmicEnabled) return;

      const now = ctx.currentTime;
      const duration = 5.05;

      // Low drone at 55Hz throughout
      const droneOsc = ctx.createOscillator();
      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(55, now);

      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0, now);
      droneGain.gain.linearRampToValueAtTime(0.15, now + 0.5);
      droneGain.gain.setValueAtTime(0.15, now + 4);
      droneGain.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
      droneGain.gain.linearRampToValueAtTime(0, now + duration);

      droneOsc.connect(droneGain);
      droneGain.connect(cosmicGain);
      droneOsc.start(now);
      droneOsc.stop(now + duration + 0.01);

      // Chord progression oscillators
      // A minor: A3 (220), C4 (261.63), E4 (329.63)
      // F major: F3 (174.61), A3 (220), C4 (261.63)
      // C major: C4 (261.63), E4 (329.63), G4 (392)

      const chordOscs = [];
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        chordOscs.push(osc);
      }

      // Voice 1: 220 → 174.61 → 261.63
      chordOscs[0].frequency.setValueAtTime(220, now);
      chordOscs[0].frequency.setValueAtTime(220, now + 1.8);
      chordOscs[0].frequency.linearRampToValueAtTime(174.61, now + 2.2);
      chordOscs[0].frequency.setValueAtTime(174.61, now + 3.3);
      chordOscs[0].frequency.linearRampToValueAtTime(261.63, now + 3.7);

      // Voice 2: 261.63 → 220 → 329.63
      chordOscs[1].frequency.setValueAtTime(261.63, now);
      chordOscs[1].frequency.setValueAtTime(261.63, now + 1.8);
      chordOscs[1].frequency.linearRampToValueAtTime(220, now + 2.2);
      chordOscs[1].frequency.setValueAtTime(220, now + 3.3);
      chordOscs[1].frequency.linearRampToValueAtTime(329.63, now + 3.7);

      // Voice 3: 329.63 → 261.63 → 392
      chordOscs[2].frequency.setValueAtTime(329.63, now);
      chordOscs[2].frequency.setValueAtTime(329.63, now + 1.8);
      chordOscs[2].frequency.linearRampToValueAtTime(261.63, now + 2.2);
      chordOscs[2].frequency.setValueAtTime(261.63, now + 3.3);
      chordOscs[2].frequency.linearRampToValueAtTime(392, now + 3.7);

      const chordGain = ctx.createGain();
      chordGain.gain.setValueAtTime(0, now);
      chordGain.gain.linearRampToValueAtTime(0.12, now + 0.8);
      chordGain.gain.setValueAtTime(0.12, now + 4);
      chordGain.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
      chordGain.gain.linearRampToValueAtTime(0, now + duration);

      chordOscs.forEach(osc => {
        osc.connect(chordGain);
        osc.start(now);
        osc.stop(now + duration + 0.01);
      });

      chordGain.connect(cosmicGain);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    /**
     * Initialize the audio context — must be called after user interaction
     */
    init: function() {
      if (initialized && ctx) {
        // Resume if suspended
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        return;
      }

      ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Create gain node hierarchy
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);

      ambientGain = ctx.createGain();
      ambientGain.connect(masterGain);

      uiGain = ctx.createGain();
      uiGain.connect(masterGain);

      cosmicGain = ctx.createGain();
      cosmicGain.connect(masterGain);

      initialized = true;

      // Load saved settings
      this.loadSettings();
      applyGainSettings();
    },

    /**
     * Ambient soundscape controls
     */
    ambient: {
      play: function(name) {
        if (!initialized) return;
        if (!ambients[name]) {
          console.warn('VoidSounds: Unknown ambient "' + name + '"');
          return;
        }

        // Gracefully release current ambient if playing
        if (currentAmbient && ambientNodes.length > 0) {
          const now = ctx.currentTime;
          const oldNodes = ambientNodes;
          const oldGainNodes = ambientNodes.gainNodes || [];

          // Fade out gain nodes gracefully
          oldGainNodes.forEach(gainNode => {
            try {
              gainNode.gain.cancelScheduledValues(now);
              gainNode.gain.setValueAtTime(gainNode.gain.value, now);
              gainNode.gain.exponentialRampToValueAtTime(0.001, now + RELEASE_MIN);
              gainNode.gain.linearRampToValueAtTime(0, now + RELEASE_MIN + RELEASE_TAIL);
            } catch (e) {}
          });

          // Stop nodes after release completes
          setTimeout(() => {
            stopNodes(oldNodes);
          }, (RELEASE_MIN + RELEASE_TAIL) * 1000 + 50);
        }

        currentAmbient = name;
        ambientStartTime = ctx.currentTime;
        ambientNodes = ambients[name]();
      },

      stop: function(fadeDuration) {
        if (!initialized || !currentAmbient) return;

        fadeDuration = Math.max(fadeDuration || 1, RELEASE_MIN + RELEASE_TAIL);
        const now = ctx.currentTime;
        const gainNodes = ambientNodes.gainNodes || [];

        // Fade out individual gain nodes for click-free release
        gainNodes.forEach(gainNode => {
          try {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + fadeDuration - RELEASE_TAIL);
            gainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);
          } catch (e) {}
        });

        // Also fade the ambient bus as backup
        ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
        ambientGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

        // Schedule cleanup
        setTimeout(() => {
          stopNodes(ambientNodes);
          ambientNodes = [];
          currentAmbient = null;
          // Restore gain
          ambientGain.gain.setValueAtTime(settings.ambientEnabled ? settings.ambient : 0, ctx.currentTime);
        }, fadeDuration * 1000 + 100);
      },

      crossfade: function(name, duration) {
        if (!initialized) return;
        if (!ambients[name]) {
          console.warn('VoidSounds: Unknown ambient "' + name + '"');
          return;
        }

        duration = Math.max(duration || 2, RELEASE_MIN + RELEASE_TAIL);
        const now = ctx.currentTime;
        const oldNodes = ambientNodes;
        const oldGainNodes = ambientNodes.gainNodes || [];

        // Fade out old ambient's gain nodes gracefully
        oldGainNodes.forEach(gainNode => {
          try {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration - RELEASE_TAIL);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);
          } catch (e) {}
        });

        // Start new ambient (it will fade in via its own attack envelopes)
        currentAmbient = name;
        ambientStartTime = ctx.currentTime;
        ambientNodes = ambients[name]();

        // Cleanup old nodes after fade
        setTimeout(() => {
          stopNodes(oldNodes);
        }, duration * 1000 + 100);
      },

      current: function() {
        return currentAmbient;
      }
    },

    /**
     * UI sound effects
     */
    ui: ui,

    /**
     * Cosmic event sounds
     */
    cosmic: cosmic,

    /**
     * Set volume for a category
     * @param {string} category - 'master' | 'ambient' | 'ui' | 'cosmic'
     * @param {number} value - 0 to 1
     */
    setVolume: function(category, value) {
      value = Math.max(0, Math.min(1, value));

      switch (category) {
        case 'master':
          settings.master = value;
          if (initialized) masterGain.gain.setValueAtTime(value, ctx.currentTime);
          break;
        case 'ambient':
          settings.ambient = value;
          if (initialized && settings.ambientEnabled) {
            ambientGain.gain.setValueAtTime(value, ctx.currentTime);
          }
          break;
        case 'ui':
          settings.ui = value;
          if (initialized && settings.uiEnabled) {
            uiGain.gain.setValueAtTime(value, ctx.currentTime);
          }
          break;
        case 'cosmic':
          settings.cosmic = value;
          if (initialized && settings.cosmicEnabled) {
            cosmicGain.gain.setValueAtTime(value, ctx.currentTime);
          }
          break;
      }
    },

    /**
     * Enable or disable a sound category
     * @param {string} category - 'ambient' | 'ui' | 'cosmic'
     * @param {boolean} enabled
     */
    setEnabled: function(category, enabled) {
      switch (category) {
        case 'ambient':
          settings.ambientEnabled = enabled;
          if (initialized) {
            ambientGain.gain.setValueAtTime(enabled ? settings.ambient : 0, ctx.currentTime);
          }
          break;
        case 'ui':
          settings.uiEnabled = enabled;
          if (initialized) {
            uiGain.gain.setValueAtTime(enabled ? settings.ui : 0, ctx.currentTime);
          }
          break;
        case 'cosmic':
          settings.cosmicEnabled = enabled;
          if (initialized) {
            cosmicGain.gain.setValueAtTime(enabled ? settings.cosmic : 0, ctx.currentTime);
          }
          break;
      }
    },

    /**
     * Get current settings
     */
    getSettings: function() {
      return { ...settings };
    },

    /**
     * Save settings to localStorage
     */
    saveSettings: function() {
      try {
        localStorage.setItem('catatonica_sound_settings', JSON.stringify(settings));
      } catch (e) {
        console.warn('VoidSounds: Could not save settings', e);
      }
    },

    /**
     * Load settings from localStorage
     */
    loadSettings: function() {
      try {
        const saved = localStorage.getItem('catatonica_sound_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          settings = { ...settings, ...parsed };
          applyGainSettings();
        }
      } catch (e) {
        console.warn('VoidSounds: Could not load settings', e);
      }
    }
  };
})();
