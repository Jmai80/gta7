// Going in and out of the dark tower – and Hörnlivs on Kungsgatan (v0.6.1). The insides
// (interior.js, shop.js) are built out at sea: going in is a fade to black (and a lift ride in the
// tower), and the town is hidden while you are in there. Melker lives up in the tower; he is only
// around while you are inside. `where` says which place you are in: 'tower', 'shop' or 'office'
// (Bullbilen's bakery office, v0.7), 'salon' (Vera's hair salon on Skolgatan, v1.0) or 'birger'
// (tant Gun's neighbour's house on Storgatan, Jonte's hideout, v1.2), 'nova' (v1.4) or 'chapel'
// (Söderholmens kapell, v1.9: you walk in yourself, and kyrkoherde Inga stands at the altar).
import { TOWER_DOOR, LIVS_DOOR, OFFICE_DOOR, SALON_DOOR, BIRGER, NOVA_DOOR } from './config.js';
import { INT } from './interior.js';
import { SHOP } from './shop.js';
import { OFFICE } from './office.js';
import { SALON } from './salon.js';
import { HOUSE } from './birger.js';
import { ROOM as NOVA_ROOM } from './nova.js';
import { CHAPEL, CHAPEL_DOOR } from './chapel.js';
import { Ped, STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed } from './hideout.js';
import { seat } from './barber.js';

// the places with a door you walk through (the tower has its lift): inside, and where you come out
export const PLACES = {
  shop: { inside: SHOP, out: { x: LIVS_DOOR.x - 1.1, z: LIVS_DOOR.z - 0.6, h: Math.PI } },     // Hörnlivs → Kungsgatan, facing north
  office: { inside: OFFICE, out: { x: OFFICE_DOOR.x - 1.0, z: OFFICE_DOOR.z + 0.4, h: Math.PI } }, // the bakery office → out by the west wall
  salon: { inside: SALON, out: { x: SALON_DOOR.x + 1.0, z: SALON_DOOR.z + 0.3, h: 0 } },           // Salong Saxen → Skolgatan, facing south (v1.0)
  nova: { inside: NOVA_ROOM, out: { x: NOVA_DOOR.x, z: NOVA_DOOR.z + 0.6, h: 0 } },                // Nova's room → Skolgatan, facing the street (v1.4)
  birger: { inside: HOUSE, out: { x: BIRGER.door.x, z: BIRGER.door.z + 0.5, h: 0 } },               // Birger's house → his garden path, facing the street (v1.2)
  chapel: { inside: CHAPEL, out: { x: CHAPEL_DOOR.x, z: CHAPEL_DOOR.z - 0.7, h: Math.PI } },         // the chapel → the gravel path, facing north (v1.9)
};

// the people in the chapel: Inga in black with a white collar, and three in the pews
const INGA_LOOK = { shirt: 0x1d1f22, pants: 0x1d1f22, skin: 0xf0c8a8, hair: 0xc9c5bd, height: 0.98, bulk: 1.06, style: ST.bun | ST.glasses | ST.jacket, accent: 0xf4f4f0 };
const PEW_LOOKS = [
  { shirt: 0x6b6f3a, pants: 0x3a3c41, skin: 0xe9c3a6, hair: 0xb0b0b0, height: 1.0, bulk: 1.1, style: ST.beard | ST.jacket, accent: 0x4a3a2a },
  { shirt: 0xb5466a, pants: 0x24365e, skin: 0xc68e62, hair: 0x2b1d14, height: 0.95, bulk: 1.0, style: ST.long, accent: 0xb5466a },
  { shirt: 0x9db8cc, pants: 0x2b2e35, skin: 0xf2d0b5, hair: 0xe0e0dc, height: 0.94, bulk: 1.05, style: ST.bun | ST.glasses, accent: 0x9db8cc },
];
const INGA = { who: 'Kyrkoherde Inga', letter: 'I', color: '#6b4fa0' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
// what Inga says when you come back (one each time, in turn)
const INGA_AGAIN = [
  'Gun skickar fortfarande en påse bullar till kyrkkaffet varje söndag. Ingen vet hur hon får dem så goda.',
  'Telefonkiosken nere vid hamnen ringer ibland, har jag hört. Jag har aldrig vågat svara. Har du?',
  'Folk som just åkt Måsen kommer in hit och sitter alldeles tysta en stund. Sedan lägger de en tjuga i kollekten.',
  'Fyrvaktaren Ingvar kommer hit ibland och sätter sig längst bak. Han säger aldrig något. Jag tror att han bär på en hemlighet.',
  'Kör försiktigt över bron. Jag ber för alla bilister i Sjuby – det verkar behövas.',
];
import { Samuel } from './samuel.js';

const FADE = 0.5;  // seconds of black before the move

export class Indoors {
  constructor(game) {
    this.game = game;
    this.inside = false;
    this.where = null;     // 'tower' | 'shop' | 'office' | 'salon' | 'birger' | 'nova'
    this.busy = false;     // fading in or out
    this.timers = [];
    this.samuel = null;
    this.prompt = null;
    this.door = game.layout.colliders.find((c) => c.door === 'samuel') || null; // Melker's front door
    this.chapelFolk = [];  // Inga first, then the three in the pews (only while you are in there)
  }

  get priest() { return this.chapelFolk[0] || null; }

  get doorShut() { return !!(this.door && this.door.h > 0); }
  shutDoor() { if (this.door) this.door.h = this.door.hClosed; }
  openDoor() { if (this.door) this.door.h = 0; }

  after(delay, fn) { this.timers.push({ t: this.game.time + delay, fn }); }

  // the lift up to floor 7, or in through the shop door (the job calls this when you walk in)
  enter(done, where = 'tower') {
    if (this.busy || this.inside) return;
    const g = this.game;
    this.busy = true;
    g.emit('fade', { on: true });
    this.after(FADE, () => {
      this.inside = true;
      this.where = where;
      if (where === 'tower') {
        if (!this.game.mission.done.has('samuel')) this.openDoor();
        this.samuel = new Samuel(g);
        this.place(INT.spawn.x, INT.spawn.z, INT.spawn.h);
      } else { const S = PLACES[where].inside.spawn; this.place(S.x, S.z, S.h); }
      if (where === 'chapel') this.fillChapel();
      g.emit('indoor', { on: true });
      if (done) done();
    });
    this.after(FADE + 0.35, () => { g.emit('fade', { on: false }); this.busy = false; });
  }

  // back down and out onto the square (or out of the shop onto Kungsgatan)
  exit(done) {
    if (this.busy || !this.inside) return;
    const g = this.game;
    this.busy = true;
    g.emit('fade', { on: true });
    this.after(FADE, () => {
      this.inside = false;
      if (this.samuel) { this.samuel.remove(); this.samuel = null; }
      for (const q of this.chapelFolk) removePed(g, q);
      this.chapelFolk = [];
      const P = PLACES[this.where];
      if (P) this.place(P.out.x, P.out.z, P.out.h); // out through the door you came in by
      else this.place(TOWER_DOOR.x, TOWER_DOOR.z + 2.4, 0); // a few steps out on the square
      this.where = null;
      g.emit('indoor', { on: false });
      if (done) done();
    });
    this.after(FADE + 0.35, () => { g.emit('fade', { on: false }); this.busy = false; });
  }

  place(x, z, h) {
    const g = this.game, p = g.player;
    p.x = x; p.z = z; p.h = h; p.vx = p.vz = p.vy = 0;
    p.y = g.world.groundHeight(x, z);
    p.state = 'foot';
    p.body.lie = 0;
    g.emit('warp', { h });
  }

  update(dt) {
    const g = this.game;
    for (let i = 0; i < this.timers.length; i++) {
      if (g.time < this.timers[i].t) continue;
      const q = this.timers.splice(i, 1)[0]; i--;
      q.fn();
    }
    this.prompt = null;
    const p = g.player;
    if (!this.inside) {
      // (v1.9) the chapel door on Söderholmen: walk in whenever no job is running
      if (!this.busy && !p.frozen && p.state === 'foot' && !g.mission.active && Math.hypot(p.x - CHAPEL_DOOR.x, p.z - CHAPEL_DOOR.z) < CHAPEL_DOOR.r) this.prompt = 'GÅ IN';
      return;
    }
    if (this.samuel) this.samuel.update(dt);
    if (this.busy || p.frozen || p.state !== 'foot') return;
    if (this.where === 'chapel' && this.priest && Math.hypot(p.x - CHAPEL.talk.x, p.z - CHAPEL.talk.z) < CHAPEL.talk.r) { this.prompt = 'PRATA'; return; }
    if (this.where === 'tower' && Math.hypot(p.x - INT.lift.x, p.z - INT.lift.z) < INT.lift.r) this.prompt = 'HISS';
    const P = PLACES[this.where];
    if (P && !this.noExit && Math.hypot(p.x - P.inside.door.x, p.z - P.inside.door.z) < P.inside.door.r) this.prompt = 'GÅ UT';
  }

  interact() {
    if (this.prompt === 'HISS') { this.game.emit('toast', { text: 'Hissen ner…' }); this.exit(); return true; }
    if (this.prompt === 'GÅ UT') { this.exit(); return true; }
    if (this.prompt === 'GÅ IN') { this.enter(null, 'chapel'); return true; }
    if (this.prompt === 'PRATA' && this.where === 'chapel') { this.talkToInga(); return true; }
    return false;
  }

  // ---- the chapel (v1.9)
  fillChapel() {
    const g = this.game;
    for (const q of this.chapelFolk) removePed(g, q);
    const P = CHAPEL.priest;
    this.chapelFolk = [spawnPed(g, INGA_LOOK, P.x, P.z, P.h, 'inga')];
    for (const S of CHAPEL.sitters) this.chapelFolk.push(seat(new Ped(g, PEW_LOOKS[S.look]), S, 'pew'));
    for (const q of this.chapelFolk.slice(1)) g.peds.add(q);
    if (!g.stats.chapel) g.emit('toast', { text: 'Söderholmens kapell. Det är alldeles tyst härinne.' });
  }

  talkToInga() {
    const g = this.game, p = g.player, q = this.priest;
    const n = g.stats.chapel = (g.stats.chapel || 0) + 1;
    p.vx = p.vz = 0;
    p.h = Math.atan2(q.x - p.x, q.z - p.z);
    q.standH = q.h = q.body.h = Math.atan2(p.x - q.x, p.z - q.z);
    g.camFocus = { x: (p.x + q.x) / 2, y: 0.5, z: (p.z + q.z) / 2, yaw: p.h - 0.6, owner: 'inga', near: true };
    const pages = n === 1 ? [
      { ...INGA, text: 'Välkommen till Söderholmens kapell! Stäng dörren efter dig, så hör man nästan inte Måsen.' },
      { ...INGA, text: 'Jag är kyrkoherde Inga. Har du kommit för att tända ett ljus, eller bara för att vila benen en stund?' },
      { ...YOU, text: 'Lite av båda, tror jag.' },
      { ...INGA, text: 'Sätt dig var du vill. Bänkarna är hårda, men de har hållit sedan 1890.' },
      { ...INGA, text: 'Tant Gun och hennes Arne gifte sig här, vet du. Sommaren 1972. Arne hade kanelbullar i kavajfickan under hela vigseln – det luktade bageri ända fram till altaret.', last: 'TACK, INGA' },
    ] : [{ ...INGA, text: INGA_AGAIN[(n - 2) % INGA_AGAIN.length], last: 'TACK, INGA' }];
    g.emit('talk', { id: 'inga', pages });
  }

  // the dialogue is closed: Inga turns back to the pews
  talkDone(id) {
    if (id !== 'inga') return;
    const g = this.game, q = this.priest;
    if (q) q.standH = q.h = q.body.h = CHAPEL.priest.h;
    if (g.camFocus && g.camFocus.owner === 'inga') g.camFocus = null;
  }
}
