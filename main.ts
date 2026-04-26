import Phaser from 'phaser';
import gameConfig from './core/GameConfig';
import { GAME_HEIGHT, GAME_WIDTH } from './core/GameConfig';

function installCrispTextPatch(): void {
  const factoryProto = Phaser.GameObjects.GameObjectFactory.prototype as Phaser.GameObjects.GameObjectFactory & {
    __tkpcCrispTextPatched__?: boolean;
    text: (
      x: number,
      y: number,
      text?: string | string[],
      style?: Phaser.Types.GameObjects.Text.TextStyle
    ) => Phaser.GameObjects.Text;
  };
  if (factoryProto.__tkpcCrispTextPatched__) {
    return;
  }

  const originalTextFactory = factoryProto.text;
  factoryProto.text = function patchedTextFactory(
    x: number,
    y: number,
    text?: string | string[],
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const snappedX = Math.round(Number.isFinite(x) ? x : 0);
    const snappedY = Math.round(Number.isFinite(y) ? y : 0);
    const instance = originalTextFactory.call(this, snappedX, snappedY, text, style);
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    instance.setResolution(dpr);
    instance.setPosition(Math.round(instance.x), Math.round(instance.y));
    return instance;
  };

  factoryProto.__tkpcCrispTextPatched__ = true;

  const textProto = Phaser.GameObjects.Text.prototype as Phaser.GameObjects.Text & {
    __tkpcSnapPatched__?: boolean;
    setPosition: (x?: number, y?: number, z?: number, w?: number) => Phaser.GameObjects.Text;
    setX: (value?: number) => Phaser.GameObjects.Text;
    setY: (value?: number) => Phaser.GameObjects.Text;
  };
  if (textProto.__tkpcSnapPatched__) {
    return;
  }

  const originalSetPosition = textProto.setPosition;
  const originalSetX = textProto.setX;
  const originalSetY = textProto.setY;

  textProto.setPosition = function patchedSetPosition(
    x?: number,
    y?: number,
    z?: number,
    w?: number
  ): Phaser.GameObjects.Text {
    const sx = Math.round(Number.isFinite(x as number) ? (x as number) : 0);
    const sy = Math.round(Number.isFinite(y as number) ? (y as number) : 0);
    return originalSetPosition.call(this, sx, sy, z, w);
  };

  textProto.setX = function patchedSetX(value?: number): Phaser.GameObjects.Text {
    const sx = Math.round(Number.isFinite(value as number) ? (value as number) : 0);
    return originalSetX.call(this, sx);
  };

  textProto.setY = function patchedSetY(value?: number): Phaser.GameObjects.Text {
    const sy = Math.round(Number.isFinite(value as number) ? (value as number) : 0);
    return originalSetY.call(this, sy);
  };

  textProto.__tkpcSnapPatched__ = true;
}

installCrispTextPatch();


(globalThis as Record<string, unknown>).__TKPC_DEBUG__ = import.meta.env.DEV;
(globalThis as Record<string, unknown>).__TKPC_ENEMY_HP_OVERRIDE__ = undefined;

if (import.meta.env.DEV) {
  void import('./systems/TestHarness');
}

if (!window.spine) {
  console.warn('[Spine38] window.spine missing. Check /public/vendor/spine/spine-webgl.js');
}

const game = new Phaser.Game(gameConfig);

function applyIntegerLetterboxHiDPI(gameInstance: Phaser.Game): void {
  const canvas = gameInstance.canvas;
  const renderer = gameInstance.renderer as unknown as {
    gl?: { drawingBufferWidth: number; drawingBufferHeight: number };
  };
  if (!canvas) return;

  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const viewportW = Math.max(1, Math.floor(window.innerWidth));
  const viewportH = Math.max(1, Math.floor(window.innerHeight));
  const fitScale = Math.min(viewportW / GAME_WIDTH, viewportH / GAME_HEIGHT);
  const integerScale = fitScale >= 1 ? Math.max(1, Math.floor(fitScale)) : fitScale;

  const cssWidth = Math.max(1, Math.round(GAME_WIDTH * integerScale));
  const cssHeight = Math.max(1, Math.round(GAME_HEIGHT * integerScale));
  const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
  const backingHeight = Math.max(1, Math.round(cssHeight * dpr));

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';

  canvas.width = backingWidth;
  canvas.height = backingHeight;

  gameInstance.scale.resize(GAME_WIDTH, GAME_HEIGHT);

  const zoom = cssWidth / GAME_WIDTH;
  gameInstance.scene.scenes.forEach((scene) => {
    if (scene.cameras?.main) {
      scene.cameras.main.setZoom(zoom);
    }
  });
  (gameInstance as unknown as { __tkpcZoom?: number }).__tkpcZoom = zoom;

  if (import.meta.env.DEV) {
    console.debug('[ViewportIntegerHiDPI]', {
      dpr,
      viewportW,
      viewportH,
      fitScale,
      integerScale,
      cssWidth,
      cssHeight,
      backingWidth,
      backingHeight,
      gl: renderer.gl
        ? { width: renderer.gl.drawingBufferWidth, height: renderer.gl.drawingBufferHeight }
        : null,
    });
  }
}

const applyViewport = () => applyIntegerLetterboxHiDPI(game);
applyViewport();
window.addEventListener('resize', applyViewport);

game.scene.on('start', (_key: string, scene: Phaser.Scene) => {
  const tkpcGame = game as unknown as { __tkpcZoom?: number };
  if (typeof tkpcGame.__tkpcZoom === 'number' && scene.cameras?.main) {
    scene.cameras.main.setZoom(tkpcGame.__tkpcZoom);
  }
});

if (import.meta.env.DEV) {
  const debugWindow = window as unknown as {
    __TKPC_GAME?: Phaser.Game;
    __debugUI?: Record<string, () => unknown>;
  };
  debugWindow.__TKPC_GAME = game;

  const getUiSnapshot = () => {
    const canvas = game.canvas;
    const rect = canvas.getBoundingClientRect();
    const renderer = game.renderer as unknown as {
      resolution?: number;
      width?: number;
      height?: number;
      gl?: { drawingBufferWidth: number; drawingBufferHeight: number };
    };
    const scale = game.scale;
    return {
      forcedLogicalSize: { width: GAME_WIDTH, height: GAME_HEIGHT },
      dpr: window.devicePixelRatio || 1,
      rendererResolution: renderer.resolution ?? null,
      canvasAttributeSize: { width: canvas.width, height: canvas.height },
      canvasCssSize: { width: Math.round(rect.width), height: Math.round(rect.height) },
      canvasClientSize: { width: canvas.clientWidth, height: canvas.clientHeight },
      webglBuffer: renderer.gl
        ? { width: renderer.gl.drawingBufferWidth, height: renderer.gl.drawingBufferHeight }
        : null,
      gameSize: { width: scale.gameSize.width, height: scale.gameSize.height },
      displaySize: { width: scale.displaySize.width, height: scale.displaySize.height },
      parentSize: { width: scale.parentSize.width, height: scale.parentSize.height },
      scaleMode: 'NONE+INTEGER_LETTERBOX_HIDPI',
      appliedCssScale: +(canvas.clientWidth / GAME_WIDTH).toFixed(4),
    };
  };

  const getUiDebugString = () => JSON.stringify(getUiSnapshot());
  debugWindow.__debugUI = {
    report: () => {
      const snapshot = getUiSnapshot();
      console.log('[UIDebug]', snapshot);
      return snapshot;
    },
    string: () => {
      const value = getUiDebugString();
      console.log(value);
      return value;
    },
    copy: async () => {
      const value = getUiDebugString();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        console.log('[UIDebug] copied to clipboard', value);
        return value;
      }
      console.log('[UIDebug] clipboard unavailable', value);
      return value;
    },
  };
}
