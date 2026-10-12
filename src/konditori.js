// Sjuby Konditori from the inside (v1.14): Arne's old café on the square, opened again by tant Gun in
// "Nyöppningen". Like the other insides it is built out at sea (INDOOR in config.js). The street door is in
// the north wall (the facade faces the square). In front: the café with two little tables, the photo from
// Sjuby's bun championship in 1985 on the west wall and the empty shelf where the trophy once stood; across
// the room the glass display counter full of buns; behind it the bakery – Arne's stone oven in the south-west
// corner, the baking table in the middle (Dahlgren's place in "Den gyllene bullen"), the ingredients on the
// counter along the east wall, and Gun's mother's mortar on a little table by the south wall.
// Local coordinates: x east, z south, y up from the floor; the origin is the north-west corner.
//
//   z=0  ┌ window ──────────┤door├── window ────────┐
//        │PHOTO   (T1)                  (T2)        │
//        │SHELF                                     │
//   z=3.4│coffee┌────────── the display counter ─┐  │
//   z=4.1│      └──────────────────────────────────┘ │  (the way behind: x 8.4–10.35)
//        │ OVEN │   Gun                          JARS│
//        │(mouth│        ┌ baking table ┐          │
//        │ east)│        └──────────────┘ mortar   │
//   z=8  └──────────────────────────────────────────┘
//        x=0                                     x=11
import { INDOOR, KONDITORI_DOOR } from './config.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, STONE = 25, PLANKS = 26, IWALL = 29, PARQUET = 30, FLOORTILE = 31, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.55;
const X = INDOOR.x + 52.5, Y = INDOOR.y, Z = INDOOR.z + 26.5;
const at = (x, z, r, extra = {}) => ({ x: X + x, z: Z + z, r, ...extra });

// outside: the door in the brick building's north facade on the square
export const KOND_DOOR = { x: KONDITORI_DOOR.x, z: KONDITORI_DOOR.z - 0.75, r: 1.2 };

// the ingredients on the counter along the east wall, north to south (stand at x/z, the button is the label)
export const JARS = [
  { id: 'mjolk', label: 'MJÖLK', name: 'mjölken', c: 0xf4f4f0 },
  { id: 'smor', label: 'SMÖR', name: 'smöret', c: 0xf2dc7a },
  { id: 'socker', label: 'SOCKER', name: 'sockret', c: 0xffffff },
  { id: 'mjol', label: 'MJÖL', name: 'mjölet', c: 0xeee6d2 },
  { id: 'kardemumma', label: 'KARDEMUMMA', name: 'en påse malen kardemumma', c: 0x7a8a3a },
];
JARS.forEach((j, i) => { j.x = X + 9.95; j.z = Z + 4.85 + i * 0.62; j.r = 0.3; j.item = [X + 10.68, Y + 0.96, Z + 4.85 + i * 0.62]; });

export const KOND = {
  spawn: { x: X + 5.5, z: Z + 0.75, h: 0 },                // a step inside the door, facing the counter (south)
  door: at(5.5, 0.45, 0.6),                                 // stand here and press GÅ UT
  gun: { x: X + 3.4, z: Z + 4.62, h: Math.PI },             // Gun behind the display counter, facing the café
  dahl: { x: X + 5.6, z: Z + 7.15, h: Math.PI },            // Dahlgren behind the baking table, facing north
  give: at(5.6, 5.12, 0.75),                                // hand him things across the table
  serve: at(3.4, 5.28, 0.7),                                // give Gun the tray, from the bakery side
  talk: at(3.4, 2.75, 1.05),                                // talk to Gun from the café (after the quest)
  oven: at(2.95, 6.75, 0.72),                               // in front of the stone oven's mouth
  slot: { x: X + 1.55, y: Y + 0.93, z: Z + 6.75 },          // the tray in the oven
  mortar: at(8.1, 6.98, 0.5),                               // Gun's mother's mortar, on the little table
  mortarAt: { x: X + 8.1, y: Y + 0.8, z: Z + 7.72 },
  table: { x: X + 5.6, y: Y + 0.9, z: Z + 6.15 },           // the baking table's top, middle
  photo: at(0.78, 1.3, 0.75),                               // stand here and press TITTA
  photoAt: { x: X + 0.02, y: Y + 1.55, z: Z + 1.3 },
  shelf: { x: X + 0.17, y: Y + 1.28, z: Z + 2.6 },          // where the trophy stood – and stands again
  // cameras: over the café towards the bakery, and the photo up close
  camRoom: { x: X + 4.6, y: 0.9, z: Z + 5.3, cam: { x: X + 9.4, y: Y + 3.9, z: Z + 0.7, fov: 60 } },
  camPhoto: { x: X + 0.02, y: Y + 1.52, z: Z + 1.3, cam: { x: X + 2.9, y: Y + 1.56, z: Z + 1.3, fov: 46 } },
  camTaste: { x: X + 3.6, y: 1.0, z: Z + 4.9, cam: { x: X + 6.6, y: Y + 3.3, z: Z + 1.2, fov: 58 } },
  room: { x0: X, x1: X + 11, z0: Z, z1: Z + 8 },
  bakery: { x0: X, x1: X + 11, z0: Z + 4.1, z1: Z + 8 },
  bounds: { x0: X - 0.5, x1: X + 11.5, z0: Z - 0.5, z1: Z + 8.5 },
  y: Y,
};
// the two café tables, each with a chair west and east of it, facing it
KOND.tables = [{ x: X + 2.6, z: Z + 1.75 }, { x: X + 8.5, z: Z + 1.75 }];
for (const T of KOND.tables) T.seats = [{ x: T.x - 0.62, z: T.z, y: Y + 0.48, h: Math.PI / 2 }, { x: T.x + 0.62, z: T.z, y: Y + 0.48, h: -Math.PI / 2 }];

const WALL = 0xf3e7d3, PINK = 0xe58fa8;
// walls [x0, z0, x1, z1, colour] (local, full height): the door gap is x 5.0–6.0 in the north wall
export const KOND_WALLS = [
  [-0.2, -0.2, 5.0, 0, WALL],
  [6.0, -0.2, 11.2, 0, WALL],
  [-0.2, 0, 0, 8.2, WALL],
  [-0.2, 8, 11.2, 8.2, WALL],
  [11, 0, 11.2, 8.2, WALL],
];
// things that block the way [x0, z0, x1, z1, height]
export const KOND_FURN = [
  [1.7, 3.4, 8.4, 4.1, 1.05],       // the display counter
  [0, 3.4, 1.7, 4.1, 1.0],          // the coffee cabinet (closes the west end)
  [0, 5.5, 2.3, 8, 2.2],            // Arne's stone oven
  [4.3, 5.7, 6.9, 6.6, 0.9],        // the baking table
  [10.35, 4.5, 11, 7.6, 0.95],      // the ingredient counter
  [7.7, 7.45, 8.5, 8, 0.8],         // the mortar table
  [9.6, 7.6, 11, 8, 1.6],           // flour sacks in the corner
  ...KOND.tables.map((T) => [T.x - X - 0.38, T.z - Z - 0.38, T.x - X + 0.38, T.z - Z + 0.38, 0.75]),
  ...KOND.tables.flatMap((T) => T.seats.map((S) => [S.x - X - 0.21, S.z - Z - 0.21, S.x - X + 0.21, S.z - Z + 0.21, 0.48])),
  [5.0, -0.2, 6.0, 0, IH],          // the door (shut behind you)
];

const SIGNS = {
  photo: { def: { kind: 'photo1985', ppm: 300 }, x: 0.012, y: 1.55, z: 1.3, rot: Math.PI / 2, w: 0.92, h: 0.7 },
  recept: { def: { lines: ['ARNES RECEPT', 'MJÖLK · SMÖR', 'SOCKER · MJÖL', 'KARDEMUMMA'], rows: true, bg: '#f6ead2', fg: '#7a3f17', border: '#8a3a4a', ppm: 150 }, x: 5.6, y: 1.75, z: 7.988, rot: Math.PI, w: 1.0, h: 0.95 },
  dagens: { def: { lines: ['DAGENS', 'SJUBYBULLE · 25 KR', 'KAFFE · 20 KR'], rows: true, bg: '#2b2e35', fg: '#fff6e0', border: '#e58fa8', ppm: 150 }, x: 10.988, y: 1.65, z: 2.0, rot: -Math.PI / 2, w: 1.05, h: 0.8 },
  kond: { def: { lines: ['SJUBY KONDITORI'], bg: '#f6ead2', fg: '#8a3a4a', border: '#e58fa8', font: 0.6 }, x: 5.5, y: 2.2, z: 4.105, rot: 0, w: 2.6, h: 0.36 },
};
for (const [i, j] of JARS.entries()) SIGNS['jar' + i] = { def: { lines: [j.label], bg: '#f6ead2', fg: '#2b2e35', font: 0.55, ppm: 220 }, x: 10.988, y: 1.25, z: 4.85 + i * 0.62, rot: -Math.PI / 2, w: 0.5, h: 0.12 };

export function kondLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of KOND_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of KOND_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs['kond-' + id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id: 'kond-' + id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = KOND.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

// a Sjubybulle (like models.js bunInto: a knot, a darker swirl, pearl sugar), local to the interior builder
function bun(B, x, y, z, s = 1, k = 0) {
  const tone = [0xb5722e, 0xa9692a, 0xbd7b34][k % 3];
  B.cyl(x, z, y, y + 0.035 * s, 0.062 * s, 0.056 * s, 8, tone, PLAIN);
  B.cyl(x, z, y + 0.035 * s, y + 0.058 * s, 0.056 * s, 0.026 * s, 8, 0x9a5a22, PLAIN, true);
  for (let i = 0; i < 3; i++) { const a = k * 1.7 + i * 2.1, r = 0.028 * s; B.box(x + Math.cos(a) * r - 0.007, y + 0.05 * s, z + Math.sin(a) * r - 0.007, x + Math.cos(a) * r + 0.007, y + 0.062 * s, z + Math.sin(a) * r + 0.007, 0xf6f3ea); }
}

export function kondInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r, n = 12, cap = true) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, n, c, m, cap);
  const tube = (a, b, r, c, m = PLAIN) => B.tube([X + a[0], Y + a[1], Z + a[2]], [X + b[0], Y + b[1], Z + b[2]], r, r, 6, c, m);
  const ico = (x, y, z, r, sy, c, m = PLAIN) => B.ico(X + x, Y + y, Z + z, r, sy, c, m);
  const DARK = 0x2b2e35, WOOD = 0x8a5a36, CREAM = 0xf6ead2, BRASS = 0xd8b45a;

  // floors: black-and-white chequer in the café, red tiles in the bakery
  floor(0, 0, 11, 4.1, 0xf2efe6, FLOORTILE);
  for (let i = 0; i < 22; i++) for (let k = 0; k < 8; k++) if ((i + k) % 2) floor(i * 0.5, k * 0.5, i * 0.5 + 0.5, k * 0.5 + 0.5, 0x2b2e35, FLOORTILE, 0.004);
  floor(0, 4.1, 11, 8, 0xa8553a, FLOORTILE);
  floor(5.0, -0.2, 6.0, 0, 0x6b6f75, PLAIN);
  bx(5.05, 0, 0.05, 5.95, 0.015, 0.95, 0x8a3a4a, FABRIC);                                     // the door mat
  // walls: cream with a pink band and dark wainscoting in the café, white tiles in the bakery
  for (const [x0, z0, x1, z1, c] of KOND_WALLS) bx(x0, 0, z0, x1, IH, z1, c, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(5.0, 2.3, -0.2, 6.0, IH, 0, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  for (const [x0, z0, x1, z1] of [[0.01, 0.01, 5.0, 0.04], [6.0, 0.01, 10.99, 0.04]]) { bx(x0, 0, z0, x1, 0.95, z1, 0x6b3a2a, PLANKS); bx(x0, 1.9, z0, x1, 2.0, z1, PINK); }
  for (const [x0, z0, x1, z1] of [[0.01, 0.04, 0.04, 3.4], [10.96, 0.04, 10.99, 4.1]]) { bx(x0, 0, z0, x1, 0.95, z1, 0x6b3a2a, PLANKS); bx(x0, 1.9, z0, x1, 2.0, z1, PINK); }
  for (const [x0, z0, x1, z1] of [[0.01, 4.1, 0.04, 7.96], [10.96, 4.1, 10.99, 7.96], [0.04, 7.96, 10.96, 7.99]]) bx(x0, 0.9, z0, x1, 1.95, z1, 0xffffff, FLOORTILE);
  // the glass door and the two shop windows (the square is dark outside)
  bx(5.0, 0, -0.16, 6.0, 2.3, -0.04, 0x6b3a2a, ITRIM);
  bx(5.1, 0.05, -0.04, 5.9, 2.2, -0.01, 0x9fb7c4, IGLASS);
  bx(5.15, 0.95, -0.01, 5.2, 1.35, 0.04, BRASS, CHROME);
  for (const [x0, x1] of [[1.0, 4.4], [6.6, 10.0]]) {
    bx(x0, 0.95, 0.004, x1, 2.1, 0.03, 0xf4f1ec, ITRIM); bx(x0 + 0.05, 1.0, 0.03, x1 - 0.05, 2.05, 0.036, 0x3a4a5e, IGLASS);
    bx(x0, 0.86, 0.0, x1, 0.95, 0.32, CREAM, ITRIM, { skipBottom: false });                     // a sill with buns for the street
    for (let k = 0; k < 6; k++) bun(B, X + x0 + 0.35 + k * ((x1 - x0 - 0.7) / 5), Y + 0.95, Z + 0.17, 1.4, k);
    for (let k = 0; k < 9; k++) B.rbox(X + x0 + 0.1 + k * ((x1 - x0 - 0.2) / 8), Y + 2.0, Z + 0.06, (x1 - x0) / 9, 0.12, 0.02, 0, k % 2 ? 0xffffff : PINK, FABRIC); // a scalloped valance
  }

  // ---- the café: two marble tables with bentwood chairs, a vase of tulips on each
  for (const T of KOND.tables) {
    const tx = T.x - X, tz = T.z - Z;
    cyl(tx, tz, 0.72, 0.75, 0.4, 0xf2efe6, PLAIN, 0.4, 16);
    cyl(tx, tz, 0, 0.72, 0.045, DARK); cyl(tx, tz, 0, 0.03, 0.24, DARK);
    cyl(tx, tz, 0.75, 0.9, 0.04, 0xbcd4dc, IGLASS, 0.05, 8, false);
    for (let k = 0; k < 3; k++) { tube([tx, 0.85, tz], [tx + Math.cos(k * 2.1) * 0.06, 1.05, tz + Math.sin(k * 2.1) * 0.06], 0.006, 0x3d7a3a); ico(tx + Math.cos(k * 2.1) * 0.06, 1.07, tz + Math.sin(k * 2.1) * 0.06, 0.035, 1.3, [0xd2342c, 0xf2c21b, PINK][k]); }
    for (const S of T.seats) {
      const sx = S.x - X, sz = S.z - Z, s = Math.sign(sx - tx);
      cyl(sx, sz, 0.44, 0.48, 0.2, WOOD, PLAIN, 0.2, 10);
      for (const [dx, dz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) tube([sx + dx * 0.8, 0.44, sz + dz * 0.8], [sx + dx, 0, sz + dz], 0.014, 0x4a3022);
      bx(sx + s * 0.17, 0.48, sz - 0.17, sx + s * 0.2, 0.92, sz + 0.17, 0x4a3022);
    }
  }
  // the photo's frame (the photo itself is a sign) and the trophy shelf under the brass plate, on the west wall
  bx(0.0, 1.13, 0.86, 0.03, 1.97, 1.74, BRASS, CHROME);
  bx(0.0, 1.16, 2.05, 0.3, 1.2, 3.15, WOOD, PLANKS, { skipBottom: false });                      // the shelf …
  for (const z of [2.15, 3.05]) bx(0.0, 1.0, z - 0.02, 0.22, 1.16, z + 0.02, 0x4a3022);          // … on two brackets
  bx(0.0, 1.32, 2.45, 0.02, 1.4, 2.75, BRASS, CHROME);                                           // a little plate: 1985
  cyl(0.17, 2.6, 1.2, 1.203, 0.1, 0xc9b48a, PLAIN, 0.1, 12);                                      // a ring in the dust
  // the coffee cabinet at the west end of the counter: a brewer and cups
  bx(0, 0, 3.4, 1.7, 0.95, 4.1, 0x6b3a2a, PLANKS);
  bx(-0.02, 0.95, 3.38, 1.72, 1.0, 4.12, 0xf2efe6, PLAIN, { skipBottom: false });
  bx(0.25, 1.0, 3.55, 0.65, 1.45, 3.95, DARK); cyl(0.45, 3.82, 1.02, 1.2, 0.1, 0x3a2a20, IGLASS, 0.09);
  for (let k = 0; k < 4; k++) cyl(0.95 + k * 0.17, 3.75, 1.0, 1.07, 0.04, 0xffffff, PLAIN, 0.045, 8);

  // ---- the display counter: a wood front, glass on top, three shelves of buns and cakes inside
  bx(1.7, 0, 3.4, 8.4, 0.6, 4.1, 0x6b3a2a, PLANKS);
  for (let k = 0; k < 9; k++) bx(1.85 + k * 0.72, 0.08, 3.38, 2.4 + k * 0.72, 0.52, 3.4, 0x7a4a2e);
  bx(1.7, 0.6, 3.4, 8.4, 0.63, 4.1, 0xf2efe6, PLAIN, { skipBottom: false });
  bx(1.72, 0.63, 3.42, 8.38, 1.02, 3.45, 0xcfe4ee, IGLASS);                                       // the slanted glass, sort of
  bx(1.72, 1.02, 3.42, 8.38, 1.05, 4.08, 0xcfe4ee, IGLASS);
  for (const x of [1.72, 8.33]) bx(x, 0.63, 3.42, x + 0.05, 1.05, 4.08, BRASS, CHROME);
  for (let k = 0; k < 10; k++) { const x = 2.1 + k * 0.6; cyl(x, 3.75, 0.63, 0.645, 0.17, 0xffffff, PLAIN, 0.18); for (let j = 0; j < 5; j++) bun(B, X + x + Math.cos(j * 1.26) * 0.08, Y + 0.645, Z + 3.75 + Math.sin(j * 1.26) * 0.08, 0.95, k + j); }
  // a princess cake and a plate of mazarins at the till end
  cyl(7.6, 3.72, 0.645, 0.77, 0.14, 0x9fd18a, PLAIN, 0.12, 14); ico(7.6, 0.79, 3.72, 0.03, 1, 0xe58fa8);
  B.rbox(X + 7.0, Y + 1.05, Z + 3.75, 0.36, 0.2, 0.3, 0.2, 0x2b2e35);                              // the till
  bx(6.86, 1.25, 3.62, 7.14, 1.3, 3.88, 0x6fd28a, LIGHT);

  // ---- the bakery: Arne's stone oven, its arched mouth facing east, embers, a chimney up the wall
  bx(0, 0, 5.5, 2.3, 0.85, 8, 0x8a7a6a, STONE);
  bx(0, 0.85, 5.5, 2.3, 0.88, 8, 0x5a4a42, PLAIN);                                              // the hearth
  bx(0, 0.88, 5.5, 2.3, 2.2, 6.15, 0x8a7a6a, STONE); bx(0, 0.88, 7.35, 2.3, 2.2, 8, 0x8a7a6a, STONE); // the sides of the mouth
  bx(0, 0.88, 6.15, 0.45, 1.55, 7.35, 0x2a1a14, PLAIN);                                         // the back, sooty
  bx(0.45, 1.5, 6.15, 2.3, 2.2, 7.35, 0x8a7a6a, STONE, { skipBottom: false });                  // over the mouth
  bx(0.45, 1.46, 6.15, 2.3, 1.5, 7.35, 0x3a2620, PLAIN, { skipBottom: false });
  for (const [x, z, r] of [[0.65, 6.45, 0.11], [0.7, 6.9, 0.12], [0.6, 7.15, 0.09]]) { ico(x, 0.95, z, r, 0.6, 0xff7a2a, LIGHT); ico(x + 0.04, 1.0, z, r * 0.5, 0.8, 0xffd27a, LIGHT); }
  for (let k = 0; k < 9; k++) { const a = (k / 8) * Math.PI; bx(2.28, 0.88 + Math.sin(a) * 0.6, 6.75 + Math.cos(a) * 0.68 - 0.06, 2.34, 0.95 + Math.sin(a) * 0.6, 6.75 + Math.cos(a) * 0.68 + 0.06, 0xe8dcc0); } // the arch
  bx(0.3, 2.2, 7.4, 0.9, IH, 7.95, 0x6a6f75, CHROME);                                            // the flue
  bx(2.3, 1.75, 6.25, 2.33, 2.0, 7.25, 0x6b3a2a); bx(2.33, 1.79, 6.3, 2.34, 1.96, 7.2, CREAM);   // a plate: A. LINDGREN 1958
  tube([2.45, 0.2, 7.75], [2.45, 1.8, 7.75], 0.02, WOOD); bx(2.38, 0.05, 7.55, 2.52, 0.35, 7.95, 0xb98a5a); // the peel
  // the baking table: scrubbed wood, a dusting of flour, a rolling pin, a bowl, an empty baking tray
  bx(4.3, 0, 5.7, 6.9, 0.85, 6.6, 0x9a6a3e, PLANKS);
  bx(4.25, 0.85, 5.65, 6.95, 0.9, 6.65, 0xd8c3a0, PLANKS, { skipBottom: false });
  floor(4.6, 5.8, 5.4, 6.4, 0xf4efe4, PLAIN, 0.903);
  B.hcyl(X + 6.4, Y + 0.93, Z + 5.95, 0.42, 0.035, 'x', 8, 0xc89a5a);
  cyl(4.75, 6.35, 0.9, 1.06, 0.18, 0xf2efe6, PLAIN, 0.22, 12, false); cyl(4.75, 6.35, 0.95, 0.96, 0.16, 0xe8d4a0, PLAIN, 0.16);
  // the ingredient counter on the east wall: the five jars and tins, labels on the tiles behind
  bx(10.35, 0, 4.5, 11, 0.9, 7.6, 0xc9ccd0, CHROME);
  bx(10.3, 0.9, 4.45, 11, 0.95, 7.65, 0xe2e4e6, CHROME, { skipBottom: false });
  JARS.forEach((j, i) => {
    const z = 4.85 + i * 0.62, x = 10.68;
    if (j.id === 'mjolk') { bx(x - 0.07, 0.95, z - 0.07, x + 0.07, 1.22, z + 0.07, 0xf4f4f0); bx(x - 0.072, 1.08, z - 0.072, x + 0.072, 1.16, z + 0.072, 0x2f6fb5); B.rbox(X + x, Y + 1.22, Z + z, 0.1, 0.05, 0.1, Math.PI / 4, 0xf4f4f0, PLAIN, 0); }
    else if (j.id === 'smor') { bx(x - 0.12, 0.95, z - 0.08, x + 0.12, 1.02, z + 0.08, 0xf2dc7a); bx(x - 0.125, 0.98, z - 0.085, x + 0.125, 1.0, z + 0.085, 0xd2342c); }
    else if (j.id === 'kardemumma') { B.rbox(X + x, Y + 0.95, Z + z, 0.14, 0.2, 0.09, 0.3, 0x7a8a3a, FABRIC); B.rbox(X + x, Y + 1.15, Z + z, 0.12, 0.04, 0.07, 0.3, 0xf2c21b, FABRIC); }
    else { cyl(x, z, 0.95, 1.25, 0.11, 0xcfe4ee, IGLASS, 0.11, 10); cyl(x, z, 0.96, 1.17, 0.1, j.c, PLAIN, 0.1, 10); cyl(x, z, 1.25, 1.29, 0.115, BRASS, CHROME, 0.115, 10); }
  });
  // Gun's mother's mortar on its little table, a bowl of cardamom pods beside it
  bx(7.7, 0, 7.45, 8.5, 0.76, 8, 0x6b3a2a, PLANKS);
  bx(7.66, 0.76, 7.41, 8.54, 0.8, 8.0, 0xd8c3a0, PLANKS, { skipBottom: false });
  cyl(8.32, 7.72, 0.8, 0.86, 0.08, 0xf2efe6, PLAIN, 0.09, 10, false);
  for (let k = 0; k < 7; k++) ico(8.32 + Math.cos(k) * 0.04, 0.86, 7.72 + Math.sin(k) * 0.04, 0.014, 1.4, 0x7a8a3a);
  // flour sacks in the south-east corner, the window over the till, shelves of tins, a clock
  for (const [x, z, r] of [[9.95, 7.8, 0.2], [10.45, 7.8, 0.25], [10.8, 7.75, 0.0]]) { B.rbox(X + x, Y + 0, Z + z, 0.42, 0.75, 0.32, r, 0xeee6d2, FABRIC); B.rbox(X + x, Y + 0.75, Z + z, 0.3, 0.12, 0.22, r, 0xe2d8c0, FABRIC); }
  B.rbox(X + 10.3, Y + 0.87, Z + 7.75, 0.42, 0.7, 0.32, 0.4, 0xeee6d2, FABRIC);
  bx(3.0, 1.55, 7.75, 9.2, 1.58, 7.98, WOOD);
  for (let k = 0; k < 12; k++) cyl(3.2 + k * 0.5, 7.86, 1.58, 1.76, 0.07, [0xd2342c, 0x2f6fb5, 0xf2c21b][k % 3], PLAIN, 0.07, 8);
  cyl(5.5, 7.96, 2.05, 2.08, 0.18, 0xf4f4f0, PLAIN, 0.18, 16); bx(5.49, 2.07, 7.9, 5.51, 2.2, 7.93, DARK); bx(5.5, 2.06, 7.9, 5.6, 2.08, 7.93, DARK);
  // lamps: two over the café tables, a long one over the counter, one over the baking table
  for (const T of KOND.tables) { const tx = T.x - X, tz = T.z - Z; tube([tx, IH, tz], [tx, 1.95, tz], 0.008, DARK); cyl(tx, tz, 1.8, 1.95, 0.22, PINK, PLAIN, 0.06); cyl(tx, tz, 1.79, 1.8, 0.19, 0xfff1c9, LIGHT); }
  for (const x of [3.0, 5.1, 7.2]) { tube([x, IH, 3.75], [x, 2.1, 3.75], 0.008, DARK); cyl(x, 3.75, 1.98, 2.1, 0.16, BRASS, CHROME, 0.05); cyl(x, 3.75, 1.97, 1.98, 0.13, 0xfff1c9, LIGHT); }
  tube([5.6, IH, 6.15], [5.6, 2.0, 6.15], 0.008, DARK); cyl(5.6, 6.15, 1.85, 2.0, 0.26, 0x2f6b45, PLAIN, 0.08); cyl(5.6, 6.15, 1.84, 1.85, 0.22, 0xfff1c9, LIGHT);
}
