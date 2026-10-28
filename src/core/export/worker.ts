import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
import { registerAacEncoder } from '@mediabunny/aac-encoder';
import { renderFrame } from '../render/renderFrame';
import { RenderCache } from '../render/types';
import { WorkerRequest, WorkerResponse } from './types';

// Polyfill AudioBuffer in worker scope for Mediabunny's instanceof checks
if (typeof AudioBuffer === 'undefined') {
  class WorkerAudioBuffer {
    numberOfChannels: number;
    length: number;
    sampleRate: number;
    duration: number;
    private _channels: Float32Array[];

    constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
      this.numberOfChannels = options.numberOfChannels;
      this.length = options.length;
      this.sampleRate = options.sampleRate;
      this.duration = options.length / options.sampleRate;
      this._channels = [];
      for (let i = 0; i < this.numberOfChannels; i++) {
        this._channels.push(new Float32Array(this.length));
      }
    }

    getChannelData(channel: number): Float32Array {
      return this._channels[channel]!;
    }

    copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset = 0): void {
      const src = this._channels[channelNumber]!;
      destination.set(src.subarray(bufferOffset, bufferOffset + destination.length));
    }

    copyToChannel(source: Float32Array, channelNumber: number, bufferOffset = 0): void {
      const dst = this._channels[channelNumber]!;
      dst.set(source, bufferOffset);
    }
  }

  (globalThis as unknown as { AudioBuffer: typeof WorkerAudioBuffer }).AudioBuffer = WorkerAudioBuffer;
}

let isCancelled = false;

// Worker message handler interface
interface WorkerScope {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (msg: WorkerResponse, transfer?: Transferable[]) => void;
}

const workerScope = self as unknown as WorkerScope;

/**
 * Creates an AudioBuffer instance (works in window and worker scopes).
 */
function createWorkerAudioBuffer(
  numberOfChannels: number,
  length: number,
  sampleRate: number,
  channelData: Float32Array[]
): AudioBuffer {
  const buf = new AudioBuffer({ numberOfChannels, length, sampleRate });
  for (let ch = 0; ch < numberOfChannels; ch++) {
    buf.copyToChannel(channelData[ch]!, ch);
  }
  return buf;
}

/**
 * In-memory ImageBitmap cache for worker export (full resolution).
 */
class WorkerExportCache implements RenderCache {
  private bitmaps = new Map<string, ImageBitmap>();

  setBitmap(assetId: string, _resolution: number, bitmap: ImageBitmap): void {
    this.bitmaps.set(assetId, bitmap);
  }

  getBitmap(assetId: string): ImageBitmap | null {
    return this.bitmaps.get(assetId) ?? null;
  }

  hasBitmap(assetId: string): boolean {
    return this.bitmaps.has(assetId);
  }

  clear(): void {
    for (const bmp of this.bitmaps.values()) {
      bmp.close();
    }
    this.bitmaps.clear();
  }
}

workerScope.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const message = e.data;

  if (message.type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (message.type === 'START') {
    isCancelled = false;
    const { scene, config, serializedAudio, assets } = message;
    const { width, height, fps, includeAudio } = config;

    const cache = new WorkerExportCache();

    try {
      // 1. Decode full-resolution ImageBitmaps
      for (const asset of assets) {
        if (isCancelled) throw new Error('Export cancelled by user');
        const bitmap = await createImageBitmap(asset.blob);
        cache.setBitmap(asset.id, width, bitmap);
      }

      // 2. Check video/audio encoder capabilities
      const canVid = await canEncodeVideo('avc', { width, height, frameRate: fps });
      if (!canVid) {
        throw new Error(`Browser cannot encode H.264 video at ${width}x${height} ${fps}fps`);
      }

      const hasAudio = includeAudio && serializedAudio && serializedAudio.channelData.length > 0;
      if (hasAudio) {
        const canAud = await canEncodeAudio('aac', {
          sampleRate: serializedAudio.sampleRate,
          numberOfChannels: serializedAudio.numberOfChannels,
        });
        if (!canAud) {
          registerAacEncoder();
        }
      }

      // 3. Set up OffscreenCanvas & Mediabunny Output
      const offscreenCanvas = new OffscreenCanvas(width, height);
      const renderCtx = offscreenCanvas.getContext('2d');
      if (!renderCtx) {
        throw new Error('Failed to create 2D context on OffscreenCanvas');
      }

      const target = new BufferTarget();
      const output = new Output({
        format: new Mp4OutputFormat(),
        target,
      });

      const videoSource = new CanvasSource(offscreenCanvas, {
        codec: 'avc',
        bitrate: config.bitrate ?? 8_000_000,
      });
      output.addVideoTrack(videoSource);

      let audioSource: AudioBufferSource | null = null;
      if (hasAudio) {
        audioSource = new AudioBufferSource({
          codec: 'aac',
          bitrate: 192_000,
        });
        output.addAudioTrack(audioSource);
      }

      await output.start();

      // If audio present, add audio buffer to track
      if (hasAudio && audioSource) {
        const audioBuf = createWorkerAudioBuffer(
          serializedAudio.numberOfChannels,
          serializedAudio.channelData[0]!.length,
          serializedAudio.sampleRate,
          serializedAudio.channelData
        );
        await audioSource.add(audioBuf);
      }

      // 4. Deterministic frame loop
      const frameDurationSec = 1 / fps;
      const totalFrames = Math.max(1, Math.ceil((scene.durationMs / 1000) * fps));
      const startTime = performance.now();

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        if (isCancelled) {
          await output.cancel();
          throw new Error('Export cancelled by user');
        }

        const tMs = Math.round((frameIndex * 1000) / fps);
        const tSec = frameIndex * frameDurationSec;

        // Render frame with the single canonical function
        renderFrame(renderCtx, scene, tMs, cache);

        // Add to Mediabunny video source
        await videoSource.add(tSec, frameDurationSec);

        // Calculate progress and ETA
        const elapsedSec = (performance.now() - startTime) / 1000;
        const currentFps = elapsedSec > 0 ? (frameIndex + 1) / elapsedSec : 0;
        const remainingFrames = totalFrames - (frameIndex + 1);
        const etaSeconds = currentFps > 0 ? remainingFrames / currentFps : 0;
        const percentage = Math.round(((frameIndex + 1) / totalFrames) * 100);

        workerScope.postMessage({
          type: 'PROGRESS',
          progress: {
            frame: frameIndex + 1,
            totalFrames,
            percentage,
            fps: Math.round(currentFps * 10) / 10,
            etaSeconds: Math.round(etaSeconds),
          },
        });
      }

      // 5. Finalize output
      await output.finalize();

      const buffer = target.buffer;
      if (!buffer) {
        throw new Error('Output target produced an empty buffer');
      }

      workerScope.postMessage(
        {
          type: 'COMPLETE',
          mp4Buffer: buffer,
          durationMs: scene.durationMs,
        },
        [buffer]
      );
    } catch (err) {
      workerScope.postMessage({
        type: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      cache.clear();
    }
  }
};
