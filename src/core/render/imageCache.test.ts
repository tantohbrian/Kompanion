import { describe, it, expect, vi } from 'vitest';
import {
  ImageBitmapLruCache,
  getActiveClipIndex,
  getPrefetchIndices,
} from './imageCache';

describe('ImageBitmapLruCache', () => {
  const createMockBitmap = (label: string) => {
    return {
      label,
      width: 1280,
      height: 720,
      close: vi.fn(),
    } as unknown as ImageBitmap;
  };

  it('stores and retrieves bitmaps by assetId and resolution', () => {
    const cache = new ImageBitmapLruCache(3);
    const b1 = createMockBitmap('b1');
    cache.setBitmap('asset-1', 1280, b1);

    expect(cache.hasBitmap('asset-1', 1280)).toBe(true);
    expect(cache.hasBitmap('asset-1', 1920)).toBe(false);
    expect(cache.getBitmap('asset-1', 1280)).toBe(b1);
    expect(cache.size()).toBe(1);
  });

  it('evicts the least recently used item when capacity is exceeded and closes it', () => {
    const cache = new ImageBitmapLruCache(2);
    const b1 = createMockBitmap('b1');
    const b2 = createMockBitmap('b2');
    const b3 = createMockBitmap('b3');

    cache.setBitmap('asset-1', 1280, b1);
    cache.setBitmap('asset-2', 1280, b2);

    // Access asset-1 to make asset-2 the least recently used
    expect(cache.getBitmap('asset-1', 1280)).toBe(b1);

    // Insert asset-3 -> should evict asset-2
    cache.setBitmap('asset-3', 1280, b3);

    expect(cache.hasBitmap('asset-1', 1280)).toBe(true);
    expect(cache.hasBitmap('asset-2', 1280)).toBe(false);
    expect(cache.hasBitmap('asset-3', 1280)).toBe(true);
    expect(b2.close).toHaveBeenCalledTimes(1);
    expect(b1.close).not.toHaveBeenCalled();
  });

  it('closes all bitmaps on clear()', () => {
    const cache = new ImageBitmapLruCache(5);
    const b1 = createMockBitmap('b1');
    const b2 = createMockBitmap('b2');

    cache.setBitmap('a1', 1280, b1);
    cache.setBitmap('a2', 1280, b2);

    cache.clear();
    expect(cache.size()).toBe(0);
    expect(b1.close).toHaveBeenCalledTimes(1);
    expect(b2.close).toHaveBeenCalledTimes(1);
  });
});

describe('Prefetch window calculation', () => {
  const mockClips = [
    { startMs: 0, endMs: 2000 },
    { startMs: 2000, endMs: 5000 },
    { startMs: 5000, endMs: 8000 },
    { startMs: 8000, endMs: 12000 },
    { startMs: 12000, endMs: 15000 },
    { startMs: 15000, endMs: 20000 },
    { startMs: 20000, endMs: 25000 },
    { startMs: 25000, endMs: 30000 },
  ];

  it('identifies the active clip at any timestamp', () => {
    expect(getActiveClipIndex(mockClips, 0)).toBe(0);
    expect(getActiveClipIndex(mockClips, 1999)).toBe(0);
    expect(getActiveClipIndex(mockClips, 2000)).toBe(1);
    expect(getActiveClipIndex(mockClips, 7999)).toBe(2);
    expect(getActiveClipIndex(mockClips, 35000)).toBe(7); // beyond end
  });

  it('calculates ~5 clips ahead and behind window clamped to boundaries', () => {
    // At clip 0, window size 3 -> [0, 1, 2, 3]
    expect(getPrefetchIndices(mockClips.length, 0, 3)).toEqual([0, 1, 2, 3]);

    // At clip 4, window size 2 -> [2, 3, 4, 5, 6]
    expect(getPrefetchIndices(mockClips.length, 4, 2)).toEqual([2, 3, 4, 5, 6]);

    // At last clip (7), window size 3 -> [4, 5, 6, 7]
    expect(getPrefetchIndices(mockClips.length, 7, 3)).toEqual([4, 5, 6, 7]);
  });
});
