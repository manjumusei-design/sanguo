import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';

export class VictoryScene extends Phaser.Scene {
  private summary: {
    character: string;
    act: number;
    hp: number;
    maxHp: number;
    gold: number;
    deckCount: number;
    relicCount: number;
    seed: string;
  } | null = null;

  constructor() {
    super({ key: 'VictoryScene' });
  }