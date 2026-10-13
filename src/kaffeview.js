// (v1.16) What comes and goes in "Birgers kaffe", drawn for render.js: the coffee table in Birger's front garden
// (a cloth, cups, the coffee pot and his slightly burnt sponge cake) while the coffee is on, and the tarpaulins in
// Signe's woodshed – lumps over the bikes until you lift them (then folded on the floor beside). The simulation is
// in kaffe.js; this only looks at it.
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
import { M } from './layout.js';
import { CURB_H } from './config.js';
import { KAFFE } from './kaffe.js';
import { TARPS, SHED } from './vedbod.js';

function tableGeo() {
  const B = new GeomBuilder(), T = KAFFE.table, y0 = CURB_H, top = y0 + 0.74, x = T.x, z = T.z;
  for (const [dx, dz] of [[-0.55, -0.4], [0.55, -0.4], [-0.55, 0.4], [0.55, 0.4]]) B.box(x + dx - 0.03, y0, z + dz - 0.03, x + dx + 0.03, top, z + dz + 0.03, 0xf2efe8);
  B.box(x - 0.65, top, z - 0.48, x + 0.65, top + 0.03, z + 0.48, 0xf6f3ea, M.PLAIN, { skipBottom: false });
  for (let i = 0; i < 6; i++) B.box(x - 0.66 + i * 0.22, top + 0.031, z - 0.49, x - 0.55 + i * 0.22, top + 0.033, z + 0.49, 0xd65a52);   // red stripes
  // cups and saucers, the coffee pot, the sponge cake (burnt at the edge)
  for (const [dx, dz] of [[0, -0.32], [0.45, 0], [-0.45, 0], [0, 0.32]]) { B.cyl(x + dx, z + dz, top + 0.03, top + 0.04, 0.07, 0.07, 10, 0xf4f4f0, M.PLAIN, true); B.cyl(x + dx, z + dz, top + 0.04, top + 0.1, 0.04, 0.035, 8, 0xf4f4f0, M.PLAIN, true); }
  B.cyl(x + 0.18, z + 0.12, top + 0.03, top + 0.28, 0.07, 0.08, 10, 0xc0302a, M.PLAIN, true);
  B.cyl(x + 0.18, z + 0.12, top + 0.28, top + 0.31, 0.04, 0.03, 8, 0x2d3238, M.PLAIN, true);
  B.cyl(x - 0.15, z + 0.08, top + 0.03, top + 0.045, 0.2, 0.21, 14, 0xf4f4f0, M.PLAIN, true);
  B.cyl(x - 0.15, z + 0.08, top + 0.045, top + 0.15, 0.16, 0.14, 14, 0x8a4a1a, M.PLAIN, true);
  B.cyl(x - 0.15, z + 0.08, top + 0.15, top + 0.17, 0.14, 0.08, 14, 0xd99a48, M.PLAIN, true);
  // four garden chairs
  for (const [dx, dz, r] of [[0, -0.85, 0], [0.95, 0, Math.PI / 2], [-0.95, 0, -Math.PI / 2], [0, 0.9, Math.PI]]) {
    B.rbox(x + dx, y0 + 0.42, z + dz, 0.42, 0.04, 0.42, r, 0xf2efe8);
    B.rbox(x + dx - Math.sin(r) * 0.2, y0 + 0.46, z + dz - Math.cos(r) * 0.2, 0.42, 0.44, 0.04, r, 0xf2efe8);
  }
  return B.toGeometry(THREE);
}
// a tarpaulin over a bike (lump, 1.8 × 0.84 × 1.0), and the same folded on the floor
function tarpGeo() {
  const B = new GeomBuilder(), C = 0x4a6a52, C2 = 0x3e5a46;
  B.ico(0, 0.0, 0, 0.62, 1.15, C, M.FABRIC, 2);
  B.ico(-0.55, 0.0, 0.0, 0.42, 1.6, C2, M.FABRIC, 3);
  B.ico(0.55, 0.0, 0.0, 0.45, 1.5, C2, M.FABRIC, 5);
  B.box(-0.9, 0, -0.42, 0.9, 0.06, 0.42, C, M.FABRIC);
  return B.toGeometry(THREE);
}
function foldedGeo() {
  const B = new GeomBuilder();
  for (let i = 0; i < 3; i++) B.box(-0.35 + i * 0.02, i * 0.04, -0.25, 0.35 - i * 0.02, i * 0.04 + 0.04, 0.25, i % 2 ? 0x3e5a46 : 0x4a6a52, M.FABRIC, { skipBottom: false });
  return B.toGeometry(THREE);
}

export class KaffeView {
  constructor(scene, mat) {
    const add = (geo) => { const o = new THREE.Mesh(geo, mat); o.visible = false; scene.add(o); return o; };
    this.table = add(tableGeo());
    const tg = tarpGeo(), fg = foldedGeo();
    this.tarps = TARPS.map((T) => {
      const o = add(tg); o.position.set(T.tx, SHED.y, T.tz); o.rotation.y = T.rot; o.scale.set(1, 1, 0.68);
      const f = add(fg); f.position.set(T.x + (T.x - T.tx) * 0.15, SHED.y, T.z + (T.z - T.tz) * 0.15); f.rotation.y = T.rot + 0.3;
      return { T, o, f };
    });
  }

  sync(game, indoor) {
    const m = game.mission, ind = game.indoors;
    this.table.visible = !indoor && !!(m && m.kaffeTable);
    const job = m && m.active && m.active.id === 'kaffe' ? m.active : null;
    const inShed = indoor && ind.where === 'shed';
    for (const { T, o, f } of this.tarps) {
      const up = !job || job.lifted.has(T.id);
      o.visible = inShed && !up;
      f.visible = inShed && up && !!job;
    }
  }
}
