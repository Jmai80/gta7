// Main quest, part 16: "Birgers kaffe" (v1.16). Birger has been home since part 10 and has promised coffee – now
// it is served, in his front garden, and he wants to hear everything. Polis-Pia is there too, and so is Jonte:
// released on a promise to give back the last five stolen bikes.
//   1. Coffee in Birger's garden: you tell the story (the bun party, the bikes in Birger's bed, Ronny's van).
//      Jonte's notebook had a second page: five more bikes, marked "MORMOR".
//   2. Söderholmen, the houses by the chapel: Jonte's grandmother, Mormor Signe, in the last house. She baked at
//      Bullbilen's bakery for twenty-eight years, and she thought Jonte was mending bikes for the church.
//   3. Her woodshed (vedbod.js, inside): lift the tarpaulins (LYFT) – five bikes, and Signe's things.
//   4. The bikes home, in any order, ridden: Elsa (the green house), kantor Folke (the white house – the organist
//      we never met, "ill" since Kyrkkaffet), Tivoli-Rut (the tivoli gate), Nova (behind Macken) and Pia's own
//      police bike (Birger's gate).
//   5. The skateboard on the football pitch is Jonte's (the secret "Skateboarden"): ride it to Nova – his sorry.
//   6. Tant Gun's gate: Jonte says sorry to Gun, with Birger and Pia there. Then coffee, for real.
// A checkpoint is kept in stats.kaffe ({ at: 1 } to Signe, { at: 2, left } the bikes, { at: 3 } the skateboard,
// { at: 4 } Gun's gate).
import { WHO, BIRGER, GUN_GATE, NOVA_DOOR, CURB_H } from './config.js';
import { SHED, SHED_DOOR, TARPS } from './vedbod.js';
import { SECRETS } from './secrets.js';
import { STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed, PIA_LOOK } from './hideout.js';
import { BIRGER_LOOK } from './homecoming.js';
import { SANDER_LOOK } from './fest.js';
import { NOVA_LOOK } from './concert.js';
import { LOOKS } from './tivolijobs.js';
import { ELSA_GLASSES } from './skatbo.js';
import { hidden, stand } from './skattjakt.js';
import { fmt } from './rng.js';

export const SIGNE_LOOK = { shirt: 0xb5466a, pants: 0x3d3550, skin: 0xf2d0b5, hair: 0xe8e6e0, height: 0.9, bulk: 1.12, style: ST.bun | ST.glasses | ST.apron, accent: 0xf2efe6 };
export const FOLKE_LOOK = { shirt: 0x6b6f3a, pants: 0x2b2e35, skin: 0xe9c3a6, hair: 0x8a8a86, height: 1.08, bulk: 0.88, style: ST.glasses | ST.jacket, accent: 0x3a3c41 };
const SKATE = SECRETS.find((s) => s.id === 'skate');

export const KAFFE = {
  // the coffee table in Birger's front garden (render: kaffeview.js), and who sits round it
  mark: { x: -62.4, z: -50.4, r: 1.4 },
  table: { x: -59.5, z: -51.5 },
  birger: { x: -59.5, z: -52.55, h: 0 },
  pia: { x: -58.35, z: -51.5, h: -Math.PI / 2 },
  jonte: { x: -60.65, z: -51.5, h: Math.PI / 2 },
  you: { x: -59.5, z: -50.35, h: Math.PI },
  // Signe's house, the last of the houses by the chapel (the pink one), and her garden
  signe: { x: -65.6, z: 262.8, h: Math.PI / 2 },
  signeJonte: { x: -65.4, z: 260.1, h: Math.PI / 2 },
  gate: { x: -62.6, z: 261.5, r: 1.9 },
  // the five bikes, in a row behind the shed once they are out
  yard: { x: -72.6, z: 271.6, step: 1.9, h: Math.PI / 2 },
  // Nova behind Macken (the skateboard), and Gun's gate (the last scene)
  nova: { x: 81.6, z: 30.8, h: 0 },
  novaZone: { x: 80.0, z: 31.9, r: 2.6 },
  fin: { mark: { x: GUN_GATE.x, z: GUN_GATE.z + 0.4, r: 1.6 }, gun: { x: -97.5, z: -48.55, h: 0 }, birger: { x: -99.7, z: -47.1, h: Math.PI / 2 + 0.3 }, pia: { x: -95.3, z: -45.5, h: -Math.PI * 0.75 }, jonte: { x: -97.6, z: -47.35, h: Math.PI } },
  pay: { base: 5000, perBike: 100, skate: 300 },
};
export const KAFFE_MAX = KAFFE.pay.base + 5 * KAFFE.pay.perBike + KAFFE.pay.skate;
const STEPS = ['south', 'deliver', 'skate', 'finale'];

// the five bikes and their owners: the colour (vehicle.js), who waits where, where you ride it in
export const BIKES = [
  { id: 'elsa', paint: 'cityGreen', who: 'Elsa', letter: 'E', color: '#5f9a6a', look: ELSA_GLASSES, npc: 'elsa', name: 'Elsas', where: 'Det gröna huset vid kapellet',
    owner: { x: -65.6, z: 248.7, h: Math.PI / 2 }, zone: { x: -62.4, z: 247.5, r: 2.6 } },
  { id: 'folke', paint: 'cityBlue', who: 'Kantor Folke', letter: 'F', color: '#3d6a9a', look: FOLKE_LOOK, npc: 'folke', name: 'Kantor Folkes', where: 'Det vita huset vid kapellet',
    owner: { x: -65.6, z: 232.6, h: Math.PI / 2 }, zone: { x: -62.4, z: 231.5, r: 2.6 } },
  { id: 'rut', paint: 'cityLilac', who: 'Tivoli-Rut', letter: 'R', color: '#e85d9a', look: LOOKS.rut, npc: 'rut', name: 'Ruts', where: 'Tivolits valv',
    owner: { x: 14.6, z: 204.8, h: Math.PI }, zone: { x: 11.0, z: 203.6, r: 2.6 } },
  { id: 'nova', paint: 'cityMint', who: 'Nova', letter: 'N', color: '#b36cff', look: NOVA_LOOK, npc: 'nova', name: 'Novas', where: 'Porten bakom Macken',
    owner: { x: 81.6, z: 30.8, h: 0 }, zone: { x: 80.0, z: 31.9, r: 2.6 } },
  { id: 'pia', paint: 'cityNavy', who: 'Polis-Pia', letter: 'P', color: '#2c62a8', look: PIA_LOOK, npc: 'pia', name: 'Pias', where: 'Birgers grind på Storgatan',
    owner: { x: BIRGER.pia.x, z: BIRGER.pia.z, h: BIRGER.pia.h }, zone: { x: BIRGER.gate.x, z: BIRGER.gate.z, r: 2.6 } },
];
const BIKE = Object.fromEntries(BIKES.map((b) => [b.id, b]));

const BIRGER_T = { who: 'Birger', letter: 'B', color: '#f08a3a' };
const PIA = { who: 'Polis-Pia', letter: 'P', color: '#2c62a8' };
const JONTE = { who: 'Jonte', letter: 'J', color: '#e5b923' };
const SIGNE = { who: 'Mormor Signe', letter: 'S', color: '#b5466a' };
const GUN_T = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const NOVA_T = { who: 'Nova', letter: 'N', color: '#b36cff' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };

export function introPages() {
  return [
    { ...BIRGER_T, text: 'Där är du! Sätt dig, sätt dig. Kaffe? Jag har bakat sockerkaka. Den är bränd i kanten, men det är kärleken som räknas.' },
    { ...BIRGER_T, text: 'Nu vill jag höra ALLT. Jag var borta i fem månader och kom hem till ett hus fullt av cyklar och en nalle i min säng.' },
    { ...YOU, text: 'Det började på Bullfesten. Jonte snodde Arnes cykel med alla bullarna, och jag jagade honom genom halva stan.' },
    { ...JONTE, text: 'Du tog mig i luvan. Det gjorde ont i stoltheten.' },
    { ...YOU, text: 'Sedan letade jag i ditt hus, Birger. Elva cyklar. Sadlar i badkaret. Ronny med skåpbilen.' },
    { ...BIRGER_T, text: 'I mitt badkar! Jag har badat i det i fyrtio år. Det kommer aldrig att bli sig likt.' },
    { ...PIA, text: 'Jonte är släppt mot ett löfte. Det fanns en sida till i hans anteckningsbok – fem cyklar till, under rubriken ”MORMOR”.' },
    { ...JONTE, text: 'De står hos mormor på Söderholmen. I vedboden. Hon tror att jag lagar cyklar åt kyrkan.' },
    { ...PIA, text: 'Ni hämtar dem tillsammans, och de ska hem till sina ägare i dag. Jonte cyklar före. Jag har ögonen på honom.' },
    { ...BIRGER_T, text: 'Och när allt är klart dricker vi kaffe igen. Hos Gun. Jonte har något att säga till henne, tror jag.' },
    { ...JONTE, text: 'Mormor bor i det rosa huset längst bort, bland husen vid kapellet. Jag åker i förväg.', last: 'TILL SÖDERHOLMEN' },
  ];
}
export function signePages() {
  return [
    { ...SIGNE, text: 'Jaså, det är du som har jagat min Jonte genom hela stan. Kom in genom grinden, kom.' },
    { ...SIGNE, text: '”Cyklar till kyrkan”, sa han. Jag har bjudit honom på kanelbullar varje kväll i en månad. Med pärlsocker!' },
    { ...JONTE, text: 'Förlåt, mormor.' },
    { ...SIGNE, text: 'Förlåt säger man till dem man har tagit ifrån. Inte till mig. Vedboden står bakom huset, olåst. Jag kan ju inte bära ved längre ändå.' },
    { ...SIGNE, text: 'Jag bakade på Bullbilen i tjugoåtta år, vet du, innan Dahlgren tog över och började med fabriksbullar. Då orkade jag bära ugnsplåtar i stället för ved.' },
    { ...JONTE, text: 'De står under presenningarna. Fem stycken. Jag lovar.', last: 'TILL VEDBODEN' },
  ];
}
export function shedPages() {
  return [
    { ...YOU, text: 'Fem cyklar, i fem färger, och en mormors alla saker. Ingen kyrka har någonsin beställt en lilafärgad damcykel.' },
    { ...JONTE, text: 'Jag rullar ut dem på gården. Du cyklar hem dem – en i taget. Ägarna väntar. Pia har ringt dem.', last: 'UT MED DEM' },
  ];
}
export function ownerPages(id) {
  const B = BIKE[id], T = { who: B.who, letter: B.letter, color: B.color };
  switch (id) {
    case 'elsa': return [
      { ...T, text: 'Min gröna cykel! Jag har gått till fyren varje dag sedan i somras. Till fots. Över två broar.' },
      { ...T, text: 'Ingvar säger att det är bra för hälsan. Ingvar har en båt.', last: 'VARSÅGOD' },
    ];
    case 'folke': return [
      { ...T, text: 'Min cykel! Jag är kantor Folke – vi har aldrig träffats, men du har spelat på min orgel.' },
      { ...YOU, text: 'Inga sa att du hade feber.' },
      { ...T, text: 'Febern gick över på två dagar. Men cykeln var borta, och kapellet ligger ju hela … hundra meter bort. Så jag har övat på pianot hemma i stället.' },
      { ...T, text: 'Jag övar inför Sjubydagen. Jag ska spela utomhus! Om någon kan bära ut orgeln. Det kan ingen.', last: 'LYCKA TILL, FOLKE' },
    ];
    case 'rut': return [
      { ...T, text: 'Min cykel! Jag har åkt runt på tivolit på en ponny från karusellen. Den rör sig inte. Det tar tid.' },
      { ...T, text: 'Hälsa Jonte att han får åka Måsen gratis – om han håller i sig hela vägen. Ingen klarar det.', last: 'VARSÅGOD' },
    ];
    case 'nova': return [
      { ...NOVA_T, text: 'MIN CYKEL!!! var var den?? jag trodde mamma hade sålt den på blocket' },
      { ...YOU, text: 'Jonte hade den. Han säger förlåt.' },
      { ...NOVA_T, text: 'JONTE?? säg åt honom att han är skyldig mig. typ jättemycket.', last: 'JAG SÄGER DET' },
    ];
    case 'pia': return [
      { ...PIA, text: 'Min tjänstecykel. Han tog den från polisstationen. Från POLISSTATIONEN. Medan jag var inne och hämtade kaffe.' },
      { ...PIA, text: 'Den här skriver jag inte i rapporten. Ingen behöver veta. Ingen.', last: 'MINA LÄPPAR ÄR FÖRSEGLADE' },
    ];
  }
  return [];
}
export function skatePages() {
  return [
    { ...JONTE, text: 'En sak till. Skateboarden på fotbollsplanen – den är min. Jag tappade den när Pia jagade mig i våras.' },
    { ...JONTE, text: 'Kan du åka den till Nova? Jag har ingenting annat att ge henne. Säg att den är förlåt.', last: 'JAG ÅKER' },
  ];
}
export function novaPages() {
  return [
    { ...NOVA_T, text: 'vänta. är det där JONTES skateboard??' },
    { ...YOU, text: 'Den är din. Han säger att den är förlåt.' },
    { ...NOVA_T, text: '…' },
    { ...NOVA_T, text: 'okej. förlåten. TYP förlåten. du får låna den när du vill. den står här vid porten.', last: 'TACK, NOVA' },
  ];
}
export function finalePages(amount) {
  return [
    { ...BIRGER_T, text: 'Gun! Här kommer vi. Och vi har med oss någon.' },
    { ...JONTE, text: 'Tant Gun … det var jag som tog Arnes cykel på Bullfesten. Med alla bullarna.' },
    { ...JONTE, text: 'Förlåt. Jag visste inte att den var Arnes. Jag visste inte att någon kunde sakna en cykel så mycket.' },
    { ...GUN_T, text: '…' },
    { ...GUN_T, text: 'Arne cyklade på den varje morgon i trettio år, lilla Jonte. Med bullar till hela Sjuby.' },
    { ...GUN_T, text: 'Kan du cykla?' },
    { ...JONTE, text: 'Bättre än någon.' },
    { ...GUN_T, text: 'Då börjar du köra ut bullar åt mig på lördagar. Med Arnes cykel. Och du lämnar tillbaka den varje gång.' },
    { ...PIA, text: 'Det låter som ett rimligt straff.' },
    { ...BIRGER_T, text: `Nu blir det kaffe på riktigt! Och du – här är ${fmt(amount)} kronor från oss alla. Jag hittade dem i en strumpa i min garderob. Jag tror inte att de är Jontes.`, last: 'SKÅL!' },
  ];
}

export function kaffeSave(g) { return g.stats.kaffe && typeof g.stats.kaffe === 'object' ? g.stats.kaffe : null; }

// Birger, Pia and Jonte at the coffee table until you come (put there out of sight); the finale's people at Gun's
// gate; Gun herself held by her gate for the last scene; people left standing go home out of sight
export function kaffeWorld(mgr) {
  const g = mgr.game;
  const open = mgr.isOpen('kaffe'), job = mgr.active && mgr.active.id === 'kaffe' ? mgr.active : null;
  const c = mgr.jobs.find((q) => q.id === 'kaffe');
  const S = kaffeSave(g);
  if (c) c.startOnAccept = !!(open && S && S.at > 0);
  const atTable = open && !(S && S.at > 0) && (!mgr.active || (job && job.stage === 'intro'));
  const K = KAFFE, F = mgr.kaffeFolk;
  if (atTable && !g.indoor && (!F || !F.every((q) => g.peds.list.includes(q))) && hidden(g, K.table.x, K.table.z)) {
    if (F) for (const q of F) removePed(g, q);
    mgr.kaffeFolk = [spawnPed(g, { ...BIRGER_LOOK }, K.birger.x, K.birger.z, K.birger.h, 'birger'), spawnPed(g, { ...PIA_LOOK }, K.pia.x, K.pia.z, K.pia.h, 'pia'), spawnPed(g, { ...SANDER_LOOK }, K.jonte.x, K.jonte.z, K.jonte.h, 'sander')];
  }
  if (!atTable && F && !job) { (mgr.kaffeLeft = mgr.kaffeLeft || []).push(...F); mgr.kaffeFolk = null; }
  mgr.kaffeTable = !!(mgr.kaffeFolk || (job && job.stage === 'intro'));
  if (mgr.kaffeLeft && mgr.kaffeLeft.length) mgr.kaffeLeft = mgr.kaffeLeft.filter((q) => { if (!g.peds.list.includes(q)) return false; if (g.indoor || hidden(g, q.x, q.z)) { removePed(g, q); return false; } return true; });
  // Gun at her gate for the last scene: pinned there (like the bun party), let go when nobody looks
  const flag = mgr.flag, gun = flag && flag.gun;
  const want = !!(job && (job.stage === 'finale' || job.stage === 'finaleTalk'));
  if (gun && want && !mgr.kaffeGunPin && !flag.pinned && hidden(g, K.fin.gun.x, K.fin.gun.z) && hidden(g, gun.x, gun.z)) {
    mgr.kaffeGunPin = true; flag.pinned = true; flag.hush = true; gun.wave = false;
    stand(g, gun, K.fin.gun.x, K.fin.gun.z, K.fin.gun.h);
  }
  if (gun && !want && mgr.kaffeGunPin && hidden(g, gun.x, gun.z)) { mgr.kaffeGunPin = false; flag.pinned = false; flag.hush = false; }
}

export class CoffeeJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'kaffe';
    // intro → south → signeTalk → shed → search → shedTalk → out → deliver ⇄ ownerTalk → skateTalk → skate →
    // novaTalk → finale → finaleTalk → done
    this.stage = 'intro';
    this.prompt = null;
    this.titleCard = true;
    this.lifted = new Set();
    this.left = BIKES.map((b) => b.id);
    this.bikes = {}; this.owners = {};
    this.signe = null; this.jonte = null; this.nova = null; this.fin = null;
    this.skated = false;
  }

  save(at) {
    const g = this.game;
    g.stats.kaffe = { at, left: [...this.left] };
    g.emit('progress', {});
  }

  start() {
    const g = this.game, m = this.mgr, p = g.player, K = KAFFE;
    const S = kaffeSave(g);
    if (S && S.at > 0 && S.at <= STEPS.length) { this.resume(S); return; }
    // at the coffee table: you sit down with them
    let F = m.kaffeFolk;
    if (!F || !F.every((q) => g.peds.list.includes(q))) {
      if (F) for (const q of F) removePed(g, q);
      F = m.kaffeFolk = [spawnPed(g, { ...BIRGER_LOOK }, K.birger.x, K.birger.z, K.birger.h, 'birger'), spawnPed(g, { ...PIA_LOOK }, K.pia.x, K.pia.z, K.pia.h, 'pia'), spawnPed(g, { ...SANDER_LOOK }, K.jonte.x, K.jonte.z, K.jonte.h, 'sander')];
    }
    this.table = F; m.kaffeFolk = null;
    if (p.inCar) p.exitCar();
    p.frozen = true; p.vx = p.vz = 0;
    p.x = K.you.x; p.z = K.you.z; p.y = g.world.groundHeight(p.x, p.z); p.h = K.you.h;
    g.camFocus = { x: K.table.x, y: 0.9, z: K.table.z - 0.2, owner: 'kaffe', cam: { x: K.table.x + 3.2, y: CURB_H + 3.0, z: K.table.z + 4.6, fov: 56 } };
    g.emit('toast', { text: 'Birgers trädgård. Det doftar kaffe – och lite bränt.' });
    m.later(1.0, () => g.emit('talk', { id: this.id, pages: introPages() }), this);
  }

  resume(S) {
    const g = this.game, step = STEPS[S.at - 1];
    const say = (text) => g.emit('toast', { text: `Birgers kaffe fortsätter: ${text}`, long: true });
    if (step === 'south') { this.toSouth(); say('till Mormor Signe bland husen vid kapellet på Söderholmen.'); }
    else if (step === 'deliver') {
      this.left = Array.isArray(S.left) ? S.left.filter((id) => BIKE[id]) : BIKES.map((b) => b.id);
      this.lifted = new Set(TARPS.map((T) => T.id));
      if (!this.left.length) { this.toSkate(true); say('Jontes skateboard till Nova.'); return; }
      this.stage = 'deliver'; this.putOutBikes();
      say(`${this.left.length === 1 ? 'den sista cykeln' : `de ${this.left.length} cyklarna`} hem till sina ägare.`);
    } else if (step === 'skate') { this.left = []; this.toSkate(true); say('Jontes skateboard till Nova bakom Macken.'); }
    else { this.left = []; this.skated = true; this.toFinale(); say('till tant Guns grind.'); }
  }

  // ---------------------------------------------------------------- 2. Signe
  toSouth() {
    this.stage = 'south';
    this.save(STEPS.indexOf('south') + 1);
  }

  southStep() {
    const g = this.game, m = this.mgr, p = g.player, K = KAFFE;
    // Signe and Jonte in her garden (put there out of sight)
    if (!this.signe || !g.peds.list.includes(this.signe)) { if (hidden(g, K.signe.x, K.signe.z) || m.t < 1.0) this.signe = spawnPed(g, { ...SIGNE_LOOK }, K.signe.x, K.signe.z, K.signe.h, 'signe'); }
    if (!this.jonte || !g.peds.list.includes(this.jonte)) { if (hidden(g, K.signeJonte.x, K.signeJonte.z) || m.t < 1.0) this.jonte = spawnPed(g, { ...SANDER_LOOK }, K.signeJonte.x, K.signeJonte.z, K.signeJonte.h, 'sander'); }
    const at = p.inCar ? p.car : p, d = Math.hypot(at.x - K.gate.x, at.z - K.gate.z);
    m.setObjective('Mormor Signe', d < 40 ? (p.inCar ? 'Kliv ur vid hennes grind' : 'Det rosa huset längst bort') : p.z > 180 ? 'Husen vid kapellet' : 'Över södra bron till Söderholmen');
    if (this.signe && p.state === 'foot' && !p.frozen && d < K.gate.r) this.meetSigne();
  }

  meetSigne() {
    const g = this.game, m = this.mgr, p = g.player, K = KAFFE, Sg = this.signe;
    this.stage = 'signeTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(Sg.x - p.x, Sg.z - p.z);
    Sg.standH = Sg.h = Sg.body.h = Math.atan2(p.x - Sg.x, p.z - Sg.z);
    g.camFocus = { x: (p.x + Sg.x) / 2, y: p.y + 0.6, z: (p.z + Sg.z) / 2 - 0.6, owner: 'kaffe', cam: { x: K.gate.x + 4.2, y: CURB_H + 2.8, z: K.gate.z - 4.0, fov: 54 } };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: signePages() }), this);
  }

  // ---------------------------------------------------------------- 3. the woodshed
  shedStep() {
    const g = this.game, m = this.mgr, p = g.player, d = Math.hypot(p.x - SHED_DOOR.x, p.z - SHED_DOOR.z);
    m.setObjective('Vedboden', 'Den röda boden bakom Signes hus');
    if (p.state === 'foot' && !p.frozen && !g.indoors.busy && d < SHED_DOOR.r) this.prompt = 'GÅ IN';
  }

  enterShed() {
    const g = this.game, m = this.mgr;
    this.stage = 'search';
    g.indoors.enter(() => {
      g.emit('toast', { text: 'Signes vedbod. Ved, verktyg – och sju presenningar.' });
      m.later(1.2, () => g.emit('hint', { id: 'kaffe-lyft', touch: 'Gå fram till presenningarna och tryck LYFT. Fem cyklar ska hittas.', keys: 'Gå fram till presenningarna och tryck E för att lyfta. Fem cyklar ska hittas.' }), this);
    }, 'shed');
  }

  searchStep() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    const n = BIKES.length - TARPS.filter((T) => T.bike && !this.lifted.has(T.id)).length;
    m.setObjective('Lyft presenningarna', `${n} av 5 cyklar hittade`);
    ind.noExit = n < 5;
    if (!ind.inside || p.state !== 'foot' || p.frozen) return;
    for (const T of TARPS) if (!this.lifted.has(T.id) && Math.hypot(p.x - T.x, p.z - T.z) < T.r) { this.prompt = 'LYFT'; this.tarp = T; return; }
    if (n >= 5 && !ind.busy && Math.hypot(p.x - SHED.door.x, p.z - SHED.door.z) > 1.4 && !this.toldOut) { this.toldOut = true; this.stage = 'shedTalk'; this.shedTalk(); }
  }

  lift(T) {
    const g = this.game, p = g.player;
    this.lifted.add(T.id);
    p.h = Math.atan2(T.tx - p.x, T.tz - p.z);
    g.emit('tarp', { bike: !!T.bike });
    if (T.bike) { const B = BIKE[T.bike]; g.emit('toast', { text: `En cykel! ${B.name} – det sitter en namnlapp på styret.` }); }
    else g.emit('toast', { text: T.text, long: true });
  }

  shedTalk() {
    const g = this.game, m = this.mgr, p = g.player;
    p.frozen = true; p.vx = p.vz = 0;
    g.camFocus = { ...SHED.cam, owner: 'kaffe' };
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: shedPages() }), this);
  }

  // ---------------------------------------------------------------- 4. the bikes home
  putOutBikes() {
    const g = this.game, Y = KAFFE.yard;
    BIKES.forEach((B, i) => {
      if (!this.left.includes(B.id)) return;
      const b = this.bikes[B.id];
      if (b && !b.removed) return;
      const v = this.bikes[B.id] = g.spawnCityBike(B.paint, Y.x + i * Y.step, Y.z, Y.h);
      if (v) v.locked = false;
    });
  }

  // the owners wait outside (put there out of sight – or all at once while you are still inside the shed)
  spawnOwners(force) {
    const g = this.game;
    for (const id of this.left) {
      const B = BIKE[id], q = this.owners[id];
      if ((!q || !g.peds.list.includes(q)) && (force || hidden(g, B.owner.x, B.owner.z))) this.owners[id] = spawnPed(g, { ...B.look }, B.owner.x, B.owner.z, B.owner.h, B.npc);
    }
  }

  riding() {
    const p = this.game.player;
    if (!p.inCar || p.car.type !== 'citybike') return null;
    return this.left.find((id) => this.bikes[id] === p.car) || null;
  }

  deliverStep() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    if (ind.inside) { m.setObjective('Ut med cyklarna', 'Gå ut ur vedboden'); return; }
    ind.noExit = false;
    if (this.jonte && this.stage === 'deliver' && hidden(g, this.jonte.x, this.jonte.z)) { removePed(g, this.jonte); this.jonte = null; }
    if (this.signe && hidden(g, this.signe.x, this.signe.z)) { removePed(g, this.signe); this.signe = null; }
    for (const id of this.left) { const b = this.bikes[id]; if (!b || b.removed) { if (hidden(g, KAFFE.yard.x, KAFFE.yard.z)) this.putOutBikes(); break; } }
    this.spawnOwners(m.t < 1.0);
    const id = this.riding(), n = this.left.length;
    if (id) {
      const B = BIKE[id], bike = this.bikes[id];
      if (Math.hypot(bike.x - B.zone.x, bike.z - B.zone.z) < B.zone.r && bike.speed < 3.5 && this.owners[id]) { this.deliver(id); return; }
      m.setObjective(`Cykla hem ${B.name} cykel`, `${B.where} · ${n} av 5 kvar`);
      return;
    }
    m.setObjective('Hämta en cykel', `${n} av 5 kvar · bakom Signes vedbod`);
  }

  deliver(id) {
    const g = this.game, m = this.mgr, p = g.player, bike = this.bikes[id], o = this.owners[id];
    this.stage = 'ownerTalk'; this.cur = id;
    bike.vx = bike.vz = bike.w = 0;
    p.exitCar();
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(o.x - p.x, o.z - p.z);
    o.standH = o.h = o.body.h = Math.atan2(p.x - o.x, p.z - o.z);
    g.camFocus = { x: (p.x + o.x) / 2, y: p.y + 0.5, z: (p.z + o.z) / 2, yaw: p.h - 0.6, owner: 'kaffe', near: true, dist: 4.4, height: 2.1 };
    g.emit('bun', { kind: 'give' });
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: ownerPages(id) }), this);
  }

  delivered() {
    const g = this.game, m = this.mgr, id = this.cur, o = this.owners[id], bike = this.bikes[id];
    if (bike && !bike.removed && o) { bike.x = o.x + Math.sin(o.h + Math.PI / 2) * 1.3; bike.z = o.z + Math.cos(o.h + Math.PI / 2) * 1.3; bike.h = o.h; bike.y = g.world.groundHeight(bike.x, bike.z); bike.locked = true; }
    this.left = this.left.filter((k) => k !== id);
    if (o && id === 'nova') { this.nova = o; delete this.owners[id]; }        // (she waits for the skateboard too)
    else if (o) { (m.kaffeLeft = m.kaffeLeft || []).push(o); delete this.owners[id]; }
    (m.kaffeBikes = m.kaffeBikes || []).push(bike);
    g.emit('toast', { text: `${BIKE[id].name} cykel är hemma. ${this.left.length ? `${this.left.length} kvar.` : 'Alla fem!'}` });
    if (this.left.length) { this.stage = 'deliver'; this.save(STEPS.indexOf('deliver') + 1); return; }
    this.toSkate(false);
  }

  // ---------------------------------------------------------------- 5. the skateboard
  toSkate(quiet) {
    const g = this.game, m = this.mgr;
    this.stage = 'skate';
    this.save(STEPS.indexOf('skate') + 1);
    if (!quiet) m.sms(WHO.jonte, 'Alla fem hemma?? Pia säger att du är snabbare än jag. En sak till: skateboarden på fotbollsplanen är min. Kan du åka den till Nova bakom Macken? Säg att den är förlåt. /J', 1.5, this);
    void g;
  }

  skateStep() {
    const g = this.game, m = this.mgr, p = g.player, K = KAFFE;
    if (!this.nova || !g.peds.list.includes(this.nova)) { if (hidden(g, K.nova.x, K.nova.z) || m.t < 1.0) this.nova = spawnPed(g, { ...NOVA_LOOK }, K.nova.x, K.nova.z, K.nova.h, 'nova'); }
    const sk = g.skate, onSkate = p.inCar && p.car.spec.skate;
    if (onSkate) {
      const d = Math.hypot(p.car.x - K.novaZone.x, p.car.z - K.novaZone.z);
      m.setObjective('Åk skateboarden till Nova', d < 30 ? 'Porten bakom Macken' : 'Skolgatan, bakom Macken');
      if (d < K.novaZone.r && p.car.speed < 3.5 && this.nova) this.giveSkate();
      return;
    }
    m.setObjective('Jontes skateboard', sk && !sk.removed ? 'Fotbollsplanen – kliv på den' : 'Fotbollsplanen');
  }

  giveSkate() {
    const g = this.game, m = this.mgr, p = g.player, q = this.nova, sk = p.car;
    this.stage = 'novaTalk'; this.skated = true;
    sk.vx = sk.vz = sk.w = 0;
    p.exitCar();
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(q.x - p.x, q.z - p.z);
    q.standH = q.h = q.body.h = Math.atan2(p.x - q.x, p.z - q.z);
    g.stats.skateNova = true;
    const S = m.secrets; if (S && !S.has('skate')) S.find('skate', 'quiet');
    g.camFocus = { x: (p.x + q.x) / 2, y: p.y + 0.4, z: (p.z + q.z) / 2, yaw: p.h - 0.6, owner: 'kaffe', near: true, dist: 4.2, height: 2.0 };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: novaPages() }), this);
  }

  // ---------------------------------------------------------------- 6. Gun's gate
  toFinale() {
    this.stage = 'finale';
    this.save(STEPS.indexOf('finale') + 1);
  }

  finaleStep() {
    const g = this.game, m = this.mgr, p = g.player, F = KAFFE.fin;
    if (!this.fin && (hidden(g, F.mark.x, F.mark.z) || m.t < 1.0) && !g.indoor) {
      this.fin = { birger: spawnPed(g, { ...BIRGER_LOOK }, F.birger.x, F.birger.z, F.birger.h, 'birger'), pia: spawnPed(g, { ...PIA_LOOK }, F.pia.x, F.pia.z, F.pia.h, 'pia'), jonte: spawnPed(g, { ...SANDER_LOOK }, F.jonte.x, F.jonte.z, F.jonte.h, 'sander') };
    }
    const at = p.inCar ? p.car : p, d = Math.hypot(at.x - F.mark.x, at.z - F.mark.z);
    m.setObjective('Tant Guns grind', d < 30 ? (p.inCar ? 'Kliv ur vid grinden' : 'Birger, Pia och Jonte väntar') : 'Storgatan');
    const gun = m.flag && m.flag.gun, gunHere = m.kaffeGunPin || !gun || Math.hypot(gun.x - F.gun.x, gun.z - F.gun.z) < 6;
    if (this.fin && gunHere && p.state === 'foot' && !p.frozen && d < F.mark.r) this.startFinale();
  }

  startFinale() {
    const g = this.game, m = this.mgr, p = g.player, F = KAFFE.fin, gun = m.flag.gun;
    this.stage = 'finaleTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.x = F.mark.x + 0.9; p.z = F.mark.z + 0.25; p.y = g.world.groundHeight(p.x, p.z); p.h = -Math.PI * 0.8;
    if (gun) { gun.standH = gun.h = gun.body.h = Math.atan2(p.x - gun.x, p.z - gun.z); }
    const P = KAFFE.pay;
    this.amount = P.base + BIKES.length * P.perBike + (this.skated ? P.skate : 0);
    g.camFocus = { x: F.mark.x - 0.4, y: 1.0, z: F.mark.z - 1.3, owner: 'kaffe', cam: { x: F.mark.x + 7.0, y: CURB_H + 2.6, z: F.mark.z + 1.4, fov: 52 } };
    m.later(0.8, () => g.emit('talk', { id: this.id, pages: finalePages(this.amount) }), this);
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    g.stats.kaffe = { at: STEPS.length + 1 };
    g.stats.kaffeBikes = BIKES.length;
    if (this.fin) { (m.kaffeLeft = m.kaffeLeft || []).push(...Object.values(this.fin)); this.fin = null; }
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Birgers kaffe', amount: this.amount });
    m.sms(WHO.signe, 'Jonte har ätit middag hos mig och diskat efteråt, utan att jag bad om det. Hälsa Gun att jag kommer med en sockerkaka på lördag. Och säg till Dahlgren att jag har hört rykten om bageriet. /Mormor Signe', 30, null);
  }

  // ---------------------------------------------------------------- talks
  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'kaffe') g.camFocus = null; };
    switch (this.stage) {
      case 'intro': free();
        if (this.table) { (m.kaffeLeft = m.kaffeLeft || []).push(...this.table); this.table = null; }
        this.toSouth();
        g.emit('toast', { text: 'Till Söderholmen: Mormor Signe bor i det rosa huset längst bort bland husen vid kapellet.', long: true });
        return;
      case 'signeTalk': free(); this.stage = 'shed'; return;
      case 'shedTalk': free(); this.stage = 'out'; g.indoors.noExit = false; this.spawnOwners(true);
        g.emit('toast', { text: 'Gå ut – Jonte rullar ut cyklarna på gården.' });
        return;
      case 'ownerTalk': free(); this.delivered(); return;
      case 'novaTalk': free(); this.toFinale();
        m.sms(WHO.pia, 'Jonte har berättat. Nu går vi till Gun – Birger, Jonte och jag. Möt oss vid hennes grind på Storgatan.', 2.0, this);
        return;
      case 'finaleTalk': free(); this.finish(); return;
    }
  }

  // ---------------------------------------------------------------- per step
  update(dt) {
    const g = this.game, ind = g.indoors;
    this.prompt = null;
    void dt;
    if (this.stage === 'search' && !ind.inside && !ind.busy) { this.stage = 'shed'; }   // (out before finding them: back in)
    if (this.stage === 'out' && !ind.inside && !ind.busy) { this.putOutBikes(); this.stage = 'deliver'; this.save(STEPS.indexOf('deliver') + 1); g.emit('toast', { text: 'Fem cyklar på rad bakom vedboden. Följ pilarna – i vilken ordning du vill.', long: true }); }
    switch (this.stage) {
      case 'south': this.southStep(); break;
      case 'shed': this.shedStep(); break;
      case 'search': this.searchStep(); break;
      case 'out': if (ind.inside) this.mgr.setObjective('Ut med cyklarna', 'Gå ut ur vedboden'); break;
      case 'deliver': this.deliverStep(); break;
      case 'skate': this.skateStep(); break;
      case 'finale': this.finaleStep(); break;
    }
  }

  interact() {
    const pr = this.prompt;
    if (!pr) return false;
    if (pr === 'GÅ IN') { this.enterShed(); return true; }
    if (pr === 'LYFT' && this.tarp) { this.lift(this.tarp); return true; }
    return false;
  }

  // ---------------------------------------------------------------- map and view
  targets(T) {
    const g = this.game, p = g.player, ind = g.indoors;
    const item = (x, y, z) => T.push({ kind: 'item', x, y, z, gps: false });
    if (ind.inside) {
      if (this.stage === 'search') for (const Tp of TARPS) if (!this.lifted.has(Tp.id)) item(Tp.tx, SHED.y + 1.4, Tp.tz);
      return;
    }
    if (this.stage === 'south') T.push({ kind: 'zone', x: KAFFE.gate.x, z: KAFFE.gate.z, r: 1.2, gps: true });
    if (this.stage === 'shed') T.push({ kind: 'zone', x: SHED_DOOR.x, z: SHED_DOOR.z, r: 1.0, gps: true });
    if (this.stage === 'deliver') {
      const id = this.riding();
      for (const k of this.left) { const B = BIKE[k], o = this.owners[k]; if (o) T.push({ kind: 'contact', x: o.x, z: o.z, r: 1, letter: B.letter, color: B.color, badgeOnly: true, badgeY: 2.75, ref: o }); }
      if (id) { const B = BIKE[id]; T.push({ kind: 'zone', x: B.zone.x, z: B.zone.z, r: B.zone.r, gps: true }); return; }
      let best = null, bd = 1e9;
      for (const k of this.left) { const b = this.bikes[k]; if (!b || b.removed) continue; const t = { kind: 'car', car: b, color: 0x46c96f }; T.push(t); const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = t; } }
      if (best) best.gps = true;
    }
    if (this.stage === 'skate') {
      const sk = g.skate;
      if (p.inCar && p.car.spec.skate) T.push({ kind: 'zone', x: KAFFE.novaZone.x, z: KAFFE.novaZone.z, r: KAFFE.novaZone.r, gps: true });
      else if (sk && !sk.removed) T.push({ kind: 'car', car: sk, color: 0x46c96f, gps: true });
      else T.push({ kind: 'zone', x: SKATE.x, z: SKATE.z, r: 1.2, gps: true });
    }
    if (this.stage === 'finale') T.push({ kind: 'zone', x: KAFFE.fin.mark.x, z: KAFFE.fin.mark.z, r: KAFFE.fin.mark.r, gps: true });
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    p.frozen = false;
    g.indoors.noExit = false;
    if (g.camFocus && g.camFocus.owner === 'kaffe') g.camFocus = null;
    const L = (m.kaffeLeft = m.kaffeLeft || []);
    for (const q of [this.signe, this.jonte, this.nova, ...(this.table || []), ...Object.values(this.owners), ...(this.fin ? Object.values(this.fin) : [])]) if (q) L.push(q);
    this.signe = this.jonte = this.nova = this.table = this.fin = null; this.owners = {};
    // bikes not yet home go back to Signe's yard next time; the ones still lying about are tidied out of sight
    const bikes = Object.entries(this.bikes).filter(([id]) => this.left.includes(id)).map(([, b]) => b);
    const tidy = () => { let wait = false; for (const b of bikes) { if (!b || b.removed || b.driver === 'player') continue; if (hidden(g, b.x, b.z)) g.removeVehicle(b); else wait = true; } if (wait) m.later(2, tidy); };
    if (this.stage !== 'done') m.later(4, tidy);
  }
}
