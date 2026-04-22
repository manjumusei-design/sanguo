import Phaser from 'phaser';
import { EMOJI } from '../data/emoji';
import type { PowerInstance, Status, Relic } from '../types';
import { TWEEN } from './TweenConfig';

export class HUDManager {
  private scene: Phaser.Scene;
  private topBar!: Phaser.GameObjects.Container;
  private topBarBg!: Phaser.GameObjects.Graphics;


  private qiOrb!: Phaser.GameObjects.Container;
  private qiText!: Phaser.GameObjects.Text;

  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpFill!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private blockText!: Phaser.GameObjects.Text;
  private hpBarWidth = 220;
  private hpBarHeight = 24;

  private drawPileContainer!: Phaser.GameObjects.Container;
  private drawPileCountText!: Phaser.GameObjects.Text;
  private discardPileContainer!: Phaser.GameObjects.Container;
  private discardPileCountText!: Phaser.GameObjects.Text;
  private onDrawClick?: () => void;

  private relicContainer!: Phaser.GameObjects.Container;
  private relicItems: Phaser.GameObjects.Container[] = [];

  private powerContainer!: Phaser.GameObjects.Container;
  private powerTexts: Phaser.GameObjects.Text[] = [];

  private statusContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;

  private lastEnergy = 3;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }


  create(): void {
    this.createTopBar();
    this.createQiOrb();
    this.createHPBlock();
    this.createPileDisplays();
    this.createRelicRack();
    this.createPowerDisplay();
    this.createStatusDisplay();
  }

  private createTopBar(): void {
    const sw = this.scene.scale.width;
    this.topBar = this.scene.add.container(0, 0).setDepth(120);
    this.topBarBg = this.scene.add.graphics();
    this.topBarBg.fillStyle(0x120f1c, 0.92);
    this.topBarBg.fillRoundedRect(18, 14, sw - 36, 136, 18);
    this.topBarBg.lineStyle(2, 0x7a5f39, 0.9);
    this.topBarBg.strokeRoundedRect(18, 14, sw - 36, 136, 18);
    this.topBar.add(this.topBarBg);
  }

  private createQiOrb(): void {
    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;
    const x = Math.round(sw * 0.18);
    const y = Math.round(sh * 0.90);

    this.qiOrb = this.scene.add.container(x, y).setDepth(100);

    const orb = this.scene.add.circle(0, 0, 32, 0x2d8a4e, 0.9)
      .setStrokeStyle(2, 0x4ade80);
    this.qiOrb.add(orb);

    const glow = this.scene.add.circle(0, 0, 22, 0x4ade80, 0.3);
    this.qiOrb.add(glow);

    this.qiText = this.scene.add.text(0, 0, `${EMOJI.energy} 3`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.qiOrb.add(this.qiText);
  }

  updateEnergy(current: number): void {
    this.qiText.setText(`${EMOJI.energy} ${current}`);

    if (current !== this.lastEnergy) {
      this.scene.tweens.add({
        targets: this.qiOrb,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: TWEEN.pulse.duration,
        yoyo: true,
        ease: TWEEN.pulse.ease,
      });
      this.lastEnergy = current;
    }
  }

  private createHPBlock(): void {
    const sw = this.scene.scale.width;
    const x = Math.round(sw * 0.18);
    const y = 49;

    this.hpBarBg = this.scene.add.graphics();
    this.hpBarBg.fillStyle(0x241d2b, 1);
    this.hpBarBg.fillRoundedRect(
      x - this.hpBarWidth / 2,
      y - this.hpBarHeight / 2,
      this.hpBarWidth,
      this.hpBarHeight,
      this.hpBarHeight / 2
    );
    this.hpBarBg.lineStyle(2, 0xb58f58, 1);
    this.hpBarBg.strokeRoundedRect(
      x - this.hpBarWidth / 2,
      y - this.hpBarHeight / 2,
      this.hpBarWidth,
      this.hpBarHeight,
      this.hpBarHeight / 2
    );

    this.hpFill = this.scene.add.graphics();

    this.hpText = this.scene.add.text(x, y, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.blockText = this.scene.add.text(x + this.hpBarWidth / 2 + 52, y, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#9fdcff',
      backgroundColor: '#1b3142',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5);

    this.topBar.add([this.hpBarBg, this.hpFill, this.hpText, this.blockText]);
  }

  updateHP(current: number, max: number): void {
    const ratio = Phaser.Math.Clamp(current / max, 0, 1);
    const fillWidth = Math.max(0, Math.round(this.hpBarWidth * ratio));
    const color = ratio > 0.3 ? 0xff6b6b : 0xff0000;

    this.hpFill.clear();
    if (fillWidth > 0) {
      this.hpFill.fillStyle(color, 1);
      this.hpFill.fillRoundedRect(
        Math.round(this.hpText.x - this.hpBarWidth / 2),
        Math.round(this.hpText.y - this.hpBarHeight / 2),
        fillWidth,
        this.hpBarHeight,
        Math.min(this.hpBarHeight / 2, fillWidth / 2)
      );
    }

    this.hpText.setText(`${current}/${max}`);
  }

  updateBlock(current: number): void {
    if (current > 0) {
      this.blockText.setText(`${EMOJI.block} ${current}`);
      this.blockText.setVisible(true);
    } else {
      this.blockText.setVisible(false);
    }
  }


  private createPileDisplays(): void {
    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;

    // Draw pile button (bottom-right)
    this.drawPileContainer = this.scene.add.container(Math.round(sw * 0.92), Math.round(sh * 0.88)).setDepth(100);
    const deckBase = this.scene.add.rectangle(0, 0, 56, 76, 0x3b82f6, 0.8)
      .setStrokeStyle(2, 0x60a5fa)
      .setInteractive({ useHandCursor: true });
    const deckLabel = this.scene.add.text(0, -20, `${EMOJI.draw_phase}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
    }).setOrigin(0.5);
    this.drawPileCountText = this.scene.add.text(0, 4, '0', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#ffffff',
    }).setOrigin(0.5);
    const deckSub = this.scene.add.text(0, 24, 'Draw', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#bfdbfe',
    }).setOrigin(0.5);

    this.drawPileContainer.add([deckBase, deckLabel, this.drawPileCountText, deckSub]);

    deckBase.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: this.drawPileContainer,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 80,
        yoyo: true,
      });
      this.onDrawClick?.();
    });

    // Discard pile (bottom-right, left of draw)
    this.discardPileContainer = this.scene.add.container(Math.round(sw * 0.85), Math.round(sh * 0.88)).setDepth(100);
    const discardBase = this.scene.add.rectangle(0, 0, 56, 76, 0x7f1d1d, 0.8)
      .setStrokeStyle(2, 0xf87171);
    const discardLabel = this.scene.add.text(0, -20, `${EMOJI.discard}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
    }).setOrigin(0.5);
    this.discardPileCountText = this.scene.add.text(0, 4, '0', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#ffffff',
    }).setOrigin(0.5);
    const discardSub = this.scene.add.text(0, 24, 'Discard', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#fecaca',
    }).setOrigin(0.5);
    this.discardPileContainer.add([discardBase, discardLabel, this.discardPileCountText, discardSub]);
  }

  setOnDrawClick(callback: () => void): void {
    this.onDrawClick = callback;
  }

  updatePiles(drawCount: number, discardCount: number): void {
    this.drawPileCountText.setText(`${drawCount}`);
    this.discardPileCountText.setText(`${discardCount}`);
  }


  private createRelicRack(): void {
    const sw = this.scene.scale.width;
    this.relicContainer = this.scene.add.container(Math.round(sw * 0.50), 49).setDepth(121);
    this.topBar.add(this.relicContainer);
    this.relicItems = [];
  }

  private createPowerDisplay(): void {
    this.powerContainer = this.scene.add.container(34, 96).setDepth(121);
    this.topBar.add(this.powerContainer);
    this.powerTexts = [];
  }

  updateRelics(relics: Relic[]): void {
    for (const item of this.relicItems) {
      item.destroy();
    }
    this.relicItems = [];

    const visible = relics.slice(0, 6);
    let xOffset = 0;

    visible.forEach((relic) => {
      const width = Math.min(150, Math.max(92, relic.name.length * 7 + 28));
      const item = this.scene.add.container(xOffset, 0);
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x2a2234, 0.96);
      bg.fillRoundedRect(0, -16, width, 32, 12);
      bg.lineStyle(2, 0xb58f58, 0.95);
      bg.strokeRoundedRect(0, -16, width, 32, 12);
      const icon = this.scene.add.text(16, 0, EMOJI.relic, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#f0c060',
      }).setOrigin(0.5);
      const text = this.scene.add.text(30, 0, relic.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#f0c060',
      }).setOrigin(0, 0.5);
      item.add([bg, icon, text]);
      this.relicContainer.add(item);
      this.relicItems.push(item);
      xOffset += width + 10;
    });

    if (relics.length > visible.length) {
      const extra = this.scene.add.text(xOffset, 0, `+${relics.length - visible.length}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#cdb78a',
      }).setOrigin(0, 0.5);
      this.relicContainer.add(extra);
      this.relicItems.push(extra as unknown as Phaser.GameObjects.Container);
    }
  }

  updatePowers(powers: PowerInstance[]): void {
    for (const text of this.powerTexts) {
      text.destroy();
    }
    this.powerTexts = [];

    powers.slice(0, 5).forEach((power, index) => {
      const text = this.scene.add.text(0, index * 24, `${EMOJI.power} ${power.name}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#86efac',
      });
      this.powerContainer.add(text);
      this.powerTexts.push(text);
    });
  }


  private createStatusDisplay(): void {
    this.statusContainer = this.scene.add.container(34, 132).setDepth(121);
    this.topBar.add(this.statusContainer);
    this.statusText = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#ffdfdf',
      wordWrap: { width: 300 },
    });
    this.statusContainer.add(this.statusText);
  }

  updateStatuses(statuses: Status[]): void {
    if (statuses.length === 0) {
      this.statusText.setText('');
      return;
    }

    const lines = statuses.map((s) => {
      const emoji = EMOJI[s.id as keyof typeof EMOJI] ?? '❓';
      return `${emoji} ${s.name} (${s.stacks})`;
    });
    this.statusText.setText(lines.join('\n'));
  }
}
