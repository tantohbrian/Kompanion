import { WaveformWorkerRequest, WaveformWorkerResponse } from './types';
import { computeWaveformPeaks, WaveformPeaks } from './waveform';

let workerInstance: Worker | null = null;
let requestId = 0;
const pendingCallbacks = new Map<string, (res: WaveformWorkerResponse) => void>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });
      workerInstance.onmessage = (event: MessageEvent<WaveformWorkerResponse>) => {
        const { id } = event.data;
        const cb = pendingCallbacks.get(id);
        if (cb) {
          pendingCallbacks.delete(id);
          cb(event.data);
        }
      };
      workerInstance.onerror = (err) => {
        console.error('Audio waveform worker error:', err);
      };
    } catch {
      workerInstance = null;
    }
  }
  return workerInstance;
}

/**
 * Computes waveform peaks using the background worker if available,
 * falling back to main-thread computation in headless/test environments.
 */
export async function generateWaveform(
  channelData: Float32Array,
  numBuckets = 500
): Promise<WaveformPeaks> {
  const worker = getWorker();
  if (!worker) {
    // Synchronous fallback (e.g. Node.js unit tests)
    return computeWaveformPeaks(channelData, numBuckets);
  }

  return new Promise((resolve, reject) => {
    const id = `req-${++requestId}`;
    const timer = setTimeout(() => {
      pendingCallbacks.delete(id);
      // Fallback on timeout
      resolve(computeWaveformPeaks(channelData, numBuckets));
    }, 10000);

    pendingCallbacks.set(id, (res) => {
      clearTimeout(timer);
      if (res.ok && res.minPeaks && res.maxPeaks) {
        resolve({ min: res.minPeaks, max: res.maxPeaks });
      } else {
        reject(new Error(res.error || 'Failed to compute waveform peaks.'));
      }
    });

    const req: WaveformWorkerRequest = {
      id,
      action: 'computePeaks',
      channelData,
      numBuckets,
    };
    worker.postMessage(req);
  });
}

/**
 * Decodes an audio file or blob using the Web Audio API AudioContext.
 * Returns duration in integer milliseconds and the primary channel data.
 */
export async function decodeAudioBuffer(blob: Blob): Promise<{
  durationMs: number;
  channelData: Float32Array;
  sampleRate: number;
}> {
  const arrayBuffer = await blob.arrayBuffer();

  // Handle standard Web Audio API
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API is not supported in this environment.');
  }

  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const durationMs = Math.round(audioBuffer.duration * 1000);
    return {
      durationMs,
      channelData: new Float32Array(channelData),
      sampleRate: audioBuffer.sampleRate,
    };
  } finally {
    ctx.close().catch(() => {});
  }
}
