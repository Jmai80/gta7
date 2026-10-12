// (v1.14) What moves in the three new quests, drawn for render.js:
//   "Den gyllene bullen": the golden bun on its mossy stone (until a magpie takes it), the magpie with the bun
//   in its beak, the bun dropped in the moss, the trophy's oak foot and then the whole trophy in your hands (and
//   Gun's), the trophy back on its shelf in the konditori; inside the konditori what you carry from the
//   counter, Gun's mother's mortar (its pestle pounds), the baking tray – raw, golden or black – on the table, in
//   your hands, in the stone oven, by Gun; and the bun championship on the square (the judges' table, two stands).
//   "Odjurets bild": the old log that comes up instead of the monster now and then.
// The simulation is in guldbullen.js and odjuret.js; this only looks at it. (The ducks and the monster itself
// are drawn in render.js.)
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
import { M } from './layout.js';
import { CURB_H, FEST, WATER_Y } from './config.js';
import { SECRETS } from './secrets.js';
import { KOND } from './konditori.js';
import { GULD } from './guldbullen.js';
import { decal, bunInto } from './models.js';

const GOLD = SECRETS.find((s) => s.id === 'goldbun');
const WHITE = 0xffffff;

// the golden bun: a gilded knot with a swirl, local origin at its bottom middle (about 0.3 m across)
function goldBunInto(B, y = 0, s = 1) {
  // (plain material: chrome mirrors the sky and turns gold silvery-blue)
  B.ico(0, y + 0.08 * s, 0, 0.16 * s, 0.52, 0xd99a18, M.PLAIN, 3);
  B.ico(0, y + 0.13 * s, 0, 0.11 * s, 0.5, 0xf2c21b, M.PLAIN, 5);
  for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 0.035 + i * 0.012; B.box(Math.cos(a) * r - 0.012, y + 0.155 * s, Math.sin(a) * r - 0.012, Math.cos(a) * r + 0.012, y + 0.17 * s, Math.sin(a) * r + 0.012, 0xfff0a0, M.LIGHT); }
}
// the oak foot with its brass plate (local: bottom middle, the plate facing +z)
function footInto(B) {
  B.box(-0.14, 0, -0.14, 0.14, 0.05, 0.14, 0x5a3a22, M.PLANKS, { skipBottom: false });
  B.box(-0.11, 0.05, -0.11, 0.11, 0.19, 0.11, 0x6b4426, M.PLANKS);
  B.box(-0.13, 0.19, -0.13, 0.13, 0.22, 0.13, 0x5a3a22, M.PLANKS);
  B.box(-0.08, 0.08, 0.11, 0.08, 0.16, 0.115, 0xd8b45a, M.CHROME);
  B.box(-0.05, 0.22, -0.05, 0.05, 0.26, 0.05, 0xd8b45a, M.CHROME);       // the thread the bun screws onto
}
function trophyGeo(full) {
  const B = new GeomBuilder();
  footInto(B);
  if (full) goldBunInto(B, 0.24, 1.0);
  return B.toGeometry(THREE);
}
// a magpie, facing +z, feet at the origin: black head and back, white belly and shoulders, a long tail
export function magpieParts() {
  const B = new GeomBuilder(), BLK = 0x16181c, IRI = 0x1d3a4a;
  B.ico(0, 0.16, 0, 0.11, 0.8, BLK, 0, 1);                     // the body …
  B.ico(0, 0.12, 0.02, 0.085, 0.75, WHITE, 0, 2);              // … and the white belly
  B.ico(0, 0.26, 0.1, 0.065, 1.0, BLK, 0, 3);                  // the head
  B.tube([0, 0.26, 0.15], [0, 0.25, 0.22], 0.016, 0.003, 5, 0x0d0e10);   // the beak
  for (const s of [-1, 1]) B.ico(s * 0.035, 0.28, 0.135, 0.01, 1, 0x050505);
  B.tube([0, 0.17, -0.08], [0, 0.2, -0.36], 0.035, 0.012, 5, IRI);      // the long tail
  for (const s of [-1, 1]) B.tube([s * 0.03, 0.06, 0], [s * 0.03, 0.0, 0.01], 0.008, 0.006, 4, 0x2a2b2f); // legs
  const body = B.toGeometry(THREE);
  const W = new GeomBuilder();                                 // a wing: from the shoulder out along +x
  W.box(0, -0.012, -0.08, 0.2, 0.012, 0.08, BLK, 0, { skipBottom: false });
  W.box(0.02, 0.012, -0.05, 0.1, 0.016, 0.05, WHITE);
  W.box(0.14, -0.01, -0.09, 0.26, 0.01, 0.04, IRI, 0, { skipBottom: false });
  return { body, wing: W.toGeometry(THREE) };
}
// what you carry from the counter: the milk carton, the butter, a jar (sugar, flour), the bag of cardamom,
// and crushed cardamom in a little bowl
function handGeos() {
  const mk = (fn) => { const B = new GeomBuilder(); fn(B); return B.toGeometry(THREE); };
  return {
    mjolk: mk((B) => { B.box(-0.05, 0, -0.05, 0.05, 0.2, 0.05, 0xf4f4f0, 0, { skipBottom: false }); B.box(-0.052, 0.09, -0.052, 0.052, 0.15, 0.052, 0x2f6fb5); B.rbox(0, 0.2, 0, 0.07, 0.04, 0.07, Math.PI / 4, 0xf4f4f0); }),
    smor: mk((B) => { B.box(-0.09, 0, -0.06, 0.09, 0.06, 0.06, 0xf2dc7a, 0, { skipBottom: false }); B.box(-0.092, 0.02, -0.062, 0.092, 0.04, 0.062, 0xd2342c); }),
    socker: mk((B) => { B.cyl(0, 0, 0, 0.2, 0.08, 0.08, 10, 0xcfe4ee, M.IGLASS, true); B.cyl(0, 0, 0.01, 0.15, 0.072, 0.072, 10, WHITE, 0, true); B.cyl(0, 0, 0.2, 0.23, 0.085, 0.085, 10, 0xd8b45a, M.CHROME, true); }),
    mjol: mk((B) => { B.cyl(0, 0, 0, 0.2, 0.08, 0.08, 10, 0xcfe4ee, M.IGLASS, true); B.cyl(0, 0, 0.01, 0.15, 0.072, 0.072, 10, 0xeee6d2, 0, true); B.cyl(0, 0, 0.2, 0.23, 0.085, 0.085, 10, 0xd8b45a, M.CHROME, true); }),
    kardemumma: mk((B) => { B.rbox(0, 0, 0, 0.11, 0.16, 0.07, 0, 0x7a8a3a, M.FABRIC); B.rbox(0, 0.16, 0, 0.1, 0.03, 0.06, 0, 0xf2c21b, M.FABRIC); }),
    stott: mk((B) => { B.cyl(0, 0, 0, 0.07, 0.07, 0.1, 12, 0xf2efe6, 0, true); B.cyl(0, 0, 0.055, 0.065, 0.085, 0.085, 12, 0x6b5a2a, 0, true); }),
  };
}
// the baking tray with twelve buns: raw (pale dough), golden, black
function trayGeos() {
  const out = {};
  for (const [k, tone, swirl] of [['raw', 0xeedcae, 0xd8c08a], ['golden', 0xc07a32, 0x8a4a1a], ['burnt', 0x2a1d16, 0x1a1210]]) {
    const B = new GeomBuilder();
    B.box(-0.3, 0, -0.2, 0.3, 0.012, 0.2, 0x3a3c41, M.CHROME, { skipBottom: false });
    for (const [x0, z0, x1, z1] of [[-0.3, -0.2, 0.3, -0.188], [-0.3, 0.188, 0.3, 0.2], [-0.3, -0.2, -0.288, 0.2], [0.288, -0.2, 0.3, 0.2]]) B.box(x0, 0, z0, x1, 0.025, z1, 0x2b2e35, M.CHROME);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = -0.2 + c * 0.133, z = -0.11 + r * 0.11;
      B.cyl(x, z, 0.012, 0.045, 0.048, 0.042, 8, tone, M.PLAIN);
      B.cyl(x, z, 0.045, 0.062, 0.042, 0.02, 8, swirl, M.PLAIN, true);
      if (k !== 'burnt') for (let i = 0; i < 3; i++) { const a = r * 2 + c + i * 2.1; B.box(x + Math.cos(a) * 0.02 - 0.005, 0.058, z + Math.sin(a) * 0.02 - 0.005, x + Math.cos(a) * 0.02 + 0.005, 0.066, z + Math.sin(a) * 0.02 + 0.005, 0xf6f3ea); }
    }
    out[k] = B.toGeometry(THREE);
  }
  return out;
}
// the championship on the square: the judges' long table (FEST.table) with a yellow banner, plates, three
// name-less cups; and two bakers' stands with a name card and a plate of buns each. World coordinates.
function festGeo(uv) {
  const B = new GeomBuilder(), T = FEST.table, y0 = CURB_H, top = y0 + 0.76, CLOTH = 0xf6f3ea, YEL = 0xf2c21b;
  for (const x of [T.x0 + 0.2, (T.x0 + T.x1) / 2, T.x1 - 0.2]) for (const z of [T.z0 + 0.12, T.z1 - 0.12]) B.box(x - 0.03, y0, z - 0.03, x + 0.03, top, z + 0.03, 0x8a6440);
  B.box(T.x0 - 0.06, top, T.z0 - 0.06, T.x1 + 0.06, top + 0.03, T.z1 + 0.06, CLOTH, M.PLAIN, { skipBottom: false });
  B.box(T.x0 - 0.07, top - 0.45, T.z0 - 0.07, T.x1 + 0.07, top + 0.03, T.z0 - 0.05, CLOTH);
  B.box(T.x0 - 0.075, top - 0.45, T.z0 - 0.075, T.x1 + 0.075, top - 0.37, T.z0 - 0.065, YEL);
  if (uv.bmbanner) { const [u0, v0, u1, v1] = uv.bmbanner; decal(B, [(T.x0 + T.x1) / 2, top - 0.17, T.z0 - 0.08], [0, 0, -1], 3.4, 0.34, WHITE, M.SIGN, [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]); }
  const zc = (T.z0 + T.z1) / 2;
  let k = 0;
  for (const J of GULD.fest.judges) {                                            // a plate with two buns (one from each) and a cup
    B.cyl(J.x, zc - 0.05, top + 0.03, top + 0.045, 0.16, 0.17, 12, WHITE, M.PLAIN, true);
    bunInto(B, J.x - 0.06, top + 0.045, zc - 0.05, 1, k++); bunInto(B, J.x + 0.07, top + 0.045, zc - 0.05, 1, k++);
    B.cyl(J.x + 0.32, zc + 0.12, top + 0.03, top + 0.1, 0.04, 0.045, 8, WHITE, M.PLAIN, true);
    B.box(J.x - 0.14, top + 0.03, zc + 0.18, J.x + 0.14, top + 0.08, zc + 0.24, 0x2b2e35);           // a scoring card
  }
  // the bun wreath on a stand in the middle – where the trophy will stand
  for (const S of GULD.fest.stands) {
    const x = S.x, z = S.z, t2 = y0 + 0.78;
    for (const [dx, dz] of [[-0.4, -0.25], [0.37, -0.25], [-0.4, 0.22], [0.37, 0.22]]) B.box(x + dx, y0, z + dz, x + dx + 0.03, t2, z + dz + 0.03, 0x8a6440);
    B.box(x - 0.45, t2, z - 0.3, x + 0.45, t2 + 0.03, z + 0.3, CLOTH, M.PLAIN, { skipBottom: false });
    B.box(x - 0.46, t2 - 0.3, z - 0.31, x + 0.46, t2 + 0.03, z - 0.29, S.who === 'bengt' ? 0xd9534f : 0x5a5f6b);
    const key = S.who === 'bengt' ? 'bmbengt' : 'bmdahl';
    if (uv[key]) { const [u0, v0, u1, v1] = uv[key]; decal(B, [x, t2 - 0.15, z - 0.32], [0, 0, -1], 0.86, 0.23, WHITE, M.SIGN, [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]); }
    B.cyl(x, z, t2 + 0.03, t2 + 0.045, 0.24, 0.25, 14, WHITE, M.PLAIN, true);
    for (let j = 0; j < 7; j++) bunInto(B, x + (j ? Math.cos(j * 1.05) * 0.14 : 0), t2 + 0.045, z + (j ? Math.sin(j * 1.05) * 0.14 : 0), 1.05, j + (S.who === 'bengt' ? 0 : 3));
  }
  return B.toGeometry(THREE);
}
// a waterlogged old log, the length along z, its middle at the origin (y = 0: the water line when fully up)
function logGeo() {
  const B = new GeomBuilder();
  B.hcyl(0, -0.05, 0, 3.4, 0.28, 'z', 9, 0x4a3a2a, M.PLAIN, true);
  B.tube([0.15, 0.0, 0.9], [0.55, 0.45, 1.3], 0.08, 0.04, 5, 0x3a2c20);   // a broken-off branch
  B.ico(0, 0.1, -1.6, 0.12, 0.6, 0x5f7a4a);                              // weed on one end
  return B.toGeometry(THREE);
}

export class PropsView {
  constructor(scene, mat, atlas) {
    this.scene = scene;
    const add = (geo) => { const o = new THREE.Mesh(geo, mat); o.visible = false; scene.add(o); return o; };
    const BG = new GeomBuilder(); goldBunInto(BG, 0, 1.25);
    const bunGeo = BG.toGeometry(THREE);
    this.stoneBun = add(bunGeo);
    this.stoneBun.position.set(GOLD.x, CURB_H + 0.36, GOLD.z - 0.9);
    this.looseBun = add(bunGeo);
    this.trophy = add(trophyGeo(true));
    this.foot = add(trophyGeo(false));
    this.shelfTrophy = add(trophyGeo(true));
    this.shelfTrophy.position.set(KOND.shelf.x, KOND.shelf.y, KOND.shelf.z);
    this.shelfTrophy.rotation.y = Math.PI / 2;
    // the magpie: a body and two wings that flap
    const MP = magpieParts();
    this.magpie = new THREE.Group();
    this.magpie.add(new THREE.Mesh(MP.body, mat));
    this.wings = [-1, 1].map((s) => { const w = new THREE.Mesh(MP.wing, mat); w.position.set(s * 0.07, 0.2, 0.02); w.scale.x = s; this.magpie.add(w); return w; });
    const BB = new GeomBuilder(); goldBunInto(BB, 0, 0.55);
    this.beakBun = new THREE.Mesh(BB.toGeometry(THREE), mat); this.beakBun.position.set(0, 0.17, 0.24); this.magpie.add(this.beakBun);
    this.magpie.scale.setScalar(1.7); this.magpie.rotation.order = 'YXZ';
    this.magpie.visible = false; scene.add(this.magpie);
    // inside the konditori
    this.hand = Object.fromEntries(Object.entries(handGeos()).map(([k, geo]) => [k, add(geo)]));
    this.trays = Object.fromEntries(Object.entries(trayGeos()).map(([k, geo]) => [k, add(geo)]));
    const MO = (() => {
      const B = new GeomBuilder(), BR = 0xc9a24a;
      B.cyl(0, 0, 0, 0.03, 0.085, 0.09, 12, 0xa8843a, M.CHROME, true);
      B.cyl(0, 0, 0.03, 0.16, 0.09, 0.115, 12, BR, M.CHROME);
      B.cyl(0, 0, 0.16, 0.175, 0.125, 0.12, 12, 0xa8843a, M.CHROME);
      B.cyl(0, 0, 0.12, 0.15, 0.085, 0.085, 10, 0x6b4a2a, M.PLAIN, true);
      const P = new GeomBuilder();
      P.cyl(0, 0, 0, 0.2, 0.022, 0.017, 8, BR, M.CHROME, true); P.ico(0, 0.21, 0, 0.032, 1.1, 0xa8843a, M.CHROME);
      return { bowl: B.toGeometry(THREE), pestle: P.toGeometry(THREE) };
    })();
    this.mortar = new THREE.Group();
    this.mortar.add(new THREE.Mesh(MO.bowl, mat));
    this.pestle = new THREE.Mesh(MO.pestle, mat); this.pestle.position.set(0.02, 0.12, 0); this.pestle.rotation.z = 0.18;
    this.mortar.add(this.pestle);
    this.mortar.position.set(KOND.mortarAt.x, KOND.mortarAt.y, KOND.mortarAt.z);
    this.mortar.visible = false; scene.add(this.mortar);
    // the championship and the log
    this.fest = add(festGeo(atlas.uv));
    this.log = add(logGeo());
  }

  sync(game, indoor) {
    const m = game.mission, p = game.player, ind = game.indoors;
    const job = m && m.active && m.active.id === 'guldbullen' ? m.active : null;
    const hide = [this.stoneBun, this.looseBun, this.trophy, this.foot, this.shelfTrophy, this.magpie, this.mortar, this.fest, this.log, ...Object.values(this.hand), ...Object.values(this.trays)];
    for (const o of hide) o.visible = false;
    if (!m) return;
    const hold = (o, who, fwd, up, side = 0) => { const c = Math.cos(who.h), s = Math.sin(who.h); o.position.set(who.x + s * fwd + c * side, who.y + up, who.z + c * fwd - s * side); o.rotation.set(0, who.h, 0); o.visible = true; };
    const cp = game.view, onFoot = p.state === 'foot' || p.state === 'down';
    if (!indoor) {
      // the golden bun on its stone (until the magpie, or the konditori's shelf)
      if (!m.goldbunGone && Math.hypot(cp.x - GOLD.x, cp.z - GOLD.z) < 160) { this.stoneBun.visible = true; this.stoneBun.rotation.y = 0.4; }
      if (job && job.magpie && job.magpie.state !== 'gone' && (job.stage === 'stone' || job.stage === 'magpie' || job.stage === 'pick')) {
        const B = job.magpie, o = this.magpie;
        o.visible = true; o.position.set(B.x, B.y, B.z);
        const flying = B.state === 'fly' || B.state === 'away';
        o.rotation.set(flying ? 0.15 : B.state === 'ground' ? Math.max(0, Math.sin(game.time * 5)) * 0.5 : -0.05, B.h, 0);
        const flap = flying ? Math.sin(game.time * 22) * 0.9 : -1.3;
        this.wings[0].rotation.z = -flap; this.wings[1].rotation.z = flap;
        this.beakBun.visible = !!B.bun;
      }
      if (job && job.bunAt) { const A = job.bunAt, k = A.t * A.t; this.looseBun.visible = true; this.looseBun.position.set(A.x, A.from + (A.y - A.from) * k, A.z); this.looseBun.rotation.set(0.3 * (1 - A.t), 1.1, 0.2); }
      // the trophy: the foot from the gnome, then the whole thing – in your hands, then Gun's at the championship
      const Fs = m.guldFest;
      if (job && job.carry && onFoot && !job.given) hold(job.carry === 'pokal' ? this.trophy : this.foot, p, 0.42, 1.0);
      else if (job && job.given && Fs && Fs.gun) hold(this.trophy, Fs.gun, 0.38, 1.05);
      if (Fs) this.fest.visible = true;
      // Nova's camera: a log that bobs up instead of the monster
      const MP = game.monsterPose;
      if (MP && MP.kind === 'stock' && MP.up > 0.01) { this.log.visible = true; this.log.position.set(MP.x, WATER_Y - 0.35 + MP.up * 0.42, MP.z); this.log.rotation.set(0, MP.h + 0.9, Math.sin(game.time * 1.4) * 0.05); }
      return;
    }
    if (ind.where !== 'konditori') return;
    // ---- inside the konditori
    this.mortar.visible = true;
    const k = job ? game.time - (job.poundAt ?? -9) : 9;
    this.pestle.position.y = 0.12 + (k < 0.14 ? -0.07 * (1 - k / 0.14) : 0.03);
    this.pestle.rotation.z = k < 0.14 ? 0.05 : 0.18;
    if (m.done.has('guldbullen')) this.shelfTrophy.visible = true;
    if (!job) return;
    if (job.hand && onFoot && this.hand[job.hand]) hold(this.hand[job.hand], p, 0.34, 1.05, -0.12);
    const st = job.tray ? job.trayState : job.bakedState;
    const tray = st && this.trays[st === 'golden' ? 'golden' : st];
    if (!tray) return;
    const at = (x, y, z, r = 0) => { tray.visible = true; tray.position.set(x, y, z); tray.rotation.set(0, r, 0); };
    if (job.stage === 'tray') at(KOND.table.x, KOND.table.y, KOND.table.z);
    else if (job.stage === 'oven' && onFoot) hold(tray, p, 0.42, 0.98);
    else if (job.stage === 'baking') at(KOND.slot.x, KOND.slot.y, KOND.slot.z, Math.PI / 2);
    else if (['taste', 'photo', 'photoTalk'].includes(job.stage)) at(KOND.gun.x + 0.6, KOND.y + 1.05, KOND.gun.z - 0.82);
  }
}
