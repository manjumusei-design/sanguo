import Phaser from 'phaser';
import type { Spine36AssetBinding, Spine36LoadKeys, Spine36RuntimeProbe } from './types';

const VERSION_PATTERN = /(\d+\.\d+\.\d+)/;
const PROBE_BYTES = 256;

function toUint8Array(data: unknown): Uint8Array | null {
  if (data instanceof Uint8Array) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return null;
}

function extractAsciiPrefix(bytes: Uint8Array): string {
  const slice = bytes.subarray(0, Math.min(bytes.length, PROBE_BYTES));
  return Array.from(slice, (value) =>
    value >= 32 && value <= 126 ? String.fromCharCode(value) : ' '
  ).join('');
}

export function detectSpineVersionFromBinary(data: unknown): string | null {
  const bytes = toUint8Array(data);
  if (!bytes) {
    return null;
  }

  const prefix = extractAsciiPrefix(bytes);
  const match = prefix.match(VERSION_PATTERN);
  return match?.[1] ?? null;
}

export function probeSpine36Runtime(
  scene: Phaser.Scene,
  binding: Spine36AssetBinding,
  keys: Spine36LoadKeys
): Spine36RuntimeProbe {
  const binary = scene.cache.binary.get(keys.skelKey);
  if (!binary) {
    return {
      status: 'missing_asset',
      spineVersion: null,
      message: `[Spine36] Missing binary skeleton for ${binding.characterId}:${binding.label}.`,
    };
  }

  const spineVersion = detectSpineVersionFromBinary(binary);
  if (spineVersion?.startsWith('3.6.')) {
    return {
      status: 'unsupported_binary',
      spineVersion,
      message:
        `[Spine36] ${binding.characterId}:${binding.label} uses binary Spine ${spineVersion}. ` +
        'The official Spine 3.6 browser runtime supports JSON skeleton data, not binary .skel data.',
    };
  }

  return {
    status: 'unknown',
    spineVersion,
    message:
      `[Spine36] ${binding.characterId}:${binding.label} could not be attached to a browser runtime. ` +
      'A compatible JSON export or a custom native/WASM binary bridge is required.',
  };
}
