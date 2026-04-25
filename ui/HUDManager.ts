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

  // Card pile
  private drawPileContainer!: Phaser.GameObjects.Container;
  private drawPileCountText!: Phaser.GameObjects.Text;
  private discardPileContainer!: Phaser.GameObjects.Container;
  private discardPileCountText!: Phaser.GameObjects.Text;
  private onDrawClick?: () => void;

  // Relic rack
  private relicContainer!: Phaser.GameObjects.Container;
  private relicItems: Phaser.GameObjects.Container[] = [];

  // Power display
  private powerContainer!: Phaser.GameObjects.Container;
  private powerTexts: Phaser.GameObjects.Text[] = [];

  // Status display
  private statusContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private lastEnergy = 3;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    this.createTopBar();
    this.createQiOrb();
    this.createPileDisplays();
    this.createRelicRack();
    this.createPowerDisplay();
    this.createStatusDisplay();
  }
  private createTopBar(): void {
    this.topBar = this.scene.add.container(0, 0).setDepth(120);
    this.topBarBg = this.scene.add.graphics();
  }

//Energy orb rendering 
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

    //Energy text
    this.qiText = this.scene.add.text(0, 0, `${EMOJI.energy} 3`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.qiOrb.add(this.qiText);
  }

  updateEnergy(current: number): void {
    this.qiText.setText(`${EMOJI.energy} ${current}`);

  

ddfdf











// Hp Bar rendering

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
      this.hpBarHeigh t,
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
    )).setOrigin(0.5);

    this.blockText = this.scene.add.text(x + thhis.hpBarWidth / 2_52, , '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px'
      color: '#9fdcff',
      backgroundColor: '#1b3142',
      padding: { x:10, y: 4},
    }).setOrigin(0.5);

    this.topBar.add([this.hpBarBg, this hpFill, this.hpText, this.blockText]);
    }

     updateHP(current: number, max: number): void {
      void current;
      void max;
      return;
     }

  updateHP_legacy(current: number, max: number): void {
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

    this.hpText.setText(`${current} / ${max}`);
  }

  updateBlock(current: number): void {
    void current;
    return;
  }

  updateBlock_legacy(current: number): void {
    if (current > 0) {
      this.blockText.setText(`${EMOJI.block} ${current}`);
      this.blockText.setVisible(true);
    } else {
      this.blockText.setVisible(false);
    }
  }

  //Draw pile
  private createPileDisplays(): void {
    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;

    //Draw
    this.drawPileContainer = this.scene.add.container(Math.round(sw * 0.16), Math.round(sh * 0.90)).setDepth(100);
    const deckBase = this.scene.add.rectangle(0, 0, 56, 76, 0x3b82f6, 0.8)
      .setStrokeStyle(2,0x60a5fa);
    const deckLabel = this.scene.add.text(0, -20, 'Draw', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px'
      color: '#ffffff',
    }).setOrigin(0.5);
    this.drawPileCountText = this.scene.add.text(0, 4, '0', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    const deckSub =  this.scene.add.text(0, 24,'Draw', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.drawPileContainer.add([deckBase, deckLabel, this.drawPileCountText, deckSub]);

    // Discard pile UI that is intentionally hidden for mechanics reasons
    this.discardPileContainer = this.scene.add.container(Math.round(sw * 0.85), Math.round(sh * 0.88)).setDepth(100);
    const discardBase = this.scene.add.rectangle(0, 0, 56, 76, 0x7f1d1d, 0.8)
      .setStrokeStyle(2, 0xf87171);
    const discardLabel = this.scene.add.text(0, -20, 'Discard', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#fee2e2',
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
    this.discardPileContainer.setVisible(false);
  }

  setOnDrawClick(callback: () => void): void {
    this.onDrawClick = callback;
  }

  updatePiles(drawCount: number, discardCount: number): void {
    this.drawPileCountText.setText(`${drawCount}`);
    if (this.discardPileCountText) {
      this.discardPileCountText.setText(`${discardCount}`);
    }
  }

// Relic unfinished

private createRelicRack(): void {
  this.relicContainer = this.scene.add.container(0,0).setDepth(121).setVisible(false);
  this.relicItems = [];
}

private createPowerDisplay(): void {
  this.powerContainer = this.scene.add.container (0,0).setDepth(121).setVisible(false);
  this.powerTexts = [];
}

updateRelics(relics: Relic[]): void {
  void relics;
  return;
}

updatePowers(powers: PowerInstance[]): void {
  void powers;
  return;
}

//Status
  private createStatusDisplay(): void {
    this.statusContainer = this.scene.add.container(0, 0).setDepth(121).setVisible(false);
    this.statusText = this.scene.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#ffdfdf',
      wordWrap: { width: 300 },
    });
    this.statusContainer.add(this.statusText);
  }

  updateStatuses(statuses: Status[]): void {
    void statuses;
    return;
  }
}