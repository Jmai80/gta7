// Going in and out of the dark tower. The inside (interior.js) is built out at sea: going in is a
// fade to black and a lift ride, and the town is hidden while you are in there. Samuel lives up
// there; he is only around while you are inside.
import { TOWER_DOOR } from './config.js';
import { INT } from './interior.js';
import { Samuel } from './samuel.js';

const FADE = 0.5;  // seconds of black before the move

export class Indoors {
  constructor(game) {
    this.game = game;
    this.inside = false;
    this.busy = false;     // fading in or out
    this.timers = [];
    this.samuel = null;
    this.prompt = null;
    this.door = game.layout.colliders.find((c) => c.door === 'samuel') || null; // Samuel's front door
  }

  get doorShut() { return !!(this.door && this.door.h > 0); }
  shutDoor() { if (this.door) this.door.h = this.door.hClosed; }
  openDoor() { if (this.door) this.door.h = 0; }

  after(delay, fn) { this.timers.push({ t: this.game.time + delay, fn }); }

  // the lift up to floor 7 (the job calls this when you walk in through the door)
  enter(done) {
    if (this.busy || this.inside) return;
    const g = this.game;
    this.busy = true;
    g.emit('fade', { on: true });
    this.after(FADE, () => {
      this.inside = true;
      if (!this.game.mission.done.has('samuel')) this.openDoor();
      this.samuel = new Samuel(g);
      this.place(INT.spawn.x, INT.spawn.z, INT.spawn.h);
      g.emit('indoor', { on: true });
      if (done) done();
    });
    this.after(FADE + 0.35, () => { g.emit('fade', { on: false }); this.busy = false; });
  }

  // back down and out onto the square
  exit(done) {
    if (this.busy || !this.inside) return;
    const g = this.game;
    this.busy = true;
    g.emit('fade', { on: true });
    this.after(FADE, () => {
      this.inside = false;
      if (this.samuel) { this.samuel.remove(); this.samuel = null; }
      this.place(TOWER_DOOR.x, TOWER_DOOR.z + 2.4, 0); // a few steps out on the square
      g.emit('indoor', { on: false });
      if (done) done();
    });
    this.after(FADE + 0.35, () => { g.emit('fade', { on: false }); this.busy = false; });
  }

  place(x, z, h) {
    const g = this.game, p = g.player;
    p.x = x; p.z = z; p.h = h; p.vx = p.vz = p.vy = 0;
    p.y = g.world.groundHeight(x, z);
    p.state = 'foot';
    p.body.lie = 0;
    g.emit('warp', { h });
  }

  update(dt) {
    const g = this.game;
    for (let i = 0; i < this.timers.length; i++) {
      if (g.time < this.timers[i].t) continue;
      const q = this.timers.splice(i, 1)[0]; i--;
      q.fn();
    }
    this.prompt = null;
    if (!this.inside) return;
    if (this.samuel) this.samuel.update(dt);
    const p = g.player;
    if (!this.busy && !p.frozen && p.state === 'foot' && Math.hypot(p.x - INT.lift.x, p.z - INT.lift.z) < INT.lift.r) this.prompt = 'HISS';
  }

  interact() {
    if (this.prompt !== 'HISS') return false;
    this.game.emit('toast', { text: 'Hissen ner…' });
    this.exit();
    return true;
  }
}
