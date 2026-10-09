// The inside of the dark tower: the 7th-floor corridor with the lift, and Samuel's little flat.
// It is built out at sea (INDOOR in config.js) and shown instead of the town while you are
// inside. Local coordinates: x east, z south, y up from the floor; the origin is the corridor's
// west end, where the lift is.
//
//   z=0    ┌─────────────────────────────────────────────────────┐
//   lift → │ corridor   (doors: Lindqvist · Nguyen · Persson)    │ window
//   z=2.4  └───┬door┬───────────────────────────────────┬─────────┘
//              │hall         Samuel on the sofa    stub │ kitchen corner
//              │             (faces the TV, south)      │ table · counter
//   z=10.4     └──────── windows ─── TV ─── windows ────┘
//              x=1                                      x=11
import { INDOOR } from './config.js';

// material codes (M in layout.js)
const PLAIN = 0, LIGHT = 3, CHROME = 7, IWALL = 29, PARQUET = 30, FLOORTILE = 31, TV = 32, FABRIC = 33, ITRIM = 34, IGLASS = 35;

export const IH = 2.45; // wall height
const X = INDOOR.x, Y = INDOOR.y, Z = INDOOR.z;

// key places, in world coordinates
export const INT = {
  spawn: { x: X + 1.7, z: Z + 1.2, h: Math.PI / 2 },              // out of the lift, facing east along the corridor
  lift: { x: X + 0.45, z: Z + 1.2, r: 1.05 },                      // stand here and press HISS to go down
  door: { x0: X + 1.6, x1: X + 2.6, z: Z + 2.5, hinge: [X + 1.62, Z + 2.5] }, // Samuel's front door
  flat: { x0: X + 1.0, x1: X + 11.0, z0: Z + 2.6, z1: Z + 10.4 }, // inside the flat
  corridor: { x0: X, x1: X + 15, z0: Z, z1: Z + 2.4 },
  seat: { x: X + 4.9, z: Z + 6.62, y: Y + 0.46, h: 0 },             // Samuel's hips on the sofa, facing the TV (south)
  tv: { x: X + 4.8, z: Z + 10.17, y: Y + 0.86 },
  table: { x: X + 9.05, z: Z + 7.7 },
  keys: { x: X + 9.2, y: Y + 0.775, z: Z + 7.5 },
  nook: { x: X + 9.0, z: Z + 4.4 },                                 // the kitchen corner the stub wall hides from the sofa
  bounds: { x0: X - 1, x1: X + 16.2, z0: Z - 1, z1: Z + 11.2 },
  y: Y,
};

// walls [x0, z0, x1, z1, colour] (local, full height); the corridor's south wall is two halves so
// each side gets its own colour
const CORR = 0xc5ccc2, FLAT = 0xebe4d7, KITCH = 0xe3e8e4;
export const WALLS = [
  [-0.2, -0.2, 15.2, 0, CORR],      // corridor: north side
  [-0.2, 2.4, 1.6, 2.5, CORR],      // corridor: south side, west of Samuel's door …
  [-0.2, 2.5, 1.6, 2.6, FLAT],
  [2.6, 2.4, 15.2, 2.5, CORR],      // … and east of it
  [2.6, 2.5, 11.2, 2.6, FLAT],
  [11.2, 2.5, 15.2, 2.6, CORR],
  [-0.2, 0, 0, 2.4, CORR],          // the lift wall
  [15, 0, 15.2, 2.4, CORR],         // window at the end of the corridor
  [0.8, 2.6, 1.0, 10.6, FLAT],      // flat: west
  [11.0, 2.6, 11.2, 10.6, KITCH],   // flat: east (kitchen)
  [0.8, 10.4, 11.2, 10.6, FLAT],    // flat: south, the outer wall with windows
  [7.4, 3.9, 7.6, 5.4, KITCH],      // stub wall: hides the kitchen corner from the sofa
];

// furniture that blocks the way [x0, z0, x1, z1, height]
export const FURN = [
  [3.4, 5.95, 5.6, 6.85, 0.92],     // sofa
  [3.7, 9.95, 5.9, 10.4, 0.5],      // TV bench
  [8.5, 7.2, 9.6, 8.2, 0.76],       // kitchen table
  [7.95, 7.5, 8.4, 7.95, 0.9],      // chair (west)
  [8.85, 8.3, 9.3, 8.75, 0.9],      // chair (south)
  [10.4, 4.2, 11.0, 9.4, 0.93],     // kitchen counter
  [10.35, 2.65, 11.0, 3.45, 1.95],  // fridge
];

const SIGNS = {
  nSamuel: { def: { lines: ['SAMUEL', 'LGH 1703'], bg: '#f4efe4', fg: '#1d1f22', font: 0.55, border: '#8a7a5a' }, x: 3.0, y: 1.5, z: 2.4, n: 'nz', w: 0.34, h: 0.17 },
  nHolm: { def: { lines: ['HOLM', 'LGH 1704'], bg: '#f4efe4', fg: '#1d1f22', font: 0.55, border: '#8a7a5a' }, x: 13.45, y: 1.5, z: 2.4, n: 'nz', w: 0.34, h: 0.17 },
  nLindqvist: { def: { lines: ['LINDQVIST', 'LGH 1701'], bg: '#f4efe4', fg: '#1d1f22', font: 0.55, border: '#8a7a5a' }, x: 4.05, y: 1.5, z: 0, n: 'pz', w: 0.34, h: 0.17 },
  nNguyen: { def: { lines: ['NGUYEN', 'LGH 1705'], bg: '#f4efe4', fg: '#1d1f22', font: 0.55, border: '#8a7a5a' }, x: 8.85, y: 1.5, z: 0, n: 'pz', w: 0.34, h: 0.17 },
  nPersson: { def: { lines: ['PERSSON', 'LGH 1706'], bg: '#f4efe4', fg: '#1d1f22', font: 0.55, border: '#8a7a5a' }, x: 13.25, y: 1.5, z: 0, n: 'pz', w: 0.34, h: 0.17 },
  plan7: { def: { lines: ['HISS · PLAN 7'], bg: '#1d2128', fg: '#f4efe4', font: 0.62 }, x: 0, y: 2.33, z: 1.2, n: 'px', w: 0.9, h: 0.2 },
};
const NORMALS = { px: [1, 0], nx: [-1, 0], pz: [0, 1], nz: [0, -1] };

// colliders, the floor and the signs, for the layout (world coordinates)
export function interiorLayout() {
  const colliders = [];
  const box = (x0, z0, x1, z1, h, extra) => colliders.push({ t: 'box', x0: X + x0, z0: Z + z0, x1: X + x1, z1: Z + z1, h: Y + h, ...extra });
  for (const [x0, z0, x1, z1] of WALLS) box(x0, z0, x1, z1, IH);
  box(1.6, 2.4, 2.6, 2.6, 0, { door: 'samuel', hClosed: Y + IH }); // Samuel's front door: open (h 0) until you leave with the keys
  for (const [x0, z0, x1, z1, h] of FURN) box(x0, z0, x1, z1, h);
  const signs = {}, signPrims = [];
  for (const [id, s] of Object.entries(SIGNS)) {
    signs[id] = { w: s.w, h: s.h, ...s.def };
    const [nx, nz] = NORMALS[s.n];
    signPrims.push({ t: 'sign', id, x: X + s.x + nx * 0.035, y: Y + s.y, z: Z + s.z + nz * 0.035, w: s.w, h: s.h, rot: Math.atan2(nx, nz) });
  }
  const B = INT.bounds;
  return { colliders, floors: [{ x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, y: Y }], signs, signPrims };
}

// ------------------------------------------------------------------ geometry
export function interiorInto(B) {
  const bx = (x0, y0, z0, x1, y1, z1, c, m = PLAIN, opts) =>
    B.box(X + Math.min(x0, x1), Y + y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), Y + y1, Z + Math.max(z0, z1), c, m, opts);
  const floor = (x0, z0, x1, z1, c, m, y = 0.002) => B.poly([[X + x0, Z + z0], [X + x1, Z + z0], [X + x1, Z + z1], [X + x0, Z + z1]], Y + y, c, m);
  // a flat panel on a wall: centre (x, y, z), facing n ('px' | 'nx' | 'pz' | 'nz'), w × h
  const plate = (x, y, z, n, w, h, c, m = PLAIN, uvs = null) => {
    const [nx, nz] = NORMALS[n];
    const rx = nz, rz = -nx, hw = w / 2, hh = h / 2;
    const cx = X + x, cy = Y + y, cz = Z + z;
    B.quad([cx - rx * hw, cy - hh, cz - rz * hw], [cx - rx * hw, cy + hh, cz - rz * hw], [cx + rx * hw, cy + hh, cz + rz * hw], [cx + rx * hw, cy - hh, cz + rz * hw], c, m, uvs, [nx, 0, nz]);
  };

  // floors: the slab around everything, linoleum in the corridor, parquet in the flat, tiles in the kitchen
  floor(-40, -40, 55, 50, 0x1b1f24, PLAIN, -0.004);
  floor(0, 0, 15, 2.4, 0x8d98a2, FLOORTILE);
  floor(1.0, 2.6, 7.5, 10.4, 0xb4875a, PARQUET);
  floor(7.5, 2.6, 11.0, 10.4, 0xd9d5cd, FLOORTILE);
  floor(1.6, 2.4, 2.6, 2.6, 0x9a8b78, PLAIN);

  // walls (the shader cuts a hole where they would hide you from the camera)
  for (const [x0, z0, x1, z1, c] of WALLS) bx(x0, 0, z0, x1, IH, z1, c, IWALL, { top: { c: 0x2a2e34, m: IWALL } });
  bx(1.6, 2.1, 2.4, 2.6, IH, 2.5, CORR, IWALL, { top: { c: 0x2a2e34, m: IWALL } }); // over Samuel's door
  bx(1.6, 2.1, 2.5, 2.6, IH, 2.6, FLAT, IWALL, { top: { c: 0x2a2e34, m: IWALL } });

  const WHITE = 0xf1eee7;
  // Samuel's door frame (the door itself is its own mesh: open now, shut when you leave)
  for (const zz of [[2.37, 2.4], [2.6, 2.63]]) {
    bx(1.52, 0, zz[0], 1.6, 2.18, zz[1], WHITE, ITRIM);
    bx(2.6, 0, zz[0], 2.68, 2.18, zz[1], WHITE, ITRIM);
    bx(1.52, 2.1, zz[0], 2.68, 2.18, zz[1], WHITE, ITRIM);
  }
  // closed doors to the neighbours (and Samuel's bathroom)
  const wallDoor = (x, z, n, col) => {
    const [nx, nz] = NORMALS[n];
    const along = nx !== 0 ? 'z' : 'x';
    const fr = (a0, a1, y0, y1, d0, d1, c, m) => along === 'x'
      ? bx(x + a0, y0, z + nz * d0, x + a1, y1, z + nz * d1, c, m)
      : bx(x + nx * d0, y0, z + a0, x + nx * d1, y1, z + a1, c, m);
    fr(-0.56, -0.48, 0, 2.18, 0, 0.035, WHITE, ITRIM);
    fr(0.48, 0.56, 0, 2.18, 0, 0.035, WHITE, ITRIM);
    fr(-0.56, 0.56, 2.1, 2.18, 0, 0.035, WHITE, ITRIM);
    fr(-0.48, 0.48, 0, 2.1, 0, 0.02, col, ITRIM);
    fr(0.3, 0.42, 0.98, 1.02, 0.02, 0.07, 0xc9ccd0, CHROME);   // handle
    fr(0.33, 0.39, 1.06, 1.16, 0.02, 0.03, 0xc9ccd0, CHROME);  // lock
  };
  wallDoor(3.4, 0, 'pz', 0x7d5f43);
  wallDoor(8.2, 0, 'pz', 0x56677a);
  wallDoor(12.6, 0, 'pz', 0x7d5f43);
  wallDoor(12.8, 2.4, 'nz', 0x6f4a3a);
  wallDoor(1.0, 6.6, 'px', 0xf3f1ec); // bathroom

  // the lift: steel frame, two doors, call button
  bx(0, 0, 0.45, 0.06, 2.2, 0.55, 0x8b9096, ITRIM);
  bx(0, 0, 1.85, 0.06, 2.2, 1.95, 0x8b9096, ITRIM);
  bx(0, 2.12, 0.45, 0.06, 2.2, 1.95, 0x8b9096, ITRIM);
  bx(0, 0, 0.55, 0.03, 2.12, 1.19, 0xb9bec4, CHROME);
  bx(0, 0, 1.21, 0.03, 2.12, 1.85, 0xb9bec4, CHROME);
  bx(0, 1.05, 2.15, 0.04, 1.3, 2.27, 0x8b9096, ITRIM);
  bx(0.04, 1.14, 2.19, 0.055, 1.2, 2.23, 0xffd27a, LIGHT);

  // windows: frame, glass and sill
  const win = (x, z, n, w) => {
    const [nx, nz] = NORMALS[n];
    plate(x + nx * 0.004, 1.55, z + nz * 0.004, n, w + 0.12, 1.42, WHITE, ITRIM);
    plate(x + nx * 0.008, 1.55, z + nz * 0.008, n, w, 1.28, 0x9db4c7, IGLASS);
    plate(x + nx * 0.012, 1.55, z + nz * 0.012, n, 0.05, 1.28, WHITE, ITRIM);
    if (nz !== 0) bx(x - w / 2 - 0.08, 0.86, z, x + w / 2 + 0.08, 0.9, z + nz * 0.16, WHITE, ITRIM);
    else bx(x, 0.86, z - w / 2 - 0.08, x + nx * 0.16, 0.9, z + w / 2 + 0.08, WHITE, ITRIM);
  };
  win(2.6, 10.4, 'nz', 1.3);
  win(6.9, 10.4, 'nz', 1.3);
  win(9.3, 10.4, 'nz', 1.2);
  win(15, 1.2, 'nx', 1.3);

  // ---- the hall: a door mat, shoes and a jacket on a hook
  bx(1.66, 0, 2.72, 2.54, 0.015, 3.3, 0x6b4a3a, FABRIC);
  bx(2.85, 0, 2.75, 3.1, 0.09, 2.86, 0x22252a);
  bx(2.88, 0, 2.92, 3.13, 0.09, 3.03, 0x22252a);
  bx(1.0, 1.7, 3.2, 1.05, 1.74, 4.3, 0x5b4636);
  bx(1.0, 1.02, 3.45, 1.16, 1.7, 3.95, 0x9a3a32, FABRIC);

  // ---- the living room: only a sofa and a TV
  const SOFA = 0x4b586d, CUSH = 0x58667c;
  bx(3.4, 0.08, 6.0, 5.6, 0.42, 6.85, SOFA, FABRIC, { skipBottom: false });
  for (const [x, z] of [[3.47, 6.05], [5.48, 6.05], [3.47, 6.75], [5.48, 6.75]]) bx(x, 0, z, x + 0.05, 0.08, z + 0.05, 0x1e1f22);
  bx(3.6, 0.42, 6.18, 4.49, 0.55, 6.85, CUSH, FABRIC);
  bx(4.51, 0.42, 6.18, 5.4, 0.55, 6.85, CUSH, FABRIC);
  bx(3.4, 0.08, 5.95, 5.6, 0.92, 6.2, SOFA, FABRIC);
  bx(3.4, 0.08, 5.95, 3.6, 0.66, 6.85, SOFA, FABRIC);
  bx(5.4, 0.08, 5.95, 5.6, 0.66, 6.85, SOFA, FABRIC);
  bx(3.66, 0.55, 6.2, 4.05, 0.86, 6.36, 0xc8963a, FABRIC);   // a mustard cushion at the far end
  // TV bench, TV and its stand
  bx(3.7, 0, 9.95, 5.9, 0.42, 10.4, 0x3b302a, PLAIN);
  plate(4.25, 0.21, 9.948, 'nz', 1.0, 0.012, 0x23201d, PLAIN);
  plate(5.35, 0.21, 9.948, 'nz', 1.0, 0.012, 0x23201d, PLAIN);
  bx(4.6, 0.42, 10.13, 5.0, 0.46, 10.32, 0x15161a);
  bx(4.76, 0.46, 10.2, 4.84, 0.55, 10.26, 0x15161a);
  bx(4.15, 0.52, 10.18, 5.45, 1.24, 10.25, 0x111215, PLAIN);
  plate(4.8, 0.88, 10.176, 'nz', 1.2, 0.66, 0xffffff, TV, [[0, 0], [0, 1], [1, 1], [1, 0]]);

  // ---- the kitchen: counter with sink and stove, wall cupboards, fridge, a small table
  bx(10.42, 0, 4.2, 11.0, 0.86, 9.4, 0xe7e4dc, ITRIM);
  bx(10.36, 0.86, 4.2, 11.0, 0.92, 9.4, 0x33353a, PLAIN, { skipBottom: false });
  for (let z = 4.8; z < 9.4; z += 0.6) plate(10.415, 0.44, z, 'nx', 0.012, 0.8, 0x9a978f, ITRIM);
  bx(10.42, 0, 4.2, 10.46, 0.08, 9.4, 0x2a2b2f);
  bx(10.48, 0.921, 5.45, 10.9, 0.926, 6.05, 0x6f757c, CHROME);  // sink
  bx(10.84, 0.92, 5.72, 10.9, 1.2, 5.78, 0xb9bec4, CHROME);     // tap
  bx(10.66, 1.16, 5.72, 10.9, 1.2, 5.78, 0xb9bec4, CHROME);
  bx(10.45, 0.921, 7.25, 10.95, 0.93, 7.95, 0x141518);           // stove
  for (const [x, z] of [[10.58, 7.42], [10.82, 7.42], [10.58, 7.78], [10.82, 7.78]]) bx(x - 0.08, 0.93, z - 0.08, x + 0.08, 0.934, z + 0.08, 0x3a3c40);
  bx(10.68, 1.45, 4.2, 11.0, 2.2, 9.4, 0xe7e4dc, ITRIM);
  for (let z = 4.8; z < 9.4; z += 0.6) plate(10.675, 1.82, z, 'nx', 0.012, 0.7, 0x9a978f, ITRIM);
  bx(10.35, 0, 2.65, 11.0, 1.95, 3.45, 0xf2f2ee, ITRIM);
  plate(10.345, 1.25, 3.05, 'nx', 0.8, 0.012, 0xa9aaa6, ITRIM);
  bx(10.3, 0.95, 3.32, 10.35, 1.55, 3.37, 0xb9bec4, CHROME);
  // table + chairs
  const WOOD = 0xc49a6c, CHAIR = 0x7a5a3c;
  bx(8.5, 0.72, 7.2, 9.6, 0.76, 8.2, WOOD, PLAIN, { skipBottom: false });
  for (const [x, z] of [[8.55, 7.25], [9.5, 7.25], [8.55, 8.1], [9.5, 8.1]]) bx(x, 0, z, x + 0.05, 0.72, z + 0.05, 0x8a6a48);
  const chair = (x0, z0, back) => {
    bx(x0, 0.42, z0, x0 + 0.45, 0.46, z0 + 0.45, CHAIR, PLAIN, { skipBottom: false });
    for (const [dx, dz] of [[0.02, 0.02], [0.39, 0.02], [0.02, 0.39], [0.39, 0.39]]) bx(x0 + dx, 0, z0 + dz, x0 + dx + 0.04, 0.42, z0 + dz + 0.04, 0x5a4230);
    if (back === 'w') bx(x0, 0.46, z0, x0 + 0.05, 0.92, z0 + 0.45, CHAIR);
    else bx(x0, 0.46, z0 + 0.4, x0 + 0.45, 0.92, z0 + 0.45, CHAIR);
  };
  chair(7.95, 7.5, 'w');
  chair(8.85, 8.3, 's');
}

// door panel for Samuel's front door, hinge at the origin, closed along +x (render.js turns it)
export function doorInto(B) {
  B.box(0, 0, -0.024, 0.96, 2.08, 0.024, 0x6f4a3a, ITRIM, { skipBottom: false });
  for (const s of [1, -1]) {
    B.box(0.8, 0.98, s * 0.024, 0.9, 1.02, s * 0.07, 0xc9ccd0, CHROME);
  }
}

// is a point inside the flat (not the corridor)?
export function inFlat(x, z) {
  const f = INT.flat;
  return x > f.x0 && x < f.x1 && z > f.z0 - 0.05 && z < f.z1;
}
