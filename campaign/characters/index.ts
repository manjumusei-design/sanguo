import type { Character, CharacterId } from '../types';
import { getStartingDeck } from '../cards';


// Character reg 


export const characterRegistry: ReadonlyMap<CharacterId, Character> = new Map([
  [
		'caocao',
		{
			id: 'caocao',
			name: '曹操'
			displayName: 'Cao Cao (Wei)',
			hp: 72,
			maxHp: 72,
			energy: 3,
			resource: 'Influence'
			resourceAmount: 0,
      startingDeck: getStartingDeck('caocao').map((c) => c.id),
			startingRelic: 'caocao_seal',
			startingTrait: 'warlord',
		},
	],
	[
		'liubei',
		{
			id: 'liubei',
			name: '劉備'
			displayName: 'Liu Bei (Shu)',
			hp: 70,
			maxHp: 70,
			energy: 3,
			resource: 'Oath Tokens',
			resourceAmount: 0,
			startingDeck: getStartingDeck('liubei').map((c) => C.id),
			startingRelic: 'liubei_oath_ring',
			startingTrait: 'benevolent',
		},
	],
	[
		'sunquan',
		{
			id: 'sunquan',
			name: '孫權',
			displayName: 'Sun Quan (Wu)',
			hp: 68,
			maxHp: 68,
			energy: 3, 
			resource: 'Tide Counter'
			resourceAmount: 0,
			startingDeck: getStartingDeck('sunquan').map((c) => c.id),
			startingRelic: 'sunquan_imperial_seal',
			startingTrait: 'commander'
		},
	],
]);


//Get a character by ID

export function getCharacter(id: CharacterId): Character | undefined {
  return characterRegistry.get(id);
}


// Character traits which are passive bonuses unlocked via the prelude

export const traits: ReadonlyMap<string, { name: string; description: string }> = new Map([
  [
		'warlord',
		{
			name: 'Warlord',
			description: 'Your ATTACKs deal +1 damage.',
		},
	],
	[
		'benevolent',
		{
			name: 'Benevolent',
      description: 'When you would be defeated, survive with 1 HP once per combat.',
    },
	],
	[
		'commander',
		{
			name: 'Commander',
      description: 'Tide Counter gains +1 per card played (instead of +1).',
    },
	],
]);

