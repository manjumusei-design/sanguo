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