/* import type { ChronicleFlags, ChronicleEntry, NodeType } from '../types';


export function computeChronicleFlags(entries: ChronicleEntry[]): ChronicleFlags {
  const total = entries.length;
  if (total === 0) {
    return getDefaultFlags();
  }

  const byCharacter: Record<string, { wins: number; runs: number }> = {
    caocao: { wins: 0, runs: 0 },
    liubei: { wins: 0, runs: 0 },
    sunquan: { wins: 0, runs: 0 },
  };

  for (const entry of entries) {
    byCharacter[entry.character].runs += 1;
    if (entry.result === 'victory') {
      byCharacter[entry.character].wins += 1;
    }
  }

  // Determine world state based on win rates (this is for the chaos engine in the future but I will be writing the skeleton now for metrics)
  const winRates = Object.entries(byCharacter).map(([char, stats]) => ({
    char,
    rate: stats.runs > 0 ? stats.wins / stats.runs : 0,
  }));

  const dominant = winRates.reduce((a, b) => (a.rate > b.rate ? a : b));
  const second = winRates.filter((r) => r.char !== dominant.char).reduce((a, b) => (a.rate > b.rate ? a : b));

  let worldState = 'balanced';
  if (dominant.rate > 0.6 && dominant.rate - second.rate > 0.2) {
    worldState = `${dominant.char}_dominant`;
  } else if (dominant.rate > 0.4) {
    worldState = `${dominant.char}_rising`;
  }

  const mapWeightModifiers: Partial<Record<NodeType, number>> = {};
  if (worldState.includes('caocao')) {
    mapWeightModifiers.ELITE = 5;
    mapWeightModifiers.BATTLE = -5;
  } else if (worldState.includes('liubei')) {
    mapWeightModifiers.EVENT = 5;
    mapWeightModifiers.MERCHANT = -5;
  } else if (worldState.includes('sunquan')) {
    mapWeightModifiers.MYSTERY = 5;
    mapWeightModifiers.REST = -5;
  }



  const unlockedEvents: string[] = [];
  if (total >= 3) unlockedEvents.push('ghost_soldiers');
  if (total >= 5) unlockedEvents.push('imperial_roadblock');
  if (total >= 10) unlockedEvents.push('old_general');

  const cardPoolModifiers: Record<string, number> = {};
  if (dominant.rate > 0.5) {
    cardPoolModifiers[dominant.char] = 0.1;
  }

  const bossVariants: string[] = [];
  if (total >= 5) bossVariants.push('empowered');
  if (total >= 15) bossVariants.push('dual_boss');

    return {
    worldState,
    mapWeightModifiers,
    unlockedEvents,
    cardPoolModifiers,
    bossVariants,
  };
}

export function getDefaultFlags(): ChronicleFlags {
  return {
    worldState: 'balanced',
    mapWeightModifiers: {},
    unlockedEvents: [],
    cardPoolModifiers: {},
    bossVariants: [],
  };
}
/* 