import Phaser from 'phaser';
import type { Card } from '../types';
import { TWEEN } from './TweenConfig';

export interface FanConfig { //Wanted to mimic a fan shape for the hand 
  centerX: number;
  baseY: number;
  cardWidth: number;
  cardSpacing: number;
  maxSpreadAngle: number;
  maxLift: number;
}

export interface CardPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}