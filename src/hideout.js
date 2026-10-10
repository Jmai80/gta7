// Main quest, part 9: "Cykelgömman" (v1.2). Jonte lied: the old boathouse by the harbour was empty.
// But tant Gun hears clattering from next door at night – and her neighbour Birger has been away on a
// cruise since May. Polis-Pia can't go in without a warrant (three weeks of paperwork), but Gun has
// Birger's spare key: she waters his pelargoniums. Search the house – it is full of bikes – for what
// Pia needs: Jonte's notebook and Vera's saddle. Then a van pulls up outside: Ronny, Jonte's cousin,
// has come for the rest of the bikes. Ram the van until it gives up, and Pia does the rest.
import { WHO, BIRGER } from './config.js';
import { HOUSE, SPOTS } from './birger.js';
import { Ped, STYLE_BITS as ST } from './peds.js';
import { Chaser } from './bikejob.js';
import { circleVs } from './collide.js';

const PIA = { who: 'Polis-Pia', letter: 'P', color: '#3b6fd8' };
const RONNY = { who: 'Ronny', letter: 'R', color: '#8a6a4a' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
export const PIA_LOOK = { shirt: 0x2c4a7a, pants: 0x1d2a44, skin: 0xd9a77e, hair: 0x3a2618, height: 1.0, bulk: 1.05, style: ST.bun | ST.cap, accent: 0x1d2a44 };
// Jonte's cousin: the same blond hair, a beard, a cap and a worn work jacket
const RONNY_LOOK = { shirt: 0x6b6f3a, pants: 0x2b2e35, skin: 0xf0c8a8, hair: 0xd9b26b, height: 1.06, bulk: 1.18, style: ST.beard | ST.cap | ST.jacket, accent: 0x4a3a2a };
const SEARCH_T = 0.8; // seconds of rummaging before you see what is there

export function meetPages() {
  return [
    { ...PIA, text: 'Där är du! Jonte sitter på stationen och säger bara ”vilka cyklar?”. Båthuset vid hamnen var tomt.' },
    { ...PIA, text: 'Men tant Gun hör skrammel härifrån varje natt. Birger, som bor här, är på kryssning till Kanarieöarna sedan i maj.' },
    { ...YOU, text: 'Och du vill att jag går in?' },
    { ...PIA, text: 'Jag får inte gå in utan husrannsakan, och papperen tar tre veckor. Men Gun har Birgers reservnyckel – hon vattnar hans pelargoner.' },
    { ...PIA, text: 'Och den som vattnar blommor får ju titta sig omkring. Leta efter Jontes grejer – och Veras sadel. Här är nyckeln.', last: 'JAG GÅR IN' },
  ];
}
// (another go, after walking out half-way)
export function againPages() {
  return [
    { ...PIA, text: 'Nyckeln har du kvar. Leta efter Jontes grejer – och Veras sadel.', last: 'JAG GÅR IN' },
  ];
}
export function caughtPages() {
  return [
    { ...RONNY, text: 'Okej, okej, jag ger mig! Jag skulle bara köra cyklarna till en loppis i Norrköping. Jonte lovade mig hälften!' },
    { ...PIA, fx: 'pia', text: 'Ronny. Jontes kusin. Det kunde jag ha gissat.' },
    { ...PIA, text: 'Åtta cyklar i Birgers hus, tre i skåpbilen och en orange sadel i badkaret. Elva cyklar – nu börjar Jonte nog prata.' },
    { ...YOU, text: 'Och Birger?' },
    { ...PIA, text: 'Han kommer hem på lördag. Gun får berätta – när han har landat. Bra jobbat. Cyklarna ska hem till sina ägare, jag hör av mig.', last: 'TACK!' },
  ];
}

export function spawnPed(game, look, x, z, h, npc) {
  const ped = new Ped(game, look);
  ped.x = x; ped.z = z; ped.y = game.world.groundHeight(x, z);
  ped.h = ped.standH = h; ped.state = 'stand'; ped.keep = true; ped.npc = npc;
  ped.body.x = ped.x; ped.body.y = ped.y; ped.body.z = ped.z; ped.body.h = ped.h;
  game.peds.add(ped);
  return ped;
}
export function removePed(game, ped) { if (!ped) return; const L = game.peds.list, i = L.indexOf(ped); if (i >= 0) L.splice(i, 1); }
const hiddenFrom = (g, x, z) => { const p = g.player, d = Math.hypot(x - p.x, z - p.z); return d > 70 || (d > 35 && !g.visible(x, z)); };

// Polis-Pia waits by Birger's gate while the quest is open (put there and taken away out of sight)
export function gatePia(mgr) {
  const g = mgr.game;
  let pia = mgr.gatePia;
  if (pia && !g.peds.list.includes(pia)) pia = mgr.gatePia = null;
  const busy = mgr.active && mgr.active.id === 'cykelgomman';
  const want = mgr.isOpen('cykelgomman');
  if (want && !pia && !busy && !g.indoor && (hiddenFrom(g, BIRGER.pia.x, BIRGER.pia.z) || mgr.t < 0.5)) {
    mgr.gatePia = spawnPed(g, PIA_LOOK, BIRGER.pia.x, BIRGER.pia.z, BIRGER.pia.h, 'pia');
  } else if (!want && pia && !busy && hiddenFrom(g, pia.x, pia.z)) {
    removePed(g, pia); mgr.gatePia = null;
  }
}

export class HideoutJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'cykelgomman';
    this.stage = 'meet';  // meet → talk → door → search ⇄ read → honk → chase → stopped → final → done
    this.prompt = null;
    this.searched = new Set();
    this.found = new Set();  // 'bok', 'sadel'
    this.searchT = 0; this.spot = null;
    this.van = null; this.chaser = null; this.ronny = null;
    this.farT = 0; this.goalT = 0;
  }

  get pia() {
    const g = this.game, m = this.mgr;
    if (!m.gatePia || !g.peds.list.includes(m.gatePia)) m.gatePia = spawnPed(g, PIA_LOOK, BIRGER.pia.x, BIRGER.pia.z, BIRGER.pia.h, 'pia');
    return m.gatePia;
  }

  start() {
    const g = this.game, m = this.mgr, p = g.player;
    if (m.flags.hideFound) { this.ambush(); return; } // (the van got away last time: Ronny comes back for more)
    const pia = this.pia;
    this.stage = 'talk';
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(pia.x - p.x, pia.z - p.z);
    pia.standH = pia.h = Math.atan2(p.x - pia.x, p.z - pia.z); pia.body.h = pia.h;
    const line = Math.atan2(pia.x - p.x, pia.z - p.z);
    g.camFocus = { x: (p.x + pia.x) / 2, y: 0.4, z: (p.z + pia.z) / 2, yaw: line - 0.6, owner: 'hideout', near: true };
    const again = !!m.flags.hideTalked;
    m.flags.hideTalked = true;
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: again ? againPages() : meetPages() }), this);
  }

  // the places in the house you have not looked yet (the minimap and the arrows)
  spots() { return this.stage === 'search' || this.stage === 'read' ? SPOTS.filter((s) => !this.searched.has(s.id)) : []; }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null;
    if (this.stage === 'door') {
      const near = p.state === 'foot' && !p.frozen && Math.hypot(p.x - BIRGER.door.x, p.z - BIRGER.door.z) < BIRGER.door.r;
      if (near && !ind.busy) {
        this.stage = 'enter';
        ind.enter(() => {
          this.stage = 'search';
          g.emit('toast', { text: 'Birgers hus · Storgatan', long: false });
          m.later(0.8, () => g.emit('say', { who: p, text: 'Oj. Hela vardagsrummet är fullt av cyklar.' }), this);
          m.later(1.6, () => g.emit('hint', { id: 'leta', touch: 'Gå fram till möblerna med pilar och tryck LETA.', keys: 'Gå fram till möblerna med pilar och tryck E för att leta.' }), this);
        }, 'birger');
        return;
      }
      m.setObjective('Gå in i Birgers hus', p.inCar ? 'Kliv ur vid grinden' : 'Ytterdörren, uppför trappan');
      return;
    }
    if (this.stage === 'search' || this.stage === 'honk') {
      if (!ind.inside && !ind.busy) { this.outside(); return; }
    }
    if (this.stage === 'search') {
      if (this.searchT > 0) {
        this.searchT -= dt;
        if (this.searchT <= 0) this.reveal();
        m.setObjective('Leta efter bevis', 'Du letar…');
        return;
      }
      if (p.state === 'foot' && !p.frozen) {
        let best = null, bd = 1e9;
        for (const s of SPOTS) {
          if (this.searched.has(s.id)) continue;
          const d = Math.hypot(p.x - s.x, p.z - s.z);
          if (d < s.r && d < bd) { bd = d; best = s; }
        }
        this.spot = best;
        if (best) this.prompt = 'LETA';
      }
      m.setObjective('Leta efter bevis', `${this.found.size} av 2 hittade · Jontes grejer och Veras sadel`);
      return;
    }
    if (this.stage === 'honk') { m.setObjective('Gå ut!', 'Någon är vid grinden'); return; }
    if (this.stage === 'chase') { this.chase(dt); return; }
    if (this.stage === 'stopped') {
      const R = this.ronny;
      if (R) R.standH = Math.atan2(p.x - R.x, p.z - R.z);
      const near = R && p.state === 'foot' && !p.frozen && Math.hypot(p.x - R.x, p.z - R.z) < 3.0;
      if (near) { this.final(); return; }
      m.setObjective('Ta Ronny', p.inCar ? 'Kliv ur vid skåpbilen' : 'Han står vid skåpbilen');
    }
  }

  // the action button: look in (or under, or behind) whatever you are standing at
  interact() {
    if (this.prompt !== 'LETA' || !this.spot) return false;
    const g = this.game, p = g.player, s = this.spot;
    this.prompt = null;
    this.searchT = SEARCH_T;
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(s.item[0] - p.x, s.item[2] - p.z);
    g.emit('salon', { kind: 'pick' }); // (a rummage)
    return true;
  }

  reveal() {
    const g = this.game, s = this.spot;
    this.searched.add(s.id);
    if (s.find) { this.found.add(s.find); g.emit('keys', { item: s.find }); }
    this.stage = 'read';
    const left = 2 - this.found.size;
    const tail = s.find ? (left ? ' Nu fattas bara en sak till.' : ' Nu har Pia det hon behöver.') : '';
    g.emit('talk', { id: this.id, pages: [{ ...YOU, text: s.text + tail, last: s.find ? 'BRA!' : 'LETA VIDARE' }] });
  }

  talkFx(fx) {
    if (fx !== 'pia') return;
    // Polis-Pia arrives at the van (she was right behind you): a free spot beside Ronny, in the picture
    const g = this.game, p = g.player, R = this.ronny, pia = this.pia;
    const sx = R.x - p.x, sz = R.z - p.z, d = Math.hypot(sx, sz) || 1, ux = sx / d, uz = sz / d;
    const free = (x, z) => !g.world.query(x, z, 0.4).some((c) => c.h > 0.5 && circleVs(c, x, z, 0.4));
    const spots = [[-uz, ux], [uz, -ux]].map(([nx, nz]) => [R.x + nx * 1.2 - ux * 0.3, R.z + nz * 1.2 - uz * 0.3]);
    spots.push([p.x - uz * 1.3, p.z + ux * 1.3], [p.x + uz * 1.3, p.z - ux * 1.3]);
    const best = spots.find(([x, z]) => free(x, z)) || spots[0];
    pia.x = best[0]; pia.z = best[1]; pia.y = g.world.groundHeight(pia.x, pia.z); pia.state = 'stand';
    pia.standH = pia.h = Math.atan2(R.x - pia.x, R.z - pia.z);
    Object.assign(pia.body, { x: pia.x, y: pia.y, z: pia.z, h: pia.h });
    const F = g.camFocus;
    if (F && F.owner === 'hideout') g.camFocus = { ...F, x: (p.x + R.x + pia.x) / 3, z: (p.z + R.z + pia.z) / 3 };
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'talk') {
      this.stage = 'door';
      p.frozen = false;
      if (g.camFocus && g.camFocus.owner === 'hideout') g.camFocus = null;
      g.emit('keys', { item: 'birger' });
      g.emit('toast', { text: 'Du har Birgers reservnyckel. In genom ytterdörren!', long: true });
      return;
    }
    if (this.stage === 'read') {
      p.frozen = false;
      if (this.found.size < 2) { this.stage = 'search'; return; }
      // both found: a horn outside
      this.stage = 'honk';
      m.flags.hideFound = true;
      g.emit('horn', { on: true, car: null, other: true }); m.later(0.5, () => g.emit('horn', { on: false, car: null, other: true }), this);
      m.later(0.6, () => g.emit('toast', { text: 'TUUUT! Utanför tutar en bil. Någon har backat in vid Birgers grind!', long: true }), this);
      m.later(1.2, () => g.emit('say', { who: p, text: 'Vem kan det vara? Ut och kolla!' }), this);
      return;
    }
    if (this.stage === 'final') {
      this.stage = 'done';
      g.stats.hideoutFound = true;
      m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Cykelgömman', amount: BIRGER.reward });
      m.sms(WHO.gun, 'Elva cyklar i Birgers vardagsrum! Och jag som trodde att det var hans gamla kylskåp som lät. Tack, lilla vän.', 7);
    }
  }

  // out of the house: walked out half-way (you can come back), or out to the van in the street
  outside() {
    const g = this.game, m = this.mgr;
    if (this.stage === 'search') {
      m.quit(this, [WHO.pia, 'Gick du ut? Nyckeln har du kvar – gå in igen när du är redo. Jag väntar vid grinden.']);
      return;
    }
    this.spawnVan(1.4);
    g.emit('say', { who: this.van, text: 'Oj! Hej då – ses i Norrköping!' });
    m.later(0.8, () => g.emit('toast', { text: 'Det är Ronny, Jontes kusin – med en skåpbil full av cyklar. Stoppa honom!', long: true }), this);
    m.later(1.6, () => g.emit('hint', { id: 'van', touch: 'Ta en bil och kör in i skåpbilen tills motorn ger upp.', keys: 'Ta en bil och kör in i skåpbilen tills motorn ger upp.' }), this);
  }

  // the van got away last time: back again, by the gate, and off as soon as it sees you
  ambush() {
    const g = this.game, m = this.mgr;
    this.spawnVan(1.6);
    m.later(0.4, () => g.emit('toast', { text: 'Ronny är tillbaka efter resten av cyklarna! Stoppa skåpbilen!', long: true }), this);
  }

  // Ronny's van at the kerb outside the gate: it drives off at once
  spawnVan(hold) {
    const g = this.game, V = BIRGER.van;
    for (const v of [...g.vehicles]) if (v !== g.player.car && Math.hypot(v.x - V.x, v.z - V.z) < 6) g.removeVehicle(v); // (clear the kerb)
    g.makeRoom('van');
    const van = g.addVehicle('van', 'ronny', V.x, V.z, V.h);
    this.stage = 'chase';
    if (!van) { this.mgr.fail(this, 'Skåpbilen försvann'); return; }
    van.armor = 2.0;          // (an old wreck: it does not take much)
    this.van = van;
    this.chaser = new Chaser(g, van, { vMax: 14.5, burst: 0, hold, polite: true });
    g.racers.push(this.chaser);
    // first west along Storgatan, the way it is facing (a U-turn here would take it across the lawns)
    this.chaser.goal = { x: -120, z: -40, vx: 0, vz: 0, ref: null };
    this.goalT = 0;
  }

  // somewhere to run to: a town crossing well away from you, not straight past you
  newGoal() {
    const g = this.game, p = g.player, car = this.van, N = g.layout.gps.nodes;
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

  chase(dt) {
    const g = this.game, m = this.mgr, p = g.player, van = this.van;
    if (!van || van.removed) { m.fail(this, 'Skåpbilen försvann'); return; }
    const T = p.inCar ? p.car : p;
    const d = Math.hypot(van.x - T.x, van.z - T.z);
    const G = this.chaser.goal;
    this.goalT += dt;
    if (!G || Math.hypot(G.x - van.x, G.z - van.z) < 14 || this.goalT > 9) this.newGoal();
    if (van.health <= BIRGER.stopAt || van.dead) { this.stop(); return; }
    this.farT = d > BIRGER.flee ? this.farT + dt : 0;
    if (this.farT > BIRGER.fleeT) { this.lost(); return; }
    const hp = Math.max(0, Math.round(((van.health - BIRGER.stopAt) / (100 - BIRGER.stopAt)) * 100));
    m.setObjective('Stoppa skåpbilen', `Motorn ${hp} % · ${d > 70 ? 'den är långt bort!' : `${Math.round(d)} m bort`}`);
  }

  stop() {
    const g = this.game, van = this.van;
    this.stage = 'stopped';
    this.chaser.retire(false);
    van.input.throttle = 0; van.input.park = true;
    g.emit('toast', { text: 'Motorn dog! Ronny kliver ur skåpbilen.', long: true });
    const s = van.local(-1.7, 0.6);
    const R = spawnPed(g, RONNY_LOOK, s.x, s.z, van.h - Math.PI / 2, 'ronny');
    R.state = 'angry'; R.stateT = -1.2; // (stamps his feet first)
    this.ronny = R;
    g.emit('say', { who: R, text: 'Min motor! Den var ju nästan ny… 1987.' });
  }

  lost() {
    const g = this.game, m = this.mgr, van = this.van;
    if (this.chaser) this.chaser.retire(false);
    m.fail(this, 'Skåpbilen kom undan', [WHO.pia, 'Ronny kom undan med skåpbilen! Han kommer tillbaka efter resten av cyklarna – möt mig vid Birgers grind.']);
    m.later(4, () => { if (van && !van.removed && van.driver !== 'player') g.removeVehicle(van); });
  }

  onCrash(e) {
    if (this.stage === 'chase' && e.car === this.van && e.player && e.impact > 4 && (this.sayT || 0) < this.game.time) {
      this.sayT = this.game.time + 3;
      this.game.emit('say', { who: this.van, text: ['Akta lacken!', 'Det är bara cyklar!', 'Jonte, du är skyldig mig!', 'Rosten håller ihop den!'][Math.floor(this.game.rng() * 4)] });
    }
  }

  // Ronny gives up – Polis-Pia is right behind you
  final() {
    const g = this.game, m = this.mgr, p = g.player, R = this.ronny;
    this.stage = 'final';
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(R.x - p.x, R.z - p.z);
    R.state = 'stand'; R.standH = R.h = Math.atan2(p.x - R.x, p.z - R.z); R.body.h = R.h;
    const line = Math.atan2(R.x - p.x, R.z - p.z);
    g.camFocus = { x: (p.x + R.x) / 2, y: 0.4, z: (p.z + R.z) / 2, yaw: line - 0.6, owner: 'hideout', near: true };
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: caughtPages() }), this);
  }

  targets(T) {
    const g = this.game, pia = this.mgr.gatePia;
    if (this.stage === 'talk' && pia) T.push({ kind: 'contact', x: pia.x, z: pia.z, r: 1, letter: PIA.letter, color: PIA.color, badgeOnly: true, badgeY: 2.75, ref: pia });
    else if (this.stage === 'door') T.push({ kind: 'zone', x: BIRGER.door.x, z: BIRGER.door.z, r: BIRGER.door.r, gps: true });
    else if ((this.stage === 'search' || this.stage === 'read') && g.indoors.inside) { for (const s of this.spots()) T.push({ kind: 'item', x: s.item[0], y: s.item[1], z: s.item[2], gps: false }); }
    else if (this.stage === 'chase' && this.van) T.push({ kind: 'racer', car: this.van, color: 0xff3b2f, gps: true });
    else if ((this.stage === 'stopped' || this.stage === 'final') && this.ronny) T.push({ kind: 'contact', x: this.ronny.x, z: this.ronny.z, r: 1, letter: RONNY.letter, color: RONNY.color, badgeOnly: true, badgeY: 2.75, ref: this.ronny, gps: this.stage === 'stopped' });
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'hideout') g.camFocus = null;
    if (this.chaser && this.chaser.mode !== 'done') this.chaser.retire(false);
    // Ronny and his van stay until nobody is looking (Pia takes them away)
    const R = this.ronny, van = this.van;
    const tidy = () => {
      const gone = (x, z) => hiddenFrom(g, x, z);
      if (R && g.peds.list.includes(R) && !gone(R.x, R.z)) { m.later(2, tidy); return; }
      removePed(g, R);
      if (this.stage === 'done' && van && !van.removed && van.driver !== 'player') { if (!gone(van.x, van.z)) { m.later(2, tidy); return; } g.removeVehicle(van); }
    };
    if (R || this.stage === 'done') m.later(6, tidy);
  }
}

export { HOUSE };
