import { describe, it, expect } from 'vitest';
import { Timeline, Clip } from '../model/types';
import { trimClip, reorderClip } from './operations';
import { calculateClipPositions } from './invariants';

function create300ClipTimeline(): Timeline {
  const clips: Clip[] = Array.from({ length: 300 }, (_, i) => ({
    id: `clip-${i + 1}`,
    assetId: `asset-${(i % 20) + 1}`,
    durationMs: 2000,
    fit: 'cover',
    animation: 'inherit',
    transitionIn: 'inherit',
    sourceSegment: i + 1,
  }));

  return {
    clips,
    audio: [{ id: 'audio-1', assetId: 'track-1', offsetMs: 0 }],
    gain: 1,
    muted: false,
  };
}

describe('300-Clip Timeline Performance Benchmark', () => {
  it('executes trim operations on 300 clips well within 16.7ms frame budget (60 fps)', () => {
    let timeline = create300ClipTimeline();
    expect(timeline.clips).toHaveLength(300);

    const iterations = 60;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const delta = (i % 2 === 0 ? 50 : -50);
      timeline = trimClip(timeline, {
        clipId: 'clip-150', // Middle of track
        deltaDurationMs: delta,
        edge: 'end',
      });
      // In a drag frame, positions are recalculated for layout
      calculateClipPositions(timeline.clips);
    }

    const totalElapsedMs = performance.now() - start;
    const avgTimePerFrameMs = totalElapsedMs / iterations;

    // Must be well within 16.7ms (60 fps frame budget)
    expect(avgTimePerFrameMs).toBeLessThan(16.7);
  });

  it('executes reorder operations on 300 clips well within 16.7ms frame budget', () => {
    let timeline = create300ClipTimeline();
    const iterations = 60;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      timeline = reorderClip(timeline, {
        clipId: 'clip-10',
        targetIndex: 250,
      });
      calculateClipPositions(timeline.clips);
    }

    const totalElapsedMs = performance.now() - start;
    const avgTimePerFrameMs = totalElapsedMs / iterations;

    expect(avgTimePerFrameMs).toBeLessThan(16.7);
  });
});
