import { Project } from '../model/types';
import { resolveTimeline } from '../render/resolveTimeline';
import { getMediaFile } from '../storage/opfs';
import { sanitizeExportFilename } from './filenameSanitizer';
import { mixProjectAudio } from './audioMixer';
import { verifyExportedMp4, ReadbackVerificationResult } from './readbackVerification';
import { ImageBitmapLruCache } from '../render/imageCache';
import { ExportConfig, ExportProgress, WorkerRequest, WorkerResponse } from './types';

export interface ExportResult {
  filename: string;
  blob: Blob;
  durationMs: number;
  verification: ReadbackVerificationResult;
}

export interface ExportCallbacks {
  onProgress?: (progress: ExportProgress) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: ExportResult) => void;
}

export class ExportPipeline {
  private worker: Worker | null = null;
  private isCancelled = false;
  private rejectCurrentPromise: ((reason?: unknown) => void) | null = null;

  cancel(): void {
    this.isCancelled = true;
    if (this.rejectCurrentPromise) {
      this.rejectCurrentPromise(new Error('Export cancelled by user'));
      this.rejectCurrentPromise = null;
    }
    if (this.worker) {
      this.worker.postMessage({ type: 'CANCEL' } as WorkerRequest);
      this.worker.terminate();
      this.worker = null;
    }
  }

  async run(
    project: Project,
    config: ExportConfig,
    callbacks: ExportCallbacks = {}
  ): Promise<ExportResult> {
    this.isCancelled = false;

    // 1. Resolve timeline at target resolution
    const scene = resolveTimeline(project);
    scene.width = config.width;
    scene.height = config.height;

    // 2. Fetch media assets
    const assetBlobs: Array<{ id: string; blob: Blob }> = [];
    const audioBuffers = new Map<string, AudioBuffer>();

    for (const asset of project.assets) {
      if (this.isCancelled) throw new Error('Export cancelled');
      const file =
        (asset.storageKey ? await getMediaFile(asset.storageKey) : null) ||
        (await getMediaFile(asset.id));
      if (file) {
        if (asset.kind === 'image') {
          assetBlobs.push({ id: asset.id, blob: file });
        } else if (asset.kind === 'audio' && config.includeAudio) {
          // Decode audio for offline mixing
          try {
            const arrayBuffer = await file.arrayBuffer();
            const audioCtx = new (window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const decoded = await audioCtx.decodeAudioData(arrayBuffer);
            audioBuffers.set(asset.id, decoded);
            await audioCtx.close();
          } catch {
            // Ignore audio decode errors and continue
          }
        }
      }
    }

    // 3. Offline audio mix
    let serializedAudio = null;
    if (config.includeAudio && audioBuffers.size > 0) {
      serializedAudio = await mixProjectAudio(project, scene.durationMs, audioBuffers);
    }

    if (this.isCancelled) throw new Error('Export cancelled');

    // 4. Instantiate Web Worker
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });

    const mp4Promise = new Promise<{ mp4Buffer: ArrayBuffer; durationMs: number }>(
      (resolve, reject) => {
        if (!this.worker) {
          reject(new Error('Export worker failed to initialize'));
          return;
        }

        this.rejectCurrentPromise = reject;

        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const msg = e.data;
          if (msg.type === 'PROGRESS') {
            callbacks.onProgress?.(msg.progress);
          } else if (msg.type === 'COMPLETE') {
            this.rejectCurrentPromise = null;
            resolve({ mp4Buffer: msg.mp4Buffer, durationMs: msg.durationMs });
          } else if (msg.type === 'ERROR') {
            this.rejectCurrentPromise = null;
            reject(new Error(msg.error));
          }
        };

        this.worker.onerror = (err) => {
          this.rejectCurrentPromise = null;
          reject(new Error(err.message || 'Worker encountered an unexpected error'));
        };

        const startMsg: WorkerRequest = {
          type: 'START',
          scene,
          config,
          serializedAudio: serializedAudio ?? undefined,
          assets: assetBlobs,
        };

        this.worker.postMessage(startMsg);
      }
    );

    try {
      const { mp4Buffer, durationMs } = await mp4Promise;

      // 5. Read-back verification
      const verifyCache = new ImageBitmapLruCache(20);
      for (const asset of assetBlobs) {
        try {
          const bmp = await createImageBitmap(asset.blob);
          verifyCache.setBitmap(asset.id, scene.width, bmp);
        } catch {
          // Ignore bitmap decode failures for verification cache
        }
      }

      const verification = await verifyExportedMp4(
        mp4Buffer,
        durationMs,
        config.fps,
        config.includeAudio,
        scene,
        verifyCache
      );
      verifyCache.clear();

      const filename = sanitizeExportFilename(project.name);
      const blob = new Blob([mp4Buffer], { type: 'video/mp4' });

      const result: ExportResult = {
        filename,
        blob,
        durationMs,
        verification,
      };

      callbacks.onComplete?.(result);
      return result;
    } finally {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }
  }
}
