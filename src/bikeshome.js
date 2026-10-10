// Side quest "Cyklarna hem" (v1.2), after "Cykelgömman". Three of the bikes from Jonte's hideout have
// owners who want them back today: Vera (Salong Saxen), Lasse (Verkstan) and Yasmin (Hörnlivs).
// Polis-Pia has put them out along the way – Vera's by Birger's gate, Lasse's by the salon and
// Yasmin's by the garage. Ride each one home, in any order; the owner is waiting outside.
// Vera's has no saddle (it was in Birger's bathtub): you pedal standing up.
import { WHO, BIKES_HOME, BIKE_HOME_PAY, BIKES_HOME_BONUS } from './config.js';
import { FIA_LOOK, CUSTOMERS } from './barber.js';
import { spawnPed, removePed } from './hideout.js';
import { fmt } from './rng.js';

const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const YASMIN_LOOK = { shirt: 0x2f8f83, pants: 0x2b2d36, skin: 0xb98a64, hair: 0x1e1612, height: 0.97, bulk: 1.0, style: 1 | 32, accent: 0x2c62a8 };
// who is waiting for which bike, and what they say
export const OWNERS = {
  vera: {
    who: 'Vera', letter: 'V', color: '#e8833a', look: FIA_LOOK, npc: 'fia', name: 'Veras', where: 'Salong Saxen, Skolgatan',
    pages: [
      { text: 'Min cykel! Sadeln har Pia redan lämnat – den låg i ett badkar, sa hon. Ett BADKAR.' },
      { you: true, text: 'Jonte hade elva cyklar i grannens hus. Och en nalle som heter Cykel-Kalle.' },
      { text: 'Då vet jag vem som ska betala min handled. Här, för besväret – och nästa klippning är gratis.', last: 'TACK!' },
    ],
  },
  lasse: {
    who: 'Lasse', letter: 'L', color: '#ffcf33', look: CUSTOMERS[2].look, npc: 'lasse-out', name: 'Lasses', where: 'Lasses Verkstad, Drottninggatan',
    pages: [
      { text: 'Min gamla gula! Jag har letat i hela verkstan. Trodde att jag hade skruvat isär den och glömt bort det.' },
      { you: true, text: 'Den har stått i en garderob… nej, i ett vardagsrum. I Birgers.' },
      { text: 'Den ska få en turbo. Skämt åsido – tack. Ta en slant för besväret.', last: 'TACK!' },
    ],
  },
  yasmin: {
    who: 'Yasmin', letter: 'Y', color: '#ff6fae', look: YASMIN_LOOK, npc: 'yasmin-out', name: 'Yasmins', where: 'Hörnlivs, Kungsgatan',
    pages: [
      { text: 'Min cykel! Med korgen och allt! Nu kan jag cykla ut matkassarna själv igen.' },
      { you: true, text: 'Fast då behöver du ju inte mig.' },
      { text: 'Jo, till äggen. Ingen kör ägg som du. Här, för besväret!', last: 'TACK!' },
    ],
  },
};

export class BikesHomeJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'cyklarhem';
    this.stage = 'ride';     // ride (any bike to its owner) → talk → ride … → done
    this.prompt = null;
    this.left = BIKES_HOME.map((b) => b.id);
    this.bikes = {}; this.owners = {};
    this.cur = null;         // the delivery being talked about
    this.titleCard = true;
  }

  start() {
    const g = this.game;
    for (const b of BIKES_HOME) {
      this.bikes[b.id] = g.spawnCityBike(b.paint, b.bike.x, b.bike.z, b.bike.h);
      const O = OWNERS[b.id];
      this.owners[b.id] = spawnPed(g, { ...O.look }, b.owner.x, b.owner.z, b.owner.h, O.npc);
    }
    this.mgr.later(1.2, () => g.emit('toast', { text: 'Tre cyklar ska hem: Veras, Lasses och Yasmins. Följ pilarna – i vilken ordning du vill.', long: true }), this);
  }

  entry(id) { return BIKES_HOME.find((b) => b.id === id); }

  // the bike you are on, if it is one of the three (and not home yet)
  riding() {
    const p = this.game.player;
    if (!p.inCar || p.car.type !== 'citybike') return null;
    return this.left.find((id) => this.bikes[id] === p.car) || null;
  }

  update() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    if (this.stage !== 'ride') return;
    for (const id of this.left) { // (a bike lost somehow: back where Pia left it)
      const b = this.bikes[id];
      if (!b || b.removed) { const E = this.entry(id); this.bikes[id] = g.spawnCityBike(E.paint, E.bike.x, E.bike.z, E.bike.h); }
    }
    for (const id of BIKES_HOME.map((b) => b.id)) { const o = this.owners[id]; if (o && o.state === 'stand') o.standH = Math.hypot(p.x - o.x, p.z - o.z) < 14 ? Math.atan2(p.x - o.x, p.z - o.z) : this.entry(id).owner.h; }
    const id = this.riding();
    const n = this.left.length;
    if (id) {
      const E = this.entry(id), bike = this.bikes[id];
      if (Math.hypot(bike.x - E.zone.x, bike.z - E.zone.z) < E.zone.r && bike.speed < 3.5) { this.deliver(id); return; }
      m.setObjective(`Cykla hem ${OWNERS[id].name} cykel`, `${OWNERS[id].where} · ${n} av 3 kvar`);
      return;
    }
    m.setObjective('Hämta en cykel', `${n} av 3 kvar · ${this.left.map((k) => OWNERS[k].who).join(', ')} väntar`);
  }

  onEnterCar(e) {
    const g = this.game;
    if (e.car === this.bikes.vera && this.left.includes('vera') && !this.saddleT) {
      this.saddleT = true;
      g.emit('toast', { text: 'Ingen sadel! Du får stå upp och trampa hela vägen till Vera.', long: true });
    }
  }

  deliver(id) {
    const g = this.game, m = this.mgr, p = g.player, bike = this.bikes[id], o = this.owners[id], O = OWNERS[id];
    this.stage = 'talk';
    this.cur = id;
    bike.vx = bike.vz = bike.w = 0;
    p.exitCar(); // (slow enough to step off: no tumble)
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(o.x - p.x, o.z - p.z);
    o.standH = o.h = Math.atan2(p.x - o.x, p.z - o.z); o.body.h = o.h;
    const line = Math.atan2(o.x - p.x, o.z - p.z);
    g.camFocus = { x: (p.x + o.x) / 2, y: 0.4, z: (p.z + o.z) / 2, yaw: line - 0.6, owner: 'bikeshome', near: true };
    const who = { who: O.who, letter: O.letter, color: O.color };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: O.pages.map((pg) => (pg.you ? { ...YOU, ...pg } : { ...who, ...pg })) }), this);
  }

  talkFx() {}

  talkDone() {
    if (this.stage !== 'talk') return;
    const g = this.game, m = this.mgr, p = g.player, id = this.cur, o = this.owners[id], bike = this.bikes[id];
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'bikeshome') g.camFocus = null;
    // the bike on its stand beside its owner
    if (bike && !bike.removed) { bike.x = o.x + Math.sin(o.h + Math.PI / 2) * 1.3; bike.z = o.z + Math.cos(o.h + Math.PI / 2) * 1.3; bike.h = o.h; bike.y = g.world.groundHeight(bike.x, bike.z); bike.locked = true; }
    this.left = this.left.filter((k) => k !== id);
    g.stats.bikesHome = 3 - this.left.length;
    if (this.left.length) {
      this.stage = 'ride';
      m.pay(BIKE_HOME_PAY, null, null);
      g.emit('toast', { text: `+${fmt(BIKE_HOME_PAY)} kr · ${OWNERS[id].name} cykel är hemma. ${this.left.length === 1 ? 'En' : 'Två'} kvar!`, long: true });
      return;
    }
    this.stage = 'done';
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Cyklarna hem', amount: BIKE_HOME_PAY + BIKES_HOME_BONUS });
    m.sms(WHO.pia, `Alla tre hemma! Här är ${fmt(BIKES_HOME_BONUS)} kr extra från polisens hittegodskassa. Resten av cyklarna lämnar jag själv – och Birger kommer hem på lördag. Han vet ingenting än.`, 6);
  }

  targets(T) {
    const g = this.game;
    if (this.stage === 'done') return;
    const id = this.riding(), p = g.player;
    for (const k of BIKES_HOME.map((b) => b.id)) {
      const o = this.owners[k], O = OWNERS[k];
      if (o) T.push({ kind: 'contact', x: o.x, z: o.z, r: 1, letter: O.letter, color: O.color, badgeOnly: true, badgeY: 2.75, ref: o });
    }
    if (id) { const E = this.entry(id); T.push({ kind: 'zone', x: E.zone.x, z: E.zone.z, r: E.zone.r, gps: true }); return; }
    if (this.stage !== 'ride') return;
    let best = null, bd = 1e9;
    for (const k of this.left) {
      const b = this.bikes[k];
      if (!b || b.removed) continue;
      const t = { kind: 'car', car: b, color: 0x46c96f };
      T.push(t);
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      if (d < bd) { bd = d; best = t; }
    }
    if (best) best.gps = true; // the yellow line to the nearest one
  }

  cleanup() {
    const g = this.game, m = this.mgr;
    this.prompt = null;
    g.player.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'bikeshome') g.camFocus = null;
    // the owners go back in (and take their bikes) when nobody is looking
    const owners = Object.values(this.owners), bikes = Object.values(this.bikes);
    const hidden = (x, z) => { const p = g.player, d = Math.hypot(x - p.x, z - p.z); return d > 70 || (d > 35 && !g.visible(x, z)); };
    const tidy = () => {
      let wait = false;
      for (const o of owners) { if (!g.peds.list.includes(o)) continue; if (hidden(o.x, o.z)) removePed(g, o); else wait = true; }
      for (const b of bikes) { if (!b || b.removed || b.driver === 'player') continue; if (hidden(b.x, b.z)) g.removeVehicle(b); else wait = true; }
      if (wait) m.later(2, tidy);
    };
    m.later(4, tidy);
  }
}
