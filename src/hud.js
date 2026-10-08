// Heads-up display: minimap with GPS, money, objective, phone messages, banners,
// speech bubbles, speedometer and context buttons. Plain DOM + one 2D canvas.
import { fmt } from './rng.js';
import { STREET_NAMES, ROADS, RING } from './config.js';
import { PAINTS } from './vehicle.js';

const MAP_RANGE = 170, MAP_PX = 2;

export class HUD {
  constructor(root, layout) {
    this.root = root;
    const $ = (id) => root.querySelector('#' + id);
    this.el = {
      hud: $('hud'), map: $('map'), money: $('money'), stars: $('stars'), objective: $('objective'), objText: $('objText'),
      phone: $('phone'), street: $('street'), carinfo: $('carinfo'), speed: $('speed'), cond: $('condBar'), condWrap: $('cond'),
      banner: $('banner'), toast: $('toast'), hint: $('hint'), bubbles: $('bubbles'), fps: $('fps'),
      bAction: $('bAction'), bExit: $('bExit'), touch: $('touch'), keyhint: $('keyhint'),
      objSub: $('objSub'), count: $('count'), fade: $('fade'),
    };
    this.layout = layout;
    this.ctx = this.el.map.getContext('2d');
    this.mapImg = this.buildMap(layout);
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
    const S = MAP_RANGE * 2 * MAP_PX;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const P = (v) => (v + MAP_RANGE) * MAP_PX;
    g.fillStyle = '#244f5c'; g.fillRect(0, 0, S, S);
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
    g.fillRect(P(35), P(-200), 10 * MAP_PX, 75 * MAP_PX);
    g.fillRect(P(-200), P(-45), 75 * MAP_PX, 10 * MAP_PX);
    g.fillStyle = '#d2342c';
    g.fillRect(P(34), P(-179), 12 * MAP_PX, 2 * MAP_PX);
    g.fillRect(P(-179), P(-46), 2 * MAP_PX, 12 * MAP_PX);
    // pond + pitch
    const z = L.zones;
    if (z.pond) { g.fillStyle = '#2f6a76'; g.beginPath(); g.arc(P(z.pond.x), P(z.pond.z), z.pond.r * MAP_PX, 0, 7); g.fill(); }
    if (z.pitch) { g.fillStyle = '#5c9a45'; g.fillRect(P(z.pitch.x0), P(z.pitch.z0), (z.pitch.x1 - z.pitch.x0) * MAP_PX, (z.pitch.z1 - z.pitch.z0) * MAP_PX); }
    return c;
  }

  routeTo(game, tx, tz) {
    // BFS over the intersection graph from the node nearest the player to the node nearest the target
    const nodes = game.layout.nodes;
    const near = (x, z) => { let b = 0, bd = 1e9; for (const n of nodes) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; b = n.id; } } return b; };
    const p = game.player;
    const s = near(p.x, p.z), t = near(tx, tz);
    const prev = new Array(nodes.length).fill(-1);
    const seen = new Array(nodes.length).fill(false);
    const q = [s]; seen[s] = true;
    while (q.length) {
      const u = q.shift();
      if (u === t) break;
      for (let d = 0; d < 4; d++) {
        const v = nodes[u].nbr[d];
        if (v >= 0 && !seen[v]) { seen[v] = true; prev[v] = u; q.push(v); }
      }
    }
    const path = [];
    for (let v = t; v !== -1; v = prev[v]) path.unshift(nodes[v]);
    return [[p.x, p.z], ...path.map((n) => [n.x, n.z]), [tx, tz]];
  }

  drawMap(game, camYaw, dt) {
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
    g.drawImage(this.mapImg, -(p.x + MAP_RANGE) * MAP_PX * s, -(p.z + MAP_RANGE) * MAP_PX * s, this.mapImg.width * s, this.mapImg.height * s);
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
    let goal = null, gd = 1e9;
    for (const t of T) {
      if (!t.gps) continue;
      const d = Math.hypot(t.x - p.x, t.z - p.z);
      if (d < gd) { gd = d; goal = t; }
    }
    if (goal) {
      this.routeT -= dt;
      if (this.routeT <= 0 || !this.route || this.routeGoal !== goal.x + ',' + goal.z) {
        this.route = this.routeTo(game, goal.x, goal.z); this.routeT = 0.5; this.routeGoal = goal.x + ',' + goal.z;
      }
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
      else if (t.kind === 'racer') blip(t.car.x, t.car.z, hex(PAINTS[t.car.paint].hex), 4.2 * u, t.car.paint === 'black' ? '#ffffff' : '#111317');
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

  pushSms(from, text, color) { this.sms.push({ from, text, color }); }

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
      if (this.smsT <= 0) { this.el.phone.classList.remove('show'); this.smsShown = null; this.smsGap = 0.45; }
    } else if (this.sms.length) {
      this.smsGap = (this.smsGap || 0) - dt;
      if (this.smsGap <= 0) {
        const m = this.sms.shift();
        this.smsShown = m;
        const el = this.el.phone;
        el.querySelector('.who').textContent = m.from;
        const av = el.querySelector('.av');
        av.textContent = m.from.trim()[0];
        av.classList.toggle('sys', m.from === 'GTA 7');
        av.style.background = m.color || '';
        el.querySelector('.msg').textContent = m.text;
        el.hidden = false;
        el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
        this.smsT = Math.min(9, 3.2 + m.text.length * 0.05);
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
    const mode = car ? 'car' : 'foot';
    if (mode !== this.mode) { this.mode = mode; this.root.classList.toggle('in-car', mode === 'car'); }
    let label = '';
    if (!car && p.near) label = p.near.driver ? 'STJÄL' : 'KLIV IN';
    if (label !== this.actionLabel) {
      this.actionLabel = label;
      this.el.bAction.textContent = label;
      this.el.bAction.hidden = !label;
      this.el.keyhint.hidden = !label;
      this.el.keyhint.innerHTML = label ? `<kbd>E</kbd> ${label === 'STJÄL' ? 'Stjäl bilen' : 'Kliv in'}` : '';
    }
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
