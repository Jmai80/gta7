// (v1.15) What moves in "Skatans bo", drawn for render.js: the magpie in the lantern (preening, looking up,
// keeping watch with a "!" over her, diving, flying out through the open pane), her nest – on top of the lens,
// in your hands, on Ingvar's kitchen table – and the lamp: dark until it is lit, then glowing, with two beams
// of light going round, both in the lantern and on the real lighthouse out on Norrholmen. The simulation is in
// skatbo.js; this only looks at it.
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
import { M } from './layout.js';
import { CURB_H } from './config.js';
import { ISLE } from './island.js';
import { FYR, fyrFloor } from './fyren.js';
import { magpieParts } from './propsview.js';

const L = ISLE.lighthouse;

// the nest: a big tangle of twigs round a dark hollow, wire and fishing line, and things that glint
function nestGeo() {
  const B = new GeomBuilder(), TW = [0x6a4a2a, 0x7a5a32, 0x5a3e24, 0x8a6a40];
  B.ico(0, 0.06, 0, 0.42, 0.32, 0x5a3e24, M.PLAIN, 4);
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39, r = 0.34 + (i % 4) * 0.03, y = 0.06 + (i % 5) * 0.035, l = 0.28 + (i % 3) * 0.06;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, ta = a + 1.2 + (i % 2) * 0.6;
    B.tube([x - Math.cos(ta) * l, y, z - Math.sin(ta) * l], [x + Math.cos(ta) * l, y + 0.04, z + Math.sin(ta) * l], 0.016, 0.01, 4, TW[i % 4]);
  }
  B.cyl(0, 0, 0.12, 0.14, 0.26, 0.24, 10, 0x2a1d14, M.PLAIN, true);                 // the hollow
  B.tube([-0.3, 0.14, 0.1], [0.32, 0.2, -0.05], 0.006, 0.006, 4, 0xb9bec4, M.CHROME);  // a bit of wire
  B.tube([-0.2, 0.16, -0.28], [0.25, 0.12, 0.3], 0.004, 0.004, 4, 0x9ad0e0);         // fishing line
  // the things: a silver thimble, the stopwatch, the scissors, the iron key, the green earring
  B.cyl(-0.1, 0.05, 0.14, 0.19, 0.025, 0.02, 8, 0xd8dce0, M.CHROME, true);
  B.cyl(0.08, -0.06, 0.14, 0.16, 0.05, 0.05, 10, 0xc9ccd0, M.CHROME, true); B.cyl(0.08, -0.06, 0.16, 0.162, 0.04, 0.04, 10, 0xf6f3ea, M.PLAIN, true);
  B.rbox(0.0, 0.14, 0.12, 0.12, 0.012, 0.02, 0.6, 0xc9ccd0, M.CHROME);
  B.rbox(-0.14, 0.14, -0.08, 0.16, 0.015, 0.025, -0.4, 0x4a4c50, M.PLAIN);
  B.ico(0.14, 0.17, 0.08, 0.022, 1.0, 0x2fb35a, M.LIGHT);
  return B.toGeometry(THREE);
}
// a beam of light: a long open cone from the lamp out along +x (apex at the origin)
function beamGeo(len, r) {
  const g = new THREE.ConeGeometry(r, len, 18, 1, true);
  g.rotateZ(Math.PI / 2); g.translate(len / 2, 0, 0);
  return g;
}
function bangTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = '#1d1f22'; x.strokeText('!', 32, 34);
  x.fillStyle = '#ffcf33'; x.fillText('!', 32, 34);
  return new THREE.CanvasTexture(c);
}

export class FyrView {
  constructor(scene, mat) {
    const add = (o) => { o.visible = false; scene.add(o); return o; };
    const NG = nestGeo();
    this.nest = add(new THREE.Mesh(NG, mat));
    // the magpie
    const MP = magpieParts();
    this.bird = new THREE.Group();
    this.bird.add(new THREE.Mesh(MP.body, mat));
    this.wings = [-1, 1].map((s) => { const w = new THREE.Mesh(MP.wing, mat); w.position.set(s * 0.07, 0.2, 0.02); w.scale.x = s; this.bird.add(w); return w; });
    this.bird.scale.setScalar(2.6); this.bird.rotation.order = 'YXZ';
    add(this.bird);
    this.bang = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: bangTexture(), transparent: true, depthWrite: false, fog: false })));
    this.bang.scale.set(0.8, 0.8, 1);
    // the lit lamp, outside and in the lantern, and the beams
    const lampMat = (r, y0, y1) => { const B = new GeomBuilder(); B.cyl(0, 0, y0, y1, r, r, 10, 0xfff1c9, M.LIGHT, true); return B.toGeometry(THREE); };
    // (the whole lantern glows: just outside its glass, and just inside the lens's brass rings)
    this.outLamp = add(new THREE.Mesh(lampMat(1.27, 0, 1.8), mat)); this.outLamp.position.set(L.x, CURB_H + 13.87, L.z);
    this.inLamp = add(new THREE.Mesh(lampMat(0.835, 0, 1.06), mat)); this.inLamp.position.set(FYR.lens.x, FYR.y + 1.07, FYR.lens.z);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beams = (len, r) => { const G = new THREE.Group(), geo = beamGeo(len, r); for (const a of [0, Math.PI]) { const o = new THREE.Mesh(geo, beamMat); o.rotation.y = a; G.add(o); } return G; };
    this.outBeams = add(beams(70, 5.5)); this.outBeams.position.set(L.x, CURB_H + 14.7, L.z);
    this.inBeams = add(beams(9, 0.9)); this.inBeams.position.set(FYR.lens.x, FYR.y + 1.55, FYR.lens.z);
    for (const G of [this.outBeams, this.inBeams]) for (const o of G.children) o.renderOrder = 5;
  }

  sync(game, indoor) {
    const m = game.mission, p = game.player, ind = game.indoors;
    for (const o of [this.nest, this.bird, this.bang, this.outLamp, this.inLamp, this.outBeams, this.inBeams]) o.visible = false;
    if (!m) return;
    const job = m.active && m.active.id === 'skatbo' ? m.active : null;
    const lit = !!m.lampLit, spin = game.time * 0.9;
    if (!indoor) {
      if (lit) { this.outLamp.visible = true; this.outBeams.visible = true; this.outBeams.rotation.y = spin; }
      return;
    }
    if (ind.where !== 'fyren') return;
    if (lit) { this.inLamp.visible = true; this.inBeams.visible = true; this.inBeams.rotation.y = spin; }
    // the nest: on the lens until it is taken, then in your hands, then on the kitchen table
    if (!m.nestGone && !(job && job.nestTaken)) { this.nest.visible = true; this.nest.position.set(FYR.nest.x, FYR.nest.y - 0.08, FYR.nest.z); this.nest.rotation.set(0, 0.5, 0); this.nest.scale.setScalar(1); }
    else if (job && job.carry === 'nest' && p.state === 'foot') {
      const c = Math.cos(p.h), s = Math.sin(p.h);
      this.nest.visible = true; this.nest.position.set(p.x + s * 0.45, p.y + 0.95, p.z + c * 0.45); this.nest.rotation.set(0, p.h, 0); this.nest.scale.setScalar(0.8);
    } else if (job && job.nestOnTable && ['elsaTalk', 'deliver'].includes(job.stage) && fyrFloor(p.x, p.z) === 0) {
      this.nest.visible = true; this.nest.position.set(FYR.table.x - 0.15, FYR.table.y + 0.01, FYR.table.z + 0.1); this.nest.rotation.set(0, 1.2, 0); this.nest.scale.setScalar(0.75);
    }
    // the magpie
    const B = job && job.bird;
    const sitting = !job && !m.nestGone;     // (never seen: the lantern is shut before the quest)
    if ((B && B.state !== 'gone') || sitting) {
      const o = this.bird, st = B ? B.state : 'preen';
      o.visible = true;
      o.position.set(B ? B.x : FYR.nest.x, (B ? B.y : FYR.nest.y) + 0.02, B ? B.z : FYR.nest.z);
      const flying = st === 'dive' || st === 'back' || st === 'flee';
      const pitch = flying ? 0.2 : st === 'preen' ? 0.45 + Math.max(0, Math.sin(game.time * 6)) * 0.25 : -0.18;
      o.rotation.set(pitch, B ? B.h : 0, st === 'preen' ? Math.sin(game.time * 3) * 0.12 : 0);
      const flap = flying ? Math.sin(game.time * 24) * 0.9 : st === 'preen' ? -1.2 + Math.max(0, Math.sin(game.time * 7)) * 0.4 : st === 'watch' ? -0.9 : -1.3;
      this.wings[0].rotation.z = -flap; this.wings[1].rotation.z = flap;
      if (st === 'watch' || st === 'look') {
        this.bang.visible = true;
        this.bang.position.set(o.position.x, o.position.y + 1.15 + (st === 'watch' ? Math.sin(game.time * 10) * 0.03 : 0), o.position.z);
        this.bang.material.opacity = st === 'watch' ? 1 : 0.45;
      }
    }
  }
}
