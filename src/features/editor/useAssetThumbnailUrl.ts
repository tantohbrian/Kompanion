import { useState, useEffect } from 'react';
import { Asset } from '../../core/model/types';
import { getMediaFile } from '../../core/storage/opfs';

/**
 * Resolves a displayable thumbnail URL for an image asset.
 * Prioritizes pre-generated thumbnailDataUrl; falls back to loading binary blob from OPFS.
 */
export function useAssetThumbnailUrl(asset: Asset | undefined): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const directUrl = (asset?.meta as { thumbnailDataUrl?: string })?.thumbnailDataUrl;

  useEffect(() => {
    if (directUrl) {
      setObjectUrl(directUrl);
      return;
    }

    if (!asset || asset.kind !== 'image' || !asset.storageKey) {
      setObjectUrl(null);
      return;
    }

    let isMounted = true;
    let createdUrl: string | null = null;

    void getMediaFile(asset.storageKey).then((blob) => {
      if (!isMounted || !blob) return;
      createdUrl = URL.createObjectURL(blob);
      setObjectUrl(createdUrl);
    });

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [asset, directUrl]);

  return directUrl || objectUrl;
}
