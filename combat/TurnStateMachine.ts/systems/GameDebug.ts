import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { SaveManager } from '../core/SaveManager';
import { getLastEventSelectionDebug } from './EventSelector';
import { eliteEncounterPresets, getBossEncounterPreset } from '../data/campaign';

type DebugProvider = () => unknown;

class _GameDebug {
  private initialized = false;
  private currentScene = 'unknown';
  private sceneProvider: DebugProvider | null = null;

  init(): void {
    if (this.initialized || !import.meta.env.DEV) return;
    this.initialized = true;

    (window as unknown as Record<string, unknown>).__debugGame = {
      help: () => this.printHelp(),
      current: () => this.logCurrent(),
      run: () => this.logRun(),
      save: () => this.logSave(),
      keys: async () => this.logKeys(),
      event: () => this.logEvent(),
      selection: () => this.logSelection(),
      ui: () => this.logUi(),
      forceElite: (id?: string) => this.forceElite(id),
      forceBoss: (act?: number, character?: string) => this.forceBoss(act, character),
      state: () => this.logAll(),
    };
  }

  setSceneContext(sceneKey: string, provider?: DebugProvider): void {
    if (!import.meta.env.DEV) return;
    this.currentScene = sceneKey;
    this.sceneProvider = provider ?? null;
  }

  clearSceneContext(sceneKey?: string): void {
    if (!import.meta.env.DEV) return;
    if (!sceneKey || this.currentScene === sceneKey) {
      this.currentScene = 'unknown';
      this.sceneProvider = null;
    }
  }

  private logCurrent(): void {
    console.group('🔎 Current Scene Debug');
    console.log('Scene:', this.currentScene);
    if (this.sceneProvider) {
      console.log('Context:', this.sceneProvider());
    } else {
      console.log('Context: none registered');
    }
    console.groupEnd();
  }

  private logRun(): void {
    console.group('🏃 Run Debug');
    console.log(RunManager.getDebugSnapshot());
    console.groupEnd();
  }

  private logSave(): void {
    console.group('💾 Save Debug');
    console.log({
      ...SaveManager.getDebugInfo(),
      activeRunPresent: Boolean(RunManager.getRunState()),
    });
    console.groupEnd();
  }

  private async logKeys(): Promise<void> {
    console.group('🗃 Save Keys');
    console.log(await SaveManager.listKeys());
    console.groupEnd();
  }

  private logEvent(): void {
    const run = RunManager.getRunState();
    console.group('📜 Event Debug');
    console.log({
      eventHistoryTail: run?.eventHistory.slice(-10) ?? [],
      lastSelection: getLastEventSelectionDebug(),
      currentScene: this.currentScene,
      sceneContext: this.sceneProvider ? this.sceneProvider() : null,
    });
    console.groupEnd();
  }

  private logSelection(): void {
    console.group('🎯 Event Selection Debug');
    console.log(getLastEventSelectionDebug());
    console.groupEnd();
  }

  private logAll(): void {
    this.logSave();
    this.logRun();
    this.logEvent();
    this.logCurrent();
  }

  private logUi(): unknown {
    const ui = (window as unknown as { __debugUI?: { report?: () => unknown } }).__debugUI;
    if (!ui?.report) {
      console.warn('No UI debug reporter found');
      return null;
    }
    return ui.report();
  }

  private forceElite(id?: string): void {
    const run = RunManager.getRunState();
    const act = run?.act ?? 2;
    const preset = id
      ? eliteEncounterPresets.find((encounter) => encounter.id === id)
      : eliteEncounterPresets.find((encounter) => encounter.act === act);

    if (!preset) {
      console.warn('No authored elite encounter found', { id, act });
      return;
    }

    this.startCombatScene({
      runMode: Boolean(run),
      characterId: run?.character,
      enemyIds: preset.enemies,
    });
  }

  private forceBoss(act?: number, character?: string): void {
    const run = RunManager.getRunState();
    const targetAct = act ?? run?.act ?? 3;
    const targetCharacter = (character as 'liubei' | 'caocao' | 'sunquan' | undefined) ?? run?.character;
    const preset = getBossEncounterPreset(targetAct, targetCharacter);

    if (!preset) {
      console.warn('No authored boss encounter found', { act: targetAct, character: targetCharacter });
      return;
    }

    this.startCombatScene({
      runMode: Boolean(run),
      characterId: run?.character,
      enemyIds: preset.enemies,
    });
  }

  private startCombatScene(data: { runMode: boolean; characterId?: string; enemyIds: string[] }): void {
    const game = (window as unknown as { __TKPC_GAME?: Phaser.Game }).__TKPC_GAME;
    if (!game) {
      console.warn('No Phaser game instance exposed for debug scene forcing');
      return;
    }

    game.scene.start('CombatScene', data);
  }

  private printHelp(): void {
    console.log(`
🔧 __debugGame commands:
  .help()       — Show this message
  .current()    — Log current scene + scene-specific debug context
  .run()        — Log run snapshot
  .save()       — Log save backend / migration-facing info
  .keys()       — List save keys
  .event()      — Log event history + last selection debug
  .selection()  — Log the last event-selection reasoning snapshot
  .forceElite(id?) — Start an authored elite encounter immediately
  .forceBoss(act?, character?) — Start an authored boss encounter immediately
  .state()      — Log save + run + event + current scene together
    `);
  }
}

export const GameDebug = new _GameDebug();

declare global {
  interface Window {
    __debugGame: Record<string, (...args: unknown[]) => unknown>;
    __TKPC_GAME?: Phaser.Game;
  }
}
