// Main quest, part 5: "Nyöppningen" (v0.8). With the whole recipe in her jam jar, tant Gun wants
// to open Arne's old Sjuby Konditori by the square again. First she needs the three things the
// recipe hangs on: cardamom from Hörnlivs, butter from Macken and flour from the windmill out on
// Norrholmen – where a Bullbilen van lies in wait. Get all three to the konditori in any order.
// The next morning the doors open, half of Sjuby turns up… and so does Bagar-Bengt.
import { WHO, KONDITORI, KONDITORI_DOOR, PICKUPS, OPENING_REWARD, LIVS_DOOR } from './config.js';
import { ISLE } from './island.js';
import { Ped, makeLook } from './peds.js';
import { Chaser, CHASE } from './bikejob.js';

const GUN = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const BENGT = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const BENGT_LOOK = { shirt: 0xf2efe6, pants: 0xe2ddd0, skin: 0xe9c3a6, hair: 0x3a2a1a, height: 1.04, bulk: 1.28 };
const MAJKEN_LOOK = { shirt: 0xe8e2d2, pants: 0x5a4632, skin: 0xf0c8a8, hair: 0xb8b0a0, height: 0.95, bulk: 1.05 };
const YASMIN_LOOK = { shirt: 0x2f8f83, pants: 0x2b2d36, skin: 0xb98a64, hair: 0x1e1612, height: 0.97, bulk: 1.0 };
const ORDER = ['kardemumma', 'smor', 'mjol'];
const VAN = { vMax: 15, burst: 2.5, start: 2.0 };
const CATCH = { foot: 2.6, nose: 3.0, slow: 3.0, pressT: 1.4 };
const DELIVER_R = 2.2;

export function gunPages(job) {
  return [
    { ...GUN, text: 'Kardemumma, smör och mjöl från kvarnen! Precis som Arne ville ha det.' },
    { ...YOU, text: job.lostFlour ? 'Bullbilen försökte ta mjölet, men jag kom undan.' : 'Bullbilen låg och lurade vid kvarnen, men mjölet klarade sig.' },
    { ...GUN, text: 'Typiskt dem. Nu bakar jag hela natten. I morgon bitti öppnar Sjuby Konditori igen – och du ska stå först i kön!', last: 'GOD NATT' },
  ];
}

export function ceremonyPages() {
  return [
    { ...GUN, text: 'Välkomna allihop! Efter trettio år är Sjuby Konditori öppet igen – med Arnes riktiga Sjubybullar!' },
    { ...BENGT, text: 'Ehm… ursäkta. Får jag säga något?' },
    { ...GUN, text: 'Bengt Bulle. Du har mage att komma hit.' },
    { ...BENGT, text: 'Jag vet. Sanningen är att jag aldrig har kunnat baka. Bullbilen har sålt fabriksbullar i trettio år, och halva receptet låg i skåpet för att ingen av oss förstod det.' },
    { ...BENGT, text: 'Jag kom hit för att… fråga om jag får jobba här. Och lära mig baka på riktigt.' },
    { ...YOU, text: 'Han hittade inte ens koden till sitt eget kassaskåp utan en lapp.' },
    { ...GUN, fx: 'apron', text: 'Hmpf. Du får börja med att diska. Och du ska be lilla vännen här om ursäkt för jakterna.' },
    { ...BENGT, text: 'Förlåt för Bullbilarna. Här – den första riktiga Sjubybullen är din.' },
    { ...GUN, text: 'Och det här är för allt du har gjort. Utan dig hade receptet fortfarande legat i två halvor.', last: 'TACK!' },
  ];
}

function spawnPed(game, look, x, z, h, npc) {
  const ped = new Ped(game, look);
  ped.x = x; ped.z = z; ped.y = game.world.groundHeight(x, z);
  ped.h = ped.standH = h;
  ped.state = 'stand'; ped.keep = true; ped.npc = npc;
  ped.body.x = ped.x; ped.body.y = ped.y; ped.body.z = ped.z; ped.body.h = ped.h;
  game.peds.add(ped);
  return ped;
}
function removePed(game, ped) {
  if (!ped) return;
  const L = game.peds.list, i = L.indexOf(ped);
  if (i >= 0) L.splice(i, 1);
}

export class OpeningJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'konditori';
    this.stage = 'collect';  // collect → talk1 → night → talk2 → done
    this.prompt = null;
    this.have = new Set();
    this.helpers = {};
    this.van = null; this.chaser = null; this.lostFlour = false;
    this.crowd = [];
    this.pressT = 0;
    this.titleCard = true;
  }

  start() {
    const g = this.game, m = this.mgr;
    // the people who have the ingredients ready: Yasmin outside Hörnlivs, Majken outside the mill
    this.helpers.kardemumma = spawnPed(g, YASMIN_LOOK, LIVS_DOOR.x - 0.9, LIVS_DOOR.z + 0.9, -Math.PI / 2, 'yasmin-out');
    const P = PICKUPS.mjol;
    this.helpers.mjol = spawnPed(g, MAJKEN_LOOK, P.x + 0.3, P.z - 0.9, 0.4, 'majken');
    m.later(0.8, () => g.emit('hint', { id: 'opening', touch: 'Tre ingredienser, i vilken ordning du vill. Den gula linjen visar vägen till den närmaste.', keys: 'Tre ingredienser, i vilken ordning du vill. Den gula linjen visar vägen till den närmaste.' }), this);
  }

  left() { return ORDER.filter((k) => !this.have.has(k)); }

  // the nearest ingredient still missing (for the GPS)
  next() {
    const p = this.game.player;
    let best = null, bd = 1e9;
    for (const k of this.left()) { const P = PICKUPS[k], d = Math.hypot(P.x - p.x, P.z - p.z); if (d < bd) { bd = d; best = k; } }
    return best;
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    if (this.stage !== 'collect') return;
    const car = p.inCar ? p.car : null;
    const T = car || p;
    for (const k of this.left()) {
      const P = PICKUPS[k];
      if (Math.hypot(T.x - P.x, T.z - P.z) < P.r && (!car || car.speed < 3)) this.pick(k);
    }
    this.chase(dt, T, car);
    if (this.stage !== 'collect') return;
    const left = this.left();
    if (!left.length) {
      if (Math.hypot(T.x - KONDITORI.x, T.z - KONDITORI.z) < DELIVER_R && (!car || car.speed < 3)) { this.deliver(); return; }
      m.setObjective('Till Sjuby Konditori', this.chaseLine() || 'Vid torget');
    } else {
      const got = ORDER.filter((k) => this.have.has(k)).map((k) => PICKUPS[k].label.toLowerCase());
      m.setObjective(`Hämta ${PICKUPS[this.next()].label.toLowerCase()}`, this.chaseLine() || `${3 - left.length} av 3${got.length ? ' · ' + got.join(', ') : ''} · ${PICKUPS[this.next()].where}`);
    }
  }

  pick(k) {
    const g = this.game, m = this.mgr;
    this.have.add(k);
    const h = this.helpers[k];
    if (k === 'kardemumma') {
      g.emit('toast', { text: 'Yasmin räcker över en påse kardemumma. Doften!', long: true });
      if (h) g.emit('say', { who: h, text: 'Hälsa Gun! Jag kommer på invigningen.' });
    } else if (k === 'smor') {
      g.emit('toast', { text: 'Kim slänger ut ett kilo smör genom fönstret på Macken: ”Lycka till med öppningen!”', long: true });
    } else {
      g.emit('toast', { text: 'Mjölnar-Majken bär ut en säck nymalet mjöl. ”Akta dig – Bullbilen har snokat här hela morgonen.”', long: true });
      if (h) g.emit('say', { who: h, text: 'Stenmalet, som förr!' });
      m.later(2.2, () => this.releaseVan(), this);
    }
    g.emit('keys', { item: k });
    const left = this.left();
    if (!left.length) m.later(1.2, () => g.emit('toast', { text: 'Allt är klart – till konditoriet vid torget!', long: true }), this);
  }

  // ------------------------------------------------------------ Bullbilen wants the flour
  releaseVan() {
    const g = this.game, Y = ISLE.yard;
    if (this.stage !== 'collect' || !this.have.has('mjol') || (this.chaser && this.chaser.mode === 'chase')) return;
    const gateX = Y.x0, gateZ = (Y.gateZ0 + Y.gateZ1) / 2;
    let van = null, bd = 1e9;
    for (const v of g.vehicles) {
      if (v.type !== 'van' || v.driver || v.dead || v.x < Y.x0 || v.x > Y.x1 || v.z < Y.z0 || v.z > Y.z1) continue;
      const d = Math.hypot(v.x - gateX, v.z - gateZ);
      if (d < bd) { bd = d; van = v; }
    }
    if (!van) { g.makeRoom('van'); van = g.addVehicle('van', 'green', ISLE.vanSpawn.x, ISLE.vanSpawn.z, ISLE.vanSpawn.h); }
    if (!van) return;
    this.van = van;
    this.chaser = new Chaser(g, van, { vMax: VAN.vMax, burst: VAN.burst, hold: VAN.start });
    g.racers.push(this.chaser);
    this.losT = 0; this.farT = 0; this.chaseT = 0; this.pressT = 0;
    g.emit('toast', { text: 'En Bullbil kommer från bageriet – de vill ha mjölet!', long: true });
    this.mgr.later(VAN.start, () => { if (this.van === van && this.chaser.mode === 'chase') { g.emit('honk', { car: van }); g.emit('say', { who: van, text: 'Ge hit mjölet!' }); } }, this);
  }

  chaseLine() {
    const ch = this.chaser;
    if (!ch || ch.mode !== 'chase') return '';
    const p = this.game.player, d = Math.round(Math.hypot(this.van.x - p.x, this.van.z - p.z));
    return d > 70 ? 'Bullbilen är långt efter' : `Bullbilen är ${d} m bort`;
  }

  chase(dt, T, car) {
    const g = this.game, ch = this.chaser, van = this.van;
    if (!ch || ch.mode !== 'chase') return;
    ch.goal = { x: T.x, z: T.z, vx: T.vx || 0, vz: T.vz || 0, ref: T };
    const d = Math.hypot(van.x - T.x, van.z - T.z);
    if (!car && d < CATCH.foot) { this.flourTaken(); return; }
    const nose = Math.hypot(van.x + Math.sin(van.h) * 2.0 - T.x, van.z + Math.cos(van.h) * 2.0 - T.z);
    this.pressT = car && nose < CATCH.nose && car.speed < CATCH.slow ? this.pressT + dt : 0;
    if (this.pressT > CATCH.pressT) { this.flourTaken(); return; }
    if (d < 20 && (this.honkT = (this.honkT || 0) - dt) <= 0) {
      this.honkT = 2.5 + g.rng() * 1.5;
      g.emit('honk', { car: van });
    }
    if ((this.losCheckT = (this.losCheckT || 0) - dt) <= 0) { this.losCheckT = 0.25; this.sawLos = ch.hold > 0 || ch.los(T.x, T.z); }
    if (ch.hold <= 0) this.chaseT += dt;
    this.losT = !this.sawLos && d > CHASE.lose ? this.losT + dt : 0;
    this.farT = d > CHASE.far ? this.farT + dt : 0;
    if (this.chaseT > CHASE.minChase && (this.losT > CHASE.loseT || this.farT > CHASE.farT)) {
      ch.mode = 'home';
      g.emit('toast', { text: 'Du skakade av dig Bullbilen. Mjölet är ditt!', long: true });
    }
  }

  onBikeFall(e) {
    if (this.chaser && this.chaser.mode === 'chase' && (e.by === this.van || Math.hypot(this.van.x - this.game.player.x, this.van.z - this.game.player.z) < 8)) this.flourTaken();
  }

  // they got the flour: back to Majken for another sack (no failure – she has more)
  flourTaken() {
    const g = this.game;
    this.have.delete('mjol');
    this.lostFlour = true;
    if (this.chaser) this.chaser.mode = 'home';
    g.emit('caught', {});
    if (this.van) g.emit('say', { who: this.van, text: 'Tack för mjölet!' });
    g.emit('toast', { text: 'Bullbilen tog mjölsäcken! Majken har en säck till vid kvarnen.', long: true });
  }

  // ------------------------------------------------------------ at the konditori
  deliver() {
    const g = this.game, m = this.mgr, p = g.player, flag = m.flag, gun = flag.gun;
    this.stage = 'talk1';
    if (this.chaser && this.chaser.mode === 'chase') this.chaser.mode = 'home';
    if (p.inCar) p.exitCar(true);
    if (gun.away) flag.toHome();
    gun.x = KONDITORI_DOOR.x + 0.4; gun.z = KONDITORI_DOOR.z - 1.0; gun.y = g.world.groundHeight(gun.x, gun.z);
    flag.hush = true; gun.wave = false; gun.state = 'stand';
    p.x = KONDITORI.x - 0.6; p.z = KONDITORI.z - 0.4; p.h = 0; p.vx = p.vz = 0; p.y = g.world.groundHeight(p.x, p.z);
    p.frozen = true;
    this.face(gun);
    m.later(0.8, () => g.emit('talk', { id: this.id, pages: gunPages(this) }), this);
  }

  face(who) {
    const g = this.game, p = g.player;
    who.standH = who.h = Math.atan2(p.x - who.x, p.z - who.z);
    who.body.x = who.x; who.body.y = who.y; who.body.z = who.z; who.body.h = who.h;
    p.h = Math.atan2(who.x - p.x, who.z - p.z);
    const line = Math.atan2(who.x - p.x, who.z - p.z);
    g.camFocus = { x: (p.x + who.x) / 2, y: 0.35, z: (p.z + who.z) / 2, yaw: line - 0.6, owner: 'opening', near: true };
  }

  talkFx() {}

  talkDone() {
    const g = this.game, m = this.mgr;
    if (this.stage === 'talk1') {
      this.stage = 'night';
      g.emit('fade', { on: true });
      m.later(0.7, () => { this.ceremony(); g.emit('toast', { text: 'Nästa morgon · Sjuby Konditori öppnar', long: true }); }, this);
      m.later(1.4, () => g.emit('fade', { on: false }), this);
      m.later(3.2, () => { this.stage = 'talk2'; g.emit('talk', { id: this.id, pages: ceremonyPages() }); }, this);
      return;
    }
    if (this.stage === 'talk2') this.finish();
  }

  // the next morning: a crowd on the square, Gun at the door, Bengt at the back
  ceremony() {
    const g = this.game, gun = this.mgr.flag.gun, p = g.player;
    for (const h of Object.values(this.helpers)) removePed(g, h);
    this.helpers = {};
    const D = KONDITORI_DOOR;
    gun.x = D.x; gun.z = D.z - 0.9; gun.y = g.world.groundHeight(gun.x, gun.z); gun.standH = gun.h = Math.PI;
    gun.body.x = gun.x; gun.body.z = gun.z; gun.body.h = gun.h;
    const R = g.rng;
    for (let i = 0; i < 9; i++) {                      // the crowd: two groups on either side, the middle open
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      const x = D.x + side * (2.6 + k * 0.9 + R() * 0.3), z = D.z - 1.6 - (k % 2) * 1.3 - R() * 0.4;
      const ped = spawnPed(g, makeLook(R), x, z, Math.atan2(D.x - x, D.z - 0.8 - z), 'crowd');
      this.crowd.push(ped);
    }
    this.bengt = spawnPed(g, BENGT_LOOK, D.x + 1.3, D.z - 1.9, Math.atan2(-1.3, 1.0), 'bengt-out');
    p.x = D.x - 0.9; p.z = D.z - 2.6; p.y = g.world.groundHeight(p.x, p.z); p.vx = p.vz = 0;
    p.h = Math.atan2(gun.x - p.x, gun.z - p.z);
    g.camFocus = { x: D.x + 0.15, y: 0.5, z: D.z - 1.8, yaw: 0.12, owner: 'opening', near: true };
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Nyöppningen', amount: OPENING_REWARD });
    m.later(4, () => g.emit('toast', { text: 'Den första riktiga Sjubybullen på trettio år. Mums!', long: true }));
    m.sms(WHO.gun, 'Kön ringlar sig runt torget! Bengt diskar som en tok. Kom förbi när du vill – bullarna är alltid gratis för dig.', 9);
  }

  targets(T) {
    if (this.stage !== 'collect') return;
    if (this.chaser && this.chaser.mode === 'chase') T.push({ kind: 'racer', car: this.van, color: 0xff3b2f });
    const next = this.next();
    for (const k of this.left()) {
      const P = PICKUPS[k];
      T.push({ kind: 'zone', x: P.x, z: P.z, r: P.r, gps: k === next });
    }
    if (!next) T.push({ kind: 'zone', x: KONDITORI.x, z: KONDITORI.z, r: DELIVER_R, gps: true });
  }

  cleanup() {
    const g = this.game, m = this.mgr;
    this.prompt = null;
    g.player.frozen = false;
    m.flag.hush = false;
    if (g.camFocus && g.camFocus.owner === 'opening') g.camFocus = null;
    if (this.chaser && this.chaser.mode === 'chase') this.chaser.mode = 'home';
    for (const h of Object.values(this.helpers)) removePed(g, h);
    // the crowd and Bengt go home a little later; Gun goes back to her villa when nobody is looking
    const gone = [...this.crowd, this.bengt];
    m.later(30, () => { for (const q of gone) removePed(g, q); });
    if (this.stage === 'done') { const gun = m.flag.gun; gun.away = true; gun.konditori = true; m.flag.said.bye = true; m.flag.byeT = 0; }
  }
}
