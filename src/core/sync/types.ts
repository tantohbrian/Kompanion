/**
 * Core Smart Sync Types for Kompanion.
 * Pure TypeScript, zero DOM or React dependencies.
 */

export interface WhisperWord {
  word: string;
  startSec: number;
  endSec: number;
}

export interface AlignedSegmentDiff {
  index: number;
  clipId?: string;
  narrationText: string;
  promptText?: string;
  originalStartMs: number;
  originalEndMs: number;
  originalDurationMs: number;
  proposedStartMs: number;
  proposedEndMs: number;
  proposedDurationMs: number;
  deltaMs: number;
  confidence: number;
  status: 'accepted' | 'rejected';
}

export interface SyncDiagnostic {
  code: 'NO_NARRATION_TEXT' | 'LOW_CONFIDENCE' | 'AUDIO_TOO_SHORT' | 'INFERENCE_FALLBACK';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface AlignmentResult {
  hasNarration: boolean;
  diffs: AlignedSegmentDiff[];
  diagnostics: SyncDiagnostic[];
  totalDriftMs: number;
  meanErrorReductionMs?: number;
}

export interface RawSegmentInput {
  index: number;
  clipId?: string;
  startMs: number;
  endMs: number;
  promptText?: string;
  narrationText?: string;
}

export type SyncWorkerRequest =
  | {
      type: 'START';
      audioData: Float32Array;
      sampleRate: number;
      forceWasm?: boolean;
    }
  | {
      type: 'CANCEL';
    };

export type SyncWorkerResponse =
  | {
      type: 'MODEL_PROGRESS';
      progress: number;
      status: string;
    }
  | {
      type: 'INFERENCE_PROGRESS';
      progress: number;
    }
  | {
      type: 'COMPLETE';
      words: WhisperWord[];
      text: string;
    }
  | {
      type: 'FALLBACK_WASM';
      reason: string;
    }
  | {
      type: 'ERROR';
      error: string;
    };
