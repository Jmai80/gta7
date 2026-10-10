// Missions: the quest log (accept, wait, follow), the pizza job, the street race, tant Gun's flag,
// failing, saving and the end card.
import { Game } from '../src/game.js';
import { PIZZERIA, MACKEN, DELIVERY, PIZZA_CAR, GUN, TOWER_DOOR, SAMUEL_REWARD, PIER_BENCH, PIER_MEET, HANDOVER_REWARD, CURB_H, ISLAND, GUN_GATE, GUN_BIKE, BIKE_REWARD, LIVS_DOOR, INGVAR, LIVS_REWARD, EGG_BONUS, EGGS, OFFICE_DOOR, SAFE_TIME, SAFE_REWARD, LEIF, LEIF_MARK, SAMUEL_WAIT, KEY_TIME, KEY_REWARD, KONDITORI, PICKUPS, OPENING_REWARD, LASSE_SHOP, JUMP_GOAL, JUMP_REWARD, JUMP_START, JAR, FACTORY_START, TAIL, SITE_OFFICE, FACTORY_REWARD, BIKE_RETURN, HOME_DELIVERY, SALON_DOOR, SALON_PAY, FEST } from '../src/config.js';
import { SALON, TOOLS as SALON_TOOLS } from '../src/salon.js';
import { CAR_TYPES } from '../src/vehicle.js';
import { OFFICE } from '../src/office.js';
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
  check(!sms2.some(([n]) => n === 'endcard'), 'no end card while the safe is left');
  g2.mission.done.add('kassaskap');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(!sms2.some(([n]) => n === 'endcard'), 'no end card while the konditori is left');
  g2.mission.done.add('konditori');
  g2.mission.done.add('syltburken');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(!sms2.some(([n]) => n === 'endcard'), 'no end card while the factory is left');
  g2.mission.done.add('fabriken');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(!sms2.some(([n]) => n === 'endcard'), 'no end card while the bun party is left');
  g2.mission.done.add('bullfest');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(sms2.some(([n]) => n === 'endcard'), 'end card when all eleven are done');
  check(sms2.some(([n, d]) => n === 'sms' && /version 1\.1\.2/.test(d.text) && /Jonte/.test(d.text)), 'the last text: version 1.1.2, Jonte is caught');
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

// ---------- 10. main quest, part 1: Melker's bike keys ----------
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
  console.log('Melkers cykelnycklar (huvuduppdrag)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  const ev = record(g, ['sms', 'banner', 'toast', 'fade', 'indoor', 'keys', 'caught', 'say']);
  run(g, 30);
  check(!m.known.has('samuel'), 'no main quest in the first half minute');
  run(g, 11);
  const offer = ev.find(([n, d]) => n === 'sms' && d.offer === 'samuel');
  check(offer && offer[1].from === 'Okänt nummer', 'after 40 s an unknown number texts about Melker');
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
  check(sam && sam.ped.state === 'lounge' && g.peds.list.includes(sam.ped), 'Melker lounges on his sofa');
  check(Math.hypot(g.player.x - INT.spawn.x, g.player.z - INT.spawn.z) < 0.3 && g.world.groundHeight(g.player.x, g.player.z) === INT.y, 'you step out of the lift on floor 7');
  // the walls hold
  walkTo(g, X0 + 20, Z0 + 1.2, 0.5, 6);
  check(g.player.x < X0 + 15, 'the corridor ends at its window');
  // into the flat and behind the sofa to the kitchen corner
  walkTo(g, X0 + 2.1, Z0 + 1.6); walkTo(g, X0 + 2.1, Z0 + 3.3);
  check(inFlat(g.player.x, g.player.z), "through Melker's door");
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
  check(!g.indoors.samuel && !g.peds.list.some((p) => p.npc === 'samuel'), 'Melker stays upstairs');
  check(!m.targets.some((t) => t.letter === '?'), 'the ? is gone from the map');
}
{
  console.log('Melker ser dig');
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
  check(ev.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /Melker såg dig/.test(d.sub)), 'UPPDRAG MISSLYCKAT: Melker såg dig');
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
  check(!m.known.has('overlamning'), "no handover before Melker's keys");
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
  const nx = m.list().find((x) => x.id === 'cykel');
  check(nx && nx.state === 'soon' && /hör av sig/.test(nx.line) && !m.known.has('cykel'), `Arnes budcykel comes next: in the list as "${nx && nx.line}"`);
  check(!m.accept('cykel') && !m.isOpen('cykel') && !m.list().some((x) => x.id === 'cykel' && x.state === 'new'), '… and it cannot be started yet');
  g.player.x = gun.x - 1.2; g.player.z = gun.z + 1.2;
  run(g, 0.2);
  check(m.prompt === 'PRATA', 'you can still talk to her');
  g.step(DT, { ...idle, action: true });
  check(ev.some(([n, d]) => n === 'say' && d.who === gun && /bron|Bullbilen|bullen|Melker/.test(d.text)), 'she reminds you of the bridge');
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
  check(!g.bike.locked && ev.some(([n, d]) => n === 'toast' && /nycklar passade/.test(d.text)), "LÅS UPP: Melker's keys fit");
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
  const nk = m.list().find((q) => q.id === 'kassaskap');
  check(!m.known.has('kassaskap') && nk && nk.state === 'soon', 'part 4 ("Kassaskåpet") is not offered right away – but the list says it is coming');
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

// ---------- 14. side quest: "Melkers nya nycklar" – Lås-Leif's keys out to Melker ----------
const UP_TO_BIKE = ['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel'];
function press(g) { g.step(DT, { ...idle, action: true }); run(g, 0.2); }
function walkHere(g, x, z) { g.player.x = x; g.player.z = z; g.player.y = g.world.groundHeight(x, z); g.player.vx = g.player.vz = 0; run(g, 0.2); }
{
  console.log('Melkers nya nycklar (sidouppdrag)');
  const g0 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g0.mission.restore(livsSave(['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning', 'livs']));
  const ev0 = record(g0, ['sms']);
  run(g0, 30);
  check(!ev0.some(([n, d]) => n === 'sms' && d.offer === 'nycklar'), 'not while Arne\'s bike is still at lott 7');

  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave([...UP_TO_BIKE, 'livs']));
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk']);
  run(g, 15.5);
  const offer = ev.find(([n, d]) => n === 'sms' && d.offer === 'nycklar');
  check(offer && offer[1].from === 'Lås-Leif (Skolgatan)' && /Melker/.test(offer[1].text), 'shortly after the eggs: Lås-Leif texts about Melker\'s new keys');
  check(m.leif && Math.hypot(m.leif.x - LEIF.x, m.leif.z - LEIF.z) < 0.1, 'Leif stands outside his shop on Skolgatan');
  m.accept('nycklar');
  run(g, 0.1);
  const N = m.targets.find((t) => t.letter === 'N' && t.gps);
  check(N && Math.hypot(N.x - LEIF_MARK.x, N.z - LEIF_MARK.z) < 0.1, 'the GPS leads to Leif');
  walkHere(g, LEIF_MARK.x, LEIF_MARK.z);
  run(g, 0.8);
  const job = m.active;
  const t1 = ev.find(([n, d]) => n === 'talk' && d.id === 'nycklar');
  check(job && job.id === 'nycklar' && t1 && /köksbordet/.test(t1[1].pages.map((q) => q.text).join(' ')), 'Leif hands over the keys: the old ones vanished from the kitchen table');
  m.talkDone('nycklar');
  run(g, 0.2);
  check(job.stage === 'carry' && !g.player.frozen && /Melker/.test(m.objective), `then out to Melker (${m.objective} · ${m.sub})`);
  const sam = job.samuel;
  check(sam && onIsle(sam.x, sam.z) && g.world.groundHeight(sam.x, sam.z) === CURB_H, 'Melker waits by the allotments on Norrholmen');
  check(!g.world.query(sam.x, sam.z, 1).some((c) => c.t === 'box' && c.h > 0.5 && sam.x > c.x0 - 0.5 && sam.x < c.x1 + 0.5 && sam.z > c.z0 - 0.5 && sam.z < c.z1 + 0.5), 'nothing in the way around him');
  const r = routePoints(g.layout.gps, LEIF_MARK.x, LEIF_MARK.z, SAMUEL_WAIT.x, SAMUEL_WAIT.z);
  let len = 0; for (let i = 1; i < r.length; i++) len += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
  check(r.some(([x, z]) => x === 40 && z === -178) && len < KEY_TIME * 9, `over the north bridge, ${len.toFixed(0)} m in ${KEY_TIME} s (an average of ${(len / KEY_TIME * 3.6).toFixed(0)} km/h)`);
  // too slow: Melker goes home
  run(g, KEY_TIME + 0.5);
  check(!m.active && ev.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /Melker/.test(d.sub)), 'too slow: Melker goes home (failed)');
  run(g, 4);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Lås-Leif (Skolgatan)' && /nytt försök/.test(d.text)), 'Leif: come back and try again');
  // again, and in time
  walkHere(g, LEIF_MARK.x - 5, LEIF_MARK.z); run(g, 4);
  walkHere(g, LEIF_MARK.x, LEIF_MARK.z); run(g, 0.8);
  const job2 = m.active;
  check(job2 && job2.id === 'nycklar', 'a second try');
  m.talkDone('nycklar'); run(g, 0.2);
  walkHere(g, SAMUEL_WAIT.x - 2.2, SAMUEL_WAIT.z + 0.5);
  run(g, 1);
  const t2 = ev.filter(([n, d]) => n === 'talk' && d.id === 'nycklar').pop();
  check(job2.stage === 'talk2' && /budcykel/.test(t2[1].pages.map((q) => q.text).join(' ')), 'Melker takes the keys – and asks if you have seen an old delivery bike');
  const money0 = g.money;
  m.talkDone('nycklar'); run(g, 0.3);
  check(m.done.has('nycklar') && g.money - money0 === KEY_REWARD, `side quest done, ${KEY_REWARD} kr`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'SIDOUPPDRAG KLART' && /nycklar/.test(d.sub)), 'SIDOUPPDRAG KLART banner');
  run(g, 9);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Lås-Leif (Skolgatan)' && /hederlig/.test(d.text)), 'Leif texts afterwards');
  run(g, 25);
  check(!g.peds.list.includes(sam) && !g.peds.list.includes(job2.samuel), 'Melker has gone home');
}

// ---------- 15. main quest, part 4: the safe in the bakery office ----------
function intoOffice(g) { walkHere(g, OFFICE_DOOR.x, OFFICE_DOOR.z); run(g, 1.4); }
function crackSafe(g) {
  const m = g.mission;
  walkHere(g, OFFICE.note.x, OFFICE.note.z); press(g);
  walkHere(g, OFFICE.diploma.x, OFFICE.diploma.z); press(g);
  walkHere(g, OFFICE.safe.x, OFFICE.safe.z); press(g);  // ÖPPNA
  run(g, 0.3); press(g);                                // TA
  return m.active;
}
{
  console.log('Kassaskåpet (huvuduppdrag del 4)');
  // without the eggs it comes a while after the bike
  const g0 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g0.mission.restore(livsSave(UP_TO_BIKE));
  run(g0, 100);
  check(!g0.mission.known.has('kassaskap'), 'not right after the bike (without the eggs)');
  run(g0, 52);
  check(g0.mission.known.has('kassaskap'), 'but after a couple of minutes');

  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave([...UP_TO_BIKE, 'livs', 'nycklar', 'flag']));
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk', 'wanted', 'caught', 'endcard']);
  run(g, 40);
  check(!m.known.has('kassaskap'), 'not yet');
  run(g, 6);
  const offer = ev.find(([n, d]) => n === 'sms' && d.offer === 'kassaskap');
  check(offer && offer[1].from === 'Tant Gun (Storgatan)' && /kassaskåpet/.test(offer[1].text) && /Ingvar/.test(offer[1].text), 'after the eggs: Gun texts – the light in the office, the safe');
  check(m.info('kassaskap').main, 'a main quest');
  m.accept('kassaskap');
  run(g, 0.1);
  const G = m.targets.find((t) => t.letter === 'G' && t.gps);
  check(G && Math.hypot(G.x - OFFICE_DOOR.x, G.z - OFFICE_DOOR.z) < 0.1, 'the GPS leads to the side door of the bakery');
  check(onIsle(OFFICE_DOOR.x, OFFICE_DOOR.z) && g.world.groundHeight(OFFICE_DOOR.x, OFFICE_DOOR.z) === CURB_H, 'the door is on Norrholmen, at ground level');
  intoOffice(g);
  const job = m.active;
  check(job && job.id === 'kassaskap' && g.indoors.where === 'office' && Math.hypot(g.player.x - OFFICE.spawn.x, g.player.z - OFFICE.spawn.z) < 0.3, 'in through the side door: the office');
  check(/Bengt är tillbaka om 7\d s/.test(m.sub), `a clock: ${m.sub}`);
  check(m.targets.filter((t) => t.kind === 'item').length === 3, 'arrows: the note, the diploma, the safe');
  // the safe first: no code
  walkHere(g, OFFICE.safe.x, OFFICE.safe.z);
  check(m.prompt === 'ÖPPNA', 'at the safe: ÖPPNA');
  press(g);
  check(!job.safeOpen && ev.some(([n, d]) => n === 'toast' && /kodlås/.test(d.text)), 'it has a code lock');
  walkHere(g, OFFICE.note.x, OFFICE.note.z);
  check(m.prompt === 'TITTA', 'at the desk: TITTA');
  press(g);
  check(job.knowNote && ev.some(([n, d]) => n === 'toast' && /året vi startade/.test(d.text)), 'the note: the code is the year they started');
  walkHere(g, OFFICE.diploma.x, OFFICE.diploma.z); press(g);
  check(job.knowYear && ev.some(([n, d]) => n === 'toast' && /1994/.test(d.text)), 'the diploma: founded 1994');
  walkHere(g, OFFICE.safe.x, OFFICE.safe.z); press(g);
  check(job.safeOpen && m.prompt === 'TA', '1994: the safe opens');
  press(g);
  check(job.recipe && job.stage === 'alarm' && ev.some(([n, d]) => n === 'wanted' && d.stars === 2), 'the recipe – and the alarm');
  // walking into the furniture does not get you through the safe or the desk
  check(!g.world.query(OFFICE.safe.x, OFFICE.safe.z, 0.4).some((c) => c.t === 'box' && OFFICE.safe.x > c.x0 && OFFICE.safe.x < c.x1 && OFFICE.safe.z > c.z0 && OFFICE.safe.z < c.z1), 'you can stand in front of the safe');
  walkTo(g, OFFICE.door.x, OFFICE.door.z, 1, 4);
  check(m.prompt === 'GÅ UT', 'at the side door: GÅ UT');
  press(g); run(g, 1.3);
  check(!g.indoor && job.stage === 'escape' && job.chasers.length === 2, 'outside: two Bullbilen vans come after you');
  check(!g.peds.list.some((q) => q.npc === 'bengt'), 'Bengt stays inside');
  // standing on the road: they get you
  walkHere(g, 40, -330);
  let t = 0; while (t < 60 && m.active === job && job.stage === 'escape') { g.step(DT, idle); t += DT; }
  check(job.stage === 'caught', `caught on the road after ${t.toFixed(0)} s`);
  run(g, 3);
  check(!m.active && ev.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /receptet/.test(d.sub)), 'failed: Bullbilen took the recipe back');
  check(ev.some(([n, d]) => n === 'wanted' && d.stars === 0), 'the stars go');
  run(g, 4);
  // second try: in and out, and on to Gun
  walkHere(g, OFFICE_DOOR.x - 6, OFFICE_DOOR.z); run(g, 5);
  intoOffice(g);
  const job2 = m.active;
  check(job2 && job2 !== job && !job2.safeOpen && !job2.knowNote, 'a second try: the safe is locked again');
  crackSafe(g);
  walkTo(g, OFFICE.door.x, OFFICE.door.z, 1, 4); press(g); run(g, 1.3);
  check(job2.stage === 'escape', 'out with the recipe');
  // home to Gun (as if you got there)
  walkHere(g, GUN_GATE.x, GUN_GATE.z);
  run(g, 1.2);
  const talk = ev.filter(([n, d]) => n === 'talk' && d.id === 'kassaskap').pop();
  check(job2.stage === 'talk' && talk && /brynt smör/.test(talk[1].pages.map((q) => q.text).join(' ')), 'at Gun\'s gate: the second half – browned butter!');
  const money0 = g.money;
  m.talkDone('kassaskap');
  run(g, 0.5);
  check(m.done.has('kassaskap') && g.money - money0 === SAFE_REWARD, `part 4 done, ${SAFE_REWARD} kr`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'HUVUDUPPDRAG KLART' && d.sub === 'Kassaskåpet'), 'HUVUDUPPDRAG KLART');
  run(g, 16);
  check(!ev.some(([n]) => n === 'endcard'), 'no end card yet: part 5 is next');
  check(!g.player.frozen && !g.camFocus, 'you can move again');

  // Bengt: too slow in the office, or still there when the alarm rings
  const g3 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g3.mission.restore(livsSave(UP_TO_BIKE));
  const ev3 = record(g3, ['banner', 'say']);
  g3.mission.offer('kassaskap'); g3.mission.accept('kassaskap');
  intoOffice(g3);
  run(g3, SAFE_TIME + 0.5);
  check(g3.mission.active && g3.mission.active.stage === 'caught' && ev3.some(([n, d]) => n === 'say' && /KONTOR/.test(d.text)), 'time is up: Bagar-Bengt walks in');
  run(g3, 3);
  check(!g3.indoor && !g3.mission.active && ev3.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /Bengt/.test(d.sub)), 'thrown out: failed');
  walkHere(g3, OFFICE_DOOR.x - 6, OFFICE_DOOR.z); run(g3, 7);
  intoOffice(g3);
  const j3 = crackSafe(g3);
  check(j3.stage === 'alarm', 'third try: the alarm rings');
  t = 0; while (t < 12 && j3.stage === 'alarm') { g3.step(DT, idle); t += DT; }
  check(j3.stage === 'caught', `standing still: Bengt gets you after ${t.toFixed(1)} s`);
  run(g3, 3);
  check(!g3.peds.list.some((q) => q.npc === 'bengt') && !g3.indoor, 'and Bengt is gone again');
}

// ---------- 16. side quest: "Lasses trimning" – what the money is for ----------
const UP_TO_SAFE = [...UP_TO_BIKE, 'livs', 'nycklar', 'kassaskap'];
{
  console.log('Lasses trimning (sidouppdrag, pengar)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore({ ...livsSave(UP_TO_SAFE), money: 10000 });
  const ev = record(g, ['sms', 'banner', 'shop', 'money', 'toast']);
  run(g, 24);
  check(!m.known.has('verkstad'), 'not right away');
  run(g, 2.5);
  const offer = ev.find(([n, d]) => n === 'sms' && d.offer === 'verkstad');
  check(offer && offer[1].from === 'Lasse (Verkstan)' && /pengar/.test(offer[1].text), 'Lasse texts: come and see what money can buy');
  m.accept('verkstad'); run(g, 0.1);
  const L = m.targets.find((t) => t.letter === '$' && t.gps);
  check(L && Math.hypot(L.x - LASSE_SHOP.x, L.z - LASSE_SHOP.z) < 0.1, 'the GPS leads to the shop at the workshop');
  walkHere(g, LASSE_SHOP.x, LASSE_SHOP.z); run(g, 0.2);
  check(ev.filter(([n]) => n === 'shop').length === 1, 'walking up to the garage door opens the shop');
  run(g, 1);
  check(ev.filter(([n]) => n === 'shop').length === 1, 'once (not again while you stand there)');
  const items = m.shopItems();
  check(items.length === 3 && items.every((it) => !it.owned && it.price > 0), `three things for sale: ${items.map((it) => `${it.name} ${it.price} kr`).join(', ')}`);
  let r = m.buy('turbo');
  check(r.ok && g.money === 7000 && m.upgrades.has('turbo'), `turbo bought: ${r.msg}`);
  check(m.done.has('verkstad') && ev.some(([n, d]) => n === 'banner' && d.title === 'SIDOUPPDRAG KLART' && /trimning/.test(d.sub)), 'the first purchase: side quest done');
  check(!m.buy('turbo').ok, 'you cannot buy it twice');
  check(m.buy('pansar').ok && m.buy('tuta').ok && g.money === 7000 - 2500 - 800, 'krockskydd and the melody horn too');
  g.money = 100;
  // the upgrades on a car you drive
  const car = g.addVehicle('sedan', 'blue', 20, 4, Math.PI / 2);
  const plain = g.addVehicle('sedan', 'blue', 20, -4, Math.PI / 2);
  check(plain.boost === 1 && plain.armor === 1, 'cars nobody drives are ordinary');
  enterCar(g, car);
  check(car.boost > 1 && car.top > 1 && car.armor === 0.5, 'in your car: turbo and armour');
  const h0 = car.health; car.damage(20);
  check(Math.abs(h0 - car.health - 10) < 0.01, 'half the dents');
  g.step(DT, { ...idle, action: true }); run(g, 1);
  check(!g.player.inCar && car.boost === 1 && car.armor === 1, 'out of the car: ordinary again');
  // turbo is faster: the same run with and without
  const sp = (turbo) => {
    const gg = new Game({ seed: 7, traffic: 0, peds: 0 });
    if (turbo) gg.mission.upgrades.add('turbo');
    const c = gg.addVehicle('sedan', 'blue', -40, 100, Math.PI);
    enterCar(gg, c);
    for (let i = 0; i < 60 * 4; i++) gg.step(DT, { ...idle, moveY: 1 });
    return c.speed;
  };
  const s0 = sp(false), s1 = sp(true);
  check(s1 > s0 * 1.08, `turbo: ${(s1 * 3.6).toFixed(0)} km/h after 4 s instead of ${(s0 * 3.6).toFixed(0)}`);
  // saved
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore(JSON.parse(JSON.stringify(m.progress())));
  check(['turbo', 'pansar', 'tuta'].every((id) => g2.mission.upgrades.has(id)), 'the upgrades are saved');
  // Kim's challenge comes after the shopping
  run(g, 16);
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'hopp' && d.from === 'Kim (Macken)'), "then Kim texts: the long jump");
}

// ---------- 17. side quest: "Långhoppet" ----------
function jumpFrom(g, z0) {
  const c = g.addVehicle('sedan', 'blue', -70, z0, 0);
  enterCar(g, c);
  for (let i = 0; i < 60 * 10; i++) g.step(DT, { ...idle, throttleAxis: c.z < 95 ? 1 : -1, steerAxis: 0 });
  g.step(DT, { ...idle, action: true }); run(g, 1);
  g.removeVehicle(c);
}
{
  console.log('Långhoppet (sidouppdrag)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave([...UP_TO_SAFE, 'verkstad']));
  const ev = record(g, ['sms', 'banner', 'toast', 'stunt']);
  m.offer('hopp'); m.accept('hopp'); run(g, 0.1);
  check(m.targets.some((t) => t.letter === 'K' && t.gps), 'the K marker at the run-up');
  jumpFrom(g, 18);
  const j1 = ev.filter(([n]) => n === 'stunt').pop();
  run(g, 3);
  check(j1 && j1[1].dist < JUMP_GOAL && !m.done.has('hopp') && ev.some(([n, d]) => n === 'toast' && /Kim vill se/.test(d.text) && /turbo/.test(d.text)), `a short run-up: ${j1 && j1[1].dist} m is not enough (and a tip about the turbo)`);
  check(new RegExp(`${j1[1].dist} m`).test(m.questLine('hopp')), `the list remembers the best jump (${m.questLine('hopp')})`);
  const money0 = g.money;
  jumpFrom(g, -20);
  const j2 = ev.filter(([n]) => n === 'stunt').pop();
  run(g, 3);
  check(j2[1].dist >= JUMP_GOAL && m.done.has('hopp'), `a long run-up: ${j2[1].dist} m – done`);
  check(g.money - money0 >= JUMP_REWARD && ev.some(([n, d]) => n === 'banner' && /Långhoppet/.test(d.sub || '')), `${JUMP_REWARD} kr (plus the stunt bonus)`);
  run(g, 5);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Kim (Macken)' && /hoppkung/.test(d.text)), 'Kim admits it');
}

// ---------- 17b. (v1.1.1) Långhoppet: the K starts a run ----------
{
  console.log('Långhoppet: K:et startar ett försök (v1.1.1)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave([...UP_TO_SAFE, 'verkstad']));
  const ev = record(g, ['sms', 'banner', 'toast', 'stunt', 'hint']);
  m.offer('hopp'); m.accept('hopp'); run(g, 0.1);
  const K = m.quest('hopp');
  check(K.x === JUMP_START.x && K.z === JUMP_START.z && m.targets.some((t) => t.letter === 'K' && t.gps && t.x === K.x && t.z === K.z),
    `the K at the far end of the parking lot (${K.x}, ${K.z}), the GPS leads there`);
  check(/K:et/.test(m.objective) && /Hörnlivs/.test(m.sub), `the objective box says what to do: ${m.objective} · ${m.sub}`);
  // on foot: no run, but it says why
  walkHere(g, K.x, K.z); run(g, 0.5);
  check(!m.active && ev.some(([n, d]) => n === 'toast' && /bil/.test(d.text) && /K:et/.test(d.text)), 'on foot in the K: no run – it says you need a car (there are some on the lot)');
  walkHere(g, K.x + 7, K.z - 6);
  // drive in from the north end of the lot: the run starts, two rings show the way
  const car = g.addVehicle('sedan', 'blue', K.x, K.z - 5, 0);
  enterCar(g, car);
  for (let i = 0; i < 60 * 5 && !m.active; i++) g.step(DT, { ...idle, throttleAxis: 0.35, steerAxis: 0 });
  const job = m.active;
  check(job && job.id === 'hopp' && ev.some(([n, d]) => n === 'banner' && d.title === 'LÅNGHOPPET'), 'driving into the K starts the run (LÅNGHOPPET)');
  check(m.objective === `Hoppa minst ${JUMP_GOAL} m` && /söderut/.test(m.sub), `the objective: ${m.objective} · ${m.sub}`);
  check(m.targets.filter((t) => t.kind === 'ring').length === 2 && !m.targets.some((t) => t.gps), 'a ring over Skolgatan and one past the ramp (no GPS detour along the roads)');
  // a short run (from just north of Skolgatan) falls short: back to the K
  const jump = (z0) => {
    parkAt(g, K.x, z0, 0);
    const n0 = ev.filter(([n]) => n === 'stunt').length;
    let landed = -1;
    for (let i = 0; i < 60 * 12; i++) {
      g.step(DT, { ...idle, throttleAxis: car.z < 95 ? 1 : -1, steerAxis: 0 });
      if (landed < 0 && ev.filter(([n]) => n === 'stunt').length > n0) landed = i;
      if (landed >= 0 && i > landed + 20) break;
    }
    const e = ev.filter(([n]) => n === 'stunt').pop();
    return e && e[1].dist;
  };
  const d1 = jump(18);
  check(d1 < JUMP_GOAL && m.active === job && job.stage === 'back' && m.objective === 'Kör tillbaka till K:et', `${d1} m is too short: back to the K (${m.sub})`);
  check(m.targets.some((t) => t.letter === 'K' && t.gps), 'the GPS leads back to the K');
  // back in the K: a new try
  parkAt(g, K.x, K.z, 0); run(g, 0.2);
  check(job.stage === 'run' && job.tries === 2 && ev.some(([n, d]) => n === 'toast' && /Nytt försök/.test(d.text)), 'back in the K: a new try');
  const money0 = g.money;
  const d2 = jump(K.z);
  run(g, 3);
  check(d2 >= JUMP_GOAL && m.done.has('hopp') && !m.active, `flat out from the K: ${d2} m – done`);
  check(g.money - money0 >= JUMP_REWARD && ev.some(([n, d]) => n === 'banner' && /Långhoppet/.test(d.sub || '')), `${JUMP_REWARD} kr (plus the stunt bonus)`);
  run(g, 5);
  check(!m.targets.some((t) => t.letter === 'K' && t.x === K.x && t.z === K.z), 'the K is gone once it is done');
}
{
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave([...UP_TO_SAFE, 'verkstad']));
  const ev = record(g, ['toast']);
  m.offer('hopp'); m.accept('hopp'); run(g, 0.1);
  const K = m.quest('hopp');
  const car = g.addVehicle('sedan', 'blue', K.x, K.z - 5, 0);
  enterCar(g, car);
  // driving straight through the K at speed (other markers want you to slow down) starts it too
  car.vz = 16;
  for (let i = 0; i < 60 * 4 && !m.active; i++) g.step(DT, { ...idle, throttleAxis: 1, steerAxis: 0 });
  check(m.active && m.active.id === 'hopp' && car.speed > 12, `straight through the K at ${(car.speed * 3.6).toFixed(0)} km/h: the run starts all the same`);
  // in through the gate beside the ramp: missed, back to the K
  parkAt(g, -64.4, 30, 0);
  for (let i = 0; i < 60 * 8 && m.active && m.active.stage === 'run'; i++) g.step(DT, { ...idle, throttleAxis: 0.7, steerAxis: 0 });
  check(m.active && m.active.stage === 'back' && /missade/.test(m.sub), `past the ramp on the ground: ${m.objective} · ${m.sub}`);
  parkAt(g, K.x + 4, K.z + 10, 0);
  g.step(DT, { ...idle, action: true }); run(g, 6);
  check(!m.active && !m.done.has('hopp') && ev.some(([n, d]) => n === 'toast' && /avbrutet/.test(d.text)), 'out of the car for a while: the run is off (no failure)');
  run(g, 4);
  check(m.targets.some((t) => t.letter === 'K' && t.x === K.x && t.z === K.z), 'and the K is back');
}

// ---------- 18. main quest, part 5: "Nyöppningen" ----------
{
  console.log('Nyöppningen (huvuduppdrag del 5)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave([...UP_TO_SAFE, 'flag', 'verkstad', 'hopp']));
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk', 'caught', 'endcard', 'fade']);
  run(g, 4);
  check(!m.known.has('konditori') && /hör av sig/.test(m.sub) && /Huvuduppdraget fortsätter/.test(m.objective), `not right away – the objective says what is coming (${m.objective} · ${m.sub})`);
  run(g, 3);
  const offer = ev.find(([n, d]) => n === 'sms' && d.offer === 'konditori');
  check(offer && offer[1].from === 'Tant Gun (Storgatan)' && /Konditori/.test(offer[1].text), 'Gun texts: Sjuby Konditori is opening again');
  m.accept('konditori'); run(g, 0.2);
  const job = m.active;
  check(job && job.id === 'konditori', 'following it starts it');
  check(m.targets.filter((t) => t.kind === 'zone').length === 3 && m.targets.filter((t) => t.gps).length === 1, 'three places on the map, the GPS to the nearest');
  check(/Hämta kardemumma/.test(m.objective), `the nearest first: ${m.objective} · ${m.sub}`);
  walkHere(g, PICKUPS.kardemumma.x, PICKUPS.kardemumma.z); run(g, 0.3);
  check(job.have.has('kardemumma') && ev.some(([n, d]) => n === 'toast' && /kardemumma/.test(d.text)), 'cardamom from Yasmin at Hörnlivs');
  const car = g.addVehicle('sedan', 'blue', PICKUPS.smor.x - 6, PICKUPS.smor.z, Math.PI / 2);
  enterCar(g, car);
  parkAt(g, PICKUPS.smor.x, PICKUPS.smor.z, Math.PI / 2); run(g, 0.3);
  check(job.have.has('smor'), 'butter from Macken – from the car');
  g.step(DT, { ...idle, action: true }); run(g, 1);
  walkHere(g, PICKUPS.mjol.x, PICKUPS.mjol.z); run(g, 0.3);
  check(job.have.has('mjol') && job.helpers.mjol, 'flour from Majken at the windmill');
  run(g, 2.5);
  check(job.chaser && job.chaser.mode === 'chase', 'a Bullbilen van comes for the flour');
  walkHere(g, 40, -330);
  let t = 0; while (t < 40 && job.have.has('mjol')) { g.step(DT, idle); t += DT; }
  check(!job.have.has('mjol') && job.lostFlour && m.active === job, `on the road on foot they take it (${t.toFixed(0)} s) – but the quest goes on`);
  run(g, 1);
  walkHere(g, PICKUPS.mjol.x, PICKUPS.mjol.z); run(g, 0.3);
  check(job.have.has('mjol'), 'another sack from Majken');
  walkHere(g, KONDITORI.x, KONDITORI.z); run(g, 1.2);
  const t1 = ev.filter(([n, d]) => n === 'talk' && d.id === 'konditori').pop();
  check(job.stage === 'talk1' && t1 && /I morgon/.test(t1[1].pages.map((q) => q.text).join(' ')), 'at the konditori: Gun will bake all night');
  m.talkDone('konditori');
  run(g, 3.5);
  const t2 = ev.filter(([n, d]) => n === 'talk' && d.id === 'konditori').pop();
  check(job.stage === 'talk2' && t2 !== t1 && /diska/.test(t2[1].pages.map((q) => q.text).join(' ')), 'the next morning: the opening – and Bengt wants to learn to bake');
  check(job.crowd.length === 9 && job.crowd.every((q) => g.peds.list.includes(q)) && g.peds.list.includes(job.bengt), 'a crowd on the square, Bengt at the back');
  const money0 = g.money;
  m.talkDone('konditori'); run(g, 0.5);
  check(m.done.has('konditori') && g.money - money0 === OPENING_REWARD, `part 5 done, ${OPENING_REWARD} kr`);
  check(!g.player.frozen && !g.camFocus, 'you can move again');
  run(g, 16);
  check(!ev.some(([n]) => n === 'endcard'), 'no end card yet: two more parts');
  check(m.known.has('syltburken') && ev.some(([n, d]) => n === 'sms' && d.offer === 'syltburken' && /syltburk/.test(d.text)), 'ten seconds later: Gun texts – the jam jar is stolen');
  // Gun by the konditori door
  const gun = m.flag.gun;
  walkHere(g, gun.x + 1.2, gun.z); run(g, 0.2);
  const said = ev.length;
  if (m.prompt === 'PRATA') press(g);
  check(ev.slice(said).some(([n, d]) => n === 'say' && /Välkommen in/.test(d.text)), 'Gun at the konditori: "Välkommen in!"');
  run(g, 20);
  check(!g.peds.list.some((q) => q.npc === 'crowd' || q.npc === 'bengt-out'), 'the crowd goes home after a while');
}

// ---------- 19. after the safe: what comes next is clear ----------
{
  console.log('Efter kassaskåpet: nästa steg');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave([...UP_TO_BIKE, 'livs', 'nycklar']));
  const ev = record(g, ['sms', 'offer', 'talk', 'banner']);
  m.offer('kassaskap'); m.accept('kassaskap');
  intoOffice(g); crackSafe(g);
  walkTo(g, OFFICE.door.x, OFFICE.door.z, 1, 4); press(g); run(g, 1.3);
  walkHere(g, GUN_GATE.x, GUN_GATE.z); run(g, 1.2);
  const t = ev.filter(([n, d]) => n === 'talk' && d.id === 'kassaskap').pop();
  check(t && /Nästa steg/.test(t[1].pages[t[1].pages.length - 1].text), 'Gun\'s last line says the next step is coming');
  m.talkDone('kassaskap');
  run(g, 0.6);
  check(ev.some(([n, d]) => n === 'offer' && d.id === 'konditori'), 'straight after the talk: the card for "Nyöppningen" opens (face to face)');
  m.accept('konditori'); run(g, 0.2);
  check(m.active && m.active.id === 'konditori', 'accept it and it starts');
  run(g, 4);
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'cykelretur' && d.from === 'Melker'), 'a few seconds later: Melker texts (side quest)');
  run(g, 5);
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'hemleverans' && d.from === 'Yasmin (Hörnlivs)'), 'and Yasmin (side quest) – even in the middle of "Nyöppningen"');
}

// ---------- 20. side quest: "Melkers cykel" ----------
{
  console.log('Melkers cykel (sidouppdrag)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave(UP_TO_SAFE));
  const ev = record(g, ['sms', 'banner', 'talk']);
  run(g, 4.5);
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'cykelretur'), 'Melker texts');
  m.accept('cykelretur'); run(g, 0.2);
  const job = m.active;
  check(job && job.id === 'cykelretur' && job.samuel, 'it starts: Melker waits outside the tower');
  check(m.targets.some((t) => t.kind === 'car' && t.car === g.bike && t.gps), 'the GPS leads to the bike at Gun\'s gate');
  g.player.x = g.bike.x + 0.9; g.player.z = g.bike.z + 0.4; run(g, 0.2); press(g);
  check(g.player.car === g.bike, 'on the bike');
  const b = g.bike; b.x = BIKE_RETURN.x - 6; b.z = BIKE_RETURN.z; b.h = Math.PI / 2; b.vx = b.vz = 0; run(g, 0.3);
  check(job.stage === 'ride', 'not there yet');
  b.x = BIKE_RETURN.x - 1; run(g, 1.2);
  const t = ev.filter(([n, d]) => n === 'talk' && d.id === 'cykelretur').pop();
  check(job.stage === 'talk' && t && /loppis/.test(t[1].pages.map((q) => q.text).join(' ')), 'at the tower: Melker forgives you');
  const money0 = g.money;
  m.talkDone('cykelretur'); run(g, 0.3);
  check(m.done.has('cykelretur') && g.money - money0 === BIKE_RETURN.reward, `done, ${BIKE_RETURN.reward} kr`);
  check(Math.hypot(g.bike.x - BIKE_RETURN.x, g.bike.z - BIKE_RETURN.z) < 2, 'the bike stays with Melker by the tower');
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore(JSON.parse(JSON.stringify(m.progress())));
  check(g2.bike && Math.hypot(g2.bike.x - BIKE_RETURN.x, g2.bike.z - BIKE_RETURN.z) < 2, 'saved: the bike by the tower');
}

// ---------- 21. side quest: "Hemleverans" ----------
{
  console.log('Hemleverans (sidouppdrag)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave(UP_TO_SAFE));
  const ev = record(g, ['sms', 'banner', 'say']);
  run(g, 9.5);
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'hemleverans'), 'Yasmin texts');
  m.accept('hemleverans');
  walkHere(g, HOME_DELIVERY.start.x, HOME_DELIVERY.start.z); run(g, 0.5);
  const job = m.active;
  check(job && job.id === 'hemleverans' && job.stops.length === 3 && job.stops.every((s) => g.peds.list.includes(s.ped)), 'three customers wait at their doors');
  check(m.targets.filter((t) => t.kind === 'zone' && t.gps).length === 3, 'three places on the map');
  for (const s of job.stops.slice(0, 2)) { walkHere(g, s.cx, s.cz + 1); run(g, 0.3); }
  check(job.done === 2 && ev.filter(([n, d]) => n === 'say' && job.stops.some((s) => s.ped === d.who)).length >= 2, 'two delivered, the customers say thank you');
  const money0 = g.money, left = job.left;
  walkHere(g, job.stops[2].cx, job.stops[2].cz + 1); run(g, 0.3);
  check(m.done.has('hemleverans') && g.money - money0 >= 3 * HOME_DELIVERY.per, `all three: ${g.money - money0} kr with ${Math.round(left)} s to spare`);
  // too slow
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore(livsSave(UP_TO_SAFE));
  const ev2 = record(g2, ['banner']);
  g2.mission.offer('hemleverans'); g2.mission.accept('hemleverans');
  walkHere(g2, HOME_DELIVERY.start.x, HOME_DELIVERY.start.z); run(g2, HOME_DELIVERY.time + 1);
  check(!g2.mission.active && ev2.some(([n, d]) => n === 'banner' && d.kind === 'fail'), 'too slow: failed (and you can try again)');
}

// ---------- 22. main quest, part 6: "Syltburken" ----------
const UP_TO_OPENING = [...UP_TO_SAFE, 'konditori'];
{
  console.log('Syltburken (huvuduppdrag del 6)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave([...UP_TO_OPENING, 'cykelretur', 'hemleverans']));
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk']);
  run(g, 10.5);
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'syltburken' && d.from === 'Tant Gun (Storgatan)'), 'Gun texts: the jam jar is stolen');
  m.accept('syltburken'); run(g, 0.2);
  const job = m.active;
  check(job && job.car && job.car.paint === 'black' && job.chaser, 'a black car, driving');
  check(m.targets.some((t) => t.kind === 'racer' && t.car === job.car && t.gps), 'a red arrow and the GPS on it');
  const c0 = { x: job.car.x, z: job.car.z };
  run(g, 10);
  check(Math.hypot(job.car.x - c0.x, job.car.z - c0.z) > 30, `it drives off (${Math.hypot(job.car.x - c0.x, job.car.z - c0.z).toFixed(0)} m in 10 s)`);
  // ram it (a few hard knocks)
  const pc = g.addVehicle('sedan', 'blue', job.car.x - 8, job.car.z, 0);
  enterCar(g, pc);
  for (let k = 0; k < 6 && job.stage === 'chase'; k++) { g.onCrash(job.car, 9, pc, job.car.x, job.car.z); run(g, 0.4); }
  check(job.stage === 'stopped' && job.thug && g.peds.list.includes(job.thug), 'rammed enough: the engine dies, the driver runs');
  g.step(DT, { ...idle, action: true }); run(g, 1);
  walkHere(g, job.car.x + 2.2, job.car.z);
  check(m.prompt === 'TA', 'at the car: TA');
  press(g);
  check(job.jar && job.stage === 'return', 'the jar – back to the konditori');
  walkHere(g, KONDITORI.x, KONDITORI.z); run(g, 1.2);
  const t = ev.filter(([n, d]) => n === 'talk' && d.id === 'syltburken').pop();
  check(t && /Dahlgren/.test(t[1].pages.map((q) => q.text).join(' ')), 'Bengt knows the car: director Dahlgren');
  const money0 = g.money;
  m.talkDone('syltburken'); run(g, 0.5);
  check(m.done.has('syltburken') && g.money - money0 === JAR.reward, `part 6 done, ${JAR.reward} kr`);
  run(g, 4);
  check(ev.some(([n, d]) => n === 'toast' && /Nästa steg/.test(d.text)) && /hör av sig/.test(m.questLine('fabriken')), 'and it says what comes next');
  // it gets away
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore(livsSave(UP_TO_OPENING));
  const ev2 = record(g2, ['banner']);
  g2.mission.offer('syltburken'); g2.mission.accept('syltburken'); run(g2, 0.2);
  g2.player.x = 40; g2.player.z = -370; g2.player.y = g2.world.groundHeight(40, -370); run(g2, JAR.fleeT + 1);
  check(!g2.mission.active && ev2.some(([n, d]) => n === 'banner' && d.kind === 'fail'), 'too far behind for too long: it gets away (failed)');
}

// ---------- 23. main quest, part 7: "Bullfabriken" ----------
{
  console.log('Bullfabriken (huvuduppdrag del 7)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave([...UP_TO_OPENING, 'syltburken', 'cykelretur', 'hemleverans', 'verkstad', 'hopp', 'flag']));
  const ev = record(g, ['sms', 'banner', 'toast', 'talk', 'endcard']);
  run(g, 12.5);
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'fabriken' && d.from === 'Bagar-Bengt'), 'Bengt texts: follow Dahlgren\'s truck');
  m.accept('fabriken'); run(g, 0.2);
  const job = m.active;
  check(job && job.stage === 'wait' && m.targets.some((t) => t.kind === 'zone' && t.gps), 'wait at the bakery driveway (on the map)');
  const car = g.addVehicle('sedan', 'blue', FACTORY_START.x, FACTORY_START.z + 6, Math.PI);
  enterCar(g, car);
  parkAt(g, FACTORY_START.x, FACTORY_START.z, Math.PI); run(g, 3);
  check(job.stage === 'tail' && job.truck, 'the truck comes out of the yard');
  // follow it, about 30 m behind
  let t = 0, minD = 1e9, maxD = 0;
  while (t < 160 && job.stage === 'tail') {
    const tr = job.truck;
    if (t > 3) {
      const back = 30;
      car.x = tr.x - Math.sin(tr.h) * back; car.z = tr.z - Math.cos(tr.h) * back; car.h = tr.h; car.vx = tr.vx; car.vz = tr.vz;
    }
    g.step(DT, idle); t += DT;
    if (t > 3) { const d = Math.hypot(tr.x - car.x, tr.z - car.z); minD = Math.min(minD, d); maxD = Math.max(maxD, d); }
  }
  check(job.stage === 'sneak', `tailing it to the construction site (${t.toFixed(0)} s)`);
  check(Math.hypot(job.truck.x - TAIL.dest.x, job.truck.z - TAIL.dest.z) < 9, 'it stops at the site gate on Skolgatan');
  g.step(DT, { ...idle, action: true }); run(g, 1);
  walkHere(g, SITE_OFFICE.x, SITE_OFFICE.z - 1); run(g, 1);
  const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'fabriken').pop();
  check(job.stage === 'talk' && tk && /Tusen Sjubybullar/.test(tk[1].pages[0].text), 'at the site office: you overhear Dahlgren');
  m.talkFx('fabriken', 'arrive');
  check(job.people.length === 4, 'Gun, Bengt and the police turn up');
  const money0 = g.money;
  m.talkDone('fabriken'); run(g, 0.5);
  check(m.done.has('fabriken') && g.money - money0 === FACTORY_REWARD, `the main adventure done, ${FACTORY_REWARD} kr`);
  run(g, 16);
  check(!ev.some(([n]) => n === 'endcard'), 'no end card yet: the adventure goes on (v1.0)');
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'bullfest' && d.from === 'Tant Gun (Storgatan)'), 'tant Gun texts: the bun party on the square');
  const fest = m.list().find((q) => q.id === 'bullfest');
  check(fest && fest.state === 'new' && fest.main, 'next in the list: "Bullfesten", main quest part 8');
  // too close, too far
  const tryTail = (back) => {
    const gg = new Game({ seed: 7, traffic: 0, peds: 0 });
    gg.mission.restore(livsSave([...UP_TO_OPENING, 'syltburken']));
    const e = record(gg, ['banner']);
    gg.mission.offer('fabriken'); gg.mission.accept('fabriken'); run(gg, 0.2);
    walkHere(gg, FACTORY_START.x, FACTORY_START.z); run(gg, 3);
    const j = gg.mission.active;
    let tt = 0;
    while (tt < 30 && gg.mission.active === j) {
      const tr = j.truck;
      if (tr) { gg.player.x = tr.x - Math.sin(tr.h) * back; gg.player.z = tr.z - Math.cos(tr.h) * back; }
      gg.step(DT, idle); tt += DT;
    }
    return e.find(([n, d]) => n === 'banner' && d.kind === 'fail');
  };
  const near = tryTail(5), far = tryTail(120);
  check(near && /såg dig/.test(near[1].sub), 'right behind it: the driver sees you (failed)');
  check(far && /tappade/.test(far[1].sub), 'far behind: you lose it (failed)');
}

// ---------- 24. "Bullfabriken" with the town's traffic about (v0.9.1) ----------
// The truck used to push into the intersections and swing wide round the corners; with cars about
// it could get wedged among them for good, and then you could never get to the site.
{
  console.log('Bullfabriken: lastbilen i stadstrafiken');
  const tailInTraffic = (seed, warm, hook) => {
    const g = new Game({ seed });
    const m = g.mission;
    m.restore(livsSave([...UP_TO_OPENING, 'syltburken']));
    run(g, warm);
    m.offer('fabriken'); m.accept('fabriken'); run(g, 0.2);
    const job = m.active;
    const car = g.addVehicle('sedan', 'blue', FACTORY_START.x, FACTORY_START.z + 6, Math.PI);
    enterCar(g, car);
    parkAt(g, FACTORY_START.x, FACTORY_START.z, Math.PI); run(g, 3);
    const r = { g, job, t: 0, joined: false, turn: false, stop: 0 };
    let still = 0;
    while (r.t < 150 && job.stage === 'tail') {
      const tr = job.truck;
      car.x = tr.x - Math.sin(tr.h) * 30; car.z = tr.z - Math.cos(tr.h) * 30; car.h = tr.h; car.vx = tr.vx; car.vz = tr.vz;
      g.step(DT, idle); r.t += DT;
      if (tr.driver === 'ai' && tr.ai && tr.ai.dest) r.joined = true;
      if (g.traffic.occ.some((list) => list.some((o) => o.car === tr))) r.turn = true;
      still = tr.speed < 0.5 ? still + DT : 0;
      r.stop = Math.max(r.stop, still);
      if (hook) hook(r, tr);
    }
    return r;
  };
  const runs = [[5, 4], [17, 9], [29, 14], [41, 19], [108, 27]].map(([seed, warm]) => tailInTraffic(seed, warm));
  check(runs.every((r) => r.job.stage === 'sneak'), `with traffic: the truck gets to the site every time (${runs.map((r) => r.t.toFixed(0)).join(', ')} s)`);
  check(runs.every((r) => r.stop < 20), `never stuck for long (longest stop ${Math.max(...runs.map((r) => r.stop)).toFixed(1)} s)`);
  check(runs.every((r) => r.joined && r.turn), 'off the bridge it joins the traffic and waits its turn at the intersections');
  const tr = runs[0].job.truck;
  check(tr.driver === null && tr.parkedSpot && !tr.ai, 'at the gate the driver gets out: parked, the traffic drives round it');
  // pushed off the streets (put back on the bridge, where there are no lanes): it drives itself, and
  // joins the traffic again at the end of the bridge; lost its way in town: it drives itself until
  // it is on a lane again
  let phase = 0, lost = false;
  const r2 = tailInTraffic(5, 4, (r, t) => {
    if (phase === 0 && r.joined && t.z > -60) {
      phase = 1;
      t.x = 38.2; t.z = -190; t.h = 0; t.vx = t.vz = t.w = 0;
      r.g.traffic.replan(t);
      lost = !!(t.ai && t.ai.lost);
      r.joined = false;
    } else if (phase === 1 && r.joined) phase = 2;
    else if (phase === 2 && t.z > -60) { phase = 3; t.ai.lost = true; r.joined = false; }
    else if (phase === 3 && r.joined) phase = 4;
  });
  check(lost && phase === 4 && r2.job.stage === 'sneak', 'pushed off the streets: it drives itself, joins the traffic again and gets there');
}

// ---------- 25. side quest (indoors): "Salong Saxen" (v1.0) ----------
{
  console.log('Salong Saxen (sidouppdrag, inomhus)');
  const g0 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g0.mission.restore(livsSave(UP_TO_SAFE));
  const ev0 = record(g0, ['sms']);
  run(g0, 40);
  check(!ev0.some(([n, d]) => n === 'sms' && d.offer === 'salong'), 'not before the konditori has opened');

  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave(UP_TO_OPENING));
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk', 'salon', 'indoor']);
  run(g, 25);
  check(!m.known.has('salong'), 'not right away');
  run(g, 6);
  const offer = ev.find(([n, d]) => n === 'sms' && d.offer === 'salong');
  check(offer && offer[1].from === 'Vera (Salong Saxen)' && /Skolgatan/.test(offer[1].text), 'Vera at Salong Saxen texts: three customers, a broken wrist');
  check(m.info('salong').side && m.list().find((q) => q.id === 'salong').side, 'it is a side quest');
  m.accept('salong');
  // in a car at the door: in you go on foot
  const car = g.addVehicle('sedan', 'blue', SALON_DOOR.x - 6, SALON_DOOR.z + 3, Math.PI / 2);
  enterCar(g, car);
  parkAt(g, SALON_DOOR.x, SALON_DOOR.z + 0.4, Math.PI / 2); run(g, 0.5);
  check(!m.active && ev.some(([n, d]) => n === 'toast' && /till fots/.test(d.text)), 'by car: "in you go on foot", nothing starts');
  g.step(DT, { ...idle, action: true }); run(g, 1);
  walkHere(g, SALON_DOOR.x + 3, SALON_DOOR.z + 2); run(g, 0.3);
  walkHere(g, SALON_DOOR.x, SALON_DOOR.z); run(g, 1.4);
  const job = m.active;
  check(job && job.id === 'salong' && g.indoors.inside && g.indoors.where === 'salon', 'through the door: inside the salon');
  check(m.prompt !== 'GÅ UT', 'a step inside the door (not straight out again)');
  check(job.fia && job.queue.length === 3 && job.queue.every((c) => c.ped.state === 'lounge'), 'Vera on her stool, three customers on the sofa');
  walkHere(g, SALON.talk.x - 1.2, SALON.talk.z);
  check(m.prompt === 'PRATA', 'PRATA by Vera');
  press(g);
  const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'salong').pop();
  check(job.stage === 'talk' && tk && tk[1].pages.some((pg) => /Jonte/.test(pg.text)), 'Vera explains – and a bike thief called Jonte took her saddle');
  m.talkDone('salong'); run(g, 0.5);
  check(job.stage === 'work', 'to work');
  const waitChair = () => { for (let t = 0; t < 20 && !(job.current && job.current.state === 'chair'); t += 0.1) run(g, 0.1); return job.current; };
  const use = (id) => {
    const T = SALON_TOOLS[id];
    walkHere(g, T.x, T.z);
    const p1 = m.prompt; press(g);
    walkHere(g, SALON.work.x + 0.15, SALON.work.z + 1.0);
    const p2 = m.prompt; press(g); run(g, 1.2);
    return [p1, p2];
  };
  // Kim: short and blue
  const kim = waitChair();
  check(kim && kim.def.id === 'kim' && ev.some(([n, d]) => n === 'say' && /Kort och blått/.test(d.text)), 'Kim sits down: "short and blue, please"');
  const [p1, p2] = use('sax');
  check(p1 === 'SAX' && p2 === 'KLIPP' && !(kim.ped.body.look.style & 1) && ev.some(([n, d]) => n === 'salon' && d.kind === 'cut'), 'the scissors (SAX) at the counter, KLIPP at the chair: the long hair is gone');
  use('rosa');
  check(kim.state === 'chair' && ev.some(([n, d]) => n === 'say' && /Rosa\?!.*blått/.test(d.text)), 'the wrong colour: "pink?! I said blue" – but a colour can be dyed over');
  use('bla');
  check(kim.happy === true && kim.state === 'leave' && kim.ped.body.look.hair === 0x2f6fe0, 'blue: a happy customer');
  run(g, 0.5);
  check(g.peds.list.includes(kim.ped), 'and walks out of the door (not gone on the spot)');
  // Bengt: the beard off, the hair stays – you cut it anyway
  const bengt = waitChair();
  check(bengt && bengt.def.id === 'bengt' && kim.state === 'gone', 'Kim has left, Bengt sits down');
  use('sax');
  check(bengt.happy === false && ev.some(([n, d]) => n === 'say' && /MITT HÅR/.test(d.text)) && ev.some(([n, d]) => n === 'salon' && d.kind === 'angry'), 'the hair he said not to touch: off he goes, angry');
  // Lasse: blond, and the beard stays
  const lasse = waitChair();
  check(lasse && lasse.def.id === 'lasse', 'Lasse is the last one');
  use('sax');
  check(lasse.state === 'chair' && ev.some(([n, d]) => n === 'toast' && /redan kort hår/.test(d.text)), 'scissors on short hair: nothing to cut, no harm done');
  use('blond');
  check(lasse.happy === true, 'blond: happy');
  run(g, 3.5);
  const vk = ev.filter(([n, d]) => n === 'talk' && d.id === 'salong').pop();
  check(job.stage === 'verdict' && /Två av tre/.test(vk[1].pages[0].text), 'two out of three: Vera is pleased');
  const money0 = g.money;
  m.talkDone('salong'); run(g, 0.5);
  const paid = g.money - money0;
  check(m.done.has('salong') && paid >= SALON_PAY.base + 2 * SALON_PAY.happy && paid <= SALON_PAY.base + 2 * (SALON_PAY.happy + SALON_PAY.tip), `side quest done: ${paid} kr with the tips`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'SIDOUPPDRAG KLART' && d.sub === 'Salong Saxen') && g.stats.salonHappy === 2, 'SIDOUPPDRAG KLART, two happy customers in the stats');
  run(g, 9);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Vera (Salong Saxen)' && /Jonte/.test(d.text)), 'Vera texts afterwards: keep an eye out for Jonte');
  walkHere(g, SALON.door.x, SALON.door.z);
  check(m.prompt === 'GÅ UT', 'GÅ UT by the door');
  press(g); run(g, 1.2);
  check(!g.indoors.inside && Math.hypot(g.player.x - SALON_DOOR.x, g.player.z - SALON_DOOR.z) < 2.5, 'out on Skolgatan again');
  run(g, 2);
  check(!g.peds.list.includes(job.fia), 'the salon is empty again');
}
{
  console.log('Salong Saxen: otåliga och arga kunder, försök igen');
  const g = new Game({ seed: 11, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave(UP_TO_OPENING));
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk']);
  m.offer('salong'); m.accept('salong');
  walkHere(g, SALON_DOOR.x, SALON_DOOR.z); run(g, 1.4);
  let job = m.active;
  walkHere(g, SALON.talk.x - 1.2, SALON.talk.z); press(g);
  m.talkDone('salong'); run(g, 0.5);
  for (let t = 0; t < 20 && !(job.current && job.current.state === 'chair'); t += 0.1) run(g, 0.1);
  const kim = job.current;
  run(g, SALON_PAY.patience + 1);
  check(kim.happy === false && ev.some(([n, d]) => n === 'say' && /inte hela dagen/.test(d.text)), 'wait too long: the customer gets up and goes');
  for (let t = 0; t < 20 && !(job.current && job.current.state === 'chair'); t += 0.1) run(g, 0.1);
  const T = (id) => SALON_TOOLS[id];
  walkHere(g, T('bla').x, T('bla').z); press(g);
  walkHere(g, SALON.work.x + 0.15, SALON.work.z + 1.0); press(g); run(g, 1.2);
  check(job.queue[1].happy === false && ev.some(([n, d]) => n === 'say' && /Vem bad om färg/.test(d.text)), 'dye on someone who did not ask for it: angry');
  for (let t = 0; t < 20 && !(job.current && job.current.state === 'chair'); t += 0.1) run(g, 0.1);
  walkHere(g, T('rak').x, T('rak').z); press(g);
  walkHere(g, SALON.work.x + 0.15, SALON.work.z + 1.0); press(g); run(g, 1.2);
  check(job.queue[2].happy === false && ev.some(([n, d]) => n === 'say' && /Mitt skägg/.test(d.text)), 'the beard that was to stay: angry');
  run(g, 3.5);
  const vk = ev.filter(([n, d]) => n === 'talk' && d.id === 'salong').pop();
  check(job.stage === 'verdict' && /Ingen nöjd kund/.test(vk[1].pages[0].text), 'no happy customer at all');
  m.talkDone('salong'); run(g, 0.5);
  check(!m.done.has('salong') && ev.some(([n, d]) => n === 'banner' && d.kind === 'fail'), 'failed – but the quest stays open');
  run(g, 4);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Vera (Salong Saxen)' && /Kom tillbaka/.test(d.text)), 'Vera: come back and try three new customers');
  walkHere(g, SALON.door.x, SALON.door.z); press(g); run(g, 1.2);
  check(!g.indoors.inside && !g.peds.list.includes(job.fia), 'out you go, and the salon empties');
  // again: the short version from Vera, and walking out half way is no failure
  walkHere(g, SALON_DOOR.x + 2, SALON_DOOR.z + 3); run(g, 7);
  walkHere(g, SALON_DOOR.x, SALON_DOOR.z); run(g, 1.4);
  job = m.active;
  check(job && job.id === 'salong' && g.indoors.inside, 'back in: three new customers');
  walkHere(g, SALON.talk.x - 1.2, SALON.talk.z); press(g);
  const tk2 = ev.filter(([n, d]) => n === 'talk' && d.id === 'salong').pop();
  check(tk2 && tk2[1].pages.length === 2 && /Nya kunder/.test(tk2[1].pages[0].text), 'Vera keeps it short the second time');
  m.talkDone('salong'); run(g, 0.5);
  const fails0 = ev.filter(([n, d]) => n === 'banner' && d.kind === 'fail').length;
  walkHere(g, SALON.door.x, SALON.door.z); press(g); run(g, 1.6);
  check(!m.active && ev.filter(([n, d]) => n === 'banner' && d.kind === 'fail').length === fails0, 'walking out half way: no failure, the quest waits');
  run(g, 1);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Vera (Salong Saxen)' && /Kunderna gick hem/.test(d.text)), 'Vera texts: the customers went home');
}

// ---------- 26. main quest, part 8: "Bullfesten" – Jonte the bike thief (v1.0) ----------
const UP_TO_FACTORY = [...UP_TO_OPENING, 'syltburken', 'fabriken', 'cykelretur'];
function festGame(seed = 7, opts = { traffic: 0, peds: 0 }) {
  const g = new Game({ seed, ...opts });
  g.mission.restore(livsSave(UP_TO_FACTORY));
  return g;
}
// into the party: the talk up to Jonte on the bike, then after him
function festStart(g) {
  const m = g.mission;
  walkHere(g, FEST.mark.x, FEST.mark.z); run(g, 1.6);
  const job = m.active;
  m.talkFx('bullfest', 'steal');
  m.talkDone('bullfest'); run(g, 0.2);
  return job;
}
{
  console.log('Bullfesten (huvuduppdrag del 8)');
  const g = festGame();
  const m = g.mission;
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk', 'caught', 'buns', 'horn', 'endcard']);
  // standing by the square: the party is set up out of sight
  walkHere(g, -33.4, 4); run(g, 16);
  check(m.known.has('bullfest') && ev.some(([n, d]) => n === 'sms' && d.offer === 'bullfest'), 'tant Gun texts: the bun party on the square');
  check(!m.party.up, 'not set up while you stand by the square');
  walkHere(g, -100, -60); run(g, 0.5);
  const P = m.party, gun = m.flag.gun;
  const table = g.layout.colliders.find((c) => c.fest);
  check(P.up && P.sander && P.pia && P.people.length >= 10, 'out of sight: the party is up – people, Polis-Pia, and Jonte in the crowd');
  check(g.bike && Math.hypot(g.bike.x - FEST.bike.x, g.bike.z - FEST.bike.z) < 0.5 && g.bike.buns && g.redBike && g.redBike.type === 'racebike', 'Arne\'s bike with a box of buns by the table, a red racing bike by the square');
  check(table.h > 0.5 && Math.hypot(gun.x - FEST.table.x0, gun.z - FEST.table.z1) < 3 && m.flag.pinned, 'the long table is up, tant Gun behind it');
  // Gun at the party: a party line (not the old "the north bridge, don't forget")
  walkHere(g, gun.x, gun.z + 1.4);
  check(m.prompt === 'PRATA', 'PRATA by tant Gun');
  press(g);
  const gunSay = ev.filter(([n, d]) => n === 'say' && d.who === gun).pop();
  check(gunSay && /festen|bordet/.test(gunSay[1].text), `she says something about the party ("${gunSay && gunSay[1].text}")`);
  m.accept('bullfest');
  const job = festStart(g);
  const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'bullfest').pop();
  check(tk && tk[1].pages.length === 9 && tk[1].pages.some((pg) => pg.who === 'Jonte' && pg.fx === 'steal') && tk[1].pages.some((pg) => /cykeltjuv/.test(pg.text)), 'the party talk: Gun, Bengt, Melker, Polis-Pia warns about a bike thief – and Jonte');
  const S = P.sander, bike = g.bike;
  check(job.stage === 'chase' && S.state === 'ride' && bike.driver === 'racer' && bike.locked, 'Jonte is off on Arne\'s bike (locked: no getting on while he rides it)');
  check(ev.some(([n, d]) => n === 'horn' && d.car === bike), 'with a ring of the bell');
  run(g, 4);
  const away = Math.hypot(bike.x - FEST.bike.x, bike.z - FEST.bike.z);
  check(away > 18 && Math.abs(S.x - bike.x) < 1 && Math.abs(S.z - bike.z) < 1, `he rides off – ${away.toFixed(0)} m in 4 s – sitting on the saddle`);
  check(m.targets.some((t) => t.kind === 'racer' && t.car === bike && t.gps), 'the red arrow and the GPS on him');
  check(/Ta fast Jonte/.test(m.objective), 'objective: catch Jonte');
  // onto the red racer, and after him (close behind: you grab his hood)
  const red = g.redBike;
  walkHere(g, red.x - 0.6, red.z); press(g);
  check(g.player.inCar && g.player.car === red, 'you take his red racing bike');
  const pv = (g.player.car.spec.maxSpeed);
  check(pv > CAR_TYPES.bike.maxSpeed, 'faster than Arne\'s old bike');
  let t = 0;
  while (t < 10 && job.stage === 'chase') {
    const back = t < 2 ? 6 : 1.0;
    red.x = bike.x - Math.sin(bike.h) * back; red.z = bike.z - Math.cos(bike.h) * back; red.h = bike.h; red.vx = bike.vx; red.vz = bike.vz;
    g.step(DT, idle); t += DT;
  }
  check(job.stage === 'run' && g.stats.sanderHow === 'grab' && S.state === 'down', 'right behind him: you grab his hood, he tumbles off');
  check(bike.fallen && !bike.buns && ev.some(([n]) => n === 'buns'), 'the bike falls over, the buns go everywhere');
  check(m.targets.some((t2) => t2.kind === 'contact' && t2.ref === S && t2.gps), 'now he is on foot: the GPS on him');
  // off the bike and after him: you are quicker on foot
  g.step(DT, { ...idle, action: true }); run(g, 0.3);
  t = 0;
  while (t < 15 && job.stage === 'run') {
    const p = g.player, dx = S.x - p.x, dz = S.z - p.z, d = Math.hypot(dx, dz) || 1, y = Math.PI, ux = dx / d, uz = dz / d;
    g.step(DT, { ...idle, moveX: -ux * Math.cos(y) + uz * Math.sin(y), moveY: ux * Math.sin(y) + uz * Math.cos(y), camYaw: y }); t += DT;
  }
  check(job.stage === 'caught', `caught on foot after ${t.toFixed(1)} s`);
  run(g, 1);
  const ck = ev.filter(([n, d]) => n === 'talk' && d.id === 'bullfest').pop();
  check(ck && ck[1].pages.some((pg) => pg.who === 'Jonte' && /ger mig/.test(pg.text)) && ck[1].pages.some((pg) => pg.who === 'Polis-Pia' && /Var är de andra/.test(pg.text)) && ck[1].pages.some((pg) => /båthuset/.test(pg.text)), 'he gives up – Polis-Pia asks where the other bikes are (the old boathouse)');
  m.talkFx('bullfest', 'pia');
  check(Math.hypot(P.pia.x - S.x, P.pia.z - S.z) < 3, 'Polis-Pia is there');
  const money0 = g.money;
  m.talkDone('bullfest'); run(g, 0.5);
  check(m.done.has('bullfest') && g.money - money0 === FEST.reward && g.stats.sanderCaught, `main quest part 8 done: ${FEST.reward} kr`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'HUVUDUPPDRAG KLART' && d.sub === 'Bullfesten'), 'HUVUDUPPDRAG KLART');
  run(g, 15);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Tant Gun (Storgatan)' && /räddad/.test(d.text)), 'tant Gun: the party is saved');
  check(ev.some(([n]) => n === 'endcard') && ev.some(([n, d]) => n === 'sms' && /version 1\.1\.2/.test(d.text)), 'all eleven done: the end card (version 1.1.2)');
  const next = m.list().find((q) => q.id === 'cykelgomman');
  check(next && next.state === 'soon' && /Jonte/.test(next.line), 'next in the list: "Cykelgömman", coming soon');
  // you walk off: Pia takes Jonte away, the bike goes home, the party winds down
  walkHere(g, -100, -60); run(g, 14);
  check(!g.peds.list.includes(S) && !g.peds.list.includes(P.pia), 'Pia and Jonte are gone');
  check(Math.hypot(g.bike.x - BIKE_RETURN.x, g.bike.z - BIKE_RETURN.z) < 3 && !g.bike.fallen, 'Arne\'s bike is back by the tower');
  check(!P.up && table.h === 0 && !m.flag.pinned, 'the party is over: the table is gone, Gun goes home');
}
{
  console.log('Bullfesten: han kommer undan, bilen, trafiken');
  // standing still: Jonte gets away; back at the party he tries again
  const g = festGame(9);
  const m = g.mission;
  const ev = record(g, ['sms', 'banner', 'talk', 'toast']);
  m.offer('bullfest'); m.accept('bullfest');
  walkHere(g, -100, -60); run(g, 0.5);
  let job = festStart(g);
  let t = 0;
  while (t < 60 && m.active === job) { g.step(DT, idle); t += DT; }
  check(!m.active && ev.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /undan/.test(d.sub)), `just watching: he gets away (after ${t.toFixed(0)} s)`);
  run(g, 4);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Polis-Pia' && /festen/.test(d.text)), 'Polis-Pia: he has been seen by the square again');
  walkHere(g, -100, -60); run(g, 4);
  check(g.bike && Math.hypot(g.bike.x - FEST.bike.x, g.bike.z - FEST.bike.z) < 0.5 && m.party.sander && Math.hypot(m.party.sander.x - 0.9, m.party.sander.z - 13.9) < 1, 'out of sight: Jonte and the bike are back at the party');
  run(g, 4);
  job = festStart(g);
  const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'bullfest').pop();
  check(job.stage === 'chase' && tk[1].pages.length === 3 && /tillbaka/.test(tk[1].pages[0].text), 'the second time: a short talk – and he is off again');
  // in a car: a bump knocks him off
  const car = g.addVehicle('sedan', 'blue', -10, 4, Math.PI / 2);
  enterCar(g, car);
  t = 0;
  const bike = g.bike;
  while (t < 10 && job.stage === 'chase') {
    car.x = bike.x - Math.sin(bike.h) * 2.2; car.z = bike.z - Math.cos(bike.h) * 2.2; car.h = bike.h; car.vx = bike.vx; car.vz = bike.vz;
    g.step(DT, idle); t += DT;
  }
  check(job.stage === 'run' && g.stats.sanderHow === 'bump', 'in a car: a bump and he is off the bike');
  run(g, 0.3);
  check(ev.some(([n, d]) => n === 'toast' && /Kliv ur och ta fast honom/.test(d.text)) || Math.hypot(m.party.sander.x - car.x, m.party.sander.z - car.z) > 6, 'out of the car to catch him');

  // the town's traffic can knock him off too
  const g2 = festGame(13);
  const m2 = g2.mission;
  m2.offer('bullfest'); m2.accept('bullfest');
  walkHere(g2, -100, -60); run(g2, 0.5);
  const job2 = festStart(g2);
  run(g2, 2);
  const van = g2.addVehicle('van', 'white', g2.bike.x + 3, g2.bike.z, 0);
  g2.onCrash(g2.bike, 5, van, g2.bike.x, g2.bike.z);
  check(job2.stage === 'run' && g2.stats.sanderHow === 'traffic', 'a car hits him: off he comes');
}
{
  console.log('Jontes röda racercykel');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  g.mission.restore(livsSave(['lasse']));
  g.mission.lasse = 'steal';
  const red = g.spawnRedBike(-90, -42.5, Math.PI / 2);
  check(red && red.type === 'racebike' && red.spec.bike && !red.isRed, 'a bike (red, but not a red CAR for Lasse)');
  walkHere(g, red.x - 0.6, red.z); press(g);
  check(g.player.inCar && g.player.car === red && g.mission.lasse === 'steal', 'you can ride it – Lasse\'s job does not count it');
  run(g, 6, { ...idle, moveY: 1, camYaw: Math.PI / 2 });
  check(red.speed > 9.5 && red.speed < 12.5, `flat out about 11 m/s (${red.speed.toFixed(1)} m/s)`);
  g.step(DT, { ...idle, action: true }); run(g, 2);
  const again = g.spawnRedBike(-90, -38, 0);
  check(g.vehicles.filter((v) => v.type === 'racebike').length === 1 && again === g.redBike, 'there is only ever one');
}

console.log(fails ? `\n${fails} check(s) failed` : '\nAll mission checks passed');
process.exit(fails ? 1 : 0);
