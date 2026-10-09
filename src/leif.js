// Side quest "Samuels nya nycklar" (v0.7). Lås-Leif, the key cutter on Skolgatan, has made a new
// set of bike keys for Samuel – who has no idea where his old ones went (you do). Samuel is waiting
// by the allotments on Norrholmen and is in a hurry: pick the keys up from Leif and get them out
// to him before he gives up. He has a thing or two to say about his keys… and his bike.
import { WHO, LEIF, SAMUEL_WAIT, KEY_TIME, KEY_REWARD } from './config.js';
import { LOOK as SAMUEL_LOOK } from './samuel.js';
import { Ped } from './peds.js';

const LEIF_LOOK = { shirt: 0x3a5f8a, pants: 0x2b2d36, skin: 0xd9a77e, hair: 0x8a8a8a, height: 0.98, bulk: 1.18 };
const LEIF_TALK = { who: 'Lås-Leif', letter: 'N', color: '#36c2b4' };
const SAMUEL = { who: 'Samuel', letter: 'S', color: '#6e7a46' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const MEET_R = 3.0;

export function leifPages() {
  return [
    { ...LEIF_TALK, text: 'Där är du! Här är nycklarna – nyfilade, de är varma fortfarande.' },
    { ...LEIF_TALK, text: 'Killen heter Samuel. Han säger att de gamla bara försvann från köksbordet, mitt på ljusa dagen. Folk är inte kloka.' },
    { ...YOU, fx: 'keys', text: 'Nej… helt otroligt.' },
    { ...LEIF_TALK, text: `Han väntar vid östra grinden till kolonilotterna på Norrholmen. Han har bråttom – om ${KEY_TIME} sekunder ger han upp och går hem.`, last: 'JAG KÖR!' },
  ];
}

export function samuelPages(left) {
  return [
    { ...SAMUEL, text: left > 30 ? 'Redan? Du kör ju som en galning. Är det nycklarna från Leif?' : 'Äntligen! Jag var på väg hem. Är det nycklarna från Leif?' },
    { ...YOU, fx: 'give', text: 'Varsågod. Nyfilade.' },
    { ...SAMUEL, text: 'Tack! Konstigt det där… de gamla låg på köksbordet, och sen var de bara borta. Jag satt i soffan hela tiden!' },
    { ...YOU, text: 'Mycket märkligt.' },
    { ...SAMUEL, text: 'Och nu är cykeln borta också! Den stod här vid lott 7 i flera månader. Du har inte sett en gammal budcykel?' },
    { ...YOU, text: '…En budcykel? Nej. Aldrig.' },
    { ...SAMUEL, text: 'Typiskt. Nu har jag nycklar till ett lås utan cykel. Nåja – här, för besväret.', last: 'HEJ DÅ' },
  ];
}

function spawn(game, look, at, npc) {
  const ped = new Ped(game, look);
  ped.x = at.x; ped.z = at.z; ped.y = game.world.groundHeight(at.x, at.z);
  ped.h = ped.standH = at.h;
  ped.state = 'stand'; ped.keep = true; ped.npc = npc; ped.speed = 0.9;
  ped.body.x = ped.x; ped.body.y = ped.y; ped.body.z = ped.z; ped.body.h = ped.h;
  game.peds.add(ped);
  return ped;
}

// Lås-Leif stands outside his shop on Skolgatan (from the start)
export function spawnLeif(game) { return spawn(game, LEIF_LOOK, LEIF, 'leif'); }

export class KeysJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'nycklar';
    this.stage = 'talk1';    // talk1 (Leif) → carry → meet → talk2 (Samuel) → done
    this.prompt = null;
    this.left = KEY_TIME;
    this.samuel = null;
    this.titleCard = false;
  }

  get leif() { return this.mgr.leif; }

  start() {
    const g = this.game, m = this.mgr, p = g.player, leif = this.leif;
    p.frozen = true; p.vx = p.vz = 0;
    if (leif) {
      leif.standH = leif.h = Math.atan2(p.x - leif.x, p.z - leif.z);
      p.h = Math.atan2(leif.x - p.x, leif.z - p.z);
      const line = Math.atan2(leif.x - p.x, leif.z - p.z);
      g.camFocus = { x: (p.x + leif.x) / 2, y: 0.35, z: (p.z + leif.z) / 2, yaw: line - 0.6, owner: 'keys', near: true };
    }
    m.setObjective('Lås-Leif', 'Skolgatan');
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: leifPages() }), this);
  }

  talkFx() {}

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'talk1') {
      this.stage = 'carry';
      p.frozen = false;
      if (g.camFocus && g.camFocus.owner === 'keys') g.camFocus = null;
      this.samuel = spawn(g, SAMUEL_LOOK, SAMUEL_WAIT, 'samuel-out');
      g.emit('toast', { text: `Du har Samuels nya nycklar. ${KEY_TIME} sekunder – kör!`, long: true });
      if (this.leif) g.emit('say', { who: this.leif, text: 'Kör försiktigt nu! Eller… kör fort!' });
      return;
    }
    if (this.stage === 'talk2') this.finish();
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    if (this.stage !== 'carry') return;
    this.left -= dt;
    const sam = this.samuel;
    if (this.left <= 0) {
      if (sam) g.emit('say', { who: sam, text: 'Nej, nu går jag hem.' });
      m.fail(this, 'Samuel tröttnade och gick hem', [WHO.leif, 'Samuel ringde och var sur. Kom förbi butiken igen, så gör vi ett nytt försök.']);
      return;
    }
    const car = p.inCar ? p.car : null;
    const d = sam ? Math.hypot(p.x - sam.x, p.z - sam.z) : 1e9;
    m.setObjective('Kör nycklarna till Samuel', `${Math.ceil(this.left)} s · Kolonilotterna på Norrholmen`);
    if (sam && d < 30) sam.standH = Math.atan2(p.x - sam.x, p.z - sam.z);
    if (sam && d < 30 && !this.waved) { this.waved = true; g.emit('say', { who: sam, text: 'Hallå! Har du mina nycklar?' }); }
    if (car && d < 10 && !this.footHint) { this.footHint = true; g.emit('toast', { text: car.spec.bike ? 'Kliv av och ge Samuel nycklarna.' : 'Kliv ur och ge Samuel nycklarna.', long: false }); }
    if (!car && p.state === 'foot' && !p.frozen && d < MEET_R) this.meet();
  }

  meet() {
    const g = this.game, m = this.mgr, p = g.player, sam = this.samuel;
    this.stage = 'talk2';
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(sam.x - p.x, sam.z - p.z);
    sam.standH = sam.h = Math.atan2(p.x - sam.x, p.z - sam.z);
    sam.body.h = sam.h;
    const line = Math.atan2(sam.x - p.x, sam.z - p.z);
    g.camFocus = { x: (p.x + sam.x) / 2, y: 0.35, z: (p.z + sam.z) / 2, yaw: line - 0.6, owner: 'keys', near: true };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: samuelPages(this.left) }), this);
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    g.stats.keysDelivered = Math.ceil(this.left);
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Samuels nya nycklar', amount: KEY_REWARD });
    const sam = this.samuel;
    m.later(1.5, () => { if (sam) g.emit('say', { who: sam, text: 'Var är min cykel…?' }); });
    m.sms(WHO.leif, 'Samuel ringde och tackade. Han undrade om du sett hans cykel – jag sa att du ser ut som en hederlig typ. Ha ha.', 8);
  }

  targets(T) {
    if (this.stage === 'carry' && this.samuel) {
      const s = this.samuel;
      T.push({ kind: 'contact', x: s.x, z: s.z, r: 1, letter: 'S', color: '#6e7a46', badgeOnly: true, badgeY: 2.75, ref: s });
      T.push({ kind: 'zone', x: SAMUEL_WAIT.x, z: SAMUEL_WAIT.z, r: MEET_R, gps: true });
    }
  }

  cleanup() {
    const g = this.game;
    this.prompt = null;
    g.player.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'keys') g.camFocus = null;
    // Samuel stays a little while, then he is gone (when nobody looks)
    const sam = this.samuel;
    if (sam) this.mgr.later(this.stage === 'done' ? 25 : 2, () => {
      const L = g.peds.list, i = L.indexOf(sam);
      if (i >= 0) L.splice(i, 1);
    });
  }
}
