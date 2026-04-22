import type { Card, CardRarity, CharacterId, RelicTier, ShopInventory } from '../types';
import { RNG } from '../core/RNG';
import { allCards } from '../data/cards';
import { relicRegistry } from '../data/relics';

const CARD_RARITY: Partial<Record<string, CardRarity>> = {
  caocao_strike: 'COMMON',
  caocao_defend: 'COMMON',
  caocao_influence: 'COMMON',
  caocao_retreat: 'COMMON',
  caocao_command: 'COMMON',
  caocao_ambush: 'UNCOMMON',
  caocao_fortify: 'UNCOMMON',
  caocao_strategy: 'UNCOMMON',
  caocao_suppress: 'UNCOMMON',
  caocao_rally: 'UNCOMMON',
  caocao_sweep: 'RARE',
  caocao_rout: 'RARE',
  caocao_conscription: 'RARE',
  caocao_warlord: 'RARE',
  caocao_dominion: 'RARE',
  caocao_iron_wall: 'RARE',

  liubei_strike: 'COMMON',
  liubei_defend: 'COMMON',
  liubei_oath: 'COMMON',
  liubei_benevolence: 'COMMON',
  liubei_loyalty: 'COMMON',
  liubei_honor: 'COMMON',
  liubei_sworn: 'UNCOMMON',
  liubei_unity: 'UNCOMMON',
  liubei_peace: 'UNCOMMON',
  liubei_valor: 'UNCOMMON',
  liubei_charge: 'UNCOMMON',
  liubei_righteous: 'RARE',
  liubei_virtue: 'RARE',
  liubei_mandate: 'RARE',
  liubei_harmony: 'RARE',
  liubei_protect: 'RARE',

  sunquan_strike: 'COMMON',
  sunquan_defend: 'COMMON',
  sunquan_admiral: 'COMMON',
  sunquan_tide: 'COMMON',
  sunquan_current: 'COMMON',
  sunquan_vigilance: 'COMMON',
  sunquan_river: 'UNCOMMON',
  sunquan_counter: 'UNCOMMON',
  sunquan_assault: 'UNCOMMON',
  sunquan_strategy_wu: 'UNCOMMON',
  sunquan_fleet: 'RARE',
  sunquan_flame: 'RARE',
  sunquan_wave: 'RARE',
  sunquan_sovereign: 'RARE',
  sunquan_naval: 'RARE',
  sunquan_barrier: 'RARE',
};

const RELIC_TIER: Partial<Record<string, RelicTier>> = {
  relic_field_rations: 'STANDARD',
  relic_veteran_core: 'STANDARD',
  relic_war_drums: 'STANDARD',
  relic_supply_ledger: 'STANDARD',
  relic_iron_discipline: 'STANDARD',
  relic_scorched_map: 'STANDARD',
  relic_rebel_pact: 'STANDARD',
  relic_broken_supply_line: 'STANDARD',
  relic_war_banner: 'STANDARD',
  relic_command_baton: 'PREMIUM',
  relic_ashen_standard: 'PREMIUM',
  relic_imperial_edict: 'PREMIUM',
  relic_fractured_crown: 'PREMIUM',
  relic_advisors_scroll: 'PREMIUM',
  relic_chain_of_command: 'PREMIUM',
  relic_final_mandate: 'PREMIUM',
  relic_broken_seal: 'PREMIUM',
  relic_burning_oath: 'PREMIUM',
  relic_silent_court: 'PREMIUM',
  relic_strategic_reserve: 'PREMIUM',
  lucky_coin: 'STANDARD',
  frozen_heart: 'STANDARD',
  training_dummy: 'STANDARD',
  anchor_stone: 'STANDARD',
  grain_convoy: 'STANDARD',
  war_banner_yi: 'STANDARD',
  fractured_standard: 'STANDARD',
  foragers_knife: 'STANDARD',
  veteran_drill: 'STANDARD',
  broken_spear: 'STANDARD',
  war_horn: 'PREMIUM',
  ring_of_vitality: 'PREMIUM',
  caocao_ambition: 'PREMIUM',
  liubei_dual_swords: 'PREMIUM',
  sunquan_flame_scroll: 'PREMIUM',
  imperial_edict: 'PREMIUM',
  hidden_dispatch: 'PREMIUM',
  manual_of_fire_attack: 'PREMIUM',
  ash_field: 'PREMIUM',
};

const CHARACTER_CARD_WEIGHTS: Record<CharacterId, Partial<Record<string, number>>> = {
  caocao: {
    caocao_fortify: 4,
    caocao_strategy: 4,
    caocao_suppress: 4,
    caocao_rally: 3,
    caocao_dominion: 3,
    caocao_iron_wall: 3,
  },
  liubei: {
    liubei_loyalty: 4,
    liubei_benevolence: 4,
    liubei_sworn: 3,
    liubei_harmony: 4,
    liubei_virtue: 3,
    liubei_protect: 3,
  },
  sunquan: {
    sunquan_counter: 4,
    sunquan_current: 3,
    sunquan_river: 4,
    sunquan_strategy_wu: 4,
    sunquan_flame: 3,
    sunquan_naval: 3,
  },
};

function classifyCardRarity(cardId: string): CardRarity {
  return CARD_RARITY[cardId] ?? 'UNCOMMON';
}

function classifyRelicTier(relicId: string): RelicTier {
  return RELIC_TIER[relicId] ?? 'STANDARD';
}

function isDefensiveCard(card: Card): boolean {
  return card.effects.some((effect) => effect.type === 'block');
}

function isConsistencyCard(card: Card): boolean {
  return card.effects.some((effect) => effect.type === 'draw') || Boolean(card.retain) || Boolean(card.fleeting);
}

function isScalingCard(card: Card): boolean {
  return card.type === 'POWER' || card.effects.some((effect) => effect.statusId === 'valor' || effect.statusId === 'formation');
}

function analyzeDeck(deck: Card[]) {
  return {
    defense: deck.filter(isDefensiveCard).length,
    consistency: deck.filter(isConsistencyCard).length,
    scaling: deck.filter(isScalingCard).length,
  };
}

function pickWeighted<T>(rng: RNG, items: T[], weightOf: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(1, weightOf(item)), 0);
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= Math.max(1, weightOf(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function generateCardStock(character: CharacterId, deck: Card[], rng: RNG): string[] {
  const candidates = Array.from(allCards.values())
    .filter((card) => !card.upgraded)
    .filter((card) => card.id.startsWith(character));

  const weights = CHARACTER_CARD_WEIGHTS[character];
  const deckState = analyzeDeck(deck);
  const byRarity = (rarity: CardRarity) => candidates.filter((card) => classifyCardRarity(card.id) === rarity);
  const stock: string[] = [];
  const weightCard = (card: Card) => {
    let weight = 6;
    weight += (weights[card.id] ?? 0) * 4;

    if (deckState.defense < 3 && isDefensiveCard(card)) weight += 10;
    if (deckState.consistency < 2 && isConsistencyCard(card)) weight += 8;
    if (deckState.scaling < 2 && isScalingCard(card)) weight += 6;

    return weight;
  };

    const drawFromBucket = (rarity: CardRarity, count: number) => {
    const bucket = byRarity(rarity).filter((card) => !stock.includes(card.id));
    for (let i = 0; i < count && bucket.length > 0; i++) {
      const chosen = pickWeighted(rng, bucket, weightCard);
      stock.push(chosen.id);
      bucket.splice(bucket.findIndex((card) => card.id === chosen.id), 1);
    }
  };

  drawFromBucket('COMMON', 2);
  drawFromBucket('UNCOMMON', 2);
  drawFromBucket('RARE', 1);

  const hasFixCard = stock
    .map((id) => allCards.get(id))
    .some((card) => card && (isDefensiveCard(card) || isConsistencyCard(card)));

  if (!hasFixCard) {
    const fixCandidate = candidates
      .filter((card) => !stock.includes(card.id))
      .sort((a, b) => weightCard(b) - weightCard(a))
      .find((card) => isDefensiveCard(card) || isConsistencyCard(card));
    if (fixCandidate) {
      stock[0] = fixCandidate.id;
    }
  }

  return stock;
}

function generateRelicStock(rng: RNG): string[] {
  const relics = Array.from(relicRegistry.values());
  const standard = relics.filter((relic) => classifyRelicTier(relic.id) === 'STANDARD');
  const premium = relics.filter((relic) => classifyRelicTier(relic.id) === 'PREMIUM');
  return [
    rng.pick(standard).id,
    rng.pick(premium).id,
  ];
}