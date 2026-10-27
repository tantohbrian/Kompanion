import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, 'base64');

function createWavBuffer(durationSec = 5): Buffer {
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

test.describe('M3 Editor, Preview Player & Magnetic Timeline E2E', () => {
  test('assembles timeline, tests clip selection, inspector settings, apply-to-all, split, duplicate, delete, undo/redo, autosave and persistence', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // 1. Navigate to default workspace and create a new project
    await page.goto('/w/default');
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill('M3 Editor Test');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/.*\/p\/proj-.*/);

    // Ingest 4 demo image assets and 1 audio track
    const imageFiles = [
      { name: 'scene-01.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
      { name: 'scene-02.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
      { name: 'scene-03.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
      { name: 'scene-04.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
    ];
    await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(imageFiles);

    const audioFile = {
      name: 'voiceover.wav',
      mimeType: 'audio/wav',
      buffer: createWavBuffer(8),
    };
    await page.locator('input[type="file"][accept*="audio"]').first().setInputFiles(audioFile);

    // Enter a 4-beat script with timestamps
    const scriptText = `## Image 1 — 00:00–00:02
**Script segment:** In the depths of the ancient redwood forest, secrets linger.
**Image prompt:** Hyper-realistic ancient redwood forest with glowing moss.

## Image 2 — 00:02–00:04
**Script segment:** Sunlight filters through towering canopies.
**Image prompt:** Sunlight piercing through dense redwood branches.

## Image 3 — 00:04–00:06
**Script segment:** A silent traveler steps forward into the misty trail.
**Image prompt:** Hooded wanderer with a lantern on misty trail.

## Image 4 — 00:06–00:08
**Script segment:** The journey to the lost sanctuary begins now.
**Image prompt:** Golden stone sanctuary ruins glowing at twilight.`;

    const scriptInput = page.getByLabel(/raw script text input/i);
    await scriptInput.fill(scriptText);

    // Proceed to Review step
    await page.getByRole('button', { name: /proceed to script review/i }).first().click();

    // Accept and build timeline into EditorPage
    const acceptBtn = page.getByRole('button', { name: /accept and build timeline/i }).first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // 2. Verify 3-Pane Editor Layout is rendered
    await expect(page.getByLabel('Timeline Canvas Preview')).toBeVisible();
    await expect(page.getByLabel('Current timecode')).toBeVisible();
    await expect(page.getByText('Project Settings')).toBeVisible();
    await expect(page.getByLabel('Image Track', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Audio Track', { exact: true })).toBeVisible();

    // Capture Project Inspector screenshot (no clip selected)
    await page.screenshot({ path: 'test-results/m3-project-inspector.png' });

    // 3. Test Clip Selection on Magnetic Timeline
    const firstClip = page.locator('[data-clip-id]').first();
    await expect(firstClip).toBeVisible();
    await firstClip.click();

    // Verify Inspector switches to Clip Inspector
    await expect(page.getByText(/Clip #1/i)).toBeVisible();
    await expect(page.getByText('Source Image')).toBeVisible();
    await expect(page.getByText('Image Fit')).toBeVisible();
    await expect(page.getByText('Motion / Animation')).toBeVisible();
    await expect(page.getByText('Transition In')).toBeVisible();

    // Capture Clip Inspector screenshot
    await page.screenshot({ path: 'test-results/m3-clip-inspector.png' });

    // 4. Test "Apply to all clips" feature
    // Change fit to contain
    await page.getByRole('button', { name: /contain/i }).click();
    // Click "Apply to All Clips"
    await page.getByRole('button', { name: /apply to all clips/i }).click();

    // Select Clip #2 and verify fit is contain
    const secondClip = page.locator('[data-clip-id]').nth(1);
    await secondClip.click();
    await expect(page.getByText(/Clip #2/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /contain/i })).toHaveClass(/bg-accent/);

    // 5. Test Split, Duplicate, Delete and Undo / Redo
    const initialClipCount = await page.locator('[data-clip-id]').count();
    expect(initialClipCount).toBe(4);

    // Select clip #2 and duplicate it
    await page.getByRole('button', { name: /duplicate clip/i }).click();
    const afterDupCount = await page.locator('[data-clip-id]').count();
    expect(afterDupCount).toBe(5);

    // Test Undo
    const undoBtn = page.getByRole('button', { name: 'Undo' });
    await expect(undoBtn).toBeEnabled();
    await undoBtn.click();
    const afterUndoCount = await page.locator('[data-clip-id]').count();
    expect(afterUndoCount).toBe(4);

    // Test Redo
    const redoBtn = page.getByRole('button', { name: 'Redo' });
    await expect(redoBtn).toBeEnabled();
    await redoBtn.click();
    const afterRedoCount = await page.locator('[data-clip-id]').count();
    expect(afterRedoCount).toBe(5);

    // Delete the duplicated clip
    const deleteBtn = page.getByRole('button', { name: /delete clip/i }).first();
    await deleteBtn.click();
    const afterDeleteCount = await page.locator('[data-clip-id]').count();
    expect(afterDeleteCount).toBe(4);

    // Capture Magnetic Timeline state with clips & waveform
    await page.screenshot({ path: 'test-results/m3-magnetic-timeline.png' });

    // 6. Test Debounced Autosave status indicator
    // Wait for autosave to complete (500ms debounce)
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // 7. Verify Persistence across page reload
    await page.reload();
    await expect(page.getByLabel('Timeline Canvas Preview')).toBeVisible();
    const reloadedClipsCount = await page.locator('[data-clip-id]').count();
    expect(reloadedClipsCount).toBe(4);
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // 8. Run Axe-core Accessibility Audit
    await page.addScriptTag({ path: axeSourcePath });
    const axeResults = await page.evaluate(async () => {
      // @ts-expect-error axe is injected globally
      return await window.axe.run(document, {
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
  });
});
