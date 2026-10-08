// Mission flow for version 0.1:
//   1) "Sno en röd bil"  → reward + update
//   2) "Kör den till Lasses Verkstad" → reward scaled by the car's condition
//   3) Free roam (stunt jumps and the car wash give a little money)
import { DELIVERY, CARWASH, RED_REWARD, DELIVERY_REWARD } from './config.js';

const LASSE = 'Lasse (Verkstan)';

export class Mission {
  constructor(game) {
    this.game = game;
    this.stage = 'intro';
    this.t = 0;
    this.targets = [];
    this.objective = '';
    this.queue = [];
    this.flags = {};
    this.washT = 0;
    this.inWash = false;
    game.on('enterCar', (e) => this.onEnterCar(e));
    game.on('exitCar', (e) => this.onExitCar(e));
  }

  later(delay, fn) { this.queue.push({ at: this.game.time + delay, fn }); }

  setObjective(text) {
    this.objective = text;
    this.game.emit('objective', { text });
  }

  sms(from, text, delay = 0) {
    this.later(delay, () => this.game.emit('sms', { from, text }));
  }

  pay(amount, title, sub) {
    const g = this.game;
    g.money += amount;
    g.emit('money', { delta: amount, total: g.money });
    if (title) g.emit('banner', { title, sub, amount });
  }

  restore(data) {
    // used by hot reload / continue: jump to the right stage
    if (!data) return;
    this.game.money = data.money || 0;
    if (data.stage === 'free') {
      this.stage = 'free'; this.flags.redDone = true; this.flags.delivered = true;
      this.setObjective('Fri lek: utforska Sjuby');
    } else if (data.stage === 'deliver') {
      this.stage = 'deliver'; this.flags.redDone = true;
      this.setObjective('Hoppa in i en röd bil');
    }
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.t += dt;
    for (let i = 0; i < this.queue.length; i++) {
      if (g.time >= this.queue[i].at) { const q = this.queue.splice(i, 1)[0]; i--; q.fn(); }
    }

    switch (this.stage) {
      case 'intro':
        if (this.t > 1.4) {
          this.stage = 'steal';
          g.emit('sms', { from: LASSE, text: 'Tjena! Du är ny i stan, va? Visa vad du går för: sno en röd bil. Röda går fortast, det vet alla.' });
          this.setObjective('Sno en röd bil');
          this.later(2.6, () => g.emit('hint', { id: 'steal', touch: 'Gå fram till en röd bil och tryck på den gula knappen', keys: 'Gå fram till en röd bil och tryck E' }));
        }
        break;
      case 'steal':
        this.targets = g.vehicles.filter((v) => v.isRed && !v.dead && v.driver !== 'player').map((car) => ({ kind: 'car', car }));
        break;
      case 'deliver': {
        const car = p.inCar ? p.car : null;
        if (car && car.isRed && !car.dead) {
          this.targets = [{ kind: 'zone', x: DELIVERY.x, z: DELIVERY.z, r: DELIVERY.r }];
          if (this.objective !== 'Kör bilen till Lasses Verkstad') this.setObjective('Kör bilen till Lasses Verkstad');
          const d = Math.hypot(car.x - DELIVERY.x, car.z - DELIVERY.z);
          if (d < DELIVERY.r && car.speed < 2.5 && !car.air) this.deliver(car);
          else if (d < DELIVERY.r + 2 && car.speed >= 2.5) g.emit('hint', { id: 'stopin', touch: 'Stanna i den gula cirkeln', keys: 'Stanna i den gula cirkeln' });
        } else {
          this.targets = g.vehicles.filter((v) => v.isRed && !v.dead && v.driver !== 'player').map((c) => ({ kind: 'car', car: c }));
          const want = car && car.isRed && car.dead ? 'Bilen är skrot – hitta en ny röd bil' : 'Hoppa in i en röd bil';
          if (this.objective !== want) this.setObjective(want);
        }
        break;
      }
      case 'free':
        this.targets = [];
        break;
    }
    this.activities(dt);
  }

  onEnterCar({ car, jacked }) {
    const g = this.game;
    g.stats.carsStolen++;
    if (jacked) g.stats.carsJacked++;
    if (jacked && !this.flags.wantedJoke) {
      this.flags.wantedJoke = true;
      this.later(1.2, () => g.emit('wanted', { stars: 1 }));
      this.later(4.2, () => { g.emit('wanted', { stars: 0 }); g.emit('toast', { text: 'Polisen har fika till tre. Du kom undan!', long: true }); });
    }
    if (this.stage === 'steal') {
      if (car.isRed) {
        this.flags.redDone = true;
        this.stage = 'deliver_wait';
        this.targets = [];
        g.stats.missionTime = g.time;
        this.pay(RED_REWARD, 'UPPDRAG KLART', 'Sno en röd bil');
        this.setObjective('');
        this.later(3.6, () => {
          this.stage = 'deliver';
          g.emit('sms', { from: LASSE, text: 'Snyggt! Kör kärran till min verkstad på Drottninggatan. Repor drar jag av på betalningen, så kör snällt.' });
        });
        this.later(6.5, () => g.emit('hint', { id: 'drive', touch: 'Följ den gula linjen på kartan', keys: 'Följ den gula linjen på kartan' }));
      } else if (!this.flags.colorblind) {
        this.flags.colorblind = true;
        g.emit('sms', { from: LASSE, text: `Den där är ju ${colorName(car)}… Är du färgblind? RÖD bil, sa jag.` });
      }
    }
    if (!this.flags.driveHint) {
      this.flags.driveHint = true;
      this.later(0.6, () => g.emit('hint', { id: 'carcontrols', touch: 'Dra spaken uppåt för att köra, nedåt för att bromsa och backa', keys: 'W/S gas och broms · A/D styr · Mellanslag handbroms · H tuta' }));
    }
  }

  onExitCar() {}

  deliver(car) {
    const g = this.game;
    if (this.stage !== 'deliver') return;
    this.stage = 'delivered';
    const cond = Math.round(car.health);
    let reward = Math.round((DELIVERY_REWARD * cond) / 100 / 50) * 50;
    reward = Math.max(500, reward);
    const ded = DELIVERY_REWARD - reward;
    g.stats.deliveredCondition = cond;
    g.stats.totalTime = g.time;
    this.targets = [];
    this.setObjective('');
    this.pay(reward, 'UPPDRAG KLART', 'Leverera bilen till Lasse');
    car.input.throttle = 0;
    car.vx *= 0.2; car.vz *= 0.2;
    let text;
    if (cond >= 95) text = `Inte en repa! Du är ett proffs. Hela ${fmt(reward)} kr är dina.`;
    else if (cond >= 60) text = `Lite bucklor här och där… Jag drar av ${fmt(ded)} kr. Biltvätten på Macken fixar sånt, bara så du vet.`;
    else text = `Vad har du GJORT med den?! Den ser ut som kaffesump. ${fmt(reward)} kr får räcka.`;
    this.sms(LASSE, text, 2.8);
    this.later(7.2, () => {
      g.emit('sms', { from: 'GTA 7', text: 'Det var allt i version 0.1! Kör runt fritt. Tips: hoppet på byggtomten och biltvätten på Macken.' });
      this.stage = 'free';
      this.setObjective('Fri lek: utforska Sjuby');
    });
    this.later(9.8, () => g.emit('endcard', { stats: { ...g.stats, money: g.money } }));
  }

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
  const names = { white: 'vit', black: 'svart', blue: 'blå', silver: 'silvergrå', yellow: 'gul', green: 'grön', lightblue: 'ljusblå' };
  return names[car.paint] || 'inte röd';
}

export function fmt(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}
