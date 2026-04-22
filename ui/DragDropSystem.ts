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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addZone(id: string, type: DropZoneType, bounds: Phaser.Geom.Rectangle): void {
    const visual = this.scene.add.graphics();
    const highlight = this.scene.add.graphics();
    const zone: DropZone = { id, type, bounds, visual, highlight };
    this.zones.push(zone);
  }

  clearZones(): void {
    for (const zone of this.zones) {
      zone.highlight?.destroy();
      zone.visual?.destroy();
    }
    this.zones = [];
    this.activeZone = null;
  }

  startDrag(
    container: Phaser.GameObjects.Container,
    data: Card,
    pointer: Phaser.Input.Pointer
  ): void {
    this.draggingContainer = container;
    this.draggingData = data;

    //Cache the original position if there is a failed drop
    this.originalX = container.x;
    this.originalY = container.y;
    this.pointerOffsetX = container.x - pointer.x;
    this.pointerOffsetY = container.y - pointer.y;
    container.setDepth(200);
    container.setScale(1.1);
  }
//Update the card position during the drag call 
  updateDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingContainer) return;

    const newX = pointer.x + this.pointerOffsetX;
    const newY = pointer.y + this.pointerOffsetY;
    this.draggingContainer.setPosition(newX, newY);
    this.checkZones(pointer);
  }
  //Zone validation for checkin and card compatibility then trigger a callback or bounce the card back to the ogirnal position in the hand
  endDrag(
    pointer: Phaser.Input.Pointer,
    onPlay: (zone: DropZone) => void,
    onReturn: () => void
  ): void {
    if (!this.draggingContainer || !this.draggingData) {
      onReturn();
      return;
    }

    const validZone = this.findValidZone(pointer);

    if (validZone && this.isTargetCompatible(validZone.type, this.draggingData.target)) {
      // Valid target: trigger card play
      this.clearZoneHighlights();
      onPlay(validZone);
    } else {
      // Invalid target: return card to hand with animation
      this.clearZoneHighlights();
      this.returnToHand();
      this.timeDelayedCall(TWEEN.return.duration, () => onReturn());
    }

    this.draggingContainer = null;
    this.draggingData = null;
    this.activeZone = null;
  }

//Back to hand animation for invalid dropping 
  returnToHand(): void {
    if (!this.draggingContainer) return;

    this.scene.tweens.add({
      targets: this.draggingContainer,
      x: this.originalX,
      y: this.originalY,
      scaleX: 1,
      scaleY: 1,
      duration: TWEEN.return.duration,
      ease: TWEEN.return.ease,
    });

    this.draggingContainer.setDepth(0);
  }

// Abort the drag without any callbacks 
  cancel(): void {
    this.clearZoneHighlights();
    this.draggingContainer = null;
    this.draggingData = null;
    this.activeZone = null;
  }

  isDragging(): boolean {
    return this.draggingContainer !== null;
  }

//Zone logic
  private checkZones(pointer: Phaser.Input.Pointer): void {
    const zone = this.findValidZone(pointer);

    if (zone !== this.activeZone) {
      // Clear previous highlight
      if (this.activeZone?.highlight) {
        this.activeZone.highlight.clear();
      }
      this.activeZone = zone;
      if (zone?.highlight) {
        zone.highlight.clear();
        const color = zone.type === 'enemy' ? 0xff6b6b : 0x4ade80;
        zone.highlight.fillStyle(color, 0.12);
        zone.highlight.fillRect(
          zone.bounds.x,
          zone.bounds.y,
          zone.bounds.width,
          zone.bounds.height
        );
        zone.highlight.lineStyle(3, color, 0.55);
        zone.highlight.strokeRect(
          zone.bounds.x,
          zone.bounds.y,
          zone.bounds.width,
          zone.bounds.height
        );
      }
    }
  }

    private findValidZone(pointer: Phaser.Input.Pointer): DropZone | null {
    for (const zone of this.zones) {
      if (Phaser.Geom.Rectangle.Contains(zone.bounds, pointer.x, pointer.y)) {
        return zone;
      }
    }
    return null;
  }