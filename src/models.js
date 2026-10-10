// Procedural low-poly models. Cars and people are built once and drawn with instancing:
// all sedans in one draw call, all vans in one, all people in one.
// Car-local frame: +z forward, +x = LEFT side (driver side in right-hand traffic), y up.
import * as THREE from './three.js';
import { GeomBuilder, toLinear } from './geom.js';
import { M } from './layout.js';
import { CAR_TYPES, BIKE_GEO } from './vehicle.js';

const DARK = 0x26282c, BLACK = 0x121314, TIRE = 0x161718, LIGHT = 0xfff2d2, TAIL = 0xd41a14, WHITE = 0xffffff;

// box from 4 bottom + 4 top points ordered [(-x,z0),(+x,z0),(+x,z1),(-x,z1)]; spec[name] = [hex, mat] or null
function hexa(B, b, t, spec) {
  const all = [...b, ...t];
  const C = [0, 1, 2].map((i) => all.reduce((s, p) => s + p[i], 0) / 8);
  const faces = {
    top: [t[0], t[3], t[2], t[1]], bottom: [b[0], b[1], b[2], b[3]],
    front: [b[3], t[3], t[2], b[2]], back: [b[1], t[1], t[0], b[0]],
    left: [b[2], t[2], t[1], b[1]], right: [b[0], t[0], t[3], b[3]],
  };
  for (const name in faces) {
    const st = spec[name];
    if (!st) continue;
    const q = faces[name];
    const fc = [0, 1, 2].map((i) => (q[0][i] + q[1][i] + q[2][i] + q[3][i]) / 4 - C[i]);
    B.quad(q[0], q[1], q[2], q[3], st[0], st[1], st[2] || null, fc);
  }
}

// flat quad on a plane facing `n` (axis aligned), centered c, size (w along u, h along v)
function decal(B, c, n, w, h, hex, mat, uvs) {
  let u, v = [0, 1, 0];
  if (Math.abs(n[0]) > 0.5) u = [0, 0, -n[0]];          // facing ±x: u runs along ∓z
  else if (Math.abs(n[2]) > 0.5) u = [n[2], 0, 0];      // facing ±z: u runs along ±x
  else { u = [1, 0, 0]; v = [0, 0, -n[1]]; }
  const P = (su, sv) => [c[0] + u[0] * su * w / 2 + v[0] * sv * h / 2, c[1] + u[1] * su * w / 2 + v[1] * sv * h / 2, c[2] + u[2] * su * w / 2 + v[2] * sv * h / 2];
  B.quad(P(-1, -1), P(-1, 1), P(1, 1), P(1, -1), hex, mat, uvs || null, n);
}

const TRIM = 0x1b1c1f, CHROME = 0xd9dde2, AMBER = 0xf0a02a, CREAM = 0xf3ead6, PLATE = 0xf4f4ef, EU = 0x1d4fa0, GLASS = 0x9db4c7;

// ------------------------------------------------------------------ car building helpers
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function normalOf(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}
const outward = (n, hint) => (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0 ? [-n[0], -n[1], -n[2]] : n);

// part u0..u1 × v0..v1 of a planar quad q = [bottom-front, bottom-rear, top-rear, top-front],
// lifted `off` along its outward normal n (windows, pillars, trim on slanted surfaces)
function panel(B, q, u0, u1, v0, v1, n, off, hex, mat, uvs) {
  const P = (u, v) => {
    const p = lerp3(lerp3(q[0], q[1], u), lerp3(q[3], q[2], u), v);
    return [p[0] + n[0] * off, p[1] + n[1] * off, p[2] + n[2] * off];
  };
  B.quad(P(u0, v0), P(u0, v1), P(u1, v1), P(u1, v0), hex, mat, uvs || null, n);
}

// round decal (fan) facing ±z or ±x
function disc(B, c, n, r, segs, hex, mat) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push(Math.abs(n[2]) > 0.5 ? [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]] : [c[0], c[1] + Math.sin(a) * r, c[2] + Math.cos(a) * r]);
  }
  for (let i = 0; i < segs; i++) B.tri(c, pts[i], pts[(i + 1) % segs], hex, mat, undefined, undefined, undefined, n);
}

// keep the part of a polygon below (or above) a height – for two-tone caps
function clipY(poly, y, below) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ia = below ? a[1] <= y : a[1] >= y, ib = below ? b[1] <= y : b[1] >= y;
    if (ia) out.push(a);
    if (ia !== ib) { const t = (y - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, y]); }
  }
  return out;
}

function fan(B, poly, z, dir, hex, mat) {
  if (poly.length < 3) return;
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p[0]; cy += p[1]; }
  const c = [cx / poly.length, cy / poly.length, z];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    B.tri(c, [a[0], a[1], z], [b[0], b[1], z], hex, mat, undefined, undefined, undefined, [0, 0, dir]);
  }
}

// A body lofted through cross-sections from front to back. Each station has the right half of its
// section (x ≥ 0) from the bottom edge round to the roof centre; mats[k] colours the strip between
// point k and k+1 (mirrored on the left). The ends are closed by caps, split in two colours at
// `split` when given (two-tone paint).
function loft(B, st, mats, cap) {
  const zF = st[0].z, zR = st[st.length - 1].z;
  for (let i = 0; i < st.length - 1; i++) {
    const A = st[i], C = st[i + 1];
    const mz = (A.z + C.z) / 2, iz = Math.max(zR + 0.8, Math.min(zF - 0.8, mz));
    for (let k = 0; k < A.pts.length - 1; k++) {
      const [hex, m] = mats[k];
      for (const sx of [1, -1]) {
        const p = (S, j) => [S.pts[j][0] * sx, S.pts[j][1], S.z];
        const a = p(A, k), b = p(A, k + 1), c = p(C, k + 1), d = p(C, k);
        const mx = (a[0] + b[0] + c[0] + d[0]) / 4, my = (a[1] + b[1] + c[1] + d[1]) / 4;
        B.quad(a, b, c, d, hex, m, null, [mx, my - 0.75, mz - iz]);
      }
    }
  }
  for (const [S, dir] of [[st[0], 1], [st[st.length - 1], -1]]) {
    const right = S.pts, left = right.slice(0, -1).reverse().map(([x, y]) => [-x, y]);
    const ring = [[0, right[0][1]], ...right, ...left];
    if (cap.split) {
      fan(B, clipY(ring, S.split, true), S.z, dir, cap.low[0], cap.low[1]);
      fan(B, clipY(ring, S.split, false), S.z, dir, cap.high[0], cap.high[1]);
    } else fan(B, ring, S.z, dir, cap.mat[0], cap.mat[1]);
  }
}

// main stations: [z, half width, bottom, belt, top]; interpolated, with extra stations that cut
// round wheel arches (radius R around the axle height cy) into the lower body
function profileAt(main, z) {
  if (z >= main[0][0]) return main[0].slice(1);
  for (let i = 0; i < main.length - 1; i++) {
    const a = main[i], b = main[i + 1];
    if (z <= a[0] && z >= b[0]) { const t = (a[0] - z) / (a[0] - b[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * t); }
  }
  return main[main.length - 1].slice(1);
}
function stations(main, wheels, R, cy, section) {
  const zs = new Set(main.map((m) => m[0]));
  for (const zw of wheels) for (const d of [R + 0.03, R, R * 0.9, R * 0.71, R * 0.43, 0]) { zs.add(+(zw + d).toFixed(4)); zs.add(+(zw - d).toFixed(4)); }
  return [...zs].sort((a, b) => b - a).map((z) => {
    const [hw, yb0, belt, top] = profileAt(main, z);
    let yb = yb0;
    for (const zw of wheels) { const dz = Math.abs(z - zw); if (dz <= R) yb = Math.max(yb, cy + Math.sqrt(R * R - dz * dz)); }
    return { z, pts: section(hw, yb, belt, top), split: belt };
  });
}

// ------------------------------------------------------------------ wheels
// rounded tyre, and either a five-spoke alloy rim (sedan) or a chrome hubcap (van)
function wheel(B, x, r, z, w, outer, style = 'alloy') {
  const n = 14, s = outer ? 1 : -1;
  const xo = x + (s * w) / 2, xi = x - (s * w) / 2, sh = 0.035;
  const rr = r * (style === 'alloy' ? 0.66 : 0.6);
  const P = (xx, rad, a) => [xx, r + Math.sin(a) * rad, z + Math.cos(a) * rad];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    const rad = [0, Math.sin(am), Math.cos(am)];
    // tread with rounded shoulders, then the outer sidewall down to the rim
    B.quad(P(xo - s * sh, r, a0), P(xo - s * sh, r, a1), P(xi + s * sh, r, a1), P(xi + s * sh, r, a0), TIRE, M.PLAIN, null, rad);
    B.quad(P(xo, r * 0.9, a0), P(xo, r * 0.9, a1), P(xo - s * sh, r, a1), P(xo - s * sh, r, a0), 0x1c1d1f, M.PLAIN, null, [s * 0.7, rad[1], rad[2]]);
    B.quad(P(xi, r * 0.9, a0), P(xi, r * 0.9, a1), P(xi + s * sh, r, a1), P(xi + s * sh, r, a0), 0x1c1d1f, M.PLAIN, null, [-s * 0.7, rad[1], rad[2]]);
    B.quad(P(xo, rr, a0), P(xo, rr, a1), P(xo, r * 0.9, a1), P(xo, r * 0.9, a0), 0x202124, M.PLAIN, null, [s, 0, 0]);
  }
  const face = [s, 0, 0];
  disc(B, [xo + s * 0.002, r, z], face, rr, n, CHROME, M.CHROME);
  if (style === 'alloy') {
    // dark gaps between five spokes, so the turning reads
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + Math.PI / 5, h = 0.36;
      const q = (rad, da) => P(xo + s * 0.005, rad, a + da);
      B.quad(q(rr * 0.32, -h * 0.75), q(rr * 0.86, -h), q(rr * 0.86, h), q(rr * 0.32, h * 0.75), 0x2a2c30, M.PLAIN, null, face);
    }
    disc(B, [xo + s * 0.008, r, z], face, rr * 0.2, 6, 0x6f747a, M.CHROME);
  } else {
    disc(B, [xo + s * 0.005, r, z], face, rr * 0.55, 10, 0x8c9198, M.CHROME);
    disc(B, [xo + s * 0.009, r, z], face, rr * 0.3, 8, CHROME, M.CHROME);
  }
}

// ------------------------------------------------------------------ Dalahäst GT (sedan)
const SEDAN_MAIN = [ // z, half width, bottom, belt, deck top
  [2.26, 0.86, 0.29, 0.60, 0.66],
  [2.15, 0.92, 0.26, 0.71, 0.77],
  [1.9, 0.93, 0.25, 0.79, 0.85],
  [0.92, 0.93, 0.25, 0.88, 0.94],
  [-1.38, 0.93, 0.25, 0.9, 0.96],
  [-2.0, 0.92, 0.26, 0.88, 0.94],
  [-2.18, 0.9, 0.27, 0.83, 0.88],
  [-2.28, 0.86, 0.29, 0.77, 0.81],
];
const sedanSection = (hw, yb, belt, top) => [
  [hw - 0.1, yb],                                   // bottom edge, tucked in
  [hw, Math.min(yb + 0.09, belt - 0.06)],           // lower chamfer (black sill and arch lips)
  [hw, belt - 0.03],                                // door
  [hw - 0.05, belt + 0.035],                        // shoulder
  [hw * 0.6, top - 0.012],                          // bonnet / boot lid
  [0, top],                                         // centre line
];

export function sedanBody(B, paint = WHITE, pmat = M.PAINT, opts = {}) {
  const wreck = !!opts.wreck;
  const Pm = [paint, pmat], T = [TRIM, M.PLAIN];
  const G = wreck ? [0x3a3f44, M.PLAIN] : [GLASS, M.GLASS];
  const C = wreck ? [0x6b6560, M.PLAIN] : [CHROME, M.CHROME];
  const Lt = wreck ? [0x4a4a46, M.PLAIN] : [LIGHT, M.LIGHT];
  const Tl = wreck ? [0x5a2a26, M.PLAIN] : [TAIL, M.TAIL];
  loft(B, stations(SEDAN_MAIN, [1.35, -1.35], 0.42, 0.3, sedanSection), [T, Pm, Pm, Pm, Pm], { mat: Pm });
  // dark wheel wells behind the arches
  for (const zw of [1.35, -1.35]) B.box(-0.84, 0.22, zw - 0.42, 0.84, 0.74, zw + 0.42, BLACK, M.PLAIN, { skipTop: true });

  // greenhouse: windscreen, roof, rear window and sides with pillars and framed windows
  const yb = 0.915, yr = 1.42;
  const fb = (s) => [0.84 * s, yb, 0.92], rb = (s) => [0.84 * s, yb, -1.38];
  const rf = (s) => [0.7 * s, yr, 0.14], rr = (s) => [0.7 * s, yr, -0.92];
  const rfC = [0, yr + 0.03, 0.14], rrC = [0, yr + 0.035, -0.92];
  const ws = [fb(-1), fb(1), rf(1), rf(-1)];
  const nWs = outward(normalOf(ws[0], ws[1], ws[2]), [0, 1, 1]);
  B.quad(ws[0], ws[1], ws[2], ws[3], paint, pmat, null, nWs);
  panel(B, ws, 0.045, 0.955, 0.055, 0.94, nWs, 0.004, G[0], G[1]);
  if (!wreck) for (const [u0, u1] of [[0.14, 0.47], [0.53, 0.86]]) panel(B, ws, u0, u1, 0.075, 0.095, nWs, 0.007, TRIM, M.PLAIN); // wipers
  const rw = [rb(1), rb(-1), rr(-1), rr(1)];
  const nRw = outward(normalOf(rw[0], rw[1], rw[2]), [0, 1, -1]);
  B.quad(rw[0], rw[1], rw[2], rw[3], paint, pmat, null, nRw);
  panel(B, rw, 0.06, 0.94, 0.07, 0.92, nRw, 0.004, G[0], G[1]);
  B.quad(rf(1), rr(1), rrC, rfC, paint, pmat, null, [0.15, 1, 0]);
  B.quad(rfC, rrC, rr(-1), rf(-1), paint, pmat, null, [-0.15, 1, 0]);
  B.tri(rf(1), rfC, rf(-1), paint, pmat, undefined, undefined, undefined, [0, 0.3, 1]);
  B.tri(rr(1), rrC, rr(-1), paint, pmat, undefined, undefined, undefined, [0, 0.3, -1]);
  for (const s of [1, -1]) {
    const q = [fb(s), rb(s), rr(s), rf(s)];
    const n = outward(normalOf(q[0], q[1], q[3]), [s, 0, 0]);
    B.quad(q[0], q[1], q[2], q[3], paint, pmat, null, n);
    panel(B, q, 0.055, 0.85, 0.07, 0.91, n, 0.003, TRIM, M.PLAIN);         // black window surround + B-pillar
    panel(B, q, 0.078, 0.452, 0.11, 0.875, n, 0.006, G[0], G[1]);           // front door window
    panel(B, q, 0.532, 0.828, 0.11, 0.875, n, 0.006, G[0], G[1]);           // rear door window
    // door mirrors: a short black stalk and a slim housing with the glass facing back
    B.box(s > 0 ? 0.86 : -0.95, 0.935, 0.76, s > 0 ? 0.95 : -0.86, 0.965, 0.81, TRIM);
    B.box(s > 0 ? 0.93 : -1.04, 0.925, 0.725, s > 0 ? 1.04 : -0.93, 1.03, 0.815, TRIM, M.PLAIN, { skipBottom: false });
    decal(B, [0.985 * s, 0.9775, 0.722], [0, 0, -1], 0.095, 0.085, wreck ? 0x3a3f44 : 0x5f7484, wreck ? M.PLAIN : M.GLASS);
    // door shut lines and handles
    const xs = 0.933 * s;
    for (const zz of [0.82, -0.3, -0.9]) decal(B, [xs, 0.6, zz], [s, 0, 0], 0.012, 0.5, TRIM, M.PLAIN);
    for (const zz of [0.36, -0.62]) decal(B, [0.934 * s, 0.775, zz], [s, 0, 0], 0.15, 0.03, C[0], C[1]);
  }

  // front: bumper lip, air intake, number plate, grille with chrome bars, headlights, indicators
  const zf = 2.264;
  decal(B, [0, 0.322, zf], [0, 0, 1], 1.68, 0.065, TRIM, M.PLAIN);
  decal(B, [0, 0.41, zf], [0, 0, 1], 1.0, 0.08, 0x141518, M.PLAIN);
  decal(B, [0, 0.53, zf], [0, 0, 1], 0.76, 0.11, 0x111214, M.PLAIN);
  if (!wreck) {
    for (const y of [0.505, 0.533, 0.561]) decal(B, [0, y, zf + 0.002], [0, 0, 1], 0.72, 0.01, C[0], C[1]);
    decal(B, [0, 0.41, zf + 0.003], [0, 0, 1], 0.5, 0.07, PLATE, M.PLAIN);
    decal(B, [-0.227, 0.41, zf + 0.005], [0, 0, 1], 0.045, 0.07, EU, M.PLAIN);
  }
  for (const s of [1, -1]) {
    decal(B, [0.61 * s, 0.5475, zf], [0, 0, 1], 0.37, 0.115, C[0], C[1]);
    decal(B, [0.6 * s, 0.548, zf + 0.003], [0, 0, 1], 0.33, 0.09, Lt[0], Lt[1]);
    decal(B, [0.805 * s, 0.548, zf + 0.003], [0, 0, 1], 0.045, 0.09, wreck ? 0x5a4a30 : AMBER, M.PLAIN);
  }
  // rear: bumper, plate, wide tail lights with reversing lights, chrome strip, exhaust
  const zr = -2.284;
  decal(B, [0, 0.345, zr], [0, 0, -1], 1.68, 0.11, TRIM, M.PLAIN);
  if (!wreck) {
    decal(B, [0, 0.475, zr], [0, 0, -1], 0.5, 0.09, PLATE, M.PLAIN);
    decal(B, [0.227, 0.475, zr - 0.002], [0, 0, -1], 0.045, 0.09, EU, M.PLAIN);
  }
  decal(B, [0, 0.65, zr], [0, 0, -1], 0.8, 0.03, C[0], C[1]);
  for (const s of [1, -1]) {
    decal(B, [0.67 * s, 0.66, zr], [0, 0, -1], 0.34, 0.12, Tl[0], Tl[1]);
    decal(B, [0.46 * s, 0.66, zr], [0, 0, -1], 0.08, 0.12, wreck ? 0x55534e : 0xeceae2, M.PLAIN);
  }
  if (!wreck) {
    B.tube([-0.55, 0.3, -2.2], [-0.55, 0.3, -2.37], 0.036, 0.036, 6, C[0], C[1]);
    disc(B, [-0.55, 0.3, -2.372], [0, 0, -1], 0.024, 6, 0x0c0c0d, M.PLAIN);
  }
}

// ------------------------------------------------------------------ Bullbilen (van)
const VAN_MAIN = [ // z, half width, bottom, belt (two-tone line), roof
  [2.47, 0.9, 0.42, 1.12, 1.92],
  [2.4, 0.97, 0.38, 1.15, 2.1],
  [2.22, 1.0, 0.36, 1.17, 2.2],
  [-2.3, 1.0, 0.36, 1.17, 2.22],
  [-2.43, 0.97, 0.38, 1.15, 2.14],
  [-2.49, 0.91, 0.42, 1.12, 2.02],
];
const vanSection = (hw, yb, belt, top) => [
  [hw - 0.12, yb],
  [hw, Math.min(yb + 0.1, belt - 0.12)],
  [hw, belt],                 // lower body in the van's colour …
  [hw - 0.03, top - 0.17],    // … cream above the belt
  [hw - 0.13, top - 0.035],
  [hw * 0.5, top],
  [0, top + 0.012],
];

export function vanBody(B, paint = WHITE, pmat = M.PAINT, signUV = null) {
  const Pm = [paint, pmat], T = [TRIM, M.PLAIN], Cr = [CREAM, M.PAINT2];
  loft(B, stations(VAN_MAIN, [1.5, -1.5], 0.47, 0.36, vanSection), [T, Pm, Cr, Cr, Cr, Cr], { split: true, low: Pm, high: Cr });
  for (const zw of [1.5, -1.5]) B.box(-0.9, 0.26, zw - 0.47, 0.9, 0.86, zw + 0.47, BLACK, M.PLAIN, { skipTop: true });

  // front: the cream V, round headlights, badge, split windscreen, chrome bumper
  const zf = 2.474;
  B.tri([-0.9, 1.12, zf], [0.9, 1.12, zf], [0, 0.7, zf], CREAM, M.PAINT2, undefined, undefined, undefined, [0, 0, 1]);
  disc(B, [0, 0.86, zf + 0.002], [0, 0, 1], 0.085, 10, CHROME, M.CHROME);
  disc(B, [0, 0.86, zf + 0.004], [0, 0, 1], 0.058, 10, 0x9a5a2a, M.PLAIN); // a cinnamon-bun badge
  for (const s of [1, -1]) {
    disc(B, [0.64 * s, 0.95, zf + 0.002], [0, 0, 1], 0.145, 12, CHROME, M.CHROME);
    disc(B, [0.64 * s, 0.95, zf + 0.004], [0, 0, 1], 0.115, 12, LIGHT, M.LIGHT);
    disc(B, [0.855 * s, 0.95, zf + 0.002], [0, 0, 1], 0.034, 8, AMBER, M.PLAIN);
  }
  decal(B, [0, 1.225, zf], [0, 0, 1], 0.84, 0.05, 0x222326, M.PLAIN);         // fresh-air vent
  decal(B, [0, 1.52, zf], [0, 0, 1], 1.68, 0.54, TRIM, M.PLAIN);              // windscreen surround + centre bar
  for (const s of [1, -1]) {
    decal(B, [0.425 * s, 1.52, zf + 0.003], [0, 0, 1], 0.77, 0.48, GLASS, M.GLASS);
    decal(B, [0.42 * s, 1.31, zf + 0.006], [0, 0, 1], 0.5, 0.016, TRIM, M.PLAIN); // wipers
  }
  B.box(-0.98, 0.42, 2.47, 0.98, 0.56, 2.56, CHROME, M.CHROME);
  decal(B, [0, 0.49, 2.564], [0, 0, 1], 0.48, 0.09, PLATE, M.PLAIN);
  decal(B, [-0.218, 0.49, 2.566], [0, 0, 1], 0.044, 0.09, EU, M.PLAIN);

  // rear: window, tail lights, engine-lid vents, plate, bumper, exhaust
  const zr = -2.494;
  decal(B, [0, 1.61, zr], [0, 0, -1], 1.24, 0.44, TRIM, M.PLAIN);
  decal(B, [0, 1.61, zr - 0.003], [0, 0, -1], 1.16, 0.37, GLASS, M.GLASS);
  for (const s of [1, -1]) {
    decal(B, [0.78 * s, 0.94, zr], [0, 0, -1], 0.16, 0.24, TAIL, M.TAIL);
    decal(B, [0.46 * s, 0.68, zr], [0, 0, -1], 0.28, 0.08, 0x222326, M.PLAIN);
    for (const y of [0.66, 0.7]) decal(B, [0.46 * s, y, zr - 0.002], [0, 0, -1], 0.26, 0.008, 0x55585e, M.PLAIN);
  }
  decal(B, [0, 0.67, zr], [0, 0, -1], 0.48, 0.09, PLATE, M.PLAIN);
  decal(B, [0.218, 0.67, zr - 0.002], [0, 0, -1], 0.044, 0.09, EU, M.PLAIN);
  B.box(-0.98, 0.42, -2.58, 0.98, 0.56, -2.49, CHROME, M.CHROME);
  B.tube([0.62, 0.4, -2.44], [0.62, 0.4, -2.62], 0.036, 0.036, 6, CHROME, M.CHROME);

  // sides: cab door window, the big BULLBILEN board on the cargo area, door lines, handles, mirrors
  for (const s of [1, -1]) {
    const q = [[s * 1.0, 1.17, 2.22], [s * 1.0, 1.17, -2.3], [s * 0.97, 2.03, -2.3], [s * 0.97, 2.03, 2.22]];
    const n = outward(normalOf(q[0], q[1], q[3]), [s, 0, 0]);
    const U = (z) => (2.22 - z) / 4.52, V = (y) => (y - 1.17) / 0.86;
    panel(B, q, U(2.04), U(1.16), V(1.29), V(1.9), n, 0.003, TRIM, M.PLAIN);
    panel(B, q, U(2.0), U(1.2), V(1.33), V(1.86), n, 0.006, GLASS, M.GLASS);
    if (signUV) {
      const [u0, v0, u1, v1] = signUV;
      const uvs = s > 0 ? [[u0, v0], [u0, v1], [u1, v1], [u1, v0]] : [[u1, v0], [u1, v1], [u0, v1], [u0, v0]];
      panel(B, q, U(0.27), U(-1.57), V(1.22), V(2.0), n, 0.004, WHITE, M.SIGN, uvs);
    }
    const doors = s > 0 ? [2.12, 1.1] : [2.12, 1.1, 0.96, -0.62]; // the sliding door is on the kerb side
    for (const zz of doors) {
      decal(B, [1.003 * s, 0.8, zz], [s, 0, 0], 0.014, 0.66, TRIM, M.PLAIN);
      const underSign = signUV && zz < 0.3 && zz > -1.6; // the sign is painted across the sliding door
      panel(B, q, U(zz) - 0.0015, U(zz) + 0.0015, 0.0, underSign ? V(1.21) : 0.97, n, 0.005, TRIM, M.PLAIN);
    }
    decal(B, [1.004 * s, 1.08, 1.27], [s, 0, 0], 0.16, 0.035, CHROME, M.CHROME);
    if (s < 0) decal(B, [-1.004, 1.08, -0.42], [-1, 0, 0], 0.18, 0.035, CHROME, M.CHROME);
    B.box(s > 0 ? 0.98 : -1.12, 1.6, 2.17, s > 0 ? 1.12 : -0.98, 1.63, 2.2, 0x2a2b2e);       // mirror arm
    B.box(s > 0 ? 1.1 : -1.2, 1.53, 2.1, s > 0 ? 1.2 : -1.1, 1.72, 2.2, TRIM, M.PLAIN, { skipBottom: false });
  }
}

export function buildCarGeometry(type, signUV) {
  const B = new GeomBuilder([['aBone', 1], ['aPivot', 3]]);
  const s = CAR_TYPES[type];
  B.cur.aBone = 0; B.cur.aPivot = [0, 0.6, 0];
  if (type === 'sedan') sedanBody(B); else vanBody(B, WHITE, M.PAINT, signUV);
  const [zf, zr] = s.wheelZ;
  const ww = type === 'van' ? 0.26 : 0.24, wx = type === 'van' ? 0.86 : 0.79;
  [[wx, zf, 1], [-wx, zf, 2], [wx, zr, 3], [-wx, zr, 4]].forEach(([x, z, bone]) => {
    B.cur.aBone = bone; B.cur.aPivot = [x, s.wheelR, z];
    wheel(B, x, s.wheelR, z, ww, x > 0, type === 'van' ? 'hubcap' : 'alloy');
  });
  return B.toGeometry(THREE);
}

// the "PIZZA" box on the roof of Sanna's delivery car (car-local coordinates, drawn as its own mesh)
export function buildRoofSign(signUV) {
  const B = new GeomBuilder();
  for (const x of [-0.38, 0.38]) B.box(x - 0.04, 1.42, -0.44, x + 0.04, 1.51, -0.36, DARK);
  B.box(-0.56, 1.5, -0.52, 0.56, 1.88, -0.28, 0xf4efe2, M.PLAIN, { skipBottom: false });
  B.box(-0.57, 1.86, -0.53, 0.57, 1.9, -0.27, 0x2e7a46);
  if (signUV) {
    const [u0, v0, u1, v1] = signUV;
    const uv = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    decal(B, [0, 1.68, -0.274], [0, 0, 1], 1.06, 0.33, WHITE, M.SIGN, uv);
    decal(B, [0, 1.68, -0.526], [0, 0, -1], 1.06, 0.33, WHITE, M.SIGN, uv);
  }
  return B.toGeometry(THREE);
}

// tant Gun's flag: a 1.6 × 1 m cloth starting at the pole (x = 0), printed on both sides
export function buildFlag(uvFront, uvBack) {
  const B = new GeomBuilder();
  const uv = (r) => [[r[0], r[1]], [r[0], r[3]], [r[2], r[3]], [r[2], r[1]]];
  if (uvFront) decal(B, [0.8, 0, 0.004], [0, 0, 1], 1.6, 1.0, WHITE, M.SIGN, uv(uvFront));
  if (uvBack) decal(B, [0.8, 0, -0.004], [0, 0, -1], 1.6, 1.0, WHITE, M.SIGN, uv(uvBack));
  return B.toGeometry(THREE);
}

// People (v0.9: more detail). One shared, instanced geometry; the shader moves the bones and colours
// the slots (shirt, pants, skin, hair, accent). Optional parts – long hair, a bun, a beard, glasses,
// a cap, an apron, a baker's hat, a jacket – are always in the geometry and folded away by the shader
// unless the person's style mask (STYLE below) has that bit. (v1.1) swim: dressed for the beach – bare
// arms, legs and feet and no belt, the shirt and the pants become the swimsuit (colour slots 6–9).
export const STYLE = { long: 1, bun: 2, beard: 4, glasses: 8, cap: 16, apron: 32, baker: 64, jacket: 128, swim: 256 };
export function buildHumanGeometry() {
  const B = new GeomBuilder([['aBS', 3], ['aPivot', 3]]);
  // bone: 0 torso, 1 head, 3/4 arms, 5/6 legs · sel: 0 fixed colour, 1 shirt, 2 pants, 3 skin, 4 hair, 5 accent,
  // and the ones swimwear changes: 6 sleeve (shirt), 7 leg (pants), 8 shoe (fixed) turn to skin, 9 belt (fixed) to pants
  const part = (bone, sel, pivot, opt = 0) => { B.cur.aBS = [bone, sel, opt]; B.cur.aPivot = pivot; }; // (z: the optional part's style bit)
  const SOLE = 0xe9e4da, SHOE = 0x2a2420, LEATHER = 0x2a2420, EYE = 0xf4f1ea, PUPIL = 0x1d1b1a, LIPS = 0x9a5a4c, FRAME = 0x26282c, BAKER = 0xf6f3ec;
  // ---- legs (thigh, shin, shoe with a light sole)
  for (const [sx, bone] of [[1, 5], [-1, 6]]) {
    const x = 0.105 * sx, P = [x, 0.92, 0];
    part(bone, 7, P);
    B.box(x - 0.088, 0.5, -0.098, x + 0.088, 0.96, 0.098, WHITE);
    B.box(x - 0.078, 0.11, -0.085, x + 0.078, 0.52, 0.085, WHITE);
    part(bone, 8, P);
    B.box(x - 0.088, 0.03, -0.11, x + 0.088, 0.13, 0.15, SHOE, M.PLAIN, { skipBottom: true });
    B.box(x - 0.092, 0.0, -0.115, x + 0.092, 0.035, 0.172, SOLE, M.PLAIN, { skipBottom: false }); // (seen when someone lies down)
  }
  // ---- torso: hips, belt, waist, chest
  const T0 = [0, 0, 0];
  part(0, 2, T0);
  B.box(-0.205, 0.86, -0.125, 0.205, 1.0, 0.125, WHITE, M.PLAIN, { skipBottom: false });
  part(0, 9, T0);
  B.box(-0.21, 0.97, -0.13, 0.21, 1.02, 0.13, LEATHER);
  B.box(-0.035, 0.972, 0.13, 0.035, 1.018, 0.136, 0xc9b27a);
  part(0, 1, T0);
  B.box(-0.2, 1.01, -0.124, 0.2, 1.26, 0.124, WHITE);
  B.box(-0.245, 1.24, -0.14, 0.245, 1.5, 0.14, WHITE);
  B.box(-0.22, 1.49, -0.12, 0.22, 1.53, 0.12, WHITE);                     // shoulders
  B.box(-0.075, 1.5, 0.06, 0.075, 1.54, 0.125, WHITE);                    // collar
  part(0, 3, T0);
  B.box(-0.058, 1.5, -0.058, 0.058, 1.6, 0.058, WHITE);                   // neck
  // jacket (open at the front, over the shirt)
  part(0, 5, T0, STYLE.jacket);
  B.box(-0.258, 0.98, 0.128, -0.075, 1.53, 0.152, WHITE);
  B.box(0.075, 0.98, 0.128, 0.258, 1.53, 0.152, WHITE);
  B.box(-0.258, 0.98, -0.152, 0.258, 1.53, -0.128, WHITE);
  B.box(-0.258, 0.98, -0.13, -0.24, 1.53, 0.13, WHITE);
  B.box(0.24, 0.98, -0.13, 0.258, 1.53, 0.13, WHITE);
  B.box(-0.13, 1.5, 0.11, -0.06, 1.58, 0.156, WHITE);                     // collar flaps
  B.box(0.06, 1.5, 0.11, 0.13, 1.58, 0.156, WHITE);
  // apron (shop, bakery)
  part(0, 5, T0, STYLE.apron);
  B.box(-0.185, 0.55, 0.13, 0.185, 1.36, 0.152, WHITE);
  B.box(-0.03, 1.36, 0.13, 0.03, 1.53, 0.15, WHITE);
  B.box(-0.21, 1.0, -0.13, 0.21, 1.03, 0.13, WHITE);                     // the ties round the waist
  // ---- head
  const NECK = [0, 1.53, 0];
  part(1, 3, NECK);
  B.box(-0.13, 1.62, -0.13, 0.13, 1.86, 0.13, WHITE, M.PLAIN, { skipTop: true });
  B.box(-0.115, 1.56, -0.11, 0.115, 1.63, 0.122, WHITE);                  // jaw
  B.box(-0.022, 1.665, 0.13, 0.022, 1.725, 0.162, WHITE);                 // nose
  B.box(-0.148, 1.66, -0.025, -0.13, 1.745, 0.03, WHITE);                 // ears
  B.box(0.13, 1.66, -0.025, 0.148, 1.745, 0.03, WHITE);
  part(1, 0, NECK);
  for (const sx of [1, -1]) {
    B.box(sx > 0 ? 0.028 : -0.088, 1.695, 0.13, sx > 0 ? 0.088 : -0.028, 1.74, 0.134, EYE);
    B.box(sx > 0 ? 0.044 : -0.074, 1.7, 0.134, sx > 0 ? 0.074 : -0.044, 1.735, 0.137, PUPIL);
  }
  B.box(-0.042, 1.612, 0.122, 0.042, 1.628, 0.127, LIPS);
  part(1, 4, NECK);
  for (const sx of [1, -1]) B.box(sx > 0 ? 0.026 : -0.094, 1.755, 0.13, sx > 0 ? 0.094 : -0.026, 1.772, 0.138, WHITE); // eyebrows
  B.box(-0.142, 1.82, -0.146, 0.142, 1.91, 0.142, WHITE);                 // hair: top
  B.box(-0.142, 1.6, -0.152, 0.142, 1.83, -0.12, WHITE);                  //       back
  B.box(-0.146, 1.74, -0.13, -0.128, 1.84, 0.07, WHITE);                  //       sides
  B.box(0.128, 1.74, -0.13, 0.146, 1.84, 0.07, WHITE);
  B.box(-0.135, 1.79, 0.11, 0.07, 1.845, 0.15, WHITE);                    //       fringe
  part(1, 4, NECK, STYLE.long);
  B.box(-0.155, 1.36, -0.172, 0.155, 1.84, -0.12, WHITE);
  B.box(-0.158, 1.48, -0.13, -0.128, 1.8, 0.05, WHITE);
  B.box(0.128, 1.48, -0.13, 0.158, 1.8, 0.05, WHITE);
  part(1, 4, NECK, STYLE.bun);
  B.box(-0.065, 1.84, -0.2, 0.065, 1.97, -0.08, WHITE);
  part(1, 4, NECK, STYLE.beard);
  B.box(-0.112, 1.545, 0.05, 0.112, 1.64, 0.14, WHITE);
  B.box(-0.135, 1.58, -0.03, -0.11, 1.71, 0.11, WHITE);
  B.box(0.11, 1.58, -0.03, 0.135, 1.71, 0.11, WHITE);
  B.box(-0.058, 1.632, 0.128, 0.058, 1.656, 0.146, WHITE);                // moustache
  part(1, 0, NECK, STYLE.glasses);
  for (const sx of [1, -1]) {
    const a = sx > 0 ? 0.022 : -0.096, b = sx > 0 ? 0.096 : -0.022;
    B.box(a, 1.742, 0.136, b, 1.754, 0.146, FRAME);
    B.box(a, 1.686, 0.136, b, 1.696, 0.146, FRAME);
    B.box(sx > 0 ? b - 0.01 : a, 1.686, 0.136, sx > 0 ? b : a + 0.01, 1.754, 0.146, FRAME);
    B.box(sx > 0 ? 0.13 : -0.146, 1.738, -0.02, sx > 0 ? 0.146 : -0.13, 1.75, 0.146, FRAME);   // the arm to the ear
  }
  B.box(-0.022, 1.725, 0.138, 0.022, 1.735, 0.148, FRAME);                 // bridge
  part(1, 5, NECK, STYLE.cap);
  B.box(-0.152, 1.83, -0.155, 0.152, 1.97, 0.152, WHITE);
  B.box(-0.13, 1.83, 0.15, 0.13, 1.852, 0.26, WHITE);
  part(1, 0, NECK, STYLE.baker);
  B.box(-0.148, 1.84, -0.152, 0.148, 1.93, 0.152, BAKER);
  B.box(-0.17, 1.93, -0.172, 0.17, 2.14, 0.172, BAKER);
  // ---- arms: sleeve, forearm, hand with a thumb; the jacket's sleeve over it
  for (const [sx, bone] of [[1, 3], [-1, 4]]) {
    const x = 0.31 * sx, P = [x, 1.47, 0];
    part(bone, 6, P);
    B.box(x - 0.066, 1.16, -0.076, x + 0.066, 1.52, 0.076, WHITE);
    part(bone, 3, P);
    B.box(x - 0.054, 0.9, -0.063, x + 0.054, 1.18, 0.063, WHITE);
    B.box(x - 0.05, 0.79, -0.052, x + 0.05, 0.91, 0.058, WHITE, M.PLAIN, { skipBottom: false });
    B.box(x - sx * 0.07, 0.84, 0.0, x - sx * 0.04, 0.9, 0.05, WHITE);
    part(bone, 5, P, STYLE.jacket);
    B.box(x - 0.074, 1.0, -0.084, x + 0.074, 1.535, 0.084, WHITE);
  }
  return B.toGeometry(THREE);
}

// The bikes, built in parts that move: the frame (with the rack, the rear mudguard, the chain case
// and the cargo box on Arne's delivery bike, v0.6), the two wheels (each around its hub) and the
// steering (fork, front mudguard and handlebar, around the pivot on the head tube). (v1.0) the red
// racing bike Jonte leaves behind; (v1.1) new wheels – a round tyre, the rim and crossed spokes that
// stay inside the rim (the old spokes stuck out through the tyre) – and the racer a road-bike frame
// with two big wheels of its own.
// Local axes: +z forward, y up, +x the bike's left. Sizes in metres; the rear hub is at z = -0.6.
export const BIKE = BIKE_GEO;
export const RACER_GEO = { ...BIKE_GEO, frontR: 0.34, pivot: [0, 0.75, 0.55] };

// a ring round the x axis (the axle) at radius R, its section a circle of radius rr: smooth shaded,
// colour(v) for the angle v round the section (0: outward, ±π/2: the two sides)
function ringX(B, R, rr, nu, nv, colour, m = M.PLAIN) {
  const P = (u, v) => [rr * Math.sin(v), (R + rr * Math.cos(v)) * Math.cos(u), (R + rr * Math.cos(v)) * Math.sin(u)];
  const N = (u, v) => [Math.sin(v), Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u)];
  for (let i = 0; i < nu; i++) {
    const u0 = (i / nu) * Math.PI * 2, u1 = ((i + 1) / nu) * Math.PI * 2;
    for (let j = 0; j < nv; j++) {
      const v0 = (j / nv) * Math.PI * 2, v1 = ((j + 1) / nv) * Math.PI * 2;
      const c0 = toLinear(colour(v0)), c1 = toLinear(colour(v1));
      B.triN(P(u0, v0), P(u1, v0), P(u1, v1), N(u0, v0), N(u1, v0), N(u1, v1), c0, c0, c1, m);
      B.triN(P(u0, v0), P(u1, v1), P(u0, v1), N(u0, v0), N(u1, v1), N(u0, v1), c0, c1, c1, m);
    }
  }
}

// a flat band round the x axis through (0, cy, cz), between radii r0 and r1 and w wide: the rim, or
// part of the way round (angles a0..a1, 0 = up, +π/2 = forward) a mudguard
function bandX(B, cy, cz, r0, r1, w, hex, m, a0 = 0, a1 = Math.PI * 2, n = 30) {
  const steps = Math.max(2, Math.ceil((n * (a1 - a0)) / (Math.PI * 2)));
  const p = (r, u, x) => [x, cy + r * Math.cos(u), cz + r * Math.sin(u)];
  for (let i = 0; i < steps; i++) {
    const u0 = a0 + ((a1 - a0) * i) / steps, u1 = a0 + ((a1 - a0) * (i + 1)) / steps, um = (u0 + u1) / 2;
    const out = [0, Math.cos(um), Math.sin(um)], hw = w / 2;
    B.quad(p(r1, u0, -hw), p(r1, u1, -hw), p(r1, u1, hw), p(r1, u0, hw), hex, m, null, out);
    B.quad(p(r0, u0, -hw), p(r0, u1, -hw), p(r0, u1, hw), p(r0, u0, hw), hex, m, null, [0, -out[1], -out[2]]);
    for (const s of [-1, 1]) B.quad(p(r0, u0, s * hw), p(r1, u0, s * hw), p(r1, u1, s * hw), p(r0, u1, s * hw), hex, m, null, [s, 0, 0]);
  }
}

// a bike wheel round its hub (the x axis): the tyre (o.wall: cream sidewalls), the rim, the hub with
// its two flanges and the axle out to the frame, and spokes from the flanges to the rim – crossed
// (o.cross) like on a real wheel. Nothing reaches outside the tyre.
function bikeWheel(r, o) {
  const W = new GeomBuilder();
  const tt = o.tyre, rimOut = r - 2 * tt + 0.012, rimIn = rimOut - o.rimDepth;
  ringX(W, r - tt, tt, 30, 8, (v) => (o.wall && Math.abs(Math.sin(v)) > 0.6 ? o.wall : TIRE));
  bandX(W, 0, 0, rimIn, rimOut, tt * 1.4, o.rim, o.rimMat ?? M.CHROME);
  W.hcyl(0, 0, 0, o.axle * 2, 0.008, 'x', 6, 0x9aa0a6, M.CHROME);
  W.hcyl(0, 0, 0, o.flange * 2, 0.021, 'x', 10, o.hub, M.CHROME);
  for (const s of [-1, 1]) W.hcyl(s * o.flange, 0, 0, 0.006, 0.034, 'x', 12, o.hub, M.CHROME);
  const n = o.spokes, re = rimIn + 0.002;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, cross = (Math.floor(i / 2) % 2 ? 1 : -1) * o.cross;
    const ah = (i / n) * Math.PI * 2, ar = ah + cross;
    W.tube([side * o.flange, Math.cos(ah) * 0.03, Math.sin(ah) * 0.03], [side * 0.004, Math.cos(ar) * re, Math.sin(ar) * re], o.spokeR, o.spokeR, 4, o.spoke, M.CHROME);
  }
  // an amber reflector clipped to two spokes (Arne's bike)
  if (o.reflector) W.rbox(0, Math.cos(0.3) * r * 0.42, Math.sin(0.3) * r * 0.42, 0.016, 0.07, 0.03, 0, 0xf0a02a, M.PLAIN, -0.3);
  return W.toGeometry(THREE);
}

export function buildBike(signUV, opt = {}) {
  return opt.racer ? buildRacer() : buildArnes(signUV);
}

// Arne's old delivery bike from Sjuby Konditori: a green step-through frame, mudguards, a rack, a
// chain case and the cargo box over the small front wheel
function buildArnes(signUV) {
  const FRAME = 0x23452f, CREAMBOX = 0xf1e3c4, BROWN = 0x7a4a26, DARK = 0x2d3238;
  const tube = (B, a, b, r = 0.024, c = FRAME) => B.tube(a, b, r, r, 6, c, M.PAINT);
  const G = BIKE_GEO;
  const F = new GeomBuilder();
  const R = [0, G.rearR, G.rearZ], BB = [0, 0.3, -0.06], S = [0, 0.86, -0.27], Hb = [0, 0.62, 0.5], Ht = [0, 0.92, 0.44];
  // the stays go round the outside of the rear tyre to the ends of the axle
  for (const sx of [-0.07, 0.07]) { tube(F, [sx, R[1], R[2]], [sx * 0.64, BB[1], BB[2]], 0.016); tube(F, [sx, R[1], R[2]], [sx * 0.5, 0.82, -0.26], 0.015); }
  tube(F, BB, S); tube(F, BB, Hb, 0.03); tube(F, [0, 0.66, -0.2], [0, 0.82, 0.46], 0.026); tube(F, Hb, Ht, 0.032);
  tube(F, S, [0, G.saddle[1] - 0.02, G.saddle[2]], 0.015, 0x9aa0a6);                         // seat post
  F.box(-0.08, G.saddle[1] - 0.03, G.saddle[2] - 0.14, 0.08, G.saddle[1] + 0.03, G.saddle[2] + 0.12, 0x3b2a1e, M.PLAIN, { skipBottom: false });
  for (const sx of [-0.05, 0.05]) F.cyl(sx, G.saddle[2] - 0.09, G.saddle[1] - 0.085, G.saddle[1] - 0.03, 0.017, 0.017, 8, 0x9aa0a6, M.CHROME, true); // the saddle springs
  F.hcyl(0, BB[1], BB[2], 0.09, 0.036, 'x', 10, DARK);                                             // bottom bracket
  // the chain case on the right-hand side, outside the wheel: round at both ends
  F.rbox(-0.075, BB[1] - 0.06, (R[2] + BB[2]) / 2, 0.034, 0.12, BB[2] - R[2], 0, DARK, M.PLAIN, Math.atan2(R[1] - BB[1], BB[2] - R[2]));
  F.hcyl(-0.075, R[1], R[2], 0.034, 0.062, 'x', 14, DARK);
  F.hcyl(-0.075, BB[1], BB[2], 0.034, 0.105, 'x', 16, DARK);
  // cranks and pedals (one forward and down, one back and up)
  for (const s of [-1, 1]) {
    const ex = BB[1] + s * 0.08, ez = BB[2] - s * 0.15, x = -s * 0.108, xa = x - s * 0.006, xb = x - s * 0.088;
    tube(F, [x, BB[1], BB[2]], [x, ex, ez], 0.012, 0xb7bcc2);
    F.box(Math.min(xa, xb), ex - 0.014, ez - 0.045, Math.max(xa, xb), ex + 0.014, ez + 0.045, 0x1d1f22, M.PLAIN, { skipBottom: false });
  }
  // the rear mudguard, the rack over it (struts down to the axle ends) and a red reflector
  bandX(F, R[1], R[2], G.rearR + 0.022, G.rearR + 0.03, 0.082, FRAME, M.PAINT, -1.85, 0.42, 36);
  F.box(-0.15, 0.745, -0.86, 0.15, 0.765, -0.4, DARK, M.PLAIN, { skipBottom: false });
  tube(F, [0, 0.755, -0.42], [0, 0.82, -0.26], 0.012, DARK);
  for (const sx of [-0.12, 0.12]) tube(F, [sx, 0.745, -0.83], [sx * 0.6, R[1] + 0.02, R[2] - 0.01], 0.008, DARK);
  F.box(-0.045, 0.7, -0.875, 0.045, 0.74, -0.86, 0xd41a14, M.PLAIN, { skipBottom: false });
  // the cargo box on its rack over the front wheel
  const bx0 = -0.29, bx1 = 0.29, by0 = 0.56, by1 = 0.92, bz0 = 0.5, bz1 = 1.04;
  F.box(bx0, by0, bz0, bx1, by1, bz1, CREAMBOX, M.BOARDS, { skipBottom: false });
  F.box(bx0 - 0.012, by1 - 0.035, bz0 - 0.012, bx1 + 0.012, by1 + 0.01, bz1 + 0.012, BROWN);
  F.box(bx0 - 0.012, by0 - 0.01, bz0 - 0.012, bx1 + 0.012, by0 + 0.03, bz1 + 0.012, BROWN);
  for (const sx of [-0.2, 0.2]) tube(F, [sx, by0, 0.56], [0, 0.66, 0.48], 0.014, DARK);
  F.hcyl(0, 0.72, bz1 + 0.045, 0.09, 0.055, 'z', 8, 0xd9dde2, M.CHROME);                       // the lamp
  F.hcyl(0, 0.72, bz1 + 0.092, 0.006, 0.045, 'z', 8, 0xfff2d2, M.LIGHT);
  if (signUV) {
    const [u0, v0, u1, v1] = signUV;
    const uv = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    decal(F, [bx1 + 0.004, 0.74, (bz0 + bz1) / 2], [1, 0, 0], 0.46, 0.21, WHITE, M.SIGN, uv);
    decal(F, [bx0 - 0.004, 0.74, (bz0 + bz1) / 2], [-1, 0, 0], 0.46, 0.21, WHITE, M.SIGN, uv);
    decal(F, [0, 0.74, bz1 + 0.004], [0, 0, 1], 0.46, 0.21, WHITE, M.SIGN, uv);
  }
  // the steering, round the pivot on the head tube: fork, front mudguard, the upright handlebar, a bell
  const T = new GeomBuilder();
  const [px, py, pz] = G.pivot, rel = (q) => [q[0] - px, q[1] - py, q[2] - pz];
  for (const sx of [-0.055, 0.055]) tube(T, rel([sx, 0.62, 0.5]), rel([sx, G.frontR, G.frontZ]), 0.016);
  T.box(-0.07, 0.6 - py, 0.47 - pz, 0.07, 0.64 - py, 0.53 - pz, FRAME, M.PAINT);                  // fork crown
  bandX(T, G.frontR - py, G.frontZ - pz, G.frontR + 0.02, G.frontR + 0.028, 0.074, FRAME, M.PAINT, -0.75, 1.35, 30);
  tube(T, rel([0, 0.92, 0.44]), rel([0, 1.04, 0.4]), 0.018, 0x9aa0a6);
  tube(T, rel([-0.31, 1.04, 0.33]), rel([0.31, 1.04, 0.33]), 0.016, 0x9aa0a6);
  tube(T, rel([-0.04, 1.04, 0.4]), rel([0.04, 1.04, 0.33]), 0.014, 0x9aa0a6);
  for (const sx of [-1, 1]) tube(T, rel([sx * 0.31, 1.04, 0.33]), rel([sx * 0.4, 1.035, 0.3]), 0.022, 0x1d1f22);
  T.cyl(0.22 - px, 0.33 - pz, 1.05 - py, 1.09 - py, 0.032, 0.03, 8, 0xd9dde2, M.CHROME, true); // the bell
  const wheel = { tyre: 0.03, wall: 0xe4d6b6, rim: 0xc9ccd0, rimDepth: 0.016, hub: 0xb0b5ba, flange: 0.03, spokes: 20, cross: 0.42, spokeR: 0.0042, spoke: 0xb7bcc2, reflector: true };
  return {
    geo: G, frame: F.toGeometry(THREE), steer: T.toGeometry(THREE),
    rear: bikeWheel(G.rearR, { ...wheel, axle: 0.075 }), front: bikeWheel(G.frontR, { ...wheel, axle: 0.065 }),
  };
}

// the red racing bike: a road-bike frame, two big wheels on deep black rims, drop handlebars, a
// bottle in its cage, the chain on the right-hand side
function buildRacer() {
  const FRAME = 0xc4191b, WHITEP = 0xf2efe6, BLACK = 0x1d1f22, SILVER = 0x9aa0a6;
  const tube = (B, a, b, r = 0.022, c = FRAME) => B.tube(a, b, r, r, 6, c, M.PAINT);
  const G = RACER_GEO;
  const F = new GeomBuilder();
  const R = [0, G.rearR, G.rearZ], BB = [0, 0.27, -0.06], S = [0, 0.84, -0.25], Hb = [0, 0.75, 0.55], Ht = [0, 0.9, 0.51];
  for (const sx of [-0.065, 0.065]) { tube(F, [sx, R[1], R[2]], [sx * 0.6, BB[1], BB[2]], 0.013); tube(F, [sx, R[1], R[2]], [sx * 0.45, 0.82, -0.245], 0.011); }
  tube(F, BB, S); tube(F, BB, Hb, 0.026); tube(F, S, Ht, 0.02); tube(F, Hb, Ht, 0.028);
  const along = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  tube(F, along(BB, Hb, 0.68), along(BB, Hb, 0.8), 0.028, WHITEP);                            // white bands
  tube(F, along(BB, S, 0.62), along(BB, S, 0.72), 0.024, WHITEP);
  tube(F, S, [0, G.saddle[1] - 0.02, G.saddle[2]], 0.012, SILVER);                            // seat post
  F.box(-0.06, G.saddle[1] - 0.03, G.saddle[2] - 0.14, 0.06, G.saddle[1] + 0.02, G.saddle[2] + 0.12, BLACK, M.PLAIN, { skipBottom: false });
  // the bottle in its cage on the down tube
  const dn = [0, (Hb[2] - BB[2]), -(Hb[1] - BB[1])], dl = Math.hypot(dn[1], dn[2]);
  const off = (q) => [q[0], q[1] + (dn[1] / dl) * 0.055, q[2] + (dn[2] / dl) * 0.055];
  F.tube(off(along(BB, Hb, 0.24)), off(along(BB, Hb, 0.6)), 0.034, 0.034, 10, 0x3a8ad8, M.PLAIN, true);
  F.tube(off(along(BB, Hb, 0.6)), off(along(BB, Hb, 0.65)), 0.014, 0.014, 6, WHITEP, M.PLAIN, true);
  // the drivetrain on the right-hand side: chainring, the cogs at the back, the chain, cranks, pedals
  F.hcyl(0, BB[1], BB[2], 0.08, 0.032, 'x', 10, BLACK);
  F.hcyl(-0.06, BB[1], BB[2], 0.008, 0.1, 'x', 18, 0x3a3c41, M.CHROME);
  F.hcyl(-0.05, R[1], R[2], 0.016, 0.045, 'x', 12, SILVER, M.CHROME);
  for (const [y0, y1] of [[R[1] + 0.045, BB[1] + 0.1], [R[1] - 0.045, BB[1] - 0.1]]) F.tube([-0.058, y0, R[2]], [-0.058, y1, BB[2]], 0.005, 0.005, 4, 0x2a2b2f, M.PLAIN);
  for (const s of [-1, 1]) {
    const ex = BB[1] + s * 0.08, ez = BB[2] - s * 0.15, x = -s * 0.085, xa = x - s * 0.006, xb = x - s * 0.072;
    tube(F, [x, BB[1], BB[2]], [x, ex, ez], 0.011, SILVER);
    F.box(Math.min(xa, xb), ex - 0.01, ez - 0.035, Math.max(xa, xb), ex + 0.01, ez + 0.035, BLACK, M.PLAIN, { skipBottom: false });
  }
  // the steering: fork, stem, drop handlebars with black tape and brake hoods
  const T = new GeomBuilder();
  const [px, py, pz] = G.pivot, rel = (q) => [q[0] - px, q[1] - py, q[2] - pz];
  for (const sx of [-0.05, 0.05]) tube(T, rel([sx * 0.9, 0.73, 0.555]), rel([sx, G.frontR, G.frontZ]), 0.012);
  T.box(-0.055, 0.715 - py, 0.53 - pz, 0.055, 0.75 - py, 0.58 - pz, FRAME, M.PAINT);
  tube(T, rel([0, 0.9, 0.51]), rel([0, 0.95, 0.5]), 0.016, SILVER);
  tube(T, rel([0, 0.95, 0.5]), rel([0, 0.95, 0.6]), 0.016, SILVER);
  tube(T, rel([-0.2, 0.95, 0.6]), rel([0.2, 0.95, 0.6]), 0.015, BLACK);
  for (const sx of [-1, 1]) {
    const x = sx * 0.2;
    tube(T, rel([x, 0.95, 0.6]), rel([x, 0.93, 0.68]), 0.015, BLACK);
    tube(T, rel([x, 0.93, 0.68]), rel([x, 0.85, 0.7]), 0.015, BLACK);
    tube(T, rel([x, 0.85, 0.7]), rel([x, 0.8, 0.64]), 0.015, BLACK);
    tube(T, rel([x, 0.8, 0.64]), rel([x, 0.8, 0.56]), 0.015, BLACK);
    T.box(x - 0.016, 0.94 - py, 0.66 - pz, x + 0.016, 0.98 - py, 0.71 - pz, 0x2a2b2f, M.PLAIN);   // brake hoods
  }
  const wheel = { tyre: 0.016, wall: null, rim: BLACK, rimMat: M.PAINT, rimDepth: 0.032, hub: 0x3a3c41, flange: 0.028, spokes: 20, cross: 0.22, spokeR: 0.0036, spoke: SILVER };
  return {
    geo: G, frame: F.toGeometry(THREE), steer: T.toGeometry(THREE),
    rear: bikeWheel(G.rearR, { ...wheel, axle: 0.068 }), front: bikeWheel(G.frontR, { ...wheel, axle: 0.055 }),
  };
}

// Melker's phone: screen on +z (it is turned to face him)
export function buildPhone() {
  const B = new GeomBuilder();
  B.box(-0.042, -0.08, -0.006, 0.042, 0.08, 0.006, 0x1a1b1e, M.PLAIN, { skipBottom: false });
  B.quad([-0.036, -0.07, 0.0065], [-0.036, 0.07, 0.0065], [0.036, 0.07, 0.0065], [0.036, -0.07, 0.0065], 0x9fd2ff, M.LIGHT, null, [0, 0, 1]);
  return B.toGeometry(THREE);
}

// a bunch of keys on a ring with a red fob (a little larger than life, so you can spot them)
export function buildKeys() {
  const B = new GeomBuilder();
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI * 2, a1 = ((i + 1) / 10) * Math.PI * 2;
    B.tube([Math.cos(a0) * 0.035, 0.006, Math.sin(a0) * 0.035], [Math.cos(a1) * 0.035, 0.006, Math.sin(a1) * 0.035], 0.005, 0.005, 5, 0xc9ccd0, M.CHROME);
  }
  B.box(0.02, 0, -0.012, 0.13, 0.008, 0.012, 0xd8b45a, M.CHROME, { skipBottom: false });
  B.box(0.1, 0, -0.022, 0.13, 0.008, 0.022, 0xd8b45a, M.CHROME, { skipBottom: false });
  B.box(-0.03, 0, 0.03, 0.0, 0.008, 0.12, 0xc9ccd0, M.CHROME, { skipBottom: false });
  B.box(-0.06, 0, -0.1, -0.01, 0.022, -0.035, 0xd2342c, M.PLAIN, { skipBottom: false });
  return B.toGeometry(THREE);
}

// ------------------------------------------------------------------ the bun party (v1.0)
// A Sjubybulle: a round knot of dough, a darker swirl on top and a few grains of pearl sugar
function bunInto(B, x, y, z, s = 1, k = 0) {
  const tone = [0xb5722e, 0xa9692a, 0xbd7b34][k % 3];
  B.cyl(x, z, y, y + 0.035 * s, 0.062 * s, 0.056 * s, 8, tone, M.PLAIN);
  B.cyl(x, z, y + 0.035 * s, y + 0.058 * s, 0.056 * s, 0.026 * s, 8, 0x9a5a22, M.PLAIN, true);
  for (let i = 0; i < 3; i++) {
    const a = k * 1.7 + i * 2.1, r = 0.028 * s;
    B.box(x + Math.cos(a) * r - 0.007, y + 0.05 * s, z + Math.sin(a) * r - 0.007, x + Math.cos(a) * r + 0.007, y + 0.062 * s, z + Math.sin(a) * r + 0.007, 0xf6f3ea);
  }
}

// a string of little flags that sags between two points, the flags hanging under it (both faces)
function buntingInto(B, a, b, sag, cols) {
  const n = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.45));
  const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
  const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, nx = -uz, nz = ux;
  for (let i = 0; i < n; i++) {
    const p0 = at(i / n), p1 = at((i + 1) / n);
    B.tube(p0, p1, 0.008, 0.008, 4, 0x2a2b2f, M.PLAIN);
    if (i === 0) continue;
    const c = at(i / n), w = 0.15, c0 = cols[i % cols.length];
    const l0 = [c[0] - ux * w, c[1], c[2] - uz * w], r0 = [c[0] + ux * w, c[1], c[2] + uz * w], tip = [c[0], c[1] - 0.34, c[2]];
    B.tri(l0, r0, tip, c0, M.PLAIN, undefined, undefined, undefined, [nx, 0, nz]);
    B.tri(r0, l0, tip, c0, M.PLAIN, undefined, undefined, undefined, [-nx, 0, -nz]);
  }
}

// the party on the square in front of Sjuby Konditori: the long table with a tablecloth (BULLFESTEN
// on its front), plates of buns, a bun wreath, coffee, balloons and flags strung to the trees.
// World coordinates; render.js shows it while the party is up.
export function buildFest(T, groundY, bannerUV) {
  const B = new GeomBuilder();
  const y0 = groundY, top = y0 + 0.76;
  const PINK = 0xe58fa8, CLOTH = 0xf6f3ea;
  // the trestle table under a white cloth with a pink hem
  for (const x of [T.x0 + 0.2, (T.x0 + T.x1) / 2, T.x1 - 0.2]) for (const z of [T.z0 + 0.12, T.z1 - 0.12]) B.box(x - 0.03, y0, z - 0.03, x + 0.03, top, z + 0.03, 0x8a6440);
  B.box(T.x0 - 0.06, top, T.z0 - 0.06, T.x1 + 0.06, top + 0.03, T.z1 + 0.06, CLOTH, M.PLAIN, { skipBottom: false });
  B.box(T.x0 - 0.07, top - 0.45, T.z0 - 0.07, T.x1 + 0.07, top + 0.03, T.z0 - 0.05, CLOTH);            // the cloth hangs down in front…
  B.box(T.x0 - 0.07, top - 0.45, T.z1 + 0.05, T.x1 + 0.07, top + 0.03, T.z1 + 0.07, CLOTH);            // … and behind
  B.box(T.x0 - 0.075, top - 0.45, T.z0 - 0.075, T.x1 + 0.075, top - 0.37, T.z0 - 0.065, PINK);
  B.box(T.x0 - 0.075, top - 0.45, T.z1 + 0.065, T.x1 + 0.075, top - 0.37, T.z1 + 0.075, PINK);
  for (const x of [T.x0 - 0.07, T.x1 + 0.05]) B.box(x, top - 0.45, T.z0 - 0.05, x + 0.02, top + 0.03, T.z1 + 0.05, CLOTH);
  if (bannerUV) {
    const [u0, v0, u1, v1] = bannerUV, uv = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    decal(B, [(T.x0 + T.x1) / 2, top - 0.17, T.z0 - 0.08], [0, 0, -1], 3.4, 0.34, WHITE, M.SIGN, uv);
  }
  // plates of buns along the table, a bun wreath on a stand in the middle, coffee pots and cups
  const zc = (T.z0 + T.z1) / 2, mid = (T.x0 + T.x1) / 2;
  let k = 0;
  for (let i = 0; i < 6; i++) {
    const x = T.x0 + 0.65 + i * ((T.x1 - T.x0 - 1.3) / 5);
    if (Math.abs(x - mid) < 0.5) continue;
    B.cyl(x, zc, top + 0.03, top + 0.045, 0.2, 0.21, 12, 0xffffff, M.PLAIN, true);
    bunInto(B, x, top + 0.045, zc, 1, k++);
    for (let j = 0; j < 6; j++) bunInto(B, x + Math.cos(j * 1.047) * 0.115, top + 0.045, zc + Math.sin(j * 1.047) * 0.115, 0.92, k++);
  }
  B.cyl(mid, zc, top + 0.03, top + 0.16, 0.05, 0.05, 8, 0xd9dde2, M.CHROME);
  B.cyl(mid, zc, top + 0.16, top + 0.175, 0.3, 0.3, 14, 0xffffff, M.PLAIN, true);
  for (let j = 0; j < 11; j++) bunInto(B, mid + Math.cos(j * 0.571) * 0.21, top + 0.175, zc + Math.sin(j * 0.571) * 0.21, 1.05, k++);
  for (const x of [T.x0 + 1.25, T.x1 - 1.25]) {
    B.cyl(x, zc - 0.28, top + 0.03, top + 0.25, 0.075, 0.065, 10, 0xd9dde2, M.CHROME);
    B.cyl(x, zc - 0.28, top + 0.25, top + 0.29, 0.065, 0.02, 10, 0x2a2b2f, M.PLAIN, true);
    B.tube([x + 0.06, top + 0.12, zc - 0.28], [x + 0.14, top + 0.2, zc - 0.28], 0.012, 0.008, 5, 0xd9dde2, M.CHROME);
    for (const dx of [-0.35, 0.3, 0.6]) B.cyl(x + dx, zc + 0.25, top + 0.03, top + 0.09, 0.035, 0.04, 8, 0xffffff, M.PLAIN, true);
  }
  // balloons at the two front corners
  const balloon = (x, z, h, c) => {
    B.tube([x, top + 0.03, z], [x, h - 0.2, z], 0.004, 0.004, 3, 0xdddddd, M.PLAIN);
    B.ico(x, h, z, 0.2, 1.18, c, M.PLAIN, x * 3 + z);
  };
  for (const [x, s] of [[T.x0, -1], [T.x1, 1]]) {
    balloon(x + s * 0.02, T.z0 + 0.05, y0 + 2.3, PINK);
    balloon(x + s * 0.18, T.z0 + 0.2, y0 + 2.05, 0xe5b923);
    balloon(x - s * 0.1, T.z0 + 0.25, y0 + 2.5, 0x86acd1);
  }
  // flags from the konditori's awning out to the two trees, and across the square between them,
  // with a BULLFESTEN banner hanging from the middle of that one (high enough to walk under)
  const cols = [PINK, 0xf6ead2, 0xe5b923, 0x86acd1];
  const awW = [-11.4, y0 + 2.72, 17.6], awE = [-0.6, y0 + 2.72, 17.6], trW = [-11, y0 + 3.2, 5], trE = [6, y0 + 3.2, 4];
  buntingInto(B, awW, trW, 0.45, cols);
  buntingInto(B, awE, trE, 0.45, cols);
  buntingInto(B, trW, trE, 0.3, cols);
  if (bannerUV) {
    const [u0, v0, u1, v1] = bannerUV, uv = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    const cx = (trW[0] + trE[0]) / 2, cz = (trW[2] + trE[2]) / 2, yb = y0 + 3.2 - 0.3 - 0.62;
    B.box(cx - 2.05, yb - 0.4, cz - 0.02, cx + 2.05, yb + 0.4, cz + 0.02, PINK);
    decal(B, [cx, yb, cz - 0.025], [0, 0, -1], 3.9, 0.7, WHITE, M.SIGN, uv);
    decal(B, [cx, yb, cz + 0.025], [0, 0, 1], 3.9, 0.7, WHITE, M.SIGN, uv);
    for (const sx of [-1, 1]) B.tube([cx + sx * 2.0, yb + 0.4, cz], [cx + sx * 2.2, yb + 0.66, cz], 0.006, 0.006, 3, 0x2a2b2f, M.PLAIN);
  }
  return B.toGeometry(THREE);
}

// buns heaped in the cargo box of Arne's bike (bike-local: the box is x ±0.29, y up to 0.92, z 0.5–1.04)
export function buildBikeBuns() {
  const B = new GeomBuilder();
  let k = 0;
  for (const [x, z, y] of [[-0.17, 0.62, 0.88], [0, 0.62, 0.89], [0.17, 0.62, 0.88], [-0.17, 0.78, 0.9], [0, 0.78, 0.92], [0.17, 0.78, 0.9], [-0.17, 0.93, 0.88], [0, 0.93, 0.89], [0.17, 0.93, 0.88], [-0.08, 0.7, 0.95], [0.09, 0.86, 0.96]]) bunInto(B, x, y, z, 1.25, k++);
  return B.toGeometry(THREE);
}

// static decoration: rusty wreck and moored boats go into the merged town mesh
export function wreckInto(B, x, y, z, rot, hex) {
  const k = B.count;
  sedanBody(B, hex, M.PLAIN, { wreck: true });
  B.hcyl(0.8, 0.2, 1.35, 0.24, 0.3, 'x', 8, TIRE);
  B.hcyl(-0.8, 0.2, -1.35, 0.24, 0.3, 'x', 8, TIRE);
  transformFrom(B, k, x, y - 0.12, z, rot, 0.05);
}

export function boatInto(B, x, y, z, rot, hull, trim) {
  const k = B.count;
  hexa(B,
    [[-0.8, -0.6, -3.2], [0.8, -0.6, -3.2], [0.8, -0.6, 2.2], [-0.8, -0.6, 2.2]],
    [[-1.25, 0.45, -3.4], [1.25, 0.45, -3.4], [1.25, 0.45, 2.4], [-1.25, 0.45, 2.4]],
    { left: [hull, M.PLAIN], right: [hull, M.PLAIN], back: [hull, M.PLAIN], top: [0x9a7448, M.PLANKS] });
  // pointed bow
  const tip = [0, 0.5, 4.3], tipLow = [0, -0.4, 3.6];
  B.tri([1.25, 0.45, 2.4], tip, [-1.25, 0.45, 2.4], 0x9a7448, M.PLANKS, undefined, undefined, undefined, [0, 1, 0]);
  B.quad([0.8, -0.6, 2.2], [1.25, 0.45, 2.4], tip, tipLow, hull, M.PLAIN, null, [1, 0, 0.5]);
  B.quad([-0.8, -0.6, 2.2], tipLow, tip, [-1.25, 0.45, 2.4], hull, M.PLAIN, null, [-1, 0, 0.5]);
  B.box(-1.27, 0.25, -3.42, 1.27, 0.5, 2.42, trim);
  B.box(-0.8, 0.45, -1.6, 0.8, 1.7, 0.6, 0xf2efe6);
  for (const sx of [1, -1]) decal(B, [0.805 * sx, 1.2, -0.5], [sx, 0, 0], 1.6, 0.45, 0x9db4c7, M.GLASS);
  decal(B, [0, 1.2, 0.605], [0, 0, 1], 1.3, 0.45, 0x9db4c7, M.GLASS);
  transformFrom(B, k, x, y, z, rot, 0);
}

function transformFrom(B, k, x, y, z, rot, tilt) {
  const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
  const P = B.pos, N = B.nrm;
  for (let i = k * 3; i < P.length; i += 3) {
    let px = P[i], py = P[i + 1], pz = P[i + 2];
    // roll around z (tilt), then yaw
    const rx = px * ct - py * st, ry = px * st + py * ct;
    P[i] = x + rx * cr + pz * sr; P[i + 1] = y + ry; P[i + 2] = z - rx * sr + pz * cr;
    let nx = N[i], ny = N[i + 1], nz = N[i + 2];
    const qx = nx * ct - ny * st, qy = nx * st + ny * ct;
    N[i] = qx * cr + nz * sr; N[i + 1] = qy; N[i + 2] = -qx * sr + nz * cr;
  }
}
