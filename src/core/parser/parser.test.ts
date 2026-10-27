import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseScript,
  findBestStrategy,
  autoFixOverlaps,
  autoCloseGaps,
  autoReorderSegments,
} from './index';

describe('Script Parser Registry & Strategies', () => {
  const fixturesDir = path.resolve(process.cwd(), 'fixtures', 'scripts');

  it('parses "1. image prompts.md" with markdown-prompts strategy', () => {
    const filePath = path.join(fixturesDir, '1. image prompts.md');
    const content = fs.readFileSync(filePath, 'utf-8');

    const best = findBestStrategy(content);
    expect(best.name).toBe('markdown-prompts');

    const result = parseScript(content);
    expect(result.strategyName).toBe('markdown-prompts');
    expect(result.segments.length).toBeGreaterThan(100);

    // Check first segment
    const seg1 = result.segments[0];
    expect(seg1).toBeDefined();
    expect(seg1?.index).toBe(1);
    expect(seg1?.startMs).toBe(0);
    expect(seg1?.endMs).toBe(5000);
    expect(seg1?.narrationText).toContain('shooting a basketball');
    expect(seg1?.promptText).toContain('Hand-drawn educational doodle');

    // Check second segment
    const seg2 = result.segments[1];
    expect(seg2?.index).toBe(2);
    expect(seg2?.startMs).toBe(5000);
    expect(seg2?.endMs).toBe(10000);
  });

  it('parses "2. image_prompts_psychology_of_villains.md" with markdown-prompts strategy', () => {
    const filePath = path.join(fixturesDir, '2. image_prompts_psychology_of_villains.md');
    const content = fs.readFileSync(filePath, 'utf-8');

    const best = findBestStrategy(content);
    expect(best.name).toBe('markdown-prompts');

    const result = parseScript(content);
    expect(result.segments.length).toBeGreaterThan(50);

    // Check a segment with "0:33 to 0:37"
    const seg9 = result.segments.find((s) => s.index === 9);
    expect(seg9).toBeDefined();
    expect(seg9?.startMs).toBe(33000);
    expect(seg9?.endMs).toBe(37000);
    expect(seg9?.narrationText).toContain('who we see when we look at the villain');
  });

  it('parses "3. script.md" with inline-timestamps strategy', () => {
    const filePath = path.join(fixturesDir, '3. script.md');
    const content = fs.readFileSync(filePath, 'utf-8');

    const best = findBestStrategy(content);
    expect(best.name).toBe('inline-timestamps');

    const result = parseScript(content);
    expect(result.strategyName).toBe('inline-timestamps');
    expect(result.segments.length).toBeGreaterThan(50);

    const first = result.segments[0];
    expect(first?.index).toBe(1);
    expect(first?.startMs).toBe(0);
    expect(first?.endMs).toBe(5000);
    expect(first?.narrationText).toContain('living room at eleven forty-seven');
    expect(first?.promptText).toContain('Hand-drawn educational doodle');
  });

  it('parses standard SubRip (.srt) subtitles', () => {
    const srt = `1
00:00:01,000 --> 00:00:04,500
Welcome to this episode.

2
00:00:05,000 --> 00:00:08,200
Today we examine the human brain.`;

    const best = findBestStrategy(srt);
    expect(best.name).toBe('srt');

    const result = parseScript(srt);
    expect(result.segments.length).toBe(2);
    expect(result.segments[0]?.startMs).toBe(1000);
    expect(result.segments[0]?.endMs).toBe(4500);
    expect(result.segments[0]?.narrationText).toBe('Welcome to this episode.');
    expect(result.segments[1]?.startMs).toBe(5000);
    expect(result.segments[1]?.endMs).toBe(8200);
  });

  it('parses start-only timestamps with infill logic', () => {
    const script = `
[00:00] Intro scene showing the sunset
[00:06] Character walks into the office
[00:15] Computer screen zooming in
`;

    const result = parseScript(script, 'start-only', { audioDurationMs: 25000 });
    expect(result.segments.length).toBe(3);

    // Segment 1 ends where segment 2 starts
    expect(result.segments[0]?.startMs).toBe(0);
    expect(result.segments[0]?.endMs).toBe(6000);

    // Segment 2 ends where segment 3 starts
    expect(result.segments[1]?.startMs).toBe(6000);
    expect(result.segments[1]?.endMs).toBe(15000);

    // Segment 3 ends at audioDurationMs
    expect(result.segments[2]?.startMs).toBe(15000);
    expect(result.segments[2]?.endMs).toBe(25000);
  });

  it('parses duration-based stamps', () => {
    const script = `
Image 1 [4s] Quick hook illustration
Image 2 [6.5s] Establishing shot of the city
Image 3 [5s] Closing logo reveal
`;

    const result = parseScript(script, 'duration-stamps');
    expect(result.segments.length).toBe(3);
    expect(result.segments[0]?.startMs).toBe(0);
    expect(result.segments[0]?.endMs).toBe(4000);
    expect(result.segments[1]?.startMs).toBe(4000);
    expect(result.segments[1]?.endMs).toBe(10500);
    expect(result.segments[2]?.startMs).toBe(10500);
    expect(result.segments[2]?.endMs).toBe(15500);
  });

  it('falls back to even-split with NO_TIMESTAMPS diagnostic when no stamps exist', () => {
    const script = `
First paragraph describing an ancient empire with majestic temples.

Second paragraph explaining the sudden collapse of their civilization.

Third paragraph showing the archaeological ruins today.
`;

    const result = parseScript(script, undefined, { audioDurationMs: 30000 });
    expect(result.strategyName).toBe('even-split');
    expect(result.segments.length).toBe(3);

    // 30s split into 3 segments = 10s each
    expect(result.segments[0]?.startMs).toBe(0);
    expect(result.segments[0]?.endMs).toBe(10000);
    expect(result.segments[1]?.startMs).toBe(10000);
    expect(result.segments[1]?.endMs).toBe(20000);
    expect(result.segments[2]?.startMs).toBe(20000);
    expect(result.segments[2]?.endMs).toBe(30000);

    const noStampDiag = result.diagnostics.find((d) => d.code === 'NO_TIMESTAMPS');
    expect(noStampDiag).toBeDefined();
    expect(noStampDiag?.severity).toBe('info');
  });

  it('detects and fixes overlaps and gaps', () => {
    const messyScript = `1
00:00:00,000 --> 00:00:05,000
Clip 1

2
00:00:04,000 --> 00:00:08,000
Clip 2 overlapping clip 1

3
00:00:10,000 --> 00:00:15,000
Clip 3 with a gap after clip 2`;

    const parsed = parseScript(messyScript);
    const overlapDiag = parsed.diagnostics.find((d) => d.code === 'TIMESTAMP_OVERLAP');
    expect(overlapDiag).toBeDefined();

    const gapDiag = parsed.diagnostics.find((d) => d.code === 'TIMELINE_GAP');
    expect(gapDiag).toBeDefined();

    // Test autoFixOverlaps
    const fixedOverlaps = autoFixOverlaps(parsed.segments);
    expect(fixedOverlaps[0]?.endMs).toBe(4000);
    expect(fixedOverlaps[1]?.startMs).toBe(4000);

    // Test autoCloseGaps
    const closedGaps = autoCloseGaps(fixedOverlaps);
    expect(closedGaps[1]?.endMs).toBe(10000);
    expect(closedGaps[2]?.startMs).toBe(10000);
  });

  it('reorders out of order segments with autoReorderSegments', () => {
    const segments = [
      {
        index: 2,
        startMs: 10000,
        endMs: 15000,
        promptText: 'Second',
        confidence: 1,
        sourceLineNumbers: [5, 6] as [number, number],
      },
      {
        index: 1,
        startMs: 0,
        endMs: 8000,
        promptText: 'First',
        confidence: 1,
        sourceLineNumbers: [1, 2] as [number, number],
      },
    ];

    const reordered = autoReorderSegments(segments);
    expect(reordered[0]?.index).toBe(1);
    expect(reordered[0]?.startMs).toBe(0);
    expect(reordered[1]?.index).toBe(2);
    expect(reordered[1]?.startMs).toBe(10000);
  });
});
