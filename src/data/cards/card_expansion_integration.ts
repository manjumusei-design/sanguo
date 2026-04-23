import type { Card } from '../../types';


//Cao cao expansion cards
export const caoCaoCards: Card[] = [
	//Common cards here
	{
		id: 'caocao_strike',
		name: 'Wei Strike',
		type: 'ATTACK',
		cost: 1,
		target: 'ENEMY',
		value: 6,
		effects : [{ type: 'damage', value: 6, target: 'ENEMY' }],
	},
	{
		id: 'caocao_defend',
		name: 'Wei Defend',
		type: 'SKILL',
		cost: 1,
		target: 'SELF',
		value: 5,
		effects : [{ type: 'block', value: 5, target: 'SELF' }],
	},
	{
		id: 'caocao_influence',
		name: 'Gather Influence',
		type: 'SKILL',
		cost: 0,
		target: 'SELF',
    effects: [{ type: 'draw', value: 2, target: 'SELF' }],
	},
	{
		id: 'caocao_command_decree',
		name: 'Command Decree',
		type: 'ATTACK',
		cost: 0,
		target: 'SELF',
		value: 3,
    effects: [{ type: 'damage', value: 3, target: 'ENEMY' }],
		fleeting: true,
	},
	{
		id: 'caocao_sweep_plains',
		name: 'Sweep the Plains',
		type: 'ATTACK',
		cost: 2,
		target: 'ALL_ENEMIES',
		value: 4,
		effects: [{ type: 'damage', value: 4, target: 'ALL_ENEMIES' }],
	},
	{
    id: 'caocao_retreat',
    name: 'Tactical Retreat',
    type: 'SKILL',
    cost: 0,
    target: 'SELF',
    effects: [
      { type: 'block', value: 4, target: 'SELF' },
      { type: 'draw', value: 1, target: 'SELF' },
    ],
  },
  {
    id: 'caocao_ambush',
    name: 'Ambush',
    type: 'SKILL',
    cost: 1,
    target: 'ENEMY',
    value: 5,
    effects: [
      { type: 'damage', value: 5, target: 'ENEMY' },
      { type: 'block', value: 3, target: 'SELF' },
    ],
  }
  {
    id: 'caocao_fortify',
    name: 'Fortify',
    type: 'SKILL',
    cost: 2,
    target: 'SELF',
    value: 10,
    effects: [
      { type: 'block', value: 10, target: 'SELF' },
      { type: 'apply_status', value: 2, target: 'SELF', statusId: 'formation' },
    ],
  },