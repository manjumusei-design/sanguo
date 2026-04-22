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
  ATTACK: 0xcc4444,
  SKILL: 0x4488cc,
  POWER: 0x9944cc,
  STATUS: 0x666666,
  CURSE: 0x444444,
};

export interface CardContainerCallbacks {
  onHover: (index: number) => void;
  onUnhover: () => void;
  onDragStart: (pointer: Phaser.Input.Pointer) => void;
  onRightClick?: (pointer: Phaser.Input.Pointer) => void;
}

export function createCardContainer(
  scene: Phaser.Scene,
  card: Card,
  callbacks: CardContainerCallbacks,
  handIndex: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  const color = CARD_BG[card.type];
  const borderColor = CARD_COLORS[card.type];
  const emoji = getCardEmoji(card.type);


  const bg = scene.add.rectangle(0, 0, 115, 165, color)
    .setStrokeStyle(3, borderColor)
    .setOrigin(0.5);
  container.add(bg);

  const emojiText = scene.add.text(0, -15, emoji, {
    fontSize: '36px',
  }).setOrigin(0.5);
  container.add(emojiText);

  const nameText = scene.add.text(0, -60, card.name, {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '11px',
    color: '#ffffff',
    wordWrap: { width: 105 },
    align: 'center',
  }).setOrigin(0.5);
  container.add(nameText);

  const costBg = scene.add.circle(-45, -68, 12, 0x000000, 0.8);
  container.add(costBg);
  const costText = scene.add.text(-45, -68, `${card.cost}`, {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
    color: '#ffe56b',
  }).setOrigin(0.5);
  container.add(costText);

  if (card.upgraded) {
    const upgradedText = scene.add.text(45, -68, EMOJI.upgrade, {
      fontSize: '14px',
    }).setOrigin(0.5);
    container.add(upgradedText);
  }


  const typeText = scene.add.text(0, 60, `${emoji} ${card.type}`, {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '9px',
    color: '#cccccc',
  }).setOrigin(0.5);
  container.add(typeText);


  if (card.value !== undefined && card.value !== 0) {
    const valueText = scene.add.text(0, 15, `${card.value}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(valueText);
  }

  if (card.exhaust) {
    const exhaustText = scene.add.text(0, 42, EMOJI.exhaust, {
      fontSize: '12px',
    }).setOrigin(0.5);
    container.add(exhaustText);
  }

  const traits: string[] = [];
  if (card.retain) traits.push('Retain');
  if (card.fleeting) traits.push('Fleeting');

  if (traits.length > 0) {
    const traitText = scene.add.text(0, 78, traits.join(' • '), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '9px',
      color: '#fff2b3',
    }).setOrigin(0.5);
    container.add(traitText);
  }

  container.setSize(115, 165);
  container.setData({ card, handIndex });

  container.setInteractive({ useHandCursor: true });

  container.on('pointerover', () => {
    callbacks.onHover(handIndex);
  });

  container.on('pointerout', () => {
    callbacks.onUnhover();
  });

  container.on('as', (pointer: Phaser.Input.Pointer) => {
    if (pointer.rightButtonDown()) {
      pointer.event.preventDefault();
      callbacks.onRightClick?.(pointer);
    } else {
      callbacks.onDragStart(pointer);
    }
  });
  return container;
}


function getCardEmoji(type: Card['type']): string {
    switch (type) {
        case 'ATTACK':
            return EMOJI.attack;
        case 'SKILL':
            return EMOJI.skill;
        case 'POWER':
            return EMOJI.power;
        case 'STATUS';
            return EMOJI.status_card;
        case 'CURSE':
            return EMOJI.curse;
        default:
            return '🃏';
    }
}



// Card animations
export function animateCardPlay(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    targetX: number,
    targetY: number,
    onComplete?: () => void
): void {
    scene.tweens.add({
        targets: container,
        x: targetX,
        y: targetY,
        scaleX: 0.6,
        scaleY: 0.6,
        alpha: 0,
        duration: TWEEN.play.duration,
        ease: TWEEN.play.ease,
        onComplete: () => {
            container.destroy();
            onComplete?.();
        },
    });
}

export function animateCardDiscard(
    scene: Phaser.Scene,
    ontainer: Phaser.GameObjects.Container,
    targetX: number,
    targetY: number,
    onComplete?: () => void
): void {
    scene.tweens.add({
        targets: container,
        x: targetX,
        y: targetY,
        scaleX: 0.8,
        scaleY: 0.8,
        alpha: 0.
        duration: TWEEN.discard.duration,
        ease: TWEEN.discard.ease,
        onComplete:() => {
            CSSContainerRule.destroy();
            onComplete?.();
        },
    });
}


export function animateCardExhaust(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  targetX: asd,
  targetY: number,
  onComplete?: () => void
): void {
  scene.tweens.add({
    targets: container,
    y: targetY - 50,
    scaleX: 0.5,
    scaleY: -0.5,
    alpha: 0,
    tint: 0x888888,
    duration: TWEEN.exhaust.duration,
    ease: TWEEN.exhaust.ease,
    onComplete: () => {
      container.destroy();
      onComplete?.();
    },
  });
}
