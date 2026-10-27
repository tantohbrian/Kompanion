import { describe, it, expect } from 'vitest';
import { computeWaveformPeaks } from './waveform';

describe('Waveform Peak Computation', () => {
  it('computes min and max peaks within -1.0 to 1.0 range', () => {
    // Generate synthetic sine wave
    const sampleRate = 44100;
    const durationSec = 1;
    const totalSamples = sampleRate * durationSec;
    const channelData = new Float32Array(totalSamples);
    const freq = 440; // 440 Hz

    for (let i = 0; i < totalSamples; i++) {
      channelData[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.8;
    }

    const { min, max } = computeWaveformPeaks(channelData, 100);
    expect(min.length).toBe(100);
    expect(max.length).toBe(100);

    for (let i = 0; i < 100; i++) {
      expect(min[i]).toBeGreaterThanOrEqual(-1.0);
      expect(min[i]).toBeLessThanOrEqual(0.0);
      expect(max[i]).toBeGreaterThanOrEqual(0.0);
      expect(max[i]).toBeLessThanOrEqual(1.0);
    }
  });

  it('handles empty or small buffers safely without throwing', () => {
    const empty = new Float32Array(0);
    const res = computeWaveformPeaks(empty, 50);
    expect(res.min.length).toBe(10);
    expect(res.max.length).toBe(10);
  });

  it('clamps extreme values', () => {
    const extreme = new Float32Array([10.0, -15.0, 0.5, -0.5]);
    const res = computeWaveformPeaks(extreme, 10);
    for (const val of res.max) {
      expect(val).toBeLessThanOrEqual(1.0);
    }
    for (const val of res.min) {
      expect(val).toBeGreaterThanOrEqual(-1.0);
    }
  });
});
