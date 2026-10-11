// Easter eggs (v1.8): eight secrets hidden round Sjuby, Norrholmen and Söderholmen. Not quests – you just
// stumble on them (or follow the riddles of the phone box that rings by the harbour). Each one found is
// kept in the save (stats.secrets). Some may turn out to matter to the story later.
//   skate    a skateboard left on the football pitch – ride it (the horn button jumps)
//   phone    a phone box on the harbour promenade that rings when you come near: a voice with riddles
//   ducks    rubber ducks in the park pond, one with a crown
//   heart    "A + G 1971" carved in an oak in the park (Arne and Gun)
//   goldbun  a golden Sjubybulle among the spruces on Norrholmen
//   gnome    a garden gnome by the allotments' car park – "Tillhör Dahlgren"
//   bottle   a message in a bottle on Söderholmen's south cliffs
//   monster  Sjubyodjuret: humps in the harbour that rise now and then – sit at the end of the pier
// The props are layout prims (secretsInto, called last in createLayout); the sea monster moves, so
// render.js draws it from monsterRise(t).
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
    this.ringing = dp < 30 && g.time >= (this.quietUntil || 0);
    if (this.ringing && (this.ringT -= dt) <= 0) { this.ringT = 2.6; g.emit('ring', { x: P.x, z: P.z }); if (!this.toldRing) { this.toldRing = true; g.emit('toast', { text: 'Det ringer i telefonkiosken på kajen …' }); } }
    if (this.ringing && dp < P.r) { this.prompt = 'SVARA'; this.near = P; return; }
    // the sea monster: seen from the end of the pier while it is up
    const Mo = BY.monster;
    if (!this.has('monster') && Math.hypot(p.x - Mo.x, p.z - Mo.z) < Mo.r && monsterRise(g.time) > 0.6) this.find('monster');
    for (const s of SECRETS) {
      if (s.id === 'skate' || s.id === 'phone' || s.id === 'monster' || this.has(s.id)) continue;
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

  // the rubber ducks in the park pond (the big one has a crown)
  {
    const cx = 96, cz = -95, wy = CURB_H + 0.12;
    const duck = (x, z, h, s, crown) => {
      P({ t: 'ico', x, y: wy + 0.1 * s, z, r: 0.22 * s, sy: 0.7, c: 0xf2c21b });
      const fx = Math.sin(h), fz = Math.cos(h);
      P({ t: 'ico', x: x + fx * 0.14 * s, y: wy + 0.3 * s, z: z + fz * 0.14 * s, r: 0.12 * s, sy: 1, c: 0xf2c21b });
      P({ t: 'rbox', cx: x + fx * 0.26 * s, cy: wy + 0.28 * s, cz: z + fz * 0.26 * s, sx: 0.08 * s, sy: 0.04 * s, sz: 0.1 * s, rot: h, c: 0xf28c28 });
      if (crown) P({ t: 'cyl', x: x + fx * 0.14 * s, z: z + fz * 0.14 * s, y0: wy + 0.4 * s, y1: wy + 0.5 * s, r: 0.07 * s, r1: 0.09 * s, n: 6, c: 0xd9b23a, m: M.CHROME });
    };
    duck(cx + 1.2, cz + 3.4, 0.4, 1.9, true);
    for (const [dx, dz, h] of [[0.2, 4.6, 0.5], [-0.6, 5.5, 0.3], [-1.6, 6.0, 0.2], [-2.7, 6.2, 0.1]]) duck(cx + dx, cz + dz, h, 1.0, false);
  }

  // an old oak stump in the park with a heart carved in its side
  {
    const x = 70, z = -60;
    P({ t: 'cyl', x, z, y0: CURB_H - 0.05, y1: CURB_H + 0.75, r: 0.62, r1: 0.52, n: 10, c: 0x5d4330, cap: true });
    P({ t: 'cyl', x, z, y0: CURB_H + 0.74, y1: CURB_H + 0.78, r: 0.47, n: 10, c: 0xc49a6a, cap: true });
    for (const a of [0.4, 2.2, 3.9, 5.2]) P({ t: 'cyl', x: x + Math.cos(a) * 0.55, z: z + Math.sin(a) * 0.55, y0: CURB_H - 0.05, y1: CURB_H + 0.22, r: 0.2, r1: 0.06, n: 5, c: 0x4a3626 });
    sign('hjarta', { kind: 'carving' }, x, CURB_H + 0.42, z + 0.585, 0.46, 0.46, 0);
    colCircle(x, z, 0.62, 0.8);
  }

  // the golden bun on a mossy stone among the spruces
  {
    const s = BY.goldbun, x = s.x, z = s.z - 0.9;
    P({ t: 'ico', x, y: CURB_H + 0.12, z, r: 0.6, sy: 0.55, c: 0x5f7a4a });
    P({ t: 'ico', x, y: CURB_H + 0.5, z, r: 0.32, sy: 0.45, c: 0xd9a520, m: M.CHROME });
    P({ t: 'ico', x, y: CURB_H + 0.6, z, r: 0.2, sy: 0.4, c: 0xf2c21b, m: M.CHROME });
    for (let i = 0; i < 6; i++) { const a = i * 1.05; box(x + Math.cos(a) * 0.17 - 0.03, CURB_H + 0.62, z + Math.sin(a) * 0.17 - 0.03, x + Math.cos(a) * 0.17 + 0.03, CURB_H + 0.66, z + Math.sin(a) * 0.17 + 0.03, 0xfff4c0, M.LIGHT); }
    colCircle(x, z, 0.55, 0.6);
  }

  // the gnome by the allotments' car park, with a fishing rod and no water
  {
    const s = BY.gnome, x = s.x - 0.9, z = s.z, h = Math.PI / 2;
    P({ t: 'cyl', x, z, y0: CURB_H, y1: CURB_H + 0.08, r: 0.22, n: 8, c: 0x6f6a62, cap: true });
    P({ t: 'cyl', x, z, y0: CURB_H + 0.08, y1: CURB_H + 0.38, r: 0.17, r1: 0.14, n: 8, c: 0x2c62a8, cap: true });
    P({ t: 'ico', x, y: CURB_H + 0.45, z, r: 0.12, sy: 1, c: 0xf0c8a8 });
    P({ t: 'ico', x: x + 0.08, y: CURB_H + 0.37, z, r: 0.11, sy: 1.1, c: 0xf4f1ea });
    P({ t: 'cyl', x, z, y0: CURB_H + 0.52, y1: CURB_H + 0.85, r: 0.13, r1: 0.01, n: 8, c: 0xd2342c, cap: true });
    tube([x + 0.1, CURB_H + 0.3, z + 0.05], [x + 0.9, CURB_H + 0.95, z + 0.2], 0.012, 0x5a4430, 0, 4);
    tube([x + 0.9, CURB_H + 0.95, z + 0.2], [x + 0.95, CURB_H + 0.12, z + 0.22], 0.004, 0xe8e2d0, 0, 3);
    colCircle(x, z, 0.22, 0.9);
    void h;
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
