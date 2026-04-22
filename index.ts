export type CardType = 'ATTACK' | 'SKILL' | 'POWER' | 'STATUS' | 'CURSE';
export type CardTarget = 'SELF' | 'ENEMY' | 'ALL_ENEMIES' | 'ALL'; // not including allies because youre gonna be a single player anyways 
export type GuardianClass = 'ATTACK' | 'GUARD' | 'TACTIC'; 
export type CardRarity = 'COMMON' | 'UNCOMMON' | 'RARE';
export type RelicTier = 'STANDARD' | 'PREMIUM'; //idk what else to call it other than premium, maybe mythical? not sure might change in the future

export type EffectType = 
  | 'damage'
  | 'block'
  | 'energy'
  | 'apply_status'
  | 'summon';


export interface Effect {
  type: EffectType;
  value: number;
  target: CardTarget;
  statusId?: StatusId; // required when apply_status is called since we will have different types of statuses
	summonEnemyId?: string; // required when summon is called since we have multiple enemies lol
}

export interface Card {
	id: string;
	name: string;
	type: CardType;
	rarity?: CardRarity;
	cost: number;
	target: CardTarget;
	value?: number;
	effects: Effect[];
	upgraded?: boolean; // Might change for the future cuz cards might have an index as to how much they can get upgraded
	exhaust?: boolean;
	retain?:boolean;
	fleeting?: boolean;
	character?: string; // which charactr the card belongs to 
	description?: string; //desc of the card
	emoji?: string; // using placeholer right now for rendering, but will swap to art later on 
	tags?: string[]; //Future stuff like relics 
}

// Status effects

export type StatusId =
  | 'valor'
  | 'formation'
  | 'exposed'
  | 'disarmed'
  | 'burning'
  | 'bleed'
  | 'broken_formation'
  | 'entrenched'
  | 'momentum'
  | 'command'
  | 'fire_setup'
  | 'panic'
  | 'supply_shortage'
  | 'isolated'
  | 'insight'
  | 'guarded'
  | 'revealed'
  | 'evade'
  | 'starving'
  | 'low_morale'
  | 'fire'
  | 'encircled'
  | 'rallied'
  | 'frost'
  | 'poison'
  | 'strength'
  | 'weak'
  | 'vulnerable';

export interface Status {
  id: StatusId;
  name: string;
  description: string;
  stacks: number;
  duration?: number | null;
}

export interface PowerInstance {
  id: string;
  cardId: string;
  name: string;
  description: string;
}

//Combat

export type TurnPhase =
  | 'START_PLAYER_TURN'
  | 'DRAW_PHASE'
  | 'PLAYER_ACTION'
  | 'RESOLVE_QUEUE'
  | 'END_PLAYER_TURN'
  | 'START_ENEMY_TURN'
  | 'ENEMY_ACTION'
  | 'CLEANUP'
  | 'CHECK_END';

export interface Combatant {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  statuses: Status[];
  resources?: Record<string, number>;
}

export interface EnemyIntent {
  type: EffectType | 'intent';
  value: number;
  target: CardTarget;
  effects: Effect[];
  label?: string;
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  intent: EnemyIntent | null;
  statuses: Status[];
  lastIntentKey?: string;
  intentCursor?: number;
  isSummon?: boolean;
  isIllusion?: boolean;
  isReal?: boolean;
  illusionGroupId?: string;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  baseHp: number;
  aiStyle?: 'weighted' | 'cycle';
  intents: EnemyIntentPattern[];
  startsWithIllusions?: number;
  canUseGuardianCycle?: boolean;
  hiddenIntentWhenUnrevealed?: boolean;
}

/** Weighted intent option for enemy rule based AI (maybe put like a plugin to hackai here or smth for chaos engine extension in the future) */
export interface EnemyIntentPattern{
  id: string;
  weight: number;
  effects: Effect[];
}

export interface CombatState {
  player: Combatant;
  enemies: Enemy[];
  playerPowers: PowerInstance[];
  drawPile: Card[];
  discardPile: Card[];
  exhaustPile: Card[];
  hand: Card[];
  currentPhase: TurnPhase;
  effectQueue: Effect[];
  turnNumber: number;
  forbiddenCardClass: GuardianCardClass | null;
  guardianPunishedThisTurn: boolean;
}

export type NodeType = 
  | 'BATTLE'
  | 'ELITE'
  | 'EVENT'
  | 'REST'
  | 'MERCHANT'
  | 'MYSTERY'
  | 'TREASURE'
  | 'BOSS';

export interface MapNode {
  id: string;
  type: NodeType;
  act: number;
  x: number; // Note: for render
  y: number; // also for render
  connections: string[]; //Node ID 
  data?: unknown; 
  /** Control points for outgoing connections */
  curveData?: Record<string, { cp1x: number; cp1y: number; cp2x: number; cp2y: number }>;
}

export interface MapGraph {
  nodes: MapNode[];
  seed: string;
  act: number;
  debug?: {
    pathBias?: 'safe' | 'greedy' | 'aggressive';
    favoredRow?: number;
    appliedSetPiece?: NodeType[];
    setPieceStartColumn?: number | null;
    appliedCampaignChainId?: string | null;
    appliedCampaignChainTitle?: string | null;
  };
}
  
//Relics

export type RelicHook = 
  | 'onCombatStart'
  | 'onTurnStart'
  | 'onCardPlayed'
  | 'onEnemyKilled'
  | 'onTurnEnd'
  | 'onDamageTaken'
  | 'onBlockGained'

export interface RelicContext { 
  combatState: CombatState;
  effectQueue: { enqueue: (effects: Effect | Effect[]) => void };
  card?: Card;
  enemyIndex?: number;
  damageAmount?: number;
  blockAmount?: number;
  rng?: {
    next: () => number;
    nextInt: (min: number, max: number) => number;
  };
}

export interface Relic {
  id: string;
  name: string;
  tier?: RelicTier;
  description: string;
  hooks: RelicHook[];
  effect: (context: RelicContext) => void;
}


export type CharacterId = 'caocao' | 'liubei' | 'sunquan';

export interface Character {
  id: CharacterId;
  name: string;
  displayName: string;
  hp: number;
  maxHp: number;
  energy: number;
  resource: string; // This is for the character specific quirks and passive IE liubei loyalty sunquan fire
  resourceAmount: number;
  startingDeck: string[]; //card ID should go here, but im not sure regarding the data type, it might be number or i can do a A-1011 or B 1011 scenario
  startingRelic: string;
  startingTrait: string;
}

//Event system 

export interface EventChoice {
  text: string;
  outcome: EventOutcome;
}

export type EventCharacterTag = 'shared' | 'liubei' | 'caocao' | 'sunquan';
export type EventActTag = 'act1' | 'act2' | 'act3' | 'all';
export type EventSystemTag = 
  | 'morale'
  | 'command'
  | 'supply'
  | 'fire'
  | 'formation'
  | 'terrain'
  | 'economy'
  | 'deck_surgery'
  | 'next_combat'
  | 'risk_reward'
  | 'healing'
  | 'tempo';
export type EventToneTag =
  | 'benevolence'
  | 'authority'
  | 'timing'
  | 'sacrifice'
  | 'control'
  | 'logistics'
  | 'setup'
  | 'heroism'
  | 'ruthlessness';
export type EventTimelineTag = 'collapse' | 'rise' | 'dominance' | 'fragmentation'; //secret
export type EventFamily = 
  | 'burden'
  | 'alliance'
  | 'retreat_recovery'
  | 'talent'
  | 'rebuilding'
  | 'fire_setup'
  | 'river_warfare'
  | 'weather_timing'
  | 'naval_preparation'
  | 'diplomacy'
  | 'morale_crisis'
  | 'logistics'
  | 'deck_surgery'
  | 'terrain'
  | 'administration'
  | 'discipline'
  | 'coercion'
  | 'authority'
  | 'healing'
  | 'economy'
  | 'duel'
  | 'formation'
  | 'command'
  | 'supply';
export type EventSelectionCategory = 'shared' | 'character' | 'act';

export interface EventOutcome {
  type: 'hp' | 'gold' | 'card' | 'relic' | 'status' | 'combat' | 'remove_card' | 'upgrade' | 'none';
  value?: number;
  cardId?: string;
  relicId?: string;
  statusId?: StatusId;
  statusStacks?: number;
  enemyIds?: string[];
  combatModifiers?: {
    playerStatuses?: Array<{ id: StatusId; stacks: number }>;
    enemyStatuses?: Array<{ id: StatusId; stacks: number }>;
  };
}

export interface EventDefinition {
  id: string;
  title: string;
  characterTags: EventCharacterTag[];
  actTag: EventActTag;
  timeline: EventTimelineTag;
  systemTags: EventSystemTag[];
  toneTags: EventToneTag
  family: EventFamily;
  weightBase: number;
  rarity: 'common' | 'uncommon' | 'rare';
  utilityScore: number;
  identityScore: number;
  riskScore: number;
  repeatCooldown: number;
}

export interface CampaignChainNode {
  nodeType: NodeType;
  mysteryType?: 'event' | 'ambush' | 'risk_reward';
  forcedEventId?: string;
  encounterFamilyId?: string;
}

export interface CampaignSetPieceChain {
  id: string;
  character: CharacterId;
  act: 2 | 3;
  title: string;
  trigger: {
    act: number;
    pathBias?: 'safe' | 'greedy' | 'aggressive'; //to check for player style
    priorEventId?: string;
  };
  sequence: CampaignChainNode[];
  narrativePremise: string;
  mechanicalArc: string;
  costRewardIdentity: string;
}

export interface EncounterFamilyDefinition {
  id: string;
  label: string;
  acts: number[];
  systems: EventSystemTag[];
  enemies: string[];
  interaction: string;
  playerPressure: string;
  counterplay: string;
}

export interface AuthoredEncounterDefinition {
  id: string;
  label: string;
  act: number;
  enemies: string[];
  encounterFamilyId?: string;
  historicalBasis: string;
}

export interface GameEvent {
  id: string;
  title: string;
  text: string;
  choices: EventChoice[];
}

export interface EventHistoryEntry {
  id: string;
  act: number;
  category: EventSelectionCategory;
  family: EventFamily;
  source: 'event' | 'mystery';
}

export interface EventSelectionDebugAttempt {
  attempt: number;
  desiredCategory: EventSelectionCategory;
  eligibleCount: number;
  weightedCount: number;
  weightedCandidates: Array<{
    id: string;
    weight: number;
    family: EventFamily;
    timeline: EventTimelineTag;
  }>;
}

export interface EventSelectionDebugInfo {
  character: CharacterId;
  act: number;
  pool: 'general' | 'risk_reward';
  source: 'event' | 'mystery';
  categoryWeights: Record<EventSelectionCategory, number>;
  chosenCategory: EventSelectionCategory;
  chosenEventId: string;
  attempts: EventSelectionDebugAttempt[];
}

// Rewards

export interface RewardData {
  gold: number;
  cardOptions?: string[];
  relicId?: string;
  relicOptions?: string[];
}

export interface NextCombatModifiers {
  energyPerTurnBonus: number;
  temporaryExhaustCardId?: string;
  startStatuses: Status[];
  enemyStartStatuses: Status[];
}

export interface ShopInventory {
  cardIds: string[];
  relicIds: string[];
  rerollCount: number;
}

// Chronicle system

export interface ChronicleFlags {
  //These are the flags computed from player choice data
  worldState: string;
  mapWeightModifiers: Partial<Record<NodeType, number>>;
  unlockedEvents: string[];
  cardPoolModifiers: Record<string, number>;
  bossVariants: string[];
}

export interface ChronicleEntry {
  seed: string;
  character: CharacterId;
  result: 'victory' | 'defeat';
  floor: number;
  timestamp: number;
}

//Save files

export const SAVE_VERSION = '0.2.0';

export interface SaveData {
  version: string;
  run?: RunState;
  unlockedCharacters: CharacterId[];
  unlockedRelics: string[];
  chronicle: ChronicleEntry[];
  Flags: ChronicleFlags;
}

export interface RunState {
  character: CharacterId;
  hp: number;
  maxHp: number;
  gold: number;
  deck: Card[];
  relics: Relic[];
  pendingStatuses: Status[];
  currentMap: MapGraph;
  currentNode: string | null;
  act: number;
  seed: string;
  purgeCost: number;
  nextCombatModifiers: NextCombatModifiers;
  currentShop?: ShopInventory;
  eventHistory: EventHistoryEntry[];
}


//Narrative / Chronicle / Prelude


export interface NarrativeFlags {
  pragmatism: number;
  idealism: number;
  ambition: number;
  restraint: number;
  loyalty: number;
  compassion: number;
  authority: number;
  adaptability: number;
  [key: string]: number; //For future expansion lel 
}

export interface RunResult {
  character: CharacterId;
  depth: number; // 0 -3 for acts completed, 0 for prelude
  death: boolean;
  axisScores: Record<string, number>;
  choices: string[];
  timestamp: number;
}

export interface LoreEvent {
  year: string; // For ease of writing since some timeline gaps occur during the actual sanguo lore 
  title: string;
  text: string;
}

export interface PreludeChoice { // Choices you make in the prelude DO matter
  text: string;
  axisChanges: Record<string, number>;
  reward?: string | null;
}

export interface PreludeNode {
  id: string;
  type: 'event' | 'battle' | 'boss_preview';
  title?: string;
  text?: string;
  choices?: PreludeChoice[];
  enemy?: string;
  reward?: {
    type: 'card' | 'relic';
    options: string[];
  };
  boss?: string;
  unlock?: {
    character: CharacterId;
    trait: string;
    relic: string;
  };
}

export interface PreludeConfig {
  character: CharacterId;
  startingDeck: string[];
  axes: { axis1: string; axis2: string; axis3?: string; axis4?: string };
  nodes: PreludeNode[];
}