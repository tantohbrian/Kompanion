import { AnimationRef } from '../model/types';
import { TransformMatrix } from './types';

/**
 * Calculates transform matrix (scale, translation offsets) for an animated clip.
 * Progress p is in range [0, 1].
 * All motion is padded with overscan to ensure canvas boundaries are never exposed.
 */
export function calculateAnimationTransform(
  animation: AnimationRef,
  p: number,
  clipIndex: number,
  canvasWidth: number,
  canvasHeight: number
): TransformMatrix {
  const clampedProgress = Math.max(0, Math.min(1, p));
  const { id, params } = animation;

  if (id === 'none') {
    return { scale: 1.0, translateX: 0, translateY: 0 };
  }

  if (id === 'ken-burns') {
    const rawIntensity = typeof params.intensity === 'number' ? params.intensity : 6;
    // Map intensity 4..10 to 0.04..0.10 zoom factor
    const zoomFactor = Math.max(0.04, Math.min(0.15, rawIntensity / 100));
    const baseOverscan = 1.04; // 4% base overscan

    let dir = typeof params.direction === 'string' ? params.direction : 'alternate';
    if (dir === 'alternate') {
      dir = clipIndex % 2 === 0 ? 'in' : 'out';
    }

    const scale =
      dir === 'in'
        ? baseOverscan + clampedProgress * zoomFactor
        : baseOverscan + (1 - clampedProgress) * zoomFactor;

    // Slight subtle drift along X/Y
    const maxShiftX = canvasWidth * 0.015;
    const maxShiftY = canvasHeight * 0.015;
    const sign = clipIndex % 3 === 0 ? 1 : -1;

    return {
      scale,
      translateX: sign * (clampedProgress - 0.5) * maxShiftX,
      translateY: -sign * (clampedProgress - 0.5) * maxShiftY,
    };
  }

  if (id === 'pan') {
    const direction = typeof params.direction === 'string' ? params.direction : 'left';
    const baseScale = 1.08; // 8% overscan to permit panning without exposing edges
    const maxPanX = canvasWidth * 0.04;
    const maxPanY = canvasHeight * 0.04;

    let translateX = 0;
    let translateY = 0;

    switch (direction) {
      case 'left':
        translateX = (0.5 - clampedProgress) * maxPanX;
        break;
      case 'right':
        translateX = (clampedProgress - 0.5) * maxPanX;
        break;
      case 'up':
        translateY = (0.5 - clampedProgress) * maxPanY;
        break;
      case 'down':
        translateY = (clampedProgress - 0.5) * maxPanY;
        break;
      default:
        translateX = (0.5 - clampedProgress) * maxPanX;
    }

    return {
      scale: baseScale,
      translateX,
      translateY,
    };
  }

  if (id === 'pop') {
    // Quick pop in first 200ms (assumes typical 3000ms clip, ~0.07 progress window)
    const popWindow = 0.08;
    let scale = 1.0;
    if (clampedProgress < popWindow) {
      const popProgress = clampedProgress / popWindow;
      // Ease out overshoot curve: 0.95 -> 1.06 -> 1.0
      scale = 0.95 + Math.sin(popProgress * Math.PI) * 0.11;
    }

    return {
      scale,
      translateX: 0,
      translateY: 0,
    };
  }

  return { scale: 1.0, translateX: 0, translateY: 0 };
}
