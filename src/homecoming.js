// Main quest, part 10: "Birger kommer hem" (v1.5). Tant Gun's neighbour is back from his cruise – and he
// won the bingo on board: a Sjuby Spider '62, an open red two-seater with chrome and white walls, the
// finest car in town. He hasn't driven since 1987, so you drive him home: first a little tour (Hörnlivs,
// Salong Saxen, Macken – he sits beside you and talks), then to his gate on Storgatan. Not a scratch on
// the paint, please: too many knocks and he walks home on his own. Afterwards the Spider is yours to
// borrow – it lives in the parking lot across the street from his house.
import { WHO, HOMECOMING as H } from './config.js';
import { STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed } from './hideout.js';

const BIRGER = { who: 'Birger', letter: 'B', color: '#e8833a' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
// white hair under a sailor's cap, glasses, an orange holiday shirt, beige trousers – and a tan
export const BIRGER_LOOK = { shirt: 0xf08a3a, pants: 0xd8c9a8, skin: 0xd9a070, hair: 0xeeeeea, height: 0.95, bulk: 1.12, style: ST.cap | ST.glasses, accent: 0xf4f1ea };
const CRASH_LINES = ['Lacken!', 'Min bingovinst!', 'Har du körkort?', 'Aj, kromen!', 'Försiktigt!'];

export function quayPages() {
  return [
    { ...BIRGER, text: 'Är det du som är vännen som Gun pratar om? Birger heter jag. Fem månader på kryssning – och titta vad jag vann på bingon!' },
    { ...YOU, text: 'En… bil?' },
    { ...BIRGER, text: 'En Sjuby Spider -62! Röd som lingonsylt. Det finns bara en i hela världen, sa bingovärden.' },
    { ...BIRGER, text: 'Problemet är att jag inte har kört sedan 1987. Kör du mig hem till Storgatan?' },
    { ...BIRGER, text: 'Men först vill jag se stan: Hörnlivs, Salong Saxen och Macken. Och inte en repa på lacken!', last: 'HOPPA IN' },
  ];
}
export function againPages() {
  return [{ ...BIRGER, text: 'Ett nytt försök. Hörnlivs, Salong Saxen, Macken – och sedan hem. Försiktigt med lacken den här gången!', last: 'HOPPA IN' }];
}
export function homePages(health) {
  return [
    { ...BIRGER, text: health > 90 ? 'Hemma! Och inte en repa. Du kör som en riktig chaufför.' : 'Hemma! Lite skrapmärken, men vad gör väl det.' },
    { ...BIRGER, text: 'Och pelargonerna lever – Gun har vattnat, ser jag. Men Pia ringde mig på båten. Elva cyklar i mitt vardagsrum? Och en nalle i min säng?' },
    { ...YOU, text: 'Det är en lång historia.' },
    { ...BIRGER, text: 'Den tar vi över en kopp kaffe. Men bilen… jag har inte kört sedan 1987, och jag tänker inte börja nu.' },
    { ...BIRGER, text: 'Spidern är din att låna. Den står på parkeringen mittemot – nyckeln sitter i. Kör snällt!', last: 'TACK!' },
  ];
}

const hiddenFrom = (g, x, z) => { const p = g.player, d = Math.hypot(x - p.x, z - p.z); return d > 70 || (d > 35 && !g.visible(x, z)); };

// Birger and the Spider wait on the quay while the quest is open (put there out of sight); afterwards
// the Spider is kept in its stall across the street from his house: back there when you have left it
// somewhere, a fresh one when it is a wreck – whenever nobody is looking.
export function homecomingWorld(mgr) {
  const g = mgr.game, busy = mgr.active && mgr.active.id === 'birger';
  if (busy) return;
  if (mgr.isOpen('birger')) {
    const B = mgr.birger, here = (q) => Math.hypot(q.x - H.birger.x, q.z - H.birger.z) < 2;
    if (!B || !g.peds.list.includes(B) || (!here(B) && hiddenFrom(g, B.x, B.z))) {
      if (hiddenFrom(g, H.birger.x, H.birger.z) || mgr.t < 0.5) { removePed(g, B); mgr.birger = spawnPed(g, BIRGER_LOOK, H.birger.x, H.birger.z, H.birger.h, 'birger'); }
    }
    const sp = g.spider;
    if ((!sp || sp.removed || sp.dead || (sp.driver === null && (Math.hypot(sp.x - H.car.x, sp.z - H.car.z) > 3 || sp.health < 99))) && (hiddenFrom(g, H.car.x, H.car.z) || mgr.t < 0.5) && (!sp || sp.removed || hiddenFrom(g, sp.x, sp.z))) {
      if (!sp || sp.driver !== 'player') { const v = g.spawnSpider(H.car.x, H.car.z, H.car.h); if (v) v.locked = true; } // (Birger's: not before you have met him)
    }
    return;
  }
  if (mgr.birger && mgr.done.has('birger') && hiddenFrom(g, mgr.birger.x, mgr.birger.z)) { removePed(g, mgr.birger); mgr.birger = null; }
  if (!mgr.done.has('birger')) return;
  if ((mgr.spiderT = (mgr.spiderT || 0) - 1 / 60) > 0) return;
  mgr.spiderT = 2;
  const S = H.spot, sp = g.spider;
  if (!sp || sp.removed || (sp.dead && sp.driver !== 'player' && hiddenFrom(g, sp.x, sp.z))) {
    if (hiddenFrom(g, S.x, S.z)) g.spawnSpider(S.x, S.z, S.h);
  } else if (sp.driver === null && Math.hypot(sp.x - S.x, sp.z - S.z) > 25 && hiddenFrom(g, sp.x, sp.z) && hiddenFrom(g, S.x, S.z)) {
    sp.x = S.x; sp.z = S.z; sp.h = S.h; sp.vx = sp.vz = sp.vy = sp.w = 0; sp.steer = 0; sp.air = false; sp.coastT = 0;
    sp.y = g.world.groundHeight(S.x, S.z); sp.input.throttle = 0; sp.input.park = true; sp.parkedSpot = true;
    sp.repair();
  }
}

export class HomecomingJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'birger';
    this.stage = 'talk';   // talk → board → tour (three stops) → home → final → done
    this.prompt = null;
    this.next = 0;
    this.titleCard = true;
  }

  get car() { const s = this.game.spider; return s && !s.removed ? s : null; }
  get inCar() { const p = this.game.player; return !!(p.inCar && p.car === this.car); }

  start() {
    const g = this.game, m = this.mgr, p = g.player;
    if (!m.birger || !g.peds.list.includes(m.birger)) m.birger = spawnPed(g, BIRGER_LOOK, H.birger.x, H.birger.z, H.birger.h, 'birger');
    // a fresh Spider on the quay for every try
    const sp = this.car;
    if (!sp || sp.dead || Math.hypot(sp.x - H.car.x, sp.z - H.car.z) > 3) g.spawnSpider(H.car.x, H.car.z, H.car.h);
    else sp.repair();
    this.car.locked = false;
    const B = m.birger;
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(B.x - p.x, B.z - p.z);
    B.standH = B.h = Math.atan2(p.x - B.x, p.z - B.z); B.body.h = B.h;
    const line = Math.atan2(B.x - p.x, B.z - p.z);
    g.camFocus = { x: (p.x + B.x) / 2, y: 0.4, z: (p.z + B.z) / 2, yaw: line - 0.6, owner: 'birger', near: true };
    const again = !!m.flags.birgerTalked;
    m.flags.birgerTalked = true;
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: again ? againPages() : quayPages() }), this);
  }

  // Birger: in the passenger seat while you drive (the car's right), or standing by the door waiting
  seatBirger() {
    const g = this.game, B = this.mgr.birger, car = this.car;
    if (!B || !car) return;
    if (this.inCar || (this.stage !== 'board' && car.driver === null && car.speed < 0.5)) {
      const s = car.local(0.38, -0.72), b = B.body;
      B.x = s.x; B.z = s.z; B.y = (car.visY ?? car.y) + 0.66 - 0.92 * BIRGER_LOOK.height;
      B.h = B.standH = car.h; B.state = 'lounge'; B.keep = true;
      b.x = B.x; b.y = B.y; b.z = B.z; b.h = B.h; b.pose = 5; b.headYaw = 0; b.headPitch = 0.05; b.lie = 0; b.legAmp = 0; b.armAmp = 0;
      this.seated = true;
    }
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, car = this.car;
    this.prompt = null;
    if (this.stage === 'talk' || this.stage === 'final' || this.stage === 'done') return;
    if (!car) { m.fail(this, 'Spidern försvann'); return; }
    if (car.dead || car.health < H.minHealth) { this.fed(); return; }
    this.seatBirger();
    const lack = `Lacken ${Math.round(car.health)} %`;
    if (this.stage === 'board') {
      if (this.inCar) {
        this.stage = 'tour';
        g.emit('toast', { text: 'Först en sväng runt stan: Hörnlivs, Salong Saxen och Macken. Sedan hem!', long: true });
        m.later(1.2, () => g.emit('say', { who: m.birger, text: 'Vilken motor! Hör du hur den spinner?' }), this);
        return;
      }
      m.setObjective('Hoppa in i Spidern', 'Den röda cabrioleten på kajen');
      return;
    }
    if (!this.inCar) { m.setObjective('Tillbaka till Spidern', `Birger väntar i bilen · ${lack}`); return; }
    if (car.speed > 24 && !this.fastSaid) { this.fastSaid = true; g.emit('say', { who: m.birger, text: 'Wiii! Precis som när färjan gungade!' }); }
    if (this.stage === 'tour') {
      const S = H.stops[this.next];
      if (Math.hypot(car.x - S.x, car.z - S.z) < S.r) {
        g.emit('say', { who: m.birger, text: ['Hörnlivs! Säljer Yasmin fortfarande lakritsbåtar? Fem månader utan lakritsbåtar…', 'Salong Saxen. Vera klippte mig 1999. Det har aldrig riktigt vuxit ut igen.', 'Macken! Där köpte jag min första korv med bröd. 1961. Den var god.'][this.next] });
        g.emit('checkpoint', {});
        this.next++;
        if (this.next >= H.stops.length) { this.stage = 'home'; m.later(3.2, () => g.emit('toast', { text: 'Nu hem till Birgers grind på Storgatan!', long: false }), this); }
        return;
      }
      m.setObjective(`Visa Birger stan: ${S.name}`, `${S.where} · ${this.next + 1} av ${H.stops.length} · ${lack}`);
      return;
    }
    if (this.stage === 'home') {
      if (Math.hypot(car.x - H.home.x, car.z - H.home.z) < H.home.r && car.speed < 2.5) { this.arrive(); return; }
      m.setObjective('Kör Birger hem', `Hans grind på Storgatan · stanna utanför · ${lack}`);
    }
  }

  onCrash(e) {
    const g = this.game, car = this.car;
    if (!car || e.car !== car || !e.player || e.impact < 3 || this.stage === 'talk' || this.stage === 'final') return;
    if ((this.sayT || 0) > g.time) return;
    this.sayT = g.time + 2.5;
    g.emit('say', { who: this.mgr.birger, text: CRASH_LINES[Math.floor(g.rng() * CRASH_LINES.length)] });
  }

  // too many knocks: Birger has had enough
  fed() {
    const g = this.game, m = this.mgr, p = g.player, car = this.car, B = m.birger;
    if (this.inCar) p.exitCar();
    if (car) { car.input.throttle = 0; car.input.park = true; }
    if (B && car) {
      const s = car.local(1.6, 0);
      B.x = s.x; B.z = s.z; B.y = g.world.groundHeight(s.x, s.z); B.state = 'angry'; B.stateT = 0; B.standH = car.h; B.body.pose = 0;
      g.emit('say', { who: B, text: 'Nu räcker det! Jag går hem själv.' });
    }
    m.fail(this, 'Birger tröttnade på bucklorna', [WHO.gun, 'Birger kom hem till fots och svor över lacken. Bilen står kvar på kajen igen – försök en gång till, lilla vän.']);
  }

  arrive() {
    const g = this.game, m = this.mgr, p = g.player, car = this.car, B = m.birger;
    this.stage = 'final';
    this.health = Math.round(car.health);
    car.vx = car.vz = car.w = 0; car.input.throttle = 0;
    p.exitCar();
    car.input.park = true;
    B.x = H.home.x + 0.4; B.z = H.home.z - 3.6; B.y = g.world.groundHeight(B.x, B.z); B.state = 'stand';
    B.body.pose = 0; B.body.x = B.x; B.body.y = B.y; B.body.z = B.z;
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(B.x - p.x, B.z - p.z);
    B.standH = B.h = Math.atan2(p.x - B.x, p.z - B.z); B.body.h = B.h;
    const line = Math.atan2(B.x - p.x, B.z - p.z);
    g.camFocus = { x: (p.x + B.x) / 2, y: 0.4, z: (p.z + B.z) / 2, yaw: line - 0.6, owner: 'birger', near: true };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: homePages(this.health) }), this);
  }

  talkFx() {}

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'talk') {
      this.stage = 'board';
      p.frozen = false;
      if (g.camFocus && g.camFocus.owner === 'birger') g.camFocus = null;
      const B = m.birger;
      if (B) B.goto([[this.car.local(1.6, 0).x, this.car.local(1.6, 0).z]], 1.0);
      g.emit('toast', { text: 'Hoppa in i Spidern – Birger sätter sig bredvid dig.', long: true });
      return;
    }
    if (this.stage !== 'final') return;
    this.stage = 'done';
    const amount = H.reward + H.perHealth * this.health;
    g.stats.spiderCond = this.health;
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Birger kommer hem', amount });
    m.later(4.2, () => g.emit('toast', { text: 'Sjuby Spider -62 är din att låna. Den står på parkeringen mittemot Birgers hus.', long: true }));
    m.sms(WHO.gun, `Birger säger att du körde som en ${this.health > 90 ? 'filmstjärna' : 'riktig chaufför'}. Och han skrattade så han grät åt cyklarna. Tack, lilla vän.`, 9);
  }

  targets(T) {
    const car = this.car, B = this.mgr.birger;
    if (B && (this.stage === 'talk' || this.stage === 'board' || this.stage === 'final')) T.push({ kind: 'contact', x: B.x, z: B.z, r: 1, letter: BIRGER.letter, color: BIRGER.color, badgeOnly: true, badgeY: 2.6, ref: B });
    if (!car) return;
    if (this.stage === 'board' || (!this.inCar && (this.stage === 'tour' || this.stage === 'home'))) { T.push({ kind: 'car', car, color: 0x46c96f, gps: true }); return; }
    if (this.stage === 'tour') {
      const S = H.stops[this.next];
      T.push({ kind: 'zone', x: S.x, z: S.z, r: S.r, gps: true });
      const N = H.stops[this.next + 1];
      if (N) T.push({ kind: 'zone', x: N.x, z: N.z, r: N.r, gps: false, mapOnly: true });
    } else if (this.stage === 'home') T.push({ kind: 'zone', x: H.home.x, z: H.home.z, r: H.home.r, gps: true });
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'birger') g.camFocus = null;
    const B = m.birger;
    if (B && B.state === 'lounge') { const s = this.car ? this.car.local(1.6, 0) : B; B.x = s.x; B.z = s.z; B.y = g.world.groundHeight(B.x, B.z); B.state = 'stand'; B.body.pose = 0; }
    if (this.stage === 'done' && B) B.goto([[H.home.x - 0.2, H.home.z - 7.5]], 0.9); // up the garden path, home at last
  }
}
