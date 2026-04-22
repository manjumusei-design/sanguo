/**
 * SpineManager — utility for controlling Spine 2D animations in Phaser 3.
 *
 * Spine-ts runtime abstracts skeletal animation complexity away from Phaser.
 * This wrapper provides a simple static API to avoid passing around game objects.
 *
 * Runtime source: spine-runtimes (GitHub branch 3.8)
 * Package: spine-runtimes@github:EsotericSoftware/spine-runtimes#3.8
 *
 * Usage:
 *   const spine = SpineManager.create(this, 'char_caocao', x, y);
 *   SpineManager.play(spine, 'idle');
 *   SpineManager.playOnce(spine, 'attack', () => console.log('attack done'));
 */

import { SpineBridge } from './SpineBridge';

export interface SpineGameObject {
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

const ANIMATION_DEFAULT = 'idle';

export class SpineManager {
  /**
   * Create a Spine game object in the scene
   * (Requires spine-ts runtime globals and preloaded skeleton assets)
   */
  static create(
    scene: Phaser.Scene,
    key: string,
    x: number,
    y: number,
    options?: {
      scale?: number;
      skin?: string;
      initialAnimation?: string;
      depth?: number;
    }
  ): SpineGameObject | null {
    try {
      const go = new SpineBridge(scene, key, x, y);

      if (options?.scale !== undefined) {
        go.scaleX = options.scale;
        go.scaleY = options.scale;
      }
      if (options?.skin) {
        go.setSkinByName(options.skin);
      }

      go.setAnimation(0, options?.initialAnimation ?? ANIMATION_DEFAULT, true);
      return go;
    } catch (error) {
      console.warn('[SpineManager] Failed to create SpineBridge:', error);
      return null;
    }
  }

  /** Play animation (looping by default for idle animations) */
  static play(go: SpineGameObject, animationName: string, loop = true): void {
    go.setAnimation(0, animationName, loop);
  }

  /** Play one-shot animation with completion callback (fallback timer for listener API variance) */
  static playOnce(go: SpineGameObject, animationName: string, onComplete?: () => void): void {
    const entry = go.setAnimation(0, animationName, false);
    if (onComplete && entry) {
      // The Spine runtime exposes a listener API, but the exact shape
      // depends on the spine-ts version. Use a timed fallback.
      setTimeout(onComplete, 800);
    }
  }

  /** Queue animation to play after current animation completes */
  static queueAnimation(go: SpineGameObject, animationName: string, loop = true, delay = 0): void {
    go.addAnimation(0, animationName, loop, delay);
  }

  /** Switch active skin (used for character outfit/equipment changes) */
  static setSkin(go: SpineGameObject, skinName: string): void {
    go.setSkinByName(skinName);
  }

  /** Flip character sprite horizontally (for left/right facing) */
  static setFacing(go: SpineGameObject, facing: 'left' | 'right'): void {
    go.scaleX = facing === 'left' ? -Math.abs(go.scaleX) : Math.abs(go.scaleX);
  }

  /** Adjust animation playback speed for this actor */
  static setSpeed(go: SpineGameObject, multiplier: number): void {
    go.setTimeScale(multiplier);
  }

  /** Fade in/out (transition effect for scene changes) */
  static fade(scene: Phaser.Scene, go: SpineGameObject, targetAlpha: number, duration = 300): void {
    scene.tweens.add({
      targets: go,
      alpha: targetAlpha,
      duration,
      ease: 'Quad.easeInOut',
    });
  }

  /** Scale bounce effect (UI feedback for player interactions) */
  static pop(scene: Phaser.Scene, go: SpineGameObject, scaleMult = 1.2, duration = 150): void {
    const base = go.scaleX;
    scene.tweens.add({
      targets: go,
      scaleX: base * scaleMult,
      scaleY: base * scaleMult,
      duration,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }
}
