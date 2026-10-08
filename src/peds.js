// Pedestrians: walk around block sidewalks, dodge cars, fall over when hit,
// complain loudly and flee. Also used for the driver you pull out of a car.
import { circleVs } from './collide.js';
import { clamp, wrapAngle, smoothAngle } from './rng.js';

const SHIRTS = [0xc0392b, 0x2e86c1, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x34495e, 0x16a085, 0xd35400, 0x7f8c8d, 0xe84393];
const PANTS = [0x2c3e50, 0x34495e, 0x1f2a36, 0x5d4037, 0x7f8c8d, 0x22313f, 0x3e5a7a, 0x111418];
const SKINS = [0xf2d0b5, 0xe8b996, 0xc68e62, 0x9c6b45, 0x6b4630, 0xf7dcc6];
const HAIRS = [0x2b1d14, 0x5a3a22, 0xd9b26b, 0x8a5a2b, 0x1a1a1a, 0xa0a0a0, 0xc8442c, 0xe8d29a];

export const LINES = {
  dodge: ['Hörru!', 'Akta dig!', 'Kör som folk!', 'Har du körkort?!', 'Hallå där!', 'Typiskt Sjuby…'],
  hit: ['Aj!', 'Min rygg!', 'Jag ska ringa polisen!', 'Det där gjorde ont!', 'Idiot!'],
  jacked: ['Min bil!!', 'Tjuv!!', 'Den är inte ens betald!', 'Ring polisen!', 'Hallå, det är MIN bil!'],
  jackedVan: ['Mina bullar!!', 'Hallå, det är MIN Bullbil!', 'Kanelbullarna!!'],
  honked: ['Lugna ner dig!', 'Ja ja, jag går!', 'Tuta själv!', 'Stressa inte!'],
  bumped: ['Ursäkta?!', 'Se dig för!', 'Hörru, aj!', 'Trängs inte!'],
};

export function makeLook(R) {
  return {
    shirt: R.pick(SHIRTS), pants: R.pick(PANTS), skin: R.pick(SKINS), hair: R.pick(HAIRS),
    height: R.range(0.92, 1.06), bulk: R.range(0.92, 1.12),
  };
}

// render-facing body state shared by peds and the player
export function makeBody(look) {
  return {
    x: 0, y: 0.15, z: 0, h: 0, lie: 0, lieDir: 1, lean: 0, phase: 0, legAmp: 0, armAmp: 0, pose: 0, visible: true, look,
  };
}

function loopPoint(L, t, out) {
  const w = L.x1 - L.x0, h = L.z1 - L.z0, P = 2 * (w + h);
  t = ((t % P) + P) % P;
  if (t < w) { out.x = L.x0 + t; out.z = L.z0; out.dx = 1; out.dz = 0; }
  else if (t < w + h) { out.x = L.x1; out.z = L.z0 + (t - w); out.dx = 0; out.dz = 1; }
  else if (t < 2 * w + h) { out.x = L.x1 - (t - w - h); out.z = L.z1; out.dx = -1; out.dz = 0; }
  else { out.x = L.x0; out.z = L.z1 - (t - 2 * w - h); out.dx = 0; out.dz = -1; }
  return out;
}

function loopProject(L, x, z) {
  const w = L.x1 - L.x0, h = L.z1 - L.z0;
  const cands = [
    [clamp(x, L.x0, L.x1), L.z0, (cx) => cx - L.x0],
    [L.x1, clamp(z, L.z0, L.z1), (_, cz) => w + (cz - L.z0)],
    [clamp(x, L.x0, L.x1), L.z1, (cx) => w + h + (L.x1 - cx)],
    [L.x0, clamp(z, L.z0, L.z1), (_, cz) => 2 * w + h + (L.z1 - cz)],
  ];
  let best = 0, bd = 1e9;
  for (const [cx, cz, f] of cands) {
    const d = (cx - x) ** 2 + (cz - z) ** 2;
    if (d < bd) { bd = d; best = f(cx, cz); }
  }
  return { t: best, dist: Math.sqrt(bd) };
}

const LP = {};

export class Ped {
  constructor(game, look) {
    this.game = game;
    this.body = makeBody(look);
    this.x = 0; this.z = 0; this.y = 0.15; this.h = 0;
    this.vx = 0; this.vz = 0; this.vy = 0;
    this.state = 'walk'; this.stateT = 0;
    this.loop = null; this.t = 0; this.dir = 1; this.lat = 0;
    this.speed = game.rng.range(1.15, 1.6);
    this.r = 0.3;
    this.sayT = 0;
    this.fleeFrom = null;
    this.idleT = game.rng.range(8, 30);
  }

  setLoop(L, t, dir) {
    this.loop = L; this.t = t; this.dir = dir;
    this.lat = this.game.rng.range(-0.75, 0.75);
    const p = loopPoint(L, t, LP);
    this.x = p.x - p.dz * this.lat * dir; this.z = p.z + p.dx * this.lat * dir;
    this.h = Math.atan2(p.dx * dir, p.dz * dir);
  }

  say(kind, force = false) {
    if (this.sayT > 0 && !force) return;
    const R = this.game.rng;
    this.sayT = 3.5;
    this.game.emit('say', { who: this, text: R.pick(LINES[kind] || LINES.dodge) });
  }

  knock(vx, vz, strength) {
    if (this.state === 'down' || this.state === 'getup') return;
    this.state = 'down'; this.stateT = 0;
    this.vx = vx; this.vz = vz; this.vy = Math.min(5, 1.5 + strength * 0.18);
    this.body.lieDir = Math.random() < 0.5 ? 1 : -1;
    this.downFor = 2.2 + Math.random() * 1.2;
  }

  flee(fromX, fromZ, time = 5) {
    this.state = 'flee'; this.stateT = 0; this.fleeFor = time;
    this.fleeFrom = { x: fromX, z: fromZ };
  }

  update(dt) {
    const g = this.game, b = this.body;
    this.stateT += dt;
    this.sayT -= dt;
    let tvx = 0, tvz = 0, run = false, anim = true;
    switch (this.state) {
      case 'walk': {
        if (!this.loop) { this.state = 'idle'; break; }
        const pr = loopProject(this.loop, this.x, this.z);
        if (pr.dist > 2.5) {
          // walk back to the sidewalk
          const p = loopPoint(this.loop, pr.t, LP);
          const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz) || 1;
          tvx = (dx / d) * this.speed; tvz = (dz / d) * this.speed;
          this.t = pr.t;
        } else {
          this.t += this.dir * this.speed * dt;
          const p = loopPoint(this.loop, this.t + this.dir * 1.6, LP);
          const px = p.x - p.dz * this.lat * this.dir, pz = p.z + p.dx * this.lat * this.dir;
          const dx = px - this.x, dz = pz - this.z, d = Math.hypot(dx, dz) || 1;
          tvx = (dx / d) * this.speed; tvz = (dz / d) * this.speed;
          // stay in sync if we fell behind
          if (Math.abs(((pr.t - this.t) % 1e4)) > 6 && pr.dist < 2.5) this.t = pr.t;
        }
        this.idleT -= dt;
        if (this.idleT <= 0) { this.state = 'idle'; this.stateT = 0; this.idleFor = g.rng.range(2, 5); }
        break;
      }
      case 'idle':
        if (this.stateT > (this.idleFor || 3)) { this.state = 'walk'; this.idleT = g.rng.range(10, 35); if (g.rng.chance(0.3)) this.dir = -this.dir; }
        break;
      case 'flee': {
        run = true;
        const f = this.fleeFrom;
        let dx = this.x - f.x, dz = this.z - f.z;
        const d = Math.hypot(dx, dz) || 1;
        dx /= d; dz /= d;
        tvx = dx * 5.2; tvz = dz * 5.2;
        if (this.stateT > this.fleeFor) {
          this.state = 'walk'; this.stateT = 0;
          this.pickNearestLoop();
        }
        break;
      }
      case 'dodge':
        tvx = this.vx; tvz = this.vz;
        b.pose = 3;
        if (this.stateT > 0.5) { this.state = 'angry'; this.stateT = 0; this.say('dodge'); }
        break;
      case 'angry':
        b.pose = 1;
        if (this.stateT > 1.6) { this.state = 'walk'; b.pose = 0; }
        break;
      case 'down': {
        anim = false;
        // airborne tumble then slide
        this.vy -= 18 * dt;
        this.y += this.vy * dt;
        const gh = g.world.groundHeight(this.x, this.z);
        if (this.y < gh) { this.y = gh; this.vy = 0; }
        const fr = this.y <= gh + 0.01 ? 7 : 0.5;
        const sp = Math.hypot(this.vx, this.vz);
        if (sp > 0) { const ns = Math.max(0, sp - fr * dt); this.vx *= ns / sp; this.vz *= ns / sp; }
        tvx = this.vx; tvz = this.vz;
        b.lie = Math.min(1, b.lie + dt * 5);
        if (this.stateT > this.downFor && this.y <= gh + 0.01) { this.state = 'getup'; this.stateT = 0; }
        break;
      }
      case 'getup':
        anim = false;
        b.lie = Math.max(0, b.lie - dt * 2.2);
        if (b.lie <= 0) {
          if (this.afterGetup === 'flee') { this.flee(this.fleeFrom ? this.fleeFrom.x : this.x, this.fleeFrom ? this.fleeFrom.z : this.z, 5); this.afterGetup = null; }
          else { this.state = 'angry'; this.stateT = 0; this.say('hit'); }
        }
        break;
    }

    // accelerate toward target velocity (instant-ish for the 'down' state which sets velocity itself)
    if (this.state === 'down' || this.state === 'dodge') { this.vx = tvx; this.vz = tvz; }
    else {
      const k = 1 - Math.exp(-10 * dt);
      this.vx += (tvx - this.vx) * k; this.vz += (tvz - this.vz) * k;
    }
    this.x += this.vx * dt; this.z += this.vz * dt;

    // static collisions
    const hits = g.world.query(this.x, this.z, this.r);
    for (const c of hits) {
      if (c.h < 0.5) continue;
      const res = circleVs(c, this.x, this.z, this.r);
      if (res) { this.x += res.nx * res.depth; this.z += res.nz * res.depth; }
    }
    if (this.state !== 'down') this.y = g.world.groundHeight(this.x, this.z);

    // facing + animation
    const sp = Math.hypot(this.vx, this.vz);
    if (sp > 0.3 && this.state !== 'down' && this.state !== 'getup') this.h = smoothAngle(this.h, Math.atan2(this.vx, this.vz), 10, dt);
    if (anim) {
      b.phase += sp * dt * 2.6;
      b.legAmp = clamp(sp * 0.22, 0, run ? 0.9 : 0.55);
      b.armAmp = b.legAmp * 0.85;
      b.lean = run ? 0.18 : 0;
      if (this.state !== 'angry' && this.state !== 'dodge') b.pose = 0;
    } else { b.legAmp *= 0.8; b.armAmp *= 0.8; }
    b.x = this.x; b.y = this.y; b.z = this.z; b.h = this.h;
  }

  pickNearestLoop() {
    let best = null, bd = 1e9, bt = 0;
    for (const L of this.game.layout.loops) {
      const p = loopProject(L, this.x, this.z);
      if (p.dist < bd) { bd = p.dist; best = L; bt = p.t; }
    }
    if (best) { this.loop = best; this.t = bt; }
  }
}

export class Peds {
  constructor(game) {
    this.game = game;
    this.list = [];
  }

  spawnInitial(n) {
    const g = this.game, R = g.rng;
    const loops = g.layout.loops;
    for (let i = 0; i < n; i++) {
      const L = loops[i % loops.length];
      const ped = new Ped(g, makeLook(R));
      const P = 2 * ((L.x1 - L.x0) + (L.z1 - L.z0));
      ped.setLoop(L, R.range(0, P), R.chance(0.5) ? 1 : -1);
      this.list.push(ped);
    }
  }

  add(ped) { this.list.push(ped); return ped; }

  update(dt) {
    const g = this.game;
    const list = this.list;
    // dodge danger: fast cars heading at us
    for (const p of list) {
      if (p.state === 'down' || p.state === 'getup' || p.state === 'dodge') continue;
      for (const v of g.vehicles) {
        const sp = v.speed;
        if (sp < 6.5 || v.y > 1.5) continue;
        const dx = p.x - v.x, dz = p.z - v.z;
        if (dx * dx + dz * dz > 400) continue;
        const ux = v.vx / sp, uz = v.vz / sp;
        const fwd = dx * ux + dz * uz;
        const lat = -dx * uz + dz * ux;
        if (fwd > 0 && fwd < sp * 1.1 + 2 && Math.abs(lat) < 2.3) {
          const side = lat >= 0 ? 1 : -1;
          // jump sideways (along the car's right vector), away from its path
          p.vx = -uz * side * 5.5; p.vz = ux * side * 5.5;
          p.state = 'dodge'; p.stateT = 0;
          break;
        }
      }
    }
    for (const p of list) p.update(dt);
    // ped-ped separation
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.state === 'down') continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.state === 'down') continue;
        const dx = a.x - b.x, dz = a.z - b.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 0.36 && d2 > 1e-6) {
          const d = Math.sqrt(d2), push = (0.6 - d) / 2;
          a.x += (dx / d) * push; a.z += (dz / d) * push;
          b.x -= (dx / d) * push; b.z -= (dz / d) * push;
        }
      }
    }
    // cars vs peds
    for (const p of list) this.carContact(p);
  }

  carContact(p) {
    const g = this.game;
    for (const v of g.vehicles) {
      if (Math.abs(v.y - p.y) > 1.6) continue;
      const dx0 = p.x - v.x, dz0 = p.z - v.z;
      if (dx0 * dx0 + dz0 * dz0 > 12) continue;
      const sn = Math.sin(v.h), cs = Math.cos(v.h);
      for (const off of v.spec.circles) {
        const cx = v.x + sn * off, cz = v.z + cs * off;
        const dx = p.x - cx, dz = p.z - cz;
        const rr = v.spec.radius + p.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 1e-4;
        const nx = dx / d, nz = dz / d;
        p.x += nx * (rr - d); p.z += nz * (rr - d);
        const rel = (v.vx - p.vx) * nx + (v.vz - p.vz) * nz;
        if (rel > 3.2 && p.state !== 'down') {
          p.knock(v.vx * 0.75 + nx * 2, v.vz * 0.75 + nz * 2, rel);
          g.emit('pedHit', { ped: p, car: v, speed: rel });
          v.vx *= 0.93; v.vz *= 0.93;
        }
        break;
      }
    }
  }

  // the player honked: peds in front jump and complain
  honkedAt(car) {
    const sn = Math.sin(car.h), cs = Math.cos(car.h);
    for (const p of this.list) {
      const dx = p.x - car.x, dz = p.z - car.z;
      const fwd = dx * sn + dz * cs, lat = Math.abs(-dx * cs + dz * sn);
      if (fwd > 0 && fwd < 14 && lat < 6 && p.state === 'walk') { p.say('honked'); p.state = 'angry'; p.stateT = 0.6; }
    }
  }

  wrapAngle(a) { return wrapAngle(a); }
}
