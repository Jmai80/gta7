// Side quest "Fyrvaktarens kasse" (v0.6.1). Once the north bridge is open, Yasmin at Hörnlivs on
// Kungsgatan texts you: her old friend Ingvar keeps the lighthouse out on Norrholmen, and he has
// been stuck there the whole time the bridge was closed. Walk into the shop, talk to her at the
// till and take the bag – coffee, milk, his crossword and twelve eggs – out to the lighthouse.
// Every hard knock on the way cracks eggs; each egg that arrives whole is worth a bit extra.
import { WHO, LIVS_REWARD, EGG_BONUS, EGGS, INGVAR } from './config.js';
import { SHOP } from './shop.js';
import { Ped } from './peds.js';
import { fmt } from './rng.js';

const YASMIN_LOOK = { shirt: 0x2f8f83, pants: 0x2b2d36, skin: 0xb98a64, hair: 0x1e1612, height: 0.97, bulk: 1.0 };
const INGVAR_LOOK = { shirt: 0x2b3d5c, pants: 0x3b3f46, skin: 0xe9c3a6, hair: 0xd8d8d8, height: 1.0, bulk: 1.15 };
const YASMIN = { who: 'Yasmin', letter: 'Y', color: '#ff6fae' };
const KEEPER = { who: 'Fyrvaktaren Ingvar', letter: 'I', color: '#5b8fd6' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };
const MEET_R = 3.0;     // walk up this close to Ingvar to hand over the bag
const CRACK_AT = 3.5;   // a knock harder than this cracks eggs

export function yasminPages() {
  return [
    { ...YASMIN, text: 'Där är du ju! Välkommen till Hörnlivs. Du ser ut som någon som inte är rädd för en tur ut till Norrholmen.' },
    { ...YASMIN, text: 'Min gamle vän Ingvar är fyrvaktare där ute. Han har suttit fast på ön hela tiden som norra bron var stängd.' },
    { ...YASMIN, text: 'Han har levt på knäckebröd och sill i månader, stackarn. Så jag har packat en kasse: kaffe, mjölk, hans korsord – och ett dussin ägg.' },
    { ...YOU, text: 'Ägg? Hela vägen ut till fyren?' },
    { ...YASMIN, fx: 'bag', text: 'Just därför ska du köra försiktigt. Varje ägg som kommer fram helt är värt femtio kronor extra.' },
    { ...YASMIN, text: 'Fyren står längst ut på öns nordöstra udde. Ingvar bor i den lilla stugan bredvid. Hälsa från mig!', last: 'JAG FIXAR DET' },
  ];
}

export function ingvarPages(eggs) {
  let verdict;
  if (eggs === EGGS) verdict = 'Tolv hela ägg! Du kör ju som en ambulans med en gräddtårta i baksätet.';
  else if (eggs >= 8) verdict = `${eggs} hela ägg. Några fick sätta livet till, men det räcker till pannkakor.`;
  else if (eggs >= 1) verdict = `${eggs} ${eggs === 1 ? 'helt ägg' : 'hela ägg'}… och resten är äggröra. Det blir en tunn omelett i kväll.`;
  else verdict = 'Äggröra. Hela kartongen. Nåja – kaffet klarade sig i alla fall!';
  return [
    { ...KEEPER, text: 'Nämen! Besök! Ingen har varit här ute sedan bron stängdes. Är det där… Yasmins kasse?' },
    { ...YOU, fx: 'give', text: 'Kaffe, mjölk, korsord och ägg. Hälsningar från Hörnlivs.' },
    { ...KEEPER, text: verdict },
    { ...KEEPER, text: 'Hälsa Yasmin att jag lever. Och en sak till: det lyser i Bullbilens bagerikontor varje natt nu. De håller på med något där borta.' },
    { ...KEEPER, text: 'Här, lite för besväret. Kör försiktigt hem!', last: 'TACK!' },
  ];
}

// the lighthouse keeper: always outside his cottage once you know about him
export function spawnIngvar(game) {
  const ped = new Ped(game, INGVAR_LOOK);
  ped.x = INGVAR.x; ped.z = INGVAR.z; ped.y = game.world.groundHeight(INGVAR.x, INGVAR.z);
  ped.h = ped.standH = INGVAR.h;
  ped.state = 'stand'; ped.keep = true; ped.npc = 'ingvar'; ped.speed = 0.9;
  ped.body.x = ped.x; ped.body.y = ped.y; ped.body.z = ped.z; ped.body.h = ped.h;
  game.peds.add(ped);
  return ped;
}

export class LivsJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'livs';
    this.stage = 'enter';    // enter → shop (talk to Yasmin) → talk → bag (walk out) → carry → meet → done
    this.prompt = null;
    this.bag = false;
    this.eggs = EGGS;
    this.yasmin = null;
    this.crackT = 0;
    this.titleCard = false;  // straight into the shop
  }

  get ingvar() {
    const m = this.mgr;
    if (!m.ingvar || !this.game.peds.list.includes(m.ingvar)) m.ingvar = spawnIngvar(this.game);
    return m.ingvar;
  }

  start() {
    const g = this.game, m = this.mgr;
    m.setObjective('Hörnlivs', 'Kungsgatan');
    g.indoors.enter(() => {
      this.stage = 'shop';
      this.spawnYasmin();
      g.emit('toast', { text: 'Hörnlivs · Kungsgatan', long: false });
      m.later(0.9, () => { if (this.stage === 'shop') this.say('Hej hej! Kom fram till kassan, vännen.'); }, this);
      m.later(1.4, () => g.emit('hint', { id: 'yasmin', touch: 'Gå fram till kassan och tryck PRATA.', keys: 'Gå fram till kassan och tryck E för att prata med Yasmin.' }), this);
    }, 'shop');
  }

  spawnYasmin() {
    const g = this.game, Y = SHOP.yasmin;
    const ped = new Ped(g, YASMIN_LOOK);
    ped.x = Y.x; ped.z = Y.z; ped.y = g.world.groundHeight(Y.x, Y.z);
    ped.h = ped.standH = Y.h;
    ped.state = 'stand'; ped.keep = true; ped.npc = 'yasmin';
    ped.body.x = ped.x; ped.body.y = ped.y; ped.body.z = ped.z; ped.body.h = ped.h;
    g.peds.add(ped);
    this.yasmin = ped;
  }

  removeYasmin() {
    if (!this.yasmin) return;
    const L = this.game.peds.list, i = L.indexOf(this.yasmin);
    if (i >= 0) L.splice(i, 1);
    this.yasmin = null;
  }

  say(text, who = this.yasmin) { if (who) this.game.emit('say', { who, text }); }

  update(dt) {
    const g = this.game, m = this.mgr, p = g.player, ind = g.indoors;
    this.prompt = null;
    if (this.crackT > 0) this.crackT -= dt;
    if (this.stage === 'enter' || this.stage === 'talk' || this.stage === 'meet' || this.stage === 'done') return;
    if (this.stage === 'shop' || this.stage === 'bag') {
      if (!ind.inside && !ind.busy) { // out on Kungsgatan again
        this.removeYasmin();
        if (!this.bag) { m.quit(this, [WHO.yasmin, 'Titta in när du har tid! Kassen står kvar på disken.']); return; }
        this.carry();
        return;
      }
      if (!this.yasmin) return;
      // Yasmin keeps an eye on you while you browse
      this.yasmin.standH = Math.atan2(p.x - this.yasmin.x, p.z - this.yasmin.z);
      if (this.stage === 'shop') {
        const near = p.state === 'foot' && !p.frozen && Math.hypot(p.x - SHOP.talk.x, p.z - SHOP.talk.z) < SHOP.talk.r;
        if (near) this.prompt = 'PRATA';
        m.setObjective('Prata med Yasmin', 'Vid kassan');
      } else m.setObjective('Gå ut med kassen', 'Dörren mot Kungsgatan');
      return;
    }
    // carry: out to the lighthouse
    const ing = this.ingvar;
    if ((ing.state === 'walk' || ing.state === 'idle') && Math.hypot(ing.x - p.x, ing.z - p.z) > 40) { // knocked over and wandered off
      ing.state = 'stand'; ing.x = INGVAR.x; ing.z = INGVAR.z; ing.standH = INGVAR.h;
    }
    const d = Math.hypot(p.x - ing.x, p.z - ing.z);
    const car = p.inCar ? p.car : null;
    m.setObjective('Kör kassen till fyren', `Norrholmen · ${this.eggs} ${this.eggs === 1 ? 'helt ägg' : 'hela ägg'}`);
    if (d < 25 && ing.state === 'stand') ing.standH = Math.atan2(p.x - ing.x, p.z - ing.z);
    if (d < 25 && !this.waved) { this.waved = true; this.say('Hallå! Är det till mig?', ing); }
    if (car && d < 9 && !this.footHint) {
      this.footHint = true;
      g.emit('toast', { text: car.spec.bike ? 'Kliv av cykeln och gå fram till Ingvar med kassen.' : 'Kliv ur och gå fram till Ingvar med kassen.', long: true });
    }
    if (!car && p.state === 'foot' && !p.frozen && d < MEET_R && (ing.state === 'stand' || ing.state === 'angry')) this.meet();
  }

  interact() {
    if (this.prompt !== 'PRATA' || this.stage !== 'shop') return false;
    const g = this.game, p = g.player;
    this.stage = 'talk';
    this.prompt = null;
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(this.yasmin.x - p.x, this.yasmin.z - p.z);
    g.emit('talk', { id: this.id, pages: yasminPages() });
    return true;
  }

  talkFx(fx) {
    if (fx === 'bag') { this.bag = true; this.game.emit('bag', {}); }
  }

  talkDone() {
    const g = this.game, m = this.mgr, p = g.player;
    if (this.stage === 'talk') {
      this.stage = 'bag';
      p.frozen = false;
      g.emit('toast', { text: `Du har kassen – ${EGGS} ägg. Varje krock knäcker några!`, long: true });
      m.later(1.2, () => this.say('Lycka till! Och se upp för Bullbilen.'), this);
      return;
    }
    if (this.stage === 'meet') this.finish();
  }

  // out of the shop with the bag
  carry() {
    const g = this.game, m = this.mgr;
    this.stage = 'carry';
    void this.ingvar; // he is out by his cottage
    m.later(0.8, () => g.emit('hint', { id: 'eggs', touch: 'Följ den gula linjen till fyren. Krocka inte – äggen spricker!', keys: 'Följ den gula linjen till fyren. Krocka inte – äggen spricker!' }), this);
  }

  // every hard knock on the way cracks eggs (the car, the bike, a hard landing)
  onCrash(e) {
    if (this.stage !== 'carry' || !e.player || this.eggs <= 0 || this.crackT > 0) return;
    if (e.impact < CRACK_AT) return;
    const n = Math.min(this.eggs, Math.max(1, Math.ceil((e.impact - CRACK_AT + 0.5) / 2.5)));
    this.eggs -= n;
    this.crackT = 0.6;
    this.game.stats.eggsCracked = (this.game.stats.eggsCracked || 0) + n;
    const left = this.eggs ? `${this.eggs} ${this.eggs === 1 ? 'helt' : 'hela'} kvar.` : 'Alla är krossade!';
    this.game.emit('toast', { text: `Krasch! ${n} ${n === 1 ? 'ägg sprack' : 'ägg sprack'}. ${left}`, long: false });
    this.game.emit('eggs', { left: this.eggs, cracked: n });
  }

  // at the cottage: Ingvar takes the bag
  meet() {
    const g = this.game, m = this.mgr, p = g.player, ing = this.ingvar;
    this.stage = 'meet';
    p.frozen = true; p.vx = p.vz = 0;
    p.h = Math.atan2(ing.x - p.x, ing.z - p.z);
    ing.standH = ing.h = Math.atan2(p.x - ing.x, p.z - ing.z);
    ing.body.h = ing.h;
    const line = Math.atan2(ing.x - p.x, ing.z - p.z);
    g.camFocus = { x: (p.x + ing.x) / 2, y: 0.35, z: (p.z + ing.z) / 2, yaw: line - 0.6, owner: 'livs', near: true };
    m.later(0.8, () => g.emit('talk', { id: this.id, pages: ingvarPages(this.eggs) }), this);
  }

  finish() {
    const g = this.game, m = this.mgr;
    this.stage = 'done';
    const amount = LIVS_REWARD + this.eggs * EGG_BONUS;
    g.stats.eggsDelivered = this.eggs;
    m.complete(this, { title: 'SIDOUPPDRAG KLART', sub: 'Fyrvaktarens kasse', amount });
    if (this.eggs) m.later(3.9, () => g.emit('toast', { text: `${this.eggs} hela ägg × ${EGG_BONUS} kr = ${fmt(this.eggs * EGG_BONUS)} kr extra`, long: true }));
    m.sms(WHO.yasmin, this.eggs === EGGS
      ? 'Ingvar ringde! Tolv hela ägg, sa han, och lät gladare än på flera månader. Tack, du är en ängel!'
      : 'Ingvar ringde och lät gladare än på flera månader. Tack för hjälpen – nästa kaffe på Hörnlivs bjuder jag på!', 8);
  }

  targets(T) {
    const g = this.game;
    if ((this.stage === 'shop' || this.stage === 'talk') && this.yasmin) {
      T.push({ kind: 'contact', x: this.yasmin.x, z: this.yasmin.z, r: 1, letter: 'Y', color: '#ff6fae', badgeOnly: true, badgeY: 2.6, ref: this.yasmin });
    } else if (this.stage === 'bag' && g.indoors.inside) {
      T.push({ kind: 'item', x: SHOP.door.x, y: SHOP.y + 0.9, z: SHOP.door.z, gps: false });
    } else if (this.stage === 'carry') {
      const ing = this.ingvar;
      T.push({ kind: 'contact', x: ing.x, z: ing.z, r: 1, letter: 'I', color: '#5b8fd6', badgeOnly: true, badgeY: 2.75, ref: ing });
      T.push({ kind: 'zone', x: INGVAR.x, z: INGVAR.z, r: MEET_R, gps: true });
    }
  }

  cleanup() {
    const g = this.game;
    this.prompt = null;
    g.player.frozen = false;
    if (g.camFocus && g.camFocus.owner === 'livs') g.camFocus = null;
    if (!g.indoors.inside) this.removeYasmin();
  }
}
