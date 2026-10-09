// Main quest, part 1: "Samuels cykelnycklar".
// Samuel lounges on his sofa on floor 7 of the dark tower, staring at his phone. Now and then he
// looks up and around the room; noise (running, the keys jingling) makes him look up sooner and
// toward the sound. If he sees you for long enough – quicker the closer you are, and quicker
// when you move – he jumps up and throws you out.
import { Ped } from './peds.js';
import { INT, inFlat } from './interior.js';
import { WHO, SAMUEL_REWARD } from './config.js';
import { clamp, wrapAngle } from './rng.js';

const LOOK = { shirt: 0x6e7a46, pants: 0x2b2e35, skin: 0xe8b996, hair: 0x3a2618, height: 1.0, bulk: 1.02 };
export const SEE = {
  range: 9,        // metres he can see across the room when he looks up
  half: 0.82,      // half the width of his view (radians, ~47°)
  near: 1.3,       // even with his nose in the phone he notices someone this close
  yawMax: 1.55,    // how far he turns his head to either side
};
const RUN = 4.2;   // faster than this is running – he hears it
const LINES = {
  warn: ['Hm?', 'Va?', 'Vad var det?', 'Är det någon där?'],
  calm: ['Äh. Ingenting.', 'Inbillning…', 'Måste vara grannen.'],
  sus: ['Hallå…?', 'Är det någon där?', 'Jag hörde något…'],
  caught: ['HALLÅ! Vad gör du i min lägenhet?!', 'EY! Vem är du?!', 'Vad i hela… UT HÄRIFRÅN!'],
  out: ['UT!', 'Och kom inte tillbaka!'],
};

// the same turns the shader makes for the lounging pose (see shaders.js, pose 4)
const rx = (a, v) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]]; };
const ry = (a, v) => { const c = Math.cos(a), s = Math.sin(a); return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]]; };
const rz = (a, v) => { const c = Math.cos(a), s = Math.sin(a); return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]]; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const HIP = [0, 0.92, 0], NECK = [0, 1.53, 0], RECLINE = -0.75;

// a point on a lounging body (body coordinates, after any limb turn) → world
function toWorld(body, v) {
  const L = body.look;
  const r = add(HIP, rx(RECLINE, sub(v, HIP)));
  const s = [r[0] * (L.bulk || 1), r[1] * (L.height || 1), r[2] * (L.bulk || 1)];
  const w = ry(body.h, s);
  return [body.x + w[0], body.y + w[1], body.z + w[2]];
}
export function headOf(body) {
  const v = add(NECK, ry(body.headYaw || 0, rx(body.headPitch || 0, [0, 0.17, 0.02])));
  return toWorld(body, v);
}
// where his hands hold the phone, and which way the screen faces (toward his head)
export function phoneOf(body) {
  const up = body.phone || 0, a = -0.55 + (-1.5 + 0.55) * up;
  const hand = (s) => add([0.31 * s, 1.47, 0], rx(a, rz(-s * (0.12 + 0.36 * up), [0, -0.6, 0])));
  const l = hand(1), r = hand(-1);
  const mid = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2 + 0.03, (l[2] + r[2]) / 2 + 0.02];
  return { at: toWorld(body, mid), look: headOf(body) };
}

export class Samuel {
  constructor(game) {
    this.game = game;
    const R = game.rng;
    this.R = R;
    const ped = new Ped(game, LOOK);
    const S = INT.seat;
    ped.x = S.x; ped.z = S.z; ped.h = S.h;
    ped.y = S.y - 0.92; // hips on the seat
    ped.state = 'lounge'; ped.keep = true; ped.npc = 'samuel';
    const b = ped.body;
    b.pose = 4; b.headYaw = 0; b.headPitch = 0.42; b.phone = 1;
    b.x = ped.x; b.y = ped.y; b.z = ped.z; b.h = ped.h;
    game.peds.add(ped);
    this.ped = ped;
    this.mode = 'phone';      // phone → warn → look (→ alert) → phone; 'up' once he has seen you
    this.t = R.range(5.5, 7.5); // the first look-up comes after a little while
    this.targets = []; this.ti = 0; this.yawT = 0;
    this.meter = 0;           // 0 … 1: how sure he is that someone is there
    this.seen = false;        // he sees you right now
    this.lastSeen = null;
    this.noiseAt = null; this.pending = null; this.noiseCool = 0; this.heardT = 0;
    this.caught = false;
    this.cone = { x: 0, z: 0, dir: 0, on: 0, alert: 0 }; // for the view and the map
    this.sayT = 0;
  }

  get body() { return this.ped.body; }
  get head() { return headOf(this.ped.body); }

  say(kind) {
    const L = LINES[kind];
    if (!L) return;
    this.sayT = 2.5;
    this.game.emit('say', { who: this.ped, text: this.R.pick(L) });
  }

  // a sound at (x, z): he looks up (after `delay` seconds) and turns toward it; while the sound
  // goes on (someone running about) his head follows it
  noise(x, z, delay = 0) {
    if (this.mode === 'up') return;
    if (delay > 0) { if (!this.pending) this.pending = { t: delay, x, z }; return; }
    this.hear(x, z);
  }

  hear(x, z) {
    this.noiseAt = { x, z };
    this.heardT = 2.4;
    if (this.mode === 'phone') { this.mode = 'warn'; this.t = 0.4; if (this.noiseCool <= 0) this.say('warn'); }
    else if (this.mode === 'warn') this.t = Math.min(this.t, 0.4);
    else if (this.mode === 'look' || this.mode === 'alert') this.t = Math.max(this.t, 2.0);
    this.noiseCool = 1.6;
  }

  // someone just came in: he has not heard anything, but he will look up soon
  noticeEntry() {
    if (this.entered) return;
    this.entered = true;
    if (this.mode === 'phone') this.t = Math.min(this.t, this.R.range(2.3, 3.4));
  }

  // where to look while he looks up: a little sweep of the room, mostly toward the kitchen
  plan() {
    const pats = [[0.95, 0.2], [0.55, 1.1], [0.3, 1.0], [-0.6, 0.9], [0.95, -0.3], [-0.5, 0.25]];
    this.targets = this.R.pick(pats).slice();
    this.ti = 0; this.yawT = 0;
  }

  yawTo(x, z) {
    const h = this.head;
    return clamp(wrapAngle(Math.atan2(x - h[0], z - h[2]) - this.ped.h), -SEE.yawMax, SEE.yawMax);
  }

  // can his eyes reach (x, z)? walls and the fridge are in the way, the sofa and tables are not
  los(x, z) {
    const h = this.head;
    return this.game.world.raycast(h[0], h[2], x, z, INT.y + 1.5) >= 1;
  }

  update(dt) {
    const g = this.game, p = g.player, b = this.body, R = this.R;
    this.sayT -= dt;
    if (this.noiseCool > 0) this.noiseCool -= dt;
    if (this.heardT > 0) this.heardT -= dt;
    if (this.pending && (this.pending.t -= dt) <= 0) { const q = this.pending; this.pending = null; this.hear(q.x, q.z); }
    // running in the flat is loud
    const sp = Math.hypot(p.vx, p.vz);
    const hd = this.head;
    const dx = p.x - hd[0], dz = p.z - hd[2], d = Math.hypot(dx, dz);
    if (this.mode !== 'up' && p.state === 'foot' && sp > RUN && d < 9 && inFlat(p.x, p.z)) this.noise(p.x, p.z);

    this.t -= dt;
    let phone = 1, pitch = 0.42, yawGoal = 0, watching = false;
    switch (this.mode) {
      case 'phone':
        if (this.t <= 0) { this.mode = 'warn'; this.t = 0.8; this.noiseAt = null; }
        break;
      case 'warn': // lowering the phone: the "?" shows, but he does not see anything yet
        phone = 0.45; pitch = 0.12; yawGoal = b.headYaw;
        if (this.t <= 0) { this.mode = 'look'; this.t = R.range(2.6, 3.6); this.plan(); }
        break;
      case 'look':
      case 'alert': {
        phone = 0; pitch = -0.04; watching = true;
        const n = this.targets.length || 1;
        if (this.mode === 'alert' && this.lastSeen) yawGoal = this.yawTo(this.lastSeen.x, this.lastSeen.z);
        else if (this.heardT > 0 && this.noiseAt) yawGoal = this.yawTo(this.noiseAt.x, this.noiseAt.z); // toward the sound
        else {
          this.yawT += dt;
          if (this.yawT > 1.05 && this.ti < n - 1) { this.ti++; this.yawT = 0; }
          yawGoal = this.targets[this.ti] ?? 0;
        }
        if (this.t <= 0) {
          if (this.meter > 0.25 && this.mode === 'look') { this.mode = 'alert'; this.t = 1.6; if (this.sayT <= 0) this.say('sus'); }
          else {
            if (this.meter > 0.05 || this.noiseAt) { if (this.sayT <= 0) this.say('calm'); }
            this.mode = 'phone'; this.t = R.range(4.0, 7.5); this.noiseAt = null; this.lastSeen = null; this.yawT = 0;
          }
        }
        break;
      }
      case 'up':
        phone = 0; pitch = 0; yawGoal = this.yawTo(p.x, p.z);
        break;
    }
    // turn the head at a human pace
    const turn = (this.mode === 'alert' || this.mode === 'up' ? 3.2 : 2.1) * dt;
    b.headYaw += clamp(wrapAngle(yawGoal - b.headYaw), -turn, turn);
    b.headPitch += (pitch - b.headPitch) * Math.min(1, dt * 5);
    b.phone += (phone - b.phone) * Math.min(1, dt * 4);

    // do his eyes find you?
    this.seen = false;
    if (this.mode !== 'up' && (p.state === 'foot' || p.state === 'down')) {
      const ang = Math.abs(wrapAngle(Math.atan2(dx, dz) - (this.ped.h + b.headYaw)));
      if (watching && d < SEE.range && ang < SEE.half && this.los(p.x, p.z)) this.seen = true;
      else if (d < SEE.near && this.los(p.x, p.z)) this.seen = true; // right next to him
      if (this.seen) {
        let rate = clamp(1.55 - d * 0.11, 0.5, 1.4);
        if (sp > RUN) rate *= 1.7; else if (sp > 0.6) rate *= 1.35;
        if (this.mode === 'alert') rate *= 1.3;
        this.meter = Math.min(1, this.meter + rate * dt);
        this.lastSeen = { x: p.x, z: p.z };
        if (this.mode === 'phone' && this.meter > 0.3) { this.mode = 'alert'; this.t = 1.6; this.say('warn'); }
      } else this.meter = Math.max(0, this.meter - 0.4 * dt);
      if (this.meter >= 1) this.catch();
    }

    // what the view and the minimap show
    const c = this.cone;
    c.x = hd[0]; c.z = hd[2]; c.dir = this.ped.h + b.headYaw;
    const want = this.mode === 'look' || this.mode === 'alert' ? 1 : this.mode === 'warn' ? 0.35 : 0;
    c.on += (want - c.on) * Math.min(1, dt * 6);
    c.alert += ((this.mode === 'alert' || this.meter > 0.2 ? 1 : 0) - c.alert) * Math.min(1, dt * 5);
  }

  // seen: he sits up, shouts, and gets up
  catch() {
    if (this.caught) return;
    this.caught = true;
    this.mode = 'up';
    this.meter = 1;
    this.say('caught');
    this.game.emit('caught', {});
    this.game.mission.later(0.7, () => this.standUp());
  }

  standUp() {
    const ped = this.ped, b = ped.body, p = this.game.player;
    ped.state = 'stand';
    ped.x = INT.seat.x; ped.z = INT.seat.z + 0.75; ped.y = INT.y;
    ped.standH = Math.atan2(p.x - ped.x, p.z - ped.z);
    ped.h = ped.standH;
    ped.wave = true; // shakes his fist
    b.pose = 1; b.headYaw = 0; b.headPitch = 0; b.phone = 0;
  }

  // the icon over his head: what he is up to and how close he is to spotting you
  get icon() {
    if (this.mode === 'up') return 'caught';
    if (this.mode === 'alert' || this.meter > 0.2) return 'alert';
    if (this.mode === 'look') return 'look';
    if (this.mode === 'warn') return 'warn';
    return 'phone';
  }

  remove() {
    const L = this.game.peds.list, i = L.indexOf(this.ped);
    if (i >= 0) L.splice(i, 1);
  }
}

// ------------------------------------------------------------------ the job
export class SamuelJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'samuel';
    this.stage = 'enter';
    this.keys = false;
    this.prompt = null;
    this.inFlat = false;
    this.titleCard = true;
  }

  start() {
    const g = this.game, m = this.mgr;
    m.setObjective('Höghuset, plan 7', '');
    g.indoors.enter(() => {
      this.stage = 'sneak';
      g.emit('toast', { text: 'Höghuset · plan 7', long: false });
      m.later(1.2, () => g.emit('hint', {
        id: 'sneak',
        touch: 'Samuel sitter i soffan. Smyg: dra spaken bara lite. Springer du hör han dig.',
        keys: 'Samuel sitter i soffan. Gå lugnt – springer du (Shift) hör han dig.',
      }), this);
    });
  }

  update() {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    if (this.stage === 'enter' || this.stage === 'caught') return;
    if (!ind.inside && !ind.busy) { // took the lift down without the keys
      m.quit(this, [WHO.anon, 'Ingen brådska. Nycklarna ligger kvar på köksbordet.']);
      return;
    }
    const sam = ind.samuel;
    if (sam && sam.caught) { this.caughtNow(); return; }
    const inside = inFlat(p.x, p.z);
    if (inside && !this.inFlat && !this.keys) {
      if (sam) sam.noticeEntry();
      m.later(0.6, () => g.emit('hint', { id: 'samuelLook', touch: 'Vänta tills han tittar i telefonen. Frågetecknet betyder att han är på väg att titta upp!', keys: 'Vänta tills han tittar i telefonen. Frågetecknet betyder att han är på väg att titta upp!' }), this);
    }
    this.inFlat = inside;
    if (!this.keys) {
      const k = INT.keys;
      this.prompt = p.state === 'foot' && Math.hypot(p.x - k.x, p.z - k.z) < 1.3 ? 'TA' : null;
      m.setObjective('Ta cykelnycklarna', inside ? 'På köksbordet · smyg när han tittar i telefonen' : 'Samuels lägenhet, lgh 1703');
    } else {
      this.prompt = null;
      if (!inside && p.z < INT.door.z - 0.1) { this.finish(); return; } // out in the corridor
      m.setObjective('Smyg ut ur lägenheten', 'Spring inte – då hör han dig');
    }
  }

  interact() {
    if (this.prompt !== 'TA') return false;
    const g = this.game, sam = g.indoors.samuel;
    this.keys = true;
    this.prompt = null;
    g.emit('keys', { taken: true });
    g.emit('toast', { text: 'Du har cykelnycklarna! Smyg ut igen.', long: true });
    if (sam) sam.noise(INT.keys.x, INT.keys.z, 0.7); // the jingle
    return true;
  }

  finish() {
    const g = this.game, m = this.mgr;
    g.indoors.shutDoor();
    g.stats.keysTaken = true;
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Samuels cykelnycklar', amount: SAMUEL_REWARD });
    m.sms(WHO.anon, 'Snyggt. Ta dig ut ur huset, så hör jag av mig om cykeln.', 3.6);
    m.later(1.0, () => g.emit('toast', { text: 'Dörren gick i lås bakom dig. Hissen är i slutet av korridoren.', long: true }));
  }

  caughtNow() {
    const g = this.game, m = this.mgr;
    this.stage = 'caught';
    this.prompt = null;
    g.player.frozen = true;
    m.later(1.5, () => {
      const sam = g.indoors.samuel;
      if (sam) sam.say('out');
      g.indoors.exit(() => {
        g.player.frozen = false;
        m.fail(this, 'Samuel såg dig', [WHO.anon, 'Klantigt. Vänta tills han har lugnat ner sig och försök igen.']);
      });
    }, this);
  }

  // the keys on the table (a small arrow) while you have not taken them
  targets(T) {
    if (!this.keys && this.game.indoors.inside) T.push({ kind: 'item', x: INT.keys.x, y: INT.keys.y, z: INT.keys.z, gps: false });
  }

  cleanup() {
    this.over = true;
    this.prompt = null;
    this.game.player.frozen = false;
  }
}
