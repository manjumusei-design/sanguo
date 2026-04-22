import Phaser from 'phaser';
import type { LoreEvent } from '../types';


const LORE_EVENTS: LoreEvent[] = [
  {
    year: '184 AD',
    title: 'Yellow Turban Rebellion',
    text: 'Peasant uprising shakes the Han Dynasty. Zhang Jiao\'s followers sweep across the land, and the imperial court scrambles for generals to quell the revolt.',
  },
  {
    year: '189 AD',
    title: 'Dong Zhuo Seizes the Capital',
    text: 'The warlord Dong Zhuo marches on Luoyang, deposes the young emperor, and installs a puppet. The coalition of warlords forms in response — but unity fractures before battle is joined.',
  },
  {
    year: '200 AD',
    title: 'Battle of Guandu',
    text: 'Cao Cao faces the mighty Yuan Shao at Guandu. Outnumbered ten to one, Cao Cao strikes at the enemy grain supply and wins a decisive victory that secures the North.',
  },
  {
    year: '208 AD',
    title: 'Battle of Red Cliffs',
    text: 'Cao Cao\'s southern campaign shatters at the hands of Sun Quan and Liu Bei. Fire consumes the fleet. The Three Kingdoms era truly begins.',
  },
  {
    year: '220 AD',
    title: 'Fall of Han',
    text: 'The Han Dynasty ends. Cao Pi forces the last emperor to abdicate and founds Wei. Liu Bei declares himself emperor of Shu. Sun Quan crowns the Wu kingdom. Three crowns, one realm.',
  },
];

export class LoreScene extends Phaser.Scene {
  private currentIndex = 0;
  private selectedEvent: Phaser.GameObjects.Container | null = null;
  private eventBoxes: Phaser.GameObjects.Container[] = [];
  private continueButton!: Phaser.GameObjects.Container;
  private skipButton!: Phaser.GameObjects.Text;
  private scrollY = 0;
  private isDragging = false;
  private dragStartY = 0;
  private scrollStartY = 0;
  private contentContainer!: Phaser.GameObjects.Container;
  private maskContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'LoreScene' });
  }

  create(): void {
    // Background
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    const sy = h / 720;

    this.add.rectangle(cx, Math.round(h / 2), w, h, 0x0d0d1a);

    // Title
    this.add.text(cx, 40 * sy, '三國 — Three Kingdoms Timeline', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#e0d6c8',
    }).setOrigin(0.5);
    this.add.text(cx, 75 * sy, 'Click events to read. Press Continue to advance.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#888899',
    }).setOrigin(0.5);

    this.skipButton = this.add.text(Math.round(1200 * (w / 1280)), 40 * sy, '⏭ Skip', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#666677',
      backgroundColor: '#000000',
      padding: { x: 16, y: 8 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.skipButton.setColor('#ffffff'))
      .on('pointerout', () => this.skipButton.setColor('#666677'))
      .on('pointerdown', () => this.skipToMenu());

    this.contentContainer = this.add.container(0, 0);
    this.contentContainer.setDepth(1);
    const startY = Math.round(120 * sy);
    const spacing = Math.round(130 * sy);

    LORE_EVENTS.forEach((event, index) => {
      const box = this.createEventBox(event, cx, startY + index * spacing, index);
      this.contentContainer.add(box);
      this.eventBoxes.push(box);
    });
    this.createMask();
    this.input.on('wheel', (_pointer: unknown, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      this.scrollBy(deltaY * 0.5);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < 580 && pointer.y > 100) {
        this.isDragging = true;
        this.dragStartY = pointer.y;
        this.scrollStartY = this.scrollY;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const delta = this.dragStartY - pointer.y;
        this.scrollY = this.scrollStartY + delta;
        this.clampScroll();
        this.contentContainer.setPosition(0, -this.scrollY);
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
    this.createContinueButton();
    this.selectEvent(0);
  }

//Event
  private createEventBox(
    event: LoreEvent,
    x: number,
    y: number,
    index: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setSize(800, 110);
    container.setInteractive({ useHandCursor: true });

    // Background
    const bg = this.add.rectangle(0, 0, 800, 110, 0x000000, 1)
      .setStrokeStyle(2, 0x444455);
    container.add(bg);

    const yearBadge = this.add.text(-360, -35, event.year, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#f0c060',
      backgroundColor: '#2a2040',
      padding: { x: 8, y: 4 },
    });
    container.add(yearBadge);

    // Title
    const title = this.add.text(-360, -8, event.title, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#e0d6c8',
    });
    container.add(title);

    // Description (truncated)
    const text = this.add.text(-360, 18, event.text.substring(0, 100) + '...', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#a09080',
      wordWrap: { width: 720 },
    });
    container.add(text);
    container.setData({ index, event, bg, title, text, yearBadge });
    container.on('pointerover', () => {
      if (this.selectedEvent !== container) {
        this.tweens.add({
          targets: container,
          scaleX: 1.02,
          scaleY: 1.02,
          duration: 100,
          ease: 'Sine.easeOut',
        });
      }
    });

    container.on('pointerout', () => {
      if (this.selectedEvent !== container) {
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: 'Sine.easeOut',
        });
      }
    });

    container.on('pointerdown', () => {
      this.selectEvent(index);
    });

    return container;
  }

//Select
  private selectEvent(index: number): void {
    // Deselect previous
    if (this.selectedEvent) {
      const bg = this.selectedEvent.getData('bg') as Phaser.GameObjects.Rectangle | null;
      if (bg) {
        bg.setStrokeStyle(2, 0x444455);
        bg.setFillStyle(0x000000, 1);
      }
      this.tweens.add({
        targets: this.selectedEvent,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    }

    // Select new
    this.currentIndex = index;
    this.selectedEvent = this.eventBoxes[index];

    const bg = this.selectedEvent.getData('bg') as Phaser.GameObjects.Rectangle | null;
    if (bg) {
      bg.setStrokeStyle(2, 0xf0c060);
      bg.setFillStyle(0x2a2040, 0.95);
    }

    this.tweens.add({
      targets: this.selectedEvent,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 150,
      ease: 'Sine.easeOut',
    });

    const event = this.selectedEvent.getData('event') as LoreEvent;
    const textObj = this.selectedEvent.getData('text') as Phaser.GameObjects.Text | null;
    if (textObj) {
      textObj.setText(event.text);
    }
  }