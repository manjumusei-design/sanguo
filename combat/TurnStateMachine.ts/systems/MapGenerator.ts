import type { CharacterId, EventHistoryEntry, MapGraph, MapNode, NodeType, ChronicleFlags, CampaignSetPieceChain, EncounterFamilyDefinition } from '../types';
import { RNG } from '../core/RNG';
import { getEnemyIdsForNodeType } from '../data/enemies';
import { allCampaignChains, eliteEncounterPresets, encounterFamilies, getBossEncounterPreset, getEncounterFamily } from '../data/campaign';


const COLUMNS = 16;
const GAMEPLAY_COLUMNS = 15;
const ROWS = 7;
const PATH_COUNT = 6;
const JITTER = 0.02;
const SHOP_RATE = 0.05;
const REST_RATE = 0.12;
const EVENT_RATE = 0.22;
const ELITE_RATE_BASE = 0.08;
const ELITE_ASCENSION_MULTIPLER = 1.6;

type PathBias = 'safe' | 'greedy' | 'aggressive';

const SET_PIECES: Record<number, NodeType[][]> = {
    1: [
      ['EVENT', 'REST'],
      ['BATTLE', 'MERCHANT'],
      ['MYSTERY', 'EVENT'],
    ],
    2: [
      ['BATTLE', 'MERCHANT', 'MERCHANT'],
      ['BATTLE', 'REST', 'BATTLE'],
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
}

export function generateMap(options: MapGenOptions): MapGraph {
  const { seed, act, character, eventHistory, flags, ascensionLevel = 0 } = options;
  const rng = new RNG(seed);

  const paths = generatePaths(rng);
  const templateNodes = buildTemplateGridNodes(act);
  applyPathConnections(paths, templateNodes, act);
  const nodes = removePathlessRooms(templateNodes);
  const forcedNodeIds = new Set<string>();
  const setPieceDebug: { sequence?: NodeType[]; startColumn: number | null } = { startColumn: null };
  forceMandatoryTypes(nodes, act, rng, forcedNodeIds);
  assignTypesFromBucket(nodes, act, rng, flags, forcedNodeIds, ascensionLevel);
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
      appliedCampaignChainId: null,
      appliedCampaignChainTitle: null,
    },
  };
}


function generatePaths(rng: RNG): Array<Array<{ column: number; row: number }>> {
  const edgesByColumn: Record<number, Array<{ column: number; row: number }>> = {};
  const paths: Array<Array<{ column: number; row: number }>> = [];
  for(let pathIndex = 0; pathIndex < PATH_COUNT; pathIndex++) {
    let startRow = rng.nextInt(0, ROWS);
    if (pathIndex === 1 && paths[0][0].row === startRow) {
      const alternatives = Array.from({ length: ROWS }, (_, i) => i).filter(r => r !== startRow);
      startRow = alternatives.length > 0 ? rng.pick(alternatives): startRow;
    }

    const path: Array<{ col: number; row: number }> = [{ col: 0, row: startRow }];
    for(let col = 0; col < GAMEPLAY_COLUMNS -1; col++) {
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
		const secondRow = path[1];
		if (!second) return;
    const list = pathsBySecondRow.get(second.row) ?? [];
		list.push(idx);
		pathsBySecondRow.set(secondRow.row, list);
	});

	const usedSecondRows = new set<number>();
	for (const [secondRow, indexes] of pathsBySecondRow.entries()) {
		if (indexes.length > 1) {
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


