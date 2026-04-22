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

export function hydratePreludeState(
  config: PreludeConfig,
  snapshot: SerializedPreludeState
): PreludeState {
  return {
    config,
    currentNodeIndex: snapshot.currentNodeIndex,
    deck: snapshot.deckIds.map((id) => getCard(id)!).filter(Boolean),
    relicIds: snapshot.relicIds.filter((id) => getRelic(id)),
    gold: snapshot.gold ?? 0,
    hp: snapshot.hp ?? (getCharacter(config.character)?.hp ?? 70),
    maxHp: snapshot.maxHp ?? (getCharacter(config.character)?.hp ?? 70),
    axes: { ...snapshot.axes },
    completed: snapshot.completed,
  };
}

export function serializePreludeState(state: PreludeState): SerializedPreludeState {
    return {
        currentNodeIndex: state.currentNodeIndex,
        deckIds: state.deck.map((card) => card.id),
        relicIds: [...state.relicIds],
        gold: state.gold,
        hp: state.hp,
        maxHp: state.maxHp,
        axes: { ...state.axes },
        completed: state.completed,
    };
}

export function getCurrentNode(state: PreludeState): PreludeNode | null {
    return state.config.nodes[state.currentNodeIndex] ?? null;
}

export function advancePrelude(
  state: PreludeState,
  choiceIndex: number
): { state: PreludeState; reward?: string } {
  const node = getCurrentNode(state);
  if (!node) return { state };

  let reward: string | undefined;

  if (node.type === 'event' && node.choices && node.choices[choiceIndex]) {
    const choice = node.choices[choiceIndex];
    for (const [axis, delta] of Object.entries(choice.axisChanges)) {
      state.axes[axis] = (state.axes[axis] ?? 0) + delta;
    }
    if (choice.reward) {
      reward = choice.reward;
    }
  }

  state.currentNodeIndex += 1;
  if (state.currentNodeIndex >= state.config.nodes.length) {
    state.completed = true;
  }

  return { state, reward };
}

export function applyBattleReward(state: PreludeState, cardOrRelicId: string): void {
  const card = getCard(cardOrRelicId);
  if (card) {
    state.deck.push(card);
    return;
  }

  if (getRelic(cardOrRelicId) && !state.relicIds.includes(cardOrRelicId)) {
    state.relicIds.push(cardOrRelicId);
  }
}