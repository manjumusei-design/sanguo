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