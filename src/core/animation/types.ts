/**
 * Context passed to animation presets to calculate transform matrix.
 */
export interface AnimationContext {
  /** Clamped progress from 0.0 to 1.0 within the clip */
  progress: number;
  /** Index of the clip in the timeline (for deterministic alternation) */
  clipIndex: number;
  /** Canvas width in pixels */
  canvasWidth: number;
  /** Canvas height in pixels */
  canvasHeight: number;
  /** Preset-specific parameters (e.g. intensity, direction) */
  params: Record<string, unknown>;
}

export interface TransformMatrix {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface AnimationPreset {
  id: string;
  name: string;
  evaluate(ctx: AnimationContext): TransformMatrix;
}
