/**
 * Global Dynamic Programming / Monotonic Sequence Aligner.
 * Performs global sequence alignment between Whisper words and script tokens.
 * Pure TypeScript, zero DOM/React dependencies.
 */

import { isTokenMatch, tokenizeText } from './textNormalizer';

export interface DpWord {
  token: string;
  startMs: number;
  endMs: number;
  idx: number;
}

export interface DpScriptToken {
  token: string;
  segmentIndex: number;
  tokenIndex: number;
}

export interface DpSpan {
  firstWordIdx: number;
  lastWordIdx: number;
  spokenStartMs: number;
  spokenEndMs: number;
  confidence: number;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'as', 'is', 'it', 'its', 'so', 'be', 'do', 'no', 'up',
]);

export function buildGlobalScriptTokens(
  segments: { narrationText?: string; promptText?: string }[]
): { tokens: DpScriptToken[]; segmentTokenCounts: number[] } {
  const tokens: DpScriptToken[] = [];
  const segmentTokenCounts: number[] = [];

  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const text = segments[sIdx]?.narrationText?.trim() || '';
    const segTokens = tokenizeText(text);
    segmentTokenCounts.push(segTokens.length);

    for (let tIdx = 0; tIdx < segTokens.length; tIdx++) {
      tokens.push({
        token: segTokens[tIdx]!,
        segmentIndex: sIdx,
        tokenIndex: tIdx,
      });
    }
  }

  return { tokens, segmentTokenCounts };
}

/**
 * Runs global dynamic programming alignment between script tokens and transcript words.
 * Returns an array of (DpSpan | null) for each segment.
 */
export function alignGlobalDp(
  segments: { narrationText?: string; promptText?: string }[],
  words: DpWord[]
): (DpSpan | null)[] {
  const { tokens: scriptTokens, segmentTokenCounts } = buildGlobalScriptTokens(segments);
  const M = scriptTokens.length;
  const N = words.length;

  if (M === 0 || N === 0) {
    return new Array(segments.length).fill(null);
  }

  // Use flat arrays for memory efficiency
  // DP score matrix and direction matrix: 0 = up (skip T), 1 = left (skip W), 2 = diag (match)
  const cols = N + 1;
  const dp = new Float32Array((M + 1) * cols);
  const dir = new Uint8Array((M + 1) * cols);

  // Initialize first row and column
  const GAP_PENALTY = 0.2;
  for (let i = 1; i <= M; i++) {
    dp[i * cols] = -i * GAP_PENALTY;
    dir[i * cols] = 0; // up
  }
  for (let j = 1; j <= N; j++) {
    dp[j] = -j * GAP_PENALTY;
    dir[j] = 1; // left
  }

  // Fill DP table
  for (let i = 1; i <= M; i++) {
    const tToken = scriptTokens[i - 1]!.token;
    const isStop = STOPWORDS.has(tToken);
    const rowOffset = i * cols;
    const prevRowOffset = (i - 1) * cols;

    for (let j = 1; j <= N; j++) {
      const wToken = words[j - 1]!.token;
      const matched = isTokenMatch(tToken, wToken);

      let matchScore = -1.2;
      if (matched) {
        matchScore = isStop ? 2.0 : 3.5;
        if (tToken === wToken) matchScore += 0.5;
      }

      const scoreDiag = dp[prevRowOffset + (j - 1)]! + matchScore;
      const scoreUp = dp[prevRowOffset + j]! - GAP_PENALTY;
      const scoreLeft = dp[rowOffset + (j - 1)]! - GAP_PENALTY;

      if (scoreDiag >= scoreUp && scoreDiag >= scoreLeft) {
        dp[rowOffset + j] = scoreDiag;
        dir[rowOffset + j] = 2; // diag
      } else if (scoreUp >= scoreLeft) {
        dp[rowOffset + j] = scoreUp;
        dir[rowOffset + j] = 0; // up
      } else {
        dp[rowOffset + j] = scoreLeft;
        dir[rowOffset + j] = 1; // left
      }
    }
  }

  // Traceback to find matched word indices for each segment
  const segmentMatches: Map<number, number[]> = new Map();
  let currI = M;
  let currJ = N;

  while (currI > 0 && currJ > 0) {
    const d = dir[currI * cols + currJ];
    if (d === 2) {
      // Diag: check if tokens actually matched
      const t = scriptTokens[currI - 1]!;
      const w = words[currJ - 1]!;
      if (isTokenMatch(t.token, w.token)) {
        let list = segmentMatches.get(t.segmentIndex);
        if (!list) {
          list = [];
          segmentMatches.set(t.segmentIndex, list);
        }
        list.push(currJ - 1);
      }
      currI--;
      currJ--;
    } else if (d === 0) {
      currI--;
    } else {
      currJ--;
    }
  }

  // Derive DpSpan for each segment
  const spans: (DpSpan | null)[] = [];
  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const wordIndices = segmentMatches.get(sIdx);
    const tokenCount = segmentTokenCounts[sIdx] || 0;

    if (!wordIndices || wordIndices.length === 0 || tokenCount === 0) {
      spans.push(null);
      continue;
    }

    wordIndices.sort((a, b) => a - b);
    const firstWordIdx = wordIndices[0]!;
    const lastWordIdx = wordIndices[wordIndices.length - 1]!;
    const firstWord = words[firstWordIdx]!;
    const lastWord = words[lastWordIdx]!;

    const matchCount = wordIndices.length;
    const confidence = Math.min(1.0, Math.round((matchCount / Math.max(1, tokenCount)) * 100) / 100);

    spans.push({
      firstWordIdx,
      lastWordIdx,
      spokenStartMs: firstWord.startMs,
      spokenEndMs: lastWord.endMs,
      confidence: Math.max(0.4, confidence),
    });
  }

  return spans;
}
