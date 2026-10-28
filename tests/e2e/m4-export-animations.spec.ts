import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

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

test.describe('M4 Export & Animations E2E Pipeline', () => {
  test('configures animations & transitions, audits modal accessibility, tests cancellation, completes export, verifies readback and downloads file', async ({
    page,
  }) => {
    test.setTimeout(90000);

    page.on('console', (msg) => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));
    page.on('pageerror', (err) => console.log('[BROWSER UNCAUGHT]:', err.message));

    // 1. Create a new test project
    await page.goto('/w/default');
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill('M4 Export Test');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/.*\/p\/proj-.*/);

    // Ingest 3 image assets and 1 short audio file
    const imageFiles = [
      { name: 'scene-01.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
      { name: 'scene-02.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
      { name: 'scene-03.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
    ];
    await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(imageFiles);

    const audioFile = {
      name: 'voiceover.wav',
      mimeType: 'audio/wav',
      buffer: createWavBuffer(3),
    };
    await page.locator('input[type="file"][accept*="audio"]').first().setInputFiles(audioFile);

    // Enter a 3-beat script with timestamps
    const scriptText = `## Beat 1 — 00:00–00:01
The beginning of the motion journey.

## Beat 2 — 00:01–00:02
Subtle camera pan across the scenery.

## Beat 3 — 00:02–00:03
The final destination unfolds.`;

    const scriptInput = page.getByLabel(/raw script text input/i);
    await scriptInput.fill(scriptText);

    // Proceed to Review step
    await page.getByRole('button', { name: /proceed to script review/i }).first().click();

    // Accept and build timeline into EditorPage
    const acceptBtn = page.getByRole('button', { name: /accept and build timeline/i }).first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // 2. Configure Animations & Transitions on clips in the editor
    await expect(page.getByLabel('Timeline Canvas Preview')).toBeVisible();

    // Select Clip #1 -> set Motion: Ken Burns
    const firstClip = page.locator('[data-clip-id]').first();
    await firstClip.click();
    await expect(page.getByText(/Clip #1/i)).toBeVisible();
    await page.locator('#anim-preset-select').selectOption('ken-burns');

    // Select Clip #2 -> set Motion: Pan, Transition In: Dip to black
    const secondClip = page.locator('[data-clip-id]').nth(1);
    await secondClip.click();
    await expect(page.getByText(/Clip #2/i)).toBeVisible();
    await page.locator('#anim-preset-select').selectOption('pan');
    await page.locator('#trans-preset-select').selectOption('dip-to-black');

    // Select Clip #3 -> set Motion: Pop, Transition In: Crossfade
    const thirdClip = page.locator('[data-clip-id]').nth(2);
    await thirdClip.click();
    await expect(page.getByText(/Clip #3/i)).toBeVisible();
    await page.locator('#anim-preset-select').selectOption('pop');
    await page.locator('#trans-preset-select').selectOption('crossfade');

    // 3. Open Export Modal
    const exportBtn = page.getByRole('button', { name: /export/i });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify modal is displayed
    const modalDialog = page.getByRole('dialog');
    await expect(modalDialog).toBeVisible();
    await expect(page.getByText('Export Project Video')).toBeVisible();

    // Capture screenshot: Configuration State
    await page.screenshot({ path: 'test-results/m4-export-modal-config.png' });

    // 4. Axe-core Accessibility Audit on Export Modal
    await page.addScriptTag({ path: axeSourcePath });
    const axeResults = await page.evaluate(async () => {
      // @ts-expect-error axe is injected globally
      return await window.axe.run('[role="dialog"]', {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      });
    });

    const criticalOrSerious = axeResults.violations.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toHaveLength(0);

    // 5. Test Cancellation Mid-Flight
    // Select 720p preset for fast rendering test
    await page.getByRole('button', { name: /720p30/i }).click();

    // Start export
    const startExportBtn = page.getByRole('button', { name: /start export/i });
    await startExportBtn.click();

    // Verify progress UI is visible
    const cancelBtn = page.getByRole('button', { name: /cancel export/i });
    await expect(cancelBtn).toBeVisible();

    // Capture screenshot: In-Progress / ETA state
    await page.screenshot({ path: 'test-results/m4-export-modal-progress.png' });

    // Click Cancel
    await cancelBtn.click();

    // Verify modal returns to idle config state
    await expect(page.getByRole('button', { name: /start export/i })).toBeVisible();

    // 6. Test Full Export to Completion
    await page.getByRole('button', { name: /start export/i }).click();

    // Wait for export to complete and read-back verification to pass
    await expect(page.getByText('Export Complete & Verified')).toBeVisible({ timeout: 60000 });

    // Verify Mediabunny Read-Back checklist details
    await expect(page.getByText(/Duration: \d+ ms/i)).toBeVisible();
    await expect(page.getByText(/Video Track: H\.264/i)).toBeVisible();
    await expect(page.getByText(/Audio Track: AAC/i)).toBeVisible();
    await expect(page.getByText(/Frame Output Matches renderFrame at 3 timestamps/i)).toBeVisible();

    // Capture screenshot: Verified Completion State
    await page.screenshot({ path: 'test-results/m4-export-modal-complete.png' });

    // 7. Verify Sanitized Output Filename and Download
    // Strip showSaveFilePicker in test browser to test anchor download fallback
    await page.evaluate(() => {
      // @ts-expect-error delete from window
      delete window.showSaveFilePicker;
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download mp4/i }).click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^M4 Export Test-\d{4}-\d{2}-\d{2}\.mp4$/);
  });
});
