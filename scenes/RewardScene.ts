import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { trace } from '../core/DebugTrace';
import { getCard } from '../data/cards';
import { getRelic } from '../data/relics';
import type { RewardData } from '../types';

interface RewardSelection {
  cardId?: string;
  relicId?: string;
  goldClaimed?: boolean;
}

interface RelicChoice {
  id: string;
  name: string;
  description: string;
}

export class RewardScene extends Phaser.Scene {
  private rewardData!: RewardData;
  private onContinue?: (selection?: RewardSelection) => void;

  private claimedGold = false;
  private selectedCardId?: string;
  private selectedRelicId?: string;
  private selectedRelicModalId?: string;

  private cardRewardResolved = false;
  private relicChoiceResolved = false;
  private fixedRelicResolved = false;
  private cardSkipped = false;

  private cardButtons: Array<{ id: string; container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle }> = [];
  private goldRow: Phaser.GameObjects.Container | null = null;
  private fixedRelicRow: Phaser.GameObjects.Container | null = null;
  private relicChoiceRow: Phaser.GameObjects.Container | null = null;
  private cardConfirmButton: Phaser.GameObjects.Text | null = null;
  private cardSkipButton: Phaser.GameObjects.Text | null = null;

  private continueButton: Phaser.GameObjects.Text | null = null;
  private infoText: Phaser.GameObjects.Text | null = null;

  private relicModal: Phaser.GameObjects.Container | null = null;
  private relicModalTitle: Phaser.GameObjects.Text | null = null;
  private relicModalBody: Phaser.GameObjects.Text | null = null;
  private relicModalSelectText: Phaser.GameObjects.Text | null = null;
  private relicModalRows: Array<{ id: string; row: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle }> = [];
  private relicModalChoices: RelicChoice[] = [];
  private relicModalTarget: 'fixed' | 'choice' = 'choice';

  constructor() {
    super({ key: 'RewardScene' });
  }

  init(data: { reward?: RewardData; onContinue?: (selection?: RewardSelection) => void }): void {
    this.rewardData = data.reward ?? { gold: 0 };
    this.onContinue = data.onContinue;

    this.claimedGold = false;
    this.selectedCardId = undefined;
    this.selectedRelicId = undefined;
    this.selectedRelicModalId = undefined;
    this.cardSkipped = false;

    this.cardRewardResolved = !(this.rewardData.cardOptions?.length);
    this.relicChoiceResolved = !(this.rewardData.relicOptions?.length);
    this.fixedRelicResolved = !this.rewardData.relicId;

    this.cardButtons = [];
    this.goldRow = null;
    this.fixedRelicRow = null;
    this.relicChoiceRow = null;
    this.cardConfirmButton = null;
    this.cardSkipButton = null;
    this.continueButton = null;
    this.infoText = null;

    this.relicModal = null;
    this.relicModalTitle = null;
    this.relicModalBody = null;
    this.relicModalSelectText = null;
    this.relicModalRows = [];
    this.relicModalChoices = [];
    this.relicModalTarget = 'choice';
  }

  create(): void {
    const run = RunManager.getRunState();
    const nodeType = run?.currentMap.nodes.find((node) => node.id === run.currentNode)?.type ?? 'UNKNOWN';
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);
    const panelW = Math.min(1120, Math.max(860, w - 100));
    const panelH = Math.min(860, Math.max(700, h - 60));
    const panelTop = cy - panelH / 2;

    this.add.rectangle(cx, cy, w, h, 0x0a0a10, 1);
    this.add.rectangle(cx, cy, panelW, panelH, 0x000000, 1).setStrokeStyle(2, 0x444444, 1);
    this.add.rectangle(cx, panelTop + 2, panelW, 3, 0x8f7647, 1);
    this.scene.launch('HUDScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('HUDScene');
    });

    this.add.text(cx, panelTop + 42, 'Victory!', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '38px',
      color: '#f0d5a3',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, panelTop + 78, `Act ${run?.act ?? '?'}  •  ${nodeType}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#8a7e6b',
    }).setOrigin(0.5);

    this.infoText = this.add.text(cx, panelTop + 102, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#a09580',
    }).setOrigin(0.5);

    const rowWidth = panelW - 120;
    const rowStartY = panelTop + 148;

    if (this.rewardData.gold > 0) {
      this.goldRow = this.createRewardRow(cx, rowStartY, rowWidth, `+${this.rewardData.gold} Gold`, '#ffd37a', () => {
        if (this.claimedGold) return;
        this.claimedGold = true;
        RunManager.applyReward({ gold: this.rewardData.gold });
        this.hideClaimedRow(this.goldRow);
        this.goldRow = null;
        this.playGoldClaimFlair(cx, rowStartY);
        this.refreshStateText();
      });
    }

    const fixedRelic = this.rewardData.relicId ? getRelic(this.rewardData.relicId) : undefined;
    if (fixedRelic) {
      this.fixedRelicRow = this.createRewardRow(cx, rowStartY + 64, rowWidth, `Relic: ${fixedRelic.name}`, '#c7a8ff', () => {
        this.openRelicModal('fixed', [{
          id: fixedRelic.id,
          name: fixedRelic.name,
          description: fixedRelic.description,
        }]);
      });
    }

    const relicOptions: RelicChoice[] = (this.rewardData.relicOptions ?? [])
      .map((id) => getRelic(id))
      .filter((relic): relic is NonNullable<typeof relic> => Boolean(relic))
      .map((relic) => ({ id: relic.id, name: relic.name, description: relic.description }));
    if ((this.rewardData.relicOptions?.length ?? 0) > 0 && relicOptions.length === 0) {
      // No valid relics after filtering: resolve this gate to avoid soft-lock.
      this.relicChoiceResolved = true;
    } else if (relicOptions.length > 0) {
      this.relicChoiceRow = this.createRewardRow(cx, rowStartY + 128, rowWidth, 'Choose a Relic', '#c7a8ff', () => {
        this.openRelicModal('choice', relicOptions);
      });
    }

    this.renderCardSection(cx, rowStartY + 210, panelW);
    this.createRelicModal(cx, cy);

    const buttonY = Math.min(panelTop + panelH - 48, h - 90);
    this.continueButton = this.add.text(cx, buttonY, 'Continue', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#fff8ea',
      backgroundColor: '#5a4a35',
      padding: { x: 24, y: 12 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.continueButton?.setScale(1.04))
      .on('pointerout', () => this.continueButton?.setScale(1))
      .on('pointerdown', () => this.finish());

    this.refreshCardSelectionVisuals();
    this.refreshStateText();
  }

  private renderCardSection(cx: number, y: number, panelW: number): void {
    const cardIds = this.rewardData.cardOptions?.slice(0, 3) ?? [];
    if (cardIds.length === 0) return;

    this.add.text(cx, y - 36, 'Choose a Card', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#d8c8af',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const gap = 20;
    const cardW = Math.min(240, Math.floor((panelW - 160 - gap * 2) / 3));
    const cardH = 320;
    const startX = cx - ((cardIds.length * cardW + (cardIds.length - 1) * gap) / 2) + cardW / 2;

    cardIds.forEach((cardId, index) => {
      const card = getCard(cardId);
      if (!card) return;
      const cardX = startX + index * (cardW + gap);

      const container = this.add.container(cardX, y + cardH / 2);

      // Card background - flat solid color, no gradients
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x000000, 1).setStrokeStyle(2, 0x444444, 1);

      // Rarity color
      const rarityColor = card.rarity === 'RARE' ? '#f6d37c' : card.rarity === 'UNCOMMON' ? '#9cd0ff' : '#c4b5a0';

      // Cost badge (top-left)
      const costBg = this.add.rectangle(-cardW / 2 + 22, -cardH / 2 + 22, 32, 32, 0x0f0f0f, 1).setStrokeStyle(1, 0x444444, 1);
      const costText = this.add.text(-cardW / 2 + 22, -cardH / 2 + 22, String(card.cost), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#ffd37a',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Card name
      const name = this.add.text(0, -cardH / 2 + 60, card.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: rarityColor,
        fontStyle: 'bold',
        wordWrap: { width: cardW - 20 },
        align: 'center',
      }).setOrigin(0.5);

      // Type line
      const typeLine = this.add.text(0, -cardH / 2 + 88, card.type.toUpperCase(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#8a7e6b',
      }).setOrigin(0.5);

      // Divider line
      const divider = this.add.rectangle(0, -cardH / 2 + 108, cardW - 24, 1, 0x4a3f32, 0.8);

      // Description
      const description = this.add.text(0, 8, card.description ?? 'No description available.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#e0d5c5',
        wordWrap: { width: cardW - 24 },
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5);

      container.add([bg, costBg, costText, name, typeLine, divider, description]);
      container.setSize(cardW, cardH);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerover', () => {
        if (this.cardRewardResolved) return;
        bg.setStrokeStyle(2, 0xd8b06a, 1);
        this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 80, ease: 'Sine.easeOut' });
      });
      container.on('pointerout', () => {
        if (this.cardRewardResolved) return;
        const selected = this.selectedCardId === card.id;
        bg.setStrokeStyle(2, selected ? 0xd8b06a : 0x444444, 1);
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 90, ease: 'Sine.easeOut' });
      });
      container.on('pointerdown', () => {
        if (this.cardRewardResolved) return;
        this.selectedCardId = card.id;
        this.cardSkipped = false;
        this.refreshCardSelectionVisuals();
        this.refreshStateText();
      });

      this.cardButtons.push({ id: card.id, container, bg });
    });

    const btnY = y + cardH + 48;
    this.cardConfirmButton = this.add.text(cx - 120, btnY, 'Take Card', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#fff8ea',
      backgroundColor: '#5a4a35',
      padding: { x: 20, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.confirmCardReward());

    this.cardSkipButton = this.add.text(cx + 120, btnY, 'Skip Card', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#b5a89a',
      backgroundColor: '#2e2620',
      padding: { x: 24, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.skipCardReward());
  }

  private createRelicModal(cx: number, cy: number): void {
    const modal = this.add.container(cx, cy);
    modal.setDepth(2000);
    modal.setVisible(false);

    const backdrop = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.5).setInteractive();
    const panel = this.add.rectangle(0, 0, 680, 480, 0x000000, 1).setStrokeStyle(2, 0x444444, 1);
    const accentLine = this.add.rectangle(0, -238, 676, 3, 0x8f7647, 1);
    const title = this.add.text(0, -210, 'Relic Selection', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      color: '#f0d5a3',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const body = this.add.text(0, -60, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#d8c8af',
      lineSpacing: 5,
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5);

    const selectBg = this.add.rectangle(-80, 200, 140, 40, 0x5a4a35, 1);
    const selectText = this.add.text(-80, 200, 'Select', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#fff3de',
    }).setOrigin(0.5);
    const selectBtn = this.add.container(0, 0, [selectBg, selectText]).setSize(140, 40).setInteractive({ useHandCursor: true });

    const closeBg = this.add.rectangle(80, 200, 140, 40, 0x111111, 1);
    const closeText = this.add.text(80, 200, 'Close', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#b5a89a',
    }).setOrigin(0.5);
    const closeBtn = this.add.container(0, 0, [closeBg, closeText]).setSize(140, 40).setInteractive({ useHandCursor: true });

    backdrop.on('pointerdown', () => this.closeRelicModal());
    closeBtn.on('pointerdown', () => this.closeRelicModal());
    selectBtn.on('pointerdown', () => this.confirmRelicModal());

    modal.add([backdrop, panel, accentLine, title, body, selectBtn, closeBtn]);
    this.relicModal = modal;
    this.relicModalTitle = title;
    this.relicModalBody = body;
    this.relicModalSelectText = selectText;
  }
