import { Project, ProjectDefaults, AnimationRef, TransitionRef, Asset } from '../model/types';
import { ResolvedClip, ResolvedScene } from './types';

/**
 * Resolves project timeline into a concrete ResolvedScene ready for rendering.
 * Pure function: zero DOM or React dependencies.
 */
export function resolveTimeline(
  project: Project,
  workspaceDefaults?: ProjectDefaults
): ResolvedScene {
  const defaults = workspaceDefaults || project.settings;
  const { canvas, height, fps } = project.settings;

  const width =
    canvas === '16:9'
      ? Math.round((height * 16) / 9)
      : Math.round((height * 9) / 16);

  const assetMap = new Map<string, Asset>();
  if (Array.isArray(project.assets)) {
    for (const asset of project.assets) {
      assetMap.set(asset.id, asset);
    }
  }

  let runningStartMs = 0;
  const resolvedClips: ResolvedClip[] = [];

  for (let i = 0; i < project.timeline.clips.length; i++) {
    const clip = project.timeline.clips[i]!;
    const startMs = runningStartMs;
    const endMs = startMs + clip.durationMs;
    runningStartMs = endMs;

    // Resolve animation inheritance
    const resolvedAnimation: AnimationRef =
      clip.animation === 'inherit'
        ? { ...defaults.animation }
        : { ...clip.animation };

    // Resolve transitionIn inheritance
    let rawTransition: TransitionRef =
      clip.transitionIn === 'inherit'
        ? { ...defaults.transition }
        : { ...clip.transitionIn };

    // The first clip never transitions in from a previous clip
    if (i === 0) {
      rawTransition = { id: 'cut', durationMs: 0 };
    }

    // Clamp transition duration to at most 50% of clip duration
    const maxTransitionDurationMs = Math.floor(clip.durationMs * 0.5);
    const clampedTransitionDurationMs = Math.max(
      0,
      Math.min(rawTransition.durationMs, maxTransitionDurationMs)
    );

    const resolvedTransitionIn: TransitionRef = {
      id: rawTransition.id,
      durationMs: clampedTransitionDurationMs,
    };

    resolvedClips.push({
      clip,
      index: i,
      startMs,
      endMs,
      durationMs: clip.durationMs,
      resolvedAnimation,
      resolvedTransitionIn,
    });
  }

  // Calculate audio end
  let maxAudioEndMs = 0;
  for (const aud of project.timeline.audio) {
    const asset = assetMap.get(aud.assetId);
    const audioDur = asset?.meta.durationMs || 0;
    const end = aud.offsetMs + audioDur;
    if (end > maxAudioEndMs) maxAudioEndMs = end;
  }

  const durationMs = Math.max(runningStartMs, maxAudioEndMs);

  return {
    canvas,
    width,
    height,
    fps,
    durationMs,
    clips: resolvedClips,
    audio: project.timeline.audio,
    gain: project.timeline.gain,
    muted: project.timeline.muted,
    assets: assetMap,
  };
}
