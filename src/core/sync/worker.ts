import { pipeline } from '@huggingface/transformers';
import { SyncWorkerRequest, SyncWorkerResponse, WhisperWord } from './types';

let isCancelled = false;

interface WorkerScope {
  onmessage: ((e: MessageEvent<SyncWorkerRequest>) => void) | null;
  postMessage: (msg: SyncWorkerResponse) => void;
}

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = async (e: MessageEvent<SyncWorkerRequest>) => {
  const msg = e.data;

  if (msg.type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (msg.type === 'START') {
    isCancelled = false;
    const { audioData, forceWasm } = msg;

    try {
      workerScope.postMessage({
        type: 'MODEL_PROGRESS',
        progress: 0,
        status: 'Initializing Whisper pipeline…',
      });

      // 1. Initialize Pipeline with progress callback
      // Guard: onnx-community/whisper-base_timestamped is required for word-level timestamps
      const modelId = 'onnx-community/whisper-base_timestamped';
      const device = forceWasm ? 'wasm' : undefined;

      let transcriber;
      try {
        transcriber = await pipeline(
          'automatic-speech-recognition',
          modelId,
          {
            device,
            progress_callback: (info: { status?: string; progress?: number; file?: string }) => {
              if (isCancelled) return;
              if (info.status === 'progress' && typeof info.progress === 'number') {
                workerScope.postMessage({
                  type: 'MODEL_PROGRESS',
                  progress: Math.round(info.progress),
                  status: `Downloading ${info.file || 'model components'}…`,
                });
              } else if (info.status === 'done') {
                workerScope.postMessage({
                  type: 'MODEL_PROGRESS',
                  progress: 100,
                  status: 'Model loaded into local browser cache.',
                });
              }
            },
          }
        );
      } catch (pipelineErr) {
        // If default/WebGPU device failed, fallback to WASM
        if (!forceWasm) {
          workerScope.postMessage({
            type: 'FALLBACK_WASM',
            reason: pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr),
          });

          transcriber = await pipeline('automatic-speech-recognition', modelId, {
            device: 'wasm',
          });
        } else {
          throw pipelineErr;
        }
      }

      if (isCancelled) {
        throw new Error('Smart Sync cancelled by user');
      }

      workerScope.postMessage({
        type: 'INFERENCE_PROGRESS',
        progress: 25,
      });

      // 2. Transcribe Audio
      // Guard: chunk_length_s MUST be 29 (never 30) to avoid ONNX timestamp collapse
      const output = await transcriber(audioData, {
        return_timestamps: 'word',
        chunk_length_s: 29,
      });

      if (isCancelled) {
        throw new Error('Smart Sync cancelled by user');
      }

      workerScope.postMessage({
        type: 'INFERENCE_PROGRESS',
        progress: 90,
      });

      // 3. Extract word timestamps
      const rawChunks = Array.isArray(output) ? output[0]?.chunks : output.chunks;
      const fullText = (Array.isArray(output) ? output[0]?.text : output.text) || '';

      const words: WhisperWord[] = [];
      if (Array.isArray(rawChunks)) {
        for (const chunk of rawChunks) {
          if (chunk.timestamp && Array.isArray(chunk.timestamp)) {
            const startSec = chunk.timestamp[0];
            const endSec = chunk.timestamp[1] ?? startSec + 0.3;
            if (typeof startSec === 'number') {
              words.push({
                word: String(chunk.text || '').trim(),
                startSec,
                endSec: typeof endSec === 'number' ? endSec : startSec + 0.3,
              });
            }
          }
        }
      }

      workerScope.postMessage({
        type: 'COMPLETE',
        words,
        text: fullText,
      });
    } catch (err) {
      workerScope.postMessage({
        type: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
