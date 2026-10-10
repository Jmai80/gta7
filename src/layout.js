// GTA 7 – the town of Sjuby as pure data.
// Everything here is plain JS (no three.js) so the simulation can run in Node for tests.
// The layout emits render primitives, colliders, shadow casters, the road graph and spawn spots.
import {
  ROAD_W, ROADS, RING, ISLAND, CURB_H, OVERLAY_H, BRIDGES, XWALK_IN, XWALK_OUT,
  blockRange, DELIVERY, CARWASH, GUN, TOWER_DOOR, NOVA_DOOR, PIER, PIER_BENCH, LIVS_DOOR, LEIF, KONDITORI_DOOR, SALON_DOOR, FEST,
} from './config.js';
import { makeRng } from './rng.js';
import { treeCasters } from './trees.js';
import { interiorLayout } from './interior.js';
import { islandInto, onIsle, ISLE, BEACH } from './island.js';

// Material codes understood by the world shader (see shaders.js)
export const M = {
  PLAIN: 0, PAINT: 1, GLASS: 2, LIGHT: 3, TAIL: 4, SIGN: 5, WATER: 6, CHROME: 7, PAINT2: 8,
  RESI: 10, OFFICE: 11, SHOP: 12, FALU: 13, BRICKWIN: 14, GARAGE: 15, CORR: 16,
  TILES: 17, LAWN: 18, PAVING: 19, BRICK: 20, BOARDS: 21, ASPHALT: 22, DIRT: 23,
  LATTICE: 24, STONE: 25, PLANKS: 26, FOLIAGE: 27, BIRCH: 28,
  // inside the tower (interior.js): walls the camera can see through, floors, TV, sofa fabric
  IWALL: 29, PARQUET: 30, FLOORTILE: 31, TV: 32, FABRIC: 33, ITRIM: 34, IGLASS: 35,
};

export const COL = {
  asphalt: 0x3b3e44, mark: 0xe9e7df, paving: 0xaaa69d, curb: 0xc9c5bb, lawn: 0x5e9238,
  park: 0x67a03f, dirt: 0x8d6b48, gravel: 0xb8a98c, sand: 0xd8c38c, stone: 0x7f7a72,
  falu: 0x8e2c20, trim: 0xf1ede2, ochre: 0xe0b552, greyblue: 0x8aa1b3, roofDark: 0x3a3c41,
  roofRed: 0x8c3f2d, plaster1: 0xe8dcc0, plaster2: 0xd9c7a3, plaster3: 0xc9d3c8,
  brick: 0x9a4a33, brick2: 0x7c3c2b, metal: 0x6f808b, concrete: 0xb9b5ac, darkMetal: 0x3b4148,
  wood: 0x8a6440, yellow: 0xe5b923, white: 0xeeeeea, black: 0x1d1f22,
};

export const DIRS = [
  { x: 0, z: -1, name: 'N' }, { x: 1, z: 0, name: 'E' }, { x: 0, z: 1, name: 'S' }, { x: -1, z: 0, name: 'W' },
];
export const rightOf = (d) => (d + 1) & 3;
export const leftOf = (d) => (d + 3) & 3;
export const opposite = (d) => (d + 2) & 3;

export function onRoad(x, z) {
  const hw = ROAD_W / 2;
  for (const r of ROADS) {
    if (Math.abs(x - r) < hw && Math.abs(z) <= RING) return true;
    if (Math.abs(z - r) < hw && Math.abs(x) <= RING) return true;
  }
  for (const b of BRIDGES) {
    if (b.axis === 'z' && Math.abs(x - b.at) < hw && z <= -RING + 0.01 && z >= b.to) return true;
    if (b.axis === 'x' && Math.abs(z - b.at) < hw && x <= -RING + 0.01 && x >= b.to) return true;
  }
  return false;
}

export function onIsland(x, z) {
  return Math.abs(x) <= ISLAND && Math.abs(z) <= ISLAND;
}

export function createLayout(seed = 7) {
  const R = makeRng(seed);
  const prims = [];
  const colliders = [];
  const casters = [];
  const signs = {};
  const ramps = [];
  const parked = [];
  const blocks = [];
  const footprints = [];
  const craneTop = [];
  const loops = [];
  const goals = [];
  const zones = {};
  const kioskSpots = [];
  const millSails = [];   // the windmill's sails on Norrholmen: a mesh of their own that turns

  // ---------- helpers ----------
  const P = (o) => (prims.push(o), o);
  const box = (x0, y0, z0, x1, y1, z1, c, m = 0, extra) =>
    P({ t: 'box', x0: Math.min(x0, x1), y0, z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1, z1: Math.max(z0, z1), c, m, ...extra });
  const colBox = (x0, z0, x1, z1, h = 20, extra) =>
    colliders.push({ t: 'box', x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h, ...extra });
  const colCircle = (x, z, r, h = 20, extra) => colliders.push({ t: 'circle', x, z, r, h, ...extra });
  const colOBox = (cx, cz, hx, hz, rot, h = 20) => colliders.push({ t: 'obox', cx, cz, hx, hz, rot, h });
  const castBox = (x0, y0, z0, x1, y1, z1) => casters.push({ t: 'box', x0, y0, z0, x1, y1, z1 });
  const solid = (x0, y0, z0, x1, y1, z1, c, m = 0, extra) => {
    box(x0, y0, z0, x1, y1, z1, c, m, extra);
    colBox(x0, z0, x1, z1, y1);
    castBox(Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1));
  };
  const area = (x0, z0, x1, z1, c, m = 0, y = OVERLAY_H) =>
    P({ t: 'poly', pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y, c, m });
  const poly = (pts, c, m = 0, y = OVERLAY_H) => P({ t: 'poly', pts, y, c, m });
  const sign = (id, def, x, y, z, w, h, rot) => {
    signs[id] = { w, h, ...def };
    P({ t: 'sign', id, x, y, z, w, h, rot });
  };
  const ngon = (cx, cz, r, n, rot = 0) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
    return pts;
  };

  function building(o) {
    const y0 = o.y0 ?? CURB_H;
    const { x0, z0, x1, z1, h } = o;
    const gable = o.roof === 'gable';
    const roofH = o.roofH ?? 3;
    box(x0, y0, z0, x1, y0 + h, z1, o.c, o.m ?? M.RESI, {
      cell: o.cell ?? [3, 2.9],
      top: { c: o.topC ?? 0x6a6c70, m: M.PLAIN },
      skipTop: gable,
    });
    if (gable) {
      const axis = o.axis ?? (x1 - x0 >= z1 - z0 ? 'x' : 'z');
      P({ t: 'gable', x0, z0, x1, z1, y: y0 + h, h: roofH, axis, c: o.roofC ?? COL.roofDark, m: M.TILES, o: o.overhang ?? 0.45, gc: o.gableC ?? o.c, gm: o.gableM ?? M.PLAIN });
      casters.push({ t: 'gable', x0, z0, x1, z1, y0, y1: y0 + h, h: roofH, axis });
    } else {
      castBox(x0, y0, z0, x1, y0 + h + (o.parapet === false ? 0 : 0.6), z1);
      if (o.parapet !== false) {
        const t = 0.35, ph = 0.6, top = y0 + h, pc = o.parapetC ?? o.c;
        box(x0, top, z0, x1, top + ph, z0 + t, pc);
        box(x0, top, z1 - t, x1, top + ph, z1, pc);
        box(x0, top, z0 + t, x0 + t, top + ph, z1 - t, pc);
        box(x1 - t, top, z0 + t, x1, top + ph, z1 - t, pc);
      }
    }
    colBox(x0, z0, x1, z1, y0 + h + (gable ? roofH : 0));
    footprints.push({ x0, z0, x1, z1, c: o.mapC ?? 0x8d877a });
  }

  function tree(x, z, kind = 'oak', s = 1) {
    s *= R.range(0.85, 1.15);
    const green = [0x4f8a2e, 0x5e9636, 0x467d2a, 0x6a9a3a][R.int(0, 3)];
    const t = P({ t: 'tree', kind, x, z, s, c: green, y: CURB_H }); // shape: trees.js
    for (const c of treeCasters(t)) casters.push(c);
    colCircle(x, z, 0.32 * s, 6);
  }

  function lamp(x, z, ang) {
    const dx = Math.sin(ang), dz = Math.cos(ang);
    const H = 6.6;
    P({ t: 'cyl', x, z, y0: CURB_H, y1: CURB_H + H, r: 0.085, r1: 0.06, n: 6, c: COL.darkMetal });
    P({ t: 'rbox', cx: x + dx * 0.75, cy: CURB_H + H - 0.05, cz: z + dz * 0.75, sx: 0.09, sy: 0.09, sz: 1.5, rot: ang, c: COL.darkMetal });
    P({ t: 'rbox', cx: x + dx * 1.45, cy: CURB_H + H - 0.25, cz: z + dz * 1.45, sx: 0.32, sy: 0.18, sz: 0.62, rot: ang, c: COL.darkMetal });
    P({ t: 'rbox', cx: x + dx * 1.45, cy: CURB_H + H - 0.27, cz: z + dz * 1.45, sx: 0.26, sy: 0.03, sz: 0.5, rot: ang, c: 0xfff1c9, m: M.LIGHT });
    colCircle(x, z, 0.18, 7);
    casters.push({ t: 'pole', x, z, h: CURB_H + H, w: 0.12 });
  }

  function bench(x, z, rot) {
    P({ t: 'rbox', cx: x, cy: CURB_H + 0.42, cz: z, sx: 1.7, sy: 0.08, sz: 0.48, rot, c: COL.wood, m: M.PLANKS });
    const bx = -Math.cos(rot) * 0, bz = 0;
    const back = { x: x - Math.sin(rot) * 0.22 + bx, z: z - Math.cos(rot) * 0.22 + bz };
    P({ t: 'rbox', cx: back.x, cy: CURB_H + 0.55, cz: back.z, sx: 1.7, sy: 0.42, sz: 0.06, rot, c: COL.wood, m: M.PLANKS });
    P({ t: 'rbox', cx: x, cy: CURB_H, cz: z, sx: 1.5, sy: 0.42, sz: 0.36, rot, c: COL.darkMetal });
    colOBox(x, z, 0.85, 0.3, rot, 1);
  }

  function hedge(x0, z0, x1, z1, h = 1.15) {
    solid(x0, CURB_H, z0, x1, CURB_H + h, z1, 0x3f6f2a, M.FOLIAGE);
  }

  function woodFence(x0, z0, x1, z1, h = 1.1, c = COL.trim) {
    // picket fence: rail + posts, solid collider
    const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const t = 0.08;
    if (horiz) {
      box(x0, CURB_H + 0.35, z0 - t, x1, CURB_H + 0.45, z0 + t, c);
      box(x0, CURB_H + h - 0.25, z0 - t, x1, CURB_H + h - 0.15, z0 + t, c);
      for (let x = x0; x <= x1 + 0.01; x += 0.5) box(x - 0.05, CURB_H, z0 - 0.03, x + 0.05, CURB_H + h, z0 + 0.03, c);
      colBox(x0, z0 - 0.12, x1, z0 + 0.12, h);
    } else {
      box(x0 - t, CURB_H + 0.35, z0, x0 + t, CURB_H + 0.45, z1, c);
      box(x0 - t, CURB_H + h - 0.25, z0, x0 + t, CURB_H + h - 0.15, z1, c);
      for (let z = z0; z <= z1 + 0.01; z += 0.5) box(x0 - 0.03, CURB_H, z - 0.05, x0 + 0.03, CURB_H + h, z + 0.05, c);
      colBox(x0 - 0.12, z0, x0 + 0.12, z1, h);
    }
  }

  // see-through mesh fence panels on concrete feet (Swedish "byggstängsel")
  function meshFence(x0, z0, x1, z1, h = 2.0, opts = {}) {
    const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const len = horiz ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    P({ t: 'mesh', x0, z0, x1, z1, y0: CURB_H + 0.12, y1: CURB_H + h });
    const n = Math.max(1, Math.round(len / 3.4));
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
      box(x - 0.035, CURB_H, z - 0.035, x + 0.035, CURB_H + h, z + 0.035, 0x9aa0a6);
      if (opts.feet !== false) {
        if (horiz) box(x - 0.35, CURB_H, z - 0.12, x + 0.35, CURB_H + 0.14, z + 0.12, COL.concrete);
        else box(x - 0.12, CURB_H, z - 0.35, x + 0.12, CURB_H + 0.14, z + 0.35, COL.concrete);
      }
    }
    if (horiz) colBox(x0, z0 - 0.15, x1, z0 + 0.15, h);
    else colBox(x0 - 0.15, z0, x0 + 0.15, z1, h);
  }

  function roofUnits(x0, z0, x1, z1, y, n) {
    for (let i = 0; i < n; i++) {
      const w = R.range(1.2, 2.6), d = R.range(1.2, 2.2);
      const x = R.range(x0 + 1.5, x1 - 1.5 - w), z = R.range(z0 + 1.5, z1 - 1.5 - d);
      box(x, y, z, x + w, y + R.range(0.8, 1.6), z + d, 0x8e9196);
    }
  }

  // =====================================================================
  // ROADS, LAND, CURBS, QUAY
  // =====================================================================
  const XB = [-ISLAND, -RING, -115, -45, -35, 35, 45, 115, RING, ISLAND];
  for (let i = 0; i < XB.length - 1; i++) {
    for (let j = 0; j < XB.length - 1; j++) {
      const xa = XB[i], xb = XB[i + 1], za = XB[j], zb = XB[j + 1];
      const cx = (xa + xb) / 2, cz = (za + zb) / 2;
      const road = onRoad(cx, cz);
      if (road) {
        area(xa, za, xb, zb, COL.asphalt, M.ASPHALT, 0);
      } else {
        area(xa, za, xb, zb, COL.paving, M.PAVING, CURB_H);
        // curb faces toward road, quay walls toward water
        const edges = [
          { nx: 0, nz: -1, x0: xa, z0: za, x1: xb, z1: za, ox: cx, oz: za - 1 },
          { nx: 0, nz: 1, x0: xb, z0: zb, x1: xa, z1: zb, ox: cx, oz: zb + 1 },
          { nx: -1, nz: 0, x0: xa, z0: zb, x1: xa, z1: za, ox: xa - 1, oz: cz },
          { nx: 1, nz: 0, x0: xb, z0: za, x1: xb, z1: zb, ox: xb + 1, oz: cz },
        ];
        for (const e of edges) {
          if (onIsland(e.ox, e.oz) && onRoad(e.ox, e.oz)) {
            P({ t: 'wall', x0: e.x0, z0: e.z0, x1: e.x1, z1: e.z1, y0: 0, y1: CURB_H, c: COL.curb, m: M.PLAIN });
          } else if (!onIsland(e.ox, e.oz)) {
            P({ t: 'wall', x0: e.x0, z0: e.z0, x1: e.x1, z1: e.z1, y0: -2.6, y1: CURB_H, c: COL.stone, m: M.STONE });
          }
        }
      }
    }
  }

  // road markings (each mark: { pts, y })
  const marks = [];
  const mark = (pts, y = 0.03) => marks.push({ pts, y });
  const dashLine = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / len, dz = (bz - az) / len;
    for (let s = 1.5; s + 3 <= len; s += 7) {
      const x0 = ax + dx * s, z0 = az + dz * s, x1 = ax + dx * (s + 3), z1 = az + dz * (s + 3);
      const w = 0.075;
      mark([[x0 - dz * w, z0 + dx * w], [x1 - dz * w, z1 + dx * w], [x1 + dz * w, z1 - dx * w], [x0 + dz * w, z0 - dx * w]]);
    }
  };
  for (const r of ROADS) {
    for (let k = 0; k < ROADS.length - 1; k++) {
      const a = ROADS[k] + 9, b = ROADS[k + 1] - 9;
      dashLine(r, a, r, b);
      dashLine(a, r, b, r);
    }
  }
  for (const b of BRIDGES) {
    if (b.axis === 'z') dashLine(b.at, -RING - 4, b.at, b.to);
    else dashLine(-RING - 4, b.at, b.to, b.at);
  }

  // =====================================================================
  // ROAD GRAPH (intersections)
  // =====================================================================
  const nodes = [];
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      nodes.push({ id: nodes.length, i, j, x: ROADS[i], z: ROADS[j], nbr: [-1, -1, -1, -1], arms: [false, false, false, false] });
    }
  }
  const nodeAt = (i, j) => (i < 0 || j < 0 || i > 3 || j > 3 ? null : nodes[j * 4 + i]);
  for (const n of nodes) {
    const nn = [nodeAt(n.i, n.j - 1), nodeAt(n.i + 1, n.j), nodeAt(n.i, n.j + 1), nodeAt(n.i - 1, n.j)];
    for (let d = 0; d < 4; d++) {
      if (nn[d]) { n.nbr[d] = nn[d].id; n.arms[d] = true; }
    }
  }
  // closed bridges add an arm (for markings) but no graph edge
  for (const b of BRIDGES) {
    const n = b.axis === 'z' ? nodes.find((q) => q.x === b.at && q.z === -120) : nodes.find((q) => q.z === b.at && q.x === -120);
    if (n) n.arms[b.axis === 'z' ? 0 : 3] = true;
  }
  // crosswalks on every arm
  for (const n of nodes) {
    for (let d = 0; d < 4; d++) {
      if (!n.arms[d]) continue;
      const D = DIRS[d], Rt = DIRS[rightOf(d)];
      for (let k = 0; k < 10; k++) {
        const l0 = -4.5 + k * 1.0, l1 = l0 + 0.5;
        const p = (a, l) => [n.x + D.x * a + Rt.x * l, n.z + D.z * a + Rt.z * l];
        mark([p(XWALK_IN, l0), p(XWALK_OUT, l0), p(XWALK_OUT, l1), p(XWALK_IN, l1)]);
      }
    }
  }

  // =====================================================================
  // STREET FURNITURE: lamps along all street segments
  // =====================================================================
  for (const r of ROADS) {
    for (let k = 0; k < ROADS.length - 1; k++) {
      const a = ROADS[k], b = ROADS[k + 1];
      for (let s = a + 22, side = 0; s < b - 14; s += 30, side ^= 1) {
        // vertical road at x=r: lamps on east/west sidewalks
        const off = side ? 5.6 : -5.6;
        lamp(r + off, s, off > 0 ? -Math.PI / 2 : Math.PI / 2);
        const off2 = side ? -5.6 : 5.6;
        lamp(s + 7, r + off2, off2 > 0 ? Math.PI : 0);
      }
    }
  }

  // =====================================================================
  // BLOCKS
  // =====================================================================
  const B = (bx, bz) => {
    const [x0, x1] = blockRange(bx), [z0, z1] = blockRange(bz);
    return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
  };

  // ---------- (0,0) NW: villas ----------
  {
    const b = B(0, 0);
    blocks.push({ ...b, kind: 'villor', c: 0x6f9a48 });
    area(b.x0, b.z0, b.x1, b.z1, COL.lawn, M.LAWN);
    const plots = [
      { x: b.x0, z: b.z0 }, { x: b.cx, z: b.z0 }, { x: b.x0, z: b.cz }, { x: b.cx, z: b.cz },
    ];
    const houseCols = [
      { c: COL.falu, m: M.FALU, roofC: COL.roofDark, map: 0xa04a3a },
      { c: COL.ochre, m: M.FALU, roofC: COL.roofRed, map: 0xc9a14a },
      { c: COL.greyblue, m: M.FALU, roofC: COL.roofDark, map: 0x8aa1b3 },
      { c: COL.falu, m: M.FALU, roofC: COL.roofRed, map: 0xa04a3a },
    ];
    plots.forEach((p, i) => {
      const hc = houseCols[i];
      const north = i < 2, west = i % 2 === 0;
      // house sits toward the street (north plots face Hamngatan, south plots face Storgatan)
      const hz0 = north ? p.z + 6 : p.z + 32 - 6 - 9;
      const hx0 = p.x + (west ? 9 : 12);
      const w = 11, d = 9;
      building({ x0: hx0, z0: hz0, x1: hx0 + w, z1: hz0 + d, h: 5.4, c: hc.c, m: hc.m, cell: [2.6, 2.7], roof: 'gable', roofH: 3.2, roofC: hc.roofC, axis: 'x', gableM: M.BOARDS, mapC: hc.map });
      // white corner trims
      for (const [tx, tz] of [[hx0, hz0], [hx0 + w, hz0], [hx0, hz0 + d], [hx0 + w, hz0 + d]]) {
        box(tx - 0.12, CURB_H, tz - 0.12, tx + 0.12, CURB_H + 5.4, tz + 0.12, COL.trim);
      }
      // stone foundation
      box(hx0 - 0.05, CURB_H, hz0 - 0.05, hx0 + w + 0.05, CURB_H + 0.45, hz0 + d + 0.05, 0x77736b);
      // front door + steps
      const doorZ = north ? hz0 - 0.06 : hz0 + d + 0.06;
      const doorX = hx0 + w / 2;
      box(doorX - 0.55, CURB_H + 0.45, Math.min(doorZ, doorZ + (north ? 0.1 : -0.1)), doorX + 0.55, CURB_H + 2.6, Math.max(doorZ, doorZ + (north ? 0.1 : -0.1)), 0x2c4a6e);
      const stepZ = north ? hz0 - 1.2 : hz0 + d;
      box(doorX - 1, CURB_H, stepZ, doorX + 1, CURB_H + 0.3, stepZ + 1.2, COL.concrete);
      // garden path to street
      const gateZ = north ? b.z0 : b.z1;
      const pz0 = north ? gateZ : hz0 + d + 1.2, pz1 = north ? hz0 - 1.2 : gateZ;
      area(doorX - 0.8, pz0, doorX + 0.8, pz1, COL.gravel, M.PLAIN, OVERLAY_H + 0.02);
      // hedge along the street with a gate gap
      const hzS = north ? b.z0 + 0.1 : b.z1 - 1.0;
      hedge(p.x + 0.5, hzS, doorX - 1.3, hzS + 0.9);
      hedge(doorX + 1.3, hzS, p.x + 31.5, hzS + 0.9);
      // fence between neighbours
      if (west) woodFence(p.x + 32, p.z + 1, p.x + 32, p.z + 31, 1.0);
      // trees + extras
      tree(p.x + (west ? 4.5 : 27.5), p.z + 16, 'oak', 1.0);
      tree(p.x + (west ? 26 : 6), north ? p.z + 26 : p.z + 5, i === 1 ? 'pine' : 'birch', 1.0);
      if (i === 0 || i === 3) {
        // flag pole with a Swedish flag
        const fx = p.x + (west ? 6 : 26), fz = north ? p.z + 4 : p.z + 28;
        P({ t: 'cyl', x: fx, z: fz, y0: CURB_H, y1: CURB_H + 9, r: 0.07, n: 5, c: COL.white });
        sign('flag' + i, { kind: 'flag' }, fx + 0.85, CURB_H + 8.2, fz, 1.6, 1.0, 0);
        sign('flagb' + i, { kind: 'flag', mirror: true }, fx + 0.85, CURB_H + 8.2, fz, 1.6, 1.0, Math.PI);
        colCircle(fx, fz, 0.12, 9);
        casters.push({ t: 'pole', x: fx, z: fz, h: 9, w: 0.1 });
      }
      if (i === 2) {
        // tant Gun's flagpole in the front garden (the flag itself is hoisted in the game) with a gold knob
        P({ t: 'cyl', x: GUN.poleX, z: GUN.poleZ, y0: CURB_H, y1: CURB_H + GUN.poleH, r: 0.07, r1: 0.05, n: 6, c: COL.white });
        P({ t: 'cyl', x: GUN.poleX, z: GUN.poleZ, y0: CURB_H, y1: CURB_H + 0.35, r: 0.16, n: 6, c: 0x9aa0a6 });
        P({ t: 'ico', x: GUN.poleX, y: CURB_H + GUN.poleH + 0.12, z: GUN.poleZ, r: 0.15, sy: 1, c: 0xe5b923 });
        colCircle(GUN.poleX, GUN.poleZ, 0.14, GUN.poleH);
        casters.push({ t: 'pole', x: GUN.poleX, z: GUN.poleZ, h: GUN.poleH, w: 0.1 });
        zones.gunFlag = { x: GUN.poleX, z: GUN.poleZ, top: CURB_H + GUN.poleH - 0.8, bottom: CURB_H + 1.25 };
        // trampoline in the back garden
        const tx = p.x + 21, tz = p.z + 8;
        P({ t: 'cyl', x: tx, z: tz, y0: CURB_H + 0.7, y1: CURB_H + 0.78, r: 2.0, n: 12, c: 0x1f6fb5, cap: true });
        P({ t: 'cyl', x: tx, z: tz, y0: CURB_H + 0.78, y1: CURB_H + 0.8, r: 1.7, n: 12, c: 0x111111, cap: true });
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI / 2 + 0.4;
          P({ t: 'cyl', x: tx + Math.cos(a) * 1.8, z: tz + Math.sin(a) * 1.8, y0: CURB_H, y1: CURB_H + 0.75, r: 0.05, n: 4, c: COL.darkMetal });
        }
        colCircle(tx, tz, 2.0, 0.8);
        casters.push({ t: 'box', x0: tx - 1.8, y0: 0.7, z0: tz - 1.8, x1: tx + 1.8, y1: 0.8, z1: tz + 1.8 });
      }
      // mailbox at the gate
      const mbx = doorX + 1.9, mbz = north ? b.z0 + 0.5 : b.z1 - 0.5;
      box(mbx - 0.05, CURB_H, mbz - 0.05, mbx + 0.05, CURB_H + 1.0, mbz + 0.05, COL.darkMetal);
      box(mbx - 0.25, CURB_H + 1.0, mbz - 0.18, mbx + 0.25, CURB_H + 1.35, mbz + 0.18, [0xd8b030, 0x2c62a8, 0xe9e5dc, 0x2e7a46][i]);
    });
  }

  // ---------- (1,0) N: apartment blocks + courtyard ----------
  {
    const b = B(1, 0);
    blocks.push({ ...b, kind: 'hyreshus', c: 0x9a9480 });
    area(b.x0, b.z0, b.x1, b.z1, COL.lawn, M.LAWN);
    const slabs = [
      { z0: b.z0 + 2, z1: b.z0 + 14, floors: 6, c: COL.plaster1, balcony: 1 },
      { z0: b.z1 - 14, z1: b.z1 - 2, floors: 4, c: COL.plaster2, balcony: -1 },
    ];
    for (const s of slabs) {
      const x0 = b.x0 + 4, x1 = b.x1 - 4;
      const h = s.floors * 2.9;
      building({ x0, z0: s.z0, x1, z1: s.z1, h: h + 0.6, c: s.c, m: M.RESI, cell: [3.5, 2.9], mapC: 0x9c9686 });
      roofUnits(x0, s.z0, x1, s.z1, CURB_H + h + 0.6, 4);
      // balconies on the courtyard side
      const face = s.balcony > 0 ? s.z1 : s.z0;
      const colors = [0x3f7cac, 0xe07a2d, 0xf2efe6, 0x3f7cac];
      const ncell = Math.round((x1 - x0) / 3.5), cw = (x1 - x0) / ncell;
      for (let f = 1; f < s.floors; f++) {
        for (let k = 0; k < ncell; k++) {
          if ((k + f) % 2) continue;
          const bx0 = x0 + k * cw + 0.25, bx1 = bx0 + cw - 0.5;
          const y = CURB_H + f * 2.9 - 0.05;
          const zA = face, zB = face + s.balcony * 1.3;
          box(bx0, y, Math.min(zA, zB), bx1, y + 0.18, Math.max(zA, zB), COL.concrete);
          const fz = zB - s.balcony * 0.05;
          box(bx0, y + 0.18, Math.min(fz, zB), bx1, y + 1.15, Math.max(fz, zB), colors[(k + f * 3) % colors.length]);
        }
      }
      // entrance canopies on the street side
      const sideZ = s.balcony > 0 ? s.z0 : s.z1;
      for (let k = 0; k < 3; k++) {
        const ex = x0 + 10 + k * 17;
        const z0c = s.balcony > 0 ? sideZ - 1.6 : sideZ, z1c = s.balcony > 0 ? sideZ : sideZ + 1.6;
        box(ex - 1.4, CURB_H + 2.6, z0c, ex + 1.4, CURB_H + 2.8, z1c, 0x5d6168);
        box(ex - 0.8, CURB_H, Math.min(sideZ, sideZ - s.balcony * 0.05), ex + 0.8, CURB_H + 2.4, Math.max(sideZ, sideZ - s.balcony * 0.05), 0x5a3a24);
      }
    }
    // courtyard: paths, playground, laundry house, trees
    area(b.x0 + 4, b.cz - 1.5, b.x1 - 4, b.cz + 1.5, COL.gravel, M.PLAIN, OVERLAY_H + 0.02);
    area(b.cx - 1.5, b.z0 + 14, b.cx + 1.5, b.z1 - 14, COL.gravel, M.PLAIN, OVERLAY_H + 0.02);
    // sandbox
    const sbx = b.x0 + 14, sbz = b.cz + 7;
    box(sbx - 3, CURB_H, sbz - 3, sbx + 3, CURB_H + 0.35, sbz - 2.75, COL.wood);
    box(sbx - 3, CURB_H, sbz + 2.75, sbx + 3, CURB_H + 0.35, sbz + 3, COL.wood);
    box(sbx - 3, CURB_H, sbz - 2.75, sbx - 2.75, CURB_H + 0.35, sbz + 2.75, COL.wood);
    box(sbx + 2.75, CURB_H, sbz - 2.75, sbx + 3, CURB_H + 0.35, sbz + 2.75, COL.wood);
    area(sbx - 2.75, sbz - 2.75, sbx + 2.75, sbz + 2.75, COL.sand, M.PLAIN, CURB_H + 0.22);
    colBox(sbx - 3, sbz - 3, sbx + 3, sbz + 3, 0.35);
    // swing set
    const swx = b.x0 + 13, swz = b.cz - 8;
    for (const sx of [-2.4, 2.4]) {
      P({ t: 'rbox', cx: swx + sx, cy: CURB_H, cz: swz - 0.7, sx: 0.12, sy: 2.6, sz: 0.12, rot: 0, c: 0xc8402a, tiltX: 0.25 });
      P({ t: 'rbox', cx: swx + sx, cy: CURB_H, cz: swz + 0.7, sx: 0.12, sy: 2.6, sz: 0.12, rot: 0, c: 0xc8402a, tiltX: -0.25 });
      colCircle(swx + sx, swz, 0.3, 2.5);
    }
    box(swx - 2.6, CURB_H + 2.45, swz - 0.07, swx + 2.6, CURB_H + 2.6, swz + 0.07, 0xc8402a);
    for (const sx of [-1.0, 1.0]) {
      box(swx + sx - 0.02, CURB_H + 0.55, swz - 0.02, swx + sx + 0.02, CURB_H + 2.45, swz + 0.02, 0x333333);
      box(swx + sx - 0.3, CURB_H + 0.5, swz - 0.12, swx + sx + 0.3, CURB_H + 0.58, swz + 0.12, 0x222222);
    }
    // laundry house ("tvättstuga")
    const lx0 = b.x1 - 22, lz0 = b.cz + 3;
    building({ x0: lx0, z0: lz0, x1: lx0 + 12, z1: lz0 + 7, h: 3.2, c: 0xd6c9aa, m: M.BRICKWIN, cell: [3, 3.2], roof: 'gable', roofH: 1.6, roofC: COL.roofDark, axis: 'x', mapC: 0x9c9686 });
    sign('tvatt', { lines: ['TVÄTTSTUGA'], bg: '#f4f1e8', fg: '#1d3557', font: 0.5 }, lx0 + 6, CURB_H + 2.5, lz0 - 0.08, 3.6, 0.55, Math.PI);
    for (const [tx, tz, k] of [[b.x0 + 26, b.cz - 9, 'birch'], [b.x0 + 34, b.cz + 10, 'birch'], [b.x1 - 9, b.cz - 9, 'oak'], [b.x0 + 6, b.cz - 1, 'birch'], [b.x1 - 6, b.cz + 13, 'pine']]) tree(tx, tz, k);
    bench(b.cx + 6, b.cz - 3.5, 0);
    bench(b.cx - 8, b.cz + 3.5, Math.PI);
  }

  // ---------- (2,0) NE: park with pond and a giant Dala horse ----------
  {
    const b = B(2, 0);
    blocks.push({ ...b, kind: 'park', c: 0x5d9e3f });
    area(b.x0, b.z0, b.x1, b.z1, COL.park, M.LAWN);
    // paths
    area(b.cx - 1.6, b.z0, b.cx + 1.6, b.z1, COL.gravel, M.PLAIN, OVERLAY_H + 0.02);
    area(b.x0, b.cz - 1.6, b.x1, b.cz + 1.6, COL.gravel, M.PLAIN, OVERLAY_H + 0.02);
    poly(ngon(b.cx, b.cz, 7.5, 12), COL.gravel, M.PLAIN, OVERLAY_H + 0.03);
    // pedestal + Dala horse
    solid(b.cx - 2.2, CURB_H, b.cz - 3.2, b.cx + 2.2, CURB_H + 1.2, b.cz + 3.2, COL.stone, M.STONE);
    const hy = CURB_H + 1.2, red = 0xc4161c;
    const hz = b.cz;
    box(b.cx - 0.6, hy, hz - 2.4, b.cx + 0.6, hy + 2.0, hz - 0.9, red);        // back legs
    box(b.cx - 0.6, hy, hz + 0.9, b.cx + 0.6, hy + 2.0, hz + 2.4, red);        // front legs
    box(b.cx - 0.6, hy + 1.9, hz - 2.6, b.cx + 0.6, hy + 3.5, hz + 2.4, red);  // body
    P({ t: 'rbox', cx: b.cx, cy: hy + 3.0, cz: hz + 2.3, sx: 1.2, sy: 2.8, sz: 1.3, rot: 0, c: red, tiltX: 0.45 }); // neck
    P({ t: 'rbox', cx: b.cx, cy: hy + 4.9, cz: hz + 3.4, sx: 1.15, sy: 1.0, sz: 2.0, rot: 0, c: red, tiltX: 0.22 }); // head
    box(b.cx - 0.15, hy + 2.6, hz - 3.4, b.cx + 0.15, hy + 3.4, hz - 2.6, red); // tail
    // painted saddle/harness (kurbits colours)
    box(b.cx - 0.64, hy + 2.3, hz - 1.0, b.cx + 0.64, hy + 3.52, hz + 0.6, 0x1f5fa8);
    box(b.cx - 0.66, hy + 2.55, hz - 0.75, b.cx + 0.66, hy + 3.54, hz + 0.35, 0xf2c230);
    box(b.cx - 0.68, hy + 2.85, hz - 0.45, b.cx + 0.68, hy + 3.56, hz + 0.05, 0x2f8a4a);
    casters.push({ t: 'box', x0: b.cx - 0.6, y0: 0, z0: hz - 2.6, x1: b.cx + 0.6, y1: hy + 3.5, z1: hz + 2.4 });
    casters.push({ t: 'box', x0: b.cx - 0.6, y0: hy + 3, z0: hz + 1.8, x1: b.cx + 0.6, y1: hy + 5.6, z1: hz + 4.3 });
    sign('dala', { lines: ['DALAHÄSTEN', 'Sjubys stolthet sedan 1977'], bg: '#3b3a36', fg: '#f2e6c8', font: 0.42 }, b.cx, CURB_H + 0.65, b.cz + 3.22, 3.4, 0.8, 0);
    // pond (NE quadrant)
    const px = b.cx + 16, pz = b.cz - 15;
    poly(ngon(px, pz, 8.6, 14), COL.stone, M.STONE, CURB_H + 0.32);
    poly(ngon(px, pz, 7.9, 14), 0x2f6a66, M.WATER, CURB_H + 0.12);
    for (let k = 0; k < 14; k++) {
      const a0 = (k / 14) * Math.PI * 2, a1 = ((k + 1) / 14) * Math.PI * 2;
      P({ t: 'wall', x0: px + Math.cos(a0) * 8.6, z0: pz + Math.sin(a0) * 8.6, x1: px + Math.cos(a1) * 8.6, z1: pz + Math.sin(a1) * 8.6, y0: CURB_H, y1: CURB_H + 0.32, c: COL.stone, m: M.STONE });
      P({ t: 'wall', x0: px + Math.cos(a1) * 7.9, z0: pz + Math.sin(a1) * 7.9, x1: px + Math.cos(a0) * 7.9, z1: pz + Math.sin(a0) * 7.9, y0: CURB_H + 0.12, y1: CURB_H + 0.32, c: COL.stone, m: M.STONE });
    }
    colCircle(px, pz, 8.6, 0.4);
    zones.pond = { x: px, z: pz, r: 7.9 };
    // trees + benches
    const parkTrees = [
      [b.x0 + 6, b.z0 + 6, 'birch'], [b.x0 + 14, b.z0 + 9, 'oak'], [b.x0 + 8, b.z0 + 20, 'birch'],
      [b.x0 + 22, b.z0 + 24, 'oak'], [b.x0 + 6, b.z1 - 8, 'pine'], [b.x0 + 16, b.z1 - 14, 'birch'],
      [b.x0 + 24, b.z1 - 5, 'oak'], [b.x1 - 6, b.z1 - 7, 'birch'], [b.x1 - 16, b.z1 - 16, 'oak'],
      [b.x1 - 8, b.cz + 8, 'birch'], [b.x1 - 24, b.z1 - 25, 'birch'], [b.x0 + 26, b.z0 + 6, 'birch'],
      [b.x1 - 5, b.z0 + 4, 'pine'],
    ];
    for (const [x, z, k] of parkTrees) tree(x, z, k, 1.1);
    bench(b.cx - 5, b.cz - 3.2, 0);
    bench(b.cx + 5, b.cz + 3.2, Math.PI);
    bench(b.cx - 3.2, b.cz + 10, Math.PI / 2);
    bench(px - 10, pz + 3, Math.PI / 2);
    // ice cream kiosk
    solid(b.cx - 14, CURB_H, b.cz + 4, b.cx - 10, CURB_H + 2.6, b.cz + 7, 0xf2d9e6, M.PLAIN);
    box(b.cx - 14.4, CURB_H + 2.6, b.cz + 3.4, b.cx - 9.6, CURB_H + 2.8, b.cz + 7.4, 0xe0567a);
    sign('glass', { lines: ['GLASS'], bg: '#e0567a', fg: '#fff6e8', font: 0.65 }, b.cx - 12, CURB_H + 2.25, b.cz + 3.98, 2.6, 0.6, Math.PI);
  }

  // ---------- (0,1) W: parking lot, grill kiosk, recycling station ----------
  {
    const b = B(0, 1);
    blocks.push({ ...b, kind: 'parkering', c: 0x6d6f74 });
    area(b.x0, b.z0, b.x1, b.z1, COL.lawn, M.LAWN);
    const ax0 = b.x0 + 26, ax1 = b.x1 - 2;
    area(ax0, b.z0 + 2, ax1, b.z1 - 2, 0x4a4d52, M.ASPHALT, OVERLAY_H + 0.012);
    // stall lines: two rows of stalls facing an aisle running north-south
    const rowA = { x0: ax1 - 5.5, x1: ax1, h: Math.PI / 2 }, rowB = { x0: ax1 - 18.5, x1: ax1 - 13, h: -Math.PI / 2 };
    const stallW = 2.7;
    const stalls = [];
    for (const row of [rowA, rowB]) {
      let z = b.z0 + 6;
      for (; z + stallW <= b.z1 - 6; z += stallW) {
        mark([[row.x0, z - 0.06], [row.x1, z - 0.06], [row.x1, z + 0.06], [row.x0, z + 0.06]], OVERLAY_H + 0.03);
        stalls.push({ x: (row.x0 + row.x1) / 2, z: z + stallW / 2, h: row.h });
      }
      mark([[row.x0, z - 0.06], [row.x1, z - 0.06], [row.x1, z + 0.06], [row.x0, z + 0.06]], OVERLAY_H + 0.03);
    }
    // pick stalls for parked cars (one is the red sedan)
    const pickIdx = [3, 6, 10, 17, 22, 26];
    const plan = [
      { type: 'sedan', color: 'red' }, { type: 'van', color: 'white' }, { type: 'sedan', color: 'silver' },
      { type: 'sedan', color: 'blue' }, { type: 'van', color: 'green' }, { type: 'sedan', color: 'black' },
    ];
    pickIdx.forEach((si, k) => {
      const s = stalls[si % stalls.length];
      parked.push({ x: s.x, z: s.z, h: s.h + (R() - 0.5) * 0.06, ...plan[k] });
    });
    // grill kiosk in the west part
    const kx = b.x0 + 9, kz = b.cz - 6;
    building({ x0: kx - 3.5, z0: kz - 2.5, x1: kx + 3.5, z1: kz + 2.5, h: 3.0, c: 0xf0e2b8, m: M.SHOP, cell: [3.5, 3.0], parapet: false, topC: 0xb03a2e, mapC: 0xb07a50 });
    box(kx + 3.5, CURB_H + 2.5, kz - 2.8, kx + 5.0, CURB_H + 2.65, kz + 2.8, 0xb03a2e);
    sign('grill', { lines: ['GRILLKIOSK', 'KORV · MOS · BURGARE'], bg: '#b03a2e', fg: '#fff3d6', font: 0.5 }, kx + 3.56, CURB_H + 3.55, kz, 4.6, 1.0, Math.PI / 2);
    box(kx + 3.5, CURB_H + 3.0, kz - 2.4, kx + 3.55, CURB_H + 4.1, kz + 2.4, 0xb03a2e);
    kioskSpots.push({ x: kx + 6.5, z: kz });
    bench(kx + 7, kz + 5, Math.PI / 2);
    // recycling station (Swedish "återvinningsstation")
    const rx = b.x0 + 6, rz = b.cz + 14;
    const rc = [0x2f7a46, 0x2c62a8, 0xd8b030, 0xc9c5bb, 0x8e2c20];
    rc.forEach((c, k) => {
      solid(rx + k * 2.6, CURB_H, rz - 1.1, rx + k * 2.6 + 2.2, CURB_H + 1.9, rz + 1.1, c, M.PLAIN);
    });
    sign('atervinn', { lines: ['ÅTERVINNINGSSTATION', 'Sortera rätt, din tjuv'], bg: '#2f7a46', fg: '#ffffff', font: 0.4 }, rx + 6.4, CURB_H + 2.6, rz - 1.12, 5, 0.9, Math.PI);
    P({ t: 'cyl', x: rx + 3.4, z: rz - 1.3, y0: CURB_H, y1: CURB_H + 3.1, r: 0.05, n: 4, c: COL.darkMetal });
    P({ t: 'cyl', x: rx + 9.4, z: rz - 1.3, y0: CURB_H, y1: CURB_H + 3.1, r: 0.05, n: 4, c: COL.darkMetal });
    // trees along the lot
    for (let z = b.z0 + 5; z < b.z1 - 3; z += 11) tree(b.x0 + 21, z, R.chance(0.5) ? 'oak' : 'birch', 0.95);
    tree(b.x0 + 4, b.z0 + 5, 'pine'); tree(b.x0 + 12, b.z1 - 5, 'oak');
    // parking sign
    sign('psign', { kind: 'parking' }, b.x1 - 0.8, CURB_H + 2.4, b.z0 + 4, 0.7, 0.7, Math.PI / 2);
    P({ t: 'cyl', x: b.x1 - 0.9, z: b.z0 + 4, y0: CURB_H, y1: CURB_H + 2.7, r: 0.04, n: 4, c: 0x9aa0a6 });
    zones.parking = { x0: ax0, x1: ax1, z0: b.z0 + 2, z1: b.z1 - 2 };
  }

  // ---------- (1,1) C: downtown – office tower, shops, square, fountain ----------
  {
    const b = B(1, 1);
    blocks.push({ ...b, kind: 'centrum', c: 0x9b9a96 });
    area(b.x0, b.z0, b.x1, b.z1, 0xb4afa5, M.PAVING);
    // office tower (NE)
    building({ x0: b.x1 - 24, z0: b.z0 + 2, x1: b.x1 - 2, z1: b.z0 + 24, h: 40.5, c: 0x4a5563, m: M.OFFICE, cell: [2.2, 3.375], mapC: 0x5c6878, parapetC: 0x3a4250 });
    box(b.x1 - 17, CURB_H + 41.1, b.z0 + 9, b.x1 - 9, CURB_H + 44, b.z0 + 17, 0x7d828a);
    P({ t: 'cyl', x: b.x1 - 13, z: b.z0 + 13, y0: CURB_H + 44, y1: CURB_H + 52, r: 0.12, r1: 0.05, n: 4, c: 0xcccccc });
    P({ t: 'rbox', cx: b.x1 - 13, cy: CURB_H + 51.9, cz: b.z0 + 13, sx: 0.35, sy: 0.35, sz: 0.35, rot: 0, c: 0xff3020, m: M.LIGHT });
    box(b.x1 - 24.4, CURB_H, b.z0 + 1.6, b.x1 - 1.6, CURB_H + 4.2, b.z0 + 24.4, 0x2f3540, M.OFFICE, { cell: [4.4, 4.2] });
    sign('kontor', { lines: ['SJUBY CITY'], bg: '#1f2733', fg: '#e8edf2', font: 0.62 }, b.x1 - 13, CURB_H + 4.9, b.z0 + 24.45, 6, 1.0, 0);
    // the way in (v0.4): glass doors under a canopy on the south side, toward the square
    {
      const dx = TOWER_DOOR.x, dz = b.z0 + 24.4;
      box(dx - 1.4, CURB_H, dz, dx + 1.4, CURB_H + 2.78, dz + 0.06, 0x171a1f);
      box(dx - 1.22, CURB_H, dz + 0.06, dx - 0.03, CURB_H + 2.62, dz + 0.085, 0x9fb7c4, M.GLASS);
      box(dx + 0.03, CURB_H, dz + 0.06, dx + 1.22, CURB_H + 2.62, dz + 0.085, 0x9fb7c4, M.GLASS);
      box(dx - 0.12, CURB_H + 0.95, dz + 0.085, dx - 0.07, CURB_H + 1.35, dz + 0.13, 0xc9ccd0, M.CHROME);
      box(dx + 0.07, CURB_H + 0.95, dz + 0.085, dx + 0.12, CURB_H + 1.35, dz + 0.13, 0xc9ccd0, M.CHROME);
      box(dx - 1.7, CURB_H + 2.95, dz, dx + 1.7, CURB_H + 3.12, dz + 1.4, 0x171a1f);
      sign('bostader', { lines: ['BOSTÄDER · HISS'], bg: '#1d2128', fg: '#f4efe4', font: 0.6 }, dx, CURB_H + 3.42, dz + 0.02, 2.2, 0.32, 0);
      poly([[dx - 1.5, dz], [dx + 1.5, dz], [dx + 1.5, dz + 1.3], [dx - 1.5, dz + 1.3]], 0x3a3f46, M.PAVING, OVERLAY_H + 0.006);
    }
    // shop row along the west side (faces Kungsgatan, where the player starts)
    building({ x0: b.x0 + 1, z0: b.z0 + 1, x1: b.x0 + 15, z1: b.cz + 10, h: 10.2, c: 0xd9b48a, m: M.SHOP, cell: [3.4, 3.4], mapC: 0xa88a6a });
    box(b.x0 - 0.3, CURB_H + 3.2, b.z0 + 3, b.x0 + 1, CURB_H + 3.35, b.z0 + 17, 0x2e7a46);   // awning (pizzeria)
    box(b.x0 - 0.3, CURB_H + 3.2, b.z0 + 21, b.x0 + 1, CURB_H + 3.35, b.cz + 8, 0x2c62a8);  // awning (livs)
    sign('pizza', { lines: ['PIZZERIA SJUAN'], bg: '#2e7a46', fg: '#fff6e0', font: 0.62, stripe: true }, b.x0 + 0.94, CURB_H + 3.9, b.z0 + 10, 7.5, 1.0, -Math.PI / 2);
    sign('livs', { lines: ['HÖRNLIVS'], bg: '#2c62a8', fg: '#ffffff', font: 0.62 }, b.x0 + 0.94, CURB_H + 3.9, b.z0 + 27.5, 5.6, 1.0, -Math.PI / 2);
    // Hörnlivs' door (v0.6.1): a glass door under the blue awning – Yasmin is inside
    {
      const fx = b.x0 + 1, dz = LIVS_DOOR.z;
      box(fx - 0.06, CURB_H, dz - 0.75, fx, CURB_H + 2.5, dz + 0.75, 0x1d2a3a);
      box(fx - 0.085, CURB_H, dz - 0.62, fx - 0.06, CURB_H + 2.36, dz + 0.62, 0x9fb7c4, M.GLASS);
      box(fx - 0.13, CURB_H + 0.95, dz + 0.42, fx - 0.085, CURB_H + 1.35, dz + 0.47, 0xc9ccd0, M.CHROME);
      box(fx - 0.09, CURB_H + 1.6, dz - 0.45, fx - 0.086, CURB_H + 1.9, dz + 0.15, 0xffffff); // ÖPPET card in the glass
      box(fx - 0.093, CURB_H + 1.66, dz - 0.4, fx - 0.09, CURB_H + 1.84, dz + 0.1, 0xd2342c);
      poly([[fx - 1.2, dz - 0.8], [fx, dz - 0.8], [fx, dz + 0.8], [fx - 1.2, dz + 0.8]], 0x3a3f46, M.PAVING, OVERLAY_H + 0.006);
    }
    // south building: brick with shops
    building({ x0: b.x0 + 18, z0: b.z1 - 13, x1: b.x1 - 1, z1: b.z1 - 1, h: 13.6, c: COL.brick, m: M.BRICKWIN, cell: [3.2, 3.4], mapC: 0x8a5a48 });
    sign('bibblan', { lines: ['BIBLIOTEK'], bg: '#f1ede2', fg: '#7c3c2b', font: 0.62 }, b.cx + 10, CURB_H + 3.6, b.z1 - 13.08, 5, 0.9, Math.PI);
    // Sjuby Konditori (v0.8): Arne's old café on the square, opened again by tant Gun
    {
      const fz = b.z1 - 13, dx = KONDITORI_DOOR.x;
      box(dx - 0.75, CURB_H, fz - 0.06, dx + 0.75, CURB_H + 2.5, fz, 0x6b3a2a);
      box(dx - 0.62, CURB_H, fz - 0.085, dx + 0.62, CURB_H + 2.36, fz - 0.06, 0x9fb7c4, M.GLASS);
      box(dx - 0.45, CURB_H + 0.95, fz - 0.13, dx - 0.39, CURB_H + 1.35, fz - 0.085, 0xd8b45a, M.CHROME);
      for (const wx of [dx - 3.4, dx + 3.4]) {                       // shop windows with buns on a shelf
        box(wx - 1.6, CURB_H + 0.7, fz - 0.07, wx + 1.6, CURB_H + 2.3, fz - 0.02, 0xffe6b0, M.LIGHT);
        box(wx - 1.7, CURB_H + 0.62, fz - 0.12, wx + 1.7, CURB_H + 0.7, fz - 0.02, 0xf1eee7);
        for (let k = 0; k < 5; k++) P({ t: 'cyl', x: wx - 1.2 + k * 0.6, z: fz - 0.2, y0: CURB_H + 0.7, y1: CURB_H + 0.86, r: 0.18, r1: 0.12, n: 8, c: 0xc8843c, cap: true });
      }
      box(dx - 5.4, CURB_H + 2.75, fz - 1.3, dx + 5.4, CURB_H + 2.9, fz, 0xe58fa8);            // a pink awning
      box(dx - 5.4, CURB_H + 2.55, fz - 1.32, dx + 5.4, CURB_H + 2.75, fz - 1.26, 0xf4efe4);
      sign('konditori', { lines: ['SJUBY KONDITORI', 'sedan 1958'], bg: '#f6ead2', fg: '#8a3a4a', border: '#e58fa8', font: 0.5 }, dx, CURB_H + 3.5, fz - 0.07, 4.4, 0.95, Math.PI);
      poly([[dx - 1, fz - 1.2], [dx + 1, fz - 1.2], [dx + 1, fz], [dx - 1, fz]], 0x8a5a48, M.PAVING, OVERLAY_H + 0.006);
    }
    // Lås-Leif's key shop on Skolgatan (v0.7): a door, a sign and a big key over the door
    {
      const fz = b.z1 - 1, dx = LEIF.x;
      box(dx - 0.7, CURB_H, fz, dx + 0.7, CURB_H + 2.4, fz + 0.06, 0x2b3a4a);
      box(dx - 0.58, CURB_H, fz + 0.06, dx + 0.58, CURB_H + 2.26, fz + 0.085, 0x9fb7c4, M.GLASS);
      box(dx + 0.36, CURB_H + 0.95, fz + 0.085, dx + 0.42, CURB_H + 1.35, fz + 0.13, 0xc9ccd0, M.CHROME);
      box(dx - 2.6, CURB_H + 2.9, fz, dx + 2.6, CURB_H + 3.05, fz + 1.1, 0x36c2b4);   // a small awning
      sign('leif', { lines: ['LÅS & NYCKEL', 'Leifs nyckelservice'], bg: '#1f2a33', fg: '#f4e2a0', font: 0.5 }, dx, CURB_H + 3.55, fz + 0.07, 3.6, 0.8, 0);
      box(dx + 2.2, CURB_H + 2.2, fz + 0.06, dx + 2.3, CURB_H + 2.3, fz + 0.9, 0x2a2b2f);             // the bracket …
      P({ t: 'cyl', x: dx + 2.25, z: fz + 0.95, y0: CURB_H + 1.55, y1: CURB_H + 2.2, r: 0.05, n: 6, c: 0xd8b45a, m: M.CHROME });  // … and a big brass key
      P({ t: 'cyl', x: dx + 2.25, z: fz + 0.95, y0: CURB_H + 2.0, y1: CURB_H + 2.2, r: 0.16, n: 10, c: 0xd8b45a, m: M.CHROME, cap: true });
      box(dx + 2.2, CURB_H + 1.55, fz + 0.95, dx + 2.4, CURB_H + 1.62, fz + 1.0, 0xd8b45a, M.CHROME);
    }
    // Salong Saxen (v1.0): Vera's hair salon on Skolgatan – a glass door, two lit windows, an orange
    // awning, a sign and a striped barber's pole
    {
      const fz = b.z1 - 1, dx = SALON_DOOR.x;
      box(dx - 0.7, CURB_H, fz, dx + 0.7, CURB_H + 2.4, fz + 0.06, 0x2b2e35);
      box(dx - 0.58, CURB_H, fz + 0.06, dx + 0.58, CURB_H + 2.26, fz + 0.085, 0x9fb7c4, M.GLASS);
      box(dx - 0.42, CURB_H + 0.95, fz + 0.085, dx - 0.36, CURB_H + 1.35, fz + 0.13, 0xc9ccd0, M.CHROME);
      box(dx - 0.3, CURB_H + 1.6, fz + 0.086, dx + 0.3, CURB_H + 1.86, fz + 0.09, 0xffffff); // ÖPPET card
      box(dx - 0.26, CURB_H + 1.64, fz + 0.09, dx + 0.26, CURB_H + 1.82, fz + 0.093, 0xe8833a);
      for (const wx of [dx - 2.7, dx + 2.7]) {
        box(wx - 1.5, CURB_H + 0.7, fz + 0.02, wx + 1.5, CURB_H + 2.3, fz + 0.07, 0xffe2cc, M.LIGHT);
        box(wx - 1.6, CURB_H + 0.62, fz, wx + 1.6, CURB_H + 0.7, fz + 0.12, 0xf1eee7);
      }
      box(dx - 4.4, CURB_H + 2.9, fz, dx + 4.4, CURB_H + 3.05, fz + 1.2, 0xe8833a);          // the awning
      box(dx - 4.4, CURB_H + 2.7, fz + 1.18, dx + 4.4, CURB_H + 2.9, fz + 1.24, 0xf4efe4);
      sign('salong', { lines: ['SALONG SAXEN', 'Frisör · Vera'], bg: '#2b2e35', fg: '#f6d9b8', border: '#e8833a', font: 0.5 }, dx, CURB_H + 3.6, fz + 0.07, 3.8, 0.85, 0);
      // the barber's pole by the door: white with a red and a blue band, a little ball on top
      const px = dx + 1.25, pz = fz + 0.3;
      P({ t: 'cyl', x: px, z: pz, y0: CURB_H + 1.3, y1: CURB_H + 2.3, r: 0.1, n: 10, c: 0xf2efe6, cap: true });
      for (let k = 0; k < 4; k++) P({ t: 'cyl', x: px, z: pz, y0: CURB_H + 1.36 + k * 0.24, y1: CURB_H + 1.44 + k * 0.24, r: 0.104, n: 10, c: k % 2 ? 0x2c62a8 : 0xd2342c });
      P({ t: 'cyl', x: px, z: pz, y0: CURB_H + 2.3, y1: CURB_H + 2.42, r: 0.06, r1: 0.03, n: 8, c: 0xd8b45a, m: M.CHROME, cap: true });
      box(px - 0.03, CURB_H + 1.7, fz, px + 0.03, CURB_H + 1.76, pz, 0x2a2b2f);
      poly([[dx - 1, fz], [dx + 1, fz], [dx + 1, fz + 1.2], [dx - 1, fz + 1.2]], 0x3a3f46, M.PAVING, OVERLAY_H + 0.006);
    }
    // the bun party's long table (v1.0): its collider is only up while the party is (render.js draws it)
    colliders.push({ t: 'box', x0: FEST.table.x0, z0: FEST.table.z0, x1: FEST.table.x1, z1: FEST.table.z1, h: 0, hUp: CURB_H + 0.8, fest: true });
    // square with fountain
    const fx = b.cx - 3, fz = b.cz - 4;
    poly(ngon(fx, fz, 4.6, 16), COL.stone, M.STONE, CURB_H + 0.55);
    poly(ngon(fx, fz, 4.0, 16), 0x3a7a8a, M.WATER, CURB_H + 0.4);
    for (let k = 0; k < 16; k++) {
      const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 1) / 16) * Math.PI * 2;
      P({ t: 'wall', x0: fx + Math.cos(a0) * 4.6, z0: fz + Math.sin(a0) * 4.6, x1: fx + Math.cos(a1) * 4.6, z1: fz + Math.sin(a1) * 4.6, y0: CURB_H, y1: CURB_H + 0.55, c: COL.stone, m: M.STONE });
    }
    P({ t: 'cyl', x: fx, z: fz, y0: CURB_H + 0.4, y1: CURB_H + 2.2, r: 0.45, r1: 0.3, n: 8, c: COL.stone });
    P({ t: 'cyl', x: fx, z: fz, y0: CURB_H + 2.2, y1: CURB_H + 2.45, r: 1.4, n: 10, c: COL.stone, cap: true });
    colCircle(fx, fz, 4.6, 0.6);
    zones.fountain = { x: fx, y: CURB_H + 2.5, z: fz };
    for (const [x, z] of [[fx - 9, fz - 7], [fx + 7, fz - 9], [fx - 8, fz + 9], [fx + 9, fz + 8]]) {
      solid(x - 1.2, CURB_H, z - 1.2, x + 1.2, CURB_H + 0.5, z + 1.2, COL.concrete);
      tree(x, z, 'oak', 0.8);
    }
    bench(fx - 6.2, fz, Math.PI / 2);
    bench(fx + 6.2, fz, -Math.PI / 2);
    // bus stop on Kungsgatan side
    const bsx = b.x0 + 1.5, bsz = b.cz + 18;
    box(bsx - 1.2, CURB_H + 2.4, bsz - 2.2, bsx + 0.2, CURB_H + 2.5, bsz + 2.2, COL.darkMetal);
    box(bsx + 0.1, CURB_H, bsz - 2.2, bsx + 0.18, CURB_H + 2.4, bsz + 2.2, 0x9fb7c4, M.GLASS);
    colBox(bsx - 1.2, bsz - 2.2, bsx + 0.2, bsz + 2.2, 2.5);
    P({ t: 'cyl', x: bsx - 2.0, z: bsz + 3.0, y0: CURB_H, y1: CURB_H + 2.8, r: 0.05, n: 4, c: 0x9aa0a6 });
    sign('buss', { kind: 'bus' }, bsx - 2.0, CURB_H + 2.5, bsz + 3.0, 0.6, 0.6, -Math.PI / 2);
  }

  // ---------- (2,1) E: gas station "Macken" + car wash + flats ----------
  {
    const b = B(2, 1);
    blocks.push({ ...b, kind: 'macken', c: 0x7d7f84 });
    area(b.x0, b.z0, b.x1, b.z1, COL.lawn, M.LAWN);
    area(b.x0 + 1, b.z0 + 1, b.x1 - 1, b.cz + 10, 0x4a4d52, M.ASPHALT, OVERLAY_H + 0.012);
    // canopy
    const cx0 = b.x0 + 6, cx1 = b.x0 + 26, cz0 = b.z0 + 8, cz1 = b.z0 + 24;
    box(cx0, CURB_H + 5.0, cz0, cx1, CURB_H + 5.7, cz1, COL.white);
    box(cx0 - 0.05, CURB_H + 5.15, cz0 - 0.05, cx1 + 0.05, CURB_H + 5.55, cz1 + 0.05, 0xd2342c);
    casters.push({ t: 'box', x0: cx0, y0: CURB_H + 5.0, z0: cz0, x1: cx1, y1: CURB_H + 5.7, z1: cz1 });
    for (const [x, z] of [[cx0 + 2, cz0 + 2], [cx1 - 2, cz0 + 2], [cx0 + 2, cz1 - 2], [cx1 - 2, cz1 - 2]]) {
      solid(x - 0.3, CURB_H, z - 0.3, x + 0.3, CURB_H + 5.0, z + 0.3, COL.white);
    }
    for (const z of [cz0 + 5.5, cz1 - 5.5]) {
      solid(cx0 + 6, CURB_H, z - 0.6, cx1 - 6, CURB_H + 0.25, z + 0.6, COL.concrete);
      for (const x of [cx0 + 8, cx1 - 8]) {
        solid(x - 0.45, CURB_H + 0.25, z - 0.35, x + 0.45, CURB_H + 1.9, z + 0.35, 0xe8e6e0);
        box(x - 0.46, CURB_H + 1.2, z - 0.36, x + 0.46, CURB_H + 1.6, z + 0.36, 0xd2342c);
      }
    }
    sign('macken', { lines: ['MACKEN'], bg: '#d2342c', fg: '#ffffff', font: 0.8 }, (cx0 + cx1) / 2, CURB_H + 5.35, cz0 - 0.07, 6.5, 0.6, Math.PI);
    sign('macken2', { lines: ['MACKEN'], bg: '#d2342c', fg: '#ffffff', font: 0.8 }, cx0 - 0.07, CURB_H + 5.35, (cz0 + cz1) / 2, 6.5, 0.6, -Math.PI / 2);
    // shop
    building({ x0: b.x0 + 30, z0: b.z0 + 2, x1: b.x0 + 46, z1: b.z0 + 13, h: 4.2, c: 0xeeeeea, m: M.SHOP, cell: [3.2, 4.2], mapC: 0xb0b0b0, parapetC: 0xd2342c });
    sign('macken24', { lines: ['ÖPPET 24/7'], bg: '#ffffff', fg: '#d2342c', font: 0.6 }, b.x0 + 38, CURB_H + 3.7, b.z0 + 13.07, 4, 0.7, 0);
    // price pole
    const ppx = b.x0 + 2.2, ppz = b.z0 + 3;
    solid(ppx - 0.2, CURB_H, ppz - 0.2, ppx + 0.2, CURB_H + 5.0, ppz + 0.2, 0xdedede);
    sign('pris', { kind: 'price' }, ppx - 0.22, CURB_H + 5.2, ppz, 2.4, 2.2, -Math.PI / 2);
    sign('pris2', { kind: 'price' }, ppx + 0.22, CURB_H + 5.2, ppz, 2.4, 2.2, Math.PI / 2);
    box(ppx - 0.2, CURB_H + 4.05, ppz - 1.25, ppx + 0.2, CURB_H + 6.35, ppz + 1.25, 0xdedede);
    // drive-through car wash (repairs dents for a fee)
    const wx0 = CARWASH.x0 - 4, wx1 = CARWASH.x1 + 2, wz0 = CARWASH.z0, wz1 = CARWASH.z1;
    solid(wx0, CURB_H, wz0 - 0.5, wx1, CURB_H + 4.6, wz0, 0x2c62a8, M.PLAIN);
    solid(wx0, CURB_H, wz1, wx1, CURB_H + 4.6, wz1 + 0.5, 0x2c62a8, M.PLAIN);
    box(wx0, CURB_H + 4.6, wz0 - 0.5, wx1, CURB_H + 5.2, wz1 + 0.5, 0xeeeeea);
    casters.push({ t: 'box', x0: wx0, y0: CURB_H + 4.6, z0: wz0, x1: wx1, y1: CURB_H + 5.2, z1: wz1 });
    box(wx0 - 0.1, CURB_H + 3.2, wz0, wx0 + 0.2, CURB_H + 4.6, wz1, 0xeeeeea);
    sign('tvatt2', { lines: ['BILTVÄTT', 'Bucklor bort: 200 kr'], bg: '#ffffff', fg: '#2c62a8', font: 0.42 }, wx0 - 0.12, CURB_H + 3.9, (wz0 + wz1) / 2, 4.6, 1.1, -Math.PI / 2);
    zones.carwash = { ...CARWASH, brushes: [{ x: (CARWASH.x0 + CARWASH.x1) / 2 - 2, z: wz0 + 1.3 }, { x: (CARWASH.x0 + CARWASH.x1) / 2 - 2, z: wz1 - 1.3 }, { x: (CARWASH.x0 + CARWASH.x1) / 2 + 2, z: wz0 + 1.3 }, { x: (CARWASH.x0 + CARWASH.x1) / 2 + 2, z: wz1 - 1.3 }] };
    // flats in the south part
    building({ x0: b.x0 + 3, z0: b.z1 - 16, x1: b.x1 - 3, z1: b.z1 - 3, h: 12.2, c: COL.plaster3, m: M.RESI, cell: [3.2, 2.9], mapC: 0x9c9686 });
    // (v1.4) a street door to the flats, where Nova lives (the side quest "Konsertbiljetten")
    {
      const dz = b.z1 - 3;
      box(NOVA_DOOR.x - 0.65, CURB_H, dz, NOVA_DOOR.x + 0.65, CURB_H + 2.3, dz + 0.08, 0xf1ede2);
      box(NOVA_DOOR.x - 0.55, CURB_H, dz + 0.08, NOVA_DOOR.x + 0.55, CURB_H + 2.2, dz + 0.12, 0x3a5f8a);
      box(NOVA_DOOR.x + 0.32, CURB_H + 1.0, dz + 0.12, NOVA_DOOR.x + 0.42, CURB_H + 1.06, dz + 0.17, 0xc9ccd0);
      box(NOVA_DOOR.x - 1.0, CURB_H + 2.4, dz, NOVA_DOOR.x + 1.0, CURB_H + 2.5, dz + 0.9, 0x3a3c41);
      box(NOVA_DOOR.x - 1.0, CURB_H, dz, NOVA_DOOR.x + 1.0, CURB_H + 0.12, dz + 0.9, COL.concrete);
    }
    roofUnits(b.x0 + 3, b.z1 - 16, b.x1 - 3, b.z1 - 3, CURB_H + 12.2, 3);
    for (const x of [b.x0 + 8, b.x0 + 26, b.x1 - 8]) tree(x, b.cz + 13, 'birch', 0.9);
  }

  // ---------- (0,2) SW: construction site with crane and a stunt ramp ----------
  {
    const b = B(0, 2);
    blocks.push({ ...b, kind: 'byggtomt', c: 0x8d6b48 });
    area(b.x0, b.z0, b.x1, b.z1, COL.dirt, M.DIRT);
    // fence with a gate on the north side (Skolgatan) lined up with the jump
    const gx0 = b.cx + 3, gx1 = b.cx + 17;
    meshFence(b.x0 + 1, b.z0 + 1, gx0, b.z0 + 1);
    meshFence(gx1, b.z0 + 1, b.x1 - 1, b.z0 + 1);
    meshFence(b.x0 + 1, b.z1 - 1, b.x1 - 1, b.z1 - 1);
    meshFence(b.x0 + 1, b.z0 + 1, b.x0 + 1, b.z1 - 1);
    meshFence(b.x1 - 1, b.z0 + 1, b.x1 - 1, b.z1 - 1);
    sign('bygg', { kind: 'warning', lines: ['BYGGARBETSPLATS', 'OBEHÖRIGA ÄGA EJ TILLTRÄDE'] }, gx0 - 3.5, CURB_H + 1.35, b.z0 + 0.88, 3.6, 1.2, Math.PI);
    sign('tomt', { lines: ['TOMT TILL SALU', 'Ring Lasse. Inga frågor.'], bg: '#ffffff', fg: '#1d1f22', font: 0.38, border: '#d2342c' }, gx1 + 4, CURB_H + 1.35, b.z0 + 0.88, 3.4, 1.1, Math.PI);
    // half-built building (concrete frame) in the south-west
    const hx0 = b.x0 + 4, hx1 = b.x0 + 28, hz0 = b.z1 - 26, hz1 = b.z1 - 5;
    for (const y of [3.3, 6.6]) box(hx0, CURB_H + y - 0.3, hz0, hx1, CURB_H + y, hz1, COL.concrete, M.PLAIN);
    casters.push({ t: 'box', x0: hx0, y0: CURB_H + 3.0, z0: hz0, x1: hx1, y1: CURB_H + 6.6, z1: hz1 });
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k < 3; k++) {
        const x = hx0 + 0.5 + i * (hx1 - hx0 - 1) / 3, z = hz0 + 0.5 + k * (hz1 - hz0 - 1) / 2;
        solid(x - 0.25, CURB_H, z - 0.25, x + 0.25, CURB_H + 9.6, z + 0.25, 0xa8a49b);
      }
    }
    solid(hx1 - 5, CURB_H, hz0 + 0.5, hx1 - 0.5, CURB_H + 9.6, hz0 + 5, 0xa8a49b, M.PLAIN);
    footprints.push({ x0: hx0, z0: hz0, x1: hx1, z1: hz1, c: 0x9a958a });
    // site office: two stacked containers (south-east corner)
    solid(b.x1 - 14, CURB_H, b.z1 - 9, b.x1 - 4, CURB_H + 2.6, b.z1 - 6, 0x2c62a8, M.CORR, { cell: [1, 1] });
    solid(b.x1 - 14, CURB_H + 2.6, b.z1 - 9, b.x1 - 4, CURB_H + 5.2, b.z1 - 6, 0xd8b030, M.CORR, { cell: [1, 1] });
    box(b.x1 - 11, CURB_H + 0.9, b.z1 - 9.06, b.x1 - 8, CURB_H + 2.0, b.z1 - 9.0, 0x9fb7c4, M.GLASS);
    box(b.x1 - 11, CURB_H + 3.5, b.z1 - 9.06, b.x1 - 8, CURB_H + 4.6, b.z1 - 9.0, 0x9fb7c4, M.GLASS);
    sign('dahlgren', { lines: ['DAHLGREN AB', 'BULLFABRIKEN · byggstart'], bg: '#2b2e35', fg: '#e5b923', font: 0.42, border: '#e5b923' }, b.x1 - 6, CURB_H + 1.5, b.z1 - 9.08, 2.8, 0.8, Math.PI); // (v0.9)
    // brick pallets (north-west corner) and a dumpster (north-east corner)
    for (let k = 0; k < 3; k++) solid(b.x0 + 4 + k * 3, CURB_H, b.z0 + 4, b.x0 + 6.2 + k * 3, CURB_H + 1.2, b.z0 + 6.2, 0xa04a32, M.BRICK);
    solid(b.x1 - 8, CURB_H, b.z0 + 6, b.x1 - 4, CURB_H + 1.6, b.z0 + 12, 0xe0782c, M.CORR, { cell: [1, 1] });
    // stunt jump (runs north→south): drive through the parking lot, across Skolgatan,
    // through the gate and up the kicker, over the pipes and onto the landing ramp.
    const rx0 = b.cx + 6, rx1 = b.cx + 14;
    const kick = { axis: 'z', x0: rx0, x1: rx1, z0: b.z0 + 9, z1: b.z0 + 18, h0: CURB_H, h1: CURB_H + 2.3 };
    const land = { axis: 'z', x0: rx0 - 1, x1: rx1 + 1, z0: b.z0 + 35, z1: b.z0 + 47, h0: CURB_H + 1.8, h1: CURB_H };
    ramps.push(kick, land);
    P({ t: 'ramp', ...kick, c: 0x9a7448, m: M.PLANKS });
    P({ t: 'ramp', ...land, c: 0x9a7448, m: M.PLANKS });
    casters.push({ t: 'box', x0: kick.x0, y0: 0, z0: kick.z1 - 1, x1: kick.x1, y1: kick.h1, z1: kick.z1 });
    casters.push({ t: 'box', x0: land.x0, y0: 0, z0: land.z0, x1: land.x1, y1: land.h0, z1: land.z0 + 1 });
    colBox(kick.x0 - 0.3, kick.z0, kick.x0, kick.z1, kick.h1, { ramp: true });
    colBox(kick.x1, kick.z0, kick.x1 + 0.3, kick.z1, kick.h1, { ramp: true });
    colBox(kick.x0, kick.z1, kick.x1, kick.z1 + 0.3, kick.h1, { ramp: kick, lip: true });
    colBox(land.x0 - 0.3, land.z0, land.x0, land.z1, land.h0, { ramp: true });
    colBox(land.x1, land.z0, land.x1 + 0.3, land.z1, land.h0, { ramp: true });
    colBox(land.x0, land.z0 - 0.3, land.x1, land.z0, land.h0, { ramp: land, lip: true });
    // pipes lying across the gap
    for (let k = 0; k < 4; k++) P({ t: 'hcyl', x: (rx0 + rx1) / 2, y: CURB_H + 0.42, z: b.z0 + 25 + k * 0.85, len: 8, r: 0.4, axis: 'x', n: 8, c: 0x8a8f96 });
    colBox(rx0, b.z0 + 24.5, rx1, b.z0 + 25 + 3 * 0.85 + 0.45, 0.8);
    castBox(rx0, 0, b.z0 + 24.5, rx1, 0.8, b.z0 + 28);
    sign('stunt', { kind: 'warning', lines: ['HOPPA PÅ EGEN RISK', 'Lasse ansvarar ej'] }, rx0 - 2.2, CURB_H + 1.45, kick.z0 + 1, 2.8, 1.0, Math.PI - 0.3);
    P({ t: 'cyl', x: rx0 - 2.2, z: kick.z0 + 1, y0: CURB_H, y1: CURB_H + 1.0, r: 0.05, n: 4, c: COL.darkMetal });
    zones.stunt = { x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, kick };
    // tower crane (mast static, top part rotates – see craneTop)
    const mx = b.x1 - 9, mz = b.cz + 4;
    solid(mx - 3, CURB_H, mz - 3, mx + 3, CURB_H + 1.2, mz + 3, COL.concrete);
    box(mx - 1, CURB_H + 1.2, mz - 1, mx + 1, CURB_H + 34, mz + 1, COL.yellow, M.LATTICE, { cell: [2, 2] });
    colBox(mx - 1.1, mz - 1.1, mx + 1.1, mz + 1.1, 34);
    casters.push({ t: 'box', x0: mx - 1, y0: 0, z0: mz - 1, x1: mx + 1, y1: 34, z1: mz + 1 });
    const T = CURB_H + 34;
    craneTop.push({ t: 'box', x0: -1.2, y0: T, z0: -1.2, x1: 1.2, y1: T + 2.2, z1: 1.2, c: COL.yellow });
    craneTop.push({ t: 'box', x0: -0.8, y0: T + 2.2, z0: -0.8, x1: 0.8, y1: T + 3.4, z1: 0.8, c: 0xe8e8e8, m: M.GLASS });
    craneTop.push({ t: 'box', x0: -0.7, y0: T + 2.0, z0: 1.2, x1: 0.7, y1: T + 3.3, z1: 34, c: COL.yellow, m: M.LATTICE, cell: [1.4, 1.3] });
    craneTop.push({ t: 'box', x0: -0.7, y0: T + 2.0, z0: -11, x1: 0.7, y1: T + 3.0, z1: -1.2, c: COL.yellow, m: M.LATTICE, cell: [1.4, 1.0] });
    craneTop.push({ t: 'box', x0: -1.3, y0: T + 0.4, z0: -11, x1: 1.3, y1: T + 2.0, z1: -7.5, c: COL.concrete });
    craneTop.push({ t: 'box', x0: -0.4, y0: T + 3.4, z0: -0.4, x1: 0.4, y1: T + 7.5, z1: 0.4, c: COL.yellow, m: M.LATTICE, cell: [0.8, 1.0] });
    craneTop.push({ t: 'box', x0: -0.03, y0: T - 18, z0: 22.97, x1: 0.03, y1: T + 2.0, z1: 23.03, c: 0x333333 });
    craneTop.push({ t: 'box', x0: -0.45, y0: T - 19, z0: 22.6, x1: 0.45, y1: T - 18, z1: 23.4, c: 0xd8b030 });
    craneTop.push({ t: 'box', x0: -1.0, y0: T - 21.4, z0: 22.0, x1: 1.0, y1: T - 20.2, z1: 24.0, c: 0xa04a32, m: M.BRICK });
    craneTop.push({ t: 'box', x0: -0.02, y0: T - 20.2, z0: 22.4, x1: 0.02, y1: T - 19, z1: 22.44, c: 0x333333 });
    craneTop.push({ t: 'box', x0: -0.02, y0: T - 20.2, z0: 23.56, x1: 0.02, y1: T - 19, z1: 23.6, c: 0x333333 });
    // the lifted load hangs ~14 m up – it clears every roof in the area, so no collider
    zones.crane = { x: mx, z: mz };
  }

  // ---------- (1,2) S: row houses + football pitch ----------
  {
    const b = B(1, 2);
    blocks.push({ ...b, kind: 'radhus', c: 0x7aa04a });
    area(b.x0, b.z0, b.x1, b.z1, COL.lawn, M.LAWN);
    const cols = [0xf1e3a6, 0xbfe0c8, 0xb9cfe6, 0xf0b9a6, 0xf2efe6, 0xe6d0f0];
    const rx0 = b.x0 + 3, rz0 = b.z0 + 6, unitW = 9.6;
    for (let k = 0; k < 6; k++) {
      const x0 = rx0 + k * unitW;
      box(x0, CURB_H, rz0, x0 + unitW, CURB_H + 5.8, rz0 + 9, cols[k], M.RESI, { cell: [2.4, 2.9], skipTop: true });
      // front door
      box(x0 + 1.2, CURB_H, rz0 - 0.06, x0 + 2.2, CURB_H + 2.2, rz0, [0x2c4a6e, 0x8e2c20, 0x2e7a46][k % 3]);
      // small front garden fence + bin shed
      woodFence(x0 + 3, b.z0 + 0.6, x0 + unitW - 0.4, b.z0 + 0.6, 0.8);
      box(x0 + 0.3, CURB_H, rz0 - 2.6, x0 + 0.5, CURB_H + 1.4, rz0, COL.trim);
    }
    P({ t: 'gable', x0: rx0, z0: rz0, x1: rx0 + unitW * 6, z1: rz0 + 9, y: CURB_H + 5.8, h: 2.6, axis: 'x', c: COL.roofDark, m: M.TILES, o: 0.45, gc: COL.trim, gm: M.BOARDS });
    casters.push({ t: 'gable', x0: rx0, z0: rz0, x1: rx0 + unitW * 6, z1: rz0 + 9, y0: CURB_H, y1: CURB_H + 5.8, h: 2.6, axis: 'x' });
    colBox(rx0, rz0, rx0 + unitW * 6, rz0 + 9, 9);
    footprints.push({ x0: rx0, z0: rz0, x1: rx0 + unitW * 6, z1: rz0 + 9, c: 0xb39a7a });
    // backyards hedge
    hedge(rx0, rz0 + 13, rx0 + unitW * 6, rz0 + 13.8, 1.3);
    // football pitch (7-a-side)
    const fx0 = b.x0 + 6, fx1 = b.x1 - 6, fz0 = b.z0 + 26, fz1 = b.z1 - 4;
    area(fx0 - 1, fz0 - 1, fx1 + 1, fz1 + 1, 0x4f9a3a, M.LAWN, OVERLAY_H + 0.01);
    const LY = OVERLAY_H + 0.035;
    const line = (x0, z0, x1, z1) => mark([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], LY);
    const lw = 0.1;
    line(fx0, fz0, fx1, fz0 + lw); line(fx0, fz1 - lw, fx1, fz1); line(fx0, fz0, fx0 + lw, fz1); line(fx1 - lw, fz0, fx1, fz1);
    line((fx0 + fx1) / 2 - lw / 2, fz0, (fx0 + fx1) / 2 + lw / 2, fz1);
    const mzc = (fz0 + fz1) / 2;
    for (let k = 0; k < 24; k++) {
      const a0 = (k / 24) * Math.PI * 2, a1 = ((k + 1) / 24) * Math.PI * 2;
      const r0 = 4.6, r1 = 4.7, cxp = (fx0 + fx1) / 2;
      mark([[cxp + Math.cos(a0) * r0, mzc + Math.sin(a0) * r0], [cxp + Math.cos(a1) * r0, mzc + Math.sin(a1) * r0], [cxp + Math.cos(a1) * r1, mzc + Math.sin(a1) * r1], [cxp + Math.cos(a0) * r1, mzc + Math.sin(a0) * r1]], LY);
    }
    line(fx0, mzc - 6, fx0 + 6, mzc - 6 + lw); line(fx0, mzc + 6 - lw, fx0 + 6, mzc + 6); line(fx0 + 6 - lw, mzc - 6, fx0 + 6, mzc + 6);
    line(fx1 - 6, mzc - 6, fx1, mzc - 6 + lw); line(fx1 - 6, mzc + 6 - lw, fx1, mzc + 6); line(fx1 - 6, mzc - 6, fx1 - 6 + lw, mzc + 6);
    // goals
    for (const [gx, dir] of [[fx0, -1], [fx1, 1]]) {
      const gz0 = mzc - 2.5, gz1 = mzc + 2.5, depth = 1.2;
      for (const gz of [gz0, gz1]) {
        box(gx - 0.06, CURB_H, gz - 0.06, gx + 0.06, CURB_H + 2.0, gz + 0.06, COL.white);
        box(gx + dir * depth - 0.04, CURB_H, gz - 0.04, gx + dir * depth + 0.04, CURB_H + 1.2, gz + 0.04, COL.white);
        colCircle(gx, gz, 0.12, 2);
      }
      box(gx - 0.06, CURB_H + 1.94, gz0, gx + 0.06, CURB_H + 2.06, gz1, COL.white);
      P({ t: 'mesh', x0: gx + dir * depth, z0: gz0, x1: gx + dir * depth, z1: gz1, y0: CURB_H, y1: CURB_H + 1.2 });
      P({ t: 'mesh', x0: gx, z0: gz0, x1: gx + dir * depth, z1: gz0, y0: CURB_H, y1: CURB_H + 1.6 });
      P({ t: 'mesh', x0: gx, z0: gz1, x1: gx + dir * depth, z1: gz1, y0: CURB_H, y1: CURB_H + 1.6 });
      colBox(Math.min(gx, gx + dir * depth), gz0 - 0.1, Math.max(gx, gx + dir * depth), gz0 + 0.1, 1.6);
      colBox(Math.min(gx, gx + dir * depth), gz1 - 0.1, Math.max(gx, gx + dir * depth), gz1 + 0.1, 1.6);
      colBox(gx + dir * depth - 0.1, gz0, gx + dir * depth + 0.1, gz1, 1.2);
      goals.push({ x: gx, z0: gz0, z1: gz1, dir, depth });
    }
    zones.pitch = { x0: fx0, x1: fx1, z0: fz0, z1: fz1, cx: (fx0 + fx1) / 2, cz: mzc };
    for (const x of [b.x0 + 2.5, b.x1 - 2.5]) for (const z of [b.z0 + 24, b.z1 - 2]) tree(x, z, 'birch', 0.9);
  }

  // ---------- (2,2) SE: Lasses Verkstad (garage), scrap yard and warehouse ----------
  {
    const b = B(2, 2);
    blocks.push({ ...b, kind: 'industri', c: 0x77797e });
    area(b.x0, b.z0, b.x1, b.z1, COL.gravel, M.DIRT);
    area(b.x0 + 1, b.z0 + 1, b.cx + 1, b.cz + 8, 0x4a4d52, M.ASPHALT, OVERLAY_H + 0.012);
    // workshop
    const wx0 = b.cx, wx1 = b.x1 - 3, wz0 = b.z0 + 3, wz1 = b.z0 + 26;
    building({ x0: wx0, z0: wz0, x1: wx1, z1: wz1, h: 7, c: 0x5f7a8c, m: M.CORR, cell: [1, 1], roof: 'gable', roofH: 1.8, roofC: 0x6d7378, axis: 'z', gableM: M.CORR, mapC: 0x6d7f8c });
    // two big garage doors facing the yard (west)
    for (const dz of [wz0 + 4.5, wz0 + 13.5]) {
      box(wx0 - 0.08, CURB_H, dz, wx0, CURB_H + 4.6, dz + 5.2, 0xe9e2cf, M.GARAGE, { cell: [5.2, 4.6] });
      box(wx0 - 0.25, CURB_H + 4.6, dz - 0.2, wx0, CURB_H + 4.85, dz + 5.4, 0x30353b);
    }
    sign('lasse', { kind: 'lasse' }, wx0 - 0.1, CURB_H + 6.1, (wz0 + wz1) / 2, 11, 1.8, -Math.PI / 2);
    sign('lasse2', { lines: ['BILAR · BÅTAR · INGA FRÅGOR'], bg: '#1d1f22', fg: '#e5b923', font: 0.5 }, wx0 - 0.1, CURB_H + 2.0, wz0 + 12.0, 3.6, 0.6, -Math.PI / 2);
    sign('trimning', { lines: ['TRIMNING · TURBO', 'Betala kontant'], bg: '#d2342c', fg: '#ffffff', font: 0.46 }, wx0 - 0.3, CURB_H + 4.1, wz0 + 7.1, 3.4, 0.7, -Math.PI / 2); // (v0.8)
    // yard fence (mesh) with gate toward Drottninggatan (west)
    const gz0 = DELIVERY.z - 6, gz1 = DELIVERY.z + 6;
    meshFence(b.x0 + 1, b.z0 + 1, b.x0 + 1, gz0, 2.0, { feet: false });
    meshFence(b.x0 + 1, gz1, b.x0 + 1, b.cz + 10, 2.0, { feet: false });
    meshFence(b.x0 + 1, b.z0 + 1, wx0, b.z0 + 1, 2.0, { feet: false });
    meshFence(b.x0 + 1, b.cz + 10, b.cx + 4, b.cz + 10, 2.0, { feet: false });
    sign('lasseskylt', { lines: ['LASSES VERKSTAD', 'Infart →'], bg: '#e5b923', fg: '#1d1f22', font: 0.42 }, b.x0 + 0.85, CURB_H + 1.4, gz0 - 1.8, 2.8, 0.9, -Math.PI / 2);
    // tyres, barrels, wrecks
    for (let k = 0; k < 4; k++) {
      const tx = b.x0 + 4 + k * 1.1, tz = b.z0 + 4;
      for (let s = 0; s < 3 + (k % 2); s++) P({ t: 'cyl', x: tx, z: tz, y0: CURB_H + s * 0.28, y1: CURB_H + s * 0.28 + 0.27, r: 0.42, n: 10, c: 0x1c1c1e, cap: true });
      colCircle(tx, tz, 0.45, 1.1);
    }
    for (let k = 0; k < 3; k++) {
      const x = wx0 - 2 - k * 1.0, z = wz1 + 1.2;
      P({ t: 'cyl', x, z, y0: CURB_H, y1: CURB_H + 1.0, r: 0.38, n: 10, c: [0x2c62a8, 0xb03a2e, 0x2f7a46][k], cap: true });
      colCircle(x, z, 0.4, 1);
    }
    P({ t: 'wreck', x: b.x0 + 9, z: b.cz + 4, h: 0.4, c: 0x7b5038 });
    colOBox(b.x0 + 9, b.cz + 4, 1.0, 2.2, 0.4, 1.5);
    P({ t: 'wreck', x: b.x0 + 12.5, z: b.cz + 3, h: -0.2, c: 0x5f6b55, y: 0.0 });
    colOBox(b.x0 + 12.5, b.cz + 3, 1.0, 2.2, -0.2, 1.5);
    // warehouse
    building({ x0: b.cx + 6, z0: b.cz + 6, x1: b.x1 - 3, z1: b.z1 - 3, h: 9, c: COL.brick2, m: M.BRICKWIN, cell: [4, 4.5], mapC: 0x7a4a3a });
    sign('lager', { lines: ['LAGER 7'], bg: '#f1ede2', fg: '#7c3c2b', font: 0.62 }, b.cx + 5.9, CURB_H + 7.4, (b.cz + 6 + b.z1 - 3) / 2, 4, 1.0, -Math.PI / 2);
    tree(b.x0 + 4, b.z1 - 5, 'oak'); tree(b.x0 + 14, b.z1 - 8, 'pine'); tree(b.cx - 6, b.z1 - 4, 'birch');
    zones.garage = { x0: b.x0, x1: wx0, z0: b.z0, z1: b.cz + 10 };
  }

  // =====================================================================
  // OUTER BAND: harbor promenade (north), lawns, quay railing, bridges
  // =====================================================================
  // lawns on west/east/south band
  area(-ISLAND, RING + 3, ISLAND, ISLAND - 3, COL.lawn, M.LAWN);
  area(-ISLAND + 0.01, -RING + 0.01, -RING - 3, -45, COL.lawn, M.LAWN);
  area(-ISLAND + 0.01, -35, -RING - 3, RING - 0.01, COL.lawn, M.LAWN);
  area(RING + 3, -RING + 0.01, ISLAND - 0.01, RING - 0.01, COL.lawn, M.LAWN);
  // gravel path along the quay
  area(-ISLAND + 1, ISLAND - 3, ISLAND - 1, ISLAND - 1, COL.gravel, M.PLAIN, OVERLAY_H + 0.02);
  area(ISLAND - 3, -RING + 0.01, ISLAND - 1, ISLAND - 3, COL.gravel, M.PLAIN, OVERLAY_H + 0.02);
  area(-ISLAND + 1, -RING + 0.01, -ISLAND + 3, -45, COL.gravel, M.PLAIN, OVERLAY_H + 0.02);
  area(-ISLAND + 1, -35, -ISLAND + 3, ISLAND - 3, COL.gravel, M.PLAIN, OVERLAY_H + 0.02);
  // quay railing (with bridge gaps)
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * (i / n), z = z0 + (z1 - z0) * (i / n);
      box(x - 0.05, CURB_H, z - 0.05, x + 0.05, CURB_H + 1.05, z + 0.05, 0x2d3238);
    }
    const t = 0.04;
    if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) {
      box(Math.min(x0, x1), CURB_H + 1.0, z0 - t, Math.max(x0, x1), CURB_H + 1.1, z0 + t, 0x2d3238);
      box(Math.min(x0, x1), CURB_H + 0.5, z0 - t, Math.max(x0, x1), CURB_H + 0.56, z0 + t, 0x2d3238);
    } else {
      box(x0 - t, CURB_H + 1.0, Math.min(z0, z1), x0 + t, CURB_H + 1.1, Math.max(z0, z1), 0x2d3238);
      box(x0 - t, CURB_H + 0.5, Math.min(z0, z1), x0 + t, CURB_H + 0.56, Math.max(z0, z1), 0x2d3238);
    }
  };
  const E = ISLAND - 0.3;
  rail(-E, -E, PIER.x0 - 0.2, -E); rail(PIER.x1 + 0.2, -E, 34.6, -E); rail(45.4, -E, E, -E); // north (gaps: the pier, the bridge at x=40)
  rail(-E, E, E, E);                                   // south
  rail(E, -E, E, E);                                   // east
  rail(-E, -E, -E, -45.4); rail(-E, -34.6, -E, E);     // west (gap for bridge at z=-40)
  // island boundary colliders
  colBox(-ISLAND - 6, -ISLAND - 6, PIER.x0, -ISLAND + 0.2, 20, { edge: true });
  colBox(PIER.x1, -ISLAND - 6, 35, -ISLAND + 0.2, 20, { edge: true });
  colBox(45, -ISLAND - 6, ISLAND + 6, -ISLAND + 0.2, 20, { edge: true });
  colBox(-ISLAND - 6, ISLAND - 0.2, ISLAND + 6, ISLAND + 6, 20, { edge: true });
  colBox(ISLAND - 0.2, -ISLAND - 6, ISLAND + 6, ISLAND + 6, 20, { edge: true });
  colBox(-ISLAND - 6, -ISLAND - 6, -ISLAND + 0.2, -45, 20, { edge: true });
  colBox(-ISLAND - 6, -35, -ISLAND + 0.2, ISLAND + 6, 20, { edge: true });
  // bridges: deck, parapets, pillars, barrier
  for (const bdg of BRIDGES) {
    const a = bdg.at;
    const along = (s, l) => (bdg.axis === 'z' ? [a + l, s] : [s, a + l]); // s = coordinate along the bridge
    const s0 = -ISLAND, s1 = bdg.to;
    const [ax0, az0] = along(s0, -5), [ax1, az1] = along(s1, 5);
    area(ax0, az0, ax1, az1, COL.asphalt, M.ASPHALT, 0);
    // deck underside
    const [ux0, uz0] = along(s0, -5.6), [ux1, uz1] = along(s1, 5.6);
    box(Math.min(ux0, ux1), -1.4, Math.min(uz0, uz1), Math.max(ux0, ux1), -0.02, Math.max(uz0, uz1), COL.concrete);
    for (const l of [-5.6, 5]) {
      const [px0, pz0] = along(s0 + 0.01, l), [px1, pz1] = along(s1, l + 0.6);
      solid(Math.min(px0, px1), -0.02, Math.min(pz0, pz1), Math.max(px0, px1), 0.95, Math.max(pz0, pz1), COL.concrete);
    }
    for (let s = s0 - 22; s > s1; s -= 26) {
      const [qx, qz] = along(s, 0);
      box(qx - (bdg.axis === 'z' ? 4 : 1), -6, qz - (bdg.axis === 'z' ? 1 : 4), qx + (bdg.axis === 'z' ? 4 : 1), -1.4, qz + (bdg.axis === 'z' ? 1 : 4), COL.concrete);
    }
    // barrier: the north bridge gets a gate that swings open later in the story (render.js draws it,
    // the game switches its colliders); the west one stays shut
    const [bx0, bz0] = along(bdg.barrier - 0.3, -5), [bx1, bz1] = along(bdg.barrier + 0.3, 5);
    if (bdg.axis === 'z') {
      const z = bdg.barrier;
      colBox(bdg.at - 5, z - 0.3, bdg.at + 5, z + 0.3, 1.1, { gate: 'north', hClosed: 1.1 });
      colBox(bdg.at - 5, z - 5.3, bdg.at - 4.4, z - 0.3, 0, { gateSide: 'north', hOpen: 1.1 });
      colBox(bdg.at + 4.4, z - 5.3, bdg.at + 5, z - 0.3, 0, { gateSide: 'north', hOpen: 1.1 });
      signs.stangtz = { w: 6.4, h: 1.3, kind: 'closed', sub: 'Öppnar snart' };
      zones.gateN = { x: bdg.at, z, y: 0 };
    } else {
      solid(Math.min(bx0, bx1), 0, Math.min(bz0, bz1), Math.max(bx0, bx1), 1.1, Math.max(bz0, bz1), 0xd2342c, M.PLAIN);
      const [ssx, ssz] = along(bdg.barrier + 0.35, 0);
      sign('stangt' + bdg.axis, { kind: 'closed' }, ssx, 1.75, ssz, 6.4, 1.3, Math.PI / 2);
    }
    for (const l of [-4.4, 4.4]) {
      const [cx, cz] = along(bdg.barrier + 2.5, l);
      P({ t: 'cyl', x: cx, z: cz, y0: 0, y1: 0.75, r: 0.25, r1: 0.04, n: 6, c: 0xe0782c });
    }
  }
  // north harbor promenade: benches, trees, a pier with boats
  for (let x = -130; x <= 130; x += 26) {
    if (Math.abs(x - 40) < 9) continue;
    bench(x, -ISLAND + 4, Math.PI);
    if (Math.abs(x - 40) > 14) tree(x + 9, -RING - 10, 'birch', 0.9);
  }
  for (let z = -100; z <= 130; z += 34) { if (Math.abs(z + 40) > 10) tree(-RING - 10, z, 'oak', 1.0); tree(RING + 10, z + 12, 'oak', 1.0); }
  for (let x = -110; x <= 120; x += 34) tree(x + 6, RING + 10, 'birch', 1.0);
  // pier
  const pierX = -75;
  box(pierX - 2.5, -0.2, -ISLAND - 26, pierX + 2.5, CURB_H, -ISLAND, COL.wood, M.PLANKS, { cell: [1, 1] });
  for (let z = -ISLAND - 3; z > -ISLAND - 26; z -= 5) {
    for (const x of [pierX - 2.3, pierX + 2.3]) P({ t: 'cyl', x, z, y0: -2.5, y1: CURB_H + 0.5, r: 0.18, n: 6, c: 0x5a4430 });
  }
  P({ t: 'boat', x: pierX + 5.5, z: -ISLAND - 12, rot: 0.04, c: 0xf2efe6, c2: 0x2c62a8 });
  P({ t: 'boat', x: pierX - 5.5, z: -ISLAND - 19, rot: -0.05, c: 0xd2342c, c2: 0xf2efe6 });
  sign('hamn', { lines: ['SJUBY HAMN'], bg: '#1d3557', fg: '#f1ede2', font: 0.6 }, pierX, CURB_H + 2.4, -ISLAND + 0.6, 4.2, 0.8, 0);
  // you can walk out on the pier (v0.5): railings along it, bollards that stop cars, a bench at the end
  rail(PIER.x0 - 0.1, -ISLAND, PIER.x0 - 0.1, PIER.z0 - 0.1);
  rail(PIER.x1 + 0.1, -ISLAND, PIER.x1 + 0.1, PIER.z0 - 0.1);
  rail(PIER.x0 - 0.1, PIER.z0 - 0.1, PIER.x1 + 0.1, PIER.z0 - 0.1);
  colBox(PIER.x0 - 0.25, PIER.z0 - 0.3, PIER.x0, -ISLAND + 0.2, 1.2);
  colBox(PIER.x1, PIER.z0 - 0.3, PIER.x1 + 0.25, -ISLAND + 0.2, 1.2);
  colBox(PIER.x0 - 0.25, PIER.z0 - 0.3, PIER.x1 + 0.25, PIER.z0, 1.2);
  for (const x of [pierX - 1.6, pierX, pierX + 1.6]) {
    P({ t: 'cyl', x, z: -ISLAND + 0.55, y0: CURB_H, y1: CURB_H + 0.85, r: 0.16, r1: 0.13, n: 8, c: 0x2d3238, cap: true });
    colCircle(x, -ISLAND + 0.55, 0.18, 1.0);
  }
  bench(PIER_BENCH.x, PIER_BENCH.z, Math.PI);
  zones.pier = { x0: PIER.x0, z0: PIER.z0, x1: PIER.x1, z1: PIER.z1 };
  P({ t: 'cyl', x: pierX - 1.9, z: -ISLAND + 0.6, y0: CURB_H, y1: CURB_H + 2.0, r: 0.05, n: 4, c: COL.darkMetal });
  P({ t: 'cyl', x: pierX + 1.9, z: -ISLAND + 0.6, y0: CURB_H, y1: CURB_H + 2.0, r: 0.05, n: 4, c: COL.darkMetal });

  // =====================================================================
  // NORRHOLMEN: the island across the north bridge (island.js)
  // =====================================================================
  const isle = islandInto({
    P, box, solid, area, poly, sign, colBox, colOBox, colCircle, castBox, building, tree, lamp, bench, hedge, meshFence, mark,
    R, M, COL, casters, footprints, parked, zones, loops, blocks, ramps, millSails,
  });

  // =====================================================================
  // PEDESTRIAN LOOPS (sidewalk centerlines)
  // =====================================================================
  for (let bz = 0; bz < 3; bz++) {
    for (let bx = 0; bx < 3; bx++) {
      loops.push({ x0: ROADS[bx] + 6.5, x1: ROADS[bx + 1] - 6.5, z0: ROADS[bz] + 6.5, z1: ROADS[bz + 1] - 6.5 });
    }
  }
  loops.push({ x0: -RING - 1.5, x1: RING + 1.5, z0: -RING - 1.5, z1: RING + 1.5, outer: true });

  // the inside of the tower (built out at sea): walls and furniture to bump into, its floor and door plates
  const inside = interiorLayout();
  colliders.push(...inside.colliders);
  Object.assign(signs, inside.signs);
  inside.floors.push({ x0: PIER.x0, z0: PIER.z0, x1: PIER.x1, z1: -ISLAND + 0.3, y: CURB_H }); // the pier deck
  inside.floors.push({ x0: BEACH.jetty.x0, z0: BEACH.jetty.z0, x1: BEACH.jetty.x1, z1: BEACH.jetty.z1, y: CURB_H + 0.02 }); // the beach's jetty (v1.1)

  return {
    prims, colliders, casters, signs, ramps, parked, blocks, footprints, craneTop, loops, goals,
    zones, kioskSpots, marks, nodes, floors: inside.floors, interiorSigns: inside.signPrims,
    millSails, isleRoads: isle.roads, gps: gpsGraph(nodes, isle.roads),
  };
}

// The graph the GPS line and the chasing Bullbilen van drive on: the town's intersections, the
// north bridge and the island roads (sampled every ~12 m), plus the driveways into the bakery yard
// and the allotments' parking strip. Each node: { x, z, adj: [ids], land: 'town' | 'bridge' | 'isle' }.
function gpsGraph(nodes, roads) {
  const G = [];
  const add = (x, z, land) => (G.push({ x, z, adj: [], land }), G.length - 1);
  const link = (a, b) => { if (a !== b && !G[a].adj.includes(b)) { G[a].adj.push(b); G[b].adj.push(a); } };
  for (const n of nodes) add(n.x, n.z, 'town');
  for (const n of nodes) for (let d = 0; d < 4; d++) if (n.nbr[d] >= 0) link(n.id, n.nbr[d]);
  const chain = (R) => {
    const ids = [];
    let acc = 1e9, prev = null;
    R.pts.forEach((p, i) => {
      if (prev) acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      prev = p;
      if (acc >= 12 || i === R.pts.length - 1) { ids.push(add(p[0], p[1], 'isle')); acc = 0; }
    });
    for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]);
    if (R.closed) link(ids[ids.length - 1], ids[0]);
    return ids;
  };
  const loop = chain(roads.loop), spine = chain(roads.spine);
  const nearest = (ids, x, z) => ids.reduce((b, i) => (Math.hypot(G[i].x - x, G[i].z - z) < Math.hypot(G[b].x - x, G[b].z - z) ? i : b), ids[0]);
  const near2 = (ids, x, z) => [...ids].sort((i, j) => Math.hypot(G[i].x - x, G[i].z - z) - Math.hypot(G[j].x - x, G[j].z - z)).slice(0, 2);
  for (const [x, z] of [[40, -250], [40, -386]]) for (const l of near2(loop, x, z)) link(nearest(spine, x, z), l); // the T-junctions
  const town = nodes.find((q) => q.x === 40 && q.z === -120).id;
  const gate = add(40, -178, 'bridge'), land = add(40, -229, 'bridge');
  link(town, gate); link(gate, land); link(land, spine[0]);
  const yard = add(ISLE.vanSpawn.x, ISLE.yard.gateZ0 / 2 + ISLE.yard.gateZ1 / 2, 'isle');
  const yardGate = add(ISLE.yard.x0 - 1, (ISLE.yard.gateZ0 + ISLE.yard.gateZ1) / 2, 'isle');
  link(yard, yardGate); link(yardGate, nearest(spine, 40, (ISLE.yard.gateZ0 + ISLE.yard.gateZ1) / 2));
  const strip = add(33.2, ISLE.allotGate.z, 'isle');
  link(strip, nearest(spine, 40, ISLE.allotGate.z));
  return { nodes: G };
}

export { onIsle, ISLE };
