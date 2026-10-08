// All sound is synthesized with Web Audio – no audio files to download.
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
    const car = p.inCar ? p.car : null;
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

  wanted() {
    if (!this.ctx) return;
    for (let i = 0; i < 3; i++) { this.tone(880, 0.14, 'square', 0.05, i * 0.3); this.tone(660, 0.14, 'square', 0.05, i * 0.3 + 0.15); }
  }
}
