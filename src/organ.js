// The organ in Söderholmens kapell (v1.10). Sit down at it (SPELA) and five keys come up on the
// screen – C, D, E, F and G (main.js draws them from this object and sends your taps back here).
// In the side quest "Kyrkkaffet" kyrkoherde Inga sings a verse first, the keys lighting up as she
// goes, and then you play it back key by key. A wrong key gives a sour note, and she sings that
// verse again. After the third verse the whole chapel sings the tune through once. Once the quest is
// done you can sit down and play whatever you like.
// Pure simulation (no DOM, no sound): the game's clock drives it, and it tells the rest through the
// 'organ' event: { kind: 'demo' | 'play' | 'final' | 'free', k, len } for a note, { kind: 'wrong', k }.

// Beethoven's Ode to Joy – what Arne wanted at the wedding in 1972 (keys: 0 C, 1 D, 2 E, 3 F, 4 G)
export const PSALM = [2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 2, 1, 1];
export const BEATS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2];
export const VERSES = [[0, 4], [0, 8], [8, 15]];   // the first four notes, the whole first line, the second line
export const KEYS = ['C', 'D', 'E', 'F', 'G'];
export const ORGAN = {
  sing: 0.44,    // seconds a beat when Inga sings a verse
  final: 0.5,    // seconds a beat when the whole chapel sings at the end
  intro: 1.1,    // from sitting down to her first note
  wait: 12,      // your turn, but no key for this long: she sings the verse again
  good: 1.2,     // a pause after a verse that went right
  wrong: 1.5,    // and after a wrong key, before she sings it again
};

export class Organ {
  constructor(game) {
    this.game = game;
    this.open = false;      // you sit at it and the keys are on the screen
    this.mode = null;       // 'psalm' (the quest) | 'free'
    this.host = null;       // told about verses, wrong keys and the end: { organVerse(i), organWrong(), organFinale(), organDone() }
    this.reset();
  }

  reset() {
    this.verse = 0; this.mistakes = 0;
    this.phase = 'off';     // off | intro | demo | turn | good | wrong | final | done | free
    this.t = 0; this.pos = 0;
    this.lit = -1; this.litT = 0; this.litKind = null;
    this.sched = null; this.next = 0; this.end = 0;
    this.played = 0;        // notes you have played (free play counts too)
  }

  get notes() { const [a, b] = VERSES[Math.min(this.verse, VERSES.length - 1)]; return PSALM.slice(a, b); }
  get busy() { return this.open; }

  // sit down: the quest's psalm from the verse you got to, or free play
  begin(mode, host = null) {
    this.open = true; this.mode = mode; this.host = host;
    this.t = 0; this.pos = 0; this.lit = -1;
    if (mode === 'free') { this.phase = 'free'; return; }
    this.phase = this.verse >= VERSES.length ? 'final' : 'intro';
    if (this.phase === 'final') this.finale();
  }

  // get up (the SLUTA button): the verse you were on starts over next time
  stop() {
    if (this.phase === 'good') this.verse++;
    this.open = false; this.phase = 'off'; this.lit = -1; this.sched = null;
  }

  light(k, len, kind) { this.lit = k; this.litT = len; this.litKind = kind; }

  // Inga sings the verse you are on (the real rhythm, a little brisk)
  demo() {
    const [a, b] = VERSES[this.verse];
    this.sched = []; let at = 0.25;
    for (let i = a; i < b; i++) { this.sched.push({ k: PSALM[i], at, len: BEATS[i] * ORGAN.sing }); at += BEATS[i] * ORGAN.sing; }
    this.next = 0; this.end = at + 0.3;
    this.phase = 'demo'; this.t = 0; this.pos = 0;
  }

  // all of it, with everybody singing
  finale() {
    this.sched = []; let at = 0.4;
    PSALM.forEach((k, i) => { this.sched.push({ k, at, len: BEATS[i] * ORGAN.final }); at += BEATS[i] * ORGAN.final; });
    this.next = 0; this.end = at + 0.9;
    this.phase = 'final'; this.t = 0;
    if (this.host && this.host.organFinale) this.host.organFinale();
  }

  update(dt) {
    if (!this.open) return;
    this.t += dt;
    if (this.litT > 0 && (this.litT -= dt) <= 0) { this.lit = -1; this.litKind = null; }
    const g = this.game;
    switch (this.phase) {
      case 'intro': if (this.t >= ORGAN.intro) this.demo(); break;
      case 'demo':
      case 'final': {
        const kind = this.phase === 'demo' ? 'demo' : 'final';
        while (this.sched && this.next < this.sched.length && this.t >= this.sched[this.next].at) {
          const n = this.sched[this.next++];
          this.light(n.k, n.len * 0.9, kind);
          g.emit('organ', { kind, k: n.k, len: n.len });
        }
        if (this.t >= this.end) {
          if (kind === 'demo') { this.phase = 'turn'; this.t = 0; this.pos = 0; }
          else { this.phase = 'done'; this.verse = VERSES.length; if (this.host && this.host.organDone) this.host.organDone(); }
        }
        break;
      }
      case 'turn': if (this.t >= ORGAN.wait) this.demo(); break;   // (no mistake: she just sings it again)
      case 'good':
        if (this.t >= ORGAN.good) { this.verse++; if (this.verse < VERSES.length) this.demo(); else this.finale(); }
        break;
      case 'wrong': if (this.t >= ORGAN.wrong) this.demo(); break;
    }
  }

  // a key (0–4) on the screen or the keyboard. Returns what happened: 'off' (not sitting at it), 'wait'
  // (not your turn), 'ok', 'verse' (the last note of a verse), 'wrong' or 'free'
  press(k) {
    if (!this.open || !(k >= 0 && k < KEYS.length)) return 'off';
    const g = this.game;
    if (this.phase === 'free') {
      this.played++;
      this.light(k, 0.32, 'play');
      g.emit('organ', { kind: 'free', k, len: 0.55 });
      return 'free';
    }
    if (this.phase !== 'turn') return 'wait';
    const [a] = VERSES[this.verse];
    if (k !== PSALM[a + this.pos]) {
      this.mistakes++;
      this.light(k, 0.7, 'wrong');
      this.phase = 'wrong'; this.t = 0;
      g.emit('organ', { kind: 'wrong', k });
      if (this.host && this.host.organWrong) this.host.organWrong();
      return 'wrong';
    }
    this.played++;
    this.light(k, 0.32, 'play');
    g.emit('organ', { kind: 'play', k, len: BEATS[a + this.pos] * ORGAN.sing });
    this.pos++; this.t = 0;
    if (this.pos < this.notes.length) return 'ok';
    this.phase = 'good';
    if (this.host && this.host.organVerse) this.host.organVerse(this.verse);
    return 'verse';
  }
}
