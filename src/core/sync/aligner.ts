import {
  WhisperWord,
  RawSegmentInput,
  AlignedSegmentDiff,
  AlignmentResult,
  SyncDiagnostic,
} from './types';

export function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^\w]/g, '');
}

export function checkScriptHasNarration(segments: RawSegmentInput[]): boolean {
  return segments.some((s) => s.narrationText !== undefined && s.narrationText.trim().length > 0);
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'as', 'is', 'it', 'its', 'so', 'be', 'do', 'no', 'up',
]);

interface RawSpan {
  firstWordIdx: number;
  lastWordIdx: number;
  spokenStartMs: number;
  spokenEndMs: number;
  confidence: number;
}

function findBestSpan(
  words: { token: string; startMs: number; endMs: number }[],
  targetTokens: string[],
  startIdx: number,
  endIdx: number,
  minOverlap = 0.3
): { bestStart: number; bestEnd: number; matchCount: number } | null {
  const startCandidates = targetTokens.slice(0, 5);
  let bestStart = -1;
  let bestEnd = -1;
  let maxScore = 0;
  let maxMatches = 0;

  for (let i = startIdx; i < endIdx; i++) {
    const targetStartIndex = startCandidates.indexOf(words[i]!.token);
    if (targetStartIndex !== -1) {
      let matches = 1;
      let lastMatchIdx = i;
      let targetIdx = targetStartIndex + 1;
      const scanLimit = Math.min(words.length, i + targetTokens.length + 20);

      for (let j = i + 1; j < scanLimit; j++) {
        if (targetIdx < targetTokens.length && words[j]!.token === targetTokens[targetIdx]) {
          matches++;
          lastMatchIdx = j;
          targetIdx++;
        } else if (targetIdx + 1 < targetTokens.length && words[j]!.token === targetTokens[targetIdx + 1]) {
          matches++;
          lastMatchIdx = j;
          targetIdx += 2;
        }
      }

      const score = (matches / targetTokens.length) - (i - startIdx) * 0.001;
      const minNeeded = targetTokens.length <= 2 ? 1 : 2;
      const isSingleStopword = targetTokens.length === 1 && STOPWORDS.has(targetTokens[0]!);

      if (!isSingleStopword && matches >= minNeeded && score > maxScore) {
        maxScore = score;
        maxMatches = matches;
        bestStart = targetStartIndex === 0 ? i : Math.max(startIdx, i - targetStartIndex);
        bestEnd = lastMatchIdx;
      }
    }
  }

  return (bestStart !== -1 && maxMatches / targetTokens.length >= minOverlap)
    ? { bestStart, bestEnd, matchCount: maxMatches }
    : null;
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
      diagnostics: [{
        code: 'NO_NARRATION_TEXT',
        severity: 'error',
        message: 'Script contains no spoken narration text. Smart Sync requires narration lines.',
      }],
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

  const spans: (RawSpan | null)[] = [];
  let currentWordSearchIdx = 0;

  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const seg = segments[sIdx]!;
    const narration = seg.narrationText?.trim() || '';
    const targetTokens = narration.split(/\s+/).map(normalizeToken).filter((t) => t.length > 0);

    if (targetTokens.length === 0) {
      spans.push(null);
      continue;
    }

    // 1. Primary forward scan
    const searchWindow = Math.max(120, targetTokens.length * 4);
    const maxSearch = Math.min(normalizedWords.length, currentWordSearchIdx + searchWindow);
    let match = findBestSpan(normalizedWords, targetTokens, currentWordSearchIdx, maxSearch, 0.35);

    // 2. Proportional recovery scan if missed
    if (!match && normalizedWords.length > 0) {
      const expectedIdx = Math.floor((sIdx / segments.length) * normalizedWords.length);
      const recStart = Math.max(0, expectedIdx - 150);
      const recEnd = Math.min(normalizedWords.length, expectedIdx + 150);
      if (recStart < recEnd) {
        match = findBestSpan(normalizedWords, targetTokens, recStart, recEnd, 0.4);
      }
    }

    // 3. Fallback: single non-stopword content match
    if (!match && currentWordSearchIdx < maxSearch) {
      for (let i = currentWordSearchIdx; i < maxSearch; i++) {
        const token = normalizedWords[i]!.token;
        if (token.length > 2 && !STOPWORDS.has(token) && targetTokens.includes(token)) {
          match = { bestStart: i, bestEnd: i, matchCount: 1 };
          break;
        }
      }
    }

    if (match) {
      spans.push({
        firstWordIdx: match.bestStart,
        lastWordIdx: match.bestEnd,
        spokenStartMs: normalizedWords[match.bestStart]!.startMs,
        spokenEndMs: normalizedWords[match.bestEnd]!.endMs,
        confidence: Math.min(1.0, match.matchCount / targetTokens.length),
      });
      currentWordSearchIdx = match.bestEnd + 1;
    } else {
      spans.push(null);
      const advanceBy = Math.max(3, Math.round(targetTokens.length * 0.8));
      currentWordSearchIdx = Math.min(normalizedWords.length - 1, currentWordSearchIdx + advanceBy);
    }
  }

  // 4. Derive contiguous boundaries with linear interpolation for null spans
  const totalAudioDur = options.totalDurationMs || (
    normalizedWords[normalizedWords.length - 1]?.endMs ??
    segments[segments.length - 1]?.endMs ??
    5000
  );

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
  let lastAnchor = 0;
  while (lastAnchor < segments.length) {
    let nextAnchor = lastAnchor + 1;
    while (nextAnchor <= segments.length && cutPoints[nextAnchor] === -1) nextAnchor++;

    const startVal = cutPoints[lastAnchor]!;
    const endVal = cutPoints[nextAnchor]!;
    const steps = nextAnchor - lastAnchor;
    const subOrig = segments.slice(lastAnchor, nextAnchor).map((s) => s.endMs - s.startMs);
    const sumOrig = subOrig.reduce((a, b) => a + b, 0) || steps;

    let accum = startVal;
    for (let k = 1; k < steps; k++) {
      accum += Math.round((endVal - startVal) * ((subOrig[k - 1] ?? 1) / sumOrig));
      cutPoints[lastAnchor + k] = accum;
    }
    lastAnchor = nextAnchor;
  }

  for (let i = 0; i < segments.length; i++) {
    if (cutPoints[i + 1]! < cutPoints[i]! + minDur) {
      cutPoints[i + 1] = cutPoints[i]! + minDur;
    }
  }

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
