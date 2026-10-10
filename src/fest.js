// Main quest, part 8: "Bullfesten" (v1.0). Dahlgren is caught, and all of Sjuby comes to the square
// to celebrate: a long table of Sjubybullar in front of the konditori, bunting, and Arne's old bike
// with its box full of buns. Then Sander the bike thief – eleven bikes this month – jumps on it and
// rides off with the lot. He leaves his own (stolen) red racing bike behind: take it, or a car, and
// catch him. He keeps to the pavements and rings his bell at people. Knock him off or grab him, then
// catch him on foot when he runs. Polis-Pia does the rest.
import { WHO, FEST, BIKE_RETURN, GUN_BIKE } from './config.js';
import { Ped, makeLook, STYLE_BITS as ST } from './peds.js';
import { LOOK as SAMUEL_LOOK } from './samuel.js';
import { Rider } from './sander.js';
import { circleVs } from './collide.js';

const GUN = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const BENGT = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const SAMUEL = { who: 'Samuel', letter: 'S', color: '#6e7a46' };
const PIA = { who: 'Polis-Pia', letter: 'P', color: '#3b6fd8' };
const SANDER = { who: 'Sander', letter: 'SA', color: '#c0392b' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };

// blond hair under a dark red beanie, the hoodie to match, a yellow T-shirt
export const SANDER_LOOK = { shirt: 0xe5b923, pants: 0x2b2e35, skin: 0xf0c8a8, hair: 0xd9b26b, height: 1.02, bulk: 0.94, style: ST.long | ST.cap | ST.jacket, accent: 0x7a2f2a };
const LOOKS = {
  bengt: { shirt: 0xf2efe6, pants: 0xe2ddd0, skin: 0xe9c3a6, hair: 0x3a2a1a, height: 1.04, bulk: 1.28, style: ST.beard | ST.apron | ST.baker, accent: 0xf8f6f0 },
  yasmin: { shirt: 0x2f8f83, pants: 0x2b2d36, skin: 0xb98a64, hair: 0x1e1612, height: 0.97, bulk: 1.0, style: ST.long | ST.apron, accent: 0x2c62a8 },
  pia: { shirt: 0x2c4a7a, pants: 0x1d2a44, skin: 0xd9a77e, hair: 0x3a2618, height: 1.0, bulk: 1.05, style: ST.bun | ST.cap, accent: 0x1d2a44 },
};
// who stands where at the party (around the table in front of the konditori), facing what
const SPOTS = {
  gun: [-8.3, 13.35, Math.PI], bengt: [-5.6, 13.3, Math.PI], yasmin: [-9.4, 10.5, 0.2], samuel: [-3.6, 10.4, 0.5],
  pia: [2.4, 10.0, -1.9], sander: [0.9, 13.9, -2.3],
  crowd: [[-11.8, 12.6, 1.4], [-12.4, 10.2, 1.2], [-1.4, 9.4, -0.4], [-7.2, 9.9, 0.1], [-10.6, 14.4, 2.5], [0.6, 15.6, -2.8]],
};

// where the camera looks while they talk (fx 'cam:…'): whoever speaks, framed narrow enough for a phone
const SHOTS = {
  gun: { x: -6.95, y: 1.1, z: 13.0, yaw: 0 },        // Gun and Bengt behind the table, over your shoulder
  samuel: { x: -3.6, y: 1.2, z: 10.6, yaw: -2.64 },  // Samuel's face, from the konditori side (you behind him)
  pia: { x: 2.0, y: 1.2, z: 10.2, yaw: 1.24 },       // Polis-Pia, over your shoulder
  steal: { x: -0.9, y: 1.0, z: 12.2, yaw: 0.5 },     // Sander on Arne's bike
  red: { x: -3.3, y: 0.8, z: 7.4, yaw: 1.9 },        // the red racing bike he left behind, and you
};
export function partyPages() {
  return [
    { ...GUN, fx: 'cam:gun', text: 'Där är du ju, lilla vän! Välkommen till Bullfesten. Hela Sjuby är här – och varenda bulle är bakad efter Arnes recept.' },
    { ...BENGT, text: 'Mina första bullar som lärling. Tant Gun säger att de är nästan lika goda som Arnes.' },
    { ...GUN, text: 'NÄSTAN, sa jag. Och se – Arnes gamla cykel får köra ut dem, med lådan full.' },
    { ...SAMUEL, fx: 'cam:samuel', text: 'Min cykel. Arnes, menar jag. Den är typ kändis nu.' },
    { ...PIA, fx: 'cam:pia', text: 'Håll ett öga på den, Samuel. Vi har en cykeltjuv i stan – Sander heter han. Elva cyklar på en månad.' },
    { ...YOU, text: 'Mitt på festen? Knappast.' },
    { ...SANDER, fx: 'steal', text: 'Tack för bullarna!' },
    { ...GUN, text: 'ARNES CYKEL! Och alla bullarna!' },
    { ...SAMUEL, fx: 'cam:red', text: 'Han lämnade sin egen cykel – den röda där! Ta den och kör ikapp honom!', last: 'EFTER HONOM!' },
  ];
}
// (after a miss: he comes back for more)
export function againPages() {
  return [
    { ...PIA, fx: 'cam:pia', text: 'Han är tillbaka! Sander kan inte låta bli bullarna.' },
    { ...SANDER, fx: 'steal', text: 'Tack för påfyllningen!' },
    { ...YOU, fx: 'cam:red', text: 'Den här gången kommer du inte undan.', last: 'EFTER HONOM!' },
  ];
}
export function caughtPages() {
  return [
    { ...SANDER, text: 'Aj, aj, aj… Okej, okej! Jag ger mig!' },
    { ...YOU, text: 'Arnes cykel. Och festbullarna.' },
    { ...SANDER, text: 'Jag åt bara tre! Kanske fyra. De var sjukt goda, alltså.' },
    { ...PIA, fx: 'pia', text: 'Sander. Elva cyklar på en månad – och nu en budcykel full med bullar. Var är de andra?' },
    { ...SANDER, text: '…I gamla båthuset vid hamnen. Jag skulle laga dem och sälja dem. Typ.' },
    { ...PIA, text: 'Du ska få laga dem – och lämna tillbaka varenda en. Fias cykelsadel också.' },
    { ...PIA, text: 'Bra jobbat. Kom förbi stationen sedan – det blir en hel del cyklar att lämna tillbaka.', last: 'TACK!' },
  ];
}

function spawnPed(game, look, x, z, h, npc) {
  const ped = new Ped(game, look);
  ped.x = x; ped.z = z; ped.y = game.world.groundHeight(x, z);
  ped.h = ped.standH = h; ped.state = 'stand'; ped.keep = true; ped.npc = npc;
  ped.body.x = ped.x; ped.body.y = ped.y; ped.body.z = ped.z; ped.body.h = ped.h;
  game.peds.add(ped);
  return ped;
}
function removePed(game, ped) { if (!ped) return; const L = game.peds.list, i = L.indexOf(ped); if (i >= 0) L.splice(i, 1); }
function stand(ped, x, z, h) {
  const g = ped.game;
  ped.x = x; ped.z = z; ped.y = g.world.groundHeight(x, z); ped.vx = ped.vz = 0;
  ped.h = ped.standH = h; ped.state = 'stand';
  const b = ped.body; b.pose = 0; b.roll = 0; b.lie = 0; b.legAmp = b.armAmp = 0;
  b.x = ped.x; b.y = ped.y; b.z = ped.z; b.h = ped.h;
}

// The party on the square: up as soon as Gun has texted (when you are not looking), until the
// quest is done (and you have left). Gun is there (her own ped, moved), Bengt, Samuel, Yasmin,
// Polis-Pia, a few others, Sander in the crowd, Arne's bike with the buns and the red racer.
export class FestParty {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game;
    this.up = false;
    this.people = []; this.sander = null;
    this.table = mgr.game.layout.colliders.find((c) => c.fest) || null; // the table's collider (up with the party)
  }

  get wanted() { const m = this.mgr; return m.known.has('bullfest') && !m.done.has('bullfest'); }

  hidden() {
    const g = this.game, p = g.player, d = Math.hypot(p.x - FEST.mark.x, p.z - FEST.mark.z);
    return g.indoor || d > 75 || (d > 35 && !g.visible(FEST.mark.x, FEST.mark.z));
  }

  update() {
    const m = this.mgr;
    if (!this.up) { if (this.wanted && this.hidden()) this.setup(); return; }
    if (!this.wanted && !(m.active && m.active.id === 'bullfest') && this.hidden()) this.teardown();
  }

  setup() {
    const g = this.game, m = this.mgr, flag = m.flag, gun = flag.gun;
    this.up = true; g.festUp = true;
    if (this.table) this.table.h = this.table.hUp;
    // tant Gun behind the table, staying put (and quiet) while the party lasts
    flag.pinned = true; flag.hush = true;
    gun.away = true; gun.konditori = true; gun.disguised = false;
    stand(gun, ...SPOTS.gun);
    this.people = [
      spawnPed(g, LOOKS.bengt, ...SPOTS.bengt, 'bengt-out'),
      spawnPed(g, LOOKS.yasmin, ...SPOTS.yasmin, 'yasmin-out'),
      spawnPed(g, SAMUEL_LOOK, ...SPOTS.samuel, 'samuel-out'),
      spawnPed(g, LOOKS.pia, ...SPOTS.pia, 'pia'),
      ...SPOTS.crowd.map(([x, z, h]) => spawnPed(g, makeLook(g.rng), x, z, h, 'fest')),
    ];
    this.pia = this.people[3];
    this.sander = spawnPed(g, SANDER_LOOK, ...SPOTS.sander, 'sander');
    this.placeBikes();
  }

  // Arne's bike at the end of the table with its box of buns (unless you are on it), the red racer by the square
  placeBikes() {
    const g = this.game, p = g.player;
    const riding = p.inCar && p.car === g.bike;
    if (!riding) { const b = g.spawnBike(FEST.bike.x, FEST.bike.z, FEST.bike.h, false); if (b) b.buns = true; }
    if (!(p.inCar && p.car === g.redBike)) g.spawnRedBike(FEST.racer.x, FEST.racer.z, FEST.racer.h);
  }

  // after a miss: Sander back in the crowd, the bikes back in their places
  reset() {
    if (!this.up) { this.setup(); return; }
    const g = this.game;
    if (!this.sander || !g.peds.list.includes(this.sander)) this.sander = spawnPed(g, SANDER_LOOK, ...SPOTS.sander, 'sander');
    stand(this.sander, ...SPOTS.sander);
    this.placeBikes();
  }

  teardown() {
    const g = this.game, m = this.mgr, flag = m.flag;
    this.up = false; g.festUp = false;
    if (this.table) this.table.h = 0;
    for (const q of this.people) removePed(g, q);
    removePed(g, this.sander);
    this.people = []; this.sander = null; this.pia = null;
    flag.pinned = false; flag.hush = false;
    if (g.bike) g.bike.buns = false;
  }
}

export class FestJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'bullfest';
    this.stage = 'arrive';   // arrive → party (talk) → chase (on the bike) → run (on foot) → caught (talk) → done
    this.prompt = null;
    this.rider = null; this.farT = 0; this.grabT = 0; this.safeT = 0;
    this.titleCard = true;
  }

  get party() { return this.mgr.party; }
  get sander() { return this.party.sander; }

  start() {
    const g = this.game, m = this.mgr;
    // behind a moment of black: the party is in full swing, you at the near end of the table
    g.emit('fade', { on: true });
    m.later(0.5, () => {
      const P = this.party;
      P.reset();
      const p = g.player;
      if (p.inCar) p.exitCar();
      p.x = FEST.mark.x; p.z = FEST.mark.z; p.y = g.world.groundHeight(p.x, p.z); p.vx = p.vz = 0; p.h = 0.15;
      p.frozen = true;
      const again = !!m.flags.festTalked;
      m.flags.festTalked = true;
      g.camFocus = { ...(again ? SHOTS.pia : SHOTS.gun), owner: 'fest', near: true };
      this.stage = 'party';
      m.later(again ? 0.6 : 1.0, () => g.emit('talk', { id: this.id, pages: again ? againPages() : partyPages() }), this);
    }, this);
    m.later(0.85, () => g.emit('fade', { on: false }), this);
  }

  // Sander jumps on Arne's bike (the dialogue is still open: the game waits, so he just sits there)
  talkFx(fx) {
    const g = this.game;
    if (fx.startsWith('cam:')) { const s = SHOTS[fx.slice(4)]; if (s) g.camFocus = { ...s, owner: 'fest', near: true }; return; }
    if (fx === 'steal') {
      const bike = g.bike, S = this.sander;
      if (!bike || !S) return;
      bike.x = FEST.bike.x; bike.z = FEST.bike.z; bike.h = FEST.bike.h; bike.vx = bike.vz = bike.w = 0; bike.fallen = false;
      bike.y = g.world.groundHeight(bike.x, bike.z);
      this.rider = new Rider(g, bike, S, { exit: FEST.exit, vMax: FEST.vMax, slow: FEST.slow, corner: FEST.corner });
      this.rider.on = false;
      this.rider.pose(0);
      g.camFocus = { ...SHOTS.steal, owner: 'fest', near: true };
      g.emit('horn', { on: true, car: bike }); g.emit('horn', { on: false, car: bike });
    } else if (fx === 'pia') {
      // Polis-Pia arrives (she was right behind you all along) and takes Sander by the arm: a free
      // spot beside him (not inside a wall), the one most in the picture; the camera takes in all three
      const p = g.player, S = this.sander;
      const pia = this.party.pia && g.peds.list.includes(this.party.pia) ? this.party.pia : spawnPed(g, LOOKS.pia, p.x, p.z, 0, 'pia');
      this.party.pia = pia;
      const sx = S.x - p.x, sz = S.z - p.z, d = Math.hypot(sx, sz) || 1, ux = sx / d, uz = sz / d;
      const F = g.camFocus, yaw = F && F.yaw != null ? F.yaw : Math.atan2(ux, uz) - 0.6;
      const rx = -Math.cos(yaw), rz = Math.sin(yaw); // the camera's right (for a forward of (sin yaw, cos yaw))
      const mx = (p.x + S.x) / 2, mz = (p.z + S.z) / 2;
      const free = (x, z) => !g.world.query(x, z, 0.4).some((c) => c.h > 0.5 && circleVs(c, x, z, 0.4));
      const spots = [[-uz, ux], [uz, -ux]].flatMap(([nx, nz]) => [[S.x + nx * 1.0 + ux * 0.2, S.z + nz * 1.0 + uz * 0.2], [p.x + nx * 1.3, p.z + nz * 1.3]]);
      spots.push([S.x + ux * 1.2, S.z + uz * 1.2], [p.x - ux * 1.4, p.z - uz * 1.4]);
      let best = spots[0], bs = Infinity;
      for (const [x, z] of spots) {
        const sc = (free(x, z) ? 0 : 100) + Math.abs((x - mx) * rx + (z - mz) * rz);
        if (sc < bs) { bs = sc; best = [x, z]; }
      }
      stand(pia, best[0], best[1], Math.atan2(S.x - best[0], S.z - best[1]));
      if (F && F.owner === 'fest') g.camFocus = { ...F, x: (p.x + S.x + best[0]) / 3, z: (p.z + S.z + best[1]) / 3 };
    }
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'party') {
      this.stage = 'chase';
      p.frozen = false;
      if (g.camFocus && g.camFocus.owner === 'fest') g.camFocus = null;
      if (!this.rider) this.talkFx('steal');
      this.rider.on = true;
      g.racers.push(this.rider);
      this.safeT = 1.0;
      g.emit('toast', { text: 'Sander snodde Arnes cykel! Ta den röda cykeln – eller en bil – och ta fast honom.', long: true });
      m.later(1.2, () => g.emit('hint', { id: 'sander', touch: 'Kör ikapp Sander och knuffa omkull honom – eller ta tag i honom när du är tätt bakom.', keys: 'Kör ikapp Sander och knuffa omkull honom – eller ta tag i honom när du är tätt bakom.' }), this);
      return;
    }
    if (this.stage === 'caught') this.finish();
  }

  you() { const p = this.game.player; return p.inCar ? p.car : p; }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    const S = this.sander;
    if (this.stage === 'chase') {
      const r = this.rider, bike = r && r.bike;
      if (!bike || bike.removed || !S) { m.fail(this, 'Sander försvann'); return; }
      r.pose(dt);
      if (this.safeT > 0) this.safeT -= dt;
      const Y = this.you(), d = Math.hypot(Y.x - bike.x, Y.z - bike.z);
      // close enough: you knock him off (in a car) or grab his hood (on foot or on a bike)
      const car = p.inCar ? p.car : null;
      const reach = car && !car.spec.bike ? 2.6 : car ? 1.8 : 1.45;
      this.grabT = d < reach && this.safeT <= 0 ? this.grabT + dt : 0;
      if (this.grabT > 0.2) { this.knockOff(car && !car.spec.bike ? 'bump' : 'grab'); return; }
      this.farT = d > FEST.lose ? this.farT + dt : 0;
      if (this.farT > FEST.loseT) { this.lost('Sander kom undan'); return; }
      m.setObjective('Ta fast Sander', d > FEST.lose * 0.75 ? `${Math.round(d)} m – han kommer undan!` : `${Math.round(d)} m bort · knuffa omkull honom`);
      return;
    }
    if (this.stage === 'run') {
      if (!S) { m.fail(this, 'Sander försvann'); return; }
      const Y = this.you(), d = Math.hypot(Y.x - S.x, Y.z - S.z);
      const onFoot = p.state === 'foot' && !p.frozen;
      // up again: he runs, away from you
      if (S.state !== 'down' && S.state !== 'getup') {
        if (S.state !== 'flee' || this.fleeT <= 0) { S.flee(Y.x, Y.z, 99); S.fleeSpeed = 4.7; this.fleeT = 0.25; }
        else { this.fleeT -= dt; S.fleeFrom.x = Y.x; S.fleeFrom.z = Y.z; }
      }
      const down = S.state === 'down' || S.state === 'getup';
      if (onFoot && d < (down ? 1.8 : 1.15)) { this.tackle(); return; }
      if (p.inCar && d < 6 && !this.outHint) { this.outHint = true; g.emit('toast', { text: p.car.spec.bike ? 'Kliv av och ta fast honom!' : 'Kliv ur och ta fast honom!', long: false }); }
      this.farT = d > FEST.runLose ? this.farT + dt : 0;
      if (this.farT > FEST.runLoseT) { this.lost('Sander sprang sin väg'); return; }
      m.setObjective('Ta fast Sander', down ? 'Han ligger ner – spring fram!' : `Han springer! ${Math.round(d)} m`);
    }
  }

  // knocked into by another car (Sjuby's traffic helps, too)
  onCrash(e) {
    if (this.stage !== 'chase' || !this.rider || this.safeT > 0) return;
    const bike = this.rider.bike;
    if (e.car !== bike && e.other !== bike) return;
    const other = e.car === bike ? e.other : e.car;
    if (!other || e.impact < 1.5) return;
    this.knockOff(other === this.game.player.car ? 'bump' : 'traffic');
  }

  // off the bike: he tumbles, the bike falls over, the buns go everywhere
  knockOff(how) {
    const g = this.game, m = this.mgr, r = this.rider, bike = r.bike;
    const i = g.racers.indexOf(r);
    if (i >= 0) g.racers.splice(i, 1);
    r.fall(bike.vx * 0.5 + Math.cos(bike.h) * 1.2, bike.vz * 0.5 - Math.sin(bike.h) * 1.2);
    if (bike.buns) { bike.buns = false; g.emit('buns', { x: bike.x, z: bike.z }); } // all over the pavement
    this.stage = 'run';
    this.farT = 0; this.fleeT = 0;
    g.emit('caught', {});
    g.emit('say', { who: this.sander, text: how === 'traffic' ? 'Aaaj! Vem kör så där?!' : how === 'bump' ? 'Hallå! Aj!' : 'Släpp min luva!' });
    g.emit('toast', { text: how === 'traffic' ? 'Sander krockade med en bil! Ta fast honom!' : 'Sander ramlade av cykeln! Ta fast honom innan han springer iväg!', long: true });
    m.later(0.8, () => g.emit('hint', { id: 'tackle', touch: 'Spring ikapp Sander – du är snabbare än han till fots.', keys: 'Spring ikapp Sander (håll Shift) – du är snabbare än han till fots.' }), this);
    g.stats.sanderHow = how;
  }

  // caught on foot: Pia comes, the bikes come back
  tackle() {
    const g = this.game, m = this.mgr, p = g.player, S = this.sander;
    this.stage = 'caught';
    p.frozen = true; p.vx = p.vz = 0;
    S.state = 'stand'; S.vx = S.vz = 0;
    S.standH = S.h = Math.atan2(p.x - S.x, p.z - S.z);
    S.body.h = S.h; S.body.lie = 0; S.body.pose = 0;
    p.h = Math.atan2(S.x - p.x, S.z - p.z);
    const line = Math.atan2(S.x - p.x, S.z - p.z);
    g.camFocus = { x: (p.x + S.x) / 2, y: 0.4, z: (p.z + S.z) / 2, yaw: line - 0.6, owner: 'fest', near: true };
    g.emit('caught', {});
    m.later(0.7, () => g.emit('talk', { id: this.id, pages: caughtPages() }), this);
  }

  lost(reason) {
    const g = this.game, m = this.mgr, r = this.rider;
    if (r) { r.on = false; const i = g.racers.indexOf(r); if (i >= 0) g.racers.splice(i, 1); }
    m.fail(this, reason, [WHO.pia, 'Han kom undan – men han har synts vid torget igen. Han kan inte låta bli bullarna! Gå tillbaka till festen.']);
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    g.stats.sanderCaught = true;
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Bullfesten', amount: FEST.reward });
    m.later(4, () => g.emit('toast', { text: 'Bengt bakar en ny sats. Festen fortsätter!', long: true }));
    m.sms(WHO.gun, 'Festen är räddad! Bengt bakade en ny sats på nolltid, och Arnes cykel är tillbaka. Tack, lilla vän – och ta en bulle till!', 8.5);
  }

  targets(T) {
    if (this.stage === 'chase' && this.rider) T.push({ kind: 'racer', car: this.rider.bike, color: 0xff3b2f, gps: true });
    else if (this.stage === 'run' && this.sander) T.push({ kind: 'contact', x: this.sander.x, z: this.sander.z, r: 1, letter: 'S', color: '#c0392b', badgeOnly: true, badgeY: 2.4, ref: this.sander, gps: true });
  }

  cleanup() {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'fest') g.camFocus = null;
    const r = this.rider;
    if (r) {
      r.on = false;
      const i = g.racers.indexOf(r);
      if (i >= 0) g.racers.splice(i, 1);
      const bike = r.bike;
      if (bike && !bike.removed && bike.driver === 'racer') { bike.driver = null; bike.locked = false; bike.input.throttle = 0; bike.input.park = true; }
      if (bike && !bike.removed) { bike.fallen = false; bike.buns = false; bike.locked = false; bike.parkedSpot = true; }
    }
    const S = this.sander;
    if (this.stage === 'done') {
      // Pia walks Sander off to the station, away from you – gone once nobody is looking – and
      // Arne's bike goes back where it lives (the party winds down when you have left)
      const pia = this.party.pia, pair = [S, pia].filter((q) => q && g.peds.list.includes(q));
      const ax = S ? S.x - p.x : 1, az = S ? S.z - p.z : 0, ad = Math.hypot(ax, az) || 1;
      m.later(1.2, () => pair.forEach((q, k) => q.goto([[q.x + (ax / ad) * 14 + k * 0.8, q.z + (az / ad) * 14]], 1.25)));
      const gone = () => {
        let left = false;
        for (const q of pair) {
          if (!g.peds.list.includes(q)) continue;
          if (Math.hypot(q.x - g.player.x, q.z - g.player.z) < 70 && (g.visible(q.x, q.z) || Math.hypot(q.x - g.player.x, q.z - g.player.z) < 30)) { left = true; continue; }
          removePed(g, q);
        }
        if (left) m.later(2, gone);
        else if (this.party.sander === S) this.party.sander = null;
      };
      m.later(8, gone);
      const home = () => {
        const b = g.bike, P = g.player;
        if (!b || b.removed) return;
        if ((P.inCar && P.car === b) || Math.hypot(b.x - P.x, b.z - P.z) < 70 || g.visible(b.x, b.z)) { m.later(3, home); return; }
        if (m.done.has('cykelretur')) g.spawnBike(BIKE_RETURN.x - 1.4, BIKE_RETURN.z + 0.4, Math.PI / 2, false); // by the tower, with Samuel
        else g.spawnBike(GUN_BIKE.x, GUN_BIKE.z, GUN_BIKE.h, false); // by Gun's gate
      };
      m.later(10, home);
    } else if (S) {
      // a miss: Sander back at the party, the bikes in their places (when you are not looking)
      if (S.state === 'ride') stand(S, S.x, S.z, S.h);
      const back = () => {
        if (this.mgr.active && this.mgr.active.id === 'bullfest') return;
        if (!this.party.hidden()) { m.later(2, back); return; }
        this.party.reset();
      };
      m.later(3, back);
    }
  }
}
