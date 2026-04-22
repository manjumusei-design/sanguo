import Phaser from 'phaser';
import type { Card, CardTarget } from '../types';
import { TWEEN } from './TweenConfig';
export type DropZoneType = 'enemy' | 'self' | 'all_enemies';

export interface DropZone {
  id: string;
  type: DropZoneType;
  bounds: Phaser.Geom.Rectangle;
  visual: Phaser.GameObjects.Graphics | null;
  highlight: Phaser.GameObjects.Graphics | null;
}

export class DragDropSystem {
  private scene: Phaser.Scene;
  private draggingContainer: Phaser.GameObjects.Container | null = null;
  private draggingData: Card | null = null;
  private zones: DropZone[] = [];
  private activeZone: DropZone | null = null;
  private pointerOffsetX = 0;
  private pointerOffsetY = 0;

  // Store original position so card can return if drop is invalid
  private originalX = 0;
  private originalY = 0;