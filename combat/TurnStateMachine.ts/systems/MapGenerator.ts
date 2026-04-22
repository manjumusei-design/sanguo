import type { CharacterId, EventHistoryEntry, MapGraph, MapNode, NodeType, ChronicleFlags, CampaignSetPieceChain, EncounterFamilyDefinition } from '../types';
import { RNG } from '../core/RNG';
import { getEnemyIdsForNodeType } from '../data/enemies';
import { allCampaignChains, eliteEncounterPresets, encounterFamilies, getBossEncounterPreset, getEncounterFamily } from '../data/campaign';

const ACT_WEIGHTS: Record<number, Record<NodeType, number>> = {
  1: {
    BATTLE: 55,
    ELITE: 5,
    EVENT: 20,
    REST: 10,
    MERCHANT: 5,
    MYSTERY: 5,
    TREASURE: 5,
    BOSS: 0,
  },
  2: {
    BATTLE: 40,
    ELITE: 10,
    EVENT: 25,
    REST: 10,
    MERCHANT: 5,
    MYSTERY: 12,
    TREASURE: 8,
    BOSS: 0,
  },
  3: {
    BATTLE: 35,
    ELITE: 18,
    EVENT: 25,
    REST: 10,
    MERCHANT: 5,
    MYSTERY: 17,
    TREASURE: 10,
    BOSS: 0,
  },
};

const COLUMNS = 6;
const ROWS = 3; 
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
}

export function generateMap(options: MapGenOptions): MapGraph {
  const { seed, act, character, eventHistory, flags } = options;
  const rng = new RNG(seed);
  const baseWeights = ACT_WEIGHTS[act] ?? ACT_WEIGHTS[3];
  const weights = applyFlagWeights({ ...baseWeights }, flags);
  const pathBias = rng.pick<PathBias>(['safe', 'greedy', 'aggressive']);
  const favoredRow = rng.nextInt(0, ROWS);

  const nodes: MapNode[] = [];
  const nodeIdsByCol: string[][] = [];

  // Build columns
  for (let col = 0; col < COLUMNS; col++) {
    const colNodes: MapNode[] = [];
    const isFirst = col === 0;
    const isLast = col === COLUMNS - 1;
    const rowCount = isFirst || isLast ? 1 : rng.nextInt(2, 4); // 2-3 nodes for middle columns

    for (let row = 0; row < rowCount; row++) {
      const id = `n_${act}_${col}_${row}`;
      let type: NodeType;

      if (isFirst) {
        type = 'BATTLE';
      } else if (isLast) {
        type = 'BOSS';
      } else {
        type = pickNodeType(rng, biasWeightsForPath(weights, pathBias, row, favoredRow));
      }

      const node: MapNode = {
        id,
        type,
        act,
        x: col / (COLUMNS - 1),
        y: rowCount === 1 ? 0.5 : row / (rowCount - 1),
        connections: [],
        data: buildNodeData(type, act, rng, undefined, character),
      };

      colNodes.push(node);
      nodes.push(node);
    }

    nodeIdsByCol.push(colNodes.map((n) => n.id));
  }

  for (let col = 0; col < COLUMNS - 1; col++) {
    const currentIds = nodeIdsByCol[col];
    const nextIds = nodeIdsByCol[col + 1];

    for (const fromId of currentIds) {
      const connectionCount = rng.nextInt(1, Math.min(3, nextIds.length + 1));
      const shuffled = rng.shuffle([...nextIds]);
      const targets = shuffled.slice(0, connectionCount);

      const fromNode = nodes.find((n) => n.id === fromId)!;
      for (const target of targets) {
        if (!fromNode.connections.includes(target)) {
          fromNode.connections.push(target);
        }
      }
    }

    // This is to ensure that every next node has at least one incoming connection
    for (const toId of nextIds) {
      const hasIncoming = currentIds.some((fromId) => {
        const fromNode = nodes.find((n) => n.id === fromId)!;
        return fromNode.connections.includes(toId);
      });
      if (!hasIncoming) {
        const fromId = rng.pick(currentIds);
        const fromNode = nodes.find((n) => n.id === fromId)!;
        if (!fromNode.connections.includes(toId)) {
          fromNode.connections.push(toId);
        }
      }
    }
  }

  let setPieceDebug: { sequence?: NodeType[]; startColumn: number | null } = { startColumn: null };
  let campaignChainDebug: CampaignSetPieceChain | null = null;

  if (character && act >= 2) {
    campaignChainDebug = selectCampaignChain(character, act, pathBias, eventHistory ?? [], rng);
    if (campaignChainDebug) {
      applyCampaignChain(nodes, act, rng, campaignChainDebug);
    } else {
      setPieceDebug = applySetPiece(nodes, act, rng);
    }
  } else {
    setPieceDebug = applySetPiece(nodes, act, rng);
  }
  enforceActPacing(nodes, act);
  applyNodeJitter(nodes, rng);
  computeBezierCurves(nodes);
  reduceLineCrossings(nodes, rng);

  return {
    nodes,
    seed,
    act,
    debug: {
      pathBias,
      favoredRow,
      appliedSetPiece: setPieceDebug.sequence,
      setPieceStartColumn: setPieceDebug.startColumn,
      appliedCampaignChainId: campaignChainDebug?.id ?? null,
      appliedCampaignChainTitle: campaignChainDebug?.title ?? null,
    },
  };
}

function applyFlagWeights(weights: Record<NodeType, number>, flags?: ChronicleFlags): Record<NodeType, number> {
  if (!flags?.mapWeightModifiers) return weights;
  const result = { ...weights };
  for (const [type, mod] of Object.entries(flags.mapWeightModifiers)) {
    const t = type as NodeType;
    if (mod !== undefined) {
      result[t] = Math.max(0, result[t] + mod);
    }
  }
  return result;
}

function pickNodeType(rng: RNG, weights: Record<NodeType, number>): NodeType {
  const types = (Object.keys(weights) as NodeType[]).filter((t) => t !== 'BOSS');
  const total = types.reduce((sum, t) => sum + weights[t], 0);
  let roll = rng.next() * total;
  for (const t of types) {
    roll -= weights[t];
    if (roll <= 0) return t;
  }
  return 'BATTLE';
}

function biasWeightsForPath(
  weights: Record<NodeType, number>,
  pathBias: PathBias,
  row: number,
  favoredRow: number
): Record<NodeType, number> {
  const next = { ...weights };
  const matchesBiasRow = row === favoredRow;
  if (!matchesBiasRow) {
    return next;
  }

  switch (pathBias) {
    case 'safe':
      next.REST += 12;
      next.EVENT += 10;
      next.ELITE = Math.max(0, next.ELITE - 8);
      next.MYSTERY = Math.max(0, next.MYSTERY - 4);
      break;
    case 'greedy':
      next.MYSTERY += 12;
      next.MERCHANT += 10;
      next.REST = Math.max(0, next.REST - 4);
      break;
    case 'aggressive':
      next.ELITE += 12;
      next.BATTLE += 8;
      next.REST = Math.max(0, next.REST - 6);
      next.EVENT = Math.max(0, next.EVENT - 4);
      break;
  }

  return next;
}

function buildNodeData(
  type: NodeType,
  act: number,
  rng: RNG,
  encounterFamilyId?: string,
  character?: CharacterId
): unknown {
  switch (type) {
    case 'BATTLE':
    case 'ELITE': {
      if (type === 'ELITE') {
        const authoredElite = maybePickEliteEncounter(act, rng);
        if (authoredElite) {
          return {
            enemies: [...authoredElite.enemies],
            encounterFamilyId: authoredElite.encounterFamilyId,
            authoredEncounterId: authoredElite.id,
            encounterLabel: authoredElite.label,
            historicalBasis: authoredElite.historicalBasis,
          };
        }
      }

      const family = encounterFamilyId ? getEncounterFamily(encounterFamilyId) : maybePickEncounterFamily(act, type, rng);
      if (family) {
        return {
          enemies: buildEncounterFromFamily(family.id, type, rng),
          encounterFamilyId: family.id,
        };
      }

      const pool = getEnemyIdsForNodeType(type, act);
      const count = type === 'ELITE' ? rng.nextInt(1, 3) : rng.nextInt(1, 4);
      const enemies: string[] = [];
      for (let i = 0; i < count; i++) {
        enemies.push(rng.pick(pool));
      }
      return { enemies };
    }
    case 'BOSS': {
      const boss = getBossEncounterPreset(act, character);
      if (boss) {
        return {
          enemies: [...boss.enemies],
          encounterFamilyId: boss.encounterFamilyId,
          authoredEncounterId: boss.id,
          encounterLabel: boss.label,
          historicalBasis: boss.historicalBasis,
        };
      }

      const pool = getEnemyIdsForNodeType('BOSS', act);
      return { enemies: [rng.pick(pool)] };
    }
    case 'EVENT':
      return { eventPool: 'general' };
    case 'REST':
      return {};
    case 'MERCHANT':
      return {};
    case 'MYSTERY':
      return buildMysteryData(act, rng, encounterFamilyId);
    case 'TREASURE':
      return { gold: rng.nextInt(30, 80) };
    default:
      return {};
  }
}

function buildMysteryData(act: number, rng: RNG, encounterFamilyId?: string): unknown {
  const roll = rng.next();
  if (roll < 0.5) {
    return { mysteryType: 'event' };
  }

  if (roll < 0.75) {
    const family = encounterFamilyId ? getEncounterFamily(encounterFamilyId) : maybePickEncounterFamily(act, 'BATTLE', rng);
    const enemies = family
      ? buildEncounterFromFamily(family.id, 'BATTLE', rng)
      : [rng.pick(getEnemyIdsForNodeType('BATTLE', act))];
    return {
      mysteryType: 'ambush',
      enemies,
      encounterFamilyId: family?.id ?? encounterFamilyId,
      combatModifiers: {
        playerStatuses: [{ id: 'starving', stacks: 1 }],
      },
    };
  }

  return {
    mysteryType: 'risk_reward',
    rewardType: rng.pick(['gold_for_burning', 'remove_for_panic', 'rare_relic_for_hp']),
  };
}

function applySetPiece(nodes: MapNode[], act: number, rng: RNG): { sequence?: NodeType[]; startColumn: number | null } {
  const sequences = SET_PIECES[act];
  if (!sequences?.length) return { startColumn: null };

  const sequence = rng.pick(sequences);
  const startColumn = Math.min(2, Math.max(1, rng.nextInt(1, 3)));
  const anchorRow = rng.nextInt(0, ROWS);

  sequence.forEach((type, offset) => {
    const col = startColumn + offset;
    const candidates = nodes.filter((node) => Number(node.id.split('_')[2]) === col && node.type !== 'BOSS');
    if (!candidates.length) return;

    const chosen = [...candidates].sort((a, b) => Math.abs(a.y - anchorRow / Math.max(1, ROWS - 1)) - Math.abs(b.y - anchorRow / Math.max(1, ROWS - 1)))[0];
    chosen.type = type;
    chosen.data = buildNodeData(type, act, new RNG(`${chosen.id}::setpiece`));
  });

  return {
    sequence,
    startColumn,
  };
}

function selectCampaignChain(
  character: CharacterId,
  act: number,
  pathBias: PathBias,
  eventHistory: EventHistoryEntry[],
  rng: RNG
): CampaignSetPieceChain | null {
  const candidates = allCampaignChains.filter((chain) => chain.character === character && chain.act === act);
  if (!candidates.length) return null;

  const weighted = candidates.map((chain) => {
    let weight = 1;
    if (chain.trigger.pathBias === pathBias) {
      weight += 3;
    }
    if (chain.trigger.priorEventId && eventHistory.some((entry) => entry.id === chain.trigger.priorEventId)) {
      weight += 2;
    }
    return { item: chain, weight };
  });

  return rng.pickWeighted(weighted);
}

function applyCampaignChain(nodes: MapNode[], act: number, rng: RNG, chain: CampaignSetPieceChain): void {
  const middleColumns = Array.from(new Set(nodes
    .map((node) => Number(node.id.split('_')[2]))
    .filter((column) => column > 0 && column < COLUMNS - 1)))
    .sort((a, b) => a - b);
  const maxStartIndex = Math.max(0, middleColumns.length - chain.sequence.length);
  const startIndex = rng.nextInt(0, maxStartIndex + 1);
  const targetColumns = middleColumns.slice(startIndex, startIndex + chain.sequence.length);
  const anchorRow = rng.nextInt(0, ROWS);

  chain.sequence.forEach((step, index) => {
    const col = targetColumns[index];
    if (col === undefined) return;

    const candidates = nodes.filter((node) => Number(node.id.split('_')[2]) === col && node.type !== 'BOSS');
    if (!candidates.length) return;

    const chosen = [...candidates].sort((a, b) => Math.abs(a.y - anchorRow / Math.max(1, ROWS - 1)) - Math.abs(b.y - anchorRow / Math.max(1, ROWS - 1)))[0];
    chosen.type = step.nodeType;

    if (step.nodeType === 'EVENT') {
      chosen.data = {
        eventPool: 'general',
        forcedEventId: step.forcedEventId,
        campaignChainId: chain.id,
      };
      return;
    }

    if (step.nodeType === 'MYSTERY') {
      chosen.data = step.mysteryType === 'event'
        ? { mysteryType: 'event', forcedEventId: step.forcedEventId, campaignChainId: chain.id }
        : buildMysteryData(act, new RNG(`${chosen.id}::campaign`), step.encounterFamilyId);
      return;
    }

    chosen.data = {
      ...((buildNodeData(step.nodeType, act, new RNG(`${chosen.id}::campaign`), step.encounterFamilyId, chain.character) as Record<string, unknown>) ?? {}),
      campaignChainId: chain.id,
    };
  });
}

function maybePickEliteEncounter(act: number, rng: RNG): (typeof eliteEncounterPresets)[number] | undefined {
  const available = eliteEncounterPresets.filter((encounter) => encounter.act === act);
  if (!available.length) {
    return undefined;
  }

  return rng.pick(available);
}

function maybePickEncounterFamily(act: number, type: 'BATTLE' | 'ELITE', rng: RNG): EncounterFamilyDefinition | undefined {
  if (act < 2) {
    return undefined;
  }

  const familyChance = type === 'ELITE' ? 0.7 : 0.45;
  if (rng.next() > familyChance) {
    return undefined;
  }

  const available = encounterFamilies.filter((family) => family.acts.includes(act));
  return available.length ? rng.pick(available) : undefined;
}

function buildEncounterFromFamily(
  encounterFamilyId: string,
  type: 'BATTLE' | 'ELITE',
  rng: RNG
): string[] {
  const family = getEncounterFamily(encounterFamilyId);
  if (!family) {
    return [];
  }

  const uniqueEnemies = Array.from(new Set(family.enemies));
  const targetCount = type === 'ELITE'
    ? Math.min(uniqueEnemies.length, Math.max(2, Math.min(3, uniqueEnemies.length)))
    : Math.min(uniqueEnemies.length, Math.max(2, Math.min(3, uniqueEnemies.length)));
  const selected = rng.shuffle([...uniqueEnemies]).slice(0, targetCount);

  if (selected.length >= 2) {
    return selected;
  }

  return selected.length === 1 ? [selected[0], selected[0]] : [rng.pick(getEnemyIdsForNodeType(type, 2))];
}

function enforceActPacing(nodes: MapNode[], act: number): void {
  const middleNodes = nodes.filter((node) => node.type !== 'BOSS' && node.id.split('_')[2] !== '0');

  if (act === 1) {
    const earlyElites = middleNodes.filter((node) => node.type === 'ELITE' && Number(node.id.split('_')[2]) <= 2);
    for (const elite of earlyElites.slice(1)) {
      elite.type = 'BATTLE';
      elite.data = buildNodeData('BATTLE', act, new RNG(`${elite.id}::rebalance`));
    }

    const hasRest = middleNodes.some((node) => node.type === 'REST' && Number(node.id.split('_')[2]) < 5);
    if (!hasRest) {
      const candidate = middleNodes.find((node) => Number(node.id.split('_')[2]) === 4) ?? middleNodes[middleNodes.length - 1];
      if (candidate) {
        candidate.type = 'REST';
        candidate.data = {};
      }
    }
  }

  if (act === 2) {
    const hasMerchantMidAct = middleNodes.some((node) => node.type === 'MERCHANT' && Number(node.id.split('_')[2]) >= 2 && Number(node.id.split('_')[2]) <= 4);
    if (!hasMerchantMidAct) {
      const candidate = middleNodes.find((node) => Number(node.id.split('_')[2]) === 3) ?? middleNodes[0];
      if (candidate) {
        candidate.type = 'MERCHANT';
        candidate.data = {};
      }
    }
  }
}

export function getReachableNodes(map: MapGraph, currentNodeId: string | null): MapNode[] {
  if (currentNodeId === null) {
    return map.nodes.filter((node) => node.id.split('_')[2] === '0');
  }

  const current = map.nodes.find((n) => n.id === currentNodeId);
  if (!current) return [];
  return map.nodes.filter((n) => current.connections.includes(n.id));
}

export function getStartNode(map: MapGraph): MapNode {
  const firstCol = map.nodes.filter((n) => n.id.split('_')[2] === '0');
  return firstCol[0] || map.nodes[0];
}

//Helpers
function applyNodeJitter(nodes: MapNode[], rng: RNG): void {
  const JITTER = 0.06;
  for (const node of nodes) {
    const jx = (rng.next() - 0.5) * 2 * JITTER;
    const jy = (rng.next() - 0.5) * 2 * JITTER;
    node.x = clamp(node.x + jx, 0, 1);
    node.y = clamp(node.y + jy, 0, 1);
  }
}

function computeBezierCurves(nodes: MapNode[]): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  for (const from of nodes) {
    from.curveData = {};
    for (const toId of from.connections) {
      const to = nodeById.get(toId);
      if (!to) continue;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const cp1x = from.x + dx * 0.25;
      const cp1y = from.y + dy * 0.45 + (dy > 0 ? 0.06 : -0.06);
      const cp2x = from.x + dx * 0.75;
      const cp2y = to.y - dy * 0.45 + (dy > 0 ? -0.06 : 0.06);
      from.curveData[toId] = {
        cp1x: clamp(cp1x, 0, 1),
        cp1y: clamp(cp1y, 0, 1),
        cp2x: clamp(cp2x, 0, 1),
        cp2y: clamp(cp2y, 0, 1),
      };
    }
  }
}

function reduceLineCrossings(nodes: MapNode[], rng: RNG): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const NUDGE = 0.04;
  const MAX_PASSES = 3;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let improved = false;
    for (const a of nodes) {
      for (const bId of a.connections) {
        const b = nodeById.get(bId);
        if (!b) continue;
        for (const c of nodes) {
          if (c.id <= a.id) continue;
          for (const dId of c.connections) {
            const d = nodeById.get(dId);
            if (!d) continue;
            if (segmentsShareEndpoint(a, b, c, d)) continue;
            if (!segmentsIntersect(a, b, c, d)) continue;
            const nudgeA = (rng.next() - 0.5) * 2 * NUDGE;
            a.y = clamp(a.y + nudgeA, 0.05, 0.95);
            improved = true;
          }
        }
      }
    }
    if (!improved) break;
  }
}

function segmentsShareEndpoint(
  a: MapNode, b: MapNode, c: MapNode, d: MapNode
): boolean {
  return (
    a.id === c.id || a.id === d.id || b.id === c.id || b.id === d.id
  );
}

function segmentsIntersect(
  a: MapNode, b: MapNode, c: MapNode, d: MapNode
): boolean {
  const ccw = (p1: MapNode, p2: MapNode, p3: MapNode) =>
    (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  return (
    ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
