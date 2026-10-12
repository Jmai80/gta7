// Main quest, part 13: "Flaskposten" (v1.12). Dahlgren has washed up at the konditori every morning
// since five o'clock (the dishwasher broke on his first day: he pressed the wrong button) – and fyrvaktaren
// Ingvar has started coming in for a bun every morning. Today he asks for you.
//   1. the konditori: dry the dishes with Dahlgren (he holds a plate out – take it before he drops it),
//      then Ingvar says one word: "Flaskposten."
//   2. the message in a bottle on Söderholmen's south cliffs (the secret from v1.8): "titta under fyrens
//      trappa /I. 1974" (if you found it long ago, you know already)
//   3. the lighthouse's new stone steps: in the hollow under them, Ingvar's tin with a lock (the year after
//      his name) – a letter "Till Elsa" and a dried sea pink. Ingvar tells you: the dance in 1974, the girl in
//      the green dress, the letter he never dared to give her. She lives in the green house by the chapel.
//   4. Elsa's house (inside): she cannot read without her glasses – look for them (Måns the cat lies on them),
//      give them to her, and she reads the letter. She writes an answer.
//   5. back to Ingvar at the lighthouse with it: "Söndag." – and he takes his boat.
//   6. the chapel on Sunday: Elsa on the third row, Ingvar walks up the aisle and sits down beside her.
// A checkpoint is kept in stats.flask, so a reload picks it up where you were.
import { WHO, KONDITORI, KONDITORI_DOOR, INGVAR } from './config.js';
import { CHAPEL, CHAPEL_DOOR, pewSeat } from './chapel.js';
import { ELSA_HOUSE, ELSA_DOOR, ELSA_SPOTS } from './elsa.js';
import { ISLE } from './island.js';
import { SECRETS } from './secrets.js';
import { CodeLock } from './lock.js';
import { Ped, STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed } from './hideout.js';
import { spawnIngvar, INGVAR_LOOK } from './livs.js';
import { GUN_LOOK } from './flag.js';
import { LOOKS } from './tivolijobs.js';
import { seat } from './barber.js';
import { HUNT, pinGun, hidden, stand } from './skattjakt.js';
import { fmt } from './rng.js';

const D = KONDITORI_DOOR, L = ISLE.lighthouse;
const NX = Math.cos(-Math.PI / 12), NZ = Math.sin(-Math.PI / 12);  // the lighthouse's east face (island.js)
const stair = (d, t = 0) => ({ x: L.x + NX * d - NZ * t, z: L.z + NZ * d + NX * t });
const BOTTLE = SECRETS.find((s) => s.id === 'bottle');

export const FLASK = {
  // the konditori: Dahlgren behind his washing-up table west of the door, you at its east end, Ingvar with a bun
  table: { x: D.x - 2.7, z: D.z - 1.3 },
  dahl: { x: D.x - 2.7, z: D.z - 0.7, h: Math.PI },
  you: { x: D.x - 1.55, z: D.z - 1.05 },
  ingvar: { x: D.x + 1.9, z: D.z - 1.75, h: -2.3 },
  plates: 12,
  wash: [1.25, 0.75],    // seconds of washing before Dahlgren holds the next plate out (first plate … last)
  offer: [1.15, 0.72],   // and how long he can hold it before it slips
  // the bottle on the south cliffs (secrets.js), the hollow under the lighthouse steps, the green house
  bottle: { x: BOTTLE.x, z: BOTTLE.z, r: 1.6 },
  stair: { ...stair(3.4, 1.35), r: 1.15 },
  hollow: stair(3.36, 0.5),
  lighthouse: { x: L.x, z: L.z, arrive: 30 },
  ingvarStair: stair(4.6, 2.2),
  elsa: ELSA_DOOR,
  code: '1974',
  // Sunday in the chapel: Elsa on the third row (from the front), Ingvar beside her, Gun and Dahlgren in front
  church: { elsa: pewSeat(3, 5.3), ingvar: pewSeat(3, 6.2), gun: pewSeat(5, 1.4), dahl: pewSeat(5, 2.3) },
  pay: { base: 5000, plate: 25, glasses: 200 },
};
export const FLASK_MAX = FLASK.pay.base + FLASK.plates * FLASK.pay.plate + FLASK.pay.glasses;

const GUN_T = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const DAHL = { who: 'Direktör Dahlgren', letter: 'D', color: '#5a5f6b' };
const INGVAR_T = { who: 'Fyrvaktaren Ingvar', letter: 'I', color: '#5b8fd6' };
const ELSA = { who: 'Elsa', letter: 'E', color: '#5f9a6a' };
const INGA = { who: 'Kyrkoherde Inga', letter: 'I', color: '#6b4fa0' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const NOTE = { who: 'Flaskposten', letter: 'I', color: '#c8a24a', note: true };
const LETTER = { who: 'Ingvars brev, 1974', letter: 'I', color: '#c8a24a', note: true };
const REPLY = { who: 'Elsas svar', letter: 'E', color: '#c8a24a', note: true };
// Dahlgren in his shirtsleeves and a blue washing-up apron; Elsa in a green cardigan, white hair in a bun
export const DISH_LOOK = { ...LOOKS.dahlgren, shirt: 0xf2f2ee, style: ST.glasses | ST.apron, accent: 0x5f87b5 };
export const ELSA_LOOK = { shirt: 0x5f8a6a, pants: 0x4a4c56, skin: 0xf0d0b8, hair: 0xeeeeea, height: 0.9, bulk: 1.02, style: ST.bun | ST.jacket, accent: 0x3f6a4a };
const DAHL_SUIT = { ...LOOKS.dahlgren, shirt: 0x3a3c41, style: ST.glasses | ST.jacket, accent: 0x2b2e35 };

const BREAK_LINES = ['Hoppsan.', 'Den var sprucken redan.', 'Gun! Den där räknas inte.', 'Jag är direktör, inte diskare!', 'Tallrikar är halare än man tror.'];
// the steps a reload can pick up from (stats.flask.at = index + 1)
const STEPS = ['bottle', 'stairs', 'elsa', 'reply', 'sunday'];

export function introPages() {
  return [
    { ...GUN_T, text: 'Lilla vän! Titta – Dahlgren har diskat här varje morgon sedan klockan fem.' },
    { ...DAHL, text: 'Diskmaskinen gick sönder första dagen. Jag tryckte på fel knapp. Så nu diskar jag för hand. Här ute. Så att hela torget ser.' },
    { ...GUN_T, text: 'Det är nyttigt för honom.' },
    { ...GUN_T, text: 'Och Ingvar har börjat komma hit varje morgon och köpa en bulle. I dag frågade han efter dig.' },
    { ...INGVAR_T, text: '…' },
    { ...GUN_T, text: 'Han kan vänta medan du hjälper Dahlgren att torka. Morgonrusningen börjar snart!' },
    { ...DAHL, text: 'Jag diskar, du torkar. Ta tallriken när jag håller fram den – jag är inte så bra på att hålla i saker.', last: 'JAG TORKAR' },
  ];
}
export function afterPages(broken, knows) {
  const verdict = broken === 0 ? 'Inte en enda sönder! Dahlgren, du kan ju!' : broken <= 3 ? `Bara ${broken} sönder. Det är rekord för honom.` : `${broken} tallrikar … Det drar jag från hans lön.`;
  const pages = [
    { ...GUN_T, text: verdict },
    { ...DAHL, text: 'Tack. Ingen har torkat disk åt mig förut. Ingen har torkat något åt mig förut.' },
    { ...INGVAR_T, text: '…' },
    { ...INGVAR_T, text: 'Flaskposten.' },
  ];
  if (knows) pages.push(
    { ...YOU, text: '”Den som hittar det här – titta under fyrens trappa. /I. 1974.” Den låg på Söderholmens klippor. Var det du?' },
    { ...INGVAR_T, text: 'Femtio år. Ingen hittade den. Utom du.' },
    { ...INGVAR_T, text: 'Den som hittar flaskan ska titta under trappan. Det bestämde jag 1974. Nu vet du var.', last: 'TILL FYREN' },
  );
  else pages.push(
    { ...YOU, text: 'Vilken flaskpost?' },
    { ...INGVAR_T, text: '1974 kastade jag en flaska i havet. Den flöt aldrig längre än till Söderholmen. Södra klipporna.' },
    { ...INGVAR_T, text: 'Jag ser den i kikaren varje dag. Den som hittar den ska läsa den. Det bestämde jag 1974.', last: 'JAG HÄMTAR DEN' },
  );
  return pages;
}
export function bottlePages() {
  return [
    { ...YOU, text: 'En grön flaska, inklämd mellan stenarna. Korken sitter kvar. Det ligger en lapp i den.' },
    { ...NOTE, text: 'Den som hittar det här –\ntitta under fyrens trappa.\n/I. 1974' },
    { ...YOU, text: 'Fyrens trappa. På Norrholmen, alltså.', last: 'TILL FYREN' },
  ];
}
export function tinPages() {
  return [
    { ...YOU, text: 'Ett kuvert, gulnat och igenklistrat: ”Till Elsa. Söderholmen.” Och en torkad strandtrift.', last: 'VÄNTA …' },
  ];
}
export function ingvarStairPages() {
  return [
    { ...INGVAR_T, text: 'Elsa.' },
    { ...INGVAR_T, text: 'Sommaren -74 var det dans på Söderholmen. Hon hade grön klänning.' },
    { ...INGVAR_T, text: 'Jag dansar inte. Så jag skrev ett brev. Men jag vågade aldrig ge henne det.' },
    { ...INGVAR_T, text: 'Så jag lade det under trappan och kastade flaskan i havet. Fick havet bestämma.' },
    { ...YOU, text: 'Och nu har det bestämt.' },
    { ...INGVAR_T, text: 'Hon bor i det gröna huset bredvid kapellet. Varje söndag sitter hon på tredje raden. Jag sitter längst bak.' },
    { ...YOU, text: 'I femtio år?' },
    { ...INGVAR_T, text: '… Ge henne brevet. Jag kan inte.', last: 'TILL ELSA' },
  ];
}
export function elsaPages() {
  return [
    { ...ELSA, text: 'Kom in, kom in! Akta Måns – han ligger alltid där man ska gå.' },
    { ...YOU, text: 'Jag har ett brev till dig. Det är … lite gammalt.' },
    { ...ELSA, text: 'Ett brev? Till mig? Det var länge sedan. Låt mig se … nej. Mina glasögon! Var har jag lagt dem nu igen?' },
    { ...ELSA, text: 'Utan dem ser jag inte ens katten. Kan du leta? De ligger alltid någonstans.', last: 'JAG LETAR' },
  ];
}
export function letterPages() {
  return [
    { ...ELSA, fx: 'glasses', text: 'Där är de! Måns, din tjuv. Tack, vännen. Nu ska vi se.' },
    { ...LETTER, text: 'Elsa. Jag såg dig på dansen i lördags. Du hade grön klänning och skrattade åt något som jag inte hörde.' },
    { ...LETTER, text: 'Jag dansar inte, och jag säger inte mycket. Men jag ser ditt fönster från fyren när det är klart väder. Det är det nästan alltid.' },
    { ...LETTER, text: 'Om du vill, så sätt dig bredvid mig i kapellet på söndag. Jag sitter längst bak.\nIngvar Lund, fyren' },
    { ...ELSA, text: '…' },
    { ...ELSA, text: 'Ingvar Lund. Fyrvaktarpojken. Han som sitter längst bak och bara säger ”Amen”.' },
    { ...ELSA, text: 'Och jag som har suttit på tredje raden och väntat på att han skulle säga något. I femtio år!' },
    { ...ELSA, fx: 'pen', text: 'Vänta lite. Nu ska han få svar.' },
    { ...ELSA, text: 'Ge honom det här. Och kör försiktigt – jag har väntat länge nog.', last: 'TILL INGVAR' },
  ];
}
export function replyPages() {
  return [
    { ...YOU, text: 'Från Elsa.' },
    { ...INGVAR_T, text: '…' },
    { ...REPLY, text: 'Ingvar Lund! Femtio år, och inte ett ord. Du är aldrig sen till en gudstjänst – men till det här är du sen.\nTredje raden. Söndag. Jag sparar platsen.\n/Elsa' },
    { ...INGVAR_T, text: '…' },
    { ...INGVAR_T, text: 'Söndag.' },
    { ...YOU, text: 'Det är söndag i dag, Ingvar.' },
    { ...INGVAR_T, text: 'Då tar jag båten. Vi ses i kapellet.', last: 'TILL KAPELLET' },
  ];
}
export function finalePages(amount, broken) {
  return [
    { ...INGA, text: 'Välkomna allihop, en sådan vacker söndag. Och … Ingvar? Du sitter inte längst bak i dag.' },
    { ...INGVAR_T, text: 'Nej.' },
    { ...INGVAR_T, text: 'Hej, Elsa.' },
    { ...ELSA, text: 'Hej, Ingvar. Femtio år. Du är sen.' },
    { ...INGVAR_T, text: 'Arne var också alltid sen.' },
    { ...GUN_T, text: 'Det var han, lilla vän. Det var han.' },
    { ...DAHL, text: 'Får man applådera i kyrkan?' },
    { ...INGA, text: 'I dag får man det.' },
    { ...GUN_T, text: `Och du, lilla vän: tack. Ta de här ${fmt(amount)} kronorna.${broken ? ` Dahlgren slog sönder ${broken === 1 ? 'en tallrik' : `${broken} tallrikar`}, men det drar vi inte av.` : ''}`, last: 'AMEN!' },
  ];
}

export function flaskSave(g) { return g.stats.flask && typeof g.stats.flask === 'object' ? g.stats.flask : null; }

// While the quest is open (and not yet past the konditori), tant Gun waits outside the konditori with
// Dahlgren at his washing-up table and Ingvar with a bun – put there, and taken away, out of sight.
export function flaskWorld(mgr) {
  const g = mgr.game, flag = mgr.flag;
  const open = mgr.isOpen('flaskpost'), job = mgr.active && mgr.active.id === 'flaskpost' ? mgr.active : null;
  const c = mgr.jobs.find((q) => q.id === 'flaskpost');
  const S = flaskSave(g);
  if (c) c.startOnAccept = !!(open && S && S.at > 0);
  const church = mgr.tracked === 'kyrkkaffe' || (mgr.active && mgr.active.id === 'kyrkkaffe');
  const atKonditori = open && !(S && S.at > 0) && (!mgr.active || (job && job.atKonditori)) && !church;
  if (atKonditori) {
    mgr.flaskHoldsGun = true;
    if (!flag.huntPin && hidden(g, HUNT.gun.x, HUNT.gun.z) && hidden(g, flag.gun.x, flag.gun.z)) pinGun(g, flag);
    const F = FLASK;
    if ((!mgr.flaskDahl || !g.peds.list.includes(mgr.flaskDahl)) && hidden(g, F.dahl.x, F.dahl.z)) mgr.flaskDahl = spawnPed(g, { ...DISH_LOOK }, F.dahl.x, F.dahl.z, F.dahl.h, 'flask-dahl');
    if ((!mgr.flaskIngvar || !g.peds.list.includes(mgr.flaskIngvar)) && hidden(g, F.ingvar.x, F.ingvar.z)) mgr.flaskIngvar = spawnPed(g, { ...INGVAR_LOOK }, F.ingvar.x, F.ingvar.z, F.ingvar.h, 'flask-ingvar');
    if (hidden(g, F.table.x, F.table.z)) mgr.flaskDishes = true;
    return;
  }
  if (job && job.atKonditori) return;
  mgr.flaskHoldsGun = false;
  const T = FLASK.table;
  if (mgr.flaskDishes && hidden(g, T.x, T.z)) mgr.flaskDishes = false;
  for (const k of ['flaskDahl', 'flaskIngvar']) { const q = mgr[k]; if (q && hidden(g, q.x, q.z)) { removePed(g, q); mgr[k] = null; } }
  // Ingvar is out in his boat on Sunday; afterwards he is back at the lighthouse (out of sight)
  if (mgr.done.has('livs') && (!mgr.ingvar || !g.peds.list.includes(mgr.ingvar)) && !(job && job.ingvarAway) && hidden(g, INGVAR.x, INGVAR.z)) mgr.ingvar = spawnIngvar(g);
}

export class BottleJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'flaskpost';
    // intro → dishes → after → bottle → bottleNote → stairs → stairLock → tinNote → ingvarWalk → ingvarTalk →
    // elsa → knock → elsaTalk → search ⇄ read → give → letter → reply → replyTalk → sunday → church → finale → done
    this.stage = 'intro';
    this.prompt = null;
    this.dried = 0; this.broken = 0; this.plate = 'wash'; this.plateT = 0; this.offerFor = 1;
    this.searched = new Set(); this.searchT = 0; this.spot = null; this.hinted = false; this.solo = false;
    this.carry = null;        // 'letter' | 'glasses' | 'reply' (the objective box says so)
    this.tinShown = false;    // the tin in the hollow under the lighthouse steps (render.js)
    this.holdsChapel = true;
    this.elsa = null; this.churchFolk = [];
  }

  get atKonditori() { return this.stage === 'intro' || this.stage === 'dishes' || this.stage === 'after'; }
  get ingvarAway() { return this.stage === 'sunday' || this.stage === 'church' || this.stage === 'finale' || this.stage === 'done'; }
  get gun() { return this.mgr.flag.gun; }
  get dahl() { return this.mgr.flaskDahl; }
  get knowsBottle() { const s = this.mgr.secrets; return !!(s && s.has('bottle')); }

  save(at) {
    const g = this.game;
    g.stats.flask = { at, dried: this.dried, broken: this.broken, solo: this.solo };
    g.emit('progress', {});
  }

  start() {
    const g = this.game, m = this.mgr, p = g.player;
    const S = flaskSave(g);
    if (S && S.at > 0 && S.at <= STEPS.length) { this.resume(S); return; }
    this.ensureKonditori();
    const gun = this.gun, Dg = this.dahl, I = m.flaskIngvar;
    this.standAt(FLASK.you.x, FLASK.you.z, gun.x, gun.z);
    for (const q of [gun, I]) if (q) { q.standH = q.h = Math.atan2(p.x - q.x, p.z - q.z); q.body.h = q.h; }
    if (Dg) { Dg.standH = Dg.h = FLASK.dahl.h; Dg.body.h = Dg.h; }
    g.camFocus = { x: D.x - 1.0, y: 0.5, z: D.z - 1.3, yaw: -0.15, owner: 'flask', near: true, dist: 7.0, height: 3.0 };
    m.setObjective('Flaskposten', 'Sjuby Konditori');
    m.later(0.7, () => g.emit('talk', { id: this.id, pages: introPages() }), this);
  }

  resume(S) {
    const g = this.game, m = this.mgr;
    this.dried = S.dried || 0; this.broken = S.broken || 0; this.solo = !!S.solo;
    const step = STEPS[S.at - 1];
    const say = (text) => g.emit('toast', { text: `Flaskposten fortsätter: ${text}`, long: true });
    if (step === 'bottle') { this.toBottle(); say('hämta flaskposten på Söderholmens södra klippor.'); }
    else if (step === 'stairs') { this.toStairs(); say('titta under fyrens trappa på Norrholmen.'); }
    else if (step === 'elsa') { this.toElsa(); say('ge Ingvars brev till Elsa i det gröna huset bredvid kapellet.'); }
    else if (step === 'reply') { this.toReply(); say('ta Elsas svar till Ingvar vid fyren.'); }
    else { this.toSunday(); say('söndag i kapellet på Söderholmen.'); }
    void m;
  }

  ensureKonditori() {
    const g = this.game, m = this.mgr, flag = m.flag, gun = flag.gun, F = FLASK;
    m.flaskHoldsGun = true; m.flaskDishes = true;
    if (!flag.huntPin || Math.hypot(gun.x - HUNT.gun.x, gun.z - HUNT.gun.z) > 1) pinGun(g, flag);
    if (!m.flaskDahl || !g.peds.list.includes(m.flaskDahl)) m.flaskDahl = spawnPed(g, { ...DISH_LOOK }, F.dahl.x, F.dahl.z, F.dahl.h, 'flask-dahl');
    if (!m.flaskIngvar || !g.peds.list.includes(m.flaskIngvar)) m.flaskIngvar = spawnPed(g, { ...INGVAR_LOOK }, F.ingvar.x, F.ingvar.z, F.ingvar.h, 'flask-ingvar');
  }

  ensureIngvar() {
    const g = this.game, m = this.mgr;
    if (!m.ingvar || !g.peds.list.includes(m.ingvar)) m.ingvar = spawnIngvar(g);
    return m.ingvar;
  }

  standAt(x, z, fx, fz) {
    const g = this.game, p = g.player;
    if (p.inCar) p.exitCar();
    p.state = 'foot';
    p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0;
    p.h = Math.atan2(fx - x, fz - z); p.frozen = true;
  }

  // ---------------------------------------------------------------- 1. the washing-up
  startDishes() {
    const g = this.game, m = this.mgr, p = g.player, Dg = this.dahl;
    this.stage = 'dishes'; this.plate = 'wash'; this.plateT = 0;
    p.frozen = true;
    if (Dg) p.h = Math.atan2(Dg.x - p.x, Dg.z - p.z);
    g.camFocus = { x: (FLASK.table.x + FLASK.you.x) / 2, y: 0.55, z: FLASK.table.z - 0.2, yaw: 0.25, owner: 'flask', near: true, dist: 4.4, height: 2.2 };
    m.later(0.5, () => g.emit('hint', { id: 'torka', touch: 'Tryck TORKA när Dahlgren håller fram en tallrik – innan han tappar den!', keys: 'Tryck E när Dahlgren håller fram en tallrik – innan han tappar den!' }), this);
  }

  dishStep(dt) {
    const g = this.game, m = this.mgr, Dg = this.dahl;
    const n = this.dried + this.broken, k = Math.min(1, n / (FLASK.plates - 1));
    this.plateT += dt;
    if (Dg) Dg.body.pose = 3;
    if (this.plate === 'wash') {
      if (this.plateT >= FLASK.wash[0] + (FLASK.wash[1] - FLASK.wash[0]) * k) { this.plate = 'offer'; this.plateT = 0; this.offerFor = FLASK.offer[0] + (FLASK.offer[1] - FLASK.offer[0]) * k; g.emit('plate', { kind: 'offer' }); }
    } else if (this.plate === 'offer') {
      this.prompt = 'TORKA';
      if (g.input && g.input.action) {
        this.dried++; this.plate = 'wash'; this.plateT = 0;
        g.emit('plate', { kind: 'dry', n: this.dried });
        if (Dg && this.dried === 4) g.emit('say', { who: Dg, text: 'Snabbare! Rusningen kommer!' });
        if (Dg && this.dried === 8) g.emit('say', { who: Dg, text: 'Vi är ett bra lag, du och jag.' });
      } else if (this.plateT >= this.offerFor) {
        this.broken++; this.plate = 'wash'; this.plateT = -0.35;   // (a moment for the crash)
        g.emit('plate', { kind: 'crash', x: FLASK.table.x + 0.5, z: FLASK.table.z + 0.15 });
        if (Dg) g.emit('say', { who: Dg, text: BREAK_LINES[(this.broken - 1) % BREAK_LINES.length] });
      }
    }
    if (this.dried + this.broken >= FLASK.plates && this.plate === 'wash') { this.afterDishes(); return; }
    m.setObjective('Torka disken med Dahlgren', `Tryck TORKA · ${this.dried + this.broken} av ${FLASK.plates}${this.broken ? ` · ${this.broken} sönder` : ''}`);
  }

  afterDishes() {
    const g = this.game, m = this.mgr, p = g.player, I = m.flaskIngvar;
    this.stage = 'after'; this.prompt = null; this.plate = 'done';
    if (I) { p.h = Math.atan2(I.x - p.x, I.z - p.z); I.standH = I.h = Math.atan2(p.x - I.x, p.z - I.z); I.body.h = I.h; }
    g.camFocus = { x: D.x - 0.6, y: 0.5, z: D.z - 1.4, yaw: -0.15, owner: 'flask', near: true, dist: 7.0, height: 3.0 };
    m.later(0.8, () => g.emit('talk', { id: this.id, pages: afterPages(this.broken, this.knowsBottle) }), this);
  }

  // ---------------------------------------------------------------- 2. the bottle on the cliffs
  toBottle() {
    const m = this.mgr;
    this.stage = 'bottle';
    this.save(STEPS.indexOf('bottle') + 1);
    m.setObjective('Hämta flaskposten', 'Södra klipporna på Söderholmen');
  }

  bottleStep() {
    const g = this.game, m = this.mgr, p = g.player, B = FLASK.bottle;
    const d = Math.hypot(p.x - B.x, p.z - B.z);
    if (p.state === 'foot' && !p.frozen && d < B.r) this.prompt = 'UNDERSÖK';
    m.setObjective('Hämta flaskposten', d < 25 ? (p.inCar ? 'Kliv ur – flaskan ligger bland stenarna' : 'Bland stenarna på klippan') : 'Södra klipporna på Söderholmen');
  }

  readBottle() {
    const g = this.game, m = this.mgr, B = FLASK.bottle;
    this.stage = 'bottleNote';
    this.standAt(g.player.x, g.player.z, B.x, B.z + 0.8);
    g.camFocus = { x: B.x, y: 0.4, z: B.z + 0.5, yaw: 2.6, owner: 'flask', near: true, dist: 4.0, height: 2.0 };
    g.emit('paper', {});
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: bottlePages() }), this);
  }

  // ---------------------------------------------------------------- 3. under the lighthouse steps
  toStairs() {
    const m = this.mgr;
    this.stage = 'stairs'; this.tinShown = true;
    this.save(STEPS.indexOf('stairs') + 1);
    this.ensureIngvar();
    m.setObjective('Titta under fyrens trappa', 'Fyren på Norrholmen');
  }

  stairStep() {
    const g = this.game, m = this.mgr, p = g.player, S = FLASK.stair;
    const d = Math.hypot(p.x - S.x, p.z - S.z);
    if (p.state === 'foot' && !p.frozen && d < S.r) this.prompt = 'UNDERSÖK';
    const near = Math.hypot(p.x - L.x, p.z - L.z) < FLASK.lighthouse.arrive;
    m.setObjective('Titta under fyrens trappa', near ? (p.inCar ? 'Kliv ur vid fyren' : 'Stentrappan på fyrens östra sida') : 'Fyren på Norrholmen');
  }

  openStairLock() {
    const g = this.game, H = FLASK.hollow;
    this.standAt(FLASK.stair.x + 0.25, FLASK.stair.z + 0.35, H.x, H.z);
    g.emit('toast', { text: 'I hålet under trappan står en rostig plåtask – med ett kodlås.', long: true });
    // a fixed shot from the south-east: the steps and the hollow above the lock panel (you off to the side)
    const y0 = g.world.groundHeight(H.x, H.z), C = stair(7.0, -2.6);
    g.camFocus = { x: H.x, y: y0 - 0.5, z: H.z, owner: 'flask', cam: { x: C.x, y: y0 + 1.9, z: C.z, fov: 50 } };
    g.lock = new CodeLock(g, {
      code: FLASK.code, kicker: 'FYREN · INGVARS PLÅTASK', title: 'KODLÅS',
      hint: 'Fyra siffror. Ingvar skriver alltid årtalet efter sitt namn.',
      help: 'Lappen i flaskan var undertecknad ”/I.” – och ett årtal.',
      onOpen: () => this.tinOpened(),
      onStop: () => this.lockStopped(),
    });
    this.stage = 'stairLock';
  }

  lockStopped() {
    const g = this.game;
    g.lock = null; g.player.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'flask') g.camFocus = null;
    if (this.stage === 'stairLock') this.stage = 'stairs';
  }

  tinOpened() {
    const g = this.game, m = this.mgr;
    g.lock = null; this.tinShown = false; this.carry = 'letter';
    g.emit('keys', { item: 'letter' });
    this.stage = 'tinNote';
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: tinPages() }), this);
  }

  // Ingvar comes over from his cottage
  ingvarComes() {
    const g = this.game, p = g.player, I = this.ensureIngvar();
    this.stage = 'ingvarWalk'; this.walkT = 0;
    p.frozen = true;
    const W = FLASK.ingvarStair;
    I.arrived = false; I.goto([[W.x, W.z]], 1.0, Math.atan2(p.x - W.x, p.z - W.z));
    g.camFocus = { x: (p.x + W.x) / 2, y: 0.5, z: (p.z + W.z) / 2 + 0.3, yaw: -2.4, owner: 'flask', near: true };
  }

  ingvarWalkStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, I = m.ingvar;
    this.walkT += dt;
    if (!I || I.arrived || this.walkT > 12) {
      if (I && !I.arrived) { const W = FLASK.ingvarStair; stand(g, I, W.x, W.z, 0); }
      if (I) { I.standH = I.h = Math.atan2(p.x - I.x, p.z - I.z); I.body.h = I.h; p.h = Math.atan2(I.x - p.x, I.z - p.z); }
      this.stage = 'ingvarTalk';
      m.later(0.4, () => g.emit('talk', { id: this.id, pages: ingvarStairPages() }), this);
    }
  }

  // ---------------------------------------------------------------- 4. Elsa's house
  toElsa() {
    const m = this.mgr;
    this.stage = 'elsa'; this.carry = 'letter';
    this.save(STEPS.indexOf('elsa') + 1);
    m.setObjective('Ge brevet till Elsa', 'Det gröna huset bredvid kapellet på Söderholmen');
  }

  elsaStep() {
    const g = this.game, m = this.mgr, p = g.player, E = FLASK.elsa, ind = g.indoors;
    const d = Math.hypot(p.x - E.x, p.z - E.z);
    if (p.state === 'foot' && !p.frozen && d < E.r && !ind.busy) this.prompt = 'KNACKA';
    m.setObjective('Ge brevet till Elsa', d < 30 ? (p.inCar ? 'Kliv ur – dörren mot vägen' : 'Knacka på dörren mot vägen') : 'Det gröna huset bredvid kapellet på Söderholmen');
  }

  knock() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'knock';
    p.frozen = true; p.vx = p.vz = 0; p.h = -Math.PI / 2;
    g.emit('knock', {});
    m.later(1.0, () => g.emit('toast', { text: '”Det är öppet!” ropar någon därinne.', long: false }), this);
    m.later(1.8, () => g.indoors.enter(() => this.inside(), 'elsa'), this);
  }

  inside() {
    const g = this.game, m = this.mgr, p = g.player;
    this.spawnElsa();
    g.emit('toast', { text: 'Elsas hus · Söderholmen', long: false });
    p.frozen = true;
    const E = this.elsa;
    g.camFocus = { x: (p.x + E.x) / 2 - 1.0, y: 0.5, z: E.z - 0.4, yaw: -Math.PI / 2 + 0.35, owner: 'flask', near: true, dist: 5.0, height: 3.2 };
    if (this.stage === 'knock') {
      this.stage = 'elsaTalk';
      m.later(0.9, () => g.emit('talk', { id: this.id, pages: elsaPages() }), this);
    } else {
      p.frozen = false; g.camFocus = null;
    }
  }

  spawnElsa() {
    const g = this.game;
    if (this.elsa && g.peds.list.includes(this.elsa)) return this.elsa;
    const look = { ...ELSA_LOOK };
    if (this.glassesOn) look.style |= ST.glasses;
    this.elsa = seat(new Ped(g, look), ELSA_HOUSE.chair, 'elsa');
    g.peds.add(this.elsa);
    return this.elsa;
  }

  spots() { return this.stage === 'search' ? ELSA_SPOTS.filter((s) => !this.searched.has(s.id)) : []; }

  searchStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    if (!ind.inside && !ind.busy) { this.outside(); return; }
    if (this.searchT > 0) {
      this.searchT -= dt;
      if (this.searchT <= 0) this.reveal();
      m.setObjective('Leta efter Elsas glasögon', 'Du letar …');
      return;
    }
    if (p.state === 'foot' && !p.frozen) {
      let best = null, bd = 1e9;
      for (const s of ELSA_SPOTS) {
        if (this.searched.has(s.id)) continue;
        const d = Math.hypot(p.x - s.x, p.z - s.z);
        if (d < s.r && d < bd) { bd = d; best = s; }
      }
      this.spot = best;
      if (best) this.prompt = 'LETA';
    }
    m.setObjective('Leta efter Elsas glasögon', `${this.searched.size} av ${ELSA_SPOTS.length} ställen · pilarna visar var`);
  }

  reveal() {
    const g = this.game, m = this.mgr, s = this.spot;
    this.searched.add(s.id);
    if (s.find) {
      this.carry = 'glasses'; this.solo = !this.hinted;
      g.emit('keys', { item: 'glasses' });
      this.stage = 'read';
      g.emit('talk', { id: this.id, pages: [{ ...YOU, text: s.text, last: 'TILL ELSA' }] });
      return;
    }
    this.stage = 'read';
    g.emit('talk', { id: this.id, pages: [{ ...YOU, text: s.text, last: 'LETA VIDARE' }] });
    const misses = [...this.searched].length;
    if (misses >= 3 && !this.hinted) {
      this.hinted = true;
      m.later(0.4, () => { if (this.elsa) g.emit('say', { who: this.elsa, text: 'Har du tittat i Måns korg? Han samlar på allt som är varmt.' }); }, this);
    }
  }

  giveStep() {
    const g = this.game, m = this.mgr, p = g.player, T = ELSA_HOUSE.talk, ind = g.indoors;
    if (!ind.inside && !ind.busy) { this.outside(); return; }
    if (p.state === 'foot' && !p.frozen && Math.hypot(p.x - T.x, p.z - T.z) < T.r) this.prompt = 'GE';
    m.setObjective('Ge Elsa glasögonen', 'Hon sitter i gungstolen vid fönstret');
  }

  giveGlasses() {
    const g = this.game, m = this.mgr, p = g.player, E = this.elsa;
    this.stage = 'letter';
    p.frozen = true; p.vx = p.vz = 0;
    if (E) p.h = Math.atan2(E.x - p.x, E.z - p.z);
    g.camFocus = { x: (p.x + E.x) / 2, y: 0.5, z: E.z, yaw: -Math.PI / 2 - 0.5, owner: 'flask', near: true, dist: 4.4, height: 2.6 };
    m.later(0.4, () => g.emit('talk', { id: this.id, pages: letterPages() }), this);
  }

  // walked out of Elsa's house before she has her glasses: no harm, knock again
  outside() {
    const m = this.mgr;
    this.stage = 'elsa'; this.carry = 'letter'; this.searchT = 0;
    this.removeElsa();
    m.setObjective('Ge brevet till Elsa', 'Knacka på igen');
  }

  removeElsa() { if (this.elsa) { removePed(this.game, this.elsa); this.elsa = null; } }

  // ---------------------------------------------------------------- 5. back to Ingvar with her answer
  toReply() {
    const m = this.mgr;
    this.stage = 'reply'; this.carry = 'reply';
    this.save(STEPS.indexOf('reply') + 1);
    const g = this.game, I = this.ensureIngvar();
    stand(g, I, INGVAR.x, INGVAR.z, INGVAR.h);   // back outside his cottage (you are far away, on Söderholmen)
    m.setObjective('Ta Elsas svar till Ingvar', 'Fyren på Norrholmen');
  }

  replyStep() {
    const g = this.game, m = this.mgr, p = g.player, I = this.ensureIngvar();
    if (g.indoor) { m.setObjective('Ta Elsas svar till Ingvar', 'Gå ut ur huset'); return; }
    this.removeElsa();
    const d =Math.hypot(p.x - I.x, p.z - I.z);
    if (p.state === 'foot' && !p.frozen && d < 2.0) this.prompt = 'PRATA';
    m.setObjective('Ta Elsas svar till Ingvar', d < 30 ? (p.inCar ? 'Kliv ur vid fyren' : 'Han står vid sin stuga') : 'Fyren på Norrholmen');
  }

  talkToIngvar() {
    const g = this.game, m = this.mgr, p = g.player, I = this.ensureIngvar();
    this.stage = 'replyTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(I.x - p.x, I.z - p.z);
    I.standH = I.h = Math.atan2(p.x - I.x, p.z - I.z); I.body.h = I.h;
    g.camFocus = { x: (p.x + I.x) / 2, y: 0.5, z: (p.z + I.z) / 2, yaw: p.h - 0.6, owner: 'flask', near: true };
    m.later(0.4, () => g.emit('talk', { id: this.id, pages: replyPages() }), this);
  }

  // ---------------------------------------------------------------- 6. Sunday in the chapel
  toSunday() {
    const g = this.game, m = this.mgr, I = m.ingvar;
    this.stage = 'sunday'; this.carry = null;
    this.save(STEPS.indexOf('sunday') + 1);
    // off to his boat (and away when nobody is looking)
    if (I && g.peds.list.includes(I)) { I.arrived = false; I.goto([[INGVAR.x + 9, INGVAR.z + 6]], 1.0); }
    m.setObjective('Söndag i kapellet', 'Kapellet på Söderholmen');
  }

  sundayStep() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors, I = m.ingvar;
    if (I && g.peds.list.includes(I) && hidden(g, I.x, I.z)) { removePed(g, I); m.ingvar = null; }
    if (g.indoor) { m.setObjective('Söndag i kapellet', 'Gå ut – kapellet är på Söderholmen'); return; }
    const atDoor = p.state === 'foot' && !p.frozen && Math.hypot(p.x - CHAPEL_DOOR.x, p.z - CHAPEL_DOOR.z) < CHAPEL_DOOR.r && !ind.busy;
    if (atDoor) this.prompt = 'GÅ IN';
    m.setObjective('Söndag i kapellet', atDoor ? 'Gå in i kapellet' : p.inCar ? 'Kliv ur vid kapellet' : 'Dörren i kapellets torn');
  }

  goToChurch() {
    const g = this.game, m = this.mgr, ind = g.indoors;
    this.stage = 'entering';
    if (m.ingvar && g.peds.list.includes(m.ingvar)) { removePed(g, m.ingvar); m.ingvar = null; }
    g.emit('toast', { text: 'Söndag. Kyrkklockan ringer över Söderholmen.', long: true });
    g.emit('churchBell', {});
    ind.enter(() => this.churchScene(), 'chapel');
  }

  churchScene() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors, C = FLASK.church;
    this.stage = 'church'; this.churchT = 0;
    m.setObjective('Söndag i kapellet', 'Elsa sitter på tredje raden');
    const add = (look, S, npc) => { const q = seat(new Ped(g, look), S, npc); g.peds.add(q); ind.chapelFolk.push(q); return q; };
    const elsaLook = { ...ELSA_LOOK, style: ELSA_LOOK.style | ST.glasses };
    this.churchFolk = [add(elsaLook, C.elsa, 'elsa'), add({ ...GUN_LOOK }, C.gun, 'church-gun'), add({ ...DAHL_SUIT }, C.dahl, 'flask-dahl')];
    // you stand in the aisle by the back rows; Ingvar comes in through the door behind you
    const ax = CHAPEL.aisle.x;
    p.x = ax; p.z = CHAPEL.room.z0 + 2.4; p.y = g.world.groundHeight(p.x, p.z); p.h = 0; p.frozen = true; p.vx = p.vz = 0;
    g.camFocus = { x: ax + 0.8, y: 0.6, z: C.elsa.z - 0.2, yaw: Math.PI - 0.25, owner: 'flask', near: true, dist: 5.6, height: 2.4 };
    m.later(1.2, () => {
      const I = spawnPed(g, { ...INGVAR_LOOK }, CHAPEL.spawn.x, CHAPEL.spawn.z, 0, 'flask-ingvar');
      ind.chapelFolk.push(I);
      this.ingvarIn = I;
      I.arrived = false; I.goto(C.ingvar.path, 0.95, 0);
      g.emit('say', { who: this.churchFolk[0], text: '…' });
    }, this);
  }

  churchStep(dt) {
    const g = this.game, m = this.mgr, I = this.ingvarIn, C = FLASK.church;
    this.churchT += dt;
    if (!I) return;
    if ((I.arrived || this.churchT > 20) && this.stage === 'church') {
      seat(I, C.ingvar, 'flask-ingvar');
      this.stage = 'finale';
      this.amount = FLASK.pay.base + this.dried * FLASK.pay.plate + (this.solo ? FLASK.pay.glasses : 0);
      m.later(1.0, () => g.emit('talk', { id: this.id, pages: finalePages(this.amount, this.broken) }), this);
    }
  }

  // ---------------------------------------------------------------- talks
  talkFx(fx) {
    if (fx === 'glasses') {
      this.glassesOn = true; this.carry = 'letter';
      const E = this.elsa;
      if (E) E.body.look = { ...E.body.look, style: E.body.look.style | ST.glasses };
    }
    if (fx === 'pen') { this.carry = 'reply'; this.game.emit('paper', {}); }
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'flask') g.camFocus = null; };
    switch (this.stage) {
      case 'intro': this.startDishes(); return;
      case 'after': {
        free();
        const I = m.flaskIngvar;
        if (I) { I.arrived = false; I.goto([[D.x + 6, D.z - 6]], 0.9); }  // off with his bun
        if (this.knowsBottle) { this.toStairs(); } else this.toBottle();
        return;
      }
      case 'bottleNote': free(); this.toStairs(); this.secret('bottle'); return;
      case 'tinNote': this.ingvarComes(); return;
      case 'ingvarTalk': free(); this.toElsa(); return;
      case 'elsaTalk':
        free(); this.stage = 'search';
        m.later(0.8, () => g.emit('hint', { id: 'leta-elsa', touch: 'Gå fram till sakerna med pilar och tryck LETA.', keys: 'Gå fram till sakerna med pilar och tryck E för att leta.' }), this);
        return;
      case 'read': free(); this.stage = this.carry === 'glasses' ? 'give' : 'search'; return;
      case 'letter': free(); this.toReply(); g.emit('toast', { text: 'Gå ut och kör Elsas svar till Ingvar vid fyren.', long: true }); return;
      case 'replyTalk': free(); this.toSunday(); return;
      case 'finale': this.finish(); return;
    }
  }

  // (the secret is found on the way, if you had not found it already)
  secret(id) { const s = this.mgr.secrets; if (s && !s.has(id)) this.mgr.later(1.2, () => s.find(id), this); }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    g.stats.flaskDried = this.dried; g.stats.flaskBroken = this.broken;
    g.stats.flask = { at: STEPS.length + 1, dried: this.dried, broken: this.broken, solo: this.solo };
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Flaskposten', amount: this.amount });
    m.later(30, () => g.emit('sms', { from: 'Elsa', text: 'Han pratade i fyra minuter efter gudstjänsten. FYRA MINUTER! Tack, vännen. Kom på kaffe någon dag – jag dukar för tre nu.', color: ELSA.color }), null);
  }

  // ---------------------------------------------------------------- per step
  update(dt) {
    const g = this.game, p = g.player;
    this.prompt = null;
    if (g.lock) g.lock.update(dt);
    switch (this.stage) {
      case 'dishes': this.dishStep(dt); break;
      case 'bottle': this.bottleStep(); break;
      case 'stairs': this.stairStep(); break;
      case 'ingvarWalk': this.ingvarWalkStep(dt); break;
      case 'elsa': this.elsaStep(); break;
      case 'search': this.searchStep(dt); break;
      case 'give': this.giveStep(); break;
      case 'reply': this.replyStep(); break;
      case 'sunday': this.sundayStep(); break;
      case 'church': this.churchStep(dt); break;
    }
    void p;
  }

  interact() {
    switch (this.prompt) {
      case 'TORKA': return true;               // (the press comes straight from the input: you are frozen)
      case 'UNDERSÖK': if (this.stage === 'bottle') this.readBottle(); else this.openStairLock(); return true;
      case 'KNACKA': this.knock(); return true;
      case 'LETA': if (this.spot) { this.searchT = 0.8; this.game.player.frozen = true; this.game.emit('salon', { kind: 'pick' }); } return true;
      case 'GE': this.giveGlasses(); return true;
      case 'PRATA': this.talkToIngvar(); return true;
      case 'GÅ IN': this.goToChurch(); return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- map and view
  targets(T) {
    const g = this.game, m = this.mgr, ind = g.indoors;
    if (this.stage === 'intro' || this.stage === 'dishes') return;
    if (this.stage === 'bottle') T.push({ kind: 'zone', x: FLASK.bottle.x, z: FLASK.bottle.z, r: 1.3, gps: true });
    if (this.stage === 'stairs') T.push({ kind: 'zone', x: FLASK.stair.x, z: FLASK.stair.z, r: 1.0, gps: true });
    if (this.stage === 'elsa' && !g.indoor) T.push({ kind: 'zone', x: FLASK.elsa.x, z: FLASK.elsa.z, r: 1.0, gps: true });
    if (this.stage === 'search' && ind.where === 'elsa') for (const s of this.spots()) T.push({ kind: 'item', x: s.item[0], y: s.item[1] + 0.35, z: s.item[2], gps: false });
    if (this.stage === 'give' && this.elsa) T.push({ kind: 'item', x: this.elsa.x, y: ELSA_HOUSE.y + 1.6, z: this.elsa.z, gps: false });
    if (this.stage === 'reply' && !g.indoor && m.ingvar) T.push({ kind: 'contact', x: m.ingvar.x, z: m.ingvar.z, r: 1, letter: 'I', color: INGVAR_T.color, badgeOnly: true, badgeY: 2.7, ref: m.ingvar, gps: true, always: true });
    if (this.stage === 'sunday' && !g.indoor) T.push({ kind: 'zone', x: CHAPEL_DOOR.x, z: CHAPEL_DOOR.z, r: CHAPEL_DOOR.r, gps: true });
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    if (g.lock) g.lock = null;
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'flask') g.camFocus = null;
    if (!g.indoor) this.removeElsa();
    else if (g.indoors.where === 'elsa' && this.elsa) {
      // still in her house: Elsa stays in her chair until you go out
      const E = this.elsa;
      const check = () => { if (g.indoors.inside && g.indoors.where === 'elsa') { m.later(1, check); return; } removePed(g, E); };
      m.later(1, check);
    }
  }
}
