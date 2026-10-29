/**
 * Audio-to-Script Alignment Engine.
 * Matches spoken Whisper word timestamps to script segments using
 * text/number normalization and monotonic dynamic alignment.
 * Pure TypeScript, zero DOM/React dependencies.
 */

import {
  WhisperWord,
  RawSegmentInput,
  AlignedSegmentDiff,
  AlignmentResult,
  SyncDiagnostic,
} from './types';
import { normalizeToken } from './textNormalizer';
import { interpolateCutPoints } from './alignerInterpolation';
import { alignGlobalDp, DpSpan } from './globalDpAligner';

export { normalizeToken };

export function checkScriptHasNarration(segments: RawSegmentInput[]): boolean {
  return segments.some((s) => s.narrationText !== undefined && s.narrationText.trim().length > 0);
}

export function alignSegmentsToWords(
  segments: RawSegmentInput[],
  whisperWords: WhisperWord[],
  options: { minSegmentDurationMs?: number; totalDurationMs?: number } = {}
): AlignmentResult {
  const minDur = options.minSegmentDurationMs ?? 200;

  if (!checkScriptHasNarration(segments)) {
    return {
      hasNarration: false,
      diffs: [],
      diagnostics: [
        {
          code: 'NO_NARRATION_TEXT',
          severity: 'error',
          message: 'Script contains no spoken narration text. Smart Sync requires narration lines.',
        },
      ],
      totalDriftMs: 0,
    };
  }

  const diagnostics: SyncDiagnostic[] = [];
  if (whisperWords.length === 0) {
    diagnostics.push({
      code: 'LOW_CONFIDENCE',
      severity: 'warning',
      message: 'No word timestamps detected in audio. Retaining original segment timings.',
    });
    return {
      hasNarration: true,
      diffs: segments.map((s) => ({
        index: s.index,
        clipId: s.clipId,
        narrationText: s.narrationText || '',
        promptText: s.promptText,
        originalStartMs: s.startMs,
        originalEndMs: s.endMs,
        originalDurationMs: s.endMs - s.startMs,
        proposedStartMs: s.startMs,
        proposedEndMs: s.endMs,
        proposedDurationMs: s.endMs - s.startMs,
        deltaMs: 0,
        confidence: 0,
        status: 'accepted',
      })),
      diagnostics,
      totalDriftMs: 0,
    };
  }

  const normalizedWords = whisperWords.map((w, idx) => ({
    token: normalizeToken(w.word),
    startMs: Math.round(w.startSec * 1000),
    endMs: Math.round(w.endSec * 1000),
    idx,
  }));

  // Global dynamic programming sequence alignment
  const spans: (DpSpan | null)[] = alignGlobalDp(segments, normalizedWords);

  // 4. Derive contiguous boundaries with linear interpolation for null spans
  const totalAudioDur =
    options.totalDurationMs ||
    normalizedWords[normalizedWords.length - 1]?.endMs ||
    segments[segments.length - 1]?.endMs ||
    5000;

  const cutPoints: number[] = new Array(segments.length + 1).fill(-1);
  cutPoints[0] = 0;
  cutPoints[segments.length] = Math.max(totalAudioDur, minDur * segments.length);

  for (let i = 0; i < segments.length - 1; i++) {
    const cur = spans[i];
    const nxt = spans[i + 1];
    if (cur && nxt) {
      cutPoints[i + 1] = Math.round((cur.spokenEndMs + nxt.spokenStartMs) / 2);
    } else if (cur && !nxt) {
      cutPoints[i + 1] = cur.spokenEndMs + 100;
    } else if (!cur && nxt) {
      cutPoints[i + 1] = Math.max(0, nxt.spokenStartMs - 100);
    }
  }

  // Linearly interpolate any unset boundaries (-1)
  interpolateCutPoints(cutPoints, segments, minDur);

  // 5. Build AlignedSegmentDiffs
  const diffs: AlignedSegmentDiff[] = [];
  let totalDriftMs = 0;

  for (let i = 0; i < segments.length; i++) {
    const orig = segments[i]!;
    const pStart = cutPoints[i]!;
    const pEnd = cutPoints[i + 1]!;
    const pDur = pEnd - pStart;
    const origDur = orig.endMs - orig.startMs;
    const delta = pStart !== orig.startMs ? pStart - orig.startMs : pDur - origDur;
    totalDriftMs += Math.abs(delta);

    const span = spans[i];
    const confidence = span ? Math.round(span.confidence * 100) / 100 : 0.5;

    diffs.push({
      index: orig.index,
      clipId: orig.clipId,
      narrationText: orig.narrationText || '',
      promptText: orig.promptText,
      originalStartMs: orig.startMs,
      originalEndMs: orig.endMs,
      originalDurationMs: origDur,
      proposedStartMs: pStart,
      proposedEndMs: pEnd,
      proposedDurationMs: pDur,
      deltaMs: delta,
      confidence,
      status: 'accepted',
    });
  }

  return { hasNarration: true, diffs, diagnostics, totalDriftMs };
}
