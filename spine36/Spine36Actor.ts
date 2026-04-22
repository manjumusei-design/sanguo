import Phaser from 'phaser';
import type { Spine36AssetBinding, Spine36RuntimeProbe } from './types';

export class Spine36Actor {
  readonly binding: Spine36AssetBinding;
  readonly container: Phaser.GameObjects.Container;
  readonly fallbackText: Phaser.GameObjects.Text;
  private currentSlot: string;

  constructor(
    scene: Phaser.Scene,
    binding: Spine36AssetBinding,
    x: number,
    y: number,
    fallbackLabel: string,
    runtimeProbe?: Spine36RuntimeProbe
  ) {
    this.binding = binding;
    this.currentSlot = 'ready';
    this.container = scene.add.container(x, y);
    this.fallbackText = scene.add.text(0, -12, fallbackLabel, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '64px',
    }).setOrigin(0.5);

    this.container.add(this.fallbackText);
    this.container.setData('spine36Binding', binding);
    this.container.setData('spine36CurrentSlot', this.currentSlot);
    this.container.setData('spine36RuntimeReady', runtimeProbe?.status === 'ready');
    this.container.setData('spine36RuntimeStatus', runtimeProbe?.status ?? 'unknown');
    this.container.setData('spine36RuntimeMessage', runtimeProbe?.message ?? '');
  }

  play(slot: keyof Spine36AssetBinding['animations']): void {
    this.currentSlot = slot;
    this.container.setData('spine36CurrentSlot', slot);
  }

  destroy(): void {
    this.container.destroy();
  }
}
