// (v1.17) What moves in "Bullbilens bageri", drawn for render.js: the dough balls rolling along the belt in front of
// Stora Bertha (pale lumps, or knotted buns once you have shaped them), the oven's glow once Signe has lit it (the
// firebox and the round windows), and the red ribbon across the bakery's new door at the opening. The simulation
// is in bullbageri.js; this only looks at it.
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
import { M } from './layout.js';
import { CURB_H } from './config.js';
import { BAK, BAK_DOOR } from './bageriet.js';

const MAXB = 8;

function ballGeo(knot) {
  const B = new GeomBuilder();
  if (!knot) B.ico(0, 0.06, 0, 0.09, 0.75, 0xeedcae, M.PLAIN, 2);
  else {
    B.cyl(0, 0, 0, 0.05, 0.1, 0.085, 10, 0xeedcae, M.PLAIN, true);
    B.cyl(0, 0, 0.05, 0.08, 0.085, 0.04, 10, 0xd8c08a, M.PLAIN, true);
    for (let i = 0; i < 4; i++) { const a = i * 1.6; B.box(Math.cos(a) * 0.04 - 0.008, 0.075, Math.sin(a) * 0.04 - 0.008, Math.cos(a) * 0.04 + 0.008, 0.088, Math.sin(a) * 0.04 + 0.008, 0xf6f3ea); }
  }
  return B.toGeometry(THREE);
}
function glowGeo() {
  const B = new GeomBuilder(), X = BAK.room.x0, Z = BAK.room.z0, Y = BAK.y;
  for (let i = 0; i < 6; i++) { const x = X + 1.9 + i * 1.5; B.box(x - 0.13, Y + 1.19, Z + 1.795, x + 0.13, Y + 1.41, Z + 1.81, 0xffb347, M.LIGHT); }
  B.box(X + 1.02, Y + 0.88, Z + 1.795, X + 1.58, Y + 1.23, Z + 1.81, 0xff8a3a, M.LIGHT);              // the mouth
  B.box(X + 10.49, Y + 0.5, Z + 0.45, X + 10.5, Y + 1.2, Z + 1.25, 0xff8a3a, M.LIGHT);                 // the firebox, ajar
  return B.toGeometry(THREE);
}
function ribbonGeo() {
  const B = new GeomBuilder(), x = BAK_DOOR.x, z = BAK_DOOR.z - 1.0, y = CURB_H + 1.05;
  B.tube([x - 0.7, y, z], [x + 0.7, y, z], 0.03, 0.03, 6, 0xd2342c);
  B.ico(x, y, z + 0.03, 0.12, 0.7, 0xd2342c, M.PLAIN, 1);
  for (const s of [-1, 1]) B.tube([x, y, z + 0.03], [x + s * 0.08, y - 0.25, z + 0.04], 0.025, 0.02, 5, 0xd2342c);
  for (const s of [-1, 1]) B.box(x + s * 0.7 - 0.03, CURB_H, z - 0.03, x + s * 0.7 + 0.03, y + 0.05, z + 0.03, 0xc9a24a, M.CHROME);
  return B.toGeometry(THREE);
}

export class BakView {
  constructor(scene, mat) {
    const add = (geo) => { const o = new THREE.Mesh(geo, mat); o.visible = false; scene.add(o); return o; };
    const raw = ballGeo(false), knot = ballGeo(true);
    this.raw = Array.from({ length: MAXB }, () => add(raw));
    this.knots = Array.from({ length: MAXB }, () => add(knot));
    this.glow = add(glowGeo());
    this.ribbon = add(ribbonGeo());
  }

  sync(game, indoor) {
    const m = game.mission, ind = game.indoors;
    for (const o of [...this.raw, ...this.knots, this.glow, this.ribbon]) o.visible = false;
    if (!m) return;
    const job = m.active && m.active.id === 'bageri' ? m.active : null;
    if (!indoor) { if (job && job.ribbon) this.ribbon.visible = true; return; }
    if (ind.where !== 'bageri') return;
    if (m.bertha) this.glow.visible = true;
    if (!job) return;
    let r = 0, k = 0;
    for (const b of job.balls) {
      const o = b.knot ? this.knots[k++] : this.raw[r++];
      if (!o) continue;
      o.visible = true; o.position.set(b.x, BAK.belt.y, BAK.belt.z); o.rotation.y = b.k * 1.3;
    }
  }
}
