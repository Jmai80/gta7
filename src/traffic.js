// Traffic AI: lane paths through the road graph, intersection reservations,
// car following, honking, overtaking of abandoned cars and recovery after crashes.
import { LANE, STOP_D } from './config.js';
import { DIRS, rightOf, leftOf, opposite } from './layout.js';
import { clamp } from './rng.js';

const laneOff = (d) => ({ x: DIRS[rightOf(d)].x * LANE, z: DIRS[rightOf(d)].z * LANE });
export function entryPoint(node, d) {
  const D = DIRS[d], o = laneOff(d);
  return { x: node.x - D.x * STOP_D + o.x, z: node.z - D.z * STOP_D + o.z };
}
export function exitPoint(node, e) {
  const D = DIRS[e], o = laneOff(e);
  return { x: node.x + D.x * STOP_D + o.x, z: node.z + D.z * STOP_D + o.z };
}
export function turnPoints(node, d, e, n = 10) {
  const a = entryPoint(node, d), b = exitPoint(node, e);
  if (d === e) return [a, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, b];
  const od = laneOff(d), oe = laneOff(e);
  const c = { x: node.x + od.x + oe.x, z: node.z + od.z + oe.z };
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, z: u * u * a.z + 2 * u * t * c.z + t * t * b.z });
  }
  return pts;
}

// 16x16 conflict matrix for movements m = entryDir*4 + exitDir, computed from geometry
function buildConflicts() {
  const node = { x: 0, z: 0 };
  const samples = [];
  for (let m = 0; m < 16; m++) {
    const d = m >> 2, e = m & 3;
    if (e === opposite(d)) { samples.push(null); continue; }
    const pts = turnPoints(node, d, e, 16);
    const dense = [];
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k = 0; k < 4; k++) {
        const t = k / 4;
        dense.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, z: pts[i].z + (pts[i + 1].z - pts[i].z) * t });
      }
    }
    dense.push(pts[pts.length - 1]);
    samples.push(dense);
  }
  const C = [];
  for (let a = 0; a < 16; a++) {
    C.push(new Array(16).fill(false));
    for (let b = 0; b < 16; b++) {
      if (!samples[a] || !samples[b] || (a >> 2) === (b >> 2)) continue;
      let min = 1e9;
      for (const p of samples[a]) for (const q of samples[b]) min = Math.min(min, Math.hypot(p.x - q.x, p.z - q.z));
      C[a][b] = min < 2.7;
    }
  }
  return C;
}

class Path {
  constructor() { this.pts = []; this.cum = []; this.events = []; this.seg = 0; }
  push(p) {
    const n = this.pts.length;
    if (n) {
      const q = this.pts[n - 1];
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d < 0.05) return;
      this.cum.push(this.cum[n - 1] + d);
    } else this.cum.push(0);
    this.pts.push(p);
  }
  get end() { return this.cum[this.cum.length - 1]; }
  get start() { return this.cum[0]; }
  // segment index containing s (searches from a hint)
  find(s) {
    let i = Math.min(this.seg, this.pts.length - 2);
    if (i < 0) return 0;
    while (i > 0 && this.cum[i] > s) i--;
    while (i < this.pts.length - 2 && this.cum[i + 1] < s) i++;
    return i;
  }
  pointAt(s, out = {}) {
    const n = this.pts.length;
    if (n === 1) { out.x = this.pts[0].x; out.z = this.pts[0].z; out.dx = 0; out.dz = 1; return out; }
    s = clamp(s, this.cum[0], this.cum[n - 1]);
    const i = this.find(s);
    const a = this.pts[i], b = this.pts[i + 1];
    const L = this.cum[i + 1] - this.cum[i] || 1;
    const t = (s - this.cum[i]) / L;
    out.x = a.x + (b.x - a.x) * t; out.z = a.z + (b.z - a.z) * t;
    out.dx = (b.x - a.x) / L; out.dz = (b.z - a.z) / L;
    return out;
  }
  // closest point near the current progress
  project(x, z, sHint) {
    const n = this.pts.length;
    let bestS = sHint, bestD = 1e18;
    let i = this.find(sHint - 3);
    for (; i < n - 1; i++) {
      if (this.cum[i] > sHint + 18) break;
      const a = this.pts[i], b = this.pts[i + 1];
      const abx = b.x - a.x, abz = b.z - a.z;
      const L2 = abx * abx + abz * abz || 1;
      let t = ((x - a.x) * abx + (z - a.z) * abz) / L2;
      t = clamp(t, 0, 1);
      const px = a.x + abx * t, pz = a.z + abz * t;
      const d = (x - px) ** 2 + (z - pz) ** 2;
      if (d < bestD) { bestD = d; bestS = this.cum[i] + Math.sqrt(L2) * t; }
    }
    this.seg = this.find(bestS);
    return bestS;
  }
  trim(s) {
    let k = 0;
    while (k < this.pts.length - 2 && this.cum[k + 1] < s - 12) k++;
    if (k > 0) { this.pts.splice(0, k); this.cum.splice(0, k); this.seg = Math.max(0, this.seg - k); }
  }
}

const TMP = {}, TMP2 = {};

export class Traffic {
  constructor(game) {
    this.game = game;
    this.nodes = game.layout.nodes;
    this.occ = this.nodes.map(() => []);
    this.conflict = buildConflicts();
    this.rng = game.rng;
    this.lanes = [];
    for (const A of this.nodes) {
      for (let d = 0; d < 4; d++) {
        if (A.nbr[d] < 0) continue;
        const B = this.nodes[A.nbr[d]];
        const p0 = exitPoint(A, d), p1 = entryPoint(B, d);
        this.lanes.push({ a: A.id, b: B.id, d, x0: p0.x, z0: p0.z, x1: p1.x, z1: p1.z, len: Math.hypot(p1.x - p0.x, p1.z - p0.z) });
      }
    }
  }

  // ---------- path planning ----------
  chooseExit(node, d) {
    const R = this.rng;
    const opts = [];
    const add = (e, w) => { if (node.nbr[e] >= 0) opts.push([e, w]); };
    add(d, 0.5); add(rightOf(d), 0.27); add(leftOf(d), 0.23);
    if (!opts.length) return opposite(d);
    let tot = 0; for (const o of opts) tot += o[1];
    let r = R() * tot;
    for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; }
    return opts[opts.length - 1][0];
  }

  // (v0.9.1) the exit out of intersection B (driving in direction d) that is the shortest way to
  // dest – for a car with somewhere to be (Dahlgren's truck). No U-turns, like everybody else;
  // on a tie straight on first, then right.
  towards(B, d, dest) {
    const D = this.distTo(dest);
    let best = -1, bc = Infinity;
    for (const e of [d, rightOf(d), leftOf(d)]) {
      if (B.nbr[e] < 0) continue;
      const C = this.nodes[B.nbr[e]], ex = C.x - B.x, ez = C.z - B.z, len = Math.hypot(ex, ez);
      const t = ((dest.x - B.x) * ex + (dest.z - B.z) * ez) / (len * len);
      const side = Math.abs((dest.x - B.x) * ez - (dest.z - B.z) * ex) / len;
      const cost = t > 0 && t < 1 && side < 9 ? t * len : len + D[C.id];   // dest on this very street: drive on
      if (cost < bc - 0.01) { bc = cost; best = e; }
    }
    return best >= 0 ? best : this.chooseExit(B, d);
  }

  // distance along the streets from every intersection to the point p (cached for the last p)
  distTo(p) {
    if (this.distP === p) return this.distD;
    const N = this.nodes, D = N.map(() => Infinity), done = N.map(() => false);
    let bd = Infinity;
    for (const A of N) {
      for (let e = 1; e <= 2; e++) {           // east and south: every street once
        if (A.nbr[e] < 0) continue;
        const B = N[A.nbr[e]], ex = B.x - A.x, ez = B.z - A.z, len = Math.hypot(ex, ez);
        const t = clamp(((p.x - A.x) * ex + (p.z - A.z) * ez) / (len * len), 0, 1);
        const d = Math.hypot(A.x + ex * t - p.x, A.z + ez * t - p.z);
        if (d < bd) { bd = d; D.fill(Infinity); D[A.id] = t * len; D[B.id] = (1 - t) * len; }
      }
    }
    for (;;) {
      let u = -1;
      for (let i = 0; i < N.length; i++) if (!done[i] && D[i] < Infinity && (u < 0 || D[i] < D[u])) u = i;
      if (u < 0) break;
      done[u] = true;
      for (const v of N[u].nbr) if (v >= 0) D[v] = Math.min(D[v], D[u] + Math.hypot(N[v].x - N[u].x, N[v].z - N[u].z));
    }
    this.distP = p; this.distD = D;
    return D;
  }

  extend(ai) {
    const path = ai.path;
    while (path.end - ai.s < 70) {
      const d = ai.endDir;
      const B = ai.into != null ? this.nodes[ai.into] : this.nodes[this.nodes[ai.endNode].nbr[d]];
      ai.into = null;
      const e = ai.dest ? this.towards(B, d, ai.dest) : this.chooseExit(B, d);
      const pts = turnPoints(B, d, e);
      path.push(pts[0]);
      const sStop = path.end;
      for (let i = 1; i < pts.length; i++) path.push(pts[i]);
      path.events.push({ node: B.id, m: d * 4 + e, turn: d !== e, right: e === rightOf(d), sStop, sExit: path.end, reserved: false });
      ai.endNode = B.id; ai.endDir = e;
    }
  }

  // put a car on a lane at fraction t (snap=true for fresh spawns)
  attach(car, lane, t, snap = true) {
    const x = lane.x0 + (lane.x1 - lane.x0) * t, z = lane.z0 + (lane.z1 - lane.z0) * t;
    const path = new Path();
    path.push({ x, z });
    const prev = car.ai;
    car.ai = {
      path, s: 0, endNode: lane.a, endDir: lane.d,
      cruise: prev && prev.cruise ? prev.cruise : this.rng.range(10.5, 13.5), latOff: 0, latTarget: 0,
      blockedT: 0, honkT: this.rng.range(1, 3), stuckT: 0, reverseT: 0, waitT: 0, lostT: 0, lost: false,
      blocker: null, recovering: false, recoverT: 0, replans: prev ? prev.replans || 0 : 0,
      dest: prev ? prev.dest || null : null,   // (still on its way somewhere after being pushed off its lane)
    };
    this.extend(car.ai);
    car.driver = 'ai';
    car.steerFade = 30;
    if (snap) {
      car.x = x; car.z = z;
      car.h = Math.atan2(lane.x1 - lane.x0, lane.z1 - lane.z0);
    }
  }

  // (v0.9.1) a car that is not on a lane – Dahlgren's truck coming off the north bridge – joins the
  // traffic: straight on to the stop line of intersection `into` (driving in direction dir), and from
  // there the shortest way to dest. It waits its turn at the intersections like everybody else
  // (no random draws here: the game's random sequence stays as it was).
  join(car, into, dir, dest, cruise) {
    this.release(car);
    const path = new Path();
    path.push({ x: car.x, z: car.z });
    car.ai = {
      path, s: 0, endNode: into, endDir: dir, into, dest, cruise, latOff: 0, latTarget: 0,
      blockedT: 0, honkT: 2, stuckT: 0, reverseT: 0, waitT: 0, lostT: 0, lost: false,
      blocker: null, recovering: false, recoverT: 0, replans: 0,
    };
    this.extend(car.ai);
    car.driver = 'ai'; car.racer = null; car.steerFade = 30; car.parkedSpot = false;
    car.input.park = false; car.input.handbrake = false;
  }

  release(car) {
    if (!car.ai) return;
    if (car.ai.path) for (const ev of car.ai.path.events) if (ev.reserved) this.unreserve(ev.node, car);
    car.ai = null;
  }

  unreserve(nodeId, car) {
    const list = this.occ[nodeId];
    for (let i = list.length - 1; i >= 0; i--) if (list[i].car === car) list.splice(i, 1);
  }

  canEnter(nodeId, car, m) {
    for (const o of this.occ[nodeId]) {
      if (o.car === car) continue;
      if (this.conflict[o.m][m]) return false;
    }
    return true;
  }

  // nearest lane to a world position with heading alignment
  nearestLane(x, z, h, maxDist = 12) {
    const fx = Math.sin(h), fz = Math.cos(h);
    let best = null, bestScore = 1e9;
    for (const L of this.lanes) {
      const dx = L.x1 - L.x0, dz = L.z1 - L.z0;
      const t = clamp(((x - L.x0) * dx + (z - L.z0) * dz) / (L.len * L.len), 0, 1);
      const px = L.x0 + dx * t, pz = L.z0 + dz * t;
      const dist = Math.hypot(x - px, z - pz);
      if (dist > maxDist) continue;
      const align = (fx * dx + fz * dz) / L.len;
      const score = dist + (1 - align) * 5;
      if (score < bestScore) { bestScore = score; best = { lane: L, t: Math.min(t, 0.97) }; }
    }
    return best;
  }

  replan(car) {
    const prev = car.ai;
    if (prev && prev.path) for (const ev of prev.path.events) if (ev.reserved) this.unreserve(ev.node, car);
    const found = this.nearestLane(car.x, car.z, car.h);
    if (!found) {
      car.ai = { lost: true, lostT: 0, path: null, cruise: prev ? prev.cruise : 12, dest: prev ? prev.dest || null : null };
      car.driver = 'ai';
      return false;
    }
    car.ai = prev;
    this.attach(car, found.lane, found.t, false);
    car.ai.recovering = true;
    car.ai.recoverT = 0;
    car.ai.replans++;
    return true;
  }

  // ---------- per-step AI ----------
  update(dt, cars, obstacles) {
    for (const car of cars) {
      if (car.driver !== 'ai' || !car.ai) continue;
      if (car.ai.lost) { this.lostStep(car, dt); continue; }
      this.drive(car, dt, obstacles);
    }
  }

  lostStep(car, dt) {
    car.input.throttle = 0; car.input.steer = 0; car.input.park = true;
    car.ai.lostT += dt;
    if (car.ai.lostT > 2 && car.speed < 1) {
      // try again to find a road
      if (this.nearestLane(car.x, car.z, car.h, 9)) this.replan(car);
    }
  }

  drive(car, dt, obstacles) {
    const ai = car.ai, path = ai.path, inp = car.input;
    if (ai.hold) { inp.throttle = 0; inp.steer = 0; inp.park = true; inp.handbrake = false; return; }
    const speed = car.fwdSpeed;
    ai.s = path.project(car.x, car.z, ai.s);
    path.trim(ai.s);
    this.extend(ai);

    // off the path? (pushed by a crash) → replan onto the nearest lane
    const here = path.pointAt(ai.s, TMP);
    const off = Math.hypot(car.x - here.x, car.z - here.z);
    const align = Math.sin(car.h) * here.dx + Math.cos(car.h) * here.dz;
    if (ai.recovering) {
      ai.recoverT += dt;
      if (off < 2.5 && align > 0.7) ai.recovering = false;
      else if (ai.recoverT > 9) { this.replan(car); if (car.ai.lost) return; car.ai.recoverT = 0; }
    } else if (off > 6.5 || (align < -0.3 && Math.abs(speed) < 3)) {
      if (!this.replan(car)) return;
      this.drive(car, dt, obstacles);
      return;
    }

    // ---------- intersections ----------
    let vLimit = ai.cruise;
    for (let i = 0; i < path.events.length; i++) {
      const ev = path.events[i];
      if (ai.s > ev.sExit + 1.5) {
        if (ev.reserved) this.unreserve(ev.node, car);
        path.events.splice(i, 1); i--;
        continue;
      }
      const toStop = ev.sStop - ai.s;
      if (ev.turn) {
        const vt = ev.right ? 5.6 : 6.8;
        const dTurn = Math.max(0, toStop);
        vLimit = Math.min(vLimit, Math.sqrt(vt * vt + 2 * 3.2 * dTurn));
      }
      if (!ev.reserved) {
        const look = 6 + (speed * speed) / (2 * 4.5);
        if (toStop < look) {
          const forced = ai.waitT > 7;
          if (this.canEnter(ev.node, car, ev.m) || forced) {
            ev.reserved = true;
            this.occ[ev.node].push({ car, m: ev.m });
            ai.waitT = 0;
          } else {
            const d = toStop - car.spec.len / 2 - 0.3;
            vLimit = Math.min(vLimit, d <= 0.1 ? 0 : Math.sqrt(2 * 4.0 * d));
            if (speed < 0.5) ai.waitT += dt;
          }
        }
        break; // only the next unreserved intersection matters
      }
    }

    // ---------- obstacles along the path ----------
    const lookDist = clamp(7 + Math.abs(speed) * 1.7, 9, 32);
    let gap = 99, blocker = null;
    const latOff = ai.latOff;
    for (let ds = 2.6; ds <= lookDist; ds += 2.4) {
      const p = path.pointAt(ai.s + ds, TMP2);
      const px = p.x + p.dz * latOff, pz = p.z - p.dx * latOff;
      for (const o of obstacles) {
        if (o.ref === car) continue;
        const dx = o.x - px, dz = o.z - pz;
        if (dx > 4 || dx < -4 || dz > 4 || dz < -4) continue;
        const lim = o.r + 1.05;
        if (dx * dx + dz * dz < lim * lim) {
          if (ds < gap) { gap = ds; blocker = o; }
        }
      }
      if (blocker) break;
    }
    ai.blocker = blocker;
    if (blocker) {
      const vFollow = Math.max(0, (gap - 3.2) * 1.15);
      const vB = blocker.v || 0;
      vLimit = Math.min(vLimit, Math.max(vFollow, Math.min(vB, vFollow + 2)));
      if (gap < 3.6) vLimit = 0;
    }

    // blocked handling: honk at the player, overtake abandoned cars, give up and recover
    const stoppedByBlocker = blocker && Math.abs(speed) < 0.6 && gap < 9;
    if (stoppedByBlocker) {
      ai.blockedT += dt;
      if (blocker.kind === 'player' || blocker.kind === 'playercar') {
        ai.honkT -= dt;
        if (ai.blockedT > 1.4 && ai.honkT <= 0) {
          ai.honkT = this.rng.range(2.2, 4.0);
          this.game.emit('honk', { car, at: blocker.kind });
        }
      }
      const abandoned = blocker.kind === 'parked' || (blocker.kind === 'playercar' && ai.blockedT > 5) || (blocker.kind === 'car' && blocker.stuck);
      if (abandoned && ai.blockedT > 2.2 && ai.latTarget === 0 && this.oncomingClear(car, ai)) {
        ai.latTarget = 5.0;
        ai.passT = 0;
      }
    } else {
      ai.blockedT = Math.max(0, ai.blockedT - dt * 2);
    }
    if (ai.latTarget !== 0) {
      ai.passT = (ai.passT || 0) + dt;
      if ((!blocker && ai.passT > 2.5) || ai.passT > 12) ai.latTarget = 0;
    }
    ai.latOff += clamp(ai.latTarget - ai.latOff, -2.2 * dt, 2.2 * dt);

    // ---------- steering: pure pursuit ----------
    const Ld = clamp(3.6 + Math.abs(speed) * 0.45, 4.5, 10);
    const tp = path.pointAt(ai.s + Ld, TMP2);
    const tx = tp.x + tp.dz * ai.latOff, tz = tp.z - tp.dx * ai.latOff;
    const sn = Math.sin(car.h), cs = Math.cos(car.h);
    const dx = tx - car.x, dz = tz - car.z;
    const lf = dx * sn + dz * cs;
    const lr = -dx * cs + dz * sn;
    const alpha = Math.atan2(lr, Math.max(lf, 0.5));
    const delta = Math.atan((2 * car.spec.wheelbase * Math.sin(alpha)) / Ld);
    const sf = 1 / (1 + Math.abs(speed) / car.steerFade);
    let steer = clamp(delta / (car.spec.steerMax * sf), -1, 1);

    // ---------- throttle ----------
    let throttle;
    const vTarget = Math.max(0, vLimit);
    if (ai.reverseT > 0) {
      ai.reverseT -= dt;
      throttle = -0.7; steer = -steer;
      inp.park = false;
    } else if (vTarget < 0.25 && speed < 0.8) {
      throttle = 0; inp.park = true;
    } else {
      inp.park = false;
      const err = vTarget - speed;
      throttle = clamp(err * 0.55, -1, 1);
      if (err > 0 && throttle < 0.25) throttle = Math.max(throttle, 0.25 * Math.min(1, err));
    }

    // stuck detection (wants to go but doesn't move, e.g. wedged after a crash)
    if (vTarget > 2 && Math.abs(speed) < 0.4 && !blocker && ai.reverseT <= 0) {
      ai.stuckT += dt;
      if (ai.stuckT > 2.5) { ai.reverseT = 1.4; ai.stuckT = 0; ai.unstuck = (ai.unstuck || 0) + 1; }
    } else ai.stuckT = Math.max(0, ai.stuckT - dt);

    inp.throttle = throttle;
    inp.steer = steer;
    inp.handbrake = false;
  }

  oncomingClear(car, ai) {
    const path = ai.path;
    for (const other of this.game.vehicles) {
      if (other === car || other.driver !== 'ai') continue;
      for (let ds = 4; ds < 40; ds += 4) {
        const p = path.pointAt(ai.s + ds, TMP2);
        const px = p.x + p.dz * 5, pz = p.z - p.dx * 5;
        if ((other.x - px) ** 2 + (other.z - pz) ** 2 < 9) return false;
      }
    }
    return true;
  }
}
