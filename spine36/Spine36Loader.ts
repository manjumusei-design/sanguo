import Phaser from 'phaser';
import type { Spine36AssetBinding, Spine36LoadKeys } from './types';

function keyFor(binding: Spine36AssetBinding, suffix: string): string {
  return `spine36:${binding.characterId}:${binding.label}:${suffix}`;
}

export function queueSpine36Assets(
  scene: Phaser.Scene,
  binding: Spine36AssetBinding
): Spine36LoadKeys {
  const keys = {
    skelKey: keyFor(binding, 'skel'),
    atlasKey: keyFor(binding, 'atlas'),
    textureKey: keyFor(binding, 'texture'),
  };

  if (!scene.cache.binary.exists(keys.skelKey)) {
    scene.load.binary(keys.skelKey, binding.paths.skel);
  }

  if (!scene.cache.text.exists(keys.atlasKey)) {
    scene.load.text(keys.atlasKey, binding.paths.atlas);
  }

  if (!scene.textures.exists(keys.textureKey)) {
    scene.load.image(keys.textureKey, binding.paths.texture);
  }

  return keys;
}
