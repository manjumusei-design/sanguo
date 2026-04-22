import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { source?: string; characterId?: string }): void {
    // If in run mode, record defeat
    if (data.source !== 'prelude') {
      const run = RunManager.getRunState();
      if (run) {
        RunManager.endRun('defeat', run.act);
      }
    }
  }