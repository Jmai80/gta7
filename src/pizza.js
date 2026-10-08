// "Pizzabudet" – Sanna's job: take the pizza car and get three pizzas to three addresses
// while they are still hot. Crashes squash the pizzas (smaller tips); cold pizzas pay little.
import { WHO, PIZZERIA, PIZZA_STOPS, PIZZA_TIME_OUT } from './config.js';
import { Ped, makeLook } from './peds.js';
import { fmt, mmss } from './rng.js';

const GREEN = 0x46c96f;
const STOP_R = 4;
const LINES = {
  warm: ['Tack! Den doftar ljuvligt!', 'Äntligen, jag svälter!', 'Behåll växeln!', 'Varm och fin. Tack!'],
  messy: ['Varför sitter osten på locket?', 'Har du krockat med den?', 'Den ser ut som en pannkaka…'],
  cold: ['Den är ju iskall!', 'Det här är en glasspizza.', 'Jag beställde för en evighet sen!'],
  lasse: ['Kebabpizza! Ställ den på motorhuven.'],
};

export class PizzaJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'pizza';
    this.stage = 'getcar';
    this.stops = [];
    this.left = 0; this.cold = false; this.cond = 100; this.outT = 0; this.toastT = 0;
    this.delivered = 0; this.warm = 0;
  }

  start() {
    const g = this.game, m = this.mgr;
    this.car = m.ensurePizzaCar();
    // three addresses spread around town
    const pool = PIZZA_STOPS.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(g.rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (const s of pool) {
      if (this.stops.length === 3) break;
      if (this.stops.some((q) => Math.hypot(q.x - s.x, q.z - s.z) < 45)) continue;
      this.stops.push({ ...s, done: false, ped: null });
    }
    m.sms(WHO.sanna, 'Tre pizzor ska ut, och de måste vara varma. Ta pizzabilen och kör försiktigt – en kebabpizza tål inte en krock.', 3.2, this);
    const hint = 'Pizzabilen står på parkeringen mittemot. Följ den gröna pilen.';
    m.later(3.2, () => { if (this.stage === 'getcar') g.emit('hint', { id: 'pizzacar', touch: hint, keys: hint }); }, this);
    this.update(0);
  }

  // first time in the pizza car: the addresses show up and the clock starts
  begin() {
    const g = this.game;
    this.stage = 'deliver';
    this.left = Math.round((45 + bestTour(this.car, this.stops) / 9) / 5) * 5;
    for (const s of this.stops) {
      const ped = new Ped(g, makeLook(g.rng));
      ped.x = s.cx; ped.z = s.cz; ped.y = g.world.groundHeight(s.cx, s.cz);
      ped.standH = Math.atan2(s.x - s.cx, s.z - s.cz);
      ped.h = ped.standH;
      ped.state = 'stand';
      ped.keep = true;
      ped.pickNearestLoop();
      g.peds.add(ped);
      s.ped = ped;
    }
    g.emit('toast', { text: `Tre adresser på kartan. Du har ${mmss(this.left)} innan pizzorna kallnar!`, long: true });
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    const car = this.car;
    if (!car || car.removed || car.dead) {
      if (this.stage === 'getcar' && !(car && car.dead)) { this.car = m.ensurePizzaCar(); return; }
      m.fail(this, 'Pizzabilen är skrot', [WHO.sanna, 'Vad har du gjort med pizzabilen?! Kom tillbaka när du har lugnat ner dig.']);
      return;
    }
    const inPz = p.inCar && p.car === car;
    this.toastT -= dt;
    if (this.stage === 'getcar') {
      if (!inPz) {
        if (Math.hypot(p.x - PIZZERIA.x, p.z - PIZZERIA.z) > 90) {
          m.quit(this, [WHO.sanna, 'Ingen fara, jag värmer pizzorna igen. Kom förbi pizzerian när du har tid!']);
          return;
        }
        m.setObjective('Hoppa in i pizzabilen', '');
        return;
      }
      this.begin();
    }
    // the pizzas cool down from the moment you take the car
    if (!this.cold) {
      this.left -= dt;
      if (this.left <= 0) { this.cold = true; g.emit('toast', { text: 'Pizzorna har kallnat! Leverera dem ändå.', long: true }); }
    }
    for (const s of this.stops) if (s.ped) s.ped.wave = Math.hypot(car.x - s.cx, car.z - s.cz) < 30;
    if (inPz) {
      this.outT = 0;
      for (const s of this.stops) {
        if (s.done) continue;
        const d = Math.hypot(car.x - s.x, car.z - s.z);
        if (d < STOP_R && car.speed < 3 && !car.air) { this.deliver(s); if (this.over) return; break; }
        if (d < STOP_R + 2 && car.speed >= 3) g.emit('hint', { id: 'stopin', touch: 'Stanna i den gula cirkeln', keys: 'Stanna i den gula cirkeln' });
      }
      const n = this.stops.filter((s) => !s.done).length;
      const cond = this.cond < 100 ? ` · skick ${Math.round(this.cond)} %` : '';
      m.setObjective('Leverera pizzorna', this.cold ? `Kalla pizzor · ${n} kvar` : `${n} kvar · ${mmss(Math.ceil(this.left))}${cond}`);
    } else {
      this.outT += dt;
      if (this.outT > PIZZA_TIME_OUT) {
        m.fail(this, 'Du övergav pizzorna', [WHO.sanna, 'Kunderna ringer och klagar! Var tog du vägen?']);
        return;
      }
      m.setObjective('Tillbaka till pizzabilen', mmss(Math.ceil(PIZZA_TIME_OUT - this.outT)));
    }
  }

  deliver(s) {
    const g = this.game, m = this.mgr;
    s.done = true;
    this.delivered++;
    const warm = !this.cold;
    const tip = warm ? Math.round((200 * this.cond) / 100 / 10) * 10 : 0;
    const pay = warm ? 250 + tip : 50;
    if (warm) this.warm++;
    g.stats.pizzas = (g.stats.pizzas || 0) + 1;
    m.pay(pay);
    g.emit('toast', { text: warm ? `Pizza ${this.delivered}/3 levererad! +${fmt(pay)} kr (${fmt(tip)} kr dricks)` : `Kall pizza ${this.delivered}/3… bara ${pay} kr.` });
    g.emit('delivered', { n: this.delivered });
    const ped = s.ped;
    if (ped) {
      const kind = !warm ? 'cold' : this.cond < 60 ? 'messy' : s.lasse ? 'lasse' : 'warm';
      const lines = LINES[kind];
      g.emit('say', { who: ped, text: lines[Math.floor(g.rng() * lines.length)] });
      ped.wave = false;
      s.ped = null;
      m.later(2.5, () => goHome(ped));
    }
    if (this.delivered === this.stops.length) this.finish();
  }

  finish() {
    const m = this.mgr;
    const allWarm = this.warm === this.stops.length;
    m.complete(this, { title: 'UPPDRAG KLART', sub: allWarm ? 'Pizzabudet · varma pizzor' : 'Pizzabudet', amount: allWarm ? 500 : 0 });
    const text = allWarm ? 'Bra jobbat! Kunderna är nöjda. Pizzabilen får du låna när du vill.'
      : this.warm > 0 ? 'Några kalla pizzor, men du kom fram. Tack! Pizzabilen får du låna när du vill.'
        : 'Iskalla pizzor… Kunderna gnäller. Men tack ändå. Pizzabilen får du låna när du vill.';
    m.sms(WHO.sanna, text, 3.4);
  }

  // crashes in the pizza car squash the pizzas
  onCrash(e) {
    if (this.stage !== 'deliver') return;
    const p = this.game.player;
    const mine = e.car === this.car || (e.landing && p.car === this.car);
    if (!mine || e.impact <= 6) return;
    const before = this.cond;
    this.cond = Math.max(0, this.cond - (e.impact - 6) * 6);
    if (before - this.cond >= 4 && this.toastT <= 0) {
      this.toastT = 4;
      this.game.emit('toast', { text: this.cond < 40 ? 'Pizzorna är mos nu…' : 'Aj! Pizzorna for runt i kartongerna.' });
    }
  }

  targets(T) {
    const p = this.game.player, car = this.car;
    if (!car || car.removed) return;
    if (!(p.inCar && p.car === car)) { T.push({ kind: 'car', car, color: GREEN }); return; }
    for (const s of this.stops) if (!s.done) T.push({ kind: 'zone', x: s.x, z: s.z, r: STOP_R, gps: true });
  }

  cleanup() {
    this.over = true;
    for (const s of this.stops) if (s.ped) { goHome(s.ped); s.ped = null; }
  }
}

function goHome(ped) {
  ped.wave = false;
  ped.keep = false;
  ped.standH = null;
  if (ped.state === 'stand') { ped.state = 'walk'; ped.idleT = 30; }
}

// a generous estimate of the shortest round: Manhattan distances, best order of the three stops
function bestTour(from, stops) {
  const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  let best = Infinity;
  for (const o of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
    const [a, b, c] = o.map((i) => stops[i]);
    if (!a || !b || !c) return 600;
    best = Math.min(best, man(from, a) + man(a, b) + man(b, c));
  }
  return best;
}
