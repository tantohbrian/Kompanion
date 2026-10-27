import { TransitionRef } from '../model/types';

export interface TransitionBlendState {
  isTransitioning: boolean;
  progress: number; // 0.0 to 1.0
  type: string;
  outgoingAlpha: number;
  incomingAlpha: number;
  blackOverlayAlpha: number;
}

/**
 * Calculates transition alpha weights and black overlays between outgoing and incoming clips.
 */
export function calculateTransitionBlend(
  transitionIn: TransitionRef,
  tMs: number,
  clipStartMs: number
): TransitionBlendState {
  const { id, durationMs } = transitionIn;

  if (id === 'cut' || durationMs <= 0 || tMs >= clipStartMs + durationMs) {
    return {
      isTransitioning: false,
      progress: 1.0,
      type: 'cut',
      outgoingAlpha: 0,
      incomingAlpha: 1.0,
      blackOverlayAlpha: 0,
    };
  }

  const elapsed = Math.max(0, tMs - clipStartMs);
  const progress = Math.min(1.0, elapsed / durationMs);

  if (id === 'crossfade') {
    return {
      isTransitioning: true,
      progress,
      type: 'crossfade',
      outgoingAlpha: 1.0 - progress,
      incomingAlpha: progress,
      blackOverlayAlpha: 0,
    };
  }

  if (id === 'dip-to-black') {
    if (progress < 0.5) {
      // First half: fade outgoing to black
      const halfProgress = progress * 2; // 0 to 1
      return {
        isTransitioning: true,
        progress,
        type: 'dip-to-black',
        outgoingAlpha: 1.0,
        incomingAlpha: 0,
        blackOverlayAlpha: halfProgress,
      };
    } else {
      // Second half: fade up from black to incoming
      const halfProgress = (progress - 0.5) * 2; // 0 to 1
      return {
        isTransitioning: true,
        progress,
        type: 'dip-to-black',
        outgoingAlpha: 0,
        incomingAlpha: halfProgress,
        blackOverlayAlpha: 1.0 - halfProgress,
      };
    }
  }

  // Fallback to cut
  return {
    isTransitioning: false,
    progress: 1.0,
    type: 'cut',
    outgoingAlpha: 0,
    incomingAlpha: 1.0,
    blackOverlayAlpha: 0,
  };
}
