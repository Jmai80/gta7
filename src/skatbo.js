// Main quest, part 15: "Skatans bo" (v1.15). Ingvar has promised to show Elsa the lighthouse – but the lamp
// has not been lit since the spring: a magpie has built her nest on the lens up in the lantern (in through the
// pane to the gallery that Ingvar forgot to shut), and she dives at him as soon as he puts his head up.
//   1. The lighthouse from the inside (fyren.js), a floor at a time: Ingvar's kitchen at the bottom (Ingvar and
//      Elsa at the round table), the watch room with fifty years of logbooks, and the lantern.
//   2. The lantern: sneak up on the nest. The magpie preens (move!), looks up (careful) and keeps watch (stand
//      still!) – if she sees you move she dives, and you back down to the hatch. Take the nest while she preens.
//   3. In the nest: a silver thimble, a stopwatch, a little pair of scissors, an old iron key – and a green
//      earring. Down in the watch room, Ingvar's logbook says where every magpie in Sjuby took what, since 1974.
//   4. The kitchen: the earring is Elsa's, lost at the dance on the jetty in 1974. Ingvar saw the magpie take it.
//      He never said. ("Då hade jag fått prata med dig.")
//   5. Out over the whole map: Majken's thimble (the mill), Kim's stopwatch (Macken), Vera's scissors (Salong
//      Saxen) and Inga's key to the bell tower (the chapel on Söderholmen), in any order.
//   6. Back to the lighthouse, up to the lantern: Ingvar lets you light the lamp, and outside the three of you
//      watch the light sweep over Sjuby. (And the phone box on the quay rings one last time – secrets.js.)
// A checkpoint is kept in stats.skatbo ({ at: 1, left: [...] } handing out, { at: 2 } back to the lighthouse).
import { WHO, MACKEN, SALON_DOOR, CURB_H } from './config.js';
import { FYR, FYR_DOOR, FYR_OUT, fyrFloor, fyrAt } from './fyren.js';
import { MILL_DOOR } from './millroom.js';
import { CHAPEL_DOOR } from './chapel.js';
import { STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed } from './hideout.js';
import { INGVAR_LOOK } from './livs.js';
import { ELSA_LOOK } from './flaskpost.js';
import { MAJKEN_LOOK } from './opening.js';
import { FIA_LOOK, CUSTOMERS } from './barber.js';
import { hidden, stand } from './skattjakt.js';
import { fmt } from './rng.js';

const INGA_LOOK = { shirt: 0x1d1f22, pants: 0x1d1f22, skin: 0xf0c8a8, hair: 0xc9c5bd, height: 0.98, bulk: 1.06, style: ST.bun | ST.glasses | ST.jacket, accent: 0xf4f4f0 };
const KIM_LOOK = CUSTOMERS.find((c) => c.id === 'kim').look;
export const ELSA_GLASSES = { ...ELSA_LOOK, style: ELSA_LOOK.style | ST.glasses };

// the magpie in the lantern: how long she preens, looks up and keeps watch (round and round; no random numbers)
export const BIRD = {
  preen: [1.6, 2.1, 1.3, 1.9, 1.2], look: 0.85, watch: [2.2, 2.8, 1.8, 2.5],
  grace: 0.3,          // seconds into her watch before she reacts (you have just seen her look up)
  still: 0.55,         // moving slower than this (m/s) is standing still
  dive: 0.55, back: 0.8, flee: 1.3,
};

// where the four things go: the owner waits outside (put there out of sight), GE hands it over
const MD = { x: MILL_DOOR.x + Math.sin(MILL_DOOR.h) * 1.9, z: MILL_DOOR.z + Math.cos(MILL_DOOR.h) * 1.9 };
export const OWNERS = [
  { id: 'majken', item: 'fingerborgen', thing: 'Majkens fingerborg', who: 'Mjölnar-Majken', letter: 'M', color: '#b0874a', look: MAJKEN_LOOK, npc: 'majken', x: MD.x, z: MD.z, h: MILL_DOOR.h, where: 'Kvarnen på Norrholmen' },
  { id: 'kim', item: 'stoppuret', thing: 'Kims stoppur', who: 'Kim', letter: 'K', color: '#4aa8ff', look: KIM_LOOK, npc: 'kim', x: MACKEN.x + 1.5, z: MACKEN.z + 4.0, h: Math.PI, where: 'Macken' },
  { id: 'vera', item: 'saxen', thing: 'Veras sax', who: 'Vera', letter: 'V', color: '#e8833a', look: FIA_LOOK, npc: 'fia', x: SALON_DOOR.x + 1.6, z: SALON_DOOR.z + 0.4, h: 0, where: 'Salong Saxen, Skolgatan' },
  { id: 'inga', item: 'nyckeln', thing: 'Ingas nyckel', who: 'Kyrkoherde Inga', letter: 'I', color: '#6b4fa0', look: INGA_LOOK, npc: 'inga', x: CHAPEL_DOOR.x + 1.5, z: CHAPEL_DOOR.z - 1.5, h: Math.PI, where: 'Kapellet på Söderholmen' },
];
const OWNER = Object.fromEntries(OWNERS.map((o) => [o.id, o]));

export const SKAT = {
  mark: { x: FYR_DOOR.x, z: FYR_DOOR.z, r: FYR_DOOR.r },
  give: 1.7,                                       // hand a thing over within this of its owner
  // the last scene, outside on the lighthouse rocks: where you, Ingvar and Elsa stand, and the camera
  end: { you: fyrAt(5.0, 0.9), ingvar: fyrAt(4.45, 2.2), elsa: fyrAt(5.6, 2.15) },
  pay: { base: 5000, quiet: 400, perDive: 100 },
};
export const SKAT_MAX = SKAT.pay.base + SKAT.pay.quiet;
const STEPS = ['deliver', 'back'];

const INGVAR_T = { who: 'Fyrvaktaren Ingvar', letter: 'I', color: '#5b8fd6' };
const ELSA = { who: 'Elsa', letter: 'E', color: '#5f9a6a' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const LOG = { who: 'Ingvars loggbok', letter: 'L', color: '#2c4a6a', note: true };

export function introPages() {
  return [
    { ...ELSA, text: 'Där är du! Ingvar har kokat kaffe. Han säger att det är första gången på femtio år som han har gäster.' },
    { ...INGVAR_T, text: 'Andra gången. Yasmin kom med kassen en gång.' },
    { ...ELSA, text: 'Han har lovat att visa mig ljuset. Men lampan lyser inte – och han vill inte säga varför.' },
    { ...INGVAR_T, text: 'Skatan.' },
    { ...INGVAR_T, text: 'I våras glömde jag stänga luckan till räcket. Nu har hon byggt bo på linsen. Hon dyker på mig så fort jag sticker upp huvudet.' },
    { ...ELSA, text: 'Han är åttiotvå år, han kan inte slåss med en skata. Men det kan du.' },
    { ...INGVAR_T, text: 'Hon ser allt som rör sig. Gå när hon putsar fjädrarna. Stå still när hon tittar.' },
    { ...ELSA, text: 'Trappan är där i hörnet. Två våningar upp. Ta ner boet, så tänder vi!', last: 'UPP I FYREN' },
  ];
}
export function nestPages() {
  return [
    { ...YOU, text: 'Boet är stort som en tvättbalja. Kvistar, ståltråd, en bit fiskelina … och mitt i alltihop glittrar det.' },
    { ...YOU, text: 'En fingerborg i silver. Ett stoppur. En liten sax. En gammal järnnyckel. Och ett grönt örhänge.' },
    { ...YOU, text: 'Skatan sitter ute på räcket och skäller. Vems är allt det här?', last: 'NER MED BOET' },
  ];
}
export function logPages() {
  return [
    { ...YOU, text: 'Ingvars loggbok, uppslagen på skrivbordet. Femtio år av väder, båtar – och skator.' },
    { ...LOG, text: '12 juli 1974. Dans på bryggan.\nGrön klänning. Skata över\nvattnet med något grönt i\nnäbben. Sa inget. Feg.' },
    { ...LOG, text: '3 maj 1981. Skata vid kvarnen.\nNågot blankt från fönster-\nbrädan. Majken svär. Skyller\npå katten.' },
    { ...LOG, text: '20 aug 1999. Skata över\nkapellet. Prästen letar i\ngräset vid klockstapeln.\nHela kvällen.' },
    { ...LOG, text: '6 juni 2016. Skata vid Macken.\nPojken letar under bilarna.\nGråter lite. Skyller på sin\nlillasyster.' },
    { ...LOG, text: '14 maj 2021. Skata på\nSkolgatan. Frisörens fönster\nöppet. Frisören skriker.' },
    { ...YOU, text: 'Ingvar har skrivit upp varenda skata i femtio år. Nu vet jag vems sakerna är – utom en. Den vet nog Elsa.', last: 'NER TILL KÖKET' },
  ];
}
export function elsaPages() {
  return [
    { ...ELSA, text: 'Vilket bo! Och vad är det som glittrar …' },
    { ...ELSA, text: '…' },
    { ...ELSA, text: 'Mitt örhänge. Det gröna. Jag tappade det på dansen på bryggan 1974 – samma kväll som …' },
    { ...INGVAR_T, text: 'Jag såg skatan ta det.' },
    { ...ELSA, text: 'Och du sa ingenting? På femtio år?' },
    { ...INGVAR_T, text: 'Då hade jag fått prata med dig.' },
    { ...ELSA, fx: 'earring', text: 'Ingvar.' },
    { ...ELSA, text: 'Resten ska hem till sina ägare – det står i loggboken vems de är. Jag stannar här och hjälper honom att putsa glaset.' },
    { ...INGVAR_T, text: 'Kom tillbaka när allt är utdelat. Då tänder vi.', last: 'JAG DELAR UT' },
  ];
}
export function ownerPages(id) {
  const O = OWNER[id], T = { who: O.who, letter: O.letter, color: O.color };
  switch (id) {
    case 'majken': return [
      { ...YOU, text: 'Känner du igen den här? En fingerborg i silver.' },
      { ...T, text: 'Mammas fingerborg! Den försvann från fönsterbrädan 1981 – jag syr ju igen mjölsäckarna med den.' },
      { ...T, text: 'Jag skyllde på Sotis i tio år. Stackars Sotis. Han ska få grädde i kväll.', last: 'VARSÅGOD' },
    ];
    case 'kim': return [
      { ...YOU, text: 'Är det här ditt? Ett gammalt stoppur.' },
      { ...T, text: 'Pappas stoppur! Det var med på varenda gatlopp han körde. Det försvann en sommar när jag var liten.' },
      { ...T, text: 'Jag har anklagat Nova i nio år. Säg inget till henne. Säg inget!', last: 'JAG SÄGER INGET' },
    ];
    case 'vera': return [
      { ...YOU, text: 'Den här låg i ett skatbo uppe i fyren.' },
      { ...T, text: 'Min första sax! Från frisörskolan. Den låg på fönsterbänken en vårdag – och sedan var den borta.' },
      { ...T, text: 'Jag har klippt med en sämre sedan dess. Nu jäklar ska Sjuby bli snyggt.', last: 'VARSÅGOD' },
    ];
    case 'inga': return [
      { ...YOU, text: 'En gammal järnnyckel. Ingvar skrev att du letade i gräset vid klockstapeln, 1999.' },
      { ...T, text: 'Klockstapelns nyckel! Vi fick byta lås. Nu har jag två nycklar till samma dörr – men den här är finare.' },
      { ...T, text: 'Hälsa Elsa att jag håller tredje raden åt dem på söndag. Åt dem båda.' },
      { ...T, text: 'Det har varit så tyst här bland husen vid kapellet länge. Grannarna pratar om att något borde hända. Vi får se.', last: 'HEJ DÅ, INGA' },
    ];
  }
  return [];
}
export function lampPages() {
  return [
    { ...ELSA, text: 'Där är du! Har alla fått sina saker?' },
    { ...YOU, text: 'Fingerborgen, stoppuret, saxen och nyckeln. Alla.' },
    { ...ELSA, text: 'Och jag har mitt örhänge. Titta.' },
    { ...INGVAR_T, text: 'Glaset är putsat. Linsen är hel. Skatan har fått en holk i granen nedanför, med en kapsyl i.' },
    { ...INGVAR_T, text: 'Tänd du.', last: 'JAG TÄNDER' },
  ];
}
export function litPages() {
  return [
    { ...INGVAR_T, text: '…' },
    { ...ELSA, text: 'Åh.' },
    { ...INGVAR_T, text: 'Den har inte lyst sedan i våras. Båtarna har fått klara sig själva.' },
    { ...ELSA, text: 'Kom, vi går ut och tittar!', last: 'UT OCH TITTA' },
  ];
}
export function finalePages(amount, dives) {
  const P = [
    { ...ELSA, text: 'Titta! Den sveper över hela Sjuby. Över hamnen, över torget … ända bort till kapellet.' },
    { ...INGVAR_T, text: 'Femtio år har jag tänt den för båtarnas skull.' },
    { ...INGVAR_T, text: 'I kväll tände jag den för din skull, Elsa.' },
    { ...ELSA, text: 'Det är det längsta du har sagt på femtio år.' },
    { ...INGVAR_T, text: 'Ja.' },
  ];
  if (dives === 0) P.push({ ...INGVAR_T, text: 'Och skatan dök inte en enda gång på dig. Det har ingen klarat. Inte jag heller.' });
  P.push({ ...ELSA, text: `Och du – tack. Ingvar vill att du tar de här ${fmt(amount)} kronorna. Han har sparat dem i en kaffeburk sedan 1974.`, last: 'TACK!' });
  return P;
}

export function skatSave(g) { return g.stats.skatbo && typeof g.stats.skatbo === 'object' ? g.stats.skatbo : null; }

// The quest picks up where you were; Ingvar is not outside his cottage while it runs (he is up in the lantern,
// polishing the glass), and the people left standing after a hand-over or the last scene go home out of sight.
export function skatWorld(mgr) {
  const g = mgr.game;
  const open = mgr.isOpen('skatbo'), job = mgr.active && mgr.active.id === 'skatbo' ? mgr.active : null;
  const c = mgr.jobs.find((q) => q.id === 'skatbo');
  const S = skatSave(g);
  if (c) c.startOnAccept = !!(open && S && S.at > 0);
  mgr.ingvarAway = !!(job || (open && S && S.at > 0));
  if (mgr.ingvarAway && mgr.ingvar && g.peds.list.includes(mgr.ingvar) && hidden(g, mgr.ingvar.x, mgr.ingvar.z)) { removePed(g, mgr.ingvar); mgr.ingvar = null; }
  // (render.js: the nest in the lantern, and whether the lamp is lit)
  mgr.nestGone = mgr.done.has('skatbo') || !!(job && job.nestTaken) || !!(open && S && S.at > 0);
  mgr.lampLit = mgr.done.has('skatbo') || !!(job && job.lit);
  if (mgr.skatLeft && mgr.skatLeft.length) mgr.skatLeft = mgr.skatLeft.filter((q) => { if (!g.peds.list.includes(q)) return false; if (g.indoor || hidden(g, q.x, q.z)) { removePed(g, q); return false; } return true; });
}

export class NestJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'skatbo';
    // intro → up → nestTalk → read → logTalk → give → elsaTalk → deliver ⇄ ownerTalk → back → climb → lampTalk →
    // light → litTalk → outside → finale → done
    this.stage = 'intro';
    this.prompt = null;
    this.titleCard = true;
    this.bird = null;          // the magpie in the lantern
    this.nestTaken = false; this.carry = null; this.nestOnTable = false; this.earring = false;
    this.dives = 0; this.lit = false;
    this.left = OWNERS.map((o) => o.id);
    this.owners = {};          // the owners waiting outside, by id
    this.ingvar = null; this.elsa = null;
    this.last = null;
  }

  get floor() { const ind = this.game.indoors, p = this.game.player; return ind.inside && ind.where === 'fyren' ? fyrFloor(p.x, p.z) : -1; }

  save(at) {
    const g = this.game;
    g.stats.skatbo = { at, left: [...this.left], dives: this.dives };
    g.emit('progress', {});
  }

  start() {
    const g = this.game, m = this.mgr, p = g.player;
    const S = skatSave(g);
    if (S && S.at > 0 && S.at <= STEPS.length) { this.resume(S); return; }
    m.setObjective('Skatans bo', 'Fyren på Norrholmen');
    if (p.inCar) p.exitCar();
    g.indoors.enter(() => {
      this.spawnKitchen();
      g.emit('toast', { text: 'Fyren på Norrholmen · Ingvars kök', long: false });
      p.frozen = true;
      p.h = Math.atan2(FYR.table.x - p.x, FYR.table.z - p.z);
      g.camFocus = { ...FYR.camKitchen, owner: 'skat' };
      m.later(0.9, () => g.emit('talk', { id: this.id, pages: introPages() }), this);
    }, 'fyren');
  }

  resume(S) {
    const g = this.game;
    this.dives = S.dives || 0; this.nestTaken = true;
    const say = (text) => g.emit('toast', { text: `Skatans bo fortsätter: ${text}`, long: true });
    if (STEPS[S.at - 1] === 'deliver') {
      this.left = Array.isArray(S.left) ? S.left.filter((id) => OWNER[id]) : OWNERS.map((o) => o.id);
      if (!this.left.length) { this.toBack(); say('tillbaka till fyren.'); return; }
      this.stage = 'deliver';
      say(`dela ut ${this.left.length === 1 ? 'den sista saken' : `de ${this.left.length} sakerna`} ur skatboet.`);
    } else { this.left = []; this.toBack(); say('tillbaka till fyren – Ingvar och Elsa väntar i lanternan.'); }
  }

  spawnKitchen() {
    const g = this.game;
    this.ingvar = spawnPed(g, { ...INGVAR_LOOK }, FYR.ingvar.x, FYR.ingvar.z, FYR.ingvar.h, 'ingvar');
    this.elsa = spawnPed(g, { ...ELSA_GLASSES }, FYR.elsa.x, FYR.elsa.z, FYR.elsa.h, 'elsa');
  }
  spawnLantern() {
    const g = this.game;
    this.ingvar = spawnPed(g, { ...INGVAR_LOOK }, FYR.lampIngvar.x, FYR.lampIngvar.z, FYR.lampIngvar.h, 'ingvar');
    this.elsa = spawnPed(g, { ...ELSA_GLASSES }, FYR.lampElsa.x, FYR.lampElsa.z, FYR.lampElsa.h, 'elsa');
  }
  removeInside() { const g = this.game; removePed(g, this.ingvar); removePed(g, this.elsa); this.ingvar = this.elsa = null; }

  // ---------------------------------------------------------------- 1. up through the lighthouse
  upStep() {
    const m = this.mgr, f = this.floor;
    if (f === 0) m.setObjective('Upp i fyren', 'Spiraltrappan i hörnet');
    else if (f === 1) m.setObjective('Upp till lanternan', 'Stegen vid västra väggen');
    else if (f === 2) this.toSneak();
  }

  newBird() {
    const N = FYR.nest;
    return { state: 'preen', t: 0, i: 0, dur: BIRD.preen[0], x: N.x, y: N.y, z: N.z, h: 0, look: 0 };
  }

  toSneak() {
    const g = this.game, m = this.mgr;
    this.stage = 'sneak';
    if (!this.bird) this.bird = this.newBird();
    g.emit('skata', { kind: 'chatter' });
    if (!this.toldSneak) {
      this.toldSneak = true;
      g.emit('toast', { text: 'Lanternan. Skatan sitter på boet ovanpå linsen – och hon har sett dig.', long: true });
      m.later(1.2, () => g.emit('hint', { id: 'skat-sneak', touch: 'Gå bara när skatan putsar fjädrarna. När hon tittar upp – stå still! Ta boet från linsens östra sida.', keys: 'Gå bara när skatan putsar fjädrarna. När hon tittar upp – stå still! Ta boet (E) från linsens östra sida.' }), this);
    }
  }

  // the magpie: preen → look → watch → preen …; a dive if she sees you move while she watches
  birdStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, B = this.bird, N = FYR.nest;
    B.t += dt;
    const toYou = Math.atan2(p.x - N.x, p.z - N.z);
    const speed = this.last ? Math.hypot(p.x - this.last.x, p.z - this.last.z) / Math.max(dt, 1e-3) : 0;
    this.last = { x: p.x, z: p.z };
    if (B.state === 'preen') {
      B.h = toYou + Math.PI + Math.sin(B.t * 2.1) * 0.5;            // turned away, head in her feathers
      if (B.t >= B.dur) { B.state = 'look'; B.t = 0; g.emit('skata', { kind: 'look' }); }
    } else if (B.state === 'look') {
      const k = Math.min(1, B.t / BIRD.look);
      B.h = toYou + Math.PI * (1 - k);
      if (B.t >= BIRD.look) { B.state = 'watch'; B.t = 0; B.dur = BIRD.watch[B.i % BIRD.watch.length]; g.emit('skata', { kind: 'chatter' }); }
    } else if (B.state === 'watch') {
      B.h = toYou;
      if (B.t > BIRD.grace && speed > BIRD.still && !p.frozen) { this.dive(); return; }
      if (B.t >= B.dur) { B.i++; B.state = 'preen'; B.t = 0; B.dur = BIRD.preen[B.i % BIRD.preen.length]; }
    } else if (B.state === 'dive') {
      const k = Math.min(1, B.t / BIRD.dive), e = k * k;
      B.x = N.x + (B.at.x - N.x) * e; B.y = N.y + (B.at.y - N.y) * e; B.z = N.z + (B.at.z - N.z) * e;
      B.h = Math.atan2(B.at.x - N.x, B.at.z - N.z);
      if (k >= 1) this.knockBack();
    } else if (B.state === 'back') {
      const k = Math.min(1, B.t / BIRD.back), e = k * (2 - k);
      B.x = B.from.x + (N.x - B.from.x) * e; B.y = B.from.y + (N.y - B.from.y) * e + Math.sin(k * Math.PI) * 0.6; B.z = B.from.z + (N.z - B.from.z) * e;
      B.h = Math.atan2(N.x - B.from.x, N.z - B.from.z);
      if (k >= 1) { B.x = N.x; B.y = N.y; B.z = N.z; B.state = 'preen'; B.t = 0; B.dur = 2.2; }
    }
    const txt = { preen: ['Skatan putsar fjädrarna – gå!', 'Hon tittar bort'], look: ['Skatan tittar upp …', 'Snart måste du stå still'], watch: ['STÅ STILL! Skatan vaktar', 'Rör dig inte'], dive: ['Skatan dyker!', ''], back: ['Skatan flyger tillbaka till boet', 'Vänta …'] }[B.state];
    m.setObjective(txt[0], txt[1] + (this.dives ? ` · dykningar: ${this.dives}` : ''));
  }

  dive() {
    const g = this.game, p = g.player, B = this.bird;
    B.state = 'dive'; B.t = 0; B.at = { x: p.x, y: p.y + 1.6, z: p.z };
    p.frozen = true; p.vx = p.vz = 0;
    g.emit('skata', { kind: 'dive' });
  }

  knockBack() {
    const g = this.game, p = g.player, B = this.bird, T = FYR.stairs[1].upTo;
    this.dives++;
    p.frozen = false;
    g.indoors.place(T.x, T.z, T.h);
    this.last = { x: p.x, z: p.z };
    B.from = { x: B.x, y: B.y, z: B.z }; B.state = 'back'; B.t = 0;
    g.emit('skata', { kind: 'hit' });
    g.emit('toast', { text: this.dives === 1 ? 'Skatan dyker rakt mot dig! Du backar ner till luckan. Stå still när hon vaktar!' : 'Skatan dyker igen! Tillbaka till luckan.', long: this.dives === 1 });
  }

  sneakStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, f = this.floor;
    if (f !== 2) { this.last = null; m.setObjective('Upp till lanternan', f === 1 ? 'Stegen vid västra väggen' : 'Spiraltrappan i hörnet'); return; }
    this.birdStep(dt);
    const B = this.bird;
    if (p.state === 'foot' && !p.frozen && (B.state === 'preen' || B.state === 'look' || B.state === 'watch') && Math.hypot(p.x - FYR.take.x, p.z - FYR.take.z) < FYR.take.r) this.prompt = 'TA BOET';
  }

  takeNest() {
    const g = this.game, m = this.mgr, p = g.player, B = this.bird;
    if (B.state === 'watch') { this.dive(); return; }       // (she saw that)
    this.nestTaken = true; this.carry = 'nest'; this.stage = 'nestTalk';
    p.frozen = true; p.vx = p.vz = 0; p.h = -Math.PI / 2;
    // she leaves the lens and goes out through the open pane, scolding
    B.from = { x: B.x, y: B.y, z: B.z }; B.state = 'flee'; B.t = 0;
    g.emit('skata', { kind: 'flee' });
    g.camFocus = { ...FYR.camLantern, owner: 'skat' };
    m.later(1.3, () => g.emit('talk', { id: this.id, pages: nestPages() }), this);
  }

  fleeStep(dt) {
    const B = this.bird, W = FYR.window;
    if (!B || B.state !== 'flee') return;
    B.t += dt;
    const k = Math.min(1, B.t / BIRD.flee);
    B.x = B.from.x + (W.x - B.from.x) * k; B.z = B.from.z + (W.z - B.from.z) * k; B.y = B.from.y + (W.y - B.from.y) * k + Math.sin(k * Math.PI) * 0.5;
    B.h = Math.atan2(W.x - B.from.x, W.z - B.from.z);
    if (k >= 1) B.state = 'gone';
  }

  // ---------------------------------------------------------------- 2. the logbook, 3. Elsa
  readStep() {
    const m = this.mgr, p = this.game.player, f = this.floor;
    if (f === 1) {
      m.setObjective('Vems är sakerna?', 'Ingvars loggbok på skrivbordet');
      if (p.state === 'foot' && !p.frozen && Math.hypot(p.x - FYR.desk.x, p.z - FYR.desk.z) < FYR.desk.r) this.prompt = 'LÄS';
    } else m.setObjective('Ner med boet', f === 2 ? 'Luckan i golvet' : 'Upp till vakthytten');
  }

  readLog() {
    const g = this.game, m = this.mgr, p = g.player, D = FYR.desk;
    this.stage = 'logTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.x = D.x - 0.9; p.z = D.z + 0.05; p.h = Math.atan2(FYR.book.x - p.x, FYR.book.z - p.z);
    g.emit('paper', {});
    g.camFocus = { x: FYR.book.x, y: FYR.book.y + 0.1, z: FYR.book.z, owner: 'skat', cam: { x: FYR.book.x + 1.4, y: FYR.book.y + 1.7, z: FYR.book.z - 1.6, fov: 50 } };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: logPages() }), this);
  }

  giveStep() {
    const m = this.mgr, p = this.game.player, f = this.floor;
    if (f === 0) {
      m.setObjective('Ge boet till Elsa', 'Köksbordet');
      if (p.state === 'foot' && !p.frozen && Math.hypot(p.x - FYR.give.x, p.z - FYR.give.z) < FYR.give.r) this.prompt = 'GE';
    } else m.setObjective('Ner till köket', f === 1 ? 'Spiraltrappan i hörnet' : 'Luckan i golvet');
  }

  giveNest() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'elsaTalk'; this.carry = null; this.nestOnTable = true;
    p.frozen = true; p.vx = p.vz = 0;
    p.x = FYR.give.x + 0.1; p.z = FYR.give.z; p.h = Math.PI;
    const E = this.elsa; if (E) E.standH = E.h = E.body.h = Math.atan2(FYR.table.x - E.x, FYR.table.z - E.z);
    g.emit('bun', { kind: 'give' });
    g.camFocus = { ...FYR.camKitchen, owner: 'skat' };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: elsaPages() }), this);
  }

  // ---------------------------------------------------------------- 4. out over the map
  toDeliver() {
    const g = this.game, m = this.mgr;
    this.stage = 'deliver';
    this.save(STEPS.indexOf('deliver') + 1);
    g.emit('toast', { text: 'Fyra saker ur skatboet ska hem: till kvarnen, Macken, Salong Saxen och kapellet på Söderholmen.', long: true });
    m.later(1.4, () => g.emit('hint', { id: 'skat-deliver', touch: 'Följ GPS:en till närmaste ägare och tryck GE. Du väljer själv ordningen.', keys: 'Följ GPS:en till närmaste ägare och tryck E för att ge saken. Du väljer själv ordningen.' }), this);
  }

  nearestOwner() {
    const p = this.game.player, at = p.inCar ? p.car : p;
    let best = null, bd = 1e9;
    for (const id of this.left) { const O = OWNER[id], d = Math.hypot(at.x - O.x, at.z - O.z); if (d < bd) { bd = d; best = O; } }
    return best ? { O: best, d: bd } : null;
  }

  deliverStep() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    if (ind.inside) { m.setObjective('Dela ut sakerna ur boet', 'Gå ut ur fyren'); return; }
    if (this.ingvar || this.elsa) this.removeInside();
    // the owners come out (out of sight) and wait
    for (const id of this.left) {
      const O = OWNER[id], q = this.owners[id];
      if ((!q || !g.peds.list.includes(q)) && (hidden(g, O.x, O.z) || m.t < 1.0)) this.owners[id] = spawnPed(g, { ...O.look }, O.x, O.z, O.h, O.npc);
    }
    const N = this.nearestOwner();
    if (!N) return;
    const n = OWNERS.length - this.left.length;
    m.setObjective(`Ge ${N.O.item} till ${N.O.who.replace(/^Kyrkoherde /, '')}`, `${N.O.where} · ${n} av ${OWNERS.length} utdelade`);
    if (p.state !== 'foot' || p.frozen) return;
    for (const id of this.left) {
      const q = this.owners[id];
      if (q && Math.hypot(p.x - q.x, p.z - q.z) < SKAT.give) { this.prompt = 'GE'; this.to = id; return; }
    }
  }

  handOver(id) {
    const g = this.game, m = this.mgr, p = g.player, q = this.owners[id];
    this.stage = 'ownerTalk'; this.talkTo = id;
    p.frozen = true; p.vx = p.vz = 0;
    if (q) { p.h = Math.atan2(q.x - p.x, q.z - p.z); q.standH = q.h = q.body.h = Math.atan2(p.x - q.x, p.z - q.z); }
    g.emit('bun', { kind: 'give' });
    if (q) g.camFocus = { x: (p.x + q.x) / 2, y: p.y + 0.5, z: (p.z + q.z) / 2, yaw: p.h - 0.7, owner: 'skat', near: true, dist: 4.2, height: 2.0 };
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: ownerPages(id) }), this);
  }

  handedOver() {
    const g = this.game, m = this.mgr, id = this.talkTo, q = this.owners[id];
    this.left = this.left.filter((x) => x !== id);
    if (q) { (m.skatLeft = m.skatLeft || []).push(q); delete this.owners[id]; }
    g.emit('toast', { text: `${OWNER[id].thing} är hemma. ${this.left.length ? `${this.left.length} kvar.` : 'Allt är utdelat!'}` });
    if (this.left.length) { this.stage = 'deliver'; this.save(STEPS.indexOf('deliver') + 1); return; }
    this.toBack();
    m.sms(WHO.elsa, 'Ingvar har putsat glaset i tre timmar. Han låtsas att han inte väntar, men han har tittat ut genom kikaren efter dig var femte minut. Kom till fyren! /Elsa', 2.5, this);
  }

  // ---------------------------------------------------------------- 5. the lamp
  toBack() {
    this.stage = 'back';
    this.save(STEPS.indexOf('back') + 1);
    this.mgr.setObjective('Tillbaka till fyren', 'Ingvar och Elsa väntar i lanternan');
  }

  backStep() {
    const g = this.game, m = this.mgr, p = g.player, at = p.inCar ? p.car : p, d = Math.hypot(at.x - FYR_DOOR.x, at.z - FYR_DOOR.z);
    m.setObjective('Tillbaka till fyren', d < 30 ? (p.inCar ? 'Kliv ur – dörren på fyrens östra sida' : 'Den gröna dörren uppför stentrappan') : p.z < -229 ? 'Fyren längst ut på Norrholmen' : 'Över norra bron till Norrholmen');
    if (p.state === 'foot' && !p.frozen && !g.indoors.busy && d < FYR_DOOR.r) this.prompt = 'GÅ IN';
  }

  enterAgain() {
    const g = this.game;
    this.stage = 'climb';
    g.indoors.enter(() => { this.spawnLantern(); g.emit('toast', { text: 'Det är tyst i köket. De är uppe i lanternan.' }); }, 'fyren');
  }

  climbStep() {
    const m = this.mgr, f = this.floor;
    if (f === 2) { this.startLamp(); return; }
    m.setObjective('Upp till lanternan', f === 1 ? 'Stegen vid västra väggen' : 'Spiraltrappan i hörnet');
  }

  startLamp() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'lampTalk';
    p.frozen = true; p.vx = p.vz = 0;
    g.camFocus = { ...FYR.camLantern, owner: 'skat' };
    m.later(0.7, () => g.emit('talk', { id: this.id, pages: lampPages() }), this);
  }

  lightStep() {
    const p = this.game.player;
    this.mgr.setObjective('Tänd fyren', 'Lampan inne i linsen');
    if (p.state === 'foot' && !p.frozen && Math.hypot(p.x - FYR.light.x, p.z - FYR.light.z) < FYR.light.r) this.prompt = 'TÄND';
  }

  lightLamp() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'litTalk'; this.lit = true;
    p.frozen = true; p.vx = p.vz = 0; p.h = Math.PI;
    g.emit('lamp', {});
    g.camFocus = { x: FYR.lens.x, y: 1.6, z: FYR.lens.z, owner: 'skat', cam: { x: FYR.lens.x - 2.2, y: FYR.y + 2.9, z: FYR.lens.z + 3.3, fov: 58 } };
    m.later(1.6, () => g.emit('talk', { id: this.id, pages: litPages() }), this);
  }

  // out on the rocks: the three of you, and the light going round over Sjuby
  goOutside() {
    const g = this.game, m = this.mgr, p = g.player, E = SKAT.end;
    this.stage = 'outside';
    g.indoors.exit(() => {
      this.removeInside();
      const face = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
      const top = fyrAt(0, 0);
      this.ingvar = spawnPed(g, { ...INGVAR_LOOK }, E.ingvar.x, E.ingvar.z, face(E.ingvar, top), 'ingvar');
      this.elsa = spawnPed(g, { ...ELSA_GLASSES }, E.elsa.x, E.elsa.z, face(E.elsa, top), 'elsa');
      g.indoors.place(E.you.x, E.you.z, face(E.you, top));
      p.frozen = true;
      const C = fyrAt(30, 13), A = fyrAt(3, 1);
      g.camFocus = { x: A.x, y: CURB_H + 5.5, z: A.z, owner: 'skat', cam: { x: C.x, y: CURB_H + 1.6, z: C.z, fov: 62 } };
      this.stage = 'finale';
      const P = SKAT.pay;
      this.amount = P.base + Math.max(0, P.quiet - P.perDive * this.dives);
      m.later(1.6, () => g.emit('talk', { id: this.id, pages: finalePages(this.amount, this.dives) }), this);
    });
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    g.stats.skatbo = { at: STEPS.length + 1, dives: this.dives };
    g.stats.skatDives = this.dives;
    for (const q of [this.ingvar, this.elsa]) if (q) (m.skatLeft = m.skatLeft || []).push(q);
    this.ingvar = this.elsa = null;
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Skatans bo', amount: this.amount });
    m.sms(WHO.elsa, 'Ingvar bad mig hälsa: gå förbi telefonkiosken på kajen en sista gång. Mer än så säger han inte. Han dricker kaffe och tittar på ljuset. /Elsa', 30, null);
  }

  // ---------------------------------------------------------------- talks
  talkFx(fx) { if (fx === 'earring') { this.earring = true; this.game.emit('bun', { kind: 'vote' }); } }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'skat') g.camFocus = null; };
    switch (this.stage) {
      case 'intro': free(); this.stage = 'up';
        if (this.elsa) m.later(0.8, () => this.elsa && g.emit('say', { who: this.elsa, text: 'Lycka till! Och akta håret.' }), this);
        return;
      case 'nestTalk': free(); this.stage = 'read'; g.emit('toast', { text: 'Ner med boet. Ingvars loggböcker står i vakthytten.' }); return;
      case 'logTalk': free(); this.stage = 'give'; return;
      case 'elsaTalk': free(); this.toDeliver(); return;
      case 'ownerTalk': free(); this.handedOver(); return;
      case 'lampTalk': free(); this.stage = 'light';
        m.later(0.6, () => g.emit('hint', { id: 'skat-light', touch: 'Gå fram till linsen och tryck TÄND.', keys: 'Gå fram till linsen och tryck E för att tända.' }), this);
        return;
      case 'litTalk': free(); this.goOutside(); return;
      case 'finale': free(); this.finish(); return;
    }
  }

  // ---------------------------------------------------------------- per step
  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null;
    const inside = ['up', 'sneak', 'nestTalk', 'read', 'logTalk', 'give', 'elsaTalk'].includes(this.stage);
    if (inside && !ind.inside && !ind.busy) {         // walked out before the nest was down
      this.removeInside();
      m.quit(this, [WHO.elsa, 'Vart tog du vägen? Ingvar har satt på mer kaffe, och skatan sitter kvar på linsen. Kom tillbaka till fyren! /Elsa']);
      return;
    }
    if ((this.stage === 'climb' || this.stage === 'light') && !ind.inside && !ind.busy) { this.removeInside(); this.toBack(); return; }
    if (ind.inside && ind.where === 'fyren') ind.noExit = this.carry === 'nest' || this.stage === 'light';
    if (this.carry === 'nest' && p.state === 'foot') p.body.pose = 3;
    if (this.bird && this.bird.state === 'flee') this.fleeStep(dt);
    switch (this.stage) {
      case 'up': this.upStep(); break;
      case 'sneak': this.sneakStep(dt); break;
      case 'read': this.readStep(); break;
      case 'give': this.giveStep(); break;
      case 'deliver': this.deliverStep(); break;
      case 'back': this.backStep(); break;
      case 'climb': this.climbStep(); break;
      case 'light': this.lightStep(); break;
    }
  }

  interact() {
    const pr = this.prompt;
    if (!pr) return false;
    if (pr === 'TA BOET') { this.takeNest(); return true; }
    if (pr === 'LÄS') { this.readLog(); return true; }
    if (pr === 'GE' && this.stage === 'give') { this.giveNest(); return true; }
    if (pr === 'GE' && this.stage === 'deliver' && this.to) { this.handOver(this.to); return true; }
    if (pr === 'GÅ IN') { this.enterAgain(); return true; }
    if (pr === 'TÄND') { this.lightLamp(); return true; }
    return false;
  }

  // ---------------------------------------------------------------- map and view
  targets(T) {
    const g = this.game, ind = g.indoors, f = this.floor;
    const item = (x, y, z) => T.push({ kind: 'item', x, y, z, gps: false });
    if (ind.inside && ind.where === 'fyren') {
      const S = FYR.stairs[f];
      const goUp = ['up', 'sneak', 'climb'].includes(this.stage) || (this.stage === 'read' && f === 0);
      const goDown = (this.stage === 'read' && f === 2) || (this.stage === 'give' && f > 0);
      if (goUp && S && S.up) item(S.up.x, FYR.y + 1.5, S.up.z);
      if (goDown && S && S.down) item(S.down.x, FYR.y + 1.2, S.down.z);
      if (this.stage === 'sneak' && f === 2 && this.bird) item(FYR.nest.x, FYR.nest.y + 2.2, FYR.nest.z);
      if (this.stage === 'read' && f === 1) item(FYR.book.x, FYR.book.y + 0.5, FYR.book.z);
      if (this.stage === 'give' && f === 0) item(FYR.table.x, FYR.table.y + 0.6, FYR.table.z);
      if (this.stage === 'light' && f === 2) item(FYR.lens.x, FYR.y + 2.6, FYR.lens.z);
      return;
    }
    if (this.stage === 'deliver') {
      const N = this.nearestOwner();
      for (const id of this.left) { const O = OWNER[id], q = this.owners[id]; T.push({ kind: 'zone', x: O.x, z: O.z, r: 1.1, gps: !!N && N.O.id === id }); if (q) T.push({ kind: 'contact', x: q.x, z: q.z, r: 1, letter: O.letter, color: O.color, badgeOnly: true, badgeY: 2.7, ref: q, gps: false, always: true }); }
    }
    if (this.stage === 'back') T.push({ kind: 'zone', x: FYR_DOOR.x, z: FYR_DOOR.z, r: 1.1, gps: true });
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    p.frozen = false;
    g.indoors.noExit = false;
    if (g.camFocus && g.camFocus.owner === 'skat') g.camFocus = null;
    for (const q of Object.values(this.owners)) if (q) (m.skatLeft = m.skatLeft || []).push(q);
    this.owners = {};
    if (!g.indoors.inside) { for (const q of [this.ingvar, this.elsa]) if (q) (m.skatLeft = m.skatLeft || []).push(q); this.ingvar = this.elsa = null; }
    else this.removeInside();
  }
}
