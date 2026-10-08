// "Flaggan i topp" – a small side quest. Tant Gun stands in her front garden on Storgatan and
// waves at passers-by: her shoulder hurts and the Swedish flag should be up. Talk to her, then
// hold the action button at the flagpole to hoist the flag.
import { GUN } from './config.js';
import { Ped } from './peds.js';

const LOOK = { shirt: 0xb48fd0, pants: 0x3d3550, skin: 0xf2d0b5, hair: 0xdedad2, height: 0.92, bulk: 1.1 };
const HOIST_TIME = 3.2; // seconds of pulling from the bottom to the top
const POLE_R = 1.9, TALK_R = 2.4;

export class FlagQuest {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game;
    this.id = 'flag';
    this.h = 0;            // how far up the flag is: 0 bottom … 1 top
    this.prompt = null;    // label for the action button when you can talk or pull
    this.pulling = false;
    this.admireT = 0;      // the camera keeps looking at the flag for a moment after it reaches the top
    this.said = {};
    this.gun = this.spawnGun();
  }

  spawnGun() {
    const g = this.game;
    const ped = new Ped(g, LOOK);
    ped.x = GUN.x; ped.z = GUN.z; ped.y = g.world.groundHeight(GUN.x, GUN.z);
    ped.h = 0; ped.standH = 0; // facing the street
    ped.state = 'stand';
    ped.keep = true;
    ped.npc = 'gun';
    ped.speed = 0.9;
    ped.body.x = ped.x; ped.body.y = ped.y; ped.body.z = ped.z;
    g.peds.add(ped);
    return ped;
  }

  get done() { return this.mgr.done.has('flag'); }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, gun = this.gun;
    const known = m.known.has('flag'), done = this.done;
    const onFoot = p.state === 'foot';
    const dGun = Math.hypot(p.x - gun.x, p.z - gun.z);
    const dPole = Math.hypot(p.x - GUN.poleX, p.z - GUN.poleZ);
    this.prompt = null;
    if (onFoot && known && !done && dPole < POLE_R) this.prompt = 'HISSA';
    else if (onFoot && dGun < TALK_R && gun.state === 'stand') this.prompt = 'PRATA';
    // she waves at anyone passing by until somebody helps her
    gun.wave = !known && !done && m.gunVisible && dGun < 16;
    if (gun.wave && !this.said.hello && dGun < 15) { this.said.hello = true; this.say('Hallå där! Kan du hjälpa en gammal tant?'); }
    if (dGun > 8 && !this.pulling) gun.standH = 0;
    // hoisting: hold the action button at the pole
    this.pulling = this.prompt === 'HISSA' && !!(g.input && g.input.actionHeld);
    if (this.pulling) {
      const before = this.h;
      this.h = Math.min(1, this.h + dt / HOIST_TIME);
      p.h = Math.atan2(GUN.poleX - p.x, GUN.poleZ - p.z);
      p.vx = p.vz = 0;
      p.body.pose = 1; // one arm up, tugging at the rope
      gun.standH = Math.atan2(GUN.poleX - gun.x, GUN.poleZ - gun.z);
      if (before < 0.35 && this.h >= 0.35) this.say('Lite till!');
      if (before < 0.75 && this.h >= 0.75) this.say('Nästan uppe!');
      if (this.h >= 1) this.finish();
    }
    // while pulling (and a moment after), the camera looks up at the flag
    if (this.admireT > 0) this.admireT -= dt;
    if (this.pulling || this.admireT > 0) {
      const zf = g.layout.zones.gunFlag;
      const y = zf ? zf.bottom + (zf.top - zf.bottom) * this.h : 5;
      g.camFocus = { x: GUN.poleX + 0.8, y, z: GUN.poleZ, owner: 'flag' };
    } else if (g.camFocus && g.camFocus.owner === 'flag') g.camFocus = null;
  }

  // the action button: talk to Gun, or grab the rope (holding the button does the pulling)
  interact() {
    if (this.prompt === 'HISSA') return true;
    if (this.prompt !== 'PRATA') return false;
    const m = this.mgr, p = this.game.player, gun = this.gun;
    gun.standH = Math.atan2(p.x - gun.x, p.z - gun.z);
    if (this.done) this.say('Tack igen! Titta så fin den är.');
    else if (m.known.has('flag')) this.say('Flaggstången står där borta, vännen. Håll i linan och dra!');
    else m.offer('flag', 'talk');
    return true;
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.admireT = 2.8;
    this.say('Så fint! Tack, lilla vän!');
    m.completeQuest('flag', { title: 'SIDOUPPDRAG KLART', sub: 'Flaggan i topp', amount: GUN.reward });
    m.later(4, () => g.emit('toast', { text: 'Tant Gun bjuder på en kanelbulle. Mums!', long: true }));
    g.stats.flags = (g.stats.flags || 0) + 1;
  }

  say(text) { this.game.emit('say', { who: this.gun, text }); }

  // map + view: Gun's letter over her head; the flagpole when you follow the quest
  targets(T, tracked) {
    const m = this.mgr, gun = this.gun;
    if (this.done || !m.gunVisible) return;
    T.push({ kind: 'contact', x: gun.x, z: gun.z, r: 1, letter: 'G', color: m.quest('flag').color, badgeOnly: true, badgeY: 2.75, ref: gun });
    if (tracked && m.known.has('flag')) T.push({ kind: 'zone', x: GUN.poleX, z: GUN.poleZ, r: 1.3, gps: true });
  }

  objective() {
    if (this.pulling) return { text: 'Hissa flaggan', sub: `${Math.round(this.h * 100)} %` };
    return { text: 'Hissa flaggan hos tant Gun', sub: this.h > 0 ? `${Math.round(this.h * 100)} % uppe` : 'Villan på Storgatan' };
  }
}

