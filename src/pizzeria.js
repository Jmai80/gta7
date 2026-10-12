// Pizzeria Sjuan from the inside (v1.13): Sanna's pizzeria in the shop row on Kungsgatan, the green
// awning south of Hörnlivs. Like the other insides it is built out at sea (INDOOR in config.js).
// The street door is in the west wall (the facade faces Kungsgatan). The dining room is in front;
// behind the long counter is the kitchen where you bake in "Fredagsrusningen": the wood-fired oven in
// the north-east corner, the dough bench along the east wall, five topping bins along the south wall,
// the bin, and the pass (the warm shelf in the counter) where Sanna takes the pizzas out to the guests.
// Local coordinates: x east, z south, y up from the floor; the origin is the north-west corner.
//
//   z=0  ┌ menu ─ T1 ── menu ─ T2 ─┬counter┬ BIN  sink ── ┌─ OVEN ─┐┐
//        │                         │       │              └─mouth──┘│
//        │                 Sanna   │ PASS  │  (you)                  │
//      door                (till)  │       │                 DOUGH   │
//        │                         │       │                 BENCH   │
//        │  T3          T4         └───────┘           Pino          │
//        │                          (the way  ┌ skinka svamp ananas räkor kebab ┐
//   z=8  └──────────────────────────in)────────────────────────────────────────┘
//        x=0                       x=5.5  6.2                               x=11
import { INDOOR } from './config.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, FLOORTILE = 31, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.6;
const X = INDOOR.x - 22, Y = INDOOR.y, Z = INDOOR.z + 26;

// outside: the new glass door under the green awning, on the Kungsgatan side of the shop row
export const PIZZA_DOOR = { x: -32.2, z: -22, r: 1.2, fx: -31 };

// the toppings: the bins along the south wall of the kitchen, west to east
export const TOPPINGS = [
  { id: 'skinka', label: 'SKINKA', name: 'skinka', c: 0xe89a9a },
  { id: 'svamp', label: 'CHAMPINJONER', name: 'champinjoner', c: 0xd9cbb0 },
  { id: 'ananas', label: 'ANANAS', name: 'ananas', c: 0xf2d24a },
  { id: 'rakor', label: 'RÄKOR', name: 'räkor', c: 0xf29a7a },
  { id: 'kebab', label: 'KEBAB', name: 'kebab', c: 0x8a5a36 },
];
TOPPINGS.forEach((t, i) => { t.x = X + 7.0 + i * 0.75; t.z = Z + 6.75; t.r = 0.4; t.bin = [X + 7.0 + i * 0.75, Y + 0.92, Z + 7.68]; });

export const PIZZA_ROOM = {
  spawn: { x: X + 0.75, z: Z + 4.0, h: Math.PI / 2 },   // a step inside the door, facing the counter
  door: { x: X + 0.55, z: Z + 4.0, r: 0.6 },            // stand here and press GÅ UT
  sanna: { x: X + 4.85, z: Z + 2.6, h: Math.PI / 2 },    // Sanna at the pass, on the dining-room side
  talk: { x: X + 4.0, z: Z + 2.9, r: 1.3 },             // walk up to her (from the dining room)
  pino: { x: X + 10.62, z: Z + 6.05, h: -2.1 },          // Pino with his bandaged hand, in the corner
  kitchenIn: { x: X + 5.85, z: Z + 7.2 },                // the way into the kitchen, at the south end of the counter
  // the stations: stand here and press the button
  oven: { x: X + 9.9, z: Z + 2.95, r: 0.75 },
  dough: { x: X + 9.65, z: Z + 4.2, r: 0.7 },
  pass: { x: X + 6.85, z: Z + 2.6, r: 0.7 },
  bin: { x: X + 6.85, z: Z + 1.2, r: 0.6 },
  // where things are drawn: the two places in the oven, the warm shelf in the pass, the dough bench
  slots: [{ x: X + 9.45, y: Y + 0.88, z: Z + 1.25 }, { x: X + 10.35, y: Y + 0.88, z: Z + 1.25 }],
  shelf: { x: X + 5.85, y: Y + 1.08, z: Z + 2.6 },
  bench: { x: X + 10.62, y: Y + 0.93, z: Z + 4.2 },
  // the guests' tables (seats: hips, facing the table) and where Sanna puts a pizza down
  tables: [
    { id: 1, x: X + 1.45, z: Z + 1.25 }, { id: 2, x: X + 3.85, z: Z + 1.25 },
    { id: 3, x: X + 1.45, z: Z + 6.6 }, { id: 4, x: X + 3.85, z: Z + 6.6 },
  ],
  room: { x0: X, x1: X + 11, z0: Z, z1: Z + 8 },
  kitchen: { x0: X + 6.2, x1: X + 11, z0: Z, z1: Z + 8 },
  bounds: { x0: X - 0.5, x1: X + 11.5, z0: Z - 0.5, z1: Z + 8.5 },
  y: Y,
};
// two chairs at each table, west and east of it, facing it
for (const T of PIZZA_ROOM.tables) T.seats = [{ x: T.x - 0.62, z: T.z, y: Y + 0.48, h: Math.PI / 2 }, { x: T.x + 0.62, z: T.z, y: Y + 0.48, h: -Math.PI / 2 }];

const WALL = 0xf1e6cf, KWALL = 0xf4f4f0;
// walls [x0, z0, x1, z1, colour] (local, full height): the door gap is z 3.5–4.5 in the west wall
export const PIZZA_WALLS = [
  [-0.2, -0.2, 11.2, 0, WALL],
  [-0.2, 0, 0, 3.5, WALL],
  [-0.2, 4.5, 0, 8.2, WALL],
  [-0.2, 8, 11.2, 8.2, WALL],
  [11, 0, 11.2, 8.2, KWALL],
];
// things that block the way [x0, z0, x1, z1, height]
export const PIZZA_FURN = [
  [5.5, 0, 6.2, 6.4, 1.05],        // the long counter (with the pass and the till)
  [8.75, 0, 11, 2.25, 2.2],        // the oven
  [10.25, 3.0, 11, 5.45, 0.92],    // the dough bench
  [6.6, 7.3, 11, 8, 0.92],         // the topping counter with the five bins
  [7.3, 0, 8.6, 0.6, 0.92],        // the sink
  [6.45, 0.15, 7.15, 0.75, 0.85],  // the bin
  ...PIZZA_ROOM.tables.map((T) => [T.x - X - 0.4, T.z - Z - 0.4, T.x - X + 0.4, T.z - Z + 0.4, 0.75]),
  ...PIZZA_ROOM.tables.flatMap((T) => T.seats.map((S) => [S.x - X - 0.22, S.z - Z - 0.22, S.x - X + 0.22, S.z - Z + 0.22, 0.48])),
  [0.2, 2.6, 0.75, 3.15, 1.2],     // a palm in a pot by the door
  [-0.2, 3.5, 0, 4.5, IH],         // the glass door (shut behind you)
];

const SIGNS = {
  meny: { def: { lines: ['MENY', 'MARGHERITA · 85', 'VESUVIO · 95', 'CAPRICCIOSA · 99', 'HAWAII · 99'], rows: true, bg: '#2e7a46', fg: '#fff6e0', border: '#f1e6cf', ppm: 150 }, x: 2.65, y: 1.75, z: 0.012, rot: 0, w: 1.0, h: 1.05 },
  meny2: { def: { lines: ['SPECIAL', 'BUSSOLA · 105', 'KEBABPIZZA · 109', 'PINOS SPECIAL · 119'], rows: true, bg: '#b8322c', fg: '#fff6e0', border: '#f1e6cf', ppm: 150 }, x: 4.85, y: 1.75, z: 0.012, rot: 0, w: 1.0, h: 0.9 },
  regler: { def: { lines: ['PINOS REGLER', 'OSTEN UNDER', 'INGEN STRESS', 'ALDRIG BRÄNT'], rows: true, bg: '#f6ead2', fg: '#7c3c2b', border: '#2e7a46', ppm: 150 }, x: 10.988, y: 1.7, z: 6.6, rot: -Math.PI / 2, w: 0.85, h: 0.8 },
  sjuan: { def: { lines: ['PIZZERIA SJUAN'], bg: '#2e7a46', fg: '#fff6e0', font: 0.6, stripe: true }, x: 2.4, y: 2.25, z: 7.988, rot: Math.PI, w: 2.6, h: 0.42 },
  lucka: { def: { lines: ['LUCKAN'], bg: '#2b2e35', fg: '#ffcf33', font: 0.6 }, x: 6.22, y: 2.15, z: 2.6, rot: Math.PI / 2, w: 0.75, h: 0.22 },
};
for (const [i, t] of TOPPINGS.entries()) SIGNS['bin' + i] = { def: { lines: [t.label], bg: '#f4f4f0', fg: '#2b2e35', font: 0.55, ppm: 200 }, x: 7.0 + i * 0.75, y: 1.22, z: 7.988, rot: Math.PI, w: 0.6, h: 0.13 };

export function pizzaLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of PIZZA_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of PIZZA_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs['pizza-' + id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id: 'pizza-' + id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = PIZZA_ROOM.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function pizzaInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r, n = 12) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, n, c, m, true);
  const tube = (a, b, r, c, m = PLAIN) => B.tube([X + a[0], Y + a[1], Z + a[2]], [X + b[0], Y + b[1], Z + b[2]], r, r, 6, c, m);
  const ico = (x, y, z, r, sy, c, m = PLAIN) => B.ico(X + x, Y + y, Z + z, r, sy, c, m);
  const GREEN = 0x2e7a46, RED = 0xb8322c, CREAM = 0xf6ead2, WOOD = 0x8a5a36, DARK = 0x2b2e35, STEEL = 0xb9bec4;

  // floors: terracotta in the dining room, white tiles with a red border in the kitchen
  floor(0, 0, 5.5, 8, 0xb5603a, FLOORTILE);
  for (let i = 0; i < 11; i++) for (let k = 0; k < 16; k++) if ((i + k) % 2) floor(i * 0.5, k * 0.5, i * 0.5 + 0.5, k * 0.5 + 0.5, 0xa4532f, FLOORTILE, 0.004);
  floor(5.5, 0, 11, 8, 0xeceae4, FLOORTILE);
  floor(5.5, 6.4, 6.6, 8, 0xd8d4cc, FLOORTILE, 0.004);
  floor(-0.2, 3.5, 0, 4.5, 0x6b6f75, PLAIN);
  bx(0.05, 0, 3.45, 0.9, 0.015, 4.55, 0x2b3a2e, FABRIC);                                     // the door mat
  // walls: cream with a green tiled dado in the dining room, white tiles in the kitchen
  for (const [x0, z0, x1, z1, c] of PIZZA_WALLS) bx(x0, 0, z0, x1, IH, z1, c, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(-0.2, 2.25, 3.5, 0, IH, 4.5, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  for (const [x0, z0, x1, z1] of [[0.01, 0.01, 5.5, 0.04], [0.01, 7.96, 5.5, 7.99]]) { bx(x0, 0, z0, x1, 1.0, z1, GREEN, FLOORTILE); bx(x0, 1.0, z0, x1, 1.05, z1, CREAM, ITRIM); }
  for (const [z0, z1] of [[0.04, 3.5], [4.5, 7.96]]) { bx(0.01, 0, z0, 0.04, 1.0, z1, GREEN, FLOORTILE); bx(0.01, 1.0, z0, 0.04, 1.05, z1, CREAM, ITRIM); }
  for (const [x0, z0, x1, z1] of [[6.2, 0.01, 10.99, 0.04], [6.2, 7.96, 10.99, 7.99]]) bx(x0, 0.92, z0, x1, 1.95, z1, 0xffffff, FLOORTILE);
  bx(10.96, 0.92, 2.25, 10.99, 1.95, 7.96, 0xffffff, FLOORTILE);
  bx(10.95, 1.95, 0.04, 10.99, 2.0, 7.96, RED); bx(6.2, 1.95, 0.01, 10.99, 2.0, 0.045, RED); bx(6.6, 1.95, 7.955, 10.99, 2.0, 7.99, RED);
  // the glass door and the shop windows either side of it (the street is dark outside)
  bx(-0.16, 0, 3.5, -0.04, 2.25, 4.5, 0x1d2a3a, ITRIM);
  bx(-0.04, 0.05, 3.6, -0.01, 2.15, 4.4, 0x9fb7c4, IGLASS);
  bx(-0.01, 0.95, 4.2, 0.04, 1.35, 4.25, 0xc9ccd0, CHROME);
  for (const [z0, z1] of [[0.6, 3.0], [5.0, 7.4]]) { bx(0.004, 0.9, z0, 0.03, 2.05, z1, 0xf4f1ec, ITRIM); bx(0.03, 0.95, z0 + 0.05, 0.036, 2.0, z1 - 0.05, 0x3a4a5e, IGLASS); }
  for (const [z0, z1] of [[0.6, 3.0], [5.0, 7.4]]) for (let k = 0; k < 7; k++) bx(0.036, 2.0 - k * 0.16, z0 + 0.05, 0.04, 1.98 - k * 0.16, z1 - 0.05, k % 2 ? GREEN : RED); // a striped valance

  // ---- the dining room: four tables with red-and-white cloths, a candle in a straw-wrapped bottle
  for (const T of PIZZA_ROOM.tables) {
    const tx = T.x - X, tz = T.z - Z;
    bx(tx - 0.4, 0.72, tz - 0.4, tx + 0.4, 0.75, tz + 0.4, 0xffffff, FABRIC, { skipBottom: false });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) bx(tx - 0.4 + i * 0.2, 0.751, tz - 0.4 + j * 0.2, tx - 0.2 + i * 0.2, 0.753, tz - 0.2 + j * 0.2, 0xd2342c, FABRIC);
    bx(tx - 0.42, 0.55, tz - 0.42, tx + 0.42, 0.72, tz - 0.4, 0xffffff, FABRIC); bx(tx - 0.42, 0.55, tz + 0.4, tx + 0.42, 0.72, tz + 0.42, 0xffffff, FABRIC);
    cyl(tx, tz, 0, 0.72, 0.05, DARK); cyl(tx, tz, 0, 0.03, 0.25, DARK);
    cyl(tx, tz, 0.753, 0.86, 0.06, 0xc89a4a, FABRIC, 0.065); cyl(tx, tz, 0.86, 0.98, 0.03, 0x2f5f3a, IGLASS, 0.015);  // the Chianti bottle
    cyl(tx, tz, 0.98, 1.06, 0.012, 0xf4efe0); cyl(tx, tz, 1.06, 1.09, 0.008, 0xffd27a, LIGHT, 0.002);
    cyl(tx + 0.22, tz - 0.22, 0.753, 0.8, 0.04, 0xf4f4f0); cyl(tx - 0.22, tz + 0.22, 0.753, 0.79, 0.035, 0xd9b23a, CHROME); // salt and oil
    for (const S of T.seats) { // bentwood chairs
      const sx = S.x - X, sz = S.z - Z, s = Math.sign(sx - tx);
      bx(sx - 0.2, 0.44, sz - 0.2, sx + 0.2, 0.48, sz + 0.2, WOOD, PLAIN, { skipBottom: false });
      for (const [dx, dz] of [[-0.17, -0.17], [0.15, -0.17], [-0.17, 0.15], [0.15, 0.15]]) bx(sx + dx, 0, sz + dz, sx + dx + 0.03, 0.44, sz + dz + 0.03, 0x4a3022);
      bx(sx + s * 0.18, 0.48, sz - 0.18, sx + s * 0.21, 0.95, sz + 0.18, 0x4a3022);
    }
  }
  // a palm by the door, pictures of Italy, a string of little flags across the room
  cyl(0.47, 2.87, 0, 0.42, 0.24, 0xb5603a, PLAIN, 0.2);
  for (let i = 0; i < 7; i++) { const a = i * 0.9; tube([0.47, 0.4, 2.87], [0.47 + Math.cos(a) * 0.45, 1.15 + (i % 3) * 0.12, 2.87 + Math.sin(a) * 0.45], 0.03, 0x3d7a3a); }
  // the bay of Naples with Vesuvius, in a gold frame on the south wall
  bx(0.9, 1.25, 7.95, 2.3, 2.05, 7.99, 0xd9b23a, CHROME);
  bx(0.97, 1.32, 7.94, 2.23, 1.98, 7.95, 0x8fc0e0);
  bx(0.97, 1.32, 7.935, 2.23, 1.5, 7.94, 0x2f6fb5);
  for (let k = 0; k < 6; k++) bx(1.25 + k * 0.08, 1.5, 7.93, 1.95 - k * 0.08, 1.56 + k * 0.05, 7.935, 0x6a5a52);
  ico(1.6, 1.86, 7.93, 0.06, 1, 0xd8d4cc);                                                  // the plume of smoke
  bx(3.2, 1.3, 7.95, 4.6, 1.95, 7.99, 0xd9b23a, CHROME);                                      // the Leaning Tower (sort of)
  bx(3.27, 1.37, 7.94, 4.53, 1.88, 7.95, 0xe8dcc0);
  B.rbox(X + 3.9, Y + 1.6, Z + 7.935, 0.16, 0.42, 0.01, 0, 0xf4f1ec, PLAIN, 0.12);
  for (let i = 0; i < 18; i++) { // a line of pennants from the door to the counter
    const x = 0.3 + i * 0.29, y = 2.38 - Math.sin((i / 17) * Math.PI) * 0.18;
    B.rbox(X + x, Y + y - 0.08, Z + 4.0, 0.16, 0.16, 0.01, 0, [GREEN, 0xffffff, RED][i % 3], FABRIC, Math.PI / 4);
  }
  tube([0.0, 2.4, 4.0], [5.5, 2.4, 4.0], 0.006, 0x2b2e35);

  // ---- the counter: wood front, a steel top; the till by the dining room; the pass with heat lamps
  bx(5.5, 0, 0, 6.2, 1.0, 6.4, 0x6a3e26, PLAIN);
  for (let k = 0; k < 9; k++) bx(5.48, 0.08, 0.3 + k * 0.68, 5.5, 0.92, 0.82 + k * 0.68, 0x7a4a2e);
  bx(5.45, 1.0, -0.02, 6.25, 1.05, 6.45, 0xd8d4cc, CHROME, { skipBottom: false });
  bx(5.55, 1.05, 1.85, 6.15, 1.07, 3.35, 0x8f969c, CHROME);                                    // the warm shelf
  for (const z of [2.1, 3.1]) { tube([5.85, IH, z], [5.85, 1.75, z], 0.01, DARK); cyl(5.85, z, 1.6, 1.75, 0.13, RED, PLAIN, 0.05); cyl(5.85, z, 1.58, 1.6, 0.1, 0xffb070, LIGHT); }
  bx(5.6, 1.05, 4.2, 5.95, 1.3, 4.8, 0x2b2e35); bx(5.62, 1.3, 4.25, 5.65, 1.45, 4.75, 0x6fd28a, LIGHT); // the till
  // the order rail over the pass (kitchen side), with a few slips
  bx(6.2, 1.78, 1.9, 6.24, 1.8, 3.3, STEEL, CHROME);
  for (let k = 0; k < 3; k++) bx(6.24, 1.6, 2.05 + k * 0.42, 6.25, 1.79, 2.3 + k * 0.42, 0xfffbe8);
  // the way into the kitchen: a swing door, open (hooked back against the counter end)
  bx(6.2, 0.2, 6.4, 6.24, 1.3, 7.2, 0x6a3e26);
  bx(6.24, 0.8, 6.55, 6.245, 1.1, 6.9, 0xc9e4f0, IGLASS);

  // ---- the oven: a tiled base, the vault with an arched mouth, embers at the back, a chimney
  bx(8.75, 0, 0, 11, 0.85, 2.25, 0x9a4a33, PLAIN);
  for (let k = 0; k < 5; k++) bx(8.73, 0.1 + k * 0.15, 2.24, 11.02, 0.18 + k * 0.15, 2.26, k % 2 ? 0xc0603a : 0xd8b48a, FLOORTILE);
  bx(8.75, 0.85, 0.0, 11, 0.88, 2.25, 0x6a5a52, PLAIN);                                        // the hearth
  bx(8.75, 0.88, 0.0, 9.05, 1.55, 2.25, 0xc0603a, PLAIN); bx(10.7, 0.88, 0.0, 11, 1.55, 2.25, 0xc0603a, PLAIN); // the sides of the mouth
  bx(9.05, 0.88, 0.0, 10.7, 1.55, 0.35, 0x2a1a14, PLAIN);                                      // the back wall, sooty
  bx(9.05, 1.42, 0.35, 10.7, 1.55, 2.25, 0x3a2620, PLAIN, { skipBottom: false });              // the roof of the vault (black inside)
  bx(9.05, 0.881, 0.35, 10.7, 0.885, 2.0, 0x3a2e28, PLAIN);                                     // the oven floor
  for (const [x, z, r] of [[9.35, 0.55, 0.12], [9.7, 0.5, 0.1], [10.1, 0.58, 0.13], [10.45, 0.52, 0.1]]) { ico(x, 0.95, z, r, 0.6, 0xff7a2a, LIGHT); ico(x, 1.0, z + 0.05, r * 0.5, 0.8, 0xffd27a, LIGHT); }
  for (const x of [9.25, 9.6, 9.95, 10.3]) bx(x, 0.89, 0.35, x + 0.25, 0.97, 0.47, 0x6a4a32);     // logs
  cyl(9.875, 1.1, 1.55, 1.95, 1.1, 0xc0603a, FLOORTILE, 0.78, 14);                              // the dome
  ico(9.875, 1.95, 1.1, 0.78, 0.32, 0xc0603a, FLOORTILE);
  for (let k = 0; k < 9; k++) { const a = (k / 8) * Math.PI; bx(9.875 + Math.cos(a) * 0.86 - 0.06, 0.88 + Math.sin(a) * 0.62, 2.24, 9.875 + Math.cos(a) * 0.86 + 0.06, 0.95 + Math.sin(a) * 0.62, 2.29, 0xe8dcc0); } // the arch
  bx(9.6, 1.9, 0.2, 10.15, IH, 0.75, 0x6a6f75, CHROME);                                       // the chimney hood
  bx(9.2, 1.6, 2.26, 10.55, 1.82, 2.29, GREEN); bx(9.25, 1.65, 2.29, 10.5, 1.77, 2.3, 0xfff6e0); // a little sign plate
  // the peel on its hooks beside the oven
  tube([8.6, 0.25, 2.15], [8.6, 1.65, 2.15], 0.018, WOOD);
  bx(8.56, 0.05, 1.95, 8.64, 0.35, 2.35, 0xb98a5a);

  // ---- the dough bench: marble, a stack of dough balls, a rolling pin, the sauce pot and the cheese
  bx(10.25, 0, 3.0, 11, 0.88, 5.45, 0xd8cfb4, ITRIM);
  bx(10.2, 0.88, 2.95, 11, 0.93, 5.5, 0xeeeeea, PLAIN, { skipBottom: false });
  for (const [x, z] of [[10.7, 3.25], [10.5, 3.35], [10.75, 3.55]]) ico(x, 0.98, z, 0.1, 0.55, 0xf4e8cc);
  B.hcyl(X + 10.45, Y + 0.97, Z + 3.9, 0.45, 0.035, 'z', 8, 0xc89a5a);
  cyl(10.7, 4.85, 0.93, 1.13, 0.16, STEEL, CHROME); cyl(10.7, 4.85, 1.12, 1.125, 0.14, 0xc0302a);       // the tomato sauce
  cyl(10.45, 5.25, 0.93, 1.03, 0.14, STEEL, CHROME); for (let k = 0; k < 7; k++) ico(10.45 + Math.cos(k) * 0.07, 1.04, 5.25 + Math.sin(k) * 0.07, 0.035, 0.6, 0xf4dc7a); // grated cheese
  bx(10.95, 1.3, 3.2, 10.99, 1.75, 5.2, 0x6a3e26); for (let k = 0; k < 5; k++) cyl(10.9, 3.4 + k * 0.42, 1.36, 1.5, 0.05, [0xc0302a, 0x3d7a3a, 0xd9b23a, 0x8a5a36, 0xf4f4f0][k], PLAIN, 0.045); // a spice shelf

  // ---- the topping counter: steel, five bins under a glass sneeze guard, the labels on the tiles behind
  bx(6.6, 0, 7.3, 11, 0.88, 8, 0xc9ccd0, CHROME);
  bx(6.55, 0.88, 7.25, 11, 0.92, 8, 0xe2e4e6, CHROME, { skipBottom: false });
  TOPPINGS.forEach((t, i) => {
    const x = 7.0 + i * 0.75;
    bx(x - 0.3, 0.86, 7.42, x + 0.3, 0.925, 7.95, 0x8f969c, CHROME);
    for (let k = 0; k < 14; k++) {
      const a = k * 2.4, r = 0.05 + (k % 5) * 0.045, px = x + Math.cos(a) * r * 1.2, pz = 7.68 + Math.sin(a) * r;
      if (t.id === 'skinka') B.rbox(X + px, Y + 0.93, Z + pz, 0.07, 0.015, 0.07, a, t.c);
      else if (t.id === 'svamp') { ico(px, 0.935, pz, 0.035, 0.5, t.c); }
      else if (t.id === 'ananas') B.rbox(X + px, Y + 0.935, Z + pz, 0.05, 0.03, 0.04, a, t.c);
      else if (t.id === 'rakor') ico(px, 0.935, pz, 0.03, 0.6, t.c);
      else B.rbox(X + px, Y + 0.935, Z + pz, 0.08, 0.02, 0.03, a, t.c);
    }
  });
  bx(6.6, 1.3, 7.4, 10.95, 1.32, 7.95, 0xd8eef6, IGLASS);
  for (const x of [6.65, 10.9]) bx(x, 0.92, 7.9, x + 0.04, 1.3, 7.94, STEEL, CHROME);
  // the sink and the bin by the north wall, a shelf of tins, a sack of flour
  bx(7.3, 0, 0, 8.6, 0.88, 0.6, 0xc9ccd0, CHROME); bx(7.45, 0.88, 0.08, 8.45, 0.9, 0.5, 0x8f969c, CHROME);
  tube([7.95, 0.9, 0.06], [7.95, 1.2, 0.06], 0.02, STEEL); tube([7.95, 1.2, 0.06], [7.95, 1.18, 0.22], 0.018, STEEL);
  cyl(6.8, 0.45, 0, 0.82, 0.28, 0x3d5a46, PLAIN, 0.26); cyl(6.8, 0.45, 0.82, 0.86, 0.29, 0x2b3a2e);   // the bin
  bx(6.6, 1.5, 0.04, 8.6, 1.53, 0.35, STEEL, CHROME);
  for (let k = 0; k < 7; k++) cyl(6.8 + k * 0.28, 0.2, 1.53, 1.7, 0.08, k % 2 ? 0xc0302a : 0xd9b23a, PLAIN);
  bx(9.0, 0, 6.6, 9.6, 0.55, 7.15, 0xf2efe6, FABRIC); bx(9.05, 0.55, 6.65, 9.55, 0.6, 7.1, 0xe8e2d0, FABRIC);
  // lamps over the kitchen and the dining room
  for (const T of PIZZA_ROOM.tables) { const tx = T.x - X, tz = T.z - Z; tube([tx, IH, tz], [tx, 1.85, tz], 0.008, DARK); cyl(tx, tz, 1.7, 1.85, 0.2, GREEN, PLAIN, 0.06); cyl(tx, tz, 1.69, 1.7, 0.17, 0xfff1c9, LIGHT); }
}
