// Turns the layout's primitives into a handful of merged meshes (one per 80 m chunk).
// That keeps the whole town at ~20 draw calls on a phone.
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
import { M, COL } from './layout.js';
import { CURB_H, WATER_Y } from './config.js';
import { wreckInto, boatInto } from './models.js';
import { treeInto } from './trees.js';
import { interiorInto } from './interior.js';

const CH = 80, X0 = -160;

function primCenter(p) {
  switch (p.t) {
    case 'box': case 'ramp': return [(p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2];
    case 'rbox': return [p.cx, p.cz];
    case 'gable': return [(p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2];
    case 'poly': case 'quad': return p.pts[0];
    case 'wall': case 'mesh': return [(p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2];
    default: return [p.x, p.z];
  }
}

function gable(B, p) {
  const { x0, z0, x1, z1, y, h, axis, c, m, o, gc, gm } = p;
  const under = 0x5b524a;
  if (axis === 'x') {
    const zc = (z0 + z1) / 2, half = (z1 - z0) / 2, slope = h / half, yE = y - o * slope, yr = y + h;
    const xa = x0 - o, xb = x1 + o, za = z0 - o, zb = z1 + o;
    const sl = Math.hypot(half + o, h + o * slope), L = xb - xa;
    const uv = [[0, 0], [0, sl], [L, sl], [L, 0]];
    B.quad([xa, yE, za], [xa, yr, zc], [xb, yr, zc], [xb, yE, za], c, m, uv, [0, 1, -1]);
    B.quad([xb, yE, zb], [xb, yr, zc], [xa, yr, zc], [xa, yE, zb], c, m, uv, [0, 1, 1]);
    B.tri([x0, y, z1], [x0, yr, zc], [x0, y, z0], gc, gm, [z1, y], [zc, yr], [z0, y], [-1, 0, 0]);
    B.tri([x1, y, z0], [x1, yr, zc], [x1, y, z1], gc, gm, [z0, y], [zc, yr], [z1, y], [1, 0, 0]);
    B.quad([xa, yE, za], [xb, yE, za], [xb, y, z0], [xa, y, z0], under, M.PLAIN, null, [0, -1, 0]);
    B.quad([xa, yE, zb], [xa, y, z1], [xb, y, z1], [xb, yE, zb], under, M.PLAIN, null, [0, -1, 0]);
    // fascia boards on the gable ends
    B.tri([xa, yE, za], [xa, yr, zc], [xa, yE, zb], c, m, [0, 0], [half + o, sl], [2 * (half + o), 0], [-1, 0, 0]);
    B.tri([xb, yE, zb], [xb, yr, zc], [xb, yE, za], c, m, [0, 0], [half + o, sl], [2 * (half + o), 0], [1, 0, 0]);
  } else {
    const xc = (x0 + x1) / 2, half = (x1 - x0) / 2, slope = h / half, yE = y - o * slope, yr = y + h;
    const xa = x0 - o, xb = x1 + o, za = z0 - o, zb = z1 + o;
    const sl = Math.hypot(half + o, h + o * slope), L = zb - za;
    const uv = [[0, 0], [0, sl], [L, sl], [L, 0]];
    B.quad([xa, yE, zb], [xc, yr, zb], [xc, yr, za], [xa, yE, za], c, m, uv, [-1, 1, 0]);
    B.quad([xb, yE, za], [xc, yr, za], [xc, yr, zb], [xb, yE, zb], c, m, uv, [1, 1, 0]);
    B.tri([x0, y, z0], [xc, yr, z0], [x1, y, z0], gc, gm, [x0, y], [xc, yr], [x1, y], [0, 0, -1]);
    B.tri([x1, y, z1], [xc, yr, z1], [x0, y, z1], gc, gm, [x1, y], [xc, yr], [x0, y], [0, 0, 1]);
    B.quad([xa, yE, za], [x0, y, za], [x0, y, zb], [xa, yE, zb], under, M.PLAIN, null, [0, -1, 0]);
    B.quad([xb, yE, za], [xb, yE, zb], [x1, y, zb], [x1, y, za], under, M.PLAIN, null, [0, -1, 0]);
    B.tri([xa, yE, za], [xc, yr, za], [xb, yE, za], c, m, [0, 0], [half + o, sl], [2 * (half + o), 0], [0, 0, -1]);
    B.tri([xb, yE, zb], [xc, yr, zb], [xa, yE, zb], c, m, [0, 0], [half + o, sl], [2 * (half + o), 0], [0, 0, 1]);
  }
}

function ramp(B, p) {
  const { x0, x1, z0, z1, h0, h1, c, m } = p;
  const base = CURB_H;
  const len = Math.hypot(z1 - z0, h1 - h0), W = x1 - x0;
  B.quad([x0, h0, z0], [x0, h1, z1], [x1, h1, z1], [x1, h0, z0], c, m, [[0, 0], [0, len], [W, len], [W, 0]], [0, 1, 0]);
  B.quad([x0, base, z1], [x0, h1, z1], [x0, h0, z0], [x0, base, z0], 0x7a5a38, M.PLANKS, null, [-1, 0, 0]);
  B.quad([x1, base, z0], [x1, h0, z0], [x1, h1, z1], [x1, base, z1], 0x7a5a38, M.PLANKS, null, [1, 0, 0]);
  if (h1 > base + 0.02) B.quad([x1, base, z1], [x1, h1, z1], [x0, h1, z1], [x0, base, z1], 0x6a4c2e, M.PLANKS, null, [0, 0, 1]);
  if (h0 > base + 0.02) B.quad([x0, base, z0], [x0, h0, z0], [x1, h0, z0], [x1, base, z0], 0x6a4c2e, M.PLANKS, null, [0, 0, -1]);
  // painted chevrons near the lip
  const hi = h1 > h0 ? z1 : z0, dir = h1 > h0 ? -1 : 1;
  for (let k = 0; k < 3; k++) {
    const zz = hi + dir * (0.4 + k * 0.5);
    const t = (zz - z0) / (z1 - z0), yy = h0 + (h1 - h0) * t + 0.02;
    B.quad([x0 + 0.2, yy, zz - 0.12], [x0 + 0.2, yy, zz + 0.12], [x1 - 0.2, yy, zz + 0.12], [x1 - 0.2, yy, zz - 0.12], k % 2 ? 0xeeeeee : 0xd2342c, M.PLAIN, null, [0, 1, 0]);
  }
}

function sign(B, p, atlas) {
  const uv = atlas.uv[p.id];
  if (!uv) return;
  const nx = Math.sin(p.rot), nz = Math.cos(p.rot);
  const rx = nz, rz = -nx, hw = p.w / 2, hh = p.h / 2;
  const bl = [p.x - rx * hw, p.y - hh, p.z - rz * hw], br = [p.x + rx * hw, p.y - hh, p.z + rz * hw];
  const tl = [p.x - rx * hw, p.y + hh, p.z - rz * hw], tr = [p.x + rx * hw, p.y + hh, p.z + rz * hw];
  const [u0, v0, u1, v1] = uv;
  B.quad(bl, tl, tr, br, 0xffffff, M.SIGN, [[u0, v0], [u0, v1], [u1, v1], [u1, v0]], [nx, 0, nz]);
}

const GROUND_MATS = new Set([M.PLAIN, M.LAWN, M.PAVING, M.ASPHALT, M.DIRT, M.WATER]);

export function buildWorld(layout, material, groundMaterial, fenceMaterial, atlas, interiorMaterial = null) {
  // two builders per chunk: flat ground (cheap shader variant) and everything standing on it
  const chunks = new Map();
  const getChunk = (x, z, ground) => {
    const i = Math.floor((x - X0) / CH) + 32, j = Math.floor((z - X0) / CH) + 32; // the town is 4×4 chunks, Norrholmen a few more
    const k = (j * 64 + i) * 2 + (ground ? 1 : 0);
    let B = chunks.get(k);
    if (!B) { B = new GeomBuilder(); B.ground = ground; chunks.set(k, B); }
    return B;
  };
  const get = (x, z) => getChunk(x, z, false);
  const fence = new GeomBuilder();
  let seed = 1;
  for (const p of layout.prims) {
    const [cx, cz] = primCenter(p);
    const flat = (p.t === 'poly' || p.t === 'quad' || (p.t === 'wall' && p.y1 - p.y0 < 0.5)) && GROUND_MATS.has(p.m || 0);
    const B = getChunk(cx, cz, flat);
    switch (p.t) {
      case 'box': B.box(p.x0, p.y0, p.z0, p.x1, p.y1, p.z1, p.c, p.m, { cell: p.cell, top: p.top, skipTop: p.skipTop }); break;
      case 'rbox': B.rbox(p.cx, p.cy, p.cz, p.sx, p.sy, p.sz, p.rot, p.c, p.m || 0, p.tiltX || 0); break;
      case 'gable': gable(B, p); break;
      case 'cyl': B.cyl(p.x, p.z, p.y0, p.y1, p.r, p.r1 ?? p.r, p.n, p.c, p.m || 0, !!p.cap); break;
      case 'hcyl': B.hcyl(p.x, p.y, p.z, p.len, p.r, p.axis, p.n, p.c, p.m || 0); break;
      case 'ico': B.ico(p.x, p.y, p.z, p.r, p.sy, p.c, 0, seed++); break;
      case 'tree': treeInto(B, p); break;
      case 'poly': B.poly(p.pts, p.y, p.c, p.m || 0); break;
      case 'quad': B.quad(p.pts[0], p.pts[1], p.pts[2], p.pts[3], p.c, p.m || 0, p.pts.map((q) => [q[0], q[2]]), [0, 1, 0]); break;
      case 'wall': B.wall(p.x0, p.z0, p.x1, p.z1, p.y0, p.y1, p.c, p.m || 0, !!p.flip); break;
      case 'sign': sign(B, p, atlas); break;
      case 'ramp': ramp(B, p); break;
      case 'wreck': wreckInto(B, p.x, CURB_H + 0.02 + (p.y || 0), p.z, p.h, p.c); break;
      case 'boat': boatInto(B, p.x, WATER_Y + 0.05, p.z, p.rot, p.c, p.c2); break;
      case 'mesh': {
        const len = Math.hypot(p.x1 - p.x0, p.z1 - p.z0);
        fence.quad([p.x0, p.y0, p.z0], [p.x0, p.y1, p.z0], [p.x1, p.y1, p.z1], [p.x1, p.y0, p.z1], 0xffffff, 0,
          [[0, 0], [0, (p.y1 - p.y0) * 4.5], [len * 4.5, (p.y1 - p.y0) * 4.5], [len * 4.5, 0]]);
        // top rail
        const dx = (p.x1 - p.x0) / len, dz = (p.z1 - p.z0) / len;
        B.box(Math.min(p.x0, p.x1) - Math.abs(dz) * 0.025, p.y1 - 0.04, Math.min(p.z0, p.z1) - Math.abs(dx) * 0.025,
          Math.max(p.x0, p.x1) + Math.abs(dz) * 0.025, p.y1 + 0.02, Math.max(p.z0, p.z1) + Math.abs(dx) * 0.025, 0x9aa0a6);
        break;
      }
    }
  }
  for (const mk of layout.marks) getChunk(mk.pts[0][0], mk.pts[0][1], true).poly(mk.pts, mk.y, COL.mark, 0);

  const group = new THREE.Group();
  let tris = 0;
  for (const B of chunks.values()) {
    const mesh = new THREE.Mesh(B.toGeometry(THREE), B.ground ? groundMaterial : material);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    tris += B.count / 3;
    group.add(mesh);
  }
  const fm = new THREE.Mesh(fence.toGeometry(THREE), fenceMaterial);
  fm.matrixAutoUpdate = false;
  fm.renderOrder = 2;
  group.add(fm);

  // water: one big quad, the fog hides its edges
  const W = new GeomBuilder();
  W.poly([[-900, -900], [900, -900], [900, 900], [-900, 900]], WATER_Y, 0x2b6274, M.WATER);
  const water = new THREE.Mesh(W.toGeometry(THREE), groundMaterial);
  water.matrixAutoUpdate = false;
  water.renderOrder = 50; // after the island so hidden water is rejected by the depth test
  group.add(water);

  // rotating crane top
  let crane = null;
  if (layout.craneTop.length && layout.zones.crane) {
    const C = new GeomBuilder();
    for (const b of layout.craneTop) C.box(b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, b.c, b.m || 0, { cell: b.cell, skipBottom: false });
    crane = new THREE.Mesh(C.toGeometry(THREE), material);
    crane.position.set(layout.zones.crane.x, 0, layout.zones.crane.z);
    group.add(crane);
  }
  // the windmill's sails on Norrholmen: built around the hub, turned by the view
  let mill = null;
  if (layout.millSails && layout.millSails.length && layout.zones.mill) {
    const S = new GeomBuilder();
    for (const b of layout.millSails) S.rbox(b.cx, b.cy, b.cz, b.sx, b.sy, b.sz, b.rot, b.c, 0, b.tilt);
    mill = new THREE.Mesh(S.toGeometry(THREE), material);
    mill.position.set(layout.zones.mill.x, layout.zones.mill.y, layout.zones.mill.z);
    group.add(mill);
  }
  // the inside of the tower: its own mesh (not in the group), shown only while you are in there
  let interior = null;
  if (interiorMaterial) {
    const IB = new GeomBuilder();
    interiorInto(IB);
    for (const p of layout.interiorSigns || []) sign(IB, p, atlas);
    interior = new THREE.Mesh(IB.toGeometry(THREE), interiorMaterial);
    interior.matrixAutoUpdate = false;
    interior.visible = false;
  }
  return { group, crane, mill, interior, tris: Math.round(tris), chunks: chunks.size };
}
