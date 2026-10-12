// The windmill on Norrholmen from the inside (v1.13): Mjölnar-Majken's ground floor, where the flour
// comes down. The millstones sit in their wooden case on a platform in the middle, the hopper over
// them and the great shaft going up through the ceiling to the sails; sacks along the walls, the scale,
// Majken's workbench, the ladder up to the stone floor – and five mouse holes along the skirting
// ("Möss i kvarnen"). Like the other insides it is built out at sea (INDOOR in config.js). The mill is
// an octagon: the corners are cut off. Local coordinates: x east, z south, y up from the floor; the
// origin is the north-west corner. The door is in the south wall (the real one faces south-south-east).
//
//   z=0      ╱ H1      workbench        H2 ╲
//          ╱                                ╲
//        ladder       ┌──────────┐          sacks
//        │            │ platform │ (the     sacks
//        H3           │  stones  │  shaft)  sacks
//        │ table      └──────────┘          sacks
//          ╲ Majken               scale  H4 ╱
//   z=9      ╲ H5          door           ╱
//        x=0                              x=9
import { INDOOR } from './config.js';
import { ISLE } from './island.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, PARQUET = 30, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.6;
const X = INDOOR.x + 52, Y = INDOOR.y, Z = INDOOR.z + 4;

// outside: the door on the mill's south-south-east face (island.js: face 1 of the octagon)
const DA = (22.5 + 45) * Math.PI / 180;
export const MILL_DOOR = { x: ISLE.mill.x + Math.cos(DA) * 4.65, z: ISLE.mill.z + Math.sin(DA) * 4.65, r: 1.25, h: Math.atan2(Math.cos(DA), Math.sin(DA)) };

// the mouse holes: where the hole is (on the wall), and where you stand to plug it
export const HOLES = [
  { id: 1, at: [2.2, 0.0], n: [0, 1] },
  { id: 2, at: [6.6, 0.0], n: [0, 1] },
  { id: 3, at: [0.0, 4.6], n: [1, 0] },
  { id: 4, at: [9.0, 7.25], n: [-1, 0] },
  { id: 5, at: [2.6, 9.0], n: [0, -1] },
];
for (const H of HOLES) {
  H.x = X + H.at[0] + H.n[0] * 0.12; H.z = Z + H.at[1] + H.n[1] * 0.12;           // the mouth (where a mouse goes in)
  H.sx = X + H.at[0] + H.n[0] * 0.65; H.sz = Z + H.at[1] + H.n[1] * 0.65; H.r = 0.75; // stand here: TÄPP
  H.wx = X + H.at[0]; H.wz = Z + H.at[1];
}

export const MILL_ROOM = {
  spawn: { x: X + 4.5, z: Z + 8.2, h: Math.PI },        // a step inside the door, facing the millstones
  door: { x: X + 4.5, z: Z + 8.45, r: 0.6 },            // stand here and press GÅ UT
  majken: { x: X + 3.25, z: Z + 8.1, h: Math.PI - 0.5 },  // Majken by the door with the crate
  crate: { x: X + 5.75, y: Y, z: Z + 8.35 },             // the crate the mice go in
  talk: { x: X + 3.25, z: Z + 8.1, r: 1.6 },
  sotis: { x: X + 8.45, y: Y + 1.08, z: Z + 2.6 },       // Sotis, the old black cat, asleep on the sacks
  // where the mice start (local), the white one last
  start: [[2.0, 2.6], [6.8, 2.2], [1.6, 5.8], [6.9, 6.4], [2.6, 7.2], [4.4, 1.6], [7.2, 4.6]],
  room: { x0: X, x1: X + 9, z0: Z, z1: Z + 9 },
  bounds: { x0: X - 0.5, x1: X + 9.5, z0: Z - 0.5, z1: Z + 9.5 },
  y: Y,
};

const WALL = 0xe8e2d2, BEAM = 0x6a4a32;
// walls [x0, z0, x1, z1] (local, full height): the door gap is x 4.0–5.0 in the south wall
export const MILL_WALLS = [
  [-0.2, -0.2, 9.2, 0],
  [-0.2, 0, 0, 9.2],
  [9, 0, 9.2, 9.2],
  [-0.2, 9, 4.0, 9.2],
  [5.0, 9, 9.2, 9.2],
];
// things that block the way [x0, z0, x1, z1, height] – the cut-off corners first (two steps each)
export const MILL_FURN = [
  [0, 0, 1.3, 0.65, IH], [0, 0.65, 0.65, 1.3, IH],
  [7.7, 0, 9, 0.65, IH], [8.35, 0.65, 9, 1.3, IH],
  [0, 8.35, 0.65, 9, IH], [0, 7.7, 1.3, 8.35, IH],
  [8.35, 7.7, 9, 8.35, IH], [7.7, 8.35, 9, 9, IH],
  [3.3, 3.3, 5.7, 5.7, 0.75],     // the platform with the millstones
  [3.0, 0, 5.6, 0.7, 0.92],       // the workbench
  [7.95, 1.6, 9, 6.6, 1.05],      // the sacks along the east wall
  [0, 1.75, 0.5, 2.65, IH],       // the ladder up to the stone floor
  [0.1, 6.2, 0.8, 7.0, 0.75],     // Majken's little table
  [6.05, 7.55, 6.85, 8.2, 0.95],  // the scale
  [5.4, 8.05, 6.1, 8.65, 0.55],   // the crate for the mice
  [4.0, 9, 5.0, 9.2, IH],         // the door (shut behind you)
];

const SIGNS = {
  kvarnen: { def: { lines: ['SJUBY KVARN', 'ANNO 1890'], bg: '#f2efe6', fg: '#8e2c20', font: 0.5, border: '#6a4a32' }, x: 4.3, y: 1.85, z: 0.012, rot: 0, w: 1.3, h: 0.5 },
  vag: { def: { lines: ['MAX 100 KG'], bg: '#2b2e35', fg: '#f2efe6', font: 0.6, ppm: 180 }, x: 6.45, y: 1.02, z: 7.52, rot: Math.PI, w: 0.5, h: 0.13 },
};

export function millLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of MILL_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of MILL_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs['mill-' + id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id: 'mill-' + id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = MILL_ROOM.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function millInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r, n = 12) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, n, c, m, true);
  const tube = (a, b, r, c, m = PLAIN) => B.tube([X + a[0], Y + a[1], Z + a[2]], [X + b[0], Y + b[1], Z + b[2]], r, r, 6, c, m);
  const ico = (x, y, z, r, sy, c, m = PLAIN) => B.ico(X + x, Y + y, Z + z, r, sy, c, m);
  const rb = (cx, cy, cz, sx, sy, sz, rot, c, m = PLAIN, tilt = 0) => B.rbox(X + cx, Y + cy, Z + cz, sx, sy, sz, rot, c, m, tilt);
  const FLOUR = 0xf1ece0, SACK = 0xd8c9a4, STONE = 0x8f8a83, WOOD = 0x8a6440;

  // the floor: wide old boards, dusted white round the millstones and along the sacks
  floor(0, 0, 9, 9, 0x8a6a48, PARQUET);
  for (const [x0, z0, x1, z1] of [[2.8, 2.8, 6.2, 6.2], [7.2, 1.4, 7.95, 6.8], [4.6, 5.7, 5.6, 6.6]]) floor(x0, z0, x1, z1, 0xd8cfbc, PARQUET, 0.005);
  for (let k = 0; k < 9; k++) ico(2.6 + ((k * 37) % 50) / 10, 0.004, 1.2 + ((k * 53) % 66) / 10, 0.22, 0.02, FLOUR);
  floor(4.0, 9, 5.0, 9.2, 0x6b6f75, PLAIN);
  // the walls: whitewashed, with dark beams; the corners cut off on the diagonal
  for (const [x0, z0, x1, z1] of MILL_WALLS) bx(x0, 0, z0, x1, IH, z1, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(4.0, 2.2, 9, 5.0, IH, 9.2, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  for (const [cx, cz, rot] of [[0.62, 0.62, -Math.PI / 4], [8.38, 0.62, Math.PI / 4], [0.62, 8.38, Math.PI / 4], [8.38, 8.38, -Math.PI / 4]]) {
    rb(cx, 0, cz, 1.9, IH, 0.16, rot, WALL, IWALL);
    rb(cx, IH - 0.25, cz, 1.9, 0.18, 0.2, rot, BEAM);
  }
  for (const [x0, z0, x1, z1] of [[1.2, 0.01, 7.8, 0.06], [1.2, 8.94, 4.0, 8.99], [5.0, 8.94, 7.8, 8.99]]) bx(x0, IH - 0.25, z0, x1, IH - 0.07, z1, BEAM);
  for (const [x0, z0, x1, z1] of [[0.01, 1.2, 0.06, 7.8], [8.94, 1.2, 8.99, 7.8]]) bx(x0, IH - 0.25, z0, x1, IH - 0.07, z1, BEAM);
  for (const [x, z] of [[1.3, 0.08], [7.7, 0.08], [0.08, 4.5], [8.92, 4.5]]) bx(x - 0.08, 0, z - 0.06, x + 0.08, IH, z + 0.06, BEAM); // posts
  bx(4.06, 0, 9, 4.94, 2.2, 9.06, 0x3b3027, ITRIM);                                         // the door
  bx(4.1, 1.0, 8.97, 4.18, 1.1, 9.0, 0x2d3238, CHROME);
  // two small windows with deep sills, the light coming in
  for (const [x, z, rot] of [[6.4, 0.0, 0], [0.0, 3.6, Math.PI / 2]]) {
    const ax = rot ? 0 : 1, az = rot ? 1 : 0;
    const x0 = x - ax * 0.35, x1 = x + ax * 0.35 + (rot ? 0.22 : 0), z0 = z - az * 0.35, z1 = z + az * 0.35 + (rot ? 0 : 0.22);
    bx(x0, 1.5, z0, x1, 1.55, z1, WALL, ITRIM);
    bx(x0, 1.55, z0, x1, 2.25, z1 - (rot ? 0 : 0.2), 0xfff1c9, LIGHT);
    bx(x - ax * 0.02, 1.55, z - az * 0.02, x + ax * 0.02 + (rot ? 0.04 : 0), 2.25, z + az * 0.02 + (rot ? 0 : 0.04), BEAM);
  }

  // ---- the platform: the millstones in their round wooden case, the hopper above, the shaft and the gears
  bx(3.3, 0, 3.3, 5.7, 0.75, 5.7, 0x7a5a3c, PLAIN);
  for (let k = 0; k < 6; k++) bx(3.28, 0.05, 3.4 + k * 0.38, 3.3, 0.7, 3.65 + k * 0.38, 0x6a4a32);
  for (const [x, z] of [[3.35, 3.35], [5.55, 3.35], [3.35, 5.55], [5.55, 5.55]]) bx(x - 0.06, 0, z - 0.06, x + 0.1, 0.78, z + 0.1, BEAM);
  cyl(4.5, 4.5, 0.75, 1.35, 0.95, 0xa07a50, PLAIN, 0.95, 16);                                     // the tun (the case)
  for (let k = 0; k < 3; k++) cyl(4.5, 4.5, 0.85 + k * 0.2, 0.89 + k * 0.2, 0.965, 0x3a3c40, PLAIN, 0.965, 16); // its iron hoops
  cyl(4.5, 4.5, 1.35, 1.37, 0.9, 0x6a4a32, PLAIN, 0.9, 16);
  // the hopper on its frame: a wooden funnel, full of grain
  for (const [dx, dz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) tube([4.5 + dx, 1.37, 4.5 + dz], [4.5 + dx * 0.9, 2.1, 4.5 + dz * 0.9], 0.04, BEAM);
  cyl(4.5, 4.5, 1.75, 2.25, 0.18, 0x9a7a52, PLAIN, 0.55, 4);
  cyl(4.5, 4.5, 2.24, 2.25, 0.53, 0xd9b45a, PLAIN, 0.53, 4);
  // the great shaft up through the ceiling, and the big crown wheel at the top
  cyl(4.5, 4.5, 2.25, IH, 0.16, 0x5a4636, PLAIN, 0.16, 8);
  cyl(4.5, 4.5, 2.3, 2.42, 0.62, 0x6a4a32, PLAIN, 0.62, 16);                                  // the crown wheel, cogs up
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; bx(4.5 + Math.cos(a) * 0.55 - 0.04, 2.42, 4.5 + Math.sin(a) * 0.55 - 0.04, 4.5 + Math.cos(a) * 0.55 + 0.04, 2.5, 4.5 + Math.sin(a) * 0.55 + 0.04, 0x8a6a48); }
  // the flour spout on the south side, with a sack hooked under it
  tube([4.5, 1.1, 5.4], [4.5, 0.9, 5.95], 0.06, 0xa07a50);
  cyl(4.5, 6.2, 0, 0.75, 0.28, SACK, FABRIC, 0.22);
  cyl(4.5, 6.2, 0.74, 0.76, 0.22, FLOUR);
  // a broom against the platform
  tube([3.25, 0.02, 5.9], [3.1, 1.35, 5.75], 0.02, 0xb98a5a); bx(3.12, 0, 5.75, 3.4, 0.16, 6.05, 0xd9b45a, FABRIC);

  // ---- along the walls: the sacks (Sotis asleep on top), the workbench, the ladder, the scale, Majken's table
  for (let i = 0; i < 6; i++) for (let j = 0; j < (i % 3 === 1 ? 3 : 2); j++) {
    const z = 1.85 + i * 0.8, y = j * 0.36;
    rb(8.45, y, z, 0.95, 0.38, 0.72, (i % 2 ? 0.08 : -0.06) + j * 0.05, j % 2 ? 0xcdbd96 : SACK, FABRIC);
  }
  for (let i = 0; i < 6; i++) bx(8.0, 0.18, 1.62 + i * 0.8, 8.02, 0.3, 1.9 + i * 0.8, 0x8e2c20); // a red stripe on each sack
  // Sotis: an old black cat, curled up, one ear up
  ico(8.45, 1.18, 2.6, 0.26, 0.5, 0x1d1f22, FABRIC);
  ico(8.3, 1.25, 2.38, 0.11, 0.85, 0x1d1f22, FABRIC);
  for (const s of [-1, 1]) ico(8.3 + s * 0.06, 1.34, 2.35, 0.03, 1.3, 0x2a2b2f, FABRIC);
  tube([8.6, 1.15, 2.78], [8.25, 1.12, 2.86], 0.035, 0x1d1f22, FABRIC);
  // the workbench: tools on the wall, a tin of grease, a coffee cup, a lamp
  bx(3.0, 0, 0, 5.6, 0.88, 0.7, 0x7a5a3c, PLAIN);
  bx(2.98, 0.88, 0, 5.62, 0.94, 0.72, 0x9a7a52, PLAIN, { skipBottom: false });
  bx(3.0, 1.15, 0.01, 5.6, 1.75, 0.04, 0x6a5a48);
  for (const [x, l] of [[3.25, 0.4], [3.55, 0.3], [3.85, 0.45], [4.15, 0.35], [5.05, 0.4], [5.35, 0.3]]) { tube([x, 1.65, 0.06], [x, 1.65 - l, 0.06], 0.02, 0x3a3c40); bx(x - 0.04, 1.65 - l - 0.08, 0.04, x + 0.04, 1.65 - l, 0.08, 0xb98a5a); }
  cyl(5.2, 0.4, 0.94, 1.06, 0.07, 0x3d7a3a); cyl(3.4, 0.45, 0.94, 1.03, 0.045, 0xf4f4f0);
  B.hcyl(X + 4.0, Y + 0.98, Z + 0.4, 0.5, 0.04, 'x', 8, 0x6a4a32);                           // a spare cog
  // the ladder up to the stone floor (a dark hatch at the top)
  for (const z of [1.8, 2.6]) tube([0.3, 0, z], [0.18, IH, z], 0.035, 0x9a7a52);
  for (let k = 1; k < 9; k++) tube([0.3 - k * 0.013, k * 0.33, 1.8], [0.3 - k * 0.013, k * 0.33, 2.6], 0.025, 0x9a7a52);
  // the scale by the door, with a sack on it and weights beside
  bx(6.05, 0, 7.55, 6.85, 0.15, 8.2, 0x3a3c40, PLAIN); bx(6.1, 0.15, 7.6, 6.8, 0.18, 8.15, 0x6b6f75, CHROME);
  tube([6.45, 0.18, 7.6], [6.45, 0.95, 7.58], 0.03, 0x3a3c40);
  bx(6.2, 0.85, 7.52, 6.7, 1.15, 7.58, 0x2b2e35);
  cyl(6.45, 7.9, 0.18, 0.75, 0.24, SACK, FABRIC, 0.2);
  for (const [x, r] of [[7.1, 0.07], [7.25, 0.05], [7.35, 0.04]]) cyl(x, 7.9, 0, r * 2.2, r, 0x2b2e35, CHROME);
  // Majken's corner: a little table with a thermos and a cup, a calendar, a wooden chair
  bx(0.1, 0.7, 6.2, 0.8, 0.75, 7.0, 0x9a7a52, PLAIN, { skipBottom: false });
  for (const [x, z] of [[0.15, 6.25], [0.7, 6.25], [0.15, 6.9], [0.7, 6.9]]) bx(x, 0, z, x + 0.05, 0.7, z + 0.05, BEAM);
  cyl(0.4, 6.45, 0.75, 1.05, 0.06, 0xc0302a); cyl(0.4, 6.45, 1.05, 1.1, 0.045, 0x2b2e35);
  cyl(0.55, 6.8, 0.75, 0.83, 0.04, 0xf4f4f0);
  bx(0.01, 1.35, 6.25, 0.03, 1.85, 6.85, 0xf4f1ec); bx(0.03, 1.6, 6.3, 0.035, 1.82, 6.8, 0x5f7a4a);
  bx(1.0, 0.42, 6.35, 1.4, 0.46, 6.75, WOOD, PLAIN, { skipBottom: false }); bx(1.36, 0.46, 6.35, 1.4, 0.95, 6.75, WOOD);
  for (const [dx, dz] of [[0.02, 0.02], [0.34, 0.02], [0.02, 0.34], [0.34, 0.34]]) bx(1.0 + dx, 0, 6.35 + dz, 1.04 + dx, 0.42, 6.39 + dz, BEAM);
  // the crate for the mice, with air holes and a lid leaning on it
  bx(5.4, 0, 8.05, 6.1, 0.5, 8.65, 0xb98a5a, PLAIN);
  for (let k = 0; k < 4; k++) bx(5.42 + k * 0.17, 0.3, 8.04, 5.48 + k * 0.17, 0.36, 8.05, 0x3b3027);
  rb(5.75, 0.0, 8.72, 0.7, 0.04, 0.6, 0, 0xa8794a, PLAIN, -1.2);
  // the mouse holes: dark arches at the foot of the walls
  for (const H of HOLES) {
    const hx = H.at[0], hz = H.at[1], [nx, nz] = H.n, w = 0.13;
    const x0 = hx - Math.abs(nz) * w + nx * 0.004, x1 = hx + Math.abs(nz) * w + nx * 0.03, z0 = hz - Math.abs(nx) * w + nz * 0.004, z1 = hz + Math.abs(nx) * w + nz * 0.03;
    bx(Math.min(x0, x1), 0, Math.min(z0, z1), Math.max(x0, x1), 0.14, Math.max(z0, z1), 0x0d0b09);
    ico(hx + nx * 0.02, 0.14, hz + nz * 0.02, 0.13, 0.4, 0x0d0b09);
    for (let k = 0; k < 4; k++) ico(hx + nx * (0.12 + k * 0.05) + nz * (k - 1.5) * 0.08, 0.005, hz + nz * (0.12 + k * 0.05) + nx * (k - 1.5) * 0.08, 0.02, 0.4, 0x2a2420); // droppings (sorry)
  }
  // a lamp hanging over the platform
  void STONE; void IGLASS;
}
