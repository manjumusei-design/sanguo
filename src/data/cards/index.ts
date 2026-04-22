import type { Card} from '../../types' 

// Caocao deck

export const caoCaoCards: Card[] = [
    //Attacks
{
    id: 'caocao_strike',
    name: 'Wei Strike',
    type: 'Attack',
    cost: 1,
    target: 'ENEMY',
    value: 6,
    effects: [{type: 'damage', value: 6, target: 'ENEMY' }],
},
  {
    id: 'caocao_strike_plus',
    name: 'Wei Strike+',
    type: 'ATTACK',
    cost: 1,
    target: 'ENEMY',
    value: 9,
    effects: [{ type: 'damage', value: 9, target: 'ENEMY' }],
    upgraded: true,
  },
  {
    id: 'caocao_sweep',
    name: 'Sweep the Plains',
    type: 'ATTACK',
    cost: 2,
    target: 'ALL_ENEMIES',
    value: 4,
    effects : [{ type: 'damage', value: 4, target: 'ALL_ENEMIES'}], 
  },
  {
    id: 'caocao_sweep_plus', 
    name: 'Sweep the Plains',
    type: 'ATTACK',
    cost: 2,
    target: 'ALL_ENEMIES',
    value: 4,
    effects: [{ type: 'damage', value: 6, target: 'ALL_ENEMIES'}],
    upgraded: true, 
  },
  {
    id: 'caocao_rout',
    name: 'Rout',
    type: 'ATTACK',
    cost: 1,
    target: 'ENEMY',
    value: 10,
    effects: [{ type: 'damage', value: 10, target: 'ENEMY'}],
    exhaust: true,
  },
  {
    id: 'caocao_command',
    name: 'Command Decree',
    type: 'ATTACK',
    cost: 0,
    target: 'ENEMY',
    value: 3,
    EFFECTS: [{ type: 'damage', value: 3, target: 'ENEMY' }],
    fleeting: true,
},
    // SKILLS for caocao
  {
    id: 'caocao_defend',
    name: 'Wei Defend',
    type: 'SKILL',
    cost: 1,
    target: 'SELF',
    value: 5,
    effects: [{ type: 'block', value: 5, target: 'SELF' }],
  },
  {
    id: 'caocao_defend_plus',
    name: 'Wei Defend+',
    type: 'SKILL',
    cost: 1,
    target: 'SELF',
    value: 8,
    effects: [{ type: 'block', value: 8, target: 'SELF' }],
    upgraded: true,
  },
  {
    id : 'caocao_fortify',
    name: 'Fortify',
    type: 'SKILL',
    cost: 2,
    target: 'SELF',
    value: 10,
    effects: [
        { type: 'block', value: 10, target: 'SELF' },
        { type: 'apply_status', value: 2, target: 'SELF', statusID: 'formation'},
    ],
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
    id: 'caocao_strategy',
    name: 'Strategists\'s Plot',
    type: 'SKILL',
    cost: 1,
    target: 'SELF',
    effects: [
        { type: 'draw', value: 3, target: 'Self' },
        {type: 'energy', value: -1, target: 'SELF'}, 
    ],
  },
  {
    id: 'caocao_retreat',
    name: 'Tactical Retreat'
    type: 'SKILL',
    cost: 0,
    target: 'SELF',
    effects: [
        {type: 'block', value: 4, target: 'SELF'},
        {type: 'draw', value: 1, target: 'SELF'},
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

    // Caocao Powers
    {
        id: 'caocao_warlord'
        name: 'Warlord\'s Ambition',
        type: 'POWER',
        cost: 2,
        target: 'SELF', 
        effects: [],
        description: 'Power: At the start of your turn, gain 1 Valor.',
    }
    {
        id: 'caocao_dominion',
        name: 'Dominion',
        type: 'POWER',
        cost: 3,
        target: 'SELF',
        effects: [],
        description: 'Power: at the start of your turn, gain 1 Energy',
    },
    {
        id" 'caocao_iron_wall',
        name: 'Iron Wall',
        type: 'POWER',
        cost: 1,
        target: 'SELF',
        effects: [],
        description: 'Power: At the start of your turn, gain 6 Block',
    }
    {
        id: 'caocao_conscription',
        name: 'Conscription',
        type: 'SKILL',
        cost: 1,
        target: 'SELF',
        effects: [{ type: 'draw', value: 4, target: 'SELF'}],
        exhaust: true,
    },
    {
        id: 'caocao_suppress',
        name: 'Suppress',
        type: 'Attack',
        cost: 2,
        target: 'ENEMY',
        value: 8,
        effects: [
            { type: 'damage', value: 8, target: 'ENEMY' },
            { type: 'apply_status', value: 2, target: 'ENEMY', statusID: 'exposed'},
        ],
    },
  {
    id: 'caocao_suppress_plus',
    name: 'Suppress+',
    type: 'ATTACK',
    cost: 2,
    target: 'ENEMY',
    value: 12,
    effects: [
      { type: 'damage', value: 12, target: 'ENEMY' },
      { type: 'apply_status', value: 2, target: 'ENEMY', statusId: 'exposed' },
    ],
    upgraded: true,
  },
    {
        id: 'caocao_rally',
        name: 'Rally Forces',
        type: 'SKILL',
        cost: 2,
        target: 'SELF',
        effects: [
            { type: 'block', value: 6, target: 'SELF'},
            { type: 'draw', value: 2, target: 'SELF'},
        ],
    },
];

// LB cards
export const liuBeiCards: Card[] = [
    {
        id: 'liubei_strike',
        name: 'Shu Strike',
        type: 'ATTACK',
        cost: 1,
        target: 'ENEMY',
        value: 9,
        effects: [{ type: 'damage', value: 9, target: 'ENEMY'}],
    },
    {
        id: 'liubei_strike_plus',
        name: 'Shu Strike +',
        type: 'ATTACK',
        cost: 1,
        target: 'Enemy',
        value: 9,
        effects: [{ type: 'damage', value: 9, target: 'ENEMY' }],
        upgraded: true,
    },
    {
        id: 'liubei_oath',
        name: 'Oath of Brotherhood',
        type: 'SKILL',
        cost: 1,
        target: 'SELF', 
        effects: [{ type: 'draw', value: 2, target: 'SELF'}],
    },
    {
        id: 'liubei_benevolence',
        name: 'Benovelence',
        type: 'SKILL',
        cost: 1, 
        target: 'SELF'
        value: 7,
        effects: [{ type: 'block', value: 7, target: 'SELF'}],
    }, 
    {
        id: 'liubei_benovelence_plus',
        name: 'Benevolence+',
        type: 'SKILL',
        cost: 1,
        target: 'SELF',
        value: 7,
        effects: [{type: 'block', value: 7, target: 'SELF'}],
    },
    {
        id: 'liubei_unity',
        name: 'Unity',
        type: 'SKILL',
        cost: 2,
        target: 'ALL_ENEMIES',
        value: 4,
        effects: [
            { type: 'damage', value: 4, target: 'ALLL_ENEMIES' },
            { type: ' block', value: 4, target: 'SELF' },   
        ],
    },
    {
        id: 'liubei_defend',
        name: 'Shu Defend',
        type: 'SKILL',
        cost: 1,
        target: 'ALL_ENEMIES',
        value: 4,
        effects: [
            { type: 'damage', value: 4, target: 'ENEMY' },
        ],
    },
    {
        id: 'liubei_righteous',
        name: 'Righteous Fury',
        type: 'ATTACK',
        cost: 2, 
        target: 'EMEMY',
        value: 14,
        effects: [{ type: 'damage', value: 14, target: 'ENEMY'}],
    },
    {
        id: 'liubei_virtue',
        name: 'Virtue',
        type: 'POWER',
        cost: 2,
        target: 'SELF',
        effects: [],
        description: 'Power: At the start of your turn, become Rallied.',
    },
    {
        id: 'liubei_loyalty',
        name: 'Loyalty',
        type: 'SKILL',
        cost: 0,
        target: 'SELF',
        effects: [{ type: 'block', value: 3, target: 'SELF'}],
        retain: true,
    }
    {
        id: 'liubei_sworn',
        name: 'Sworn Brothers',
        type: 'ATTACK',
        cost: 1,
        target: 'ENEMY',
        value: 4,
        effects: [
            { type: 'damage', value: 4, target: 'ENEMY' },
            { type: 'draw', value: 1, target: 'SELF'},
        ],
    },
    {
        id: 'liubei_mandate',
        name: 'Mandate of Heaven',
        type: 'POWER',
        cost: 3,
        target: 'SELF',
        effects: [],
        description: 'Power: At the start of your turn, draw 1 card.',
    },
    {
        id: 'liubei_harmony',
        name: 'Harmony'
        type: 'SKILL',
        cost: 1,
        target: 'SELF',
        effects: [
            { type: 'energy', value: 1, target: 'SELF' },
            { type: 'draw', value: 1, target: 'SELF' },
        ],
        exhaust: true,
    },
    {
        id: 'liubei_peace',
        name: 'Peacemaker', 
        type: 'SKILL',
        cost: 2,
        target: 'SELF',
        value: 10, 
        effects: [
            { type: 'block', value: 10, target: 'SELF'},
            { type: 'energy', value: 1, target: 'SELF'},
        ],
    },
  {
    id: 'liubei_charge',
    name: 'Righteous Charge',
    type: 'ATTACK',
    cost: 1,
    target: 'ENEMY',
    value: 8,
    effects: [{ type: 'damage', value: 8, target: 'ENEMY' }],
    exhaust: true,
  }, 
  {
    id: 'liubei_defend_plus',
    name: 'Shu Defend+',
    type: 'SKILL',
    cost: 1,
    target: 'SELF',
    value: 8,
    effects: [{ type: 'block', value: 8, target: 'SELF'}],
    upgraded: true,
  },
  {
    id: 'liubei_oath_plus',
    name: 'Oath of Brotherhood+',
    type: 'SKILL',
    cost: 1,
    target: 'SELF',
    effects: [{ type: 'draw', value: 3, target: 'SELF'}],
    upgraded: true,
  },
  {
    id: 'liubei_protect',
    name: 'Protect the People',
    type: 'SKILL',
    cost: 2,
    target: 'SELF',
    value: 15,
    effects: [{ type: 'block', value: 15, target: 'SELF'}],
    exhaust: true,
  },
  {
    id: 'liubei_valor',
    name: 'Valor',
    type: 'ATTACK',
    cost: 0,
    target: 'ENEMY',
    value: 4,
    effects: [
        { type: 'damage', value: 4, target: 'ENEMY' },
        { type: 'apply_status', value: 1, target: 'SELF', statusId: 'valor' },
    ],
  },
  {
    id: 'liubei_honor',
    name: 'Honor',
    type: 'SKILL',
    cost: 1,
    target: 'SELF',
    effects: [{ type: 'draw', value: 1, target: 'SELF'}, { type: 'energy', value: 1. target: 'SELF'}],
  },
];

// Sunquan cards 

export const sunQuanCards: Card[] = [
    {
        id: 'sunquan_strike',
        name: 'Wu Strike',
        type: 'ATTACK',
        cost: 1, 
        target: 'ENEMY',
        value: 6,
        effects: [{ type: 'damage', value: 6, target: 'ENEMY'}],
    },
    {
        id: 'sunquan_strike_plus',
        name: 'Wu Strike+',
        type: 'ATTACK',
        cost : 1,
        target: 'ENEMY',
        value: 9, 
        effect: [{ type: 'damage', value: 6, target: 'ENEMY'}],
        upgraded: true,
    },
    {
        id: 'sunquan_tide',
        name: 'Rising Tide',
        type: 'ATTACK',
        cost: 1,
        target: 'ENEMY',
        value: 3,
        effects: [{ type: 'damage', value: 3, target: 'ENEMY'}],
    },
    {
        id: 'sunquan_flame',
        name: 'Fire at Red Cliffs',
        type: 'ATTACK',
        cost: 2,
        target: 'ALL_ENEMIES',
        value: 6,
        effects: [
            { type: 'damage', value: 6, target: 'ALL_ENEMIES'},
            { type: 'apply_status', value: 2, target: 'ALL_ENEMIES', statusId: 'burning'},
        ],
    },
    {
        id: 'sunquan_defend',
        name: 'Wu Defend',
        type: 'SKILL',
        cost: 1,
        target: 'SELF',
        value: 5,
        effects: [{ type: 'block', value: 5, target: 'SELF'}],
    },
    {
        id: 'sunquan_defend_plus',
        name: 'Wu Defend+',
        type: 'SKILL',
        cost: 1,
        target: 'SELF',
        value: 8,
        effect: [{ type: 'block', value: 8, target: 'SELF' }],
        upgraded: true,
    },
    {
        id: 'sunquan_river',
        name: 'River Defense',
        type: 'SKILL',
        cost: 1,
        target: 'SELF',
        value: 6,
        effects: [{ type: 'block', value: 6, target: 'SELF'}],
    },
    {
        id: 'sunquan_fleet',
        name: 'Fleet Commander',
        type: 'SKILL',
        cost: 2,
        target: 'SELF',
        effects: [{ type: 'draw', value: 3, target: 'SELF'}],
    },
    {
        id: 'sunquan_admiral',
        name: 'Admiral\'s Order',
        type: 'POWER',
        cost: 0,
        target: 'SELF',
        effects: [{ type: 'draw', value: 1, target: 'SELF'}]
    },
    {
        id: 'sunquan_sovereign',
        name: 'Soverign',
        type: 'POWER',
        count: 2,
        target: 'SELF',
        effects: [],
        description: 'Power: Your attacks deal 2 more damage.',
    },
    {
        id: 'sunquan_current',
        name: 'Current',
        type: 'SKILL',
        cost: 1,
        target: 'ENEMY',
        value: 4,
        effect: [
            { type: 'damage', value: 4, target: 'ENEMY' },
            { type: 'block', value: 4, target: 'SELF' },
        ],
    },
    {
        id: 'sunquan_wave',
        name: 'Tidal Wave',
        type: 'ATTACK',
        cost: 3,
        target: 'ALL_ENEMIES',
        value: 10,
        effects: [{ type: 'damage', value: 10, target: 'ALL_ENEMIES'}],
    },
    {
        id: 'sunquan_naval',
        name: 'Naval Sepremacy',
        type: 'POWER',
        cost: 3,
        target: 'SELF',
        effects: [],
        description: 'Power: At the start of your turn, gain 4 Block and 1 Formation.',
    },
    {
        id: 'sunquan_count',
        name: 'Tide Counter',
        type: 'SKILL',
        cost: 0,
        target: 'SELF',
        effect: [{ type: 'energy', value: 1, target: 'SELF'}],
        exhaust: true,
    },
    {
        id: 'sunquan_vigilance',
        name: 'Vigilance',
        type: 'SKILL',
        cost: 1,
        target: 'SELF',
        value: 8,
        effects: [{ type: 'block', value: 8, target: 'SELF'}],
    },
    {
        id: 'sunquan_assault',
        name: 'River Assault',
        type: 'ATTACK',
        cost: 2,
        target: 'ENEMY',
        value: 12,
        effect: [{ type: 'damage', value: 12, target: 'ENEMY'}],
    },
    {
        id: 'sunquan_strategy',
        name: 'Eastern Strategy',
        type: 'SKILL',
        cost: 1, 
        target: 'SELF',
        effects: [{ type: 'draw', value: 2, target: 'SELF' }, { type: 'energy', value: 1, target: 'SELF' }],
        exhaust: true,
    },
    {
        id: 'sunquan_barrier',
        name: 'River Barrier',
        type: 'SKILL',
        cost: 2,
        target: 'SELF',
        value: 14, 
        effects: [{ type: 'block', value: 14, target: 'SELF'}],
    },
    {
        id: 'sunquan_fury',
        name: 'River Fury',
        type: 'ATTACK',
        cost: 1,
        target: 'ALL_ENEMIES',
        value: 4,
        effects: [{type: 'damage', value: 4, target: 'ALL_ENEMIES'}],
    },
    {
        id: 'sunquen_fury_plus',
        name: 'River Fury+',
        type: 'ATTACK'
        cost: 1,
        target: 'ALL_ENEMIES',
        value: 6,
        effects: [{ type: 'damage', value: 6, target: 'ALL_ENEMIES'}],
        upgraded: true,
    },
];

// Card reg 

export const allCards: ReadonlyMap<string, Card> = new Map([
  ...caoCaoCards.map((c) => [c.id, c] as const),
  ...liuBeiCards.map((c) => [c.id, c] as const),
  ...sunQuanCards.map((c) => [c.id, c] as const),
]);


export function getCard(id: string): Card | undefined {
    const card = allCards.get(id);
    if (!card) return undefined;
    return JSON.parse(JSON.stringify(card));
}

 
 //Get starting deck for a character
 
export function getStartingDeck(characterId: string): Card[] {
  const basicAttack = getCard(
    characterId === 'caocao'
      ? 'caocao_strike'
      : characterId === 'liubei'
        ? 'liubei_strike'
        : 'sunquan_strike'
  )!;

  const basicDefend = getCard(
    characterId === 'caocao'
      ? 'caocao_defend'
      : characterId === 'liubei'
        ? 'liubei_defend'
        : 'sunquan_defend'
  )!;

  // Standard starting deck for all characters with 4 attacks 4 defends and 1 skill
  const deck: Cardp[] = [];
  for (let i = 0; i < 4; i++) {
    deck.push(getCard(basicAttack.id)!);
    deck.push(getCard(basicDefend.id)!);
  }

  const startingSkill = getCard(
    characterId === 'caocao'
      ? 'caocao_influence'
      : characterId === 'liubei'
        ? 'liubei_oath'
        : 'sunquean_admiral'
  )!;
  deck.push(startingSkill);

  return deck; 
}