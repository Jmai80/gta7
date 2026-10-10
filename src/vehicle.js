// Arcade car physics on a flat world with ramps. Pure JS – shared by player and AI cars.
import { clamp, moveToward } from './rng.js';
import { circleVs } from './collide.js';

export const CAR_TYPES = {
  sedan: {
    key: 'sedan', name: 'Dalahäst GT', len: 4.4, wid: 1.86, height: 1.45,
    wheelbase: 2.7, track: 0.84, wheelR: 0.34, wheelZ: [1.35, -1.35],
    mass: 1300, accel: 10.5, maxSpeed: 37, brake: 19, revAccel: 5.5, revMax: 9,
    grip: 15, hbGrip: 4.2, steerMax: 0.62,
    circles: [-1.42, 0, 1.42], radius: 0.93,
  },
  van: {
    key: 'van', name: 'Bullbilen', len: 4.9, wid: 2.0, height: 2.25,
    wheelbase: 3.0, track: 0.9, wheelR: 0.38, wheelZ: [1.5, -1.5],
    mass: 2100, accel: 7.8, maxSpeed: 31, brake: 15, revAccel: 4.5, revMax: 7.5,
    grip: 12.5, hbGrip: 3.6, steerMax: 0.56,
    circles: [-1.55, 0, 1.55], radius: 1.0,
  },
  // Arne's old delivery bike from Sjuby Konditori (v0.6): light, quick to turn, never breaks down
  bike: {
    key: 'bike', name: 'Arnes budcykel', len: 1.9, wid: 0.62, height: 1.1,
    wheelbase: 1.26, track: 0, wheelR: 0.34, wheelZ: [0.66, -0.6],
    mass: 120, accel: 3.6, maxSpeed: 9.9, brake: 8, revAccel: 1.2, revMax: 1.3,   // flat out about 9.1 m/s (33 km/h)
    grip: 15, hbGrip: 7, steerMax: 0.72,
    circles: [-0.45, 0.45], radius: 0.3, bike: true, noDamage: true,
  },
  // the red racing bike (v1.0) that Jonte the bike thief leaves behind at the party: light and fast
  racebike: {
    key: 'racebike', name: 'Röd racercykel', len: 1.9, wid: 0.5, height: 1.05,
    wheelbase: 1.26, track: 0, wheelR: 0.34, wheelZ: [0.66, -0.6],
    mass: 95, accel: 4.6, maxSpeed: 11.6, brake: 8.5, revAccel: 1.2, revMax: 1.3,   // flat out about 11 m/s (40 km/h)
    grip: 15, hbGrip: 7, steerMax: 0.7,
    circles: [-0.45, 0.45], radius: 0.3, bike: true, noDamage: true,
  },
  // (v1.2) the stolen bikes going home to their owners: ordinary town bikes with a basket
  citybike: {
    key: 'citybike', name: 'Damcykel', len: 1.9, wid: 0.6, height: 1.1,
    wheelbase: 1.26, track: 0, wheelR: 0.34, wheelZ: [0.66, -0.6],
    mass: 110, accel: 3.8, maxSpeed: 10.4, brake: 8, revAccel: 1.2, revMax: 1.3,   // flat out about 9.6 m/s (35 km/h)
    grip: 15, hbGrip: 7, steerMax: 0.72,
    circles: [-0.45, 0.45], radius: 0.3, bike: true, noDamage: true,
  },
};

// where things are on Arne's bike (models.js builds it, the player sits on the saddle)
export const BIKE_GEO = { rearZ: -0.6, rearR: 0.34, frontZ: 0.66, frontR: 0.26, pivot: [0, 0.62, 0.5], saddle: [0, 0.94, -0.3] };

export const PAINTS = {
  red: { hex: 0xc4191b, name: 'röd', red: true },
  white: { hex: 0xe9e9e4, name: 'vit' },
  black: { hex: 0x1c1e22, name: 'svart' },
  blue: { hex: 0x1f4f9c, name: 'blå' },
  silver: { hex: 0xa7adb3, name: 'silver' },
  yellow: { hex: 0xe2b52a, name: 'gul' },
  green: { hex: 0x2f6b45, name: 'grön' },
  lightblue: { hex: 0x86acd1, name: 'ljusblå' },
  pizza: { hex: 0x2e7a46, name: 'grön' },        // Pizzeria Sjuan's delivery car
  bike: { hex: 0x23452f, name: 'grön' },         // Arne's bike
  racer: { hex: 0xc4191b, name: 'röd' },         // the racing bike Jonte leaves behind (v1.0) – not a red CAR for Lasse
  ronny: { hex: 0x7d6a52, name: 'brun' },        // (v1.2) Ronny's rusty old van
  cityOrange: { hex: 0xe8833a, name: 'orange' },   // (v1.2) the bikes going home: Vera's,
  cityYellow: { hex: 0xe2b52a, name: 'gul' },      // Lasse's
  cityPink: { hex: 0xe86aa0, name: 'rosa' },       // and Yasmin's
};

const GRAVITY = 16;

let nextId = 1;
export class Vehicle {
  constructor(type, paint, x, z, h) {
    this.id = nextId++;
    this.type = type;
    this.spec = CAR_TYPES[type];
    this.paint = paint;
    this.x = x; this.z = z; this.y = 0.15; this.h = h;
    this.vx = 0; this.vz = 0; this.vy = 0; this.w = 0;
    this.steer = 0; this.spin = 0;
    this.input = { throttle: 0, steer: 0, handbrake: false, park: true };
    this.driver = null;        // 'ai' | 'racer' | 'player' | null
    this.ai = null;
    this.health = 100;
    this.dead = false;
    this.air = false; this.airTime = 0; this.airDist = 0;
    this.wasOnRamp = false;
    this.slip = 0;
    this.accLong = 0; this.accLat = 0;
    this.roll = 0; this.pitch = 0; this.rampPitch = 0;
    this.brakeLight = 0;
    this.inertia = this.spec.mass * (this.spec.len ** 2 + this.spec.wid ** 2) / 12;
    this.steerFade = 14;       // player gets more speed-sensitive steering than AI
    this.power = 1;
    this.boost = 1; this.top = 1; this.armor = 1; // Lasse's upgrades while the player drives (upgrades.js)
    this.parkedSpot = false;   // part of the parking lot scenery (never despawned)
    this.lastHitBy = null;
    this.instance = -1;
    this.lastX = x; this.lastZ = z;
    this.coastT = 0;           // seconds an abandoned car keeps rolling freely (bail-out)
  }

  get speed() { return Math.hypot(this.vx, this.vz); }
  get fwdSpeed() { return this.vx * Math.sin(this.h) + this.vz * Math.cos(this.h); }
  get isRed() { return !!(PAINTS[this.paint] && PAINTS[this.paint].red); }

  step(dt, world) {
    const s = this.spec, inp = this.input;
    const sn = Math.sin(this.h), cs = Math.cos(this.h);
    let vf = this.vx * sn + this.vz * cs;
    let vr = -this.vx * cs + this.vz * sn;
    const vfPrev = vf;
    let accLong = 0;
    this.lastX = this.x; this.lastZ = this.z;

    if (!this.air) {
      let thr = this.dead || this.driver === null ? 0 : clamp(inp.throttle, -1, 1);
      if (thr > 0.02) {
        if (vf < -0.3) accLong = s.brake * thr;
        else accLong = s.accel * thr * Math.max(0, 1 - (Math.max(vf, 0) / (s.maxSpeed * this.top)) ** 2) * this.power * this.boost;
      } else if (thr < -0.02) {
        if (vf > 0.3) accLong = -s.brake * -thr;
        else accLong = vf > -s.revMax ? -s.revAccel * -thr * this.power : 0;
      }
      let nvf = vf + accLong * dt;
      if ((thr < -0.02 && vf > 0.3 && nvf < 0) || (thr > 0.02 && vf < -0.3 && nvf > 0)) nvf = 0;
      vf = nvf;

      if (this.coastT > 0) this.coastT -= dt;
      const parked = this.driver === null ? this.coastT <= 0 : inp.park;
      let decel = 1.0 + 0.022 * Math.abs(vf);
      if (Math.abs(thr) > 0.02) decel *= 0.4;
      if (inp.handbrake) decel += 6.5;
      if (parked) decel += 9;
      vf = moveToward(vf, 0, decel * dt);

      let grip = inp.handbrake ? s.hbGrip : s.grip;
      if (parked && !inp.handbrake) grip = 26;
      this.slip = Math.abs(vr);
      vr = moveToward(vr, 0, grip * dt);

      const sf = 1 / (1 + Math.abs(vf) / this.steerFade);
      const target = clamp(inp.steer, -1, 1) * s.steerMax * sf;
      this.steer += (target - this.steer) * Math.min(1, dt * 9);
      let wT = -(vf / s.wheelbase) * Math.tan(this.steer);
      const vabs = Math.abs(vf);
      if (inp.handbrake && vabs > 3) wT *= 1.5;
      const wMax = inp.handbrake ? 3.2 : (s.grip * 1.25) / Math.max(vabs, 2.5);
      wT = clamp(wT, -wMax, wMax);
      this.w += (wT - this.w) * Math.min(1, dt * 10);
    } else {
      this.w *= Math.exp(-0.6 * dt);
      this.slip = 0;
    }

    this.h += this.w * dt;
    if (this.h > Math.PI) this.h -= Math.PI * 2; else if (this.h < -Math.PI) this.h += Math.PI * 2;
    this.vx = vf * sn - vr * cs;
    this.vz = vf * cs + vr * sn;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.accLong = (vf - vfPrev) / dt;
    this.accLat = vf * this.w;
    this.spin += (vf * dt) / s.wheelR;

    // vertical: ramps launch, curbs snap
    const gh = world.groundHeight(this.x, this.z);
    const onRamp = world.lastRamp;
    this.rampObj = onRamp;
    if (this.air) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      this.airTime += dt;
      this.airDist += Math.hypot(this.vx, this.vz) * dt;
      this.rampPitch = moveToward(this.rampPitch, -0.22, 0.45 * dt);
      if (this.y <= gh) {
        let groundVy = 0;
        if (onRamp) {
          const slope = (onRamp.h1 - onRamp.h0) / (onRamp.axis === 'z' ? onRamp.z1 - onRamp.z0 : onRamp.x1 - onRamp.x0);
          groundVy = slope * (onRamp.axis === 'z' ? this.vz : this.vx);
        }
        this.landImpact = Math.max(0, -(this.vy - groundVy));
        this.landed = { airTime: this.airTime, dist: this.airDist, impact: this.landImpact };
        this.y = gh; this.vy = 0; this.air = false;
      }
    } else if (gh < this.y - 0.4) {
      this.air = true; this.airTime = 0; this.airDist = 0;
    } else {
      this.vy = onRamp || this.wasOnRamp ? (gh - this.y) / dt : 0;
      this.y = gh;
      if (onRamp) {
        const slope = (onRamp.h1 - onRamp.h0) / (onRamp.axis === 'z' ? onRamp.z1 - onRamp.z0 : onRamp.x1 - onRamp.x0);
        const along = onRamp.axis === 'z' ? cs : sn;
        this.rampPitch = Math.atan(slope * along);
      } else this.rampPitch = moveToward(this.rampPitch, 0, 3 * dt);
    }
    this.wasOnRamp = !!onRamp;

    // brake lights
    const braking = (inp.throttle < -0.05 && vf > 0.5) || (inp.throttle > 0.05 && vf < -0.5) || (inp.park && this.driver === 'ai') || inp.handbrake;
    this.brakeLight = braking ? 1 : 0;
  }

  // Resolve against static colliders. Returns the strongest impact speed this step.
  collideStatic(world) {
    const s = this.spec;
    let maxImpact = 0;
    for (let iter = 0; iter < 2; iter++) {
      const sn = Math.sin(this.h), cs = Math.cos(this.h);
      for (const off of s.circles) {
        const cx = this.x + sn * off, cz = this.z + cs * off;
        const hits = world.query(cx, cz, s.radius);
        for (let k = 0; k < hits.length; k++) {
          const c = hits[k];
          if (this.y > c.h - 0.12) continue;
          if (c.lip && (this.rampObj === c.ramp || this.air)) continue; // driving off the top edge of a ramp
          const res = circleVs(c, this.x + sn * off, this.z + cs * off, s.radius);
          if (!res) continue;
          const nx = res.nx, nz = res.nz, depth = res.depth;
          this.x += nx * depth; this.z += nz * depth;
          const imp = this.applyImpulse(sn * off - nx * s.radius, cs * off - nz * s.radius, nx, nz, 0.18, 0.35);
          if (imp > maxImpact) maxImpact = imp;
        }
      }
    }
    return maxImpact;
  }

  // impulse against an immovable surface at contact offset (rx,rz) with normal n
  applyImpulse(rx, rz, nx, nz, e, mu) {
    const invM = 1 / this.spec.mass, invI = 1 / this.inertia;
    const vcx = this.vx + this.w * rz, vcz = this.vz - this.w * rx;
    const vn = vcx * nx + vcz * nz;
    if (vn >= 0) return 0;
    const rn = rz * nx - rx * nz;
    const j = (-(1 + e) * vn) / (invM + rn * rn * invI);
    this.vx += j * nx * invM; this.vz += j * nz * invM; this.w += j * rn * invI;
    const tx = -nz, tz = nx;
    const vt = vcx * tx + vcz * tz;
    const rt = rz * tx - rx * tz;
    let jt = -vt / (invM + rt * rt * invI);
    const lim = mu * j;
    jt = jt < -lim ? -lim : jt > lim ? lim : jt;
    this.vx += jt * tx * invM; this.vz += jt * tz * invM; this.w += jt * rt * invI;
    this.w = clamp(this.w, -6, 6);
    return -vn;
  }

  damage(amount) {
    if (amount <= 0 || this.spec.noDamage) return;
    this.health = Math.max(0, this.health - amount * this.armor);
    this.power = this.health < 25 ? 0.6 : 1;
    if (this.health <= 0) this.dead = true;
  }

  repair() {
    this.health = 100; this.dead = false; this.power = 1;
  }

  // world position of a point in car-local coordinates (x right, z forward)
  local(lx, lz) {
    const sn = Math.sin(this.h), cs = Math.cos(this.h);
    return { x: this.x + sn * lz - cs * lx, z: this.z + cs * lz + sn * lx };
  }
}

// Car vs car. Calls onHit(a, b, impactSpeed, x, z) for noticeable hits.
export function collideVehicles(list, onHit) {
  const n = list.length;
  for (let i = 0; i < n; i++) {
    const a = list[i];
    for (let j = i + 1; j < n; j++) {
      const b = list[j];
      const dx = a.x - b.x, dz = a.z - b.z;
      const reach = (a.spec.len + b.spec.len) / 2 + 0.3;
      if (dx * dx + dz * dz > reach * reach) continue;
      if (Math.abs(a.y - b.y) > 1.5) continue;
      const sa = Math.sin(a.h), ca = Math.cos(a.h), sb = Math.sin(b.h), cb = Math.cos(b.h);
      let best = null;
      for (const oa of a.spec.circles) {
        const ax = a.x + sa * oa, az = a.z + ca * oa;
        for (const ob of b.spec.circles) {
          const bx = b.x + sb * ob, bz = b.z + cb * ob;
          const ddx = ax - bx, ddz = az - bz;
          const rr = a.spec.radius + b.spec.radius;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 < rr * rr) {
            const d = Math.sqrt(d2) || 1e-4;
            const depth = rr - d;
            if (!best || depth > best.depth) best = { depth, nx: ddx / d, nz: ddz / d, px: bx + (ddx / d) * b.spec.radius, pz: bz + (ddz / d) * b.spec.radius };
          }
        }
      }
      if (!best) continue;
      const imp = resolvePair(a, b, best);
      if (imp > 1.2 && onHit) onHit(a, b, imp, best.px, best.pz);
    }
  }
}

function resolvePair(a, b, c) {
  const ima = 1 / a.spec.mass, imb = 1 / b.spec.mass;
  // parked cars are heavier to push (brakes on)
  const wa = a.driver === null ? 0.55 : 1, wb = b.driver === null ? 0.55 : 1;
  const ia = ima * wa, ib = imb * wb;
  const tot = ia + ib;
  a.x += c.nx * c.depth * (ia / tot); a.z += c.nz * c.depth * (ia / tot);
  b.x -= c.nx * c.depth * (ib / tot); b.z -= c.nz * c.depth * (ib / tot);
  const rax = c.px - a.x, raz = c.pz - a.z, rbx = c.px - b.x, rbz = c.pz - b.z;
  const vax = a.vx + a.w * raz, vaz = a.vz - a.w * rax;
  const vbx = b.vx + b.w * rbz, vbz = b.vz - b.w * rbx;
  const rvx = vax - vbx, rvz = vaz - vbz;
  const vn = rvx * c.nx + rvz * c.nz;
  if (vn >= 0) return 0;
  const rna = raz * c.nx - rax * c.nz, rnb = rbz * c.nx - rbx * c.nz;
  const iia = (1 / a.inertia) * wa, iib = (1 / b.inertia) * wb;
  const e = 0.25;
  const j = (-(1 + e) * vn) / (ia + ib + rna * rna * iia + rnb * rnb * iib);
  a.vx += j * c.nx * ia; a.vz += j * c.nz * ia; a.w += j * rna * iia;
  b.vx -= j * c.nx * ib; b.vz -= j * c.nz * ib; b.w -= j * rnb * iib;
  // a little friction so cars don't skate along each other
  const tx = -c.nz, tz = c.nx;
  const vt = rvx * tx + rvz * tz;
  const rta = raz * tx - rax * tz, rtb = rbz * tx - rbx * tz;
  let jt = -vt / (ia + ib + rta * rta * iia + rtb * rtb * iib);
  const lim = 0.3 * j;
  jt = clamp(jt, -lim, lim);
  a.vx += jt * tx * ia; a.vz += jt * tz * ia; a.w += jt * rta * iia;
  b.vx -= jt * tx * ib; b.vz -= jt * tz * ib; b.w -= jt * rtb * iib;
  a.w = clamp(a.w, -6, 6); b.w = clamp(b.w, -6, 6);
  return -vn;
}
