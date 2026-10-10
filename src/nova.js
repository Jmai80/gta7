// Nova's room from the inside (v1.4): Kim's little sister, thirteen, in the flats behind Macken on
// Skolgatan. A teenager's room in 2026: K-pop posters (K-POP DEMONJÄGARNA, on a world tour), an LED
// strip round the ceiling, a gaming desk with a glowing screen, a ring light, a Labubu on the shelf –
// and everything else on the floor. Like the other insides it is built out at sea (INDOOR in
// config.js). Local coordinates: x east, z south, y up from the floor; the origin is the room's
// north-west corner. The door to the stairwell is in the south wall.
//
//   z=0  ┌ bed ── poster ─ desk+PC ─ shelf ─ wardrobe ┐
//        │ (head)          gaming chair                │
//        │ nightstand                                  │
//        │                  things on the floor        │
//        │                                      bin    │
//   z=6  └──────── shoe rack ─ door ───────────────────┘
//        x=0                                        x=7
import { INDOOR } from './config.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, PARQUET = 30, TV = 32, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.45;
const X = INDOOR.x + 20, Y = INDOOR.y, Z = INDOOR.z - 24;
void TV;

export const ROOM = {
  spawn: { x: X + 3.5, z: Z + 5.3, h: Math.PI },       // a step inside the door, facing into the room
  door: { x: X + 3.5, z: Z + 5.65, r: 0.7 },           // stand here and press GÅ UT
  nova: { x: X + 2.9, z: Z + 1.25, y: Y + 0.5, h: 0 }, // Nova in her gaming chair, turned to the room (hips on the seat)
  talk: { x: X + 2.9, z: Z + 1.25, r: 1.7 },
  mom: { x: X + 3.5, z: Z + 5.0 },                     // where her mum stops when she comes in
  room: { x0: X, x1: X + 7, z0: Z, z1: Z + 6 },
  bounds: { x0: X - 0.5, x1: X + 7.5, z0: Z - 0.5, z1: Z + 6.5 },
  y: Y,
};

// the six things on the floor and where each one belongs: floor (x, z, rot), place (where it ends up:
// x, y, z, rot), stand (where you stand to put it there). The ticket is in the hoodie's pocket.
export const THINGS = [
  { id: 'luva', name: 'luvtröjan', where: 'i garderoben', floor: [1.6, 3.4, 0.6], place: [6.3, 1.2, 0.3, 0], stand: [6.3, 1.15] },
  { id: 'labubu', name: 'Labubun', where: 'på hyllan', floor: [4.6, 2.7, 2.1], place: [4.7, 1.38, 0.18, 0], stand: [4.7, 0.9] },
  { id: 'lightstick', name: 'lightsticken', where: 'i laddaren på nattduksbordet', floor: [5.7, 2.1, 1.0], place: [0.27, 0.62, 2.75, 0.4], stand: [0.95, 2.75] },
  { id: 'pizza', name: 'pizzakartongen', where: 'i papperskorgen', floor: [3.3, 4.2, 0.3], place: [6.5, 0.46, 4.8, 0.2], stand: [5.95, 4.8] },
  { id: 'skate', name: 'skateboarden', where: 'vid skohyllan', floor: [5.3, 3.9, 1.2], place: [1.25, 0.0, 5.75, Math.PI / 2], stand: [1.25, 5.1] },
  { id: 'lurar', name: 'hörlurarna', where: 'på skrivbordet', floor: [0.95, 4.6, 2.5], place: [3.55, 0.78, 0.4, 0.3], stand: [3.75, 1.05] },
];
for (const t of THINGS) {
  t.fx = X + t.floor[0]; t.fz = Z + t.floor[1]; t.frot = t.floor[2];
  t.px = X + t.place[0]; t.py = Y + t.place[1]; t.pz = Z + t.place[2]; t.prot = t.place[3];
  t.sx = X + t.stand[0]; t.sz = Z + t.stand[1];
}

const WALL = 0xd9c8ef, WALL2 = 0xf1c6dc;
// walls [x0, z0, x1, z1, colour] (local, full height); the door gap is x 3.0–4.0 in the south wall
export const ROOM_WALLS = [
  [-0.2, -0.2, 7.2, 0, WALL],
  [-0.2, 0, 0, 6.2, WALL2],
  [7, 0, 7.2, 6.2, WALL2],
  [-0.2, 6, 3.0, 6.2, WALL],
  [4.0, 6, 7.2, 6.2, WALL],
];
// things that block the way [x0, z0, x1, z1, height]
export const ROOM_FURN = [
  [0, 0.15, 1.6, 2.4, 0.55],      // the bed
  [0, 2.5, 0.5, 3.0, 0.55],       // the nightstand
  [2.0, 0, 3.8, 0.7, 0.75],       // the gaming desk
  [2.6, 0.95, 3.2, 1.55, 0.6],    // the gaming chair (with Nova in it)
  [4.2, 0, 5.2, 0.35, 1.8],       // the shelf
  [5.6, 0, 7.0, 0.6, 2.1],        // the wardrobe
  [6.3, 4.6, 6.7, 5.0, 0.45],     // the bin
  [1.8, 5.55, 2.8, 6.0, 0.45],    // the shoe rack
  [6.2, 2.9, 6.95, 3.6, 0.35],    // a beanbag
  [3.0, 6, 4.0, 6.2, IH],         // the door (shut behind you)
];

const SIGNS = {
  kdh: { def: { lines: ['K-POP', 'DEMONJÄGARNA'], bg: '#2a1450', fg: '#ff5fd2', font: 0.5, border: '#ffd23f' }, x: 1.0, y: 1.45, z: 0.012, rot: 0, w: 1.5, h: 0.95 },
  golden: { def: { lines: ['GOLDEN', 'VÄRLDSTURNÉ 2026'], bg: '#ffd23f', fg: '#2a1450', font: 0.42, border: '#ff5fd2' }, x: 6.988, y: 1.4, z: 1.9, rot: -Math.PI / 2, w: 1.2, h: 0.8 },
};

export function novaLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of ROOM_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of ROOM_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs[id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = ROOM.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function novaInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, 12, c, m, true);
  const WHITE = 0xf4f1ec;

  floor(0, 0, 7, 6, 0xc9a77c, PARQUET);
  floor(3.0, 6, 4.0, 6.2, 0x6b6f75, PLAIN);
  B.cyl(X + 3.6, Z + 3.3, Y + 0.004, Y + 0.012, 1.25, 1.25, 20, 0xf3d7ea, FABRIC, true); // a fluffy round rug
  for (const [x0, z0, x1, z1, c] of ROOM_WALLS) bx(x0, 0, z0, x1, IH, z1, c, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(3.0, 2.2, 6, 4.0, IH, 6.2, WALL, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(3.0, 0, 6.04, 4.0, 2.2, 6.16, 0xf4f1ec, ITRIM);                   // the door
  bx(3.15, 0.95, 5.98, 3.3, 1.0, 6.04, 0xc9ccd0, CHROME);
  // the LED strip round the top of the walls: pink and violet
  bx(0.01, 2.3, 0.01, 6.99, 2.34, 0.04, 0xff5fd2, LIGHT);
  bx(0.01, 2.3, 0.04, 0.04, 2.34, 5.99, 0xb36cff, LIGHT);
  bx(6.96, 2.3, 0.04, 6.99, 2.34, 5.99, 0xb36cff, LIGHT);
  bx(0.01, 2.3, 5.96, 6.99, 2.34, 5.99, 0xff5fd2, LIGHT);
  // a window in the east wall
  bx(6.99, 0.9, 4.0, 6.995, 2.0, 5.3, WHITE, ITRIM);
  bx(6.985, 0.96, 4.06, 6.99, 1.94, 5.24, 0x9db4c7, IGLASS);

  // ---- the bed: violet duvet, a heap of plushies, fairy lights on the headboard
  bx(0, 0, 0.15, 1.6, 0.35, 2.4, 0xffffff, PLAIN, { skipBottom: false });
  bx(0.04, 0.35, 0.2, 1.56, 0.5, 2.36, 0xf6f2ea, FABRIC);
  bx(0.04, 0.5, 0.95, 1.56, 0.58, 2.36, 0x8a5ad0, FABRIC);
  bx(0.25, 0.5, 0.25, 1.35, 0.64, 0.7, 0xffe3f1, FABRIC);
  bx(0, 0, 0.1, 1.6, 1.05, 0.2, 0xffffff, PLAIN);
  for (let i = 0; i < 7; i++) B.ico(X + 0.15 + i * 0.22, Y + 1.0 + (i % 2) * 0.04, Z + 0.21, 0.025, 1, [0xfff1a8, 0xffb3e1, 0xb3e5ff][i % 3], LIGHT);
  for (const [x, z, c] of [[1.25, 0.85, 0x7fd0ff], [1.05, 0.95, 0xffb3e1]]) B.ico(X + x, Y + 0.7, Z + z, 0.11, 1, c, FABRIC);
  // the nightstand with an empty charger (the lightstick goes there) and a lamp
  bx(0, 0, 2.5, 0.5, 0.55, 3.0, 0xffffff, PLAIN);
  bx(0.15, 0.55, 2.65, 0.4, 0.58, 2.85, 0x2a2b2f);
  cyl(0.25, 2.62, 0.55, 0.85, 0.02, 0xd9dde2, CHROME); cyl(0.25, 2.62, 0.85, 0.98, 0.1, 0xfff1c9, LIGHT, 0.06);

  // ---- the gaming desk: two glowing screens, an RGB keyboard, a mic on an arm, the chair
  bx(2.0, 0.72, 0, 3.8, 0.76, 0.7, 0x1d1f22, PLAIN, { skipBottom: false });
  for (const x of [2.05, 3.7]) bx(x, 0, 0.05, x + 0.05, 0.72, 0.65, 0x2a2b2f);
  bx(2.25, 0.85, 0.08, 3.05, 1.32, 0.12, 0x111215); bx(2.3, 0.9, 0.121, 3.0, 1.28, 0.124, 0x7a5cff, LIGHT); // screen 1: a game
  bx(3.1, 0.85, 0.1, 3.65, 1.25, 0.14, 0x111215); bx(3.14, 0.89, 0.141, 3.61, 1.21, 0.144, 0xff5fd2, LIGHT); // screen 2: a chat
  for (const x of [2.65, 3.37]) { bx(x - 0.03, 0.76, 0.12, x + 0.03, 0.86, 0.16, 0x2a2b2f); bx(x - 0.12, 0.76, 0.1, x + 0.12, 0.77, 0.22, 0x2a2b2f); }
  bx(2.4, 0.765, 0.3, 3.0, 0.79, 0.48, 0x1d1f22); bx(2.42, 0.791, 0.32, 2.98, 0.795, 0.46, 0x46ffd9, LIGHT);   // the keyboard glows
  cyl(3.2, 0.42, 0.76, 0.78, 0.07, 0x1d1f22);                                                                 // mouse pad
  cyl(2.15, 0.15, 0.76, 1.15, 0.012, 0x2a2b2f); cyl(2.15, 0.15, 1.15, 1.3, 0.035, 0x1d1f22);                    // the mic
  // the gaming chair: black and pink
  cyl(2.9, 1.25, 0, 0.05, 0.28, 0x1d1f22); cyl(2.9, 1.25, 0.05, 0.42, 0.04, 0x9aa0a6, CHROME);
  bx(2.65, 0.42, 1.0, 3.15, 0.52, 1.5, 0x1d1f22, FABRIC, { skipBottom: false });
  bx(2.65, 0.52, 1.44, 3.15, 1.25, 1.56, 0x1d1f22, FABRIC); bx(2.78, 0.6, 1.43, 3.02, 1.15, 1.44, 0xff5fd2, FABRIC);
  // a ring light on a stand (for the dance videos)
  cyl(4.2, 1.2, 0, 1.4, 0.015, 0x2a2b2f); cyl(4.2, 1.2, 0, 0.03, 0.2, 0x2a2b2f);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2; B.tube([X + 4.2 + Math.cos(a) * 0.22, Y + 1.62 + Math.sin(a) * 0.22, Z + 1.2], [X + 4.2 + Math.cos(a1) * 0.22, Y + 1.62 + Math.sin(a1) * 0.22, Z + 1.2], 0.022, 0.022, 5, 0xfff8e8, LIGHT); }

  // ---- the shelf: K-pop albums, a photocard binder, a little speaker
  bx(4.2, 0, 0, 5.2, 1.8, 0.35, 0xffffff, PLAIN);
  for (const yy of [0.45, 0.9, 1.35]) bx(4.22, yy, 0.02, 5.18, yy + 0.03, 0.34, 0xe8e2d8);
  for (let k = 0; k < 6; k++) bx(4.28 + k * 0.14, 0.93, 0.05, 4.38 + k * 0.14, 1.2, 0.3, [0xff5fd2, 0x2a1450, 0xffd23f, 0x7fd0ff, 0xb36cff, 0x1d1f22][k]);
  bx(4.3, 0.48, 0.06, 4.7, 0.72, 0.3, 0xffd6f0); bx(4.85, 0.48, 0.1, 5.1, 0.66, 0.28, 0x1d1f22);
  // ---- the wardrobe, with a mirror full of stickers
  bx(5.6, 0, 0, 7.0, 2.1, 0.6, 0xf4f1ec, ITRIM);
  bx(6.29, 0.1, 0.6, 6.31, 2.0, 0.61, 0xc9c2b6);
  bx(5.75, 0.6, 0.605, 6.2, 1.85, 0.61, 0xcfe0ea, IGLASS);
  for (const [y, c] of [[1.6, 0xff5fd2], [1.4, 0xffd23f], [1.1, 0x7fd0ff]]) bx(5.85 + (y * 7) % 0.2, y, 0.612, 5.95 + (y * 7) % 0.2, y + 0.08, 0.614, c);
  for (const x of [6.22, 6.38]) bx(x, 1.0, 0.6, x + 0.03, 1.2, 0.64, 0xc9ccd0, CHROME);
  // the bin, the shoe rack (sneakers), a beanbag
  cyl(6.5, 4.8, 0, 0.45, 0.2, 0xb36cff, PLAIN, 0.22);
  bx(1.8, 0, 5.55, 2.8, 0.42, 6.0, 0xffffff, PLAIN);
  for (const [x, c] of [[1.95, 0xf4f1ec], [2.25, 0xff5fd2], [2.55, 0x1d1f22]]) bx(x - 0.1, 0.42, 5.62, x + 0.08, 0.5, 5.95, c, FABRIC);
  B.ico(X + 6.58, Y + 0.22, Z + 3.25, 0.4, 0.55, 0xffd23f, FABRIC);
}

// the six things: one geometry each, around its own origin (render.js moves them)
export function thingInto(B, id) {
  switch (id) {
    case 'luva': // a crumpled black hoodie with a pink print
      B.box(-0.3, 0, -0.22, 0.3, 0.07, 0.22, 0x1d1f22, FABRIC, { skipBottom: false });
      B.box(-0.38, 0, -0.08, -0.3, 0.05, 0.16, 0x1d1f22, FABRIC); B.box(0.3, 0, -0.12, 0.42, 0.05, 0.12, 0x1d1f22, FABRIC);
      B.box(-0.1, 0.071, -0.06, 0.1, 0.075, 0.08, 0xff5fd2, PLAIN);
      break;
    case 'labubu': // a little toothy monster plush
      B.ico(0, 0.1, 0, 0.09, 1.1, 0xc8a27a, FABRIC); B.ico(0, 0.23, 0, 0.08, 1, 0xc8a27a, FABRIC);
      for (const s of [-1, 1]) B.box(s * 0.05 - 0.015, 0.29, -0.015, s * 0.05 + 0.015, 0.38, 0.015, 0xc8a27a, FABRIC);
      B.box(-0.04, 0.2, 0.07, 0.04, 0.215, 0.075, 0xffffff);
      break;
    case 'lightstick': // the concert lightstick: a handle and a glowing heart-ish head
      B.tube([0, 0.02, -0.15], [0, 0.02, 0.08], 0.022, 0.022, 8, 0x1d1f22, PLAIN, true);
      B.ico(0, 0.05, 0.14, 0.07, 0.8, 0xff5fd2, LIGHT);
      break;
    case 'pizza': // a pizza box from Sjuan
      B.box(-0.2, 0, -0.2, 0.2, 0.05, 0.2, 0xe9e1cf, PLAIN, { skipBottom: false });
      B.box(-0.12, 0.05, -0.04, 0.12, 0.052, 0.04, 0x2e7a46);
      break;
    case 'skate': // a skateboard with pink wheels
      B.box(-0.11, 0.07, -0.4, 0.11, 0.09, 0.4, 0x2a1450, PLAIN, { skipBottom: false });
      for (const z of [-0.28, 0.28]) for (const x of [-0.08, 0.08]) B.hcyl(x, 0.035, z, 0.04, 0.035, 'x', 8, 0xff5fd2);
      break;
    case 'lurar': // over-ear headphones
      for (const s of [-1, 1]) B.hcyl(s * 0.09, 0.05, 0, 0.04, 0.06, 'x', 10, 0xf4f1ec);
      B.tube([-0.09, 0.1, 0], [0, 0.17, 0], 0.012, 0.012, 6, 0xf4f1ec); B.tube([0, 0.17, 0], [0.09, 0.1, 0], 0.012, 0.012, 6, 0xf4f1ec);
      break;
  }
}
