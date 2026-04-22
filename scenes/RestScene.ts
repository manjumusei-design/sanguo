import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { createStatus } from '../combat/StatusSystem';

type RestMode = 'root' | 'drill' | 'meditate' | 'reorganize';

export class RestScene extends Phaser.Scene {
  private mode: RestMode = 'root';
  private optionContainers: Phaser.GameObjects.Container[] = [];
  private messageText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'RestScene' });
  }

  create(): void {
    if (!RunManager.getRunState()) {
      this.scene.start('MenuScene');
      return;
    }
    this.scene.launch('HUDScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('HUDScene');
    });
    this.renderRoot();
  }