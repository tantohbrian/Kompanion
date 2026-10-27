/**
 * Pure waveform min/max peaks computation algorithm.
 * No DOM/React imports.
 */

export interface WaveformPeaks {
  min: number[];
  max: number[];
}

/**
 * Computes downsampled min/max amplitude peaks for visualization.
 * Returns normalized values between -1.0 and 1.0.
 */
export function computeWaveformPeaks(
  channelData: Float32Array,
  numBuckets = 500
): WaveformPeaks {
  const buckets = Math.max(10, Math.min(numBuckets, channelData.length));
  const minPeaks = new Float32Array(buckets);
  const maxPeaks = new Float32Array(buckets);

  const bucketSize = channelData.length / buckets;

  for (let i = 0; i < buckets; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.min(channelData.length, Math.floor((i + 1) * bucketSize));

    let min = 1.0;
    let max = -1.0;

    for (let j = start; j < end; j++) {
      const val = channelData[j]!;
      if (val < min) min = val;
      if (val > max) max = val;
    }

    minPeaks[i] = min === 1.0 ? 0 : Math.max(-1.0, Math.min(1.0, min));
    maxPeaks[i] = max === -1.0 ? 0 : Math.max(-1.0, Math.min(1.0, max));
  }

  return {
    min: Array.from(minPeaks),
    max: Array.from(maxPeaks),
  };
}
