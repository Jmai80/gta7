// Static collision world: uniform grid of colliders + ground height (roads, curbs, ramps).
import { CURB_H } from './config.js';
import { onRoad, onIsland } from './layout.js';

export class CollisionWorld {
  constructor(layout, cell = 8) {
    this.cell = cell;
    this.min = -280;
    this.n = Math.ceil(560 / cell);
    this.cells = new Array(this.n * this.n);
    this.cols = layout.colliders;
    this.ramps = layout.ramps;
    this.stamp = new Uint32Array(this.cols.length);
    this.stampId = 1;
    this.out = [];
    this.cols.forEach((c, i) => {
      const b = bounds(c);
      c.bx0 = b[0]; c.bz0 = b[1]; c.bx1 = b[2]; c.bz1 = b[3];
      const [i0, j0] = this.idx(b[0], b[1]);
      const [i1, j1] = this.idx(b[2], b[3]);
      for (let j = j0; j <= j1; j++) for (let k = i0; k <= i1; k++) {
        const id = j * this.n + k;
        (this.cells[id] || (this.cells[id] = [])).push(i);
      }
    });
    this.lastRamp = null;
  }

  idx(x, z) {
    const i = Math.max(0, Math.min(this.n - 1, Math.floor((x - this.min) / this.cell)));
    const j = Math.max(0, Math.min(this.n - 1, Math.floor((z - this.min) / this.cell)));
    return [i, j];
  }

  // colliders whose bounds touch the circle; returns a reused array
  query(x, z, r) {
    const out = this.out;
    out.length = 0;
    const s = ++this.stampId;
    const i0 = Math.max(0, Math.floor((x - r - this.min) / this.cell));
    const i1 = Math.min(this.n - 1, Math.floor((x + r - this.min) / this.cell));
    const j0 = Math.max(0, Math.floor((z - r - this.min) / this.cell));
    const j1 = Math.min(this.n - 1, Math.floor((z + r - this.min) / this.cell));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const list = this.cells[j * this.n + i];
        if (!list) continue;
        for (const ci of list) {
          if (this.stamp[ci] === s) continue;
          this.stamp[ci] = s;
          const c = this.cols[ci];
          if (x + r < c.bx0 || x - r > c.bx1 || z + r < c.bz0 || z - r > c.bz1) continue;
          out.push(c);
        }
      }
    }
    return out;
  }

  groundHeight(x, z) {
    this.lastRamp = null;
    for (const r of this.ramps) {
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
        const t = r.axis === 'z' ? (z - r.z0) / (r.z1 - r.z0) : (x - r.x0) / (r.x1 - r.x0);
        this.lastRamp = r;
        return r.h0 + t * (r.h1 - r.h0);
      }
    }
    if (onRoad(x, z)) return 0;
    if (onIsland(x, z)) return CURB_H;
    return -3;
  }

  // segment test used by the camera: returns fraction [0..1] of the first hit with a tall collider
  raycast(ax, az, bx, bz, minH = 2.5) {
    let best = 1;
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    const steps = Math.ceil(len / this.cell) + 1;
    const seen = ++this.stampId;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const [ci, cj] = this.idx(ax + dx * t, az + dz * t);
      for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
        if (i < 0 || j < 0 || i >= this.n || j >= this.n) continue;
        const list = this.cells[j * this.n + i];
        if (!list) continue;
        for (const idx of list) {
          if (this.stamp[idx] === seen) continue;
          this.stamp[idx] = seen;
          const c = this.cols[idx];
          if (c.h < minH || c.t === 'circle') continue;
          const hit = segBox(ax, az, dx, dz, c);
          if (hit !== null && hit < best) best = hit;
        }
      }
    }
    return best;
  }
}

function bounds(c) {
  if (c.t === 'box') return [c.x0, c.z0, c.x1, c.z1];
  if (c.t === 'circle') return [c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r];
  const e = Math.hypot(c.hx, c.hz);
  return [c.cx - e, c.cz - e, c.cx + e, c.cz + e];
}

// slab test against an axis aligned (or oriented) box, returns t of entry or null
function segBox(ax, az, dx, dz, c) {
  let x0, z0, x1, z1, px = ax, pz = az, vx = dx, vz = dz;
  if (c.t === 'obox') {
    const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
    const rx = ax - c.cx, rz = az - c.cz;
    px = rx * cs - rz * sn; pz = rx * sn + rz * cs;
    vx = dx * cs - dz * sn; vz = dx * sn + dz * cs;
    x0 = -c.hx; x1 = c.hx; z0 = -c.hz; z1 = c.hz;
  } else { x0 = c.x0; x1 = c.x1; z0 = c.z0; z1 = c.z1; }
  let tmin = 0, tmax = 1;
  for (const [p, v, lo, hi] of [[px, vx, x0, x1], [pz, vz, z0, z1]]) {
    if (Math.abs(v) < 1e-9) { if (p < lo || p > hi) return null; continue; }
    let t0 = (lo - p) / v, t1 = (hi - p) / v;
    if (t0 > t1) { const t = t0; t0 = t1; t1 = t; }
    tmin = Math.max(tmin, t0); tmax = Math.min(tmax, t1);
    if (tmin > tmax) return null;
  }
  return tmin;
}

// Circle vs collider. Returns {nx, nz, depth} (normal points out of the collider) or null.
const RES = { nx: 0, nz: 0, depth: 0 };
export function circleVs(c, x, z, r) {
  if (c.t === 'circle') {
    const dx = x - c.x, dz = z - c.z;
    const d2 = dx * dx + dz * dz, rr = r + c.r;
    if (d2 >= rr * rr) return null;
    const d = Math.sqrt(d2) || 1e-6;
    RES.nx = dx / d; RES.nz = dz / d; RES.depth = rr - d;
    return RES;
  }
  if (c.t === 'box') return circleBox(x, z, r, c.x0, c.z0, c.x1, c.z1);
  // oriented box: rotate into local frame (local x = (cos,-sin), local z = (sin,cos))
  const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  const rx = x - c.cx, rz = z - c.cz;
  const lx = rx * cs - rz * sn, lz = rx * sn + rz * cs;
  const res = circleBox(lx, lz, r, -c.hx, -c.hz, c.hx, c.hz);
  if (!res) return null;
  const nx = res.nx * cs + res.nz * sn, nz = -res.nx * sn + res.nz * cs;
  res.nx = nx; res.nz = nz;
  return res;
}

function circleBox(x, z, r, x0, z0, x1, z1) {
  const qx = x < x0 ? x0 : x > x1 ? x1 : x;
  const qz = z < z0 ? z0 : z > z1 ? z1 : z;
  const dx = x - qx, dz = z - qz;
  const d2 = dx * dx + dz * dz;
  if (d2 > 1e-10) {
    if (d2 >= r * r) return null;
    const d = Math.sqrt(d2);
    RES.nx = dx / d; RES.nz = dz / d; RES.depth = r - d;
    return RES;
  }
  // center inside: push out along the shallowest axis
  const pl = x - x0, pr = x1 - x, pt = z - z0, pb = z1 - z;
  const m = Math.min(pl, pr, pt, pb);
  if (m === pl) { RES.nx = -1; RES.nz = 0; } else if (m === pr) { RES.nx = 1; RES.nz = 0; }
  else if (m === pt) { RES.nx = 0; RES.nz = -1; } else { RES.nx = 0; RES.nz = 1; }
  RES.depth = m + r;
  return RES;
}
