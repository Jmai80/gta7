// The car radio (v1.3): every car colour has its own station, a little synthesized loop in the style
// of an old MIDI tune. Pure data – audio.js plays it (sequenced with Web Audio), main.js picks the
// station when you sit in a car. No bikes: they have no radio.
//
// A station: tempo (bpm, and `steps` per bar: 16 sixteenths, or 12 for a 6/8 feel), the key (root
// as a MIDI note, mode), the chords (scale degrees, one per bar) and the parts, written as tokens per
// step: a number is a scale degree counted from the chord's root, '-' holds the note before, '.' is
// a rest. Drums: 'x' hits. mel (melody, an octave up), bass (an octave down), arp (broken chords,
// middle), stab (the chord, short), kick/snare/hat.
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];

export const STATIONS = {
  red: {
    name: 'Glada Hits', bpm: 128, root: 60, mode: MAJOR, prog: [0, 4, 5, 3], lead: 'square', bassWave: 'triangle',
    mel: ['4 - 4 2 0 - 2 - 4 - 5 - 4 - - -', '2 - 2 4 5 - 4 2 0 - - - . . . .'],
    bass: '0 . 0 . 4 . 0 . 0 . 0 . 4 . 7 .',
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
  },
  blue: {
    name: 'Blå Lounge', bpm: 92, swing: 0.22, root: 65, mode: MAJOR, prog: [1, 4, 0, 0], lead: 'triangle', bassWave: 'triangle', seventh: true,
    mel: ['4 . 6 - 4 . 2 . 0 - - . . . . .', '6 - 4 . 3 . 1 . 2 - - - . . . .'],
    bass: '0 . 2 . 4 . 5 . 7 . 5 . 4 . 2 .',
    stab: '....x.....x.....',
    kick: 'x.......x.......', snare: '....x.......x...', hat: 'x..xx..xx..xx..x', soft: true,
  },
  black: {
    name: 'Natt-FM', bpm: 100, root: 57, mode: MINOR, prog: [0, 5, 2, 6], lead: 'sawtooth', bassWave: 'sawtooth',
    mel: ['0 - - - 2 - 4 - 7 - - - 6 - 4 -', '4 - - - 2 - 0 - 1 - - - - - . .'],
    bass: '0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .',
    arp: '0 2 4 7 0 2 4 7 0 2 4 7 0 2 4 7',
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', soft: true,
  },
  white: {
    name: 'P2 Barock', bpm: 108, root: 62, mode: MAJOR, prog: [0, 4, 5, 2, 3, 0, 3, 4], lead: 'triangle', bassWave: 'triangle',
    mel: ['7 - - - 6 - - - 4 - - - 6 - - -', '4 - 2 - 0 - 2 - 4 - - - . . . .'],
    bass: '0 - - - - - - - 0 - - - - - - -',
    arp: '0 4 2 4 0 4 2 4 0 4 2 4 0 4 2 4',
  },
  yellow: {
    name: 'Sol-Radio', bpm: 104, root: 67, mode: MAJOR, prog: [0, 3, 4, 0], lead: 'triangle', bassWave: 'triangle', pluck: true,
    mel: ['4 . 4 . 5 4 . 2 0 . . . 2 . 4 .', '5 . 5 . 4 2 . 0 1 . . . 0 . . .'],
    bass: '0 . . 0 . . 4 . 5 . . . 4 . 2 .',
    stab: '..x...x...x...x.',
    kick: 'x.....x.x.......', snare: '........x.......', hat: '..x...x...x...x.',
  },
  green: {
    name: 'Dansbandskanalen', bpm: 120, root: 63, mode: MAJOR, prog: [0, 4, 4, 0, 3, 0, 4, 0], lead: 'triangle', bassWave: 'triangle',
    mel: ['2 - 4 - 5 - 4 - 2 - - - 0 - - -', '4 - 5 - 7 - 5 - 4 - 2 - 0 - - -'],
    bass: '0 . . . 4 . . . 0 . . . 4 . . .',
    stab: '..x...x...x...x.',
    kick: 'x.......x.......', snare: '....x.......x...', hat: '',
  },
  lightblue: {
    name: 'Disco 79', bpm: 118, root: 62, mode: MINOR, prog: [0, 0, 5, 4], lead: 'square', bassWave: 'sawtooth',
    mel: ['7 - 9 - 7 - 4 - 7 - - - . . . .', '9 - 10 - 9 - 7 - 4 - - - 2 - . .'],
    bass: '0 7 0 7 0 7 0 7 0 7 0 7 0 7 0 7',
    stab: '....x.......x...',
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
  },
  silver: {
    name: 'Techno Sjuby', bpm: 132, root: 57, mode: MINOR, prog: [0, 0, 5, 6], lead: 'square', bassWave: 'sawtooth',
    mel: ['7 . . 7 . . 6 . . . 4 . . . . .', '7 . . 7 . . 9 . . . 7 . . . . .'],
    bass: '0 . 0 0 . 0 . 0 0 . 0 . 0 0 . 0',
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
  },
  pizza: {
    name: 'Radio Napoli', bpm: 150, steps: 12, root: 57, mode: MINOR, prog: [0, 4, 4, 0], lead: 'square', bassWave: 'triangle',
    mel: ['4 3 4 2 . 4 3 4 2 . 0 .', '4 5 6 7 - 6 5 4 3 - - .'],
    bass: '0 . . 4 . . 0 . . 4 . .',
    stab: '. x x . x x . x x . x x',
    kick: 'x.....x.....', snare: '', hat: 'x.xx.xx.xx.x',
  },
  ronny: {
    name: 'Country-Kanalen', bpm: 112, root: 67, mode: MAJOR, prog: [0, 0, 3, 4], lead: 'triangle', bassWave: 'triangle', pluck: true,
    mel: ['0 - 2 - 4 - 4 - 5 - 4 - 2 - - -', '4 - 2 - 0 - 2 - 1 - - - . . . .'],
    bass: '0 . . . 4 . . . 0 . . . 4 . . .',
    stab: '..x...x...x...x.',
    kick: 'x.......x.......', snare: '....x.......x...', hat: '',
  },
};
// parse the token strings once: arrays of { d (degree) | null, len (steps) }
for (const S of Object.values(STATIONS)) {
  if (S.parsed) continue;
  S.parsed = true;
  S.steps = S.steps || 16;
  for (const k of ['stab', 'kick', 'snare', 'hat']) S[k] = (S[k] || '').replace(/\s/g, '');
  const part = (s) => {
    if (!s) return null;
    const t = s.trim().split(/\s+/), out = [];
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '-' || t[i] === '.') { out.push(null); continue; }
      let len = 1;
      while (t[i + len] === '-') len++;
      out.push({ d: Number(t[i]), len });
    }
    return out;
  };
  S.melP = S.mel.map(part);
  S.bassP = part(S.bass);
  S.arpP = part(S.arp);
}

// the station for the car you sit in (null: no radio – on a bike, or the car is a wreck)
export function stationFor(car) {
  if (!car || car.spec.bike || car.dead) return null;
  return STATIONS[car.paint] || STATIONS.red;
}

// a scale degree (can be negative or past the octave) → MIDI note → frequency
export function degFreq(S, deg, octave = 0) {
  const n = S.mode.length, o = Math.floor(deg / n), i = ((deg % n) + n) % n;
  return 440 * 2 ** ((S.root + S.mode[i] + 12 * (o + octave) - 69) / 12);
}
