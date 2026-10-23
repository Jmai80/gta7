// Main quest, part 19: "Förbjudet område" (v1.19) – the first part of the second chapter. M/S Kardemumma has come
// in to the quay on Västerholmen, and her captain asks all of Sjuby to coffee and cardamom biscuits on the quay.
//   1. The reception: Ragnhild Kardell in her white uniform, Gun, Bengt, Ingvar, Elsa, Pia. The biscuits are made
//      with crushed cardamom – like Arne's. Gun sees the anchor ring on her finger: Arne had one just like it.
//      Then the captain turns to you: Viktor Knäck worked for her. Kexfabriken is hers, and all of Västerholmen –
//      every road and the barrier on the bridge. "Den här personen äger ej tillträde." Pia can do nothing: it is
//      private land. The guards walk you back over the bridge.
//   2. Next morning: a guard (Vakt Yngve) by the barrier on the west bridge, a poster with your face on it. Gun
//      texts: Vera on Skolgatan can make anybody into somebody else.
//   3. Salong Saxen: Vera dresses you up as the night shift at Kexfabriken – a blue boiler suit, a yellow cap,
//      glasses and a stick-on moustache from the amateur theatre (the player's look changes).
//   4. The barrier: Yngve lets the "new night shift" through. On Västerholmen three guards walk the factory's yard
//      (Gösta by the gate with his newspaper, Kerstin across the yard, Rolf in front of the office). In disguise
//      they only know you up close – a cone of light shows where each one looks. Seen for too long, or running
//      past them: they walk you back to the bridge (and Yngve lets you in again – "ni nya går alltid vilse").
//   5. The office (kexkontor.js): four things to look at – the board's letter on Knäck's desk (signed R. Kardell,
//      chairwoman), the logbook in a sea chest ("kockeleven A. mönstrade av" in Sjuby, July 1962), the ship model,
//      and the photo wall: M/S Kardemumma 1962 – the captain, Ragnhild, 8, and a young cook: Arne, 19.
//   6. Ragnhild comes in. Her mother cooked on board and taught Arne everything; in Sjuby in 1962 he went ashore
//      and never came back – and her mother's recipe book was gone the same night. She started Kexfabriken in 1971
//      to bake her mother's biscuits again. They were never right. The ban is lifted: "Säg till Gun att jag väntar
//      ombord." The first clue to where Arne got the recipe from.
// A checkpoint is kept in stats.forbud ({ at: 1 } banned, { at: 2 } in disguise, { at: 9 } done).
import { WHO, CURB_H, SALON_DOOR } from './config.js';
import { SALON } from './salon.js';
import { KEX, onWest, inKex } from './westisle.js';
import { KONTOR, KONTOR_DOOR } from './kexkontor.js';
import { STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed, PIA_LOOK } from './hideout.js';
import { BENGT_LOOK } from './opening.js';
import { GUN_LOOK } from './flag.js';
import { ELSA_LOOK } from './flaskpost.js';
import { FIA_LOOK } from './barber.js';
import { INGVAR_LOOK } from './livs.js';
import { hidden, stand } from './skattjakt.js';
import { clamp, wrapAngle } from './rng.js';

// Ragnhild Kardell: a white captain's uniform and cap, silver hair in a bun
export const RAGNHILD_LOOK = { shirt: 0xf4f2ea, pants: 0x1d2a44, skin: 0xf0cfb4, hair: 0xd8d4cc, height: 1.02, bulk: 1.0, style: ST.bun | ST.cap | ST.jacket, accent: 0xf4f2ea };
// what Vera puts on you: Kexfabriken's blue boiler suit, a yellow cap, glasses and a moustache, dark hair
export const DISGUISE = { shirt: 0x3d6fb0, pants: 0x3d6fb0, hair: 0x2b1d14, style: ST.cap | ST.glasses | ST.beard, accent: 0xf2c21b };
// the guards: light-blue shirts under navy jackets, navy caps
const guardLook = (hair, extra, skin, height, bulk) => ({ shirt: 0x9db8cc, pants: 0x1d2433, skin, hair, height, bulk, style: ST.cap | ST.jacket | extra, accent: 0x1d2a44 });
export const YNGVE_LOOK = guardLook(0x8a5a2b, 0, 0xe9c3a6, 1.04, 1.12);

export const FORBUD = {
  // the reception on the quay, at the foot of the gangway
  mark: { x: -318.0, z: 47.8, r: 1.8 },
  you: { x: -318.0, z: 48.4, h: 0 },
  ragnhild: { x: -318.2, z: 53.4, h: Math.PI },
  folk: [
    ['gun', -320.9, 51.0, 2.3], ['bengt', -323.4, 50.4, 1.8], ['ingvar', -325.4, 50.2, 1.6], ['elsa', -326.4, 51.2, 1.7], ['pia', -314.8, 50.6, -2.1],
  ],
  table: { x0: -325.4, z0: 47.9, x1: -322.0, z1: 48.9 },
  gangway: { x: -318.2, z0: 54.2, z1: 60.2 },
  camIntro: { x: -319.6, y: CURB_H + 1.45, z: 51.4, cam: { x: -309.8, y: CURB_H + 4.0, z: 42.8, fov: 56 } },
  camBan: { x: -318.1, y: CURB_H + 1.4, z: 51.0, cam: { x: -315.6, y: CURB_H + 2.2, z: 45.4, fov: 52 } },
  // the west bridge: where the guards leave you, Yngve by the barrier, the poster
  bridge: { x: -170.5, z: -38.4, h: -Math.PI / 2 },
  guard: { x: -176.1, z: -42.1, h: Math.PI / 2 },
  guardR: 2.2,
  poster: { x: -177.74, z: -38.5, y: 1.75 },             // taped onto the barrier's AVSTÄNGT sign
  // Salong Saxen: Vera on her feet by the chair, you in front of the mirror
  vera: { x: SALON.room.x0 + 5.5, z: SALON.room.z0 + 3.0, h: -1.9 },
  veraR: 1.7,
  chair: { x: SALON.stand.x, z: SALON.stand.z + 0.3, h: 0 },
  camSalon: { x: SALON.stand.x, y: SALON.y + 1.45, z: SALON.stand.z + 0.3, cam: { x: SALON.stand.x + 0.5, y: SALON.y + 1.75, z: SALON.stand.z + 2.9, fov: 46 } },
  // the guards on Västerholmen: how they see you in disguise
  see: { range: 8.5, run: 12.0, half: 0.8, near: 2.0 },
  pay: 7000,
};

// the three guards in Kexfabriken's yard
//   gösta: by the gate, reading his paper – now and then he looks up and round
//   kerstin: back and forth across the yard between the hall and the office
//   rolf: back and forth in front of the office door
export const GUARDS = [
  { id: 'gosta', who: 'Vakt Gösta', look: guardLook(0x9a9a9a, ST.beard, 0xf0c8a8, 1.0, 1.18), post: { x: -280.4, z: -35.4 }, read: 0, readT: 6.4, lookAt: [Math.PI / 2, Math.PI * 0.85, -Math.PI / 2 - 0.3], lookT: 1.25 },
  { id: 'kerstin', who: 'Vakt Kerstin', look: guardLook(0xc8442c, ST.long, 0xe8b996, 0.96, 1.0), path: [[-288.0, -36.0], [-320.0, -36.0]], speed: 1.2, wait: 3.0 },
  { id: 'rolf', who: 'Vakt Rolf', look: guardLook(0x2b1d14, 0, 0xc68e62, 1.06, 1.1), path: [[-308.5, -21.0], [-327.0, -21.0]], speed: 1.0, wait: 3.0 },
];
const SWEEP = [-0.85, 0.85, 0];   // where a patrolling guard looks at the end of a leg (from where they came)

const STEPS = ['banned', 'disguised'];

const RAG = { who: 'Kapten Kardell', letter: 'K', color: '#3fa7d6' };
const GUN_T = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const PIA = { who: 'Polis-Pia', letter: 'P', color: '#2c4a7a' };
const INGVAR = { who: 'Ingvar', letter: 'I', color: '#2b3d5c' };
const ELSA = { who: 'Elsa', letter: 'E', color: '#5f8a6a' };
const BENGT = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const VERA = { who: 'Vera', letter: 'V', color: '#e8833a' };
const YNGVE = { who: 'Vakt Yngve', letter: 'Y', color: '#1d2a44' };
const LETTER = { who: 'Brev på skrivbordet', letter: 'B', color: '#1f4fa0', note: true };
const LOG = { who: 'Loggbok, M/S Kardemumma', letter: 'L', color: '#2f4a3a', note: true };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };

export function introPages() {
  return [
    { ...RAG, text: 'Välkomna! Ragnhild Kardell, befälhavare på M/S Kardemumma. Ta en kaka – kardemumman är stött, inte malen. Min mor bakade aldrig på annat sätt.' },
    { ...GUN_T, text: 'Stött. Så sa min Arne också. Alltid.' },
    { ...RAG, text: 'Kloka män, de som stöter själva.' },
    { ...BENGT, text: 'De är nästan lika goda som Arnes bullar. Nästan.' },
    { ...INGVAR, text: 'Jag har sett er i kikaren i tre dagar, kapten. Ni ligger högt i vattnet. Ingen last.' },
    { ...ELSA, text: 'Ingvar! Var artig.' },
    { ...GUN_T, text: 'Er ring, kapten. Ett ankare i silver. Arne hade en likadan i en ask i byrån. Han ville aldrig säga var den kom ifrån.' },
    { ...RAG, text: 'Ankare är vanliga i hamnar, fru Gun.' },
    { ...RAG, fx: 'turn', text: 'Och du – du är den som såg till att Viktor Knäck blev hämtad av polisen. Han arbetade för mig.' },
    { ...PIA, text: 'För er?' },
    { ...RAG, text: 'Kexfabriken är min. Och Västerholmen – varje sten, varje väg, bommen på bron. Det är jag som är styrelsen i Stockholm.' },
    { ...RAG, fx: 'ban', text: 'Så från och med i kväll gäller det här: den här personen äger ej tillträde till Västerholmen.' },
    { ...PIA, text: 'Det … är privat mark. Jag kan inte göra något åt det. Förlåt.' },
    { ...RAG, text: 'Ät upp kakan först. Sedan följer vakterna dig till bron.', last: 'TILL BRON' },
  ];
}
export function veraPages() {
  return [
    { ...VERA, text: 'Där är du ju! Kexfabriken har satt upp en lapp med ditt ansikte vid bron. Inte ditt bästa foto.' },
    { ...YOU, text: 'Jag måste in på Västerholmen. Utan att någon känner igen mig.' },
    { ...VERA, text: 'En förklädnad? Äntligen något roligt i den här salongen. Jag har kepsar, glasögon och en lösmustasch från teaterföreningen 1998.' },
    { ...VERA, fx: 'disguise', text: 'Sitt still … Så där. En blå overall precis som nattskiftet på Kexfabriken – min kusin jobbar där.' },
    { ...VERA, text: 'Inte ens din mamma skulle känna igen dig. På håll. Gå inte för nära vakterna, och spring inte – folk som springer ser alltid misstänkta ut.', last: 'TILL BRON' },
  ];
}
export function gatePages(again) {
  if (again) {
    return [
      { ...YNGVE, text: 'Du igen? Ni nya går alltid vilse.' },
      { ...YNGVE, fx: 'gate', text: 'In med dig. Och håll dig borta från kontoret – kaptenen kommer i land i kväll.', last: 'IN PÅ ÖN' },
    ];
  }
  return [
    { ...YNGVE, text: 'Stopp där. Västerholmen är privat område. Vem är du?' },
    { ...YOU, text: 'Nattskiftet. Första dagen.' },
    { ...YNGVE, text: 'Nattskiftet börjar klockan tio. Nåja – ingen kommer för tidigt i onödan. Fin mustasch.' },
    { ...YNGVE, fx: 'gate', text: 'In med dig. Och håll dig borta från kontoret – kaptenen kommer i land i kväll.', last: 'IN PÅ ÖN' },
  ];
}
export const SPOT_PAGES = {
  desk: () => [
    { ...YOU, text: 'Ett brev på Knäcks skrivbord, på styrelsens papper.' },
    { ...LETTER, text: 'Till V. Knäck. Styrelsen har i dag beslutat att ni är entledigad. Receptet skulle köpas – inte stjälas. /R. Kardell, styrelsens ordförande' },
    { ...YOU, text: 'Ragnhild Kardell. Hon är styrelsen i Stockholm.' },
  ],
  chest: () => [
    { ...YOU, text: 'En gammal sjökista. Överst ligger en loggbok med bläckfläckar.' },
    { ...LOG, text: '14 juli 1962. Sjuby. Proviant och färskvatten. Kockeleven A. mönstrade av och gick i land. Kom inte tillbaka. Hustrun gråter i byssan. /E. Kardell, befälhavare' },
    { ...YOU, text: 'Kockeleven A. …' },
  ],
  model: () => [
    { ...YOU, text: 'M/S Kardemumma i en glasmonter. Mässingsskylten: ”Byggd i Göteborg 1938. Befälhavare Einar Kardell 1951–1979.”' },
    { ...YOU, text: 'Någon har ställt en liten bulle av lera på däcket. Den är målad med pärlsocker.' },
  ],
  photo: () => [
    { ...YOU, text: 'Ett gammalt foto i svart ram: ”M/S Kardemumma, juli 1962.” En kapten med skägg, en liten flicka med flätor – och en ung kock i vit mössa med en plåt bullar.' },
    { ...YOU, text: 'Under fotot, med bläck: ”Kapten Kardell, Ragnhild 8 år och kockeleven Arne, 19.”' },
    { ...YOU, text: 'Arne. Tant Guns Arne. Han var kock till sjöss – på hennes fars fartyg.' },
  ],
};
export function ragnhildPages(amount) {
  return [
    { ...RAG, text: 'Du hittade honom. Arne.' },
    { ...RAG, text: 'Fin mustasch, förresten. Vera på Salong Saxen? Hon klippte mig en gång, 1974.' },
    { ...YOU, text: 'Du visste att jag var här.' },
    { ...RAG, text: 'Vakten vid bron ringde efter tio sekunder. Ingen på nattskiftet har mustasch.' },
    { ...RAG, text: 'Min far var kapten. Min mor lagade maten ombord, och hennes bullar var kända i varenda hamn mellan Göteborg och Haparanda.' },
    { ...RAG, text: 'Arne var kockelev. Nitton år. Mamma lärde honom allt hon kunde. Sommaren 1962 lade vi till i Sjuby – och han gick i land och kom aldrig tillbaka. Samma natt försvann mammas receptbok.' },
    { ...RAG, text: 'Jag startade Kexfabriken 1971 för att baka hennes kakor igen. De blev aldrig rätt. Viktor Knäck skulle köpa receptet av Gun. Han valde att stjäla det.' },
    { ...RAG, text: 'Men jag läste vad som stod på receptets sista rad. Hela Sjuby gjorde det. ”Hemligheten är vem man bakar dem till.”' },
    { ...RAG, text: 'Kanske var det inte receptet han tog med sig i land.' },
    { ...RAG, fx: 'lift', text: `Förbudet är hävt. Här – ${amount} kronor för besväret. Och säg till Gun att jag väntar ombord. Det finns saker hon borde få veta om sin Arne. Och jag om min mor.`, last: 'TACK' },
  ];
}

export function forbudSave(g) { return g.stats.forbud && typeof g.stats.forbud === 'object' ? g.stats.forbud : null; }

const LOOK = { gun: GUN_LOOK, bengt: BENGT_LOOK, ingvar: INGVAR_LOOK, elsa: ELSA_LOOK, pia: PIA_LOOK };
const NPC = { gun: 'fest-gun', bengt: 'bengt-out', ingvar: 'fest-ingvar', elsa: 'elsa', pia: 'pia' };
function spawnReception(g) {
  const F = FORBUD;
  const L = [spawnPed(g, { ...RAGNHILD_LOOK }, F.ragnhild.x, F.ragnhild.z, F.ragnhild.h, 'ragnhild')];
  for (const [id, x, z, h] of F.folk) L.push(spawnPed(g, { ...LOOK[id] }, x, z, h, NPC[id]));
  return L;
}

// the reception on the quay while the quest is open (put there out of sight); Yngve by the barrier while you are
// banned; people left standing go home when nobody looks
export function forbudWorld(mgr) {
  const g = mgr.game, S = forbudSave(g), F = FORBUD;
  const open = mgr.isOpen('forbud'), job = mgr.active && mgr.active.id === 'forbud' ? mgr.active : null;
  const c = mgr.jobs.find((q) => q.id === 'forbud');
  if (c) c.startOnAccept = !!(open && S && S.at > 0);
  mgr.banned = !!(S && S.at >= 1 && S.at <= STEPS.length && !mgr.done.has('forbud'));
  const waiting = open && !(S && S.at > 0) && (!mgr.active || (job && job.stage === 'intro'));
  const R = mgr.forbudFolk;
  if (waiting && !g.indoor && (!R || !R.every((q) => g.peds.list.includes(q))) && (hidden(g, F.mark.x, F.mark.z) || mgr.t < 0.5)) {
    if (R) for (const q of R) removePed(g, q);
    mgr.forbudFolk = spawnReception(g);
  }
  if (!waiting && R && !job) { (mgr.forbudLeft = mgr.forbudLeft || []).push(...R); mgr.forbudFolk = null; }
  // Yngve by the barrier
  let y = mgr.forbudGuard;
  if (y && !g.peds.list.includes(y)) y = mgr.forbudGuard = null;
  if (mgr.banned && !y && !g.indoor && (hidden(g, F.guard.x, F.guard.z) || mgr.t < 0.5)) mgr.forbudGuard = spawnPed(g, { ...YNGVE_LOOK }, F.guard.x, F.guard.z, F.guard.h, 'yngve');
  if (!mgr.banned && y) { (mgr.forbudLeft = mgr.forbudLeft || []).push(y); mgr.forbudGuard = null; }
  if (mgr.forbudLeft && mgr.forbudLeft.length) mgr.forbudLeft = mgr.forbudLeft.filter((q) => { if (!g.peds.list.includes(q)) return false; if (g.indoor || hidden(g, q.x, q.z)) { removePed(g, q); return false; } return true; });
}

export class ForbudJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'forbud';
    // intro → escort → banned (→ salon → veraTalk) → gate → gateTalk → island (→ caught → escort) → office →
    // spotTalk … → ragnhild → endTalk → done
    this.stage = 'intro';
    this.prompt = null;
    this.titleCard = true;
    this.disguised = false;
    this.gateOpen = false;
    this.passes = 0;                               // how many times Yngve has let you in
    this.caughtN = 0;
    this.guards = null;
    this.found = {};                               // desk, chest, model, photo
    this.folk = null; this.vera = null; this.rag = null;
    this.said = {};
  }

  save(at) { const g = this.game; g.stats.forbud = { at }; g.emit('progress', {}); }

  start() {
    const g = this.game, m = this.mgr, p = g.player, F = FORBUD;
    const S = forbudSave(g);
    if (S && S.at > 0 && S.at <= STEPS.length) { this.resume(S); return; }
    let L = m.forbudFolk;
    if (!L || !L.every((q) => g.peds.list.includes(q))) { if (L) for (const q of L) removePed(g, q); L = spawnReception(g); }
    this.folk = L; m.forbudFolk = null;
    if (p.inCar) p.exitCar();
    p.frozen = true; p.vx = p.vz = 0;
    p.x = F.you.x; p.z = F.you.z; p.y = g.world.groundHeight(p.x, p.z); p.h = F.you.h;
    g.camFocus = { ...F.camIntro, owner: 'forbud' };
    g.emit('forbud', { kind: 'ship' });
    m.later(1.0, () => g.emit('talk', { id: this.id, pages: introPages() }), this);
  }

  resume(S) {
    const g = this.game, step = STEPS[S.at - 1];
    const say = (text) => g.emit('toast', { text: `Förbjudet område fortsätter: ${text}`, long: true });
    if (step === 'banned') { this.stage = 'banned'; say('Vera på Salong Saxen kan göra dig till någon annan.'); }
    else { this.putOn(); this.stage = 'gate'; say('i förklädnad – till vakten vid bommen på västra bron.'); }
    if (onWest(g.player.x, g.player.z) && !g.indoor) this.escort('Vakterna hittar dig på Västerholmen och följer dig tillbaka till bron.');
  }

  // ---------------------------------------------------------------- the disguise
  putOn() {
    const p = this.game.player;
    if (!this.base) this.base = { ...p.look };
    Object.assign(p.look, DISGUISE);
    this.disguised = true;
  }
  takeOff() {
    const p = this.game.player;
    if (this.base) Object.assign(p.look, this.base);
    this.base = null;
    this.disguised = false;
  }

  // ---------------------------------------------------------------- walked back over the bridge
  escort(text, after) {
    const g = this.game, m = this.mgr, p = g.player, F = FORBUD;
    this.stage = 'escort';
    p.frozen = true; p.vx = p.vz = 0;
    g.emit('fade', { on: true });
    m.later(0.6, () => {
      if (p.inCar) p.exitCar();
      p.x = F.bridge.x; p.z = F.bridge.z; p.h = F.bridge.h; p.vx = p.vz = p.vy = 0;
      p.y = g.world.groundHeight(p.x, p.z); p.state = 'foot'; p.body.lie = 0;
      g.emit('warp', { h: p.h });
      if (g.camFocus && g.camFocus.owner === 'forbud') g.camFocus = null;
      this.gateOpen = false;
      this.removeGuards();
      this.removeFolk();
      if (!m.forbudGuard || !g.peds.list.includes(m.forbudGuard)) m.forbudGuard = spawnPed(g, { ...YNGVE_LOOK }, F.guard.x, F.guard.z, F.guard.h, 'yngve');
      else stand(g, m.forbudGuard, F.guard.x, F.guard.z, F.guard.h);
    }, this);
    m.later(1.2, () => {
      g.emit('fade', { on: false });
      p.frozen = false;
      this.stage = this.disguised ? 'gate' : 'banned';
      if (text) g.emit('toast', { text, long: true });
      if (after) after();
    }, this);
  }

  // ---------------------------------------------------------------- 2–3. banned: to Vera
  bannedStep() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    if (ind.inside && ind.where === 'salon') {
      this.spawnVera();
      m.setObjective('Prata med Vera', 'Hon står vid stolen');
      if (this.vera && p.state === 'foot' && !p.frozen && Math.hypot(p.x - this.vera.x, p.z - this.vera.z) < FORBUD.veraR) this.prompt = 'PRATA';
      return;
    }
    if (ind.inside) return;
    this.removeVera();
    const d = Math.hypot(p.x - SALON_DOOR.x, p.z - SALON_DOOR.z);
    m.setObjective('Västerholmen är stängd för dig', d < 40 ? 'Salong Saxen – gå in' : 'Vera på Salong Saxen kan hjälpa (Skolgatan)');
    if (p.state === 'foot' && !p.frozen && !ind.busy && d < SALON_DOOR.r + 0.2) this.prompt = 'GÅ IN';
    this.guardWarn(false);
  }

  spawnVera() {
    const g = this.game, F = FORBUD;
    if (this.vera && g.peds.list.includes(this.vera)) return;
    this.vera = spawnPed(g, { ...FIA_LOOK }, F.vera.x, F.vera.z, F.vera.h, 'fia');
  }
  removeVera() { if (this.vera) { removePed(this.game, this.vera); this.vera = null; } }

  veraTalk() {
    const g = this.game, m = this.mgr, p = g.player, F = FORBUD;
    this.stage = 'veraTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.x = F.chair.x; p.z = F.chair.z; p.h = F.chair.h;
    const q = this.vera;
    if (q) { q.h = q.standH = Math.atan2(p.x - q.x, p.z - q.z); }
    g.camFocus = { ...F.camSalon, owner: 'forbud' };
    m.later(0.4, () => g.emit('talk', { id: this.id, pages: veraPages() }), this);
  }

  // ---------------------------------------------------------------- 4. the barrier
  gateStep() {
    const g = this.game, m = this.mgr, p = g.player, F = FORBUD, ind = g.indoors;
    if (ind.inside) { m.setObjective('Förklädd! Till västra bron', 'Gå ut'); return; }
    this.removeVera();
    const at = p.inCar ? p.car : p, d = Math.hypot(at.x - F.guard.x, at.z - F.guard.z);
    m.setObjective('Förklädd! Till vakten vid västra bron', d < 40 ? (p.inCar ? 'Kliv ur – vakten vill se dig' : 'Vakt Yngve står vid bommen') : 'Storgatan västerut till bron');
    const y = m.forbudGuard;
    if (y && p.state === 'foot' && !p.frozen && !ind.busy && Math.hypot(p.x - y.x, p.z - y.z) < F.guardR) this.prompt = 'PRATA';
  }

  // undisguised at the barrier: Yngve knows you from the poster
  guardWarn() {
    const g = this.game, y = this.mgr.forbudGuard, p = g.player;
    if (!y) return;
    const d = Math.hypot(p.x - y.x, p.z - y.z);
    if (d < 6 && (!this.warnT || g.time - this.warnT > 7)) {
      this.warnT = g.time;
      y.h = y.standH = Math.atan2(p.x - y.x, p.z - y.z);
      g.emit('say', { who: y, text: ['Du står på lappen. Vänd om!', 'Privat område. Det gäller särskilt dig.', 'Nej nej. Inte du. Kaptenens order.'][this.said.warn = ((this.said.warn || 0) + 1) % 3] });
    }
  }

  gateTalk() {
    const g = this.game, m = this.mgr, p = g.player, y = m.forbudGuard;
    this.stage = 'gateTalk';
    p.frozen = true; p.vx = p.vz = 0;
    if (y) { y.h = y.standH = Math.atan2(p.x - y.x, p.z - y.z); p.h = Math.atan2(y.x - p.x, y.z - p.z); }
    g.camFocus = { x: (p.x + y.x) / 2, y: 1.0, z: (p.z + y.z) / 2, yaw: Math.atan2(y.x - p.x, y.z - p.z) - 0.9, owner: 'forbud', near: true, dist: 6.2, height: 2.6 };
    m.later(0.3, () => g.emit('talk', { id: this.id, pages: gatePages(this.passes > 0) }), this);
  }

  // ---------------------------------------------------------------- 5. the yard and its guards
  spawnGuards() {
    const g = this.game;
    this.removeGuards();
    this.guards = GUARDS.map((d) => {
      const s = d.post || { x: d.path[0][0], z: d.path[0][1] };
      const h = d.post ? d.read : Math.atan2(d.path[1][0] - d.path[0][0], d.path[1][1] - d.path[0][1]);
      const ped = spawnPed(g, { ...d.look }, s.x, s.z, h, 'vakt-' + d.id);
      const G = { def: d, ped, mode: d.post ? 'read' : 'wait', t: d.post ? d.readT * 0.5 : 0.4, leg: 0, k: 2, meter: 0, seen: false, cone: { x: s.x, z: s.z, dir: h, on: 0, alert: 0, range: FORBUD.see.range, half: FORBUD.see.half } };
      return G;
    });
  }
  removeGuards() {
    const g = this.game;
    if (this.guards) for (const G of this.guards) removePed(g, G.ped);
    this.guards = null;
  }

  // a guard's routine: Gösta reads and looks up; Kerstin and Rolf walk their leg, stop and look round
  moveGuard(G, dt) {
    const d = G.def, q = G.ped;
    G.t -= dt;
    if (d.post) {
      if (G.mode === 'read') {
        q.standH = d.read;
        if (G.t <= 0) { G.mode = 'look'; G.k = 0; G.t = d.lookT; }
      } else {
        q.standH = d.lookAt[G.k];
        if (G.t <= 0) { G.k++; G.t = d.lookT; if (G.k >= d.lookAt.length) { G.mode = 'read'; G.t = d.readT; } }
      }
      if (q.state !== 'stand' && q.state !== 'goto') stand(this.game, q, d.post.x, d.post.z, q.standH);
      return;
    }
    if (G.mode === 'walk') {
      if (q.arrived || q.state === 'stand') { G.mode = 'wait'; G.k = 0; G.t = d.wait / SWEEP.length; G.base = q.h; }
      return;
    }
    // waiting at the end of a leg: look over one shoulder, the other, then back the way to go
    const here = d.path[G.leg], next = d.path[1 - G.leg];
    const back = Math.atan2(next[0] - here[0], next[1] - here[1]);
    q.standH = G.k < 2 && G.base != null ? G.base + SWEEP[G.k] : back;
    if (G.t <= 0) {
      G.k++; G.t = d.wait / SWEEP.length;
      if (G.k >= SWEEP.length) { G.leg = 1 - G.leg; G.mode = 'walk'; q.goto([[next[0], next[1]]], d.speed, null); }
    }
  }

  // can a guard's eyes reach (x, z)? the buildings, the stacks of pallets and the silos are in the way
  los(G, x, z) {
    const q = G.ped, w = this.game.world;
    if (w.raycast(q.x, q.z, x, z, CURB_H + 1.3) < 1) return false;
    for (const [sx, sz] of KEX.silos) {
      const dx = x - q.x, dz = z - q.z, l2 = dx * dx + dz * dz || 1;
      const t = clamp(((sx - q.x) * dx + (sz - q.z) * dz) / l2, 0, 1);
      if (Math.hypot(q.x + dx * t - sx, q.z + dz * t - sz) < 2.4) return false;
    }
    return true;
  }

  guardsStep(dt) {
    const g = this.game, p = g.player, S = FORBUD.see, ind = g.indoors;
    if (!this.guards) return;
    const at = p.inCar ? p.car : p;
    const sp = p.inCar ? Math.abs(p.car.speed || 0) : Math.hypot(p.vx || 0, p.vz || 0);
    const running = sp > 4.6;
    const watch = this.stage === 'island' && !ind.inside && !ind.busy && !p.frozen;
    let caughtBy = null;
    for (const G of this.guards) {
      this.moveGuard(G, dt);
      const q = G.ped, c = G.cone;
      const dir = q.h;
      const looking = !(G.def.post && G.mode === 'read');
      c.x = q.x; c.z = q.z; c.dir = dir; c.range = S.range;
      const want = !watch ? 0 : looking ? 1 : 0;
      c.on += (want - c.on) * Math.min(1, dt * 6);
      G.seen = false;
      if (watch) {
        const dx = at.x - q.x, dz = at.z - q.z, d = Math.hypot(dx, dz);
        const range = running ? S.run : S.range;
        const ang = Math.abs(wrapAngle(Math.atan2(dx, dz) - dir));
        if (d < S.near || (looking && d < range && ang < S.half)) G.seen = this.los(G, at.x, at.z);
        if (G.seen) {
          let rate = clamp(1.7 - d * 0.13, 0.55, 1.5);
          if (running) rate *= 1.6;
          G.meter = Math.min(1, G.meter + rate * dt);
          if (G.meter > 0.15 && (!G.sayT || g.time - G.sayT > 4)) { G.sayT = g.time; g.emit('say', { who: q, text: ['Hm?', 'Vem där?', 'Vänta lite …', 'Känner jag dig?'][Math.floor(g.time * 7) % 4] }); }
        } else G.meter = Math.max(0, G.meter - 0.4 * dt);
        if (G.meter >= 1 && !caughtBy) caughtBy = G;
      } else G.meter = Math.max(0, G.meter - 0.8 * dt);
      c.alert += ((G.meter > 0.15 ? 1 : 0) - c.alert) * Math.min(1, dt * 5);
    }
    if (caughtBy) this.caught(caughtBy);
  }

  caught(G) {
    const g = this.game, m = this.mgr, p = g.player, q = G.ped;
    this.stage = 'caught';
    this.caughtN++;
    g.stats.forbudCaught = (g.stats.forbudCaught || 0) + 1;
    p.frozen = true; p.vx = p.vz = 0;
    q.state = 'stand'; q.h = q.standH = Math.atan2(p.x - q.x, p.z - q.z);
    q.wave = true;
    g.emit('say', { who: q, text: ['Dig känner jag igen – från lappen vid bron!', 'Nattskiftet? Med den där mustaschen? Knappast.', 'Stopp! Du är ju den på lappen!'][(this.caughtN - 1) % 3] });
    g.emit('caught', {});
    m.later(1.6, () => { q.wave = false; this.escort('Vakterna följde dig ända till bron. Förklädnaden håller – men håll avståndet, och spring inte.'); }, this);
  }

  islandStep() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    if (ind.inside) return;
    const at = p.inCar ? p.car : p, d = Math.hypot(at.x - KONTOR_DOOR.x, at.z - KONTOR_DOOR.z);
    const inside = inKex(at.x, at.z);
    m.setObjective('Smyg in på Kexfabrikens kontor', inside ? (this.guards && this.guards.some((G) => G.meter > 0.15) ? 'En vakt har sett dig – gå undan!' : 'Vakterna känner igen dig på nära håll – och om du springer') : d < 70 ? 'Kontorets dörr är på östra sidan' : at.x < -232 ? 'Grinden rakt fram från bron' : 'Över västra bron');
    if (p.state === 'foot' && !p.frozen && !ind.busy && d < KONTOR_DOOR.r) this.prompt = 'GÅ IN';
    // back over the bridge on your own: the guards stay where they are, Yngve waves you back in
    if (at.x < -181) this.past = true;
    if (this.past && !onWest(at.x, at.z) && at.x > -176) { this.past = false; this.gateOpen = false; this.removeGuards(); this.stage = 'gate'; g.emit('toast', { text: 'Tillbaka vid bommen. Yngve släpper in dig igen om du ber honom.' }); }
  }

  enterOffice() {
    const g = this.game;
    this.stage = 'entering';
    g.indoors.enter(() => {
      this.stage = 'office';
      g.emit('toast', { text: 'Kontoret. Det luktar kardemumma och gammal pipa – inte Knäck längre.', long: true });
      if (!this.said.officeHint) { this.said.officeHint = true; this.mgr.later(1.2, () => g.emit('hint', { id: 'forbud-office', touch: 'Leta på kontoret: gå fram till skrivbordet, fotona, skeppsmodellen och sjökistan och tryck UNDERSÖK.', keys: 'Leta på kontoret: gå fram till skrivbordet, fotona, skeppsmodellen och sjökistan och tryck E.' }), this); }
    }, 'kontor');
  }

  // ---------------------------------------------------------------- 6. the office
  officeStep() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    if (!ind.inside || ind.where !== 'kontor') { if (!ind.busy) this.stage = 'island'; return; }
    const n = Object.keys(this.found).length;
    m.setObjective('Leta på kontoret', `${n} av 4 · skrivbordet, fotona, skeppsmodellen, sjökistan`);
    if (p.state !== 'foot' || p.frozen) return;
    for (const [id, Q] of Object.entries(KONTOR.spots)) {
      if (this.found[id]) continue;
      if (Math.hypot(p.x - Q.x, p.z - Q.z) < Q.r) { this.prompt = 'UNDERSÖK'; this.spot = id; return; }
    }
  }

  search(id) {
    const g = this.game, m = this.mgr, p = g.player, Q = KONTOR.spots[id];
    this.stage = 'spotTalk'; this.spotAt = id;
    p.frozen = true; p.vx = p.vz = 0; p.h = Q.face;
    // (the photo: you step aside so the camera can look over your shoulder at it)
    if (id === 'photo') { p.x = Q.x - 1.0; p.z = Q.z + 0.25; p.h = Math.PI - 0.5; g.camFocus = { ...KONTOR.camPhoto, owner: 'forbud' }; }
    g.emit('forbud', { kind: id === 'photo' ? 'photo' : 'search' });
    m.later(id === 'photo' ? 0.7 : 0.3, () => g.emit('talk', { id: this.id, pages: SPOT_PAGES[id]() }), this);
  }

  startRagnhild() {
    const g = this.game, m = this.mgr, p = g.player, K = KONTOR;
    this.stage = 'ragnhild';
    p.frozen = true; p.vx = p.vz = 0;
    g.indoors.noExit = true;
    p.x = K.you.x; p.z = K.you.z; p.h = K.you.h; p.y = g.world.groundHeight(p.x, p.z);
    this.rag = spawnPed(g, { ...RAGNHILD_LOOK }, K.ragnhildIn.x, K.ragnhildIn.z, K.ragnhildIn.h, 'ragnhild');
    this.rag.goto([[K.ragnhild.x, K.ragnhild.z]], 1.0, K.ragnhild.h);
    g.camFocus = { ...K.camTalk, owner: 'forbud' };
    g.emit('forbud', { kind: 'door' });
    g.emit('toast', { text: 'Dörren går upp bakom dig.' });
    m.later(3.0, () => { this.stage = 'endTalk'; g.emit('talk', { id: this.id, pages: ragnhildPages(FORBUD.pay) }); }, this);
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    g.stats.forbud = { at: 9 };
    g.indoors.noExit = false;
    this.takeOff();
    g.emit('toast', { text: 'Du tar av dig lösmustaschen. Den kliade ändå.' });
    m.complete(this, { title: 'FÖRBUDET ÄR HÄVT', sub: 'Förbjudet område', amount: FORBUD.pay });
    m.sms(WHO.gun, 'Ombord? Hos henne? … Arne pratade aldrig om havet. Men han nynnade alltid på en sjömansvisa när han stötte kardemumma. Jag följer med dig ombord, lilla vän. Inte i dag. Men snart.', 9, null);
  }

  // ---------------------------------------------------------------- talks
  talkFx(fx) {
    const g = this.game, m = this.mgr, p = g.player, F = FORBUD;
    if (fx === 'turn') {
      const r = this.folk && this.folk[0];
      if (r) r.h = r.standH = Math.atan2(p.x - r.x, p.z - r.z);
      g.camFocus = { ...F.camBan, owner: 'forbud' };
    }
    if (fx === 'ban') { g.emit('forbud', { kind: 'ban' }); const r = this.folk && this.folk[0]; if (r) r.wave = true; }
    if (fx === 'disguise') { this.putOn(); g.emit('forbud', { kind: 'disguise' }); }
    if (fx === 'gate') { this.gateOpen = true; this.passes++; g.emit('forbud', { kind: 'gate' }); }
    if (fx === 'lift') g.emit('forbud', { kind: 'lift' });
    void m;
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'forbud') g.camFocus = null; };
    switch (this.stage) {
      case 'intro': {
        const r = this.folk && this.folk[0];
        if (r) r.wave = false;
        this.save(1);
        this.escort('Nästa morgon. En vakt står vid bommen på västra bron – och på bommen sitter en lapp med ditt ansikte.', () => {
          m.sms(WHO.gun, 'Lilla vän, jag hörde vad som hände på kajen. Privat mark, säger hon! Och den där ringen … Gå till Vera på Salong Saxen. Hon kan göra vem som helst till någon annan.', 2.5, this);
          m.later(4.5, () => g.emit('hint', { id: 'forbud-vera', touch: 'Västerholmen är stängd för dig. Salong Saxen ligger på Skolgatan vid torget.', keys: 'Västerholmen är stängd för dig. Salong Saxen ligger på Skolgatan vid torget.' }), this);
        });
        return;
      }
      case 'veraTalk': free(); this.save(2); this.stage = 'gate';
        g.emit('toast', { text: 'Förklädd! Till vakten vid bommen på västra bron.', long: true });
        return;
      case 'gateTalk': free(); this.stage = 'island'; this.past = false; this.spawnGuards();
        m.later(0.6, () => g.emit('hint', { id: 'forbud-guards', touch: 'På Kexfabrikens gård går tre vakter. Ljuset på marken visar var de tittar – i förklädnad känner de bara igen dig på nära håll. Gå, spring inte.', keys: 'På Kexfabrikens gård går tre vakter. Ljuset på marken visar var de tittar – i förklädnad känner de bara igen dig på nära håll. Gå (håll inte Shift).' }), this);
        return;
      case 'spotTalk': {
        free();
        this.found[this.spotAt] = true;
        g.emit('forbud', { kind: 'found' });
        const n = Object.keys(this.found).length;
        this.stage = 'office';
        if (n >= 4) this.startRagnhild();
        else g.emit('toast', { text: `${n} av 4. Leta vidare.` });
        return;
      }
      case 'endTalk': free(); this.finish(); return;
    }
  }

  // ---------------------------------------------------------------- per step
  update(dt) {
    const g = this.game, p = g.player;
    this.prompt = null; this.spot = null;
    // banned or at the barrier but somehow on Västerholmen (a reload, a car over the water): back to the bridge
    if ((this.stage === 'banned' || this.stage === 'gate') && !g.indoor && !g.indoors.busy && onWest(p.x, p.z)) {
      this.escort('Vakterna hittar dig på Västerholmen och följer dig tillbaka till bron.');
      return;
    }
    switch (this.stage) {
      case 'banned': this.bannedStep(); break;
      case 'gate': this.gateStep(); this.guardWarnIfPlain(); break;
      case 'island': this.islandStep(); break;
      case 'office': this.officeStep(); break;
    }
    if (this.guards) this.guardsStep(dt);
  }
  guardWarnIfPlain() { if (!this.disguised) this.guardWarn(); }

  interact() {
    const pr = this.prompt, g = this.game;
    if (!pr) return false;
    if (pr === 'GÅ IN' && this.stage === 'banned') { this.stage = 'banned'; g.indoors.enter(() => g.emit('toast', { text: 'Salong Saxen. Vera vinkar från stolen.' }), 'salon'); return true; }
    if (pr === 'PRATA' && this.stage === 'banned') { this.veraTalk(); return true; }
    if (pr === 'PRATA' && this.stage === 'gate') { this.gateTalk(); return true; }
    if (pr === 'GÅ IN' && this.stage === 'island') { this.enterOffice(); return true; }
    if (pr === 'UNDERSÖK' && this.spot) { this.search(this.spot); return true; }
    return false;
  }

  // ---------------------------------------------------------------- map and view
  // the HUD's eye: the guard most sure about you, if one is near
  get eye() {
    if (!this.guards || this.stage !== 'island' || this.game.indoor) return null;
    const p = this.game.player;
    let best = null;
    for (const G of this.guards) {
      const d = Math.hypot(G.ped.x - p.x, G.ped.z - p.z);
      if (d > 18) continue;
      const score = G.meter * 10 - d * 0.01;
      if (!best || score > best.score) best = { score, ped: G.ped, meter: G.meter, icon: G.meter > 0.15 ? 'alert' : (G.def.post && G.mode === 'read') ? 'phone' : 'look' };
    }
    return best;
  }

  targets(T) {
    const g = this.game, ind = g.indoors, F = FORBUD, p = g.player;
    const zone = (x, z, r, gps) => T.push({ kind: 'zone', x, z, r, gps });
    const item = (x, y, z, gps = false) => T.push({ kind: 'item', x, y, z, gps });
    if (ind.inside) {
      if (ind.where === 'salon' && this.stage === 'banned' && this.vera) item(this.vera.x, SALON.y + 2.25, this.vera.z);
      if (ind.where === 'kontor' && this.stage === 'office') for (const [id, Q] of Object.entries(KONTOR.spots)) if (!this.found[id]) item(Q.x, KONTOR.y + 1.6, Q.z);
      return;
    }
    if (this.stage === 'banned') zone(SALON_DOOR.x, SALON_DOOR.z, 1.2, true);
    if (this.stage === 'gate' && this.mgr.forbudGuard) zone(this.mgr.forbudGuard.x, this.mgr.forbudGuard.z, 1.2, true);
    if (this.stage === 'island') zone(KONTOR_DOOR.x, KONTOR_DOOR.z, 1.0, true);
    void p;
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    p.frozen = false;
    g.indoors.noExit = false;
    if (g.camFocus && g.camFocus.owner === 'forbud') g.camFocus = null;
    if (this.stage !== 'done') this.takeOff();
    this.removeGuards();
    this.removeVera();
    this.removeFolk();
    if (this.rag) { (m.forbudLeft = m.forbudLeft || []).push(this.rag); this.rag = null; }
  }
  removeFolk() { if (this.folk) { (this.mgr.forbudLeft = this.mgr.forbudLeft || []).push(...this.folk); this.folk = null; } }
}
