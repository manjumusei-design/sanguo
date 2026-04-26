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

	