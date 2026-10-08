// Tiny geometry builder: non-indexed, flat-shaded triangles with per-vertex
// color (linear), material code and facade UVs. Everything static is merged with it.

const lin = new Map();
export function toLinear(hex) {
  let c = lin.get(hex);
  if (c) return c;
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  c = [f((hex >> 16) & 255), f((hex >> 8) & 255), f(hex & 255)];
  lin.set(hex, c);
  return c;
}

export class GeomBuilder {
  constructor(extra = []) {
    this.pos = []; this.nrm = []; this.col = []; this.uv = []; this.mat = [];
    this.extraNames = extra;          // e.g. [['aBone',1],['aPivot',3]]
    this.extra = {};
    for (const [n] of extra) this.extra[n] = [];
    this.cur = {};                     // current values for extra attributes
  }

  get count() { return this.pos.length / 3; }

  vert(x, y, z, nx, ny, nz, c, u, v, m) {
    this.pos.push(x, y, z);
    this.nrm.push(nx, ny, nz);
    this.col.push(c[0], c[1], c[2]);
    this.uv.push(u, v);
    this.mat.push(m);
    for (const [n, size] of this.extraNames) {
      const val = this.cur[n];
      if (size === 1) this.extra[n].push(val ?? 0);
      else for (let i = 0; i < size; i++) this.extra[n].push(val ? val[i] : 0);
    }
  }

  // triangle; if `expect` normal is given, winding is fixed to face it
  tri(a, b, c, hex, m = 0, ua = [0, 0], ub = [0, 0], uc = [0, 0], expect = null) {
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    let vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    if (expect && nx * expect[0] + ny * expect[1] + nz * expect[2] < 0) {
      // swap b and c
      const t = b; b = c; c = t;
      const tu = ub; ub = uc; uc = tu;
      nx = -nx; ny = -ny; nz = -nz;
    }
    const col = toLinear(hex);
    this.vert(a[0], a[1], a[2], nx, ny, nz, col, ua[0], ua[1], m);
    this.vert(b[0], b[1], b[2], nx, ny, nz, col, ub[0], ub[1], m);
    this.vert(c[0], c[1], c[2], nx, ny, nz, col, uc[0], uc[1], m);
  }

  quad(a, b, c, d, hex, m = 0, uvs = null, expect = null) {
    const U = uvs || [[0, 0], [0, 1], [1, 1], [1, 0]];
    if (expect) {
      // decide winding once for the whole quad so both triangles agree
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * expect[0] + ny * expect[1] + nz * expect[2] < 0) {
        this.tri(a, d, c, hex, m, U[0], U[3], U[2]);
        this.tri(a, c, b, hex, m, U[0], U[2], U[1]);
        return;
      }
    }
    this.tri(a, b, c, hex, m, U[0], U[1], U[2]);
    this.tri(a, c, d, hex, m, U[0], U[2], U[3]);
  }

  // triangle with its own normal and colour per corner (smooth shading, gradients); colours are
  // linear rgb arrays. The winding is fixed to agree with the normals.
  triN(a, b, c, na, nb, nc, ca, cb, cc, m = 0) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (fx * (na[0] + nb[0] + nc[0]) + fy * (na[1] + nb[1] + nc[1]) + fz * (na[2] + nb[2] + nc[2]) < 0) {
      let t = b; b = c; c = t;
      t = nb; nb = nc; nc = t;
      t = cb; cb = cc; cc = t;
    }
    this.vert(a[0], a[1], a[2], na[0], na[1], na[2], ca, 0, 0, m);
    this.vert(b[0], b[1], b[2], nb[0], nb[1], nb[2], cb, 0, 0, m);
    this.vert(c[0], c[1], c[2], nc[0], nc[1], nc[2], cc, 0, 0, m);
  }

  // tapered tube between two points (branches, exhaust pipes); n sides, open ends unless caps
  tube(a, b, r0, r1, n, hex, m = 0, caps = false) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const L = Math.hypot(dx, dy, dz) || 1;
    const ax = [dx / L, dy / L, dz / L];
    // any vector not parallel to the axis → two perpendicular unit vectors
    const t = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let ux = ax[1] * t[2] - ax[2] * t[1], uy = ax[2] * t[0] - ax[0] * t[2], uz = ax[0] * t[1] - ax[1] * t[0];
    const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
    const vx = ax[1] * uz - ax[2] * uy, vy = ax[2] * ux - ax[0] * uz, vz = ax[0] * uy - ax[1] * ux;
    const ring = (p, r, ang) => [p[0] + (ux * Math.cos(ang) + vx * Math.sin(ang)) * r, p[1] + (uy * Math.cos(ang) + vy * Math.sin(ang)) * r, p[2] + (uz * Math.cos(ang) + vz * Math.sin(ang)) * r];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
      const out = [ux * Math.cos(am) + vx * Math.sin(am), uy * Math.cos(am) + vy * Math.sin(am), uz * Math.cos(am) + vz * Math.sin(am)];
      this.quad(ring(a, r0, a0), ring(b, r1, a0), ring(b, r1, a1), ring(a, r0, a1), hex, m, null, out);
      if (caps) this.tri(b, ring(b, r1, a0), ring(b, r1, a1), hex, m, undefined, undefined, undefined, ax);
    }
  }

  // axis aligned box. opts: cell [cw,ch] facade cells, top {c,m}, skipTop, skipBottom (default true), yBase
  box(x0, y0, z0, x1, y1, z1, hex, m = 0, opts = {}) {
    const p = (x, y, z) => [x, y, z];
    const P000 = p(x0, y0, z0), P100 = p(x1, y0, z0), P010 = p(x0, y1, z0), P110 = p(x1, y1, z0);
    const P001 = p(x0, y0, z1), P101 = p(x1, y0, z1), P011 = p(x0, y1, z1), P111 = p(x1, y1, z1);
    const cell = opts.cell;
    const wallUV = (w) => {
      if (!cell) return [[0, 0], [0, y1 - y0], [w, y1 - y0], [w, 0]];
      const nu = Math.max(1, Math.round(w / cell[0]));
      const nv = Math.max(1, Math.round((y1 - (opts.yBase ?? y0)) / cell[1]));
      const vb = ((y0 - (opts.yBase ?? y0)) / (y1 - (opts.yBase ?? y0))) * nv;
      return [[0, vb], [0, nv], [nu, nv], [nu, vb]];
    };
    const wx = x1 - x0, wz = z1 - z0;
    if (!opts.skip || !opts.skip.includes('px')) this.quad(P100, P110, P111, P101, hex, m, wallUV(wz));
    if (!opts.skip || !opts.skip.includes('nx')) this.quad(P001, P011, P010, P000, hex, m, wallUV(wz));
    if (!opts.skip || !opts.skip.includes('pz')) this.quad(P101, P111, P011, P001, hex, m, wallUV(wx));
    if (!opts.skip || !opts.skip.includes('nz')) this.quad(P000, P010, P110, P100, hex, m, wallUV(wx));
    if (!opts.skipTop) {
      const t = opts.top || { c: hex, m: cell ? 0 : m };
      this.quad(P010, P011, P111, P110, t.c, t.m, [[x0, z0], [x0, z1], [x1, z1], [x1, z0]]);
    }
    if (opts.skipBottom === false) this.quad(P000, P100, P101, P001, hex, m);
  }

  // box from 8 transformed corners (local box → world via fn). Faces get winding fixed via expected normals.
  xbox(sx, sy, sz, xf, nf, hex, m = 0, opts = {}) {
    const hx = sx / 2, hz = sz / 2;
    const c = [];
    for (const [x, y, z] of [[-hx, 0, -hz], [hx, 0, -hz], [-hx, sy, -hz], [hx, sy, -hz], [-hx, 0, hz], [hx, 0, hz], [-hx, sy, hz], [hx, sy, hz]]) c.push(xf(x, y, z));
    const [P000, P100, P010, P110, P001, P101, P011, P111] = c;
    const uvw = (w, h) => (opts.cell ? [[0, 0], [0, h / opts.cell[1]], [w / opts.cell[0], h / opts.cell[1]], [w / opts.cell[0], 0]] : [[0, 0], [0, h], [w, h], [w, 0]]);
    this.quad(P100, P110, P111, P101, hex, m, uvw(sz, sy), nf(1, 0, 0));
    this.quad(P001, P011, P010, P000, hex, m, uvw(sz, sy), nf(-1, 0, 0));
    this.quad(P101, P111, P011, P001, hex, m, uvw(sx, sy), nf(0, 0, 1));
    this.quad(P000, P010, P110, P100, hex, m, uvw(sx, sy), nf(0, 0, -1));
    this.quad(P010, P011, P111, P110, opts.topC ?? hex, opts.topM ?? m, [[0, 0], [0, sz], [sx, sz], [sx, 0]], nf(0, 1, 0));
    if (opts.bottom) this.quad(P000, P100, P101, P001, hex, m, null, nf(0, -1, 0));
  }

  // rotated box: bottom center (cx,cy,cz), yaw rot, optional tiltX (about local x at bottom center)
  rbox(cx, cy, cz, sx, sy, sz, rot, hex, m = 0, tiltX = 0, opts = {}) {
    const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tiltX), st = Math.sin(tiltX);
    const xf = (x, y, z) => {
      const y1 = y * ct - z * st, z1 = y * st + z * ct;
      return [cx + x * cr + z1 * sr, cy + y1, cz - x * sr + z1 * cr];
    };
    const nf = (x, y, z) => {
      const y1 = y * ct - z * st, z1 = y * st + z * ct;
      return [x * cr + z1 * sr, y1, -x * sr + z1 * cr];
    };
    this.xbox(sx, sy, sz, xf, nf, hex, m, opts);
  }

  // vertical cylinder / cone frustum
  cyl(x, z, y0, y1, r0, r1, n, hex, m = 0, cap = false) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const am = (a0 + a1) / 2;
      const out = [Math.cos(am), (r0 - r1) / Math.max(0.01, y1 - y0), Math.sin(am)];
      this.quad([x + c0 * r0, y0, z + s0 * r0], [x + c0 * r1, y1, z + s0 * r1], [x + c1 * r1, y1, z + s1 * r1], [x + c1 * r0, y0, z + s1 * r0], hex, m, [[0, 0], [0, 1], [1, 1], [1, 0]], out);
      if (cap && r1 > 0.01) this.tri([x, y1, z], [x + c0 * r1, y1, z + s0 * r1], [x + c1 * r1, y1, z + s1 * r1], hex, m, undefined, undefined, undefined, [0, 1, 0]);
    }
  }

  // horizontal cylinder along 'x' or 'z' centered at (x,y,z)
  hcyl(x, y, z, len, r, axis, n, hex, m = 0, caps = true) {
    const P = (a, l) => {
      const ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      return axis === 'x' ? [x + l, y + sa, z + ca] : [x + ca, y + sa, z + l];
    };
    const N = (a) => (axis === 'x' ? [0, Math.sin(a), Math.cos(a)] : [Math.cos(a), Math.sin(a), 0]);
    const h = len / 2;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      this.quad(P(a0, -h), P(a1, -h), P(a1, h), P(a0, h), hex, m, null, N((a0 + a1) / 2));
      if (caps) {
        const c0 = axis === 'x' ? [x - h, y, z] : [x, y, z - h];
        const c1 = axis === 'x' ? [x + h, y, z] : [x, y, z + h];
        this.tri(c0, P(a0, -h), P(a1, -h), hex, m, undefined, undefined, undefined, axis === 'x' ? [-1, 0, 0] : [0, 0, -1]);
        this.tri(c1, P(a0, h), P(a1, h), hex, m, undefined, undefined, undefined, axis === 'x' ? [1, 0, 0] : [0, 0, 1]);
      }
    }
  }

  // low-poly crown
  ico(x, y, z, r, sy, hex, m = 0, seed = 0) {
    const t = (1 + Math.sqrt(5)) / 2;
    const V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const L = Math.hypot(1, t);
    const P = V.map((v, i) => {
      const j = 1 + 0.12 * Math.sin(seed * 12.9898 + i * 78.233);
      return [x + (v[0] / L) * r * j, y + (v[1] / L) * r * sy * j, z + (v[2] / L) * r * j];
    });
    for (const [a, b, c] of F) {
      const cx = (P[a][0] + P[b][0] + P[c][0]) / 3 - x, cy = (P[a][1] + P[b][1] + P[c][1]) / 3 - y, cz = (P[a][2] + P[b][2] + P[c][2]) / 3 - z;
      // slight per-face shade variation gives a leafy look
      const shade = 0.88 + 0.12 * ((Math.sin(a * 3.1 + b * 1.7 + c * 0.7 + seed) + 1) / 2);
      const col = scaleHex(hex, shade);
      this.tri(P[a], P[b], P[c], col, m, undefined, undefined, undefined, [cx, cy, cz]);
    }
  }

  // flat convex polygon facing up
  poly(pts, y, hex, m = 0) {
    const n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    // (0,0)->(0,1)->(1,1) has negative shoelace area and faces +y
    const P = area < 0 ? pts : [...pts].reverse();
    for (let i = 1; i < n - 1; i++) {
      const a = P[0], b = P[i], c = P[i + 1];
      this.tri([a[0], y, a[1]], [b[0], y, b[1]], [c[0], y, c[1]], hex, m, [a[0], a[1]], [b[0], b[1]], [c[0], c[1]], [0, 1, 0]);
    }
  }

  // vertical wall from (x0,z0) to (x1,z1); normal = (dz,-dx) (left of travel) unless flip
  wall(x0, z0, x1, z1, y0, y1, hex, m = 0, flip = false) {
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1;
    let n = [dz / l, 0, -dx / l];
    if (flip) n = [-n[0], 0, -n[2]];
    this.quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z1], [x1, y0, z1], hex, m, [[0, y0], [0, y1], [l, y1], [l, y0]], n);
  }

  toGeometry(THREE) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 1));
    for (const [n, size] of this.extraNames) g.setAttribute(n, new THREE.Float32BufferAttribute(this.extra[n], size));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export function scaleHex(hex, k) {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
  const b = Math.min(255, Math.round((hex & 255) * k));
  return (r << 16) | (g << 8) | b;
}
