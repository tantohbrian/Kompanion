---
name: timeline-engine
description: Core timeline data structures, clip operations, magnetic track semantics, history tracking, and invariant verification for Kompanion. Use when modifying or creating timeline operations, clip manipulation, undo/redo history, or timeline testing.
---

# Timeline Engine

Guidelines for working with Kompanion's magnetic timeline, clip operations, undo/redo history, and invariant verification.

## 1. The Integer Millisecond Rule

- **Rule**: All timeline coordinates, durations, offsets, and playhead positions are stored as integer milliseconds (`number`, rounded to integers).
- **Zero float accumulation**: Never accumulate floating-point seconds. Cumulative rounding errors cause visual drift against audio over long timelines.
- Frame calculations must use explicit conversions:
  ```ts
  const frameToMs = (frame: number, fps: number): number => Math.round((frame * 1000) / fps);
  const msToFrame = (ms: number, fps: number): number => Math.floor((ms * fps) / 1000);
  ```

## 2. Data Structures & Magnetic Track Semantics

```ts
interface Timeline {
  clips: Clip[];
  audio: AudioClip[];
  gain: number;
  muted: boolean;
}

interface Clip {
  id: string; // uuid v7
  assetId: string;
  durationMs: number;
  fit: 'cover' | 'contain';
  animation: AnimationRef | 'inherit';
  transitionIn: TransitionRef | 'inherit';
  sourceSegment?: number;
}
```

- **Magnetic track**: The image track is contiguous with zero gaps.
- **Derived start times**: `Clip` does not store `startMs`. The start time of clip `i` is strictly `sum(clips[0..i-1].durationMs)`.
- Total visual duration is `sum(clip.durationMs)`. Total project length is `Math.max(visualDuration, audioEndMs)`.

## 3. Pure Operation Pattern

All timeline mutations are pure functions returning a new `Timeline`:
```ts
type TimelineOperation<Args, Result = Timeline> = (timeline: Timeline, args: Args) => Result;
```

Key operations:
- `reorderClip(timeline, { clipId, targetIndex })`: Moves a clip, shifting adjacent clips.
- `trimClip(timeline, { clipId, deltaDurationMs, edge: 'start' | 'end' })`: Resizes clip and ripples following clips. Clamped to minimum duration (e.g., 1 frame).
- `splitClip(timeline, { clipId, splitMs })`: Splits a clip into two at the given playhead time.
- `deleteClip(timeline, { clipId })`: Removes clip and ripples subsequent clips backward.
- `duplicateClip(timeline, { clipId })`: Clones clip immediately after itself.
- `replaceAsset(timeline, { clipId, newAssetId })`: Replaces media reference without altering duration.
- `setClipDuration(timeline, { clipId, durationMs })`: Sets explicit duration and ripples.

## 4. History & Drag Grouping

- Managed via Zustand + `zundo` with a maximum cap of 200 entries.
- Transient UI state (playhead scrub, hover states, marquee selection) must be excluded from history via `partialize`.
- **Drag operations**: Interactive dragging (resizing or reordering) produces many intermediate states. History tracking must pause during mouse-down/drag and record exactly one command on mouse-up.

## 5. Invariants & Testing Policy

Every timeline operation must maintain these three invariants:
1. **No gaps or overlaps**: Image track remains contiguous from `0` to `totalVisualDuration`.
2. **Conservation of duration**: `totalVisualDuration === sum(clip.durationMs)`.
3. **Reversibility**: For any valid operation `op`, `undo(op(timeline)) === timeline`.

Test using randomized invariant testing (fuzzing) with sequences of 50-100 random edits (split, trim, delete, reorder) verifying that invariants hold after each step.
