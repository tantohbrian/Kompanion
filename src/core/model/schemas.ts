import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 1;

export const AnimationRefSchema = z.object({
  id: z.string().min(1),
  params: z.record(z.union([z.number(), z.string()])),
});

export const TransitionRefSchema = z.object({
  id: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
});

export const ProjectDefaultsSchema = z.object({
  canvas: z.enum(['16:9', '9:16']),
  height: z.union([z.literal(720), z.literal(1080)]),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
  animation: AnimationRefSchema,
  transition: TransitionRefSchema,
});

export const AssetMetaSchema = z.object({
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

export const AssetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['image', 'audio']),
  name: z.string().min(1),
  storageKey: z.string().min(1),
  order: z.number().int().nonnegative(),
  meta: AssetMetaSchema,
});

export const ClipSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  durationMs: z.number().int().positive(),
  fit: z.enum(['cover', 'contain']),
  animation: z.union([AnimationRefSchema, z.literal('inherit')]),
  transitionIn: z.union([TransitionRefSchema, z.literal('inherit')]),
  sourceSegment: z.number().int().optional(),
});

export const AudioClipSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  offsetMs: z.number().int(),
});

export const TimelineSchema = z.object({
  clips: z.array(ClipSchema),
  audio: z.array(AudioClipSchema),
  gain: z.number().min(0).max(2).default(1),
  muted: z.boolean().default(false),
});

export const ParsedSegmentSchema = z.object({
  index: z.number().int().nonnegative(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  promptText: z.string(),
  narrationText: z.string().optional(),
  confidence: z.number().min(0).max(1),
  sourceLineNumbers: z.tuple([z.number().int(), z.number().int()]),
});

export const ParseDiagnosticSchema = z.object({
  severity: z.enum(['info', 'warning', 'error']),
  code: z.string(),
  message: z.string(),
  lineNumbers: z.array(z.number().int()).optional(),
});

export const ParseResultSchema = z.object({
  strategyName: z.string(),
  segments: z.array(ParsedSegmentSchema),
  diagnostics: z.array(ParseDiagnosticSchema),
});

export const ProjectScriptSchema = z.object({
  raw: z.string(),
  parse: ParseResultSchema.nullable(),
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  name: z.string().min(1),
  settings: ProjectDefaultsSchema,
  assets: z.array(AssetSchema),
  script: ProjectScriptSchema,
  timeline: TimelineSchema,
  updatedAt: z.number().int().positive(),
  deletedAt: z.number().int().positive().optional(),
});

export const WorkspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  defaults: ProjectDefaultsSchema,
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});
