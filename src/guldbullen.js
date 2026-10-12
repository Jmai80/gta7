// Main quest, part 14: "Den gyllene bullen" (v1.14). Dahlgren has washed up at the konditori for three weeks
// without one complaint – and today tant Gun lets him bake his first batch, inside, from Arne's recipe.
//   1. Sjuby Konditori from the inside: Dahlgren reads the recipe out at the baking table and calls for what
//      he needs; you fetch it from the counter on the east wall and hand it over the table. The cardamom comes
//      in a bag – or you crush it yourself in Gun's mother's mortar, the way Arne did. Then the tray goes into
//      the stone oven: take it out golden, not black, and give Gun a taste.
//   2. The photo on the wall: Sjuby's bun championship, 1985. Arne holds the trophy up – "Den gyllene bullen",
//      a gilded bun on a wooden foot – and Dahlgren sulks at the edge. It disappeared the same night. Dahlgren
//      confesses: he took it, out of envy, and hid the two halves apart. The foot is in his old garden gnome by
//      the allotments; the bun "where the lighthouse shines over the spruces".
//   3. The gnome (the secret "Trädgårdstomten"): it is hollow – the foot with its brass plate, and his note.
//   4. The spruces near the lighthouse (the secret "Den gyllene bullen"): a magpie gets there first. Follow it
//      from tree to tree – it flies off every time you come close – until the brass gets too heavy and it drops it.
//   5. The square: Bengt has heard everything and wants a championship, now. Inga, Ingvar and Elsa judge; it
//      is a tie, and the one who found the trophy decides: taste both buns and vote. The winner gives the trophy
//      to Gun, and it goes back on its shelf in the konditori.
// A checkpoint is kept in stats.guld, so a reload picks it up where you were.
import { WHO, KONDITORI, FEST, CURB_H } from './config.js';
import { KOND, KOND_DOOR, JARS } from './konditori.js';
import { SECRETS } from './secrets.js';
import { ISLE, onIsle } from './island.js';
import { STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed } from './hideout.js';
import { INGVAR_LOOK } from './livs.js';
import { GUN_LOOK } from './flag.js';
import { BENGT_LOOK } from './opening.js';
import { DISH_LOOK, ELSA_LOOK } from './flaskpost.js';
import { hidden, stand } from './skattjakt.js';
import { fmt } from './rng.js';

const GNOME = SECRETS.find((s) => s.id === 'gnome'), GOLD = SECRETS.find((s) => s.id === 'goldbun');
export const ORDER = ['mjolk', 'smor', 'socker', 'mjol', 'kardemumma'];
const JAR = Object.fromEntries(JARS.map((j) => [j.id, j]));

export const GULD = {
  mark: { x: KONDITORI.x, z: KONDITORI.z, r: KONDITORI.r },
  pound: 8,                        // presses of the pestle for a mortar full of crushed cardamom
  knead: 3.6,                      // seconds Dahlgren kneads before the tray is ready
  ready: 7, burnt: 15,             // seconds in the stone oven: golden from 7, black from 15
  gnome: { x: GNOME.x, z: GNOME.z, r: 1.6 },
  stone: { x: GOLD.x, z: GOLD.z - 0.9, r: 1.8, notice: 15, arrive: 40 },   // the bun on its mossy stone
  magpie: { scare: 6.5, flights: 5, speed: 8.5, near: 8, far: 19, keep: 42 }, // it flies off within `scare` m; drops it after `flights`
  // the championship on the square, in front of the konditori: the judges behind the long table (FEST.table)
  fest: {
    mark: { x: -6, z: 7.4, r: 1.7 },
    gun: { x: -6.0, z: 10.85, h: Math.PI },
    judges: [{ who: 'inga', x: -8.2, z: 13.2 }, { who: 'ingvar', x: -6.0, z: 13.2 }, { who: 'elsa', x: -3.8, z: 13.2 }],
    stands: [
      { who: 'bengt', x: -12.6, z: 9.6, at: { x: -12.6, z: 10.55, h: Math.PI }, taste: { x: -12.6, z: 8.8, r: 0.85 } },
      { who: 'dahl', x: 0.6, z: 9.6, at: { x: 0.6, z: 10.55, h: Math.PI }, taste: { x: 0.6, z: 8.8, r: 0.85 } },
    ],
    crowd: [[-10.4, 6.0, 0.4], [-8.6, 5.4, 0.1], [-3.4, 5.4, -0.1], [-1.6, 6.1, -0.4], [-11.6, 12.0, 1.4], [2.2, 12.2, -1.6]],
  },
  pay: { base: 5000, crushed: 300, golden: 200, clean: 300, perError: 75 },
};
export const GULD_MAX = GULD.pay.base + GULD.pay.crushed + GULD.pay.golden + GULD.pay.clean;

const GUN_T = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const DAHL = { who: 'Direktör Dahlgren', letter: 'D', color: '#5a5f6b' };
const BENGT = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const INGA = { who: 'Kyrkoherde Inga', letter: 'I', color: '#6b4fa0' };
const INGVAR_T = { who: 'Fyrvaktaren Ingvar', letter: 'I', color: '#5b8fd6' };
const ELSA = { who: 'Elsa', letter: 'E', color: '#5f9a6a' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const NOTE = { who: 'Dahlgrens lapp, 1985', letter: 'D', color: '#c8a24a', note: true };
// Dahlgren in a baker's apron over his shirt; Inga in black with a white collar; the crowd on the square
export const BAKE_LOOK = { ...DISH_LOOK, accent: 0xf2efe6, style: ST.glasses | ST.apron | ST.baker };
const INGA_LOOK = { shirt: 0x1d1f22, pants: 0x1d1f22, skin: 0xf0c8a8, hair: 0xc9c5bd, height: 0.98, bulk: 1.06, style: ST.bun | ST.glasses | ST.jacket, accent: 0xf4f4f0 };
const CROWD_LOOKS = [
  { shirt: 0x2c62a8, pants: 0x2b2e35, skin: 0xf0c8a8, hair: 0x6a4a2a, height: 1.0, bulk: 1.05, style: ST.glasses, accent: 0x2c62a8 },
  { shirt: 0xe8833a, pants: 0x24365e, skin: 0xc68e62, hair: 0x1a1414, height: 0.95, bulk: 0.95, style: ST.long, accent: 0xe8833a },
  { shirt: 0x6b6f3a, pants: 0x3a3c41, skin: 0xe9c3a6, hair: 0xb0b0b0, height: 1.0, bulk: 1.15, style: ST.beard | ST.jacket, accent: 0x4a3a2a },
  { shirt: 0xb5466a, pants: 0x2b2e35, skin: 0xf2d0b5, hair: 0xd9b25a, height: 0.92, bulk: 0.95, style: ST.bun, accent: 0xb5466a },
  { shirt: 0x3d7a5a, pants: 0x2b2e35, skin: 0x8a5a3a, hair: 0x1a1414, height: 1.02, bulk: 1.0, style: ST.cap, accent: 0x3d7a5a },
  { shirt: 0xf2efe6, pants: 0x5a4632, skin: 0xf0c8a8, hair: 0xc9c5bd, height: 0.94, bulk: 1.1, style: ST.bun | ST.glasses, accent: 0x9db8cc },
];
const WANT_LINES = {
  mjolk: 'Mjölk! Ljummen. Det står ljummen. Vad betyder ljummen?',
  smor: 'Smör! Mycket smör. Arne var inte snål med smöret.',
  socker: 'Socker! Och inte salt. Det har hänt förut.',
  mjol: 'Mjöl! Vetemjöl från Majkens kvarn, står det.',
  kardemumma: 'Och sist … kardemumma. Arne har strukit under det tre gånger.',
};
const THANKS = ['Tack. Ljummen. Den är ljummen.', 'Smör. Så vackert.', 'Socker, ja. Det smakar socker.', 'Mjöl. Nu dammar det.'];
// the steps a reload can pick up from (stats.guld.at = index + 1)
const STEPS = ['gnome', 'stone', 'fest'];

export function introPages() {
  return [
    { ...GUN_T, text: 'Där är du, lilla vän! Kom in, kom in. Titta vem som står vid bakbordet.' },
    { ...DAHL, text: 'Tre veckor har jag diskat. Utan att klaga. Nästan utan att klaga.' },
    { ...GUN_T, text: 'Han har förtjänat det. I dag får Dahlgren baka sin första sats – efter Arnes recept, i Arnes ugn.' },
    { ...DAHL, text: 'Jag läser receptet, och du hämtar. Allt står på disken vid östra väggen. Jag … vet inte riktigt var saker är.' },
    { ...GUN_T, text: 'Ge honom det han ber om, över bordet. Jag står i kassan och låtsas att jag inte tittar.', last: 'NU BAKAR VI' },
  ];
}
export function tastePages(crushed, state, errors) {
  const P = [];
  if (state === 'burnt') {
    P.push({ ...GUN_T, text: 'Svarta. Helt svarta.' }, { ...DAHL, text: 'Det är … rostade.' }, { ...GUN_T, text: 'Arne brände också sin första sats. Vi äter dem ändå. Med mycket kaffe.' });
  } else if (crushed) {
    P.push({ ...GUN_T, text: '…' }, { ...GUN_T, text: 'Det här … det här är nästan Arnes. Du stötte kardemumman, lilla vän. Precis som han.' }, { ...DAHL, text: 'Nästan. Nästan som Arnes. Det är det närmaste jag kommit på fyrtio år.' });
  } else {
    P.push({ ...GUN_T, text: 'Goda. Riktigt goda, Dahlgren.' }, { ...GUN_T, text: 'Men inte Arnes. Kardemumman ur påsen … Arne stötte den alltid själv, i min mammas mortel.' }, { ...DAHL, text: 'Nästan, alltså. Jag är alltid nästan.' });
  }
  if (errors >= 3) P.push({ ...DAHL, text: 'Och jag fick socker när jag bad om mjöl. Två gånger. Det var inte mitt fel.' });
  P.push({ ...GUN_T, text: 'Dahlgren? Varför står du och stirrar på fotot på väggen?' });
  P.push({ ...DAHL, text: 'Jag … inget. Titta inte på det. Titta inte på det fotot.', last: 'OKEJ …' });
  return P;
}
export function photoPages() {
  return [
    { ...YOU, text: 'Ett gammalt foto: ”Sjubys bullmästerskap 1985.” En man i vit bagarjacka håller upp en bulle av guld. Folk applåderar.' },
    { ...GUN_T, text: 'Arne vann. Den gyllene bullen – en bulle av förgylld mässing på en fot av ek. Han var så stolt.' },
    { ...GUN_T, text: 'Den stod på hyllan där i en enda natt. Sedan var den borta. Vi fick aldrig veta vart.' },
    { ...YOU, text: 'Vem är det som står längst ut till höger? Han med armarna i kors?' },
    { ...DAHL, text: '…' },
    { ...DAHL, text: 'Det var jag. Jag kom tvåa. Jag kom alltid tvåa efter Arne.' },
    { ...DAHL, text: 'Jag tog den. Samma natt. Av avund. Jag skruvade isär den, så att ingen skulle kunna ställa upp den igen.' },
    { ...GUN_T, text: 'Dahlgren!' },
    { ...DAHL, text: 'Foten med plaketten stoppade jag i min trädgårdstomte. Han står kvar vid kolonilotternas parkering – jag hade lott 12 på den tiden.' },
    { ...DAHL, text: 'Och bullen … gömde jag ute på Norrholmen. Jag skrev ner var. Lappen ligger i tomten.' },
    { ...GUN_T, text: 'Hämta hem den, lilla vän. Fyrtio år har den varit borta.', last: 'TILL TOMTEN' },
  ];
}
export function gnomePages(knewGnome) {
  return [
    { ...YOU, text: knewGnome ? 'Dahlgrens tomte, med fiskespöet och inget vatten. Han är lättare än han ser ut – ihålig.' : 'En trädgårdstomte med fiskespö. ”Tillhör Dahlgren” står det under. Han är ihålig.' },
    { ...YOU, text: 'Inuti: en fot av ek med en plakett i mässing – ”SJUBYS BULLMÄSTARE 1985” – och en hoprullad lapp.' },
    { ...NOTE, text: 'Bullen ligger där fyren\nlyser över granarna,\npå stenen med mossa.\nIngen hittar den där.\n/D. 1985' },
    { ...YOU, text: 'Granarna nära fyren. Ute på udden.', last: 'TILL GRANARNA' },
  ];
}
export function bunPages() {
  return [
    { ...YOU, text: 'Den gyllene bullen. Förgylld mässing, tung som en tegelsten. Inte konstigt att skatan tappade den.' },
    { ...YOU, text: 'Den passar precis på foten. Klick.', last: 'TILL TORGET' },
  ];
}
export function festPages(crushed) {
  return [
    { ...GUN_T, text: 'Välkomna, allihop, till Sjubys bullmästerskap! Det första sedan 1985.' },
    { ...BENGT, text: 'Jag har bakat efter Arnes recept varje morgon i tre veckor. Jag vill veta om jag är bäst. Ärligt.' },
    { ...DAHL, text: crushed ? 'Och jag bakade i dag. För första gången. Med stött kardemumma.' : 'Och jag bakade i dag. För första gången i mitt liv. Det var … lärorikt.' },
    { ...GUN_T, text: 'Domarna smakar! Kyrkoherde Inga, fyrvaktaren Ingvar och Elsa från Söderholmen.' },
    { ...INGA, text: 'Bengts bulle är klassisk. Luftig, söt, som en söndag. Min röst går till Bengt.' },
    { ...ELSA, text: crushed ? 'Dahlgrens smakar … mer. Mer kardemumma, mer av något. Min röst går till Dahlgren.' : 'Dahlgrens är kompakt. Men den har karaktär. Min röst går till Dahlgren.' },
    { ...INGVAR_T, text: '…' },
    { ...INGVAR_T, text: 'Båda är goda.' },
    { ...ELSA, text: 'Ingvar! Du måste välja.' },
    { ...INGVAR_T, text: 'Jag har valt. Båda är goda.' },
    { ...GUN_T, text: 'Oavgjort, då! Den som hittade pokalen får avgöra. Smaka på båda, lilla vän – och rösta.', last: 'JAG SMAKAR' },
  ];
}
export function finalePages(vote, amount) {
  const P = [{ ...GUN_T, text: `Rösterna är räknade. Sjubys bullmästare blir … ${vote === 'bengt' ? 'BAGAR-BENGT!' : 'DIREKTÖR DAHLGREN!'}` }];
  if (vote === 'dahl') {
    P.push({ ...DAHL, text: '…Jag? Jag kom aldrig etta. Inte en enda gång.' });
    P.push({ ...BENGT, text: 'Grattis, Dahlgren. Den var bättre i dag. Bara i dag.' });
    P.push({ ...DAHL, fx: 'give', text: 'Gun. Den här är din. Den har alltid varit Arnes. Jag har bara lånat den – i fyrtio år.' });
  } else {
    P.push({ ...BENGT, text: 'Jag? Efter tre veckor?' });
    P.push({ ...DAHL, text: 'Rättvist. Han har bakat i tre veckor. Jag i en dag. Nästa år.' });
    P.push({ ...BENGT, fx: 'give', text: 'Gun. Den här ska stå hos dig. Det var Arnes recept jag bakade efter.' });
  }
  P.push({ ...GUN_T, text: 'Den ska stå på hyllan i konditoriet. Där den stod en enda natt 1985.' });
  P.push({ ...INGVAR_T, text: 'Bra.' });
  P.push({ ...ELSA, text: 'Han säger aldrig mer än så. Men han menar det.' });
  P.push({ ...GUN_T, text: `Och du, lilla vän: tack. Här är ${fmt(amount)} kronor – och en bulle från varje bagare.`, last: 'HURRA!' });
  return P;
}

export function guldSave(g) { return g.stats.guld && typeof g.stats.guld === 'object' ? g.stats.guld : null; }
// is the golden bun on its mossy stone among the spruces? (render.js draws it there; the secret is found there)
export function bunOnStone(mgr) {
  if (!mgr || mgr.done.has('guldbullen')) return false;
  const S = guldSave(mgr.game), job = mgr.active && mgr.active.id === 'guldbullen' ? mgr.active : null;
  if (job) return !job.bunTaken;
  return !(S && S.at >= 3);
}

// The quest picks up where you were, and the championship on the square is put up (and taken down) out of sight
export function guldWorld(mgr) {
  const g = mgr.game;
  const open = mgr.isOpen('guldbullen'), job = mgr.active && mgr.active.id === 'guldbullen' ? mgr.active : null;
  const c = mgr.jobs.find((q) => q.id === 'guldbullen');
  const S = guldSave(g);
  if (c) c.startOnAccept = !!(open && S && S.at > 0);
  mgr.goldbunGone = !bunOnStone(mgr);   // (secrets.js: the golden bun is not on its stone to be found)
  const F = mgr.guldFest;
  if (F && !(job && job.festUp) && (g.indoor || hidden(g, GULD.fest.mark.x, GULD.fest.mark.z))) takeDownFest(mgr);
}

// ---- the championship on the square: the long table with the judges, two stands, Gun, a crowd
export function putUpFest(mgr, crushed) {
  const g = mgr.game, F = GULD.fest;
  if (mgr.guldFest) return mgr.guldFest;
  const tab = g.layout.colliders.filter((q) => q.fest || q.bm);
  for (const q of tab) q.h = q.hUp;
  const add = (look, x, z, h, npc) => spawnPed(g, { ...look }, x, z, h, npc);
  const fest = {
    gun: add(GUN_LOOK, F.gun.x, F.gun.z, F.gun.h, 'fest-gun'),
    bengt: add(BENGT_LOOK, F.stands[0].at.x, F.stands[0].at.z, F.stands[0].at.h, 'bengt-out'),
    dahl: add(BAKE_LOOK, F.stands[1].at.x, F.stands[1].at.z, F.stands[1].at.h, 'flask-dahl'),
    judges: [add(INGA_LOOK, F.judges[0].x, F.judges[0].z, Math.PI, 'inga'), add(INGVAR_LOOK, F.judges[1].x, F.judges[1].z, Math.PI, 'fest-ingvar'), add({ ...ELSA_LOOK, style: ELSA_LOOK.style | ST.glasses }, F.judges[2].x, F.judges[2].z, Math.PI, 'elsa')],
    crowd: F.crowd.map(([x, z, h], i) => add(CROWD_LOOKS[i % CROWD_LOOKS.length], x, z, h, 'fest')),
    crushed: !!crushed,
  };
  mgr.guldFest = fest;
  return fest;
}
export function takeDownFest(mgr) {
  const g = mgr.game, F = mgr.guldFest;
  if (!F) return;
  for (const q of [F.gun, F.bengt, F.dahl, ...F.judges, ...F.crowd]) removePed(g, q);
  if (!g.festUp) for (const q of g.layout.colliders) if (q.fest || q.bm) q.h = 0;
  mgr.guldFest = null;
}

export class GoldenBunJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'guldbullen';
    // enter → intro → bake → knead → tray → oven → baking → carry → taste → photo → photoTalk → gnome →
    // gnomeNote → stone → magpie → pick → bunTalk → fest → festTalk → vote → finale → done
    this.stage = 'enter';
    this.prompt = null;
    this.titleCard = true;
    this.want = 0; this.hand = null; this.pound = 0; this.poundAt = -9;
    this.errors = 0; this.crushed = false;
    this.tray = null;         // { t } once Dahlgren has filled it: raw → golden (ready) → black (burnt)
    this.inOven = false; this.kneadT = 0;
    this.carry = null;        // outside: 'foot' (the trophy's foot), then 'pokal' (bun on its foot)
    this.bunTaken = false; this.magpie = null; this.bunAt = null;
    this.tasted = new Set(); this.vote = null;
    this.gun = null; this.dahl = null;
  }

  get festUp() { return this.stage === 'fest' || this.stage === 'festTalk' || this.stage === 'vote' || this.stage === 'finale' || this.stage === 'done'; }
  get trayState() { return !this.tray ? null : this.tray.t >= GULD.burnt ? 'burnt' : this.tray.t >= GULD.ready ? 'golden' : 'raw'; }
  get inKonditori() { const ind = this.game.indoors; return ind.inside && ind.where === 'konditori'; }

  save(at) {
    const g = this.game;
    g.stats.guld = { at, errors: this.errors, crushed: this.crushed, state: this.bakedState || null };
    g.emit('progress', {});
  }

  start() {
    const g = this.game, m = this.mgr;
    const S = guldSave(g);
    if (S && S.at > 0 && S.at <= STEPS.length) { this.resume(S); return; }
    m.setObjective('Den gyllene bullen', 'Sjuby Konditori');
    const p = g.player;
    if (p.inCar) p.exitCar();
    g.indoors.enter(() => {
      this.stage = 'intro';
      this.spawnInside();
      g.emit('toast', { text: 'Sjuby Konditori · torget', long: false });
      p.frozen = true;
      g.camFocus = { ...KOND.camRoom, owner: 'guld' };
      m.later(0.9, () => g.emit('talk', { id: this.id, pages: introPages() }), this);
    }, 'konditori');
  }

  resume(S) {
    const g = this.game, m = this.mgr;
    this.errors = S.errors || 0; this.crushed = !!S.crushed; this.bakedState = S.state || 'golden';
    const step = STEPS[S.at - 1];
    const say = (text) => g.emit('toast', { text: `Den gyllene bullen fortsätter: ${text}`, long: true });
    if (step === 'gnome') { this.toGnome(); say('Dahlgrens tomte vid kolonilotternas parkering på Norrholmen.'); }
    else if (step === 'stone') { this.carry = 'foot'; this.toStone(); say('bullen ligger bland granarna nära fyren.'); }
    else { this.carry = 'pokal'; this.bunTaken = true; this.toFest(); say('bullmästerskapet på torget.'); }
    void m;
  }

  spawnInside() {
    const g = this.game;
    this.gun = spawnPed(g, { ...GUN_LOOK }, KOND.gun.x, KOND.gun.z, KOND.gun.h, 'gun');
    this.dahl = spawnPed(g, { ...BAKE_LOOK }, KOND.dahl.x, KOND.dahl.z, KOND.dahl.h, 'flask-dahl');
  }
  removeInside() { const g = this.game; removePed(g, this.gun); removePed(g, this.dahl); this.gun = this.dahl = null; }

  // ---------------------------------------------------------------- 1. the baking
  startBaking() {
    const g = this.game, m = this.mgr;
    this.stage = 'bake'; this.want = 0;
    m.later(0.6, () => this.callFor(), this);
    m.later(1.6, () => g.emit('hint', { id: 'guld-bake', touch: 'Hämta det Dahlgren ber om från disken vid östra väggen – ge det till honom över bakbordet.', keys: 'Hämta det Dahlgren ber om från disken vid östra väggen (E) – ge det till honom över bakbordet (E).' }), this);
  }

  callFor() {
    const g = this.game, id = ORDER[this.want];
    if (!this.dahl || this.stage !== 'bake') return;
    g.emit('say', { who: this.dahl, text: WANT_LINES[id] });
    if (id === 'kardemumma' && this.gun) this.mgr.later(2.8, () => { if (this.stage === 'bake' && !this.crushed && this.hand !== 'stott' && this.gun) g.emit('say', { who: this.gun, text: 'Arne malde aldrig ur påse. Mortelns står på bordet vid södra väggen …' }); }, this);
  }

  bakeStep() {
    const g = this.game, m = this.mgr, p = g.player, id = ORDER[this.want];
    const holding = this.hand === 'stott' ? 'stött kardemumma' : this.hand ? JAR[this.hand].name.replace(/^en påse /, '') : 'tomma händer';
    m.setObjective(`Dahlgren vill ha: ${JAR[id].label.toLowerCase()}`, `${this.want} av ${ORDER.length} · du har ${holding}`);
    if (p.state !== 'foot' || p.frozen) return;
    const near = (S) => Math.hypot(p.x - S.x, p.z - S.z) < S.r;
    if (this.hand && near(KOND.give)) { this.prompt = 'GE'; return; }
    if (near(KOND.mortar)) { this.prompt = 'STÖT'; return; }
    for (const j of JARS) if (near(j) && this.hand !== j.id) { this.prompt = j.label; this.jar = j; return; }
  }

  pickJar(j) {
    const g = this.game, p = g.player;
    this.hand = j.id; this.pound = 0;
    p.h = Math.atan2(j.item[0] - p.x, j.item[2] - p.z);
    g.emit('bun', { kind: 'jar' });
  }

  poundOnce() {
    const g = this.game, p = g.player, M = KOND.mortarAt;
    p.h = Math.atan2(M.x - p.x, M.z - p.z);
    if (this.hand && this.hand !== 'stott') this.hand = null;      // (whatever you held goes back on the counter)
    if (this.hand === 'stott') { g.emit('toast', { text: 'Du har redan stött kardemumma – ge den till Dahlgren.' }); return; }
    this.pound++; this.poundAt = g.time;
    g.emit('pestle', {});
    if (this.pound === 1) g.emit('toast', { text: 'Gröna kardemummakärnor i mässingsmorteln. Stöt!' });
    if (this.pound >= GULD.pound) { this.hand = 'stott'; this.pound = 0; g.emit('toast', { text: 'Nystött kardemumma. Det doftar … som Arnes konditori.', long: true }); }
  }

  give() {
    const g = this.game, m = this.mgr, p = g.player, id = ORDER[this.want], D = this.dahl;
    if (D) p.h = Math.atan2(D.x - p.x, D.z - p.z);
    const ok = this.hand === id || (id === 'kardemumma' && this.hand === 'stott');
    if (!ok) {
      this.errors++;
      g.emit('bun', { kind: 'wrong' });
      const what = this.hand === 'stott' ? 'stött kardemumma' : JAR[this.hand].name.replace(/^en påse /, '');
      if (D) g.emit('say', { who: D, text: this.hand === 'stott' ? 'Kardemumma? Nu? Det står kardemumma SIST.' : `Det där är ${what}. Jag bad om ${JAR[id].name.replace(/^en påse malen /, '')}.` });
      return;
    }
    if (id === 'kardemumma') this.crushed = this.hand === 'stott';
    this.hand = null; this.want++;
    g.emit('bun', { kind: 'give' });
    if (this.want < ORDER.length) {
      if (D) g.emit('say', { who: D, text: THANKS[this.want - 1] });
      m.later(1.6, () => this.callFor(), this);
      return;
    }
    // all five: he kneads, shapes the buns and fills the tray
    this.stage = 'knead'; this.kneadT = 0;
    if (D) g.emit('say', { who: D, text: this.crushed ? 'Stött … Gun, känn hur det doftar!' : 'Kardemumma. Från påse. Det står inget om påse.' });
    if (this.crushed && this.gun) m.later(1.6, () => this.gun && g.emit('say', { who: this.gun, text: 'Det doftar som en söndag 1972.' }), this);
  }

  kneadStep(dt) {
    const g = this.game, m = this.mgr, D = this.dahl;
    this.kneadT += dt;
    if (D) D.body.pose = 3;
    m.setObjective('Dahlgren knådar degen', 'Vänta lite …');
    if (this.kneadT > 1.8 && !this.saidKnead) { this.saidKnead = true; if (D) g.emit('say', { who: D, text: 'Knåda, knåda. Rulla, knyt. Pärlsocker!' }); g.emit('bun', { kind: 'knead' }); }
    if (this.kneadT >= GULD.knead) {
      this.stage = 'tray'; this.tray = { t: 0 };
      if (D) { D.body.pose = 0; g.emit('say', { who: D, text: 'Plåten är klar! In i ugnen med den – jag vågar inte gå nära elden.' }); }
    }
  }

  trayStep() {
    const g = this.game, m = this.mgr, p = g.player;
    const near = (S) => Math.hypot(p.x - S.x, p.z - S.z) < S.r;
    const st = this.trayState;
    if (this.stage === 'tray') {
      m.setObjective('Ta plåten med bullar', 'Från bakbordet');
      if (p.state === 'foot' && !p.frozen && near(KOND.give)) this.prompt = 'PLÅTEN';
      return;
    }
    if (this.stage === 'oven') {
      m.setObjective('In i stenugnen med plåten', st === 'raw' && this.tray.t > 0 ? 'De är fortfarande bleka – in igen' : 'Arnes ugn i sydvästra hörnet');
      if (p.state === 'foot' && !p.frozen && near(KOND.oven) && st === 'raw') this.prompt = 'IN I UGNEN';
      if (st !== 'raw' && p.state === 'foot' && !p.frozen && near(KOND.serve)) this.prompt = 'BJUD';
      if (st !== 'raw') m.setObjective('Bjud tant Gun på bullarna', st === 'burnt' ? 'Svarta … men bjud ändå' : 'Hon står vid kassan');
      return;
    }
    if (this.stage === 'baking') {
      m.setObjective(st === 'raw' ? 'Bullarna gräddas …' : st === 'golden' ? 'Gyllene! Ta ut dem!' : 'Bränt!', 'Ta ut dem när de är gyllene – inte svarta');
      if (p.state === 'foot' && !p.frozen && near(KOND.oven)) this.prompt = 'TA UT';
    }
  }

  bakingStep(dt) {
    const g = this.game, D = this.dahl;
    const was = this.trayState;
    this.tray.t += dt;
    const now = this.trayState;
    if (was === 'raw' && now === 'golden') { g.emit('kitchen', { kind: 'ready' }); if (D) g.emit('say', { who: D, text: 'De är gyllene! Ta ut dem! Ta ut dem!' }); }
    if (now === 'golden' && this.tray.t >= GULD.burnt - 3 && !this.warned) { this.warned = true; if (this.gun) g.emit('say', { who: this.gun, text: 'Det luktar lite väl mycket nu, lilla vän …' }); }
    if (was === 'golden' && now === 'burnt') { g.emit('kitchen', { kind: 'burnt' }); if (D) g.emit('say', { who: D, text: 'Oj. Oj, oj.' }); }
  }

  serve() {
    const g = this.game, m = this.mgr, p = g.player, Gu = this.gun;
    this.stage = 'taste'; this.prompt = null;
    this.bakedState = this.trayState; this.tray = null;   // (on the counter now: render.js draws it by Gun)
    p.frozen = true; p.vx = p.vz = 0;
    if (Gu) { p.h = Math.atan2(Gu.x - p.x, Gu.z - p.z); Gu.standH = Gu.h = Gu.body.h = Math.atan2(p.x - Gu.x, p.z - Gu.z); }
    g.emit('bun', { kind: 'taste' });
    g.camFocus = { ...KOND.camTaste, owner: 'guld' };
    m.later(0.8, () => g.emit('talk', { id: this.id, pages: tastePages(this.crushed, this.bakedState, this.errors) }), this);
  }

  // ---------------------------------------------------------------- 2. the photo
  toPhoto() {
    const g = this.game, D = this.dahl;
    this.stage = 'photo';
    // Dahlgren goes round the end of the counter and stands in the café, looking at the photo
    if (D) { D.arrived = false; D.goto([[KOND.room.x0 + 9.3, KOND.room.z0 + 5.0], [KOND.room.x0 + 9.3, KOND.room.z0 + 2.9], [KOND.room.x0 + 1.65, KOND.room.z0 + 2.95]], 1.1, -Math.PI / 2 - 0.4); }
    if (this.gun) { const Gu = this.gun; Gu.standH = Gu.h = Gu.body.h = KOND.gun.h; }
    void g;
  }

  photoStep() {
    const g = this.game, m = this.mgr, p = g.player;
    m.setObjective('Titta på fotot', 'På väggen i kaféet, bredvid den tomma hyllan');
    if (p.state === 'foot' && !p.frozen && Math.hypot(p.x - KOND.photo.x, p.z - KOND.photo.z) < KOND.photo.r) this.prompt = 'TITTA';
  }

  lookAtPhoto() {
    const g = this.game, m = this.mgr, p = g.player, D = this.dahl;
    this.stage = 'photoTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.x = KOND.photo.x + 0.25; p.z = KOND.photo.z + 1.1; p.h = -Math.PI / 2 - 0.5;   // (out of the shot, beside it)
    if (D && !D.arrived) stand(g, D, KOND.room.x0 + 1.65, KOND.room.z0 + 2.95, -Math.PI / 2 - 0.4);
    g.emit('paper', {});
    g.camFocus = { ...KOND.camPhoto, owner: 'guld' };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: photoPages() }), this);
  }

  // ---------------------------------------------------------------- 3. the gnome
  toGnome() {
    const m = this.mgr;
    this.stage = 'gnome';
    this.save(STEPS.indexOf('gnome') + 1);
    m.setObjective('Dahlgrens tomte', 'Kolonilotternas parkering på Norrholmen');
  }

  gnomeStep() {
    const g = this.game, m = this.mgr, p = g.player, N = GULD.gnome, ind = g.indoors;
    if (ind.inside) { m.setObjective('Dahlgrens tomte', 'Gå ut – tomten står på Norrholmen'); return; }
    if (this.gun || this.dahl) this.removeInside();
    const d = Math.hypot(p.x - N.x, p.z - N.z);
    if (p.state === 'foot' && !p.frozen && d < N.r) this.prompt = 'UNDERSÖK';
    m.setObjective('Dahlgrens tomte', d < 30 ? (p.inCar ? 'Kliv ur – tomten står vid parkeringen' : 'Trädgårdstomten med fiskespö') : p.z < -229 ? 'Kolonilotternas parkering' : 'Över norra bron till Norrholmen');
  }

  openGnome() {
    const g = this.game, m = this.mgr, p = g.player, N = GULD.gnome;
    this.stage = 'gnomeNote';
    const knew = !!(m.secrets && m.secrets.has('gnome'));
    p.frozen = true; p.vx = p.vz = 0; p.h = Math.atan2(N.x - 0.9 - p.x, N.z - p.z);
    g.camFocus = { x: N.x - 0.9, y: 0.4, z: N.z, yaw: p.h + 0.5, owner: 'guld', near: true, dist: 3.6, height: 1.7 };
    g.emit('paper', {});
    this.carry = 'foot';
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: gnomePages(knew) }), this);
  }

  // ---------------------------------------------------------------- 4. the spruces and the magpie
  toStone() {
    const m = this.mgr;
    this.stage = 'stone'; this.bunTaken = false;
    this.save(STEPS.indexOf('stone') + 1);
    const S = GULD.stone;
    this.magpie = { x: S.x + 0.7, y: CURB_H + 0.02, z: S.z + 0.5, h: -2.2, state: 'ground', t: 0, flights: 0, bun: false, used: [] };
    m.setObjective('Den gyllene bullen', 'Bland granarna nära fyren');
  }

  stoneStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, S = GULD.stone, B = this.magpie;
    const at = p.inCar ? p.car : p, d = Math.hypot(at.x - S.x, at.z - S.z);
    B.t += dt;
    B.h = -2.2 + Math.sin(B.t * 1.3) * 0.6;           // pecking about by the stone
    m.setObjective('Den gyllene bullen', d < S.arrive ? 'Stenen med mossa, mitt bland granarna' : p.z < -229 ? 'Granarna nära fyren' : 'Över norra bron till Norrholmen');
    if (d < S.notice) this.magpieTakes();
  }

  magpieTakes() {
    const g = this.game, m = this.mgr, B = this.magpie;
    this.stage = 'magpie'; this.bunTaken = true; B.bun = true;
    g.emit('bun', { kind: 'magpie' });
    g.emit('toast', { text: 'En skata! Den nappar åt sig den gyllene bullen och flyger!', long: true });
    this.trees = this.spruces();
    this.flyOn();
    m.later(1.0, () => g.emit('hint', { id: 'guld-skata', touch: 'Följ skatan – när du kommer nära flyger den vidare. Till slut orkar den inte bära.', keys: 'Följ skatan – när du kommer nära flyger den vidare. Till slut orkar den inte bära.' }), this);
  }

  // the spruces in the wood near the lighthouse (the layout's own trees)
  spruces() {
    const S = GULD.stone;
    return this.game.layout.prims.filter((q) => q.t === 'tree' && (q.kind === 'spruce' || q.kind === 'pine') && onIsle(q.x, q.z) && Math.hypot(q.x - S.x, q.z - S.z) < GULD.magpie.keep && Math.hypot(q.x - ISLE.lighthouse.x, q.z - ISLE.lighthouse.z) > 10);
  }

  // off to the next spruce: one a little way off, away from you, not one it has just sat in
  flyOn() {
    const g = this.game, p = g.player, B = this.magpie, M = GULD.magpie, S = GULD.stone;
    let best = null, bs = -1e9;
    for (const t of this.trees) {
      const d = Math.hypot(t.x - B.x, t.z - B.z);
      if (d < M.near || d > M.far || B.used.includes(t)) continue;
      const score = Math.hypot(t.x - p.x, t.z - p.z) - Math.hypot(t.x - S.x, t.z - S.z) * 0.6;
      if (score > bs) { bs = score; best = t; }
    }
    if (!best) best = this.trees.filter((t) => !B.used.includes(t)).sort((a, b) => Math.hypot(a.x - B.x, a.z - B.z) - Math.hypot(b.x - B.x, b.z - B.z))[0] || this.trees[0];
    B.used.push(best); if (B.used.length > 3) B.used.shift();
    // a branch tip on the side it comes from, low enough to be seen
    const dx = B.x - best.x, dz = B.z - best.z, l = Math.hypot(dx, dz) || 1, s = best.s || 1;
    const to = { x: best.x + (dx / l) * 1.35 * s, y: (best.y ?? CURB_H) + 2.9 * s, z: best.z + (dz / l) * 1.35 * s };
    B.from = { x: B.x, y: B.y, z: B.z }; B.to = to; B.tree = best;
    B.dur = Math.max(1.0, Math.hypot(to.x - B.x, to.z - B.z) / M.speed); B.t = 0; B.state = 'fly';
    B.h = Math.atan2(to.x - B.x, to.z - B.z);
    B.flights++;
    g.emit('bun', { kind: 'magpie' });
  }

  magpieStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, B = this.magpie, M = GULD.magpie;
    B.t += dt;
    if (B.state === 'fly') {
      const k = Math.min(1, B.t / B.dur), e = k * k * (3 - 2 * k);
      B.x = B.from.x + (B.to.x - B.from.x) * e; B.z = B.from.z + (B.to.z - B.from.z) * e;
      B.y = B.from.y + (B.to.y - B.from.y) * e + Math.sin(k * Math.PI) * 2.2;
      if (k >= 1) { B.state = 'sit'; B.t = 0; B.h = Math.atan2(p.x - B.x, p.z - B.z) + 0.6; }
    } else if (B.state === 'sit') {
      const at = p.inCar ? p.car : p;
      if (Math.hypot(at.x - B.x, at.z - B.z) < M.scare && B.t > 0.6) {
        if (B.flights >= M.flights) this.dropBun();
        else { this.flyOn(); if (B.flights === 3) g.emit('toast', { text: 'Skatan flaxar tyngre nu. Bullen är av mässing!', long: false }); }
      }
    }
    const d = Math.hypot(p.x - B.x, p.z - B.z);
    m.setObjective('Följ skatan!', B.state === 'fly' ? 'Den flyger …' : d > 25 ? 'Den sitter i en gran – gå närmare' : `Den har flugit ${B.flights} gånger. Den börjar bli trött.`);
  }

  dropBun() {
    const g = this.game, m = this.mgr, B = this.magpie;
    const gx = B.tree ? B.tree.x + (B.x - B.tree.x) * 0.55 : B.x, gz = B.tree ? B.tree.z + (B.z - B.tree.z) * 0.55 : B.z;
    this.bunAt = { x: gx, y: g.world.groundHeight(gx, gz), z: gz, from: B.y, t: 0 };
    B.bun = false; B.state = 'away';
    // up and away over the treetops, out to sea
    B.from = { x: B.x, y: B.y, z: B.z }; B.to = { x: B.x + 40, y: B.y + 14, z: B.z - 50 }; B.dur = 6; B.t = 0; B.h = Math.atan2(40, -50);
    this.stage = 'pick';
    g.emit('bun', { kind: 'drop' });
    g.emit('toast', { text: 'Skatan släpper bullen! Den dunsar ner i mossan.', long: true });
    void m;
  }

  pickStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, A = this.bunAt, B = this.magpie;
    if (B && B.state === 'away') {
      B.t += dt; const k = Math.min(1, B.t / B.dur);
      B.x = B.from.x + (B.to.x - B.from.x) * k; B.z = B.from.z + (B.to.z - B.from.z) * k; B.y = B.from.y + (B.to.y - B.from.y) * k;
      if (k >= 1) B.state = 'gone';
    }
    if (A.t < 1) A.t = Math.min(1, A.t + dt * 1.8);
    const d = Math.hypot(p.x - A.x, p.z - A.z);
    m.setObjective('Ta den gyllene bullen', d < 20 ? (p.inCar ? 'Kliv ur – den ligger i mossan' : 'Den ligger i mossan under granen') : 'Under granen där skatan satt');
    if (p.state === 'foot' && !p.frozen && d < 1.4) this.prompt = 'TA';
  }

  takeBun() {
    const g = this.game, m = this.mgr, p = g.player, A = this.bunAt;
    this.stage = 'bunTalk'; this.carry = 'pokal'; this.bunAt = null;
    p.frozen = true; p.vx = p.vz = 0;
    g.emit('keys', { item: 'goldbun' });
    // you turn round with it, away from the spruce it fell under – and a fixed shot from out in the open, of your
    // front and the trophy (not from inside its branches)
    const T = this.magpie && this.magpie.tree, ax = T ? p.x - T.x : p.x - A.x, az = T ? p.z - T.z : p.z - A.z, al = Math.hypot(ax, az) || 1;
    p.h = Math.atan2(ax, az);
    g.camFocus = { x: p.x, y: p.y + 1.0, z: p.z, owner: 'guld', cam: { x: p.x + (ax / al) * 3.4 + (az / al) * 0.9, y: p.y + 2.0, z: p.z + (az / al) * 3.4 - (ax / al) * 0.9, fov: 55 } };
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: bunPages() }), this);
  }

  // ---------------------------------------------------------------- 5. the championship
  toFest() {
    const g = this.game, m = this.mgr;
    this.stage = 'fest';
    this.save(STEPS.indexOf('fest') + 1);
    if (this.magpie && this.magpie.state !== 'gone') this.magpie = null;
    m.setObjective('Bullmästerskapet', 'Torget, framför konditoriet');
    void g;
  }

  festStep() {
    const g = this.game, m = this.mgr, p = g.player, F = GULD.fest;
    if (!m.guldFest && (hidden(g, F.mark.x, F.mark.z) || m.t < 1.0) && !g.indoor) putUpFest(m, this.crushed);
    const at = p.inCar ? p.car : p, d = Math.hypot(at.x - F.mark.x, at.z - F.mark.z);
    m.setObjective('Bullmästerskapet', d < 30 ? (p.inCar ? 'Parkera och gå fram till domarbordet' : 'Ställ dig framför domarbordet') : 'Torget, framför konditoriet');
    if (m.guldFest && p.state === 'foot' && !p.frozen && d < F.mark.r) this.startFest();
  }

  startFest() {
    const g = this.game, m = this.mgr, p = g.player, F = GULD.fest, Fs = m.guldFest;
    this.stage = 'festTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.x = F.mark.x + 0.6; p.z = F.mark.z + 0.4; p.y = g.world.groundHeight(p.x, p.z); p.h = 0;
    if (Fs) { const Gu = Fs.gun; Gu.standH = Gu.h = Gu.body.h = Math.atan2(p.x - Gu.x, p.z - Gu.z); }
    g.emit('bun', { kind: 'fanfare' });
    g.camFocus = { x: -6, y: 0.9, z: 11.4, owner: 'guld', cam: { x: -6.4, y: 4.6, z: 2.2, fov: 58 } };
    m.later(0.8, () => g.emit('talk', { id: this.id, pages: festPages(this.crushed) }), this);
  }

  voteStep() {
    const g = this.game, m = this.mgr, p = g.player;
    const n = this.tasted.size;
    m.setObjective(n < 2 ? 'Smaka på båda bullarna' : 'Rösta!', n < 2 ? `${n} av 2 · Bengts till vänster, Dahlgrens till höger` : 'Ställ dig vid din favorit och tryck RÖSTA');
    if (p.state !== 'foot' || p.frozen) return;
    for (const S of GULD.fest.stands) {
      if (Math.hypot(p.x - S.taste.x, p.z - S.taste.z) < S.taste.r) {
        this.stand = S;
        this.prompt = !this.tasted.has(S.who) ? 'SMAKA' : n >= 2 ? 'RÖSTA' : null;
        return;
      }
    }
  }

  taste(S) {
    const g = this.game, p = g.player, Fs = this.mgr.guldFest;
    this.tasted.add(S.who);
    p.h = Math.atan2(S.x - p.x, S.z - p.z);
    g.emit('bun', { kind: 'taste' });
    const baker = Fs && (S.who === 'bengt' ? Fs.bengt : Fs.dahl);
    const text = S.who === 'bengt'
      ? 'Bengts bulle: luftig och söt, precis som den ska vara. En riktig söndagsbulle.'
      : this.bakedState === 'burnt' ? 'Dahlgrens bulle: lite bränd i kanten. Men mitten … mitten är god. Riktigt god.'
        : this.crushed ? 'Dahlgrens bulle: det smakar stött kardemumma. Det smakar … Arne.' : 'Dahlgrens bulle: kompakt och ärlig, med lite för mycket kardemumma från påsen.';
    g.emit('toast', { text, long: true });
    if (baker) g.emit('say', { who: baker, text: S.who === 'bengt' ? 'Nå? Nå?' : 'Säg inget. Jag ser på dig.' });
  }

  castVote(S) {
    const g = this.game, m = this.mgr, p = g.player, Fs = m.guldFest;
    this.vote = S.who; this.stage = 'finale';
    p.frozen = true; p.vx = p.vz = 0;
    g.emit('bun', { kind: 'vote' });
    const P = GULD.pay, golden = this.bakedState === 'golden';
    this.amount = P.base + (this.crushed ? P.crushed : 0) + (golden ? P.golden : 0) + Math.max(0, P.clean - P.perError * this.errors);
    const W = Fs && (S.who === 'bengt' ? Fs.bengt : Fs.dahl);
    if (Fs) { const Gu = Fs.gun; Gu.standH = Gu.h = Gu.body.h = W ? Math.atan2(W.x - Gu.x, W.z - Gu.z) : Gu.h; }
    g.camFocus = { x: -6, y: 0.9, z: 11.0, owner: 'guld', cam: { x: -6.4, y: 4.2, z: 3.4, fov: 58 } };
    m.later(0.9, () => g.emit('talk', { id: this.id, pages: finalePages(S.who, this.amount) }), this);
  }

  // ---------------------------------------------------------------- talks
  talkFx(fx) {
    if (fx === 'give') { this.carry = null; this.given = true; this.game.emit('bun', { kind: 'fanfare' }); }
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'guld') g.camFocus = null; };
    switch (this.stage) {
      case 'intro': free(); this.startBaking(); return;
      case 'taste': free(); this.toPhoto(); return;
      case 'photoTalk': free(); this.toGnome(); g.emit('toast', { text: 'Gå ut och kör till kolonilotterna på Norrholmen.', long: true }); return;
      case 'gnomeNote': free(); this.secret('gnome'); this.toStone(); return;
      case 'bunTalk': free(); this.secret('goldbun'); this.toFest();
        m.sms(WHO.gun, 'Lilla vän! Bengt har hört ALLTIHOP och kräver ett nytt bullmästerskap – här på torget, nu. Dahlgren ställer upp. Inga, Ingvar och Elsa är domare. Skynda dig hit med pokalen!', 2.5, this);
        return;
      case 'festTalk': free(); this.stage = 'vote';
        m.later(0.6, () => g.emit('hint', { id: 'guld-vote', touch: 'Gå fram till bagarnas bord och tryck SMAKA – sedan RÖSTA på din favorit.', keys: 'Gå fram till bagarnas bord och tryck E för att smaka – sedan rösta (E).' }), this);
        return;
      case 'finale': this.finish(); return;
    }
  }

  // (the secrets are found on the way, if you had not found them already)
  secret(id) { const s = this.mgr.secrets; if (s && !s.has(id)) this.mgr.later(1.2, () => s.find(id, 'quiet'), this); }   // (quiet: the story has told it already)

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done'; this.carry = null;
    g.stats.guld = { at: STEPS.length + 1, errors: this.errors, crushed: this.crushed, state: this.bakedState, vote: this.vote };
    g.stats.guldVote = this.vote; g.stats.guldCrushed = this.crushed;
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Den gyllene bullen', amount: this.amount });
    m.sms(WHO.gun, this.vote === 'dahl'
      ? 'Dahlgren har bett att få baka varje tisdag. Jag sa ja – om han diskar efteråt. Pokalen står på hyllan nu. Titta in när du vill, lilla vän!'
      : 'Bengt har ställt pokalen på hyllan själv och putsat den två gånger. Dahlgren tränar redan till nästa år. Titta in när du vill, lilla vän!', 30, null);
  }

  // ---------------------------------------------------------------- per step
  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null;
    const inside = ['intro', 'bake', 'knead', 'tray', 'oven', 'baking', 'taste', 'photo', 'photoTalk'].includes(this.stage);
    if (inside && this.stage !== 'intro' && !ind.inside && !ind.busy) { // walked out in the middle of the baking
      this.removeInside();
      m.quit(this, [WHO.gun, 'Vart tog du vägen, lilla vän? Dahlgren står och väntar med degen. Kom tillbaka in till konditoriet!']);
      return;
    }
    if ((this.hand || (this.tray && this.stage === 'oven')) && p.state === 'foot' && inside) p.body.pose = this.tray && this.stage === 'oven' ? 3 : 1;
    if (this.inKonditori) ind.noExit = this.stage === 'photo';   // (the confession first – then out to the gnome)
    if (this.carry && p.state === 'foot' && !inside) p.body.pose = 3;
    switch (this.stage) {
      case 'bake': this.bakeStep(); break;
      case 'knead': this.kneadStep(dt); break;
      case 'tray': case 'oven': this.trayStep(); break;
      case 'baking': this.bakingStep(dt); this.trayStep(); break;
      case 'photo': this.photoStep(); break;
      case 'gnome': this.gnomeStep(); break;
      case 'stone': this.stoneStep(dt); break;
      case 'magpie': this.magpieStep(dt); break;
      case 'pick': this.pickStep(dt); break;
      case 'fest': this.festStep(); break;
      case 'vote': this.voteStep(); break;
    }
  }

  interact() {
    const g = this.game, pr = this.prompt;
    if (!pr) return false;
    if (pr === 'GE') { this.give(); return true; }
    if (pr === 'STÖT') { this.poundOnce(); return true; }
    if (this.jar && pr === this.jar.label) { this.pickJar(this.jar); return true; }
    if (pr === 'PLÅTEN') { this.stage = 'oven'; g.emit('kitchen', { kind: 'out' }); return true; }
    if (pr === 'IN I UGNEN') { this.stage = 'baking'; this.inOven = true; g.player.h = -Math.PI / 2; g.emit('kitchen', { kind: 'in' }); return true; }
    if (pr === 'TA UT') {
      this.stage = 'oven'; this.inOven = false; g.player.h = -Math.PI / 2;
      g.emit('kitchen', { kind: 'out' });
      if (this.trayState === 'raw' && this.dahl) g.emit('say', { who: this.dahl, text: 'De är bleka! In igen med dem.' });
      return true;
    }
    if (pr === 'BJUD') { this.serve(); return true; }
    if (pr === 'TITTA') { this.lookAtPhoto(); return true; }
    if (pr === 'UNDERSÖK') { this.openGnome(); return true; }
    if (pr === 'TA') { this.takeBun(); return true; }
    if (pr === 'SMAKA' && this.stand) { this.taste(this.stand); return true; }
    if (pr === 'RÖSTA' && this.stand) { this.castVote(this.stand); return true; }
    return false;
  }

  // ---------------------------------------------------------------- map and view
  targets(T) {
    const g = this.game, ind = g.indoors;
    const item = (x, y, z) => T.push({ kind: 'item', x, y, z, gps: false });
    if (ind.inside && ind.where === 'konditori') {
      if (this.stage === 'bake') {
        const id = ORDER[this.want];
        const ok = this.hand === id || (id === 'kardemumma' && this.hand === 'stott');
        if (ok) item(KOND.table.x, KOND.table.y + 0.75, KOND.table.z - 0.2);
        else { const j = JAR[id]; item(j.item[0], j.item[1] + 0.6, j.item[2]); }
      }
      if (this.stage === 'tray') item(KOND.table.x, KOND.table.y + 0.7, KOND.table.z);
      if (this.stage === 'oven' && this.trayState === 'raw') item(KOND.slot.x + 0.9, KOND.slot.y + 0.9, KOND.slot.z);
      if (this.stage === 'oven' && this.trayState !== 'raw' && this.gun) item(this.gun.x, KOND.y + 2.1, this.gun.z);
      if (this.stage === 'baking' && this.trayState !== 'raw') item(KOND.slot.x + 0.9, KOND.slot.y + 0.9, KOND.slot.z);
      if (this.stage === 'photo') item(KOND.photoAt.x + 0.3, KOND.photoAt.y + 0.55, KOND.photoAt.z);
      return;
    }
    if (this.stage === 'gnome' && !g.indoor) T.push({ kind: 'zone', x: GULD.gnome.x, z: GULD.gnome.z, r: 1.0, gps: true });
    if (this.stage === 'stone') T.push({ kind: 'zone', x: GULD.stone.x, z: GULD.stone.z + 1.2, r: 1.2, gps: true });
    if (this.stage === 'magpie' && this.magpie) { const B = this.magpie; T.push({ kind: 'zone', x: B.x, z: B.z, r: 1.0, gps: true }); if (B.state === 'sit') item(B.x, B.y + 0.9, B.z); }
    if (this.stage === 'pick' && this.bunAt) { T.push({ kind: 'zone', x: this.bunAt.x, z: this.bunAt.z, r: 0.9, gps: true }); item(this.bunAt.x, this.bunAt.y + 0.9, this.bunAt.z); }
    if (this.stage === 'fest') T.push({ kind: 'zone', x: GULD.fest.mark.x, z: GULD.fest.mark.z, r: GULD.fest.mark.r, gps: true });
    if (this.stage === 'vote') for (const S of GULD.fest.stands) if (!this.tasted.has(S.who) || this.tasted.size >= 2) item(S.x, CURB_H + 1.6, S.z);
  }

  // the minimap inside: the counter, the mortar, the oven
  mapDots() {
    if (!['bake', 'tray', 'oven', 'baking'].includes(this.stage)) return null;
    return [KOND.give, KOND.mortar, KOND.oven, { x: JARS[2].x, z: JARS[2].z }].map((S) => ({ x: S.x, z: S.z, c: '#ffcf33' }));
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    p.frozen = false;
    g.indoors.noExit = false;
    if (g.camFocus && g.camFocus.owner === 'guld') g.camFocus = null;
    if (!g.indoors.inside) this.removeInside();
    else if (g.indoors.where === 'konditori') {
      const gone = [this.gun, this.dahl];
      const check = () => { if (g.indoors.inside && g.indoors.where === 'konditori') { m.later(1, check); return; } for (const q of gone) removePed(g, q); };
      m.later(1, check);
    }
  }
}
