import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { allCards } from '../data/cards';
import { resolveCentralizedRelicToken } from '../data/story/centralized';

interface StoryBeat {
    id: string;
    type?: string;
    title: string;
    body: string [];
    choices: string[];
    enemy?: string;
    boss?: string;
    rewardOverride?: {
        cardOptions?: string[];
        relicId?: string;
        relicOptions?: string[]
        noCard?: boolean;
        norelic?: boolean
    };
    choiceRewards?: Array<unknown>;
    flagsSetByChoice?: Array<Recprd<string, boolean> | null>;
  choiceEncounterOverrides?: Array<{ nodeType?: string; enemyId?: string; reward?: unknown } | null>;
  act?: number;
  beatIndex?: number;
  axisDeltaByChoice? : Array< {
    legitimacy?; number;
    contro?: number;
    momentum?: number;
  }
}

export class StoryDialogueScene extends Phaser.Scene {
    private beat: StoryBeat | null = null;
    private returnNodeId: string | null =null;
    private beatNumber = 0;
    private totalBeats = 0;

    constructor()     }