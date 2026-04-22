export type Spine36AnimationSlot =
  | 'appear'
  | 'dead'
  | 'hit_1'
  | 'hit_2'
  | 'hit_3'
  | 'ready'
  | 'run'
  | 'skill_0'
  | 'skill_1'
  | 'skill_2'
  | 'style'
  | 'win';

export interface Spine36AnimationMap {
  appear: string;
  dead: string;
  hit_1: string;
  hit_2: string;
  hit_3: string;
  ready: string;
  run: string;
  skill_0: string;
  skill_1: string;
  skill_2: string;
  style: string;
  win: string;
}

export interface Spine36CharacterAssetMapping {
  id: string;
  label: string;
  note?: string;
  animations: Spine36AnimationMap;
}

export interface Spine36CharacterMapping {
  display_name: string;
  note?: string;
  assets: Spine36CharacterAssetMapping[];
}

export interface Spine36MappingsFile {
  version: number;
  description?: string;
  required_animation_fields: Spine36AnimationSlot[];
  characters: Record<string, Spine36CharacterMapping>;
}

export interface Spine36AssetPaths {
  folder: string;
  skel: string;
  atlas: string;
  texture: string;
}

export interface Spine36AssetBinding {
  characterId: string;
  assetId: string;
  label: string;
  paths: Spine36AssetPaths;
  animations: Spine36AnimationMap;
}

export interface Spine36LoadKeys {
  skelKey: string;
  atlasKey: string;
  textureKey: string;
}

export type Spine36RuntimeStatus =
  | 'ready'
  | 'unsupported_binary'
  | 'missing_asset'
  | 'unknown';

export interface Spine36RuntimeProbe {
  status: Spine36RuntimeStatus;
  spineVersion: string | null;
  message: string;
}
