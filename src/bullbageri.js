// Main quest, part 17: "Bullbilens bageri" (v1.17). Dahlgren wants to sell Bullbilen's bakery – and Kexfabriken's
// director, Viktor Knäck (the buyer on the tivoli in part 11), wants it, to make biscuits of Arne's recipe. Bengt
// says they can open it themselves, as a real bakery for all of Sjuby. Dahlgren: if the great oven is warm and
// there are buns on the belt by seven tomorrow morning, he will not sell.
//   1. The yard: Knäck makes his offer. Inside (bageriet.js): Stora Bertha, cold for ten years.
//   2. Against the clock, by car, any order: fetch Mormor Signe from the chapel's car park on Söderholmen (the only
//      one who knows the oven – she baked here for twenty-eight years; she rides in the passenger seat) and three
//      sacks of flour from Majken (she has wheeled them from the mill to the allotments' car park). Drive both into the bakery yard.
//   3. Inside: Signe lights Stora Bertha. Then the belt: Bengt drops dough balls on it, and you shape them (FORMA)
//      as they pass – twelve of them – before they roll into the oven.
//   4. Seven in the morning, the yard: half of Sjuby, kantor Folke with his accordion, the ribbon. Dahlgren tears up
//      the contract. And Knäck: "Ni har bageriet. Men jag har receptet." – a copy of Dahlgren's photo of Arne's
//      recipe, which he will sell on Sjubydagen. (Part 18.)
// A checkpoint is kept in stats.bageri ({ at: 1 } the errands, { at: 2 } back inside, { at: 3 } the opening).
import { WHO, CURB_H } from './config.js';
import { BAK, BAK_DOOR } from './bageriet.js';
import { STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed, PIA_LOOK } from './hideout.js';
import { BENGT_LOOK, MAJKEN_LOOK } from './opening.js';
import { BAKE_LOOK } from './guldbullen.js';
import { GUN_LOOK } from './flag.js';
import { BIRGER_LOOK } from './homecoming.js';
import { SANDER_LOOK } from './fest.js';
import { SIGNE_LOOK, FOLKE_LOOK } from './kaffe.js';
import { hidden, stand } from './skattjakt.js';
import { fmt } from './rng.js';

export const KNACK_LOOK = { shirt: 0x1d1f22, pants: 0x1d1f22, skin: 0xe9c3a6, hair: 0x2a2420, height: 1.06, bulk: 0.96, style: ST.glasses | ST.jacket, accent: 0xf4f4f0 };

export const BAGERI = {
  // the yard in front of the bakery: Dahlgren, Knäck and Bengt by the new door (and the opening in the morning)
  mark: { x: 93.0, z: -303.4, r: 1.8 },
  dahl: { x: 91.6, z: -305.6, h: 0.2 },
  knack: { x: 94.7, z: -305.8, h: -0.3 },
  bengt: { x: 93.2, z: -306.5, h: 0 },
  you: { x: 93.0, z: -303.2, h: Math.PI },
  // the errands: Signe at the chapel's car park, Majken with the flour at the mill, and where you drive them in
  signe: { x: -53.0, z: 223.6, h: Math.PI / 2 },
  signeZone: { x: -49.5, z: 222.5, r: 3.6 },
  majken: { x: 33.3, z: -327.4, h: Math.PI / 2 },          // with a wheelbarrow of sacks at the allotments' car park
  mjolZone: { x: 37.0, z: -328.0, r: 3.6 },
  yard: { x: 89.0, z: -295.5, r: 4.6 },                     // (the Bullbilen vans are parked just south-west of here)
  clock: 420,                              // seconds of game time from 23.00 to 07.00
  balls: 12, every: 1.15, speed: 1.5,      // the belt
  // the morning: who stands where in the yard
  crowd: [
    ['gun', 92.2, -301.6, Math.PI], ['signe', 90.8, -302.4, Math.PI * 0.85], ['folke', 96.4, -301.8, -Math.PI * 0.8], ['majken', 89.4, -303.6, Math.PI / 2],
    ['birger', 97.6, -303.4, -Math.PI / 2], ['jonte', 88.6, -301.6, Math.PI * 0.7], ['pia', 98.4, -305.4, -Math.PI / 2],
  ],
  pay: { base: 5000, perKnot: 50 },
};
export const BAGERI_MAX = BAGERI.pay.base + BAGERI.balls * BAGERI.pay.perKnot;
const STEPS = ['errands', 'back', 'opening'];
const LOOK = { gun: GUN_LOOK, signe: SIGNE_LOOK, folke: FOLKE_LOOK, majken: MAJKEN_LOOK, birger: BIRGER_LOOK, jonte: SANDER_LOOK, pia: PIA_LOOK };
const NPC = { gun: 'fest-gun', signe: 'signe', folke: 'folke', majken: 'majken', birger: 'birger', jonte: 'sander', pia: 'pia' };

const DAHL = { who: 'Direktör Dahlgren', letter: 'D', color: '#5a5f6b' };
const BENGT = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const KNACK = { who: 'Kexdirektör Knäck', letter: 'K', color: '#8a8f99' };
const SIGNE = { who: 'Mormor Signe', letter: 'S', color: '#b5466a' };
const GUN_T = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const MAJKEN = { who: 'Mjölnar-Majken', letter: 'M', color: '#b0874a' };
const FOLKE = { who: 'Kantor Folke', letter: 'F', color: '#3d6a9a' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };

export function introPages() {
  return [
    { ...KNACK, text: 'Viktor Knäck, Kexfabriken. Vi har setts – på tivolit. Du var den som sprang.' },
    { ...KNACK, text: 'Jag köper bageriet. Kontant. Och så gör vi Sjubykex av Arnes recept. I paket om fyrtio. Över hela landet.' },
    { ...BENGT, text: 'Kex! Av Arnes bullar! Dahlgren, säg att du inte skriver på.' },
    { ...DAHL, text: 'Bageriet har gått med förlust i tio år, Bengt. Stora Bertha har inte varit varm sedan jag började med fabriksbullar.' },
    { ...BENGT, text: 'Då öppnar vi det själva. Ett riktigt bageri, för hela Sjuby. Med Arnes recept – det riktiga.' },
    { ...DAHL, text: '…' },
    { ...DAHL, text: 'Om Stora Bertha är varm och det ligger bullar på bandet klockan sju i morgon bitti, så säljer jag inte. Annars skriver jag på.' },
    { ...KNACK, text: 'Klockan sju. Jag kommer med pennan.', last: 'IN I BAGERIET' },
  ];
}
export function hallPages() {
  return [
    { ...BENGT, text: 'Här är det. Stora Bertha – den största ugnen på öarna. Kall som en sten.' },
    { ...DAHL, text: 'Ingen vet hur hon tänds. Jag har försökt. Det small.' },
    { ...BENGT, text: 'En vet. Mormor Signe – hon bakade här i tjugoåtta år. Hon bor bland husen vid kapellet på Söderholmen.' },
    { ...DAHL, text: 'Och silona är tomma. Majken har mjöl – hon kör ut säckarna till kolonilotternas parkering med skottkärran.' },
    { ...BENGT, text: 'Ta en bil. Signe och mjölet – i vilken ordning du vill. Klockan är elva nu. Vi har till sju.', last: 'KÖR' },
  ];
}
export function signeCarPages() {
  return [
    { ...SIGNE, text: 'Där är du! Jonte sa att du skulle komma. Jag har väntat med väskan sedan nyheterna.' },
    { ...SIGNE, text: 'Stora Bertha. Tio år kall. Hon kommer att vara på dåligt humör. Kör nu – och kör försiktigt, jag har tårta i väskan.', last: 'HOPPA IN' },
  ];
}
export function firePages() {
  return [
    { ...SIGNE, text: 'Hej, gamla flicka. Känner du igen mig?' },
    { ...SIGNE, text: 'Spjället först. Sedan björkved, inte gran. Och sedan tre slag på luckan – inte två, inte fyra.' },
    { ...DAHL, text: 'Tre slag? Det står ingenting om det i manualen.' },
    { ...SIGNE, fx: 'fire', text: 'Det var jag som skrev manualen. Jag skrev den inte för dig.' },
    { ...BENGT, text: 'Hon brinner! Stora Bertha brinner!' },
    { ...SIGNE, text: 'Nu formar vi. Bengt lägger degen på bandet, du knyter bullarna medan de rullar förbi – innan de åker in i ugnen.', last: 'TILL BANDET' },
  ];
}
export function bandPages(n) {
  const all = n >= BAGERI.balls, many = n >= 9;
  return [
    { ...SIGNE, text: all ? 'Alla tolv! Som en riktig bagare. Jag har inte sett något liknande sedan 1974.' : many ? `${n} av tolv knutna. Det duger gott. De andra blir … rustika.` : `${n} av tolv. Resten blev klumpar. Men klumpar är också bullar – det sa Arne alltid.` },
    { ...BENGT, text: 'Det luktar bageri. På riktigt. Inte fabrik.' },
    { ...DAHL, text: 'Klockan är fem. Om två timmar kommer Knäck.' },
    { ...SIGNE, text: 'Då har vi bullar på bandet. Gå hem och sov en stund, alla tre. Jag vaktar Bertha.', last: 'GODNATT' },
  ];
}
export function openingPages(amount) {
  return [
    { ...GUN_T, text: 'Välkomna, allihop! Bullbilens bageri – öppet igen, efter tio år. Med Arnes recept. Det riktiga.' },
    { ...FOLKE, text: 'Och lite musik! Jag har övat. På dragspel – orgeln gick inte att bära.' },
    { ...KNACK, text: 'Klockan är sju. Jag har pennan. Dahlgren?' },
    { ...DAHL, fx: 'rip', text: 'Bageriet är inte till salu. Det har det aldrig varit. Jag glömde bara bort det en stund – ungefär tjugo år.' },
    { ...KNACK, text: '…' },
    { ...KNACK, text: 'Ni har bageriet. Men jag har receptet.' },
    { ...KNACK, text: 'Dahlgren skickade mig en bild innan ni raderade dem på tivolit. Den bästa. Hela receptet, i Arnes handstil.' },
    { ...DAHL, text: 'Jag … det var innan. Innan allt.' },
    { ...KNACK, text: 'På Sjubydagen säljer jag det. Till högstbjudande. Vi ses på festen.' },
    { ...GUN_T, text: '…' },
    { ...SIGNE, text: 'Låt honom gå, Gun. I dag bakar vi. Och sedan tar vi tillbaka det som är vårt.' },
    { ...GUN_T, text: `Lilla vän – tack. Här är ${fmt(amount)} kronor från bageriets allra första kassa. Och en bulle från Stora Bertha.`, last: 'TILL SJUBYDAGEN' },
  ];
}

export function bageriSave(g) { return g.stats.bageri && typeof g.stats.bageri === 'object' ? g.stats.bageri : null; }

// Dahlgren, Knäck and Bengt wait in the yard until you come (put there out of sight); people left standing go home
export function bageriWorld(mgr) {
  const g = mgr.game;
  const open = mgr.isOpen('bageri'), job = mgr.active && mgr.active.id === 'bageri' ? mgr.active : null;
  const c = mgr.jobs.find((q) => q.id === 'bageri');
  const S = bageriSave(g);
  if (c) c.startOnAccept = !!(open && S && S.at > 0);
  const waiting = open && !(S && S.at > 0) && (!mgr.active || (job && job.stage === 'intro'));
  const K = BAGERI, F = mgr.bageriFolk;
  if (waiting && !g.indoor && (!F || !F.every((q) => g.peds.list.includes(q))) && hidden(g, K.mark.x, K.mark.z)) {
    if (F) for (const q of F) removePed(g, q);
    mgr.bageriFolk = [spawnPed(g, { ...BAKE_LOOK }, K.dahl.x, K.dahl.z, K.dahl.h, 'flask-dahl'), spawnPed(g, { ...KNACK_LOOK }, K.knack.x, K.knack.z, K.knack.h, 'knack'), spawnPed(g, { ...BENGT_LOOK }, K.bengt.x, K.bengt.z, K.bengt.h, 'bengt-out')];
  }
  if (!waiting && F && !job) { (mgr.bageriLeft = mgr.bageriLeft || []).push(...F); mgr.bageriFolk = null; }
  if (mgr.bageriLeft && mgr.bageriLeft.length) mgr.bageriLeft = mgr.bageriLeft.filter((q) => { if (!g.peds.list.includes(q)) return false; if (g.indoor || hidden(g, q.x, q.z)) { removePed(g, q); return false; } return true; });
  mgr.bertha = mgr.done.has('bageri') || !!(job && job.fired);     // (render: the oven glows)
}

export class BakeryJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'bageri';
    // intro → enter → hallTalk → errands (signe, mjol, by car) → back → fire → fireTalk → band → bandTalk → night →
    // opening → openTalk → done
    this.stage = 'intro';
    this.prompt = null;
    this.titleCard = true;
    this.clock = BAGERI.clock;
    this.signeState = 'wait';   // wait → car (in your passenger seat) → there
    this.mjol = 'wait';         // wait → car → there
    this.car = null; this.mjolCar = null;
    this.balls = []; this.made = 0; this.knots = 0; this.spawnT = 0; this.bandOn = false;
    this.fired = false; this.ribbon = false;
    this.folk = null; this.inside = null; this.crowd = null;
    this.signe = null; this.majken = null;
  }

  save(at) { const g = this.game; g.stats.bageri = { at }; g.emit('progress', {}); }

  start() {
    const g = this.game, m = this.mgr, p = g.player, K = BAGERI;
    const S = bageriSave(g);
    if (S && S.at > 0 && S.at <= STEPS.length) { this.resume(S); return; }
    let F = m.bageriFolk;
    if (!F || !F.every((q) => g.peds.list.includes(q))) {
      if (F) for (const q of F) removePed(g, q);
      F = [spawnPed(g, { ...BAKE_LOOK }, K.dahl.x, K.dahl.z, K.dahl.h, 'flask-dahl'), spawnPed(g, { ...KNACK_LOOK }, K.knack.x, K.knack.z, K.knack.h, 'knack'), spawnPed(g, { ...BENGT_LOOK }, K.bengt.x, K.bengt.z, K.bengt.h, 'bengt-out')];
    }
    this.folk = F; m.bageriFolk = null;
    if (p.inCar) p.exitCar();
    p.frozen = true; p.vx = p.vz = 0;
    p.x = K.you.x; p.z = K.you.z; p.y = g.world.groundHeight(p.x, p.z); p.h = K.you.h;
    g.camFocus = { x: 93.2, y: 1.0, z: -305.4, owner: 'bageri', cam: { x: 88.0, y: CURB_H + 3.2, z: -298.6, fov: 56 } };
    m.later(0.9, () => g.emit('talk', { id: this.id, pages: introPages() }), this);
  }

  resume(S) {
    const g = this.game, step = STEPS[S.at - 1];
    const say = (text) => g.emit('toast', { text: `Bullbilens bageri fortsätter: ${text}`, long: true });
    if (step === 'errands') { this.toErrands(); say('Signe och mjölet – klockan är elva, ni har till sju.'); }
    else if (step === 'back') { this.signeState = 'there'; this.mjol = 'there'; this.toBack(); say('in i bageriet – Signe väntar vid Stora Bertha.'); }
    else { this.fired = true; this.toOpening(); say('invigningen på bageriets gård.'); }
  }

  // ---------------------------------------------------------------- 1. inside the first time
  enterStep() {
    const g = this.game, m = this.mgr, p = g.player, d = Math.hypot(p.x - BAK_DOOR.x, p.z - BAK_DOOR.z);
    m.setObjective('In i bageriet', 'Dörren vid lastkajens östra ände');
    if (p.state === 'foot' && !p.frozen && !g.indoors.busy && d < BAK_DOOR.r) this.prompt = 'GÅ IN';
  }

  goIn(next) {
    const g = this.game;
    g.indoors.enter(() => next(), 'bageri');
  }

  spawnInside(withSigne) {
    const g = this.game;
    this.removeInside();
    this.inside = [spawnPed(g, { ...BENGT_LOOK }, BAK.bengt.x, BAK.bengt.z, BAK.bengt.h, 'bengt-out'), spawnPed(g, { ...BAKE_LOOK }, BAK.dahl.x, BAK.dahl.z, BAK.dahl.h, 'flask-dahl')];
    if (withSigne) this.inside.push(spawnPed(g, { ...SIGNE_LOOK }, BAK.signe.x, BAK.signe.z, BAK.signe.h, 'signe'));
  }
  removeInside() { const g = this.game; if (this.inside) for (const q of this.inside) removePed(g, q); this.inside = null; }

  hallTalk() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'hallTalk';
    this.spawnInside(false);
    p.frozen = true;
    g.camFocus = { ...BAK.camHall, owner: 'bageri' };
    g.emit('toast', { text: 'Bullbilens bageri. Det luktar damm och gammal jäst.' });
    m.later(0.9, () => g.emit('talk', { id: this.id, pages: hallPages() }), this);
  }

  // ---------------------------------------------------------------- 2. the errands, against the clock
  toErrands() {
    this.stage = 'errands';
    this.clock = BAGERI.clock;
    this.save(STEPS.indexOf('errands') + 1);
  }

  clockText() {
    const t = Math.max(0, this.clock) / BAGERI.clock, mins = Math.round((1 - t) * 480), hh = (23 + Math.floor(mins / 60)) % 24, mm = mins % 60;
    return `Klockan ${String(hh).padStart(2, '0')}.${String(mm).padStart(2, '0')}`;
  }

  carOK(c) { return c && !c.spec.bike && !c.dead; }

  errandsStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, K = BAGERI, ind = g.indoors;
    if (ind.inside) { m.setObjective('Signe och mjölet', 'Gå ut och ta en bil'); return; }
    this.removeInside();
    this.clock -= dt;
    if (this.clock <= 0) { this.timeUp(); return; }
    // Signe at the car park, Majken with the sacks (out of sight)
    if (this.signeState === 'wait' && (!this.signe || !g.peds.list.includes(this.signe)) && (hidden(g, K.signe.x, K.signe.z) || m.t < 1.0)) this.signe = spawnPed(g, { ...SIGNE_LOOK }, K.signe.x, K.signe.z, K.signe.h, 'signe');
    if (this.mjol === 'wait' && (!this.majken || !g.peds.list.includes(this.majken)) && (hidden(g, K.majken.x, K.majken.z) || m.t < 1.0)) this.majken = spawnPed(g, { ...MAJKEN_LOOK }, K.majken.x, K.majken.z, K.majken.h, 'majken');
    this.seatSigne();
    const c = p.inCar ? p.car : null, slow = c && c.speed < 2.5, at = c || p;
    const inZ = (Z) => Math.hypot(at.x - Z.x, at.z - Z.z) < Z.r;
    if (this.signeState === 'wait' && inZ(K.signeZone)) {
      if (!this.carOK(c)) { this.needCar(); }
      else if (slow && this.signe) { this.pickUpSigne(c); return; }
    }
    if (this.mjol === 'wait' && inZ(K.mjolZone)) {
      if (!this.carOK(c)) { this.needCar(); }
      else if (slow) { this.loadFlour(c); }
    }
    if (c && inZ(K.yard) && slow) {
      if (this.signeState === 'car' && this.car === c) this.dropSigne();
      if (this.mjol === 'car' && this.mjolCar === c) this.dropFlour();
      if (this.signeState === 'there' && this.mjol === 'there') { this.toBack(); return; }
    }
    // the objective: what is left, and the clock
    const todo = [];
    if (this.signeState === 'wait') todo.push('Signe (Söderholmens kapell)');
    if (this.mjol === 'wait') todo.push('mjölet (Majken vid kolonilotterna)');
    const carry = [this.signeState === 'car' ? 'Signe' : null, this.mjol === 'car' ? 'mjölet' : null].filter(Boolean);
    m.setObjective(carry.length ? `Kör ${carry.join(' och ')} till bageriet` : `Hämta ${todo.join(' och ')}`, `${this.clockText()} · Stora Bertha ska vara varm till 07.00${c ? '' : ' · ta en bil'}`);
  }

  needCar() {
    const g = this.game;
    if ((this.needT || 0) > g.time) return;
    this.needT = g.time + 6;
    g.emit('toast', { text: 'Du behöver en bil – Signe har tårta i väskan, och mjölet är tre säckar.' });
  }

  pickUpSigne(c) {
    const g = this.game, m = this.mgr, q = this.signe;
    this.signeState = 'talk'; this.car = c;
    c.vx = c.vz = c.w = 0;
    g.camFocus = { x: (c.x + q.x) / 2, y: 0.9, z: (c.z + q.z) / 2, yaw: Math.atan2(q.x - c.x, q.z - c.z) - 0.8, owner: 'bageri', near: true, dist: 6, height: 2.6 };
    g.player.frozen = true;
    m.later(0.4, () => g.emit('talk', { id: this.id, pages: signeCarPages() }), this);
  }

  // Signe in the passenger seat (the car's right), like Birger in the Spider
  seatSigne() {
    const q = this.signe, c = this.car;
    if (this.signeState !== 'car' || !q || !c || c.removed) return;
    const s = c.local(0.38, -0.72), b = q.body;
    q.x = s.x; q.z = s.z; q.y = (c.visY ?? c.y) + 0.66 - 0.92 * SIGNE_LOOK.height;
    q.h = q.standH = c.h; q.state = 'lounge'; q.keep = true;
    b.x = q.x; b.y = q.y; b.z = q.z; b.h = q.h; b.pose = 5; b.headYaw = 0; b.headPitch = 0.05; b.lie = 0; b.legAmp = 0; b.armAmp = 0;
  }

  dropSigne() {
    const g = this.game, q = this.signe, c = this.car;
    this.signeState = 'there';
    if (q && c) { const s = c.local(1.6, 0); stand(g, q, s.x, s.z, c.h); g.emit('say', { who: q, text: 'Bertha! Här är jag, gamla flicka.' }); (this.mgr.bageriLeft = this.mgr.bageriLeft || []).push(q); }
    this.signe = null;
    g.emit('toast', { text: this.mjol === 'there' ? 'Signe är framme – och mjölet. In i bageriet!' : 'Signe är framme. Nu mjölet!' });
  }

  loadFlour(c) {
    const g = this.game;
    this.mjol = 'car'; this.mjolCar = c;
    g.emit('bageri', { kind: 'sacks' });
    g.emit('toast', { text: 'Majken lastar tre mjölsäckar i bilen. Kör försiktigt – de dammar.' });
    if (this.majken) g.emit('say', { who: this.majken, text: 'Nymalet! Hälsa Bertha från mig. Vi var unga samtidigt.' });
  }

  dropFlour() {
    const g = this.game;
    this.mjol = 'there';
    if (this.majken) { (this.mgr.bageriLeft = this.mgr.bageriLeft || []).push(this.majken); this.majken = null; }
    g.emit('bageri', { kind: 'sacks' });
    g.emit('toast', { text: this.signeState === 'there' ? 'Mjölet är framme – och Signe. In i bageriet!' : 'Mjölet är i silon. Nu Signe!' });
  }

  timeUp() {
    const g = this.game, m = this.mgr;
    if (this.signe) { (m.bageriLeft = m.bageriLeft || []).push(this.signe); this.signe = null; }
    void g;
    m.fail(this, 'Klockan blev sju', [WHO.bengt, 'Klockan blev sju och Bertha var kall. Men Dahlgren drog ut på det – han låtsades att pennan inte fungerade. Vi får en natt till. Kom tillbaka till bageriet!']);
  }

  // ---------------------------------------------------------------- 3. the oven and the belt
  toBack() {
    this.stage = 'back';
    this.save(STEPS.indexOf('back') + 1);
    this.mgr.setObjective('In i bageriet', 'Signe väntar vid Stora Bertha');
  }

  backStep() {
    const g = this.game, m = this.mgr, p = g.player, d = Math.hypot(p.x - BAK_DOOR.x, p.z - BAK_DOOR.z);
    m.setObjective('In i bageriet', d < 40 ? 'Dörren vid lastkajens östra ände' : p.z < -229 ? 'Bullbilens bageri' : 'Över norra bron till Norrholmen');
    if (p.state === 'foot' && !p.frozen && !g.indoors.busy && d < BAK_DOOR.r) this.prompt = 'GÅ IN';
  }

  fire() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'fireTalk';
    this.spawnInside(true);
    p.frozen = true;
    g.camFocus = { ...BAK.camHall, owner: 'bageri' };
    m.later(0.9, () => g.emit('talk', { id: this.id, pages: firePages() }), this);
  }

  bandStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, K = BAGERI, Bt = BAK.belt;
    const at = Math.hypot(p.x - BAK.station.x, p.z - BAK.station.z) < BAK.station.r;
    if (!this.bandOn) {
      m.setObjective('Till bandet', 'Ställ dig framför Stora Bertha');
      if (at && p.state === 'foot' && !p.frozen) this.prompt = 'STARTA';
      return;
    }
    // Bengt drops a ball at the east end now and then; they roll west into the oven's mouth
    this.spawnT -= dt;
    if (this.made < K.balls && this.spawnT <= 0) { this.balls.push({ x: Bt.x1 - 0.2, knot: false, k: this.made }); this.made++; this.spawnT = K.every; g.emit('bageri', { kind: 'drop' }); }
    for (const b of this.balls) b.x -= K.speed * dt;
    const gone = this.balls.filter((b) => b.x <= Bt.x0 + 0.2);
    for (const b of gone) g.emit('bageri', { kind: b.knot ? 'in' : 'lump' });
    this.balls = this.balls.filter((b) => b.x > Bt.x0 + 0.2);
    if (at && p.state === 'foot') this.prompt = 'FORMA';
    m.setObjective('Forma bullarna!', `${this.knots} av ${K.balls} knutna · tryck när en degboll är framför dig`);
    if (this.made >= K.balls && !this.balls.length) this.bandDone();
  }

  // the ball in reach: the one nearest the middle of your window
  inReach() {
    const W = BAK.window;
    let best = null;
    for (const b of this.balls) if (!b.knot && Math.abs(b.x - W.x) < W.w && (!best || Math.abs(b.x - W.x) < Math.abs(best.x - W.x))) best = b;
    return best;
  }

  forma() {
    const g = this.game, p = g.player, b = this.inReach();
    p.h = Math.PI; p.body.pose = 1;
    if (!b) { g.emit('bageri', { kind: 'miss' }); return; }
    b.knot = true; this.knots++;
    g.emit('bageri', { kind: 'knot' });
  }

  bandDone() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'bandTalk'; this.bandOn = false; this.prompt = null;
    p.frozen = true;
    g.stats.bageriKnots = this.knots;
    g.camFocus = { ...BAK.camHall, owner: 'bageri' };
    m.later(1.0, () => g.emit('talk', { id: this.id, pages: bandPages(this.knots) }), this);
  }

  // ---------------------------------------------------------------- 4. the morning
  night() {
    const g = this.game, m = this.mgr;
    this.stage = 'night';
    g.indoors.exit(() => {
      this.removeInside();
      this.toOpening();
      this.spawnCrowd();   // (the morning after: they are all there already)
      g.indoors.place(BAGERI.mark.x + 0.4, BAGERI.mark.z + 5.0, Math.PI);   // (in the yard, looking at them and the bakery)
      g.emit('toast', { text: 'Klockan sju nästa morgon. Det doftar kardemumma över hela Norrholmen.', long: true });
    });
    void m;
  }

  toOpening() {
    const g = this.game, K = BAGERI;
    this.stage = 'opening';
    this.save(STEPS.indexOf('opening') + 1);
    this.ribbon = true;
    if (g.player.frozen) g.player.frozen = false;
    void K;
  }

  openingStep() {
    const g = this.game, m = this.mgr, p = g.player, K = BAGERI;
    if (!this.crowd && !g.indoor && (hidden(g, K.mark.x, K.mark.z) || m.t < 1.0)) this.spawnCrowd();
    const at = p.inCar ? p.car : p, d = Math.hypot(at.x - K.mark.x, at.z - K.mark.z);
    m.setObjective('Invigningen', d < 30 ? (p.inCar ? 'Kliv ur på gården' : 'Ställ dig framför dörren') : 'Bullbilens bageri på Norrholmen');
    if (this.crowd && p.state === 'foot' && !p.frozen && d < K.mark.r) this.startOpening();
  }

  spawnCrowd() {
    const g = this.game, K = BAGERI;
    this.crowd = K.crowd.map(([id, x, z, h]) => spawnPed(g, { ...LOOK[id] }, x, z, h, NPC[id]));
    this.crowd.push(spawnPed(g, { ...BAKE_LOOK }, K.dahl.x, K.dahl.z, K.dahl.h, 'flask-dahl'), spawnPed(g, { ...BENGT_LOOK }, K.bengt.x, K.bengt.z, K.bengt.h, 'bengt-out'), spawnPed(g, { ...KNACK_LOOK }, K.knack.x + 1.6, K.knack.z + 0.6, K.knack.h - 0.4, 'knack'));
  }

  startOpening() {
    const g = this.game, m = this.mgr, p = g.player, K = BAGERI;
    this.stage = 'openTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.x = K.you.x; p.z = K.you.z; p.y = g.world.groundHeight(p.x, p.z); p.h = K.you.h;
    this.amount = K.pay.base + this.knots * K.pay.perKnot;
    g.emit('bun', { kind: 'fanfare' });
    g.camFocus = { x: 93.6, y: 1.0, z: -304.2, owner: 'bageri', cam: { x: 87.4, y: CURB_H + 3.6, z: -296.4, fov: 60 } };
    m.later(0.9, () => g.emit('talk', { id: this.id, pages: openingPages(this.amount) }), this);
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done'; this.ribbon = false;
    g.stats.bageri = { at: STEPS.length + 1 };
    if (this.crowd) { (m.bageriLeft = m.bageriLeft || []).push(...this.crowd); this.crowd = null; }
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Bullbilens bageri', amount: this.amount });
    m.sms(WHO.pia, 'Jag har kollat upp Kexfabriken. Knäck har köpt en monter på Sjubydagen – mitt på torget. Han tänker sälja receptet där, inför alla. Vi får tänka ut något. /Pia', 30, null);
  }

  // ---------------------------------------------------------------- talks
  talkFx(fx) {
    const g = this.game;
    if (fx === 'fire') { this.fired = true; g.emit('bageri', { kind: 'fire' }); }
    if (fx === 'rip') { this.ribbon = false; g.emit('bageri', { kind: 'rip' }); }
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'bageri') g.camFocus = null; };
    switch (this.stage) {
      case 'intro': free(); this.stage = 'enter';
        if (this.folk) { (m.bageriLeft = m.bageriLeft || []).push(...this.folk); this.folk = null; }
        return;
      case 'hallTalk': free(); this.toErrands();
        g.emit('toast', { text: 'Klockan är elva. Hämta Signe och mjölet med bil – innan sju!', long: true });
        return;
      case 'errands': free(); if (this.signeState === 'talk') { this.signeState = 'car'; g.emit('toast', { text: 'Signe sitter bredvid dig. Kör till bageriet!' }); } return;
      case 'fireTalk': free(); this.stage = 'band'; this.fired = true;
        m.later(0.6, () => g.emit('hint', { id: 'bageri-band', touch: 'Ställ dig framför bandet och tryck STARTA. Tryck FORMA när en degboll är mitt framför dig.', keys: 'Ställ dig framför bandet och tryck E. Tryck E igen när en degboll är mitt framför dig.' }), this);
        return;
      case 'bandTalk': free(); this.night(); return;
      case 'openTalk': free(); this.finish(); return;
    }
  }

  // ---------------------------------------------------------------- per step
  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null;
    const inside = ['hallTalk', 'fireTalk', 'band', 'bandTalk'].includes(this.stage);
    if (inside && !ind.inside && !ind.busy) {        // walked out of the bakery in the middle of it
      this.removeInside();
      if (this.stage === 'hallTalk') { this.stage = 'enter'; return; }
      this.balls = []; this.made = 0; this.knots = 0; this.bandOn = false; this.fired = false;
      this.toBack(); return;
    }
    if (ind.inside && ind.where === 'bageri') ind.noExit = this.stage === 'band' && this.bandOn;
    switch (this.stage) {
      case 'enter': this.enterStep(); break;
      case 'errands': if (this.signeState !== 'talk') this.errandsStep(dt); break;
      case 'back': this.backStep(); break;
      case 'band': this.bandStep(dt); break;
      case 'opening': this.openingStep(); break;
    }
    void m;
  }

  interact() {
    const g = this.game, pr = this.prompt;
    if (!pr) return false;
    if (pr === 'GÅ IN' && this.stage === 'enter') { this.goIn(() => this.hallTalk()); return true; }
    if (pr === 'GÅ IN' && this.stage === 'back') { this.stage = 'fireIn'; this.goIn(() => this.fire()); return true; }
    if (pr === 'STARTA') { this.bandOn = true; this.spawnT = 0.4; const p = g.player; p.x = BAK.station.x; p.z = BAK.station.z; p.h = Math.PI; p.vx = p.vz = 0; g.camFocus = { ...BAK.camBand, owner: 'bageri' }; g.emit('bageri', { kind: 'start' }); return true; }
    if (pr === 'FORMA') { this.forma(); return true; }
    return false;
  }

  // ---------------------------------------------------------------- map and view
  targets(T) {
    const g = this.game, ind = g.indoors, K = BAGERI;
    const item = (x, y, z) => T.push({ kind: 'item', x, y, z, gps: false });
    if (ind.inside) {
      if (this.stage === 'band' && !this.bandOn) item(BAK.station.x, BAK.y + 1.6, BAK.station.z - 0.6);
      return;
    }
    if (this.stage === 'enter' || this.stage === 'back') T.push({ kind: 'zone', x: BAK_DOOR.x, z: BAK_DOOR.z, r: 1.0, gps: true });
    if (this.stage === 'errands') {
      const p = g.player, c = p.inCar ? p.car : null;
      const goYard = this.signeState === 'car' || this.mjol === 'car';
      const opts = [];
      if (this.signeState === 'wait') opts.push(K.signeZone);
      if (this.mjol === 'wait') opts.push(K.mjolZone);
      let best = goYard ? K.yard : null, bd = 1e9;
      if (!best) for (const Z of opts) { const d = Math.hypot(Z.x - (c || p).x, Z.z - (c || p).z); if (d < bd) { bd = d; best = Z; } }
      for (const Z of [...opts, ...(goYard ? [K.yard] : [])]) T.push({ kind: 'zone', x: Z.x, z: Z.z, r: Math.min(Z.r, 2.4), gps: Z === best });
    }
    if (this.stage === 'opening') T.push({ kind: 'zone', x: K.mark.x, z: K.mark.z, r: K.mark.r, gps: true });
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    p.frozen = false;
    g.indoors.noExit = false;
    if (g.camFocus && g.camFocus.owner === 'bageri') g.camFocus = null;
    const L = (m.bageriLeft = m.bageriLeft || []);
    for (const q of [...(this.folk || []), ...(this.crowd || []), this.signe, this.majken]) if (q) L.push(q);
    this.folk = this.crowd = this.signe = this.majken = null;
    if (g.indoors.inside) this.removeInside(); else this.removeInside();
  }
}
