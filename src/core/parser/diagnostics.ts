import { ParsedSegment, ParseDiagnostic } from './types';

/**
 * Validates a list of parsed segments and returns diagnostic notices.
 * Pure function with zero DOM dependencies.
 */
export function analyzeSegmentDiagnostics(
  segments: ParsedSegment[],
  totalLinesCount?: number,
  capturedLineRanges: [number, number][] = []
): ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];

  if (segments.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'UNPARSED_LINES',
      message: 'No script segments could be extracted from the input text.',
    });
    return diagnostics;
  }

  // Check chronological order, overlaps, gaps, and invalid durations
  for (let i = 0; i < segments.length; i++) {
    const curr = segments[i];
    if (!curr) continue;

    // Zero or negative duration check
    if (curr.endMs <= curr.startMs) {
      diagnostics.push({
        severity: 'error',
        code: 'FORMAT_WARNING',
        message: `Segment ${curr.index} has invalid non-positive duration (${curr.startMs}ms to ${curr.endMs}ms).`,
        lineNumbers: [curr.sourceLineNumbers[0]],
      });
    }

    if (i > 0) {
      const prev = segments[i - 1];
      if (!prev) continue;

      // 1. Out of order timestamps
      if (curr.startMs < prev.startMs) {
        diagnostics.push({
          severity: 'error',
          code: 'OUT_OF_ORDER',
          message: `Segment ${curr.index} starts at ${curr.startMs}ms, which is before Segment ${prev.index} at ${prev.startMs}ms.`,
          lineNumbers: [curr.sourceLineNumbers[0]],
        });
      }
      // 2. Overlap between segments
      else if (curr.startMs < prev.endMs) {
        diagnostics.push({
          severity: 'warning',
          code: 'TIMESTAMP_OVERLAP',
          message: `Segment ${curr.index} starts at ${curr.startMs}ms before Segment ${prev.index} finishes at ${prev.endMs}ms (${prev.endMs - curr.startMs}ms overlap).`,
          lineNumbers: [prev.sourceLineNumbers[1], curr.sourceLineNumbers[0]],
        });
      }
      // 3. Gap between segments (> 150ms)
      else if (curr.startMs > prev.endMs + 150) {
        const gapMs = curr.startMs - prev.endMs;
        diagnostics.push({
          severity: 'info',
          code: 'TIMELINE_GAP',
          message: `Noticeable gap of ${gapMs}ms detected between Segment ${prev.index} (${prev.endMs}ms) and Segment ${curr.index} (${curr.startMs}ms).`,
          lineNumbers: [prev.sourceLineNumbers[1], curr.sourceLineNumbers[0]],
        });
      }
    }
  }

  // Check unparsed lines if total lines given
  if (totalLinesCount && totalLinesCount > 0 && capturedLineRanges.length > 0) {
    const unparsed: number[] = [];
    const isCaptured = (line: number) =>
      capturedLineRanges.some(([start, end]) => line >= start && line <= end);

    for (let line = 1; line <= totalLinesCount; line++) {
      if (!isCaptured(line)) {
        unparsed.push(line);
      }
    }

    if (unparsed.length > 0 && unparsed.length < totalLinesCount * 0.9) {
      diagnostics.push({
        severity: 'info',
        code: 'UNPARSED_LINES',
        message: `${unparsed.length} lines in the script were not captured as prompts or narration.`,
        lineNumbers: unparsed.slice(0, 10), // sample first 10
      });
    }
  }

  return diagnostics;
}

/**
 * Reorders segments chronologically by startMs and renumbers indexes 1..N.
 */
export function autoReorderSegments(segments: ParsedSegment[]): ParsedSegment[] {
  const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
  return sorted.map((s, idx) => ({
    ...s,
    index: idx + 1,
  }));
}

/**
 * Resolves overlapping segment timestamps by clamping the preceding segment's endMs to the current startMs.
 */
export function autoFixOverlaps(segments: ParsedSegment[]): ParsedSegment[] {
  const sorted = autoReorderSegments(segments);
  const result: ParsedSegment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const curr = { ...sorted[i]! };
    if (i > 0) {
      const prev = result[i - 1]!;
      if (prev.endMs > curr.startMs) {
        prev.endMs = curr.startMs;
        if (prev.endMs <= prev.startMs) {
          prev.endMs = prev.startMs + 1000;
        }
      }
    }
    result.push(curr);
  }
  return result;
}

/**
 * Closes timeline gaps by extending previous segment's endMs to the current startMs.
 */
export function autoCloseGaps(segments: ParsedSegment[]): ParsedSegment[] {
  const sorted = autoReorderSegments(segments);
  const result: ParsedSegment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const curr = { ...sorted[i]! };
    if (i > 0) {
      const prev = result[i - 1]!;
      if (prev.endMs < curr.startMs) {
        prev.endMs = curr.startMs;
      }
    }
    result.push(curr);
  }
  return result;
}

/**
 * Extends the final segment's endMs to match total audio duration.
 */
export function extendLastSegmentTo(
  segments: ParsedSegment[],
  targetEndMs: number
): ParsedSegment[] {
  if (segments.length === 0) return [];
  const result = segments.map((s) => ({ ...s }));
  const last = result[result.length - 1];
  if (last && targetEndMs > last.startMs) {
    last.endMs = targetEndMs;
  }
  return result;
}
