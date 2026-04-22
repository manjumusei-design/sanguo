import type { Card, Relic, CharacterId } from '../types';
import type { SerializedPreludeState } from '../systems/PreludeEngine';

export type SessionMode = 'menu' | 'prelude' | 'run';

export interface SessionContext {
  mode: SessionMode;
  hp: number;
  maxHp: number;
  gold: number;
  deck: Card[];
  relics: Relic[];
  preludeCharacterId?: CharacterId;
  preludeState?: SerializedPreludeState;
}

let current: SessionContext | null = null;

export const GameSession = {
  set(ctx: SessionContext): void {
    current = ctx;
  },
  get(): SessionContext | null {
    return current;
  },
  clear(): void {
    current = null;
  },
  updateHp(hp: number, maxHp: number): void {
    if (current) {
      current.hp = hp;
      current.maxHp = maxHp;
    }
  },
  updateGold(gold: number): void {
    if (current) {
      current.gold = gold;
    }
  },
};
