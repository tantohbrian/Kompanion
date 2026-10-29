import { describe, it, expect } from 'vitest';
import {
  normalizeToken,
  normalizeSpokenNumbers,
  tokenizeText,
  isTokenMatch,
} from './textNormalizer';
import { encodeMono16kWav, samplesToBase64Wav, blobToArrayBuffer } from './wavEncoder';
import { alignSegmentsToWords } from './aligner';
import { RawSegmentInput, WhisperWord } from './types';

describe('Option C Smart Sync: Normalizer, WAV Encoder & Global Alignment', () => {
  describe('textNormalizer', () => {
    it('normalizes times and numbers correctly', () => {
      expect(normalizeToken('Testing...')).toBe('testing');
      expect(normalizeSpokenNumbers('At 11:47 in the morning')).toBe('At 11 47 in the morning');
      expect(normalizeSpokenNumbers('eleven forty-seven')).toBe('11 47');
      expect(normalizeSpokenNumbers('twenty twenty')).toBe('2020');
      expect(normalizeSpokenNumbers('one hundred')).toBe('100');
      expect(normalizeSpokenNumbers('one hundred and ten')).toBe('110');
    });

    it('matches spoken words and numeric digits with isTokenMatch', () => {
      expect(isTokenMatch('11', 'eleven')).toBe(true);
      expect(isTokenMatch('eleven', '11')).toBe(true);
      expect(isTokenMatch('20', 'twenty')).toBe(true);
      expect(isTokenMatch('villain', 'villains')).toBe(true);
      expect(isTokenMatch('completely', 'complete')).toBe(true);
    });

    it('tokenizes text into clean normalized tokens', () => {
      const tokens = tokenizeText('At eleven forty-seven, the psychology of villains revealed...');
      expect(tokens).toContain('11');
      expect(tokens).toContain('47');
      expect(tokens).toContain('psychology');
      expect(tokens).toContain('villains');
    });
  });

  describe('wavEncoder', () => {
    it('generates a valid 16kHz mono PCM WAV blob with 44-byte header', async () => {
      // 1 second of silence at 16,000 Hz = 16,000 samples = 32,000 PCM bytes + 44 header bytes = 32,044 bytes
      const sampleRate = 16000;
      const samples = new Float32Array(sampleRate);
      const wavBlob = encodeMono16kWav(samples, sampleRate);

      expect(wavBlob.type).toBe('audio/wav');
      expect(wavBlob.size).toBe(44 + 32000);

      const buffer = await blobToArrayBuffer(wavBlob);
      const view = new DataView(buffer);

      // Check RIFF header magic
      const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
      expect(riff).toBe('RIFF');
      expect(wave).toBe('WAVE');

      // Sample rate and channel count
      expect(view.getUint16(20, true)).toBe(1); // PCM format
      expect(view.getUint16(22, true)).toBe(1); // 1 channel (mono)
      expect(view.getUint32(24, true)).toBe(16000); // 16kHz
      expect(view.getUint16(34, true)).toBe(16); // 16-bit
    });

    it('converts samples to base64 WAV string', async () => {
      const samples = new Float32Array(100);
      const b64 = await samplesToBase64Wav(samples, 16000);
      expect(typeof b64).toBe('string');
      expect(b64.length).toBeGreaterThan(50);
    });
  });

  describe('Global Alignment with Number Equivalence', () => {
    it('aligns beats when script uses words ("eleven forty seven") and whisper returns digits ("11", "47")', () => {
      const segments: RawSegmentInput[] = [
        {
          index: 1,
          clipId: 'c1',
          startMs: 0,
          endMs: 5000,
          narrationText: 'At eleven forty seven the clock struck twelve.',
        },
        {
          index: 2,
          clipId: 'c2',
          startMs: 5000,
          endMs: 10000,
          narrationText: 'In twenty twenty the entire paradigm shifted.',
        },
      ];

      const whisperWords: WhisperWord[] = [
        { word: 'At', startSec: 0.5, endSec: 0.7 },
        { word: '11', startSec: 0.75, endSec: 1.1 },
        { word: '47', startSec: 1.15, endSec: 1.6 },
        { word: 'the', startSec: 1.65, endSec: 1.8 },
        { word: 'clock', startSec: 1.85, endSec: 2.3 },
        { word: 'struck', startSec: 2.35, endSec: 2.8 },
        { word: 'twelve', startSec: 2.85, endSec: 3.4 },

        { word: 'In', startSec: 6.0, endSec: 6.2 },
        { word: '2020', startSec: 6.25, endSec: 7.0 },
        { word: 'the', startSec: 7.05, endSec: 7.2 },
        { word: 'entire', startSec: 7.25, endSec: 7.7 },
        { word: 'paradigm', startSec: 7.75, endSec: 8.4 },
        { word: 'shifted', startSec: 8.45, endSec: 9.1 },
      ];

      const result = alignSegmentsToWords(segments, whisperWords);
      expect(result.diffs).toHaveLength(2);
      expect(result.diffs[0]!.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.diffs[1]!.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.diffs[0]!.proposedStartMs).toBe(0);
      expect(result.diffs[1]!.proposedStartMs).toBe(result.diffs[0]!.proposedEndMs);
    });
  });
});
