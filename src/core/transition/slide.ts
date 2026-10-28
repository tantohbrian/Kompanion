import { registerTransition, TransitionContext, TransitionRenderState } from './registry';

/**
 * Slide transition preset (Modularity Proof: < 40 lines).
 * Slides outgoing clip left while sliding incoming clip in from the right.
 */
registerTransition({
  id: 'slide',
  name: 'Slide',
  evaluate: (ctx: TransitionContext): TransitionRenderState => ({
    isTransitioning: true,
    progress: ctx.progress,
    outgoingAlpha: 1.0,
    incomingAlpha: 1.0,
    outgoingOffsetX: -ctx.progress * ctx.canvasWidth,
    incomingOffsetX: (1.0 - ctx.progress) * ctx.canvasWidth,
    blackOverlayAlpha: 0,
  }),
});
