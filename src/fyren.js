// The lighthouse on Norrholmen from the inside (v1.15, "Skatans bo"): three floors, one above the other,
// built side by side out at sea (INDOOR in config.js) like the other insides. You go between them on the
// stairs (UPP / NER, a fade like the lift in the tower – indoors.js):
//   0  Ingvar's kitchen at the bottom: the wood stove, the kitchen bench, the round table with two chairs,
//      his bunk, a sea chest, the ship's clock and the barometer – and the spiral stairs in the north-east.
//   1  the watch room: shelf after shelf of logbooks (fifty years of them), the desk with the open logbook,
//      the brass telescope at the window, the radio – the spiral stairs down, and the ladder up to the hatch.
//   2  the lantern: a low iron wall with glass all round, the great lens on its pedestal in the middle (the
//      magpie's nest on top of it, until "Skatans bo"), the hatch down in the floor, a pane open to the gallery.
// The rooms are octagons (the corners cut off), 8 × 8 m. Local coordinates: x east, z south, y up from the
// floor; the origin is each room's north-west corner.
//
//   kitchen             watch room            lantern
//   ╱ win    stairs╲    ╱ ladder  stairs╲     ╱ hatch       ╲
//   stove   Ingvar      telescope   shelves   │   ┌──────┐  open
//   bench  (table) bunk             shelves   │   │ lens │  pane
//          Elsa   chest radio  desk           │   └──────┘
//   ╲      door    ╱    ╲                ╱    ╲             ╱
import { INDOOR } from './config.js';
import { ISLE } from './island.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, STONE = 25, PLANKS = 26, IWALL = 29, PARQUET = 30, FABRIC = 33, ITRIM = 34, IGLASS = 35;
export const FYR_IH = 2.6;
const S = 8;                                     // the rooms are S × S
const Y = INDOOR.y, Z = INDOOR.z + 46;
const XS = [INDOOR.x + 28, INDOOR.x + 43, INDOOR.x + 58]; // the three floors, west to east
const at = (k, x, z, r, extra = {}) => ({ x: XS[k] + x, z: Z + z, r, ...extra });

// outside: the green door on the tower's east face, up the stone steps (island.js)
// (a coastal fence runs close by on the east, so the way up is from the south side of the steps)
const L = ISLE.lighthouse, NX = Math.cos(-Math.PI / 12), NZ = Math.sin(-Math.PI / 12);
export const fyrAt = (d, t = 0) => ({ x: L.x + NX * d - NZ * t, z: L.z + NZ * d + NX * t });   // d out from the tower, t south along the face
export const FYR_DOOR = { ...fyrAt(4.6, 1.0), r: 1.4, h: Math.atan2(NX, NZ) };
export const FYR_OUT = { ...fyrAt(5.0, 1.7), h: Math.atan2(NX, NZ) + 0.6 };            // where you come out (south-east)
// (the lit lamp, for render.js: where the light is)
export const FYR_LAMP = { x: L.x, y: 14.7, z: L.z };

export const FYR = {
  floors: XS.map((x0) => ({ x0, x1: x0 + S, z0: Z, z1: Z + S })),
  spawn: { x: XS[0] + 4.0, z: Z + 6.75, h: Math.PI },          // a step inside the door, facing north
  door: at(0, 4.0, 7.45, 0.6),                                  // stand here and press GÅ UT
  // the stairs: where you press UPP / NER on each floor, and where you come out on the floor you go to
  stairs: [
    { up: at(0, 5.15, 1.55, 0.75), upTo: { x: XS[1] + 4.6, z: Z + 2.55, h: Math.PI * 0.85 } },
    { down: at(1, 5.15, 1.55, 0.7), downTo: { x: XS[0] + 4.6, z: Z + 2.55, h: Math.PI * 0.85 },
      up: at(1, 1.0, 2.15, 0.7), upTo: { x: XS[2] + 2.3, z: Z + 2.3, h: Math.PI * 0.75 } },
    { down: at(2, 1.55, 1.55, 0.75), downTo: { x: XS[1] + 1.5, z: Z + 3.0, h: Math.PI * 0.6 } },
  ],
  // the kitchen: Ingvar north of the round table, Elsa east of it; hand them things from the south side
  table: { x: XS[0] + 2.6, y: Y + 0.76, z: Z + 4.4 },
  ingvar: { x: XS[0] + 2.6, z: Z + 3.32, h: 0 },
  elsa: { x: XS[0] + 3.72, z: Z + 4.45, h: -Math.PI / 2 },
  give: at(0, 2.6, 5.55, 0.9),
  // the watch room: the desk with the open logbook
  desk: at(1, 4.0, 6.55, 0.8),
  book: { x: XS[1] + 4.0, y: Y + 0.82, z: Z + 7.55 },
  // the lantern: the lens and the nest on top of it, where you take it, where the lamp is lit
  lens: { x: XS[2] + 4.0, z: Z + 4.0 },
  nest: { x: XS[2] + 4.0, y: Y + 2.3, z: Z + 4.0 },
  take: at(2, 5.75, 4.0, 0.8),
  light: at(2, 4.0, 5.8, 0.8),
  lampIngvar: { x: XS[2] + 5.85, z: Z + 4.55, h: -Math.PI / 2 },
  lampElsa: { x: XS[2] + 5.55, z: Z + 5.75, h: -Math.PI * 0.75 },
  window: { x: XS[2] + S + 0.6, y: Y + 1.8, z: Z + 4.0 },       // the pane open to the gallery (east)
  // cameras: the kitchen table from the stove's corner, the lantern from above the hatch
  camKitchen: { x: XS[0] + 3.0, y: 0.9, z: Z + 4.3, cam: { x: XS[0] + 6.4, y: Y + 3.6, z: Z + 7.4, fov: 58 } },
  camLantern: { x: XS[2] + 4.3, y: 1.2, z: Z + 4.6, cam: { x: XS[2] + 1.0, y: Y + 4.3, z: Z + 0.6, fov: 62 } },
  bounds: { x0: XS[0] - 0.5, x1: XS[2] + S + 0.5, z0: Z - 0.5, z1: Z + S + 0.5 },
  room: { x0: XS[0], x1: XS[0] + S, z0: Z, z1: Z + S },
  y: Y,
};
// which floor a point is on (0, 1, 2), or -1
export function fyrFloor(x, z) {
  if (z < Z - 0.6 || z > Z + S + 0.6) return -1;
  for (let k = 0; k < 3; k++) if (x > XS[k] - 0.6 && x < XS[k] + S + 0.6) return k;
  return -1;
}

const WALL = 0xeee9dc, BEAM = 0x5a4a3a, WOOD = 0x8a6440;
// the walls of each floor [x0, z0, x1, z1] (local, full height); the kitchen has its door gap x 3.5–4.5 south
const RING = [[-0.2, -0.2, S + 0.2, 0], [-0.2, 0, 0, S + 0.2], [S, 0, S + 0.2, S + 0.2]];
export const FYR_WALLS = [
  [...RING, [-0.2, S, 3.5, S + 0.2], [4.5, S, S + 0.2, S + 0.2]],
  [...RING, [-0.2, S, S + 0.2, S + 0.2]],
  [...RING, [-0.2, S, S + 0.2, S + 0.2]],
];
// the cut-off corners (two steps each), the same on every floor
const CORNERS = [
  [0, 0, 1.2, 0.6], [0, 0.6, 0.6, 1.2],
  [S - 1.2, 0, S, 0.6], [S - 0.6, 0.6, S, 1.2],
  [0, S - 0.6, 1.2, S], [0, S - 1.2, 0.6, S - 0.6],
  [S - 1.2, S - 0.6, S, S], [S - 0.6, S - 1.2, S, S - 0.6],
];
const STAIR = [5.7, 0.55, 7.45, 2.45];           // the spiral stairs (north-east), on floors 0 and 1
// things that block the way [x0, z0, x1, z1, height], per floor
export const FYR_FURN = [
  [
    [...STAIR, FYR_IH],
    [0, 2.3, 0.75, 3.3, 1.05],      // the wood stove
    [0, 3.3, 0.65, 5.6, 0.92],      // the kitchen bench
    [2.1, 3.9, 3.1, 4.9, 0.76],     // the round table
    [7.1, 3.3, S, 5.7, 0.62],       // Ingvar's bunk
    [6.3, 6.0, 7.3, 6.55, 0.55],    // the sea chest
    [3.5, S, 4.5, S + 0.2, FYR_IH], // the door (shut behind you)
  ],
  [
    [...STAIR, FYR_IH],
    [0, 1.65, 0.45, 2.65, FYR_IH],  // the ladder up to the lantern
    [7.45, 2.8, S, 6.6, 2.25],      // the logbook shelves along the east wall
    [2.8, 7.2, 5.2, S, 0.82],       // the desk with the open logbook
    [0.45, 4.6, 1.35, 5.5, 1.4],    // the telescope on its tripod at the west window
    [6.3, 6.95, 7.3, 7.6, 0.85],    // the radio table
  ],
  [
    [2.85, 2.85, 5.15, 5.15, 1.05], // the lens on its pedestal
  ],
];

const SIGNS = {
  bord: { k: 0, def: { lines: ['FYREN', 'NORRHOLMEN', '1897'], rows: true, bg: '#2d3238', fg: '#f2efe6', border: '#c0302a', ppm: 150 }, x: 3.0, y: 1.9, z: 0.012, rot: 0, w: 0.9, h: 0.62 },
  karta: { k: 1, def: { lines: ['SJÖKORT', 'SJUBY · NORRHOLMEN', 'SÖDERHOLMEN'], rows: true, bg: '#e8dcb8', fg: '#2c4a6a', border: '#2c4a6a', ppm: 150 }, x: 3.6, y: 1.6, z: 0.012, rot: 0, w: 1.3, h: 0.85 },
  logg: { k: 1, def: { lines: ['LOGGBÖCKER', '1974 –'], rows: true, bg: '#2d3238', fg: '#f2efe6', ppm: 160 }, x: S - 0.57, y: 2.42, z: 4.7, rot: -Math.PI / 2, w: 1.1, h: 0.32 },
};

export function fyrLayout() {
  const colliders = [];
  for (let k = 0; k < 3; k++) {
    const X = XS[k], ih = k === 2 ? 2.45 : FYR_IH;
    const add = (x0, z0, x1, z1, h) => colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
    for (const [x0, z0, x1, z1] of FYR_WALLS[k]) add(x0, z0, x1, z1, ih);
    for (const [x0, z0, x1, z1] of CORNERS) add(x0, z0, x1, z1, ih);
    for (const [x0, z0, x1, z1, h] of FYR_FURN[k]) add(x0, z0, x1, z1, h);
  }
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs['fyr-' + id] = { w: s.w, h: s.h, ...s.def };
    signPrims.push({ t: 'sign', id: 'fyr-' + id, x: XS[s.k] + s.x + Math.sin(s.rot) * 0.03, y: Y + s.y, z: Z + s.z + Math.cos(s.rot) * 0.03, w: s.w, h: s.h, rot: s.rot });
  }
  const B = FYR.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs, signPrims };
}

export function fyrInto(B) {
  for (let k = 0; k < 3; k++) floorInto(B, k);
}

function floorInto(B, k) {
  const X = XS[k];
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r, n = 12, cap = true) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, n, c, m, cap);
  const tube = (a, b, r, c, m = PLAIN) => B.tube([X + a[0], Y + a[1], Z + a[2]], [X + b[0], Y + b[1], Z + b[2]], r, r, 6, c, m);
  const ico = (x, y, z, r, sy, c, m = PLAIN) => B.ico(X + x, Y + y, Z + z, r, sy, c, m);
  const rb = (cx, cy, cz, sx, sy, sz, rot, c, m = PLAIN, tilt = 0) => B.rbox(X + cx, Y + cy, Z + cz, sx, sy, sz, rot, c, m, tilt);
  const top = { top: { c: 0x2a2e34, m: IWALL } };

  if (k < 2) {
    // ---- the round walls (whitewashed stone, a dark beam along the top) and the floor
    floor(0, 0, S, S, k === 0 ? 0x8a6a48 : 0x7a6450, PARQUET);
    for (const [x0, z0, x1, z1] of FYR_WALLS[k]) bx(x0, 0, z0, x1, FYR_IH, z1, WALL, IWALL, top);
    for (const [cx, cz, rot] of [[0.6, 0.6, -Math.PI / 4], [S - 0.6, 0.6, Math.PI / 4], [0.6, S - 0.6, Math.PI / 4], [S - 0.6, S - 0.6, -Math.PI / 4]]) {
      rb(cx, 0, cz, 1.75, FYR_IH, 0.16, rot, WALL, IWALL);
      rb(cx, FYR_IH - 0.22, cz, 1.75, 0.16, 0.2, rot, BEAM);
    }
    for (const [x0, z0, x1, z1] of [[1.2, 0.01, S - 1.2, 0.06], [1.2, S - 0.06, S - 1.2, S - 0.01]]) bx(x0, FYR_IH - 0.22, z0, x1, FYR_IH - 0.06, z1, BEAM);
    for (const [x0, z0, x1, z1] of [[0.01, 1.2, 0.06, S - 1.2], [S - 0.06, 1.2, S - 0.01, S - 1.2]]) bx(x0, FYR_IH - 0.22, z0, x1, FYR_IH - 0.06, z1, BEAM);
    // small deep windows
    const win = (x, z, axis) => {
      const ax = axis === 'x' ? 1 : 0, az = 1 - ax, inX = x < 1 ? 1 : x > S - 1 ? -1 : 0, inZ = z < 1 ? 1 : z > S - 1 ? -1 : 0;
      bx(x - ax * 0.35 - inX * 0.0, 1.35, z - az * 0.35, x + ax * 0.35 + inX * 0.22, 1.4, z + az * 0.35 + inZ * 0.22, WALL, ITRIM);
      bx(x - ax * 0.32, 1.4, z - az * 0.32, x + ax * 0.32 + inX * 0.02, 2.05, z + az * 0.32 + inZ * 0.02, 0xbcd6e6, IGLASS);
      bx(x - ax * 0.02 - az * 0.0, 1.4, z - az * 0.02, x + ax * 0.02 + inX * 0.04, 2.05, z + az * 0.02 + inZ * 0.04, 0x2d3238);
    };
    // the spiral stairs: a white iron column and wedge-shaped steps winding up (and a dark hole above)
    const sx = 6.55, sz = 1.5;
    cyl(sx, sz, 0, FYR_IH, 0.09, 0xf2efe8, PLAIN, 0.09, 8);
    for (let i = 0; i < 11; i++) {
      const a = (k === 0 ? 2.6 : 0.4) + i * 0.52, y = 0.12 + i * 0.22;
      rb(sx + Math.cos(a) * 0.48, y, sz + Math.sin(a) * 0.48, 0.86, 0.06, 0.36, -a, 0x3a3c41, CHROME);
      tube([sx + Math.cos(a) * 0.9, y, sz + Math.sin(a) * 0.9], [sx + Math.cos(a) * 0.9, y + 0.85, sz + Math.sin(a) * 0.9], 0.015, 0x2d3238);
    }
    for (let i = 0; i < 10; i++) { const a0 = (k === 0 ? 2.6 : 0.4) + i * 0.52, a1 = a0 + 0.52, y0 = 0.97 + i * 0.22; tube([sx + Math.cos(a0) * 0.9, y0, sz + Math.sin(a0) * 0.9], [sx + Math.cos(a1) * 0.9, y0 + 0.22, sz + Math.sin(a1) * 0.9], 0.02, 0x2d3238); }
    bx(5.9, FYR_IH - 0.04, 0.7, 7.3, FYR_IH, 2.3, 0x14161a);
    if (k === 0) {
      // ---------------------------------------------------------------- Ingvar's kitchen
      win(0, 1.5, 'z'); win(3.0, 0, 'x'); win(S, 6.3, 'z');
      bx(3.56, 0, S, 4.44, 2.15, S + 0.06, 0x2f5d3a, ITRIM);                          // the green door
      bx(4.25, 1.0, S - 0.03, 4.33, 1.1, S, 0xc9ccd0, CHROME);
      bx(3.4, 0, S - 0.9, 4.6, 0.012, S - 0.15, 0x7a3a2a, FABRIC);                     // the door mat
      // the coat hooks by the door: a yellow sou'wester and an oilskin
      bx(2.4, 1.72, S - 0.05, 3.3, 1.78, S - 0.01, BEAM);
      rb(2.62, 1.1, S - 0.14, 0.5, 0.62, 0.16, 0, 0xf2c21b, FABRIC);
      ico(3.08, 1.62, S - 0.16, 0.16, 0.6, 0xf2c21b, FABRIC);
      // a rag rug under the table, in stripes
      for (let i = 0; i < 6; i++) floor(1.4, 3.3 + i * 0.32, 3.9, 3.62 + i * 0.32, [0xc0302a, 0xf2efe6, 0x2c62a8][i % 3], FABRIC, 0.006);
      // the wood stove: black iron, a kettle, the pipe up into the wall
      bx(0, 0, 2.3, 0.75, 0.9, 3.3, 0x1d1f22, CHROME, { skipBottom: false });
      bx(0, 0.9, 2.28, 0.77, 0.96, 3.32, 0x2a2b2f, CHROME);
      bx(0.74, 0.25, 2.55, 0.77, 0.6, 3.05, 0x3a2a20);
      bx(0.76, 0.32, 2.62, 0.78, 0.52, 2.98, 0xff8a3a, LIGHT);                         // the fire behind the little door
      cyl(0.32, 2.75, 0.96, 1.18, 0.11, 0x6b6f75, CHROME, 0.09);
      tube([0.42, 1.12, 2.75], [0.55, 1.15, 2.75], 0.02, 0x6b6f75, CHROME);
      cyl(0.3, 3.0, 0.96, FYR_IH, 0.07, 0x2a2b2f);
      // the kitchen bench: cupboards, a sink, a coffee pot, the cupboards above with plates
      bx(0, 0, 3.3, 0.62, 0.86, 5.6, 0xe7e4dc, ITRIM);
      bx(0, 0.86, 3.28, 0.66, 0.92, 5.62, 0x8a6440, PLANKS, { skipBottom: false });
      for (let z = 3.85; z < 5.6; z += 0.58) bx(0.62, 0.1, z - 0.005, 0.625, 0.8, z + 0.005, 0x9a978f);
      bx(0.1, 0.921, 4.2, 0.5, 0.925, 4.75, 0x6f757c, CHROME);
      tube([0.08, 0.92, 4.48], [0.08, 1.2, 4.48], 0.015, 0xb9bec4, CHROME); tube([0.08, 1.2, 4.48], [0.28, 1.2, 4.48], 0.015, 0xb9bec4, CHROME);
      cyl(0.35, 5.2, 0.92, 1.12, 0.07, 0xc0302a, PLAIN, 0.055); cyl(0.35, 5.2, 1.12, 1.16, 0.03, 0x2d3238);
      bx(0, 1.45, 3.3, 0.32, 2.1, 5.6, 0xe7e4dc, ITRIM);
      for (let i = 0; i < 5; i++) cyl(0.35, 3.55 + i * 0.12, 1.47, 1.49, 0.11, 0xf4f4f0, PLAIN, 0.11, 10); // plates
      // the round table with a checked cloth, two coffee cups, a plate of buns, a candle
      cyl(2.6, 4.4, 0, 0.72, 0.06, BEAM, PLAIN, 0.06, 8);
      cyl(2.6, 4.4, 0.72, 0.76, 0.55, 0x8a6440, PLAIN, 0.55, 18);
      cyl(2.6, 4.4, 0.755, 0.765, 0.58, 0xd65a52, FABRIC, 0.58, 18);
      for (const [x, z] of [[2.45, 4.05], [2.95, 4.5]]) { cyl(x, z, 0.765, 0.83, 0.045, 0xf4f4f0, PLAIN, 0.04); cyl(x, z, 0.765, 0.775, 0.07, 0xf4f4f0, PLAIN, 0.07); }
      cyl(2.45, 4.7, 0.765, 0.78, 0.15, 0xf4f4f0, PLAIN, 0.16, 12);
      for (let i = 0; i < 3; i++) ico(2.38 + i * 0.08, 0.8, 4.7 + (i % 2) * 0.05, 0.045, 0.6, 0xc07a32);
      cyl(2.75, 4.25, 0.765, 0.9, 0.025, 0xf6f3ea); ico(2.75, 0.93, 4.25, 0.015, 1.8, 0xffcf33, LIGHT);
      // two wooden chairs (Ingvar's north of the table, one east of it)
      const chair = (x, z, rot) => {
        rb(x, 0.42, z, 0.44, 0.04, 0.44, rot, WOOD, PLAIN);
        for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) bx(x + dx - 0.02, 0, z + dz - 0.02, x + dx + 0.02, 0.42, z + dz + 0.02, BEAM);
        rb(x - Math.sin(rot) * 0.2, 0.46, z - Math.cos(rot) * 0.2, 0.44, 0.48, 0.04, rot, WOOD, PLAIN);
      };
      chair(2.6, 3.62, 0); chair(3.38, 4.4, -Math.PI / 2);
      // Ingvar's bunk with a grey blanket, a pillow, a shelf of paperbacks above it
      bx(7.1, 0, 3.3, S, 0.45, 5.7, 0x6a4a32, PLANKS, { skipBottom: false });
      bx(7.12, 0.45, 3.32, S, 0.6, 5.68, 0x8a9096, FABRIC);
      bx(7.3, 0.6, 3.4, S - 0.1, 0.72, 3.85, 0xf2efe6, FABRIC);
      for (let i = 0; i < 4; i++) bx(7.12, 0.6, 4.2 + i * 0.36, S, 0.62, 4.32 + i * 0.36, 0x6b2f2a, FABRIC);
      bx(S - 0.3, 1.45, 3.4, S, 1.49, 5.5, BEAM);
      for (let i = 0; i < 14; i++) bx(S - 0.26, 1.49, 3.45 + i * 0.13, S - 0.04, 1.49 + 0.17 + (i % 3) * 0.03, 3.55 + i * 0.13, [0x2c62a8, 0xc0302a, 0xd9b45a, 0x3d7a3a, 0xf2efe6][i % 5]);
      // the sea chest at the foot of the bunk, with rope handles
      bx(6.3, 0, 6.0, 7.3, 0.5, 6.55, 0x2c4a6a, PLANKS, { skipBottom: false });
      bx(6.28, 0.5, 5.98, 7.32, 0.56, 6.57, 0x2a3c55, PLANKS);
      for (const x of [6.3, 7.3]) tube([x, 0.38, 6.15], [x, 0.38, 6.4], 0.025, 0xc8b88a);
      // the ship's clock and the barometer on the east wall, a lifebuoy by the stairs
      bx(S - 0.07, 1.42, 2.27, S - 0.02, 1.7, 2.53, 0xc9a24a, CHROME);
      bx(S - 0.09, 1.45, 2.3, S - 0.07, 1.67, 2.5, 0xf6f3ea);
      bx(S - 0.1, 1.55, 2.39, S - 0.09, 1.65, 2.41, 0x1d1f22); bx(S - 0.1, 1.55, 2.39, S - 0.09, 1.57, 2.5, 0x1d1f22);
      bx(S - 0.07, 1.4, 2.85, S - 0.02, 1.7, 3.1, 0x6a4a32); bx(S - 0.09, 1.45, 2.9, S - 0.07, 1.65, 3.05, 0xf2efe6);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; bx(5.3 + Math.cos(a) * 0.26 - 0.04, 1.3 + Math.sin(a) * 0.26 - 0.04, 0.02, 5.3 + Math.cos(a) * 0.26 + 0.04, 1.3 + Math.sin(a) * 0.26 + 0.04, 0.07, i % 3 ? 0xf2efe6 : 0xc0302a); }
    } else {
      // ---------------------------------------------------------------- the watch room
      win(0, 5.0, 'z'); win(S, 1.6, 'z'); win(2.0, S, 'x');
      // the ladder up to the hatch (a square of light at the top)
      for (const z of [1.7, 2.6]) tube([0.32, 0, z], [0.18, FYR_IH, z], 0.035, 0x9a7a52);
      for (let i = 1; i < 9; i++) tube([0.32 - i * 0.016, i * 0.3, 1.7], [0.32 - i * 0.016, i * 0.3, 2.6], 0.025, 0x9a7a52);
      bx(0, FYR_IH - 0.03, 1.55, 0.8, FYR_IH, 2.75, 0xfff1c9, LIGHT);
      // shelves of logbooks along the east wall: fifty years, spine after spine
      bx(7.45, 0, 2.8, S, 2.25, 6.6, 0x6a4a32, PLANKS);
      for (let r = 0; r < 5; r++) {
        bx(7.42, 0.08 + r * 0.44, 2.82, 7.46, 0.12 + r * 0.44, 6.58, 0x5a3a22);
        for (let i = 0; i < 26; i++) {
          const z = 2.88 + i * 0.142, hgt = 0.28 + ((i * 7 + r * 3) % 5) * 0.015;
          bx(7.5, 0.12 + r * 0.44, z, 7.92, 0.12 + r * 0.44 + hgt, z + 0.12, [0x2c4a6a, 0x6b2f2a, 0x3d5a3a, 0x2d3238, 0x7a5a2a][(i + r * 2) % 5], FABRIC);
        }
      }
      // the desk with the open logbook, a pen, a lamp; a chair
      bx(2.8, 0.78, 7.2, 5.2, 0.82, S, 0x8a6440, PLANKS, { skipBottom: false });
      for (const [x, z] of [[2.85, 7.25], [5.1, 7.25], [2.85, 7.9], [5.1, 7.9]]) bx(x, 0, z, x + 0.05, 0.78, z + 0.05, BEAM);
      rb(4.0, 0.82, 7.55, 0.62, 0.03, 0.42, 0, 0xf6f0e0); rb(4.0, 0.84, 7.55, 0.02, 0.012, 0.42, 0, 0xc8b88a);
      for (let i = 0; i < 5; i++) bx(3.75 + (i % 2) * 0.32, 0.853, 7.4 + i * 0.06, 3.95 + (i % 2) * 0.32, 0.856, 7.41 + i * 0.06, 0x2c4a6a);
      tube([4.45, 0.84, 7.35], [4.6, 0.85, 7.6], 0.008, 0x1d1f22);
      cyl(2.95, 7.7, 0.82, 0.85, 0.08, 0x2d3238); tube([2.95, 0.85, 7.7], [3.1, 1.25, 7.65], 0.012, 0x2d3238); cyl(3.15, 7.6, 1.15, 1.27, 0.03, 0x2c62a8, PLAIN, 0.12); ico(3.15, 1.15, 7.6, 0.04, 0.6, 0xfff1c9, LIGHT);
      rb(4.0, 0.44, 6.85, 0.44, 0.04, 0.44, 0, WOOD); for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) bx(4.0 + dx - 0.02, 0, 6.85 + dz - 0.02, 4.0 + dx + 0.02, 0.44, 6.85 + dz + 0.02, BEAM);
      // the brass telescope on its tripod, pointing out of the west window
      for (const a of [0.4, 2.5, 4.6]) tube([0.9, 1.25, 5.05], [0.9 + Math.cos(a) * 0.4, 0, 5.05 + Math.sin(a) * 0.4], 0.02, 0x6a4a32);
      tube([1.2, 1.3, 5.05], [0.2, 1.48, 5.0], 0.06, 0xc9a24a, CHROME);
      tube([0.2, 1.48, 5.0], [0.06, 1.5, 5.0], 0.075, 0xa8843a, CHROME);
      // the radio on its table, with a red light; a stool
      bx(6.3, 0.8, 6.95, 7.3, 0.85, 7.6, 0x8a6440, PLANKS, { skipBottom: false });
      for (const [x, z] of [[6.35, 7.0], [7.2, 7.0], [6.35, 7.5], [7.2, 7.5]]) bx(x, 0, z, x + 0.05, 0.8, z + 0.05, BEAM);
      bx(6.45, 0.85, 7.15, 7.15, 1.2, 7.55, 0x3a3c41, CHROME);
      bx(6.5, 0.9, 7.14, 6.9, 1.12, 7.15, 0x9aa8a0); bx(7.0, 1.05, 7.13, 7.06, 1.11, 7.14, 0xff3a2a, LIGHT);
      tube([6.8, 1.2, 7.4], [6.95, 1.75, 7.45], 0.006, 0x2d3238);
      // a stove pipe from below, through the floor and up
      cyl(0.3, 3.0, 0, FYR_IH, 0.07, 0x2a2b2f);
    }
    return;
  }

  // ---------------------------------------------------------------- the lantern
  floor(0, 0, S, S, 0x5a5e64, STONE);
  for (let i = 0; i < 8; i++) floor(0.4 + i * 0.9, 0.3, 0.42 + i * 0.9, S - 0.3, 0x3a3c41, PLAIN, 0.005);   // iron floor plates
  // the low iron wall all round, then glass panes in black frames up to the top ring
  const LOW = 0.95, TOPY = 2.45, IRON = 0x2d3238;
  for (const [x0, z0, x1, z1] of FYR_WALLS[2]) bx(x0, 0, z0, x1, LOW, z1, 0xf2efe8, IWALL, top);
  for (const [cx, cz, rot] of [[0.6, 0.6, -Math.PI / 4], [S - 0.6, 0.6, Math.PI / 4], [0.6, S - 0.6, Math.PI / 4], [S - 0.6, S - 0.6, -Math.PI / 4]]) {
    rb(cx, 0, cz, 1.75, LOW, 0.16, rot, 0xf2efe8, IWALL);
    rb(cx, LOW, cz, 1.75, TOPY - LOW, 0.06, rot, 0xcfe4ee, IGLASS);
    rb(cx, TOPY - 0.1, cz, 1.75, 0.12, 0.14, rot, IRON);
  }
  // glass on the four straight sides (the east one has a pane open to the gallery)
  const pane = (x0, z0, x1, z1) => bx(x0, LOW, z0, x1, TOPY - 0.08, z1, 0xcfe4ee, IGLASS);
  pane(1.2, -0.06, S - 1.2, 0.0); pane(1.2, S, S - 1.2, S + 0.06); pane(-0.06, 1.2, 0.0, S - 1.2);
  pane(S, 1.2, S + 0.06, 3.5); pane(S, 4.5, S + 0.06, S - 1.2);
  for (const t of [1.2, 2.6, 4.0, 5.4, S - 1.2]) {
    bx(t - 0.04, LOW, -0.08, t + 0.04, TOPY, 0.02, IRON); bx(t - 0.04, LOW, S - 0.02, t + 0.04, TOPY, S + 0.08, IRON);
    bx(-0.08, LOW, t - 0.04, 0.02, TOPY, t + 0.04, IRON); if (t !== 4.0) bx(S - 0.02, LOW, t - 0.04, S + 0.08, TOPY, t + 0.04, IRON);
  }
  for (const [x0, z0, x1, z1] of [[1.2, -0.08, S - 1.2, 0.02], [1.2, S - 0.02, S - 1.2, S + 0.08], [-0.08, 1.2, 0.02, S - 1.2], [S - 0.02, 1.2, S + 0.08, S - 1.2]]) bx(x0, TOPY - 0.1, z0, x1, TOPY, z1, IRON);
  bx(S - 0.02, LOW, 3.5, S + 0.08, LOW + 0.05, 4.5, IRON);
  rb(S + 0.42, LOW, 4.0, 0.06, TOPY - LOW - 0.12, 1.0, Math.PI / 2 + 0.9, 0xcfe4ee, IGLASS);              // the open pane, swung out
  // outside the glass: the gallery's railing and the sky beyond (a pale band to look out at)
  for (const [x0, z0, x1, z1] of [[-1.2, -1.25, S + 1.2, -1.2], [-1.2, S + 1.2, S + 1.2, S + 1.25], [-1.25, -1.2, -1.2, S + 1.2], [S + 1.2, -1.2, S + 1.25, S + 1.2]]) bx(x0, 0.95, z0, x1, 1.0, z1, IRON);
  floor(-1.2, -1.2, S + 1.2, -0.08, 0x3a3c41, PLAIN, -0.001); floor(-1.2, S + 0.08, S + 1.2, S + 1.2, 0x3a3c41, PLAIN, -0.001);
  floor(-1.2, -0.08, -0.08, S + 0.08, 0x3a3c41, PLAIN, -0.001); floor(S + 0.08, -0.08, S + 1.2, S + 0.08, 0x3a3c41, PLAIN, -0.001);
  for (let i = 0; i <= 8; i++) { const t = -1.2 + i * (S + 2.4) / 8; for (const [x, z] of [[t, -1.22], [t, S + 1.22], [-1.22, t], [S + 1.22, t]]) bx(x - 0.02, 0, z - 0.02, x + 0.02, 0.95, z + 0.02, IRON); }
  // the hatch down in the floor (north-west): a dark square with its lid open
  bx(1.1, 0.0, 1.1, 2.0, 0.008, 2.0, 0x0c0d0f);
  rb(1.55, 0, 2.05, 0.92, 0.6, 0.05, 0, 0x5a5e64, PLAIN, 0); for (let i = 0; i < 3; i++) bx(1.15 + i * 0.3, 0.01, 1.15, 1.2 + i * 0.3, 0.02, 1.95, 0x9a7a52);
  // the lens on its pedestal: a brass ring, glass prisms in rows, the lamp inside (render.js lights it)
  cyl(4.0, 4.0, 0, 0.95, 1.12, 0x3a3c41, CHROME, 1.0, 12);
  cyl(4.0, 4.0, 0.95, 1.05, 1.18, 0xc9a24a, CHROME, 1.18, 16);
  cyl(4.0, 4.0, 1.05, 2.15, 0.82, 0xcfe4ee, IGLASS, 0.82, 16, false);
  for (let i = 0; i < 6; i++) cyl(4.0, 4.0, 1.12 + i * 0.17, 1.15 + i * 0.17, 0.86, 0xc9a24a, CHROME, 0.86, 16, false);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; tube([4.0 + Math.cos(a) * 0.86, 1.05, 4.0 + Math.sin(a) * 0.86], [4.0 + Math.cos(a) * 0.86, 2.15, 4.0 + Math.sin(a) * 0.86], 0.03, 0xa8843a, CHROME); }
  cyl(4.0, 4.0, 2.15, 2.25, 0.9, 0xc9a24a, CHROME, 0.7, 16);
  cyl(4.0, 4.0, 1.15, 1.95, 0.32, 0x8a8e94, PLAIN, 0.32, 10);                    // the lamp (dark until it is lit)
  // a bucket, a rag and a tin of brass polish (Ingvar has been polishing)
  cyl(6.6, 6.4, 0, 0.32, 0.17, 0x8a9096, CHROME, 0.2); cyl(6.6, 6.4, 0.28, 0.3, 0.17, 0x6a8aa0);
  rb(6.2, 0, 6.8, 0.36, 0.02, 0.26, 0.4, 0xf2efe6, FABRIC); cyl(6.95, 6.75, 0, 0.1, 0.06, 0xc0302a);
  void ico; void LIGHT;
}
