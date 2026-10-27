import { Clip, AudioClip, AnimationRef, TransitionRef, Asset } from '../model/types';

export interface ResolvedClip {
  clip: Clip;
  index: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  resolvedAnimation: AnimationRef;
  resolvedTransitionIn: TransitionRef;
}

export interface ResolvedScene {
  canvas: '16:9' | '9:16';
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  clips: ResolvedClip[];
  audio: AudioClip[];
  gain: number;
  muted: boolean;
  assets: Map<string, Asset>;
}

export interface RenderCache {
  getBitmap(assetId: string, resolution?: number): ImageBitmap | null;
  hasBitmap(assetId: string, resolution?: number): boolean;
  setBitmap(assetId: string, resolution: number, bitmap: ImageBitmap): void;
}

export interface TransformMatrix {
  scale: number;
  translateX: number;
  translateY: number;
}
