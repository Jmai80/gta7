// Touch (floating joystick + buttons + drag to look), keyboard and gamepad → one input state.
export class Input {
  constructor(root, opts = {}) {
    this.root = root;
    this.keys = new Set();
    this.edge = { action: false, pause: false, mute: false };
    this.held = { handbrake: false, horn: false, gas: false, brake: false, sprint: false };
    this.stick = { id: null, x0: 0, y0: 0, x: 0, y: 0, active: false };
    this.look = { id: null, x: 0, y: 0 };
    this.camDX = 0;
    this.touchSeen = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.lastKind = this.touchSeen ? 'touch' : 'keys';
    this.onKind = opts.onKind || (() => {});
    this.stickEl = opts.stickEl; this.knobEl = opts.knobEl;
    this.R = 56;
    this.enabled = false;
    this.bind();
  }

  setKind(k) { if (k !== this.lastKind) { this.lastKind = k; this.onKind(k); } }

  bind() {
    const root = this.root;
    const opt = { passive: false };
    root.addEventListener('pointerdown', (e) => this.down(e), opt);
    window.addEventListener('pointermove', (e) => this.move(e), opt);
    window.addEventListener('pointerup', (e) => this.up(e), opt);
    window.addEventListener('pointercancel', (e) => this.up(e), opt);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
    root.addEventListener('touchmove', (e) => { if (this.enabled && !(e.target.closest && e.target.closest('.overlay'))) e.preventDefault(); }, opt);
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.repeat) { if (this.isGameKey(e.code)) e.preventDefault(); return; }
      this.keys.add(e.code);
      if (this.isGameKey(e.code)) e.preventDefault();
      if (['KeyE', 'KeyF', 'Enter'].includes(e.code)) this.edge.action = true;
      if (['Escape', 'KeyP'].includes(e.code)) this.edge.pause = true;
      if (e.code === 'KeyM') this.edge.mute = true;
      if (e.code.startsWith('Key') || e.code.startsWith('Arrow') || e.code === 'Space') this.setKind('keys');
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.releaseAll(); });
    // buttons
    for (const btn of this.root.querySelectorAll('[data-btn]')) {
      const name = btn.dataset.btn;
      const press = (e) => {
        e.preventDefault(); e.stopPropagation();
        try { btn.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        btn.classList.add('on');
        if (name === 'action') this.edge.action = true;
        else if (name === 'pause') this.edge.pause = true;
        else this.held[name] = true;
        if (e.pointerType !== 'mouse') this.setKind('touch');
      };
      const release = (e) => { btn.classList.remove('on'); if (name in this.held) this.held[name] = false; if (e) e.preventDefault(); };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
    }
  }

  isGameKey(c) {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'KeyH'].includes(c);
  }

  releaseAll() {
    for (const k in this.held) this.held[k] = false;
    this.stick.active = false; this.stick.id = null; this.look.id = null;
    this.showStick(false);
  }

  down(e) {
    if (!this.enabled) return;
    if (e.target.closest && e.target.closest('[data-btn], button, .overlay')) return;
    const w = window.innerWidth;
    if (e.pointerType !== 'mouse') this.setKind('touch');
    if (e.pointerType !== 'mouse' && e.clientX < w * 0.5 && this.stick.id === null) {
      e.preventDefault();
      const s = this.stick;
      s.id = e.pointerId; s.x0 = e.clientX; s.y0 = e.clientY; s.x = 0; s.y = 0; s.active = true;
      this.showStick(true);
    } else if (this.look.id === null) {
      e.preventDefault();
      this.look.id = e.pointerId; this.look.x = e.clientX; this.look.y = e.clientY;
    }
  }

  move(e) {
    const s = this.stick;
    if (e.pointerId === s.id) {
      e.preventDefault();
      let dx = e.clientX - s.x0, dy = e.clientY - s.y0;
      const d = Math.hypot(dx, dy);
      // drag the base along when the thumb goes far, so the stick never "runs out"
      if (d > this.R * 1.35) {
        const k = (d - this.R * 1.35) / d;
        s.x0 += dx * k; s.y0 += dy * k;
        dx = e.clientX - s.x0; dy = e.clientY - s.y0;
      }
      const m = Math.min(1, Math.hypot(dx, dy) / this.R);
      const a = Math.atan2(dy, dx);
      s.x = Math.cos(a) * m; s.y = -Math.sin(a) * m;
      this.showStick(true);
    } else if (e.pointerId === this.look.id) {
      this.camDX += e.clientX - this.look.x;
      this.look.x = e.clientX; this.look.y = e.clientY;
    }
  }

  up(e) {
    if (e.pointerId === this.stick.id) {
      this.stick.id = null; this.stick.active = false; this.stick.x = this.stick.y = 0;
      this.showStick(false);
    }
    if (e.pointerId === this.look.id) this.look.id = null;
  }

  showStick(on) {
    if (!this.stickEl) return;
    const s = this.stick;
    if (on) {
      this.stickEl.classList.add('live');
      this.stickEl.style.transform = `translate(${s.x0}px, ${s.y0}px)`;
      this.knobEl.style.transform = `translate(${s.x * this.R}px, ${-s.y * this.R}px)`;
    } else {
      this.stickEl.classList.remove('live');
      this.stickEl.style.transform = '';
      this.knobEl.style.transform = '';
    }
  }

  read() {
    const k = this.keys;
    const out = {
      moveX: 0, moveY: 0, analog: false, sprint: false, action: this.edge.action, pause: this.edge.pause, mute: this.edge.mute,
      handbrake: this.held.handbrake, horn: this.held.horn, gas: this.held.gas, brake: this.held.brake,
      throttleAxis: null, steerAxis: null, camDX: this.camDX,
    };
    this.edge.action = this.edge.pause = this.edge.mute = false;
    this.camDX = 0;
    const kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const ky = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    if (kx || ky) {
      const l = Math.hypot(kx, ky);
      out.moveX = kx / l; out.moveY = ky / l;     // walking (camera relative)
      out.throttleAxis = ky; out.steerAxis = kx;  // driving
    }
    if (k.has('ShiftLeft') || k.has('ShiftRight')) out.sprint = true;
    if (k.has('Space')) out.handbrake = true;
    if (k.has('KeyH')) out.horn = true;
    if (k.has('KeyQ')) out.camDX -= 6;
    if (k.has('KeyR')) out.camDX += 6;
    if (this.stick.active) { out.moveX = this.stick.x; out.moveY = this.stick.y; out.analog = true; out.throttleAxis = null; out.steerAxis = null; }
    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
      const lx = dz(p.axes[0] || 0), ly = dz(p.axes[1] || 0), rx = dz(p.axes[2] || 0);
      const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
      const bv = (i) => (p.buttons[i] ? p.buttons[i].value : 0);
      if (lx || ly) { out.moveX = lx; out.moveY = -ly; out.analog = true; this.setKind('pad'); }
      const rt = bv(7), lt = bv(6);
      if (rt > 0.05 || lt > 0.05) { out.throttleAxis = rt - lt; out.steerAxis = lx; }
      if (rx) out.camDX += rx * 9;
      if (b(0) && !this.padA) out.action = true;
      this.padA = b(0);
      if (b(9) && !this.padStart) out.pause = true;
      this.padStart = b(9);
      if (b(2) || b(5)) out.handbrake = true;
      if (b(3) || b(10)) out.horn = true;
      if (b(1)) out.sprint = true;
      break;
    }
    return out;
  }
}
