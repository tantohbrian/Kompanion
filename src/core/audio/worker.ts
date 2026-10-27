import { WaveformWorkerRequest, WaveformWorkerResponse } from './types';
import { computeWaveformPeaks } from './waveform';

/**
 * Audio Waveform Worker entry point.
 * Computes downsampled min/max amplitude peaks off the main thread.
 */
self.onmessage = (event: MessageEvent<WaveformWorkerRequest>) => {
  const req = event.data;
  if (!req || req.action !== 'computePeaks') return;

  try {
    const { min, max } = computeWaveformPeaks(req.channelData, req.numBuckets);
    const response: WaveformWorkerResponse = {
      id: req.id,
      ok: true,
      minPeaks: min,
      maxPeaks: max,
    };
    self.postMessage(response);
  } catch (err) {
    const response: WaveformWorkerResponse = {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
