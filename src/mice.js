// Side quest "Möss i kvarnen" (v1.13), inside the windmill on Norrholmen. Mjölnar-Majken hears squeaking
// in the walls: mice in the flour, and on Friday Bengt fetches twenty sacks. Sotis the cat is sixteen
// and sleeps on the sacks. Plug the five holes along the skirting (or the mice just pop into the wall
// and come out somewhere else), then catch them, alive: run at a mouse and it darts off – but it stops
// to sniff once it thinks it is safe, and if you come the last bit slowly it does not notice you. One
// of the seven is white, tame and wears a collar: KIMCHI – NOVA, SKOLGATAN. Carry the crate out and
// let the wild ones go at Bullbilen's empty bakery, then take Kimchi home to Nova behind Macken.
// The mice are pure simulation (render.js draws `job.mice`); they use their own hash randoms, never
// the game's.
import { WHO, NOVA_DOOR } from './config.js';
import { MILL_ROOM as R, MILL_DOOR, HOLES } from './millroom.js';
import { MAJKEN_LOOK } from './opening.js';
import { NOVA_LOOK } from './concert.js';
import { spawnPed, removePed } from './hideout.js';
import { circleVs } from './collide.js';
import { fmt } from './rng.js';

export const MICE = {
  mark: { x: MILL_DOOR.x, z: MILL_DOOR.z, r: 1.4 },
  catchR: 1.25,            // FÅNGA reaches this far
  wander: 0.6, flee: 4.4,  // m/s
  fleeT: 2.4, safe: 6.0, freezeT: 1.3, // a dash (until it is this far from you, or this long), then a sniff
  alert0: 0.9, alertK: 0.5, freezeK: 0.3, // how close you get: 0.9 m + half your speed (a third of that while it sniffs)
  holeR: 2.6,              // a fleeing mouse goes for an open hole this close
  release: { x: 68, z: -307.2, r: 3.2 },  // Bullbilen's loading dock, behind the bakery on Norrholmen
  nova: { x: NOVA_DOOR.x + 0.7, z: NOVA_DOOR.z + 0.9, h: 0, talk: { x: NOVA_DOOR.x + 0.7, z: NOVA_DOOR.z + 2.0, r: 1.8 } },
  pay: { majken: 700, nova: 150 },
};
export const MICE_MAX = MICE.pay.majken + MICE.pay.nova;
const N = R.start.length; // seven, the white one last

const MAJKEN = { who: 'Mjölnar-Majken', letter: 'J', color: '#c8a24a' };
const NOVA = { who: 'Nova', letter: 'N', color: '#b36cff' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };

export function introPages() {
  return [
    { ...MAJKEN, text: 'Äntligen! Hör du? Det piper i väggarna. Möss i kvarnen – och på fredag hämtar Bengt tjugo säckar mjöl.' },
    { ...MAJKEN, text: 'Sotis skulle ta dem. Sotis är sexton år och sover på säckarna. Titta på honom.' },
    { ...MAJKEN, text: 'Täpp till hålen längs väggarna först. Annars smiter de bara in i väggen och kommer ut någon annanstans. Här har du pluggar.' },
    { ...MAJKEN, text: 'Sedan fångar du dem. Levande, tack! Springer du rakt på en mus så sticker den. Men den stannar och nosar när den tror att den är säker – ta den sista biten lugnt.' },
    { ...MAJKEN, text: 'Lägg dem i lådan här vid dörren. Sju stycken har jag räknat till.', last: 'JAG FÅNGAR' },
  ];
}
export function againPages() {
  return [{ ...MAJKEN, text: 'Där är du igen. De har krupit ut ur hålen – och pluggarna ramlade ut, förstås. Sju stycken, samma som sist.', last: 'JAG FÅNGAR' }];
}
export function caughtPages() {
  return [
    { ...MAJKEN, text: 'Sju möss! Alla sju i lådan. Sotis, du kan sova vidare.' },
    { ...MAJKEN, text: 'Men vänta … den vita här. Den är ju tam. Och har den … ett halsband?' },
    { ...YOU, text: 'Det står något på det. ”KIMCHI – NOVA, SKOLGATAN”.' },
    { ...MAJKEN, text: 'Nova? Kims lillasyster! Jag hämtade tomma mjölsäckar på Hörnlivs i tisdags. Där har hon nog krupit ner och åkt med.' },
    { ...MAJKEN, text: 'Ta lådan med de vilda och släpp dem vid Bullbilens gamla bageri. Det står tomt nu, och där finns mjöldamm så det räcker i hundra år.' },
    { ...MAJKEN, text: 'Och Kimchi får åka i din ficka hem till Nova. Jag ringer henne.', last: 'JAG TAR DEM' },
  ];
}
export function novaPages(friend) {
  return [
    { ...NOVA, text: 'Vänta. VÄNTA. Är det … KIMCHI?!' },
    { ...YOU, text: 'Hon bodde i Majkens kvarn på Norrholmen. Med sex kompisar.' },
    { ...NOVA, text: 'Hon har varit borta i fyra dagar! Mamma sa att hon säkert sprungit till Norrköping. Jag grät typ hela tiden.' },
    { ...NOVA, text: 'Kimchi, du är så dramatisk. Precis som jag.' },
    { ...NOVA, text: `Majken ringde, hon swishar ${fmt(MICE.pay.majken)} kr. Och här är ${fmt(MICE.pay.nova)} ur min konsertbudget. Du är ${friend ? 'fortfarande ' : ''}min favoritvuxen.`, last: 'TACK!' },
  ];
}

export const miceSave = (g) => g.stats.mice || null;

// while the quest waits half-done (the crate carried out, or the wild ones let go), following it picks
// it up there; Nova waits at her door when it is her turn
export function miceWorld(mgr) {
  const c = mgr.jobs.find((q) => q.id === 'moss');
  const S = miceSave(mgr.game);
  if (c) c.startOnAccept = !!(mgr.isOpen('moss') && S && S.at > 0);
}

// a little hash random for the mice (not the game's)
const hrand = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };

export class MiceJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'moss';
    this.stage = 'enter';   // enter → talk → catch → caught → carry (inside, then out) → release → nova → novaTalk → done
    this.prompt = null;
    this.titleCard = false;
    this.mice = [];
    this.holes = HOLES.map((H) => ({ def: H, plugged: false }));
    this.caught = 0;
    this.carry = null;      // 'crate' while you carry the mice out
    this.rk = 0;
  }

  save(at) { this.game.stats.mice = { at }; this.game.emit('progress', {}); }

  start() {
    const g = this.game, m = this.mgr;
    const S = miceSave(g);
    if (S && S.at > 0) { this.resume(S); return; }
    m.setObjective('Möss i kvarnen', 'Väderkvarnen på Norrholmen');
    g.indoors.enter(() => {
      this.stage = 'talk';
      this.majken = spawnPed(g, { ...MAJKEN_LOOK }, R.majken.x, R.majken.z, R.majken.h, 'majken');
      this.mice = R.start.map(([x, z], i) => ({ i, x: R.room.x0 + x, z: R.room.z0 + z, h: hrand(i, 1) * 6.28, state: 'wander', t: hrand(i, 2) * 2, turnT: 0, white: i === N - 1, hole: null, run: 0 }));
      g.emit('toast', { text: 'Väderkvarnen · Norrholmen', long: false });
      g.player.frozen = true;
      const again = !!m.flags.miceTalked;
      m.flags.miceTalked = true;
      g.camFocus = { x: R.room.x0 + 4.2, y: 0.4, z: R.room.z0 + 5.0, owner: 'moss', cam: { x: R.room.x0 + 4.6, y: R.y + 5.8, z: R.room.z0 + 9.8, fov: 60 } };
      m.later(0.9, () => g.emit('talk', { id: this.id, pages: again ? againPages() : introPages() }), this);
    }, 'mill');
  }

  resume(S) {
    const g = this.game;
    if (S.at === 1) { this.toRelease(); g.emit('toast', { text: 'Möss i kvarnen fortsätter: släpp de vilda mössen vid Bullbilens gamla bageri.', long: true }); }
    else { this.toNova(); g.emit('toast', { text: 'Möss i kvarnen fortsätter: lämna Kimchi hos Nova, porten bakom Macken.', long: true }); }
  }

  rnd() { return hrand(++this.rk, 7.3); }
  get plugged() { return this.holes.filter((h) => h.plugged).length; }
  get loose() { return this.mice.filter((q) => q.state !== 'caught'); }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null;
    if (this.carry === 'crate' && p.state === 'foot') p.body.pose = 3;
    if (g.time - (this.grabAt ?? -9) < 0.3 && p.state === 'foot') p.body.pose = 1; // the grab
    switch (this.stage) {
      case 'catch': return this.catchStep(dt);
      case 'carry': return this.carryStep();
      case 'release': return this.releaseStep();
      case 'nova': return this.novaStep();
    }
    void m; void ind;
  }

  // ---------------------------------------------------------------- inside: the holes and the mice
  catchStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    if (!ind.inside && !ind.busy) {
      this.removePeople();
      m.quit(this, [WHO.majken, 'Vart tog du vägen? De piper fortfarande. Kom tillbaka till kvarnen när du kan!']);
      return;
    }
    for (const q of this.mice) this.mouseStep(q, dt);
    const n = this.plugged;
    if (n < HOLES.length) m.setObjective(`Täpp till hålen: ${n} av ${HOLES.length}`, `Mössen: ${this.caught} av ${N} fångade`);
    else m.setObjective(`Fånga mössen: ${this.caught} av ${N}`, 'Spring ikapp – ta sista biten lugnt');
    if (p.state !== 'foot' || p.frozen) return;
    // FÅNGA the nearest mouse within reach, else TÄPP the nearest open hole
    let best = null, bd = MICE.catchR;
    for (const q of this.mice) {
      if (q.state === 'caught' || q.state === 'hole') continue;
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bd) { bd = d; best = q; }
    }
    this.target = best;
    if (best) { this.prompt = 'FÅNGA'; return; }
    for (const h of this.holes) if (!h.plugged && Math.hypot(p.x - h.def.sx, p.z - h.def.sz) < h.def.r) { this.prompt = 'TÄPP'; this.hole = h; return; }
  }

  interact() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.prompt === 'FÅNGA' && this.target) {
      const q = this.target;
      q.state = 'caught';
      this.caught++;
      p.h = Math.atan2(q.x - p.x, q.z - p.z); p.vx = p.vz = 0;
      this.grabAt = g.time;
      g.emit('mice', { kind: 'catch' });
      if (q.white) {
        g.emit('toast', { text: 'Den vita musen springer inte ens – den kryper rakt upp i din hand. Den har ett litet rött halsband.', long: true });
        g.emit('say', { who: this.majken, text: 'Den där är ingen kvarnmus!' });
      } else g.emit('say', { who: this.majken, text: ['Pip! En i lådan.', 'Där åkte nummer två!', 'Snyggt fångat.', 'Sotis vaknade inte ens.', 'Bara några kvar!', 'Nästan alla nu!', 'Den sista!'][Math.min(6, this.caught - 1)] });
      if (this.caught >= N) this.allCaught();
      return true;
    }
    if (this.prompt === 'TÄPP' && this.hole) {
      const h = this.hole, H = h.def;
      h.plugged = true;
      p.h = Math.atan2(H.wx - p.x, H.wz - p.z); p.vx = p.vz = 0;
      g.emit('mice', { kind: 'plug' });
      // a mouse in there pops out (and runs)
      for (const q of this.mice) if (q.state === 'hole' && q.hole === h) this.emerge(q, h, true);
      const n = this.plugged;
      if (n === 1) g.emit('say', { who: this.majken, text: 'Bra! Fyra kvar.' });
      if (n === HOLES.length) g.emit('say', { who: this.majken, text: 'Alla hålen täppta! Nu har de ingenstans att ta vägen.' });
      return true;
    }
    if (this.prompt === 'SLÄPP') { this.release(); return true; }
    if (this.prompt === 'PRATA') { this.novaTalk(); return true; }
    return false;
  }

  // ---- one mouse
  alertR(q) {
    const p = this.game.player;
    const sp = p.state === 'foot' ? Math.hypot(p.vx, p.vz) : 0;
    const r = MICE.alert0 + MICE.alertK * sp;
    return q.state === 'freeze' ? r * MICE.freezeK : r;
  }

  free(x0, z0, x1, z1) { return this.game.world.raycast(x0, z0, x1, z1, R.y + 0.08) >= 0.999; }

  // steer toward heading a: the first free direction near it (null when boxed in)
  steer(q, a, look = 0.45) {
    for (const off of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 1.9, -1.9, 2.5, -2.5]) {
      const d = a + off * (q.i % 2 ? 1 : -1);
      if (this.free(q.x, q.z, q.x + Math.sin(d) * look, q.z + Math.cos(d) * look)) return { a: d, off: Math.abs(off) };
    }
    return null;
  }

  // where a fleeing mouse runs: away from you, toward open floor – along the wall when it has to, and
  // when it is cornered it darts past you on one side (that is how mice are)
  fleeDir(q, dx, dz, d) {
    const away = Math.atan2(dx, dz), ux = dx / (d || 1), uz = dz / (d || 1);
    let best = null, bs = -1e9;
    if (q.side == null) q.side = q.i % 2 ? 1 : -1;
    for (let k = -8; k <= 8; k++) {
      const a = away + (k * Math.PI) / 9;
      const sx = Math.sin(a), sz = Math.cos(a);
      const f = this.game.world.raycast(q.x, q.z, q.x + sx * 1.6, q.z + sz * 1.6, R.y + 0.08) * 1.6;
      if (f < 0.25) continue;
      const along = sx * ux + sz * uz;              // 1 = straight away from you
      if (along < -0.2 && d < 1.6) continue;         // not into your hands
      const score = Math.min(f, 1.6) * 1.6 + along * 0.8 + (q.t > 0 ? Math.cos(a - q.h) * 0.6 : 0) + (Math.sign(k) === q.side ? 0.15 : 0); // (keeps going the way it goes)
      if (score > bs) { bs = score; best = a; }
    }
    if (best != null) return best;
    // cornered: dart sideways past you
    for (const s of [q.side, -q.side]) {
      const a = away + s * Math.PI * 0.62;
      if (this.free(q.x, q.z, q.x + Math.sin(a) * 0.4, q.z + Math.cos(a) * 0.4)) { q.side = -q.side; return a; }
    }
    return null;
  }

  move(q, a, v, dt) {
    q.h = a;
    q.x += Math.sin(a) * v * dt; q.z += Math.cos(a) * v * dt;
    q.run = v;
    const W = this.game.world;
    for (const c of W.query(q.x, q.z, 0.08)) {
      if (c.h < R.y + 0.05) continue;
      const res = circleVs(c, q.x, q.z, 0.07);
      if (res) { q.x += res.nx * res.depth; q.z += res.nz * res.depth; }
    }
  }

  mouseStep(q, dt) {
    const p = this.game.player;
    q.t += dt; q.run = 0;
    if (q.state === 'caught') return;
    if (q.state === 'hole') {
      if (q.t < q.holeFor) return;
      const open = this.holes.filter((h) => !h.plugged && h !== q.hole);
      this.emerge(q, open.length ? open[Math.floor(this.rnd() * open.length)] : q.hole, false);
      return;
    }
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    if (q.white) { // Kimchi: curious, comes to you
      if (d < 4 && d > 0.75) { const s = this.steer(q, Math.atan2(-dx, -dz)); if (s) this.move(q, s.a, 0.55, dt); }
      else this.wanderStep(q, dt, 0.35);
      return;
    }
    if ((q.state === 'wander' || q.state === 'freeze') && d < this.alertR(q)) this.startFlee(q);
    if (q.state === 'flee') {
      // an open hole close by, and not past you: in it goes
      if (!q.toHole) {
        for (const h of this.holes) {
          if (h.plugged) continue;
          const hx = h.def.x - q.x, hz = h.def.z - q.z, hd = Math.hypot(hx, hz);
          if (hd < MICE.holeR && (hx * dx + hz * dz) / (hd * (d || 1)) > -0.3) { q.toHole = h; break; }
        }
      }
      if (q.toHole && q.toHole.plugged) q.toHole = null;
      if (q.toHole) {
        const h = q.toHole, hx = h.def.x - q.x, hz = h.def.z - q.z, hd = Math.hypot(hx, hz);
        if (hd < 0.15) { q.state = 'hole'; q.hole = h; q.t = 0; q.holeFor = 3 + this.rnd() * 3; q.toHole = null; this.game.emit('mice', { kind: 'hole' }); return; }
        this.move(q, Math.atan2(hx, hz), Math.min(MICE.flee, hd * 8), dt);
        return;
      }
      if (q.t > MICE.fleeT || (d > MICE.safe && q.t > 0.4)) { q.state = 'freeze'; q.t = 0; q.freezeFor = MICE.freezeT * (0.8 + this.rnd() * 0.4); return; } // far enough: it stops and sniffs
      const a = this.fleeDir(q, dx, dz, d);
      if (a == null) { q.state = 'freeze'; q.t = 0; q.freezeFor = MICE.freezeT; return; } // boxed in
      this.move(q, a, MICE.flee * Math.max(0.5, 1 - 0.08 * (q.tired || 0)), dt); // (it tires: every dash is a little slower)
      return;
    }
    if (q.state === 'freeze') { if (q.t > q.freezeFor) { q.state = 'wander'; q.t = 0; } return; }
    this.wanderStep(q, dt, MICE.wander);
  }

  wanderStep(q, dt, v) {
    q.turnT -= dt;
    if (q.turnT <= 0) { q.turnT = 0.7 + this.rnd() * 1.6; q.want = q.h + (this.rnd() - 0.5) * 2.4; q.sniff = this.rnd() < 0.3 ? 0.6 + this.rnd() * 0.8 : 0; }
    if (q.sniff > 0) { q.sniff -= dt; return; }
    const s = this.steer(q, q.want ?? q.h, 0.35);
    if (!s) { q.want = q.h + Math.PI; return; }
    this.move(q, s.a, v, dt);
  }

  startFlee(q) {
    q.state = 'flee'; q.t = 0; q.toHole = null; q.tired = (q.tired || 0) + 1;
    if (!this.squeakT || this.game.time - this.squeakT > 0.6) { this.squeakT = this.game.time; this.game.emit('mice', { kind: 'squeak' }); }
  }

  emerge(q, h, run) {
    const H = h.def;
    q.x = H.x + H.n[0] * 0.25; q.z = H.z + H.n[1] * 0.25;
    q.h = Math.atan2(H.n[0], H.n[1]);
    q.hole = null;
    if (run) this.startFlee(q);
    else { q.state = 'freeze'; q.t = 0; q.freezeFor = 0.5; }
  }

  // ---------------------------------------------------------------- all seven: Majken, the crate
  allCaught() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'caught';
    p.frozen = true; p.vx = p.vz = 0;
    const M = this.majken;
    if (M) { M.standH = M.h = Math.atan2(p.x - M.x, p.z - M.z); }
    g.camFocus = { x: (p.x + R.majken.x) / 2, y: 0.5, z: (p.z + R.majken.z) / 2, owner: 'moss', cam: { x: R.room.x0 + 5.0, y: R.y + 4.4, z: R.room.z0 + 4.2, fov: 60 } };
    m.later(1.2, () => g.emit('talk', { id: this.id, pages: caughtPages() }), this);
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'talk') {
      this.stage = 'catch';
      p.frozen = false;
      if (g.camFocus && g.camFocus.owner === 'moss') g.camFocus = null;
      m.later(1.0, () => g.emit('hint', { id: 'moss', touch: 'Gå fram till ett hål med pil och tryck TÄPP. Nära en mus: FÅNGA. Dra spaken lite för att smyga.', keys: 'Gå fram till ett hål med pil och tryck E (TÄPP). Nära en mus: E (FÅNGA).' }), this);
      return;
    }
    if (this.stage === 'caught') {
      this.stage = 'carry';
      this.carry = 'crate';
      p.frozen = false;
      if (g.camFocus && g.camFocus.owner === 'moss') g.camFocus = null;
      g.emit('keys', { item: 'crate' });
      this.save(1);
      return;
    }
    if (this.stage === 'novaTalk') this.finish();
  }

  // ---------------------------------------------------------------- out with the crate
  carryStep() {
    const g = this.game, m = this.mgr;
    if (g.indoors.inside || g.indoors.busy) { m.setObjective('Bär ut lådan med mössen', 'Gå ut genom dörren'); return; }
    // out of the mill: Majken stays inside (out of sight)
    this.removePeople();
    this.stage = 'release';
  }

  toRelease() { this.stage = 'release'; this.carry = 'crate'; this.caught = N; }

  releaseStep() {
    const g = this.game, m = this.mgr, p = g.player, Z = MICE.release;
    const d = Math.hypot(p.x - Z.x, p.z - Z.z);
    m.setObjective('Släpp mössen vid Bullbilens gamla bageri', d < 30 ? (p.inCar ? 'Kliv ur vid lastkajen' : 'Lastkajen på bakgården') : 'Bakgården vid bageriet på Norrholmen');
    if (p.state === 'foot' && !p.frozen && d < Z.r) this.prompt = 'SLÄPP';
  }

  release() {
    const g = this.game, m = this.mgr, p = g.player;
    this.carry = null;
    p.vx = p.vz = 0; p.body.pose = 1;
    g.emit('mice', { kind: 'release' });
    g.emit('toast', { text: 'Du öppnar lådan. Sex små grå möss rusar in under lastkajen och är borta. Kimchi stannar i fickan och tittar på dig.', long: true });
    this.save(2);
    m.later(2.5, () => this.toNova(), this);
    this.stage = 'released';
  }

  // ---------------------------------------------------------------- Kimchi home to Nova
  toNova() {
    this.stage = 'nova'; this.carry = null; this.caught = N;
  }

  novaStep() {
    const g = this.game, m = this.mgr, p = g.player, V = MICE.nova;
    if (!this.nova || !g.peds.list.includes(this.nova)) {
      const d0 = Math.hypot(p.x - V.x, p.z - V.z);
      this.novaWait = (this.novaWait || 0) + 1 / 60;
      // out of sight – or (after a moment) she just comes out of her door
      if (d0 > 45 || !g.visible(V.x, V.z) || this.novaWait > 3) this.nova = spawnPed(g, { ...NOVA_LOOK }, V.x, V.z, V.h, 'nova');
    }
    const d = Math.hypot(p.x - V.talk.x, p.z - V.talk.z);
    m.setObjective('Kimchi hem till Nova', d < 30 ? (p.inCar ? 'Kliv ur vid porten' : 'Nova väntar vid porten') : 'Porten bakom Macken, Skolgatan');
    if (this.nova && p.state === 'foot' && !p.frozen && Math.hypot(p.x - this.nova.x, p.z - this.nova.z) < V.talk.r) this.prompt = 'PRATA';
  }

  novaTalk() {
    const g = this.game, p = g.player, Nv = this.nova;
    this.stage = 'novaTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(Nv.x - p.x, Nv.z - p.z);
    Nv.standH = Nv.h = Math.atan2(p.x - Nv.x, p.z - Nv.z);
    g.camFocus = { x: (p.x + Nv.x) / 2, y: 0.6, z: (p.z + Nv.z) / 2, yaw: p.h - 0.7, owner: 'moss', near: true };
    g.emit('keys', { item: 'mouse' });
    g.emit('talk', { id: this.id, pages: novaPages(this.mgr.done.has('konsert')) });
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    g.stats.mice = { at: 3 };
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Möss i kvarnen', amount: MICE_MAX });
    m.sms(WHO.nova, 'kimchi sover i min hoodie nu. hon luktar typ mjöl. tack igen!!', 30);
  }

  targets(T) {
    const g = this.game, ind = g.indoors;
    if (this.stage === 'catch' && ind.inside && ind.where === 'mill') {
      if (this.plugged < HOLES.length) for (const h of this.holes) if (!h.plugged) T.push({ kind: 'item', x: h.def.wx + h.def.n[0] * 0.2, y: R.y + 0.55, z: h.def.wz + h.def.n[1] * 0.2, gps: false });
      return;
    }
    if (this.stage === 'carry' && ind.inside) { T.push({ kind: 'item', x: R.door.x, y: R.y + 1.6, z: R.door.z, gps: false }); return; }
    if (this.stage === 'release' && !ind.inside) { const Z = MICE.release; T.push({ kind: 'zone', x: Z.x, z: Z.z, r: Z.r, gps: true }); return; }
    if (this.stage === 'nova' && !ind.inside) {
      const V = MICE.nova;
      if (this.nova) T.push({ kind: 'contact', x: this.nova.x, z: this.nova.z, r: 1, letter: NOVA.letter, color: NOVA.color, badgeOnly: true, badgeY: 2.0, ref: this.nova, gps: true, always: true });
      else T.push({ kind: 'zone', x: V.x, z: V.z, r: 1.4, gps: true });
    }
  }

  // the minimap inside the mill: the loose mice (not the hidden ones), the open holes
  mapDots() {
    if (this.stage !== 'catch') return null;
    const D = [];
    for (const h of this.holes) if (!h.plugged) D.push({ x: h.def.wx, z: h.def.wz, c: '#ffcf33' });
    for (const q of this.mice) if (q.state !== 'caught' && q.state !== 'hole') D.push({ x: q.x, z: q.z, c: q.white ? '#ffffff' : '#9aa0a6', r: 2.6 });
    return D;
  }

  removePeople() {
    const g = this.game;
    removePed(g, this.majken); this.majken = null;
  }

  cleanup() {
    const g = this.game, p = g.player;
    this.prompt = null;
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'moss') g.camFocus = null;
    const nova = this.nova;
    if (nova) { const check = () => { if (Math.hypot(g.player.x - nova.x, g.player.z - nova.z) < 45 && g.visible(nova.x, nova.z)) { this.mgr.later(1, check); return; } removePed(g, nova); }; this.mgr.later(4, check); }
    if (!g.indoors.inside) { this.removePeople(); return; }
    const M = this.majken;
    const check = () => { if (g.indoors.inside && g.indoors.where === 'mill') { this.mgr.later(1, check); return; } removePed(g, M); };
    this.mgr.later(1, check);
  }
}
