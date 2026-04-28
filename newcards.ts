import type {Card} from '../../types';
import {
    analyzeImportedCards,
    assertNoImportErrors,
    normalizeImportedCard,
    type ImportedCard,
} from '../importValidator';

type RawCard = ImportedCard;


//caocao


export const caoCaoCards: RawCard[] = [
    // This is the starting deck which is 4 cards of each attack and defend + 1 skill card
  {
    id: 'caocao_strike',
    name: 'Wei Strike',
    type: 'ATTACK',
    cost: 1,
    target: 'ENEMY',
    value: 6,
    rarity: 'basic',
    effects: [{ type: 'damage', value: 6, target: 'ENEMY' }],
  },
	{
		id: 'caocao_defend',
		name: 'Wei Defend',
		type: 'SKILL',
		cost: 1,
		target: 'SELF',
		value: 5,
		rarity: 'basic',
		effects: [{ type: 'block', value: 5, target: 'SELF' }],
	},
	{
		id: 'caocao_influence',
		name: 'Gather Influence',
		type: 'SKILL',
		cost: 0;
		target: 'SELF',
		rarity: 'basic',
		effects: [{ type: 'draw', value: 2, target: 'SELF' }],
	},
	{
		id: 'caocao_command_decree',
		name: 'Command Decree',
		type: 'ATTACK',
		cost: 0,
		target: 'ENEMY',
		value: 3,
		rarity: 'basic',
		effects: [
			{type: 'damage', value: 3, target: 'ENEMY'},
			{type: 'apply_status', value: 1, target: 'SELF', statusId: 'command'},
		],
		fleeting: true,
	},