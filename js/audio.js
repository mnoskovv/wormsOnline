// Звуки, синтезированные Web Audio. Аудиофайлов нет.
(function (W) {
  let ac = null, master = null, noise = null;
  let muted = false;
  try { muted = localStorage.getItem('worms.muted') === '1'; } catch (e) { /* без сохранения */ }

  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.6;
      const comp = ac.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function env(gain, t, a, peak, dur) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone({ type = 'sine', f0, f1 = f0, dur, peak = 0.3, a = 0.005, delay = 0, vibrato = 0 }) {
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    if (vibrato) {
      const lfo = ac.createOscillator();
      const lg = ac.createGain();
      lfo.frequency.value = 18;
      lg.gain.value = vibrato;
      lfo.connect(lg);
      lg.connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    }
    env(g, t, a, peak, dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function hiss({ type = 'lowpass', f0, f1 = f0, q = 1, dur, peak = 0.4, a = 0.003, delay = 0 }) {
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = noise;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ac.createGain();
    env(g, t, a, peak, dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  function boom(size) {
    hiss({ f0: 1400 + size * 20, f1: 80, dur: 0.4 + size / 60, peak: 0.5 + size / 150 });
    tone({ f0: 140, f1: 35, dur: 0.3 + size / 100, peak: 0.6 });
    hiss({ type: 'highpass', f0: 3000, dur: 0.08, peak: 0.25 });
  }

  const SOUNDS = {
    explosionSmall: () => boom(20),
    explosionMedium: () => boom(40),
    explosionBig: () => boom(60),
    bazookaShot: () => {
      hiss({ type: 'bandpass', f0: 400, f1: 1600, q: 2, dur: 0.35, peak: 0.5 });
      tone({ type: 'triangle', f0: 220, f1: 90, dur: 0.15, peak: 0.3 });
    },
    shotgun: () => {
      hiss({ f0: 3500, f1: 400, dur: 0.18, peak: 0.6 });
      tone({ type: 'square', f0: 160, f1: 60, dur: 0.08, peak: 0.2 });
      hiss({ type: 'bandpass', f0: 1800, q: 4, dur: 0.05, peak: 0.25, delay: 0.32 });
      hiss({ type: 'bandpass', f0: 1200, q: 4, dur: 0.05, peak: 0.25, delay: 0.42 });
    },
    sniper: () => {
      hiss({ type: 'highpass', f0: 2500, dur: 0.07, peak: 0.6 });
      tone({ type: 'sawtooth', f0: 1800, f1: 120, dur: 0.12, peak: 0.25 });
    },
    throw: () => hiss({ type: 'bandpass', f0: 900, f1: 300, q: 3, dur: 0.22, peak: 0.35 }),
    bounce: () => {
      tone({ f0: 320, f1: 160, dur: 0.08, peak: 0.35 });
      hiss({ type: 'bandpass', f0: 2000, q: 5, dur: 0.03, peak: 0.2 });
    },
    tick: () => tone({ type: 'square', f0: 1400, dur: 0.03, peak: 0.12 }),
    fuse: () => hiss({ type: 'highpass', f0: 5000, f1: 3000, dur: 1.2, peak: 0.12, a: 0.05 }),
    plane: () => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const f = ac.createBiquadFilter();
      const g = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, t);
      o.frequency.linearRampToValueAtTime(80, t + 2);
      f.type = 'lowpass';
      f.frequency.value = 600;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
      o.connect(f);
      f.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 2.2);
      hiss({ type: 'bandpass', f0: 500, f1: 300, q: 1, dur: 2, peak: 0.15, a: 0.8 });
    },
    teleport: () => {
      tone({ f0: 300, f1: 1600, dur: 0.35, peak: 0.25, vibrato: 60 });
      tone({ type: 'triangle', f0: 600, f1: 2400, dur: 0.3, peak: 0.12, delay: 0.05 });
    },
    jump: () => tone({ type: 'triangle', f0: 420, f1: 820, dur: 0.12, peak: 0.25 }),
    step: () => hiss({ f0: 500, dur: 0.05, peak: 0.25 }),
    hurt: () => {
      const f = 900 + Math.random() * 300;
      tone({ f0: f, f1: f * 1.5, dur: 0.12, peak: 0.25, vibrato: 40 });
      tone({ f0: f * 1.5, f1: f * 0.7, dur: 0.18, peak: 0.25, delay: 0.12, vibrato: 40 });
    },
    splash: () => {
      hiss({ f0: 1800, f1: 250, dur: 0.6, peak: 0.45 });
      tone({ f0: 700, f1: 160, dur: 0.22, peak: 0.35 });
      tone({ f0: 500, f1: 900, dur: 0.12, peak: 0.2, delay: 0.25 });
    },
    timerTick: () => tone({ type: 'square', f0: 880, dur: 0.06, peak: 0.15 }),
    click: () => tone({ type: 'triangle', f0: 900, f1: 600, dur: 0.05, peak: 0.15 }),
    turn: () => [660, 880, 1320].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.16, peak: 0.25, delay: i * 0.09 })),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.3, peak: 0.3, delay: i * 0.13 })),
  };

  W.Sfx = {
    unlock,
    play(name) {
      if (!ac || muted || !SOUNDS[name]) return;
      try { SOUNDS[name](); } catch (e) { /* звук не критичен */ }
    },
    setMuted(v) {
      muted = v;
      try { localStorage.setItem('worms.muted', v ? '1' : '0'); } catch (e) { /* без сохранения */ }
      if (master) master.gain.value = v ? 0 : 0.6;
    },
    isMuted: () => muted,
  };

  // Голос червяков: синтез речи браузера, высокий и быстрый — мультяшно.
  let voice = null, lastSaid = {};
  function pickVoice() {
    const all = window.speechSynthesis.getVoices().filter(v => /^ru/i.test(v.lang));
    voice = all.find(v => v.localService && /milena|katya|yuri/i.test(v.name)) || all.find(v => v.localService) || all[0] || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
  }

  W.Voice = {
    say(id) {
      const synth = window.speechSynthesis;
      const text = W.PHRASES && W.PHRASES[id];
      if (!W.FEATURES.voice || muted || !synth || !text) return;
      const now = performance.now();
      if (now - (lastSaid[id] || 0) < 700) return;
      if (id === 'jump' && (synth.speaking || synth.pending)) return; // «Прыжок» не копим в очередь
      lastSaid[id] = now;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      if (voice) u.voice = voice;
      u.pitch = 2;
      u.rate = 1.3;
      synth.speak(u);
    },
  };

  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
})(window.W = window.W || {});
