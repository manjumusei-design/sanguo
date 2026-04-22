import type { PreludeConfig, PreludeNode, CharacterId, Card } from '../types';
import { getCard } from '../data/cards';
import { getRelic } from '../data/relics';
import { getCharacter } from '../data/characters';

export interface PreludeState {
  config: PreludeConfig;
  currentNodeIndex: number;
  deck: Card[];
  relicIds: string[];
  gold: number;
  hp: number;
  maxHp: number;
  axes: Record<string, number>;
  completed: boolean;
}

export interface SerializedPreludeState {
  currentNodeIndex: number;
  deckIds: string[];
  relicIds: string[];
  gold: number;
  hp: number;
  maxHp: number;
  axes: Record<string, number>;
  completed: boolean;
}

export async function loadPrelude(characterId: CharacterId): Promise<PreludeConfig> {
  const basePath = import.meta.env.BASE_URL ?? './';
  const response = await fetch(`${basePath}data/prelude-${characterId}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load prelude for ${characterId}`);
  }
  return response.json() as Promise<PreludeConfig>;
}

export function initPreludeState(config: PreludeConfig): PreludeState {
  const deck = config.startingDeck.map((id) => getCard(id)!).filter(Boolean);
  const char = getCharacter(config.character);
  const maxHp = char?.hp ?? 70;
  return {
    config,
    currentNodeIndex: 0,
    deck,
    relicIds: [],
    gold: 0,
    hp: maxHp,
    maxHp,
    axes: {},
    completed: false,
  };
}