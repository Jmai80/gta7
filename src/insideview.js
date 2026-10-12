// (v1.13) What moves in the two new insides, drawn for render.js: the pizzas in Pizzeria Sjuan's kitchen
// ("Fredagsrusningen": in your hands, in the oven, on the pass, in Sanna's and Pino's hands, on the
// tables) and the mice in the windmill ("Möss i kvarnen": seven of them, the plugs in their holes, the
// crate you carry out). The simulation is in kitchen.js and mice.js; this only looks at it.
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
import { M } from './layout.js';
import { TOPPINGS, PIZZA_ROOM as PR } from './pizzeria.js';
import { RUSH } from './kitchen.js';
import { MILL_ROOM as MR, HOLES } from './millroom.js';

const FABRIC = M.FABRIC;
const TOP_IDS = TOPPINGS.map((t) => t.id);

// a pizza, 40 cm across, its centre at the origin: three bases (raw, baked, burnt) and five toppings
function pizzaParts() {
  const base = (crust, sauce, cheese, spots) => {
    const B = new GeomBuilder();
    B.cyl(0, 0, 0, 0.026, 0.2, 0.19, 18, crust, 0, true);
    B.cyl(0, 0, 0.026, 0.029, 0.172, 0.172, 18, sauce, 0, true);
    B.cyl(0, 0, 0.029, 0.032, 0.155, 0.152, 18, cheese, 0, true);
    if (spots) for (let k = 0; k < 9; k++) { const a = k * 2.3, r = 0.03 + (k % 4) * 0.03; B.cyl(Math.cos(a) * r, Math.sin(a) * r, 0.032, 0.0335, 0.022, 0.018, 6, spots, 0, true); }
    return B;
  };
  const parts = {
    raw: base(0xeedcae, 0xd0402e, 0xf6e7a8, null),
    baked: base(0xd9963e, 0xb83a26, 0xf2c650, 0xc8803a),
    burnt: base(0x2a1d16, 0x3a1810, 0x4a3a24, 0x1a1210),
  };
  for (const t of TOPPINGS) {
    const B = new GeomBuilder();
    for (let k = 0; k < 8; k++) {
      const a = k * 2.39 + TOP_IDS.indexOf(t.id) * 0.7, r = 0.04 + ((k * 3) % 8) * 0.014, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (t.id === 'skinka') B.rbox(x, 0.032, z, 0.05, 0.005, 0.045, a, t.c);
      else if (t.id === 'svamp') { B.cyl(x, z, 0.032, 0.04, 0.022, 0.012, 8, t.c, 0, true); B.rbox(x, 0.032, z, 0.012, 0.006, 0.02, a, 0xb9a98a); }
      else if (t.id === 'ananas') B.rbox(x, 0.032, z, 0.03, 0.014, 0.022, a, t.c);
      else if (t.id === 'rakor') B.ico(x, 0.039, z, 0.016, 0.6, t.c);
      else B.rbox(x, 0.032, z, 0.055, 0.009, 0.016, a, t.c);
    }
    parts[t.id] = B;
  }
  return Object.fromEntries(Object.entries(parts).map(([k, B]) => [k, B.toGeometry(THREE)]));
}

function mouseGeo(white) {
  const B = new GeomBuilder(), c = white ? 0xf4f2ee : 0x8a837c, ear = white ? 0xf2b8c0 : 0xb08a86;
  B.ico(0, 0.045, -0.02, 0.05, 0.85, c, FABRIC);           // the body (local: +z forward)
  B.ico(0, 0.04, 0.035, 0.04, 0.85, c, FABRIC);
  B.ico(0, 0.04, 0.075, 0.026, 0.9, c, FABRIC);            // the head
  B.ico(0, 0.036, 0.1, 0.008, 1, 0x2a1d1d);                 // the nose
  for (const s of [-1, 1]) { B.ico(s * 0.022, 0.07, 0.065, 0.015, 1.1, ear); B.ico(s * 0.014, 0.05, 0.088, 0.004, 1, 0x101010); }
  B.tube([0, 0.025, -0.065], [0.02, 0.012, -0.13], 0.005, 0.003, 4, white ? 0xf0b8b8 : 0x9a7c76);
  B.tube([0.02, 0.012, -0.13], [-0.01, 0.006, -0.19], 0.003, 0.002, 4, white ? 0xf0b8b8 : 0x9a7c76);
  if (white) B.cyl(0, 0.05, 0.052, 0.058, 0.03, 0.03, 8, 0xd2342c, 0, false);
  return B.toGeometry(THREE);
}

export class InsideProps {
  constructor(scene, mat) {
    this.scene = scene;
    const P = pizzaParts();
    this.rigs = [];
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group(), parts = {};
      for (const [k, geo] of Object.entries(P)) { const o = new THREE.Mesh(geo, mat); parts[k] = o; g.add(o); }
      g.visible = false; g.userData.parts = parts;
      scene.add(g); this.rigs.push(g);
    }
    this.mice = [];
    const grey = mouseGeo(false), white = mouseGeo(true);
    for (let i = 0; i < MR.start.length; i++) { const o = new THREE.Mesh(i === MR.start.length - 1 ? white : grey, mat); o.rotation.order = 'YXZ'; o.scale.setScalar(1.5); o.visible = false; scene.add(o); this.mice.push(o); }
    // a wooden plug for each hole
    const G = new GeomBuilder();
    G.box(-0.12, 0, -0.04, 0.12, 0.17, 0.04, 0xb98a5a, M.PLANKS, { skipBottom: false });
    G.box(-0.08, 0.06, 0.04, 0.08, 0.1, 0.07, 0x8a6440);
    const plugGeo = G.toGeometry(THREE);
    this.plugs = HOLES.map((H) => { const o = new THREE.Mesh(plugGeo, mat); o.position.set(H.wx + H.n[0] * 0.04, MR.y, H.wz + H.n[1] * 0.04); o.rotation.y = Math.atan2(H.n[0], H.n[1]); o.visible = false; scene.add(o); return o; });
    // the crate you carry out (air holes, a lid)
    const C = new GeomBuilder();
    C.box(-0.3, -0.18, -0.24, 0.3, 0.16, 0.24, 0xb98a5a, M.PLANKS, { skipBottom: false });
    C.box(-0.32, 0.16, -0.26, 0.32, 0.2, 0.26, 0xa8794a, M.PLANKS, { skipBottom: false });
    for (let k = 0; k < 4; k++) C.box(-0.2 + k * 0.13, 0.04, 0.24, -0.16 + k * 0.13, 0.08, 0.245, 0x2a1d16);
    this.crate = new THREE.Mesh(C.toGeometry(THREE), mat);
    this.crate.visible = false; scene.add(this.crate);
  }

  setPizza(rig, top, state) {
    const P = rig.userData.parts;
    rig.visible = true;
    P.raw.visible = state === 'raw'; P.baked.visible = state === 'baked'; P.burnt.visible = state === 'burnt';
    for (const id of TOP_IDS) P[id].visible = top.includes(id) && state !== 'burnt';
  }

  sync(game, indoor) {
    for (const r of this.rigs) r.visible = false;
    for (const o of this.mice) o.visible = false;
    for (const o of this.plugs) o.visible = false;
    this.crate.visible = false;
    const m = game.mission, ind = game.indoors, p = game.player, job = m && m.active;
    const hold = (o, who, fwd, up, side = 0) => { const c = Math.cos(who.h), s = Math.sin(who.h); o.position.set(who.x + s * fwd + c * side, who.y + up, who.z + c * fwd - s * side); o.rotation.set(0, who.h, 0); };
    // ---- the pizzeria kitchen
    const K = job && job.id === 'fredag' ? job : m.pizzaLeft;
    if (indoor && ind.where === 'pizza' && K) {
      let n = 0;
      const next = () => this.rigs[n++];
      const bake = (t) => (t >= RUSH.burnt ? 'burnt' : t >= RUSH.ready ? 'baked' : 'raw');
      if (K.hand && (p.state === 'foot')) { const r = next(); this.setPizza(r, K.hand.top, bake(K.hand.t)); hold(r, p, 0.12, 1.62, -0.3); }
      K.oven.forEach((s, i) => { if (!s) return; const r = next(), S = PR.slots[i]; this.setPizza(r, s.top, bake(s.t)); r.position.set(S.x, S.y, S.z); r.rotation.set(0, 0, 0); });
      if (K.carried && K.carried.top && K.sanna) { const r = next(); this.setPizza(r, K.carried.top, 'baked'); hold(r, K.sanna, 0.12, 1.58, -0.3); }
      if (K.pinoPizza) {
        const r = next(), P = K.pino;
        this.setPizza(r, K.pinoPizza, 'baked');
        if (K.stage === 'end' && P && P.arrived) hold(r, P, 0.12, 1.66, -0.32);
        else { r.position.set(PR.shelf.x, PR.shelf.y, PR.shelf.z); r.rotation.set(0, 0, 0); }
      }
      const at = {};
      for (const t of K.tablePizzas) {
        const T = PR.tables.find((q) => q.id === t.table), k = at[t.table] = (at[t.table] || 0) + 1, r = next();
        if (!T || !r) continue;
        this.setPizza(r, t.top, 'baked');
        r.position.set(T.x + (k === 1 ? -0.12 : 0.14), PR.y + 0.755, T.z + (k === 1 ? -0.1 : 0.12)); r.rotation.set(0, k, 0);
      }
    }
    // ---- the mill
    const J = job && job.id === 'moss' ? job : null;
    if (indoor && ind.where === 'mill') {
      const done = m.done.has('moss');
      if (J) J.holes.forEach((h, i) => { this.plugs[i].visible = h.plugged; });
      else if (done) for (const o of this.plugs) o.visible = true;
      if (J) J.mice.forEach((q, i) => {
        const o = this.mice[i];
        if (!o || q.state === 'caught' || q.state === 'hole') return;
        o.visible = true;
        const bob = q.run > 0.1 ? Math.abs(Math.sin(game.time * 28 + i)) * 0.012 : 0;
        o.position.set(q.x, MR.y + bob, q.z);
        o.rotation.set(q.state === 'freeze' ? -0.18 : 0, q.h, 0); // sniffing: nose up
      });
    }
    if (J && J.carry === 'crate' && p.state === 'foot') { this.crate.visible = true; hold(this.crate, p, 0.48, 0.98); }
  }
}
