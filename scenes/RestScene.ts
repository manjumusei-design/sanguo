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
    this.scene.launch('HUDScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('HUDScene');
    });
    this.renderRoot();
  }

  private clearOptions(): void {
    this.children.removeAll(true);
    this.optionContainers = [];
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    this.add.rectangle(cx, Math.round(h / 2), w, h, 0x000000);
    this.add.text(cx, 70, '🏕️ Rest Site', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '34px',
      color: '#ff9955',
    }).setOrigin(0.5);
    this.add.text(cx, 112, 'Recover, refine the deck, or prepare the next battle.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#cbd5e1',
    }).setOrigin(0.5);
    this.messageText = this.add.text(cx, h - 80, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#4ade80',
    }).setOrigin(0.5);
  }

  private renderRoot(): void {
    this.mode = 'root';
    this.clearOptions();
  }

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

    this.optionContainers.push(this.createTextButton(640, 580, 'Leave', () => this.finish()));
  }

  private renderDrill(): void {
    this.mode = 'drill';
    this.clearOptions();

    const run = RunManager.getRunState();
    const upgradable = run?.deck.filter((card) => !card.upgraded) ?? [];
    this.addSectionTitle('Choose a card to upgrade');

    upgradable.slice(0, 6).forEach((card, index) => {
      this.optionContainers.push(this.createButton(640, 200 + index * 60, `${card.name} (${card.type})`, () => {
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

    this.optionContainers.push(this.createTextButton(640, 610, 'Back', () => this.renderRoot()));
  }