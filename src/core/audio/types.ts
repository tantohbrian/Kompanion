/**
 * Typed message contracts for Web Audio and waveform worker.
 * Pure TypeScript, zero DOM/React dependencies.
 */

export interface WaveformWorkerRequest {
  id: string;
  action: 'computePeaks';
  channelData: Float32Array;
  numBuckets: number;
}

export interface WaveformWorkerResponse {
  id: string;
  ok: boolean;
  minPeaks?: number[];
  maxPeaks?: number[];
  error?: string;
}

export interface AudioTrackInfo {
  id: string;
  name: string;
  durationMs: number; // Integer milliseconds
  storageKey: string;
  peaks?: {
    min: number[];
    max: number[];
  };
}
