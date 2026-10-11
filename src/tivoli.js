// Tivoli Lyckoland on Söderholmen (v1.6): the parts that move. The Ferris wheel's rotor turns as one
// mesh; its gondolas, the coaster's train and the bumper cars are each one merged mesh whose
// vertices are moved on the CPU every frame (a few hundred points each – one draw call per ride).
// Everything runs on the game's clock (game.time), the same clock rides.js uses for your seat in
// the wheel. The people riding are only drawn (render.js asks riders() for them).
import * as THREE from './three.js';
import { GeomBuilder } from './geom.js';
import { M } from './layout.js';
import { CURB_H } from './config.js';
import { WHEEL, CAROUSEL, COASTER, SOUTH, gondolaPivot, carouselAngle, wheelAngle, coasterCar, bumperCar } from './southisle.js';
import { makeBody } from './peds.js';

const WHITE = 0xf2efe6, RED = 0xd2342c, BLUE = 0x2c62a8, YELLOW = 0xf2c21b, DARK = 0x2d3238;
const GONDOLA_C = [RED, BLUE, YELLOW, 0x2fb35a, 0xe85d9a, 0xf28c28, 0x8e44ad, 0x2fb3a8];

// ---------------------------------------------------------------- shapes (local coordinates)
function rotorInto(B) {
  const R = WHEEL.r, n = WHEEL.n, N = 64;
  const P = (a, r, z) => [Math.sin(a) * r, -Math.cos(a) * r, z];
  for (const z of [-1.1, 1.1]) {
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      B.tube(P(a0, R, z), P(a1, R, z), 0.17, 0.17, 6, WHITE);
      B.tube(P(a0, R * 0.56, z), P(a1, R * 0.56, z), 0.1, 0.1, 5, WHITE);
      if (i % 2 === 0) { const b = P(a0 + Math.PI / N, R + 0.02, z); B.box(b[0] - 0.09, b[1] - 0.09, z - 0.09 + (z > 0 ? 0.12 : -0.12), b[0] + 0.09, b[1] + 0.09, z + 0.09 + (z > 0 ? 0.12 : -0.12), [0xffe08a, 0xff7a5c, 0x8ad2ff][i % 3], M.LIGHT); }
    }
    for (let k = 0; k < n * 2; k++) {
      const a = (k / (n * 2)) * Math.PI * 2;
      B.tube(P(a, 0.9, z * 1.4), P(a, R, z), 0.07, 0.07, 4, k % 2 ? 0xd8d4cc : WHITE);
    }
  }
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    B.tube(P(a, R, -1.1), P(a, R, 1.1), 0.1, 0.1, 5, DARK);                 // the gondola's axle
    B.tube(P(a, R * 0.56, -1.1), P(a + Math.PI / n, R, 1.1), 0.05, 0.05, 4, WHITE); // bracing between the rims
  }
  B.hcyl(0, 0, 0, 3.2, 1.0, 'z', 12, RED);
  B.hcyl(0, 0, 0, 3.3, 0.55, 'z', 10, YELLOW);
}

// a gondola: hangs from its axle at (0, 0, 0); open above the walls, a little roof, two benches
function gondolaInto(B, c) {
  const y0 = -WHEEL.hang, hx = 0.75, hz = 0.82;
  B.box(-hx, y0 - 0.1, -hz, hx, y0, hz, DARK, M.PLAIN, { skipBottom: false });
  for (const [x0, z0, x1, z1] of [[-hx, -hz, hx, -hz + 0.06], [-hx, hz - 0.06, hx, hz], [-hx, -hz, -hx + 0.06, hz], [hx - 0.06, -hz, hx, hz]]) B.box(x0, y0, z0, x1, y0 + 0.62, z1, c, M.PAINT);
  for (const s of [-1, 1]) {
    B.box(-hx + 0.08, y0 + 0.36, s * 0.42 - 0.17, hx - 0.08, y0 + 0.44, s * 0.42 + 0.17, WHITE);
    for (const x of [-hx, hx]) B.box(x - 0.03, y0, s * hz - 0.03, x + 0.03, -0.62, s * hz + 0.03, 0xd8d4cc);
  }
  B.box(-hx - 0.1, -0.64, -hz - 0.1, hx + 0.1, -0.56, hz + 0.1, c, M.PAINT, { skipBottom: false });
  B.cyl(0, 0, -0.56, -0.3, 0.75, 0.08, 8, WHITE);
  for (const z of [-0.5, 0.5]) B.tube([0, 0, z], [0, -0.5, z * 0.4], 0.04, 0.04, 4, DARK);
}

// a coaster car, facing +z, floor at y = 0 (the rails 0.35 below)
function coasterCarInto(B, front, c) {
  B.box(-0.62, 0, -1.0, 0.62, 0.5, 1.0, c, M.PAINT);
  B.box(-0.5, 0.12, -0.8, 0.5, 0.52, 0.55, 0x1d1f22);                         // the seat well
  B.box(-0.62, 0.5, 0.55, 0.62, 0.9, 1.0, c, M.PAINT);                        // the back in front of you
  B.box(-0.55, 0.12, -0.85, 0.55, 0.85, -0.7, 0x1d1f22);                      // the seat back
  for (const s of [-1, 1]) { B.box(s * 0.62 - 0.06, -0.3, -0.75, s * 0.62 + 0.06, 0, -0.45, DARK); B.box(s * 0.62 - 0.06, -0.3, 0.45, s * 0.62 + 0.06, 0, 0.75, DARK); }
  B.box(-0.45, 0.55, 0.2, 0.45, 0.62, 0.3, YELLOW);                            // the lap bar
  if (front) { B.box(-0.62, 0, 1.0, 0.62, 0.42, 1.55, c, M.PAINT); B.box(-0.5, 0.42, 1.05, 0.5, 0.48, 1.5, WHITE); B.box(-0.12, 0.12, 1.55, 0.12, 0.3, 1.6, 0xffe08a, M.LIGHT); }
}

// a bumper car, facing +z, on the floor at y = 0, with its pole up to the ceiling
function bumperInto(B, c) {
  B.box(-0.78, 0.05, -1.05, 0.78, 0.32, 1.05, 0x1d1f22);                     // the rubber ring
  B.box(-0.68, 0.32, -0.95, 0.68, 0.62, 0.95, c, M.PAINT);
  B.box(-0.55, 0.62, -0.6, 0.55, 0.66, 0.55, 0x1d1f22);                      // the seat
  B.box(-0.55, 0.62, -0.95, 0.55, 1.05, -0.6, c, M.PAINT);                    // the back
  B.box(-0.6, 0.62, 0.55, 0.6, 0.8, 0.95, c, M.PAINT);
  B.cyl(0, 0.35, 0.8, 1.0, 0.05, 0.05, 5, DARK);
  B.tube([0, 1.0, -0.85], [0, 4.45, -0.85], 0.04, 0.04, 4, 0x9aa0a6);
  B.box(-0.07, 4.4, -0.92, 0.07, 4.5, -0.78, 0xffe08a, M.LIGHT);
}

// the carousel's turning part: the platform, the column, the striped canopy and the horses
function carouselInto(B) {
  const r = CAROUSEL.r, y0 = 0.32;
  B.cyl(0, 0, y0, y0 + 0.22, r, r, 24, 0xc49a5a, M.PLANKS, true);
  B.cyl(0, 0, y0 + 0.22, 5.4, 1.15, 1.15, 12, 0xd9b23a);
  B.cyl(0, 0, 1.2, 4.6, 1.2, 1.2, 12, 0xf2efe6, M.CHROME);
  // the canopy: a cone in red and white stripes, a scalloped valance, a flag on top
  const N = 24, top = 7.4, eave = 5.5, R0 = r + 0.5;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    const c = i % 2 ? WHITE : RED;
    B.tri([0, top, 0], [Math.cos(a1) * R0, eave, Math.sin(a1) * R0], [Math.cos(a0) * R0, eave, Math.sin(a0) * R0], c, 0, undefined, undefined, undefined, [0, 1, 0]);
    B.tri([0, eave - 0.05, 0], [Math.cos(a0) * R0, eave, Math.sin(a0) * R0], [Math.cos(a1) * R0, eave, Math.sin(a1) * R0], 0xb8862f, 0, undefined, undefined, undefined, [0, -1, 0]);
    const am = (a0 + a1) / 2;
    B.quad([Math.cos(a0) * R0, eave, Math.sin(a0) * R0], [Math.cos(a1) * R0, eave, Math.sin(a1) * R0], [Math.cos(am) * R0, eave - 0.55, Math.sin(am) * R0], [Math.cos(am) * R0, eave - 0.55, Math.sin(am) * R0], i % 2 ? YELLOW : BLUE, 0, null, [Math.cos(am), 0, Math.sin(am)]);
    if (i % 2 === 0) B.box(Math.cos(am) * (R0 - 0.05) - 0.08, eave - 0.18, Math.sin(am) * (R0 - 0.05) - 0.08, Math.cos(am) * (R0 - 0.05) + 0.08, eave - 0.02, Math.sin(am) * (R0 - 0.05) + 0.08, 0xffe08a, M.LIGHT);
  }
  B.cyl(0, 0, top, top + 1.0, 0.04, 0.04, 4, DARK);
  B.box(0.04, top + 0.6, -0.02, 0.7, top + 0.98, 0.02, BLUE);
  // horses on poles in two rings (each facing the way the carousel turns)
  for (const [rr, n, ph] of [[5.5, 10, 0], [3.4, 6, 0.3]]) {
    for (let k = 0; k < n; k++) {
      const a = ph + (k / n) * Math.PI * 2, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const h = Math.atan2(z, -x), fx = Math.sin(h), fz = Math.cos(h);
      const lift = 0.95 + (k % 2) * 0.35;
      B.cyl(x, z, y0 + 0.22, eave, 0.035, 0.035, 5, 0xd9b23a, M.CHROME);
      const col = [WHITE, 0x7a4a2a, 0x2b2b2b, 0xd8c8a8][k % 4];
      const at = (f, u, side = 0) => [x + fx * f + fz * side, y0 + lift + u, z + fz * f - fx * side];
      B.rbox(x, y0 + lift + 0.15, z, 0.36, 0.42, 1.1, h, col);                                        // the body
      B.rbox(...at(0.55, 0.42), 0.26, 0.6, 0.3, h, col, 0, -0.5);                                     // the neck
      B.rbox(...at(0.78, 0.68), 0.22, 0.24, 0.48, h, col);                                            // the head
      B.rbox(...at(-0.05, 0.4), 0.4, 0.06, 0.5, h, RED);                                              // the saddle
      for (const [f, s] of [[0.38, 0.12], [0.38, -0.12], [-0.4, 0.12], [-0.4, -0.12]]) B.rbox(...at(f, -0.32, s), 0.09, 0.55, 0.1, h, col, 0, f > 0 ? -0.5 : 0.4);
      B.rbox(...at(-0.62, 0.18), 0.1, 0.42, 0.12, h, 0xd8c8a8, 0, 0.6);                              // the tail
    }
  }
  return { y0 };
}

// merge parts into one mesh and move each part's vertices every frame
class Movers {
  constructor(builders, material) {
    const B = new GeomBuilder();
    this.ranges = [];
    for (const fill of builders) { const a = B.pos.length / 3; fill(B); this.ranges.push([a, B.pos.length / 3]); }
    const geo = B.toGeometry(THREE);
    this.pos = geo.attributes.position; this.nrm = geo.attributes.normal;
    this.pos.setUsage(THREE.DynamicDrawUsage); this.nrm.setUsage(THREE.DynamicDrawUsage);
    this.base = Float32Array.from(this.pos.array); this.nbase = Float32Array.from(this.nrm.array);
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.frustumCulled = false;
  }
  // part i at (x, y, z), turned to heading h (+z forward), nose up by pitch
  set(i, x, y, z, h = 0, pitch = 0) {
    const [a, b] = this.ranges[i], P = this.pos.array, N = this.nrm.array, P0 = this.base, N0 = this.nbase;
    const ch = Math.cos(h), sh = Math.sin(h), cp = Math.cos(pitch), sp = Math.sin(pitch);
    for (let v = a * 3; v < b * 3; v += 3) {
      let px = P0[v], py = P0[v + 1] * cp + P0[v + 2] * sp, pz = -P0[v + 1] * sp + P0[v + 2] * cp;
      P[v] = x + px * ch + pz * sh; P[v + 1] = y + py; P[v + 2] = z - px * sh + pz * ch;
      px = N0[v]; py = N0[v + 1] * cp + N0[v + 2] * sp; pz = -N0[v + 1] * sp + N0[v + 2] * cp;
      N[v] = px * ch + pz * sh; N[v + 1] = py; N[v + 2] = -px * sh + pz * ch;
    }
  }
  commit() { this.pos.needsUpdate = true; this.nrm.needsUpdate = true; }
}

// ---------------------------------------------------------------- the people riding (only drawn)
const SKIN = [0xf0c8a8, 0xe8b996, 0xc68e62, 0x9c6b45, 0xf2d0b5];
const lk = (i, child = false) => ({
  shirt: [0xd2342c, 0x2c62a8, 0xf2c21b, 0x2fb35a, 0xe85d9a, 0xf4f1ea, 0x8e44ad, 0x24365e, 0xf28c28][(i * 5) % 9],
  pants: [0x24365e, 0x2b2e35, 0x5a6e8a, 0x7f8c8d, 0x1d1f22][(i * 3) % 5],
  skin: SKIN[(i * 7) % 5], hair: [0x2b1d14, 0x5a3a22, 0xd9b26b, 0x1a1a1a, 0x8a5a2b, 0xb0b0b0][(i * 11) % 6],
  style: [0, 1, 8, 16, 2, 0, 1, 4][(i * 3) % 8] & (child ? ~4 : ~0), height: child ? 0.66 + (i % 3) * 0.06 : 0.94 + (i % 4) * 0.035, bulk: child ? 0.9 : 0.95 + (i % 3) * 0.05,
  accent: [0x1d1f22, 0xd2342c, 0x2c62a8][i % 3],
});
const sit = (look) => Object.assign(makeBody(look), { pose: 5, headPitch: 0.05 });

export function buildTivoli(material) {
  const group = new THREE.Group();
  // the wheel's rotor, round its hub
  const RB = new GeomBuilder(); rotorInto(RB);
  const rotor = new THREE.Mesh(RB.toGeometry(THREE), material);
  rotor.position.set(WHEEL.x, WHEEL.hubY, WHEEL.z);
  group.add(rotor);
  const gondolas = new Movers(Array.from({ length: WHEEL.n }, (_, k) => (B) => gondolaInto(B, GONDOLA_C[k % GONDOLA_C.length])), material);
  group.add(gondolas.mesh);
  // the carousel
  const CB = new GeomBuilder(); carouselInto(CB);
  const carousel = new THREE.Mesh(CB.toGeometry(THREE), material);
  carousel.position.set(CAROUSEL.x, CURB_H, CAROUSEL.z);
  group.add(carousel);
  // the coaster's train and the bumper cars
  const train = new Movers(Array.from({ length: COASTER.cars }, (_, i) => (B) => coasterCarInto(B, i === 0, i % 2 ? YELLOW : RED)), material);
  group.add(train.mesh);
  const bumpers = new Movers(Array.from({ length: 6 }, (_, i) => (B) => bumperInto(B, [RED, BLUE, YELLOW, 0x2fb35a, 0xe85d9a, 0xf28c28][i])), material);
  group.add(bumpers.mesh);

  // riders: two in every fourth gondola, two in each coaster car, one in each bumper car, five on horses
  const wheelRiders = [], coasterRiders = [], bumperRiders = [], horseRiders = [];
  let n = 0;
  for (let k = 0; k < WHEEL.n; k++) if (k % 4 === 2) for (const s of [-1, 1]) wheelRiders.push({ k, s, body: sit(lk(n++)) });
  for (let i = 0; i < COASTER.cars; i++) for (const s of [-1, 1]) coasterRiders.push({ i, s, body: sit(lk(n++, (i + s) % 3 === 0)) });
  for (let i = 0; i < 6; i++) bumperRiders.push({ i, body: sit(lk(n++, i % 2 === 0)) });
  for (const k of [0, 3, 5, 8]) horseRiders.push({ k, ring: 0, body: sit(lk(n++, true)) });
  horseRiders.push({ k: 2, ring: 1, body: sit(lk(n++, true)) });
  const all = [...wheelRiders, ...coasterRiders, ...bumperRiders, ...horseRiders].map((r) => r.body);

  let near = false;
  const T = {
    group, rotor, carousel,
    get bodies() { return near ? all : []; },
    update(t, ct, cam) {   // t: the game's clock; ct: Måsen's own (it stops when it breaks down, v1.7)
      near = Math.hypot(cam.x - SOUTH.center.x, cam.z - SOUTH.center.z) < 330;
      group.visible = near;
      if (!near) return;
      rotor.rotation.z = wheelAngle(t);
      for (let k = 0; k < WHEEL.n; k++) { const p = gondolaPivot(k, t); gondolas.set(k, p.x, p.y, p.z); }
      gondolas.commit();
      const ca = carouselAngle(t);
      carousel.rotation.y = ca;
      const cars = [];
      for (let i = 0; i < COASTER.cars; i++) { const c = coasterCar(i, ct); cars.push(c); train.set(i, c.x, c.y, c.z, c.h, c.pitch); }
      train.commit();
      const bc = [];
      for (let i = 0; i < 6; i++) { const b = bumperCar(i, t); bc.push(b); bumpers.set(i, b.x, CURB_H + 0.1, b.z, b.h); }
      bumpers.commit();
      // the riders
      for (const r of wheelRiders) {
        const p = gondolaPivot(r.k, t), B = r.body, ht = B.look.height;
        B.x = p.x; B.z = p.z + r.s * 0.42; B.y = p.y - WHEEL.hang + 0.46 - 0.92 * ht; B.h = r.s > 0 ? Math.PI : 0;
      }
      for (const r of coasterRiders) {
        const c = cars[r.i], B = r.body, ch = Math.cos(c.h), sh = Math.sin(c.h);
        B.x = c.x + ch * r.s * 0.27 - sh * 0.15; B.z = c.z - sh * r.s * 0.27 - ch * 0.15; B.y = c.y + 0.5 - 0.92 * B.look.height; B.h = c.h; B.lean = -c.pitch;
        B.headPitch = -0.15;
      }
      for (const r of bumperRiders) {
        const b = bc[r.i], B = r.body;
        B.x = b.x - Math.sin(b.h) * 0.15; B.z = b.z - Math.cos(b.h) * 0.15; B.y = CURB_H + 0.1 + 0.68 - 0.92 * B.look.height; B.h = b.h;
      }
      for (const r of horseRiders) {
        const rr = r.ring ? 3.4 : 5.5, nn = r.ring ? 6 : 10, ph = r.ring ? 0.3 : 0;
        const a = ph + (r.k / nn) * Math.PI * 2, lx = Math.cos(a) * rr, lz = Math.sin(a) * rr, lift = 0.95 + (r.k % 2) * 0.35;
        const B = r.body, cs = Math.cos(ca), sn = Math.sin(ca);
        B.x = CAROUSEL.x + lx * cs + lz * sn; B.z = CAROUSEL.z - lx * sn + lz * cs;
        B.y = CURB_H + 0.32 + lift + 0.42 - 0.92 * B.look.height; B.h = Math.atan2(lz, -lx) + ca;
      }
    },
  };
  return T;
}
