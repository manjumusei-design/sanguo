import Phaser from 'phaser';
import { EMOJI } from '../data/emoji';
import type { Enemy } from '../types';
import { TWEEN } from './TweenConfig';

export class IntentDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private icon: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y).setDepth(85);
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x1b1623, 0.96);
    this.bg.fillRoundedRect(-54, -18, 108, 36, 14);
    this.bg.lineStyle(2, 0x8f7647, 0.95);
    this.bg.strokeRoundedRect(-54, -18, 108, 36, 14);
    this.container.add(this.bg);

    this.icon = scene.add.text(-30, 0, '', {
      fontSize: '18px',
    }).setOrigin(0.5);
    this.container.add(this.icon);

    this.text = scene.add.text(-16, 0, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#f6d8a7',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.container.add(this.text);
    this.hide();
  }

  showIntent(enemy: Enemy): void {
    if (!enemy.intent || (enemy.isIllusion && enemy.isReal !== true)) {
      this.hide();
      return;
    }

    if (enemy.isIllusion && enemy.isReal && !enemy.statuses.some((status) => status.id === 'revealed')) {
      this.icon.setText('?');
      this.text.setText('Hidden');
      this.container.setVisible(true);
      this.pulse();
      return;
    }

    const intent = enemy.intent;
    let icon = '?';
    let desc = intent.label ?? '';

    switch (intent.type) {
      case 'damage':
        icon = EMOJI.attack;
        desc = intent.label ?? `Attack ${intent.value}`;
        break;
      case 'block':
        icon = EMOJI.block;
        desc = intent.label ?? `Defend ${intent.value}`;
        break;
      case 'draw':
        icon = EMOJI.draw;
        desc = intent.label ?? `Draw ${intent.value}`;
        break;
      case 'summon':
        icon = '+';
        desc = intent.label ?? 'Summon';
        break;
      default:
        icon = '?';
        desc = intent.label ?? 'Unknown';
        break;
    }

    this.icon.setText(icon);
    this.text.setText(desc);
    this.container.setVisible(true);
    this.pulse();
  }

  hide(): void {
    this.container.setVisible(false);
  }

  clear(): void {
    this.hide();
  }

  destroy(): void {
    this.container.destroy();
  }

  private pulse(): void {
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: TWEEN.intentPulse.duration,
      yoyo: true,
      repeat: 1,
      ease: TWEEN.intentPulse.ease,
    });
  }
}
