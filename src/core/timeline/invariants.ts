import { Timeline, Clip } from '../model/types';
import { ClipPositionInfo } from './types';

/**
 * Calculates startMs and endMs for all clips in a magnetic image track.
 * By definition, startMs of clip i is strictly the sum of durations of clips 0..i-1.
 */
export function calculateClipPositions(clips: readonly Clip[]): ClipPositionInfo[] {
  let runningStartMs = 0;
  return clips.map((clip, index) => {
    const startMs = runningStartMs;
    const endMs = startMs + clip.durationMs;
    runningStartMs = endMs;
    return {
      clip,
      index,
      startMs,
      endMs,
    };
  });
}

/**
 * Calculates total visual duration of the magnetic clip track in integer milliseconds.
 */
export function calculateTotalVisualDuration(clips: readonly Clip[]): number {
  return clips.reduce((sum, c) => sum + c.durationMs, 0);
}

/**
 * Asserts all core timeline invariants.
 * Throws an Error with descriptive details if any invariant is violated.
 */
export function assertTimelineInvariants(timeline: Timeline): void {
  // 1. Clips array must exist
  if (!Array.isArray(timeline.clips)) {
    throw new Error('Timeline invariant violation: clips must be an array');
  }

  // 2. Audio array must exist
  if (!Array.isArray(timeline.audio)) {
    throw new Error('Timeline invariant violation: audio must be an array');
  }

  // 3. Gain and muted bounds
  if (typeof timeline.gain !== 'number' || timeline.gain < 0 || timeline.gain > 2) {
    throw new Error(`Timeline invariant violation: gain must be between 0 and 2, got ${timeline.gain}`);
  }
  if (typeof timeline.muted !== 'boolean') {
    throw new Error('Timeline invariant violation: muted must be a boolean');
  }

  let runningMs = 0;
  const clipIds = new Set<string>();

  for (let i = 0; i < timeline.clips.length; i++) {
    const clip = timeline.clips[i]!;

    // 4. ID uniqueness
    if (!clip.id) {
      throw new Error(`Timeline invariant violation: clip at index ${i} has empty id`);
    }
    if (clipIds.has(clip.id)) {
      throw new Error(`Timeline invariant violation: duplicate clip id detected: ${clip.id}`);
    }
    clipIds.add(clip.id);

    // 5. Integer millisecond rule
    if (!Number.isInteger(clip.durationMs)) {
      throw new Error(
        `Timeline invariant violation: clip ${clip.id} duration must be an integer millisecond, got ${clip.durationMs}`
      );
    }

    // 6. Minimum positive duration
    if (clip.durationMs <= 0) {
      throw new Error(
        `Timeline invariant violation: clip ${clip.id} duration must be positive, got ${clip.durationMs}`
      );
    }

    runningMs += clip.durationMs;
  }

  // 7. Conservation of total visual duration
  const sumDuration = calculateTotalVisualDuration(timeline.clips);
  if (sumDuration !== runningMs) {
    throw new Error(
      `Timeline invariant violation: duration conservation failed: sum ${sumDuration} !== running ${runningMs}`
    );
  }

  // 8. Audio clips integer millisecond rule
  for (let j = 0; j < timeline.audio.length; j++) {
    const aud = timeline.audio[j]!;
    if (!Number.isInteger(aud.offsetMs)) {
      throw new Error(
        `Timeline invariant violation: audio clip ${aud.id} offset must be an integer millisecond, got ${aud.offsetMs}`
      );
    }
  }
}
