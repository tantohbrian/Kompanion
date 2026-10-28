import { AnimationRef } from '../model/types';
import { TransformMatrix } from './types';
import { getAnimation } from '../animation';

/**
 * Calculates transform matrix (scale, translation offsets) for an animated clip.
 * Delegates to the central Animation Registry.
 */
export function calculateAnimationTransform(
  animation: AnimationRef,
  p: number,
  clipIndex: number,
  canvasWidth: number,
  canvasHeight: number
): TransformMatrix {
  const preset = getAnimation(animation.id);
  return preset.evaluate({
    progress: p,
    clipIndex,
    canvasWidth,
    canvasHeight,
    params: animation.params,
  });
}
