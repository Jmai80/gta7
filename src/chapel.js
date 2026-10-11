// Söderholmens kapell from the inside (v1.9): the little white chapel west of the tivoli. You come in
// through the tower door in the north, and the aisle runs south between six rows of pews to the
// altar rail, the altar and the altarpiece. Kyrkoherde Inga stands in front of the altar.
// Like the other insides it is built out at sea (INDOOR in config.js). Local coordinates: x east,
// z south, y up from the floor; the origin is the north-west corner.
//
//   z=0   ┌──────────── door ────────────┐
//         │ font                 candles │
//         │ ═══════   aisle   ═══════    │ six rows of pews,
//         │ ═══════     │     ═══════    │ facing south
//         │   …         │       …        │
//         │ ═══════     │     ═══════    │
//         │                      pulpit  │
//         │ ─── rail ───   ─── rail ───  │
//         │ organ     Inga               │
//         │          ALTAR               │
//   z=14  └───── altarpiece and cross ───┘
//         x=0                          x=8
import { INDOOR } from './config.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, PARQUET = 30, FLOORTILE = 31, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const WH = 3.2;  // a bit higher than a flat
const X = INDOOR.x + 42, Y = INDOOR.y, Z = INDOOR.z - 24;

export const CHAPEL_DOOR = { x: -50.5, z: 233.5, r: 1.3 };  // outside, at the tower door (southisle.js)

const ROWS = 6, ROW_Z0 = 3.0, ROW_STEP = 1.25, PEW_D = 0.55;
export const PEWS = [];  // [x0, z0, x1, z1] local, both blocks of every row
for (let i = 0; i < ROWS; i++) { const z0 = ROW_Z0 + i * ROW_STEP; PEWS.push([0.5, z0, 3.3, z0 + PEW_D], [4.7, z0, 7.5, z0 + PEW_D]); }
const rowZ = (i) => ROW_Z0 + i * ROW_STEP;

// (v1.10) a seat in a pew (row 0 is the back row, by the door; row 5 the front, by the altar rail) at
// local x, and the way there from the door: down the aisle, then in between this row and the next
export function pewSeat(row, x) {
  const z0 = rowZ(row), gap = z0 + PEW_D + (ROW_STEP - PEW_D) / 2;
  return {
    x: X + x, z: Z + z0 + 0.32, y: Y + 0.5, h: 0,
    path: [[X + 4, Z + 0.7], [X + 4, Z + gap], [X + x, Z + gap]],
  };
}

export const CHAPEL = {
  spawn: { x: X + 4, z: Z + 0.9, h: 0 },                // a step inside the door, facing the altar
  door: { x: X + 4, z: Z + 0.45, r: 0.7 },              // stand here and press GÅ UT
  priest: { x: X + 4, z: Z + 11.85, h: Math.PI },       // in front of the altar, facing the pews
  talk: { x: X + 4, z: Z + 11.85, r: 1.9 },
  aisle: { x: X + 4, z0: Z + 1.2, z1: Z + 10.8 },
  // three people in the pews (hips on the seat, facing the altar)
  sitters: [
    { x: X + 1.4, z: Z + rowZ(0) + 0.32, y: Y + 0.5, h: 0, look: 0 },
    { x: X + 6.2, z: Z + rowZ(2) + 0.32, y: Y + 0.5, h: 0, look: 1 },
    { x: X + 2.5, z: Z + rowZ(4) + 0.32, y: Y + 0.5, h: 0, look: 2 },
  ],
  room: { x0: X, x1: X + 8, z0: Z, z1: Z + 14 },
  bounds: { x0: X - 0.5, x1: X + 8.5, z0: Z - 0.5, z1: Z + 14.5 },
  y: Y,
};

// (v1.10) church coffee ("Kyrkkaffet"): the coffee table along the north wall east of the door, the
// bell rope just inside the door (west side), and the organ bench in front of the organ's keys
export const CHAPEL_KAFFE = {
  table: { x: X + 6.32, y: Y + 0.765, z: Z + 0.44 },        // the middle of the coffee table: the tray of buns goes here
  rope: { x: X + 3.0, z: Z + 0.42, r: 0.95 },               // the bell rope hangs here; stand close and press RINGA
  hello: { x: X + 5.15, z: Z + 1.45 },                      // Inga waits by the table when you carry the buns in
  organ: { x: X + 2.12, z: Z + 11.95, r: 0.8 },             // stand here, at the end of the organ bench, and press SPELA
  seat: { x: X + 0.95, z: Z + 11.92, y: Y + 0.47, h: 0 },   // on the bench, facing the keys (hips at y)
  up: { x: X + 2.12, z: Z + 11.95, h: Math.PI / 2 },        // where you stand when you get up
  cantor: { x: X + 2.55, z: Z + 12.62, h: -Math.PI / 2 },   // Inga stands here by the organ and sings first
  ropeTop: 3.15, ropeLow: 0.95,                              // the rope's ends (local y), and its red-and-white grip
};

const WALL = 0xf4f0e6;
// walls [x0, z0, x1, z1, colour] (local, full height); the door gap is x 3.4–4.6 in the north wall
export const CHAPEL_WALLS = [
  [-0.2, -0.2, 3.4, 0, WALL],
  [4.6, -0.2, 8.2, 0, WALL],
  [-0.2, 0, 0, 14.2, WALL],
  [8, 0, 8.2, 14.2, WALL],
  [-0.2, 14, 8.2, 14.2, WALL],
];
// things that block the way [x0, z0, x1, z1, height]
export const CHAPEL_FURN = [
  ...PEWS.map(([x0, z0, x1, z1]) => [x0, z0, x1, z1, 0.95]),
  [0.5, 11.0, 3.0, 11.15, 0.9],    // the altar rail, west half
  [5.0, 11.0, 7.5, 11.15, 0.9],    // and east half (the aisle goes through the gap)
  [3.0, 12.4, 5.0, 13.2, 1.0],     // the altar
  [6.25, 9.95, 7.6, 10.85, 1.1],   // the pulpit and its steps
  [0.85, 1.25, 1.55, 1.95, 0.95],  // the baptismal font
  [6.15, 1.5, 6.85, 2.2, 1.0],     // the candle stand
  [0.15, 12.5, 1.7, 13.85, 2.4],   // the organ
  [4.95, 0.1, 7.75, 0.75, 0.77],   // (v1.10) the coffee table by the door
  [0.3, 11.76, 1.6, 12.1, 0.47],   // (v1.10) the organ bench
  [3.4, -0.2, 4.6, 0, WH],         // the door (shut behind you) – keep it last (the minimap leaves it out)
];

const SIGNS = {
  altarpiece: { def: { lines: ['FRID', 'VARE MED ER'], bg: '#24365e', fg: '#f2d27a', font: 0.46, border: '#d9b23a' }, x: 4, y: 1.85, z: 13.958, rot: Math.PI, w: 1.7, h: 1.0 }, // (v1.10: in front of its frame, which hid it)
  psalms: { def: { lines: ['PSALM', '12  ·  287', '649'], bg: '#3b2a1e', fg: '#f4efe4', font: 0.36, border: '#d9b23a' }, x: 7.988, y: 1.7, z: 3.0, rot: -Math.PI / 2, w: 0.8, h: 0.9 },
  welcome: { def: { lines: ['SÖDERHOLMENS', 'KAPELL', '1890'], bg: '#f4efe4', fg: '#24365e', font: 0.34, border: '#24365e' }, x: 0.012, y: 1.7, z: 2.6, rot: Math.PI / 2, w: 0.9, h: 0.8 },
};

export function chapelLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of CHAPEL_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + WH });
  for (const [x0, z0, x1, z1, h] of CHAPEL_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    const key = 'chapel-' + id;
    signs[key] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id: key, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = CHAPEL.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function chapelInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r, n = 12) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, n, c, m, true);
  const WOOD = 0x7a5236, DARK = 0x5a3b26, GOLD = 0xd9b23a, STONE = 0xe9e3d6, CLOTH = 0xfbfaf6;

  // ---- floor: pale stone, a red runner up the aisle, oak boards in the chancel
  floor(0, 0, 8, 14, 0xcfc6b6, FLOORTILE);
  floor(0, 11.15, 8, 14, 0xb08458, PARQUET, 0.005);
  floor(3.5, 0.6, 4.5, 12.3, 0x9c2a2a, FABRIC, 0.008);
  for (const x of [3.5, 4.44]) floor(x, 0.6, x + 0.06, 12.3, GOLD, FABRIC, 0.01);
  floor(3.4, -0.2, 4.6, 0, 0x8f8a83, PLAIN);

  // ---- walls, a wooden wainscot round the room, a cornice at the top
  for (const [x0, z0, x1, z1, c] of CHAPEL_WALLS) bx(x0, 0, z0, x1, WH, z1, c, IWALL, { top: { c: 0x3a3c41, m: IWALL } });
  bx(3.4, 2.3, -0.2, 4.6, WH, 0, WALL, IWALL, { top: { c: 0x3a3c41, m: IWALL } });
  bx(3.4, 0, -0.04, 4.6, 2.3, 0.04, 0x5b4636, ITRIM);                     // the door, shut
  for (const x of [3.55, 4.05]) bx(x, 0.15, 0.04, x + 0.4, 2.1, 0.06, 0x4e3b2d, ITRIM);
  bx(4.42, 1.0, 0.06, 4.48, 1.15, 0.1, GOLD, CHROME);
  const panel = (x0, z0, x1, z1) => bx(x0, 0, z0, x1, 1.0, z1, 0x8a6a4a, ITRIM);
  panel(0, 0, 0.04, 14); panel(7.96, 0, 8, 14); panel(0, 13.96, 8, 14);
  panel(0, 0, 3.4, 0.04); panel(4.6, 0, 8, 0.04);
  bx(0, 2.95, 0, 0.06, 3.05, 14, 0xe0d8c6, ITRIM); bx(7.94, 2.95, 0, 8, 3.05, 14, 0xe0d8c6, ITRIM);

  // ---- tall windows in the side walls: stained glass in three bands, a pointed top
  const GLASS = [0x9fc2e0, 0xe0c46a, 0x8fbf9a, 0xd98a8a];
  for (const [side, xw] of [[-1, 0], [1, 8]]) {
    for (const [k, zc] of [3.6, 6.6, 9.6].entries()) {
      const inX = xw - side * 0.005, inX2 = xw - side * 0.02;
      bx(inX, 1.15, zc - 0.5, inX2, 2.55, zc + 0.5, 0xf4f1ec, ITRIM);
      for (let b = 0; b < 3; b++) bx(inX2, 1.22 + b * 0.43, zc - 0.42, inX2 - side * 0.006, 1.62 + b * 0.43, zc + 0.42, GLASS[(k + b + (side > 0 ? 1 : 0)) % 4], IGLASS);
      for (let s = 0; s < 3; s++) bx(inX, 2.55 + s * 0.12, zc - 0.5 + (s + 1) * 0.13, inX2, 2.67 + s * 0.12, zc + 0.5 - (s + 1) * 0.13, 0xf4f1ec, ITRIM);
      bx(inX2, 2.55, zc - 0.32, inX2 - side * 0.006, 2.75, zc + 0.32, 0xe0c46a, IGLASS);
      // a brass wall light between the windows
      const zl = zc + 1.5;
      if (zl < 11) { bx(inX, 1.9, zl - 0.06, inX - side * 0.12, 1.95, zl + 0.06, GOLD, CHROME); B.ico(X + xw - side * 0.14, Y + 2.05, Z + zl, 0.07, 1, 0xfff1c9, LIGHT); }
    }
  }

  // ---- the pews: a seat, a back rest on the north side, carved ends; hymn books here and there
  for (let i = 0; i < ROWS; i++) {
    const z0 = rowZ(i);
    for (const [x0, x1] of [[0.5, 3.3], [4.7, 7.5]]) {
      bx(x0, 0.42, z0 + 0.06, x1, 0.47, z0 + PEW_D, WOOD, PARQUET, { skipBottom: false });
      bx(x0, 0.47, z0, x1, 0.95, z0 + 0.07, WOOD, PARQUET);
      bx(x0, 0.9, z0 - 0.02, x1, 0.95, z0 + 0.09, DARK, PARQUET);
      for (const xe of [x0, x1 - 0.07]) {
        bx(xe, 0, z0, xe + 0.07, 0.9, z0 + PEW_D, DARK, PARQUET);
        B.ico(X + xe + 0.035, Y + 0.95, Z + z0 + PEW_D / 2, 0.06, 1, DARK, PARQUET);
      }
      bx(x0, 0.08, z0 + 0.2, x1, 0.12, z0 + 0.3, DARK, PARQUET);                       // a foot rail
      if ((i + (x0 > 4 ? 1 : 0)) % 2 === 0) bx(x0 + 1.0, 0.47, z0 + 0.2, x0 + 1.18, 0.52, z0 + 0.34, 0x7a1f1f, PLAIN);
    }
  }

  // ---- the altar rail with its turned posts, and a kneeling cushion along it
  for (const [x0, x1] of [[0.5, 3.0], [5.0, 7.5]]) {
    bx(x0, 0.82, 11.0, x1, 0.9, 11.15, DARK, PARQUET);
    bx(x0, 0, 11.02, x1, 0.06, 11.13, DARK, PARQUET);
    for (let x = x0 + 0.05; x <= x1 - 0.04; x += 0.25) cyl(x, 11.075, 0.06, 0.82, 0.025, 0xf4f1ec, ITRIM, 0.025, 6);
    bx(x0, 0, 10.7, x1, 0.12, 10.98, 0x9c2a2a, FABRIC);
  }

  // ---- the altar: white stone, a white cloth with a gold edge, a green front with a gold cross
  bx(3.0, 0, 12.4, 5.0, 0.95, 13.2, STONE, PLAIN);
  bx(2.95, 0.95, 12.35, 5.05, 1.0, 13.25, CLOTH, FABRIC, { skipBottom: false });
  bx(2.95, 0.6, 12.33, 5.05, 0.98, 12.35, CLOTH, FABRIC);
  bx(2.95, 0.6, 12.325, 5.05, 0.64, 12.33, GOLD, CHROME);
  bx(3.55, 0.05, 12.37, 4.45, 0.6, 12.39, 0x2e6a3a, FABRIC);
  bx(3.96, 0.12, 12.36, 4.04, 0.55, 12.365, GOLD, CHROME); bx(3.82, 0.36, 12.36, 4.18, 0.43, 12.365, GOLD, CHROME);
  // two candlesticks with lit candles, an open Bible on a stand
  for (const x of [3.35, 4.65]) {
    cyl(x, 12.95, 1.0, 1.03, 0.08, GOLD, CHROME); cyl(x, 12.95, 1.03, 1.32, 0.02, GOLD, CHROME); cyl(x, 12.95, 1.32, 1.35, 0.05, GOLD, CHROME);
    cyl(x, 12.95, 1.35, 1.6, 0.025, 0xfbf6e8, PLAIN);
    B.ico(X + x, Y + 1.65, Z + 12.95, 0.03, 1.6, 0xffd36a, LIGHT);
  }
  bx(3.8, 1.0, 12.7, 4.2, 1.06, 12.95, DARK, PARQUET);
  bx(3.78, 1.06, 12.68, 3.99, 1.08, 12.95, 0xfbf6e8, PLAIN); bx(4.01, 1.06, 12.68, 4.22, 1.08, 12.95, 0xfbf6e8, PLAIN);
  bx(3.99, 1.06, 12.68, 4.01, 1.085, 12.95, 0x9c2a2a, PLAIN);

  // ---- behind the altar: a gilt frame round the altarpiece and a tall gold cross above it
  bx(3.05, 1.27, 13.94, 4.95, 2.43, 13.99, GOLD, CHROME);
  bx(3.96, 2.55, 13.92, 4.04, 3.15, 13.99, GOLD, CHROME);
  bx(3.78, 2.86, 13.92, 4.22, 2.94, 13.99, GOLD, CHROME);
  // flowers in two stone urns on either side of the altar
  for (const [x, cs] of [[2.4, [0xf2efe6, 0xf2c21b, 0xe85d9a]], [5.6, [0xf2efe6, 0xe85d9a, 0xf2c21b]]]) {
    cyl(x, 13.3, 0, 0.55, 0.16, STONE, PLAIN, 0.22);
    for (let k = 0; k < 7; k++) {
      const a = k * 2.4, r = k ? 0.13 : 0;
      B.ico(X + x + Math.cos(a) * r, Y + 0.68 + (k ? 0 : 0.08), Z + 13.3 + Math.sin(a) * r, 0.08, 1, cs[k % 3], PLAIN);
    }
    B.ico(X + x, Y + 0.6, Z + 13.3, 0.2, 0.6, 0x3f7a3a, PLAIN);
  }

  // ---- the pulpit: an eight-sided wooden tub with a gold rim and a book rest, three steps up
  cyl(6.7, 10.4, 0, 0.35, 0.18, DARK, PARQUET, 0.18, 8);
  cyl(6.7, 10.4, 0.35, 1.1, 0.45, WOOD, PARQUET, 0.45, 8);
  cyl(6.7, 10.4, 1.05, 1.1, 0.47, GOLD, CHROME, 0.47, 8);
  bx(6.45, 1.1, 10.05, 6.95, 1.18, 10.3, DARK, PARQUET);
  for (let s = 0; s < 3; s++) bx(7.15, 0, 10.85 - s * 0.28, 7.6, 0.18 + s * 0.18, 10.85 - s * 0.28 + 0.28, DARK, PARQUET);

  // ---- the organ in the south-west corner: a dark case and a row of silver pipes
  bx(0.15, 0, 12.5, 1.7, 1.0, 13.85, DARK, PARQUET);
  bx(0.2, 0.75, 12.45, 1.65, 0.8, 12.6, 0xf4f1ec, PLAIN);                    // the keys
  bx(0.15, 1.0, 13.4, 1.7, 2.4, 13.85, DARK, PARQUET);
  for (let k = 0; k < 7; k++) { const x = 0.3 + k * 0.2, h = 2.0 + 0.5 * (1 - Math.abs(k - 3) / 3); cyl(x, 13.35, 1.0, h, 0.06, 0xc9ccd0, CHROME, 0.06, 8); }

  // ---- by the door: the baptismal font, and a stand with candles you can light
  cyl(1.2, 1.6, 0, 0.12, 0.3, STONE, PLAIN);
  cyl(1.2, 1.6, 0.12, 0.75, 0.13, STONE, PLAIN, 0.16);
  cyl(1.2, 1.6, 0.75, 0.95, 0.24, STONE, PLAIN, 0.36);
  cyl(1.2, 1.6, 0.95, 0.955, 0.3, 0x8fb6c9, IGLASS);
  cyl(6.5, 1.85, 0, 0.75, 0.04, 0x2a2b2f, PLAIN);
  cyl(6.5, 1.85, 0.75, 0.8, 0.36, 0x2a2b2f, PLAIN);
  for (let k = 0; k < 9; k++) {
    const a = k * 0.7, r = 0.1 + (k % 3) * 0.08;
    const x = 6.5 + Math.cos(a) * r, z = 1.85 + Math.sin(a) * r;
    cyl(x, z, 0.8, 0.84, 0.03, 0xf4f1ec, PLAIN, 0.03, 6);
    if (k % 4 !== 3) B.ico(X + x, Y + 0.88, Z + z, 0.015, 1.6, 0xffd36a, LIGHT);
  }

  // ---- (v1.10) the coffee table for church coffee, along the north wall east of the door: a white
  // cloth, the big coffee urn with its tap, a coffee pot, cups on saucers, a sugar bowl and flowers.
  // (The tray of buns is drawn by render.js once you have carried them in.)
  for (const [x, z] of [[5.0, 0.15], [7.65, 0.15], [5.0, 0.65], [7.65, 0.65]]) bx(x, 0, z, x + 0.06, 0.72, z + 0.06, DARK, PARQUET);
  bx(4.95, 0.72, 0.1, 7.75, 0.755, 0.75, WOOD, PARQUET);
  bx(4.92, 0.755, 0.07, 7.78, 0.765, 0.78, CLOTH, FABRIC, { skipBottom: false });
  bx(4.92, 0.56, 0.77, 7.78, 0.765, 0.78, CLOTH, FABRIC);                      // the cloth hangs down in front
  for (const x of [4.92, 7.77]) bx(x, 0.56, 0.07, x + 0.01, 0.765, 0.78, CLOTH, FABRIC);
  bx(4.92, 0.56, 0.775, 7.78, 0.58, 0.785, 0x9c2a2a, FABRIC);                  // a red border along the hem
  const TOP = 0.765;
  cyl(7.36, 0.4, TOP, TOP + 0.03, 0.16, 0x9aa0a6, CHROME, 0.16, 12);           // the coffee urn: foot, body, lid, knob
  cyl(7.36, 0.4, TOP + 0.03, TOP + 0.5, 0.15, 0xc9ccd0, CHROME, 0.14, 12);
  cyl(7.36, 0.4, TOP + 0.5, TOP + 0.54, 0.15, 0x9aa0a6, CHROME, 0.08, 12);
  cyl(7.36, 0.4, TOP + 0.54, TOP + 0.58, 0.03, 0x2a2b2f, PLAIN, 0.03, 6);
  bx(7.33, TOP + 0.08, 0.53, 7.39, TOP + 0.12, 0.6, 0x2a2b2f, PLAIN);          // its tap, facing the room
  for (const sx of [-1, 1]) bx(7.36 + sx * 0.15, TOP + 0.36, 0.37, 7.36 + sx * 0.19, TOP + 0.4, 0.43, 0x2a2b2f, PLAIN);
  cyl(5.52, 0.36, TOP, TOP + 0.2, 0.075, 0x2f5f8a, PLAIN, 0.06, 10);            // a blue enamel coffee pot with a spout
  cyl(5.52, 0.36, TOP + 0.2, TOP + 0.24, 0.06, 0x24476a, PLAIN, 0.02, 10);
  B.tube([X + 5.59, Y + TOP + 0.1, Z + 0.36], [X + 5.68, Y + TOP + 0.2, Z + 0.36], 0.014, 0.01, 5, 0x2f5f8a, PLAIN);
  bx(5.42, TOP + 0.05, 0.345, 5.45, TOP + 0.18, 0.375, 0x24476a, PLAIN);
  for (let i = 0; i < 6; i++) {                                                 // cups on saucers, in two rows
    const x = 6.84 + (i % 3) * 0.17, z = 0.26 + Math.floor(i / 3) * 0.32;
    cyl(x, z, TOP, TOP + 0.01, 0.065, 0xf4f1ec, PLAIN, 0.065, 10);
    cyl(x, z, TOP + 0.01, TOP + 0.075, 0.035, 0xf4f1ec, PLAIN, 0.045, 10);
    cyl(x, z, TOP + 0.07, TOP + 0.075, 0.04, 0x3a2416, PLAIN, 0.04, 10);
  }
  cyl(5.85, 0.6, TOP, TOP + 0.07, 0.05, 0xf4f1ec, PLAIN, 0.06, 10);             // the sugar bowl
  for (let i = 0; i < 4; i++) B.box(X + 5.82 + (i % 2) * 0.03, Y + TOP + 0.07, Z + 0.58 + (i >> 1) * 0.03, X + 5.84 + (i % 2) * 0.03, Y + TOP + 0.085, Z + 0.6 + (i >> 1) * 0.03, 0xffffff, PLAIN);
  cyl(5.18, 0.24, TOP, TOP + 0.14, 0.04, 0xbfe0ea, IGLASS, 0.05, 8);           // a little vase of flowers
  for (let k = 0; k < 5; k++) { const a = k * 1.25; B.ico(X + 5.18 + Math.cos(a) * 0.05, Y + TOP + 0.2, Z + 0.24 + Math.sin(a) * 0.05, 0.035, 1, [0xf2c21b, 0xe85d9a, 0xf2efe6][k % 3], PLAIN); }
  B.ico(X + 5.18, Y + TOP + 0.16, Z + 0.24, 0.06, 0.7, 0x3f7a3a, PLAIN);

  // ---- (v1.10) the bell rope comes down through a hole in a beam above the door's west side
  bx(2.8, 3.02, -0.02, 3.2, 3.16, 0.62, DARK, PARQUET);
  bx(2.97, 3.0, 0.39, 3.03, 3.02, 0.45, 0x1d1f22, PLAIN);

  // ---- (v1.10) the organ bench, and a music rack with a sheet of music above the keys
  bx(0.3, 0.42, 11.76, 1.6, 0.47, 12.1, DARK, PARQUET, { skipBottom: false });
  for (const x of [0.3, 1.53]) bx(x, 0, 11.79, x + 0.07, 0.42, 12.07, DARK, PARQUET);
  bx(0.37, 0.1, 11.9, 1.53, 0.14, 11.96, DARK, PARQUET);
  bx(0.55, 1.0, 12.52, 1.32, 1.3, 12.56, DARK, PARQUET);
  bx(0.62, 1.04, 12.5, 1.25, 1.27, 12.52, 0xf6f3ea, PLAIN);
  for (let k = 0; k < 4; k++) bx(0.66, 1.08 + k * 0.05, 12.495, 1.21, 1.085 + k * 0.05, 12.5, 0x2a2b2f, PLAIN);
}

// (v1.10) the bell rope, local to where it hangs (y from the floor): a thin rope and a red-and-white
// woollen grip ("sally") at the bottom. render.js moves it down and up when you ring.
export function ropeInto(B) {
  const top = CHAPEL_KAFFE.ropeTop, low = CHAPEL_KAFFE.ropeLow;
  B.box(-0.012, low, -0.012, 0.012, top + 0.4, 0.012, 0xc8b48a, PLAIN);
  for (let k = 0; k < 6; k++) B.cyl(0, 0, low + 0.2 + k * 0.07, low + 0.27 + k * 0.07, 0.04, 0.04, 8, k % 2 ? 0xf4f1ec : 0xb3262b, FABRIC, true);
  B.cyl(0, 0, low - 0.05, low + 0.02, 0.02, 0.035, 6, 0xc8b48a, PLAIN, true);
}
