// Kexfabriken on Västerholmen from the inside (v1.18, "Sjubydagen"): the production hall behind the docks. Biscuit
// line 1 runs round three sides of the hall like a U – from the dough mixer in the north-east corner west along
// the north wall, south down the west wall, and east along the south wall into the biscuit oven. Knäck puts Arne's
// recipe on the belt and starts it; the only emergency stop (NÖDSTOPP) is on the west wall, outside the U. The
// way in through the middle of the U is a dead end – the belt is in the way – so you go round by the south wall,
// past the flour pallets. Like the other insides it is built out at sea (INDOOR in config.js). Local coordinates:
// x east, z south, y up from the floor; the origin is the north-west corner. The door is in the east wall.
//
//   z=0  ┌──────────────────────────────────────────────────────┬ mixer ┐
//        │   ═════════════ belt (top leg, recipe goes west) ═════╡       │
//        │ ║                                                     └───────┤
//    NÖDSTOPP║          (inside the U: a dead end)          Knäck        door
//        │ ║                                                             │
//        │ ╚══════════ belt (bottom leg, east) ════════╡ OVEN  │         │
//        │        pallet             pallet            └───────┘         │
//   z=18 └───────────────────────────────────────────────────────────────┘
//        x=0                                                         x=28
import { INDOOR } from './config.js';
import { KEX } from './westisle.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, FLOORTILE = 31, FABRIC = 33, ITRIM = 34, IGLASS = 35, PLANKS = 26;
const IH = 2.6;
const S = 28, D = 18;
const X = INDOOR.x - 20, Y = INDOOR.y, Z = INDOOR.z + 44;
const at = (x, z, r, extra = {}) => ({ x: X + x, z: Z + z, r, ...extra });

// outside: the staff door at the south end of the loading docks (westisle.js draws it)
export const FAB_DOOR = { x: KEX.door.x + 0.9, z: KEX.door.z, r: 1.2 };

// the belt's centre line, from where the recipe is put on it (by the mixer) to the oven's mouth
const BELT_PTS = [[23.4, 4.1], [3.5, 4.1], [3.5, 14.1], [19.4, 14.1]];
export const BELT = (() => {
  const pts = BELT_PTS.map(([x, z]) => [X + x, Z + z]);
  const segs = [];
  let s = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push({ a: pts[i - 1], b: pts[i], s0: s, l }); s += l; }
  return { pts, segs, len: s, y: Y + 0.95 };
})();
// where on the belt something is that has come s metres: { x, z, dx, dz }
export function beltAt(s) {
  s = Math.max(0, Math.min(BELT.len, s));
  for (const g of BELT.segs) {
    if (s <= g.s0 + g.l + 1e-6) {
      const u = (s - g.s0) / g.l;
      return { x: g.a[0] + (g.b[0] - g.a[0]) * u, z: g.a[1] + (g.b[1] - g.a[1]) * u, dx: (g.b[0] - g.a[0]) / g.l, dz: (g.b[1] - g.a[1]) / g.l };
    }
  }
  const g = BELT.segs[BELT.segs.length - 1];
  return { x: g.b[0], z: g.b[1], dx: 1, dz: 0 };
}

export const FAB = {
  spawn: { x: X + 26.9, z: Z + 9.1, h: -Math.PI / 2 },      // a step inside the door, facing in (west)
  door: at(27.6, 9.1, 0.55),                                 // stand here and press GÅ UT
  knack: { x: X + 24.6, z: Z + 7.6, h: -Math.PI / 2 },       // by the mixer, at the start of the belt
  knackAfter: { x: X + 24.8, z: Z + 8.6, h: -1.0 },          // afterwards: Knäck, Pia and Ronny round you
  pia: { x: X + 25.8, z: Z + 9.6, h: -1.6 },
  ronny: { x: X + 26.0, z: Z + 7.5, h: -1.9 },
  youAfter: { x: X + 22.4, z: Z + 10.4, h: 2.2 },
  stop: at(0.95, 9.0, 1.05),                                 // the emergency stop on the west wall
  speed: 1.65,                                               // the belt, m/s: about 28 s from the mixer to the oven
  oven: { x: X + 19.5 },                                     // the recipe is lost when it gets this far along the bottom leg
  camTalk: { x: X + 24.2, y: 0.9, z: Z + 8.4, cam: { x: X + 20.6, y: Y + 5.4, z: Z + 13.6, fov: 58 } },
  camCaught: { x: X + 24.4, y: 0.95, z: Z + 9.0, cam: { x: X + 18.8, y: Y + 3.6, z: Z + 12.8, fov: 58 } },
  camStop: { x: X + 8, y: 0.8, z: Z + 9.6, cam: { x: X + 13.5, y: Y + 9.5, z: Z + 18.5, fov: 62 } },
  room: { x0: X, x1: X + S, z0: Z, z1: Z + D },
  bounds: { x0: X - 0.5, x1: X + S + 0.5, z0: Z - 0.5, z1: Z + D + 0.5 },
  y: Y,
};

const WALL = 0xdfe6ee;
// walls [x0, z0, x1, z1] (local, full height): the door gap is z 8.5–9.7 in the east wall
export const FAB_WALLS = [
  [-0.2, -0.2, S + 0.2, 0],
  [-0.2, 0, 0, D + 0.2],
  [-0.2, D, S + 0.2, D + 0.2],
  [S, 0, S + 0.2, 8.5],
  [S, 9.7, S + 0.2, D + 0.2],
];
// things that block the way [x0, z0, x1, z1, height]
export const FAB_FURN = [
  [3.0, 3.6, 24.2, 4.6, 0.95],      // the belt: the top leg (along the north wall)
  [3.0, 4.6, 4.0, 14.6, 0.95],      //           the west leg
  [4.0, 13.6, 19.5, 14.6, 0.95],    //           the bottom leg (to the oven)
  [24.2, 0, S, 6.2, 2.2],           // the dough mixer and its hopper, in the north-east corner
  [19.5, 12.0, 26.5, 16.4, 2.4],    // the biscuit oven
  [15.0, 14.6, 16.6, 16.4, 1.2],    // flour pallets in the south corridor: one against the belt …
  [9.0, 16.2, 10.6, D, 1.2],        // … and one against the south wall
  [8.4, 7.4, 12.6, 10.4, 1.4],      // the packing machine in the middle of the U
  [6.0, 0, 12.4, 0.95, 1.8],        // racks of cartons along the north wall
  [1.2, 0.4, 2.8, 1.3, 0.8],        // a desk in the north-west corner
  [S, 8.5, S + 0.2, 9.7, IH],       // the door (shut behind you)
];

const SIGNS = {
  linje: { def: { lines: ['KEXLINJE 1'], bg: '#1f4fa0', fg: '#ffffff', ppm: 120 }, x: 12, y: 2.1, z: 0.012, rot: 0, w: 1.8, h: 0.4 },
  nodstopp: { def: { lines: ['NÖDSTOPP'], bg: '#f2c21b', fg: '#c0302a', border: '#1d1f22', ppm: 160 }, x: 0.012, y: 1.95, z: 9.0, rot: Math.PI / 2, w: 1.0, h: 0.3 },
  ugn: { def: { lines: ['KEXUGN', '230 °C'], rows: true, bg: '#2d3238', fg: '#ffb347', ppm: 140 }, x: 23.0, y: 1.95, z: 11.988, rot: Math.PI, w: 1.3, h: 0.46 },
  ronny: { def: { lines: ['RÖKNING FÖRBJUDEN'], bg: '#ffffff', fg: '#c0302a', ppm: 140 }, x: S - 0.012, y: 2.0, z: 13.0, rot: -Math.PI / 2, w: 1.4, h: 0.26 },
};

export function fabLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of FAB_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of FAB_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs['fab-' + id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id: 'fab-' + id, x: X + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = FAB.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function fabInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r, n = 14, cap = true) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, n, c, m, cap);
  const tube = (a, b, r, c, m = PLAIN) => B.tube([X + a[0], Y + a[1], Z + a[2]], [X + b[0], Y + b[1], Z + b[2]], r, r, 6, c, m);
  const top = { top: { c: 0x2a2e34, m: IWALL } };
  // the floor: grey epoxy, yellow walkway lines, a flour-white patch by the mixer
  floor(0, 0, S, D, 0x7d848c, FLOORTILE);
  floor(22.6, 0.2, 27.8, 7.4, 0xd8d4c8, FLOORTILE, 0.005);
  for (const [x0, z0, x1, z1] of [[0.6, 14.9, 0.75, 17.4], [0.6, 17.25, 26.9, 17.4], [26.75, 10.3, 26.9, 17.4], [26.75, 2.0, 26.9, 8.2], [1.4, 5.0, 1.55, 14.9]]) floor(x0, z0, x1, z1, 0xf2c21b, PLAIN, 0.006);
  for (const [x0, z0, x1, z1] of FAB_WALLS) bx(x0, 0, z0, x1, IH, z1, WALL, IWALL, top);
  bx(S, 2.2, 8.5, S + 0.2, IH, 9.7, WALL, IWALL, top);
  bx(S - 0.06, 0, 8.56, S, 2.18, 9.64, 0x1f4fa0, ITRIM);
  bx(0, 2.0, 0, S, 2.3, 0.04, 0x1f4fa0);                        // a blue band along the walls
  bx(0, 2.0, D - 0.04, S, 2.3, D, 0x1f4fa0);
  // the belt: steel legs, a frame, a white band (render: the biscuits and the recipe on it)
  const beltBox = (x0, z0, x1, z1) => {
    bx(x0, 0.0, z0, x1, 0.82, z1, 0x9aa0a6, CHROME);
    bx(x0 + 0.05, 0.82, z0 + 0.05, x1 - 0.05, 0.93, z1 - 0.05, 0xe8e6e0, PLAIN);
    bx(x0, 0.93, z0, x1, 1.0, z0 + 0.06, 0x6b6f75, CHROME); bx(x0, 0.93, z1 - 0.06, x1, 1.0, z1, 0x6b6f75, CHROME);
  };
  beltBox(3.0, 3.6, 24.2, 4.6); beltBox(3.0, 4.6, 4.0, 14.6); beltBox(4.0, 13.6, 19.5, 14.6);
  for (let x = 4.6; x < 24; x += 0.9) bx(x, 0.931, 3.66, x + 0.05, 0.934, 4.54, 0xc8c4bc);
  for (let x = 4.6; x < 19.4; x += 0.9) bx(x, 0.931, 13.66, x + 0.05, 0.934, 14.54, 0xc8c4bc);
  for (let z = 5.0; z < 13.6; z += 0.9) bx(3.06, 0.931, z, 3.94, 0.934, z + 0.05, 0xc8c4bc);
  // the dough mixer: a hopper, a big drum, the chute down onto the belt
  bx(24.2, 0, 0, S, 1.0, 6.2, 0x6b6f75, CHROME);
  cyl(26.1, 2.6, 1.0, 2.2, 1.5, 0xb9bec4, CHROME, 1.5, 18);
  cyl(26.1, 2.6, 2.18, 2.2, 1.45, 0xd8c8a0, PLAIN, 1.45, 18);
  bx(23.3, 1.0, 3.5, 24.3, 1.6, 4.7, 0x9aa0a6, CHROME);
  bx(24.6, 1.0, 5.4, 25.4, 1.9, 6.15, 0x2d3238);
  bx(24.7, 1.55, 6.16, 24.95, 1.7, 6.2, 0x2fb35a, LIGHT); bx(25.05, 1.55, 6.16, 25.3, 1.7, 6.2, 0xd2342c, LIGHT);
  // the biscuit oven: a long steel box, its mouth to the west, a glowing window, a hood
  bx(19.5, 0, 12.0, 26.5, 2.4, 16.4, 0xb9bec4, CHROME);
  bx(19.48, 0.82, 13.5, 19.52, 1.25, 14.7, 0x1a1210);
  bx(20.4, 1.3, 11.98, 25.6, 1.7, 12.0, 0xff8a3a, LIGHT);
  bx(19.3, 2.4, 11.8, 26.7, 2.55, 16.6, 0x6b6f75, CHROME);
  for (let i = 0; i < 4; i++) bx(20 + i * 1.6, 0.3, 11.96, 20.8 + i * 1.6, 0.36, 12.0, 0x2d3238);
  // the packing machine in the middle of the U, with boxes of Sjubykex
  bx(8.4, 0, 7.4, 12.6, 1.4, 10.4, 0x1f4fa0, PLAIN);
  bx(8.6, 1.4, 7.6, 12.4, 1.6, 10.2, 0x6b6f75, CHROME);
  for (let i = 0; i < 4; i++) bx(12.7, 0, 7.6 + i * 0.7, 13.3, 0.45, 8.2 + i * 0.7, 0xf2c21b, PLAIN);
  // flour pallets in the south corridor
  for (const [x0, z0] of [[15.0, 14.6], [9.0, 16.2]]) {
    bx(x0, 0, z0, x0 + 1.6, 0.14, z0 + 1.8, 0xa98257, PLANKS);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) B.rbox(X + x0 + 0.42 + j * 0.76, Y + 0.14 + i * 0.32, Z + z0 + 0.9, 0.72, 0.32, 1.7, 0.03 * (i - 1), 0xe8e2d0, FABRIC);
  }
  // the emergency stop: a yellow box with a big red mushroom button, on the west wall
  bx(0.0, 1.0, 8.75, 0.22, 1.5, 9.25, 0xf2c21b);
  cyl(0.28, 9.0, 1.25, 1.25, 0.001, 0xd2342c);
  B.hcyl(X + 0.3, Y + 1.25, Z + 9.0, 0.16, 0.12, 'x', 12, 0xd2342c, PLAIN);
  // racks of cartons along the north wall, and a desk in the north-west corner
  for (let i = 0; i < 3; i++) bx(6.0 + i * 2.1, 0, 0.04, 7.8 + i * 2.1, 1.8, 0.9, 0xc8b890, PLANKS);
  bx(1.2, 0, 0.4, 2.8, 0.75, 1.3, 0x5a6068); bx(1.3, 0.75, 0.5, 2.7, 0.78, 1.2, 0xf4f4f0, PLAIN);
  // lamps over the line
  for (const [x, z] of [[6, 4.1], [13, 4.1], [20, 4.1], [3.5, 9], [8, 14.1], [15, 14.1]]) { tube([x, IH, z], [x, 2.25, z], 0.008, 0x2d3238); cyl(x, z, 2.1, 2.25, 0.22, 0x2d3238, PLAIN, 0.06, 10, false); B.ico(X + x, Y + 2.1, Z + z, 0.08, 1, 0xfff1c9, LIGHT); }
  void IGLASS;
}
