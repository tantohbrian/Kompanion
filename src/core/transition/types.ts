export interface TransitionContext {
  /** Progress from 0.0 to 1.0 within the transition duration */
  progress: number;
  /** Elapsed milliseconds from transition start */
  elapsedMs: number;
  /** Total transition duration in integer milliseconds */
  durationMs: number;
  /** Canvas width in pixels */
  canvasWidth: number;
  /** Canvas height in pixels */
  canvasHeight: number;
  /** Transition parameters if any */
  params?: Record<string, unknown>;
}

export interface TransitionRenderState {
  isTransitioning: boolean;
  progress: number;
  outgoingAlpha: number;
  incomingAlpha: number;
  blackOverlayAlpha?: number;
  outgoingOffsetX?: number;
  outgoingOffsetY?: number;
  incomingOffsetX?: number;
  incomingOffsetY?: number;
}

export interface TransitionPreset {
  id: string;
  name: string;
  evaluate(ctx: TransitionContext): TransitionRenderState;
}
