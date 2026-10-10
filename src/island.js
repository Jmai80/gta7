// Norrholmen (v0.6): the island across the north bridge, about a third the size of Sjuby.
// A curvy coastal road loops around it and a straight road runs up the middle from the bridge.
// West of it: the allotments (kolonilotterna), where Melker left Arne's delivery bike, and an old
// windmill. East of it: Bullbilen's bakery with its vans, a spruce wood and, out on the point,
// the lighthouse. A beach and a small marina face the town across the water.
// Pure data like layout.js: everything goes out through the helpers createLayout hands over.
import { CURB_H } from './config.js';
import { wrapAngle } from './rng.js';

const ROAD_Y = CURB_H + 0.02;   // asphalt painted on the grass (the island has no curbs)
const PATCH_Y = CURB_H + 0.02;  // gravel, sand, yards
const MARK_Y = CURB_H + 0.04;   // road markings, garden beds
const ROAD_W = 8;

// the shoreline, going round from the bridge landing (south) eastward
const COAST = [
  [25, -230], [35, -230], [35, -233.2], [45, -233.2], [45, -230], [55, -230], [95, -234], [128, -246], [142, -270], [146, -310], [140, -350], [128, -380],
  [108, -398], [80, -404], [40, -400], [5, -396], [-25, -385], [-44, -360], [-52, -320], [-48, -280],
  [-36, -250], [-12, -236],
];
// the coastal road (a closed loop with rounded corners) and the road up the middle
const LOOP = [
  [40, -250], [108, -253], [131, -282], [133, -330], [118, -366], [92, -381], [40, -386], [-8, -379],
  [-33, -350], [-37, -296], [-20, -260],
];
const SPINE = [[40, -233.2], [40, -386]];  // starts where the slope up from the bridge ends

export const ISLE = {
  name: 'Norrholmen',
  coast: COAST,
  bbox: { x0: -53, z0: -405, x1: 147, z1: -229 },
  landing: { x: 40, z: -232 },                       // where the bridge meets the island
  junction: { x: 40, z: -250 },
  allot: { x0: -14, x1: 29, z0: -338, z1: -280 },    // kolonilotterna
  allotGate: { x: 31, z: -309 },                     // the east gate (bollards: bikes and people only)
  allotBack: { x: -16, z: -309 },                    // the narrow back gate on the west side
  bike: { x: 7.5, z: -304.4, h: Math.PI },           // Arne's bike, locked by the gate of lott 7
  bakery: { x0: 58, z0: -334, x1: 102, z1: -310 },
  yard: { x0: 50, z0: -310, x1: 108, z1: -270, gateZ0: -292, gateZ1: -283 },
  vanSpawn: { x: 79, z: -296, h: -Math.PI / 2 },      // a Bullbilen van in the yard, ready to go
  mill: { x: -5, z: -360, hubY: CURB_H + 10.6 },
  lighthouse: { x: 113, z: -386 },
  beach: { x: 0, z: -242 },
};

// the beach (v1.1): the sand between the shoreline and its edge toward the road, the boardwalk from
// the road, the jetty you can walk out on, and the corners of the swimming area (the buoys)
export const BEACH = {
  shore: [[-34.5, -249.1], [-12, -236], [25.2, -230]],
  inland: [[-34.5, -249.6], [-31, -252.8], [-25, -255], [-18, -254.4], [-10, -252], [-2, -250.6], [6, -249.4], [14, -248], [20, -246.4], [24.4, -243], [26.2, -238], [26, -232.6], [25.4, -230.4]],
  walk: { x0: 3.2, x1: 4.8, z0: -251.2, z1: -233.6 },
  jetty: { x0: 3.1, x1: 4.9, z0: -233.9, z1: -220.5 },
  swim: [[-16.8, -234.6], [-20.5, -220.5], [13.5, -215.2], [12.4, -229.0]],
};

// ---------------------------------------------------------------- geometry helpers
export function onIsle(x, z) {
  const B = ISLE.bbox;
  if (x < B.x0 || x > B.x1 || z < B.z0 || z > B.z1) return false;
  let inside = false;
  for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) {
    const [xi, zi] = COAST[i], [xj, zj] = COAST[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function centroid(pts) {
  let x = 0, z = 0;
  for (const p of pts) { x += p[0]; z += p[1]; }
  return [x / pts.length, z / pts.length];
}

// A path through corner points with circular fillets, sampled about every 2 m.
// Returns the points and, per point, the unit direction of travel.
export function filletPath(corners, radius, closed) {
  const n = corners.length;
  const fil = corners.map((C, i) => {
    if (!closed && (i === 0 || i === n - 1)) return null;
    const P = corners[(i + n - 1) % n], N = corners[(i + 1) % n];
    const il = Math.hypot(C[0] - P[0], C[1] - P[1]), ol = Math.hypot(N[0] - C[0], N[1] - C[1]);
    const ix = (C[0] - P[0]) / il, iz = (C[1] - P[1]) / il, ox = (N[0] - C[0]) / ol, oz = (N[1] - C[1]) / ol;
    const dh = wrapAngle(Math.atan2(ox, oz) - Math.atan2(ix, iz));
    if (Math.abs(dh) < 0.01) return { A: C, B: C, none: true };
    let r = radius, t = r * Math.tan(Math.abs(dh) / 2);
    const tMax = 0.45 * Math.min(il, ol);
    if (t > tMax) { t = tMax; r = t / Math.tan(Math.abs(dh) / 2); }
    const A = [C[0] - ix * t, C[1] - iz * t], B = [C[0] + ox * t, C[1] + oz * t];
    const side = dh < 0 ? 1 : -1;
    const O = [A[0] - iz * r * side, A[1] + ix * r * side];
    return { A, B, O, r };
  });
  const pts = [];
  const line = (a, b) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(len / 2));
    for (let i = 0; i < steps; i++) pts.push([a[0] + (b[0] - a[0]) * (i / steps), a[1] + (b[1] - a[1]) * (i / steps)]);
  };
  const arc = (f) => {
    if (f.none) return;
    const a0 = Math.atan2(f.A[1] - f.O[1], f.A[0] - f.O[0]);
    const sweep = wrapAngle(Math.atan2(f.B[1] - f.O[1], f.B[0] - f.O[0]) - a0);
    const steps = Math.max(2, Math.ceil(Math.abs(sweep) * f.r / 1.5));
    for (let i = 0; i < steps; i++) {
      const a = a0 + sweep * (i / steps);
      pts.push([f.O[0] + Math.cos(a) * f.r, f.O[1] + Math.sin(a) * f.r]);
    }
  };
  if (closed) {
    for (let i = 0; i < n; i++) { arc(fil[i]); line(fil[i].B, fil[(i + 1) % n].A); }
  } else {
    line(corners[0], fil[1] ? fil[1].A : corners[1]);
    for (let i = 1; i < n - 1; i++) { arc(fil[i]); line(fil[i].B, i + 1 < n - 1 ? fil[i + 1].A : corners[n - 1]); }
    pts.push(corners[n - 1].slice());
  }
  // directions (central differences)
  const m = pts.length;
  const dirs = pts.map((p, i) => {
    const a = pts[closed ? (i + m - 1) % m : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % m : Math.min(m - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return [dx / l, dz / l];
  });
  return { pts, dirs, closed };
}

export const ROADS = {
  loop: filletPath(LOOP, 18, true),
  spine: filletPath(SPINE, 0, false),
};

// the distance from (x, z) to the nearest island road centerline (for the chase and the tests)
export function roadDist(x, z) {
  let best = 1e9;
  for (const R of Object.values(ROADS)) {
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

// ---------------------------------------------------------------- the island
// H: the helpers and lists of createLayout (P, box, solid, area, poly, sign, colBox, colOBox,
// colCircle, castBox, building, tree, lamp, bench, hedge, meshFence, mark, R, M, COL, casters,
// footprints, parked, zones, loops, blocks)
export function islandInto(H) {
  const { P, box, solid, poly, sign, colOBox, colCircle, building, tree, lamp, bench, hedge, meshFence, mark, R, M, COL } = H;
  const C = centroid(COAST);

  // ---- ground, shore and rocks
  poly([C, ...COAST, COAST[0]], 0x67933c, M.LAWN, CURB_H);
  const nC = COAST.length;
  for (let i = 0; i < nC; i++) {
    const a = COAST[i], b = COAST[(i + 1) % nC];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const out = (dz / l) * (mx - C[0]) + (-dx / l) * (mz - C[1]) > 0; // the wall's normal (left of travel) points out to sea?
    P({ t: 'wall', x0: a[0], z0: a[1], x1: b[0], z1: b[1], y0: -2.6, y1: CURB_H, c: 0x77716a, m: M.STONE, flip: !out });
    // you cannot walk or drive into the sea; the gap at the bridge landing lets the road through
    const ux = dx / l, uz = dz / l, nx = out ? dz / l : -dz / l, nz = out ? -dx / l : dx / l; // outward normal
    if (!(mx > 34 && mx < 46 && mz > -234)) {                             // (the notch the bridge road comes in through)
      // (v1.1) the beach's jetty: a gap you can walk out through
      const J = BEACH.jetty, s0 = (J.x0 - 0.05 - a[0]) / ux, s1 = (J.x1 + 0.05 - a[0]) / ux;
      const cuts = Math.abs(ux) > 0.5 && s0 > 0 && s1 < l && Math.abs(a[1] + uz * s0 - J.z0) < 1.5;
      const wall = (sa, sb) => colOBox(a[0] + ux * (sa + sb) / 2 - nx * 0.45, a[1] + uz * (sa + sb) / 2 - nz * 0.45, (sb - sa) / 2, 0.35, Math.atan2(-uz, ux), 1.3);
      if (cuts) { wall(-0.4, s0); wall(s1, l + 0.4); } else wall(-0.4, l + 0.4);
    }
    // granite boulders along the shore (not on the beach, the landing or the marina)
    const sandy = (x, z) => (z > -258 && x < 30 && x > -40) || (z > -250 && x > 30 && x < 125);
    for (let s = R.range(2, 5); s < l - 1; s += R.range(4.5, 9)) {
      const x = a[0] + ux * s + nx * R.range(-0.2, 0.9), z = a[1] + uz * s + nz * R.range(-0.2, 0.9);
      if (sandy(x, z)) continue;
      const r = R.range(0.7, 1.9), sy = R.range(0.5, 0.8);
      P({ t: 'ico', x, y: CURB_H - r * sy * 0.3, z, r, sy, c: [0x8a837c, 0x978a80, 0x7a756f, 0xa09489][R.int(0, 3)] });
    }
  }
  const rock = (x, z, r, sy = 0.6, col = true) => {
    P({ t: 'ico', x, y: CURB_H - r * sy * 0.25, z, r, sy, c: [0x8a837c, 0x978a80, 0x7a756f, 0xa09489][R.int(0, 3)] });
    if (col) colCircle(x, z, r * 0.85, CURB_H + r * sy * 0.7);
  };

  // ---- roads (painted on the grass), edge lines and a dashed center line
  const strip = (R0, off0, off1, y, c, m, sink, dash = 0, skip = null) => {
    const { pts, dirs, closed } = R0, n = pts.length, last = closed ? n : n - 1;
    let run = 0;
    for (let i = 0; i < last; i++) {
      const j = (i + 1) % n, a = pts[i], b = pts[j], da = dirs[i], db = dirs[j];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      run += seg;
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
  const nearJunction = (x, z) => Math.hypot(x - 40, z + 250) < 9 || Math.hypot(x - 40, z + 386) < 9;
  for (const key of ['loop', 'spine']) {
    const Rd = ROADS[key];
    strip(Rd, -hw, hw, ROAD_Y, 0x41444a, M.ASPHALT);
    const onSpineEnd = key === 'loop' ? nearJunction : (x, z) => nearJunction(x, z) || z > -236;
    strip(Rd, -hw + 0.35, -hw + 0.5, MARK_Y, 0, 0, mark, 0, onSpineEnd);
    strip(Rd, hw - 0.5, hw - 0.35, MARK_Y, 0, 0, mark, 0, onSpineEnd);
    strip(Rd, -0.08, 0.08, MARK_Y, 0, 0, mark, 7, onSpineEnd);
  }

  // ---- the bridge landing: a short slope from the deck up onto the island, a place-name sign
  H.ramps.push({ x0: 35, x1: 45, z0: -233.2, z1: -230, h0: CURB_H, h1: 0, axis: 'z', road: true });
  P({ t: 'quad', pts: [[35, 0.005, -230], [45, 0.005, -230], [45, ROAD_Y, -233.2], [35, ROAD_Y, -233.2]], c: 0x41444a, m: M.ASPHALT });
  solid(34.4, -0.02, -233.2, 35, 0.95, -230, COL.concrete); solid(45, -0.02, -233.2, 45.6, 0.95, -230, COL.concrete); // the parapets run on
  const post = (x, z, h) => P({ t: 'cyl', x, z, y0: CURB_H, y1: CURB_H + h, r: 0.05, n: 5, c: 0x9aa0a6 });
  sign('norrholmen', { lines: ['NORRHOLMEN'], bg: '#1f5aa6', fg: '#ffffff', border: '#ffffff', font: 0.6 }, 48.6, CURB_H + 2.25, -238.2, 3.4, 0.85, 0);
  post(47.2, -238.25, 2.7); post(50, -238.25, 2.7);
  sign('fyren', { lines: ['FYREN · KVARNEN'], bg: '#6b3d1f', fg: '#ffffff', border: '#ffffff', font: 0.55 }, 46.6, CURB_H + 1.9, -257, 2.8, 0.6, 0);
  post(45.5, -257.05, 2.25); post(47.7, -257.05, 2.25);

  // ---- lamps along the road up the middle
  for (let z = -264; z > -380; z -= 32) lamp(45.9, z, -Math.PI / 2);

  // ---- the allotments (kolonilotterna): 12 plots with cottages, hedges and vegetable beds
  const A = ISLE.allot, PATH = 3.5;
  const pw = (A.x1 - A.x0 - 2 * PATH) / 3, pd = (A.z1 - A.z0 - 3 * PATH) / 4;
  const midZ0 = A.z0 + 2 * pd + PATH, midZ1 = midZ0 + PATH;           // the middle path, east to west
  // gravel paths
  const gravel = (x0, z0, x1, z1) => H.area(x0, z0, x1, z1, COL.gravel, M.DIRT, PATCH_Y);
  for (let r = 1; r < 4; r++) { const z0 = A.z0 + r * pd + (r - 1) * PATH; gravel(A.x0, z0, A.x1, z0 + PATH); }
  for (let c = 1; c < 3; c++) { const x0 = A.x0 + c * pw + (c - 1) * PATH; gravel(x0, A.z0, x0 + PATH, A.z1); }
  gravel(A.x1, midZ0, A.x1 + 7, midZ1);          // out to the parking strip
  gravel(A.x0 - 5, midZ0 + 0.8, A.x0, midZ1 - 0.8); // the back gate path
  // a hedge round it all: a wide east gate (bollards) and a narrow back gate in the west
  const HH = 1.25;
  hedge(A.x0 - 0.8, A.z0 - 0.8, A.x1 + 0.8, A.z0, HH);
  hedge(A.x0 - 0.8, A.z1, A.x1 + 0.8, A.z1 + 0.8, HH);
  hedge(A.x1, A.z0, A.x1 + 0.8, midZ0 - 0.75, HH); hedge(A.x1, midZ1 + 0.75, A.x1 + 0.8, A.z1, HH);
  hedge(A.x0 - 0.8, A.z0, A.x0, midZ0 + 0.75, HH); hedge(A.x0 - 0.8, midZ1 - 0.75, A.x0, A.z1, HH);
  const bollard = (x, z) => {
    P({ t: 'cyl', x, z, y0: CURB_H, y1: CURB_H + 0.9, r: 0.14, r1: 0.12, n: 8, c: 0x2d3238, cap: true });
    P({ t: 'cyl', x, z, y0: CURB_H + 0.62, y1: CURB_H + 0.72, r: 0.145, n: 8, c: 0xe8e4da });
    colCircle(x, z, 0.16, 1.0);
  };
  for (let k = 0; k < 4; k++) bollard(A.x1 + 0.4, midZ0 - 0.4 + k * 1.45); // gaps of about a metre: bikes and people, no cars
  bollard(A.x0 - 0.4, (midZ0 + midZ1) / 2);
  sign('koloni', { lines: ['SJUBY KOLONIFÖRENING', 'Lott 1–12 · Välkommen'], bg: '#2f5d3a', fg: '#f1ede2', border: '#f1ede2' }, A.x1 + 1.6, CURB_H + 2.15, midZ0 - 2.2, 3.0, 0.95, Math.PI / 2);
  P({ t: 'cyl', x: A.x1 + 1.6, z: midZ0 - 3.5, y0: CURB_H, y1: CURB_H + 2.6, r: 0.05, n: 5, c: 0x9aa0a6 });
  P({ t: 'cyl', x: A.x1 + 1.6, z: midZ0 - 0.9, y0: CURB_H, y1: CURB_H + 2.6, r: 0.05, n: 5, c: 0x9aa0a6 });
  // the parking strip by the gate
  H.area(A.x1 + 0.8, A.z0 + 6, 35.4, A.z1 - 6, COL.gravel, M.DIRT, PATCH_Y);
  H.parked.push({ type: 'sedan', color: 'silver', x: 33.2, z: -322, h: Math.PI }, { type: 'sedan', color: 'yellow', x: 33.2, z: -292, h: Math.PI });
  // the plots
  const COTTAGE = [
    [0x8e2c20, 0x3a3c41], [0xe0b552, 0x8c3f2d], [0x9db8cc, 0x3a3c41], [0xeeeae0, 0x8c3f2d], [0x9bb08a, 0x3a3c41], [0xd9a5a0, 0x5b524a],
  ];
  let plotNo = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      plotNo++;
      const x0 = A.x0 + c * (pw + PATH), z0 = A.z0 + r * (pd + PATH), x1 = x0 + pw, z1 = z0 + pd;
      const gateNorth = r === 2 || r === 3;                 // rows 2–3 open to the north, rows 0–1 to the south
      const gz = gateNorth ? z0 : z1, gx = (x0 + x1) / 2;
      const low = 0.85, t = 0.45;
      hedge(x0, gateNorth ? z1 - t : z0, x1, gateNorth ? z1 : z0 + t, low);
      hedge(x0, z0 + t, x0 + t, z1 - t, low); hedge(x1 - t, z0 + t, x1, z1 - t, low);
      hedge(x0, gateNorth ? z0 : z1 - t, gx - 1.3, gateNorth ? z0 + t : z1, low);
      hedge(gx + 1.3, gateNorth ? z0 : z1 - t, x1, gateNorth ? z0 + t : z1, low);
      // the cottage at the back, the beds in front of it
      const [wc, rc] = COTTAGE[(plotNo * 5) % COTTAGE.length];
      const left = (plotNo % 2) === 0;
      const cx0 = left ? x0 + 1.1 : x1 - 1.1 - 3.6, cz0 = gateNorth ? z1 - 1.1 - 4.2 : z0 + 1.1;
      building({ x0: cx0, z0: cz0, x1: cx0 + 3.6, z1: cz0 + 4.2, h: 2.25, c: wc, m: M.FALU, cell: [1.8, 2.3], roof: 'gable', roofH: 1.25, roofC: rc, axis: 'z', overhang: 0.3, mapC: 0x6e6a5e });
      const bx0 = left ? x0 + 5.6 : x0 + 1.3, bx1 = left ? x1 - 1.3 : x1 - 5.6;
      const bz0 = gateNorth ? z0 + 2.2 : z0 + 3.4, bz1 = gateNorth ? z1 - 3.4 : z1 - 2.2;
      if (plotNo !== 8) {
        H.area(bx0, bz0, bx1, bz1, COL.dirt, M.DIRT, MARK_Y);
        const veg = [0x4f8a2e, 0x6a9a3a, 0x3f7a2a, 0x7aa84a][plotNo % 4];
        for (let x = bx0 + 0.5; x < bx1 - 0.3; x += 0.9) box(x, CURB_H, bz0 + 0.4, x + 0.35, CURB_H + R.range(0.18, 0.4), bz1 - 0.4, veg, M.FOLIAGE);
      } else {
        H.area(bx0, bz0, bx1, bz1, COL.gravel, M.DIRT, MARK_Y); // lott 7: Melker's mother's plot, all gravel
      }
      if (plotNo % 3 === 1) tree(left ? x1 - 2.2 : x0 + 2.2, gateNorth ? z1 - 2.3 : z0 + 2.3, 'oak', 0.55);
    }
  }
  // Lott 7 (the middle plot south of the middle path): a sign on the gate
  sign('lott7', { lines: ['LOTT 7'], bg: '#f1ede2', fg: '#1d1f22', border: '#1d1f22' }, ISLE.bike.x + 1.75, CURB_H + 1.25, midZ1 - 0.12, 0.9, 0.38, Math.PI);
  P({ t: 'cyl', x: ISLE.bike.x + 1.75, z: midZ1 - 0.08, y0: CURB_H, y1: CURB_H + 1.1, r: 0.04, n: 4, c: 0x6b5a48 });
  H.loops.push({ x0: A.x0 - 2.6, x1: A.x1 + 2.6, z0: A.z0 - 2.6, z1: A.z1 + 2.6 }); // people out for a walk

  // ---- Bullbilen's bakery: a brick factory, loading docks, a chimney and a giant bun on the roof
  const Bk = ISLE.bakery, Y = ISLE.yard;
  H.area(Y.x0, Y.z0, Y.x1, Y.z1, 0x494c52, M.ASPHALT, PATCH_Y);
  H.area(44, Y.gateZ0, Y.x0, Y.gateZ1, 0x494c52, M.ASPHALT, PATCH_Y);  // the driveway from the middle road
  building({ x0: Bk.x0, z0: Bk.z0, x1: Bk.x1, z1: Bk.z1, h: 8, c: 0x9a4a33, m: M.BRICKWIN, cell: [3.4, 3.2], topC: 0x55575c, mapC: 0x8a5a48 });
  solid(Bk.x0 + 3, CURB_H, Bk.z1, Bk.x1 - 3, CURB_H + 1.1, Bk.z1 + 2.4, COL.concrete);  // loading dock
  // the office (v0.7): a side door on the west wall and the window where the light is always on
  {
    const fx = Bk.x0, dz = -322;
    box(fx - 0.06, CURB_H, dz - 0.65, fx, CURB_H + 2.2, dz + 0.65, 0x5b4636, M.BOARDS);
    box(fx - 0.1, CURB_H + 0.95, dz + 0.38, fx - 0.06, CURB_H + 1.05, dz + 0.5, 0xc9ccd0, M.CHROME);
    box(fx - 0.5, CURB_H, dz - 0.9, fx, CURB_H + 0.12, dz + 0.9, 0x8f8a83, M.STONE);
    sign('kontorDoor', { lines: ['KONTOR'], bg: '#3a3c41', fg: '#f4efe4', font: 0.6 }, fx - 0.07, CURB_H + 2.5, dz, 0.9, 0.24, -Math.PI / 2);
    box(fx - 0.04, CURB_H + 1.1, -319.6, fx + 0.01, CURB_H + 2.5, -316.4, 0xffd98a, M.LIGHT);   // the lit window
    box(fx - 0.08, CURB_H + 1.04, -319.7, fx - 0.03, CURB_H + 1.1, -316.3, 0xf1eee7);
    box(fx - 0.08, CURB_H + 2.5, -319.7, fx - 0.03, CURB_H + 2.56, -316.3, 0xf1eee7);
    box(fx - 0.08, CURB_H + 1.1, -318.04, fx - 0.03, CURB_H + 2.5, -317.96, 0xf1eee7);
  }
  for (let i = 0; i < 4; i++) box(Bk.x0 + 5.5 + i * 9, CURB_H + 1.1, Bk.z1 - 0.06, Bk.x0 + 11 + i * 9, CURB_H + 4.6, Bk.z1 + 0.02, 0x8f969c, M.GARAGE, { cell: [5.5, 3.5] });
  sign('bageri', { kind: 'bullbil' }, (Bk.x0 + Bk.x1) / 2, CURB_H + 6.5, Bk.z1 + 0.08, 7.6, 3.45, 0);
  roofThings(H, Bk);
  // the chimney
  P({ t: 'cyl', x: Bk.x1 - 5, z: Bk.z0 + 4, y0: CURB_H + 8, y1: CURB_H + 21, r: 1.15, r1: 0.85, n: 10, c: 0x8a4030, m: M.BRICK });
  P({ t: 'cyl', x: Bk.x1 - 5, z: Bk.z0 + 4, y0: CURB_H + 20.4, y1: CURB_H + 21.1, r: 0.92, n: 10, c: 0x2a2b2e });
  H.casters.push({ t: 'pole', x: Bk.x1 - 5, z: Bk.z0 + 4, h: CURB_H + 21, w: 2 });
  // the fence round the yard, a gate onto the middle road
  meshFence(Y.x0, Y.z1, Y.x1, Y.z1, 2.2);
  meshFence(Y.x1, Y.z0, Y.x1, Y.z1, 2.2);
  meshFence(Y.x0, Y.z0 + 0.6, Y.x0, Y.gateZ0, 2.2);
  meshFence(Y.x0, Y.gateZ1, Y.x0, Y.z1, 2.2);
  sign('bagerigrind', { lines: ['BULLBILEN · BAGERIET', 'Obehöriga äga ej tillträde'], bg: '#f6ead2', fg: '#b8261f', border: '#8a4b22' }, Y.x0 - 0.15, CURB_H + 2.0, Y.gateZ0 - 2.2, 2.8, 0.9, -Math.PI / 2);
  // flour silos by the east fence, joined to the bakery by a pipe
  for (let k = 0; k < 3; k++) {
    const sx = Y.x1 - 4.2, sz = Bk.z1 + 6 + k * 5.2;
    P({ t: 'cyl', x: sx, z: sz, y0: CURB_H, y1: CURB_H + 2.2, r: 0.9, r1: 2.0, n: 12, c: 0xc9ccd0 });
    P({ t: 'cyl', x: sx, z: sz, y0: CURB_H + 2.2, y1: CURB_H + 10.5, r: 2.0, n: 12, c: 0xd9dcdf });
    P({ t: 'cyl', x: sx, z: sz, y0: CURB_H + 10.5, y1: CURB_H + 11.4, r: 2.0, r1: 0.5, n: 12, c: 0xb8bcc0, cap: true });
    for (const [lx, lz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) box(sx + lx - 0.08, CURB_H, sz + lz - 0.08, sx + lx + 0.08, CURB_H + 2.4, sz + lz + 0.08, 0x8e9196);
    colCircle(sx, sz, 2.0, 12);
    H.casters.push({ t: 'pole', x: sx, z: sz, h: CURB_H + 11.4, w: 4 });
    H.footprints.push({ x0: sx - 1.8, z0: sz - 1.8, x1: sx + 1.8, z1: sz + 1.8, c: 0xb8bcc0 });
  }
  box(Bk.x1 - 0.2, CURB_H + 9.6, Bk.z1 + 5.6, Y.x1 - 4.4, CURB_H + 10.1, Bk.z1 + 6.4, 0x9aa0a6);   // the flour pipe
  box(Bk.x1 - 0.4, CURB_H + 7.2, Bk.z1 + 5.6, Bk.x1 + 0.2, CURB_H + 10.1, Bk.z1 + 6.4, 0x9aa0a6);
  sign('mjol', { lines: ['MJÖL'], bg: '#d9dcdf', fg: '#8a4b22', font: 0.7 }, Y.x1 - 4.2, CURB_H + 7.4, Bk.z1 + 6 + 2 * 5.2 + 2.03, 1.8, 0.8, 0);
  // parking lines for the vans, pallets, a skip, a gatehouse
  for (let k = 0; k < 7; k++) {
    const x = Y.x0 + 6 + k * 5.2;
    mark([[x - 0.06, Y.z1 - 10.5], [x + 0.06, Y.z1 - 10.5], [x + 0.06, Y.z1 - 4.5], [x - 0.06, Y.z1 - 4.5]], MARK_Y);
  }
  for (const [x, z, n] of [[Bk.x0 + 2, Bk.z1 + 4.5, 3], [Bk.x0 + 4.2, Bk.z1 + 4.5, 2], [Bk.x1 - 1.5, Bk.z1 + 3.4, 4]]) solid(x - 0.6, CURB_H, z - 0.5, x + 0.6, CURB_H + 0.16 * n, z + 0.5, 0xa98257, M.PLANKS);
  solid(Y.x0 + 3, CURB_H, Bk.z1 + 3, Y.x0 + 5, CURB_H + 1.3, Bk.z1 + 4.4, 0x2f6b45);    // the skip
  building({ x0: Y.x0 + 1, z0: Y.gateZ0 - 4.2, x1: Y.x0 + 3.6, z1: Y.gateZ0 - 1.4, h: 2.5, c: 0xeeeae0, m: M.SHOP, cell: [2.6, 2.5], topC: 0x3a3c41, mapC: 0x9a968c });
  // three vans at the docks
  for (const x of [Bk.x0 + 8.2, Bk.x0 + 17.2, Bk.x0 + 26.2]) H.parked.push({ type: 'van', color: 'green', x, z: Bk.z1 + 7.6, h: 0 });

  // ---- the windmill on its rocks (the sails turn: a mesh of their own, see worldmesh.js)
  const Ml = ISLE.mill;
  for (const [dx, dz, r] of [[-4.2, 1.5, 2.2], [3.8, 2.6, 2.6], [1.5, -4.4, 2.4], [-3.4, -3.2, 1.9], [4.6, -1.6, 1.6], [0, 4.8, 1.5]]) rock(Ml.x + dx, Ml.z + dz, r, 0.55, false);
  P({ t: 'cyl', x: Ml.x, z: Ml.z, y0: CURB_H, y1: CURB_H + 0.9, r: 4.0, r1: 3.7, n: 8, c: 0x8a837c, m: M.STONE, cap: true });
  P({ t: 'cyl', x: Ml.x, z: Ml.z, y0: CURB_H + 0.9, y1: CURB_H + 9.8, r: 3.3, r1: 2.3, n: 8, c: COL.falu, m: M.BOARDS });
  P({ t: 'cyl', x: Ml.x, z: Ml.z, y0: CURB_H + 4.6, y1: CURB_H + 4.85, r: 3.55, n: 8, c: 0x3b3027, cap: true }); // the gallery
  P({ t: 'cyl', x: Ml.x, z: Ml.z, y0: CURB_H + 9.8, y1: CURB_H + 12.2, r: 2.75, r1: 0.45, n: 8, c: 0x4a4d52, m: M.TILES, cap: true });
  P({ t: 'hcyl', x: Ml.x, y: Ml.hubY, z: Ml.z + 2.8, len: 2.4, r: 0.32, axis: 'z', n: 8, c: 0x3a3c40 });
  // the door and windows sit on the octagon's faces (cyl puts a corner at angle 0, faces at 22.5° + k·45°)
  const face = (k, y, w, h, c, m = 0) => {
    const af = (22.5 + 45 * k) * Math.PI / 180, ap = (3.3 - ((y - 0.9) / 8.9) * 1.0) * Math.cos(Math.PI / 8) + 0.04;
    P({ t: 'rbox', cx: Ml.x + Math.cos(af) * ap, cy: CURB_H + y, cz: Ml.z + Math.sin(af) * ap, sx: w, sy: h, sz: 0.08, rot: Math.PI / 2 - af, c, m });
  };
  face(1, 2.0, 1.1, 1.9, 0x3b3027, M.BOARDS);
  face(1, 6.6, 0.7, 0.9, 0xeeeae0); face(3, 3.4, 0.7, 0.9, 0xeeeae0); face(7, 7.2, 0.7, 0.9, 0xeeeae0); face(5, 5.2, 0.7, 0.9, 0xeeeae0);
  colCircle(Ml.x, Ml.z, 4.0, 20);
  H.casters.push({ t: 'pole', x: Ml.x, z: Ml.z, h: CURB_H + 12, w: 5.5 });
  H.footprints.push({ x0: Ml.x - 3, z0: Ml.z - 3, x1: Ml.x + 3, z1: Ml.z + 3, c: 0x8e2c20 });
  H.zones.mill = { x: Ml.x, y: Ml.hubY, z: Ml.z + 4.05 };
  H.millSails.push(...millSails());
  bench(Ml.x + 7.5, Ml.z + 6.5, Math.PI * 0.85);

  // ---- the lighthouse on the north-east point, and the keeper's cottage
  const L = ISLE.lighthouse;
  for (const [dx, dz, r] of [[-3.6, 2.4, 2.0], [3.4, 3.0, 2.4], [2.8, -3.4, 2.6], [-3.0, -3.0, 2.2], [0.5, 4.5, 1.6]]) rock(L.x + dx, L.z + dz, r, 0.6, false);
  P({ t: 'cyl', x: L.x, z: L.z, y0: CURB_H, y1: CURB_H + 0.8, r: 3.0, r1: 2.8, n: 12, c: 0x8f8a83, m: M.STONE, cap: true });
  P({ t: 'cyl', x: L.x, z: L.z, y0: CURB_H + 0.8, y1: CURB_H + 13.6, r: 2.3, r1: 1.6, n: 12, c: 0xf2efe8 });
  P({ t: 'cyl', x: L.x, z: L.z, y0: CURB_H + 8.6, y1: CURB_H + 10.4, r: 1.92, r1: 1.82, n: 12, c: 0xc0302a });
  P({ t: 'cyl', x: L.x, z: L.z, y0: CURB_H + 13.6, y1: CURB_H + 13.85, r: 2.35, n: 12, c: 0x2d3238, cap: true });
  P({ t: 'cyl', x: L.x, z: L.z, y0: CURB_H + 14.55, y1: CURB_H + 14.65, r: 2.3, n: 12, c: 0x2d3238 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; P({ t: 'cyl', x: L.x + Math.cos(a) * 2.28, z: L.z + Math.sin(a) * 2.28, y0: CURB_H + 13.85, y1: CURB_H + 14.6, r: 0.035, n: 4, c: 0x2d3238 }); }
  P({ t: 'cyl', x: L.x, z: L.z, y0: CURB_H + 13.85, y1: CURB_H + 15.7, r: 1.25, n: 12, c: 0xd8e4ea, m: M.GLASS });
  P({ t: 'cyl', x: L.x, z: L.z, y0: CURB_H + 14.2, y1: CURB_H + 15.2, r: 0.5, n: 8, c: 0xfff1c9, m: M.LIGHT });
  P({ t: 'cyl', x: L.x, z: L.z, y0: CURB_H + 15.7, y1: CURB_H + 17.0, r: 1.55, r1: 0.12, n: 12, c: 0xc0302a, cap: true });
  P({ t: 'ico', x: L.x, y: CURB_H + 17.15, z: L.z, r: 0.22, sy: 1, c: 0x2d3238 });
  P({ t: 'rbox', cx: L.x - 1.66, cy: CURB_H + 1.95, cz: L.z + 1.66, sx: 1.0, sy: 1.9, sz: 0.1, rot: -Math.PI / 4, c: 0x2f5d3a, m: M.BOARDS });
  colCircle(L.x, L.z, 3.0, 20);
  H.casters.push({ t: 'pole', x: L.x, z: L.z, h: CURB_H + 17, w: 4.2 });
  H.footprints.push({ x0: L.x - 2.4, z0: L.z - 2.4, x1: L.x + 2.4, z1: L.z + 2.4, c: 0xd8d4cc });
  building({ x0: 99, z0: -393, x1: 105, z1: -388.4, h: 2.6, c: 0xeeeae0, m: M.FALU, cell: [2, 2.6], roof: 'gable', roofH: 1.6, roofC: 0x8c3f2d, axis: 'x', mapC: 0xb8b2a6 });
  // the keeper's front door, a step and a mailbox (fyrvaktaren Ingvar lives here, v0.6.1)
  box(101.45, CURB_H, -388.4, 102.55, CURB_H + 2.05, -388.34, 0x2f5d3a, M.BOARDS);
  box(102.3, CURB_H + 0.95, -388.34, 102.38, CURB_H + 1.05, -388.28, 0xc9ccd0, M.CHROME);
  box(101.3, CURB_H, -388.4, 102.7, CURB_H + 0.06, -387.9, 0x8f8a83, M.STONE);
  P({ t: 'cyl', x: 104.2, z: -387.4, y0: CURB_H, y1: CURB_H + 1.0, r: 0.04, n: 4, c: 0x5a4430 });
  box(103.98, CURB_H + 1.0, -387.6, 104.42, CURB_H + 1.28, -387.2, 0x2c62a8);
  bench(L.x - 6, L.z + 5.5, -Math.PI * 0.2);

  // ---- the beach (south-west, v1.1) and the marina (south-east), both facing the town
  beach(H);
  // marina: gravel, a boathouse, a jetty and boats
  poly([[56, -232.5], [95, -236.4], [121, -245.4], [118, -248.2], [95, -245.6], [60, -245.2]], COL.gravel, M.DIRT, PATCH_Y);
  building({ x0: 100, z0: -245.2, x1: 108, z1: -240.4, h: 3.0, c: COL.falu, m: M.FALU, cell: [2.6, 3], roof: 'gable', roofH: 1.6, roofC: 0x3a3c41, axis: 'z', mapC: 0x8e2c20 });
  box(78.8, -0.25, -233.2, 81.2, CURB_H, -215.5, COL.wood, M.PLANKS, { cell: [1, 1] });
  for (let z = -230; z > -216; z -= 4.5) for (const x of [78.9, 81.1]) P({ t: 'cyl', x, z, y0: -2.5, y1: CURB_H + 0.4, r: 0.15, n: 6, c: 0x5a4430 });
  P({ t: 'boat', x: 75.2, z: -222.5, rot: 0.03, c: 0xf2efe6, c2: 0x2f6b45 });
  P({ t: 'boat', x: 85, z: -220.5, rot: -0.05, c: 0xf2efe6, c2: 0xd2342c });
  P({ t: 'boat', x: 90.5, z: -228.5, rot: 0.6, c: 0x2c62a8, c2: 0xf2efe6 });

  // ---- trees: a spruce wood in the north-east, birches by the middle road, pines on the west shore
  for (let z = -342; z > -374; z -= 7) {
    for (let x = 54; x < 108; x += 7.5) {
      const tx = x + R.range(-2.2, 2.2), tz = z + R.range(-2, 2);
      if (Math.hypot(tx - L.x, tz - L.z) < 9 || roadDist(tx, tz) < hw + 2.5 || R.chance(0.18)) continue;
      tree(tx, tz, 'spruce', R.range(0.85, 1.25));
    }
  }
  for (let z = -266; z > -378; z -= 17) {
    if (Math.abs(z - (Y.gateZ0 + Y.gateZ1) / 2) > 8) tree(47.5 + R.range(-0.5, 0.5), z + R.range(-2, 2), 'birch', R.range(0.85, 1.05));
    if (Math.abs(z - (midZ0 + midZ1) / 2) > 9 && (z > A.z1 + 4 || z < A.z0 - 4)) tree(32.5, z + 5 + R.range(-2, 2), 'birch', R.range(0.85, 1.05));
  }
  for (let z = -292; z > -352; z -= 10) tree(-44 + R.range(-1.5, 1.5), z + R.range(-2, 2), 'spruce', R.range(0.9, 1.2));
  for (const [x, z, k] of [[-30, -262, 'birch'], [-22, -266, 'oak'], [22, -255, 'birch'], [-20, -350, 'oak'], [10, -366, 'oak'], [-24, -372, 'spruce'], [118, -300, 'oak'], [120, -320, 'birch'], [62, -262, 'birch'], [96, -262, 'oak'], [24, -372, 'birch'], [58, -380, 'spruce']]) {
    if (roadDist(x, z) > hw + 2) tree(x, z, k, R.range(0.9, 1.15));
  }
  for (const [x, z, k] of [[118, -280, 'oak'], [112, -295, 'birch'], [121, -340, 'spruce'], [-24, -300, 'oak'], [-25, -318, 'birch'], [-22, -336, 'oak'], [2, -270, 'birch'], [18, -268, 'oak'], [60, -386, 'birch'], [-4, -385, 'spruce'], [84, -262, 'birch'], [74, -264, 'oak']]) {
    if (roadDist(x, z) > hw + 2.5 && onIsle(x, z)) tree(x, z, k, R.range(0.85, 1.15));
  }
  // a few rocks to sit on in the grass
  for (const [x, z, r] of [[-28, -320, 1.4], [125, -305, 1.6], [70, -378, 1.2], [-16, -384, 1.8], [122, -262, 1.3]]) if (onIsle(x, z) && roadDist(x, z) > hw + r + 1) rock(x, z, r);
  return { roads: ROADS };
}

// air vents and a hatch on the bakery roof, and the giant cinnamon bun on its stand
function roofThings(H, Bk) {
  const { P, box, R } = H;
  const y = CURB_H + 8;
  for (let i = 0; i < 4; i++) box(Bk.x0 + 4 + i * 4.2, y, Bk.z0 + 3, Bk.x0 + 6 + i * 4.2, y + R.range(0.8, 1.4), Bk.z0 + 5, 0x8e9196);
  const bx = (Bk.x0 + Bk.x1) / 2, bz = (Bk.z0 + Bk.z1) / 2 + 2;
  box(bx - 0.25, y, bz - 0.25, bx + 0.25, y + 1.6, bz + 0.25, 0x3b4148);
  P({ t: 'ico', x: bx, y: y + 2.5, z: bz, r: 3.4, sy: 0.4, c: 0xc0782f });
  P({ t: 'ico', x: bx, y: y + 2.95, z: bz, r: 2.5, sy: 0.3, c: 0x8a4b22 });
  P({ t: 'ico', x: bx, y: y + 3.2, z: bz, r: 1.4, sy: 0.28, c: 0xc0782f });
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, rr = 0.8 + (i % 5) * 0.48;
    box(bx + Math.cos(a) * rr - 0.11, y + 3.12 + (2.5 - rr) * 0.12, bz + Math.sin(a) * rr - 0.11, bx + Math.cos(a) * rr + 0.11, y + 3.32 + (2.5 - rr) * 0.12, bz + Math.sin(a) * rr + 0.11, 0xfbf7ee);
  }
  H.casters.push({ t: 'sphere', x: bx, z: bz, r: 3.2 });
}

// the four lattice sails, around the hub at (0, 0, 0), turning in the x-y plane
function millSails() {
  const out = [];
  const rb = (cx, cy, sx, sy, sz, a, c) => out.push({ cx, cy, cz: 0, sx, sy, sz, rot: Math.PI / 2, tilt: a, c });
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + 0.35, sn = Math.sin(a), cs = Math.cos(a);
    const L0 = 0.6, L1 = 7.6, mid = (L0 + L1) / 2;
    rb(sn * mid, cs * mid, 0.2, L1 - L0, 0.26, a, 0x5a4636);                // the stock
    const off = 0.95, w = 1.5, s0 = 1.6;
    const px = cs * off, py = -sn * off;                                   // to the side of the stock
    for (const e of [-w / 2, w / 2]) rb(sn * (s0 + L1) / 2 + cs * (off + e), cs * (s0 + L1) / 2 - sn * (off + e), 0.08, L1 - s0, 0.08, a, 0xe9e2d2);
    for (let i = 0; i <= 6; i++) {
      const d = s0 + (i / 6) * (L1 - s0);
      rb(sn * d + px, cs * d + py, 0.06, 0.07, w + 0.08, a, 0xe9e2d2);
    }
    const cm = (s0 + 0.4 + L1) / 2;                                        // the sail cloth, a little behind the lattice
    out.push({ cx: sn * cm + px, cy: cs * cm + py, cz: -0.06, sx: 0.025, sy: L1 - s0 - 0.6, sz: w - 0.25, rot: Math.PI / 2, tilt: a, c: 0xd6cfbf });
  }
  return out;
}

// ---------------------------------------------------------------- the beach (v1.1)
// Sand all the way down to the water (and on into it), a boardwalk from the road under an arch,
// a jetty you can walk out on with a diving board at the end, beach huts, a lifeguard tower, an
// ice-cream kiosk, parasols with sun loungers and towels, a volleyball court, a raft and a line of
// buoys round the swimming area. What the props look like: beach.js. No random numbers from the
// layout's own sequence here (everything after this would move).
function beach(H) {
  const { P, poly, sign, colBox, colOBox, colCircle, bench, M } = H;
  const SAND = 0xdcc690, WET = 0xc8b07a, DEEP = 0xa58e5c, Y = PATCH_Y, WY = -0.7;
  const prop = (kind, o) => P({ t: 'beach', kind, ...o });
  // the sand: the area between the shoreline and its inland edge, cut into triangles
  for (const t of triangulate([...BEACH.shore, ...BEACH.inland.slice().reverse()])) poly(t, SAND, M.DIRT, Y);
  // along the water: wet sand, then a slope down under the surface, and a line of foam
  const S = BEACH.shore, out = [];
  for (let i = 0; i < S.length - 1; i++) {
    const a = S[i], b = S[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
    const nx = -uz, nz = ux;                       // out to sea (the sea is on this side of the shore here)
    out.push([nx, nz]);
    const at = (p, d, y) => [p[0] + nx * d, y, p[1] + nz * d];
    P({ t: 'quad', pts: [at(a, -1.3, Y + 0.004), at(b, -1.3, Y + 0.004), at(b, 0, Y + 0.004), at(a, 0, Y + 0.004)], c: WET, m: M.DIRT });
    P({ t: 'quad', pts: [at(a, 0, Y), at(b, 0, Y), at(b, 1.1, Y - 0.47), at(a, 1.1, Y - 0.47)], c: WET, m: M.DIRT });
    P({ t: 'quad', pts: [at(a, 1.1, Y - 0.47), at(b, 1.1, Y - 0.47), at(b, 2.6, -0.95), at(a, 2.6, -0.95)], c: DEEP, m: M.DIRT });
    P({ t: 'quad', pts: [at(a, 1.92, WY + 0.012), at(b, 1.92, WY + 0.012), at(b, 2.22, WY + 0.012), at(a, 2.22, WY + 0.012)], c: 0xeaf2ee, m: M.PLAIN });
    P({ t: 'quad', pts: [at(a, 2.75, WY + 0.01), at(b, 2.75, WY + 0.01), at(b, 2.9, WY + 0.01), at(a, 2.9, WY + 0.01)], c: 0xcfe2e2, m: M.PLAIN });
  }
  { // the bend in the shore: fill the wedge between the two slopes
    const c = S[1], [n0, n1] = out;
    P({ t: 'quad', pts: [[c[0], Y, c[1]], [c[0] + n0[0] * 2.6, -0.95, c[1] + n0[1] * 2.6], [c[0] + n1[0] * 2.6, -0.95, c[1] + n1[1] * 2.6], [c[0] + n1[0] * 2.6, -0.95, c[1] + n1[1] * 2.6]], c: WET, m: M.DIRT });
  }

  // ---- the way in: the arch with the sign, the boardwalk, the jetty (a floor in layout.js), a bike rack, bins
  const W = BEACH.walk, J = BEACH.jetty, xm = (W.x0 + W.x1) / 2;
  prop('boardwalk', { ...W, x: xm, z: (W.z0 + W.z1) / 2 });
  prop('arch', { x0: W.x0 - 0.45, x1: W.x1 + 0.45, z: W.z0 + 0.9, x: xm });
  for (const x of [W.x0 - 0.45, W.x1 + 0.45]) colCircle(x, W.z0 + 0.9, 0.12, 3.1);
  const badplats = { lines: ['NORRHOLMENS BADPLATS'], bg: '#1f5aa6', fg: '#ffffff', border: '#ffffff', font: 0.5 };
  sign('badplats', badplats, xm, Y + 2.13, W.z0 + 0.87, 2.6, 0.5, Math.PI);
  sign('badplats', badplats, xm, Y + 2.13, W.z0 + 0.93, 2.6, 0.5, 0);
  prop('jetty', { ...J, x: (J.x0 + J.x1) / 2, z: (J.z0 + J.z1) / 2 });
  colBox(J.x0 - 0.25, J.z0 + 0.35, J.x0, J.z1 + 0.25, 1.2);           // the railings (you walk out, not off)
  colBox(J.x1, J.z0 + 0.35, J.x1 + 0.25, J.z1 + 0.25, 1.2);
  colBox(J.x0 - 0.25, J.z1, J.x1 + 0.25, J.z1 + 0.25, 1.2);
  colBox(J.x0 - 0.45, J.z0 + 0.65, J.x0 - 0.25, J.z0 + 0.75, 1.6);  // the life-ring post
  H.footprints.push({ x0: J.x0, z0: J.z0, x1: J.x1, z1: J.z1, c: 0x8a6a48 });
  prop('rack', { x: 0.9, z: -250.6, rot: 0, n: 4 }); colOBox(0.9, -250.6, 1.5, 0.35, 0, 0.9);
  for (const [x, z] of [[6.1, -249.9], [-8.2, -251.1]]) { prop('bin', { x, z }); colCircle(x, z, 0.28, 0.95); }

  // ---- beach huts in a row along the west shore, facing the water
  const n1 = [-0.5046, 0.8633], u1 = [0.8633, 0.5046], rotW = Math.atan2(n1[0], n1[1]);
  const huts = [[0x9fd8c4, 0x2f8f83], [0xf2b8c6, 0xc0466a], [0xa8cde8, 0x2c62a8], [0xf4dc8a, 0xc87a1a]];
  huts.forEach(([c, door], i) => {
    const s = 4.4 + i * 2.1, x = -36 + u1[0] * s - n1[0] * 4.4, z = -250 + u1[1] * s - n1[1] * 4.4;
    prop('hut', { x, z, rot: rotW, c, door, roof: 0xe9e5dc });
    colOBox(x, z, 0.95, 0.85, rotW, 2.7);
    H.casters.push({ t: 'box', x0: x - 0.95, x1: x + 0.95, y0: CURB_H, y1: CURB_H + 2.5, z0: z - 0.95, z1: z + 0.95 });
    H.footprints.push({ x0: x - 0.8, x1: x + 0.8, z0: z - 0.8, z1: z + 0.8, c: c });
  });
  prop('pennant', { x: -22.4, z: -250.8, h: 6.5 }); colCircle(-22.4, -250.8, 0.1, 7);

  // ---- the lifeguard tower, between the parasols and the jetty
  const rotS = Math.atan2(-0.1613, 0.9869);                            // facing out across the water
  const T = { x: -3.6, z: -239.6 }, fwd = [Math.sin(rotS), Math.cos(rotS)], rt = [Math.cos(rotS), -Math.sin(rotS)];
  const tl = (lx, lz) => [T.x + rt[0] * lx + fwd[0] * lz, T.z + rt[1] * lx + fwd[1] * lz];
  prop('tower', { ...T, rot: rotS });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const [x, z] = tl(sx * 1.12, sz * 1.12); colCircle(x, z, 0.12, 2.2); }
  { const [x, z] = tl(0, -1.6); colOBox(x, z, 0.35, 0.2, rotS, 1.8); }    // the ladder
  H.casters.push({ t: 'box', x0: T.x - 1.1, x1: T.x + 1.1, y0: CURB_H + 2.0, y1: CURB_H + 3.8, z0: T.z - 1.1, z1: T.z + 1.1 });
  H.footprints.push({ x0: T.x - 1.1, x1: T.x + 1.1, z0: T.z - 1.1, z1: T.z + 1.1, c: 0xd2342c });
  { const [x, z] = tl(0, 1.135); sign('livraddning', { lines: ['LIVRÄDDNING'], bg: '#d2342c', fg: '#ffffff', font: 0.7 }, x, Y + 2.0, z, 1.7, 0.22, rotS); }

  // ---- the ice-cream kiosk with tables in front of it
  const K = { x0: 8.4, x1: 11.9, z0: -248.9, z1: -246.3 };
  prop('kiosk', { ...K, x: (K.x0 + K.x1) / 2, z: (K.z0 + K.z1) / 2 });
  colBox(K.x0, K.z0, K.x1, K.z1, 3.4);
  colBox(K.x0 + 0.35, K.z1, K.x1 - 0.35, K.z1 + 0.34, 1.1);           // the counter
  H.casters.push({ t: 'box', x0: K.x0, x1: K.x1, y0: CURB_H, y1: CURB_H + 3.0, z0: K.z0, z1: K.z1 });
  H.footprints.push({ x0: K.x0, x1: K.x1, z0: K.z0, z1: K.z1, c: 0xe58fa8 });
  sign('glass', { lines: ['GLASS · KAFFE'], bg: '#e58fa8', fg: '#ffffff', border: '#ffffff', font: 0.62 }, (K.x0 + K.x1) / 2, Y + 2.53, K.z1 + 0.02, 3.0, 0.44, 0);
  sign('glassmeny', { lines: ['STRUT 25:-', 'PINNE 15:-', 'KAFFE 20:-'], bg: '#f6ead2', fg: '#7c3c2b', border: '#e58fa8', font: 0.3 }, K.x1 + 0.02, Y + 1.5, (K.z0 + K.z1) / 2, 0.9, 0.85, Math.PI / 2);
  for (const [x, z, rot] of [[9.2, -243.9, 0.1], [12.7, -244.7, -0.2]]) { prop('picnic', { x, z, rot }); colOBox(x, z, 0.85, 0.72, rot, 0.8); }
  parasol(12.7, -244.7, 0xe8833a, 0xf4f1ea, 0, 0, 1.15, 2.35);

  // ---- parasols, sun loungers and towels
  function parasol(x, z, c1, c2, tilt = 0, rot = 0, r = 1.3, h = 2.3, spin = 0) {
    prop('parasol', { x, z, c1, c2, tilt, rot, r, h, spin });
    colCircle(x, z, 0.08, 2.3);
    const A = [Math.sin(tilt) * Math.sin(rot), Math.cos(tilt), Math.sin(tilt) * Math.cos(rot)];
    H.casters.push({ t: 'sphere', x: x + A[0] * (h - 0.22), y: Y + A[1] * (h - 0.22), z: z + A[2] * (h - 0.22), r: r * 0.95, sy: 0.16 });
  }
  const lounger = (x, z, rot, c, flat = false) => { prop('lounger', { x, z, rot, c, flat }); colOBox(x, z, 0.34, 0.98, rot, 0.6); };
  const towel = (x, z, rot, c1, c2, extra = {}) => prop('towel', { x, z, rot, c1, c2, ...extra });
  const u2 = [0.9869, 0.1613], n2 = [-0.1613, 0.9869];
  // by the huts: red and white, two loungers
  { const p = [-19.4, -244.0]; parasol(p[0], p[1], 0xd2342c, 0xf4f1ea, 0.1, rotW);
    lounger(p[0] - u1[0] * 0.8 + n1[0] * 0.25, p[1] - u1[1] * 0.8 + n1[1] * 0.25, rotW, 0x1f5aa6);
    lounger(p[0] + u1[0] * 0.8 + n1[0] * 0.25, p[1] + u1[1] * 0.8 + n1[1] * 0.25, rotW, 0xf4f1ea); }
  // blue and white, towels, a bag, a cool box, a beach ball
  parasol(-13.2, -241.4, 0x2c62a8, 0xf4f1ea, 0.16, -0.35, 1.3, 2.3, 0.3);
  towel(-14.3, -240.9, -0.42, 0xe5b923, 0xf4f1ea, { bag: 0x46a35e, flops: 0x2c62a8 });
  towel(-12.2, -240.5, -0.28, 0x46a35e, 0xf4f1ea, { book: 0xd2342c, bottle: 0x9fd8f0 });
  prop('cooler', { x: -13.9, z: -242.9, rot: 0.3 });
  prop('beachBall', { x: -10.6, z: -238.9 });
  // a sand castle by the water, in front of the tower
  prop('castle', { x: -0.4, z: -236.7, rot: 0.25 });
  // east of the jetty: turquoise and white, two loungers
  { const p = [8.0, -238.8]; parasol(p[0], p[1], 0x2fb3a8, 0xf4f1ea, 0.08, rotS, 1.3, 2.3, 0.15);
    lounger(p[0] - u2[0] * 0.85 + n2[0] * 0.25, p[1] - u2[1] * 0.85 + n2[1] * 0.25, rotS, 0xe8833a, true);
    lounger(p[0] + u2[0] * 0.85 + n2[0] * 0.25, p[1] + u2[1] * 0.85 + n2[1] * 0.25, rotS, 0x2fb3a8); }
  // by the court: yellow and white, two towels
  parasol(12.5, -237.9, 0xf2c21b, 0xf4f1ea, 0.2, rotS + 0.5, 1.25, 2.25, 0.2);
  towel(11.9, -236.6, rotS - 0.15, 0xf08fb8, 0xf4f1ea, { flops: 0xd2342c });
  towel(13.4, -236.8, rotS + 0.1, 0xe8833a, 0xf4f1ea, { bag: 0x2c62a8, bottle: 0x46a35e });

  // ---- the volleyball court, the raft and the buoys
  const V = { x: 19.6, z: -238.8 };
  prop('volley', { ...V, rot: rotS, len: 9, wid: 4.5 });
  for (const s of [-1, 1]) colCircle(V.x + fwd[0] * s * 2.8, V.z + fwd[1] * s * 2.8, 0.08, 2.5);
  prop('beachBall', { x: 22.8, z: -242.4, r: 0.11, cols: [0xf4f1ea, 0xf2c21b, 0x2c62a8] });
  prop('raft', { x: -7.6, z: -224.6, s: 1.3 });
  prop('buoys', { x: BEACH.swim[0][0], z: BEACH.swim[0][1], pts: BEACH.swim });

  // ---- dune grass along the edge of the sand, wild roses, benches
  const tufts = [], I = BEACH.inland;
  let k = 0;
  for (let i = 0; i < I.length - 1; i++) {
    const a = I[i], b = I[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 0.5; s < l; s += 0.95) {
      const h1 = hash(k * 3 + 1), h2 = hash(k * 3 + 2); k++;
      const x = a[0] + (b[0] - a[0]) * (s / l) + (h1 - 0.5) * 0.9, z = a[1] + (b[1] - a[1]) * (s / l) + 0.5 + h2 * 0.9;
      if (Math.abs(x - xm) < 1.6 || (x > K.x0 - 0.6 && x < K.x1 + 0.6 && z < K.z1 + 0.5) || (x < -21 && z > -253)) continue;
      tufts.push([x, z, 0.8 + h1 * 0.5, k * 7 + 3]);
    }
  }
  for (const [x, z] of [[-31.8, -249.9], [-33.2, -249.4], [-22.6, -246.4], [-17.2, -246.9], [-7.6, -238.6], [6.2, -236.4], [15.3, -244.4], [24.8, -235.6], [25.2, -232.2]]) tufts.push([x, z, 1.0, Math.round(x * 13 - z * 7)]);
  prop('grass', { x: tufts[0][0], z: tufts[0][1], pts: tufts });
  for (const [x, z, sd] of [[-14.6, -253.0, 3], [-6.4, -251.5, 5], [17.6, -247.6, 7], [23.4, -244.2, 11], [-27.4, -254.0, 13]]) { prop('rose', { x, z, seed: sd }); colCircle(x, z, 0.5, 0.9); }
  bench(-24, -258.5, Math.PI * 0.92); bench(16, -246, Math.PI * 0.95);

  // ---- people: sunbathers, the lifeguard, a child at the sand castle, volleyball, someone at the
  // kiosk and someone sitting at the end of the jetty. They are only for the eye (render.js draws
  // them when you are near): not in the simulation, so they never touch the game's random numbers.
  // The ones standing about get a collider so you do not walk straight through them. SWIM: dressed for
  // the beach (bare arms, legs and feet; the shirt and the pants are the swimsuit – models.js STYLE).
  const skin = [0xf0c8a8, 0xe8b996, 0xc68e62, 0x9c6b45, 0xf2d0b5];
  const SWIM = 256, LONG = 1, GLASSES = 8, CAP = 16, BEARD = 4;
  const look = (shirt, pants, sk, hair, style = 0, height = 1, bulk = 1, accent = 0x1d1f22) => ({ shirt: shirt ?? skin[sk], pants, skin: skin[sk], hair, style, height, bulk, accent });
  const folk = [];
  const person = (lk, x, z, h, o = {}) => folk.push({ look: lk, x, z, h, y: o.y ?? Y, pose: o.pose ?? 0, lie: o.lie ?? 0, lieDir: o.lieDir ?? 1, headPitch: o.headPitch ?? 0 });
  const stand = (lk, x, z, h, pose = 0) => { person(lk, x, z, h, { pose }); colCircle(x, z, 0.28, 1.6); };
  { const [x, z] = tl(0.35, 0.55); person(look(0xf2c21b, 0xd2342c, 1, 0x5a3a22, CAP | SWIM, 1.02, 1.05, 0xd2342c), x, z, rotS, { y: Y + 2.16 }); }  // the lifeguard
  { const p = [8.0 - u2[0] * 0.85 + n2[0] * 0.25, -238.8 - u2[1] * 0.85 + n2[1] * 0.25];                      // on her front on the lounger
    person(look(0x24365e, 0x24365e, 4, 0x2b1d14, LONG | SWIM, 0.97, 0.95), p[0] + fwd[0] * 0.86, p[1] + fwd[1] * 0.86, rotS + Math.PI, { y: Y + 0.37, lie: 1, lieDir: 1 }); }
  { const r = -0.42; person(look(0xd2342c, 0xd2342c, 4, 0xe8d29a, LONG | GLASSES | SWIM, 0.96, 0.95), -14.3 + Math.sin(r) * 0.8, -240.9 + Math.cos(r) * 0.8, r, { lie: 1, lieDir: -1 }); colOBox(-14.3, -240.9, 0.45, 0.95, r, 0.6); }
  { const r = rotS + 0.1; person(look(null, 0x2fb3a8, 2, 0x1a1a1a, BEARD | SWIM, 1.02, 1.08), 13.4 + Math.sin(r) * 0.8, -236.8 + Math.cos(r) * 0.8, r, { lie: 1, lieDir: -1 }); colOBox(13.4, -236.8, 0.45, 0.95, r, 0.6); }
  { const a = 0.25, cx = -0.4 - Math.cos(a) * 0.8, cz = -236.7 + Math.sin(a) * 0.8; stand(look(null, 0x2c62a8, 4, 0xd9b26b, CAP | SWIM, 0.62, 0.88, 0xd2342c), cx, cz, Math.atan2(-0.4 - cx, -236.7 - cz)); } // a child at the castle
  { const ha = Math.atan2(rt[0], rt[1]), hb = Math.atan2(-rt[0], -rt[1]);                                       // volleyball, one on each side
    stand(look(0xf4f1ea, 0x1d1f22, 3, 0x1a1a1a, SWIM, 1.04, 0.98), V.x - rt[0] * 2.4 + fwd[0] * 0.5, V.z - rt[1] * 2.4 + fwd[1] * 0.5, ha, 1);
    stand(look(0xd2342c, 0x2b2e35, 0, 0xd9b26b, LONG | SWIM, 0.97, 0.95), V.x + rt[0] * 2.7 - fwd[0] * 0.7, V.z + rt[1] * 2.7 - fwd[1] * 0.7, hb); }
  stand(look(0x8e44ad, 0x7f8c8d, 1, 0x8a5a2b, 2, 0.99, 1.02), 10.15, K.z1 + 0.95, Math.PI);                        // at the kiosk (on the way past)
  person(look(null, 0xe5b923, 1, 0x5a3a22, CAP | SWIM, 1.0, 1.0, 0x2c62a8), J.x0 + 0.38, J.z1 - 0.12, 0, { y: Y + 0.02 - 0.92 + 0.03, pose: 5, headPitch: 0.1 }); // on the end of the jetty
  colCircle(J.x0 + 0.38, J.z1 - 0.3, 0.3, 1.0);
  H.zones.beachFolk = { x: -2, z: -242, list: folk };
}

// a little hash from an integer (0..1): props placed "at random" without the layout's random sequence
function hash(i) { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }

// a simple polygon (no holes) cut into triangles, by clipping ears
function triangulate(pts) {
  const n = pts.length, idx = pts.map((_, i) => i), tris = [];
  let area = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const convex = (a, b, c) => (area > 0 ? turn(a, b, c) > 1e-9 : turn(a, b, c) < -1e-9);
  const inside = (p, a, b, c) => { const d1 = turn(a, b, p), d2 = turn(b, c, p), d3 = turn(c, a, p); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  for (let guard = 0; idx.length > 3 && guard < 500; guard++) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
      const a = pts[ia], b = pts[ib], c = pts[ic];
      if (!convex(a, b, c) || idx.some((j) => j !== ia && j !== ib && j !== ic && inside(pts[j], a, b, c))) continue;
      tris.push([a, b, c]); idx.splice(i, 1); cut = true;
      break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) tris.push(idx.map((i) => pts[i]));
  return tris;
}
