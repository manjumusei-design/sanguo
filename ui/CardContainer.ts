import Phaser from 'phaser';
import type { Card } from '../types';
import { EMOJI } from '../data/emoji';
import { TWEEN } from './TweenConfig';

const CARD_COLORS: Record<Card['type'], number> = {
  ATTACK: 0xc0392b,
  SKILL: 0x2980b9,
  POWER: 0x27ae60,
  STATUS: 0x666666,
  CURSE: 0x444444,
};

const CARD_BG: Record<Card['type'], number> = {
  ATTACK: 0x7a261f,
  SKILL: 0x224f78,
  POWER: 0x3e355f,
  STATUS: 0x555555,
  CURSE: 0x302730,
};

export interface CardContainerCallbacks { 
	onHover: (index: number) => void;
	onUnhover: () => void;
	onDragStart: (pointer: Phaser.Input.Pointer) => void;
	onRightClick?: (pointer: Phaser.Input.Pointer) => void;
}
