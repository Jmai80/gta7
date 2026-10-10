// Heads-up display: minimap with GPS, money, objective, phone messages, banners,
// speech bubbles, speedometer and context buttons. Plain DOM + one 2D canvas.
import { fmt } from './rng.js';
import { STREET_NAMES, ROADS, RING, WHO } from './config.js';
import { PAINTS } from './vehicle.js';
import { INT, WALLS, FURN } from './interior.js';
import { SHOP, SHOP_WALLS, SHOP_FURN } from './shop.js';
import { OFFICE, OFFICE_WALLS, OFFICE_FURN } from './office.js';
import { SALON, SALON_WALLS, SALON_FURN } from './salon.js';
import { HOUSE, HOUSE_WALLS, HOUSE_FURN } from './birger.js';
import { SEE } from './samuel.js';
import { ISLE, BEACH } from './island.js';
import { routePoints } from './route.js';

const IN_PX = 24; // indoor floor plan: pixels per metre
// the indoor plan covers the tower's 7th floor and Hörnlivs (both out at sea)
const IN_ALL = [INT.bounds, SHOP.bounds, OFFICE.bounds, SALON.bounds, HOUSE.bounds];
const IN_BOUNDS = { x0: Math.min(...IN_ALL.map((b) => b.x0)), z0: Math.min(...IN_ALL.map((b) => b.z0)), x1: Math.max(...IN_ALL.map((b) => b.x1)), z1: Math.max(...IN_ALL.map((b) => b.z1)) };
const EYE = '<svg viewBox="0 0 24 16" width="20" height="14"><path d="M1 8 Q12 -3 23 8 Q12 19 1 8Z" fill="#fff"/><circle cx="12" cy="8" r="4.2" fill="#15181d"/></svg>';

const MAP_PX = 2;
const MAP = { x0: -170, z0: -430, x1: 170, z1: 170 };   // the town and Norrholmen up north

export class HUD {
  constructor(root, layout) {
    this.root = root;
    const $ = (id) => root.querySelector('#' + id);
    this.el = {
      hud: $('hud'), map: $('map'), money: $('money'), stars: $('stars'), objective: $('objective'), objText: $('objText'),
      phone: $('phone'), street: $('street'), carinfo: $('carinfo'), speed: $('speed'), cond: $('condBar'), condWrap: $('cond'),
      banner: $('banner'), toast: $('toast'), hint: $('hint'), bubbles: $('bubbles'), fps: $('fps'),
      bAction: $('bAction'), bExit: $('bExit'), bHand: $('bHand'), bHorn: $('bHorn'), bGas: $('bGas'), touch: $('touch'), keyhint: $('keyhint'),
      objSub: $('objSub'), count: $('count'), fade: $('fade'), quests: $('quests'), qBadge: $('qBadge'),
      eye: $('eye'),
    };
    this.eyeState = '';
    this.onOffer = null; // (id) → open the offer card
    this.onLog = null;   // () → open the quest log
    // tapping an offer SMS answers it; tapping the objective or the list button opens the quest log
    this.el.phone.addEventListener('click', (e) => {
      e.preventDefault();
      const m = this.smsShown;
      if (m && m.offer && this.onOffer) { this.smsT = Math.min(this.smsT, 0.01); this.onOffer(m.offer); }
    });
    this.el.objective.addEventListener('click', (e) => { e.preventDefault(); if (this.onLog) this.onLog(); });
    this.el.quests.addEventListener('click', (e) => { e.preventDefault(); if (this.onLog) this.onLog(); });
    this.layout = layout;
    this.ctx = this.el.map.getContext('2d');
    this.mapImg = this.buildMap(layout);
    this.inImg = this.buildIndoorMap();
    this.money = 0; this.moneyShown = 0;
    this.sms = []; this.smsT = 0; this.smsShown = null;
    this.hintsSeen = new Set();
    this.hintT = 0; this.toastT = 0; this.streetT = 0; this.bannerT = 0;
    this.lastStreet = '';
    this.kind = 'touch';
    this.route = null; this.routeT = 0;
    this.bubbles = [];
    this.bubbleEls = [];
    for (let i = 0; i < 8; i++) {
      const d = document.createElement('div');
      d.className = 'bubble'; d.hidden = true;
      this.el.bubbles.appendChild(d);
      this.bubbleEls.push(d);
    }
    this.mode = '';
    this.actionLabel = '';
    this.subShown = '';
    this.countT = 0;
    this.badgeN = -1;
    this.chooseShown = null;
    this.resize();
  }

  resize() {
    const c = this.el.map;
    const css = c.getBoundingClientRect().width || 130;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = Math.round(css * dpr);
    this.mapCss = css;
  }

  setKind(kind) {
    this.kind = kind;
    this.root.classList.toggle('kind-touch', kind === 'touch');
    this.root.classList.toggle('kind-keys', kind !== 'touch');
  }

  // ---------------------------------------------------------------- minimap
  buildMap(L) {
    const c = document.createElement('canvas');
    c.width = (MAP.x1 - MAP.x0) * MAP_PX; c.height = (MAP.z1 - MAP.z0) * MAP_PX;
    const g = c.getContext('2d');
    const P = (v) => (v + 170) * MAP_PX;                 // x (and town z) to pixels
    const Q = (z) => (z - MAP.z0) * MAP_PX;              // z to pixels
    g.fillStyle = '#244f5c'; g.fillRect(0, 0, c.width, c.height);
    g.translate(0, Q(-170));                             // the town part keeps its old drawing code below
    g.fillStyle = '#4b5a4c'; g.fillRect(P(-146), P(-146), 292 * MAP_PX, 292 * MAP_PX);
    for (const b of L.blocks) {
      g.fillStyle = '#' + b.c.toString(16).padStart(6, '0');
      g.globalAlpha = 0.55;
      g.fillRect(P(b.x0), P(b.z0), (b.x1 - b.x0) * MAP_PX, (b.z1 - b.z0) * MAP_PX);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#2b2f36';
    for (const f of L.footprints) g.fillRect(P(f.x0), P(f.z0), (f.x1 - f.x0) * MAP_PX, (f.z1 - f.z0) * MAP_PX);
    // roads
    g.fillStyle = '#d8d3c6';
    for (const r of ROADS) {
      g.fillRect(P(r - 5), P(-RING), 10 * MAP_PX, 2 * RING * MAP_PX);
      g.fillRect(P(-RING), P(r - 5), 2 * RING * MAP_PX, 10 * MAP_PX);
    }
    g.fillRect(P(35), P(-233), 10 * MAP_PX, 108 * MAP_PX);   // the north bridge (its gate is drawn live)
    g.fillRect(P(-200), P(-45), 75 * MAP_PX, 10 * MAP_PX);
    g.fillStyle = '#d2342c';
    g.fillRect(P(-179), P(-46), 2 * MAP_PX, 12 * MAP_PX);
    // pond + pitch
    const z = L.zones;
    if (z.pond) { g.fillStyle = '#2f6a76'; g.beginPath(); g.arc(P(z.pond.x), P(z.pond.z), z.pond.r * MAP_PX, 0, 7); g.fill(); }
    if (z.pitch) { g.fillStyle = '#5c9a45'; g.fillRect(P(z.pitch.x0), P(z.pitch.z0), (z.pitch.x1 - z.pitch.x0) * MAP_PX, (z.pitch.z1 - z.pitch.z0) * MAP_PX); }
    if (z.pier) { g.fillStyle = '#8a6a48'; g.fillRect(P(z.pier.x0), P(z.pier.z0), (z.pier.x1 - z.pier.x0) * MAP_PX, (z.pier.z1 - z.pier.z0) * MAP_PX); }
    this.drawIsle(g, P, L);
    return c;
  }

  // Norrholmen on the map: the shore, the beach, the roads, the allotments and the buildings
  drawIsle(g, P, L) {
    const path = (pts) => { g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(P(x), P(z)) : g.moveTo(P(x), P(z)))); g.closePath(); };
    g.fillStyle = '#4f6448'; path(ISLE.coast); g.fill();
    const A = ISLE.allot;
    g.fillStyle = '#5f7a4a'; g.fillRect(P(A.x0), P(A.z0), (A.x1 - A.x0) * MAP_PX, (A.z1 - A.z0) * MAP_PX);
    const Y = ISLE.yard;
    g.fillStyle = '#3d4249'; g.fillRect(P(Y.x0), P(Y.z0), (Y.x1 - Y.x0) * MAP_PX, (Y.z1 - Y.z0) * MAP_PX);
    g.fillStyle = '#b9a874'; path([...BEACH.shore, ...BEACH.inland.slice().reverse()]); g.fill(); // the beach (v1.1)
    g.strokeStyle = '#d8d3c6'; g.lineWidth = 8 * MAP_PX; g.lineJoin = 'round'; g.lineCap = 'round';
    for (const R of Object.values(L.isleRoads || {})) {
      g.beginPath();
      R.pts.forEach(([x, z], i) => (i ? g.lineTo(P(x), P(z)) : g.moveTo(P(x), P(z))));
      if (R.closed) g.closePath();
      g.stroke();
    }
    g.fillStyle = '#2b2f36';
    for (const f of L.footprints) if (f.z1 < -200) g.fillRect(P(f.x0), P(f.z0), (f.x1 - f.x0) * MAP_PX, (f.z1 - f.z0) * MAP_PX);
  }

  // the floor plan of the tower's 7th floor (corridor + Melker's flat)
  buildIndoorMap() {
    const B = IN_BOUNDS, ox = B.x0, oz = B.z0;
    const c = document.createElement('canvas');
    c.width = Math.ceil((B.x1 - B.x0) * IN_PX); c.height = Math.ceil((B.z1 - B.z0) * IN_PX);
    const g = c.getContext('2d');
    const X = (x) => (x - ox) * IN_PX, Zs = (z) => (z - oz) * IN_PX;
    const rect = (x0, z0, x1, z1, col) => { g.fillStyle = col; g.fillRect(X(x0), Zs(z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX); };
    rect(B.x0, B.z0, B.x1, B.z1, '#14181d');
    rect(INT.corridor.x0, INT.corridor.z0, INT.corridor.x1, INT.corridor.z1, '#4d5660');
    rect(INT.flat.x0, INT.flat.z0, INT.flat.x0 + 6.5, INT.flat.z1, '#6b5641');
    rect(INT.flat.x0 + 6.5, INT.flat.z0, INT.flat.x1, INT.flat.z1, '#77746f');
    rect(INT.door.x0, INT.door.z - 0.1, INT.door.x1, INT.door.z + 0.1, '#6b5641');
    const ix = INT.corridor.x0, iz = INT.corridor.z0;
    g.fillStyle = '#2b3037';
    for (const [x0, z0, x1, z1] of FURN) g.fillRect(X(ix + x0), Zs(iz + z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX);
    g.fillStyle = '#ece5d6';
    for (const [x0, z0, x1, z1] of WALLS) g.fillRect(X(ix + x0), Zs(iz + z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX);
    // the lift
    g.fillStyle = '#b9bec4'; g.fillRect(X(ix + 0.05), Zs(iz + 0.6), 0.5 * IN_PX, 1.2 * IN_PX);
    g.fillStyle = '#14181d'; g.font = `900 ${IN_PX * 0.7}px "Big Shoulders Display", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('H', X(ix + 0.3), Zs(iz + 1.2));
    // Hörnlivs (v0.6.1): the shop floor, its shelves and the door
    const S = SHOP.room;
    rect(S.x0, S.z0, S.x1, S.z1, '#6f6a5f');
    g.fillStyle = '#2b3037';
    for (const [x0, z0, x1, z1] of SHOP_FURN.slice(0, -1)) g.fillRect(X(S.x0 + x0), Zs(S.z0 + z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX);
    g.fillStyle = '#ece5d6';
    for (const [x0, z0, x1, z1] of SHOP_WALLS) g.fillRect(X(S.x0 + x0), Zs(S.z0 + z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX);
    g.fillStyle = '#9fb7c4'; g.fillRect(X(S.x0 + 1.2), Zs(S.z0 + 7), 1.2 * IN_PX, 0.2 * IN_PX);
    // the bakery office (v0.7)
    const O = OFFICE.room;
    rect(O.x0, O.z0, O.x1, O.z1, '#6b5641');
    g.fillStyle = '#2b3037';
    for (const [x0, z0, x1, z1] of OFFICE_FURN.slice(0, -1)) g.fillRect(X(O.x0 + x0), Zs(O.z0 + z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX);
    g.fillStyle = '#ece5d6';
    for (const [x0, z0, x1, z1] of OFFICE_WALLS) g.fillRect(X(O.x0 + x0), Zs(O.z0 + z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX);
    // Salong Saxen (v1.0): the chequered floor, the chairs, the counter with the tools, the sofa
    const Sa = SALON.room;
    rect(Sa.x0, Sa.z0, Sa.x1, Sa.z1, '#7a7472');
    g.fillStyle = '#2b3037';
    for (const [x0, z0, x1, z1] of SALON_FURN.slice(0, -1)) g.fillRect(X(Sa.x0 + x0), Zs(Sa.z0 + z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX);
    g.fillStyle = '#ece5d6';
    for (const [x0, z0, x1, z1] of SALON_WALLS) g.fillRect(X(Sa.x0 + x0), Zs(Sa.z0 + z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX);
    g.fillStyle = '#9fb7c4'; g.fillRect(X(Sa.x0 + 1.2), Zs(Sa.z0 + 7), 1.2 * IN_PX, 0.2 * IN_PX);
    // Birger's house (v1.2): parquet in the living room and the bedroom, tiles in the kitchen and the bathroom
    const Ho = HOUSE.room;
    for (const [k, col] of [['living', '#6b5641'], ['bedroom', '#655039'], ['kitchen', '#77746f'], ['bath', '#6f7b7d']]) { const r = HOUSE.rooms[k]; rect(r.x0, r.z0, r.x1, r.z1, col); }
    g.fillStyle = '#2b3037';
    for (const [x0, z0, x1, z1] of HOUSE_FURN.slice(0, -1)) g.fillRect(X(Ho.x0 + x0), Zs(Ho.z0 + z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX);
    g.fillStyle = '#ece5d6';
    for (const [x0, z0, x1, z1] of HOUSE_WALLS) g.fillRect(X(Ho.x0 + x0), Zs(Ho.z0 + z0), (x1 - x0) * IN_PX, (z1 - z0) * IN_PX);
    g.fillStyle = '#2c4a6e'; g.fillRect(X(Ho.x0 + 4.9), Zs(Ho.z0 + 9), 1.2 * IN_PX, 0.2 * IN_PX);
    return c;
  }

  drawIndoorMap(game, camYaw) {
    const g = this.ctx, W = this.el.map.width, R = W / 2;
    const p = game.player, u = W / 150;
    const range = 9.5, k = R / range;
    const B = IN_BOUNDS;
    g.save();
    g.clearRect(0, 0, W, W);
    g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#14181d'; g.fillRect(0, 0, W, W);
    g.translate(R, R);
    const rot = camYaw - Math.PI;
    g.rotate(rot);
    const s = k / IN_PX;
    g.drawImage(this.inImg, (B.x0 - p.x) * k, (B.z0 - p.z) * k, this.inImg.width * s, this.inImg.height * s);
    const P = (x, z) => [(x - p.x) * k, (z - p.z) * k];
    // where Melker is looking
    const sam = game.indoors.samuel;
    if (sam && sam.cone.on > 0.05) {
      const c = sam.cone;
      const a = sam.cone.alert;
      g.fillStyle = `rgba(255, ${Math.round(255 - a * 170)}, ${Math.round(255 - a * 200)}, ${0.3 * c.on})`;
      g.beginPath();
      g.moveTo(...P(c.x, c.z));
      for (let i = 0; i <= 14; i++) {
        const an = c.dir - SEE.half + (2 * SEE.half * i) / 14;
        const ex = c.x + Math.sin(an) * SEE.range, ez = c.z + Math.cos(an) * SEE.range;
        const f = game.world.raycast(c.x, c.z, ex, ez, INT.y + 1.5);
        g.lineTo(...P(c.x + (ex - c.x) * f, c.z + (ez - c.z) * f));
      }
      g.closePath(); g.fill();
    }
    // the keys (until you have them), Melker
    const job = game.mission.active;
    if (job && job.id === 'samuel' && !job.keys) {
      const [x, z] = P(INT.keys.x, INT.keys.z);
      const pulse = 1 + 0.25 * Math.sin(performance.now() / 160);
      g.fillStyle = '#ffcf33'; g.strokeStyle = '#1d1f22'; g.lineWidth = 1.5 * u;
      g.beginPath(); g.arc(x, z, 4.2 * u * pulse, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    if (job && job.id === 'kassaskap' && game.indoors.where === 'office') { // the clues and the safe, Bengt when he comes
      for (const s of job.spots()) {
        const [x, z] = P(s.x, s.z);
        const pulse = 1 + 0.25 * Math.sin(performance.now() / 160);
        g.fillStyle = '#ffcf33'; g.strokeStyle = '#1d1f22'; g.lineWidth = 1.5 * u;
        g.beginPath(); g.arc(x, z, 3.6 * u * pulse, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      if (job.bengt) {
        const [x, z] = P(job.bengt.x, job.bengt.z);
        g.fillStyle = '#ff3b2f'; g.strokeStyle = '#ffffff'; g.lineWidth = 1.5 * u;
        g.beginPath(); g.arc(x, z, 4.6 * u, 0, Math.PI * 2); g.fill(); g.stroke();
      }
    }
    if (job && job.id === 'salong' && job.fia) { // Salong Saxen (v1.0): Vera on her stool, whoever is in the chair
      const dot = (x0, z0, c) => { const [x, z] = P(x0, z0); g.fillStyle = c; g.strokeStyle = '#ffffff'; g.lineWidth = 1.5 * u; g.beginPath(); g.arc(x, z, 4.4 * u, 0, Math.PI * 2); g.fill(); g.stroke(); };
      dot(job.fia.x, job.fia.z, '#e8833a');
      const c = job.current;
      if (c && c.ped) dot(c.ped.x, c.ped.z, c.def.color);
    }
    if (job && job.id === 'cykelgomman' && game.indoors.where === 'birger' && job.spots) { // (v1.2) the places left to search in Birger's house
      const pulse = 1 + 0.25 * Math.sin(performance.now() / 160);
      for (const s of job.spots()) {
        const [x, z] = P(s.x, s.z);
        g.fillStyle = '#ffcf33'; g.strokeStyle = '#1d1f22'; g.lineWidth = 1.5 * u;
        g.beginPath(); g.arc(x, z, 3.2 * u * pulse, 0, Math.PI * 2); g.fill(); g.stroke();
      }
    }
    if (job && job.id === 'livs' && job.yasmin) { // Yasmin at the till
      const [x, z] = P(job.yasmin.x, job.yasmin.z);
      g.fillStyle = '#ff6fae'; g.strokeStyle = '#ffffff'; g.lineWidth = 1.5 * u;
      g.beginPath(); g.arc(x, z, 4.6 * u, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    if (sam) {
      const [x, z] = P(sam.ped.x, sam.ped.z);
      g.fillStyle = '#ff7a59'; g.strokeStyle = '#ffffff'; g.lineWidth = 1.5 * u;
      g.beginPath(); g.arc(x, z, 4.6 * u, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.restore();
    // player arrow
    g.save(); g.translate(R, R); g.rotate(rot - p.h + Math.PI);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#111'; g.lineWidth = 1.5 * u;
    g.beginPath(); g.moveTo(0, -8 * u); g.lineTo(6 * u, 7 * u); g.lineTo(0, 3.5 * u); g.lineTo(-6 * u, 7 * u); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  // the yellow GPS line: along the roads (town, north bridge, Norrholmen) to the target
  routeTo(game, tx, tz) {
    const p = game.player;
    return routePoints(game.layout.gps, p.x, p.z, tx, tz);
  }

  drawMap(game, camYaw, dt) {
    if (game.indoor) { this.drawIndoorMap(game, camYaw); return; }
    const g = this.ctx, W = this.el.map.width, R = W / 2;
    const p = game.player;
    const car = p.inCar ? p.car : null;
    const speed = car ? car.speed : 0;
    const range = 70 + Math.min(speed / 30, 1) * 45; // meters from center to rim
    const k = R / range; // canvas px per meter
    g.save();
    g.clearRect(0, 0, W, W);
    g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#244f5c'; g.fillRect(0, 0, W, W);
    g.translate(R, R);
    const rot = camYaw - Math.PI;
    g.rotate(rot);
    const s = k / MAP_PX;
    g.drawImage(this.mapImg, -(p.x - MAP.x0) * MAP_PX * s, -(p.z - MAP.z0) * MAP_PX * s, this.mapImg.width * s, this.mapImg.height * s);
    if (!game.gateN || !game.gateN.open) { g.fillStyle = '#d2342c'; g.fillRect((34 - p.x) * k, (-179 - p.z) * k, 12 * k, 2 * k); } // the north gate, shut
    const T = game.missionActive ? game.mission.targets : [];
    const line = (pts, color, width) => {
      g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      pts.forEach(([x, z], i) => { const X = (x - p.x) * k, Z = (z - p.z) * k; i ? g.lineTo(X, Z) : g.moveTo(X, Z); });
      g.stroke();
    };
    // the street race: the whole loop, faint
    const job = game.mission.active;
    if (game.missionActive && job && job.showRoute) {
      if (!this.racePts || this.racePtsFor !== job.route) {
        const rt = job.route;
        this.racePts = [];
        for (let i = 0; i <= rt.n; i += 3) this.racePts.push([rt.xs[i % rt.n], rt.zs[i % rt.n]]);
        this.racePts.push([rt.xs[0], rt.zs[0]]);
        this.racePtsFor = rt;
      }
      line(this.racePts, 'rgba(255, 207, 51, 0.55)', Math.max(2.5, 3.4 * (W / 150)));
    }
    // GPS to the nearest place to go
    let goal = null, gd = 1e9, gx = 0, gz = 0;
    for (const t of T) {
      if (!t.gps) continue;
      const tx = t.car ? t.car.x : t.x, tz = t.car ? t.car.z : t.z;
      const d = Math.hypot(tx - p.x, tz - p.z);
      if (d < gd) { gd = d; goal = t; gx = tx; gz = tz; }
    }
    if (goal) {
      this.routeT -= dt;
      const key = goal.car ? 'car' + goal.car.id : goal.x + ',' + goal.z;
      if (this.routeT <= 0 || !this.route || this.routeGoal !== key) {
        this.route = this.routeTo(game, gx, gz); this.routeT = 0.5; this.routeGoal = key;
      }
      this.route[this.route.length - 1] = [gx, gz];
      this.route[0] = [p.x, p.z];
      line(this.route, '#ffcf33', Math.max(3, 4.5 * (W / 150)));
    } else this.route = null;
    g.restore();
    // blips (upright), clamped to the rim
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const toScreen = (x, z) => {
      const dx = (x - p.x) * k, dz = (z - p.z) * k;
      return [R + dx * cr - dz * sr, R + dx * sr + dz * cr];
    };
    const place = (x, z, size) => {
      let [X, Y] = toScreen(x, z);
      const dx = X - R, dy = Y - R, d = Math.hypot(dx, dy), lim = R - size - 3;
      const edge = d > lim;
      if (edge) { X = R + (dx / d) * lim; Y = R + (dy / d) * lim; }
      return [X, Y, edge];
    };
    const blip = (x, z, color, size, ring = '#ffffff') => {
      const [X, Y, edge] = place(x, z, size);
      g.fillStyle = color; g.strokeStyle = ring; g.lineWidth = Math.max(1.5, W / 90);
      g.beginPath(); g.arc(X, Y, edge ? size * 0.8 : size, 0, Math.PI * 2); g.fill(); g.stroke();
    };
    const letter = (x, z, ch, color, size) => {
      const [X, Y] = place(x, z, size);
      g.fillStyle = '#111317'; g.beginPath(); g.arc(X, Y, size + 1.6 * u, 0, Math.PI * 2); g.fill();
      g.fillStyle = color; g.beginPath(); g.arc(X, Y, size, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111317'; g.font = `900 ${size * 1.5}px "Big Shoulders Display", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ch, X, Y + size * 0.1);
    };
    const u = W / 150;
    const hex = (h) => '#' + h.toString(16).padStart(6, '0');
    for (const t of T) {
      if (t.kind === 'car') blip(t.car.x, t.car.z, t.color ? hex(t.color) : '#ff3b2f', 5 * u);
      else if (t.kind === 'racer') blip(t.car.x, t.car.z, t.color ? hex(t.color) : hex(PAINTS[t.car.paint].hex), (t.color ? 5 : 4.2) * u, t.color || t.car.paint === 'black' ? '#ffffff' : '#111317');
      else if (t.kind === 'ring') { if (!t.dim) blip(t.x, t.z, '#ffcf33', 5.5 * u, '#1d1f22'); }
      else if (t.letter) letter(t.x, t.z, t.letter, t.color, 7.5 * u);
      else blip(t.x, t.z, '#ffcf33', 6.5 * u, '#1d1f22');
    }
    // north marker
    const [nx, ny] = (() => { const a = rot; const vx = 0, vy = -1; return [R + (vx * Math.cos(a) - vy * Math.sin(a)) * (R - 10 * u), R + (vx * Math.sin(a) + vy * Math.cos(a)) * (R - 10 * u)]; })();
    g.fillStyle = 'rgba(16,18,24,0.85)'; g.beginPath(); g.arc(nx, ny, 8 * u, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.font = `800 ${11 * u}px "Big Shoulders Display", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', nx, ny + 0.5);
    // player arrow
    const heading = car ? car.h : p.h;
    g.save(); g.translate(R, R); g.rotate(rot - heading + Math.PI);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#111'; g.lineWidth = 1.5 * u;
    g.beginPath(); g.moveTo(0, -8 * u); g.lineTo(6 * u, 7 * u); g.lineTo(0, 3.5 * u); g.lineTo(-6 * u, 7 * u); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  // ---------------------------------------------------------------- messages
  setMoney(total) { this.money = total; }

  objective(text) {
    this.el.objText.textContent = text;
    this.el.objective.hidden = !text;
    if (text) { this.el.objective.classList.remove('pop'); void this.el.objective.offsetWidth; this.el.objective.classList.add('pop'); }
  }

  pushSms(from, text, color, offer) { this.sms.push({ from, text, color, offer }); }

  // a ring of light around the minimap when you start following a quest
  flashMap() {
    const m = this.el.map;
    m.classList.remove('flash'); void m.offsetWidth; m.classList.add('flash');
  }

  // big countdown in the middle of the screen ('' hides it)
  countdown(text, go = false) {
    const el = this.el.count;
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle('go', go);
    if (text) { el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
    this.countT = text ? (go ? 1.2 : 0.95) : 0;
  }

  fade(on) { this.el.fade.classList.toggle('on', on); }

  banner(title, sub, amount, kind = '') {
    const b = this.el.banner;
    b.className = kind;
    b.innerHTML = '';
    const t = document.createElement('div'); t.className = 'b-title'; t.textContent = title;
    const s = document.createElement('div'); s.className = 'b-sub'; s.textContent = sub || '';
    b.append(t, s);
    if (amount) { const a = document.createElement('div'); a.className = 'b-amount'; a.textContent = `+${fmt(amount)} kr`; b.append(a); }
    b.hidden = false;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    this.bannerT = 3.6;
  }

  toast(text, long = false) {
    const t = this.el.toast;
    t.textContent = text; t.hidden = false;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    this.toastT = long ? 4.5 : 3;
  }

  hint(h) {
    if (this.hintsSeen.has(h.id)) return;
    this.hintsSeen.add(h.id);
    const el = this.el.hint;
    el.textContent = this.kind === 'touch' ? h.touch : h.keys;
    el.hidden = false;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    this.hintT = 6;
  }

  street(name) {
    const el = this.el.street;
    el.textContent = name; el.hidden = false;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    this.streetT = 2.8;
  }

  stars(n) {
    const el = this.el.stars;
    el.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.textContent = '★';
      if (i < n) s.className = 'lit';
      el.append(s);
    }
    el.classList.toggle('wanted', n > 0);
  }

  say(who, text) {
    this.bubbles = this.bubbles.filter((b) => b.who !== who);
    this.bubbles.push({ who, text, t: 2.6 });
    if (this.bubbles.length > 8) this.bubbles.shift();
  }

  // ---------------------------------------------------------------- per frame
  update(dt, game, view, camYaw, fpsInfo) {
    const p = game.player;
    const car = p.inCar ? p.car : null;
    // money counter rolls up
    if (this.moneyShown !== this.money) {
      const d = this.money - this.moneyShown;
      const step = Math.max(1, Math.abs(d) * Math.min(1, dt * 5));
      this.moneyShown = Math.abs(d) <= step ? this.money : this.moneyShown + Math.sign(d) * step;
      this.el.money.textContent = `${fmt(this.moneyShown)} kr`;
    }
    // phone
    if (this.smsShown) {
      this.smsT -= dt;
      if (this.smsT <= 0) { this.el.phone.classList.remove('show', 'offer', 'tap'); this.smsShown = null; this.smsGap = 0.45; }
    } else if (this.sms.length) {
      this.smsGap = (this.smsGap || 0) - dt;
      if (this.smsGap <= 0) {
        const m = this.sms.shift();
        this.smsShown = m;
        const el = this.el.phone;
        el.querySelector('.who').textContent = m.from;
        const av = el.querySelector('.av');
        av.textContent = m.from === WHO.anon ? '?' : m.from === WHO.gun ? 'G' : m.from.trim()[0]; // the letters on the map
        av.classList.toggle('sys', m.from === 'GTA 7');
        av.style.background = m.color || '';
        el.querySelector('.msg').textContent = m.text;
        // a job offer can be answered: tap it (or press J)
        const act = el.querySelector('.act');
        el.classList.toggle('offer', !!m.offer);
        el.classList.toggle('tap', !!m.offer);
        act.hidden = !m.offer;
        act.textContent = this.kind === 'touch' ? 'Tryck för att svara ›' : 'Klicka eller tryck J för att svara';
        el.hidden = false;
        el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
        this.smsT = Math.min(9, 3.2 + m.text.length * 0.05) + (m.offer ? 3 : 0);
        if (this.onSms) this.onSms();
      }
    }
    for (const k of ['hint', 'toast', 'street', 'banner']) {
      const key = k + 'T';
      if (this[key] > 0) { this[key] -= dt; if (this[key] <= 0) this.el[k].classList.remove('show'); }
    }
    if (this.countT > 0 && (this.countT -= dt) <= 0) this.el.count.hidden = true;
    // second objective line: timers, race position
    const sub = game.missionActive ? game.mission.sub : '';
    if (sub !== this.subShown) {
      this.subShown = sub;
      this.el.objSub.textContent = sub;
      this.el.objSub.hidden = !sub;
    }
    // context controls
    const mode = car ? (car.spec.bike ? 'bike' : 'car') : 'foot';
    if (mode !== this.mode) {
      this.mode = mode;
      this.root.classList.toggle('in-car', mode !== 'foot');
      this.root.classList.toggle('on-bike', mode === 'bike');
      const bike = mode === 'bike';
      this.el.bExit.innerHTML = bike ? 'KLIV<br>AV' : 'KLIV<br>UR';
      this.el.bHand.innerHTML = bike ? 'BROMS' : 'HAND-<br>BROMS';
      this.el.bHorn.textContent = bike ? 'PLING' : 'TUTA';
      this.el.bGas.textContent = bike ? 'TRAMPA' : 'GAS';
      this.el.condWrap.hidden = bike; // a bike does not get dented
    }
    let label = '';
    const prompt = game.missionActive ? game.mission.prompt : null;
    if (!car && prompt) label = prompt;
    else if (!car && p.near) label = p.near.spec.bike ? 'CYKLA' : p.near.driver ? 'STJÄL' : 'KLIV IN';
    if (label !== this.actionLabel) {
      this.actionLabel = label;
      this.el.bAction.textContent = label;
      this.el.bAction.hidden = !label;
      this.el.bAction.classList.toggle('long', label.length > 7); // (BLONDERING, RAKHYVEL… in the hair salon)
      this.el.keyhint.hidden = !label;
      const what = { 'STJÄL': 'Stjäl bilen', 'KLIV IN': 'Kliv in', PRATA: 'Prata', 'GÅ UT': 'Gå ut', TITTA: 'Titta', 'ÖPPNA': 'Öppna kassaskåpet', HISSA: 'Håll inne för att hissa flaggan', TA: 'Ta', HISS: 'Ta hissen ner', CYKLA: 'Cykla', 'LÅS UPP': 'Lås upp cykeln med Melkers nycklar',
        SAX: 'Ta saxen', RAKHYVEL: 'Ta rakhyveln', 'BLÅ FÄRG': 'Ta den blå färgen', 'ROSA FÄRG': 'Ta den rosa färgen', BLONDERING: 'Ta blonderingen',
        KLIPP: 'Klipp håret', RAKA: 'Raka av skägget', 'FÄRGA': 'Färga håret' };
      this.el.keyhint.innerHTML = label ? `<kbd>E</kbd> ${what[label] || label}` : '';
    }
    // quest log: badge with new offers, and the objective box asks you to pick a quest
    const nNew = game.missionActive ? game.mission.newCount() : 0;
    if (nNew !== this.badgeN) { this.badgeN = nNew; this.el.qBadge.textContent = nNew; this.el.qBadge.hidden = !nNew; }
    const choose = game.missionActive && game.mission.choose;
    if (choose !== this.chooseShown) { this.chooseShown = choose; this.el.objective.classList.toggle('choose', choose); }
    // speed + condition
    if (car) {
      const kmh = Math.round(car.speed * 3.6);
      if (kmh !== this.kmh) { this.kmh = kmh; this.el.speed.textContent = kmh; }
      const hp = Math.round(car.health);
      if (hp !== this.hp) {
        this.hp = hp;
        this.el.cond.style.width = hp + '%';
        this.el.cond.className = hp > 60 ? 'ok' : hp > 30 ? 'warn' : 'bad';
      }
    }
    // street names
    const sn = streetAt(car ? car.x : p.x, car ? car.z : p.z);
    if (sn && sn !== this.lastStreet) { this.lastStreet = sn; this.street(sn); }
    // what Melker is up to: a badge over his head (phone · ? · eye · !) with a ring that fills as he notices you
    this.updateEye(game, view);
    // bubbles
    const tmp = {};
    for (let i = 0; i < this.bubbleEls.length; i++) {
      const el = this.bubbleEls[i], b = this.bubbles[i];
      if (!b) { if (!el.hidden) el.hidden = true; continue; }
      b.t -= dt;
      const w = b.who;
      const isCar = !!w.spec;
      const y = isCar ? (w.visY ?? w.y) + w.spec.height + 0.7 : w.y + 2.15;
      const dx = w.x - view.camera.position.x, dz = w.z - view.camera.position.z;
      view.project(w.x, y, w.z, tmp);
      const vis = tmp.visible && dx * dx + dz * dz < 60 * 60 && !w.removed;
      if (!vis) { el.hidden = true; continue; }
      if (el.textContent !== b.text) el.textContent = b.text;
      el.hidden = false;
      el.style.transform = `translate(${tmp.x}px, ${tmp.y}px) translate(-50%, -100%)`;
      el.style.opacity = Math.min(1, b.t * 2);
    }
    this.bubbles = this.bubbles.filter((b) => b.t > 0);
    // the minimap only needs ~30 redraws a second
    this.mapT = (this.mapT || 0) + dt;
    if (this.mapT >= 1 / 32 || dt === 0) { this.drawMap(game, camYaw, this.mapT); this.mapT = 0; }
    if (fpsInfo) this.el.fps.textContent = fpsInfo;
  }
}

HUD.prototype.updateEye = function updateEye(game, view) {
  const el = this.el.eye;
  if (!el) return;
  const sam = game.indoor ? game.indoors.samuel : null;
  const p = game.player;
  let vis = false;
  if (sam && Math.hypot(p.x - sam.ped.x, p.z - sam.ped.z) < 16) {
    const h = sam.head, tmp = this.eyeTmp || (this.eyeTmp = {});
    const standing = sam.ped.state !== 'lounge';
    view.project(sam.ped.x, standing ? sam.ped.y + 2.45 : h[1] + 0.62, standing ? sam.ped.z : h[2], tmp);
    if (tmp.visible) {
      vis = true;
      el.style.transform = `translate(${tmp.x}px, ${tmp.y}px)`;
      const st = sam.icon;
      if (st !== this.eyeState) {
        this.eyeState = st;
        el.className = st;
        el.querySelector('span').innerHTML = st === 'phone' ? '…' : st === 'warn' ? '?' : st === 'caught' ? '!' : EYE;
      }
      el.style.setProperty('--m', sam.meter.toFixed(3));
    }
  }
  if (el.hidden === vis) el.hidden = !vis;
};

function streetAt(x, z) {
  let name = null;
  for (const r of ROADS) {
    if (Math.abs(x - r) < 7.5 && Math.abs(z) < RING + 2) {
      const onCross = ROADS.some((q) => Math.abs(z - q) < 7.5);
      if (!onCross) name = STREET_NAMES.x[r];
    }
    if (Math.abs(z - r) < 7.5 && Math.abs(x) < RING + 2) {
      const onCross = ROADS.some((q) => Math.abs(x - q) < 7.5);
      if (!onCross) name = STREET_NAMES.z[r];
    }
  }
  return name;
}
