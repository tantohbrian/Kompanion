import { ScriptParserStrategy, ParserContext, ParseResult } from './types';
import { markdownPromptsStrategy } from './strategies/markdownPromptsStrategy';
import { inlineTimestampStrategy } from './strategies/inlineTimestampStrategy';
import { srtStrategy } from './strategies/srtStrategy';
import { startOnlyStrategy } from './strategies/startOnlyStrategy';
import { durationStrategy } from './strategies/durationStrategy';
import { evenSplitStrategy } from './strategies/evenSplitStrategy';

const registry: ScriptParserStrategy[] = [];

/**
 * Registers a new parser strategy into the engine.
 */
export function registerParser(strategy: ScriptParserStrategy): void {
  // Avoid duplicate registrations
  const idx = registry.findIndex((s) => s.name === strategy.name);
  if (idx >= 0) {
    registry[idx] = strategy;
  } else {
    registry.push(strategy);
  }
}

/**
 * Returns all currently registered strategies.
 */
export function getRegisteredParsers(): ScriptParserStrategy[] {
  return [...registry];
}

/**
 * Evaluates all registered strategies against the text and returns the highest confidence strategy.
 */
export function findBestStrategy(text: string): ScriptParserStrategy {
  if (registry.length === 0) {
    initDefaultRegistry();
  }

  let best: ScriptParserStrategy = evenSplitStrategy;
  let highestScore = -1;

  for (const strategy of registry) {
    try {
      const score = strategy.canParse(text);
      if (score > highestScore) {
        highestScore = score;
        best = strategy;
      }
    } catch {
      // Ignore strategy canParse failures
    }
  }

  return best;
}

/**
 * Parses script text using either a specified strategy name or the auto-detected best strategy.
 * NEVER throws: captures any unhandled error and returns a valid result with error diagnostics.
 */
export function parseScript(
  text: string,
  preferredStrategyName?: string,
  context?: ParserContext
): ParseResult {
  if (registry.length === 0) {
    initDefaultRegistry();
  }

  let strategy: ScriptParserStrategy | undefined;
  if (preferredStrategyName) {
    strategy = registry.find((s) => s.name === preferredStrategyName);
  }

  if (!strategy) {
    strategy = findBestStrategy(text);
  }

  try {
    const result = strategy.parse(text, context);
    if (!result || !Array.isArray(result.segments)) {
      throw new Error(`Strategy ${strategy.name} returned invalid parse structure.`);
    }
    return result;
  } catch (err) {
    console.error(`Parser strategy "${strategy.name}" threw an unhandled error:`, err);
    // Never crash: fallback to even-split with diagnostic
    const fallback = evenSplitStrategy.parse(text, context);
    fallback.diagnostics.unshift({
      severity: 'error',
      code: 'FORMAT_WARNING',
      message: `Preferred parser "${strategy.name}" failed: ${err instanceof Error ? err.message : String(err)}. Fell back to even split.`,
    });
    return fallback;
  }
}

/**
 * Initializes default built-in strategies.
 */
export function initDefaultRegistry(): void {
  registry.length = 0;
  registerParser(markdownPromptsStrategy);
  registerParser(inlineTimestampStrategy);
  registerParser(srtStrategy);
  registerParser(startOnlyStrategy);
  registerParser(durationStrategy);
  registerParser(evenSplitStrategy);
}

// Auto-initialize registry
initDefaultRegistry();
