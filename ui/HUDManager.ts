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