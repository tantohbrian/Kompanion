/**
 * Formatting and frame conversion utilities for integer milliseconds.
 * Never accumulates floating-point seconds.
 */

export function msToFrame(ms: number, fps: number): number {
  return Math.floor((ms * fps) / 1000);
}

export function frameToMs(frame: number, fps: number): number {
  return Math.round((frame * 1000) / fps);
}

/**
 * Formats integer milliseconds into MM:SS:FF (or MM:SS.ms)
 * e.g., 01:23:14
 */
export function formatTimecode(ms: number, fps = 30): string {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const remainderMs = safeMs % 1000;
  const frames = Math.floor((remainderMs * fps) / 1000);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const ff = String(frames).padStart(2, '0');

  return `${mm}:${ss}:${ff}`;
}

/**
 * Formats integer milliseconds into human-readable seconds: "3.5s" or "3500ms"
 */
export function formatDurationSec(ms: number): string {
  const sec = (ms / 1000).toFixed(2);
  return `${sec}s`;
}
