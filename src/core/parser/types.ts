/**
 * Core Parser Types for Kompanion.
 * Pure TypeScript with integer millisecond time coordinates.
 * No DOM or React dependencies.
 */

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export type DiagnosticCode =
  | 'UNPARSED_LINES'
  | 'TIMESTAMP_OVERLAP'
  | 'OUT_OF_ORDER'
  | 'TIMELINE_GAP'
  | 'NO_TIMESTAMPS'
  | 'FORMAT_WARNING';

export interface ParseDiagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  lineNumbers?: number[];
}

export interface ParsedSegment {
  index: number;
  startMs: number;
  endMs: number;
  promptText: string;
  narrationText?: string;
  confidence: number;
  sourceLineNumbers: [number, number]; // [startLine, endLine] 1-indexed
}

export interface ParseResult {
  strategyName: string;
  strategyLabel?: string;
  segments: ParsedSegment[];
  diagnostics: ParseDiagnostic[];
}

export interface ParserContext {
  audioDurationMs?: number;
  defaultSegmentDurationMs?: number;
}

export interface ScriptParserStrategy {
  readonly name: string;
  readonly label: string;
  canParse(text: string): number; // Confidence 0.0 to 1.0
  parse(text: string, context?: ParserContext): ParseResult;
}
