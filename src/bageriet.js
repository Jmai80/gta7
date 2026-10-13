// Bullbilen's bakery on Norrholmen from the inside (v1.17, "Bullbilens bageri"): the bake hall behind the loading
// dock, cold for ten years. Along the north wall the great tunnel oven "Stora Bertha" with the conveyor belt in
// front of it, the dough mixer in the north-east corner, proofing racks on the east wall, the workbench, flour
// sacks, the loading-dock door (with its mice) in the south wall and Dahlgren's office door in the west wall.
// Like the other insides it is built out at sea (INDOOR in config.js). Local coordinates: x east, z south, y up;
// the origin is the north-west corner. The door you come in by is at the east end of the south wall.
//
//   z=0  ┌──────────── STORA BERTHA (the oven) ─────────┬ mixer ┐
//        │ ═══════════════ the belt ═══════════════      │       │
//        KONTOR   Dahlgren        (you)        Bengt Signe  racks
//        │               ┌ workbench ┐                         racks
//        │sacks                                                │
//   z=9  └──── loading door (mice) ──────────────── door ──────┘
//        x=0                                                  x=14
import { INDOOR } from './config.js';
import { ISLE } from './island.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, BRICK = 20, STONE = 25, PLANKS = 26, IWALL = 29, FLOORTILE = 31, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.6;
const S = 14, D = 9;
const X = INDOOR.x + 30, Y = INDOOR.y, Z = INDOOR.z + 62;
const at = (x, z, r, extra = {}) => ({ x: X + x, z: Z + z, r, ...extra });

// outside: a door at the east end of the bakery's south front, past the loading dock (island.js draws it)
const Bk = ISLE.bakery;
export const BAK_DOOR = { x: Bk.x1 - 1.1, z: Bk.z1 + 1.15, r: 1.15 };

export const BAK = {
  spawn: { x: X + 12.3, z: Z + 7.8, h: Math.PI },          // a step inside the door, facing north
  door: at(12.3, 8.55, 0.55),                               // stand here and press GÅ UT
  // the belt in front of the oven: dough balls come from Bengt (east) and go into the oven mouth (west)
  belt: { x0: X + 1.2, x1: X + 10.2, z: Z + 2.25, y: Y + 0.92 },
  station: at(5.8, 3.35, 0.75),                             // stand here: STARTA, then FORMA
  window: { x: X + 5.8, w: 0.5 },                           // a ball is in reach within this of the middle
  bengt: { x: X + 9.0, z: Z + 3.25, h: Math.PI },
  dahl: { x: X + 2.6, z: Z + 3.3, h: Math.PI },
  signe: { x: X + 10.95, z: Z + 2.95, h: -2.5 },            // by the firebox at the oven's east end
  firebox: { x: X + 10.45, y: Y + 0.8, z: Z + 0.85 },
  talk: at(9.6, 4.4, 1.2),                                  // talk to them (after the quest)
  camBand: { x: X + 5.0, y: 0.9, z: Z + 2.2, cam: { x: X + 8.9, y: Y + 3.5, z: Z + 6.3, fov: 56 } },
  camHall: { x: X + 9.6, y: 0.8, z: Z + 2.4, cam: { x: X + 6.6, y: Y + 4.3, z: Z + 8.5, fov: 60 } },
  room: { x0: X, x1: X + S, z0: Z, z1: Z + D },
  bounds: { x0: X - 0.5, x1: X + S + 0.5, z0: Z - 0.5, z1: Z + D + 0.5 },
  y: Y,
};

const WALL = 0xe6dccb;
// walls [x0, z0, x1, z1] (local, full height): the door gap is x 11.8–12.8 in the south wall
export const BAK_WALLS = [
  [-0.2, -0.2, S + 0.2, 0],
  [-0.2, 0, 0, D + 0.2],
  [S, 0, S + 0.2, D + 0.2],
  [-0.2, D, 11.8, D + 0.2],
  [12.8, D, S + 0.2, D + 0.2],
];
// things that block the way [x0, z0, x1, z1, height]
export const BAK_FURN = [
  [1.0, 0, 10.4, 1.75, 2.3],        // Stora Bertha
  [1.0, 1.9, 10.4, 2.6, 0.92],      // the belt
  [11.4, 0.5, 13.3, 2.4, 1.3],      // the dough mixer
  [13.35, 3.0, S, 6.8, 1.9],        // proofing racks
  [0, 6.7, 1.7, D, 1.0],            // flour sacks
  [4.4, 5.5, 8.4, 6.4, 0.9],        // the workbench
  [11.8, D, 12.8, D + 0.2, IH],     // the door (shut behind you)
];

const SIGNS = {
  bertha: { def: { lines: ['STORA BERTHA', 'TUNNELUGN 1962'], rows: true, bg: '#2d3238', fg: '#f2c21b', border: '#c0302a', ppm: 150 }, x: 5.7, y: 2.0, z: 1.76, rot: 0, w: 1.6, h: 0.5 },
  kontor: { def: { lines: ['KONTOR', 'DIR. DAHLGREN'], rows: true, bg: '#f4efe4', fg: '#2d3238', ppm: 160 }, x: 0.012, y: 2.15, z: 4.4, rot: Math.PI / 2, w: 0.7, h: 0.28 },
  hygien: { def: { lines: ['TVÄTTA HÄNDERNA', 'OCH STÖT KARDEMUMMAN'], rows: true, bg: '#f6ead2', fg: '#8a3a4a', ppm: 150 }, x: S - 0.012, y: 2.1, z: 7.6, rot: -Math.PI / 2, w: 1.1, h: 0.36 },
};

export function bakLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of BAK_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of BAK_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs['bak-' + id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id: 'bak-' + id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = BAK.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function bakInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r, n = 14, cap = true) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, n, c, m, cap);
  const tube = (a, b, r, c, m = PLAIN) => B.tube([X + a[0], Y + a[1], Z + a[2]], [X + b[0], Y + b[1], Z + b[2]], r, r, 6, c, m);
  const ico = (x, y, z, r, sy, c, m = PLAIN) => B.ico(X + x, Y + y, Z + z, r, sy, c, m);
  const top = { top: { c: 0x2a2e34, m: IWALL } };
  // floor: red tiles, worn white with flour by the mixer and the sacks
  floor(0, 0, S, D, 0x8a4a3a, FLOORTILE);
  for (const [x0, z0, x1, z1] of [[10.8, 0.2, 13.8, 3.0], [0.1, 6.2, 2.4, 8.9]]) floor(x0, z0, x1, z1, 0xd8cfbc, FLOORTILE, 0.005);
  for (const [x0, z0, x1, z1] of BAK_WALLS) bx(x0, 0, z0, x1, IH, z1, WALL, IWALL, top);
  bx(11.8, 2.2, D, 12.8, IH, D + 0.2, WALL, IWALL, top);
  bx(11.86, 0, D, 12.74, 2.18, D + 0.06, 0x5b4636, ITRIM);
  // Stora Bertha: a long brick oven with a steel front, round inspection windows, a chimney hood
  bx(1.0, 0, 0, 10.4, 2.3, 1.75, 0x8a4030, BRICK);
  bx(0.95, 0.75, 1.7, 10.45, 1.85, 1.78, 0x6b6f75, CHROME);
  for (let i = 0; i < 6; i++) { const x = 1.9 + i * 1.5; cyl(x, 1.79, 1.15, 1.16, 0.18, 0x2d3238); bx(x - 0.15, 1.17, 1.77, x + 0.15, 1.43, 1.8, 0x3a2a20, IGLASS); }
  bx(1.0, 0.86, 1.78, 1.6, 1.25, 1.8, 0x1a1210);                                             // the oven mouth (west)
  bx(10.42, 0.45, 0.4, 10.48, 1.25, 1.3, 0x2d3238, CHROME);                                   // the firebox door (east end)
  bx(10.48, 0.8, 0.82, 10.56, 0.9, 0.95, 0xc9a24a, CHROME);
  bx(0.8, 2.3, 0, 10.6, 2.55, 1.95, 0x9aa0a6, CHROME);                                        // the hood
  for (let i = 0; i < 4; i++) bx(1.5 + i * 2.5, 1.9, 1.78, 2.2 + i * 2.5, 1.98, 1.8, 0xf2c21b);
  // the belt: a steel frame, a dark band, rollers at the ends
  bx(1.0, 0.0, 1.9, 10.4, 0.82, 2.6, 0x9aa0a6, CHROME);
  bx(1.0, 0.82, 1.95, 10.4, 0.92, 2.55, 0x2a2b2f, PLAIN);
  for (const x of [1.05, 10.35]) B.hcyl(X + x, Y + 0.87, Z + 2.25, 0.62, 0.06, 'z', 8, 0x6b6f75, CHROME);
  for (let i = 0; i < 12; i++) bx(1.2 + i * 0.77, 0.921, 1.97, 1.24 + i * 0.77, 0.924, 2.53, 0x3a3c41);
  // the dough mixer: a big steel bowl on a column, its hook over it
  cyl(12.35, 1.45, 0, 0.55, 0.5, 0x6b6f75, CHROME, 0.45);
  cyl(12.35, 1.45, 0.55, 1.25, 0.85, 0xb9bec4, CHROME, 0.95, 16, false);
  cyl(12.35, 1.45, 0.62, 0.64, 0.83, 0xf2e6c8, PLAIN, 0.83, 16);
  bx(13.0, 0, 1.2, 13.3, 2.1, 1.7, 0x6b6f75, CHROME); bx(12.2, 1.85, 1.3, 13.3, 2.1, 1.6, 0x6b6f75, CHROME);
  tube([12.35, 1.85, 1.45], [12.35, 0.9, 1.45], 0.04, 0x9aa0a6, CHROME);
  // proofing racks with trays
  for (let r = 0; r < 2; r++) {
    const z0 = 3.1 + r * 1.9;
    for (const [x, z] of [[13.4, z0], [13.95, z0], [13.4, z0 + 1.6], [13.95, z0 + 1.6]]) bx(x - 0.03, 0, z - 0.03, x + 0.03, 1.9, z + 0.03, 0x9aa0a6, CHROME);
    for (let k = 0; k < 8; k++) bx(13.37, 0.2 + k * 0.21, z0, 13.98, 0.22 + k * 0.21, z0 + 1.6, 0x6b6f75, CHROME);
  }
  // the workbench with a scale, a dough cutter, a big bowl of pearl sugar
  bx(4.4, 0.86, 5.5, 8.4, 0.92, 6.4, 0xc9a77a, PLANKS, { skipBottom: false });
  for (const [x, z] of [[4.45, 5.55], [8.3, 5.55], [4.45, 6.3], [8.3, 6.3]]) bx(x, 0, z, x + 0.06, 0.86, z + 0.06, 0x6b6f75, CHROME);
  cyl(5.0, 5.9, 0.92, 1.0, 0.18, 0x6b6f75, CHROME); bx(4.85, 1.0, 5.75, 5.15, 1.02, 6.05, 0xb9bec4, CHROME);
  cyl(7.6, 5.95, 0.92, 1.1, 0.24, 0xf4f4f0, PLAIN, 0.3); cyl(7.6, 5.95, 1.08, 1.1, 0.28, 0xffffff);
  bx(6.0, 0.92, 5.8, 6.6, 0.95, 6.1, 0xd9d4c8, FABRIC);
  // flour sacks stacked in the south-west corner
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) B.rbox(X + 0.5 + j * 0.62, Y + i * 0.33, Z + 7.0 + (i % 2) * 0.3 + j * 0.6, 0.6, 0.33, 0.85, 0.08 * (i - 1), 0xd8c9a4, FABRIC);
  // the loading-dock door in the south wall (shut), and three mice by a crumb of bun
  bx(2.2, 0, D - 0.04, 5.2, 2.3, D, 0x8f969c, CHROME);
  for (let k = 0; k < 7; k++) bx(2.2, 0.3 + k * 0.3, D - 0.05, 5.2, 0.32 + k * 0.3, D - 0.04, 0x6b6f75);
  for (const [x, z, h] of [[3.0, 8.6, 0.6], [3.35, 8.45, -0.4], [3.7, 8.7, 2.4]]) {
    const s = Math.sin(h), c = Math.cos(h);
    ico(x, 0.045, z, 0.06, 0.8, 0x8a837c, FABRIC); ico(x + s * 0.07, 0.045, z + c * 0.07, 0.035, 0.9, 0x8a837c, FABRIC);
    for (const e of [-1, 1]) ico(x + s * 0.06 + c * e * 0.025, 0.08, z + c * 0.06 - s * e * 0.025, 0.018, 1, 0xb08a86, FABRIC);
  }
  ico(3.35, 0.03, 8.65, 0.05, 0.6, 0xc07a32);
  // Dahlgren's office door in the west wall
  bx(0.0, 0, 3.9, 0.06, 2.1, 4.9, 0x5b4636, ITRIM);
  bx(0.06, 0.95, 4.65, 0.1, 1.05, 4.75, 0xc9ccd0, CHROME);
  // lamps over the belt
  for (const x of [3.0, 6.0, 9.0]) { tube([x, IH, 2.6], [x, 2.25, 2.6], 0.008, 0x2d3238); cyl(x, 2.6, 2.1, 2.25, 0.2, 0x2d3238, PLAIN, 0.06, 10, false); ico(x, 2.1, 2.6, 0.08, 1, 0xfff1c9, LIGHT); }
  void STONE;
}
