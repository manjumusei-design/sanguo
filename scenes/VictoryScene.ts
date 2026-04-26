import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';

export class VictoryScene extends Phaser.Scene {
  private summary: {
    character: string;
    act: number;
    hp: number;
    maxHp: number;
    gold: number;
    deckCount: number;
    relicCount: number;
    seed: string;
  } | null = null;

  private getFactionColor(character: string): string {
    switch (character.toLowerCase()) {
      case 'caocao': return '#ff6b6b';
      case 'liubei': return '#f0d5a3';
      case 'sunquan': return '#5dade2';
      default: return '#ffffff';
    }
  }

  constructor() {
    super({ key: 'VictoryScene' });
  }

  init(): void {
    const run = RunManager.getRunState();
    if (run) {
      this.summary = {
        character: run.character,
        act: run.act,
        hp: run.hp,
        maxHp: run.maxHp,
        gold: run.gold,
        deckCount: run.deck.length,
        relicCount: run.relics.length,
        seed: run.seed,
      };
      RunManager.endRun('victory', run.act);
    }
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w * 0.5);
    const cy = Math.round(h * 0.5);
    const panelPadding = Math.max(16, Math.round(Math.min(w, h) * 0.02));
    const panelW = Math.min(1080, Math.max(720, w - panelPadding * 2));
    const panelH = Math.min(780, Math.max(520, h - panelPadding * 2));
    const panelTop = cy - panelH * 0.5;
    const headerY = panelTop + 52;
    const bodyStartY = panelTop + 116;
    const footerY = panelTop + panelH - 74;
    let cardGap = 18;
    const rowY = bodyStartY + 32;
    let cardW = Math.floor((panelW - 64 - cardGap * 2) / 3);
    if (cardW < 160) {
      cardGap = 10;
      cardW = Math.floor((panelW - 64 - cardGap * 2) / 3);
    }
    let cardH = Math.max(120, Math.round(panelH * 0.2));
    if (footerY - 86 < rowY + cardH * 2 + 28) {
      cardH = Math.max(100, Math.round(cardH * 0.9));
    }

    this.add.rectangle(cx, cy, w, h, 0x15111c);
    this.add.rectangle(cx, cy, panelW, panelH, 0x201928, 0.98)
      .setStrokeStyle(3, 0xb58f58, 0.95);
    this.add.rectangle(cx, panelTop + 86, panelW - 56, 2, 0xd8b06a, 0.75);

    this.add.text(cx, headerY, 'Victory', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${Math.max(30, Math.round(panelW * 0.04))}px`,
      color: '#f0d5a3',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, headerY + 34, 'Campaign complete. Rewards and state have been recorded.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${Math.max(14, Math.round(panelW * 0.015))}px`,
      color: '#baa98d',
    }).setOrigin(0.5);

    if (this.summary) {
      const cardStartX = cx - panelW * 0.5 + 32 + cardW * 0.5;
      const factionColor = this.getFactionColor(this.summary.character);
      this.createSummaryCard(cardStartX, rowY, cardW, cardH, 'Character', this.summary.character.toUpperCase(), factionColor, 0x1a0f0f);
      this.createSummaryCard(cardStartX + cardW + cardGap, rowY, cardW, cardH, 'Act Cleared', `Act ${this.summary.act}`, '#f0d5a3', 0x1a1710);
      this.createSummaryCard(
        cardStartX + (cardW + cardGap) * 2,
        rowY,
        cardW,
        cardH,
        'Health',
        `${this.summary.hp}/${this.summary.maxHp}`,
        '#e6e6e6',
        0x0f0f0f
      );

      this.createSummaryCard(cardStartX, rowY + cardH + 14, cardW, cardH, 'Gold', `${this.summary.gold}`, '#f0d0a0', 0x1a1710);
      this.createSummaryCard(cardStartX + cardW + cardGap, rowY + cardH + 14, cardW, cardH, 'Deck Size', `${this.summary.deckCount}`, '#e0e0e0', 0x0f0f0f);
      this.createSummaryCard(cardStartX + (cardW + cardGap) * 2, rowY + cardH + 14, cardW, cardH, 'Relics', `${this.summary.relicCount}`, '#f5f5f5', 0x0f0f0f);
    } else {
      this.add.text(cx, bodyStartY + 60, 'No run summary available.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.max(14, Math.round(panelW * 0.015))}px`,
        color: '#d6c7b2',
      }).setOrigin(0.5);
    }

    const seedLabel = this.summary?.seed ?? 'n/a';
    const seedY = footerY - 86;
    this.add.text(cx, seedY, `Seed: ${seedLabel}`, {
      fontFamily: 'system-ui, sans-serif',
      color: '#9f937f',
      wordWrap: { width: panelW - 80 },
      align: 'center',
    }).setOrigin(0.5);


        const copyBtn = this.add.text(cx, seedY + 28, '📋 Copy Seed', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#8a7e6b',
      backgroundColor: '#1d1d1d',
      padding: { x: 12, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => copyBtn.setStyle({ color: '#f0d5a3' }))
      .on('pointerout', () => copyBtn.setStyle({ color: '#8a7e6b' }))
      .on('pointerdown', () => {
        if (this.summary?.seed) {
          navigator.clipboard?.writeText(this.summary.seed).then(() => {
            copyBtn.setText('Copied!');
            this.time.delayedCall(1200, () => copyBtn.setText('📋 Copy Seed'));
          }).catch(() => {
            copyBtn.setText('Copy failed');
            this.time.delayedCall(1200, () => copyBtn.setText('📋 Copy Seed'));
          });
        }
      });

    const continueBtn = this.add.text(cx - 120, footerY, 'Continue', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#fff8ea',
      backgroundColor: '#6a4e31',
      padding: { x: 26, y: 11 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => continueBtn.setScale(1.04))
      .on('pointerout', () => continueBtn.setScale(1))
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(400, 0x000000);
        this.time.delayedCall(400, () => this.scene.start('MenuScene'));
      });

    const skipBtn = this.add.text(cx + 120, footerY, 'Skip', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#e4d7c1',
      backgroundColor: '#4f3e2e',
      padding: { x: 26, y: 11 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => skipBtn.setScale(1.04))
      .on('pointerout', () => skipBtn.setScale(1))
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(400, 0x000000);
        this.time.delayedCall(400, () => this.scene.start('MenuScene'));
      });

    this.input.keyboard?.on('keydown-ENTER', () => continueBtn.emit('pointerdown'));
    this.input.keyboard?.on('keydown-ESC', () => skipBtn.emit('pointerdown'));
  }

  private createSummaryCard(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
    valueColor: string,
    bgColor = 0x0f0f0f
  ): void {
    this.add.rectangle(x, y, width, height, bgColor, 0.95).setStrokeStyle(2, 0x7f7f7f, 0.9);
    this.add.text(x, y - 26, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#bdbdbd',
    }).setOrigin(0.5);
    this.add.text(x, y + 10, value, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      color: valueColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }
}
