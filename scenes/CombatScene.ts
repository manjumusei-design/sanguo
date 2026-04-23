import Phaser from 'phaser';
import type {
  Card,
  CharacterId,
  CombatState,
  Combatant,
  Effect,
  Enemy,
  GuardianCardClass,
  NextCombatModifiers,
  Status,
  TurnPhase,
} from '../types';
import { TurnStateMachine } from '../combat/TurnStateMachine';
import { createEffectResolver, EffectQueue } from '../combat/EffectQueue';
import { createPowerInstance } from '../combat/PowerSystem';
import { allCards, getCard } from '../data/cards';
import { getCharacter } from '../data/characters';
import { applyRelicRewardModifiers, getRelic } from '../data/relics';
import { getEnemyTemplate, getEnemyTemplateId, spawnEnemy } from '../data/enemies';
import { RunManager } from '../core/RunManager';
import { GameSession } from '../core/GameSession';
import { RNG } from '../core/RNG';
import { getRNG } from '../core/SeedUtils';
import { trace } from '../core/DebugTrace';
import { EMOJI } from '../data/emoji';
import { DebugSystem } from '../systems/DebugSystem';
import { GameDebug } from '../systems/GameDebug';
import { PointerDebug } from '../systems/PointerDebug';
import { RelicManager } from '../systems/RelicManager';
import { HandManager } from '../ui/HandManager';
import { DragDropSystem, type DropZone } from '../ui/DragDropSystem';
import { HUDManager } from '../ui/HUDManager';
import { TooltipManager } from '../ui/TooltipManager';
import { IntentDisplay } from '../ui/IntentDisplay';
import { SpineManager, type SpineGameObject } from '../ui/SpineManager';
import { removeStatus } from '../combat/StatusSystem';
import {
  animateCardDiscard,
  animateCardExhaust,
  createCardContainer,
} from '../ui/CardContainer';

const PLAYER_SPINE_SPEED_MULTIPLIER = 1.4;
const END_DEATH_ANIMATION_DELAY_MS = 700;

export class CombatScene extends Phaser.Scene {
  private combatState!: CombatState;
  private turnStateMachine!: TurnStateMachine;
  private effectQueue!: EffectQueue;
  private relicManager!: RelicManager;
  private combatRNG!: RNG;
  private debugSystem: DebugSystem | null = null;

  private handManager!: HandManager;
  private dragDropSystem!: DragDropSystem;
  private hudManager!: HUDManager;
  private tooltipManager!: TooltipManager;

  private resourceName = '';
  private resourceText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private endTurnButton!: Phaser.GameObjects.Text;

  private playerContainer!: Phaser.GameObjects.Container;
  private playerSpine: SpineGameObject | null = null;
  private enemySpines: Array<SpineGameObject | null> = [];
  private playerStatusContainer: Phaser.GameObjects.Container | null = null;
  private enemyContainers: Array<Phaser.GameObjects.Container | null> = [];
  private enemyStatusContainers: Array<Phaser.GameObjects.Container | null> = [];
  private intentDisplays: Array<IntentDisplay | null> = [];

  private draggedCardIndex = -1;
  private draggedCardData: Card | null = null;
  private draggedContainer: Phaser.GameObjects.Container | null = null;
  private inspectOverlay: Phaser.GameObjects.Container | null = null;
  private drawPileOverlay: Phaser.GameObjects.Container | null = null;
  private drawPileOverlayOpenedAt = 0;
  private combatLog: string[] = [];
  private lastEnemyHp: number[] = [];
  private playerStatusSignature = '';
  private enemyStatusSignatures: string[] = [];
  private lastPlayerHpSnapshot: number | null = null;
  private lastPlayerBlockSnapshot: number | null = null;
  private lastPlayerStatusSnapshot = new Map<Status['id'], number>();
  private lastEnemyHpSnapshots: number[] = [];
  private lastEnemyBlockSnapshots: number[] = [];
  private lastEnemyStatusSnapshots: Array<Map<Status['id'], number>> = [];
  private domPopups = new Set<HTMLDivElement>();
  private isResolvingQueue = false;
  private combatEnded = false;

  private combatMode: 'prelude' | 'run' = 'run';
  private preludeCallbacks?: { onVictory: () => void; onDefeat: () => void };
  private combatSeed = '';
  private nextCombatModifiers: NextCombatModifiers = {
    energyPerTurnBonus: 0,
    temporaryExhaustCardId: undefined,
    startStatuses: [],
    enemyStartStatuses: [],
  };

  constructor() {
    super({ key: 'CombatScene' });
  }

  private createRoundedHealthBar(
    width: number,
    height: number,
    textOffsetY: number,
    blockOffsetY: number
  ): {
    bg: Phaser.GameObjects.Graphics;
    fill: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
    block: Phaser.GameObjects.Text;
    width: number;
    height: number;
  } {
    const bg = this.add.graphics();
    bg.fillStyle(0x211b24, 0.95);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    bg.lineStyle(2, 0xb58f58, 0.95);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2);

    const fill = this.add.graphics();
    const text = this.add.text(0, textOffsetY, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#fff7e6',
      fontStyle: 'bold',
      stroke: '#2a1717',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const block = this.add.text(0, blockOffsetY, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#9fdcff',
      backgroundColor: '#173042',
      padding: { x: 8, y: 2 },
    }).setOrigin(0.5);
    return { bg, fill, text, block, width, height };
  }

  private redrawRoundedHealthBar(
    fill: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    ratio: number,
    color: number
  ): void {
    const clampedRatio = Phaser.Math.Clamp(ratio, 0, 1);
    const fillWidth = Math.round(width * clampedRatio);
    fill.clear();
    if (fillWidth <= 0) return;

    fill.fillStyle(color, 1);
    fill.fillRoundedRect(
      -width / 2,
      -height / 2,
      fillWidth,
      height,
      Math.min(height / 2, fillWidth / 2)
    );
  }

  init(data: {
    characterId?: string;
    hp?: number;
    maxHp?: number;
    deck?: string[];
    relicIds?: string[];
    enemyIds?: string[];
    preludeMode?: boolean;
    runMode?: boolean;
    onVictory?: () => void;
    onDefeat?: () => void;
  }): void {
    this.combatEnded = false;
    this.isResolvingQueue = false;
    this.draggedCardIndex = -1;
    this.draggedCardData = null;
    this.draggedContainer = null;
    this.inspectOverlay = null;
    this.drawPileOverlay = null;
    this.drawPileOverlayOpenedAt = 0;
    this.combatLog = [];
    this.lastEnemyHp = [];
    this.playerStatusSignature = '';
    this.enemyStatusSignatures = [];
    this.lastPlayerHpSnapshot = null;
    this.lastPlayerBlockSnapshot = null;
    this.lastPlayerStatusSnapshot = new Map<Status['id'], number>();
    this.lastEnemyHpSnapshots = [];
    this.lastEnemyBlockSnapshots = [];
    this.lastEnemyStatusSnapshots = [];

    this.combatMode = data.preludeMode ? 'prelude' : 'run';
    if (data.preludeMode && data.onVictory && data.onDefeat) {
      this.preludeCallbacks = { onVictory: data.onVictory, onDefeat: data.onDefeat };
    }

    const run = RunManager.getRunState();
    const characterId = data.characterId ?? run?.character ?? 'caocao';
    const deckIds = data.deck ?? run?.deck.map((card) => card.id) ?? [`${characterId}_strike`, `${characterId}_defend`];
    const enemyIds = data.enemyIds ?? ['bandit'];

    this.combatSeed = this.combatMode === 'run' && run
      ? `${run.seed}::combat::${run.currentNode}`
      : `${characterId}::prelude::${enemyIds.join(',')}::${deckIds.join(',')}`;
    this.combatRNG = getRNG(this.combatSeed);
    this.nextCombatModifiers = this.combatMode === 'run' && run
      ? RunManager.consumeNextCombatModifiers()
      : { energyPerTurnBonus: 0, temporaryExhaustCardId: undefined, startStatuses: [], enemyStartStatuses: [] };

    this.combatState = this.createCombatState(characterId, deckIds, enemyIds, data.hp, data.maxHp);
    this.effectQueue = new EffectQueue();
    this.relicManager = new RelicManager();

    const character = getCharacter(characterId as CharacterId);

    if (this.combatMode === 'run' && run) {
      run.relics.forEach((relic) => this.relicManager.addRelic(relic));
      const pendingStatuses = RunManager.consumePendingStatuses();
      this.combatState.player.statuses.push(...pendingStatuses.map((status) => ({ ...status })));
    } else if (data.relicIds?.length) {
      data.relicIds
        .map((id) => getRelic(id))
        .filter((relic): relic is NonNullable<typeof relic> => Boolean(relic))
        .forEach((relic) => this.relicManager.addRelic(relic));
    } else if (character?.startingRelic) {
      const relic = getRelic(character.startingRelic);
      if (relic) this.relicManager.addRelic(relic);
    }

    this.turnStateMachine = new TurnStateMachine(this.combatState, this.effectQueue, {
      relicManager: this.relicManager,
      enemyRNG: this.combatRNG,
      onCombatEnd: (result) => this.handleCombatEnd(result),
      onEnemyActionStart: (enemyIndex) => this.playEnemyActionAnimation(enemyIndex),
    });

    if (import.meta.env.DEV) {
      this.debugSystem = new DebugSystem(this, this.combatState, this.effectQueue);
    }

    if (character) {
      this.resourceName = character.resource;
      this.combatState.player.resources = this.combatState.player.resources ?? {};
      this.combatState.player.resources[this.resourceName] = this.combatState.player.resources[this.resourceName] ?? 0;
    }

    trace('COMBAT', 'init', {
      mode: this.combatMode,
      seed: this.combatSeed,
      characterId,
      enemyIds,
      deckSize: deckIds.length,
      runNode: run?.currentNode ?? null,
      runAct: run?.act ?? null,
    });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const px = (value: number) => Math.round(w * value);
    const py = (value: number) => Math.round(h * (1 - value));
    const cx = Math.round(w / 2);

    this.renderCombatBackground(this.combatState.player.id, cx, Math.round(h / 2), w, h);

    // Launch persistent HUD overlay
    this.scene.launch('HUDScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('HUDScene');
      this.clearDomPopups();
    });

    if (import.meta.env.DEV) {
      GameDebug.setSceneContext('CombatScene', () => ({
        seed: this.combatSeed,
        mode: this.combatMode,
        phase: this.combatState.currentPhase,
        turnNumber: this.combatState.turnNumber,
        player: {
          hp: this.combatState.player.hp,
          maxHp: this.combatState.player.maxHp,
          block: this.combatState.player.block,
          energy: this.combatState.player.energy,
          statuses: this.combatState.player.statuses.map((status) => `${status.id}:${status.stacks}`),
          powers: this.combatState.playerPowers.map((power) => power.id),
        },
        enemies: this.combatState.enemies.map((enemy) => ({
          id: enemy.id,
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          block: enemy.block,
          intent: enemy.intent?.label ?? null,
          statuses: enemy.statuses.map((status) => `${status.id}:${status.stacks}`),
        })),
        queueLength: this.effectQueue.length(),
      }));
    }

    this.handManager = new HandManager(this, {
      centerX: px(0.5),
      baseY: py(0.12),
      cardWidth: 130,
      cardSpacing: 40,
    });
    this.dragDropSystem = new DragDropSystem(this);
    this.hudManager = new HUDManager(this);
    this.tooltipManager = new TooltipManager();
    this.hudManager.create();

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragDropSystem.isDragging()) return;
      this.dragDropSystem.endDrag(
        pointer,
        (zone) => this.playDraggedCard(zone),
        () => this.resetDraggedCard()
      );
    });

    this.phaseText = this.add.text(cx, py(0.94), '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#666666',
    }).setOrigin(0.5);

    this.logText = this.add.text(cx, py(0.55), '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#666677',
      align: 'center',
    }).setOrigin(0.5);

    this.resourceText = this.add.text(px(0.32), py(0.34), '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#c084fc',
    }).setOrigin(0.5);

    this.renderPlayer();
    this.renderEnemies();
    this.setupDropZones();
    this.renderHand();

    this.hudManager.setOnDrawClick(() => {
      this.toggleDrawPileOverlay();
    });

    this.handManager.onHover((index) => {
      const card = this.handManager.getCard(index);
      const container = this.handManager.getContainer(index);
      if (!card || !container) return;
      const transform = container.getWorldTransformMatrix();
      this.tooltipManager.show(card, transform.tx, transform.ty - 80);
    });

    const clearHover = this.handManager.clearHover.bind(this.handManager);
    this.handManager.clearHover = () => {
      this.tooltipManager.hide();
      clearHover();
    };

    this.endTurnButton = this.add.text(px(0.92), py(0.45), 'END TURN', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#111111',
      padding: { x: 16, y: 8 },
    })
      .setOrigin(0.5)
      .setDepth(50)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.endTurnButton.setScale(1.05))
      .on('pointerout', () => this.endTurnButton.setScale(1))
      .on('pointerdown', () => {
        if (!this.isResolvingQueue) {
          this.onPlayerEndTurn();
        }
      });

    this.setupKeyboard();

    if (import.meta.env.DEV) {
      this.add.text(cx, Math.round(h * 0.97), 'F12 -> __debugCombat.help() / __debugGame.help()  |  ` = debug overlay  |  F8 = pointer debug', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#333344',
      }).setOrigin(0.5);

      const debug = (window as unknown as Record<string, Record<string, (...args: unknown[]) => void>>).__debugCombat;
      debug.positions = () => this.logPositions();
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => GameDebug.clearSceneContext('CombatScene'));
      PointerDebug.install(this);
    }

    this.turnStateMachine.startCombat((phase) => this.updatePhaseDisplay(phase));
    this.addLog('Combat started');
  }

  private getCombatBackgroundKey(characterId: string): string {
    if (characterId === 'liubei') return 'prelude_bg_shu';
    if (characterId === 'sunquan') return 'prelude_bg_wu';
    return 'prelude_bg_wei';
  }

  private renderCombatBackground(
    characterId: string,
    cx: number,
    cy: number,
    w: number,
    h: number
  ): void {
    const key = this.getCombatBackgroundKey(characterId);
    if (this.textures.exists(key)) {
      this.add.image(cx, cy, key)
        .setDepth(-100)
        .setDisplaySize(w, h);
      return;
    }
    this.add.rectangle(cx, cy, w, h, 0x000000);
  }

  private createCombatState(
    characterId: string,
    deckIds: string[],
    enemyIds: string[],
    initialHp?: number,
    initialMaxHp?: number
  ): CombatState {
    const character = getCharacter(characterId as CharacterId);
    const run = RunManager.getRunState();
    const hp = this.combatMode === 'run' && run
      ? run.hp
      : (initialHp ?? character?.hp ?? 72);
    const maxHp = this.combatMode === 'run' && run
      ? run.maxHp
      : (initialMaxHp ?? character?.hp ?? 72);

    const player: Combatant = {
      id: characterId,
      name: character?.name ?? characterId.toUpperCase(),
      hp,
      maxHp,
      block: 0,
      energy: 3,
      statuses: [],
      resources: {},
    };
    player.resources = {
      ...(player.resources ?? {}),
      max_energy_bonus: this.nextCombatModifiers.energyPerTurnBonus,
    };
    const currentNodeType = run?.currentMap.nodes.find((node) => node.id === run.currentNode)?.type;
    if (currentNodeType) {
      player.resources._current_node_is_elite = currentNodeType === 'ELITE' ? 1 : 0;
    }
    player.statuses.push(...this.nextCombatModifiers.startStatuses.map((status) => ({ ...status })));

    const enemyRng = getRNG(this.combatSeed, 'spawn');
    const enemies = this.createEncounterEnemies(enemyIds, enemyRng, run?.act ?? 1);
    enemies.forEach((enemy) => {
      enemy.statuses.push(...this.nextCombatModifiers.enemyStartStatuses.map((status) => ({ ...status })));
    });
    const tempExhaustId = this.nextCombatModifiers.temporaryExhaustCardId;
    const drawPile = deckIds
      .filter((id, index, ids) => !(tempExhaustId && id === tempExhaustId && ids.indexOf(id) === index))
      .map((id) => getCard(id)!)
      .filter(Boolean);
    this.combatRNG.shuffle(drawPile);

    return {
      player,
      enemies,
      playerPowers: [],
      drawPile,
      discardPile: [],
      exhaustPile: [],
      hand: [],
      currentPhase: 'START_PLAYER_TURN' as TurnPhase,
      effectQueue: [] as unknown as Effect[],
      turnNumber: 0,
      forbiddenCardClass: null,
      guardianPunishedThisTurn: false,
    };
  }

  private handleCombatEnd(result: 'victory' | 'defeat'): void {
    if (this.combatEnded) {
      if (import.meta.env.DEV) {
        console.debug('[CombatScene] handleCombatEnd ignored; already ended', { result, mode: this.combatMode });
      }
      return;
    }
    this.combatEnded = true;

    if (import.meta.env.DEV) {
      console.debug('[CombatScene] handleCombatEnd', {
        result,
        mode: this.combatMode,
        hasPreludeCallbacks: Boolean(this.preludeCallbacks),
        playerHp: this.combatState.player.hp,
        enemies: this.combatState.enemies.map((enemy) => ({
          id: enemy.id,
          hp: enemy.hp,
          maxHp: enemy.maxHp,
        })),
      });
    }

    const runAtEnd = RunManager.getRunState();
    const currentNode = runAtEnd?.currentMap.nodes.find((node) => node.id === runAtEnd.currentNode);
    const currentNodeType = currentNode?.type ?? 'UNKNOWN';

    this.relicManager.invoke('onCombatEnd', {
      combatState: this.combatState,
      effectQueue: this.effectQueue,
      result,
      nodeType: currentNodeType,
      rng: this.combatRNG,
    });

    this.isResolvingQueue = true;
    this.effectQueue.execute(
      this.combatState,
      createEffectResolver({
        rng: this.combatRNG,
        relicManager: this.relicManager,
      }),
      () => {
        this.isResolvingQueue = false;
        this.playEndDeathAnimations(() => {
          this.finalizeCombatEnd(result, currentNodeType);
        });
      }
    );
  }

  private playEndDeathAnimations(onComplete: () => void): void {
    let playedAny = false;

    if (this.combatState.player.hp <= 0 && this.playerSpine) {
      SpineManager.play(this.playerSpine, 'dead', false);
      playedAny = true;
    }

    this.combatState.enemies.forEach((enemy, index) => {
      if (enemy.hp > 0) return;
      const spine = this.enemySpines[index];
      if (!spine) return;
      SpineManager.play(spine, 'dead', false);
      playedAny = true;
    });

    if (!playedAny) {
      onComplete();
      return;
    }

    this.time.delayedCall(END_DEATH_ANIMATION_DELAY_MS, onComplete);
  }

  private finalizeCombatEnd(result: 'victory' | 'defeat', currentNodeType: import('../types').NodeType | 'UNKNOWN'): void {
    if (this.combatMode === 'prelude' && this.preludeCallbacks) {
      if (import.meta.env.DEV) {
        console.debug('[CombatScene] Forwarding combat end to prelude callback', { result });
      }
      if (result === 'victory') {
        this.preludeCallbacks.onVictory();
      } else {
        this.preludeCallbacks.onDefeat();
      }
      return;
    }

    const run = RunManager.getRunState();
    if (!run) return;

    run.hp = this.combatState.player.hp;
    RunManager.commitRunState();

    if (result === 'defeat') {
      this.cameras.main.fadeOut(600, 0x000000);
      this.time.delayedCall(600, () => this.scene.start('GameOverScene'));
      return;
    }

    const isBoss = currentNodeType === 'BOSS';
    const isElite = currentNodeType === 'ELITE';

    if (isBoss) {
      trace('COMBAT', 'bossResult', {
        result,
        act: run.act,
        currentNode: run.currentNode,
      });
      if (run.act >= 3) {
        this.cameras.main.fadeOut(600, 0x000000);
        this.time.delayedCall(600, () => this.scene.start('VictoryScene'));
      } else {
        RunManager.advanceAct();
        this.cameras.main.fadeOut(600, 0x000000);
        this.time.delayedCall(600, () => this.scene.start('MapScene'));
      }
      return;
    }

    const rewardBase = {
      gold: isElite ? 40 : 20,
      cardOptions: this.getRewardCardPool(run.character).slice(0, 3),
      relicId: isElite ? 'lucky_coin' : undefined,
    };
    const reward = applyRelicRewardModifiers(run.relics, rewardBase);

    this.cameras.main.fadeOut(400, 0x000000);
    this.time.delayedCall(400, () => {
      trace('COMBAT', 'handoffRewardScene', {
        gold: reward.gold,
        cardOptions: reward.cardOptions,
        relicId: reward.relicId ?? null,
        currentNode: run.currentNode,
      });
      this.scene.start('RewardScene', { reward });
    });
  }

  private getRewardCardPool(characterId: string): string[] {
    const rng = getRNG(this.combatSeed, 'reward');
    const pool = Array.from(allCards.values())
      .filter((card) => card.id.startsWith(characterId))
      .filter((card) => !card.upgraded)
      .map((card) => card.id);
    return rng.shuffle(pool);
  }

  private setupDropZones(): void {
    this.dragDropSystem.clearZones();

    this.enemyContainers.forEach((container, index) => {
      if (!container) return;
      this.dragDropSystem.addZone(
        `enemy_${index}`,
        'enemy',
        new Phaser.Geom.Rectangle(
          Math.round(container.x - 56),
          Math.round(container.y - 90),
          112,
          132
        )
      );
    });

    this.dragDropSystem.addZone(
      'self_zone',
      'self',
      new Phaser.Geom.Rectangle(
        Math.round(this.playerContainer.x - 70),
        Math.round(this.playerContainer.y - 100),
        140,
        150
      )
    );
  }

  private renderPlayer(): void {
    const player = this.combatState.player;
    const character = getCharacter(player.id as CharacterId);
    const x = Math.round(this.scale.width * 0.22);
    const y = Math.round(this.scale.height * 0.75);

    this.playerContainer = this.add.container(x, y);

    const emojiText = this.add.text(0, -30, character ? (EMOJI[character.id as keyof typeof EMOJI] ?? EMOJI.player) : EMOJI.player, {
      fontSize: '64px',
    }).setOrigin(0.5);

    const nameText = this.add.text(0, 94, player.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const healthBar = this.createRoundedHealthBar(124, 16, 74, 96);
    healthBar.bg.setPosition(0, 52);
    healthBar.fill.setPosition(0, 52);
    // Move shield indicator beside status pills instead of under HP bar.
    healthBar.block.setPosition(86, 124);
    // Status stack row anchored below the shield/block indicator.
    const statusContainer = this.add.container(0, 124);

    this.playerContainer.add([
      emojiText,
      nameText,
      healthBar.bg,
      healthBar.fill,
      healthBar.text,
      healthBar.block,
      statusContainer,
    ]);
    this.playerStatusContainer = statusContainer;

    // Render Cao Cao Spine actor in combat (fallback to emoji if unavailable).
    if (player.id === 'caocao') {
      this.playerSpine?.destroy();
      this.playerSpine = SpineManager.create(this, 'char_caocao', x, y + 22, {
        scale: Math.max(3.6, Math.min(this.scale.width / 1280, this.scale.height / 720) * 5.2),
        initialAnimation: 'idle',
      });
      if (this.playerSpine) {
        SpineManager.setFacing(this.playerSpine, 'right');
        SpineManager.setSpeed(this.playerSpine, PLAYER_SPINE_SPEED_MULTIPLIER);
        this.playerSpine.alpha = 1;
        emojiText.setVisible(false);
      }
    }
    this.playerContainer.setData({
      hpFill: healthBar.fill,
      hpText: healthBar.text,
      blockText: healthBar.block,
      hpWidth: healthBar.width,
      hpHeight: healthBar.height,
      statusContainer,
    });
    this.refreshCombatantVisuals();
  }

  private renderEnemies(): void {
    this.enemyContainers.forEach((container) => container?.destroy());
    this.enemySpines.forEach((spine) => spine?.destroy());
    this.intentDisplays.forEach((display) => display?.destroy());
    this.enemyContainers = [];
    this.enemySpines = [];
    this.enemyStatusContainers = [];
    this.intentDisplays = [];

    const total = this.combatState.enemies.length;
    const xs = this.getEnemyXPositions(total);
    this.lastEnemyHp = this.combatState.enemies.map((enemy) => enemy.hp);

    this.combatState.enemies.forEach((enemy, index) => {
      const visuals = this.getEnemyVisuals(enemy.id);
      const x = Math.round(this.scale.width * xs[index]);
      const y = this.getEnemyYPosition(index, total);

      const container = this.add.container(x, y).setScale(visuals.scale);
      const emojiText = this.add.text(0, -20, visuals.emoji, { fontSize: '48px' }).setOrigin(0.5);
      const body = this.add.rectangle(0, 20, 70, 50, visuals.bodyColor, 0.6)
        .setStrokeStyle(2, visuals.strokeColor)
        .setOrigin(0.5);
      const nameText = this.add.text(0, 82, enemy.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#ffffff',
      }).setOrigin(0.5);
      const healthBar = this.createRoundedHealthBar(96, 14, 60, 80);
      healthBar.bg.setPosition(0, 42);
      healthBar.fill.setPosition(0, 42);
      // Move shield indicator beside status pills instead of under HP bar.
      healthBar.block.setPosition(74, 102);
      // Status stack row anchored below the shield/block indicator.
      const statusContainer = this.add.container(0, 102);

      container.add([
        emojiText,
        body,
        nameText,
        healthBar.bg,
        healthBar.fill,
        healthBar.text,
        healthBar.block,
        statusContainer,
      ]);
      container.setData({
        hpFill: healthBar.fill,
        hpText: healthBar.text,
        blockText: healthBar.block,
        hpWidth: healthBar.width,
        hpHeight: healthBar.height,
        statusContainer,
      });
      this.enemyContainers[index] = container;
      this.enemyStatusContainers[index] = statusContainer;
      this.intentDisplays[index] = new IntentDisplay(this, x, y - Math.round(this.scale.height * 0.27));

      const enemySpineKey = this.getEnemySpineKey(enemy.id);
      if (enemySpineKey) {
        const enemySpine = SpineManager.create(this, enemySpineKey, x, y + 12, {
          scale: this.getEnemySpineScale(enemy.id),
          initialAnimation: 'idle',
        });
        if (enemySpine) {
          SpineManager.setFacing(enemySpine, 'left');
          SpineManager.setSpeed(enemySpine, 1.25);
          emojiText.setVisible(false);
          body.setVisible(false);
          this.enemySpines[index] = enemySpine;
        } else {
          this.enemySpines[index] = null;
        }
      } else {
        this.enemySpines[index] = null;
      }
    });

    this.refreshCombatantVisuals();
  }

  private renderHand(): void {
    this.handManager.clear();

    if (this.combatState.hand.length === 0) {
      return;
    }

    const cardContainers: { container: Phaser.GameObjects.Container; data: Card }[] = [];

    this.combatState.hand.forEach((card, index) => {
      let container!: Phaser.GameObjects.Container;
      container = createCardContainer(this, card, {
        onHover: (hoverIndex) => this.handManager.setHover(hoverIndex),
        onUnhover: () => this.handManager.clearHover(),
        onDragStart: (pointer) => this.startCardDrag(card, container, index, pointer),
        onRightClick: () => this.showInspect(card),
      }, index);
      cardContainers.push({ container, data: card });
    });

    this.handManager.setCards(cardContainers);
  }

  private startCardDrag(
    card: Card,
    container: Phaser.GameObjects.Container,
    index: number,
    pointer: Phaser.Input.Pointer
  ): void {
    if (this.combatState.currentPhase !== 'PLAYER_ACTION' || this.isResolvingQueue) {
      return;
    }

    if (this.combatState.player.energy < this.getEffectiveCardCost(card)) {
      this.addLog(`Not enough energy for ${card.name}`);
      this.tweens.add({
        targets: container,
        x: container.x - 5,
        duration: 50,
        yoyo: true,
        repeat: 3,
      });
      return;
    }

    this.draggedCardIndex = index;
    this.draggedCardData = card;
    this.draggedContainer = container;
    this.dragDropSystem.startDrag(container, card, pointer);
  }

  private playDraggedCard(zone: DropZone): void {
    const pointer = this.input.activePointer;
    trace('UI', 'combatDragEnd', {
      pointerX: pointer.x,
      pointerY: pointer.y,
      worldX: pointer.worldX,
      worldY: pointer.worldY,
      zoneId: zone?.id ?? null,
      cardId: this.draggedCardData?.id ?? null,
    });
    if (this.draggedCardData && this.draggedContainer && this.draggedCardIndex >= 0) {
      const targetEnemyIndex = this.getTargetEnemyIndex(zone);
      this.playCard(
        this.draggedCardData,
        this.draggedContainer,
        this.draggedCardIndex,
        targetEnemyIndex
      );
    }
    this.resetDraggedCard();
  }

  update(): void {
    const pointer = this.input.activePointer;
    if (pointer && this.dragDropSystem.isDragging()) {
      this.dragDropSystem.updateDrag(pointer);
    }
    this.checkEnemyDeaths();
    if (!this.isResolvingQueue && !this.combatEnded) {
      this.maybeHandleImmediateCombatEnd();
    }
  }

  private checkEnemyDeaths(): void {
    this.combatState.enemies.forEach((enemy, index) => {
      const wasAlive = (this.lastEnemyHp[index] ?? 0) > 0;
      if (wasAlive && enemy.hp <= 0) {
        this.turnStateMachine.notifyEnemyKilled(index);
      }
      this.lastEnemyHp[index] = enemy.hp;
    });
  }

  onPlayerEndTurn(): void {
    if (this.combatState.currentPhase !== 'PLAYER_ACTION' || this.isResolvingQueue) {
      return;
    }

    if (this.combatState.player.id === 'sunquan' && this.getResource() > 0) {
      this.addLog(`Tide Counter reset: ${this.getResource()} -> 0`);
      this.setResource(0);
      this.updateResourceDisplay();
    }

    this.endTurnButton.disableInteractive();
    this.tooltipManager.hide();
    this.turnStateMachine.onPlayerEndTurn((phase) => this.updatePhaseDisplay(phase));
  }

  private playCard(
    card: Card,
    container: Phaser.GameObjects.Container,
    index: number,
    targetEnemyIndex?: number
  ): void {
    if (this.combatState.currentPhase !== 'PLAYER_ACTION' || this.isResolvingQueue) {
      return;
    }

    if (
      card.target === 'ENEMY' &&
      (targetEnemyIndex === undefined || this.combatState.enemies[targetEnemyIndex]?.hp <= 0)
    ) {
      this.addLog('Target is no longer valid');
      container.destroy();
      this.renderHand();
      return;
    }

    const targetX = Math.round(this.scale.width * 0.94);
    const targetY = Math.round(this.scale.height * 0.86);

    const effectiveCost = this.getEffectiveCardCost(card);
    if (this.combatState.player.energy < effectiveCost) {
      this.addLog(`Not enough energy for ${card.name}`);
      this.renderHand();
      return;
    }

    this.combatState.player.energy -= effectiveCost;
    this.playPlayerCardAnimation(card);
    this.markRelicCostTaxes(card);
    if (this.combatState.player.statuses.some((status) => status.id === 'panic')) {
      removeStatus(this.combatState.player, 'panic');
    }
    this.updateResourceForCard(card);
    this.applyGuardianPunishmentIfNeeded(card);
    this.effectQueue.enqueue(card.effects, { source: 'player', targetEnemyIndex });
    this.turnStateMachine.notifyCardPlayed(card, targetEnemyIndex);
    trace('CARD', 'play', {
      cardId: card.id,
      cardName: card.name,
      targetEnemyIndex: targetEnemyIndex ?? null,
      energyAfter: this.combatState.player.energy,
      phase: this.combatState.currentPhase,
    });
    this.addLog(`Played ${card.name}`);

    this.combatState.hand.splice(index, 1);
    this.handManager.removeCard(index);

    if (card.type === 'POWER') {
      const power = createPowerInstance(card);
      if (power) {
        this.combatState.playerPowers.push(power);
        this.addLog(`Power active: ${power.name}`);
      }
      animateCardDiscard(this, container, targetX, targetY);
    } else if (card.exhaust) {
      this.combatState.exhaustPile.push(card);
      animateCardExhaust(this, container, targetX, targetY);
    } else {
      this.combatState.discardPile.push(card);
      animateCardDiscard(this, container, targetX, targetY);
    }

    this.tooltipManager.hide();
    this.updateHUD();

    this.resolvePendingEffects(() => {
      this.renderHand();
      this.updateHUD();
      this.refreshCombatantVisuals();
    });
  }

  private getPlayerActionAnimation(card: Card): string {
    switch (card.type) {
      case 'ATTACK':
        return 'skill0';
      case 'SKILL':
        return 'skill1';
      case 'POWER':
        return 'skill2';
      default:
        return 'run';
    }
  }

  private playPlayerCardAnimation(card: Card): void {
    if (!this.playerSpine) {
      return;
    }

    const actionAnimation = this.getPlayerActionAnimation(card);
    SpineManager.play(this.playerSpine, actionAnimation, false);
    SpineManager.queueAnimation(this.playerSpine, 'ready', true, 0);

    if (import.meta.env.DEV) {
      console.debug('[CombatScene] player animation', {
        cardId: card.id,
        cardType: card.type,
        actionAnimation,
        queuedIdle: 'ready',
      });
    }
  }

  private getEnemyActionAnimation(enemyIndex: number): string {
    const enemy = this.combatState.enemies[enemyIndex];
    const primary = enemy?.intent?.effects?.[0];
    if (!primary) {
      return 'skill0';
    }

    switch (primary.type) {
      case 'damage':
        return 'skill0';
      case 'block':
      case 'apply_status':
        return 'skill1';
      case 'summon':
        return 'skill2';
      default:
        return 'run';
    }
  }

  private playEnemyActionAnimation(enemyIndex: number): void {
    const enemySpine = this.enemySpines[enemyIndex];
    if (!enemySpine) {
      return;
    }

    const actionAnimation = this.getEnemyActionAnimation(enemyIndex);
    SpineManager.play(enemySpine, actionAnimation, false);
    SpineManager.queueAnimation(enemySpine, 'ready', true, 0);
  }

  private resolvePendingEffects(onComplete?: () => void): void {
    const enemyCountBefore = this.combatState.enemies.length;
    this.isResolvingQueue = true;
    const resolveEffect = createEffectResolver({
      rng: this.combatRNG,
      relicManager: this.relicManager,
    });
    this.effectQueue.execute(
      this.combatState,
      (queuedEffect, combatState) => {
        resolveEffect(queuedEffect, combatState);
        this.refreshCombatantVisuals();
      },
      () => {
        this.isResolvingQueue = false;
        if (this.combatState.enemies.length !== enemyCountBefore) {
          this.renderEnemies();
          this.setupDropZones();
        }
        if (this.maybeHandleImmediateCombatEnd()) {
          return;
        }
        onComplete?.();
      }
    );
  }

  private maybeHandleImmediateCombatEnd(): boolean {
    if (this.combatState.player.hp <= 0) {
      if (import.meta.env.DEV) {
        console.debug('[CombatScene] Immediate combat end detected: defeat');
      }
      this.handleCombatEnd('defeat');
      return true;
    }

    const hasLivingEnemy = this.combatState.enemies.some((enemy) => enemy.hp > 0);
    if (!hasLivingEnemy) {
      if (import.meta.env.DEV) {
        console.debug('[CombatScene] Immediate combat end detected: victory');
      }
      this.handleCombatEnd('victory');
      return true;
    }

    return false;
  }

  private getResource(): number {
    return this.combatState.player.resources?.[this.resourceName] ?? 0;
  }

  private setResource(value: number): void {
    this.combatState.player.resources = this.combatState.player.resources ?? {};
    this.combatState.player.resources[this.resourceName] = value;
  }

  private updateResourceForCard(card: Card): void {
    const characterId = this.combatState.player.id as CharacterId;
    switch (characterId) {
      case 'caocao':
        this.setResource(this.getResource() + 1);
        break;
      case 'liubei':
        if (card.type === 'SKILL') {
          this.setResource(this.getResource() + 1);
        }
        break;
      case 'sunquan':
        this.setResource(this.getResource() + 1);
        break;
    }
    this.updateResourceDisplay();
  }

  private updateResourceDisplay(): void {
    if (this.resourceText && this.resourceName) {
      this.resourceText.setText(`${this.resourceName}: ${this.getResource()}`);
    }
  }

  private updateHUD(): void {
    const player = this.combatState.player;
    GameSession.updateHp(player.hp, player.maxHp);
    this.hudManager.updateEnergy(player.energy);
    this.hudManager.updateHP(player.hp, player.maxHp);
    this.hudManager.updateBlock(player.block);
    this.hudManager.updatePiles(this.combatState.drawPile.length, this.combatState.discardPile.length);
    this.hudManager.updateStatuses([]);
    this.hudManager.updatePowers(this.combatState.playerPowers);
    this.hudManager.updateRelics(this.relicManager.getRelics());
    this.updateResourceDisplay();
    this.refreshCombatantVisuals();
  }

  private refreshCombatantVisuals(): void {
    const playerData = this.playerContainer?.data?.values as
      | {
        hpFill: Phaser.GameObjects.Graphics;
        hpText: Phaser.GameObjects.Text;
        blockText: Phaser.GameObjects.Text;
        hpWidth: number;
        hpHeight: number;
        statusContainer?: Phaser.GameObjects.Container;
      }
      | undefined;
    if (playerData) {
      this.redrawRoundedHealthBar(
        playerData.hpFill,
        playerData.hpWidth,
        playerData.hpHeight,
        this.combatState.player.hp / this.combatState.player.maxHp,
        this.combatState.player.hp / this.combatState.player.maxHp > 0.3 ? 0xe35d6a : 0xc52828
      );
      playerData.hpText.setText(`${this.combatState.player.hp}/${this.combatState.player.maxHp}`);
      playerData.blockText.setText(this.combatState.player.block > 0 ? `${EMOJI.block} ${this.combatState.player.block}` : '');
      playerData.blockText.setVisible(this.combatState.player.block > 0);
      this.playerStatusSignature = this.updateStatusPills(
        playerData.statusContainer ?? this.playerStatusContainer,
        this.combatState.player.statuses,
        this.playerStatusSignature
      );
      this.emitPlayerPopups();
    }

    this.combatState.enemies.forEach((enemy, index) => {
      const container = this.enemyContainers[index];
      if (!container) return;
      const dataStore = container.data;
      if (!dataStore) return;
      const data = dataStore.values as
        | {
          hpFill: Phaser.GameObjects.Graphics;
          hpText: Phaser.GameObjects.Text;
          blockText: Phaser.GameObjects.Text;
          hpWidth: number;
          hpHeight: number;
          statusContainer?: Phaser.GameObjects.Container;
        }
        | undefined;
      if (!data) return;

      this.redrawRoundedHealthBar(
        data.hpFill,
        data.hpWidth,
        data.hpHeight,
        enemy.hp / enemy.maxHp,
        enemy.hp / enemy.maxHp > 0.3 ? 0xdf636c : 0xb42318
      );
      data.hpText.setText(`${Math.max(0, enemy.hp)}/${enemy.maxHp}`);
      data.blockText.setText(enemy.block > 0 ? `${EMOJI.block} ${enemy.block}` : '');
      data.blockText.setVisible(enemy.block > 0);
      container.setAlpha(enemy.hp > 0 ? 1 : 0.25);
      const enemySpine = this.enemySpines[index];
      if (enemySpine) {
        enemySpine.alpha = enemy.hp > 0 ? 1 : 0.25;
      }
      this.enemyStatusSignatures[index] = this.updateStatusPills(
        data.statusContainer ?? this.enemyStatusContainers[index],
        enemy.statuses,
        this.enemyStatusSignatures[index] ?? '',
        5
      );
      this.emitEnemyPopups(enemy, index);
    });

    this.updateEnemyIntents();
  }

  private updateStatusPills(
    target: Phaser.GameObjects.Container | null | undefined,
    statuses: Status[],
    previousSignature: string,
    maxVisible = 6
  ): string {
    if (!target) return previousSignature;
    const signature = statuses
      .filter((status) => status.stacks > 0)
      .map((status) => `${status.id}:${status.stacks}:${status.duration ?? 'p'}`)
      .join('|');
    if (signature === previousSignature) {
      return previousSignature;
    }

    target.removeAll(true);

    const activeStatuses = statuses.filter((status) => status.stacks > 0);
    const active = activeStatuses.slice(0, maxVisible);
    if (active.length === 0) {
      target.setVisible(false);
      return signature;
    }

    const slotWidth = 40;
    const slotHeight = 30;
    const cols = 5;
    const rows = Math.ceil(active.length / cols);
    const topOffset = -((rows - 1) * slotHeight) / 2;
    active.forEach((status, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const colsInRow = Math.min(cols, active.length - row * cols);
      const leftOffset = -((colsInRow - 1) * slotWidth) / 2;
      const pill = this.add.container(leftOffset + col * slotWidth, topOffset + row * slotHeight);
      const bg = this.add.graphics();
      bg.fillStyle(0x15111f, 0.94);
      bg.fillRoundedRect(-18, -13, 36, 26, 8);
      bg.lineStyle(1, 0x8f7647, 0.95);
      bg.strokeRoundedRect(-18, -13, 36, 26, 8);

      const icon = this.add.text(-5, 0, this.getStatusEmoji(status.id), {
        fontSize: '12px',
      }).setOrigin(0.5);

      const value = this.add.text(9, 0, `${status.stacks}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#f8e7c0',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const hitZone = this.add.rectangle(0, 0, 34, 24, 0xffffff, 0.001).setInteractive({ useHandCursor: false });
      hitZone.on('pointerover', () => {
        const m = pill.getWorldTransformMatrix();
        this.tooltipManager.showStatus(status, m.tx, m.ty - 16);
      });
      hitZone.on('pointerout', () => this.tooltipManager.hide());

      pill.add([bg, icon, value, hitZone]);
      target.add(pill);
      pill.setAlpha(0);
      pill.setScale(0.85);
      this.tweens.add({
        targets: pill,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        y: -2,
        duration: 140,
        delay: index * 35,
        ease: 'Sine.easeOut',
      });
    });

    if (activeStatuses.length > active.length) {
      const extraIndex = active.length;
      const col = extraIndex % cols;
      const row = Math.floor(extraIndex / cols);
      const colsInRow = Math.min(cols, active.length - row * cols + 1);
      const leftOffset = -((colsInRow - 1) * slotWidth) / 2;
      const moreBg = this.add.graphics();
      moreBg.fillStyle(0x15111f, 0.92);
      moreBg.fillRoundedRect(-18, -13, 36, 26, 8);
      moreBg.lineStyle(1, 0x8f7647, 0.95);
      moreBg.strokeRoundedRect(-18, -13, 36, 26, 8);
      const more = this.add.text(0, 0, `+${activeStatuses.length - active.length}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: '#cdb78a',
      }).setOrigin(0.5);
      const moreSlot = this.add.container(leftOffset + col * slotWidth, topOffset + row * slotHeight);
      moreSlot.add([moreBg, more]);
      target.add(moreSlot);
    }

    target.setVisible(true);
    return signature;
  }

  private getStatusEmoji(statusId: Status['id']): string {
    const mapped = EMOJI[statusId as keyof typeof EMOJI];
    if (mapped) return mapped;

    const fallbackMap: Partial<Record<Status['id'], string>> = {
      exposed: '🎯',
      disarmed: '🫳',
      burning: '🔥',
      bleed: '🩸',
      broken_formation: '🧱',
      entrenched: '🛡️',
      momentum: '💨',
      command: '📯',
      fire_setup: '🪔',
      panic: '😱',
      supply_shortage: '📦',
      isolated: '🎯',
      insight: '🧠',
      guarded: '🛡️',
      revealed: '👁️',
      evade: '💫',
      formation: '🪖',
      valor: '⚔️',
      strength: '💪',
      weak: '🫠',
      vulnerable: '🩹',
      poison: '☠️',
      frost: '❄️',
    };
    return fallbackMap[statusId] ?? '❔';
  }

  private emitPlayerPopups(): void {
    if (!this.playerContainer) return;
    const player = this.combatState.player;
    const world = this.playerContainer.getWorldTransformMatrix();
    const x = world.tx;
    const y = this.playerSpine ? (world.ty - 210) : (world.ty - 86);

    if (this.lastPlayerHpSnapshot != null) {
      const hpDelta = player.hp - this.lastPlayerHpSnapshot;
      if (hpDelta < 0) this.spawnNumberPopup(x, y, `${hpDelta}`, '#ff7b7b', 'damage', Math.abs(hpDelta));
      if (hpDelta > 0) this.spawnNumberPopup(x, y, `+${hpDelta}`, '#86efac', 'heal', hpDelta);
    }

    if (this.lastPlayerBlockSnapshot != null) {
      const blockDelta = player.block - this.lastPlayerBlockSnapshot;
      if (blockDelta > 0) this.spawnNumberPopup(x + 42, y - 8, `+${blockDelta} ${EMOJI.block}`, '#93c5fd', 'block', blockDelta);
      if (blockDelta < 0) this.spawnNumberPopup(x + 42, y - 8, `${blockDelta} ${EMOJI.block}`, '#7dd3fc', 'block', Math.abs(blockDelta));
    }

    this.emitStatusDeltaPopups(x - 24, y - 20, this.lastPlayerStatusSnapshot, player.statuses);
    this.lastPlayerHpSnapshot = player.hp;
    this.lastPlayerBlockSnapshot = player.block;
    this.lastPlayerStatusSnapshot = this.buildStatusStackMap(player.statuses);
  }

  private emitEnemyPopups(enemy: Enemy, index: number): void {
    const container = this.enemyContainers[index];
    if (!container) return;
    const world = container.getWorldTransformMatrix();
    const x = world.tx;
    const y = this.enemySpines[index] ? (world.ty - 190) : (world.ty - 78);

    const prevHp = this.lastEnemyHpSnapshots[index];
    if (prevHp != null) {
      const hpDelta = enemy.hp - prevHp;
      if (hpDelta < 0) this.spawnNumberPopup(x, y, `${hpDelta}`, '#ff7b7b', 'damage', Math.abs(hpDelta));
      if (hpDelta > 0) this.spawnNumberPopup(x, y, `+${hpDelta}`, '#86efac', 'heal', hpDelta);
    }

    const prevBlock = this.lastEnemyBlockSnapshots[index];
    if (prevBlock != null) {
      const blockDelta = enemy.block - prevBlock;
      if (blockDelta > 0) this.spawnNumberPopup(x + 36, y - 8, `+${blockDelta} ${EMOJI.block}`, '#93c5fd', 'block', blockDelta);
      if (blockDelta < 0) this.spawnNumberPopup(x + 36, y - 8, `${blockDelta} ${EMOJI.block}`, '#7dd3fc', 'block', Math.abs(blockDelta));
    }

    const prevStatuses = this.lastEnemyStatusSnapshots[index] ?? new Map<Status['id'], number>();
    this.emitStatusDeltaPopups(x - 22, y - 20, prevStatuses, enemy.statuses);

    this.lastEnemyHpSnapshots[index] = enemy.hp;
    this.lastEnemyBlockSnapshots[index] = enemy.block;
    this.lastEnemyStatusSnapshots[index] = this.buildStatusStackMap(enemy.statuses);
  }

  private buildStatusStackMap(statuses: Status[]): Map<Status['id'], number> {
    const map = new Map<Status['id'], number>();
    statuses.forEach((status) => {
      if (status.stacks > 0) {
        map.set(status.id, status.stacks);
      }
    });
    return map;
  }

  private emitStatusDeltaPopups(
    x: number,
    y: number,
    previous: Map<Status['id'], number>,
    currentStatuses: Status[]
  ): void {
    const current = this.buildStatusStackMap(currentStatuses);
    let emitted = 0;
    current.forEach((stacks, id) => {
      const prev = previous.get(id) ?? 0;
      const delta = stacks - prev;
      if (delta > 0 && emitted < 2) {
        this.spawnNumberPopup(
          x + emitted * 40,
          y - emitted * 12,
          `+${delta} ${this.getStatusEmoji(id)}`,
          '#f8e7c0',
          'status',
          delta
        );
        emitted += 1;
      }
    });
  }

  private spawnNumberPopup(
    x: number,
    y: number,
    text: string,
    color: string,
    kind: 'damage' | 'block' | 'status' | 'heal',
    magnitude: number
  ): void {
    if (this.spawnNumberPopupDom(x, y, text, color, kind, magnitude)) {
      return;
    }

    this.spawnNumberPopupPhaser(x, y, text, color, kind, magnitude);
  }

  private spawnNumberPopupDom(
    x: number,
    y: number,
    text: string,
    color: string,
    kind: 'damage' | 'block' | 'status' | 'heal',
    magnitude: number
  ): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    const canvas = this.game.canvas as HTMLCanvasElement | null;
    if (!canvas) {
      return false;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return false;
    }

    const sx = rect.width / canvas.width;
    const sy = rect.height / canvas.height;
    const randomX = x + Phaser.Math.Between(-10, 10);
    const randomY = y + Phaser.Math.Between(-6, 6);
    const screenX = rect.left + randomX * sx;
    const screenY = rect.top + randomY * sy;
    const baseSize = kind === 'damage' ? 56 : kind === 'block' ? 48 : 44;
    const impactScale = kind === 'damage'
      ? (magnitude >= 30 ? 1.75 : magnitude >= 15 ? 1.45 : 1.2)
      : kind === 'block'
        ? (magnitude >= 20 ? 1.45 : magnitude >= 10 ? 1.25 : 1.1)
        : (magnitude >= 3 ? 1.2 : 1.06);
    const riseDistance = (kind === 'damage' ? Phaser.Math.Between(32, 46) : Phaser.Math.Between(22, 34)) * sy;
    const duration = kind === 'damage' ? 620 : 560;

    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'fixed';
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    el.style.transform = `translate(-50%, 0px) scale(${impactScale + 0.35})`;
    el.style.fontFamily = 'system-ui, sans-serif';
    el.style.fontWeight = '900';
    el.style.fontSize = `${Math.max(16, Math.round(baseSize * sy))}px`;
    el.style.lineHeight = '1';
    el.style.color = color;
    el.style.pointerEvents = 'none';
    el.style.userSelect = 'none';
    el.style.whiteSpace = 'pre';
    el.style.zIndex = '2147483647';
    el.style.textShadow = '0 4px 6px rgba(0,0,0,0.9), 0 0 2px #140f1f, 0 0 8px #140f1f';
    document.body.appendChild(el);
    this.domPopups.add(el);

    const start = performance.now();
    const animate = (now: number) => {
      if (!this.domPopups.has(el)) {
        return;
      }

      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      const scale = impactScale + 0.35 - (0.35 * eased);
      const rise = -riseDistance * eased;
      el.style.opacity = `${1 - t}`;
      el.style.transform = `translate(-50%, ${rise}px) scale(${scale})`;

      if (t < 1) {
        requestAnimationFrame(animate);
        return;
      }

      this.domPopups.delete(el);
      el.remove();
    };
    requestAnimationFrame(animate);
    return true;
  }

  private spawnNumberPopupPhaser(
    x: number,
    y: number,
    text: string,
    color: string,
    kind: 'damage' | 'block' | 'status' | 'heal',
    magnitude: number
  ): void {
    const randomX = x + Phaser.Math.Between(-10, 10);
    const randomY = y + Phaser.Math.Between(-6, 6);
    const baseSize = kind === 'damage' ? 56 : kind === 'block' ? 48 : 44;
    const impactScale = kind === 'damage'
      ? (magnitude >= 30 ? 1.75 : magnitude >= 15 ? 1.45 : 1.2)
      : kind === 'block'
        ? (magnitude >= 20 ? 1.45 : magnitude >= 10 ? 1.25 : 1.1)
        : (magnitude >= 3 ? 1.2 : 1.06);
    const riseDistance = kind === 'damage' ? Phaser.Math.Between(32, 46) : Phaser.Math.Between(22, 34);
    const duration = kind === 'damage' ? 620 : 560;

    const popup = this.add.text(x, y, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${baseSize}px`,
      color,
      fontStyle: 'bold',
      stroke: '#140f1f',
      strokeThickness: 8,
      shadow: {
        offsetX: 0,
        offsetY: 4,
        color: '#000000',
        blur: 6,
        fill: true,
      },
    }).setOrigin(0.5).setDepth(3000);
    popup.setPosition(randomX, randomY);
    popup.setScale(impactScale + 0.35);

    this.tweens.add({
      targets: popup,
      y: randomY - riseDistance,
      alpha: 0,
      scaleX: impactScale,
      scaleY: impactScale,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  private clearDomPopups(): void {
    this.domPopups.forEach((popup) => popup.remove());
    this.domPopups.clear();
  }

  private addLog(message: string): void {
    this.combatLog.push(message);
    if (this.combatLog.length > 6) {
      this.combatLog.shift();
    }
    this.logText.setText(this.combatLog.join('\n'));
  }

  private updatePhaseDisplay(phase: TurnPhase): void {
    this.phaseText.setText(`${this.getPhaseEmoji(phase)} ${phase}`);

    if (phase === 'PLAYER_ACTION' || phase === 'START_ENEMY_TURN') {
      this.renderHand();
    }

    if (phase === 'PLAYER_ACTION') {
      this.addLog(`Turn ${this.combatState.turnNumber} - Your action`);
      if (this.combatState.forbiddenCardClass) {
        this.addLog(`Guardian punishes ${this.combatState.forbiddenCardClass}`);
      }
      if (!this.endTurnButton.input?.enabled) {
        this.endTurnButton.setInteractive({ useHandCursor: true });
      }
    }

    if (phase === 'DRAW_PHASE' || phase === 'RESOLVE_QUEUE' || phase === 'ENEMY_ACTION') {
      this.isResolvingQueue = true;
    }

    if (phase === 'PLAYER_ACTION' || phase === 'CHECK_END') {
      this.isResolvingQueue = false;
    }

    this.updateHUD();
  }

  private updateEnemyIntents(): void {
    this.combatState.enemies.forEach((enemy, index) => {
      const display = this.intentDisplays[index];
      if (!display) return;
      if (enemy.hp > 0 && enemy.intent) {
        display.showIntent(enemy);
      } else {
        display.clear();
      }
    });
  }

  private getPhaseEmoji(phase: TurnPhase): string {
    switch (phase) {
      case 'START_PLAYER_TURN': return EMOJI.start_turn;
      case 'DRAW_PHASE': return EMOJI.draw_phase;
      case 'PLAYER_ACTION': return EMOJI.action;
      case 'RESOLVE_QUEUE': return EMOJI.resolve;
      case 'END_PLAYER_TURN': return EMOJI.end_turn_phase;
      case 'START_ENEMY_TURN': return EMOJI.enemy_turn;
      case 'ENEMY_ACTION': return EMOJI.enemy_turn;
      case 'CLEANUP': return EMOJI.cleanup;
      case 'CHECK_END': return EMOJI.check_end;
      default: return '...';
    }
  }

  private setupKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-E', () => {
      if (!this.dragDropSystem.isDragging()) {
        this.onPlayerEndTurn();
      }
    });
  }

  private getInspectEmoji(type: Card['type']): string {
    switch (type) {
      case 'ATTACK': return EMOJI.attack;
      case 'SKILL': return EMOJI.skill;
      case 'POWER': return EMOJI.power;
      case 'STATUS': return EMOJI.status_card;
      case 'CURSE': return EMOJI.curse;
      default: return '[]';
    }
  }

  private buildCardDescription(card: Card): string {
    const effectLines = card.effects.map((effect) => {
      switch (effect.type) {
        case 'damage':
          return `Deal ${effect.value} damage${this.describeTarget(effect.target)}.`;
        case 'block':
          return `Gain ${effect.value} Block${effect.target === 'SELF' ? '' : this.describeTarget(effect.target)}.`;
        case 'draw':
          return `Draw ${effect.value} cards.`;
        case 'energy':
          return `${effect.value >= 0 ? 'Gain' : 'Lose'} ${Math.abs(effect.value)} Energy.`;
        case 'apply_status':
          return `Apply ${effect.value} ${effect.value === 1 ? 'stack' : 'stacks'} of ${effect.statusId ?? 'status'}${this.describeTarget(effect.target)}.`;
        default:
          return '';
      }
    });

    const traitLines: string[] = [];
    if (card.exhaust) traitLines.push('Exhaust.');
    if (card.retain) traitLines.push('Retain.');
    if (card.fleeting) traitLines.push('Fleeting.');
    if (card.type === 'POWER') traitLines.push('Persists for the rest of combat.');

    return [...effectLines, ...traitLines].filter(Boolean).join('\n') || 'No effect.';
  }

  private getEffectiveCardCost(card: Card): number {
    const panicPenalty = this.combatState.player.statuses.some((status) => status.id === 'panic') ? 1 : 0;
    let relicPenalty = 0;
    const resources = this.combatState.player.resources ?? {};
    const turn = this.combatState.turnNumber;

    if (
      this.relicManager.hasRelic('relic_imperial_edict') &&
      card.type === 'SKILL' &&
      resources.relic_imperial_edict_skill_tax_turn !== turn
    ) {
      relicPenalty += 1;
    }

    if (resources.relic_broken_supply_line_tax_next === 1) {
      relicPenalty += 1;
    }

    return card.cost + panicPenalty + relicPenalty;
  }

  private markRelicCostTaxes(card: Card): void {
    const resources = this.combatState.player.resources ?? (this.combatState.player.resources = {});
    const turn = this.combatState.turnNumber;

    if (
      this.relicManager.hasRelic('relic_imperial_edict') &&
      card.type === 'SKILL' &&
      resources.relic_imperial_edict_skill_tax_turn !== turn
    ) {
      resources.relic_imperial_edict_skill_tax_turn = turn;
    }

    if (resources.relic_broken_supply_line_tax_next === 1) {
      resources.relic_broken_supply_line_tax_next = 0;
    }
  }

  private applyGuardianPunishmentIfNeeded(card: Card): void {
    if (this.combatState.guardianPunishedThisTurn || !this.combatState.forbiddenCardClass) {
      return;
    }

    if (this.classifyCardForGuardian(card) !== this.combatState.forbiddenCardClass) {
      return;
    }

    this.combatState.guardianPunishedThisTurn = true;
    this.combatState.player.hp = Math.max(0, this.combatState.player.hp - 4);
    this.addLog(`Guardian punishment: ${card.name} triggers 4 direct damage`);
  }

  private classifyCardForGuardian(card: Card): GuardianCardClass {
    if (card.type === 'ATTACK') {
      return 'ATTACK';
    }

    const isGuard = card.effects.some((effect) => effect.type === 'block');
    return isGuard ? 'GUARD' : 'TACTIC';
  }

  private describeTarget(target: Card['target']): string {
    switch (target) {
      case 'ENEMY':
        return ' to an enemy';
      case 'ALL_ENEMIES':
        return ' to all enemies';
      case 'SELF':
        return ' to yourself';
      case 'ALL':
        return ' to all combatants';
      default:
        return '';
    }
  }

  private showInspect(card: Card): void {
    this.hideDrawPileOverlay();
    if (this.inspectOverlay) {
      this.hideInspect();
    }

    const w = 320;
    const h = 440;
    const sw = this.scale.width;
    const sh = this.scale.height;
    const cx = Math.round(sw / 2);
    const cy = Math.round(sh / 2);

    const overlay = this.add.container(cx, cy).setDepth(999);
    const closeOverlay = () => this.hideInspect();

    const dim = this.add.rectangle(0, 0, sw, sh, 0x000000, 0.6).setInteractive();
    dim.on('pointerdown', closeOverlay);
    const bg = this.add.rectangle(0, 0, w, h, 0x1f2937, 0.95).setStrokeStyle(3, 0xf59e0b);
    bg.setInteractive();
    bg.on('pointerdown', closeOverlay);
    const emoji = this.add.text(0, -140, card.emoji ?? this.getInspectEmoji(card.type), { fontSize: '72px' }).setOrigin(0.5);
    const name = this.add.text(0, -60, card.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#f59e0b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const meta = this.add.text(0, -20, `${card.type}  •  Cost ${card.cost} ${EMOJI.energy}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#94a3b8',
    }).setOrigin(0.5);
    const description = this.add.text(0, 60, card.description ?? this.buildCardDescription(card), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: w - 40 },
    }).setOrigin(0.5);
    const hint = this.add.text(0, 190, 'Click anywhere to close', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#64748b',
    }).setOrigin(0.5);

    overlay.add([dim, bg, emoji, name, meta, description, hint]);
    this.inspectOverlay = overlay;

    overlay.setScale(0.8);
    overlay.setAlpha(0);
    this.tweens.add({
      targets: overlay,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });
  }

  private hideInspect(): void {
    if (!this.inspectOverlay) return;
    this.tweens.add({
      targets: this.inspectOverlay,
      alpha: 0,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 100,
      onComplete: () => {
        this.inspectOverlay?.destroy();
        this.inspectOverlay = null;
      },
    });
  }

  private toggleDrawPileOverlay(): void {
    if (this.drawPileOverlay) {
      this.hideDrawPileOverlay();
      return;
    }

    this.hideInspect();
    const w = 360;
    const h = 460;
    const sw = this.scale.width;
    const sh = this.scale.height;
    const x = Math.round(sw * 0.86);
    const y = Math.round(sh * 0.50);

    const overlay = this.add.container(x, y).setDepth(995);
    const bg = this.add.rectangle(0, 0, w, h, 0x1f2937, 0.95).setStrokeStyle(2, 0x8f7647);
    const title = this.add.text(0, -h / 2 + 24, `Draw Pile (${this.combatState.drawPile.length})`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#f0d5a3',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const hint = this.add.text(0, h / 2 - 20, 'Click outside to close', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#8190a5',
    }).setOrigin(0.5);

    overlay.add([bg, title, hint]);

    const maxRows = 16;
    const shown = [...this.combatState.drawPile].slice(-maxRows).reverse();
    shown.forEach((card, i) => {
      const row = this.add.text(-w / 2 + 16, -h / 2 + 54 + i * 23, `${card.cost}  ${card.name}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#e2e8f0',
      }).setOrigin(0, 0.5);
      overlay.add(row);
    });
    if (this.combatState.drawPile.length > maxRows) {
      const more = this.add.text(-w / 2 + 16, -h / 2 + 54 + maxRows * 23, `... +${this.combatState.drawPile.length - maxRows} more`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#94a3b8',
      }).setOrigin(0, 0.5);
      overlay.add(more);
    }

    this.drawPileOverlay = overlay;
    this.drawPileOverlayOpenedAt = this.time.now;

    const closeOnOutside = (pointer: Phaser.Input.Pointer) => {
      if (!this.drawPileOverlay) return;
      if (this.time.now - this.drawPileOverlayOpenedAt < 120) return;
      const bounds = bg.getBounds();
      if (!bounds.contains(pointer.x, pointer.y)) {
        this.hideDrawPileOverlay();
      }
    };
    this.input.on('pointerup', closeOnOutside);
    overlay.setData('closeOnOutside', closeOnOutside);
  }

  private hideDrawPileOverlay(): void {
    if (!this.drawPileOverlay) return;
    const closeOnOutside = this.drawPileOverlay.getData('closeOnOutside') as ((pointer: Phaser.Input.Pointer) => void) | undefined;
    if (closeOnOutside) {
      this.input.off('pointerup', closeOnOutside);
    }
    this.drawPileOverlay.destroy(true);
    this.drawPileOverlay = null;
  }

  private getEnemyVisuals(enemyId: string): { emoji: string; bodyColor: number; strokeColor: number; scale: number } {
    const baseId = getEnemyTemplateId(enemyId);
    switch (baseId) {
      case 'bandit': return { emoji: '🥷', bodyColor: 0x8b4513, strokeColor: 0xffffff, scale: 1.0 };
      case 'thief': return { emoji: '🦹', bodyColor: 0x5d4037, strokeColor: 0xd7ccc8, scale: 0.95 };
      case 'yellow_turban_warband': return { emoji: '👲', bodyColor: 0xc9a227, strokeColor: 0xffe082, scale: 1.1 };
      case 'yellow_turban_fanatic': return { emoji: '🔱', bodyColor: 0xb8860b, strokeColor: 0xffd54f, scale: 1.05 };
      case 'dong_zhuo_vanguard': return { emoji: '🛡️', bodyColor: 0x7f1d1d, strokeColor: 0xfca5a5, scale: 1.15 };
      case 'wei_disciplined_spearman': return { emoji: '🪖', bodyColor: 0x3f4c6b, strokeColor: 0xcbd5e1, scale: 1.05 };
      case 'wu_fire_tactician': return { emoji: '🔥', bodyColor: 0x7c2d12, strokeColor: 0xfdba74, scale: 1.0 };
      case 'rogue_cavalry': return { emoji: '🐎', bodyColor: 0x4b5563, strokeColor: 0xfca5a5, scale: 1.1 };
      case 'shu_strategist': return { emoji: '🪶', bodyColor: 0x14532d, strokeColor: 0xbbf7d0, scale: 1.0 };
      case 'nanman_poison_shaman': return { emoji: '🧪', bodyColor: 0x365314, strokeColor: 0xd9f99d, scale: 1.0 };
      case 'imperial_shield_captain': return { emoji: '🛡️', bodyColor: 0x475569, strokeColor: 0xe2e8f0, scale: 1.1 };
      case 'feathered_war_scout': return { emoji: '🪶', bodyColor: 0x065f46, strokeColor: 0xa7f3d0, scale: 0.95 };
      case 'wei_soldier': return { emoji: '🪖', bodyColor: 0x455a64, strokeColor: 0xb0bec5, scale: 1.05 };
      case 'shu_archer': return { emoji: '🏹', bodyColor: 0x2e7d32, strokeColor: 0xa5d6a7, scale: 1.0 };
      case 'wu_marine': return { emoji: '⚓', bodyColor: 0x00695c, strokeColor: 0x80cbc4, scale: 1.05 };
      case 'elite_assassin': return { emoji: '🗡️', bodyColor: 0x4a148c, strokeColor: 0xce93d8, scale: 1.15 };
      case 'dong_zhuo': return { emoji: '👹', bodyColor: 0x880e4f, strokeColor: 0xf48fb1, scale: 1.35 };
      case 'boss_lubu': return { emoji: '👺', bodyColor: 0x212121, strokeColor: 0xef5350, scale: 1.4 };
      case 'caocao_flagship': return { emoji: '🚢', bodyColor: 0x1a237e, strokeColor: 0x9fa8da, scale: 1.3 };
      case 'snake': return { emoji: '🐍', bodyColor: 0x33691e, strokeColor: 0xc5e1a5, scale: 0.9 };
      case 'wolf': return { emoji: '🐺', bodyColor: 0x616161, strokeColor: 0xe0e0e0, scale: 1.0 };
      case 'tiger_warrior': return { emoji: '🐯', bodyColor: 0xe65100, strokeColor: 0xffcc80, scale: 1.1 };
      case 'imperial_guard': return { emoji: '⚔️', bodyColor: 0x37474f, strokeColor: 0xb0bec5, scale: 1.1 };
      case 'sorcerer': return { emoji: '🧙', bodyColor: 0x4a148c, strokeColor: 0xba68c8, scale: 1.0 };
      default: return { emoji: EMOJI.bandit, bodyColor: 0x8b4513, strokeColor: 0xffffff, scale: 1.0 };
    }
  }

  private getEnemySpineKey(enemyId: string): string | null {
    const baseId = getEnemyTemplateId(enemyId);
    switch (baseId) {
      case 'yellow_turban_warband':
        return 'enemy_yellow_turban_warband';
      case 'yellow_turban_fanatic':
        return 'enemy_yellow_turban_fanatic';
      case 'imperial_guard':
        return 'enemy_imperial_guard';
      case 'rogue_cavalry':
        return 'enemy_rogue_cavalry';
      case 'dong_zhuo_vanguard':
        return 'enemy_dong_zhuo_vanguard';
      default:
        return null;
    }
  }

  private getEnemySpineScale(enemyId: string): number {
    const baseId = getEnemyTemplateId(enemyId);
    const scaleByEnemy: Record<string, number> = {
      yellow_turban_warband: Math.max(2.8, Math.min(this.scale.width / 1280, this.scale.height / 720) * 4.0),
      yellow_turban_fanatic: Math.max(2.8, Math.min(this.scale.width / 1280, this.scale.height / 720) * 4.0),
      imperial_guard: Math.max(2.8, Math.min(this.scale.width / 1280, this.scale.height / 720) * 4.1),
      rogue_cavalry: Math.max(2.8, Math.min(this.scale.width / 1280, this.scale.height / 720) * 3.8),
      dong_zhuo_vanguard: Math.max(2.8, Math.min(this.scale.width / 1280, this.scale.height / 720) * 4.0),
    };
    return scaleByEnemy[baseId] ?? Math.max(2.8, Math.min(this.scale.width / 1280, this.scale.height / 720) * 4.0);
  }

  private createEncounterEnemies(enemyIds: string[], enemyRng: RNG, act: number): Enemy[] {
    const enemies: Enemy[] = [];

    enemyIds.forEach((id, enemyIndex) => {
      const template = getEnemyTemplate(id);
      const enemy = spawnEnemy(id, enemyRng, act);
      if (!template?.startsWithIllusions) {
        enemies.push(enemy);
        return;
      }

      const illusionGroupId = `illusion_${enemyIndex}_${enemy.id}`;
      enemy.isIllusion = true;
      enemy.isReal = true;
      enemy.illusionGroupId = illusionGroupId;
      enemies.push(enemy);

      for (let i = 0; i < template.startsWithIllusions; i++) {
        const fake = spawnEnemy(id, enemyRng, act);
        fake.name = `${template.name} Illusion`;
        fake.hp = 1;
        fake.maxHp = 1;
        fake.intent = null;
        fake.isIllusion = true;
        fake.isReal = false;
        fake.illusionGroupId = illusionGroupId;
        enemies.push(fake);
      }
    });

    return enemies.slice(0, 4);
  }

  private getEnemyXPositions(total: number): number[] {
    return Array.from({ length: total }, () => 0.78);
  }

  private getEnemyYPosition(index: number, total: number): number {
    const h = this.scale.height;
    if (total <= 1) return Math.round(h * 0.75);
    if (total === 2) {
      const ys = [0.69, 0.79];
      return Math.round(h * ys[index]);
    }
    if (total === 3) {
      const ys = [0.65, 0.75, 0.83];
      return Math.round(h * ys[index]);
    }
    if (total === 4) {
      const ys = [0.61, 0.69, 0.77, 0.85];
      return Math.round(h * ys[index]);
    }
    const ys = [0.58, 0.65, 0.73, 0.81, 0.87];
    return Math.round(h * ys[Math.min(index, ys.length - 1)]);
  }

  private logPositions(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const normalize = (x: number, y: number) => ({ x: +(x / w).toFixed(3), y: +(1 - y / h).toFixed(3) });
    console.group('Combat Layout Positions');
    console.log('Player:', normalize(this.playerContainer.x, this.playerContainer.y));
    this.enemyContainers.forEach((container, index) => {
      if (container) console.log(`Enemy[${index}]`, normalize(container.x, container.y));
    });
    console.groupEnd();
  }

  private getTargetEnemyIndex(zone: DropZone): number | undefined {
    if (!zone.id.startsWith('enemy_')) {
      return undefined;
    }

    const index = Number(zone.id.slice('enemy_'.length));
    return Number.isInteger(index) ? index : undefined;
  }

  private resetDraggedCard(): void {
    this.draggedCardIndex = -1;
    this.draggedCardData = null;
    this.draggedContainer = null;
  }

  destroy(): void {
    this.playerSpine?.destroy();
    this.playerSpine = null;
    this.enemySpines.forEach((spine) => spine?.destroy());
    this.enemySpines = [];
    this.clearDomPopups();
    this.tooltipManager.destroy();
  }
}
