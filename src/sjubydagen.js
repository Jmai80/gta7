// Main quest, part 18: "Sjubydagen" (v1.18) – the last part of the first chapter. All of Sjuby celebrates. Tant Gun
// shows Arne's original recipe in the konditori's window for the first time, and Kexfabriken's director Viktor Knäck
// sells "Sjubykex efter originalrecept" from a stand on the square – his copy lacks only the last line, which Gun
// has never read either ("Läs den när du behöver den," Arne said).
//   1. The square: Gun, Knäck at his stand, Pia. The party opens at the chapel at twelve, like Gun and Arne's wedding.
//   2. Among the houses by the chapel on Söderholmen (any order): Mormor Signe's bunting is in her woodshed – fetch
//      it and hang it on three poles along the lane; kantor Folke's harmonium (1931) has to be carried from his
//      step to the chapel; Elsa's cat Måns has hidden under a big blue van on the car park – its driver is Ronny,
//      Jonte's cousin and Signe's grandson, who drives for Kexfabriken now.
//   3. Twelve o'clock: the bell from 1972, Folke plays, Signe sees Ronny. Knäck phones him – and Ingvar sees from
//      the lighthouse how Knäck walks out of the konditori with a frame under his arm. Birger: "Ta Spidern!"
//   4. The chase: the van waits for Knäck on Kungsgatan, then drives (it keeps just ahead of you) west along
//      Storgatan to the west bridge – shut since the beginning of the game. The barrier opens for it: Kexfabriken
//      owns the road. Kim and Bosse at the corner, Nova filming at the bridge, Ingvar on the radio.
//   5. Västerholmen (westisle.js): the van stops at Kexfabriken's docks, Knäck runs inside, Ronny stays. Inside
//      (kexhall.js) Knäck puts the recipe on biscuit line 1 and starts it. The emergency stop is on the far wall,
//      outside the belt's U – the way through the middle is a dead end. (Too late: Ronny pulls the plug at the
//      last second, and Knäck puts it back at the start – try again.) Pia comes. Knäck: the board in Stockholm …
//   6. Evening falls while you drive the recipe back to the square. Everyone is there. Gun reads the recipe – and
//      the last line, Arne's: then fireworks, the credits over the town, out to Västerholmen where a ship is coming
//      in to the quay: M/S Kardemumma. SLUT PÅ FÖRSTA KAPITLET. Fortsättning följer.
// A checkpoint is kept in stats.sjuby ({ at: 1, h } the houses, h: a bit each for Signe, Folke, Elsa; { at: 2 } the
// chase; { at: 3 } Kexfabriken; { at: 4 } the evening on the square).
import { WHO, CURB_H } from './config.js';
import { KEX } from './westisle.js';
import { FAB, FAB_DOOR, BELT, beltAt } from './kexhall.js';
import { SHED, SHED_DOOR } from './vedbod.js';
import { STYLE_BITS as ST } from './peds.js';
import { spawnPed, removePed, PIA_LOOK, RONNY_LOOK } from './hideout.js';
import { BENGT_LOOK, MAJKEN_LOOK } from './opening.js';
import { BAKE_LOOK } from './guldbullen.js';
import { GUN_LOOK } from './flag.js';
import { BIRGER_LOOK } from './homecoming.js';
import { SANDER_LOOK } from './fest.js';
import { SIGNE_LOOK, FOLKE_LOOK } from './kaffe.js';
import { ELSA_LOOK } from './flaskpost.js';
import { KNACK_LOOK } from './bullbageri.js';
import { NOVA_LOOK } from './concert.js';
import { FIA_LOOK, CUSTOMERS } from './barber.js';
import { YASMIN_LOOK, INGVAR_LOOK } from './livs.js';
import { SANNA_LOOK, PINO_LOOK } from './kitchen.js';
import { LOOK as MELKER_LOOK } from './samuel.js';
import { LEIF_LOOK } from './leif.js';
import { TOVE_LOOK, KIDS } from './beachhuts.js';
import { LOOKS as TIVOLI } from './tivolijobs.js';
import { Chaser } from './bikejob.js';
import { hidden, stand } from './skattjakt.js';
import { fmt } from './rng.js';

const INGA_LOOK = { shirt: 0x1d1f22, pants: 0x1d1f22, skin: 0xf0c8a8, hair: 0xc9c5bd, height: 0.98, bulk: 1.06, style: ST.bun | ST.glasses | ST.jacket, accent: 0xf4f4f0 };
const KIM_LOOK = CUSTOMERS.find((c) => c.id === 'kim').look;
const LASSE_LOOK = CUSTOMERS.find((c) => c.id === 'lasse').look;
const BOSSE_LOOK = KIDS.find((k) => k.id === 'bosse').look;

export const SJUBY = {
  // the square: Gun by the konditori's window (Arne's recipe on an easel), Knäck in his stand, Pia
  mark: { x: -6.0, z: 13.0, r: 1.7 },
  you: { x: -6.0, z: 13.6, h: -0.45 },
  gun: { x: -7.8, z: 16.7, h: Math.PI },
  knack: { x: -10.1, z: 15.3, h: 2.2 },              // he has come over from his stand to gloat
  stand: { x: -15.2, z: 10.6, h: Math.PI / 2 },      // (where he sells: render.js draws the stand)
  pia: { x: -5.5, z: 15.0, h: -2.0 },
  recipe: { x: -9.4, z: 18.15 },
  camIntro: { x: -8.4, y: 1.2, z: 15.6, cam: { x: -5.4, y: CURB_H + 5.0, z: 4.6, fov: 56 } },
  // Söderholmen: the three neighbours outside their garden gates in the lane, the shed, the poles, the harmonium
  // (inside their gardens by the gate, so the lane stays clear; you talk to them from the lane)
  signe: { x: -64.9, z: 260.4, h: Math.PI / 2 },
  folke: { x: -64.9, z: 229.8, h: Math.PI / 2 },
  elsa: { x: -64.9, z: 246.4, h: Math.PI / 2 },
  talk: { signe: { x: -62.8, z: 261.2 }, folke: { x: -62.8, z: 230.6 }, elsa: { x: -62.8, z: 247.0 } },
  talkR: 1.5,
  box: { x: SHED.room.x0 + 4.5, z: SHED.room.z0 + 2.5, r: 0.95 },         // the bunting, in a blue box in the shed
  poles: [{ x: -61.4, z: 238.2 }, { x: -61.4, z: 250.6 }, { x: -57.0, z: 230.0 }],
  poleR: 1.35,
  organ: { x: -65.9, z: 231.5, r: 1.1 },              // the harmonium on Folke's front step …
  organTo: { x: -54.0, z: 232.6, r: 1.3 },            // … to beside the chapel's door
  carry: 1.7,                                         // how fast you walk with it, m/s
  truck: { x: -38.5, z: 214.0, h: -Math.PI / 2 },     // Ronny's van on the chapel's car park, Måns under it
  ronny: { x: -38.6, z: 216.4, h: Math.PI },
  catR: 2.6,
  // twelve o'clock in front of the chapel
  bell: { x: -50.5, z: 230.2, r: 1.7 },
  bellYou: { x: -50.5, z: 229.9, h: 0 },
  spider: { x: -53.2, z: 222.4, h: Math.PI },         // Birger has come over in it
  birger: { x: -55.4, z: 222.6, h: Math.PI / 2 },
  chapel: [
    ['inga', -50.5, 233.3, Math.PI], ['gun', -48.2, 230.8, -2.4], ['signe', -46.9, 231.9, -1.9], ['elsa', -52.6, 230.6, 2.6],
    ['folke', -54.0, 231.5, 0.2],
  ],
  camBell: { x: -50.6, y: 1.9, z: 231.6, cam: { x: -44.0, y: CURB_H + 3.4, z: 224.6, fov: 58 } },
  // the chase
  kungs: { x: -37.5, z: 13.5, h: Math.PI },           // the van on Kungsgatan by the konditori's block, facing north
  spiderTown: { x: -37.5, z: 27.5, h: Math.PI },      // (after a reload: Birger has left the Spider behind it)
  kim: { x: -128.6, z: -49.6, h: -1.0 }, bosse: { x: -129.6, z: -48.4, h: -1.2 },
  nova: { x: -140.6, z: -48.6, h: -1.4 },
  go: 90,                                             // the van waits until you are this close
  lose: 320, loseT: 30,                               // too far behind for too long: it gets away
  gateAt: -140,                                       // the barrier opens when the van is west of here
  // Västerholmen: the van at the docks, Ronny beside it
  dock: KEX.truck,
  ronnyDock: { x: -296.4, z: -62.8, h: Math.PI / 2 },
  ronnyR: 1.8,
  // the evening on the square: the stage, the crowd in front of it
  stage: { x0: 10, z0: 4, x1: 20, z1: 12 },
  finale: { x: 11.4, z: 8.0, r: 2.0 },
  finYou: { x: 11.4, z: 8.0, h: Math.PI / 2 },
  gunStage: { x: 14.0, z: 8.0, h: -Math.PI / 2 },
  folkeStage: { x: 16.4, z: 5.6, h: -2.2 },
  camFinale: { x: 12.4, y: 1.45, z: 8.8, cam: { x: 17.4, y: CURB_H + 2.5, z: 1.8, fov: 58 } },
  crowd: [
    ['bengt', 11.4, 5.9, 1.4], ['dahl', 11.5, 6.95, 1.5], ['signe', 11.4, 9.1, 1.7], ['jonte', 11.5, 10.2, 1.8],
    ['majken', 10.0, 5.4, 1.3], ['inga', 10.1, 6.5, 1.5], ['ingvar', 10.0, 7.6, 1.6], ['elsa', 10.1, 8.7, 1.6], ['birger', 10.0, 9.8, 1.7], ['pia', 10.1, 10.9, 1.8],
    ['kim', 8.7, 6.0, 1.4], ['nova', 8.8, 7.0, 1.5], ['yasmin', 8.7, 8.1, 1.6], ['vera', 8.8, 9.2, 1.6], ['sanna', 8.7, 10.3, 1.7], ['ronny', 8.8, 11.4, 1.8],
    ['lasse', 7.5, 6.6, 1.5], ['melker', 7.4, 7.7, 1.6], ['leif', 7.5, 8.8, 1.6], ['rut', 7.4, 9.9, 1.7], ['pino', 7.5, 11.0, 1.7], ['tove', 7.4, 12.1, 1.8],
  ],
  show: 56,                                           // seconds of fireworks, credits and the flight to the quay
  pay: 10000,
};
const STEPS = ['houses', 'chase', 'fabrik', 'evening'];
const LOOK = {
  gun: GUN_LOOK, signe: SIGNE_LOOK, folke: FOLKE_LOOK, elsa: ELSA_LOOK, inga: INGA_LOOK, bengt: BENGT_LOOK, dahl: BAKE_LOOK, jonte: SANDER_LOOK,
  majken: MAJKEN_LOOK, ingvar: INGVAR_LOOK, birger: BIRGER_LOOK, pia: PIA_LOOK, kim: KIM_LOOK, nova: NOVA_LOOK, yasmin: YASMIN_LOOK, vera: FIA_LOOK,
  sanna: SANNA_LOOK, ronny: RONNY_LOOK, lasse: LASSE_LOOK, melker: MELKER_LOOK, leif: LEIF_LOOK, rut: TIVOLI.rut, pino: PINO_LOOK, tove: TOVE_LOOK,
  knack: KNACK_LOOK, bosse: BOSSE_LOOK,
};
const NPC = {
  gun: 'fest-gun', signe: 'signe', folke: 'folke', elsa: 'elsa', inga: 'inga', bengt: 'bengt-out', dahl: 'flask-dahl', jonte: 'sander', majken: 'majken',
  ingvar: 'fest-ingvar', birger: 'birger', pia: 'pia', kim: 'kim', nova: 'nova', yasmin: 'yasmin-out', vera: 'fia', sanna: 'sanna', ronny: 'ronny',
  lasse: 'lasse-out', melker: 'samuel-out', leif: 'leif', rut: 'rut', pino: 'pino', tove: 'tove', knack: 'knack', bosse: 'kid-bosse',
};
export const HOUSE_BITS = { signe: 1, folke: 2, elsa: 4 };

// the credits over the town, in the order they come up during the show (at t seconds)
export const CREDITS = [
  [12.5, 'GTA 7', 'Grovt Tillgrepp av Automobil'],
  [15.5, 'Tant Gun', 'och Arne, som bakade först'],
  [18.0, 'Bagar-Bengt · Direktör Dahlgren', 'Mormor Signe och Stora Bertha'],
  [20.5, 'Ingvar i fyren · Elsa och Måns', 'Kyrkoherde Inga · Kantor Folke'],
  [23.0, 'Polis-Pia · Jonte · Ronny', 'Birger och Sjuby Spider -62'],
  [25.5, 'Kim · Nova · Kimchi', 'Mjölnar-Majken · Yasmin · Vera · Sanna · Pino'],
  [28.0, 'Lasse · Lås-Leif · Melker', 'Tivoli-Rut · Livräddar-Tove · Ebbe'],
  [30.5, 'Viktor Knäck', 'Kexfabriken, Västerholmen'],
  [33.0, 'Och du.', 'Tack för att du hjälpte Sjuby.'],
  [42.0, 'SLUT PÅ FÖRSTA KAPITLET', ''],
  [48.5, 'Fortsättning följer ...', 'M/S Kardemumma har lagt till vid Västerholmen'],
];
// the camera through the show: [t, cam x, y, z, look x, y, z, fov] – a Catmull-Rom curve through them
const FLY = [
  [0, 2.0, 2.0, 9.0, 40.0, 17.0, 8.0, 66],
  [6, 1.0, 2.4, 10.6, 42.0, 24.0, 5.0, 66],
  [11, 3.0, 5.0, 14.5, 13.0, 2.0, 8.0, 60],
  [15, 17.0, 3.0, 15.0, 9.0, 1.6, 8.0, 58],
  [20, 15.0, 9.0, -2.0, 6.0, 1.5, 9.0, 58],
  [26, -30.0, 26.0, 2.0, -120.0, 4.0, -38.0, 58],
  [33, -128.0, 24.0, -26.0, -240.0, 4.0, -40.0, 58],
  [40, -226.0, 22.0, 2.0, -300.0, 3.0, 48.0, 56],
  [47, -262.0, 15.0, 30.0, -316.0, 4.0, 62.0, 54],
  [56, -276.0, 12.0, 38.0, -320.0, 5.0, 64.0, 52],
];
// the ship comes in to the quay during the show (x along the quay)
export const SHIP_IN = { t0: 24, t1: 46, x0: -470, x1: -322 };
export function shipX(t) { const u = Math.max(0, Math.min(1, (t - SHIP_IN.t0) / (SHIP_IN.t1 - SHIP_IN.t0))); const e = 1 - (1 - u) * (1 - u) * (1 - u); return SHIP_IN.x0 + (SHIP_IN.x1 - SHIP_IN.x0) * e; }
// the fireworks: rockets over the square, launched at fixed times (no random numbers from the game)
function fhash(i) { const s = Math.sin(i * 91.17 + 12.3) * 43758.5453; return s - Math.floor(s); }
export const ROCKETS = (() => {
  const out = [];
  let t = 0.6;
  for (let i = 0; t < 30; i++) {
    const big = i % 7 === 6;
    out.push({ t, x: 36 + fhash(i) * 30, z: -6 + fhash(i + 40) * 28, y: 34 + fhash(i + 80) * 24 + (big ? 8 : 0), up: 1.4 + fhash(i + 9) * 0.5, c: Math.floor(fhash(i + 17) * 6), big, seed: i });
    t += big ? 1.2 : 0.22 + fhash(i + 3) * 0.42;
  }
  return out;
})();

const GUN_T = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const KNACK = { who: 'Kexdirektör Knäck', letter: 'K', color: '#8a8f99' };
const PIA = { who: 'Polis-Pia', letter: 'P', color: '#2c4a7a' };
const PIA_R = { who: 'Polis-Pia (i radion)', letter: 'P', color: '#2c4a7a' };
const SIGNE = { who: 'Mormor Signe', letter: 'S', color: '#b5466a' };
const FOLKE = { who: 'Kantor Folke', letter: 'F', color: '#3d6a9a' };
const ELSA = { who: 'Elsa', letter: 'E', color: '#5f8a6a' };
const RONNY = { who: 'Ronny', letter: 'R', color: '#8a6a4a' };
const INGA = { who: 'Kyrkoherde Inga', letter: 'I', color: '#3a3c41' };
const INGVAR_R = { who: 'Ingvar (i radion)', letter: 'I', color: '#2b3d5c' };
const BIRGER = { who: 'Birger', letter: 'B', color: '#f08a3a' };
const BENGT = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const DAHL = { who: 'Direktör Dahlgren', letter: 'D', color: '#5a5f6b' };
const INGVAR = { who: 'Ingvar', letter: 'I', color: '#2b3d5c' };
const ARNE = { who: 'Arnes recept', letter: 'A', color: '#8a6a48', note: true };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };

export function introPages() {
  return [
    { ...GUN_T, text: 'Sjubydagen! Hela stan är här, lilla vän. Och titta i fönstret – Arnes recept. Originalet. Första gången jag visar det för någon.' },
    { ...KNACK, text: 'Sjubykex! Efter originalrecept! Fyrtio i paketet, tjugo kronor!' },
    { ...GUN_T, text: 'Hör på honom. Originalet står i mitt fönster.' },
    { ...KNACK, text: 'Min kopia är exakt. Nästan. Det saknas en rad längst ner – Dahlgrens kamera fick inte med den. Men vem läser den sista raden i ett recept?' },
    { ...GUN_T, text: 'Inte jag. Arne sa: ”Läs den när du behöver den.” Jag har aldrig behövt den.' },
    { ...PIA, text: 'Jag håller ett öga på kexdirektören. Han får sälja kex. Men inte mer.' },
    { ...GUN_T, text: 'Festen börjar vid kapellet på Söderholmen klockan tolv – med klockan från vårt bröllop. Men grannarna där ute behöver hjälp innan dess.' },
    { ...GUN_T, text: 'Signe har vimplar, Folke har sin tramporgel och Elsa … Elsa lät orolig i telefon. Åk dit, lilla vän. Jag kommer till kapellet sedan.', last: 'TILL SÖDERHOLMEN' },
  ];
}
export function signePages() {
  return [
    { ...SIGNE, text: 'Vimplarna! Jag har sytt dem sedan påsk – tre långa, i alla färger. Och nu kommer jag inte åt dem.' },
    { ...SIGNE, text: 'De ligger i den blå lådan i vedboden, bakom huset. Häng upp dem på stolparna längs gången till kapellet – tre stolpar.', last: 'TILL VEDBODEN' },
  ];
}
export function folkePages() {
  return [
    { ...FOLKE, text: 'Orgeln i kapellet hörs inte ute på gården. Så jag tar med min tramporgel. Från 1931.' },
    { ...FOLKE, text: 'Den står på trappan. Den är tung, och den låter som en ko om man tappar den. Bär den till kapellets dörr – försiktigt.', last: 'BÄR DEN' },
  ];
}
export function elsaPages() {
  return [
    { ...ELSA, text: 'Måns är borta! En stor blå lastbil tutade på parkeringen, och han smet ut genom grinden.' },
    { ...ELSA, text: 'Han gömmer sig alltid under bilar när han är rädd. Och den där lastbilen står fortfarande och brummar.', last: 'TILL LASTBILEN' },
  ];
}
export function ronnyPages() {
  return [
    { ...RONNY, text: 'Du igen. Från Birgers hus. Jag har slutat med cyklar, okej? Jag kör för Kexfabriken nu. Gratis kex till festen.' },
    { ...YOU, text: 'Elsas katt är under din bil. Han är rädd för motorn.' },
    { ...RONNY, fx: 'engine', text: '… En katt? Ja, ja. Jag stänger av. Och säg inget till mormor att jag är här. Hon tycker inte om kexdirektörer.', last: 'LOCKA PÅ MÅNS' },
  ];
}
export function bellPages() {
  return [
    { ...INGA, text: 'Klockan är tolv. Samma klocka som ringde när Gun och Arne kom ut ur kapellet, sommaren 1972.' },
    { ...INGA, fx: 'bell', text: 'Välkomna till Sjubydagen!' },
    { ...GUN_T, text: 'Jag hör den varje söndag. Men i dag låter den precis som då.' },
    { ...FOLKE, fx: 'organ', text: 'Och nu – Sjubyvalsen! På tramporgel, för första gången sedan 1974.' },
    { ...SIGNE, text: 'RONALD! Är det du som kör den där kexbilen?' },
    { ...RONNY, text: 'Hej mormor … Det är bara ett jobb.' },
    { ...RONNY, fx: 'phone', text: 'Det är chefen. ”Hämta mig vid torget. Nu direkt.” Jag … måste köra.' },
    { ...BIRGER, fx: 'ronnyGo', text: 'Bråttom, den där.' },
    { ...INGVAR_R, text: 'Ingvar här, i fyren. Jag ser torget i kikaren. Knäck kommer ut ur konditoriet – med en tavelram under armen!' },
    { ...GUN_T, text: 'Arnes recept!' },
    { ...PIA_R, text: 'Pia här. Han hoppar in i kexbilen på Kungsgatan. Jag spärrar Hamngatan och Skolgatan – kör efter honom!' },
    { ...BIRGER, text: 'Ta Spidern! Nycklarna sitter i. Kör som om den vore din egen – men inte riktigt.', last: 'KÖR' },
  ];
}
export function dockPages() {
  return [
    { ...RONNY, text: 'Jag visste inte! Han sa att det var en leverans. Han sprang in genom personalingången, rakt mot kexlinjen.' },
    { ...RONNY, text: 'Han har en nyckel till allt här. Bommen på bron också – Kexfabriken äger vägen sedan han köpte ön.' },
    { ...RONNY, text: 'Mormor kommer att döda mig. Gå in – jag ringer Pia.', last: 'IN I HALLEN' },
  ];
}
export function hallPages() {
  return [
    { ...KNACK, text: 'Snabb bil. Birgers, antar jag.' },
    { ...KNACK, text: 'Jag ville bara läsa den sista raden. Det är den som gör bullen – det måste det vara. Varför skulle man annars gömma den?' },
    { ...KNACK, text: 'Men den gamla gumman fick det att låta som om jag inte förtjänade den.' },
    { ...KNACK, fx: 'belt', text: 'Så nu får ingen den. Kexlinje ett. Om en halv minut är Arnes recept ett kex.' },
    { ...KNACK, text: 'Nödstoppet? Det sitter på andra sidan bandet. Lycka till.', last: 'STOPPA BANDET' },
  ];
}
export function caughtPages(tries) {
  return [
    { ...KNACK, text: tries > 1 ? 'Till slut. Ni ger inte upp, ni i Sjuby.' : 'Ni ger inte upp, ni i Sjuby.' },
    { ...PIA, text: 'Viktor Knäck. Du får följa med till stationen. Stöld av ett recept – det har jag aldrig skrivit förut.' },
    { ...RONNY, text: 'Och jag säger upp mig. Mormor behöver någon som kör ut bullar.' },
    { ...KNACK, text: 'Ni tror att det här tar slut med mig? Styrelsen i Stockholm har velat ha det receptet i femtio år. Långt innan mig.' },
    { ...PIA, text: 'Femtio år? Arne bakade ju inte förrän …' },
    { ...KNACK, text: 'Precis. Fråga er gamla tant var hennes Arne fick det ifrån.' },
    { ...PIA, text: 'Kör receptet till torget. Gun väntar – det börjar bli kväll.', last: 'TILL TORGET' },
  ];
}
export function finalePages(amount) {
  return [
    { ...GUN_T, text: 'Hör upp, allihop! Arnes recept är hemma igen. Och ni vet vem vi har att tacka.' },
    { ...GUN_T, text: 'Arne sa: ”Läs den sista raden när du behöver den.” Jag har inte behövt den på femtio år. Men i kväll tror jag att det är dags.' },
    { ...ARNE, text: 'Sjubybullen. 25 g jäst, 2½ dl mjölk, 75 g smör, ½ dl socker, 1 tsk kardemumma – stött, aldrig malen. 7 dl vetemjöl. Fyllning: smör, socker, kanel.' },
    { ...ARNE, text: 'PS. Gun – om du läser det här har du behövt det. Det finns ingen hemlighet i bullarna. Hemligheten är vem man bakar dem till. Baka till hela Sjuby. /Arne' },
    { ...GUN_T, text: '…' },
    { ...GUN_T, text: 'Han visste. Han visste att jag skulle stå här en dag.' },
    { ...BENGT, text: 'Då bakar vi till hela Sjuby. I morgon. Med Stora Bertha!' },
    { ...DAHL, text: 'Och jag diskar.' },
    { ...INGVAR, text: 'Och jag tänder fyren lite tidigare i kväll.' },
    { ...GUN_T, text: `Och du, lilla vän. ${fmt(amount)} kronor – och en bulle. Alltid en bulle. Titta nu upp!`, last: 'TITTA UPP' },
  ];
}

export function sjubySave(g) { return g.stats.sjuby && typeof g.stats.sjuby === 'object' ? g.stats.sjuby : null; }

// Gun, Knäck and Pia on the square while the quest is open (put there out of sight); the decorations are up while
// the quest is open or running; people left standing go home when nobody looks; the evening fades afterwards
export function sjubyWorld(mgr) {
  const g = mgr.game;
  const open = mgr.isOpen('sjuby'), job = mgr.active && mgr.active.id === 'sjuby' ? mgr.active : null;
  const c = mgr.jobs.find((q) => q.id === 'sjuby');
  const S = sjubySave(g);
  if (c) c.startOnAccept = !!(open && S && S.at > 0);
  const waiting = open && !(S && S.at > 0) && (!mgr.active || (job && job.stage === 'intro'));
  const K = SJUBY, F = mgr.sjubyFolk;
  if (waiting && !g.indoor && (!F || !F.every((q) => g.peds.list.includes(q))) && hidden(g, K.mark.x, K.mark.z)) {
    if (F) for (const q of F) removePed(g, q);
    mgr.sjubyFolk = [spawnPed(g, { ...GUN_LOOK }, K.gun.x, K.gun.z, K.gun.h, 'fest-gun'), spawnPed(g, { ...KNACK_LOOK }, K.knack.x, K.knack.z, K.knack.h, 'knack'), spawnPed(g, { ...PIA_LOOK }, K.pia.x, K.pia.z, K.pia.h, 'pia')];
  }
  if (!waiting && F && !job) { (mgr.sjubyLeft = mgr.sjubyLeft || []).push(...F); mgr.sjubyFolk = null; }
  if (mgr.sjubyLeft && mgr.sjubyLeft.length) mgr.sjubyLeft = mgr.sjubyLeft.filter((q) => { if (!g.peds.list.includes(q)) return false; if (g.indoor || hidden(g, q.x, q.z)) { removePed(g, q); return false; } return true; });
  if (mgr.sjubyCars && mgr.sjubyCars.length) mgr.sjubyCars = mgr.sjubyCars.filter((v) => { if (v.removed) return false; if (g.player.car !== v && (g.indoor || hidden(g, v.x, v.z))) { g.removeVehicle(v); return false; } return true; });
  // (render: the square's decorations, the recipe in the window, the ship at the quay)
  const up = !!(open || job);
  if (up !== mgr.sjubyUp) { mgr.sjubyUp = up; for (const q of g.layout.colliders) if (q.sjuby) q.h = up ? q.hUp : 0; }
  mgr.recipeHome = !(job && job.stolen);
  mgr.shipIn = mgr.done.has('sjuby');
  if (!job && g.dusk > 0) g.dusk = Math.max(0, g.dusk - 1 / 60 / 25);
}

export class SjubyJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'sjuby';
    // intro → houses (signe: talk → shed → hang; folke: talk → carry; elsa: talk → ronny → cat) → gather → bellTalk →
    // chase → yard → dockTalk → enter → hallTalk → belt → caughtTalk → out → home → finaleTalk → show → done
    this.stage = 'intro';
    this.prompt = null;
    this.titleCard = true;
    this.houses = 0;                               // the bits of HOUSE_BITS done
    this.signeAt = 'wait';                         // wait → talk → shed → hang → done
    this.folkeAt = 'wait';                         // wait → talk → carry → done
    this.elsaAt = 'wait';                          // wait → talk → ronny → ronnyTalk → cat → done
    this.hung = [false, false, false];
    this.carry = null;                             // 'vimplar' | 'orgel' | 'recept' (render: in your hands)
    this.organAt = 'step';                         // step → carried → chapel
    this.cat = null;                               // { x, z, h, state: 'hide' | 'run' | 'home' }
    this.truck = null; this.chaser = null; this.engine = true;
    this.stolen = false; this.gateOpen = false;
    this.beltOn = false; this.recipeS = 0; this.stopped = false; this.tries = 0;
    this.folk = null; this.house = null; this.chapelFolk = null; this.crowd = null; this.helpers = null; this.inside = null;
    this.showT = 0; this.credit = -1;
    this.said = {};
  }

  save(at) { const g = this.game; g.stats.sjuby = at === 1 ? { at, h: this.houses } : { at }; g.emit('progress', {}); }

  start() {
    const g = this.game, m = this.mgr, p = g.player, K = SJUBY;
    const S = sjubySave(g);
    if (S && S.at > 0 && S.at <= STEPS.length) { this.resume(S); return; }
    let F = m.sjubyFolk;
    if (!F || !F.every((q) => g.peds.list.includes(q))) {
      if (F) for (const q of F) removePed(g, q);
      F = [spawnPed(g, { ...GUN_LOOK }, K.gun.x, K.gun.z, K.gun.h, 'fest-gun'), spawnPed(g, { ...KNACK_LOOK }, K.knack.x, K.knack.z, K.knack.h, 'knack'), spawnPed(g, { ...PIA_LOOK }, K.pia.x, K.pia.z, K.pia.h, 'pia')];
    }
    this.folk = F; m.sjubyFolk = null;
    if (p.inCar) p.exitCar();
    p.frozen = true; p.vx = p.vz = 0;
    p.x = K.you.x; p.z = K.you.z; p.y = g.world.groundHeight(p.x, p.z); p.h = K.you.h;
    g.camFocus = { ...K.camIntro, owner: 'sjuby' };
    g.emit('sjuby', { kind: 'fanfare' });
    m.later(0.9, () => g.emit('talk', { id: this.id, pages: introPages() }), this);
  }

  resume(S) {
    const g = this.game, step = STEPS[S.at - 1];
    const say = (text) => g.emit('toast', { text: `Sjubydagen fortsätter: ${text}`, long: true });
    if (step === 'houses') {
      this.houses = S.h || 0;
      if (this.houses & HOUSE_BITS.signe) { this.signeAt = 'done'; this.hung = [true, true, true]; }
      if (this.houses & HOUSE_BITS.folke) { this.folkeAt = 'done'; this.organAt = 'chapel'; }
      if (this.houses & HOUSE_BITS.elsa) { this.elsaAt = 'done'; this.engine = false; }
      this.toHouses(); say('grannarna bland husen vid kapellet på Söderholmen.');
    } else if (step === 'chase') { this.hung = [true, true, true]; this.organAt = 'chapel'; this.stolen = true; this.toChase(true); say('kexbilen står på Kungsgatan – Spidern bakom den.'); }
    else if (step === 'fabrik') { this.stolen = true; this.gateOpen = true; this.toYard(true); say('Kexfabriken på Västerholmen – Ronny väntar vid lastkajen.'); }
    else { this.stolen = false; this.gateOpen = true; this.toHome(true); say('kvällen på torget – alla väntar vid scenen.'); }
  }

  // ---------------------------------------------------------------- 2. the houses by the chapel
  toHouses() {
    this.stage = 'houses';
    this.save(STEPS.indexOf('houses') + 1);
  }

  spawnHouse() {
    const g = this.game, K = SJUBY;
    if (!this.house) this.house = {};
    const H = this.house;
    const want = { signe: this.signeAt !== 'done', folke: this.folkeAt !== 'done', elsa: this.elsaAt !== 'done' };
    for (const id of ['signe', 'folke', 'elsa']) {
      if (!want[id] || (H[id] && g.peds.list.includes(H[id]))) continue;
      if (!hidden(g, K[id].x, K[id].z) && this.mgr.t > 1.0 && this.stageT > 0.5) continue;
      H[id] = spawnPed(g, { ...LOOK[id] }, K[id].x, K[id].z, K[id].h, NPC[id]);
    }
    if (!this.truck && this.stage === 'houses' && (hidden(g, K.truck.x, K.truck.z) || this.stageT < 0.6)) {
      const v = this.spawnTruck(K.truck.x, K.truck.z, K.truck.h);
      if (v) { this.ronny = spawnPed(g, { ...RONNY_LOOK }, K.ronny.x, K.ronny.z, K.ronny.h, 'ronny'); if (this.elsaAt !== 'done') this.cat = { state: 'hide', x: v.x, z: v.z, h: 0 }; }
    }
  }

  spawnTruck(x, z, h) {
    const g = this.game;
    for (const v of [...g.vehicles]) if (v !== g.player.car && Math.hypot(v.x - x, v.z - z) < 6) g.removeVehicle(v);
    g.makeRoom('van');
    const v = g.addVehicle('van', 'kex', x, z, h);
    if (!v) return null;
    v.parkedSpot = true; v.locked = true; v.armor = 3; v.kex = true;
    this.truck = v;
    return v;
  }

  housesStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, K = SJUBY, ind = g.indoors;
    if (ind.inside && ind.where === 'shed') {
      m.setObjective('Signes vimplar', this.carry === 'vimplar' ? 'Gå ut och häng upp dem' : 'Den blå lådan');
      if (this.signeAt === 'shed' && !this.carry && p.state === 'foot' && !p.frozen && Math.hypot(p.x - K.box.x, p.z - K.box.z) < K.box.r) this.prompt = 'TA';
      return;
    }
    if (ind.inside) return;
    this.spawnHouse();
    const foot = p.state === 'foot' && !p.frozen && !ind.busy;
    const near = (Q, r) => Math.hypot(p.x - Q.x, p.z - Q.z) < r;
    const H = this.house || {};
    // the three neighbours to talk to
    for (const id of ['signe', 'folke', 'elsa']) {
      if (this[id + 'At'] === 'wait' && H[id] && foot && near(K.talk[id], K.talkR)) { this.prompt = 'PRATA'; this.talkWho = id; break; }
    }
    // Signe: the shed, then the poles
    if (this.signeAt === 'shed' && foot && !this.carry && near(SHED_DOOR, SHED_DOOR.r)) this.prompt = 'GÅ IN';
    if (this.signeAt === 'shed' && this.carry === 'vimplar') this.signeAt = 'hang';
    if (this.signeAt === 'hang' && foot) {
      const k = K.poles.findIndex((q, i) => !this.hung[i] && near(q, K.poleR));
      if (k >= 0) { this.prompt = 'HÄNG UPP'; this.pole = k; }
    }
    // Folke: the harmonium from his step to the chapel
    if (this.folkeAt === 'talk' && this.organAt === 'step' && foot && !this.carry && near(K.organ, K.organ.r)) this.prompt = 'BÄR';
    if (this.carry === 'orgel') {
      p.carryMax = K.carry;
      if (foot && near(K.organTo, K.organTo.r)) this.prompt = 'SÄTT NER';
      if (p.inCar) this.dropOrgan(true);
    }
    // Elsa: Ronny by his van, then Måns
    if (this.elsaAt === 'ronny' && this.ronny && foot && near(this.ronny, SJUBY.ronnyR)) this.prompt = 'PRATA';
    if (this.elsaAt === 'cat' && this.cat && this.cat.state === 'hide' && foot && near(this.cat, K.catR)) this.prompt = 'LOCKA';
    this.moveCat(dt);
    // the objective: what is left
    const todo = [];
    if (this.signeAt !== 'done') todo.push(this.signeAt === 'wait' || this.signeAt === 'talk' ? 'Signe (rosa huset)' : this.signeAt === 'shed' ? 'vimplarna i vedboden' : `vimplarna, ${this.hung.filter(Boolean).length} av 3`);
    if (this.folkeAt !== 'done') todo.push(this.folkeAt === 'wait' ? 'Folke (vita huset)' : 'tramporgeln till kapellet');
    if (this.elsaAt !== 'done') todo.push(this.elsaAt === 'wait' ? 'Elsa (gröna huset)' : this.elsaAt === 'cat' ? 'Måns under lastbilen' : 'lastbilen på parkeringen');
    if (!todo.length) { this.toGather(); return; }
    const onS = p.z > 183;
    m.setObjective(this.carry === 'orgel' ? 'Bär tramporgeln till kapellet' : 'Hjälp grannarna vid kapellet', onS ? todo.join(' · ') : 'Över södra bron till Söderholmen');
  }

  interactHouses(pr) {
    const g = this.game, m = this.mgr, p = g.player, K = SJUBY;
    if (pr === 'PRATA' && this.elsaAt === 'ronny' && this.ronny && Math.hypot(p.x - this.ronny.x, p.z - this.ronny.z) < SJUBY.ronnyR) {
      this.elsaAt = 'ronnyTalk'; this.talkAt = 'ronny';
      p.frozen = true;
      const q = this.ronny;
      q.h = q.standH = Math.atan2(p.x - q.x, p.z - q.z);
      g.camFocus = { x: (p.x + q.x) / 2, y: 1.0, z: (p.z + q.z) / 2, yaw: Math.atan2(q.x - p.x, q.z - p.z) - 0.9, owner: 'sjuby', near: true, dist: 6, height: 2.6 };
      m.later(0.3, () => g.emit('talk', { id: this.id, pages: ronnyPages() }), this);
      return true;
    }
    if (pr === 'PRATA' && this.talkWho) {
      const id = this.talkWho, q = this.house && this.house[id];
      this[id + 'At'] = 'talk'; this.talkAt = id;
      p.frozen = true;
      if (q) q.h = q.standH = Math.atan2(p.x - q.x, p.z - q.z);
      g.camFocus = { x: (p.x + (q ? q.x : p.x)) / 2, y: 1.0, z: (p.z + (q ? q.z : p.z)) / 2, yaw: q ? Math.atan2(q.x - p.x, q.z - p.z) - 0.9 : undefined, owner: 'sjuby', near: true, dist: 6, height: 2.6 };
      const pages = id === 'signe' ? signePages() : id === 'folke' ? folkePages() : elsaPages();
      m.later(0.3, () => g.emit('talk', { id: this.id, pages }), this);
      return true;
    }
    if (pr === 'GÅ IN' && this.signeAt === 'shed') { g.indoors.enter(() => g.emit('toast', { text: 'Signes vedbod. Den blå lådan står vid huggkubben.' }), 'shed'); return true; }
    if (pr === 'TA' && this.signeAt === 'shed') { this.carry = 'vimplar'; g.emit('sjuby', { kind: 'take' }); g.emit('toast', { text: 'Tre långa vimplar, i alla färger. Ut till stolparna!' }); return true; }
    if (pr === 'HÄNG UPP' && this.pole != null) {
      this.hung[this.pole] = true;
      g.emit('sjuby', { kind: 'hang' });
      const n = this.hung.filter(Boolean).length;
      p.h = Math.atan2(K.poles[this.pole].x - p.x, K.poles[this.pole].z - p.z); p.body.pose = 1;
      if (n >= 3) {
        this.carry = null; this.signeAt = 'done'; this.houseDone('signe');
        const s = this.house && this.house.signe;
        if (s) g.emit('say', { who: s, text: 'Så fint! Precis som när jag var ung.' });
        g.emit('toast', { text: 'Vimplarna är uppe – hela vägen till kapellet.' });
      } else g.emit('toast', { text: `${n} av 3 vimplar uppe.` });
      return true;
    }
    if (pr === 'BÄR') { this.carry = 'orgel'; this.organAt = 'carried'; g.emit('sjuby', { kind: 'lift' }); g.emit('toast', { text: 'Tung! Gå försiktigt till kapellets dörr.' }); return true; }
    if (pr === 'SÄTT NER') { this.dropOrgan(false); return true; }
    if (pr === 'LOCKA') {
      const c = this.cat;
      c.state = 'run'; c.t = 0;
      g.emit('sjuby', { kind: 'cat' });
      g.emit('toast', { text: 'Pss pss pss … Måns kikar fram – och springer hem till Elsa.' });
      return true;
    }
    return false;
  }

  dropOrgan(lost) {
    const g = this.game, p = g.player;
    p.carryMax = null;
    this.carry = null;
    if (lost) { this.organAt = 'step'; g.emit('toast', { text: 'Du kan inte köra med tramporgeln. Folke bär tillbaka den till trappan.' }); return; }
    this.organAt = 'chapel'; this.folkeAt = 'done';
    g.emit('sjuby', { kind: 'set' });
    const f = this.house && this.house.folke;
    if (f) { f.goto([[-65.0, 231.5], [-62.6, 231.5], [-60.5, 231.2], [SJUBY.organTo.x, SJUBY.organTo.z - 1.1]], 1.2, 0); g.emit('say', { who: f, text: 'Hel! Inte en ton ur stämning. Nåja – inte fler än förut.' }); }
    this.houseDone('folke');
  }

  // Måns: out from under the van, home to Elsa at her gate (and in through it)
  moveCat(dt) {
    const c = this.cat, g = this.game;
    if (!c) return;
    const v = this.truck;
    if (c.state === 'hide' && v && !v.removed) { const s = v.local(0.25, -0.4); c.x = s.x; c.z = s.z; c.h = v.h + 0.5; return; }
    if (c.state !== 'run') return;
    c.t += dt;
    const path = [[-46.0, 224.0], [-58.6, 229.0], [-62.2, 236.0], [-62.6, 246.6], [-64.6, 247.5], [-65.6, 247.2]];
    c.i = c.i || 0;
    const T = path[c.i], dx = T[0] - c.x, dz = T[1] - c.z, d = Math.hypot(dx, dz), sp = 4.2;
    if (d < 0.3) { c.i++; if (c.i >= path.length) { c.state = 'home'; this.catHome(); } return; }
    c.x += (dx / d) * Math.min(d, sp * dt); c.z += (dz / d) * Math.min(d, sp * dt); c.h = Math.atan2(dx, dz);
    void g;
  }

  catHome() {
    const g = this.game, e = this.house && this.house.elsa;
    this.elsaAt = 'done';
    if (e) g.emit('say', { who: e, text: 'Måns! Din stackars rädda katt. Kom, vi går in.' });
    g.emit('toast', { text: 'Måns är hemma hos Elsa.' });
    this.houseDone('elsa');
  }

  houseDone(id) {
    this.houses |= HOUSE_BITS[id];
    this.save(STEPS.indexOf('houses') + 1);
    this.game.emit('sjuby', { kind: 'done' });
  }

  // ---------------------------------------------------------------- 3. twelve o'clock at the chapel
  toGather() {
    const g = this.game;
    this.stage = 'gather';
    g.emit('toast', { text: 'Klockan är snart tolv. Alla samlas framför kapellet!', long: true });
  }

  gatherStep() {
    const g = this.game, m = this.mgr, p = g.player, K = SJUBY;
    const d = Math.hypot(p.x - K.bell.x, p.z - K.bell.z);
    m.setObjective('Klockan tolv vid kapellet', d < 30 ? 'Ställ dig framför tornet' : 'Söderholmens kapell');
    this.spawnHouse();
    if (p.state === 'foot' && !p.frozen && !g.indoors.busy && d < K.bell.r) this.startBell();
  }

  startBell() {
    const g = this.game, m = this.mgr, p = g.player, K = SJUBY;
    this.stage = 'bellTalk';
    p.frozen = true; p.vx = p.vz = 0; p.carryMax = null;
    p.x = K.bellYou.x; p.z = K.bellYou.z; p.y = g.world.groundHeight(p.x, p.z); p.h = K.bellYou.h;
    // everyone in front of the chapel (the cut to the fixed camera hides them arriving)
    this.removeHouse();
    this.chapelFolk = K.chapel.map(([id, x, z, h]) => spawnPed(g, { ...LOOK[id] }, x, z, h, NPC[id]));
    this.birger = spawnPed(g, { ...BIRGER_LOOK }, K.birger.x, K.birger.z, K.birger.h, 'birger');
    this.holdSpider = true;
    if (g.player.car !== g.spider) g.spawnSpider(K.spider.x, K.spider.z, K.spider.h);
    if (!this.truck) { const v = this.spawnTruck(K.truck.x, K.truck.z, K.truck.h); if (v && !this.ronny) this.ronny = spawnPed(g, { ...RONNY_LOOK }, K.ronny.x, K.ronny.z, K.ronny.h, 'ronny'); }
    this.cat = null;
    g.camFocus = { ...K.camBell, owner: 'sjuby' };
    m.later(0.9, () => g.emit('talk', { id: this.id, pages: bellPages() }), this);
  }

  removeHouse() {
    const g = this.game;
    if (this.house) for (const q of Object.values(this.house)) removePed(g, q);
    this.house = null;
  }

  // ---------------------------------------------------------------- 4. the chase
  toChase(reload) {
    const g = this.game, K = SJUBY;
    this.stage = 'chase';
    this.stolen = true;
    this.save(STEPS.indexOf('chase') + 1);
    this.chaseT = 0; this.farT = 0; this.moving = false; this.said = {};
    if (reload) {
      if (this.truck && !this.truck.removed && this.truck !== g.player.car) g.removeVehicle(this.truck);
      this.truck = null;
      this.placeTruckTown();
      if (g.player.car !== g.spider) g.spawnSpider(K.spiderTown.x, K.spiderTown.z, K.spiderTown.h);
      this.holdSpider = true;
    }
  }

  // the van at the konditori's block, waiting for Knäck (out of sight it simply is there)
  placeTruckTown() {
    const g = this.game, K = SJUBY;
    if (this.truck && !this.truck.removed) {
      const v = this.truck;
      if (this.chaser) { this.chaser.release(); this.chaser = null; }
      v.x = K.kungs.x; v.z = K.kungs.z; v.h = K.kungs.h; v.vx = v.vz = v.w = 0; v.steer = 0; v.y = g.world.groundHeight(v.x, v.z);
      v.input.throttle = 0; v.input.park = true; v.driver = null;
    } else this.spawnTruck(K.kungs.x, K.kungs.z, K.kungs.h);
    if (this.truck) this.truck.locked = true;
    this.inTown = true;
  }

  chaseStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, K = SJUBY;
    this.chaseT += dt;
    let v = this.truck;
    // Ronny drives off from the chapel; out of sight the van is at the square, Knäck on board
    if (!this.inTown) {
      if (!v || v.removed || hidden(g, v.x, v.z) || this.chaseT > 25) { this.placeTruckTown(); v = this.truck; }
    }
    if (!v || v.removed) { m.fail(this, 'Kexbilen försvann', [WHO.pia, 'Kexbilen försvann ur sikte. Vi börjar om vid torget – den står kvar på Kungsgatan.']); return; }
    const T = p.inCar ? p.car : p, d = Math.hypot(v.x - T.x, v.z - T.z);
    this.helpersUp();
    if (this.inTown && !this.moving) {
      if (d < K.go) this.goTruck();
      m.setObjective('Kör efter kexbilen', d < 140 ? `Den står på Kungsgatan vid konditoriet · ${Math.round(d)} m` : p.z > 140 ? 'Över södra bron – kexbilen är vid torget' : 'Kexbilen står på Kungsgatan vid konditoriet');
      return;
    }
    if (!this.moving) return;
    // keep just ahead of you; slow down for the yard
    const C = this.chaser, toDock = Math.hypot(v.x - K.dock.x, v.z - K.dock.z);
    if (C) {
      C.vMax = d < 35 ? 15.5 : d < 70 ? 12.5 : d < 110 ? 8.5 : 0;
      if (toDock < 30) C.vMax = Math.min(C.vMax || 4, Math.max(2.2, toDock * 0.45));
    }
    if (!this.gateOpen && v.x < K.gateAt) { this.gateOpen = true; g.emit('sjuby', { kind: 'gate' }); g.emit('toast', { text: 'Bommen går upp! Kexfabriken har nyckel till västra bron.', long: true }); m.sms(WHO.ingvar, 'Bommen gick upp! Han kör ut på Västerholmen. Ingen har varit där sedan Kexfabriken köpte ön.', 1.2, this); }
    this.radio(v);
    if (toDock < 3.2 && v.speed < 1.5) { this.arrive(); return; }
    this.farT = d > K.lose ? this.farT + dt : 0;
    if (this.farT > K.loseT) { m.fail(this, 'Kexbilen kom undan', [WHO.pia, 'Den kom undan – men jag vet vart den skulle. Börja om vid torget, kexbilen står kvar på Kungsgatan.']); return; }
    const where = v.x < -232 ? 'på Västerholmen' : v.x < -125 ? 'på västra bron' : v.z < -30 ? 'på Storgatan, västerut' : 'på Kungsgatan, norrut';
    m.setObjective('Följ efter kexbilen', `${where} · ${d > 110 ? 'den väntar på dig' : `${Math.round(d)} m`}`);
  }

  goTruck() {
    const g = this.game, m = this.mgr, v = this.truck;
    this.moving = true;
    v.locked = true;
    this.chaser = new Chaser(g, v, { vMax: 12, burst: 0, polite: true });
    this.chaser.goal = { x: SJUBY.dock.x, z: SJUBY.dock.z, vx: 0, vz: 0, ref: null };
    g.racers.push(this.chaser);
    g.emit('sjuby', { kind: 'horn' });
    m.sms(WHO.ingvar, 'Den rullar! Kungsgatan norrut. Jag ser er båda från fyren.', 0.6, this);
  }

  radio(v) {
    const m = this.mgr, s = this.said;
    if (!s.storgatan && v.z < -32 && v.x < -46) { s.storgatan = true; m.sms(WHO.ingvar, 'Han svänger in på Storgatan. Västerut! Mot västra bron – den som alltid är stängd.', 0.2, this); }
    if (!s.kim && v.x < -96) { s.kim = true; m.sms(WHO.kim, 'Kim här! Bosse och jag står vid Västra Ringvägen. Han kör rakt mot bron!', 0.2, this); const k = this.helpers && this.helpers[0]; if (k) this.game.emit('say', { who: k, text: 'DÄR! Kör, kör!' }); }
    if (!s.nova && v.x < -128) { s.nova = true; const n = this.helpers && this.helpers[2]; if (n) this.game.emit('say', { who: n, text: 'Jag filmar allt!!' }); }
  }

  // Kim and Bosse at the corner, Nova by the bridge (put there out of sight)
  helpersUp() {
    const g = this.game, K = SJUBY;
    if (this.helpers) return;
    if (!hidden(g, K.kim.x, K.kim.z) || !hidden(g, K.nova.x, K.nova.z)) return;
    this.helpers = [spawnPed(g, { ...KIM_LOOK }, K.kim.x, K.kim.z, K.kim.h, 'kim'), spawnPed(g, { ...BOSSE_LOOK }, K.bosse.x, K.bosse.z, K.bosse.h, 'kid-bosse'), spawnPed(g, { ...NOVA_LOOK }, K.nova.x, K.nova.z, K.nova.h, 'nova')];
  }

  arrive() {
    const g = this.game, v = this.truck;
    if (this.chaser) { this.chaser.retire(false); this.chaser = null; }
    v.input.throttle = 0; v.input.park = true; v.vx = v.vz = v.w = 0; v.locked = true;
    g.emit('toast', { text: 'Kexbilen stannar vid lastkajen. Knäck springer in i hallen!', long: true });
    // Knäck runs for the staff door, Ronny gets out
    const s = v.local(-1.6, 1.0);
    const kn = spawnPed(g, { ...KNACK_LOOK }, s.x, s.z, v.h, 'knack');
    kn.goto([[KEX.door.x + 1.4, KEX.door.z - 1.5], [KEX.door.x + 0.5, KEX.door.z]], 4.6);
    this.runner = kn;
    this.toYard(false);
  }

  // ---------------------------------------------------------------- 5. Kexfabriken
  toYard(reload) {
    const g = this.game, K = SJUBY;
    this.stage = 'yard';
    this.stolen = true; this.gateOpen = true;
    this.save(STEPS.indexOf('fabrik') + 1);
    if (reload) {
      this.spawnTruck(K.dock.x, K.dock.z, K.dock.h);
      if (g.player.car !== g.spider) g.spawnSpider(K.spiderTown.x, K.spiderTown.z, K.spiderTown.h);
    }
    if (!this.ronny || !g.peds.list.includes(this.ronny)) this.ronny = spawnPed(g, { ...RONNY_LOOK }, K.ronnyDock.x, K.ronnyDock.z, K.ronnyDock.h, 'ronny');
    else stand(g, this.ronny, K.ronnyDock.x, K.ronnyDock.z, K.ronnyDock.h);
    this.holdSpider = true;
  }

  yardStep() {
    const g = this.game, m = this.mgr, p = g.player, K = SJUBY, ind = g.indoors;
    if (this.runner && (this.runner.arrived || !g.peds.list.includes(this.runner))) { removePed(g, this.runner); this.runner = null; }
    if (!this.ronny || !g.peds.list.includes(this.ronny)) { if (hidden(g, K.ronnyDock.x, K.ronnyDock.z)) this.ronny = spawnPed(g, { ...RONNY_LOOK }, K.ronnyDock.x, K.ronnyDock.z, K.ronnyDock.h, 'ronny'); }
    const d = Math.hypot(p.x - K.ronnyDock.x, p.z - K.ronnyDock.z);
    if (this.stage === 'yard') {
      m.setObjective(d < 40 ? 'Prata med Ronny vid lastkajen' : 'Till Kexfabriken', d < 40 ? (p.inCar ? 'Kliv ur' : 'Ronny står vid kexbilen') : p.x < -232 ? 'Grinden rakt fram från bron' : 'Västra bron, i slutet av Storgatan');
      if (this.ronny && p.state === 'foot' && !p.frozen && !ind.busy && Math.hypot(p.x - this.ronny.x, p.z - this.ronny.z) < K.ronnyR) this.prompt = 'PRATA';
    } else if (this.stage === 'enter') {
      const dd = Math.hypot(p.x - FAB_DOOR.x, p.z - FAB_DOOR.z);
      m.setObjective('In i hallen', dd < 40 ? 'Personalingången söder om lastkajen' : 'Kexfabriken på Västerholmen');
      if (p.state === 'foot' && !p.frozen && !ind.busy && dd < FAB_DOOR.r) this.prompt = 'GÅ IN';
    }
  }

  dockTalk() {
    const g = this.game, m = this.mgr, p = g.player, q = this.ronny;
    this.stage = 'dockTalk';
    p.frozen = true;
    if (q) q.h = q.standH = Math.atan2(p.x - q.x, p.z - q.z);
    g.camFocus = { x: (p.x + q.x) / 2, y: 1.0, z: (p.z + q.z) / 2, yaw: Math.atan2(q.x - p.x, q.z - p.z) - 0.9, owner: 'sjuby', near: true, dist: 6.4, height: 2.8 };
    m.later(0.3, () => g.emit('talk', { id: this.id, pages: dockPages() }), this);
  }

  enterHall() {
    const g = this.game;
    this.stage = 'entering';
    g.indoors.enter(() => this.hallTalk(), 'fabrik');
  }

  spawnInside() {
    const g = this.game;
    this.removeInside();
    this.inside = { knack: spawnPed(g, { ...KNACK_LOOK }, FAB.knack.x, FAB.knack.z, FAB.knack.h, 'knack') };
  }
  removeInside() { const g = this.game; if (this.inside) for (const q of Object.values(this.inside)) removePed(g, q); this.inside = null; }

  hallTalk() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'hallTalk';
    this.spawnInside();
    this.recipeS = 0; this.beltOn = false; this.stopped = false;
    p.frozen = true;
    g.camFocus = { ...FAB.camTalk, owner: 'sjuby' };
    g.emit('toast', { text: 'Kexfabriken. Det luktar vanilj och maskinolja.' });
    m.later(0.9, () => g.emit('talk', { id: this.id, pages: hallPages() }), this);
  }

  startBelt() {
    const g = this.game;
    this.beltOn = true; this.stopped = false; this.recipeS = 0; this.tries++;
    g.emit('sjuby', { kind: 'belt' });
  }

  beltStep(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.beltOn && !this.stopped) {
      this.recipeS += FAB.speed * dt;
      if (this.recipeS >= BELT.len - 0.3) { this.tooLate(); return; }
    }
    const left = Math.max(0, (BELT.len - this.recipeS) / FAB.speed);
    const foot = p.state === 'foot' && !p.frozen;
    if (!this.stopped) {
      m.setObjective('Stoppa bandet!', `NÖDSTOPPET sitter på västra väggen · ${Math.ceil(left)} s kvar till ugnen`);
      if (foot && Math.hypot(p.x - FAB.stop.x, p.z - FAB.stop.z) < FAB.stop.r) this.prompt = 'NÖDSTOPP';
      if (left < 6 && !this.said['hot' + this.tries]) { this.said['hot' + this.tries] = true; g.emit('sjuby', { kind: 'warn' }); }
    } else {
      const R = beltAt(this.recipeS);
      m.setObjective('Ta receptet', 'Det ligger kvar på bandet');
      if (foot && Math.hypot(p.x - R.x, p.z - R.z) < 1.45) this.prompt = 'TA RECEPTET';
    }
  }

  tooLate() {
    const g = this.game, k = this.inside && this.inside.knack;
    this.beltOn = false; this.recipeS = 0;
    g.emit('sjuby', { kind: 'plug' });
    g.emit('toast', { text: 'Ronny drog ur sladden till ugnen i sista sekunden! Knäck lägger receptet på bandet igen …', long: true });
    if (k) g.emit('say', { who: k, text: 'En gång till, då.' });
    this.mgr.later(2.6, () => { if (this.stage === 'belt') { this.startBelt(); g.emit('toast', { text: 'Bandet går igen. Nödstoppet – på andra sidan!' }); } }, this);
  }

  pressStop() {
    const g = this.game, p = g.player;
    this.stopped = true;
    p.h = -Math.PI / 2; p.body.pose = 1;
    g.stats.sjubyLeft = Math.max(0, Math.round((BELT.len - this.recipeS) / FAB.speed));
    g.stats.sjubyTries = this.tries;
    g.emit('sjuby', { kind: 'stop' });
    g.emit('toast', { text: `NÖDSTOPP! Bandet står still – ${g.stats.sjubyLeft} sekunder från ugnen.` });
  }

  takeRecipe() {
    const g = this.game, m = this.mgr, p = g.player;
    this.stage = 'caughtTalk';
    this.carry = 'recept'; this.beltOn = false;
    g.emit('sjuby', { kind: 'take' });
    p.frozen = true;
    // Pia and Ronny come in; Knäck sits down
    const k = this.inside && this.inside.knack;
    if (k) stand(g, k, FAB.knackAfter.x, FAB.knackAfter.z, FAB.knackAfter.h);
    this.inside.pia = spawnPed(g, { ...PIA_LOOK }, FAB.pia.x, FAB.pia.z, FAB.pia.h, 'pia');
    this.inside.ronny = spawnPed(g, { ...RONNY_LOOK }, FAB.ronny.x, FAB.ronny.z, FAB.ronny.h, 'ronny');
    p.x = FAB.youAfter.x; p.z = FAB.youAfter.z; p.h = FAB.youAfter.h; p.vx = p.vz = 0;
    g.camFocus = { ...FAB.camCaught, owner: 'sjuby' };
    m.later(0.8, () => g.emit('talk', { id: this.id, pages: caughtPages(this.tries) }), this);
  }

  // ---------------------------------------------------------------- 6. the evening on the square
  toHome(reload) {
    const g = this.game;
    this.stage = 'home';
    this.stolen = false; this.carry = 'recept'; this.gateOpen = true;
    this.homeT = 0;
    this.save(STEPS.indexOf('evening') + 1);
    if (reload && g.dusk == null) g.dusk = 0;
  }

  homeStep(dt) {
    const g = this.game, m = this.mgr, p = g.player, K = SJUBY, ind = g.indoors;
    if (ind.inside) { m.setObjective('Till torget med receptet', 'Gå ut ur hallen'); return; }
    this.removeInside();
    this.homeT += dt;
    g.dusk = Math.min(1, Math.max(g.dusk || 0, this.homeT / 50));
    if (!this.crowd && (hidden(g, K.finale.x, K.finale.z) || Math.hypot(p.x - K.finale.x, p.z - K.finale.z) > 60)) this.spawnCrowd();
    const at = p.inCar ? p.car : p, d = Math.hypot(at.x - K.finale.x, at.z - K.finale.z);
    m.setObjective('Till torget med receptet', d < 40 ? (p.inCar ? 'Kliv ur – alla väntar vid scenen' : 'Ställ dig framför scenen') : at.x < -232 ? 'Över västra bron, Storgatan österut' : 'Hela Sjuby väntar på torget');
    if (this.crowd && p.state === 'foot' && !p.frozen && d < K.finale.r) this.startFinale();
  }

  spawnCrowd() {
    const g = this.game, K = SJUBY;
    this.crowd = K.crowd.map(([id, x, z, h]) => spawnPed(g, { ...LOOK[id] }, x, z, h, NPC[id]));
    this.crowd.push(spawnPed(g, { ...GUN_LOOK }, K.gunStage.x, K.gunStage.z, K.gunStage.h, 'fest-gun'));
    this.crowd.push(spawnPed(g, { ...FOLKE_LOOK }, K.folkeStage.x, K.folkeStage.z, K.folkeStage.h, 'folke'));
  }

  startFinale() {
    const g = this.game, m = this.mgr, p = g.player, K = SJUBY;
    this.stage = 'finaleTalk';
    p.frozen = true; p.vx = p.vz = 0;
    p.x = K.finYou.x; p.z = K.finYou.z; p.y = g.world.groundHeight(p.x, p.z); p.h = K.finYou.h;
    this.carry = null; this.given = false;
    g.dusk = 1;
    g.emit('sjuby', { kind: 'cheer' });
    g.camFocus = { ...K.camFinale, owner: 'sjuby' };
    m.later(1.0, () => g.emit('talk', { id: this.id, pages: finalePages(K.pay) }), this);
  }

  startShow() {
    const g = this.game;
    this.stage = 'show'; this.showT = 0; this.credit = -1; this.boomed = 0;
    g.player.frozen = true;
    g.emit('cinema', { on: true });
    this.showStep(0);
  }

  // fireworks, then the camera flies over the crowd and the town and out to Västerholmen while the credits roll
  showStep(dt) {
    const g = this.game, K = SJUBY;
    this.showT += dt;
    const t = this.showT;
    // the rockets' bangs (render.js draws them from ROCKETS and the time)
    while (this.boomed < ROCKETS.length && ROCKETS[this.boomed].t + ROCKETS[this.boomed].up <= t) { g.emit('sjuby', { kind: ROCKETS[this.boomed].big ? 'bigboom' : 'boom' }); this.boomed++; }
    if (this.credit + 1 < CREDITS.length && t >= CREDITS[this.credit + 1][0]) { this.credit++; const [, title, sub] = CREDITS[this.credit]; g.emit('credits', { title, sub, last: this.credit === CREDITS.length - 1 }); }
    const c = flyAt(t);
    g.camFocus = { x: c.lx, y: c.ly, z: c.lz, owner: 'sjuby', cam: { x: c.x, y: c.y, z: c.z, fov: c.fov } };
    if (t >= K.show) this.finish();
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    g.stats.sjuby = { at: STEPS.length + 1 };
    g.emit('cinema', { on: false });
    g.emit('credits', { title: '', sub: '' });
    if (this.crowd) { (m.sjubyLeft = m.sjubyLeft || []).push(...this.crowd); this.crowd = null; }
    m.complete(this, { title: 'SLUT PÅ FÖRSTA KAPITLET', sub: 'Sjubydagen', amount: SJUBY.pay });
    m.sms(WHO.anon, 'Fina bullar. Men fråga Gun var Arne fick receptet ifrån. M/S Kardemumma ligger vid kajen på Västerholmen. Vi ses. /En gammal vän', 75, null);
  }

  // ---------------------------------------------------------------- talks
  talkFx(fx) {
    const g = this.game;
    if (fx === 'bell') g.emit('sjuby', { kind: 'bell' });
    if (fx === 'organ') g.emit('sjuby', { kind: 'valsen' });
    if (fx === 'phone') g.emit('sjuby', { kind: 'phone' });
    if (fx === 'engine') { this.engine = false; g.emit('sjuby', { kind: 'engine' }); }
    if (fx === 'belt') this.startBelt();
    if (fx === 'ronnyGo') {
      const v = this.truck;
      if (this.ronny) { removePed(g, this.ronny); this.ronny = null; }
      if (v && !v.removed) {
        this.chaser = new Chaser(g, v, { vMax: 9, burst: 0, polite: true });
        this.chaser.goal = { x: SJUBY.kungs.x, z: SJUBY.kungs.z, vx: 0, vz: 0, ref: null };
        g.racers.push(this.chaser);
        g.emit('sjuby', { kind: 'horn' });
      }
    }
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'sjuby') g.camFocus = null; };
    switch (this.stage) {
      case 'intro': free(); this.toHouses(); this.stageT = 0;
        if (this.folk) { (m.sjubyLeft = m.sjubyLeft || []).push(...this.folk); this.folk = null; }
        g.emit('toast', { text: 'Till Söderholmen: Signe, Folke och Elsa bor i husen vid kapellet.', long: true });
        return;
      case 'houses': free();
        if (this.talkAt === 'signe') { this.signeAt = 'shed'; g.emit('toast', { text: 'Vedboden står bakom Signes hus – dörren mot söder.' }); }
        if (this.talkAt === 'folke') this.folkeAt = 'talk';
        if (this.talkAt === 'elsa') { this.elsaAt = 'ronny'; g.emit('toast', { text: 'Lastbilen står på kapellets parkering.' }); }
        if (this.talkAt === 'ronny') { this.elsaAt = 'cat'; m.later(0.8, () => g.emit('hint', { id: 'sjuby-cat', touch: 'Gå fram till lastbilen och tryck LOCKA.', keys: 'Gå fram till lastbilen och tryck E.' }), this); }
        this.talkAt = null;
        return;
      case 'bellTalk': free(); this.toChase(false);
        if (this.chapelFolk) { (m.sjubyLeft = m.sjubyLeft || []).push(...this.chapelFolk); this.chapelFolk = null; }
        if (this.birger) { (m.sjubyLeft = m.sjubyLeft || []).push(this.birger); this.birger = null; }
        m.later(0.6, () => g.emit('hint', { id: 'sjuby-chase', touch: 'Spidern står på parkeringen. Kör efter kexbilen – den håller sig strax framför dig.', keys: 'Spidern står på parkeringen. Kör efter kexbilen – den håller sig strax framför dig.' }), this);
        return;
      case 'dockTalk': free(); this.stage = 'enter'; return;
      case 'hallTalk': free(); this.stage = 'belt';
        g.camFocus = null;
        m.later(0.4, () => g.emit('hint', { id: 'sjuby-belt', touch: 'Spring till NÖDSTOPPET på västra väggen innan receptet når ugnen. Bandet är i vägen – gå runt!', keys: 'Spring till NÖDSTOPPET på västra väggen innan receptet når ugnen. Bandet är i vägen – gå runt!' }), this);
        return;
      case 'caughtTalk': free(); this.stage = 'out'; this.toHome(false);
        g.emit('toast', { text: 'Receptet är räddat. Ut till bilen – och hem till torget!', long: true });
        return;
      case 'finaleTalk': this.startShow(); return;
    }
  }

  // ---------------------------------------------------------------- per step
  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null; this.talkWho = null; this.pole = null;
    this.stageT = (this.stageT || 0) + dt;
    if (this.carry && this.carry !== 'recept' && p.state === 'foot') p.body.pose = 3;
    if (this.carry !== 'orgel' && p.carryMax) p.carryMax = null;
    const inHall = ['hallTalk', 'belt', 'caughtTalk'].includes(this.stage);
    if (inHall && !ind.inside && !ind.busy) {        // walked out of the hall in the middle of it
      this.removeInside(); this.beltOn = false; this.stage = 'enter'; return;
    }
    if (ind.inside && ind.where === 'fabrik') ind.noExit = this.stage === 'belt' && !this.stopped;
    switch (this.stage) {
      case 'houses': if (!this.talkAt) this.housesStep(dt); break;
      case 'gather': this.gatherStep(); break;
      case 'chase': this.chaseStep(dt); break;
      case 'yard': case 'enter': this.yardStep(); break;
      case 'belt': this.beltStep(dt); break;
      case 'home': case 'out': this.homeStep(dt); break;
      case 'show': this.showStep(dt); break;
    }
    void m;
  }

  interact() {
    const pr = this.prompt;
    if (!pr) return false;
    if (this.stage === 'houses') return this.interactHouses(pr);
    if (pr === 'PRATA' && this.stage === 'yard') { this.dockTalk(); return true; }
    if (pr === 'GÅ IN' && this.stage === 'enter') { this.enterHall(); return true; }
    if (pr === 'NÖDSTOPP') { this.pressStop(); return true; }
    if (pr === 'TA RECEPTET') { this.takeRecipe(); return true; }
    return false;
  }

  // ---------------------------------------------------------------- map and view
  targets(T) {
    const g = this.game, ind = g.indoors, K = SJUBY, p = g.player;
    const zone = (x, z, r, gps) => T.push({ kind: 'zone', x, z, r, gps });
    const item = (x, y, z, gps = false) => T.push({ kind: 'item', x, y, z, gps });
    if (ind.inside) {
      if (ind.where === 'shed' && this.signeAt === 'shed' && !this.carry) item(K.box.x, SHED.y + 0.9, K.box.z);
      if (ind.where === 'fabrik' && this.stage === 'belt') {
        if (!this.stopped) item(FAB.stop.x + 0.3, FAB.y + 1.9, FAB.stop.z);
        else { const R = beltAt(this.recipeS); item(R.x, BELT.y + 0.7, R.z); }
      }
      return;
    }
    if (this.stage === 'houses') {
      const opts = [];
      if (this.signeAt === 'wait') opts.push({ ...K.talk.signe, r: 1.2 });
      if (this.signeAt === 'shed') opts.push({ x: SHED_DOOR.x, z: SHED_DOOR.z, r: 1.0 });
      if (this.signeAt === 'hang') K.poles.forEach((q, i) => { if (!this.hung[i]) opts.push({ ...q, r: 1.0 }); });
      if (this.folkeAt === 'wait') opts.push({ ...K.talk.folke, r: 1.2 });
      if (this.folkeAt === 'talk') opts.push(this.carry === 'orgel' ? K.organTo : K.organ);
      if (this.elsaAt === 'wait') opts.push({ ...K.talk.elsa, r: 1.2 });
      if ((this.elsaAt === 'ronny') && this.ronny) opts.push({ x: this.ronny.x, z: this.ronny.z, r: 1.2 });
      if (this.elsaAt === 'cat' && this.cat && this.cat.state === 'hide') opts.push({ x: this.cat.x, z: this.cat.z, r: 1.4 });
      if (this.carry === 'orgel') opts.length = 0, opts.push(K.organTo);
      let best = null, bd = 1e9;
      for (const Z of opts) { const d = Math.hypot(Z.x - p.x, Z.z - p.z); if (d < bd) { bd = d; best = Z; } }
      for (const Z of opts) zone(Z.x, Z.z, Math.min(Z.r || 1.2, 1.4), Z === best);
    }
    if (this.stage === 'gather') zone(K.bell.x, K.bell.z, K.bell.r, true);
    if (this.stage === 'chase' && this.truck && !this.truck.removed) T.push({ kind: 'car', car: this.truck, gps: true });
    if (this.stage === 'yard' && this.ronny) zone(this.ronny.x, this.ronny.z, 1.2, true);
    if (this.stage === 'enter') zone(FAB_DOOR.x, FAB_DOOR.z, 1.0, true);
    if (this.stage === 'home' || this.stage === 'out') zone(K.finale.x, K.finale.z, K.finale.r, true);
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    p.frozen = false; p.carryMax = null;
    g.indoors.noExit = false;
    if (g.camFocus && g.camFocus.owner === 'sjuby') g.camFocus = null;
    if (this.stage !== 'done') g.emit('cinema', { on: false });
    if (this.chaser) { this.chaser.retire(false); this.chaser = null; }
    const L = (m.sjubyLeft = m.sjubyLeft || []);
    for (const q of [...(this.folk || []), ...(this.crowd || []), ...(this.chapelFolk || []), ...(this.helpers || []), ...Object.values(this.house || {}), this.ronny, this.birger, this.runner]) if (q) L.push(q);
    this.folk = this.crowd = this.chapelFolk = this.helpers = this.house = this.ronny = this.birger = this.runner = null;
    this.removeInside();
    const v = this.truck;
    if (v && !v.removed && g.player.car !== v) (m.sjubyCars = m.sjubyCars || []).push(v);
    this.truck = null;
    this.holdSpider = false;
  }
}

// the camera at time t of the show: Catmull-Rom through FLY
export function flyAt(t) {
  const n = FLY.length;
  let i = 0;
  while (i < n - 2 && t > FLY[i + 1][0]) i++;
  const a = FLY[Math.max(0, i - 1)], b = FLY[i], c = FLY[Math.min(n - 1, i + 1)], d = FLY[Math.min(n - 1, i + 2)];
  const u = Math.max(0, Math.min(1, (t - b[0]) / Math.max(1e-6, c[0] - b[0])));
  const cr = (k) => { const p0 = a[k], p1 = b[k], p2 = c[k], p3 = d[k]; return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u); };
  return { x: cr(1), y: cr(2), z: cr(3), lx: cr(4), ly: cr(5), lz: cr(6), fov: cr(7) };
}
