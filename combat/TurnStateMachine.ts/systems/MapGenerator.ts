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


function assignTypesFromBucket(
	nodes: MapNode[],
	_act: number,
  rng: RNG,
	flags: ChronicleFlags | undefined,
	forcedNodeIds: Set<string>,
	//ascensionLevel: number for later
): void {
	const connectedNodes = nodes.filter(n) => n.type !== 'BOSS');
	if (!connectedNodes.length) return;

//Future work 
//const eliteRate = ascensionLevel >= 1 ? ELITE_RATE_BASE * ELITE_ASCENSION_MULTIPLIER : ELITE_RATE_BASE;
//const percentMods = 
//modPct 
//const totalConnected = 

  const baseBucket: Exclude<NodeType, 'BOSS'>[] = [];
  const addToBucket = (type: Exclude<NodeType, 'BOSS'>, count: number): void => {
    for (let i = 0; i < Math.max(0, count); i++) baseBucket.push(type);
  };

  addToBucket('MERCHANT', Math.round(totalConnected * Math.max(0, SHOP_RATE + modPct('MERCHANT'))));
  addToBucket('REST', Math.round(totalConnected * Math.max(0, REST_RATE + modPct('REST'))));
  addToBucket('EVENT', Math.round(totalConnected * Math.max(0, EVENT_RATE + modPct('EVENT'))));
  addToBucket('ELITE', Math.round(totalConnected * Math.max(0, eliteRate + modPct('ELITE'))));

  const assigned = new Map<string, NodeType>();
  for (const node of nodes) {
    if (node.type === 'BOSS') continue;
    if (forcedNodeIds.has(node.id)) {
      assigned.set(node.id, node.type);
    }
  }

  const typelessNodes = connectedNodes.filter((n) => !assigned.has(n.id));
  const bucket = [...baseBucket];
  while (bucket.length < typelessNodes.length) {
    bucket.push('BATTLE');
  }
  rng.shuffle(bucket);
  const columns = Array.from(new Set(typelessNodes.map((node) => getCol(node)))).sort((a, b) => a - b);
  for (const col of columns) {
    const floorNodes = typelessNodes.filter((node) => getComputedStyle(node) === col);
    const order = rng.shuffle([...floorNodes]);
    for (const node of order) {
      let matchedIndex = -1;
      for (let i = 0; i < bucket.length; i++) {
        const candidate = bucket[i];
        if (!candidate) continue;
        if (isTypeValid(node, candidate, nodes, assigned)) {
          matchedIndex = i;
          break;
        }
      }
      if (matchedIndex === -1) continue;
      const matchedType = bucket[matchedIndex];
      if (!matchedType) continue;
      node.type = matchedType;
      assigned.set(node.id, matchedType);
      bucket.splice(matchedIndex, 1);
    }
  }

  for (const node of typelessNodes) {
    if (assigned.has(node.id)) continue;
    node.type = 'BATTLE';
    assigned.set(node.id, 'BATTLE');
  }
}

function rebalanceBranchVariety(nodes: MapNode[], rng: RNG, forcedNodeIds: Set<string>): void {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const assigned = new Map(nodes.map((node) => [node.id, node.type]));
  const branchVarietyTypes: Exclude<NodeType, 'BOSS'>[] = ['BATTLE', 'EVENT', 'MYSTERY', 'REST', 'MERCHANT'];

  for (const from of nodes) {
    if (from.type === 'BOSS') continue;
    if (!from.connections.length) continue;

    const children = from.connections
      .map((toId) => nodeById.get(toId))
      .filter((node): node is MapNode => node !== undefined)
      .filter((node) => node.type !== 'BOSS');
    if (!children.length) continue;

    // To ensure that for each choice at least 1 battle is walkable
    const hasBattleChild = children.some((child) => child.type === 'BATTLE');
    if (!hasBattleChild) {
      const mutableChild = children.find((child) => !forcedNodeIds.has(child.id));
      if (mutableChild && isTypeValid(mutableChild, 'BATTLE', nodes, assigned)) {
        mutableChild.type = 'BATTLE';
        assigned.set(mutableChild.id, 'BATTLE');
      }
    }

    // Variety chouce to ensure there isnt paradise or misery allotments 
    const uniqueTypes = new Set(children.map((child) => child.type));
    if (children.length >= 2 && uniqueTypes.size === 1) {
      const sharedType = children[0]?.type;
      if (!sharedType) continue;
      const mutableChildren = children.filter((child) => !forcedNodeIds.has(child.id));
      if (!mutableChildren.length) continue;
      const mutableChild = rng.pick(mutableChildren);
      if (!mutableChild) continue;
      const alternatives = branchVarietyTypes.filter((type) => type !== sharedType);
      for (const candidate of alternatives) {
        if (!isTypeValid(mutableChild, candidate, nodes, assigned)) continue;
        mutableChild.type = candidate;
        assigned.set(mutableChild.id, candidate);
        break;
      }
    }
  }
}
function injectStoryBeats(
  nodes: MapNode[],
  storyBeats: StoryBeat[],
  character: CharacterId | undefined,
  act: number,
  rng: RNG,
  forcedNodeIds: Set<string>
): { previewBossEnemyId?: string } {
  if (!storyBeats.length || !character) return {};

  const sortedBeats = [...storyBeats].sort((a, b) => a.column - b.column);
  const preview = sortedBeats.find((beat) => beat.nodeType === 'boss_preview')
  const bossBattleBeat = sortedBeats.find((beat) => beat.nodeType === 'boss_preview');
  const previewBossEnemyId = preview?.boss ?? bossBattleBeat?.enemy;

  const gameplayBeats = sortedBeats.filter((beat) => beat.column < COLUMNS - 1 && beat.nodeType !== 'boss_battle');
  gameplayBeats.forEach((beat, beatIndex) => {
    const targets = nodes
      .filter((node) => getCol(node) === beat.column)
      .filter((node) => node.type !== 'BOSS');
    for (const target of targets) {
      target.type = beat.nodeType === 'battle' ? 'BATTLE' : 'EVENT';
      target.data = {
        storyLinear: true,
        storyBeatIndex: beatIndex,
        storyBeatCount: sortedBeats.length,
        storyBeat: beat,
        storyAct: act,
        character,
      };
      forcedNodeIds.add(target.id);
    }
  });

  const bossNode = nodes.find((node) => node.type === 'BOSS' && getCol(node) === COLUMNS - 1);
  if (bossNode && bossBattleBeat) {
    bossNode.data = {
      ...((bossNode.data as Record<string, unknown>) ?? {}),
      storyLinear: true,
      storyAct: act,
      storyBeatIndex: sortedBeats.length - 1,
      storyBeatCount: sortedBeats.length,
      storyBeat: bossBattleBeat,
      enemies: [bossBattleBeat.enemy ?? bossBattleBeat.boss ?? previewBossEnemyId].filter((id): id is string => Boolean(id)),
    };
    forcedNodeIds.add(bossNode.id);
  }
  return { previewBossEnemyId };
}

function applyAxisDrivenMapModifiers(
  nodes: MapNode[],
  rng: RNG,
  axisSnapshot: AxisSnapshot | undefined,
  forcedNodeIds: Set<string>,
  storyBeatColumns: Set<number> = new Set()
): void {
  if (!axisSnapshot) return;
  if (axisSnapshot.legitimacy >= 3) {
    const target = nodes.find ((node) => node.type === 'MYSTERY' && !forcedNodeIds.has(node.id));
    if (target) {
      target.type = 'EVENT';
      target.data = { ...(target.data as Record<string, unknown> ?? {}), eventPool: 'general', axisDriven: 'legitimacy_support' };
      forcedNodeIds.add(target.id);
    }
  }

  if (axisSnapshot.control >= 4) {
    const target = nodes
    .filter((node) => node.type === 'BATTLE' && !forcedNodeIds.has(node.id))
    .sort((a, b) => Math.abs(getCol(a) - 9) - Math.abs(getCol(b) - 9))[0]);
    if (target) {
      target.type = 'ELITE';
      target.data = { ...(target.data as Record<string, unknown> ?? {}), axisDriven: 'control_hunt' };
      forcedNodeIds.add(target.id);
    }
  }

  if (axisSnapshot.momentum >= 4) {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const candidates = nodes
      .filter((node) => getCol(node) >= 3 && getCol(node) <= 10)
      .filter((node) => node.connections.length > 0);
    const source = candidates.length ? rng.pick(candidates) : undefined;
    if (source) {
      const next2 = nodes
        .filter((node) => getCol(node) === getCol(source) + 2)
        .sort((a, b) => Math.abs(getRow(a) - getRow(source)) - Math.abs(getRow(b) - getRow(source)))[0];
      const wouldSkipStoryBeat = storyBeatColumns.has(getCol(source) + 1);
      if (next2 && !wouldSkipStoryBeat && !source.connections.includes(next2.id)) {
        source.connections.push(next2.id);
      }
      const sourceData = (source.data as Record<string, unknown> | undefined) ?? {};
      source.data = { ...sourceData, axisDriven: 'momentum_shortcut' };
      if (next2) {
        const targetData = (byId.get(next2.id)?.data as Record<string, unknown> | undefined) ?? {};
        next2.data = { ...targetData, axisDriven: 'momentum_shortcut_target' };
      }
    }
  }
}

function syncBossFromStoryPreview(
  nodes: MapNode[],
  act: number,
  character: CharacterId | undefined,
  rng: RNG,
  previewBossEnemyId?: string
): void {
  if (!previewBossEnemyId) return;
  const bossNode = nodes.find((node) => node.type === 'BOSS' && getComputedStyle(node) === COLUMNS -1);
  if (!bossnode) return;
  bossNode.data = {
    ...((bossNode.data as Record<string, unknown>) ?? buildNodeData('BOSS', act, rng, undefined, character) as Record<string, unknown>),
    enemies: [previewBossEnemyId],
    bossPreviewLinked: true,
  };
}