import { ScriptParserStrategy, ParseResult, ParsedSegment } from '../types';
import { parseTimestampRangeToMs } from '../timestampUtils';
import { analyzeSegmentDiagnostics } from '../diagnostics';

/**
 * Strategy for standard SubRip (.srt) subtitle scripts.
 */
export const srtStrategy: ScriptParserStrategy = {
  name: 'srt',
  label: 'SubRip Subtitles (.srt)',

  canParse(text: string): number {
    const srtTimeRegex = /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/g;
    const matches = text.match(srtTimeRegex);
    if (!matches) return 0;
    if (matches.length >= 3) return 0.98;
    return 0.8;
  },

  parse(text: string): ParseResult {
    const lines = text.split(/\r?\n/);
    const segments: ParsedSegment[] = [];

    // Blocks separated by double newline
    const srtTimeRegex = /^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/;

    let currentIdx = 1;
    let currentRange: { startMs: number; endMs: number } | null = null;
    let currentTextLines: string[] = [];
    let startLineNum = 1;

    const flush = (endLineNum: number) => {
      if (currentRange) {
        const fullText = currentTextLines.join(' ').trim();
        segments.push({
          index: currentIdx,
          startMs: currentRange.startMs,
          endMs: currentRange.endMs,
          promptText: fullText || `Visual beat ${currentIdx}`,
          narrationText: fullText,
          confidence: 0.98,
          sourceLineNumbers: [startLineNum, endLineNum],
        });
        currentIdx++;
      }
      currentRange = null;
      currentTextLines = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const trimmed = lines[i]!.trim();

      const timeMatch = srtTimeRegex.exec(trimmed);
      if (timeMatch) {
        flush(lineNum - 1);
        const parsed = parseTimestampRangeToMs(`${timeMatch[1]} --> ${timeMatch[2]}`);
        if (parsed) {
          currentRange = parsed;
          startLineNum = lineNum;
        }
        continue;
      }

      // Check if it's an integer sequence line e.g. "1", "2"
      if (/^\d+$/.test(trimmed) && currentRange === null) {
        startLineNum = lineNum;
        continue;
      }

      if (trimmed === '') {
        flush(lineNum);
      } else if (currentRange) {
        currentTextLines.push(trimmed);
      }
    }

    flush(lines.length);

    const diagnostics = analyzeSegmentDiagnostics(segments, lines.length);

    return {
      strategyName: 'srt',
      strategyLabel: 'SubRip Subtitles (.srt)',
      segments,
      diagnostics,
    };
  },
};
