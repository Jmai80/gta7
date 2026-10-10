// Side quest "Salong Saxen" (v1.0). Fia has the hair salon on Skolgatan, on the ground floor of the
// square's brick building. She has broken her wrist – somebody had stolen the saddle off her bike – and
// three customers are waiting on the sofa. She can't hold the scissors, so you do the work: take a tool
// from the counter by the west wall (scissors, razor, three colours of dye), go to the chair and use it.
// Do exactly what each customer asks. A cut or a shave can't be undone; a wrong colour you can dye over.
// Each customer only waits so long. Two happy customers out of three and Fia's day is saved.
import { WHO, SALON_PAY } from './config.js';
import { SALON, TOOLS, DYES } from './salon.js';
import { Ped, STYLE_BITS as ST } from './peds.js';
import { fmt } from './rng.js';

const FIA = { who: 'Fia', letter: 'F', color: '#e8833a' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
// red hair in a bun, glasses, the salon's orange apron over black
export const FIA_LOOK = { shirt: 0x2b2e35, pants: 0x2b2e35, skin: 0xe8b996, hair: 0xc8442c, height: 0.98, bulk: 1.0, style: ST.bun | ST.glasses | ST.apron, accent: 0xe8833a };

// the three customers, in the order they sit down. want: what they ask for; keep: what you must not touch
export const CUSTOMERS = [
  {
    id: 'kim', who: 'Kim', letter: 'K', color: '#4aa8ff',
    look: { shirt: 0x2c62a8, pants: 0x1d1f22, skin: 0xe8b996, hair: 0x5a3a22, height: 1.0, bulk: 0.98, style: ST.long | ST.jacket, accent: 0x1d1f22 },
    want: { cut: true, dye: 'bla' }, keep: {},
    ask: 'Kort och blått, tack! Samma blå som min bil.',
    wish: 'kort hår och blått hår',
    happy: 'Kort OCH blått! Nu syns jag i gatloppet.',
  },
  {
    id: 'bengt', who: 'Bagar-Bengt', letter: 'B', color: '#d9534f',
    look: { shirt: 0xf2efe6, pants: 0xe2ddd0, skin: 0xe9c3a6, hair: 0x3a2a1a, height: 1.04, bulk: 1.28, style: ST.long | ST.beard, accent: 0xf8f6f0 },
    want: { shave: true }, keep: { cut: true, dye: true },
    ask: 'Skägget ska bort – mamma kommer på besök. Men håret rör du inte!',
    wish: 'raka bort skägget, rör inte håret',
    happy: 'Slät som en nybakad bulle! Mamma kommer att känna igen mig.',
  },
  {
    id: 'lasse', who: 'Lasse', letter: 'L', color: '#ffcf33',
    look: { shirt: 0x3a4d6a, pants: 0x3a4d6a, skin: 0xe9c3a6, hair: 0x6b4a32, height: 1.02, bulk: 1.2, style: ST.beard | ST.jacket, accent: 0x2b2e35 },
    want: { dye: 'blond' }, keep: { shave: true },
    ask: 'Gör mig blond, som en filmstjärna. Och skägget stannar!',
    wish: 'blont hår, skägget stannar',
    happy: 'Blond! Jag ser ut som en rallyförare. Notan tar jag på verkstan.',
  },
];
const ANGRY = { cut: 'MITT HÅR!! Jag sa ju att du inte fick röra det!', shave: 'Mitt skägg! Det har tagit tre år att odla!', dye: 'Färg?! Vem bad om färg?!' };
const IMPATIENT = 'Jag har inte hela dagen. Hej då!';

export function fiaPages() {
  return [
    { ...FIA, text: 'Hej och välkommen till Salong Saxen! Ursäkta att jag inte reser mig – jag bröt handleden i förrgår.' },
    { ...FIA, text: 'Någon hade snott sadeln från min cykel, och jag märkte det först när jag satte mig. Det sägs att det är en kille som heter Sander som snor cyklar i stan.' },
    { ...YOU, text: 'Aj. Och kunderna?' },
    { ...FIA, text: 'Tre stycken, alla bokade i dag. Jag kan inte hålla i saxen – men du kan. Jag säger hur man gör.' },
    { ...FIA, text: 'Saxen, rakhyveln och färgerna står på disken vid väggen. Ta det du behöver och gå fram till stolen.' },
    { ...FIA, text: 'Och gör EXAKT som kunden säger. Det som är klippt är klippt – men en fel färg kan man färga över.', last: 'NU KÖR VI' },
  ];
}

// (another go, after a bad day: the short version)
export function fiaAgainPages() {
  return [
    { ...FIA, text: 'Nya kunder, ny chans! Saxen, rakhyveln och färgerna står på disken som vanligt.' },
    { ...FIA, text: 'Lyssna på vad de vill ha – och rör inget de inte bett om.', last: 'NU KÖR VI' },
  ];
}

export function verdictPages(happy, amount) {
  const end = happy >= SALON_PAY.need
    ? { ...FIA, text: `Här är din lön, ${fmt(amount)} kr med dricksen. Titta in och säg hej ibland – kaffet är alltid gratis.`, last: 'TACK!' }
    : { ...FIA, text: 'Vi tar det från början när du är redo. Jag ringer in nya kunder – de här kommer nog inte tillbaka.', last: 'OKEJ' };
  const lines = {
    3: 'Tre nöjda kunder! Du har guldhänder. Kim har redan lagt upp en bild – halva Sjuby vill boka tid.',
    2: 'Två av tre – det räcker gott för en första dag. Den tredje får jag ringa och be om ursäkt till.',
    1: 'En nöjd kund av tre… Bengt lär tala om det här på bageriet i flera veckor.',
    0: 'Ingen nöjd kund alls. Jag tror att jag stänger resten av dagen.',
  };
  return [{ ...FIA, text: lines[happy] }, end];
}

export class SalonJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'salong';
    this.stage = 'enter';   // enter → shop (talk to Fia) → talk → work → verdict → done
    this.prompt = null;
    this.fia = null;
    this.queue = [];        // the customers, each { def, ped, state: queue | walk | chair | leave | gone, ... }
    this.ci = 0;            // whose turn it is
    this.tool = null;       // what you are holding: a key of TOOLS
    this.workT = 0; this.pending = null;
    this.titleCard = false; // straight into the salon
  }

  get current() { return this.queue[this.ci] || null; }

  start() {
    const g = this.game, m = this.mgr;
    m.setObjective('Salong Saxen', 'Skolgatan');
    g.indoors.enter(() => {
      this.stage = 'shop';
      this.spawnPeople();
      g.emit('toast', { text: 'Salong Saxen · Skolgatan', long: false });
      m.later(0.9, () => { if (this.stage === 'shop') this.say('Kom in, kom in! Hit till mig.', this.fia); }, this);
      m.later(1.4, () => g.emit('hint', { id: 'fia', touch: 'Gå fram till Fia och tryck PRATA.', keys: 'Gå fram till Fia och tryck E för att prata.' }), this);
    }, 'salon');
  }

  // Fia on her stool, the three customers on the sofa
  spawnPeople() {
    const g = this.game;
    this.fia = seat(new Ped(g, { ...FIA_LOOK }), SALON.fia, 'fia');
    g.peds.add(this.fia);
    this.queue = CUSTOMERS.map((def, i) => {
      const ped = seat(new Ped(g, { ...def.look }), SALON.seats[i], 'kund-' + def.id);
      g.peds.add(ped);
      return { def, ped, state: 'queue', patience: SALON_PAY.patience, happy: null, did: {} };
    });
  }

  removePeople() {
    const L = this.game.peds.list;
    for (const q of [this.fia, ...this.queue.map((c) => c.ped)]) { const i = L.indexOf(q); if (q && i >= 0) L.splice(i, 1); }
    this.fia = null; this.queue = [];
  }

  say(text, who) { if (who) this.game.emit('say', { who, text }); }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null;
    if (this.stage === 'enter' || this.stage === 'talk' || this.stage === 'verdict' || this.stage === 'done') return;
    if (!ind.inside && !ind.busy) { // walked out
      this.removePeople();
      if (this.stage === 'shop') { m.quit(this, [WHO.fia, 'Titta in när du har tid! Kunderna väntar.']); return; }
      m.quit(this, [WHO.fia, 'Hallå, var tog du vägen? Kunderna gick hem. Kom tillbaka så tar vi det från början.']);
      return;
    }
    if (this.stage === 'shop') {
      const near = p.state === 'foot' && !p.frozen && Math.hypot(p.x - SALON.talk.x, p.z - SALON.talk.z) < SALON.talk.r;
      if (near) this.prompt = 'PRATA';
      m.setObjective('Prata med Fia', 'Hon sitter vid stolarna');
      return;
    }
    // work: the customers, one at a time
    this.customers(dt);
    if (this.stage !== 'work') return;
    if (this.workT > 0) {
      this.workT -= dt;
      if (this.workT <= 0) { p.frozen = false; this.useTool(); }
      this.objective();
      return;
    }
    if (p.state === 'foot' && !p.frozen) {
      const c = this.current;
      let best = null, bd = 0.62;
      for (const t of Object.values(TOOLS)) {
        const d = Math.hypot(p.x - t.x, p.z - t.z);
        if (d < bd) { bd = d; best = t; }
      }
      if (best) this.prompt = this.tool === best.id ? null : best.label;
      else if (this.tool && c && c.state === 'chair' && Math.hypot(p.x - SALON.work.x, p.z - SALON.work.z) < SALON.work.r) this.prompt = TOOLS[this.tool].verb;
      else if (Math.hypot(p.x - SALON.talk.x, p.z - SALON.talk.z) < 1.5) this.prompt = 'PRATA';
    }
    this.objective();
  }

  objective() {
    const m = this.mgr, c = this.current;
    if (!c) return;
    const hold = this.tool ? ` · i handen: ${TOOLS[this.tool].name}` : '';
    if (c.state !== 'chair') { m.setObjective(`Kund ${this.ci + 1} av 3: ${c.def.who}`, `På väg till stolen${hold}`); return; }
    m.setObjective(`Kund ${this.ci + 1} av 3: ${c.def.who}`, `Vill ha: ${c.def.wish} · ${Math.ceil(c.patience)} s${hold}`);
  }

  // the queue moves: up from the sofa, into the chair, served, out of the door
  customers(dt) {
    const g = this.game;
    for (let i = 0; i < this.queue.length; i++) {
      const c = this.queue[i], ped = c.ped;
      if (c.state === 'walk' && ped.arrived) this.sitDown(c);
      else if (c.state === 'chair') {
        if (ped.state !== 'lounge') { this.sitDown(c); continue; } // (someone knocked them off: back in the chair)
        if (this.stage === 'work' && this.workT <= 0) {
          c.patience -= dt;
          if (c.patience <= 0) this.leave(c, false, IMPATIENT);
        }
      } else if (c.state === 'leave' && ped.arrived) {
        c.state = 'gone';
        const L = g.peds.list, k = L.indexOf(ped);
        if (k >= 0) L.splice(k, 1);
      }
    }
    if (this.stage === 'work' && this.current && this.current.state === 'queue' && !this.nextT) this.nextT = 0.9;
    if (this.nextT) { this.nextT -= dt; if (this.nextT <= 0) { this.nextT = 0; this.callNext(); } }
  }

  // the next customer gets up from the sofa and walks to the chair
  callNext() {
    const c = this.current;
    if (!c || c.state !== 'queue') return;
    const ped = c.ped, S = SALON.stand;
    ped.y = this.game.world.groundHeight(ped.x, ped.z);
    ped.body.pose = 0;
    ped.goto([[ped.x - 0.8, ped.z], ...SALON.toChair, [S.x, S.z]], 1.3, Math.PI);
    c.state = 'walk';
  }

  sitDown(c) {
    const ped = c.ped, C = SALON.chair;
    seat(ped, C, ped.npc);
    c.state = 'chair';
    c.patience = SALON_PAY.patience;
    this.say(c.def.ask, ped);
    if (this.ci === 0) this.mgr.later(1.6, () => this.game.emit('hint', { id: 'salon', touch: 'Ta ett verktyg vid disken och gå till stolen. Gör som kunden säger!', keys: 'Ta ett verktyg vid disken (E) och gå till stolen. Gör som kunden säger!' }), this);
  }

  // the action button: talk to Fia, pick up a tool, or use it on the customer
  interact() {
    const g = this.game, p = g.player, pr = this.prompt;
    if (!pr) return false;
    if (pr === 'PRATA' && this.stage === 'shop') {
      this.stage = 'talk';
      this.prompt = null;
      p.frozen = true; p.vx = p.vz = 0;
      p.h = Math.atan2(this.fia.x - p.x, this.fia.z - p.z);
      const again = !!this.mgr.flags.salonTalked;
      this.mgr.flags.salonTalked = true;
      g.emit('talk', { id: this.id, pages: again ? fiaAgainPages() : fiaPages() });
      return true;
    }
    if (this.stage !== 'work') return false;
    if (pr === 'PRATA') { // a reminder of what the customer wants
      const c = this.current;
      this.say(c && c.state === 'chair' ? `${c.def.who} vill ha ${c.def.wish}.` : 'Vänta, nästa kund kommer.', this.fia);
      return true;
    }
    const tool = Object.values(TOOLS).find((t) => t.label === pr);
    if (tool) {
      this.tool = tool.id;
      g.emit('salon', { kind: 'pick' });
      g.emit('toast', { text: `Du tar ${tool.name}.`, long: false });
      return true;
    }
    if (this.tool && pr === TOOLS[this.tool].verb) {
      // a moment of work in front of the chair, then the result
      const C = SALON.chair;
      this.workT = 0.9;
      p.frozen = true; p.vx = p.vz = 0;
      p.h = Math.atan2(C.x - p.x, C.z - p.z);
      const kind = TOOLS[this.tool].dye ? 'dye' : this.tool === 'sax' ? 'cut' : 'shave';
      g.emit('salon', { kind });
      this.say(kind === 'cut' ? 'Klipp, klipp…' : kind === 'shave' ? 'Bzzzz…' : 'Lite färg…', p);
      return true;
    }
    return false;
  }

  // what the tool does to the customer's hair – and what they think of it
  useTool() {
    const g = this.game, c = this.current, t = TOOLS[this.tool];
    if (!c || c.state !== 'chair') return;
    const L = c.ped.body.look, ped = c.ped;
    let what = null;
    if (t.id === 'sax') {
      if (!(L.style & (ST.long | ST.bun))) { g.emit('toast', { text: `${c.def.who} har redan kort hår – det finns inget att klippa.`, long: false }); return; }
      L.style &= ~(ST.long | ST.bun);
      what = 'cut';
    } else if (t.id === 'rak') {
      if (!(L.style & ST.beard)) { g.emit('toast', { text: `${c.def.who} har inget skägg att raka.`, long: false }); return; }
      L.style &= ~ST.beard;
      what = 'shave';
    } else {
      L.hair = DYES[t.dye].hex;
      c.dye = t.dye;
      what = 'dye';
    }
    c.did[what] = true;
    g.stats.salonWork = (g.stats.salonWork || 0) + 1;
    // something they did not want touched: that's it
    if (c.def.keep[what]) { this.leave(c, false, ANGRY[what]); return; }
    const W = c.def.want;
    if (what === 'dye' && W.dye && c.dye !== W.dye) { this.say(`${DYES[c.dye].name[0].toUpperCase() + DYES[c.dye].name.slice(1)}?! Jag sa ${DYES[W.dye].name}! Färga om, snälla.`, ped); return; }
    if (what === 'dye' && !W.dye) { this.leave(c, false, ANGRY.dye); return; }
    const done = (!W.cut || !(L.style & (ST.long | ST.bun))) && (!W.shave || !(L.style & ST.beard)) && (!W.dye || c.dye === W.dye);
    if (done) this.leave(c, true, c.def.happy);
    else this.say(['Bra början!', 'Fint! Och resten?', 'Mm, fortsätt!'][Object.keys(c.did).length % 3], ped);
  }

  // up from the chair and out of the door – happy or not
  leave(c, happy, line) {
    const g = this.game, ped = c.ped;
    c.happy = happy;
    c.left = Math.max(0, c.patience);
    c.state = 'leave';
    this.say(line, ped);
    g.emit('salon', { kind: happy ? 'happy' : 'angry' });
    if (happy) g.emit('toast', { text: `Nöjd kund! ${c.def.who} lämnar dricks.`, long: false });
    else g.emit('toast', { text: `${c.def.who} går därifrån missnöjd.`, long: false });
    const S = SALON.stand;
    ped.y = g.world.groundHeight(S.x, S.z);
    ped.x = S.x; ped.z = S.z; ped.body.pose = 0;
    ped.arrived = false; // (still set from the walk to the chair: they would vanish on the spot)
    ped.state = happy ? 'stand' : 'angry'; ped.stateT = happy ? 0 : -0.6;
    ped.standH = ped.h;
    this.mgr.later(happy ? 0.4 : 1.2, () => { if (c.state === 'leave') ped.goto(SALON.out, happy ? 1.4 : 1.8); }, this);
    this.ci++;
    if (this.ci >= this.queue.length) this.mgr.later(happy ? 2.6 : 3.0, () => this.verdict(), this);
  }

  // all three served: what Fia thinks
  verdict() {
    const g = this.game, m = this.mgr, p = g.player, F = this.fia;
    if (this.stage !== 'work') return;
    this.stage = 'verdict';
    this.prompt = null;
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(F.x - p.x, F.z - p.z);
    const happy = this.queue.filter((c) => c.happy).length;
    this.amount = happy >= SALON_PAY.need ? this.pay() : 0;
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: verdictPages(happy, this.amount) }), this);
  }

  pay() {
    let tips = 0;
    for (const c of this.queue) if (c.happy) tips += Math.round((SALON_PAY.tip * c.left) / SALON_PAY.patience / 10) * 10;
    this.tips = tips;
    return SALON_PAY.base + this.queue.filter((c) => c.happy).length * SALON_PAY.happy + tips;
  }

  talkFx() {}

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'talk') {
      this.stage = 'work';
      p.frozen = false;
      this.nextT = 0.3;
      g.emit('toast', { text: 'Tre kunder väntar. Läs vad de vill ha – och gör exakt det!', long: true });
      return;
    }
    if (this.stage !== 'verdict') return;
    const happy = this.queue.filter((c) => c.happy).length;
    if (happy < SALON_PAY.need) {
      this.stage = 'failed';
      m.fail(this, 'Kunderna gick missnöjda', [WHO.fia, 'Ingen fara, alla har en dålig dag ibland. Kom tillbaka så tar vi tre nya kunder!']);
      return;
    }
    this.stage = 'done';
    g.stats.salonHappy = happy;
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Salong Saxen', amount: this.amount });
    if (this.tips) m.later(3.9, () => g.emit('toast', { text: `Varav ${fmt(this.tips)} kr i dricks för att du var snabb.`, long: true }));
    m.sms(WHO.fia, happy === 3
      ? 'Telefonen har inte slutat ringa sedan du gick! Om du ser till Sander – han med cykelsadeln – säg att jag vill ha tillbaka den.'
      : 'Tack för hjälpen i dag! Och håll utkik efter den där Sander – jag vill ha tillbaka min cykelsadel.', 8);
  }

  targets(T) {
    const g = this.game;
    if (!g.indoors.inside) return;
    if ((this.stage === 'shop' || this.stage === 'talk') && this.fia) T.push({ kind: 'contact', x: this.fia.x, z: this.fia.z, r: 1, letter: 'F', color: FIA.color, badgeOnly: true, badgeY: 2.2, ref: this.fia });
    const c = this.current;
    if (this.stage === 'work' && c && c.state === 'chair') {
      // the badge of whoever is in the chair; an arrow over the chair once you hold a tool
      T.push({ kind: 'contact', x: c.ped.x, z: c.ped.z, r: 1, letter: c.def.letter, color: c.def.color, badgeOnly: true, badgeY: 2.0, ref: c.ped });
      if (this.tool) T.push({ kind: 'item', x: SALON.chair.x, y: SALON.y + 1.25, z: SALON.chair.z, gps: false });
    }
  }

  cleanup() {
    const g = this.game, p = g.player;
    this.prompt = null;
    p.frozen = false;
    if (!g.indoors.inside) this.removePeople();
    else {
      // still inside (a fail at the end): everyone stays until you go out
      const gone = [this.fia, ...this.queue.map((c) => c.ped)];
      const check = () => { if (g.indoors.inside && g.indoors.where === 'salon') { this.mgr.later(1, check); return; } const L = g.peds.list; for (const q of gone) { const i = L.indexOf(q); if (q && i >= 0) L.splice(i, 1); } };
      this.mgr.later(1, check);
    }
  }
}

// sat down (pose 5) on a seat { x, z, y (hips), h }, posed by us
function seat(ped, S, npc) {
  ped.x = S.x; ped.z = S.z; ped.h = ped.standH = S.h;
  ped.y = S.y - 0.92 * (ped.body.look.height || 1);
  ped.state = 'lounge'; ped.keep = true; ped.npc = npc;
  const b = ped.body;
  b.pose = 5; b.headYaw = 0; b.headPitch = 0.08; b.phone = 0; b.lie = 0;
  b.x = ped.x; b.y = ped.y; b.z = ped.z; b.h = ped.h;
  return ped;
}
