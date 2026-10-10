// GTA 7 – shared constants. Units are meters and seconds.
// World axes: +x east, +z south, +y up. Heading h: forward = (sin h, cos h).

export const ROAD_W = 10;            // asphalt width (one lane each way)
export const LANE = 2.5;             // lane center offset from road centerline (right-hand traffic)
export const WALK = 3;               // sidewalk width
export const CORR = ROAD_W + 2 * WALK; // full street corridor (16)
export const ROADS = [-120, -40, 40, 120]; // road centerlines, same on both axes
export const RING = 125;             // outer edge of the ring road asphalt
export const ISLAND = 146;           // quay edge
export const CURB_H = 0.15;          // sidewalk / land height above asphalt
export const OVERLAY_H = 0.17;       // lawn, parking etc. drawn on land
export const WATER_Y = -0.7;
export const STOP_D = 8.5;           // stop line distance from intersection center
export const XWALK_IN = 5.3, XWALK_OUT = 7.7; // crosswalk band along each arm

export const BRIDGES = [
  // road continues off the island but is closed by a barrier
  { axis: 'z', at: 40, from: -RING, to: -230, barrier: -178, dir: -1 }, // north, along x=40
  { axis: 'x', at: -40, from: -RING, to: -230, barrier: -178, dir: -1 }, // west, along z=-40
];

export const STREET_NAMES = {
  x: { '-120': 'Västra Ringvägen', '-40': 'Kungsgatan', '40': 'Drottninggatan', '120': 'Östra Ringvägen' },
  z: { '-120': 'Hamngatan', '-40': 'Storgatan', '40': 'Skolgatan', '120': 'Södra Ringvägen' },
};

// Block interior bounds for block index 0..2 (inside the sidewalks)
export function blockRange(i) {
  return [ROADS[i] + CORR / 2, ROADS[i + 1] - CORR / 2];
}

export const SUN = (() => {
  // Direction toward the sun (south-west, ~33° elevation): long golden-hour shadows
  const x = -0.58, y = 0.55, z = 0.6;
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l };
})();

export const START = { x: -33.4, z: 4, h: Math.PI }; // player spawn on Kungsgatan's sidewalk, facing north

export const DELIVERY = { x: 72, z: 67, r: 3.6 };          // Lasses Verkstad, in front of door 2
export const CARWASH = { x0: 96, x1: 106, z0: -12, z1: -4, cost: 200 }; // drive-through repair
export const RED_REWARD = 1000;
export const DELIVERY_REWARD = 5000;

// ---- version 0.2: three contacts with missions that can be done in any order ----
export const WHO = { lasse: 'Lasse (Verkstan)', sanna: 'Sanna (Pizzerian)', kim: 'Kim (Macken)', gun: 'Tant Gun (Storgatan)', yasmin: 'Yasmin (Hörnlivs)', leif: 'Lås-Leif (Skolgatan)', samuel: 'Melker', bengt: 'Bagar-Bengt', anon: 'Okänt nummer', game: 'GTA 7', fia: 'Vera (Salong Saxen)', pia: 'Polis-Pia' };
export const PIZZERIA = { x: -33.4, z: -22, r: 2.4 };               // Sanna's marker on the sidewalk outside Pizzeria Sjuan
export const PIZZA_CAR = { x: -52.75, z: -21.95, h: Math.PI / 2 };  // the pizza car's stall, across Kungsgatan
// Pizza stops: the marker sits in the traffic lane (x, z), the customer waits on the sidewalk (cx, cz)
export const PIZZA_STOPS = [
  { x: -97.5, z: -117.5, cx: -97.5, cz: -113.2 },  // villa, Hamngatan
  { x: -62.5, z: -117.5, cx: -62.5, cz: -113.2 },  // villa, Hamngatan
  { x: -62.5, z: -42.5, cx: -62.5, cz: -46.8 },    // villa, Storgatan
  { x: -1, z: -117.5, cx: -1, cz: -113.3 },        // apartment block, Hamngatan
  { x: 16, z: -42.5, cx: 16, cz: -46.7 },          // apartment block, Storgatan
  { x: -8.1, z: 42.5, cx: -8.1, cz: 46.7 },        // row house, Skolgatan
  { x: 80, z: 37.5, cx: 80, cz: 33.3 },            // flats behind Macken, Skolgatan
  { x: -70, z: 42.5, cx: -70, cz: 47.5 },          // construction site gate
  { x: 80, z: -42.5, cx: 80, cz: -46.7 },          // park entrance, Storgatan
  { x: 42.5, z: 67, cx: 46.5, cz: 67, lasse: true }, // Lasse orders too
];
export const PIZZA_TIME_OUT = 40;                   // seconds away from the pizza car before the job fails
export const MACKEN = { x: 58, z: 2, r: 3.5 };      // Kim's marker on the gas station forecourt
export const RACE_PRIZE = 2500;
export const RACE_LAPS = 2;
// side quest: tant Gun's villa on Storgatan – where she waits and her flagpole in the front garden
export const GUN = { x: -100.2, z: -50.7, poleX: -104.5, poleZ: -51.2, poleH: 9, reward: 300 };

// ---- version 0.4: the main quest begins in the dark tower by the square ----
export const TOWER_DOOR = { x: 19, z: -6.2, r: 1.4 };   // the marker outside the tower's entrance (south side)
export const INDOOR = { x: 200, z: 200, y: 0.15 };       // the inside of the tower is built out at sea, hidden
export const SAMUEL_REWARD = 1500;
// ---- version 0.5: the handover on the harbour pier (main quest, part 2) ----
export const PIER = { x: -75, x0: -77.5, x1: -72.5, z0: -172, z1: -146 }; // the wooden pier in Sjuby hamn (north)
export const PIER_BENCH = { x: -75, z: -169.4 };          // the bench at the far end, facing the sea
export const PIER_MEET = { x: -75, z: -166.9, r: 1.3 };   // walk up behind the bench
export const HANDOVER_REWARD = 1000;
// ---- version 0.6: Norrholmen and Arne's delivery bike (main quest, part 3) ----
export const GUN_GATE = { x: -97.5, z: -46.8, r: 2.4 };        // ride the bike up to tant Gun's garden gate (the gap in her hedge)
export const GUN_BIKE = { x: -93.4, z: -46.6, h: Math.PI / 2 }; // where the bike stands once she has it
export const BIKE_REWARD = 2000;
// ---- version 0.6.1: side quest "Fyrvaktarens kasse" – from Hörnlivs to the lighthouse on Norrholmen ----
export const LIVS_DOOR = { x: -32.9, z: -4.5, r: 1.3 };       // the marker on the sidewalk outside Hörnlivs' door (Kungsgatan)
export const INGVAR = { x: 102, z: -386.3, h: 0 };           // the lighthouse keeper, outside his cottage by the lighthouse
export const LIVS_REWARD = 500, EGG_BONUS = 50, EGGS = 12;   // 500 kr + 50 kr for every egg that arrives whole

// ---- version 0.7: main quest part 4 "Kassaskåpet" and side quest "Melkers nya nycklar" ----
export const OFFICE_DOOR = { x: 56.7, z: -322, r: 1.3 };    // the marker outside the bakery office's side door (west wall, Norrholmen)
export const SAFE_TIME = 75;                                 // seconds before Bagar-Bengt is back from the ovens
export const SAFE_REWARD = 3000;
export const LEIF = { x: 4, z: 32.5, h: 0 };                 // Lås-Leif outside his key shop on Skolgatan
export const LEIF_MARK = { x: 4, z: 33.9, r: 1.3 };          // the marker in front of him
export const SAMUEL_WAIT = { x: 34.6, z: -305.2, h: -Math.PI / 2 }; // Melker waits by the allotments' east gate (Norrholmen)
export const KEY_TIME = 65, KEY_REWARD = 800;

// ---- version 0.8: main quest part 5 "Nyöppningen", Lasse's tuning shop and Kim's long jump ----
export const KONDITORI = { x: -6, z: 17.4, r: 1.6 };         // the marker outside Sjuby Konditori (the square, north face of the brick building)
export const KONDITORI_DOOR = { x: -6, z: 19 };              // the door itself
export const PICKUPS = {                                      // the three ingredients for the first Sjubybullar
  kardemumma: { x: -33.4, z: -3.2, r: 2.4, label: 'Kardemumma', where: 'Hörnlivs, Kungsgatan' },
  smor: { x: 58, z: 2, r: 3.5, label: 'Smör', where: 'Macken, Drottninggatan' },
  mjol: { x: -2.6, z: -354.8, r: 2.6, label: 'Mjöl', where: 'Kvarnen på Norrholmen' },
};
export const OPENING_REWARD = 4000;
export const LASSE_SHOP = { x: 76.6, z: 58.1, r: 2.2 };       // in front of the workshop's first garage door
export const JUMP_GOAL = 34, JUMP_REWARD = 1500;             // Kim's long jump at the construction site
export const JUMP_START = { x: -70, z: -24, r: 3.2 };          // (v1.1.1) its K: the far end of the parking lot across Kungsgatan from
                                                              // Hörnlivs, straight north of the ramp (a flat-out run from here: ≈ 37 m)

// ---- version 0.9: main quest parts 6–7 ("Syltburken", "Bullfabriken") and two more side quests ----
export const JAR = { flee: 165, fleeT: 8, stopAt: 32, reward: 2500 };   // the black car: lost this far away for this long; stops at this health
export const FACTORY_START = { x: 42.6, z: -279, r: 3.2 };   // wait by the bakery's driveway on the middle road (Norrholmen)
export const TAIL = { dest: { x: -70, z: 42.5 }, far: 85, farT: 5, near: 9, nearT: 3, vMax: 11 };
export const SITE_OFFICE = { x: -57, z: 100.8, r: 2.4 };     // the containers at the construction site: Dahlgren's site office
export const FACTORY_REWARD = 5000;
export const BIKE_RETURN = { x: 20.2, z: -3.6, r: 3.0, reward: 500 };   // Melker waits outside the tower for his bike
export const HOME_DELIVERY = { start: { x: -34.2, z: 1.2, r: 1.5 }, time: 120, per: 300, bonus: 5 };

// ---- version 1.0: side quest "Salong Saxen" (indoors) and main quest part 8 "Bullfesten" (Jonte) ----
export const SALON_DOOR = { x: 22, z: 32.6, r: 1.3 };       // the marker outside Vera's hair salon (Skolgatan, the square's brick building)
export const SALON_PAY = { base: 300, happy: 200, tip: 100, need: 2, patience: 55 }; // pay per happy customer + a tip for being quick
export const FEST = {
  mark: { x: -6, z: 8.4, r: 1.8 },                           // the party on the square, in front of the konditori
  table: { x0: -9.6, x1: -2.4, z0: 11.6, z1: 12.5 },         // the long table with the buns (its collider is up only while the party is)
  bike: { x: -0.8, z: 12.2, h: Math.PI / 2 },                // Arne's bike with the basket of buns, at the end of the table
  racer: { x: -2.6, z: 6.6, h: Math.PI / 2 },                // the red racing bike Jonte leaves behind
  exit: [[6, 12.6], [18, 12.6], [33.5, 12.6]],               // Jonte's way out of the square: east, onto Drottninggatan's pavement
  vMax: 8.4, slow: 6.6, corner: 4.0,                         // his speed on Arne's bike (with the buns): flat out, teasing you, round a corner
  lose: 120, loseT: 8, runLose: 70, runLoseT: 6,             // too far behind for too long: he gets away (on the bike / on foot)
  reward: 3000,
};

// ---- version 1.2: main quest part 9 "Cykelgömman" (Birger's house) and side quest "Cyklarna hem" ----
// Birger, tant Gun's neighbour: the red villa east of hers on Storgatan (away on a cruise since May)
export const BIRGER = {
  gate: { x: -62.5, z: -46.9, r: 1.6 },                      // the marker on the pavement outside his garden gate
  pia: { x: -60.6, z: -46.6, h: -Math.PI / 2 },              // Polis-Pia waits there, by the mailbox
  door: { x: -62.5, z: -52.2, r: 1.1 },                      // his front door (at the top of the steps)
  van: { x: -56.5, z: -42.5, h: -Math.PI / 2 },              // Ronny's van, at the kerb outside (the westbound lane)
  flee: 165, fleeT: 8, stopAt: 32,                           // the van: lost this far away for this long; stops at this health
  reward: 3500,
};
// the three bikes that are going home (side quest): where each one stands, whose it is, where they wait
export const BIKES_HOME = [
  { id: 'vera', paint: 'cityOrange', bike: { x: -65.2, z: -46.3, h: Math.PI / 2 }, owner: { x: 23.6, z: 33.5, h: 0 }, zone: { x: 22, z: 34.4, r: 2.6 } },
  { id: 'lasse', paint: 'cityYellow', bike: { x: 25.8, z: 33.6, h: Math.PI / 2 }, owner: { x: 70.4, z: 65.6, h: Math.PI / 2 }, zone: { x: 72, z: 67, r: 2.8 } },
  { id: 'yasmin', paint: 'cityPink', bike: { x: 68.2, z: 64.6, h: 0 }, owner: { x: -34.1, z: -6.2, h: -Math.PI / 2 }, zone: { x: -35.2, z: -4.6, r: 2.6 } },
];
export const BIKE_HOME_PAY = 400, BIKES_HOME_BONUS = 300;

export const SIM_HZ = 60;
