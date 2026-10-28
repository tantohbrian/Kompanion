import {
  WhisperWord,
  RawSegmentInput,
  AlignedSegmentDiff,
  AlignmentResult,
  SyncDiagnostic,
} from './types';

/**
 * Normalizes text for robust token matching.
 */
export function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^\w]/g, '');
}

/**
 * Checks if the provided segments contain any spoken narration text.
 */
export function checkScriptHasNarration(segments: RawSegmentInput[]): boolean {
  return segments.some(
    (s) => s.narrationText !== undefined && s.narrationText.trim().length > 0
  );
}

/**
 * Performs fuzzy sequence matching to align script segments against Whisper word timestamps.
 * Preserves magnetic timeline contiguity (zero gaps, monotonic boundaries).
 */
export function alignSegmentsToWords(
  segments: RawSegmentInput[],
  whisperWords: WhisperWord[],
  options: {
    minSegmentDurationMs?: number;
    totalDurationMs?: number;
  } = {}
): AlignmentResult {
  const minDurationMs = options.minSegmentDurationMs ?? 200;

  // 1. Pre-flight check: must contain narration text
  if (!checkScriptHasNarration(segments)) {
    return {
      hasNarration: false,
      diffs: [],
      diagnostics: [
        {
          code: 'NO_NARRATION_TEXT',
          severity: 'error',
          message:
            'Script contains no spoken narration text. Smart Sync requires narration lines to align image cuts to spoken phrases.',
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

  // 2. Normalize recognized words
  const normalizedWords = whisperWords.map((w, idx) => ({
    token: normalizeToken(w.word),
    startMs: Math.round(w.startSec * 1000),
    endMs: Math.round(w.endSec * 1000),
    idx,
  }));

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'as', 'is', 'it', 'its', 'so', 'be', 'do', 'no', 'up',
]);

  // 3. Match each segment's narration tokens against normalized transcript
  interface RawSpan {
    firstWordIdx: number;
    lastWordIdx: number;
    spokenStartMs: number;
    spokenEndMs: number;
    confidence: number;
  }

  const spans: (RawSpan | null)[] = [];
  let currentWordSearchIdx = 0;

  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const seg = segments[sIdx]!;
    const narration = seg.narrationText?.trim() || '';
    const targetTokens = narration
      .split(/\s+/)
      .map(normalizeToken)
      .filter((t) => t.length > 0);

    if (targetTokens.length === 0) {
      spans.push(null);
      continue;
    }

    // Monotonic search in remaining words
    let bestStart = -1;
    let bestEnd = -1;
    let matchCount = 0;
    let bestScore = 0;
    const searchWindow = 80; // search ahead window

    const maxSearch = Math.min(normalizedWords.length, currentWordSearchIdx + searchWindow);
    const startCandidates = targetTokens.slice(0, 3);

    for (let i = currentWordSearchIdx; i < maxSearch; i++) {
      const targetStartIndex = startCandidates.indexOf(normalizedWords[i]!.token);
      if (targetStartIndex !== -1) {
        // Candidate start found
        let matches = 1;
        let lastMatchIdx = i;

        let targetIdx = targetStartIndex + 1;
        for (
          let j = i + 1;
          j < Math.min(normalizedWords.length, i + targetTokens.length + 15);
          j++
        ) {
          if (
            targetIdx < targetTokens.length &&
            normalizedWords[j]!.token === targetTokens[targetIdx]
          ) {
            matches++;
            lastMatchIdx = j;
            targetIdx++;
          } else if (
            targetIdx + 1 < targetTokens.length &&
            normalizedWords[j]!.token === targetTokens[targetIdx + 1]
          ) {
            // Tolerates a skipped word in Whisper
            matches++;
            lastMatchIdx = j;
            targetIdx += 2;
          }
        }

        // Proximity tie-breaker: slight penalty for distance from currentWordSearchIdx
        const proximityScore = matches - (i - currentWordSearchIdx) * 0.005;
        const minMatchesNeeded = targetTokens.length === 1 ? 1 : 2;
        const isSingleStopword =
          targetTokens.length === 1 &&
          (STOPWORDS.has(targetTokens[0]!) || targetTokens[0]!.length <= 2);

        if (!isSingleStopword && proximityScore > bestScore && matches >= minMatchesNeeded) {
          bestScore = proximityScore;
          matchCount = matches;
          const startOffset = Math.min(targetStartIndex + 1, i - currentWordSearchIdx);
          bestStart = targetStartIndex === 0 ? i : Math.max(currentWordSearchIdx, i - startOffset);
          bestEnd = lastMatchIdx;
        }
      }
    }

    // Fallback: search for first non-stopword token if exact phrase not found
    if (bestStart === -1 && currentWordSearchIdx < normalizedWords.length) {
      for (let i = currentWordSearchIdx; i < maxSearch; i++) {
        const token = normalizedWords[i]!.token;
        if (token.length > 2 && !STOPWORDS.has(token) && targetTokens.includes(token)) {
          bestStart = i;
          bestEnd = i;
          matchCount = 1;
          break;
        }
      }
    }

    if (bestStart !== -1 && bestEnd !== -1) {
      const confidence = Math.min(1.0, matchCount / targetTokens.length);
      spans.push({
        firstWordIdx: bestStart,
        lastWordIdx: bestEnd,
        spokenStartMs: normalizedWords[bestStart]!.startMs,
        spokenEndMs: normalizedWords[bestEnd]!.endMs,
        confidence,
      });
      currentWordSearchIdx = bestEnd + 1;
    } else {
      spans.push(null);
    }
  }

  // 4. Derive contiguous boundaries (magnetic track invariant)
  // First boundary is always 0
  const cutPoints: number[] = [0];

  for (let i = 0; i < segments.length - 1; i++) {
    const currentSpan = spans[i];
    const nextSpan = spans[i + 1];

    if (currentSpan && nextSpan) {
      // Transition midpoint between current spoken end and next spoken start
      const pauseMidpoint = Math.round((currentSpan.spokenEndMs + nextSpan.spokenStartMs) / 2);
      cutPoints.push(Math.max(cutPoints[i]! + minDurationMs, pauseMidpoint));
    } else if (currentSpan && !nextSpan) {
      cutPoints.push(Math.max(cutPoints[i]! + minDurationMs, currentSpan.spokenEndMs + 200));
    } else if (!currentSpan && nextSpan) {
      cutPoints.push(Math.max(cutPoints[i]! + minDurationMs, nextSpan.spokenStartMs - 100));
    } else {
      // Fallback: maintain relative duration
      const origDur = segments[i]!.endMs - segments[i]!.startMs;
      cutPoints.push(cutPoints[i]! + Math.max(minDurationMs, origDur));
    }
  }

  // Final cut point
  const lastSeg = segments[segments.length - 1]!;
  const lastSpan = spans[spans.length - 1];
  let finalCut = cutPoints[cutPoints.length - 1]! + minDurationMs;

  if (options.totalDurationMs && options.totalDurationMs > cutPoints[cutPoints.length - 1]!) {
    finalCut = options.totalDurationMs;
  } else if (lastSpan) {
    finalCut = Math.max(finalCut, lastSpan.spokenEndMs + 300);
  } else {
    finalCut = Math.max(finalCut, cutPoints[cutPoints.length - 1]! + (lastSeg.endMs - lastSeg.startMs));
  }
  cutPoints.push(finalCut);

  // 5. Build AlignedSegmentDiffs
  const diffs: AlignedSegmentDiff[] = [];
  let totalDriftMs = 0;

  for (let i = 0; i < segments.length; i++) {
    const orig = segments[i]!;
    const pStart = cutPoints[i]!;
    const pEnd = cutPoints[i + 1]!;
    const pDur = pEnd - pStart;
    const origDur = orig.endMs - orig.startMs;
    const startShift = pStart - orig.startMs;
    const durationDelta = pDur - origDur;
    const delta = startShift !== 0 ? startShift : durationDelta;
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

  return {
    hasNarration: true,
    diffs,
    diagnostics,
    totalDriftMs,
  };
}
