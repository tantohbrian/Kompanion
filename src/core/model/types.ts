/**
 * Core domain types for Kompanion.
 * Pure TypeScript with integer millisecond time values.
 */

export type Id = string; // UUID v7 or v4 string

export type CanvasRatio = '16:9' | '9:16';
export type VideoHeight = 720 | 1080;
export type VideoFps = 24 | 30 | 60;
export type ClipFit = 'cover' | 'contain';

export interface AnimationRef {
  id: string;
  params: Record<string, number | string>;
}

export interface TransitionRef {
  id: string;
  durationMs: number;
}

export interface ProjectDefaults {
  canvas: CanvasRatio;
  height: VideoHeight;
  fps: VideoFps;
  animation: AnimationRef;
  transition: TransitionRef;
}

export interface AssetMeta {
  bytes: number;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface Asset {
  id: Id;
  kind: 'image' | 'audio';
  name: string;
  storageKey: string;
  order: number;
  meta: AssetMeta;
}

export interface Clip {
  id: Id;
  assetId: Id;
  durationMs: number;
  fit: ClipFit;
  animation: AnimationRef | 'inherit';
  transitionIn: TransitionRef | 'inherit';
  sourceSegment?: number;
}

export interface AudioClip {
  id: Id;
  assetId: Id;
  offsetMs: number;
}

export interface Timeline {
  clips: Clip[];
  audio: AudioClip[];
  gain: number;
  muted: boolean;
}

export interface ParsedSegment {
  index: number;
  startMs: number;
  endMs: number;
  promptText: string;
  narrationText?: string;
  confidence: number;
  sourceLineNumbers: [number, number];
}

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export interface ParseDiagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  lineNumbers?: number[];
}

export interface ParseResult {
  strategyName: string;
  segments: ParsedSegment[];
  diagnostics: ParseDiagnostic[];
}

export interface ProjectScript {
  raw: string;
  parse: ParseResult | null;
}

export interface Project {
  id: Id;
  workspaceId: Id;
  schemaVersion: number;
  name: string;
  settings: ProjectDefaults;
  assets: Asset[];
  script: ProjectScript;
  timeline: Timeline;
  updatedAt: number;
  deletedAt?: number;
}

export interface Workspace {
  id: Id;
  name: string;
  color: string;
  defaults: ProjectDefaults;
  createdAt: number;
  updatedAt: number;
}
