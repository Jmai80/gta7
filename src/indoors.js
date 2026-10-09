// Going in and out of the dark tower – and Hörnlivs on Kungsgatan (v0.6.1). The insides
// (interior.js, shop.js) are built out at sea: going in is a fade to black (and a lift ride in the
// tower), and the town is hidden while you are in there. Samuel lives up in the tower; he is only
// around while you are inside. `where` says which place you are in: 'tower', 'shop' or 'office'
// (Bullbilen's bakery office, v0.7).
import { TOWER_DOOR, LIVS_DOOR, OFFICE_DOOR } from './config.js';
import { INT } from './interior.js';
import { SHOP } from './shop.js';
import { OFFICE } from './office.js';

// the places with a door you walk through (the tower has its lift): inside, and where you come out
export const PLACES = {
  shop: { inside: SHOP, out: { x: LIVS_DOOR.x - 1.1, z: LIVS_DOOR.z - 0.6, h: Math.PI } },     // Hörnlivs → Kungsgatan, facing north
  office: { inside: OFFICE, out: { x: OFFICE_DOOR.x - 1.0, z: OFFICE_DOOR.z + 0.4, h: Math.PI } }, // the bakery office → out by the west wall
};
import { Samuel } from './samuel.js';

const FADE = 0.5;  // seconds of black before the move

export class Indoors {
  constructor(game) {
    this.game = game;
    this.inside = false;
    this.where = null;     // 'tower' | 'shop' | 'office'
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

  // the lift up to floor 7, or in through the shop door (the job calls this when you walk in)
  enter(done, where = 'tower') {
    if (this.busy || this.inside) return;
    const g = this.game;
    this.busy = true;
    g.emit('fade', { on: true });
    this.after(FADE, () => {
      this.inside = true;
      this.where = where;
      if (where === 'tower') {
        if (!this.game.mission.done.has('samuel')) this.openDoor();
        this.samuel = new Samuel(g);
        this.place(INT.spawn.x, INT.spawn.z, INT.spawn.h);
      } else { const S = PLACES[where].inside.spawn; this.place(S.x, S.z, S.h); }
      g.emit('indoor', { on: true });
      if (done) done();
    });
    this.after(FADE + 0.35, () => { g.emit('fade', { on: false }); this.busy = false; });
  }

  // back down and out onto the square (or out of the shop onto Kungsgatan)
  exit(done) {
    if (this.busy || !this.inside) return;
    const g = this.game;
    this.busy = true;
    g.emit('fade', { on: true });
    this.after(FADE, () => {
      this.inside = false;
      if (this.samuel) { this.samuel.remove(); this.samuel = null; }
      const P = PLACES[this.where];
      if (P) this.place(P.out.x, P.out.z, P.out.h); // out through the door you came in by
      else this.place(TOWER_DOOR.x, TOWER_DOOR.z + 2.4, 0); // a few steps out on the square
      this.where = null;
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
    if (this.busy || p.frozen || p.state !== 'foot') return;
    if (this.where === 'tower' && Math.hypot(p.x - INT.lift.x, p.z - INT.lift.z) < INT.lift.r) this.prompt = 'HISS';
    const P = PLACES[this.where];
    if (P && !this.noExit && Math.hypot(p.x - P.inside.door.x, p.z - P.inside.door.z) < P.inside.door.r) this.prompt = 'GÅ UT';
  }

  interact() {
    if (this.prompt === 'HISS') { this.game.emit('toast', { text: 'Hissen ner…' }); this.exit(); return true; }
    if (this.prompt === 'GÅ UT') { this.exit(); return true; }
    return false;
  }
}
