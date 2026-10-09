// Missions: the quest log (accept, wait, follow), the pizza job, the street race, tant Gun's flag,
// failing, saving and the end card.
import { Game } from '../src/game.js';
import { PIZZERIA, MACKEN, DELIVERY, PIZZA_CAR, GUN, TOWER_DOOR, SAMUEL_REWARD, PIER_BENCH, PIER_MEET, HANDOVER_REWARD, CURB_H, ISLAND, GUN_GATE, GUN_BIKE, BIKE_REWARD, LIVS_DOOR, INGVAR, LIVS_REWARD, EGG_BONUS, EGGS } from '../src/config.js';
import { SHOP } from '../src/shop.js';
import { ISLE, onIsle } from '../src/island.js';
import { routePoints } from '../src/route.js';
import { CHASE, ESCAPE_BONUS } from '../src/bikejob.js';
import { INT, inFlat } from '../src/interior.js';
import { raceRoute, TOUCH_PACE } from '../src/race.js';
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
  check(g.mission.known.has('pizza'), 'Sanna has texted and the S marker is open');
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
  check(g.peds.list.every((q) => !q.keep || q.npc), 'customers are ordinary pedestrians again');
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

// ---------- 5b. with the touch controls Kim and Bosse take it easier ----------
{
  console.log('Gatloppet med pekskärm');
  const race = (touch, skill, switchAt = -1) => {
    const g = new Game({ seed: 7, traffic: 0, peds: 0 });
    const ev = record(g, ['banner']);
    run(g, 19);
    const car = g.addVehicle('sedan', 'blue', MACKEN.x - 12, MACKEN.z, Math.PI / 2);
    enterCar(g, car);
    car.x = MACKEN.x; car.z = MACKEN.z; car.h = Math.PI / 2; car.vx = car.vz = car.w = 0;
    run(g, 5, { ...idle, touch: touch && switchAt < 0 });
    const job = g.mission.active;
    const paceAtStart = job.racers.map((r) => r.skill / r.baseSkill);
    const route = raceRoute(), st = { dist: -4 };
    let t = 0;
    while (g.mission.active && t < 300) {
      car.repair();
      g.step(DT, { ...autopilot(g, route, st, skill), touch: touch && t >= switchAt });
      t += DT;
      if (switchAt >= 0 && Math.abs(t - switchAt - 0.5) < DT / 2) job.paceMid = job.racers.map((r) => r.skill / r.baseSkill);
    }
    const b = ev.filter(([n]) => n === 'banner').pop();
    return { won: !!(b && b[1].kind !== 'fail' && g.mission.done.has('race')), t, paceAtStart, paceMid: job.paceMid };
  };
  const keys = race(false, 0.7), phone = race(true, 0.7), late = race(true, 0.7, 10);
  console.log(`  autopilot at 70 %: keyboard ${keys.won ? 'wins' : 'loses'} (${keys.t.toFixed(0)} s), touch ${phone.won ? 'wins' : 'loses'} (${phone.t.toFixed(0)} s)`);
  check(keys.paceAtStart.every((k) => Math.abs(k - 1) < 1e-9), 'keyboard: Kim and Bosse at full pace');
  check(phone.paceAtStart.every((k) => Math.abs(k - TOUCH_PACE) < 1e-9), `touch: Kim and Bosse at ${Math.round(TOUCH_PACE * 100)} % pace`);
  check(!keys.won && phone.won, 'a driver who loses with the keyboard wins on the phone');
  check(late.paceMid && late.paceMid.every((k) => Math.abs(k - TOUCH_PACE) < 1e-9), 'touching the screen mid-race slows them down too');
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
  check(!sms2.some(([n]) => n === 'sms'), 'no texts repeated after a restore');
  run(g2, 7);
  check(sms2.some(([n, d]) => n === 'sms' && d.offer === 'pizza'), 'quests not offered yet arrive on schedule');
  check(/Nytt uppdrag/.test(g2.mission.objective), `objective asks you to pick a quest (${g2.mission.objective})`);
  // finish the other three through the manager and get the end card
  g2.mission.done.add('pizza');
  g2.mission.done.add('race');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(!sms2.some(([n]) => n === 'endcard'), 'no end card while the main quest is left');
  g2.mission.done.add('samuel');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(!sms2.some(([n]) => n === 'endcard'), 'no end card while the handover on the pier is left');
  g2.mission.done.add('overlamning');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(!sms2.some(([n]) => n === 'endcard'), "no end card while Arne's bike is left");
  g2.mission.done.add('cykel');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(sms2.some(([n]) => n === 'endcard'), 'end card when all six are done');
  check(sms2.some(([n, d]) => n === 'sms' && /version 0\.6/.test(d.text) && /bageriet/.test(d.text)), 'the last text: version 0.6, continued at the bakery');
  check(g2.mission.objective === 'Fri lek: utforska Sjuby' || g2.mission.choose, `free roam afterwards (${g2.mission.objective})`);
  check(!new Game({ seed: 7, traffic: 0, peds: 0 }).mission.restore({ v: 1, stage: 'free' }), 'old v0.1 saves are ignored');
  // a save from version 0.2 (no quest log yet): Lasse, Sanna and Kim were all in touch
  const g3 = new Game({ seed: 7, traffic: 0, peds: 0 });
  check(g3.mission.restore({ v: 2, money: 5200, done: ['red', 'lasse'], stats: {} }), 'a v0.2 save loads');
  run(g3, 1);
  check(g3.mission.isOpen('pizza') && g3.mission.isOpen('race') && !g3.mission.newCount(), 'v0.2 save: pizza and race are waiting in the list');
  check(g3.mission.objective === 'Välj ett uppdrag i listan', `v0.2 save: pick a quest (${g3.mission.objective})`);
}

// ---------- 7. the quest log: accept, wait, follow ----------
{
  console.log('Quest log');
  const g = new Game({ seed: 7 });
  const ev = record(g, ['sms', 'tracked', 'hint']);
  run(g, 2);
  const m = g.mission;
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'lasse'), "Lasse's SMS is an offer you can answer");
  check(m.newCount() === 1 && m.choose && m.objective === 'Nytt uppdrag – välj i listan', 'objective box asks you to pick');
  check(!m.targets.some((t) => t.kind === 'car') && !m.targets.some((t) => t.gps), 'no arrows or GPS before you accept');
  check(m.accept('lasse') && m.tracked === 'lasse', 'accept → following Lasse');
  run(g, 0.1);
  check(m.objective === 'Sno en röd bil', 'objective follows the accepted quest');
  const gps = m.targets.filter((t) => t.gps);
  check(gps.length === 1 && gps[0].kind === 'car' && gps[0].car.isRed, 'the yellow line leads to the nearest red car');
  check(ev.some(([n]) => n === 'tracked'), "'tracked' event (the map flashes)");
  run(g, 8);
  check(m.newCount() === 1 && m.list().find((q) => q.id === 'pizza').state === 'new', "Sanna's offer is new in the list");
  m.wait('pizza');
  check(m.list().find((q) => q.id === 'pizza').state === 'waiting' && m.tracked === 'lasse', 'wait → in the list, Lasse still followed');
  const sMarker = m.targets.find((t) => t.letter === 'S');
  check(sMarker && !sMarker.gps, 'S is on the map without GPS while you wait');
  m.accept('pizza');
  run(g, 0.1);
  check(m.tracked === 'pizza' && m.targets.find((t) => t.letter === 'S').gps && m.objective === 'Gå till pizzerian (S)', 'pick it later → GPS to the pizzeria');
  check(!m.targets.some((t) => t.kind === 'car'), "red-car arrows only for the quest you follow");
  check(m.list()[0].id === 'pizza' && m.list()[0].state === 'tracked', 'the followed quest is first in the list');
}

// ---------- 8. red car during the pizza job counts; following returns afterwards ----------
{
  console.log('Red car in the middle of another job');
  const g = new Game({ seed: 7 });
  const m = g.mission;
  run(g, 10);
  m.accept('lasse');
  g.player.x = PIZZERIA.x; g.player.z = PIZZERIA.z;
  run(g, 0.5);
  check(m.active && m.active.id === 'pizza' && m.tracked === 'pizza', 'walking into S starts the pizza job and follows it');
  const job = m.active;
  enterCar(g, g.pizzaCar);
  g.step(DT, { ...idle, action: true }); run(g, 1); // out again
  const red = g.vehicles.find((v) => v.parkedSpot && v.isRed);
  const money0 = g.money;
  check(enterCar(g, red), 'player takes the red car during the pizza job');
  check(m.lasse === 'deliver_wait' && m.done.has('red') && g.money === money0 + 1000, 'stealing it counts for Lasse right away (+1 000 kr)');
  check(m.active === job, 'the pizza job keeps running');
  m.accept('race'); // Kim's quest is not offered yet → ignored
  run(g, 9);
  check(m.known.has('race'), "Kim's offer arrived");
  check(m.accept('race') && m.prevTracked === 'race', 'accepting during a job queues it');
  g.step(DT, { ...idle, action: true }); run(g, 1);
  enterCar(g, g.pizzaCar);
  for (const s of [...job.stops]) { parkAt(g, s.x, s.z, 0); run(g, 0.3); }
  check(!m.active && m.done.has('pizza'), 'pizza job done');
  check(m.tracked === 'race', 'afterwards you follow the queued quest');
  run(g, 4);
  check(m.objective === 'Kör till Macken (K)', `objective: ${m.objective}`);
  // a red car you are already sitting in counts too
  const g2 = new Game({ seed: 8, traffic: 0, peds: 0 });
  run(g2, 0.1);
  const r2 = g2.vehicles.find((v) => v.parkedSpot && v.isRed);
  enterCar(g2, r2);
  check(g2.mission.lasse === 'intro', 'before Lasse texts, a red car is just a car');
  run(g2, 1.5);
  check(g2.mission.lasse === 'deliver_wait' || g2.mission.lasse === 'deliver', 'sitting in a red car when Lasse texts counts');
}

// ---------- 9. side quest: tant Gun's flag ----------
{
  console.log('Flaggan i topp');
  const g = new Game({ seed: 7, traffic: 0 });
  const m = g.mission;
  const ev = record(g, ['offer', 'banner', 'say', 'toast']);
  run(g, 3);
  check(!m.targets.some((t) => t.letter === 'G'), 'G is not on the map at first');
  run(g, 22);
  const gTarget = m.targets.find((t) => t.letter === 'G');
  check(gTarget && gTarget.badgeOnly && Math.hypot(gTarget.x - GUN.x, gTarget.z - GUN.z) < 1, 'G above tant Gun after a while');
  const gun = m.flag.gun;
  check(gun.state === 'stand' && g.peds.list.includes(gun), 'tant Gun stands in her front garden');
  g.player.x = GUN.x + 1.6; g.player.z = GUN.z + 0.4;
  run(g, 0.2);
  check(m.prompt === 'PRATA' && gun.wave, 'next to her: PRATA, and she waves');
  g.step(DT, { ...idle, action: true });
  check(ev.some(([n, d]) => n === 'offer' && d.id === 'flag'), 'talking opens her offer');
  check(m.known.has('flag') && g.player.state === 'foot', 'it is in the list (and you did not steal anything)');
  m.accept('flag');
  run(g, 0.2);
  check(m.objective === 'Hissa flaggan hos tant Gun', 'objective: hoist the flag');
  check(m.targets.some((t) => t.kind === 'zone' && t.gps && Math.hypot(t.x - GUN.poleX, t.z - GUN.poleZ) < 0.1), 'GPS + zone at the flagpole');
  g.player.x = GUN.poleX + 1.2; g.player.z = GUN.poleZ + 0.3;
  run(g, 0.2);
  check(m.prompt === 'HISSA', 'at the pole: HISSA');
  run(g, 1, { ...idle, actionHeld: true });
  const h1 = m.flag.h;
  check(h1 > 0.25 && h1 < 0.4 && g.player.body.pose === 1, `holding the button pulls the flag up (${Math.round(h1 * 100)} %)`);
  run(g, 1);
  check(m.flag.h === h1, 'letting go: the flag stays where it is');
  const money0 = g.money;
  run(g, 2.5, { ...idle, actionHeld: true });
  check(m.flag.h === 1 && m.done.has('flag'), 'flag at the top → side quest done');
  check(g.money === money0 + GUN.reward, `pays ${GUN.reward} kr`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'SIDOUPPDRAG KLART'), 'SIDOUPPDRAG KLART banner');
  run(g, 4.5);
  check(ev.some(([n, d]) => n === 'toast' && /kanelbulle/.test(d.text)), 'and a kanelbulle');
  check(!m.targets.some((t) => t.letter === 'G'), 'G gone from the map');
  check(!m.flags.allDone, 'the side quest does not end the game');
  const save = JSON.parse(JSON.stringify(m.progress()));
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore(save);
  check(g2.mission.flag.h === 1 && g2.mission.done.has('flag'), 'the flag stays up after a restore');
}

// ---------- 10. main quest, part 1: Samuel's bike keys ----------
// walk toward (x, z) at a sneaking pace (the stick half way), camera behind facing north
function walkTo(g, x, z, mag = 0.5, max = 15) {
  const p = g.player;
  for (let t = 0; t < max; t += DT) {
    if (!g.mission.active && p.frozen) return false;
    const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { g.step(DT, idle); return true; }
    const ux = dx / d, uz = dz / d, y = Math.PI;
    g.step(DT, { ...idle, moveX: (-ux * Math.cos(y) + uz * Math.sin(y)) * mag, moveY: (ux * Math.sin(y) + uz * Math.cos(y)) * mag, camYaw: y });
  }
  return false;
}
function waitUntil(g, cond, max = 30) { for (let t = 0; t < max; t += DT) { if (cond()) return true; g.step(DT, idle); } return false; }
function intoTower(g) {
  g.mission.offer('samuel'); g.mission.accept('samuel');
  g.player.x = TOWER_DOOR.x; g.player.z = TOWER_DOOR.z;
  run(g, 1.4);
}
const X0 = INT.corridor.x0, Z0 = INT.corridor.z0;
{
  console.log('Samuels cykelnycklar (huvuduppdrag)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  const ev = record(g, ['sms', 'banner', 'toast', 'fade', 'indoor', 'keys', 'caught', 'say']);
  run(g, 30);
  check(!m.known.has('samuel'), 'no main quest in the first half minute');
  run(g, 11);
  const offer = ev.find(([n, d]) => n === 'sms' && d.offer === 'samuel');
  check(offer && offer[1].from === 'Okänt nummer', 'after 40 s an unknown number texts about Samuel');
  check(m.info('samuel').main && m.list().find((q) => q.id === 'samuel').main, 'it is a main quest (offer card and list)');
  m.accept('samuel');
  run(g, 0.1);
  const q = m.targets.find((t) => t.letter === '?');
  check(q && q.gps && Math.hypot(q.x - TOWER_DOOR.x, q.z - TOWER_DOOR.z) < 0.1, 'the ? marker and the GPS lead to the tower door');
  check(/höghuset/.test(m.objective), `objective: ${m.objective}`);
  // in a car: you have to walk in
  const car = g.addVehicle('sedan', 'blue', TOWER_DOOR.x - 6, TOWER_DOOR.z + 1, Math.PI / 2);
  enterCar(g, car);
  parkAt(g, TOWER_DOOR.x, TOWER_DOOR.z + 0.4, Math.PI / 2);
  check(!m.active && ev.some(([n, d]) => n === 'toast' && /Kliv ur bilen/.test(d.text)), 'driving into the door does not start it');
  parkAt(g, TOWER_DOOR.x + 8, TOWER_DOOR.z + 6, Math.PI / 2); // drive off, park, get out
  g.step(DT, { ...idle, action: true }); run(g, 1);
  check(g.player.state === 'foot' && !m.active, 'parked away from the door, on foot');
  g.player.x = TOWER_DOOR.x; g.player.z = TOWER_DOOR.z;
  run(g, 1.4);
  check(m.active && m.active.id === 'samuel' && g.indoor, 'walking in through the door: the lift up to floor 7');
  check(ev.some(([n, d]) => n === 'fade' && d.on) && ev.some(([n, d]) => n === 'indoor' && d.on), 'fade to black on the way in');
  const sam = g.indoors.samuel;
  check(sam && sam.ped.state === 'lounge' && g.peds.list.includes(sam.ped), 'Samuel lounges on his sofa');
  check(Math.hypot(g.player.x - INT.spawn.x, g.player.z - INT.spawn.z) < 0.3 && g.world.groundHeight(g.player.x, g.player.z) === INT.y, 'you step out of the lift on floor 7');
  // the walls hold
  walkTo(g, X0 + 20, Z0 + 1.2, 0.5, 6);
  check(g.player.x < X0 + 15, 'the corridor ends at its window');
  // into the flat and behind the sofa to the kitchen corner
  walkTo(g, X0 + 2.1, Z0 + 1.6); walkTo(g, X0 + 2.1, Z0 + 3.3);
  check(inFlat(g.player.x, g.player.z), "through Samuel's door");
  walkTo(g, X0 + 7.0, Z0 + 3.2); walkTo(g, X0 + 9.0, Z0 + 3.4); walkTo(g, X0 + 9.0, Z0 + 4.4);
  check(!sam.caught && sam.meter < 0.2, 'sneaking behind him, nobody notices');
  check(!sam.los(g.player.x, g.player.z), 'the stub wall hides the kitchen corner from the sofa');
  check(waitUntil(g, () => sam.mode === 'look'), 'now and then he looks up');
  waitUntil(g, () => sam.cone.on > 0.5 || sam.mode !== 'look', 2);
  check(sam.cone.on > 0.5 && !sam.seen, 'his gaze shows on the floor, but the corner stays hidden');
  check(waitUntil(g, () => sam.mode === 'phone' && sam.t > 2.5), '… and goes back to his phone');
  walkTo(g, X0 + 9.2, Z0 + 6.5);
  check(m.prompt === 'TA', 'at the table: TA');
  const money0 = g.money;
  g.step(DT, { ...idle, action: true });
  check(m.active.keys && ev.some(([n]) => n === 'keys'), 'the keys are yours');
  walkTo(g, X0 + 9.0, Z0 + 4.4);
  run(g, 1.2);
  check(sam.mode === 'warn' || sam.mode === 'look', 'the jingle makes him look up');
  check(waitUntil(g, () => sam.mode === 'phone' && sam.t > 2.5), 'he settles again');
  walkTo(g, X0 + 9.0, Z0 + 3.3); walkTo(g, X0 + 2.1, Z0 + 3.3); walkTo(g, X0 + 2.1, Z0 + 1.6);
  check(m.done.has('samuel') && !m.active, 'out in the corridor with the keys → main quest done');
  check(g.money === money0 + SAMUEL_REWARD && ev.some(([n, d]) => n === 'banner' && d.title === 'HUVUDUPPDRAG KLART'), `HUVUDUPPDRAG KLART, ${SAMUEL_REWARD} kr`);
  check(g.indoors.doorShut, 'the door shuts behind you');
  walkTo(g, X0 + 2.1, Z0 + 3.3, 0.5, 3);
  check(!inFlat(g.player.x, g.player.z), 'and you cannot get back in');
  run(g, 4);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Okänt nummer' && /cykeln/.test(d.text)), 'the unknown number texts about the bike');
  // down in the lift
  walkTo(g, X0 + 0.6, Z0 + 1.2);
  check(m.prompt === 'HISS', 'at the lift: HISS');
  g.step(DT, { ...idle, action: true });
  run(g, 1.2);
  check(!g.indoor && Math.hypot(g.player.x - TOWER_DOOR.x, g.player.z - TOWER_DOOR.z) < 3, 'back out on the square');
  check(!g.indoors.samuel && !g.peds.list.some((p) => p.npc === 'samuel'), 'Samuel stays upstairs');
  check(!m.targets.some((t) => t.letter === '?'), 'the ? is gone from the map');
}
{
  console.log('Samuel ser dig');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  const ev = record(g, ['banner', 'sms', 'caught']);
  run(g, 1);
  intoTower(g);
  const sam = g.indoors.samuel;
  walkTo(g, X0 + 2.1, Z0 + 1.6); walkTo(g, X0 + 2.1, Z0 + 3.3);
  walkTo(g, X0 + 1.6, Z0 + 8.6); walkTo(g, X0 + 4.5, Z0 + 8.6); // right in front of him
  waitUntil(g, () => sam.caught || !m.active, 15);
  check(sam.caught && ev.some(([n]) => n === 'caught'), 'standing in front of the sofa: he sees you');
  check(g.player.frozen, 'you freeze');
  run(g, 3);
  check(!g.indoor && !g.player.frozen, 'thrown out onto the square');
  check(ev.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /Samuel såg dig/.test(d.sub)), 'UPPDRAG MISSLYCKAT: Samuel såg dig');
  check(m.isOpen('samuel') && m.tracked === 'samuel', 'the quest is still open (try again)');
  // running is loud
  const g2 = new Game({ seed: 11, traffic: 0, peds: 0 });
  run(g2, 1);
  intoTower(g2);
  const s2 = g2.indoors.samuel;
  walkTo(g2, X0 + 2.1, Z0 + 1.6); walkTo(g2, X0 + 2.1, Z0 + 3.3);
  const heard = () => s2.mode !== 'phone';
  walkTo(g2, X0 + 6.5, Z0 + 3.2, 1.0, 4);
  check(heard() || s2.heardT > 0, 'running behind him: he hears you');
  // leaving by the lift without the keys is not a failure
  const g3 = new Game({ seed: 7, traffic: 0, peds: 0 });
  const ev3 = record(g3, ['banner', 'sms']);
  run(g3, 1);
  intoTower(g3);
  run(g3, 0.5);
  walkTo(g3, X0 + 0.6, Z0 + 1.2);
  g3.step(DT, { ...idle, action: true });
  run(g3, 1.5);
  check(!g3.indoor && !g3.mission.active && !ev3.some(([n, d]) => n === 'banner' && d.kind === 'fail'), 'taking the lift down without the keys: no failure');
  check(g3.mission.isOpen('samuel'), '… and the quest waits');
}

// ---------- 11. main quest, part 2: the handover on the pier ----------
{
  console.log('Överlämningen (huvuduppdrag del 2)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission, gun = m.flag.gun;
  const ev = record(g, ['sms', 'banner', 'toast', 'talk', 'keys', 'say']);
  run(g, 1);
  m.offer('overlamning');
  check(!m.known.has('overlamning'), "no handover before Samuel's keys");
  check(!m.list().some((q) => q.id === 'cykel'), 'and no teaser in the list yet');
  // part 1, the short way: in through the door, the keys in your pocket, out in the corridor
  intoTower(g);
  m.active.keys = true;
  run(g, 0.2);
  check(m.done.has('samuel') && g.indoor, 'part 1 done, still up on floor 7');
  run(g, 10);
  check(!m.known.has('overlamning'), 'not offered while you are in the tower');
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Okänt nummer' && /ut ur huset/.test(d.text)), '"get out of the building" first');
  walkTo(g, X0 + 0.6, Z0 + 1.2);
  g.step(DT, { ...idle, action: true });
  run(g, 1.2);
  check(!g.indoor, 'down on the square');
  run(g, 1.5);
  check(!m.known.has('overlamning'), 'not at once when you come out');
  run(g, 1.5);
  const offer = ev.find(([n, d]) => n === 'sms' && d.offer === 'overlamning');
  check(offer && offer[1].from === 'Okänt nummer' && /bryggan/.test(offer[1].text), 'a few seconds outside: the unknown number wants to meet on the pier');
  check(m.info('overlamning').main, 'it is a main quest');
  run(g, 0.1);
  check(gun.away && gun.disguised && gun.state === 'lounge' && Math.hypot(gun.x - PIER_BENCH.x, gun.z - PIER_BENCH.z) < 0.2, 'someone in a dark coat sits on the bench at the end of the pier');
  check(gun.body.pose === 5 && gun.body.look.shirt !== 0xb48fd0, '… sitting, not in tant Gun\'s purple');
  check(!m.targets.some((t) => t.letter === 'G'), "no G on the map: tant Gun is not at home");
  m.accept('overlamning');
  run(g, 0.1);
  const q = m.targets.find((t) => t.letter === '?');
  check(q && q.gps && Math.hypot(q.x - PIER_MEET.x, q.z - PIER_MEET.z) < 0.1, 'the ? marker and the GPS lead out on the pier');
  check(/bryggan/.test(m.objective), `objective: ${m.objective}`);
  // cars stay off the pier
  const car = g.addVehicle('sedan', 'blue', -75, -128, Math.PI);
  enterCar(g, car);
  run(g, 4, { ...idle, moveY: 1 });
  check(g.player.car === car && car.z < -138 && car.z > -ISLAND, `a car cannot drive onto the pier (stopped at z ${car.z.toFixed(1)})`);
  g.step(DT, { ...idle, action: true }); run(g, 1);
  g.removeVehicle(car);
  // walk out on the pier, between the bollards
  g.player.x = -74.2; g.player.z = -138; g.player.y = g.world.groundHeight(-74.2, -138);
  run(g, 0.1);
  walkTo(g, -74.2, -152, 1.0, 12);
  check(g.player.z < -150 && Math.abs(g.player.y - CURB_H) < 0.05, `you can walk on the pier (z ${g.player.z.toFixed(1)})`);
  walkTo(g, -75.6, -160, 1.0, 12);
  check(!m.active && Math.hypot(g.player.x + 75.6, g.player.z + 160) < 0.4, 'walking along the pier');
  walkTo(g, PIER_MEET.x, PIER_MEET.z, 0.6, 8);
  check(m.active && m.active.id === 'overlamning', 'up behind the bench: the handover begins');
  check(g.player.frozen && g.camFocus && g.camFocus.near, 'you stop taking orders, the camera comes in close');
  waitUntil(g, () => ev.some(([n]) => n === 'talk'), 6);
  check(Math.hypot(g.player.x - (PIER_BENCH.x - 0.3), g.player.z - (PIER_BENCH.z + 1.5)) < 0.15, 'the game walks you up behind the bench');
  const talk = ev.find(([n]) => n === 'talk');
  check(talk && talk[1].id === 'overlamning' && talk[1].pages.length >= 6, `a conversation opens (${talk ? talk[1].pages.length : 0} pages)`);
  const pages = talk ? talk[1].pages : [];
  check(pages[0] && pages[0].who === 'Någon på bänken' && pages[0].letter === '?', 'first the figure on the bench speaks');
  const rev = pages.findIndex((p) => p.fx === 'reveal');
  check(rev > 0 && pages[rev].who === 'Tant Gun', "then it is tant Gun");
  check(pages.some((p) => p.fx === 'keys') && pages.some((p) => p.you), 'you hand over the keys (and get a few lines yourself)');
  check(pages.some((p) => /norra bron/.test(p.text)) && pages.some((p) => /Bullbilen/.test(p.text)), 'a clue: the bike across the north bridge, and the Bullbilen');
  check(/flaggstången/.test(pages[rev].text), 'she has not met you before: "the lady with the flagpole"');
  check(!m.done.has('overlamning'), 'nothing is done while the talk is open');
  m.talkFx('overlamning', 'keys');
  check(ev.some(([n, d]) => n === 'keys' && d.given), 'the keys jingle as you hand them over');
  m.talkFx('overlamning', 'reveal');
  check(!gun.disguised && gun.state === 'stand' && gun.body.look.shirt === 0xb48fd0 && gun.body.pose === 0, 'the coat comes off: tant Gun stands up');
  const dGun = Math.hypot(gun.x - g.player.x, gun.z - g.player.z);
  check(dGun > 1.4 && dGun < 2.6, `she turns to you, close by (${dGun.toFixed(2)} m)`);
  const money0 = g.money;
  m.talkDone('overlamning');
  check(m.done.has('overlamning') && !m.active, 'the last page: part 2 done');
  check(g.money === money0 + HANDOVER_REWARD && ev.some(([n, d]) => n === 'banner' && d.title === 'HUVUDUPPDRAG KLART' && d.sub === 'Överlämningen'), `HUVUDUPPDRAG KLART, ${HANDOVER_REWARD} kr`);
  check(!g.player.frozen && !g.camFocus, 'you can move again');
  run(g, 9);
  check(ev.some(([n, d]) => n === 'toast' && /kanelbulle/.test(d.text)), 'and a kanelbulle');
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Tant Gun (Storgatan)' && /Bullbilen/.test(d.text)), 'tant Gun texts: keep an eye on the Bullbilen');
  check(gun.away && gun.state === 'stand', 'she stays on the pier while you are there');
  check(!m.list().some((x) => x.id === 'cykel') && m.quest('cykel').after === 'overlamning', 'Arnes budcykel comes next (tant Gun texts about it a little later)');
  check(!m.accept('cykel') && !m.isOpen('cykel') && !m.list().some((x) => x.id === 'cykel' && x.state === 'new'), '… and it cannot be started yet');
  g.player.x = gun.x - 1.2; g.player.z = gun.z + 1.2;
  run(g, 0.2);
  check(m.prompt === 'PRATA', 'you can still talk to her');
  g.step(DT, { ...idle, action: true });
  check(ev.some(([n, d]) => n === 'say' && d.who === gun && /bron|Bullbilen|bullen|Samuel/.test(d.text)), 'she reminds you of the bridge');
  g.player.x = -40; g.player.z = -60; g.player.y = g.world.groundHeight(-40, -60);
  run(g, 0.5);
  check(!gun.away && Math.hypot(gun.x - GUN.x, gun.z - GUN.z) < 0.1, 'when you are gone she is back home on Storgatan');
  // a save between part 1 and part 2
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore({ v: 2, money: 100, done: ['samuel'], known: ['samuel', 'overlamning'], seen: ['samuel'], stats: {} });
  check(g2.mission.isOpen('overlamning'), 'restored: the handover is waiting');
  run(g2, 0.2);
  check(g2.mission.flag.gun.away, 'restored: she waits on the pier');
  const g3 = new Game({ seed: 7, traffic: 0, peds: 0 });
  const ev3 = record(g3, ['sms']);
  g3.mission.restore({ v: 2, money: 100, done: ['samuel'], known: ['samuel'], seen: ['samuel'], stats: {} });
  run(g3, 7);
  check(ev3.some(([n, d]) => n === 'sms' && d.offer === 'overlamning'), 'a v0.4 save with the keys taken: the handover is offered soon after you start');
  const g4 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g4.mission.restore({ v: 2, money: 100, done: [], known: ['samuel', 'overlamning', 'cykel'], seen: [], stats: {} });
  check(!g4.mission.known.has('overlamning') && !g4.mission.known.has('cykel'), 'a save cannot skip ahead in the chain');
}

// ---------- 12. main quest, part 3: Arne's bike, the north bridge and Norrholmen ----------
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function bikeAfterHandover(seed = 7, traffic = 0) {
  const g = new Game({ seed, traffic, peds: 0, trafficTarget: traffic });
  g.mission.restore({ v: 2, money: 0, done: ['lasse', 'pizza', 'race', 'samuel', 'overlamning'], known: ['lasse', 'pizza', 'race', 'samuel', 'overlamning'], seen: ['lasse', 'pizza', 'race', 'samuel', 'overlamning'], stats: {} });
  return g;
}
function unlockAndMount(g) {
  const m = g.mission, b = g.bike;
  g.player.x = b.x + 0.9; g.player.z = b.z - 1.3; g.player.y = g.world.groundHeight(g.player.x, g.player.z);
  run(g, 0.3);
  g.step(DT, { ...idle, action: true }); run(g, 0.2);   // LÅS UPP
  g.step(DT, { ...idle, action: true }); run(g, 0.2);   // CYKLA
  return m.active;
}
{
  console.log('Arnes budcykel (huvuduppdrag del 3)');
  const g0 = new Game({ seed: 7, traffic: 0, peds: 0 });
  run(g0, 1);
  check(g0.bike && g0.bike.type === 'bike' && g0.bike.locked && Math.hypot(g0.bike.x - ISLE.bike.x, g0.bike.z - ISLE.bike.z) < 0.1, "Arne's bike stands locked at lott 7 on Norrholmen");
  check(!g0.gateN.open && g0.layout.colliders.find((c) => c.gate === 'north').h > 1, 'the north bridge is shut at first');
  check(onIsle(40, -300) && !onIsle(40, -200) && g0.world.groundHeight(40, -300) === CURB_H && g0.world.groundHeight(40, -200) === 0, 'Norrholmen is land, the bridge is a road');
  g0.player.x = ISLE.bike.x + 0.9; g0.player.z = ISLE.bike.z - 1.2; run(g0, 0.2);
  check(!g0.player.near, 'a locked bike is no bike to ride');

  const g = bikeAfterHandover();
  const m = g.mission;
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk', 'honk', 'caught', 'fade']);
  run(g, 8);
  check(!m.known.has('cykel') && !g.gateN.open, 'a little while after the handover: nothing yet');
  run(g, 8);
  const offer = ev.find(([n, d]) => n === 'sms' && d.offer === 'cykel');
  check(offer && offer[1].from === 'Tant Gun (Storgatan)' && /norra bron/i.test(offer[1].text), 'tant Gun texts: the north bridge is open, fetch the bike');
  check(g.gateN.open && g.layout.colliders.find((c) => c.gate === 'north').h === 0, 'the gate on the north bridge opens');
  run(g, 3);
  check(g.gateN.k === 1, 'it swings all the way open');
  m.accept('cykel');
  run(g, 0.1);
  const G = m.targets.find((t) => t.letter === 'G' && t.gps);
  check(G && Math.hypot(G.x - ISLE.bike.x, G.z - ISLE.bike.z) < 0.1, 'the GPS leads to lott 7');
  const r = routePoints(g.layout.gps, -33.4, 4, ISLE.bike.x, ISLE.bike.z);
  check(r.some(([x, z]) => x === 40 && z === -178) && r.some(([x, z]) => z < -229), 'the GPS line runs over the north bridge');
  // drive over the bridge (it is open) and walk into the allotments
  const car = g.addVehicle('sedan', 'blue', 40, -150, Math.PI);
  enterCar(g, car);
  run(g, 6, { ...idle, moveY: 1 });
  run(g, 3, { ...idle, handbrake: true });
  check(car.z < -232 && onIsle(car.x, car.z), `you can drive over the bridge to Norrholmen (z ${car.z.toFixed(0)})`);
  g.step(DT, { ...idle, action: true }); run(g, 1.5);
  const job = unlockAndMount(g);
  check(job && job.id === 'cykel' && ev.some(([n, d]) => n === 'banner' && d.title === 'ARNES BUDCYKEL'), 'at the bike: the job begins');
  check(!g.bike.locked && ev.some(([n, d]) => n === 'toast' && /nycklar passade/.test(d.text)), "LÅS UPP: Samuel's keys fit");
  check(g.player.inCar && g.player.car === g.bike && g.player.body.pose === 6, 'on the bike, pedalling');
  run(g, 1.5);
  check(job.van && job.chaser && job.chaser.hold > 0 && ev.some(([n, d]) => n === 'toast' && /Bullbilen/.test(d.text)), 'a Bullbilen van at the bakery has seen you');
  const v0 = { x: job.van.x, z: job.van.z };
  run(g, CHASE.start + 2.5);
  check(Math.hypot(job.van.x - v0.x, job.van.z - v0.z) > 8 && ev.some(([n]) => n === 'honk'), 'a few seconds later it comes after you');
  check(m.targets.some((t) => t.kind === 'racer' && t.car === job.van), 'the van is on the map');
  // caught: the van right up behind you
  const b = g.bike;
  b.x = 40; b.z = -300; b.h = Math.PI; b.vx = b.vz = 0;
  job.van.x = 40; job.van.z = -296.2; job.van.h = Math.PI; job.van.vx = job.van.vz = 0;
  waitUntil(g, () => job.stage === 'caught', 4);
  check(job.stage === 'caught' && ev.some(([n]) => n === 'caught'), 'the van right up behind you: they push you off');
  run(g, 3);
  check(ev.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /Bullbilen tog cykeln/.test(d.sub)), 'UPPDRAG MISSLYCKAT: Bullbilen tog cykeln');
  check(!m.active && m.isOpen('cykel') && g.bike.locked && Math.hypot(g.bike.x - ISLE.bike.x, g.bike.z - ISLE.bike.z) < 0.1, 'the bike is back at lott 7, locked: try again');
  check(!g.racers.length && !job.van.racer, 'the van has stopped chasing');
  // second go: shake them off, then ride up to tant Gun
  run(g, 7);
  const job2 = unlockAndMount(g);
  check(job2 && job2 !== job && job2.stage === 'ride', 'second try');
  run(g, 1.5 + CHASE.start + 1);
  job2.chaseT = CHASE.minChase + 1;
  const vn = job2.van, b2 = g.bike;                                // (a new bike: the old one went back to lott 7)
  vn.x = 100; vn.z = 60; vn.vx = vn.vz = 0;                        // far away, behind the blocks
  b2.x = GUN_GATE.x + 30; b2.z = GUN_GATE.z + 1; b2.h = -Math.PI / 2; b2.vx = b2.vz = 0;
  waitUntil(g, () => job2.escaped, 5);
  check(job2.escaped && ev.some(([n, d]) => n === 'toast' && /skakade av dig Bullbilen/.test(d.text)), 'out of sight and far behind: you shook them off');
  check(job2.chaser.mode === 'home' || job2.chaser.mode === 'done', 'they drive back to the bakery');
  b2.x = GUN_GATE.x + 1; b2.z = GUN_GATE.z; b2.vx = b2.vz = 0;
  run(g, 0.2);
  check(job2.stage === 'deliver' || job2.stage === 'talk', "at tant Gun's gate: the delivery");
  check(!g.player.inCar && g.player.frozen && g.camFocus && g.camFocus.near, 'off the bike, the camera comes in');
  run(g, 1.2);
  const talk = ev.find(([n, d]) => n === 'talk' && d.id === 'cykel');
  check(talk && talk[1].pages.length >= 6 && talk[1].pages.some((p) => /kassaskåpet/.test(p.text)) && talk[1].pages.some((p) => /Receptet/.test(p.text)), 'Gun finds half the recipe – the other half is in the bakery safe');
  check(talk[1].pages.some((p) => p.you && /skakade av/.test(p.text)), 'you tell her you shook them off');
  const money0 = g.money;
  m.talkDone('cykel');
  check(m.done.has('cykel') && !m.active, 'the last page: part 3 done');
  check(g.money === money0 + BIKE_REWARD + ESCAPE_BONUS && ev.some(([n, d]) => n === 'banner' && d.title === 'HUVUDUPPDRAG KLART' && d.sub === 'Arnes budcykel'), `HUVUDUPPDRAG KLART, ${BIKE_REWARD + ESCAPE_BONUS} kr with the bonus`);
  check(!g.player.frozen && !g.camFocus, 'you can move again');
  check(Math.hypot(g.bike.x - GUN_BIKE.x, g.bike.z - GUN_BIKE.z) < 0.1 && !g.bike.locked, "the bike stands by Gun's gate – yours to ride");
  const soon = m.list().find((q) => q.id === 'kassaskap');
  check(soon && soon.state === 'soon' && /bageriet/.test(soon.line), 'next in the list: "Kassaskåpet", coming soon');
  run(g, 10);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Tant Gun (Storgatan)' && /cykeln/.test(d.text)), 'and a text from Gun');
  g.player.x = GUN_BIKE.x - 0.9; g.player.z = GUN_BIKE.z + 0.4; run(g, 0.2);
  check(g.player.near === g.bike, 'you can ride it whenever you like');
  // saved: the bike is by Gun's gate, the bridge open
  const save = JSON.parse(JSON.stringify(m.progress()));
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore(save);
  run(g2, 0.1);
  check(Math.hypot(g2.bike.x - GUN_BIKE.x, g2.bike.z - GUN_BIKE.z) < 0.1 && !g2.bike.locked && g2.gateN.open, "restored: the bike by Gun's gate, the bridge open");
}
// a whole ride: out of the allotments, over the bridge, through town to Gun – the van behind you
{
  console.log('Arnes budcykel: hela vägen');
  for (const [name, traffic] of [['utan trafik', 0], ['med trafik', 12]]) {
    const g = bikeAfterHandover(7, traffic);
    const m = g.mission;
    run(g, 16);
    m.accept('cykel');
    const job = unlockAndMount(g);
    const wps = [[7.5, -309.2], [24, -309], [31, -309], [38, -309]];
    for (const p of routePoints(g.layout.gps, 38, -309, GUN_GATE.x, GUN_GATE.z).slice(1)) wps.push(p);
    let wi = 0, t = 0, vanRun = 0, lastVan = null, minD = 1e9;
    while (t < 110 && m.active === job && job.stage === 'ride' || (t < 110 && job.stage === 'mount')) {
      const c = g.player.inCar ? g.player.car : null;
      let inp = idle;
      if (c) {
        while (wi < wps.length - 1 && Math.hypot(wps[wi][0] - c.x, wps[wi][1] - c.z) < 4) wi++;
        const err = wrapA(Math.atan2(wps[wi][0] - c.x, wps[wi][1] - c.z) - c.h);
        inp = { ...idle, moveY: 1, moveX: clamp(-err * 2.2, -1, 1) };
        if (Math.hypot(GUN_GATE.x - c.x, GUN_GATE.z - c.z) < 12) inp = { ...idle, handbrake: c.speed > 2.5, moveY: c.speed > 2.5 ? 0 : 0.3, moveX: inp.moveX };
      }
      g.step(DT, inp); t += DT;
      if (job.van) {
        if (lastVan) vanRun += Math.hypot(job.van.x - lastVan.x, job.van.z - lastVan.z);
        lastVan = { x: job.van.x, z: job.van.z };
        minD = Math.min(minD, Math.hypot(job.van.x - g.player.x, job.van.z - g.player.z));
      }
    }
    console.log(`  ${name}: ${job.stage} after ${t.toFixed(0)} s, the van drove ${vanRun.toFixed(0)} m, closest ${minD.toFixed(0)} m${job.escaped ? ', shaken off' : ''}`);
    if (!traffic) check(job.stage === 'deliver' || job.stage === 'talk', `${name}: riding flat out on the roads gets the bike to Gun`);
    else check(['deliver', 'talk', 'caught'].includes(job.stage), `${name}: it ends one way or the other (this rider does not dodge cars)`);
    check(vanRun > 250, `${name}: the van chased you all the way (${vanRun.toFixed(0)} m)`);
  }
}

// ---------- 13. side quest: "Fyrvaktarens kasse" – from Hörnlivs to the lighthouse ----------
function livsSave(done) { return { v: 2, money: 0, done, known: done.filter((d) => d !== 'red'), seen: done.filter((d) => d !== 'red'), stats: {} }; }
function intoShop(g) {
  g.player.x = LIVS_DOOR.x; g.player.z = LIVS_DOOR.z; g.player.y = g.world.groundHeight(g.player.x, g.player.z);
  run(g, 1.4);
}
{
  console.log('Fyrvaktarens kasse (sidouppdrag)');
  // not before the north bridge is open
  const g0 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g0.mission.restore(livsSave(['lasse', 'pizza', 'race', 'samuel']));
  const ev0 = record(g0, ['sms']);
  run(g0, 60);
  check(!ev0.some(([n, d]) => n === 'sms' && d.offer === 'livs'), 'no text from Yasmin while the north bridge is shut');

  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave(['lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel']));
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk', 'fade', 'indoor']);
  run(g, 30);
  check(!m.known.has('livs'), 'not right away');
  run(g, 7);
  const offer = ev.find(([n, d]) => n === 'sms' && d.offer === 'livs');
  check(offer && offer[1].from === 'Yasmin (Hörnlivs)' && /Norrholmen/.test(offer[1].text), 'Yasmin at Hörnlivs texts: a delivery out to Norrholmen');
  check(m.info('livs').side && m.list().find((q) => q.id === 'livs').side, 'it is a side quest');
  m.accept('livs');
  run(g, 0.1);
  const Y = m.targets.find((t) => t.letter === 'Y' && t.gps);
  check(Y && Math.hypot(Y.x - LIVS_DOOR.x, Y.z - LIVS_DOOR.z) < 0.1, 'the GPS leads to the shop door on Kungsgatan');
  check(m.objective === 'Gå in på Hörnlivs (Y)', `objective: go into Hörnlivs (${m.objective})`);
  // in a car: no
  const car = g.addVehicle('sedan', 'blue', LIVS_DOOR.x - 2.5, LIVS_DOOR.z, 0);
  enterCar(g, car);
  parkAt(g, LIVS_DOOR.x - 0.5, LIVS_DOOR.z, 0);
  run(g, 0.5);
  check(!m.active && ev.some(([n, d]) => n === 'toast' && /till fots/.test(d.text)), 'you cannot drive into the shop');
  parkAt(g, LIVS_DOOR.x - 6, LIVS_DOOR.z + 8, 0);  // (out of the car right by the door would take you in)
  g.step(DT, { ...idle, action: true }); run(g, 1);
  check(!g.player.inCar && !m.active, 'parked a bit further off, out of the car');
  // walk in: the shop
  intoShop(g);
  const job = m.active;
  check(job && job.id === 'livs' && g.indoor && g.indoors.where === 'shop', 'walking to the door takes you into Hörnlivs');
  check(Math.hypot(g.player.x - SHOP.spawn.x, g.player.z - SHOP.spawn.z) < 0.3 && Math.abs(g.player.y - SHOP.y) < 0.01, 'you stand inside the door, on the shop floor');
  check(job.yasmin && Math.hypot(job.yasmin.x - SHOP.yasmin.x, job.yasmin.z - SHOP.yasmin.z) < 0.1, 'Yasmin stands behind the till');
  check(m.prompt !== 'GÅ UT', 'not at the door the moment you come in');
  // nobody gets behind the till
  walkTo(g, SHOP.yasmin.x, SHOP.yasmin.z, 1, 4);
  check(g.player.z > SHOP.room.z0 + 3.7, `the counter is in the way (z ${(g.player.z - SHOP.room.z0).toFixed(2)})`);
  check(m.prompt === 'PRATA', 'at the till: PRATA');
  g.step(DT, { ...idle, action: true }); run(g, 0.2);
  const talk = ev.find(([n, d]) => n === 'talk' && d.id === 'livs');
  check(talk && talk[1].pages.some((pg) => pg.fx === 'bag') && /Ingvar/.test(talk[1].pages.map((pg) => pg.text).join(' ')), 'Yasmin tells you about Ingvar the lighthouse keeper');
  check(g.player.frozen && job.stage === 'talk', 'you stand still while she talks');
  m.talkFx('livs', 'bag');
  check(job.bag, 'she hands you the bag');
  m.talkDone('livs');
  run(g, 0.2);
  check(job.stage === 'bag' && !g.player.frozen && m.objective === 'Gå ut med kassen', 'then out of the shop with it');
  // the door
  walkTo(g, SHOP.door.x, SHOP.door.z, 1, 6);
  check(m.prompt === 'GÅ UT', 'at the door: GÅ UT');
  g.step(DT, { ...idle, action: true }); run(g, 1.4);
  check(!g.indoor && Math.hypot(g.player.x - (LIVS_DOOR.x - 1.1), g.player.z - (LIVS_DOOR.z - 0.6)) < 0.3, 'back out on the sidewalk on Kungsgatan');
  check(!g.peds.list.includes(job.yasmin || {}) && job.stage === 'carry', 'Yasmin stays in the shop, you carry the bag');
  check(m.objective === 'Kör kassen till fyren' && /12 hela ägg/.test(m.sub), `objective: to the lighthouse, 12 eggs (${m.sub})`);
  const ing = m.ingvar;
  check(ing && Math.hypot(ing.x - INGVAR.x, ing.z - INGVAR.z) < 0.1 && onIsle(ing.x, ing.z) && g.world.groundHeight(ing.x, ing.z) === CURB_H, 'Ingvar waits outside his cottage by the lighthouse');
  check(!g.world.query(INGVAR.x, INGVAR.z, 1.2).some((c) => c.h > 0.5 && c.t === 'box' && INGVAR.x > c.x0 - 0.6 && INGVAR.x < c.x1 + 0.6 && INGVAR.z > c.z0 - 0.6 && INGVAR.z < c.z1 + 0.6), 'nothing in the way around him');
  const Z = m.targets.find((t) => t.kind === 'zone' && t.gps);
  check(Z && Math.hypot(Z.x - INGVAR.x, Z.z - INGVAR.z) < 0.1, 'the GPS leads to the lighthouse');
  const r = routePoints(g.layout.gps, g.player.x, g.player.z, INGVAR.x, INGVAR.z);
  check(r.some(([x, z]) => x === 40 && z === -178), 'over the north bridge');
  // knocks crack eggs
  const c2 = g.addVehicle('sedan', 'blue', g.player.x - 3, g.player.z, 0);
  enterCar(g, c2);
  g.emit('crash', { x: c2.x, z: c2.z, impact: 6, player: true, car: c2 });
  g.emit('crash', { x: c2.x, z: c2.z, impact: 9, player: true, car: c2 }); // the same crash, a moment later
  check(job.eggs === EGGS - 2, `a hard knock cracks two eggs (${job.eggs} left)`);
  run(g, 1);
  g.emit('crash', { x: c2.x, z: c2.z, impact: 2.5, player: true, car: c2 });
  g.emit('crash', { x: c2.x, z: c2.z, impact: 8, player: false, car: c2 });
  check(job.eggs === EGGS - 2, 'a bump, or somebody else\'s crash: no harm');
  check(/10 hela ägg/.test(m.sub) && ev.some(([n, d]) => n === 'toast' && /ägg sprack/.test(d.text)), 'the objective counts the eggs that are left');
  // at the cottage: in the car nothing happens, on foot Ingvar takes the bag
  parkAt(g, INGVAR.x - 2, INGVAR.z + 3, 0);
  run(g, 0.5);
  check(job.stage === 'carry', 'not from the car');
  g.step(DT, { ...idle, action: true }); run(g, 1);
  g.player.x = INGVAR.x + 0.4; g.player.z = INGVAR.z + 2.0; g.player.y = g.world.groundHeight(g.player.x, g.player.z);
  const money0 = g.money;
  run(g, 1.2);
  const talk2 = ev.find(([n, d]) => n === 'talk' && d.id === 'livs' && d !== talk[1]);
  check(job.stage === 'meet' && talk2 && /10 hela ägg/.test(talk2[1].pages.map((pg) => pg.text).join(' ')), 'Ingvar counts the eggs');
  check(/Bullbilens/.test(talk2[1].pages.map((pg) => pg.text).join(' ')), 'and tells you about a light in the bakery office');
  m.talkDone('livs');
  run(g, 0.5);
  check(m.done.has('livs') && !m.active, 'side quest done');
  check(g.money - money0 === LIVS_REWARD + 10 * EGG_BONUS, `paid ${LIVS_REWARD} + 10 × ${EGG_BONUS} kr (got ${g.money - money0})`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'SIDOUPPDRAG KLART' && /Fyrvaktarens kasse/.test(d.sub)), 'SIDOUPPDRAG KLART banner');
  run(g, 9);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Yasmin (Hörnlivs)' && /Ingvar ringde/.test(d.text)), 'Yasmin texts: Ingvar called');
  check(!g.player.frozen && !g.camFocus, 'you can move again');
  // saved: Ingvar is at his cottage
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore(JSON.parse(JSON.stringify(m.progress())));
  check(g2.mission.done.has('livs') && g2.mission.ingvar && g2.peds.list.includes(g2.mission.ingvar), 'restored: done, and Ingvar is out by the lighthouse');
  const ev2 = record(g2, ['sms']);
  run(g2, 40);
  check(!ev2.some(([n, d]) => n === 'sms' && d.offer === 'livs'), 'and Yasmin does not ask again');

  // walking out without the bag: no failure, the marker comes back
  const g3 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g3.mission.restore(livsSave(['lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel']));
  const ev3 = record(g3, ['sms', 'banner']);
  g3.mission.offer('livs'); g3.mission.accept('livs');
  intoShop(g3);
  walkTo(g3, SHOP.door.x, SHOP.door.z, 1, 6);
  g3.step(DT, { ...idle, action: true }); run(g3, 1.4);
  check(!g3.indoor && !g3.mission.active && !ev3.some(([n, d]) => n === 'banner' && d.kind === 'fail'), 'out without the bag: no failure');
  run(g3, 1);
  check(ev3.some(([n, d]) => n === 'sms' && d.from === 'Yasmin (Hörnlivs)' && /Kassen står kvar/.test(d.text)), 'Yasmin: the bag is still on the counter');
  check(!g3.peds.list.some((q) => q.npc === 'yasmin'), 'Yasmin is not left behind out at sea');
  g3.player.x = LIVS_DOOR.x - 8; run(g3, 4);
  intoShop(g3);
  check(g3.mission.active && g3.mission.active.id === 'livs' && g3.indoor, 'and you can go in again');
  // all twelve eggs whole
  const j3 = g3.mission.active;
  j3.talkFx('bag'); j3.stage = 'talk'; j3.talkDone();
  walkTo(g3, SHOP.door.x, SHOP.door.z, 1, 6);
  g3.step(DT, { ...idle, action: true }); run(g3, 1.4);
  g3.player.x = INGVAR.x; g3.player.z = INGVAR.z + 2.2; run(g3, 1.2);
  const m3 = g3.money; j3.talkDone(); run(g3, 0.3);
  check(g3.money - m3 === LIVS_REWARD + EGGS * EGG_BONUS, `twelve whole eggs: ${LIVS_REWARD + EGGS * EGG_BONUS} kr`);
}

console.log(fails ? `\n${fails} check(s) failed` : '\nAll mission checks passed');
process.exit(fails ? 1 : 0);
