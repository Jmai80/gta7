// Västerholmen (v1.18): the island across the west bridge, the end of Storgatan (z = -40). The bridge has been
// shut since the start – AVSTÄNGT, and since v1.18 the sign says why: Kexfabriken bought the island and the road.
// It opens in "Sjubydagen" (the last part of the first chapter, sjubydagen.js) and stays open after it.
// What is here: Kexfabriken – a big pale-blue factory hall with loading docks, a striped chimney, flour silos, a
// water tower and an office block, all inside a mesh fence with a gate onto the road from the bridge – a ring road
// round it, three old workers' houses on Kexgatan by the bridge, and a quay on the south shore with a crane and
// containers (where M/S Kardemumma ties up after the last scene: the way into a second chapter).
// Pure data like island.js and southisle.js: everything goes out through the helpers createLayout hands over.
import { CURB_H, BRIDGES } from './config.js';
import { filletPath } from './island.js';

const ROAD_Y = CURB_H + 0.02;
const PATCH_Y = CURB_H + 0.02;
const MARK_Y = CURB_H + 0.04;
const ROAD_W = 8;
const BRIDGE = BRIDGES[1];
const BX = BRIDGE.to, BZ = BRIDGE.at;      // where the bridge deck meets the island (-230, -40)
const RAMP = 3.2;                          // the slope up from the deck onto the island

// the shoreline, from the bridge landing round the north, west and south (the quay is the straight bit)
const COAST = [
  [BX, BZ + 5], [BX - RAMP, BZ + 5], [BX - RAMP, BZ - 5], [BX, BZ - 5],
  [-231, -70], [-239, -98], [-255, -120], [-288, -130], [-330, -131], [-364, -126], [-386, -112], [-396, -82],
  [-399, -40], [-397, 2], [-391, 30], [-374, 49], [-350, 56], [-290, 56], [-266, 52], [-246, 37], [-235, 12], [-231, -18],
];
// the ring road round the factory, and the short road from the bridge (straight on: the factory gate)
const LOOP = [[-266, -108], [-378, -108], [-378, 34], [-266, 34]];
const SPINE = [[BX - RAMP, BZ], [-266, BZ]];

export const WEST = {
  name: 'Västerholmen',
  coast: COAST,
  bbox: { x0: -400, z0: -132, x1: -229, z1: 57 },
  landing: { x: BX - RAMP / 2, z: BZ },
  junction: { x: -266, z: BZ },
  quay: { x0: -350, x1: -290, z0: 40, z1: 56 },
  ship: { x: -320, z: 64.5, len: 52, wid: 9.5 },     // where M/S Kardemumma lies (render: sjubyview.js)
  center: { x: -315, z: -38 },
};

// Kexfabriken
export const KEX = {
  fence: { x0: -368, z0: -100, x1: -276, z1: 24 },
  gate: { x: -276, z0: -46.5, z1: -33.5 },
  hall: { x0: -358, z0: -92, x1: -306, z1: -50, h: 10 },
  dock: { x0: -306, x1: -302.6, z0: -88, z1: -58, h: 1.1 },
  door: { x: -305.2, z: -53.2 },                     // the staff door at the south end of the docks (outside: kexhall.js FAB_DOOR)
  yard: { x0: -306, z0: -98, x1: -276, z1: 22 },
  office: { x0: -358, z0: -26, x1: -330, z1: -8 },
  silos: [[-351, -38], [-343, -38], [-335, -38]],
  tower: { x: -320, z: 8 },                          // the water tower with the biscuit on it
  chimney: { x: -352, z: -86 },
  park: { x0: -302, z0: 2, x1: -280, z1: 20 },
  truck: { x: -297.6, z: -66.0, h: -Math.PI / 2 },  // where the biscuit van stops, nose to the docks
};

// the workers' houses on Kexgatan, between the road and the north-east shore (doors to the west, to the road)
export const KEXGATAN = [
  [-258, -100, 0xd9a14a, 0x3a3c41], [-258, -88, 0x8e2c20, 0x8c3f2d], [-258, -76, 0x9db8cc, 0x3a3c41],
];

// ---------------------------------------------------------------- geometry helpers
export function onWest(x, z) {
  const B = WEST.bbox;
  if (x < B.x0 || x > B.x1 || z < B.z0 || z > B.z1) return false;
  let inside = false;
  for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) {
    const [xi, zi] = COAST[i], [xj, zj] = COAST[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export const WEST_ROADS = {
  wloop: filletPath(LOOP, 18, true),
  wspine: filletPath(SPINE, 0, false),
};

// the distance from (x, z) to the nearest road centerline on Västerholmen
export function westRoadDist(x, z) {
  let best = 1e9;
  for (const R of Object.values(WEST_ROADS)) {
    const P = R.pts, n = P.length, last = R.closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = P[i], b = P[(i + 1) % n];
      const abx = b[0] - a[0], abz = b[1] - a[1], l2 = abx * abx + abz * abz || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * abx + (z - a[1]) * abz) / l2));
      const d = Math.hypot(a[0] + abx * t - x, a[1] + abz * t - z);
      if (d < best) best = d;
    }
  }
  return best;
}

export function inKex(x, z) {
  const F = KEX.fence;
  return x > F.x0 && x < F.x1 && z > F.z0 && z < F.z1;
}

// a little hash from a number (0..1): things placed "at random" without the layout's random numbers
function hash(i) { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }

// ---------------------------------------------------------------- the island
// H: the helpers of createLayout (as for southInto, plus signs for atlas-only signs). Called last of all in
// createLayout, so its trees (which draw from the layout's random numbers) move nothing else.
export function westInto(H) {
  const { P, box, solid, poly, sign, colBox, colOBox, colCircle, building, tree, lamp, bench, meshFence, mark, M, COL } = H;
  const C = [-315, -38];

  // ---- ground, the rocky shore (a concrete quay on the south) and the edge you cannot drive off
  poly([C, ...COAST, COAST[0]], 0x6a9640, M.LAWN, CURB_H);
  const nC = COAST.length, Q = WEST.quay;
  let seed = 11;
  for (let i = 0; i < nC; i++) {
    const a = COAST[i], b = COAST[(i + 1) % nC];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const out = (dz / l) * (mx - C[0]) + (-dx / l) * (mz - C[1]) > 0;
    const quay = Math.abs(a[1] - Q.z1) < 0.1 && Math.abs(b[1] - Q.z1) < 0.1;
    P({ t: 'wall', x0: a[0], z0: a[1], x1: b[0], z1: b[1], y0: -2.6, y1: CURB_H, c: quay ? 0x9a968e : 0x77716a, m: M.STONE, flip: !out });
    const ux = dx / l, uz = dz / l, nx = out ? dz / l : -dz / l, nz = out ? -dx / l : dx / l;
    if (!(Math.abs(mz - BZ) < 6 && mx > BX - RAMP - 0.1)) {                // (the notch the bridge road comes in through)
      colOBox(mx - nx * 0.45, mz - nz * 0.45, l / 2 + 0.4, 0.35, Math.atan2(-uz, ux), 1.3);
    }
    if (quay) continue;
    // granite along the shore: big slabs facing the open sea in the west, smaller stones by the bridge
    const big = mx < -330;
    for (let s = 1.5 + hash(seed++) * 3; s < l - 1; s += (big ? 3.4 : 5.2) + hash(seed++) * 4) {
      if (Math.abs(a[1] + uz * s - BZ) < 10 && a[0] + ux * s > BX - 9) continue;
      const x = a[0] + ux * s + nx * (hash(seed++) * 1.4 - 0.4), z = a[1] + uz * s + nz * (hash(seed++) * 1.4 - 0.4);
      const r = big ? 1.2 + hash(seed++) * 1.9 : 0.6 + hash(seed++) * 1.1, sy = 0.45 + hash(seed++) * 0.35;
      P({ t: 'ico', x, y: CURB_H - r * sy * 0.3, z, r, sy, c: [0x8a837c, 0x9a8f86, 0x7a756f, 0xa69a8e, 0x8f7f76][Math.floor(hash(seed++) * 5)] });
    }
  }
  const rock = (x, z, r, sy = 0.6) => {
    P({ t: 'ico', x, y: CURB_H - r * sy * 0.25, z, r, sy, c: [0x8a837c, 0x978a80, 0x7a756f, 0xa09489][Math.floor(hash(x * 7 + z) * 4)] });
    colCircle(x, z, r * 0.85, CURB_H + r * sy * 0.7);
  };

  // ---- roads painted on the grass, edge lines and a dashed center line
  const strip = (R0, off0, off1, y, c, m, sink, dash = 0, skip = null) => {
    const { pts, dirs, closed } = R0, n = pts.length, last = closed ? n : n - 1;
    let run = 0;
    for (let i = 0; i < last; i++) {
      const j = (i + 1) % n, a = pts[i], b = pts[j], da = dirs[i], db = dirs[j];
      run += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (dash && (run % dash) > dash * 0.45) continue;
      if (skip && skip((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
      const q = [
        [a[0] - da[1] * off0, a[1] + da[0] * off0], [b[0] - db[1] * off0, b[1] + db[0] * off0],
        [b[0] - db[1] * off1, b[1] + db[0] * off1], [a[0] - da[1] * off1, a[1] + da[0] * off1],
      ];
      if (sink) sink(q, y); else poly(q, c, m, y);
    }
  };
  const hw = ROAD_W / 2, J = WEST.junction;
  const nearJ = (x, z) => Math.hypot(x - J.x, z - J.z) < 9 || (x > -284 && x < -268 && z > 22 && z < 30);
  for (const key of ['wloop', 'wspine']) {
    const Rd = WEST_ROADS[key];
    strip(Rd, -hw, hw, ROAD_Y, 0x41444a, M.ASPHALT);
    const skip = key === 'wloop' ? nearJ : (x, z) => nearJ(x, z) || x > BX - RAMP - 6;
    strip(Rd, -hw + 0.35, -hw + 0.5, MARK_Y, 0, 0, mark, 0, skip);
    strip(Rd, hw - 0.5, hw - 0.35, MARK_Y, 0, 0, mark, 0, skip);
    strip(Rd, -0.08, 0.08, MARK_Y, 0, 0, mark, 7, skip);
  }

  // ---- the bridge landing: a short slope up onto the island, the place-name sign
  H.ramps.push({ x0: BX - RAMP, x1: BX, z0: BZ - 5, z1: BZ + 5, h0: CURB_H, h1: 0, axis: 'x', road: true });
  P({ t: 'quad', pts: [[BX - RAMP, ROAD_Y, BZ + 5], [BX - RAMP, ROAD_Y, BZ - 5], [BX, 0.005, BZ - 5], [BX, 0.005, BZ + 5]], c: 0x41444a, m: M.ASPHALT });
  solid(BX - RAMP, -0.02, BZ - 5.6, BX, 0.95, BZ - 5, COL.concrete); solid(BX - RAMP, -0.02, BZ + 5, BX, 0.95, BZ + 5.6, COL.concrete);
  const post = (x, z, h, c = 0x9aa0a6) => P({ t: 'cyl', x, z, y0: CURB_H, y1: CURB_H + h, r: 0.05, n: 5, c });
  sign('vasterholmen', { lines: ['VÄSTERHOLMEN'], bg: '#1f5aa6', fg: '#ffffff', border: '#ffffff', font: 0.6 }, BX - 8.2, CURB_H + 2.25, BZ - 8.6, 3.8, 0.85, Math.PI / 2);
  post(BX - 8.25, BZ - 7.2, 2.7); post(BX - 8.25, BZ - 10.0, 2.7);
  sign('kexpil', { lines: ['KEXFABRIKEN →', 'Leveranser · Besökare'], bg: '#1f4fa0', fg: '#ffffff', border: '#f2c21b', font: 0.48 }, -246.2, CURB_H + 1.9, BZ + 7.4, 3.4, 0.9, Math.PI / 2);
  post(-246.25, BZ + 6.1, 2.25); post(-246.25, BZ + 8.7, 2.25);

  // ---- lamps along the ring road, benches looking back at the town
  for (let z = -96; z <= 22; z += 24) if (Math.abs(z - BZ) > 10) lamp(-260.8, z, -Math.PI / 2);
  for (let x = -350; x <= -290; x += 30) { lamp(x, -113.2, 0); lamp(x, 39.2, Math.PI); }
  for (let z = -80; z <= 10; z += 30) lamp(-383.2, z, Math.PI / 2);
  for (const z of [-12, -2]) bench(-239.4, z, Math.PI / 2);
  for (const [x, z, k] of [[-242, -60, 'birch'], [-240, -4, 'birch'], [-250, 22, 'oak'], [-244, -112, 'pine'], [-286, -120, 'pine'], [-330, -122, 'spruce'], [-370, -118, 'pine'],
    [-388, -60, 'pine'], [-390, -20, 'spruce'], [-386, 18, 'pine'], [-372, 42, 'oak'], [-276, 44, 'birch'], [-258, 36, 'oak']]) {
    if (onWest(x, z) && westRoadDist(x, z) > hw + 2.5) tree(x, z, k, 1.05);
  }
  for (const [x, z, r] of [[-392, -40, 2.0], [-300, -124, 1.7], [-244, 26, 1.5], [-380, 40, 1.8], [-268, -116, 1.4]]) if (onWest(x, z) && westRoadDist(x, z) > hw + r + 1) rock(x, z, r);

  // ---- Kexgatan: three old workers' houses by the bridge, doors toward the road
  KEXGATAN.forEach(([x, z, wc, rc], i) => {
    building({ x0: x, z0: z, x1: x + 7, z1: z + 6, h: 2.9, c: wc, m: M.FALU, cell: [2.2, 2.9], roof: 'gable', roofH: 1.9, roofC: rc, axis: 'z', overhang: 0.35, mapC: 0x9a8f80 });
    const dz = z + 3;
    box(x - 0.06, CURB_H, dz - 0.55, x, CURB_H + 2.1, dz + 0.55, 0x3b4148, M.BOARDS);
    box(x - 0.5, CURB_H, dz - 0.8, x, CURB_H + 0.12, dz + 0.8, 0x8f8a83, M.STONE);
    H.area(-261.6, dz - 0.6, x - 0.5, dz + 0.6, COL.gravel, M.DIRT, PATCH_Y);
    if (i !== 1) tree(x + 9.5, z + 3, i ? 'birch' : 'oak', 0.85);
  });
  sign('kexgatan', { lines: ['KEXGATAN'], bg: '#1f5aa6', fg: '#ffffff', font: 0.6 }, -261.3, CURB_H + 2.4, -66.5, 1.6, 0.36, -Math.PI / 2);
  post(-261.3, -66.5, 2.2);

  // ---- Kexfabriken: the yard and the fence round it all, a gate straight on from the bridge
  const F = KEX.fence, G = KEX.gate, Yd = KEX.yard;
  H.area(Yd.x0, Yd.z0, Yd.x1, Yd.z1, 0x494c52, M.ASPHALT, PATCH_Y);
  H.area(-306, -50, -330, -26, 0x494c52, M.ASPHALT, PATCH_Y);                    // between the hall and the office
  H.area(G.x, G.z0, -262, G.z1, 0x494c52, M.ASPHALT, PATCH_Y);                  // the driveway from the junction
  H.area(-358, -50, -330, -26, 0xb8a98c, M.DIRT, PATCH_Y - 0.005);              // gravel round the silos
  meshFence(F.x0, F.z0, F.x1, F.z0, 2.4);
  meshFence(F.x0, F.z1, F.x1, F.z1, 2.4);
  meshFence(F.x0, F.z0, F.x0, F.z1, 2.4);
  meshFence(F.x1, F.z0, F.x1, G.z0, 2.4);
  meshFence(F.x1, G.z1, F.x1, F.z1, 2.4);
  for (const z of [G.z0, G.z1]) {                                                   // gate posts, the gate swung open
    P({ t: 'cyl', x: F.x1, z, y0: CURB_H, y1: CURB_H + 2.9, r: 0.18, n: 8, c: 0x1f4fa0, cap: true });
    colCircle(F.x1, z, 0.2, 3);
  }
  box(F.x1 - 0.08, CURB_H + 0.4, G.z0 + 0.25, F.x1 - 5.6, CURB_H + 2.2, G.z0 + 0.35, 0x9aa0a6);
  box(F.x1 - 0.08, CURB_H + 0.4, G.z1 - 0.35, F.x1 - 5.6, CURB_H + 2.2, G.z1 - 0.25, 0x9aa0a6);
  colBox(F.x1 - 5.6, G.z0 + 0.2, F.x1, G.z0 + 0.4, 2.2); colBox(F.x1 - 5.6, G.z1 - 0.4, F.x1, G.z1 - 0.2, 2.2);
  sign('kexgrind', { kind: 'kex', sub: 'Obehöriga äga ej tillträde' }, F.x1 + 0.2, CURB_H + 3.6, (G.z0 + G.z1) / 2, 9.0, 1.5, Math.PI / 2);
  box(F.x1 - 0.1, CURB_H + 2.8, G.z0 - 0.15, F.x1 + 0.05, CURB_H + 4.4, G.z1 + 0.15, 0x1d1f22);
  // a gatehouse just inside, south of the way in, with its barrier arm up
  building({ x0: -284, z0: -31, x1: -279, z1: -26.5, h: 2.6, c: 0xe8ecef, m: M.SHOP, cell: [2.5, 2.6], topC: 0x1f4fa0, mapC: 0xb8c0c8 });
  P({ t: 'tube', a: [-281, CURB_H + 1.1, -31.3], b: [-283.5, CURB_H + 5.2, -31.3], r: 0.07, c: 0xd2342c, m: 0, n: 5 });

  // ---- the hall: pale-blue corrugated walls with a dark-blue band, the docks on the east side, signs
  const Hl = KEX.hall, top = CURB_H + Hl.h;
  building({ x0: Hl.x0, z0: Hl.z0, x1: Hl.x1, z1: Hl.z1, h: Hl.h, c: 0xdfe6ee, m: M.CORR, cell: [1.2, 10], topC: 0x5a6068, mapC: 0x9fb0c4, parapetC: 0x1f4fa0 });
  box(Hl.x0 - 0.04, top - 1.4, Hl.z0 - 0.04, Hl.x1 + 0.04, top - 0.5, Hl.z1 + 0.04, 0x1f4fa0, M.PAINT);
  // a sawtooth roof of skylights
  for (let k = 0; k < 6; k++) {
    const z0 = Hl.z0 + 3 + k * 6.4;
    P({ t: 'quad', pts: [[Hl.x0 + 2, top + 0.6, z0], [Hl.x1 - 2, top + 0.6, z0], [Hl.x1 - 2, top + 2.6, z0 + 3.6], [Hl.x0 + 2, top + 2.6, z0 + 3.6]], c: 0x6c737c, m: M.PLAIN });
    box(Hl.x0 + 2, top + 0.6, z0 + 3.55, Hl.x1 - 2, top + 2.6, z0 + 3.65, 0x9fc6d8, M.GLASS);
    box(Hl.x0 + 1.9, top, z0 - 0.1, Hl.x0 + 2.1, top + 2.6, z0 + 3.7, 0x5a6068);
    box(Hl.x1 - 2.1, top, z0 - 0.1, Hl.x1 - 1.9, top + 2.6, z0 + 3.7, 0x5a6068);
    H.casters.push({ t: 'box', x0: Hl.x0 + 2, y0: top, z0, x1: Hl.x1 - 2, y1: top + 2.6, z1: z0 + 3.6 });
  }
  // the loading docks: a concrete platform, three roller doors, bumpers, and the staff door south of them
  const Dk = KEX.dock;
  solid(Hl.x1, CURB_H, Dk.z0, Dk.x1, CURB_H + Dk.h, Dk.z1, COL.concrete);
  for (let k = 0; k < 3; k++) {
    const z0 = Dk.z0 + 2 + k * 9.6;
    box(Hl.x1 + 0.02, CURB_H + Dk.h, z0, Hl.x1 + 0.08, CURB_H + 5.4, z0 + 6, 0x9aa6b2, M.GARAGE, { cell: [6, 4.3] });
    for (const dz of [0.6, 5.4]) box(Dk.x1, CURB_H + 0.3, z0 + dz - 0.25, Dk.x1 + 0.22, CURB_H + 0.9, z0 + dz + 0.25, 0x1d1f22);
    box(Hl.x1 + 0.02, CURB_H + 5.6, z0 + 2.6, Hl.x1 + 0.4, CURB_H + 5.9, z0 + 3.4, 0xfff1c9, M.LIGHT);
  }
  const Dr = KEX.door;
  box(Hl.x1 + 0.02, CURB_H, Dr.z - 0.6, Hl.x1 + 0.08, CURB_H + 2.2, Dr.z + 0.6, 0x1f4fa0, M.BOARDS);
  box(Hl.x1 + 0.08, CURB_H + 0.95, Dr.z - 0.42, Hl.x1 + 0.12, CURB_H + 1.05, Dr.z - 0.3, 0xc9ccd0, M.CHROME);
  box(Hl.x1, CURB_H, Dr.z - 0.9, Hl.x1 + 0.9, CURB_H + 0.12, Dr.z + 0.9, 0x8f8a83, M.STONE);
  box(Hl.x1, CURB_H + 2.3, Dr.z - 0.8, Hl.x1 + 0.7, CURB_H + 2.4, Dr.z + 0.8, 0x1d1f22);
  sign('kexpersonal', { lines: ['PERSONAL'], bg: '#1f4fa0', fg: '#ffffff', font: 0.6 }, Hl.x1 + 0.1, CURB_H + 2.7, Dr.z, 1.1, 0.26, Math.PI / 2);
  // the name: a big board on the roof facing the town, and one on the façade
  sign('kexfabriken', { kind: 'kex', sub: 'Sjubykex · sedan 1971', ppm: 30 }, Hl.x1 - 1.2, top + 4.0, -71, 22, 3.8, Math.PI / 2);
  for (const z of [-80, -71, -62]) { box(Hl.x1 - 1.6, top, z - 0.15, Hl.x1 - 1.3, top + 2.2, z + 0.15, 0x3b4148); }
  box(Hl.x1 - 1.45, top + 2.0, -82.2, Hl.x1 - 1.25, top + 6.0, -59.8, 0x1d1f22);
  H.casters.push({ t: 'box', x0: Hl.x1 - 1.6, y0: top, z0: -82, x1: Hl.x1 - 1.2, y1: top + 6, z1: -60 });
  sign('kexfasad', { kind: 'kex', ppm: 36 }, (Hl.x0 + Hl.x1) / 2, CURB_H + 6.6, Hl.z1 + 0.08, 16, 2.6, 0);
  // the chimney, red and white
  const Ch = KEX.chimney;
  for (let k = 0; k < 8; k++) P({ t: 'cyl', x: Ch.x, z: Ch.z, y0: top + k * 2.2, y1: top + (k + 1) * 2.2, r: 1.25 - k * 0.04, r1: 1.25 - (k + 1) * 0.04, n: 12, c: k % 2 ? 0xf2efe6 : 0xd2342c });
  P({ t: 'cyl', x: Ch.x, z: Ch.z, y0: top + 17.6, y1: top + 18.1, r: 0.98, n: 12, c: 0x2a2b2e });
  H.casters.push({ t: 'pole', x: Ch.x, z: Ch.z, h: top + 18, w: 2.4 });
  // flour silos north of the office, a pipe over to the hall
  for (const [sx, sz] of KEX.silos) {
    P({ t: 'cyl', x: sx, z: sz, y0: CURB_H, y1: CURB_H + 2.6, r: 1.0, r1: 2.4, n: 12, c: 0xc9ccd0 });
    P({ t: 'cyl', x: sx, z: sz, y0: CURB_H + 2.6, y1: CURB_H + 13.5, r: 2.4, n: 12, c: 0xe2e6ea });
    P({ t: 'cyl', x: sx, z: sz, y0: CURB_H + 13.5, y1: CURB_H + 14.6, r: 2.4, r1: 0.6, n: 12, c: 0xb8bcc0, cap: true });
    for (const [lx, lz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) box(sx + lx - 0.09, CURB_H, sz + lz - 0.09, sx + lx + 0.09, CURB_H + 2.8, sz + lz + 0.09, 0x8e9196);
    box(sx - 2.42, CURB_H + 8.2, sz - 0.5, sx - 2.38, CURB_H + 9.0, sz + 0.5, 0x1f4fa0);
    colCircle(sx, sz, 2.4, 14);
    H.casters.push({ t: 'pole', x: sx, z: sz, h: CURB_H + 14.6, w: 4.8 });
    H.footprints.push({ x0: sx - 2.2, z0: sz - 2.2, x1: sx + 2.2, z1: sz + 2.2, c: 0xc0c6cc });
  }
  box(-353, CURB_H + 12.4, -41.4, -333, CURB_H + 12.9, -40.6, 0x9aa0a6);
  box(-353, CURB_H + 12.4, -50, -352.4, CURB_H + 12.9, -40.6, 0x9aa0a6);
  // the office block: two floors, white with blue window bands, KONTOR over the door
  const Of = KEX.office;
  building({ x0: Of.x0, z0: Of.z0, x1: Of.x1, z1: Of.z1, h: 6.8, c: 0xeef0f2, m: M.OFFICE, cell: [2.4, 3.4], topC: 0x5a6068, mapC: 0xb8c0c8, parapetC: 0x1f4fa0 });
  box(Of.x1 + 0.02, CURB_H, -18.6, Of.x1 + 0.08, CURB_H + 2.3, -16.4, 0x2a3a4a);
  box(Of.x1 + 0.08, CURB_H, -18.45, Of.x1 + 0.1, CURB_H + 2.2, -16.55, 0x9fb7c4, M.GLASS);
  box(Of.x1, CURB_H + 2.5, -19.2, Of.x1 + 1.6, CURB_H + 2.62, -15.8, 0x1f4fa0);
  sign('kexkontor', { lines: ['KONTOR · VD V. KNÄCK'], bg: '#ffffff', fg: '#1f4fa0', font: 0.52 }, Of.x1 + 0.1, CURB_H + 3.15, -17.5, 3.2, 0.42, Math.PI / 2);
  // the water tower with the biscuit painted on its tank
  const Tw = KEX.tower;
  for (const [lx, lz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) {
    P({ t: 'tube', a: [Tw.x + lx, CURB_H, Tw.z + lz], b: [Tw.x + lx * 0.55, CURB_H + 14, Tw.z + lz * 0.55], r: 0.22, c: 0x5a6068, m: 0, n: 6 });
    colCircle(Tw.x + lx, Tw.z + lz, 0.3, 4);
  }
  P({ t: 'cyl', x: Tw.x, z: Tw.z, y0: CURB_H + 14, y1: CURB_H + 14.6, r: 3.6, n: 16, c: 0x5a6068, cap: true });
  P({ t: 'cyl', x: Tw.x, z: Tw.z, y0: CURB_H + 14.6, y1: CURB_H + 20, r: 3.4, n: 16, c: 0xdfe6ee });
  P({ t: 'cyl', x: Tw.x, z: Tw.z, y0: CURB_H + 20, y1: CURB_H + 22.2, r: 3.5, r1: 0.4, n: 16, c: 0x1f4fa0, cap: true });
  sign('kextorn', { kind: 'kex' }, Tw.x + 3.45, CURB_H + 17.3, Tw.z, 6.0, 1.0, Math.PI / 2);
  H.casters.push({ t: 'pole', x: Tw.x, z: Tw.z, h: CURB_H + 22, w: 6.8 });
  H.footprints.push({ x0: Tw.x - 3.4, z0: Tw.z - 3.4, x1: Tw.x + 3.4, z1: Tw.z + 3.4, c: 0xb8c0c8 });
  // the staff car park, pallets of boxes in the yard, a skip
  const Pk = KEX.park;
  for (let k = 0; k <= 7; k++) { const x = Pk.x0 + 1 + k * 2.8; mark([[x - 0.06, Pk.z1 - 5.6], [x + 0.06, Pk.z1 - 5.6], [x + 0.06, Pk.z1], [x - 0.06, Pk.z1]], MARK_Y); }
  // (no parked cars here: they would draw from the game's random numbers at the start and move all the traffic)
  for (const [x, z, n] of [[-300, -94, 3], [-297.6, -94, 2], [-291, -95.5, 4], [-300, -44, 2]]) {
    solid(x - 0.6, CURB_H, z - 0.5, x + 0.6, CURB_H + 0.14, z + 0.5, 0xa98257, M.PLANKS);
    for (let i = 0; i < n; i++) box(x - 0.55, CURB_H + 0.14 + i * 0.36, z - 0.45, x + 0.55, CURB_H + 0.48 + i * 0.36, z + 0.45, i % 2 ? 0xd8c8a0 : 0xc8b890, M.BOARDS);
    colBox(x - 0.6, z - 0.5, x + 0.6, z + 0.5, CURB_H + 0.5 + n * 0.36);
  }
  solid(-284, CURB_H, -96, -280, CURB_H + 1.4, -93.4, 0x1f4fa0);   // the skip

  // ---- the quay on the south shore: bollards, a crane, containers
  H.area(Q.x0 + 1, Q.z0, Q.x1 - 1, Q.z1, 0xa8a49c, M.PAVING, PATCH_Y - 0.004);
  for (let x = Q.x0 + 4; x <= Q.x1 - 4; x += 8) {
    P({ t: 'cyl', x, z: Q.z1 - 0.6, y0: CURB_H, y1: CURB_H + 0.55, r: 0.2, r1: 0.16, n: 8, c: 0x2d3238, cap: true });
    colCircle(x, Q.z1 - 0.6, 0.22, 0.8);
  }
  for (let x = Q.x0 + 2; x < Q.x1 - 1; x += 1.2) box(x, CURB_H, Q.z1 - 0.12, x + 0.9, CURB_H + 0.12, Q.z1, 0xf2c21b);   // the yellow edge
  // a slewing crane on rails
  {
    const cx = -306, cz = 50;
    for (const dx of [-2.6, 2.6]) for (const dz of [-2.6, 2.6]) { P({ t: 'tube', a: [cx + dx, CURB_H, cz + dz], b: [cx + dx * 0.4, CURB_H + 11, cz + dz * 0.4], r: 0.2, c: 0xe8a812, m: 0, n: 6 }); colCircle(cx + dx, cz + dz, 0.25, 3); }
    solid(cx - 1.6, CURB_H + 11, cz - 1.6, cx + 1.6, CURB_H + 13.4, cz + 1.6, 0xe8a812);
    box(cx - 1.4, CURB_H + 12.2, cz + 1.6, cx + 1.4, CURB_H + 13.2, cz + 1.66, 0x2a3540, M.GLASS);
    box(cx - 6, CURB_H + 13.4, cz - 0.4, cx + 18, CURB_H + 14.2, cz + 0.4, 0xe8a812);                         // the jib, along the quay
    box(cx - 6, CURB_H + 12.2, cz - 0.9, cx - 3.6, CURB_H + 13.4, cz + 0.9, 0x5a6068);                       // counterweight
    P({ t: 'tube', a: [cx + 14, CURB_H + 13.4, cz], b: [cx + 14, CURB_H + 4.2, cz], r: 0.03, c: 0x1d1f22, m: 0, n: 4 });
    box(cx + 13.6, CURB_H + 3.8, cz - 0.4, cx + 14.4, CURB_H + 4.2, cz + 0.4, 0xd2342c);
    H.casters.push({ t: 'pole', x: cx, z: cz, h: CURB_H + 14, w: 3.4 });
  }
  // containers, two stacks
  const container = (x0, z0, y, c) => {
    box(x0, CURB_H + y, z0, x0 + 6.1, CURB_H + y + 2.6, z0 + 2.45, c, M.CORR, { cell: [0.6, 2.6] });
    H.casters.push({ t: 'box', x0, y0: CURB_H + y, z0, x1: x0 + 6.1, y1: CURB_H + y + 2.6, z1: z0 + 2.45 });
  };
  for (const [x0, z0, n, cs] of [[-346, 42.5, 2, [0x2c62a8, 0xd2342c]], [-346, 45.4, 1, [0x2f6b45]], [-338, 42.5, 3, [0xe8833a, 0x2c62a8, 0x8a8f99]], [-276.5, 44.5, 1, [0x1f4fa0]]]) {
    for (let i = 0; i < n; i++) container(x0, z0, i * 2.6, cs[i % cs.length]);
    colBox(x0, z0, x0 + 6.1, z0 + 2.45, CURB_H + n * 2.6);
  }
  sign('kajen', { lines: ['VÄSTERHOLMENS KAJ'], bg: '#2b2e35', fg: '#f2c21b', font: 0.58 }, -322, CURB_H + 2.3, Q.z0 + 0.3, 3.6, 0.6, 0);
  post(-323.5, Q.z0 + 0.25, 1.9); post(-320.5, Q.z0 + 0.25, 1.9);

  // the ship's name board (render: sjubyview.js draws the ship once it has come)
  H.signs.shipname = { lines: ['KARDEMUMMA'], bg: '#1d2a44', fg: '#f2efe6', font: 0.7, w: 6.4, h: 1.0 };
  H.signs.shipport = { lines: ['M/S KARDEMUMMA'], bg: '#f2efe6', fg: '#1d2a44', font: 0.6, w: 5.0, h: 0.8 };
}
