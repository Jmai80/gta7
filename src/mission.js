// Missions, version 0.3: a quest log like in open-world role-playing games.
// Contacts offer jobs by SMS (or face to face). Accept one to follow it – the objective box and
// the yellow GPS line show the way – or let it wait in the list and pick it later.
//   L  Lasse (Verkstan):   "Röd bil" – steal a red car and drive it to the garage
//   S  Sanna (Pizzerian):  "Pizzabudet" – starts at the marker outside Pizzeria Sjuan
//   K  Kim (Macken):       "Gatloppet" – drive into the marker at Macken
//   G  Tant Gun:           "Flaggan i topp" – side quest: hoist the flag in her front garden
//   ?  Okänt nummer:       "Melkers cykelnycklar" – main quest, part 1: sneak into Melker's flat
//                          on floor 7 of the dark tower and take his bike keys (v0.4)
//   ?  Okänt nummer:       "Överlämningen" – main quest, part 2: hand the keys over on the bench at
//                          the end of the harbour pier – to tant Gun, it turns out (v0.5)
//   G  Tant Gun:           "Arnes budcykel" – main quest, part 3: the north bridge opens; ride Arne's
//                          bike from Norrholmen to Gun with a Bullbilen van on your heels (v0.6)
//   G  Tant Gun:           "Kassaskåpet" – main quest, part 4: the safe in Bullbilen's bakery office,
//                          the second half of the recipe, the vans after you (v0.7)
//   G  Tant Gun:           "Nyöppningen" – main quest, part 5: three ingredients, then Sjuby Konditori
//                          opens again by the square (v0.8)
//   G  Tant Gun:           "Syltburken" – main quest, part 6: ram the black car, get the jam jar back (v0.9)
//   B  Bagar-Bengt:        "Bullfabriken" – main quest, part 7: tail Dahlgren's truck to his factory (v0.9)
//   M  Melker:             "Melkers cykel" – side quest after the safe: ride the bike back to Melker (v0.9)
//   Y  Yasmin (Hörnlivs):  "Hemleverans" – side quest after the safe: three bags against the clock (v0.9)
//   L  Lasse (Verkstan):   "Lasses trimning" – side quest: spend your money in Lasse's tuning shop (v0.8)
//   K  Kim (Macken):       "Långhoppet" – side quest: a stunt jump of 34 m at the construction site (v0.8)
//   N  Lås-Leif:           "Melkers nya nycklar" – side quest after the eggs: new keys out to Melker (v0.7)
//   Y  Yasmin (Hörnlivs):  "Fyrvaktarens kasse" – side quest once the north bridge is open: take a
//                          bag of groceries (and twelve eggs) from the shop to the lighthouse (v0.6.1)
//   V  Vera (Salong Saxen): "Salong Saxen" – side quest indoors: cut, shave and dye for three customers (v1.0)
//   G  Tant Gun:           "Bullfesten" – main quest, part 8: the party on the square, and Jonte the
//                          bike thief rides off with Arne's bike and the buns (v1.0)
// The pizza job, the race, Melker's flat and the pier take over while they run (one at a time).
// Lasse's job and Gun's flag count whenever you do them, followed or not. Stunt jumps and the car
// wash always work. A quest with `after` is offered only once that quest is done.
import {
  DELIVERY, CARWASH, RED_REWARD, DELIVERY_REWARD, WHO, PIZZERIA, PIZZA_CAR, MACKEN, GUN, TOWER_DOOR, SAMUEL_REWARD,
  PIER_MEET, HANDOVER_REWARD, GUN_BIKE, BIKE_REWARD, LIVS_DOOR, LIVS_REWARD, EGG_BONUS,
  OFFICE_DOOR, SAFE_REWARD, LEIF_MARK, KEY_REWARD, KEY_TIME,
  KONDITORI, OPENING_REWARD, LASSE_SHOP, JUMP_GOAL, JUMP_REWARD,
  JAR, FACTORY_START, FACTORY_REWARD, BIKE_RETURN, HOME_DELIVERY, SALON_DOOR, SALON_PAY, FEST,
} from './config.js';
import { PizzaJob } from './pizza.js';
import { RaceJob } from './race.js';
import { FlagQuest } from './flag.js';
import { SamuelJob } from './samuel.js';
import { HandoverJob } from './handover.js';
import { BikeJob, ESCAPE_BONUS } from './bikejob.js';
import { LivsJob, spawnIngvar } from './livs.js';
import { SafeJob } from './safe.js';
import { KeysJob, spawnLeif } from './leif.js';
import { OpeningJob } from './opening.js';
import { ITEMS, applyUpgrades, clearUpgrades } from './upgrades.js';
import { JarJob } from './jar.js';
import { FactoryJob } from './factory.js';
import { BikeReturnJob, HomeDeliveryJob } from './errands.js';
import { SalonJob } from './barber.js';
import { FestJob, FestParty } from './fest.js';
import { ISLE } from './island.js';
import { fmt } from './rng.js';

export { fmt };

export const QUESTS = [
  {
    id: 'lasse', letter: 'L', who: WHO.lasse, title: 'Röd bil', color: '#ffcf33', x: DELIVERY.x, z: DELIVERY.z, r: DELIVERY.r, at: 1.4,
    text: 'Tjena! Du är ny i stan, va? Visa vad du går för: sno en röd bil och kör den till min verkstad på Drottninggatan. Röda går fortast, det vet alla.',
    reward: '1 000 kr + upp till 5 000 kr', where: 'Vilken röd bil som helst, sedan Lasses Verkstad',
  },
  {
    id: 'pizza', letter: 'S', who: WHO.sanna, title: 'Pizzabudet', color: '#46c96f', x: PIZZERIA.x, z: PIZZERIA.z, r: PIZZERIA.r, Job: PizzaJob, at: 9,
    text: 'Hej, Sanna på Pizzeria Sjuan här! Mitt pizzabud har slutat (han körde in i fontänen). Kom förbi pizzerian på Kungsgatan om du vill tjäna en hacka.',
    reward: 'upp till 1 850 kr', where: 'Pizzeria Sjuan, Kungsgatan',
  },
  {
    id: 'race', letter: 'K', who: WHO.kim, title: 'Gatloppet', color: '#4aa8ff', x: MACKEN.x, z: MACKEN.z, r: MACKEN.r, Job: RaceJob, at: 18, needCar: true,
    text: 'Kim här, på Macken. Folk säger att du kan köra. Gatlopp, två varv runt stan. Kom till Macken när du vågar – med egen bil.',
    reward: '2 500 kr till vinnaren', where: 'Macken, Drottninggatan (ta med en bil)',
  },
  {
    id: 'flag', letter: 'G', who: WHO.gun, title: 'Flaggan i topp', color: '#c58be0', x: GUN.x, z: GUN.z, side: true, at: 24,
    text: 'Hej, unga människa! Kan du hissa flaggan åt mig? Min axel vill inte riktigt. Jag bjuder på kanelbulle!',
    reward: '300 kr och en kanelbulle', where: 'Tant Guns trädgård, Storgatan',
  },
  {
    id: 'samuel', letter: '?', who: WHO.anon, title: 'Melkers cykelnycklar', color: '#ff7a59', x: TOWER_DOOR.x, z: TOWER_DOOR.z, r: TOWER_DOOR.r, Job: SamuelJob, at: 40, main: true,
    needFoot: 'Kliv ur bilen – du måste gå in genom porten.',
    text: 'Du känner inte mig, men jag vet vem du är. Melker bor på plan 7 i det mörka höghuset vid torget. Hans cykelnycklar ligger på köksbordet, och jag vill ha dem. Han är hemma, men han glor bara i telefonen. Smyg.',
    reward: `${fmt(SAMUEL_REWARD)} kr`, where: 'Höghuset vid torget, plan 7 (ingången på södra sidan)',
  },
  {
    id: 'overlamning', letter: '?', who: WHO.anon, title: 'Överlämningen', color: '#ff7a59', x: PIER_MEET.x, z: PIER_MEET.z, r: PIER_MEET.r, Job: HandoverJob, main: true,
    after: 'samuel', at: 6, needFoot: 'Bryggan är bara för gående. Kliv ur bilen.',
    text: 'Du har nycklarna. Bra. Kom till bryggan i hamnen – jag sitter på bänken längst ut. Kom gående. Och kom ensam.',
    reward: `${fmt(HANDOVER_REWARD)} kr och svar på dina frågor`, where: 'Bryggan i Sjuby hamn, längst ut',
  },
  {
    id: 'cykel', letter: 'G', who: WHO.gun, title: 'Arnes budcykel', color: '#c58be0', x: ISLE.bike.x, z: ISLE.bike.z, r: 2.0, Job: BikeJob, main: true,
    after: 'overlamning', at: 14, needFoot: 'Kliv ur bilen – cykeln står inne bland kolonilotterna.',
    text: 'Norra bron är öppen igen! Åk över till Norrholmen och hämta Arnes cykel – den står vid lott 7 bland kolonilotterna. Melkers nycklar passar i låset. Och se upp för Bullbilen.',
    reward: `${fmt(BIKE_REWARD)} kr (+${fmt(ESCAPE_BONUS)} kr om du skakar av dig Bullbilen)`, where: 'Kolonilotterna på Norrholmen, lott 7',
  },
  {
    // a side quest that comes by SMS (sms) once the north bridge is open (bridge)
    id: 'livs', letter: 'Y', who: WHO.yasmin, title: 'Fyrvaktarens kasse', color: '#ff6fae', x: LIVS_DOOR.x, z: LIVS_DOOR.z, r: LIVS_DOOR.r, Job: LivsJob,
    side: true, sms: true, bridge: true, after: 'overlamning', at: 35, needFoot: 'Kliv ur bilen – in i butiken går man till fots.',
    text: 'Hej, det är Yasmin på Hörnlivs, Kungsgatan! Nu när norra bron är öppen igen behöver jag hjälp med en leverans ut till Norrholmen. Titta in i butiken!',
    reward: `${fmt(LIVS_REWARD)} kr + ${fmt(EGG_BONUS)} kr per helt ägg`, where: 'Hörnlivs på Kungsgatan, under den blå markisen',
  },
  {
    // a side quest a little while after the eggs – once Arne's bike is with Gun (ready)
    id: 'nycklar', letter: 'N', who: WHO.leif, title: 'Melkers nya nycklar', color: '#36c2b4', x: LEIF_MARK.x, z: LEIF_MARK.z, r: LEIF_MARK.r, Job: KeysJob,
    side: true, sms: true, after: 'livs', at: 14, ready: (m) => m.done.has('cykel'), needFoot: 'Kliv ur – Leif vill ge dig nycklarna i handen.',
    text: 'Tjenare! Lås-Leif här, nyckelsmeden på Skolgatan. En kille som heter Melker har tappat sina cykelnycklar och väntar vid kolonilotterna ute på Norrholmen. Han vill ha nya NU. Kan du köra ut dem åt mig?',
    reward: `${fmt(KEY_REWARD)} kr`, where: 'Leifs nyckelservice, Skolgatan (södra sidan av torgkvarteret)',
  },
  {
    // main quest, part 4: due 45 s after the eggs (Ingvar saw the light), or a while after the bike
    id: 'kassaskap', letter: 'G', who: WHO.gun, title: 'Kassaskåpet', color: '#c58be0', x: OFFICE_DOOR.x, z: OFFICE_DOOR.z, r: OFFICE_DOOR.r, Job: SafeJob, main: true,
    after: 'cykel', due: (m) => (m.done.has('livs') ? m.doneTime('livs') + 45 : m.doneTime('cykel') + 150),
    needFoot: 'Kliv ur – du måste smyga in genom sidodörren.',
    text: 'Det lyser på Bullbilens bagerikontor ute på Norrholmen varje natt – Ingvar vid fyren har också sett det. Där står kassaskåpet med andra halvan av Arnes recept! Smyg in genom sidodörren medan Bagar-Bengt är vid ugnarna.',
    reward: `${fmt(SAFE_REWARD)} kr (+500 kr om du skakar av dig Bullbilarna)`, where: 'Bullbilens bageri, sidodörren på västra väggen',
  },
  {
    // side quest: what the money is for – Lasse's tuning shop (stays open afterwards)
    id: 'verkstad', letter: 'L', who: WHO.lasse, title: 'Lasses trimning', color: '#ffcf33', x: LASSE_SHOP.x, z: LASSE_SHOP.z,
    side: true, sms: true, after: 'kassaskap', at: 25,
    text: 'Tjena, Lasse här! Snacket går att du har gott om stålar nu. Kom till verkstaden så visar jag vad pengar kan köpa: turbo, krockskydd och en tuta som får hela Sjuby att dansa.',
    reward: 'Grejerna är dina för alltid', where: 'Lasses Verkstad, Drottninggatan (första garageporten)',
  },
  {
    // side quest: Kim's long jump, after you have been shopping at Lasse's
    id: 'hopp', letter: 'K', who: WHO.kim, title: 'Långhoppet', color: '#4aa8ff', x: -70, z: 10,
    side: true, sms: true, after: 'verkstad', at: 15,
    text: `Kim här. Lasse säger att du har varit och shoppat. Bevisa att det hjälper: hoppa minst ${JUMP_GOAL} meter på byggtomtens hopp. Ta sats från parkeringen på andra sidan Skolgatan.`,
    reward: `${fmt(JUMP_REWARD)} kr`, where: 'Hoppet på byggtomten, Skolgatan',
  },
  {
    // main quest, part 5: Sjuby Konditori opens again
    id: 'konditori', letter: 'G', who: WHO.gun, title: 'Nyöppningen', color: '#c58be0', x: KONDITORI.x, z: KONDITORI.z, r: KONDITORI.r, Job: OpeningJob, main: true,
    after: 'kassaskap', at: 6, startOnAccept: true,
    text: 'Jag har bestämt mig: Sjuby Konditori ska öppna igen, i Arnes gamla lokal vid torget! Men till bullarna behöver jag kardemumma från Hörnlivs, smör från Macken och mjöl från kvarnen på Norrholmen. Hjälper du mig?',
    reward: `${fmt(OPENING_REWARD)} kr och den första Sjubybullen`, where: 'Hörnlivs, Macken och kvarnen – sedan konditoriet vid torget',
  },
  {
    // two side quests a few seconds after the safe (they text you even in the middle of something)
    id: 'cykelretur', letter: 'M', who: WHO.samuel, title: 'Melkers cykel', color: '#6e7a46', x: GUN_BIKE.x, z: GUN_BIKE.z, r: 2.2, Job: BikeReturnJob,
    side: true, sms: true, anytime: true, after: 'kassaskap', at: 4, startOnAccept: true,
    text: 'Det är Melker. Jag vet att det var du som tog mina cykelnycklar – Leif pratar för mycket. Och nu står min cykel hos tanten på Storgatan. Kan jag få tillbaka den? Jag väntar vid höghuset.',
    reward: `${fmt(BIKE_RETURN.reward)} kr och ett rent samvete`, where: 'Cykeln vid tant Guns grind, Melker vid höghuset',
  },
  {
    id: 'hemleverans', letter: 'Y', who: WHO.yasmin, title: 'Hemleverans', color: '#ff6fae', x: HOME_DELIVERY.start.x, z: HOME_DELIVERY.start.z, r: HOME_DELIVERY.start.r, Job: HomeDeliveryJob,
    side: true, sms: true, anytime: true, after: 'kassaskap', at: 9,
    text: `Yasmin här! Tre av mina äldre kunder kommer inte till butiken i dag. Kan du köra ut deras matkassar? Du har ${HOME_DELIVERY.time} sekunder innan glassen smälter. Hämta dem utanför Hörnlivs.`,
    reward: `${fmt(3 * HOME_DELIVERY.per)} kr + ${HOME_DELIVERY.bonus} kr per sekund över`, where: 'Utanför Hörnlivs, Kungsgatan',
  },
  {
    // main quest, part 6: the jam jar is stolen
    id: 'syltburken', letter: 'G', who: WHO.gun, title: 'Syltburken', color: '#c58be0', x: KONDITORI.x, z: KONDITORI.z, Job: JarJob, main: true,
    after: 'konditori', at: 10, startOnAccept: true,
    text: 'Hjälp! Någon har brutit sig in på konditoriet i natt och tagit min syltburk – med receptet i! En svart bil körde iväg. Den är fortfarande i stan. Stoppa den!',
    reward: `${fmt(JAR.reward)} kr`, where: 'Den svarta bilen, någonstans i Sjuby',
  },
  {
    // main quest, part 7: the factory
    id: 'fabriken', letter: 'B', who: WHO.bengt, title: 'Bullfabriken', color: '#d9534f', x: FACTORY_START.x, z: FACTORY_START.z, r: FACTORY_START.r, Job: FactoryJob, main: true,
    after: 'syltburken', at: 12, startOnAccept: true,
    text: 'Bengt här. Dahlgrens lastbil går från bageriet om en stund. Ställ dig vid infarten på Norrholmen och följ efter den – men håll avstånd, föraren är misstänksam.',
    reward: `${fmt(FACTORY_REWARD)} kr`, where: 'Bageriets infart på Norrholmen – sedan efter lastbilen',
  },
  {
    // side quest (v1.0), indoors: Vera's hair salon on Skolgatan – three customers, scissors, razor and dye
    id: 'salong', letter: 'V', who: WHO.fia, title: 'Salong Saxen', color: '#e8833a', x: SALON_DOOR.x, z: SALON_DOOR.z, r: SALON_DOOR.r, Job: SalonJob,
    side: true, sms: true, after: 'konditori', at: 30, needFoot: 'Kliv ur – in i salongen går man till fots.',
    text: 'Hej, det är Vera på Salong Saxen på Skolgatan! Jag har brutit handleden och har tre kunder bokade i dag. Kan du hålla i saxen åt mig? Jag säger hur man gör.',
    reward: `upp till ${fmt(SALON_PAY.base + 3 * (SALON_PAY.happy + SALON_PAY.tip))} kr`, where: 'Salong Saxen, Skolgatan (bredvid Lås-Leif)',
  },
  {
    // main quest, part 8 (v1.0): the bun party on the square – and Jonte the bike thief
    id: 'bullfest', letter: 'G', who: WHO.gun, title: 'Bullfesten', color: '#c58be0', x: FEST.mark.x, z: FEST.mark.z, r: FEST.mark.r, Job: FestJob, main: true,
    after: 'fabriken', at: 15, needFoot: 'Kliv ur – festen är till fots.',
    text: 'Bullfesten är i dag, lilla vän! Hela Sjuby samlas på torget, och Arnes gamla cykel får köra ut bullarna. Kom och fira – det är din fest också.',
    reward: `${fmt(FEST.reward)} kr och så många bullar du orkar`, where: 'Torget, framför Sjuby Konditori',
  },
  {
    // what comes next: shown in the list, not playable yet
    id: 'cykelgomman', letter: 'P', who: WHO.pia, title: 'Cykelgömman', color: '#3b6fd8', main: true, soon: true, after: 'bullfest',
  },
];
const BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
const COLOR_OF = {};
for (const q of QUESTS) if (!(q.who in COLOR_OF)) COLOR_OF[q.who] = q.color; // a contact's color: their first quest's
const MAIN = ['lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel', 'kassaskap', 'konditori', 'syltburken', 'fabriken', 'bullfest']; // all eleven → the end card; the side quests are a bonus
const SAVE_VERSION = 2;                    // v0.3 saves add known/seen/tracked; v0.2 saves still load

export class Missions {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.queue = [];
    this.flags = {};
    this.done = new Set();          // 'red' (car stolen), 'lasse', 'pizza', 'race', 'flag'
    this.known = new Set();         // offered quests (in the list)
    this.seen = new Set();          // answered or looked at in the list (no "new" badge)
    this.tracked = null;            // the quest the objective box and the GPS follow
    this.prevTracked = null;        // followed again when a pizza/race job ends
    this.lasse = 'intro';           // intro → steal → deliver_wait → deliver → done
    this.jobs = QUESTS.filter((q) => q.Job).map((q) => ({ ...q, cool: 0, armed: true, warned: false }));
    this.active = null;             // the running job (PizzaJob / RaceJob)
    this.targets = [];              // what the view and the minimap should point at
    this.objective = ''; this.sub = ''; this.choose = false;
    this.holdObj = 0;
    this.restored = false;
    this.washT = 0; this.inWash = false;
    this.keepT = 0;
    this.flag = new FlagQuest(this);
    this.party = new FestParty(this); // the bun party on the square (v1.0)
    this.upgrades = new Set();      // what you have bought at Lasse's (v0.8): 'turbo', 'pansar', 'tuta'
    this.bestJump = 0;              // for Kim's long jump
    this.shopArmed = true;
    game.on('enterCar', (e) => this.onEnterCar(e));
    game.on('exitCar', (e) => { clearUpgrades(e.car); if (this.active && this.active.onExitCar) this.active.onExitCar(e); });
    game.on('stunt', (e) => this.onStunt(e));
    game.on('crash', (e) => this.active && this.active.onCrash && this.active.onCrash(e));
    game.on('bikeFall', (e) => this.active && this.active.onBikeFall && this.active.onBikeFall(e));
  }

  quest(id) { return BY_ID[id]; }
  doneTime(id) { return (this.flags.doneAt || {})[id] ?? 0; } // when a quest was finished (0: before this session)
  // the north bridge to Norrholmen is open once tant Gun has sent you for Arne's bike
  get bridgeOpen() { return this.known.has('cykel') || this.done.has('cykel'); }
  get gunVisible() { return this.restored || this.known.has('flag') || this.t >= BY_ID.flag.at; }
  // the action button's label: the lift, something the running job wants (take the keys), or tant Gun
  get prompt() { return this.game.indoors.prompt || (this.active && this.active.prompt) || this.flag.prompt; }

  // ---------------------------------------------------------------- helpers
  later(delay, fn, owner = null) { this.queue.push({ at: this.game.time + delay, fn, owner }); }
  cancel(owner) { this.queue = this.queue.filter((q) => q.owner !== owner); }

  setObjective(text, sub = '') {
    this.sub = sub;
    if (text === this.objective) return;
    this.objective = text;
    this.game.emit('objective', { text });
  }

  sms(who, text, delay = 0, owner = null) {
    const color = COLOR_OF[who] || null;
    this.later(delay, () => this.game.emit('sms', { from: who, text, color }), owner);
  }

  pay(amount, title, sub) {
    const g = this.game;
    g.money += amount;
    g.emit('money', { delta: amount, total: g.money });
    if (title) g.emit('banner', { title, sub, amount });
    g.emit('progress', {});
  }

  // Lås-Leif outside his shop on Skolgatan (once he is part of the story)
  ensureLeif() { if (!this.leif) this.leif = spawnLeif(this.game); }

  // the next part of the main quest when it is on its way (its part before is done, no text yet)
  nextMain() { return QUESTS.find((q) => q.main && !q.soon && q.after && this.done.has(q.after) && !this.known.has(q.id) && !this.done.has(q.id)) || null; }

  allDone() { return MAIN.every((id) => this.done.has(id)); }

  // ---------------------------------------------------------------- the quest log
  // a contact offers a quest: by SMS (tap it to answer) or face to face (the card opens at once)
  offer(id, how = 'sms') {
    const g = this.game, q = BY_ID[id];
    if (!q || q.soon || this.known.has(id) || this.done.has(id) || (q.after && !this.done.has(q.after))) return;
    this.known.add(id);
    if (id === 'nycklar') this.ensureLeif();
    if (how === 'sms') {
      g.emit('sms', { from: q.who, text: q.text, color: q.color, offer: id });
      if (!this.flags.answerHint) {
        this.flags.answerHint = true;
        this.later(1.5, () => g.emit('hint', { id: 'answer', touch: 'Tryck på SMS:et för att svara på uppdraget', keys: 'Klicka på SMS:et eller tryck J för att svara på uppdraget' }));
      }
    } else g.emit('offer', { id });
    g.emit('progress', {});
  }

  // follow a quest: objective + GPS. During a pizza/race job it is queued until the job ends.
  accept(id) {
    const g = this.game;
    if (!this.known.has(id) || this.done.has(id)) return false;
    this.seen.add(id);
    if (this.active && this.active.id !== id) {
      this.prevTracked = id;
      g.emit('toast', { text: `Du följer ${BY_ID[id].title} när ${BY_ID[this.active.id].title} är klart.`, long: true });
      g.emit('progress', {});
      return true;
    }
    this.tracked = id;
    this.holdObj = 0;
    g.emit('tracked', { id });
    g.emit('progress', {});
    if (!this.flags.followHint) {
      this.flags.followHint = true;
      this.later(0.4, () => g.emit('hint', { id: 'follow', touch: 'Följ den gula linjen på kartan', keys: 'Följ den gula linjen på kartan' }));
    }
    if (id === 'lasse' && this.lasse === 'steal') {
      this.later(4, () => g.emit('hint', { id: 'steal', touch: 'Gå fram till en röd bil och tryck på den gula knappen', keys: 'Gå fram till en röd bil och tryck E' }));
    }
    return true;
  }

  // save it for later: stays in the list
  wait(id) {
    this.seen.add(id);
    if (this.tracked === id && !(this.active && this.active.id === id)) this.tracked = null;
    if (this.prevTracked === id) this.prevTracked = null;
    this.game.emit('progress', {});
  }

  markSeen() { for (const id of this.known) this.seen.add(id); }
  newCount() { let n = 0; for (const id of this.known) if (!this.seen.has(id) && !this.done.has(id)) n++; return n; }
  isOpen(id) { return this.known.has(id) && !this.done.has(id); }

  // the list in the pause menu and the quest log
  list() {
    const order = { active: 0, tracked: 1, new: 2, waiting: 3, soon: 4, done: 5 };
    const soon = (q) => (q.soon || q.main) && q.after && this.done.has(q.after) && !this.known.has(q.id) && !this.done.has(q.id);
    return QUESTS.filter((q) => this.known.has(q.id) || this.done.has(q.id) || soon(q)).map((q) => {
      let state = 'waiting';
      if (soon(q)) state = 'soon';
      else if (this.done.has(q.id)) state = 'done';
      else if (this.active && this.active.id === q.id) state = 'active';
      else if (this.tracked === q.id) state = 'tracked';
      else if (!this.seen.has(q.id)) state = 'new';
      return { id: q.id, letter: q.letter, title: q.title, who: q.who, color: q.color, side: !!q.side, main: !!q.main, state, line: this.questLine(q.id) };
    }).sort((a, b) => order[a.state] - order[b.state]);
  }

  // what to do next, in one line (for the list)
  questLine(id) {
    const q0 = BY_ID[id];
    if (q0 && q0.main && !q0.soon && !this.known.has(id) && !this.done.has(id)) return `${q0.who.replace(/ \(.*\)$/, '')} hör av sig om en stund`;
    if (id === 'cykelgomman') return 'Fortsättning följer – Jontes gömda cyklar';
    if (this.done.has(id)) return 'Klart';
    if (this.active && this.active.id === id) return this.objective || 'Pågår';
    switch (id) {
      case 'lasse': return this.lasse === 'steal' || this.lasse === 'intro' ? 'Sno en röd bil' : 'Kör den röda bilen till Lasses Verkstad';
      case 'pizza': return 'Gå till pizzerian på Kungsgatan';
      case 'race': return 'Kör till Macken med en bil';
      case 'flag': return 'Hissa flaggan hos tant Gun på Storgatan';
      case 'samuel': return 'Ta Melkers cykelnycklar i höghuset vid torget';
      case 'overlamning': return 'Lämna nycklarna på bänken längst ut på bryggan';
      case 'cykel': return 'Hämta Arnes cykel på Norrholmen och cykla den till tant Gun';
      case 'livs': return 'Gå in på Hörnlivs på Kungsgatan';
      case 'nycklar': return 'Hämta nycklarna hos Lås-Leif på Skolgatan';
      case 'kassaskap': return 'Smyg in på Bullbilens bagerikontor och öppna kassaskåpet';
      case 'verkstad': return 'Köp något i Lasses trimningsbutik';
      case 'hopp': return `Hoppa minst ${JUMP_GOAL} m på byggtomten${this.bestJump ? ` (bäst hittills ${this.bestJump} m)` : ''}`;
      case 'konditori': return 'Hämta kardemumma, smör och mjöl till Sjuby Konditori';
      case 'syltburken': return 'Stoppa den svarta bilen och ta tillbaka syltburken';
      case 'fabriken': return 'Följ Dahlgrens lastbil från bageriet';
      case 'cykelretur': return 'Cykla tillbaka cykeln till Melker vid höghuset';
      case 'hemleverans': return 'Kör ut tre matkassar från Hörnlivs';
      case 'salong': return 'Hjälp Vera med tre kunder på Salong Saxen, Skolgatan';
      case 'bullfest': return 'Gå till Bullfesten på torget';
    }
    return '';
  }

  // details for the offer card
  info(id) {
    const q = BY_ID[id];
    return q && { id, letter: q.letter, title: q.title, who: q.who, color: q.color, text: q.text, reward: q.reward, where: q.where, side: !!q.side, main: !!q.main, busy: this.active && this.active.id !== id ? BY_ID[this.active.id].title : null };
  }

  // ---------------------------------------------------------------- save / load
  progress() {
    return {
      v: SAVE_VERSION, money: this.game.money, done: [...this.done], stats: { ...this.game.stats },
      known: [...this.known], seen: [...this.seen], tracked: this.active ? this.active.id : this.tracked,
      upg: [...this.upgrades], best: this.bestJump,
    };
  }

  restore(d) {
    if (!d || d.v !== SAVE_VERSION) return false;
    const g = this.game;
    const valid = (id) => !!BY_ID[id];
    g.money = Math.max(0, d.money || 0);
    Object.assign(g.stats, d.stats || {});
    this.done = new Set((d.done || []).filter((id) => id === 'red' || (valid(id) && !BY_ID[id].soon)));
    // a quest that comes after another one is only open once that one is done
    const reachable = (id) => valid(id) && !BY_ID[id].soon && (!BY_ID[id].after || this.done.has(BY_ID[id].after));
    if (Array.isArray(d.known)) {
      this.known = new Set(d.known.filter(reachable));
      this.seen = new Set((d.seen || []).filter(reachable));
    } else {
      // a save from version 0.2, where Lasse, Sanna and Kim had all been in touch
      for (const id of ['lasse', 'pizza', 'race']) { this.known.add(id); this.seen.add(id); }
    }
    for (const id of this.done) if (valid(id)) { this.known.add(id); this.seen.add(id); }
    this.tracked = valid(d.tracked) && this.isOpen(d.tracked) ? d.tracked : null;
    this.upgrades = new Set((d.upg || []).filter((id) => ITEMS.some((it) => it.id === id)));
    this.bestJump = d.best || 0;
    this.lasse = this.done.has('lasse') ? 'done' : this.done.has('red') ? 'deliver' : this.known.has('lasse') ? 'steal' : 'intro';
    if (this.done.has('flag')) this.flag.h = 1;
    if (this.done.has('cykelretur')) g.spawnBike(BIKE_RETURN.x - 1.4, BIKE_RETURN.z + 0.4, Math.PI / 2, false); // back with Melker, by the tower
    else if (this.done.has('cykel')) g.spawnBike(GUN_BIKE.x, GUN_BIKE.z, GUN_BIKE.h, false); // the bike is yours now, by Gun's gate
    if (this.done.has('livs')) this.ingvar = spawnIngvar(g); // the lighthouse keeper, outside his cottage
    if (this.known.has('nycklar') || this.done.has('nycklar')) this.ensureLeif();
    if (this.allDone()) this.flags.allDone = true;
    if (QUESTS.some((q) => !q.main && this.done.has(q.id))) this.flags.firstDone = 0;
    this.restored = true;
    return true;
  }

  // ---------------------------------------------------------------- per step
  update(dt) {
    const g = this.game;
    this.t += dt;
    this.outT = g.indoor || g.indoors.busy ? 0 : (this.outT || 0) + dt; // time since you came out of the tower
    g.stats.playTime = (g.stats.playTime || 0) + dt;
    for (let i = 0; i < this.queue.length; i++) {
      if (g.time >= this.queue[i].at) { const q = this.queue.splice(i, 1)[0]; i--; q.fn(); }
    }
    this.timeline();
    if (this.active) this.active.update(dt);
    else this.checkJobs(dt);
    this.lasseStep();
    this.flag.update(dt);
    this.party.update(dt);
    this.shopCheck();
    if (this.holdObj > 0) this.holdObj -= dt;
    if (this.active) this.choose = false;
    else if (this.holdObj <= 0) this.followObjective();
    this.buildTargets();
    this.activities(dt);
    if ((this.keepT -= dt) <= 0) { this.keepT = 2; this.keepPizzaCar(); }
  }

  // the opening: Lasse texts first, then Sanna and Kim; Gun starts waving a little later
  timeline() {
    const g = this.game;
    // the main quest calls a little later – or a few seconds after you have finished something
    const early = (q) => q.main && this.flags.firstDone != null && this.t >= this.flags.firstDone + 8;
    // the next part of a quest chain: a few seconds after the part before, once you are outdoors
    const next = (q) => this.done.has(q.after) && !g.indoor && this.outT >= 2.5 && this.t >= ((this.flags.doneAt || {})[q.after] ?? 0) + q.at;
    for (const q of QUESTS) {
      if ((q.side && !q.sms) || q.soon || this.known.has(q.id) || this.done.has(q.id)) continue;
      if (q.bridge && !this.bridgeOpen) continue;
      if (q.ready && !q.ready(this)) continue;
      if (q.side && !q.anytime && this.active) continue; // a side quest texts you when you are not busy
      if (q.due) { if (!this.done.has(q.after) || g.indoor || this.outT < 2.5 || this.t < q.due(this)) continue; }
      else if (q.after ? !next(q) : this.t < q.at && !early(q)) continue;
      this.offer(q.id);
      if (q.id === 'lasse' && this.lasse === 'intro') this.lasse = 'steal';
    }
    if (!this.flags.gunHint && this.gunVisible && !this.known.has('flag') && !this.done.has('flag') && !this.flag.gun.away) {
      this.flags.gunHint = true;
      if (!this.restored) this.later(2, () => g.emit('hint', { id: 'gun', touch: 'G på kartan: tant Gun vinkar efter hjälp.', keys: 'G på kartan: tant Gun vinkar efter hjälp.' }));
    }
  }

  // walking or driving into the S or K marker starts that job
  checkJobs(dt) {
    const g = this.game, p = g.player;
    if (p.state !== 'foot' && p.state !== 'car') return;
    const car = p.inCar ? p.car : null;
    const x = car ? car.x : p.x, z = car ? car.z : p.z;
    for (const c of this.jobs) {
      if (!this.isOpen(c.id)) continue;
      if (c.cool > 0) { c.cool -= dt; continue; }
      if (c.startOnAccept) { if (this.tracked === c.id) { this.startJob(c); return; } continue; } // starts as soon as you follow it
      const d = Math.hypot(x - c.x, z - c.z);
      if (d > c.r + 1.5) { c.armed = true; c.warned = false; continue; }
      if (d > c.r || !c.armed) continue;
      if (c.needCar && (!car || car.dead || car.spec.bike)) {
        if (!c.warned) { c.warned = true; g.emit('toast', { text: 'Kim kör bara mot folk med bil. Kom tillbaka med en!', long: true }); }
        continue;
      }
      if (c.needFoot && car) {
        if (!c.warned) { c.warned = true; g.emit('toast', { text: car.spec.bike ? c.needFoot.replace('Kliv ur bilen', 'Kliv av cykeln') : c.needFoot, long: true }); }
        continue;
      }
      if (car && car.speed > 12) continue;
      c.armed = false;
      this.startJob(c);
      return;
    }
  }

  startJob(c) {
    const g = this.game;
    this.seen.add(c.id);
    if (this.tracked !== c.id) this.prevTracked = this.tracked;
    this.tracked = c.id;
    this.active = new c.Job(this, c);
    if (this.active.titleCard !== false) g.emit('banner', { title: c.title.toUpperCase(), sub: c.who, kind: 'start' });
    g.emit('missionStart', { id: c.id });
    this.active.start();
  }

  complete(job, r) {
    this.endJob(job, 'done');
    this.completeQuest(job.id, r);
  }

  // a finished quest (a job, Lasse's car or Gun's flag)
  completeQuest(id, r) {
    const g = this.game;
    this.done.add(id);
    (this.flags.doneAt || (this.flags.doneAt = {}))[id] = this.t;
    if (this.flags.firstDone == null) this.flags.firstDone = this.t;
    if (this.tracked === id) { this.tracked = null; this.setObjective('', ''); this.holdObj = 3.4; }
    if (this.prevTracked === id) this.prevTracked = null;
    if (r.amount) this.pay(r.amount, r.title, r.sub);
    else { g.emit('banner', { title: r.title, sub: r.sub }); g.emit('progress', {}); }
    this.checkAllDone(id);
  }

  fail(job, reason, sms) {
    const g = this.game;
    this.endJob(job, 'fail');
    const c = this.jobs.find((q) => q.id === job.id);
    if (c) { c.cool = 6; c.armed = false; }
    g.stats.fails = (g.stats.fails || 0) + 1;
    g.emit('banner', { title: 'UPPDRAG MISSLYCKAT', sub: reason, kind: 'fail' });
    if (sms) this.sms(sms[0], sms[1], 3.4); // after the banner
  }

  // walking away before the job really started: no failure, the marker just comes back
  quit(job, sms) {
    this.endJob(job, 'quit');
    this.holdObj = 0;
    const c = this.jobs.find((q) => q.id === job.id);
    if (c) { c.cool = 3; c.armed = false; }
    if (sms) this.sms(sms[0], sms[1], 0.5);
  }

  // after a job: follow what you followed before (or keep following a failed job to retry it)
  endJob(job, how) {
    if (job.cleanup) job.cleanup();
    this.cancel(job);
    if (this.active === job) this.active = null;
    const prev = this.prevTracked && this.isOpen(this.prevTracked) ? this.prevTracked : null;
    this.prevTracked = null;
    this.tracked = how === 'fail' ? job.id : prev;
    this.setObjective('', '');
    this.holdObj = 3.4;
  }

  checkAllDone(last) {
    if (this.flags.allDone || !this.allDone()) return;
    this.flags.allDone = true;
    const g = this.game;
    const wait = ['overlamning', 'cykel', 'kassaskap', 'konditori', 'syltburken', 'fabriken', 'bullfest'].includes(last) ? 4.3 : 0; // after the last talk and the texts
    const side = QUESTS.filter((q) => q.side && !this.done.has(q.id)).length;
    this.later(7.2 + wait, () => this.sms(WHO.game, side
      ? `Det var allt i version 1.1! Jonte är fast och Bullfesten räddad. Du har ${side === 1 ? 'ett sidouppdrag' : `${side} sidouppdrag`} kvar att göra.`
      : 'Det var allt i version 1.1! Jonte är fast och Bullfesten räddad. Kör runt fritt så länge.'));
    this.later(9.8 + wait, () => g.emit('endcard', { stats: { ...g.stats, money: g.money } }));
  }

  // the dialogue overlay (main.js) reports back to the running job
  talkFx(id, fx) { if (this.active && this.active.id === id && this.active.talkFx) this.active.talkFx(fx); }
  talkDone(id) { if (this.active && this.active.id === id && this.active.talkDone) this.active.talkDone(); }

  // the objective box when no job is running: the followed quest, or a nudge to pick one
  followObjective() {
    let o = null;
    if (this.tracked) o = this.objectiveFor(this.tracked);
    this.choose = false;
    if (!o) {
      const open = QUESTS.some((q) => this.isOpen(q.id));
      const next = this.nextMain();
      if (this.newCount()) { o = { text: 'Nytt uppdrag – välj i listan', sub: '' }; this.choose = true; }
      else if (next) o = { text: 'Huvuduppdraget fortsätter snart', sub: `${next.who.replace(/ \(.*\)$/, '')} hör av sig om en stund` };
      else if (open) { o = { text: 'Välj ett uppdrag i listan', sub: '' }; this.choose = true; }
      else if (this.flags.allDone) o = { text: 'Fri lek: utforska Sjuby', sub: '' };
      else o = { text: '', sub: '' };
    }
    this.setObjective(o.text, o.sub);
  }

  objectiveFor(id) {
    switch (id) {
      case 'lasse':
        if (this.lasse === 'steal') return { text: 'Sno en röd bil', sub: '' };
        if (this.lasse === 'deliver') {
          if (this.lasseCar()) return { text: 'Kör bilen till Lasses Verkstad', sub: 'Drottninggatan' };
          const p = this.game.player;
          return { text: p.inCar && p.car.isRed && p.car.dead ? 'Bilen är skrot – hitta en ny röd bil' : 'Hoppa in i en röd bil', sub: '' };
        }
        return { text: '', sub: '' };
      case 'pizza': return { text: 'Gå till pizzerian (S)', sub: 'Pizzeria Sjuan, Kungsgatan' };
      case 'race': return { text: 'Kör till Macken (K)', sub: this.game.player.inCar ? 'Kör in i den blå ringen' : 'Ta med en bil' };
      case 'flag': return this.flag.objective();
      case 'samuel': return { text: 'Gå till höghuset vid torget (?)', sub: this.game.player.inCar ? 'Parkera och gå in genom porten' : 'Porten på södra sidan' };
      case 'overlamning': return { text: 'Gå till bryggan i hamnen (?)', sub: this.game.player.inCar ? 'Parkera och gå ut på bryggan' : 'Bänken längst ut på bryggan' };
      case 'cykel': return { text: 'Hämta Arnes cykel (G)', sub: this.game.player.z < -229 ? 'Lott 7 bland kolonilotterna' : 'Över norra bron till Norrholmen' };
      case 'livs': return { text: 'Gå in på Hörnlivs (Y)', sub: this.game.player.inCar ? 'Parkera och gå in' : 'Kungsgatan, under den blå markisen' };
      case 'nycklar': return { text: 'Gå till Lås-Leif (N)', sub: 'Skolgatan, södra sidan av torgkvarteret' };
      case 'verkstad': return { text: 'Köp något hos Lasse (L)', sub: 'Lasses Verkstad, första garageporten' };
      case 'hopp': return { text: `Hoppa minst ${JUMP_GOAL} m`, sub: this.bestJump ? `Bäst hittills ${this.bestJump} m · ta längre sats` : 'Byggtomten · ta sats från parkeringen' };
      case 'konditori': return { text: 'Nyöppningen', sub: 'Tre ingredienser till Sjuby Konditori' };
      case 'syltburken': return { text: 'Syltburken', sub: 'Den svarta bilen' };
      case 'fabriken': return { text: 'Bullfabriken', sub: 'Bageriets infart på Norrholmen' };
      case 'cykelretur': return { text: 'Melkers cykel', sub: 'Vid tant Guns grind' };
      case 'hemleverans': return { text: 'Hämta matkassarna (Y)', sub: 'Utanför Hörnlivs, Kungsgatan' };
      case 'salong': return { text: 'Gå till Salong Saxen (F)', sub: this.game.player.inCar ? 'Parkera och gå in' : 'Skolgatan, bredvid Lås-Leif' };
      case 'bullfest': return { text: 'Gå till Bullfesten (G)', sub: this.game.player.inCar ? 'Parkera och gå till torget' : 'Torget, framför Sjuby Konditori' };
      case 'kassaskap': return { text: 'Till bagerikontoret (G)', sub: this.game.player.z < -229 ? 'Sidodörren på bageriets västra vägg' : 'Över norra bron till Norrholmen' };
    }
    return null;
  }

  // ---------------------------------------------------------------- Lasse's job
  lasseCar() {
    const p = this.game.player;
    return p.inCar && p.car.isRed && !p.car.dead ? p.car : null;
  }

  // counts whenever you do it – followed or not, and even in the middle of another job
  lasseStep() {
    if (this.lasse === 'steal' && this.lasseCar()) { this.stoleRed(); return; }
    if (this.lasse !== 'deliver') return;
    const car = this.lasseCar();
    if (!car) return;
    const d = Math.hypot(car.x - DELIVERY.x, car.z - DELIVERY.z);
    if (d < DELIVERY.r && car.speed < 2.5 && !car.air) this.deliver(car);
    else if (d < DELIVERY.r + 2 && car.speed >= 2.5) this.game.emit('hint', { id: 'stopin', touch: 'Stanna i den gula cirkeln', keys: 'Stanna i den gula cirkeln' });
  }

  stoleRed() {
    const g = this.game;
    this.lasse = 'deliver_wait';
    this.done.add('red');
    g.stats.missionTime = g.time;
    if (this.tracked === 'lasse') { this.setObjective(''); this.holdObj = 3.4; }
    this.pay(RED_REWARD, 'UPPDRAG KLART', 'Sno en röd bil');
    this.later(3.6, () => {
      if (this.lasse !== 'deliver_wait') return;
      this.lasse = 'deliver';
      this.sms(WHO.lasse, 'Snyggt! Kör kärran till min verkstad på Drottninggatan. Repor drar jag av på betalningen, så kör snällt.');
    });
  }

  onEnterCar(e) {
    const { car, jacked } = e;
    const g = this.game;
    applyUpgrades(car, this.upgrades);
    if (car.spec.bike) { // the bike is not a car to steal
      if (!this.flags.bikeHint) {
        this.flags.bikeHint = true;
        this.later(0.6, () => g.emit('hint', { id: 'bikecontrols', touch: 'Dra spaken uppåt för att trampa. BROMS bromsar – och PLING plingar.', keys: 'W trampa · S eller mellanslag bromsa · A/D styr · H plinga · E kliv av' }));
      }
      if (this.active && this.active.onEnterCar) this.active.onEnterCar(e);
      return;
    }
    g.stats.carsStolen++;
    if (jacked) g.stats.carsJacked++;
    if (jacked && !this.flags.wantedJoke) {
      this.flags.wantedJoke = true;
      this.later(1.2, () => g.emit('wanted', { stars: 1 }));
      this.later(4.2, () => { g.emit('wanted', { stars: 0 }); g.emit('toast', { text: 'Polisen har fika till tre. Du kom undan!', long: true }); });
    }
    if (this.lasse === 'steal') {
      if (car.isRed && !car.dead) this.stoleRed();
      else if (!car.isRed && this.tracked === 'lasse' && !this.active && !this.flags.colorblind) {
        this.flags.colorblind = true;
        this.sms(WHO.lasse, `Den där är ju ${colorName(car)}… Är du färgblind? RÖD bil, sa jag.`);
      }
    }
    if (!this.flags.driveHint) {
      this.flags.driveHint = true;
      this.later(0.6, () => g.emit('hint', { id: 'carcontrols', touch: 'Dra spaken uppåt för att köra, nedåt för att bromsa och backa', keys: 'W/S gas och broms · A/D styr · Mellanslag handbroms · H tuta' }));
    }
    if (this.active && this.active.onEnterCar) this.active.onEnterCar(e);
  }

  deliver(car) {
    const g = this.game;
    if (this.lasse !== 'deliver') return;
    this.lasse = 'done';
    const cond = Math.round(car.health);
    const reward = Math.max(500, Math.round((DELIVERY_REWARD * cond) / 100 / 50) * 50);
    const ded = DELIVERY_REWARD - reward;
    g.stats.deliveredCondition = cond;
    g.stats.totalTime = g.time;
    car.input.throttle = 0;
    car.vx *= 0.2; car.vz *= 0.2;
    this.completeQuest('lasse', { title: 'UPPDRAG KLART', sub: 'Leverera bilen till Lasse', amount: reward });
    let text;
    if (cond >= 95) text = `Inte en repa! Du är ett proffs. Hela ${fmt(reward)} kr är dina.`;
    else if (cond >= 60) text = `Lite bucklor här och där… Jag drar av ${fmt(ded)} kr. Biltvätten på Macken fixar sånt, bara så du vet.`;
    else text = `Vad har du GJORT med den?! Den ser ut som kaffesump. ${fmt(reward)} kr får räcka.`;
    this.sms(WHO.lasse, text, 3.4);
  }

  // ---------------------------------------------------------------- map + view targets
  // Letters mark every quest you can take on. Arrows, zones and the GPS belong to the quest you follow.
  buildTargets() {
    const T = this.targets, g = this.game, p = g.player;
    T.length = 0;
    const tr = this.active ? null : this.tracked;
    if (this.active) this.active.targets(T);
    // Lasse: the L marks the garage; when followed, red cars to steal and then the delivery zone
    if (this.isOpen('lasse') && this.lasse !== 'intro') {
      const L = this.lasse, color = BY_ID.lasse.color;
      const car = L === 'deliver' ? this.lasseCar() : null;
      if (tr === 'lasse' && car) T.push({ kind: 'zone', x: DELIVERY.x, z: DELIVERY.z, r: DELIVERY.r, gps: true, letter: 'L', color });
      else T.push({ kind: 'contact', x: DELIVERY.x, z: DELIVERY.z, r: DELIVERY.r, letter: 'L', color, mapOnly: true });
      if (tr === 'lasse' && !car && L !== 'deliver_wait') {
        let best = null, bd = 1e9;
        for (const v of g.vehicles) {
          if (!v.isRed || v.dead || v.driver === 'player') continue;
          const t = { kind: 'car', car: v };
          T.push(t);
          const d = Math.hypot(v.x - p.x, v.z - p.z);
          if (d < bd) { bd = d; best = t; }
        }
        if (best) best.gps = true; // the yellow line leads to the nearest red car
      }
    }
    // the S and K markers (hidden while a job runs)
    if (!this.active) {
      for (const c of this.jobs) {
        if (!this.isOpen(c.id) || c.cool > 0 || c.startOnAccept) continue;
        T.push({ kind: 'contact', x: c.x, z: c.z, r: c.r, letter: c.letter, color: c.color, gps: tr === c.id });
      }
    }
    // Lasse's shop (once he has told you about it) and Kim's long jump
    if (this.known.has('verkstad') || this.done.has('verkstad')) T.push({ kind: 'contact', x: LASSE_SHOP.x, z: LASSE_SHOP.z, r: LASSE_SHOP.r, letter: '$', color: '#ffcf33', gps: tr === 'verkstad', mapOnly: this.done.has('verkstad') });
    if (this.isOpen('hopp')) T.push({ kind: 'contact', x: BY_ID.hopp.x, z: BY_ID.hopp.z, r: 2.5, letter: 'K', color: '#4aa8ff', gps: tr === 'hopp' });
    // tant Gun
    this.flag.targets(T, tr === 'flag');
  }

  // ---------------------------------------------------------------- the pizza car
  // keeps Sanna's car available at its stall: brought back when it is wrecked or left far away
  keepPizzaCar() {
    const g = this.game, p = g.player;
    if (this.active && this.active.id === 'pizza') return;
    const pz = g.pizzaCar, S = PIZZA_CAR;
    const hidden = (x, z) => Math.hypot(x - p.x, z - p.z) > 70 && !g.visible(x, z);
    const atStall = (v) => Math.hypot(v.x - S.x, v.z - S.z) < 3.5;
    if (!pz || pz.removed || pz.dead) {
      if (!hidden(S.x, S.z)) return;
      if (pz && !pz.removed && atStall(pz)) g.removeVehicle(pz); // a wreck in the stall
      if (!g.vehicles.some(atStall)) g.spawnPizzaCar();
    } else if (pz.driver === null && !atStall(pz) && Math.hypot(pz.x - S.x, pz.z - S.z) > 25 &&
      hidden(pz.x, pz.z) && hidden(S.x, S.z) && !g.vehicles.some((v) => v !== pz && atStall(v))) {
      this.parkPizzaCar(pz);
    }
  }

  parkPizzaCar(v) {
    const S = PIZZA_CAR, g = this.game;
    v.x = S.x; v.z = S.z; v.h = S.h;
    v.vx = v.vz = v.vy = v.w = 0; v.steer = 0; v.air = false; v.coastT = 0;
    v.y = g.world.groundHeight(S.x, S.z);
    v.input.throttle = 0; v.input.park = true;
    v.parkedSpot = true;
    v.repair();
  }

  // the pizza job needs the car near the pizzeria (or under the player)
  ensurePizzaCar() {
    const g = this.game, S = PIZZA_CAR;
    const pz = g.pizzaCar;
    if (pz && !pz.removed && !pz.dead) {
      if (pz.driver === 'player' || Math.hypot(pz.x - S.x, pz.z - S.z) < 60) return pz;
      if (pz.driver === null) { this.parkPizzaCar(pz); return pz; }
    }
    // clear the stall (a car someone left there) and bring a fresh one
    for (const v of [...g.vehicles]) {
      if (v.driver !== 'player' && Math.hypot(v.x - S.x, v.z - S.z) < 3.5) g.removeVehicle(v);
    }
    return g.spawnPizzaCar() || pz;
  }

  // ---------------------------------------------------------------- Lasse's tuning shop (v0.8)
  // walk or drive up to the first garage door: the shop opens (main.js shows it, the game waits)
  shopCheck() {
    const g = this.game, p = g.player;
    if (!(this.known.has('verkstad') || this.done.has('verkstad'))) return;
    const car = p.inCar ? p.car : null, T = car || p;
    const d = Math.hypot(T.x - LASSE_SHOP.x, T.z - LASSE_SHOP.z);
    if (d > LASSE_SHOP.r + 2) { this.shopArmed = true; return; }
    if (d > LASSE_SHOP.r || !this.shopArmed || (car && car.speed > 2.5) || p.frozen || this.active) return;
    if (p.state !== 'foot' && p.state !== 'car') return;
    this.shopArmed = false;
    if (car) { car.vx *= 0.2; car.vz *= 0.2; car.input.throttle = 0; }
    g.emit('shop', {});
  }

  shopItems() { return ITEMS.map((it) => ({ ...it, owned: this.upgrades.has(it.id), afford: this.game.money >= it.price })); }

  buy(id) {
    const g = this.game, it = ITEMS.find((q) => q.id === id);
    if (!it || this.upgrades.has(id)) return { ok: false, msg: 'Den har du redan.' };
    if (g.money < it.price) return { ok: false, msg: `Du har inte råd – ${it.name} kostar ${fmt(it.price)} kr.` };
    g.money -= it.price;
    this.upgrades.add(id);
    g.stats.bought = (g.stats.bought || 0) + 1;
    g.emit('money', { delta: -it.price, total: g.money });
    if (g.player.inCar) applyUpgrades(g.player.car, this.upgrades);
    const first = this.isOpen('verkstad');
    if (first) {
      this.completeQuest('verkstad', { title: 'SIDOUPPDRAG KLART', sub: 'Lasses trimning' });
      this.sms(WHO.lasse, 'Snyggt köpt! Pengarna du tjänar på uppdragen kan du alltid handla för här. Biltvätten på Macken lagar bucklor för 200 kr också.', 4);
    }
    g.emit('progress', {});
    const msgs = { turbo: 'Turbo monterad! Alla bilar du kör går nu fortare.', pansar: 'Krockskydd monterat! Bilarna du kör tål mer.', tuta: 'Melodituta installerad! Testa att tuta.' };
    return { ok: true, msg: msgs[id] };
  }

  // ---------------------------------------------------------------- Kim's long jump (v0.8)
  onStunt(e) {
    const g = this.game;
    if (e.dist > this.bestJump) this.bestJump = e.dist;
    if (!this.isOpen('hopp')) return;
    if (e.dist >= JUMP_GOAL) {
      g.stats.longJump = e.dist;
      this.later(2.2, () => {
        this.completeQuest('hopp', { title: 'SIDOUPPDRAG KLART', sub: `Långhoppet · ${e.dist} m`, amount: JUMP_REWARD });
        this.sms(WHO.kim, `${e.dist} meter?! Okej, jag erkänner. Du är Sjubys hoppkung.`, 4);
      });
    } else {
      const turbo = this.upgrades.has('turbo');
      this.later(2.4, () => g.emit('toast', { text: `${e.dist} m – Kim vill se ${JUMP_GOAL} m. ${turbo ? 'Ta längre sats!' : 'Ta längre sats – eller skaffa turbo hos Lasse!'}`, long: true }));
    }
    g.emit('progress', {});
  }

  // ---------------------------------------------------------------- side activities
  activities(dt) {
    const g = this.game, p = g.player;
    const car = p.inCar ? p.car : null;
    // stunt jumps
    for (const v of g.vehicles) {
      if (!v.landed) continue;
      const L = v.landed; v.landed = null;
      if (v !== car) continue;
      if (L.impact > 7) {
        v.damage((L.impact - 7) * 3);
        g.emit('crash', { x: v.x, z: v.z, impact: L.impact, player: true, landing: true });
      } else g.emit('land', { impact: L.impact });
      if (L.airTime > 0.75 && L.dist > 10) {
        const dist = Math.round(L.dist);
        const amount = Math.max(150, Math.round((dist * 18) / 50) * 50) + (g.stats.stuntJumps === 0 ? 500 : 0);
        g.stats.stuntJumps++;
        g.stats.bestJump = Math.max(g.stats.bestJump, dist);
        this.pay(amount, null, null);
        g.emit('stunt', { dist, air: L.airTime, amount });
      }
    }
    // car wash: stop inside to fix dents
    const w = CARWASH;
    const inside = car && !car.spec.bike && car.x > w.x0 && car.x < w.x1 && car.z > w.z0 && car.z < w.z1;
    if (inside) {
      if (!this.inWash) { this.inWash = true; this.washT = 0; this.washDone = false; }
      if (car.speed < 1.2 && !this.washDone) {
        this.washT += dt;
        if (this.washT > 0.4 && !this.washStarted) { this.washStarted = true; g.emit('wash', { on: true, car }); }
        if (this.washT > 2.4) {
          this.washDone = true; this.washStarted = false;
          g.emit('wash', { on: false, car });
          if (car.health >= 99.5) g.emit('toast', { text: 'Bilen är redan skinande ren!' });
          else if (g.money < w.cost) g.emit('toast', { text: `Tvätten kostar ${w.cost} kr – du har inte råd.` });
          else {
            car.repair();
            g.money -= w.cost;
            g.emit('money', { delta: -w.cost, total: g.money });
            g.emit('toast', { text: `Som ny! Bucklorna är borta. −${w.cost} kr` });
            g.stats.washes = (g.stats.washes || 0) + 1;
            g.emit('progress', {});
          }
        }
      }
    } else if (this.inWash) {
      this.inWash = false;
      if (this.washStarted) { this.washStarted = false; g.emit('wash', { on: false, car: null }); }
    }
  }

  // the action button, on foot: talk to Gun or pull the flag rope (before stealing cars)
  interact() {
    if (this.game.indoors.interact()) return true;
    if (this.active && this.active.interact && this.active.interact()) return true;
    return this.flag.interact();
  }
}

function colorName(car) {
  const names = { white: 'vit', black: 'svart', blue: 'blå', silver: 'silvergrå', yellow: 'gul', green: 'grön', lightblue: 'ljusblå', pizza: 'grön' };
  return names[car.paint] || 'inte röd';
}
