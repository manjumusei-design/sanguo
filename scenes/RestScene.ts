import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { createStatus } from '../combat/StatusSystem';
type RestMode = 'root' | 'drill' | 'meditate' | 'reorganize';

export class RestScene extends Phaser.Scene {
  private mode: RestMode = 'root';
  private optionContainers: Phaser.GameObjects.Container[] = [];
  private messageText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'RestScene' });
  }

  create(): void {
    if (!RunManager.getRunState()) {
      this.scene.start('MenuScene');
      return;
    }
    this.ensureHUD();
    this.renderRoot();
  }

  private clearOptions(): void {
    this.children.removeAll(true);
    this.optionContainers = [];
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    this.add.rectangle(cx, Math.round(h / 2), w, h, 0x000000);
    this.add.text(cx, 70, 'Rest Site', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '34px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(cx, 112, 'Recover Hp, refine the deck, or prepare the next battle.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#cccccc',
    }).setOrigin(0.5);
    this.messageText = this.add.text(cx, h - 80, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#cccccc',
    }).setOrigin(0.5);
  }

  private renderRoot(): void {
    this.mode = 'root';
    this.clearOptions();

    const run = RunManager.getRunState();
    if (!run) return;

    const options = [
      {
        label: `Recover (${Math.floor(run.maxHp * 0.3)} HP)`,
        onClick: () => {
          const amount = Math.floor(run.maxHp * 0.3);
          RunManager.heal(amount);
          this.finish(`Recovered ${amount} HP`);
        },
      },
      {
        label: 'Drill (upgrade any card)',
        onClick: () => this.renderDrill(),
      },
      {
        label: 'Meditate (remove a card or exhaust one for next combat)',
        onClick: () => this.renderMeditate(),
      },
      {
        label: 'Reorganize (prepare next combat)',
        onClick: () => this.renderReorganize(),
      },
    ];

    const cx = Math.round(this.scale.width / 2);
    options.forEach((option, index) => {
      this.optionContainers.push(this.createButton(cx, 220 + index * 92, option.label, option.onClick));
    });

    this.optionContainers.push(this.createTextButton(cx, 580, 'Leave', () => this.finish()));
  }

  private renderDrill(): void {
    this.mode = 'drill';
    this.clearOptions();

    const run = RunManager.getRunState();
    const upgradable = run?.deck.filter((card) => !card.upgraded) ?? [];
    this.addSectionTitle('Choose a card to upgrade');

    const cx = Math.round(this.scale.width / 2);
    upgradable.slice(0, 6).forEach((card, index) => {
      this.optionContainers.push(this.createButton(cx, 200 + index * 60, `${card.name} (${card.type})`, () => {
        card.upgraded = true;
        if (card.value !== undefined) card.value += 3;
        card.effects.forEach((effect) => {
          if (effect.type === 'damage' || effect.type === 'block') effect.value += 3;
          if (effect.type === 'draw') effect.value += 1;
        });
        RunManager.commitRunState();
        this.finish(`Drilled ${card.name}`);
      }));
    });

    this.optionContainers.push(this.createTextButton(cx, 610, 'Back', () => this.renderRoot()));
  }

  private renderMeditate(): void {
    this.mode = 'meditate';
    this.clearOptions();

    const run = RunManager.getRunState();
    if (!run) return;
    this.addSectionTitle('Meditate: choose a discipline option');

    const cx = Math.round(this.scale.width / 2);
    this.optionContainers.push(this.createButton(cx, 190, 'Remove a card from the deck', () => {
      this.renderCardSelection('Choose a card to remove', (cardId, cardName) => {
        RunManager.removeCardFromDeck(cardId);
        this.finish(`Removed ${cardName}`);
      });
    }));

    this.optionContainers.push(this.createButton(cx, 270, 'Exhaust one card for next combat only', () => {
      this.renderCardSelection('Choose a card to exhaust next combat', (cardId, cardName) => {
        RunManager.prepareNextCombat({ temporaryExhaustCardId: cardId });
        this.finish(`${cardName} will be exhausted for the next combat`);
      });
    }));

    this.optionContainers.push(this.createTextButton(cx, 610, 'Back', () => this.renderRoot()));
  }

  private renderReorganize(): void {
    this.mode = 'reorganize';
    this.clearOptions();

    this.addSectionTitle('Reorganize: choose a next-combat benefit');

    const cx = Math.round(this.scale.width / 2);
    this.optionContainers.push(this.createButton(cx, 190, '+1 Energy per turn next combat', () => {
      RunManager.prepareNextCombat({ energyPerTurnBonus: 1 });
      this.finish('Prepared extra energy for the next combat');
    }));

    this.optionContainers.push(this.createButton(cx, 270, 'Start next combat with +1 Command', () => {
      RunManager.prepareNextCombat({ startStatuses: [createStatus('command', 1)] });
      this.finish('Prepared starting Command for the next combat');
    }));

    this.optionContainers.push(this.createButton(cx, 350, 'Start next combat Entrenched', () => {
      RunManager.prepareNextCombat({ startStatuses: [createStatus('entrenched', 1)] });
      this.finish('Prepared Entrenched for the next combat');
    }));

    this.optionContainers.push(this.createTextButton(cx, 610, 'Back', () => this.renderRoot()));
  }

  private renderCardSelection(title: string, onSelect: (cardId: string, cardName: string) => void): void {
    this.clearOptions();
    const run = RunManager.getRunState();
    if (!run) return;

    this.addSectionTitle(title);
    const cx = Math.round(this.scale.width / 2);
    run.deck.slice(0, 7).forEach((card, index) => {
      this.optionContainers.push(this.createButton(cx, 180 + index * 58, `${card.name} (${card.type})`, () => onSelect(card.id, card.name)));
    });
    this.optionContainers.push(this.createTextButton(cx, 610, 'Back', () => {
      if (this.mode === 'meditate') this.renderMeditate();
      else if (this.mode === 'drill') this.renderDrill();
      else this.renderRoot();
    }));
  }

  private addSectionTitle(text: string): void {
    const cx = Math.round(this.scale.width / 2);
    const label = this.add.text(cx, 140, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#cccccc',
    }).setOrigin(0.5);
    const container = this.add.container(0, 0, [label]);
    this.optionContainers.push(container);
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 520, 52, 0x000000, 1).setStrokeStyle(2, 0x333333);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      wordWrap: { width: 470 },
      align: 'center',
    }).setOrigin(0.5);
    btn.add([bg, text]);
    btn.setSize(520, 52);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => bg.setFillStyle(0x111111));
    btn.on('pointerout', () => bg.setFillStyle(0x000000));
    btn.on('pointerdown', onClick);
    return btn;
  }

  private createTextButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5);
    container.add(text);
    container.setSize(180, 30);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => text.setColor('#ffffff'));
    container.on('pointerout', () => text.setColor('#888888'));
    container.on('pointerdown', onClick);
    return container;
  }

  private finish(message?: string): void {
    if (message && this.messageText) {
      this.messageText.setText(message);
    }
    this.time.delayedCall(message ? 700 : 100, () => {
      this.cameras.main.fadeOut(400, 0x000000);
      this.time.delayedCall(400, () => this.scene.start('MapScene'));
    });
  }
}

