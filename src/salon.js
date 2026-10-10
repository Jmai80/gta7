// Salong Saxen from the inside (v1.0): Fia's hair salon on Skolgatan, on the ground floor of the
// square's brick building. Like the tower, Hörnlivs and the bakery office it is built out at sea
// (INDOOR in config.js) and shown instead of the town while you are in there. Local coordinates:
// x east, z south, y up from the floor; the origin is the room's north-west corner. The street door
// is in the south wall.
//
//   z=0  ┌ shelf ── mirror ── mirror ── products ┐
//        │ SAX     [chair A]  [chair B]           │
//        │ RAKHYVEL                         sofa  │
//        │ BLÅ             Fia (stool)      (the  │
//        │ ROSA                             queue)│
//        │ BLOND                                  │
//   z=7  └─door──┴── desk ─── windows ────────────┘
//        x=0                                   x=10
import { INDOOR } from './config.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, FLOORTILE = 31, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.45;
const X = INDOOR.x + 28, Y = INDOOR.y, Z = INDOOR.z + 4;

// the hair colours in Fia's bottles (and what the customers ask for)
export const DYES = {
  bla: { name: 'blått', bottle: 'BLÅ FÄRG', hex: 0x2f6fe0 },
  rosa: { name: 'rosa', bottle: 'ROSA FÄRG', hex: 0xf06aa8 },
  blond: { name: 'blont', bottle: 'BLONDERING', hex: 0xf0d27a },
};

// the tools on the counter along the west wall: stand in front of one and take it
const TOOL_Z = { sax: 1.35, rak: 2.2, bla: 3.05, rosa: 3.9, blond: 4.75 };
export const TOOLS = {
  sax: { label: 'SAX', name: 'saxen', verb: 'KLIPP' },
  rak: { label: 'RAKHYVEL', name: 'rakhyveln', verb: 'RAKA' },
  bla: { label: DYES.bla.bottle, name: 'den blå färgen', verb: 'FÄRGA', dye: 'bla' },
  rosa: { label: DYES.rosa.bottle, name: 'den rosa färgen', verb: 'FÄRGA', dye: 'rosa' },
  blond: { label: DYES.blond.bottle, name: 'blonderingen', verb: 'FÄRGA', dye: 'blond' },
};
for (const [k, t] of Object.entries(TOOLS)) { t.id = k; t.x = X + 0.95; t.z = Z + TOOL_Z[k]; t.item = [X + 0.3, Y + 1.0, Z + TOOL_Z[k]]; }

export const SALON = {
  spawn: { x: X + 1.9, z: Z + 5.6, h: Math.PI },          // a step inside the door, facing the mirrors
  door: { x: X + 1.8, z: Z + 6.6, r: 0.8 },                // stand here and press GÅ UT
  fia: { x: X + 6.5, z: Z + 3.2, y: Y + 0.66, h: -Math.PI / 2 }, // Fia on her stool, watching the chair (her hips on the seat)
  talk: { x: X + 6.5, z: Z + 3.2, r: 1.9 },               // walk up to her and press PRATA
  chair: { x: X + 4.2, z: Z + 1.45, y: Y + 0.55, h: Math.PI }, // the customer's chair (hips on the seat), facing the mirror
  work: { x: X + 4.2, z: Z + 1.45, r: 1.5 },              // close enough to the chair to cut, shave or dye
  stand: { x: X + 4.2, z: Z + 2.55 },                      // where a customer steps up to (and off) the chair
  seats: [3.05, 4.05, 5.05].map((z) => ({ x: X + 9.5, z: Z + z, y: Y + 0.47, h: -Math.PI / 2 })), // the queue on the sofa
  toChair: [[X + 7.8, Z + 2.4], [X + 5.0, Z + 2.4]],     // from the sofa to the chair (north of Fia's stool, south of chair B)
  out: [[X + 2.6, Z + 4.6], [X + 1.8, Z + 6.0], [X + 1.8, Z + 6.85]], // the way out for a finished customer
  room: { x0: X, x1: X + 10, z0: Z, z1: Z + 7 },
  bounds: { x0: X - 0.5, x1: X + 10.5, z0: Z - 0.5, z1: Z + 7.5 },
  y: Y,
};

const WALL = 0xf2e2e2, STRIPE = 0xe8833a;
// walls [x0, z0, x1, z1] (local, full height); the door gap is x 1.2–2.4 in the south wall
export const SALON_WALLS = [
  [-0.2, -0.2, 10.2, 0],
  [-0.2, 0, 0, 7.2],
  [10, 0, 10.2, 7.2],
  [-0.2, 7, 1.2, 7.2],
  [2.4, 7, 10.2, 7.2],
];
// things that block the way [x0, z0, x1, z1, height]
export const SALON_FURN = [
  [0, 0.9, 0.55, 5.2, 0.95],     // the tool counter
  [3.85, 1.1, 4.55, 1.8, 0.95],  // chair A
  [6.65, 1.1, 7.35, 1.8, 0.95],  // chair B
  [3.4, 0, 5.0, 0.32, 0.9],      // the shelf under mirror A
  [6.2, 0, 7.8, 0.32, 0.9],      // the shelf under mirror B
  [8.5, 0, 10, 0.45, 1.9],       // shelves of shampoo
  [9.25, 2.5, 10, 5.6, 0.85],    // the sofa
  [9.3, 1.45, 9.95, 2.3, 0.45],  // a little table with magazines
  [6.3, 3.05, 6.7, 3.45, 0.6],   // Fia's stool
  [3.2, 6.15, 5.0, 6.75, 1.05],  // the desk by the door
  [0, 0, 1.4, 0.55, 0.9],        // the wash basin
  [1.2, 7, 2.4, 7.2, IH],        // the glass door (shut behind you)
];

const SIGNS = {
  saxen: { def: { lines: ['SALONG SAXEN'], bg: '#2b2e35', fg: '#f6d9b8', font: 0.55, border: '#e8833a' }, x: 5.6, y: 2.15, z: 0.012, rot: 0, w: 1.8, h: 0.34 },
  priser: { def: { lines: ['KLIPP 250 · RAKNING 150', 'FÄRG 300 · KAFFE GRATIS'], bg: '#f6ead2', fg: '#7c3c2b', font: 0.38, border: '#e8833a' }, x: 9.988, y: 1.65, z: 6.2, rot: -Math.PI / 2, w: 1.1, h: 0.42 },
};

export function salonLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of SALON_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of SALON_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs[id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = SALON.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function salonInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, 10, c, m, true);

  // a black-and-white chequered floor
  floor(0, 0, 10, 7, 0xe9e6df, FLOORTILE);
  for (let i = 0; i < 10; i++) for (let k = 0; k < 7; k++) if ((i + k) % 2) floor(i, k, i + 1, k + 1, 0x2b2e35, FLOORTILE, 0.005);
  floor(1.2, 7, 2.4, 7.2, 0x6b6f75, PLAIN);
  bx(1.25, 0, 6.35, 2.35, 0.015, 6.95, 0x3c3f45, FABRIC); // door mat
  for (const [x0, z0, x1, z1] of SALON_WALLS) bx(x0, 0, z0, x1, IH, z1, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(1.2, 2.2, 7, 2.4, IH, 7.2, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(0.001, 1.0, 5.25, 0.02, 1.08, 6.98, STRIPE, ITRIM);          // an orange stripe round the room
  bx(9.98, 1.0, 0.46, 9.999, 1.08, 6.98, STRIPE, ITRIM);
  bx(2.4, 1.0, 6.98, 9.98, 1.08, 6.999, STRIPE, ITRIM);
  // the glass door and the shop window toward Skolgatan
  bx(1.2, 0, 7.04, 2.4, 2.2, 7.16, 0x9fb7c4, IGLASS);
  bx(1.2, 0, 7.0, 1.27, 2.2, 7.2, 0x2a2e34, ITRIM); bx(2.33, 0, 7.0, 2.4, 2.2, 7.2, 0x2a2e34, ITRIM);
  bx(1.25, 0.95, 6.98, 1.4, 1.0, 7.0, 0xc9ccd0, CHROME);
  for (const [a, b] of [[5.4, 7.4], [7.9, 9.7]]) {
    bx(a, 0.75, 6.985, b, 2.1, 6.995, 0x9fb7c4, IGLASS);
    bx(a - 0.06, 0.7, 6.97, b + 0.06, 0.75, 6.995, 0xf1eee7, ITRIM);
    bx(a - 0.06, 2.1, 6.97, b + 0.06, 2.15, 6.995, 0xf1eee7, ITRIM);
  }

  // ---- the tool counter along the west wall: scissors, razor, three bottles of dye
  bx(0, 0, 0.9, 0.55, 0.9, 5.2, 0xf1eee7, ITRIM);
  bx(-0.01, 0.9, 0.86, 0.6, 0.95, 5.24, 0x2b2e35, PLAIN, { skipBottom: false });
  const label = (z, c) => bx(0.551, 0.62, z - 0.22, 0.565, 0.76, z + 0.22, c, PLAIN); // a coloured tag on the front of the counter
  // the scissors: two blades crossed, orange handles
  {
    const z = TOOL_Z.sax;
    B.rbox(X + 0.27, Y + 0.96, Z + z - 0.05, 0.035, 0.012, 0.3, 0.5, 0xc9ccd0, CHROME);
    B.rbox(X + 0.27, Y + 0.97, Z + z - 0.05, 0.035, 0.012, 0.3, -0.5, 0xc9ccd0, CHROME);
    for (const dz of [0.1, 0.16]) bx(0.22, 0.95, z + dz - 0.03, 0.32, 0.99, z + dz + 0.03, 0xe8833a);
    label(z, 0xc9ccd0);
  }
  // the razor and a shaving brush
  {
    const z = TOOL_Z.rak;
    bx(0.18, 0.95, z - 0.12, 0.26, 0.99, z + 0.12, 0x2b2e35);
    bx(0.17, 0.95, z + 0.12, 0.27, 0.985, z + 0.18, 0xd8dde2, CHROME);
    cyl(0.4, z, 0.95, 1.06, 0.03, 0x7a4a26);
    cyl(0.4, z, 1.06, 1.13, 0.045, 0xf2efe6, FABRIC, 0.03);
    label(z, 0x2b2e35);
  }
  // the dye: a big bottle each, the colour on the label
  for (const id of ['bla', 'rosa', 'blond']) {
    const z = TOOL_Z[id], c = DYES[id].hex;
    cyl(0.28, z, 0.95, 1.22, 0.075, 0xf2efe6);
    cyl(0.28, z, 1.04, 1.16, 0.078, c);
    cyl(0.28, z, 1.22, 1.3, 0.03, c);
    label(z, c);
  }
  // hair dryers and combs on the wall above the counter
  bx(0.02, 1.3, 1.1, 0.06, 1.34, 4.9, 0x9aa0a6, CHROME);
  for (const z of [1.6, 2.6, 3.6, 4.5]) { bx(0.06, 1.12, z - 0.07, 0.2, 1.3, z + 0.07, 0x2b2e35); cyl(0.2, z, 1.17, 1.25, 0.05, 0x3a3c41); }

  // ---- mirrors and the two chairs (A is where the customer sits)
  for (const mx of [4.2, 7.0]) {
    bx(mx - 0.62, 0.95, 0.005, mx + 0.62, 2.0, 0.03, 0xf1eee7, ITRIM);
    bx(mx - 0.55, 1.02, 0.03, mx + 0.55, 1.93, 0.04, 0xcfe0ea, IGLASS);
    bx(mx - 0.8, 0, 0, mx + 0.8, 0.85, 0.32, 0x2b2e35, ITRIM);
    bx(mx - 0.82, 0.85, 0, mx + 0.82, 0.9, 0.34, 0xf1eee7, PLAIN, { skipBottom: false });
    for (let k = 0; k < 4; k++) cyl(mx - 0.6 + k * 0.4, 0.17, 0.9, 1.05 + (k % 2) * 0.06, 0.035, [0xe8833a, 0x2f6fe0, 0xf06aa8, 0x46c96f][k]);
    // the chair: a chrome foot, a black leather seat, the back toward the room, armrests
    cyl(mx, 1.45, 0, 0.06, 0.32, 0x9aa0a6, CHROME);
    cyl(mx, 1.45, 0.06, 0.4, 0.06, 0x9aa0a6, CHROME);
    bx(mx - 0.3, 0.4, 1.15, mx + 0.3, 0.55, 1.75, 0x1d1f22, FABRIC, { skipBottom: false });
    bx(mx - 0.3, 0.55, 1.68, mx + 0.3, 1.25, 1.8, 0x1d1f22, FABRIC);
    bx(mx - 0.22, 1.25, 1.7, mx + 0.22, 1.42, 1.78, 0x1d1f22, FABRIC);
    for (const sx of [-1, 1]) bx(mx + sx * 0.3 - 0.04, 0.55, 1.2, mx + sx * 0.3 + 0.04, 0.72, 1.72, 0x9aa0a6, CHROME);
    bx(mx - 0.15, 0.12, 0.95, mx + 0.15, 0.16, 1.15, 0x9aa0a6, CHROME);   // footrest
  }
  // the wash basin in the corner
  bx(0, 0, 0, 1.4, 0.85, 0.55, 0xf1eee7, ITRIM);
  bx(0.25, 0.85, 0.08, 1.15, 0.92, 0.5, 0xd8dde2, CHROME, { skipBottom: false });
  bx(0.65, 0.92, 0.05, 0.75, 1.15, 0.12, 0xc9ccd0, CHROME);

  // ---- the shelves of shampoo, the sofa where the customers wait, a table with magazines
  bx(8.5, 0, 0, 10, 1.9, 0.45, 0xf1eee7, ITRIM);
  for (const y of [0.5, 1.0, 1.5]) for (let x = 8.6; x < 9.9; x += 0.16) cyl(x, 0.24, y, y + 0.22 + ((x * 7) % 3) * 0.03, 0.05, [0xe8833a, 0x2f6fe0, 0xf06aa8, 0x46c96f, 0xf2efe6][Math.floor(x * 6.1) % 5]);
  const SOFA = 0x8a4b6a, CUSH = 0x9d5a7c;
  bx(9.3, 0.08, 2.5, 10, 0.42, 5.6, SOFA, FABRIC, { skipBottom: false });
  bx(9.3, 0.42, 2.6, 9.85, 0.52, 5.5, CUSH, FABRIC);
  bx(9.75, 0.08, 2.5, 10, 0.9, 5.6, SOFA, FABRIC);
  bx(9.3, 0.08, 2.5, 10, 0.62, 2.62, SOFA, FABRIC);
  bx(9.3, 0.08, 5.48, 10, 0.62, 5.6, SOFA, FABRIC);
  bx(9.3, 0.4, 1.45, 9.95, 0.45, 2.3, 0xc49a6c, PLAIN, { skipBottom: false });
  for (const [x, z] of [[9.34, 1.5], [9.87, 1.5], [9.34, 2.22], [9.87, 2.22]]) bx(x, 0, z, x + 0.04, 0.4, z + 0.04, 0x8a6a48);
  for (const [z, c] of [[1.55, 0xf06aa8], [1.8, 0xf2efe6], [2.0, 0x2f6fe0]]) bx(9.4, 0.45, z, 9.85, 0.47, z + 0.22, c);
  // Fia's stool and a little trolley
  cyl(6.5, 3.25, 0, 0.04, 0.24, 0x9aa0a6, CHROME);
  cyl(6.5, 3.25, 0.04, 0.58, 0.035, 0x9aa0a6, CHROME);
  cyl(6.5, 3.25, 0.58, 0.64, 0.2, 0x1d1f22, FABRIC);
  // the desk by the door: a till, a vase of flowers, the appointment book
  bx(3.2, 0, 6.15, 5.0, 1.0, 6.75, 0xe8833a, ITRIM);
  bx(3.15, 1.0, 6.1, 5.05, 1.05, 6.8, 0xf1eee7, PLAIN, { skipBottom: false });
  bx(3.4, 1.05, 6.3, 3.85, 1.2, 6.6, 0x2a2b2f);
  bx(4.1, 1.05, 6.3, 4.5, 1.08, 6.6, 0x7a2f2a);
  cyl(4.75, 6.45, 1.05, 1.28, 0.06, 0xbfd8e2, IGLASS);
  for (const [dx, dz, c] of [[-0.05, 0, 0xf06aa8], [0.05, 0.04, 0xe5b923], [0, -0.05, 0xf2efe6]]) B.box(X + 4.75 + dx - 0.04, Y + 1.28, Z + 6.45 + dz - 0.04, X + 4.75 + dx + 0.04, Y + 1.36, Z + 6.45 + dz + 0.04, c, PLAIN);
  // a plant and a coat stand
  cyl(9.4, 6.4, 0, 0.42, 0.22, 0x7a4a26, PLAIN, 0.18);
  cyl(9.4, 6.4, 0.42, 1.2, 0.34, 0x3f7a3a, FABRIC, 0.12);
  cyl(2.9, 6.5, 0, 1.75, 0.025, 0x2a2b2f);
  bx(2.75, 1.4, 6.35, 3.05, 1.7, 6.65, 0x3a5f8a, FABRIC);
  // lights in the ceiling over the chairs (just bright plates)
  for (const mx of [4.2, 7.0]) bx(mx - 0.4, 2.4, 1.1, mx + 0.4, 2.42, 1.9, 0xfff1c9, LIGHT);
}
