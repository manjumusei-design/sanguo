import type { Card, CombatState, Enemy, PowerInstance } from '../types';
import type { EffectQueue, QueuedEffect } from './EffectQueue';

export interface PowerDefinition {
  id: string;
  name: string;
  description: string;
  onTurnStart?: (combatState: CombatState, effectQueue: EffectQueue) => void;
  onTurnEnd?: (combatState: CombatState, effectQueue: EffectQueue) => void;
  onCardPlayed?: (combatState: CombatState, effectQueue: EffectQueue, card: Card) => void;
  modifyDamageDealt?: (
    currentDamage: number,
    combatState: CombatState,
    queuedEffect: QueuedEffect,
    target: Enemy
  ) => number;
  modifyBlockGained?: (
    currentBlock: number,
    combatState: CombatState,
    queuedEffect: QueuedEffect
  ) => number;
}

const POWER_DEFINITIONS: Record<string, PowerDefinition> = {
  caocao_warlord: {
    id: 'caocao_warlord',
    name: "Warlord's Ambition",
    description: 'At the start of your turn, gain 1 Valor.',
    onTurnStart: (_combatState, effectQueue) => {
      effectQueue.enqueue({
        type: 'apply_status',
        value: 1,
        target: 'SELF',
        statusId: 'valor',
      });
    },
  },
  caocao_dominion: {
    id: 'caocao_dominion',
    name: 'Dominion',
    description: 'At the start of your turn, gain 1 Energy.',
    onTurnStart: (_combatState, effectQueue) => {
      effectQueue.enqueue({
        type: 'energy',
        value: 1,
        target: 'SELF',
      });
    },
  },
	caocao_iron_wall: {
		id: 'caocao_iron_wall', //  Might wanna change the name here since its not really an iron wall but i cant find another translation for the chinese equivalent 
		name: 'Iron Wall',
		description: 'At the start of your turn, gain 6 block.',
		onTurnStart: (_combatState, effectQueue) => {
			effectQueue.enqueue({
				type: 'block',
				value: 6,
				target: 'SELF',
			});
		},
	},
  liubei_virtue: {
    id: 'liubei_virtue',
    name: 'Virtue',
    description: 'At the start of your turn, become Rallied.',
    onTurnStart: (_combatState, effectQueue) => {
      effectQueue.enqueue({
        type: 'apply_status',
        value: 1,
        target: 'SELF',
        statusId: 'rallied',
      });
    },
	},
	liubei_mandate: {
		id: 'liubei_mandate',
		name: 'Mandate of Heaven',
		description: 'At the start of your turn, draw 1 card',
		onTurnStart: (_combatState, effectQueue) => {
			effectQueue.enqueue({
				type: 'draw',
				value: 1,
				target: 'SELF',
			});
		}
  },
  sunquan_sovereign: {
    id: 'sunquan_sovereign',
    name: 'Sovereign',
    description: 'Your attacks deal 2 more damage.',
    modifyDamageDealt: (currentDamage) => currentDamage + 2,
  },
	sunquan_naval: {
		id: 'sunquan_naval',
		name: 'Naval Supremacy',
		description: 'At the start of your turn, gain 4 Block and 1 Formation.',
		onTurnStart: (_combatState, effectQueue) => {
			effectQueue.enqueue([
				{
					type: 'block',
					value: 4,
					target: 'SELF',
				},
				{
					type: 'apply_status',
					value: 1,
					target: 'SELF',
					statusId: 'formation',
				},
			]);
		},
	},
};

const POWER_ID_ALIASES: Record<string, string> = {
  liubei_mandate_of_heaven: 'liubei_mandate',
  sunquan_naval_supremacy: 'sunquan_naval',
};

function resolvePowerDefinitionId(cardOrPowerId: string): string {
  return POWER_ID_ALIASES[cardOrPowerId] ?? cardOrPowerId;
}

export function createPowerInstance(card: Card): PowerInstance | null {
  const resolvedId = resolvePowerDefinitionId(card.id);
  const definition = POWER_DEFINITIONS[resolvedId];
  if (!definition) {
    return null;
  }

  return {
    id: definition.id,
    cardId: card.id,
    name: definition.name,
    description: definition.description,
  };
}

export function getPowerDefinition(powerId: string): PowerDefinition | undefined {
  return POWER_DEFINITIONS[resolvePowerDefinitionId(powerId)];
}

export function forEachPlayerPower(
  combatState: CombatState,
  callback: (definition: PowerDefinition, power: PowerInstance) => void
): void {
  for (const power of combatState.playerPowers) {
    const definition = getPowerDefinition(power.id);
    if (definition) {
      callback(definition, power);
    }
  }
}
