// Norrholmen's beach (v1.1), the props: striped parasols, sun loungers, towels, beach huts, the
// lifeguard tower, the ice-cream kiosk, the jetty with its diving board, a raft, the buoys round the
// swimming area, a volleyball net, a sand castle, dune grass and wild roses. island.js decides where
// everything goes (and the colliders, the shadows and the signs); this file decides what it looks
// like. worldmesh.js builds each { t: 'beach', kind, x, z, rot, … } primitive into the town mesh.
// rot turns a prop round y like rbox: local +z = forward = (sin rot, cos rot), local +x = (cos rot, -sin rot).
import { M } from './layout.js';
import { CURB_H, WATER_Y } from './config.js';
import { scaleHex, toLinear } from './geom.js';

const SAND_Y = CURB_H + 0.02;
const WHITE = 0xf4f1ea, WOOD = 0xb07e4c, DARK = 0x2a2b2f, SAND = 0xdcc690;

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
// a little random number from a seed (the props should look the same every time, and the game's own
// random numbers must not be touched)
function rand(seed) { let h = (Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9) >>> 0; return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; }; }

// the prop's own frame: local (lx, ly, lz) → world
function frame(p, y0 = SAND_Y) {
  const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
  return (lx, ly, lz) => [p.x + lx * c + lz * s, y0 + ly, p.z - lx * s + lz * c];
}
// a box in the prop's frame: (lx, lz) the middle of its bottom, ly the bottom; tilt leans it (about local x)
function lbox(B, F, rot, lx, ly, lz, sx, sy, sz, hex, m = M.PLAIN, tilt = 0) {
  const q = F(lx, ly, lz);
  B.rbox(q[0], q[1], q[2], sx, sy, sz, rot, hex, m, tilt);
}
// a ring (torus) round the axis `ax` through c: R the radius, rr the thickness; colour(i) per segment
function torus(B, c, ax, R, rr, nu, nv, colour) {
  const A = unit(ax), U = unit(cross(A, Math.abs(A[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), V = cross(A, U);
  for (let i = 0; i < nu; i++) {
    const col = toLinear(colour(i));
    const u0 = (i / nu) * Math.PI * 2, u1 = ((i + 1) / nu) * Math.PI * 2;
    for (let j = 0; j < nv; j++) {
      const v0 = (j / nv) * Math.PI * 2, v1 = ((j + 1) / nv) * Math.PI * 2;
      const n = (u, v) => add(mul(add(mul(U, Math.cos(u)), mul(V, Math.sin(u))), Math.cos(v)), mul(A, Math.sin(v)));
      const pt = (u, v) => add(add(c, mul(add(mul(U, Math.cos(u)), mul(V, Math.sin(u))), R)), mul(n(u, v), rr));
      B.triN(pt(u0, v0), pt(u1, v0), pt(u1, v1), n(u0, v0), n(u1, v0), n(u1, v1), col, col, col, M.PLAIN);
      B.triN(pt(u0, v0), pt(u1, v1), pt(u0, v1), n(u0, v0), n(u1, v1), n(u0, v1), col, col, col, M.PLAIN);
    }
  }
}
// a ball with coloured slices (a beach ball), or plain (a buoy, a scoop of ice cream)
function ball(B, c, r, cols, sy = 1, nl = 8, nb = 6) {
  for (let i = 0; i < nl; i++) {
    const col = toLinear(cols[i % cols.length]);
    for (let j = 0; j < nb; j++) {
      const a0 = (i / nl) * Math.PI * 2, a1 = ((i + 1) / nl) * Math.PI * 2, b0 = (j / nb) * Math.PI - Math.PI / 2, b1 = ((j + 1) / nb) * Math.PI - Math.PI / 2;
      const n = (a, b) => [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)];
      const pt = (a, b) => { const q = n(a, b); return [c[0] + q[0] * r, c[1] + q[1] * r * sy, c[2] + q[2] * r]; };
      B.triN(pt(a0, b0), pt(a1, b0), pt(a1, b1), n(a0, b0), n(a1, b0), n(a1, b1), col, col, col, M.PLAIN);
      B.triN(pt(a0, b0), pt(a1, b1), pt(a0, b1), n(a0, b0), n(a1, b1), n(a0, b1), col, col, col, M.PLAIN);
    }
  }
}
// a flat triangle seen from both sides (the back a little darker)
function tri2(B, a, b, c, hex, nrm) {
  B.tri(a, b, c, hex, M.PLAIN, undefined, undefined, undefined, nrm);
  B.tri(a, c, b, scaleHex(hex, 0.8), M.PLAIN, undefined, undefined, undefined, mul(nrm, -1));
}

// ---------------------------------------------------------------- the props
// a beach parasol: a white pole (leaning `tilt` toward rot), a canopy of ten panels in two colours
// with a scalloped edge, ribs underneath and a knob on top
function parasol(B, p) {
  const tilt = p.tilt || 0, dir = p.rot || 0, h = p.h ?? 2.3, r = p.r ?? 1.3, n = 10;
  const A = [Math.sin(tilt) * Math.sin(dir), Math.cos(tilt), Math.sin(tilt) * Math.cos(dir)];
  const U = unit(cross(A, [0, 0, 1])), V = cross(A, U);
  const base = [p.x, SAND_Y - 0.06, p.z], top = add(base, mul(A, h));
  B.tube(base, top, 0.032, 0.026, 6, p.pole ?? WHITE, M.PLAIN);
  B.cyl(p.x, p.z, SAND_Y - 0.01, SAND_Y + 0.05, 0.2, 0.05, 8, SAND, M.PLAIN, true);       // a little mound of sand
  const apex = add(top, mul(A, 0.05)), ring = add(top, mul(A, -0.36)), runner = add(top, mul(A, -0.62));
  const rim = (i) => { const a = (i / n) * Math.PI * 2 + (p.spin || 0); return add(ring, add(mul(U, Math.cos(a) * r), mul(V, Math.sin(a) * r))); };
  for (let i = 0; i < n; i++) {
    const a = rim(i), b = rim(i + 1), col = i % 2 ? p.c2 : p.c1;
    const out = unit(add(mul(add(a, b), 0.5), mul(ring, -1)));
    tri2(B, apex, a, b, col, unit(add(A, mul(out, 0.45))));
    const flap = add(add(mul(add(a, b), 0.5), mul(A, -0.15)), mul(out, 0.02));            // the scalloped edge
    tri2(B, a, b, flap, col, out);
    B.tube(runner, add(a, mul(A, -0.01)), 0.008, 0.007, 3, 0xd8d4cc, M.PLAIN);              // a rib
  }
  B.tube(runner, add(runner, mul(A, 0.1)), 0.04, 0.04, 6, WHITE, M.PLAIN, true);
  B.ico(apex[0] + A[0] * 0.05, apex[1] + A[1] * 0.05, apex[2] + A[2] * 0.05, 0.05, 1, p.knob ?? WHITE, M.PLAIN, 3);
}

// a wooden sun lounger with a cushion and the back rest up (the person on it faces +z)
function lounger(B, p) {
  const F = frame(p), rot = p.rot || 0, fr = p.frame ?? WOOD, cu = p.c ?? 0x2c62a8;
  for (const lx of [-0.28, 0.28]) for (const lz of [-0.86, 0.9]) lbox(B, F, rot, lx, 0, lz, 0.05, 0.3, 0.05, scaleHex(fr, 0.85));
  for (const lx of [-0.31, 0.31]) lbox(B, F, rot, lx, 0.25, 0.05, 0.035, 0.07, 1.95, fr, M.PLANKS);
  lbox(B, F, rot, 0, 0.27, 0.28, 0.6, 0.04, 1.36, fr, M.PLANKS);                           // the slats
  lbox(B, F, rot, 0, 0.31, 0.28, 0.57, 0.06, 1.32, cu, M.PLAIN);                            // cushion
  if (p.flat) { // the back rest laid down flat: someone is sunbathing on their front
    lbox(B, F, rot, 0, 0.27, -0.68, 0.6, 0.04, 0.6, fr, M.PLANKS);
    lbox(B, F, rot, 0, 0.31, -0.67, 0.57, 0.06, 0.58, cu, M.PLAIN);
    return;
  }
  lbox(B, F, rot, 0, 0.29, -0.38, 0.6, 0.78, 0.04, fr, M.PLANKS, -0.95);                    // the back rest …
  lbox(B, F, rot, 0, 0.33, -0.34, 0.57, 0.72, 0.06, cu, M.PLAIN, -0.95);                    // … its cushion
  lbox(B, F, rot, 0, 0.62, -0.62, 0.42, 0.24, 0.1, scaleHex(cu, 1.25), M.PLAIN, -0.95);     // a pillow
  for (const lx of [-0.34, 0.34]) lbox(B, F, rot, lx, 0.22, -0.55, 0.03, 0.5, 0.03, scaleHex(fr, 0.8), M.PLAIN, -0.3); // the props under the back
}

// a striped towel on the sand, and (optionally) a bag, flip-flops, a book or a bottle on it
function towel(B, p) {
  const F = frame(p), rot = p.rot || 0, w = p.w ?? 0.85, l = p.l ?? 1.75, n = p.stripes ?? 5;
  for (let i = 0; i < n; i++) lbox(B, F, rot, -w / 2 + (i + 0.5) * (w / n), 0.003, 0, w / n + 0.002, 0.016, l, i % 2 ? p.c2 : p.c1);
  for (const lz of [-l / 2, l / 2]) lbox(B, F, rot, 0, 0.004, lz, w, 0.018, 0.06, WHITE);
  if (p.bag) {
    lbox(B, F, rot, w / 2 + 0.28, 0, l * 0.18, 0.42, 0.3, 0.16, p.bag);
    const a = F(w / 2 + 0.12, 0.3, l * 0.18), b = F(w / 2 + 0.44, 0.3, l * 0.18);
    B.tube(a, add(mul(add(a, b), 0.5), [0, 0.14, 0]), 0.01, 0.01, 3, scaleHex(p.bag, 0.7), M.PLAIN);
    B.tube(add(mul(add(a, b), 0.5), [0, 0.14, 0]), b, 0.01, 0.01, 3, scaleHex(p.bag, 0.7), M.PLAIN);
  }
  if (p.flops) for (const lx of [-0.09, 0.09]) lbox(B, F, rot, -w / 2 - 0.25 + lx, 0, -l / 2 + 0.2 + lx * 0.4, 0.1, 0.025, 0.26, p.flops, M.PLAIN, 0);
  if (p.book) lbox(B, F, rot, 0.12, 0.02, l * 0.3, 0.16, 0.035, 0.22, p.book, M.PLAIN);
  if (p.bottle) { const q = F(-w / 2 - 0.12, 0, l * 0.32); B.cyl(q[0], q[2], q[1], q[1] + 0.24, 0.04, 0.03, 8, p.bottle, M.PLAIN, true); }
}

function beachBall(B, p) {
  ball(B, [p.x, SAND_Y + (p.r ?? 0.18), p.z], p.r ?? 0.18, p.cols ?? [0xd2342c, WHITE, 0x2c62a8, 0xe5b923, WHITE, 0x46a35e]);
}

// a cool box: blue with a white lid and a handle
function cooler(B, p) {
  const F = frame(p), rot = p.rot || 0;
  lbox(B, F, rot, 0, 0, 0, 0.5, 0.3, 0.34, p.c ?? 0x2c7fd0);
  lbox(B, F, rot, 0, 0.3, 0, 0.52, 0.06, 0.36, WHITE);
  lbox(B, F, rot, 0, 0.36, 0, 0.3, 0.03, 0.05, DARK);
}

// a sand castle with four towers and a flag, a bucket and a spade beside it
function castle(B, p) {
  const F = frame(p), rot = p.rot || 0, S2 = 0xcfb47a;
  const c = F(0, 0, 0);
  B.cyl(c[0], c[2], SAND_Y - 0.01, SAND_Y + 0.12, 0.62, 0.5, 12, S2, M.PLAIN, true);
  lbox(B, F, rot, 0, 0.12, 0, 0.42, 0.24, 0.42, S2);
  for (const [lx, lz] of [[-0.24, -0.24], [0.24, -0.24], [0.24, 0.24], [-0.24, 0.24]]) {
    const q = F(lx, 0.12, lz);
    B.cyl(q[0], q[2], q[1], q[1] + 0.34, 0.09, 0.08, 8, S2, M.PLAIN, true);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; B.box(q[0] + Math.cos(a) * 0.065 - 0.02, q[1] + 0.34, q[2] + Math.sin(a) * 0.065 - 0.02, q[0] + Math.cos(a) * 0.065 + 0.02, q[1] + 0.39, q[2] + Math.sin(a) * 0.065 + 0.02, S2); }
  }
  const f = F(0, 0.36, 0);
  B.tube(f, add(f, [0, 0.32, 0]), 0.006, 0.006, 3, DARK, M.PLAIN);
  tri2(B, add(f, [0, 0.32, 0]), add(f, [0, 0.2, 0]), add(add(f, [0, 0.26, 0]), mul(unit(add(F(1, 0, 0), mul(F(0, 0, 0), -1))), 0.16)), 0x2c62a8, unit([Math.sin(rot), 0, Math.cos(rot)]));
  const bq = F(0.85, 0, 0.2);
  B.cyl(bq[0], bq[2], SAND_Y, SAND_Y + 0.2, 0.12, 0.09, 10, p.bucket ?? 0xd2342c, M.PLAIN, true);  // the bucket, upside down
  lbox(B, F, rot, 0.55, 0.02, -0.55, 0.1, 0.02, 0.2, 0xe5b923, M.PLAIN, 0);                         // the spade …
  lbox(B, F, rot, 0.55, 0.02, -0.75, 0.025, 0.025, 0.3, 0xe5b923, M.PLAIN, Math.PI / 2 - 0.15);    // … and its handle
}

// a beach hut: vertical boards in a pastel colour, white corners, a pitched roof with the gable to
// the front (+z), a door with a round window, a step
function hut(B, p) {
  const F = frame(p), rot = p.rot || 0, w = p.w ?? 1.75, d = p.d ?? 1.6, h = p.h ?? 2.0, rh = 0.62, c = p.c;
  const fw = [Math.sin(rot), 0, Math.cos(rot)], rt = [Math.cos(rot), 0, -Math.sin(rot)];
  lbox(B, F, rot, 0, 0, 0, w + 0.1, 0.14, d + 0.1, 0x8a7a68);
  lbox(B, F, rot, 0, 0.14, 0, w, h - 0.14, d, c, M.BOARDS);
  for (const lx of [-w / 2, w / 2]) for (const lz of [-d / 2, d / 2]) lbox(B, F, rot, lx, 0.14, lz, 0.07, h - 0.14, 0.07, WHITE);
  // the gables (front and back) and the two halves of the roof, eaves sticking out a little
  const y0 = h, o = 0.14;
  for (const s of [1, -1]) {
    const lz = (s * d) / 2;
    B.tri(F(-w / 2, y0, lz), F(w / 2, y0, lz), F(0, y0 + rh, lz), c, M.BOARDS, undefined, undefined, undefined, mul(fw, s));
  }
  for (const s of [-1, 1]) {
    const e0 = F(s * (w / 2 + o), y0 - 0.08, -d / 2 - o), e1 = F(s * (w / 2 + o), y0 - 0.08, d / 2 + o);
    const r0 = F(0, y0 + rh + 0.03, -d / 2 - o), r1 = F(0, y0 + rh + 0.03, d / 2 + o);
    const up = unit(add(mul(rt, s * rh), [0, w / 2 + o, 0]));
    B.quad(e0, e1, r1, r0, p.roof, M.PLAIN, null, up);
    B.quad(e0, r0, r1, e1, scaleHex(p.roof, 0.7), M.PLAIN, null, mul(up, -1));
    // white barge boards along the front edge
    B.tube(F(s * (w / 2 + o), y0 - 0.07, d / 2 + o + 0.01), F(0, y0 + rh + 0.04, d / 2 + o + 0.01), 0.03, 0.03, 4, WHITE, M.PLAIN);
  }
  // the door, its round window, a handle, a step; a number plate
  const fz = d / 2 + 0.012;
  lbox(B, F, rot, 0, 0.16, fz, 0.74, 1.7, 0.03, p.door ?? WHITE, M.PLAIN);
  B.tube(F(0, 1.42, fz + 0.01), F(0, 1.42, fz + 0.035), 0.11, 0.11, 12, DARK, M.PLAIN, true);
  B.tube(F(0, 1.42, fz + 0.005), F(0, 1.42, fz + 0.03), 0.14, 0.14, 12, WHITE, M.PLAIN, true);
  lbox(B, F, rot, 0.26, 0.9, fz + 0.02, 0.05, 0.12, 0.03, 0xd8b45a, M.CHROME);
  lbox(B, F, rot, 0, 0, d / 2 + 0.25, 0.9, 0.12, 0.42, scaleHex(WOOD, 0.9), M.PLANKS);
  lbox(B, F, rot, 0, h - 0.34, fz + 0.01, 0.22, 0.16, 0.02, WHITE, M.PLAIN);
  lbox(B, F, rot, 0, h - 0.31, fz + 0.02, 0.14, 0.1, 0.02, p.door ?? 0x2c62a8, M.PLAIN);
}

// the lifeguard tower: white legs and braces, a deck 2.1 m up with railings, a little red-roofed
// hut at the back with a window toward the water, a ladder at the back, a flag and a life ring
function tower(B, p) {
  const F = frame(p), rot = p.rot || 0, Y = 2.1, RED = 0xd2342c;
  const leg = (sx, sz) => B.tube(F(sx * 1.15, -0.05, sz * 1.15), F(sx * 0.92, Y, sz * 0.92), 0.06, 0.055, 6, WHITE, M.PLAIN);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(sx, sz);
  for (const s of [-1, 1]) {   // cross braces on all four sides
    B.tube(F(s * 1.1, 0.25, -1.1), F(s * 0.95, Y - 0.15, 0.95), 0.03, 0.03, 4, WHITE, M.PLAIN);
    B.tube(F(s * 1.1, 0.25, 1.1), F(s * 0.95, Y - 0.15, -0.95), 0.03, 0.03, 4, WHITE, M.PLAIN);
    B.tube(F(-1.1, 0.25, s * 1.1), F(0.95, Y - 0.15, s * 0.95), 0.03, 0.03, 4, WHITE, M.PLAIN);
    B.tube(F(1.1, 0.25, s * 1.1), F(-0.95, Y - 0.15, s * 0.95), 0.03, 0.03, 4, WHITE, M.PLAIN);
  }
  lbox(B, F, rot, 0, Y - 0.04, 0, 2.2, 0.1, 2.2, WOOD, M.PLANKS);
  lbox(B, F, rot, 0, Y - 0.2, 1.1, 2.2, 0.26, 0.04, RED, M.PLAIN);                     // the red board on the front (the sign sits on it)
  // the hut at the back: white, a red band, a big window to the front, a sloping red roof
  lbox(B, F, rot, 0, Y + 0.06, -0.55, 2.0, 1.55, 1.0, WHITE, M.BOARDS);
  lbox(B, F, rot, 0, Y + 0.66, -0.04, 1.5, 0.62, 0.03, 0x24313d, M.GLASS);
  lbox(B, F, rot, 0, Y + 0.06, -0.035, 2.0, 0.2, 0.04, RED, M.PLAIN);
  lbox(B, F, rot, 0, Y + 1.6, -0.5, 2.3, 0.07, 1.4, RED, M.PLAIN, 0.12);
  // railings round the open front of the deck
  for (const [a, b] of [[[-1.08, 0.0], [-1.08, 1.08]], [[1.08, 0.0], [1.08, 1.08]], [[-1.08, 1.08], [1.08, 1.08]]]) {
    B.tube(F(a[0], Y + 0.95, a[1]), F(b[0], Y + 0.95, b[1]), 0.03, 0.03, 4, WHITE, M.PLAIN);
    B.tube(F(a[0], Y + 0.5, a[1]), F(b[0], Y + 0.5, b[1]), 0.02, 0.02, 4, WHITE, M.PLAIN);
  }
  for (const [lx, lz] of [[-1.08, 1.08], [1.08, 1.08], [-1.08, 0.5], [1.08, 0.5], [0, 1.08]]) lbox(B, F, rot, lx, Y + 0.05, lz, 0.06, 0.92, 0.06, WHITE);
  // the ladder at the back
  for (const lx of [-0.28, 0.28]) B.tube(F(lx, -0.05, -1.75), F(lx, Y + 0.05, -1.08), 0.03, 0.03, 4, WHITE, M.PLAIN);
  for (let k = 1; k < 8; k++) { const t = k / 8; B.tube(F(-0.28, -0.05 + t * (Y + 0.1), -1.75 + t * 0.67), F(0.28, -0.05 + t * (Y + 0.1), -1.75 + t * 0.67), 0.02, 0.02, 4, WOOD, M.PLAIN); }
  // the flag on its pole at the corner, the life ring on the railing
  const fp = F(1.0, Y + 0.05, -1.0);
  B.tube(fp, add(fp, [0, 2.6, 0]), 0.03, 0.025, 5, WHITE, M.PLAIN);
  B.ico(fp[0], fp[1] + 2.64, fp[2], 0.05, 1, 0xd8b45a, M.CHROME, 5);
  const f0 = add(fp, [0, 2.5, 0]), fd = [Math.cos(rot) * 0.75, 0, -Math.sin(rot) * 0.75];
  for (let k = 0; k < 3; k++) {   // a green flag (safe to swim), with a little wave in it
    const a = add(f0, mul(fd, k / 3)), b = add(f0, mul(fd, (k + 1) / 3)), wv = [Math.sin(rot) * 0.05 * (k % 2 ? -1 : 1), 0, Math.cos(rot) * 0.05 * (k % 2 ? -1 : 1)];
    B.quad(a, add(b, wv), add(add(b, wv), [0, -0.5, 0]), add(a, [0, -0.5, 0]), 0x2e9a4a, M.PLAIN, null, [Math.sin(rot), 0, Math.cos(rot)]);
    B.quad(a, add(a, [0, -0.5, 0]), add(add(b, wv), [0, -0.5, 0]), add(b, wv), 0x247c3b, M.PLAIN, null, [-Math.sin(rot), 0, -Math.cos(rot)]);
  }
  torus(B, F(0.55, Y + 0.68, 1.13), [Math.sin(rot), 0, Math.cos(rot)], 0.22, 0.055, 12, 6, (i) => (Math.floor(i / 3) % 2 ? WHITE : RED));
}

// the ice-cream kiosk: white boards, a serving window with a counter, a striped awning with a
// scalloped edge, a pink roof edge and a giant cone with three scoops on top (faces +z)
function kiosk(B, p) {
  const { x0, x1, z0, z1 } = p, y0 = SAND_Y, h = 2.5, PINK = 0xe58fa8, mid = (x0 + x1) / 2;
  B.box(x0, y0, z0, x1, y0 + h, z1, WHITE, M.BOARDS);
  B.box(x0 - 0.15, y0 + h, z0 - 0.15, x1 + 0.15, y0 + h + 0.18, z1 + 0.15, PINK, M.PLAIN);
  B.box(x0 - 0.1, y0 + h + 0.18, z0 - 0.1, x1 + 0.1, y0 + h + 0.24, z1 + 0.1, WHITE, M.PLAIN);
  // the window and the counter
  B.box(x0 + 0.5, y0 + 1.02, z1, x1 - 0.5, y0 + 2.05, z1 + 0.02, 0x2b2622, M.PLAIN);
  B.box(x0 + 0.4, y0 + 0.98, z1, x1 - 0.4, y0 + 1.04, z1 + 0.32, WHITE, M.PLAIN, { skipBottom: false });
  for (let k = 0; k < 5; k++) B.cyl(x0 + 0.7 + k * ((x1 - x0 - 1.4) / 4), z1 + 0.16, y0 + 1.04, y0 + 1.11, 0.06, 0.07, 8, [0xf28fb0, 0xf4efe4, 0x7a4a2e, 0x9fd86a, 0xf6d36b][k], M.PLAIN, true); // tubs of ice cream in the window
  B.box(x0 + 0.5, y0 + 0.2, z1, x1 - 0.5, y0 + 0.98, z1 + 0.03, 0x8fc7e6, M.BOARDS);       // a blue panel under the counter
  // the awning: stripes sloping out over the window, a scalloped edge
  const n = 9, aw = x1 - x0 + 0.2, ya = y0 + 2.28, yb = y0 + 1.98, za = z1, zb = z1 + 0.95;
  for (let k = 0; k < n; k++) {
    const xa = x0 - 0.1 + (k / n) * aw, xb = x0 - 0.1 + ((k + 1) / n) * aw, col = k % 2 ? WHITE : PINK;
    B.quad([xa, ya, za], [xb, ya, za], [xb, yb, zb], [xa, yb, zb], col, M.PLAIN, null, [0, 0.95, 0.3]);
    B.quad([xa, ya, za], [xa, yb, zb], [xb, yb, zb], [xb, ya, za], scaleHex(col, 0.75), M.PLAIN, null, [0, -1, 0]);
    tri2(B, [xa, yb, zb], [xb, yb, zb], [(xa + xb) / 2, yb - 0.17, zb + 0.01], col, [0, 0, 1]);
  }
  // the giant cone on the roof: a waffle cone, three scoops and a cherry
  const cz = (z0 + z1) / 2, cy = y0 + h + 0.24;
  B.cyl(mid, cz, cy, cy + 0.85, 0.05, 0.36, 12, 0xd9a45b, M.PLAIN, false);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI; B.tube([mid + Math.cos(a) * 0.1, cy + 0.1, cz + Math.sin(a) * 0.1], [mid + Math.cos(a + 1.2) * 0.372, cy + 0.84, cz + Math.sin(a + 1.2) * 0.372], 0.012, 0.012, 3, 0xb8823e, M.PLAIN); }
  ball(B, [mid, cy + 1.0, cz], 0.38, [0xf28fb0], 0.85, 12, 8);
  ball(B, [mid - 0.05, cy + 1.42, cz + 0.02], 0.31, [0xf4efe4], 0.85, 12, 8);
  ball(B, [mid + 0.02, cy + 1.77, cz - 0.01], 0.25, [0x7a4a2e], 0.85, 12, 8);
  ball(B, [mid + 0.04, cy + 2.05, cz], 0.07, [0xc0302a], 1, 8, 6);
}

// a picnic table with two benches (wood, on an A-frame)
function picnic(B, p) {
  const F = frame(p), rot = p.rot || 0;
  lbox(B, F, rot, 0, 0.7, 0, 1.6, 0.05, 0.72, WOOD, M.PLANKS);
  for (const s of [-1, 1]) lbox(B, F, rot, 0, 0.42, s * 0.62, 1.6, 0.04, 0.26, WOOD, M.PLANKS);
  for (const lx of [-0.6, 0.6]) {
    lbox(B, F, rot, lx, 0.38, 0, 0.06, 0.05, 1.5, scaleHex(WOOD, 0.8));
    for (const s of [-1, 1]) lbox(B, F, rot, lx, 0, s * 0.5, 0.06, 0.8, 0.06, scaleHex(WOOD, 0.8), M.PLAIN, s * 0.55);
  }
}

// the jetty you can walk out on: planks on posts, a railing either side, a diving board at the
// end, a ladder down into the water and a life ring on a post
function jetty(B, p) {
  const { x0, x1, z0, z1 } = p, top = SAND_Y, xm = (x0 + x1) / 2;
  B.box(x0, top - 0.14, z0, x1, top + 0.02, z1, 0xa98458, M.PLANKS, { cell: [1, 1] });
  B.box(x0 - 0.06, top - 0.24, z0 + 0.4, x0 + 0.04, top - 0.02, z1, 0x7a5a38);
  B.box(x1 - 0.04, top - 0.24, z0 + 0.4, x1 + 0.06, top - 0.02, z1, 0x7a5a38);
  for (let z = z0 + 1.2; z < z1 + 0.01; z += 2.2) for (const x of [x0 + 0.08, x1 - 0.08]) B.cyl(x, Math.min(z, z1 - 0.12), -2.4, top - 0.12, 0.11, 0.11, 6, 0x5a4430, M.PLAIN);
  // railings: posts and a rail on each side (the end stays open for the diving board)
  for (const x of [x0 - 0.02, x1 + 0.02]) {
    for (let z = z0 + 0.5; z < z1; z += 1.9) B.box(x - 0.045, top, Math.min(z, z1 - 0.2) - 0.045, x + 0.045, top + 0.95, Math.min(z, z1 - 0.2) + 0.045, WHITE);
    B.box(x - 0.05, top + 0.9, z0 + 0.45, x + 0.05, top + 0.98, z1 - 0.15, WHITE);
    B.box(x - 0.03, top + 0.45, z0 + 0.45, x + 0.03, top + 0.5, z1 - 0.15, WHITE);
  }
  // the diving board: a stand and a springy board out over the water, blue at the tip
  B.box(xm - 0.32, top, z1 - 0.95, xm + 0.32, top + 0.32, z1 - 0.55, 0x9aa0a6, M.PLAIN);
  B.rbox(xm, top + 0.32, z1 + 0.3, 0.5, 0.06, 2.6, 0, WHITE, M.PLAIN, 0);
  B.rbox(xm, top + 0.321, z1 + 1.4, 0.5, 0.062, 0.4, 0, 0x2c7fd0, M.PLAIN, 0);
  // the ladder on the east side near the end: two chrome rails bent over the edge, rungs in the water
  const lz = z1 - 1.6;
  for (const dz of [-0.22, 0.22]) {
    B.tube([x1 - 0.15, top + 0.02, lz + dz], [x1 - 0.1, top + 0.75, lz + dz], 0.025, 0.025, 6, 0xd9dde2, M.CHROME);
    B.tube([x1 - 0.1, top + 0.75, lz + dz], [x1 + 0.3, top + 0.75, lz + dz], 0.025, 0.025, 6, 0xd9dde2, M.CHROME);
    B.tube([x1 + 0.3, top + 0.75, lz + dz], [x1 + 0.34, WATER_Y - 0.6, lz + dz], 0.025, 0.025, 6, 0xd9dde2, M.CHROME);
  }
  for (const y of [top - 0.25, WATER_Y + 0.1, WATER_Y - 0.25]) B.box(x1 + 0.3, y - 0.02, lz - 0.22, x1 + 0.36, y + 0.02, lz + 0.22, 0xd9dde2, M.CHROME);
  // a life ring on a post at the land end
  const lp = [x0 - 0.35, top, z0 + 0.7];
  B.box(lp[0] - 0.05, top - 0.02, lp[2] - 0.05, lp[0] + 0.05, top + 1.55, lp[2] + 0.05, WOOD);
  torus(B, [lp[0], top + 1.1, lp[2] + 0.08], [0, 0, 1], 0.24, 0.06, 12, 6, (i) => (Math.floor(i / 3) % 2 ? WHITE : 0xd2342c));
}

// the boardwalk from the road down across the sand (planks across the way)
function boardwalk(B, p) {
  const { x0, x1, z0, z1 } = p;
  B.box(x0, SAND_Y - 0.03, z0, x1, SAND_Y + 0.05, z1, 0xb58c5e, M.PLANKS, { cell: [1, 1] });
  B.box(x0 - 0.06, SAND_Y - 0.03, z0, x0, SAND_Y + 0.07, z1, 0x7a5a38);
  B.box(x1, SAND_Y - 0.03, z0, x1 + 0.06, SAND_Y + 0.07, z1, 0x7a5a38);
}

// the raft out in the water: a wooden deck on blue floats, a little ladder
function raft(B, p) {
  const s = p.s ?? 1.3, y = WATER_Y + 0.22;
  for (const dx of [-s * 0.7, s * 0.7]) B.hcyl(p.x + dx, WATER_Y + 0.05, p.z, s * 1.9, 0.2, 'z', 10, 0x2c62a8, M.PLAIN);
  B.box(p.x - s, y, p.z - s, p.x + s, y + 0.1, p.z + s, 0xa98458, M.PLANKS, { cell: [1, 1] });
  for (const dz of [-0.2, 0.2]) B.tube([p.x - s + 0.1, y + 0.1, p.z + s * 0.4 + dz], [p.x - s - 0.15, WATER_Y - 0.5, p.z + s * 0.4 + dz], 0.022, 0.022, 5, 0xd9dde2, M.CHROME);
}

// a line of buoys round the swimming area (red and white, yellow at the corners), on a rope
function buoys(B, p) {
  const P = p.pts, step = p.step ?? 2.3;
  let k = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / step));
    B.tube([a[0], WATER_Y + 0.04, a[1]], [b[0], WATER_Y + 0.04, b[1]], 0.012, 0.012, 3, 0xe8e2d0, M.PLAIN);
    for (let j = 0; j < n; j++) {
      const t = j / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      if (j === 0) ball(B, [x, WATER_Y + 0.08, z], 0.26, [0xf2c21b], 1.1, 8, 5);
      else ball(B, [x, WATER_Y + 0.04, z], 0.15, [k++ % 2 ? WHITE : 0xd2342c], 1, 6, 4);
    }
  }
  const e = P[P.length - 1];
  ball(B, [e[0], WATER_Y + 0.08, e[1]], 0.26, [0xf2c21b], 1.1, 8, 5);
}

// a beach volleyball court: lines in the sand, two posts and the net
function volley(B, p) {
  const F = frame(p), rot = p.rot || 0, L = p.len ?? 9, W = p.wid ?? 4.5, Y0 = 1.45, Y1 = 2.35, half = W / 2 + 0.55;
  for (const s of [-1, 1]) {
    lbox(B, F, rot, 0, 0.004, s * W / 2, L + 0.05, 0.01, 0.05, WHITE);
    lbox(B, F, rot, s * L / 2, 0.004, 0, 0.05, 0.01, W, WHITE);
    const q = F(0, 0, s * half);
    B.cyl(q[0], q[2], SAND_Y - 0.05, SAND_Y + 2.45, 0.05, 0.05, 6, 0x2c62a8, M.PLAIN, true);
    B.cyl(q[0], q[2], SAND_Y + 2.45, SAND_Y + 2.5, 0.06, 0.06, 6, WHITE, M.PLAIN, true);
  }
  const net = (lx, ly0, ly1, lz0, lz1, t, col) => {
    const a = F(lx, ly0, lz0), b = F(lx, ly0, lz1);
    B.rbox((a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2, t, ly1 - ly0, Math.abs(lz1 - lz0), rot, col, M.PLAIN, 0);
  };
  net(0, Y1 - 0.07, Y1, -half, half, 0.03, WHITE);
  net(0, Y0, Y0 + 0.03, -half, half, 0.02, WHITE);
  for (let lz = -half + 0.2; lz < half; lz += 0.24) net(0, Y0, Y1 - 0.06, lz - 0.006, lz + 0.006, 0.01, 0x22252a);
  for (let y = Y0 + 0.15; y < Y1 - 0.06; y += 0.15) net(0, y, y + 0.012, -half, half, 0.01, 0x22252a);
}

// tufts of dune grass: thin blades leaning out from the middle (two-sided)
function grass(B, p) {
  for (const [x, z, s, sd] of p.pts) {
    const r = rand(sd), n = 10 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, lean = 0.18 + r() * 0.3, hh = (0.3 + r() * 0.32) * s, bw = 0.022 + r() * 0.018;
      const bx = x + Math.cos(a) * 0.09 * r(), bz = z + Math.sin(a) * 0.09 * r();
      const tip = [bx + Math.cos(a) * lean * hh, SAND_Y + hh, bz + Math.sin(a) * lean * hh];
      const side = [-Math.sin(a) * bw, 0, Math.cos(a) * bw];
      const col = [0x93a957, 0xa4b062, 0xbab47a, 0x86a050][Math.floor(r() * 4)];
      tri2(B, add([bx, SAND_Y, bz], side), add([bx, SAND_Y, bz], mul(side, -1)), tip, col, [Math.cos(a), 0.3, Math.sin(a)]);
    }
  }
}

// a wild rose bush (nypon): a green mound with pink flowers and red hips
function rose(B, p) {
  const r = rand(p.seed ?? 7), s = p.s ?? 1;
  B.ico(p.x, SAND_Y + 0.25 * s, p.z, 0.55 * s, 0.7, 0x4f7a34, M.FOLIAGE, p.seed ?? 7);
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, e = 0.15 + r() * 0.9, rr = 0.52 * s * Math.cos(e * 0.9);
    const x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr, y = SAND_Y + 0.25 * s + Math.sin(e) * 0.36 * s;
    const c = i % 3 === 0 ? 0xc0302a : 0xf08fb8, k = i % 3 === 0 ? 0.035 : 0.05;
    B.box(x - k, y - k * 0.6, z - k, x + k, y + k * 0.6, z + k, c);
  }
}

// the flagpole with a long Swedish pennant (vimpel), blue with a yellow stripe, waving east
function pennant(B, p) {
  const H = p.h ?? 6.5, top = [p.x, SAND_Y + H, p.z];
  B.cyl(p.x, p.z, SAND_Y, SAND_Y + H, 0.07, 0.045, 8, WHITE, M.PLAIN, true);
  B.ico(top[0], top[1] + 0.06, top[2], 0.08, 1, 0xd8b45a, M.CHROME, 9);
  const n = 8, len = 3.2;
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n;
    const pt = (t, v) => [p.x + t * len, top[1] - 0.12 - t * 0.55 + v * (1 - t * 0.85) * 0.4 - 0.2, p.z + Math.sin(t * 7 + 0.4) * 0.22 * t];
    for (const [v0, v1, col] of [[-0.5, -0.17, 0x1f5aa6], [-0.17, 0.17, 0xf2c21b], [0.17, 0.5, 0x1f5aa6]]) {
      const a = pt(t0, v0), b = pt(t1, v0), c = pt(t1, v1), d = pt(t0, v1);
      B.quad(a, b, c, d, col, M.PLAIN, null, [0, 0, 1]);
      B.quad(a, d, c, b, scaleHex(col, 0.85), M.PLAIN, null, [0, 0, -1]);
    }
  }
}

// the entrance from the road: two wooden posts and a beam (the sign hangs between them)
function arch(B, p) {
  const { x0, x1, z } = p, H = 2.75;
  for (const x of [x0, x1]) {
    B.box(x - 0.08, SAND_Y - 0.05, z - 0.08, x + 0.08, SAND_Y + H, z + 0.08, WOOD, M.PLAIN);
    B.box(x - 0.11, SAND_Y + H, z - 0.11, x + 0.11, SAND_Y + H + 0.06, z + 0.11, WHITE);
  }
  B.box(x0 - 0.25, SAND_Y + H - 0.32, z - 0.07, x1 + 0.25, SAND_Y + H - 0.16, z + 0.07, WOOD, M.PLAIN);
  for (const x of [x0 + 0.3, x1 - 0.3]) B.tube([x, SAND_Y + H - 0.32, z], [x, SAND_Y + H - 0.62, z], 0.008, 0.008, 3, DARK, M.PLAIN);
}

// a bike rack: hoops in a row along local x
function rack(B, p) {
  const F = frame(p), n = p.n ?? 4;
  for (let i = 0; i < n; i++) {
    const lx = (i - (n - 1) / 2) * 0.75, H = 0.8;
    const a = F(lx, 0, -0.32), b = F(lx, H - 0.12, -0.32), c = F(lx, H, -0.2), d = F(lx, H, 0.2), e = F(lx, H - 0.12, 0.32), f = F(lx, 0, 0.32);
    for (const [s, t] of [[a, b], [b, c], [c, d], [d, e], [e, f]]) B.tube(s, t, 0.022, 0.022, 5, 0x9aa0a6, M.CHROME);
  }
}

// a waste bin (green, a dark lid)
function bin(B, p) {
  B.cyl(p.x, p.z, SAND_Y, SAND_Y + 0.82, 0.24, 0.27, 10, 0x2f6b45, M.PLAIN, false);
  B.cyl(p.x, p.z, SAND_Y + 0.82, SAND_Y + 0.9, 0.29, 0.26, 10, DARK, M.PLAIN, true);
}

const KINDS = {
  parasol, lounger, towel, beachBall, cooler, castle, hut, tower, kiosk, picnic, jetty, boardwalk,
  raft, buoys, volley, grass, rose, pennant, arch, rack, bin,
};

export function beachPropInto(B, p) {
  const f = KINDS[p.kind];
  if (f) f(B, p);
}
