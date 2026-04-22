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