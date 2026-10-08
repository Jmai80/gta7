// Stunt jump and car wash checks.
import { Game } from '../src/game.js';
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
console.log(fails ? `${fails} failed` : 'All extras passed');
