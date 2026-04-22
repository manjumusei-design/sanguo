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

export class EffectQueue {
  private queue: QueuedEffect[] = [];
  private executing = false;
  private onComplete: (() => void) | null = null;

  enqueue(
    effects: Effect | Effect[] | QueuedEffect | QueuedEffect[],
    context: Omit<QueuedEffect, 'effect'> = { source: 'player' }
  ): void {
    const asArray = Array.isArray(effects) ? effects : [effects];
    for (const item of asArray) {
      if ('effect' in item) {
        this.queue.push(item);
      } else {
        this.queue.push({
          effect: item,
          source: context.source,
          sourceEnemyIndex: context.sourceEnemyIndex,
          targetEnemyIndex: context.targetEnemyIndex,
        });
      }
    }
  }


  execute(
    combatState: CombatState,
    resolveQueuedEffect: (queuedEffect: QueuedEffect, combatState: CombatState) => void,
    onComplete?: () => void
  ): void {
    if (this.executing || this.queue.length === 0) {
      onComplete?.();
      return;
    }

    this.executing = true;
    this.onComplete = onComplete ?? null;
    this.processNext(combatState, resolveQueuedEffect);
  }

  clear(): void {
    this.queue = [];
    this.executing = false;
    this.onComplete = null;
  }

  hasPending(): boolean {
    return this.queue.length > 0;
  }

  length(): number {
    return this.queue.length;
  }

  private processNext(
    combatState: CombatState,
    resolveQueuedEffect: (queuedEffect: QueuedEffect, combatState: CombatState) => void
  ): void {
    if (this.queue.length === 0) {
      this.executing = false;
      this.onComplete?.();
      return;
    }

    const queuedEffect = this.queue.shift()!;
    resolveQueuedEffect(queuedEffect, combatState);

    setTimeout(() => {
      this.processNext(combatState, resolveQueuedEffect);
    }, 0);
  }
}

export function createEffectResolver(options: EffectResolverOptions = {}) {
  return (queuedEffect: QueuedEffect, combatState: CombatState) => {
    resolveQueuedEffect(queuedEffect, combatState, options);
  };
}

export function resolveEffect(
  effect: Effect,
  combatState: CombatState,
  options: EffectResolverOptions = {}
): void {
  resolveQueuedEffect(
    {
      effect,
      source: 'player',
    },
    combatState,
    options
  );
}

export function resolveQueuedEffect(
  queuedEffect: QueuedEffect,
  combatState: CombatState,
  options: EffectResolverOptions = {}
): void {
  switch (queuedEffect.effect.type) {
    case 'damage':
      applyDamage(queuedEffect, combatState, options);
      break;
    case 'block':
      applyBlock(queuedEffect, combatState, options);
      break;
    case 'draw':
      applyDraw(queuedEffect, combatState, options);
      break;
    case 'energy':
      applyEnergy(queuedEffect, combatState);
      break;
    case 'apply_status':
      applyStatus(queuedEffect, combatState, options);
      break;
    case 'summon':
      applySummon(queuedEffect, combatState, options);
      break;
  }
}

function applyDamage(
  queuedEffect: QueuedEffect,
  combatState: CombatState,
  options: EffectResolverOptions
): void {
  const targets = getTargets(queuedEffect.effect.target, combatState, queuedEffect);
  for (const target of targets) {
    if (queuedEffect.source === 'player' && isFakeIllusion(target)) {
      target.hp = 0;
      revealIllusionGroup(combatState, target.illusionGroupId);
      continue;
    }

    if (consumeEvadeIfPresent(target)) {
      continue;
    }

    let rawDamage = queuedEffect.effect.value;

    if (queuedEffect.source === 'player' && target.id !== combatState.player.id) {
      const playerStrength = getStatusStacks(combatState.player, 'strength');
      const playerValor = getStatusStacks(combatState.player, 'valor');
      const playerRallied = getStatusStacks(combatState.player, 'rallied');
      const playerLowMorale = getStatusStacks(combatState.player, 'low_morale');
      const playerMomentum = getStatusStacks(combatState.player, 'momentum');
      rawDamage += playerStrength * 2;
      rawDamage += playerValor * 2;
      rawDamage += playerRallied * 2;
      rawDamage += playerMomentum * 2;

      if (
        hasStatus(combatState.player, 'weak') ||
        hasStatus(combatState.player, 'disarmed') ||
        playerLowMorale > 0
      ) {
        rawDamage = Math.floor(rawDamage * 0.75);
      }

      forEachPlayerPower(combatState, (definition) => {
        rawDamage = definition.modifyDamageDealt?.(rawDamage, combatState, queuedEffect, target as Enemy) ?? rawDamage;
      });

      if (queuedEffect.effect.target === 'ENEMY' && hasStatus(target, 'isolated')) {
        rawDamage += 3;
      }

      if (hasStatus(target, 'supply_shortage') && options.relicManager?.hasRelic('foragers_knife')) {
        rawDamage += 3;
      }
    }

    if (queuedEffect.source === 'enemy' && target.id === combatState.player.id) {
      const enemy = getSourceEnemy(combatState, queuedEffect.sourceEnemyIndex);
      rawDamage += getStatusStacks(enemy, 'strength') * 2;
      rawDamage += getStatusStacks(enemy, 'valor') * 2;

      if (hasStatus(enemy, 'weak') || hasStatus(enemy, 'disarmed')) {
        rawDamage = Math.floor(rawDamage * 0.75);
      }
    }

    if (hasStatus(target, 'vulnerable') || hasStatus(target, 'exposed')) {
      rawDamage = Math.floor(rawDamage * 1.5);
    }

    const blockAbsorbed = Math.min(target.block, rawDamage);
    target.block -= blockAbsorbed;
    const remainingDamage = rawDamage - blockAbsorbed;
    target.hp = Math.max(0, target.hp - remainingDamage);

    if (target.id === combatState.player.id && remainingDamage > 0) {
      options.relicManager?.invoke('onDamageTaken', {
        combatState,
        effectQueue: { enqueue: () => undefined },
        damageAmount: remainingDamage,
        rng: options.rng,
      });
    }

    if (queuedEffect.source === 'player' && target.id !== combatState.player.id && remainingDamage > 0) {
      if (hasStatus(combatState.player, 'momentum')) {
        removeStatus(combatState.player, 'momentum');
      }
      if (isEnemyCombatant(target)) {
        revealRealIllusionTarget(target);
        revealIllusionGroup(combatState, target.illusionGroupId);
      }
    }
  }
}

function applyBlock(
  queuedEffect: QueuedEffect,
  combatState: CombatState,
  options: EffectResolverOptions
): void {
  const targets = getTargets(queuedEffect.effect.target, combatState, queuedEffect);
  for (const target of targets) {
    if (hasStatus(target, 'encircled')) continue;

    let blockValue = queuedEffect.effect.value;
    blockValue += getStatusStacks(target, 'formation');
    blockValue += getStatusStacks(target, 'rallied') * 2;
    if (hasStatus(target, 'broken_formation')) {
      blockValue = Math.floor(blockValue * 0.5);
    }

    if (target.id === combatState.player.id) {
      forEachPlayerPower(combatState, (definition) => {
        blockValue = definition.modifyBlockGained?.(blockValue, combatState, queuedEffect) ?? blockValue;
      });
    }

    target.block += blockValue;

    if (target.id === combatState.player.id && blockValue > 0) {
      options.relicManager?.invoke('onBlockGained', {
        combatState,
        effectQueue: { enqueue: () => undefined },
        blockAmount: blockValue,
        rng: options.rng,
      });
    }
  }
}

function applyDraw(
  queuedEffect: QueuedEffect,
  combatState: CombatState,
  options: EffectResolverOptions
): void {
  for (let i = 0; i < queuedEffect.effect.value; i++) {
    if (combatState.drawPile.length === 0) {
      const newDrawPile = [...combatState.discardPile];
      shuffleInPlace(newDrawPile, options.rng);
      combatState.drawPile = newDrawPile;
      combatState.discardPile = [];
    }

    if (combatState.drawPile.length > 0) {
      const card = combatState.drawPile.pop()!;
      combatState.hand.push(card);
    }
  }
}

function applyEnergy(queuedEffect: QueuedEffect, combatState: CombatState): void {
  combatState.player.energy = Math.max(0, combatState.player.energy + queuedEffect.effect.value);
}

function applyStatus(
  queuedEffect: QueuedEffect,
  combatState: CombatState,
  options: EffectResolverOptions
): void {
  const targets = getTargets(queuedEffect.effect.target, combatState, queuedEffect);
  const statusId = queuedEffect.effect.statusId ?? 'fire';
  const stacks = Math.max(1, queuedEffect.effect.value);

  for (const target of targets) {
    if (isFakeIllusion(target)) {
      continue;
    }

    if (
      statusId === 'panic' &&
      target.id === combatState.player.id &&
      options.relicManager?.hasRelic('relic_silent_court')
    ) {
      combatState.player.resources = combatState.player.resources ?? {};
      if ((combatState.player.resources.relic_silent_court_used ?? 0) === 0) {
        combatState.player.resources.relic_silent_court_used = 1;
        continue;
      }
    }

    if (hasStatus(target, 'guarded') && isDebuffStatus(statusId)) {
      decrementStatus(target, 'guarded');
      continue;
    }

    if ((statusId === 'momentum' || statusId === 'command') && hasStatus(target, 'supply_shortage')) {
      continue;
    }

    if (statusId === 'burning') {
      const source = queuedEffect.source === 'enemy'
        ? getSourceEnemy(combatState, queuedEffect.sourceEnemyIndex)
        : combatState.player;
      if (!source) {
        continue;
      }
      const fireSetupStacks = getStatusStacks(source, 'fire_setup');
      if (fireSetupStacks > 0) {
        removeStatus(source, 'fire_setup');
      }
      const manualBonus = queuedEffect.source === 'player' && options.relicManager?.hasRelic('manual_of_fire_attack') ? 1 : 0;
      const effectiveStacks = stacks + fireSetupStacks * 2 + manualBonus;
      const existing = target.statuses.find((status) => status.id === statusId);
      if (existing) {
        existing.stacks += effectiveStacks;
      } else {
        target.statuses.push(createStatus(statusId, effectiveStacks));
      }
      if (queuedEffect.source === 'player') {
      options.relicManager?.invoke('onStatusApplied', {
        combatState,
        effectQueue: {
          enqueue: (effects, context) =>
            applyImmediateEffects(
              combatState,
              options,
              effects,
              context?.targetEnemyIndex ?? queuedEffect.targetEnemyIndex,
              context?.source ?? 'player',
              context?.sourceEnemyIndex
            ),
        },
        statusId,
        statusStacks: effectiveStacks,
          statusTarget: queuedEffect.effect.target === 'ENEMY' ? 'enemy' : queuedEffect.effect.target === 'ALL_ENEMIES' ? 'all_enemies' : 'self',
          targetEnemyIndex: queuedEffect.targetEnemyIndex,
          rng: options.rng,
        });
      }
      continue;
    }

    const existing = target.statuses.find((status) => status.id === statusId);
    if (existing) {
      existing.stacks += stacks;
      const created = createStatus(statusId, stacks);
      if (created.duration !== undefined && created.duration !== null) {
        existing.duration = Math.max(existing.duration ?? 0, created.duration);
      }
    } else {
      target.statuses.push(createStatus(statusId, stacks));
    }

    if (queuedEffect.source === 'player' && target.id === combatState.player.id) {
      if (statusId === 'rallied' && options.relicManager?.hasRelic('war_banner_yi')) {
        target.block += 2;
      }
      if (statusId === 'panic' && options.relicManager?.hasRelic('fractured_standard')) {
        const momentum = target.statuses.find((status) => status.id === 'momentum');
        if (momentum) {
          momentum.stacks += 1;
        } else {
          target.statuses.push(createStatus('momentum', 1));
        }
      }
    }

    if (queuedEffect.source === 'player' && isEnemyCombatant(target) && statusId === 'broken_formation' && options.relicManager?.hasRelic('broken_spear')) {
      const absorbed = Math.min(target.block, 5);
      target.block -= absorbed;
      target.hp = Math.max(0, target.hp - (5 - absorbed));
    }

    if (queuedEffect.source === 'player') {
      options.relicManager?.invoke('onStatusApplied', {
        combatState,
        effectQueue: {
          enqueue: (effects, context) =>
            applyImmediateEffects(
              combatState,
              options,
              effects,
              context?.targetEnemyIndex ?? queuedEffect.targetEnemyIndex,
              context?.source ?? 'player',
              context?.sourceEnemyIndex
            ),
        },
        statusId,
        statusStacks: stacks,
        statusTarget: queuedEffect.effect.target === 'ENEMY' ? 'enemy' : queuedEffect.effect.target === 'ALL_ENEMIES' ? 'all_enemies' : 'self',
        targetEnemyIndex: queuedEffect.targetEnemyIndex,
        rng: options.rng,
      });
    }
  }
}

function applyImmediateEffects(
  combatState: CombatState,
  options: EffectResolverOptions,
  effects: Effect | Effect[],
  targetEnemyIndex?: number,
  source: EffectSource = 'player',
  sourceEnemyIndex?: number
): void {
  const list = Array.isArray(effects) ? effects : [effects];
  for (const effect of list) {
    resolveQueuedEffect(
      {
        effect,
        source,
        sourceEnemyIndex,
        targetEnemyIndex,
      },
      combatState,
      options
    );
  }
}

function applySummon(
  queuedEffect: QueuedEffect,
  combatState: CombatState,
  options: EffectResolverOptions
): void {
  if (queuedEffect.source !== 'enemy' || !queuedEffect.effect.summonEnemyId) {
    return;
  }

  if (combatState.enemies.filter((enemy) => enemy.hp > 0).length >= 4) {
    return;
  }

  const enemy = spawnEnemy(
    queuedEffect.effect.summonEnemyId,
    options.rng ?? new RNG('summon-fallback'),
    1
  );
  enemy.isSummon = true;
  enemy.intent = null;
  combatState.enemies.push(enemy);
}

function getStatusName(id: StatusId): string {
  const names: Record<StatusId, string> = {
    valor: 'Valor',
    formation: 'Formation',
    exposed: 'Exposed',
    disarmed: 'Disarmed',
    burning: 'Burning',
    bleed: 'Bleed',
    broken_formation: 'Broken Formation',
    entrenched: 'Entrenched',
    momentum: 'Momentum',
    command: 'Command',
    fire_setup: 'Fire Setup',
    panic: 'Panic',
    supply_shortage: 'Supply Shortage',
    isolated: 'Isolated',
    insight: 'Insight',
    guarded: 'Guarded',
    revealed: 'Revealed',
    evade: 'Evade',
    starving: 'Starving',
    low_morale: 'Low Morale',
    fire: 'Fire',
    encircled: 'Encircled',
    rallied: 'Rallied',
    frost: 'Frost',
    poison: 'Poison',
    strength: 'Strength',
    weak: 'Weak',
    vulnerable: 'Vulnerable',
  };
  return names[id] ?? id;
}

function getStatusDescription(id: StatusId): string {
  const descriptions: Record<StatusId, string> = {
    valor: '+2 attack damage per stack',
    formation: '+1 block gained per stack',
    exposed: 'Take 50% more damage from attacks',
    disarmed: 'Deal 25% less attack damage',
    burning: 'Take damage equal to stacks at end of turn',
    bleed: 'Take half stacks damage at end of turn',
    broken_formation: 'Block gain reduced by 50%',
    entrenched: 'Retain 50% block between turns',
    momentum: 'Next attack gains bonus damage',
    command: 'Strategic resource',
    fire_setup: 'Next Burning application is amplified',
    panic: 'First card each turn costs 1 more energy',
    supply_shortage: 'Cannot gain Momentum or Command',
    isolated: 'Takes bonus damage from single-target attacks',
    insight: 'Deck manipulation support',
    guarded: 'Negates the next debuff',
    revealed: 'True target exposed',
    evade: 'Negates the next incoming hit',
    starving: '-1 Energy next turn',
    low_morale: 'Deal 25% less damage this turn',
    fire: '3 damage per turn',
    encircled: 'Cannot gain block',
    rallied: '+2 damage and +2 block this turn',
    frost: '-1 Energy next turn',
    poison: 'Damage equal to stacks per turn',
    strength: '+2 damage per stack',
    weak: 'Deal 25% less damage',
    vulnerable: 'Take 50% more damage',
  };
  return descriptions[id] ?? '';
}

function getTargets(
  target: CardTarget,
  combatState: CombatState,
  queuedEffect: QueuedEffect
): (Combatant | Enemy)[] {
  const sourceEnemy = getSourceEnemy(combatState, queuedEffect.sourceEnemyIndex);

  switch (target) {
    case 'SELF':
      return queuedEffect.source === 'enemy' && sourceEnemy ? [sourceEnemy] : [combatState.player];
    case 'ENEMY':
      if (queuedEffect.source === 'enemy') {
        return [combatState.player];
      }
      if (queuedEffect.targetEnemyIndex !== undefined) {
        const targetedEnemy = combatState.enemies[queuedEffect.targetEnemyIndex];
        return targetedEnemy && targetedEnemy.hp > 0 ? [targetedEnemy] : [];
      }
      return getAliveEnemies(combatState).slice(0, 1);
    case 'ALL_ENEMIES':
      if (queuedEffect.source === 'enemy') {
        return [combatState.player];
      }
      return getAliveEnemies(combatState);
    case 'ALL':
      return [combatState.player, ...getAliveEnemies(combatState)];
    default:
      return [];
  }
}

function getAliveEnemies(combatState: CombatState): Enemy[] {
  return combatState.enemies.filter((enemy) => enemy.hp > 0);
}

function getSourceEnemy(combatState: CombatState, sourceEnemyIndex?: number): Enemy | undefined {
  if (sourceEnemyIndex === undefined) {
    return combatState.enemies.find((enemy) => enemy.hp > 0);
  }
  return combatState.enemies[sourceEnemyIndex];
}

function getStatusStacks(target: Combatant | Enemy | undefined, statusId: StatusId): number {
  if (!target) {
    return 0;
  }

  return target.statuses.find((status) => status.id === statusId)?.stacks ?? 0;
}

function hasStatus(target: Combatant | Enemy | undefined, statusId: StatusId): boolean {
  return getStatusStacks(target, statusId) > 0;
}

function decrementStatus(target: Combatant | Enemy, statusId: StatusId): void {
  const status = target.statuses.find((entry) => entry.id === statusId);
  if (!status) return;
  status.stacks -= 1;
  if (status.stacks <= 0) {
    removeStatus(target, statusId);
  }
}

function consumeEvadeIfPresent(target: Combatant | Enemy): boolean {
  if (!hasStatus(target, 'evade')) {
    return false;
  }

  decrementStatus(target, 'evade');
  return true;
}

function isFakeIllusion(target: Combatant | Enemy): target is Enemy {
  return 'isIllusion' in target && target.isIllusion === true && target.isReal === false && target.hp > 0;
}

function isEnemyCombatant(target: Combatant | Enemy): target is Enemy {
  return 'intent' in target;
}

function revealRealIllusionTarget(target: Combatant | Enemy): void {
  if (!('isIllusion' in target) || !target.isIllusion || !target.isReal) {
    return;
  }

  if (!hasStatus(target, 'revealed')) {
    target.statuses.push(createStatus('revealed', 1));
  }
}

function revealIllusionGroup(combatState: CombatState, illusionGroupId?: string): void {
  if (!illusionGroupId) {
    return;
  }

  const remainingFakes = combatState.enemies.filter(
    (enemy) => enemy.hp > 0 && enemy.illusionGroupId === illusionGroupId && enemy.isIllusion && enemy.isReal === false
  );

  if (remainingFakes.length > 0) {
    return;
  }

  const realEnemy = combatState.enemies.find(
    (enemy) => enemy.hp > 0 && enemy.illusionGroupId === illusionGroupId && enemy.isIllusion && enemy.isReal
  );
  if (realEnemy && !hasStatus(realEnemy, 'revealed')) {
    realEnemy.statuses.push(createStatus('revealed', 1));
  }
}

function isDebuffStatus(statusId: StatusId): boolean {
  return [
    'exposed',
    'disarmed',
    'burning',
    'bleed',
    'broken_formation',
    'panic',
    'supply_shortage',
    'isolated',
    'starving',
    'low_morale',
    'fire',
    'encircled',
    'frost',
    'poison',
    'weak',
    'vulnerable',
  ].includes(statusId);
}

function shuffleInPlace<T>(array: T[], rng?: RNG): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const roll = rng ? rng.nextInt(0, i + 1) : Math.floor(Math.random() * (i + 1));
    [array[i], array[roll]] = [array[roll], array[i]];
  }
  return array;
}
