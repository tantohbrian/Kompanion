---
name: script-parser
description: Script parsing architecture, timestamp extraction strategies, diagnostics, and test fixtures for Kompanion. Use when working on script ingestion, parsing strategies, timestamp handling, parse diagnostics, or script fixtures.
---

# Script Parser

Architecture, strategy registry, diagnostic rules, and fixture testing for Kompanion's script parsing engine.

## 1. Strategy Interface & Registry

The script parser uses a pluggable strategy registry. Every strategy implements:

```ts
interface ScriptParserStrategy {
  name: string;
  canParse(text: string): number; // Confidence score between 0.0 and 1.0
  parse(text: string, context?: ParserContext): ParseResult;
}

interface ParserContext {
  audioDurationMs?: number;
}

interface ParseResult {
  strategyName: string;
  segments: ParsedSegment[];
  diagnostics: ParseDiagnostic[];
}

interface ParsedSegment {
  index: number;
  startMs: number;
  endMs: number;
  promptText: string;
  narrationText?: string;
  confidence: number;
  sourceLineNumbers: [number, number];
}
```

- When parsing script input, run `canParse()` on all registered strategies.
- The strategy with the highest confidence score is selected automatically.
- The user can manually override the strategy choice on the Review screen.

## 2. Supported Timestamp Formats

Strategies must support standard script formatting conventions:
- Range format: `0:00-0:05`, `00:00 - 00:05`
- Bracketed stamps: `[00:05]`, `(0:05)`
- SubRip format: `00:00:05,000 --> 00:00:09,000`
- Duration shorthand: `5s`, `12.5s`
- Prefixed labels: `Image 3 (0:12-0:18)`
- Separators: Standard hyphen (`-`), en dash (`–`), em dash (`—`), arrows (`->`, `-->`, `→`).

## 3. Timestamp Infill & Fallbacks

- **Start-only stamps**: Clip end equals the next clip's start time. The final clip's end equals `context.audioDurationMs` (or a default duration if audio duration is absent).
- **No stamps detected**: Evenly split the total audio duration across all extracted prompts. Add an informational diagnostic warning the user that timing was generated uniformly.

## 4. The Never-Throw Rule & Diagnostics

The parser must never throw uncaught exceptions on malformed or unexpected user text. Always return a valid `ParseResult` with typed diagnostics:
```ts
interface ParseDiagnostic {
  severity: 'info' | 'warning' | 'error';
  code: 'UNPARSED_LINES' | 'TIMESTAMP_OVERLAP' | 'OUT_OF_ORDER' | 'TIMELINE_GAP' | 'NO_TIMESTAMPS';
  message: string;
  lineNumbers?: number[];
}
```

- Flag overlaps, gaps, out-of-order timestamps, and unparsed prose blocks.
- The UI review table displays diagnostics with quick fix actions (e.g., auto-reorder, close gaps).

## 5. Adding Strategies and Fixture Testing

- Test against real-world fixtures located in `fixtures/scripts/`:
  - `1. image prompts.md`
  - `2. image_prompts_psychology_of_villains.md`
  - `3. script.md`
- When introducing a new format or edge case:
  1. Add a representative fixture in `fixtures/scripts/`.
  2. Implement the strategy in `src/core/parser/strategies/`.
  3. Register it via `registerParser(newStrategy)` in `src/core/parser/registry.ts`.
  4. Write a unit test asserting confidence score, segment counts, and diagnostic flags.
