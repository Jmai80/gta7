// Missions for version 0.2. Three contacts give jobs that can be done in any order:
//   L  Lasse (Verkstan):  "Sno en röd bil", then deliver it to the garage (starts with an SMS)
//   S  Sanna (Pizzerian): "Pizzabudet" – walk into the marker outside Pizzeria Sjuan
//   K  Kim (Macken):      "Gatloppet" – drive into the marker at Macken
// Only one marker job runs at a time; Lasse's job waits meanwhile. Stunt jumps and the
// car wash work all the time. Progress (money, finished jobs, stats) can be saved and restored.
import { DELIVERY, CARWASH, RED_REWARD, DELIVERY_REWARD, WHO, PIZZERIA, PIZZA_CAR, MACKEN } from './config.js';
import { PizzaJob } from './pizza.js';
import { RaceJob } from './race.js';
import { fmt } from './rng.js';

export { fmt };

export const CONTACTS = [
  { id: 'lasse', letter: 'L', who: WHO.lasse, title: 'Röd bil', color: '#ffcf33', x: DELIVERY.x, z: DELIVERY.z, r: DELIVERY.r },
  {
    id: 'pizza', letter: 'S', who: WHO.sanna, title: 'Pizzabudet', color: '#46c96f', x: PIZZERIA.x, z: PIZZERIA.z, r: PIZZERIA.r, Job: PizzaJob, at: 9,
    intro: 'Hej, Sanna på Pizzeria Sjuan här! Mitt pizzabud har slutat (han körde in i fontänen). Kom förbi pizzerian på Kungsgatan om du vill tjäna en hacka.',
  },
  {
    id: 'race', letter: 'K', who: WHO.kim, title: 'Gatloppet', color: '#4aa8ff', x: MACKEN.x, z: MACKEN.z, r: MACKEN.r, Job: RaceJob, at: 18, needCar: true,
    intro: 'Kim här, på Macken. Folk säger att du kan köra. Gatlopp, två varv runt stan. Kom till Macken när du vågar – med egen bil.',
  },
];
const COLOR_OF = Object.fromEntries(CONTACTS.map((c) => [c.who, c.color]));
const JOB_IDS = CONTACTS.map((c) => c.id);
const SAVE_VERSION = 2;

export class Missions {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.queue = [];
    this.flags = {};
    this.done = new Set();          // 'red' (car stolen), 'lasse', 'pizza', 'race'
    this.lasse = 'intro';           // intro → steal → deliver_wait → deliver → done
    this.contacts = CONTACTS.map((c) => ({ ...c, open: false, cool: 0, armed: true, warned: false }));
    this.active = null;             // the running marker job (PizzaJob / RaceJob)
    this.targets = [];              // what the view and the minimap should point at
    this.objective = ''; this.sub = '';
    this.holdObj = 0;
    this.restored = false;
    this.washT = 0; this.inWash = false;
    this.keepT = 0;
    game.on('enterCar', (e) => this.onEnterCar(e));
    game.on('exitCar', (e) => this.active && this.active.onExitCar && this.active.onExitCar(e));
    game.on('crash', (e) => this.active && this.active.onCrash && this.active.onCrash(e));
  }

  // ---------------------------------------------------------------- helpers
  later(delay, fn, owner = null) { this.queue.push({ at: this.game.time + delay, fn, owner }); }
  cancel(owner) { this.queue = this.queue.filter((q) => q.owner !== owner); }

  setObjective(text, sub = '') {
    this.sub = sub;
    if (text === this.objective) return;
    this.objective = text;
    this.game.emit('objective', { text });
  }

  sms(who, text, delay = 0, owner = null) {
    const color = COLOR_OF[who] || null;
    this.later(delay, () => this.game.emit('sms', { from: who, text, color }), owner);
  }

  pay(amount, title, sub) {
    const g = this.game;
    g.money += amount;
    g.emit('money', { delta: amount, total: g.money });
    if (title) g.emit('banner', { title, sub, amount });
    g.emit('progress', {});
  }

  allDone() { return JOB_IDS.every((id) => this.done.has(id)); }

  // ---------------------------------------------------------------- save / load
  progress() {
    return { v: SAVE_VERSION, money: this.game.money, done: [...this.done], stats: { ...this.game.stats } };
  }

  restore(d) {
    if (!d || d.v !== SAVE_VERSION) return false;
    const g = this.game;
    g.money = Math.max(0, d.money || 0);
    Object.assign(g.stats, d.stats || {});
    this.done = new Set((d.done || []).filter((id) => id === 'red' || JOB_IDS.includes(id)));
    this.restored = true;
    this.lasse = this.done.has('lasse') ? 'done' : this.done.has('red') ? 'deliver' : 'intro';
    if (this.allDone()) this.flags.allDone = true;
    return true;
  }

  // for the pause menu
  list() {
    return this.contacts.map((c) => {
      let state = 'locked';
      if (this.done.has(c.id)) state = 'done';
      else if (this.active ? this.active.id === c.id : c.id === 'lasse' && this.lasse !== 'intro') state = 'active';
      else if (c.id === 'lasse' ? this.lasse !== 'intro' : c.open) state = 'open';
      return { letter: c.letter, title: c.title, color: c.color, state };
    });
  }

  // ---------------------------------------------------------------- per step
  update(dt) {
    const g = this.game;
    this.t += dt;
    g.stats.playTime = (g.stats.playTime || 0) + dt;
    for (let i = 0; i < this.queue.length; i++) {
      if (g.time >= this.queue[i].at) { const q = this.queue.splice(i, 1)[0]; i--; q.fn(); }
    }
    this.timeline();
    if (this.active) this.active.update(dt);
    else this.checkContacts(dt);
    if (!this.active) this.lasseStep();
    if (this.holdObj > 0) this.holdObj -= dt;
    if (!this.active && this.holdObj <= 0) this.setObjective(this.idleObjective(), '');
    this.buildTargets();
    this.activities(dt);
    if ((this.keepT -= dt) <= 0) { this.keepT = 2; this.keepPizzaCar(); }
  }

  // the opening: Lasse texts first, then Sanna and Kim show up on the map
  timeline() {
    const g = this.game;
    if (this.lasse === 'intro' && this.t > 1.4) {
      this.lasse = 'steal';
      this.sms(WHO.lasse, 'Tjena! Du är ny i stan, va? Visa vad du går för: sno en röd bil. Röda går fortast, det vet alla.');
      this.later(2.6, () => g.emit('hint', { id: 'steal', touch: 'Gå fram till en röd bil och tryck på den gula knappen', keys: 'Gå fram till en röd bil och tryck E' }));
    }
    for (const c of this.contacts) {
      if (!c.Job || c.open || this.done.has(c.id) || this.t < (this.restored ? 2 : c.at)) continue;
      c.open = true;
      if (!this.restored) this.sms(c.who, c.intro);
      if (this.contacts.every((q) => !q.Job || q.open || this.done.has(q.id))) {
        const text = 'Bokstäverna på kartan är uppdrag. Gör dem i vilken ordning du vill.';
        this.later(this.restored ? 1 : 5, () => g.emit('hint', { id: 'letters', touch: text, keys: text }));
      }
    }
  }

  // walking or driving into a contact's marker starts the job
  checkContacts(dt) {
    const g = this.game, p = g.player;
    if (p.state !== 'foot' && p.state !== 'car') return;
    const car = p.inCar ? p.car : null;
    const x = car ? car.x : p.x, z = car ? car.z : p.z;
    for (const c of this.contacts) {
      if (!c.Job || !c.open || this.done.has(c.id)) continue;
      if (c.cool > 0) { c.cool -= dt; continue; }
      const d = Math.hypot(x - c.x, z - c.z);
      if (d > c.r + 1.5) { c.armed = true; c.warned = false; continue; }
      if (d > c.r || !c.armed) continue;
      if (c.needCar && (!car || car.dead)) {
        if (!c.warned) { c.warned = true; g.emit('toast', { text: 'Kim kör bara mot folk med bil. Kom tillbaka med en!', long: true }); }
        continue;
      }
      if (car && car.speed > 12) continue;
      c.armed = false;
      this.startJob(c);
      return;
    }
  }

  startJob(c) {
    const g = this.game;
    this.active = new c.Job(this, c);
    if (this.active.titleCard !== false) g.emit('banner', { title: c.title.toUpperCase(), sub: c.who, kind: 'start' });
    g.emit('missionStart', { id: c.id });
    this.active.start();
  }

  complete(job, r) {
    const g = this.game;
    this.done.add(job.id);
    this.endJob(job);
    if (r.amount) this.pay(r.amount, r.title, r.sub);
    else { g.emit('banner', { title: r.title, sub: r.sub }); g.emit('progress', {}); }
    this.checkAllDone();
  }

  fail(job, reason, sms) {
    const g = this.game;
    this.endJob(job);
    const c = this.contacts.find((q) => q.id === job.id);
    if (c) { c.cool = 6; c.armed = false; }
    g.stats.fails = (g.stats.fails || 0) + 1;
    g.emit('banner', { title: 'UPPDRAG MISSLYCKAT', sub: reason, kind: 'fail' });
    if (sms) this.sms(sms[0], sms[1], 3.4); // after the banner
  }

  // walking away before the job really started: no failure, the marker just comes back
  quit(job, sms) {
    this.endJob(job);
    this.holdObj = 0;
    const c = this.contacts.find((q) => q.id === job.id);
    if (c) { c.cool = 3; c.armed = false; }
    if (sms) this.sms(sms[0], sms[1], 0.5);
  }

  endJob(job) {
    if (job.cleanup) job.cleanup();
    this.cancel(job);
    if (this.active === job) this.active = null;
    this.setObjective('', '');
    this.holdObj = 3.4;
  }

  checkAllDone() {
    if (this.flags.allDone || !this.allDone()) return;
    this.flags.allDone = true;
    const g = this.game;
    this.later(7.2, () => this.sms(WHO.game, 'Det var allt i version 0.2! Kör runt fritt. Tips: hoppet på byggtomten och biltvätten på Macken.'));
    this.later(9.8, () => g.emit('endcard', { stats: { ...g.stats, money: g.money } }));
  }

  idleObjective() {
    switch (this.lasse) {
      case 'steal': return 'Sno en röd bil';
      case 'deliver': {
        if (this.lasseCar()) return 'Kör bilen till Lasses Verkstad';
        const p = this.game.player;
        return p.inCar && p.car.isRed && p.car.dead ? 'Bilen är skrot – hitta en ny röd bil' : 'Hoppa in i en röd bil';
      }
      case 'intro': case 'deliver_wait': return '';
    }
    const open = this.contacts.filter((c) => c.Job && c.open && !this.done.has(c.id));
    if (open.length === 1) return `Nästa uppdrag: ${open[0].letter} på kartan`;
    if (open.length > 1) return `Välj uppdrag: ${open.map((c) => c.letter).join(' eller ')} på kartan`;
    if (this.flags.allDone) return 'Fri lek: utforska Sjuby';
    return '';
  }

  // ---------------------------------------------------------------- Lasse's job
  lasseCar() {
    const p = this.game.player;
    return p.inCar && p.car.isRed && !p.car.dead ? p.car : null;
  }

  lasseStep() {
    if (this.lasse !== 'deliver') return;
    const car = this.lasseCar();
    if (!car) return;
    const d = Math.hypot(car.x - DELIVERY.x, car.z - DELIVERY.z);
    if (d < DELIVERY.r && car.speed < 2.5 && !car.air) this.deliver(car);
    else if (d < DELIVERY.r + 2 && car.speed >= 2.5) this.game.emit('hint', { id: 'stopin', touch: 'Stanna i den gula cirkeln', keys: 'Stanna i den gula cirkeln' });
  }

  onEnterCar(e) {
    const { car, jacked } = e;
    const g = this.game;
    g.stats.carsStolen++;
    if (jacked) g.stats.carsJacked++;
    if (jacked && !this.flags.wantedJoke) {
      this.flags.wantedJoke = true;
      this.later(1.2, () => g.emit('wanted', { stars: 1 }));
      this.later(4.2, () => { g.emit('wanted', { stars: 0 }); g.emit('toast', { text: 'Polisen har fika till tre. Du kom undan!', long: true }); });
    }
    if (!this.active && this.lasse === 'steal') {
      if (car.isRed) {
        this.lasse = 'deliver_wait';
        this.done.add('red');
        g.stats.missionTime = g.time;
        this.setObjective('');
        this.holdObj = 3.4;
        this.pay(RED_REWARD, 'UPPDRAG KLART', 'Sno en röd bil');
        this.later(3.6, () => {
          if (this.lasse !== 'deliver_wait') return;
          this.lasse = 'deliver';
          this.sms(WHO.lasse, 'Snyggt! Kör kärran till min verkstad på Drottninggatan. Repor drar jag av på betalningen, så kör snällt.');
        });
        this.later(6.5, () => g.emit('hint', { id: 'drive', touch: 'Följ den gula linjen på kartan', keys: 'Följ den gula linjen på kartan' }));
      } else if (!this.flags.colorblind) {
        this.flags.colorblind = true;
        this.sms(WHO.lasse, `Den där är ju ${colorName(car)}… Är du färgblind? RÖD bil, sa jag.`);
      }
    }
    if (!this.flags.driveHint) {
      this.flags.driveHint = true;
      this.later(0.6, () => g.emit('hint', { id: 'carcontrols', touch: 'Dra spaken uppåt för att köra, nedåt för att bromsa och backa', keys: 'W/S gas och broms · A/D styr · Mellanslag handbroms · H tuta' }));
    }
    if (this.active && this.active.onEnterCar) this.active.onEnterCar(e);
  }

  deliver(car) {
    const g = this.game;
    if (this.lasse !== 'deliver') return;
    this.lasse = 'done';
    this.done.add('lasse');
    const cond = Math.round(car.health);
    const reward = Math.max(500, Math.round((DELIVERY_REWARD * cond) / 100 / 50) * 50);
    const ded = DELIVERY_REWARD - reward;
    g.stats.deliveredCondition = cond;
    g.stats.totalTime = g.time;
    this.setObjective('');
    this.holdObj = 3.4;
    this.pay(reward, 'UPPDRAG KLART', 'Leverera bilen till Lasse');
    car.input.throttle = 0;
    car.vx *= 0.2; car.vz *= 0.2;
    let text;
    if (cond >= 95) text = `Inte en repa! Du är ett proffs. Hela ${fmt(reward)} kr är dina.`;
    else if (cond >= 60) text = `Lite bucklor här och där… Jag drar av ${fmt(ded)} kr. Biltvätten på Macken fixar sånt, bara så du vet.`;
    else text = `Vad har du GJORT med den?! Den ser ut som kaffesump. ${fmt(reward)} kr får räcka.`;
    this.sms(WHO.lasse, text, 3.4);
    this.checkAllDone();
  }

  // ---------------------------------------------------------------- map + view targets
  buildTargets() {
    const T = this.targets, g = this.game;
    T.length = 0;
    if (this.active) { this.active.targets(T); return; }
    const L = this.lasse;
    if (L === 'steal' || L === 'deliver' || L === 'deliver_wait') {
      const car = L === 'deliver' ? this.lasseCar() : null;
      if (!car && L !== 'deliver_wait') {
        for (const v of g.vehicles) if (v.isRed && !v.dead && v.driver !== 'player') T.push({ kind: 'car', car: v });
      }
      // Lasse's letter marks the garage; it becomes the delivery zone once you have a red car
      if (car) T.push({ kind: 'zone', x: DELIVERY.x, z: DELIVERY.z, r: DELIVERY.r, gps: true, letter: 'L', color: CONTACTS[0].color });
      else T.push({ kind: 'contact', x: DELIVERY.x, z: DELIVERY.z, r: DELIVERY.r, letter: 'L', color: CONTACTS[0].color, mapOnly: true });
    }
    const lasseBusy = L !== 'done';
    for (const c of this.contacts) {
      if (!c.Job || !c.open || this.done.has(c.id) || c.cool > 0) continue;
      T.push({ kind: 'contact', x: c.x, z: c.z, r: c.r, letter: c.letter, color: c.color, gps: !lasseBusy });
    }
  }

  // ---------------------------------------------------------------- the pizza car
  // keeps Sanna's car available at its stall: brought back when it is wrecked or left far away
  keepPizzaCar() {
    const g = this.game, p = g.player;
    if (this.active && this.active.id === 'pizza') return;
    const pz = g.pizzaCar, S = PIZZA_CAR;
    const hidden = (x, z) => Math.hypot(x - p.x, z - p.z) > 70 && !g.visible(x, z);
    const atStall = (v) => Math.hypot(v.x - S.x, v.z - S.z) < 3.5;
    if (!pz || pz.removed || pz.dead) {
      if (!hidden(S.x, S.z)) return;
      if (pz && !pz.removed && atStall(pz)) g.removeVehicle(pz); // a wreck in the stall
      if (!g.vehicles.some(atStall)) g.spawnPizzaCar();
    } else if (pz.driver === null && !atStall(pz) && Math.hypot(pz.x - S.x, pz.z - S.z) > 25 &&
      hidden(pz.x, pz.z) && hidden(S.x, S.z) && !g.vehicles.some((v) => v !== pz && atStall(v))) {
      this.parkPizzaCar(pz);
    }
  }

  parkPizzaCar(v) {
    const S = PIZZA_CAR, g = this.game;
    v.x = S.x; v.z = S.z; v.h = S.h;
    v.vx = v.vz = v.vy = v.w = 0; v.steer = 0; v.air = false; v.coastT = 0;
    v.y = g.world.groundHeight(S.x, S.z);
    v.input.throttle = 0; v.input.park = true;
    v.parkedSpot = true;
    v.repair();
  }

  // the pizza job needs the car near the pizzeria (or under the player)
  ensurePizzaCar() {
    const g = this.game, S = PIZZA_CAR;
    const pz = g.pizzaCar;
    if (pz && !pz.removed && !pz.dead) {
      if (pz.driver === 'player' || Math.hypot(pz.x - S.x, pz.z - S.z) < 60) return pz;
      if (pz.driver === null) { this.parkPizzaCar(pz); return pz; }
    }
    // clear the stall (a car someone left there) and bring a fresh one
    for (const v of [...g.vehicles]) {
      if (v.driver !== 'player' && Math.hypot(v.x - S.x, v.z - S.z) < 3.5) g.removeVehicle(v);
    }
    return g.spawnPizzaCar() || pz;
  }

  // ---------------------------------------------------------------- side activities
  activities(dt) {
    const g = this.game, p = g.player;
    const car = p.inCar ? p.car : null;
    // stunt jumps
    for (const v of g.vehicles) {
      if (!v.landed) continue;
      const L = v.landed; v.landed = null;
      if (v !== car) continue;
      if (L.impact > 7) {
        v.damage((L.impact - 7) * 3);
        g.emit('crash', { x: v.x, z: v.z, impact: L.impact, player: true, landing: true });
      } else g.emit('land', { impact: L.impact });
      if (L.airTime > 0.75 && L.dist > 10) {
        const dist = Math.round(L.dist);
        const amount = Math.max(150, Math.round((dist * 18) / 50) * 50) + (g.stats.stuntJumps === 0 ? 500 : 0);
        g.stats.stuntJumps++;
        g.stats.bestJump = Math.max(g.stats.bestJump, dist);
        this.pay(amount, null, null);
        g.emit('stunt', { dist, air: L.airTime, amount });
      }
    }
    // car wash: stop inside to fix dents
    const w = CARWASH;
    const inside = car && car.x > w.x0 && car.x < w.x1 && car.z > w.z0 && car.z < w.z1;
    if (inside) {
      if (!this.inWash) { this.inWash = true; this.washT = 0; this.washDone = false; }
      if (car.speed < 1.2 && !this.washDone) {
        this.washT += dt;
        if (this.washT > 0.4 && !this.washStarted) { this.washStarted = true; g.emit('wash', { on: true, car }); }
        if (this.washT > 2.4) {
          this.washDone = true; this.washStarted = false;
          g.emit('wash', { on: false, car });
          if (car.health >= 99.5) g.emit('toast', { text: 'Bilen är redan skinande ren!' });
          else if (g.money < w.cost) g.emit('toast', { text: `Tvätten kostar ${w.cost} kr – du har inte råd.` });
          else {
            car.repair();
            g.money -= w.cost;
            g.emit('money', { delta: -w.cost, total: g.money });
            g.emit('toast', { text: `Som ny! Bucklorna är borta. −${w.cost} kr` });
            g.stats.washes = (g.stats.washes || 0) + 1;
            g.emit('progress', {});
          }
        }
      }
    } else if (this.inWash) {
      this.inWash = false;
      if (this.washStarted) { this.washStarted = false; g.emit('wash', { on: false, car: null }); }
    }
  }
}

function colorName(car) {
  const names = { white: 'vit', black: 'svart', blue: 'blå', silver: 'silvergrå', yellow: 'gul', green: 'grön', lightblue: 'ljusblå', pizza: 'grön' };
  return names[car.paint] || 'inte röd';
}
