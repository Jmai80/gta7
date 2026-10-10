// Stunt jump and car wash checks, and (v1.1) Norrholmen's beach.
import { Game } from '../src/game.js';
import { CURB_H } from '../src/config.js';
import { BEACH } from '../src/island.js';
const DT = 1 / 60;
const idle = { moveX: 0, moveY: 0, action: false, camYaw: Math.PI, analog: true };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) fails++; };

function playerCar(g, x, z, h) {
  const c = g.addVehicle('sedan', 'blue', x, z, h); // not red: Lasse would pay for a red one
  const d = c.local(-1.6, 0.3);
  g.player.x = d.x; g.player.z = d.z;
  g.step(DT, { ...idle, action: true });
  for (let i = 0; i < 50; i++) g.step(DT, idle);
  return c;
}

{
  console.log('Stunt jump through the construction gate');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const car = playerCar(g, -70, 18, 0);
  let stunt = null, maxY = 0, airMax = 0;
  g.on('stunt', (e) => (stunt = e));
  for (let i = 0; i < 60 * 8; i++) {
    g.step(DT, { ...idle, throttleAxis: car.z < 95 ? 1 : -1, steerAxis: 0 });
    maxY = Math.max(maxY, car.y); airMax = Math.max(airMax, car.airTime);
    if (i % 30 === 0) console.log(`   t=${(i * DT).toFixed(1)} z=${car.z.toFixed(1)} y=${car.y.toFixed(2)} v=${(car.speed * 3.6).toFixed(0)} air=${car.air}`);
  }
  console.log(`  peak height ${maxY.toFixed(2)} m, airtime ${airMax.toFixed(2)} s, stunt=${JSON.stringify(stunt)}, health ${car.health.toFixed(0)}`);
  check(!!stunt, 'stunt bonus awarded');
  check(car.health > 50, 'landing on the ramp does not wreck the car');
}

{
  console.log('Car wash');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  g.money = 1000;
  const car = playerCar(g, 88, -8, Math.PI / 2);
  car.health = 55;
  let washed = false;
  g.on('wash', (e) => { if (!e.on) washed = true; });
  for (let i = 0; i < 60 * 9; i++) {
    const inside = car.x > 99;
    g.step(DT, { ...idle, throttleAxis: inside ? (car.speed > 0.3 ? -1 : 0) : 0.6, steerAxis: 0 });
  }
  console.log(`  x=${car.x.toFixed(1)} health=${car.health} money=${g.money}`);
  check(washed && car.health === 100 && g.money === 800, 'stopping in the car wash repairs the car for 200 kr');
}
{
  console.log('Norrholmens badplats (v1.1)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const L = g.layout, kinds = {};
  for (const q of L.prims) if (q.t === 'beach') kinds[q.kind] = (kinds[q.kind] || 0) + 1;
  console.log('  ' + Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', '));
  check(kinds.parasol >= 5 && kinds.lounger >= 4 && kinds.towel >= 4 && kinds.hut === 4 && kinds.tower === 1 && kinds.kiosk === 1 && kinds.jetty === 1,
    'parasols, sun loungers, four beach huts, the lifeguard tower, the kiosk and the jetty');
  const folk = L.zones.beachFolk.list;
  check(folk.length >= 8 && folk.every((f) => g.world.groundHeight(f.x, f.z) >= CURB_H - 0.01), `${folk.length} people on the beach, all on dry land or the jetty`);
  // down the boardwalk and out along the jetty, then sideways into the railings
  const J = BEACH.jetty, p = g.player;
  p.x = 4; p.z = -252; p.y = g.world.groundHeight(p.x, p.z);
  let low = 9;
  const walk = (sec, mx, my) => { for (let i = 0; i < sec * 60; i++) { g.step(DT, { ...idle, camYaw: 0, moveX: mx, moveY: my }); low = Math.min(low, p.y); } };
  walk(7, 0, 1);
  check(p.z > J.z1 - 0.9 && p.z < J.z1 && Math.abs(p.y - (CURB_H + 0.02)) < 0.01 && low >= CURB_H - 0.01,
    `out on the end of the jetty, dry feet all the way (z ${p.z.toFixed(2)}, y ${p.y.toFixed(2)})`);
  p.z = (J.z0 + J.z1) / 2;
  walk(2, 1, 0); const xa = p.x; walk(3, -1, 0); const xb = p.x;
  check(Math.min(xa, xb) > J.x0 && Math.max(xa, xb) < J.x1, `the railings hold (x ${xa.toFixed(2)} and ${xb.toFixed(2)})`);
  walk(6, 0, -1);
  check(p.z < J.z0 - 2 && p.y >= CURB_H - 0.01, 'and back to the sand');
}
console.log(fails ? `${fails} failed` : 'All extras passed');
