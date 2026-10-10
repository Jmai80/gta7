// Kim's long jump (v1.1.1). Until now the K on the parking lot was only a marker: walking into it did
// nothing, and from where it stood even a flat-out run fell short without the turbo. Now the K stands
// at the far (north) end of the lot across Kungsgatan from Hörnlivs and starts a run when you drive
// into it: straight south through a ring over Skolgatan, in through the construction site's gate and
// up the ramp, through the white ring. On foot or on a bike the K says you need a car.
//
// Missions.onStunt() pays and finishes the quest for any jump of JUMP_GOAL metres (with or without this
// run) and tells the job how it went. A shorter jump, or a run past the ramp, sends you back to the K
// for another go; out of the car for a while, or far away, and the run is off (no failure: the K is
// there again a moment later).
import { JUMP_GOAL } from './config.js';

const NEED_KMH = 100;   // about what it takes at the lip for JUMP_GOAL metres (test/missions.mjs, section 17)
const OFF_T = 5;        // seconds out of the car before the run is off
const FAR = 200;        // metres from the run-up before the run is off

export class LongJumpJob {
  constructor(mgr, q) {
    this.mgr = mgr; this.game = mgr.game; this.id = q.id; this.q = q;
    const S = this.game.layout.zones.stunt, k = S.kick;
    this.x = (k.x0 + k.x1) / 2;          // the ramp's middle line (x −70), the K is on it too
    this.lip = k.z1;                     // the top edge of the ramp (z 66)
    this.rings = [{ z: 40 }, { z: k.z1 + 5, finish: true }]; // over Skolgatan, just past the lip
    this.mid = { x: this.x, z: (q.z + k.z1) / 2 };
    this.stage = 'run';                  // run → (back → run …) → done
    this.flew = false; this.groundT = 0; this.offT = 0; this.tries = 0;
  }

  start() {
    const g = this.game, m = this.mgr;
    this.go();
    m.later(0.9, () => g.emit('hint', {
      id: 'longjump',
      touch: `Gasa rakt söderut: genom ringen över Skolgatan, in genom grinden och upp på hoppet. Kim vill se minst ${JUMP_GOAL} meter.`,
      keys: `Gasa (W) rakt söderut: genom ringen över Skolgatan, in genom grinden och upp på hoppet. Kim vill se minst ${JUMP_GOAL} meter.`,
    }), this);
  }

  // a new attempt from the K
  go() {
    this.stage = 'run'; this.flew = false; this.groundT = 0; this.tries++;
    this.mgr.setObjective(`Hoppa minst ${JUMP_GOAL} m`, `Rakt söderut upp på hoppet · cirka ${NEED_KMH} km/h`); // (short: the phone's box)
    if (this.tries > 1) this.game.emit('toast', { text: 'Nytt försök – gasa hela vägen!' });
  }

  // back to the K: the jump was too short, or the ramp was missed
  back(why) {
    this.stage = 'back';
    this.mgr.setObjective('Kör tillbaka till K:et', why);
  }

  // Missions.onStunt(): the car has landed after a jump that counts as a stunt
  landed(e, ok) {
    if (ok) {
      this.stage = 'done';
      this.mgr.setObjective(`${e.dist} meter!`, 'Kim är imponerad');
    } else {
      this.back(`${e.dist} m – Kim vill se ${JUMP_GOAL}. Gasa hela vägen!`);
    }
  }

  update(dt) {
    const p = this.game.player, q = this.q;
    const car = p.inCar && !p.car.spec.bike && !p.car.dead ? p.car : null;
    if (this.stage === 'done') return; // Missions.onStunt finishes it in a moment
    // out of the car for a while, or driven far away: the run is off
    if (!car) {
      if ((this.offT += dt) > OFF_T) this.off('Långhoppet avbrutet. Kör in i K:et med en bil när du vill försöka igen.');
      return;
    }
    this.offT = 0;
    if (Math.hypot(car.x - this.mid.x, car.z - this.mid.z) > FAR) { this.off('Långhoppet avbrutet – K:et finns kvar på parkeringen.'); return; }
    if (this.stage === 'run') {
      // off the ramp: high in the air (a hop off a kerb on the way does not count)
      if (car.air && car.y > 1.2) { this.flew = true; this.groundT = 0; }
      else if (car.air) this.groundT = 0;
      else if (this.flew) {
        // down again without a jump that counted (Missions.onStunt changes the stage when one does)
        if ((this.groundT += dt) > 2.5) this.back('För kort hopp – gasa hela vägen från K:et');
      } else if (car.z > this.lip + 6 && Math.abs(car.x - this.x) < 30) {
        this.back('Du missade hoppet – sikta rakt söderut');
      }
    } else if (this.stage === 'back') {
      if (Math.hypot(car.x - q.x, car.z - q.z) < q.r) this.go();
    }
  }

  off(text) {
    this.game.emit('toast', { text, long: true });
    this.mgr.quit(this);
  }

  targets(T) {
    const q = this.q;
    if (this.stage === 'run') {
      for (const r of this.rings) T.push({ kind: 'ring', x: this.x, z: r.z, h: 0, finish: !!r.finish });
    } else if (this.stage === 'back') {
      T.push({ kind: 'contact', x: q.x, z: q.z, r: q.r, letter: q.letter, color: q.color, gps: true });
    }
  }

  cleanup() { this.mgr.cancel(this); }
}
