// (v1.19) What "Förbjudet område" shows, drawn for render.js: the reception table on Västerholmen's quay and the
// gangway up to M/S Kardemumma, the poster with your face by the barrier on the west bridge, and where the guards
// in Kexfabriken's yard look – a fan of light on the ground for each, stopped by walls, silos and pallets. The
// simulation is in forbud.js; this only looks at it.
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
import { M } from './layout.js';
import { CURB_H } from './config.js';
import { FORBUD, forbudSave } from './forbud.js';
import { WEST, KEX } from './westisle.js';

const Y = CURB_H;
const N = 22;   // segments in a guard's fan

function signQuad(B, uv, x, y, z, w, h, rot) {
  if (!uv) return;
  const [u0, v0, u1, v1] = uv, rx = Math.cos(rot), rz = -Math.sin(rot), nx = Math.sin(rot), nz = Math.cos(rot);
  const P = (a, b) => [x + rx * a * w / 2, y + b * h / 2, z + rz * a * w / 2];
  B.quad(P(-1, -1), P(-1, 1), P(1, 1), P(1, -1), 0xffffff, M.SIGN, [[u0, v0], [u0, v1], [u1, v1], [u1, v0]], [nx, 0, nz]);
}

// the coffee table on the quay: a white cloth, plates of cardamom biscuits, cups, a coffee pot
function tableGeo() {
  const B = new GeomBuilder(), T = FORBUD.table;
  for (const [x, z] of [[T.x0 + 0.1, T.z0 + 0.1], [T.x1 - 0.1, T.z0 + 0.1], [T.x0 + 0.1, T.z1 - 0.1], [T.x1 - 0.1, T.z1 - 0.1]]) B.cyl(x, z, Y, Y + 0.74, 0.03, 0.03, 5, 0x6b4a2e);
  B.box(T.x0 - 0.05, Y + 0.74, T.z0 - 0.05, T.x1 + 0.05, Y + 0.78, T.z1 + 0.05, 0xf4f2ea, M.PLAIN);
  B.box(T.x0 - 0.06, Y + 0.6, T.z0 - 0.06, T.x1 + 0.06, Y + 0.78, T.z0 - 0.04, 0xf4f2ea, M.PLAIN);
  B.box(T.x0 - 0.06, Y + 0.6, T.z1 + 0.04, T.x1 + 0.06, Y + 0.78, T.z1 + 0.06, 0xf4f2ea, M.PLAIN);
  for (const [cx, cz] of [[T.x0 + 0.7, (T.z0 + T.z1) / 2], [T.x0 + 1.7, (T.z0 + T.z1) / 2 - 0.1], [T.x1 - 0.6, (T.z0 + T.z1) / 2 + 0.05]]) {
    B.cyl(cx, cz, Y + 0.78, Y + 0.8, 0.22, 0.2, 14, 0xf4f4f0, M.PLAIN, true);
    for (let i = 0; i < 7; i++) { const a = i * 0.9, r = i ? 0.11 : 0; B.cyl(cx + Math.cos(a) * r, cz + Math.sin(a) * r, Y + 0.8, Y + 0.82, 0.045, 0.042, 8, 0xd9a441, M.PLAIN, true); }
  }
  for (let i = 0; i < 6; i++) { const x = T.x0 + 0.35 + i * 0.52, z = i % 2 ? T.z0 + 0.15 : T.z1 - 0.15; B.cyl(x, z, Y + 0.78, Y + 0.84, 0.04, 0.035, 8, 0xf4f4f0, M.PLAIN, true); B.cyl(x, z, Y + 0.835, Y + 0.84, 0.033, 0.033, 8, 0x4a2a18, M.PLAIN, true); }
  B.cyl(T.x1 - 1.3, T.z0 + 0.5, Y + 0.78, Y + 1.02, 0.08, 0.06, 10, 0xc9ccd0, M.CHROME, true);
  B.tube([T.x1 - 1.22, Y + 0.94, T.z0 + 0.5], [T.x1 - 1.1, Y + 0.98, T.z0 + 0.5], 0.012, 0.01, 4, 0xc9ccd0, M.CHROME);
  // a little flag of the ship on a stick in a bun
  B.tube([T.x0 + 1.7, Y + 0.82, (T.z0 + T.z1) / 2 - 0.1], [T.x0 + 1.7, Y + 1.12, (T.z0 + T.z1) / 2 - 0.1], 0.006, 0.006, 3, 0x2d3238);
  B.box(T.x0 + 1.7, Y + 1.0, (T.z0 + T.z1) / 2 - 0.1, T.x0 + 1.9, Y + 1.12, (T.z0 + T.z1) / 2 - 0.095, 0x2f6b45, M.PLAIN);
  return B.toGeometry(THREE);
}

// the gangway from the quay up to the ship's deck: a ramp with cleats and rope rails
function gangwayGeo() {
  const B = new GeomBuilder(), G = FORBUD.gangway, deck = -0.7 + 4.3;
  const x0 = G.x - 0.55, x1 = G.x + 0.55, n = 12;
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n;
    const za = G.z0 + (G.z1 - G.z0) * u0, zb = G.z0 + (G.z1 - G.z0) * u1, ya = Y + 0.05 + (deck - Y) * u0, yb = Y + 0.05 + (deck - Y) * u1;
    B.quad([x0, ya, za], [x0, yb, zb], [x1, yb, zb], [x1, ya, za], 0x9a8a6a, M.PLANKS, null, [0, 1, 0]);
    B.box(x0, ya, za, x1, ya + 0.03, za + 0.05, 0x6b5a3a);
  }
  for (const x of [x0, x1]) {
    for (let i = 0; i <= 4; i++) { const u = i / 4, z = G.z0 + (G.z1 - G.z0) * u, y = Y + (deck - Y) * u; B.cyl(x, z, y, y + 1.0, 0.025, 0.025, 5, 0xf2efe6); }
    B.tube([x, Y + 1.0, G.z0], [x, deck + 1.0, G.z1], 0.02, 0.02, 4, 0xc8b890);
  }
  B.box(x0 - 0.1, Y, G.z0 - 0.4, x1 + 0.1, Y + 0.05, G.z0, 0x6b5a3a);
  return B.toGeometry(THREE);
}

// the poster taped onto the barrier's sign: TILLTRÄDE FÖRBJUDET and your face, a strip of tape at the top
function posterGeo(uv) {
  const B = new GeomBuilder(), w = 0.8, h = 1.05;
  signQuad(B, uv, 0.0, 0, 0, w, h, Math.PI / 2);
  B.box(0.0, h / 2 - 0.05, -0.12, 0.012, h / 2 + 0.04, 0.12, 0xf0e6be, M.PLAIN);
  return B.toGeometry(THREE);
}

export class ForbudView {
  constructor(scene, mat, atlas) {
    const uv = atlas.uv;
    const add = (geo) => { const o = new THREE.Mesh(geo, mat); o.visible = false; scene.add(o); return o; };
    this.table = add(tableGeo());
    this.gangway = add(gangwayGeo());
    this.poster = add(posterGeo(uv.forbudlapp));
    // the guards' fans of light
    this.cones = [0, 1, 2].map(() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 2) * 3), 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array((N + 2) * 4), 4).setUsage(THREE.DynamicDrawUsage));
      const idx = [];
      for (let i = 0; i < N; i++) idx.push(0, i + 2, i + 1);
      g.setIndex(idx);
      const o = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      o.frustumCulled = false; o.renderOrder = 4; o.visible = false;
      scene.add(o);
      return o;
    });
  }

  sync(game, indoor) {
    const m = game.mission;
    for (const o of [this.table, this.gangway, this.poster, ...this.cones]) o.visible = false;
    if (!m || indoor) return;
    const job = m.active && m.active.id === 'forbud' ? m.active : null;
    const S = forbudSave(game);
    // the quay: the gangway whenever the ship is in, the table while the reception is on
    if (m.shipIn) this.gangway.visible = true;
    this.table.visible = !!((m.isOpen('forbud') && !(S && S.at > 0)) || (job && job.stage === 'intro'));
    // the poster by the barrier while you are banned
    if (m.banned && game.gateWest && game.gateWest.k < 0.05) {
      const P = FORBUD.poster;
      this.poster.position.set(P.x, P.y, P.z);
      this.poster.visible = true;
    }
    if (job && job.guards) job.guards.forEach((G, i) => { if (i < this.cones.length) this.syncCone(game, this.cones[i], G.cone); });
    void WEST; void KEX;
  }

  syncCone(game, mesh, c) {
    mesh.visible = c.on > 0.02;
    if (!mesh.visible) return;
    const geo = mesh.geometry, pos = geo.attributes.position.array, col = geo.attributes.color.array;
    const y = Y + 0.06, w = game.world;
    const r = 1, gg = 0.85 - c.alert * 0.6, b = 0.35 - c.alert * 0.2;
    pos[0] = c.x; pos[1] = y; pos[2] = c.z;
    col[0] = r; col[1] = gg; col[2] = b; col[3] = 0.5 * c.on;
    for (let i = 0; i <= N; i++) {
      const a = c.dir - c.half + (2 * c.half * i) / N;
      const ex = c.x + Math.sin(a) * c.range, ez = c.z + Math.cos(a) * c.range;
      let f = w.raycast(c.x, c.z, ex, ez, CURB_H + 1.3);
      for (const [sx, sz] of KEX.silos) {        // (the silos are round: the raycast skips circles)
        const dx = ex - c.x, dz = ez - c.z, fx = c.x - sx, fz = c.z - sz;
        const A = dx * dx + dz * dz, Bq = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - 2.4 * 2.4, D = Bq * Bq - 4 * A * C;
        if (D > 0) { const t = (-Bq - Math.sqrt(D)) / (2 * A); if (t > 0 && t < f) f = t; }
      }
      const j = (i + 1) * 3, k = (i + 1) * 4;
      pos[j] = c.x + (ex - c.x) * f; pos[j + 1] = y; pos[j + 2] = c.z + (ez - c.z) * f;
      col[k] = r; col[k + 1] = gg; col[k + 2] = b; col[k + 3] = 0.14 * c.on;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }
}
