// Main quest, part 4: "Kassaskåpet" (v0.7). The light in Bullbilen's bakery office is on every
// night: that is where the safe is, with the second half of Arne's recipe. Slip in by the side door
// while Bagar-Bengt is out checking the ovens, work out the code (a note on the desk, the diploma on
// the wall), open the safe and take the recipe. That sets off the alarm: get out before Bengt is
// back, and get the recipe to tant Gun with the Bullbilen vans after you.
import { WHO, GUN_GATE, SAFE_TIME, SAFE_REWARD } from './config.js';
import { OFFICE } from './office.js';
import { ISLE } from './island.js';
import { Ped } from './peds.js';
import { Chaser, CHASE, ESCAPE_BONUS } from './bikejob.js';
import { fmt } from './rng.js';

const BENGT_LOOK = { shirt: 0xf2efe6, pants: 0xe2ddd0, skin: 0xe9c3a6, hair: 0x3a2a1a, height: 1.04, bulk: 1.28, style: 4 | 32 | 64, accent: 0xf8f6f0 }; // beard, apron, baker's hat
const GUN = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const VANS = 2;
const VAN = { vMax: 19, burst: 3, start: 2.5 };   // after a car they drive faster than after the bike
const HEAD_START = 3.2;                            // seconds after the alarm before Bengt bursts in
const CATCH = { foot: 2.6, nose: 3.0, slow: 3.2, pressT: 1.4 };

export function finalePages(job) {
  return [
    { ...GUN, text: 'Du har det! Låt mig se… ”Del 2 av 2: …kardemumma, en nypa salt och hemligheten: brynt smör.” Det är Arnes handstil!' },
    { ...YOU, text: job.escaped ? 'Bullbilarna jagade mig, men de tappade bort mig på vägen.' : 'Hela Bullbilen-flottan var efter mig!' },
    { ...GUN, fx: 'recipe', text: 'Och nu passar halvorna ihop. Receptet på Sjubybullen är helt igen – för första gången på trettio år.' },
    { ...GUN, text: 'Bullbilen har bakat på ett halvt recept hela tiden. Det är därför deras bullar smakar papp.' },
    { ...GUN, text: 'Arne drömde om att Sjuby Konditori skulle öppna igen. Nu kanske det kan bli av… Men först: här, för besväret.', last: 'TACK!' },
  ];
}

export class SafeJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'kassaskap';
    this.stage = 'enter';    // enter → search → (safe open) → alarm → escape → deliver → talk → done (or caught)
    this.prompt = null;
    this.left = SAFE_TIME;
    this.knowNote = false; this.knowYear = false;
    this.safeOpen = false; this.recipe = false;
    this.bengt = null;
    this.vans = []; this.chasers = [];
    this.escaped = false; this.losT = 0; this.farT = 0; this.chaseT = 0; this.pressT = 0;
    this.titleCard = true;
  }

  start() {
    const g = this.game, m = this.mgr;
    m.setObjective('Bagerikontoret', 'Norrholmen');
    g.indoors.enter(() => {
      this.stage = 'search';
      g.emit('toast', { text: 'Bullbilens kontor · det luktar kanel och kaffe', long: false });
      m.later(1.0, () => g.emit('hint', { id: 'safe', touch: `Bagar-Bengt kollar ugnarna. Hitta koden till kassaskåpet innan han är tillbaka – titta dig omkring!`, keys: 'Bagar-Bengt kollar ugnarna. Hitta koden till kassaskåpet innan han är tillbaka – gå fram till sakerna och tryck E.' }), this);
    }, 'office');
  }

  // what is left to look at (for the arrows and the floor plan)
  spots() {
    if (this.stage !== 'search') return [];
    const S = [];
    if (!this.knowNote) S.push(OFFICE.note);
    if (!this.knowYear) S.push(OFFICE.diploma);
    S.push(OFFICE.safe);
    return S;
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null;
    if (this.stage === 'enter' || this.stage === 'caught' || this.stage === 'talk' || this.stage === 'deliver' || this.stage === 'done') return;
    if (this.stage === 'search' || this.stage === 'alarm') {
      if (!ind.inside && !ind.busy) {             // out through the side door
        if (this.recipe) { this.escapeStart(); return; }
        m.quit(this, [WHO.gun, 'Kom tillbaka när du vågar. Ljuset på kontoret lyser varje natt.']);
        return;
      }
      if (ind.busy) return;
      if (this.stage === 'search') this.search(dt);
      else this.alarm(dt);
      return;
    }
    if (this.stage === 'escape') this.escape(dt);
  }

  // ------------------------------------------------------------ in the office
  search(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    const before = this.left;
    this.left -= dt;
    if (before > 25 && this.left <= 25) g.emit('toast', { text: 'Du hör steg och visslingar från bageriet…', long: false });
    if (before > 8 && this.left <= 8) g.emit('toast', { text: 'Stegen kommer närmare!', long: false });
    if (this.left <= 0) { this.bengtIn(true); return; }
    const near = (s) => p.state === 'foot' && !p.frozen && Math.hypot(p.x - s.x, p.z - s.z) < s.r;
    if (!this.safeOpen) {
      if (near(OFFICE.safe)) this.prompt = 'ÖPPNA';
      else if (!this.knowNote && near(OFFICE.note)) this.prompt = 'TITTA';
      else if (!this.knowYear && near(OFFICE.diploma)) this.prompt = 'TITTA';
    } else if (!this.recipe && near(OFFICE.safe)) this.prompt = 'TA';
    const clue = this.safeOpen ? 'Ta receptet!' : this.knowNote && this.knowYear ? 'Du vet koden' : this.knowNote ? 'Året de startade… var står det?' : 'Leta efter koden';
    m.setObjective(this.safeOpen ? 'Ta receptet ur kassaskåpet' : 'Öppna kassaskåpet', `Bengt är tillbaka om ${Math.ceil(this.left)} s · ${clue}`);
  }

  interact() {
    const g = this.game, p = g.player;
    if (this.prompt === 'TITTA') {
      if (Math.hypot(p.x - OFFICE.note.x, p.z - OFFICE.note.z) < OFFICE.note.r) {
        this.knowNote = true;
        g.emit('toast', { text: 'En gul lapp: ”Koden till skåpet = året vi startade. Skriv inte upp den igen!! /B”', long: true });
      } else {
        this.knowYear = true;
        g.emit('toast', { text: 'Ett inramat diplom: ”BULLBILEN AB – GRUNDAT 1994”', long: true });
      }
      this.prompt = null;
      return true;
    }
    if (this.prompt === 'ÖPPNA') {
      if (this.knowNote && this.knowYear) {
        this.safeOpen = true;
        g.emit('toast', { text: '1 – 9 – 9 – 4 … KLICK! Kassaskåpet är öppet.', long: true });
        g.emit('keys', { safe: true });
      } else if (this.knowNote) g.emit('toast', { text: 'Året de startade… men vilket år? Det måste stå någonstans här inne.', long: true });
      else if (this.knowYear) g.emit('toast', { text: '1994 på diplomet – men är det koden? Leta efter en ledtråd.', long: true });
      else g.emit('toast', { text: 'Ett kodlås med fyra siffror. Det måste finnas en ledtråd här på kontoret.', long: true });
      this.prompt = null;
      return true;
    }
    if (this.prompt === 'TA') {
      this.recipe = true;
      this.prompt = null;
      this.stage = 'alarm';
      this.alarmT = 0;
      g.emit('toast', { text: 'Du har andra halvan av receptet! … och LARMET GÅR. Ut därifrån!', long: true });
      g.emit('wanted', { stars: 2 });
      g.emit('alarm', { on: true });
      return true;
    }
    return false;
  }

  // the alarm rings: Bengt comes running from the bakery hall
  alarm(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    this.alarmT += dt;
    if (this.alarmT >= HEAD_START && !this.bengt) this.bengtIn(false);
    m.setObjective('Ut ur kontoret!', 'Sidodörren – innan Bengt hinner fram');
    const b = this.bengt;
    if (!b) return;
    if (b.state === 'flee') { b.fleeFrom = { x: 2 * b.x - p.x, z: 2 * b.z - p.z }; b.fleeFor = 99; } // (running away from a point behind him: straight at you)
    if (Math.hypot(b.x - p.x, b.z - p.z) < 0.95) this.caught('bengt');
  }

  // Bagar-Bengt comes in through the hall door: caught red-handed (time is up), or after you (the alarm)
  bengtIn(timeUp) {
    const g = this.game, H = OFFICE.hall, p = g.player;
    const ped = new Ped(g, BENGT_LOOK);
    ped.x = H.x; ped.z = H.z + 0.4; ped.y = OFFICE.y;
    ped.h = Math.atan2(p.x - ped.x, p.z - ped.z);
    ped.keep = true; ped.npc = 'bengt';
    ped.body.x = ped.x; ped.body.y = ped.y; ped.body.z = ped.z; ped.body.h = ped.h;
    g.peds.add(ped);
    this.bengt = ped;
    if (timeUp) {
      ped.state = 'stand'; ped.standH = ped.h;
      g.emit('say', { who: ped, text: 'VAD GÖR DU PÅ MITT KONTOR?!' });
      this.caught('bengt');
    } else {
      ped.flee(2 * ped.x - p.x, 2 * ped.z - p.z, 99);
      ped.speed = 4.6;
      g.emit('say', { who: ped, text: 'TJUV! Ge hit det där!' });
    }
  }

  removeBengt() {
    if (!this.bengt) return;
    const L = this.game.peds.list, i = L.indexOf(this.bengt);
    if (i >= 0) L.splice(i, 1);
    this.bengt = null;
  }

  // ------------------------------------------------------------ the escape
  escapeStart() {
    const g = this.game, m = this.mgr;
    this.removeBengt();
    this.stage = 'escape';
    this.releaseVans();
    m.later(0.6, () => g.emit('hint', { id: 'escape', touch: 'Till tant Gun med receptet! Bullbilarna kör bara på vägarna – genvägar skakar av dem.', keys: 'Till tant Gun med receptet! Bullbilarna kör bara på vägarna – genvägar skakar av dem.' }), this);
  }

  releaseVans() {
    const g = this.game, Y = ISLE.yard;
    const gateX = Y.x0, gateZ = (Y.gateZ0 + Y.gateZ1) / 2;
    const free = g.vehicles.filter((v) => v.type === 'van' && !v.driver && !v.dead && v.x > Y.x0 && v.x < Y.x1 && v.z > Y.z0 && v.z < Y.z1)
      .sort((a, b) => Math.hypot(a.x - gateX, a.z - gateZ) - Math.hypot(b.x - gateX, b.z - gateZ));
    for (let i = 0; i < VANS; i++) {
      let van = free[i];
      if (!van) { g.makeRoom('van'); van = g.addVehicle('van', 'green', ISLE.vanSpawn.x - i * 6, ISLE.vanSpawn.z, ISLE.vanSpawn.h); }
      if (!van) continue;
      const ch = new Chaser(g, van, { vMax: VAN.vMax - i * 1.5, burst: VAN.burst, hold: VAN.start + i * 1.2 });
      g.racers.push(ch);
      this.vans.push(van); this.chasers.push(ch);
    }
    g.emit('toast', { text: 'Bullbilarna rullar ut från bageriet!', long: true });
    this.mgr.later(VAN.start, () => { const v = this.vans[0]; if (v && this.stage === 'escape') { g.emit('honk', { car: v }); g.emit('say', { who: v, text: 'Receptet! Stoppa hen!' }); } }, this);
  }

  // the nearest van that is still after you, and how far it is
  nearest() {
    const p = this.game.player, x = p.inCar ? p.car.x : p.x, z = p.inCar ? p.car.z : p.z;
    let best = null, bd = 1e9;
    this.chasers.forEach((ch, i) => {
      if (ch.mode !== 'chase') return;
      const v = this.vans[i], d = Math.hypot(v.x - x, v.z - z);
      if (d < bd) { bd = d; best = i; }
    });
    return { i: best, d: bd };
  }

  escape(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    const car = p.inCar ? p.car : null;
    const T = car || p;
    const chasing = this.chasers.some((ch) => ch.mode === 'chase');
    // at Gun's gate
    const dG = Math.hypot(T.x - GUN_GATE.x, T.z - GUN_GATE.z);
    if (dG < GUN_GATE.r + 0.6 && (!car || car.speed < 3.5)) { this.deliver(); return; }
    // the vans: after you; right up against you while you are slow (or on foot) – they have you
    for (let i = 0; i < this.chasers.length; i++) {
      const ch = this.chasers[i], v = this.vans[i];
      if (ch.mode !== 'chase') continue;
      ch.goal = { x: T.x, z: T.z, vx: T.vx || 0, vz: T.vz || 0, ref: T };
    }
    const n = this.nearest();
    if (n.i != null) {
      const v = this.vans[n.i];
      if (!car && n.d < CATCH.foot) { this.caught('van'); return; }
      const nose = Math.hypot(v.x + Math.sin(v.h) * 2.0 - T.x, v.z + Math.cos(v.h) * 2.0 - T.z);
      this.pressT = car && nose < CATCH.nose && car.speed < CATCH.slow ? this.pressT + dt : 0;
      if (this.pressT > CATCH.pressT) { this.caught('van'); return; }
      if (n.d < 20 && (this.honkT = (this.honkT || 0) - dt) <= 0) {
        this.honkT = 2.4 + g.rng() * 1.5;
        g.emit('honk', { car: v });
        if (g.rng() < 0.5) g.emit('say', { who: v, text: ['Ge hit receptet!', 'Tjuv!', 'Det är VÅRT recept!', 'Stanna!'][Math.floor(g.rng() * 4)] });
      }
      // out of sight and far enough behind (all of them), or simply far behind: they give up
      if ((this.losCheckT = (this.losCheckT || 0) - dt) <= 0) {
        this.losCheckT = 0.25;
        this.sawLos = this.chasers.some((ch, i) => ch.mode === 'chase' && (ch.hold > 0 || ch.los(T.x, T.z)));
      }
      if (!this.chasers.some((ch) => ch.hold > 0)) this.chaseT += dt;
      this.losT = !this.sawLos && n.d > CHASE.lose ? this.losT + dt : 0;
      this.farT = n.d > CHASE.far ? this.farT + dt : 0;
      if (this.chaseT > CHASE.minChase && (this.losT > CHASE.loseT || this.farT > CHASE.farT)) this.lost();
    }
    const line = !chasing ? (this.escaped ? 'Du skakade av dig Bullbilen' : 'Storgatan') : n.d > 70 ? 'Bullbilarna är långt efter' : `Bullbilen är ${Math.round(n.d)} m bort`;
    m.setObjective('Till tant Gun med receptet', line);
  }

  lost() {
    const g = this.game;
    this.escaped = true;
    for (const ch of this.chasers) if (ch.mode === 'chase') ch.mode = 'home';
    g.emit('wanted', { stars: 0 });
    g.emit('toast', { text: 'Du skakade av dig Bullbilarna!', long: true });
    if (this.vans[0]) g.emit('say', { who: this.vans[0], text: 'Vart tog hen vägen?!' });
    g.emit('chaseLost', {});
  }

  onBikeFall(e) {
    if (this.stage !== 'escape') return;
    if (this.vans.includes(e.by) || this.nearest().d < 8) this.caught('van');
  }

  // caught: Bengt in the office, or the vans out on the road. The recipe goes back in the safe.
  caught(how) {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'caught') return;
    this.stage = 'caught';
    this.prompt = null;
    p.frozen = true; p.vx = p.vz = 0;
    g.emit('caught', {});
    g.emit('alarm', { on: false });
    if (how === 'van' && this.vans[0]) {
      const n = this.nearest(), v = this.vans[n.i ?? 0];
      g.emit('say', { who: v, text: 'Tack för receptet! Det ska tillbaka i skåpet.' });
    }
    const reason = how === 'bengt' ? 'Bagar-Bengt tog dig' : 'Bullbilen tog receptet';
    m.later(1.6, () => {
      g.emit('fade', { on: true });
      m.later(0.55, () => {
        const finish = () => {
          this.reset();
          m.fail(this, reason, [WHO.gun, how === 'bengt'
            ? 'Bengt slängde ut dig? Han brukar gå ut till ugnarna igen efter en stund. Försök en gång till!'
            : 'De tog tillbaka receptet och låste in det igen. Ge inte upp – ljuset lyser fortfarande på kontoret!']);
          m.later(0.35, () => g.emit('fade', { on: false }));
        };
        if (g.indoors.inside) g.indoors.exit(finish); else finish();
      });
    }, this);
  }

  reset() {
    const g = this.game;
    this.removeBengt();
    g.player.frozen = false;
    g.emit('wanted', { stars: 0 });
    for (const ch of this.chasers) if (ch.mode !== 'done') ch.retire(true, true);
  }

  // ------------------------------------------------------------ at tant Gun's gate
  deliver() {
    const g = this.game, m = this.mgr, p = g.player, flag = m.flag, gun = flag.gun;
    this.stage = 'deliver';
    for (const ch of this.chasers) if (ch.mode === 'chase') ch.mode = 'home';
    g.emit('wanted', { stars: 0 });
    if (gun.away) flag.toHome();
    if (p.inCar) p.exitCar(true);
    gun.x = GUN_GATE.x; gun.z = GUN_GATE.z - 2.9; gun.y = g.world.groundHeight(gun.x, gun.z);
    flag.hush = true; gun.wave = false;
    p.x = GUN_GATE.x + 0.5; p.z = GUN_GATE.z + 0.3; p.h = Math.PI; p.vx = p.vz = 0;
    p.y = g.world.groundHeight(p.x, p.z);
    p.frozen = true;
    gun.standH = gun.h = Math.atan2(p.x - gun.x, p.z - gun.z);
    gun.body.x = gun.x; gun.body.z = gun.z; gun.body.h = gun.h;
    const line = Math.atan2(gun.x - p.x, gun.z - p.z);
    g.camFocus = { x: (p.x + gun.x) / 2, y: 0.35, z: (p.z + gun.z) / 2, yaw: line - 0.6, owner: 'safe', near: true };
    m.later(0.9, () => { this.stage = 'talk'; g.emit('talk', { id: this.id, pages: finalePages(this) }); }, this);
  }

  talkFx() {}

  talkDone() {
    if (this.stage !== 'talk') return;
    this.stage = 'done';
    const g = this.game, m = this.mgr;
    g.stats.safeEscaped = this.escaped;
    const amount = SAFE_REWARD + (this.escaped ? ESCAPE_BONUS : 0);
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Kassaskåpet', amount });
    if (this.escaped) m.later(3.9, () => g.emit('toast', { text: `+${fmt(ESCAPE_BONUS)} kr för att du skakade av dig Bullbilarna!`, long: true }));
    m.sms(WHO.gun, 'Båda halvorna ligger i syltburken nu. I morgon bakar jag Sjubybullar efter Arnes recept – du får den första!', 8.5);
  }

  targets(T) {
    const g = this.game;
    if (this.stage === 'search' && g.indoors.inside) {
      for (const s of this.spots()) T.push({ kind: 'item', x: s.item[0], y: s.item[1], z: s.item[2], gps: false });
    }
    if (this.stage === 'escape') {
      this.chasers.forEach((ch, i) => { if (ch.mode === 'chase') T.push({ kind: 'racer', car: this.vans[i], color: 0xff3b2f }); });
      T.push({ kind: 'zone', x: GUN_GATE.x, z: GUN_GATE.z, r: GUN_GATE.r, gps: true });
    }
  }

  cleanup() {
    const g = this.game;
    this.prompt = null;
    g.player.frozen = false;
    this.mgr.flag.hush = false;
    g.emit('alarm', { on: false });
    if (this.stage !== 'caught') g.emit('wanted', { stars: 0 });
    if (g.camFocus && g.camFocus.owner === 'safe') g.camFocus = null;
    for (const ch of this.chasers) if (ch.mode === 'chase') ch.mode = 'home';
    if (!g.indoors.inside) this.removeBengt();
  }
}
