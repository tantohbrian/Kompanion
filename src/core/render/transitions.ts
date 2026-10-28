import { TransitionRef } from '../model/types';
import { calculateTransitionBlend as evaluateTransition, TransitionRenderState } from '../transition';

export type TransitionBlendState = TransitionRenderState;

/**
 * Calculates transition alpha weights and offsets between outgoing and incoming clips.
 * Delegates to the central Transition Registry.
 */
export function calculateTransitionBlend(
  transitionIn: TransitionRef,
  tMs: number,
  clipStartMs: number,
  canvasWidth = 1920,
  canvasHeight = 1080,
  clipDurationMs?: number
): TransitionRenderState {
  return evaluateTransition(transitionIn, tMs, clipStartMs, canvasWidth, canvasHeight, clipDurationMs);
}

