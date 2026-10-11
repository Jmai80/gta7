// Three quests at Tivoli Lyckoland on Söderholmen (v1.7):
//  B  Bagar-Bengt:  "Utsikten" – main quest, part 11. Direktör Dahlgren photographed both halves of Arne's
//                   recipe (part 7) and is selling the photos to a buyer at the tivoli. Ride the Ferris
//                   wheel (Bengt pays) to spot him in the crowd from the top, then catch him on foot.
//  H  Hanna:        "Var är Ebbe?" – side quest. Her five-year-old is lost in the crowd: ask the popcorn man,
//                   the carousel man and Maja at the coaster, find Ebbe and walk him back to his mother.
//  R  Tivoli-Rut:   "Måsen har fastnat" – side quest. The roller coaster has stopped high up the lift hill
//                   with eight people aboard (it stands still while the quest is open: game.coasterT). Drive
//                   to Lasses Verkstad in town for a new drive belt and back before they lose patience.
// The people stand where they belong while their quest is open (put there and taken away out of sight,
// southWorld). Everything about the rides themselves: southisle.js, rides.js.
import { WHO, CURB_H } from './config.js';
import { fmt } from './rng.js';
import { STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed } from './hideout.js';
import { CUSTOMERS } from './barber.js';
import { WHEEL, SOUTH, wheelAngle } from './southisle.js';

const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const BENGT = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const DAHLGREN = { who: 'Direktör Dahlgren', letter: 'D', color: '#5a5f6b' };
const BUYER = { who: 'Köparen', letter: 'K', color: '#c0302a' };
const HANNA = { who: 'Hanna', letter: 'H', color: '#2fb3a8' };
const EBBE_T = { who: 'Ebbe', letter: 'E', color: '#2fb35a' };
const RUT = { who: 'Tivoli-Rut', letter: 'R', color: '#e85d9a' };

export const LOOKS = {
  bengt: { shirt: 0xf2efe6, pants: 0xe2ddd0, skin: 0xe9c3a6, hair: 0x3a2a1a, height: 1.04, bulk: 1.28, style: ST.beard | ST.apron | ST.baker, accent: 0xf8f6f0 },
  // in disguise: a straw-coloured cap and sunglasses over the suit
  dahlgren: { shirt: 0xe9e6de, pants: 0x2b2e35, skin: 0xf0c8a8, hair: 0x9a9a9a, height: 1.03, bulk: 1.15, style: ST.glasses | ST.jacket | ST.cap, accent: 0xd9c27a },
  buyer: { shirt: 0xc0302a, pants: 0x1d1f22, skin: 0xe8b996, hair: 0x1a1a1a, height: 0.98, bulk: 0.98, style: ST.long | ST.glasses | ST.jacket, accent: 0xc0302a },
  hanna: { shirt: 0x2fb3a8, pants: 0x24365e, skin: 0xf2d0b5, hair: 0xb5651d, height: 0.97, bulk: 1.0, style: ST.bun, accent: 0x2fb3a8 },
  ebbe: { shirt: 0xf2c21b, pants: 0x2c62a8, skin: 0xf2d0b5, hair: 0xd9b26b, height: 0.6, bulk: 0.86, style: ST.cap, accent: 0x2fb35a },
  pelle: { shirt: 0xd2342c, pants: 0xf2efe6, skin: 0xc68e62, hair: 0x1a1a1a, height: 1.02, bulk: 1.12, style: ST.apron | ST.cap, accent: 0xf2efe6 },
  kalle: { shirt: 0x2c62a8, pants: 0x2b2e35, skin: 0xe8b996, hair: 0xb0b0b0, height: 0.99, bulk: 1.05, style: ST.beard | ST.cap, accent: 0xd2342c },
  maja: { shirt: 0xf2c21b, pants: 0x24365e, skin: 0x9c6b45, hair: 0x2b1d14, height: 0.96, bulk: 0.95, style: ST.long | ST.cap, accent: 0x2c62a8 },
  rut: { shirt: 0xe85d9a, pants: 0x1d1f22, skin: 0xf0c8a8, hair: 0xd8d4cc, height: 0.95, bulk: 1.08, style: ST.bun | ST.glasses | ST.jacket, accent: 0x8e44ad },
};

// ---- where everything is
export const UTSIKT = {
  bengt: { x: 13.8, z: 204.4, h: -Math.PI / 2 },          // outside the tivoli's fence, east of the arch
  dahl: { x: 80.6, z: 232.6, h: -Math.PI / 2 },           // by the picnic tables at the east end, with the buyer
  buyer: { x: 79.2, z: 232.7, h: Math.PI / 2 },
  notice: 9, speed: 5.3, reward: 4000,
  // his way out if he sees you: away from the crowd, round the back of the coaster along the fence,
  // up the west side past the bumper cars, out through the gate and along the road to the car park
  route: [[83.0, 236.0], [83.0, 261.4], [-18.0, 261.4], [-18.0, 209.6], [8.6, 209.6], [8.6, 200.6], [-28, 200.6], [-42, 211.5]],
};
UTSIKT.mark = { x: UTSIKT.bengt.x - 1.3, z: UTSIKT.bengt.z, r: 1.4 };
export const EBBE = {
  hanna: { x: 18.6, z: 211.4, h: Math.PI / 2 },           // by the ticket booth
  ebbe: { x: 50, z: 214.55, h: Math.PI },                  // on the bench by the Ferris wheel
  wit: [
    { id: 'pelle', name: 'Popcorn-Pelle', x: 49.0, z: 210.9, h: -Math.PI / 2 },
    { id: 'kalle', name: 'Karusell-Kalle', x: 13.8, z: 229.6, h: Math.PI / 2 },
    { id: 'maja', name: 'Maja vid Måsen', x: 8.2, z: 241.8, h: Math.PI },
  ],
  pay: 900,
};
EBBE.mark = { x: EBBE.hanna.x + 1.3, z: EBBE.hanna.z, r: 1.4 };
export const MASEN = {
  rut: { x: -1, z: 241.7, h: Math.PI },                    // at the coaster's station
  van: { x: -45.4, z: 224.5, h: Math.PI },                 // her van in the car park
  lasse: { x: 42.5, z: 67, r: 3.6 },                      // on Drottninggatan, outside the gate to Lasses Verkstad's yard
  lasseAt: { x: 47.6, z: 67, h: -Math.PI / 2 },            // Lasse waits in the gate with the belt
  back: { x: 8.6, z: 200.6, r: 3.6 },                     // the road outside the arch
  time: 120, base: 700, perSec: 8,
};
MASEN.mark = { x: MASEN.rut.x, z: MASEN.rut.z - 1.3, r: 1.4 };

const hiddenFrom = (g, x, z) => { const p = g.player, d = Math.hypot(x - p.x, z - p.z); return d > 70 || (d > 35 && !g.visible(x, z)); };
// on the south bridge or the island (people are put out while you cross the bridge, out of sight)
const nearIsland = (g) => g.player.z > 135 && Math.abs(g.player.x - SOUTH.center.x) < 200;
const face = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

// someone sitting (on a bench, or on the ground when hip is the ground)
function sit(ped, x, z, h, hipY) {
  ped.x = x; ped.z = z; ped.h = ped.standH = h; ped.state = 'lounge'; ped.keep = true;
  ped.y = hipY - 0.92 * ped.body.look.height;
  const b = ped.body;
  b.x = x; b.z = z; b.h = h; b.y = ped.y; b.pose = 5; b.headYaw = 0; b.headPitch = 0.1; b.lie = 0; b.legAmp = 0; b.armAmp = 0;
}
function standUp(g, ped) {
  ped.state = 'stand'; ped.y = g.world.groundHeight(ped.x, ped.z); ped.body.pose = 0; ped.body.y = ped.y;
}

// keep one person in place while `want`: put there, put back or taken away whenever nobody sees it
function keep(mgr, key, want, look, at, npc, busyId, onSpawn) {
  const g = mgr.game, S = mgr.south || (mgr.south = {});
  let q = S[key];
  if (q && !g.peds.list.includes(q)) q = S[key] = null;
  if (mgr.active && mgr.active.id === busyId) return q;
  want = want && nearIsland(g) && !g.indoor;
  if (want && !q && (hiddenFrom(g, at.x, at.z) || mgr.t < 0.5)) {
    q = S[key] = spawnPed(g, look, at.x, at.z, at.h, npc);
    if (onSpawn) onSpawn(q);
  } else if (want && q && Math.hypot(q.x - at.x, q.z - at.z) > 1.5 && hiddenFrom(g, q.x, q.z) && hiddenFrom(g, at.x, at.z)) {
    removePed(g, q);
    q = S[key] = spawnPed(g, look, at.x, at.z, at.h, npc);
    if (onSpawn) onSpawn(q);
  } else if (!want && q && hiddenFrom(g, q.x, q.z)) {
    removePed(g, q); q = S[key] = null;
  }
  return q;
}
const ebbeSits = (q) => sit(q, EBBE.ebbe.x, EBBE.ebbe.z, EBBE.ebbe.h, CURB_H + 0.47);

// every step (mission.js): the people of the three quests
export function southWorld(mgr) {
  const U = UTSIKT, E = EBBE, Ms = MASEN;
  const uOpen = mgr.isOpen('utsikten');
  keep(mgr, 'bengt', uOpen, LOOKS.bengt, U.bengt, 'bengt-gate', 'utsikten');
  keep(mgr, 'dahl', uOpen, LOOKS.dahlgren, U.dahl, 'dahlgren', 'utsikten');
  keep(mgr, 'buyer', uOpen, LOOKS.buyer, U.buyer, 'buyer', 'utsikten');
  const eOpen = mgr.isOpen('ebbe');
  keep(mgr, 'hanna', eOpen, LOOKS.hanna, E.hanna, 'hanna', 'ebbe');
  keep(mgr, 'ebbe', eOpen, LOOKS.ebbe, E.ebbe, 'ebbe', 'ebbe', ebbeSits);
  for (const w of E.wit) keep(mgr, w.id, eOpen, LOOKS[w.id], w, w.id, 'ebbe');
  keep(mgr, 'rut', mgr.isOpen('masen'), LOOKS.rut, Ms.rut, 'rut', 'masen');
  // Lasse in his gate with the belt, while you are on your way to him
  const L = mgr.masenLasse, g = mgr.game, job = mgr.active && mgr.active.id === 'masen' ? mgr.active : null;
  if (job && job.stage === 'drive' && !L && hiddenFrom(g, Ms.lasseAt.x, Ms.lasseAt.z)) mgr.masenLasse = spawnPed(g, CUSTOMERS[2].look, Ms.lasseAt.x, Ms.lasseAt.z, Ms.lasseAt.h, 'lasse-out');
  else if (L && !(job && job.stage === 'drive') && hiddenFrom(g, L.x, L.z)) { removePed(g, L); mgr.masenLasse = null; }
}
const person = (mgr, key) => { const q = mgr.south && mgr.south[key]; return q && mgr.game.peds.list.includes(q) ? q : null; };
function ensure(mgr, key, look, at, npc, onSpawn) {
  let q = person(mgr, key);
  if (!q) { (mgr.south || (mgr.south = {}))[key] = q = spawnPed(mgr.game, look, at.x, at.z, at.h, npc); if (onSpawn) onSpawn(q); }
  return q;
}
// face each other and frame the two of you for a talk
function talkTo(job, ped, owner) {
  const g = job.game, p = g.player;
  p.frozen = true; p.vx = p.vz = 0;
  p.h = face(p, ped);
  if (ped.state !== 'lounge') { ped.standH = ped.h = face(ped, p); ped.body.h = ped.h; }
  const line = face(p, ped);
  g.camFocus = { x: (p.x + ped.x) / 2, y: 0.5, z: (p.z + ped.z) / 2, yaw: line - 0.6, owner, near: true };
}
function endTalk(g, owner) {
  g.player.frozen = false;
  if (g.camFocus && g.camFocus.owner === owner) g.camFocus = null;
}

// ================================================================== main quest, part 11: "Utsikten"
export class ViewJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'utsikten';
    this.stage = 'talk';   // talk → wheel → riding (spot) → approach → chase → caught → done
    this.prompt = null;
    this.titleCard = true;
    this.freeRide = true;  // Bengt has paid for the wheel
  }

  get allowRide() { return this.stage === 'wheel'; }
  get D() { return person(this.mgr, 'dahl'); }

  start() {
    const g = this.game, m = this.mgr, U = UTSIKT;
    const B = ensure(m, 'bengt', LOOKS.bengt, U.bengt, 'bengt-gate');
    ensure(m, 'dahl', LOOKS.dahlgren, U.dahl, 'dahlgren');
    ensure(m, 'buyer', LOOKS.buyer, U.buyer, 'buyer');
    talkTo(this, B, this.id);
    const again = !!m.flags.utsiktSpotted;
    this.again = again;
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: again ? [
      { ...BENGT, text: 'Han är tillbaka vid picknickborden – jag såg honom nyss. Köparen också. Spring fortare den här gången!', last: 'NU TAR JAG HONOM' },
    ] : [
      { ...BENGT, text: 'Psst. Det är jag. Bengt. Mössan av, så att Dahlgren inte känner igen mig.' },
      { ...BENGT, text: 'Kommer du ihåg vad han sa i byggbaracken? Han fotade båda halvorna av Arnes recept. Nu säljer han bilderna – till Kexfabriken i Malmö!' },
      { ...BENGT, text: 'Han ska träffa köparen här på tivolit i dag. Men det är fullt med folk, och han har säkert förklätt sig.' },
      { ...YOU, text: 'Hur ska jag hitta honom bland alla människor?' },
      { ...BENGT, text: 'Uppifrån! Från pariserhjulet ser man hela tivolit. Här – jag har köpt en biljett åt dig.', last: 'TILL HJULET' },
    ] }), this);
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, D = this.D;
    this.prompt = null;
    if (this.stage === 'talk' || this.stage === 'caught' || this.stage === 'done' || this.stage === 'spot') return;
    if (!D) { m.fail(this, 'Dahlgren försvann'); return; }
    if (this.stage === 'wheel') {
      if (p.state === 'ride') { this.stage = 'riding'; return; }
      if (Math.hypot(p.x - SOUTH.center.x, p.z - SOUTH.center.z) > 200) { m.quit(this, [WHO.bengt, 'Var tog du vägen? Dahlgren är kvar på tivolit – biljetten till hjulet har du kvar.']); return; }
      m.setObjective('Åk pariserhjulet och spana efter Dahlgren', 'Uppför rampen till plattformen · ÅK HJULET · Bengt har betalat');
      return;
    }
    if (this.stage === 'riding') {
      if (p.state === 'ride') {
        const a = wheelAngle(g.time) + (m.rides.k / WHEEL.n) * Math.PI * 2;
        if (!this.spotted && Math.cos(a) < -0.9) this.spot();
        m.setObjective(this.spotted ? 'Ner igen – och fram till Dahlgren' : 'Spana efter Dahlgren', this.spotted ? 'Vid picknickborden längst österut' : 'Snart högst upp…');
        return;
      }
      if (!this.spotted) { this.stage = 'wheel'; return; }   // (cannot happen: the top comes before the end)
      this.stage = 'approach';
      g.emit('toast', { text: 'Gå fram till Dahlgren vid picknickborden. Ser han dig springer han – spring ikapp honom!', long: true });
      return;
    }
    if (this.stage === 'approach') {
      const d = Math.hypot(p.x - D.x, p.z - D.z);
      m.setObjective('Ta Dahlgren', `Han står med köparen vid picknickborden · ${Math.round(d)} m`);
      if (d < UTSIKT.notice) this.flee();
      return;
    }
    if (this.stage === 'chase') {
      const d = Math.hypot(p.x - D.x, p.z - D.z);
      if (d < 1.4) { this.catch(); return; }
      if (D.arrived || d > 120) { this.escape(); return; }
      if (D.state !== 'goto') D.goto(this.left(), UTSIKT.speed);            // (bumped into someone: off again)
      m.setObjective('Spring ikapp Dahlgren!', `${Math.round(d)} m · ${p.inCar ? 'han springer där bilar inte kommer fram' : 'spring – han får inte nå parkeringen'}`);
    }
  }

  // the rest of his way out, from where he is
  left() {
    const D = this.D;
    this.cut = Math.min(UTSIKT.route.length - 1, (this.cut || 0) + (D.ri || 0));
    return UTSIKT.route.slice(this.cut);
  }

  spot() {
    const g = this.game, m = this.mgr, p = g.player, D = this.D;
    this.spotted = true; this.stage = 'spot';
    m.flags.utsiktSpotted = true;
    p.rideYaw = face(p, D);                                   // the camera turns his way
    m.later(0.4, () => g.emit('talk', { id: this.id, pages: [
      { ...YOU, text: 'Vilken utsikt… Karusellen, Måsen, hela Sjuby. Och där borta – vid picknickborden.' },
      { ...YOU, text: 'En man i kostym, keps och solglasögon. Han tittar sig över axeln hela tiden. Och han visar en kvinna i röd kappa något i mobilen.' },
      { ...YOU, text: 'Dahlgren. Nu har jag dig.', last: 'NER IGEN' },
    ] }), this);
  }

  flee() {
    const g = this.game, m = this.mgr, D = this.D, K = person(m, 'buyer');
    this.stage = 'chase'; this.cut = 0;
    standUp(g, D);
    D.goto(UTSIKT.route, UTSIKT.speed);
    g.emit('say', { who: D, text: 'Du!? Från byggbaracken!' });
    if (K) { K.goto([[83.5, 236], [83.5, 214]], 1.6); m.later(1.2, () => g.emit('say', { who: K, text: 'Affären är avblåst, Dahlgren!' }), this); }
    g.emit('hint', { id: 'sprint', touch: 'Dra spaken hela vägen ut för att springa.', keys: 'Håll in Shift för att springa.' });
  }

  catch() {
    const g = this.game, m = this.mgr, p = g.player, D = this.D;
    this.stage = 'caught';
    D.vx = D.vz = 0;
    sit(D, D.x, D.z, face(D, p), g.world.groundHeight(D.x, D.z) + 0.12);   // down on the ground, out of breath
    if (p.inCar) p.exitCar();
    talkTo(this, D, this.id);
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: [
      { ...DAHLGREN, text: 'Uff… Okej, okej! Jag ger mig. Ingen idé att springa i min ålder.' },
      { ...YOU, text: 'Mobilen. Nu.' },
      { ...DAHLGREN, text: 'Kexfabriken skulle betala hundratusen för de där bilderna. Hundratusen!' },
      { ...YOU, text: 'Raderade. Båda halvorna. Och papperskorgen också.' },
      { ...DAHLGREN, text: 'Trettio år har jag försökt baka Arnes bullar. Inte en enda gång har de blivit rätt. Inte ens med receptet.' },
      { ...DAHLGREN, text: 'Säg till Gun… att hennes bullar är bäst. Men säg inte att jag sa det.', last: 'KLART' },
    ] }), this);
  }

  escape() {
    const g = this.game, m = this.mgr, D = this.D;
    if (D) g.emit('say', { who: D, text: 'Ha! Ni får aldrig tag på mig!' });
    m.fail(this, 'Dahlgren kom undan', [WHO.bengt, 'Han smet till parkeringen! Men han kommer tillbaka – köparen väntar fortfarande på bilderna. Möt mig vid valvet igen.']);
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'talk') {
      endTalk(g, this.id);
      this.stage = this.again ? 'approach' : 'wheel';
      if (!this.again) g.emit('toast', { text: 'Gå in under valvet till pariserhjulet och tryck ÅK HJULET. Spana efter Dahlgren högst upp!', long: true });
      return;
    }
    if (this.stage === 'spot') { this.stage = 'riding'; p.rideYaw = Math.PI; return; }
    if (this.stage !== 'caught') return;
    this.stage = 'done';
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Utsikten', amount: UTSIKT.reward });
    m.sms(WHO.bengt, 'Gun grät när jag berättade. Glada tårar! Receptet finns bara på ett ställe nu – i hennes kassaskåp. Och Dahlgren? Han har sökt jobb som diskare hos Kexfabriken, hörde jag.', 7);
  }

  targets(T) {
    const m = this.mgr, D = this.D, B = person(m, 'bengt');
    if (B && this.stage === 'talk') T.push({ kind: 'contact', x: B.x, z: B.z, r: 1, letter: 'B', color: BENGT.color, badgeOnly: true, badgeY: 2.7, ref: B });
    if (this.stage === 'wheel') T.push({ kind: 'zone', x: WHEEL.board.x, z: WHEEL.board.z, r: 1.3, gps: true });
    if (D && (this.stage === 'approach' || this.stage === 'chase' || (this.stage === 'riding' && this.spotted)))
      T.push({ kind: 'contact', x: D.x, z: D.z, r: 1, letter: 'D', color: DAHLGREN.color, badgeOnly: true, badgeY: 2.8, ref: D, gps: true, always: true });
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player, D = this.D;
    endTalk(g, this.id);
    p.rideYaw = Math.PI;
    if (D && D.state === 'lounge') standUp(g, D);
    // off he goes – southWorld puts him back at the picnic tables (if the quest is still open) when nobody looks
    if (D && this.stage === 'done') D.goto([[D.x, D.z + 0.5], ...UTSIKT.route.slice(1)], 1.0);
    else if (D && this.stage !== 'talk') D.goto([[-70, 200.6]], 3.0);
  }
}

// ================================================================== side quest: "Var är Ebbe?"
const CLUES = [
  'Ebbe? Liten kille med grön keps? Han stod här och tittade på sockervadden, men han hade inga pengar. Sedan sprang han mot karusellen.',
  'Grön keps, ja! Han åkte tre varv på den vita hästen och ropade "tjoho" hela tiden. Sedan ville han se tåget – Måsen.',
  'Han var för kort för Måsen – man måste vara 120 centimeter. Han blev så ledsen. Sist jag såg honom gick han mot pariserhjulet.',
];
export class EbbeJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'ebbe';
    this.stage = 'talk';   // talk → ask (three people, in order) → find → lead → final → done
    this.prompt = null;
    this.titleCard = true;
    this.asked = mgr.flags.ebbeAsked || 0;
  }

  get hanna() { return person(this.mgr, 'hanna'); }
  get ebbe() { return person(this.mgr, 'ebbe'); }

  start() {
    const g = this.game, m = this.mgr, E = EBBE;
    const H = ensure(m, 'hanna', LOOKS.hanna, E.hanna, 'hanna');
    if (!this.ebbe) ensure(m, 'ebbe', LOOKS.ebbe, E.ebbe, 'ebbe', ebbeSits);
    else if (this.ebbe.state !== 'lounge') { removePed(g, this.ebbe); m.south.ebbe = null; ensure(m, 'ebbe', LOOKS.ebbe, E.ebbe, 'ebbe', ebbeSits); }
    for (const w of E.wit) ensure(m, w.id, LOOKS[w.id], w, w.id);
    talkTo(this, H, this.id);
    const again = this.asked > 0;
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: again ? [
      { ...HANNA, text: `Ingen Ebbe än… ${this.asked < 3 ? `Fråga ${E.wit[this.asked].name} – du var på god väg!` : 'Han gick mot pariserhjulet, sa du?'}`, last: 'JAG LETAR' },
    ] : [
      { ...HANNA, text: 'Tack för att du kom! Jag vände mig om för att köpa biljetter, och när jag vände mig tillbaka var Ebbe borta.' },
      { ...HANNA, text: 'Han är fem år, har gul tröja och grön keps. Han vill alltid ha sockervadd.' },
      { ...YOU, text: 'Vi frågar folk. Någon har säkert sett honom.' },
      { ...HANNA, text: 'Jag stannar här vid kiosken, ifall han kommer tillbaka. Börja med Popcorn-Pelle – han ser allt.', last: 'JAG LETAR' },
    ] }), this);
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, E = EBBE, Eb = this.ebbe, H = this.hanna;
    this.prompt = null; this.near = null;
    if (this.stage === 'talk' || this.stage === 'read' || this.stage === 'final' || this.stage === 'done') return;
    if (!Eb || !H) { m.quit(this); return; }
    if (Math.hypot(p.x - SOUTH.center.x, p.z - SOUTH.center.z) > 200) { m.quit(this, [WHO.hanna, 'Vart tog du vägen? Jag letar själv så länge – kom tillbaka, snälla.']); return; }
    const onFoot = p.state === 'foot' && !p.frozen;
    if (this.stage === 'ask') {
      const w = E.wit[this.asked], W = person(m, w.id);
      m.setObjective(`Fråga ${w.name}`, `Var är Ebbe? · ledtråd ${this.asked + 1} av 3`);
      if (W && Math.hypot(p.x - W.x, p.z - W.z) < 8 && W.state === 'stand') W.standH = face(W, p);
      if (W && onFoot && Math.hypot(p.x - W.x, p.z - W.z) < 2.0) { this.prompt = 'PRATA'; this.near = { wit: w, ped: W }; }
      return;
    }
    if (this.stage === 'find') {
      m.setObjective('Hitta Ebbe', 'Han gick mot pariserhjulet');
      if (onFoot && Math.hypot(p.x - Eb.x, p.z - Eb.z) < 2.0) { this.prompt = 'PRATA'; this.near = { ebbe: true }; }
      return;
    }
    if (this.stage === 'lead') {
      const d = Math.hypot(p.x - Eb.x, p.z - Eb.z), dh = Math.hypot(Eb.x - H.x, Eb.z - H.z);
      if (dh < 4.5 && d < 3.5 && Math.hypot(p.x - H.x, p.z - H.z) < 3.5) { this.home(); return; }
      if (d > 30) {
        // he lost you in the crowd: back to his bench, out of sight
        g.emit('toast', { text: 'Ebbe tappade bort dig i trängseln – han gick tillbaka till bänken vid hjulet.', long: true });
        removePed(g, Eb); m.south.ebbe = null; ensure(m, 'ebbe', LOOKS.ebbe, E.ebbe, 'ebbe', ebbeSits);
        this.stage = 'find';
        return;
      }
      // he follows you: walks when you are a little ahead, runs when you are far ahead
      if ((this.followT = (this.followT || 0) - dt) <= 0) {
        this.followT = 0.3;
        if (d > 1.8) { const k = 1.3 / d; Eb.goto([[p.x + (Eb.x - p.x) * k, p.z + (Eb.z - p.z) * k]], d > 5 ? 3.8 : 2.3); }
        else if (Eb.state === 'goto') { Eb.state = 'stand'; Eb.standH = face(Eb, p); }
      }
      if (d > 9 && !this.waitSaid) { this.waitSaid = true; g.emit('say', { who: Eb, text: 'Vänta på mig!' }); }
      if (d < 4) this.waitSaid = false;
      m.setObjective('Följ Ebbe tillbaka till Hanna', `Vid biljettkiosken · Ebbe ${d > 6 ? 'halkar efter – vänta på honom' : 'går bredvid dig'}`);
    }
  }

  interact() {
    const g = this.game, m = this.mgr, n = this.near;
    if (!this.prompt || !n) return false;
    if (n.wit) {
      talkTo(this, n.ped, this.id);
      this.stage = 'read';
      this.asked++; m.flags.ebbeAsked = this.asked;
      g.emit('talk', { id: this.id, pages: [{ who: n.wit.name, letter: n.wit.name[0], color: '#8a6440', text: CLUES[this.asked - 1], last: 'TACK' }] });
      return true;
    }
    if (n.ebbe) {
      talkTo(this, this.ebbe, this.id);
      this.stage = 'read';
      this.found = true;
      g.emit('talk', { id: this.id, pages: [
        { ...EBBE_T, text: '*snyft* Jag fick inte åka Måsen. Jag är för liten. Och nu hittar jag inte mamma.' },
        { ...YOU, text: 'Hej Ebbe. Mamma väntar vid biljettkiosken. Ska vi gå dit tillsammans?' },
        { ...EBBE_T, text: 'Får jag sockervadd då?', last: 'VI GÅR' },
      ] });
      return true;
    }
    return false;
  }

  home() {
    const g = this.game, m = this.mgr, H = this.hanna, Eb = this.ebbe;
    this.stage = 'final';
    Eb.state = 'stand'; Eb.standH = Eb.h = face(Eb, H);
    talkTo(this, H, this.id);
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: [
      { ...HANNA, text: 'EBBE! Där är du ju! Gör aldrig så igen, hör du det?' },
      { ...EBBE_T, text: 'Mamma, jag åkte den vita hästen tre gånger! Och jag var nästan lång nog för Måsen.' },
      { ...HANNA, text: `Tack, tack, tack. Här – ${fmt(EBBE.pay)} kr. Och en sockervadd till dig också, om du vill.`, last: 'TACK!' },
    ] }), this);
  }

  talkDone() {
    const g = this.game, m = this.mgr, E = EBBE;
    if (this.stage === 'talk') { endTalk(g, this.id); this.stage = this.asked >= 3 ? 'find' : 'ask'; return; }
    if (this.stage === 'read') {
      endTalk(g, this.id);
      if (this.found) {
        this.stage = 'lead';
        standUp(g, this.ebbe);
        g.emit('toast', { text: 'Gå tillbaka till Hanna vid biljettkiosken – Ebbe följer efter dig. Gå lugnt, han har korta ben.', long: true });
      } else this.stage = this.asked >= 3 ? 'find' : 'ask';
      return;
    }
    if (this.stage !== 'final') return;
    this.stage = 'done';
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Var är Ebbe?', amount: E.pay });
  }

  targets(T) {
    const m = this.mgr, H = this.hanna, Eb = this.ebbe;
    if (H && (this.stage === 'talk' || this.stage === 'lead' || this.stage === 'final')) T.push({ kind: 'contact', x: H.x, z: H.z, r: 1, letter: 'H', color: HANNA.color, badgeOnly: true, badgeY: 2.6, ref: H, gps: this.stage === 'lead' });
    if (this.stage === 'ask') {
      const w = EBBE.wit[this.asked], W = person(m, w.id);
      if (W) T.push({ kind: 'contact', x: W.x, z: W.z, r: 1, letter: '?', color: '#ffcf33', badgeOnly: true, badgeY: 2.7, ref: W, gps: true });
    }
    if (Eb && this.stage === 'find') T.push({ kind: 'zone', x: Eb.x, z: Eb.z + 1.2, r: 1.2, gps: true });
    if (Eb && this.stage === 'lead') T.push({ kind: 'contact', x: Eb.x, z: Eb.z, r: 1, letter: 'E', color: EBBE_T.color, badgeOnly: true, badgeY: 1.9, ref: Eb });
  }

  cleanup() {
    const g = this.game, m = this.mgr, Eb = this.ebbe;
    endTalk(g, this.id);
    m.flags.ebbeAsked = this.stage === 'done' ? 0 : this.asked;
    if (this.stage === 'done') {
      // mother and son go off for candy floss together
      const H = this.hanna;
      if (H) H.goto([[36, 212.4]], 1.0, Math.PI);
      if (Eb) Eb.goto([[37.2, 212.6]], 1.4, Math.PI);
    } else if (Eb && this.stage === 'lead') { removePed(g, Eb); m.south.ebbe = null; }
  }
}

// ================================================================== side quest: "Måsen har fastnat"
export class CoasterJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'masen';
    this.stage = 'talk';   // talk → drive (to Lasse) → back (to the arch) → carry (to Rut) → final → done
    this.prompt = null;
    this.titleCard = true;
    this.left = MASEN.time;
  }

  get rut() { return person(this.mgr, 'rut'); }

  start() {
    const g = this.game, m = this.mgr, R = ensure(m, 'rut', LOOKS.rut, MASEN.rut, 'rut');
    // Rut's van in the car park, for anyone who came on foot
    const V = MASEN.van, v = m.rutVan;
    if (!v || v.removed || v.dead || (v.driver === null && Math.hypot(v.x - V.x, v.z - V.z) > 3)) {
      if (v && !v.removed && v.driver !== 'player') g.removeVehicle(v);
      if (g.makeRoom('van')) { m.rutVan = g.addVehicle('van', 'white', V.x, V.z, V.h); if (m.rutVan) m.rutVan.parkedSpot = true; }
    }
    talkTo(this, R, this.id);
    const again = !!m.flags.masenTalked;
    m.flags.masenTalked = true;
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: again ? [
      { ...RUT, text: 'De sitter kvar där uppe. Drivremmen, från Lasses Verkstad – två minuter, sedan ringer jag brandkåren. Min vita skåpbil står på parkeringen.', last: 'KÖR' },
    ] : [
      { ...RUT, text: 'Rut heter jag. Jag har ägt Lyckoland i fyrtio år, och Måsen har aldrig stannat. Aldrig! Förrän i dag.' },
      { ...RUT, text: 'Drivremmen i liftbacken har gått av. Åtta åkare sitter där uppe och tittar ner på oss.' },
      { ...YOU, text: 'Kan de inte klättra ner?' },
      { ...RUT, text: 'Tretton meter? Nej du. Lasse på Verkstan har en ny drivrem – jag har ringt honom. Hämta den, fort!' },
      { ...RUT, text: 'Om två minuter ringer jag brandkåren, och då hamnar vi i Sjuby Tidning. Min vita skåpbil står på parkeringen, nyckeln sitter i.', last: 'KÖR' },
    ] }), this);
  }

  get inVehicle() { const p = this.game.player; return !!(p.inCar && !p.car.dead); }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, R = this.rut, M = MASEN;
    this.prompt = null;
    if (this.stage === 'talk' || this.stage === 'final' || this.stage === 'done') return;
    if (!R) { m.quit(this); return; }
    if (this.stage === 'drive' || this.stage === 'back') {
      this.left -= dt;
      if (this.left <= 0) { m.fail(this, 'Åkarna fick vänta för länge', [WHO.rut, 'Brandkåren fick plocka ner dem med stege. Pinsamt! Men remmen är fortfarande trasig – kom tillbaka, så försöker vi igen.']); return; }
      if (Math.floor(this.left) === 30 && !this.warned) { this.warned = true; g.emit('toast', { text: '30 sekunder kvar innan Rut ringer brandkåren!' }); }
    }
    const sec = `${Math.ceil(this.left)} s kvar`;
    if (this.stage === 'drive') {
      const car = p.inCar ? p.car : null;
      if (car && Math.hypot(car.x - M.lasse.x, car.z - M.lasse.z) < M.lasse.r && car.speed < 3) {
        this.stage = 'back';
        g.emit('keys', { item: 'belt' });
        g.emit('toast', { text: 'Lasse slänger in en ny drivrem genom fönstret. Tillbaka till tivolit!', long: true });
        if (m.masenLasse) g.emit('say', { who: m.masenLasse, text: 'Hälsa Rut! Och kör inte för fort.' });
        return;
      }
      m.setObjective(car ? 'Kör till Lasses Verkstad' : 'Ta en bil – Ruts vita skåpbil står på parkeringen', `Lasse väntar vid grinden på Drottninggatan · ${sec}`);
      return;
    }
    if (this.stage === 'back') {
      const car = p.inCar ? p.car : null;
      if (car && Math.hypot(car.x - M.back.x, car.z - M.back.z) < M.back.r && car.speed < 3) {
        this.stage = 'carry';
        this.amount = M.base + M.perSec * Math.max(0, Math.ceil(this.left));
        g.emit('toast', { text: 'Kliv ur och spring in med remmen till Rut vid Måsen!', long: true });
        return;
      }
      m.setObjective(car ? 'Kör tillbaka till tivolit' : 'Ta en bil tillbaka till tivolit', `Stanna utanför valvet · ${sec}`);
      return;
    }
    if (this.stage === 'carry') {
      m.setObjective('Ge drivremmen till Rut', 'Vid Måsens station');
      if (p.state === 'foot' && !p.frozen && Math.hypot(p.x - R.x, p.z - R.z) < 2.0) this.prompt = 'GE REMMEN';
    }
  }

  interact() {
    const g = this.game, m = this.mgr;
    if (this.prompt !== 'GE REMMEN') return false;
    this.stage = 'final';
    talkTo(this, this.rut, this.id);
    m.later(0.4, () => g.emit('talk', { id: this.id, pages: [
      { ...RUT, text: 'Remmen! Ge hit. Ett, två… klick. Och så startknappen…' },
      { ...RUT, fx: 'go', text: 'Hör du? Måsen lever! Och där kommer de – hela vägen ner. Hör hur de skriker. Av glädje, hoppas jag.' },
      { ...RUT, text: `Fyrtio år, och aldrig har någon hjälpt mig så snabbt. Här har du ${fmt(this.amount)} kr – och fri åkning i hjulet när du vill. Nästan.`, last: 'TACK!' },
    ] }), this);
    return true;
  }

  talkFx(fx) { if (fx === 'go') { this.running = true; this.mgr.coasterFixed = true; } }

  talkDone() {
    const g = this.game, m = this.mgr;
    if (this.stage === 'talk') {
      endTalk(g, this.id);
      this.stage = 'drive';
      g.emit('toast', { text: `Hämta drivremmen hos Lasse på Verkstan och kom tillbaka – ${MASEN.time} sekunder!`, long: true });
      return;
    }
    if (this.stage !== 'final') return;
    this.stage = 'done';
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Måsen har fastnat', amount: this.amount });
  }

  targets(T) {
    const R = this.rut, M = MASEN, p = this.game.player;
    if (R && (this.stage === 'talk' || this.stage === 'carry' || this.stage === 'final')) T.push({ kind: 'contact', x: R.x, z: R.z, r: 1, letter: 'R', color: RUT.color, badgeOnly: true, badgeY: 2.6, ref: R, gps: this.stage === 'carry' });
    if (this.stage === 'drive') {
      const v = this.mgr.rutVan;
      if (!p.inCar && v && !v.removed && !v.dead) T.push({ kind: 'car', car: v, color: 0x46c96f, gps: true });
      else T.push({ kind: 'zone', x: M.lasse.x, z: M.lasse.z, r: M.lasse.r, gps: true });
    }
    if (this.stage === 'back') T.push({ kind: 'zone', x: M.back.x, z: M.back.z, r: M.back.r, gps: true });
  }

  cleanup() { endTalk(this.game, this.id); }
}

// Måsen stands still while its quest is open (and has not been mended in the last talk)
export function coasterStuck(mgr) {
  return mgr.isOpen('masen') && !mgr.coasterFixed;
}
