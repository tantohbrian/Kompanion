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

  it('Cumulative Drift Gate: accurately tracks 5-10s drift and large cumulative drift, reporting start shifts in deltaMs', () => {
    const segments: RawSegmentInput[] = [
      {
        index: 1,
        clipId: 'c1',
        startMs: 0,
        endMs: 5000,
        narrationText: 'In the ancient redwood forest secrets linger.',
      },
      {
        index: 2,
        clipId: 'c2',
        startMs: 5000,
        endMs: 10000,
        narrationText: 'Sunlight filters through towering canopies.',
      },
      {
        index: 3,
        clipId: 'c3',
        startMs: 10000,
        endMs: 15000,
        narrationText: 'A silent traveler steps forward into the misty trail.',
      },
      {
        index: 4,
        clipId: 'c4',
        startMs: 15000,
        endMs: 20000,
        narrationText: 'The journey to the lost sanctuary begins now.',
      },
    ];

    const words: WhisperWord[] = [
      // Beat 1
      { word: 'In', startSec: 1.0, endSec: 1.2 },
      { word: 'the', startSec: 1.25, endSec: 1.4 },
      { word: 'ancient', startSec: 1.45, endSec: 1.9 },
      { word: 'redwood', startSec: 1.95, endSec: 2.4 },
      { word: 'forest', startSec: 2.45, endSec: 2.9 },
      { word: 'secrets', startSec: 3.1, endSec: 3.6 },
      { word: 'linger', startSec: 3.7, endSec: 4.5 },

      // Beat 2: starts around 12.0s (~7s drift)
      { word: 'Sunlight', startSec: 12.0, endSec: 12.5 },
      { word: 'filters', startSec: 12.55, endSec: 13.0 },
      { word: 'through', startSec: 13.05, endSec: 13.4 },
      { word: 'towering', startSec: 13.45, endSec: 14.0 },
      { word: 'canopies', startSec: 14.05, endSec: 15.0 },

      // Beat 3: starts around 23.0s (~13s cumulative drift)
      { word: 'A', startSec: 23.0, endSec: 23.2 },
      { word: 'silent', startSec: 23.25, endSec: 23.7 },
      { word: 'traveler', startSec: 23.75, endSec: 24.3 },
      { word: 'steps', startSec: 24.35, endSec: 24.7 },
      { word: 'forward', startSec: 24.75, endSec: 25.2 },
      { word: 'into', startSec: 25.25, endSec: 25.5 },
      { word: 'the', startSec: 25.55, endSec: 25.7 },
      { word: 'misty', startSec: 25.75, endSec: 26.2 },
      { word: 'trail', startSec: 26.25, endSec: 27.0 },

      // Beat 4: starts around 45.0s (~30s cumulative drift)
      { word: 'The', startSec: 45.0, endSec: 45.2 },
      { word: 'journey', startSec: 45.25, endSec: 45.7 },
      { word: 'to', startSec: 45.75, endSec: 45.9 },
      { word: 'the', startSec: 45.95, endSec: 46.1 },
      { word: 'lost', startSec: 46.15, endSec: 46.6 },
      { word: 'sanctuary', startSec: 46.65, endSec: 47.4 },
      { word: 'begins', startSec: 47.45, endSec: 48.0 },
      { word: 'now', startSec: 48.05, endSec: 49.0 },
    ];

    const result = alignSegmentsToWords(segments, words);
    expect(result.diffs).toHaveLength(4);

    expect(result.diffs[0]!.proposedStartMs).toBe(0);
    expect(result.diffs[0]!.proposedEndMs).toBe(8250);

    // Beat 2 start shifted from 5000 to 8250 (+3250ms)
    expect(result.diffs[1]!.proposedStartMs).toBe(8250);
    expect(result.diffs[1]!.deltaMs).toBe(3250);

    // Beat 3 start shifted from 10000 to 19000 (+9000ms drift)
    expect(result.diffs[2]!.proposedStartMs).toBe(19000);
    expect(result.diffs[2]!.deltaMs).toBe(9000);

    // Beat 4 start shifted from 15000 to 36000 (+21000ms cumulative drift)
    expect(result.diffs[3]!.proposedStartMs).toBe(36000);
    expect(result.diffs[3]!.deltaMs).toBe(21000);

    // Contiguity
    expect(result.diffs[1]!.proposedStartMs).toBe(result.diffs[0]!.proposedEndMs);
    expect(result.diffs[2]!.proposedStartMs).toBe(result.diffs[1]!.proposedEndMs);
    expect(result.diffs[3]!.proposedStartMs).toBe(result.diffs[2]!.proposedEndMs);
  });

  it('First-Word Variation Gate: aligns accurately when first word differs between script and audio', () => {
    const segments: RawSegmentInput[] = [
      {
        index: 1,
        clipId: 'c1',
        startMs: 0,
        endMs: 5000,
        narrationText: "You're halfway through doing something you have done a hundred times.",
      },
    ];

    const words: WhisperWord[] = [
      { word: 'You', startSec: 0.3, endSec: 0.5 },
      { word: 'are', startSec: 0.55, endSec: 0.8 },
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
    ];

    const result = alignSegmentsToWords(segments, words);
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0]!.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.diffs[0]!.proposedEndMs).toBeGreaterThanOrEqual(4200);
  });
});
