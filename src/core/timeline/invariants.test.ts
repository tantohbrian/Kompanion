import { describe, it, expect } from 'vitest';
import { Timeline, Clip } from '../model/types';
import {
  calculateClipPositions,
  calculateTotalVisualDuration,
  assertTimelineInvariants,
} from './invariants';
import {
  reorderClip,
  trimClip,
  splitClip,
  deleteClip,
  duplicateClip,
  replaceAsset,
  setClipDuration,
  updateClip,
  applyToAllClips,
} from './operations';

function createMockTimeline(clipCount = 5, baseDurationMs = 2000): Timeline {
  const clips: Clip[] = Array.from({ length: clipCount }, (_, i) => ({
    id: `clip-${i + 1}`,
    assetId: `asset-${i + 1}`,
    durationMs: baseDurationMs,
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

describe('Timeline Magnetic Invariants & Operations', () => {
  it('correctly calculates derived start times with zero gaps', () => {
    const timeline = createMockTimeline(4, 1500);
    const positions = calculateClipPositions(timeline.clips);

    expect(positions[0]!.startMs).toBe(0);
    expect(positions[0]!.endMs).toBe(1500);

    expect(positions[1]!.startMs).toBe(1500);
    expect(positions[1]!.endMs).toBe(3000);

    expect(positions[2]!.startMs).toBe(3000);
    expect(positions[2]!.endMs).toBe(4500);

    expect(positions[3]!.startMs).toBe(4500);
    expect(positions[3]!.endMs).toBe(6000);

    expect(calculateTotalVisualDuration(timeline.clips)).toBe(6000);
  });

  it('preserves invariants when reordering clips', () => {
    const timeline = createMockTimeline(4, 1000);
    const reordered = reorderClip(timeline, { clipId: 'clip-1', targetIndex: 2 });

    expect(reordered.clips.map((c) => c.id)).toEqual(['clip-2', 'clip-3', 'clip-1', 'clip-4']);
    expect(calculateTotalVisualDuration(reordered.clips)).toBe(4000);
    expect(() => assertTimelineInvariants(reordered)).not.toThrow();
  });

  it('preserves invariants and ripples on trimClip', () => {
    const timeline = createMockTimeline(3, 2000);
    const trimmed = trimClip(timeline, { clipId: 'clip-1', deltaDurationMs: 500, edge: 'end' });

    expect(trimmed.clips[0]!.durationMs).toBe(2500);
    expect(calculateTotalVisualDuration(trimmed.clips)).toBe(6500);

    const positions = calculateClipPositions(trimmed.clips);
    expect(positions[1]!.startMs).toBe(2500); // Rippled forward cleanly
    expect(() => assertTimelineInvariants(trimmed)).not.toThrow();
  });

  it('splits a clip at playhead and maintains total duration', () => {
    const timeline = createMockTimeline(2, 3000);
    // Split clip-1 at playhead 1000ms
    const split = splitClip(timeline, {
      clipId: 'clip-1',
      splitMs: 1000,
      relativeTo: 'timeline',
      newClipId: 'clip-1-split',
    });

    expect(split.clips).toHaveLength(3);
    expect(split.clips[0]!.id).toBe('clip-1');
    expect(split.clips[0]!.durationMs).toBe(1000);

    expect(split.clips[1]!.id).toBe('clip-1-split');
    expect(split.clips[1]!.durationMs).toBe(2000);

    expect(split.clips[2]!.id).toBe('clip-2');
    expect(calculateTotalVisualDuration(split.clips)).toBe(6000);
    expect(() => assertTimelineInvariants(split)).not.toThrow();
  });

  it('deletes a clip and ripples subsequent clips backward', () => {
    const timeline = createMockTimeline(3, 1000);
    const deleted = deleteClip(timeline, { clipId: 'clip-2' });

    expect(deleted.clips).toHaveLength(2);
    expect(deleted.clips.map((c) => c.id)).toEqual(['clip-1', 'clip-3']);
    expect(calculateTotalVisualDuration(deleted.clips)).toBe(2000);
    expect(() => assertTimelineInvariants(deleted)).not.toThrow();
  });

  it('duplicates a clip immediately adjacent', () => {
    const timeline = createMockTimeline(2, 1000);
    const duplicated = duplicateClip(timeline, { clipId: 'clip-1', newClipId: 'clip-1-copy' });

    expect(duplicated.clips).toHaveLength(3);
    expect(duplicated.clips.map((c) => c.id)).toEqual(['clip-1', 'clip-1-copy', 'clip-2']);
    expect(calculateTotalVisualDuration(duplicated.clips)).toBe(3000);
    expect(() => assertTimelineInvariants(duplicated)).not.toThrow();
  });

  it('runs 100 randomized operations and proves all invariants hold at every step', () => {
    let current = createMockTimeline(10, 1000);
    assertTimelineInvariants(current);

    const operations = [
      'reorder',
      'trim',
      'split',
      'delete',
      'duplicate',
      'setDuration',
      'update',
      'replaceAsset',
      'applyToAll',
    ];

    for (let step = 0; step < 100; step++) {
      if (current.clips.length === 0) {
        current = createMockTimeline(5, 1000);
        continue;
      }

      const op = operations[Math.floor(Math.random() * operations.length)]!;
      const randomClip = current.clips[Math.floor(Math.random() * current.clips.length)]!;

      switch (op) {
        case 'reorder': {
          const targetIndex = Math.floor(Math.random() * current.clips.length);
          current = reorderClip(current, { clipId: randomClip.id, targetIndex });
          break;
        }
        case 'trim': {
          const delta = (Math.floor(Math.random() * 20) - 10) * 50; // -500 to +500 ms
          current = trimClip(current, { clipId: randomClip.id, deltaDurationMs: delta, edge: 'end' });
          break;
        }
        case 'split': {
          if (randomClip.durationMs > 200) {
            const splitOffset = Math.floor(randomClip.durationMs / 2);
            current = splitClip(current, {
              clipId: randomClip.id,
              splitMs: splitOffset,
              relativeTo: 'clip',
              newClipId: `fuzz-${step}`,
            });
          }
          break;
        }
        case 'delete': {
          if (current.clips.length > 2) {
            current = deleteClip(current, { clipId: randomClip.id });
          }
          break;
        }
        case 'duplicate': {
          if (current.clips.length < 50) {
            current = duplicateClip(current, {
              clipId: randomClip.id,
              newClipId: `clone-${step}`,
            });
          }
          break;
        }
        case 'setDuration': {
          const newDur = Math.floor(Math.random() * 4000) + 200;
          current = setClipDuration(current, { clipId: randomClip.id, durationMs: newDur });
          break;
        }
        case 'update': {
          current = updateClip(current, {
            clipId: randomClip.id,
            updates: { fit: Math.random() > 0.5 ? 'contain' : 'cover' },
          });
          break;
        }
        case 'replaceAsset': {
          current = replaceAsset(current, {
            clipId: randomClip.id,
            newAssetId: `new-asset-${step}`,
          });
          break;
        }
        case 'applyToAll': {
          current = applyToAllClips(current, {
            updates: { fit: 'cover' },
          });
          break;
        }
      }

      // Assert all invariants hold after every single random operation
      expect(() => assertTimelineInvariants(current)).not.toThrow();

      const positions = calculateClipPositions(current.clips);
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i]!;
        expect(Number.isInteger(pos.startMs)).toBe(true);
        expect(Number.isInteger(pos.endMs)).toBe(true);
        if (i > 0) {
          expect(pos.startMs).toBe(positions[i - 1]!.endMs); // Zero gap magnetic continuity
        }
      }
    }
  });
});
