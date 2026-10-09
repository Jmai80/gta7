// Hörnlivs from the inside (v0.6.1): the corner shop on Kungsgatan, where Yasmin stands at the till.
// Like the tower, it is built out at sea next to the tower's 7th floor (INDOOR in config.js) and
// shown instead of the town while you are in there. Local coordinates: x east, z south, y up from
// the floor; the origin is the room's north-west corner. The street door is in the south wall.
//
//   z=0  ┌ back shelf ┐┌──────── fridges ─────────┐
//        │  Yasmin    ││                          │ wall
//        │            ││   shelf      shelf       │ shelves
//   z=3  ├─ till ─────┘│                          │
//        │ papers                                 │
//        │       fruit                            │
//   z=7  └──door──┴──────── windows ──────────────┘
//        x=0                                    x=9
import { INDOOR } from './config.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, FLOORTILE = 31, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.45;
const X = INDOOR.x + 28, Y = INDOOR.y, Z = INDOOR.z + 26;

export const SHOP = {
  spawn: { x: X + 1.8, z: Z + 5.5, h: Math.PI },          // just inside the door, facing the till
  door: { x: X + 1.8, z: Z + 6.6, r: 0.8 },                // stand here and press GÅ UT
  yasmin: { x: X + 1.6, z: Z + 2.2, h: 0 },               // behind the till, facing the room
  talk: { x: X + 1.6, z: Z + 3.7, r: 2.0 },               // in front of the till
  bag: { x: X + 2.45, y: Y + 0.95, z: Z + 3.3 },          // the bag on the counter
  room: { x0: X, x1: X + 9, z0: Z, z1: Z + 7 },
  bounds: { x0: X - 0.5, x1: X + 9.5, z0: Z - 0.5, z1: Z + 7.5 },
  y: Y,
};

const WALL = 0xe6e1d2, STRIPE = 0x2c62a8;
// walls [x0, z0, x1, z1] (local, full height); the door gap is x 1.2–2.4 in the south wall
export const SHOP_WALLS = [
  [-0.2, -0.2, 9.2, 0],
  [-0.2, 0, 0, 7.2],
  [9, 0, 9.2, 7.2],
  [-0.2, 7, 1.2, 7.2],
  [2.4, 7, 9.2, 7.2],
];
// things that block the way [x0, z0, x1, z1, height]
export const SHOP_FURN = [
  [0, 3.0, 3.3, 3.7, 0.95],     // the till counter
  [3.3, 0.45, 3.9, 3.7, 0.95],  // its side (sweets): nobody gets behind the till
  [0, 0, 3.4, 0.45, 2.0],       // the shelf behind Yasmin
  [4.1, 0, 8.95, 0.7, 2.0],     // fridges
  [8.45, 0.7, 9.0, 6.6, 1.9],   // wall shelves (east)
  [5.0, 1.6, 5.7, 5.2, 1.45],   // shelf 1
  [6.9, 1.6, 7.6, 5.2, 1.45],   // shelf 2
  [3.4, 5.8, 4.7, 6.7, 0.8],    // fruit and vegetables
  [0, 4.4, 0.45, 6.2, 1.3],     // newspapers
  [1.2, 7, 2.4, 7.2, IH],       // the glass door (shut behind you)
];

export function shopLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of SHOP_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of SHOP_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const B = SHOP.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y } };
}

// a tiny random sequence so the shelves look the same every time
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function shopInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const R = rng(7);
  const PRODUCT = [0xd2342c, 0xe5b923, 0x2c62a8, 0x46c96f, 0xf08a24, 0xf2efe6, 0x8e44ad, 0xc0392b, 0x1f7a5a, 0x7a4a2a, 0xe84393, 0x3a3c41];
  const pick = () => PRODUCT[Math.floor(R() * PRODUCT.length)];

  floor(0, 0, 9, 7, 0xd9d3c4, FLOORTILE);
  floor(1.2, 7, 2.4, 7.2, 0x6b6f75, PLAIN);
  bx(1.25, 0, 6.35, 2.35, 0.015, 6.95, 0x3c3f45, FABRIC); // door mat
  // walls (the shader opens them up when they would hide you) with a blue stripe at hand height
  for (const [x0, z0, x1, z1] of SHOP_WALLS) bx(x0, 0, z0, x1, IH, z1, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(1.2, 2.2, 7, 2.4, IH, 7.2, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(0.001, 1.0, 3.75, 0.02, 1.12, 6.98, STRIPE, ITRIM);
  bx(2.4, 1.0, 6.98, 8.98, 1.12, 6.999, STRIPE, ITRIM);
  // the glass door and the shop windows toward Kungsgatan
  bx(1.2, 0, 7.04, 2.4, 2.2, 7.16, 0x9fb7c4, IGLASS);
  bx(1.2, 0, 7.0, 1.27, 2.2, 7.2, 0x2a2e34, ITRIM); bx(2.33, 0, 7.0, 2.4, 2.2, 7.2, 0x2a2e34, ITRIM);
  bx(1.25, 0.95, 6.98, 1.4, 1.0, 7.0, 0xc9ccd0, CHROME);
  for (const [a, b] of [[2.9, 5.3], [5.7, 8.5]]) {
    bx(a, 0.75, 6.985, b, 2.1, 6.995, 0x9fb7c4, IGLASS);
    bx(a - 0.06, 0.7, 6.97, b + 0.06, 0.75, 6.995, 0xf1eee7, ITRIM);
    bx(a - 0.06, 2.1, 6.97, b + 0.06, 2.15, 6.995, 0xf1eee7, ITRIM);
  }

  // ---- the till: counter, register, card reader, a jar of sweets, the sweets display at the side
  bx(0, 0, 3.0, 3.3, 0.9, 3.7, 0x2c62a8, ITRIM);
  bx(-0.02, 0.9, 2.95, 3.35, 0.95, 3.75, 0xd8cfc0, PLAIN, { skipBottom: false });
  bx(3.3, 0, 0.45, 3.9, 0.9, 3.7, 0x2c62a8, ITRIM);
  bx(3.28, 0.9, 0.42, 3.92, 0.95, 3.75, 0xd8cfc0, PLAIN, { skipBottom: false });
  bx(0.55, 0.95, 3.05, 1.15, 1.12, 3.45, 0x2a2b2f);          // register
  bx(0.62, 1.12, 3.1, 1.08, 1.3, 3.16, 0x15161a);
  bx(0.65, 1.14, 3.165, 1.05, 1.28, 3.17, 0x9fe0b0, LIGHT);   // its little screen
  bx(1.35, 0.95, 3.45, 1.47, 0.99, 3.62, 0x1d1f22);            // card reader
  bx(3.42, 0.95, 1.0, 3.78, 1.25, 1.3, 0xbfd8e2, IGLASS);      // sweets jar
  for (let z = 0.6; z < 3.5; z += 0.32) for (let k = 0; k < 2; k++) bx(3.36 + k * 0.27, 0.7, z, 3.6 + k * 0.27, 0.86, z + 0.27, pick(), PLAIN);
  // the shelf behind the till: cigarettes, scratch cards, coffee
  bx(0, 0, 0, 3.4, 2.0, 0.45, 0x5b4636, PLAIN);
  for (const y of [0.9, 1.35, 1.8]) {
    bx(0.05, y - 0.03, 0.42, 3.35, y, 0.47, 0x3e3026);
    for (let x = 0.1; x < 3.3; x += 0.13 + R() * 0.06) bx(x, y, 0.3, x + 0.1, y + 0.2 + R() * 0.12, 0.44, pick(), PLAIN);
  }
  bx(0.4, 2.05, 0.02, 3.0, 2.38, 0.04, 0x2c62a8, ITRIM);   // a blue board: HÖRNLIVS
  bx(0.5, 2.12, 0.04, 2.9, 2.31, 0.05, 0xf4efe4, ITRIM);

  // ---- fridges along the north wall: glass doors, light strips and bottles inside
  bx(4.1, 0, 0, 8.95, 2.0, 0.7, 0xe9ebec, ITRIM);
  for (let x = 4.15, i = 0; x < 8.9; x += 0.95, i++) {
    for (const y of [0.45, 0.95, 1.45]) for (let k = 0; k < 6; k++) {
      const bx0 = x + 0.08 + k * 0.13;
      bx(bx0, y, 0.45, bx0 + 0.09, y + 0.3, 0.62, [0xd2342c, 0x2c62a8, 0xf2efe6, 0x46c96f, 0xe5b923][(i + k) % 5], PLAIN);
    }
    bx(x + 0.02, 0.15, 0.71, x + 0.9, 1.9, 0.73, 0xbfd8e2, IGLASS);
    bx(x + 0.8, 0.8, 0.73, x + 0.84, 1.3, 0.78, 0xc9ccd0, CHROME);
  }
  bx(4.1, 1.92, 0.7, 8.95, 2.0, 0.76, 0xfff1c9, LIGHT);

  // ---- two shelves in the middle and wall shelves on the east side, full of packets and tins
  const shelf = (x0, z0, x1, z1, h, along) => {
    bx(x0, 0, z0, x1, 0.12, z1, 0x3a3c41);
    if (along === 'z') bx((x0 + x1) / 2 - 0.03, 0, z0, (x0 + x1) / 2 + 0.03, h, z1, 0xd8d8d4, ITRIM);
    else bx(x0, 0, z1 - 0.06, x1, h, z1, 0xd8d8d4, ITRIM);
    for (const y of [0.12, 0.55, 1.0]) {
      if (along === 'z') {
        for (const side of [0, 1]) {
          const a = side ? (x0 + x1) / 2 + 0.03 : x0, b = side ? x1 : (x0 + x1) / 2 - 0.03;
          bx(a, y, z0, b, y + 0.03, z1, 0xc9ccd0);
          for (let z = z0 + 0.04; z < z1 - 0.15; z += 0.16 + R() * 0.08) bx(a + 0.03, y + 0.03, z, b - 0.03, y + 0.2 + R() * 0.17, z + 0.14, pick(), PLAIN);
        }
      } else {
        bx(x0, y, z0, x1, y + 0.03, z1 - 0.06, 0xc9ccd0);
        for (let x = x0 + 0.04; x < x1 - 0.15; x += 0.16 + R() * 0.08) bx(x, y + 0.03, z0 + 0.04, x + 0.14, y + 0.2 + R() * 0.17, z1 - 0.08, pick(), PLAIN);
      }
    }
  };
  shelf(5.0, 1.6, 5.7, 5.2, 1.45, 'z');
  shelf(6.9, 1.6, 7.6, 5.2, 1.45, 'z');
  // wall shelves on the east side: shelf boards facing west
  bx(8.94, 0, 0.7, 9.0, 1.9, 6.6, 0xd8d8d4, ITRIM);
  for (const y of [0.12, 0.6, 1.1, 1.55]) {
    bx(8.45, y, 0.7, 8.94, y + 0.03, 6.6, 0xc9ccd0);
    for (let z = 0.75; z < 6.45; z += 0.16 + R() * 0.08) bx(8.5, y + 0.03, z, 8.9, y + 0.18 + R() * 0.2, z + 0.13, pick(), PLAIN);
  }

  // ---- fruit and vegetables by the window: crates on a stand
  bx(3.4, 0, 5.8, 4.7, 0.55, 6.7, 0x7a5a3c, PLAIN);
  const crate = (x0, z0, c) => {
    bx(x0, 0.55, z0, x0 + 0.6, 0.72, z0 + 0.42, 0xb08a5c, PLAIN);
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) bx(x0 + 0.05 + i * 0.18, 0.72, z0 + 0.05 + k * 0.18, x0 + 0.19 + i * 0.18, 0.82, z0 + 0.19 + k * 0.18, c, PLAIN);
  };
  crate(3.45, 5.85, 0xf08a24); crate(4.05, 5.85, 0xd2342c); crate(3.45, 6.25, 0x6cbf3a); crate(4.05, 6.25, 0xe5d23a);
  // newspapers by the door
  bx(0, 0, 4.4, 0.45, 1.3, 6.2, 0x8a8f96, PLAIN);
  for (const [z, c] of [[4.5, 0xf2efe6], [4.95, 0xe8d8a8], [5.4, 0xf2efe6], [5.85, 0xd8e2ea]]) bx(0.45, 0.6, z, 0.5, 1.2, z + 0.38, c, PLAIN);
  // a basket stack and a bin by the door
  bx(2.65, 0, 6.3, 3.1, 0.42, 6.75, 0xd2342c, PLAIN);
  bx(0.65, 0, 6.5, 1.0, 0.6, 6.85, 0x3a3c41, PLAIN);
}

// the shopping bag on the counter (a separate mesh: it goes when Yasmin hands it over)
export function bagInto(B) {
  B.box(-0.17, 0, -0.11, 0.17, 0.34, 0.11, 0xc8a36e, PLAIN, { skipBottom: false });       // paper bag
  B.box(-0.17, 0.3, -0.112, 0.17, 0.34, 0.112, 0xb08a5c, PLAIN);                            // folded rim
  B.box(-0.13, 0.34, -0.06, 0.03, 0.42, 0.06, 0xf2efe6, PLAIN, { skipBottom: false });       // egg box sticking up
  for (let i = 0; i < 3; i++) B.box(-0.12 + i * 0.05, 0.42, -0.04, -0.08 + i * 0.05, 0.445, 0.04, 0xf0e2c8, PLAIN);
  B.box(0.05, 0.3, -0.03, 0.12, 0.62, 0.04, 0xf2efe6, PLAIN, { skipBottom: false });        // milk carton
  B.box(0.05, 0.5, -0.032, 0.12, 0.56, 0.042, 0x2c62a8, PLAIN);
  B.box(-0.16, 0.3, 0.02, -0.02, 0.5, 0.09, 0x5b3a22, PLAIN, { skipBottom: false });        // coffee
}
