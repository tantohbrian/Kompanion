import { ResolvedScene } from '../render/types';

export interface ExportConfig {
  width: number;
  height: number;
  fps: number; // 24, 30, 60
  includeAudio: boolean;
  bitrate?: number;
}

export interface ExportProgress {
  frame: number;
  totalFrames: number;
  percentage: number;
  fps: number;
  etaSeconds: number;
}

export interface SerializedAudio {
  sampleRate: number;
  numberOfChannels: number;
  channelData: Float32Array[];
}

export type WorkerRequest =
  | {
      type: 'START';
      scene: ResolvedScene;
      config: ExportConfig;
      serializedAudio?: SerializedAudio;
      assets: Array<{ id: string; blob: Blob }>;
    }
  | {
      type: 'CANCEL';
    };

export type WorkerResponse =
  | {
      type: 'PROGRESS';
      progress: ExportProgress;
    }
  | {
      type: 'COMPLETE';
      mp4Buffer: ArrayBuffer;
      durationMs: number;
    }
  | {
      type: 'ERROR';
      error: string;
    };
