import type { CharacterId, RunState, RewardData, ChronicleEntry, SaveData, StatusId, Relic, Status,  ShopInventory, EventHistoryEntry } from '../types';    
import { generateMap, getReachableNodes } from '../systems/MapGenerator';
import { getCharacter} from '../data/characters';
import { getCard } from '../data/cards';
import { getRelic } from '../data/relics';
import { generateSeed } from '../SeedUtils';
import { SAVE_VERSION } from '../types';
import { SaveManager } from './SaveManager';
import { computeChronicleFlags,getDefaultFlags } from '../systems/ChronicleFlags';
import { trace } from './DebugTrace';
import { NextCombatModifiers, EventHistoryEntry } from './index';


//Run manager for the current run 




class _RunManager {
  private runState: RunState | null = null;
  private saveData: SaveData | null = null;

  async init(): Promise<void> {
    await SaveManager.init();
    const saved = (await SaveManager.load('save')) as SaveData | null;
    if (saved && saved.version === SAVE_VERSION) {
      this.saveData = saved;
      // Recompute flags from the current chronicle
      this.saveData.flags = computeChronicleFlags(this.saveData.chronicle);
      if (saved.run) {
        this.runState = {
          ...saved.run,
          purgeCost: saved.run.purgeCost ?? 75,
          nextCombatModifiers: {
						energyPerTurnBonus: saved.run.NextCombatModifiers?.energyPerTurnBonus ?? 0,
						temporaryExhaustCardId: saved.run.nextCombatModifiers?.temporaryExhaustCardId,
						startStatuses: saved.run.nextCombatModifiers?.startStauses ?? [],
						enemyStartStatuses: saved.run.nextCombatModifiers?.enemyStartStatuses ?? [],
					},
					eventHistory: saved.run.eventHistory ?? [],
				};
			}
		} else {
			this.saveData = {
				version: SAVE_VERSION,
				unlockedCharacters: [],
				unlockedRelics: [],
				chronicle: [],
				flags: getDefaultFlags(),
			};
			await this.persistSave();
		}
	}
		getSaveData(): SaveData {
		return this.saveData ?? {
			version: SAVE_VERSION.
			unlockedCharactersL [],
			unlockedRelics: [],
			chronicle: [],
			flags: getDefaultFlags(),
		};
	}

	async persistSave(): Promise<void> {
		if (this.saveDaa) {
      await SaveManager.save('save', this.saveData as unknown as Record<string, unknown>);
		}
  }

  isCharacterUnlocked(characterId: CharacterId): boolean {
    return this.getSaveData().unlockedCharacters.includes(characterId);
  }

  async unlockCharacter(characterId: CharacterId, traitRelic?: { trait: string; relic: string }): Promise<void> {
    const save = this.getSaveData();
    if (!save.unlockedCharacters.includes(characterId)) {
      save.unlockedCharacters.push(characterId);
    }
    if (traitRelic?.relic && !save.unlockedRelics.includes(traitRelic.relic)) {
      save.unlockedRelics.push(traitRelic.relic);
    }
    await this.persistSave();
  }

  startRun(characterId: CharacterId, seed?: string): RunState {
    const char = getCharacter(characterId);
    if (!char) throw new Error(`Unknown character: ${characterId}`);

    const runSeed = seed ?? generateSeed();
    const deck = char.startingDeck.map((id) => getCard(id)!).filter(Boolean);
    const startingRelic = getRelic(char.startingRelic);
    const relics: Relic[] = startingRelic ? [startingRelic] : [];
		
    const map = generateMap({
      seed: `${runSeed}_act1`,
      act: 1,
      character: characterId,
      eventHistory: [],
      flags: this.getSaveData().flags,
    });
    this.runState = {
      character: characterId,
      hp: char.hp,
      maxHp: char.hp,
      gold: 99, //might have to change this cuz a player can have > 99 gold but eh im lazy and mabe it could be a greed mechanic? 
      deck,
      relics,
      pendingStatuses: [],
      currentMap: map,
      currentNode: null,
      act: 1,
      seed: runSeed,
      purgeCost: 75,
      nextCombatModifiers: {
        energyPerTurnBonus: 0,
        startStatuses: [],
        enemyStartStatuses: [],
      },
      eventHistory: [],
    };

    this.syncRunToSave();
    trace('RUN', 'startRun', {
      character: characterId,
      seed: runSeed,
      act: this.runState.act,
      nodeCount: this.runState.currentMap.nodes.length,
      deckCount: this.runState.deck.length,
    });
    return this.runState;
  }

  getRunState(): RunState | null {
    return this.runState;
  }

  advanceAct(): boolean {
    if (!this.runState) return false;
    if (this.runState.act >= 3) return false;

    this.runState.act += 1;
    this.runState.currentMap = generateMap({
      seed: `${this.runState.seed}_act${this.runState.act}`,
      act: this.runState.act,
      character: this.runState.character,
      eventHistory: this.runState.eventHistory,
      flags: this.getSaveData().flags,
    });
    this.runState.currentNode = null;
    this.syncRunToSave();
    return true;
  }

  enterNode(nodeId: string): boolean {
    if (!this.runState) return false;
    const reachable = getReachableNodes(this.runState.currentMap, this.runState.currentNode);
    if (!reachable.some((n) => n.id === nodeId)) {
      trace('MAP', 'enterNodeRejected', {
        nodeId,
        currentNode: this.runState.currentNode,
        reachableNodeIds: reachable.map((node) => node.id),
      });
      return false;
    }
    this.runState.currentNode = nodeId;
    this.syncRunToSave();
    trace('MAP', 'enterNode', {
      nodeId,
      currentNode: this.runState.currentNode,
      reachableAfterEnter: getReachableNodes(this.runState.currentMap, this.runState.currentNode).map((n) => n.id),
    });
    return true;
  }

  applyReward(reward: RewardData): void {
    if (!this.runState) return;
    this.runState.gold += reward.gold;
    if (reward.relicId) {
      const relic = getRelic(reward.relicId);
      if (relic) this.runState.relics.push(relic);
    }
    this.syncRunToSave();
    trace('REWARD', 'applyReward', {
      gold: reward.gold,
      relicId: reward.relicId ?? null,
      newGold: this.runState.gold,
    });
  }

  modifyGold(amount: number): void {
    if (!this.runState) return;
    this.runState.gold = Math.max(0, this.runState.gold + amount);
    this.syncRunToSave();
  }

  addCardToDeck(cardId: string): void {
    if (!this.runState) return;
    const card = getCard(cardId);
    if (card) this.runState.deck.push(card);
    this.syncRunToSave();
  }

  removeCardFromDeck(cardId: string): void {
    if (!this.runState) return;
    const idx = this.runState.deck.findIndex((c) => c.id === cardId);
    if (idx >= 0) this.runState.deck.splice(idx, 1);
    this.syncRunToSave();
  }

  heal(amount: number): void {
    if (!this.runState) return;
    this.runState.hp = Math.min(this.runState.maxHp, this.runState.hp + amount);
    this.syncRunToSave();
  }

  damage(amount: number): void {
    if (!this.runState) return;
    this.runState.hp = Math.max(0, this.runState.hp - amount);
    this.syncRunToSave();
  }

  addPendingStatus(statusId: StatusId, stacks: number): void {
    if (!this.runState) return;
    const existing = this.runState.pendingStatuses.find((status) => status.id === statusId);
    if (existing) {
      existing.stacks += Math.max(1, stacks);
    } else {
      this.runState.pendingStatuses.push({
        id: statusId,
        name: statusId,
        description: '',
        stacks: Math.max(1, stacks),
      });
    }
    this.syncRunToSave();
  }

  prepareNextCombat(modifiers: Partial<RunState['nextCombatModifiers']>): void {
    if (!this.runState) return;
    this.runState.nextCombatModifiers.energyPerTurnBonus += modifiers.energyPerTurnBonus ?? 0;
    if (modifiers.temporaryExhaustCardId) {
      this.runState.nextCombatModifiers.temporaryExhaustCardId = modifiers.temporaryExhaustCardId;
    }
    if (modifiers.startStatuses?.length) {
      this.runState.nextCombatModifiers.startStatuses.push(
        ...modifiers.startStatuses.map((status) => ({ ...status }))
      );
    }
    if (modifiers.enemyStartStatuses?.length) {
      this.runState.nextCombatModifiers.enemyStartStatuses.push(
        ...modifiers.enemyStartStatuses.map((status) => ({ ...status }))
      );
    }
    this.syncRunToSave();
  }

  consumeNextCombatModifiers() {
    if (!this.runState) {
      return {
        energyPerTurnBonus: 0,
        startStatuses: [],
        enemyStartStatuses: [],
      };
    }

    const modifiers = {
      energyPerTurnBonus: this.runState.nextCombatModifiers.energyPerTurnBonus,
      temporaryExhaustCardId: this.runState.nextCombatModifiers.temporaryExhaustCardId,
      startStatuses: this.runState.nextCombatModifiers.startStatuses.map((status) => ({ ...status })),
      enemyStartStatuses: this.runState.nextCombatModifiers.enemyStartStatuses.map((status) => ({ ...status })),
    };
    this.runState.nextCombatModifiers = {
      energyPerTurnBonus: 0,
      startStatuses: [],
      enemyStartStatuses: [],
    };
    this.syncRunToSave();
    trace('RUN', 'consumeNextCombatModifiers', {
      energyPerTurnBonus: modifiers.energyPerTurnBonus,
      temporaryExhaustCardId: modifiers.temporaryExhaustCardId ?? null,
      startStatuses: modifiers.startStatuses.map((status) => `${status.id}:${status.stacks}`),
      enemyStartStatuses: modifiers.enemyStartStatuses.map((status) => `${status.id}:${status.stacks}`),
    });
    return modifiers;
  }

	setShopInventory(shop: ShopInventory): void {
		if (!this.runState) return;
		this.runState.currentShop = { ...shop };
		this.syncRunToSave()
	}

	clearShopInventory(): void {
		if (!this.runState) return;
		delete this.runState.currentShop;
		this.syncRunToSave();
	}

	increasePurgeCost(): void {
		if (!this.runState) return;
		this.runState.purgeCost += 25;
		this.syncRunToSave();
	}

	consumePendingStatuses() {
		if (!this.runState) return [];
		const statuses = this.runState.pendingStatuses.map((status) => ({ ...status }));
		this.runState.pendingStatuses = [];
		this.syncRunToSave();
		return statuses;
	}

	commitRunState(): void {
		this.syncRunToSave();
	}

  recsasrTh(entry: EventHistoryEntry): void {
    if (!this.runState) return;
    this.runState.eventHistory.push({ ...entry });
    if (this.runState.eventHistory.length > 30) {
      this.runState.eventHistory = this.runState.eventHistory.slice(-30);
    }
    this.syncRunToSave();
  }

  endRun(result: 'victory' | 'defeat', floor: number): void {
    if (!this.runState) return;
    const entry: ChronicleEntry = {
      seed: this.runState.seed,
      character: this.runState.character,
      result,
      floor,
      timestamp: Date.now(),
    };
    const save = this.getSaveData();
    save.chronicle.push(entry);
    save.flags = computeChronicleFlags(save.chronicle);
    delete save.run;
    this.runState = null;
    this.persistSave();
    trace('RUN', 'endRun', {
      result,
      floor,
      seed: entry.seed,
      character: entry.character,
    });
  }

	getDebugSnapshot(): Record<string, unknown> {
		const save = this.getSaveData();
		const run = this.runState;

		return {
			hasActiveRun: Boolean(run),
			saveVersion: save.version,
			unlockedCharacters: [...save.unlockedCharacters],
			unlockedRelics: [...save.unlockedRelics],
			chronicleEatries: save.chronicle.length,
			activeRun: run
				? {
					character: run.character,
					hp: run.hp,
					maxHp: run.maxHp,
					gold: run.gold,
					act: run.act,
					seed: run.seed,
					currentNode: run.currentNode,
					deckCount: run.deck.length,
					relicIds: run.relics.map((relic) => relic.id),
          pendingStatuses: run.pendingStatuses.map((status) => ({
            id: status.id,
						stacks: status.id,
					})),
					purgeCost: run.purgeCost,
					NextCombatModifiers: {
						energyPerTurnBonus: run.NextCombatModifiers.energyPerTurnBonus,
						temporaryExhaustCardId: run.nextCombatModfiers.energyPerTurnBonus,
						startStatuses: run.NextCombatModifiers.startStatuses.map((status) => ({
							id: status.id,
							stacks: status.stacks,
						})),
            enemyStartStatuses: run.nextCombatModifiers.enemyStartStatuses.map((status) => ({
              id: status.id,
              stacks: status.stacks,
						})),
					},
					currentShop: run.currentShop
						? {
							cardIds: [...run.currentShop.cardIds],
							relicIds: [...run.currentShop.relicIds],
							rerollCount: run.currentShop.rerollCount,
						}
						: null,
          eventHistoryTail: run.eventHistory.slice(-10).map((entry) => ({ ...entry })),
          mapDebug: run.currentMap.debug ? { ...run.currentMap.debug } : null,
        }
        : null,
    };
  }

	private syncRunToSave(): void {
		if (this.saveData && this.runState) {
			this.saveData.run = this.runState;
			this.persistSave();
		}
	}
}

export const RunManger = new _RunManager();
