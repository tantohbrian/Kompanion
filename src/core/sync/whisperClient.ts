import { SyncWorkerResponse, WhisperWord } from './types';

export interface WhisperProgressCallbacks {
  onModelProgress?: (progress: number, status: string) => void;
  onInferenceProgress?: (progress: number) => void;
  onFallbackWasm?: (reason: string) => void;
}

export class WhisperClient {
  private worker: Worker | null = null;
  private currentReject: ((err: Error) => void) | null = null;

  async transcribe(
    audioData: Float32Array,
    sampleRate: number,
    callbacks?: WhisperProgressCallbacks
  ): Promise<{ words: WhisperWord[]; text: string }> {
    this.cancel(); // ensure any previous worker is terminated

    // Testing hook for fast, deterministic E2E environments
    if (
      typeof window !== 'undefined' &&
      (window as unknown as { __MOCK_WHISPER_WORDS__?: WhisperWord[] }).__MOCK_WHISPER_WORDS__
    ) {
      const mockWords = (window as unknown as { __MOCK_WHISPER_WORDS__: WhisperWord[] })
        .__MOCK_WHISPER_WORDS__;
      callbacks?.onModelProgress?.(100, 'Model loaded.');
      callbacks?.onInferenceProgress?.(100);
      return {
        words: mockWords,
        text: mockWords.map((w) => w.word).join(' '),
      };
    }

    return new Promise((resolve, reject) => {
      this.currentReject = reject;

      try {
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
          type: 'module',
        });

        this.worker.onmessage = (e: MessageEvent<SyncWorkerResponse>) => {
          const msg = e.data;
          switch (msg.type) {
            case 'MODEL_PROGRESS':
              callbacks?.onModelProgress?.(msg.progress, msg.status);
              break;
            case 'INFERENCE_PROGRESS':
              callbacks?.onInferenceProgress?.(msg.progress);
              break;
            case 'FALLBACK_WASM':
              callbacks?.onFallbackWasm?.(msg.reason);
              break;
            case 'COMPLETE':
              this.cleanup();
              resolve({ words: msg.words, text: msg.text });
              break;
            case 'ERROR':
              this.cleanup();
              reject(new Error(msg.error));
              break;
          }
        };

        this.worker.onerror = (err) => {
          this.cleanup();
          reject(new Error(err.message || 'Whisper worker encountered an error'));
        };

        this.worker.postMessage({
          type: 'START',
          audioData,
          sampleRate,
        });
      } catch (err) {
        this.cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  cancel(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'CANCEL' });
      this.worker.terminate();
      this.worker = null;
    }
    if (this.currentReject) {
      this.currentReject(new Error('Smart Sync cancelled by user'));
      this.currentReject = null;
    }
  }

  private cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.currentReject = null;
  }
}
