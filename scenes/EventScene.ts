import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { getEvent } from '../data/events';
import { relicRegistry } from '../data/relics';
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
  private returnNodeId?: string;

  constructor() {
    super({ key: 'EventScene' });
  }

  init(data?: {
    eventId?: string;
    eventPool?: 'general' | 'risk_reward';
    eventSource?: 'event' | 'mystery';
    returnNodeId?: string;
  }): void {
    this.forcedEventId = data?.eventId;
    this.eventPool = data?.eventPool ?? 'general';
    this.eventSource = data?.eventSource ?? 'event';
    this.returnNodeId = data?.returnNodeId;
  }

  private getFactionBackgroundKey(characterId: string): string {
    if (characterId === 'liubei') return this.textures.exists('bg_shu_still') ? 'bg_shu_still' : 'prelude_bg_shu';
    if (characterId === 'sunquan') return this.textures.exists('bg_wu_still') ? 'bg_wu_still' : 'prelude_bg_wu';
    return this.textures.exists('bg_wei_still') ? 'bg_wei_still' : 'prelude_bg_wei';
  }

  private renderFactionBackground(w: number, h: number, cx: number, cy: number): void {
    const run = RunManager.getRunState();
    const characterId = run?.character ?? 'caocao';
    const key = this.getFactionBackgroundKey(characterId);
    if (this.textures.exists(key)) {
      this.add.image(cx, cy, key).setDepth(-100).setDisplaySize(w, h);
      return;
    }
    this.add.rectangle(cx, cy, w, h, 0x0d0d10, 1);
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);

    this.renderFactionBackground(w, h, cx, Math.round(h / 2));

    const run = RunManager.getRunState();
    if (!run) {
      this.scene.start('MenuScene');
      return;
    }

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

    this.textures.exists('ui_dialogue_parchment')
      ? this.add.image(cx, 188 * sy, 'ui_dialogue_parchment').setDisplaySize(760, 250 * sy).setAlpha(0.95)
      : this.add.rectangle(cx, 188 * sy, 760, 250 * sy, 0xe2cfab, 0.95);
    this.add.rectangle(cx, 188 * sy, 760, 250 * sy, 0x000000, 0.12).setStrokeStyle(2, 0x6a5534, 1);
    this.add.rectangle(cx, 84 * sy, 760, 2, 0x8f7647, 1);
    this.add.text(cx, 120 * sy, this.event.title, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      color: '#2c2015',
    }).setOrigin(0.5);

    this.add.text(cx, 220 * sy, this.event.text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#241a11',
      wordWrap: { width: 700 },
      align: 'center',
    }).setOrigin(0.5);

    this.event.choices.forEach((choice, index) => {
      const btn = this.add.container(cx, Math.round((340 + index * 80) * sy));
      const bg = this.add.rectangle(0, 0, 600, 60, 0xe2cfab, 0.95);
      const shade = this.add.rectangle(0, 0, 600, 60, 0x000000, 0.12).setStrokeStyle(2, 0x5f4b2f, 1);
      const label = this.add.text(0, 0, choice.text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#271d13',
        wordWrap: { width: 560 },
        align: 'center',
      }).setOrigin(0.5);

      btn.add([bg, shade, label]);
      btn.setSize(600, 60);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        bg.setFillStyle(0xe8d8b8, 0.98);
        shade.setFillStyle(0x000000, 0.06);
        shade.setStrokeStyle(2, 0xb39058, 1);
      });
      btn.on('pointerout', () => {
        bg.setFillStyle(0xe2cfab, 0.95);
        shade.setFillStyle(0x000000, 0.12);
        shade.setStrokeStyle(2, 0x5f4b2f, 1);
      });
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
        this.resolveRandomCardReward(outcome);
        if (outcome.value && outcome.value < 0) {
          RunManager.damage(Math.abs(outcome.value));
        }
        break;
      case 'relic':
        {
          const relicId = this.pickRandomRunRelic(`dialogue:relic:${outcome.relicId ?? 'any'}`);
          if (relicId) {
            RunManager.applyReward({ gold: 0, relicId });
          }
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
      this.scene.start('MapScene', {
        autoResolveNodeId: this.returnNodeId,
      });
    });
  }

  private applyAttachedStatus(outcome: EventOutcome): void {
    if (!outcome.statusId || outcome.type === 'status' || outcome.type === 'remove_card') {
      return;
    }

    RunManager.addPendingStatus(outcome.statusId, outcome.statusStacks ?? 1);

    if (this.event.id === 'war_drums' && outcome.statusId === 'rallied') {
      RunManager.addPendingStatus('command', 1);
    }
  }

  private applyCombatModifiers(outcome: EventOutcome): void {
    if (!outcome.combatModifiers) {
      return;
    }

    const startStatuses = (outcome.combatModifiers.playerStatuses ?? []).map((status) => ({
      id: status.id,
      name: status.id,
      description: '',
      stacks: status.stacks,
    }));
    const enemyStartStatuses = (outcome.combatModifiers.enemyStatuses ?? []).map((status) => ({
      id: status.id,
      name: status.id,
      description: '',
      stacks: status.stacks,
    }));

    if (!startStatuses.length && !enemyStartStatuses.length) {
      return;
    }

    RunManager.prepareNextCombat({
      startStatuses,
      enemyStartStatuses,
    });
  }

  private applyEventSpecificStatusChoice(statusId?: StatusId): void {
    if (!statusId) return;

    if (this.event.id === 'broken_formation_drill') {
      RunManager.prepareNextCombat({
        startStatuses: [{
          id: 'broken_formation',
          name: 'broken_formation',
          description: '',
          stacks: 1,
        }],
      });
    }
  }

  private pickCards(
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE',
    count: number,
    predicate?: (card: Card) => boolean
  ): Card[] {
    const run = RunManager.getRunState();
    if (!run) return [];

    const rng = getRNG(run.seed, `event-reward:${run.currentNode}:${this.event.id}:${rarity}`);
    const cards = Array.from(allCards.values())
      .filter((card) => card.id.startsWith(run.character))
      .filter((card) => !card.upgraded)
      .filter((card) => this.classifyCardRarity(card.id) === rarity)
      .filter((card) => predicate ? predicate(card) : true);

    return rng.shuffle(cards).slice(0, count).map((card) => getCard(card.id)!).filter(Boolean);
  }

  private resolveRandomCardReward(outcome: EventOutcome): void {
    const count = outcome.cardId === 'double_random_common' ? 2 : 1;
    const picks = this.pickRandomRunCards(count, `dialogue:card:${outcome.cardId ?? 'any'}`);
    if (!picks.length) {
      const char = RunManager.getRunState()?.character;
      if (!char) return;
      const fallback = getStartingDeck(char).find((card) => card.type === 'ATTACK');
      if (fallback) {
        RunManager.addCardToDeck(fallback.id);
      }
      return;
    }
    picks.forEach((card) => RunManager.addCardToDeck(card.id));
  }

  private pickRandomRunCards(count: number, contextKey: string): Card[] {
    const run = RunManager.getRunState();
    if (!run) return [];
    const rng = getRNG(run.seed, `event-rng-card:${run.currentNode}:${this.event.id}:${contextKey}`);
    const cards = Array.from(allCards.values())
      .filter((card) => card.id.startsWith(run.character))
      .filter((card) => !card.upgraded);
    return rng.shuffle(cards).slice(0, Math.max(1, count)).map((card) => getCard(card.id)!).filter(Boolean);
  }

  private pickRandomRunRelic(contextKey: string): string | undefined {
    const run = RunManager.getRunState();
    if (!run) return undefined;
    const rng = getRNG(run.seed, `event-rng-relic:${run.currentNode}:${this.event.id}:${contextKey}`);
    const owned = new Set(run.relics.map((relic) => relic.id));
    const pool = rng.shuffle(
      Array.from(relicRegistry.values())
        .filter((relic) => relic.id.startsWith('relic_'))
        .filter((relic) => relic.rarity !== 'cursed')
        .filter((relic) => !owned.has(relic.id))
    );
    return pool[0]?.id;
  }

  private classifyCardRarity(cardId: string): 'COMMON' | 'UNCOMMON' | 'RARE' {
    if (cardId.includes('strike') || cardId.includes('defend') || cardId.includes('loyalty') || cardId.includes('command') || cardId.includes('admiral') || cardId.includes('influence') || cardId.includes('oath')) {
      return 'COMMON';
    }
    if (cardId.includes('warlord') || cardId.includes('dominion') || cardId.includes('virtue') || cardId.includes('mandate') || cardId.includes('flame') || cardId.includes('naval') || cardId.includes('sovereign') || cardId.includes('rout') || cardId.includes('sweep') || cardId.includes('protect')) {
      return 'RARE';
    }
    return 'UNCOMMON';
  }
}
