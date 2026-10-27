/**
 * Browser capability checks for Kompanion.
 * PRD Section 8: Feature-detect VideoEncoder, OffscreenCanvas and OPFS at startup.
 */

export interface CompatibilityReport {
  isCompatible: boolean;
  videoEncoder: boolean;
  offscreenCanvas: boolean;
  opfs: boolean;
  webAudio: boolean;
  missingFeatures: string[];
}

export function checkBrowserCompatibility(): CompatibilityReport {
  const hasWindow = typeof window !== 'undefined';
  const hasNav = typeof navigator !== 'undefined';

  const videoEncoder = hasWindow && 'VideoEncoder' in window;
  const offscreenCanvas = hasWindow && 'OffscreenCanvas' in window;
  const opfs =
    hasNav &&
    Boolean(navigator.storage) &&
    typeof navigator.storage.getDirectory === 'function';
  const webAudio =
    hasWindow &&
    ('AudioContext' in window || 'webkitAudioContext' in window);

  const missingFeatures: string[] = [];

  if (!videoEncoder) {
    missingFeatures.push('WebCodecs VideoEncoder (Required for hardware-accelerated MP4 export)');
  }
  if (!offscreenCanvas) {
    missingFeatures.push('OffscreenCanvas (Required for headless export rendering)');
  }
  if (!webAudio) {
    missingFeatures.push('Web Audio API (Required for audio playback and waveform visualization)');
  }

  // OPFS is recommended but has IndexedDB fallback
  const isCompatible = videoEncoder && offscreenCanvas && webAudio;

  return {
    isCompatible,
    videoEncoder,
    offscreenCanvas,
    opfs,
    webAudio,
    missingFeatures,
  };
}
