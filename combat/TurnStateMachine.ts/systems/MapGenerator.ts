import type { CharacterId, EventHistoryEntry, MapGraph, MapNode, NodeType, ChronicleFlags, CampaignSetPieceChain, EncounterFamilyDefinition } from '../types';
import { RNG } from '../core/RNG';
import { getEnemyIdsForNodeType } from '../data/enemies';
import { allCampaignChains, eliteEncounterPresets, encounterFamilies, getBossEncounterPreset, getEncounterFamily } from '../data/campaign';


const COLUMNS = 16;
const GAMEPLAY_COLUMNS = 15;
const ROWS = 7;
const PATH_COUNT = 6;
const JITTER = 0.02;
const SHOP_RATE = 0.05;
const REST_RATE = 0.12;
const EVENT_RATE = 0.22;
const ELITE_RATE_BASE = 0.08;
const ELITE_ASCENSION_MULTIPLER = 1.6;

type PathBias = 'safe' | 'greedy' | 'aggressive';

const SET_PIECES: Record<number, NodeType[][]> = {
    1: [
      ['EVENT', 'REST'],
      ['BATTLE', 'MERCHANT'],
      ['MYSTERY', 'EVENT'],
    ],
    2: [
      ['BATTLE', 'MERCHANT', 'MERCHANT'],
      ['BATTLE', 'REST', 'BATTLE'],
      ['BATTLE', 'EVENT', 'REST'],
    ],
    3: [
      ['ELITE', 'MYSTERY', 'ELITE'],
      ['BATTLE', 'ELITE', 'MYSTERY'],
      ['MYSTERY', 'EVENT', 'ELITE'],
    ],
};

export interface MapGenOptions {
  seed: string;
  act: number;
  character?: CharacterId;
  eventHistory: EventHistoryEntry[];
  flags: ChronicleFlags;
  ascensionLevel?: number;
}



