import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');

// 1x1 transparent PNG
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, 'base64');

// Generates a valid WAV PCM buffer for Web Audio decoding
function createWavBuffer(durationSec = 2): Buffer {
  const sampleRate = 44100;
  const numSamples = sampleRate * durationSec;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + numSamples * 2, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  header.writeUInt16LE(2, 32); // BlockAlign
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write('data', 36);
  header.writeUInt32LE(numSamples * 2, 40);
  const data = Buffer.alloc(numSamples * 2);
  // Add a small sine wave so peaks are > 0
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 16000;
    data.writeInt16LE(Math.round(sample), i * 2);
  }
  return Buffer.concat([header, data]);
}

test.describe('M2 Ingest, Script Parser & Review Table E2E', () => {
  test('ingests 60 images with natural sort, audio with waveform, parses script, resolves mismatches and accepts timeline', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Navigate directly to demo project workflow
    await page.goto('/w/default/p/demo-1');

    // Verify initial Ingest step is active
    await expect(page.getByRole('heading', { name: /image assets/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /voiceover audio/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /narration & prompt script/i })).toBeVisible();

    // 1. Upload 60 images in non-natural order (e.g. 10, 1, 2, ... 60)
    const imageFiles = [];
    // Start with 10 first to ensure natural sort puts 1 before 10
    const indices = [10, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = 11; i <= 60; i++) {
      indices.push(i);
    }

    for (const num of indices) {
      imageFiles.push({
        name: `scene-${num}.png`,
        mimeType: 'image/png',
        buffer: TINY_PNG_BUFFER,
      });
    }

    const imageInput = page.locator('input[type="file"][accept*="image"]').first();
    await imageInput.setInputFiles(imageFiles);

    // Wait for all 60 images to appear
    await expect(page.getByText('Image Assets (60)')).toBeVisible({ timeout: 15000 });

    // Verify natural sort order: First item must be scene-1.png (order 1), not scene-10.png
    const firstCaption = page.locator('.truncate p').first();
    await expect(firstCaption).toHaveText('scene-1.png');

    // Capture 60-Image Ingest Grid Screenshot
    await page.screenshot({ path: 'test-results/m2-images-grid.png' });

    // 2. Upload Voiceover Audio (8 seconds)
    const audioBuffer = createWavBuffer(8);
    const audioInput = page.locator('input[type="file"][accept*="audio"]').first();
    await audioInput.setInputFiles([
      {
        name: 'voiceover.wav',
        mimeType: 'audio/wav',
        buffer: audioBuffer,
      },
    ]);

    // Verify audio loaded and total duration displayed (00:08)
    await expect(page.getByText('Voiceover Audio (1)')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('00:08').first()).toBeVisible();

    // Scroll to Audio Section & Capture Waveform Audio Summary Screenshot
    await page.getByText('Voiceover Audio (1)').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/m2-audio-waveform.png' });

    // 3. Paste Script with Timestamps (5 beats, total 6 seconds, leaves 2s gap vs 8s audio)
    const scriptText = `## Image 1 — 00:00–00:01
**Script segment:** The ancient civilization disappeared without a trace.
**Image prompt:** Hyper-realistic cinematic ruins overgrown with glowing ivy.

## Image 2 — 00:01–00:02
**Script segment:** Deep underground, explorers discovered a sealed vault.
**Image prompt:** Heavy obsidian vault doors with intricate geometric engravings.

## Image 3 — 00:02–00:03
**Script segment:** When the door opened, a mysterious signal transmitted.
**Image prompt:** Beam of neon turquoise light piercing through dusty cavern darkness.

## Image 4 — 00:03–00:04
**Script segment:** The frequencies resonated across the planetary crust.
**Image prompt:** Seismic shockwaves rippling across alien desert landscape at twilight.

## Image 5 — 00:04–00:06
**Script segment:** And then, the architects finally answered.
**Image prompt:** Massive monolithic mothership emerging from dramatic storm clouds.`;

    const scriptTextarea = page.getByLabel(/raw script text input/i);
    await scriptTextarea.fill(scriptText);

    // Verify parser detection
    await expect(page.getByText('5 visual beats detected')).toBeVisible();
    await expect(page.getByText(/Markdown Section Prompts/i)).toBeVisible();

    // 4. Inspect Validation Panel
    // There are 60 images vs 5 beats (count mismatch) and 6s script vs 8s audio (audio mismatch)
    await expect(page.getByText(/Asset count mismatch/i)).toBeVisible();
    await expect(page.getByText(/Timeline ends 2s before audio track/i)).toBeVisible();

    // Scroll to Validation Panel & Capture Screenshot
    await page.getByText(/Asset count mismatch/i).scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/m2-validation-panel.png' });

    // Test Fix Action: "Extend Last Clip to Audio End"
    await page.getByRole('button', { name: /extend last clip to audio end/i }).click();
    await expect(page.getByText(/Timeline ends 2s before audio track/i)).not.toBeVisible();

    // 5. Run Axe accessibility audit on Ingest View
    await page.addScriptTag({ path: axeSourcePath });
    const ingestAxe = await page.evaluate(async () => {
      // @ts-expect-error axe is injected globally
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      });
    });
    const ingestViolations = ingestAxe.violations.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(ingestViolations).toHaveLength(0);

    // 6. Proceed to Script Review Screen
    await page.getByRole('button', { name: /proceed to script review/i }).first().click();

    // Verify Review Screen loaded
    await expect(page.getByRole('heading', { name: 'Script Review & Timestamps', level: 1 })).toBeVisible();

    // Verify Mismatch Resolver is surfaced (60 images vs 5 beats)
    await expect(page.getByRole('region', { name: /mismatch resolver/i })).toBeVisible();
    await expect(page.getByText(/60 images, 5 beats/i)).toBeVisible();

    // Capture Mismatch Resolver Screenshot
    await page.screenshot({ path: 'test-results/m2-mismatch-resolver.png' });

    // Test Mismatch Resolver action "Assign Available"
    await page.getByRole('button', { name: /assign available/i }).click();

    // 7. Verify Script Review Table with mapped thumbnails
    const reviewTable = page.getByRole('table', { name: /script review segments/i });
    await expect(reviewTable).toBeVisible();

    // Inline edit: update row 1 prompt text
    const promptInput = page.getByLabel(/Prompt text for beat 1/i);
    await expect(promptInput).toBeVisible();
    await promptInput.fill('Updated prompt for segment 1 with dramatic lighting.');

    // Capture Script Review Table with Thumbnails Screenshot
    await page.screenshot({ path: 'test-results/m2-review-table.png' });

    // Run Axe accessibility audit on Script Review View
    const reviewAxe = await page.evaluate(async () => {
      // @ts-expect-error axe is injected globally
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      });
    });
    const reviewViolations = reviewAxe.violations.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(reviewViolations).toHaveLength(0);

    // 8. Accept Timeline & Generate Video
    await page.getByRole('button', { name: /accept and build timeline/i }).first().click();

    // Verify switched to Timeline view (EditorPage)
    await expect(page.getByRole('button', { name: '3. Timeline' })).toHaveClass(/bg-accent/);

    // Verify clips persist across page reload
    await page.reload();
    await expect(page.getByRole('button', { name: '3. Timeline' })).toHaveClass(/bg-accent/);
  });
});
