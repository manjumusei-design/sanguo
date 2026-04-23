import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { trace } from '../core/DebugTrace';
import { getCard } from '../data/cards';
import { getRelic } from '../data/relics';
import type { Card, RewardData } from '../types';

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
  private selectedRelicChoiceId?: string;
  private selectedRelicModalId?: string;

  private cardRewardResolved = false;
  private relicChoiceResolved = false;
  private fixedRelicResolved = false;
  private cardSkipped = false;

  private cardButtons: Array<{ id: string; container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle }> = [];
  private relicChoiceButtons: Array<{ id: string; container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle }> = [];
  private goldRow: Phaser.GameObjects.Container | null = null;
  private fixedRelicRow: Phaser.GameObjects.Container | null = null;
  private relicChoiceRow: Phaser.GameObjects.Container | null = null;
  private cardConfirmButton: Phaser.GameObjects.Text | null = null;
  private cardSkipButton: Phaser.GameObjects.Text | null = null;
  private relicChoiceDescriptionText: Phaser.GameObjects.Text | null = null;
  private relicTakeButton: Phaser.GameObjects.Text | null = null;
  private relicSkipButton: Phaser.GameObjects.Text | null = null;

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
    this.selectedRelicChoiceId = undefined;
    this.selectedRelicModalId = undefined;
    this.cardSkipped = false;

    this.cardRewardResolved = !(this.rewardData.cardOptions?.length);
    this.relicChoiceResolved = !(this.rewardData.relicOptions?.length);
    this.fixedRelicResolved = !this.rewardData.relicId;

    this.cardButtons = [];
    this.relicChoiceButtons = [];
    this.goldRow = null;
    this.fixedRelicRow = null;
    this.relicChoiceRow = null;
    this.cardConfirmButton = null;
    this.cardSkipButton = null;
    this.relicChoiceDescriptionText = null;
    this.relicTakeButton = null;
    this.relicSkipButton = null;
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
    let cardSectionY = rowStartY + 210;
    if ((this.rewardData.relicOptions?.length ?? 0) > 0 && relicOptions.length === 0) {
      // No valid relics after filtering: resolve this gate to avoid soft-lock.
      this.relicChoiceResolved = true;
    } else if (relicOptions.length > 0) {
      this.renderRelicChoiceSection(cx, rowStartY + 128, rowWidth, relicOptions);
      cardSectionY += 250;
    }

    this.renderCardSection(cx, cardSectionY, panelW);
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
      const description = this.add.text(0, 8, this.buildCardDescription(card), {
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
    const selectText = this.add.text(-80, 200, 'Confirm', {
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

    backdrop.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const bounds = panel.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        return;
      }
      this.closeRelicModal();
    });
    closeBtn.on('pointerdown', () => this.closeRelicModal());
    selectBtn.on('pointerdown', () => this.confirmRelicModal());

    modal.add([backdrop, panel, accentLine, title, body, selectBtn, closeBtn]);
    this.relicModal = modal;
    this.relicModalTitle = title;
    this.relicModalBody = body;
    this.relicModalSelectText = selectText;
  }

  private openRelicModal(target: 'fixed' | 'choice', choices: RelicChoice[]): void {
    if (!this.relicModal || choices.length === 0) return;

    this.relicModalTarget = target;
    this.relicModalChoices = choices;
    this.selectedRelicModalId = choices[0].id;

    this.relicModalTitle?.setText(target === 'fixed' ? 'Relic Reward' : 'Choose a Relic');
    this.relicModalBody?.setText(choices[0].description);

    this.relicModalRows.forEach((entry) => entry.row.destroy(true));
    this.relicModalRows = [];

    const startY = -140;
    choices.forEach((choice, index) => {
      const rowY = startY + index * 54;
      const bg = this.add.rectangle(0, 0, 600, 44, 0x000000, 1).setStrokeStyle(1, 0x444444, 1);
      const icon = this.add.text(-280, 0, '>', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#c7a8ff',
      }).setOrigin(0, 0.5);
      const text = this.add.text(-258, 0, choice.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#e8dcc8',
      }).setOrigin(0, 0.5);
      const row = this.add.container(0, rowY, [bg, icon, text]).setSize(600, 44).setInteractive({ useHandCursor: true });
      row.on('pointerover', () => {
        bg.setFillStyle(0x2a2438);
        bg.setStrokeStyle(1, 0x8f7647, 1);
      });
      row.on('pointerout', () => {
        const selected = this.selectedRelicModalId === choice.id;
        bg.setFillStyle(selected ? 0x3d2f1d : 0x000000, 1);
        bg.setStrokeStyle(1, selected ? 0xd8b06a : 0x444444, 1);
      });
      row.on('pointerdown', () => {
        this.selectedRelicModalId = choice.id;
        this.relicModalBody?.setText(choice.description);
        this.refreshRelicModalRows();
      });
      this.relicModal?.add(row);
      this.relicModalRows.push({ id: choice.id, row, bg });
    });

    this.refreshRelicModalRows();
    this.setBackgroundInteractives(false);
    this.relicModal.setVisible(true);
  }

  private closeRelicModal(): void {
    if (!this.relicModal) return;
    this.relicModalRows.forEach((entry) => entry.row.destroy(true));
    this.relicModalRows = [];
    this.relicModalChoices = [];
    this.selectedRelicModalId = undefined;
    this.relicModal.setVisible(false);
    this.relicModal.disableInteractive();
    this.setBackgroundInteractives(true);
  }

  private refreshRelicModalRows(): void {
    this.relicModalRows.forEach((entry) => {
      const selected = this.selectedRelicModalId === entry.id;
      entry.bg.setFillStyle(selected ? 0x3d2f1d : 0x000000, 1);
      entry.bg.setStrokeStyle(1, selected ? 0xd8b06a : 0x444444, 1);
    });
    if (this.relicModalSelectText) {
      this.relicModalSelectText.setColor(this.selectedRelicModalId ? '#fff3de' : '#6b5b45');
    }
  }

  private confirmRelicModal(): void {
    if (!this.selectedRelicModalId) return;
    const selected = this.relicModalChoices.find((choice) => choice.id === this.selectedRelicModalId);
    if (!selected) return;

    RunManager.applyReward({ gold: 0, relicId: selected.id });
    this.selectedRelicId = selected.id;

    if (this.relicModalTarget === 'fixed') {
      this.fixedRelicResolved = true;
      this.hideClaimedRow(this.fixedRelicRow);
      this.fixedRelicRow = null;
    } else {
      this.relicChoiceResolved = true;
      this.hideClaimedRow(this.relicChoiceRow);
      this.relicChoiceRow = null;
    }

    this.closeRelicModal();
    this.refreshStateText();
  }

  private confirmCardReward(): void {
    if (this.cardRewardResolved) return;
    if (!this.selectedCardId) {
      this.infoText?.setText('Select a card first, or skip.');
      return;
    }
    RunManager.addCardToDeck(this.selectedCardId);
    this.cardRewardResolved = true;
    this.cardSkipped = false;
    this.disableCardSection('Card taken');
    this.refreshStateText();
  }

  private skipCardReward(): void {
    if (this.cardRewardResolved) return;
    this.cardRewardResolved = true;
    this.cardSkipped = true;
    this.selectedCardId = undefined;
    this.disableCardSection('Card skipped');
    this.refreshStateText();
  }

  private disableCardSection(message: string): void {
    this.cardButtons.forEach((entry) => entry.container.disableInteractive());
    this.cardConfirmButton?.disableInteractive();
    this.cardSkipButton?.disableInteractive();
    this.tweens.add({
      targets: [this.cardConfirmButton, this.cardSkipButton],
      alpha: 0.35,
      duration: 140,
      ease: 'Sine.easeOut',
    });

    if (this.cardButtons.length > 0) {
      const avgY = this.cardButtons.reduce((sum, entry) => sum + entry.container.y, 0) / this.cardButtons.length;
      const avgX = this.cardButtons.reduce((sum, entry) => sum + entry.container.x, 0) / this.cardButtons.length;
      this.add.text(avgX, avgY + 140, message, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#a09580',
      }).setOrigin(0.5);
    }
  }

  private refreshCardSelectionVisuals(): void {
    this.cardButtons.forEach((entry) => {
      const selected = this.selectedCardId === entry.id && !this.cardRewardResolved;
      entry.bg.setFillStyle(selected ? 0x222222 : 0x000000, 1);
      entry.bg.setStrokeStyle(2, selected ? 0xd8b06a : 0x444444, 1);
    });
  }

  private renderRelicChoiceSection(
    cx: number,
    y: number,
    rowWidth: number,
    choices: RelicChoice[]
  ): void {
    this.add.text(cx, y - 22, 'Choose a Relic', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#d8c8af',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.relicChoiceButtons.forEach((entry) => entry.container.destroy(true));
    this.relicChoiceButtons = [];

    let selectedChoice = choices[0] ?? null;
    this.selectedRelicChoiceId = selectedChoice?.id;

    const relicCardW = Math.min(260, Math.floor((rowWidth - 24) / Math.max(1, choices.length)));
    const relicCardH = 128;
    const relicGap = 12;
    const cardTotalW = choices.length * relicCardW + Math.max(0, choices.length - 1) * relicGap;
    const cardStartX = cx - cardTotalW / 2 + relicCardW / 2;

    choices.forEach((choice, index) => {
      const cardX = cardStartX + index * (relicCardW + relicGap);
      const container = this.add.container(cardX, y + 54);
      const bg = this.add.rectangle(0, 0, relicCardW, relicCardH, 0x0a0a0a, 1).setStrokeStyle(2, 0x4a3f32, 1);
      const rarityBar = this.add.rectangle(0, -relicCardH / 2 + 3, relicCardW - 4, 4, 0x8f7647, 1);
      const typeLabel = this.add.text(0, -relicCardH / 2 + 20, 'RELIC', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#c7a8ff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const text = this.add.text(0, -10, choice.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#efe3cc',
        fontStyle: 'bold',
        wordWrap: { width: relicCardW - 20 },
        align: 'center',
      }).setOrigin(0.5);
      const preview = this.add.text(0, 36, choice.description, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#baa98d',
        wordWrap: { width: relicCardW - 20 },
        maxLines: 3,
        align: 'center',
      }).setOrigin(0.5);
      container.add([bg, rarityBar, typeLabel, text, preview]);
      container.setSize(relicCardW, relicCardH);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerover', () => {
        if (this.relicChoiceResolved) return;
        bg.setFillStyle(0x181818, 1);
        this.tweens.add({
          targets: container,
          scaleX: 1.03,
          scaleY: 1.03,
          duration: 90,
          ease: 'Sine.easeOut',
        });
      });
      container.on('pointerout', () => {
        if (!this.relicChoiceResolved) {
          this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            duration: 100,
            ease: 'Sine.easeOut',
          });
        }
        this.refreshRelicChoiceSelectionVisuals();
      });
      container.on('pointerdown', () => {
        if (this.relicChoiceResolved) return;
        this.selectedRelicChoiceId = choice.id;
        selectedChoice = choice;
        if (this.relicChoiceDescriptionText) {
          this.relicChoiceDescriptionText.setText(choice.description);
        }
        this.refreshRelicChoiceSelectionVisuals();
        this.refreshStateText();
      });
      this.relicChoiceButtons.push({ id: choice.id, container, bg });
    });

    const descBoxY = y + 162;
    this.add.rectangle(cx, descBoxY, rowWidth, 92, 0x000000, 1).setStrokeStyle(1, 0x4a3f32, 1);
    this.relicChoiceDescriptionText = this.add.text(cx, descBoxY, selectedChoice?.description ?? '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#d8c8af',
      align: 'center',
      wordWrap: { width: rowWidth - 28 },
      lineSpacing: 4,
    }).setOrigin(0.5);

    const btnY = descBoxY + 68;
    this.relicTakeButton = this.add.text(cx - 120, btnY, 'Take Relic', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#fff8ea',
      backgroundColor: '#5a4a35',
      padding: { x: 20, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.confirmRelicChoice());

    this.relicSkipButton = this.add.text(cx + 120, btnY, 'Skip Relic', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#b5a89a',
      backgroundColor: '#2e2620',
      padding: { x: 20, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.skipRelicChoice());

    this.relicChoiceRow = this.add.container(cx, y);
    this.refreshRelicChoiceSelectionVisuals();
  }

  private refreshRelicChoiceSelectionVisuals(): void {
    this.relicChoiceButtons.forEach((entry) => {
      const selected = this.selectedRelicChoiceId === entry.id && !this.relicChoiceResolved;
      entry.bg.setFillStyle(selected ? 0x222222 : 0x000000, 1);
      entry.bg.setStrokeStyle(1, selected ? 0xd8b06a : 0x444444, 1);
    });
  }

  private confirmRelicChoice(): void {
    if (this.relicChoiceResolved) return;
    if (!this.selectedRelicChoiceId) {
      this.infoText?.setText('Select a relic first, or skip.');
      return;
    }

    RunManager.applyReward({ gold: 0, relicId: this.selectedRelicChoiceId });
    this.selectedRelicId = this.selectedRelicChoiceId;
    this.relicChoiceResolved = true;
    this.disableRelicChoiceSection('Relic taken');
    this.refreshStateText();
  }

  private skipRelicChoice(): void {
    if (this.relicChoiceResolved) return;
    this.relicChoiceResolved = true;
    this.selectedRelicChoiceId = undefined;
    this.disableRelicChoiceSection('Relic skipped');
    this.refreshStateText();
  }

  private disableRelicChoiceSection(message: string): void {
    this.relicChoiceButtons.forEach((entry) => entry.container.disableInteractive());
    this.relicTakeButton?.disableInteractive();
    this.relicSkipButton?.disableInteractive();
    this.tweens.add({
      targets: [this.relicTakeButton, this.relicSkipButton],
      alpha: 0.35,
      duration: 140,
      ease: 'Sine.easeOut',
    });
    if (!this.relicChoiceRow) return;
    this.add.text(this.relicChoiceRow.x, this.relicChoiceRow.y + 236, message, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#a09580',
    }).setOrigin(0.5);
  }

  private finish(): void {
    this.syncRelicResolutionState();

    if (!this.cardRewardResolved) {
      this.infoText?.setText('Choose or skip the card reward first.');
      return;
    }
    if (!this.fixedRelicResolved) {
      this.infoText?.setText('Claim the relic reward first.');
      return;
    }
    if (!this.relicChoiceResolved) {
      this.infoText?.setText('Choose a relic first.');
      return;
    }

    trace('REWARD', 'finish', {
      selectedCardId: this.selectedCardId ?? null,
      selectedRelicId: this.selectedRelicId ?? null,
      claimedGold: this.claimedGold,
      hasOnContinue: Boolean(this.onContinue),
      runNode: RunManager.getRunState()?.currentNode ?? null,
    });

    const selection: RewardSelection = {
      goldClaimed: this.claimedGold,
    };
    if (this.selectedCardId && !this.cardSkipped) {
      selection.cardId = this.selectedCardId;
    }
    if (this.selectedRelicId) {
      selection.relicId = this.selectedRelicId;
    }

    if (this.onContinue) {
      this.onContinue(selection);
      return;
    }

    this.cameras.main.fadeOut(400, 0x000000);
    this.time.delayedCall(400, () => {
      trace('SCREEN', 'transition', {
        from: 'RewardScene',
        to: 'MapScene',
        reason: 'reward_continue',
      });
      this.scene.start('MapScene', { promptNodeChoice: true });
    });
  }

  private refreshStateText(): void {
    this.syncRelicResolutionState();

    const pending: string[] = [];
    if (!this.cardRewardResolved) pending.push('card');
    if (!this.fixedRelicResolved) pending.push('relic');
    if (!this.relicChoiceResolved) pending.push('relic choice');
    if (!this.claimedGold && this.rewardData.gold > 0) pending.push('gold');

    if (pending.length === 0) {
      this.infoText?.setText('All rewards claimed. Continue when ready.');
      this.continueButton?.setAlpha(1);
      this.continueButton?.setInteractive({ useHandCursor: true });
    } else {
      this.infoText?.setText(`Pending rewards: ${pending.join(', ')}`);
      this.continueButton?.setAlpha(0.95);
    }
  }

  private syncRelicResolutionState(): void {
    if (!this.selectedRelicId) {
      return;
    }

    if (this.rewardData.relicId && this.selectedRelicId === this.rewardData.relicId) {
      this.fixedRelicResolved = true;
    }

    if ((this.rewardData.relicOptions?.length ?? 0) > 0) {
      const selectedIsChoice = (this.rewardData.relicOptions ?? []).includes(this.selectedRelicId);
      if (selectedIsChoice) {
        this.relicChoiceResolved = true;
      }
      if (!this.relicChoiceRow) {
        // Choice row is removed only after a confirmed relic choice.
        this.relicChoiceResolved = true;
      }
    }
  }

  private createRewardRow(
    x: number,
    y: number,
    width: number,
    label: string,
    accentColor: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, 52, 0x000000, 1).setStrokeStyle(1, 0x444444, 1);
    const icon = this.add.text(-width / 2 + 20, 0, '>', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: accentColor,
    }).setOrigin(0, 0.5);
    const text = this.add.text(-width / 2 + 42, 0, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#e8dcc8',
      wordWrap: { width: width - 70 },
    }).setOrigin(0, 0.5);

    container.add([bg, icon, text]);
    container.setSize(width, 52);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => {
      bg.setFillStyle(0x111111);
      bg.setStrokeStyle(1, 0x8f7647, 1);
    });
    container.on('pointerout', () => {
      bg.setFillStyle(0x000000);
      bg.setStrokeStyle(1, 0x4a3f32, 1);
    });
    container.on('pointerdown', () => onClick());
    return container;
  }

  private hideClaimedRow(row: Phaser.GameObjects.Container | null): void {
    if (!row) return;
    row.disableInteractive();
    this.tweens.add({
      targets: row,
      alpha: 0,
      y: row.y - 6,
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => row.setVisible(false),
    });
  }

  private setBackgroundInteractives(enabled: boolean): void {
    const toggle = (obj: Phaser.GameObjects.GameObject | null | undefined) => {
      if (!obj) return;
      if (enabled) {
        (obj as Phaser.GameObjects.GameObject & { setInteractive: (config?: { useHandCursor?: boolean }) => void })
          .setInteractive({ useHandCursor: true });
      } else {
        (obj as Phaser.GameObjects.GameObject & { disableInteractive: () => void }).disableInteractive();
      }
    };

    this.cardButtons.forEach((entry) => toggle(entry.container));
    this.relicChoiceButtons.forEach((entry) => toggle(entry.container));
    toggle(this.goldRow);
    toggle(this.fixedRelicRow);
    toggle(this.relicChoiceRow);
    toggle(this.cardConfirmButton);
    toggle(this.cardSkipButton);
    toggle(this.relicTakeButton);
    toggle(this.relicSkipButton);
    toggle(this.continueButton);
  }

  private playGoldClaimFlair(x: number, y: number): void {
    const burst = this.add.text(x, y - 30, `+${this.rewardData.gold} Gold`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffd37a',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: burst,
      y: y - 60,
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeOut',
      onComplete: () => burst.destroy(),
    });
  }

  private buildCardDescription(card: Card): string {
    if (card.description && card.description.trim().length > 0) {
      return card.description;
    }

    const lines = card.effects.map((effect) => {
      switch (effect.type) {
        case 'damage':
          return `Deal ${effect.value} damage${this.describeTarget(effect.target)}.`;
        case 'block':
          return `Gain ${effect.value} Block${effect.target === 'SELF' ? '' : this.describeTarget(effect.target)}.`;
        case 'draw':
          return `Draw ${effect.value} cards.`;
        case 'energy':
          return `${effect.value >= 0 ? 'Gain' : 'Lose'} ${Math.abs(effect.value)} Energy.`;
        case 'apply_status':
          return `Apply ${effect.value} ${effect.statusId ?? 'status'}${this.describeTarget(effect.target)}.`;
        case 'summon':
          return `Summon ${effect.value} unit${effect.value === 1 ? '' : 's'}.`;
        default:
          return null;
      }
    }).filter((line): line is string => Boolean(line));

    if (card.exhaust) lines.push('Exhaust.');
    if (card.retain) lines.push('Retain.');
    if (card.fleeting) lines.push('Fleeting.');
    if (card.type === 'POWER') lines.push('Persists for the rest of combat.');

    return lines.join('\n');
  }

  private describeTarget(target: 'SELF' | 'ENEMY' | 'ALL_ENEMIES' | 'ALL'): string {
    switch (target) {
      case 'ENEMY':
        return ' to an enemy';
      case 'ALL_ENEMIES':
        return ' to all enemies';
      case 'ALL':
        return ' to all combatants';
      default:
        return '';
    }
  }
}
