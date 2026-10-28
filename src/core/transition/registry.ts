import { TransitionRef } from '../model/types';
import { TransitionContext, TransitionPreset, TransitionRenderState } from './types';
export type { TransitionContext, TransitionPreset, TransitionRenderState };

const transitionRegistry = new Map<string, TransitionPreset>();

/**
 * Registers a transition preset.
 */
export function registerTransition(preset: TransitionPreset): void {
  transitionRegistry.set(preset.id, preset);
}

/**
 * Retrieves a registered transition preset by ID (falls back to 'cut' if unregistered).
 */
export function getTransition(id: string): TransitionPreset {
  return transitionRegistry.get(id) ?? transitionRegistry.get('cut')!;
}

/**
 * Returns all currently registered transition presets.
 */
export function getRegisteredTransitions(): TransitionPreset[] {
  return Array.from(transitionRegistry.values());
}

/**
 * Evaluates the transition state between outgoing and incoming clips.
 * Clamps transition duration to at most 50% of clip duration when clipDurationMs is provided.
 */
export function calculateTransitionBlend(
  transitionIn: TransitionRef,
  tMs: number,
  clipStartMs: number,
  canvasWidth = 1920,
  canvasHeight = 1080,
  clipDurationMs?: number
): TransitionRenderState {
  const { id } = transitionIn;
  const rawDurationMs = transitionIn.durationMs;
  const durationMs =
    clipDurationMs !== undefined
      ? Math.max(0, Math.min(rawDurationMs, Math.floor(clipDurationMs * 0.5)))
      : Math.max(0, rawDurationMs);

  if (id === 'cut' || durationMs <= 0 || tMs >= clipStartMs + durationMs) {
    return {
      isTransitioning: false,
      progress: 1.0,
      outgoingAlpha: 0,
      incomingAlpha: 1.0,
      blackOverlayAlpha: 0,
      outgoingOffsetX: 0,
      outgoingOffsetY: 0,
      incomingOffsetX: 0,
      incomingOffsetY: 0,
    };
  }

  const elapsedMs = Math.max(0, tMs - clipStartMs);
  const progress = Math.min(1.0, elapsedMs / durationMs);

  const preset = getTransition(id);
  const context: TransitionContext = {
    progress,
    elapsedMs,
    durationMs,
    canvasWidth,
    canvasHeight,
  };

  return preset.evaluate(context);
}

// Built-in preset: Cut
registerTransition({
  id: 'cut',
  name: 'Cut',
  evaluate: (): TransitionRenderState => ({
    isTransitioning: false,
    progress: 1.0,
    outgoingAlpha: 0,
    incomingAlpha: 1.0,
    blackOverlayAlpha: 0,
  }),
});

// Built-in preset: Crossfade
registerTransition({
  id: 'crossfade',
  name: 'Crossfade',
  evaluate: (ctx: TransitionContext): TransitionRenderState => ({
    isTransitioning: true,
    progress: ctx.progress,
    outgoingAlpha: 1.0 - ctx.progress,
    incomingAlpha: ctx.progress,
    blackOverlayAlpha: 0,
  }),
});

// Built-in preset: Dip to Black (P1)
registerTransition({
  id: 'dip-to-black',
  name: 'Dip to Black',
  evaluate: (ctx: TransitionContext): TransitionRenderState => {
    const { progress } = ctx;
    if (progress < 0.5) {
      // First half: fade outgoing to black
      const halfProgress = progress * 2;
      return {
        isTransitioning: true,
        progress,
        outgoingAlpha: 1.0,
        incomingAlpha: 0,
        blackOverlayAlpha: halfProgress,
      };
    } else {
      // Second half: fade up from black to incoming
      const halfProgress = (progress - 0.5) * 2;
      return {
        isTransitioning: true,
        progress,
        outgoingAlpha: 0,
        incomingAlpha: halfProgress,
        blackOverlayAlpha: 1.0 - halfProgress,
      };
    }
  },
});
