// Going in and out of the dark tower – and Hörnlivs on Kungsgatan (v0.6.1). The insides
// (interior.js, shop.js) are built out at sea: going in is a fade to black (and a lift ride in the
// tower), and the town is hidden while you are in there. Melker lives up in the tower; he is only
// around while you are inside. `where` says which place you are in: 'tower', 'shop' or 'office'
// (Bullbilen's bakery office, v0.7), 'salon' (Vera's hair salon on Skolgatan, v1.0) or 'birger'
// (tant Gun's neighbour's house on Storgatan, Jonte's hideout, v1.2), 'nova' (v1.4) or 'chapel'
// (Söderholmens kapell, v1.9: you walk in yourself, and kyrkoherde Inga stands at the altar; v1.10: the
// bell rope by the door rings, and once you have played the psalm in "Kyrkkaffet" the organ is yours).
import { TOWER_DOOR, LIVS_DOOR, OFFICE_DOOR, SALON_DOOR, BIRGER, NOVA_DOOR } from './config.js';
import { INT } from './interior.js';
import { SHOP } from './shop.js';
import { OFFICE } from './office.js';
import { SALON } from './salon.js';
import { HOUSE } from './birger.js';
import { ROOM as NOVA_ROOM } from './nova.js';
import { CHAPEL, CHAPEL_DOOR, CHAPEL_KAFFE as CK } from './chapel.js';
import { ELSA_HOUSE, ELSA_DOOR } from './elsa.js';
import { PIZZA_ROOM, PIZZA_DOOR } from './pizzeria.js';
import { MILL_ROOM, MILL_DOOR } from './millroom.js';
import { KOND, KOND_DOOR } from './konditori.js';
import { FYR, FYR_DOOR, FYR_OUT, fyrFloor } from './fyren.js';
import { SHED, SHED_DOOR } from './vedbod.js';
import { BAK, BAK_DOOR } from './bageriet.js';
import { SIGNE_LOOK } from './kaffe.js';
import { Organ } from './organ.js';
import { Ped, STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed } from './hideout.js';
import { seat } from './barber.js';
import { GUN_LOOK } from './flag.js';
import { BENGT_LOOK } from './opening.js';
import { BAKE_LOOK } from './guldbullen.js';
import { INGVAR_LOOK } from './livs.js';
import { ELSA_GLASSES } from './skatbo.js';

// the places with a door you walk through (the tower has its lift): inside, and where you come out
export const PLACES = {
  shop: { inside: SHOP, out: { x: LIVS_DOOR.x - 1.1, z: LIVS_DOOR.z - 0.6, h: Math.PI } },     // Hörnlivs → Kungsgatan, facing north
  office: { inside: OFFICE, out: { x: OFFICE_DOOR.x - 1.0, z: OFFICE_DOOR.z + 0.4, h: Math.PI } }, // the bakery office → out by the west wall
  salon: { inside: SALON, out: { x: SALON_DOOR.x + 1.0, z: SALON_DOOR.z + 0.3, h: 0 } },           // Salong Saxen → Skolgatan, facing south (v1.0)
  nova: { inside: NOVA_ROOM, out: { x: NOVA_DOOR.x, z: NOVA_DOOR.z + 0.6, h: 0 } },                // Nova's room → Skolgatan, facing the street (v1.4)
  birger: { inside: HOUSE, out: { x: BIRGER.door.x, z: BIRGER.door.z + 0.5, h: 0 } },               // Birger's house → his garden path, facing the street (v1.2)
  chapel: { inside: CHAPEL, out: { x: CHAPEL_DOOR.x, z: CHAPEL_DOOR.z - 0.7, h: Math.PI } },         // the chapel → the gravel path, facing north (v1.9)
  elsa: { inside: ELSA_HOUSE, out: { x: ELSA_DOOR.x + 0.3, z: ELSA_DOOR.z, h: Math.PI / 2 } },        // Elsa's house → her front step, facing the road (v1.12)
  pizza: { inside: PIZZA_ROOM, out: { x: PIZZA_DOOR.x - 0.3, z: PIZZA_DOOR.z, h: -Math.PI / 2 } },     // Pizzeria Sjuan → Kungsgatan, facing the street (v1.13)
  mill: { inside: MILL_ROOM, out: { x: MILL_DOOR.x, z: MILL_DOOR.z, h: MILL_DOOR.h } },                // the windmill → out on its rocks (v1.13)
  konditori: { inside: KOND, out: { x: KOND_DOOR.x, z: KOND_DOOR.z - 0.6, h: Math.PI } },             // Sjuby Konditori → the square, facing north (v1.14)
  fyren: { inside: FYR, out: { x: FYR_OUT.x, z: FYR_OUT.z, h: FYR_OUT.h } },                          // the lighthouse → down the steps (v1.15)
  bageri: { inside: BAK, out: { x: BAK_DOOR.x - 0.2, z: BAK_DOOR.z + 0.75, h: 0 } },                     // the bakery → its yard (v1.17)
  shed: { inside: SHED, out: { x: SHED_DOOR.x + 0.9, z: SHED_DOOR.z + 0.4, h: Math.PI / 2 } },         // Signe's woodshed → her back yard (v1.16)
};

// the people in the chapel: Inga in black with a white collar, and three in the pews
const INGA_LOOK = { shirt: 0x1d1f22, pants: 0x1d1f22, skin: 0xf0c8a8, hair: 0xc9c5bd, height: 0.98, bulk: 1.06, style: ST.bun | ST.glasses | ST.jacket, accent: 0xf4f4f0 };
const PEW_LOOKS = [
  { shirt: 0x6b6f3a, pants: 0x3a3c41, skin: 0xe9c3a6, hair: 0xb0b0b0, height: 1.0, bulk: 1.1, style: ST.beard | ST.jacket, accent: 0x4a3a2a },
  { shirt: 0xb5466a, pants: 0x24365e, skin: 0xc68e62, hair: 0x2b1d14, height: 0.95, bulk: 1.0, style: ST.long, accent: 0xb5466a },
  { shirt: 0x9db8cc, pants: 0x2b2e35, skin: 0xf2d0b5, hair: 0xe0e0dc, height: 0.94, bulk: 1.05, style: ST.bun | ST.glasses, accent: 0x9db8cc },
];
const INGA = { who: 'Kyrkoherde Inga', letter: 'I', color: '#6b4fa0' };
const GUN_T = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
// (v1.14) Gun behind the counter in the konditori once the trophy is home: one thing each time you come by
const GUN_KOND = [
  'Pokalen står där den ska nu. Jag putsar den varje morgon – Arne hade tyckt att det var fånigt.',
  'Dahlgren bakar på tisdagar nu. Han har bränt två satser och diskat fyra. Det går framåt.',
  'Bengt säger att han ska vinna nästa år. Dahlgren säger samma sak. Jag säger att jag är domare.',
  'Det sitter en skata i granarna vid fyren och skränar så fort någon går förbi. Den saknar nog sin bulle.',
  'Kardemumman ska stötas, inte malas. Det står inte i receptet, lilla vän. Det står i hjärtat.',
];
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
// (v1.15) Ingvar at his kitchen table after "Skatans bo" (Elsa beside him): one thing each time
const INGVAR_T = { who: 'Fyrvaktaren Ingvar', letter: 'I', color: '#5b8fd6' };
const ELSA_T = { who: 'Elsa', letter: 'E', color: '#5f9a6a' };
const FYR_TALK = [
  [ELSA_T, 'Han har tänt lampan varje kväll sedan dess. Och sedan sitter vi här och tittar på den. Det är det bästa jag vet.'],
  [INGVAR_T, 'Skatan bor i holken nu. Hon har bytt kapsylen mot en sked. Jag vet inte varifrån.'],
  [ELSA_T, 'Han läste högt ur loggböckerna för mig i går. Tre timmar. Det var mest väder. Jag somnade lyckligt.'],
  [INGVAR_T, 'Kaffe?'],
  [ELSA_T, 'Inga har bett oss om hjälp med något stort på Söderholmen. Hon vill inte säga vad än. Det har varit för tyst bland husen vid kapellet, säger hon.'],
];
// (v1.15) the logbook in the watch room, open at a different page each time
const LOG_PAGES = [
  '2 jan 1977. Storm. Båten\nfrån Söderholmen kom fram.\nKaffe till besättningen.',
  '17 juni 1985. Bullmästerskap\npå torget. Arne vann.\nD. ser sur ut. Hela kvällen.',
  '4 sep 1995. Arne ringde från\nkiosken. Skattjakt till Gun.\nJag lovade att läsa sista\nlappen. Inte tala om det.',
  '30 maj 2026. Ungdom i röd bil\nkör fort på bron. Ska\nhålla ögonen på den.',
  '9 aug 2026. Elsa i fyren.\nLampan tänd. Inget mer\natt skriva i dag.',
];
const LOG = { who: 'Ingvars loggbok', letter: 'L', color: '#2c4a6a', note: true };
// (v1.17) Bengt and Signe in the bakery, one thing each time
const BENGT_T = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const SIGNE_T = { who: 'Mormor Signe', letter: 'S', color: '#b5466a' };
const BAK_TALK = [
  [SIGNE_T, 'Bertha har inte slocknat en enda gång sedan invigningen. Jag ger henne björkved och säger godnatt.'],
  [BENGT_T, 'Fyrahundra bullar i morse. Med stött kardemumma. Signe står vid mortelns och ser på mig hela tiden.'],
  [SIGNE_T, 'Dahlgren sitter på kontoret och räknar. Han har räknat fram att vi går med vinst. Han grät lite.'],
  [BENGT_T, 'Knäck har köpt en monter på Sjubydagen. Mitt på torget. Han tror att han kan sälja Arnes recept. Det får vi se på.'],
  [SIGNE_T, 'Mössen under lastkajen får smulorna. Det är bättre än fällor, och de håller ordning på golvet.'],
];
// what Inga says when you come back (one each time, in turn)
const INGA_AGAIN = [
  'Gun skickar fortfarande en påse bullar till kyrkkaffet varje söndag. Ingen vet hur hon får dem så goda.',
  'Telefonkiosken nere vid hamnen ringer ibland, har jag hört. Jag har aldrig vågat svara. Har du?',
  'Folk som just åkt Måsen kommer in hit och sitter alldeles tysta en stund. Sedan lägger de en tjuga i kollekten.',
  'Fyrvaktaren Ingvar kommer hit ibland och sätter sig längst bak. Han säger aldrig något. Jag tror att han bär på en hemlighet.',
  'Kör försiktigt över bron. Jag ber för alla bilister i Sjuby – det verkar behövas.',
];
import { Samuel } from './samuel.js';

const FADE = 0.5;  // seconds of black before the move

export class Indoors {
  constructor(game) {
    this.game = game;
    this.inside = false;
    this.where = null;     // 'tower' | 'shop' | 'office' | 'salon' | 'birger' | 'nova'
    this.busy = false;     // fading in or out
    this.timers = [];
    this.samuel = null;
    this.prompt = null;
    this.door = game.layout.colliders.find((c) => c.door === 'samuel') || null; // Melker's front door
    this.chapelFolk = [];  // Inga first, then the three in the pews (only while you are in there)
    this.kondFolk = [];    // (v1.14) Gun behind the counter and a baker at the table, after "Den gyllene bullen"
    this.fyrFolk = [];     // (v1.15) Ingvar and Elsa at the kitchen table, after "Skatans bo"
    this.bakFolk = [];     // (v1.17) Bengt and Signe in the bakery, after "Bullbilens bageri"
    this.goIn = null;      // which door GÅ IN is at: 'chapel' | 'konditori' | 'fyren'
    this.organ = new Organ(game); // (v1.10) the chapel organ: the psalm in "Kyrkkaffet", free play afterwards
    this.chapelBuns = 0;   // (v1.10) buns on the coffee table by the door (render.js draws them)
    this.ropeAt = -9;      // (v1.10) when the bell rope was last pulled (render.js swings it)
    this.offerAfter = null;
  }

  get priest() { return this.chapelFolk[0] || null; }

  get doorShut() { return !!(this.door && this.door.h > 0); }
  shutDoor() { if (this.door) this.door.h = this.door.hClosed; }
  openDoor() { if (this.door) this.door.h = 0; }

  after(delay, fn) { this.timers.push({ t: this.game.time + delay, fn }); }

  // the lift up to floor 7, or in through the shop door (the job calls this when you walk in)
  enter(done, where = 'tower') {
    if (this.busy || this.inside) return;
    const g = this.game;
    this.busy = true;
    g.emit('fade', { on: true });
    this.after(FADE, () => {
      this.inside = true;
      this.where = where;
      if (where === 'tower') {
        if (!this.game.mission.done.has('samuel')) this.openDoor();
        this.samuel = new Samuel(g);
        this.place(INT.spawn.x, INT.spawn.z, INT.spawn.h);
      } else { const S = PLACES[where].inside.spawn; this.place(S.x, S.z, S.h); }
      if (where === 'chapel') this.fillChapel();
      if (where === 'konditori' && !g.mission.active) this.fillKonditori();
      if (where === 'fyren' && !g.mission.active) this.fillFyren();
      if (where === 'bageri' && !g.mission.active) this.fillBakery();
      g.emit('indoor', { on: true });
      if (done) done();
    });
    this.after(FADE + 0.35, () => { g.emit('fade', { on: false }); this.busy = false; });
  }

  // back down and out onto the square (or out of the shop onto Kungsgatan)
  exit(done) {
    if (this.busy || !this.inside) return;
    const g = this.game;
    this.busy = true;
    g.emit('fade', { on: true });
    this.after(FADE, () => {
      this.inside = false;
      if (this.samuel) { this.samuel.remove(); this.samuel = null; }
      for (const q of this.chapelFolk) removePed(g, q);
      this.chapelFolk = [];
      for (const q of this.kondFolk) removePed(g, q);
      this.kondFolk = [];
      for (const q of this.fyrFolk) removePed(g, q);
      this.fyrFolk = [];
      for (const q of this.bakFolk) removePed(g, q);
      this.bakFolk = [];
      this.noExit = false;
      if (this.organ.open) this.organ.stop();
      this.chapelBuns = 0;
      const P = PLACES[this.where];
      if (P) this.place(P.out.x, P.out.z, P.out.h); // out through the door you came in by
      else this.place(TOWER_DOOR.x, TOWER_DOOR.z + 2.4, 0); // a few steps out on the square
      this.where = null;
      g.emit('indoor', { on: false });
      if (done) done();
    });
    this.after(FADE + 0.35, () => { g.emit('fade', { on: false }); this.busy = false; });
  }

  place(x, z, h) {
    const g = this.game, p = g.player;
    p.x = x; p.z = z; p.h = h; p.vx = p.vz = p.vy = 0;
    p.y = g.world.groundHeight(x, z);
    p.state = 'foot';
    p.body.lie = 0;
    g.emit('warp', { h });
  }

  update(dt) {
    const g = this.game;
    for (let i = 0; i < this.timers.length; i++) {
      if (g.time < this.timers[i].t) continue;
      const q = this.timers.splice(i, 1)[0]; i--;
      q.fn();
    }
    this.organ.update(dt);
    this.prompt = null;
    const p = g.player;
    if (g.time - this.ropeAt < 0.75 && p.state === 'foot') p.body.pose = 1; // (v1.10) tugging at the bell rope
    if (!this.inside) {
      // (v1.9) the chapel door on Söderholmen: walk in whenever no job is running
      if (!this.busy && !p.frozen && p.state === 'foot' && !g.mission.active && Math.hypot(p.x - CHAPEL_DOOR.x, p.z - CHAPEL_DOOR.z) < CHAPEL_DOOR.r) { this.prompt = 'GÅ IN'; this.goIn = 'chapel'; }
      // (v1.14) the konditori, once the trophy is back on its shelf
      if (!this.busy && !p.frozen && p.state === 'foot' && !g.mission.active && g.mission.done.has('guldbullen') && Math.hypot(p.x - KOND_DOOR.x, p.z - KOND_DOOR.z) < KOND_DOOR.r) { this.prompt = 'GÅ IN'; this.goIn = 'konditori'; }
      // (v1.15) the lighthouse, once the lamp is lit again
      if (!this.busy && !p.frozen && p.state === 'foot' && !g.mission.active && g.mission.done.has('skatbo') && Math.hypot(p.x - FYR_DOOR.x, p.z - FYR_DOOR.z) < FYR_DOOR.r) { this.prompt = 'GÅ IN'; this.goIn = 'fyren'; }
      // (v1.17) the bakery, open again
      if (!this.busy && !p.frozen && p.state === 'foot' && !g.mission.active && g.mission.done.has('bageri') && Math.hypot(p.x - BAK_DOOR.x, p.z - BAK_DOOR.z) < BAK_DOOR.r) { this.prompt = 'GÅ IN'; this.goIn = 'bageri'; }
      return;
    }
    if (this.samuel) this.samuel.update(dt);
    if (this.busy || p.frozen || p.state !== 'foot') return;
    // the chapel: Inga at the altar, (v1.10) the bell rope and the organ – unless a job is using them
    const job = g.mission.active;
    if (this.where === 'chapel' && !(job && job.holdsChapel)) {
      if (g.mission.done.has('kyrkkaffe') && Math.hypot(p.x - CK.organ.x, p.z - CK.organ.z) < CK.organ.r) { this.prompt = 'SPELA'; return; }
      if (this.priest && Math.hypot(p.x - CHAPEL.talk.x, p.z - CHAPEL.talk.z) < CHAPEL.talk.r) { this.prompt = 'PRATA'; return; }
      if (g.time - this.ropeAt > 1.1 && Math.hypot(p.x - CK.rope.x, p.z - CK.rope.z) < CK.rope.r) this.prompt = 'RINGA';
    }
    if (this.where === 'bageri' && this.bakFolk[0] && Math.hypot(p.x - BAK.talk.x, p.z - BAK.talk.z) < BAK.talk.r) { this.prompt = 'PRATA'; return; }
    if (this.where === 'konditori' && this.kondFolk[0] && Math.hypot(p.x - KOND.talk.x, p.z - KOND.talk.z) < KOND.talk.r) { this.prompt = 'PRATA'; return; }
    if (this.where === 'tower' && Math.hypot(p.x - INT.lift.x, p.z - INT.lift.z) < INT.lift.r) this.prompt = 'HISS';
    // (v1.15) the lighthouse: the stairs between the floors, Ingvar at his table, the logbook
    if (this.where === 'fyren') {
      const f = fyrFloor(p.x, p.z), S = FYR.stairs[f];
      if (S && S.up && Math.hypot(p.x - S.up.x, p.z - S.up.z) < S.up.r) { this.prompt = 'UPP'; this.stair = { to: S.upTo, up: true }; return; }
      if (S && S.down && Math.hypot(p.x - S.down.x, p.z - S.down.z) < S.down.r) { this.prompt = 'NER'; this.stair = { to: S.downTo, up: false }; return; }
      if (!job && f === 0 && this.fyrFolk[0] && Math.hypot(p.x - FYR.give.x, p.z - FYR.give.z) < FYR.give.r) { this.prompt = 'PRATA'; return; }
      if (!job && f === 1 && Math.hypot(p.x - FYR.desk.x, p.z - FYR.desk.z) < FYR.desk.r) { this.prompt = 'LÄS'; return; }
    }
    const P = PLACES[this.where];
    if (P && !this.noExit && Math.hypot(p.x - P.inside.door.x, p.z - P.inside.door.z) < P.inside.door.r) this.prompt = 'GÅ UT';
  }

  interact() {
    if (this.prompt === 'HISS') { this.game.emit('toast', { text: 'Hissen ner…' }); this.exit(); return true; }
    if (this.prompt === 'GÅ UT') { this.exit(); return true; }
    if (this.prompt === 'GÅ IN') { this.enter(null, this.goIn || 'chapel'); return true; }
    if (this.prompt === 'PRATA' && this.where === 'chapel') { this.talkToInga(); return true; }
    if (this.prompt === 'PRATA' && this.where === 'konditori') { this.talkToGun(); return true; }
    if (this.prompt === 'PRATA' && this.where === 'fyren') { this.talkToIngvar(); return true; }
    if (this.prompt === 'PRATA' && this.where === 'bageri') { this.talkToBakers(); return true; }
    if (this.prompt === 'LÄS' && this.where === 'fyren') { this.readLog(); return true; }
    if ((this.prompt === 'UPP' || this.prompt === 'NER') && this.stair) { this.climb(this.stair); return true; }
    if (this.prompt === 'RINGA') { this.ringBell(); return true; }
    if (this.prompt === 'SPELA') { this.sitAtOrgan(); this.organ.begin('free'); return true; }
    return false;
  }

  // ---- (v1.10) the bell rope and the organ
  ringBell() {
    const g = this.game, p = g.player;
    this.ropeAt = g.time;
    p.vx = p.vz = 0; p.h = Math.atan2(CK.rope.x - p.x, CK.rope.z - p.z);
    g.emit('churchBell', {});
    g.stats.bells = (g.stats.bells || 0) + 1;
  }

  // onto the organ bench: you sit facing the keys, and the camera comes in close from the side
  sitAtOrgan() {
    const g = this.game, p = g.player, S = CK.seat;
    p.state = 'sit'; p.stateT = 0; p.frozen = true;
    p.x = S.x; p.z = S.z; p.h = S.h; p.vx = p.vz = 0;
    p.rideHip = S.y; p.y = S.y - 0.45;
    g.camFocus = { x: S.x + 0.9, y: 1.0, z: S.z + 0.35, yaw: -0.35, owner: 'organ', near: true };
  }

  standUp() {
    const g = this.game, p = g.player, U = CK.up;
    if (p.state === 'sit') {
      p.state = 'foot'; p.stateT = 0;
      p.x = U.x; p.z = U.z; p.h = U.h; p.y = g.world.groundHeight(U.x, U.z); p.vx = p.vz = 0;
    }
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'organ') g.camFocus = null;
  }

  // the SLUTA button under the keys (main.js): up from the bench
  organStop() {
    if (!this.organ.open) return;
    this.organ.stop();
    this.standUp();
    const job = this.game.mission.active;
    if (job && job.organStopped) job.organStopped();
  }

  // ---- the chapel (v1.9)
  fillChapel() {
    const g = this.game;
    for (const q of this.chapelFolk) removePed(g, q);
    const P = CHAPEL.priest;
    this.chapelFolk = [spawnPed(g, INGA_LOOK, P.x, P.z, P.h, 'inga')];
    for (const S of CHAPEL.sitters) this.chapelFolk.push(seat(new Ped(g, PEW_LOOKS[S.look]), S, 'pew'));
    for (const q of this.chapelFolk.slice(1)) g.peds.add(q);
    if (!g.stats.chapel) g.emit('toast', { text: 'Söderholmens kapell. Det är alldeles tyst härinne.' });
  }

  talkToInga() {
    const g = this.game, m = g.mission, p = g.player, q = this.priest;
    const n = g.stats.chapel = (g.stats.chapel || 0) + 1;
    p.vx = p.vz = 0;
    p.h = Math.atan2(q.x - p.x, q.z - p.z);
    q.standH = q.h = q.body.h = Math.atan2(p.x - q.x, p.z - q.z);
    g.camFocus = { x: (p.x + q.x) / 2, y: 0.5, z: (p.z + q.z) / 2, yaw: p.h - 0.6, owner: 'inga', near: true };
    // (v1.10) her church coffee: she asks you in person (then the quest card), or reminds you
    if (m.canOffer('kyrkkaffe')) {
      this.offerAfter = 'kyrkkaffe';
      g.emit('talk', { id: 'inga', pages: [
        { ...INGA, text: n === 1 ? 'Välkommen till Söderholmens kapell! Jag är kyrkoherde Inga – och du kommer som en skänk från ovan.' : 'Vad bra att du kom! Jag behöver en hjälpande hand.' },
        { ...INGA, text: 'Det är kyrkkaffe i dag. Men Gun har fått ryggskott och kan inte cykla hit med söndagsbullarna – och kantorn ligger hemma med feber.', last: 'JAG HJÄLPER GÄRNA' },
      ] });
      return;
    }
    if (m.isOpen('kyrkkaffe')) {
      g.emit('talk', { id: 'inga', pages: [{ ...INGA, text: 'Kyrkkaffet väntar! Bullarna finns hos Gun på Storgatan, och Arnes cykel står vid hennes grind.', last: 'JAG CYKLAR' }] });
      return;
    }
    const pages = n === 1 ? [
      { ...INGA, text: 'Välkommen till Söderholmens kapell! Stäng dörren efter dig, så hör man nästan inte Måsen.' },
      { ...INGA, text: 'Jag är kyrkoherde Inga. Har du kommit för att tända ett ljus, eller bara för att vila benen en stund?' },
      { ...YOU, text: 'Lite av båda, tror jag.' },
      { ...INGA, text: 'Sätt dig var du vill. Bänkarna är hårda, men de har hållit sedan 1890.' },
      { ...INGA, text: 'Tant Gun och hennes Arne gifte sig här, vet du. Sommaren 1972. Arne hade kanelbullar i kavajfickan under hela vigseln – det luktade bageri ända fram till altaret.', last: 'TACK, INGA' },
    ] : [{ ...INGA, text: INGA_AGAIN[(n - 2) % INGA_AGAIN.length], last: 'TACK, INGA' }];
    g.emit('talk', { id: 'inga', pages });
  }

  // ---- (v1.14) the konditori after "Den gyllene bullen": Gun at the till, a baker at the table
  fillKonditori() {
    const g = this.game;
    for (const q of this.kondFolk) removePed(g, q);
    const baker = g.stats.guldVote === 'bengt' ? { ...BENGT_LOOK } : { ...BAKE_LOOK };
    this.kondFolk = [spawnPed(g, { ...GUN_LOOK }, KOND.gun.x, KOND.gun.z, KOND.gun.h, 'gun'), spawnPed(g, baker, KOND.dahl.x, KOND.dahl.z, KOND.dahl.h, g.stats.guldVote === 'bengt' ? 'bengt' : 'flask-dahl')];
    if (!g.stats.kondVisit) g.emit('toast', { text: 'Sjuby Konditori. Det doftar kardemumma – och på hyllan glänser något.' });
  }

  talkToGun() {
    const g = this.game, p = g.player, q = this.kondFolk[0];
    const n = g.stats.kondVisit = (g.stats.kondVisit || 0) + 1;
    p.vx = p.vz = 0;
    p.h = Math.atan2(q.x - p.x, q.z - p.z);
    q.standH = q.h = q.body.h = Math.atan2(p.x - q.x, p.z - q.z);
    g.camFocus = { ...KOND.camTaste, owner: 'kond-gun' };
    g.emit('talk', { id: 'kond-gun', pages: [{ ...GUN_T, text: GUN_KOND[(n - 1) % GUN_KOND.length], last: 'TACK, GUN' }] });
  }

  // ---- (v1.15) the lighthouse: up and down the stairs (a fade, like the lift), Ingvar and Elsa, the logbook
  climb(S) {
    if (this.busy) return;
    const g = this.game;
    this.busy = true;
    g.emit('fade', { on: true });
    g.emit('stairs', { up: S.up });
    this.after(0.4, () => { this.place(S.to.x, S.to.z, S.to.h); });
    this.after(0.7, () => { g.emit('fade', { on: false }); this.busy = false; });
  }

  // ---- (v1.17) the bakery after "Bullbilens bageri": Bengt at the belt, Signe by Stora Bertha
  fillBakery() {
    const g = this.game;
    for (const q of this.bakFolk) removePed(g, q);
    this.bakFolk = [spawnPed(g, { ...BENGT_LOOK }, BAK.bengt.x, BAK.bengt.z, BAK.bengt.h, 'bengt-out'), spawnPed(g, { ...SIGNE_LOOK }, BAK.signe.x, BAK.signe.z, BAK.signe.h, 'signe')];
    if (!g.stats.bakVisit) g.emit('toast', { text: 'Bullbilens bageri. Stora Bertha är varm, och det doftar kardemumma.' });
  }

  talkToBakers() {
    const g = this.game, p = g.player;
    const n = g.stats.bakVisit = (g.stats.bakVisit || 0) + 1;
    p.vx = p.vz = 0;
    p.h = Math.atan2(BAK.bengt.x - p.x, BAK.bengt.z - p.z);
    const [who, text] = BAK_TALK[(n - 1) % BAK_TALK.length];
    g.emit('talk', { id: 'bak-talk', pages: [{ ...who, text, last: 'TACK' }] });
  }

  fillFyren() {
    const g = this.game;
    for (const q of this.fyrFolk) removePed(g, q);
    this.fyrFolk = [spawnPed(g, { ...INGVAR_LOOK }, FYR.ingvar.x, FYR.ingvar.z, FYR.ingvar.h, 'ingvar'), spawnPed(g, { ...ELSA_GLASSES }, FYR.elsa.x, FYR.elsa.z, FYR.elsa.h, 'elsa')];
    if (!g.stats.fyrVisit) g.emit('toast', { text: 'Fyren. Det luktar kaffe och mässingsputs – och Elsa sitter vid köksbordet.' });
  }

  talkToIngvar() {
    const g = this.game, p = g.player;
    const n = g.stats.fyrVisit = (g.stats.fyrVisit || 0) + 1;
    p.vx = p.vz = 0;
    p.h = Math.atan2(FYR.table.x - p.x, FYR.table.z - p.z);
    g.camFocus = { ...FYR.camKitchen, owner: 'fyr-talk' };
    const [who, text] = FYR_TALK[(n - 1) % FYR_TALK.length];
    g.emit('talk', { id: 'fyr-talk', pages: [{ ...who, text, last: 'TACK' }] });
  }

  readLog() {
    const g = this.game, p = g.player;
    const n = g.stats.fyrLog = (g.stats.fyrLog || 0) + 1;
    p.vx = p.vz = 0;
    p.h = Math.atan2(FYR.book.x - p.x, FYR.book.z - p.z);
    g.emit('paper', {});
    g.emit('talk', { id: 'fyr-log', pages: [{ ...LOG, text: LOG_PAGES[(n - 1) % LOG_PAGES.length], last: 'STÄNG' }] });
  }

  // the dialogue is closed: Inga turns back to the pews
  talkDone(id) {
    if (id === 'fyr-talk') { const g = this.game; if (g.camFocus && g.camFocus.owner === 'fyr-talk') g.camFocus = null; return; }
    if (id === 'kond-gun') {
      const g = this.game, q = this.kondFolk[0];
      if (q) q.standH = q.h = q.body.h = KOND.gun.h;
      if (g.camFocus && g.camFocus.owner === 'kond-gun') g.camFocus = null;
      return;
    }
    if (id !== 'inga') return;
    const g = this.game, q = this.priest;
    if (q) q.standH = q.h = q.body.h = CHAPEL.priest.h;
    if (g.camFocus && g.camFocus.owner === 'inga') g.camFocus = null;
    if (this.offerAfter) { const k = this.offerAfter; this.offerAfter = null; g.mission.offer(k, 'talk'); }
  }
}
