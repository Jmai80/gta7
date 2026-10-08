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
export const WHO = { lasse: 'Lasse (Verkstan)', sanna: 'Sanna (Pizzerian)', kim: 'Kim (Macken)', gun: 'Tant Gun (Storgatan)', anon: 'Okänt nummer', game: 'GTA 7' };
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

export const SIM_HZ = 60;
