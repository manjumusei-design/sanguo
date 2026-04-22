import type { ChronicleFlags, ChronicleEntry, NodeType } from '../types';

export function computeChronicleFlags(entries: ChronicleEntry[]): ChronicleFlags {
  const total = entries.length;
  if (total === 0) {
    return getDefaultFlags();
  }

  const byCharacter: Record<string, { wins: number; runs: number }> = {
    caocao: { wins: 0, runs: 0 },
    liubei: { wins: 0, runs: 0 },
    sunquan: { wins: 0, runs: 0 },
  };

  for (const entry of entries) {
    byCharacter[entry.character].runs += 1;
    if (entry.result === 'victory') {
      byCharacter[entry.character].wins += 1;
    }
  }