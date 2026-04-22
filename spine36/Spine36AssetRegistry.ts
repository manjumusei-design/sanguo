import type { CharacterId } from '../types';
import type {
  Spine36AnimationMap,
  Spine36AssetBinding,
  Spine36AssetPaths,
  Spine36CharacterAssetMapping,
  Spine36MappingsFile,
} from './types';

const DEFAULT_ANIMATIONS: Spine36AnimationMap = {
  appear: '',
  dead: '',
  hit_1: '',
  hit_2: '',
  hit_3: '',
  ready: '',
  run: '',
  skill_0: '',
  skill_1: '',
  skill_2: '',
  style: '',
  win: '',
};

const SPINE36_FOLDER_OVERRIDES: Record<string, string> = {
  'caocao:primary': 'assets/spine/02三国志/900200',
  'caocao:evil_version': 'assets/spine/01三国志/50200',
  'liubei:primary': 'assets/spine/02三国志/900300',
  'sunquan:primary': 'assets/spine/01三国志/12100',
};

export async function loadSpine36Mappings(): Promise<Spine36MappingsFile | null> {
  try {
    const response = await fetch('/character_mappings.json');
    if (!response.ok) {
      console.warn(`[Spine36] Failed to load /character_mappings.json (${response.status}).`);
      return null;
    }

    const data = (await response.json()) as Spine36MappingsFile;
    return data;
  } catch (error) {
    console.warn('[Spine36] Unable to load character mappings.', error);
    return null;
  }
}

function getAnimationMap(asset: Spine36CharacterAssetMapping): Spine36AnimationMap {
  return {
    ...DEFAULT_ANIMATIONS,
    ...asset.animations,
  };
}

function buildPaths(folder: string): Spine36AssetPaths {
  return {
    folder,
    skel: `${folder}/skeleton.skel`,
    atlas: `${folder}/skeleton.atlas`,
    texture: `${folder}/skeleton.png`,
  };
}

export function getSpine36Binding(
  mappings: Spine36MappingsFile | null,
  characterId: CharacterId,
  preferredLabel = 'primary'
): Spine36AssetBinding | null {
  if (!mappings) {
    return null;
  }

  const character = mappings.characters[characterId];
  if (!character || character.assets.length === 0) {
    return null;
  }

  const asset = character.assets.find((entry) => entry.label === preferredLabel) ?? character.assets[0];
  if (!asset) {
    return null;
  }

  const folderKey = `${characterId}:${asset.label}`;
  const folder = SPINE36_FOLDER_OVERRIDES[folderKey];
  if (!folder) {
    console.warn(`[Spine36] No asset folder override registered for ${folderKey}.`);
    return null;
  }

  return {
    characterId,
    assetId: asset.id,
    label: asset.label,
    paths: buildPaths(folder),
    animations: getAnimationMap(asset),
  };
}
