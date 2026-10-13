// Mormor Signe's woodshed on Söderholmen (v1.16, "Birgers kaffe"): the little red shed behind her house, the
// last one among the houses by the chapel. Jonte, her grandson, has hidden the last five stolen bikes in here
// under tarpaulins ("cyklar till kyrkan", he told her). Like the other insides it is built out at sea (INDOOR in
// config.js). Local coordinates: x east, z south, y up from the floor; the origin is the north-west corner. The
// door is in the east wall.
//
//   z=0  ┌── T1 ──── T2 ──── woodpile ┐
//        │                            │
//        T3   (the chopping block)     door
//        │                            │
//   z=5  └ T6 ── T4 ──── T5 ──── T7 ──┘
//        x=0                       x=7
import { INDOOR } from './config.js';

const PLAIN = 0, LIGHT = 3, CHROME = 7, PLANKS = 26, IWALL = 29, PARQUET = 30, FABRIC = 33, ITRIM = 34, IGLASS = 35;
const IH = 2.3;
const S = 7, D = 5;
const X = INDOOR.x - 22, Y = INDOOR.y, Z = INDOOR.z - 24;

// outside: the shed door on Söderholmen (southisle.js builds the shed behind Signe's house)
export const SHED_DOOR = { x: -78.45, z: 262.2, r: 1.2 };            // (v1.17.1: behind the house, west of it – not out on the road)
export const SHED_BOX = { x0: -80.2, z0: 258.6, x1: -76.8, z1: 261.2 };

// the tarpaulins: where the lump is (tarp, along a wall), where you stand to lift it (at), and what is under it:
// one of the five bikes (by its owner's id) or something of Signe's
export const TARPS = [
  { id: 't1', tarp: [2.0, 0.5, 0], at: [2.0, 1.45], bike: 'elsa' },
  { id: 't2', tarp: [4.2, 0.5, 0], at: [4.2, 1.45], bike: 'folke' },
  { id: 't3', tarp: [0.5, 2.3, Math.PI / 2], at: [1.45, 2.3], bike: 'rut' },
  { id: 't4', tarp: [2.6, 4.5, 0], at: [2.6, 3.55], bike: 'nova' },
  { id: 't5', tarp: [4.6, 4.5, 0], at: [4.6, 3.55], bike: 'pia' },
  { id: 't6', tarp: [0.75, 4.35, 0], at: [1.15, 3.55], text: 'Under presenningen: Signes saftflaskor. Fyrtio flaskor rabarbersaft, märkta ”1998”, ”1999”, ”2000” …' },
  { id: 't7', tarp: [6.25, 4.45, 0], at: [6.05, 3.5], text: 'En gammal bakspade av trä, inbränd text: ”BULLBILEN 1962”. Och ett fotografi: en ung kvinna i bagarmössa framför en jättelik ugn.' },
];
for (const T of TARPS) { T.x = X + T.at[0]; T.z = Z + T.at[1]; T.r = 0.75; T.tx = X + T.tarp[0]; T.tz = Z + T.tarp[1]; T.rot = T.tarp[2]; }

export const SHED = {
  spawn: { x: X + 6.0, z: Z + 2.5, h: -Math.PI / 2 },     // a step inside the door, facing in (west)
  door: { x: X + 6.7, z: Z + 2.5, r: 0.55 },               // stand here and press GÅ UT
  room: { x0: X, x1: X + S, z0: Z, z1: Z + D },
  bounds: { x0: X - 0.5, x1: X + S + 0.5, z0: Z - 0.5, z1: Z + D + 0.5 },
  cam: { x: X + 3.4, y: 0.8, z: Z + 2.6, cam: { x: X + 6.4, y: Y + 3.9, z: Z + 5.9, fov: 62 } },
  y: Y,
};

const WALL = 0xb06a4a;
// walls [x0, z0, x1, z1] (local, full height): the door gap is z 2.0–3.0 in the east wall
export const SHED_WALLS = [
  [-0.2, -0.2, S + 0.2, 0],
  [-0.2, 0, 0, D + 0.2],
  [-0.2, D, S + 0.2, D + 0.2],
  [S, 0, S + 0.2, 2.0],
  [S, 3.0, S + 0.2, D + 0.2],
];
// things that block the way [x0, z0, x1, z1, height]: the tarps (low lumps), the woodpile, the chopping block
export const SHED_FURN = [
  ...TARPS.map((T) => {
    const [x, z, r] = T.tarp, a = r ? 0.42 : 0.9, b = r ? 0.9 : 0.42;
    return [x - a, z - b, x + a, z + b, 1.0];
  }),
  [5.4, 0, S, 1.15, 1.6],           // the woodpile
  [3.2, 2.3, 3.7, 2.8, 0.5],        // the chopping block
  [S, 2.0, S + 0.2, 3.0, IH],       // the door (shut behind you)
];

// the bikes under the tarps (the same colours as outside: vehicle.js cityGreen …)
export const SHED_BIKES = { elsa: 0x5f9a6a, folke: 0x2c62a8, rut: 0x9b6fc4, nova: 0x6fd0c0, pia: 0x1d2a44 };

export function shedLayout() {
  const colliders = [];
  for (const [x0, z0, x1, z1] of SHED_WALLS) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + IH });
  for (const [x0, z0, x1, z1, h] of SHED_FURN) colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h });
  const B = SHED.bounds;
  return { colliders, floor: { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }, signs: {}, signPrims: [] };
}

// a bike made of tubes (like birger.js bikeProp), standing along x or z
function bike(B, x, z, rot, frame) {
  const cy = Math.cos(rot), sy = Math.sin(rot);
  const T = ([px, py, pz]) => [X + x + px * cy + pz * sy, Y + py, Z + z - px * sy + pz * cy];
  const tube = (a, b, r, c, m = PLAIN) => B.tube(T(a), T(b), r, r, 5, c, m);
  const R = 0.33;
  for (const wz of [-0.55, 0.55]) {
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2;
      tube([0, R + R * Math.cos(a0), wz + R * Math.sin(a0)], [0, R + R * Math.cos(a1), wz + R * Math.sin(a1)], 0.024, 0x1d1f22);
    }
    tube([0, R, wz - R * 0.9], [0, R, wz + R * 0.9], 0.005, 0xb7bcc2, CHROME);
  }
  const BB = [0, 0.3, -0.05], Sd = [0, 0.8, -0.28], H = [0, 0.86, 0.42];
  tube(BB, Sd, 0.022, frame); tube(BB, [0, 0.66, 0.47], 0.026, frame); tube([0, 0.5, -0.12], [0, 0.72, 0.45], 0.022, frame);
  tube([0, R, -0.55], BB, 0.013, frame); tube([0, R, -0.55], Sd, 0.012, frame); tube([0, 0.66, 0.47], [0, R, 0.55], 0.013, frame);
  tube([0, 0.93, -0.42], [0, 0.93, -0.16], 0.05, 0x2a1f18);
  tube(H, [0, 0.98, 0.4], 0.014, 0xb7bcc2, CHROME); tube([-0.27, 0.98, 0.36], [0.27, 0.98, 0.36], 0.014, 0xb7bcc2, CHROME);
  B.box(X + x - 0.16 * cy + 0.62 * sy - 0.12, Y + 0.72, Z + z + 0.16 * sy + 0.62 * cy - 0.12, X + x - 0.16 * cy + 0.62 * sy + 0.12, Y + 0.92, Z + z + 0.16 * sy + 0.62 * cy + 0.12, 0x8a6440, PLANKS); // a basket
}

export function shedInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.003) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  const cyl = (x, z, y0, y1, r, c, m = PLAIN, r1 = r, n = 10) => B.cyl(X + x, Z + z, Y + y0, Y + y1, r, r1, n, c, m, true);
  const top = { top: { c: 0x2a2e34, m: IWALL } };
  // the floor: old boards, sawdust by the chopping block
  floor(0, 0, S, D, 0x7a5a3a, PARQUET);
  floor(2.6, 1.9, 4.3, 3.2, 0xc9a77a, PARQUET, 0.005);
  for (const [x0, z0, x1, z1] of SHED_WALLS) bx(x0, 0, z0, x1, IH, z1, WALL, IWALL, top);
  bx(S, 1.95, 2.0, S + 0.2, IH, 3.0, WALL, IWALL, top);
  bx(S + 0.02, 0, 2.05, S + 0.08, 1.9, 2.95, 0x5b4636, ITRIM);                     // the door
  for (const x of [1.6, 3.6, 5.6]) bx(x - 0.07, 0, 0.0, x + 0.07, IH, 0.08, 0x5a3e28); // posts
  bx(0.02, 1.2, 1.5, 0.05, 1.8, 2.2, 0xcfe4ee, IGLASS); bx(0.02, 1.18, 1.48, 0.06, 1.2, 2.22, 0x5a3e28);    // a small window
  // the woodpile in the north-east corner: logs in rows
  for (let r = 0; r < 5; r++) for (let i = 0; i < 9; i++) B.hcyl(X + 5.55 + i * 0.16, Y + 0.12 + r * 0.29, Z + 0.58, 1.1, 0.12, 'z', 7, (i + r) % 3 ? 0x8a6440 : 0xa07a50, PLAIN, true);
  // the chopping block with an axe in it
  cyl(3.45, 2.55, 0, 0.5, 0.26, 0x7a5a3a, PLAIN, 0.24);
  cyl(3.45, 2.55, 0.5, 0.51, 0.24, 0xc9a77a);
  B.tube([X + 3.45, Y + 0.52, Z + 2.55], [X + 3.75, Y + 0.95, Z + 2.65], 0.02, 0.02, 5, 0xa07a50);
  B.box(X + 3.38, Y + 0.48, Z + 2.48, X + 3.55, Y + 0.6, Z + 2.62, 0x6b6f75, CHROME);
  // tools on the west wall: a rake, a saw, Arne-era bicycle pump
  B.tube([X + 0.08, Y + 0.1, Z + 3.3], [X + 0.08, Y + 1.9, Z + 3.2], 0.02, 0.02, 5, 0xa07a50);
  bx(0.02, 1.5, 0.5, 0.05, 1.62, 1.2, 0x9aa0a6, CHROME);
  // a bare bulb
  B.tube([X + 3.5, Y + IH, Z + 2.5], [X + 3.5, Y + 2.0, Z + 2.5], 0.006, 0.006, 4, 0x1d1f22);
  B.ico(X + 3.5, Y + 1.95, Z + 2.5, 0.06, 1.2, 0xfff1c9, LIGHT);
  // under the tarps (render.js draws the tarps over them until they are lifted): the bikes, Signe's things
  for (const T of TARPS) {
    const [x, z, r] = T.tarp;
    if (T.bike) bike(B, x, z, r ? 0 : Math.PI / 2, SHED_BIKES[T.bike]);
    else if (T.id === 't6') for (let i = 0; i < 10; i++) { cyl(x - 0.36 + (i % 5) * 0.18, z - 0.1 + Math.floor(i / 5) * 0.2, 0, 0.32, 0.06, 0xc0302a, IGLASS, 0.05, 8); cyl(x - 0.36 + (i % 5) * 0.18, z - 0.1 + Math.floor(i / 5) * 0.2, 0.32, 0.4, 0.025, 0xf2efe6); }
    else if (T.id === 't7') { bx(x - 0.75, 0.0, z + 0.0, x + 0.45, 0.06, z + 0.25, 0xc9a77a, PLANKS); bx(x + 0.45, 0.0, z + 0.05, x + 0.75, 0.04, z + 0.2, 0xc9a77a, PLANKS); bx(x - 0.2, 0.06, z - 0.15, x + 0.15, 0.08, z + 0.1, 0xf2efe6); }
  }
  void FABRIC;
}
