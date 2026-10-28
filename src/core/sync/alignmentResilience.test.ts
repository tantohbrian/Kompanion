import { describe, it, expect } from 'vitest';
import { resampleTo16k, TARGET_WHISPER_SAMPLE_RATE } from './resampler';
import { alignSegmentsToWords } from './aligner';
import { RawSegmentInput, WhisperWord } from './types';

describe('16kHz Resampler & 80-Segment Resilience', () => {
  it('resampleTo16k: downsamples 48kHz audio to 16kHz mono accurately', () => {
    const durationSec = 0.5;
    const sourceRate = 48000;
    const sampleCount = Math.round(durationSec * sourceRate);
    const audio48k = new Float32Array(sampleCount);

    // Generate 440 Hz test sine wave
    for (let i = 0; i < sampleCount; i++) {
      audio48k[i] = Math.sin((2 * Math.PI * 440 * i) / sourceRate);
    }

    const resampled = resampleTo16k(audio48k, sourceRate);
    const expectedLength = Math.round(durationSec * TARGET_WHISPER_SAMPLE_RATE);

    expect(resampled.length).toBe(expectedLength);
    // Non-empty, reasonable amplitude
    expect(resampled[10]).toBeCloseTo(audio48k[30] ?? 0, 1);
  });

  it('resampleTo16k: returns exact array when already 16kHz', () => {
    const audio16k = new Float32Array([0.1, 0.2, 0.3]);
    const result = resampleTo16k(audio16k, 16000);
    expect(result).toBe(audio16k);
  });

  it('80-segment resilience: an unaligned beat in the middle does not break subsequent beats', () => {
    const totalSegments = 80;
    const segments: RawSegmentInput[] = [];
    const whisperWords: WhisperWord[] = [];

    let currentSec = 1.0;

    for (let i = 1; i <= totalSegments; i++) {
      const isUnmatchedBeat = i === 40;
      const beatWord = `beatphrase${i}`;
      const beatNarration = isUnmatchedBeat
        ? 'Alien words completely omitted from spoken voiceover'
        : `This is distinctive line ${beatWord} spoken clearly`;

      segments.push({
        index: i,
        clipId: `clip-${i}`,
        startMs: (i - 1) * 4000,
        endMs: i * 4000,
        narrationText: beatNarration,
        promptText: `Visual prompt for beat ${i}`,
      });

      // If it's not the unmatched beat, emit audio words
      if (!isUnmatchedBeat) {
        whisperWords.push(
          { word: 'This', startSec: currentSec, endSec: currentSec + 0.2 },
          { word: 'is', startSec: currentSec + 0.25, endSec: currentSec + 0.4 },
          { word: 'distinctive', startSec: currentSec + 0.45, endSec: currentSec + 0.9 },
          { word: 'line', startSec: currentSec + 0.95, endSec: currentSec + 1.2 },
          { word: beatWord, startSec: currentSec + 1.25, endSec: currentSec + 1.8 },
          { word: 'spoken', startSec: currentSec + 1.85, endSec: currentSec + 2.2 },
          { word: 'clearly', startSec: currentSec + 2.25, endSec: currentSec + 2.8 }
        );
        currentSec += 3.5;
      } else {
        // Voiceover continues with silent pause or unrelated phrase
        currentSec += 3.0;
      }
    }

    const result = alignSegmentsToWords(segments, whisperWords, {
      totalDurationMs: Math.round(currentSec * 1000),
    });

    expect(result.diffs).toHaveLength(80);

    // Beat 40 should be accommodated with contiguous timing
    const diff40 = result.diffs[39]!;
    expect(diff40.proposedDurationMs).toBeGreaterThan(0);

    // Crucial check: Segments 41 to 80 MUST continue to match successfully!
    const diff41 = result.diffs[40]!;
    const diff80 = result.diffs[79]!;

    expect(diff41.confidence).toBeGreaterThan(0.5);
    expect(diff80.confidence).toBeGreaterThan(0.5);

    // Contiguity invariant: zero gaps across all 80 segments
    for (let i = 0; i < 79; i++) {
      expect(result.diffs[i + 1]!.proposedStartMs).toBe(result.diffs[i]!.proposedEndMs);
    }
  });
});
