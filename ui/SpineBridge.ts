//SpineBridge.ts (AI WRITTEN)

import Phaser from 'phaser';
export interface SpineBridgeObject {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  visible: boolean;
  alpha: number;

  destroy(): void;
  setSkinByName(name: string): void;
  setAnimation(trackIndex: number, animationName: string, loop: boolean): unknown;
  addAnimation(trackIndex: number, animationName: string, loop: boolean, delay: number): unknown;
  setTimeScale(multiplier: number): void;
}

function textureKeyCandidates(path: string): string[] {
  const normalized = path.replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() ?? normalized;
  return [normalized, fileName];
}

function getTextureSourceImage(scene: Phaser.Scene, path: string): TexImageSource {
  const candidates = textureKeyCandidates(path);
  for (const key of textureKeyCandidates(path)) {
    if (scene.textures.exists(key)) {
      const texture = scene.textures.get(key);
      const source = texture.getSourceImage();
      if (source) {
        return source as TexImageSource;
      }
    }
  }

  throw new Error(
    `Texture not found in Phaser cache for atlas path: ${path}. ` +
    `Checked keys: ${candidates.join(', ')}`
  );
}

const VERSION_PATTERN = /(\d+\.\d+\.\d+)/;
const VERSION_PROBE_BYTES = 256;

function detectSpineVersionFromJson(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as { skeleton?: { spine?: unknown } };
    const value = parsed?.skeleton?.spine;
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function detectSpineVersionFromBinary(data: unknown): string | null {
  let bytes: Uint8Array | null = null;

  if (data instanceof Uint8Array) {
    bytes = data;
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  }

  if (!bytes) {
    return null;
  }

  const slice = bytes.subarray(0, Math.min(bytes.length, VERSION_PROBE_BYTES));
  const ascii = Array.from(slice, (value) =>
    value >= 32 && value <= 126 ? String.fromCharCode(value) : ' '
  ).join('');

  return ascii.match(VERSION_PATTERN)?.[1] ?? null;
}

export class SpineBridge implements SpineBridgeObject {
  x: number;
  y: number;
  scaleX = 1;
  scaleY = 1;
  visible = true;
  alpha = 1;

  private scene: Phaser.Scene;
  private gl: WebGLRenderingContext;
  private skeleton: any;
  private state: any;
  private shader: any = null;
  private batcher: any = null;
  private skeletonRenderer: any = null;
  private mvp: any = null;
  private shouldRender = false;
  private disposed = false;
  private key: string;
  private spineVersionHint: string | null = null;

  constructor(scene: Phaser.Scene, key: string, x: number, y: number) {
    this.scene = scene;
    this.key = key;
    this.x = x;
    this.y = y;

    const spine = window.spine;
    if (!spine) {
      throw new Error('window.spine is not available');
    }

    const atlasText = scene.cache.text.get(`${key}:atlas`);
    const jsonText = scene.cache.text.get(`${key}:json`);
    const skelData = scene.cache.binary.get(`${key}:skel`);
    const jsonVersionHint = jsonText ? detectSpineVersionFromJson(jsonText) : null;

    if (!atlasText) {
      throw new Error(`Missing atlas text for ${key}:atlas`);
    }
    if (!jsonText && !skelData) {
      throw new Error(`Missing skeleton data for ${key}:json or ${key}:skel`);
    }

    const renderer = scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    const gl = renderer?.gl;
    if (!gl) {
      throw new Error('SpineBridge requires a WebGL renderer.');
    }
    this.gl = gl;

    const textureLoader = (path: string) => {
      const sourceImage = getTextureSourceImage(scene, path);
      return new spine.webgl.GLTexture(gl, sourceImage);
    };

    const atlas = new spine.TextureAtlas(atlasText, textureLoader);
    const attachmentLoader = new spine.AtlasAttachmentLoader(atlas);
    let skeletonData: any;
    let sourceType: 'json' | 'binary';

    console.info('[SpineBridge] parse inputs', {
      key,
      hasJson: Boolean(jsonText),
      hasSkel: Boolean(skelData),
      jsonBytes: jsonText?.length ?? 0,
      jsonVersionHint,
      skelBytes:
        skelData instanceof ArrayBuffer
          ? skelData.byteLength
          : (skelData as Uint8Array | undefined)?.byteLength,
      atlasLines: atlasText.split('\n').length,
      runtimeHints: {
        hasWebgl: Boolean(spine.webgl),
        hasSkeletonJson: typeof spine.SkeletonJson === 'function',
        hasSkeletonBinary: typeof spine.SkeletonBinary === 'function',
      },
    });

    try {
      if (jsonText) {
        const skeletonJson = new spine.SkeletonJson(attachmentLoader);
        skeletonData = skeletonJson.readSkeletonData(JSON.parse(jsonText));
        sourceType = 'json';
        this.spineVersionHint = jsonVersionHint;
      } else {
        const skeletonBinary = new spine.SkeletonBinary(attachmentLoader);
        this.spineVersionHint = detectSpineVersionFromBinary(skelData);
        skeletonData = skeletonBinary.readSkeletonData(new Uint8Array(skelData));
        sourceType = 'binary';
      }
    } catch (error) {
      console.error('[SpineBridge] skeleton parse failed', {
        key,
        hasJson: Boolean(jsonText),
        hasSkel: Boolean(skelData),
        jsonVersionHint,
        skelVersionHint: detectSpineVersionFromBinary(skelData),
        runtimeHints: {
          hasWebgl: Boolean(spine.webgl),
          hasSkeletonJson: typeof spine.SkeletonJson === 'function',
          hasSkeletonBinary: typeof spine.SkeletonBinary === 'function',
        },
      }, error);
      throw error;
    }
    const stateData = new spine.AnimationStateData(skeletonData);

    this.skeleton = new spine.Skeleton(skeletonData);
    this.state = new spine.AnimationState(stateData);

    this.skeleton.setToSetupPose();
    this.skeleton.updateWorldTransform();

    console.info('[SpineBridge] skeleton loaded', {
      key,
      sourceType,
      skelBytes: skelData instanceof ArrayBuffer ? skelData.byteLength : (skelData as Uint8Array)?.byteLength,
      spineVersionHint: this.spineVersionHint,
      atlasLines: atlasText.split('\n').length,
      animations: this.getAvailableAnimationNames(),
    });

    if (this.getAvailableAnimationNames().length === 0) {
      console.warn('[SpineBridge] Skeleton parsed with zero animations.', {
        key: this.key,
        spineVersionHint: this.spineVersionHint,
        note:
          'This often indicates runtime/data version mismatch for binary .skel. ' +
          'Use matching Spine runtime version for this binary export, or re-export skeleton JSON for the current runtime.',
      });
    }

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.game.events.on(Phaser.Core.Events.POST_RENDER, this.render, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  private ensureRendererObjects(): void {
    if (this.shader && this.batcher && this.skeletonRenderer && this.mvp) {
      return;
    }

    const spine = window.spine;
    this.shader = spine.webgl.Shader.newTwoColoredTextured(this.gl);
    this.batcher = new spine.webgl.PolygonBatcher(this.gl);
    this.skeletonRenderer = new spine.webgl.SkeletonRenderer(this.gl);
    this.skeletonRenderer.premultipliedAlpha = false;
    this.mvp = new spine.webgl.Matrix4();
  }

  setSkinByName(name: string): void {
    this.skeleton.setSkinByName(name);
    this.skeleton.setSlotsToSetupPose();
  }

  private getAvailableAnimationNames(): string[] {
    const data = this.skeleton?.data as { animations?: Array<{ name?: string }> } | undefined;
    const animations = data?.animations;
    if (!Array.isArray(animations)) {
      return [];
    }

    return animations
      .map((item) => item?.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0);
  }

  private resolveAnimationName(animationName: string): string {
    const availableNames = this.getAvailableAnimationNames();

    if (availableNames.length === 0) {
      console.warn('[SpineBridge] no animation list present on skeleton data', {
        key: this.key,
        requested: animationName,
      });
      return animationName;
    }

    const available = new Set(availableNames);

    if (available.has(animationName)) {
      return animationName;
    }

    if (animationName === 'idle' && available.has('ready')) {
      return 'ready';
    }

    const fallbackOrder = ['idle', 'ready', 'run', 'appear'];
    for (const name of fallbackOrder) {
      if (available.has(name)) {
        console.info('[SpineBridge] animation fallback selected', {
          key: this.key,
          requested: animationName,
          resolved: name,
          available: availableNames,
        });
        return name;
      }
    }

    console.warn('[SpineBridge] requested animation not present and no fallback matched', {
      key: this.key,
      requested: animationName,
      available: availableNames,
    });

    return animationName;
  }

  setAnimation(trackIndex: number, animationName: string, loop: boolean): unknown {
    if (this.getAvailableAnimationNames().length === 0) {
      console.warn('[SpineBridge] setAnimation skipped because skeleton has no parsed animations', {
        key: this.key,
        requested: animationName,
        spineVersionHint: this.spineVersionHint,
      });
      return null;
    }

    const resolved = this.resolveAnimationName(animationName);
    try {
      return this.state.setAnimation(trackIndex, resolved, loop);
    } catch (error) {
      console.warn(
        '[SpineBridge] setAnimation failed:',
        {
          key: this.key,
          trackIndex,
          requested: animationName,
          resolved,
          loop,
          available: this.getAvailableAnimationNames(),
        },
        error
      );
      return null;
    }
  }

  addAnimation(trackIndex: number, animationName: string, loop: boolean, delay: number): unknown {
    if (this.getAvailableAnimationNames().length === 0) {
      console.warn('[SpineBridge] addAnimation skipped because skeleton has no parsed animations', {
        key: this.key,
        requested: animationName,
        delay,
        spineVersionHint: this.spineVersionHint,
      });
      return null;
    }

    const resolved = this.resolveAnimationName(animationName);
    try {
      return this.state.addAnimation(trackIndex, resolved, loop, delay);
    } catch (error) {
      console.warn(
        '[SpineBridge] addAnimation failed:',
        {
          key: this.key,
          trackIndex,
          requested: animationName,
          resolved,
          loop,
          delay,
          available: this.getAvailableAnimationNames(),
        },
        error
      );
      return null;
    }
  }

  setTimeScale(multiplier: number): void {
    const value = Number.isFinite(multiplier) ? Phaser.Math.Clamp(multiplier, 0.25, 4) : 1;
    if (this.state && typeof this.state === 'object') {
      this.state.timeScale = value;
    }
  }

  private update(_: number, deltaMs: number): void {
    if (this.disposed) {
      return;
    }

    if (!this.visible) {
      this.shouldRender = false;
      return;
    }

    const delta = deltaMs / 1000;
    this.state.update(delta);
    this.state.apply(this.skeleton);
    const renderer = this.scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    this.skeleton.x = this.x;
    this.skeleton.y = renderer.height - this.y;
    this.skeleton.scaleX = this.scaleX;
    this.skeleton.scaleY = this.scaleY;
    if (this.skeleton.color) {
      this.skeleton.color.a = this.alpha;
    }
    this.skeleton.updateWorldTransform();
    this.shouldRender = true;

    // Rendering is executed in POST_RENDER so Phaser draw calls do not clear over Spine output.
  }

  private render(): void {
    if (this.disposed || !this.visible || !this.shouldRender) {
      return;
    }

    this.ensureRendererObjects();
    const spine = window.spine;
    const renderer = this.scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;

    this.mvp.ortho2d(0, 0, renderer.width, renderer.height);

    this.shader.bind();
    this.shader.setUniformi(spine.webgl.Shader.SAMPLER, 0);
    this.shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, this.mvp.values);

    this.batcher.begin(this.shader);
    this.skeletonRenderer.draw(this.batcher, this.skeleton);
    this.batcher.end();

    // Restore Phaser pipeline state for the next frame.
    renderer.pipelines.rebind();
  }

  destroy(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.game.events.off(Phaser.Core.Events.POST_RENDER, this.render, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.destroy, this);

    this.shader?.dispose?.();
    this.batcher?.dispose?.();
  }
}
