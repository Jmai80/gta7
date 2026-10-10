// Main quest, part 3: "Arnes budcykel" (v0.6). The north bridge is open again. Ride across to
// Norrholmen, unlock Arne's old delivery bike at lott 7 with Samuel's keys and get it to tant Gun
// on Storgatan – with a Bullbilen van out of the bakery on your heels. It drives along the roads
// (route.js); you can cut through where it can't. Don't let it ram you off the bike. Out of its
// sight and far enough ahead, it gives up. At Gun's gate she opens the saddle post…
import { WHO, GUN_GATE, GUN_BIKE, BIKE_REWARD } from './config.js';
import { ISLE } from './island.js';
import { routePoints, nearestEdge } from './route.js';
import { clamp, wrapAngle, fmt } from './rng.js';

export const CHASE = {
  vMax: 9.0,      // m/s on a straight: a little slower than the bike flat out (9.1) – but you lose speed when you bump into things
  touch: 0.9,     // and a little slower against touch controls
  burst: 0.4,     // extra speed for the last bit when it goes straight for you (not against touch controls)
  ram: 14,        // closer than this and in sight: straight for you
  start: 5.5,     // seconds from "they have seen you" until the van moves
  press: 2.6,     // its nose this close to the bike (right up behind you) …
  pressT: 1.0,    // … for this long: they push you over
  lose: 22,       // out of sight and at least this far away …
  loseT: 3.5,     // … for this long: they give up
  far: 95,        // or simply this far behind …
  farT: 2.5,      // … for this long
  minChase: 10,   // (but not before the van has been after you this long)
  grab: 5,        // the van this close to the bike while nobody rides it: they take it
};
export const ESCAPE_BONUS = 500;

// A Bullbilen van chasing the bike along the roads: re-plans its route every half second,
// follows it with pure pursuit, slows for corners and traffic, backs out when wedged, and goes
// straight for you when you are close and in sight. mode 'home': drives back to the bakery.
export class Chaser {
  constructor(game, car, o = {}) {
    this.game = game; this.car = car;
    this.vMax = o.vMax ?? CHASE.vMax;
    this.burst = o.burst ?? CHASE.burst;
    this.mode = 'chase';
    this.home = { x: ISLE.vanSpawn.x, z: (ISLE.yard.gateZ0 + ISLE.yard.gateZ1) / 2 };
    this.goal = null;      // set by the job: what to drive at ({ x, z, vx, vz, ref })
    this.path = null; this.pi = 0; this.replanT = 0; this.offRoad = false;
    this.hold = o.hold ?? 0;
    this.polite = !!o.polite;   // (v0.9) a van you are tailing keeps its distance from you too
    this.revT = 0; this.stuckT = 0;
    this.direct = false;
    car.driver = 'racer'; car.racer = this; car.ai = null; car.parkedSpot = false;
    car.steerFade = 30; car.input.park = false; car.coastT = 0;
  }

  los(x, z) { return this.game.world.raycast(this.car.x, this.car.z, x, z, 2.5) > 0.999; }

  update(dt, obstacles) {
    const g = this.game, car = this.car, inp = car.input;
    if (car.racer !== this || car.removed) return;
    if (this.hold > 0 || car.dead) { this.hold -= dt; inp.throttle = 0; inp.steer = 0; inp.park = true; return; }
    inp.park = false; inp.handbrake = false;
    const T = this.mode === 'home' ? this.home : this.goal;
    if (!T) { inp.throttle = 0; inp.park = true; return; }
    if (this.mode === 'home') {
      // driving back: done when home, after a while, or as soon as nobody is looking (then it is simply back)
      this.homeT = (this.homeT || 0) + dt;
      const pl = g.player, hidden = Math.hypot(car.x - pl.x, car.z - pl.z) > 100 && !g.visible(car.x, car.z);
      if (hidden || this.homeT > 90 || (Math.hypot(T.x - car.x, T.z - car.z) < 7 && Math.abs(car.fwdSpeed) < 1)) { this.retire(hidden); return; }
    }
    if ((this.replanT -= dt) <= 0 || !this.path) {
      this.replanT = 0.5;
      this.path = routePoints(g.layout.gps, car.x, car.z, T.x, T.z);
      const e = nearestEdge(g.layout.gps, T.x, T.z);
      this.offRoad = !e || e.d > 9.5;                  // somewhere a van can't go (the allotments, a park): wait by the road
      if (this.offRoad && this.path.length > 2) this.path.pop();
      this.pi = 0;
    }
    const speed = car.fwdSpeed, sn = Math.sin(car.h), cs = Math.cos(car.h);
    const dT = Math.hypot(T.x - car.x, T.z - car.z);
    this.direct = this.mode === 'chase' && !this.polite && !this.offRoad && dT < CHASE.ram && this.los(T.x, T.z);
    let tx, tz, v;
    if (this.direct) {
      const lead = clamp(dT / 14, 0, 0.55);
      tx = T.x + (T.vx || 0) * lead; tz = T.z + (T.vz || 0) * lead;
      v = Math.min(this.vMax + this.burst, Math.hypot(T.vx || 0, T.vz || 0) + 3.5);
    } else {
      const la = this.lookahead(clamp(4 + Math.abs(speed) * 0.55, 5, 13));
      tx = la.x - la.dz * 1.8; tz = la.z + la.dx * 1.8;   // keep to the right-hand side of the road
      v = this.speedAhead();
      const end = this.path[this.path.length - 1];
      const toEnd = Math.hypot(end[0] - car.x, end[1] - car.z);
      if (this.mode === 'home' || this.offRoad) v = Math.min(v, Math.max(0, (toEnd - 3) * 0.9)); // pull up and wait
    }
    // traffic and people in the way (not the one we are after): slow down and follow
    const look = clamp(6 + Math.abs(speed) * 1.2, 8, 22);
    let gap = Infinity;
    for (const o of obstacles) {
      if (o.ref === car || (T.ref && o.ref === T.ref) || (this.mode === 'chase' && !this.polite && (o.kind === 'player' || o.kind === 'playercar'))) continue;
      const dx = o.x - car.x, dz = o.z - car.z, f = dx * sn + dz * cs;
      if (f < 0 || f > look + o.r) continue;
      if (Math.abs(-dx * cs + dz * sn) > o.r + 1.25) continue;
      gap = Math.min(gap, f - o.r);
    }
    if (gap < Infinity) v = Math.min(v, Math.max(0, (gap - 3.2) * 1.2));
    // pure pursuit toward the point ahead
    const dx = tx - car.x, dz = tz - car.z, dist = Math.hypot(dx, dz) || 1;
    const lf = dx * sn + dz * cs, lr = -dx * cs + dz * sn;
    const alpha = Math.atan2(lr, Math.max(lf, 0.5));
    const delta = Math.atan((2 * car.spec.wheelbase * Math.sin(alpha)) / Math.max(4, dist));
    const sf = 1 / (1 + Math.abs(speed) / car.steerFade);
    const steer = clamp(delta / (car.spec.steerMax * sf), -1, 1);
    if (lf < 0) v = Math.min(v, 5);   // the point is behind: slow down to turn around
    if (this.revT > 0) { this.revT -= dt; inp.throttle = -0.85; inp.steer = -steer; return; }
    const err = v - speed;
    let thr = clamp(err * 0.5, -1, 1);
    if (err > 2) thr = 1;
    if (v < 0.3 && Math.abs(speed) < 0.6) { thr = 0; inp.park = true; }
    inp.throttle = thr; inp.steer = steer;
    if (v > 2.5 && Math.abs(speed) < 0.6) { if ((this.stuckT += dt) > 1.0) { this.revT = 1.0; this.stuckT = 0; } }
    else this.stuckT = Math.max(0, this.stuckT - dt);
  }

  // stop chasing for good: parked, and (back) put back at its bakery dock when nobody sees it
  retire(back = false, force = false) {
    const g = this.game, car = this.car;
    const i = g.racers.indexOf(this);
    if (i >= 0) g.racers.splice(i, 1);
    this.mode = 'done';
    if (car.racer !== this || car.removed) return;
    car.racer = null; car.driver = null; car.parkedSpot = true;
    car.input.throttle = 0; car.input.steer = 0; car.input.park = true;
    const dock = { x: ISLE.bakery.x0 + 8.2, z: ISLE.bakery.z1 + 7.6 };
    const free = !g.vehicles.some((v) => v !== car && Math.hypot(v.x - dock.x, v.z - dock.z) < 3);
    if (back && free && (force || !g.visible(car.x, car.z))) {
      car.x = dock.x; car.z = dock.z; car.h = 0; car.vx = car.vz = car.w = 0; car.steer = 0;
      car.y = g.world.groundHeight(car.x, car.z);
    }
  }

  // (v0.9.1) let go of the car without parking it: someone else drives from here (the town's traffic)
  release() {
    const g = this.game, car = this.car, i = g.racers.indexOf(this);
    if (i >= 0) g.racers.splice(i, 1);
    this.mode = 'done';
    if (car.racer === this) { car.racer = null; car.driver = null; }
  }

  // the point `Ld` metres further along the route than the van
  lookahead(Ld) {
    const P = this.path, car = this.car;
    let best = this.pi, bd = Infinity, bt = 0;
    for (let i = this.pi; i < Math.min(P.length - 1, this.pi + 4); i++) {
      const a = P[i], b = P[i + 1], abx = b[0] - a[0], abz = b[1] - a[1], l2 = abx * abx + abz * abz || 1e-6;
      const t = clamp(((car.x - a[0]) * abx + (car.z - a[1]) * abz) / l2, 0, 1);
      const d = Math.hypot(a[0] + abx * t - car.x, a[1] + abz * t - car.z);
      if (d < bd) { bd = d; best = i; bt = t; }
    }
    this.pi = best;
    let i = best, t = bt, left = Ld;
    while (i < P.length - 1) {
      const a = P[i], b = P[i + 1], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const rem = seg * (1 - t);
      if (rem >= left && seg > 1e-6) { const f = t + left / seg; return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, dx: (b[0] - a[0]) / seg, dz: (b[1] - a[1]) / seg }; }
      left -= rem; i++; t = 0;
    }
    const e = P[P.length - 1], q = P[Math.max(0, P.length - 2)], l = Math.hypot(e[0] - q[0], e[1] - q[1]) || 1;
    return { x: e[0], z: e[1], dx: (e[0] - q[0]) / l, dz: (e[1] - q[1]) / l };
  }

  // the speed that still makes the corners ahead (about 8 m/s round a right angle)
  speedAhead() {
    const P = this.path, car = this.car;
    let v = this.vMax, acc = 0, px = car.x, pz = car.z;
    for (let i = this.pi + 1; i < P.length - 1 && acc < 45; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1];
      acc += Math.hypot(b[0] - px, b[1] - pz); px = b[0]; pz = b[1];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.5 || Math.hypot(c[0] - b[0], c[1] - b[1]) < 0.5) continue;
      const turn = Math.abs(wrapAngle(Math.atan2(c[0] - b[0], c[1] - b[1]) - Math.atan2(b[0] - a[0], b[1] - a[1])));
      if (turn < 0.2) continue;
      const vc = clamp(Math.sqrt(63 / Math.max(0.15, turn / (Math.PI / 2))), 5.5, this.vMax);
      v = Math.min(v, Math.sqrt(vc * vc + 14 * acc));
    }
    return v;
  }
}

// what is said at tant Gun's gate
export function bikePages(job) {
  const GUN = { who: 'Tant Gun', letter: 'G', color: '#c58be0' }, YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
  return [
    { ...GUN, text: 'Arnes cykel! Precis som jag minns den. Lite rostigare bara – precis som jag.' },
    { ...YOU, text: job.escaped ? 'Bullbilen jagade mig från ön, men jag skakade av dem.' : 'Bullbilen jagade mig hela vägen från ön!' },
    { ...GUN, text: job.escaped ? 'Duktigt, lilla vän! Nu ska vi se… Arne gömde alltid saker i sadelstolpen.' : 'Bullbovar! Nu ska vi se… Arne gömde alltid saker i sadelstolpen.' },
    { ...GUN, fx: 'recipe', text: 'Här! Receptet på Sjubybullen. ”Del 1 av 2: kardemumma, smör och…” – resten är bortrivet.' },
    { ...YOU, text: 'Var är andra halvan?' },
    { ...GUN, text: 'Den stal Bullbilen för trettio år sedan. Den ligger i kassaskåpet på deras bageri ute på Norrholmen, det sätter jag min kanelbulle på.' },
    { ...GUN, text: 'Men inte i dag. Cykeln får du låna så länge – den står här vid grinden. Och ta en kanelbulle till!', last: 'TACK!' },
  ];
}

export class BikeJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'cykel';
    this.stage = 'unlock';   // unlock → mount → ride → deliver → talk → done (or caught)
    this.prompt = null;
    this.van = null; this.chaser = null;
    this.escaped = false; this.losT = 0; this.farT = 0; this.offT = 0; this.losCheckT = 0; this.sawLos = true;
    this.t = 0;
  }

  get bike() { const b = this.game.bike; return b && !b.removed ? b : null; }
  riding() { const p = this.game.player; return !!(p.inCar && p.car === this.bike); }

  start() {
    const g = this.game, m = this.mgr;
    if (!this.bike) g.spawnBike(ISLE.bike.x, ISLE.bike.z, ISLE.bike.h, true);
    m.setObjective('Lås upp Arnes cykel', 'Lott 7 · med Samuels nycklar');
    m.later(0.8, () => { if (this.stage === 'unlock') g.emit('hint', { id: 'unlock', touch: 'Tryck LÅS UPP – Samuels nycklar passar i låset.', keys: 'Tryck E för att låsa upp cykeln med Samuels nycklar.' }); }, this);
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, bike = this.bike;
    this.t += dt;
    if (!bike) { m.fail(this, 'Cykeln försvann'); return; }
    this.prompt = null;
    if (this.stage === 'unlock') {
      const d = Math.hypot(p.x - bike.x, p.z - bike.z);
      if (p.state === 'foot' && d < 2.0) this.prompt = 'LÅS UPP';
      if (d > 25) { m.quit(this); return; }   // walked off before unlocking: no harm done
      m.setObjective('Lås upp Arnes cykel', 'Lott 7 · med Samuels nycklar');
      return;
    }
    if (this.stage === 'deliver' || this.stage === 'talk' || this.stage === 'done' || this.stage === 'caught') return;
    this.watchVan(dt);
    if (this.stage === 'mount' && this.t - (this.unlockT || 0) > 12) this.startVan();
    if (this.stage === 'mount' && this.riding()) {
      this.stage = 'ride';
      this.startVan();
      m.later(0.5, () => g.emit('hint', { id: 'shake', touch: 'Bullbilen kör bara på vägarna. Genvägar och gränder skakar av dem!', keys: 'Bullbilen kör bara på vägarna. Genvägar och gränder skakar av dem!' }), this);
    }
    if (this.stage === 'mount') { m.setObjective('Hoppa upp på cykeln!', 'Bullbilen kommer'); return; }
    // riding (or knocked off / got off)
    if (this.riding()) {
      this.offT = 0;
      const dG = Math.hypot(bike.x - GUN_GATE.x, bike.z - GUN_GATE.z);
      if (dG < GUN_GATE.r && bike.speed < 3.5) { this.deliver(); return; }
      m.setObjective('Cykla till tant Gun', this.chaseLine());
    } else {
      m.setObjective('Hoppa upp på cykeln igen!', this.chaseLine());
      const far = Math.hypot(p.x - bike.x, p.z - bike.z) > 60;
      this.offT = far ? this.offT + dt : Math.max(0, this.offT - dt);
      if (this.offT > 15) { this.reset(); m.fail(this, 'Du lämnade cykeln', [WHO.gun, 'Du kan inte bara lämna Arnes cykel på gatan! Den står vid lott 7 igen – försök en gång till.']); }
    }
  }

  chaseLine() {
    if (this.escaped || !this.van) return this.escaped ? 'Storgatan · du skakade av dig Bullbilen' : 'Storgatan';
    const p = this.game.player, d = Math.round(Math.hypot(this.van.x - p.x, this.van.z - p.z));
    return d > 70 ? 'Bullbilen är långt efter' : `Bullbilen är ${d} m bort`;
  }

  // the van: going for you (or the bike, if nobody rides it); out of sight and far enough: lost
  watchVan(dt) {
    const g = this.game, p = g.player, bike = this.bike, van = this.van, ch = this.chaser;
    if (!van || !ch || ch.mode !== 'chase') return;
    const onBike = this.riding();
    const T = onBike ? bike : p.state === 'foot' && Math.hypot(p.x - bike.x, p.z - bike.z) < 3 ? p : bike;
    ch.goal = { x: T.x, z: T.z, vx: T.vx || 0, vz: T.vz || 0, ref: T };
    const d = Math.hypot(van.x - T.x, van.z - T.z);
    // they grab the bike when nobody is on it, and push you over when they get right up behind you
    if (!onBike && Math.hypot(van.x - bike.x, van.z - bike.z) < CHASE.grab && this.stage === 'ride') { this.caught('grab'); return; }
    const nose = Math.hypot(van.x + Math.sin(van.h) * 1.6 - bike.x, van.z + Math.cos(van.h) * 1.6 - bike.z);
    this.pressT = onBike && nose < CHASE.press ? (this.pressT || 0) + dt : 0;
    if (this.pressT > CHASE.pressT && this.stage === 'ride') { this.game.player.fallOff(); this.caught('ram'); return; }
    if ((this.losCheckT -= dt) <= 0) { this.losCheckT = 0.25; this.sawLos = ch.los(T.x, T.z); }
    if (ch.hold <= 0) this.chaseT = (this.chaseT || 0) + dt;
    if (ch.hold <= 0 && onBike && d < 18 && (this.honkT = (this.honkT || 0) - dt) <= 0) {
      this.honkT = 2.2 + g.rng() * 1.5;                         // right behind you: honking and shouting
      g.emit('honk', { car: van });
      if (g.rng() < 0.6) g.emit('say', { who: van, text: ['Stanna!', 'Ge hit cykeln!', 'Den är vår!', 'Vi har dig nu!', 'Tuuut!'][Math.floor(g.rng() * 5)] });
    }
    this.losT = !this.sawLos && d > CHASE.lose ? this.losT + dt : 0;
    this.farT = d > CHASE.far ? this.farT + dt : 0;
    if (this.stage === 'ride' && this.chaseT > CHASE.minChase && (this.losT > CHASE.loseT || this.farT > CHASE.farT)) this.escape();
  }

  // the bike is unlocked: a Bullbilen van starts up in the bakery yard
  releaseVan() {
    const g = this.game, Y = ISLE.yard;
    const gateX = Y.x0, gateZ = (Y.gateZ0 + Y.gateZ1) / 2;
    let van = null, bd = 1e9;
    for (const v of g.vehicles) {
      if (v.type !== 'van' || v.driver || v.dead || v.x < Y.x0 || v.x > Y.x1 || v.z < Y.z0 || v.z > Y.z1) continue;
      const d = Math.hypot(v.x - gateX, v.z - gateZ);
      if (d < bd) { bd = d; van = v; }
    }
    if (!van) { g.makeRoom('van'); van = g.addVehicle('van', 'green', ISLE.vanSpawn.x, ISLE.vanSpawn.z, ISLE.vanSpawn.h); }
    if (!van) return;
    this.van = van;
    const touch = !!(g.input && g.input.touch);
    this.chaser = new Chaser(g, van, { vMax: CHASE.vMax * (touch ? CHASE.touch : 1), burst: touch ? 0 : CHASE.burst, hold: 99 });
    g.racers.push(this.chaser);
    g.emit('toast', { text: 'Bullbilen har sett dig! Cykla innan de hinner ut från bageriet!', long: true });
    if (this.stage === 'ride') this.startVan();
  }

  // the van gets going a few seconds after you are on the bike (or once you have dawdled long enough)
  startVan() {
    const g = this.game, van = this.van, ch = this.chaser;
    if (!ch || ch.hold < 50) return;
    ch.hold = CHASE.start;
    this.mgr.later(CHASE.start - 0.3, () => { if (this.van === van && ch.mode === 'chase') { g.emit('honk', { car: van }); g.emit('say', { who: van, text: 'Där är cykeln! Ta den!' }); } }, this);
  }

  // out of sight, far enough behind: they give up and drive back to the bakery
  escape() {
    const g = this.game;
    this.escaped = true;
    if (this.chaser) this.chaser.mode = 'home';
    g.emit('toast', { text: 'Du skakade av dig Bullbilen!', long: true });
    if (this.van) g.emit('say', { who: this.van, text: 'Vart tog hen vägen?!' });
    g.emit('chaseLost', {});
  }

  // the action button at the bike: Samuel's keys fit the lock
  interact() {
    if (this.prompt !== 'LÅS UPP') return false;
    const g = this.game, m = this.mgr, bike = this.bike;
    bike.locked = false;
    this.prompt = null;
    this.stage = 'mount';
    this.unlockT = this.t;
    g.emit('keys', { unlocked: true });
    g.emit('toast', { text: 'Klick! Samuels nycklar passade.', long: false });
    m.later(1.4, () => this.releaseVan(), this);
    return true;
  }

  onEnterCar(e) {
    if (e.car === this.bike && this.stage === 'mount') { this.stage = 'ride'; this.startVan(); }
  }

  // knocked off by the van: they take the bike
  onBikeFall(e) {
    if (this.stage !== 'ride' || !this.van) return;
    const close = Math.hypot(this.van.x - this.bike.x, this.van.z - this.bike.z) < 8;
    if (e.by === this.van || close) this.caught('ram');
  }

  caught(how) {
    const g = this.game, m = this.mgr, van = this.van;
    this.stage = 'caught';
    this.prompt = null;
    g.emit('caught', {});
    if (van) {
      this.chaser.goal = { x: van.x, z: van.z, vx: 0, vz: 0, ref: van };
      g.emit('say', { who: van, text: how === 'grab' ? 'Tack för cykeln!' : 'Hoppsan! Tack för cykeln!' });
    }
    m.later(1.6, () => {
      g.emit('fade', { on: true });
      m.later(0.55, () => {
        this.reset();
        m.fail(this, 'Bullbilen tog cykeln', [WHO.gun, 'Usch, de där bullbovarna! Grannen fick tillbaka cykeln – den står vid lott 7 igen. Försök en gång till!']);
        m.later(0.35, () => g.emit('fade', { on: false }));
      });
    }, this);
  }

  // after a failure (behind a fade to black): the bike back at lott 7, locked again, the van at its dock
  reset() {
    const g = this.game, p = g.player;
    if (p.inCar && p.car === this.bike) p.exitCar();
    g.spawnBike(ISLE.bike.x, ISLE.bike.z, ISLE.bike.h, true);
    if (this.chaser && this.chaser.mode !== 'done') this.chaser.retire(true, true);
  }

  // at tant Gun's gate: off the bike, and she comes to the gate
  deliver() {
    const g = this.game, m = this.mgr, p = g.player, flag = m.flag, gun = flag.gun;
    this.stage = 'deliver';
    this.prompt = null;
    if (this.chaser && this.chaser.mode === 'chase') {
      this.chaser.mode = 'home';
      if (this.van && Math.hypot(this.van.x - p.x, this.van.z - p.z) < 90) m.later(0.8, () => flag.say('Försvinn, era bullbovar!'));
    }
    if (gun.away) flag.toHome();
    gun.x = GUN_GATE.x; gun.z = GUN_GATE.z - 2.9; gun.y = g.world.groundHeight(gun.x, gun.z); // she comes down the path to the gate
    flag.hush = true; gun.wave = false;                                                       // (no waving while you talk)
    p.exitCar();
    const b = this.bike;
    b.x = GUN_BIKE.x; b.z = GUN_BIKE.z; b.h = GUN_BIKE.h; b.vx = b.vz = b.w = 0; b.steer = 0; b.fallen = false;
    b.y = g.world.groundHeight(b.x, b.z);
    p.x = GUN_GATE.x + 0.5; p.z = GUN_GATE.z + 0.3; p.h = Math.PI; p.vx = p.vz = 0;
    p.y = g.world.groundHeight(p.x, p.z);
    p.frozen = true;
    gun.standH = gun.h = Math.atan2(p.x - gun.x, p.z - gun.z);
    gun.body.x = gun.x; gun.body.z = gun.z; gun.body.h = gun.h;
    const line = Math.atan2(gun.x - p.x, gun.z - p.z);
    g.camFocus = { x: (p.x + gun.x) / 2, y: 0.35, z: (p.z + gun.z) / 2, yaw: line - 0.6, owner: 'bike', near: true };
    m.later(0.9, () => { this.stage = 'talk'; g.emit('talk', { id: this.id, pages: bikePages(this) }); }, this);
  }

  talkFx() {}

  talkDone() {
    if (this.stage !== 'talk') return;
    this.stage = 'done';
    const g = this.game, m = this.mgr;
    g.stats.bikeEscaped = this.escaped;
    const amount = BIKE_REWARD + (this.escaped ? ESCAPE_BONUS : 0);
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Arnes budcykel', amount });
    if (this.escaped) m.later(3.9, () => g.emit('toast', { text: `+${fmt(ESCAPE_BONUS)} kr för att du skakade av dig Bullbilen. Och en kanelbulle!`, long: true }));
    else m.later(3.9, () => g.emit('toast', { text: 'Tant Gun bjuder på en kanelbulle till. Mums!', long: true }));
    m.sms(WHO.gun, 'Receptet ligger i min syltburk nu, i säkert förvar. Och cykeln är din så länge – plinga när du kör förbi!', 8.5);
  }

  targets(T) {
    const bike = this.bike;
    if (!bike) return;
    if (this.van && this.chaser && this.chaser.mode === 'chase') T.push({ kind: 'racer', car: this.van, color: 0xff3b2f });
    if (this.stage === 'unlock' || this.stage === 'mount' || (this.stage === 'ride' && !this.riding())) T.push({ kind: 'car', car: bike, color: 0x46c96f });
    else if (this.stage === 'ride') T.push({ kind: 'zone', x: GUN_GATE.x, z: GUN_GATE.z, r: GUN_GATE.r, gps: true });
  }

  cleanup() {
    const g = this.game, p = g.player;
    this.prompt = null;
    p.frozen = false;
    this.mgr.flag.hush = false;
    if (g.camFocus && g.camFocus.owner === 'bike') g.camFocus = null;
    if (this.chaser && this.chaser.mode === 'chase') this.chaser.mode = 'home'; // whatever happened: they drive back
  }
}
