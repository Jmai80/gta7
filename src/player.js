// The player: walks, steals cars (pulling AI drivers out), drives, bails out.
import { circleVs } from './collide.js';
import { clamp, smoothAngle } from './rng.js';
import { Ped, makeBody, makeLook } from './peds.js';
import { START } from './config.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.look = { shirt: 0x1d5fd1, pants: 0x2a2e35, skin: 0xf0c8a8, hair: 0xb07a35, height: 1.0, bulk: 1.0, stripe: true };
    this.body = makeBody(this.look);
    this.x = START.x; this.z = START.z; this.y = 0.15; this.h = START.h;
    this.vx = 0; this.vz = 0; this.vy = 0;
    this.state = 'foot';
    this.stateT = 0;
    this.car = null;
    this.target = null;
    this.r = 0.32;
    this.near = null;
    this.hornOn = false;
    this.moved = 0;
    this.body.x = this.x; this.body.z = this.z; this.body.h = this.h;
  }

  get inCar() { return this.state === 'car' && this.car; }

  update(dt, input) {
    this.stateT += dt;
    if (input.action) this.onAction();
    switch (this.state) {
      case 'car': this.drive(dt, input); break;
      case 'foot': this.walk(dt, input); break;
      case 'enter': this.entering(dt); break;
      case 'down': this.downStep(dt); break;
    }
    this.near = this.state === 'foot' ? this.findCar() : null;
    const b = this.body;
    b.x = this.x; b.y = this.y; b.z = this.z; b.h = this.h;
    b.visible = this.state !== 'car';
  }

  onAction() {
    const g = this.game;
    if (this.state === 'foot') {
      const car = this.findCar();
      if (!car) return;
      if (car.dead) { g.emit('toast', { text: 'Den bilen är helt död.' }); return; }
      if (car.speed > 3.5) { g.emit('toast', { text: 'Den rullar för fort! Ställ dig framför den.' }); return; }
      this.state = 'enter'; this.stateT = 0; this.target = car;
      if (car.driver === 'ai' && car.ai) car.ai.hold = true;
    } else if (this.state === 'car') {
      this.exitCar();
    }
  }

  findCar() {
    const g = this.game;
    let best = null, bd = 2.2;
    for (const v of g.vehicles) {
      if (Math.abs(v.y - this.y) > 1.2) continue;
      const dx0 = v.x - this.x, dz0 = v.z - this.z;
      if (dx0 * dx0 + dz0 * dz0 > 25) continue;
      const sn = Math.sin(v.h), cs = Math.cos(v.h);
      for (const off of v.spec.circles) {
        const d = Math.hypot(v.x + sn * off - this.x, v.z + cs * off - this.z) - v.spec.radius;
        if (d < bd) { bd = d; best = v; }
      }
    }
    return best;
  }

  entering(dt) {
    const car = this.target;
    if (!car || car.driver === 'player') { this.state = 'foot'; return; }
    const door = car.local(-1.35, 0.3);
    const dx = door.x - this.x, dz = door.z - this.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.35 && this.stateT < 0.7) {
      const s = Math.min(d, 6 * dt);
      this.x += (dx / d) * s; this.z += (dz / d) * s;
      this.h = smoothAngle(this.h, Math.atan2(dx, dz), 14, dt);
      this.body.phase += 6 * dt * 2.6; this.body.legAmp = 0.7; this.body.armAmp = 0.6;
      return;
    }
    this.finishEnter(car);
  }

  finishEnter(car) {
    const g = this.game;
    const jacked = car.driver === 'ai';
    if (jacked) {
      g.traffic.release(car);
      const door = car.local(-1.5, 0.25);
      const ped = new Ped(g, car.driverLook || makeLook(g.rng));
      ped.x = door.x; ped.z = door.z; ped.y = car.y;
      ped.h = car.h + Math.PI / 2;
      const lx = Math.cos(car.h), lz = -Math.sin(car.h); // car's left vector
      ped.knock(lx * 3.2, lz * 3.2, 4);
      ped.downFor = 0.9;
      ped.afterGetup = 'flee';
      ped.fleeFrom = { x: car.x, z: car.z };
      ped.pickNearestLoop();
      ped.say(car.type === 'van' ? 'jackedVan' : 'jacked', true);
      g.peds.add(ped);
    }
    car.driver = 'player';
    car.ai = null;
    car.input.park = false; car.input.throttle = 0; car.input.handbrake = false;
    car.steerFade = 14;
    car.parkedSpot = false;
    car.everPlayer = true;
    this.car = car; this.target = null;
    this.state = 'car'; this.stateT = 0;
    this.vx = this.vz = 0;
    g.emit('enterCar', { car, jacked });
  }

  exitCar() {
    const g = this.game, car = this.car;
    if (!car) return;
    const sp = car.speed;
    const spots = [car.local(-1.6, 0.2), car.local(1.65, 0.2), car.local(0, car.spec.len / 2 + 0.9), car.local(0, -car.spec.len / 2 - 0.9)];
    let spot = spots[0];
    for (const s of spots) {
      let blocked = false;
      for (const c of g.world.query(s.x, s.z, this.r + 0.05)) {
        if (c.h > 0.5 && circleVs(c, s.x, s.z, this.r + 0.05)) { blocked = true; break; }
      }
      if (!blocked) { spot = s; break; }
    }
    this.x = spot.x; this.z = spot.z;
    this.y = g.world.groundHeight(this.x, this.z);
    this.h = car.h;
    this.hornOn && g.emit('horn', { on: false, car });
    this.hornOn = false;
    car.driver = null;
    const bail = sp > 7;
    car.input.throttle = 0; car.input.steer = 0; car.input.handbrake = false; car.input.park = !bail;
    if (bail) {
      car.coastT = 3;
      const lx = Math.cos(car.h), lz = -Math.sin(car.h);
      this.vx = car.vx * 0.45 + lx * 2.5; this.vz = car.vz * 0.45 + lz * 2.5; this.vy = 2.2;
      this.state = 'down'; this.stateT = 0; this.downFor = 1.1;
      this.body.lieDir = 1;
    } else {
      this.state = 'foot'; this.vx = this.vz = 0;
    }
    this.car = null;
    g.emit('exitCar', { car, bail });
  }

  drive(dt, input) {
    const g = this.game, car = this.car;
    let thr, steer = input.moveX;
    if (input.throttleAxis !== null && input.throttleAxis !== undefined) {
      thr = input.throttleAxis;
      if (input.steerAxis !== null && input.steerAxis !== undefined) steer = input.steerAxis;
    } else if (g.settings.drive === 'pedals') {
      thr = (input.gas ? 1 : 0) - (input.brake ? 1 : 0);
    } else {
      const mx = input.moveX, my = input.moveY;
      const mag = Math.min(1, Math.hypot(mx, my));
      thr = mag < 0.14 ? 0 : my > -0.35 * mag ? mag : -mag;
    }
    steer = Math.sign(steer) * Math.pow(Math.min(1, Math.abs(steer)), 1.25);
    car.input.throttle = thr;
    car.input.steer = steer;
    car.input.handbrake = !!input.handbrake;
    car.input.park = false;
    if (input.horn !== this.hornOn) {
      this.hornOn = !!input.horn;
      g.emit('horn', { on: this.hornOn, car });
      if (this.hornOn) { g.peds.honkedAt(car); g.stats.honks++; }
    }
    this.x = car.x; this.z = car.z; this.y = car.y; this.h = car.h;
  }

  walk(dt, input) {
    const g = this.game;
    const mx = input.moveX, my = input.moveY;
    const mag = Math.min(1, Math.hypot(mx, my));
    const yaw = input.camYaw ?? this.h;
    let dx = Math.sin(yaw) * my - Math.cos(yaw) * mx;
    let dz = Math.cos(yaw) * my + Math.sin(yaw) * mx;
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl; dz /= dl;
    let speed = 0;
    if (mag > 0.12) {
      if (input.analog) speed = mag > 0.86 ? 6.0 : 1.5 + ((mag - 0.12) / 0.74) * 2.2;
      else speed = input.sprint ? 6.4 : 3.9;
    }
    const k = 1 - Math.exp(-12 * dt);
    this.vx += (dx * speed - this.vx) * k;
    this.vz += (dz * speed - this.vz) * k;
    this.x += this.vx * dt; this.z += this.vz * dt;
    this.collideStatic();
    this.y = g.world.groundHeight(this.x, this.z);
    const sp = Math.hypot(this.vx, this.vz);
    this.moved += sp * dt;
    if (sp > 0.25) this.h = smoothAngle(this.h, Math.atan2(this.vx, this.vz), 12, dt);
    const b = this.body;
    b.phase += sp * dt * 2.6;
    b.legAmp = clamp(sp * 0.2, 0, 0.95);
    b.armAmp = b.legAmp * 0.9;
    b.lean = sp > 4.5 ? 0.2 : 0;
    b.pose = 0;
    b.lie = Math.max(0, b.lie - dt * 3);
  }

  downStep(dt) {
    const g = this.game, b = this.body;
    this.vy -= 18 * dt;
    this.y += this.vy * dt;
    const gh = g.world.groundHeight(this.x, this.z);
    if (this.y < gh) { this.y = gh; this.vy = 0; }
    const sp = Math.hypot(this.vx, this.vz);
    const fr = this.y <= gh + 0.01 ? 6 : 0.5;
    if (sp > 0) { const ns = Math.max(0, sp - fr * dt); this.vx *= ns / sp; this.vz *= ns / sp; }
    this.x += this.vx * dt; this.z += this.vz * dt;
    this.collideStatic();
    if (this.stateT < (this.downFor || 1.4)) b.lie = Math.min(1, b.lie + dt * 6);
    else {
      b.lie = Math.max(0, b.lie - dt * 2.5);
      if (b.lie <= 0) { this.state = 'foot'; this.stateT = 0; }
    }
    b.legAmp *= 0.8; b.armAmp *= 0.8;
  }

  collideStatic() {
    const g = this.game;
    for (let it = 0; it < 2; it++) {
      for (const c of g.world.query(this.x, this.z, this.r)) {
        if (c.h < 0.5) continue;
        const res = circleVs(c, this.x, this.z, this.r);
        if (res) { this.x += res.nx * res.depth; this.z += res.nz * res.depth; }
      }
    }
  }

  // after vehicles moved: get pushed (or run over) by cars
  postPhysics() {
    if (this.state === 'car' || this.state === 'enter') return;
    const g = this.game;
    for (const v of g.vehicles) {
      if (Math.abs(v.y - this.y) > 1.6) continue;
      const dx0 = this.x - v.x, dz0 = this.z - v.z;
      if (dx0 * dx0 + dz0 * dz0 > 12) continue;
      const sn = Math.sin(v.h), cs = Math.cos(v.h);
      for (const off of v.spec.circles) {
        const dx = this.x - (v.x + sn * off), dz = this.z - (v.z + cs * off);
        const rr = v.spec.radius + this.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 1e-4, nx = dx / d, nz = dz / d;
        this.x += nx * (rr - d); this.z += nz * (rr - d);
        const rel = (v.vx - this.vx) * nx + (v.vz - this.vz) * nz;
        if (rel > 4 && this.state === 'foot') {
          this.state = 'down'; this.stateT = 0; this.downFor = 1.3;
          this.vx = v.vx * 0.7 + nx * 2; this.vz = v.vz * 0.7 + nz * 2; this.vy = Math.min(5, 1.5 + rel * 0.2);
          this.body.lieDir = -1;
          g.emit('playerHit', { car: v, speed: rel });
        }
        break;
      }
    }
  }
}
