import { ScriptParserStrategy, ParserContext, ParseResult, ParsedSegment } from '../types';
import { parseTimestampRangeToMs, parseSingleTimestampToMs } from '../timestampUtils';
import { analyzeSegmentDiagnostics } from '../diagnostics';

/**
 * Strategy for structured markdown image prompt files, such as:
 * - "## Image 1 — 00:00–00:05"
 * - "### Image 9 | 0:33 to 0:37"
 * - Followed by "**Script segment:** ..." and prompt blocks/code fences.
 */
export const markdownPromptsStrategy: ScriptParserStrategy = {
  name: 'markdown-prompts',
  label: 'Markdown Section Prompts (Headings & Ranges)',

  canParse(text: string): number {
    const lines = text.split(/\r?\n/);
    let headingMatchCount = 0;
    let scriptSegmentCount = 0;

    const headingRegex = /^#{1,4}\s*(?:Image|Scene|Visual|Beat|\d+)?.*?\b\d{1,2}:\d{2}\b/i;
    const scriptSegmentRegex = /\*\*Script segment(?:\s*\([^)]*\))?:\*\*/i;

    for (const line of lines) {
      if (headingRegex.test(line)) headingMatchCount++;
      if (scriptSegmentRegex.test(line)) scriptSegmentCount++;
    }

    if (headingMatchCount >= 5 && scriptSegmentCount >= 3) return 0.95;
    if (headingMatchCount >= 2) return 0.85;
    if (headingMatchCount === 1) return 0.5;
    return 0.0;
  },

  parse(text: string, context?: ParserContext): ParseResult {
    const lines = text.split(/\r?\n/);
    const segments: ParsedSegment[] = [];
    const capturedRanges: [number, number][] = [];

    // Heading regex: matches "## Image 1 — 00:00–00:05", "### Image 9 | 0:33 to 0:37", etc.
    const headingRegex = /^#{1,4}\s*(?:(?:Image|Scene|Visual|Beat)\s*(\d+))?[^\d]*([0-9:.,\s–—\-to\->]+)/i;
    const scriptSegmentRegex = /^\*\*Script segment(?:\s*\([^)]*\))?:\*\*\s*(.*)/i;
    const promptHeaderRegex = /^\*\*Image prompt:\*\*/i;

    interface SectionDraft {
      index: number;
      rawTimestamp: string;
      headerLine: number;
      lines: { text: string; lineNum: number }[];
    }

    const sections: SectionDraft[] = [];
    let currentSection: SectionDraft | null = null;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i]!;

      const headerMatch = headingRegex.exec(line);
      // Check if header contains a valid timestamp range
      if (headerMatch && headerMatch[2]) {
        const range = parseTimestampRangeToMs(headerMatch[2]);
        const single = parseSingleTimestampToMs(headerMatch[2]);
        if (range || single !== null) {
          if (currentSection) {
            sections.push(currentSection);
          }
          const explicitIdx = headerMatch[1] ? parseInt(headerMatch[1], 10) : sections.length + 1;
          currentSection = {
            index: explicitIdx,
            rawTimestamp: headerMatch[2],
            headerLine: lineNum,
            lines: [],
          };
          continue;
        }
      }

      if (currentSection) {
        currentSection.lines.push({ text: line, lineNum });
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    // Now extract narration and prompt from each section
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i]!;
      const range = parseTimestampRangeToMs(sec.rawTimestamp);
      let startMs = 0;
      let endMs = 5000;

      if (range) {
        startMs = range.startMs;
        endMs = range.endMs;
      } else {
        const single = parseSingleTimestampToMs(sec.rawTimestamp);
        if (single !== null) {
          startMs = single;
          // Check next section for start-only infill
          const nextSec = sections[i + 1];
          if (nextSec) {
            const nextRange = parseTimestampRangeToMs(nextSec.rawTimestamp);
            const nextSingle = parseSingleTimestampToMs(nextSec.rawTimestamp);
            endMs = nextRange ? nextRange.startMs : nextSingle !== null ? nextSingle : startMs + 5000;
          } else {
            endMs = context?.audioDurationMs && context.audioDurationMs > startMs
              ? context.audioDurationMs
              : startMs + 5000;
          }
        }
      }

      let narrationText: string | undefined;
      const promptLines: string[] = [];
      let inCodeBlock = false;
      let afterPromptHeader = false;

      for (const item of sec.lines) {
        const trimmed = item.text.trim();

        // 1. Script segment narration
        const scriptMatch = scriptSegmentRegex.exec(trimmed);
        if (scriptMatch && scriptMatch[1]) {
          narrationText = scriptMatch[1].trim();
          continue;
        }

        // 2. Code block toggles
        if (trimmed.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }

        // 3. Prompt header
        if (promptHeaderRegex.test(trimmed)) {
          afterPromptHeader = true;
          continue;
        }

        // Skip divider horizontal rules or decorative noise
        if (trimmed === '---' || trimmed === '***') {
          continue;
        }

        if (inCodeBlock || afterPromptHeader) {
          if (trimmed) promptLines.push(trimmed);
        } else if (trimmed && !trimmed.startsWith('**Runtime') && !trimmed.startsWith('**Visual') && !trimmed.startsWith('**Coverage')) {
          // If neither inCodeBlock nor afterPromptHeader, but not meta header, accumulate as prompt
          promptLines.push(trimmed);
        }
      }

      const promptText = promptLines.join('\n\n').trim();
      const endLine = sec.lines.length > 0 ? sec.lines[sec.lines.length - 1]!.lineNum : sec.headerLine;

      capturedRanges.push([sec.headerLine, endLine]);

      segments.push({
        index: sec.index,
        startMs,
        endMs,
        promptText: promptText || '(No visual description provided)',
        narrationText,
        confidence: 0.95,
        sourceLineNumbers: [sec.headerLine, endLine],
      });
    }

    const diagnostics = analyzeSegmentDiagnostics(segments, lines.length, capturedRanges);

    return {
      strategyName: 'markdown-prompts',
      strategyLabel: 'Markdown Section Prompts',
      segments,
      diagnostics,
    };
  },
};
