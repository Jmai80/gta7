// Two side quests that come a few seconds after "Kassaskåpet" (v0.9):
//   "Samuels cykel": Samuel has worked out who took his keys. Ride Arne's old bike from tant Gun's
//                    gate to him outside the tower – it was his, after all.
//   "Hemleverans":   Yasmin's customers can't get to Hörnlivs. Three bags to three doors before the
//                    clock runs out – by car, by bike or on foot.
import { WHO, GUN_BIKE, BIKE_RETURN, HOME_DELIVERY, PIZZA_STOPS } from './config.js';
import { LOOK as SAMUEL_LOOK } from './samuel.js';
import { Ped } from './peds.js';
import { fmt } from './rng.js';

const SAMUEL = { who: 'Samuel', letter: 'S', color: '#6e7a46' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };

function spawnPed(game, look, x, z, h, npc) {
  const ped = new Ped(game, look);
  ped.x = x; ped.z = z; ped.y = game.world.groundHeight(x, z);
  ped.h = ped.standH = h; ped.state = 'stand'; ped.keep = true; ped.npc = npc;
  ped.body.x = ped.x; ped.body.y = ped.y; ped.body.z = ped.z; ped.body.h = ped.h;
  game.peds.add(ped);
  return ped;
}
function removePed(game, ped) { if (!ped) return; const L = game.peds.list, i = L.indexOf(ped); if (i >= 0) L.splice(i, 1); }

export function bikeReturnPages() {
  return [
    { ...SAMUEL, text: 'Min cykel! Jag visste väl att det var du som tog nycklarna. Leif har stor mun.' },
    { ...YOU, text: 'Förlåt. Det var för en god sak – receptet på Sjubybullen satt i cykeln.' },
    { ...SAMUEL, text: 'Ett recept? I MIN cykel? För en hundralapp på loppis? Okej… det är faktiskt ganska häftigt.' },
    { ...SAMUEL, text: 'Vi säger så här: du får låna den när du vill. Den står här vid porten. Och här – för att du kom tillbaka med den.', last: 'TACK!' },
  ];
}

// ------------------------------------------------------------------ Samuels cykel
export class BikeReturnJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'cykelretur';
    this.stage = 'ride';     // ride (get on the bike and ride it to Samuel) → talk → done
    this.prompt = null;
    this.samuel = null;
    this.titleCard = false;
  }

  start() {
    const g = this.game;
    this.samuel = spawnPed(g, SAMUEL_LOOK, BIKE_RETURN.x + 0.8, BIKE_RETURN.z + 0.9, Math.PI * 0.75, 'samuel-out');
    g.emit('toast', { text: 'Cykla Arnes gamla cykel till Samuel vid höghuset.', long: true });
  }

  get bike() { const b = this.game.bike; return b && !b.removed ? b : null; }

  update() {
    const g = this.game, m = this.mgr, p = g.player, bike = this.bike;
    this.prompt = null;
    if (this.stage !== 'ride') return;
    if (!bike) { m.fail(this, 'Cykeln är borta'); return; }
    const riding = p.inCar && p.car === bike;
    const d = Math.hypot(bike.x - BIKE_RETURN.x, bike.z - BIKE_RETURN.z);
    if (riding && d < BIKE_RETURN.r && bike.speed < 3.5) { this.deliver(); return; }
    m.setObjective(riding ? 'Cykla till Samuel' : 'Hämta cykeln', riding ? 'Porten till höghuset vid torget' : 'Vid tant Guns grind på Storgatan');
    const s = this.samuel;
    if (s) s.standH = Math.atan2(p.x - s.x, p.z - s.z);
  }

  deliver() {
    const g = this.game, m = this.mgr, p = g.player, s = this.samuel, bike = this.bike;
    this.stage = 'talk';
    p.exitCar(true);
    bike.vx = bike.vz = bike.w = 0;
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(s.x - p.x, s.z - p.z);
    s.standH = s.h = Math.atan2(p.x - s.x, p.z - s.z); s.body.h = s.h;
    const line = Math.atan2(s.x - p.x, s.z - p.z);
    g.camFocus = { x: (p.x + s.x) / 2, y: 0.35, z: (p.z + s.z) / 2, yaw: line - 0.6, owner: 'errand', near: true };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: bikeReturnPages() }), this);
  }

  talkFx() {}

  talkDone() {
    if (this.stage !== 'talk') return;
    this.stage = 'done';
    const g = this.game, m = this.mgr, bike = this.bike;
    if (bike) { bike.x = BIKE_RETURN.x - 1.4; bike.z = BIKE_RETURN.z + 0.4; bike.h = Math.PI / 2; bike.y = g.world.groundHeight(bike.x, bike.z); }
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Samuels cykel', amount: BIKE_RETURN.reward });
    m.sms(WHO.gun, 'Gav du tillbaka cykeln till pojken? Bra gjort, lilla vän. Arne hade gillat det.', 7);
  }

  targets(T) {
    const g = this.game, p = g.player, bike = this.bike;
    if (this.stage !== 'ride' || !bike) return;
    if (!(p.inCar && p.car === bike)) T.push({ kind: 'car', car: bike, color: 0x46c96f, gps: true });
    else T.push({ kind: 'zone', x: BIKE_RETURN.x, z: BIKE_RETURN.z, r: BIKE_RETURN.r, gps: true });
    if (this.samuel) T.push({ kind: 'contact', x: this.samuel.x, z: this.samuel.z, r: 1, letter: 'S', color: '#6e7a46', badgeOnly: true, badgeY: 2.75, ref: this.samuel });
  }

  cleanup() {
    const g = this.game, s = this.samuel;
    this.prompt = null;
    g.player.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'errand') g.camFocus = null;
    this.mgr.later(this.stage === 'done' ? 20 : 1, () => removePed(g, s));
  }
}

// ------------------------------------------------------------------ Hemleverans
const STOPS = [2, 4, 5].map((i) => PIZZA_STOPS[i]);   // a villa and the flats on Storgatan, a row house on Skolgatan
const CUSTOMERS = [
  { shirt: 0x8a6fb8, pants: 0x3d3550, skin: 0xf2d0b5, hair: 0xd8d8d8, height: 0.9, bulk: 1.05, style: 2 | 8, accent: 0x5a4a70 },
  { shirt: 0x6b4a32, pants: 0x2b2e35, skin: 0xc68e62, hair: 0xa0a0a0, height: 0.98, bulk: 1.1, style: 4 | 16, accent: 0x3a3c41 },
  { shirt: 0x2f6b45, pants: 0x2b2d36, skin: 0xe8b996, hair: 0xe8e2d0, height: 0.94, bulk: 1.0, style: 1 | 128, accent: 0xc8a24a },
];
const THANKS = ['Tusen tack, du är en ängel!', 'Äntligen! Mina knän klarar inte backen till Hörnlivs.', 'Varmt tack – hälsa Yasmin!'];

export class HomeDeliveryJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'hemleverans';
    this.stage = 'deliver';
    this.prompt = null;
    this.left = HOME_DELIVERY.time;
    this.stops = [];
    this.done = 0;
    this.titleCard = true;
  }

  start() {
    const g = this.game;
    this.stops = STOPS.map((s, i) => ({ ...s, ped: spawnPed(g, CUSTOMERS[i], s.cx, s.cz, Math.atan2(s.x - s.cx, s.z - s.cz), 'customer'), got: false }));
    g.emit('toast', { text: `Tre matkassar, tre adresser, ${HOME_DELIVERY.time} sekunder. Bil, cykel eller till fots – du väljer!`, long: true });
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    if (this.stage !== 'deliver') return;
    this.left -= dt;
    if (this.left <= 0) {
      m.fail(this, 'Tiden tog slut', [WHO.yasmin, 'Kunderna ringde och undrade var maten var. Kom förbi Hörnlivs igen så packar jag nya kassar!']);
      return;
    }
    const T = p.inCar ? p.car : p;
    for (const s of this.stops) {
      if (s.got) continue;
      const d = Math.min(Math.hypot(T.x - s.x, T.z - s.z), Math.hypot(T.x - s.cx, T.z - s.cz));
      if (d < 3.2 && (!p.inCar || p.car.speed < 3.5)) this.drop(s);
    }
    if (this.stage !== 'deliver') return;
    m.setObjective('Kör ut matkassarna', `${this.done} av 3 · ${Math.ceil(this.left)} s kvar`);
  }

  drop(s) {
    const g = this.game, m = this.mgr;
    s.got = true;
    this.done++;
    g.emit('say', { who: s.ped, text: THANKS[(this.done - 1) % THANKS.length] });
    g.emit('keys', { item: 'bag' });
    if (this.done < 3) { g.emit('toast', { text: `Kasse ${this.done} av 3 levererad!`, long: false }); return; }
    this.stage = 'done';
    const bonus = Math.round(this.left) * HOME_DELIVERY.bonus;
    g.stats.deliveryLeft = Math.round(this.left);
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Hemleverans', amount: 3 * HOME_DELIVERY.per + bonus });
    m.later(3.8, () => g.emit('toast', { text: `${Math.round(this.left)} sekunder över × ${HOME_DELIVERY.bonus} kr = ${fmt(bonus)} kr extra`, long: true }));
    m.sms(WHO.yasmin, 'Alla tre har ringt och tackat! Du är Sjubys snabbaste bud.', 7);
  }

  targets(T) {
    if (this.stage !== 'deliver') return;
    for (const s of this.stops) if (!s.got) T.push({ kind: 'zone', x: s.x, z: s.z, r: 3.2, gps: true });
  }

  cleanup() {
    const g = this.game, peds = this.stops.map((s) => s.ped);
    this.prompt = null;
    this.mgr.later(10, () => { for (const q of peds) removePed(g, q); });
  }
}
export { GUN_BIKE };
