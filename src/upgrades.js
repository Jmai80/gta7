// Lasse's tuning shop (v0.8): what your money buys. Upgrades are yours for good (they are saved)
// and work on every car you drive – not on the bike, and not on cars other people drive.
export const ITEMS = [
  { id: 'turbo', name: 'Turbo', price: 3000, text: 'Bilarna du kör drar snabbare och går fortare. Perfekt för långa hopp.' },
  { id: 'pansar', name: 'Krockskydd', price: 2500, text: 'Förstärkt kaross: bilarna du kör får hälften så stora bucklor.' },
  { id: 'tuta', name: 'Melodituta', price: 800, text: 'Tutan spelar en glad melodi i stället för att bara tuta.' },
];
export const TURBO = { power: 1.3, top: 1.12 };   // more pull, a higher top speed
export const ARMOR = 0.5;                          // damage taken

// what a car gets while the player drives it (and loses when they get out)
export function applyUpgrades(car, owned) {
  if (!car || car.spec.bike) return;
  const turbo = owned.has('turbo');
  car.boost = turbo ? TURBO.power : 1;
  car.top = turbo ? TURBO.top : 1;
  car.armor = owned.has('pansar') ? ARMOR : 1;
}

export function clearUpgrades(car) {
  if (!car) return;
  car.boost = 1; car.top = 1; car.armor = 1;
}
