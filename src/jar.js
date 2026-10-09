// Main quest, part 6: "Syltburken" (v0.9). The night after the opening someone broke into Sjuby
// Konditori and took tant Gun's jam jar – with both halves of Arne's recipe in it. A black car is
// driving round town with it. Ram it until the engine gives up, take the jar back from the wreck and
// bring it to the konditori. Bengt knows whose car it is…
import { WHO, KONDITORI, KONDITORI_DOOR, JAR } from './config.js';
import { Ped } from './peds.js';
import { Chaser } from './bikejob.js';
import { fmt } from './rng.js';

const GUN = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const BENGT = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const BENGT_LOOK = { shirt: 0xf2efe6, pants: 0xe2ddd0, skin: 0xe9c3a6, hair: 0x3a2a1a, height: 1.04, bulk: 1.28, style: 4 | 32 | 64, accent: 0xf8f6f0 };
const THUG_LOOK = { shirt: 0x1d1f22, pants: 0x1d1f22, skin: 0xd9a77e, hair: 0x1a1a1a, height: 1.05, bulk: 1.2, style: 16 | 128, accent: 0x111214 };

export function returnPages() {
  return [
    { ...GUN, text: 'Syltburken! Och receptet ligger kvar i den – båda halvorna. Tack och lov.' },
    { ...BENGT, text: 'Den svarta bilen… den har jag sett förut. Den tillhör direktör Dahlgren. Han äger Bullbilen – jag är bara anställd.' },
    { ...YOU, text: 'Varför skulle en direktör stjäla en syltburk?' },
    { ...BENGT, text: 'Fabriksbullarna kommer någonstans ifrån. Dahlgren har pratat om en ”riktig fabrik” i flera år. Med Arnes recept kan han sälja Sjubybullar i hela Sverige.' },
    { ...GUN, text: 'Över min döda kropp. Bengt, ta reda på var den där fabriken ligger.' },
    { ...BENGT, text: 'Dahlgrens lastbil hämtar bullar vid bageriet varje kväll. Följer man efter den hittar man fabriken. Jag skickar ett sms när den går.', last: 'JAG ÄR REDO' },
  ];
}

export class JarJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'syltburken';
    this.stage = 'chase';    // chase → stopped (take the jar) → return → talk → done
    this.prompt = null;
    this.car = null; this.chaser = null; this.thug = null;
    this.farT = 0; this.goalT = 0;
    this.jar = false;
    this.titleCard = true;
  }

  start() {
    const g = this.game, m = this.mgr;
    this.spawnCar();
    m.later(0.8, () => g.emit('hint', { id: 'jar', touch: 'Kör in i den svarta bilen tills motorn ger upp. Följ den röda pilen.', keys: 'Kör in i den svarta bilen tills motorn ger upp. Följ den röda pilen.' }), this);
    m.later(1.6, () => { if (this.stage === 'chase') g.emit('toast', { text: 'Den svarta bilen kör runt i stan med syltburken!', long: true }); }, this);
  }

  // the black car: on a town road, a little way off – it starts driving at once
  spawnCar() {
    const g = this.game, p = g.player, N = g.layout.gps.nodes;
    const px = p.inCar ? p.car.x : p.x, pz = p.inCar ? p.car.z : p.z;
    const cands = N.filter((n) => n.land === 'town' && n.adj.length >= 2).map((n) => ({ n, d: Math.hypot(n.x - px, n.z - pz) }))
      .filter((c) => c.d > 60 && c.d < 140).sort((a, b) => a.d - b.d);
    const at = (cands[0] || { n: N[0] }).n;
    const nb = N[at.adj[0]];
    const h = Math.atan2(nb.x - at.x, nb.z - at.z);
    g.makeRoom('sedan');
    const car = g.addVehicle('sedan', 'black', at.x + Math.sin(h) * 4, at.z + Math.cos(h) * 4, h);
    if (!car) return;
    car.armor = 2.2;          // (an old wreck: it does not take much)
    this.car = car;
    this.chaser = new Chaser(g, car, { vMax: 15.5, burst: 0, hold: 0.5, polite: true });
    g.racers.push(this.chaser);
    this.newGoal();
  }

  // somewhere to run to: a town crossing well away from you, not straight past you
  newGoal() {
    const g = this.game, p = g.player, car = this.car, N = g.layout.gps.nodes;
    const px = p.inCar ? p.car.x : p.x, pz = p.inCar ? p.car.z : p.z;
    let best = null, bs = -1e9;
    for (const n of N) {
      if (n.land !== 'town') continue;
      const dc = Math.hypot(n.x - car.x, n.z - car.z), dp = Math.hypot(n.x - px, n.z - pz);
      if (dc < 50 || dc > 170) continue;
      const s = dp - dc * 0.35 + g.rng() * 40;
      if (s > bs) { bs = s; best = n; }
    }
    if (best) this.chaser.goal = { x: best.x, z: best.z, vx: 0, vz: 0, ref: null };
    this.goalT = 0;
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, car = this.car;
    this.prompt = null;
    if (!car || car.removed) { if (this.stage === 'chase' || this.stage === 'stopped') { m.fail(this, 'Den svarta bilen försvann'); } return; }
    const T = p.inCar ? p.car : p;
    const d = Math.hypot(car.x - T.x, car.z - T.z);
    if (this.stage === 'chase') {
      // new goal when it gets there, or every few seconds
      const G = this.chaser.goal;
      this.goalT += dt;
      if (!G || Math.hypot(G.x - car.x, G.z - car.z) < 14 || this.goalT > 9) this.newGoal();
      // rammed enough: the engine gives up, the driver runs
      if (car.health <= JAR.stopAt || car.dead) { this.stop(); return; }
      this.farT = d > JAR.flee ? this.farT + dt : 0;
      if (this.farT > JAR.fleeT) { this.lost(); return; }
      const hp = Math.max(0, Math.round(((car.health - JAR.stopAt) / (100 - JAR.stopAt)) * 100));
      m.setObjective('Stoppa den svarta bilen', `Motorn ${hp} % · ${d > 70 ? 'den är långt bort!' : `${Math.round(d)} m bort`}`);
      return;
    }
    if (this.stage === 'stopped') {
      const near = p.state === 'foot' && Math.hypot(p.x - car.x, p.z - car.z) < 3.2;
      if (near) this.prompt = 'TA';
      m.setObjective('Ta syltburken', p.inCar ? 'Kliv ur vid den svarta bilen' : 'I den svarta bilen');
      return;
    }
    if (this.stage === 'return') {
      if (Math.hypot(T.x - KONDITORI.x, T.z - KONDITORI.z) < 2.4 && (!p.inCar || p.car.speed < 3)) { this.deliver(); return; }
      m.setObjective('Till konditoriet med syltburken', 'Sjuby Konditori, vid torget');
    }
  }

  stop() {
    const g = this.game, car = this.car;
    this.stage = 'stopped';
    this.chaser.retire(false);
    car.input.throttle = 0; car.input.park = true;
    g.emit('toast', { text: 'Motorn dog! Föraren springer därifrån – ta syltburken ur bilen.', long: true });
    const ped = new Ped(g, THUG_LOOK);
    const s = car.local(-1.6, 0.4);
    ped.x = s.x; ped.z = s.z; ped.y = g.world.groundHeight(s.x, s.z); ped.npc = 'thug'; ped.keep = false;
    g.peds.add(ped);
    ped.flee(car.x, car.z, 8);
    g.emit('say', { who: ped, text: 'Dahlgren kommer inte att gilla det här!' });
    this.thug = ped;
  }

  lost() {
    const g = this.game, m = this.mgr;
    if (this.chaser) this.chaser.retire(false);
    m.fail(this, 'Den svarta bilen kom undan', [WHO.gun, 'De kom undan! Men de kör säkert runt i stan än. Försök igen – jag vill ha tillbaka min syltburk!']);
    const car = this.car;
    m.later(4, () => { if (car && !car.removed && car.driver !== 'player') g.removeVehicle(car); });
  }

  interact() {
    if (this.prompt !== 'TA') return false;
    const g = this.game;
    this.jar = true;
    this.stage = 'return';
    this.prompt = null;
    g.emit('keys', { item: 'jar' });
    g.emit('toast', { text: 'Du har syltburken – med receptet i! Tillbaka till konditoriet.', long: true });
    return true;
  }

  onCrash(e) {
    if (this.stage === 'chase' && e.car === this.car && e.player && e.impact > 4 && (this.sayT = (this.sayT || 0)) < this.game.time) {
      this.sayT = this.game.time + 3;
      this.game.emit('say', { who: this.car, text: ['Hörru!', 'Släpp oss!', 'Det här är Dahlgrens bil!', 'Aj, lacken!'][Math.floor(this.game.rng() * 4)] });
    }
  }

  deliver() {
    const g = this.game, m = this.mgr, p = g.player, flag = m.flag, gun = flag.gun;
    this.stage = 'talk';
    if (p.inCar) p.exitCar(true);
    if (gun.away && !gun.konditori) flag.toHome();
    gun.x = KONDITORI_DOOR.x + 0.4; gun.z = KONDITORI_DOOR.z - 1.0; gun.y = g.world.groundHeight(gun.x, gun.z); gun.state = 'stand';
    flag.hush = true; gun.wave = false;
    const B = new Ped(g, BENGT_LOOK);
    B.x = KONDITORI_DOOR.x - 1.2; B.z = KONDITORI_DOOR.z - 0.9; B.y = g.world.groundHeight(B.x, B.z);
    B.state = 'stand'; B.keep = true; B.npc = 'bengt-out';
    g.peds.add(B);
    this.bengt = B;
    p.x = KONDITORI.x - 0.2; p.z = KONDITORI.z - 0.9; p.vx = p.vz = 0; p.y = g.world.groundHeight(p.x, p.z);
    p.frozen = true;
    for (const q of [gun, B]) { q.standH = q.h = Math.atan2(p.x - q.x, p.z - q.z); q.body.x = q.x; q.body.y = q.y; q.body.z = q.z; q.body.h = q.h; }
    p.h = Math.atan2(KONDITORI_DOOR.x - p.x, KONDITORI_DOOR.z - p.z);
    g.camFocus = { x: KONDITORI_DOOR.x - 0.3, y: 0.5, z: KONDITORI_DOOR.z - 1.6, yaw: 0.2, owner: 'jar', near: true };
    m.later(0.8, () => g.emit('talk', { id: this.id, pages: returnPages() }), this);
  }

  talkFx() {}

  talkDone() {
    if (this.stage !== 'talk') return;
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Syltburken', amount: JAR.reward });
    m.later(3.8, () => g.emit('toast', { text: 'Nästa steg: vänta på Bengts sms om Dahlgrens lastbil.', long: true }));
  }

  targets(T) {
    if (!this.car) return;
    if (this.stage === 'chase') T.push({ kind: 'racer', car: this.car, color: 0xff3b2f, gps: true });
    else if (this.stage === 'stopped') T.push({ kind: 'item', x: this.car.x, y: this.car.y + 1.6, z: this.car.z, gps: true });
    else if (this.stage === 'return') T.push({ kind: 'zone', x: KONDITORI.x, z: KONDITORI.z, r: 2.4, gps: true });
  }

  cleanup() {
    const g = this.game, m = this.mgr;
    this.prompt = null;
    g.player.frozen = false;
    m.flag.hush = false;
    if (g.camFocus && g.camFocus.owner === 'jar') g.camFocus = null;
    if (this.chaser && this.chaser.mode !== 'done') this.chaser.retire(false);
    const B = this.bengt;
    if (B) m.later(20, () => { const L = g.peds.list, i = L.indexOf(B); if (i >= 0) L.splice(i, 1); });
    if (this.stage === 'done') { const gun = m.flag.gun; gun.away = true; gun.konditori = true; m.flag.said.bye = true; m.flag.byeT = 0; }
  }
}
export { fmt };
