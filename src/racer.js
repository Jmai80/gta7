// Street racing: a closed route through town with rounded corners and a speed profile,
// and the computer drivers that race on it. Pure JS, so it runs in the Node tests too.
import { clamp, wrapAngle } from './rng.js';

const T1 = {}, T2 = {}, T3 = {};

export class RaceRoute {
  // start: [x, z] on a straight; corners: the turning points in driving order (a closed loop).
  // Corners get circular fillets of `radius`; the route is sampled every 1–2 m.
  constructor(start, corners, radius = 12, opts = {}) {
    const aLat = opts.aLat ?? 12, aBrake = opts.aBrake ?? 10, vMax = opts.vMax ?? 34;
    const xs = [], zs = [], ks = [], marks = [];
    const push = (x, z, k) => { xs.push(x); zs.push(z); ks.push(k); };
    const n = corners.length;
    const fil = corners.map((C, i) => {
      const P = corners[(i + n - 1) % n], N = corners[(i + 1) % n];
      const il = Math.hypot(C[0] - P[0], C[1] - P[1]), ol = Math.hypot(N[0] - C[0], N[1] - C[1]);
      const ix = (C[0] - P[0]) / il, iz = (C[1] - P[1]) / il, ox = (N[0] - C[0]) / ol, oz = (N[1] - C[1]) / ol;
      const dh = wrapAngle(Math.atan2(ox, oz) - Math.atan2(ix, iz)); // > 0: left turn (heading grows)
      const t = radius * Math.tan(Math.abs(dh) / 2);
      const A = [C[0] - ix * t, C[1] - iz * t], B = [C[0] + ox * t, C[1] + oz * t];
      const side = dh < 0 ? 1 : -1; // the inside of the turn: right (+1) or left (-1); right = (-iz, ix)
      const O = [A[0] - iz * radius * side, A[1] + ix * radius * side];
      return { A, B, O, dh };
    });
    const arc = (f) => {
      const a0 = Math.atan2(f.A[1] - f.O[1], f.A[0] - f.O[0]);
      const sweep = wrapAngle(Math.atan2(f.B[1] - f.O[1], f.B[0] - f.O[0]) - a0);
      const steps = Math.max(2, Math.ceil(Math.abs(sweep) * radius));
      const k = Math.sign(f.dh) / radius;
      for (let i = 0; i < steps; i++) {
        if (i === steps >> 1) marks.push({ i: xs.length, kind: 'corner' });
        const a = a0 + sweep * (i / steps);
        push(f.O[0] + Math.cos(a) * radius, f.O[1] + Math.sin(a) * radius, k);
      }
    };
    const line = (a, b, mid) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(1, Math.ceil(len / 2));
      for (let i = 0; i < steps; i++) {
        if (mid && i === steps >> 1) marks.push({ i: xs.length, kind: 'mid' });
        push(a[0] + (b[0] - a[0]) * (i / steps), a[1] + (b[1] - a[1]) * (i / steps), 0);
      }
    };
    line(start, fil[0].A, false);
    for (let i = 0; i < n; i++) {
      arc(fil[i]);
      const last = i === n - 1;
      const to = last ? start : fil[i + 1].A;
      line(fil[i].B, to, !last && Math.hypot(to[0] - fil[i].B[0], to[1] - fil[i].B[1]) > 110);
    }
    const N = xs.length;
    const cum = new Float64Array(N);
    for (let i = 1; i < N; i++) cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
    this.L = cum[N - 1] + Math.hypot(xs[0] - xs[N - 1], zs[0] - zs[N - 1]);
    // speed profile: cornering limit, then a backwards braking pass (twice, for the wrap-around)
    const vs = new Float64Array(N);
    for (let i = 0; i < N; i++) vs[i] = ks[i] ? Math.min(vMax, Math.sqrt(aLat / Math.abs(ks[i]))) : vMax;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = N - 1; i >= 0; i--) {
        const j = i + 1 < N ? i + 1 : 0;
        const ds = (j === 0 ? this.L : cum[j]) - cum[i];
        vs[i] = Math.min(vs[i], Math.sqrt(vs[j] * vs[j] + 2 * aBrake * ds));
      }
    }
    this.n = N; this.xs = xs; this.zs = zs; this.ks = ks; this.cum = cum; this.vs = vs;
    this.radius = radius;
    // checkpoints: corner apexes, the middle of long straights and the start/finish line
    this.marks = marks.map((m) => ({ s: cum[m.i], kind: m.kind }));
    this.marks.push({ s: this.L, kind: 'finish' });
    this.lastDist = 0;
  }

  indexAt(s) {
    let lo = 0, hi = this.n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.cum[mid] <= s) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  // position, direction, curvature and target speed at an (unwrapped) distance along the route
  pointAt(d, out = {}) {
    const L = this.L, N = this.n;
    const s = ((d % L) + L) % L;
    const i = this.indexAt(s), j = i + 1 < N ? i + 1 : 0;
    const seg = (j === 0 ? L : this.cum[j]) - this.cum[i] || 1;
    const t = (s - this.cum[i]) / seg;
    const x0 = this.xs[i], z0 = this.zs[i], x1 = this.xs[j], z1 = this.zs[j];
    out.x = x0 + (x1 - x0) * t; out.z = z0 + (z1 - z0) * t;
    out.dx = (x1 - x0) / seg; out.dz = (z1 - z0) / seg;
    out.k = this.ks[i];
    out.v = this.vs[i] + (this.vs[j] - this.vs[i]) * t;
    return out;
  }

  // closest route distance to (x, z), searched in a window around the hint; returns an
  // unwrapped distance (laps keep counting up). lastDist = how far off the route the point is.
  project(x, z, hint, back = 12, fwd = 30) {
    const L = this.L, N = this.n;
    const s0 = hint - back;
    const local = ((s0 % L) + L) % L;
    let base = s0 - local;
    let i = this.indexAt(local);
    let bestD = 1e18, bestS = hint;
    for (let k = 0; k <= N; k++) {
      const j = i + 1 < N ? i + 1 : 0;
      const sa = base + this.cum[i];
      if (sa > hint + fwd) break;
      const seg = (j === 0 ? L : this.cum[j]) - this.cum[i];
      const ax = this.xs[i], az = this.zs[i], abx = this.xs[j] - ax, abz = this.zs[j] - az;
      const l2 = abx * abx + abz * abz || 1;
      const t = clamp(((x - ax) * abx + (z - az) * abz) / l2, 0, 1);
      const dx = ax + abx * t - x, dz = az + abz * t - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; bestS = sa + seg * t; }
      if (j === 0) base += L;
      i = j;
    }
    this.lastDist = Math.sqrt(bestD);
    return bestS;
  }
}

// A computer driver: follows the route with a lateral offset (right of the route is positive),
// dodges cars in its way, backs out when wedged and rubber-bands toward the player.
export class RaceDriver {
  constructor(game, car, route, o = {}) {
    this.game = game; this.car = car; this.route = route;
    this.name = o.name || 'Förare';
    this.line = o.line || '';
    this.skill = o.skill ?? 0.95;
    this.base = o.base ?? 0;
    this.off = o.off ?? this.base;
    this.offT = this.off;
    this.dist = o.dist ?? 0;
    this.ctx = o.ctx || { playerDist: this.dist };
    this.hold = true;
    this.finished = false;
    this.revT = 0; this.stuckT = 0; this.clearT = 0;
    this.best = this.dist; this.noProgT = 0; this.respawns = 0;
    this.rubber = 1;
    this.near = []; this.nn = 0; this.speedNow = 6;
    this.blocker = null;
    car.driver = 'racer'; car.racer = this; car.ai = null;
    car.steerFade = 30; car.parkedSpot = false;
  }

  update(dt, obstacles) {
    const car = this.car, R = this.route, inp = car.input;
    if (car.racer !== this || car.removed) return;
    this.dist = R.project(car.x, car.z, this.dist, 10, 26);
    if (this.hold || car.dead) { inp.throttle = 0; inp.steer = 0; inp.handbrake = false; inp.park = true; return; }
    inp.park = false; inp.handbrake = false;
    const speed = car.fwdSpeed;

    // watchdog: no progress for a while and nobody watching → put the car back on the route
    if (this.dist > this.best + 2) { this.best = this.dist; this.noProgT = 0; }
    else if ((this.noProgT += dt) > 7 && !this.game.visible(car.x, car.z)) { this.respawn(); return; }

    // target speed: the route profile a little ahead, slower on a tighter inside line,
    // times skill and the rubber band (only slows down in corners, never speeds up there)
    const ahead = R.pointAt(this.dist + 2 + Math.max(0, speed) * 0.3, T1);
    let v = ahead.v;
    if (ahead.k) {
      const r = 1 / Math.abs(ahead.k), rEff = Math.max(5, r + Math.sign(ahead.k) * this.off);
      v = Math.min(v, v * Math.sqrt(rEff / r));
    }
    const lead = this.dist - this.ctx.playerDist;
    const rb = lead > 50 ? 0.8 : lead > 20 ? 0.9 : lead < -50 ? 1.08 : lead < -20 ? 1.04 : 1;
    this.rubber += (rb - this.rubber) * Math.min(1, dt * 0.7);
    v *= this.skill * (this.rubber < 1 || !ahead.k ? this.rubber : 1);
    if (this.finished) v = Math.min(v, 9);

    // obstacles: everything ahead that we are closing in on (with its velocity, so crossing
    // traffic is seen where it will be when we get there)
    const sn = Math.sin(car.h), cs = Math.cos(car.h);
    const look = clamp(10 + Math.abs(speed) * 1.6, 14, 48);
    const near = this.near;
    let nn = 0;
    for (const o of obstacles) {
      if (o.ref === car) continue;
      const dx = o.x - car.x, dz = o.z - car.z, d2 = dx * dx + dz * dz;
      if (d2 > (look + 5) * (look + 5) || dx * sn + dz * cs < -2) continue;
      const r = o.ref, ovx = r && r.vx !== undefined ? r.vx : 0, ovz = r && r.vz !== undefined ? r.vz : 0;
      if ((car.vx - ovx) * sn + (car.vz - ovz) * cs < 0.5 && d2 > 36) continue;
      const e = near[nn] || (near[nn] = {});
      e.x = o.x; e.z = o.z; e.r = o.r; e.vx = ovx; e.vz = ovz;
      nn++;
    }
    this.nn = nn;
    this.speedNow = Math.max(6, speed);
    // corners: the inside of the turn is only ~1 m wide before the curb, the outside is free
    let lo = -3.6, hi = 3.6;
    for (const a of [0, 5, 10, 16]) {
      const k = R.pointAt(this.dist + a, T2).k;
      if (k > 0) lo = Math.max(lo, -1); else if (k < 0) hi = Math.min(hi, 1);
    }
    this.offT = clamp(this.offT, lo, hi);
    let gap = nn ? this.gapAt(this.offT, look) : Infinity;
    let blocker = gap < Infinity ? this.blocker : null;
    if (gap < Infinity) {
      // try other lines; prefer the one that stays clear the longest, without zig-zagging
      this.clearT = 0;
      const score = (c, g) => Math.min(g, look + 4) - Math.abs(c - this.off) * 1.2;
      let best = score(this.offT, gap), bestOff = this.offT, bestGap = gap, bestBlk = blocker;
      for (const c0 of [this.base, this.offT - 2.6, this.offT + 2.6, -3.4, 3.4, 0]) {
        const c = clamp(c0, lo, hi);
        if (Math.abs(c - this.offT) < 0.5) continue;
        const g = this.gapAt(c, look), sc = score(c, g);
        if (sc > best + 2) { best = sc; bestOff = c; bestGap = g; bestBlk = g < Infinity ? this.blocker : null; }
      }
      this.offT = bestOff; gap = bestGap; blocker = bestBlk;
    } else if ((this.clearT += dt) > 1.5) {
      this.offT += clamp(clamp(this.base, lo, hi) - this.offT, -dt, dt);
    }
    if (blocker) {
      const ov = Math.max(0, blocker.vx * sn + blocker.vz * cs);
      const vFollow = Math.max(0, (gap - 4.5) * 1.3);
      v = Math.min(v, Math.max(vFollow, Math.min(ov, vFollow + 3)));
      if (gap < 4) v = 0;
    }
    this.off += clamp(this.offT - this.off, -4.5 * dt, 4.5 * dt);

    // steering: pure pursuit toward a point ahead on the (offset) route
    const Ld = clamp(4.5 + Math.abs(speed) * 0.4, 5.5, 15);
    const tp = R.pointAt(this.dist + Ld, T3);
    const tx = tp.x - tp.dz * this.off, tz = tp.z + tp.dx * this.off;
    const dx = tx - car.x, dz = tz - car.z;
    const lf = dx * sn + dz * cs, lr = -dx * cs + dz * sn;
    const alpha = Math.atan2(lr, Math.max(lf, 0.5));
    const delta = Math.atan((2 * car.spec.wheelbase * Math.sin(alpha)) / Math.max(Ld * 0.8, Math.hypot(dx, dz)));
    const sf = 1 / (1 + Math.abs(speed) / car.steerFade);
    const steer = clamp(delta / (car.spec.steerMax * sf), -1, 1);

    // throttle; back out when wedged against something
    if (this.revT > 0) {
      this.revT -= dt;
      inp.throttle = -0.85; inp.steer = -steer;
      return;
    }
    const err = v - speed;
    let thr = clamp(err * 0.45, -1, 1);
    if (err > 0.3) thr = Math.max(thr, 0.3);
    if (err > 2.5) thr = 1;
    if (v < 0.3 && speed < 0.8) { thr = 0; inp.park = true; }
    inp.throttle = thr; inp.steer = steer;
    if (v > 3 && Math.abs(speed) < 0.7) {
      if ((this.stuckT += dt) > 1.0) { this.revT = 1.1; this.stuckT = 0; }
    } else this.stuckT = Math.max(0, this.stuckT - dt);
  }

  // distance along the route to the first obstacle on the line `off` (Infinity when clear);
  // obstacles are moved along their velocity to where they will be when we arrive
  gapAt(off, look) {
    const R = this.route, near = this.near, inv = 1 / this.speedNow;
    for (let ds = 2.5; ds <= look; ds += 2.5) {
      const p = R.pointAt(this.dist + ds, T2);
      const px = p.x - p.dz * off, pz = p.z + p.dx * off;
      const t = Math.min(2.5, ds * inv);
      for (let k = 0; k < this.nn; k++) {
        const e = near[k];
        const dx = e.x + e.vx * t - px, dz = e.z + e.vz * t - pz, lim = e.r + 1.2;
        if (dx * dx + dz * dz < lim * lim) { this.blocker = e; return ds; }
      }
    }
    return Infinity;
  }

  respawn() {
    const car = this.car, R = this.route, g = this.game;
    for (let k = 0; k < 8; k++) {
      const d = this.best + 4 + k * 6;
      const p = R.pointAt(d, T1);
      const x = p.x - p.dz * this.base, z = p.z + p.dx * this.base;
      if (g.vehicles.some((v) => v !== car && Math.hypot(v.x - x, v.z - z) < 5.5)) continue;
      car.x = x; car.z = z; car.h = Math.atan2(p.dx, p.dz);
      car.vx = car.vz = car.vy = car.w = 0; car.steer = 0; car.air = false;
      car.y = g.world.groundHeight(x, z);
      this.dist = this.best = d;
      this.off = this.offT = this.base;
      this.noProgT = 0; this.revT = 0; this.stuckT = 0;
      this.respawns++;
      return true;
    }
    this.noProgT = 4; // the route ahead is crowded: try again in a few seconds
    return false;
  }
}
