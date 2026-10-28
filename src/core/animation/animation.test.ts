import { describe, it, expect } from 'vitest';
import { getAnimation, registerAnimation, getRegisteredAnimations } from './registry';

describe('Animation Registry & Presets', () => {
  it('registers all default presets', () => {
    const registered = getRegisteredAnimations().map((a) => a.id);
    expect(registered).toContain('none');
    expect(registered).toContain('ken-burns');
    expect(registered).toContain('pan');
    expect(registered).toContain('pop');
  });

  it('evaluates static none preset', () => {
    const none = getAnimation('none');
    const transform = none.evaluate({
      progress: 0.5,
      clipIndex: 0,
      canvasWidth: 1920,
      canvasHeight: 1080,
      params: {},
    });
    expect(transform).toEqual({ scale: 1.0, translateX: 0, translateY: 0 });
  });

  it('evaluates ken-burns alternate deterministically from clip index', () => {
    const kb = getAnimation('ken-burns');

    // Even clip index (0) => 'in' (scale increases from progress 0 to 1)
    const t0 = kb.evaluate({
      progress: 0.0,
      clipIndex: 0,
      canvasWidth: 1920,
      canvasHeight: 1080,
      params: { direction: 'alternate', intensity: 6 },
    });
    const t1 = kb.evaluate({
      progress: 1.0,
      clipIndex: 0,
      canvasWidth: 1920,
      canvasHeight: 1080,
      params: { direction: 'alternate', intensity: 6 },
    });
    expect(t1.scale).toBeGreaterThan(t0.scale);
    expect(t0.scale).toBeGreaterThanOrEqual(1.04); // Overscan enforced

    // Odd clip index (1) => 'out' (scale decreases from progress 0 to 1)
    const tOdd0 = kb.evaluate({
      progress: 0.0,
      clipIndex: 1,
      canvasWidth: 1920,
      canvasHeight: 1080,
      params: { direction: 'alternate', intensity: 6 },
    });
    const tOdd1 = kb.evaluate({
      progress: 1.0,
      clipIndex: 1,
      canvasWidth: 1920,
      canvasHeight: 1080,
      params: { direction: 'alternate', intensity: 6 },
    });
    expect(tOdd1.scale).toBeLessThan(tOdd0.scale);
  });

  it('evaluates pan preset with overscan to prevent exposed edges', () => {
    const pan = getAnimation('pan');
    const tLeftStart = pan.evaluate({
      progress: 0.0,
      clipIndex: 0,
      canvasWidth: 1920,
      canvasHeight: 1080,
      params: { direction: 'left' },
    });
    const tLeftEnd = pan.evaluate({
      progress: 1.0,
      clipIndex: 0,
      canvasWidth: 1920,
      canvasHeight: 1080,
      params: { direction: 'left' },
    });

    expect(tLeftStart.scale).toBeGreaterThanOrEqual(1.08); // 8% overscan
    expect(tLeftStart.translateX).toBeGreaterThan(0);
    expect(tLeftEnd.translateX).toBeLessThan(0);
  });

  it('evaluates pop preset with overshoot in early progress and settling', () => {
    const pop = getAnimation('pop');
    const midPop = pop.evaluate({
      progress: 0.04,
      clipIndex: 0,
      canvasWidth: 1920,
      canvasHeight: 1080,
      params: {},
    });
    const settled = pop.evaluate({
      progress: 0.5,
      clipIndex: 0,
      canvasWidth: 1920,
      canvasHeight: 1080,
      params: {},
    });

    expect(midPop.scale).toBeGreaterThan(1.0); // Overshoot
    expect(settled.scale).toBe(1.0); // Settles at 1.0
  });

  it('allows registering custom animation presets', () => {
    registerAnimation({
      id: 'custom-zoom',
      name: 'Custom Zoom',
      evaluate: ({ progress }) => ({
        scale: 1.0 + progress * 0.2,
        translateX: 0,
        translateY: 0,
      }),
    });

    const custom = getAnimation('custom-zoom');
    expect(custom.name).toBe('Custom Zoom');
    expect(
      custom.evaluate({
        progress: 0.5,
        clipIndex: 0,
        canvasWidth: 1920,
        canvasHeight: 1080,
        params: {},
      }).scale
    ).toBe(1.1);
  });
});
