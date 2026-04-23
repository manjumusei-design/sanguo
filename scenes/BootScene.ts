import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { GameDebug } from '../systems/GameDebug';

type PreludeEnemySpineBundle = {
  key: string;
  folder: string;
  pages: string[];
};

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

    //MapNodeSprites
    this.load.image('node_battle', 'assets/Node_battle.png');
    this.load.image('node_elite', 'assets/Node_Elite.png');
    this.load.image('node_event', 'assets/Node_Event.png');
    this.load.image('node_rest', 'assets/Node_Rest.png');
    this.load.image('node_merchant', 'assets/node_merchant.png');
    this.load.image('node_mystery', 'assets/Node_Mystery.png');
    this.load.image('node_treasure', 'assets/Node_Chest.png');
    this.load.image('node_boss', 'assets/Node_Boss.png');
    this.load.image('token_player', 'assets/token_player.png');
    this.load.image('ui_dialogue_parchment', 'assets/Dialogue_background.png');
    this.load.image('menu_lobby_bg', 'assets/MainLobbyArt2.png')\
    this.load.image('node_map_bg', 'assets/Node.map.png');

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

    // ---- Cao Cao Prelude enemy Spine bundles (art intake source) ----
    // Namespaced texture keys avoid collisions for shared page names like `skeleton.png`.
    const preludeEnemyBundles: PreludeEnemySpineBundle[] = [
      {
        key: 'enemy_yellow_turban_warband',
        folder: 'assets/_art_intake/caocao_prelude/03_ENEMIES/yellow_turban_warband',
        pages: ['skeleton.png', 'skeleton2.png', 'skeleton3.png', 'skeleton4.png', 'skeleton5.png', 'skeleton6.png'],
      },
      {
        key: 'enemy_yellow_turban_fanatic',
        folder: 'assets/_art_intake/caocao_prelude/03_ENEMIES/yellow_turban_fanatic',
        pages: [
          'skeleton.png',
          'skeleton2.png',
          'skeleton3.png',
          'skeleton4.png',
          'skeleton5.png',
          'skeleton6.png',
          'skeleton7.png',
          'skeleton8.png',
          'skeleton9.png',
          'skeleton10.png',
          'skeleton11.png',
        ],
      },
      {
        key: 'enemy_imperial_guard',
        folder: 'assets/_art_intake/caocao_prelude/03_ENEMIES/imperial_guard',
        pages: ['skeleton.png'],
      },
      {
        key: 'enemy_rogue_cavalry',
        folder: 'assets/_art_intake/caocao_prelude/03_ENEMIES/rogue_cavalry',
        pages: [
          'skeleton.png',
          'skeleton2.png',
          'skeleton3.png',
          'skeleton4.png',
          'skeleton5.png',
          'skeleton6.png',
          'skeleton7.png',
          'skeleton8.png',
          'skeleton9.png',
          'skeleton10.png',
          'skeleton11.png',
          'skeleton12.png',
          'skeleton13.png',
          'skeleton14.png',
          'skeleton15.png',
          'skeleton16.png',
          'skeleton17.png',
          'skeleton18.png',
          'skeleton19.png',
          'skeleton20.png',
          'skeleton21.png',
          'skeleton22.png',
          'skeleton23.png',
          'skeleton24.png',
          'skeleton25.png',
          'skeleton26.png',
          'skeleton27.png',
          'skeleton28.png',
          'skeleton29.png',
          'skeleton30.png',
          'skeleton31.png',
          'skeleton32.png',
          'skeleton33.png',
          'skeleton34.png',
          'skeleton35.png',
          'skeleton36.png',
          'skeleton37.png',
          'skeleton38.png',
          'skeleton39.png',
          'skeleton40.png',
          'skeleton41.png',
          'skeleton42.png',
          'skeleton43.png',
          'skeleton44.png',
          'skeleton45.png',
          'skeleton46.png',
          'skeleton47.png',
          'skeleton48.png',
          'skeleton49.png',
          'skeleton50.png',
          'skeleton51.png',
          'skeleton52.png',
        ],
      },
      {
        key: 'enemy_dong_zhuo_vanguard',
        folder: 'assets/_art_intake/caocao_prelude/03_ENEMIES/dong_zhuo_vanguard',
        pages: ['skeleton.png', 'skeleton2.png', 'skeleton3.png', 'skeleton4.png', 'skeleton5.png', 'skeleton6.png'],
      },
    ];
    preludeEnemyBundles.forEach((bundle) => {
      this.load.text(`${bundle.key}:json`, `${bundle.folder}/skeleton.json`);
      this.load.text(`${bundle.key}:atlas`, `${bundle.folder}/skeleton.atlas`);
      bundle.pages.forEach((page) => {
        this.load.image(`${bundle.key}:${page}`, `${bundle.folder}/${page}`);
      });
    });

    // ---- Prelude character backgrounds (Act 1, static images) ----
    // Expected files:
    //   public/assets/backgrounds/prelude_wei.png
    //   public/assets/backgrounds/prelude_shu.png
    //   public/assets/backgrounds/prelude_wu.png
    this.load.image('prelude_bg_wei', 'assets/backgrounds/prelude_wei.png');
    this.load.image('prelude_bg_shu', 'assets/backgrounds/prelude_shu.png');
    this.load.image('prelude_bg_wu', 'assets/backgrounds/prelude_wu.png');

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
//THS IS AI GENERTED BOOTSCENE, NOT TOUCHED BY ME, PROBABLY NEEDS SOME TWEAKING
