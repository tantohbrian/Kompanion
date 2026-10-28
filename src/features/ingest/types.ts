export interface IngestedImage {
  id: string;
  name: string;
  file?: File;
  storageKey: string;
  order: number;
  width?: number;
  height?: number;
  bytes: number;
  thumbnailUrl: string;
  isCorrupt?: boolean;
  error?: string;
}

export interface IngestedAudio {
  id: string;
  name: string;
  file?: File;
  storageKey: string;
  durationMs: number; // integer milliseconds
  bytes: number;
  waveform?: {
    min: number[];
    max: number[];
  };
  isCorrupt?: boolean;
  error?: string;
}
