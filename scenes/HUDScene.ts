import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { GameSession } from '../core/GameSession';
import type { Card, Relic } from '../types';


export class HUDScene extends Phaser.Scene {
  private hpText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private floorText!: Phaser.GameObjects.Text;
  private relicsContainer!: Phaser.GameObjects.Container;
  private potionContainer!: Phaser.GameObjects.Container;
  private topBarContainer!: Phaser.GameObjects.Container;
  private deckPanelContainer: Phaser.GameObjects.Container | null = null;
  private relicPanelContainer: Phaser.GameObjects.Container | null = null;
  private isDeckOpen = false;
  private refreshTimer!: Phaser.Time.TimerEvent;
  private mapPreviewSourceSceneKey: string | null = null;
  private hasLoggedRenderDebug = false;
  private lastRenderDebugMatch: boolean | null = null;
  private glossaryPanelContainer: Phaser.GameObjects.Container | null = null;
  private glossaryWheelHandler?: (
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
    dx: number,
    dy: number,
    dz: number
  ) => void;

  constructor() {
    super({ key: 'HUDScene' });
  }

  create(): void {
    const w = this.scale.width;
    const barH = 44;
    const cy = Math.round(barH / 2);
    this.topBarContainer = this.add.container(0, 0).setDepth(1200);

    const bar = this.add.graphics();
    // Slim STS-style top strip (remove oversized rounded panel).
    bar.fillStyle(0x000000, 1);
    bar.fillRect(0, 0, w, barH);
    bar.lineStyle(1, 0x8f7647, 0.55);
    bar.lineBetween(0, barH, w, barH);
    this.topBarContainer.add(bar);

    this.hpText = this.add.text(22, cy, '❤️ -- / --', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#f2e7d1',
    }).setOrigin(0, 0.5);
    this.topBarContainer.add(this.hpText);

    this.goldText = this.add.text(166, cy, '🪙 --', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#d8b06a',
    }).setOrigin(0, 0.5);
    this.topBarContainer.add(this.goldText);

    this.potionContainer = this.add.container(Math.round(w * 0.39), cy);
    this.topBarContainer.add(this.potionContainer);
    this.createPotionSlots();

    this.floorText = this.add.text(Math.round(w * 0.60), cy, 'Act - • Floor -', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#e8dcc8',
    }).setOrigin(0, 0.5);
    this.topBarContainer.add(this.floorText);

    this.relicsContainer = this.add.container(0, 0);
    this.topBarContainer.add(this.relicsContainer);

    const btnY = cy;

    // Map text button
    const mapBtn = this.add.text(w - 16, btnY, 'Map', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#e8dcc8',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    this.topBarContainer.add(mapBtn);

    mapBtn.on('pointerover', () => mapBtn.setStyle({ color: '#f0d5a3' }));
    mapBtn.on('pointerout', () => mapBtn.setStyle({ color: '#e8dcc8' }));
    mapBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.event instanceof MouseEvent && pointer.event.shiftKey) {
        this.toggleMapPreview();
        return;
      }
      this.goToMap();
    });

    // Deck text button
    const deckBtn = this.add.text(w - 70, btnY, 'Deck', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#e8dcc8',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    this.topBarContainer.add(deckBtn);

    const relicBtn = this.add.text(w - 126, btnY, 'Relics', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#e8dcc8',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    relicBtn.on('pointerover', () => relicBtn.setStyle({ color: '#f0d5a3' }));
    relicBtn.on('pointerout', () => relicBtn.setStyle({ color: '#e8dcc8' }));
    relicBtn.on('pointerdown', () => this.showRelicSummary());
    this.topBarContainer.add(relicBtn);

        const glossaryBtn = this.add.text(w - 190, btnY, 'Glossary', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#e8dcc8',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    glossaryBtn.on('pointerover', () => glossaryBtn.setStyle({ color: '#f0d5a3' }));
    glossaryBtn.on('pointerout', () => glossaryBtn.setStyle({ color: '#e8dcc8' }));
    glossaryBtn.on('pointerdown', () => this.toggleGlossaryPanel());
    this.topBarContainer.add(glossaryBtn);

    const settingsBtn = this.add.text(w - 270, btnY, '⚙️', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#e8dcc8',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerover', () => settingsBtn.setStyle({ color: '#f0d5a3' }));
    settingsBtn.on('pointerout', () => settingsBtn.setStyle({ color: '#e8dcc8' }));
    settingsBtn.on('pointerdown', () => this.toggleSettingsPanel());
    this.topBarContainer.add(settingsBtn);
    
    deckBtn.on('pointerover', () => deckBtn.setStyle({ color: '#f0d5a3' }));
    deckBtn.on('pointerout', () => deckBtn.setStyle({ color: '#e8dcc8' }));
    deckBtn.on('pointerdown', () => this.toggleDeckViewer());

    if (import.meta.env.DEV) {
      const keyboard = this.input.keyboard;
      if (keyboard) {
        const onCopyDebug = () => this.copyRenderDebugToClipboard();
        keyboard.on('keydown-F9', onCopyDebug);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
          keyboard.off('keydown-F9', onCopyDebug);
        });
      }
    }
    this.refreshStats();
    this.refreshTimer = this.time.addEvent({
      delay: 200,
      callback: () => this.refreshStats(),
      loop: true,
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.refreshTimer?.remove();
      if (this.glossaryWheelHandler) {
        this.input.off('wheel', this.glossaryWheelHandler);
        this.glossaryWheelHandler = undefined;
      }
    });
  }

  private refreshStats(): void {
    const session = GameSession.get();
    const run = RunManager.getRunState();
    const combatScene = this.scene.manager.isActive('CombatScene')
      ? (this.scene.get('CombatScene') as unknown as { combatState?: { player?: { hp: number; maxHp: number } } })
      : null;
    const combatPlayer = combatScene?.combatState?.player;

    if (session?.mode === 'prelude') {
      if (combatPlayer) {
        this.hpText.setText(`\u2764\uFE0F ${combatPlayer.hp} / ${combatPlayer.maxHp}`);
      } else {
        this.hpText.setText(`\u2764\uFE0F ${session.hp} / ${session.maxHp}`);
      }
      this.goldText.setText(`\u{1FA99} ${session.gold}`);
      this.floorText.setText('Prelude');


      this.updateRenderDebug();
      return;
    }

    if (!run) {
      this.hpText.setText('\u2764\uFE0F -- / --');
      this.goldText.setText('\u{1FA99} --');
      this.floorText.setText('No Run');
      this.updateRenderDebug();
      return;
    }

    if (combatPlayer) {
      this.hpText.setText(`\u2764\uFE0F ${combatPlayer.hp} / ${combatPlayer.maxHp}`);
    } else {
      this.hpText.setText(`\u2764\uFE0F ${run.hp} / ${run.maxHp}`);
    }
    this.goldText.setText(`\u{1FA99} ${run.gold}`);
    this.floorText.setText(this.getRunProgressLabel(run.act, run.currentNode));



    this.updateRenderDebug();
  }

  private createPotionSlots(): void {
    this.potionContainer.removeAll(true);
    const slotSpacing = 38;
    for (let i = 0; i < 3; i++) {
      const slot = this.add.container(i * slotSpacing, 0);
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 1);
      bg.fillRoundedRect(-14, -14, 28, 28, 8);
      bg.lineStyle(1, 0x7f6a45, 1);
      bg.strokeRoundedRect(-14, -14, 28, 28, 8);
      const icon = this.add.text(0, 0, '🧪', {
        fontSize: '13px',
        color: '#bcae93',
      }).setOrigin(0.5).setAlpha(0.45);
      const hit = this.add.rectangle(0, 0, 28, 28, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => this.showInlineHint('Potion slot (empty in current build)', this.scale.width * 0.39 + i * slotSpacing, 64));
      hit.on('pointerout', () => this.hideInlineHint());
      slot.add([bg, icon, hit]);
      this.potionContainer.add(slot);
    }
  }

  private getRunProgressLabel(act: number, currentNode: string | null): string {
    if (!currentNode) return `Act ${act} • Floor 1`;
    const match = currentNode.match(/^n_\d+_(\d+)_\d+$/);
    const floor = match ? Math.max(1, Number(match[1]) + 1) : 1;
    return `Act ${act} • Floor ${floor}`;
  }

  private hintText: Phaser.GameObjects.Text | null = null;

  private showInlineHint(text: string, x: number, y: number): void {
    this.hideInlineHint();
    this.hintText = this.add.text(x, y, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#e8dcc8',
      backgroundColor: '#1e1728',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(1400);
  }

  private hideInlineHint(): void {
    this.hintText?.destroy();
    this.hintText = null;
  }

  private showRelicSummary(): void {
    if (this.relicPanelContainer) {
      this.closeRelicSummary();
      return;
    }

    const session = GameSession.get();
    const run = RunManager.getRunState();
    const relics = session?.relics ?? run?.relics ?? [];
    const w = this.scale.width;
    const h = this.scale.height;
    const panel = this.add.container(0, 0).setDepth(1600);
    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x0d0b14, 1).setInteractive();
    backdrop.on('pointerdown', () => this.closeRelicSummary());
    panel.add(backdrop);

    const panelW = Math.min(560, w - 120);
    const panelH = Math.min(420, h - 120);
    const x = (w - panelW) / 2;
    const y = (h - panelH) / 2;
    const bg = this.add.rectangle(x + panelW / 2, y + panelH / 2, panelW, panelH, 0x000000, 1)
      .setStrokeStyle(2, 0x8f7647, 1);
    panel.add(bg);

    const title = this.add.text(x + 18, y + 14, 'Relics', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#f0d5a3',
      fontStyle: 'bold',
    });
    panel.add(title);

    const close = this.add.text(x + panelW - 16, y + 14, '\u2715', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#cdb78a',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closeRelicSummary());
    panel.add(close);

    if (relics.length === 0) {
      panel.add(this.add.text(x + 18, y + 50, 'No relics yet.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#baa98d',
      }));
    } else {
      const contentX = x + 18;
      const contentY = y + 48;
      const contentW = panelW - 36;
      const contentH = panelH - 66;
      const list = this.createScrollableList(panel, contentX, contentY, contentW, contentH, 1601);
      list.setItems(relics.map((r) => ({ title: r.name, description: r.description })));
    }

    this.relicPanelContainer = panel;
  }

  private closeRelicSummary(): void {
    this.relicPanelContainer?.destroy(true);
    this.relicPanelContainer = null;
  }

  private updateRenderDebug(): void {
    const snapshot = this.getRenderDebugSnapshot();
    const backingBufferMatch = snapshot.backingBufferMatch;
    const shouldLogRenderDebug = !this.hasLoggedRenderDebug || this.lastRenderDebugMatch !== backingBufferMatch;
    this.hasLoggedRenderDebug = true;
    this.lastRenderDebugMatch = backingBufferMatch;

    if (import.meta.env.DEV && shouldLogRenderDebug) {
      console.log('[RenderDebug]', snapshot);
    }
  }

  private copyRenderDebugToClipboard(): void {
    const text = this.getRenderDebugString();
    if (!text) return;

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(() => {
        this.showInlineHint(`Copied debug: ${text}`, this.scale.width * 0.5, 72);
      }).catch(() => {
        console.log('[HUDScene] Render debug:', text);
        this.showInlineHint(`Clipboard blocked. Logged debug to console.`, this.scale.width * 0.5, 72);
      });
      return;
    }

    console.log('[HUDScene] Render debug:', text);
    this.showInlineHint(`Clipboard unavailable. Logged debug to console.`, this.scale.width * 0.5, 72);
  }

  private getRenderDebugSnapshot(): {
    dpr: number;
    renderRes: number;
    liveRes: number;
    canvas: { width: number; height: number };
    client: { width: number; height: number };
    gl: { width: number; height: number };
    renderer: { width: number; height: number };
    gameSize: { width: number; height: number };
    displaySize: { width: number; height: number };
    zoom: number;
    expected: { width: number; height: number };
    backingBufferMatch: boolean;
  } {
    const dpr = window.devicePixelRatio || 1;
    const game = this.game;
    const canvas = game.canvas;
    const gameSize = game.scale.gameSize;
    const displaySize = game.scale.displaySize;
    const renderer = game.renderer as unknown as {
      config?: { resolution?: number };
      resolution?: number;
      width?: number;
      height?: number;
      gl?: { drawingBufferWidth: number; drawingBufferHeight: number };
    };
    const renderRes = renderer?.config?.resolution ?? 1;
    const liveRes = renderer?.resolution ?? renderRes;
    const clientW = canvas.clientWidth;
    const clientH = canvas.clientHeight;
    const glW = renderer?.gl?.drawingBufferWidth ?? 0;
    const glH = renderer?.gl?.drawingBufferHeight ?? 0;
    const rw = renderer?.width ?? 0;
    const rh = renderer?.height ?? 0;
    const expectedPhysicalW = Math.round(clientW * dpr);
    const expectedPhysicalH = Math.round(clientH * dpr);
    const backingBufferMatch = canvas.width === expectedPhysicalW && canvas.height === expectedPhysicalH;

    return {
      dpr,
      renderRes,
      liveRes,
      canvas: { width: canvas.width, height: canvas.height },
      client: { width: clientW, height: clientH },
      gl: { width: glW, height: glH },
      renderer: { width: rw, height: rh },
      gameSize: { width: gameSize.width, height: gameSize.height },
      displaySize: { width: displaySize.width, height: displaySize.height },
      zoom: this.cameras.main.zoom,
      expected: { width: expectedPhysicalW, height: expectedPhysicalH },
      backingBufferMatch,
    };
  }

  private getRenderDebugString(): string {
    const snapshot = this.getRenderDebugSnapshot();
    return `DBG DPR:${snapshot.dpr.toFixed(2)} res:${snapshot.renderRes.toFixed(2)} liveRes:${snapshot.liveRes.toFixed(2)} canvas:${snapshot.canvas.width}x${snapshot.canvas.height} client:${snapshot.client.width}x${snapshot.client.height} gl:${snapshot.gl.width}x${snapshot.gl.height} r:${snapshot.renderer.width}x${snapshot.renderer.height} view:${snapshot.gameSize.width}x${snapshot.gameSize.height} display:${snapshot.displaySize.width}x${snapshot.displaySize.height} zoom:${snapshot.zoom.toFixed(2)} expect:${snapshot.expected.width}x${snapshot.expected.height} match:${snapshot.backingBufferMatch}`;
  }

  private goToMap(): void {
    if (this.scene.manager.isActive('MapScene')) {
      console.log('[HUDScene] goToMap: already on MapScene');
      return;
    }

    const activeKey = this.getActiveGameplayScene();
    if (!activeKey) {
      console.warn('[HUDScene] goToMap: no active gameplay scene found');
      return;
    }

    const session = GameSession.get();
    if (session?.mode === 'prelude') {
      if (!session.preludeCharacterId || !session.preludeState) {
        console.warn('[HUDScene] goToMap: missing prelude data');
        return;
      }
      console.log('[HUDScene] goToMap: transitioning from', activeKey, 'to prelude map');
      const activeScene = this.scene.get(activeKey);
      if (activeScene) {
        activeScene.cameras.main.fadeOut(300, 0x000000);
        activeScene.time.delayedCall(300, () => {
          this.scene.stop(activeKey);
          this.scene.start('MapScene', {
            preludeMode: true,
            preludeCharacterId: session.preludeCharacterId,
            preludeState: session.preludeState,
          });
        });
      }
      return;
    }

    const run = RunManager.getRunState();
    if (!run) {
      console.warn('[HUDScene] goToMap: no active run');
      return;
    }

    console.log('[HUDScene] goToMap: transitioning from', activeKey);
    const activeScene = this.scene.get(activeKey);
    if (activeScene) {
      activeScene.cameras.main.fadeOut(300, 0x000000);
      activeScene.time.delayedCall(300, () => {
        this.scene.stop(activeKey);
        this.scene.start('MapScene', { promptNodeChoice: true });
      });
    }
  }

  private toggleMapPreview(): void {
    if (this.scene.manager.isActive('MapScene') && this.mapPreviewSourceSceneKey) {
      this.returnFromMapPreview();
      return;
    }

    if (this.scene.manager.isActive('MapScene')) {
      return;
    }

    const activeKey = this.getActiveGameplayScene();
    if (!activeKey || activeKey === 'MapScene') {
      return;
    }

    const session = GameSession.get();
    this.mapPreviewSourceSceneKey = activeKey;
    this.scene.sleep(activeKey);

    if (this.scene.manager.isSleeping('MapScene')) {
      this.scene.wake('MapScene');
      return;
    }

    if (session?.mode === 'prelude' && session.preludeCharacterId && session.preludeState) {
      this.scene.launch('MapScene', {
        preludeMode: true,
        preludeCharacterId: session.preludeCharacterId,
        preludeState: session.preludeState,
        hudPreviewMode: true,
      });
      return;
    }

    this.scene.launch('MapScene', { promptNodeChoice: false, hudPreviewMode: true });
  }

  private returnFromMapPreview(): void {
    if (!this.mapPreviewSourceSceneKey) return;
    const source = this.mapPreviewSourceSceneKey;
    this.mapPreviewSourceSceneKey = null;
    this.scene.sleep('MapScene');
    this.scene.wake(source);
  }

  private getActiveGameplayScene(): string | null {
    const gameplayScenes = ['CombatScene', 'EventScene', 'RestScene', 'MerchantScene', 'RewardScene', 'PreludeScene', 'MapScene'];
    for (const key of gameplayScenes) {
      if (this.scene.manager.isActive(key)) return key;
    }
    return null;
  }

  private toggleDeckViewer(): void {
    if (this.isDeckOpen) {
      this.closeDeckViewer();
    } else {
      this.openDeckViewer();
    }
  }

  private openDeckViewer(): void {
    this.isDeckOpen = true;
    const session = GameSession.get();
    const run = RunManager.getRunState();
    const cards = session?.deck ?? run?.deck ?? [];

    const w = this.scale.width;
    const h = this.scale.height;
    const panelW = Math.min(520, w - 80);
    const panelH = Math.min(680, h - 100);
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    this.deckPanelContainer = this.add.container(0, 0);
    this.deckPanelContainer.setDepth(1000);

    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 1);
    backdrop.setInteractive();
    backdrop.on('pointerdown', () => this.closeDeckViewer());
    this.deckPanelContainer.add(backdrop);

    const panelBg = this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0x000000, 1)
      .setStrokeStyle(2, 0x8f7647, 1)
      .setDepth(1001);
    this.deckPanelContainer.add(panelBg);

    const title = this.add.text(panelX + panelW / 2, panelY + 18, 'Deck — ' + cards.length + ' cards', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#f0d5a3',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1002);
    this.deckPanelContainer.add(title);

    const closeBtn = this.add.text(panelX + panelW - 18, panelY + 18, '\u2715', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#5a4a35',
    }).setOrigin(1, 0.5).setDepth(1002).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeDeckViewer());
    this.deckPanelContainer.add(closeBtn);

    const listX = panelX + 20;
    const listY = panelY + 50;
    const listW = panelW - 40;
    const rowH = 30;
    const maxVisible = Math.floor((panelH - 70) / rowH);
    const detailPanel = this.add.rectangle(panelX + panelW / 2, panelY + panelH - 38, listW, 46, 0xe5dac6, 1)
      .setStrokeStyle(1, 0x8a7a60, 1)
      .setDepth(1002);
    this.deckPanelContainer.add(detailPanel);
    const detailText = this.add.text(panelX + 24, panelY + panelH - 50, 'Hover a card for details.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#5a4a35',
      wordWrap: { width: listW - 12 },
    }).setDepth(1003);
    this.deckPanelContainer.add(detailText);

    const displayCards = [...cards].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

    displayCards.forEach((card, i) => {
      if (i >= maxVisible) return;
      const y = listY + i * rowH;

      const rowBg = this.add.rectangle(listX + listW / 2, y + rowH / 2, listW, rowH - 3, 0xd4c5a9, 1)
        .setDepth(1001)
        .setInteractive({ useHandCursor: false });
      rowBg.on('pointerover', () => {
        rowBg.setFillStyle(0xcfbf9f, 1);
        detailText.setText(`${card.name} • ${card.type} • Cost ${card.cost}${card.upgraded ? ' • Upgraded' : ''}\n${card.description ?? 'No description available.'}`);
      });
      rowBg.on('pointerout', () => {
        rowBg.setFillStyle(0xd4c5a9, 1);
        detailText.setText('Hover a card for details.');
      });
      this.deckPanelContainer!.add(rowBg);

      const costText = this.add.text(listX + 10, y + rowH / 2, String(card.cost), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#d4a017',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(1002);
      this.deckPanelContainer!.add(costText);

      const nameText = this.add.text(listX + 36, y + rowH / 2, card.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#3a2e22',
      }).setOrigin(0, 0.5).setDepth(1002);
      this.deckPanelContainer!.add(nameText);

      let rightX = listX + listW - 10;

      if (entry.count > 1) {
        const countText = this.add.text(rightX, y + rowH / 2, '×' + entry.count, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#8a7e6b',
        }).setOrigin(1, 0.5).setDepth(1002);
        this.deckPanelContainer!.add(countText);
        rightX -= 36;
      }

      const typeText = this.add.text(rightX, y + rowH / 2, card.type, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#6b5b45',
      }).setOrigin(1, 0.5).setDepth(1002);
      this.deckPanelContainer!.add(typeText);

      if (card.upgraded) {
        const upText = this.add.text(listX + listW - 56, y + rowH / 2, '+', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#27ae60',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5).setDepth(1002);
        this.deckPanelContainer!.add(upText);
      }
    });

    if (entries.length > maxVisible) {
      const moreText = this.add.text(panelX + panelW / 2, panelY + panelH - 14,
        '+ ' + (entries.length - maxVisible) + ' more...', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#6b5b45',
        }).setOrigin(0.5).setDepth(1002);
      this.deckPanelContainer.add(moreText);
    }
  }

  private closeDeckViewer(): void {
    this.isDeckOpen = false;
    if (this.deckPanelContainer) {
      this.deckPanelContainer.destroy(true);
      this.deckPanelContainer = null;
    }
  }
}

  private createScrollableList(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number
  ): {
    container: Phaser.GameObjects.Container;
    setItems: (items: Array<{ title: string; description: string }>) => void;
    scrollBy: (dy: number) => void;
  } {
    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(x, y, width, height);
    maskGraphics.visible = false;
    const mask = maskGraphics.createGeometryMask();
    panel.add(maskGraphics);
    const container = this.add.container(XMLDocument, y).setDe[this(depth);
    container.setMask(mask);
    panel.add(container);

    let scrollY = 0
    let totalContentH = 0;

    const scrollbarX = x + width - 10;
    const track = this.add.rectangle(scrollbarX, y + height / 2, 4, height, 0x333333, 1).setDepth(depth + 1);
    const thumb = this.add.rectangle(scrollbarX, y + 12, 6, 24, 0x666666, 1).setDepth(depth + 1);
    panel.add([track, thumb]);

    const updateScroll = () => {
      if (totalContentH <= height) {
        thumb.setVisible(false);
        track.setVisible(false);
        scrollY =0;
      } else {
        thumb.setVisible(true);
        track.setVisible(true);
        scrollY = Math.max(0, Math.min(scrollY, totalContentH - height));
      }
      container.y =y - scrollY;
      if (totalContentH > height) {
        const maxScroll = totalContentH = height;
        const thumbPos = (scrollY / maxScroll) * (height - thumb.height) + y;
        thumb.y = y + thumb.height/ 2 + thumbPos;
      }
    };

    thumb.setInteractive({draggable: true, useHandCursor: true });
    thumb.on('drag', (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
      if (totalContentH <= height) {
        const maxScroll = totalContentH - height;
        const thumbPos = (scrollY / maxScroll) * (height - thumb.height);
        thumb.y = y + thumb.height / 2 + thumbPos;
      }
    });

    thumb.setInteractive({draggable: true, useHandCursor: true });
    thumb.on('drag', (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
      if (totalContentH <= height) return;
      const minY = y + thumb.height / 2;
      const maxY = y + height - thumb.height / 2;
      const clampedY = Math.max(minY, Math.min(maxY, dragY));
      thumb.y = clampedY;
      const ratio = (clampedY - minY) / (maxY = minY);
      scrollY = ratio * (totalContentH - height);
      container.y = y - scrollY;
    });

    const setItems = (items: Array< {title: string; description: string }>) => {
      container.removeAll(true);
      let currentY = 0;
      const rowH = 36;
      items.forEach((item) => {
        const titleText = this.add.text(0, currentY, item.title, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#e8dcc8',
          fontStyle: 'bold',
        }).setDepth(depth);
        const descText = this.add.texxt(0, currentY + 16, item..description, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color '#a09580',
          wordWrap: { width: width - 12 },
        }).setDepth(depth);
        container.add([titleText, descText]);
        current += rowH;
      });
      totalContentH = currentY;
      scrollY = 0;
      updateScroll();
    };

    const scrollBy = (dy: number) => {
      scrollY += dy * 0.6;
      updateScroll();
    };
    this.openGlossaryPanel();
  }

  private openGlossaryPanel(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const panelW = Math.min(560, w - 100);
    const panelH = Math.min(620, h - 100);
    const x = (w - panelW) / 2;
    const y = (h - panelH) / 2;

    const panel = this.add.container(0, 0).setDepth(1700);
    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.75).setInteractive();
    backdrop.on('pointerdown', () => this.closeGlossaryPanel());
    panel.add(backdrop);

    const bg = this.add.rectangle(x + panelW / 2, y + panelH / 2, panelW, panelH, 0x000000, 1)
      .setStrokeStyle(2, 0x666666, 1)
      .setInteractive();
    panel.add(bg);

    panel.add(this.add.text(x + 18, y + 14, 'Glossary', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    }));

    const close = this.add.text(x + panelW - 16, y + 14, '\u2715', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closeGlossaryPanel());
    panel.add(close);

    const glossaryData: Array<{ term: string; description: string; category: string }> = [
      {term: 'Valor', description: '+2 attack damage per stack this turn', category: 'Status'},
      {term: 'Formation', description: '+1 block gained per stack this turn', category: 'Status'},
      {term: 'Exposed', description: 'Take 50% more damage this turn', category: 'Status'},
      {term: 'Disarmed', description: 'Deal 25% less attack damage this turn', category: 'Status'},
      {term: 'Burning', description: 'Take damage equal to stacks, then lose 1 stack', category: 'Status'},
      {term: 'Bleed', description: 'Take half stacks damage at end of turn, then lose 1 stack', category: 'Status'},
      {term: 'Broken Formation', description: 'Block gained is halved this turn', category: 'Status'},
      {term: 'Entrenched', description: 'Retain 50% of block between turns', category: 'Status'},
      {term: 'Momentum', description: 'Stored attack bonus consumed on the next attack', category: 'Status'},
      {term: 'Command', description: 'Strategic resource generated by cards and powers', category: 'Status'},
      {term: 'Fire Setup', description: 'Your next Burning effect is amplified', category: 'Status'},
      {term: 'Panic', description: 'First card each turn costs 1 more energy', category: 'Status'},
      {term: 'Supply Shortage', description: 'Cannot gain Momentum or Command', category: 'Status'},
      {term: 'Isolated', description: 'Takes bonus damage from single-target attacks', category: 'Status'},
      {term: 'Insight', description: 'Future deck manipulation support', category: 'Status'},
      {term: 'Guarded', description: 'Negates the next debuff', category: 'Status'},
      {term: 'Revealed', description: 'True target exposed; illusions no longer conceal it', category: 'Status'},
      {term: 'Evade', description: 'Negates one incoming hit per stack', category: 'Status'},
      {term: 'Starving', description: '-1 Energy next turn', category: 'Status'},
      {term: 'Low Morale', description: 'Deal 25% less attack damage this turn', category: 'Status'},
      {term: 'Fire', description: 'Take 3 damage per stack, then lose 1 stack', category: 'Status'},
      {term: 'Encircled', description: 'Cannot gain block', category: 'Status'},
      {term: 'Rallied', description: 'Gain +2 attack damage and +2 block this turn', category: 'Status'},
      {term: 'Frost', description: '-1 Energy next turn', category: 'Status'},
      {term: 'Poison', description: 'Take damage equal to stacks, then lose 1 stack', category: 'Status'},
      {term: 'Strength', description: '+2 damage per stack', category: 'Status'},
      {term: 'Weak', description: 'Deal 25% less damage this turn', category: 'Status'},
      {term: 'Vulnerable', description: 'Take 50% more damage this turn', category: 'Status'},
      {term: 'Exhaust', description: 'Removed from your deck for the rest of the combat.', category: 'Keyword'},
      {term: 'Retain', description: 'Not discarded at end of turn; kept in hand.', category: 'Keyword'},
      {term: 'Fleeting', description: 'Discarded from hand at end of turn into the exhaust pile.', category: 'Keyword'},
      {term: 'Upgraded', description: 'Enhanced version of the card with stronger effects.', category: 'Keyword'},
      {term: 'Power', description: 'A card type that provides a persistent passive benefit for the rest of combat.', category: 'Keyword'},
      {term: 'Damage', description: 'Deal damage to the target.', category: 'Effect'},
      {term: 'Block', description: 'Gain Block to reduce incoming damage.', category: 'Effect'},
      {term: 'Draw', description: 'Draw cards from your draw pile.', category: 'Effect'},
      {term: 'Energy', description: 'Gain or lose Energy (Qi) to play cards.', category: 'Effect'},
      {term: 'Apply Status', description: 'Apply a status effect to the target.', category: 'Effect'},
      {term: 'Summon', description: 'Spawn an enemy unit into combat.', category: 'Effect'},
      {term: 'Attack', description: 'Deals damage to enemies.', category: 'Card Type'},
      {term: 'Skill', description: 'Provides block, draw, or utility effects.', category: 'Card Type'},
      {term: 'Power', description: 'Grants a persistent combat-long benefit.', category: 'Card Type'},
      {term: 'Status', description: 'A non-playable card added to your deck by effects.', category: 'Card Type'},
      {term: 'Curse', description: 'A harmful non-playable card that clutters your deck.', category: 'Card Type'},
    ];

    let activeCategory = 'Status';
    const contentX = x + 20;
    const contentY = y + 74;
    const contentW = panelW - 40;
    const contentH = panelH - 94;
    const list = this.createScrollableList(panel, contentX, contentY, contentW, contentH, 1701);
    bg.on('wheel', (_pointer: Phaser.Input.Pointer, _over: boolean, _dx: number, dy: number, _dz: number) => {
      list.scrollBy(dy);
    });

    const tabNames = ['Statuses', 'Keywords', 'Effects', 'Types'];
    const tabValues = ['Status', 'Keyword', 'Effect', 'Card Type'];
    const tabW = (panelW - 40) / tabNames.length;
    const tabY = y + 48;
    const tabTexts: Phaser.GameObjects.Text[] = [];

    const refreshTabs = () => {
      tabTexts.forEach((t, i) => {
        const isActive = tabValues[i] === activeCategory;
        t.setStyle({color:isActive ? '#ffffff' : '#888888', fontStyle: isActive ? 'bold' : 'normal' })
      });
    };

    const renderList = (category: string) => {
      const entries = glossaryData.filter((e) => e.category === category);
      list.setItems(entries.map((e) => ({ title: e.term, description: e.description })));
    };

    tabNames.forEach((name, i) => {
      const tx = x + 20 + i * tabW + tabW / 2;
      const tabText = this.add.text(tx, tabY, name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#8a7e6b',
      }).setOrigin(0.5).setDepth(1701).setInteractive({ useHandCursor: true });
      tabText.on('pointerdown', () => {
        activeCategory = tabValues[i];
        renderList(activeCategory);
        refreshTabs();
      });
      tabTexts.push(tabText);
      panel.add(tabText);
    });
    refreshTabs();
    renderList(activeCategory);

    this.glossaryPanelContainer = panel;
  }

  private closeGlossaryPanel(): void {
    this.glossaryPanelContainer?.destroy(true);
    this.glossaryPanelContainer = null;
  }
}