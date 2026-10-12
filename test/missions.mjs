// Missions: the quest log (accept, wait, follow), the pizza job, the street race, tant Gun's flag,
// failing, saving and the end card.
import { Game, MILL } from '../src/game.js';
import { PIZZERIA, MACKEN, DELIVERY, PIZZA_CAR, GUN, TOWER_DOOR, SAMUEL_REWARD, PIER_BENCH, PIER_MEET, HANDOVER_REWARD, CURB_H, ISLAND, GUN_GATE, GUN_BIKE, BIKE_REWARD, LIVS_DOOR, INGVAR, LIVS_REWARD, EGG_BONUS, EGGS, OFFICE_DOOR, SAFE_TIME, SAFE_REWARD, LEIF, LEIF_MARK, SAMUEL_WAIT, KEY_TIME, KEY_REWARD, KONDITORI, PICKUPS, OPENING_REWARD, LASSE_SHOP, JUMP_GOAL, JUMP_REWARD, JUMP_START, JAR, FACTORY_START, TAIL, SITE_OFFICE, FACTORY_REWARD, BIKE_RETURN, HOME_DELIVERY, SALON_DOOR, SALON_PAY, FEST, BIRGER, BIKES_HOME, BIKE_HOME_PAY, BIKES_HOME_BONUS, NOVA_DOOR, NOVA_PAY, HOMECOMING } from '../src/config.js';
import { SALON, TOOLS as SALON_TOOLS } from '../src/salon.js';
import { HOUSE, SPOTS as HOUSE_SPOTS } from '../src/birger.js';
import { ROOM as NOVA_ROOM, THINGS as NOVA_THINGS } from '../src/nova.js';
import { HUTS, KIDS, TOVE_AT, HUT_PAY } from '../src/beachhuts.js';
import { CAR_TYPES } from '../src/vehicle.js';
import { OFFICE } from '../src/office.js';
import { SHOP } from '../src/shop.js';
import { ISLE, onIsle } from '../src/island.js';
import { SOUTH, WHEEL, CAROUSEL, COASTER, CO_LEN, CO_PERIOD, onSouth, inTivoli, gondolaPivot, nextGondola, coasterH, coasterCar, southRoadDist } from '../src/southisle.js';
import { WHEEL_FARE } from '../src/rides.js';
import { UTSIKT, EBBE, MASEN } from '../src/tivolijobs.js';
import { CO_STUCK_T } from '../src/southisle.js';
import { SECRETS, SECRET_COUNT, monsterRise, DUCKS, duckAt } from '../src/secrets.js';
import { CHAPEL, CHAPEL_DOOR, PEWS, CHAPEL_KAFFE } from '../src/chapel.js';
import { KYRK, KYRK_MAX, kyrkPay, GUESTS } from '../src/kyrkkaffe.js';
import { Organ, ORGAN, PSALM, VERSES } from '../src/organ.js';
import { HUNT, HUNT_MAX, RIDDLES, LADDER } from '../src/skattjakt.js';
import { CodeLock, LOCK } from '../src/lock.js';
import { FLASK, FLASK_MAX } from '../src/flaskpost.js';
import { ELSA_HOUSE, ELSA_SPOTS, ELSA_DOOR } from '../src/elsa.js';
import { routePoints, landOf } from '../src/route.js';
import { CHASE, ESCAPE_BONUS } from '../src/bikejob.js';
import { INT, inFlat } from '../src/interior.js';
import { raceRoute, TOUCH_PACE } from '../src/race.js';
import { clamp, wrapAngle, fmt } from '../src/rng.js';
import { circleVs } from '../src/collide.js';

const DT = 1 / 60;
const WHO_PIA = 'Polis-Pia';
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
  check(!sms2.some(([n]) => n === 'endcard'), "no end card while Jonte's hideout is left");
  g2.mission.done.add('cykelgomman');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(!sms2.some(([n]) => n === 'endcard'), 'no end card while Birger is not home yet');
  g2.mission.done.add('birger');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(!sms2.some(([n]) => n === 'endcard'), 'no end card while Dahlgren has the photos');
  g2.mission.done.add('utsikten');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(!sms2.some(([n]) => n === 'endcard'), "no end card while Arne's treasure hunt is left");
  g2.mission.done.add('skattjakt');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(!sms2.some(([n]) => n === 'endcard'), "no end card while Ingvar's message in a bottle is left");
  g2.mission.done.add('flaskpost');
  g2.mission.checkAllDone();
  run(g2, 10.5);
  check(sms2.some(([n]) => n === 'endcard'), 'end card when all sixteen are done');
  check(sms2.some(([n, d]) => n === 'sms' && /version 1\.12/.test(d.text) && /Flaskposten kom fram/.test(d.text)), 'the last text: version 1.12, the message in the bottle got there');
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
  check(!ev.some(([n]) => n === 'endcard'), 'no end card yet: part 9 is left (v1.2)');
  const next = m.list().find((q) => q.id === 'cykelgomman');
  check(next && (next.state === 'soon' || m.known.has('cykelgomman')), `next in the list: "Cykelgömman" (${next && next.line})`);
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


// (v1.4.1) can you WALK from the door to (x, z)? A flood fill over a 10 cm grid of places where the
// player fits (radius r) – the old checks only teleported you to each spot, so a bike blocking a
// doorway went unnoticed.
function reachable(g, from, targets, bounds, r = 0.32) {
  const cs = 0.1, nx = Math.ceil((bounds.x1 - bounds.x0) / cs), nz = Math.ceil((bounds.z1 - bounds.z0) / cs);
  const y = g.world.groundHeight(from.x, from.z);
  const fits = (x, z) => !g.world.query(x, z, r).some((c) => c.h > y + 0.3 && circleVs(c, x, z, r));
  const idx = (i, k) => k * nx + i, seen = new Uint8Array(nx * nz), q = [];
  const ci = (x) => Math.floor((x - bounds.x0) / cs), ck = (z) => Math.floor((z - bounds.z0) / cs);
  const s = idx(ci(from.x), ck(from.z)); seen[s] = 1; q.push(s);
  while (q.length) {
    const c = q.pop(), i = c % nx, k = (c - i) / nx;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = k + dk;
      if (a < 0 || b < 0 || a >= nx || b >= nz || seen[idx(a, b)]) continue;
      seen[idx(a, b)] = 2;
      if (fits(bounds.x0 + (a + 0.5) * cs, bounds.z0 + (b + 0.5) * cs)) { seen[idx(a, b)] = 1; q.push(idx(a, b)); }
    }
  }
  return targets.filter((t) => { for (let di = -2; di <= 2; di++) for (let dk = -2; dk <= 2; dk++) if (seen[idx(ci(t.x) + di, ck(t.z) + dk)] === 1) return false; return true; });
}

// ---------- 27. main quest, part 9: "Cykelgömman" – Jonte's hideout in Birger's house (v1.2) ----------
const UP_TO_FEST = [...UP_TO_FACTORY, 'bullfest'];
function hideGame(seed = 7, opts = { traffic: 0, peds: 0 }) {
  const g = new Game({ seed, ...opts });
  g.mission.restore(livsSave(UP_TO_FEST));
  return g;
}
{
  console.log('Cykelgömman (huvuduppdrag del 9)');
  const g = hideGame();
  const m = g.mission;
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk', 'keys', 'endcard', 'horn']);
  walkHere(g, -33.4, 4); run(g, 17);
  check(m.known.has('cykelgomman') && ev.some(([n, d]) => n === 'sms' && d.offer === 'cykelgomman' && /båthuset/.test(d.text) && /Birger/.test(d.text)), 'Polis-Pia texts: the boathouse was empty – Birger next door to tant Gun');
  const pia = m.gatePia;
  check(pia && Math.hypot(pia.x - BIRGER.pia.x, pia.z - BIRGER.pia.z) < 0.5 && pia.npc === 'pia', 'Polis-Pia waits by Birger\'s gate');
  check(Math.abs(BIRGER.gate.x - GUN.x) < 45 && Math.abs(BIRGER.gate.z - GUN.z) < 6, 'the house next door to tant Gun\'s on Storgatan');
  m.accept('cykelgomman'); run(g, 0.1);
  check(m.targets.some((t) => t.kind === 'contact' && t.letter === 'P' && t.gps), 'the P marker by the gate, with the GPS');
  // in a car: Pia wants you on foot
  const car = g.addVehicle('sedan', 'blue', BIRGER.gate.x - 8, -42.5, Math.PI / 2);
  enterCar(g, car);
  parkAt(g, BIRGER.gate.x, BIRGER.gate.z - 0.4, Math.PI / 2); run(g, 0.5);
  check(!m.active && ev.some(([n, d]) => n === 'toast' && /Polis-Pia väntar/.test(d.text)), 'by car: "Kliv ur – Polis-Pia väntar vid grinden"');
  g.step(DT, { ...idle, action: true }); run(g, 1);
  walkHere(g, -62.5, -40); run(g, 0.3);
  walkHere(g, BIRGER.gate.x, BIRGER.gate.z); run(g, 1);
  const job = m.active;
  check(job && job.id === 'cykelgomman' && job.stage === 'talk' && g.player.frozen, 'on foot into the P: the talk with Pia');
  const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'cykelgomman').pop();
  check(tk && tk[1].pages.some((pg) => /reservnyckel/.test(pg.text)) && tk[1].pages.some((pg) => /husrannsakan/.test(pg.text)), 'no warrant – but Gun has Birger\'s spare key');
  m.talkDone('cykelgomman'); run(g, 0.3);
  check(job.stage === 'door' && /Birgers hus/.test(m.objective) && m.targets.some((t) => t.kind === 'zone' && t.gps && Math.hypot(t.x - BIRGER.door.x, t.z - BIRGER.door.z) < 0.1), 'the key – then to the front door (GPS)');
  walkHere(g, BIRGER.door.x, BIRGER.door.z); run(g, 1.5);
  check(g.indoor && g.indoors.where === 'birger' && job.stage === 'search', 'in through the front door: Birger\'s house');
  check(Math.hypot(g.player.x - HOUSE.spawn.x, g.player.z - HOUSE.spawn.z) < 0.5, 'just inside the door');
  check(m.targets.filter((t) => t.kind === 'item').length === HOUSE_SPOTS.length && job.spots().length === HOUSE_SPOTS.length, `${HOUSE_SPOTS.length} places to search (arrows and the minimap)`);
  // every spot can be reached on foot from the door (nothing blocks the way)
  for (const s of HOUSE_SPOTS) {
    const free = !g.world.query(s.x, s.z, 0.3).some((c) => c.h > g.player.y + 0.3 && circleVs(c, s.x, s.z, 0.3));
    check(free, `the spot by the ${s.id} is free to stand on`);
  }
  // (v1.4.1) every place to search can be reached on foot from the front door – nothing blocks a doorway
  const stuck = reachable(g, HOUSE.spawn, HOUSE_SPOTS, HOUSE.bounds);
  check(!stuck.length, `you can walk from the front door to every place to search${stuck.length ? ' – NOT to: ' + stuck.map((s) => s.id).join(', ') : ''}`);
  // walk out half-way: no failure, Pia keeps the key with you
  walkHere(g, HOUSE.door.x, HOUSE.door.z);
  check(m.prompt === 'GÅ UT', 'GÅ UT by the front door');
  press(g); run(g, 1.5);
  check(!g.indoor && !m.active && m.isOpen('cykelgomman') && !ev.some(([n, d]) => n === 'banner' && d.kind === 'fail'), 'out half-way: the quest stays open, no failure');
  run(g, 1);
  check(ev.some(([n, d]) => n === 'sms' && d.from === WHO_PIA && /Nyckeln har du kvar/.test(d.text)), 'Pia: you still have the key');
  walkHere(g, -62.5, -40); run(g, 4);
  walkHere(g, BIRGER.gate.x, BIRGER.gate.z); run(g, 1);
  const job2 = m.active;
  const tk2 = ev.filter(([n, d]) => n === 'talk' && d.id === 'cykelgomman').pop();
  check(job2 && job2.stage === 'talk' && tk2[1].pages.length === 1, 'the second time: one line from Pia');
  m.talkDone('cykelgomman'); run(g, 0.3);
  walkHere(g, BIRGER.door.x, BIRGER.door.z); run(g, 1.5);
  // search: first the jokes, then the two things Pia needs
  const order = ['kyl', 'sang', 'soffa', 'garderob', 'badkar'];
  for (const id of order) {
    const s = HOUSE_SPOTS.find((q) => q.id === id);
    walkHere(g, s.x, s.z);
    check(m.prompt === 'LETA', `LETA by the ${id}`);
    press(g); run(g, 1);
    const r = ev.filter(([n, d]) => n === 'talk' && d.id === 'cykelgomman').pop();
    check(r && r[1].pages[0].text.startsWith(s.text.slice(0, 20)) && g.player.frozen, `searching the ${id}: "${s.text.slice(0, 34)}…"`);
    m.talkDone('cykelgomman'); run(g, 0.3);
    if (id === 'soffa') check(job2.found.has('bok') && ev.some(([n, d]) => n === 'keys' && d.item === 'bok'), 'under the sofa cushion: Jonte\'s notebook');
    if (id !== 'badkar') { walkHere(g, s.x, s.z); check(m.prompt !== 'LETA', `nothing more to find at the ${id}`); }
  }
  check(job2.found.has('sadel') && job2.stage === 'honk', 'in the bathtub: Vera\'s saddle – both found');
  run(g, 1.5);
  check(ev.some(([n, d]) => n === 'horn' && d.other) && ev.some(([n, d]) => n === 'toast' && /tutar/.test(d.text)) && /Gå ut/.test(m.objective), 'a horn outside: "Gå ut!"');
  walkHere(g, HOUSE.door.x, HOUSE.door.z); press(g); run(g, 1.5);
  const van = job2.van;
  check(!g.indoor && job2.stage === 'chase' && van && van.paint === 'ronny' && van.type === 'van', 'outside: Ronny\'s brown van at the kerb');
  check(m.targets.some((t) => t.kind === 'racer' && t.car === van && t.gps), 'the red arrow and the GPS on the van');
  run(g, 4);
  check(Math.hypot(van.x - BIRGER.van.x, van.z - BIRGER.van.z) > 15 && van.speed > 6, `it drives off (${van.speed.toFixed(1)} m/s)`);
  check(/Stoppa skåpbilen/.test(m.objective) && /Motorn 100 %/.test(m.sub), `objective: stop the van (${m.sub})`);
  // ramming it: the engine gives up, Ronny gets out
  van.damage(70); run(g, 0.3);
  check(job2.stage === 'stopped' && job2.ronny && van.driver === null, 'rammed enough: the engine dies, Ronny gets out');
  walkHere(g, job2.ronny.x + 1.6, job2.ronny.z); run(g, 1);
  check(job2.stage === 'final', 'walk up to him: the talk');
  const ck = ev.filter(([n, d]) => n === 'talk' && d.id === 'cykelgomman').pop();
  check(ck && ck[1].pages.some((pg) => pg.who === 'Ronny' && /ger mig/.test(pg.text)) && ck[1].pages.some((pg) => pg.who === 'Polis-Pia' && /kusin/.test(pg.text)) && ck[1].pages.some((pg) => /Elva cyklar/.test(pg.text)), 'Ronny gives up – Jonte\'s cousin – eleven bikes');
  m.talkFx('cykelgomman', 'pia');
  check(Math.hypot(m.gatePia.x - job2.ronny.x, m.gatePia.z - job2.ronny.z) < 2.5, 'Polis-Pia is there');
  const money0 = g.money;
  m.talkDone('cykelgomman'); run(g, 0.5);
  check(m.done.has('cykelgomman') && g.money - money0 === BIRGER.reward && g.stats.hideoutFound, `main quest part 9 done: ${BIRGER.reward} kr`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'HUVUDUPPDRAG KLART' && d.sub === 'Cykelgömman'), 'HUVUDUPPDRAG KLART');
  run(g, 15);
  check(!ev.some(([n]) => n === 'endcard'), 'no end card yet: part 10 is left (v1.5)');
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Tant Gun (Storgatan)' && /kylskåp/.test(d.text)), 'tant Gun texts');
  run(g, 10);
  check(m.known.has('cyklarhem') && ev.some(([n, d]) => n === 'sms' && d.offer === 'cyklarhem'), 'a while later: Pia offers "Cyklarna hem"');
  walkHere(g, 40, 100); run(g, 10);
  check(!g.peds.list.includes(job2.ronny) && !g.peds.list.includes(pia) && van.removed, 'out of sight: Pia takes Ronny and the van away');
}
{
  console.log('Cykelgömman: skåpbilen kommer undan');
  const g = hideGame(9);
  const m = g.mission;
  const ev = record(g, ['sms', 'banner', 'toast']);
  m.offer('cykelgomman'); m.accept('cykelgomman');
  m.flags.hideTalked = true; m.flags.hideFound = true; // (as if you had searched the house already)
  walkHere(g, BIRGER.gate.x, BIRGER.gate.z); run(g, 0.5);
  const job = m.active;
  check(job && job.stage === 'chase' && job.van && ev.some(([n, d]) => n === 'toast' && /Ronny är tillbaka/.test(d.text)), 'after a failure: no talk, Ronny\'s van is back at the gate');
  let t = 0;
  while (t < 60 && m.active === job) { g.step(DT, idle); t += DT; }
  check(!m.active && ev.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /undan/.test(d.sub)), `standing still: the van gets away (after ${t.toFixed(0)} s)`);
  run(g, 4);
  check(ev.some(([n, d]) => n === 'sms' && d.from === WHO_PIA && /kom undan/.test(d.text)) && m.isOpen('cykelgomman'), 'Pia: he will be back – try again');
  // with the town's traffic about, the van drives off along the roads on several seeds
  for (const seed of [7, 13, 21]) {
    const g2 = hideGame(seed, {});
    const m2 = g2.mission;
    m2.offer('cykelgomman'); m2.accept('cykelgomman');
    m2.flags.hideTalked = true; m2.flags.hideFound = true;
    walkHere(g2, BIRGER.gate.x, BIRGER.gate.z); run(g2, 0.5);
    const j = m2.active, v = j.van;
    let far = 0;
    for (let k = 0; k < 12; k++) { const p = g2.player; p.x = v.x - Math.sin(v.h) * 25; p.z = v.z - Math.cos(v.h) * 25; run(g2, 1); far = Math.max(far, Math.hypot(v.x - BIRGER.van.x, v.z - BIRGER.van.z)); }
    check(m2.active === j && far > 60, `seed ${seed}, with traffic: the van gets away down the road (${far.toFixed(0)} m)`);
  }
}

// ---------- 28. side quest: "Cyklarna hem" – three bikes to their owners (v1.2) ----------
{
  console.log('Cyklarna hem (sidouppdrag)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave([...UP_TO_FEST, 'cykelgomman']));
  const ev = record(g, ['sms', 'banner', 'toast', 'talk']);
  walkHere(g, -33.4, 4); run(g, 24);
  check(m.known.has('cyklarhem') && ev.some(([n, d]) => n === 'sms' && d.offer === 'cyklarhem' && /Vera/.test(d.text)), 'Polis-Pia texts: three bikes have owners who want them today');
  m.accept('cyklarhem'); run(g, 1.5);
  const job = m.active;
  check(job && job.id === 'cyklarhem' && g.vehicles.filter((v) => v.type === 'citybike').length === 3, 'it starts at once: three town bikes put out along the way');
  check(BIKES_HOME.every((b) => { const v = job.bikes[b.id]; return v.paint === b.paint && Math.hypot(v.x - b.bike.x, v.z - b.bike.z) < 0.5; }), 'Vera\'s by Birger\'s gate, Lasse\'s by the salon, Yasmin\'s by the garage');
  check(m.targets.filter((t) => t.kind === 'car').length === 3 && m.targets.filter((t) => t.kind === 'car' && t.gps).length === 1, 'arrows over all three, the GPS to the nearest');
  check(Object.values(job.owners).every((o) => g.peds.list.includes(o)), 'Vera, Lasse and Yasmin wait outside');
  // Yasmin's first (any order), then Vera's (no saddle), then Lasse's
  let paid = g.money;
  for (const id of ['yasmin', 'vera', 'lasse']) {
    const E = BIKES_HOME.find((b) => b.id === id), b = job.bikes[id];
    walkHere(g, b.x - 0.7, b.z); press(g);
    check(g.player.inCar && g.player.car === b, `on ${id}'s bike`);
    if (id === 'vera') check(ev.some(([n, d]) => n === 'toast' && /Ingen sadel/.test(d.text)), 'Vera\'s bike has no saddle: you pedal standing up');
    check(m.targets.some((t) => t.kind === 'zone' && t.gps && t.x === E.zone.x), `the GPS to ${id}`);
    run(g, 1.5, { ...idle, moveY: 1 });
    check(b.speed > 3, `you can ride it (${b.speed.toFixed(1)} m/s)`);
    b.x = E.zone.x; b.z = E.zone.z; b.vx = b.vz = 0; run(g, 1);
    check(job.stage === 'talk' && !g.player.inCar, `at ${id}'s: off the bike and a talk`);
    const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'cyklarhem').pop();
    check(tk && tk[1].pages[0].who === { vera: 'Vera', lasse: 'Lasse', yasmin: 'Yasmin' }[id], `${tk && tk[1].pages[0].who}: "${tk && tk[1].pages[0].text.slice(0, 30)}…"`);
    m.talkDone('cyklarhem'); run(g, 0.5);
    check(!job.left.includes(id) && b.locked, `${id}'s bike is home (and stays with its owner)`);
  }
  paid = g.money - paid;
  check(m.done.has('cyklarhem') && paid === 3 * BIKE_HOME_PAY + BIKES_HOME_BONUS, `all three home: ${paid} kr`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'SIDOUPPDRAG KLART' && d.sub === 'Cyklarna hem'), 'SIDOUPPDRAG KLART');
  run(g, 7);
  check(ev.some(([n, d]) => n === 'sms' && d.from === WHO_PIA && /Birger/.test(d.text)), 'Pia: Birger comes home on Saturday');
  walkHere(g, 100, -100); run(g, 10);
  check(!g.vehicles.some((v) => v.type === 'citybike') && !Object.values(job.owners).some((o) => g.peds.list.includes(o)), 'out of sight: the owners go in with their bikes');
}

// ---------- 29. side quest (indoors): "Konsertbiljetten" – Nova's room (v1.4) ----------
function intoNova(g) {
  const m = g.mission;
  walkHere(g, NOVA_DOOR.x, NOVA_DOOR.z); run(g, 2);
  const job = m.active;
  m.talkDone('konsert'); run(g, 0.2);
  return job;
}
function tidyOne(g, t) {
  walkHere(g, t.fx, t.fz); press(g);
  walkHere(g, t.sx, t.sz); press(g);
}
{
  console.log('Konsertbiljetten (sidouppdrag, inomhus)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave(UP_TO_OPENING));
  const ev = record(g, ['sms', 'banner', 'toast', 'talk', 'say', 'keys']);
  walkHere(g, -33.4, 4); run(g, 42);
  check(m.known.has('konsert') && ev.some(([n, d]) => n === 'sms' && d.offer === 'konsert' && /K-pop Demonjägarna/.test(d.text)), 'Nova texts: K-pop Demonjägarna tonight, the ticket is gone, the room must be tidy');
  m.accept('konsert'); run(g, 0.1);
  check(m.targets.some((t) => t.kind === 'contact' && t.letter === 'N' && t.gps), 'the N by the new door behind Macken, with the GPS');
  const free = !g.world.query(NOVA_DOOR.x, NOVA_DOOR.z, 0.4).some((c) => c.h > 0.5 && circleVs(c, NOVA_DOOR.x, NOVA_DOOR.z, 0.4));
  check(free, 'the door marker stands free on the pavement');
  walkHere(g, NOVA_DOOR.x, NOVA_DOOR.z); run(g, 2);
  const job = m.active;
  check(job && job.id === 'konsert' && g.indoor && g.indoors.where === 'nova' && job.stage === 'talk', 'in through the door: Nova\'s room, and the talk');
  const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'konsert').pop();
  check(tk && tk[1].pages.some((pg) => /Demonjägarna/.test(pg.text)) && tk[1].pages.some((pg) => /90 sekunder/.test(pg.text)), 'the K-pop concert – and mum is home in 90 seconds');
  check(!!g.layout.signs.kdh && /DEMONJÄGARNA/.test(g.layout.signs.kdh.lines.join(' ')), 'a K-POP DEMONJÄGARNA poster on the wall');
  m.talkDone('konsert'); run(g, 0.2);
  check(job.stage === 'tidy' && /Städa: 0 av 6/.test(m.objective) && m.targets.filter((t) => t.kind === 'item').length === 6, 'six things on the floor, arrows over them');
  // every floor spot and every place to put them is free to stand on
  for (const t of NOVA_THINGS) {
    const ok = [[t.fx, t.fz], [t.sx, t.sz]].every(([x, z]) => !g.world.query(x, z, 0.3).some((c) => c.h > g.player.y + 0.3 && circleVs(c, x, z, 0.3)));
    check(ok, `the ${t.id}: reachable on the floor and where it goes`);
  }
  // (v1.4.1) and you can walk to all of them from the door
  const stuckN = reachable(g, NOVA_ROOM.spawn, NOVA_THINGS.flatMap((t) => [{ id: t.id, x: t.fx, z: t.fz }, { id: t.id + ' (plats)', x: t.sx, z: t.sz }]), NOVA_ROOM.bounds);
  check(!stuckN.length, `you can walk from the door to every thing and every place${stuckN.length ? ' – NOT to: ' + stuckN.map((s) => s.id).join(', ') : ''}`);
  // the hoodie first: the ticket is in its pocket
  const luva = NOVA_THINGS.find((t) => t.id === 'luva');
  walkHere(g, luva.fx, luva.fz);
  check(m.prompt === 'TA', 'TA by the hoodie');
  press(g);
  check(job.held && job.held.def.id === 'luva' && job.ticket && ev.some(([n, d]) => n === 'keys' && d.item === 'ticket'), 'the ticket is in the hoodie\'s pocket!');
  check(/garderoben/.test(m.sub), `the objective says where it goes (${m.sub})`);
  const lab = NOVA_THINGS.find((t) => t.id === 'labubu');
  walkHere(g, lab.fx, lab.fz);
  check(m.prompt !== 'TA', 'one thing at a time');
  walkHere(g, luva.sx, luva.sz);
  check(m.prompt === 'LÄGG', 'LÄGG by the wardrobe');
  press(g);
  check(job.placed === 1 && !job.held, 'one in place');
  for (const t of NOVA_THINGS.filter((q) => q.id !== 'luva')) tidyOne(g, t);
  check(job.stage === 'mom' && job.mom, `all six in place (${job.left.toFixed(0)} s left): mum comes in`);
  run(g, 4);
  const mt = ev.filter(([n, d]) => n === 'talk' && d.id === 'konsert').pop();
  check(job.stage === 'verdict' && mt && mt[1].pages.some((pg) => pg.who === 'Novas mamma' && /hotell/.test(pg.text)), 'her mum: it looks like a hotel');
  const money0 = g.money;
  m.talkDone('konsert'); run(g, 0.5);
  const paid = g.money - money0;
  check(m.done.has('konsert') && paid >= NOVA_PAY.base && paid <= NOVA_PAY.base + NOVA_PAY.time * NOVA_PAY.perSec && paid % 10 === 0, `side quest done: ${paid} kr (${NOVA_PAY.base} + 10 kr per second left)`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'SIDOUPPDRAG KLART' && d.sub === 'Konsertbiljetten'), 'SIDOUPPDRAG KLART');
  walkHere(g, NOVA_ROOM.door.x, NOVA_ROOM.door.z); press(g); run(g, 1.5);
  check(!g.indoor && Math.hypot(g.player.x - NOVA_DOOR.x, g.player.z - NOVA_DOOR.z) < 1.5, 'out through the door onto Skolgatan');
  run(g, 32);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Nova (Kims lillasyster)' && /KONSERTEN/.test(d.text)), 'later Nova texts: the concert was amazing');
}
{
  console.log('Konsertbiljetten: för sent, och ut halvvägs');
  const g = new Game({ seed: 9, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave(UP_TO_OPENING));
  const ev = record(g, ['sms', 'banner', 'talk']);
  m.offer('konsert'); m.accept('konsert');
  let job = intoNova(g);
  tidyOne(g, NOVA_THINGS[1]); tidyOne(g, NOVA_THINGS[2]);
  run(g, NOVA_PAY.time);
  check(job.stage === 'verdict' && !job.tidy, 'too slow: mum is home and the room is a mess');
  m.talkDone('konsert'); run(g, 0.5);
  check(!m.active && ev.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /för tidigt/.test(d.sub)) && m.isOpen('konsert'), 'failed – but you can try again');
  run(g, 4);
  check(ev.some(([n, d]) => n === 'sms' && /en chans till/.test(d.text)), 'Nova: mum went shopping again');
  walkHere(g, NOVA_ROOM.door.x, NOVA_ROOM.door.z); press(g); run(g, 1.5);
  walkHere(g, NOVA_DOOR.x, NOVA_DOOR.z + 6); run(g, 7);
  job = intoNova(g);
  const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'konsert').pop();
  check(job.stage === 'tidy' && tk[1].pages.length === 1 && job.placed === 0, 'the second time: one line from Nova, everything back on the floor');
  // walk out half-way: no failure
  walkHere(g, NOVA_ROOM.door.x, NOVA_ROOM.door.z);
  check(m.prompt === 'GÅ UT', 'GÅ UT by the door');
  press(g); run(g, 1.5);
  check(!g.indoor && !m.active && m.isOpen('konsert') && ev.filter(([n, d]) => n === 'banner' && d.kind === 'fail').length === 1, 'out half-way: no failure, the quest stays open');
}

// ---------- 30. main quest, part 10: "Birger kommer hem" – the Sjuby Spider (v1.5) ----------
const UP_TO_HIDEOUT = [...UP_TO_FEST, 'cykelgomman'];
function driveTo(g, car, x, z, h) { car.x = x; car.z = z; car.h = h ?? car.h; car.vx = car.vz = car.w = 0; run(g, 0.4); }
{
  console.log('Birger kommer hem (huvuduppdrag del 10)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave(UP_TO_HIDEOUT));
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk', 'checkpoint', 'endcard']);
  walkHere(g, -33.4, 4); run(g, 27);
  check(m.known.has('birger') && ev.some(([n, d]) => n === 'sms' && d.offer === 'birger' && /bingon/.test(d.text)), 'tant Gun texts: Birger is home from his cruise – he won something at the bingo');
  const sp = g.spider, B = m.birger;
  check(sp && sp.type === 'spider' && sp.locked && Math.hypot(sp.x - HOMECOMING.car.x, sp.z - HOMECOMING.car.z) < 0.5, 'the Sjuby Spider waits on the quay (locked until you meet Birger)');
  check(B && Math.hypot(B.x - HOMECOMING.birger.x, B.z - HOMECOMING.birger.z) < 0.5, 'Birger stands at the foot of the pier');
  check(CAR_TYPES.spider.maxSpeed > CAR_TYPES.sedan.maxSpeed && CAR_TYPES.spider.grip > CAR_TYPES.sedan.grip && CAR_TYPES.spider.accel > CAR_TYPES.sedan.accel && CAR_TYPES.spider.open, 'the Spider: quicker, grippier and faster than a Dalahäst – and open');
  check(!sp.isRed, 'red, but not a red car for Lasse');
  m.accept('birger');
  walkHere(g, HOMECOMING.mark.x, HOMECOMING.mark.z); run(g, 1);
  const job = m.active;
  check(job && job.id === 'birger' && job.stage === 'talk', 'on the quay: the talk with Birger');
  const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'birger').pop();
  check(tk && tk[1].pages.some((pg) => /Sjuby Spider/.test(pg.text)) && tk[1].pages.some((pg) => /1987/.test(pg.text)), 'a Sjuby Spider -62 – and he hasn\'t driven since 1987');
  m.talkDone('birger'); run(g, 0.3);
  check(job.stage === 'board' && !sp.locked && m.targets.some((t) => t.kind === 'car' && t.car === sp && t.gps), 'get in the Spider (the arrow over it)');
  check(enterCar(g, sp), 'you get in');
  run(g, 0.5);
  check(job.stage === 'tour' && B.state === 'lounge', 'Birger sits down beside you');
  const seat = sp.local(0.38, -0.72), drv = sp.local(-0.38, -0.72);
  check(Math.hypot(B.x - seat.x, B.z - seat.z) < 0.05 && Math.hypot(g.player.body.x - drv.x, g.player.body.z - drv.z) < 0.05 && g.player.body.visible, 'an open car: you at the wheel, Birger in the passenger seat – both in view');
  run(g, 3, { ...idle, throttleAxis: 1, steerAxis: 0 });
  check(Math.hypot(B.x - sp.local(0.38, -0.72).x, B.z - sp.local(0.38, -0.72).z) < 0.05, 'he stays in his seat while you drive');
  // the tour: three stops, in order
  for (const [i, S] of HOMECOMING.stops.entries()) {
    check(m.targets.some((t) => t.kind === 'zone' && t.gps && t.x === S.x && t.z === S.z), `stop ${i + 1}: ${S.name} (the GPS)`);
    driveTo(g, sp, S.x, S.z);
    const said = ev.filter(([n]) => n === 'say').pop();
    check(said && said[1].who === B, `at ${S.name} Birger says: "${said && said[1].text.slice(0, 40)}…"`);
  }
  check(job.stage === 'home' && /Kör Birger hem/.test(m.objective), 'then home');
  // a knock: Birger complains, the paint shows it
  g.emit('crash', { x: sp.x, z: sp.z, impact: 8, player: true, car: sp }); sp.damage(10); run(g, 0.2);
  check(ev.filter(([n, d]) => n === 'say' && d.who === B).length >= 4 && /Lacken 9\d %/.test(m.sub), `a knock: he complains (${m.sub})`);
  driveTo(g, sp, HOMECOMING.home.x, HOMECOMING.home.z, -Math.PI / 2); run(g, 1);
  check(job.stage === 'final' && !g.player.inCar, 'outside his gate: you get out, and the talk');
  const hp = ev.filter(([n, d]) => n === 'talk' && d.id === 'birger').pop();
  check(hp && hp[1].pages.some((pg) => /din att låna/.test(pg.text)), 'the Spider is yours to borrow');
  const money0 = g.money, cond = job.health;
  m.talkDone('birger'); run(g, 0.5);
  check(m.done.has('birger') && g.money - money0 === HOMECOMING.reward + HOMECOMING.perHealth * cond, `main quest part 10 done: ${g.money - money0} kr (${cond} % of the paint left)`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'HUVUDUPPDRAG KLART' && d.sub === 'Birger kommer hem'), 'HUVUDUPPDRAG KLART');
  run(g, 15);
  check(!ev.some(([n]) => n === 'endcard') && m.list().some((q) => q.id === 'utsikten'), 'no end card yet: part 11 comes next (v1.7)');
  // afterwards: borrow it whenever – it goes back to its stall when you leave it somewhere
  const S2 = HOMECOMING.spot;
  check(enterCar(g, sp), 'you can drive the Spider afterwards');
  driveTo(g, sp, 100, 90); g.step(DT, { ...idle, action: true }); run(g, 1);
  walkHere(g, -100, 100); run(g, 4);
  check(g.spider && Math.hypot(g.spider.x - S2.x, g.spider.z - S2.z) < 0.5 && !g.spider.locked, 'left far away: out of sight it is back in its stall across from Birger\'s house');
  g.spider.damage(200); run(g, 4);
  check(g.spider && !g.spider.dead && Math.hypot(g.spider.x - S2.x, g.spider.z - S2.z) < 0.5, 'a wreck: a fresh one in the stall');
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore(livsSave([...UP_TO_HIDEOUT, 'birger']));
  check(g2.spider && Math.hypot(g2.spider.x - S2.x, g2.spider.z - S2.z) < 0.5, 'in a saved game: the Spider is in its stall');
}
{
  console.log('Birger kommer hem: för många bucklor');
  const g = new Game({ seed: 9, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave(UP_TO_HIDEOUT));
  const ev = record(g, ['sms', 'banner', 'say', 'talk']);
  m.offer('birger'); m.accept('birger');
  walkHere(g, -100, -100); run(g, 1);
  walkHere(g, HOMECOMING.mark.x, HOMECOMING.mark.z); run(g, 1);
  m.talkDone('birger'); run(g, 0.3);
  enterCar(g, g.spider); run(g, 0.5);
  g.spider.damage(65); run(g, 0.5);
  check(!m.active && ev.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /bucklorna/.test(d.sub)) && ev.some(([n, d]) => n === 'say' && /räcker/.test(d.text)), 'too many knocks: "Nu räcker det!" – failed');
  run(g, 4);
  check(ev.some(([n, d]) => n === 'sms' && /försök en gång till/.test(d.text)) && m.isOpen('birger'), 'tant Gun: try again');
  walkHere(g, -100, 100); run(g, 3);
  check(g.spider && !g.spider.dead && g.spider.health === 100 && Math.hypot(g.spider.x - HOMECOMING.car.x, g.spider.z - HOMECOMING.car.z) < 0.5 && Math.hypot(m.birger.x - HOMECOMING.birger.x, m.birger.z - HOMECOMING.birger.z) < 0.5, 'out of sight: Birger and a shiny Spider are back on the quay');
  walkHere(g, HOMECOMING.mark.x, HOMECOMING.mark.z); run(g, 1);
  const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'birger').pop();
  check(m.active && tk[1].pages.length === 1, 'the second time: one line from Birger');
}

// ---------- 31. side quest: "Badhyttsgåtan" – a logic puzzle on the beach (v1.5) ----------
{
  console.log('Badhyttsgåtan (sidouppdrag, pussel)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore(livsSave(['red', 'lasse', 'samuel', 'overlamning', 'cykel']));
  const ev = record(g, ['sms', 'banner', 'toast', 'talk', 'keys']);
  walkHere(g, 4, -340); run(g, 62);
  walkHere(g, 4, -251); run(g, 0.5);
  check(m.known.has('hytter') && ev.some(([n, d]) => n === 'sms' && d.offer === 'hytter' && /badhytt/.test(d.text)), 'Tove the lifeguard texts: four kids have forgotten which beach hut is theirs');
  const F = m.beachFolk;
  check(F && F.tove && F.kids.length === 4, 'Tove by the tower, four kids on the beach');
  // everyone stands on dry sand you can walk to from the boardwalk
  const spots = [{ id: 'Tove', x: TOVE_AT.x, z: TOVE_AT.z }, ...KIDS.map((k) => ({ id: k.name, x: k.at[0], z: k.at[1] })), ...HUTS.map((h) => ({ id: `${h.name} hytten`, x: h.door.x, z: h.door.z }))];
  const B0 = { x0: -40, x1: 28, z0: -256, z1: -219 };
  const stuck = reachable(g, { x: 4, z: -250 }, spots.map((q) => ({ ...q })), B0, 0.32);
  check(!stuck.length, `you can walk to Tove, every kid and every hut door${stuck.length ? ' – NOT to: ' + stuck.map((q) => q.id).join(', ') : ''}`);
  check(spots.every((q) => g.world.groundHeight(q.x, q.z) > 0), 'all on dry land (or the jetty)');
  m.accept('hytter');
  const Q = m.quest('hytter');
  walkHere(g, Q.x, Q.z); run(g, 1);
  const job = m.active;
  check(job && job.id === 'hytter' && job.stage === 'talk', 'at the tower: Tove explains');
  m.talkDone('hytter'); run(g, 0.2);
  check(job.stage === 'puzzle' && /0 av 4 skyltar/.test(m.objective), 'the puzzle: no signs yet');
  check(m.targets.filter((t) => t.kind === 'contact' && t.always).length === 4, 'a "?" over every hut');
  // ask the kids
  for (const [i, k] of KIDS.entries()) {
    const q = F.kids[i];
    walkHere(g, q.x + 1.2, q.z);
    check(m.prompt === 'PRATA', `PRATA by ${k.name}`);
    press(g); run(g, 0.3);
    const tk = ev.filter(([n, d]) => n === 'talk' && d.id === 'hytter').pop();
    check(tk && tk[1].pages[0].who === k.name, `${k.name}: "${k.clue.slice(0, 44)}…"`);
    m.talkDone('hytter'); run(g, 0.2);
  }
  check(job.heard.length === 4, 'all four clues heard');
  // a sign on each hut: press SKYLT to step through the names
  const signHut = (h, id) => { walkHere(g, h.door.x, h.door.z); let n = 0; while (job.tags[h.i] !== id && n++ < 6) press(g); return job.tags[h.i] === id; };
  // first a wrong answer: alphabetical
  const wrong = ['alva', 'bosse', 'cleo', 'dante'];
  check(HUTS.every((h) => signHut(h, wrong[h.i])), 'signs: Alva, Bosse, Cleo, Dante – just in order');
  walkHere(g, F.tove.x + 1.2, F.tove.z); press(g); run(g, 0.3);
  let tv = ev.filter(([n, d]) => n === 'talk' && d.id === 'hytter').pop();
  check(tv && /1 av 4 hytter stämmer/.test(tv[1].pages[0].text), `Tove tries the keys: "${tv && tv[1].pages[0].text.slice(0, 48)}…"`);
  m.talkDone('hytter'); run(g, 0.2);
  // a name on another hut is skipped: take it off there first
  walkHere(g, HUTS[0].door.x, HUTS[0].door.z); press(g);
  check(job.tags[0] === null, 'the names on the other huts are skipped: round to no sign');
  for (const h of HUTS) { walkHere(g, h.door.x, h.door.z); let n = 0; while (job.tags[h.i] !== null && n++ < 6) press(g); }
  check(job.tags.every((t) => t === null), 'all the signs off again');
  signHut(HUTS[0], 'dante'); signHut(HUTS[1], 'alva'); signHut(HUTS[2], 'cleo'); signHut(HUTS[3], 'bosse');
  check(job.tags.join() === 'dante,alva,cleo,bosse', `the answer: ${job.tags.join(', ')}`);
  // the puzzle has one answer only (check every way of putting four kids on four huts)
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));
  const ok = perms(['alva', 'bosse', 'cleo', 'dante']).filter((t) => { const at = (id) => t.indexOf(id); return at('bosse') === at('cleo') + 1 && at('alva') > 0 && at('alva') < 3 && at('dante') !== 3 && at('cleo') !== 0; });
  check(ok.length === 1 && ok[0].join() === KIDS.slice().sort((a, b) => a.hut - b.hut).map((k) => k.id).join(), 'the clues allow one answer only – the right one');
  const money0 = g.money;
  walkHere(g, F.tove.x + 1.2, F.tove.z); press(g); run(g, 0.3);
  tv = ev.filter(([n, d]) => n === 'talk' && d.id === 'hytter').pop();
  check(job.stage === 'won' && tv[1].pages.some((pg) => /Alla fyra nycklarna passar/.test(pg.text)), 'all four keys fit!');
  m.talkDone('hytter'); run(g, 0.5);
  const paid = g.money - money0;
  check(m.done.has('hytter') && paid === HUT_PAY.base - HUT_PAY.wrong, `side quest done: ${paid} kr (one wrong try: −${HUT_PAY.wrong} kr)`);
  check(ev.some(([n, d]) => n === 'banner' && d.title === 'SIDOUPPDRAG KLART' && d.sub === 'Badhyttsgåtan'), 'SIDOUPPDRAG KLART');
  walkHere(g, 40, 100); run(g, 4);
  check(!m.beachFolk, 'out of sight: Tove and the kids go back to the water');
}

// ---------- 32. Söderholmen and Tivoli Lyckoland (v1.6) ----------
{
  console.log('Söderholmen: bron, ön och tivolit');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission, W = g.world;
  m.restore({ ...livsSave(['red', 'lasse']), money: 100 });
  const ev = record(g, ['sms', 'toast', 'money', 'ride']);
  // the ground: the bridge deck, the island, the sea beside them
  check(W.groundHeight(-40, 135) === 0 && W.groundHeight(-40, 165) === 0, 'the south bridge: a road from Södra Ringvägen out over the water');
  check(W.groundHeight(-52, 165) < -1 && W.groundHeight(-28, 165) < -1, 'water on both sides of the bridge');
  check(W.groundHeight(-40, 190) === CURB_H && W.groundHeight(30, 240) === CURB_H && W.groundHeight(-100, 240) === CURB_H, 'Söderholmen is land (the road, the tivoli, the west side)');
  check(W.groundHeight(0, 295) < -1 && !onSouth(0, 295) && onSouth(0, 285), 'and the sea beyond its south shore');
  check(landOf(-40, 160) === 'bridge' && landOf(30, 240) === 'south' && landOf(0, 0) === 'town' && landOf(40, -300) === 'isle', `landOf: bridge, south, town, isle`);
  check(southRoadDist(-40, 198) < 0.5 && southRoadDist(100, 235) < 0.5, 'the road round the tivoli and the road up from the bridge');
  // the GPS: from the square to the tivoli gate, over the south bridge
  const rt = routePoints(g.layout.gps, 0, 0, SOUTH.gate.x0 + 4, SOUTH.gate.z - 4);
  check(rt.some(([x, z]) => Math.abs(x + 40) < 1 && z > 150 && z < 175) && rt.every(([x, z]) => !(z > 130 && z < 178) || Math.abs(x + 40) < 1), `the GPS line goes over the south bridge (${rt.length} points)`);
  // drive there: Kungsgatan south, over the bridge, round to the car park
  const car = g.addVehicle('sedan', 'blue', -37.5, 100, 0);
  check(enterCar(g, car), 'into a car on Kungsgatan');
  const path = routePoints(g.layout.gps, car.x, car.z, (SOUTH.parking.x0 + SOUTH.parking.x1) / 2, 214);
  let wi = 1, minDist = 1e9, maxH = 0;
  for (let i = 0; i < 60 * 40 && wi < path.length; i++) {
    const [tx, tz] = path[wi];
    if (Math.hypot(tx - car.x, tz - car.z) < 5) { wi++; continue; }
    const sn = Math.sin(car.h), cs = Math.cos(car.h), dx = tx - car.x, dz = tz - car.z;
    const lr = -dx * cs + dz * sn, lf = dx * sn + dz * cs;
    const st = clamp(Math.atan2(lr, Math.max(lf, 0.5)) * 1.6, -1, 1);
    g.step(DT, { ...idle, throttleAxis: car.speed < 9 ? 0.7 : 0.1, steerAxis: st });
    minDist = Math.min(minDist, Math.hypot(car.x - path[path.length - 1][0], car.z - path[path.length - 1][1]));
    maxH = Math.max(maxH, Math.abs(car.y - g.world.groundHeight(car.x, car.z)));
  }
  check(wi >= path.length && minDist < 6, `driven over the bridge to the tivoli's car park (${minDist.toFixed(1)} m from it)`);
  check(car.health > 95 && maxH < 0.6, `no knocks and no drops on the way (health ${car.health.toFixed(0)})`);
  // Kim tells you about it, once
  run(g, 26);
  const kim = ev.filter(([n, d]) => n === 'sms' && /Söderholmen/.test(d.text));
  check(kim.length === 1 && kim[0][1].from === 'Kim (Macken)', 'Kim texts about the new tivoli on Söderholmen');
  check(m.restore(m.progress()) && (run(g, 30), ev.filter(([n, d]) => n === 'sms' && /Söderholmen/.test(d.text)).length === 1), 'only once (saved)');
  {
    const p = g.player;
    p.exitCar(); run(g, 1);
    // on foot from the bridge landing: everywhere on the island you should get to
    const L = SOUTH.landing;
    walkHere(g, L.x + 2, L.z + 4);
    const spots = [
      { x: SOUTH.gate.x0 + 4, z: SOUTH.gate.z + 2, n: 'in under the arch' }, { x: WHEEL.board.x, z: WHEEL.board.z, n: 'the wheel\'s platform' },
      { x: 14.6, z: 211.4, n: 'BILJETTER' }, { x: 36, z: 211.2, n: 'SOCKERVADD' }, { x: 46, z: 211.4, n: 'POPCORN' }, { x: 78, z: 211.6, n: 'KORV' },
      { x: CAROUSEL.x, z: CAROUSEL.z + 8.6, n: 'by the carousel' }, { x: 26, z: 241.6, n: 'the benches by the coaster' }, { x: 80, z: 238, n: 'the east end of the promenade' },
      { x: -50.5, z: 233.6, n: 'the chapel door' }, { x: -66.2, z: 215.5, n: 'a house door' }, { x: -91.8, z: 243.5, n: 'a house door on the west road' },
      { x: 10, z: 283.5, n: 'the benches on the south cliffs' },
    ];
    const blocked = reachable(g, { x: p.x, z: p.z }, spots, { x0: -112, z0: 182, x1: 112, z1: 290 });
    check(!blocked.length, `on foot from the bridge you get everywhere${blocked.length ? ': not ' + blocked.map((b) => b.n).join(', ') : ''}`);
    const inside = reachable(g, { x: p.x, z: p.z }, [{ x: CAROUSEL.x, z: CAROUSEL.z, n: 'onto the carousel' }, { x: -7, z: 220, n: 'onto the bumper cars' }, { x: 0, z: 245, n: 'onto the coaster\'s track in the station' }], { x0: -112, z0: 182, x1: 112, z1: 290 });
    check(inside.length === 3, 'but not onto the carousel, the bumper-car floor or the coaster\'s track where it runs low');
    // the sea stops you on the south cliffs
    walkHere(g, 10, 286);
    run(g, 4, { ...idle, camYaw: 0, moveY: 1 });
    check(p.z < 291 && onSouth(p.x, p.z), `the shore stops you (z ${p.z.toFixed(1)})`);
    // the first time in under the arch
    walkHere(g, SOUTH.gate.x0 + 4, SOUTH.gate.z - 3); run(g, 0.2);
    walkHere(g, SOUTH.gate.x0 + 4, SOUTH.gate.z + 3); run(g, 0.2);
    check(ev.some(([n, d]) => n === 'toast' && /Välkommen till Tivoli Lyckoland/.test(d.text)), 'a welcome at the gate');
    // the Ferris wheel: not enough money first
    g.money = 5;
    walkHere(g, WHEEL.board.x, WHEEL.board.z);
    check(m.prompt === 'ÅK HJULET', 'on the platform: ÅK HJULET');
    press(g);
    check(p.state === 'foot' && g.money === 5 && ev.some(([n, d]) => n === 'toast' && /inte råd/.test(d.text)), 'with 5 kr: "du har inte råd"');
    g.money = 100;
    press(g);
    check(g.money === 100 - WHEEL_FARE && p.frozen, `${WHEEL_FARE} kr, and you wait for the gondola`);
    for (let i = 0; i < 60 * 5 && p.state !== 'ride'; i++) g.step(DT, idle);
    check(p.state === 'ride' && g.time - m.rides.t0 < 0.05, 'into the next empty gondola as it comes down');
    const k = m.rides.k, q0 = gondolaPivot(k, g.time), t0 = m.rides.t0, qb = gondolaPivot(k, t0);
    check(Math.abs(p.x - q0.x) < 0.05 && Math.abs(p.rideHip - (q0.y - WHEEL.hang + 0.46)) < 0.05 && Math.abs(qb.y - (WHEEL.hubY - WHEEL.r)) < 0.01 && k % 4 !== 2, 'sitting in an empty gondola, boarded at the bottom of the wheel');
    let top = 0, steps = 0;
    while (p.state === 'ride' && steps++ < 60 * (WHEEL.period + 5)) { g.step(DT, { ...idle, action: steps % 60 === 0 }); top = Math.max(top, p.rideHip); }
    check(top > WHEEL.hubY + WHEEL.r - 2.2, `up to the top: ${top.toFixed(1)} m over the ground`);
    check(ev.some(([n, d]) => n === 'toast' && /Vilken utsikt/.test(d.text)), 'the view from the top');
    check(Math.abs(g.time - t0 - WHEEL.period) < 0.1, `one turn: ${(g.time - t0).toFixed(1)} s (pressing the button does not throw you out)`);
    check(p.state === 'foot' && !p.frozen && Math.hypot(p.x - WHEEL.exit.x, p.z - WHEEL.exit.z) < 0.3 && Math.abs(p.y - g.world.groundHeight(p.x, p.z)) < 0.01, 'off again by the platform, on your feet');
    check(!reachable(g, { x: p.x, z: p.z }, [{ x: SOUTH.gate.x0 + 4, z: SOUTH.gate.z + 2 }], { x0: -25, z0: 200, x1: 90, z1: 268 }).length, 'and the way out is open');
    check(g.stats.wheelRides === 1 && ev.filter(([n]) => n === 'ride').length === 2, 'one ride counted');
  }
  // the rides: the gondolas keep their spacing, the coaster runs its round
  const nx = nextGondola(10.3), qa = gondolaPivot(nx.k, nx.at);
  check(nx.at > 10.3 && nx.at - 10.3 <= WHEEL.period / WHEEL.n + 1e-6 && Math.abs(qa.y - (WHEEL.hubY - WHEEL.r)) < 1e-6 && Math.abs(qa.x - WHEEL.x) < 1e-6, 'the next gondola reaches the bottom on time');
  let hMin = 99, hMax = 0;
  for (let s2 = 0; s2 < CO_LEN; s2 += 0.5) { hMin = Math.min(hMin, coasterH(s2)); hMax = Math.max(hMax, coasterH(s2)); }
  check(hMin > 1.2 && hMax > 12 && hMax < 14, `Måsen: ${CO_LEN.toFixed(0)} m of track, from ${hMin.toFixed(1)} to ${hMax.toFixed(1)} m up`);
  const c0 = coasterCar(0, 0), c1 = coasterCar(0, 3);
  let vMax = 0;
  for (let t = 0; t < CO_PERIOD; t += 0.1) { const a = coasterCar(0, t), b = coasterCar(0, t + 0.1); vMax = Math.max(vMax, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / 0.1); }
  check(CO_PERIOD > 40 && CO_PERIOD < 90 && Math.hypot(c0.x - c1.x, c0.z - c1.z) < 0.01 && vMax > 10 && vMax < 20, `a round takes ${CO_PERIOD.toFixed(0)} s, a pause in the station, top speed ${(vMax * 3.6).toFixed(0)} km/h`);
  check(inTivoli(CAROUSEL.x, CAROUSEL.z) && inTivoli(WHEEL.x, WHEEL.z) && inTivoli(COASTER.x1 + COASTER.r, (COASTER.zN + COASTER.zS) / 2), 'the rides are inside the fence');
}

// ---------- 33–35. Three quests at Tivoli Lyckoland (v1.7) ----------
// drive a car along the GPS route to (x, z) and stop there
function driveTo2(g, car, x, z, maxSec = 60, cruise = 13) {
  const path = routePoints(g.layout.gps, car.x, car.z, x, z);
  let wi = 1;
  for (let i = 0; i < 60 * maxSec && wi < path.length; i++) {
    if (Math.hypot(x - car.x, z - car.z) < 2.2) break;
    if (Math.hypot(x - car.x, z - car.z) < 14) wi = path.length - 1;          // (close: straight for it)
    const [tx, tz] = path[wi], last = wi === path.length - 1;
    if (Math.hypot(tx - car.x, tz - car.z) < (last ? 1.5 : 3)) { wi++; continue; }
    const sn = Math.sin(car.h), cs = Math.cos(car.h), dx = tx - car.x, dz = tz - car.z;
    const lr = -dx * cs + dz * sn, lf = dx * sn + dz * cs;
    if (lf < 0 && !last && Math.hypot(dx, dz) < 8) { wi++; continue; }   // (passed it by: on to the next)
    const st = clamp(Math.atan2(lr, Math.max(lf, 0.5)) * 1.6, -1, 1);
    // slow down before a corner (and to a stop at the end)
    const nx = path[wi + 1], turn = nx ? Math.abs(wrapAngle(Math.atan2(nx[0] - tx, nx[1] - tz) - Math.atan2(dx, dz))) : 0;
    const want = last ? Math.min(cruise, Math.hypot(dx, dz) * 0.8 + 1) : turn > 0.4 ? Math.min(cruise, 5 + Math.hypot(dx, dz) * 0.45) : cruise;
    g.step(DT, { ...idle, throttleAxis: car.speed < want ? 0.8 : -0.4, steerAxis: st });
  }
  for (let i = 0; i < 180 && car.speed > 0.5; i++) g.step(DT, { ...idle, throttleAxis: -1 });
  run(g, 0.2);
  return Math.hypot(car.x - x, car.z - z);
}
// on foot toward (x, z) – or toward a moving ped – at full run (analog, all the way out)
function runToward(g, getXZ, sec, until) {
  for (let i = 0; i < 60 * sec; i++) {
    const p = g.player, [x, z] = getXZ();
    g.step(DT, { ...idle, camYaw: Math.atan2(x - p.x, z - p.z), moveY: 1 });
    if (until && until()) return true;
  }
  return false;
}
// along a few points at a calm walk
function walkPath(g, pts, until, maxSec = 60) {
  let i = 0;
  for (let k = 0; k < 60 * maxSec; k++) {
    const p = g.player, [x, z] = pts[Math.min(i, pts.length - 1)];
    if (Math.hypot(x - p.x, z - p.z) < 0.6) { if (i < pts.length - 1) i++; else { g.step(DT, idle); if (until && until()) return true; continue; } }
    g.step(DT, { ...idle, camYaw: Math.atan2(x - p.x, z - p.z), moveY: 0.55 });
    if (until && until()) return true;
  }
  return false;
}
const lastTalk = (ev, id) => { const t = ev.filter(([n, d]) => n === 'talk' && d.id === id).pop(); return t ? t[1] : null; };
{
  console.log('Utsikten (huvuduppdrag del 11)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore({ ...livsSave([...UP_TO_HIDEOUT, 'birger']), money: 50 });
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk', 'endcard', 'money']);
  run(g, 30);
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'utsikten' && d.from === 'Bagar-Bengt'), 'Bengt texts: Dahlgren sells his photos at the tivoli');
  m.accept('utsikten');
  walkHere(g, -40, 175); run(g, 1);
  check(m.south && m.south.bengt && m.south.dahl && m.south.buyer, 'Bengt by the arch, Dahlgren and the buyer by the picnic tables');
  const blocked = reachable(g, { x: SOUTH.landing.x + 2, z: SOUTH.landing.z + 4 }, [UTSIKT.mark, { x: UTSIKT.dahl.x - 1.6, z: UTSIKT.dahl.z }, { x: WHEEL.board.x, z: WHEEL.board.z }], { x0: -112, z0: 182, x1: 112, z1: 290 });
  check(!blocked.length, 'you can walk to Bengt, the wheel and Dahlgren');
  walkHere(g, UTSIKT.mark.x, UTSIKT.mark.z); run(g, 1);
  const job = m.active;
  check(job && job.id === 'utsikten' && lastTalk(ev, 'utsikten') && /pariserhjulet/.test(lastTalk(ev, 'utsikten').pages.at(-1).text), 'Bengt: "Uppifrån! Från pariserhjulet ser man hela tivolit"');
  m.talkDone('utsikten'); run(g, 0.2);
  check(job.stage === 'wheel', 'off to the Ferris wheel');
  walkHere(g, WHEEL.board.x, WHEEL.board.z);
  check(m.prompt === 'ÅK HJULET', 'ÅK HJULET on the platform');
  press(g);
  const p = g.player;
  for (let i = 0; i < 60 * 6 && p.state !== 'ride'; i++) g.step(DT, idle);
  check(p.state === 'ride' && g.money === 50, 'into a gondola – Bengt paid');
  let n = 0;
  while (!lastTalk(ev, 'utsikten').pages.some((pg) => /Dahlgren\. Nu har jag dig/.test(pg.text)) && n++ < 60 * 40) g.step(DT, idle);
  check(job.stage === 'spot' && p.rideHip > WHEEL.hubY + WHEEL.r - 3, `spotted from the top (${p.rideHip.toFixed(1)} m up)`);
  check(Math.abs(wrapA(p.rideYaw - Math.atan2(UTSIKT.dahl.x - p.x, UTSIKT.dahl.z - p.z))) < 0.05, 'the view turns his way');
  m.talkDone('utsikten');
  for (let i = 0; i < 60 * 40 && p.state === 'ride'; i++) g.step(DT, idle);
  run(g, 0.2);
  check(job.stage === 'approach' && p.state === 'foot', 'down again: now to Dahlgren');
  const D = m.south.dahl;
  runToward(g, () => [D.x, D.z], 20, () => job.stage === 'chase');
  check(job.stage === 'chase' && D.state === 'goto', `he sees you at ${UTSIKT.notice} m and runs`);
  const caught = runToward(g, () => [D.x, D.z], 40, () => job.stage === 'caught');
  check(caught, `caught him at a run (by ${D.x.toFixed(0)}, ${D.z.toFixed(0)})`);
  run(g, 1);
  check(/Raderade/.test(lastTalk(ev, 'utsikten').pages.map((pg) => pg.text).join(' ')), 'the photos deleted');
  const money0 = g.money;
  m.talkDone('utsikten'); run(g, 1);
  check(m.done.has('utsikten') && g.money - money0 === UTSIKT.reward && ev.some(([nn, d]) => nn === 'banner' && d.sub === 'Utsikten'), `main quest part 11 done: ${UTSIKT.reward} kr`);
  run(g, 16);
  check(!ev.some(([nn]) => nn === 'endcard'), 'all fourteen done – but no end card now: part 12 is still to come (v1.11)');
  check(m.nextMain() && m.nextMain().id === 'skattjakt', '  next: "Arnes skattjakt" (Gun texts in a little while)');

  // he gets away when you only walk
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m2 = g2.mission;
  m2.restore({ ...livsSave([...UP_TO_HIDEOUT, 'birger']), money: 50 });
  const ev2 = record(g2, ['banner', 'sms', 'talk']);
  run(g2, 30); m2.accept('utsikten');
  walkHere(g2, -40, 175); run(g2, 1);
  walkHere(g2, UTSIKT.mark.x, UTSIKT.mark.z); run(g2, 1);
  m2.talkDone('utsikten'); run(g2, 0.2);
  m2.active.stage = 'approach'; m2.active.spotted = true; m2.flags.utsiktSpotted = true;  // (straight to him)
  walkHere(g2, UTSIKT.dahl.x - 8.5, UTSIKT.dahl.z + 1); run(g2, 0.3);
  check(m2.active && m2.active.stage === 'chase', 'the chase again');
  const Dg = m2.south.dahl, t0 = g2.time;
  for (let i = 0; i < 60 * 70 && m2.active; i++) g2.step(DT, idle);
  check(Math.hypot(Dg.x - UTSIKT.route.at(-1)[0], Dg.z - UTSIKT.route.at(-1)[1]) < 1, `his whole way out is clear: the car park after ${(g2.time - t0).toFixed(0)} s`);
  check(!m2.active && ev2.some(([nn, d]) => nn === 'banner' && d.sub === 'Dahlgren kom undan') && m2.isOpen('utsikten'), 'walk and he gets to the car park: "Dahlgren kom undan" – the quest stays open');
  walkHere(g2, 40, 150); run(g2, 3); walkHere(g2, -40, 175); run(g2, 2);
  check(m2.south.dahl && Math.hypot(m2.south.dahl.x - UTSIKT.dahl.x, m2.south.dahl.z - UTSIKT.dahl.z) < 1, 'out of sight he is back at the picnic tables');
  walkHere(g2, 30, 190); run(g2, 4);
  walkHere(g2, UTSIKT.mark.x, UTSIKT.mark.z); run(g2, 1);
  const tv = lastTalk(ev2, 'utsikten');
  check(m2.active && tv.pages.length === 1, 'try again: a short word from Bengt…');
  m2.talkDone('utsikten'); run(g2, 0.2);
  check(m2.active.stage === 'approach', '…and straight to Dahlgren (no new ride)');
}
{
  console.log('Var är Ebbe? (sidouppdrag)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore({ ...livsSave(['red', 'lasse']), money: 0 });
  const ev = record(g, ['sms', 'banner', 'toast', 'say', 'talk']);
  run(g, 75);
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'ebbe' && d.from === 'Hanna (Ebbes mamma)'), 'Hanna texts: Ebbe is lost at the tivoli');
  m.accept('ebbe');
  walkHere(g, -40, 175); run(g, 1);
  const S = m.south;
  check(S.hanna && S.ebbe && S.ebbe.state === 'lounge' && S.pelle && S.kalle && S.maja, 'Hanna, the three who saw him, and Ebbe on his bench');
  const spots = [EBBE.mark, ...EBBE.wit.map((w) => ({ x: w.x + Math.sin(w.h) * 1.3, z: w.z + Math.cos(w.h) * 1.3 })), { x: EBBE.ebbe.x, z: EBBE.ebbe.z - 1.6 }];
  check(!reachable(g, { x: SOUTH.landing.x + 2, z: SOUTH.landing.z + 4 }, spots, { x0: -112, z0: 182, x1: 112, z1: 290 }).length, 'you can walk up to all of them');
  walkHere(g, EBBE.mark.x, EBBE.mark.z); run(g, 1);
  const job = m.active;
  check(job && job.id === 'ebbe' && lastTalk(ev, 'ebbe').pages.length === 4, 'Hanna by the ticket booth');
  m.talkDone('ebbe'); run(g, 0.2);
  for (const [i, w] of EBBE.wit.entries()) {
    check(job.stage === 'ask' && m.objective === `Fråga ${w.name}`, `ask ${w.name}`);
    walkHere(g, w.x + Math.sin(w.h) * 1.3, w.z + Math.cos(w.h) * 1.3); run(g, 0.1);
    check(m.prompt === 'PRATA', `  PRATA by ${w.name}`);
    press(g);
    const t = lastTalk(ev, 'ebbe');
    check(t.pages[0].who === w.name, `  "${t.pages[0].text.slice(0, 50)}…"`);
    m.talkDone('ebbe'); run(g, 0.2);
    if (i === 0) {
      // walk away and come back: the clues are kept
      walkHere(g, -40, 0); run(g, 1);
      check(!m.active && m.isOpen('ebbe'), 'walking off the island: no failure');
      run(g, 3); walkHere(g, -40, 175); run(g, 1);
      walkHere(g, EBBE.mark.x, EBBE.mark.z); run(g, 1);
      check(m.active && m.active.asked === 1 && lastTalk(ev, 'ebbe').pages.length === 1, 'back with Hanna: on with the next clue');
      m.talkDone('ebbe'); run(g, 0.2);
    }
  }
  const job2 = m.active;
  check(job2.stage === 'find', 'he went toward the Ferris wheel');
  walkHere(g, EBBE.ebbe.x, EBBE.ebbe.z - 1.5); run(g, 0.1);
  check(m.prompt === 'PRATA', 'Ebbe on the bench by the wheel');
  press(g);
  check(/för liten/.test(lastTalk(ev, 'ebbe').pages[0].text), '"Jag fick inte åka Måsen. Jag är för liten."');
  m.talkDone('ebbe'); run(g, 0.2);
  check(job2.stage === 'lead', 'he comes with you');
  const ok = walkPath(g, [[46, 212.6], [30, 212.3], [20.6, 212.2]], () => job2.stage === 'final', 60);
  run(g, 0.5);
  check(ok && job2.stage === 'final', `walked back to Hanna with Ebbe at your heels`);
  m.talkDone('ebbe'); run(g, 0.5);
  check(m.done.has('ebbe') && g.money === EBBE.pay, `side quest done: ${EBBE.pay} kr`);
}
{
  console.log('Måsen har fastnat (sidouppdrag)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission;
  m.restore({ ...livsSave(['red', 'lasse']), money: 0 });
  const ev = record(g, ['sms', 'banner', 'toast', 'talk']);
  check(Math.abs(g.coasterT - g.time) < 1e-9, 'Måsen runs at first');
  run(g, 155);
  check(ev.some(([n, d]) => n === 'sms' && d.offer === 'masen' && d.from === 'Tivoli-Rut'), 'Tivoli-Rut texts: Måsen is stuck');
  run(g, 2);
  const c0 = coasterCar(0, g.coasterT);
  check(g.coasterT === CO_STUCK_T && coasterH(coasterCar(0, g.coasterT).x - COASTER.x0) > 10 && c0.pitch > 0.1, `stuck high up the lift hill (${(c0.y).toFixed(1)} m, nose up)`);
  m.accept('masen');
  walkHere(g, -40, 175); run(g, 1);
  check(m.south.rut, 'Rut at the station');
  check(!reachable(g, { x: SOUTH.landing.x + 2, z: SOUTH.landing.z + 4 }, [MASEN.mark], { x0: -112, z0: 182, x1: 112, z1: 290 }).length, 'you can walk up to her');
  walkHere(g, MASEN.mark.x, MASEN.mark.z); run(g, 1);
  const job = m.active;
  check(job && job.id === 'masen' && lastTalk(ev, 'masen').pages.length === 5, 'Rut: the drive belt is gone, Lasse has a new one');
  const van = m.rutVan;
  check(van && Math.hypot(van.x - MASEN.van.x, van.z - MASEN.van.z) < 0.5, 'her white van in the car park');
  m.talkDone('masen'); run(g, 0.2);
  check(job.stage === 'drive', `${MASEN.time} seconds`);
  walkHere(g, van.x - 2, van.z);
  check(enterCar(g, van), 'into the van');
  const t0 = g.time;
  const d1 = driveTo2(g, van, MASEN.lasse.x, MASEN.lasse.z, 80);
  run(g, 0.3);
  check(job.stage === 'back' && m.masenLasse, `Lasse in his gate on Drottninggatan (${d1.toFixed(1)} m) after ${(g.time - t0).toFixed(0)} s: the belt`);
  const d2 = driveTo2(g, van, MASEN.back.x, MASEN.back.z, 80);
  run(g, 0.3);
  check(job.stage === 'carry' && job.left > 0, `back at the arch (${d2.toFixed(1)} m) with ${Math.ceil(job.left)} s to spare`);
  g.player.exitCar(); run(g, 1);
  walkHere(g, MASEN.mark.x, MASEN.mark.z); run(g, 0.1);
  check(m.prompt === 'GE REMMEN', 'GE REMMEN by Rut');
  press(g);
  m.talkFx('masen', 'go');
  m.talkDone('masen'); run(g, 1);
  const ct = g.coasterT; run(g, 2);
  check(m.done.has('masen') && g.money === job.amount && job.amount === MASEN.base + MASEN.perSec * Math.ceil(job.left), `side quest done: ${job.amount} kr`);
  check(g.coasterT > ct + 1.9, 'and Måsen runs again');
  // too slow
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m2 = g2.mission;
  m2.restore({ ...livsSave(['red', 'lasse']), money: 0 });
  const ev2 = record(g2, ['banner']);
  run(g2, 160); m2.accept('masen');
  walkHere(g2, -40, 175); run(g2, 1);
  walkHere(g2, MASEN.mark.x, MASEN.mark.z); run(g2, 1);
  m2.talkDone('masen'); run(g2, MASEN.time + 1);
  check(!m2.active && ev2.some(([n, d]) => n === 'banner' && d.sub === 'Åkarna fick vänta för länge') && m2.isOpen('masen') && g2.coasterT === CO_STUCK_T, 'too slow: failed, and Måsen is still stuck');
}

// ---------- 36. The Easter eggs (v1.8) ----------
{
  console.log('Hemligheterna (påskägg)');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission, p = g.player;
  m.restore({ ...livsSave(['red', 'lasse', 'cykel']), money: 0 });
  const ev = record(g, ['banner', 'toast', 'talk', 'ring', 'secret', 'ollie']);
  const S = Object.fromEntries(SECRETS.map((q) => [q.id, q]));
  check(SECRET_COUNT === 8, `${SECRET_COUNT} secrets`);
  // (v1.8.1) the pond shows its water: nothing flat lies over the middle of it, higher than the water
  const pond = g.layout.zones.pond, inPoly = (pts, x, z) => { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
  const water = g.layout.prims.find((q) => q.t === 'poly' && q.m === 6 /* M.WATER */ && inPoly(q.pts, pond.x, pond.z));
  const cover = g.layout.prims.filter((q) => q.t === 'poly' && q !== water && q.y > water.y + 0.001 && inPoly(q.pts, pond.x, pond.z));
  check(water && !cover.length, `the park pond: water you can see (${cover.length} things lying over it)`);
  check(DUCKS.length === 5 && [0, 1, 2, 3, 4].every((i) => { const d = duckAt(i, 33); return Math.hypot(d.x - pond.x, d.z - pond.z) < pond.r - 2.5; }), 'five rubber ducks swimming round inside it');
  // you can walk up to every one of them (from a street, the bridge landings)
  const town = SECRETS.filter((q) => ['skate', 'phone', 'ducks', 'heart', 'monster'].includes(q.id));
  check(!reachable(g, { x: -33.4, z: 4 }, town.map((q) => ({ x: q.x, z: q.z })), { x0: -146, z0: -172, x1: 146, z1: 146 }).length, 'in town: the pitch, the phone box, the pond, the stump, the end of the pier');
  check(!reachable(g, { x: ISLE.landing.x, z: ISLE.landing.z - 3 }, [S.goldbun, S.gnome], { x0: -55, z0: -405, x1: 147, z1: -229 }).length, 'on Norrholmen: the golden bun among the spruces, the gnome');
  check(!reachable(g, { x: SOUTH.landing.x + 2, z: SOUTH.landing.z + 4 }, [S.bottle], { x0: -125, z0: 182, x1: 124, z1: 290 }).length, 'on Söderholmen: the bottle on the cliffs');
  // the skateboard: lies on the pitch, ride it, jump
  walkHere(g, -27.5, 150); run(g, 1);
  const sk = g.skate;
  check(sk && Math.hypot(sk.x - S.skate.x, sk.z - S.skate.z) < 0.1, 'a skateboard on the football pitch');
  walkHere(g, S.skate.x - 0.5, S.skate.z - 1.5);
  check(p.near === sk, 'ÅKA by it');
  press(g); run(g, 0.5);
  check(p.inCar && p.car === sk && g.stats.secrets.includes('skate') && ev.some(([n, d]) => n === 'banner' && d.title === 'HEMLIGHET!' && /1 av 8/.test(d.sub)), 'on it: HEMLIGHET! 1 av 8');
  run(g, 4, { ...idle, throttleAxis: 1 });
  check(sk.speed > 6.5 && sk.speed < 9, `pushing off: ${(sk.speed * 3.6).toFixed(0)} km/h`);
  g.step(DT, { ...idle, throttleAxis: 1, horn: true });
  let top = 0; for (let i = 0; i < 60; i++) { g.step(DT, { ...idle, throttleAxis: 1 }); top = Math.max(top, sk.y - g.world.groundHeight(sk.x, sk.z)); }
  check(top > 0.3 && !sk.air && ev.some(([n]) => n === 'ollie'), `HOPPA: an ollie ${(top * 100).toFixed(0)} cm up, and down again`);
  check(sk.health === 100, 'a skateboard does not get dented');
  run(g, 2, { ...idle, handbrake: true });
  g.step(DT, { ...idle, action: true }); run(g, 1);
  check(p.state === 'foot' && !p.inCar && sk.speed < 0.5, 'brake, and off again');
  // things to look at
  for (const id of ['ducks', 'heart', 'goldbun', 'gnome', 'bottle']) {
    const q = S[id];
    walkHere(g, q.x, q.z); run(g, 0.1);
    check(m.prompt === 'UNDERSÖK', `UNDERSÖK by ${q.name}`);
    press(g); run(g, 2);
    check(g.stats.secrets.includes(id) && ev.some(([n, d]) => n === 'toast' && d.text === q.text), `  ${q.name}: "${q.text.slice(0, 46)}…"`);
    walkHere(g, q.x, q.z); run(g, 0.1);
    check(m.prompt !== 'UNDERSÖK', '  (found: no prompt any more)');
  }
  // the phone box rings when you come near; the voice gives a riddle
  walkHere(g, S.phone.x + 22, S.phone.z); run(g, 3);
  check(ev.some(([n]) => n === 'ring'), 'the phone box rings as you come along the quay');
  walkHere(g, S.phone.x, S.phone.z); run(g, 0.1);
  check(m.prompt === 'SVARA', 'SVARA');
  press(g);
  const call = lastTalk(ev, 'secret-phone');
  check(call && call.pages.some((pg) => /8 hemligheter/.test(pg.text)) && /Sitt längst ut på bryggan/.test(call.pages.at(-1).text), `a riddle for one not found yet: "${call && call.pages.at(-1).text.slice(15, 60)}…"`);
  m.talkDone('secret-phone'); run(g, 1);
  check(g.stats.secrets.includes('phone') && g.stats.secrets.length === 7, '7 of 8');
  const rings = ev.filter(([n]) => n === 'ring').length; run(g, 20);
  check(ev.filter(([n]) => n === 'ring').length === rings && m.prompt !== 'SVARA', 'then quiet for a while');
  // the sea monster: at the end of the pier, wait
  walkHere(g, S.monster.x, S.monster.z);
  let waited = 0; while (!g.stats.secrets.includes('monster') && waited++ < 60 * 80) g.step(DT, idle);
  check(g.stats.secrets.includes('monster') && monsterRise(g.time) > 0.5, `at the end of the pier: Sjubyodjuret rises (after ${(waited / 60).toFixed(0)} s)`);
  check(ev.some(([n, d]) => n === 'banner' && /8 av 8/.test(d.sub)), 'all eight: 8 av 8');
  // kept in the save
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore(m.progress());
  check(g2.stats.secrets.length === 8, 'kept in the save');
  walkHere(g2, S.phone.x, S.phone.z); run(g2, 0.1); press(g2);
  const ev2 = lastTalk(record(g2, ['talk']), 'secret-phone');
  void ev2;
}

// ---------- 37. Söderholmens kapell from the inside (v1.9) ----------
{
  console.log('Kapellet');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission, p = g.player, ind = g.indoors;
  m.restore({ ...livsSave(['red', 'lasse', 'cykel']), money: 0 });
  const ev = record(g, ['talk', 'toast', 'indoor']);
  // the tower door: you can walk there from the bridge landing
  check(!reachable(g, { x: SOUTH.landing.x + 2, z: SOUTH.landing.z + 4 }, [CHAPEL_DOOR], { x0: -125, z0: 182, x1: 124, z1: 290 }).length, 'you can walk up to the chapel door');
  walkHere(g, CHAPEL_DOOR.x, CHAPEL_DOOR.z); run(g, 0.1);
  check(m.prompt === 'GÅ IN', 'GÅ IN at the tower door');
  walkHere(g, CHAPEL_DOOR.x + 4, CHAPEL_DOOR.z - 3); run(g, 0.1);
  check(m.prompt !== 'GÅ IN', '  (not a few steps away)');
  walkHere(g, CHAPEL_DOOR.x, CHAPEL_DOOR.z); press(g); run(g, 1.2);
  check(g.indoor && ind.where === 'chapel' && Math.hypot(p.x - CHAPEL.spawn.x, p.z - CHAPEL.spawn.z) < 0.3, 'in: just inside the door, facing the altar');
  check(ev.some(([n, d]) => n === 'toast' && /kapell/.test(d.text)), `  "${(ev.find(([n, d]) => n === 'toast' && /kapell/.test(d.text)) || [0, { text: '' }])[1].text}"`);
  const inga = ind.priest;
  check(inga && g.peds.list.includes(inga) && Math.hypot(inga.x - CHAPEL.priest.x, inga.z - CHAPEL.priest.z) < 0.1 && Math.abs(wrapAngle(inga.h - Math.PI)) < 0.01, 'kyrkoherde Inga stands in front of the altar, facing the pews');
  const sitters = ind.chapelFolk.slice(1);
  check(sitters.length === 3 && sitters.every((q) => q.state === 'lounge' && PEWS.some(([x0, z0, x1, z1]) => q.x > CHAPEL.room.x0 + x0 && q.x < CHAPEL.room.x0 + x1 && q.z > CHAPEL.room.z0 + z0 && q.z < CHAPEL.room.z0 + z1)), 'three people sitting in the pews');
  check(PEWS.length === 12 && PEWS.every(([x0, , x1]) => x1 <= 3.3 || x0 >= 4.7), 'six rows of pews with an aisle between them');
  // walk it: up the aisle, into the pews, through the gap in the rail to the altar
  const R = CHAPEL.room, Bd = CHAPEL.bounds;
  const spots = [{ x: R.x0 + 4, z: R.z0 + 10.5 }, { x: R.x0 + 2, z: R.z0 + 3.0 + 1.25 * 3 + 0.55 + 0.35 }, { x: R.x0 + 6.5, z: R.z0 + 2.65 }, { x: R.x0 + 4, z: R.z0 + 12.0 }, { x: R.x0 + 5.6, z: R.z0 + 12.0 }];
  check(!reachable(g, CHAPEL.spawn, spots, Bd).length, 'you can walk up the aisle, in between the pews and up to the altar');
  check(reachable(g, CHAPEL.spawn, [{ x: R.x0 + 4, z: R.z0 - 1.5 }], { x0: Bd.x0, z0: Bd.z0 - 2, x1: Bd.x1, z1: Bd.z1 }).length === 1, '  but not out through the walls');
  // walk up the aisle for real and talk to her
  walkHere(g, CHAPEL.spawn.x, CHAPEL.spawn.z);
  let t = 0; while (m.prompt !== 'PRATA' && t++ < 60 * 12) g.step(DT, { ...idle, moveY: 1, camYaw: 0 });
  check(m.prompt === 'PRATA' && p.z > R.z0 + 9.5, `walked up the aisle: PRATA by Inga (${(t / 60).toFixed(1)} s)`);
  press(g);
  const t1 = lastTalk(ev, 'inga');
  check(t1 && t1.pages[0].who === 'Kyrkoherde Inga' && t1.pages.some((pg) => /Arne/.test(pg.text) && /1972/.test(pg.text)), `Inga: "${t1 && t1.pages[0].text.slice(0, 50)}…" – and Arne and Gun married here`);
  check(Math.abs(wrapAngle(inga.h - Math.atan2(p.x - inga.x, p.z - inga.z))) < 0.05, '  she turns to you');
  m.talkDone('inga'); run(g, 0.3);
  check(Math.abs(wrapAngle(inga.h - Math.PI)) < 0.01 && !g.camFocus, '  and back to the pews afterwards');
  press(g);
  const t2 = lastTalk(ev, 'inga');
  check(t2 !== t1 && t2.pages.length === 1, `again: "${t2 && t2.pages[0].text.slice(0, 50)}…"`);
  m.talkDone('inga'); run(g, 0.3);
  // out again
  walkHere(g, CHAPEL.door.x, CHAPEL.door.z); run(g, 0.1);
  check(m.prompt === 'GÅ UT', 'GÅ UT by the door');
  press(g); run(g, 1.2);
  check(!g.indoor && Math.hypot(p.x - CHAPEL_DOOR.x, p.z - CHAPEL_DOOR.z) < 1.2 && !g.peds.list.includes(inga) && !ind.chapelFolk.length, 'out on the gravel path; the people inside are gone');
  // not while a job is running
  m.active = { id: 'x', prompt: null }; p.x = CHAPEL_DOOR.x; p.z = CHAPEL_DOOR.z; ind.update(0);
  check(ind.prompt !== 'GÅ IN', 'no GÅ IN while a job is running');
  m.active = null;
}

// ---------- 38. side quest "Kyrkkaffet" (v1.10): Gun's buns on Arne's bike, the bell and the organ ----------
{
  console.log('Kyrkkaffet (sidouppdrag i kapellet): orgeln');
  // the organ on its own (organ.js): Inga's verses, a wrong key, the replay, waiting, getting up, the finale
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const ev = record(g, ['organ']);
  const O = new Organ(g);
  const host = { verses: [], wrongs: 0, fin: 0, done: 0, organVerse(i) { this.verses.push(i); }, organWrong() { this.wrongs++; }, organFinale() { this.fin++; }, organDone() { this.done++; } };
  const tick = (sec) => { for (let i = 0; i < Math.round(sec * 60); i++) O.update(DT); };
  check(PSALM.length === 15 && PSALM.every((k) => k >= 0 && k < 5) && VERSES.length === 3 && VERSES.every(([a, b]) => a < b && b <= PSALM.length), 'the psalm: fifteen notes on five keys, in three verses');
  check(O.press(2) === 'off', 'not sitting at it: the keys do nothing');
  O.begin('psalm', host);
  check(O.phase === 'intro' && O.press(2) === 'wait', 'sitting down: Inga first – a key now is not your turn');
  tick(ORGAN.intro + 0.05);
  check(O.phase === 'demo', '  she sings the first verse');
  tick(3);
  const demo = ev.filter(([, d]) => d.kind === 'demo').map(([, d]) => d.k);
  check(O.phase === 'turn' && JSON.stringify(demo) === JSON.stringify(PSALM.slice(0, 4)), `  the keys light up one by one (${demo.join(' ')}), then it is your turn`);
  check(O.press(PSALM[0]) === 'ok' && O.pos === 1, 'the right key: the next note');
  check(O.press((PSALM[1] + 2) % 5) === 'wrong' && O.mistakes === 1 && host.wrongs === 1 && O.phase === 'wrong' && ev.some(([, d]) => d.kind === 'wrong'), 'a wrong key: a sour note (and a mistake)');
  tick(ORGAN.wrong + 0.05);
  check(O.phase === 'demo' && O.verse === 0, '  she sings the same verse again');
  tick(3);
  for (const k of PSALM.slice(0, 4)) O.press(k);
  check(O.phase === 'good' && host.verses.join() === '0', 'played back right: "Fint!"');
  tick(ORGAN.good + 0.05);
  check(O.phase === 'demo' && O.verse === 1 && O.notes.length === 8, '  verse two: the whole first line, eight notes');
  tick(5);
  check(O.phase === 'turn', '  your turn');
  tick(ORGAN.wait + 0.1);
  check(O.phase === 'demo' && O.mistakes === 1, `no key for ${ORGAN.wait} s: she sings it again (no mistake counted)`);
  O.stop();
  check(!O.open && O.verse === 1 && O.press(2) === 'off', 'SLUTA: up from the bench, still on verse two');
  O.begin('psalm', host);
  tick(ORGAN.intro + 5);
  for (const k of PSALM.slice(0, 8)) O.press(k);
  tick(ORGAN.good + 5);
  for (const k of PSALM.slice(8)) O.press(k);
  check(O.phase === 'good' && host.verses.join() === '0,1,2', 'back at it: verse two, then verse three (the second line)');
  tick(ORGAN.good + 0.05);
  check(O.phase === 'final' && host.fin === 1, 'then the whole chapel sings it through');
  tick(12);
  const fin = ev.filter(([, d]) => d.kind === 'final').map(([, d]) => d.k);
  check(O.phase === 'done' && host.done === 1 && JSON.stringify(fin) === JSON.stringify(PSALM), `  all ${fin.length} notes, and done`);
  const F = new Organ(g); F.begin('free');
  check(F.press(0) === 'free' && F.press(4) === 'free' && F.played === 2 && F.phase === 'free', 'free play: every key just plays');
}
{
  console.log('Kyrkkaffet (sidouppdrag i kapellet): hela vägen');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission, p = g.player, ind = g.indoors, R = CHAPEL.room, K = CHAPEL_KAFFE;
  m.restore(livsSave(UP_TO_FEST));
  const ev = record(g, ['sms', 'talk', 'toast', 'banner', 'offer', 'say', 'organ', 'churchBell', 'buns']);
  check(g.bike && Math.hypot(g.bike.x - BIKE_RETURN.x, g.bike.z - BIKE_RETURN.z) < 3, "Arne's bike lives with Melker by the tower");
  run(g, 42);
  check(!m.known.has('kyrkkaffe'), 'no word from Inga yet');
  run(g, 6);
  const sms = (ev.find(([n, d]) => n === 'sms' && d.offer === 'kyrkkaffe') || [])[1];
  check(sms && sms.from === 'Kyrkoherde Inga' && /ryggskott/.test(sms.text) && /kantorn/.test(sms.text), `about 45 s after Bullfesten: Inga texts ("${sms && sms.text.slice(0, 44)}…")`);
  check(m.quest('kyrkkaffe').reward === `upp till ${fmt(KYRK_MAX)} kr` && KYRK_MAX === 1600, `  reward: ${m.quest('kyrkkaffe').reward}`);
  run(g, 1);
  check(Math.hypot(g.bike.x - GUN_BIKE.x, g.bike.z - GUN_BIKE.z) < 0.5, "  Arne's bike is waiting by Gun's gate (moved there out of sight)");
  m.accept('kyrkkaffe'); run(g, 0.3);
  check(m.tracked === 'kyrkkaffe' && /Gun/.test(m.objective), `following it: "${m.objective}"`);
  check(!reachable(g, { x: -97.5, z: -45.5 }, [KYRK.mark], { x0: -106, z0: -56, x1: -90, z1: -43 }).length, "the I is in Gun's garden – you can walk there through the gap in the hedge");
  // on the bike: get off first
  walkHere(g, g.bike.x - 1.0, g.bike.z + 0.5); press(g);
  const bike = g.bike;
  check(p.inCar && p.car === bike, '  (on Arne\'s bike)');
  bike.x = KYRK.mark.x + 0.3; bike.z = KYRK.mark.z; bike.vx = bike.vz = 0; run(g, 0.4);
  check(!m.active && ev.some(([n, d]) => n === 'toast' && /Kliv av cykeln – Gun/.test(d.text)), 'riding into her garden: "Kliv av cykeln – Gun står i trädgården."');
  press(g); run(g, 0.6);
  check(m.active && m.active.id === 'kyrkkaffe' && m.active.stage === 'gun' && p.frozen, 'off the bike: Gun talks to you');
  run(g, 1);
  const t1 = lastTalk(ev, 'kyrkkaffe');
  check(t1 && t1.pages.length === 5 && t1.pages.some((q) => /Arnes gamla cykel/.test(q.text) && /Melker/.test(q.text)) && t1.pages.some((q) => q.fx === 'buns'), '  Gun: ryggskott – the buns are in the box on Arne\'s bike (she borrowed it back from Melker)');
  for (const pg of t1.pages) if (pg.fx) m.talkFx('kyrkkaffe', pg.fx);
  check(bike.buns && m.active.buns === KYRK.buns && g.bike === bike, `  ${m.active.buns} buns in the box (the bike you came on)`);
  m.talkDone('kyrkkaffe'); run(g, 0.3);
  check(m.active.stage === 'ride' && !p.frozen && m.objective === 'Kliv på Arnes cykel', `then: "${m.objective}" · ${m.sub}`);
  check(m.targets.some((t) => t.kind === 'car' && t.car === bike && t.gps), '  the arrow and the GPS point at the bike');
  // a fall: six buns go flying
  walkHere(g, bike.x - 1.0, bike.z + 0.4); press(g);
  check(p.car === bike && m.objective === 'Cykla bullarna till kapellet' && /södra bron/.test(m.sub), `on it: "${m.objective}" · ${m.sub}`);
  p.fallOff(); run(g, 0.3);
  check(m.active.buns === 18 && ev.some(([n]) => n === 'buns') && ev.some(([n, d]) => n === 'toast' && /6 bullar for i backen\. 18 kvar/.test(d.text)), 'thrown off: six buns fly ("Aj! 6 bullar for i backen. 18 kvar i lådan.")');
  run(g, 1.6);
  walkHere(g, bike.x - 0.9, bike.z + 0.3); press(g);
  check(p.car === bike && bike.buns, '  back on, the box still full');
  // the whole way: from her gate, east along Storgatan, south on Kungsgatan over the bridge, to the chapel
  const t0 = g.time;
  const left = driveTo2(g, bike, CHAPEL_DOOR.x, CHAPEL_DOOR.z - 4, 150, 8.5);
  check(left < 3 && m.active.buns === 18, `rode it all the way to the chapel in ${(g.time - t0).toFixed(0)} s (${left.toFixed(1)} m short of the spot)`);
  check(m.objective === 'Kliv av vid kapellet' && m.targets.some((t) => t.kind === 'zone' && Math.hypot(t.x - CHAPEL_DOOR.x, t.z - CHAPEL_DOOR.z) < 0.1), `  "${m.objective}" – the yellow ring at the tower door`);
  press(g); run(g, 0.5);
  walkHere(g, CHAPEL_DOOR.x, CHAPEL_DOOR.z); run(g, 0.1);
  check(m.prompt === 'BÄR IN', 'BÄR IN at the tower door (GÅ IN while the job runs: no)');
  // not without the bike close by
  const bx = bike.x, bz = bike.z;
  bike.x = CHAPEL_DOOR.x - 30; run(g, 0.1);
  check(m.prompt !== 'BÄR IN' && m.objective === 'Kliv på Arnes cykel', '  (the bike far away: no BÄR IN – the buns are in its box)');
  bike.x = bx; bike.z = bz; run(g, 0.1);
  press(g); run(g, 1.6);
  check(g.indoor && ind.where === 'chapel' && m.active.stage === 'welcome' && !bike.buns, 'in through the door with the buns');
  const inga = ind.priest;
  check(inga && Math.hypot(inga.x - K.hello.x, inga.z - K.hello.z) < 0.2, '  Inga is waiting by the coffee table');
  const t2 = lastTalk(ev, 'kyrkkaffe');
  check(t2 && t2 !== t1 && /^Arton bullar/.test(t2.pages[1].text) && t2.pages[1].fx === 'table', `  "${t2 && t2.pages[1].text.slice(0, 42)}…"`);
  m.talkFx('kyrkkaffe', 'table');
  check(ind.chapelBuns === 18, '  18 buns on the coffee table');
  m.talkDone('kyrkkaffe'); run(g, 0.3);
  check(m.active.stage === 'bell' && m.objective === 'Ring i kyrkklockan', `then: "${m.objective}" · ${m.sub}`);
  walkHere(g, CHAPEL.door.x, CHAPEL.door.z); run(g, 0.1);
  check(m.prompt !== 'GÅ UT', '  (no GÅ UT now – the church coffee is about to start)');
  const Bd = CHAPEL.bounds;
  check(!reachable(g, CHAPEL.spawn, [{ x: K.rope.x + 0.25, z: K.rope.z + 0.5 }, { x: K.organ.x, z: K.organ.z }, { x: R.x0 + 6.5, z: R.z0 + 2.65 }], Bd).length, 'you can walk to the bell rope and up to the organ (past the coffee table and the altar rail)');
  walkHere(g, K.rope.x + 0.25, K.rope.z + 0.5); run(g, 0.1);
  check(m.prompt === 'RINGA', 'RINGA by the rope');
  press(g); press(g);
  check(m.active.rings === 1 && ev.filter(([n]) => n === 'churchBell').length === 1, '  one pull – pressing again right away does nothing');
  run(g, 1.0); press(g); run(g, 1.0); press(g); run(g, 0.2);
  check(m.active.rings === 3 && ev.filter(([n]) => n === 'churchBell').length === 3 && m.active.stage === 'guests', 'three rings: the guests come');
  let t = 0; while (m.active.stage === 'guests' && t++ < 60 * 30) g.step(DT, idle);
  const guests = m.active.guests;
  check(guests.length === 4 && guests.every((G) => G.seated && G.ped.state === 'lounge'), `  they walk in and sit down (${(t / 60).toFixed(1)} s): ${guests.map((G) => G.def.npc.slice(7)).join(', ')}`);
  check(guests.every((G) => PEWS.some(([x0, z0, x1, z1]) => G.ped.x > R.x0 + x0 && G.ped.x < R.x0 + x1 && G.ped.z > R.z0 + z0 && G.ped.z < R.z0 + z1)) && GUESTS.find((q) => q.npc === 'church-gun').row === 5 && GUESTS.find((q) => q.npc === 'church-ingvar').row === 0, '  in the pews – Gun at the front, Ingvar at the very back');
  check(ev.some(([n, d]) => n === 'say' && d.who && d.who.npc === 'church-gun' && /Ryggskott/.test(d.text)) && !ev.some(([n, d]) => n === 'say' && d.who && d.who.npc === 'church-ingvar'), '  Gun says hello; Ingvar says nothing');
  check(ind.chapelFolk.length === 8 && m.active.stage === 'announce' && Math.hypot(inga.x - CHAPEL.priest.x, inga.z - CHAPEL.priest.z) < 0.3, '  Inga is back at the altar and speaks to everyone');
  run(g, 1);
  m.talkDone('kyrkkaffe'); run(g, 0.3);
  check(m.active.stage === 'organ' && m.objective === 'Spela psalmen på orgeln', `then: "${m.objective}" · ${m.sub}`);
  walkPath(g, [[R.x0 + 4, R.z0 + 10.4], [R.x0 + 4, R.z0 + 11.6], [K.organ.x, K.organ.z]], () => m.prompt === 'SPELA', 30);
  check(m.prompt === 'SPELA', '  walked up through the gap in the rail: SPELA at the organ');
  run(g, 1.5);
  check(Math.hypot(inga.x - K.cantor.x, inga.z - K.cantor.z) < 0.3, '  Inga has come over to sing');
  press(g);
  const O = ind.organ;
  check(p.state === 'sit' && p.frozen && O.open && O.mode === 'psalm' && Math.abs(p.x - K.seat.x) < 0.01 && g.camFocus && g.camFocus.owner === 'organ', 'SPELA: on the organ bench, the keys come up');
  let wrong = 0;
  const playUntil = (cond, wrongAt) => {
    for (let k = 0; k < 60 * 90 && O.open && !cond(); k++) {
      if (O.phase === 'turn') {
        const want = O.notes[O.pos];
        if (wrongAt && wrongAt(O)) { O.press((want + 1) % 5); wrong++; } else O.press(want);
      }
      g.step(DT, idle);
    }
  };
  playUntil(() => O.verse === 1 && O.phase === 'turn', (q) => q.verse === 0 && q.pos === 2 && wrong === 0);
  check(O.mistakes === 1 && ev.some(([n, d]) => n === 'say' && d.who === inga && /Lyssna en gång till|Nästan|psalmbok|Lugnt/.test(d.text)), 'verse one (one wrong key on the way – Inga sings it again)');
  ind.organStop(); run(g, 0.2);
  check(p.state === 'foot' && !p.frozen && !O.open && m.active.stage === 'organ' && !g.camFocus, 'SLUTA: up from the bench (still the quest – sit down again to go on)');
  walkHere(g, K.organ.x, K.organ.z); run(g, 0.1); press(g);
  check(O.open && O.verse === 1 && m.active.stage === 'playing', '  SPELA again: verse two');
  playUntil(() => O.phase === 'final');
  check(O.phase === 'final' && ev.filter(([n, d]) => n === 'say' && /♪/.test(d.text)).length >= 8, 'all three verses: the whole chapel sings (♪ over everyone)');
  playUntil(() => !O.open);
  check(m.active.stage === 'finale' && p.state === 'foot' && ev.some(([n, d]) => n === 'say' && d.who && d.who.npc === 'church-ingvar' && d.text === 'Amen.'), '  the last note: up from the bench – and Ingvar says "Amen."');
  run(g, 3.6);
  const t3 = lastTalk(ev, 'kyrkkaffe');
  const gun = m.active.guest('church-gun');
  check(Math.hypot(gun.x - (R.x0 + 4.95), gun.z - (R.z0 + 11.68)) < 0.4 && Math.hypot(p.x - (R.x0 + 3.05), p.z - (R.z0 + 11.72)) < 0.4 && Math.hypot(inga.x - CHAPEL.priest.x, inga.z - CHAPEL.priest.z) < 0.4, '  Gun has come up front: the three of you in front of the altar');
  const pay = kyrkPay(18, 1);
  check(t3 && t3.pages.some((q) => q.who === 'Tant Gun' && /Beethoven/.test(q.text)) && t3.pages.some((q) => /1972/.test(q.text)) && /Ett par toner/.test(t3.pages[4].text) && t3.pages[4].text.includes(`${fmt(pay)} kronor`), '  it was Beethoven – Arne\'s wish for the wedding in 1972');
  const money0 = g.money;
  m.talkDone('kyrkkaffe'); run(g, 0.5);
  check(m.done.has('kyrkkaffe') && !m.active && g.money - money0 === pay && pay === 700 + 18 * 25 + 250, `done: ${g.money - money0} kr (700 + 18 buns × 25 + 300 − 50 for the wrong key)`);
  check(g.stats.churchBuns === 18 && g.stats.psalmWrong === 1, '  stats for the end card: 18 buns, one wrong key');
  run(g, 31);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Tant Gun (Storgatan)' && /ängel/.test(d.text)), '  and later Gun texts: "…du spelade som en ängel…"');
  check(Math.hypot(g.bike.x - (BIKE_RETURN.x - 1.4), g.bike.z - (BIKE_RETURN.z + 0.4)) < 0.5, "  Arne's bike has gone back to Melker by the tower (out of sight)");
  // afterwards: the organ is yours, the bell rings, and out the door
  walkHere(g, K.organ.x, K.organ.z); run(g, 0.1);
  check(m.prompt === 'SPELA', 'afterwards: SPELA at the organ any time');
  press(g);
  check(O.open && O.mode === 'free' && O.press(3) === 'free', '  free play');
  ind.organStop(); run(g, 0.2);
  walkHere(g, K.rope.x + 0.25, K.rope.z + 0.5); run(g, 0.1);
  check(m.prompt === 'RINGA', '  and the bell rope');
  press(g);
  check(ev.filter(([n]) => n === 'churchBell').length === 4 && g.stats.bells === 1, '  DONG');
  walkHere(g, CHAPEL.door.x, CHAPEL.door.z); run(g, 1.2);
  check(m.prompt === 'GÅ UT', 'GÅ UT by the door again');
  press(g); run(g, 1.4);
  check(!g.indoor && !guests.some((G) => g.peds.list.includes(G.ped)) && ind.chapelBuns === 0, '  out: the guests and the buns stay behind');
  const saved = m.progress();
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  check(g2.mission.restore(saved) && g2.mission.done.has('kyrkkaffe') && g2.stats.churchBuns === 18, 'saved and loaded: done, with its stats');
}
{
  console.log('Kyrkkaffet: smulor, och en ny sats');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission, p = g.player;
  m.restore({ ...livsSave(UP_TO_FEST), known: [...UP_TO_FEST.filter((d) => d !== 'red'), 'kyrkkaffe'] });
  const ev = record(g, ['sms', 'talk', 'banner', 'toast']);
  run(g, 1);
  walkHere(g, -97.5, -45.8);
  walkPath(g, [[-97.5, -48.6], [KYRK.mark.x, KYRK.mark.z]], () => m.active, 10);
  check(m.active && m.active.id === 'kyrkkaffe' && Math.hypot(g.bike.x - GUN_BIKE.x, g.bike.z - GUN_BIKE.z) < 0.5, 'walking in through the gap: it starts (and the bike was put by her gate)');
  run(g, 1);
  m.talkFx('kyrkkaffe', 'buns'); m.talkDone('kyrkkaffe');
  const bike = g.bike;
  for (let i = 0; i < 4; i++) {
    walkHere(g, bike.x - 1.0, bike.z + 0.4); press(g);
    if (p.car !== bike) break;
    p.fallOff(); run(g, 1.6);
  }
  check(!m.active && m.isOpen('kyrkkaffe') && ev.some(([n, d]) => n === 'banner' && d.kind === 'fail' && /smulor/.test(d.sub)) && !bike.buns, 'four falls: all the buns are crumbs – failed, the quest stays open');
  run(g, 4);
  check(ev.some(([n, d]) => n === 'sms' && d.from === 'Tant Gun (Storgatan)' && /ny sats/.test(d.text)), '  Gun: "…jag bakar en ny sats…"');
  // try again: Gun keeps it short
  walkHere(g, -97.5, -44); run(g, 7);
  walkPath(g, [[-97.5, -48.6], [KYRK.mark.x, KYRK.mark.z]], () => m.active, 10);
  run(g, 1);
  const t = lastTalk(ev, 'kyrkkaffe');
  check(m.active && t && t.pages.length === 2 && /ny sats/.test(t.pages[0].text), 'back to her garden: a new batch, a short talk');
}
{
  console.log('Kyrkkaffet: Inga frågar själv');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const m = g.mission, ind = g.indoors;
  m.restore(livsSave(UP_TO_FEST));
  const ev = record(g, ['talk', 'offer']);
  walkHere(g, CHAPEL_DOOR.x, CHAPEL_DOOR.z); press(g); run(g, 1.2);
  walkHere(g, CHAPEL.talk.x, CHAPEL.talk.z - 1.2); run(g, 0.1);
  press(g);
  const t1 = lastTalk(ev, 'inga');
  check(t1 && t1.pages.some((q) => /ryggskott/.test(q.text)) && !m.known.has('kyrkkaffe'), 'in the chapel before her text: Inga asks you herself');
  m.talkDone('inga'); run(g, 0.1);
  check(m.known.has('kyrkkaffe') && ev.some(([n, d]) => n === 'offer' && d.id === 'kyrkkaffe'), '  and the quest card opens');
  m.accept('kyrkkaffe'); run(g, 0.5);
  press(g);
  const t2 = lastTalk(ev, 'inga');
  check(t2 !== t1 && t2.pages.length === 1 && /Kyrkkaffet väntar/.test(t2.pages[0].text), `talk to her again: "${t2 && t2.pages[0].text.slice(0, 40)}…"`);
  m.talkDone('inga'); run(g, 0.1);
  check(m.prompt !== 'SPELA' && (() => { g.player.x = CHAPEL_KAFFE.organ.x; g.player.z = CHAPEL_KAFFE.organ.z; ind.update(0); return ind.prompt !== 'SPELA'; })(), '  (the organ is the cantor\'s until you have played the psalm)');
}

// ---------- 39. main quest, part 12: "Arnes skattjakt" (v1.11) – riddles all over the map ----------
const UP_TO_UTSIKT = [...UP_TO_HIDEOUT, 'birger', 'utsikten'];
const GUN_FROM = 'Tant Gun (Storgatan)';
function huntGame(stats = {}, known = null, tracked = null) {
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const s = livsSave(UP_TO_UTSIKT);
  g.mission.restore({ ...s, money: 0, stats, known: known || s.known, tracked });
  return g;
}
// stand by the brake lever and hold BROMSA once the yellow sail is between lo and hi (radians from straight
// down, minus: still on its way down), with the sails at full speed; let go when they have stopped
function brakeAt(g, job, lo, hi) {
  for (let k = 0; k < 60 * 25; k++) {
    if (Math.abs(g.millW - MILL.w) < 1e-6 && job.sailOff() > lo && job.sailOff() < hi) break;
    g.step(DT, idle);
  }
  const miss0 = job.brakeMiss;
  for (let k = 0; k < 60 * 3 && job.stage === 'brake' && job.brakeMiss === miss0; k++) g.step(DT, { ...idle, actionHeld: true });
}
const typeCode = (L, code) => { for (let i = 0; i < L.n; i++) L.select(i), L.type(+code[i]); };
{
  console.log('Arnes skattjakt: kodlåset och kvarnbromsen');
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const ev = record(g, ['lock']);
  let opened = 0, stopped = 0;
  const L = new CodeLock(g, { code: '1971', hint: 'Fyra siffror.', help: 'Titta på hjärtat.', onOpen: () => opened++, onStop: () => stopped++ });
  check(L.n === 4 && L.value === '0000' && L.line === 'Fyra siffror.', 'a lock with four wheels, all at 0');
  L.turn(0, 1); L.turn(1, -1);
  check(L.value === '1900' && ev.filter(([, d]) => d.kind === 'tick').length === 2, 'turning the wheels up and down (below 0 comes 9)');
  L.select(2); L.type(7); L.type(2);
  check(L.value === '1972' && L.sel === 3, 'typing digits: onto the chosen wheel, then on to the next');
  check(!L.tryOpen() && L.tries === 1 && L.state === 'wrong' && L.line === 'Titta på hjärtat.' && ev.some(([, d]) => d.kind === 'wrong'), 'a wrong code rattles – and the help line comes up');
  for (let i = 0; i < 40; i++) L.update(DT);
  check(L.state === 'idle', `  the wheels settle after ${LOCK.wrongT} s`);
  L.turn(3, -1);
  check(L.tryOpen() && L.state === 'right' && ev.some(([, d]) => d.kind === 'open') && !L.turn(0, 1) && !L.type(5), '1971: it springs (and the wheels cannot be turned now)');
  for (let i = 0; i < 30; i++) L.update(DT);
  check(opened === 0 && L.open, '  …');
  for (let i = 0; i < 15; i++) L.update(DT);
  check(opened === 1 && !L.open, `  the lid comes up after ${LOCK.springT} s`);
  const L2 = new CodeLock(g, { code: '287', onStop: () => stopped++ });
  L2.stop();
  check(stopped === 1 && !L2.open && !L2.tryOpen() && L2.n === 3, 'SLUTA: away from a three-wheel lock');
  // the windmill's brake
  run(g, 2);
  check(Math.abs(g.millW - MILL.w) < 1e-9, `the sails turn at ${MILL.w} rad/s – a round in ${(2 * Math.PI / MILL.w).toFixed(0)} s`);
  const a0 = g.millA;
  g.millHold = true;
  let t = 0;
  while (g.millW > 0 && t < 5) { g.step(DT, idle); t += DT; }
  check(t > 0.9 && t < 1.25 && g.millA - a0 > 0.18 && g.millA - a0 < 0.3, `brake on: they roll on for ${t.toFixed(2)} s (${(g.millA - a0).toFixed(2)} rad) before they stop`);
  const a1 = g.millA; run(g, 2);
  check(g.millA === a1, '  and stay still while it is held');
  g.millHold = false; run(g, 1.6);
  check(Math.abs(g.millW - MILL.w) < 1e-9, '  let go: up to speed again in a second and a half');
}
{
  console.log('Arnes skattjakt (huvuduppdrag del 12): hela vägen');
  const g = huntGame();
  const m = g.mission, p = g.player, ind = g.indoors, flag = m.flag, R = CHAPEL.room;
  const ev = record(g, ['sms', 'talk', 'toast', 'banner', 'say', 'lock', 'mill', 'ring', 'pestle', 'secret', 'hint', 'endcard', 'paper', 'keys', 'churchBell', 'fade']);
  check(HUNT_MAX === 6500 && HUNT.codes.stump === '1971' && HUNT.codes.altar === '287', `up to ${fmt(HUNT_MAX)} kr; the codes 1971 and 287`);
  run(g, 20);
  check(!m.known.has('skattjakt'), 'no word from Gun yet');
  run(g, 7);
  const sms = (ev.find(([n, d]) => n === 'sms' && d.offer === 'skattjakt') || [])[1];
  check(sms && sms.from === GUN_FROM && /kuvert/.test(sms.text), `about 25 s after Utsikten: Gun texts ("${sms && sms.text.slice(0, 48)}…")`);
  check(m.quest('skattjakt').reward === `upp till ${fmt(HUNT_MAX)} kr – och Arnes sista hemlighet`, `  reward: ${m.quest('skattjakt').reward}`);
  walkHere(g, 60, -20); run(g, 1);
  const gun = flag.gun, B = m.huntBengt;
  check(flag.huntPin && Math.hypot(gun.x - HUNT.gun.x, gun.z - HUNT.gun.z) < 0.05 && B && Math.hypot(B.x - HUNT.bengt.x, B.z - HUNT.bengt.z) < 0.05 && g.peds.list.includes(B), 'tant Gun and Bagar-Bengt wait outside the konditori (put there out of sight)');
  m.accept('skattjakt'); run(g, 0.3);
  check(m.tracked === 'skattjakt' && m.objective === 'Till konditoriet (G)', `following it: "${m.objective}" · ${m.sub}`);
  check(!reachable(g, { x: -6, z: 34 }, [KONDITORI, HUNT.you, { x: HUNT.dahl.to[0], z: HUNT.dahl.to[1] }], { x0: -30, z0: 8, x1: 20, z1: 45 }).length, '  you can walk across the square to the G by the door (and where you and Dahlgren will stand)');
  // in a car: get out first
  g.makeRoom('sedan');
  const car0 = g.addVehicle('sedan', 'blue', KONDITORI.x + 4, 32, Math.PI);
  check(enterCar(g, car0), '  (into a car)');
  car0.x = KONDITORI.x; car0.z = KONDITORI.z; car0.h = Math.PI / 2; car0.vx = car0.vz = 0; run(g, 0.4);
  check(!m.active && ev.some(([n, d]) => n === 'toast' && /Kliv ur – tant Gun och Bengt/.test(d.text)), '  driving up to it: "Kliv ur – tant Gun och Bengt väntar utanför konditoriet."');
  p.exitCar(); run(g, 0.5); car0.x = KONDITORI.x + 8; car0.z = 30; run(g, 0.2);
  walkHere(g, KONDITORI.x, KONDITORI.z + 0.4); run(g, 1);
  const job = m.active;
  check(job && job.id === 'skattjakt' && job.stage === 'intro' && p.frozen && g.camFocus && g.camFocus.owner === 'hunt', 'on foot: it starts, Gun and Bengt turn to you');
  const t1 = lastTalk(ev, 'skattjakt');
  check(t1 && t1.pages.length === 8 && t1.pages[1].fx === 'envelope' && /bröllopsdag 1995/.test(t1.pages[1].text) && /Det viktigaste står inte i receptet/.test(t1.pages[3].text), '  the envelope: "Till min Gun, på vår bröllopsdag 1995" – "Det viktigaste står inte i receptet"');
  check(t1 && t1.pages[6].note && t1.pages[6].text === RIDDLES[0].verse && t1.pages[7].last === 'JAG KLURAR', `  Arne's first note: "${RIDDLES[0].verse.replace('\n', ' ')}"`);
  check(!t1.pages.some((q) => /kyrkkaffe/.test(q.text)), '  (no word about the church coffee – you have not been there)');
  m.talkDone('skattjakt'); run(g, 1.2);
  check(job.stage === 'seek' && job.k === 0 && m.objective === RIDDLES[0].obj[0] && m.sub === RIDDLES[0].obj[1] && !p.frozen, `the riddle in the objective box: "${m.objective}" · ${m.sub}`);
  check(!m.targets.some((t) => t.gps) && m.tipReady && g.stats.hunt.at === 1, '  no GPS, no arrow – work it out (a tip can be asked for)');
  check(ev.some(([n, d]) => n === 'hint' && d.id === 'hunttip'), '  a hint: tap the objective box for a tip');
  // 1. the oak stump in the park – no tip
  walkHere(g, 70, -50); run(g, 0.3);
  check(job.stage === 'stump' && job.solo === 1 && ev.some(([n, d]) => n === 'toast' && /utan tips! \+250 kr/.test(d.text)), 'the oak stump in the park, without a tip: +250 kr at the end');
  check(!reachable(g, { x: 70, z: -40 }, [HUNT.stump.look, HUNT.stump.kneel], { x0: 40, z0: -80, x1: 100, z1: -35 }).length, '  you can walk up to the carved heart (and to the side of the stump)');
  check(m.targets.some((t) => t.kind === 'item' && Math.hypot(t.x - HUNT.stump.x, t.z - HUNT.stump.z) < 1.2), '  an arrow over the stump');
  walkHere(g, 70, -58.75); run(g, 0.1);
  check(m.prompt === 'UNDERSÖK', 'UNDERSÖK by the heart (the lock – not the secret)');
  press(g);
  let L = g.lock;
  check(L && L.code === '1971' && L.n === 4 && p.frozen && g.camFocus && g.camFocus.dist < 2.5 && ev.some(([n, d]) => n === 'toast' && /kodlås/.test(d.text)), '  a tin box under the roots – with a four-digit lock (close up on the carving)');
  typeCode(L, '1972'); L.tryOpen(); run(g, 0.6);
  check(L.tries === 1 && L.line === 'Titta på hjärtat i stubben.' && g.lock === L && job.stage === 'stumpLock', '  1972: wrong – "Titta på hjärtat i stubben."');
  L.stop(); run(g, 0.1);
  check(!g.lock && !p.frozen && job.stage === 'stump' && !g.camFocus, '  SLUTA: up again');
  press(g);
  L = g.lock;
  typeCode(L, '1971'); L.tryOpen(); run(g, 1.4);
  const t2 = lastTalk(ev, 'skattjakt');
  check(!g.lock && !job.stumpTin && t2 && t2 !== t1 && t2.pages[1].note && t2.pages[1].text === RIDDLES[1].verse, `  1971: open! The second note: "${RIDDLES[1].obj[0]}…"`);
  check(!(g.stats.secrets || []).includes('heart'), '  (the secret of the stump is not taken yet)');
  m.talkDone('skattjakt'); run(g, 1.8);
  check(job.stage === 'seek' && job.k === 1 && g.stats.hunt.at === 2 && g.stats.hunt.solo === 1 && m.objective === RIDDLES[1].obj[0], `on to riddle two (saved): "${m.objective}"`);
  check(g.stats.secrets.includes('heart') && ev.some(([n, d]) => n === 'banner' && d.title === 'HEMLIGHET!' && /Hjärtat i stubben/.test(d.sub)), '  and the heart in the stump counts as a secret: HEMLIGHET!');
  const M = m.huntMajken;
  check(M && g.peds.list.includes(M) && Math.hypot(M.x - HUNT.mill.majken.x, M.z - HUNT.mill.majken.z) < 0.05, '  Mjölnar-Majken is at the mill already');
  // 2. the windmill – after a tip (standing still)
  run(g, HUNT.tipAt + 1.5);
  const tip1 = ev.filter(([n, d]) => n === 'sms' && d.from === GUN_FROM).pop();
  check(job.tip && tip1 && /kvarnen på Norrholmen/.test(tip1[1].text) && m.sub === RIDDLES[1].where, `no closer in ${HUNT.tipAt} s: Gun texts a tip ("${tip1 && tip1[1].text.slice(0, 40)}…")`);
  check(m.targets.some((t) => t.kind === 'zone' && t.gps && Math.hypot(t.x - HUNT.mill.x, t.z - HUNT.mill.z) < 1) && !m.tipReady, '  and the GPS shows the way to the mill');
  walkHere(g, -20, -365); run(g, 0.3);
  check(job.stage === 'meet' && job.solo === 1 && job.millTin && /Prata med Mjölnar-Majken/.test(m.objective), `by the mill (no bonus – there was a tip): "${m.objective}"`);
  check(m.targets.some((t) => t.kind === 'contact' && t.ref === M), '  her M over her head');
  check(!reachable(g, { x: -20, z: -365 }, [{ x: -2.9, z: -351.1 }, HUNT.mill.lever], { x0: -32, z0: -378, x1: 16, z1: -338 }).length, '  you can walk to Majken and to the brake lever');
  walkHere(g, -2.85, -351.15); run(g, 0.1);
  check(m.prompt === 'PRATA', '  PRATA by Majken');
  press(g); run(g, 0.8);
  const t3 = lastTalk(ev, 'skattjakt');
  check(job.stage === 'majken' && t3.pages.length === 4 && t3.pages.some((q) => /gult segel/.test(q.text)) && t3.pages[3].last === 'TILL BROMSEN', '  Majken: her father tied a tin to the sail with the yellow cloth – stop it pointing straight down');
  m.talkDone('skattjakt'); run(g, 0.8);
  check(job.stage === 'brake' && ev.some(([n, d]) => n === 'hint' && d.id === 'millbrake'), 'to the brake (a hint: hold BROMSA)');
  walkHere(g, HUNT.mill.lever.x, HUNT.mill.lever.z); run(g, 0.1);
  check(m.prompt === 'BROMSA' && g.camFocus && g.camFocus.owner === 'hunt' && g.camFocus.cam && g.camFocus.y > 9, '  BROMSA at the lever – the camera stands back: the whole wheel of sails');
  brakeAt(g, job, 0.4, 0.5);
  check(job.brakeMiss === 1 && ev.some(([n, d]) => n === 'say' && d.who === M && /För sent/.test(d.text)) && ev.some(([n, d]) => n === 'mill' && d.kind === 'stop'), `  braked too late: "För sent – den har redan passerat!" (stopped ${job.sailOff().toFixed(2)} rad past the bottom)`);
  run(g, 0.5);
  check(!g.millHold && g.millW > 0, '  Majken lets the brake go – round again');
  brakeAt(g, job, -0.3, -0.2);
  check(job.stage === 'millWait' && Math.abs(job.sailOff()) < HUNT.mill.window && g.millHold && ev.some(([n, d]) => n === 'say' && d.who === M && /Perfekt/.test(d.text)), `  in time: the yellow sail stops pointing down (${job.sailOff().toFixed(2)} rad off) – "Perfekt! Håll i!"`);
  let top = 0, n = 0;
  const ground = g.world.groundHeight(LADDER.x, LADDER.z);
  while (job.stage === 'millWait' && n++ < 60 * 12) { g.step(DT, idle); top = Math.max(top, M.y - ground); }
  check(job.stage === 'millNote' && top > 1.9 && !job.millTin && ev.some(([nn]) => nn === 'paper') && g.millW === 0, `  Majken climbs the ladder ${top.toFixed(1)} m up and comes down with the tin (${(n / 60).toFixed(1)} s)`);
  run(g, 0.7);
  const t4 = lastTalk(ev, 'skattjakt');
  check(t4.pages[1].note && t4.pages[1].text === RIDDLES[2].verse, `  the third note: "${RIDDLES[2].obj[0]}…"`);
  m.talkDone('skattjakt'); run(g, 0.3);
  check(job.stage === 'seek' && job.k === 2 && !g.millHold && g.stats.hunt.at === 3 && m.ingvar, 'on to riddle three; the sails turn again');
  run(g, 3);
  check(g.millW > 0.44, '  …');
  // 3. the lighthouse – a tip at once (tapping the objective box)
  check(m.askTip() && !m.tipReady, 'tap the objective box: a tip right away');
  run(g, 0.2);
  const tip2 = ev.filter(([nn, d]) => nn === 'sms' && d.from === GUN_FROM).pop();
  check(/fyren/.test(tip2[1].text) && /Ingvar/.test(tip2[1].text) && m.targets.some((t) => t.kind === 'contact' && t.ref === m.ingvar && t.gps), `  "${tip2[1].text.slice(0, 44)}…" – the GPS to Ingvar`);
  walkHere(g, 98, -377); run(g, 0.3);
  check(job.stage === 'meet' && job.solo === 1 && m.objective === 'Prata med Ingvar', `at the lighthouse: "${m.objective}"`);
  check(!reachable(g, { x: 98, z: -377 }, [{ x: INGVAR.x, z: INGVAR.z + 1.3 }], { x0: 80, z0: -400, x1: 122, z1: -362 }).length, '  you can walk up to him');
  walkHere(g, INGVAR.x, INGVAR.z + 1.3); run(g, 0.1);
  check(m.prompt === 'PRATA', '  PRATA');
  press(g); run(g, 0.8);
  const t5 = lastTalk(ev, 'skattjakt');
  check(job.stage === 'ingvar' && t5.pages[0].text === '…' && t5.pages.some((q) => /kiosken på kajen/.test(q.text)) && /ringa dit/.test(t5.pages[5].text), '  Ingvar: "…" – Arne wanted the last note read on the phone, in the box on the quay');
  m.talkDone('skattjakt'); run(g, 0.2);
  check(job.stage === 'phone' && job.timed && m.objective === 'Till telefonkiosken på kajen' && /Ingvar ringer om 1:2\d/.test(m.sub) && g.stats.hunt.at === 4, `a minute and a half: "${m.objective}" · ${m.sub}`);
  check(m.targets.some((t) => t.kind === 'zone' && t.gps && Math.hypot(t.x - HUNT.booth.x, t.z - HUNT.booth.z) < 0.1), '  the GPS to the phone box');
  // drive there: down to a car by his cottage, over the north bridge and through town
  const path = routePoints(g.layout.gps, p.x, p.z, HUNT.booth.x, HUNT.booth.z);
  g.makeRoom('sedan');
  const car = g.addVehicle('sedan', 'red', path[1][0], path[1][1], Math.atan2(path[2][0] - path[1][0], path[2][1] - path[1][1]));
  const tc = g.time;
  check(enterCar(g, car), '  into a car by the cottage');
  const left = driveTo2(g, car, HUNT.booth.x, HUNT.booth.z, 120, 13);
  check(job.ringing && job.onTime && ev.some(([nn, d]) => nn === 'toast' && /I tid!/.test(d.text)) && ev.some(([nn]) => nn === 'ring'), `drove to the quay in ${(g.time - tc).toFixed(0)} s (${left.toFixed(0)} m short): it rings – "I tid!"`);
  check(m.objective === 'Svara i telefonen' && /Kliv ur/.test(m.sub), `  "${m.objective}" · ${m.sub}`);
  p.exitCar(); run(g, 0.6);
  check(!reachable(g, { x: -114.5, z: -125 }, [HUNT.booth, { x: HUNT.booth.x, z: HUNT.booth.z - 0.95 }], { x0: -135, z0: -150, x1: -95, z1: -112 }).length, '  you can walk to the phone box (and into it)');
  walkHere(g, HUNT.booth.x, HUNT.booth.z); run(g, 0.1);
  check(m.prompt === 'SVARA', '  SVARA in the phone box');
  press(g); run(g, 0.6);
  const t6 = lastTalk(ev, 'skattjakt');
  check(job.stage === 'call' && t6.pages[0].text === '…Hallå. Det är Ingvar.' && t6.pages[1].text === 'I tid. Bra.' && t6.pages[3].note && t6.pages[3].text === RIDDLES[3].verse, '  "…Hallå. Det är Ingvar." – "I tid. Bra." – and he reads the last note');
  m.talkDone('skattjakt'); run(g, 1.8);
  check(job.stage === 'seek' && job.k === 3 && g.stats.hunt.at === 5 && g.stats.hunt.onTime === true && g.stats.secrets.includes('phone'), 'on to riddle four – and the phone box counts as a secret (it was Ingvar all along)');
  const rings0 = ev.filter(([nn]) => nn === 'ring').length;
  run(g, 5);
  check(ev.filter(([nn]) => nn === 'ring').length === rings0 && !m.secrets.ringing, '  (and the box stays quiet now, though you stand right by it)');
  // 4. the chapel – no tip
  walkHere(g, CHAPEL_DOOR.x + 4, CHAPEL_DOOR.z - 8); run(g, 0.3);
  check(job.stage === 'chapel' && job.solo === 2 && !g.indoor, 'the chapel on Söderholmen without a tip: +250 kr');
  walkHere(g, CHAPEL_DOOR.x, CHAPEL_DOOR.z); run(g, 0.1);
  check(m.prompt === 'GÅ IN', '  GÅ IN at the tower door');
  press(g); run(g, 1.6);
  const inga = ind.priest;
  check(g.indoor && ind.where === 'chapel' && job.stage === 'chapel' && inga && Math.hypot(inga.x - HUNT.ingaAside.x, inga.z - HUNT.ingaAside.z) < 0.05, '  inside: Inga has stepped aside from the altar');
  const altarSpot = { x: HUNT.altar.x, z: HUNT.altar.z }, boardSpot = { x: HUNT.board.x, z: HUNT.board.z }, ingaSpot = { x: R.x0 + 4.9, z: R.z0 + 11.6 };
  check(!reachable(g, CHAPEL.spawn, [altarSpot, boardSpot, ingaSpot, HUNT.altar.stand, HUNT.board.stand], CHAPEL.bounds).length, '  you can walk to the altar, the psalm board and Inga');
  check(m.targets.filter((t) => t.kind === 'item').length === 2, '  arrows over the altar and the psalm board');
  walkHere(g, altarSpot.x, altarSpot.z); run(g, 0.1);
  check(m.prompt === 'UNDERSÖK', 'UNDERSÖK at the altar');
  press(g);
  L = g.lock;
  check(L && L.code === '287' && L.n === 3 && ev.some(([nn, d]) => nn === 'toast' && /Bakom altarduken/.test(d.text)), '  behind the altar cloth: a little wooden box – a three-digit lock');
  typeCode(L, '649'); L.tryOpen(); run(g, 0.6);
  check(L.tries === 1 && /Ta den mittersta/.test(L.line), `  649: wrong – "${L.line}"`);
  L.stop(); run(g, 0.1);
  walkHere(g, boardSpot.x, boardSpot.z); run(g, 0.1);
  check(m.prompt === 'TITTA', 'TITTA by the psalm board');
  press(g);
  check(p.frozen && g.camFocus && g.camFocus.dist > 2 && ev.some(([nn, d]) => nn === 'toast' && /12 · 287 · 649/.test(d.text)), '  "Psalmtavlan: 12 · 287 · 649" (close up)');
  run(g, 3.2);
  check(!p.frozen && !g.camFocus && m.targets.filter((t) => t.kind === 'item').length === 1, '  (and you can move again)');
  walkHere(g, ingaSpot.x, ingaSpot.z); run(g, 0.1);
  check(m.prompt === 'PRATA', 'PRATA with Inga');
  press(g); run(g, 0.5);
  const t7 = lastTalk(ev, 'skattjakt');
  check(t7.pages.length === 2 && /psalmtavlan/.test(t7.pages[1].text) && /bröllop/.test(t7.pages[1].text), '  the board has shown the same three numbers since Arne and Gun\'s wedding');
  m.talkDone('skattjakt'); run(g, 0.2);
  walkHere(g, CHAPEL_KAFFE.rope.x + 0.25, CHAPEL_KAFFE.rope.z + 0.5); run(g, 0.1);
  check(m.prompt === 'RINGA', 'the bell rope still rings');
  press(g);
  check(ev.some(([nn]) => nn === 'churchBell'), '  DONG');
  walkHere(g, altarSpot.x, altarSpot.z); run(g, 0.1); press(g);
  L = g.lock;
  typeCode(L, '287'); L.tryOpen(); run(g, 1.5);
  const t8 = lastTalk(ev, 'skattjakt');
  check(job.carry === 'box' && job.altarOpen && ev.some(([nn, d]) => nn === 'keys' && d.item === 'box') && t8.pages.some((q) => /smörlåda/.test(q.text) && /A och G/.test(q.text)), '287: open! Arne\'s old butter box, A and G on the lid');
  m.talkDone('skattjakt'); run(g, 0.3);
  check(job.stage === 'deliver' && g.stats.hunt.at === 6 && m.objective === 'Ta Arnes låda till Gun' && m.sub === 'Gå ut ur kapellet' && p.body.pose === 3, `to Gun with it (carried in both hands): "${m.objective}" · ${m.sub}`);
  walkHere(g, CHAPEL.door.x, CHAPEL.door.z); run(g, 0.1);
  check(m.prompt === 'GÅ UT', '  GÅ UT by the door');
  press(g); run(g, 1.5);
  check(!g.indoor && m.sub === 'Konditoriet vid torget' && m.targets.some((t) => t.kind === 'zone' && t.gps && Math.hypot(t.x - KONDITORI.x, t.z - KONDITORI.z) < 0.1), '  outside: the GPS to the konditori');
  // 5. the konditori: Arne's letter, the mortar, the first batch – and Dahlgren
  walkHere(g, KONDITORI.x + 0.3, KONDITORI.z - 3); run(g, 0.3);
  walkHere(g, KONDITORI.x, KONDITORI.z); run(g, 1.2);
  const t9 = lastTalk(ev, 'skattjakt');
  check(job.stage === 'gun' && t9.pages.length === 8 && t9.pages.filter((q) => q.who === 'Arnes brev' && q.note).length === 3 && t9.pages.some((q) => /stöter kardemumman själv/.test(q.text)) && t9.pages[7].fx === 'mortar', 'Gun opens it: Arne\'s letter – he crushed the cardamom himself, in her mother\'s mortar');
  for (const pg of t9.pages) if (pg.fx) m.talkFx('skattjakt', pg.fx);
  check(job.carry === 'mortar', '  the mortar in your hands');
  m.talkDone('skattjakt'); run(g, 0.5);
  check(job.stage === 'pestle' && m.prompt === 'STÖT' && p.frozen && m.objective === 'Stöt kardemumman', `"${m.objective}" · ${m.sub}`);
  for (let i = 0; i < HUNT.pestle && job.stage === 'pestle'; i++) { g.step(DT, { ...idle, action: true }); run(g, 0.08); }
  check(job.stage === 'baking' && ev.filter(([nn]) => nn === 'pestle').length === HUNT.pestle && ev.some(([nn, d]) => nn === 'say' && d.who === m.huntBengt && /Hårdare/.test(d.text)), `${HUNT.pestle} pounds of the pestle ("Hårdare! Arne hördes ända till torget.")`);
  const tb = g.time;
  n = 0; while (job.stage === 'baking' && n++ < 60 * 12) g.step(DT, idle);
  const Dg = m.huntDahl;
  check(job.stage === 'taste' && job.tray && !job.carry && Dg && Dg.arrived && Math.hypot(Dg.x - HUNT.dahl.to[0], Dg.z - HUNT.dahl.to[1]) < 0.3 && ev.some(([nn, d]) => nn === 'fade'), `an hour later (${(g.time - tb).toFixed(1)} s): Bengt with a tray of buns, and Dahlgren has followed his nose across the square`);
  const pay = HUNT.pay.base + 2 * HUNT.pay.solo + HUNT.pay.phone;
  const t10 = lastTalk(ev, 'skattjakt');
  check(t10.pages.some((q) => q.who === 'Direktör Dahlgren' && /TRETTIO ÅR/.test(q.text)) && t10.pages.some((q) => /disken/.test(q.text)) && t10.pages.at(-1).text.includes(`${fmt(pay)} kronorna`), `  "Det är Arnes bullar." – Dahlgren gets the washing-up – ${fmt(pay)} kr`);
  const money0 = g.money;
  m.talkDone('skattjakt'); run(g, 0.5);
  check(m.done.has('skattjakt') && !m.active && g.money - money0 === pay && pay === 6000 && ev.some(([nn, d]) => nn === 'banner' && d.title === 'HUVUDUPPDRAG KLART' && d.sub === 'Arnes skattjakt'), `main quest part 12 done: ${fmt(pay)} kr (5 000 + 2 riddles without a tip + on time at the phone)`);
  check(g.stats.huntSolo === 2 && g.stats.huntOnTime === 1 && g.stats.hunt.at === 7, '  stats for the end card');
  run(g, 15);
  check(!ev.some(([nn]) => nn === 'endcard'), 'all fifteen parts – but no end card yet: part 13 is to come (v1.12)');
  run(g, 16);
  check(ev.some(([nn, d]) => nn === 'sms' && d.from === 'Fyrvaktaren Ingvar' && d.text === 'Bra.'), '  and a text from Ingvar: "Bra."');
  check(flag.huntPin && m.prompt !== 'STÖT', '  Gun and Bengt are still by the door');
  check(!m.active, '  (standing in the G when Flaskposten texts does not start it)');
  walkHere(g, KONDITORI.x + 2.0, KONDITORI.z + 0.2); run(g, 0.1);
  check(m.prompt === 'PRATA' && !m.active, `  PRATA with Gun (${m.prompt}, ${m.active && m.active.id}, ${m.active && m.active.stage})`);
  press(g);
  check(ev.some(([nn, d]) => nn === 'say' && d.who === gun && /Arnes bullar … äntligen/.test(d.text)), '  "Arnes bullar … äntligen."');
  walkHere(g, 60, -20); run(g, 2);
  check(!m.huntBengt && !m.huntDahl && !m.huntMajken && !g.peds.list.includes(Dg) && !g.peds.list.includes(M), 'out of sight they all go back to normal');
  check(m.known.has('flaskpost') && flag.huntPin && m.flaskHoldsGun && m.flaskDahl && m.flaskDishes, '  (and Gun stays at the konditori: Flaskposten – Dahlgren is at his washing-up)');
  const saved = m.progress();
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  check(g2.mission.restore(saved) && g2.mission.done.has('skattjakt') && g2.stats.huntSolo === 2, 'saved and loaded: done, with its stats');
}
{
  console.log('Arnes skattjakt: för sent till telefonen, och att fortsätta efter en omladdning');
  const known = [...UP_TO_UTSIKT.filter((d) => d !== 'red'), 'skattjakt'];
  const g = huntGame({ hunt: { at: 3, solo: 1, onTime: false } }, known, 'skattjakt');
  const m = g.mission, p = g.player;
  const ev = record(g, ['talk', 'toast', 'sms', 'banner']);
  run(g, 1.5);
  const job = m.active;
  const t1 = lastTalk(ev, 'skattjakt');
  check(job && job.id === 'skattjakt' && job.stage === 'reread' && job.k === 2 && job.solo === 1 && t1 && t1.pages.length === 1 && t1.pages[0].text === RIDDLES[2].verse, 'loaded while following it: it goes on at once – the note you were on');
  m.talkDone('skattjakt'); run(g, 0.2);
  check(job.stage === 'seek' && m.objective === RIDDLES[2].obj[0], `  "${m.objective}"`);
  walkHere(g, 98, -377); run(g, 0.3);
  walkHere(g, INGVAR.x, INGVAR.z + 1.3); run(g, 0.1); press(g); run(g, 0.8);
  m.talkDone('skattjakt'); run(g, 0.2);
  check(job.stage === 'phone' && job.timed, 'Ingvar: "Kör."');
  run(g, HUNT.phoneTime + 1);
  check(!job.timed && ev.some(([n, d]) => n === 'toast' && /Tiden har gått ut/.test(d.text)) && m.sub === 'Ingvar ringer när han ser dig där', `a minute and a half on the island: "${m.sub}"`);
  walkHere(g, HUNT.booth.x, HUNT.booth.z + 10); run(g, 0.3);
  check(job.ringing && !job.onTime && !ev.some(([n, d]) => n === 'toast' && /I tid!/.test(d.text)), 'at the quay at last: it rings anyway');
  walkHere(g, HUNT.booth.x, HUNT.booth.z); run(g, 0.1); press(g); run(g, 0.6);
  const t2 = lastTalk(ev, 'skattjakt');
  check(/Du är sen/.test(t2.pages[1].text), `  "${t2.pages[1].text}"`);
  m.talkDone('skattjakt'); run(g, 0.3);
  check(g.stats.hunt.at === 5 && g.stats.hunt.onTime === false && g.stats.hunt.solo === 2, '  saved: riddle four, two of them without a tip (the lighthouse too), late');
  const g2 = new Game({ seed: 7, traffic: 0, peds: 0 });
  g2.mission.restore(m.progress());
  const ev2 = record(g2, ['talk', 'toast']);
  run(g2, 1.5);
  check(g2.mission.active && g2.mission.active.stage === 'reread' && lastTalk(ev2, 'skattjakt').pages[0].text === RIDDLES[3].verse, 'saved and loaded: Arne\'s fourth note again');
  // a save at the phone box, and one with the butter box
  const g3 = huntGame({ hunt: { at: 4, solo: 2, onTime: false } }, known, 'skattjakt');
  const ev3 = record(g3, ['toast']);
  run(g3, 1.5);
  check(g3.mission.active && g3.mission.active.stage === 'phone' && !g3.mission.active.timed && ev3.some(([n, d]) => n === 'toast' && /telefonkiosken på kajen/.test(d.text)), 'loaded at the phone step: "…kör till telefonkiosken på kajen" (no clock now)');
  const g4 = huntGame({ hunt: { at: 6, solo: 4, onTime: true } }, known, 'skattjakt');
  const m4 = g4.mission, ev4 = record(g4, ['talk', 'toast']);
  run(g4, 1.5);
  const j4 = m4.active;
  check(j4 && j4.stage === 'deliver' && j4.carry === 'box' && ev4.some(([n, d]) => n === 'toast' && /ta Arnes låda till Gun/.test(d.text)), 'loaded with the butter box: to Gun with it');
  walkHere(g4, KONDITORI.x + 0.3, KONDITORI.z - 3); run(g4, 0.3);
  walkHere(g4, KONDITORI.x, KONDITORI.z); run(g4, 1.2);
  m4.talkFx('skattjakt', 'mortar'); m4.talkDone('skattjakt'); run(g4, 0.3);
  for (let i = 0; i < HUNT.pestle; i++) { g4.step(DT, { ...idle, action: true }); run(g4, 0.08); }
  let n = 0; while (j4.stage === 'baking' && n++ < 60 * 12) g4.step(DT, idle);
  const money0 = g4.money;
  m4.talkDone('skattjakt'); run(g4, 0.5);
  check(m4.done.has('skattjakt') && g4.money - money0 === HUNT_MAX, `all four riddles without a tip and on time: the full ${fmt(HUNT_MAX)} kr`);
}
{
  console.log('Arnes skattjakt och Kyrkkaffet samtidigt');
  const g = huntGame();
  const m = g.mission, flag = m.flag, gun = flag.gun;
  run(g, 50);
  check(m.known.has('skattjakt') && m.known.has('kyrkkaffe'), 'both texts have come (Gun\'s envelope and Inga\'s church coffee)');
  walkHere(g, 60, -20); run(g, 1);
  check(flag.huntPin && Math.hypot(gun.x - HUNT.gun.x, gun.z - HUNT.gun.z) < 0.05, 'Gun waits at the konditori');
  m.accept('kyrkkaffe'); run(g, 0.5);
  walkHere(g, 80, 100); run(g, 1);
  check(!flag.huntPin && !m.huntBengt && Math.hypot(gun.x - GUN.x, gun.z - GUN.z) < 0.05, 'following Kyrkkaffet: she has gone home to her garden (out of sight)');
  walkHere(g, -97.5, -45.8);
  walkPath(g, [[-97.5, -48.6], [KYRK.mark.x, KYRK.mark.z]], () => m.active, 10);
  check(m.active && m.active.id === 'kyrkkaffe' && Math.hypot(gun.x - GUN.x, gun.z - GUN.z) < 0.1, '  and the church coffee starts with her there');
  m.accept('skattjakt'); run(g, 0.2);
  check(m.active.id === 'kyrkkaffe' && m.prevTracked === 'skattjakt', '  (the treasure hunt waits until the church coffee is done)');
}

// ---------- 40. main quest, part 13: "Flaskposten" (v1.12) – Dahlgren's washing-up, Ingvar's bottle, Elsa ----------
const UP_TO_HUNT = [...UP_TO_UTSIKT, 'skattjakt'];
function flaskGame(stats = {}, known = null, tracked = null, extra = []) {
  const g = new Game({ seed: 7, traffic: 0, peds: 0 });
  const s = livsSave([...UP_TO_HUNT, ...extra]);
  g.mission.restore({ ...s, money: 0, stats, known: known || s.known, tracked });
  return g;
}
// dry the dishes: take every plate after `wait` s, but let the ones in `drop` (by number) slip
function dryDishes(g, job, drop = [], wait = 0.3) {
  let n = 0;
  for (let i = 0; i < 60 * 60 && job.stage === 'dishes'; i++) {
    const offer = job.plate === 'offer', take = offer && job.plateT >= wait && !drop.includes(n);
    g.step(DT, { ...idle, action: take });
    if (take || (offer && job.plate !== 'offer')) n++;
  }
}
{
  console.log('Flaskposten (huvuduppdrag del 13): hela vägen');
  const g = flaskGame();
  const m = g.mission, p = g.player, ind = g.indoors, flag = m.flag;
  const ev = record(g, ['sms', 'talk', 'toast', 'banner', 'say', 'plate', 'knock', 'secret', 'hint', 'endcard', 'keys', 'churchBell', 'lock']);
  check(FLASK_MAX === 5500 && FLASK.code === '1974', `up to ${fmt(FLASK_MAX)} kr; the code 1974`);
  walkHere(g, 60, -20);
  run(g, 25);
  check(!m.known.has('flaskpost'), 'no word yet');
  run(g, 6);
  const sms = (ev.find(([n, d]) => n === 'sms' && d.offer === 'flaskpost') || [])[1];
  check(sms && sms.from === GUN_FROM && /Dahlgren har diskat/.test(sms.text) && /Ingvar/.test(sms.text), `30 s after the treasure hunt: Gun texts ("${sms && sms.text.slice(0, 46)}…")`);
  run(g, 1);
  check(flag.huntPin && m.flaskDahl && m.flaskIngvar && m.flaskDishes && Math.hypot(m.flaskDahl.x - FLASK.dahl.x, m.flaskDahl.z - FLASK.dahl.z) < 0.05, 'Gun, Dahlgren at his washing-up table and Ingvar wait outside the konditori');
  check(!reachable(g, { x: -6, z: 34 }, [KONDITORI, FLASK.you], { x0: -30, z0: 8, x1: 20, z1: 45 }).length, '  you can walk up to them');
  m.accept('flaskpost'); run(g, 0.3);
  check(m.objective === 'Till konditoriet (G)' && m.sub === 'Dahlgren diskar utanför dörren', `following it: "${m.objective}" · ${m.sub}`);
  walkHere(g, KONDITORI.x, KONDITORI.z - 4); walkHere(g, KONDITORI.x, KONDITORI.z); run(g, 1);
  const job = m.active;
  const t1 = lastTalk(ev, 'flaskpost');
  check(job && job.id === 'flaskpost' && job.stage === 'intro' && t1.pages.length === 7 && t1.pages.some((q) => /fel knapp/.test(q.text)) && t1.pages.at(-1).last === 'JAG TORKAR', 'Dahlgren has washed up since five (he broke the dishwasher), and Ingvar asked for you');
  m.talkDone('flaskpost'); run(g, 0.7);
  check(job.stage === 'dishes' && p.frozen && ev.some(([n, d]) => n === 'hint' && d.id === 'torka'), 'the washing-up: dry what Dahlgren holds out');
  // wait for the first plate: TORKA only while he holds it out
  for (let i = 0; i < 60 * 3 && job.plate !== 'offer'; i++) g.step(DT, idle);
  g.step(DT, idle);
  check(m.prompt === 'TORKA' && ev.some(([n, d]) => n === 'plate' && d.kind === 'offer'), '  TORKA when he holds out a plate');
  dryDishes(g, job, [2, 7]);
  run(g, 1.2);
  check(job.dried === 10 && job.broken === 2 && ev.filter(([n, d]) => n === 'plate' && d.kind === 'crash').length === 2 && ev.some(([n, d]) => n === 'say' && d.who === m.flaskDahl && /Hoppsan/.test(d.text)), 'twelve plates: ten dried, two slipped ("Hoppsan.")');
  const t2 = lastTalk(ev, 'flaskpost');
  check(job.stage === 'after' && /Bara 2 sönder/.test(t2.pages[0].text) && t2.pages.some((q) => q.text === 'Flaskposten.') && t2.pages.some((q) => /Södra klipporna/.test(q.text)), '  Gun: "Bara 2 sönder." – Ingvar: "Flaskposten." (you have not found it: the south cliffs)');
  m.talkDone('flaskpost'); run(g, 0.3);
  check(job.stage === 'bottle' && g.stats.flask.at === 1 && m.targets.some((t) => t.gps && Math.hypot(t.x - FLASK.bottle.x, t.z - FLASK.bottle.z) < 0.1), 'to the bottle on Söderholmen (saved; the GPS shows the way)');
  run(g, 3);
  check(!g.peds.list.includes(m.flaskIngvar) || Math.hypot(m.flaskIngvar.x - FLASK.ingvar.x, m.flaskIngvar.z - FLASK.ingvar.z) > 0.5, '  Ingvar walks off with his bun');
  walkHere(g, FLASK.bottle.x, FLASK.bottle.z); run(g, 0.1);
  check(m.prompt === 'UNDERSÖK', 'UNDERSÖK by the bottle among the stones');
  press(g); run(g, 0.7);
  const t3 = lastTalk(ev, 'flaskpost');
  check(t3.pages[1].note && /titta under fyrens trappa/.test(t3.pages[1].text) && /1974/.test(t3.pages[1].text), '  "Den som hittar det här – titta under fyrens trappa. /I. 1974"');
  m.talkDone('flaskpost'); run(g, 1.6);
  check(job.stage === 'stairs' && g.stats.secrets.includes('bottle') && g.stats.flask.at === 2 && m.ingvar, '  on to the lighthouse – and the bottle counts as a secret');
  check(!reachable(g, { x: 98, z: -377 }, [FLASK.stair, { x: FLASK.stair.x + 0.25, z: FLASK.stair.z + 0.35 }], { x0: 85, z0: -400, x1: 125, z1: -366 }).length, '  you can walk round to the steps on the east side');
  walkHere(g, FLASK.stair.x, FLASK.stair.z); run(g, 0.1);
  check(m.prompt === 'UNDERSÖK' && m.targets.some((t) => t.kind === 'zone' && Math.hypot(t.x - FLASK.stair.x, t.z - FLASK.stair.z) < 0.1), 'UNDERSÖK under the lighthouse steps');
  press(g);
  let L = g.lock;
  check(L && L.code === '1974' && L.n === 4 && p.frozen && g.camFocus && g.camFocus.cam && Math.hypot(g.camFocus.cam.x - g.camFocus.x, g.camFocus.cam.z - g.camFocus.z) < 9, '  a rusty tin in the hollow – a four-digit lock (a fixed shot of the steps)');
  typeCode(L, '1947'); L.tryOpen(); run(g, 0.6);
  check(L.tries === 1 && /\/I\./.test(L.line), `  1947: wrong – "${L.line}"`);
  typeCode(L, '1974'); L.tryOpen(); run(g, 1.4);
  const t4 = lastTalk(ev, 'flaskpost');
  check(!g.lock && job.carry === 'letter' && !job.tinShown && /Till Elsa/.test(t4.pages[0].text), '  1974: open! "Till Elsa. Söderholmen." and a dried sea pink');
  m.talkDone('flaskpost');
  let n = 0; while (job.stage === 'ingvarWalk' && n++ < 60 * 14) g.step(DT, idle);
  run(g, 0.6);
  const t5 = lastTalk(ev, 'flaskpost');
  check(job.stage === 'ingvarTalk' && Math.hypot(m.ingvar.x - FLASK.ingvarStair.x, m.ingvar.z - FLASK.ingvarStair.z) < 0.4 && t5.pages[0].text === 'Elsa.' && t5.pages.some((q) => /grön klänning/.test(q.text)) && t5.pages.some((q) => /tredje raden/.test(q.text)), `Ingvar comes over from his cottage (${(n / 60).toFixed(1)} s): "Elsa." – the dance in 1974`);
  m.talkDone('flaskpost'); run(g, 0.3);
  check(job.stage === 'elsa' && g.stats.flask.at === 3 && /gröna huset/.test(m.sub), `to Elsa: "${m.objective}" · ${m.sub}`);
  check(!reachable(g, { x: SOUTH.landing.x + 2, z: SOUTH.landing.z + 4 }, [ELSA_DOOR], { x0: -125, z0: 182, x1: 124, z1: 290 }).length, '  you can walk to her door');
  walkHere(g, ELSA_DOOR.x, ELSA_DOOR.z); run(g, 0.1);
  check(m.prompt === 'KNACKA', 'KNACKA at the green house by the chapel');
  press(g); run(g, 3.5);
  check(g.indoor && ind.where === 'elsa' && job.elsa && job.elsa.state === 'lounge' && ev.some(([nn]) => nn === 'knock'), '  "Det är öppet!" – in: Elsa in her rocking chair');
  const t6 = lastTalk(ev, 'flaskpost');
  check(t6.pages.some((q) => /glasögon/.test(q.text)) && t6.pages.at(-1).last === 'JAG LETAR', '  she cannot read without her glasses');
  m.talkDone('flaskpost'); run(g, 0.3);
  const H = ELSA_HOUSE;
  check(!reachable(g, H.spawn, [...ELSA_SPOTS, H.talk, H.door], H.bounds).length, '  you can walk to every place to look, and to her chair');
  check(reachable(g, H.spawn, [{ x: H.room.x0 + 4, z: H.room.z0 - 1.2 }], { x0: H.bounds.x0, z0: H.bounds.z0 - 2, x1: H.bounds.x1, z1: H.bounds.z1 }).length === 1, '  but not out through the walls');
  check(m.targets.filter((t) => t.kind === 'item').length === ELSA_SPOTS.length, `  ${ELSA_SPOTS.length} arrows`);
  for (const sp of ELSA_SPOTS.filter((q) => !q.find).slice(0, 3)) {
    walkHere(g, sp.x, sp.z); run(g, 0.1);
    const pr = m.prompt; press(g); run(g, 1.0);
    check(pr === 'LETA' && job.stage === 'read' && lastTalk(ev, 'flaskpost').pages[0].text === sp.text, `  LETA (${sp.id}): "${sp.text.slice(0, 44)}…"`);
    m.talkDone('flaskpost'); run(g, 0.5);
  }
  check(job.hinted && ev.some(([nn, d]) => nn === 'say' && d.who === job.elsa && /Måns korg/.test(d.text)), 'three places: Elsa – "Har du tittat i Måns korg?"');
  const korg = ELSA_SPOTS.find((q) => q.find);
  walkHere(g, korg.x, korg.z); run(g, 0.1); press(g); run(g, 1.0);
  check(job.carry === 'glasses' && !job.solo && /glasögon/.test(lastTalk(ev, 'flaskpost').pages[0].text), '  in the cat basket: her glasses, under Måns');
  m.talkDone('flaskpost'); run(g, 0.3);
  walkHere(g, H.talk.x, H.talk.z); run(g, 0.1);
  check(job.stage === 'give' && m.prompt === 'GE', 'GE her the glasses');
  press(g); run(g, 0.6);
  const t7 = lastTalk(ev, 'flaskpost');
  check(t7.pages.filter((q) => q.note && /Ingvars brev/.test(q.who)).length === 3 && t7.pages.some((q) => /Ingvar Lund/.test(q.text)) && t7.pages.some((q) => /I femtio år/.test(q.text)), '  she reads it: Ingvar\'s letter from 1974 – "I femtio år!"');
  for (const pg of t7.pages) if (pg.fx) m.talkFx('flaskpost', pg.fx);
  check((job.elsa.body.look.style & 8) && job.carry === 'reply', '  glasses on; she writes an answer');
  m.talkDone('flaskpost'); run(g, 0.3);
  check(job.stage === 'reply' && g.stats.flask.at === 4 && m.sub === 'Gå ut ur huset', `"${m.objective}" · ${m.sub}`);
  walkHere(g, H.door.x, H.door.z); run(g, 0.1);
  check(m.prompt === 'GÅ UT', '  GÅ UT');
  press(g); run(g, 1.4);
  check(!g.indoor && Math.hypot(p.x - ELSA_DOOR.x, p.z - ELSA_DOOR.z) < 1.2 && !job.elsa && m.targets.some((t) => t.ref === m.ingvar && t.gps), '  out on her step; the GPS to Ingvar');
  walkHere(g, INGVAR.x, INGVAR.z + 1.3); run(g, 0.1);
  check(m.prompt === 'PRATA', 'PRATA with Ingvar by his cottage');
  press(g); run(g, 0.6);
  const t8 = lastTalk(ev, 'flaskpost');
  check(t8.pages.some((q) => q.note && /Tredje raden/.test(q.text)) && t8.pages.some((q) => q.text === 'Söndag.'), '  Elsa\'s answer: "Tredje raden. Söndag." – Ingvar: "Söndag."');
  m.talkDone('flaskpost'); run(g, 0.3);
  check(job.stage === 'sunday' && g.stats.flask.at === 5 && m.targets.some((t) => t.gps && Math.hypot(t.x - CHAPEL_DOOR.x, t.z - CHAPEL_DOOR.z) < 0.1), 'Sunday: to the chapel (he takes his boat)');
  walkHere(g, CHAPEL_DOOR.x, CHAPEL_DOOR.z); run(g, 0.1);
  check(m.prompt === 'GÅ IN' && !g.peds.list.includes(m.ingvar), 'GÅ IN at the chapel (Ingvar is not at the lighthouse now)');
  press(g); run(g, 1.6);
  check(g.indoor && ind.where === 'chapel' && job.stage === 'church' && ev.some(([nn]) => nn === 'churchBell') && job.churchFolk.length === 3 && job.churchFolk.every((q) => q.state === 'lounge'), '  inside: Elsa on the third row, Gun and Dahlgren in front');
  n = 0; while (job.stage === 'church' && n++ < 60 * 25) g.step(DT, idle);
  run(g, 1.2);
  const I = job.ingvarIn, C = FLASK.church;
  check(job.stage === 'finale' && I && I.state === 'lounge' && Math.hypot(I.x - C.ingvar.x, I.z - C.ingvar.z) < 0.05, `  Ingvar walks up the aisle and sits down beside her (${(n / 60).toFixed(1)} s)`);
  const t9 = lastTalk(ev, 'flaskpost');
  const pay = FLASK.pay.base + 10 * FLASK.pay.plate;
  check(t9.pages.some((q) => q.text === 'Hej, Elsa.') && t9.pages.some((q) => /Arne var också alltid sen/.test(q.text)) && t9.pages.at(-1).text.includes(`${fmt(pay)} kronorna`) && /2 tallrikar/.test(t9.pages.at(-1).text), '  "Hej, Elsa." – "Arne var också alltid sen."');
  const money0 = g.money;
  m.talkDone('flaskpost'); run(g, 0.5);
  check(m.done.has('flaskpost') && g.money - money0 === pay && ev.some(([nn, d]) => nn === 'banner' && d.sub === 'Flaskposten'), `main quest part 13 done: ${fmt(pay)} kr (5 000 + 10 plates; the glasses after Elsa's hint)`);
  check(g.stats.flaskDried === 10 && g.stats.flaskBroken === 2 && g.stats.flask.at === 6, '  stats for the end card');
  run(g, 15);
  check(ev.some(([nn]) => nn === 'endcard') && ev.some(([nn, d]) => nn === 'sms' && /version 1\.12/.test(d.text)), 'all sixteen parts: the end card');
  run(g, 16);
  check(ev.some(([nn, d]) => nn === 'sms' && d.from === 'Elsa' && /FYRA MINUTER/.test(d.text)), '  and Elsa texts: "…FYRA MINUTER!"');
  walkHere(g, CHAPEL.door.x, CHAPEL.door.z); run(g, 0.1); press(g); run(g, 1.4);
  check(!g.indoor && !g.peds.list.includes(I) && !job.churchFolk.some((q) => g.peds.list.includes(q)), 'out of the chapel: they stay behind');
  walkHere(g, 60, -20); run(g, 2);
  check(m.ingvar && Math.hypot(m.ingvar.x - INGVAR.x, m.ingvar.z - INGVAR.z) < 0.1 && !m.flaskDishes && !m.flaskDahl && !flag.huntPin, 'out of sight: Ingvar is back at the lighthouse, the washing-up table gone, Gun at home');
}
{
  console.log('Flaskposten: flaskan redan hittad, och att fortsätta efter en omladdning');
  const g = flaskGame({ secrets: ['bottle'] });
  const m = g.mission;
  const ev = record(g, ['talk', 'toast']);
  walkHere(g, 60, -20); run(g, 32);
  m.accept('flaskpost');
  walkHere(g, KONDITORI.x, KONDITORI.z - 4); walkHere(g, KONDITORI.x, KONDITORI.z); run(g, 1);
  const job = m.active;
  m.talkDone('flaskpost'); run(g, 0.3);
  dryDishes(g, job, []); run(g, 1.2);
  const t = lastTalk(ev, 'flaskpost');
  check(job.dried === 12 && /Inte en enda sönder/.test(t.pages[0].text) && t.pages.some((q) => /Utom du/.test(q.text)), 'all twelve dried ("Inte en enda sönder!") – and you found the bottle long ago: "Utom du."');
  m.talkDone('flaskpost'); run(g, 0.3);
  check(job.stage === 'stairs', '  straight to the lighthouse steps');
  // a reload with Elsa's answer in your pocket
  const known = [...UP_TO_HUNT.filter((d) => d !== 'red'), 'flaskpost'];
  const g2 = flaskGame({ flask: { at: 4, dried: 12, broken: 0, solo: true } }, known, 'flaskpost');
  const ev2 = record(g2, ['toast']);
  run(g2, 1.5);
  const j2 = g2.mission.active;
  check(j2 && j2.stage === 'reply' && j2.carry === 'reply' && ev2.some(([n, d]) => n === 'toast' && /Elsas svar till Ingvar/.test(d.text)), 'loaded with Elsa\'s answer: to Ingvar with it');
  const g3 = flaskGame({ flask: { at: 5, dried: 12, broken: 0, solo: true } }, known, 'flaskpost');
  run(g3, 1.5);
  const j3 = g3.mission.active;
  walkHere(g3, CHAPEL_DOOR.x, CHAPEL_DOOR.z); run(g3, 0.1); press(g3); run(g3, 1.6);
  let n = 0; while (j3.stage === 'church' && n++ < 60 * 25) g3.step(DT, idle);
  run(g3, 1.2);
  const money0 = g3.money;
  g3.mission.talkDone('flaskpost'); run(g3, 0.5);
  check(g3.mission.done.has('flaskpost') && g3.money - money0 === FLASK_MAX, `loaded on Sunday, every plate dried and the glasses found without a hint: the full ${fmt(FLASK_MAX)} kr`);
}

console.log(fails ? `\n${fails} check(s) failed` : '\nAll mission checks passed');
process.exit(fails ? 1 : 0);
