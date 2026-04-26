import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { allCards } from '../data/cards';
import { resolveCentralizedRelicToken } from '../data/story/centralized';

interface StoryBeat {
  id: string;
  type?: string;
  title: string;
  body: string[];
  choices: string[];
  enemy?: string;
  boss?: string;
  rewardOverride?: {
    cardOptions?: string[];
    relicId?: string;
    relicOptions?: string[];
    noCard?: boolean;
    noRelic?: boolean;
  };
  choiceRewards?: Array<unknown>;
  flagsSetByChoice?: Array<Record<string, boolean> | null>;
    choiceEncounterOverrides?: Array<{ nodeType?: string; enemyId?: string; reward?: unknown } | null>;
    act?: number;
  beatIndex?: number;
  axisDeltaByChoice?: Array<{
    legitimacy?: number;
    control?: number;
    momentum?: number;
  }>;
}

export class StoryDialogueScene extends Phaser.Scene {
  private beat: StoryBeat | null = null;
  private returnNodeId: string | null = null;
  private beatNumber = 0;
  private totalBeats = 0;

  constructor() {
    super({ key: 'StoryDialogueScene' });
  }

  init(data?: {
    beat?: StoryBeat;
    returnNodeId?: string;
    beatNumber?: number;
    totalBeats?: number;
  }): void {
    this.beat = data?.beat ?? null;
    this.returnNodeId = data?.returnNodeId ?? null;
    this.beatNumber = data?.beatNumber ?? 0;
    this.totalBeats = data?.totalBeats ?? 0;
  }

  private getFactionBackgroundKey(characterId: string): string {
    if (characterId === 'eqrewer') return this.textures.exists('bg_shu_still') ? 'bg_shu_still' : 'prelude_bg_shu';
    if (characterId === 'sunquan') return this.textures.exists('bg_wu_still') ? 'bg_wu_still' : 'prelude_bg_wu';
    return this.textures.exists('bg_wei_still') ? 'bg_wei_still' : 'prelude_bg_wei';
  }

	private renderFactionBackground(w: number, h: number, cx: number, cy: number): void {
		const run = RunManager.getRunState();
		const characterId = run?.character ?? 'caocao';
		const key = this.getFactionBackgroundKey(characterId);
		if (this.textures.exists(key)) {
			this.add.image(cx, cy,key).setDepth(-100).setDisplaySize(w, h);
			return;
		}
		this.add.rectangle(cx, cy, w, h, 0x0xd0d10, 1);
	}

	create(): void {
		const w = this.scale.width;
		const h = this.scale.height;
		const cx = Math.round(w / 2);

		if (!this.beat) {
			this.resumeMap();
			return;
		}

    this.renderFactionBackground(w, h, cx, Math.round(h / 2));
    this.scene.launch('HUDScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('HUDScene');
    });

    const sy = h / 720;
    this.textures.exists('ui_dialogue_parchment')
      ? this.add.image(cx, 182 * sy, 'ui_dialogue_parchment').setDisplaySize(920, 280 * sy).setAlpha(0.95)
      : this.add.rectangle(cx, 182 * sy, 920, 280 * sy, 0xe2cfab, 0.95);
    this.add.rectangle(cx, 182 * sy, 920, 280 * sy, 0x000000, 0.12).setStrokeStyle(2, 0x6a5534, 1);
    this.add.rectangle(cx, 72 * sy, 920, 2, 0x8f7647, 1);

    const header = this.totalBeats > 0
      ? `Cao Cao Chronicle ${this.beatNumber}/${this.totalBeats}`
      : 'Cao Cao Chronicle';
    this.add.text(cx, 40 * sy, header, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#d9ccb7',
    }).setOrigin(0.5);

    this.add.text(cx, 110 * sy, this.beat.title, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      color: '#2c2015',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 218 * sy, this.beat.body.join('\n\n'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#241a11',
      wordWrap: { width: 840 },
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    const choices = this.beat.choices.length ? this.beat.choices : ['Continue'];
    choices.forEach((choiceLabel, index) => {
      const y = Math.round((356 + index * 76) * sy);
      const btn = this.add.container(cx, y);
      const bg = this.add.rectangle(0, 0, 700, 56, 0xe2cfab, 0.95);
      const shade = this.add.rectangle(0, 0, 700, 56, 0x000000, 0.12).setStrokeStyle(2, 0x5f4b2f, 1);
      const label = this.add.text(0, 0, choiceLabel, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#271d13',
        wordWrap: { width: 660 },
        align: 'center',
      }).setOrigin(0.5);

      btn.add([bg, shade, label]);
      btn.setSize(700, 56);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        bg.setFillStyle(0xe8d8b8, 0.98);
        shade.setFillStyle(0x000000, 0.06);
        shade.setStrokeStyle(2, 0xb39058, 1);
      });
      btn.on('pointerout', () => {
        bg.setFillStyle(0xe2cfab, 0.95);
        shade.setFillStyle(0x000000, 0.12);
        shade.setStrokeStyle(2, 0x5f4b2f, 1);
      });
      btn.on('pointerdown', () => this.complete(choiceLabel, index));
    });
  }