// (v1.18) What "Sjubydagen" shows, drawn for render.js: the party on the square (the stage with its banner, the
// strings of lights and bunting, Knäck's biscuit stand and the bun stand), Arne's recipe on its easel in the
// konditori's window, the bunting poles in the lane by the chapel and Folke's harmonium, Måns the cat, what you
// carry, Kexfabriken's name on its van, the recipe and the biscuits on the belt in the factory, the fireworks, and
// M/S Kardemumma coming in to the quay on Västerholmen. The simulation is in sjubydagen.js; this only looks at it.
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
import { M, SJUBY_POLES } from './layout.js';
import { CURB_H } from './config.js';
import { SJUBY, ROCKETS, SHIP_IN, shipX } from './sjubydagen.js';
import { WEST } from './westisle.js';
import { FAB, BELT, beltAt } from './kexhall.js';
import { SHED } from './vedbod.js';
import { softTexture } from './textures.js';

const Y = CURB_H;
const FLAGS = [0xd2342c, 0xf2c21b, 0x2c62a8, 0x2fb35a, 0xf2efe6, 0xe85d9a];
const BULBS = [0xffe08a, 0xff7a5c, 0x8ad2ff, 0xa4ff8a, 0xff8ad8];

// a sign from the atlas as a quad at (x, y, z), facing rot (0: +z, π/2: +x)
function signQuad(B, uv, x, y, z, w, h, rot) {
  if (!uv) return;
  const [u0, v0, u1, v1] = uv, rx = Math.cos(rot), rz = -Math.sin(rot), nx = Math.sin(rot), nz = Math.cos(rot);
  const P = (a, b) => [x + rx * a * w / 2, y + b * h / 2, z + rz * a * w / 2];
  B.quad(P(-1, -1), P(-1, 1), P(1, 1), P(1, -1), 0xffffff, M.SIGN, [[u0, v0], [u0, v1], [u1, v1], [u1, v0]], [nx, 0, nz]);
}
// a sagging string from a to b with little flags (bunting) or bulbs hanging from it
function string(B, a, b, sag, kind, seed = 0) {
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(2, Math.round(len / 0.7));
  let prev = a;
  for (let k = 1; k <= n; k++) {
    const u = k / n, s = Math.sin(u * Math.PI) * sag;
    const q = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - s, a[2] + (b[2] - a[2]) * u];
    B.tube(prev, q, 0.012, 0.012, 3, 0x2d3238);
    if (k < n) {
      const c = kind === 'bulb' ? BULBS[(k + seed) % BULBS.length] : FLAGS[(k + seed) % FLAGS.length];
      if (kind === 'bulb') B.box(q[0] - 0.06, q[1] - 0.17, q[2] - 0.06, q[0] + 0.06, q[1] - 0.05, q[2] + 0.06, c, M.LIGHT);
      else {
        const dx = (b[0] - a[0]) / len * 0.16, dz = (b[2] - a[2]) / len * 0.16;
        B.tri([q[0] - dx, q[1], q[2] - dz], [q[0] + dx, q[1], q[2] + dz], [q[0], q[1] - 0.34, q[2]], c, M.PLAIN);
        B.tri([q[0] + dx, q[1], q[2] + dz], [q[0] - dx, q[1], q[2] - dz], [q[0], q[1] - 0.34, q[2]], c, M.PLAIN);
      }
    }
    prev = q;
  }
}

// the party on the square
function squareGeo(uv) {
  const B = new GeomBuilder(), S = SJUBY.stage;
  // the stage: a low wooden deck with a white edge, the backdrop with the banner, speakers, bulbs round the frame
  B.box(S.x0, Y, S.z0, S.x1 - 0.4, Y + 0.035, S.z1, 0xb08a5a, M.PLANKS);
  for (const z of [S.z0, S.z1 - 0.06]) B.box(S.x0, Y, z, S.x1 - 0.4, Y + 0.06, z + 0.06, 0xf2efe6);
  B.box(S.x0, Y, S.z0, S.x0 + 0.06, Y + 0.06, S.z1, 0xf2efe6);
  B.box(19.6, Y, S.z0, 20.0, Y + 4.2, S.z1, 0x1d2a44, M.PLAIN);
  B.box(19.55, Y + 3.98, S.z0 - 0.1, 20.05, Y + 4.24, S.z1 + 0.1, 0xf2c21b);
  signQuad(B, uv.sjubydagen, 19.57, Y + 3.0, (S.z0 + S.z1) / 2, 7.4, 1.4, -Math.PI / 2);
  for (let k = 0; k <= 16; k++) { const z = S.z0 + 0.2 + k * ((S.z1 - S.z0 - 0.4) / 16); B.box(19.52, Y + 3.86, z - 0.06, 19.58, Y + 3.94, z + 0.06, BULBS[k % 5], M.LIGHT); B.box(19.52, Y + 2.08, z - 0.06, 19.58, Y + 2.16, z + 0.06, BULBS[(k + 2) % 5], M.LIGHT); }
  for (const z of [3.4, 12.6]) {
    for (const a of [0, 2.1, 4.2]) B.tube([19.4, Y + 1.6, z], [19.4 + Math.cos(a) * 0.5, Y, z + Math.sin(a) * 0.5], 0.03, 0.03, 4, 0x2d3238);
    B.box(19.05, Y + 1.6, z - 0.35, 19.75, Y + 2.9, z + 0.35, 0x1d1f22);
    for (const y of [1.95, 2.55]) B.hcyl(19.04, Y + y, z, 0.02, 0.2, 'x', 12, 0x55585e, M.PLAIN);
  }
  // poles round the crowd, strings of lights and bunting between them and the backdrop
  const top = (x, z) => [x, Y + 4.4, z];
  for (const [x, z] of SJUBY_POLES) { B.cyl(x, z, Y, Y + 4.5, 0.07, 0.05, 6, 0xf2efe6); B.ico(x, Y + 4.55, z, 0.1, 1, 0xf2c21b); }
  const [P1, P2, P3, P4] = SJUBY_POLES;
  const BD0 = [19.8, Y + 4.2, S.z0], BD1 = [19.8, Y + 4.2, S.z1];
  string(B, BD0, top(...P1), 0.7, 'bulb', 0); string(B, BD1, top(...P2), 0.7, 'bulb', 2);
  string(B, top(...P1), top(...P4), 0.8, 'bulb', 1); string(B, top(...P2), top(...P3), 0.8, 'bulb', 3);
  string(B, [BD0[0], BD0[1] - 0.5, BD0[2]], [P1[0], Y + 3.8, P1[1]], 0.9, 'flag', 0); string(B, [BD1[0], BD1[1] - 0.5, BD1[2]], [P2[0], Y + 3.8, P2[1]], 0.9, 'flag', 3);
  string(B, [P1[0], Y + 3.8, P1[1]], [P2[0], Y + 3.8, P2[1]], 1.0, 'flag', 1); string(B, [P4[0], Y + 3.8, P4[1]], [P3[0], Y + 3.8, P3[1]], 1.0, 'flag', 4);
  string(B, top(...P1), top(...P3), 1.2, 'bulb', 4);
  // the two stands on the west side: a back wall, side walls, a counter, a striped awning and a sign
  const stand = (z0, col, signUV, goods) => {
    const x0 = -16.6, x1 = -13.7, z1 = z0 + 3.2;
    B.box(x0, Y, z0, x0 + 0.4, Y + 2.3, z1, col, M.BOARDS);
    for (const z of [z0, z1 - 0.3]) B.box(x0, Y, z, x1 - 0.5, Y + 1.1, z + 0.3, col, M.BOARDS);
    B.box(x1 - 0.5, Y, z0, x1, Y + 1.05, z1, 0xf2efe6, M.BOARDS);
    B.box(x1 - 0.6, Y + 1.05, z0 - 0.05, x1 + 0.08, Y + 1.12, z1 + 0.05, 0xc9a77a, M.PLANKS);
    for (const z of [z0 + 0.05, z1 - 0.05]) B.box(x1 - 0.05, Y + 1.12, z - 0.04, x1 + 0.03, Y + 2.4, z + 0.04, 0xf2efe6);
    for (let k = 0; k < 8; k++) B.rbox(x1 - 0.7, Y + 2.45, z0 + (k + 0.5) * 0.4, 1.6, 0.05, 0.4, 0, k % 2 ? 0xf2efe6 : col, M.PLAIN, 0);
    signQuad(B, signUV, x1 + 0.05, Y + 2.85, (z0 + z1) / 2, 3.0, 0.62, Math.PI / 2);
    B.box(x1 + 0.0, Y + 2.52, z0 + 0.05, x1 + 0.04, Y + 3.18, z1 - 0.05, 0x1d1f22);
    goods(x1 - 0.3, (z0 + z1) / 2);
    // balloons on strings at the corner
    for (const [k, dz] of [[0, -0.2], [1, 0.25], [2, 0.05]]) { const bx = x1 + 0.1, bz = z1 + 0.2 + dz, by = Y + 3.2 + k * 0.35; B.tube([x1, Y + 1.12, z1], [bx, by - 0.3, bz], 0.004, 0.004, 3, 0xf2efe6); B.ico(bx, by, bz, 0.26, 1.15, FLAGS[(k * 2 + (z0 > 5 ? 1 : 0)) % 6], M.PAINT); }
  };
  stand(9.0, 0x1f4fa0, uv.sjubykex, (x, z) => { for (let k = 0; k < 6; k++) B.box(x - 0.18, Y + 1.12 + (k % 2) * 0.22, z - 1.1 + Math.floor(k / 2) * 0.75, x + 0.18, Y + 1.32 + (k % 2) * 0.22, z - 0.6 + Math.floor(k / 2) * 0.75, k % 2 ? 0xf2c21b : 0x1f4fa0, M.PLAIN); });
  stand(2.0, 0xe58fa8, uv.bullstand, (x, z) => { for (let k = 0; k < 12; k++) B.cyl(x - 0.15 + (k % 2) * 0.28, z - 1.2 + Math.floor(k / 2) * 0.45, Y + 1.12, Y + 1.24, 0.12, 0.08, 8, 0xc8843c, M.PLAIN, true); });
  return B.toGeometry(THREE);
}

// Arne's recipe in a dark wooden frame on an easel, in front of the konditori's left window
function recipeGeo() {
  const B = new GeomBuilder(), { x, z } = SJUBY.recipe;
  for (const s of [-1, 1]) B.tube([x + s * 0.35, Y, z + 0.18], [x + s * 0.18, Y + 1.55, z - 0.02], 0.025, 0.02, 5, 0x6b4a2e);
  B.tube([x, Y, z - 0.35], [x, Y + 1.5, z - 0.05], 0.022, 0.02, 5, 0x6b4a2e);
  B.box(x - 0.4, Y + 0.78, z - 0.02, x + 0.4, Y + 0.84, z + 0.12, 0x6b4a2e);
  B.box(x - 0.36, Y + 0.84, z - 0.03, x + 0.36, Y + 1.78, z + 0.01, 0x3a2618, M.PLAIN);
  B.box(x - 0.3, Y + 0.9, z - 0.045, x + 0.3, Y + 1.72, z - 0.03, 0xf2e6c8, M.PLAIN);
  for (let k = 0; k < 9; k++) B.box(x - 0.24, Y + 1.62 - k * 0.075, z - 0.05, x - 0.24 + (k % 3 === 2 ? 0.3 : 0.46), Y + 1.635 - k * 0.075, z - 0.046, 0x5a4a3a);
  return B.toGeometry(THREE);
}

// the harmonium: a dark wooden cabinet with a keyboard, two pedals and a little music stand
function organGeo() {
  const B = new GeomBuilder();
  B.box(-0.55, 0, -0.22, 0.55, 0.9, 0.22, 0x5a3a22, M.BOARDS);
  B.box(-0.55, 0.9, -0.22, 0.55, 1.15, -0.08, 0x5a3a22, M.BOARDS);
  B.box(-0.5, 0.88, -0.08, 0.5, 0.92, 0.12, 0xf4f1ea);
  for (let k = 0; k < 7; k++) B.box(-0.42 + k * 0.14, 0.92, -0.06, -0.38 + k * 0.14, 0.94, 0.06, 0x1d1f22);
  for (const s of [-1, 1]) B.box(s * 0.22 - 0.13, 0.08, 0.22, s * 0.22 + 0.13, 0.12, 0.42, 0x3a2618);
  B.box(-0.3, 1.15, -0.1, 0.3, 1.45, -0.08, 0xf2e6c8);
  return B.toGeometry(THREE);
}
// a blue box with the bunting spilling over the edge
function boxGeo() {
  const B = new GeomBuilder();
  B.box(-0.3, 0, -0.22, 0.3, 0.3, 0.22, 0x2c62a8, M.PAINT);
  for (let k = 0; k < 7; k++) B.tri([-0.26 + k * 0.08, 0.3, -0.2], [-0.2 + k * 0.08, 0.3, -0.2], [-0.23 + k * 0.08, 0.16, -0.24], FLAGS[k % 6]);
  B.box(-0.26, 0.3, -0.18, 0.26, 0.36, 0.18, 0xd2342c, M.PLAIN);
  return B.toGeometry(THREE);
}
// the recipe, out of its frame: a sheet of old paper with lines of ink
function paperGeo() {
  const B = new GeomBuilder();
  B.box(-0.15, 0, -0.21, 0.15, 0.006, 0.21, 0xf2e6c8);
  for (let k = 0; k < 9; k++) B.box(-0.11, 0.006, -0.17 + k * 0.04, 0.11 - (k % 3 === 2 ? 0.08 : 0), 0.008, -0.16 + k * 0.04, 0x5a4a3a);
  return B.toGeometry(THREE);
}
// Måns: a big ginger cat, standing (nose along +z)
function catGeo() {
  const B = new GeomBuilder(), C = 0xe08a3a, D = 0xc8702a;
  B.ico(0, 0.22, 0, 0.17, 0.62, C, M.PLAIN); B.ico(0, 0.22, -0.12, 0.14, 0.66, C, M.PLAIN);
  B.ico(0, 0.32, 0.2, 0.1, 0.9, C, M.PLAIN);
  for (const s of [-1, 1]) { B.ico(s * 0.055, 0.42, 0.2, 0.035, 1.3, D, M.PLAIN); B.box(s * 0.04 - 0.012, 0.34, 0.285, s * 0.04 + 0.012, 0.352, 0.29, 0x2a2b2f); }
  for (const [x, z] of [[-0.07, 0.1], [0.07, 0.1], [-0.07, -0.15], [0.07, -0.15]]) B.cyl(x, z, 0, 0.18, 0.03, 0.03, 5, C, M.PLAIN, true);
  B.tube([0, 0.26, -0.24], [0, 0.42, -0.38], 0.03, 0.02, 5, D);
  return B.toGeometry(THREE);
}
// a biscuit: a golden square with holes
function biscuitGeo() {
  const B = new GeomBuilder();
  B.box(-0.08, 0, -0.08, 0.08, 0.025, 0.08, 0xd9a441);
  for (const [x, z] of [[-0.04, -0.04], [0.04, -0.04], [-0.04, 0.04], [0.04, 0.04]]) B.box(x - 0.008, 0.025, z - 0.008, x + 0.008, 0.027, z + 0.008, 0x9a6a1a);
  return B.toGeometry(THREE);
}
// Kexfabriken's name over the BULLBILEN board on both sides of its van (van-local coordinates)
function liveryGeo(uv) {
  const B = new GeomBuilder();
  if (!uv) return B.toGeometry(THREE);
  const [u0, v0, u1, v1] = uv;
  for (const s of [1, -1]) {
    const x0 = s * 1.018, x1 = s * 0.984, za = 0.32, zb = -1.62, y0 = 1.2, y1 = 2.02;
    B.box(Math.min(x0, x1) - 0.004, y0 - 0.02, zb - 0.02, Math.max(x0, x1) + 0.004, y1 + 0.02, za + 0.02, 0x1f4fa0, M.PLAIN);
    const xa = s * 1.03, xb = s * 1.03;   // (upright, just outside the plate: the van's side leans in a little)
    const uvs = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    if (s > 0) B.quad([xa, y0, za], [xb, y1, za], [xb, y1, zb], [xa, y0, zb], 0xffffff, M.SIGN, uvs, [1, 0, 0]);
    else B.quad([xa, y0, zb], [xb, y1, zb], [xb, y1, za], [xa, y0, za], 0xffffff, M.SIGN, uvs, [-1, 0, 0]);
  }
  return B.toGeometry(THREE);
}
// M/S Kardemumma: a small cargo ship, bow toward +x, lights in her windows
function shipGeo(uv) {
  const B = new GeomBuilder(), L = WEST.ship.len, W = WEST.ship.wid, h0 = -0.7;
  const hl = L / 2, hw = W / 2;
  B.box(-hl, h0 - 1.2, -hw, hl - 6, h0 + 0.4, hw, 0x8a2a24, M.PAINT);              // the red bottom
  B.box(-hl, h0 + 0.4, -hw, hl - 6, h0 + 4.2, hw, 0x1d2a44, M.PAINT);              // the dark-blue hull
  B.box(-hl - 0.05, h0 + 4.0, -hw - 0.05, hl - 6, h0 + 4.35, hw + 0.05, 0xf2efe6);
  // the bow: tapering boxes
  for (let k = 0; k < 6; k++) { const f = 1 - k / 6, x0 = hl - 6 + k, w = hw * (0.25 + 0.75 * f); B.box(x0, h0 - 0.8 + k * 0.1, -w, x0 + 1.02, h0 + 4.35 + k * 0.08, w, k % 2 ? 0x1d2a44 : 0x1a2640, M.PAINT); }
  B.box(-hl + 1, h0 + 4.2, -hw + 0.6, hl - 6, h0 + 4.3, hw - 0.6, 0x7a3a2a, M.PLAIN);   // the deck
  // the bridge and the cabins at the stern
  B.box(-hl + 2, h0 + 4.3, -hw + 0.8, -hl + 11, h0 + 8.8, hw - 0.8, 0xf2efe6, M.PAINT);
  B.box(-hl + 3, h0 + 8.8, -hw + 1.2, -hl + 10, h0 + 11.2, hw - 1.2, 0xf2efe6, M.PAINT);
  for (const [x0, x1, y] of [[-hl + 2.6, -hl + 10.4, 5.4], [-hl + 2.6, -hl + 10.4, 7.2], [-hl + 3.4, -hl + 9.6, 9.6]]) {
    for (let k = 0; x0 + k * 1.3 + 0.8 < x1; k++) for (const s of [-1, 1]) B.box(x0 + k * 1.3, h0 + y, s * (hw - 0.79) - 0.02, x0 + k * 1.3 + 0.8, h0 + y + 0.7, s * (hw - 0.79) + 0.02, 0xffe6a0, M.LIGHT);
  }
  B.box(-hl + 9.9, h0 + 9.4, -hw + 1.3, -hl + 10.05, h0 + 10.6, hw - 1.3, 0xffe6a0, M.LIGHT);
  // the funnel: yellow band, a cardamom-green top
  B.cyl(-hl + 5.5, 0, h0 + 11.2, h0 + 14.6, 1.1, 1.0, 12, 0x2f6b45, M.PAINT, true);
  B.cyl(-hl + 5.5, 0, h0 + 12.4, h0 + 13.2, 1.06, 1.04, 12, 0xf2c21b, M.PAINT, false);
  // a mast with a lamp, containers on deck, the name on the bow
  B.cyl(hl - 9, 0, h0 + 4.3, h0 + 13, 0.12, 0.08, 6, 0xf2efe6);
  B.ico(hl - 9, h0 + 13.1, 0, 0.22, 1, 0xfff1c9, M.LIGHT);
  B.ico(-hl + 6.5, h0 + 11.6, 0, 0.18, 1, 0xff5040, M.LIGHT);
  const cc = [0xd2342c, 0x2c62a8, 0xe8833a, 0x2f6b45, 0x8a8f99, 0xf2c21b];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < (i + j) % 3 + 1; k++) {
    const x0 = -hl + 13 + i * 6.6, z0 = -hw + 1.2 + j * 3.4;
    B.box(x0, h0 + 4.3 + k * 2.6, z0, x0 + 6.1, h0 + 6.9 + k * 2.6, z0 + 2.45, cc[(i * 3 + j + k) % 6], M.CORR, { cell: [0.6, 2.6] });
  }
  if (uv.shipname) for (const s of [-1, 1]) signQuad(B, uv.shipname, hl - 9.5, h0 + 3.2, s * (hw + 0.03), 6.4, 1.0, s > 0 ? 0 : Math.PI);
  if (uv.shipport) signQuad(B, uv.shipport, -hl - 0.03, h0 + 2.6, 0, 5.0, 0.8, -Math.PI / 2);
  return B.toGeometry(THREE);
}

const MAXP = 1400;      // fireworks: points at once

export class SjubyView {
  constructor(scene, mat, atlas) {
    const uv = atlas.uv;
    const add = (geo, parent = scene) => { const o = new THREE.Mesh(geo, mat); o.visible = false; parent.add(o); return o; };
    this.square = add(squareGeo(uv));
    this.recipe = add(recipeGeo());
    // the lane by the chapel: three poles, and the bunting between them once hung
    const PG = new GeomBuilder();
    for (const q of SJUBY.poles) { PG.cyl(q.x, q.z, Y, Y + 4.0, 0.06, 0.045, 6, 0xf2efe6); PG.ico(q.x, Y + 4.05, q.z, 0.09, 1, 0xf2c21b); }
    this.poles = add(PG.toGeometry(THREE));
    const P = SJUBY.poles, tower = [-50.5, Y + 6.2, 234.3];
    this.runs = [[P[0], P[1]], [P[0], P[2]], [P[2], null]].map(([a, b], k) => {
      const G = new GeomBuilder();
      string(G, [a.x, Y + 3.9, a.z], b ? [b.x, Y + 3.9, b.z] : tower, 0.9, 'flag', k * 2);
      return add(G.toGeometry(THREE));
    });
    this.organ = add(organGeo());
    this.box = add(boxGeo());
    this.carryBox = add(boxGeo());
    this.paper = add(paperGeo());
    this.cat = add(catGeo());
    this.livery = [0, 1].map(() => { const o = add(liveryGeo(uv.kexvan)); o.matrixAutoUpdate = false; return o; });
    this.biscuits = Array.from({ length: 36 }, () => add(biscuitGeo()));
    this.ship = add(shipGeo(uv));
    // fireworks: one cloud of points, additive, rebuilt every frame from ROCKETS and the show's clock
    const g = new THREE.BufferGeometry();
    this.fwPos = new Float32Array(MAXP * 3); this.fwCol = new Float32Array(MAXP * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.fwPos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.fwCol, 3).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.fw = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.9, map: softTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: true }));
    this.fw.frustumCulled = false; this.fw.visible = false;
    scene.add(this.fw);
    this.FWC = [[1, 0.35, 0.3], [1, 0.85, 0.35], [0.4, 0.75, 1], [0.5, 1, 0.5], [1, 0.5, 0.95], [1, 1, 0.92]];
  }

  sync(game, indoor) {
    const m = game.mission, p = game.player, ind = game.indoors;
    for (const o of [this.square, this.recipe, this.poles, ...this.runs, this.organ, this.box, this.carryBox, this.paper, this.cat, ...this.livery, ...this.biscuits, this.ship]) o.visible = false;
    this.fw.visible = false;
    if (!m) return;
    const job = m.active && m.active.id === 'sjuby' ? m.active : null;
    const hold = (o, who, fwd, up) => { o.position.set(who.x + Math.sin(who.h) * fwd, who.y + up, who.z + Math.cos(who.h) * fwd); o.rotation.set(0, who.h, 0); o.visible = true; };
    const onFoot = p.state === 'foot' || p.state === 'down';
    if (indoor) {
      if (ind.where === 'shed' && job && job.signeAt === 'shed' && !job.carry) { this.box.position.set(SJUBY.box.x, SHED.y, SJUBY.box.z); this.box.rotation.set(0, 0.3, 0); this.box.visible = true; }
      if (ind.where === 'fabrik') this.syncBelt(game, job);
      if (job && job.carry === 'vimplar' && onFoot) hold(this.carryBox, p, 0.45, 0.85);
      if (job && job.carry === 'recept' && onFoot) { hold(this.paper, p, 0.4, 1.05); this.paper.rotation.set(-1.0, p.h, 0, 'YXZ'); }
      return;
    }
    // the square, the recipe in the window
    this.square.visible = !!m.sjubyUp;
    this.recipe.visible = !!((m.sjubyUp && m.recipeHome) || m.done.has('sjuby'));
    // the lane by the chapel: while the quest runs
    if (job && job.stage !== 'intro') {
      this.poles.visible = true;
      const H = job.hung;
      this.runs[0].visible = H[0] && H[1]; this.runs[1].visible = H[0] && H[2]; this.runs[2].visible = H[2];
      if (job.organAt === 'step') { this.organ.position.set(SJUBY.organ.x, Y, SJUBY.organ.z); this.organ.rotation.set(0, Math.PI / 2, 0); this.organ.visible = true; }
      else if (job.organAt === 'chapel') { this.organ.position.set(SJUBY.organTo.x, Y, SJUBY.organTo.z); this.organ.rotation.set(0, Math.PI, 0); this.organ.visible = true; }
      else if (job.carry === 'orgel' && onFoot) { hold(this.organ, p, 0.55, 0.32); }
      if (job.carry === 'vimplar' && onFoot) hold(this.carryBox, p, 0.45, 0.85);
      if (job.carry === 'recept' && onFoot) { hold(this.paper, p, 0.4, 1.05); this.paper.rotation.set(-1.0, p.h, 0, 'YXZ'); }
      const c = job.cat;
      if (c && c.state !== 'home') { this.cat.position.set(c.x, game.world.groundHeight(c.x, c.z), c.z); this.cat.rotation.set(0, c.h, 0); this.cat.visible = true; }
    }
    // Kexfabriken's name on its vans
    let k = 0;
    for (const v of game.vehicles) {
      if (!v.kex || v.removed || k >= this.livery.length) continue;
      const o = this.livery[k++], mm = o.matrix;
      mm.makeRotationY(v.h);
      if (v.rampPitch) { const r = new THREE.Matrix4().makeRotationX(-v.rampPitch); mm.multiply(r); }
      mm.setPosition(v.x, v.visY ?? v.y, v.z);
      o.matrixWorldNeedsUpdate = true;
      o.visible = true;
    }
    // the fireworks and the ship
    const show = job && job.stage === 'show' ? job.showT : null;
    if (show != null) this.syncFireworks(show);
    if (m.shipIn || (show != null && show > SHIP_IN.t0 - 1)) {
      const S = WEST.ship;
      this.ship.position.set(show != null ? shipX(show) : SHIP_IN.x1, 0, S.z);
      this.ship.rotation.set(0, 0, 0);
      this.ship.visible = true;
    }
  }

  syncBelt(game, job) {
    const running = job && job.stage === 'belt' && job.beltOn && !job.stopped;
    const t = game.time, n = this.biscuits.length, gap = BELT.len / n;
    for (let i = 0; i < n; i++) {
      const s = ((i * gap + (running ? t * FAB.speed : 0)) % BELT.len + BELT.len) % BELT.len;
      if (job && job.stage === 'belt' && Math.abs(s - job.recipeS) < 0.5) continue;
      const P = beltAt(s), o = this.biscuits[i];
      o.position.set(P.x, BELT.y - 0.02, P.z); o.rotation.set(0, Math.atan2(P.dx, P.dz) + i * 0.3, 0); o.visible = true;
    }
    if (job && (job.stage === 'belt' || job.stage === 'hallTalk') && job.carry !== 'recept') {
      const P = job.stage === 'belt' ? beltAt(job.recipeS) : beltAt(0);
      this.paper.position.set(P.x, BELT.y, P.z); this.paper.rotation.set(0, Math.atan2(P.dx, P.dz), 0); this.paper.visible = job.stage === 'belt';
    }
  }

  // each rocket: a bright spark rising with a short trail, then a burst of sparks that slow, fall and fade
  syncFireworks(t) {
    const pos = this.fwPos, col = this.fwCol;
    let n = 0;
    const put = (x, y, z, r, g, b) => { if (n >= MAXP) return; pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z; col[n * 3] = r; col[n * 3 + 1] = g; col[n * 3 + 2] = b; n++; };
    for (const R of ROCKETS) {
      const a = t - R.t;
      if (a < 0 || a > R.up + 3.2) continue;
      if (a < R.up) {
        const u = a / R.up, e = 1 - (1 - u) * (1 - u);
        for (let k = 0; k < 5; k++) { const ee = Math.max(0, e - k * 0.03), f = 1 - k * 0.2; put(R.x, Y + (R.y - Y) * ee, R.z, 1 * f, 0.8 * f, 0.5 * f); }
        continue;
      }
      const b = a - R.up, fade = Math.max(0, 1 - b / 3.0), C = this.FWC[R.c], C2 = this.FWC[(R.c + 3) % 6];
      const cnt = R.big ? 110 : 70, sp = R.big ? 16 : 12, rr = (1 - Math.exp(-2.2 * b)) / 2.2;
      for (let i = 0; i < cnt; i++) {
        const h1 = Math.sin((R.seed * 131 + i) * 12.9898) * 43758.5453, h2 = Math.sin((R.seed * 71 + i) * 78.233) * 12543.21;
        const u = h1 - Math.floor(h1), v = h2 - Math.floor(h2);
        const th = u * Math.PI * 2, cz = v * 2 - 1, sz = Math.sqrt(1 - cz * cz);
        const dx = sz * Math.cos(th), dy = cz, dz = sz * Math.sin(th);
        const s = sp * (0.85 + 0.15 * ((i * 7) % 5) / 4), tw = 0.75 + 0.25 * Math.sin(b * 22 + i);
        const cc = i % 4 === 0 ? C2 : C, k = fade * tw;
        put(R.x + dx * s * rr, R.y + dy * s * rr - 2.6 * b * b, R.z + dz * s * rr, cc[0] * k, cc[1] * k, cc[2] * k);
      }
    }
    const g = this.fw.geometry;
    g.setDrawRange(0, n);
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    this.fw.visible = n > 0;
  }
}
