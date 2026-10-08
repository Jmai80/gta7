// The simulation core: owns the world state and steps it at a fixed rate.
// No rendering or DOM here, so it can run headless in tests.
import { createLayout } from './layout.js';
import { CollisionWorld } from './collide.js';
import { Vehicle, collideVehicles, CAR_TYPES } from './vehicle.js';
import { Traffic } from './traffic.js';
import { Peds, makeLook } from './peds.js';
import { Player } from './player.js';
import { Missions } from './mission.js';
import { Indoors } from './indoors.js';
import { PIZZA_CAR } from './config.js';
import { makeRng } from './rng.js';

export const CAPACITY = { sedan: 24, van: 14 };
const TRAFFIC_TARGET = 12;
const PED_TARGET = 22;

export class Game {
  constructor(opts = {}) {
    this.seed = opts.seed ?? 7;
    this.rng = makeRng(this.seed * 7919 + 13);
    this.layout = opts.layout || createLayout(this.seed);
    this.world = new CollisionWorld(this.layout);
    this.settings = opts.settings || { drive: 'stick' };
    this.listeners = {};
    this.time = 0;
    this.money = 0;
    this.stats = {
      carsStolen: 0, carsJacked: 0, crashes: 0, pedsKnocked: 0, maxSpeed: 0, driven: 0, honks: 0, stuntJumps: 0, bestJump: 0,
      missionTime: 0, totalTime: 0, deliveredCondition: null, playTime: 0, pizzas: 0, raceTime: null, fails: 0, washes: 0,
    };
    this.vehicles = [];
    this.racers = [];      // computer drivers in Kim's street race
    this.pizzaCar = null;  // Sanna's car, parked across from the pizzeria
    this.view = { x: 0, z: 0, fx: 0, fz: -1, valid: false };
    this.input = null;
    this.camFocus = null;  // { x, y, z }: something a mission wants the camera to look at
    this.traffic = new Traffic(this);
    this.peds = new Peds(this);
    this.player = new Player(this);
    this.mission = new Missions(this);
    this.indoors = new Indoors(this); // the dark tower: inside it you are somewhere else entirely
    this.obs = [];
    this.obsPool = [];
    this.spawnT = 0;
    this.missionActive = opts.missionActive ?? true;
    this.on('honk', () => {});
    this.spawnInitial(opts.traffic ?? TRAFFIC_TARGET, opts.peds ?? PED_TARGET);
  }

  get indoor() { return this.indoors.inside; }

  on(evt, fn) { (this.listeners[evt] || (this.listeners[evt] = [])).push(fn); }
  emit(evt, data) { const l = this.listeners[evt]; if (l) for (const fn of l) fn(data || {}); }

  count(type) { let n = 0; for (const v of this.vehicles) if (v.type === type) n++; return n; }

  addVehicle(type, paint, x, z, h) {
    if (this.count(type) >= CAPACITY[type]) return null;
    const v = new Vehicle(type, paint, x, z, h);
    v.y = this.world.groundHeight(x, z);
    v.driverLook = makeLook(this.rng);
    this.vehicles.push(v);
    return v;
  }

  removeVehicle(v) {
    const i = this.vehicles.indexOf(v);
    if (i >= 0) this.vehicles.splice(i, 1);
    this.traffic.release(v);
    v.removed = true;
  }

  spawnInitial(nTraffic, nPeds) {
    for (const p of this.layout.parked) {
      const v = this.addVehicle(p.type, p.color, p.x, p.z, p.h);
      if (v) v.parkedSpot = true;
    }
    this.spawnPizzaCar();
    const plan = [
      ['sedan', 'red'], ['van', 'white'], ['sedan', 'blue'], ['sedan', 'red'], ['van', 'red'], ['sedan', 'white'],
      ['sedan', 'yellow'], ['van', 'lightblue'], ['sedan', 'black'], ['sedan', 'silver'], ['van', 'green'], ['sedan', 'red'],
      ['sedan', 'green'], ['van', 'white'],
    ];
    // spread the first cars around the town, including two near the start
    const preferred = [
      { a: [0, -1], b: [0, 1] }, // Kungsgatan southbound near start → handled by generic picking below
    ];
    void preferred;
    let placed = 0, tries = 0;
    while (placed < nTraffic && tries < 400) {
      tries++;
      const lane = this.rng.pick(this.traffic.lanes);
      const t = this.rng.range(0.15, 0.8);
      const x = lane.x0 + (lane.x1 - lane.x0) * t, z = lane.z0 + (lane.z1 - lane.z0) * t;
      if (this.vehicles.some((v) => Math.hypot(v.x - x, v.z - z) < 16)) continue;
      if (Math.hypot(x - this.player.x, z - this.player.z) < 10) continue;
      const [type, paint] = plan[placed % plan.length];
      const v = this.addVehicle(type, paint, x, z, 0);
      if (!v) continue;
      this.traffic.attach(v, lane, t);
      placed++;
    }
    this.peds.spawnInitial(nPeds);
  }

  // full of cars of this type? send the farthest AI one home (out of sight if possible)
  makeRoom(type) {
    if (this.count(type) < CAPACITY[type]) return true;
    const p = this.player;
    let far = null, fd = -1;
    for (const v of this.vehicles) {
      if (v.type !== type || v.driver !== 'ai' || v.parkedSpot) continue;
      const d = Math.hypot(v.x - p.x, v.z - p.z) + (this.visible(v.x, v.z) ? 0 : 1000);
      if (d > fd) { fd = d; far = v; }
    }
    if (far) this.removeVehicle(far);
    return !!far;
  }

  // Sanna's green pizza car with the roof sign, parked in its stall
  spawnPizzaCar() {
    const S = PIZZA_CAR;
    this.makeRoom('sedan');
    const v = this.addVehicle('sedan', 'pizza', S.x, S.z, S.h);
    if (!v) return null;
    if (this.pizzaCar) this.pizzaCar.pizza = false;
    v.pizza = true;
    v.parkedSpot = true;
    this.pizzaCar = v;
    return v;
  }

  buildObstacles() {
    const obs = this.obs, pool = this.obsPool;
    obs.length = 0;
    let k = 0;
    const take = () => pool[k] || (pool[k] = {});
    for (const v of this.vehicles) {
      const moving = (v.driver === 'ai' && v.ai && !v.ai.lost) || v.driver === 'racer';
      const kind = v.driver === 'player' ? 'playercar' : moving && !v.dead ? 'car' : 'parked';
      const sn = Math.sin(v.h), cs = Math.cos(v.h), sp = v.speed;
      const stuck = !!(v.ai && v.ai.blockedT > 7);
      for (const off of v.spec.circles) {
        const o = take(); k++;
        o.x = v.x + sn * off; o.z = v.z + cs * off; o.r = v.spec.radius; o.v = sp; o.kind = kind; o.ref = v; o.stuck = stuck;
        obs.push(o);
      }
    }
    const p = this.player;
    if (p.state !== 'car') {
      const o = take(); k++;
      o.x = p.x; o.z = p.z; o.r = 0.45; o.v = 0; o.kind = 'player'; o.ref = p; o.stuck = false;
      obs.push(o);
    }
    for (const ped of this.peds.list) {
      const o = take(); k++;
      o.x = ped.x; o.z = ped.z; o.r = 0.4; o.v = 0; o.kind = 'ped'; o.ref = ped; o.stuck = false;
      obs.push(o);
    }
    return obs;
  }

  step(dt, input) {
    this.time += dt;
    this.input = input; // missions read held buttons (hoisting a flag)
    const p = this.player;
    p.update(dt, input);
    const obs = this.buildObstacles();
    this.traffic.update(dt, this.vehicles, obs);
    for (const r of this.racers) r.update(dt, obs);

    const playerCar = p.inCar ? p.car : null;
    for (const v of this.vehicles) {
      v.step(dt, this.world);
      const imp = v.collideStatic(this.world);
      if (imp > 2.2) this.onCrash(v, imp, null);
    }
    collideVehicles(this.vehicles, (a, b, imp, x, z) => {
      this.onCrash(a, imp, b, x, z);
      this.onCrash(b, imp, a, x, z, true);
    });
    this.peds.update(dt);
    p.postPhysics(dt);
    this.indoors.update(dt);
    if (this.missionActive) this.mission.update(dt);

    if (playerCar) {
      const kmh = playerCar.speed * 3.6;
      if (kmh > this.stats.maxSpeed) this.stats.maxSpeed = kmh;
      this.stats.driven += playerCar.speed * dt;
    }
    this.housekeeping(dt);
  }

  onCrash(v, imp, other, x, z, secondary = false) {
    const isPlayer = this.player.car === v;
    const dmg = Math.max(0, imp - 3.2) * (v.type === 'van' ? 1.7 : 2.2) * (v.driver === 'racer' ? 0.5 : 1);
    v.damage(dmg);
    if (isPlayer && imp > 3.5) this.stats.crashes++;
    if (!secondary || isPlayer) {
      this.emit('crash', { x: x ?? v.x, z: z ?? v.z, impact: imp, player: isPlayer || (other && this.player.car === other), car: v });
    }
    // AI drivers complain when the player hits them
    if (other && this.player.car === other && v.driver === 'ai' && imp > 3) {
      if (!v.sayT || this.time - v.sayT > 4) {
        v.sayT = this.time;
        this.emit('say', { who: v, text: this.rng.pick(['Lär dig köra!', 'Hörru!!', 'Min lack!', 'Är du full?!', 'Jag har försäkring, men ändå!']) });
      }
    }
  }

  housekeeping(dt) {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = 1.5;
    const p = this.player;
    // remove lost AI cars / far abandoned cars out of view
    for (const v of [...this.vehicles]) {
      if (v === p.car || v.parkedSpot || v.driver === 'racer' || v.pizza) continue; // the pizza car is looked after by the missions
      const far = Math.hypot(v.x - p.x, v.z - p.z) > 85 && !this.visible(v.x, v.z);
      if (!far) continue;
      if (v.driver === 'ai' && v.ai && (v.ai.lost || (v.ai.recovering && v.ai.recoverT > 6))) this.removeVehicle(v);
      else if (v.driver === null && (v.dead || this.vehicles.filter((q) => q.driver === null && !q.parkedSpot).length > 5)) this.removeVehicle(v);
      else if (v.dead) this.removeVehicle(v);
    }
    // top up traffic
    const ai = this.vehicles.filter((v) => v.driver === 'ai' && v.ai && !v.ai.lost).length;
    if (ai < TRAFFIC_TARGET) this.spawnTraffic();
    // keep the crowd size sane (carjacked drivers join the crowd)
    if (this.peds.list.length > PED_TARGET + 6) {
      const far = this.peds.list.filter((q) => !q.keep && Math.hypot(q.x - p.x, q.z - p.z) > 70 && !this.visible(q.x, q.z));
      if (far.length) this.peds.list.splice(this.peds.list.indexOf(far[0]), 1);
    }
  }

  visible(x, z) {
    const v = this.view;
    if (!v.valid) return false;
    const dx = x - v.x, dz = z - v.z, d = Math.hypot(dx, dz);
    if (d > 190) return false;
    if (d < 25) return true;
    return (dx * v.fx + dz * v.fz) / d > 0.35;
  }

  spawnTraffic() {
    const p = this.player;
    const reds = this.vehicles.filter((v) => v.isRed && !v.dead && v.driver !== 'player').length;
    for (let tries = 0; tries < 30; tries++) {
      const lane = this.rng.pick(this.traffic.lanes);
      const t = this.rng.range(0.1, 0.7);
      const x = lane.x0 + (lane.x1 - lane.x0) * t, z = lane.z0 + (lane.z1 - lane.z0) * t;
      if (Math.hypot(x - p.x, z - p.z) < 60 || this.visible(x, z)) continue;
      if (this.vehicles.some((v) => Math.hypot(v.x - x, v.z - z) < 15)) continue;
      const type = this.rng.chance(0.65) ? 'sedan' : 'van';
      const paints = ['white', 'blue', 'black', 'silver', 'yellow', 'green', 'lightblue', 'red'];
      const paint = reds < 3 ? 'red' : this.rng.pick(paints);
      const v = this.addVehicle(type, paint, x, z, 0) || this.addVehicle(type === 'sedan' ? 'van' : 'sedan', paint, x, z, 0);
      if (!v) return;
      this.traffic.attach(v, lane, t);
      return v;
    }
    return null;
  }

  // saved progress (money, finished jobs, stats)
  snapshot() {
    return this.mission.progress();
  }
}

export { CAR_TYPES };
