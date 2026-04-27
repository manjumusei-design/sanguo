import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';

export class GameOverScene extends Phaser.Scene {
  private summary: {
    character: string;
    act: number;
    hp: number;
    maxHp: number;
    gold: number;
    deckCount: number;
    relicCount: number;
  } | null = null;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { source?: string; characterId?: string }): void {
    // If in run mode, record defeat
    if (data.source !== 'prelude') {
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
        };
        RunManager.endRun('defeat', run.act);
      }
    }
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);
    const sy = h / 720;

    this.add.rectangle(cx, cy, w, h, 0x000000);

    this.add.text(cx, 280 * sy, '💀 Defeat', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '48px',
      color: '#ff6b6b',
    }).setOrigin(0.5);

    this.add.text(cx, 360 * sy, 'Your journey ends here.', {
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
        this.cameras.main.fadeOut(400, 0x000000);
        this.time.delayedCall(400, () => this.scene.start('MenuScene'));
      });
  }
}
