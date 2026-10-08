// Trees for the merged town mesh. Instead of one faceted ball on a stick:
//  · oak (lövträd): overlapping leaf clumps around a core, a tapered trunk with a root flare
//    and a few branches reaching up into the crown
//  · birch: a slim white stem (the shader paints the black marks) with small, airy clumps
//  · spruce ('pine' in the layout): ragged tiers of drooping branches around a dark trunk
// Crown normals lean toward the centre of the whole crown, so the clumps shade like one soft
// volume, and the vertex colours darken toward the inside and the underside. The shader
// (material FOLIAGE) adds leaf noise, light through the leaves and a little wind.
import { toLinear } from './geom.js';

const PLAIN = 0, FOLIAGE = 27, BIRCH = 28; // material codes (M in layout.js)

const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// unit icospheres: level 0 (12 vertices, 20 faces) and level 1 (42 vertices, 80 faces)
const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
  const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const V1 = V.slice(), F1 = [], mid = new Map();
  const m = (a, b) => {
    const k = Math.min(a, b) * 64 + Math.max(a, b);
    if (!mid.has(k)) { V1.push(norm([V[a][0] + V[b][0], V[a][1] + V[b][1], V[a][2] + V[b][2]])); mid.set(k, V1.length - 1); }
    return mid.get(k);
  };
  for (const [a, b, c] of F) {
    const ab = m(a, b), bc = m(b, c), ca = m(c, a);
    F1.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }
  return [{ V, F }, { V: V1, F: F1 }];
})();

// small seeded random generator; every tree gets its own sequence from its position
function rand(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedOf = (x, z) => (Math.round(x * 16) * 73856093) ^ (Math.round(z * 16) * 19349663);

// ------------------------------------------------------------------ plans
// The shape of a tree, decided from its position, so the mesh and its baked shadow agree.
export function treePlan(p) {
  const r = rand(seedOf(p.x, p.z));
  const s = p.s ?? 1, y0 = p.y ?? 0, x = p.x, z = p.z;
  const kind = p.kind === 'pine' || p.kind === 'spruce' ? 'spruce' : p.kind === 'birch' ? 'birch' : 'oak';
  const plan = { kind, x, z, y0, s, limbs: [], clumps: [], tiers: [], crown: null };

  if (kind === 'oak') {
    const lean = [(r() - 0.5) * 0.5 * s, (r() - 0.5) * 0.5 * s];
    const cx = x + lean[0], cy = y0 + 4.05 * s, cz = z + lean[1];
    plan.crown = { x: cx, y: cy, z: cz, rx: 2.25 * s, ry: 1.85 * s, k: 0.4 };
    plan.limbs.push({ a: [x, y0 - 0.05, z], b: [x, y0 + 0.45 * s, z], r0: 0.37 * s, r1: 0.24 * s, n: 7, c0: 0x4a3626, c1: 0x5d4330 });
    plan.limbs.push({ a: [x, y0 + 0.45 * s, z], b: [cx * 0.6 + x * 0.4, cy - 0.3 * s, cz * 0.6 + z * 0.4], r0: 0.24 * s, r1: 0.14 * s, n: 7, c0: 0x5d4330, c1: 0x6b4d36 });
    plan.clumps.push({ x: cx, y: cy + 0.1 * s, z: cz, rx: 1.55 * s, ry: 1.3 * s, rz: 1.5 * s, level: 1, lump: 0.1, tint: 0.95 });
    const n = 5 + (r() < 0.5 ? 1 : 0), a0 = r() * Math.PI * 2;
    const low = [];
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * Math.PI * 2 + (r() - 0.5) * 0.5;
      const d = (1.12 + r() * 0.3) * s, up = (k % 2 ? 0.45 : -0.3) + (r() - 0.5) * 0.3;
      const rr = (0.92 + r() * 0.24) * s;
      const c = { x: cx + Math.cos(a) * d, y: cy + up * s, z: cz + Math.sin(a) * d, rx: rr, ry: rr * 0.86, rz: rr * (0.92 + r() * 0.16), level: 1, lump: 0.13, tint: 0.9 + r() * 0.2 };
      plan.clumps.push(c);
      if (up < 0) low.push(c);
    }
    for (let k = 0; k < 2; k++) {
      const rr = (0.82 + r() * 0.2) * s;
      plan.clumps.push({ x: cx + (r() - 0.5) * 1.1 * s, y: cy + (1.05 + r() * 0.25) * s, z: cz + (r() - 0.5) * 1.1 * s, rx: rr, ry: rr * 0.85, rz: rr, level: k, lump: 0.13, tint: 1.04 + r() * 0.1, top: true });
    }
    // branches from the trunk out toward the lower clumps (their ends hide inside the leaves)
    for (const c of low.slice(0, 3)) {
      const h = y0 + (2.2 + r() * 0.6) * s;
      const tx = x + (cx - x) * ((h - y0) / (cy - y0)) * 0.6, tz = z + (cz - z) * ((h - y0) / (cy - y0)) * 0.6;
      const e = [tx + (c.x - tx) * 0.72, h + (c.y - h) * 0.72, tz + (c.z - tz) * 0.72];
      plan.limbs.push({ a: [tx, h, tz], b: e, r0: 0.1 * s, r1: 0.045 * s, n: 5, c0: 0x5d4330, c1: 0x6b4d36 });
    }
  } else if (kind === 'birch') {
    const top = [x + (r() - 0.5) * 0.4 * s, y0 + 6.0 * s, z + (r() - 0.5) * 0.4 * s];
    const at = (h) => { const t = (h - y0) / (top[1] - y0); return [x + (top[0] - x) * t, h, z + (top[2] - z) * t]; };
    const cy = y0 + 4.55 * s, cc = at(cy);
    plan.crown = { x: cc[0], y: cy, z: cc[2], rx: 1.3 * s, ry: 2.05 * s, k: 0.4 };
    plan.limbs.push({ a: [x, y0 - 0.05, z], b: at(y0 + 0.7 * s), r0: 0.19 * s, r1: 0.15 * s, n: 6, c0: 0x6f6a62, c1: 0xe3ded3, m: BIRCH });
    plan.limbs.push({ a: at(y0 + 0.7 * s), b: top, r0: 0.15 * s, r1: 0.05 * s, n: 6, c0: 0xe9e5dc, c1: 0xe9e5dc, m: BIRCH });
    // a tall oval core around the upper stem …
    plan.clumps.push({ x: cc[0], y: cy + 0.1 * s, z: cc[2], rx: 0.85 * s, ry: 1.55 * s, rz: 0.85 * s, level: 1, lump: 0.12, tint: 0.94 });
    // … and smaller clumps on a spiral around it: fullest a bit below the middle, narrow on top
    const n = 6, a0 = r() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const h = y0 + (3.05 + f * 3.0) * s;
      const a = a0 + k * 2.4 + (r() - 0.5) * 0.5;
      const w = Math.sin(Math.PI * (0.25 + 0.75 * f));
      const d = (0.45 + 0.5 * w) * s * (0.85 + r() * 0.3);
      const rr = (0.5 + 0.28 * w) * s * (0.9 + r() * 0.2);
      const c0 = at(h);
      plan.clumps.push({ x: c0[0] + Math.cos(a) * d, y: h, z: c0[2] + Math.sin(a) * d, rx: rr, ry: rr * 1.25, rz: rr, level: rr > 0.62 * s ? 1 : 0, lump: 0.14, tint: 0.92 + r() * 0.16 + f * 0.06, top: f > 0.75 });
      if (k < 3) plan.limbs.push({ a: at(h - 0.55 * s), b: [c0[0] + Math.cos(a) * d * 0.8, h - 0.1 * s, c0[2] + Math.sin(a) * d * 0.8], r0: 0.05 * s, r1: 0.025 * s, n: 4, c0: 0xd6d0c4, c1: 0xbdb6a8 });
    }
  } else {
    plan.limbs.push({ a: [x, y0 - 0.05, z], b: [x, y0 + 2.3 * s, z], r0: 0.22 * s, r1: 0.13 * s, n: 6, c0: 0x4a3324, c1: 0x5a3f2c });
    const T = 5;
    for (let i = 0; i < T; i++) {
      const f = i / (T - 1);
      const yb = y0 + (0.95 + i * 1.12) * s;
      const hgt = (i === T - 1 ? 1.75 : 1.85 - 0.18 * i) * s;
      plan.tiers.push({ yb, yt: yb + hgt, rb: (2.05 - 0.36 * i) * s, rot: r() * Math.PI * 2, seed: Math.floor(r() * 1e9), f });
    }
    plan.crown = { x, y: y0 + 3.6 * s, z, rx: 2.0 * s, ry: 3.2 * s, k: 0 };
  }
  return plan;
}

// soft ground shadows: one sphere per clump or tier, in the layout's caster format
export function treeCasters(p) {
  const plan = treePlan(p);
  if (plan.kind === 'spruce') {
    return plan.tiers.map((t) => ({ t: 'sphere', x: plan.x, y: (t.yb + t.yt) / 2 - 0.2 * plan.s, z: plan.z, r: t.rb * 0.85, sy: Math.max(0.35, ((t.yt - t.yb) * 0.5) / (t.rb * 0.85)) }));
  }
  return plan.clumps.map((c) => ({ t: 'sphere', x: c.x, y: c.y, z: c.z, r: Math.max(c.rx, c.rz) * 0.92, sy: c.ry / Math.max(c.rx, c.rz) }));
}

// ------------------------------------------------------------------ geometry
// round tapered limb with smooth normals; the colour shades from c0 at a to c1 at b
function limb(B, L) {
  const { a, b, r0, r1, n } = L;
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]) || 1;
  const ax = [d[0] / len, d[1] / len, d[2] / len];
  const u = norm(cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), v = cross(ax, u);
  const slope = (r0 - r1) / len;
  const c0 = toLinear(L.c0), c1 = toLinear(L.c1), m = L.m ?? PLAIN;
  const dir = (i) => { const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t); return [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s]; };
  for (let i = 0; i < n; i++) {
    const d0 = dir(i), d1 = dir(i + 1);
    const n0 = norm([d0[0] + ax[0] * slope, d0[1] + ax[1] * slope, d0[2] + ax[2] * slope]);
    const n1 = norm([d1[0] + ax[0] * slope, d1[1] + ax[1] * slope, d1[2] + ax[2] * slope]);
    const p00 = [a[0] + d0[0] * r0, a[1] + d0[1] * r0, a[2] + d0[2] * r0], p01 = [b[0] + d0[0] * r1, b[1] + d0[1] * r1, b[2] + d0[2] * r1];
    const p10 = [a[0] + d1[0] * r0, a[1] + d1[1] * r0, a[2] + d1[2] * r0], p11 = [b[0] + d1[0] * r1, b[1] + d1[1] * r1, b[2] + d1[2] * r1];
    B.triN(p00, p01, p11, n0, n0, n1, c0, c1, c1, m);
    B.triN(p00, p11, p10, n0, n1, n1, c0, c1, c0, m);
  }
}

// is point p safely inside clump o (inside its smallest possible surface, lumps and flat faces
// included)? Faces hidden inside a neighbouring clump are left out.
function inside(p, o) {
  const k = (1 - o.lump) * (o.level ? 0.93 : 0.84);
  const dx = (p[0] - o.x) / (o.rx * k), dy = (p[1] - o.y) / (o.ry * k), dz = (p[2] - o.z) / (o.rz * k);
  return dx * dx + dy * dy + dz * dz < 1;
}

// one leaf clump: a lumpy icosphere. Normals blend the clump's own with the crown's, and the
// colour gets darker toward the bottom and the inside of the crown.
function clump(B, c, crown, base, r, y0, y1, others) {
  const { V, F } = ICO[c.level];
  const P = [], N = [], C = [];
  const tint = c.top ? mix3(mul(base, c.tint), toLinear(0x9cc256), 0.18) : mul(base, c.tint);
  for (let i = 0; i < V.length; i++) {
    const v = V[i];
    const j = 1 + (r() - 0.5) * 2 * c.lump;
    const p = [c.x + v[0] * c.rx * j, c.y + v[1] * c.ry * j, c.z + v[2] * c.rz * j];
    const nc = norm([v[0] / c.rx, v[1] / c.ry, v[2] / c.rz]);
    const dc = [(p[0] - crown.x) / crown.rx, (p[1] - crown.y) / crown.ry, (p[2] - crown.z) / crown.rx];
    const n = norm(mix3(nc, norm(dc), crown.k));
    const h = clamp((p[1] - y0) / (y1 - y0), 0, 1);
    const out = clamp(Math.hypot(dc[0], dc[1], dc[2]), 0, 1);
    P.push(p); N.push(n);
    C.push(mul(tint, (0.5 + 0.58 * h) * (0.62 + 0.38 * out) * (0.8 + 0.2 * (v[1] * 0.5 + 0.5))));
  }
  for (const [a, b, d] of F) {
    if (others.some((o) => o !== c && inside(P[a], o) && inside(P[b], o) && inside(P[d], o))) continue;
    B.triN(P[a], P[b], P[d], N[a], N[b], N[d], C[a], C[b], C[d], FOLIAGE);
  }
}

// one spruce tier: a drooping skirt of branches with a ragged rim and a dark underside
function tier(B, plan, t, base) {
  const r = rand(t.seed), s = plan.s, K = 18;
  const apex = [plan.x, t.yt, plan.z];
  const rim = [];
  for (let k = 0; k < K; k++) {
    const tip = k % 2 === 0;
    const a = t.rot + (k / K) * Math.PI * 2 + (r() - 0.5) * 0.12;
    const rr = t.rb * (tip ? 1 : 0.72) * (0.92 + r() * 0.16);
    const y = t.yb + (tip ? -0.08 : 0.2) * s * (1 - t.f * 0.4);
    rim.push({ p: [plan.x + Math.cos(a) * rr, y, plan.z + Math.sin(a) * rr], a, tip });
  }
  const dark = mul(base, 0.36), mid = mul(base, 0.85);
  const inner = [plan.x, t.yb + 0.42 * s, plan.z];
  for (let k = 0; k < K; k++) {
    const A = rim[k], Bq = rim[(k + 1) % K];
    const am = (A.a + Bq.a + (k === K - 1 ? Math.PI * 2 : 0)) / 2;
    const nA = norm([Math.cos(A.a), 0.75, Math.sin(A.a)]), nB = norm([Math.cos(Bq.a), 0.75, Math.sin(Bq.a)]);
    const nTop = norm([Math.cos(am) * 0.45, 1, Math.sin(am) * 0.45]);
    const cA = A.tip ? mul(base, 1.12) : mid, cB = Bq.tip ? mul(base, 1.12) : mid;
    B.triN(apex, A.p, Bq.p, nTop, nA, nB, mul(base, 0.95), cA, cB, FOLIAGE);
    const dA = norm([Math.cos(A.a) * 0.5, -1, Math.sin(A.a) * 0.5]), dB = norm([Math.cos(Bq.a) * 0.5, -1, Math.sin(Bq.a) * 0.5]);
    B.triN(A.p, inner, Bq.p, dA, [0, -1, 0], dB, mul(base, 0.6), dark, mul(base, 0.6), FOLIAGE);
  }
}

export function treeInto(B, p) {
  const plan = treePlan(p);
  for (const L of plan.limbs) limb(B, L);
  if (plan.kind === 'spruce') {
    for (const t of plan.tiers) tier(B, plan, t, mix3(toLinear(0x2b5a2a), toLinear(0x3d7436), t.f * 0.8));
    return plan;
  }
  const r = rand(seedOf(p.x, p.z) ^ 0x5bd1e995);
  const base = plan.kind === 'birch' ? mix3(toLinear(0x7cae42), toLinear(p.c ?? 0x79ab40), 0.25) : toLinear(p.c ?? 0x4f8a2e);
  let y0 = Infinity, y1 = -Infinity;
  for (const c of plan.clumps) { y0 = Math.min(y0, c.y - c.ry); y1 = Math.max(y1, c.y + c.ry); }
  for (const c of plan.clumps) clump(B, c, plan.crown, base, r, y0, y1, plan.clumps);
  return plan;
}
