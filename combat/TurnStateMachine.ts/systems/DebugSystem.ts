import type { CombatState, Card, Relic, StatusId } from '../types';
import type { EffectQueue } from '../combat/EffectQueue';
import { createStatus } from '../combat/StatusSystem';

/**
 * DebugSystem — developer-only tools for testing combat.
 * Accessed via ` (backtick) key or console commands.
 */
export class DebugSystem {
  private combatState: CombatState;
  private effectQueue: EffectQueue;
  private overlayVisible = false;
  private overlayContainer: Phaser.GameObjects.Container | null = null;
  private scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    combatState: CombatState,
    effectQueue: EffectQueue
  ) {
    this.scene = scene;
    this.combatState = combatState;
    this.effectQueue = effectQueue;

    // Register global debug commands
    (window as unknown as Record<string, unknown>).__debugCombat = {
      state: () => this.logState(),
      draw: (count = 3) => this.forceDraw(count),
      hp: (amount: number) => this.modifyHP(amount),
      energy: (amount: number) => this.setEnergy(amount),
      block: (amount: number) => this.setBlock(amount),
      status: (id: StatusId, stacks = 1) => this.addStatus(id, stacks),
      kill: (index = 0) => this.killEnemy(index),
      heal: (amount = 999) => this.heal(amount),
      discard: () => this.logDiscard(),
      exhaust: () => this.logExhaust(),
      drawpile: () => this.logDrawPile(),
      hand: () => this.logHand(),
      spawnRelic: (relicId: string) => this.spawnRelic(relicId),
      turn: (phase: string) => this.skipToPhase(phase),
      help: () => this.printHelp(),
    };

    // Keyboard shortcut: ` to toggle overlay
    this.scene.input.keyboard?.on('keydown-BACKTICK', () => {
      this.toggleOverlay();
    });
  }

  // --- Console Commands ---

  private logState(): void {
    const p = this.combatState.player;
    console.group('⚔️ Combat State');
    console.log(`🧑 ${p.name}: ❤️${p.hp}/${p.maxHp} 🛡${p.block} ⚡${p.energy}`);
    console.log(`📚 Draw pile: ${this.combatState.drawPile.length} cards`);
    console.log(`🗑️ Discard pile: ${this.combatState.discardPile.length} cards`);
    console.log(`💀 Exhaust pile: ${this.combatState.exhaustPile.length} cards`);
    console.log(`🃏 Hand: ${this.combatState.hand.length} cards`);
    console.log(`👾 Enemies: ${this.combatState.enemies.filter((e) => e.hp > 0).length} alive`);
    console.groupEnd();
  }

  private forceDraw(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.combatState.drawPile.length === 0) {
        this.combatState.drawPile = Phaser.Utils.Array.Shuffle([
          ...this.combatState.discardPile,
        ]);
        this.combatState.discardPile = [];
      }
      if (this.combatState.drawPile.length > 0) {
        const card = this.combatState.drawPile.pop()!;
        this.combatState.hand.push(card);
        console.log(`🃏 Drew: ${card.name}`);
      }
    }
    console.log(`📦 Drew ${count} cards`);
  }

  private modifyHP(amount: number): void {
    this.combatState.player.hp = Math.max(
      0,
      Math.min(this.combatState.player.maxHp, this.combatState.player.hp + amount)
    );
    console.log(`❤️ Player HP: ${this.combatState.player.hp}/${this.combatState.player.maxHp}`);
  }

  private setEnergy(amount: number): void {
    this.combatState.player.energy = Math.max(0, amount);
    console.log(`⚡ Energy: ${this.combatState.player.energy}`);
  }

  private setBlock(amount: number): void {
    this.combatState.player.block = Math.max(0, amount);
    console.log(`🛡️ Block: ${this.combatState.player.block}`);
  }

  private addStatus(id: StatusId, stacks: number): void {
    const existing = this.combatState.player.statuses.find((s) => s.id === id);
    if (existing) {
      existing.stacks += stacks;
    } else {
      this.combatState.player.statuses.push(createStatus(id, stacks));
    }
    console.log(`🔮 Added ${id} (${stacks} stacks)`);
  }

  private killEnemy(index: number): void {
    const alive = this.combatState.enemies.filter((e) => e.hp > 0);
    if (alive[index]) {
      alive[index].hp = 0;
      console.log(`💀 Killed enemy: ${alive[index].name}`);
    } else {
      console.log(`❌ No enemy at index ${index}`);
    }
  }

  private heal(amount: number): void {
    this.combatState.player.hp = Math.min(
      this.combatState.player.maxHp,
      this.combatState.player.hp + amount
    );
    console.log(`💚 Healed to ${this.combatState.player.hp} HP`);
  }

  private logDiscard(): void {
    console.log('🗑️ Discard pile:', this.combatState.discardPile.map((c) => c.name));
  }

  private logExhaust(): void {
    console.log('💀 Exhaust pile:', this.combatState.exhaustPile.map((c) => c.name));
  }

  private logDrawPile(): void {
    console.log('📚 Draw pile:', this.combatState.drawPile.map((c) => c.name));
  }

  private logHand(): void {
    console.log('🃏 Hand:', this.combatState.hand.map((c) => c.name));
  }

  private spawnRelic(_relicId: string): void {
    console.log(`🏺 Relic spawning not yet implemented (relic system pending)`);
  }

  private skipToPhase(_phase: string): void {
    console.log(`⏭️ Phase skipping not yet implemented`);
  }

  private printHelp(): void {
    console.log(`
🔧 Debug Commands (use in browser console as __debugCombat.<cmd>):
  .state()          — Log full combat state
  .draw(n)          — Draw n cards
  .hp(amount)       — Modify HP (negative = damage)
  .energy(amount)   — Set energy
  .block(amount)    — Set block
  .status(id, n)    — Add status (starving|low_morale|fire|encircled|rallied)
  .kill(index)      — Kill enemy by index
  .heal(amount)     — Heal HP
  .discard()        — Log discard pile
  .exhaust()        — Log exhaust pile
  .drawpile()       — Log draw pile
  .hand()           — Log hand
  .positions()      — Log normalized positions of all UI elements
  .spawnRelic(id)   — Spawn relic
  .turn(phase)      — Skip to phase
  .help()           — This message

Press \` (backtick) to toggle debug overlay in-game.
Use __debugGame.help() for run/map/event/save snapshots.
    `);
  }

  // --- Debug Overlay ---

  private toggleOverlay(): void {
    this.overlayVisible = !this.overlayVisible;

    if (this.overlayVisible) {
      this.createOverlay();
    } else {
      this.destroyOverlay();
    }
  }

  private createOverlay(): void {
    if (this.overlayContainer) return;

    const container = this.scene.add.container(10, 10);
    container.setDepth(1000);

    const bg = this.scene.add.rectangle(0, 0, 350, 500, 0x000000, 0.7)
      .setOrigin(0);
    container.add(bg);

    const title = this.scene.add.text(10, 10, '🔧 DEBUG', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#00ff00',
    });
    container.add(title);

    // Combat state info
    const updateText = () => {
      const p = this.combatState.player;
      const lines = [
        `🧑 ${p.name}`,
        `❤️ HP: ${p.hp}/${p.maxHp}`,
        `🛡️ Block: ${p.block}`,
        `⚡ Energy: ${p.energy}`,
        `📚 Draw: ${this.combatState.drawPile.length}`,
        `🗑️ Discard: ${this.combatState.discardPile.length}`,
        `💀 Exhaust: ${this.combatState.exhaustPile.length}`,
        `🃏 Hand: ${this.combatState.hand.length}`,
        '',
        '🎮 Console:',
        '__debugCombat.help()',
        '',
        '⌨️ Press \` to close',
      ];

      infoText.setText(lines.join('\n'));
    };

    const infoText = this.scene.add.text(10, 40, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#00ff00',
    });
    container.add(infoText);

    updateText();

    // Update every frame
    this.scene.time.addEvent({
      delay: 500,
      callback: updateText,
      repeat: -1,
    });

    this.overlayContainer = container;
  }

  private destroyOverlay(): void {
    if (this.overlayContainer) {
      this.overlayContainer.destroy();
      this.overlayContainer = null;
    }
  }

  /**
   * Force a full re-render of the overlay (called when state changes).
   */
  refresh(): void {
    if (this.overlayContainer) {
      // Overlay auto-updates via timer
    }
  }
}

// Extend Window interface for debug commands
declare global {
  interface Window {
    __debugCombat: Record<string, (...args: unknown[]) => void>;
  }
}
