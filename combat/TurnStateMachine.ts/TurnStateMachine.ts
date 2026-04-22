import type { Card, CombatState, Enemy, TurnPhase } from '../types';
import { createEffectResolver, EffectQueue } from './EffectQueue';
import type { RelicManager } from '../systems/RelicManager';
import { generateEnemyIntent, getEnemyTemplate, getEnemyTemplateId } from '../data/enemies';
import type { RNG } from '../core/RNG';
import { forEachPlayerPower } from './PowerSystem';
import { cleanupExpiredStatuses, processStatusTrigger } from './StatusSystem';

export class TurnStateMachine {
  private combatState: CombatState;
  private effectQueue: EffectQueue;
  private currentPhase: TurnPhase = 'START_PLAYER_TURN';
  private relicManager?: RelicManager;
  private combatRNG?: RNG;
  private onCombatEnd?: (result: 'victory' | 'defeat') => void;

  constructor(
    combatState: CombatState,
    effectQueue: EffectQueue,
    options?: {
      relicManager?: RelicManager;
      enemyRNG?: RNG;
      onCombatEnd?: (result: 'victory' | 'defeat') => void;
    }
  ) {
    this.combatState = combatState;
    this.effectQueue = effectQueue;
    this.relicManager = options?.relicManager;
    this.combatRNG = options?.enemyRNG;
    this.onCombatEnd = options?.onCombatEnd;
    this.syncCombatPhase('START_PLAYER_TURN');
  }

  advance(onPhaseChange: (phase: TurnPhase) => void): void {
    this.transitionTo(this.currentPhase, onPhaseChange);
  }

  startCombat(onPhaseChange?: (phase: TurnPhase) => void): void {
    this.relicManager?.resetCombatState();
    this.relicManager?.invoke('onCombatStart', {
      combatState: this.combatState,
      effectQueue: this.effectQueue,
      rng: this.combatRNG,
    });

    this.effectQueue.execute(
      this.combatState,
      createEffectResolver({
        rng: this.combatRNG,
        relicManager: this.relicManager,
      }),
      () => {
        if (onPhaseChange) {
          this.advance(onPhaseChange);
        }
      }
    );
  }

  notifyCardPlayed(card: Card, targetEnemyIndex?: number): void {
    this.relicManager?.invoke('onCardPlayed', {
      combatState: this.combatState,
      effectQueue: this.effectQueue,
      card,
      targetEnemyIndex,
      rng: this.combatRNG,
    });
  }

  notifyEnemyKilled(enemyIndex: number): void {
    this.relicManager?.invoke('onEnemyKilled', {
      combatState: this.combatState,
      effectQueue: this.effectQueue,
      enemyIndex,
      rng: this.combatRNG,
    });
  }

  setPhase(phase: TurnPhase): void {
    this.syncCombatPhase(phase);
  }

  getCurrentPhase(): TurnPhase {
    return this.currentPhase;
  }

  private transitionTo(phase: TurnPhase, onPhaseChange: (phase: TurnPhase) => void): void {
    this.syncCombatPhase(phase);
    onPhaseChange(phase);

    switch (phase) {
      case 'START_PLAYER_TURN':
        this.onStartPlayerTurn();
        this.transitionTo('DRAW_PHASE', onPhaseChange);
        break;

      case 'DRAW_PHASE':
        this.onDrawPhase(onPhaseChange);
        break;

      case 'PLAYER_ACTION':
        break;

      case 'RESOLVE_QUEUE':
        this.onResolveQueue(onPhaseChange);
        break;

      case 'END_PLAYER_TURN':
        this.onEndPlayerTurn();
        this.transitionTo('START_ENEMY_TURN', onPhaseChange);
        break;

      case 'START_ENEMY_TURN':
        this.onStartEnemyTurn();
        this.transitionTo('ENEMY_ACTION', onPhaseChange);
        break;

      case 'ENEMY_ACTION':
        this.onEnemyAction(onPhaseChange);
        break;

      case 'CLEANUP':
        this.onCleanup();
        this.transitionTo('CHECK_END', onPhaseChange);
        break;

      case 'CHECK_END':
        this.onCheckEnd(onPhaseChange);
        break;
    }
  }

  private onStartPlayerTurn(): void {
    this.relicManager?.resetTurnState();
    this.combatState.turnNumber++;
    this.combatState.player.energy = 3 + (this.combatState.player.resources?.max_energy_bonus ?? 0);

    const preservedBlock = this.combatState.player.block;
    this.combatState.player.resources = this.combatState.player.resources ?? {};
    this.combatState.player.resources.anchor_block = preservedBlock;
    const ironDisciplineRetained = this.combatState.player.resources.relic_iron_discipline_retained ?? 0;
    this.combatState.player.block = this.combatState.player.statuses.some((status) => status.id === 'entrenched')
      ? Math.floor(preservedBlock * 0.5)
      : 0;
    if (ironDisciplineRetained > this.combatState.player.block) {
      this.combatState.player.block = ironDisciplineRetained;
    }
    this.combatState.player.resources.relic_iron_discipline_retained = 0;
    this.combatState.guardianPunishedThisTurn = false;
    this.combatState.forbiddenCardClass = this.getCurrentGuardianConstraint();

    this.applyStartOfTurnPlayerStatuses();
    forEachPlayerPower(this.combatState, (definition) => {
      definition.onTurnStart?.(this.combatState, this.effectQueue);
    });

    this.relicManager?.invoke('onTurnStart', {
      combatState: this.combatState,
      effectQueue: this.effectQueue,
      rng: this.combatRNG,
    });

    this.ensureEnemyIntentsPrepared();
  }

  private onDrawPhase(onPhaseChange: (phase: TurnPhase) => void): void {
    this.effectQueue.enqueue(
      {
        type: 'draw',
        value: this.getEffectiveDrawCount(),
        target: 'SELF',
      },
      { source: 'player' }
    );

    this.effectQueue.execute(
      this.combatState,
      createEffectResolver({
        rng: this.combatRNG,
        relicManager: this.relicManager,
      }),
      () => {
        this.transitionTo('PLAYER_ACTION', onPhaseChange);
      }
    );
  }

  onPlayerEndTurn(onPhaseChange: (phase: TurnPhase) => void): void {
    this.relicManager?.invoke('onTurnEnd', {
      combatState: this.combatState,
      effectQueue: this.effectQueue,
      rng: this.combatRNG,
    });
    forEachPlayerPower(this.combatState, (definition) => {
      definition.onTurnEnd?.(this.combatState, this.effectQueue);
    });
    processStatusTrigger(this.combatState.player, 'ownerTurnEnd', this.effectQueue, { source: 'player' });
    this.transitionTo('RESOLVE_QUEUE', onPhaseChange);
  }

  private onStartEnemyTurn(): void {
    this.ensureEnemyIntentsPrepared();
  }

  private onEnemyAction(onPhaseChange: (phase: TurnPhase) => void): void {
    const aliveEnemies = this.combatState.enemies
      .map((enemy, index) => ({ enemy, index }))
      .filter(({ enemy }) => enemy.hp > 0 && !(enemy.isIllusion && enemy.isReal === false));

    if (aliveEnemies.length === 0) {
      this.transitionTo('CLEANUP', onPhaseChange);
      return;
    }

    let enemyTurnIndex = 0;
    const processNextEnemy = () => {
      if (enemyTurnIndex >= aliveEnemies.length) {
        this.transitionTo('CLEANUP', onPhaseChange);
        return;
      }

      const { enemy, index } = aliveEnemies[enemyTurnIndex];
      enemyTurnIndex++;

      const finishEnemyTurn = () => {
        // Immediately prepare this enemy's next intent so UI remains visible and current.
        if (enemy.hp > 0 && !(enemy.isIllusion && enemy.isReal === false)) {
          enemy.intent = this.generateEnemyIntent(enemy);
        } else {
          enemy.intent = null;
        }

        processStatusTrigger(enemy, 'ownerTurnEnd', this.effectQueue, {
          source: 'enemy',
          sourceEnemyIndex: index,
        });

        this.effectQueue.execute(
          this.combatState,
          createEffectResolver({
            rng: this.combatRNG,
            relicManager: this.relicManager,
          }),
          processNextEnemy
        );
      };

      if (enemy.intent) {
        this.effectQueue.enqueue(enemy.intent.effects, {
          source: 'enemy',
          sourceEnemyIndex: index,
        });
      }

      this.effectQueue.execute(
        this.combatState,
        createEffectResolver({
          rng: this.combatRNG,
          relicManager: this.relicManager,
        }),
        finishEnemyTurn
      );
    };

    processNextEnemy();
  }

  private onCleanup(): void {
  }

  private onCheckEnd(onPhaseChange: (phase: TurnPhase) => void): void {
    const playerDead = this.combatState.player.hp <= 0;
    const allEnemiesDead = this.combatState.enemies.every((enemy) => enemy.hp <= 0);

    console.debug('[TurnStateMachine] CHECK_END', {
      playerDead,
      allEnemiesDead,
      playerHp: this.combatState.player.hp,
      enemies: this.combatState.enemies.map((enemy) => ({
        id: enemy.id,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        isIllusion: enemy.isIllusion ?? false,
        isReal: enemy.isReal ?? null,
      })),
      hasOnCombatEnd: Boolean(this.onCombatEnd),
    });

    if (playerDead) {
      console.debug('[TurnStateMachine] Dispatching defeat');
      this.onCombatEnd?.('defeat');
      return;
    }

    if (allEnemiesDead) {
      console.debug('[TurnStateMachine] Dispatching victory');
      this.onCombatEnd?.('victory');
      return;
    }

    this.transitionTo('START_PLAYER_TURN', onPhaseChange);
  }

  private onResolveQueue(onPhaseChange: (phase: TurnPhase) => void): void {
    this.effectQueue.execute(
      this.combatState,
      createEffectResolver({
        rng: this.combatRNG,
        relicManager: this.relicManager,
      }),
      () => {
        this.transitionTo('END_PLAYER_TURN', onPhaseChange);
      }
    );
  }

  private onEndPlayerTurn(): void {
    const retainedCards: Card[] = [];

    for (const card of this.combatState.hand) {
      if (card.retain) {
        retainedCards.push(card);
        continue;
      }

      if (card.fleeting) {
        this.combatState.exhaustPile.push(card);
        continue;
      }

      this.combatState.discardPile.push(card);
    }

    this.combatState.hand = retainedCards;
  }

  private getEffectiveDrawCount(): number {
    return 3;
  }

  private applyStartOfTurnPlayerStatuses(): void {
    for (const status of this.combatState.player.statuses) {
      switch (status.id) {
        case 'starving':
        case 'frost':
          this.combatState.player.energy = Math.max(0, this.combatState.player.energy - status.stacks);
          break;
      }
    }
    cleanupExpiredStatuses(this.combatState.player, 'ownerTurnStart');
  }

  private generateEnemyIntent(enemy: Enemy) {
    if (!this.combatRNG) {
      return {
        type: 'damage' as const,
        value: 6,
        target: 'ENEMY' as const,
        effects: [
          {
            type: 'damage' as const,
            value: 6,
            target: 'ENEMY' as const,
          },
        ],
      };
    }

    const templateId = getEnemyTemplateId(enemy.id);
    const template = getEnemyTemplate(templateId);
    const intent = generateEnemyIntent(
      templateId,
      this.combatRNG,
      enemy.lastIntentKey,
      enemy.intentCursor ?? 0
    );
    enemy.lastIntentKey = intent.key;
    enemy.intentCursor = intent.nextCursor;
    const primaryEffect = intent.effects[0] ?? {
      type: 'damage' as const,
      value: 5,
      target: 'ENEMY' as const,
    };
    return {
      type: primaryEffect.type,
      value: primaryEffect.value,
      target: primaryEffect.target,
      effects: [primaryEffect],
      label: template?.canUseGuardianCycle
        ? `Punishing ${this.getCurrentGuardianConstraint() ?? 'ATTACK'}`
        : undefined,
    };
  }

  private getCurrentGuardianConstraint() {
    const hasGuardian = this.combatState.enemies.some((enemy) => {
      if (enemy.hp <= 0) return false;
      const templateId = getEnemyTemplateId(enemy.id);
      return getEnemyTemplate(templateId)?.canUseGuardianCycle;
    });

    if (!hasGuardian) {
      return null;
    }

    const cycle = ['ATTACK', 'GUARD', 'TACTIC'] as const;
    return cycle[(Math.max(0, this.combatState.turnNumber - 1)) % cycle.length];
  }

  private syncCombatPhase(phase: TurnPhase): void {
    this.currentPhase = phase;
    this.combatState.currentPhase = phase;
  }

  private ensureEnemyIntentsPrepared(): void {
    for (const enemy of this.combatState.enemies) {
      if (enemy.hp <= 0 || (enemy.isIllusion && enemy.isReal === false)) {
        enemy.intent = null;
        continue;
      }
      if (!enemy.intent) {
        enemy.intent = this.generateEnemyIntent(enemy);
      }
    }
  }
}
