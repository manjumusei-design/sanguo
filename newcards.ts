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
	{
		id: 'caocao_retreat',
		name: 'Tactical Retreat',
		type: 'skill',
		cost: 0,
		target: 'SELF',
		rarity: 'basic',
		effects: [
			{type: 'block', value: 4, target: 'SELF'},
			{type: 'draw', value: 1, target: 'SELF'},
		],
	},

	//Common
	{
		id: 'caocao_sweep_plains',
		name: 'Sweep the Plains',
		type: 'ATTACK',
		cost: 2,
		target: 'ALL_ENEMIES',
		value: 4,
		rarity: 'common',
		effects: [
      {type: 'damage', value: 4, target: 'ALL_ENEMIES'},
      {type: 'apply_status', value: 1, target: 'ALL_ENEMIES', statusId: 'panic'},
    ],
	},
	
	{
		id: 'caocao_ambush',
		name: 'Ambush',
		type: 'SKILL',
		cost: 1,
		target: 'ENEMY',
		value: 5,
		rarity: 'common',
		effects: [
			{type: 'damage', value: 5, target: 'ENEMY'},
			{type: 'block', value: 3, target: 'SELF'},
		],
	},
	{
		id: 'caocao_fortify',
		name: 'Fortify',
		type: 'SKILL',
		cost: 2,
		target: 'SELF',
		value: 10,
		rarity: 'common',
    effects: [
      { type: 'block', value: 10, target: 'SELF' },
      { type: 'apply_status', value: 2, target: 'SELF', statusId: 'formation' },
    ],
	},
	{
		id: 'caocao_suppress',
		name: 'Suppress',
		type: 'ATTACK',
		cost: 2,
		target: 'ENEMY',
		value: 8,
		rarity: 'common',
		effects: [
			{type: 'damage', value: 8, target: 'ENEMY'},
			{type: 'apply_status', value: 1, target: 'ENEMY', statusId: 'exposed'},
		],
	},
	{
		id: 'caocao_harsh_march',
		name: 'Harsh March',
		type: 'ATTACK',
		const 1, 
		target: 'ENEMY',
		value: 7;
		rarity: 'common',
		effects: [
			{type: 'damage', value: 7, target: 'ENEMY'},
			{type: 'apply_status', value: 1, target: 'ENEMY', statusId: 'panic'},
		],
	},
	{
		id: 'caocao_chain_orders',
		name: 'Chain Orders',
		type: 'SKILL',
		cost: 1,
		target: 'SELF',
		value: 5,
		rarity: 'common',
		effects: [
			{type: 'block', value: 5, target: 'SELF'},
			{type: 'apply_status', value: 1, target: 'SELF', statusId: 'command'},
		],
	},
	{
    id: 'caocao_iron_discipline',
    name: 'Iron Discipline',
    type: 'SKILL',
    cost: 1,
    target: 'SELF',
    value: 8,
    rarity: 'common',
    effects: [
      { type: 'block', value: 8, target: 'SELF' },
      { type: 'energy', value: -1, target: 'SELF' },
    ],
	},
	{
		id: 'caocao_requisition',
		name: 'Requisition',
		type: 'SKILL',
		cost: 0,
		target: 'ENEMY',
		rarity: 'common',
		effects: [
			{type: 'apply_status', value: 1, target: 'ENEMY', statusId: 'supply_shortage'},
			{type: 'draw', value: 1, target: 'SELF'},
		],
	},
  {
    id: 'caocao_execution_order',
    name: 'Execution Order',
    type: 'ATTACK',
    cost: 1,
    target: 'ENEMY',
    value: 8,
    rarity: 'common',
    effects: [
      { type: 'damage', value: 8, target: 'ENEMY' },
      { type: 'damage', value: 4, target: 'ENEMY', condition: 'target_has_panic' },
    ],
  },
	{
		id: 'caocao_tax_levy',
		name: 'Tax Levy',
		type: 'SKILL',
		cost: 1,
		target: 'SELF',
		rarity: 'common',
    effects: [
      { type: 'draw', value: 1, target: 'SELF' },
      { type: 'apply_status', value: 1, target: 'SELF', statusId: 'command' },
    ],
	},
	{
		id: 'caocao_logistics_read',
		name: 'Logistics Read',
		type: 'SKILL',
		cost: 1,
		target: 'SELF',
		rarity: 'common',
    effects: [
      { type: 'draw', value: 2, target: 'SELF' },
      { type: 'apply_status', value: 1, target: 'SELF', statusId: 'formation' },
    ],
  },
  {
    id: 'caocao_conscription',
    name: 'Conscription',
    type: 'SKILL',
    cost: 1,
    target: 'SELF',
    rarity: 'common',
    effects: [{ type: 'draw', value: 4, target: 'SELF' }],
    exhaust: true,
  },
  {
    id: 'caocao_precise_strike',
    name: 'Precise Strike',
    type: 'ATTACK',
    cost: 1,
    target: 'ENEMY',
    value: 9,
    rarity: 'common',
    effects: [{ type: 'damage', value: 9, target: 'ENEMY' }],
  },
  {
    id: 'caocao_structure_withdrawal',
    name: 'Structured Withdrawal',
    type: 'SKILL',
    cost: 1,
    target: 'SELF',
    value: 7,
    rarity: 'common',
    effects: [
      { type: 'block', value: 7, target: 'SELF' },
      { type: 'draw', value: 1, target: 'SELF' },
    ],
    retain: true,
  },
	{
		id: 'caocao_forced_labor',
		name: 'Forced Labor',
		type: 'SKILL',
		cost: 0,
		target: 'SELF',
		rarity: 'common',
    effects: [
      { type: 'draw', value: 3, target: 'SELF' },
      { type: 'apply_status', value: 1, target: 'SELF', statusId: 'low_morale' },
    ],
  },
  {
    id: 'caocao_quell_revolt',
    name: 'Quell Revolt',
    type: 'ATTACK',
    cost: 2,
    target: 'ALL_ENEMIES',
    value: 6,
    rarity: 'common',
    effects: [
      { type: 'damage', value: 6, target: 'ALL_ENEMIES' },
      { type: 'apply_status', value: 1, target: 'ALL_ENEMIES', statusId: 'exposed' },
    ],
  },
	{
		id: 'caocao_large_scale_maneuver',
		name: 'Large Scale Maeuver',
		type: 'ATTACK',
		cost: 2,
		target: 'ALL_ENEMIES',
		value: 5,
		rarity: 'common',
    effects: [
      { type: 'damage', value: 5, target: 'ALL_ENEMIES' },
      { type: 'apply_status', value: 1, target: 'ALL_ENEMIES', statusId: 'broken_formation' },
    ],
	},
	{
		id: 'caocao_edict_of_supply',
		name: 'Edict of Supply',
		type: 'SKILL',
		type: 1,
		target: 'SELF',
		rarity: 'common',
    effects: [
      { type: 'block', value: 6, target: 'SELF' },
      { type: 'energy', value: 1, target: 'SELF' },
    ],
    exhaust: true,
  },
	{
		id: 'caocao_silent_threat',
		name: 'Silent Threat',
		type: 'ATTACK',
		cost: 0,
		target: 'ENEMY',
		value: 4,
		rarity: 'common',
    effects: [
      { type: 'damage', value: 4, target: 'ENEMY' },
      { type: 'apply_status', value: 1, target: 'ENEMY', statusId: 'panic' },
    ],
    fleeting: true,
  },
	{
		id: 'caocao_encircle',
		name: 'Encircle',
		type: 'ATTACK',
		cost: 2,
		target: 'ENEMY',
		value: 10,
		rarity: 'common',
    effects: [
      { type: 'damage', value: 10, target: 'ENEMY' },
      { type: 'apply_status', value: 1, target: 'ENEMY', statusId: 'encircled' },
    ],
  },
	{

	}
]
		
