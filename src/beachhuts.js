// Side quest "Badhyttsgåtan" (v1.5) on Norrholmen's beach: a logic puzzle. Four kids have been in the
// water all day and can't remember which of the four beach huts they rent – and the keys hang in the
// wrong huts. Tove the lifeguard has no time (she watches the water). Each kid remembers one thing:
// ask them all (PRATA), work out who has which hut, put the right name sign on each hut (SKYLT – press
// again for the next free name), then tell Tove. She tries the keys and only says how many huts are right.
//
// The huts in a row along the west shore, from the far end to the pennant: green, pink, blue, yellow.
//   Bosse: "Min hytt ligger precis bredvid Cleos – på sidan närmast vimpeln."  → Bosse = Cleo + 1
//   Alva:  "Jag har ingen av hytterna i ändarna."                              → Alva is pink or blue
//   Dante: "Den gula hytten är inte min."                                        → Dante is not yellow
//   Cleo:  "Den gröna är inte min – den luktar tång."                            (true, not needed)
// The one answer: green Dante, pink Alva, blue Cleo, yellow Bosse.
import { WHO } from './config.js';
import { STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed } from './hideout.js';
import { fmt } from './rng.js';

const TOVE = { who: 'Livräddar-Tove', letter: 'T', color: '#d2342c' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
export const TOVE_LOOK = { shirt: 0xd2342c, pants: 0xd2342c, skin: 0xd9a070, hair: 0xe8c878, height: 1.0, bulk: 0.98, style: ST.long | ST.swim | ST.cap, accent: 0xf4f1ea };

// the huts (the same places as in island.js: along the shore from (-36, -250), facing the water)
const N1 = [-0.5046, 0.8633], U1 = [0.8633, 0.5046];
export const HUTS = [['gröna', 0x9fd8c4], ['rosa', 0xf2b8c6], ['blå', 0xa8cde8], ['gula', 0xf4dc8a]].map(([name, c], i) => {
  const s = 4.4 + i * 2.1, x = -36 + U1[0] * s - N1[0] * 4.4, z = -250 + U1[1] * s - N1[1] * 4.4;
  return { i, name, c, x, z, door: { x: x + N1[0] * 1.55, z: z + N1[1] * 1.55 } };
});
// the four kids: where they are on the beach, what they remember, the hut that is really theirs
export const KIDS = [
  { id: 'alva', name: 'Alva', letter: 'A', color: '#ff6fae', hut: 1, at: [-1.7, -237.6, 2.6],
    look: { shirt: 0xff6fae, pants: 0xff6fae, skin: 0xf0c8a8, hair: 0xd9b26b, height: 0.7, bulk: 0.86, style: ST.long | ST.swim, accent: 0xff6fae },
    clue: 'Jag har ingen av hytterna i ändarna. Det blåser för mycket där, och jag fryser lätt.' },
  { id: 'bosse', name: 'Bosse', letter: 'B', color: '#4aa8ff', hut: 3, at: [16.9, -241.6, 0.5],
    look: { shirt: 0xf0c8a8, pants: 0x2c62a8, skin: 0xf0c8a8, hair: 0x6b4a32, height: 0.74, bulk: 0.9, style: ST.swim | ST.cap, accent: 0xf2c21b },
    clue: 'Min hytt ligger precis bredvid Cleos. På sidan närmast vimpeln. Det vet jag, för jag vinkar till henne genom springan.' },
  { id: 'cleo', name: 'Cleo', letter: 'C', color: '#46c96f', hut: 2, at: [6.4, -244.9, 1.4],
    look: { shirt: 0x46c96f, pants: 0x46c96f, skin: 0xb98a64, hair: 0x1e1612, height: 0.72, bulk: 0.86, style: ST.bun | ST.swim, accent: 0x46c96f },
    clue: 'Den gröna hytten är inte min. Den luktar tång. Mer än jag vet, faktiskt.' },
  { id: 'dante', name: 'Dante', letter: 'D', color: '#f2c21b', hut: 0, at: [4.0, -222.6, Math.PI],
    look: { shirt: 0xe8b996, pants: 0xe8833a, skin: 0xe8b996, hair: 0x1a1414, height: 0.76, bulk: 0.9, style: ST.swim, accent: 0xe8833a },
    clue: 'Den gula hytten? Inte min. Gult är inte min färg. Mer vet jag inte – jag ska hoppa från svikten nu.' },
];
// Tove by the lifeguard tower (the side away from the water, beside the ladder)
const RS = Math.atan2(-0.1613, 0.9869), TW = { x: -3.6, z: -239.6 };
export const TOVE_AT = { x: TW.x + Math.cos(RS) * 1.7 - Math.sin(RS) * 2.0, z: TW.z - Math.sin(RS) * 1.7 - Math.cos(RS) * 2.0, h: RS + Math.PI };
export const HUT_PAY = { base: 1500, wrong: 200, min: 700 };

const hiddenFrom = (g, x, z) => { const p = g.player, d = Math.hypot(x - p.x, z - p.z); return d > 70 || (d > 35 && !g.visible(x, z)); };

// Tove and the four kids are on the beach while the quest is open (out of sight they come and go)
export function beachPeople(mgr) {
  const g = mgr.game, open = mgr.isOpen('hytter'), P = mgr.beachFolk;
  const near = Math.hypot(g.player.x - TOVE_AT.x, g.player.z - TOVE_AT.z) < 140;
  if (open && !P && near && (hiddenFrom(g, TOVE_AT.x, TOVE_AT.z) || mgr.t < 0.5)) {
    mgr.beachFolk = {
      tove: spawnPed(g, TOVE_LOOK, TOVE_AT.x, TOVE_AT.z, TOVE_AT.h, 'tove'),
      kids: KIDS.map((k) => spawnPed(g, k.look, k.at[0], k.at[1], k.at[2], 'kid-' + k.id)),
    };
  } else if (P && (!open || !near) && !(mgr.active && mgr.active.id === 'hytter') && hiddenFrom(g, TOVE_AT.x, TOVE_AT.z)) {
    for (const q of [P.tove, ...P.kids]) removePed(g, q);
    mgr.beachFolk = null;
  }
}

export class HutsJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'hytter';
    this.stage = 'talk';   // talk → puzzle (ask, sign, answer) ⇄ answer → done
    this.prompt = null;
    const F = mgr.flags;
    this.tags = F.hutTags || (F.hutTags = [null, null, null, null]); // the kid on each hut's sign (kept if you leave and come back)
    this.heard = F.hutHeard || (F.hutHeard = []);                  // whose clues you have heard
    this.tries = F.hutTries || 0;
    this.titleCard = true;
  }

  get folk() {
    const g = this.game, m = this.mgr;
    if (!m.beachFolk) m.beachFolk = { tove: spawnPed(g, TOVE_LOOK, TOVE_AT.x, TOVE_AT.z, TOVE_AT.h, 'tove'), kids: KIDS.map((k) => spawnPed(g, k.look, k.at[0], k.at[1], k.at[2], 'kid-' + k.id)) };
    return m.beachFolk;
  }

  start() {
    const g = this.game, m = this.mgr, p = g.player, T = this.folk.tove;
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(T.x - p.x, T.z - p.z);
    T.standH = T.h = Math.atan2(p.x - T.x, p.z - T.z); T.body.h = T.h;
    const line = Math.atan2(T.x - p.x, T.z - p.z);
    g.camFocus = { x: (p.x + T.x) / 2, y: 0.5, z: (p.z + T.z) / 2, yaw: line - 0.6, owner: 'hytter', near: true };
    const again = !!m.flags.hutTalked;
    m.flags.hutTalked = true;
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: again ? this.summaryPages() : this.introPages() }), this);
  }

  introPages() {
    return [
      { ...TOVE, text: 'Hej! Tove, livräddare. Fyra ungar har badat hela dagen och glömt vilken badhytt de hyr. Och nycklarna hänger i fel hytter.' },
      { ...TOVE, text: 'Jag kan inte släppa vattnet med blicken. Fråga ungarna – de minns varsin sak. Alva, Bosse, Cleo och Dante. Typ.' },
      { ...YOU, text: 'Och sedan?' },
      { ...TOVE, text: 'Sätt rätt namnskylt på varje hytt. Säg till mig när du tror att det stämmer, så provar jag nycklarna. Men jag säger bara hur många som blev rätt!', last: 'OKEJ' },
    ];
  }

  summaryPages() {
    const lines = KIDS.filter((k) => this.heard.includes(k.id)).map((k) => `${k.name}: ”${k.clue.split('.')[0]}.”`);
    const missing = KIDS.filter((k) => !this.heard.includes(k.id)).map((k) => k.name);
    return [{ ...TOVE, text: lines.length ? `Det här har ungarna sagt hittills. ${lines.join(' ')}${missing.length ? ` Fråga ${missing.join(' och ')} också.` : ''}` : 'Fråga ungarna först – Alva, Bosse, Cleo och Dante. De minns varsin sak.', last: 'OKEJ' }];
  }

  update() {
    const g = this.game, m = this.mgr, p = g.player, F = this.folk;
    this.prompt = null;
    if (this.stage !== 'puzzle') return;
    if (Math.hypot(p.x - TOVE_AT.x, p.z - TOVE_AT.z) > 90) { m.quit(this, [WHO.tove, 'Skyltarna sitter kvar där du satte dem. Kom tillbaka och hjälp oss klart!']); return; }
    for (const [i, k] of KIDS.entries()) { const q = F.kids[i]; if (q && q.state === 'stand' && Math.hypot(p.x - q.x, p.z - q.z) < 8) q.standH = Math.atan2(p.x - q.x, p.z - q.z); }
    const tagged = this.tags.filter(Boolean).length;
    m.setObjective(`Badhyttsgåtan: ${tagged} av 4 skyltar`, `Ledtrådar: ${this.heard.length} av 4 · ${tagged === 4 ? 'säg till Tove!' : 'fråga ungarna, skylta hytterna'}`);
    if (p.state !== 'foot' || p.frozen) return;
    this.near = null;
    if (Math.hypot(p.x - F.tove.x, p.z - F.tove.z) < 2.0) { this.prompt = 'PRATA'; this.near = { tove: true }; return; }
    for (const [i, k] of KIDS.entries()) { const q = F.kids[i]; if (q && Math.hypot(p.x - q.x, p.z - q.z) < 1.9) { this.prompt = 'PRATA'; this.near = { kid: k, ped: q }; return; } }
    for (const h of HUTS) if (Math.hypot(p.x - h.door.x, p.z - h.door.z) < 1.2) { this.prompt = 'SKYLT'; this.near = { hut: h }; return; }
  }

  interact() {
    const g = this.game, m = this.mgr, p = g.player, n = this.near;
    if (!this.prompt || !n) return false;
    if (n.kid) {
      const k = n.kid;
      if (!this.heard.includes(k.id)) this.heard.push(k.id);
      n.ped.standH = n.ped.h = Math.atan2(p.x - n.ped.x, p.z - n.ped.z);
      p.h = Math.atan2(n.ped.x - p.x, n.ped.z - p.z);
      this.stage = 'read';
      g.emit('talk', { id: this.id, pages: [{ who: k.name, letter: k.letter, color: k.color, text: k.clue, last: this.heard.length === 4 ? 'NU VET JAG' : 'OKEJ' }] });
      return true;
    }
    if (n.hut) {
      // the next name on this hut's sign – skipping names already on another hut (take one off there
      // first to move it), and round to no sign at all
      const h = n.hut, cur = this.tags[h.i], order = [null, ...KIDS.map((k) => k.id)];
      const free = (id) => id === null || !this.tags.some((t, j) => t === id && j !== h.i);
      let nextId = cur;
      for (let step = 1; step <= order.length; step++) { const c = order[(order.indexOf(cur) + step) % order.length]; if (free(c)) { nextId = c; break; } }
      this.tags[h.i] = nextId;
      g.emit('salon', { kind: 'pick' });
      const k = KIDS.find((q) => q.id === nextId);
      g.emit('toast', { text: k ? `Den ${h.name} hytten: ${k.name}` : `Den ${h.name} hytten: ingen skylt`, long: false });
      return true;
    }
    if (n.tove) {
      const T = this.folk.tove;
      T.standH = T.h = Math.atan2(p.x - T.x, p.z - T.z);
      p.h = Math.atan2(T.x - p.x, T.z - p.z);
      this.stage = 'read';
      if (this.tags.filter(Boolean).length < 4) { g.emit('talk', { id: this.id, pages: this.summaryPages() }); return true; }
      // she tries the keys
      this.tries++; m.flags.hutTries = this.tries;
      const right = KIDS.filter((k) => this.tags[k.hut] === k.id).length;
      if (right === 4) {
        this.stage = 'won';
        this.amount = Math.max(HUT_PAY.min, HUT_PAY.base - HUT_PAY.wrong * (this.tries - 1));
        g.emit('keys', { item: 'hut' });
        g.emit('talk', { id: this.id, pages: [
          { ...TOVE, text: 'Klick, klick, klick, klick! Alla fyra nycklarna passar. Hur listade du ut det?' },
          { ...YOU, text: 'Bosse bredvid Cleo, Alva i mitten, Dante inte i den gula. Då blir det bara ett sätt.' },
          { ...TOVE, text: `Du borde bli livräddare. Eller detektiv. Här – ${fmt(this.amount)} kr ur glasskassan.`, last: 'TACK!' },
        ] });
      } else {
        g.emit('talk', { id: this.id, pages: [{ ...TOVE, text: right ? `Jag provade nycklarna: ${right} av 4 hytter stämmer. Vilka säger jag inte – då vore det för lätt!` : 'Jag provade nycklarna: ingen enda hytt stämmer. Fråga ungarna igen!', last: 'OKEJ' }] });
      }
      return true;
    }
    return false;
  }

  talkFx() {}

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'hytter') g.camFocus = null;
    if (this.stage === 'talk') {
      this.stage = 'puzzle';
      m.later(0.6, () => g.emit('hint', { id: 'hytter', touch: 'Gå fram till ungarna och tryck PRATA. Vid hyttdörrarna byter SKYLT namn.', keys: 'Gå fram till ungarna och tryck E. Vid hyttdörrarna byter E namn på skylten.' }), this);
      return;
    }
    if (this.stage === 'read') { this.stage = 'puzzle'; return; }
    if (this.stage !== 'won') return;
    this.stage = 'done';
    g.stats.hutTries = this.tries;
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Badhyttsgåtan', amount: this.amount });
    m.sms(WHO.tove, 'Ungarna har bytt om och badar igen. Dante har hoppat från svikten 41 gånger. Tack för hjälpen!', 12);
  }

  targets(T) {
    const F = this.mgr.beachFolk;
    if (!F || this.stage === 'done') return;
    T.push({ kind: 'contact', x: F.tove.x, z: F.tove.z, r: 1, letter: TOVE.letter, color: TOVE.color, badgeOnly: true, badgeY: 2.5, ref: F.tove });
    if (this.stage === 'talk') return;
    for (const [i, k] of KIDS.entries()) { const q = F.kids[i]; if (q) T.push({ kind: 'contact', x: q.x, z: q.z, r: 1, letter: k.letter, color: this.heard.includes(k.id) ? '#8a8f96' : k.color, badgeOnly: true, badgeY: 1.75, ref: q }); }
    for (const h of HUTS) {
      const k = KIDS.find((q) => q.id === this.tags[h.i]);
      T.push({ kind: 'contact', x: h.x, z: h.z, r: 1, letter: k ? k.letter : '?', color: k ? k.color : '#5a5f66', badgeOnly: true, badgeY: 3.2, always: true });
    }
  }

  cleanup() {
    const g = this.game;
    this.prompt = null;
    g.player.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'hytter') g.camFocus = null;
  }
}
