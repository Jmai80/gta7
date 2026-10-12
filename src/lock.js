// A combination lock (v1.11): a row of number wheels on Arne's tin boxes in "Arnes skattjakt".
// Pure simulation like the organ (organ.js): a job puts one in game.lock while you stand at it, main.js
// draws the wheels from this object (#lock in index.html) and sends your taps back. Turn a wheel up or
// down (or type the digits), then ÖPPNA: the right code springs it open, a wrong one rattles. The
// 'lock' event tells the sound: { kind: 'tick' | 'wrong' | 'open' }.
export const LOCK = {
  springT: 0.7,   // from the right code to the lid coming up (onOpen)
  wrongT: 0.5,    // how long the wheels shake after a wrong code
};

export class CodeLock {
  // code: the digits as a string ('1971'); kicker/title: the heading; hint: what Arne's riddle says about
  // the code; help: shown after the first wrong try; onOpen/onStop: the job's callbacks
  constructor(game, { code, kicker = '', title = 'KODLÅS', hint = '', help = '', onOpen = null, onStop = null }) {
    this.game = game;
    this.code = String(code);
    this.n = this.code.length;
    this.wheels = new Array(this.n).fill(0);
    this.sel = 0;                // the wheel a typed digit goes to
    this.kicker = kicker; this.title = title; this.hint = hint; this.help = help;
    this.tries = 0;              // wrong codes so far
    this.state = 'idle';         // idle | wrong | right
    this.t = 0;
    this.open = true;            // on the screen (false once it has sprung open or you stopped)
    this.onOpen = onOpen; this.onStop = onStop;
  }

  get value() { return this.wheels.join(''); }
  get line() { return this.state === 'wrong' || (this.tries && this.help) ? (this.help || this.hint) : this.hint; }

  turn(i, d) {
    if (!this.open || this.state === 'right' || !(i >= 0 && i < this.n)) return false;
    this.wheels[i] = (this.wheels[i] + (d > 0 ? 1 : 9)) % 10;
    this.sel = i;
    if (this.state === 'wrong') this.state = 'idle';
    this.game.emit('lock', { kind: 'tick' });
    return true;
  }

  // a digit from the keyboard: onto the selected wheel, then on to the next one
  type(digit) {
    if (!this.open || this.state === 'right' || !(digit >= 0 && digit <= 9)) return false;
    this.wheels[this.sel] = digit;
    this.sel = Math.min(this.n - 1, this.sel + 1);
    if (this.state === 'wrong') this.state = 'idle';
    this.game.emit('lock', { kind: 'tick' });
    return true;
  }

  select(i) { if (i >= 0 && i < this.n) this.sel = i; }

  tryOpen() {
    if (!this.open || this.state === 'right') return false;
    if (this.value === this.code) {
      this.state = 'right'; this.t = 0;
      this.game.emit('lock', { kind: 'open' });
      return true;
    }
    this.tries++;
    this.state = 'wrong'; this.t = 0;
    this.game.emit('lock', { kind: 'wrong' });
    return false;
  }

  // SLUTA: away from the lock (the wheels stay where you left them)
  stop() {
    if (!this.open || this.state === 'right') return;
    this.open = false;
    if (this.onStop) this.onStop(this);
  }

  update(dt) {
    if (!this.open) return;
    this.t += dt;
    if (this.state === 'wrong' && this.t >= LOCK.wrongT) this.state = 'idle';
    if (this.state === 'right' && this.t >= LOCK.springT) {
      this.open = false;
      if (this.onOpen) this.onOpen(this);
    }
  }
}
