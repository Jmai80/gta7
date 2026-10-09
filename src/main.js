// Boot, main loop and glue between simulation, view, HUD, input and audio.
import { Vector3 } from './three.js';
import { Game } from './game.js';
import { View } from './render.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { AudioFX } from './audio.js';
import { createLayout } from './layout.js';
import { CAR_TYPES } from './vehicle.js';
import { fmt, mmss } from './rng.js';

const $ = (id) => document.getElementById(id);
const FIXED = 1 / 60;
const IDLE = { moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true, camYaw: Math.PI };
const QUALITY_LABEL = { auto: 'Auto', saver: 'Batterisnål', pretty: 'Snygg' };

let layout, game, view, hud, input, audio;
let state = 'loading';          // loading | title | play | pause | offer | log | talk | end
let offerId = null, pendingOffer = null;
let talk = null, pendingTalk = null; // a conversation on screen: { id, pages, i, at }
const TALK_CAM = { camDX: 0 };       // the camera keeps easing in while people talk
let camYaw = Math.PI;
let acc = 0, lastRender = 0;
let wakeLock = null;
const settings = loadSettings();

function loadSettings() {
  const def = { sound: true, quality: 'auto', fps: false, drive: 'stick' };
  try { return { ...def, ...JSON.parse(localStorage.getItem('gta7-settings') || '{}') }; } catch (_) { return def; }
}
function saveSettings() {
  try { localStorage.setItem('gta7-settings', JSON.stringify(settings)); } catch (_) { /* storage blocked */ }
}

// progress (money, finished missions, stats) stays on the phone between visits
const SAVE_KEY = 'gta7-progress';
function loadProgress() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    return d && d.v === 2 ? d : null;
  } catch (_) { return null; }
}
function saveProgress() {
  if (!game || !game.missionActive) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game.mission.progress())); } catch (_) { /* storage blocked */ }
}
function clearProgress() {
  try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* storage blocked */ }
}
const JOBS = ['lasse', 'pizza', 'race', 'samuel', 'overlamning'];
const JOBS_DONE = (d) => JOBS.filter((id) => d.done.includes(id)).length;

// ---------------------------------------------------------------- performance
const perf = {
  cap: 60, ema: 16.7, lowT: 0, goodT: 0, cool: 0, min: 0.7, max: 2, q: 'auto', frames: 0, t: 0, fps: 60,
  apply(q) {
    this.q = q;
    const dev = window.devicePixelRatio || 1;
    if (q === 'saver') { this.cap = 30; this.max = Math.min(dev, 1); view.setDpr(Math.min(dev, 0.85)); view.setFog(55, 190); }
    else if (q === 'pretty') { this.cap = 60; this.max = Math.min(dev, 2); view.setDpr(this.max); view.setFog(95, 330); }
    else { this.cap = 60; this.max = Math.min(dev, 2); view.setDpr(Math.min(dev, 1.35)); view.setFog(80, 285); }
    this.lowT = this.goodT = 0; this.cool = 2;
  },
  sample(dtRaw) {
    const ms = dtRaw * 1000;
    this.frames++; this.t += dtRaw;
    if (this.t >= 0.5) { this.fps = Math.round(this.frames / this.t); this.frames = 0; this.t = 0; }
    if (ms > 250 || this.q !== 'auto') return;
    this.ema = this.ema * 0.93 + ms * 0.07;
    this.cool -= dtRaw;
    if (this.ema > 22) { this.lowT += dtRaw; this.goodT = 0; } else if (this.ema < 17.8) { this.goodT += dtRaw; this.lowT = 0; }
    if (this.lowT > 1.2 && view.dpr > this.min) {
      view.setDpr(Math.max(this.min, view.dpr * 0.85));
      this.lowT = 0; this.ema = 16.7; this.cool = 20;
    } else if (this.goodT > 4 && this.cool <= 0 && view.dpr < this.max) {
      view.setDpr(Math.min(this.max, view.dpr + 0.15));
      this.goodT = 0;
    }
  },
};

// ---------------------------------------------------------------- boot
async function fontsReady(ms) {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 40px "Big Shoulders Display"'), document.fonts.load('900 40px "Big Shoulders Display"')]),
      new Promise((r) => setTimeout(r, ms)),
    ]);
  } catch (_) { /* fall back to system fonts */ }
}

async function boot(hot) {
  await fontsReady(1800);
  layout = createLayout(7);
  try {
    view = new View($('c'), layout);
  } catch (err) {
    $('loading').querySelector('p').textContent = 'Din webbläsare kunde inte starta 3D-grafiken (WebGL2). Prova Chrome, Safari eller Firefox i senaste version.';
    throw err;
  }
  game = new Game({ layout, settings, missionActive: false });
  hud = new HUD($('game'), layout);
  input = new Input($('game'), { stickEl: $('stick'), knobEl: $('knob'), onKind: (k) => { hud.setKind(k); setTitleControls(k); } });
  hud.setKind(input.lastKind);
  setTitleControls(input.lastKind);
  audio = new AudioFX();
  audio.muted = !settings.sound;
  hud.onSms = () => audio.ping();
  hud.onOffer = (id) => openOffer(id);
  hud.onLog = () => openLog();
  wire(game);
  perf.apply(settings.quality);
  refreshMenu();
  new ResizeObserver(() => { view.resize(); hud.resize(); }).observe($('c'));
  window.addEventListener('orientationchange', () => setTimeout(() => { view.resize(); hud.resize(); }, 250));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (state === 'play') pause(); saveProgress(); audio.suspend(); }
    else { audio.resume(); if (state === 'play') requestWake(); }
  });
  bindUi();
  document.addEventListener('fullscreenchange', () => { refreshMenu(); setTimeout(() => { view.resize(); hud.resize(); }, 120); });
  $('loading').hidden = true;
  if (hot && hot.v === 2) {
    restoreInto(game, hot);
    startPlay(true);
  } else {
    state = 'title';
    $('title').hidden = false;
    const tip = $('iosTip');
    if (tip && isIOS() && !isStandalone()) tip.hidden = false;
    const saved = loadProgress();
    const info = $('saveInfo');
    if (saved && info) {
      info.textContent = `Sparat spel: ${JOBS_DONE(saved)} av ${JOBS.length} uppdrag klara · ${fmt(saved.money)} kr`;
      info.hidden = false;
    }
    view.setFog(170, 520);
  }
  lastRender = performance.now();
  requestAnimationFrame(frame);
  window.claude?.hot?.snapshot?.(() => (game ? game.snapshot() : {}));
}

function restoreInto(g, data) {
  if (!g.mission.restore(data)) return false;
  hud.setMoney(g.money); hud.moneyShown = g.money; $('money').textContent = `${fmt(g.money)} kr`;
  return true;
}

function wire(g) {
  g.on('sms', (e) => hud.pushSms(e.from, e.text, e.color, e.offer));
  g.on('offer', (e) => { pendingOffer = e.id; }); // face to face: the card opens after this frame's steps
  g.on('talk', (e) => { pendingTalk = e; });      // a conversation (the bench on the pier), same way
  g.on('tracked', () => hud.flashMap());
  g.on('objective', (e) => hud.objective(e.text));
  g.on('banner', (e) => {
    hud.banner(e.title, e.sub, e.amount, e.kind);
    if (e.kind === 'fail') { audio.fail(); buzz([80, 60, 80]); }
    else if (e.kind !== 'start') { audio.missionPassed(); buzz([30, 60, 30]); }
  });
  g.on('money', (e) => { hud.setMoney(e.total); if (e.delta > 0) setTimeout(() => audio.cash(), 650); });
  g.on('progress', () => saveProgress());
  g.on('fade', (e) => hud.fade(e.on));
  g.on('teleport', (e) => { view.rig.yaw = e.car.h; view.rig.manual = 0; view.rig.k = 1; });
  g.on('warp', (e) => { view.rig.yaw = e.h; view.rig.manual = 0; view.rig.k = 1; view.rig.blend = 1; }); // in or out of the tower
  g.on('keys', () => audio.jingle());
  g.on('caught', () => { audio.caught(); buzz([60, 40, 120]); });
  g.on('countdown', (e) => { hud.countdown(e.text, e.go); if (e.text) { audio.beep(e.go); buzz(e.go ? 60 : 25); } });
  g.on('checkpoint', () => audio.checkpoint());
  g.on('hint', (e) => hud.hint(e));
  g.on('toast', (e) => hud.toast(e.text, e.long));
  g.on('wanted', (e) => { hud.stars(e.stars); if (e.stars) audio.wanted(); });
  g.on('say', (e) => hud.say(e.who, e.text));
  g.on('honk', (e) => {
    const d = Math.hypot(e.car.x - view.camera.position.x, e.car.z - view.camera.position.z);
    audio.honk(d);
    if (Math.random() < 0.55) hud.say(e.car, pick(['TUUUT!', 'Flytta på dig!', 'Hallå?!', 'Gå undan!', 'Vi har bråttom!']));
  });
  g.on('crash', (e) => {
    const d = Math.hypot(e.x - view.camera.position.x, e.z - view.camera.position.z);
    audio.crash(e.impact, e.player ? 1 : Math.max(0, 1 - d / 60));
    if (e.player) { view.rig.shake = Math.min(1.1, e.impact * 0.05); if (e.impact > 6) buzz(Math.min(60, e.impact * 3)); }
    if (e.impact > 6 && d < 80) view.sparks(e.x, 0.7, e.z, Math.min(14, Math.round(e.impact * 0.7)));
  });
  g.on('enterCar', (e) => { audio.door(); hud.street(CAR_TYPES[e.car.type].name); });
  g.on('exitCar', () => audio.door());
  g.on('horn', (e) => audio.horn(e.on));
  g.on('pedHit', (e) => { audio.thud(0.8); if (e.car === g.player.car) g.stats.pedsKnocked++; });
  g.on('playerHit', () => { audio.thud(1); view.rig.shake = 0.6; buzz(40); });
  g.on('stunt', (e) => { audio.stunt(); hud.banner('STUNTHOPP!', `${e.dist} meter i luften`, e.amount); });
  g.on('land', (e) => { if (e.impact > 2.5) { audio.thud(Math.min(1, e.impact / 9)); view.rig.shake = Math.min(0.8, e.impact * 0.05); } });
  g.on('wash', (e) => { view.washing = e.on; audio.washing(e.on); });
  g.on('endcard', (e) => showEnd(e.stats));
}

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (_) { /* not allowed */ } }

async function requestWake() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => (wakeLock = null)); } } catch (_) { /* refused */ }
}

// ---------------------------------------------------------------- states
// Phones: go full screen when the game starts (Android Chrome & co). iPhone Safari has no
// full screen API for pages – there the home-screen icon gives the same effect.
function isStandalone() {
  return matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
}
function tryFullscreen() {
  const el = document.documentElement;
  const touch = matchMedia('(pointer: coarse)').matches;
  if (!touch || isStandalone() || document.fullscreenElement || !document.fullscreenEnabled || !el.requestFullscreen) return;
  try { el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (_) { /* not allowed here */ }
}
function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function startPlay(skipIntro = false) {
  if (!skipIntro) {
    tryFullscreen();
    const saved = loadProgress();
    if (saved) restoreInto(game, saved);
  }
  audio.init();
  audio.setMuted(!settings.sound);
  requestWake();
  $('title').hidden = true;
  $('hud').hidden = false;
  input.enabled = true;
  if (!skipIntro) { game.missionActive = true; game.mission.t = 0; }
  else game.missionActive = true;
  view.rig.yaw = game.player.h;
  view.rig.startBlend();
  perf.apply(settings.quality);
  state = 'play';
  hud.hint({ id: 'move', touch: 'Dra med vänster tumme för att gå. Dra på höger sida för att titta runt.', keys: 'Gå med WASD eller piltangenterna. Dra med musen för att titta runt.' });
}

function pause() {
  if (state !== 'play') return;
  state = 'pause';
  input.releaseAll();
  audio.horn(false);
  saveProgress();
  renderMissionList();
  armRestart(false);
  $('pausemenu').hidden = false;
  audio.suspend();
}

const QUEST_STATE = { active: 'Pågår', tracked: 'Följer', new: 'Nytt', waiting: 'Väntar', soon: 'Kommer snart', done: 'Klart' };

// the quests you know about and how far you have come with them
function renderMissionList() {
  const el = $('mList');
  if (!el) return;
  el.innerHTML = '';
  for (const m of game.mission.list()) {
    const li = document.createElement('li');
    li.className = 'm-' + m.state;
    const b = document.createElement('b'); b.textContent = m.letter; b.style.background = m.color;
    const t = document.createElement('span'); t.textContent = m.title;
    const st = document.createElement('em'); st.textContent = m.state === 'done' ? '✓' : QUEST_STATE[m.state];
    li.append(b, t, st);
    el.append(li);
  }
  const li = document.createElement('li');
  li.className = 'm-more';
  const more = document.createElement('button');
  more.type = 'button'; more.textContent = 'Välj uppdrag ›';
  more.addEventListener('click', (e) => { e.preventDefault(); openLog(); });
  li.append(more);
  el.append(li);
}

// ---------------------------------------------------------------- quest offers and the quest log
// both pause the game while they are open
function enterMenu(s) {
  state = s;
  input.releaseAll();
  audio.horn(false);
  audio.suspend();
}
function leaveMenu() {
  state = 'play';
  input.read(); // forget keys pressed while the menu was open (Esc, Enter…)
  lastRender = performance.now();
  audio.resume();
}

function openOffer(id) {
  if (state !== 'play') return;
  const q = game.mission.info(id);
  if (!q || game.mission.done.has(id)) return;
  offerId = id;
  const av = $('ofAv');
  av.textContent = q.letter; av.style.background = q.color;
  $('ofWho').textContent = q.who;
  $('ofKind').textContent = q.main ? 'Huvuduppdrag' : q.side ? 'Sidouppdrag' : 'Uppdrag';
  $('ofTitle').textContent = q.title.toUpperCase();
  $('ofText').textContent = q.text;
  $('ofReward').textContent = q.reward;
  $('ofWhere').textContent = q.where;
  const busy = $('ofBusy');
  busy.hidden = !q.busy;
  busy.textContent = q.busy ? `Du kör ${q.busy} just nu. Accepterar du följer du det här uppdraget när det är klart.` : '';
  enterMenu('offer');
  $('offer').hidden = false;
  try { $('ofAccept').focus({ preventScroll: true }); } catch (_) { /* old browsers */ }
}

function answerOffer(accept) {
  if (state !== 'offer') return;
  const id = offerId;
  offerId = null;
  $('offer').hidden = true;
  if (id) { if (accept) game.mission.accept(id); else game.mission.wait(id); }
  leaveMenu();
}

function openLog() {
  if (state !== 'play' && state !== 'pause') return;
  $('pausemenu').hidden = true;
  game.mission.markSeen();
  renderLog();
  enterMenu('log');
  $('log').hidden = false;
}

function closeLog() {
  if (state !== 'log') return;
  $('log').hidden = true;
  leaveMenu();
}

function renderLog() {
  const ul = $('qList');
  ul.innerHTML = '';
  const list = game.mission.list();
  for (const q of list) {
    const li = document.createElement('li');
    li.className = 's-' + q.state;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'q';
    const badge = document.createElement('b'); badge.textContent = q.letter; badge.style.background = q.color;
    const t = document.createElement('span'); t.className = 't';
    const title = document.createElement('strong'); title.textContent = q.title;
    const line = document.createElement('small'); line.textContent = `${q.who}${q.main ? ' · huvuduppdrag' : q.side ? ' · sidouppdrag' : ''} · ${q.line}`;
    t.append(title, line);
    const st = document.createElement('em'); st.textContent = q.state === 'done' ? 'Klart ✓' : QUEST_STATE[q.state];
    btn.append(badge, t, st);
    btn.disabled = q.state === 'done' || q.state === 'soon';
    btn.addEventListener('click', (e) => { e.preventDefault(); pickQuest(q); });
    li.append(btn);
    ul.append(li);
  }
  const msg = $('logMsg');
  msg.hidden = list.length > 0;
  msg.textContent = list.length ? '' : 'Inga uppdrag än. Håll utkik efter sms!';
}

// follow the quest you tapped (the GPS line shows up at once)
function pickQuest(q) {
  if (q.state === 'done' || q.state === 'soon') return;
  if (q.state !== 'active') game.mission.accept(q.id);
  closeLog();
}

// ---------------------------------------------------------------- conversations
// A dialogue box at the bottom of the screen, a page at a time (tap, or Enter/Space/E). The game
// waits meanwhile; only the camera keeps moving. The job is told when a page shows (fx) and when
// the last one is done.
function openTalk(e) {
  if (state !== 'play' || !e.pages || !e.pages.length) return;
  talk = { id: e.id, pages: e.pages, i: -1, at: 0 };
  enterMenu('talk');
  audio.resume(); // the harbour stays audible (and the keys jingle)
  try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (_) { /* nothing focused */ }
  $('game').classList.add('talking');
  $('talk').hidden = false;
  showPage(0);
}

function showPage(i) {
  const p = talk.pages[i];
  talk.i = i;
  talk.at = performance.now();
  const card = $('tkCard');
  card.classList.toggle('you', !!p.you);
  const av = $('tkAv');
  av.textContent = p.letter; av.style.background = p.color;
  $('tkWho').textContent = p.who;
  $('tkText').textContent = p.text;
  const last = i === talk.pages.length - 1;
  $('tkNext').textContent = last ? (p.last || 'OK') : 'FORTSÄTT ›';
  $('tkStep').textContent = `${i + 1} / ${talk.pages.length}`;
  card.classList.remove('turn'); void card.offsetWidth; card.classList.add('turn');
  if (p.fx) game.mission.talkFx(talk.id, p.fx);
}

function nextTalk() {
  if (state !== 'talk' || !talk) return;
  if (performance.now() - talk.at < 260) return; // a double tap does not skip a page
  if (talk.i < talk.pages.length - 1) { showPage(talk.i + 1); return; }
  const id = talk.id;
  closeTalk();
  game.mission.talkDone(id);
}

function closeTalk() {
  talk = null;
  $('talk').hidden = true;
  $('game').classList.remove('talking');
  if (state === 'talk') leaveMenu();
}

// "Börja om" wipes the saved game, so it asks for a second tap
let restartArmed = false, restartTimer = 0;
function armRestart(on) {
  restartArmed = on;
  clearTimeout(restartTimer);
  const b = $('mRestart');
  b.textContent = on ? 'Tryck igen: radera allt och börja om' : 'Börja om';
  b.classList.toggle('danger', on);
  if (on) restartTimer = setTimeout(() => armRestart(false), 3500);
}

function resume() {
  $('pausemenu').hidden = true;
  $('endcard').hidden = true;
  state = 'play';
  lastRender = performance.now();
  audio.resume();
}

function restart() {
  armRestart(false);
  clearProgress();
  offerId = pendingOffer = null;
  talk = pendingTalk = null;
  $('pausemenu').hidden = true;
  $('endcard').hidden = true;
  $('offer').hidden = true;
  $('log').hidden = true;
  $('talk').hidden = true;
  $('game').classList.remove('talking');
  audio.horn(false); audio.washing(false);
  view.washing = false;
  game = new Game({ layout, settings, missionActive: true });
  wire(game);
  hud.setMoney(0); hud.moneyShown = 0; $('money').textContent = '0 kr';
  hud.objective(''); hud.stars(0); hud.countdown(''); hud.fade(false);
  hud.sms.length = 0; hud.hintsSeen.clear();
  view.rig.yaw = game.player.h;
  view.rig.startBlend();
  state = 'play';
  lastRender = performance.now();
  audio.resume();
}

function showEnd(s) {
  saveProgress();
  const rows = [
    ['Speltid', mmss(s.playTime || 0)],
    ['Pengar', `${fmt(s.money)} kr`],
    ['Bilar stulna', s.carsStolen],
    ['Krockar', s.crashes],
    ['Toppfart', `${Math.round(s.maxSpeed)} km/h`],
    ['Körsträcka', `${(s.driven / 1000).toFixed(1).replace('.', ',')} km`],
    ['Pizzor levererade', s.pizzas || 0],
    ['Gatloppet', s.raceTime != null ? mmss(s.raceTime) : '–'],
  ];
  const grid = $('endStats');
  grid.innerHTML = '';
  for (const [k, v] of rows) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    grid.append(dt, dd);
  }
  $('endcard').hidden = false;
  state = 'end';
  input.releaseAll();
  audio.horn(false);
}

// ---------------------------------------------------------------- UI
function setTitleControls(kind) {
  const el = $('titleControls');
  if (!el) return;
  el.innerHTML = kind === 'touch'
    ? '<span><b>Vänster tumme</b> gå och kör</span><span><b>Höger sida</b> knappar, dra för att titta</span>'
    : '<span><kbd>WASD</kbd> gå och kör</span><span><kbd>E</kbd> stjäl / kliv ur</span><span><kbd>Mellanslag</kbd> handbroms</span><span><kbd>U</kbd> uppdrag</span><span><kbd>Esc</kbd> paus</span>';
}

function refreshMenu() {
  $('mSound').textContent = `Ljud: ${settings.sound ? 'På' : 'Av'}`;
  $('mDrive').textContent = `Körkontroll: ${settings.drive === 'pedals' ? 'Pedaler' : 'Spak'}`;
  $('mQuality').textContent = `Grafik: ${QUALITY_LABEL[settings.quality]}`;
  $('mFps').textContent = `Visa FPS: ${settings.fps ? 'På' : 'Av'}`;
  $('fps').hidden = !settings.fps;
  $('game').classList.toggle('pedals', settings.drive === 'pedals');
  const fs = $('mFull');
  fs.hidden = !document.fullscreenEnabled;
  fs.textContent = document.fullscreenElement ? 'Lämna helskärm' : 'Helskärm';
}

function bindUi() {
  const on = (id, fn) => $(id).addEventListener('click', (e) => { e.preventDefault(); fn(); });
  on('play', () => startPlay());
  $('title').addEventListener('pointerup', (e) => { if (!e.target.closest('button, a') && state === 'title') startPlay(); });
  on('mResume', resume);
  on('mRestart', () => { if (restartArmed) restart(); else armRestart(true); });
  on('mSound', () => { settings.sound = !settings.sound; audio.setMuted(!settings.sound); saveSettings(); refreshMenu(); });
  on('mDrive', () => { settings.drive = settings.drive === 'pedals' ? 'stick' : 'pedals'; game.settings.drive = settings.drive; saveSettings(); refreshMenu(); });
  on('mQuality', () => {
    const order = ['auto', 'saver', 'pretty'];
    settings.quality = order[(order.indexOf(settings.quality) + 1) % order.length];
    perf.apply(settings.quality); saveSettings(); refreshMenu();
  });
  on('mFps', () => { settings.fps = !settings.fps; saveSettings(); refreshMenu(); });
  on('mFull', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('game').requestFullscreen(); } catch (_) { /* not allowed here */ }
    setTimeout(refreshMenu, 300);
  });
  on('eContinue', resume);
  on('eRestart', restart);
  on('ofAccept', () => answerOffer(true));
  on('ofWait', () => answerOffer(false));
  on('logClose', closeLog);
  $('talk').addEventListener('click', (e) => { e.preventDefault(); nextTalk(); }); // anywhere on the screen (the button too)
  window.addEventListener('keydown', (e) => {
    if (state === 'offer' && e.code === 'Escape') { e.preventDefault(); answerOffer(false); }
    else if (state === 'log' && (e.code === 'Escape' || e.code === 'KeyU')) { e.preventDefault(); closeLog(); }
    else if (state === 'talk' && !e.repeat && ['Enter', 'NumpadEnter', 'Space', 'KeyE', 'KeyF', 'KeyJ', 'ArrowRight'].includes(e.code)) { e.preventDefault(); nextTalk(); }
  });
}

// ---------------------------------------------------------------- loop
function frame(now) {
  requestAnimationFrame(frame);
  const minMs = 1000 / perf.cap - 1.5;
  if (now - lastRender < minMs) return;
  const dtRaw = Math.max(0, (now - lastRender) / 1000);
  lastRender = now;
  const dt = Math.min(0.1, dtRaw);
  perf.sample(dtRaw);

  if (state === 'play') {
    const inp = input.read();
    if (inp.pause) { pause(); return; }
    if (inp.log) { openLog(); return; }
    if (inp.answer && hud.smsShown && hud.smsShown.offer) { openOffer(hud.smsShown.offer); return; }
    if (inp.mute) { settings.sound = !settings.sound; audio.setMuted(!settings.sound); saveSettings(); refreshMenu(); }
    inp.camYaw = camYaw;
    inp.touch = input.lastKind === 'touch'; // the street race is kinder to touch drivers
    acc += dt;
    let n = 0;
    while (acc >= FIXED && n < 5 && state === 'play') { game.step(FIXED, inp); inp.action = false; acc -= FIXED; n++; }
    if (n >= 5) acc = 0;
    if (pendingTalk) { const t = pendingTalk; pendingTalk = null; openTalk(t); }
    else if (pendingOffer) { const id = pendingOffer; pendingOffer = null; openOffer(id); }
    camYaw = view.rig.update(dt, game, inp, view.camera.aspect, game.world);
    audio.update(dt, game);
  } else if (state === 'talk') {
    camYaw = view.rig.update(dt, game, TALK_CAM, view.camera.aspect, game.world);
  } else if (state === 'title') {
    acc += dt;
    let n = 0;
    while (acc >= FIXED && n < 3) { game.step(FIXED, IDLE); acc -= FIXED; n++; }
    if (n >= 3) acc = 0;
    view.rig.title(dt);
  }
  const cam = view.camera;
  game.view.x = cam.position.x; game.view.z = cam.position.z;
  cam.getWorldDirection(tmpDir);
  const l = Math.hypot(tmpDir.x, tmpDir.z) || 1;
  game.view.fx = tmpDir.x / l; game.view.fz = tmpDir.z / l; game.view.valid = true;

  const simDt = state === 'play' || state === 'title' ? dt : 0;
  view.sync(game, state === 'talk' ? dt : simDt); // the sea keeps moving while people talk
  if (state !== 'title' && state !== 'loading') {
    const st = settings.fps ? view.stats : null;
    hud.update(simDt, game, view, camYaw, st ? `${perf.fps} fps · ${view.dpr.toFixed(2)}x · ${st.calls} dc · ${(st.tris / 1000).toFixed(0)}k tri` : null);
  }
  view.render();
}
const tmpDir = new Vector3();

// debug handle for automated tests
window.__gta = {
  get game() { return game; }, get view() { return view; }, get state() { return state; }, get perf() { return perf; },
  start: () => startPlay(), pause, resume, restart, openLog, openOffer, nextTalk, get hud() { return hud; }, get talk() { return talk; },
};

const start = (data) => boot(data || {}).catch((e) => console.error(e));
if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
