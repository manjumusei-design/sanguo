import Phaser from 'phaser';
import type { CharacterId } from '../types';
import { getCharacter, getCharacterSpineKey } from '../data/characters';
import { RunManager } from '../core/RunManager';
import { GameSession } from '../core/GameSession';
import { SpineManager, type SpineGameObject } from '../ui/SpineManager';

export class MenuScene extends Phaser.Scene {
  private contentContainer!: Phaser.GameObjects.Container;
  private currentTab: 'prelude' | 'roguelike' | 'chronicle' = 'prelude';

  private getLayout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);
    const sx = w / 1280;
    const sy = h / 720;
    const s = Math.min(sx, sy);
    return { w, h, cx, cy, sx, sy, s };
  }

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { w, h, cx, cy, sx, sy, s } = this.getLayout();
    if (this.textures.exists('menu_lobby_bg')) {
      this.add.image(cx, cy, 'menu_lobby_bg').setDisplaySize(w, h);
      this.add.rectangle(cx, cy, w, h, 0x000000, 0.34);
    } else {
      this.add.rectangle(cx, cy, w, h, 0x000000);
    }
    this.add.rectangle(cx, cy, w, h, 0x000000);

    const onResize = () => this.scene.restart();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
    });

    // Title
    this.add.text(cx, Math.round(60 * sy), '🐉 三國牌途', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${Math.max(34, Math.round(48 * s))}px`,
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(cx, Math.round(110 * sy), 'Three Kingdoms: Path of Cards', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${Math.max(12, Math.round(16 * s))}px`,
      color: '#9ca3af',
    }).setOrigin(0.5);
    this.createTabs();
    this.contentContainer = this.add.container(cx, Math.round(420 * sy));
    this.renderTab();

    // Spine bridge test instance
    const spineTest = SpineManager.create(this, 'char_caocao', Math.round(230 * sx), Math.round(h - 70 * sy), {
      scale: Math.max(5, 8 * s),
      initialAnimation: 'idle',
    });
    if (spineTest) {
      SpineManager.setSpeed(spineTest, 1.35);
    }
    if (!spineTest) {
      this.add.text(Math.round(180 * sx), Math.round(560 * sy), 'Spine test failed (char_caocao)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ff9999',
      }).setOrigin(0.5);
    }
  }

  private createTabs(): void {
    const { cx, sy, s } = this.getLayout();
    const tabs: { id: 'prelude' | 'roguelike' | 'chronicle'; label: string }[] = [
      { id: 'prelude', label: '📜 Prelude' },
      { id: 'roguelike', label: '⚔️ Roguelike' },
      { id: 'chronicle', label: '🌍 Chronicle' },
    ];
    const tabSpacing = Math.round(240 * s);
    const tabWidth = Math.round(200 * s);
    const tabHeight = Math.round(40 * s);
    const baseX = cx - tabSpacing;
    const y = Math.round(170 * sy);

    for (let index = 0; index < tabs.length; index++) {
      const tab = tabs[index];
      const x = baseX + index * tabSpacing;
      const isActive = this.currentTab === tab.id;

      this.add.rectangle(x, y, tabWidth, tabHeight, isActive ? 0x111111 : 0x000000, 1)
        .setStrokeStyle(2, isActive ? 0xffffff : 0x333333);

      this.add.text(x, y, tab.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.max(12, Math.round(14 * s))}px`,
        color: isActive ? '#ffffff' : '#aaaaaa',
      }).setOrigin(0.5);

      this.add.rectangle(x, y, tabWidth, tabHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.currentTab = tab.id;
          this.scene.restart();
        });
    }
  }

  private renderTab(): void {
    this.contentContainer.removeAll(true);

    switch (this.currentTab) {
      case 'prelude':
        this.renderPreludeTab();
        break;
      case 'roguelike':
        this.renderRoguelikeTab();
        break;
      case 'chronicle':
        this.renderChronicleTab();
        break;
    }
  }

  private renderPreludeTab(): void {
    const { s } = this.getLayout();
    const characterIds: CharacterId[] = ['caocao', 'liubei', 'sunquan'];
    const buttonWidth = Math.round(280 * s);
    const buttonHeight = Math.round(100 * s);
    const gap = Math.round(20 * s);
    const startX = -(buttonWidth + gap);

    characterIds.forEach((charId, index) => {
      const char = getCharacter(charId);
      if (!char) return;

      const x = startX + index * (buttonWidth + gap);
      const y = 0;
      const unlocked = RunManager.isCharacterUnlocked(charId);

      const color = charId === 'caocao' ? 0xcc3333 : charId === 'liubei' ? 0xddaa33 : 0x3366cc;
      const container = this.add.container(x + buttonWidth / 2, y);

      const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, color, 0.8)
        .setStrokeStyle(2, 0xffffff);

      const charEmoji = EMOJI[charId as keyof typeof EMOJI] ?? '🧑';
      const label = this.add.text(0, -20, `${charEmoji} ${char.displayName}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.max(12, Math.round(16 * s))}px`,
        color: '#ffffff',
      }).setOrigin(0.5);

      const statusText = this.add.text(0, 10, unlocked ? '✅ Unlocked' : '🔒 Locked', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.max(11, Math.round(13 * s))}px`,
        color: unlocked ? '#4ade80' : '#ff9999',
      }).setOrigin(0.5);

      const actionText = this.add.text(0, 32, unlocked ? 'Replay Prelude' : 'Play Prelude', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.max(10, Math.round(11 * s))}px`,
        color: '#dddddd',
      }).setOrigin(0.5);

      container.add([bg, label, statusText, actionText]);
      container.setSize(buttonWidth, buttonHeight);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        bg.setScale(1.03);
        label.setScale(1.03);
      });
      container.on('pointerout', () => {
        bg.setScale(1);
        label.setScale(1);
      });
      container.on('pointerdown', () => {
        this.startPrelude(charId);
      });

      this.contentContainer.add(container);
    });
  }

  private renderRoguelikeTab(): void {
    const { s } = this.getLayout();
    const characterIds: CharacterId[] = ['caocao', 'liubei', 'sunquan'];
    const buttonWidth = Math.round(280 * s);
    const buttonHeight = Math.round(100 * s);
    const gap = Math.round(20 * s);
    const startX = -(buttonWidth + gap);

    characterIds.forEach((charId, index) => {
      const char = getCharacter(charId);
      if (!char) return;

      const x = startX + index * (buttonWidth + gap);
      const y = 0;
      const unlocked = RunManager.isCharacterUnlocked(charId);

      const color = charId === 'caocao' ? 0xcc3333 : charId === 'liubei' ? 0xddaa33 : 0x3366cc;
      const container = this.add.container(x + buttonWidth / 2, y);

      const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, color, unlocked ? 0.8 : 0.3)
        .setStrokeStyle(2, unlocked ? 0xffffff : 0x666666);

      const charEmoji = EMOJI[charId as keyof typeof EMOJI] ?? '🧑';
      const label = this.add.text(0, -10, `${charEmoji} ${char.displayName}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.max(12, Math.round(16 * s))}px`,
        color: unlocked ? '#ffffff' : '#888888',
      }).setOrigin(0.5);

      const sub = this.add.text(0, 20, unlocked ? 'Start Run' : 'Complete Prelude to unlock', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.max(10, Math.round(12 * s))}px`,
        color: unlocked ? '#dddddd' : '#666666',
      }).setOrigin(0.5);

      container.add([bg, label, sub]);
      container.setSize(buttonWidth, buttonHeight);

      if (unlocked) {
        container.setInteractive({ useHandCursor: true });
        container.on('pointerover', () => {
          bg.setScale(1.03);
          label.setScale(1.03);
        });
        container.on('pointerout', () => {
          bg.setScale(1);
          label.setScale(1);
        });
        container.on('pointerdown', () => {
          this.startRun(charId);
        });
      }

      this.contentContainer.add(container);
    });
  }

  private renderChronicleTab(): void {
    const { s } = this.getLayout();
    const save = RunManager.getSaveData();
    const chronicle = save.chronicle;
    const totalRuns = chronicle.length;
    const wins = chronicle.filter((e) => e.result === 'victory').length;
    const losses = totalRuns - wins;

    const lines = [
      `Total Runs: ${totalRuns}`,
      `Victories: ${wins}`,
      `Defeats: ${losses}`,
      `World State: ${save.flags.worldState}`,
      `Unlocked Characters: ${save.unlockedCharacters.length}/3`,
    ];

    lines.forEach((line, index) => {
      const text = this.add.text(0, Math.round(-60 * s) + index * Math.round(30 * s), line, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.max(12, Math.round(16 * s))}px`,
        color: '#e0d6c8',
      }).setOrigin(0.5);
      this.contentContainer.add(text);
    });

    // Unlock all debug button
    const debugBtn = this.add.text(0, Math.round(120 * s), '[Debug] Unlock All Characters', {
      fontFamily: 'monospace',
      fontSize: `${Math.max(10, Math.round(12 * s))}px`,
      color: '#666677',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => debugBtn.setColor('#ffffff'))
      .on('pointerout', () => debugBtn.setColor('#666677'))
      .on('pointerdown', async () => {
        await RunManager.unlockCharacter('caocao', { trait: 'warlord', relic: 'caocao_seal' });
        await RunManager.unlockCharacter('liubei', { trait: 'benevolent', relic: 'liubei_oath_ring' });
        await RunManager.unlockCharacter('sunquan', { trait: 'commander', relic: 'sunquan_imperial_seal' });
        this.scene.restart();
      });
    this.contentContainer.add(debugBtn);
  }

  private startPrelude(characterId: CharacterId): void {
    GameSession.clear();
    this.cameras.main.fadeOut(300, 0x000000);
    this.time.delayedCall(300, () => {
      this.scene.start('PreludeScene', { characterId });
    });
  }

  private startRun(characterId: CharacterId): void {
    GameSession.clear();
    RunManager.startRun(characterId);
    this.cameras.main.fadeOut(300, 0x000000);
    this.time.delayedCall(300, () => {
      this.scene.start('MapScene');
    });
  }
}
