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

  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private uiObjects: Phaser.GameObjects.GameObject[] = [];
  private nodeInfoPanel: Phaser.GameObjects.Container | null = null;
  private nodeInfoTitle: Phaser.GameObjects.Text | null = null;
  private nodeInfoBody: Phaser.GameObjects.Text | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private isDragging = false;
  private readonly DRAG_THRESHOLD = 8;
  private readonly MIN_ZOOM = 0.5;
  private readonly MAX_ZOOM = 2.0;

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

  private readonly MAP_W = 2800;
  private readonly MAP_H = 980;
  private readonly PAD_X = 100;
  private readonly PAD_Y = 90;
  constructor() {
    super({ key: 'MapScene' });
  }

  init(data?: {
    preludeMode?: boolean;
    preludeCharacterId?: string;
    preludeState?: import('../systems/PreludeEngine').SerializedPreludeState;
    hudPreviewMode?: boolean;
    autoResolveNodeId?: string;
  }): void {
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
    (this.cameras.main as any).cullPaddingX = 600;
    (this.cameras.main as any).cullPaddingY = 600;
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
      console.warn('[MapScene] currentMap missing nodes; regenerating act map');
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

    if (import.meta.env.DEV) {
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
                relicIds: [...latestRun.currentShop.relicIds],
                rerollCount: latestRun.currentShop.rerollCount,
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
    this.createLegendPanel();
    this.createPenToggle();
    this.createResetViewButton();

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

    // Sync session for HUD
    const char = getCharacter(this.preludeCharacterId as CharacterId);
    const deck = this.preludeStateSnapshot.deckIds.map((id) => getCard(id)!).filter(Boolean);
    const relics = this.preludeStateSnapshot.relicIds.map((id) => getRelic(id)).filter(Boolean) as import('../types').Relic[];
    GameSession.set({
      mode: 'prelude',
      hp: this.preludeStateSnapshot.hp ?? (char?.hp ?? 70),
      maxHp: this.preludeStateSnapshot.maxHp ?? (char?.hp ?? 70),
      gold: this.preludeStateSnapshot.gold ?? 0,
      deck,
      relics,
      preludeCharacterId: this.preludeCharacterId as CharacterId,
      preludeState: this.preludeStateSnapshot,
    });

    const currentIndex = this.preludeStateSnapshot.currentNodeIndex;
    // Player position is the last completed
    const currentNodeId = this.preludeStateSnapshot.lastCompletedNodeId
      ? (() => {
          const idx = config.nodes.findIndex((node) => node.id === this.preludeStateSnapshot?.lastCompletedNodeId);
          return idx >= 0 ? `prelude_${idx}` : null;
        })()
      : null;
    const pendingNodeId = map.nodes[currentIndex]?.id ?? null;
    this.preludePendingNodeId =
      pendingNodeId && pendingNodeId !== currentNodeId
        ? pendingNodeId
        : null;
    const reachable = getReachableNodes(map, currentNodeId);

    console.log('[MapScene] prelude map', {
      currentIndex,
      currentNodeId,
      pendingNodeId: this.preludePendingNodeId,
      reachableCount: reachable.length,
      totalNodes: map.nodes.length,
    });

    if (!this.hudPreviewMode) {
      this.scene.launch('HUDScene');
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.scene.stop('HUDScene');
      });
    }

    // Render map
    this.mapGraphics = this.add.graphics();
    this.renderMap(map, currentNodeId, true);
    this.centerCameraOnCurrent(map, currentNodeId);
    if (this.playerToken && this.preludePendingNodeId) {
      const pendingNode = map.nodes.find((node) => node.id === this.preludePendingNodeId);
      if (pendingNode) {
        const pos = this.mapToScreen(pendingNode.x, pendingNode.y);
        this.tweens.add({
          targets: this.playerToken,
          x: pos.x,
          y: pos.y,
          duration: 280,
          ease: 'Quad.easeOut',
        });
      }
    }

    // Drawing layer and UI overlays
    this.drawingGraphics = this.add.graphics();
    this.drawingGraphics.setDepth(50);
    this.uiCamera.ignore(this.drawingGraphics);
    this.createLegendPanel();
    this.createPenToggle();
    this.createResetViewButton();
  }

  private renderMap(map: MapGraph, currentNodeId: string | null, animate: boolean): void {
    this.clearMapVisuals();
    this.mapGraphics.clear();

    const reachable = getReachableNodes(map, currentNodeId);
    const reachableIds = new Set(reachable.map((n) => n.id));
    const current = currentNodeId ? map.nodes.find((n) => n.id === currentNodeId) ?? null : null;

    try {
      // Draw paths first (behind nodes)
      this.drawPaths(map, currentNodeId, reachableIds, animate);

      // Draw nodes
      for (const node of map.nodes) {
        const isCurrent = currentNodeId !== null && node.id === currentNodeId;
        const isReachable = reachableIds.has(node.id);
        const isPast = current ? this.isPastNode(map, current, node) : false;

        const visual = this.createNodeVisual(node, isCurrent, isReachable, isPast, animate);
        this.nodeVisuals.push(visual);

        if (isCurrent) {
          this.createPlayerToken(node);
        }
      }
    } catch (error) {
      console.error('[MapScene] renderMap failed; using emergency fallback nodes', error);
      this.clearMapVisuals();
      this.drawPaths(map, currentNodeId, reachableIds, false);
      for (const node of map.nodes) {
        const pos = this.mapToScreen(node.x, node.y);
        const fallback = this.add.container(pos.x, pos.y);
        const g = this.add.graphics();
        this.drawNodeShapeFallback(g, node.type, node.type === 'BOSS' ? 40 : 26, this.getNodeColor(node.type), 1, node.id === currentNodeId);
        fallback.add(g);
        this.nodeVisuals.push({ container: fallback, sprite: g, nodeId: node.id });
      }
    }

    this.uiCamera.ignore(this.mapGraphics);
    for (const pv of this.pathVisuals) {
      this.uiCamera.ignore(pv.graphics);
    }
    for (const v of this.nodeVisuals) {
      this.uiCamera.ignore(v.container);
    }
    if (this.playerToken) {
      this.uiCamera.ignore(this.playerToken);
    }
  }

  private clearMapVisuals(): void {
    this.nodeVisuals.forEach((v) => v.container.destroy(true));
    this.nodeVisuals = [];
    this.pathVisuals.forEach((pv) => pv.graphics.destroy());
    this.pathVisuals = [];
    if (this.playerToken) {
      this.playerToken.destroy(true);
    }
  }

  private drawBezier(
    g: Phaser.GameObjects.Graphics,
    startX: number,
    startY: number,
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void {
    const maybeBezier = (g as unknown as { bezierCurveTo?: (a: number, b: number, c: number, d: number, e: number, f: number) => void }).bezierCurveTo;
    if (typeof maybeBezier === 'function') {
      maybeBezier.call(g, cp1x, cp1y, cp2x, cp2y, x, y);
      return;
    }

    const points = new Phaser.Curves.CubicBezier(
      new Phaser.Math.Vector2(startX, startY),
      new Phaser.Math.Vector2(cp1x, cp1y),
      new Phaser.Math.Vector2(cp2x, cp2y),
      new Phaser.Math.Vector2(x, y)
    ).getPoints(18);
    for (const point of points) {
      g.lineTo(point.x, point.y);
    }
  }

  private buildPathPoints(
    from: { x: number; y: number },
    to: { x: number; y: number },
    curve?: { cp1x: number; cp1y: number; cp2x: number; cp2y: number }
  ): Phaser.Math.Vector2[] {
    if (!curve) {
      return [
        new Phaser.Math.Vector2(from.x, from.y),
        new Phaser.Math.Vector2(to.x, to.y),
      ];
    }

    return new Phaser.Curves.CubicBezier(
      new Phaser.Math.Vector2(from.x, from.y),
      new Phaser.Math.Vector2(curve.cp1x, curve.cp1y),
      new Phaser.Math.Vector2(curve.cp2x, curve.cp2y),
      new Phaser.Math.Vector2(to.x, to.y)
    ).getPoints(24);
  }

  private strokePathPoints(g: Phaser.GameObjects.Graphics, points: Phaser.Math.Vector2[]): void {
    if (!points.length) return;
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.strokePath();
  }

  private drawPaths(map: MapGraph, currentNodeId: string | null, reachableIds: Set<string>, animate: boolean): void {
    const nodeById = new Map(map.nodes.map((n) => [n.id, n]));
    const current = currentNodeId ? nodeById.get(currentNodeId) ?? null : null;
    const currentCol = current ? this.getColumnIndex(current) : -1;

    for (const from of map.nodes) {
      for (const toId of from.connections) {
        const to = nodeById.get(toId);
        if (!to) continue;

        const fromCol = this.getColumnIndex(from);
        const toCol = this.getColumnIndex(to);
        const isReachablePath = current !== null && current.id === from.id && reachableIds.has(toId);
        const isTakenPath = current !== null
          && !isReachablePath
          && fromCol < currentCol
          && toCol <= currentCol;
        const isFuturePath = !isReachablePath && !isTakenPath;

        const p1 = this.mapToScreen(from.x, from.y);
        const p2 = this.mapToScreen(to.x, to.y);
        const curve = from.curveData?.[toId];
        const cp1 = curve ? this.mapToScreen(curve.cp1x, curve.cp1y) : undefined;
        const cp2 = curve ? this.mapToScreen(curve.cp2x, curve.cp2y) : undefined;
        const pathPoints = this.buildPathPoints(
          p1,
          p2,
          cp1 && cp2 ? { cp1x: cp1.x, cp1y: cp1.y, cp2x: cp2.x, cp2y: cp2.y } : undefined
        );

        const pathG = this.add.graphics();
        const color = isReachablePath ? 0x7a4a1f : 0x8c8271;
        const thickness = isReachablePath ? 2 : 1;
        const targetAlpha = isTakenPath ? 0.9 : (isReachablePath ? 0.5 : 0.2);

        const drawAtAlpha = (alpha: number) => {
          pathG.clear();
          pathG.lineStyle(thickness, color, alpha);
          this.strokePathPoints(pathG, pathPoints);
        };
        drawAtAlpha(animate ? 0 : targetAlpha);

        this.pathVisuals.push({ graphics: pathG, fromId: from.id, toId });

        if (animate) {
          const delay = isFuturePath ? this.getColumnIndex(from) * 40 : this.getColumnIndex(from) * 60;
          this.tweens.add({
            targets: { a: 0 },
            a: targetAlpha,
            duration: 400,
            delay,
            ease: 'Quad.easeOut',
            onUpdate: (tween) => {
              drawAtAlpha(tween.getValue() ?? 0);
            },
          });
        }
      }
    }
  }

  private createNodeVisual(
    node: MapNode,
    isCurrent: boolean,
    isReachable: boolean,
    isPast: boolean,
    animate: boolean
  ): NodeVisual {
    const pos = this.mapToScreen(node.x, node.y);
    const color = this.getNodeColor(node.type);
    const isBoss = node.type === 'BOSS';
    const targetSize = isBoss ? 80 : 52;
    const state: NodeState = isCurrent
      ? 'CURRENT'
      : isReachable
        ? 'AVAILABLE'
        : isPast
          ? 'VISITED'
          : 'LOCKED';
    const alphaByState: Record<NodeState, number> = {
      VISITED: 0.4,
      AVAILABLE: 0.9,
      CURRENT: 1,
      LOCKED: 0.2,
    };
    const alpha = alphaByState[state];
    const textureKey = this.getNodeTextureKey(node.type);

    const container = this.add.container(pos.x, pos.y);
    container.setDepth(10 + this.getColumnIndex(node));

    if (state === 'AVAILABLE') {
      const halo = this.add.graphics();
      halo.fillStyle(0xd4a85c, 0.16);
      halo.fillCircle(0, 0, targetSize * 0.68);
      halo.lineStyle(1.5, 0xe3c27b, 0.4);
      halo.strokeCircle(0, 0, targetSize * 0.56);
      container.add(halo);
    }

    // Sprite
    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
    if (textureKey && this.textures.exists(textureKey)) {
      const source = this.textures.get(textureKey).getSourceImage() as { width?: number; height?: number } | undefined;
      const sourceWidth = Math.max(1, Number(source?.width ?? 0));
      const sourceHeight = Math.max(1, Number(source?.height ?? 0));
      const hasValidSource = Number.isFinite(sourceWidth) && Number.isFinite(sourceHeight) && (sourceWidth > 1 || sourceHeight > 1);
      if (hasValidSource) {
        const maxDim = Math.max(sourceWidth, sourceHeight);
        const scale = targetSize / maxDim;
        const img = this.add.image(0, 0, textureKey).setScale(scale).setAlpha(alpha);
        if (state === 'VISITED') {
          img.setTint(0x888888);
        }
        if (state === 'CURRENT') {
          img.setScale(scale * 1.1);
        }
        container.add(img);
        sprite = img;
      } else {
        const g = this.add.graphics();
        this.drawNodeShapeFallback(g, node.type, targetSize * 0.5, color, alpha, state === 'CURRENT');
        container.add(g);
        sprite = g;
      }
    } else {
      const g = this.add.graphics();
      this.drawNodeShapeFallback(g, node.type, targetSize * 0.5, color, alpha, state === 'CURRENT');
      container.add(g);
      sprite = g;
    }

    // indicator ring
    if (state === 'CURRENT') {
      const ring = this.add.graphics();
      ring.lineStyle(3, 0xf6e7c8, 1);
      ring.strokeCircle(0, 0, targetSize * 0.55);
      container.add(ring);
      if (animate) {
        this.tweens.add({
          targets: ring,
          alpha: 0.45,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    const visual: NodeVisual = { container, sprite, nodeId: node.id };

    const isSelectable = this.preludeMode
      ? (this.preludePendingNodeId ? node.id === this.preludePendingNodeId : isReachable)
      : isReachable;
    if (isSelectable && !this.hudPreviewMode) {
      container.setSize(targetSize, targetSize);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        trace('MAP', 'mapNodeClick', {
          nodeId: node.id,
          nodeType: node.type,
          pointerX: pointer.x,
          pointerY: pointer.y,
          worldX: pointer.worldX,
          worldY: pointer.worldY,
          cameraZoom: this.cameras.main.zoom,
          scrollX: this.cameras.main.scrollX,
          scrollY: this.cameras.main.scrollY,
        });
        this.animateSelectAndProceed(node, visual);
      });
    }

    // Entrance animation
    if (animate) {
      container.setScale(0);
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 350,
        delay: this.getColumnIndex(node) * 50,
        ease: 'Back.easeOut',
      });
    }

    return visual;
  }

  /** Fallback procedural shape when image asset is missing. */
  private drawNodeShapeFallback(
    g: Phaser.GameObjects.Graphics,
    type: string,
    size: number,
    color: number,
    alpha: number,
    isCurrent: boolean
  ): void {
    g.fillStyle(color, alpha);
    g.lineStyle(isCurrent ? 4 : 2, isCurrent ? 0xf6e7c8 : 0xd0b07a, alpha);

    switch (type) {
      case 'BATTLE':
        this.drawPolygonFallback(g, 0, 0, size, 8, -Math.PI / 8);
        break;
      case 'ELITE':
        this.drawPolygonFallback(g, 0, 0, size, 4, Math.PI / 4);
        break;
      case 'REST':
        g.fillRoundedRect(-size, -size, size * 2, size * 2, size * 0.35);
        g.strokeRoundedRect(-size, -size, size * 2, size * 2, size * 0.35);
        break;
      case 'MERCHANT':
        this.drawPolygonFallback(g, 0, 0, size, 6, 0);
        break;
      case 'MYSTERY':
        this.drawStarFallback(g, 0, 0, size, size * 0.45, 5);
        break;
      case 'TREASURE':
        g.fillRoundedRect(-size, -size * 0.8, size * 2, size * 1.6, size * 0.3);
        g.strokeRoundedRect(-size, -size * 0.8, size * 2, size * 1.6, size * 0.3);
        break;
      case 'BOSS':
        g.fillCircle(0, 0, size);
        g.strokeCircle(0, 0, size);
        g.lineStyle(2, 0xe74c3c, alpha * 0.7);
        g.strokeCircle(0, 0, size + 6);
        break;
      default:
        g.fillCircle(0, 0, size);
        g.strokeCircle(0, 0, size);
    }
  }

  private drawPolygonFallback(g: Phaser.GameObjects.Graphics, cx: number, cy: number, radius: number, sides: number, rotation: number): void {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = rotation + (i * 2 * Math.PI) / sides;
      points.push(new Phaser.Geom.Point(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
    }
    g.fillPoints(points, true, true);
    g.strokePoints(points, true, true);
  }

  private drawStarFallback(g: Phaser.GameObjects.Graphics, cx: number, cy: number, outerR: number, innerR: number, points: number): void {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      pts.push(new Phaser.Geom.Point(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
    }
    g.fillPoints(pts, true, true);
    g.strokePoints(pts, true, true);
  }

  private createPlayerToken(node: MapNode): void {
    const pos = this.mapToScreen(node.x, node.y);
    this.playerToken = this.add.container(pos.x, pos.y);
    this.playerToken.setDepth(100);

    if (this.textures.exists('token_player')) {
      const source = this.textures.get('token_player').getSourceImage() as HTMLImageElement;
      const maxDim = Math.max(source.width, source.height);
      const scale = 36 / maxDim;
      const img = this.add.image(0, 0, 'token_player').setScale(scale);
      this.playerToken.add(img);
    } else {
      // Fallback
      const run = RunManager.getRunState();
      const ring = this.add.graphics();
      ring.lineStyle(3, 0xf6e7c8, 1);
      ring.strokeCircle(0, 0, 22);
      this.playerToken.add(ring);
      const bg = this.add.circle(0, 0, 16, 0x1a1520, 1);
      this.playerToken.add(bg);
      const icon = this.add.text(0, 0, this.getCharacterEmoji(run?.character ?? 'caocao'), { fontSize: '20px' }).setOrigin(0.5);
      this.playerToken.add(icon);
    }

    // Idle bob
    this.tweens.add({
      targets: this.playerToken,
      y: pos.y - 4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private animateSelectAndProceed(node: MapNode, visual: NodeVisual): void {
    this.hideNodeInfo();
    this.tweens.add({
      targets: visual.container,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Move player along curve
    if (this.playerToken) {
      const start = this.mapToScreen(this.playerToken.x, this.playerToken.y);
      const end = this.mapToScreen(node.x, node.y);
      const run = RunManager.getRunState();
      const currentNodeId = run?.currentNode ?? null;
      const currentNode = currentNodeId ? run?.currentMap.nodes.find((n) => n.id === currentNodeId) : null;
      const curve = currentNode?.curveData?.[node.id];

      const tweenObj = { t: 0 };
      this.tweens.add({
        targets: tweenObj,
        t: 1,
        duration: 400,
        ease: 'Quad.easeInOut',
        onUpdate: () => {
          const t = tweenObj.t;
          let x: number, y: number;
          if (curve) {
            const p0 = start;
            const p1 = this.mapToScreen(curve.cp1x, curve.cp1y);
            const p2 = this.mapToScreen(curve.cp2x, curve.cp2y);
            const p3 = end;
            x = Phaser.Math.Interpolation.CubicBezier(t, p0.x, p1.x, p2.x, p3.x);
            y = Phaser.Math.Interpolation.CubicBezier(t, p0.y, p1.y, p2.y, p3.y);
          } else {
            x = Phaser.Math.Linear(start.x, end.x, t);
            y = Phaser.Math.Linear(start.y, end.y, t);
          }
          this.playerToken.setPosition(x, y);
        },
        onComplete: () => {
          this.selectNode(node);
        },
      });
    } else {
      this.selectNode(node);
    }
  }
//Helpers
  private mapToScreen(nx: number, ny: number): { x: number; y: number } {
    return {
      x: this.PAD_X + nx * this.MAP_W,
      y: this.PAD_Y + ny * this.MAP_H,
    };
  }

  private getColumnIndex(node: MapNode): number {
    const parts = node.id.split('_');
    return parseInt(parts[2] ?? '0', 10);
  }

  private isPastNode(map: MapGraph, current: MapNode, candidate: MapNode): boolean {
    const currentCol = this.getColumnIndex(current);
    const candidateCol = this.getColumnIndex(candidate);
    return candidateCol < currentCol;
  }

  private getNodeColor(type: string): number {
    switch (type) {
      case 'BATTLE': return 0xc0392b;
      case 'ELITE': return 0x3a3a3a;
      case 'EVENT': return 0xf39c12;
      case 'REST': return 0x27ae60;
      case 'MERCHANT': return 0x2980b9;
      case 'MYSTERY': return 0x16a085;
      case 'TREASURE': return 0xd4a017;
      case 'BOSS': return 0xe74c3c;
      default: return 0x95a5a6;
    }
  }

  private getNodeTextureKey(type: string): string {
    switch (type) {
      case 'BATTLE': return 'node_battle';
      case 'ELITE': return 'node_elite';
      case 'EVENT': return 'node_event';
      case 'REST': return 'node_rest';
      case 'MERCHANT': return 'node_merchant';
      case 'MYSTERY': return 'node_mystery';
      case 'TREASURE': return 'node_treasure';
      case 'BOSS': return 'node_boss';
      default: return '';
    }
  }

  private getCharacterEmoji(id: string): string {
    switch (id) {
      case 'liubei': return '\u{1F934}';
      case 'caocao': return '\u{1F479}';
      case 'sunquan': return '\u{1F985}';
      default: return '\u{1F9D1}';
    }
  }

  private formatNodeType(type: string): string {
    return type.charAt(0) + type.slice(1).toLowerCase();
  }

  private createNodeInfoPanel(): void {
    const panelX = 22;
    const panelY = this.scale.height - 188;
    const panelW = 380;
    const panelH = 150;

    const container = this.add.container(0, 0);
    const bg = this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0x000000, 0.86)
      .setStrokeStyle(1, 0x5c4a2f, 1);
    const header = this.add.rectangle(panelX + panelW / 2, panelY + 2, panelW, 3, 0x8f7647, 1).setOrigin(0.5, 0);
    const title = this.add.text(panelX + 14, panelY + 16, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#f0d5a3',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    const body = this.add.text(panelX + 14, panelY + 42, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#d9ccb7',
      wordWrap: { width: panelW - 28 },
      lineSpacing: 4,
    }).setOrigin(0, 0);

    container.add([bg, header, title, body]);
    container.setDepth(250);
    container.setVisible(false);
    this.registerUiObject(container);

    this.nodeInfoPanel = container;
    this.nodeInfoTitle = title;
    this.nodeInfoBody = body;
  }

  private showNodeInfo(node: MapNode, isSelectable: boolean): void {
    if (!this.nodeInfoPanel || !this.nodeInfoTitle || !this.nodeInfoBody) return;
    const type = this.formatNodeType(node.type);
    const selectableLine = isSelectable ? 'Click to enter this node.' : 'Not reachable from your current path.';

    const description = (() => {
      switch (node.type) {
        case 'MERCHANT':
          return 'Buy cards, relics, reroll stock, or purge a card for gold.';
        case 'REST':
          return 'Recover HP or take a campfire action.';
        case 'BATTLE':
          return 'Standard combat with normal rewards.';
        case 'ELITE':
          return 'Hard combat with stronger rewards.';
        case 'EVENT':
          return 'Narrative choice with branching outcomes.';
        case 'MYSTERY':
          return 'Unknown encounter: event, ambush, or special tradeoff.';
        case 'TREASURE':
          return 'Immediate loot and potential bonuses.';
        case 'BOSS':
          return 'Major combat encounter that gates progression.';
        default:
          return 'Proceed to this node to continue.';
      }
    })();

    this.nodeInfoTitle.setText(`${type} Node`);
    this.nodeInfoBody.setText(`${description}\n${selectableLine}`);
    this.nodeInfoPanel.setVisible(true);
  }

  private hideNodeInfo(): void {
    this.nodeInfoPanel?.setVisible(false);
  }

  private centerCameraOnCurrent(map: MapGraph, currentNodeId: string | null): void {
    let targetX = this.PAD_X + this.MAP_W / 2;
    let targetY = this.PAD_Y + this.MAP_H / 2;

    if (currentNodeId) {
      const node = map.nodes.find((n) => n.id === currentNodeId);
      if (node) {
        const pos = this.mapToScreen(node.x, node.y);
        targetX = pos.x;
        targetY = pos.y;
      }
    } else {
      targetX = this.PAD_X + this.MAP_W / 2;
      targetY = this.PAD_Y + this.MAP_H / 2;
    }

    this.cameras.main.centerOn(targetX, targetY);
  }

  private highlightConnectedPath(nodeId: string, active: boolean): void {
    const run = RunManager.getRunState();
    const currentNodeId = run?.currentNode ?? null;
    for (const pv of this.pathVisuals) {
      if (pv.fromId === currentNodeId && pv.toId === nodeId) {
        pv.graphics.clear();
        const color = active ? 0xf0d5a3 : 0xd4a85c;
        const alpha = 1;
        const thickness = active ? 5 : 4;
        const from = run?.currentMap.nodes.find((n) => n.id === pv.fromId);
        const to = run?.currentMap.nodes.find((n) => n.id === pv.toId);
        if (!from || !to) continue;
        const p1 = this.mapToScreen(from.x, from.y);
        const p2 = this.mapToScreen(to.x, to.y);
        const curve = from.curveData?.[to.id];
        pv.graphics.lineStyle(thickness, color, alpha);
        pv.graphics.beginPath();
        pv.graphics.moveTo(p1.x, p1.y);
        if (curve) {
          const cp1 = this.mapToScreen(curve.cp1x, curve.cp1y);
          const cp2 = this.mapToScreen(curve.cp2x, curve.cp2y);
          this.drawBezier(pv.graphics, p1.x, p1.y, cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
        } else {
          pv.graphics.lineTo(p2.x, p2.y);
        }
        pv.graphics.strokePath();
      }
    }
  }

  private drawParchmentBackground(_cx: number, _cy: number, _vw: number, _vh: number): void {
    this.bgGraphics = this.add.graphics();
    const bx = -4000;
    const by = -3000;
    const bw = 10000;
    const bh = 8000;
    const mapAreaW = this.PAD_X * 2 + this.MAP_W;
    const mapAreaH = this.PAD_Y * 2 + this.MAP_H;
    const mapAreaCx = this.PAD_X + this.MAP_W / 2;
    const mapAreaCy = this.PAD_Y + this.MAP_H / 2;
    this.bgGraphics.fillStyle(0xd4c5a9, 1);
    this.bgGraphics.fillRect(bx, by, bw, bh);

    const mapBgKey = this.textures.exists('map_parchment_bg')
      ? 'map_parchment_bg'
      : this.textures.exists('node_map_bg')
        ? 'node_map_bg'
        : null;
    if (mapBgKey) {
      const source = this.textures.get(mapBgKey).getSourceImage() as { width: number; height: number };
      const srcW = Math.max(1, source.width);
      const srcH = Math.max(1, source.height);
      const fitScale = Math.min(mapAreaW / srcW, mapAreaH / srcH);
      const displayScale = Math.min(1.05, fitScale);
      const mapArt = this.add.image(mapAreaCx, mapAreaCy, mapBgKey);
      mapArt.setDisplaySize(srcW * displayScale, srcH * displayScale);
      mapArt.setAlpha(0.9);
      mapArt.setDepth(-210);
      this.uiCamera.ignore(mapArt);
    }
    this.uiCamera.ignore(this.bgGraphics);

  }

  private selectNode(node: MapNode): void {
    console.log('[MapScene] selectNode', { nodeId: node.id, type: node.type, preludeMode: this.preludeMode });
    const run = RunManager.getRunState();
    trace('MAP', 'selectNode', {
      nodeId: node.id,
      nodeType: node.type,
      preludeMode: this.preludeMode,
      seed: run?.seed ?? null,
      act: run?.act ?? null,
      currentNodeBeforeEnter: run?.currentNode ?? null,
    });
    this.events.emit('nodeSelected');

    if (this.preludeMode) {
      if (this.preludePendingNodeId && node.id !== this.preludePendingNodeId) {
        console.log('[MapScene] prelude node blocked (pending gate)', {
          requested: node.id,
          pending: this.preludePendingNodeId,
        });
        return;
      }
      this.preludePendingNodeId = null;
      this.cameras.main.fadeOut(400, 0x000000);
      this.time.delayedCall(400, () => {
        this.scene.start('PreludeScene', {
          characterId: this.preludeCharacterId,
          preludeState: this.preludeStateSnapshot,
        });
      });
      return;
    }

    if (!RunManager.enterNode(node.id)) {
      console.warn('[MapScene] enterNode rejected', node.id);
      return;
    }

    this.resolveEnteredNode(node);
  }

  private resolveEnteredNode(node: MapNode): void {
    const nodeData = (node.data as {
      storyLinear?: boolean;
      storyBeat?: StoryBeat;
      storyBeatIndex?: number;
      storyBeatCount?: number;
    } | undefined) ?? {};

    if (nodeData.storyLinear && nodeData.storyBeat) {
      const run = RunManager.getRunState();
      if (!run) return;

      const pending = this.consumePendingStoryResolution(node.id);
      if (pending) {
        if ((pending.type === 'BATTLE' || pending.type === 'BOSS') && pending.enemies.length > 0) {
          this.cameras.main.fadeOut(400, 0x000000);
          this.time.delayedCall(400, () => {
            this.scene.start('CombatScene', {
              runMode: true,
              enemyIds: pending.enemies,
              storyRewardOverride: pending.rewardOverride,
            });
          });
        } else {
          this.renderMap(run.currentMap, node.id, false);
        }
        return;
      }

      const nextBeatContext = this.getNextStoryBeatContext(run);
      if (nextBeatContext && this.shouldTriggerBeatOnNode(node, nextBeatContext.beat)) {
        this.triggerStoryBeat(node, nextBeatContext.beat, nextBeatContext.beatIndex, nextBeatContext.totalBeats, run.act);
        return;
      }

      this.renderMap(run.currentMap, node.id, false);
      return;
    }

    const run = RunManager.getRunState();
    if (run) {
      const pending = this.consumePendingStoryResolution(node.id);
      if (pending) {
        if ((pending.type === 'BATTLE' || pending.type === 'BOSS') && pending.enemies.length > 0) {
          this.cameras.main.fadeOut(400, 0x000000);
          this.time.delayedCall(400, () => {
            this.scene.start('CombatScene', {
              runMode: true,
              enemyIds: pending.enemies,
              storyRewardOverride: pending.rewardOverride,
            });
          });
        } else {
          this.renderMap(run.currentMap, node.id, false);
        }
        return;
      }

      const nextBeatContext = this.getNextStoryBeatContext(run);
      if (nextBeatContext && this.shouldTriggerBeatOnNode(node, nextBeatContext.beat)) {
        this.triggerStoryBeat(node, nextBeatContext.beat, nextBeatContext.beatIndex, nextBeatContext.totalBeats, run.act);
        return;
      }
    }

    switch (node.type) {
      case 'BATTLE':
      case 'ELITE':
      case 'BOSS': {
        const enemies = (node.data as { enemies?: string[] })?.enemies ?? ['bandit'];
        trace('SCREEN', 'transition', {
          from: 'MapScene',
          to: 'CombatScene',
          reason: node.type,
          nodeId: node.id,
          enemies,
        });
        this.cameras.main.fadeOut(400, 0x000000);
        this.time.delayedCall(400, () => {
          this.scene.start('CombatScene', {
            runMode: true,
            enemyIds: enemies,
          });
        });
        break;
      }
      case 'EVENT':
        trace('SCREEN', 'transition', {
          from: 'MapScene',
          to: 'EventScene',
          reason: 'event_node',
          nodeId: node.id,
        });
        this.cameras.main.fadeOut(400, 0x000000);
        this.time.delayedCall(400, () => {
          const eventData = (node.data as { eventPool?: 'general' | 'risk_reward'; forcedEventId?: string }) ?? {};
          this.scene.start('EventScene', {
            eventId: eventData.forcedEventId,
            eventPool: eventData.eventPool ?? 'general',
            eventSource: 'event',
            returnNodeId: node.id,
          });
        });
        break;
      case 'REST':
        trace('SCREEN', 'transition', {
          from: 'MapScene',
          to: 'RestScene',
          reason: 'rest_node',
          nodeId: node.id,
        });
        this.cameras.main.fadeOut(400, 0x000000);
        this.time.delayedCall(400, () => {
          this.scene.start('RestScene');
        });
        break;
      case 'MERCHANT':
        trace('SCREEN', 'transition', {
          from: 'MapScene',
          to: 'MerchantScene',
          reason: 'merchant_node',
          nodeId: node.id,
        });
        this.cameras.main.fadeOut(400, 0x000000);
        this.time.delayedCall(400, () => {
          this.scene.start('MerchantScene');
        });
        break;
      case 'MYSTERY':
        this.resolveMystery(node);
        break;
      case 'TREASURE':
        this.resolveTreasure(node);
        break;
    }
  }

  private triggerStoryBeat(
    node: MapNode,
    beat: StoryBeat,
    beatIndex: number,
    totalBeats: number,
    act: number
  ): void {
    const launchCombatDirectly = (beat.nodeType === 'battle' || beat.nodeType === 'boss_battle')
      && (!beat.choices || beat.choices.length === 0);

    if (launchCombatDirectly) {
      const enemies = [beat.enemy ?? beat.boss].filter((id): id is string => Boolean(id));
      if (enemies.length === 0) {
        const run = RunManager.getRunState();
        if (run) {
          this.renderMap(run.currentMap, node.id, false);
        }
        return;
      }
      this.queueStoryBeatAdvanceOnVictory(act, beatIndex + 1);
      this.cameras.main.fadeOut(400, 0x000000);
      this.time.delayedCall(400, () => {
        this.scene.start('CombatScene', {
          runMode: true,
          enemyIds: enemies,
          storyRewardOverride: this.normalizeStoryRewardOverride(beat.reward),
        });
      });
      return;
    }

    this.cameras.main.fadeOut(400, 0x000000);
    this.time.delayedCall(400, () => {
      this.scene.start('StoryDialogueScene', {
        beat: this.buildStoryBeatForScene(beat, act, beatIndex),
        returnNodeId: node.id,
        beatNumber: beatIndex + 1,
        totalBeats,
      });
    });
  }

  private queueStoryBeatAdvanceOnVictory(act: number, nextBeatIndex: number): void {
    const run = RunManager.getRunState();
    if (!run) return;
    run.relicState = run.relicState ?? {};
    const prev = run.relicState.caocao_story_guidance ?? {};
    const payload = {
      ...((prev.payload as Record<string, unknown> | undefined) ?? {}),
      story_pending_beat_advance: {
        act,
        nextBeatIndex,
      },
    };
    run.relicState.caocao_story_guidance = {
      ...prev,
      payload,
    };
    RunManager.commitRunState();
  }

  private getNextStoryBeatContext(
    run: NonNullable<ReturnType<typeof RunManager.getRunState>>
  ): { beat: StoryBeat; beatIndex: number; totalBeats: number } | null {
    const payload = (run.relicState?.caocao_story_guidance?.payload as Record<string, unknown> | undefined) ?? {};
    const beatIndexKey = `story_beat_index_act${run.act}`;
    const beatIndex = Math.max(0, Number(payload[beatIndexKey] ?? 0));
    const axis = {
      legitimacy: Number(payload.axis_legitimacy ?? 0),
      control: Number(payload.axis_control ?? 0),
      momentum: Number(payload.axis_momentum ?? 0),
    };
    const storyVariantRaw = payload[`story_spine_variant_act${run.act}`];
    const storyVariant = typeof storyVariantRaw === 'string' && storyVariantRaw.length > 0
      ? storyVariantRaw
      : undefined;
    const storyFlags = (payload.story_flags && typeof payload.story_flags === 'object')
      ? (payload.story_flags as Record<string, unknown>)
      : undefined;

    const spine = getStoryActSpine(run.character, run.act, {
      axis,
      flags: storyFlags,
      requestedVariant: storyVariant,
    });
    if (!spine?.storyBeats?.length) return null;
    if (beatIndex >= spine.storyBeats.length) return null;
    const resolvedBeat = resolveStoryBeatVariant(spine.storyBeats[beatIndex], {
      axis,
      flags: storyFlags,
      requestedVariant: storyVariant,
    });
    return {
      beat: resolvedBeat,
      beatIndex,
      totalBeats: spine.storyBeats.length,
    };
  }

  private shouldTriggerBeatOnNode(node: MapNode, beat: StoryBeat): boolean {
    const nodeCol = this.getColumnIndex(node);
    return nodeCol === beat.column;
  }

  private resolveQueuedNode(nodeId: string): void {
    const run = RunManager.getRunState();
    if (!run) return;
    const node = run.currentMap.nodes.find((entry) => entry.id === nodeId);
    if (!node) return;
    if (run.currentNode === node.id) {
      const pending = this.consumePendingStoryResolution(node.id);
      if (pending && (pending.type === 'BATTLE' || pending.type === 'BOSS') && pending.enemies.length > 0) {
        this.cameras.main.fadeOut(400, 0x000000);
        this.time.delayedCall(400, () => {
          this.scene.start('CombatScene', {
            runMode: true,
            enemyIds: pending.enemies,
            storyRewardOverride: pending.rewardOverride,
          });
        });
        return;
      }
      this.renderMap(run.currentMap, run.currentNode, false);
      return;
    }
    if (!RunManager.enterNode(node.id)) {
      console.warn('[MapScene] auto-resolve node enter rejected', node.id, 'currentNode:', run.currentNode);
      this.renderMap(run.currentMap, run.currentNode, false);
      return;
    }
    this.resolveEnteredNode(node);
  }

  private buildStoryBeatForScene(beat: StoryBeat, act: number, beatIndex: number): {
    id: string;
    type?: string;
    title: string;
    body: string[];
    choices: string[];
    enemy?: string;
    boss?: string;
    rewardOverride?: {
      cardOptions?: string[];
      relicId?: string;
      relicOptions?: string[];
      noCard?: boolean;
      noRelic?: boolean;
    };
    choiceRewards?: Array<unknown>;
    flagsSetByChoice?: Array<Record<string, boolean> | null>;
    choiceEncounterOverrides?: Array<{ nodeType?: string; enemyId?: string; reward?: unknown } | null>;
    act?: number;
    beatIndex?: number;
    axisDeltaByChoice?: Array<{ legitimacy?: number; control?: number; momentum?: number }>;
  } {
    const body = beat.body?.length ? beat.body : [];
    const choices = (beat.choices ?? [])
      .map((choice) => choice.label ?? choice.text ?? choice.subtext ?? '')
      .filter((text) => text.length > 0);
    return {
      id: beat.id,
      type: beat.nodeType,
      title: beat.title ?? beat.id,
      body,
      choices,
      enemy: beat.enemy,
      boss: beat.boss,
      rewardOverride: this.normalizeStoryRewardOverride(beat.reward),
      choiceRewards: (beat.choices ?? []).map((choice) => choice.reward ?? null),
      flagsSetByChoice: (beat.choices ?? []).map((choice) => choice.flagsSet ?? null),
      choiceEncounterOverrides: (beat.choices ?? []).map((choice) => {
        const raw = choice.nextEncounterOverride as {
          nodeType?: string;
          type?: string;
          enemyId?: string;
          enemy?: string;
          reward?: unknown;
        } | undefined;
        if (!raw) return null;
        return {
          nodeType: raw.nodeType ?? raw.type ?? undefined,
          enemyId: raw.enemyId ?? raw.enemy ?? undefined,
          reward: raw.reward ?? undefined,
        };
      }),
      act,
      beatIndex,
      axisDeltaByChoice: (beat.choices ?? []).map((choice) => ({
        legitimacy: Number(choice.axisChanges?.legitimacy ?? 0),
        control: Number(choice.axisChanges?.control ?? 0),
        momentum: Number(choice.axisChanges?.momentum ?? 0),
      })),
    };
  }

  private consumePendingStoryResolution(nodeId: string): {
    type: 'NONE' | 'BATTLE' | 'BOSS';
    enemies: string[];
    rewardOverride?: {
      cardOptions?: string[];
      relicId?: string;
      relicOptions?: string[];
      noCard?: boolean;
      noRelic?: boolean;
    };
  } | null {
    const run = RunManager.getRunState();
    if (!run) return null;
    const payload = (run.relicState?.caocao_story_guidance?.payload as Record<string, unknown> | undefined) ?? {};
    const pending = payload.story_pending_resolution as
      | {
        mapNodeId?: string;
        type?: 'NONE' | 'BATTLE' | 'BOSS';
        enemies?: string[];
        rewardOverride?: {
          cardOptions?: string[];
          relicId?: string;
          relicOptions?: string[];
          noCard?: boolean;
          noRelic?: boolean;
        };
      }
      | undefined;
    if (!pending || pending.mapNodeId !== nodeId) return null;

    const nextPayload = { ...payload };
    delete nextPayload.story_pending_resolution;
    run.relicState = run.relicState ?? {};
    run.relicState.caocao_story_guidance = {
      ...(run.relicState.caocao_story_guidance ?? {}),
      payload: nextPayload,
    };
    RunManager.commitRunState();

    return {
      type: pending.type ?? 'NONE',
      enemies: Array.isArray(pending.enemies) ? pending.enemies : [],
      rewardOverride: pending.rewardOverride,
    };
  }

  private normalizeStoryRewardOverride(rawReward: unknown):
    | {
      cardOptions?: string[];
      relicId?: string;
      relicOptions?: string[];
      noCard?: boolean;
      noRelic?: boolean;
    }
    | undefined {
    if (typeof rawReward === 'string' && rawReward.length > 0) {
      return { noCard: true, relicId: rawReward };
    }
    if (!rawReward || typeof rawReward !== 'object') {
      return undefined;
    }
    const reward = rawReward as { type?: string; options?: string[]; id?: string };
    const options = Array.isArray(reward.options) ? reward.options.filter((id) => typeof id === 'string' && id.length > 0) : [];
    if (reward.type === 'none') {
      return { noCard: true, noRelic: true };
    }
    if (reward.type === 'relic') {
      if (options.length === 1) return { noCard: true, relicId: options[0] };
      return { noCard: true, relicOptions: options };
    }
    if (reward.type === 'card') {
      return { cardOptions: options, noRelic: true };
    }
    return undefined;
  }

  private resolveTreasure(node: MapNode): void {
    const data = (node.data as { gold?: number; cardId?: string; relicId?: string } | undefined) ?? {};
    const goldReward = data.gold ?? 50;
    const randomRelicId = !data.relicId ? this.pickRandomTreasureRelic() : undefined;
    RunManager.modifyGold(goldReward);
    if (data.cardId) {
      RunManager.addCardToDeck(data.cardId);
    }
    if (data.relicId) {
      RunManager.applyReward({ gold: 0, relicId: data.relicId });
    } else if (randomRelicId) {
      RunManager.applyReward({ gold: 0, relicId: randomRelicId });
    }
    if (!data.cardId && !data.relicId && !randomRelicId) {
      RunManager.heal(5);
    }

    this.cameras.main.shake(120, 0.005);
    const run = RunManager.getRunState();
    if (run) {
      this.renderMap(run.currentMap, node.id, false);
    }
  }

  private pickRandomTreasureRelic(): string | undefined {
    const run = RunManager.getRunState();
    if (!run) return undefined;

    const rng = getRNG(run.seed, `treasure-relic:${run.currentNode ?? 'unknown'}`);
    const owned = new Set(run.relics.map((relic) => relic.id));
    const candidates = Array.from(relicRegistry.values())
      .filter((relic) => relic.id.startsWith('relic_'))
      .filter((relic) => relic.rarity !== 'boss' && relic.rarity !== 'cursed')
      .filter((relic) => !owned.has(relic.id));

    if (candidates.length === 0) return undefined;

    return rng.pickWeighted(
      candidates.map((relic) => ({
        item: relic.id,
        weight: relic.rarity === 'rare' ? 2 : relic.rarity === 'uncommon' ? 3 : 5,
      }))
    );
  }

  private resolveMystery(node: MapNode): void {
    const mystery = (node.data as {
      mysteryType?: 'event' | 'ambush' | 'risk_reward';
      enemies?: string[];
      rewardType?: string;
      combatModifiers?: {
        playerStatuses?: Array<{ id: import('../types').StatusId; stacks: number }>;
      };
    }) ?? {};

    trace('MAP', 'resolveMystery', {
      nodeId: node.id,
      mysteryType: mystery.mysteryType ?? 'risk_reward',
      rewardType: mystery.rewardType ?? null,
      enemies: mystery.enemies ?? null,
    });

    if (mystery.mysteryType === 'event') {
      this.cameras.main.fadeOut(400, 0x000000);
      this.time.delayedCall(400, () => {
        this.scene.start('EventScene', {
          eventId: (node.data as { forcedEventId?: string })?.forcedEventId,
          eventPool: 'general',
          eventSource: 'mystery',
        });
      });
      return;
    }

    if (mystery.mysteryType === 'ambush') {
      mystery.combatModifiers?.playerStatuses?.forEach((status) => {
        RunManager.addPendingStatus(status.id, status.stacks);
      });
      this.cameras.main.fadeOut(400, 0x000000);
      this.time.delayedCall(400, () => {
        this.scene.start('CombatScene', {
          runMode: true,
          enemyIds: mystery.enemies ?? ['bandit'],
        });
      });
      return;
    }

    if (mystery.rewardType === 'gold_for_burning') {
      RunManager.modifyGold(100);
      RunManager.addPendingStatus('burning', 2);
    } else if (mystery.rewardType === 'remove_for_panic') {
      const removable = RunManager.getRunState()?.deck.find((card) => !card.upgraded);
      if (removable) {
        RunManager.removeCardFromDeck(removable.id);
      }
      RunManager.prepareNextCombat({
        startStatuses: [{
          id: 'panic',
          name: 'panic',
          description: '',
          stacks: 1,
        }],
      });
    } else if (mystery.rewardType === 'rare_relic_for_hp') {
      RunManager.damage(10);
      RunManager.applyReward({ gold: 0, relicId: 'ring_of_vitality' });
    }

    this.cameras.main.shake(200, 0.01);
    this.renderMap(RunManager.getRunState()!.currentMap, node.id, false);
  }

  private createLegendPanel(): void {
    const entries: Array<{ type: string; label: string }> = [
      { type: 'BATTLE', label: 'Battle' },
      { type: 'ELITE', label: 'Elite' },
      { type: 'EVENT', label: 'Event' },
      { type: 'REST', label: 'Rest' },
      { type: 'MERCHANT', label: 'Merchant' },
      { type: 'MYSTERY', label: 'Mystery' },
      { type: 'TREASURE', label: 'Treasure' },
      { type: 'BOSS', label: 'Boss' },
    ];

    const padX = 10;
    const padY = 8;
    const iconSize = 20;
    const rowH = 26;
    const panelW = 130;
    const panelH = padY * 2 + entries.length * rowH;

    const panelX = this.scale.width - panelW - 12;
    const panelY = 60;

    const g = this.add.graphics();
    g.fillStyle(0xede3d1, 1);
    g.lineStyle(1, 0x8a7a60, 1);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 6);
    g.strokeRoundedRect(panelX, panelY, panelW, panelH, 6);
    g.setDepth(200);
    const bg: Phaser.GameObjects.Graphics = g;
    this.registerUiObject(bg);

    entries.forEach((entry, i) => {
      const y = panelY + padY + i * rowH + rowH / 2;
      const textureKey = this.getNodeTextureKey(entry.type);
      if (textureKey && this.textures.exists(textureKey)) {
        const source = this.textures.get(textureKey).getSourceImage() as HTMLImageElement;
        const maxDim = Math.max(source.width, source.height);
        const scale = iconSize / maxDim;
        const icon = this.add.image(panelX + padX + iconSize / 2, y, textureKey)
          .setScale(scale).setDepth(201);
        this.registerUiObject(icon);
      } else {
        const g = this.add.graphics();
        this.drawNodeShapeFallback(g, entry.type, iconSize * 0.45, this.getNodeColor(entry.type), 1, false);
        g.setPosition(panelX + padX + iconSize / 2, y).setDepth(201);
        this.registerUiObject(g);
      }

      const label = this.add.text(panelX + padX + iconSize + 6, y, entry.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#3a2e22',
      }).setOrigin(0, 0.5).setDepth(201);
      this.registerUiObject(label);
    });
  }

  private createPenToggle(): void {
    const w = this.scale.width;
    const btnW = 80;
    const btnH = 32;
    const btnX = w - btnW - 12;
    const btnY = this.scale.height - btnH - 12;

    const bg = this.add.graphics();
    bg.fillStyle(0xede3d1, 1);
    bg.lineStyle(1, 0x8a7a60, 1);
    bg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
    bg.strokeRoundedRect(btnX, btnY, btnW, btnH, 6);
    bg.setDepth(200);
    this.registerUiObject(bg);

    this.penButtonText = this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'Pen', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#3a2e22',
    }).setOrigin(0.5).setDepth(201);
    this.registerUiObject(this.penButtonText);

    const hit = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(202);
    this.registerUiObject(hit);

    hit.on('pointerdown', () => {
      this.togglePenMode(bg);
    });
  }

  private togglePenMode(bg: Phaser.GameObjects.Graphics): void {
    this.penMode = !this.penMode;
    this.penButtonText?.setText(this.penMode ? 'Pen On' : 'Pen');
    if (this.penMode) {
      bg.clear();
      bg.fillStyle(0xd4a017, 1);
      bg.lineStyle(2, 0x8a7a60, 1);
      bg.fillRoundedRect(this.scale.width - 80 - 12, this.scale.height - 32 - 12, 80, 32, 6);
      bg.strokeRoundedRect(this.scale.width - 80 - 12, this.scale.height - 32 - 12, 80, 32, 6);
    } else {
      bg.clear();
      bg.fillStyle(0xede3d1, 1);
      bg.lineStyle(1, 0x8a7a60, 1);
      bg.fillRoundedRect(this.scale.width - 80 - 12, this.scale.height - 32 - 12, 80, 32, 6);
      bg.strokeRoundedRect(this.scale.width - 80 - 12, this.scale.height - 32 - 12, 80, 32, 6);
    }
  }

  private setupCameraInput(): void {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      const pointer = this.input.activePointer;
      const worldPointBefore = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const zoomDelta = -deltaY * 0.001;
      const newZoom = clamp(this.cameras.main.zoom + zoomDelta, this.MIN_ZOOM, this.MAX_ZOOM);
      this.cameras.main.setZoom(newZoom);
      this.syncWorldTextScaleToZoom();
      const worldPointAfter = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.cameras.main.scrollX += worldPointBefore.x - worldPointAfter.x;
      this.cameras.main.scrollY += worldPointBefore.y - worldPointAfter.y;
    });

    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      const clickedNode = currentlyOver.some((obj) =>
        this.nodeVisuals.some((v) => v.container === obj || v.container.list.includes(obj as Phaser.GameObjects.GameObject))
      );
      const pointer = this.input.activePointer;
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      if (!clickedNode) {
        if (this.penMode) {
          this.startStroke(worldX, worldY);
        } else {
          this.dragStart = { x: pointer.x, y: pointer.y };
          this.isDragging = false;
        }
      }
    });
    this.input.on('pointermove', () => {
      const pointer = this.input.activePointer;

      if (this.penMode && this.currentStroke) {
        this.addStrokePoint(pointer.worldX, pointer.worldY);
        return;
      }

      if (!this.dragStart) return;
      const dx = pointer.x - this.dragStart.x;
      const dy = pointer.y - this.dragStart.y;

      if (!this.isDragging && (Math.abs(dx) > this.DRAG_THRESHOLD || Math.abs(dy) > this.DRAG_THRESHOLD)) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        const zoom = this.cameras.main.zoom;
        this.cameras.main.scrollX -= dx / zoom;
        this.cameras.main.scrollY -= dy / zoom;
        this.dragStart = { x: pointer.x, y: pointer.y };
      }
    });

    this.input.on('pointerup', () => {
      if (this.penMode && this.currentStroke) {
        this.finishStroke();
        return;
      }
      this.dragStart = null;
      this.isDragging = false;
    });
  }
  private startStroke(x: number, y: number): void {
    this.currentStroke = [{ x, y }];
  }

  private addStrokePoint(x: number, y: number): void {
    if (!this.currentStroke) return;
    const last = this.currentStroke[this.currentStroke.length - 1];
    const dist = Math.hypot(x - last.x, y - last.y);
    if (dist > 3) {
      this.currentStroke.push({ x, y });
      this.redrawStrokes();
    }
  }

  private finishStroke(): void {
    if (!this.currentStroke || this.currentStroke.length < 2) {
      this.currentStroke = null;
      return;
    }
    this.strokes.push([...this.currentStroke]);
    this.currentStroke = null;
    this.redrawStrokes();
  }

  private redrawStrokes(): void {
    this.drawingGraphics.clear();
    this.drawingGraphics.lineStyle(2.5, 0x8b0000, 0.85);

    for (const stroke of this.strokes) {
      if (stroke.length < 2) continue;
      this.drawingGraphics.beginPath();
      this.drawingGraphics.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        this.drawingGraphics.lineTo(stroke[i].x, stroke[i].y);
      }
      this.drawingGraphics.strokePath();
    }

    if (this.currentStroke && this.currentStroke.length >= 2) {
      this.drawingGraphics.beginPath();
      this.drawingGraphics.moveTo(this.currentStroke[0].x, this.currentStroke[0].y);
      for (let i = 1; i < this.currentStroke.length; i++) {
        this.drawingGraphics.lineTo(this.currentStroke[i].x, this.currentStroke[i].y);
      }
      this.drawingGraphics.strokePath();
    }
  }

  private createResetViewButton(): void {
    const btnW = 80;
    const btnH = 32;
    const btnX = 12;
    const btnY = this.scale.height - btnH - 12;

    const bg = this.add.graphics();
    bg.fillStyle(0xede3d1, 1);
    bg.lineStyle(1, 0x8a7a60, 1);
    bg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
    bg.strokeRoundedRect(btnX, btnY, btnW, btnH, 6);
    bg.setDepth(200);
    this.registerUiObject(bg);

    const label = this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'Center', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#3a2e22',
    }).setOrigin(0.5).setDepth(201);
    this.registerUiObject(label);

    const hit = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(202);
    this.registerUiObject(hit);

    hit.on('pointerdown', () => {
      const run = RunManager.getRunState();
      if (this.preludeMode && this.preludeMap) {
        const currentNodeId = this.preludeStateSnapshot?.lastCompletedNodeId
          ? (() => {
              const idx = this.preludeMap!.nodes.findIndex((node) => node.id === this.preludeStateSnapshot?.lastCompletedNodeId);
              return idx >= 0 ? `prelude_${idx}` : null;
            })()
          : null;
        this.centerCameraOnCurrent(this.preludeMap, currentNodeId);
      } else if (run?.currentMap) {
        this.centerCameraOnCurrent(run.currentMap, run.currentNode);
      } else {
        this.cameras.main.centerOn(this.PAD_X + this.MAP_W / 2, this.PAD_Y + this.MAP_H / 2);
      }
      this.cameras.main.setZoom(1);
    });
  }

  private syncWorldTextScaleToZoom(): void {
    const zoom = this.cameras.main.zoom;
    const inverse = zoom > 0 ? 1 / zoom : 1;
    for (const visual of this.nodeVisuals) {
      for (const child of visual.container.list) {
        if (child instanceof Phaser.GameObjects.Text) {
          child.setScale(inverse);
        }
      }
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
