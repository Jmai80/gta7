// Elsa's house from the inside (v1.12): the little green house on Söderholmen, west of the chapel (the
// house at x −75, z 244 in southisle.js – its door faces the road in the east). Elsa Strand lives here
// with Måns the cat: a rocking chair by the west window, a bookcase full of photo albums, a kitchen
// corner with two cups always on the table, a bed alcove, a sewing basket – and a pair of glasses that
// are never where she left them. Like the other insides it is built out at sea (INDOOR in config.js).
// Local coordinates: x east, z south, y up from the floor; the origin is the north-west corner.
//
//   z=0  ┌ bed ── night ─ wardrobe ─ bookcase ─┬─ kitchen counter (window) ┐
//        │ alcove  stand                       │  kitchen table, 2 chairs  │
//        │ radio                                                         door  (east, to the road)
//        │ rocking chair (Elsa) ← west window         rag rug                │
//        │ sewing basket    Måns' basket          sofa                     │
//   z=7  └──────────────────────────────────────────────────────────────────┘
//        x=0                                                             x=8
import { INDOOR } from './config.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, PARQUET = 30, FLOORTILE = 31, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.45;
const X = INDOOR.x - 22, Y = INDOOR.y, Z = INDOOR.z + 2;

// outside: the door on the east side of the green house (southisle.js HOUSES[4]), on the road side
export const ELSA_DOOR = { x: -66.4, z: 247.5, r: 1.2 };

export const ELSA_HOUSE = {
  spawn: { x: X + 7.4, z: Z + 3.5, h: -Math.PI / 2 },  // a step inside the door, facing into the room
  door: { x: X + 7.6, z: Z + 3.5, r: 0.6 },            // stand here and press GÅ UT
  chair: { x: X + 1.4, z: Z + 4.5, y: Y + 0.48, h: Math.PI / 2 }, // Elsa in her rocking chair, facing the room (hips on the seat)
  talk: { x: X + 2.45, z: Z + 4.5, r: 1.5 },           // stand here to talk to her (and give her things)
  room: { x0: X, x1: X + 8, z0: Z, z1: Z + 7 },
  bounds: { x0: X - 0.5, x1: X + 8.5, z0: Z - 0.5, z1: Z + 7.5 },
  y: Y,
};

// the places to look for Elsa's glasses: stand here (at) and press LETA; item: where the arrow hangs.
// find: the glasses (under Måns the cat); the rest is Elsa's life – and a little about 1974
export const ELSA_SPOTS = [
  { id: 'hylla', at: [4.4, 1.0], item: [4.4, 2.15, 0.2], text: 'Ett fotoalbum: ”Söderholmen 1974”. Dansbanan, lampor i träden, en flicka i grön klänning – och vid staketet en lång pojke med kaptensmössa som tittar åt fel håll. Mot henne.' },
  { id: 'kikare', at: [6.9, 1.05], item: [6.9, 1.35, 0.15], text: 'I köksfönstret står en gammal kikare. Den pekar norrut, över sundet – mot fyren på Norrholmen.' },
  { id: 'bord', at: [6.6, 2.95], item: [6.6, 1.05, 1.95], text: 'På köksbordet står två kaffekoppar. ”Jag dukar alltid för två”, säger Elsa. ”Man vet aldrig.”' },
  { id: 'natt', at: [2.0, 1.05], item: [1.95, 0.95, 0.3], text: 'På nattduksbordet: en psalmbok. Mellan sidorna ligger en torkad strandtrift – precis som den i Ingvars plåtask.' },
  { id: 'sykorg', at: [1.15, 5.8], item: [0.45, 0.65, 5.85], text: 'I sykorgen: grönt tyg och ett mönster. ”Klänning, modell 1974” står det på kuvertet.' },
  { id: 'korg', at: [2.8, 5.6], item: [2.8, 0.6, 6.45], find: 'glasses', text: 'Måns ligger och spinner på något. Han morrar lite, men flyttar på sig: Elsas glasögon! Han har legat på dem hela förmiddagen.' },
];
for (const s of ELSA_SPOTS) { s.x = X + s.at[0]; s.z = Z + s.at[1]; s.r = 0.8; s.item = [X + s.item[0], Y + s.item[1], Z + s.item[2]]; }

const WALL = 0xe8edd8, WALL2 = 0xdfe7cf;
// walls [x0, z0, x1, z1, colour] (local, full height): the door gap is z 3.0–4.0 in the east wall
export const ELSA_WALLS = [
  [-0.2, -0.2, 8.2, 0, WALL],
  [-0.2, 0, 0, 7.2, WALL2],
  [-0.2, 7, 8.2, 7.2, WALL],
  [8, 0, 8.2, 3.0, WALL2],
  [8, 4.0, 8.2, 7.2, WALL2],
];
// things that block the way [x0, z0, x1, z1, height]
export const ELSA_FURN = [
  [0.1, 0.1, 1.6, 2.2, 0.55],     // the bed in the alcove
  [1.7, 0.1, 2.25, 0.55, 0.6],    // the nightstand
  [2.5, 0, 3.35, 0.6, 2.0],       // the wardrobe
  [3.6, 0, 5.2, 0.4, 1.9],        // the bookcase
  [5.8, 0, 8.0, 0.6, 0.9],        // the kitchen counter
  [6.0, 1.5, 7.2, 2.4, 0.75],     // the kitchen table
  [3.6, 6.25, 5.6, 7.0, 0.85],    // the sofa
  [0.85, 4.0, 1.95, 5.0, 0.95],   // the rocking chair (with Elsa in it)
  [0.15, 2.9, 0.65, 3.5, 0.75],   // the side table with the radio
  [0.2, 5.6, 0.7, 6.1, 0.35],     // the sewing basket
  [2.4, 6.15, 3.2, 6.85, 0.28],   // Måns' basket
  [8, 3.0, 8.2, 4.0, IH],         // the door (shut behind you)
];

const SIGNS = {
  // a cross-stitch over the sofa
  korsstygn: { def: { lines: ['HEM LJUVA', 'HEM'], bg: '#f4efe0', fg: '#8e2c20', font: 0.42, border: '#5f7a4a' }, x: 4.6, y: 1.65, z: 6.988, rot: Math.PI, w: 0.75, h: 0.48 },
};

export function elsaLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of ELSA_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of ELSA_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs['elsa-' + id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id: 'elsa-' + id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = ELSA_HOUSE.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function elsaInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, 10, c, m, true);
  const tube = (a, b, r, c, m = PLAIN) => B.tube([X + a[0], Y + a[1], Z + a[2]], [X + b[0], Y + b[1], Z + b[2]], r, r, 6, c, m);
  const WHITE = 0xf3efe6, WOOD = 0x9a6a3e, DARK = 0x6b4a2a;

  // floors: pine boards, linoleum in the kitchen corner, a long rag rug and a round braided one
  floor(0, 0, 8, 7, 0xc49a68, PARQUET);
  floor(5.7, 0, 8, 2.9, 0xb9c4b0, FLOORTILE, 0.004);
  floor(8, 3.0, 8.2, 4.0, 0x6b6f75, PLAIN);
  for (let i = 0; i < 9; i++) bx(3.2 + i * 0.36, 0, 3.6, 3.55 + i * 0.36, 0.012, 4.6, [0x5f7a4a, 0xc0483c, 0xe8e2d0, 0x3a6fb5, 0xe2c25a][i % 5], FABRIC);
  B.cyl(X + 1.6, Z + 4.6, Y + 0.004, Y + 0.012, 1.0, 1.0, 18, 0xb98a5a, FABRIC, true);

  for (const [x0, z0, x1, z1, c] of ELSA_WALLS) bx(x0, 0, z0, x1, IH, z1, c, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(8, 2.2, 3.0, 8.2, IH, 4.0, WALL2, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(8.04, 0, 3.0, 8.16, 2.2, 4.0, 0x3b4148, ITRIM);                 // the front door (dark green-grey, like outside)
  bx(7.98, 0.95, 3.15, 8.04, 1.0, 3.3, 0xc9ccd0, CHROME);
  // a wallpaper border, and the skirting
  for (const [x0, z0, x1, z1] of [[0.01, 0.01, 7.99, 0.04], [0.01, 6.96, 7.99, 6.99]]) { bx(x0, 1.9, z0, x1, 1.98, z1, 0x7a9a62); bx(x0, 0, z0, x1, 0.1, z1, WHITE, ITRIM); }
  for (const [x0, z0, x1, z1] of [[0.01, 0.04, 0.04, 6.96], [7.96, 0.04, 7.99, 2.95], [7.96, 4.05, 7.99, 6.96]]) { bx(x0, 1.9, z0, x1, 1.98, z1, 0x7a9a62); bx(x0, 0, z0, x1, 0.1, z1, WHITE, ITRIM); }
  // windows: west (by the rocking chair), north (over the sink), south (over the sofa)
  const winZ = (x, z, s, w) => { // in a north (s 1) or south (s −1) wall
    const z0 = z + s * 0.004;
    bx(x - w / 2 - 0.06, 0.85, z0, x + w / 2 + 0.06, 1.95, z0 + s * 0.01, WHITE, ITRIM);
    bx(x - w / 2, 0.9, z0 + s * 0.01, x + w / 2, 1.9, z0 + s * 0.014, 0x9db4c7, IGLASS);
    bx(x - 0.025, 0.9, z0 + s * 0.014, x + 0.025, 1.9, z0 + s * 0.018, WHITE, ITRIM);
    bx(x - w / 2 - 0.08, 0.83, z, x + w / 2 + 0.08, 0.87, z + s * 0.16, WHITE, ITRIM);
  };
  winZ(6.9, 0, 1, 1.0); winZ(4.6, 7, -1, 1.1);
  bx(0.004, 0.85, 3.85, 0.014, 1.95, 5.15, WHITE, ITRIM); bx(0.014, 0.9, 3.9, 0.018, 1.9, 5.1, 0x9db4c7, IGLASS); bx(0.018, 0.9, 4.475, 0.022, 1.9, 4.525, WHITE, ITRIM);
  bx(0, 0.83, 3.83, 0.16, 0.87, 5.17, WHITE, ITRIM);
  for (const [z, c] of [[4.0, 0xd8343c], [5.0, 0x8a5ad0]]) { cyl(0.09, z, 0.87, 0.99, 0.06, 0xb5603a, PLAIN, 0.05); B.ico(X + 0.09, Y + 1.06, Z + z, 0.09, 0.8, 0x3d7a3a); B.ico(X + 0.1, Y + 1.12, Z + z, 0.05, 1, c); } // african violets
  // lace curtains
  for (const [x0, z0, x1, z1] of [[6.2, 0.02, 6.45, 0.05], [7.35, 0.02, 7.6, 0.05], [3.9, 6.95, 4.15, 6.98], [5.05, 6.95, 5.3, 6.98]]) bx(x0, 1.0, z0, x1, 2.05, z1, 0xf8f6f0, FABRIC);
  for (const [z0, z1] of [[3.7, 3.95], [5.05, 5.3]]) bx(0.02, 1.0, z0, 0.05, 2.05, z1, 0xf8f6f0, FABRIC);

  // ---- the bed alcove: a white iron bed with a crocheted cover, the nightstand with the psalm book
  bx(0.1, 0, 0.1, 1.6, 0.38, 2.2, 0xf4f1ec, PLAIN, { skipBottom: false });
  bx(0.14, 0.38, 0.14, 1.56, 0.52, 2.16, 0xf6f2ea, FABRIC);
  bx(0.14, 0.52, 0.7, 1.56, 0.56, 2.16, 0xe8d8b8, FABRIC);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) bx(0.2 + i * 0.27, 0.561, 0.8 + j * 0.33, 0.4 + i * 0.27, 0.565, 1.0 + j * 0.33, [0xc0483c, 0x5f7a4a, 0xe2c25a][(i + j) % 3], FABRIC); // granny squares
  bx(0.3, 0.52, 0.2, 1.4, 0.66, 0.6, 0xffffff, FABRIC);
  for (const x of [0.12, 1.55]) { tube([x, 0, 0.12], [x, 1.0, 0.12], 0.025, 0xf4f1ec); tube([x, 0, 2.18], [x, 0.7, 2.18], 0.025, 0xf4f1ec); }
  tube([0.12, 1.0, 0.12], [1.55, 1.0, 0.12], 0.025, 0xf4f1ec);
  for (let i = 1; i < 6; i++) tube([0.12 + i * 0.24, 0.4, 0.12], [0.12 + i * 0.24, 1.0, 0.12], 0.012, 0xf4f1ec);
  bx(1.7, 0, 0.1, 2.25, 0.6, 0.55, WOOD, PLAIN);
  bx(1.8, 0.6, 0.2, 2.1, 0.64, 0.42, 0x2a3540);                     // the psalm book
  bx(1.83, 0.64, 0.25, 2.07, 0.645, 0.37, 0xd97aa0);                // (the dried sea pink peeks out)
  cyl(2.12, 0.42, 0.6, 0.62, 0.06, 0xd9b23a, CHROME); cyl(2.12, 0.42, 0.62, 0.92, 0.012, 0xd9b23a, CHROME); cyl(2.12, 0.42, 0.92, 1.04, 0.1, 0xfff1c9, LIGHT, 0.07);
  // ---- the wardrobe and the bookcase with the photo albums (and Ingvar's lighthouse on a postcard)
  bx(2.5, 0, 0, 3.35, 2.0, 0.6, 0xd8cfb4, ITRIM);
  bx(2.92, 0.1, 0.6, 2.93, 1.9, 0.61, 0x8a7a62);
  for (const x of [2.82, 3.02]) bx(x, 1.0, 0.6, x + 0.03, 1.12, 0.64, 0xd9b23a, CHROME);
  bx(3.6, 0, 0, 5.2, 1.9, 0.4, DARK, PLAIN);
  for (const yy of [0.05, 0.5, 0.95, 1.4]) {
    bx(3.62, yy, 0.02, 5.18, yy + 0.03, 0.39, 0x7a5a3c);
    for (let k = 0, x = 3.68; x < 5.1; k++) { const w = 0.06 + ((k * 31) % 4) * 0.015; bx(x, yy + 0.03, 0.05, x + w, yy + 0.32 + ((k * 7) % 3) * 0.03, 0.36, [0x2f5f8a, 0x8e2c20, 0x5f7a4a, 0xe8e2d0, 0x6a4a7a, 0xc89a3a][k % 6]); x += w + 0.012; }
  }
  bx(3.7, 1.9, 0.08, 4.3, 2.05, 0.3, 0x2a3540); bx(4.45, 1.9, 0.08, 4.95, 2.12, 0.3, 0x5a3a26); // albums on top
  bx(4.1, 1.47, 0.36, 4.4, 1.69, 0.38, 0xf2efe8);                                                  // a postcard: a white lighthouse
  bx(4.21, 1.5, 0.381, 4.29, 1.66, 0.384, 0xffffff); bx(4.21, 1.58, 0.382, 4.29, 1.6, 0.386, 0xc0302a);

  // ---- the kitchen corner: counter with a sink and a little stove, the window, the table set for two
  bx(5.8, 0, 0, 8, 0.86, 0.6, 0xd8e0cf, ITRIM);
  bx(5.78, 0.86, 0, 8, 0.9, 0.62, 0xb9b2a4, PLAIN, { skipBottom: false });
  bx(6.5, 0.901, 0.1, 7.3, 0.905, 0.5, 0x8f969c, CHROME);
  bx(6.86, 0.9, 0.05, 6.94, 1.2, 0.1, 0xb9bec4, CHROME);
  bx(7.45, 0.901, 0.1, 7.95, 0.91, 0.5, 0x2a2b2f);
  for (const [x, z] of [[7.58, 0.22], [7.82, 0.22], [7.58, 0.4], [7.82, 0.4]]) cyl(x, z, 0.91, 0.915, 0.07, 0x4a4c50);
  cyl(7.7, 0.3, 0.915, 1.12, 0.1, 0x3a6fb5, PLAIN, 0.09);           // the coffee pot
  bx(5.8, 1.45, 0, 6.2, 2.2, 0.35, 0xd8e0cf, ITRIM);                  // a wall cupboard
  // the binoculars on the window sill, pointing north
  for (const s of [-0.05, 0.05]) B.hcyl(X + 6.9 + s, Y + 0.96, Z + 0.1, 0.16, 0.035, 'z', 8, 0x1d1f22);
  // the table with a checked cloth, two cups, a plate of buns; two chairs
  bx(6.0, 0.72, 1.5, 7.2, 0.76, 2.4, WHITE, PLAIN, { skipBottom: false });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) bx(6.0 + i * 0.2, 0.761, 1.5 + j * 0.225, 6.2 + i * 0.2, 0.763, 1.725 + j * 0.225, 0xc0483c, FABRIC);
  for (const [x, z] of [[6.05, 1.55], [7.1, 1.55], [6.05, 2.3], [7.1, 2.3]]) bx(x, 0, z, x + 0.05, 0.72, z + 0.05, WOOD);
  for (const [x, z] of [[6.35, 1.75], [6.85, 2.15]]) { cyl(x, z, 0.763, 0.77, 0.07, WHITE); cyl(x, z, 0.77, 0.84, 0.04, WHITE, PLAIN, 0.045); }
  cyl(6.6, 1.95, 0.763, 0.775, 0.13, 0x5f7a4a);
  for (const [dx, dz] of [[-0.04, -0.03], [0.05, 0.02], [0, 0.06]]) B.ico(X + 6.6 + dx, Y + 0.8, Z + 1.95 + dz, 0.035, 0.8, 0xc8883a);
  for (const [x0, z0, back] of [[6.4, 1.05, 1.05], [6.4, 2.55, 2.93]]) { bx(x0, 0.42, z0, x0 + 0.4, 0.46, z0 + 0.4, WOOD, PLAIN, { skipBottom: false }); bx(x0, 0.46, back - 0.02, x0 + 0.4, 0.9, back + 0.02, WOOD); for (const [dx, dz] of [[0.02, 0.02], [0.34, 0.02], [0.02, 0.34], [0.34, 0.34]]) bx(x0 + dx, 0, z0 + dz, x0 + dx + 0.04, 0.42, z0 + dz + 0.04, DARK); }

  // ---- the living room: the rocking chair by the west window, a radio, the sofa, Måns' basket
  // the rocking chair: runners, seat, a tall back with spindles, a knitted cushion
  for (const zz of [4.08, 4.92]) { tube([0.85, 0.06, zz], [1.4, 0.0, zz], 0.025, DARK); tube([1.4, 0.0, zz], [1.95, 0.06, zz], 0.025, DARK); tube([1.15, 0.0, zz], [1.15, 0.42, zz], 0.025, DARK); tube([1.7, 0.0, zz], [1.7, 0.42, zz], 0.025, DARK); }
  bx(1.05, 0.42, 4.05, 1.8, 0.48, 4.95, DARK, PLAIN, { skipBottom: false });
  bx(1.06, 0.48, 4.1, 1.75, 0.53, 4.9, 0x5f7a4a, FABRIC);
  for (const zz of [4.08, 4.92]) tube([1.05, 0.48, zz], [0.92, 1.25, zz], 0.025, DARK);
  tube([0.92, 1.25, 4.08], [0.92, 1.25, 4.92], 0.03, DARK);
  for (let i = 1; i < 5; i++) tube([1.05 - 0.0, 0.5, 4.08 + i * 0.168], [0.93, 1.22, 4.08 + i * 0.168], 0.012, DARK);
  // the side table with an old radio and a framed photo
  bx(0.15, 0, 2.9, 0.65, 0.68, 3.5, WOOD, PLAIN);
  bx(0.2, 0.68, 2.95, 0.6, 0.93, 3.45, 0x8a5a2a); bx(0.6, 0.72, 3.0, 0.605, 0.89, 3.25, 0xe8d8b0, FABRIC); cyl(0.61, 3.35, 0.78, 0.8, 0.03, 0xd9b23a, CHROME);
  bx(0.25, 0.93, 3.05, 0.45, 1.1, 3.08, 0xd9b23a, CHROME);
  // the sofa under the south window, with crocheted cushions
  bx(3.6, 0.08, 6.25, 5.6, 0.42, 7.0, 0x8a5a4a, FABRIC, { skipBottom: false });
  bx(3.6, 0.08, 6.75, 5.6, 0.85, 7.0, 0x8a5a4a, FABRIC);
  bx(3.6, 0.08, 6.25, 3.8, 0.62, 7.0, 0x8a5a4a, FABRIC); bx(5.4, 0.08, 6.25, 5.6, 0.62, 7.0, 0x8a5a4a, FABRIC);
  for (const [x, c] of [[4.1, 0xe2c25a], [5.1, 0x5f7a4a]]) bx(x - 0.18, 0.42, 6.55, x + 0.18, 0.75, 6.72, c, FABRIC);
  // the sewing basket, with green fabric and a pincushion
  cyl(0.45, 5.85, 0, 0.33, 0.24, 0xb98a4a, FABRIC, 0.26);
  bx(0.3, 0.33, 5.72, 0.62, 0.36, 5.98, 0x3f8a5a, FABRIC); B.ico(X + 0.55, Y + 0.38, Z + 5.75, 0.05, 0.8, 0xd8343c);
  // Måns' basket – with Måns, a big ginger cat, curled up asleep
  cyl(2.8, 6.5, 0, 0.26, 0.38, 0xa8743e, FABRIC, 0.4);
  cyl(2.8, 6.5, 0.12, 0.2, 0.33, 0xc0483c, FABRIC);
  B.ico(X + 2.8, Y + 0.3, Z + 6.5, 0.24, 0.55, 0xe08a3a, FABRIC);                 // the body, curled
  B.ico(X + 2.62, Y + 0.33, Z + 6.36, 0.1, 0.85, 0xe08a3a, FABRIC);               // the head
  for (const s of [-1, 1]) B.ico(X + 2.62 + s * 0.06, Y + 0.42, Z + 6.33, 0.03, 1.2, 0xc8702a, FABRIC); // ears
  tube([2.95, 0.3, 6.62], [2.62, 0.28, 6.72], 0.035, 0xc8702a, FABRIC);          // the tail round him
  for (const s of [-1, 1]) bx(2.5 + s * 0.035, 0.34, 6.27, 2.52 + s * 0.035, 0.345, 6.29, 0x2a2b2f); // eyes, shut
  // a pendulum clock on the east wall, photos over the radio
  bx(7.82, 1.2, 5.4, 7.99, 2.1, 5.8, DARK, PLAIN);
  cyl(7.9, 5.6, 1.85, 1.86, 0.15, WHITE);
  B.hcyl(X + 7.81, Y + 1.85, Z + 5.6, 0.02, 0.15, 'x', 16, 0xf4f1ec);
  bx(7.8, 1.84, 5.59, 7.805, 1.95, 5.61, 0x1d1f22); bx(7.8, 1.84, 5.6, 7.805, 1.86, 5.68, 0x1d1f22);
  bx(7.8, 1.3, 5.58, 7.81, 1.5, 5.62, 0xd9b23a, CHROME);
  for (const [z, c] of [[2.95, 0x5f6e7a], [3.35, 0x7a6a5a], [3.75, 0x6a7a6a]]) { bx(0.01, 1.35, z - 0.14, 0.03, 1.65, z + 0.14, 0xd9b23a, CHROME); bx(0.03, 1.38, z - 0.11, 0.035, 1.62, z + 0.11, c); }
  // a ceiling lamp over the table
  cyl(6.6, 1.95, 2.0, IH - 0.01, 0.01, 0x2a2b2f); cyl(6.6, 1.95, 1.75, 2.0, 0.22, 0xf2e2b8, LIGHT, 0.06);
}
