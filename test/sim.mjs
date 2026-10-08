// Headless simulation test: traffic health, physics sanity and the mission flow.
import { Game } from '../src/game.js';
import { onRoad } from '../src/layout.js';
import { DELIVERY } from '../src/config.js';

const DT = 1 / 60;
const idle = { moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, camYaw: Math.PI, analog: true };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) fails++; };

// ---------- 1. traffic soak ----------
{
  console.log('Traffic soak (8 simulated minutes)');
  const g = new Game({ seed: 7 });
  let aiCrashes = 0, maxBlocked = 0, offRoad = 0, samples = 0, speedSum = 0, honks = 0;
  g.on('crash', (e) => { if (!e.player) aiCrashes++; });
  g.on('honk', () => honks++);
  const stuckTime = new Map();
  let worstStuck = 0;
  const t0 = performance.now();
  for (let i = 0; i < 60 * 60 * 8; i++) {
    g.step(DT, idle);
    if (i % 30 === 0) {
      for (const v of g.vehicles) {
        if (v.driver !== 'ai') continue;
        samples++;
        speedSum += v.speed;
        if (!onRoad(v.x, v.z)) offRoad++;
        maxBlocked = Math.max(maxBlocked, v.ai?.blockedT || 0);
        const st = (v.speed < 0.3 ? (stuckTime.get(v) || 0) + 0.5 : 0);
        stuckTime.set(v, st);
        worstStuck = Math.max(worstStuck, st);
      }
    }
  }
  const ms = performance.now() - t0;
  const ai = g.vehicles.filter((v) => v.driver === 'ai');
  console.log(`  cars=${g.vehicles.length} ai=${ai.length} peds=${g.peds.list.length} avgSpeed=${(speedSum / samples * 3.6).toFixed(1)} km/h`);
  console.log(`  aiCrashes=${aiCrashes} offRoadSamples=${offRoad}/${samples} worstStandstill=${worstStuck.toFixed(1)}s maxBlocked=${maxBlocked.toFixed(1)}s honks=${honks}`);
  console.log(`  replans=${ai.reduce((a, v) => a + (v.ai.replans || 0), 0)} lost=${ai.filter((v) => v.ai.lost).length}`);
  console.log(`  sim cost: ${(ms / (60 * 60 * 8)).toFixed(3)} ms per step`);
  check(ai.length >= 10, 'traffic population kept');
  check(speedSum / samples > 5, 'traffic keeps moving (avg > 18 km/h)');
  check(aiCrashes < 6, 'AI cars rarely crash into each other');
  check(offRoad / samples < 0.02, 'AI cars stay on the roads');
  check(worstStuck < 25, 'no car stands still for more than 25 s');
}

// ---------- 2. car physics sanity ----------
{
  console.log('Car physics');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const car = g.addVehicle('sedan', 'red', -40 + 2.5, 100, Math.PI); // Kungsgatan, facing north
  car.driver = 'player';
  car.input.park = false;
  let t = 0, t100 = null;
  for (let i = 0; i < 60 * 12; i++) {
    car.input.throttle = 1; car.input.steer = 0;
    car.step(DT, g.world);
    t += DT;
    if (t100 === null && car.speed * 3.6 >= 100) t100 = t;
    if (car.z < -100) break;
  }
  console.log(`  0-100 km/h: ${t100 ? t100.toFixed(2) + ' s' : 'not reached'}, speed after run ${(car.speed * 3.6).toFixed(0)} km/h`);
  check(t100 && t100 > 2.5 && t100 < 6, '0-100 within 2.5–6 s');
  // braking from speed
  const z0 = car.z, v0 = car.speed;
  for (let i = 0; i < 600 && car.speed > 0.2; i++) { car.input.throttle = -1; car.step(DT, g.world); }
  console.log(`  braking distance from ${(v0 * 3.6).toFixed(0)} km/h → 0: ${Math.abs(car.z - z0).toFixed(1)} m`);
  // turning circle at low speed
  const c2 = g.addVehicle('sedan', 'blue', 0, 0, 0);
  c2.driver = 'player'; c2.input.park = false;
  let minX = 1e9, maxX = -1e9;
  for (let i = 0; i < 60 * 8; i++) {
    c2.input.throttle = c2.speed < 6 ? 0.6 : 0; c2.input.steer = 1;
    c2.step(DT, g.world);
    if (i > 120) { minX = Math.min(minX, c2.x); maxX = Math.max(maxX, c2.x); }
  }
  console.log(`  turning diameter at ~${(c2.speed * 3.6).toFixed(0)} km/h: ${(maxX - minX).toFixed(1)} m`);
  check(maxX - minX < 16, 'can turn around in a street-sized circle');
  // wall impact
  // head-on into the shop row (west face at x = -31) from Kungsgatan
  const c3 = g.addVehicle('sedan', 'white', -42, -12, Math.PI / 2);
  c3.driver = 'player'; c3.input.park = false;
  c3.vx = 20; c3.vz = 0;
  let maxImp = 0;
  for (let i = 0; i < 120; i++) { c3.step(DT, g.world); maxImp = Math.max(maxImp, c3.collideStatic(g.world)); }
  console.log(`  head-on into building at 72 km/h: impact ${maxImp.toFixed(1)} m/s, final speed ${(c3.speed * 3.6).toFixed(0)} km/h, x=${c3.x.toFixed(2)}`);
  check(maxImp > 15 && c3.x < -33 && c3.speed < 6, 'car stops at the building wall (no tunnelling)');
}

// ---------- 3. Lasse's job (the first mission) ----------
{
  console.log('Mission flow: Lasse');
  const g = new Game({ seed: 7 });
  const events = [];
  for (const e of ['sms', 'objective', 'banner', 'money', 'enterCar', 'endcard', 'wanted']) g.on(e, (d) => events.push([e, d]));
  for (let i = 0; i < 120; i++) g.step(DT, idle);
  check(g.mission.lasse === 'steal' && g.mission.objective === 'Sno en röd bil', 'intro → steal after ~2 s');
  check(events.some(([e, d]) => e === 'sms' && d.from.startsWith('Lasse')), 'Lasse sends the first SMS');
  // walk to the parked red car
  const red = g.vehicles.find((v) => v.parkedSpot && v.isRed);
  check(!!red, 'a red car is parked in the lot');
  const p = g.player;
  const door = red.local(-1.6, 0.3);
  p.x = door.x; p.z = door.z;
  g.step(DT, idle);
  check(p.near === red, 'player is next to the red car');
  g.step(DT, { ...idle, action: true });
  for (let i = 0; i < 60; i++) g.step(DT, idle);
  check(p.state === 'car' && p.car === red, 'player sits in the red car');
  check(g.money === 1000, 'stealing it pays 1 000 kr');
  for (let i = 0; i < 60 * 5; i++) g.step(DT, idle);
  check(g.mission.lasse === 'deliver' && g.mission.objective === 'Kör bilen till Lasses Verkstad', 'second objective: deliver to the garage');
  check(g.mission.targets.some((t) => t.kind === 'zone' && t.gps && t.letter === 'L'), 'GPS to the garage (the L on the map)');
  // teleport near the garage and roll into the zone
  red.x = DELIVERY.x - 12; red.z = DELIVERY.z; red.h = Math.PI / 2; red.vx = red.vz = 0; red.w = 0;
  red.health = 80;
  for (let i = 0; i < 60 * 6 && g.mission.lasse === 'deliver'; i++) {
    const d = DELIVERY.x - red.x;
    g.step(DT, { ...idle, moveY: d > 2 ? 0.5 : -0.6, analog: true });
  }
  check(g.mission.lasse === 'done' && g.mission.done.has('lasse'), 'delivery detected in the yard');
  check(g.money === 1000 + 4000, `delivery pays by condition (got ${g.money - 1000} kr for 80 %)`);
  for (let i = 0; i < 60 * 11; i++) g.step(DT, idle);
  check(!events.some(([e]) => e === 'endcard'), 'no end card while Sanna and Kim still have jobs');
  check(/S eller K/.test(g.mission.objective), `objective points to the other contacts (${g.mission.objective})`);
}

// ---------- 4. carjacking an AI car ----------
{
  console.log('Carjacking');
  const g = new Game({ seed: 3 });
  for (let i = 0; i < 300; i++) g.step(DT, idle);
  const car = g.vehicles.find((v) => v.driver === 'ai');
  // stand in front of it: it should stop and honk
  let honked = false;
  g.on('honk', () => (honked = true));
  const p = g.player;
  for (let i = 0; i < 60 * 8; i++) {
    const front = car.local(0, car.spec.len / 2 + 1.2);
    if (i === 0) { p.x = front.x; p.z = front.z; }
    g.step(DT, idle);
  }
  check(car.speed < 0.5, 'AI car stops for the player standing in front');
  check(honked, 'AI driver honks');
  const pedsBefore = g.peds.list.length;
  const door = car.local(-1.6, 0.3);
  p.x = door.x; p.z = door.z;
  g.step(DT, { ...idle, action: true });
  for (let i = 0; i < 90; i++) g.step(DT, idle);
  check(p.car === car, 'player took the car');
  check(g.peds.list.length === pedsBefore + 1, 'the driver was pulled out and is now a pedestrian');
  check(!g.traffic.occ.some((l) => l.some((o) => o.car === car)), 'stolen car released its intersection reservations');
}

console.log(fails ? `\n${fails} check(s) failed` : '\nAll checks passed');
process.exit(fails ? 1 : 0);
