// Main quest, part 7: "Bullfabriken" (v0.9). Bengt texts: Dahlgren's truck collects buns at the
// bakery every evening. Wait by the bakery's driveway on Norrholmen, then tail the truck – close
// enough not to lose it, far enough not to be seen. It leads to the construction site on Skolgatan,
// where Dahlgren is building his bun factory. Sneak in to the site office and listen… then the
// whole of Sjuby turns up. The end of the main adventure (for now).
import { WHO, FACTORY_START, TAIL, SITE_OFFICE, FACTORY_REWARD } from './config.js';
import { ISLE } from './island.js';
import { Ped } from './peds.js';
import { Chaser } from './bikejob.js';
import { landOf } from './route.js';

// (v0.9.1) the town end of the north bridge: here the truck joins the town's traffic
const BRIDGE_END = { x: 40, z0: -165, z1: -136 };
const DAHLGREN = { who: 'Direktör Dahlgren', letter: 'D', color: '#5a5f6b' };
const GUN = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const BENGT = { who: 'Bagar-Bengt', letter: 'B', color: '#d9534f' };
const POLIS = { who: 'Polis-Pia', letter: 'P', color: '#2c62a8' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const LOOKS = {
  dahlgren: { shirt: 0xe9e6de, pants: 0x2b2e35, skin: 0xf0c8a8, hair: 0x9a9a9a, height: 1.03, bulk: 1.15, style: 8 | 128, accent: 0x2b2e35 },
  gun: { shirt: 0xb48fd0, pants: 0x3d3550, skin: 0xf2d0b5, hair: 0xdedad2, height: 0.92, bulk: 1.1, style: 2 | 8 | 128, accent: 0x7a5a9a },
  bengt: { shirt: 0xf2efe6, pants: 0xe2ddd0, skin: 0xe9c3a6, hair: 0x3a2a1a, height: 1.04, bulk: 1.28, style: 4 | 32 | 64, accent: 0xf8f6f0 },
  polis: { shirt: 0x2c4a7a, pants: 0x1d2a44, skin: 0xd9a77e, hair: 0x3a2618, height: 1.0, bulk: 1.05, style: 2 | 16, accent: 0x1d2a44 },
};

export function sitePages() {
  return [
    { ...DAHLGREN, text: '…ja, ja. Fabriken står klar till jul. Tusen Sjubybullar i timmen – med Arnes recept. Jag har fotat båda halvorna.' },
    { ...DAHLGREN, text: 'Och den där tanten med konditoriet? Hon får sälja sina tolv bullar om dagen. Ha!' },
    { ...DAHLGREN, text: '…Vem där? Vad gör DU på min byggarbetsplats?!' },
    { ...YOU, text: 'Lyssnar. Tusen bullar i timmen, sa du?' },
    { ...GUN, fx: 'arrive', text: 'Med MITT recept, Dahlgren? Arnes recept?' },
    { ...BENGT, text: 'Och jag har spelat in alltihop på telefonen, chefen. Varenda ord.' },
    { ...POLIS, text: 'Polisen. Bengt har berättat om inbrottet på konditoriet och om syltburken. Dahlgren, du får följa med till stationen.' },
    { ...DAHLGREN, text: 'Det här… det här är en missuppfattning! Det var ju bara en syltburk!' },
    { ...GUN, text: 'Och Bullbilarna? Dem behöver väl ingen nu.' },
    { ...BENGT, text: 'Om tant Gun vill… så kan Bullbilarna köra ut riktiga Sjubybullar. Från konditoriet. Till hela stan.' },
    { ...GUN, text: 'Det får vi prata om över en kopp kaffe. Lilla vän – utan dig hade det här aldrig gått. Tack.', last: 'TACK!' },
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

export class FactoryJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'fabriken';
    this.stage = 'wait';     // wait (for the truck) → tail → sneak (on foot to the site office) → talk → done
    this.prompt = null;
    this.truck = null; this.chaser = null;
    this.farT = 0; this.nearT = 0; this.waitT = 0;
    this.people = [];
    this.titleCard = true;
  }

  start() {
    const g = this.game, m = this.mgr;
    g.emit('toast', { text: 'Ställ dig vid bageriets infart och vänta på lastbilen. Håll avstånd!', long: true });
    m.later(1.2, () => g.emit('hint', { id: 'tail', touch: 'Följ efter lastbilen: inte för nära (då ser de dig), inte för långt bort (då tappar du den).', keys: 'Följ efter lastbilen: inte för nära (då ser de dig), inte för långt bort (då tappar du den).' }), this);
  }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player;
    this.prompt = null;
    const T = p.inCar ? p.car : p;
    if (this.stage === 'wait') {
      const d = Math.hypot(T.x - FACTORY_START.x, T.z - FACTORY_START.z);
      m.setObjective('Vänta vid bageriets infart', d < FACTORY_START.r + 4 ? 'Lastbilen kommer snart…' : 'Norrholmen, mittvägen vid bageriet');
      if (d < FACTORY_START.r) { this.waitT += dt; if (this.waitT > 2.5) this.releaseTruck(); }
      return;
    }
    if (this.stage === 'tail') {
      const tr = this.truck;
      if (!tr || tr.removed) { m.fail(this, 'Lastbilen försvann'); return; }
      this.steerTruck(dt);
      const D = TAIL.dest;
      if (Math.hypot(tr.x - D.x, tr.z - D.z) < 8) { this.arrived(); return; }
      const d = Math.hypot(tr.x - T.x, tr.z - T.z);
      this.farT = d > TAIL.far ? this.farT + dt : 0;
      this.nearT = d < TAIL.near ? this.nearT + dt : Math.max(0, this.nearT - dt * 0.5);
      if (this.farT > TAIL.farT) { this.failTail('Du tappade bort lastbilen'); return; }
      if (this.nearT > TAIL.nearT) { this.failTail('Föraren såg dig'); return; }
      let sub = `${Math.round(d)} m bakom`;
      if (d > TAIL.far * 0.8) sub = `${Math.round(d)} m – för långt bort!`;
      else if (d < TAIL.near * 1.4) sub = `${Math.round(d)} m – för nära!`;
      else sub += ' · lagom';
      m.setObjective('Följ efter lastbilen', sub);
      if (d < TAIL.near * 1.4 && (this.warnT = (this.warnT || 0) - dt) <= 0) { this.warnT = 3; g.emit('toast', { text: 'Släpp efter lite – föraren tittar i backspegeln!', long: false }); }
      return;
    }
    if (this.stage === 'sneak') {
      const d = Math.hypot(p.x - SITE_OFFICE.x, p.z - SITE_OFFICE.z);
      m.setObjective('Smyg fram till byggbaracken', p.inCar ? 'Kliv ur och gå in genom grinden' : 'Byggtomten, containrarna i hörnet');
      if (!p.inCar && p.state === 'foot' && d < SITE_OFFICE.r) this.overhear();
    }
  }

  // Dahlgren's truck leaves the bakery yard and heads for town
  releaseTruck() {
    const g = this.game;
    this.stage = 'tail';
    g.makeRoom('van');
    const truck = g.addVehicle('van', 'green', ISLE.vanSpawn.x, ISLE.vanSpawn.z, ISLE.vanSpawn.h);
    if (!truck) { this.mgr.fail(this, 'Lastbilen kom aldrig'); return; }
    this.truck = truck;
    this.chaser = new Chaser(g, truck, { vMax: TAIL.vMax, burst: 0, hold: 1.0, polite: true });
    this.chaser.goal = { x: TAIL.dest.x, z: TAIL.dest.z, vx: 0, vz: 0, ref: null };
    g.racers.push(this.chaser);
    g.emit('toast', { text: 'Där kommer Dahlgrens lastbil! Följ efter – på avstånd.', long: true });
  }

  // (v0.9.1) who drives the truck: it drives itself on Norrholmen and across the bridge, and at the
  // end of the bridge it joins the town's traffic – then it waits its turn at the intersections and
  // turns tidily like everybody else, instead of pushing in among the cars and getting wedged there
  // for good (it could, with traffic about). Pushed off the streets somewhere: it drives itself again.
  steerTruck(dt) {
    const g = this.game, tr = this.truck, ch = this.chaser;
    if (ch && ch.mode === 'chase' && tr.racer === ch) {
      if (Math.abs(tr.x - BRIDGE_END.x) < 6 && tr.z > BRIDGE_END.z0 && tr.z < BRIDGE_END.z1 && Math.cos(tr.h) > 0.8) {
        ch.release();
        g.traffic.join(tr, g.layout.nodes.find((q) => q.x === BRIDGE_END.x && q.z === -120).id, 2, TAIL.dest, TAIL.vMax);
      } else if (landOf(tr.x, tr.z) === 'town' && (this.joinT = (this.joinT || 0) - dt) <= 0) {
        // in town some other way (driving itself after a push): onto the nearest lane when it is on one
        this.joinT = 1;
        if (g.traffic.nearestLane(tr.x, tr.z, tr.h, 6)) {
          ch.release();
          tr.ai = { dest: TAIL.dest, cruise: TAIL.vMax, path: null, replans: 0 }; tr.driver = 'ai';
          g.traffic.replan(tr);
          tr.steerFade = 30; tr.input.park = false;
        }
      }
    } else if (tr.driver === 'ai' && tr.ai && tr.ai.lost) {
      g.traffic.release(tr);
      this.chaser = new Chaser(g, tr, { vMax: TAIL.vMax, burst: 0, hold: 0, polite: true });
      this.chaser.goal = { x: TAIL.dest.x, z: TAIL.dest.z, vx: 0, vz: 0, ref: null };
      g.racers.push(this.chaser);
    }
  }

  // the truck stops where it is: the driver gets out (and the traffic drives round it)
  parkTruck() {
    const g = this.game, tr = this.truck;
    if (this.chaser && this.chaser.mode !== 'done') this.chaser.retire(false);
    if (tr && !tr.removed && tr.driver === 'ai') {
      g.traffic.release(tr);
      tr.driver = null; tr.parkedSpot = true; tr.coastT = 0;
      tr.input.throttle = 0; tr.input.steer = 0; tr.input.park = true;
    }
  }

  failTail(reason) {
    const g = this.game, m = this.mgr, tr = this.truck;
    this.parkTruck();
    m.fail(this, reason, [WHO.bengt, reason === 'Föraren såg dig'
      ? 'Han såg dig! Lastbilen vände tillbaka. Den går igen strax – vänta vid infarten igen och håll mer avstånd.'
      : 'Du tappade den! Lastbilen går igen strax – vänta vid bageriets infart och försök igen.']);
    m.later(5, () => { if (tr && !tr.removed && tr.driver !== 'player') g.removeVehicle(tr); });
  }

  // the truck stops at the construction site gate: on foot from here
  arrived() {
    const g = this.game, m = this.mgr;
    this.stage = 'sneak';
    this.parkTruck();
    this.dahlgren = spawnPed(g, LOOKS.dahlgren, SITE_OFFICE.x + 0.4, SITE_OFFICE.z + 1.6, 0, 'dahlgren');
    this.people.push(this.dahlgren);
    g.emit('toast', { text: 'Byggtomten?! Lastbilen stannade vid grinden. Smyg in till byggbaracken och lyssna.', long: true });
    m.later(1.0, () => g.emit('say', { who: this.truck, text: 'Leverans till fabriken!' }), this);
  }

  overhear() {
    const g = this.game, m = this.mgr, p = g.player, D = this.dahlgren;
    this.stage = 'talk';
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(D.x - p.x, D.z - p.z);
    D.standH = D.h = Math.atan2(p.x - D.x, p.z - D.z); D.body.h = D.h;
    const line = Math.atan2(D.x - p.x, D.z - p.z);
    g.camFocus = { x: (p.x + D.x) / 2, y: 0.4, z: (p.z + D.z) / 2, yaw: line - 0.6, owner: 'factory', near: true };
    m.later(0.6, () => g.emit('talk', { id: this.id, pages: sitePages() }), this);
  }

  // Gun, Bengt and the police turn up
  talkFx(fx) {
    if (fx !== 'arrive') return;
    const g = this.game, p = g.player, D = this.dahlgren;
    const face = (x, z) => Math.atan2(D.x - x, D.z - z);
    for (const [k, dx, dz] of [['gun', -1.6, -1.2], ['bengt', -2.4, -0.2], ['polis', 1.8, -1.4]]) {
      const x = p.x + dx, z = p.z + dz;
      this.people.push(spawnPed(g, LOOKS[k], x, z, face(x, z), k + '-site'));
    }
    g.camFocus = { x: (p.x + D.x) / 2 - 0.3, y: 0.5, z: (p.z + D.z) / 2 - 0.6, yaw: Math.atan2(D.x - p.x, D.z - p.z) + 0.35, owner: 'factory', near: true };
  }

  talkDone() {
    if (this.stage !== 'talk') return;
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    g.stats.factoryFound = true;
    m.complete(this, { title: 'HUVUDÄVENTYRET KLART!', sub: 'Bullfabriken', amount: FACTORY_REWARD });
    m.sms(WHO.gun, 'Bullbilarna är målade i konditoriets färger nu, och Bengt kör ut bullar till hela Sjuby. Kom och fira på torget!', 9);
  }

  targets(T) {
    if (this.stage === 'wait') T.push({ kind: 'zone', x: FACTORY_START.x, z: FACTORY_START.z, r: FACTORY_START.r, gps: true });
    else if (this.stage === 'tail' && this.truck) T.push({ kind: 'racer', car: this.truck, color: 0x46c96f, gps: true });
    else if (this.stage === 'sneak') T.push({ kind: 'zone', x: SITE_OFFICE.x, z: SITE_OFFICE.z, r: SITE_OFFICE.r, gps: true });
  }

  cleanup() {
    const g = this.game, m = this.mgr;
    this.prompt = null;
    g.player.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'factory') g.camFocus = null;
    if (this.chaser && this.chaser.mode !== 'done') this.chaser.retire(false);
    if (this.truck && this.truck.driver === 'ai' && this.truck.ai) this.truck.ai.dest = null;  // given up: just traffic now
    const gone = [...this.people], tr = this.truck, done = this.stage === 'done';
    m.later(done ? 25 : 1, () => {
      for (const q of gone) removePed(g, q);
      if (done && tr && !tr.removed && tr.driver !== 'player' && !g.visible(tr.x, tr.z)) g.removeVehicle(tr);
    });
  }
}
