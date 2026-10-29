import { Asset, Clip, ParseResult } from '../core/model/types';
import { ParsedSegment } from '../core/parser/types';
import { IngestedImage, IngestedAudio } from '../features/ingest';

export function ingestedToAssets(images: IngestedImage[], audio: IngestedAudio[]): Asset[] {
  return [
    ...images.map((img) => ({
      id: img.id,
      kind: 'image' as const,
      name: img.name,
      storageKey: img.storageKey,
      order: img.order,
      meta: {
        bytes: img.bytes,
        width: img.width,
        height: img.height,
        thumbnailDataUrl: img.thumbnailUrl,
      },
    })),
    ...audio.map((aud, i) => ({
      id: aud.id,
      kind: 'audio' as const,
      name: aud.name,
      storageKey: aud.storageKey,
      order: i + 1,
      meta: {
        bytes: aud.bytes,
        durationMs: aud.durationMs,
      },
    })),
  ];
}

export function assetsToIngested(assets: Asset[]): {
  images: IngestedImage[];
  audio: IngestedAudio[];
} {
  const images: IngestedImage[] = assets
    .filter((a) => a.kind === 'image')
    .map((a) => ({
      id: a.id,
      name: a.name,
      storageKey: a.storageKey,
      order: a.order,
      bytes: a.meta?.bytes || 0,
      width: a.meta?.width,
      height: a.meta?.height,
      thumbnailUrl: (a.meta as { thumbnailDataUrl?: string })?.thumbnailDataUrl || '',
    }));

  const audio: IngestedAudio[] = assets
    .filter((a) => a.kind === 'audio')
    .map((a) => ({
      id: a.id,
      name: a.name,
      storageKey: a.storageKey,
      order: a.order,
      bytes: a.meta?.bytes || 0,
      durationMs: a.meta?.durationMs || 0,
    }));

  return { images, audio };
}

export function buildSmartSyncSegments(
  clips: Clip[],
  scriptSegments: ParsedSegment[]
) {
  return clips.map((clip, idx) => {
    const seg = scriptSegments.find((s) => s.index === clip.sourceSegment) || scriptSegments[idx];
    return {
      index: idx + 1,
      clipId: clip.id,
      startMs: 0,
      endMs: clip.durationMs,
      promptText: seg?.promptText,
      narrationText: seg?.narrationText,
    };
  });
}

export function createUpdatedDraftProject(
  cur: import('../core/model/types').Project,
  imgs: IngestedImage[],
  aud: IngestedAudio[],
  scriptText: string,
  parsed: ParseResult | null
): import('../core/model/types').Project {
  const assets = ingestedToAssets(imgs, aud);
  return {
    ...cur,
    assets,
    script: { raw: scriptText, parse: parsed },
    updatedAt: Date.now(),
  };
}

