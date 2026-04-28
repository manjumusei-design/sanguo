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
  choiceMetaByChoice?: Array<string[] | null>;
}

export class StoryDialogueScene extends Phaser.Scene {
  private beat: StoryBeat | null = null;
  private returnNodeId: string | null = null;
  private beatNumber = 0;
  private totalBeats = 0;

  constructor() {
    super({ key: 'StoryDialogueScene' });
  }

    private ensureDialogueHUD(): void {
    if (this.scene.manager.isSleeping('HUDScene')) {
      this.scene.wake('HUDScene');
    } else if (!this.scene.manager.isActive('HUDScene')) {
      this.scene.launch('HUDScene');
    }
    this.scene.bringToTop('HUDScene');
    this.time.delayedCall(0, () => {
      if (this.scene.manager.isSleeping('HUDScene')) {
        this.scene.wake('HUDScene');
      } else if (!this.scene.manager.isActive('HUDScene')) {
        this.scene.launch('HUDScene');
      }
      this.scene.bringToTop('HUDScene');
    });
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
    if (characterId === 'liubei') return this.textures.exists('bg_shu_still') ? 'bg_shu_still' : 'prelude_bg_shu';
    if (characterId === 'sunquan') return this.textures.exists('bg_wu_still') ? 'bg_wu_still' : 'prelude_bg_wu';
    return this.textures.exists('bg_wei_still') ? 'bg_wei_still' : 'prelude_bg_wei';
  }

  private renderFactionBackground(w: number, h: number, cx: number, cy: number): void {
    const run = RunManager.getRunState();
    const characterId = run?.character ?? 'caocao';
    const key = this.getFactionBackgroundKey(characterId);
    if (this.textures.exists(key)) {
      this.add.image(cx, cy, key).setDepth(-100).setDisplaySize(w, h);
      return;
    }
    this.add.rectangle(cx, cy, w, h, 0x0d0d10, 1);
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
    this.ensureDialogueHUD();

    const run = RunManager.getRunState();
    const characterLabel = (run?.character ?? 'caocao').toUpperCase();
    const chapterLabel = this.beat.act ? `Act ${this.beat.act}` : 'Roguelike Story';
    const hudTopbarHeight = 44;
    const secondaryTopbarHeight = 40;
    const secondaryTopbarGap = 0;
    const topBarY = hudTopbarHeight + secondaryTopbarGap + Math.round(secondaryTopbarHeight / 2);
    const edgePad = 20;
    const progressLabel = this.totalBeats > 0
      ? `Story ${this.beatNumber}/${this.totalBeats}`
      : 'Story';

    this.add.rectangle(cx, topBarY, w, secondaryTopbarHeight, 0x000000, 0.86)
      .setStrokeStyle(1, 0x4a3a25, 1);
    this.add.text(edgePad, topBarY, characterLabel, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#f8e7c0',
      fontStyle: 'bold',
    }).setOrigin(0, 0.15);
    this.add.text(w - edgePad, topBarY, progressLabel, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#c5d0e0',
    }).setOrigin(1, 0.5);
    this.add.text(cx, topBarY, chapterLabel, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#9fb0c8',
      wordWrap: { width: 840 },
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

        this.textures.exists('ui_dialogue_parchment')
      ? this.add.image(cx, 182 * sy, 'ui_dialogue_parchment').setDisplaySize(780, 220 * sy).setAlpha(0.95)
      : this.add.rectangle(cx, 182 * sy, 780, 220 * sy, 0xe2cfab, 0.95);
    this.add.rectangle(cx, 182 * sy, 780, 220 * sy, 0x000000, 0.14).setStrokeStyle(2, 0x6a5534, 1);
    this.add.rectangle(cx, 74 * sy, 780, 2, 0x8f7647, 1);

    const choices = this.beat.choices.length ? this.beat.choices : ['Continue'];
    choices.forEach((choiceLabel, index) => {
      const choiceMetaLines = this.beat?.choiceMetaByChoice?.[index] ?? null;
      const hasMeta = Array.isArray(choiceMetaLines) && choiceMetaLines.length > 0;
      const y = Math.round((80 + index * 100) * sy);
      const btn = this.add.container(cx, y);
      const buttonHeight = hasMeta ? 104 : 80;
      const bg = this.add.rectangle(0, 0, 660, buttonHeight, 0xe2cfab, 0.95);
      const shade = this.add.rectangle(0, 0, 660, buttonHeight, 0x000000, 0.14).setStrokeStyle(2, 0x5f4b2f, 1);
      const accent = this.add.rectangle(-328, 0, 6, buttonHeight, 0x8f7647, 1);
      const label = this.add.text(-310, hasMeta ? -18 : 0, choiceLabel, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#271d13',
        wordWrap: { width: 660 },
        align: 'center',
      }).setOrigin(0.5);

      const metaText = hasMeta
        ? this.add.text(310, 26, (choiceMetaLines as string[]).slice(0, 2).join(' | '), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#5a4c37',
          wordWrap: { width: 620 },
        }).setOrigin(0, 0.5)
        : null;

      btn.add(metaText ? [bg, shade, accent, label, metaText] : [bg, shade, accent, label]);
      btn.setSize(660, buttonHeight);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => {
        bg.setFillStyle(0xe8d8b8, 0.98);
        shade.setFillStyle(0x000000, 0.06);
        shade.setStrokeStyle(2, 0xb39058, 1);
        accent.setFillStyle(0xd0ab6a, 1);
      });
      btn.on('pointerout', () => {
        bg.setFillStyle(0xe2cfab, 0.95);
        shade.setFillStyle(0x000000, 0.12);
        shade.setStrokeStyle(2, 0x5f4b2f, 1);
        accent.setFillStyle(0x8f7647, 1);
      });
      btn.on('pointerdown', () => this.complete(choiceLabel, index));
    });
  }

	private complete(choiceLabel: string, choiceIndex: number): void {
		const run = RunManager.getRunState();
		if (run) {
			run.relicState = run.relicState ?? {};
      const prev = run.relicState.caocao_story_guidance ?? {};
			const payload = {
				...(prev.payload ?? {}),
        [`choice_${this.beat?.id ?? 'unknown'}`]: choiceLabel,
			};
      const selectedAxisDelta = this.beat?.axisDeltaByChoice?.[choiceIndex];
      if (selectedAxisDelta) {
        const legitimacy = Number(payload.axis_legitimacy ?? 0) + Number(selectedAxisDelta.legitimacy ?? 0);
        const control = Number(payload.axis_control ?? 0) + Number(selectedAxisDelta.control ?? 0);
        const momentum = Number(payload.axis_momentum ?? 0) + Number(selectedAxisDelta.momentum ?? 0);
        payload.axis_legitimacy = legitimacy;
        payload.axis_control = control;
        payload.axis_momentum = momentum;
      }
			this.applyStoryFlagsForChoice(payload, choiceIndex);
			this.advanceStoryBeatIndex(payload, run, choiceIndex) ?? null;
      const selectedChoiceReward = this.beat?.choiceRewards?.[choiceIndex] ?? null;
			this.applyStoryChoiceReward(selectedChoiceReward, payload, run , choiceIndex);

			if (this.returnNodeId) {
				const encounterOverride = this.beat?.choiceEncounterOverrides?.[choiceIndex] ?? null;
				const pendinType = encounterOverride?.enemtId
					? (encounterOverride.nodeType === 'boss_battle' ? 'BOSS' : 'BATTLE')
					: this.beat?.type === 'battle'
						? 'BATTLE'
						: (this.beat?.type === 'boss_battle' ? 'BOSS' : 'BATTLE')
				const pendingEnemies = encounterOverride?.enemyId
					? [encounterOverride.enemyId]
					: (this.beat?.enemy
						? [this.beat.enemy]
						: (this.beat?.boss ? [this.beat/boss] : []));
        const overrideReward = this.normalizeStoryRewardOverride(encounterOverride?.reward);
				payload.story_pending_resolution = {
					mapNodeId: this.returnNodeId,
					type: pendingType,
					enemies: pendingEnemies
					storyNodeId: this.beat?.id ?? null,
					rewardOverride: overrideReward ?? this.beat?.rewardOverride ?? null,
				};
			}

			run.relicState.caocao_story_guidance = {
				...prev,
				payload,
			};
		}
		this.resumeMap();
	}


  private applyStoryFlagsForChoice(payload: Record<string, unknown>, choiceIndex: number): void {
    const flags = this.beat?.flagsSetByChoice?.[choiceIndex];
    if (!flags || typeof flags !== 'object') return;
    const current = (payload.story_flags && typeof payload.story_flags === 'object')
      ? { ...(payload.story_flags as Record<string, unknown>) }
      : {};
    for (const [key, value] of Object.entries(flags)) {
      current[key] = Boolean(value);
    }
    payload.story_flags = current;
  }

  private advanceStoryBeatIndex(
    payload: Record<string, unknown>,
    run: NonNullable<ReturnType<typeof RunManager.getRunState>>,
    _choiceIndex: number
  ): void {
    const act = this.beat?.act ?? run.act;
    const beatIndex = Number(this.beat?.beatIndex ?? 0);
    const key = `story_beat_index_act${act}`;
    const current = Number(payload[key] ?? 0);
    payload[key] = Math.max(current, beatIndex + 1);
  }

  private applyStoryChoiceReward(
    rewardToken: unknown,
    payload: Record<string, unknown>,
    run: NonNullable<ReturnType<typeof RunManager.getRunState>>,
    choiceIndex: number
  ): void {
    if (typeof rewardToken !== 'string' || rewardToken.length === 0) return;

    if (rewardToken === 'remove_curse' || rewardToken === 'remove_curse_and_heal') {
      const cursedIdx = run.relics.findIndex((relic) => relic.rarity === 'cursed');
      if (cursedIdx >= 0) {
        run.relics.splice(cursedIdx, 1);
      }
      if (rewardToken === 'remove_curse_and_heal') {
        RunManager.heal(8);
      }
      return;
    }

    if (rewardToken === 'random_cards') {
      this.grantDeterministicRandomCards(run, 2, `${this.beat?.id ?? 'story'}:${choiceIndex}`);
      return;
    }

    if (rewardToken === 'rally_bonus') {
      RunManager.heal(6);
      RunManager.addPendingStatus('momentum', 1);
      return;
    }

    const resolvedRelicId = this.resolveStoryRelicId(rewardToken);
    if (resolvedRelicId) {
      RunManager.applyReward({ gold: 0, relicId: resolvedRelicId });
      return;
    }
    payload[`story_unresolved_reward_${this.beat?.id ?? 'unknown'}_${choiceIndex}`] = rewardToken;
  }

  private resolveStoryRelicId(token: string): string | null {
    return resolveCentralizedRelicToken(token);
  }