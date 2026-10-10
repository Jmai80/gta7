// Main quest, part 2: "Överlämningen" (v0.5). The unknown number wants Melker's bike keys, handed
// over on the bench at the far end of the harbour pier. Walk up behind the figure in the dark coat:
// it is tant Gun. She takes the keys and tells you what they are for – and where the story goes
// next (across the north bridge, once it opens).
// The talk is a dialogue overlay (main.js); the game waits while it is open.
import { WHO, HANDOVER_REWARD, PIER_BENCH } from './config.js';

const SPOT = { x: PIER_BENCH.x - 0.3, z: PIER_BENCH.z + 1.5 }; // where you stop, just behind the bench

const ANON = { who: 'Någon på bänken', letter: '?', color: '#ff7a59' };
const GUN = { who: 'Tant Gun', letter: 'G', color: '#c58be0' };
const YOU = { who: 'Du', letter: 'DU', color: '#ffcf33', you: true };

// what is said on the bench, page by page. fx: something that happens when the page shows
// ('keys': you hand them over, 'reveal': the coat comes off).
export function handoverPages(mgr) {
  const flag = mgr.done.has('flag');
  return [
    { ...ANON, text: 'Du kom gående, precis som jag sa. Bra. Har du nycklarna?' },
    { ...YOU, fx: 'keys', text: 'Här. Men vem är du egentligen?' },
    { ...GUN, fx: 'reveal', text: flag
      ? 'Jag skrev att du inte kände mig. Det var nästan sant – du hissade ju min flagga, lilla vän.'
      : 'Jag skrev att du inte kände mig. Det var nästan sant – jag är tanten med flaggstången på Storgatan.' },
    { ...GUN, text: 'Nycklarna går till min Arnes gamla budcykel från Sjuby Konditori. Melker köpte den på loppis för en hundralapp, den dumbommen.' },
    { ...GUN, text: 'Det han inte vet är att Arne gömde receptet på Sjubybullen i cykelramen. Bullbilen har jagat det i trettio år.' },
    { ...YOU, text: 'Bullbilen? Skåpbilarna som kör runt i stan?' },
    { ...GUN, text: 'Just det. ”Nybakat varje dag” – pyttsan. De är bara ute efter Arnes recept.' },
    { ...GUN, text: 'Melker ställde cykeln på andra sidan norra bron innan den stängdes. När bron öppnar hämtar du den åt mig – före Bullbilen.' },
    { ...GUN, text: 'Här, för besväret. Och ta en kanelbulle, såklart.', last: 'TACK!' },
  ];
}

export class HandoverJob {
  constructor(mgr) {
    this.mgr = mgr; this.game = mgr.game; this.id = 'overlamning';
    this.stage = 'walk';     // walk (up to the bench) → wait → talk → done
    this.t = 0;
    this.prompt = null;
    this.titleCard = false;  // straight into the scene, no banner
  }

  start() {
    const g = this.game, m = this.mgr, p = g.player, flag = m.flag, gun = flag.gun;
    if (!gun.away) flag.toPier(); // (she is normally there long before you are)
    p.frozen = true;          // the game walks you the last steps
    p.autoWalk = { x: SPOT.x, z: SPOT.z, speed: 1.4 };
    m.setObjective('Överlämningen', 'Bänken längst ut på bryggan');
    g.camFocus = this.shot();
  }

  // the camera comes in close, from the side (the sunny south-west), on the point between you two –
  // looking out over the harbour toward the north bridge
  shot() {
    const p = this.game.player, gun = this.mgr.flag.gun;
    const line = Math.atan2(gun.x - p.x, gun.z - p.z);
    return { x: (p.x + gun.x) / 2, y: 0.35, z: (p.z + gun.z) / 2, yaw: line - 0.6, owner: 'handover', near: true };
  }

  // you turn to the figure on the bench (and to Gun when she gets up)
  face() {
    const p = this.game.player, gun = this.mgr.flag.gun;
    p.h = Math.atan2(gun.x - p.x, gun.z - p.z);
  }

  update(dt) {
    const g = this.game, p = g.player;
    if (this.stage === 'walk') {
      g.camFocus = this.shot(); // the camera follows you up to the bench
      if (!p.autoWalk) { this.stage = 'wait'; this.t = 0; }
      return;
    }
    this.face();
    if (this.stage === 'wait' && (this.t += dt) > 0.7) {
      this.stage = 'talk';
      g.emit('talk', { id: this.id, pages: handoverPages(this.mgr) });
    }
  }

  // a page of the dialogue shows (the game waits meanwhile, so this happens on screen at once)
  talkFx(fx) {
    const g = this.game, p = g.player;
    if (fx === 'keys') { g.emit('keys', { given: true }); g.stats.keysGiven = true; }
    if (fx === 'reveal') {
      this.mgr.flag.reveal(p.x, p.z);
      this.face();
      p.body.h = p.h;
      if (g.camFocus && g.camFocus.owner === 'handover') g.camFocus = this.shot();
    }
  }

  // the last page: thanks, money and a kanelbulle
  talkDone() {
    if (this.stage !== 'talk') return;
    this.stage = 'done';
    const g = this.game, m = this.mgr;
    m.flag.goodbye();
    m.complete(this, { title: 'HUVUDUPPDRAG KLART', sub: 'Överlämningen', amount: HANDOVER_REWARD });
    m.later(3.8, () => g.emit('toast', { text: 'Tant Gun bjuder på en kanelbulle. Mums!', long: true }));
    m.sms(WHO.gun, 'Spara mitt nummer nu, lilla vän. Och håll ett öga på Bullbilen – de kör runt och spanar.', 8.5);
  }

  targets() {}

  cleanup() {
    const g = this.game;
    this.prompt = null;
    g.player.frozen = false;
    g.player.autoWalk = null;
    if (g.camFocus && g.camFocus.owner === 'handover') g.camFocus = null;
  }
}
