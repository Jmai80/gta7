// Söderholmen (v1.6): the island across the south bridge, reached from Kungsgatan (x = -40).
// No beach here: a rocky shore all round. What sets it apart is Tivoli Lyckoland, the amusement
// park that fills the middle of the island – a Ferris wheel you can ride, a carousel, the roller
// coaster "Måsen", bumper cars, kiosks and strings of coloured lights. West of it: a few houses
// round the little white chapel, and the tivoli's car park.
// Pure data like layout.js and island.js: everything goes out through the helpers createLayout
// hands over. The moving parts (the wheel, its gondolas, the carousel, the coaster's train, the
// bumper cars) are drawn by tivoli.js from the functions at the bottom of this file – they run
// on the game's clock, so the ride on the wheel (rides.js) and the picture agree.
import { CURB_H, SOUTH_BRIDGE } from './config.js';
import { filletPath } from './island.js';

const ROAD_Y = CURB_H + 0.02;
const PATCH_Y = CURB_H + 0.02;
const MARK_Y = CURB_H + 0.04;
const ROAD_W = 8;
const BX = SOUTH_BRIDGE.at, BZ = SOUTH_BRIDGE.to;   // where the bridge deck meets the island

// the shoreline, going round from the bridge landing (north) eastward
const COAST = [
  [BX + 5, BZ], [BX + 5, BZ + 3.2], [BX - 5, BZ + 3.2], [BX - 5, BZ], [-55, 180], [-84, 183], [-108, 191], [-122, 206], [-127, 232],
  [-124, 258], [-114, 278], [-92, 288], [-50, 291], [0, 290], [50, 291], [90, 287], [112, 277], [123, 256], [125, 228],
  [120, 204], [106, 189], [80, 182], [40, 179], [0, 179], [-25, 180],
];
// the road round the tivoli (a rectangle with wide rounded corners) and the short road up from the bridge
const LOOP = [[-100, 198], [100, 198], [100, 272], [-100, 272]];
const SPINE = [[BX, BZ + 3.2], [BX, 198]];

export const SOUTH = {
  name: 'Söderholmen',
  coast: COAST,
  bbox: { x0: -128, z0: 178.5, x1: 126, z1: 292 },
  landing: { x: BX, z: BZ + 1.6 },
  junction: { x: BX, z: 198 },
  tivoli: { x0: -20, z0: 207, x1: 86, z1: 263 },     // Tivoli Lyckoland, inside its white fence
  gate: { x0: 4, x1: 12, z: 207 },                    // the way in, under the arch
  parking: { x0: -60, z0: 202.2, x1: -27, z1: 228 },
  chapel: { x0: -56, z0: 238, x1: -45, z1: 254 },
  center: { x: 33, z: 235 },
};

// the Ferris wheel: hub, radius, gondolas, one turn every 32 s. The gondolas hang between the two
// rims at z; gondola k is at the bottom when the wheel's angle is -k·2π/n
export const WHEEL = { x: 62, z: 222, hubY: CURB_H + 15.6, r: 13, n: 16, period: 32, hang: 1.9, board: { x: 62, z: 224.6 }, exit: { x: 60.1, z: 228.2 } };
export const CAROUSEL = { x: 22, z: 226, r: 7, omega: 0.55 };
export const BUMPERS = { x0: -16, z0: 211, x1: 2, z1: 229 };
// the roller coaster: an oval (two straights and two half circles) with the station on the north
// straight; heights over the ground along the track (s in metres from the station)
export const COASTER = { x0: -8, x1: 72, zN: 245, zS: 259, r: 7, cars: 4, gap: 2.5, station: 4, dwell: 7 };
const CO_STRAIGHT = COASTER.x1 - COASTER.x0;
export const CO_LEN = 2 * CO_STRAIGHT + 2 * Math.PI * COASTER.r;
const CO_KEYS = [
  [0, 1.6], [12, 1.6], [70, 12.5], [77, 13.1], [CO_STRAIGHT + Math.PI * COASTER.r / 2, 12.9], [CO_STRAIGHT + Math.PI * COASTER.r, 12.4],
  [120, 1.3], [136, 7.6], [150, 1.5], [164, 5.3], [178, 2.2], [192, 1.9], [CO_LEN, 1.6],
];

// ---------------------------------------------------------------- geometry helpers
export function onSouth(x, z) {
  const B = SOUTH.bbox;
  if (x < B.x0 || x > B.x1 || z < B.z0 || z > B.z1) return false;
  let inside = false;
  for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) {
    const [xi, zi] = COAST[i], [xj, zj] = COAST[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export const SOUTH_ROADS = {
  sloop: filletPath(LOOP, 22, true),
  sspine: filletPath(SPINE, 0, false),
};

// the distance from (x, z) to the nearest road centerline on Söderholmen
export function southRoadDist(x, z) {
  let best = 1e9;
  for (const R of Object.values(SOUTH_ROADS)) {
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

export function inTivoli(x, z) {
  const T = SOUTH.tivoli;
  return x > T.x0 && x < T.x1 && z > T.z0 && z < T.z1;
}

// ---------------------------------------------------------------- the moving parts (game time t)
export const wheelAngle = (t) => (t / WHEEL.period) * Math.PI * 2;
// where gondola k hangs from the rim (the pivot) at time t
export function gondolaPivot(k, t) {
  const a = wheelAngle(t) + (k / WHEEL.n) * Math.PI * 2;
  return { x: WHEEL.x + Math.sin(a) * WHEEL.r, y: WHEEL.hubY - Math.cos(a) * WHEEL.r, z: WHEEL.z, a };
}
// the gondola next to reach the bottom after time t, and when
export function nextGondola(t) {
  const n = WHEEL.n, step = WHEEL.period / n;
  const ph = ((t % WHEEL.period) + WHEEL.period) % WHEEL.period;      // the wheel's turn so far
  const j = Math.floor(ph / step) + 1;                                  // at j·step a gondola is at the bottom
  return { k: ((n - (j % n)) % n), at: t + (j * step - ph) };
}
export const carouselAngle = (t) => t * CAROUSEL.omega;

// a point on the coaster's oval at distance s: { x, z, dx, dz } (dx, dz: the direction of travel)
export function coasterXZ(s) {
  const C = COASTER, L = CO_STRAIGHT, arc = Math.PI * C.r, cz = (C.zN + C.zS) / 2;
  s = ((s % CO_LEN) + CO_LEN) % CO_LEN;
  if (s < L) return { x: C.x0 + s, z: C.zN, dx: 1, dz: 0 };
  if (s < L + arc) { const a = (s - L) / C.r; return { x: C.x1 + Math.sin(a) * C.r, z: cz - Math.cos(a) * C.r, dx: Math.cos(a), dz: Math.sin(a) }; }
  if (s < 2 * L + arc) return { x: C.x1 - (s - L - arc), z: C.zS, dx: -1, dz: 0 };
  const a = (s - 2 * L - arc) / C.r;
  return { x: C.x0 - Math.sin(a) * C.r, z: cz + Math.cos(a) * C.r, dx: -Math.cos(a), dz: -Math.sin(a) };
}
// the track's height over the ground at s (eased between the key points)
export function coasterH(s) {
  s = ((s % CO_LEN) + CO_LEN) % CO_LEN;
  for (let i = 1; i < CO_KEYS.length; i++) {
    const [s1, h1] = CO_KEYS[i];
    if (s <= s1) {
      const [s0, h0] = CO_KEYS[i - 1], u = (s - s0) / (s1 - s0), e = u * u * (3 - 2 * u);
      return h0 + (h1 - h0) * e;
    }
  }
  return CO_KEYS[0][1];
}
// the train's run: up the lift slowly, then as fast as the drop allows; a stop in the station.
// A table of where the front car is, every 0.05 s of one round
const CO_TABLE = (() => {
  const out = [], dt = 0.05, top = 13.6;
  let s = COASTER.station, t = 0;
  for (let i = 0; i < Math.round(COASTER.dwell / dt); i++) { out.push(s); t += dt; }
  while (s < COASTER.station + CO_LEN) {
    out.push(s);
    const ss = ((s % CO_LEN) + CO_LEN) % CO_LEN;
    const lift = ss > 10 && ss < 76;
    const v = lift ? 2.8 : Math.max(2.2, Math.sqrt(Math.max(0, 2 * 9.81 * (top - coasterH(ss)))) * 0.82);
    s += v * dt; t += dt;
  }
  return out;
})();
export const CO_PERIOD = CO_TABLE.length * 0.05;
// (v1.7) where the train stands when Måsen has stopped: high up the lift hill, just below the crest
export const CO_STUCK_T = CO_TABLE.findIndex((s) => s >= 64) * 0.05;
export function coasterFront(t) {
  const f = (((t % CO_PERIOD) + CO_PERIOD) % CO_PERIOD) / 0.05, i = Math.floor(f), u = f - i;
  const a = CO_TABLE[i], b = i + 1 < CO_TABLE.length ? CO_TABLE[i + 1] : CO_TABLE[0] + CO_LEN;
  return a + (b - a) * u;
}
// car i of the train at time t: position on the rails (y: the floor of the car), heading and pitch
export function coasterCar(i, t) {
  const s = coasterFront(t) - i * COASTER.gap, P = coasterXZ(s);
  const h = coasterH(s), slope = (coasterH(s + 0.6) - coasterH(s - 0.6)) / 1.2;
  return { x: P.x, z: P.z, y: CURB_H + h + 0.35, h: Math.atan2(P.dx, P.dz), pitch: Math.atan(slope) };
}
// the bumper cars: six cars on their own wobbly loops round the floor
export function bumperCar(i, t) {
  const B = BUMPERS, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2, ax = (B.x1 - B.x0) / 2 - 2.0, az = (B.z1 - B.z0) / 2 - 2.0;
  const w1 = 0.23 + i * 0.031, w2 = 0.19 + ((i * 7) % 5) * 0.027, p1 = i * 1.7, p2 = i * 2.9 + 0.4;
  const x = cx + Math.sin(t * w1 + p1) * ax, z = cz + Math.sin(t * w2 + p2) * az;
  const dx = Math.cos(t * w1 + p1) * ax * w1, dz = Math.cos(t * w2 + p2) * az * w2;
  return { x, z, h: Math.atan2(dx, dz) };
}

// a little hash from an integer (0..1): things placed "at random" without the layout's random numbers
function hash(i) { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }

function centroid(pts) {
  let x = 0, z = 0;
  for (const p of pts) { x += p[0]; z += p[1]; }
  return [x / pts.length, z / pts.length];
}

// ---------------------------------------------------------------- the island
// H: the helpers of createLayout (as for islandInto, plus woodFence). Called last of all in
// createLayout, so the trees (which draw from the layout's random numbers) move nothing else.
export function southInto(H) {
  const { P, box, solid, poly, sign, colBox, colOBox, colCircle, building, tree, lamp, bench, hedge, woodFence, mark, M, COL } = H;
  const C = [0, 236];

  // ---- ground, the rocky shore (no sand anywhere) and the edge you cannot drive off
  poly([C, ...COAST, COAST[0]], 0x6a9640, M.LAWN, CURB_H);
  const nC = COAST.length;
  let seed = 1;
  for (let i = 0; i < nC; i++) {
    const a = COAST[i], b = COAST[(i + 1) % nC];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const out = (dz / l) * (mx - C[0]) + (-dx / l) * (mz - C[1]) > 0;
    P({ t: 'wall', x0: a[0], z0: a[1], x1: b[0], z1: b[1], y0: -2.6, y1: CURB_H, c: 0x77716a, m: M.STONE, flip: !out });
    const ux = dx / l, uz = dz / l, nx = out ? dz / l : -dz / l, nz = out ? -dx / l : dx / l;
    if (!(Math.abs(mx - BX) < 6 && mz < BZ + 3.3)) {                     // (the notch the bridge road comes in through)
      colOBox(mx - nx * 0.45, mz - nz * 0.45, l / 2 + 0.4, 0.35, Math.atan2(-uz, ux), 1.3);
    }
    // granite all along the shore: big slabs on the south and west, smaller stones up north
    const big = mz > 230 || mx < -100;
    for (let s = 1.5 + hash(seed++) * 3; s < l - 1; s += (big ? 3.2 : 5.5) + hash(seed++) * 4) {
      if (Math.abs(a[0] + ux * s - BX) < 9 && a[1] + uz * s < BZ + 8) continue;
      const x = a[0] + ux * s + nx * (hash(seed++) * 1.4 - 0.4), z = a[1] + uz * s + nz * (hash(seed++) * 1.4 - 0.4);
      const r = big ? 1.2 + hash(seed++) * 1.9 : 0.6 + hash(seed++) * 1.1, sy = 0.45 + hash(seed++) * 0.35;
      P({ t: 'ico', x, y: CURB_H - r * sy * 0.3, z, r, sy, c: [0x8a837c, 0x9a8f86, 0x7a756f, 0xa69a8e, 0x8f7f76][Math.floor(hash(seed++) * 5)] });
    }
  }
  const rock = (x, z, r, sy = 0.6, col = true) => {
    P({ t: 'ico', x, y: CURB_H - r * sy * 0.25, z, r, sy, c: [0x8a837c, 0x978a80, 0x7a756f, 0xa09489][Math.floor(hash(x * 7 + z) * 4)] });
    if (col) colCircle(x, z, r * 0.85, CURB_H + r * sy * 0.7);
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
  const hw = ROAD_W / 2;
  const nearJ = (x, z) => Math.hypot(x - BX, z - 198) < 9 || (Math.abs(x + 43) < 12 && z > 200 && z < 206); // the junction, the car park's way in
  for (const key of ['sloop', 'sspine']) {
    const Rd = SOUTH_ROADS[key];
    strip(Rd, -hw, hw, ROAD_Y, 0x41444a, M.ASPHALT);
    const skip = key === 'sloop' ? nearJ : (x, z) => nearJ(x, z) || z < BZ + 6;
    strip(Rd, -hw + 0.35, -hw + 0.5, MARK_Y, 0, 0, mark, 0, skip);
    strip(Rd, hw - 0.5, hw - 0.35, MARK_Y, 0, 0, mark, 0, skip);
    strip(Rd, -0.08, 0.08, MARK_Y, 0, 0, mark, 7, skip);
  }

  // ---- the bridge landing: a short slope up onto the island, the place-name sign
  H.ramps.push({ x0: BX - 5, x1: BX + 5, z0: BZ, z1: BZ + 3.2, h0: 0, h1: CURB_H, axis: 'z', road: true });
  P({ t: 'quad', pts: [[BX - 5, ROAD_Y, BZ + 3.2], [BX + 5, ROAD_Y, BZ + 3.2], [BX + 5, 0.005, BZ], [BX - 5, 0.005, BZ]], c: 0x41444a, m: M.ASPHALT });
  solid(BX - 5.6, -0.02, BZ, BX - 5, 0.95, BZ + 3.2, COL.concrete); solid(BX + 5, -0.02, BZ, BX + 5.6, 0.95, BZ + 3.2, COL.concrete);
  const post = (x, z, h, c = 0x9aa0a6) => P({ t: 'cyl', x, z, y0: CURB_H, y1: CURB_H + h, r: 0.05, n: 5, c });
  sign('soderholmen', { lines: ['SÖDERHOLMEN'], bg: '#1f5aa6', fg: '#ffffff', border: '#ffffff', font: 0.6 }, BX - 8.6, CURB_H + 2.25, BZ + 8.2, 3.6, 0.85, Math.PI);
  post(BX - 7.2, BZ + 8.25, 2.7); post(BX - 10, BZ + 8.25, 2.7);
  sign('tivolipil', { lines: ['TIVOLI LYCKOLAND →'], bg: '#c0302a', fg: '#ffffff', border: '#ffd34d', font: 0.55 }, BX + 7.4, CURB_H + 1.9, 193.6, 3.2, 0.62, Math.PI);
  post(BX + 6.1, 193.65, 2.25); post(BX + 8.7, 193.65, 2.25);

  // ---- lamps along the inner side of the road, benches looking back at the town
  for (let x = -76; x <= 80; x += 26) if (Math.abs(x - BX) > 10 && Math.abs(x - 8) > 8) lamp(x, 203.2, Math.PI);
  for (const z of [226, 246]) { lamp(-95.6, z, -Math.PI / 2); lamp(95.6, z, Math.PI / 2); }
  for (let x = -70; x <= 70; x += 35) lamp(x, 276.4, Math.PI);
  for (const x of [-16, -6, 16, 26, 58, 68]) bench(x, 187.6, Math.PI);
  for (const [x, z] of [[-22, 186], [36, 185.5], [86, 188], [-70, 189.5], [-96, 197]]) if (onSouth(x, z)) tree(x, z, 'birch', 1.0);

  // ---- the car park west of the tivoli
  const Pk = SOUTH.parking;
  H.area(Pk.x0, Pk.z0, Pk.x1, Pk.z1, 0x494c52, M.ASPHALT, PATCH_Y);
  for (let k = 0; k <= 6; k++) {
    const x = Pk.x0 + 2 + k * 2.8;
    mark([[x - 0.06, Pk.z1 - 6.2], [x + 0.06, Pk.z1 - 6.2], [x + 0.06, Pk.z1 - 0.8], [x - 0.06, Pk.z1 - 0.8]], MARK_Y);
    mark([[x - 0.06, Pk.z0 + 7.0], [x + 0.06, Pk.z0 + 7.0], [x + 0.06, Pk.z0 + 12.4], [x - 0.06, Pk.z0 + 12.4]], MARK_Y);
  }
  sign('sparkering', { kind: 'parking' }, Pk.x1 - 1.6, CURB_H + 2.3, Pk.z0 + 1.2, 0.9, 0.9, Math.PI);
  post(Pk.x1 - 1.6, Pk.z0 + 1.25, 1.85);
  // a bike rack and a couple of the showmen's caravans
  for (let k = 0; k < 5; k++) P({ t: 'rbox', cx: Pk.x1 - 1.2, cy: CURB_H + 0.4, cz: Pk.z0 + 15 + k * 0.9, sx: 0.06, sy: 0.8, sz: 0.6, rot: 0, c: 0x9aa0a6 });
  const caravan = (x, z, rot, c) => {
    P({ t: 'rbox', cx: x, cy: CURB_H + 1.45, cz: z, sx: 2.3, sy: 2.0, sz: 5.4, rot, c, m: M.PAINT });
    P({ t: 'rbox', cx: x, cy: CURB_H + 1.9, cz: z, sx: 2.34, sy: 0.55, sz: 3.2, rot, c: 0x2a3540, m: M.GLASS });
    P({ t: 'rbox', cx: x, cy: CURB_H + 0.32, cz: z, sx: 2.0, sy: 0.4, sz: 4.6, rot, c: 0x2d3238 });
    P({ t: 'rbox', cx: x + Math.sin(rot) * 3.2, cy: CURB_H + 0.4, cz: z + Math.cos(rot) * 3.2, sx: 0.12, sy: 0.12, sz: 1.4, rot, c: 0x2d3238 });
    colOBox(x, z, 1.2, 2.75, rot, 2.5);
    H.casters.push({ t: 'box', x0: x - 1.4, y0: CURB_H, z0: z - 2.8, x1: x + 1.4, y1: CURB_H + 2.4, z1: z + 2.8 });
  };
  caravan(-32, 236, 0.08, 0xf1ede2); caravan(-27.5, 244, -0.12, 0xe8c66a);

  // ---- the houses on the west side, and the little white chapel
  const HOUSES = [
    [-91, 226, 0xd9a14a, 0x3a3c41], [-91, 240, 0x9db8cc, 0x8c3f2d], [-75, 212, 0x8e2c20, 0x3a3c41],
    [-75, 228, 0xeeeae0, 0x8c3f2d], [-75, 244, 0x9bb08a, 0x3a3c41], [-75, 258, 0xd9a5a0, 0x5b524a],
  ];
  HOUSES.forEach(([x, z, wc, rc], i) => {
    building({ x0: x, z0: z, x1: x + 8, z1: z + 7, h: 3.0, c: wc, m: M.FALU, cell: [2.2, 3], roof: 'gable', roofH: 2.0, roofC: rc, axis: 'z', overhang: 0.35, mapC: 0x9a8f80 });
    const west = x < -85;                                  // the door on the side that faces the road
    const fx = west ? x : x + 8, dz = z + 3.5, s = west ? -1 : 1;
    box(fx + s * 0.06, CURB_H, dz - 0.55, fx, CURB_H + 2.1, dz + 0.55, 0x3b4148, M.BOARDS);
    box(fx + s * 0.5, CURB_H, dz - 0.8, fx, CURB_H + 0.12, dz + 0.8, 0x8f8a83, M.STONE);
    if (!west) woodFence(x + 11, z - 1, x + 11, z + 8, 0.9, COL.trim);
    if (i % 2 === 0) tree(west ? x + 4 : x - 2.2, z + 9.5, i % 4 ? 'oak' : 'birch', 0.8);
  });
  const Ch = SOUTH.chapel;
  building({ x0: Ch.x0, z0: Ch.z0, x1: Ch.x1, z1: Ch.z1, h: 4.2, c: 0xf2efe8, m: M.FALU, cell: [2.6, 4.2], roof: 'gable', roofH: 3.4, roofC: 0x3a3c41, axis: 'z', overhang: 0.3, mapC: 0xd8d4cc });
  {
    const tx = (Ch.x0 + Ch.x1) / 2, tz = Ch.z0 - 1.6;
    solid(tx - 2, CURB_H, tz - 2, tx + 2, CURB_H + 9, tz + 2, 0xf2efe8, M.PLAIN);
    P({ t: 'cyl', x: tx, z: tz, y0: CURB_H + 9, y1: CURB_H + 15.5, r: 2.83, r1: 0.05, n: 4, c: 0x3a3c41, m: M.TILES });
    P({ t: 'cyl', x: tx, z: tz, y0: CURB_H + 15.5, y1: CURB_H + 16.6, r: 0.05, n: 4, c: 0xd9b23a });
    box(tx - 0.5, CURB_H + 16.0, tz - 0.05, tx + 0.5, CURB_H + 16.12, tz + 0.05, 0xd9b23a);
    box(tx - 0.7, CURB_H, tz - 2.06, tx + 0.7, CURB_H + 2.5, tz - 2, 0x5b4636, M.BOARDS);
    box(tx - 0.55, CURB_H + 5.6, tz - 2.06, tx + 0.55, CURB_H + 6.9, tz - 2, 0x2a3540, M.GLASS);
    H.casters.push({ t: 'pole', x: tx, z: tz, h: CURB_H + 15.5, w: 3 });
    H.area(tx - 1, Pk.z1, tx + 1, tz - 2, COL.gravel, M.DIRT, PATCH_Y);
    for (const [x, z] of [[-58.5, 244], [-58.5, 249], [-42.5, 244], [-42.5, 249]]) {   // gravestones
      box(x - 0.35, CURB_H, z - 0.1, x + 0.35, CURB_H + 0.75, z + 0.1, 0x8f8a83, M.STONE);
      colBox(x - 0.35, z - 0.12, x + 0.35, z + 0.12, 0.8);
    }
    hedge(-61, 233, -60.2, 258, 1.0); hedge(-61, 258, -40.5, 258.8, 1.0); hedge(-41.3, 236, -40.5, 258, 1.0);
  }
  for (const [x, z, k] of [[-64, 214, 'oak'], [-84, 254, 'birch'], [-58, 264, 'oak'], [-37, 262, 'spruce'], [-30, 254, 'birch'], [-87, 213, 'spruce']]) tree(x, z, k, 0.95);

  // ---- outside the loop: trees and rocks on the east and south, a lookout on the south cliffs
  for (const [x, z, k] of [[110, 214, 'pine'], [113, 240, 'oak'], [108, 262, 'pine'], [-110, 222, 'pine'], [-114, 248, 'oak'], [-104, 270, 'pine'], [-30, 283, 'pine'], [30, 284, 'pine'], [70, 281, 'oak'], [-72, 284, 'spruce']]) {
    if (onSouth(x, z) && southRoadDist(x, z) > hw + 2.5) tree(x, z, k, 1.05);
  }
  for (const [x, z, r] of [[116, 228, 1.6], [-118, 236, 1.9], [-8, 284, 2.1], [48, 285, 1.7], [96, 276, 1.5], [-96, 280, 1.8]]) if (onSouth(x, z) && southRoadDist(x, z) > hw + r + 1) rock(x, z, r);
  bench(6, 284.6, 0); bench(14, 284.6, 0);
  P({ t: 'cyl', x: 10, z: 286.4, y0: CURB_H, y1: CURB_H + 7.5, r: 0.07, n: 6, c: 0xeeeeea });          // a flagpole on the cliff
  box(10.05, CURB_H + 6.2, 286.38, 12.3, CURB_H + 7.4, 286.42, 0x2c62a8);
  box(10.05, CURB_H + 6.65, 286.36, 12.3, CURB_H + 6.95, 286.44, 0xf2c21b);
  box(10.85, CURB_H + 6.2, 286.36, 11.15, CURB_H + 7.4, 286.44, 0xf2c21b);

  tivoliInto(H, post);
}

// ---------------------------------------------------------------- flower beds (v1.8.2)
// An oval raised bed at (cx, cz): white boards round it, dark soil, low leaves, and flowers of one
// kind in mixed colours. Placed "at random" with hash() – no layout random numbers.
function flowerBed(H, cx, cz, kind, k) {
  const { P, colCircle, M } = H;
  const tube = (a, b, r, c, n = 4) => P({ t: 'tube', a, b, r, c, m: 0, n });
  const rx = 2.4, rz = 1.6, top = CURB_H + 0.24, N = 16;
  const pts = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]); }
  H.poly([[cx, cz], ...pts, pts[0]], 0x4a3324, M.DIRT, top);
  for (let i = 0; i < N; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % N], len = Math.hypot(x1 - x0, z1 - z0);
    P({ t: 'rbox', cx: (x0 + x1) / 2, cy: CURB_H + 0.13, cz: (z0 + z1) / 2, sx: 0.09, sy: 0.27, sz: len + 0.05, rot: Math.atan2(x1 - x0, z1 - z0), c: 0xa8743e, m: M.PLANKS });
  }
  colCircle(cx - 1.0, cz, 1.55, 0.6); colCircle(cx + 1.0, cz, 1.55, 0.6);
  const rnd = (i) => hash(k * 131 + i * 7.3);
  // low leaves covering most of the soil
  for (let i = 0; i < 16; i++) {
    const a = rnd(i) * Math.PI * 2, d = Math.sqrt(rnd(i + 50)) * 0.88;
    P({ t: 'ico', x: cx + Math.cos(a) * rx * d, y: top + 0.03, z: cz + Math.sin(a) * rz * d, r: 0.26 + rnd(i + 9) * 0.12, sy: 0.4, c: [0x3f7a2a, 0x4f8a2e, 0x467d2a, 0x5a9436][i % 4] });
  }
  const COLORS = { tulip: [0xd2342c, 0xf2c21b, 0xe85d9a, 0xf28c28, 0xfaf4ec, 0xb8206a], daisy: [0xfaf6ee, 0xfaf6ee, 0xf6e0ee], salvia: [0x7a3fb8, 0x8e44ad, 0x5a4fc8, 0xb06ad8], sun: [0xf2c21b] };
  // the flowers on a sunflower-seed spiral filling the oval, the tallest in the middle
  const n = kind === 'sun' ? 9 : 30;
  for (let i = 0; i < n; i++) {
    const d = Math.sqrt((i + 0.5) / n) * 0.86, a = i * 2.39996 + rnd(i) * 0.3;
    const x = cx + Math.cos(a) * rx * d, z = cz + Math.sin(a) * rz * d;
    const c = COLORS[kind][Math.floor(rnd(i + 70) * COLORS[kind].length)];
    const h = (kind === 'sun' ? 1.1 + rnd(i + 3) * 0.4 : kind === 'salvia' ? 0.4 + rnd(i + 3) * 0.14 : 0.34 + rnd(i + 3) * 0.16) * (1.15 - d * 0.35);
    const lx = (rnd(i + 30) - 0.5) * 0.08, lz = (rnd(i + 40) - 0.5) * 0.08, y1 = top + h, hx = x + lx, hz = z + lz;
    tube([x, top, z], [hx, y1, hz], kind === 'sun' ? 0.028 : 0.014, 0x3f7a2a);
    // leaves on the stem
    for (let j = 0; j < (kind === 'sun' ? 3 : 2); j++) {
      const la = rnd(i + j * 11) * Math.PI * 2, ly = top + h * (0.2 + j * 0.22), ls = kind === 'sun' ? 0.28 : kind === 'tulip' ? 0.2 : 0.11;
      P({ t: 'rbox', cx: x + Math.sin(la) * ls * 0.45, cy: ly, cz: z + Math.cos(la) * ls * 0.45, sx: ls * 0.45, sy: 0.014, sz: ls, rot: la, tiltX: -0.5, c: 0x4f8a2e });
    }
    if (kind === 'tulip') {
      // a cup: a widening body, three outer petals and a rounded bottom
      P({ t: 'cyl', x: hx, z: hz, y0: y1, y1: y1 + 0.14, r: 0.04, r1: 0.075, n: 6, c });
      for (let j = 0; j < 3; j++) {
        const pa = (j / 3) * Math.PI * 2 + rnd(i + 5);
        P({ t: 'rbox', cx: hx + Math.sin(pa) * 0.06, cy: y1 + 0.09, cz: hz + Math.cos(pa) * 0.06, sx: 0.075, sy: 0.13, sz: 0.016, rot: pa, tiltX: -0.22, c });
      }
      P({ t: 'ico', x: hx, y: y1 + 0.02, z: hz, r: 0.05, sy: 0.9, c });
    } else if (kind === 'daisy') {
      // white petals round a yellow middle
      for (let j = 0; j < 9; j++) {
        const pa = (j / 9) * Math.PI * 2;
        P({ t: 'rbox', cx: hx + Math.sin(pa) * 0.075, cy: y1, cz: hz + Math.cos(pa) * 0.075, sx: 0.04, sy: 0.01, sz: 0.105, rot: pa, tiltX: -0.15, c });
      }
      P({ t: 'ico', x: hx, y: y1 + 0.015, z: hz, r: 0.045, sy: 0.6, c: 0xf2b01b });
    } else if (kind === 'salvia') {
      // a spike of small flowers
      for (let j = 0; j < 7; j++) P({ t: 'ico', x: hx, y: y1 - 0.02 + j * 0.04, z: hz, r: 0.045 - j * 0.005, sy: 1.2, c });
    } else {
      // a sunflower: two rings of yellow petals round a big brown middle, turned to the sun (south-west)
      const fa = -2.4 + (rnd(i + 8) - 0.5) * 0.5, fx = Math.sin(fa), fz = Math.cos(fa);
      for (const [cnt, rr, sz, col] of [[14, 0.2, 0.11, 0xe8a812], [14, 0.15, 0.1, 0xf2c21b]]) {
        for (let j = 0; j < cnt; j++) {
          const pa = (j / cnt) * Math.PI * 2 + (rr < 0.18 ? 0.22 : 0), ox = Math.cos(pa), oy = Math.sin(pa);
          P({ t: 'rbox', cx: hx + fz * ox * rr + fx * 0.01, cy: y1 + oy * rr, cz: hz - fx * ox * rr + fz * 0.01, sx: sz, sy: sz, sz: 0.014, rot: Math.atan2(fx, fz), tiltX: 0, c: col });
        }
      }
      P({ t: 'ico', x: hx + fx * 0.03, y: y1, z: hz + fz * 0.03, r: 0.13, sy: 1, c: 0x5a3a1a });
    }
  }
}

// ---------------------------------------------------------------- Tivoli Lyckoland
function tivoliInto(H, post) {
  const { P, box, solid, sign, colBox, colOBox, colCircle, bench, woodFence, M, COL } = H;
  const T = SOUTH.tivoli, G = SOUTH.gate, Y = PATCH_Y;
  const tube = (a, b, r, c, m = 0, n = 6) => P({ t: 'tube', a, b, r, c, m, n });
  const PAVE = 0xc2b49a;

  // ground: trodden gravel everywhere, paved promenades
  H.area(T.x0, T.z0, T.x1, T.z1, 0xb3a387, M.DIRT, Y - 0.01);
  H.area(G.x0 + 0.5, 202.2, G.x1 - 0.5, 236, PAVE, M.PAVING, Y);           // from the road, through the gate
  H.area(T.x0 + 1, 236, T.x1 - 1, 240.5, PAVE, M.PAVING, Y);                 // the promenade
  H.area(60, 224.5, 64, 236, PAVE, M.PAVING, Y);                             // to the wheel
  H.area(T.x0 + 2, 209, 3.8, 211, PAVE, M.PAVING, Y);                         // along the bumper cars
  H.area(12.2, 209, 84, 213.2, PAVE, M.PAVING, Y);                            // past the kiosks
  // inside the coaster's oval: grass and flowers
  H.area(COASTER.x0, COASTER.zN + 1.4, COASTER.x1, COASTER.zS - 1.4, 0x6a9640, M.LAWN, Y - 0.005);
  // (v1.8.2) seven raised flower beds with white board edging: tulips, marguerites, purple salvia
  // and – in the middle – tall sunflowers. Each flower has a stem, leaves and petals.
  const BEDS = ['tulip', 'daisy', 'salvia', 'sun', 'tulip', 'daisy', 'salvia'];
  BEDS.forEach((kind, k) => flowerBed(H, COASTER.x0 + 8 + k * 10.5, 252, kind, k));

  // the white picket fence round it all, open at the gate
  const fh = 1.25;
  woodFence(T.x0, T.z0, G.x0 - 0.6, T.z0, fh, COL.trim); woodFence(G.x1 + 0.6, T.z0, T.x1, T.z0, fh, COL.trim);
  woodFence(T.x0, T.z1, T.x1, T.z1, fh, COL.trim);
  woodFence(T.x0, T.z0, T.x0, T.z1, fh, COL.trim); woodFence(T.x1, T.z0, T.x1, T.z1, fh, COL.trim);

  // ---- the arch over the gate: two striped towers and the name in lights
  for (const x of [G.x0 - 0.6, G.x1 + 0.6]) {
    for (let k = 0; k < 6; k++) P({ t: 'cyl', x, z: G.z, y0: CURB_H + k * 1.1, y1: CURB_H + (k + 1) * 1.1, r: 0.62, n: 10, c: k % 2 ? 0xf2efe6 : 0xd2342c });
    P({ t: 'cyl', x, z: G.z, y0: CURB_H + 6.6, y1: CURB_H + 8.4, r: 0.85, r1: 0.05, n: 10, c: 0x2c62a8, cap: true });
    P({ t: 'ico', x, y: CURB_H + 8.5, z: G.z, r: 0.18, sy: 1, c: 0xf2c21b });
    colCircle(x, G.z, 0.65, 20);
    H.casters.push({ t: 'pole', x, z: G.z, h: CURB_H + 8.4, w: 1.3 });
  }
  box(G.x0 - 0.2, CURB_H + 5.0, G.z - 0.25, G.x1 + 0.2, CURB_H + 6.6, G.z + 0.25, 0x2c62a8);
  sign('lyckoland', { kind: 'lyckoland' }, (G.x0 + G.x1) / 2, CURB_H + 5.8, G.z - 0.27, 8.4, 1.5, Math.PI);
  for (let k = 0; k <= 14; k++) {
    const x = G.x0 - 0.1 + k * (G.x1 - G.x0 + 0.2) / 14;
    box(x - 0.07, CURB_H + 6.62, G.z - 0.3, x + 0.07, CURB_H + 6.76, G.z - 0.16, k % 2 ? 0xffe08a : 0xff7a5c, M.LIGHT);
    box(x - 0.07, CURB_H + 4.84, G.z - 0.3, x + 0.07, CURB_H + 4.98, G.z - 0.16, k % 2 ? 0xff7a5c : 0xffe08a, M.LIGHT);
  }

  // ---- kiosks with striped awnings (facing the path past them, to the south)
  const kiosk = (x, z, w, c, id, def) => {
    const d = 2.4, x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    solid(x0, CURB_H, z0, x1, CURB_H + 2.5, z1, c, M.BOARDS);
    box(x0 + 0.3, CURB_H + 1.0, z1, x1 - 0.3, CURB_H + 2.1, z1 + 0.04, 0x2b2e35, M.GLASS);      // the hatch
    box(x0 + 0.2, CURB_H + 0.95, z1, x1 - 0.2, CURB_H + 1.05, z1 + 0.45, 0xeeeae0);            // the counter
    const n = Math.round(w / 0.5);
    for (let k = 0; k < n; k++) P({ t: 'rbox', cx: x0 + (k + 0.5) * (w / n), cy: CURB_H + 2.62, cz: z1 + 0.55, sx: w / n, sy: 0.06, sz: 1.3, rot: 0, tiltX: 0.38, c: k % 2 ? 0xf2efe6 : 0xd2342c });
    box(x0 - 0.05, CURB_H + 2.5, z0 - 0.05, x1 + 0.05, CURB_H + 2.62, z1 + 0.05, 0xf2efe6);
    sign(id, def, x, CURB_H + 3.25, z1 - 0.2, Math.min(w, 3.4), 0.7, 0);
    box(x - Math.min(w, 3.4) / 2, CURB_H + 2.6, z1 - 0.26, x + Math.min(w, 3.4) / 2, CURB_H + 2.9, z1 - 0.22, 0xf2efe6);
  };
  kiosk(16, 208.6, 3.2, 0x2c62a8, 'biljetter', { lines: ['BILJETTER'], bg: '#f2c21b', fg: '#1d1f22', font: 0.62 });
  kiosk(36, 208.6, 3.6, 0xe85d9a, 'sockervadd', { lines: ['SOCKERVADD'], bg: '#ffffff', fg: '#d63b85', font: 0.6 });
  kiosk(46, 208.6, 3.4, 0xf2c21b, 'popcorn', { lines: ['POPCORN'], bg: '#d2342c', fg: '#ffffff', font: 0.62 });
  kiosk(78, 208.6, 4.2, 0x2f6b45, 'korv', { lines: ['KORV & DRICKA'], bg: '#ffffff', fg: '#2f6b45', font: 0.55 });
  // picnic tables by the hot-dog stand
  for (const [x, z] of [[76, 220], [80.5, 228]]) {
    box(x - 1.2, CURB_H + 0.72, z - 0.45, x + 1.2, CURB_H + 0.8, z + 0.45, COL.wood, M.PLANKS);
    for (const s of [-1, 1]) box(x - 1.2, CURB_H + 0.42, z + s * 0.75 - 0.15, x + 1.2, CURB_H + 0.48, z + s * 0.75 + 0.15, COL.wood, M.PLANKS);
    for (const s of [-1, 1]) box(x + s * 1.0 - 0.06, CURB_H, z - 0.9, x + s * 1.0 + 0.06, CURB_H + 0.74, z + 0.9, 0x5a4430);
    P({ t: 'cyl', x, z, y0: CURB_H + 0.8, y1: CURB_H + 2.6, r: 0.04, n: 4, c: 0xdddddd });
    P({ t: 'cyl', x, z, y0: CURB_H + 2.0, y1: CURB_H + 2.7, r: 1.7, r1: 0.06, n: 8, c: [0xd2342c, 0x2c62a8][x > 78 ? 1 : 0] });
    colBox(x - 1.2, z - 0.95, x + 1.2, z + 0.95, 0.8);
  }
  // the wheel of fortune (Lyckohjulet): a booth and a painted disc
  {
    const x = 42, z = 229;
    solid(x - 2.2, CURB_H, z - 1.0, x + 2.2, CURB_H + 1.1, z + 1.0, 0x8e44ad, M.BOARDS);
    box(x - 2.3, CURB_H + 1.1, z - 1.1, x + 2.3, CURB_H + 1.18, z + 1.1, 0xf2efe6);
    P({ t: 'hcyl', x, y: CURB_H + 3.0, z: z + 0.84, len: 0.08, r: 1.3, axis: 'z', n: 24, c: 0xf2efe6 });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      tube([x, CURB_H + 3.0, z + 0.9], [x + Math.cos(a) * 1.18, CURB_H + 3.0 + Math.sin(a) * 1.18, z + 0.9], 0.2, [0xd2342c, 0xf2c21b, 0x2c62a8, 0x2fb35a][k % 4], 0, 4);
    }
    P({ t: 'cyl', x, z: z + 0.8, y0: CURB_H + 1.18, y1: CURB_H + 1.8, r: 0.08, n: 5, c: 0x2d3238 });
    box(x - 0.08, CURB_H + 1.7, z + 0.74, x + 0.08, CURB_H + 4.35, z + 0.8, 0x2d3238);
    box(x - 0.1, CURB_H + 4.2, z + 0.84, x + 0.1, CURB_H + 4.5, z + 0.9, 0xf2efe6, M.LIGHT);
  }

  // ---- the bumper cars: a floor under a roof on posts, a rubber-lined barrier round it
  const B = BUMPERS;
  H.area(B.x0, B.z0, B.x1, B.z1, 0x2f3338, M.PLAIN, Y + 0.08);
  for (const [x0, z0, x1, z1] of [[B.x0, B.z0, B.x1, B.z0 + 0.3], [B.x0, B.z1 - 0.3, B.x1, B.z1], [B.x0, B.z0, B.x0 + 0.3, B.z1], [B.x1 - 0.3, B.z0, B.x1, B.z1]]) {
    box(x0, CURB_H, z0, x1, CURB_H + 0.55, z1, 0xf2c21b);
    box(x0 - 0.02, CURB_H + 0.25, z0 - 0.02, x1 + 0.02, CURB_H + 0.45, z1 + 0.02, 0x1d1f22);
    colBox(x0, z0, x1, z1, 0.9);
  }
  for (const x of [B.x0 + 0.3, (B.x0 + B.x1) / 2, B.x1 - 0.3]) for (const z of [B.z0 + 0.3, B.z1 - 0.3]) {
    P({ t: 'cyl', x, z, y0: CURB_H, y1: CURB_H + 4.6, r: 0.12, n: 6, c: 0xd2342c });
    colCircle(x, z, 0.15, 2);
  }
  box(B.x0 - 0.4, CURB_H + 4.6, B.z0 - 0.4, B.x1 + 0.4, CURB_H + 4.9, B.z1 + 0.4, 0xf2efe6);
  for (let k = 0; k < 9; k++) P({ t: 'rbox', cx: (B.x0 + B.x1) / 2, cy: CURB_H + 4.94, cz: B.z0 - 0.4 + (k + 0.5) * ((B.z1 - B.z0 + 0.8) / 9), sx: B.x1 - B.x0 + 1.0, sy: 0.08, sz: (B.z1 - B.z0 + 0.8) / 9, rot: 0, c: k % 2 ? 0xf2efe6 : 0x2c62a8 });
  H.casters.push({ t: 'box', x0: B.x0 - 0.4, y0: CURB_H + 4.6, z0: B.z0 - 0.4, x1: B.x1 + 0.4, y1: CURB_H + 5.3, z1: B.z1 + 0.4 });
  H.footprints.push({ x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, c: 0x2c62a8 });
  sign('radiobilar', { lines: ['RADIOBILAR'], bg: '#2c62a8', fg: '#ffd34d', border: '#ffffff', font: 0.6 }, B.x1 + 0.42, CURB_H + 5.5, (B.z0 + B.z1) / 2, 6, 1.1, Math.PI / 2);

  // ---- the carousel: a striped canopy over horses on poles (the turning part: tivoli.js)
  const Cr = CAROUSEL;
  P({ t: 'cyl', x: Cr.x, z: Cr.z, y0: CURB_H, y1: CURB_H + 0.32, r: Cr.r + 0.4, n: 20, c: 0x8a4b22, m: M.PLANKS, cap: true });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.3;
    box(Cr.x + Math.cos(a) * (Cr.r + 0.4) - 0.5, CURB_H, Cr.z + Math.sin(a) * (Cr.r + 0.4) - 0.5, Cr.x + Math.cos(a) * (Cr.r + 0.4) + 0.5, CURB_H + 0.18, Cr.z + Math.sin(a) * (Cr.r + 0.4) + 0.5, 0x8f8a83, M.STONE);
  }
  colCircle(Cr.x, Cr.z, Cr.r + 0.3, 2.4);
  H.casters.push({ t: 'pole', x: Cr.x, z: Cr.z, h: CURB_H + 6.5, w: 2 * Cr.r });
  H.footprints.push({ x0: Cr.x - 5, z0: Cr.z - 5, x1: Cr.x + 5, z1: Cr.z + 5, c: 0xd2342c });

  // ---- the Ferris wheel: two A-frames, the axle, a fence round the bottom (the wheel: tivoli.js)
  const W = WHEEL, hy = W.hubY;
  for (const dz of [-2.5, 2.5]) {
    for (const dx of [-7.6, 7.6]) {
      tube([W.x + dx, CURB_H, W.z + dz * 1.5], [W.x + dx * 0.05, hy, W.z + dz], 0.24, 0xeeeeea, 0, 8);
      P({ t: 'cyl', x: W.x + dx, z: W.z + dz * 1.5, y0: CURB_H, y1: CURB_H + 0.5, r: 0.6, n: 8, c: COL.concrete, cap: true });
      colCircle(W.x + dx, W.z + dz * 1.5, 0.6, 2);
    }
    tube([W.x - 3.9, CURB_H + 7.9, W.z + dz * 1.25], [W.x + 3.9, CURB_H + 7.9, W.z + dz * 1.25], 0.14, 0xeeeeea, 0, 6);
    tube([W.x - 5.8, CURB_H + 3.8, W.z + dz * 1.38], [W.x + 5.8, CURB_H + 3.8, W.z + dz * 1.38], 0.14, 0xeeeeea, 0, 6);
  }
  P({ t: 'hcyl', x: W.x, y: hy, z: W.z, len: 5.6, r: 0.42, axis: 'z', n: 10, c: 0x9aa0a6 });
  for (const dx of [-5.5, 5.5]) H.casters.push({ t: 'pole', x: W.x + dx * 0.5, z: W.z, h: hy, w: 0.6 }); // (the wheel itself is mostly air)
  H.footprints.push({ x0: W.x - 7.8, z0: W.z - 4, x1: W.x + 7.8, z1: W.z + 4, c: 0xeeeeea });
  // the boarding platform and the railing round the bottom of the wheel (a gap to the platform)
  box(W.x - 2.4, CURB_H, W.z - 1.6, W.x + 2.4, CURB_H + 0.42, W.z + 3.2, 0x8a6440, M.PLANKS);
  P({ t: 'quad', pts: [[W.x - 1.4, CURB_H + 0.42, W.z + 3.2], [W.x + 1.4, CURB_H + 0.42, W.z + 3.2], [W.x + 1.4, Y, W.z + 4.4], [W.x - 1.4, Y, W.z + 4.4]], c: 0x8a6440, m: M.PLANKS });
  H.ramps.push({ x0: W.x - 1.4, x1: W.x + 1.4, z0: W.z + 3.2, z1: W.z + 4.4, h0: CURB_H + 0.42, h1: CURB_H, axis: 'z' });
  H.floorsSouth.push({ x0: W.x - 2.4, z0: W.z - 1.6, x1: W.x + 2.4, z1: W.z + 3.2, y: CURB_H + 0.42 });
  const rail = (x0, z0, x1, z1) => {
    const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = horiz ? Math.abs(x1 - x0) : Math.abs(z1 - z0), n = Math.max(1, Math.round(len / 1.6));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * (i / n), z = z0 + (z1 - z0) * (i / n); box(x - 0.04, CURB_H, z - 0.04, x + 0.04, CURB_H + 1.0, z + 0.04, 0xd2342c); }
    box(Math.min(x0, x1) - 0.04, CURB_H + 0.95, Math.min(z0, z1) - 0.04, Math.max(x0, x1) + 0.04, CURB_H + 1.03, Math.max(z0, z1) + 0.04, 0xd2342c);
    colBox(Math.min(x0, x1) - 0.1, Math.min(z0, z1) - 0.1, Math.max(x0, x1) + 0.1, Math.max(z0, z1) + 0.1, 1.0);
  };
  const r0 = W.x - 9.4, r1 = W.x + 9.4, rz0 = W.z - 4.6, rz1 = W.z + 4.6;
  rail(r0, rz0, r1, rz0); rail(r0, rz0, r0, rz1); rail(r1, rz0, r1, rz1);
  rail(r0, rz1, W.x - 1.6, rz1); rail(W.x + 1.6, rz1, r1, rz1);
  sign('hjulet', { lines: ['PARISERHJULET', '20 kr · ett varv'], bg: '#f2efe6', fg: '#c0302a', border: '#2c62a8' }, W.x + 4.8, CURB_H + 2.3, rz1 + 0.12, 3.4, 1.05, 0);
  post(W.x + 3.4, rz1 + 0.08, 2.9, 0xd2342c); post(W.x + 6.2, rz1 + 0.08, 2.9, 0xd2342c);

  // ---- the roller coaster "Måsen": rails, sleepers and posts all the way round, the station
  const N = Math.ceil(CO_LEN / 2), pt = (s, off) => { const p = coasterXZ(s), h = coasterH(s); return [p.x - p.dz * off, CURB_H + h, p.z + p.dx * off]; };
  for (let i = 0; i < N; i++) {
    const s0 = (i / N) * CO_LEN, s1 = ((i + 1) / N) * CO_LEN;
    for (const off of [-0.55, 0.55]) tube(pt(s0, off), pt(s1, off), 0.08, 0xd2342c, 0, 5);
    const c0 = pt(s0, 0), c1 = pt(s1, 0);
    tube([c0[0], c0[1] - 0.32, c0[2]], [c1[0], c1[1] - 0.32, c1[2]], 0.13, 0xe8e2d0, 0, 5);
    const p = coasterXZ(s0);
    P({ t: 'rbox', cx: c0[0], cy: c0[1] - 0.1, cz: c0[2], sx: 1.3, sy: 0.08, sz: 0.16, rot: Math.atan2(p.dx, p.dz), c: 0x5a4430 });
    if (i % 2 === 0 && c0[1] > CURB_H + 0.9) {
      tube([c0[0], CURB_H, c0[2]], [c0[0], c0[1] - 0.4, c0[2]], 0.13, 0xe8e2d0, 0, 6);
      if (c0[1] > CURB_H + 6 && i % 4 === 0) {
        tube([c0[0] - p.dz * 1.6, CURB_H, c0[2] + p.dx * 1.6], [c0[0], c0[1] - 0.6, c0[2]], 0.08, 0xe8e2d0, 0, 5);
        tube([c0[0] + p.dz * 1.6, CURB_H, c0[2] - p.dx * 1.6], [c0[0], c0[1] - 0.6, c0[2]], 0.08, 0xe8e2d0, 0, 5);
      }
      colCircle(c0[0], c0[2], 0.25, 2);
    }
    // where the track runs low, you cannot step over it
    if (c0[1] < CURB_H + 2.3) {
      const q = coasterXZ((s0 + s1) / 2);
      colOBox(q.x, q.z, 0.8, (s1 - s0) / 2 + 0.05, Math.atan2(q.dx, q.dz), 1.2);
    }
  }
  // the station on the north straight: a platform and a roof
  const sx0 = COASTER.x0 - 2, sx1 = COASTER.x0 + 14, sz = COASTER.zN;
  box(sx0, CURB_H, sz - 2.6, sx1, CURB_H + 1.2, sz - 0.75, 0x8a6440, M.PLANKS);
  colBox(sx0, sz - 2.6, sx1, sz - 0.75, 1.2);
  for (const x of [sx0 + 0.3, (sx0 + sx1) / 2, sx1 - 0.3]) for (const z of [sz - 2.4, sz + 1.6]) { P({ t: 'cyl', x, z, y0: CURB_H, y1: CURB_H + 4.4, r: 0.1, n: 6, c: 0x2c62a8 }); colCircle(x, z, 0.12, 2); }
  for (let k = 0; k < 8; k++) P({ t: 'rbox', cx: (sx0 + sx1) / 2, cy: CURB_H + 4.55, cz: sz - 2.8 + (k + 0.5) * 0.6, sx: sx1 - sx0 + 0.6, sy: 0.1, sz: 0.6, rot: 0, c: k % 2 ? 0xf2efe6 : 0xd2342c });
  H.casters.push({ t: 'box', x0: sx0, y0: CURB_H + 4.4, z0: sz - 2.8, x1: sx1, y1: CURB_H + 4.7, z1: sz + 2.0 });
  sign('masen', { lines: ['MÅSEN'], bg: '#2c62a8', fg: '#ffffff', border: '#ffd34d', font: 0.7 }, (sx0 + sx1) / 2, CURB_H + 5.3, sz - 2.85, 4.2, 1.0, Math.PI);
  box((sx0 + sx1) / 2 - 2.2, CURB_H + 4.6, sz - 2.83, (sx0 + sx1) / 2 + 2.2, CURB_H + 5.85, sz - 2.78, 0xf2efe6);

  // ---- light strings along the promenade, benches, bins
  const POLES = [-17, -6, 3, 13, 24, 35, 46, 57, 66, 75, 84];   // (not on the paths to the gate and the wheel)
  const bulbs = (z, y) => {
    POLES.forEach((x, i) => {
      P({ t: 'cyl', x, z, y0: CURB_H, y1: CURB_H + y + 0.2, r: 0.06, n: 5, c: 0x2d3238 });
      colCircle(x, z, 0.1, 2);
      if (i === POLES.length - 1) return;
      const x1 = POLES[i + 1], n = Math.round((x1 - x) / 0.8);
      let prev = [x, CURB_H + y + 0.1, z];
      for (let k = 1; k <= n; k++) {
        const u = k / n, xx = x + u * (x1 - x), sag = Math.sin(u * Math.PI) * 0.7, yy = CURB_H + y + 0.1 - sag;
        tube(prev, [xx, yy, z], 0.02, 0x2d3238, 0, 3);                  // the cord
        prev = [xx, yy, z];
        if (k < n) box(xx - 0.07, yy - 0.2, z - 0.07, xx + 0.07, yy - 0.06, z + 0.07, [0xff7a5c, 0xffe08a, 0x8ad2ff, 0xa4ff8a, 0xff8ad8][k % 5], M.LIGHT);
      }
    });
  };
  bulbs(235.6, 3.6);
  bulbs(240.9, 3.6);
  for (const x of [20, 30, 50, 80]) bench(x, 242.4, 0);
  for (const x of [26, 50]) bench(x, 214.6, Math.PI);

  // ---- people about the tivoli: only for the eye (render.js draws them when you are near), so they
  // never touch the game's random numbers. The ones standing get a collider.
  const skin = [0xf0c8a8, 0xe8b996, 0xc68e62, 0x9c6b45, 0xf2d0b5];
  const LONG = 1, BUN = 2, BEARD = 4, GLASSES = 8, CAP = 16;
  const look = (shirt, pants, sk, hair, style = 0, height = 1, bulk = 1, accent = 0x1d1f22) => ({ shirt, pants, skin: skin[sk], hair, style, height, bulk, accent });
  const folk = [];
  const stand = (lk, x, z, h) => { folk.push({ look: lk, x, z, h, y: Y, pose: 0 }); colCircle(x, z, 0.28, 1.6); };
  const seated = (lk, x, z, h, hip = CURB_H + 0.47) => folk.push({ look: lk, x, z, h, y: hip - 0.92 * lk.height, pose: 5 });
  // in the queue for the wheel
  stand(look(0x2c62a8, 0x2b2e35, 0, 0x5a3a22, CAP, 1.0), 62, 229.0, Math.PI);
  stand(look(0xe85d9a, 0x24365e, 4, 0xd9b26b, LONG, 0.96, 0.95), 61.5, 230.3, Math.PI + 0.15);
  stand(look(0xf2c21b, 0x5a6e8a, 4, 0xd9b26b, 0, 0.66, 0.9), 62.6, 230.5, Math.PI - 0.3);
  // at the kiosks
  stand(look(0x2fb35a, 0x1d1f22, 2, 0x1a1a1a, BEARD, 1.03, 1.05), 16.2, 210.9, Math.PI);
  stand(look(0xf4f1ea, 0x24365e, 1, 0x8a5a2b, BUN, 0.97), 35.4, 210.9, Math.PI + 0.1);
  stand(look(0xd2342c, 0x5a6e8a, 1, 0x8a5a2b, CAP, 0.62, 0.88, 0x2c62a8), 36.7, 211.1, Math.PI - 0.4);
  stand(look(0x8e44ad, 0x7f8c8d, 3, 0x1a1a1a, LONG | GLASSES, 0.98), 46.3, 211.0, Math.PI);
  stand(look(0x24365e, 0x2b2e35, 0, 0xb0b0b0, GLASSES, 1.0, 1.1), 77.3, 211.2, Math.PI);
  stand(look(0xf28c28, 0x24365e, 2, 0x2b1d14, 0, 0.7, 0.9), 78.9, 211.4, Math.PI + 0.3);
  // at a picnic table, by the carousel, at the bumper cars, at the wheel of fortune, on the promenade
  seated(look(0x2fb3a8, 0x2b2e35, 1, 0x5a3a22, LONG), 75.4, 220.75, Math.PI);
  seated(look(0xd2342c, 0x24365e, 0, 0xd9b26b, 0, 1.02), 76.7, 219.25, 0);
  stand(look(0xf4f1ea, 0x5a6e8a, 4, 0xd9b26b, LONG | BUN, 0.97), 23.3, 234.6, Math.PI + 0.25);
  stand(look(0xf2c21b, 0x2c62a8, 4, 0xd9b26b, 0, 0.64, 0.88), 21.6, 234.4, Math.PI - 0.15);
  stand(look(0x2c62a8, 0x1d1f22, 3, 0x1a1a1a, CAP, 0.7, 0.9, 0xd2342c), 4.3, 219.2, -Math.PI / 2);
  stand(look(0xe85d9a, 0x2b2e35, 2, 0x2b1d14, LONG, 0.95), 4.3, 223.4, -Math.PI / 2 + 0.2);
  stand(look(0x24365e, 0x7f8c8d, 0, 0x8a5a2b, BEARD, 1.04, 1.08), 41.0, 231.3, Math.PI);
  stand(look(0xf28c28, 0x24365e, 1, 0x2b1d14, 0, 0.68, 0.9), 43.0, 231.4, Math.PI + 0.2);
  stand(look(0x2fb35a, 0x2b2e35, 4, 0xe8d29a, LONG, 0.96), 54, 238.1, Math.PI / 2);
  stand(look(0xf4f1ea, 0x1d1f22, 3, 0x1a1a1a, 0, 1.03), 55.3, 238.3, -Math.PI / 2);
  seated(look(0x8e44ad, 0x24365e, 1, 0xb0b0b0, GLASSES | BUN, 0.95), 20, 242.5, 0);
  seated(look(0x2c62a8, 0x2b2e35, 0, 0x5a3a22, CAP, 1.0), 30.4, 242.5, 0);
  H.zones.tivoliFolk = { x: SOUTH.center.x, z: SOUTH.center.z, list: folk };
}
