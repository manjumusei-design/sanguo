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
import { SpineManager, type SpineGameObject } from '../ui/SpineManager';

export class PreludeScene extends Phaser.Scene {
  private characterId!: CharacterId;
  private preludeState!: ReturnType<typeof initPreludeState>;
  private preludeSnapshot?: SerializedPreludeState;
  private contentContainer!: Phaser.GameObjects.Container;
  private finishPreludeOnCreate = false;
  private preludeActor: SpineGameObject | Phaser.GameObjects.Text | null = null;
  private preludeBackgroundVideo: Phaser.GameObjects.Video | null = null;

  constructor() {
    super({ key: 'PreludeScene' });
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
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.scene.stop('HUDScene');
        this.destroyPreludeBackground();
      });
      this.renderNode();
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
  }

  private getPreludeBackgroundVideoKey(): string {
    if (this.characterId === 'liubei') return 'prelude_bg_shu';
    if (this.characterId === 'sunquan') return 'prelude_bg_wu';
    return 'prelude_bg_wei';
  }

  private renderPreludeBackground(cx: number, cy: number, w: number, h: number): void {
    const key = this.getPreludeBackgroundVideoKey();
    const hasVideo = this.cache.video.exists(key);
    if (!hasVideo) {
      this.add.rectangle(cx, cy, w, h, 0x000000, 1);
      return;
    }

    const video = this.add.video(cx, cy, key);
    video.setDepth(-100);
    video.setDisplaySize(w, h);
    video.setMute(true);
    video.setLoop(true);
    video.play(true);
    this.preludeBackgroundVideo = video;
  }

  private destroyPreludeBackground(): void {
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
    const spine = SpineManager.create(this, 'char_caocao', x, y, {
      scale: Math.max(3.6, Math.min(this.scale.width / 1280, this.scale.height / 720) * 5.6),
      initialAnimation: 'idle',
    });
    if (spine) {
      SpineManager.setFacing(spine, 'right');
      SpineManager.setSpeed(spine, 1.4);
      this.preludeActor = spine;
      return;
    }

    const fallback = this.add.text(x, y - 90, '🐉 曹操', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      color: '#f0d5a3',
      fontStyle: 'bold',
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
    this.renderPreludeActor();
    const total = this.preludeState.config.nodes.length;
    const current = Math.min(this.preludeState.currentNodeIndex + 1, total);
    const chapter = node.chapter ?? `Chapter ${current}`;

    const topBar = this.add.rectangle(0, -300, 860, 52, 0x000000, 1).setStrokeStyle(1, 0x333333, 1);
    const charName = this.add.text(-400, -300, this.characterId.toUpperCase(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#f8e7c0',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const progress = this.add.text(390, -300, `Prelude ${current}/${total}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#c5d0e0',
    }).setOrigin(1, 0.5);
    const chapterText = this.add.text(0, -300, chapter, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#9fb0c8',
    }).setOrigin(0.5);

    const title = this.add.text(0, -230, node.title ?? 'Event', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      color: '#f0c060',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const bodyText = (node.body?.length ? node.body.join('\n\n') : (node.text ?? '')).trim();
    const text = this.add.text(0, -120, bodyText, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#e0d6c8',
      wordWrap: { width: 860 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    const hintText = node.hint
      ? this.add.text(0, -22, node.hint, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#8aa1bd',
        align: 'center',
        wordWrap: { width: 840 },
      }).setOrigin(0.5)
      : null;

    this.contentContainer.add([topBar, charName, progress, chapterText, title, text]);
    if (hintText) {
      this.contentContainer.add(hintText);
    }

    node.choices?.forEach((choice, index) => {
      const y = 80 + index * 120;
      const btn = this.add.container(0, y);
      const bg = this.add.rectangle(0, 0, 760, 102, 0x000000, 1).setStrokeStyle(2, 0x333333, 1);
      const label = this.add.text(-350, -30, choice.label ?? choice.text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        wordWrap: { width: 700 },
      }).setOrigin(0, 0.5);
      const subtext = this.add.text(-350, -2, choice.subtext ?? choice.text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#cdd8ea',
        wordWrap: { width: 700 },
      }).setOrigin(0, 0.5);
      const previewLines = this.buildChoicePreview(choice);
      const preview = this.add.text(-350, 26, previewLines.join('   •   '), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#98b6ff',
        wordWrap: { width: 700 },
      }).setOrigin(0, 0.5);

      btn.add([bg, label, subtext, preview]);
      btn.setSize(760, 102);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        bg.setFillStyle(0x111111, 1);
        bg.setStrokeStyle(2, 0x777777);
      });
      btn.on('pointerout', () => {
        bg.setFillStyle(0x000000, 1);
        bg.setStrokeStyle(2, 0x333333);
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

    const footer = this.add.text(0, 340, 'Selection is permanent', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#7d8aa0',
    }).setOrigin(0.5);
    this.contentContainer.add(footer);
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
    const title = this.add.text(0, -120, 'âš”ï¸ Final Trial', {
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

    this.add.text(cx, 300 * sy, 'âœ¨ Prelude Complete', {
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
