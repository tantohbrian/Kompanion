import { Clip, AudioClip } from '../model/types';

export interface ReorderClipArgs {
  clipId: string;
  targetIndex: number;
}

export interface TrimClipArgs {
  clipId: string;
  deltaDurationMs: number;
  edge: 'start' | 'end';
  minDurationMs?: number;
}

export interface SplitClipArgs {
  clipId: string;
  splitMs: number; // relative to timeline start or clip start
  relativeTo?: 'clip' | 'timeline';
  newClipId?: string;
  minDurationMs?: number;
}

export interface DeleteClipArgs {
  clipId: string;
}

export interface DuplicateClipArgs {
  clipId: string;
  newClipId?: string;
}

export interface ReplaceAssetArgs {
  clipId: string;
  newAssetId: string;
}

export interface SetClipDurationArgs {
  clipId: string;
  durationMs: number;
  minDurationMs?: number;
}

export interface UpdateClipArgs {
  clipId: string;
  updates: Partial<Omit<Clip, 'id' | 'assetId'>>;
}

export interface ApplyToAllClipsArgs {
  updates: Partial<Omit<Clip, 'id' | 'assetId' | 'durationMs' | 'sourceSegment'>>;
}

export interface UpdateAudioArgs {
  gain?: number;
  muted?: boolean;
  audio?: AudioClip[];
}

export interface ClipPositionInfo {
  clip: Clip;
  index: number;
  startMs: number;
  endMs: number;
}
