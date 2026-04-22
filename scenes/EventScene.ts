import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { getEvent } from '../data/events';
import type { Card, EventOutcome, GameEvent, StatusId } from '../types';
import { allCards, getCard, getStartingDeck } from '../data/cards';
import { getRNG } from '../core/SeedUtils';
import { selectEventForRun } from '../systems/EventSelector';
import { GameDebug } from '../systems/GameDebug';

export class EventScene extends Phaser.Scene {
  private event!: GameEvent;
  private forcedEventId?: string;
  private eventPool: 'general' | 'risk_reward' = 'general';
  private eventSource: 'event' | 'mystery' = 'event';
  private selectedCategory: 'shared' | 'character' | 'act' | null = null;

  constructor() {
    super({ key: 'EventScene' });
  }

  init(data?: { eventId?: string; eventPool?: 'general' | 'risk_reward'; eventSource?: 'event' | 'mystery' }): void {
    this.forcedEventId = data?.eventId;
    this.eventPool = data?.eventPool ?? 'general';
    this.eventSource = data?.eventSource ?? 'event';
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);

    this.add.rectangle(cx, Math.round(h / 2), w, h, 0x000000, 1);

    const run = RunManager.getRunState();
    if (!run) {
      this.scene.start('MenuScene');
      return;
    }

    // Launch persistent HUD overlay
    this.scene.launch('HUDScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('HUDScene');
    });

    const rng = getRNG(run.seed, `event:${run.currentNode}`);
    const selected = this.forcedEventId
      ? { eventId: this.forcedEventId, definition: undefined, category: 'shared' as const }
      : selectEventForRun(run, this.eventPool, this.eventSource, rng);
    const eventId = selected.eventId;
    const picked = getEvent(eventId);
    if (!picked) {
      this.scene.start('MapScene');
      return;
    }

    this.event = picked;
    this.selectedCategory = selected.category;
    if (!this.forcedEventId && selected.definition) {
      RunManager.recordEventSeen({
        id: selected.eventId,
        act: run.act,
        category: selected.category,
        family: selected.definition.family,
        source: this.eventSource,
      });
    }

    if (import.meta.env.DEV) {
      GameDebug.setSceneContext('EventScene', () => {
        const latestRun = RunManager.getRunState();
        return {
          eventId: this.event.id,
          eventTitle: this.event.title,
          forcedEventId: this.forcedEventId ?? null,
          eventPool: this.eventPool,
          eventSource: this.eventSource,
          selectedCategory: this.selectedCategory,
          choices: this.event.choices.map((choice) => ({
            text: choice.text,
            outcomeType: choice.outcome.type,
            statusId: choice.outcome.statusId ?? null,
            value: choice.outcome.value ?? null,
          })),
          pendingStatuses: latestRun?.pendingStatuses ?? [],
          nextCombatModifiers: latestRun?.nextCombatModifiers ?? null,
          recentEvents: latestRun?.eventHistory.slice(-5) ?? [],
        };
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => GameDebug.clearSceneContext('EventScene'));
    }

    this.renderEvent();
  }

  private renderEvent(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    const sy = h / 720;

    this.add.text(cx, 120 * sy, this.event.title, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      color: '#f0c060',
    }).setOrigin(0.5);

    this.add.text(cx, 220 * sy, this.event.text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#e0d6c8',
      wordWrap: { width: 700 },
      align: 'center',
    }).setOrigin(0.5);

    this.event.choices.forEach((choice, index) => {
      const btn = this.add.container(cx, Math.round((340 + index * 80) * sy));
      const bg = this.add.rectangle(0, 0, 600, 60, 0x000000, 1).setStrokeStyle(2, 0x333333, 1);
      const label = this.add.text(0, 0, choice.text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        wordWrap: { width: 560 },
        align: 'center',
      }).setOrigin(0.5);

      btn.add([bg, label]);
      btn.setSize(600, 60);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => bg.setFillStyle(0x111111));
      btn.on('pointerout', () => bg.setFillStyle(0x000000));
      btn.on('pointerdown', () => {
        this.applyOutcome(choice.outcome);
      });
    });
  }

  private applyOutcome(outcome: EventOutcome): void {
    if (outcome.value && outcome.type === 'relic' && outcome.value < 0) {
      RunManager.damage(Math.abs(outcome.value));
    }

    this.applyAttachedStatus(outcome);

    switch (outcome.type) {
      case 'hp':
        if (outcome.value && outcome.value < 0) {
          RunManager.damage(Math.abs(outcome.value));
        } else if (outcome.value && outcome.value > 0) {
          RunManager.heal(outcome.value);
        }
        break;
      case 'gold':
        if (outcome.value) {
          RunManager.modifyGold(outcome.value);
        }
        break;
      case 'card':
        if (outcome.cardId === 'random_common') {
          const char = RunManager.getRunState()!.character;
          const attack = getStartingDeck(char).find((card) => card.type === 'ATTACK');
          if (attack) RunManager.addCardToDeck(attack.id);
        } else if (outcome.cardId === 'double_random_common') {
          const picks = this.pickCards('COMMON', 2);
          picks.forEach((card) => RunManager.addCardToDeck(card.id));
        } else if (outcome.cardId === 'random_uncommon') {
          const [pick] = this.pickCards('UNCOMMON', 1);
          if (pick) RunManager.addCardToDeck(pick.id);
        } else if (outcome.cardId === 'random_attack_uncommon') {
          const [pick] = this.pickCards('UNCOMMON', 1, (card) => card.type === 'ATTACK');
          if (pick) RunManager.addCardToDeck(pick.id);
        } else if (outcome.cardId === 'random_uncommon_skill') {
          const [pick] = this.pickCards('UNCOMMON', 1, (card) => card.type === 'SKILL');
          if (pick) RunManager.addCardToDeck(pick.id);
        } else if (outcome.cardId === 'random_rare') {
          const [pick] = this.pickCards('RARE', 1);
          if (pick) RunManager.addCardToDeck(pick.id);
        } else if (outcome.cardId) {
          RunManager.addCardToDeck(outcome.cardId);
        }
        if (outcome.value && outcome.value < 0) {
          RunManager.damage(Math.abs(outcome.value));
        }
        break;
      case 'relic':
        if (outcome.relicId) {
          RunManager.applyReward({ gold: 0, relicId: outcome.relicId });
        }
        break;
      case 'remove_card': {
        if (outcome.value) {
          RunManager.modifyGold(outcome.value);
        }
        const run = RunManager.getRunState();
        const removable = run?.deck.find((card) => !card.upgraded);
        if (removable) {
          RunManager.removeCardFromDeck(removable.id);
        }
        if (outcome.statusId) {
          RunManager.prepareNextCombat({
            startStatuses: [{
              id: outcome.statusId,
              name: outcome.statusId,
              description: '',
              stacks: outcome.statusStacks ?? 1,
            }],
          });
        }
        break;
      }
      case 'upgrade': {
        const run = RunManager.getRunState();
        const upgradable = run?.deck.find((card) => !card.upgraded);
        if (upgradable) {
          upgradable.upgraded = true;
          RunManager.commitRunState();
        }
        break;
      }
      case 'status':
        if (outcome.statusId) {
          RunManager.addPendingStatus(outcome.statusId, outcome.statusStacks ?? 1);
        }
        this.applyEventSpecificStatusChoice(outcome.statusId);
        break;
      case 'combat':
        if (outcome.enemyIds) {
          this.cameras.main.fadeOut(400, 0x000000);
          this.time.delayedCall(400, () => {
            this.scene.start('CombatScene', {
              runMode: true,
              enemyIds: outcome.enemyIds,
            });
          });
          return;
        }
        break;
      case 'none':
      default:
        break;
    }

    this.applyCombatModifiers(outcome);

    if (this.event.id === 'broken_formation_drill' && outcome.type === 'none' && this.event.choices[0]?.outcome === outcome) {
      RunManager.prepareNextCombat({
        startStatuses: [{
          id: 'broken_formation',
          name: 'broken_formation',
          description: '',
          stacks: 1,
        }],
      });
    }

      this.cameras.main.fadeOut(400, 0x000000);
    this.time.delayedCall(400, () => {
      this.scene.start('MapScene');
    });
  }