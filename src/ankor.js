// Side quest "Ankorna i dammen" (v1.14), from Hanna – Ebbe's mum, from "Var är Ebbe?". The rubber ducks in the
// park pond (the secret "Gummiankorna", v1.8) are Ebbe's favourite thing in Sjuby: he says good night to them
// every evening. Last night's storm blew four of them out of the pond, and only the big one with the crown –
// Kung Kvack – is left, swimming round on his own. Ebbe will not go to bed.
//   Pip         in the fountain on the square: lean over the edge and TA
//   Solbrillan  (the one with sunglasses) stuck in the brushes of the car wash at Macken: drive a car through
//               the wash, and out she comes
//   Kvacke      drifting about off the end of the pier in the harbour: HÅVA with the old net when he comes close
//   Lillan      Yasmin found her among the lemons at Hörnlivs: she waits outside the shop
// Any order. Carry them back to the pond and SLÄPP: they swim in line behind Kung Kvack again. The ones you
// have put back are kept in the save (stats.ankor.home); the ones in your pockets go back where you found
// them after a reload.
import { WHO, WATER_Y, CURB_H, CARWASH } from './config.js';
import { POND } from './secrets.js';
import { spawnPed, removePed } from './hideout.js';
import { YASMIN_LOOK } from './livs.js';
import { LOOKS } from './tivolijobs.js';
import { hidden } from './skattjakt.js';
import { fmt } from './rng.js';

export const ANKOR = {
  // Hanna and Ebbe on the path at the south edge of the pond; where you let the ducks go
  hanna: { x: 93.2, z: -85.2, h: Math.PI - 0.3 },
  ebbe: { x: 94.4, z: -85.9, h: Math.PI },
  mark: { x: 93.9, z: -84.0, r: 1.5 },
  release: { x: 96.6, z: -86.3, r: 1.7 },
  // the four that blew away (index into DUCKS: 1–4)
  ducks: [
    { i: 1, id: 'pip', name: 'Pip', where: 'Fontänen på torget', how: 'fountain' },
    { i: 2, id: 'sol', name: 'Solbrillan', where: 'Biltvätten vid Macken', how: 'wash' },
    { i: 3, id: 'kvacke', name: 'Kvacke', where: 'Hamnen, vid bryggans ände', how: 'net' },
    { i: 4, id: 'lillan', name: 'Lillan', where: 'Hörnlivs på Kungsgatan', how: 'yasmin' },
  ],
  wash: { x: 101, y: CURB_H + 2.35, z: -8.0, drop: { x: 107.6, z: -8.0 }, r: 1.6 },
  net: { cx: -74, cz: -174.4, end: { x: -73.6, z: -171.4, r: 1.7 }, reach: 2.4 },   // (beside the bench at the end, by the railing)
  yasmin: { x: -34.6, z: -6.0, h: -Math.PI / 2, r: 1.7 },
  pay: 900,
};
const BY_ID = Object.fromEntries(ANKOR.ducks.map((d) => [d.id, d]));
export const ANKOR_PAY = ANKOR.pay;

// where the fountain's duck floats: on the water, a little in from the rim on the side towards Hörnlivs' corner
function fountainDuck(g) {
  const F = g.layout.zones.fountain;
  return { x: F.x + 0.6 * 3.5, z: F.z + 0.8 * 3.5, y: CURB_H + 0.42, stand: { x: F.x + 0.6 * 5.05, z: F.z + 0.8 * 5.05 }, r: 2.1 };
}
// Kvacke drifting about off the pier's end, in and out of reach
export function kvackeAt(t) {
  const N = ANKOR.net;
  return { x: N.cx + Math.sin(t * 0.42) * 4.4, z: N.cz + Math.sin(t * 0.84 + 1) * 0.9, y: WATER_Y + 0.04, h: Math.cos(t * 0.42) > 0 ? Math.PI / 2 : -Math.PI / 2 };
}

const HANNA = { who: 'Hanna', letter: 'H', color: '#2fb3a8' };
const EBBE_T = { who: 'Ebbe', letter: 'E', color: '#2fb35a' };
const YASMIN = { who: 'Yasmin', letter: 'Y', color: '#ff6fae' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };

export function introPages(knew) {
  return [
    { ...EBBE_T, text: 'Kung Kvack är ENSAM! Titta! Han simmar runt runt och letar!' },
    { ...HANNA, text: 'Hej igen! Förlåt att jag stör. Ebbe säger godnatt till ankorna här varje kväll – och i natt blåste stormen bort fyra av dem.' },
    { ...EBBE_T, text: 'Pip, Solbrillan, Kvacke och Lillan. Kung Kvack är pappan.' },
    knew ? { ...YOU, text: 'Fem ankor, och den största med krona. Jag har räknat dem förut.' } : { ...YOU, text: 'Gummiankor? I parkdammen?' },
    { ...HANNA, text: 'Folk har hört av sig. Pip flöt i fontänen på torget i morse. Kim säger att det sitter en anka med solglasögon i biltvättens borstar.' },
    { ...HANNA, text: 'Någon har sett en flyta vid bryggan i hamnen. Och Yasmin på Hörnlivs har hittat en bland citronerna.' },
    { ...EBBE_T, text: 'Jag går inte och lägger mig förrän alla är hemma. ALDRIG.', last: 'JAG HÄMTAR DEM' },
  ];
}
export function yasminPages() {
  return [
    { ...YASMIN, text: 'Där är du! Den här låg bland citronerna i morse. Jag trodde att det var en väldigt konstig citron.' },
    { ...YASMIN, text: 'Den har kvackat hela förmiddagen. Eller så var det kylen. Ta den, ta den.', last: 'TACK, YASMIN' },
  ];
}
export function homePages() {
  return [
    { ...EBBE_T, text: 'ALLA ÄR HEMMA! Pip, Solbrillan, Kvacke, Lillan – och Kung Kvack!' },
    { ...EBBE_T, text: 'Godnatt, Kung Kvack. Godnatt, Pip. Godnatt, Solbrillan. Godnatt, Kvacke. Godnatt, Lillan.' },
    { ...HANNA, text: 'Fem godnatt. Nu kan vi gå hem och sova. Tack – du har räddat vår kväll. Igen.' },
    { ...EBBE_T, text: 'Du får vara ankornas farbror. Eller tant. Det bestämmer jag.' },
    { ...HANNA, text: `Här, ${fmt(ANKOR.pay)} kronor. Och en teckning som Ebbe har gjort – det är du, med fem ankor.`, last: 'GODNATT, EBBE' },
  ];
}

export function ankorSave(g) { return g.stats.ankor && typeof g.stats.ankor === 'object' ? g.stats.ankor : null; }
const homeOf = (g) => { const S = ankorSave(g); return S && Array.isArray(S.home) ? S.home : []; };

// Where each rubber duck is (render.js asks): null = swimming in the pond; 'hidden' = in your pockets;
// or a place out in the town. While the quest is open the four little ones are away – after they have
// gone missing out of sight (mgr.ducksOut).
export function duckPlace(mgr, i, t) {
  if (!mgr || i === 0 || !mgr.ducksOut || mgr.done.has('ankor')) return null;
  const g = mgr.game, d = ANKOR.ducks.find((q) => q.i === i);
  if (!d || homeOf(g).includes(d.id)) return null;
  const job = mgr.active && mgr.active.id === 'ankor' ? mgr.active : null;
  if (job && job.carried.includes(d.id)) return 'hidden';
  if (d.how === 'fountain') { const F = fountainDuck(g); return { x: F.x, y: F.y, z: F.z, h: 0.8 + Math.sin(t * 0.3) * 0.4, tilt: Math.sin(t * 1.9) * 0.06 }; }
  if (d.how === 'wash') {
    const W = ANKOR.wash, out = job && job.washed;
    if (out) return { x: W.drop.x, y: g.world.groundHeight(W.drop.x, W.drop.z) + 0.05, z: W.drop.z, h: -1.2, tilt: 0.25 };
    return { x: W.x, y: W.y, z: W.z, h: Math.PI / 2, tilt: 0.1 };
  }
  if (d.how === 'net') { const K = kvackeAt(t); return { ...K, tilt: Math.sin(t * 2.2) * 0.08 }; }
  if (d.how === 'yasmin') {
    const Y = mgr.ankorYasmin;
    if (Y) return { x: Y.x + Math.sin(Y.h) * 0.42, y: Y.y + 1.02, z: Y.z + Math.cos(Y.h) * 0.42, h: Y.h, tilt: 0 };
    return 'hidden';
  }
  return null;
}

// Hanna and Ebbe by the pond while the quest is open (and Yasmin outside her shop with Lillan) – put there,
// and taken away, out of sight. The ducks go missing out of sight too.
export function ankorWorld(mgr) {
  const g = mgr.game, A = ANKOR;
  const open = mgr.isOpen('ankor'), job = mgr.active && mgr.active.id === 'ankor' ? mgr.active : null;
  const c = mgr.jobs.find((q) => q.id === 'ankor');
  if (c) c.startOnAccept = !!(open && homeOf(g).length);     // (back after a reload: on with the ones still out)
  if (open && !mgr.ducksOut && (hidden(g, POND.x, POND.z) || mgr.t < 0.5 || homeOf(g).length)) mgr.ducksOut = true;
  if (!open && mgr.ducksOut && !job && mgr.done.has('ankor') && hidden(g, POND.x, POND.z)) mgr.ducksOut = false;
  const want = open && mgr.ducksOut;
  const alive = (q) => q && g.peds.list.includes(q);
  if (want && !g.indoor) {
    if (!alive(mgr.ankorHanna) && hidden(g, A.hanna.x, A.hanna.z)) mgr.ankorHanna = spawnPed(g, { ...LOOKS.hanna }, A.hanna.x, A.hanna.z, A.hanna.h, 'hanna');
    if (!alive(mgr.ankorEbbe) && hidden(g, A.ebbe.x, A.ebbe.z)) mgr.ankorEbbe = spawnPed(g, { ...LOOKS.ebbe }, A.ebbe.x, A.ebbe.z, A.ebbe.h, 'ebbe');
    const lillan = !homeOf(g).includes('lillan') && !(job && (job.carried.includes('lillan') || job.gotLillan));
    if (lillan && !alive(mgr.ankorYasmin) && hidden(g, A.yasmin.x, A.yasmin.z)) mgr.ankorYasmin = spawnPed(g, { ...YASMIN_LOOK }, A.yasmin.x, A.yasmin.z, A.yasmin.h, 'yasmin-out');
  }
  if (!want || g.indoor) {
    for (const k of ['ankorHanna', 'ankorEbbe']) { const q = mgr[k]; if (q && (hidden(g, q.x, q.z) || g.indoor) && !job) { removePed(g, q); mgr[k] = null; } }
  }
  const Y = mgr.ankorYasmin;
  if (Y && (!want || (job && job.gotLillan)) && hidden(g, Y.x, Y.z)) { removePed(g, Y); mgr.ankorYasmin = null; }
}

export class DucksJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'ankor';
    this.stage = 'intro';     // intro → find (⇄ yasminTalk) → home → done
    this.prompt = null;
    this.carried = [];        // ids in your pockets
    this.washed = false;      // Solbrillan is out of the brushes, on the ground by the car wash
    this.gotLillan = false;
  }

  get home() { return homeOf(this.game); }
  get left() { return ANKOR.ducks.filter((d) => !this.home.includes(d.id) && !this.carried.includes(d.id)); }

  start() {
    const g = this.game, m = this.mgr, p = g.player, H = m.ankorHanna, E = m.ankorEbbe;
    m.ducksOut = true;
    if (this.home.length) { // back after a reload: on with the ones that are still out
      this.stage = 'find';
      g.emit('toast', { text: `Ankorna i dammen fortsätter: ${this.home.length} av 4 är hemma.`, long: true });
      return;
    }
    p.frozen = true; p.vx = p.vz = 0;
    if (H) { p.h = Math.atan2(H.x - p.x, H.z - p.z); for (const q of [H, E]) if (q) { q.standH = q.h = q.body.h = Math.atan2(p.x - q.x, p.z - q.z); } }
    g.camFocus = { x: (ANKOR.hanna.x + ANKOR.ebbe.x) / 2 + 0.4, y: 0.7, z: ANKOR.hanna.z - 0.6, yaw: Math.PI - 0.5, owner: 'ankor', near: true, dist: 6.2, height: 2.8 };
    m.setObjective('Ankorna i dammen', 'Parkdammen');
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: introPages(!!(m.secrets && m.secrets.has('ducks'))) }), this);
  }

  // the one you are closest to among those still out (for the GPS)
  nearest() {
    const g = this.game, p = g.player;
    let best = null, bd = 1e9;
    for (const d of this.left) { const P = this.spotOf(d); const dd = Math.hypot(P.x - p.x, P.z - p.z); if (dd < bd) { bd = dd; best = d; } }
    return best;
  }

  spotOf(d) {
    const g = this.game;
    if (d.how === 'fountain') return fountainDuck(g).stand;
    if (d.how === 'wash') return this.washed ? ANKOR.wash.drop : { x: (CARWASH.x0 + CARWASH.x1) / 2, z: (CARWASH.z0 + CARWASH.z1) / 2 };
    if (d.how === 'net') return ANKOR.net.end;
    return ANKOR.yasmin;
  }

  findStep() {
    const g = this.game, m = this.mgr, p = g.player;
    // Solbrillan comes out when a car has been through the wash
    if (!this.washed && !this.home.includes('sol') && m.inWash && m.washDone) {
      this.washed = true;
      g.emit('toast', { text: 'Borstarna snurrar – och ut flyger en gummianka med solglasögon! Hon landar vid utfarten.', long: true });
      g.emit('ducks', { kind: 'quack' });
    }
    const n = this.home.length + this.carried.length;
    const next = this.nearest();
    if (!next) m.setObjective(this.carried.length ? 'Tillbaka till dammen' : 'Ankorna i dammen', this.carried.length ? `Släpp ${this.carried.length === 1 ? 'ankan' : `de ${this.carried.length} ankorna`} vid dammen i parken` : '');
    else {
      const hint = next.how === 'wash' && !this.washed ? (p.inCar && !p.car.spec.bike ? 'Kör in i biltvätten och stanna' : 'Kör igenom biltvätten med en bil') : next.where;
      m.setObjective(`Hitta ankorna: ${n} av 4`, `${next.name} · ${hint}`);
    }
    if (p.state !== 'foot' || p.frozen) return;
    if (this.carried.length && Math.hypot(p.x - ANKOR.release.x, p.z - ANKOR.release.z) < ANKOR.release.r) { this.prompt = 'SLÄPP'; return; }
    for (const d of this.left) {
      if (d.how === 'fountain') { const F = fountainDuck(g); if (Math.hypot(p.x - F.x, p.z - F.z) < F.r) { this.prompt = 'TA'; this.at = d; return; } }
      if (d.how === 'wash' && this.washed && Math.hypot(p.x - ANKOR.wash.drop.x, p.z - ANKOR.wash.drop.z) < 1.3) { this.prompt = 'TA'; this.at = d; return; }
      if (d.how === 'net') {
        const N = ANKOR.net;
        if (Math.hypot(p.x - N.end.x, p.z - N.end.z) < N.end.r) {
          const K = kvackeAt(g.time), close = Math.hypot(N.end.x - K.x, N.end.z - K.z) < N.reach;   // (the net reaches from the railing at the end, wherever on it you stand)
          this.prompt = 'HÅVA'; this.at = d; this.netClose = close;
          if (!this.netHinted) { this.netHinted = true; g.emit('toast', { text: 'En gammal håv hänger på räcket. Vänta tills Kvacke flyter nära – och HÅVA!', long: true }); }
          return;
        }
      }
      if (d.how === 'yasmin') { const Y = m.ankorYasmin; if (Y && Math.hypot(p.x - Y.x, p.z - Y.z) < ANKOR.yasmin.r) { this.prompt = 'PRATA'; this.at = d; return; } }
    }
  }

  take(d, say = true) {
    const g = this.game;
    this.carried.push(d.id);
    g.emit('ducks', { kind: 'take' });
    if (say) g.emit('toast', { text: `${d.name} är med! ${this.home.length + this.carried.length} av 4.`, long: false });
  }

  net() {
    const g = this.game, p = g.player, d = this.at, K = kvackeAt(g.time);
    p.h = Math.atan2(K.x - p.x, K.z - p.z);
    this.netAt = g.time;
    g.emit('ducks', { kind: 'splash' });
    if (this.netClose) { this.take(d, false); g.emit('toast', { text: 'Plask! Kvacke sitter i håven. Han ser nöjd ut.', long: false }); }
    else g.emit('toast', { text: 'Plask! För långt bort. Vänta tills Kvacke flyter närmare.', long: false });
  }

  talkToYasmin() {
    const g = this.game, m = this.mgr, p = g.player, Y = m.ankorYasmin;
    this.stage = 'yasminTalk';
    p.frozen = true; p.vx = p.vz = 0;
    if (Y) { p.h = Math.atan2(Y.x - p.x, Y.z - p.z); Y.standH = Y.h = Y.body.h = Math.atan2(p.x - Y.x, p.z - Y.z); }
    g.camFocus = { x: (p.x + Y.x) / 2, y: 0.5, z: (p.z + Y.z) / 2, yaw: p.h - 0.6, owner: 'ankor', near: true };
    m.later(0.4, () => g.emit('talk', { id: this.id, pages: yasminPages() }), this);
  }

  release() {
    const g = this.game, m = this.mgr, p = g.player;
    const S = ankorSave(g) || {};
    const home = [...(S.home || []), ...this.carried];
    g.stats.ankor = { home };
    g.emit('progress', {});
    const n = this.carried.length;
    this.carried = [];
    p.h = Math.atan2(POND.x - p.x, POND.z - p.z);
    g.emit('ducks', { kind: 'release' });
    const E = m.ankorEbbe;
    if (home.length < 4) {
      g.emit('toast', { text: `${n === 1 ? 'Ankan simmar' : 'Ankorna simmar'} ut och ställer sig i ledet bakom Kung Kvack. ${home.length} av 4 är hemma.`, long: true });
      if (E) g.emit('say', { who: E, text: home.length === 1 ? 'EN är hemma! Fler, fler!' : home.length === 2 ? 'Två! Kung Kvack ser gladare ut!' : 'Tre! Bara en kvar!' });
      return;
    }
    this.stage = 'home';
    p.frozen = true; p.vx = p.vz = 0;
    const H = m.ankorHanna;
    for (const q of [H, E]) if (q) { q.standH = q.h = q.body.h = Math.atan2(p.x - q.x, p.z - q.z); }
    g.camFocus = { x: POND.x, y: 0.4, z: POND.z + 5.5, yaw: Math.PI - 0.15, owner: 'ankor', near: true, dist: 9.5, height: 4.2 };
    m.later(1.6, () => g.emit('talk', { id: this.id, pages: homePages() }), this);
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'ankor') g.camFocus = null; };
    if (this.stage === 'intro') {
      free(); this.stage = 'find';
      m.later(0.8, () => g.emit('hint', { id: 'ankor', touch: 'Fyra ankor på fyra ställen – ta dem i vilken ordning du vill. Kartan visar var.', keys: 'Fyra ankor på fyra ställen – ta dem i vilken ordning du vill. Kartan visar var.' }), this);
      return;
    }
    if (this.stage === 'yasminTalk') { free(); this.stage = 'find'; this.gotLillan = true; this.take(BY_ID.lillan); return; }
    if (this.stage === 'home') {
      this.stage = 'done';
      const s = m.secrets; if (s && !s.has('ducks')) m.later(1.2, () => s.find('ducks', 'quiet'));
      g.stats.ankor = { home: ANKOR.ducks.map((d) => d.id), done: true };
      m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Ankorna i dammen', amount: ANKOR.pay });
      m.sms(WHO.hanna, 'Ebbe somnade innan vi ens kommit hem. Han pratade om "ankornas tant/farbror" hela vägen. Tack, från oss båda!', 30);
    }
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.prompt = null; this.at = this.at && this.stage === 'find' ? this.at : null;
    if (this.stage === 'find') this.findStep();
    if (this.netAt != null && g.time - this.netAt < 0.6 && p.state === 'foot') p.body.pose = 1;   // (swinging the net)
    void dt;
  }

  interact() {
    switch (this.prompt) {
      case 'TA': this.take(this.at); return true;
      case 'HÅVA': this.net(); return true;
      case 'PRATA': this.talkToYasmin(); return true;
      case 'SLÄPP': this.release(); return true;
    }
    return false;
  }

  targets(T) {
    const g = this.game, p = g.player;
    if (this.stage !== 'find' || g.indoor) return;
    // every duck still out on the map; the GPS to the nearest – or to the pond, if that is nearer with ducks in your pockets
    const C = this.left.map((d) => ({ P: this.spotOf(d), r: d.how === 'net' ? 1.2 : 1.0 }));
    if (this.carried.length) C.push({ P: ANKOR.release, r: 1.2 });
    let best = null, bd = 1e9;
    for (const c of C) { const d = Math.hypot(c.P.x - p.x, c.P.z - p.z); if (d < bd) { bd = d; best = c; } }
    for (const c of C) T.push({ kind: 'zone', x: c.P.x, z: c.P.z, r: c.r, gps: c === best });
  }

  cleanup() {
    const g = this.game, p = g.player;
    this.prompt = null;
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'ankor') g.camFocus = null;
  }
}

