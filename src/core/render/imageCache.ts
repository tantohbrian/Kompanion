import { RenderCache } from './types';
import { getMediaFile } from '../storage/opfs';

export class ImageBitmapLruCache implements RenderCache {
  private cache = new Map<string, ImageBitmap>();
  private maxItems: number;

  constructor(maxItems = 60) {
    this.maxItems = maxItems;
  }

  private makeKey(assetId: string, resolution = 1280): string {
    return `${assetId}:${resolution}`;
  }

  getBitmap(assetId: string, resolution = 1280): ImageBitmap | null {
    const key = this.makeKey(assetId, resolution);
    const item = this.cache.get(key);
    if (!item) return null;

    // Refresh LRU position (delete and re-insert)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item;
  }

  hasBitmap(assetId: string, resolution = 1280): boolean {
    return this.cache.has(this.makeKey(assetId, resolution));
  }

  setBitmap(assetId: string, resolution: number, bitmap: ImageBitmap): void {
    const key = this.makeKey(assetId, resolution);
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxItems) {
      // Evict oldest (first key in map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        const old = this.cache.get(oldestKey);
        try {
          old?.close();
        } catch {
          // Ignore
        }
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, bitmap);
  }

  clear(): void {
    for (const bitmap of this.cache.values()) {
      try {
        bitmap.close();
      } catch {
        // Ignore
      }
    }
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Global singleton LRU cache for preview rendering.
 */
export const previewImageCache = new ImageBitmapLruCache(60);

/**
 * Loads and caches an ImageBitmap from an asset's storageKey.
 */
export async function loadAssetBitmap(
  assetId: string,
  storageKey: string,
  cache: RenderCache = previewImageCache,
  targetWidth = 1280
): Promise<ImageBitmap | null> {
  const cached = cache.getBitmap(assetId, targetWidth);
  if (cached) return cached;

  try {
    const blob = await getMediaFile(storageKey);
    if (!blob) return null;

    // In modern browsers, createImageBitmap accepts resize options
    let bitmap: ImageBitmap;
    if (typeof createImageBitmap !== 'undefined') {
      try {
        bitmap = await createImageBitmap(blob, {
          resizeWidth: targetWidth,
          resizeQuality: 'medium',
        });
      } catch {
        bitmap = await createImageBitmap(blob);
      }
      cache.setBitmap(assetId, targetWidth, bitmap);
      return bitmap;
    }
    return null;
  } catch (err) {
    console.warn(`Failed to decode ImageBitmap for asset ${assetId}:`, err);
    return null;
  }
}

/**
 * Finds the index of the clip active at time tMs.
 */
export function getActiveClipIndex(
  clips: { startMs: number; endMs: number }[],
  tMs: number
): number {
  if (clips.length === 0) return -1;
  const clamped = Math.max(0, tMs);
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i]!;
    if (clamped >= c.startMs && clamped < c.endMs) {
      return i;
    }
  }
  return clips.length - 1;
}

/**
 * Returns an array of clip indices within windowSize ahead and behind activeIndex.
 */
export function getPrefetchIndices(
  totalClips: number,
  activeIndex: number,
  windowSize = 5
): number[] {
  if (totalClips === 0 || activeIndex < 0) return [];
  const start = Math.max(0, activeIndex - windowSize);
  const end = Math.min(totalClips - 1, activeIndex + windowSize);
  const indices: number[] = [];
  for (let i = start; i <= end; i++) {
    indices.push(i);
  }
  return indices;
}

/**
 * Prefetches and decodes ImageBitmaps for clips in the ~5-clip window around playhead.
 */
export async function prefetchClips(
  clips: { assetId: string; startMs: number; endMs: number }[],
  playheadMs: number,
  getStorageKey: (assetId: string) => string | undefined,
  cache: RenderCache = previewImageCache,
  windowSize = 5,
  targetWidth = 1280
): Promise<string[]> {
  const activeIdx = getActiveClipIndex(clips, playheadMs);
  const indices = getPrefetchIndices(clips.length, activeIdx, windowSize);
  const prefetchedAssets: string[] = [];

  for (const idx of indices) {
    const clip = clips[idx]!;
    if (!cache.hasBitmap(clip.assetId, targetWidth)) {
      const storageKey = getStorageKey(clip.assetId);
      if (storageKey) {
        await loadAssetBitmap(clip.assetId, storageKey, cache, targetWidth);
        prefetchedAssets.push(clip.assetId);
      }
    }
  }

  return prefetchedAssets;
}

