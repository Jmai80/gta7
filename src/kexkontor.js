// Kexfabriken's office on Västerholmen from the inside (v1.19, "Förbjudet område"): the director's room on the
// ground floor of the office block (KEX.office in westisle.js), the door in the east wall onto the yard. Knäck's
// desk is still there, but the room has changed owner: a sea chest, a ship model in a glass case and a wall of old
// photographs from M/S Kardemumma – Ragnhild Kardell's things. Like the other insides it is built out at sea
// (INDOOR in config.js). Local coordinates: x east, z south, y up from the floor; the origin is the north-west
// corner.
//
//   z=0  ┌ bookshelf ──────────┬──────── photo wall ── plant ┐
//        │ ship        chair                                │
//        │ model     ┌──desk──┐                             │
//        │ (case)    └────────┘                           door
//        │                                                  │
//        │ sea chest               table      sofa          │
//   z=9  └──────────── windows ─────────────────────────────┘
//        x=0                                             x=12
import { INDOOR } from './config.js';
import { KEX } from './westisle.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, PLANKS = 26, IWALL = 29, PARQUET = 30, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.55;
const S = 12, D = 9;
const X = INDOOR.x + 76, Y = INDOOR.y, Z = INDOOR.z + 46;
const at = (x, z, r, extra = {}) => ({ x: X + x, z: Z + z, r, ...extra });

// outside: the glass door on the east face of the office block (westisle.js draws it)
export const KONTOR_DOOR = { x: KEX.office.x1 + 0.9, z: -17.5, r: 1.2 };

export const KONTOR = {
  spawn: { x: X + 11.0, z: Z + 4.6, h: -Math.PI / 2 },       // a step inside the door, facing in (west)
  door: at(11.6, 4.6, 0.55),                                  // stand here and press GÅ UT
  // the four places to look (UNDERSÖK), in the order of the room from the door
  spots: {
    desk: at(6.3, 3.05, 0.95, { face: Math.PI }),            // Knäck's desk: a letter from the board
    photo: at(9.9, 0.95, 0.9, { face: Math.PI }),             // the photo wall: M/S Kardemumma, 1962
    model: at(1.85, 3.4, 0.95, { face: -Math.PI / 2 }),       // the ship model in its glass case
    chest: at(1.4, 5.9, 0.95, { face: 0 }),                   // the sea chest: the logbook
  },
  // Ragnhild comes in through the door and stops in the middle of the room
  ragnhildIn: { x: X + 11.0, z: Z + 4.6, h: -Math.PI / 2 },
  ragnhild: { x: X + 8.15, z: Z + 4.4, h: -Math.PI / 2 },
  you: { x: X + 6.7, z: Z + 4.5, h: Math.PI / 2 },
  camPhoto: { x: X + 9.9, y: Y + 1.33, z: Z + 0.02, cam: { x: X + 9.9, y: Y + 1.6, z: Z + 2.75, fov: 40 } },
  camTalk: { x: X + 7.4, y: Y + 1.1, z: Z + 4.45, cam: { x: X + 7.4, y: Y + 3.6, z: Z + 10.8, fov: 52 } },
  room: { x0: X, x1: X + S, z0: Z, z1: Z + D },
  bounds: { x0: X - 0.5, x1: X + S + 0.5, z0: Z - 0.5, z1: Z + D + 0.5 },
  y: Y,
};

// walls [x0, z0, x1, z1] (local, full height): the door gap is z 4.0–5.2 in the east wall
export const KONTOR_WALLS = [
  [-0.2, -0.2, S + 0.2, 0],
  [-0.2, 0, 0, D + 0.2],
  [-0.2, D, S + 0.2, D + 0.2],
  [S, 0, S + 0.2, 4.0],
  [S, 5.2, S + 0.2, D + 0.2],
];
// things that block the way [x0, z0, x1, z1, height]
export const KONTOR_FURN = [
  [5.0, 1.45, 7.6, 2.4, 0.78],      // the desk
  [5.95, 0.55, 6.65, 1.2, 1.1],     // the desk chair
  [0.2, 0.0, 3.8, 0.45, 2.1],       // the bookshelf along the north wall
  [0.2, 2.5, 1.1, 4.3, 1.45],       // the ship model's case on the west wall
  [0.3, 6.5, 1.5, 7.5, 0.62],       // the sea chest
  [7.4, 7.9, 10.6, 8.9, 0.8],       // the sofa against the south wall
  [8.0, 6.5, 10.0, 7.25, 0.45],     // the low table
  [11.1, 0.3, 11.8, 1.0, 1.4],      // a palm in a pot
  [S, 4.0, S + 0.2, 5.2, IH],       // the door (shut behind you)
];

const SIGNS = {
  photo: { def: { kind: 'photo1962', ppm: 420 }, x: 9.9, y: 1.55, z: 0.012, rot: 0, w: 0.9, h: 0.7 },
  plakett: { def: { lines: ['M/S KARDEMUMMA', 'GÖTEBORG 1938'], rows: true, bg: '#c8a24a', fg: '#2b2418', ppm: 220 }, x: 1.112, y: 1.25, z: 3.4, rot: Math.PI / 2, w: 0.5, h: 0.17 },
  styrelse: { def: { lines: ['KEXFABRIKEN AB', 'STYRELSEN · STOCKHOLM'], rows: true, bg: '#1f4fa0', fg: '#ffffff', border: '#f2c21b', ppm: 140 }, x: 6.3, y: 2.05, z: 0.012, rot: 0, w: 1.7, h: 0.42 },
  sjokort: { def: { lines: ['SJÖKORT', 'SJUBY · VÄSTERHOLMEN'], rows: true, bg: '#e8dcbc', fg: '#2a4a6a', ppm: 120 }, x: 0.012, y: 1.75, z: 6.9, rot: Math.PI / 2, w: 1.2, h: 0.5 },
};

export function kontorLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of KONTOR_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of KONTOR_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs['kontor-' + id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id: 'kontor-' + id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = KONTOR.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function kontorInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r, n = 12, cap = true) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, n, c, m, cap);
  const tube = (a, b, r, c, m = PLAIN) => B.tube([X + a[0], Y + a[1], Z + a[2]], [X + b[0], Y + b[1], Z + b[2]], r, r, 6, c, m);
  const top = { top: { c: 0x2a2e34, m: IWALL } };
  const WALL = 0xe9e4d8, NAVY = 0x1d2a44, WOOD = 0x6b4a2e, DARK = 0x3a2618, BRASS = 0xc8a24a;
  // the floor: dark parquet, a blue rug with a gold edge in front of the desk
  floor(0, 0, S, D, 0x7a5638, PARQUET);
  floor(3.6, 2.7, 9.2, 6.2, 0xc8a24a, FABRIC, 0.005);
  floor(3.75, 2.85, 9.05, 6.05, NAVY, FABRIC, 0.006);
  // walls: cream above dark-blue panelling, a brass rail between
  for (const [x0, z0, x1, z1] of KONTOR_WALLS) bx(x0, 0, z0, x1, IH, z1, WALL, IWALL, top);
  bx(S, 2.2, 4.0, S + 0.2, IH, 5.2, WALL, IWALL, top);
  bx(S - 0.05, 0, 4.06, S, 2.18, 5.14, 0x2a3a4a, ITRIM);
  bx(S - 0.07, 0.25, 4.15, S - 0.05, 2.05, 5.05, 0x9fb7c4, IGLASS);
  for (const [x0, z0, x1, z1] of [[0.01, 0.01, S - 0.01, 0.04], [0.01, D - 0.04, S - 0.01, D - 0.01]]) { bx(x0, 0, z0, x1, 0.95, z1, NAVY, PLANKS); bx(x0, 0.95, z0, x1, 1.0, z1, BRASS, CHROME); }
  for (const [x0, z0, x1, z1] of [[0.01, 0.04, 0.04, D - 0.04], [S - 0.04, 0.04, S - 0.01, 4.0], [S - 0.04, 5.2, S - 0.01, D - 0.04]]) { bx(x0, 0, z0, x1, 0.95, z1, NAVY, PLANKS); bx(x0, 0.95, z0, x1, 1.0, z1, BRASS, CHROME); }
  // windows in the south wall (evening light)
  for (const x0 of [1.2, 4.6, 8.0]) { bx(x0, 1.05, D - 0.05, x0 + 2.4, 2.25, D - 0.01, 0xffd59a, LIGHT); bx(x0 + 1.17, 1.05, D - 0.07, x0 + 1.23, 2.25, D - 0.04, 0xf4f2ea); bx(x0, 1.62, D - 0.07, x0 + 2.4, 1.68, D - 0.04, 0xf4f2ea); }
  // Knäck's desk: dark wood, a green lamp, a blotter, a telephone, a framed letter in an in-tray; the chair behind
  bx(5.0, 0.72, 1.45, 7.6, 0.78, 2.4, WOOD, PLANKS);
  bx(5.05, 0, 1.5, 5.75, 0.72, 2.35, DARK, PLANKS); bx(6.85, 0, 1.5, 7.55, 0.72, 2.35, DARK, PLANKS);
  bx(5.8, 0.78, 1.7, 6.9, 0.785, 2.2, 0x2f5a3a, FABRIC);
  bx(6.2, 0.785, 1.95, 6.5, 0.79, 2.15, 0xf4f1ea);                                       // the letter on the blotter
  cyl(7.2, 1.7, 0.78, 0.8, 0.09, 0x2d3238); tube([7.2, 0.8, 1.7], [7.2, 1.12, 1.8], 0.012, 0x2d3238);
  bx(7.06, 1.08, 1.74, 7.34, 1.2, 1.96, 0x2f6b45, PLAIN); bx(7.1, 1.07, 1.78, 7.3, 1.08, 1.92, 0xfff1c9, LIGHT);
  bx(5.25, 0.78, 1.65, 5.6, 0.86, 1.9, 0x1d1f22);                                         // the telephone
  bx(6.0, 0.45, 0.6, 6.6, 0.52, 1.15, 0x5a1f1f, FABRIC); bx(6.0, 0.52, 0.55, 6.6, 1.1, 0.65, 0x5a1f1f, FABRIC);
  cyl(6.3, 0.85, 0, 0.45, 0.05, 0x2d3238);
  // the bookshelf: binders in Kexfabriken's blue, old books, a brass ship's clock
  bx(0.2, 0, 0.0, 3.8, 2.1, 0.45, WOOD, PLANKS);
  for (let r = 0; r < 4; r++) {
    bx(0.25, 0.08 + r * 0.5, 0.04, 3.75, 0.11 + r * 0.5, 0.44, DARK, PLANKS);
    for (let i = 0; i < 16; i++) { const w = 0.08 + ((i * 7 + r * 3) % 5) * 0.025, x = 0.3 + i * 0.215; if (x + w > 3.7) break; bx(x, 0.11 + r * 0.5, 0.1, x + w, 0.43 + r * 0.5 - ((i + r) % 3) * 0.04, 0.42, r < 2 ? (i % 3 ? 0x1f4fa0 : 0x2b2e35) : [0x8a3a2a, 0x2f5a3a, 0x6b4a2e, 0x3a4a6a][(i + r) % 4], FABRIC); }
  }
  cyl(3.2, 0.25, 2.1, 2.12, 0.16, BRASS, CHROME, 0.16, 14); B.hcyl(X + 3.2, Y + 2.3, Z + 0.25, 0.06, 0.16, 'z', 14, BRASS, CHROME);
  bx(3.08, 2.22, 0.31, 3.32, 2.38, 0.315, 0xf4f1ea);
  // the photo wall: frames round the 1962 photo (the sign); the board's sign over the desk
  for (const [x, y, w, h] of [[8.75, 1.75, 0.5, 0.4], [8.8, 1.2, 0.42, 0.36], [11.0, 1.7, 0.48, 0.56], [11.05, 1.15, 0.4, 0.32]]) {
    bx(x - w / 2 - 0.03, y - h / 2 - 0.03, 0.01, x + w / 2 + 0.03, y + h / 2 + 0.03, 0.035, DARK, PLAIN);
    bx(x - w / 2, y - h / 2, 0.035, x + w / 2, y + h / 2, 0.04, [0xb39b70, 0x9fb0c4, 0xc9b48a, 0x8a9a7a][Math.round(x * 3 + y * 7) % 4], PLAIN);
  }
  bx(9.42, 1.17, 0.005, 10.38, 1.93, 0.035, DARK, PLAIN);
  bx(5.4, 1.8, 0.005, 7.2, 2.3, 0.03, 0x2b2e35, PLAIN);
  // the ship model in its glass case: a cabinet, the glass, and M/S Kardemumma in miniature (bow to the south)
  bx(0.2, 0, 2.5, 1.1, 0.95, 4.3, DARK, PLANKS);
  bx(0.22, 0.95, 2.52, 1.08, 1.45, 4.28, 0xcfe4ee, IGLASS);
  bx(0.2, 1.45, 2.5, 1.1, 1.5, 4.3, DARK, PLANKS);
  {
    const mx = 0.65, mz = 3.4, y0 = 0.98;
    bx(mx - 0.14, y0, mz - 0.62, mx + 0.14, y0 + 0.1, mz + 0.5, 0x1d2a44);
    bx(mx - 0.14, y0 - 0.02, mz - 0.62, mx + 0.14, y0, mz + 0.5, 0x8a2a24);
    bx(mx - 0.08, y0 + 0.02, mz + 0.5, mx + 0.08, y0 + 0.1, mz + 0.64, 0x1d2a44);
    bx(mx - 0.12, y0 + 0.1, mz - 0.6, mx + 0.12, y0 + 0.24, mz - 0.32, 0xf2efe6);
    cyl(mx, mz - 0.47, y0 + 0.24, y0 + 0.36, 0.035, 0x2f6b45); cyl(mx, mz - 0.47, y0 + 0.28, y0 + 0.3, 0.036, 0xf2c21b);
    for (let i = 0; i < 4; i++) bx(mx - 0.1, y0 + 0.1, mz - 0.26 + i * 0.17, mx + 0.1, y0 + 0.17, mz - 0.12 + i * 0.17, [0xd2342c, 0x2c62a8, 0xe8833a, 0x2f6b45][i], PLAIN);
    cyl(mx, mz + 0.36, y0 + 0.1, y0 + 0.42, 0.006, 0xf2efe6);
  }
  // the sea chest: dark green with brass corners and a rope handle, the logbook on top
  bx(0.3, 0, 6.5, 1.5, 0.55, 7.5, 0x2f4a3a, PLANKS);
  bx(0.28, 0.55, 6.48, 1.52, 0.62, 7.52, 0x243a2e, PLANKS);
  for (const [x, z] of [[0.3, 6.5], [1.42, 6.5], [0.3, 7.42], [1.42, 7.42]]) bx(x, 0, z, x + 0.08, 0.62, z + 0.08, BRASS, CHROME);
  tube([1.52, 0.3, 6.8], [1.6, 0.25, 7.0], 0.02, 0xc8b890); tube([1.6, 0.25, 7.0], [1.52, 0.3, 7.2], 0.02, 0xc8b890);
  bx(0.65, 0.62, 6.75, 1.15, 0.68, 7.15, 0x5a2a1a, FABRIC); bx(0.67, 0.68, 6.77, 1.13, 0.685, 7.13, 0xe8dcbc);
  // a sea chart on the west wall over the chest (the sign), a ship's wheel beside it
  bx(0.005, 1.45, 6.25, 0.03, 2.05, 7.55, DARK, PLAIN);
  for (let i = 0; i < 14; i++) { const a0 = (i / 14) * Math.PI * 2, a1 = ((i + 1) / 14) * Math.PI * 2; tube([0.1, 1.75 + Math.cos(a0) * 0.36, 5.3 + Math.sin(a0) * 0.36], [0.1, 1.75 + Math.cos(a1) * 0.36, 5.3 + Math.sin(a1) * 0.36], 0.03, WOOD); }
  B.hcyl(X + 0.1, Y + 1.75, Z + 5.3, 0.07, 0.1, 'x', 10, DARK, PLANKS);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; tube([0.1, 1.75, 5.3], [0.1, 1.75 + Math.cos(a) * 0.46, 5.3 + Math.sin(a) * 0.46], 0.018, WOOD); }
  // the sofa and the low table with a coffee tray (kardemummakakor)
  bx(7.4, 0.08, 7.9, 10.6, 0.42, 8.9, 0x8a2a24, FABRIC, { skipBottom: false });
  bx(7.4, 0.42, 8.55, 10.6, 0.82, 8.9, 0x8a2a24, FABRIC);
  for (const x of [7.4, 10.4]) bx(x, 0.42, 7.9, x + 0.2, 0.62, 8.9, 0x7a2420, FABRIC);
  bx(8.0, 0.4, 6.5, 10.0, 0.45, 7.25, DARK, PLANKS);
  for (const [x, z] of [[8.05, 6.55], [9.9, 6.55], [8.05, 7.15], [9.9, 7.15]]) bx(x, 0, z, x + 0.05, 0.4, z + 0.05, DARK);
  bx(8.6, 0.45, 6.65, 9.4, 0.47, 7.1, 0xc9ccd0, CHROME);
  for (let i = 0; i < 5; i++) cyl(8.75 + i * 0.13, 6.88 + (i % 2) * 0.08, 0.47, 0.5, 0.045, 0xd9a441);
  cyl(9.6, 6.85, 0.45, 0.55, 0.04, 0xf4f2ea);
  // a palm in a brass pot in the north-east corner, lamps hanging from the ceiling line
  cyl(11.45, 0.65, 0, 0.5, 0.28, BRASS, CHROME, 0.22, 12);
  for (let i = 0; i < 6; i++) { const a = i * 1.05; tube([11.45, 0.5, 0.65], [11.45 + Math.cos(a) * 0.55, 1.35 + (i % 2) * 0.15, 0.65 + Math.sin(a) * 0.55], 0.03, 0x2f6b45); }
  // brass lamps on the walls (nothing hangs from the ceiling: the camera looks down over the walls)
  for (const [x, z, w] of [[4.2, 0.05, 'n'], [8.2, 0.05, 'n'], [0.05, 5.0, 'w']]) {
    const dx = w === 'w' ? 0.12 : 0, dz = w === 'n' ? 0.12 : 0;
    bx(x - 0.04, 1.9, z - 0.04, x + 0.04 + dx, 1.98, z + 0.04 + dz, BRASS, CHROME);
    B.ico(X + x + dx * 1.6, Y + 2.02, Z + z + dz * 1.6, 0.09, 1.2, 0xfff1c9, LIGHT);
  }
}
