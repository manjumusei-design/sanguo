import Phaser from 'phaser';
import { EMOJI } from '../data/emoji';
import type { Enemy, StatusId } from '../types';
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
    this.bg.fillRoundedRect(-52, -16, 104, 32, 12);
    this.bg.lineStyle(2, 0x8f7647, 0.95);
    this.bg.strokeRoundedRect(-52, -16, 104, 32, 12);
    this.container.add(this.bg);

    this.icon = scene.add.text(-26, 0, '', {
      fontSize: '18px',
    }).setOrigin(0.5);
    this.container.add(this.icon);

    this.text = scene.add.text(-12, 0, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
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