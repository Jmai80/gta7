// All sound is synthesized with Web Audio – no audio files to download.
import { degFreq } from './radio.js';
export class AudioFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastStep = 0;
  }

  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    // shared white noise buffer
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.buildEngine();
    this.skid = this.loopNoise('bandpass', 1100, 1.2);
    this.wash = this.loopNoise('bandpass', 2800, 0.7);
    this.amb = this.loopNoise('lowpass', 420, 0.5);
    this.amb.gain.gain.value = 0.022;
    this.buildHorn();
    // (v1.3) the car radio: its own bus through a little "car speaker" filter
    this.radioBus = ctx.createGain(); this.radioBus.gain.value = 0;
    const spk = ctx.createBiquadFilter(); spk.type = 'lowpass'; spk.frequency.value = 3600; spk.Q.value = 0.7;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70;
    this.radioBus.connect(hp); hp.connect(spk); spk.connect(this.master);
    if (this.station) this.setRadio(this.station, true);
  }

  loopNoise(type, freq, q) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
    return { src, filter: f, gain: g };
  }

  buildEngine() {
    const ctx = this.ctx;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'square';
    const o3 = ctx.createOscillator(); o3.type = 'sawtooth';
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    const g3 = ctx.createGain(); g3.gain.value = 0.25;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 3;
    const out = ctx.createGain(); out.gain.value = 0;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); o3.connect(g3); g3.connect(lp);
    lp.connect(out); out.connect(this.master);
    o1.frequency.value = 40; o2.frequency.value = 20; o3.frequency.value = 40.7;
    o1.start(); o2.start(); o3.start();
    this.eng = { o1, o2, o3, lp, out, rpm: 0 };
  }

  buildHorn() {
    const ctx = this.ctx;
    const a = ctx.createOscillator(); a.type = 'square'; a.frequency.value = 392;
    const b = ctx.createOscillator(); b.type = 'square'; b.frequency.value = 494;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1700; f.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.value = 0;
    a.connect(f); b.connect(f); f.connect(g); g.connect(this.master);
    a.start(); b.start();
    this.hornG = g;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }

  // ---------------------------------------------------------------- continuous
  update(dt, game) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const p = game.player;
    const car = p.inCar && !p.car.spec.bike ? p.car : null; // (a bike has no engine)
    const E = this.eng;
    if (car) {
      const v = Math.abs(car.fwdSpeed);
      const thr = Math.max(0, Math.abs(car.input.throttle));
      const bands = [0, 6, 12.5, 19, 26, 34, 50];
      let gi = 0;
      while (gi < bands.length - 2 && v > bands[gi + 1]) gi++;
      const frac = (v - bands[gi]) / (bands[gi + 1] - bands[gi]);
      const target = car.dead ? 0 : 0.2 + 0.8 * Math.min(1, frac * 0.85 + (gi > 0 ? 0.15 : 0)) + thr * 0.08;
      E.rpm += (target - E.rpm) * Math.min(1, dt * (target > E.rpm ? 6 : 9));
      const base = car.type === 'van' ? 30 : 38;
      const f = base + E.rpm * (car.type === 'van' ? 70 : 95);
      E.o1.frequency.setTargetAtTime(f, t, 0.04);
      E.o3.frequency.setTargetAtTime(f * 1.012, t, 0.04);
      E.o2.frequency.setTargetAtTime(f / 2, t, 0.04);
      E.lp.frequency.setTargetAtTime(320 + thr * 1100 + E.rpm * 600, t, 0.06);
      E.out.gain.setTargetAtTime(car.dead ? 0 : 0.05 + thr * 0.07 + E.rpm * 0.025, t, 0.08);
      const slide = car.air ? 0 : Math.max(0, Math.min(1, (car.slip - 3.5) / 6));
      this.skid.gain.gain.setTargetAtTime(slide * 0.22, t, 0.05);
    } else {
      E.out.gain.setTargetAtTime(0, t, 0.15);
      this.skid.gain.gain.setTargetAtTime(0, t, 0.05);
      // footsteps
      const b = p.body;
      if (p.state === 'foot' && b.legAmp > 0.1) {
        const step = Math.floor(b.phase / Math.PI);
        if (step !== this.lastStep) { this.lastStep = step; this.click(0.035 + b.legAmp * 0.03, 700, 0.05); }
      }
    }
    // ambience grows a little near busy streets: keep it simple
    this.amb.gain.gain.setTargetAtTime(0.02, t, 0.5);
    this.radioTick();
  }

  // ---------------------------------------------------------------- the car radio (v1.3)
  // a station from radio.js, or null to switch it off; the loop starts from the top on every switch
  setRadio(S, force = false) {
    if (S === this.station && !force) return;
    this.station = S;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.radioBus.gain.cancelScheduledValues(t);
    this.radioBus.gain.setTargetAtTime(S ? 0.28 : 0, t, S ? 0.3 : 0.04); // (v1.4) quietly, under the engine
    if (S) { this.rStep = 0; this.rNext = t + 0.08; }
  }

  // schedule the next fifth of a second of the station's loop (called every frame)
  radioTick() {
    const S = this.station, ctx = this.ctx;
    if (!S || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (this.rNext < now - 0.25) this.rNext = now + 0.03; // (after a pause: pick up from here)
    const beat = 60 / S.bpm, step = S.steps === 12 ? beat / 3 : beat / 4;
    while (this.rNext < now + 0.2) {
      const k = this.rStep, sw = S.swing ? (k % 2 ? -S.swing : S.swing) : 0;
      this.radioStep(S, k, this.rNext, step);
      this.rNext += step * (1 + sw);
      this.rStep++;
    }
  }

  radioStep(S, k, t, step) {
    const n = S.steps, i = k % n, bar = Math.floor(k / n) % S.prog.length, c = S.prog[bar];
    const m = S.melP[bar % S.melP.length][i];
    if (m) this.rNote(degFreq(S, c + m.d, 1), t, m.len * step, S.lead, S.lead === 'sawtooth' ? 0.07 : S.lead === 'square' ? 0.065 : 0.13);
    const b = S.bassP && S.bassP[i];
    if (b) this.rNote(degFreq(S, c + b.d, -1), t, b.len * step * 0.9, S.bassWave, S.bassWave === 'triangle' ? 0.22 : 0.08);
    const a = S.arpP && S.arpP[i];
    if (a) this.rNote(degFreq(S, c + a.d, 0), t, step * 0.9, 'triangle', 0.06, true);
    if (S.stab[i] === 'x') for (const d of S.seventh ? [0, 2, 4, 6] : [0, 2, 4]) this.rNote(degFreq(S, c + d, 0), t, step * 1.4, 'square', 0.022, true);
    if (S.kick[i] === 'x') this.rKick(t);
    if (S.snare[i] === 'x') this.rNoise(t, 0.12, 'bandpass', 1800, S.soft ? 0.05 : 0.1);
    if (S.hat[i] === 'x') this.rNoise(t, 0.035, 'highpass', 7000, S.soft ? 0.018 : 0.03);
  }

  rNote(freq, t, dur, type, vol, pluck = false) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    const end = t + Math.max(0.06, dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    if (pluck || this.station && this.station.pluck) g.gain.exponentialRampToValueAtTime(0.0001, end);
    else { g.gain.setTargetAtTime(vol * 0.6, t + 0.03, 0.08); g.gain.setTargetAtTime(0.0001, end - 0.03, 0.02); }
    o.connect(g); g.connect(this.radioBus);
    o.start(t); o.stop(end + 0.1);
  }

  rKick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(this.radioBus); o.start(t); o.stop(t + 0.2);
  }

  rNoise(t, dur, type, freq, vol) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.radioBus);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
  }

  horn(on) {
    if (!this.ctx) return;
    this.hornG.gain.setTargetAtTime(on ? 0.11 : 0, this.ctx.currentTime, on ? 0.01 : 0.03);
  }

  washing(on) {
    if (!this.ctx) return;
    this.wash.gain.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.2);
  }

  // ---------------------------------------------------------------- one-shots
  tone(freq, dur, type = 'sine', vol = 0.1, at = 0, slideTo = null) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  burst(vol, freq, dur, type = 'lowpass', at = 0) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  click(vol, freq, dur) { if (this.ctx) this.burst(vol, freq, dur); }

  crash(impact, near = 1) {
    if (!this.ctx) return;
    const k = Math.min(1, impact / 18) * near;
    if (k < 0.04) return;
    this.burst(0.5 * k, 900 + impact * 60, 0.18 + k * 0.35);
    this.burst(0.25 * k, 3500, 0.08 + k * 0.1, 'highpass');
    this.tone(70, 0.25, 'sine', 0.45 * k, 0, 38);
  }

  honk(dist) {
    if (!this.ctx) return;
    const v = 0.14 / (1 + dist / 14);
    if (v < 0.01) return;
    const f = 360 + Math.random() * 120;
    this.tone(f, 0.38, 'square', v);
    this.tone(f * 1.26, 0.38, 'square', v * 0.8);
  }

  // a voice for the dialogue (v0.9): a quick babble of syllables at the speaker's own pitch, about as
  // long as the line (capped), like the little voices in old adventure games. A new line cuts off the last.
  voice(pitch, text, vol = 0.07) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    for (const o of this.voiceOsc || []) { try { o.stop(); } catch (_) { /* already done */ } }
    this.voiceOsc = [];
    if (!text || !(pitch > 20)) return;   // (an empty line just stops the voice)
    const n = Math.max(2, Math.min(16, Math.round(String(text).length / 6)));
    let seed = 0;
    for (const ch of String(text)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = pitch * 3.2; bp.Q.value = 0.9;
    const out = ctx.createGain(); out.gain.value = 1;
    bp.connect(out); out.connect(this.master);
    let t = ctx.currentTime + 0.02;
    const end = text.endsWith('?') ? 1.18 : text.endsWith('!') ? 1.1 : 0.9; // a question goes up at the end
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      const f = pitch * (0.86 + rnd() * 0.36) * (last ? end : 1);
      const d = 0.055 + rnd() * 0.04;
      for (const [type, k] of [['triangle', 1], ['square', 0.22]]) {
        const o = ctx.createOscillator(); o.type = type;
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * (0.92 + rnd() * 0.16), t + d);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol * k, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(bp);
        o.start(t); o.stop(t + d + 0.02);
        this.voiceOsc.push(o);
      }
      t += d + 0.018 + (rnd() < 0.18 ? 0.06 : 0);   // a little pause now and then, between "words"
    }
  }

  // the dialogue box opening: a soft two-note pop
  talkOpen() {
    if (!this.ctx) return;
    this.tone(520, 0.08, 'sine', 0.06);
    this.tone(780, 0.1, 'sine', 0.05, 0.06);
  }

  // Lasse's melody horn (v0.8): a cheerful little tune on two square waves
  melody() {
    if (!this.ctx || this.melodyT > this.ctx.currentTime) return;
    const N = [392, 392, 392, 523, 659, 392, 392, 392, 523, 659];
    const D = [0.11, 0.11, 0.11, 0.3, 0.38, 0.11, 0.11, 0.11, 0.3, 0.38];
    let t = 0;
    N.forEach((f, i) => { this.tone(f, D[i] * 0.9, 'square', 0.07, t); this.tone(f * 1.5, D[i] * 0.9, 'square', 0.03, t); t += D[i] + 0.03; });
    this.melodyT = this.ctx.currentTime + t;
  }

  ping() {
    if (!this.ctx) return;
    this.tone(1318.5, 0.12, 'sine', 0.12);
    this.tone(1760, 0.18, 'sine', 0.12, 0.11);
  }

  missionPassed() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this.tone(f, 0.16, 'square', 0.07, i * 0.1));
    [523.25, 659.25, 783.99].forEach((f) => this.tone(f, 1.1, 'triangle', 0.09, 0.42));
    this.tone(1046.5, 1.1, 'triangle', 0.07, 0.42);
    this.burst(0.06, 6000, 0.6, 'highpass', 0.42);
  }

  cash() {
    if (!this.ctx) return;
    this.tone(1975.5, 0.09, 'square', 0.05);
    this.tone(2637, 0.3, 'square', 0.05, 0.08);
    this.burst(0.05, 7000, 0.25, 'highpass', 0.08);
  }

  door() {
    if (!this.ctx) return;
    this.burst(0.25, 380, 0.12);
    this.tone(95, 0.12, 'sine', 0.25, 0, 60);
  }

  thud(k = 1) {
    if (!this.ctx) return;
    this.tone(85, 0.2, 'sine', 0.35 * k, 0, 45);
    this.burst(0.18 * k, 500, 0.15);
  }

  stunt() {
    if (!this.ctx) return;
    this.tone(400, 0.5, 'sawtooth', 0.04, 0, 1600);
    this.tone(1568, 0.5, 'triangle', 0.08, 0.35);
    this.tone(2093, 0.6, 'triangle', 0.07, 0.48);
  }

  // race countdown: three low beeps, then a high one
  beep(go = false) {
    if (!this.ctx) return;
    if (go) { this.tone(1320, 0.5, 'square', 0.08); this.tone(660, 0.5, 'triangle', 0.06); }
    else this.tone(660, 0.2, 'square', 0.08);
  }

  checkpoint() {
    if (!this.ctx) return;
    this.tone(988, 0.08, 'square', 0.05);
    this.tone(1480, 0.16, 'triangle', 0.08, 0.06);
  }

  fail() {
    if (!this.ctx) return;
    [392, 349.2, 311.1, 261.6].forEach((f, i) => this.tone(f, i === 3 ? 0.7 : 0.2, 'square', 0.06, i * 0.17));
    this.tone(130.8, 0.9, 'triangle', 0.1, 0.5);
  }

  // a bunch of keys picked up off a table
  jingle() {
    if (!this.ctx) return;
    for (let i = 0; i < 5; i++) {
      const f = 2600 + Math.random() * 2200;
      this.tone(f, 0.07, 'triangle', 0.035, i * 0.045 + Math.random() * 0.02);
    }
    this.burst(0.05, 6500, 0.18, 'highpass', 0.02);
  }

  // the bike's bell: pling-pling (k: quieter when it is someone else's bike further off)
  bell(k = 1) {
    if (!this.ctx || k < 0.05) return;
    for (const at of [0, 0.16]) {
      this.tone(2350, 0.32, 'sine', 0.07 * k, at);
      this.tone(3520, 0.22, 'sine', 0.03 * k, at);
      this.tone(5870, 0.08, 'triangle', 0.012 * k, at);
    }
  }

  // ---- Salong Saxen (v1.0): picking up a tool, the scissors, the razor, the dye, and what the customer thinks
  salon(kind) {
    if (!this.ctx) return;
    if (kind === 'pick') { this.burst(0.09, 3800, 0.05, 'highpass'); this.tone(1900, 0.05, 'triangle', 0.03, 0.01); }
    else if (kind === 'cut') for (let i = 0; i < 4; i++) { this.burst(0.16, 5200, 0.045, 'highpass', i * 0.19); this.tone(3100, 0.03, 'triangle', 0.025, i * 0.19 + 0.01); }
    else if (kind === 'shave') { this.tone(118, 0.75, 'sawtooth', 0.035, 0, 124); this.tone(236, 0.75, 'square', 0.012, 0); this.burst(0.03, 2600, 0.7, 'bandpass'); }
    else if (kind === 'dye') { for (let i = 0; i < 3; i++) this.tone(520 - i * 70, 0.12, 'sine', 0.045, i * 0.14, 300 - i * 40); this.burst(0.04, 1800, 0.3, 'lowpass', 0.05); }
    else if (kind === 'happy') { this.tone(1046.5, 0.14, 'triangle', 0.07); this.tone(1568, 0.3, 'triangle', 0.06, 0.12); }
    else if (kind === 'angry') { this.tone(196, 0.32, 'sawtooth', 0.05, 0, 147); this.tone(185, 0.38, 'square', 0.025, 0.08, 139); }
  }

  // spotted! a sharp sting
  caught() {
    if (!this.ctx) return;
    this.tone(220, 0.35, 'sawtooth', 0.08, 0, 330);
    this.tone(1046.5, 0.16, 'square', 0.06, 0.02);
    this.tone(784, 0.4, 'square', 0.05, 0.16);
  }

  wanted() {
    if (!this.ctx) return;
    for (let i = 0; i < 3; i++) { this.tone(880, 0.14, 'square', 0.05, i * 0.3); this.tone(660, 0.14, 'square', 0.05, i * 0.3 + 0.15); }
  }
}
