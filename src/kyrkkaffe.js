// Side quest "Kyrkkaffet" (v1.10), from kyrkoherde Inga in Söderholmens kapell. It is Sunday, with
// church coffee after the service – but tant Gun has put her back out in the middle of her Sunday
// baking and can't cycle the buns out, and the cantor is home with a fever. Collect the 24 buns at
// Gun's on Storgatan and ride them out to the chapel in the box on Arne's old delivery bike, over the
// south bridge (every fall off the bike costs six buns). Carry them in (BÄR IN), ring the bell three
// times by the rope at the door (RINGA) – Gun, Yasmin, Bagar-Bengt and Ingvar come in and sit down –
// and then play the "psalm" on the organ (SPELA): Inga sings a verse, you play it back (organ.js).
// It turns out to be Beethoven: Arne's wish for his and Gun's wedding in the chapel in 1972.
import { WHO, GUN, GUN_BIKE, BIKE_RETURN } from './config.js';
import { CHAPEL, CHAPEL_DOOR, CHAPEL_KAFFE as K, pewSeat } from './chapel.js';
import { onSouth } from './southisle.js';
import { seat } from './barber.js';
import { spawnPed } from './hideout.js';
import { GUN_LOOK } from './flag.js';
import { YASMIN_LOOK, INGVAR_LOOK } from './livs.js';
import { BENGT_LOOK } from './opening.js';
import { fmt } from './rng.js';

export const KYRK = {
  mark: { x: GUN.x + 1.6, z: GUN.z + 0.6, r: 1.1 },    // in Gun's front garden, just inside the gap in her hedge
  buns: 24, fall: 6,                                     // buns in the box; a fall off the bike costs six
  near: 10,                                              // Arne's bike this close to the chapel door: you can carry the buns in
  pay: { base: 700, bun: 25, psalm: 300, wrong: 50 },   // 700 kr + 25 kr a bun + 300 kr for the psalm (50 kr less for every wrong key)
};
export const KYRK_MAX = KYRK.pay.base + KYRK.buns * KYRK.pay.bun + KYRK.pay.psalm;
export const kyrkPay = (buns, wrong) => KYRK.pay.base + buns * KYRK.pay.bun + Math.max(0, KYRK.pay.psalm - wrong * KYRK.pay.wrong);

const GUN_T = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const INGA = { who: 'Kyrkoherde Inga', letter: 'I', color: '#6b4fa0' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const R = CHAPEL.room;
const at = (x, z) => [R.x0 + x, R.z0 + z];          // chapel-local → world
// after the psalm: the three of you in a row in front of the altar, facing the pews
const FINALE = { you: at(3.05, 11.72), inga: at(4.0, 11.85), gun: at(4.95, 11.68) };

// the guests who come in when the bell has rung, and where they sit (row 5 is the front, row 0 the back)
export const GUESTS = [
  { npc: 'church-gun', look: GUN_LOOK, row: 5, x: 5.35, line: 'Ryggskott eller inte – kyrkkaffet missar jag aldrig!' },
  { npc: 'church-yasmin', look: YASMIN_LOOK, row: 3, x: 2.2, line: 'Hej hej! Jag har stängt butiken en kvart.' },
  { npc: 'church-bengt', look: BENGT_LOOK, row: 4, x: 5.6, line: 'Jag kom för bullarnas skull. Och för själens, förstås.' },
  { npc: 'church-ingvar', look: INGVAR_LOOK, row: 0, x: 7.0, line: null },   // at the very back – and he never says a word
];
const WORDS = { 24: 'Tjugofyra', 18: 'Arton', 12: 'Tolv', 6: 'Sex' };

export function gunPages(again, borrowed) {
  if (again) {
    return [
      { ...GUN_T, fx: 'buns', text: 'Där är du ju! Jag har bakat en ny sats – tjugofyra stycken, varma ur ugnen. De ligger redan i cykellådan.' },
      { ...GUN_T, text: 'Och den här gången: försiktigt i kurvorna, lilla vän.', last: 'JAG CYKLAR!' },
    ];
  }
  return [
    { ...GUN_T, text: 'Där är du ju, lilla vän! Inga ringde och sa att du var på väg.' },
    { ...GUN_T, text: 'Ryggskott, mitt i söndagsbaket. Jag kan stå och jag kan baka – men cykla ut till Söderholmen? Inte en chans.' },
    { ...GUN_T, fx: 'buns', text: `Tjugofyra kanelbullar, nygräddade. De ligger i lådan på Arnes gamla cykel – han cyklade ut kyrkbullarna varje söndag i trettio år.${borrowed ? ' Jag lånade tillbaka den av Melker i morse.' : ''}` },
    { ...YOU, text: 'Då cyklar jag ut dem.' },
    { ...GUN_T, text: 'Kör försiktigt – ramlar du blir det smulor av alltihop. Över södra bron, och kapellet ligger bakom tivolits parkering.', last: 'JAG CYKLAR!' },
  ];
}

export function welcomePages(buns) {
  const verdict = buns >= KYRK.buns ? 'Tjugofyra stycken, och inte en smula borta! Vi lägger dem här på kaffebordet.'
    : buns >= 12 ? `${WORDS[buns] || buns} bullar. Några blev visst kvar på vägen, men det räcker gott. Vi lägger dem här på kaffebordet.`
      : `${WORDS[buns] || buns} bullar… Nåja. Fem tusen blev mätta på fem bröd och två fiskar, har jag läst. Vi lägger dem här på kaffebordet.`;
  return [
    { ...INGA, text: 'Bullarna! Och med Arnes cykel – det var länge sedan jag såg den stå utanför kapellet.' },
    { ...INGA, fx: 'table', text: verdict },
    { ...INGA, text: 'Nu ringer vi in till kyrkkaffet. Klockrepet hänger där vid dörren. Tre slag, så kommer folk.' },
    { ...YOU, text: 'Och psalmen? Kantorn är ju sjuk.' },
    { ...INGA, text: 'En sak i taget, sa biskopen. Ring i klockan först.', last: 'RINGA!' },
  ];
}

export function announcePages() {
  return [
    { ...INGA, text: 'Välkomna allihop till kyrkkaffe! Men först sjunger vi en psalm.' },
    { ...INGA, text: 'Kantorn ligger hemma med feber, så i dag spelar vår gäst. Sätt dig vid orgeln där framme – jag sjunger först, och du spelar samma toner efter.', last: 'TILL ORGELN' },
  ];
}

export function finalePages(wrong, amount) {
  const verdict = wrong === 0 ? 'Inte en enda falsk ton!'
    : wrong <= 3 ? 'Ett par toner gick lite vilse – men det gör min predikan också.'
      : 'Några toner var… moderna. Men Beethoven var ju döv på slutet, han med.';
  return [
    { ...INGA, text: 'Amen! Så vackert har det inte låtit här sedan… ja, sedan 1972.' },
    { ...GUN_T, text: 'Det där är ingen psalm, Inga. Det är Beethoven. Arne ville ha den på vårt bröllop.' },
    { ...INGA, text: 'Och kantorn tyckte att det var opassande. Men Arne bjöd honom på bullar, och sedan var det inte mer med det. Jag satt längst bak – jag var femton år.' },
    { ...GUN_T, text: 'Tack, lilla vän. Det var som att höra Arne igen.' },
    { ...INGA, text: `${verdict} Här är ${fmt(amount)} kronor ur kollekten för besväret – och ta en bulle innan Bengt tar alla.`, last: 'TACK, INGA' },
  ];
}

// out of sight: nobody near, or far enough and not in view
const hidden = (g, x, z) => { const p = g.player, d = Math.hypot(x - p.x, z - p.z); return d > 70 || (d > 35 && !g.visible(x, z)); };
const TOWER_SPOT = { x: BIKE_RETURN.x - 1.4, z: BIKE_RETURN.z + 0.4, h: Math.PI / 2 };

// Arne's bike waits by Gun's gate while the quest is open (moved there when nobody sees it), and goes
// back where it lives afterwards: by the tower with Melker, or by Gun's gate
export function churchWorld(mgr) {
  const g = mgr.game, b = g.bike, p = g.player;
  if (!b || b.removed || mgr.active || (p.inCar && p.car === b)) return;
  let home = null;
  if (mgr.isOpen('kyrkkaffe')) home = GUN_BIKE;
  else if (mgr.flags.kyrkBikeHome) home = mgr.done.has('cykelretur') ? TOWER_SPOT : GUN_BIKE;
  if (!home) return;
  if (Math.hypot(b.x - home.x, b.z - home.z) < 4) { mgr.flags.kyrkBikeHome = false; return; }
  if (!hidden(g, b.x, b.z) || !hidden(g, home.x, home.z)) return;
  g.spawnBike(home.x, home.z, home.h, false);
  mgr.flags.kyrkBikeHome = false;
}

export class ChurchJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'kyrkkaffe';
    this.stage = 'gun';     // gun → ride → enter → welcome → bell → guests → announce → organ ⇄ playing → finale → done
    this.prompt = null;
    this.buns = 0;          // in the box on Arne's bike (then on the coffee table)
    this.rings = 0; this.ringAt = -9;
    this.guests = [];       // { def, ped, seat, at, seated }
    this.t = 0;
    this.wrongSaid = 0;
    this.holdsChapel = true; // indoors.js leaves the chapel's buttons (PRATA, RINGA, SPELA) to this job
  }

  get bike() { const b = this.game.bike; return b && !b.removed ? b : null; }
  get riding() { const p = this.game.player, b = this.bike; return !!(b && p.inCar && p.car === b); }
  get inga() { return this.game.indoors.priest; }
  get organ() { return this.game.indoors.organ; }
  guest(npc) { const G = this.guests.find((q) => q.def.npc === npc); return G ? G.ped : null; }

  start() {
    const g = this.game, m = this.mgr, p = g.player, flag = m.flag, gun = flag.gun;
    if (gun.away) flag.toHome(); // (she is at home in her garden, with her bad back)
    // Arne's bike stands by her gate (unless you parked it close by yourself)
    const b = this.bike;
    if (!b || Math.hypot(b.x - GUN_BIKE.x, b.z - GUN_BIKE.z) > 25) g.spawnBike(GUN_BIKE.x, GUN_BIKE.z, GUN_BIKE.h, false);
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(gun.x - p.x, gun.z - p.z);
    gun.standH = gun.h = Math.atan2(p.x - gun.x, p.z - gun.z); gun.body.h = gun.h;
    g.camFocus = { x: (p.x + gun.x) / 2, y: 0.4, z: (p.z + gun.z) / 2, yaw: p.h - 0.6, owner: 'kyrk', near: true };
    m.setObjective('Kyrkkaffet', 'Hos tant Gun på Storgatan');
    const again = !!m.flags.kyrkTalked;
    m.flags.kyrkTalked = true;
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: gunPages(again, m.done.has('cykelretur')) }), this);
  }

  talkFx(fx) {
    const g = this.game;
    if (fx === 'buns') { this.buns = KYRK.buns; const b = this.bike; if (b) b.buns = true; }
    else if (fx === 'table') { g.indoors.chapelBuns = this.buns; g.emit('salon', { kind: 'pick' }); }
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'kyrk') g.camFocus = null; };
    if (this.stage === 'gun') {
      this.stage = 'ride';
      free();
      if (!this.buns) this.talkFx('buns');
      g.emit('toast', { text: 'Kliv på Arnes cykel – bullarna ligger i lådan. Cykla dem till kapellet på Söderholmen!', long: true });
    } else if (this.stage === 'welcome') {
      this.stage = 'bell';
      free();
      if (!g.indoors.chapelBuns) this.talkFx('table');
      m.later(0.8, () => g.emit('hint', { id: 'bellrope', touch: 'Gå fram till repet vid dörren och tryck RINGA – tre gånger.', keys: 'Gå fram till repet vid dörren och tryck E – tre gånger.' }), this);
    } else if (this.stage === 'announce') {
      this.stage = 'organ';
      free();
      const q = this.inga;
      if (q) { q.arrived = false; q.goto([[K.cantor.x + 0.6, K.cantor.z - 0.5], [K.cantor.x, K.cantor.z]], 1.0, K.cantor.h); }
      m.later(0.6, () => g.emit('hint', { id: 'organ', touch: 'Gå fram till orgeln och tryck SPELA.', keys: 'Gå fram till orgeln och tryck E.' }), this);
    } else if (this.stage === 'finale') {
      this.stage = 'done';
      free();
      g.stats.churchBuns = this.buns;
      g.stats.psalmWrong = this.wrong;
      m.flags.kyrkBikeHome = true;
      m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Kyrkkaffet', amount: this.amount });
      m.sms(WHO.gun, 'Inga säger att du spelade som en ängel. Arne hade fällt en tår. Tack, lilla vän!', 30);
      // Inga is back at her place in front of the altar, facing the pews (Gun stays up front with her coffee)
      const q = this.inga;
      if (q) { q.standH = q.h = CHAPEL.priest.h; q.body.h = q.h; }
    }
  }

  update(dt) {
    this.prompt = null;
    this.t += dt;
    switch (this.stage) {
      case 'ride': this.rideStep(); break;
      case 'bell': this.bellStep(); break;
      case 'guests': this.guestStep(); break;
      case 'organ': this.organStep(); break;
      case 'playing': this.playStep(); break;
    }
  }

  // ---- on Arne's bike, out to the chapel
  rideStep() {
    const g = this.game, m = this.mgr, p = g.player, b = this.bike;
    if (!b) { m.fail(this, 'Arnes cykel är borta', [WHO.gun, 'Arnes cykel står vid min grind igen – någon måste ha ställt dit den. Bullarna bakar jag om!']); return; }
    if (this.buns > 0 && !b.buns) b.buns = true;
    const riding = this.riding;
    const here = Math.hypot(b.x - CHAPEL_DOOR.x, b.z - CHAPEL_DOOR.z) < KYRK.near;
    if (!riding && here && p.state === 'foot' && !p.frozen && Math.hypot(p.x - CHAPEL_DOOR.x, p.z - CHAPEL_DOOR.z) < CHAPEL_DOOR.r) this.prompt = 'BÄR IN';
    // right by the bike, the button is for the bike (even with Gun close by in her garden)
    else if (!riding && p.state === 'foot' && !p.frozen && p.near === b) this.prompt = 'CYKLA';
    const n = `${this.buns} bullar`;
    if (riding && here) m.setObjective('Kliv av vid kapellet', `${n} · bär in dem genom tornets dörr`);
    else if (riding) m.setObjective('Cykla bullarna till kapellet', `${n} · ${onSouth(b.x, b.z) ? 'bakom tivolits parkering' : 'över södra bron till Söderholmen'}`);
    else if (here) m.setObjective('Bär in bullarna', `${n} · dörren i kapellets torn`);
    else m.setObjective('Kliv på Arnes cykel', `${n} ligger i cykellådan`);
  }

  // thrown off the bike (or jumping off at speed): some of the buns go flying
  onExitCar(e) {
    if (this.stage !== 'ride' || e.car !== this.bike || !e.bail || this.buns <= 0) return;
    const g = this.game, m = this.mgr, b = e.car;
    const lost = Math.min(this.buns, KYRK.fall);
    this.buns -= lost;
    g.emit('buns', { x: b.x, z: b.z });
    if (this.buns <= 0) {
      b.buns = false;
      m.fail(this, 'Alla bullar blev smulor', [WHO.gun, 'Smulor över halva Sjuby, hör jag! Nåja – jag bakar en ny sats. Kom och hämta den när du vill.']);
      return;
    }
    g.emit('toast', { text: `Aj! ${lost} bullar for i backen. ${this.buns} kvar i lådan.`, long: true });
  }

  interact() {
    if (this.prompt === 'CYKLA') { this.game.player.finishEnter(this.bike); return true; }
    if (this.prompt === 'BÄR IN') { this.carryIn(); return true; }
    if (this.prompt === 'RINGA') { this.ring(); return true; }
    if (this.prompt === 'SPELA') { this.sitDown(); return true; }
    return false;
  }

  carryIn() {
    const g = this.game, m = this.mgr, b = this.bike;
    this.stage = 'enter';
    this.prompt = null;
    if (b) b.buns = false;
    m.setObjective('Kyrkkaffet', 'Söderholmens kapell');
    g.indoors.enter(() => this.inside(), 'chapel');
  }

  // in through the door with the tray: Inga is waiting by the coffee table
  inside() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors, q = this.inga;
    this.stage = 'welcome';
    ind.noExit = true;
    if (q) {
      q.x = K.hello.x; q.z = K.hello.z; q.y = g.world.groundHeight(q.x, q.z); q.state = 'stand';
      q.standH = q.h = Math.atan2(p.x - q.x, p.z - q.z); q.body.h = q.h;
    }
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(K.hello.x - p.x, K.hello.z - p.z);
    // from out over the pews, looking back at the two of you and the coffee table by the door
    g.camFocus = { x: R.x0 + 5.35, y: 0.7, z: R.z0 + 1.15, yaw: Math.PI - 0.12, owner: 'kyrk', near: true };
    m.later(0.9, () => g.emit('talk', { id: this.id, pages: welcomePages(this.buns) }), this);
  }

  // ---- the bell: three pulls on the rope, and the guests come in
  bellStep() {
    const g = this.game, m = this.mgr, p = g.player;
    if (g.time - this.ringAt > 1.1 && p.state === 'foot' && !p.frozen && Math.hypot(p.x - K.rope.x, p.z - K.rope.z) < K.rope.r) this.prompt = 'RINGA';
    m.setObjective('Ring i kyrkklockan', `Repet vid dörren · ${this.rings} av 3`);
  }

  ring() {
    const g = this.game, p = g.player;
    this.rings++; this.ringAt = g.time;
    g.indoors.ropeAt = g.time;
    p.vx = p.vz = 0; p.h = Math.atan2(K.rope.x - p.x, K.rope.z - p.z);
    g.emit('churchBell', { n: this.rings });
    const q = this.inga;
    if (q) g.emit('say', { who: q, text: ['Ett…', 'Två…', 'Tre! Nu kommer de.'][Math.min(2, this.rings - 1)] });
    if (this.rings < 3) return;
    this.stage = 'guests'; this.t = 0; this.nextGuest = 1.4;
    if (q) { q.arrived = false; q.goto([at(4.2, 1.9), at(4, 10.6), [CHAPEL.priest.x, CHAPEL.priest.z]], 1.15, CHAPEL.priest.h); }
  }

  guestStep() {
    const g = this.game, m = this.mgr;
    m.setObjective('Kyrkkaffet', 'Gästerna kommer');
    if (this.guests.length < GUESTS.length && this.t >= this.nextGuest) { this.addGuest(GUESTS[this.guests.length]); this.nextGuest = this.t + 1.7; }
    let seated = 0;
    for (const G of this.guests) {
      if (!G.seated && (G.ped.arrived || this.t - G.at > 16)) { seat(G.ped, G.seat, G.def.npc); G.seated = true; }
      if (G.seated) seated++;
    }
    const q = this.inga;
    if (seated === GUESTS.length && (!q || q.arrived || this.t > 20)) this.announce();
  }

  addGuest(def) {
    const g = this.game, ind = g.indoors;
    const S = pewSeat(def.row, def.x);
    const [x0, z0] = at(4, 0.25);
    const ped = spawnPed(g, { ...def.look }, x0, z0, 0, def.npc);
    ped.arrived = false;
    ped.goto(S.path.slice(1), 1.2, 0);
    ind.chapelFolk.push(ped); // (they go when you go out, with the others)
    this.guests.push({ def, ped, seat: S, at: this.t, seated: false });
    if (def.line) g.emit('say', { who: ped, text: def.line });
  }

  // everyone is in: Inga at the altar says a few words, then off to the organ
  announce() {
    const g = this.game, m = this.mgr, p = g.player, q = this.inga;
    this.stage = 'announce';
    p.frozen = true; p.vx = p.vz = 0;
    if (q) { q.standH = q.h = CHAPEL.priest.h; q.body.h = q.h; g.camFocus = { x: q.x, y: 1.0, z: q.z - 0.9, yaw: 0.2, owner: 'kyrk', near: true }; }
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: announcePages() }), this);
  }

  // ---- the organ
  organStep() {
    const g = this.game, m = this.mgr, p = g.player, O = this.organ;
    if (p.state === 'foot' && !p.frozen && Math.hypot(p.x - K.organ.x, p.z - K.organ.z) < K.organ.r) this.prompt = 'SPELA';
    m.setObjective('Spela psalmen på orgeln', O.verse ? `Vers ${Math.min(3, O.verse + 1)} av 3 · sätt dig vid orgeln igen` : 'Längst fram, till höger om altaret');
  }

  sitDown() {
    const g = this.game, q = this.inga;
    this.stage = 'playing';
    g.indoors.sitAtOrgan();
    this.organ.begin('psalm', this);
    if (q) g.emit('say', { who: q, text: 'Lyssna noga – sedan spelar du samma toner!' });
  }

  playStep() {
    const m = this.mgr, O = this.organ;
    const v = `Vers ${Math.min(3, O.verse + 1)} av 3`;
    if (O.phase === 'final') m.setObjective('Hela kapellet sjunger', 'Psalmen');
    else m.setObjective('Spela psalmen', O.phase === 'turn' ? `${v} · ton ${O.pos + 1} av ${O.notes.length}` : `${v} · lyssna på Inga`);
  }

  // the SLUTA button: you got up from the bench in the middle of it
  organStopped() {
    if (this.stage === 'playing') this.stage = 'organ';
  }

  // ---- what the organ tells us (organ.js)
  organVerse(i) {
    const q = this.inga;
    if (q) this.game.emit('say', { who: q, text: ['Fint! Nu lite längre.', 'Precis så! Och nu slutet.', 'Vackert!'][Math.min(2, i)] });
  }

  organWrong() {
    const g = this.game, q = this.inga;
    const lines = ['Oj! Lyssna en gång till.', 'Nästan! Jag tar det igen.', 'Hm. Den tonen fanns inte i min psalmbok.', 'Lugnt och fint – en gång till.'];
    if (q) g.emit('say', { who: q, text: lines[this.wrongSaid++ % lines.length] });
    const bengt = this.guest('church-bengt');
    if (bengt && this.wrongSaid === 3) g.emit('say', { who: bengt, text: 'Hehe.' });
  }

  organFinale() {
    const g = this.game;
    const q = this.inga;
    // the camera leaves the keys and takes in the whole chapel singing
    g.camFocus = { x: R.x0 + 3.0, y: 1.0, z: R.z0 + 8.6, yaw: -0.3, owner: 'organ', near: true };
    if (q) g.emit('say', { who: q, text: '♪ Alla stämmer in! ♫' });
    for (const ped of g.indoors.chapelFolk.slice(1)) g.emit('say', { who: ped, text: ped.npc === 'church-ingvar' ? '♪ …' : '♪ ♫ ♪' });
  }

  // the last note: up from the bench. You, Inga and Gun (out of her pew, through the gap in the altar
  // rail) line up in front of the altar, facing the pews – and the talk
  organDone() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.stage = 'finale';
    this.wrong = this.organ.mistakes;
    this.amount = kyrkPay(this.buns, this.wrong);
    this.organ.stop();
    ind.standUp();
    p.frozen = true;
    const [px, pz] = FINALE.you;
    m.later(0.7, () => { p.autoWalk = { x: px, z: pz, speed: 1.2 }; }, this);
    const ingvar = this.guest('church-ingvar');
    if (ingvar) g.emit('say', { who: ingvar, text: 'Amen.' });
    const q = this.inga;
    if (q) { q.arrived = false; q.goto([at(2.95, 12.08), FINALE.inga], 1.0, Math.PI); }
    const G = this.guests.find((r) => r.def.npc === 'church-gun');
    if (G) {
      const gap = G.seat.path[2];
      G.ped.arrived = false;
      G.ped.goto([[gap[0], gap[1]], [R.x0 + 4, gap[1]], at(4, 11.35), FINALE.gun], 1.15, Math.PI);
    }
    g.camFocus = { x: R.x0 + 4.0, y: 0.85, z: R.z0 + 11.75, yaw: 0.05, owner: 'kyrk', near: true };
    m.later(3.4, () => { p.autoWalk = null; p.h = Math.PI; g.emit('talk', { id: this.id, pages: finalePages(this.wrong, this.amount) }); }, this);
  }

  targets(T) {
    const g = this.game, b = this.bike;
    if (this.stage === 'ride' && b) {
      const here = Math.hypot(b.x - CHAPEL_DOOR.x, b.z - CHAPEL_DOOR.z) < KYRK.near;
      if (!this.riding && !here) T.push({ kind: 'car', car: b, color: 0x46c96f, gps: true });
      else T.push({ kind: 'zone', x: CHAPEL_DOOR.x, z: CHAPEL_DOOR.z, r: CHAPEL_DOOR.r, gps: true });
      return;
    }
    if (!g.indoor || g.indoors.where !== 'chapel') return;
    if (this.stage === 'bell') T.push({ kind: 'item', x: K.rope.x, y: CHAPEL.y + 1.1, z: K.rope.z, gps: false });
    if (this.stage === 'organ') T.push({ kind: 'item', x: K.seat.x + 0.4, y: CHAPEL.y + 0.9, z: K.seat.z + 0.1, gps: false });
  }

  cleanup() {
    const g = this.game, p = g.player, ind = g.indoors, b = this.bike;
    this.prompt = null;
    if (p.state === 'sit') ind.standUp();
    if (this.organ.open) this.organ.stop();
    p.frozen = false;
    ind.noExit = false;
    if (this.stage !== 'done') { this.organ.reset(); if (b) b.buns = false; }
    if (g.camFocus && g.camFocus.owner === 'kyrk') g.camFocus = null;
  }
}
