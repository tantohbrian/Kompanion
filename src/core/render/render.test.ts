import { describe, it, expect } from 'vitest';
import { Project } from '../model/types';
import { resolveTimeline } from './resolveTimeline';
import { calculateAnimationTransform } from './animations';
import { calculateTransitionBlend } from './transitions';
import { ImageBitmapLruCache } from './imageCache';
import { DEFAULT_PROJECT_DEFAULTS } from '../storage/storage';

const mockProject: Project = {
  id: 'proj-render-test',
  workspaceId: 'default',
  schemaVersion: 1,
  name: 'Render Test Project',
  settings: {
    ...DEFAULT_PROJECT_DEFAULTS,
    canvas: '16:9',
    height: 1080,
    fps: 30,
    animation: { id: 'ken-burns', params: { direction: 'alternate', intensity: 8 } },
    transition: { id: 'crossfade', durationMs: 500 },
  },
  assets: [],
  script: { raw: '', parse: null },
  timeline: {
    clips: [
      {
        id: 'clip-1',
        assetId: 'asset-1',
        durationMs: 4000,
        fit: 'cover',
        animation: 'inherit',
        transitionIn: 'inherit',
      },
      {
        id: 'clip-2',
        assetId: 'asset-2',
        durationMs: 600, // Short clip! Max 50% transition is 300ms
        fit: 'cover',
        animation: 'inherit',
        transitionIn: { id: 'crossfade', durationMs: 500 },
      },
      {
        id: 'clip-3',
        assetId: 'asset-3',
        durationMs: 3000,
        fit: 'contain',
        animation: { id: 'pop', params: {} },
        transitionIn: { id: 'dip-to-black', durationMs: 800 },
      },
    ],
    audio: [{ id: 'audio-1', assetId: 'track-1', offsetMs: 0 }],
    gain: 1,
    muted: false,
  },
  updatedAt: Date.now(),
};

describe('Render Engine & resolveTimeline', () => {
  it('correctly calculates canvas dimensions and coordinates', () => {
    const scene = resolveTimeline(mockProject);

    expect(scene.width).toBe(1920);
    expect(scene.height).toBe(1080);
    expect(scene.durationMs).toBe(7600); // 4000 + 600 + 3000
    expect(scene.clips).toHaveLength(3);

    // Clip 1
    expect(scene.clips[0]!.startMs).toBe(0);
    expect(scene.clips[0]!.endMs).toBe(4000);
    // First clip must always be cut 0ms (no incoming transition from void)
    expect(scene.clips[0]!.resolvedTransitionIn).toEqual({ id: 'cut', durationMs: 0 });
    // Inherited animation
    expect(scene.clips[0]!.resolvedAnimation.id).toBe('ken-burns');

    // Clip 2: 50% clamping rule!
    expect(scene.clips[1]!.startMs).toBe(4000);
    expect(scene.clips[1]!.endMs).toBe(4600);
    // Requested 500ms transition on a 600ms clip -> clamped to at most 50% (300ms)
    expect(scene.clips[1]!.resolvedTransitionIn).toEqual({ id: 'crossfade', durationMs: 300 });

    // Clip 3
    expect(scene.clips[2]!.startMs).toBe(4600);
    expect(scene.clips[2]!.endMs).toBe(7600);
    expect(scene.clips[2]!.resolvedTransitionIn).toEqual({ id: 'dip-to-black', durationMs: 800 });
  });

  it('determines 9:16 vertical canvas dimensions accurately', () => {
    const verticalProj: Project = {
      ...mockProject,
      settings: { ...mockProject.settings, canvas: '9:16', height: 1080 },
    };
    const scene = resolveTimeline(verticalProj);
    expect(scene.width).toBe(608); // 1080 * 9 / 16 = 607.5 -> 608
    expect(scene.height).toBe(1080);
  });

  it('calculates deterministic alternate Ken Burns directions seeded by index', () => {
    const animRef = { id: 'ken-burns', params: { direction: 'alternate', intensity: 6 } };

    // Index 0 -> 'in' (scale increases from start to end)
    const t0_start = calculateAnimationTransform(animRef, 0.0, 0, 1920, 1080);
    const t0_end = calculateAnimationTransform(animRef, 1.0, 0, 1920, 1080);
    expect(t0_end.scale).toBeGreaterThan(t0_start.scale);

    // Index 1 -> 'out' (scale decreases from start to end)
    const t1_start = calculateAnimationTransform(animRef, 0.0, 1, 1920, 1080);
    const t1_end = calculateAnimationTransform(animRef, 1.0, 1, 1920, 1080);
    expect(t1_start.scale).toBeGreaterThan(t1_end.scale);
  });

  it('calculates crossfade alpha blending where sum of opacities equals 1.0', () => {
    const transition = { id: 'crossfade', durationMs: 1000 };
    const clipStartMs = 2000;

    const blendAt25 = calculateTransitionBlend(transition, 2250, clipStartMs);
    expect(blendAt25.isTransitioning).toBe(true);
    expect(blendAt25.progress).toBeCloseTo(0.25);
    expect(blendAt25.outgoingAlpha + blendAt25.incomingAlpha).toBeCloseTo(1.0);

    const blendAt75 = calculateTransitionBlend(transition, 2750, clipStartMs);
    expect(blendAt75.progress).toBeCloseTo(0.75);
    expect(blendAt75.outgoingAlpha + blendAt75.incomingAlpha).toBeCloseTo(1.0);

    const blendAfter = calculateTransitionBlend(transition, 3050, clipStartMs);
    expect(blendAfter.isTransitioning).toBe(false);
    expect(blendAfter.incomingAlpha).toBe(1.0);
  });
});

describe('ImageBitmapLruCache Resolution Fallback', () => {
  it('returns cached 1280 proxy bitmap when 1920 is queried', () => {
    const cache = new ImageBitmapLruCache(10);
    const mockBitmap = {
      width: 1280,
      height: 720,
      close: () => {},
    } as unknown as ImageBitmap;

    // Cache bitmap under 1280 proxy resolution
    cache.setBitmap('asset-42', 1280, mockBitmap);

    // Exact query matches
    expect(cache.getBitmap('asset-42', 1280)).toBe(mockBitmap);

    // Fallback: 1920 query returns the cached 1280 proxy bitmap
    expect(cache.getBitmap('asset-42', 1920)).toBe(mockBitmap);
    expect(cache.hasBitmap('asset-42', 1920, false)).toBe(true);

    // Missing asset returns null
    expect(cache.getBitmap('asset-missing', 1920)).toBeNull();
    expect(cache.hasBitmap('asset-missing', 1920)).toBe(false);
  });
});
