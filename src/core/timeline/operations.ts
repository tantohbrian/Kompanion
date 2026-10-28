import { Timeline, Clip } from '../model/types';
import {
  ReorderClipArgs,
  TrimClipArgs,
  SplitClipArgs,
  DeleteClipArgs,
  DuplicateClipArgs,
  ReplaceAssetArgs,
  SetClipDurationArgs,
  UpdateClipArgs,
  ApplyToAllClipsArgs,
  UpdateAudioArgs,
} from './types';
import { calculateClipPositions, assertTimelineInvariants } from './invariants';

const DEFAULT_MIN_DURATION_MS = 100; // ~3 frames at 30fps

/**
 * Reorders a clip within the magnetic track.
 */
export function reorderClip(timeline: Timeline, args: ReorderClipArgs): Timeline {
  const { clipId, targetIndex } = args;
  const fromIdx = timeline.clips.findIndex((c) => c.id === clipId);
  if (fromIdx === -1) return timeline;

  const clampedTarget = Math.max(0, Math.min(timeline.clips.length - 1, targetIndex));
  if (fromIdx === clampedTarget) return timeline;

  const newClips = [...timeline.clips];
  const [movedClip] = newClips.splice(fromIdx, 1);
  if (!movedClip) return timeline;

  newClips.splice(clampedTarget, 0, movedClip);
  const updated: Timeline = { ...timeline, clips: newClips };
  assertTimelineInvariants(updated);
  return updated;
}

/**
 * Trims a clip's start or end edge, rippling all subsequent clips automatically.
 */
export function trimClip(timeline: Timeline, args: TrimClipArgs): Timeline {
  const { clipId, deltaDurationMs, minDurationMs = DEFAULT_MIN_DURATION_MS } = args;
  const clipIdx = timeline.clips.findIndex((c) => c.id === clipId);
  if (clipIdx === -1) return timeline;

  const targetClip = timeline.clips[clipIdx]!;
  const integerDelta = Math.round(deltaDurationMs);
  const newDuration = Math.max(minDurationMs, targetClip.durationMs + integerDelta);

  if (newDuration === targetClip.durationMs) return timeline;

  const newClips = [...timeline.clips];
  newClips[clipIdx] = {
    ...targetClip,
    durationMs: newDuration,
  };

  const updated: Timeline = { ...timeline, clips: newClips };
  assertTimelineInvariants(updated);
  return updated;
}

/**
 * Splits a clip at playhead time into two adjacent clips in the magnetic track.
 */
export function splitClip(timeline: Timeline, args: SplitClipArgs): Timeline {
  const {
    clipId,
    splitMs,
    relativeTo = 'timeline',
    newClipId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    minDurationMs = DEFAULT_MIN_DURATION_MS,
  } = args;

  const positions = calculateClipPositions(timeline.clips);
  const targetPos = positions.find((p) => p.clip.id === clipId);
  if (!targetPos) return timeline;

  const { clip, index, startMs } = targetPos;
  const offsetWithinClip = relativeTo === 'timeline' ? Math.round(splitMs - startMs) : Math.round(splitMs);

  // Both sides must meet minimum duration requirement
  if (offsetWithinClip < minDurationMs || offsetWithinClip > clip.durationMs - minDurationMs) {
    return timeline;
  }

  const firstDuration = offsetWithinClip;
  const secondDuration = clip.durationMs - offsetWithinClip;

  const firstClip: Clip = {
    ...clip,
    durationMs: firstDuration,
  };

  const secondClip: Clip = {
    ...clip,
    id: newClipId,
    durationMs: secondDuration,
    transitionIn: { id: 'cut', durationMs: 0 }, // Cut by default at split point
  };

  const newClips = [...timeline.clips];
  newClips.splice(index, 1, firstClip, secondClip);

  const updated: Timeline = { ...timeline, clips: newClips };
  assertTimelineInvariants(updated);
  return updated;
}

/**
 * Removes a clip from the magnetic track; rippling all subsequent clips backward.
 */
export function deleteClip(timeline: Timeline, args: DeleteClipArgs): Timeline {
  const { clipId } = args;
  const newClips = timeline.clips.filter((c) => c.id !== clipId);
  if (newClips.length === timeline.clips.length) return timeline;

  const updated: Timeline = { ...timeline, clips: newClips };
  assertTimelineInvariants(updated);
  return updated;
}

/**
 * Duplicates a clip and inserts the clone immediately after itself.
 */
export function duplicateClip(timeline: Timeline, args: DuplicateClipArgs): Timeline {
  const {
    clipId,
    newClipId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  } = args;

  const idx = timeline.clips.findIndex((c) => c.id === clipId);
  if (idx === -1) return timeline;

  const original = timeline.clips[idx]!;
  const clone: Clip = {
    ...original,
    id: newClipId,
  };

  const newClips = [...timeline.clips];
  newClips.splice(idx + 1, 0, clone);

  const updated: Timeline = { ...timeline, clips: newClips };
  assertTimelineInvariants(updated);
  return updated;
}

/**
 * Replaces the asset reference of an existing clip without changing its duration.
 */
export function replaceAsset(timeline: Timeline, args: ReplaceAssetArgs): Timeline {
  const { clipId, newAssetId } = args;
  const idx = timeline.clips.findIndex((c) => c.id === clipId);
  if (idx === -1) return timeline;

  const newClips = [...timeline.clips];
  newClips[idx] = {
    ...newClips[idx]!,
    assetId: newAssetId,
  };

  const updated: Timeline = { ...timeline, clips: newClips };
  assertTimelineInvariants(updated);
  return updated;
}

/**
 * Sets an explicit integer duration for a clip, rippling following clips.
 */
export function setClipDuration(timeline: Timeline, args: SetClipDurationArgs): Timeline {
  const { clipId, durationMs, minDurationMs = DEFAULT_MIN_DURATION_MS } = args;
  const idx = timeline.clips.findIndex((c) => c.id === clipId);
  if (idx === -1) return timeline;

  const integerDuration = Math.max(minDurationMs, Math.round(durationMs));
  const newClips = [...timeline.clips];
  newClips[idx] = {
    ...newClips[idx]!,
    durationMs: integerDuration,
  };

  const updated: Timeline = { ...timeline, clips: newClips };
  assertTimelineInvariants(updated);
  return updated;
}

/**
 * Updates properties (animation, transition, fit) on a specific clip.
 */
export function updateClip(timeline: Timeline, args: UpdateClipArgs): Timeline {
  const { clipId, updates } = args;
  const idx = timeline.clips.findIndex((c) => c.id === clipId);
  if (idx === -1) return timeline;

  const newClips = [...timeline.clips];
  newClips[idx] = {
    ...newClips[idx]!,
    ...updates,
  };

  const updated: Timeline = { ...timeline, clips: newClips };
  assertTimelineInvariants(updated);
  return updated;
}

/**
 * Applies visual properties (animation, transition, fit) across all clips in the timeline.
 */
export function applyToAllClips(timeline: Timeline, args: ApplyToAllClipsArgs): Timeline {
  const { updates } = args;
  const newClips = timeline.clips.map((c) => ({
    ...c,
    ...updates,
  }));

  const updated: Timeline = { ...timeline, clips: newClips };
  assertTimelineInvariants(updated);
  return updated;
}

/**
 * Updates timeline audio parameters (gain, muted, or clip list).
 */
export function updateAudio(timeline: Timeline, args: UpdateAudioArgs): Timeline {
  const updated: Timeline = {
    ...timeline,
    gain: args.gain !== undefined ? Math.max(0, Math.min(2, args.gain)) : timeline.gain,
    muted: args.muted !== undefined ? args.muted : timeline.muted,
    audio: args.audio !== undefined ? args.audio : timeline.audio,
  };
  assertTimelineInvariants(updated);
  return updated;
}

/**
 * Updates multiple clip durations simultaneously while maintaining magnetic invariants.
 */
export function applyClipDurations(
  timeline: Timeline,
  durations: { clipId: string; durationMs: number }[]
): Timeline {
  const durationMap = new Map(durations.map((d) => [d.clipId, d.durationMs]));
  const newClips = timeline.clips.map((clip) => {
    const newDur = durationMap.get(clip.id);
    if (newDur !== undefined && newDur > 0) {
      return { ...clip, durationMs: Math.round(newDur) };
    }
    return clip;
  });
  const updated: Timeline = { ...timeline, clips: newClips };
  assertTimelineInvariants(updated);
  return updated;
}

