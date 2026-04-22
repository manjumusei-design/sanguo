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