import { ScriptParserStrategy, ParserContext, ParseResult, ParsedSegment } from '../types';
import { parseTimestampRangeToMs, parseSingleTimestampToMs } from '../timestampUtils';
import { analyzeSegmentDiagnostics } from '../diagnostics';

/**
 * Strategy for inline image markers in script text, such as:
 * Image 1 (0:00–0:05) — "I'm sure you've experienced this moment before."
 * Followed by prompt text, then Image 2 (0:05–0:10) — "...", etc.
 */
export const inlineTimestampStrategy: ScriptParserStrategy = {
  name: 'inline-timestamps',
  label: 'Inline Timestamp Prompts (e.g. Image 1 (0:00-0:05))',

  canParse(text: string): number {
    const markerRegex = /(?:Image|Scene|Visual|Beat)\s*\d+\s*\([0-9:.,\s–—\-to\->]+\)/gi;
    const matches = text.match(markerRegex);
    if (!matches) return 0;
    if (matches.length >= 5) return 0.95;
    if (matches.length >= 2) return 0.85;
    return 0.5;
  },

  parse(text: string, context?: ParserContext): ParseResult {
    const segments: ParsedSegment[] = [];

    // Global regex to identify all marker occurrences
    // e.g., Image 1 (0:00–0:05) — "Narration text" or Image 1 (0:00–0:05) — Narration text
    const markerRegex = /(?:Image|Scene|Visual|Beat)\s*(\d+)\s*\(([0-9:.,\s–—\-to\->]+)\)\s*(?:[-—–]+\s*)?(?:"([^"]*)"|([^\n\r]+?)(?=(?:Hand-drawn|Scene:|Setting:|Composition:|\r?\n|$)))?/gi;

    interface RawMatch {
      index: number;
      rawTimestamp: string;
      narration?: string;
      matchStartIndex: number;
      matchEndIndex: number;
    }

    const matches: RawMatch[] = [];
    let m: RegExpExecArray | null;

    while ((m = markerRegex.exec(text)) !== null) {
      const explicitIdx = m[1] ? parseInt(m[1], 10) : matches.length + 1;
      const rawTimestamp = m[2] ? m[2].trim() : '';
      const narration = (m[3] || m[4] || '').trim();

      matches.push({
        index: explicitIdx,
        rawTimestamp,
        narration: narration || undefined,
        matchStartIndex: m.index,
        matchEndIndex: markerRegex.lastIndex,
      });
    }

    // Helper to calculate 1-indexed line number from character offset
    const getLineNumberAt = (offset: number): number => {
      let line = 1;
      for (let i = 0; i < offset && i < text.length; i++) {
        if (text[i] === '\n') line++;
      }
      return line;
    };

    for (let i = 0; i < matches.length; i++) {
      const curr = matches[i]!;
      const next = matches[i + 1];

      // Extract prompt text between end of current match and start of next match
      const promptEndChar = next ? next.matchStartIndex : text.length;
      const rawPrompt = text.slice(curr.matchEndIndex, promptEndChar).trim();

      const range = parseTimestampRangeToMs(curr.rawTimestamp);
      let startMs = 0;
      let endMs = 5000;

      if (range) {
        startMs = range.startMs;
        endMs = range.endMs;
      } else {
        const single = parseSingleTimestampToMs(curr.rawTimestamp);
        if (single !== null) {
          startMs = single;
          if (next) {
            const nextRange = parseTimestampRangeToMs(next.rawTimestamp);
            const nextSingle = parseSingleTimestampToMs(next.rawTimestamp);
            endMs = nextRange ? nextRange.startMs : nextSingle !== null ? nextSingle : startMs + 5000;
          } else {
            endMs = context?.audioDurationMs && context.audioDurationMs > startMs
              ? context.audioDurationMs
              : startMs + 5000;
          }
        }
      }

      const startLine = getLineNumberAt(curr.matchStartIndex);
      const endLine = getLineNumberAt(promptEndChar);

      segments.push({
        index: curr.index,
        startMs,
        endMs,
        promptText: rawPrompt || '(No visual description provided)',
        narrationText: curr.narration,
        confidence: 0.95,
        sourceLineNumbers: [startLine, endLine],
      });
    }

    const totalLines = text.split(/\r?\n/).length;
    const diagnostics = analyzeSegmentDiagnostics(segments, totalLines);

    return {
      strategyName: 'inline-timestamps',
      strategyLabel: 'Inline Timestamp Prompts',
      segments,
      diagnostics,
    };
  },
};
