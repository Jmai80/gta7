// Side quest "Konsertbiljetten" (v1.4), indoors. Nova, Kim's little sister (13), is going to see
// K-pop Demonjägarna tonight – but her ticket is lost somewhere in her room, and her mum says she
// is not going anywhere until the room is tidy. Mum is home in 90 seconds. Pick up the six things on
// the floor, one at a time, and put each one where it belongs (the objective box says where). The
// ticket turns up in the hoodie's pocket. Everything in place before mum walks in: Nova goes.
import { WHO, NOVA_PAY } from './config.js';
import { ROOM, THINGS } from './nova.js';
import { Ped, STYLE_BITS as ST } from './peds.js';
import { seat } from './barber.js';
import { fmt } from './rng.js';

const NOVA = { who: 'Nova', letter: 'N', color: '#b36cff' };
const MOM = { who: 'Novas mamma', letter: 'M', color: '#4aa8ff' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
// black hair in two buns (well, one), an oversized pink T-shirt, wide black trousers
export const NOVA_LOOK = { shirt: 0xff8fd8, pants: 0x1d1f22, skin: 0xe8b996, hair: 0x1a1414, height: 0.88, bulk: 0.9, style: ST.long | ST.bun, accent: 0xff5fd2 };
const MOM_LOOK = { shirt: 0x2c62a8, pants: 0x2b2e35, skin: 0xe8b996, hair: 0x4a3222, height: 1.0, bulk: 1.05, style: ST.bun | ST.glasses | ST.jacket, accent: 0x1d2a44 };
const NEAR = 0.8;

export function novaPages() {
  return [
    { ...NOVA, text: 'ÄNTLIGEN. Du är Kims kompis, va? Han sa att du fixar allt.' },
    { ...NOVA, text: 'Okej så. K-pop Demonjägarna spelar i Norrköping i kväll. Jag har väntat typ ett helt år. Och biljetten är BORTA.' },
    { ...YOU, text: 'Den är säkert någonstans här inne. Det är… mycket saker på golvet.' },
    { ...NOVA, text: 'Ja och mamma säger att jag inte får gå om rummet ser ut så här. Hon är hemma om 90 sekunder. Så cringe.' },
    { ...NOVA, text: 'Plocka upp grejerna och lägg dem där de ska vara. Jag måste öva på dansen. Biljetten dyker säkert upp. No cap.', last: 'KÖR!' },
  ];
}
export function againPages() {
  return [
    { ...NOVA, text: 'Mamma gick och handlade igen. Vi har 90 sekunder till. Snälla.', last: 'KÖR!' },
  ];
}
export function momPages(ticket, amount) {
  return [
    { ...MOM, text: 'Hallå? Är det här… Novas rum? Det ser ju ut som ett hotell!' },
    { ...NOVA, text: ticket ? 'Mamma. Rummet är städat OCH jag har biljetten. Får jag gå? Snälla?' : 'Mamma. Rummet är städat. Får jag gå?' },
    { ...MOM, text: 'Okej då. Men du tackar din kompis, och du är hemma klockan elva.' },
    { ...NOVA, text: `Tack!! Du har så mycket aura just nu. Här – ${fmt(amount)} kr ur min konsertbudget. Och mitt extra photocard.`, last: 'TACK!' },
  ];
}
export function failPages() {
  return [
    { ...MOM, text: 'Nova! Det ser ut som om en bomb har slagit ner här inne. Ingen konsert förrän det är städat.' },
    { ...NOVA, text: 'Neeej. Det är över. Mitt liv är över.', last: 'OJ' },
  ];
}

export class ConcertJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'konsert';
    this.stage = 'enter';   // enter → talk → tidy → mom → verdict → done (or late → failed)
    this.prompt = null;
    this.nova = null; this.mom = null;
    this.things = THINGS.map((t) => ({ def: t, state: 'floor' }));   // floor | held | placed (render.js draws them)
    this.held = null;
    this.ticket = false;
    this.left = NOVA_PAY.time;
    this.titleCard = false;
  }

  start() {
    const g = this.game, m = this.mgr;
    m.setObjective('Konsertbiljetten', 'Lägenheterna bakom Macken');
    m.roomThings = this.things; // (render.js draws them while you are in Nova's room)
    g.indoors.enter(() => {
      this.stage = 'talk';
      this.nova = seat(new Ped(g, { ...NOVA_LOOK }), ROOM.nova, 'nova');
      g.peds.add(this.nova);
      g.emit('toast', { text: 'Novas rum · Skolgatan', long: false });
      g.player.frozen = true;
      const again = !!m.flags.concertTalked;
      m.flags.concertTalked = true;
      m.later(0.9, () => g.emit('talk', { id: this.id, pages: again ? againPages() : novaPages() }), this);
    }, 'nova');
  }

  thingFor(id) { return this.things.find((t) => t.def.id === id); }
  get placed() { return this.things.filter((t) => t.state === 'placed').length; }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null;
    if (this.stage === 'enter' || this.stage === 'talk' || this.stage === 'verdict' || this.stage === 'done' || this.stage === 'failed') return;
    if (!ind.inside && !ind.busy) { // walked out
      this.removePeople();
      m.quit(this, [WHO.nova, 'vart tog du vägen?? mamma är snart hemma, kom tillbaka snälla']);
      return;
    }
    if (this.stage === 'mom') { // mum walks in and stops by the door
      const M = this.mom;
      if (M && M.arrived && !this.momSaid) { this.momSaid = true; this.verdict(); }
      return;
    }
    // tidying, against the clock
    this.left -= dt;
    if (this.left <= 0) { this.left = 0; this.momIn(false); return; }
    if (p.state === 'foot' && !p.frozen) {
      if (this.held) {
        const t = this.held.def;
        if (Math.hypot(p.x - t.sx, p.z - t.sz) < NEAR) this.prompt = 'LÄGG';
      } else {
        let best = null, bd = NEAR;
        for (const t of this.things) {
          if (t.state !== 'floor') continue;
          const d = Math.hypot(p.x - t.def.fx, p.z - t.def.fz);
          if (d < bd) { bd = d; best = t; }
        }
        this.near = best;
        if (best) this.prompt = 'TA';
      }
    }
    const hold = this.held ? `Bär ${this.held.def.name} – den ska ${this.held.def.where}` : this.ticket ? 'Biljetten är hittad!' : 'Biljetten är någonstans här';
    m.setObjective(`Städa: ${this.placed} av 6 · mamma hemma om ${Math.ceil(this.left)} s`, hold);
  }

  // the action button: pick a thing up, or put it where it belongs
  interact() {
    const g = this.game, p = g.player;
    if (this.prompt === 'TA' && this.near) {
      const t = this.near;
      t.state = 'held'; this.held = t; this.near = null;
      g.emit('salon', { kind: 'pick' });
      if (t.def.id === 'luva' && !this.ticket) {
        this.ticket = true;
        g.emit('keys', { item: 'ticket' });
        g.emit('toast', { text: 'Något prasslar i luvtröjans ficka – BILJETTEN!', long: true });
        g.emit('say', { who: this.nova, text: 'MIN BILJETT!! Du är literally bäst.' });
      } else g.emit('toast', { text: `Du tar ${t.def.name}. Den ska ${t.def.where}.`, long: false });
      return true;
    }
    if (this.prompt === 'LÄGG' && this.held) {
      const t = this.held;
      t.state = 'placed'; this.held = null;
      p.h = Math.atan2(t.def.px - p.x, t.def.pz - p.z);
      g.emit('salon', { kind: 'pick' });
      const n = this.placed;
      if (n >= 6) { this.momIn(true); return true; }
      g.emit('say', { who: this.nova, text: ['Snyggt.', 'Slay.', 'Mamma kommer att svimma.', 'Det här rummet har aldrig varit så rent.', 'En kvar!'][n - 1] });
      return true;
    }
    return false;
  }

  // the front door: mum comes in – the room is tidy (done) or not (late)
  momIn(tidy) {
    const g = this.game, p = g.player;
    this.stage = 'mom';
    this.tidy = tidy;
    this.prompt = null;
    if (this.held) { this.held.state = 'floor'; this.held = null; }
    p.frozen = true; p.vx = p.vz = 0;
    g.emit('toast', { text: tidy ? 'Alla sex på plats! Ytterdörren går – mamma är hemma.' : 'Ytterdörren går. Mamma är hemma!', long: true });
    const M = new Ped(g, { ...MOM_LOOK });
    M.x = ROOM.spawn.x; M.z = ROOM.spawn.z + 0.4; M.y = g.world.groundHeight(M.x, M.z); M.h = Math.PI;
    M.keep = true; M.npc = 'nova-mom';
    g.peds.add(M);
    M.arrived = false;
    M.goto([[ROOM.mom.x, ROOM.mom.z - 0.35]], 1.2, Math.PI);
    this.mom = M;
    p.h = Math.atan2(M.x - p.x, M.z - p.z);
  }

  verdict() {
    const g = this.game, m = this.mgr;
    this.stage = 'verdict';
    if (this.tidy) {
      this.amount = NOVA_PAY.base + Math.round(this.left) * NOVA_PAY.perSec;
      m.later(0.3, () => g.emit('talk', { id: this.id, pages: momPages(this.ticket, this.amount) }), this);
    } else m.later(0.3, () => g.emit('talk', { id: this.id, pages: failPages() }), this);
  }

  talkFx() {}

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'talk') {
      this.stage = 'tidy';
      p.frozen = false;
      g.emit('toast', { text: 'Sex saker på golvet. Plocka upp en i taget och lägg den på sin plats!', long: true });
      m.later(1.2, () => g.emit('hint', { id: 'tidy', touch: 'Gå fram till en sak med pil och tryck TA. Sedan dit den ska, och LÄGG.', keys: 'Gå fram till en sak med pil och tryck E. Sedan dit den ska, och E igen.' }), this);
      return;
    }
    if (this.stage !== 'verdict') return;
    if (!this.tidy) {
      this.stage = 'failed';
      m.fail(this, 'Mamma kom hem för tidigt', [WHO.nova, 'mamma gick och handlade igen!! vi har en chans till. kom tillbaka snälla']);
      return;
    }
    this.stage = 'done';
    g.stats.concert = Math.round(this.left);
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Konsertbiljetten', amount: this.amount });
    m.sms(WHO.nova, 'KONSERTEN VAR SÅ BRA. jag grät typ tre gånger. tack igen, du är min favoritvuxen', 30);
  }

  targets(T) {
    const g = this.game;
    if (!g.indoors.inside || g.indoors.where !== 'nova') return;
    if (this.nova && (this.stage === 'talk' || this.stage === 'tidy')) T.push({ kind: 'contact', x: this.nova.x, z: this.nova.z, r: 1, letter: NOVA.letter, color: NOVA.color, badgeOnly: true, badgeY: 1.95, ref: this.nova });
    if (this.stage !== 'tidy') return;
    if (this.held) T.push({ kind: 'item', x: this.held.def.px, y: Math.max(this.held.def.py, ROOM.y) + 0.55, z: this.held.def.pz, gps: false });
    else for (const t of this.things) if (t.state === 'floor') T.push({ kind: 'item', x: t.def.fx, y: ROOM.y + 0.45, z: t.def.fz, gps: false });
  }

  removePeople() {
    const L = this.game.peds.list;
    for (const q of [this.nova, this.mom]) { const i = L.indexOf(q); if (q && i >= 0) L.splice(i, 1); }
    this.nova = null; this.mom = null;
  }

  cleanup() {
    const g = this.game, p = g.player;
    this.prompt = null;
    p.frozen = false;
    if (!g.indoors.inside) { this.removePeople(); return; }
    // still inside: Nova and her mum stay until you go out
    const gone = [this.nova, this.mom];
    const check = () => { if (g.indoors.inside && g.indoors.where === 'nova') { this.mgr.later(1, check); return; } const L = g.peds.list; for (const q of gone) { const i = L.indexOf(q); if (q && i >= 0) L.splice(i, 1); } };
    this.mgr.later(1, check);
  }
}
