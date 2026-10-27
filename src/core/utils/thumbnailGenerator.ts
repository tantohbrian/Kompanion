/**
 * Incremental downscaled thumbnail generator for media ingest.
 * Prevents memory spikes when importing dozens of high-res images.
 */

export interface ThumbnailResult {
  width: number;
  height: number;
  thumbnailUrl: string;
}

/**
 * Creates a downscaled thumbnail object URL (max 320px) from an image file/blob.
 */
export async function createDownscaledThumbnail(
  blob: Blob,
  maxWidth = 320,
  maxHeight = 180
): Promise<ThumbnailResult> {
  // If window or document is unavailable (e.g. Node tests), return placeholder
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      width: maxWidth,
      height: maxHeight,
      thumbnailUrl: '',
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const origUrl = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(origUrl);
      const originalWidth = img.naturalWidth || maxWidth;
      const originalHeight = img.naturalHeight || maxHeight;

      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      if (targetWidth > maxWidth) {
        targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
        targetWidth = maxWidth;
      }
      if (targetHeight > maxHeight) {
        targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
        targetHeight = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, targetWidth);
      canvas.height = Math.max(1, targetHeight);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          width: originalWidth,
          height: originalHeight,
          thumbnailUrl: origUrl,
        });
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (thumbBlob) => {
          if (thumbBlob) {
            resolve({
              width: originalWidth,
              height: originalHeight,
              thumbnailUrl: URL.createObjectURL(thumbBlob),
            });
          } else {
            resolve({
              width: originalWidth,
              height: originalHeight,
              thumbnailUrl: canvas.toDataURL('image/jpeg', 0.8),
            });
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(origUrl);
      resolve({
        width: maxWidth,
        height: maxHeight,
        thumbnailUrl: '',
      });
    };

    img.src = origUrl;
  });
}
