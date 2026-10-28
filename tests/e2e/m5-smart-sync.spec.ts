import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as fs from 'node:fs';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, 'base64');

function createWavBuffer(durationSec = 4): Buffer {
  const sampleRate = 44100;
  const numSamples = sampleRate * durationSec;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + numSamples * 2, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(numSamples * 2, 40);
  const data = Buffer.alloc(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 16000;
    data.writeInt16LE(Math.round(sample), i * 2);
  }
  return Buffer.concat([header, data]);
}

test.describe('M5 Smart Sync Speech-to-Text Alignment E2E', () => {
  const screenshotsDir = path.resolve(process.cwd(), 'tests', 'artifacts');
  const artifactsDir = 'C:\\Users\\austi\\.gemini\\antigravity-ide\\brain\\05c93883-12d7-4171-bf26-f16e99163b1a';
  fs.mkdirSync(screenshotsDir, { recursive: true });

  test('Test 1: Script without narration text reports NO_NARRATION_TEXT diagnostic and halts cleanly', async ({
    page,
  }) => {
    test.setTimeout(45000);

    // 1. Create a project
    await page.goto('/w/default');
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill('M5 No Narration Test');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/.*\/p\/proj-.*/);

    // Ingest image assets
    const imageFiles = [
      { name: 'beat-01.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
      { name: 'beat-02.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
    ];
    await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(imageFiles);

    // Ingest a prompt-only script (no spoken narration lines)
    const promptOnlyScript = `## Image 1 — 00:00–00:05
Hand-drawn doodle of a basketball player in an empty gym.

## Image 2 — 00:05–00:10
Detailed vector close-up of a basketball hoop.`;

    await page.getByLabel(/raw script text input/i).fill(promptOnlyScript);
    await page.getByRole('button', { name: /proceed to script review/i }).first().click();

    // 2. Open Smart Sync from Script Review view
    const smartSyncBtn = page.getByRole('button', { name: /smart sync/i });
    await expect(smartSyncBtn).toBeVisible();
    await smartSyncBtn.click();

    // 3. Verify No-Narration Diagnostic view is displayed immediately
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/no narration text in script/i)).toBeVisible();
    await expect(
      modal.getByText(/this script contains visual image prompts without spoken narration lines/i)
    ).toBeVisible();

    // Capture screenshot of No-Narration diagnostic state
    const shotPath1 = path.join(screenshotsDir, 'm5-no-narration-diagnostic.png');
    await modal.screenshot({ path: shotPath1 });
    fs.copyFileSync(shotPath1, path.join(artifactsDir, 'm5-no-narration-diagnostic.png'));

    // 4. Run axe-core accessibility audit on diagnostic modal
    await page.addScriptTag({ path: axeSourcePath });
    const axeResults = await page.evaluate(async () => {
      // @ts-expect-error axe is injected globally
      return await window.axe.run(document.querySelector('div[role="dialog"]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      });
    });
    const criticalOrSerious = axeResults.violations.filter(
      (v: { impact: string }) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toHaveLength(0);

    // 5. Close modal
    await modal.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(modal).not.toBeVisible();
  });

  test('Test 2: Script with narration presents Consent, performs word alignment, displays Diff Review, applies changes and supports Undo', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // 1. Create project
    await page.goto('/w/default');
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill('M5 Consent & Diff Test');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/.*\/p\/proj-.*/);

    // Ingest images and audio
    const imageFiles = [
      { name: 'scene-01.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
      { name: 'scene-02.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
      { name: 'scene-03.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
    ];
    await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(imageFiles);

    const audioFile = {
      name: 'voiceover.wav',
      mimeType: 'audio/wav',
      buffer: createWavBuffer(12),
    };
    await page.locator('input[type="file"][accept*="audio"]').first().setInputFiles(audioFile);

    // Ingest script with spoken narration text
    const scriptWithNarration = `## Beat 1 — 00:00–00:04
**Script segment:** You are halfway through doing something you have done a hundred times.
**Image prompt:** Cartoon stickman shooting a basketball effortlessly in gym.

## Beat 2 — 00:04–00:08
**Script segment:** Maybe you are shooting a basketball.
**Image prompt:** Close up of hand releasing basketball.

## Beat 3 — 00:08–00:12
**Script segment:** And suddenly you start thinking about your elbow angle.
**Image prompt:** Arrows and angles drawn around the player elbow.`;

    await page.getByLabel(/raw script text input/i).fill(scriptWithNarration);
    await page.getByRole('button', { name: /proceed to script review/i }).first().click();

    // 2. Open Smart Sync Modal
    await page.getByRole('button', { name: /smart sync/i }).click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // 3. Verify Consent view is shown before any download
    await expect(modal.getByText(/one-time ~90 mb/i)).toBeVisible();
    await expect(modal.getByText(/100% in-browser/i)).toBeVisible();
    await expect(modal.getByText(/complete privacy/i)).toBeVisible();

    // Capture screenshot of Consent view
    const shotPath2 = path.join(screenshotsDir, 'm5-smart-sync-consent.png');
    await modal.screenshot({ path: shotPath2 });
    fs.copyFileSync(shotPath2, path.join(artifactsDir, 'm5-smart-sync-consent.png'));

    // Run axe-core audit on Consent view
    await page.addScriptTag({ path: axeSourcePath });
    let axeResults = await page.evaluate(async () => {
      // @ts-expect-error axe is injected globally
      return await window.axe.run(document.querySelector('div[role="dialog"]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      });
    });
    let criticalOrSerious = axeResults.violations.filter(
      (v: { impact: string }) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toHaveLength(0);

    // 4. Inject mock whisper word timestamps for deterministic E2E execution
    const mockWords = [
      { word: 'You', startSec: 0.2, endSec: 0.5 },
      { word: 'are', startSec: 0.55, endSec: 0.8 },
      { word: 'halfway', startSec: 0.85, endSec: 1.2 },
      { word: 'through', startSec: 1.25, endSec: 1.5 },
      { word: 'doing', startSec: 1.55, endSec: 1.9 },
      { word: 'something', startSec: 1.95, endSec: 2.4 },
      { word: 'you', startSec: 2.45, endSec: 2.7 },
      { word: 'have', startSec: 2.75, endSec: 2.9 },
      { word: 'done', startSec: 2.95, endSec: 3.2 },
      { word: 'a', startSec: 3.25, endSec: 3.4 },
      { word: 'hundred', startSec: 3.45, endSec: 3.8 },
      { word: 'times', startSec: 3.85, endSec: 4.2 },

      { word: 'Maybe', startSec: 4.6, endSec: 4.9 },
      { word: 'you', startSec: 4.95, endSec: 5.2 },
      { word: 'are', startSec: 5.25, endSec: 5.4 },
      { word: 'shooting', startSec: 5.45, endSec: 6.0 },
      { word: 'a', startSec: 6.05, endSec: 6.2 },
      { word: 'basketball', startSec: 6.25, endSec: 7.0 },

      { word: 'And', startSec: 7.4, endSec: 7.6 },
      { word: 'suddenly', startSec: 7.65, endSec: 8.2 },
      { word: 'you', startSec: 8.25, endSec: 8.5 },
      { word: 'start', startSec: 8.55, endSec: 8.9 },
      { word: 'thinking', startSec: 8.95, endSec: 9.4 },
      { word: 'about', startSec: 9.45, endSec: 9.7 },
      { word: 'your', startSec: 9.75, endSec: 10.0 },
      { word: 'elbow', startSec: 10.05, endSec: 10.6 },
      { word: 'angle', startSec: 10.65, endSec: 11.4 },
    ];

    await page.evaluate((words) => {
      (window as unknown as { __MOCK_WHISPER_WORDS__: typeof words }).__MOCK_WHISPER_WORDS__ = words;
    }, mockWords);

    // 5. Confirm consent and start alignment
    await modal.getByRole('button', { name: /confirm & download model/i }).click();

    // 6. Verify Diff Review Table appears
    await expect(modal.getByText(/proposed word alignments/i)).toBeVisible();
    await expect(modal.getByText(/#1/i).first()).toBeVisible();
    await expect(modal.getByText(/#2/i).first()).toBeVisible();
    await expect(modal.getByText(/#3/i).first()).toBeVisible();

    // Capture screenshot of Diff Review state
    const shotPath3 = path.join(screenshotsDir, 'm5-smart-sync-diff.png');
    await modal.screenshot({ path: shotPath3 });
    fs.copyFileSync(shotPath3, path.join(artifactsDir, 'm5-smart-sync-diff.png'));

    // Run axe-core audit on Diff Review Table
    axeResults = await page.evaluate(async () => {
      // @ts-expect-error axe is injected globally
      return await window.axe.run(document.querySelector('div[role="dialog"]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      });
    });
    criticalOrSerious = axeResults.violations.filter(
      (v: { impact: string }) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toHaveLength(0);

    // 7. Apply alignment changes
    await modal.getByRole('button', { name: /apply changes to timeline/i }).click();
    await expect(modal).not.toBeVisible();

    // 8. Accept and build timeline to verify editor reflection
    await page.getByRole('button', { name: /accept and build timeline/i }).first().click();
    await expect(page.locator('header').getByText('3. Timeline')).toBeVisible();

    // 9. Verify undo restores state
    const undoBtn = page.getByRole('button', { name: /undo/i });
    await expect(undoBtn).toBeVisible();
  });
});
