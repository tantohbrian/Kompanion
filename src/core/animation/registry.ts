import { AnimationContext, AnimationPreset, TransformMatrix } from './types';

const animationRegistry = new Map<string, AnimationPreset>();

/**
 * Registers an animation preset.
 */
export function registerAnimation(preset: AnimationPreset): void {
  animationRegistry.set(preset.id, preset);
}

/**
 * Retrieves a registered animation preset by ID (falls back to 'none' if unregistered).
 */
export function getAnimation(id: string): AnimationPreset {
  return animationRegistry.get(id) ?? animationRegistry.get('none')!;
}

/**
 * Returns all currently registered animation presets.
 */
export function getRegisteredAnimations(): AnimationPreset[] {
  return Array.from(animationRegistry.values());
}

// Built-in preset: None (static)
registerAnimation({
  id: 'none',
  name: 'None',
  evaluate: (): TransformMatrix => ({
    scale: 1.0,
    translateX: 0,
    translateY: 0,
  }),
});

// Built-in preset: Ken Burns
registerAnimation({
  id: 'ken-burns',
  name: 'Ken Burns',
  evaluate: (ctx: AnimationContext): TransformMatrix => {
    const { progress, clipIndex, canvasWidth, canvasHeight, params } = ctx;
    const rawIntensity = typeof params.intensity === 'number' ? params.intensity : 6;
    // Map intensity 4..10 to 0.04..0.10 zoom factor
    const zoomFactor = Math.max(0.04, Math.min(0.15, rawIntensity / 100));
    // 4% base overscan to prevent exposed edges during drift
    const baseOverscan = 1.04;

    let dir = typeof params.direction === 'string' ? params.direction : 'alternate';
    if (dir === 'alternate') {
      dir = clipIndex % 2 === 0 ? 'in' : 'out';
    }

    const scale =
      dir === 'in'
        ? baseOverscan + progress * zoomFactor
        : baseOverscan + (1 - progress) * zoomFactor;

    // Subtle drift along X/Y with deterministic sign from clipIndex
    const maxShiftX = canvasWidth * 0.015;
    const maxShiftY = canvasHeight * 0.015;
    const sign = clipIndex % 3 === 0 ? 1 : -1;

    return {
      scale,
      translateX: sign * (progress - 0.5) * maxShiftX,
      translateY: -sign * (progress - 0.5) * maxShiftY,
    };
  },
});

// Built-in preset: Pan
registerAnimation({
  id: 'pan',
  name: 'Pan',
  evaluate: (ctx: AnimationContext): TransformMatrix => {
    const { progress, canvasWidth, canvasHeight, params } = ctx;
    const direction = typeof params.direction === 'string' ? params.direction : 'left';
    // 8% base overscan to allow panning without exposing edges
    const baseScale = 1.08;
    const maxPanX = canvasWidth * 0.04;
    const maxPanY = canvasHeight * 0.04;

    let translateX = 0;
    let translateY = 0;

    switch (direction) {
      case 'left':
        translateX = (0.5 - progress) * maxPanX;
        break;
      case 'right':
        translateX = (progress - 0.5) * maxPanX;
        break;
      case 'up':
        translateY = (0.5 - progress) * maxPanY;
        break;
      case 'down':
        translateY = (progress - 0.5) * maxPanY;
        break;
      default:
        translateX = (0.5 - progress) * maxPanX;
    }

    return {
      scale: baseScale,
      translateX,
      translateY,
    };
  },
});

// Built-in preset: Pop
registerAnimation({
  id: 'pop',
  name: 'Pop',
  evaluate: (ctx: AnimationContext): TransformMatrix => {
    const { progress } = ctx;
    const popWindow = 0.08;
    let scale = 1.0;

    if (progress < popWindow) {
      const popProgress = progress / popWindow;
      // Overshoot curve: 0.95 -> 1.06 -> 1.0
      scale = 0.95 + Math.sin(popProgress * Math.PI) * 0.11;
    }

    return {
      scale,
      translateX: 0,
      translateY: 0,
    };
  },
});
