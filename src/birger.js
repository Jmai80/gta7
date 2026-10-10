// Birger's house from the inside (v1.2): tant Gun's neighbour on Storgatan, the red villa east of
// hers. Birger has been away on a cruise since May – and Jonte the bike thief has been living in his
// house with the bikes he stole. Like the other insides it is built out at sea (INDOOR in config.js)
// and shown instead of the town while you are in there. Local coordinates: x east, z south, y up from
// the floor; the origin is the house's north-west corner. The front door is in the south wall.
//
//   z=0    ┌ bed ─── wardrobe ── bike ──┬─ bathtub (saddles) ─┐
//          │ bedroom                    │ bathroom    toilet  │
//   z=3.6  ├──door──────── shelf ───────┴──door──────────────┤
//          │ sofa      (bike pile)       │ bike     counter   │
//          │ living room                 ⌐ kitchen     table   │
//          │ bike  bike                  │            fridge  │
//   z=9    └────────────────door─────────┴────────────────────┘
//          x=0                          x=6.6                x=11
import { INDOOR } from './config.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, PARQUET = 30, FLOORTILE = 31, TV = 32, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.45;
const X = INDOOR.x, Y = INDOOR.y, Z = INDOOR.z - 24;
void TV;

export const HOUSE = {
  spawn: { x: X + 5.5, z: Z + 8.2, h: Math.PI },        // a step inside the front door, facing into the house
  door: { x: X + 5.5, z: Z + 8.6, r: 0.8 },             // stand here and press GÅ UT
  room: { x0: X, x1: X + 11, z0: Z, z1: Z + 9 },
  bounds: { x0: X - 0.5, x1: X + 11.5, z0: Z - 0.5, z1: Z + 9.5 },
  rooms: {
    bedroom: { x0: X, x1: X + 7.4, z0: Z, z1: Z + 3.6 },
    bath: { x0: X + 7.55, x1: X + 11, z0: Z, z1: Z + 3.6 },
    living: { x0: X, x1: X + 6.6, z0: Z + 3.75, z1: Z + 9 },
    kitchen: { x0: X + 6.75, x1: X + 11, z0: Z + 3.75, z1: Z + 9 },
  },
  y: Y,
};

// the places to search: stand here (x, z) and press LETA; item: where the arrow hangs.
// find: what is really there (the two things Pia needs); the rest is Birger's (and Jonte's) life
export const SPOTS = [
  { id: 'soffa', at: [1.45, 5.5], item: [0.45, 1.25, 5.5], find: 'bok', text: 'Under soffkudden ligger en anteckningsbok: ”JONTES CYKLAR”. Elva cyklar, med datum och adresser. Och längst ner: ”Lördag: Ronny hämtar resten med skåpbilen.”' },
  { id: 'hylla', at: [4.7, 4.75], item: [4.7, 2.25, 3.95], text: 'Birgers frimärksalbum och en guidebok: ”Kanarieöarna på sju dagar”. Han har varit borta i fem månader.' },
  { id: 'kyl', at: [9.75, 8.35], item: [10.7, 2.15, 8.35], text: 'Kylskåpet: energidryck, en halv pizza från Sjuan och tre påsar fabriksbullar. Jonte har bott här ett tag.' },
  { id: 'bord', at: [8.2, 6.0], item: [8.2, 1.15, 6.9], text: 'På köksbordet: en cykelpump, ett lappat innerdäck och en lapp: ”Birger – tack för lånet! /J”. Han har inte ens frågat.' },
  { id: 'sang', at: [2.45, 1.4], item: [1.0, 1.35, 1.3], text: 'I Birgers säng ligger en cykel – och under täcket en nalle som heter Cykel-Kalle. Jonte sover tydligen här.' },
  { id: 'garderob', at: [4.9, 1.2], item: [4.9, 2.35, 0.3], text: 'Garderoben är full av mörkröda luvtröjor. Exakt likadana, allihop.' },
  { id: 'badkar', at: [10.05, 1.65], item: [10.05, 1.1, 0.55], find: 'sadel', text: 'Badkaret är fullt av cykelsadlar! Överst ligger en orange med blommor på – det måste vara Veras.' },
];
for (const s of SPOTS) { s.x = X + s.at[0]; s.z = Z + s.at[1]; s.r = 0.85; s.item = [X + s.item[0], Y + s.item[1], Z + s.item[2]]; }
export const BIKES_INSIDE = 8; // (and three in Ronny's van: eleven)

const WALL = 0xeee3cf, BATHW = 0xdfe9ea, KITCHW = 0xf0e7d0;
// walls [x0, z0, x1, z1, colour] (local, full height): the front door gap is x 4.9–6.1 in the south wall
export const HOUSE_WALLS = [
  [-0.2, -0.2, 11.2, 0, WALL],
  [-0.2, 0, 0, 9.2, WALL],
  [11, 0, 11.2, 9.2, WALL],
  [-0.2, 9, 4.9, 9.2, WALL],
  [6.1, 9, 11.2, 9.2, WALL],
  [0, 3.6, 2.2, 3.75, WALL],        // between the bedroom and the living room (door at x 2.2–3.2)
  [3.2, 3.6, 8.3, 3.75, WALL],      // … and the bathroom door at x 8.3–9.2
  [9.2, 3.6, 11, 3.75, BATHW],
  [7.4, 0, 7.55, 3.6, BATHW],       // bedroom | bathroom
  [6.6, 3.75, 6.75, 4.6, KITCHW],   // living room | kitchen, open between z 4.6 and 6.0
  [6.6, 6.0, 6.75, 9, KITCHW],
];
// things that block the way [x0, z0, x1, z1, height]
export const HOUSE_FURN = [
  [0, 4.4, 0.9, 6.6, 0.9],          // the sofa against the west wall
  [3.8, 3.75, 5.6, 4.15, 1.9],      // the bookshelf
  [2.2, 5.3, 4.2, 7.6, 1.1],        // the pile of bikes in the middle of the living room
  [0.25, 8.3, 4.35, 8.9, 1.05],     // two bikes along the south wall
  [7.6, 3.75, 9.4, 4.4, 1.05],      // a bike against the kitchen wall
  [10.4, 3.75, 11, 7.8, 0.92],      // the kitchen counter
  [10.35, 7.9, 11, 8.8, 1.95],      // the fridge
  [7.6, 6.4, 8.8, 7.4, 0.76],       // the kitchen table
  [0.15, 0.15, 1.85, 2.45, 0.9],    // Birger's bed (with a bike in it)
  [4.2, 0, 5.6, 0.6, 2.1],          // the wardrobe
  [5.7, 0.1, 7.35, 0.75, 1.05],     // a bike against the bedroom wall
  [9.2, 0.1, 10.95, 0.95, 0.6],     // the bathtub
  [7.6, 1.6, 8.1, 2.3, 0.9],        // the sink
  [10.4, 2.4, 10.95, 3.0, 0.45],    // the toilet
  [4.9, 9, 6.1, 9.2, IH],           // the front door (shut behind you)
];

const SIGNS = {
  kanarie: { def: { lines: ['GRAN CANARIA', 'SOL · BAD · BINGO'], bg: '#2f8fc8', fg: '#fff3c4', font: 0.42, border: '#f2c94c' }, x: 6.585, y: 1.55, z: 7.6, rot: -Math.PI / 2, w: 0.8, h: 0.55 },
};

export function birgerLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of HOUSE_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of HOUSE_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs[id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = HOUSE.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

// a bike standing (leaning a little, roll), or lying on its side (roll ≈ 1.45, lifted by y0), made of
// tubes so it can be turned any way: local x right, y up, z forward; rot turns it (forward = sin, cos)
export function bikeProp(B, x, z, rot, frame, roll = 0.1, y0 = 0, opts = {}) {
  const cr = Math.cos(roll), sr = Math.sin(roll), cy = Math.cos(rot), sy = Math.sin(rot);
  const T = ([px, py, pz]) => {
    const rx = px * cr - py * sr, ry = px * sr + py * cr;
    return [X + x + rx * cy + pz * sy, Y + y0 + ry, Z + z - rx * sy + pz * cy];
  };
  const tube = (a, b, r, c, m = PLAIN) => B.tube(T(a), T(b), r, r, 5, c, m);
  const TYRE = 0x1d1f22, STEEL = 0xb7bcc2;
  const R = 0.33, rear = [0, R, -0.55], front = [0, R, 0.55];
  for (const w of [rear, front]) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      tube([0, w[1] + R * Math.cos(a0), w[2] + R * Math.sin(a0)], [0, w[1] + R * Math.cos(a1), w[2] + R * Math.sin(a1)], 0.024, TYRE);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI;
      tube([0, w[1] + R * 0.9 * Math.cos(a), w[2] + R * 0.9 * Math.sin(a)], [0, w[1] - R * 0.9 * Math.cos(a), w[2] - R * 0.9 * Math.sin(a)], 0.005, STEEL, CHROME);
    }
  }
  const BB = [0, 0.3, -0.05], S = [0, 0.8, -0.28], H = [0, 0.86, 0.42], Hl = [0, 0.66, 0.47];
  tube(BB, S, 0.022, frame); tube(BB, Hl, 0.026, frame); tube(H, Hl, 0.028, frame);
  if (!opts.lady) tube(S, H, 0.022, frame); else tube([0, 0.5, -0.12], [0, 0.72, 0.45], 0.022, frame);
  for (const sx of [-0.06, 0.06]) { tube([sx, R, -0.55], [sx * 0.5, BB[1], BB[2]], 0.013, frame); tube([sx, R, -0.55], [sx * 0.5, S[1] - 0.02, S[2]], 0.012, frame); tube([sx, 0.66, 0.47], [sx, R, 0.55], 0.013, frame); }
  tube(S, [0, 0.9, -0.3], 0.013, STEEL, CHROME);
  if (!opts.noSaddle) tube([0, 0.93, -0.42], [0, 0.93, -0.16], 0.05, opts.saddle ?? 0x2a1f18);
  tube(H, [0, 0.98, 0.4], 0.014, STEEL, CHROME);
  tube([-0.27, 0.98, 0.36], [0.27, 0.98, 0.36], 0.014, STEEL, CHROME);
  for (const sx of [-1, 1]) tube([sx * 0.27, 0.98, 0.36], [sx * 0.35, 0.98, 0.33], 0.02, 0x1d1f22);
  if (opts.basket) { // a wire basket over the front wheel
    const b0 = [-0.17, 0.7, 0.52], b1 = [0.17, 0.95, 0.85];
    for (const yy of [b0[1], b1[1]]) {
      tube([b0[0], yy, b0[2]], [b1[0], yy, b0[2]], 0.008, STEEL, CHROME); tube([b0[0], yy, b1[2]], [b1[0], yy, b1[2]], 0.008, STEEL, CHROME);
      tube([b0[0], yy, b0[2]], [b0[0], yy, b1[2]], 0.008, STEEL, CHROME); tube([b1[0], yy, b0[2]], [b1[0], yy, b1[2]], 0.008, STEEL, CHROME);
    }
    for (const [bx, bz] of [[b0[0], b0[2]], [b1[0], b0[2]], [b0[0], b1[2]], [b1[0], b1[2]]]) tube([bx, b0[1], bz], [bx, b1[1], bz], 0.008, STEEL, CHROME);
  }
}

export function birgerInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, 10, c, m, true);
  const WHITE = 0xf1eee7;

  // floors: parquet in the living room and the bedroom, tiles in the kitchen and the bathroom, a rag rug
  floor(0, 3.6, 6.6, 9, 0xb08457, PARQUET);
  floor(0, 0, 7.4, 3.6, 0xa67b52, PARQUET);
  floor(6.6, 3.75, 11, 9, 0xd8cfbc, FLOORTILE);
  floor(7.4, 0, 11, 3.6, 0xc9d8da, FLOORTILE);
  floor(4.9, 9, 6.1, 9.2, 0x6b6f75, PLAIN);
  for (let i = 0; i < 6; i++) bx(1.2, 0, 4.5 + i * 0.32, 2.0, 0.012, 4.5 + i * 0.32 + 0.3, [0xc0483c, 0x3a6fb5, 0xe2c25a, 0x5a9a4a, 0xc0483c, 0xe8e2d0][i], FABRIC); // a striped rag rug by the sofa
  bx(5.0, 0, 8.25, 6.0, 0.012, 8.85, 0x5a4636, FABRIC); // door mat

  for (const [x0, z0, x1, z1, c] of HOUSE_WALLS) bx(x0, 0, z0, x1, IH, z1, c, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(4.9, 2.2, 9, 6.1, IH, 9.2, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });          // over the front door
  // the front door (shut), the inner door frames
  bx(4.9, 0, 9.04, 6.1, 2.2, 9.16, 0x2c4a6e, ITRIM);
  bx(5.85, 0.95, 8.98, 6.0, 1.0, 9.04, 0xc9ccd0, CHROME);
  for (const [a, b] of [[2.2, 3.2], [8.3, 9.2]]) for (const zz of [3.57, 3.75]) { bx(a - 0.06, 0, zz, a, 2.18, zz + 0.03, WHITE, ITRIM); bx(b, 0, zz, b + 0.06, 2.18, zz + 0.03, WHITE, ITRIM); bx(a - 0.06, 2.1, zz, b + 0.06, 2.18, zz + 0.03, WHITE, ITRIM); }
  // windows: the street side (south), the garden (north), the gable ends
  const win = (x, z, nx, nz, w) => {
    if (nz) {
      const s = nz > 0 ? 1 : -1, z0 = z + s * 0.004;
      bx(x - w / 2 - 0.06, 0.82, z0, x + w / 2 + 0.06, 2.0, z0 + s * 0.01, WHITE, ITRIM);
      bx(x - w / 2, 0.88, z0 + s * 0.01, x + w / 2, 1.94, z0 + s * 0.014, 0x9db4c7, IGLASS);
      bx(x - 0.025, 0.88, z0 + s * 0.014, x + 0.025, 1.94, z0 + s * 0.018, WHITE, ITRIM);
      bx(x - w / 2 - 0.08, 0.8, z, x + w / 2 + 0.08, 0.84, z + s * 0.16, WHITE, ITRIM);
    } else {
      const s = nx > 0 ? 1 : -1, x0 = x + s * 0.004;
      bx(x0, 0.82, z - w / 2 - 0.06, x0 + s * 0.01, 2.0, z + w / 2 + 0.06, WHITE, ITRIM);
      bx(x0 + s * 0.01, 0.88, z - w / 2, x0 + s * 0.014, 1.94, z + w / 2, 0x9db4c7, IGLASS);
      bx(x0 + s * 0.014, 0.88, z - 0.025, x0 + s * 0.018, 1.94, z + 0.025, WHITE, ITRIM);
    }
  };
  win(2.0, 9, 0, -1, 1.2); win(8.8, 9, 0, -1, 1.2);
  win(1.0 + 1.6, 0, 0, 1, 1.0); win(6.4, 0, 0, 1, 0.9); win(8.4, 0, 0, 1, 0.7);
  win(0, 6.4, 1, 0, 1.1); win(11, 6.0, -1, 0, 1.0); win(11, 1.6, -1, 0, 0.6);

  // ---- the living room: an old flowery sofa, a bookshelf, Birger's pelargoniums on the sill – and bikes
  const SOFA = 0x6f8a5a, FLOWER = 0xd98aa0;
  bx(0, 0.08, 4.4, 0.9, 0.42, 6.6, SOFA, FABRIC, { skipBottom: false });
  bx(0, 0.08, 4.4, 0.25, 0.92, 6.6, SOFA, FABRIC);
  bx(0, 0.08, 4.4, 0.9, 0.66, 4.6, SOFA, FABRIC); bx(0, 0.08, 6.4, 0.9, 0.66, 6.6, SOFA, FABRIC);
  bx(0.25, 0.42, 4.62, 0.88, 0.54, 5.48, 0x7d9a66, FABRIC); bx(0.25, 0.42, 5.52, 0.88, 0.54, 6.38, 0x7d9a66, FABRIC);
  for (const [z, c] of [[4.9, FLOWER], [5.95, 0xe8d36a]]) bx(0.27, 0.54, z - 0.2, 0.45, 0.86, z + 0.2, c, FABRIC); // cushions
  bx(0.35, 0.54, 5.25, 0.55, 0.57, 5.6, 0x2a2b2f); // the notebook, half under a cushion
  // the bookshelf: books in every colour and a model ship
  bx(3.8, 0, 3.75, 5.6, 1.9, 4.15, 0x7a5a3c, PLAIN);
  for (const yy of [0.05, 0.5, 0.95, 1.4]) {
    bx(3.82, yy, 3.77, 5.58, yy + 0.03, 4.14, 0x8a6a48);
    for (let k = 0, x = 3.88; x < 5.5; k++) { const w = 0.05 + ((k * 37) % 5) * 0.012; bx(x, yy + 0.03, 3.8, x + w, yy + 0.3 + ((k * 13) % 4) * 0.03, 4.1, [0xa33a2e, 0x2f5f8a, 0xe2c25a, 0x3d7a4a, 0xf1eee7, 0x5a3a6a][k % 6]); x += w + 0.01; }
  }
  bx(4.2, 1.9, 3.85, 5.2, 1.94, 4.05, 0x5a3a26); cyl(4.7, 3.95, 1.94, 2.3, 0.02, 0x8a6a48); bx(4.35, 2.0, 3.92, 5.05, 2.12, 3.98, 0xf1eee7, FABRIC); // a ship in full sail
  // the pelargoniums on the window sill (Gun has been watering them)
  for (const x of [1.6, 2.0, 2.4]) { cyl(x, 8.95, 0.84, 1.0, 0.08, 0xb5603a, PLAIN, 0.06); B.ico(X + x, Y + 1.1, Z + 8.95, 0.12, 0.9, 0x3d7a3a); B.ico(X + x + 0.03, Y + 1.2, Z + 8.93, 0.06, 1, 0xd8343c); }
  // a floor lamp and an armchair-less corner: Birger's slippers by the sofa
  cyl(0.5, 7.4, 0, 1.5, 0.02, 0x2a2b2f); cyl(0.5, 7.4, 1.5, 1.75, 0.22, 0xf2e2b8, LIGHT, 0.14); cyl(0.5, 7.4, 0, 0.03, 0.16, 0x2a2b2f);
  bx(1.0, 0, 6.75, 1.28, 0.07, 6.87, 0x7a2f2a, FABRIC); bx(1.0, 0, 6.92, 1.28, 0.07, 7.04, 0x7a2f2a, FABRIC);
  // the bikes: a pile in the middle, two along the wall under the window
  bikeProp(B, 3.2, 5.95, Math.PI / 2 + 0.25, 0x2f6fb5, 0.18);
  bikeProp(B, 3.1, 6.95, Math.PI / 2 - 0.2, 0xe5e2da, -0.16, 0, { lady: true, basket: true });
  bikeProp(B, 3.3, 6.45, Math.PI / 2 + 0.05, 0x3d7a4a, 1.42, 0.62);
  bikeProp(B, 1.25, 8.6, Math.PI / 2, 0x6a3a7a, 0.12, 0, { lady: true });
  bikeProp(B, 3.35, 8.6, -Math.PI / 2, 0xc98a2a, -0.12);

  // ---- the kitchen: a counter with the sink and the stove, the fridge, a table with two chairs, a bike
  bx(10.42, 0, 3.75, 11, 0.86, 7.8, 0xd8cfb4, ITRIM);
  bx(10.36, 0.86, 3.75, 11, 0.92, 7.8, 0x5a4636, PLAIN, { skipBottom: false });
  bx(10.48, 0.921, 4.6, 10.9, 0.926, 5.2, 0x6f757c, CHROME);
  bx(10.84, 0.92, 4.87, 10.9, 1.2, 4.93, 0xb9bec4, CHROME);
  bx(10.45, 0.921, 6.4, 10.95, 0.93, 7.1, 0x141518);
  for (const [x, z] of [[10.58, 6.57], [10.82, 6.57], [10.58, 6.93], [10.82, 6.93]]) bx(x - 0.08, 0.93, z - 0.08, x + 0.08, 0.934, z + 0.08, 0x3a3c40);
  bx(10.68, 1.45, 3.75, 11, 2.2, 7.8, 0xd8cfb4, ITRIM);
  bx(10.35, 0, 7.9, 11, 1.95, 8.8, 0xf2f2ee, ITRIM);
  bx(10.3, 0.95, 8.65, 10.35, 1.55, 8.7, 0xb9bec4, CHROME);
  for (const [x, z, c] of [[10.6, 4.1, 0xe8833a], [10.75, 4.3, 0x2f6fe0], [10.55, 7.5, 0x46c96f]]) cyl(x, z, 0.92, 1.12, 0.035, c); // energy drinks
  bx(7.6, 0.72, 6.4, 8.8, 0.76, 7.4, 0xc49a6c, PLAIN, { skipBottom: false });
  for (const [x, z] of [[7.65, 6.45], [8.7, 6.45], [7.65, 7.3], [8.7, 7.3]]) bx(x, 0, z, x + 0.05, 0.72, z + 0.05, 0x8a6a48);
  bx(7.8, 0.76, 6.6, 8.3, 0.86, 6.9, 0x2a2b2f); cyl(8.55, 7.05, 0.76, 1.15, 0.03, 0x3a5f8a); // a pump and a box of patches
  bx(7.75, 0.76, 7.0, 8.15, 0.79, 7.3, 0xf2efe6);                                            // the note
  for (const x0 of [7.85, 8.35]) { bx(x0, 0.42, 7.45, x0 + 0.42, 0.46, 7.87, 0x7a5a3c, PLAIN, { skipBottom: false }); bx(x0, 0.46, 7.83, x0 + 0.42, 0.9, 7.87, 0x7a5a3c); for (const [dx, dz] of [[0.02, 0.02], [0.36, 0.02], [0.02, 0.38], [0.36, 0.38]]) bx(x0 + dx, 0, 7.45 + dz, x0 + dx + 0.04, 0.42, 7.49 + dz, 0x5a4230); }
  bikeProp(B, 8.5, 4.08, Math.PI / 2, 0xc4191b, 0.12);
  // pizza boxes from Sjuan on the floor
  for (let i = 0; i < 3; i++) bx(9.5, i * 0.05, 8.2 - i * 0.03, 9.95, i * 0.05 + 0.045, 8.65 - i * 0.03, 0xe9e1cf, PLAIN, { skipBottom: false });

  // ---- the bedroom: Birger's bed (with a bike in it), the wardrobe, a rug, a bike against the wall
  bx(0.15, 0, 0.15, 1.85, 0.42, 2.45, 0x8a6a48, PLAIN, { skipBottom: false });
  bx(0.2, 0.42, 0.2, 1.8, 0.58, 2.4, 0xf2efe6, FABRIC);
  bx(0.15, 0, 0.1, 1.85, 1.0, 0.2, 0x7a5a3c);
  bx(0.3, 0.58, 0.3, 1.0, 0.72, 0.7, 0xf6f2ea, FABRIC);                 // the pillow
  bx(0.2, 0.58, 1.1, 1.8, 0.66, 2.4, 0x5a7ab5, FABRIC);                 // the duvet, kicked down
  B.ico(X + 1.35, Y + 0.72, Z + 0.55, 0.1, 1, 0xa8784a);               // Cykel-Kalle the teddy
  bikeProp(B, 1.0, 1.35, 0.06, 0xe5b923, 1.4, 0.92);                    // a bike in the bed
  bx(4.2, 0, 0, 5.6, 2.1, 0.6, 0x9a7a58, PLAIN);
  bx(4.89, 0.1, 0.6, 4.91, 2.0, 0.61, 0x5a4230);
  for (const x of [4.75, 5.05]) bx(x, 1.0, 0.6, x + 0.03, 1.2, 0.64, 0xc9ccd0, CHROME);
  bx(2.6, 0, 1.0, 4.0, 0.012, 2.4, 0xc8b48a, FABRIC);
  bikeProp(B, 6.5, 0.42, Math.PI / 2, 0x1d1f22, 0.1);
  cyl(6.9, 2.9, 0, 0.55, 0.2, 0x7a5a3c, PLAIN, 0.2);                    // a bedside table with a clock
  bx(6.8, 0.55, 2.85, 7.0, 0.68, 2.95, 0xd8343c);

  // ---- the bathroom: a tub full of saddles, the sink, the toilet
  bx(9.2, 0, 0.1, 10.95, 0.58, 0.95, 0xf4f4f0, ITRIM);
  bx(9.3, 0.45, 0.2, 10.85, 0.57, 0.85, 0xd8e2e4, CHROME);
  const SAD = [0x2a1f18, 0x1d1f22, 0x5a3a26, 0x3a5f8a, 0x2a1f18, 0xc4191b, 0x1d1f22, 0x7a2f2a];
  for (let i = 0; i < 8; i++) { const x = 9.45 + (i % 4) * 0.36, z = 0.38 + Math.floor(i / 4) * 0.3; B.rbox(X + x, Y + 0.58 + (i % 3) * 0.02, Z + z, 0.14, 0.05, 0.26, (i * 0.7) % 3, SAD[i], FABRIC); }
  B.rbox(X + 10.05, Y + 0.66, Z + 0.55, 0.16, 0.06, 0.28, 0.4, 0xe8833a, FABRIC); // Vera's orange saddle on top
  for (const [dx, dz] of [[-0.04, -0.05], [0.04, 0.03], [0, 0.07]]) B.ico(X + 10.05 + dx, Y + 0.73, Z + 0.55 + dz, 0.025, 1, 0xf6f2ea);
  bx(7.6, 0, 1.6, 8.1, 0.82, 2.3, 0xf4f4f0, ITRIM);
  bx(7.6, 0.82, 1.6, 8.1, 0.9, 2.3, 0xdde5e7, CHROME, { skipBottom: false });
  bx(7.56, 1.2, 1.7, 7.58, 1.9, 2.2, 0xcfe0ea, IGLASS);                // the mirror
  cyl(10.67, 2.7, 0, 0.42, 0.2, 0xf4f4f0, ITRIM, 0.22);
  bx(10.85, 0.42, 2.45, 10.98, 0.9, 2.95, 0xf4f4f0, ITRIM);
}
