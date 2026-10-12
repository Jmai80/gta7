// Side quest "Fredagsrusningen" (v1.13), indoors at Pizzeria Sjuan. Pino, Sanna's pizza baker for thirty
// years, has burnt his hand on the oven – on a Friday night with every table taken. You bake: take a base
// at the dough bench (tomato sauce and cheese already on), put on what the ticket says from the five
// bins, bake it in the wood-fired oven (golden, not black: take it out in time), and hand it through the
// pass to Sanna, who carries it out. Six orders come in over a couple of minutes; each guest waits only
// so long. Four or more out in time and the evening is saved. Pure simulation: render.js draws the pizzas
// (`job.hand`, `job.oven`, `job.carried`, `job.tablePizzas`), main.js the tickets (`job.tickets`).
import { WHO, PIZZERIA } from './config.js';
import { PIZZA_ROOM as R, TOPPINGS } from './pizzeria.js';
import { Ped, STYLE_BITS as ST } from './peds.js';
import { seat } from './barber.js';
import { spawnPed, removePed } from './hideout.js';
import { fmt } from './rng.js';

export const MENU = {
  margherita: { name: 'Margherita', top: [] },
  vesuvio: { name: 'Vesuvio', top: ['skinka'] },
  capricciosa: { name: 'Capricciosa', top: ['skinka', 'svamp'] },
  hawaii: { name: 'Hawaii', top: ['skinka', 'ananas'] },
  kebab: { name: 'Kebabpizza', top: ['kebab'] },
  pino: { name: 'Pinos special', top: ['skinka', 'svamp', 'rakor'] },
};
// the evening: when each ticket comes in (seconds after you start), what, and for whom
export const RUSH = {
  mark: { x: PIZZERIA.x, z: PIZZERIA.z, r: PIZZERIA.r },
  orders: [
    { at: 0, pizza: 'vesuvio', table: 1 },
    { at: 9, pizza: 'capricciosa', table: 3 },
    { at: 34, pizza: 'hawaii', table: 2 },
    { at: 56, pizza: 'margherita', table: 4 },
    { at: 78, pizza: 'kebab', table: 'lasse' },
    { at: 100, pizza: 'pino', table: 'pino' },
  ],
  patience: 90,          // seconds a ticket waits before the guest gives up
  ready: 8, burnt: 17,   // seconds in the oven: golden from 8, black from 17
  need: 4,               // pizzas out in time for the evening to count
  pay: { pizza: 100, tip: 80, all: 200 },
};
export const RUSH_MAX = RUSH.orders.length * (RUSH.pay.pizza + RUSH.pay.tip) + RUSH.pay.all;
const TOP = Object.fromEntries(TOPPINGS.map((t) => [t.id, t]));
const TABLE = Object.fromEntries(R.tables.map((T) => [T.id, T]));
export const sameTop = (a, b) => a.length === b.length && a.every((t) => b.includes(t));
export const topText = (top) => (top.length ? top.map((t) => TOP[t].name).join(', ') : 'bara tomatsås och ost');
const whoFor = (o) => (o.table === 'lasse' ? 'Lasse (hämtar)' : o.table === 'pino' ? 'Pino' : `Bord ${o.table}`);

const SANNA = { who: 'Sanna', letter: 'S', color: '#46c96f' };
const PINO = { who: 'Pino', letter: 'P', color: '#d9534f' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
// Sanna: dark curls under a green cap, the pizzeria's green apron; Pino: big, a moustache, whites
export const SANNA_LOOK = { shirt: 0xf4f1ec, pants: 0x2b2e35, skin: 0xd9a27e, hair: 0x2b1d14, height: 0.96, bulk: 1.0, style: ST.long | ST.cap | ST.apron, accent: 0x2e7a46 };
export const PINO_LOOK = { shirt: 0xf8f8f4, pants: 0x3a3c41, skin: 0xe0b08a, hair: 0x2a2420, height: 1.04, bulk: 1.25, style: ST.beard | ST.baker | ST.apron, accent: 0xf8f8f4 };
const GUEST_LOOKS = [
  { shirt: 0x2c62a8, pants: 0x2b2e35, skin: 0xf0c8a8, hair: 0x6a4a2a, height: 1.0, bulk: 1.05, style: ST.glasses, accent: 0x2c62a8 },
  { shirt: 0xe8833a, pants: 0x24365e, skin: 0xc68e62, hair: 0x1a1414, height: 0.95, bulk: 0.95, style: ST.long, accent: 0xe8833a },
  { shirt: 0x6b6f3a, pants: 0x3a3c41, skin: 0xe9c3a6, hair: 0xb0b0b0, height: 1.0, bulk: 1.15, style: ST.beard | ST.jacket, accent: 0x4a3a2a },
  { shirt: 0xb5466a, pants: 0x2b2e35, skin: 0xf2d0b5, hair: 0xd9b25a, height: 0.92, bulk: 0.95, style: ST.bun, accent: 0xb5466a },
  { shirt: 0x3d7a5a, pants: 0x2b2e35, skin: 0x8a5a3a, hair: 0x1a1414, height: 1.02, bulk: 1.0, style: ST.cap, accent: 0x3d7a5a },
  { shirt: 0xf2efe6, pants: 0x5a4632, skin: 0xf0c8a8, hair: 0xc9c5bd, height: 0.94, bulk: 1.1, style: ST.bun | ST.glasses, accent: 0x9db8cc },
];
// who sits where: [table, seat (0 west, 1 east)]
const GUESTS = [[1, 0], [1, 1], [2, 1], [3, 0], [3, 1], [4, 0]];

export function introPages() {
  return [
    { ...SANNA, text: 'Där är du! Fredagskväll, fullt i matsalen – och titta på Pino.' },
    { ...PINO, text: 'Jag tog i ugnen utan handske. Trettio år, och första gången. Mamma mia.' },
    { ...SANNA, text: 'Du har kört ut mina pizzor. I kväll får du baka dem. Jag tar beställningarna och bär ut – du står i köket.' },
    { ...PINO, text: 'Det är enkelt. Ta en botten vid degbänken – tomatsås och ost är redan på. Lägg på det som står på lappen.' },
    { ...PINO, text: 'In i ugnen. Ta ut den när den är gyllene – INTE svart. Sedan i luckan till Sanna.' },
    { ...SANNA, text: 'Lapparna sitter här uppe. Ingen väntar hur länge som helst, och fredagar är folk hungriga. Kör!', last: 'KÖR!' },
  ];
}
export function againPages() {
  return [
    { ...SANNA, text: 'En ny fredagskväll, fullt igen. Pino har fortfarande bandage. Samma som sist: botten, pålägg, ugn, lucka.', last: 'KÖR!' },
  ];
}
export function endPages(served, amount, pinoServed) {
  const ok = served >= RUSH.need, n = RUSH.orders.length;
  if (!ok) {
    return [
      { ...SANNA, text: `Bara ${served === 0 ? 'ingen pizza' : served === 1 ? 'en pizza' : `${served} pizzor`} kom ut i tid … halva matsalen gick hem.` },
      { ...PINO, text: 'Ingen fara. Min första fredag brände jag upp hela ugnen. Och en gardin.' },
      { ...SANNA, text: 'Vi tar det igen när du är redo. Kom in genom dörren igen.', last: 'OJ' },
    ];
  }
  const P = [];
  if (pinoServed) {
    P.push({ ...PINO, text: '…' });
    P.push({ ...PINO, text: 'Den här. Den här är bättre än min. Säg inget till Sanna.' });
    P.push({ ...SANNA, text: 'Jag står ju här, Pino.' });
  }
  P.push({ ...SANNA, text: served === n ? `Alla ${n} pizzor ut, och ingen gick hem hungrig. Pino, du kan ta semester.` : `${served} av ${n} pizzor ut i tid. Inte illa för en som brukar köra pizzabilen in i saker.` });
  if (served === n) P.push({ ...PINO, text: 'Semester? Aldrig. Men … kanske en lördag ledig.' });
  P.push({ ...SANNA, text: `Här är din lön: ${fmt(amount)} kr, dricksen ingår. Kom tillbaka nästa fredag!`, last: 'TACK!' });
  return P;
}

export class KitchenJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'fredag';
    this.stage = 'enter';   // enter → talk → rush → end → done (or fewer than four → failed)
    this.prompt = null;
    this.titleCard = false;
    this.hand = null;       // { top: [...], t: seconds baked, raw/baked/burnt from t }
    this.oven = [null, null];
    this.orders = [];       // tickets that have come in: { def, pizza, left, state: 'open'|'served'|'missed', tip }
    this.nextOrder = 0;
    this.rushT = 0;
    this.carried = null;    // the pizza Sanna is carrying out
    this.tablePizzas = [];  // { table, top } on the tables (render.js)
    this.sannaQueue = [];
    this.guests = [];
    this.earned = 0;
  }

  start() {
    const g = this.game, m = this.mgr;
    m.setObjective('Fredagsrusningen', 'Pizzeria Sjuan');
    g.indoors.enter(() => {
      this.stage = 'talk';
      this.sanna = spawnPed(g, { ...SANNA_LOOK }, R.sanna.x, R.sanna.z, R.sanna.h, 'sanna');
      this.pino = spawnPed(g, { ...PINO_LOOK }, R.pino.x, R.pino.z, R.pino.h, 'pino');
      GUESTS.forEach(([t, s], i) => {
        const q = seat(new Ped(g, { ...GUEST_LOOKS[i] }), TABLE[t].seats[s], 'guest');
        q.table = t; g.peds.add(q); this.guests.push(q);
      });
      g.emit('toast', { text: 'Pizzeria Sjuan · Kungsgatan', long: false });
      g.player.frozen = true;
      const again = !!m.flags.rushTalked;
      m.flags.rushTalked = true;
      g.camFocus = { x: R.kitchen.x0 + 0.6, y: 0.9, z: R.room.z0 + 3.4, owner: 'fredag', cam: { x: R.room.x0 + 1.2, y: R.y + 3.9, z: R.room.z0 + 7.4, fov: 62 } };
      m.later(0.9, () => g.emit('talk', { id: this.id, pages: again ? againPages() : introPages() }), this);
    }, 'pizza');
  }

  get served() { return this.orders.filter((o) => o.state === 'served').length; }
  get missed() { return this.orders.filter((o) => o.state === 'missed').length; }
  get open() { return this.orders.filter((o) => o.state === 'open'); }

  // what the tickets show (main.js): the open orders, oldest first
  get tickets() { return this.stage === 'rush' ? this.open.map((o) => ({ name: MENU[o.pizza].name, top: MENU[o.pizza].top.map((t) => TOP[t].name), who: whoFor(o.def), k: o.left / RUSH.patience, id: o.n })) : null; }

  static bakeState(t) { return t >= RUSH.burnt ? 'burnt' : t >= RUSH.ready ? 'baked' : 'raw'; }
  get handState() { return this.hand ? KitchenJob.bakeState(this.hand.t) : null; }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null;
    if (this.hand && p.state === 'foot') p.body.pose = 1;   // a pizza up on one hand, like a waiter
    if (this.stage === 'end' && this.pinoPizza && this.pino && this.pino.arrived) this.pino.body.pose = 1;
    if (this.stage === 'enter' || this.stage === 'talk' || this.stage === 'done' || this.stage === 'failed') return;
    if (!ind.inside && !ind.busy) { // walked out in the middle of the rush
      this.removePeople();
      m.quit(this, [WHO.sanna, 'Vart tog du vägen?! Pino försöker baka med vänsterhanden. Kom tillbaka in när du kan!']);
      return;
    }
    this.sannaStep(dt);
    if (this.stage !== 'rush') return;
    this.rushT += dt;
    // new tickets
    while (this.nextOrder < RUSH.orders.length && this.rushT >= RUSH.orders[this.nextOrder].at) {
      const def = RUSH.orders[this.nextOrder++];
      this.orders.push({ def, n: this.nextOrder, pizza: def.pizza, left: RUSH.patience, state: 'open' });
      g.emit('kitchen', { kind: 'ticket' });
      if (this.nextOrder > 1) g.emit('say', { who: this.sanna, text: `Ny lapp: ${MENU[def.pizza].name}!` });
    }
    // the guests' patience
    for (const o of this.orders) {
      if (o.state !== 'open') continue;
      o.left -= dt;
      if (o.left <= 0) {
        o.left = 0; o.state = 'missed';
        g.emit('kitchen', { kind: 'miss' });
        g.emit('say', { who: this.sanna, text: o.def.table === 'lasse' ? 'Lasse tröttnade och åkte till macken.' : o.def.table === 'pino' ? 'Pino somnade på pallen.' : `Bord ${o.def.table} tröttnade och gick.` });
        if (typeof o.def.table === 'number') for (const q of this.guests.filter((q) => q.table === o.def.table)) { removePed(g, q); this.guests.splice(this.guests.indexOf(q), 1); }
      }
    }
    // the oven
    for (const s of this.oven) {
      if (!s) continue;
      const was = KitchenJob.bakeState(s.t);
      s.t += dt;
      const now = KitchenJob.bakeState(s.t);
      if (was === 'raw' && now === 'baked') { g.emit('kitchen', { kind: 'ready' }); g.emit('say', { who: this.pino, text: 'Den är gyllene! Ta ut den!' }); }
      if (now === 'baked' && s.t >= RUSH.burnt - 3 && !s.warned) { s.warned = true; g.emit('say', { who: this.pino, text: 'Det luktar … ta ut den, ta ut den!' }); }
      if (was === 'baked' && now === 'burnt') { g.emit('kitchen', { kind: 'burnt' }); g.emit('say', { who: this.pino, text: 'Mamma mia. Släng den.' }); }
    }
    // the end of the evening: every ticket in, and none left open (and Sanna has carried the last one out)
    if (this.nextOrder >= RUSH.orders.length && !this.open.length && !this.carried && !this.sannaQueue.length) { this.endRush(); return; }
    this.objectiveNow();
    if (p.state !== 'foot' || p.frozen) return;
    // the stations: the nearest one you are standing at
    const near = (S) => Math.hypot(p.x - S.x, p.z - S.z) < S.r;
    const H = this.hand, st = this.handState;
    if (!H && near(R.dough)) { this.prompt = 'DEG'; return; }
    if (H && st === 'raw') for (const t of TOPPINGS) if (near(t) && !H.top.includes(t.id)) { this.prompt = t.label; this.topping = t; return; }
    if (near(R.oven)) {
      if (H && st === 'raw' && H.t === 0 && this.oven.some((s) => !s)) { this.prompt = 'IN I UGNEN'; return; }
      if (!H && this.oven.some((s) => s)) { this.prompt = 'TA UT'; return; }
    }
    if (H && near(R.pass)) { this.prompt = 'SERVERA'; return; }
    if (H && near(R.bin)) { this.prompt = 'SLÄNG'; return; }
  }

  objectiveNow() {
    const m = this.mgr, H = this.hand, st = this.handState;
    const hold = !H ? 'Tomma händer' : st === 'burnt' ? 'Bränd pizza – släng den' : st === 'baked' ? `Färdig: ${topText(H.top)} – till luckan` : H.t > 0 ? `Halvbakad: ${topText(H.top)}` : `Botten: ${topText(H.top)}`;
    m.setObjective(`Pizzor ut: ${this.served} av ${RUSH.orders.length}`, hold);
  }

  // the action button at a station
  interact() {
    const g = this.game, p = g.player, pr = this.prompt;
    if (!pr) return false;
    const face = (S) => { p.h = Math.atan2(S.x - p.x, S.z - p.z); };
    if (pr === 'DEG') {
      this.hand = { top: [], t: 0 };
      face({ x: R.bench.x, z: R.bench.z });
      g.emit('kitchen', { kind: 'dough' });
      if (!this.flagDough) { this.flagDough = true; g.emit('say', { who: this.pino, text: 'Fin botten! Nu pålägget – titta på lappen.' }); }
      return true;
    }
    if (this.topping && pr === this.topping.label) {
      const t = this.topping;
      this.hand.top.push(t.id);
      face({ x: t.bin[0], z: t.bin[2] });
      g.emit('kitchen', { kind: 'top' });
      // a topping no open ticket wants: Pino has views
      if (!this.open.some((o) => MENU[o.pizza].top.includes(t.id))) g.emit('say', { who: this.pino, text: t.id === 'ananas' ? 'Ananas? Ingen har beställt ananas. Modigt.' : `${t.name[0].toUpperCase() + t.name.slice(1)}? Står det på någon lapp?` });
      return true;
    }
    if (pr === 'IN I UGNEN') {
      const i = this.oven.findIndex((s) => !s);
      this.oven[i] = this.hand; this.hand = null;
      face({ x: R.slots[i].x, z: R.slots[i].z });
      g.emit('kitchen', { kind: 'in' });
      return true;
    }
    if (pr === 'TA UT') {
      // the one that has been in longest
      let i = 0;
      if (this.oven[1] && (!this.oven[0] || this.oven[1].t > this.oven[0].t)) i = 1;
      this.hand = this.oven[i]; this.oven[i] = null;
      face({ x: R.slots[i].x, z: R.slots[i].z });
      g.emit('kitchen', { kind: 'out' });
      const st = this.handState;
      if (st === 'raw') g.emit('say', { who: this.pino, text: 'Den är inte klar! Tillbaka in med den.' });
      return true;
    }
    if (pr === 'SERVERA') { this.serve(); return true; }
    if (pr === 'SLÄNG') {
      this.hand = null;
      face(R.bin);
      g.emit('kitchen', { kind: 'bin' });
      return true;
    }
    return false;
  }

  serve() {
    const g = this.game, H = this.hand, st = this.handState;
    g.player.h = -Math.PI / 2;
    if (st === 'raw') {
      if (H.t > 0) g.emit('say', { who: this.sanna, text: 'Den är ju halvrå! In i ugnen igen.' });
      else g.emit('say', { who: this.sanna, text: 'Den är ju rå! Ugnen först.' });
      // a half-baked one may go back in: it keeps its time
      return;
    }
    if (st === 'burnt') { g.emit('say', { who: this.sanna, text: 'Den där är bränd. Släng den!' }); return; }
    const o = this.open.find((q) => sameTop(MENU[q.pizza].top, H.top));
    if (!o) { g.emit('say', { who: this.sanna, text: 'Det där har ingen beställt. Titta på lapparna!' }); g.emit('kitchen', { kind: 'nope' }); return; }
    o.state = 'served';
    o.tip = Math.round((RUSH.pay.tip * o.left) / RUSH.patience / 10) * 10;
    this.earned += RUSH.pay.pizza + o.tip;
    this.hand = null;
    g.emit('kitchen', { kind: 'serve' });
    g.emit('say', { who: this.sanna, text: `${MENU[o.pizza].name} till ${o.def.table === 'lasse' ? 'Lasse' : o.def.table === 'pino' ? 'Pino' : `bord ${o.def.table}`}!${o.tip >= 60 ? ' Snabbt!' : ''}` });
    this.sannaQueue.push({ order: o, top: H.top.slice() });
  }

  // Sanna takes the pizza from the pass and carries it out to the table (or the door, or Pino)
  sannaStep(dt) {
    const S = this.sanna, g = this.game;
    if (!S) return;
    if (this.carried) {
      S.body.pose = 1;
      if (!S.arrived) return;
      const c = this.carried;
      if (c.leg === 'out') {
        const t = c.order.def.table;
        if (typeof t === 'number') this.tablePizzas.push({ table: t, top: c.top });
        else if (t === 'lasse') g.emit('say', { who: S, text: 'Lasse hämtade i dörren. Han gav dricks!' });
        c.leg = 'back'; c.top = null;
        S.arrived = false; S.goto([[R.sanna.x - 0.6, R.sanna.z + 0.4], [R.sanna.x, R.sanna.z]], 1.9, R.sanna.h);
        return;
      }
      this.carried = null;
    }
    S.body.pose = 0;
    const q = this.sannaQueue.shift();
    if (!q) return;
    const t = q.order.def.table;
    if (t === 'pino') { // Pino's own: he gets up and takes it from the pass himself – and tastes it at the end
      this.pinoPizza = q.top;
      return;
    }
    this.carried = { order: q.order, top: q.top, leg: 'out' };
    let to;
    if (t === 'lasse') to = [[R.sanna.x - 1.2, R.sanna.z + 1.4], [R.door.x + 0.6, R.door.z]];
    else { const T = TABLE[t]; to = [[R.sanna.x - 0.6, R.sanna.z + 0.4], [T.x + 0.1, T.z + (T.z < R.room.z0 + 4 ? 0.85 : -0.85)]]; }
    S.arrived = false; S.goto(to, 1.9, null);
  }

  endRush() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'end';
    this.hand = null; this.oven = [null, null];
    p.frozen = true; p.vx = p.vz = 0;
    const served = this.served, ok = served >= RUSH.need;
    this.amount = ok ? this.earned + (served === RUSH.orders.length ? RUSH.pay.all : 0) : 0;
    g.emit('toast', { text: ok ? 'Sista lappen är klar. Köket andas ut.' : 'Kvällen är slut.', long: true });
    // Pino gets up and comes over to the pass with his pizza
    if (this.pinoPizza) {
      const P = this.pino;
      P.arrived = false; P.goto([[R.pass.x + 0.75, R.pass.z + 1.2]], 1.5, -2.3);
    }
    g.camFocus = { x: R.pass.x + 0.7, y: 0.9, z: R.pass.z + 0.8, owner: 'fredag', cam: { x: R.room.x0 + 3.2, y: R.y + 3.6, z: R.room.z0 + 6.6, fov: 58 } };
    p.h = Math.PI / 2;
    m.later(this.pinoPizza ? 3.2 : 1.8, () => g.emit('talk', { id: this.id, pages: endPages(served, this.amount, !!this.pinoPizza) }), this);
  }

  talkFx() {}

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'talk') {
      this.stage = 'rush';
      p.frozen = false;
      if (g.camFocus && g.camFocus.owner === 'fredag') g.camFocus = null;
      m.later(1.0, () => g.emit('hint', { id: 'fredag', touch: 'In i köket bakom disken: DEG → pålägget på lappen → IN I UGNEN → TA UT → SERVERA i luckan.', keys: 'In i köket bakom disken: DEG → pålägget på lappen → IN I UGNEN → TA UT → SERVERA i luckan (E vid varje).' }), this);
      return;
    }
    if (this.stage !== 'end') return;
    if (g.camFocus && g.camFocus.owner === 'fredag') g.camFocus = null;
    if (this.served < RUSH.need) {
      this.stage = 'failed';
      m.fail(this, 'Matsalen gick hem hungrig', [WHO.sanna, 'Pino säger att alla bränner en fredag. Kom tillbaka till pizzerian när du vill försöka igen!']);
      return;
    }
    this.stage = 'done';
    g.stats.rush = { served: this.served, amount: this.amount };
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Fredagsrusningen', amount: this.amount });
    m.sms(WHO.sanna, 'Pino har tagit av sig bandaget och säger att din Capricciosa var "nästan okej". Det är det finaste han har sagt om någon. Tack för i fredags!', 40);
  }

  targets(T) {
    const g = this.game;
    if (!g.indoors.inside || g.indoors.where !== 'pizza') return;
    if (this.sanna && this.stage === 'talk') T.push({ kind: 'contact', x: this.sanna.x, z: this.sanna.z, r: 1, letter: SANNA.letter, color: SANNA.color, badgeOnly: true, badgeY: 2.0, ref: this.sanna });
    if (this.stage !== 'rush') return;
    // an arrow over where to go next
    const H = this.hand, st = this.handState, at = (S, y) => T.push({ kind: 'item', x: S.x, y, z: S.z, gps: false });
    if (!H) {
      if (this.oven.some((s) => s && KitchenJob.bakeState(s.t) !== 'raw')) at({ x: R.slots[0].x + 0.45, z: R.slots[0].z + 0.6 }, R.y + 1.25);
      else if (this.open.length) at({ x: R.bench.x, z: R.bench.z }, R.y + 1.35);
    } else if (st === 'burnt') at({ x: R.bin.x - 0.05, z: R.bin.z - 0.75 }, R.y + 1.2);
    else if (st === 'baked') at({ x: R.shelf.x, z: R.shelf.z }, R.y + 1.5);
    else {
      const want = this.open.map((o) => MENU[o.pizza].top).find((top) => H.top.every((t) => top.includes(t)) && top.length > H.top.length);
      const next = want && want.find((t) => !H.top.includes(t));
      if (next) at({ x: TOP[next].bin[0], z: TOP[next].bin[2] }, R.y + 1.4);
      else at({ x: R.slots[0].x + 0.45, z: R.slots[0].z + 0.6 }, R.y + 1.25);
    }
  }

  // the minimap: the stations
  mapDots() {
    if (this.stage !== 'rush') return null;
    return [R.dough, R.oven, R.pass].map((S) => ({ x: S.x, z: S.z, c: '#ffcf33' }));
  }

  removePeople() {
    const g = this.game;
    for (const q of [this.sanna, this.pino, ...this.guests]) removePed(g, q);
    this.sanna = this.pino = null; this.guests = [];
  }

  cleanup() {
    const g = this.game, p = g.player;
    this.prompt = null;
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'fredag') g.camFocus = null;
    if (!g.indoors.inside) { this.removePeople(); return; }
    // still inside: everyone stays until you go out
    const gone = [this.sanna, this.pino, ...this.guests];
    this.keepTables = this.tablePizzas;
    const check = () => { if (g.indoors.inside && g.indoors.where === 'pizza') { this.mgr.later(1, check); return; } for (const q of gone) removePed(g, q); this.mgr.pizzaLeft = null; };
    this.mgr.pizzaLeft = this;
    this.mgr.later(1, check);
  }
}
