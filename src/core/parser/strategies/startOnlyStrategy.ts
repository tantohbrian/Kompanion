import { ScriptParserStrategy, ParserContext, ParseResult, ParsedSegment } from '../types';
import { parseSingleTimestampToMs } from '../timestampUtils';
import { analyzeSegmentDiagnostics } from '../diagnostics';

/**
 * Strategy for start-only timestamped lines, such as:
 * [00:05] Prompt or narration text
 * (0:12) Another scene description
 */
export const startOnlyStrategy: ScriptParserStrategy = {
  name: 'start-only',
  label: 'Start-Only Timestamps ([MM:SS] or (MM:SS))',

  canParse(text: string): number {
    const lines = text.split(/\r?\n/);
    let matchCount = 0;
    const startOnlyRegex = new RegExp('^\\s*(?:\\[|\\()?\\s*(\\d{1,2}:\\d{2}(?::\\d{2})?)\\s*(?:\\]|\\))?(?:[:\\s—–]|\\-)+(.+)');

    for (const line of lines) {
      if (startOnlyRegex.test(line)) matchCount++;
    }

    if (matchCount >= 4) return 0.88;
    if (matchCount >= 2) return 0.75;
    return 0.0;
  },

  parse(text: string, context?: ParserContext): ParseResult {
    const lines = text.split(/\r?\n/);
    const rawSegments: { startMs: number; text: string; lineNum: number }[] = [];
    const startOnlyRegex = new RegExp('^\\s*(?:\\[|\\()?\\s*(\\d{1,2}:\\d{2}(?::\\d{2})?)\\s*(?:\\]|\\))?(?:[:\\s—–]|\\-)+(.+)');

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i]!.trim();
      const match = startOnlyRegex.exec(line);
      if (match && match[1] && match[2]) {
        const ms = parseSingleTimestampToMs(match[1]);
        if (ms !== null) {
          rawSegments.push({
            startMs: ms,
            text: match[2].trim(),
            lineNum,
          });
        }
      }
    }

    const segments: ParsedSegment[] = [];
    for (let i = 0; i < rawSegments.length; i++) {
      const curr = rawSegments[i]!;
      const next = rawSegments[i + 1];

      let endMs: number;
      if (next && next.startMs > curr.startMs) {
        endMs = next.startMs;
      } else if (context?.audioDurationMs && context.audioDurationMs > curr.startMs) {
        endMs = context.audioDurationMs;
      } else {
        endMs = curr.startMs + (context?.defaultSegmentDurationMs || 5000);
      }

      segments.push({
        index: i + 1,
        startMs: curr.startMs,
        endMs,
        promptText: curr.text,
        confidence: 0.88,
        sourceLineNumbers: [curr.lineNum, next ? next.lineNum - 1 : lines.length],
      });
    }

    const diagnostics = analyzeSegmentDiagnostics(segments, lines.length);

    return {
      strategyName: 'start-only',
      strategyLabel: 'Start-Only Timestamps',
      segments,
      diagnostics,
    };
  },
};
