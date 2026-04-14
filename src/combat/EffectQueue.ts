import type {CardTarget, CombatState, Combatant, Enemy, Effect, StatusID} from '../types';
import type { RNG } from '../core/RNG';
import type { RelicManager } from '../systems/RelicManager';

export type EffectSource = 'player' | 'enemy'

export interface QueuedEffect {
    effect: Effect;
    source: EffectSource;
    sourceEnemyIndex?: number;
}

export interface EffectResolverOptions {
    rng?: RNG;
    relicManager?: RelicManager;
}

/**
 * EffectQueue - Strictly sequential execution of combat effects.
 * No parallel resolution nor no conditional branching during the execution.
 */
 export class EffectQueue {
 private queue: Effect[] = [];
 private executing = false;
 private onComplete:(() => void) | null = null;
 
/**
* Add one or more effects to the queue.
* 
*/
 enqueue(effects: Effect | Effect[]): void {
    if (Array.isArray(effects)) {
      this.queue.push(...effects);
    } else {
      this.queue.push(effects);
    }
  }

  /**
   * Execute all queued effects sequentially.
   * Calls onComplete when finished.
   */
  execute(
    combatState: CombatState,
    resolveEffect: (effect: Effect, combatState: CombatState) => void,
    onComplete?: () => void
  ): void {
    if (this.executing || this.queue.length === 0) {
      onComplete?.();
      return;
    }

    this.executing = true;
    this.onComplete = onComplete ?? null;

    this.processNext(combatState, resolveEffect);
  }

  /**
   *  Clear all pending effects without executing 
   */
  clear(): void {
    this.queue = [];
    this.executing = false;
    this.onComplete = null;