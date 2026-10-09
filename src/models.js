// Procedural low-poly models. Cars and people are built once and drawn with instancing:
// all sedans in one draw call, all vans in one, all people in one.
// Car-local frame: +z forward, +x = LEFT side (driver side in right-hand traffic), y up.
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
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

export function buildHumanGeometry() {
  const B = new GeomBuilder([['aBS', 2], ['aPivot', 3]]);
  const part = (bone, sel, pivot) => { B.cur.aBS = [bone, sel]; B.cur.aPivot = pivot; };
  for (const [sx, bone] of [[1, 5], [-1, 6]]) {
    const x = 0.105 * sx;
    part(bone, 2, [x, 0.92, 0]);
    B.box(x - 0.085, 0.1, -0.095, x + 0.085, 0.95, 0.095, WHITE);
    part(bone, 0, [x, 0.92, 0]);
    B.box(x - 0.09, 0.0, -0.11, x + 0.09, 0.11, 0.16, 0x2a2420, M.PLAIN, { skipBottom: true });
  }
  part(0, 1, [0, 0, 0]);
  B.box(-0.245, 0.9, -0.14, 0.245, 1.52, 0.14, WHITE, M.PLAIN, { skipBottom: false });
  // the head is its own bone (turned at the neck when someone lounges on a sofa and looks around)
  const NECK = [0, 1.53, 0];
  part(1, 3, NECK);
  B.box(-0.06, 1.5, -0.06, 0.06, 1.57, 0.06, WHITE);
  B.box(-0.13, 1.56, -0.13, 0.13, 1.83, 0.13, WHITE, M.PLAIN, { skipTop: true });
  part(1, 4, NECK);
  B.box(-0.14, 1.79, -0.145, 0.14, 1.9, 0.14, WHITE);
  B.box(-0.14, 1.6, -0.15, 0.14, 1.8, -0.12, WHITE);
  part(1, 0, NECK);
  B.box(0.035, 1.69, 0.13, 0.08, 1.73, 0.136, 0x1a1a1a);
  B.box(-0.08, 1.69, 0.13, -0.035, 1.73, 0.136, 0x1a1a1a);
  for (const [sx, bone] of [[1, 3], [-1, 4]]) {
    const x = 0.31 * sx;
    part(bone, 1, [x, 1.47, 0]);
    B.box(x - 0.065, 1.17, -0.075, x + 0.065, 1.52, 0.075, WHITE);
    part(bone, 3, [x, 1.47, 0]);
    B.box(x - 0.055, 0.84, -0.065, x + 0.055, 1.18, 0.065, WHITE, M.PLAIN, { skipBottom: false });
  }
  return B.toGeometry(THREE);
}

// Arne's delivery bike (v0.6), built in parts that move: the frame with the cargo box, the two
// wheels (each around its hub) and the steering (fork + handlebar, around the head tube).
// Local axes: +z forward, y up. Sizes in metres; the rear hub is at z = -0.6, the front one at 0.66.
export const BIKE = BIKE_GEO;
export function buildBike(signUV) {
  const FRAME = 0x23452f, CREAMBOX = 0xf1e3c4, BROWN = 0x7a4a26;
  const tube = (B, a, b, r = 0.024, c = FRAME) => B.tube(a, b, r, r, 6, c, M.PAINT);
  // frame
  const F = new GeomBuilder();
  const R = [0, BIKE.rearR, BIKE.rearZ], BB = [0, 0.3, -0.06], S = [0, 0.86, -0.27], Hb = [0, 0.62, 0.5], Ht = [0, 0.92, 0.44];
  for (const sx of [-0.05, 0.05]) { tube(F, [sx, R[1], R[2]], [sx * 0.6, BB[1], BB[2]], 0.018); tube(F, [sx, R[1], R[2]], [sx * 0.5, 0.82, -0.26], 0.016); }
  tube(F, BB, S); tube(F, BB, Hb, 0.03); tube(F, [0, 0.66, -0.2], [0, 0.82, 0.46], 0.026); tube(F, Hb, Ht, 0.032);
  tube(F, S, [0, BIKE.saddle[1] - 0.02, BIKE.saddle[2]], 0.015, 0x9aa0a6);                         // seat post
  F.box(-0.08, BIKE.saddle[1] - 0.03, BIKE.saddle[2] - 0.14, 0.08, BIKE.saddle[1] + 0.03, BIKE.saddle[2] + 0.12, 0x3b2a1e, M.PLAIN, { skipBottom: false });
  F.box(-0.15, 0.7, -0.84, 0.15, 0.72, -0.4, 0x2d3238, M.PLAIN, { skipBottom: false });             // rear rack
  tube(F, [0, 0.71, -0.42], [0, 0.82, -0.26], 0.012, 0x2d3238);
  F.box(-0.04, BB[1] - 0.06, BB[2] - 0.08, 0.04, BB[1] + 0.06, BB[2] + 0.08, 0x2d3238);             // chain case
  F.box(-0.035, 0.26, -0.62, 0.035, 0.36, BB[2] - 0.02, 0x1d1f22);
  // the cargo box on its rack over the front wheel
  const bx0 = -0.29, bx1 = 0.29, by0 = 0.56, by1 = 0.92, bz0 = 0.5, bz1 = 1.04;
  F.box(bx0, by0, bz0, bx1, by1, bz1, CREAMBOX, M.BOARDS, { skipBottom: false });
  F.box(bx0 - 0.012, by1 - 0.035, bz0 - 0.012, bx1 + 0.012, by1 + 0.01, bz1 + 0.012, BROWN);
  F.box(bx0 - 0.012, by0 - 0.01, bz0 - 0.012, bx1 + 0.012, by0 + 0.03, bz1 + 0.012, BROWN);
  for (const sx of [-0.2, 0.2]) tube(F, [sx, by0, 0.56], [0, 0.66, 0.48], 0.014, 0x2d3238);
  F.hcyl(0, 0.72, bz1 + 0.045, 0.09, 0.055, 'z', 8, 0xd9dde2, M.CHROME);                       // the lamp
  F.hcyl(0, 0.72, bz1 + 0.092, 0.006, 0.045, 'z', 8, 0xfff2d2, M.LIGHT);
  if (signUV) {
    const [u0, v0, u1, v1] = signUV;
    const uv = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    decal(F, [bx1 + 0.004, 0.74, (bz0 + bz1) / 2], [1, 0, 0], 0.46, 0.21, WHITE, M.SIGN, uv);
    decal(F, [bx0 - 0.004, 0.74, (bz0 + bz1) / 2], [-1, 0, 0], 0.46, 0.21, WHITE, M.SIGN, uv);
    decal(F, [0, 0.74, bz1 + 0.004], [0, 0, 1], 0.46, 0.21, WHITE, M.SIGN, uv);
  }
  // wheels: tyre, a lighter disc for the spokes, the hub
  const wheel = (r) => {
    const W = new GeomBuilder();
    W.hcyl(0, 0, 0, 0.05, r, 'x', 16, TIRE);
    W.hcyl(0, 0, 0, 0.056, r - 0.05, 'x', 16, 0xb7bcc2, M.CHROME);
    W.hcyl(0, 0, 0, 0.12, 0.045, 'x', 8, 0x6f7479, M.CHROME);
    for (let i = 0; i < 4; i++) W.rbox(0, 0, 0, 0.064, (r - 0.05) * 2, 0.014, 0, 0x5d6268, 0, (i / 4) * Math.PI); // spokes you can see turn
    return W.toGeometry(THREE);
  };
  // the steering, around the pivot on the head tube
  const T = new GeomBuilder();
  const [px, py, pz] = BIKE.pivot, rel = (q) => [q[0] - px, q[1] - py, q[2] - pz];
  for (const sx of [-0.055, 0.055]) tube(T, rel([sx, 0.62, 0.5]), rel([sx, BIKE.frontR, BIKE.frontZ]), 0.016);
  tube(T, rel([0, 0.92, 0.44]), rel([0, 1.04, 0.4]), 0.018, 0x9aa0a6);
  tube(T, rel([-0.31, 1.04, 0.33]), rel([0.31, 1.04, 0.33]), 0.016, 0x9aa0a6);
  tube(T, rel([-0.04, 1.04, 0.4]), rel([0.04, 1.04, 0.33]), 0.014, 0x9aa0a6);
  for (const sx of [-1, 1]) tube(T, rel([sx * 0.31, 1.04, 0.33]), rel([sx * 0.4, 1.035, 0.3]), 0.022, 0x1d1f22);
  T.cyl(0.22 - px, 0.33 - pz, 1.05 - py, 1.09 - py, 0.032, 0.03, 8, 0xd9dde2, M.CHROME, true); // the bell
  return { frame: F.toGeometry(THREE), rear: wheel(BIKE.rearR), front: wheel(BIKE.frontR), steer: T.toGeometry(THREE) };
}

// Samuel's phone: screen on +z (it is turned to face him)
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
