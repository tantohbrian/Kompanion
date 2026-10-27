import { ScriptParserStrategy, ParserContext, ParseResult, ParsedSegment } from '../types';

/**
 * Fallback strategy when no timestamps are detected in the script.
 * Splits text into paragraphs/prompts and distributes total audio duration evenly.
 */
export const evenSplitStrategy: ScriptParserStrategy = {
  name: 'even-split',
  label: 'Even Split (No Timestamps Detected)',

  canParse(text: string): number {
    return text.trim().length > 0 ? 0.2 : 0.0;
  },

  parse(text: string, context?: ParserContext): ParseResult {
    const rawParagraphs = text
      .split(/\r?\n\r?\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const segments: ParsedSegment[] = [];
    const totalCount = rawParagraphs.length > 0 ? rawParagraphs.length : 1;
    const totalAudioMs = context?.audioDurationMs || totalCount * 5000;
    const durationPerSegment = Math.max(1000, Math.round(totalAudioMs / totalCount));

    let currentStart = 0;
    for (let i = 0; i < totalCount; i++) {
      const p = rawParagraphs[i] || text.trim() || 'Visual prompt';
      const isLast = i === totalCount - 1;
      const endMs = isLast ? totalAudioMs : currentStart + durationPerSegment;

      segments.push({
        index: i + 1,
        startMs: currentStart,
        endMs,
        promptText: p,
        confidence: 0.5,
        sourceLineNumbers: [1, 1],
      });

      currentStart = endMs;
    }

    return {
      strategyName: 'even-split',
      strategyLabel: 'Even Split',
      segments,
      diagnostics: [
        {
          severity: 'info',
          code: 'NO_TIMESTAMPS',
          message:
            'No explicit timestamps found. Segments were evenly distributed across the audio timeline.',
        },
      ],
    };
  },
};
