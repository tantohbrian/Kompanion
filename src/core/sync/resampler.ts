/**
 * Pure TypeScript linear audio resampler to 16,000 Hz mono.
 * Zero React/DOM dependencies. Used by Whisper sync pipeline.
 */

export const TARGET_WHISPER_SAMPLE_RATE = 16000;

/**
 * Resamples a mono Float32Array to 16,000 Hz using linear interpolation.
 * If already 16,000 Hz, returns the original array directly.
 */
export function resampleTo16k(
  audioData: Float32Array,
  sourceSampleRate: number
): Float32Array {
  if (sourceSampleRate === TARGET_WHISPER_SAMPLE_RATE) {
    return audioData;
  }

  if (sourceSampleRate <= 0 || audioData.length === 0) {
    return new Float32Array(0);
  }

  const ratio = sourceSampleRate / TARGET_WHISPER_SAMPLE_RATE;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originalPos = i * ratio;
    const index = Math.floor(originalPos);
    const fraction = originalPos - index;

    const sample1 = audioData[index] ?? 0;
    const sample2 = audioData[index + 1] ?? sample1;

    // Linear interpolation
    result[i] = sample1 + fraction * (sample2 - sample1);
  }

  return result;
}
