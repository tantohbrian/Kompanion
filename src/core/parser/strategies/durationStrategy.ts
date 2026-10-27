import { ScriptParserStrategy, ParseResult, ParsedSegment } from '../types';
import { parseSingleTimestampToMs } from '../timestampUtils';
import { analyzeSegmentDiagnostics } from '../diagnostics';

/**
 * Strategy for duration-based prompts, such as:
 * [5s] Prompt text
 * (4.5s) Scene description
 * Image 1 (6s) Description
 */
export const durationStrategy: ScriptParserStrategy = {
  name: 'duration-stamps',
  label: 'Duration Stamps (e.g. [5s] or 5s)',

  canParse(text: string): number {
    const lines = text.split(/\r?\n/);
    let matchCount = 0;
    const durationRegex = /(?:\[|\()?\b(\d+(?:\.\d+)?)\s*s\b(?:\]|\))?/i;

    for (const line of lines) {
      if (durationRegex.test(line)) matchCount++;
    }

    if (matchCount >= 3) return 0.8;
    return 0.0;
  },

  parse(text: string): ParseResult {
    const lines = text.split(/\r?\n/);
    const segments: ParsedSegment[] = [];
    const durationRegex = new RegExp(
      '^(?:(?:Image|Scene|Visual|Beat)\\s*\\d+\\s*)?(?:\\[|\\()?\\s*(\\d+(?:\\.\\d+)?)\\s*s\\s*(?:\\]|\\))?(?:[:\\s—–]|\\-)+(.*)',
      'i'
    );

    let runningTimeMs = 0;
    let idx = 1;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i]!.trim();
      const match = durationRegex.exec(line);

      if (match && match[1] && match[2]) {
        const durMs = parseSingleTimestampToMs(`${match[1]}s`) || 5000;
        const startMs = runningTimeMs;
        const endMs = startMs + durMs;
        runningTimeMs = endMs;

        segments.push({
          index: idx++,
          startMs,
          endMs,
          promptText: match[2].trim(),
          confidence: 0.8,
          sourceLineNumbers: [lineNum, lineNum],
        });
      }
    }

    const diagnostics = analyzeSegmentDiagnostics(segments, lines.length);

    return {
      strategyName: 'duration-stamps',
      strategyLabel: 'Duration Stamps',
      segments,
      diagnostics,
    };
  },
};
