import type { CSSProperties } from 'react';
import type { CharacterAnimation } from '../types';

/** Box size (in px) that displays one frame at `targetHeight` tall, preserving its native aspect ratio. */
export function frameBoxSize(anim: CharacterAnimation, targetHeight: number): { width: number; height: number } {
  return { width: targetHeight * (anim.frameWidth / anim.frameHeight), height: targetHeight };
}

/** Static CSS background showing a single frame (defaults to the first) of a sprite strip. */
export function staticFrameStyle(anim: CharacterAnimation, targetHeight: number): CSSProperties {
  const { width, height } = frameBoxSize(anim, targetHeight);
  return {
    width,
    height,
    backgroundImage: `url(${anim.src})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '0 0',
    backgroundSize: `${anim.frameCount * 100}% 100%`,
    imageRendering: 'pixelated',
  };
}

/**
 * CSS background + inline animation for a looping sprite preview, driven by a
 * shared `@keyframes` (see buildSpriteKeyframes) selected via `animationName`.
 */
export function animatedFrameStyle(
  anim: CharacterAnimation,
  targetHeight: number,
  animationName: string
): CSSProperties {
  const { width, height } = frameBoxSize(anim, targetHeight);
  return {
    width,
    height,
    backgroundImage: `url(${anim.src})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${anim.frameCount * 100}% 100%`,
    imageRendering: 'pixelated',
    animationName,
    animationDuration: `${anim.frameCount / anim.fps}s`,
    animationTimingFunction: `steps(${anim.frameCount})`,
    animationIterationCount: 'infinite',
  };
}

/** A `@keyframes` rule that steps a sprite strip through all its frames, given the on-screen frame box width. */
export function buildSpriteKeyframes(name: string, anim: CharacterAnimation, targetHeight: number): string {
  const { width } = frameBoxSize(anim, targetHeight);
  const totalWidth = width * anim.frameCount;
  return `@keyframes ${name} { from { background-position-x: 0px; } to { background-position-x: -${totalWidth}px; } }`;
}
