import type { CharacterId, EventHistoryEntry, MapGraph, MapNode, NodeType, ChronicleFlags, CampaignSetPieceChain, EncounterFamilyDefinition } from '../types';
import { RNG } from '../core/RNG';
import { getEnemyIdsForNodeType } from '../data/enemies';
import { allCampaignChains, eliteEncounterPresets, encounterFamilies, getBossEncounterPreset, getEncounterFamily } from '../data/campaign';
import { getStoryActSpine, resolveStoryBeatVariant, type StoryBeat } from '../data/story/spine';


const COLUMNS = 16;        // 15+1
const GAMEPLAY_COLUMNS = 15;
const ROWS = 7;
const PATH_COUNT = 6;
const JITTER = 0.02;
const SHOP_RATE = 0.05;
const REST_RATE = 0.12;
const EVENT_RATE = 0.22;
const ELITE_RATE_BASE = 0.08;
const ELITE_ASCENSION_MULTIPLIER = 1.6;

type PathBias = 'safe' | 'greedy' | 'aggressive';

const SET_PIECES: Record<number, NodeType[][]> = {
  1: [
    ['EVENT', 'REST'],
    ['BATTLE', 'MERCHANT'],
    ['MYSTERY', 'EVENT'],
  ],
  2: [
    ['MYSTERY', 'BATTLE', 'MERCHANT'],
    ['EVENT', 'MYSTERY', 'BATTLE'],
    ['BATTLE', 'EVENT', 'REST'],
  ],
  3: [
    ['ELITE', 'MYSTERY', 'ELITE'],
    ['BATTLE', 'ELITE', 'MYSTERY'],
    ['MYSTERY', 'EVENT', 'ELITE'],
  ],
};

export interface MapGenOptions {
  seed: string;
  act: number;
  character?: CharacterId;
  eventHistory?: EventHistoryEntry[];
  flags?: ChronicleFlags;
  ascensionLevel?: number;
  storySequence?: StoryBeat[];
  axisSnapshot?: AxisSnapshot;
  storyFlags?: Record<string, unknown>;
  storyVariant?: string;
}

interface AxisSnapshot {
  legitimacy: number;
  control: number;
  momentum: number;
}

export function generateMap(options: MapGenOptions): MapGraph {
  const {
    seed,
    act,
    character,
    eventHistory,
    flags,
    ascensionLevel = 0,
    storySequence,
    axisSnapshot,
    storyFlags,
    storyVariant,
  } = options;
  const rng = new RNG(seed);

  const paths = generatePaths(rng);
  const templateNodes = buildTemplateGridNodes(act);
  applyPathConnections(paths, templateNodes, act);
  const nodes = removePathlessRooms(templateNodes);
  const forcedNodeIds = new Set<string>();
  const setPieceDebug: { sequence?: NodeType[]; startColumn: number | null } = { startColumn: null };
  forceMandatoryTypes(nodes, act, rng, forcedNodeIds);
  assignTypesFromBucket(nodes, act, rng, flags, forcedNodeIds, ascensionLevel);
  enforceActPacing(nodes, act, rng, forcedNodeIds);

  const selectedSpine = getStoryActSpine(character, act, {
    flags: storyFlags,
    axis: axisSnapshot,
    requestedVariant: storyVariant,
  });
  const resolvedStorySequence = storySequence ?? selectedSpine?.storyBeats?.map((beat) => (
    resolveStoryBeatVariant(beat, { flags: storyFlags, axis: axisSnapshot })
  )) ?? [];
  const storyContext = injectStoryBeats(nodes, resolvedStorySequence, character, act, rng, forcedNodeIds);
  const storyBeatColumns = new Set(
    resolvedStorySequence
      .map((beat) => Number(beat.column))
      .filter((col) => Number.isFinite(col) && col >= 0 && col < COLUMNS - 1)
  );
  applyAxisDrivenMapModifiers(nodes, rng, axisSnapshot, forcedNodeIds, storyBeatColumns);
  syncBossFromStoryPreview(nodes, act, character, rng, storyContext.previewBossEnemyId);
  addInterlockConnections(nodes, rng);

  for (const node of nodes) {
    if (!node.data) {
      node.data = buildNodeData(node.type, act, rng, undefined, character);
    }
  }


  applyNodeJitter(nodes, rng);
  computeBezierCurves(nodes);
  reduceLineCrossings(nodes, rng);

  return {
    nodes,
    seed,
    act,
    debug: {
      appliedSetPiece: setPieceDebug.sequence,
      setPieceStartColumn: setPieceDebug.startColumn,
      pathBias: derivePathBiasFromFlags(flags),
      appliedCampaignChainId: null,
      appliedCampaignChainTitle: null,
    },
  };
}


function generatePaths(rng: RNG): Array<Array<{ col: number; row: number }>> {
  const edgesByColumn = new Map<number, Array<{ fromRow: number; toRow: number }>>();
  const paths: Array<Array<{ col: number; row: number }>> = [];
  for (let pathIndex = 0; pathIndex < PATH_COUNT; pathIndex++) {
    let startRow = rng.nextInt(0, ROWS);
    if (pathIndex === 1 && paths[0]?.[0]?.row === startRow) {
      const alternatives = Array.from({ length: ROWS }, (_, idx) => idx).filter((row) => row !== startRow);
      startRow = alternatives.length ? rng.pick(alternatives) : startRow;
    }

    const path: Array<{ col: number; row: number }> = [{ col: 0, row: startRow }];
    for (let col = 0; col < GAMEPLAY_COLUMNS - 1; col++) {
      const currentRow = path[path.length - 1].row;
      const candidates = [currentRow - 1, currentRow, currentRow + 1].filter((r) => r >= 0 && r < ROWS);
      const nonCrossing = candidates.filter((toRow) => !wouldCrossExistingEdges(edgesByColumn, col, currentRow, toRow));
      const pool = nonCrossing.length ? nonCrossing : candidates;
      const nextRow = rng.pick(pool);
      path.push({ col: col + 1, row: nextRow });
      const list = edgesByColumn.get(col) ?? [];
      list.push({ fromRow: currentRow, toRow: nextRow });
      edgesByColumn.set(col, list);
    }
    paths.push(path);
  }

  trimFirstSecondFloorConvergence(paths, rng);
  return paths;
}

function wouldCrossExistingEdges(
  edgesByColumn: Map<number, Array<{ fromRow: number; toRow: number }>>,
  col: number,
  fromRow: number,
  toRow: number
): boolean {
  const existing = edgesByColumn.get(col) ?? [];
  for (const edge of existing) {
    const crosses = (fromRow < edge.fromRow && toRow > edge.toRow) || (fromRow > edge.fromRow && toRow < edge.toRow);
    if (crosses) return true;
  }
  return false;
}

function trimFirstSecondFloorConvergence(paths: Array<Array<{ col: number; row: number }>>, rng: RNG): void {
  const pathsBySecondRow = new Map<number, number[]>();
  paths.forEach((path, idx) => {
    const second = path[1];
    if (!second) return;
    const list = pathsBySecondRow.get(second.row) ?? [];
    list.push(idx);
    pathsBySecondRow.set(second.row, list);
  });

  const usedSecondRows = new Set<number>();
  for (const [secondRow, indexes] of pathsBySecondRow.entries()) {
    if (indexes.length === 1) {
      usedSecondRows.add(secondRow);
      continue;
    }

    const keep = rng.pick(indexes);
    usedSecondRows.add(secondRow);
    for (const idx of indexes) {
      if (idx === keep) continue;
      const startRow = paths[idx]?.[0]?.row;
      if (startRow === undefined || !paths[idx]?.[1]) continue;
      const candidates = [startRow - 1, startRow, startRow + 1]
        .filter((row) => row >= 0 && row < ROWS)
        .filter((row) => !usedSecondRows.has(row));
      if (candidates.length) {
        const reassigned = rng.pick(candidates);
        paths[idx][1].row = reassigned;
        usedSecondRows.add(reassigned);
      }
    }
  }
}

function buildTemplateGridNodes(act: number): MapNode[] {
  const nodes: MapNode[] = [];
  for (let col = 0; col < GAMEPLAY_COLUMNS; col++) {
    for (let row = 0; row < ROWS; row++) {
      nodes.push({
        id: `n_${act}_${col}_${row}`,
        type: 'BATTLE',
        act,
        x: col / Math.max(1, COLUMNS - 1),
        y: row / Math.max(1, ROWS - 1),
        connections: [],
      });
    }
  }
  return nodes;
}

function applyPathConnections(paths: Array<Array<{ col: number; row: number }>>, nodes: MapNode[], act: number): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const fromId = `n_${act}_${from.col}_${from.row}`;
      const toId = `n_${act}_${to.col}_${to.row}`;
      const fromNode = nodeById.get(fromId);
      if (fromNode && !fromNode.connections.includes(toId)) {
        fromNode.connections.push(toId);
      }
    }
  }
}

function removePathlessRooms(nodes: MapNode[]): MapNode[] {
  const inboundCount = new Map<string, number>();
  for (const node of nodes) inboundCount.set(node.id, 0);
  for (const from of nodes) {
    for (const toId of from.connections) {
      inboundCount.set(toId, (inboundCount.get(toId) ?? 0) + 1);
    }
  }

  const paired = nodes.filter((node) => (node.connections.length > 0) || ((inboundCount.get(node.id) ?? 0) > 0));
  const pairedIds = new Set(paired.map((node) => node.id));
  for (const node of paired) {
    node.connections = node.connections.filter((toId) => pairedIds.has(toId));
  }

  // Boss
  const act = nodes[0]?.act ?? 1;
  const bossNode: MapNode = {
    id: `n_${act}_${COLUMNS - 1}_0`,
    type: 'BOSS',
    act,
    x: 1,
    y: 0.5,
    connections: [],
  };
  paired.push(bossNode);

  const lastColNodes = paired.filter((n) => getCol(n) === GAMEPLAY_COLUMNS - 1);
  for (const node of lastColNodes) {
    if (!node.connections.includes(bossNode.id)) {
      node.connections.push(bossNode.id);
    }
  }

  return paired;
}

function addInterlockConnections(nodes: MapNode[], rng: RNG): void {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodesByCol = new Map<number, MapNode[]>();
  for (const node of nodes) {
    if (node.type === 'BOSS') continue;
    const col = getCol(node);
    if (!nodesByCol.has(col)) {
      nodesByCol.set(col, []);
    }
    nodesByCol.get(col)?.push(node);
  }

  for (let col = 0; col < GAMEPLAY_COLUMNS - 1; col++) {
    const fromNodes = nodesByCol.get(col) ?? [];
    const toNodes = nodesByCol.get(col + 1) ?? [];
    if (!fromNodes.length || !toNodes.length) continue;

    for (const from of fromNodes) {
      const existing = new Set(from.connections);
      const rankedTargets = [...toNodes]
        .filter((candidate) => candidate.id !== from.id)
        .sort((a, b) => Math.abs(getRow(a) - getRow(from)) - Math.abs(getRow(b) - getRow(from)));

      if (!rankedTargets.length) continue;

      const desiredOutgoing = Math.min(3, Math.max(2, Math.ceil(toNodes.length / 2)));
      for (const target of rankedTargets) {
        if (existing.has(target.id)) continue;
        const rowDistance = Math.abs(getRow(target) - getRow(from));
        if (rowDistance > 2) continue;
        if (from.connections.length >= desiredOutgoing && rng.next() > 0.2) break;
        from.connections.push(target.id);
        existing.add(target.id);
      }
    }
  }


  for (let col = 0; col < GAMEPLAY_COLUMNS - 1; col++) {
    const fromNodes = nodesByCol.get(col) ?? [];
    const toNodes = nodesByCol.get(col + 1) ?? [];
    if (!toNodes.length) continue;
    for (const from of fromNodes) {
      if (from.connections.length > 0) continue;
      const fallback = [...toNodes].sort(
        (a, b) => Math.abs(getRow(a) - getRow(from)) - Math.abs(getRow(b) - getRow(from))
      )[0];
      if (fallback) {
        from.connections.push(fallback.id);
      }
    }
  }

  const inboundCount = new Map<string, number>();
  for (const node of nodes) inboundCount.set(node.id, 0);
  for (const from of nodes) {
    const deduped = Array.from(new Set(from.connections));
    from.connections = deduped;
    for (const toId of deduped) {
      inboundCount.set(toId, (inboundCount.get(toId) ?? 0) + 1);
    }
  }

  for (const node of nodes) {
    if (node.type === 'BOSS') continue;
    const col = getCol(node);
    if (col <= 0) continue;
    if ((inboundCount.get(node.id) ?? 0) > 0) continue;
    const parents = (nodesByCol.get(col - 1) ?? []).sort(
      (a, b) => Math.abs(getRow(a) - getRow(node)) - Math.abs(getRow(b) - getRow(node))
    );
    const parent = parents[0];
    if (!parent) continue;
    if (!parent.connections.includes(node.id)) {
      parent.connections.push(node.id);
      inboundCount.set(node.id, 1);
    }
  }
}

function forceMandatoryTypes(nodes: MapNode[], _act: number, _rng: RNG, forcedNodeIds: Set<string>): void {
  const firstColNodes = nodes.filter((n) => getCol(n) === 0 && n.type !== 'BOSS');
  for (const node of firstColNodes) {
    node.type = 'BATTLE';
    forcedNodeIds.add(node.id);
  }

  const treasureColNodes = nodes.filter((n) => getCol(n) === 8 && n.type !== 'BOSS');
  for (const node of treasureColNodes) {
    node.type = 'TREASURE';
    forcedNodeIds.add(node.id);
  }

  // 15f needs a rest
  const restColNodes = nodes.filter((n) => getCol(n) === GAMEPLAY_COLUMNS - 1 && n.type !== 'BOSS');
  for (const node of restColNodes) {
    node.type = 'REST';
    forcedNodeIds.add(node.id);
  }
}

function enforceActPacing(nodes: MapNode[], act: number, rng: RNG, forcedNodeIds: Set<string>): void {
  const assignable = nodes.filter((n) => !forcedNodeIds.has(n.id) && n.type !== 'BOSS');

	if (act === 1) {
		//To gurantee at least 1 rest before boss
		const hasRestEarly = assignable.some((n) => n.type === 'REST' && getComputedStyle(n) < 8);
		if (!hasRestEarly) {
			const candidates = assignable.filter((n) => getComputedStyle(n) >= 1 && getComputedStyle(n) < 8);
			if(candidates.length) {
				const chosen = rng.pick(candidates);
				chosen.type = 'REST';
				forcedNodeIds.add(chosen.id);
      }
    }
  }

	if (act === 2) {
		//Gurantee at LEAST one merchant in the middle columns 
		const hasMerchantMid = assignable.some((n) => n.type === 'MERCHANT' && getComputedStyle(n) >=4 && getComputedStyle(n)) <= 10);
		if (!hasMerchantMid) {
			const candidates = assignable.filter((n) => getComputedStyle(n) >= 4 && getComputedStyle(n) <= 10);
			if (candidates.length) {
				const chosen = rng.pick(candidates);
				chosen.type = 'MERCHANT';
				forcedNodeIds.add(chosen.id);
			}
		}
	}
}

