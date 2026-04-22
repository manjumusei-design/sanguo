import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { GameDebug } from '../systems/GameDebug';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    const graphics = this.add.graphics();
    graphics.fillStyle(0x6b6375, 1);
    graphics.fillRect(0, 0, w, h);

    const loadingText = this.add.text(cx, cy, 'Loading...', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // ---- Map node sprites ----
    this.load.image('node_battle', 'assets/Node_battle.png');
    this.load.image('node_elite', 'assets/Node_Elite.png');
    this.load.image('node_event', 'assets/Node_Event.png');
    this.load.image('node_rest', 'assets/Node_Rest.png');
    this.load.image('node_merchant', 'assets/node_merchant.png');
    this.load.image('node_mystery', 'assets/Node_Mystery.png');
    this.load.image('node_treasure', 'assets/Node_Chest.png');
    this.load.image('node_boss', 'assets/Node_Boss.png');
    this.load.image('token_player', 'assets/token_player.png');

    // ---- Spine 2D animation placeholders ----
    // Stage test assets are pointed to the dedicated caocao folder.
    this.load.text('char_caocao:json', 'assets/spine/caocao/skeleton.json');
    this.load.text('char_caocao:atlas', 'assets/spine/caocao/skeleton.atlas');
    this.load.image('skeleton.png', 'assets/spine/caocao/skeleton.png');
    this.load.image('skeleton2.png', 'assets/spine/caocao/skeleton2.png');
    this.load.image('skeleton3.png', 'assets/spine/caocao/skeleton3.png');
    this.load.image('skeleton4.png', 'assets/spine/caocao/skeleton4.png');
    this.load.image('skeleton5.png', 'assets/spine/caocao/skeleton5.png');
    this.load.image('skeleton6.png', 'assets/spine/caocao/skeleton6.png');

    // ---- Prelude character backgrounds (Act 1) ----
    this.load.video('prelude_bg_wei', 'assets/videos/WeiBackgroundAct1+Prelude.mp4', true);
    this.load.video('prelude_bg_shu', 'assets/videos/ShuBackgroundAct1+Prelude.mp4', true);
    this.load.video('prelude_bg_wu', 'assets/videos/WuBackgroundAct1+Prelude.mp4', true);

    this.load.on('complete', () => {
      loadingText.setText('Ready');
    });

    // Initialize save system
    RunManager.init().then(() => {
      if (import.meta.env.DEV) {
        GameDebug.init();
        GameDebug.setSceneContext('BootScene', () => ({
          save: 'initialized',
          hasRun: Boolean(RunManager.getRunState()),
        }));
      }
      this.time.delayedCall(300, () => {
        this.scene.start('MenuScene');
      });
    });
  }

  create(): void {
    // Boot complete
  }
}
