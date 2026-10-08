// "Gatloppet" – Kim's street race: two laps around Sjuby against Kim and Bosse.
// Rings mark the checkpoints; they have to be driven through in order.
import { RaceRoute, RaceDriver } from './racer.js';
import { WHO, RACE_PRIZE, RACE_LAPS } from './config.js';
import { clamp, mmss } from './rng.js';

// Start on Drottninggatan outside Macken, heading north; the loop takes in most of the town.
export const RACE_START = [40, 6];
const CORNERS = [[40, -40], [120, -40], [120, -120], [-40, -120], [-40, 40], [-120, 40], [-120, 120], [40, 120]];
let ROUTE = null;
export function raceRoute() { return ROUTE || (ROUTE = new RaceRoute(RACE_START, CORNERS, 12)); }

const CP_R = 9;          // checkpoint radius: anywhere on the road counts
const OUT_LIMIT = 15;    // seconds without a working car before the race is lost
const GRID_BACK = 4;     // the grid is 4 m behind the line
const GRID = [3.2, 0, -3.2]; // lateral slots (right of the route is positive): player, Kim, Bosse
const RIVALS = [
  { name: 'Kim', paint: 'yellow', skill: 0.86, base: 0.6, slot: 1, line: 'Lycka till. Du behöver det!',
    look: { shirt: 0xe5b923, pants: 0x1f2a36, skin: 0xe8b996, hair: 0x1a1a1a, height: 1.0, bulk: 0.95 } },
  { name: 'Bosse', paint: 'black', skill: 0.82, base: -1.8, slot: 2, line: 'Brum brum!',
    look: { shirt: 0x7f8c8d, pants: 0x111418, skin: 0xf2d0b5, hair: 0xa0a0a0, height: 1.04, bulk: 1.12 } },
];

export class RaceJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'race';
    this.route = raceRoute();
    const L = this.route.L;
    this.cps = [];
    for (let lap = 0; lap < RACE_LAPS; lap++) {
      for (const m of this.route.marks) {
        const p = this.route.pointAt(m.s);
        this.cps.push({ d: lap * L + m.s, x: p.x, z: p.z, h: Math.atan2(p.dx, p.dz), finish: m.kind === 'finish' });
      }
    }
    this.perLap = this.route.marks.length;
    this.total = RACE_LAPS * L;
    this.stage = 'setup';
    this.next = 0; this.pd = -GRID_BACK; this.time = 0; this.t = 0; this.outT = 0; this.rank = 1;
    this.racers = []; this.timers = [];
    this.ctx = { playerDist: -GRID_BACK };
    this.showRoute = true;
    this.titleCard = false; // the countdown is the show
  }

  after(delay, fn) { this.timers.push({ t: this.t + delay, fn }); }

  start() {
    const g = this.game, m = this.mgr;
    g.player.locked = true;
    g.emit('fade', { on: true });
    m.setObjective('Vinn gatloppet', `3 förare · ${RACE_LAPS} varv`);
    m.sms(WHO.kim, 'Två varv. Följ ringarna. Vinnaren får 2 500 spänn. Försök hänga med.', 0.8, this);
    if (g.player.car && g.player.car.health < 45) m.sms(WHO.kim, 'Kör du DEN där? Den ser ut som skrot. Men visst.', 3.0, this);
    this.after(0.45, () => this.setup());
    this.after(0.75, () => g.emit('fade', { on: false }));
    this.after(1.5, () => this.count(3));
    this.after(2.5, () => this.count(2));
    this.after(3.5, () => this.count(1));
    this.after(4.5, () => this.go());
  }

  // the screen is black: clear the start area, line up the player and spawn the rivals
  setup() {
    const g = this.game, p = g.player, car = p.inCar ? p.car : null;
    if (!car) { this.mgr.fail(this, 'Du behöver en bil'); return; }
    const s0 = this.route.pointAt(-GRID_BACK);
    for (const v of [...g.vehicles]) {
      if (v === car || v.parkedSpot) continue;
      if (Math.hypot(v.x - s0.x, v.z - s0.z) < 45) g.removeVehicle(v);
    }
    const place = (v, off) => {
      const x = s0.x - s0.dz * off, z = s0.z + s0.dx * off;
      v.x = x; v.z = z; v.h = Math.atan2(s0.dx, s0.dz);
      v.vx = v.vz = v.vy = v.w = 0; v.steer = 0; v.air = false; v.coastT = 0;
      v.y = g.world.groundHeight(x, z);
      v.input.throttle = 0; v.input.steer = 0;
    };
    place(car, GRID[0]);
    p.x = car.x; p.z = car.z; p.y = car.y; p.h = car.h;
    g.emit('teleport', { car });
    for (const def of RIVALS) {
      g.makeRoom('sedan');
      const v = g.addVehicle('sedan', def.paint, s0.x, s0.z, 0);
      if (!v) continue;
      place(v, GRID[def.slot]);
      v.driverLook = def.look;
      const r = new RaceDriver(g, v, this.route, { name: def.name, line: def.line, skill: def.skill, base: def.base, off: GRID[def.slot], dist: -GRID_BACK, ctx: this.ctx });
      this.racers.push(r);
      g.racers.push(r);
    }
  }

  count(n) {
    const g = this.game;
    g.emit('countdown', { text: String(n) });
    if (n === 3) for (const r of this.racers) g.emit('say', { who: r.car, text: r.line });
  }

  go() {
    const g = this.game;
    this.stage = 'race';
    this.time = 0;
    g.player.locked = false;
    for (const r of this.racers) r.hold = false;
    g.emit('countdown', { text: 'KÖR!', go: true });
  }

  update(dt) {
    const g = this.game, p = g.player, m = this.mgr;
    this.t += dt;
    for (let i = 0; i < this.timers.length; i++) {
      if (this.t < this.timers[i].t) continue;
      const q = this.timers.splice(i, 1)[0]; i--;
      q.fn();
      if (this.over) return;
    }
    // a rival that lost the car (carjacked or wrecked) is out of the race
    for (const r of [...this.racers]) {
      if (r.car.racer === r && !r.car.removed && !r.car.dead) continue;
      if (r.car.dead && this.stage === 'race') g.emit('toast', { text: `${r.name} kraschade och bröt racet!` });
      this.drop(r);
    }
    const car = p.inCar && !p.car.dead ? p.car : null;
    if (this.stage === 'race') {
      this.time += dt;
      for (const r of this.racers) if (!r.finished && r.dist >= this.total) { r.finished = true; r.finishT = this.time; }
      const cp = this.cps[this.next];
      if (car && Math.hypot(car.x - cp.x, car.z - cp.z) < CP_R) {
        this.next++;
        if (this.next >= this.cps.length) { this.win(); return; }
        g.emit('checkpoint', { finish: cp.finish });
        if (cp.finish) g.emit('toast', { text: 'Sista varvet!' });
      }
      // how far along the route the player is (clamped between the checkpoints, so shortcuts don't count)
      const prev = this.next > 0 ? this.cps[this.next - 1].d : -GRID_BACK, nxt = this.cps[this.next].d;
      const px = car ? car.x : p.x, pz = car ? car.z : p.z;
      this.pd = clamp(this.route.project(px, pz, clamp(this.pd, prev, nxt), 15, 40), prev, nxt);
      this.ctx.playerDist = this.pd;
      this.rank = 1;
      for (const r of this.racers) if (r.finished || r.dist > this.pd) this.rank++;
      const winner = this.racers.find((r) => r.finished);
      if (winner) { this.lose(winner); return; }
      if (!car) {
        if ((this.outT += dt) > OUT_LIMIT) { m.fail(this, 'Du lämnade gatloppet', [WHO.kim, 'Hallå? Gick du hem, eller?']); return; }
      } else this.outT = 0;
    }
    const n = this.racers.length + 1;
    if (this.stage !== 'race') m.setObjective('Vinn gatloppet', `${n} förare · ${RACE_LAPS} varv`);
    else if (!car) m.setObjective('Hoppa in i en bil!', mmss(Math.ceil(OUT_LIMIT - this.outT)));
    else {
      const lap = Math.min(RACE_LAPS, 1 + Math.floor(this.next / this.perLap));
      m.setObjective('Vinn gatloppet', `Plats ${this.rank}/${n} · Varv ${lap}/${RACE_LAPS} · ${mmss(this.time)}`);
    }
  }

  win() {
    const g = this.game;
    g.stats.raceTime = this.time;
    this.mgr.complete(this, { title: 'UPPDRAG KLART', sub: 'Gatloppet', amount: RACE_PRIZE });
    this.mgr.sms(WHO.kim, 'Okej, okej. Du är snabbare än jag trodde. Pengarna är dina.', 3.4);
  }

  lose(w) {
    const text = w.name === 'Kim' ? 'Haha! Kom tillbaka när du har övat.' : 'Till och med Bosse slog dig! Kom tillbaka när du har övat.';
    this.mgr.fail(this, `${w.name} vann gatloppet`, [WHO.kim, text]);
  }

  targets(T) {
    const a = this.cps[this.next], b = this.cps[this.next + 1];
    if (a) T.push({ kind: 'ring', x: a.x, z: a.z, h: a.h, finish: this.next === this.cps.length - 1 });
    if (b) T.push({ kind: 'ring', x: b.x, z: b.z, h: b.h, dim: true });
    for (const r of this.racers) T.push({ kind: 'racer', car: r.car });
  }

  release(r) {
    const g = this.game, v = r.car;
    const i = g.racers.indexOf(r);
    if (i >= 0) g.racers.splice(i, 1);
    if (v.racer === r) {
      v.racer = null;
      if (v.driver === 'racer' && !v.removed) {
        if (v.dead) { v.driver = null; v.input.park = true; } // a wreck stays where it is
        else { v.driver = 'ai'; g.traffic.replan(v); }
      }
    }
  }

  drop(r) {
    this.release(r);
    this.racers.splice(this.racers.indexOf(r), 1);
  }

  cleanup() {
    const g = this.game;
    this.over = true;
    g.player.locked = false;
    g.emit('fade', { on: false });
    g.emit('countdown', { text: '' });
    for (const r of this.racers) this.release(r);
    this.racers = [];
  }
}
