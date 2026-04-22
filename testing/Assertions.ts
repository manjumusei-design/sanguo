import type { CombatState, Combatant, Enemy } from '../types';

// ============================================================
// Test Assertions — content test helpers
// ============================================================

export function assertHP(target: Combatant | Enemy, expected: number, message?: string): void {
  if (target.hp !== expected) {
    throw new Error(message ?? `Expected HP ${expected}, got ${target.hp}`);
  }
}

export function assertBlock(target: Combatant | Enemy, expected: number, message?: string): void {
  if (target.block !== expected) {
    throw new Error(message ?? `Expected Block ${expected}, got ${target.block}`);
  }
}

export function assertEnergy(combatState: CombatState, expected: number, message?: string): void {
  if (combatState.player.energy !== expected) {
    throw new Error(message ?? `Expected Energy ${expected}, got ${combatState.player.energy}`);
  }
}

export function assertHandSize(combatState: CombatState, expected: number, message?: string): void {
  if (combatState.hand.length !== expected) {
    throw new Error(message ?? `Expected hand size ${expected}, got ${combatState.hand.length}`);
  }
}

export function assertDrawPileSize(combatState: CombatState, expected: number, message?: string): void {
  if (combatState.drawPile.length !== expected) {
    throw new Error(message ?? `Expected draw pile size ${expected}, got ${combatState.drawPile.length}`);
  }
}

export function assertStatusStacks(
  target: Combatant | Enemy,
  statusId: string,
  expected: number,
  message?: string
): void {
  const status = target.statuses.find((s) => s.id === statusId);
  const actual = status?.stacks ?? 0;
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${statusId} stacks ${expected}, got ${actual}`);
  }
}

export function assertEnemyDead(enemy: Enemy, message?: string): void {
  if (enemy.hp > 0) {
    throw new Error(message ?? `Expected enemy ${enemy.name} to be dead`);
  }
}

export function assertEnemyAlive(enemy: Enemy, message?: string): void {
  if (enemy.hp <= 0) {
    throw new Error(message ?? `Expected enemy ${enemy.name} to be alive`);
  }
}
