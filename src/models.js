// Procedural low-poly models. Cars and people are built once and drawn with instancing:
// all sedans in one draw call, all vans in one, all people in one.
// Car-local frame: +z forward, +x = LEFT side (driver side in right-hand traffic), y up.
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
import { M } from './layout.js';
import { CAR_TYPES } from './vehicle.js';

const DARK = 0x26282c, BLACK = 0x121314, TIRE = 0x161718, RIM = 0xb9bdc2, LIGHT = 0xfff2d2, TAIL = 0xd41a14, WHITE = 0xffffff;

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

function wheel(B, x, r, z, w, outer) {
  B.hcyl(x, r, z, w, r, 'x', 10, TIRE, M.PLAIN, true);
  const xo = x + (outer ? w / 2 + 0.004 : -w / 2 - 0.004);
  const n = [outer ? 1 : -1, 0, 0];
  const hr = r * 0.62;
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI * 2, a1 = ((i + 1) / 10) * Math.PI * 2;
    B.tri([xo, r, z], [xo, r + Math.sin(a0) * hr, z + Math.cos(a0) * hr], [xo, r + Math.sin(a1) * hr, z + Math.cos(a1) * hr], RIM, M.PLAIN, undefined, undefined, undefined, n);
  }
  // spokes so the rotation reads
  const xs = xo + (outer ? 0.003 : -0.003);
  for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    const ca = Math.cos(a), sa = Math.sin(a), wd = 0.025;
    const p = (s, k) => [xs, r + sa * s + ca * k, z + ca * s - sa * k];
    B.quad(p(-hr * 0.95, -wd), p(-hr * 0.95, wd), p(hr * 0.95, wd), p(hr * 0.95, -wd), 0x5d6168, M.PLAIN, null, n);
  }
}

export function sedanBody(B, paint = WHITE, pmat = M.PAINT, opts = {}) {
  const P = [paint, pmat];
  // main body and sloped nose
  B.box(-0.93, 0.32, -2.2, 0.93, 0.9, 1.0, paint, pmat, { skip: 'pz' });
  hexa(B,
    [[-0.93, 0.32, 1.0], [0.93, 0.32, 1.0], [0.93, 0.32, 2.2], [-0.93, 0.32, 2.2]],
    [[-0.93, 0.9, 1.0], [0.93, 0.9, 1.0], [0.91, 0.76, 2.2], [-0.91, 0.76, 2.2]],
    { top: P, front: P, left: P, right: P });
  // cabin
  const g = opts.wreck ? [0x3a3f44, M.PLAIN] : [0x9db4c7, M.GLASS];
  hexa(B,
    [[-0.86, 0.9, -1.38], [0.86, 0.9, -1.38], [0.86, 0.9, 0.95], [-0.86, 0.9, 0.95]],
    [[-0.74, 1.44, -1.02], [0.74, 1.44, -1.02], [0.74, 1.44, 0.27], [-0.74, 1.44, 0.27]],
    { top: P, front: g, back: g, left: g, right: g });
  // wheel arches, door seams and mirrors
  for (const sx of [1, -1]) {
    const x = 0.932 * sx;
    for (const z of [1.35, -1.35]) decal(B, [x, 0.53, z], [sx, 0, 0], 0.86, 0.42, 0x111214, M.PLAIN);
    for (const z of [0.05, -0.95]) decal(B, [x, 0.6, z], [sx, 0, 0], 0.025, 0.52, 0x1f2124, M.PLAIN);
    B.box(sx > 0 ? 0.93 : -1.03, 0.9, 0.7, sx > 0 ? 1.03 : -0.93, 1.02, 0.84, paint, pmat);
  }
  // bumpers, grille, lights, plates
  B.box(-0.92, 0.28, 2.2, 0.92, 0.5, 2.3, DARK);
  B.box(-0.92, 0.28, -2.3, 0.92, 0.5, -2.2, DARK);
  if (!opts.wreck) {
    decal(B, [0, 0.62, 2.205], [0, 0, 1], 0.8, 0.16, BLACK, M.PLAIN);
    for (const sx of [1, -1]) {
      decal(B, [0.7 * sx, 0.64, 2.206], [0, 0, 1], 0.32, 0.14, LIGHT, M.LIGHT);
      decal(B, [0.7 * sx, 0.68, -2.206], [0, 0, -1], 0.34, 0.14, TAIL, M.TAIL);
    }
    decal(B, [0, 0.39, 2.305], [0, 0, 1], 0.52, 0.11, WHITE, M.PLAIN);
    decal(B, [-0.23, 0.39, 2.307], [0, 0, 1], 0.06, 0.11, 0x1d4fa0, M.PLAIN);
    decal(B, [0, 0.39, -2.305], [0, 0, -1], 0.52, 0.11, WHITE, M.PLAIN);
    decal(B, [0.23, 0.39, -2.307], [0, 0, -1], 0.06, 0.11, 0x1d4fa0, M.PLAIN);
  }
}

export function vanBody(B, paint = WHITE, pmat = M.PAINT, signUV = null) {
  const P = [paint, pmat];
  B.box(-1.0, 0.36, -2.45, 1.0, 2.2, 1.3, paint, pmat, { skip: 'pz' });
  // windshield block
  hexa(B,
    [[-1.0, 0.36, 1.3], [1.0, 0.36, 1.3], [1.0, 0.36, 1.85], [-1.0, 0.36, 1.85]],
    [[-1.0, 2.2, 1.3], [1.0, 2.2, 1.3], [0.98, 1.25, 1.85], [-0.98, 1.25, 1.85]],
    { top: [0x9db4c7, M.GLASS], left: P, right: P });
  // hood block
  hexa(B,
    [[-1.0, 0.36, 1.85], [1.0, 0.36, 1.85], [1.0, 0.36, 2.45], [-1.0, 0.36, 2.45]],
    [[-0.98, 1.25, 1.85], [0.98, 1.25, 1.85], [0.97, 1.08, 2.45], [-0.97, 1.08, 2.45]],
    { top: P, front: P, left: P, right: P });
  for (const sx of [1, -1]) {
    const x = 1.006 * sx;
    for (const z of [1.5, -1.5]) decal(B, [1.003 * sx, 0.6, z], [sx, 0, 0], 0.95, 0.5, 0x111214, M.PLAIN);
    // cab side window (sits on the slanted side above the door)
    decal(B, [x, 1.62, 0.86], [sx, 0, 0], 0.78, 0.62, 0x9db4c7, M.GLASS);
    decal(B, [x, 0.95, 0.42], [sx, 0, 0], 0.025, 1.0, 0x1f2124, M.PLAIN);
    if (signUV) {
      const [u0, v0, u1, v1] = signUV;
      decal(B, [x, 1.36, -1.0], [sx, 0, 0], 2.2, 1.0, WHITE, M.SIGN, [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]);
    }
    B.box(sx > 0 ? 1.0 : -1.1, 1.45, 1.1, sx > 0 ? 1.1 : -1.0, 1.65, 1.25, DARK);
  }
  // rear: doors, windows, lights
  decal(B, [0, 1.3, -2.456], [0, 0, -1], 0.03, 1.7, 0x1f2124, M.PLAIN);
  for (const sx of [1, -1]) {
    decal(B, [0.45 * sx, 1.72, -2.456], [0, 0, -1], 0.64, 0.5, 0x9db4c7, M.GLASS);
    decal(B, [0.9 * sx, 0.95, -2.457], [0, 0, -1], 0.12, 0.6, TAIL, M.TAIL);
    decal(B, [0.72 * sx, 0.86, 2.456], [0, 0, 1], 0.36, 0.17, LIGHT, M.LIGHT);
  }
  decal(B, [0, 0.82, 2.456], [0, 0, 1], 0.7, 0.2, BLACK, M.PLAIN);
  B.box(-0.98, 0.3, 2.45, 0.98, 0.56, 2.55, DARK);
  B.box(-0.98, 0.3, -2.55, 0.98, 0.56, -2.45, DARK);
  decal(B, [0, 0.43, 2.555], [0, 0, 1], 0.52, 0.11, WHITE, M.PLAIN);
  decal(B, [0, 0.43, -2.555], [0, 0, -1], 0.52, 0.11, WHITE, M.PLAIN);
}

export function buildCarGeometry(type, signUV) {
  const B = new GeomBuilder([['aBone', 1], ['aPivot', 3]]);
  const s = CAR_TYPES[type];
  B.cur.aBone = 0; B.cur.aPivot = [0, 0.6, 0];
  if (type === 'sedan') sedanBody(B); else vanBody(B, WHITE, M.PAINT, signUV);
  const [zf, zr] = s.wheelZ;
  const ww = type === 'van' ? 0.26 : 0.24;
  [[s.track, zf, 1], [-s.track, zf, 2], [s.track, zr, 3], [-s.track, zr, 4]].forEach(([x, z, bone]) => {
    B.cur.aBone = bone; B.cur.aPivot = [x, s.wheelR, z];
    wheel(B, x, s.wheelR, z, ww, x > 0);
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
  part(0, 3, [0, 0, 0]);
  B.box(-0.06, 1.5, -0.06, 0.06, 1.57, 0.06, WHITE);
  B.box(-0.13, 1.56, -0.13, 0.13, 1.83, 0.13, WHITE, M.PLAIN, { skipTop: true });
  part(0, 4, [0, 0, 0]);
  B.box(-0.14, 1.79, -0.145, 0.14, 1.9, 0.14, WHITE);
  B.box(-0.14, 1.6, -0.15, 0.14, 1.8, -0.12, WHITE);
  part(0, 0, [0, 0, 0]);
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
