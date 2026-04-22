import type { Relic, RelicHook, RelicContext } from '../types';

export class RelicManager {
  private relics: Relic[] = [];
  private counters = new Map<string, number>();
  private turnFlags = new Map<string, boolean>();
  private combatFlags = new Map<string, boolean>();

  addRelic(relic: Relic): void {
    this.relics.push(relic);
  }

  removeRelic(relicId: string): void {
    this.relics = this.relics.filter((r) => r.id !== relicId);
  }

  getRelics(): Relic[] {
    return [...this.relics];
  }

  hasRelic(relicId: string): boolean {
    return this.relics.some((relic) => relic.id === relicId);
  }

  clear(): void {
    this.relics = [];
    this.counters.clear();
    this.turnFlags.clear();
    this.combatFlags.clear();
  }

  resetTurnState(): void {
    this.turnFlags.clear();
  }

  resetCombatState(): void {
    this.turnFlags.clear();
    this.combatFlags.clear();
  }

  setFlag(scope: 'turn' | 'combat', key: string, value: boolean): void {
    (scope === 'turn' ? this.turnFlags : this.combatFlags).set(key, value);
  }

  getFlag(scope: 'turn' | 'combat', key: string): boolean {
    return (scope === 'turn' ? this.turnFlags : this.combatFlags).get(key) ?? false;
  }

  incrementCounter(key: string, amount = 1): number {
    const next = (this.counters.get(key) ?? 0) + amount;
    this.counters.set(key, next);
    return next;
  }

  getCounter(key: string): number {
    return this.counters.get(key) ?? 0;
  }

    private rarityWeight(relic: Relic): number {
    switch (relic.rarity) {
      case 'boss':
        return 0;
      case 'rare':
        return 1;
      case 'uncommon':
        return 2;
      case 'common':
        return 3;
      case 'cursed':
        return 4;
      default:
        return 2;
    }
  }

    invoke(hook: RelicHook, context: RelicContext): void {
    const ordered = this.relics
      .filter((relic) => relic.hooks.includes(hook))
      .map((relic, index) => ({ relic, index }))
      .sort((a, b) => {
        const rarityDiff = this.rarityWeight(a.relic) - this.rarityWeight(b.relic);
        if (rarityDiff !== 0) return rarityDiff;
        return a.index - b.index;
      })
      .map((entry) => entry.relic);

    for (const relic of ordered) {
      if (relic.hooks.includes(hook)) {
        relic.effect({
          ...context,
          relicManager: {
            setFlag: this.setFlag.bind(this),
            getFlag: this.getFlag.bind(this),
            incrementCounter: this.incrementCounter.bind(this),
            getCounter: this.getCounter.bind(this),
          },
        });
      }
    }
  }
}