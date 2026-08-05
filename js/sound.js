/* =============================================================================
   SOUND — Souls-flavored UI audio, fully synthesized with WebAudio.
   Muted by default; one toggle button. No audio files, no autoplay-sound.
   API: SFX.play("tick" | "confirm" | "chime" | "rest"), SFX.enabled
============================================================================= */
(function () {
  let ctx = null;
  let master = null;
  let enabled = false;
  let ambience = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  /* ------------------------------------------------------------ one-shots */
  function tone(freq, dur, type, gain, delay = 0) {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noiseBurst(dur, freq, q, gain, delay = 0) {
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  const sounds = {
    // Menu-move tick: short, dry, high
    tick() { tone(1150, 0.05, "square", 0.025); tone(2300, 0.03, "sine", 0.012); },
    // Heavy confirm: low thud + metallic ring
    confirm() {
      tone(110, 0.28, "sine", 0.22);
      tone(55, 0.34, "sine", 0.18);
      noiseBurst(0.12, 2600, 1.2, 0.05);
      tone(1720, 0.5, "sine", 0.02, 0.03);
    },
    // Achievement chime: two-note bell
    chime() {
      tone(880, 0.7, "sine", 0.07);
      tone(1318.5, 0.9, "sine", 0.06, 0.12);
      tone(2637, 0.5, "sine", 0.015, 0.12);
    },
    // Footstep: soft low thud on stone
    step() {
      noiseBurst(0.06, 240 + Math.random() * 120, 1.1, 0.05);
      tone(70 + Math.random() * 25, 0.07, "sine", 0.05);
    },
    // Bonfire rest: deep whoosh + ember crackle
    rest() {
      tone(70, 0.9, "sine", 0.25);
      noiseBurst(0.6, 400, 0.6, 0.10);
      noiseBurst(0.25, 1800, 2, 0.05, 0.15);
      tone(440, 1.2, "sine", 0.03, 0.2);
    },
  };

  /* ------------------------------------------------------------- ambience */
  function startAmbience() {
    if (ambience) return;
    // soft filtered noise bed (wind/fire) + scheduled crackles
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { // brown-ish noise
      last = (last + (Math.random() * 2 - 1) * 0.02) * 0.998;
      d[i] = last * 3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420;
    const g = ctx.createGain(); g.gain.value = 0.05;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
    const timer = setInterval(() => {
      if (!enabled) return;
      if (Math.random() < 0.65) noiseBurst(0.03 + Math.random() * 0.05, 1500 + Math.random() * 2500, 3, 0.012 + Math.random() * 0.02);
    }, 380);
    ambience = { src, g, timer };
  }
  function stopAmbience() {
    if (!ambience) return;
    clearInterval(ambience.timer);
    try { ambience.src.stop(); } catch (e) {}
    ambience = null;
  }

  /* ---------------------------------------------------------------- API */
  window.SFX = {
    get enabled() { return enabled; },
    play(name) {
      if (!enabled || !sounds[name]) return;
      try { ensureCtx(); sounds[name](); } catch (e) {}
    },
    toggle() {
      enabled = !enabled;
      try {
        ensureCtx();
        if (enabled) { startAmbience(); sounds.confirm(); }
        else stopAmbience();
      } catch (e) { enabled = false; }
      return enabled;
    },
  };

  /* ------------------------------------------------- toggle button + hooks */
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("sound-toggle");
    if (btn) {
      btn.addEventListener("click", () => {
        const on = SFX.toggle();
        btn.textContent = on ? "♪ SOUND ON" : "♪ SOUND OFF";
        btn.classList.toggle("on", on);
      });
    }
    // hover ticks on interactive elements (deduped per element)
    let lastTickEl = null;
    document.addEventListener("mouseover", (e) => {
      const el = e.target.closest("a, button, .card, .pill, .skill-node");
      if (el && el !== lastTickEl) { lastTickEl = el; SFX.play("tick"); }
      if (!el) lastTickEl = null;
    }, { passive: true });
  });
})();
