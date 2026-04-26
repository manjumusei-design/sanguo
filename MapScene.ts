import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';
import { GameSession } from '../core/GameSession';
import type { MapNode, MapGraph, CharacterId } from '../types';
import { getReachableNodes } from '../systems/MapGenerator';
import { GameDebug } from '../systems/GameDebug';
import { PointerDebug } from '../systems/PointerDebug';
import { getCard } from '../data/cards';
import { getRelic, relicRegistry } from '../data/relics';
import { getCharacter } from '../data/characters';
import { trace } from '../core/DebugTrace';
import { getRNG } from '../core/SeedUtils';
import { getStoryActSpine, resolveStoryBeatVariant, type StoryBeat } from '../data/story/spine';


interface NodeVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  nodeId: string;
}

interface PathVisual {
  graphics: Phaser.GameObjects.Graphics;
  fromId: string;
  toId: string;
}

type NodeState = 'LOCKED' | 'AVAILABLE' | 'VISITED' | 'CURRENT';

export class MapScene extends Phaser.Scene {
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private playerToken!: Phaser.GameObjects.Container;
  private nodeVisuals: NodeVisual[] = [];
  private pathVisuals: PathVisual[] = [];
  private promptNodeChoice = false;
  private hudPreviewMode = false;
  private nodePromptBanner: Phaser.GameObjects.Container | null = null;

  // Two-camera system: main camera for map, uiCamera for fixed UI
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private uiObjects: Phaser.GameObjects.GameObject[] = [];
  private nodeInfoPanel: Phaser.GameObjects.Container | null = null;
  private nodeInfoTitle: Phaser.GameObjects.Text | null = null;
  private nodeInfoBody: Phaser.GameObjects.Text | null = null;

  // Camera interaction
  private dragStart: { x: number; y: number } | null = null;
  private isDragging = false;
  private readonly DRAG_THRESHOLD = 8;
  private readonly MIN_ZOOM = 0.5;
  private readonly MAX_ZOOM = 2.0;

	//Pen 
	private drawingGraphics!: Phaser.GameObjects.Graphics;
	private strokes: Array<Array<{ x: number; y: number }>> = [];
	private currentStroke: Array<{ x: number; y: number }> | null = null;
	private penMode = false;
	private penButtonText: Phaser.GameObjects.Text | null = null;

	
	private preludeMode = false;
  private preludeCharacterId?: string;
  private preludeStateSnapshot?: import('../systems/PreludeEngine').SerializedPreludeState;
  private preludeMap?: import('../types').MapGraph;
  private preludePendingNodeId: string | null = null;
  private autoResolveNodeId: string | null = null;

	// Layout constants for the map
  private readonly MAP_W = 2800;
  private readonly MAP_H = 980;
  private readonly PAD_X = 100;
  private readonly PAD_Y = 90;
	constructor() {
		super({key: 'MapScene'});	
	}

  init(data?: {
    promptNodeChoice?: boolean;
    preludeMode?: boolean;
    preludeCharacterId?: string;
    preludeState?: import('../systems/PreludeEngine').SerializedPreludeState;
    hudPreviewMode?: boolean;
    autoResolveNodeId?: string;
  }): void {
    this.promptNodeChoice = Boolean(data?.promptNodeChoice);
    this.preludeMode = Boolean(data?.preludeMode);
    this.preludeCharacterId = data?.preludeCharacterId;
    this.preludeStateSnapshot = data?.preludeState;
    this.hudPreviewMode = Boolean(data?.hudPreviewMode);
    this.autoResolveNodeId = data?.autoResolveNodeId ?? null;
  }

	async create(): Promise<void> {
		const w = this.scale.width;
		const h = this.scale.height;
		const cx = Math.round(w / 2);
		const cy = Math.round(h / 2);

    this.cameras.main.setBackgroundColor(0xd4c5a9);
    this.cameras.main.setBounds(-2000, -1500, this.MAP_W + 4000, this.MAP_H + 3000);
    this.cameras.main.cullPaddingX = 600;
    this.cameras.main.cullPaddingY = 600;
    this.uiCamera = this.cameras.add(0, 0, w, h);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);
    this.uiCamera.setBackgroundColor('rgba(0,0,0,0)');
    this.uiCamera.transparent = true;

		this.setupCameraInput();
		this.drawParchmentBackground(cx, cy, w, h);

		if (this.preludeMode) {
			await this.createPreludeMap(cx, cy);
			return;
		}
		
		const run = RunManager.getRunState();
		if (!run) {
      console.warn('[MapScene] No run state found, returning to menu');	
			this.scene.start('MenuScene');
			return;
	}
	if (!run.currentMap?.nodes?.length) {
			console.warn ('No run state found, return to menu');
			const regenerated = RunManager.startRun(run.character, run.seed);
			if (!regenerated.currentMap?.nodes?.length) {
				this.scene.start('MenuScene');
				return;
			}
		}

    console.log('[MapScene] create()', {
			act: run.act,
			currentNode: run.currentNode,
			promptNodeChoice: this.promptNodeChoice,
			nodeCount: run.currentMap.nodes.length,
		});
		
		if (import.meta.env.DEV) 
			GameDebug.setSceneContext('MapScene', () => {
				const latestRun = RunManager.getRunState();
				const currentMap = latestRun?.currentMap;
				const reachable = currentMap ? getReachableNodes(currentMap, latestRun?.currentNode ?? null) : [];
				return {
          act: latestRun?.act ?? null,
          seed: latestRun?.seed ?? null,
          currentNode: latestRun?.currentNode ?? null,
					reachableNodeIds: reachable.map((node) => node.id),
					mapDebug: currentMap?.debug ?? null,
					currentShop: latestRun?.currentShop
					? {
						cardIds: [...latestRun.currentShop.cardIds],
						relicIds: [...latestRun.currentShop.relicsIds],
						rerollCount:latestRun.currentShop.rerollCount,
						purgeCost: latestRun.purgeCost,
					}
            : null,
        };
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => GameDebug.clearSceneContext('MapScene'));
    }

		if (!this.hudPreviewMode) {
			this.scene.launch('HUDScene');
			this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
				this.scene.stop('HUDScene');
			});
		}

    this.mapGraphics = this.add.graphics();
    this.renderMap(run.currentMap, run.currentNode, true);
    this.centerCameraOnCurrent(run.currentMap, run.currentNode);

    this.drawingGraphics = this.add.graphics();
    this.drawingGraphics.setDepth(50);
    this.uiCamera.ignore(this.drawingGraphics);

    // Legend index and pen toggle 
    this.createLegendPanel();
    this.createPenToggle();
    this.createResetViewButton();
    this.createNodePromptBanner();

		if (this.autoResolveNodeId) {
			const queuedNodeId = this.autoResolveNodeId;
			this.autoResolveNodeId = null;
			this.time.delayedCall(30, () => this.resolveQueuedNode(queuedNodeId));
		}

    if (import.meta.env.DEV) {
      PointerDebug.install(this);
    }
  }

  private registerUiObject(obj: Phaser.GameObjects.GameObject): void {
    this.uiObjects.push(obj);
    this.cameras.main.ignore(obj);
  }

  private async createPreludeMap(cx: number, cy: number): Promise<void> {
    const { loadPrelude, buildPreludeMap } = await import('../systems/PreludeEngine');

    if (!this.preludeCharacterId || !this.preludeStateSnapshot) {
      console.warn('[MapScene] prelude mode missing data');
      this.scene.start('MenuScene');
      return;
    }

    const config = await loadPrelude(this.preludeCharacterId as import('../types').CharacterId);
    const map = buildPreludeMap(config);
    this.preludeMap = map;