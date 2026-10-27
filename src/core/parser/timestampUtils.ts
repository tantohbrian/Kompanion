/**
 * Timestamp parsing and formatting utilities for integer milliseconds.
 * Pure TypeScript, zero DOM/React dependencies.
 */

const SEPARATOR_REGEX = /\s*(?:-->|->|–|—|→|\bto\b|-)\s*/i;

/**
 * Parses a single timestamp string (e.g., "0:05", "00:05.500", "01:23:45,123", "5s") to integer milliseconds.
 * Returns null if string is not a valid timestamp.
 */
export function parseSingleTimestampToMs(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Duration in seconds shorthand: e.g. "5s", "12.5s"
  const secMatch = /^([0-9]+(?:\.[0-9]+)?)\s*s$/i.exec(trimmed);
  if (secMatch && secMatch[1]) {
    const sec = parseFloat(secMatch[1]);
    return Number.isFinite(sec) ? Math.max(0, Math.round(sec * 1000)) : null;
  }

  // 2. Standard timestamp format: HH:MM:SS,mmm or MM:SS,mmm or MM:SS or H:MM:SS
  // Supports comma or dot for millisecond separator
  const timeRegex = /^(?:(?:(\d{1,2}):)?(\d{1,2}):)?(\d{1,2})(?:[.,](\d{1,3}))?$/;
  const match = timeRegex.exec(trimmed);
  if (!match) return null;

  const part1 = match[1];
  const part2 = match[2];
  const part3 = match[3];
  const frac = match[4];

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (part1 !== undefined && part2 !== undefined && part3 !== undefined) {
    // HH:MM:SS
    hours = parseInt(part1, 10);
    minutes = parseInt(part2, 10);
    seconds = parseInt(part3, 10);
  } else if (part2 !== undefined && part3 !== undefined) {
    // MM:SS
    minutes = parseInt(part2, 10);
    seconds = parseInt(part3, 10);
  } else if (part3 !== undefined) {
    // SS
    seconds = parseInt(part3, 10);
  }

  let ms = 0;
  if (frac) {
    // Pad fraction to 3 digits (e.g. "5" -> 500ms, "12" -> 120ms)
    const padded = (frac + '00').slice(0, 3);
    ms = parseInt(padded, 10);
  }

  const totalMs = hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
  return totalMs >= 0 ? totalMs : null;
}

/**
 * Parses a timestamp range string (e.g. "0:00–0:05", "00:00 - 00:05", "0:33 to 0:37", "00:00:05,000 --> 00:00:09,000")
 * Returns { startMs, endMs } or null if invalid.
 */
export function parseTimestampRangeToMs(raw: string): { startMs: number; endMs: number } | null {
  const parts = raw.trim().split(SEPARATOR_REGEX);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const startMs = parseSingleTimestampToMs(parts[0]);
  const endMs = parseSingleTimestampToMs(parts[1]);

  if (startMs === null || endMs === null) return null;
  return { startMs, endMs };
}

/**
 * Formats integer milliseconds into a clean timecode string.
 * Example: 65000 -> "01:05", 3665000 -> "01:01:05"
 */
export function formatMsToTimecode(ms: number, forceHours = false): string {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0 || forceHours) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
