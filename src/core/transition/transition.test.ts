import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  getTransition,
  calculateTransitionBlend,
  getRegisteredTransitions,
} from './registry';
import './slide';

describe('Transition Registry & Presets', () => {
  it('registers all built-in presets and slide', () => {
    const ids = getRegisteredTransitions().map((t) => t.id);
    expect(ids).toContain('cut');
    expect(ids).toContain('crossfade');
    expect(ids).toContain('dip-to-black');
    expect(ids).toContain('slide');
  });

  it('evaluates cut preset with no blending', () => {
    const blend = calculateTransitionBlend(
      { id: 'cut', durationMs: 0 },
      1500,
      1000
    );
    expect(blend.isTransitioning).toBe(false);
    expect(blend.outgoingAlpha).toBe(0);
    expect(blend.incomingAlpha).toBe(1.0);
  });

  it('evaluates crossfade interpolation accurately', () => {
    const blendMid = calculateTransitionBlend(
      { id: 'crossfade', durationMs: 1000 },
      1500, // half-way through [1000, 2000]
      1000
    );
    expect(blendMid.isTransitioning).toBe(true);
    expect(blendMid.progress).toBeCloseTo(0.5);
    expect(blendMid.outgoingAlpha).toBeCloseTo(0.5);
    expect(blendMid.incomingAlpha).toBeCloseTo(0.5);

    const blendEnd = calculateTransitionBlend(
      { id: 'crossfade', durationMs: 1000 },
      2000, // at or past end
      1000
    );
    expect(blendEnd.isTransitioning).toBe(false);
    expect(blendEnd.incomingAlpha).toBe(1.0);
  });

  it('evaluates dip-to-black with black overlay peak at midpoint', () => {
    // 25% progress: outgoing clip fading to black
    const blendQ1 = calculateTransitionBlend(
      { id: 'dip-to-black', durationMs: 1000 },
      1250,
      1000
    );
    expect(blendQ1.isTransitioning).toBe(true);
    expect(blendQ1.outgoingAlpha).toBe(1.0);
    expect(blendQ1.incomingAlpha).toBe(0);
    expect(blendQ1.blackOverlayAlpha).toBeCloseTo(0.5);

    // 75% progress: incoming clip fading up from black
    const blendQ3 = calculateTransitionBlend(
      { id: 'dip-to-black', durationMs: 1000 },
      1750,
      1000
    );
    expect(blendQ3.isTransitioning).toBe(true);
    expect(blendQ3.outgoingAlpha).toBe(0);
    expect(blendQ3.incomingAlpha).toBeCloseTo(0.5);
    expect(blendQ3.blackOverlayAlpha).toBeCloseTo(0.5);
  });

  it('MODULARITY PROOF: slide.ts is under 40 lines and correctly computes slide offsets', () => {
    const slideFilePath = path.resolve(__dirname, 'slide.ts');
    const content = fs.readFileSync(slideFilePath, 'utf8');
    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(40);

    const slidePreset = getTransition('slide');
    expect(slidePreset.name).toBe('Slide');

    const blend = calculateTransitionBlend(
      { id: 'slide', durationMs: 1000 },
      1500,
      1000,
      1920,
      1080
    );

    expect(blend.isTransitioning).toBe(true);
    expect(blend.progress).toBeCloseTo(0.5);
    expect(blend.outgoingOffsetX).toBeCloseTo(-0.5 * 1920);
    expect(blend.incomingOffsetX).toBeCloseTo(0.5 * 1920);
  });

  it('clamps transition duration to at most 50% of clip duration', () => {
    const clipDurationMs = 1000;
    // Requested transition duration 800ms exceeds 50% (500ms)
    const blendMid = calculateTransitionBlend(
      { id: 'crossfade', durationMs: 800 },
      1250, // 250ms into clip -> 50% of the clamped 500ms transition
      1000,
      1920,
      1080,
      clipDurationMs
    );
    expect(blendMid.isTransitioning).toBe(true);
    expect(blendMid.progress).toBeCloseTo(0.5);

    const blendAtClampedEnd = calculateTransitionBlend(
      { id: 'crossfade', durationMs: 800 },
      1500, // 500ms into clip -> transition has reached clamped end
      1000,
      1920,
      1080,
      clipDurationMs
    );
    expect(blendAtClampedEnd.isTransitioning).toBe(false);
    expect(blendAtClampedEnd.incomingAlpha).toBe(1.0);
  });
});

