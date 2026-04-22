import type { CombatState, Card, Effect, Enemy, Relic } from '../types';
import { createEffectResolver, EffectQueue } from '../combat/EffectQueue';
import { TurnStateMachine } from '../combat/TurnStateMachine';
import { RelicManager } from '../systems/RelicManager';
import { getCard, getStartingDeck } from '../data/cards';
import { spawnEnemy } from '../data/enemies';
import { RNG } from '../core/RNG';

// ============================================================
// CombatTestBed — deterministic combat state for unit tests
// ============================================================

export interface TestBedOptions {
  playerHp?: number;
  playerBlock?: number;
  playerEnergy?: number;
  enemyIds?: string[];
  deck?: string[];
  relics?: Relic[];
  seed?: string;
}

export function createTestBed(options: TestBedOptions = {}): {
  combatState: CombatState;
  effectQueue: EffectQueue;
  turnStateMachine: TurnStateMachine;
  relicManager: RelicManager;
} {
  const seed = options.seed ?? 'test-seed';
  const rng = new RNG(seed);
  const hp = options.playerHp ?? 72;

  const drawPile = options.deck
    ? options.deck.map((id) => getCard(id)!).filter(Boolean)
    : getStartingDeck('caocao');

  const combatState: CombatState = {
    player: {
      id: 'test_player',
      name: 'Test Player',
      hp,
      maxHp: hp,
      block: options.playerBlock ?? 0,
      energy: options.playerEnergy ?? 3,
      statuses: [],
      resources: {},
    },
    enemies: (options.enemyIds ?? ['bandit']).map((id) => spawnEnemy(id, rng, 1)),
    playerPowers: [],
    drawPile: [...drawPile],
    discardPile: [],
    exhaustPile: [],
    hand: [],
    currentPhase: 'START_PLAYER_TURN' as const,
    effectQueue: [] as unknown as Effect[],
    turnNumber: 0,
    forbiddenCardClass: null,
    guardianPunishedThisTurn: false,
  };

  const effectQueue = new EffectQueue();
  const relicManager = new RelicManager();
  if (options.relics) {
    for (const r of options.relics) relicManager.addRelic(r);
  }

  const turnStateMachine = new TurnStateMachine(combatState, effectQueue, {
    relicManager,
    enemyRNG: rng,
  });

  return { combatState, effectQueue, turnStateMachine, relicManager };
}

export function executeAllEffects(effectQueue: EffectQueue, combatState: CombatState): Promise<void> {
  return new Promise((resolve) => {
    effectQueue.execute(
      combatState,
      createEffectResolver(),
      () => resolve()
    );
  });
}
