// Missions: the quest log (accept, wait, follow), the pizza job, the street race, tant Gun's flag,
// failing, saving and the end card.
import { Game } from '../src/game.js';
import { PIZZERIA, MACKEN, DELIVERY, PIZZA_CAR, GUN, TOWER_DOOR, SAMUEL_REWARD } from '../src/config.js';
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
  check(sms2.some(([n]) => n === 'endcard'), 'end card when all four are done');
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

console.log(fails ? `\n${fails} check(s) failed` : '\nAll mission checks passed');
process.exit(fails ? 1 : 0);
