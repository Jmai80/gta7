// A ride on the Ferris wheel at Tivoli Lyckoland (v1.6). Not a quest: walk up the ramp to the
// boarding platform, press ÅK (20 kr), get into the next gondola that comes down and go round once,
// with the town below you. Plus Kim's text about the new tivoli, and a welcome at the gate.
import { WHEEL, SOUTH, gondolaPivot, nextGondola, wheelAngle, inTivoli } from './southisle.js';
import { WHO } from './config.js';

export const WHEEL_FARE = 20;

export class Rides {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game;
    this.stage = null;     // null → wait (the gondola is on its way down) → ride → null
    this.k = 0; this.at = 0; this.t0 = 0; this.top = false;
    this.prompt = null;
  }

  get busy() { return !!this.stage; }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    // Kim tells you about the tivoli (once, when you are not busy)
    if (!g.stats.tivoliNews && m.done.has('lasse') && !m.active && !g.indoor && m.outT > 6 && m.t > 25) {
      g.stats.tivoliNews = 1;
      m.sms(WHO.kim, 'Har du sett? Det har öppnat ett tivoli på Söderholmen – ön söder om stan! Kör Kungsgatan söderut över nya bron. Åk pariserhjulet, utsikten är sjuk.');
    }
    // the first time you walk in under the arch
    if (!g.stats.tivoliVisit && p.state === 'foot' && inTivoli(p.x, p.z) && p.z > SOUTH.gate.z + 1.5) {
      g.stats.tivoliVisit = 1;
      g.emit('toast', { text: `Välkommen till Tivoli Lyckoland! Pariserhjulet kostar ${WHEEL_FARE} kr.` });
    }
    this.prompt = null;
    if (this.stage === 'wait') {
      if (g.time >= this.at) this.board();
      return;
    }
    if (this.stage === 'ride') {
      this.seat();
      const a = wheelAngle(g.time) + (this.k / WHEEL.n) * Math.PI * 2;
      if (!this.top && Math.cos(a) < -0.98) { this.top = true; g.emit('toast', { text: 'Vilken utsikt! Där ligger hela Sjuby – och Norrholmen längst bort.' }); }
      if (g.time - this.t0 >= WHEEL.period) this.leave();
      return;
    }
    if (!m.active && p.state === 'foot' && !p.frozen && Math.hypot(p.x - WHEEL.board.x, p.z - WHEEL.board.z) < 1.5) this.prompt = 'ÅK HJULET';
  }

  interact() {
    if (this.prompt !== 'ÅK HJULET') return false;
    const g = this.game, p = g.player;
    if (g.money < WHEEL_FARE) { g.emit('toast', { text: `Ett varv kostar ${WHEEL_FARE} kr – du har inte råd.` }); return true; }
    g.money -= WHEEL_FARE;
    g.emit('money', { delta: -WHEEL_FARE, total: g.money });
    // the next gondola down that has nobody in it (every fourth carries two people already)
    let next = nextGondola(g.time);
    while (next.k % 4 === 2) next = nextGondola(next.at + 0.01);
    this.k = next.k; this.at = next.at;
    this.stage = 'wait'; this.prompt = null;
    p.frozen = true; p.vx = p.vz = 0; p.h = Math.PI;
    g.emit('toast', { text: `−${WHEEL_FARE} kr. Gondolen kommer!` });
    return true;
  }

  // into the gondola: sit on its south bench facing north, out over the town
  board() {
    const g = this.game, p = g.player;
    this.stage = 'ride'; this.t0 = this.at; this.top = false;
    p.state = 'ride'; p.frozen = true; p.rideYaw = Math.PI;
    this.seat();
    g.stats.wheelRides = (g.stats.wheelRides || 0) + 1;
    g.emit('ride', { on: true });
  }

  seat() {
    const p = this.game.player, q = gondolaPivot(this.k, this.game.time);
    p.x = q.x; p.z = q.z + 0.42; p.h = Math.PI;
    p.rideHip = q.y - WHEEL.hang + 0.46;
    p.y = p.rideHip - 0.45;
    p.vx = p.vz = 0;
  }

  leave() {
    const g = this.game, p = g.player;
    this.stage = null;
    p.state = 'foot'; p.stateT = 0; p.frozen = false;
    p.x = WHEEL.exit.x; p.z = WHEEL.exit.z; p.y = g.world.groundHeight(p.x, p.z); p.h = 0;
    g.emit('ride', { on: false });
    g.emit('toast', { text: 'Tack för åkturen! Välkommen åter till Lyckoland.' });
    g.emit('progress', {});
  }
}
