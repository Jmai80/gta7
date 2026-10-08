// Version 0.2 missions: the pizza job, the street race, failing, saving and the end card.
import { Game } from '../src/game.js';
import { PIZZERIA, MACKEN, DELIVERY, PIZZA_CAR } from '../src/config.js';
import { raceRoute } from '../src/race.js';
import { clamp } from '../src/rng.js';

const DT = 1 / 60;
const idle = { moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, camYaw: Math.PI, analog: true };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) fails++; };
const run = (g, sec, inp = idle) => { for (let i = 0; i < Math.round(sec * 60); i++) g.step(DT, typeof inp === 'function' ? inp() : inp); };
const record = (g, names) => { const ev = []; for (const n of names) g.on(n, (d) => ev.push([n, d])); return ev; };

function enterCar(g, car) {
  const d = car.local(-1.6, 0.3);
  g.player.x = d.x; g.player.z = d.z;
  g.step(DT, { ...idle, action: true });
  run(g, 1);
  return g.player.car === car;
}
// drive the player's car to (x, z) and stop there (teleport + settle)
function parkAt(g, x, z, h = 0) {
  const car = g.player.car;
  car.x = x; car.z = z; car.h = h; car.vx = car.vz = car.w = 0;
  run(g, 0.5);
}

// ---------- 1. the pizza job ----------
{
  console.log('Pizzabudet');
  const g = new Game({ seed: 7 });
  const ev = record(g, ['banner', 'sms', 'toast', 'say', 'progress']);
  run(g, 10);
  check(g.mission.contacts.find((c) => c.id === 'pizza').open, 'Sanna has texted and the S marker is open');
  const pz = g.pizzaCar;
  check(pz && pz.pizza && pz.paint === 'pizza' && Math.hypot(pz.x - PIZZA_CAR.x, pz.z - PIZZA_CAR.z) < 0.5, 'pizza car parked in its stall');
  // walk into the marker
  g.player.x = PIZZERIA.x; g.player.z = PIZZERIA.z;
  run(g, 0.5);
  const job = g.mission.active;
  check(job && job.id === 'pizza' && job.stage === 'getcar', 'walking into S starts the job');
  check(g.mission.targets.some((t) => t.kind === 'car' && t.car === pz), 'arrow over the pizza car');
  check(g.mission.objective === 'Hoppa in i pizzabilen', 'objective: get the pizza car');
  check(enterCar(g, pz), 'player takes the pizza car');
  check(job.stage === 'deliver' && job.stops.length === 3, `three stops, ${job.left} s on the clock`);
  check(job.stops.every((s) => s.ped && s.ped.state === 'stand'), 'customers wait at the doors');
  check(g.mission.targets.filter((t) => t.kind === 'zone' && t.gps).length === 3, 'three delivery zones with GPS');
  const money0 = g.money;
  // a hard crash squashes the pizzas
  g.emit('crash', { x: pz.x, z: pz.z, impact: 11, player: true, car: pz });
  check(job.cond === 70, `crash lowers the pizza condition (${job.cond} %)`);
  for (const s of [...job.stops]) {
    parkAt(g, s.x, s.z, 0);
    run(g, 0.3);
  }
  check(!g.mission.active && g.mission.done.has('pizza'), 'all three delivered → job done');
  const paid = g.money - money0;
  check(paid === 3 * (250 + 140) + 500, `paid 3 × (250 + 140 tip) + 500 bonus (got ${paid})`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'UPPDRAG KLART' && /Pizzabudet/.test(d.sub)), 'UPPDRAG KLART banner');
  check(ev.filter(([n]) => n === 'say').length >= 3, 'customers say something');
  check(ev.some(([n]) => n === 'progress'), 'progress saved');
  run(g, 4);
  check(!g.mission.targets.some((t) => t.letter === 'S'), 'S marker gone after the job');
  check(g.peds.list.every((q) => !q.keep), 'customers are ordinary pedestrians again');
}

// ---------- 2. failing the pizza job and trying again ----------
{
  console.log('Pizzabudet: abandon');
  const g = new Game({ seed: 11 });
  const ev = record(g, ['banner']);
  run(g, 10);
  g.player.x = PIZZERIA.x; g.player.z = PIZZERIA.z;
  run(g, 0.5);
  const job = g.mission.active;
  enterCar(g, g.pizzaCar);
  g.step(DT, { ...idle, action: true }); // get out again
  run(g, 1);
  check(g.player.state === 'foot' && g.mission.objective === 'Tillbaka till pizzabilen', 'out of the car: go back');
  run(g, 41);
  check(!g.mission.active && ev.some(([n, d]) => n === 'banner' && d.kind === 'fail'), 'away for 40 s → UPPDRAG MISSLYCKAT');
  check(job.stops.every((s) => !s.ped), 'customers released');
  check(!g.mission.targets.some((t) => t.letter === 'S'), 'S marker hidden during the cooldown');
  g.player.x = PIZZERIA.x + 30; run(g, 7);
  check(g.mission.targets.some((t) => t.letter === 'S'), 'S marker back after the cooldown');
  g.player.x = PIZZERIA.x; g.player.z = PIZZERIA.z; run(g, 0.5);
  check(g.mission.active && g.mission.active.id === 'pizza', 'job can be started again');
}

// ---------- 2b. walking off before taking the pizza car is not a failure ----------
{
  console.log('Pizzabudet: never started');
  const g = new Game({ seed: 3 });
  const ev = record(g, ['banner', 'sms']);
  run(g, 10);
  g.player.x = PIZZERIA.x; g.player.z = PIZZERIA.z;
  run(g, 0.5);
  check(g.mission.active && g.mission.active.id === 'pizza', 'job started');
  g.player.x = PIZZERIA.x; g.player.z = PIZZERIA.z + 100;
  run(g, 1);
  check(!g.mission.active && !ev.some(([n, d]) => n === 'banner' && d.kind === 'fail'), 'walking away drops the job quietly');
  run(g, 4);
  check(g.mission.targets.some((t) => t.letter === 'S') && !g.mission.done.has('pizza'), 'S marker is back');
}

// ---------- 3. the race (no traffic): the player on autopilot against Kim and Bosse ----------
function autopilot(g, route, st, skill = 1) {
  const car = g.player.car;
  st.dist = route.project(car.x, car.z, st.dist, 10, 26);
  const speed = car.fwdSpeed;
  const v = route.pointAt(st.dist + 2 + Math.max(0, speed) * 0.3).v * skill;
  const Ld = clamp(4.5 + Math.abs(speed) * 0.4, 5.5, 15);
  const tp = route.pointAt(st.dist + Ld);
  const tx = tp.x, tz = tp.z;
  const sn = Math.sin(car.h), cs = Math.cos(car.h), dx = tx - car.x, dz = tz - car.z;
  const lf = dx * sn + dz * cs, lr = -dx * cs + dz * sn;
  const alpha = Math.atan2(lr, Math.max(lf, 0.5));
  const delta = Math.atan((2 * car.spec.wheelbase * Math.sin(alpha)) / Math.max(Ld * 0.8, Math.hypot(dx, dz)));
  const sf = 1 / (1 + Math.abs(speed) / car.steerFade);
  const s = clamp(delta / (car.spec.steerMax * sf), -1, 1);
  const err = v - speed;
  let thr = clamp(err * 0.45, -1, 1);
  if (err > 2.5) thr = 1;
  return { ...idle, throttleAxis: thr, steerAxis: Math.sign(s) * Math.pow(Math.abs(s), 0.8) };
}

function startRace(g) {
  const car = g.addVehicle('sedan', 'blue', MACKEN.x - 12, MACKEN.z, Math.PI / 2);
  enterCar(g, car);
  parkAt(g, MACKEN.x, MACKEN.z, Math.PI / 2);
  return car;
}

{
  console.log('Gatloppet, no traffic');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const ev = record(g, ['countdown', 'fade', 'teleport', 'checkpoint', 'banner', 'sms']);
  run(g, 19);
  // on foot: Kim wants a car
  g.player.x = MACKEN.x; g.player.z = MACKEN.z; run(g, 0.3);
  check(!g.mission.active, 'on foot: the race does not start');
  const car = startRace(g);
  const job = g.mission.active;
  check(job && job.id === 'race', 'driving into K starts the race');
  run(g, 1);
  check(Math.hypot(car.x - 43.2, car.z - 10) < 0.3 && Math.abs(car.h - Math.PI) < 0.01, 'player lined up on the grid');
  check(g.racers.length === 2 && g.racers.every((r) => r.car.driver === 'racer'), 'Kim and Bosse on the grid');
  check(ev.some(([n]) => n === 'teleport') && ev.filter(([n]) => n === 'fade').length >= 2, 'fade out/in around the teleport');
  run(g, 2.4, { ...idle, throttleAxis: 1 });
  check(Math.hypot(car.x - 43.2, car.z - 10) < 0.3, 'throttle does nothing during the countdown');
  run(g, 1);
  check(ev.filter(([n]) => n === 'countdown').map(([, d]) => d.text).join(',') === '3,2,1,KÖR!', 'countdown 3, 2, 1, KÖR!');
  const route = raceRoute();
  const st = { dist: -4 };
  let t = 0;
  const kim = g.racers.find((r) => r.name === 'Kim');
  let lapKim = null;
  while (g.mission.active && t < 240) {
    car.repair(); // the autopilot does not dodge traffic; this test is about the race itself
    g.step(DT, autopilot(g, route, st, 1.0));
    t += DT;
    if (lapKim === null && kim.dist >= route.L) lapKim = t;
  }
  const res = ev.filter(([n]) => n === 'banner').map(([, d]) => d.title + ' / ' + d.sub).pop();
  console.log(`  finished after ${t.toFixed(1)} s: ${res}; player cps ${job.next}/${job.cps.length}; Kim lap 1 at ${lapKim && lapKim.toFixed(1)} s; respawns ${job.racers.length}`);
  check(t < 240 && !g.mission.active, 'the race ends');
  check(lapKim && lapKim > 35 && lapKim < 75, `Kim's first lap takes a sensible time (${lapKim && lapKim.toFixed(1)} s)`);
  check(ev.filter(([n]) => n === 'checkpoint').length >= 10, 'checkpoints passed in order');
  check(g.racers.length === 0, 'racers removed from the race list');
  check(g.vehicles.filter((v) => v.paint === 'yellow' || v.paint === 'black').every((v) => v.driver !== 'racer' && !v.racer), 'rivals turned into ordinary traffic');
  check(!g.player.locked, 'player unlocked');
}

// ---------- 4. racers in traffic: they finish two laps without getting stuck ----------
{
  console.log('Gatloppet, racers in traffic');
  const g = new Game({ seed: 5 });
  const ev = record(g, ['banner']);
  run(g, 19);
  startRace(g);
  const job = g.mission.active;
  run(g, 5);
  let t = 0, worst = 0;
  const still = new Map();
  while (g.mission.active && t < 300) {
    g.step(DT, idle); // the player just sits on the grid
    t += DT;
    for (const r of job.racers) {
      const s = r.car.speed < 0.5 && !r.hold ? (still.get(r) || 0) + DT : 0;
      still.set(r, s); worst = Math.max(worst, s);
    }
  }
  const b = ev.filter(([n]) => n === 'banner').pop();
  console.log(`  ended after ${t.toFixed(1)} s: ${b && b[1].title} / ${b && b[1].sub}; longest standstill ${worst.toFixed(1)} s`);
  check(b && b[1].kind === 'fail' && /vann gatloppet/.test(b[1].sub), 'a rival wins when the player does not drive');
  check(t < 200, `two laps in traffic in under 200 s (${t.toFixed(1)} s)`);
  check(worst < 12, 'no rival stands still for long');
}

// ---------- 5. leaving the race ----------
{
  console.log('Gatloppet: leave the car');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const ev = record(g, ['banner']);
  run(g, 19);
  startRace(g);
  run(g, 5);
  g.step(DT, { ...idle, action: true });
  run(g, 1);
  check(g.player.state !== 'car' && g.mission.objective === 'Hoppa in i en bil!', 'out of the car: get back in');
  run(g, 15);
  check(!g.mission.active && ev.some(([n, d]) => n === 'banner' && d.kind === 'fail'), 'race lost after 15 s on foot');
}

// ---------- 6. saving, restoring and the end card ----------
{
  console.log('Progress and the end card');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const ev = record(g, ['endcard', 'sms']);
  run(g, 2);
  // Lasse's job, quickly
  const red = g.vehicles.find((v) => v.parkedSpot && v.isRed);
  enterCar(g, red);
  run(g, 4);
  parkAt(g, DELIVERY.x, DELIVERY.z, Math.PI / 2);
  run(g, 1);
  check(g.mission.done.has('lasse') && g.mission.lasse === 'done', 'Lasse delivered');
  check(!ev.some(([n]) => n === 'endcard'), 'no end card yet (two jobs left)');
  const save = JSON.parse(JSON.stringify(g.mission.progress()));
  check(save.v === 2 && save.done.includes('lasse') && save.money === g.money, 'progress() has money and finished jobs');
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  check(g2.mission.restore(save), 'restore() accepts the save');
  const sms2 = record(g2, ['sms', 'endcard']);
  run(g2, 3);
  check(g2.money === save.money && g2.mission.lasse === 'done', 'money and Lasse restored');
  check(g2.mission.contacts.filter((c) => c.Job).every((c) => c.open), 'S and K open right away');
  check(!sms2.some(([n]) => n === 'sms'), 'no intro texts after a restore');
  check(/Välj uppdrag/.test(g2.mission.objective), `objective points to the map (${g2.mission.objective})`);
  // finish the other two through the manager and get the end card
  g2.mission.done.add('pizza');
  g2.mission.done.add('race');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(sms2.some(([n]) => n === 'endcard'), 'end card when all three are done');
  check(g2.mission.objective === 'Fri lek: utforska Sjuby', 'free roam afterwards');
  check(!new Game({ seed: 7, traffic: 0, peds: 0 }).mission.restore({ v: 1, stage: 'free' }), 'old v0.1 saves are ignored');
}

console.log(fails ? `\n${fails} check(s) failed` : '\nAll mission checks passed');
process.exit(fails ? 1 : 0);
