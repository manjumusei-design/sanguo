export class RNG {
  private state: number;

  constructor(seed: string) {
    this.state = this.hashString(seed);
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  pick<T>(array: readonly T[]): T {
    return array[this.nextInt(0, array.length)];
  }

  pickWeighted<T>(options: readonly { item: T; weight: number }[]): T {
    const total = options.reduce((sum, o) => sum + o.weight, 0);
    let roll = this.next() * total;
    for (const opt of options) {
      roll -= opt.weight;
      if (roll <= 0) return opt.item;
    }
    return options[options.length - 1].item;
  }

  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private hashString(str: string): number {
    let h = 1779033703;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (() => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    })();
  }
}
