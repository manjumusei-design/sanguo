import { RNG } from '../core/RNG';
import type { CardTarget, CombatState, Combatant, Effect, Enemy, StatusId } from '../types';
import type { RelicManager } from '../systems/RelicManager';
import { spawnEnemy } from '../data/enemies';
import { createStatus, removeStatus } from './StatusSystem';
import { forEachPlayerPower } from './PowerSystem';

export type EffectSource = 'player' | 'enemy';

export interface QueuedEffect {
  effect: Effect;
  source: EffectSource;
  sourceEnemyIndex?: number;
  targetEnemyIndex?: number;
}

export interface EffectResolverOptions {
  rng?: RNG;
  relicManager?: RelicManager;
}




//Effectqueue 
export class EffectQueue {
 private queue: QueuedEffect[] =[];
 private executing = false;
 private onComplete: (() => void) | null = null;
 
 
 //Enqueue basically adds one or more effects to the queue 
 // Bare effects should default to the player as the source of the effect

enqueue(
	effects: Effect | Effect[] | QueuedEffect | QueuedEffect[],
	context: Omit<QueuedEffect, 'effect'> = { source: 'player' }
): void {
	const asArray = Array.isArray(effects) ? effects : [effects];
	
}
}