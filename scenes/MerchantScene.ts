import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { getCard } from '../data/cards';
import { getRelic } from '../data/relics';
import { generateShopInventory, getCardPrice, getRelicPrice } from '../systems/ShopGenerator';

export class MerchantScene extends Phaser.Scene {
  private optionContainers: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'MerchantScene' });
  }

  private ensureHUD(): void {
    if (this.scene.manager.isSleeping('HUDScene')) {
      this.scene.wake('HUDScene');
    } else if (!this.scene.manager.isActive('HUDScene')) {
      this.scene.launch('HUDScene');
    }
    this.scene.bringToTop('HUDScene');
    this.time.delayedCall(0, () => {
      if (this.scene.manager.isSleeping('HUDScene')) {
        this.scene.wake('HUDScene');
      } else if (!this.scene.manager.isActive('HUDScene')) {
        this.scene.launch('HUDScene');
      }
      this.scene.bringToTop('HUDScene');
    });
  }

  create(): void {
    this.shopEnterHookApplied = false;
    this.ensureHUD();
    this.applyShopEnterRelicHooks();
    this.renderShop();
  }

  private renderShop(message?: string): void {
    this.children.removeAll(true);
    this.optionContainers.forEach((container) => container.destroy());
    this.optionContainers = [];

    const run = RunManager.getRunState();
    if (!run) {
      this.scene.start('MenuScene');
      return;
    }

    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    const shopSeed = `${run.seed}::merchant::${run.currentNode}`;
    const inventory = run.currentShop ?? generateShopInventory(run.character, run.deck, shopSeed, 0);
    const shopPriceMultiplier = run.relics.some((relic) => relic.id === 'relic_scorched_map') ? 1.1 : 1;
    if (!run.currentShop) {
      RunManager.setShopInventory(inventory);
    }

    this.add.text(cx, 74, '🏪 Merchant', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '34px',
      color: '#f0c060',
    }).setOrigin(0.5);

    this.add.text(cx, 114, `铜钱: ${run.gold}   Purge: ${run.purgeCost}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffd700',
    }).setOrigin(0.5);

    if (message) {
      this.add.text(cx, 148, message, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#4ade80',
      }).setOrigin(0.5);
    }

    this.add.text(cx, 180, 'Cards', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#cbd5e1',
    }).setOrigin(0.5);

    inventory.cardIds.forEach((cardId, index) => {
      const card = getCard(cardId);
      if (!card) return;
      const price = Math.ceil(getCardPrice(cardId) * shopPriceMultiplier);
      this.optionContainers.push(this.createButton(cx, 220 + index * 54, `${card.name} (${card.type}) - ${price} 铜钱`, () => {
        if (run.gold < price) return;
        RunManager.modifyGold(-price);
        RunManager.addCardToDeck(card.id);
        RunManager.setShopInventory({
          ...inventory,
          cardIds: inventory.cardIds.filter((id) => id !== card.id),
        });
        this.renderShop(`Bought ${card.name}`);
      }));
    });

    this.add.text(cx, 520, 'Relics', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#cbd5e1',
    }).setOrigin(0.5);

    inventory.relicIds.forEach((relicId, index) => {
      const relic = getRelic(relicId);
      if (!relic) return;
      const price = Math.ceil(getRelicPrice(relicId) * shopPriceMultiplier);
      this.optionContainers.push(this.createButton(cx, 556 + index * 54, `${relic.name} - ${price} 铜钱`, () => {
        if (run.gold < price) return;
        RunManager.modifyGold(-price);
        RunManager.applyReward({ gold: 0, relicId });
        RunManager.setShopInventory({
          ...inventory,
          relicIds: inventory.relicIds.filter((id) => id !== relicId),
        });
        this.renderShop(`Bought ${relic.name}`);
      }));
    });

    const rightCol = Math.round(w * 0.8);
    const purgePrice = Math.ceil(run.purgeCost * shopPriceMultiplier);
    this.optionContainers.push(this.createButton(rightCol, 200, `Purge a card - ${purgePrice} 铜钱`, () => {
      if (run.gold < purgePrice) return;
      this.renderPurgeSelection();
    }, 260));

    const rerollPrice = Math.ceil(30 * shopPriceMultiplier);
    this.optionContainers.push(this.createButton(rightCol, 270, `Reroll shop - ${rerollPrice} 铜钱`, () => {
      if (run.gold < rerollPrice) return;
      RunManager.modifyGold(-rerollPrice);
      RunManager.setShopInventory(generateShopInventory(run.character, run.deck, shopSeed, inventory.rerollCount + 1));
      this.renderShop('Rerolled the merchant inventory');
    }, 260));

    this.optionContainers.push(this.createTextButton(rightCol, 340, 'Leave', () => {
      RunManager.clearShopInventory();
      this.cameras.main.fadeOut(400, 0x000000);
      this.time.delayedCall(400, () => this.scene.start('MapScene'));
    }));
  }

  private renderPurgeSelection(): void {
    this.children.removeAll(true);
    this.optionContainers.forEach((container) => container.destroy());
    this.optionContainers = [];

    const run = RunManager.getRunState();
    if (!run) return;
    const shopPriceMultiplier = run.relics.some((relic) => relic.id === 'relic_scorched_map') ? 1.1 : 1;
    const purgePrice = Math.ceil(run.purgeCost * shopPriceMultiplier);

    const w = this.scale.width;
    const h = this.scale.height;
    const cx = Math.round(w / 2);
    const rightCol = Math.round(w * 0.8);
    this.add.rectangle(cx, Math.round(h / 2), w, h, 0x000000);
    this.add.text(cx, 74, '🏪 Merchant', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '34px',
      color: '#f0c060',
    }).setOrigin(0.5);
    this.add.text(cx, 114, `铜钱: ${run.gold}   Purge: ${purgePrice}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffd700',
    }).setOrigin(0.5);

    this.add.text(rightCol, 180, 'Choose a card to purge', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#e5e7eb',
    }).setOrigin(0.5);

    run.deck.slice(0, 7).forEach((card, index) => {
      this.optionContainers.push(this.createButton(rightCol, 220 + index * 50, `${card.name} (${card.type})`, () => {
        RunManager.modifyGold(-purgePrice);
        RunManager.removeCardFromDeck(card.id);
        RunManager.increasePurgeCost();
        this.renderShop(`Purged ${card.name}`);
      }, 260));
    });

    this.optionContainers.push(this.createTextButton(1020, 620, 'Back', () => this.renderShop()));
  }

  private createButton(x: number, y: number, label: string, onClick: () => void, width = 520): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, 46, 0x000000, 1).setStrokeStyle(2, 0x333333);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      wordWrap: { width: width - 30 },
      align: 'center',
    }).setOrigin(0.5);
    btn.add([bg, text]);
    btn.setSize(width, 46);
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
      color: '#94a3b8',
    }).setOrigin(0.5);
    container.add(text);
    container.setSize(200, 30);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => text.setColor('#ffffff'));
    container.on('pointerout', () => text.setColor('#94a3b8'));
    container.on('pointerdown', onClick);
    return container;
  }
}
