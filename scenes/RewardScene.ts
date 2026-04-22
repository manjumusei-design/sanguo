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