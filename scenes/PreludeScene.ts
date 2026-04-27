import Phaser from 'phaser';
import type { CharacterId, PreludeChoice, PreludeNode, Relic } from '../types';
import {
  advancePrelude,
  applyBattleReward,
  getCurrentNode,
  getPreludeUnlock,
  hydratePreludeState,
  initPreludeState,
  loadPrelude,
  type SerializedPreludeState,
  serializePreludeState,
} from '../systems/PreludeEngine';
import { RunManager } from '../core/RunManager';
import { GameSession } from '../core/GameSession';
import { getRelic } from '../data/relics';
import { getCharacter } from '../data/characters';
import { EMOJI } from '../data/emoji';
import { SpineManager, type SpineGameObject } from '../ui/SpineManager';

export class PreludeScene extends Phaser.Scene {
  private characterId!: CharacterId;
  private preludeState!: ReturnType<typeof initPreludeState>;
  private preludeSnapshot?: SerializedPreludeState;
  private contentContainer!: Phaser.GameObjects.Container;
  private finishPreludeOnCreate = false;
  private preludeActor: SpineGameObject | Phaser.GameObjects.Text | null = null;
  private preludeBackgroundImage: Phaser.GameObjects.Image | null = null;
  private preludeBackgroundVideo: Phaser.GameObjects.Video | null = null;
  private tutorialOverlay: Phaser.GameObjects.Container | null = null;
  private tutorialStepIndex = 0;

  constructor() {
    super({ key: 'PreludeScene' });
  }

  private ensureDialogueHUD(): void {
    if (this.scene.manager.isSleeping('HUDScene')) {
      this.scene.wake('HUDScene');
    } else if (!this.scene.manager.isActive('HUDScene')) {
      this.scene.launch('HUDScene');
    }
    this.scene.bringToTop('HUDScene');
    this.time.delayedCall(0, () => {
      if (this.scene.manager.isSleeping('HUDScene')) {
        this.scene.wake('HUDScene');
      } else if (!this.scene.manager.isActive('HUDScene')) {
        this.scene.launch('HUDScene');
      }
      this.scene.bringToTop('HUDScene');
    });
  }

  init(data: { characterId: CharacterId; preludeState?: SerializedPreludeState; finishPrelude?: boolean }): void {
    this.characterId = data.characterId;
    this.preludeSnapshot = data.preludeState;
    this.finishPreludeOnCreate = Boolean(data.finishPrelude);
  }

  async create(): Promise<void> {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    this.renderPreludeBackground(cx, cy, w, h);
    this.contentContainer = this.add.container(cx, cy);

    try {
      const config = await loadPrelude(this.characterId);
      this.preludeState = this.preludeSnapshot
        ? hydratePreludeState(config, this.preludeSnapshot)
        : initPreludeState(config);
      this.syncGameSession();
      if (this.finishPreludeOnCreate) {
        void this.finishPrelude();
        return;
      }
      this.scene.launch('HUDScene');
      this.ensureDialogueHUD();
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.scene.stop('HUDScene');
        this.destroyPreludeBackground();
      });
      this.renderNode();
      this.maybeShowPreludeTutorial();
    } catch (error) {
      console.error(error);
      this.showError('Failed to load prelude.');
    }
  }

  private clearContent(): void {
    this.contentContainer.removeAll(true);
    if (this.preludeActor) {
      this.preludeActor.destroy();
      this.preludeActor = null;
    }
    this.tutorialOverlay?.destroy(true);
    this.tutorialOverlay = null;
  }

  private maybeShowPreludeTutorial(): void {
    if (RunManager.hasSeenPreludeTutorial(this.characterId)) return;
    this.tutorialStepIndex = 0;
    this.renderTutorialStep();
  }

  private getTutorialSteps(): Array<{ title: string; body: string }> {
    return [
      {
        title: `Welcome, ${this.characterId.toUpperCase()} Commander`,
        body: 'Quick tutorial: this Prelude teaches your faction and unlocks core progression. I will keep it  short and practical.',
      },
      {
        title: 'Cards And Energy',
        body: 'In battle, cards cost Energy (shown in the top HUD). Attack cards deal damage, Skill cards defend or support, Power cards give lasting effects.',
      },
      {
        title: 'Block And Status Effects',
        body: 'Block prevents incoming damage for the turn. Status effects can buff or weaken either side, so always read enemy intents and your status icons.',
      },
      {
        title: 'Prelude Choices Matter',
        body: 'Dialogue choices can shift axis values, change rewards, and influence later outcomes. If unsure, pick the option that matches your strategy.',
      },
      {
        title: 'Map Flow',
        body: 'You will move through nodes: events, battles, and key story moments. Win battles, collect rewards, and shape your deck as you go.',
      },
      {
        title: 'You Are Ready',
        body: 'That is enough to begin. Play at your pace, test ideas, and adapt your deck after each reward. Good luck, Commander.',
      },
    ];
  }

  private renderTutorialStep(): void {
    this.tutorialOverlay?.destroy(true);
    this.tutorialOverlay = null;

    const steps = this.getTutorialSteps();
    const step = steps[this.tutorialStepIndex];
    if (!step) {
      this.completePreludeTutorial();
      return;
    }

    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    const overlay = this.add.container(0, 0).setDepth(4000);
    const blocker = this.add.rectangle(cx, cy, w, h, 0x000000, 0.72).setInteractive({ useHandCursor: true });
    const panelW = Math.min(860, w - 100);
    const panelH = Math.min(420, h - 120);
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0xe2cfab, 0.96)
      .setStrokeStyle(2, 0x6a5534, 1);
    const panelShade = this.add.rectangle(cx, cy, panelW, panelH, 0x000000, 0.1);
    const header = this.add.text(cx, cy - Math.round(panelH * 0.35), step.title, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      color: '#2c2015',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: panelW - 70 },
    }).setOrigin(0.5);
    const progress = this.add.text(cx, cy - Math.round(panelH * 0.23), `Tutorial ${this.tutorialStepIndex + 1}/${steps.length}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#6a5534',
    }).setOrigin(0.5);
    const body = this.add.text(cx, cy - 4, step.body, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#241a11',
      align: 'center',
      wordWrap: { width: panelW - 90 },
      lineSpacing: 6,
    }).setOrigin(0.5);

    const skipBtn = this.add.text(cx - 130, cy + Math.round(panelH * 0.34), 'Skip Tutorial', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#f5e8d1',
      backgroundColor: '#3f3121',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skipBtn.on('pointerdown', () => this.completePreludeTutorial());

    const isLast = this.tutorialStepIndex >= steps.length - 1;
    const nextBtn = this.add.text(cx + 130, cy + Math.round(panelH * 0.34), isLast ? 'Start Prelude' : 'Next', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#f5e8d1',
      backgroundColor: '#8f7647',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => {
      if (isLast) {
        this.completePreludeTutorial();
        return;
      }
      this.tutorialStepIndex += 1;
      this.renderTutorialStep();
    });

    overlay.add([blocker, panel, panelShade, header, progress, body, skipBtn, nextBtn]);
    this.tutorialOverlay = overlay;
  }

  private completePreludeTutorial(): void {
    RunManager.markPreludeTutorialSeen(this.characterId);
    this.tutorialOverlay?.destroy(true);
    this.tutorialOverlay = null;
  }

  private getPreludeBackgroundKey(): string {
    if (this.characterId === 'liubei') return this.textures.exists('bg_shu_still') ? 'bg_shu_still' : 'prelude_bg_shu';
    if (this.characterId === 'sunquan') return this.textures.exists('bg_wu_still') ? 'bg_wu_still' : 'prelude_bg_wu';
    return this.textures.exists('bg_wei_still') ? 'bg_wei_still' : 'prelude_bg_wei';
  }

  private renderPreludeBackground(cx: number, cy: number, w: number, h: number): void {
    const key = this.getPreludeBackgroundKey();
    if (this.textures.exists(key)) {
      const image = this.add.image(cx, cy, key);
      image.setDepth(-100);
      image.setDisplaySize(w, h);
      this.preludeBackgroundImage = image;
      return;
    }

    const hasVideo = this.cache.video.exists(key);
    if (hasVideo) {
      const video = this.add.video(cx, cy, key);
      video.setDepth(-100);
      video.setDisplaySize(w, h);
      video.setMute(true);
      video.setLoop(true);
      video.play(true);
      this.preludeBackgroundVideo = video;
      return;
    }

    this.add.rectangle(cx, cy, w, h, 0x000000, 1);
  }

  private destroyPreludeBackground(): void {
    if (this.preludeBackgroundImage) {
      this.preludeBackgroundImage.destroy();
      this.preludeBackgroundImage = null;
    }
    if (!this.preludeBackgroundVideo) return;
    this.preludeBackgroundVideo.stop();
    this.preludeBackgroundVideo.destroy();
    this.preludeBackgroundVideo = null;
  }

  private renderPreludeActor(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const x = Math.round(w * 0.16);
    const y = Math.round(h * 0.84);
    const spineKey = `char_${this.characterId}`;
    const hasSpineAssets = this.cache.text.exists(`${spineKey}:atlas`)
      && this.cache.text.exists(`${spineKey}:json`)
      && this.textures.exists(`${spineKey}:skeleton.png`);
    if (hasSpineAssets) {
      const spine = SpineManager.create(this, spineKey, x, y, {
        scale: Math.max(3.6, Math.min(this.scale.width / 1280, this.scale.height / 720) * 5.6),
        initialAnimation: 'idle',
      });
      if (spine) {
        SpineManager.setFacing(spine, 'right');
        SpineManager.setSpeed(spine, 1.4);
        this.preludeActor = spine;
        return;
      }
    }

    const character = getCharacter(this.characterId);
    const label = character?.name ?? this.characterId.toUpperCase();
    const emoji = EMOJI[this.characterId as keyof typeof EMOJI] ?? '👤';
    const fallback = this.add.text(x, y - 96, `${emoji}\n${label}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#f0d5a3',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 8,
      stroke: '#2a1c10',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.preludeActor = fallback;
  }

  private renderNode(): void {
    this.clearContent();
    const node = getCurrentNode(this.preludeState);
    if (!node) {
      void this.finishPrelude();
      return;
    }

    if (node.type === 'event') {
      this.renderEvent(node as PreludeNode & { type: 'event' });
      return;
    }

    if (node.type === 'battle') {
      this.startBattle(
        node.enemy ?? 'bandit',
        node.reward ? { type: node.reward.type, options: node.reward.options } : undefined
      );
      return;
    }

    this.renderBossPreview(node.boss ?? 'dong_zhuo');
  }

  private renderEvent(node: PreludeNode & { type: 'event' }): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const total = this.preludeState.config.nodes.length;
    const current = Math.min(this.preludeState.currentNodeIndex + 1, total);
    const chapter = node.chapter ?? `Chapter ${current}`;
    const hudTopbarHeight = 44;
    const secondaryTopbarHeight = 40;
    const secondaryTopbarGap = 6;
    const topBarY = -Math.round(h / 2) + hudTopbarHeight + secondaryTopbarGap + Math.round(secondaryTopbarHeight / 2) - Math.round(h * 0.0051);
    const edgePad = 20;

    const topBar = this.add.rectangle(0, topBarY, w, secondaryTopbarHeight, 0x000000, 0.86)
      .setStrokeStyle(1, 0x4a3a25, 1);
    const charName = this.add.text(-Math.round(w / 2) + edgePad, topBarY, this.characterId.toUpperCase(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#f8e7c0',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const progress = this.add.text(Math.round(w / 2) - edgePad, topBarY, `Prelude ${current}/${total}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#c5d0e0',
    }).setOrigin(1, 0.5);
    const chapterText = this.add.text(0, topBarY, chapter, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#9fb0c8',
    }).setOrigin(0.5);

    const storyPanel = this.textures.exists('ui_dialogue_parchment')
      ? this.add.image(0, -118, 'ui_dialogue_parchment').setDisplaySize(780, 220).setAlpha(0.95)
      : this.add.rectangle(0, -118, 780, 220, 0xe2cfab, 0.95);
    const storyPanelShade = this.add.rectangle(0, -118, 780, 220, 0x000000, 0.14)
      .setStrokeStyle(2, 0x6a5534, 1);
    const storyPanelHeader = this.add.rectangle(0, -226, 780, 2, 0x8f7647, 1);
    const title = this.add.text(0, -196, node.title ?? 'Event', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#2c2015',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const bodyText = (node.body?.length ? node.body.join('\n\n') : (node.text ?? '')).trim();
    const text = this.add.text(0, -118, bodyText, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      color: '#241a11',
      wordWrap: { width: 740 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    const hintText = node.hint
      ? this.add.text(0, -42, node.hint, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#3f3121',
        align: 'center',
        wordWrap: { width: 720 },
      }).setOrigin(0.5)
      : null;

    this.renderPreludeActor();

    this.contentContainer.add([
      topBar,
      charName,
      progress,
      chapterText,
      storyPanel,
      storyPanelShade,
      storyPanelHeader,
      title,
      text,
    ]);
    if (hintText) {
      this.contentContainer.add(hintText);
    }

    node.choices?.forEach((choice, index) => {
      const y = 65 + index * 100;
      const btn = this.add.container(0, y);
      const bg = this.add.rectangle(0, 0, 660, 80, 0xe2cfab, 0.95);
      const shade = this.add.rectangle(0, 0, 660, 80, 0x000000, 0.14).setStrokeStyle(2, 0x5f4b2f, 1);
      const accent = this.add.rectangle(-328, 0, 6, 80, 0x8f7647, 1);
      const label = this.add.text(-310, -24, choice.label ?? choice.text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#271d13',
        fontStyle: 'bold',
        wordWrap: { width: 620 },
      }).setOrigin(0, 0.5);
      const subtext = this.add.text(-310, -2, choice.subtext ?? choice.text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#3b2f22',
        wordWrap: { width: 620 },
      }).setOrigin(0, 0.5);
      const previewLines = this.buildChoicePreview(choice);
      const preview = this.add.text(-310, 20, previewLines.join(' | '), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#5a4a33',
        wordWrap: { width: 620 },
      }).setOrigin(0, 0.5);

      btn.add([bg, shade, accent, label, subtext, preview]);
      btn.setSize(660, 80);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        bg.setFillStyle(0xe8d8b8, 0.98);
        shade.setFillStyle(0x000000, 0.06);
        shade.setStrokeStyle(2, 0xb39058, 1);
        accent.setFillStyle(0xd0ab6a, 1);
      });
      btn.on('pointerout', () => {
        bg.setFillStyle(0xe2cfab, 0.95);
        shade.setFillStyle(0x000000, 0.14);
        shade.setStrokeStyle(2, 0x5f4b2f, 1);
        accent.setFillStyle(0x8f7647, 1);
      });
      btn.on('pointerdown', () => {
        const result = advancePrelude(this.preludeState, index);
        if (result.reward) {
          applyBattleReward(this.preludeState, result.reward);
        }
        this.syncGameSession();
        this.goToPreludeMap();
      });

      this.contentContainer.add(btn);
    });
  }

  private buildChoicePreview(choice: PreludeChoice): string[] {
    if (choice.preview?.length) {
      return choice.preview;
    }
    const lines: string[] = [];
    for (const [axis, delta] of Object.entries(choice.axisChanges ?? {})) {
      if (!delta) continue;
      const signed = delta > 0 ? `+${delta}` : `${delta}`;
      lines.push(`${this.titleCase(axis)} ${signed}`);
    }
    if (choice.reward) {
      lines.push(`Gain ${choice.reward.replace(/_/g, ' ')}`);
    }
    return lines.length > 0 ? lines : ['Advance Prelude'];
  }

  private titleCase(value: string): string {
    return value
      .replace(/_/g, ' ')
      .split(' ')
      .map((token) => token ? token[0].toUpperCase() + token.slice(1) : token)
      .join(' ');
  }

  private renderBossPreview(bossId: string): void {
    const title = this.add.text(0, -120, 'Ã¢Å¡â€Ã¯Â¸Â Final Trial', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      color: '#ff6b6b',
    }).setOrigin(0.5);

    const text = this.add.text(0, -40, `You stand before ${bossId.replace(/_/g, ' ').toUpperCase()}. This battle will seal your fate and define your legacy.`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#e0d6c8',
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5);

    const btn = this.add.container(0, 80);
    const bg = this.add.rectangle(0, 0, 240, 50, 0xff6b6b, 1).setStrokeStyle(2, 0xff9999, 1);
    const label = this.add.text(0, 0, 'Begin Battle', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    btn.add([bg, label]);
    btn.setSize(240, 50);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => bg.setScale(1.05));
    btn.on('pointerout', () => bg.setScale(1));
    btn.on('pointerdown', () => {
      this.startBattle(bossId, undefined, true);
    });

    this.contentContainer.add([title, text, btn]);
  }

  private startBattle(
    enemyId: string,
    reward?: { type: 'card' | 'relic'; options: string[] },
    isBoss = false
  ): void {
    const snapshot = serializePreludeState(this.preludeState);
    const sceneManager = this.game.scene;

    this.cameras.main.fadeOut(400, 0x000000);
    this.time.delayedCall(400, () => {
      sceneManager.start('CombatScene', {
        preludeMode: true,
        characterId: this.characterId,
        hp: this.preludeState.hp,
        maxHp: this.preludeState.maxHp,
        deck: snapshot.deckIds,
        relicIds: snapshot.relicIds,
        enemyIds: [enemyId],
        onVictory: () => {
          const sessionAfterCombat = GameSession.get();
          if (sessionAfterCombat) {
            this.preludeState.hp = sessionAfterCombat.hp;
            this.preludeState.maxHp = sessionAfterCombat.maxHp;
          }
          if (import.meta.env.DEV) {
            console.debug('[PreludeScene] onVictory callback', {
              characterId: this.characterId,
              enemyId,
              reward,
              isBoss,
              snapshot,
            });
          }
          if (reward) {
            sceneManager.stop('CombatScene');
            sceneManager.start('RewardScene', {
              reward: {
                gold: isBoss ? 50 : 20,
                cardOptions: reward.type === 'card' ? reward.options : undefined,
                relicOptions: reward.type === 'relic' ? reward.options : undefined,
              },
              onContinue: (selection?: { cardId?: string; relicId?: string }) => {
                this.preludeState.gold += isBoss ? 50 : 20;
                if (selection?.cardId) {
                  applyBattleReward(this.preludeState, selection.cardId);
                }
                if (selection?.relicId) {
                  applyBattleReward(this.preludeState, selection.relicId);
                }
                if (import.meta.env.DEV) {
                  console.debug('[PreludeScene] reward onContinue', {
                    selection,
                    nextNodeIndex: this.preludeState.currentNodeIndex + 1,
                  });
                }
                sceneManager.stop('RewardScene');
                advancePrelude(this.preludeState, 0);
                this.syncGameSession();
                sceneManager.start('MapScene', {
                  preludeMode: true,
                  preludeCharacterId: this.characterId,
                  preludeState: serializePreludeState(this.preludeState),
                });
              },
            });
            return;
          }

          if (isBoss) {
            sceneManager.stop('CombatScene');
            advancePrelude(this.preludeState, 0);
            this.syncGameSession();
            sceneManager.start('PreludeScene', {
              characterId: this.characterId,
              preludeState: serializePreludeState(this.preludeState),
              finishPrelude: true,
            });
            return;
          }

          sceneManager.stop('CombatScene');
          advancePrelude(this.preludeState, 0);
          this.syncGameSession();
          sceneManager.start('MapScene', {
            preludeMode: true,
            preludeCharacterId: this.characterId,
            preludeState: serializePreludeState(this.preludeState),
          });
        },
        onDefeat: () => {
          sceneManager.stop('CombatScene');
          sceneManager.start('GameOverScene', { source: 'prelude', characterId: this.characterId });
        },
      });
    });
  }

  private goToPreludeMap(): void {
    this.cameras.main.fadeOut(300, 0x000000);
    this.time.delayedCall(300, () => {
      this.scene.start('MapScene', {
        preludeMode: true,
        preludeCharacterId: this.characterId,
        preludeState: serializePreludeState(this.preludeState),
      });
    });
  }

  private syncGameSession(): void {
    GameSession.set({
      mode: 'prelude',
      hp: this.preludeState.hp,
      maxHp: this.preludeState.maxHp,
      gold: this.preludeState.gold,
      deck: this.preludeState.deck,
      relics: this.preludeState.relicIds
        .map((id) => getRelic(id))
        .filter((r): r is Relic => Boolean(r)),
      preludeCharacterId: this.characterId,
      preludeState: serializePreludeState(this.preludeState),
    });
  }

  private async finishPrelude(): Promise<void> {
    const unlock = getPreludeUnlock(this.preludeState);
    if (unlock) {
      await RunManager.unlockCharacter(unlock.character, { trait: unlock.trait, relic: unlock.relic });
    }

    GameSession.clear();
    this.clearContent();
    const w = this.scale.width;
    const cx = Math.round(w / 2);
    const sy = this.scale.height / 720;

    this.add.text(cx, 300 * sy, 'Ã¢Å“Â¨ Prelude Complete', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '36px',
      color: '#f0c060',
    }).setOrigin(0.5);

    this.add.text(cx, 360 * sy, `${this.characterId.toUpperCase()} unlocked for roguelike runs.`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    const btn = this.add.text(cx, 440 * sy, 'Return to Menu', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#111111',
      padding: { x: 20, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setScale(1.05))
      .on('pointerout', () => btn.setScale(1))
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(300, 0x000000);
        this.time.delayedCall(300, () => this.scene.start('MenuScene'));
      });
  }

  private showError(message: string): void {
    this.add.text(640, 360, message, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#ff6b6b',
    }).setOrigin(0.5);
  }
}
