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

  private clearOptions(): void {
    this.children.removeAll(true);
    this.optionContainers = [];
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    this.add.rectangle(cx, Math.round(h / 2), w, h, 0x000000);
    this.add.text(cx, 70, '🏕️ Rest Site', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '34px',
      color: '#ff9955',
    }).setOrigin(0.5);
    this.add.text(cx, 112, 'Recover, refine the deck, or prepare the next battle.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#cbd5e1',
    }).setOrigin(0.5);
    this.messageText = this.add.text(cx, h - 80, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#4ade80',
    }).setOrigin(0.5);
  }

  private renderRoot(): void {
    this.mode = 'root';
    this.clearOptions();
  }