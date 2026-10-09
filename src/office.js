// Bullbilen's bakery office (v0.7): the room behind the lit window on the bakery's west wall, with
// the safe where the second half of Arne's recipe has been locked away for thirty years. Like the
// tower and Hörnlivs it is built out at sea (INDOOR in config.js) and shown instead of the town
// while you are in there. Local coordinates: x east, z south, y up from the floor; the origin is
// the room's north-west corner. You come in by the side door (south wall); Bagar-Bengt comes back
// through the door to the bakery hall (north wall).
//
//   z=0  ┌ files ──────────── hall door ──┐
//        │          chair                 │
//        │ diploma  desk (note)           │
//        │                          safe  │
//   z=7  └─door──┴─ sacks ── window ──────┘
//        x=0                             x=9
import { INDOOR } from './config.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, PARQUET = 30, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.45;
const X = INDOOR.x, Y = INDOOR.y, Z = INDOOR.z + 26;

export const OFFICE = {
  spawn: { x: X + 1.6, z: Z + 5.6, h: Math.PI },          // just inside the side door, facing the desk
  door: { x: X + 1.6, z: Z + 6.6, r: 0.8 },               // stand here and press GÅ UT
  hall: { x: X + 7.1, z: Z + 0.5 },                       // the door to the bakery hall: Bengt comes in here
  note: { x: X + 4.3, z: Z + 3.75, r: 0.9, item: [X + 4.75, Y + 0.8, Z + 2.85] },   // a note on the desk
  diploma: { x: X + 0.75, z: Z + 3.5, r: 0.9, item: [X + 0.05, Y + 1.6, Z + 3.5] }, // the framed diploma on the west wall
  safe: { x: X + 7.25, z: Z + 5.2, r: 0.9, item: [X + 7.85, Y + 0.9, Z + 5.2] },    // in front of the safe
  safeDoor: { hinge: [X + 7.9, Z + 5.75], y: Y + 0.08 },  // its door swings out toward you
  recipe: { x: X + 8.4, y: Y + 0.62, z: Z + 5.2 },
  room: { x0: X, x1: X + 9, z0: Z, z1: Z + 7 },
  bounds: { x0: X - 0.5, x1: X + 9.5, z0: Z - 0.5, z1: Z + 7.5 },
  y: Y,
};

const WALL = 0xe8dcc4;
export const OFFICE_WALLS = [
  [-0.2, -0.2, 9.2, 0],
  [-0.2, 0, 0, 7.2],
  [9, 0, 9.2, 7.2],
  [-0.2, 7, 1.0, 7.2],
  [2.2, 7, 9.2, 7.2],
];
export const OFFICE_FURN = [
  [3.2, 2.2, 5.4, 3.2, 0.78],   // the desk
  [3.95, 1.3, 4.65, 1.95, 1.0], // the chair behind it
  [0, 0, 2.6, 0.6, 1.45],       // filing cabinets
  [7.9, 4.6, 9.0, 5.8, 1.3],    // the safe
  [2.6, 6.25, 3.8, 6.95, 0.62], // flour sacks
  [8.3, 0.2, 8.95, 2.2, 1.9],   // a shelf of binders
  [1.0, 7, 2.2, 7.2, IH],       // the side door (shut behind you)
];

const SIGNS = {
  diploma: { def: { lines: ['BULLBILEN AB', 'GRUNDAT 1994'], bg: '#f6ead2', fg: '#8a4b22', font: 0.5, border: '#b08a3c' }, x: 0.012, y: 1.6, z: 3.5, rot: Math.PI / 2, w: 0.82, h: 0.56 },
  kontor: { def: { lines: ['KONTOR'], bg: '#3a3c41', fg: '#f4efe4', font: 0.6 }, x: 7.1, y: 2.2, z: 0.012, rot: 0, w: 0.7, h: 0.18 },
};

export function officeLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of OFFICE_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of OFFICE_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs[id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = OFFICE.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function officeInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);

  floor(0, 0, 9, 7, 0x9a6e4a, PARQUET);
  floor(1.0, 7, 2.2, 7.2, 0x6b6f75, PLAIN);
  bx(2.6, 0, 3.2, 6.2, 0.012, 5.6, 0x7a2f2a, FABRIC);              // a worn rug under the desk
  for (const [x0, z0, x1, z1] of OFFICE_WALLS) bx(x0, 0, z0, x1, IH, z1, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(1.0, 2.2, 7, 2.2, IH, 7.2, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(0.001, 0, 0, 0.02, 0.12, 7, 0x6b4a32, ITRIM);                  // skirting
  bx(0, 0, 0.001, 9, 0.12, 0.02, 0x6b4a32, ITRIM);
  // the side door (inside) and the door to the bakery hall
  bx(1.0, 0, 6.98, 2.2, 2.1, 7.0, 0x5b4636, ITRIM);
  bx(1.9, 0.95, 6.94, 2.05, 1.0, 6.98, 0xc9ccd0, CHROME);
  bx(6.5, 0, 0.0, 7.7, 2.1, 0.03, 0x8a6a48, ITRIM);
  bx(6.6, 0.95, 0.03, 6.75, 1.0, 0.07, 0xc9ccd0, CHROME);
  // a window in the south wall: night outside
  bx(4.2, 0.9, 6.985, 7.0, 2.0, 6.995, 0x1d2a44, IGLASS);
  bx(4.14, 0.86, 6.97, 7.06, 0.9, 6.999, 0xf1eee7, ITRIM);
  bx(4.14, 2.0, 6.97, 7.06, 2.04, 6.999, 0xf1eee7, ITRIM);
  bx(5.58, 0.9, 6.97, 5.62, 2.0, 6.999, 0xf1eee7, ITRIM);

  // ---- the desk: lamp (the light Ingvar sees), papers, a cash box, the note
  bx(3.2, 0.72, 2.2, 5.4, 0.78, 3.2, 0x6b4a32, PLAIN, { skipBottom: false });
  for (const [x, z] of [[3.25, 2.25], [5.3, 2.25], [3.25, 3.1], [5.3, 3.1]]) bx(x, 0, z, x + 0.06, 0.72, z + 0.06, 0x4a3424);
  bx(3.3, 0.0, 2.25, 3.9, 0.7, 3.15, 0x5a3d2a);                       // drawers
  bx(3.45, 0.78, 2.35, 3.6, 0.8, 2.5, 0x2a2b2f);                      // lamp foot
  bx(3.5, 0.8, 2.4, 3.54, 1.15, 2.44, 0x2a2b2f);
  bx(3.38, 1.1, 2.32, 3.72, 1.24, 2.62, 0x2f6b45);                     // green shade
  bx(3.42, 1.08, 2.36, 3.68, 1.1, 2.58, 0xfff1c9, LIGHT);
  bx(4.0, 0.78, 2.4, 4.6, 0.8, 2.85, 0xf2efe6);                       // papers
  bx(4.05, 0.8, 2.45, 4.55, 0.805, 2.8, 0xe8e2d2);
  bx(4.95, 0.78, 2.35, 5.3, 0.9, 2.6, 0x6f757c, CHROME);              // cash box
  bx(4.62, 0.78, 2.72, 4.88, 0.785, 2.98, 0xffe066);                   // the yellow note
  bx(3.7, 0.78, 2.7, 3.85, 0.88, 2.85, 0xf2efe6);                      // a coffee cup
  bx(3.72, 0.88, 2.72, 3.83, 0.885, 2.83, 0x3a2418);
  // the chair
  bx(3.95, 0.42, 1.35, 4.65, 0.5, 1.95, 0x2a2b2f, FABRIC, { skipBottom: false });
  bx(3.95, 0.5, 1.3, 4.65, 1.0, 1.4, 0x2a2b2f, FABRIC);
  bx(4.27, 0, 1.6, 4.33, 0.42, 1.66, 0x6f757c, CHROME);
  // filing cabinets and binders
  for (let i = 0; i < 3; i++) {
    const x0 = 0.05 + i * 0.85;
    bx(x0, 0, 0, x0 + 0.8, 1.45, 0.6, 0x8a9096, ITRIM);
    for (let k = 0; k < 3; k++) bx(x0 + 0.3, 0.3 + k * 0.45, 0.6, x0 + 0.5, 0.34 + k * 0.45, 0.63, 0xc9ccd0, CHROME);
  }
  bx(8.3, 0, 0.2, 8.95, 1.9, 2.2, 0x6b4a32);
  for (const y of [0.45, 1.0, 1.5]) for (let z = 0.25; z < 2.15; z += 0.12) bx(8.32, y, z, 8.6, y + 0.36, z + 0.1, [0xd2342c, 0x2c62a8, 0xe5b923, 0x3a3c41][Math.floor(z * 7) % 4]);
  // the safe: heavy, dark green, with a brass dial (its door is its own mesh, render.js)
  bx(7.9, 0, 4.6, 9.0, 1.3, 5.8, 0x2f4a3c, ITRIM);
  bx(7.88, 0, 4.6, 7.92, 0.08, 5.8, 0x1d1f22);
  bx(8.0, 0.1, 4.7, 8.9, 1.2, 5.7, 0x141a16);                          // inside (dark)
  bx(8.1, 0.58, 4.75, 8.85, 0.6, 5.65, 0x6f757c);                      // a shelf
  for (const z of [4.85, 5.0]) bx(8.2, 0.6, z, 8.5, 0.68, z + 0.12, 0x5f8a4a);  // bundles of notes
  // flour sacks, a coat on a hook, a wall clock, a calendar with buns
  for (const [x, z, y] of [[2.7, 6.3, 0], [3.2, 6.35, 0], [2.95, 6.4, 0.3]]) bx(x, y, z, x + 0.55, y + 0.3, z + 0.5, 0xeee6d2, FABRIC);
  bx(0.02, 1.55, 5.2, 0.12, 1.6, 5.9, 0x5b4636);
  bx(0.04, 0.85, 5.3, 0.24, 1.55, 5.75, 0xf2efe6, FABRIC);           // a baker's coat
  bx(7.0, 2.25, 0.02, 7.2, 2.45, 0.04, 0xf2efe6);
  bx(5.2, 1.3, 0.005, 5.8, 2.0, 0.02, 0xf6ead2);                     // calendar
  bx(5.3, 1.65, 0.02, 5.7, 1.95, 0.025, 0xc8843c);
}

// the safe's door, hinge at the origin, shut along -z (render.js swings it open toward +x… out into the room)
export function safeDoorInto(B) {
  B.box(-0.1, 0, -1.1, 0, 1.14, 0, 0x2f4a3c, ITRIM, { skipBottom: false });
  B.box(-0.14, 0.52, -0.66, -0.1, 0.66, -0.52, 0xc8a24a, CHROME);    // brass dial
  B.box(-0.16, 0.57, -0.61, -0.14, 0.61, -0.57, 0x2a2b2f);
  B.box(-0.13, 0.3, -0.95, -0.1, 0.9, -0.9, 0xc9ccd0, CHROME);       // handle
}

// the second half of the recipe: an old yellowed sheet in a plastic sleeve
export function recipeInto(B) {
  B.box(-0.11, 0, -0.15, 0.11, 0.012, 0.15, 0xf0e2b0, PLAIN, { skipBottom: false });
  B.box(-0.08, 0.012, -0.11, 0.08, 0.014, -0.09, 0x6b4a32);
  for (let i = 0; i < 5; i++) B.box(-0.08, 0.012, -0.06 + i * 0.035, 0.05 - (i % 2) * 0.03, 0.014, -0.05 + i * 0.035, 0x8a7a5a);
}
