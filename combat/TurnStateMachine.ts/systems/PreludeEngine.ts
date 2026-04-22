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