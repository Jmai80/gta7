// Easter eggs (v1.8): eight secrets hidden round Sjuby, Norrholmen and Söderholmen. Not quests – you just
// stumble on them (or follow the riddles of the phone box that rings by the harbour). Each one found is
// kept in the save (stats.secrets). Some may turn out to matter to the story later.
//   skate    a skateboard left on the football pitch – ride it (the horn button jumps)
//   phone    a phone box on the harbour promenade that rings when you come near: a voice with riddles
//   ducks    rubber ducks in the park pond, one with a crown
//   heart    "A + G 1971" carved in an oak in the park (Arne and Gun)
//   goldbun  a golden Sjubybulle among the spruces on Norrholmen ((v1.14) the trophy Dahlgren stole in 1985)
//   gnome    a garden gnome by the allotments' car park – "Tillhör Dahlgren" ((v1.14) hollow: the trophy's foot)
//   bottle   a message in a bottle on Söderholmen's south cliffs
//   monster  Sjubyodjuret: humps in the harbour that rise now and then – sit at the end of the pier
// The props are layout prims (secretsInto, called last in createLayout); the sea monster and the ducks
// move, so render.js draws them from monsterRise(t) and duckAt(i, t).
import { CURB_H, WATER_Y, PIER_BENCH } from './config.js';

export const SECRETS = [
  { id: 'skate', name: 'Skateboarden', x: -27.5, z: 99, h: 0.4,
    hint: 'Någon har glömt något på fotbollsplanen. Det har fyra hjul men är ingen bil.',
    text: 'Någon har glömt sin skateboard på fotbollsplanen. Den är din nu – knappen HOPPA gör en ollie!' },
  { id: 'phone', name: 'Telefonkiosken', x: -114.5, z: -139.6, r: 1.7,
    text: 'En röst i telefonen som verkar veta allt om Sjuby. Den ringer igen när du kommer tillbaka.' },
  { id: 'ducks', name: 'Gummiankorna', x: 96, z: -85.6, r: 2.2,
    hint: 'Kvack. Räkna dem i parkens damm. Den största bär krona.',
    text: 'Fem gula gummiankor guppar i parkens damm. Den största har en liten guldkrona. Vem har satt ut dem?' },
  { id: 'heart', name: 'Hjärtat i stubben', x: 70, z: -58.7, r: 1.5,
    hint: 'Två bokstäver i en gammal ekstubbe i parken. Ett hjärta från 1971.',
    text: 'Någon har ristat ett hjärta i den gamla ekstubben: "A + G 1971". Arne och Gun?' },
  { id: 'goldbun', name: 'Den gyllene bullen', x: 79, z: -359, r: 1.8,
    hint: 'Bland granarna nära fyren lyser något som guld.',
    text: 'En kanelbulle av guld på en mossig sten mitt bland granarna. Den är kall och tung. Vem har gjort den – och varför?' },
  { id: 'gnome', name: 'Trädgårdstomten', x: 31.2, z: -330.5, r: 1.6,
    hint: 'Han fiskar inte, han vaktar. Vid kolonilotternas parkering.',
    text: 'En trädgårdstomte med fiskespö, men det finns inget vatten här. Under den står det: "Tillhör Dahlgren".' },
  { id: 'bottle', name: 'Flaskposten', x: -40, z: 286.4, r: 1.6,
    hint: 'Havet har lämnat ett brev på Söderholmens södra klippor.',
    text: 'En flaska med ett brev: "Den som hittar det här – titta under fyrens trappa. /I. 1974". Ingvar?' },
  { id: 'monster', name: 'Sjubyodjuret', x: PIER_BENCH.x, z: PIER_BENCH.z + 1.2, r: 3.0,
    hint: 'Sitt längst ut på bryggan i hamnen. Vänta. Titta ut över vattnet.',
    text: 'Där ute! Något stort och grönt med pucklar … och så var det borta. Sjubyodjuret finns!' },
];
export const SECRET_COUNT = SECRETS.length;
const BY = Object.fromEntries(SECRETS.map((s) => [s.id, s]));

// the sea monster out in the harbour, north of the pier: up out of the water for a while every 75 s
export const MONSTER = { x: -73, z: -193, period: 75 };
export function monsterRise(t) {
  const u = ((t % MONSTER.period) + MONSTER.period) % MONSTER.period / MONSTER.period;   // 0..1 through one round
  if (u < 0.55) return 0;
  const k = (u - 0.55) / 0.45;                         // up, a while above water, down again
  return Math.min(1, Math.sin(k * Math.PI) * 1.6);
}

// (v1.8.1) the rubber ducks: the crowned one leads the others round the pond in a line, bobbing
export const POND = { x: 96, z: -95, r: 7.9, y: CURB_H + 0.12 };
export const DUCKS = [
  { s: 1.9, crown: true }, { s: 1.0 }, { s: 1.0, shades: true }, { s: 0.95 }, { s: 0.9 },
];
export function duckAt(i, t) {
  const lead = t * 0.11, a = lead - (i === 0 ? 0 : 0.42 + (i - 1) * 0.3);
  const r = 4.4 + Math.sin(t * 0.23 + i * 1.7) * 0.35;
  const x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r;
  // swimming anticlockwise (seen from above): the heading is along the circle
  return { x, z, y: POND.y + Math.sin(t * 2.1 + i * 1.3) * 0.018, h: Math.atan2(-Math.sin(a), Math.cos(a)), tilt: Math.sin(t * 1.7 + i) * 0.05 };
}

// (v1.14) how far up the monster is right now: on its own clock – or, while Nova's camera is out ("Odjurets bild"),
// wherever the job has put it (game.monsterPose; a log is not the monster)
export function monsterUp(g) {
  const P = g.monsterPose;
  if (P !== undefined) return P && P.kind === 'odjur' ? P.up : 0;
  return monsterRise(g.time);
}

export function found(g) { return Array.isArray(g.stats.secrets) ? g.stats.secrets : (g.stats.secrets = []); }

export class Secrets {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game;
    this.prompt = null; this.near = null;
    this.ringT = 0;
  }

  has(id) { return found(this.game).includes(id); }

  find(id, extra = '') {
    const g = this.game, F = found(g);
    if (F.includes(id)) return false;
    F.push(id);
    const s = BY[id];
    g.emit('secret', { id, n: F.length, of: SECRET_COUNT });
    g.emit('banner', { title: 'HEMLIGHET!', sub: `${s.name} · ${F.length} av ${SECRET_COUNT}`, kind: 'secret' });
    if (s.text && !extra) this.mgr.later(1.6, () => g.emit('toast', { text: s.text, long: true }));
    g.emit('progress', {});
    return true;
  }

  update(dt) {
    const g = this.game, p = g.player, m = this.mgr;
    this.prompt = null; this.near = null;
    // the skateboard: put on the pitch out of sight, and found the first time you ride it
    const S = BY.skate, sk = g.skate;
    if ((!sk || sk.removed) && !g.indoor && Math.hypot(p.x - S.x, p.z - S.z) < 160 && Math.hypot(p.x - S.x, p.z - S.z) > 35) g.spawnSkate(S.x, S.z, S.h);
    if (p.inCar && p.car.spec.skate) { if (!this.has('skate')) this.find('skate'); return; }
    if (p.state !== 'foot' || p.frozen || g.indoor) return;
    // the phone box rings when you come near (again and again until you answer, and after a while again)
    const P = BY.phone, dp = Math.hypot(p.x - P.x, p.z - P.z);
    this.ringing = dp < 30 && g.time >= (this.quietUntil || 0) && !(m.active && m.active.holdsPhone); // ((v1.11) Ingvar's call in the treasure hunt)
    if (this.ringing && (this.ringT -= dt) <= 0) { this.ringT = 2.6; g.emit('ring', { x: P.x, z: P.z }); if (!this.toldRing) { this.toldRing = true; g.emit('toast', { text: 'Det ringer i telefonkiosken på kajen …' }); } }
    if (this.ringing && dp < P.r) { this.prompt = 'SVARA'; this.near = P; return; }
    // the sea monster: seen from the end of the pier while it is up
    const Mo = BY.monster;
    if (!this.has('monster') && Math.hypot(p.x - Mo.x, p.z - Mo.z) < Mo.r && monsterUp(g) > 0.6) this.find('monster');
    for (const s of SECRETS) {
      if (s.id === 'skate' || s.id === 'phone' || s.id === 'monster' || this.has(s.id)) continue;
      if (s.id === 'goldbun' && m.goldbunGone) continue;   // ((v1.14) not on its stone: a magpie, or the konditori's shelf)
      if (Math.hypot(p.x - s.x, p.z - s.z) < s.r) { this.prompt = 'UNDERSÖK'; this.near = s; return; }
    }
    void m;
  }

  interact() {
    const g = this.game, s = this.near;
    if (!this.prompt || !s) return false;
    if (s.id === 'phone') { this.answer(); return true; }
    this.find(s.id);
    return true;
  }

  // the voice in the phone: a riddle about a secret you have not found yet
  answer() {
    const g = this.game, F = found(g);
    this.quietUntil = g.time + 150;
    this.ringing = false;
    const first = !F.includes('phone');
    const left = SECRETS.filter((s) => s.hint && !F.includes(s.id));
    const pick = left.length ? left[(this.calls = (this.calls || 0) + 1) % left.length] : null;
    const V = { who: 'Rösten i telefonen', letter: '?', color: '#5a5f6b' };
    const pages = [{ ...V, text: first ? '…Hallå? Äntligen. Jag har väntat på dig. Fråga inte vem jag är.' : '…Det är jag igen.' }];
    if (first) pages.push({ ...V, text: `Det finns ${SECRET_COUNT} hemligheter i Sjuby och på öarna. Du har just hittat en av dem.` });
    pages.push(pick ? { ...V, text: `Lyssna noga: ${pick.hint}`, last: 'LÄGG PÅ' } : { ...V, text: 'Du har hittat allt. Nästan allt. Vi hörs.', last: 'LÄGG PÅ' });
    g.emit('talk', { id: 'secret-phone', pages });
    if (first) this.mgr.later(0.2, () => this.find('phone', 'quiet'));
  }
}

// ---------------------------------------------------------------- the props (layout)
// H: the helpers of createLayout. No random numbers here (and it comes last anyway).
export function secretsInto(H) {
  const { P, box, solid, sign, colCircle, colBox, M } = H;
  const tube = (a, b, r, c, m = 0, n = 6) => P({ t: 'tube', a, b, r, c, m, n });
  const Y = CURB_H;

  // the phone box on the harbour promenade: red frame, glass, a yellow TELEFON sign on top
  {
    const s = BY.phone, x = s.x, z = s.z - 1.0, w = 0.55;
    for (const [dx, dz] of [[-w, -w], [w, -w], [-w, w], [w, w]]) box(x + dx - 0.05, Y, z + dz - 0.05, x + dx + 0.05, Y + 2.3, z + dz + 0.05, 0xc0302a);
    box(x - w - 0.08, Y + 2.3, z - w - 0.08, x + w + 0.08, Y + 2.48, z + w + 0.08, 0xc0302a);
    box(x - w, Y, z - w, x + w, Y + 0.08, z + w, 0x6f6a62);
    for (const [x0, z0, x1, z1] of [[-w, -w, w, -w + 0.03], [-w, -w, -w + 0.03, w], [w - 0.03, -w, w, w]]) box(x + x0, Y + 0.3, z + z0, x + x1, Y + 2.25, z + z1, 0xbcd4dc, M.GLASS);
    box(x - 0.18, Y + 1.2, z - w + 0.04, x + 0.18, Y + 1.7, z - w + 0.14, 0x2d3238);   // the phone
    box(x - 0.06, Y + 1.38, z - w + 0.14, x + 0.06, Y + 1.62, z - w + 0.2, 0x1d1f22);
    sign('telefon', { lines: ['TELEFON'], bg: '#f2c21b', fg: '#1f5aa6', font: 0.7 }, x, Y + 2.39, z + w + 0.1, 1.1, 0.22, 0);
    colBox(x - w - 0.06, z - w - 0.06, x + w + 0.06, z - w + 0.06, 2.5);
    colBox(x - w - 0.06, z - w, x - w + 0.06, z + w, 2.5); colBox(x + w - 0.06, z - w, x + w + 0.06, z + w, 2.5);
    H.casters.push({ t: 'box', x0: x - w, y0: Y, z0: z - w, x1: x + w, y1: Y + 2.5, z1: z + w });
  }

  // (the rubber ducks swim: render.js builds them and moves them with duckAt)

  // an old oak stump in the park with a heart carved in its side
  {
    const x = 70, z = -60;
    P({ t: 'cyl', x, z, y0: CURB_H - 0.05, y1: CURB_H + 0.75, r: 0.62, r1: 0.52, n: 10, c: 0x5d4330, cap: true });
    P({ t: 'cyl', x, z, y0: CURB_H + 0.74, y1: CURB_H + 0.78, r: 0.47, n: 10, c: 0xc49a6a, cap: true });
    for (const a of [0.4, 2.2, 3.9, 5.2]) P({ t: 'cyl', x: x + Math.cos(a) * 0.55, z: z + Math.sin(a) * 0.55, y0: CURB_H - 0.05, y1: CURB_H + 0.22, r: 0.2, r1: 0.06, n: 5, c: 0x4a3626 });
    sign('hjarta', { kind: 'carving', ppm: 300 }, x, CURB_H + 0.42, z + 0.585, 0.46, 0.46, 0);   // ((v1.11) read up close: a code)
    colCircle(x, z, 0.62, 0.8);
  }

  // the mossy stone among the spruces. (v1.14) The golden bun on it is drawn by render.js (goldview.js): a
  // magpie takes it in "Den gyllene bullen", and it ends up on the konditori's shelf.
  {
    const s = BY.goldbun, x = s.x, z = s.z - 0.9;
    P({ t: 'ico', x, y: CURB_H + 0.12, z, r: 0.6, sy: 0.55, c: 0x5f7a4a });
    colCircle(x, z, 0.55, 0.6);
  }

  // the gnome by the allotments' car park, with a fishing rod and no water. (v1.14.2) Made properly: boots,
  // brown breeches, a blue coat with a belt and a brass buckle, mittens round the rod, a round face with a red
  // nose, rosy cheeks and eyes, a big white beard and moustache, a tall red cap that flops over at the tip, a
  // rod with a reel, a line and a red-and-white float lying in the gravel – and an empty bucket beside him.
  // (He is hollow: in "Den gyllene bullen" the trophy's foot is inside.)
  {
    const s = BY.gnome, gx = s.x - 0.9, gz = s.z, S = 1.3, Y0 = CURB_H;
    // local → world: f forward (towards +x, where the rod points), u up, w sideways (+z)
    const L = (f, u, w = 0) => [gx + f * S, Y0 + u * S, gz + w * S];
    const ico = (f, u, w, r, sy, c) => { const [x, y, z] = L(f, u, w); P({ t: 'ico', x, y, z, r: r * S, sy, c }); };
    const cyl = (f, w, u0, u1, r0, r1, c, n = 10, cap = true, m = 0) => { const [x, , z] = L(f, 0, w); P({ t: 'cyl', x, z, y0: Y0 + u0 * S, y1: Y0 + u1 * S, r: r0 * S, r1: r1 * S, n, c, m, cap }); };
    const tb = (a, b2, r0, r1, c, n = 6, m = 0) => P({ t: 'tube', a: L(...a), b: L(...b2), r: r0 * S, r1: r1 * S, n, c, m });
    const SKIN = 0xf0c8a8, BLUE = 0x2c62a8, RED = 0xd2342c, WHITE = 0xf6f3ec, BROWN = 0x6b4426;
    cyl(0, 0, 0, 0.05, 0.24, 0.22, 0x7f7a72, 12);                                   // a round stone to stand on
    for (const w of [-0.07, 0.07]) { ico(0.03, 0.085, w, 0.06, 0.65, 0x3a2418); cyl(0, w, 0.08, 0.17, 0.05, 0.055, BROWN, 8, false); } // boots, breeches
    cyl(0, 0, 0.15, 0.2, 0.17, 0.165, BLUE, 14, false);                              // the coat's hem …
    cyl(0, 0, 0.2, 0.4, 0.165, 0.12, BLUE, 14, true);                                // … and the coat
    cyl(0, 0, 0.255, 0.285, 0.155, 0.15, 0x2a2420, 14, false);                       // the belt
    { const [x, y, z] = L(0.15, 0.27, 0); P({ t: 'box', x0: x - 0.012 * S, y0: y - 0.03 * S, z0: z - 0.035 * S, x1: x + 0.015 * S, y1: y + 0.03 * S, z1: z + 0.035 * S, c: 0xd8b45a, m: M.CHROME }); }
    for (const w of [-0.12, 0.12]) tb([0.0, 0.37, w], [0.15, 0.3, w * 0.35], 0.045, 0.038, BLUE);   // arms, round the rod
    ico(0.16, 0.3, -0.035, 0.042, 1, 0x3d7a5a); ico(0.16, 0.3, 0.035, 0.042, 1, 0x3d7a5a);          // green mittens
    ico(0, 0.48, 0, 0.115, 1.0, SKIN);                                              // the head
    ico(0.075, 0.37, 0, 0.115, 1.25, WHITE); ico(0.1, 0.29, 0, 0.075, 1.2, WHITE);   // the beard, down over the belt
    for (const w of [-0.04, 0.04]) ico(0.1, 0.445, w, 0.038, 0.7, WHITE);           // the moustache
    ico(0.112, 0.47, 0, 0.034, 1, 0xe0705e);                                        // a red nose
    for (const w of [-0.06, 0.06]) { ico(0.085, 0.47, w, 0.026, 0.8, 0xf2a0a0); ico(0.098, 0.505, w * 0.65, 0.013, 1, 0x1d1f22); ico(0.093, 0.53, w * 0.7, 0.016, 0.45, WHITE); } // cheeks, eyes, brows
    cyl(0, 0, 0.53, 0.56, 0.125, 0.122, 0xb02a24, 14, false);                        // the cap's band …
    cyl(0, 0, 0.56, 0.78, 0.122, 0.05, RED, 14, false);                              // … the tall red cap …
    tb([0, 0.78, 0], [-0.07, 0.86, 0.02], 0.05, 0.03, RED, 8); tb([-0.07, 0.86, 0.02], [-0.16, 0.83, 0.03], 0.03, 0.012, RED, 8); // … flopping over
    ico(-0.17, 0.825, 0.03, 0.025, 1, WHITE);                                       // a little white bobble
    // the rod, the reel, the line and the float lying in the gravel
    tb([0.12, 0.27, 0], [0.8, 0.86, 0.06], 0.014, 0.007, 0x5a4430, 6);
    cyl(0.2, -0.04, 0.3, 0.33, 0.03, 0.03, 0x9aa0a6, 8, true, M.CHROME);
    tb([0.8, 0.86, 0.06], [0.86, 0.06, 0.1], 0.0035, 0.0035, 0xe8e2d0, 3);
    ico(0.86, 0.045, 0.1, 0.032, 1, RED); ico(0.86, 0.075, 0.1, 0.022, 0.8, WHITE);
    // an empty bucket for the catch, on its side
    { const [x, y, z] = L(0.12, 0.0, -0.32); P({ t: 'hcyl', x, y: y + 0.07 * S, z, len: 0.16 * S, r: 0.07 * S, axis: 'z', n: 10, c: 0x9aa0a6, m: M.CHROME }); }
    colCircle(gx, gz, 0.3, 0.9);
  }

  // the message in a bottle among the rocks on Söderholmen's south cliffs
  {
    const s = BY.bottle, x = s.x, z = s.z + 0.8;
    tube([x - 0.22, CURB_H + 0.08, z], [x + 0.16, CURB_H + 0.09, z + 0.05], 0.08, 0x2f7a4a, 0, 8);
    tube([x + 0.16, CURB_H + 0.09, z + 0.05], [x + 0.3, CURB_H + 0.095, z + 0.07], 0.032, 0x2f7a4a, 0, 6);
    box(x + 0.3, CURB_H + 0.065, z + 0.045, x + 0.35, CURB_H + 0.125, z + 0.095, 0x8a6440);
    box(x - 0.14, CURB_H + 0.14, z - 0.03, x + 0.08, CURB_H + 0.175, z + 0.08, 0xf2ead2);   // the letter, rolled up inside (seen through the neck)
    P({ t: 'ico', x: x + 0.05, y: CURB_H + 0.02, z: z - 0.35, r: 0.4, sy: 0.4, c: 0x8a837c });
  }
}
