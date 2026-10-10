// Sander the bike thief (v1.0): rides a bike along the town's pavements – the corners of the nine
// blocks, joined along each side and across each street at the zebra crossings – and away from you.
// He keeps to the pavement line (the lamps are just beside it), slows for the corners, rings his bell
// at people in the way (they jump), teases you when you fall behind, and backs out if he gets wedged.
import { clamp, wrapAngle } from './rng.js';
import { BIKE_GEO } from './vehicle.js';

// the pavement graph: { nodes: [{ x, z, adj: [ids] }], segs: [[a, b], …] }
export function pavementGraph(layout) {
  const loops = layout.loops.filter((l) => !l.outer && l.z0 > -130 && l.z1 < 130);
  const nodes = [];
  const link = (a, b) => { if (!nodes[a].adj.includes(b)) { nodes[a].adj.push(b); nodes[b].adj.push(a); } };
  for (const L of loops) {
    const i = nodes.length;
    for (const [x, z] of [[L.x0, L.z0], [L.x1, L.z0], [L.x1, L.z1], [L.x0, L.z1]]) nodes.push({ x, z, adj: [] });
    link(i, i + 1); link(i + 1, i + 2); link(i + 2, i + 3); link(i + 3, i);
  }
  // across the streets: side by side (east–west) and above each other (north–south)
  loops.forEach((A, a) => loops.forEach((B, b) => {
    const ia = a * 4, ib = b * 4;
    if (Math.abs(A.z0 - B.z0) < 0.5 && Math.abs(A.z1 - B.z1) < 0.5 && Math.abs(B.x0 - A.x1 - 13) < 1.5) { link(ia + 1, ib); link(ia + 2, ib + 3); }
    if (Math.abs(A.x0 - B.x0) < 0.5 && Math.abs(A.x1 - B.x1) < 0.5 && Math.abs(B.z0 - A.z1 - 13) < 1.5) { link(ia + 3, ib); link(ia + 2, ib + 1); }
  }));
  const segs = [];
  nodes.forEach((n, i) => { for (const j of n.adj) if (j > i) segs.push([i, j]); });
  return { nodes, segs };
}

// the nearest point on the pavement graph: { a, b, t, px, pz, d }
export function nearestPavement(G, x, z) {
  let best = null;
  for (const [a, b] of G.segs) {
    const A = G.nodes[a], B = G.nodes[b], dx = B.x - A.x, dz = B.z - A.z, l2 = dx * dx + dz * dz;
    const t = clamp(((x - A.x) * dx + (z - A.z) * dz) / l2, 0, 1);
    const px = A.x + dx * t, pz = A.z + dz * t, d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d) best = { a, b, t, px, pz, d };
  }
  return best;
}

export class Rider {
  constructor(game, bike, ped, o = {}) {
    this.game = game; this.bike = bike; this.ped = ped;
    this.G = game.pavements || (game.pavements = pavementGraph(game.layout));
    this.vMax = o.vMax ?? 8.4; this.slow = o.slow ?? 6.6; this.corner = o.corner ?? 4.0;
    this.path = o.exit ? [[bike.x, bike.z], ...o.exit.map(([x, z]) => [x, z])] : []; // a way out first (from somewhere off the pavements)
    this.pi = 0;
    this.exiting = this.path.length > 0;   // (on the way out: no new routes until he is on the pavement)
    this.goal = null; this.planT = 0;
    this.revT = 0; this.stuckT = 0; this.bellT = 0; this.tauntT = 3;
    this.on = true;
    bike.driver = 'racer'; bike.racer = null; bike.ai = null; bike.parkedSpot = false; bike.locked = true;
    bike.steerFade = 30; bike.input.park = false; bike.coastT = 0; bike.fallen = false;
    ped.state = 'ride'; ped.keep = true;
    this.pose(0);
  }

  // where you are (or your car)
  you() { const p = this.game.player; return p.inCar ? p.car : p; }

  update(dt) {
    if (!this.on) return;
    const g = this.game, bike = this.bike, inp = bike.input;
    if (bike.removed) { this.on = false; return; }
    const Y = this.you();
    // a new route now and then: when the way out is ridden, at the goal, every few seconds, or when you are in the way
    this.planT -= dt;
    // (the next route is planned before he gets to the end of this one, so he can slow for the corner there)
    if (this.exiting) {
      const e = this.path[this.path.length - 1];
      if (Math.hypot(e[0] - bike.x, e[1] - bike.z) < 4) this.exiting = false;
    } else {
      const nearEnd = !this.path.length || (this.remaining() < 24 && this.planT < 4.5);
      if (nearEnd || this.planT <= 0 || this.blocked(Y)) this.plan(Y);
    }
    const P = this.path;
    if (!P.length) { inp.throttle = 0; inp.park = true; return; }
    inp.park = false;
    const speed = bike.fwdSpeed, sn = Math.sin(bike.h), cs = Math.cos(bike.h);
    const la = this.lookahead(clamp(2.4 + Math.abs(speed) * 0.3, 2.6, 5.0));
    // flat out on the straight, slower when you are far behind (he wants you to see him), slow round corners
    const dY = Math.hypot(Y.x - bike.x, Y.z - bike.z);
    let v = dY > 55 ? this.slow : this.vMax;
    v = Math.min(v, this.cornerSpeed());
    // pure pursuit toward the point ahead
    const dx = la.x - bike.x, dz = la.z - bike.z, dist = Math.hypot(dx, dz) || 1;
    const lf = dx * sn + dz * cs, lr = -dx * cs + dz * sn;
    const alpha = Math.atan2(lr, Math.max(lf, 0.4));
    const delta = Math.atan((2 * bike.spec.wheelbase * Math.sin(alpha)) / Math.max(2.2, dist));
    const sf = 1 / (1 + Math.abs(speed) / bike.steerFade);
    let steer = clamp(delta / (bike.spec.steerMax * sf), -1, 1);
    if (lf < 0) v = Math.min(v, 2.5);
    if (this.revT > 0) { this.revT -= dt; inp.throttle = -0.8; inp.steer = -steer; return; }
    const err = v - speed;
    let thr = clamp(err * 0.6, -1, 1);
    if (err > 1.5) thr = 1;
    inp.throttle = thr; inp.steer = steer;
    // wedged against something: back out a little and think again
    if (v > 2 && Math.abs(speed) < 0.4) { if ((this.stuckT += dt) > 1.0) { this.revT = 0.8; this.stuckT = 0; this.planT = 0.9; } }
    else this.stuckT = Math.max(0, this.stuckT - dt);
    this.clearWay(dt);
    this.taunt(dt, dY);
  }

  // you right in front of him on his way: time for another way
  blocked(Y) {
    const bike = this.bike, dx = Y.x - bike.x, dz = Y.z - bike.z;
    const f = dx * Math.sin(bike.h) + dz * Math.cos(bike.h), l = Math.abs(-dx * Math.cos(bike.h) + dz * Math.sin(bike.h));
    if (f > 1 && f < 9 && l < 2.2 && this.planT < 4.2) return true;
    return false;
  }

  // somewhere to ride to: a corner well away from you (and not straight past you), the way there along the pavements
  plan(Y) {
    const g = this.game, G = this.G, bike = this.bike, R = g.rng;
    this.planT = 5;
    const N = G.nodes;
    let best = -1, bs = -1e9;
    for (let i = 0; i < N.length; i++) {
      const n = N[i], dr = Math.hypot(n.x - bike.x, n.z - bike.z), dp = Math.hypot(n.x - Y.x, n.z - Y.z);
      if (dr < 30 || dr > 160) continue;
      const s = dp - 0.45 * dr + R() * 30;
      if (s > bs) { bs = s; best = i; }
    }
    if (best < 0) return;
    const route = this.route(best, Y);
    if (route.length) { this.path = route; this.pi = 0; this.goal = best; }
  }

  // Dijkstra along the pavements from where the bike is to node `to`; corners near you cost extra
  route(to, Y) {
    const G = this.G, N = G.nodes, bike = this.bike;
    const s = nearestPavement(G, bike.x, bike.z);
    if (!s) return [];
    const n = N.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    const near = (i) => (Math.hypot(N[i].x - Y.x, N[i].z - Y.z) < 22 ? 80 : 0);
    // which way along his side: the end he is heading for is cheaper (no U-turns on the spot)
    const A = N[s.a], B = N[s.b];
    const toB = (B.x - A.x) * Math.sin(bike.h) + (B.z - A.z) * Math.cos(bike.h) > 0;
    const segLen = Math.hypot(B.x - A.x, B.z - A.z);
    dist[s.a] = s.t * segLen + (toB ? 400 : 0) + near(s.a);  // (turning round on a pavement takes him out into the street)
    dist[s.b] = (1 - s.t) * segLen + (toB ? 0 : 400) + near(s.b);
    const ahead = toB ? s.b : s.a, behind = toB ? s.a : s.b;   // … and so does riding to the corner and straight back
    for (;;) {
      let u = -1, du = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < du) { du = dist[i]; u = i; }
      if (u < 0 || u === to) break;
      done[u] = 1;
      for (const v of N[u].adj) {
        if (u === ahead && v === behind) continue;
        const d = du + Math.hypot(N[v].x - N[u].x, N[v].z - N[u].z) + near(v);
        if (d < dist[v]) { dist[v] = d; prev[v] = u; }
      }
    }
    if (!isFinite(dist[to])) return [];
    const pts = [];
    for (let v = to; v !== -1; v = prev[v]) pts.unshift([N[v].x, N[v].z]);
    return [[bike.x, bike.z], [s.px, s.pz], ...pts];
  }

  // how much of the route is left
  remaining() {
    const P = this.path, bike = this.bike;
    if (P.length < 2) return 0;
    const i = Math.min(this.pi + 1, P.length - 1);
    let d = Math.hypot(P[i][0] - bike.x, P[i][1] - bike.z);
    for (let k = i; k < P.length - 1; k++) d += Math.hypot(P[k + 1][0] - P[k][0], P[k + 1][1] - P[k][1]);
    return d;
  }

  // the point `Ld` metres further along the route than the bike
  lookahead(Ld) {
    const P = this.path, bike = this.bike;
    let best = this.pi, bd = Infinity, bt = 0;
    for (let i = this.pi; i < Math.min(P.length - 1, this.pi + 3); i++) {
      const a = P[i], b = P[i + 1], abx = b[0] - a[0], abz = b[1] - a[1], l2 = abx * abx + abz * abz || 1e-6;
      const t = clamp(((bike.x - a[0]) * abx + (bike.z - a[1]) * abz) / l2, 0, 1);
      const d = Math.hypot(a[0] + abx * t - bike.x, a[1] + abz * t - bike.z);
      if (d < bd) { bd = d; best = i; bt = t; }
    }
    this.pi = best;
    let i = best, t = bt, left = Ld;
    while (i < P.length - 1) {
      const a = P[i], b = P[i + 1], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const rem = seg * (1 - t);
      if (rem >= left && seg > 1e-6) { const f = t + left / seg; return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f }; }
      left -= rem; i++; t = 0;
    }
    const e = P[P.length - 1];
    return { x: e[0], z: e[1] };
  }

  // slow enough for the corners coming up (about 4 m/s round a right angle)
  cornerSpeed() {
    const P = this.path, bike = this.bike;
    let v = this.vMax, acc = 0, px = bike.x, pz = bike.z;
    for (let i = this.pi + 1; i < P.length - 1 && acc < 30; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1];
      acc += Math.hypot(b[0] - px, b[1] - pz); px = b[0]; pz = b[1];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.4 || Math.hypot(c[0] - b[0], c[1] - b[1]) < 0.4) continue;
      const turn = Math.abs(wrapAngle(Math.atan2(c[0] - b[0], c[1] - b[1]) - Math.atan2(b[0] - a[0], b[1] - a[1])));
      if (turn < 0.25) continue;
      const vc = clamp(this.corner * Math.sqrt(1.57 / Math.max(0.3, turn)), 2.4, this.vMax);
      v = Math.min(v, Math.sqrt(vc * vc + 2 * 4.5 * acc));
    }
    return v;
  }

  // people on the pavement ahead: the bell, and they jump aside
  clearWay(dt) {
    const g = this.game, bike = this.bike, sn = Math.sin(bike.h), cs = Math.cos(bike.h);
    const Y = this.you(), hear = Math.hypot(Y.x - bike.x, Y.z - bike.z) < 30;
    this.bellT -= dt;
    for (const q of g.peds.list) {
      if (q === this.ped || q.state === 'down' || q.state === 'getup' || q.state === 'dodge' || q.state === 'lounge' || q.state === 'ride') continue;
      const dx = q.x - bike.x, dz = q.z - bike.z, f = dx * sn + dz * cs;
      if (f < 0.5 || f > 6.5) continue;
      const l = -dx * cs + dz * sn;
      if (Math.abs(l) > 1.3) continue;
      const side = l >= 0 ? 1 : -1;
      q.vx = -cs * side * 4.5; q.vz = sn * side * 4.5;   // (to his right if they are on the right, and the other way)
      q.state = 'dodge'; q.stateT = 0;
      if (this.bellT <= 0 && hear) { this.bellT = 1.4; g.emit('horn', { on: true, car: bike }); g.emit('horn', { on: false, car: bike }); }
    }
  }

  // a word over his shoulder when you are close behind
  taunt(dt, dY) {
    if ((this.tauntT -= dt) > 0 || dY > 45 || dY < 4) return;
    const g = this.game;
    this.tauntT = 4 + g.rng() * 3;
    g.emit('say', { who: this.ped, text: ['Kom igen då!', 'Bullarna är mina!', 'Du får aldrig tag på mig!', 'Mums, kanelbulle!', 'Pling pling!', 'Snyggt försök!'][Math.floor(g.rng() * 6)] });
  }

  // Sander on the saddle, pedalling, leaning into the turns (like you on a bike: player.js). The job
  // calls this after the physics step, so he sits where the bike is now.
  pose(dt) {
    const bike = this.bike, ped = this.ped, b = ped.body, G = BIKE_GEO;
    bike.lean = (bike.lean || 0) + (clamp(-bike.accLat * 0.05, -0.42, 0.42) - (bike.lean || 0)) * Math.min(1, dt * 6);
    const sn = Math.sin(bike.h), cs = Math.cos(bike.h);
    ped.x = bike.x + sn * G.saddle[2]; ped.z = bike.z + cs * G.saddle[2];
    ped.y = bike.y + G.saddle[1] + 0.03 - 0.92 * (b.look.height || 1);
    ped.h = bike.h; ped.vx = bike.vx; ped.vz = bike.vz;
    b.pose = 6; b.roll = bike.lean || 0; b.lean = 0; b.lie = 0;
    if (bike.input.throttle > 0.05) b.phase += (1.2 + Math.max(0, bike.fwdSpeed)) * dt * 1.5;
    b.x = ped.x; b.y = ped.y; b.z = ped.z; b.h = ped.h;
  }

  // knocked off (or grabbed): the bike falls over, Sander tumbles off
  fall(vx, vz) {
    const g = this.game, bike = this.bike, ped = this.ped;
    this.on = false;
    bike.driver = null; bike.racer = null; bike.locked = false; bike.fallen = true; bike.coastT = 1.5;
    bike.input.throttle = 0; bike.input.steer = 0; bike.input.park = false; bike.lean = 0;
    ped.body.roll = 0; ped.body.pose = 0;
    ped.y = g.world.groundHeight(ped.x, ped.z);
    ped.state = 'walk'; // (so knock() takes)
    ped.knock(vx, vz, 4);
    ped.downFor = 1.6;
  }
}
