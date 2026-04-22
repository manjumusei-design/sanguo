import { RNG } from './RNG';


// Human readable seed for black box purposes lel

export function generateSeed(): string {
  const words = [
    'dragon', 'tiger', 'wolf', 'phoenix', 'crane',
    'red', 'blue', 'jade', 'iron', 'gold',
    'cliff', 'river', 'mountain', 'plains', 'fortress',
    'wind', 'fire', 'thunder', 'shadow', 'dawn',
  ];
  const rng = new RNG(Math.random().toString());
  return `${rng.pick(words)}-${rng.pick(words)}-${rng.nextInt(1000, 9999)}`;
}



// RNG from run seed + optional salt 
export function getRNG(seed: string, salt?: string): RNG {
  return new RNG(salt ? `${seed}::${salt}` : seed);
}
