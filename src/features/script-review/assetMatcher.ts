/**
 * Asset matching utilities for Script Review.
 * Sorts image assets by order and filename, and resolves deterministic segment-to-image matches.
 */

import { naturalCompare } from '../../core/utils/naturalSort';

export interface ReviewAsset {
  id: string;
  name: string;
  kind: 'image' | 'audio';
  order?: number;
  thumbnailUrl?: string;
}

export function sortImageAssets(assets: ReviewAsset[]): ReviewAsset[] {
  return assets
    .filter((a) => a.kind === 'image')
    .sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return naturalCompare(a.name, b.name);
    });
}

export function findAssetForSegment(
  sortedImageAssets: ReviewAsset[],
  segIndex: number,
  fallbackIdx: number
): ReviewAsset | undefined {
  // 1. Explicit filename number matching (e.g., 1.jpg -> Beat 1, 02.png -> Beat 2)
  const matched = sortedImageAssets.find((a) => {
    const m = a.name.match(/\b0*(\d+)\b/);
    return m && parseInt(m[1]!, 10) === segIndex;
  });
  if (matched) return matched;

  // 2. Sequential fallback by natural sorted order
  return sortedImageAssets[fallbackIdx] || sortedImageAssets[0];
}
