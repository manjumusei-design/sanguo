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
  private tooltipBg: Phaser.GameObjects.Rectangle;
  private tooltipText: Phaser.GameObjects.Text;
  private intentHelpText = '';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y).setDepth(85);
    this.bg = scene.add.graphics();
    this.container.setSize(110, 36);
    this.container.setInteractive({ useHandCursor: true });
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

    this.tooltipBg = scene.add.rectangle(x, y - 48, 220, 56, 0x14111a, 0.95)
      .setStrokeStyle(1, 0x8f7647, 0.95)
      .setDepth(200);
    this.tooltipText = scene.add.text(x, y - 48, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#f2dfc1',
      align: 'center',
      wordWrap: { width: 206 },
      lineSpacing: 2,
    }).setOrigin(0.5).setDepth(201);
    this.tooltipBg.setVisible(false);
    this.tooltipText.setVisible(false);

    this.container.on('pointerover', () => this.showTooltip());
    this.container.on('pointerout', () => this.hideTooltip());
    this.hide();
  }

  showIntent(enemy: Enemy): void {
    if (!enemy.intent || (enemy.isIllusion && enemy.isReal !== true)) {
      this.intentHelpText = '';
      this.hide();
      return;
    }

    if (enemy.isIllusion && enemy.isReal && !enemy.statuses.some((status) => status.id === 'revealed')) {
      this.icon.setText('?');
      this.text.setText('Hidden');
      this.intentHelpText = 'Hidden intent. Reveal this illusion to see the next action.';
      this.container.setVisible(true);
      this.pulse();
      return;
    }

    const { icon, text } = this.getIntentVisual(enemy);
    this.icon.setText(icon);
    this.text.setText(text);
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

  private getIntentVisual(enemy: Enemy): { icon: string; text: string } {
    const intent = enemy.intent;
    if (!intent) {
      return { icon: '?', text: '' };
    }

    const damageEffects = intent.effects.filter((effect) => effect.type === 'damage');
    if (damageEffects.length > 1) {
      const perHit = damageEffects[0]?.value ?? intent.value;
      return { icon: EMOJI.attack, text: `${damageEffects.length}x${perHit}` };
    }
    if (damageEffects.length === 1) {
      return { icon: EMOJI.attack, text: `${damageEffects[0]?.value ?? intent.value}` };
    }

    const blockEffect = intent.effects.find((effect) => effect.type === 'block');
    if (blockEffect) {
      return { icon: EMOJI.block, text: `+${blockEffect.value}` };
    }

    const statusEffect = intent.effects.find((effect) => effect.type === 'apply_status' && effect.statusId);
    if (statusEffect?.statusId) {
      return {
        icon: this.getStatusEmoji(statusEffect.statusId),
        text: `${statusEffect.value}`,
      };
    }

    if (intent.type === 'summon') {
      return { icon: '👥', text: 'SUM' };
    }

    if (intent.type === 'draw') {
      return { icon: EMOJI.draw, text: `+${intent.value}` };
    }

    return { icon: '?', text: intent.value > 0 ? `${intent.value}` : (intent.label ?? '') };
  }

  private getStatusEmoji(statusId: StatusId): string {
    const mapped = EMOJI[statusId as keyof typeof EMOJI];
    if (mapped) return mapped;

    const fallbackMap: Partial<Record<StatusId, string>> = {
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
}