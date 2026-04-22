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

export interface HandCard {
  container: Phaser.GameObjects.Container;
  data: Card;
  index: number;
}

export class HandManager {
  private scene: Phaser.Scene;
  private config: FanConfig;
  private handCards: HandCard[] = [];
  private hoveredIndex: number = -1;
  private onCardHover: ((index: number) => void) | null = null;

  constructor(scene: Phaser.Scene, config?: Partial<FanConfig>) {
    this.scene = scene;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    this.config = {
      centerX: config?.centerX ?? Math.round(w / 2),
      baseY: config?.baseY ?? Math.round(h - 108),
      cardWidth: config?.cardWidth ?? 115,
      cardSpacing: config?.cardSpacing ?? 68,
      maxSpreadAngle: config?.maxSpreadAngle ?? 10,
      maxLift: config?.maxLift ?? 28,
    };
  }

    setCards(cards: { container: Phaser.GameObjects.Container; data: Card }[]): void {
    this.handCards = cards.map((c, i) => ({ ...c, index: i }));
    this.hoveredIndex = -1;
    this.updateFan();
  }

  clear(destroyContainers = true): void {
    if (destroyContainers) {
      for (const handCard of this.handCards) {
        handCard.container.destroy();
      }
    }
    this.handCards = [];
    this.hoveredIndex = -1;
  }

  removeCard(index: number): void {
    if (index < 0 || index >= this.handCards.length) return;
    const removed = this.handCards[index];
    this.scene.tweens.killTweensOf(removed.container);
    this.handCards.splice(index, 1);
    this.handCards.forEach((c, i) => { c.index = i; });
    if (this.hoveredIndex === index) {
      this.hoveredIndex = -1;
    } else if (this.hoveredIndex > index) {
      this.hoveredIndex--;
    }
    this.updateFan();
  }

  addCard(container: Phaser.GameObjects.Container, data: Card): void {
    this.handCards.push({ container, data, index: this.handCards.length });
    this.updateFan();
  }

  getCard(index: number): Card | undefined {
    return this.handCards[index]?.data;
  }

  getContainer(index: number): Phaser.GameObjects.Container | undefined {
    return this.handCards[index]?.container;
  }

  size(): number {
    return this.handCards.length;
  }

  onHover(callback: (index: number) => void): void {
    this.onCardHover = callback;
  }