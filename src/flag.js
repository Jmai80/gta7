// "Flaggan i topp" – a small side quest. Tant Gun stands in her front garden on Storgatan and
// waves at passers-by: her shoulder hurts and the Swedish flag should be up. Talk to her, then
// hold the action button at the flagpole to hoist the flag.
import { GUN, PIER_BENCH, CURB_H } from './config.js';
import { Ped, STYLE_BITS as ST } from './peds.js';

const LOOK = { shirt: 0xb48fd0, pants: 0x3d3550, skin: 0xf2d0b5, hair: 0xdedad2, height: 0.92, bulk: 1.1, style: ST.bun | ST.glasses | ST.jacket, accent: 0x7a5a9a }; // a lilac cardigan
// main quest, part 2: the figure on the pier bench, in a dark coat with a hat pulled down
const COAT = { ...LOOK, shirt: 0x343846, pants: 0x23252b, hair: 0x1c1d22, style: ST.cap | ST.jacket, accent: 0x25272d }; // coat and hat pulled down
const PIER_LINES = ['Norra bron, kom ihåg.', 'Akta dig för Bullbilen.', 'Ät bullen nu, innan den kallnar.', 'Inte ett ord till Samuel!'];
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

  // While the handover (main quest, part 2) is due, Gun is not at home: she sits on the bench at
  // the end of the pier in a dark coat. She moves when nobody is looking, there and back.
  placement() {
    const m = this.mgr, g = this.game, gun = this.gun, p = g.player;
    const hidden = (x, z) => { const d = Math.hypot(x - p.x, z - p.z); return d > 70 || (d > 35 && !g.visible(x, z)); };
    const due = m.done.has('samuel') && m.known.has('overlamning') && !m.done.has('overlamning');
    const busy = m.active && m.active.id === 'overlamning';
    if (busy || this.pinned) return; // (pinned: at the bun party on the square, v1.0)
    if (due && !gun.away && hidden(gun.x, gun.z) && hidden(PIER_BENCH.x, PIER_BENCH.z)) this.toPier();
    else if (!due && gun.away && hidden(gun.x, gun.z) && hidden(GUN.x, GUN.z)) this.toHome();
  }

  toPier() {
    const gun = this.gun, b = gun.body;
    gun.away = true;
    gun.disguised = true;
    gun.state = 'lounge'; // posed by us: sitting on the bench, looking out over the water
    gun.x = PIER_BENCH.x; gun.z = PIER_BENCH.z - 0.04; gun.h = Math.PI;
    gun.y = CURB_H + 0.53 - 0.92 * LOOK.height;
    gun.wave = false;
    b.look = COAT; b.pose = 5; b.headYaw = 0; b.headPitch = 0.12; b.phone = 0;
    b.x = gun.x; b.y = gun.y; b.z = gun.z; b.h = gun.h;
  }

  // the coat and hat come off: it is tant Gun! She gets up and turns to you.
  // (This happens while the dialogue is open and the game waits, so the body is placed here too.)
  reveal(px, pz) {
    const gun = this.gun, b = gun.body;
    gun.disguised = false;
    b.look = LOOK;
    gun.state = 'stand';
    gun.x = PIER_BENCH.x + 1.4; gun.z = PIER_BENCH.z + 0.25; gun.y = CURB_H; // up, beside the bench
    gun.standH = Math.atan2(px - gun.x, pz - gun.z); gun.h = gun.standH;
    b.pose = 0; b.legAmp = 0; b.armAmp = 0;
    b.x = gun.x; b.y = gun.y; b.z = gun.z; b.h = gun.h;
  }

  // after the talk on the pier: a wave goodbye and a reminder when you walk off
  goodbye() { this.byeT = 5; this.said.bye = false; }

  toHome() {
    const g = this.game, gun = this.gun, b = gun.body;
    gun.away = false; gun.konditori = false;
    gun.disguised = false;
    gun.state = 'stand';
    gun.x = GUN.x; gun.z = GUN.z; gun.y = g.world.groundHeight(GUN.x, GUN.z);
    gun.h = 0; gun.standH = 0;
    b.look = LOOK; b.pose = 0;
    b.x = gun.x; b.y = gun.y; b.z = gun.z; b.h = gun.h;
  }

  update(dt) {
    this.placement();
    const g = this.game, m = this.mgr, p = g.player, gun = this.gun;
    const known = m.known.has('flag'), done = this.done, away = !!gun.away;
    const onFoot = p.state === 'foot' && !p.frozen;
    const dGun = Math.hypot(p.x - gun.x, p.z - gun.z);
    const dPole = Math.hypot(p.x - GUN.poleX, p.z - GUN.poleZ);
    this.prompt = null;
    if (onFoot && known && !done && dPole < POLE_R) this.prompt = 'HISSA';
    else if (!gun.disguised && onFoot && dGun < TALK_R && gun.state === 'stand') this.prompt = 'PRATA';
    // she waves at anyone passing by until somebody helps her (and waves goodbye on the pier)
    if (this.byeT > 0) this.byeT -= dt;
    gun.wave = !this.hush && ((!away && !known && !done && m.gunVisible && dGun < 16) || (away && !gun.disguised && this.byeT > 0 && dGun > 2.5));
    if (!away && gun.wave && !this.said.hello && dGun < 15) {
      this.said.hello = true;
      this.say(m.done.has('overlamning') ? 'Lilla vän! Hjälper du mig med flaggan också?' : 'Hallå där! Kan du hjälpa en gammal tant?'); // (she knows you after the pier)
    }
    if (away && !gun.disguised && !gun.konditori && !this.pinned && !this.said.bye && dGun > 7 && m.done.has('overlamning') && !m.done.has('cykel')) { this.said.bye = true; this.say('Norra bron, lilla vän. Glöm inte!'); }
    if (away && !gun.disguised && dGun < 12) gun.standH = Math.atan2(p.x - gun.x, p.z - gun.z); // she keeps an eye on you
    if (!away && dGun > 8 && !this.pulling) gun.standH = 0;
    // hoisting: hold the action button at the pole
    this.pulling = this.prompt === 'HISSA' && !!(g.input && g.input.actionHeld);
    if (this.pulling) {
      const before = this.h;
      this.h = Math.min(1, this.h + dt / HOIST_TIME);
      p.h = Math.atan2(GUN.poleX - p.x, GUN.poleZ - p.z);
      p.vx = p.vz = 0;
      p.body.pose = 1; // one arm up, tugging at the rope
      if (!away) gun.standH = Math.atan2(GUN.poleX - gun.x, GUN.poleZ - gun.z);
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
    if (this.pinned) { // (v1.0) at the bun party on the square
      const busy = m.active && m.active.id === 'bullfest';
      const lines = m.done.has('bullfest') ? ['Tack, lilla vän! Ta en bulle till.', 'Arne hade varit så stolt i dag.', 'Bengt bakar faktiskt riktigt goda bullar nu.']
        : busy ? ['Efter honom! Arnes cykel – och alla bullarna!'] : ['Där är du ju! Kom fram till bordet, festen ska börja.'];
      this.partyTalk = ((this.partyTalk ?? -1) + 1) % lines.length;
      this.say(lines[this.partyTalk]);
    } else if (gun.konditori) this.say('Välkommen in, lilla vän! Bullarna är nygräddade.'); // outside the konditori, after the opening
    else if (gun.away) { // on the pier, after the handover
      this.pierTalk = ((this.pierTalk ?? -1) + 1) % PIER_LINES.length;
      this.say(PIER_LINES[this.pierTalk]);
    } else if (this.done) this.say('Tack igen! Titta så fin den är.');
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

  say(text) { if (!this.gun.disguised) this.game.emit('say', { who: this.gun, text }); }

  // map + view: Gun's letter over her head; the flagpole when you follow the quest
  targets(T, tracked) {
    const m = this.mgr, gun = this.gun;
    if (this.done || !m.gunVisible) return;
    if (!gun.disguised) T.push({ kind: 'contact', x: gun.x, z: gun.z, r: 1, letter: 'G', color: m.quest('flag').color, badgeOnly: true, badgeY: 2.75, ref: gun });
    if (tracked && m.known.has('flag')) T.push({ kind: 'zone', x: GUN.poleX, z: GUN.poleZ, r: 1.3, gps: true });
  }

  objective() {
    if (this.pulling) return { text: 'Hissa flaggan', sub: `${Math.round(this.h * 100)} %` };
    return { text: 'Hissa flaggan hos tant Gun', sub: this.h > 0 ? `${Math.round(this.h * 100)} % uppe` : 'Villan på Storgatan' };
  }
}

