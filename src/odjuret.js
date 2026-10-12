// Side quest "Odjurets bild" (v1.14), from Nova (Kim's little sister, 13). Her school project is "Myter i Sjuby",
// and her teacher says Sjubyodjuret – the humps in the harbour (the secret from v1.8) – is made up. Nova needs
// a PHOTO. Her mum's old camera has twelve pictures left, and Nova is scared of deep water, so she waits on
// the quay while you go out to the end of the pier.
//   SIKTA at the end of the pier: a fixed view out over the harbour through the viewfinder. Things surface out
//   there – sometimes the monster's head and humps, sometimes just an old log – and sink again. FOTA when the
//   monster is all the way up: three good pictures. A half-sunk monster is "suddig", a log is a log. Run out of
//   film and Nova has another roll (it costs you nothing but time).
//   Then back to Nova on the quay with the camera.
// While you look through the viewfinder the job drives the monster (game.monsterPose; render.js draws it).
// Pure simulation, its own hash numbers – never the game's random numbers.
import { WHO, PIER, HOMECOMING } from './config.js';
import { spawnPed, removePed } from './hideout.js';
import { NOVA_LOOK } from './concert.js';
import { hidden } from './skattjakt.js';
import { fmt } from './rng.js';

export const ODJUR = {
  mark: { x: HOMECOMING.mark.x, z: HOMECOMING.mark.z, r: 1.8 },      // the quay at the foot of the pier
  nova: { x: -73.5, z: -142.8, h: Math.PI + 0.5 },
  end: { x: PIER.x, z: PIER.z0 + 1.4, r: 2.2 },                       // stand at the end of the pier (by the bench) and SIKTA
  stand: { x: PIER.x, z: PIER.z0 + 1.6 },                             // (behind the camera)
  cam: { x: PIER.x, y: 2.25, z: PIER.z0 + 0.7, fov: 58 },
  look: { x: PIER.x + 0.5, y: 0.6, z: PIER.z0 - 26 },
  film: 12, need: 3,
  good: 0.8,             // how far up the monster must be for a sharp picture
  rise: 0.45, sink: 0.5, // seconds
  pay: { base: 600, film: 25 },
};
export const ODJUR_MAX = ODJUR.pay.base + (ODJUR.film - ODJUR.need) * ODJUR.pay.film;

// a little hash so the surfacings are the same every time (and never touch g.rng)
const hash = (k, s = 1) => { const x = Math.sin(k * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
// surfacing number k: what comes up where, after how long a wait, and for how long it stays up
export function surfacing(k) {
  const odjur = k < 2 || k === 3 || hash(k, 2) > 0.34;
  const dz = 24 + hash(k, 3) * 10;                              // metres out from the camera
  const x = ODJUR.cam.x + 0.4 + (hash(k, 4) - 0.5) * 0.28 * dz;
  return {
    kind: odjur ? 'odjur' : 'stock', x, z: ODJUR.cam.z - dz,
    wait: k === 0 ? 2.2 : 1.6 + hash(k, 5) * 2.2,
    hold: odjur ? Math.max(0.9, 1.7 - k * 0.07) : 1.6,
    h: (hash(k, 6) - 0.5) * 1.0,                                 // (roughly facing the camera: head first, humps behind)
  };
}
export function upAt(S, t) {
  const R = ODJUR.rise, D = ODJUR.sink;
  if (t < 0) return 0;
  if (t < R) { const k = t / R; return k * k * (3 - 2 * k); }
  if (t < R + S.hold) return 1;
  if (t < R + S.hold + D) { const k = (t - R - S.hold) / D; return 1 - k * k * (3 - 2 * k); }
  return 0;
}

const NOVA = { who: 'Nova', letter: 'N', color: '#b36cff' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };

export function introPages(knew) {
  return [
    { ...NOVA, text: 'du kom!! okej. lyssna. vi har skolarbete om myter i sjuby och fröken säger att sjubyodjuret är PÅHITTAT.' },
    { ...NOVA, text: knew ? 'men du har ju sett det?? Kim sa det. du har SETT det.' : 'men alla vet att det finns. morfars kompis såg det 1987. typ.' },
    { ...YOU, text: knew ? 'Jag såg något. Pucklar. Ett huvud. Längst ut på bryggan.' : 'Och du vill att jag ska fota det?' },
    { ...NOVA, text: 'mammas gamla kamera. tolv bilder kvar. jag behöver tre BRA. inte suddiga. fröken säger att alla odjursbilder är suddiga.' },
    { ...NOVA, text: 'det kommer bara upp för den som står längst ut och väntar. och jag är rädd för djupt vatten. så … jag väntar här.', fx: 'camera', last: 'GE MIG KAMERAN' },
  ];
}
export function showPages(film, refills, amount) {
  const P = [
    { ...NOVA, text: 'visa visa visa' },
    { ...NOVA, text: 'bild ett: pucklar. bild två: ett HUVUD. bild tre …' },
    { ...NOVA, text: 'den TITTAR in i kameran. den tittar på MIG.' },
    { ...NOVA, text: 'fröken kommer att dö. på riktigt. okej inte på riktigt.' },
  ];
  if (refills) P.push({ ...NOVA, text: `${refills === 1 ? 'en hel extra rulle' : `${refills} extra rullar`}, förresten. vad har du fotat, vattnet?` });
  else if (film >= 6) P.push({ ...NOVA, text: `och du har ${film} bilder kvar! då kan jag fota Kimchi.` });
  P.push({ ...NOVA, text: `här. ${fmt(amount)} kr från min konsertbudget. det var värt det.`, last: 'LYCKA TILL I SKOLAN' });
  return P;
}

export function odjurWorld(mgr) {
  const g = mgr.game, O = ODJUR;
  const open = mgr.isOpen('odjuret'), job = mgr.active && mgr.active.id === 'odjuret' ? mgr.active : null;
  const N = mgr.odjurNova, alive = N && g.peds.list.includes(N);
  if (open && !alive && !g.indoor && hidden(g, O.nova.x, O.nova.z)) mgr.odjurNova = spawnPed(g, { ...NOVA_LOOK }, O.nova.x, O.nova.z, O.nova.h, 'nova');
  if (!open && alive && !job && hidden(g, N.x, N.z)) { removePed(g, N); mgr.odjurNova = null; }
}

export class MonsterJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'odjuret';
    this.stage = 'intro';     // intro → pier → shoot → back → show → done
    this.prompt = null;
    this.film = ODJUR.film; this.good = 0; this.shots = 0; this.refills = 0;
    this.k = 0; this.surf = null; this.surfT = 0;
    this.last = null;         // { kind: 'bra' | 'suddig' | 'stock' | 'vatten' | 'samma', t } for the viewfinder
  }

  get viewfinder() { return this.stage === 'shoot' ? { film: this.film, good: this.good, need: ODJUR.need, last: this.last && this.game.time - this.last.t < 1.6 ? this.last.kind : null, flash: this.last ? this.game.time - this.last.t : 9 } : null; }

  start() {
    const g = this.game, m = this.mgr, p = g.player, N = m.odjurNova;
    p.frozen = true; p.vx = p.vz = 0;
    if (N) { p.h = Math.atan2(N.x - p.x, N.z - p.z); N.standH = N.h = N.body.h = Math.atan2(p.x - N.x, p.z - N.z); }
    g.camFocus = { x: (p.x + (N ? N.x : p.x)) / 2, y: 0.5, z: (p.z + (N ? N.z : p.z)) / 2, yaw: p.h - 0.6, owner: 'odjur', near: true };
    m.setObjective('Odjurets bild', 'Kajen vid bryggan');
    m.later(0.5, () => g.emit('talk', { id: this.id, pages: introPages(!!(m.secrets && m.secrets.has('monster'))) }), this);
  }

  pierStep() {
    const g = this.game, m = this.mgr, p = g.player, E = ODJUR.end;
    const d = Math.hypot(p.x - E.x, p.z - E.z);
    m.setObjective('Längst ut på bryggan', d < 30 ? (p.inCar ? 'Kliv ur – bryggan är bara för gående' : 'Ställ dig vid räcket längst ut') : 'Bryggan i Sjuby hamn');
    if (p.state === 'foot' && !p.frozen && d < E.r) this.prompt = 'SIKTA';
  }

  aim() {
    const g = this.game, m = this.mgr, p = g.player, S = ODJUR.stand;
    this.stage = 'shoot'; this.aimT = g.time;
    p.x = S.x; p.z = S.z; p.y = g.world.groundHeight(S.x, S.z); p.h = Math.PI; p.vx = p.vz = 0; p.frozen = true;
    g.camFocus = { x: ODJUR.look.x, y: ODJUR.look.y, z: ODJUR.look.z, owner: 'odjur', cam: { ...ODJUR.cam } };
    this.nextSurfacing();
    g.emit('photo', { kind: 'aim' });
    m.later(0.8, () => g.emit('hint', { id: 'odjur-fota', touch: 'Vänta tills odjuret är HELT uppe – tryck FOTA. Stockar räknas inte!', keys: 'Vänta tills odjuret är HELT uppe – tryck E för att fota. Stockar räknas inte!' }), this);
  }

  nextSurfacing() {
    this.surf = surfacing(this.k++); this.surfT = -this.surf.wait; this.surf.shot = false;
  }

  shootStep(dt) {
    const g = this.game, m = this.mgr, S = this.surf;
    this.surfT += dt;
    const up = upAt(S, this.surfT);
    g.monsterPose = { kind: S.kind, x: S.x, z: S.z, up, h: S.h + Math.sin(g.time * 0.7) * 0.08 };
    if (this.surfT > ODJUR.rise + S.hold + ODJUR.sink) this.nextSurfacing();
    this.prompt = 'FOTA';
    m.setObjective(`Bra bilder: ${this.good} av ${ODJUR.need}`, `${this.film} bilder kvar i kameran`);
    if (g.input && g.input.action && g.time - this.aimT > 0.4) this.snap(up);   // (not the press that raised the camera)
  }

  snap(up) {
    const g = this.game, m = this.mgr, S = this.surf;
    this.film--; this.shots++;
    let kind;
    if (up < 0.2) kind = 'vatten';
    else if (S.kind === 'stock') kind = 'stock';
    else if (up < ODJUR.good) kind = 'suddig';
    else if (S.shot) kind = 'samma';
    else { kind = 'bra'; S.shot = true; this.good++; }
    this.last = { kind, t: g.time };
    g.emit('photo', { kind: 'snap', good: kind === 'bra' });
    if (kind === 'bra' && this.good === 1) { const s = m.secrets; if (s && !s.has('monster')) m.later(1.0, () => s.find('monster', 'quiet'), this); }
    if (this.good >= ODJUR.need) { this.stage = 'shot'; m.later(1.3, () => this.doneShooting(), this); return; }
    if (this.film <= 0) {
      this.film = ODJUR.film; this.refills++;
      g.emit('toast', { text: 'Filmen är slut! Nova vinkar från kajen och kastar en ny rulle. Den landar på bryggan. Tolv nya bilder.', long: true });
    }
  }

  doneShooting() {
    const g = this.game, m = this.mgr, p = g.player;
    g.monsterPose = undefined;
    this.stage = 'back';
    p.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'odjur') g.camFocus = null;
    g.emit('toast', { text: 'Tre bra bilder! Spring tillbaka till Nova på kajen.', long: true });
  }

  backStep() {
    const g = this.game, m = this.mgr, p = g.player, N = m.odjurNova;
    m.setObjective('Tillbaka till Nova', 'Hon väntar på kajen');
    if (N && p.state === 'foot' && !p.frozen && Math.hypot(p.x - N.x, p.z - N.z) < 1.9) this.prompt = 'PRATA';
  }

  show() {
    const g = this.game, m = this.mgr, p = g.player, N = m.odjurNova;
    this.stage = 'show';
    p.frozen = true; p.vx = p.vz = 0;
    if (N) { p.h = Math.atan2(N.x - p.x, N.z - p.z); N.standH = N.h = N.body.h = Math.atan2(p.x - N.x, p.z - N.z); }
    g.camFocus = { x: (p.x + N.x) / 2, y: 0.5, z: (p.z + N.z) / 2, yaw: p.h - 0.6, owner: 'odjur', near: true };
    this.amount = ODJUR.pay.base + (this.refills ? 0 : Math.max(0, this.film) * ODJUR.pay.film);
    g.emit('photo', { kind: 'show' });
    m.later(0.4, () => g.emit('talk', { id: this.id, pages: showPages(this.film, this.refills, this.amount) }), this);
  }

  talkFx(fx) { if (fx === 'camera') { this.game.emit('keys', { item: 'camera' }); this.hasCamera = true; } }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    const free = () => { p.frozen = false; if (g.camFocus && g.camFocus.owner === 'odjur') g.camFocus = null; };
    if (this.stage === 'intro') { free(); this.stage = 'pier'; this.hasCamera = true; return; }
    if (this.stage === 'show') {
      this.stage = 'done';
      g.stats.odjur = { shots: this.shots, refills: this.refills };
      m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Odjurets bild', amount: this.amount });
      m.sms(WHO.nova, 'fröken sa att det var en uppblåsbar drake. sen frågade hon VAR man köper en sån. jag fick MVG ändå 😎', 40);
    }
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.prompt = null;
    if (this.stage === 'pier') this.pierStep();
    else if (this.stage === 'shoot') this.shootStep(dt);
    else if (this.stage === 'back') this.backStep();
    if (this.hasCamera && p.state === 'foot' && (this.stage === 'shoot' || this.stage === 'shot')) p.body.pose = 1;
  }

  interact() {
    if (this.prompt === 'SIKTA') { this.aim(); return true; }
    if (this.prompt === 'PRATA') { this.show(); return true; }
    return false;
  }

  targets(T) {
    const g = this.game, m = this.mgr;
    if (this.stage === 'pier') T.push({ kind: 'zone', x: ODJUR.end.x, z: ODJUR.end.z, r: 1.0, gps: true });
    if (this.stage === 'back' && m.odjurNova) { const N = m.odjurNova; T.push({ kind: 'contact', x: N.x, z: N.z, r: 1, letter: 'N', color: NOVA.color, badgeOnly: true, badgeY: 2.3, ref: N, gps: true, always: true }); }
    void g;
  }

  cleanup() {
    const g = this.game, p = g.player;
    this.prompt = null;
    p.frozen = false;
    g.monsterPose = undefined;
    if (g.camFocus && g.camFocus.owner === 'odjur') g.camFocus = null;
  }
}

