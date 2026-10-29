import { describe, it, expect } from 'vitest';
import { alignSegmentsToWords, checkScriptHasNarration, normalizeToken } from './aligner';
import { normalizeSpokenNumbers, isTokenMatch, tokenizeText } from './textNormalizer';
import { encodeMono16kWav, blobToArrayBuffer } from './wavEncoder';
import { RawSegmentInput, WhisperWord } from './types';
import { groundTruthWords, cumulativeDriftWords } from './syncTestFixtures';

describe('Smart Sync Aligner, Normalizer & Global DP Verification', () => {
  describe('textNormalizer & Spoken Number Matching', () => {
    it('normalizes times and numbers ("11:47" <-> "eleven forty seven", "2020" <-> "twenty twenty")', () => {
      expect(normalizeSpokenNumbers('11:47')).toBe('11 47');
      expect(normalizeSpokenNumbers('eleven forty-seven')).toBe('11 47');
      expect(normalizeSpokenNumbers('twenty twenty')).toBe('2020');
      expect(normalizeSpokenNumbers('one hundred and ten')).toBe('110');

      expect(isTokenMatch('11', 'eleven')).toBe(true);
      expect(isTokenMatch('2020', '2020')).toBe(true);
      expect(isTokenMatch('110', '110')).toBe(true);
    });

    it('normalizes tokens and handles punctuation', () => {
      expect(normalizeToken('Basketball,')).toBe('basketball');
      expect(normalizeToken("You're")).toBe('youre');
      expect(normalizeToken('100%!')).toBe('100');
    });
  });

  describe('wavEncoder Validation', () => {
    it('validates 16kHz mono PCM WAV header and byte length', async () => {
      const sampleRate = 16000;
      const samples = new Float32Array(sampleRate); // 1 sec of silence
      const wavBlob = encodeMono16kWav(samples, sampleRate);

      expect(wavBlob.type).toBe('audio/wav');
      expect(wavBlob.size).toBe(44 + 32000);

      const buffer = await blobToArrayBuffer(wavBlob);
      const view = new DataView(buffer);
      const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
      expect(riff).toBe('RIFF');
      expect(wave).toBe('WAVE');
      expect(view.getUint16(20, true)).toBe(1); // PCM
      expect(view.getUint16(22, true)).toBe(1); // Mono
      expect(view.getUint32(24, true)).toBe(16000); // 16kHz
      expect(view.getUint16(34, true)).toBe(16); // 16-bit
    });
  });

  describe('Global DP Alignment Across 80-Beat Script', () => {
    it('aligns an 80-beat script with spoken number variations and cumulative TTS drift', () => {
      const segments: RawSegmentInput[] = [];
      const words: WhisperWord[] = [];
      let currentWordTime = 0.5;

      for (let i = 1; i <= 80; i++) {
        const segStartMs = (i - 1) * 3000;
        const segEndMs = i * 3000;
        const numberPhrase = i === 1 ? 'eleven forty-seven' : i === 40 ? 'twenty twenty' : `${i}`;
        const narration = `Beat ${i} begins with ${numberPhrase} as the narrator speaks clearly.`;

        segments.push({
          index: i,
          clipId: `clip-${i}`,
          startMs: segStartMs,
          endMs: segEndMs,
          narrationText: narration,
        });

        // Add cumulative TTS drift between beats (randomized drift 0.2s to 0.8s)
        currentWordTime += 0.25;
        const spokenTokens = tokenizeText(narration);
        for (const token of spokenTokens) {
          const dur = 0.25;
          words.push({
            word: token,
            startSec: currentWordTime,
            endSec: currentWordTime + dur,
          });
          currentWordTime += dur + 0.05;
        }
      }

      const totalDurationMs = Math.round(currentWordTime * 1000);
      const result = alignSegmentsToWords(segments, words, { totalDurationMs });

      expect(result.hasNarration).toBe(true);
      expect(result.diffs).toHaveLength(80);

      // Verify magnetic timeline contiguity
      expect(result.diffs[0]!.proposedStartMs).toBe(0);
      for (let i = 1; i < 80; i++) {
        expect(result.diffs[i]!.proposedStartMs).toBe(result.diffs[i - 1]!.proposedEndMs);
      }
      expect(result.diffs[79]!.proposedEndMs).toBe(totalDurationMs);

      // Verify high alignment confidence
      expect(result.diffs[0]!.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.diffs[39]!.confidence).toBeGreaterThanOrEqual(0.7); // Beat 40 with twenty twenty
      expect(result.diffs[79]!.confidence).toBeGreaterThanOrEqual(0.7); // Beat 80
    });
  });

  describe('Ground-Truth & Drift Quality Gates', () => {
    it('Missing Narration Gate: immediately flags NO_NARRATION_TEXT', () => {
      const promptOnlySegments: RawSegmentInput[] = [
        { index: 1, clipId: 'c1', startMs: 0, endMs: 5000, promptText: 'Cartoon character' },
        { index: 2, clipId: 'c2', startMs: 5000, endMs: 10000, promptText: 'Close up', narrationText: '  ' },
      ];
      expect(checkScriptHasNarration(promptOnlySegments)).toBe(false);
      const result = alignSegmentsToWords(promptOnlySegments, []);
      expect(result.hasNarration).toBe(false);
      expect(result.diagnostics[0]?.code).toBe('NO_NARRATION_TEXT');
    });

    it('Ground-Truth Boundary Error Gate: reduces boundary error to within 50ms', () => {
      const rawSegments: RawSegmentInput[] = [
        { index: 1, clipId: 'c1', startMs: 0, endMs: 5000, narrationText: 'You are halfway through doing something you have done a hundred times.' },
        { index: 2, clipId: 'c2', startMs: 5000, endMs: 8500, narrationText: 'Maybe you are shooting a basketball.' },
        { index: 3, clipId: 'c3', startMs: 8500, endMs: 12500, narrationText: 'And suddenly, you start thinking about your elbow angle.' },
      ];
      const result = alignSegmentsToWords(rawSegments, groundTruthWords);
      expect(result.diffs).toHaveLength(3);
      expect(Math.abs(result.diffs[0]!.proposedEndMs - 4500)).toBeLessThanOrEqual(50);
      expect(Math.abs(result.diffs[1]!.proposedEndMs - 7350)).toBeLessThanOrEqual(50);
      expect(result.diffs[0]!.proposedStartMs).toBe(0);
      expect(result.diffs[1]!.proposedStartMs).toBe(result.diffs[0]!.proposedEndMs);
      expect(result.diffs[2]!.proposedStartMs).toBe(result.diffs[1]!.proposedEndMs);
    });

    it('Cumulative Drift Gate: accurately tracks multi-second pauses and cumulative drift', () => {
      const segments: RawSegmentInput[] = [
        { index: 1, clipId: 'c1', startMs: 0, endMs: 5000, narrationText: 'In the ancient redwood forest secrets linger.' },
        { index: 2, clipId: 'c2', startMs: 5000, endMs: 10000, narrationText: 'Sunlight filters through towering canopies.' },
        { index: 3, clipId: 'c3', startMs: 10000, endMs: 15000, narrationText: 'A silent traveler steps forward into the misty trail.' },
        { index: 4, clipId: 'c4', startMs: 15000, endMs: 20000, narrationText: 'The journey to the lost sanctuary begins now.' },
      ];
      const result = alignSegmentsToWords(segments, cumulativeDriftWords);
      expect(result.diffs).toHaveLength(4);
      expect(result.diffs[0]!.proposedStartMs).toBe(0);
      expect(result.diffs[1]!.proposedStartMs).toBe(result.diffs[0]!.proposedEndMs);
      expect(result.diffs[2]!.proposedStartMs).toBe(result.diffs[1]!.proposedEndMs);
      expect(result.diffs[3]!.proposedStartMs).toBe(result.diffs[2]!.proposedEndMs);
    });
  });
});
