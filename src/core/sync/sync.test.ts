import { describe, it, expect } from 'vitest';
import {
  alignSegmentsToWords,
  checkScriptHasNarration,
  normalizeToken,
} from './aligner';
import { RawSegmentInput, WhisperWord } from './types';

describe('Smart Sync Aligner & Ground-Truth Verification', () => {
  it('normalizes tokens accurately', () => {
    expect(normalizeToken('Basketball,')).toBe('basketball');
    expect(normalizeToken("You're")).toBe('youre');
    expect(normalizeToken('100%!')).toBe('100');
  });

  it('Missing Narration Gate: immediately flags NO_NARRATION_TEXT and stops', () => {
    const promptOnlySegments: RawSegmentInput[] = [
      {
        index: 1,
        clipId: 'clip-1',
        startMs: 0,
        endMs: 5000,
        promptText: 'A cartoon character shooting a basketball in an empty gym.',
      },
      {
        index: 2,
        clipId: 'clip-2',
        startMs: 5000,
        endMs: 10000,
        promptText: 'Close up on the hand releasing the basketball cleanly.',
        narrationText: '   ', // whitespace only
      },
    ];

    expect(checkScriptHasNarration(promptOnlySegments)).toBe(false);

    const result = alignSegmentsToWords(promptOnlySegments, []);
    expect(result.hasNarration).toBe(false);
    expect(result.diffs.length).toBe(0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe('NO_NARRATION_TEXT');
  });

  it('Ground-Truth Boundary Error Gate: reduces mean boundary error compared to raw timestamps', () => {
    // Ground truth voiceover:
    // "You are halfway through doing something you have done a hundred times." (0.4s to 4.2s)
    // "Maybe you are shooting a basketball." (4.8s to 7.1s)
    // "And suddenly, you start thinking about your elbow angle." (7.6s to 11.5s)
    const groundTruthWords: WhisperWord[] = [
      { word: 'You', startSec: 0.4, endSec: 0.6 },
      { word: 'are', startSec: 0.65, endSec: 0.8 },
      { word: 'halfway', startSec: 0.85, endSec: 1.3 },
      { word: 'through', startSec: 1.35, endSec: 1.6 },
      { word: 'doing', startSec: 1.65, endSec: 1.95 },
      { word: 'something', startSec: 2.0, endSec: 2.4 },
      { word: 'you', startSec: 2.5, endSec: 2.7 },
      { word: 'have', startSec: 2.75, endSec: 2.95 },
      { word: 'done', startSec: 3.0, endSec: 3.3 },
      { word: 'a', startSec: 3.35, endSec: 3.5 },
      { word: 'hundred', startSec: 3.55, endSec: 3.9 },
      { word: 'times', startSec: 3.95, endSec: 4.2 },

      { word: 'Maybe', startSec: 4.8, endSec: 5.1 },
      { word: 'you', startSec: 5.15, endSec: 5.3 },
      { word: 'are', startSec: 5.35, endSec: 5.5 },
      { word: 'shooting', startSec: 5.55, endSec: 6.0 },
      { word: 'a', startSec: 6.05, endSec: 6.2 },
      { word: 'basketball', startSec: 6.25, endSec: 7.1 },

      { word: 'And', startSec: 7.6, endSec: 7.8 },
      { word: 'suddenly', startSec: 7.85, endSec: 8.4 },
      { word: 'you', startSec: 8.45, endSec: 8.65 },
      { word: 'start', startSec: 8.7, endSec: 9.0 },
      { word: 'thinking', startSec: 9.05, endSec: 9.5 },
      { word: 'about', startSec: 9.55, endSec: 9.85 },
      { word: 'your', startSec: 9.9, endSec: 10.1 },
      { word: 'elbow', startSec: 10.15, endSec: 10.7 },
      { word: 'angle', startSec: 10.75, endSec: 11.5 },
    ];

    // Raw script timestamps (imprecisely estimated by human writer, e.g. 5-second round blocks)
    // Cut 1: 0 to 5000ms (actual phrase ends at 4200ms, pause until 4800ms)
    // Cut 2: 5000ms to 8500ms (actual phrase ends at 7100ms, pause until 7600ms)
    // Cut 3: 8500ms to 12500ms
    const rawSegments: RawSegmentInput[] = [
      {
        index: 1,
        clipId: 'clip-1',
        startMs: 0,
        endMs: 5000,
        narrationText: 'You are halfway through doing something you have done a hundred times.',
      },
      {
        index: 2,
        clipId: 'clip-2',
        startMs: 5000,
        endMs: 8500,
        narrationText: 'Maybe you are shooting a basketball.',
      },
      {
        index: 3,
        clipId: 'clip-3',
        startMs: 8500,
        endMs: 12500,
        narrationText: 'And suddenly, you start thinking about your elbow angle.',
      },
    ];

    // The ideal phrase transition points are midpoints between spoken phrases:
    // Boundary 1-2: midpoint between 4200ms and 4800ms = 4500ms
    // Boundary 2-3: midpoint between 7100ms and 7600ms = 7350ms
    const idealBoundary1 = 4500;
    const idealBoundary2 = 7350;

    const rawError1 = Math.abs(rawSegments[0]!.endMs - idealBoundary1); // |5000 - 4500| = 500ms
    const rawError2 = Math.abs(rawSegments[1]!.endMs - idealBoundary2); // |8500 - 7350| = 1150ms
    const meanRawError = (rawError1 + rawError2) / 2; // 825ms

    // Run alignment
    const result = alignSegmentsToWords(rawSegments, groundTruthWords);

    expect(result.hasNarration).toBe(true);
    expect(result.diffs).toHaveLength(3);

    const alignedBoundary1 = result.diffs[0]!.proposedEndMs;
    const alignedBoundary2 = result.diffs[1]!.proposedEndMs;

    const alignedError1 = Math.abs(alignedBoundary1 - idealBoundary1);
    const alignedError2 = Math.abs(alignedBoundary2 - idealBoundary2);
    const meanAlignedError = (alignedError1 + alignedError2) / 2;

    // Prove boundary error drops significantly
    expect(meanAlignedError).toBeLessThan(meanRawError);
    expect(alignedError1).toBeLessThanOrEqual(50); // within 50ms of exact phrase midpoint
    expect(alignedError2).toBeLessThanOrEqual(50); // within 50ms of exact phrase midpoint

    // Verify zero gaps and magnetic continuity
    expect(result.diffs[0]!.proposedStartMs).toBe(0);
    expect(result.diffs[1]!.proposedStartMs).toBe(result.diffs[0]!.proposedEndMs);
    expect(result.diffs[2]!.proposedStartMs).toBe(result.diffs[1]!.proposedEndMs);
  });

  it('Fallback Gate: handles empty words gracefully with unsynced timing fallback', () => {
    const segments: RawSegmentInput[] = [
      {
        index: 1,
        clipId: 'clip-1',
        startMs: 0,
        endMs: 4000,
        narrationText: 'Hello world.',
      },
      {
        index: 2,
        clipId: 'clip-2',
        startMs: 4000,
        endMs: 8000,
        narrationText: 'Testing fallback.',
      },
    ];

    const result = alignSegmentsToWords(segments, []);
    expect(result.hasNarration).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe('LOW_CONFIDENCE');
    expect(result.diffs[0]!.proposedDurationMs).toBe(4000);
    expect(result.diffs[1]!.proposedDurationMs).toBe(4000);
  });
});
