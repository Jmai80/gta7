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

export const SIM_HZ = 60;
