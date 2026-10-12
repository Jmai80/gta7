// Main quest, part 12: "Arnes skattjakt" (v1.11). Bengt has baked from Arne's recipe for a week – good buns,
// but not ARNE's. Then tant Gun finds an envelope in Arne's old recipe box: "Till min Gun, på vår bröllopsdag
// 1995". Every wedding anniversary Arne hid a treasure hunt for her – this last one she never opened. On the
// back: "Det viktigaste står inte i receptet."
// Follow Arne's rhyming notes all over the map. The GPS does not tell you where: work it out from the
// riddle. Stuck? Gun texts a tip after a while (or at once if you tap the objective box), and the GPS comes
// on – every riddle solved without a tip is worth a little extra.
//   1. the oak stump in the park ("Där vårt hjärta är ristat i ek"): a tin box with a combination lock –
//      the code is the year in the carved heart
//   2. the windmill on Norrholmen ("Fyra vingar men inte en fjäder"): Majken's father tied the next note to
//      the sail with the yellow cloth – hold the brake so that it stops pointing straight down
//   3. the lighthouse ("min tystaste vän"): Ingvar talks (and it was him in the phone box all along). Arne
//      wanted the last riddle read to Gun on the phone, in the box on the quay where they met: get there
//      inside a minute and a half and he calls (late: he calls anyway, without the bonus)
//   4. the chapel ("Där du sa ja, under korset av guld"): Arne's butter box behind the altar cloth, with a
//      lock whose code has hung on the psalm board since the wedding in 1972
//   5. back to the konditori: Gun opens it. Arne crushed the cardamom himself, in her mother's mortar, the
//      same morning – never ground from a bag. Pound the first batch, and everyone tastes. Dahlgren too.
// A checkpoint is kept in stats.hunt, so a reload picks the hunt up at the note you were on.
import { WHO, KONDITORI, KONDITORI_DOOR, INGVAR, CURB_H } from './config.js';
import { CHAPEL, CHAPEL_DOOR, CHAPEL_KAFFE } from './chapel.js';
import { ISLE } from './island.js';
import { CodeLock } from './lock.js';
import { spawnPed, removePed } from './hideout.js';
import { spawnIngvar } from './livs.js';
import { BENGT_LOOK, MAJKEN_LOOK } from './opening.js';
import { LOOKS } from './tivolijobs.js';
import { STYLE_BITS as ST } from './peds.js';
import { GUN_LOOK } from './flag.js';
import { fmt, mmss, wrapAngle } from './rng.js';

const D = KONDITORI_DOOR, R = CHAPEL.room;
const at = (x, z) => [R.x0 + x, R.z0 + z];       // chapel-local → world
export const HUNT = {
  // at the konditori: Gun and Bengt by the door, and where you stand when you talk to them
  gun: { x: D.x + 0.4, z: D.z - 1.0, h: Math.PI },
  bengt: { x: D.x - 1.2, z: D.z - 0.9, h: Math.PI },
  you: { x: D.x + 1.5, z: D.z - 2.1 },
  dahl: { from: [0.0, 12.4], to: [-3.6, 17.9] },   // Dahlgren, across the square while the buns bake
  // the cameras outside the konditori: the three of you, the pestle up close, everyone at the tasting
  cam: { x: D.x + 0.4, y: 0.5, z: D.z - 1.5, yaw: -0.35, near: true },
  camPestle: { y: 0.9, yaw: 0.6, near: true, dist: 3.2, height: 1.6 },
  camTaste: { x: D.x + 0.9, y: 0.6, z: D.z - 1.5, yaw: -0.3, near: true, dist: 8.0, height: 3.2 },
  // 1. the oak stump in the park (the carving faces south), and the tin box at its foot. (The look spot
  // covers the "heart" secret's own spot, so UNDERSÖK there is always the lock while the hunt is at it.)
  stump: { x: 70, z: -60, arrive: 12, look: { x: 70, z: -58.7, r: 1.6 }, tin: { x: 70.3, z: -59.25 }, kneel: { x: 70.95, z: -59.3 } },
  // 2. the windmill: the brake lever south of the sails, Majken beside it
  mill: { x: ISLE.mill.x, z: ISLE.mill.z, arrive: 24, lever: { x: -3.4, z: -350.6, r: 1.3 }, majken: { x: -1.5, z: -351.0, h: -1.75 }, sail: 0.35, window: 0.24,
    // fixed shots (render.js: cam): the whole wheel from out in the meadow, and Majken's ladder up close
    camWheel: { x: ISLE.mill.x, y: 10.2, z: ISLE.mill.z + 4.05, cam: { x: ISLE.mill.x + 3, y: 6.5, z: ISLE.mill.z + 30, fov: 62 } },
    camLadder: { x: ISLE.mill.x, y: 3.0, z: ISLE.mill.z + 5.2, cam: { x: ISLE.mill.x + 4.5, y: 3.4, z: ISLE.mill.z + 14, fov: 60 } } },
  // 3. the lighthouse keeper outside his cottage
  fyren: { x: INGVAR.x, z: INGVAR.z, arrive: 22 },
  // the phone box on the quay (secrets.js), and where Ingvar sees you from the lighthouse
  booth: { x: -114.5, z: -139.6, r: 1.7, see: 22 },
  phoneTime: 90,           // Ingvar calls in a minute and a half (by car: 40–50 s)
  // 4. the chapel: its door, and inside: the altar, the psalm board, Inga out of the way
  chapel: { x: CHAPEL_DOOR.x, z: CHAPEL_DOOR.z, arrive: 16 },
  // (where you stand at the altar's lock and while you read the board: beside the view, not in it)
  altar: { x: R.x0 + 4, z: R.z0 + 11.95, r: 0.85, stand: { x: R.x0 + 3.1, z: R.z0 + 11.95 } },
  board: { x: R.x0 + 7.3, z: R.z0 + 2.55, r: 1.0, wall: { x: R.x0 + 7.95, z: R.z0 + 3.0 }, stand: { x: R.x0 + 7.35, z: R.z0 + 1.95 } },
  ingaAside: { x: R.x0 + 5.75, z: R.z0 + 11.75, h: -Math.PI / 2 },
  codes: { stump: '1971', altar: '287' },
  tipAt: 40,               // seconds without getting any closer before Gun texts a tip
  pestle: 30,              // pounds of the pestle
  pay: { base: 5000, solo: 250, phone: 500 },
};
export const HUNT_MAX = HUNT.pay.base + 4 * HUNT.pay.solo + HUNT.pay.phone;
// Majken's ladder up to the bottom of the sails (render.js draws it while she climbs): its foot on the grass
// just south of the rock under the sails, leaning in toward the tip of the one pointing down. She climbs
// `climb` metres up it (standing `out` metres off it, on the outside).
export const LADDER = { x: HUNT.mill.x, z: HUNT.mill.z + 6.3, lean: 0.6, len: 4.0, climb: 2.5, out: 0.3 };

const GUN_T = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const BENGT = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const MAJKEN = { who: 'Mjölnar-Majken', letter: 'M', color: '#b0874a' };
const INGVAR_T = { who: 'Fyrvaktaren Ingvar', letter: 'I', color: '#5b8fd6' };
const VOICE = { who: 'Rösten i telefonen', letter: '?', color: '#5a5f6b' };
const INGA = { who: 'Kyrkoherde Inga', letter: 'I', color: '#6b4fa0' };
const DAHLGREN = { who: 'Direktör Dahlgren', letter: 'D', color: '#5a5f6b' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const NOTE = { who: 'Arnes lapp', letter: 'A', color: '#c8a24a', note: true };
const LETTER = { who: 'Arnes brev', letter: 'A', color: '#c8a24a', note: true };
const DAHL_LOOK = { ...LOOKS.dahlgren, shirt: 0x3a3c41, style: ST.glasses | ST.jacket, accent: 0x2b2e35 };  // his suit, no disguise

// Arne's four riddles: the verse, the two lines for the objective box, Gun's tip and where it points
export const RIDDLES = [
  { verse: 'Där vårt hjärta är ristat i ek,\ndär börjar årets lilla lek.', obj: ['Där vårt hjärta är ristat i ek', 'där börjar årets lilla lek'],
    tip: 'Ristat i ek … nu minns jag! Vi ristade ett hjärta i en ek i parken vid Storgatan, sommaren -71. Eken blåste omkull för länge sedan, men stubben står kvar.',
    where: 'Tips: ekstubben i parken vid Storgatan' },
  { verse: 'Fyra vingar men inte en fjäder,\ndär mals mitt mjöl i alla väder.', obj: ['Fyra vingar men inte en fjäder', 'där mals mitt mjöl i alla väder'],
    tip: 'Fyra vingar och mjöl – det måste vara kvarnen på Norrholmen! Arne köpte allt sitt mjöl där. Fråga efter Mjölnar-Majken.',
    where: 'Tips: kvarnen på Norrholmen' },
  { verse: 'Om natten blinkar den, om dagen står den still –\nmin tystaste vän vet precis vad jag vill.', obj: ['Om natten blinkar den, om dagen står den still', 'min tystaste vän vet vad jag vill'],
    tip: 'Om natten blinkar den … fyren, förstås! Och hans tystaste vän, det är Ingvar. Han sa aldrig mycket, inte ens till Arne.',
    where: 'Tips: Ingvar vid fyren på Norrholmen' },
  { verse: 'Där du sa ja, under korset av guld,\nhar jag gömt något för din skull.\nKoden har hängt på tavlan i alla år –\nden mittersta psalmen. Gissa vad du får!', obj: ['Där du sa ja, under korset av guld', 'koden: den mittersta psalmen på tavlan'],
    tip: 'Där du sa ja … vi gifte oss i kapellet på Söderholmen, lilla vän! Korset av guld sitter på altaret.',
    where: 'Tips: kapellet på Söderholmen' },
];
// the steps a reload can pick up from (stats.hunt.at = index + 1)
const STEPS = ['seek0', 'seek1', 'seek2', 'phone', 'seek3', 'deliver'];

export function introPages(borrowedBack) {
  return [
    { ...GUN_T, text: 'Där är du ju, lilla vän! Titta här.' },
    { ...GUN_T, fx: 'envelope', text: '”Till min Gun, på vår bröllopsdag 1995.” Varje bröllopsdag gömde Arne en skattjakt åt mig – lappar över hela Sjuby, och längst bort en present.' },
    { ...GUN_T, text: 'Den här öppnade jag aldrig. Han blev sjuk den våren, och sedan … orkade jag inte. Kuvertet har legat i receptlådan i trettio år.' },
    { ...BENGT, text: 'Och på baksidan står det: ”Det viktigaste står inte i receptet.” Det är därför mina bullar aldrig blir som hans!' },
    { ...YOU, text: 'Så vi följer lapparna.' },
    { ...GUN_T, text: `DU följer dem, lilla vän – ryggen, du vet.${borrowedBack ? ' Den har inte blivit bättre av kyrkkaffet.' : ''} Och Arne skrev aldrig ut var nästa lapp låg. Han var en lurig man.` },
    { ...NOTE, text: RIDDLES[0].verse },
    { ...GUN_T, text: 'Ristat i ek … Klura du. Fastnar du så hör av dig – jag kanske minns.', last: 'JAG KLURAR' },
  ];
}
export function stumpPages() {
  return [
    { ...YOU, text: 'Den gick upp! En lapp, inslagen i vaxpapper. Arnes handstil.' },
    { ...NOTE, text: RIDDLES[1].verse, last: 'JAG KLURAR' },
  ];
}
export function majkenPages() {
  return [
    { ...MAJKEN, text: 'Du igen! Och med en lapp i Arnes handstil, ser jag.' },
    { ...MAJKEN, text: 'Pappa lovade Arne att gömma en plåtask där ingen kunde nå den: längst ut på en kvarnvinge. Han satte ett gult segel på just den vingen, så att han skulle hitta den igen.' },
    { ...MAJKEN, text: 'Den har snurrat runt i trettio år. Stanna vingen när den pekar rakt ner, så når jag den med stegen.' },
    { ...MAJKEN, text: 'Bromsen sitter här vid stenarna. Men vingarna är tunga – de rullar en bit innan de stannar!', last: 'TILL BROMSEN' },
  ];
}
export function millPages() {
  return [
    { ...MAJKEN, text: 'Här! Rostig, men hel. Pappa sa alltid att Arne var den ende som fick kvarnen att stanna med flit.' },
    { ...NOTE, text: RIDDLES[2].verse, last: 'JAG KLURAR' },
  ];
}
export function ingvarPages(knowsPhone) {
  return [
    { ...INGVAR_T, text: '…' },
    { ...YOU, text: 'Arne skrev att hans tystaste vän vet precis vad han ville.' },
    { ...INGVAR_T, text: 'Arne.' },
    { ...INGVAR_T, text: 'Våren -95 gav han mig en lapp. ”Läs den för Gun i telefon”, sa han. ”I kiosken på kajen. Där vi träffades.”' },
    { ...INGVAR_T, text: 'Hon stod i den kiosken och pratade i en hel timme, sommaren -70. Arne stod i kö bakom henne. Med en plåt bullar som kallnade.' },
    knowsPhone ? { ...YOU, text: 'Vänta. Rösten i telefonkiosken … det är ju du!' } : { ...YOU, text: 'Och hur ska du kunna ringa dit?' },
    { ...INGVAR_T, text: knowsPhone ? 'Jag har en kikare uppe i fyren. Ibland ringer jag. Folk svarar alltid.' : 'Jag har en kikare uppe i fyren. Jag ser kiosken härifrån.' },
    { ...INGVAR_T, text: 'Kör. Om en och en halv minut ringer jag.', last: 'KÖR!' },
  ];
}
export function callPages(knowsPhone, onTime) {
  return [
    knowsPhone ? { ...VOICE, text: '…Det är jag igen.' } : { ...INGVAR_T, text: '…Hallå. Det är Ingvar.' },
    { ...INGVAR_T, text: onTime ? 'I tid. Bra.' : 'Du är sen. Arne var också alltid sen.' },
    { ...INGVAR_T, text: 'Nu läser jag. Arne skrev:' },
    { ...NOTE, text: RIDDLES[3].verse },
    { ...INGVAR_T, text: 'Hälsa Gun. Säg att jag … nej. Säg ingenting.', last: 'LÄGG PÅ' },
  ];
}
export function ingaPages() {
  return [
    { ...INGA, text: 'Arnes skattjakt? Då förstår jag! En morgon våren -95 kom han hit och bad att få låna altaret en minut. Jag frågade aldrig varför.' },
    { ...INGA, text: 'Och psalmtavlan, ja … den har visat samma tre nummer sedan Arnes och Guns bröllop. Han bad prästen låta den vara. Det har jag också gjort.', last: 'TACK, INGA' },
  ];
}
export function boxPages() {
  return [
    { ...YOU, text: 'Den gick upp!' },
    { ...INGA, text: 'En gammal smörlåda – med A och G på locket! Och jag som har dammat det där altaret varje lördag i trettio år.' },
    { ...INGA, text: 'Den ska till Gun. Kör försiktigt – och hälsa henne från mig.', last: 'TILL GUN' },
  ];
}
export function openPages() {
  return [
    { ...GUN_T, text: 'Du hittade den! Arnes gamla smörlåda … med A och G på locket.' },
    { ...GUN_T, fx: 'open', text: 'Ett brev. Och … mammas gamla mortel! Den har jag letat efter i trettio år.' },
    { ...LETTER, text: 'Min Gun. Grattis på bröllopsdagen! Du har alltid undrat varför mina bullar smakar som de gör.' },
    { ...LETTER, text: 'Receptet kan vem som helst stjäla. Men där står inte att jag stöter kardemumman själv, i din mammas mortel, samma morgon som jag bakar. Aldrig malen ur påse.' },
    { ...LETTER, text: 'Och så tänker jag på dig medan degen jäser. Det går inte att skriva i ett recept.\nDin Arne' },
    { ...GUN_T, text: '… Typiskt honom.' },
    { ...BENGT, text: 'Malen kardemumma ur påse. Precis vad jag har använt i en hel vecka!' },
    { ...BENGT, fx: 'mortar', text: 'Här, ta morteln. Du har förtjänat att stöta första satsen.', last: 'STÖT!' },
  ];
}
export function tastePages(amount) {
  return [
    { ...BENGT, text: 'Nygräddade, med stött kardemumma. Varsågoda!' },
    { ...GUN_T, text: '…' },
    { ...GUN_T, text: 'Det är Arnes bullar. Precis som han bakade dem.' },
    { ...DAHLGREN, text: 'Ursäkta … Kexfabriken ville inte ha mig, inte ens som diskare. Men vad är det som doftar så här?' },
    { ...DAHLGREN, text: 'Får jag …? … Stött kardemumma. I trettio år köpte jag den malen. TRETTIO ÅR!' },
    { ...GUN_T, text: 'Du kan börja i morgon, Dahlgren. Klockan fem. Med disken.' },
    { ...GUN_T, text: `Och du, lilla vän: tack. Det här var Arnes sista present – och den kom fram till slut. Ta de här ${fmt(amount)} kronorna också.`, last: 'TACK!' },
  ];
}

// the checkpoint in the save (stats are saved): { at, solo, onTime }
export function huntSave(g) { return g.stats.hunt && typeof g.stats.hunt === 'object' ? g.stats.hunt : null; }
export const hidden = (g, x, z) => { const p = g.player, d = Math.hypot(x - p.x, z - p.z); return d > 70 || (d > 35 && !g.visible(x, z)); };
export function stand(g, q, x, z, h) {
  q.x = x; q.z = z; q.y = g.world.groundHeight(x, z); q.state = 'stand';
  q.h = q.standH = h; q.vx = q.vz = 0;
  q.body.x = q.x; q.body.y = q.y; q.body.z = q.z; q.body.h = q.h; q.body.pose = 0;
}

export function pinGun(g, flag) {
  const gun = flag.gun;
  flag.huntPin = true; flag.pinned = true; flag.hush = true;
  gun.away = true; gun.konditori = true; gun.disguised = false; gun.wave = false;
  gun.body.look = GUN_LOOK;
  stand(g, gun, HUNT.gun.x, HUNT.gun.z, HUNT.gun.h);
}

// While the hunt is open, tant Gun and Bagar-Bengt wait outside the konditori (put there out of sight);
// afterwards they go back to normal when nobody is looking. And a hunt you had started is picked up as
// soon as you follow it (startOnAccept, from the checkpoint).
export function huntWorld(mgr) {
  const g = mgr.game, flag = mgr.flag, gun = flag.gun;
  const open = mgr.isOpen('skattjakt'), job = mgr.active && mgr.active.id === 'skattjakt' ? mgr.active : null;
  const c = mgr.jobs.find((q) => q.id === 'skattjakt');
  const S = huntSave(g);
  if (c) c.startOnAccept = !!(open && S && S.at > 0);
  // (Kyrkkaffet starts in Gun's garden: while you follow that one, she is at home)
  const church = mgr.tracked === 'kyrkkaffe' || (mgr.active && mgr.active.id === 'kyrkkaffe');
  if (open && (!mgr.active || job) && !church) {
    if (!flag.huntPin && hidden(g, HUNT.gun.x, HUNT.gun.z) && hidden(g, gun.x, gun.z)) pinGun(g, flag);
    const B = mgr.huntBengt;
    if ((!B || !g.peds.list.includes(B)) && hidden(g, HUNT.bengt.x, HUNT.bengt.z)) mgr.huntBengt = spawnPed(g, { ...BENGT_LOOK }, HUNT.bengt.x, HUNT.bengt.z, HUNT.bengt.h, 'bengt-hunt');
    return;
  }
  if (job) return;
  // done (or not yet offered): back to normal out of sight
  if (flag.huntPin && hidden(g, gun.x, gun.z) && !mgr.flaskHoldsGun) { flag.huntPin = false; flag.pinned = false; flag.hush = false; } // ((v1.12) Flaskposten keeps her there)
  const B = mgr.huntBengt;
  if (B && hidden(g, B.x, B.z)) { removePed(g, B); mgr.huntBengt = null; }
  const M = mgr.huntMajken;
  if (M && hidden(g, M.x, M.z)) { removePed(g, M); mgr.huntMajken = null; }
  const Dg = mgr.huntDahl;
  if (Dg && hidden(g, Dg.x, Dg.z)) { removePed(g, Dg); mgr.huntDahl = null; }
}

export class HuntJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'skattjakt';
    // intro → seek (k = 0 stump, 1 mill, 2 lighthouse, 3 chapel) → stump/lock → mill/brake → ingvar → phone →
    // call → chapel (outside and in) → deliver → gun → pestle → baking → taste → done
    this.stage = 'intro';
    this.prompt = null;
    this.k = 0;
    this.solo = 0; this.onTime = false;
    this.tip = false; this.tipT = 0; this.lastD = 0; this.sampleT = 0;
    this.near = false;        // close to the place the riddle means (the arrow shows the spot)
    this.carry = null;        // 'box' (Arne's butter box) | 'mortar' – render.js puts it in your hands
    this.stumpTin = false; this.millTin = false; this.altarOpen = false;
    this.phoneT = 0; this.ringT = 0; this.ringing = false;
    this.brakeMiss = 0; this.braking = false; this.stopped = false;
    this.pounds = 0; this.poundAt = -9;
    this.tray = false;        // Bengt holds a tray of fresh buns (render.js)
    this.holdsChapel = true;  // the chapel's buttons are the job's while it runs
    this.holdsPhone = true;   // and the phone box stays quiet until Ingvar calls (secrets.js)
  }

  get gun() { return this.mgr.flag.gun; }
  get bengt() { return this.mgr.huntBengt; }
  get inga() { return this.game.indoors.priest; }
  get organ() { return this.game.indoors.organ; }
  get riddle() { return RIDDLES[this.k]; }
  // tapping the objective box asks Gun for a tip (main.js) while a riddle is unsolved
  get tipReady() { return this.stage === 'seek' && !this.tip; }

  save(at) {
    const g = this.game;
    g.stats.hunt = { at, solo: this.solo, onTime: this.onTime };
    g.emit('progress', {});
  }

  start() {
    const g = this.game, m = this.mgr, p = g.player;
    const S = huntSave(g);
    if (S && S.at > 0 && S.at <= STEPS.length) { this.resume(S); return; }
    this.ensureKonditori();
    const gun = this.gun, B = this.bengt;
    this.standAt(HUNT.you.x, HUNT.you.z, gun.x, gun.z);
    for (const q of [gun, B]) if (q) { q.standH = q.h = Math.atan2(p.x - q.x, p.z - q.z); q.body.h = q.h; }
    g.camFocus = { ...HUNT.cam, owner: 'hunt' };
    m.setObjective('Arnes skattjakt', 'Sjuby Konditori');
    m.later(0.7, () => g.emit('talk', { id: this.id, pages: introPages(m.done.has('kyrkkaffe')) }), this);
  }

  // a reload in the middle of it: on from the note you were on
  resume(S) {
    const g = this.game, m = this.mgr;
    this.solo = S.solo || 0; this.onTime = !!S.onTime;
    const step = STEPS[S.at - 1];
    if (step === 'phone') {
      this.toPhone(false);
      g.emit('toast', { text: 'Arnes skattjakt fortsätter: kör till telefonkiosken på kajen – Ingvar ringer när han ser dig.', long: true });
      return;
    }
    if (step === 'deliver') {
      this.toDeliver();
      g.emit('toast', { text: 'Arnes skattjakt fortsätter: ta Arnes låda till Gun på konditoriet.', long: true });
      return;
    }
    const k = +step.slice(4);
    this.seek(k);
    this.stage = 'reread';
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: [{ ...NOTE, text: RIDDLES[k].verse, last: 'JAG KLURAR' }] }), this);
  }

  // Gun and Bengt by the door (huntWorld put them there; here in case it has not happened yet)
  ensureKonditori() {
    const g = this.game, m = this.mgr, flag = m.flag, gun = flag.gun;
    if (!flag.huntPin || Math.hypot(gun.x - HUNT.gun.x, gun.z - HUNT.gun.z) > 1) pinGun(g, flag);
    if (!m.huntBengt || !g.peds.list.includes(m.huntBengt)) m.huntBengt = spawnPed(g, { ...BENGT_LOOK }, HUNT.bengt.x, HUNT.bengt.z, HUNT.bengt.h, 'bengt-hunt');
  }

  // ---------------------------------------------------------------- the riddles
  place(k) {
    if (k === 0) return { x: HUNT.stump.x, z: HUNT.stump.z, arrive: HUNT.stump.arrive };
    if (k === 1) return { x: HUNT.mill.x, z: HUNT.mill.z, arrive: HUNT.mill.arrive };
    if (k === 2) return { x: HUNT.fyren.x, z: HUNT.fyren.z, arrive: HUNT.fyren.arrive };
    return { x: HUNT.chapel.x, z: HUNT.chapel.z, arrive: HUNT.chapel.arrive };
  }

  dist(k = this.k) {
    const g = this.game, p = g.player, T = p.inCar ? p.car : p, P = this.place(k);
    return Math.hypot(T.x - P.x, T.z - P.z);
  }

  seek(k) {
    const g = this.game, m = this.mgr;
    this.stage = 'seek'; this.k = k;
    this.tip = false; this.tipT = 0; this.sampleT = 0; this.lastD = this.dist(k); this.near = false;
    this.save(STEPS.indexOf('seek' + k) + 1);
    // the people at the next place are there already (out of sight, most likely)
    if (k === 1) this.ensureMajken();
    if (k === 2) this.ensureIngvar();
    m.setObjective(this.riddle.obj[0], this.riddle.obj[1]);
  }

  ensureMajken() {
    const g = this.game, m = this.mgr, M = HUNT.mill.majken;
    if (!m.huntMajken || !g.peds.list.includes(m.huntMajken)) m.huntMajken = spawnPed(g, { ...MAJKEN_LOOK }, M.x, M.z, M.h, 'majken');
    return m.huntMajken;
  }

  ensureIngvar() {
    const g = this.game, m = this.mgr;
    if (!m.ingvar || !g.peds.list.includes(m.ingvar)) m.ingvar = spawnIngvar(g);
    return m.ingvar;
  }

  // Gun's tip: a text, and the GPS shows the way
  askTip() {
    if (!this.tipReady) return false;
    const g = this.game, m = this.mgr;
    this.tip = true;
    m.sms(WHO.gun, this.riddle.tip);
    m.setObjective(this.riddle.obj[0], this.riddle.where);
    m.later(1.2, () => g.emit('toast', { text: 'Gun skickade ett tips – följ den gula linjen.', long: false }), this);
    return true;
  }

  seekStep(dt) {
    const g = this.game, d = this.dist();
    // the tip comes after a while without getting any closer
    this.sampleT += dt;
    if (this.sampleT >= 1) {
      if (this.lastD - d < this.sampleT * 1.0) this.tipT += this.sampleT;
      this.lastD = d; this.sampleT = 0;
    }
    if (!this.tip && this.tipT >= HUNT.tipAt) this.askTip();
    const P = this.place(this.k);
    this.near = d < P.arrive;
    if (!this.near) return;
    if (!this.tip) {
      this.solo++;
      g.emit('toast', { text: `Gåtan löst utan tips! +${HUNT.pay.solo} kr på slutet.`, long: true });
    }
    this.arrive(this.k);
  }

  arrive(k) {
    const g = this.game, m = this.mgr;
    if (k === 0) {
      this.stage = 'stump'; this.stumpTin = true;
      g.emit('toast', { text: 'Där – en gammal ekstubbe med ett hjärta i barken. Undersök den!', long: true });
      m.setObjective('Undersök ekstubben', 'Ett hjärta i barken');
    } else if (k === 1 || k === 2) {
      // walk up and talk to Majken by the millstones, or Ingvar outside his cottage
      this.stage = 'meet';
      if (k === 1) { this.millTin = true; this.ensureMajken(); } else this.ensureIngvar();
      g.emit('toast', { text: k === 1 ? 'Kvarnen! Där står Mjölnar-Majken vid stenarna.' : 'Fyren – och där står Ingvar, som vanligt.', long: false });
    } else {
      this.stage = 'chapel';
      g.emit('toast', { text: 'Kapellet där Arne och Gun gifte sig.', long: false });
    }
  }

  // a close-up of something: you stand to the side of it (facing it), out of the camera's way
  standAt(x, z, fx, fz) {
    const g = this.game, p = g.player;
    p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0;
    p.h = Math.atan2(fx - x, fz - z); p.frozen = true;
  }

  // ---------------------------------------------------------------- 1. the oak stump: the tin box
  openStumpLock() {
    const g = this.game, p = g.player, S = HUNT.stump;
    this.standAt(S.kneel.x, S.kneel.z, S.x, S.z);
    g.emit('toast', { text: 'Under rötterna ligger en liten plåtask – med ett kodlås!', long: true });
    // close in on the carved heart, so the code is above the wheels
    g.camFocus = { x: S.x + 0.1, y: 0.16, z: S.z + 0.9, yaw: Math.PI, owner: 'hunt', near: true, dist: 1.95, height: 0.85 };
    g.lock = new CodeLock(g, {
      code: HUNT.codes.stump, kicker: 'PARKEN · ARNES PLÅTASK', title: 'KODLÅS',
      hint: 'Fyra siffror. Arne valde alltid något som Gun aldrig skulle glömma.',
      help: 'Titta på hjärtat i stubben.',
      onOpen: () => this.stumpOpened(),
      onStop: () => this.lockStopped(),
    });
    this.stage = 'stumpLock';
  }

  stumpOpened() {
    const g = this.game, m = this.mgr;
    g.lock = null; this.stumpTin = false;
    this.stage = 'stumpNote';
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: stumpPages() }), this);
  }

  lockStopped() {
    const g = this.game, p = g.player;
    g.lock = null;
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'hunt') g.camFocus = null;
    if (this.stage === 'stumpLock') this.stage = 'stump';
    if (this.stage === 'altarLock') this.stage = 'chapel';
  }

  // at the mill or the lighthouse: PRATA when you are close (on foot)
  meetStep() {
    const g = this.game, m = this.mgr, p = g.player, mill = this.k === 1;
    const q = mill ? this.ensureMajken() : this.ensureIngvar();
    if (p.state === 'foot' && !p.frozen && Math.hypot(p.x - q.x, p.z - q.z) < 2.0) this.prompt = 'PRATA';
    m.setObjective(mill ? 'Prata med Mjölnar-Majken' : 'Prata med Ingvar', p.inCar ? (mill ? 'Kliv ur vid kvarnen' : 'Kliv ur vid fyren') : (mill ? 'Hon står vid kvarnstenarna' : 'Utanför stugan vid fyren'));
  }

  // ---------------------------------------------------------------- 2. the windmill: stop the yellow sail
  meetMajken() {
    const g = this.game, m = this.mgr, p = g.player, M = this.ensureMajken();
    this.stage = 'majken'; this.millTin = true;
    p.frozen = true; p.vx = p.vz = 0;
    M.standH = M.h = Math.atan2(p.x - M.x, p.z - M.z); M.body.h = M.h;
    p.h = Math.atan2(M.x - p.x, M.z - p.z);
    g.camFocus = { x: (p.x + M.x) / 2, y: 0.5, z: (p.z + M.z) / 2, yaw: p.h - 0.6, owner: 'hunt', near: true };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: majkenPages() }), this);
  }

  // the sail with the yellow cloth: how far from straight down (minus: still on its way down)
  sailOff() { return wrapAngle(HUNT.mill.sail + this.game.millA - Math.PI); }

  brakeStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, L = HUNT.mill.lever, M = m.huntMajken;
    const atLever = p.state === 'foot' && !p.frozen && Math.hypot(p.x - L.x, p.z - L.z) < L.r;
    if (atLever) this.prompt = 'BROMSA';
    const held = atLever && !!(g.input && g.input.actionHeld) && !(this.missT > 0);
    if (this.missT > 0) this.missT -= dt;
    if (held && !this.braking) g.emit('mill', { kind: 'brake' });
    this.braking = held;
    g.millHold = held;
    if (held) { p.vx = p.vz = 0; p.h = Math.atan2(L.x - 0.6 - p.x, L.z - 0.9 - p.z); p.body.pose = 1; if ((this.creakT = (this.creakT || 0) - dt) <= 0) { this.creakT = 0.32; g.emit('mill', { kind: 'creak' }); } }
    // while you are at the lever, the camera stands back and shows the whole wheel of sails
    if (atLever || this.braking) g.camFocus = { ...HUNT.mill.camWheel, owner: 'hunt' };
    else if (g.camFocus && g.camFocus.owner === 'hunt' && !g.camFocus.near) g.camFocus = null;
    m.setObjective('Stanna den gula vingen rakt ner', held ? 'Håll i …' : 'Håll in BROMSA vid stenarna – vingarna rullar en bit');
    if (!held) { this.stopped = false; return; }
    if (g.millW > 1e-4 || this.stopped) return;
    // stopped with the brake on: is the yellow sail at the bottom?
    this.stopped = true;
    g.emit('mill', { kind: 'stop' });
    const off = this.sailOff();
    if (Math.abs(off) < HUNT.mill.window) { this.millGot(); return; }
    this.brakeMiss++;
    this.missT = 1.1;               // the brake lets go again (Majken releases it)
    const close = Math.abs(off) < HUNT.mill.window * 2;
    const text = off < 0 ? (close ? 'Nästan! Lite senare.' : 'För tidigt – den är inte nere än!') : (close ? 'Nästan! Lite tidigare.' : 'För sent – den har redan passerat!');
    if (M) g.emit('say', { who: M, text });
  }

  millGot() {
    const g = this.game, m = this.mgr, M = m.huntMajken, p = g.player;
    this.stage = 'millWait'; this.climbT = 0; this.climbAt = null; this.climbing = false;
    this.braking = false;
    g.millHold = true;             // held still while Majken climbs up
    p.frozen = true; p.vx = p.vz = 0;
    if (M) { g.emit('say', { who: M, text: 'Perfekt! Håll i!' }); M.arrived = false; M.goto([[LADDER.x, LADDER.z + LADDER.out]], 1.8, Math.PI); }
    g.camFocus = { ...HUNT.mill.camLadder, owner: 'hunt' };
    g.emit('toast', { text: 'Majken reser stegen mot vingen och klättrar upp …', long: true });
  }

  // Majken up the ladder to the sail and down again with the tin (millWait: about 6 s)
  climbStep(dt) {
    const g = this.game, m = this.mgr, M = m.huntMajken, p = g.player;
    this.climbT += dt;
    if (M && this.climbAt == null && ((M.state === 'stand' && M.arrived) || this.climbT > 4)) {
      // at the foot of the ladder (or put there if she got stuck on the way): up she goes
      this.climbAt = this.climbT; this.climbing = true;
      M.state = 'lounge'; M.x = LADDER.x; M.z = LADDER.z + LADDER.out; M.h = M.standH = Math.PI; M.vx = M.vz = 0;
      M.body.pose = 0; M.body.legAmp = 0; M.body.armAmp = 0;
    }
    if (M && this.climbing) {
      const u = this.climbT - this.climbAt;
      const up = u < 2.1 ? Math.min(1, u / 1.0) : Math.max(0, 1 - (u - 2.1) / 0.9);
      const along = up * LADDER.climb;      // up the leaning ladder: higher, and in toward the mill
      M.z = LADDER.z + LADDER.out - along * Math.sin(LADDER.lean);
      M.y = g.world.groundHeight(LADDER.x, LADDER.z) + along * Math.cos(LADDER.lean);
      M.body.pose = up > 0.95 ? 1 : 0;
      const moving = up > 0.02 && up < 0.98;
      if (moving) M.body.phase += dt * 7;
      M.body.legAmp = moving ? 0.45 : 0; M.body.armAmp = moving ? 0.4 : 0;
      if (u > 1.6 && this.millTin) { this.millTin = false; this.tinTaken = true; g.emit('paper', {}); }
      if (u >= 3.0) {
        // down again: over to you with the tin
        this.climbing = false; M.state = 'stand'; M.y = g.world.groundHeight(M.x, M.z); M.body.pose = 0; M.body.legAmp = 0;
        const dx = M.x - p.x, dz = M.z - p.z, d = Math.hypot(dx, dz) || 1;
        M.arrived = false; M.goto([[p.x + (dx / d) * 1.15, p.z + (dz / d) * 1.15]], 1.4, Math.atan2(-dx, -dz));
      }
    }
    const back = this.climbAt != null && !this.climbing && ((M && M.arrived) || this.climbT - this.climbAt >= 6.5);
    if (this.stage === 'millWait' && (back || (!M && this.climbT > 2))) {
      this.millTin = false; this.tinTaken = true;
      if (M) { p.h = Math.atan2(M.x - p.x, M.z - p.z); M.standH = M.h = Math.atan2(p.x - M.x, p.z - M.z); M.body.h = M.h; }
      g.camFocus = M ? { x: (p.x + M.x) / 2, y: 0.5, z: (p.z + M.z) / 2, yaw: p.h - 0.6, owner: 'hunt', near: true } : { x: p.x + 0.8, y: 0.6, z: p.z + 0.2, yaw: p.h - 0.6, owner: 'hunt', near: true };
      this.stage = 'millNote';
      m.later(0.5, () => g.emit('talk', { id: this.id, pages: millPages() }), this);
    }
  }

  // ---------------------------------------------------------------- 3. the lighthouse: Ingvar
  meetIngvar() {
    const g = this.game, m = this.mgr, p = g.player, I = this.ensureIngvar();
    this.stage = 'ingvar';
    p.frozen = true; p.vx = p.vz = 0;
    I.standH = I.h = Math.atan2(p.x - I.x, p.z - I.z); I.body.h = I.h;
    p.h = Math.atan2(I.x - p.x, I.z - p.z);
    g.camFocus = { x: (p.x + I.x) / 2, y: 0.5, z: (p.z + I.z) / 2, yaw: p.h - 0.6, owner: 'hunt', near: true };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: ingvarPages(this.knowsPhone()) }), this);
  }

  knowsPhone() { const s = this.mgr.secrets; return !!(s && s.has('phone')); }

  // two minutes to the phone box on the quay; when he sees you there it rings
  toPhone(timed) {
    const g = this.game, m = this.mgr;
    this.stage = 'phone';
    this.timed = timed; this.phoneT = timed ? HUNT.phoneTime : 0;
    this.ringing = false; this.ringT = 0;
    this.save(STEPS.indexOf('phone') + 1);
    m.setObjective('Till telefonkiosken på kajen', timed ? `Ingvar ringer om ${mmss(this.phoneT)}` : 'Ingvar ringer när han ser dig där');
  }

  phoneStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, B = HUNT.booth;
    if (this.timed) {
      this.phoneT -= dt;
      if (this.phoneT <= 0) {
        this.timed = false; this.phoneT = 0;
        g.emit('toast', { text: 'Tiden har gått ut. Ingvar ringer ändå när han ser dig vid kiosken.', long: true });
      }
    }
    const T = p.inCar ? p.car : p, d = Math.hypot(T.x - B.x, T.z - B.z);
    if (!this.ringing && d < B.see) {
      this.ringing = true; this.ringT = 0;
      this.onTime = this.timed;
      this.timed = false;
      if (this.onTime) g.emit('toast', { text: `I tid! Ingvar ser dig i kikaren. +${HUNT.pay.phone} kr på slutet.`, long: true });
    }
    if (this.ringing) {
      if ((this.ringT -= dt) <= 0) { this.ringT = 2.6; g.emit('ring', { x: B.x, z: B.z }); }
      if (p.state === 'foot' && !p.frozen && Math.hypot(p.x - B.x, p.z - B.z) < B.r) this.prompt = 'SVARA';
      m.setObjective('Svara i telefonen', p.inCar ? 'Kliv ur – det ringer i kiosken!' : 'Det ringer i kiosken!');
    } else m.setObjective('Till telefonkiosken på kajen', this.timed ? `Ingvar ringer om ${mmss(this.phoneT)}` : 'Ingvar ringer när han ser dig där');
  }

  answer() {
    const g = this.game, m = this.mgr, B = HUNT.booth;
    this.stage = 'call'; this.ringing = false;
    this.standAt(B.x, B.z - 0.95, B.x, B.z - 3);      // in the box, the receiver to your ear (pose: update)
    g.camFocus = { x: B.x, y: 0.9, z: B.z - 0.9, yaw: Math.PI - 0.55, owner: 'hunt', near: true };
    m.later(0.4, () => g.emit('talk', { id: this.id, pages: callPages(this.knowsPhone(), this.onTime) }), this);
  }

  // ---------------------------------------------------------------- 4. the chapel
  goIn() {
    const g = this.game, ind = g.indoors;
    this.stage = 'entering';
    ind.enter(() => {
      this.stage = 'chapel';
      const q = this.inga;
      if (q) stand(g, q, HUNT.ingaAside.x, HUNT.ingaAside.z, HUNT.ingaAside.h);
      g.emit('toast', { text: 'Under korset av guld … och psalmtavlan hänger på väggen vid bänkarna.', long: true });
    }, 'chapel');
  }

  chapelStep() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    if (!g.indoor) {
      // outside: in through the tower door
      const atDoor = p.state === 'foot' && !p.frozen && Math.hypot(p.x - CHAPEL_DOOR.x, p.z - CHAPEL_DOOR.z) < CHAPEL_DOOR.r && !ind.busy;
      if (atDoor) this.prompt = 'GÅ IN';
      m.setObjective('Under korset av guld', atDoor ? 'Gå in i kapellet' : p.inCar ? 'Kliv ur vid kapellet' : 'Dörren i kapellets torn');
      return;
    }
    if (ind.where !== 'chapel' || ind.busy || p.state !== 'foot' || p.frozen) return;
    const A = HUNT.altar, Bd = HUNT.board, q = this.inga;
    if (Math.hypot(p.x - A.x, p.z - A.z) < A.r) this.prompt = 'UNDERSÖK';
    else if (Math.hypot(p.x - Bd.x, p.z - Bd.z) < Bd.r) this.prompt = 'TITTA';
    else if (q && Math.hypot(p.x - q.x, p.z - q.z) < 1.5) this.prompt = 'PRATA';
    else if (Math.hypot(p.x - CHAPEL_KAFFE.rope.x, p.z - CHAPEL_KAFFE.rope.z) < CHAPEL_KAFFE.rope.r && g.time - ind.ropeAt > 1.1) this.prompt = 'RINGA';
    m.setObjective('Under korset av guld', 'Koden: den mittersta psalmen på tavlan');
  }

  lookAtBoard() {
    const g = this.game, W = HUNT.board.wall;
    this.sawBoard = true;
    this.standAt(HUNT.board.stand.x, HUNT.board.stand.z, W.x, W.z);
    g.camFocus = { x: W.x - 0.05, y: 1.6, z: W.z, yaw: Math.PI / 2, owner: 'hunt', near: true, dist: 2.7, height: 1.5 };
    this.boardT = 3.0;
    g.emit('toast', { text: 'Psalmtavlan: 12 · 287 · 649. Samma tre psalmer sedan bröllopet 1972.', long: true });
  }

  openAltarLock() {
    const g = this.game, A = HUNT.altar;
    this.standAt(A.stand.x, A.stand.z, A.stand.x, A.z + 1);
    g.emit('toast', { text: 'Bakom altarduken, under guldkorset, sitter en liten låda av trä – med ett kodlås!', long: true });
    g.camFocus = { x: A.x, y: 0.42, z: A.z + 0.3, yaw: 0, owner: 'hunt', near: true, dist: 2.4, height: 1.25 };
    g.lock = new CodeLock(g, {
      code: HUNT.codes.altar, kicker: 'KAPELLET · ARNES LÅDA', title: 'KODLÅS',
      hint: 'Tre siffror: ”den mittersta psalmen”.',
      help: 'Psalmtavlan hänger på väggen vid bänkarna. Ta den mittersta.',
      onOpen: () => this.altarOpened(),
      onStop: () => this.lockStopped(),
    });
    this.stage = 'altarLock';
  }

  altarOpened() {
    const g = this.game, m = this.mgr, p = g.player, q = this.inga;
    g.lock = null; this.altarOpen = true;
    this.carry = 'box';
    g.emit('keys', { item: 'box' });
    this.stage = 'boxTalk';
    if (q) { q.standH = q.h = Math.atan2(p.x - q.x, p.z - q.z); q.body.h = q.h; }
    if (q) p.h = Math.atan2(q.x - p.x, q.z - p.z);
    g.camFocus = { x: (p.x + (q ? q.x : p.x)) / 2, y: 0.6, z: p.z - 0.4, yaw: 0.25, owner: 'hunt', near: true };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: boxPages() }), this);
  }

  // ---------------------------------------------------------------- 5. back to the konditori
  toDeliver() {
    const g = this.game, m = this.mgr;
    this.stage = 'deliver'; this.carry = 'box';
    this.save(STEPS.indexOf('deliver') + 1);
    this.ensureKonditori();
    m.setObjective('Ta Arnes låda till Gun', 'Konditoriet vid torget');
  }

  deliverStep() {
    const g = this.game, m = this.mgr, p = g.player;
    if (g.indoor) { m.setObjective('Ta Arnes låda till Gun', 'Gå ut ur kapellet'); return; }
    const car = p.inCar ? p.car : null, T = car || p;
    const d = Math.hypot(T.x - KONDITORI.x, T.z - KONDITORI.z);
    if (d < 2.4 && (!car || car.speed < 3)) { this.finale(); return; }
    m.setObjective('Ta Arnes låda till Gun', 'Konditoriet vid torget');
  }

  finale() {
    const g = this.game, m = this.mgr, p = g.player;
    this.ensureKonditori();
    if (p.inCar) p.exitCar();
    p.state = 'foot'; p.x = HUNT.you.x; p.z = HUNT.you.z; p.y = g.world.groundHeight(p.x, p.z); p.vx = p.vz = 0;
    p.frozen = true;
    const gun = this.gun, B = this.bengt;
    for (const q of [gun, B]) if (q) { stand(g, q, q === gun ? HUNT.gun.x : HUNT.bengt.x, q === gun ? HUNT.gun.z : HUNT.bengt.z, 0); q.standH = q.h = Math.atan2(p.x - q.x, p.z - q.z); q.body.h = q.h; }
    p.h = Math.atan2(gun.x - p.x, gun.z - p.z);
    g.camFocus = { ...HUNT.cam, owner: 'hunt' };
    this.stage = 'gun';
    m.setObjective('Arnes skattjakt', 'Sjuby Konditori');
    m.later(0.8, () => g.emit('talk', { id: this.id, pages: openPages() }), this);
  }

  pestleStep() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = 'STÖT';
    if (g.time - this.poundAt < 0.16) p.body.pose = 1;
    // (you are frozen in place, so the button press comes straight from the input)
    if (g.input && g.input.action && g.time - this.poundAt > 0.06) {
      this.pounds++; this.poundAt = g.time;
      g.emit('pestle', { n: this.pounds });
      const B = this.bengt;
      if (B && this.pounds === 10) g.emit('say', { who: B, text: 'Hårdare! Arne hördes ända till torget.' });
      if (B && this.pounds === 22) g.emit('say', { who: B, text: 'Känn doften!' });
      if (this.pounds >= HUNT.pestle) { this.bake(); return; }
    }
    m.setObjective('Stöt kardemumman', `Tryck STÖT · ${this.pounds} av ${HUNT.pestle}`);
  }

  // the dough rises, the buns bake – and someone else comes across the square
  bake() {
    const g = this.game, m = this.mgr;
    this.stage = 'baking'; this.prompt = null; this.bakeT = 0;
    g.emit('toast', { text: 'Doften av kardemumma sprider sig över hela torget!', long: true });
    m.later(1.6, () => g.emit('fade', { on: true }), this);
    m.later(2.3, () => {
      this.carry = null; this.tray = true;
      const p = g.player, gun = this.gun;
      if (gun) p.h = Math.atan2(gun.x - p.x, gun.z - p.z);
      g.camFocus = { ...HUNT.camTaste, owner: 'hunt' };
      // (behind the fade) Dahlgren comes across the square, following his nose
      const [fx, fz] = HUNT.dahl.from, [tx, tz] = HUNT.dahl.to;
      if (!m.huntDahl || !g.peds.list.includes(m.huntDahl)) m.huntDahl = spawnPed(g, { ...DAHL_LOOK }, fx, fz, Math.PI, 'dahlgren');
      const Dg = m.huntDahl;
      Dg.x = fx; Dg.z = fz; Dg.y = g.world.groundHeight(fx, fz);
      Dg.arrived = false; Dg.goto([[tx, tz]], 1.3, Math.atan2(HUNT.gun.x - tx, HUNT.gun.z - tz));
      g.emit('toast', { text: 'En timme senare …', long: true });
    }, this);
    m.later(3.0, () => g.emit('fade', { on: false }), this);
  }

  // the buns are out of the oven: everyone tastes once Dahlgren is here (or after a while anyway)
  bakeStep(dt) {
    const g = this.game, Dg = this.mgr.huntDahl;
    this.bakeT += dt;
    if (this.bakeT < 4.6 || (Dg && !Dg.arrived && this.bakeT < 9)) return;
    this.stage = 'taste';
    this.amount = HUNT.pay.base + this.solo * HUNT.pay.solo + (this.onTime ? HUNT.pay.phone : 0);
    g.emit('talk', { id: this.id, pages: tastePages(this.amount) });
  }

  // ---------------------------------------------------------------- the talks
  talkFx(fx) {
    if (fx === 'mortar') this.carry = 'mortar';
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'hunt') g.camFocus = null; };
    switch (this.stage) {
      case 'intro':
        free(); this.seek(0);
        m.later(1.0, () => g.emit('hint', { id: 'hunttip', touch: 'Lös gåtan och ta dig dit. Fastnar du? Tryck på uppdragsrutan så skickar Gun ett tips.', keys: 'Lös gåtan och ta dig dit. Fastnar du? Klicka på uppdragsrutan så skickar Gun ett tips.' }), this);
        return;
      case 'reread': free(); this.stage = 'seek'; return;
      case 'stumpNote': free(); this.seek(1); this.secret('heart'); return;
      case 'majken':
        free(); this.stage = 'brake';
        m.later(0.6, () => g.emit('hint', { id: 'millbrake', touch: 'Ställ dig vid bromsen och håll inne BROMSA. Släpp och försök igen om vingen stannar fel.', keys: 'Ställ dig vid bromsen och håll inne E. Släpp och försök igen om vingen stannar fel.' }), this);
        return;
      case 'millNote': free(); g.millHold = false; this.seek(2); return;
      case 'ingvar': free(); this.toPhone(true); return;
      case 'call': free(); this.seek(3); this.secret('phone'); return;
      case 'chapelTalk': free(); this.stage = 'chapel'; return;
      case 'boxTalk': free(); this.toDeliver(); g.emit('toast', { text: 'Gå ut och ta lådan till Gun på konditoriet.', long: true }); return;
      case 'gun':
        this.stage = 'pestle';
        p.frozen = true;
        p.h = Math.PI + 0.35;          // (turned toward the square, the mortar in front of you)
        g.camFocus = { ...HUNT.camPestle, x: p.x, z: p.z, owner: 'hunt' };
        m.later(0.4, () => g.emit('hint', { id: 'pestle', touch: 'Tryck STÖT så fort du kan!', keys: 'Tryck E så fort du kan!' }), this);
        return;
      case 'taste': this.finish(); return;
    }
  }

  // (the secret is found on the way, if you had not found it already)
  secret(id) { const s = this.mgr.secrets; if (s && !s.has(id)) this.mgr.later(1.2, () => s.find(id), this); }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    g.stats.huntSolo = this.solo;
    g.stats.huntOnTime = this.onTime ? 1 : 0;
    g.stats.hunt = { at: STEPS.length + 1, solo: this.solo, onTime: this.onTime };
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Arnes skattjakt', amount: this.amount });
    m.later(30, () => g.emit('sms', { from: 'Fyrvaktaren Ingvar', text: 'Bra.', color: INGVAR_T.color }), null);
  }

  // ---------------------------------------------------------------- per step
  update(dt) {
    const g = this.game, p = g.player;
    this.prompt = null;
    if (g.lock) g.lock.update(dt);
    // carrying something: both arms out in front (the human shader's pose 3) – and Bengt with his tray
    if (this.carry && p.state === 'foot') p.body.pose = 3;
    if (this.stage === 'call') p.body.pose = 1;
    if (this.tray && this.bengt) this.bengt.body.pose = 3;
    if (this.boardT > 0 && (this.boardT -= dt) <= 0) { g.player.frozen = false; if (g.camFocus && g.camFocus.owner === 'hunt') g.camFocus = null; }
    switch (this.stage) {
      case 'seek': this.seekStep(dt); break;
      case 'stump': this.stumpStep(); break;
      case 'meet': this.meetStep(); break;
      case 'baking': this.bakeStep(dt); break;
      case 'brake': this.brakeStep(dt); break;
      case 'millWait': this.climbStep(dt); break;
      case 'phone': this.phoneStep(dt); break;
      case 'chapel': this.chapelStep(); break;
      case 'deliver': this.deliverStep(); break;
      case 'pestle': this.pestleStep(); break;
    }
  }

  stumpStep() {
    const g = this.game, m = this.mgr, p = g.player, L = HUNT.stump.look;
    if (p.state === 'foot' && !p.frozen && Math.hypot(p.x - L.x, p.z - L.z) < L.r) this.prompt = 'UNDERSÖK';
    m.setObjective('Undersök ekstubben', p.inCar ? 'Kliv ur – stubben i parken' : 'Ett hjärta i barken');
  }

  interact() {
    switch (this.prompt) {
      case 'UNDERSÖK': if (this.stage === 'stump') this.openStumpLock(); else this.openAltarLock(); return true;
      case 'BROMSA': return true;            // (holding the button does the braking)
      case 'SVARA': this.answer(); return true;
      case 'GÅ IN': this.goIn(); return true;
      case 'TITTA': this.lookAtBoard(); return true;
      case 'PRATA':
        if (this.stage === 'meet') { if (this.k === 1) this.meetMajken(); else this.meetIngvar(); }
        else this.talkToInga();
        return true;
      case 'RINGA': this.game.indoors.ringBell(); return true;
    }
    return false;
  }

  talkToInga() {
    const g = this.game, m = this.mgr, p = g.player, q = this.inga;
    if (!q) return;
    this.stage = 'chapelTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(q.x - p.x, q.z - p.z);
    q.standH = q.h = Math.atan2(p.x - q.x, p.z - q.z); q.body.h = q.h;
    g.camFocus = { x: (p.x + q.x) / 2, y: 0.55, z: (p.z + q.z) / 2, yaw: 0.2, owner: 'hunt', near: true };
    m.later(0.3, () => g.emit('talk', { id: this.id, pages: ingaPages() }), this);
  }

  // ---------------------------------------------------------------- the map and the view
  targets(T) {
    const g = this.game, gun = this.gun;
    if (this.stage === 'seek') {
      const P = this.place(this.k);
      if (this.tip) T.push(this.k === 2 && this.mgr.ingvar ? { kind: 'contact', x: this.mgr.ingvar.x, z: this.mgr.ingvar.z, r: 1, letter: 'I', color: INGVAR_T.color, badgeOnly: true, badgeY: 2.7, ref: this.mgr.ingvar, gps: true, always: true }
        : { kind: 'zone', x: P.x, z: P.z, r: this.k === 0 ? 1.4 : 2.2, gps: true });
      return;
    }
    if (this.stage === 'stump') T.push({ kind: 'item', x: HUNT.stump.x, y: CURB_H + 0.75, z: HUNT.stump.z + 0.95, gps: true });
    if (this.stage === 'meet') {
      const q = this.k === 1 ? this.mgr.huntMajken : this.mgr.ingvar;
      if (q) T.push({ kind: 'contact', x: q.x, z: q.z, r: 1, letter: this.k === 1 ? 'M' : 'I', color: this.k === 1 ? MAJKEN.color : INGVAR_T.color, badgeOnly: true, badgeY: 2.7, ref: q, gps: true, always: true });
    }
    if (this.stage === 'brake') T.push({ kind: 'zone', x: HUNT.mill.lever.x, z: HUNT.mill.lever.z, r: 1.1, gps: true });
    if (this.stage === 'phone') T.push({ kind: 'zone', x: HUNT.booth.x, z: HUNT.booth.z, r: 1.5, gps: true });
    if (this.stage === 'chapel') {
      if (!g.indoor) T.push({ kind: 'zone', x: CHAPEL_DOOR.x, z: CHAPEL_DOOR.z, r: CHAPEL_DOOR.r, gps: true });
      else {
        T.push({ kind: 'item', x: HUNT.altar.x, y: CHAPEL.y + 1.2, z: HUNT.altar.z + 0.35, gps: false });
        if (!this.sawBoard) T.push({ kind: 'item', x: HUNT.board.wall.x - 0.25, y: CHAPEL.y + 2.3, z: HUNT.board.wall.z, gps: false });
      }
    }
    if (this.stage === 'deliver' && !g.indoor) T.push({ kind: 'zone', x: KONDITORI.x, z: KONDITORI.z, r: 2.2, gps: true });
    if ((this.stage === 'deliver' || this.stage === 'intro') && gun && !g.indoor) T.push({ kind: 'contact', x: gun.x, z: gun.z, r: 1, letter: 'G', color: GUN_T.color, badgeOnly: true, badgeY: 2.6, ref: gun });
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    if (g.lock) { g.lock = null; }
    g.millHold = false;
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'hunt') g.camFocus = null;
    if (m.secrets) m.secrets.quietUntil = g.time + 20;
    if (this.stage === 'done') {
      // Gun and Bengt stay by the door for a while; huntWorld lets them go when nobody is looking
      this.tray = false;
    }
  }
}
