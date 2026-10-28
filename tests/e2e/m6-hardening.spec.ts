import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as fs from 'node:fs';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, 'base64');

function createWavBuffer(durationSec = 2): Buffer {
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

test.describe('M6 Hardening, Error Resilience & Accessibility Suite', () => {
  const screenshotsDir = path.resolve(process.cwd(), 'tests', 'artifacts');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  test('Error Injection: Corrupt media files and storage quota error recovery', async ({ page }) => {
    test.setTimeout(45000);
    const unhandledErrors: string[] = [];
    page.on('pageerror', (err) => unhandledErrors.push(err.message));

    // 1. Create project
    await page.goto('/w/default');
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill('M6 Corrupt Ingest Test');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/.*\/p\/proj-.*/);

    // 2. Ingest 1 valid image + 1 corrupt 0-byte image + 1 corrupt audio file
    const corruptImgFile = {
      name: 'corrupt-scene.png',
      mimeType: 'image/png',
      buffer: Buffer.from('NOT_A_VALID_PNG_HEADER_DATA'),
    };
    const validImgFile = {
      name: 'valid-scene.png',
      mimeType: 'image/png',
      buffer: TINY_PNG_BUFFER,
    };
    await page.locator('input[type="file"][accept*="image"]').first().setInputFiles([validImgFile, corruptImgFile]);

    const corruptAudioFile = {
      name: 'corrupt-voice.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('BAD_MP3_BITSTREAM'),
    };
    await page.locator('input[type="file"][accept*="audio"]').first().setInputFiles(corruptAudioFile);

    // 3. Verify ValidationPanel catches corrupt media
    await expect(page.getByText(/unreadable \/ corrupt file/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /remove corrupt files/i })).toBeVisible();

    // 4. Click "Remove Corrupt Files"
    await page.getByRole('button', { name: /remove corrupt files/i }).click();
    await expect(page.getByText(/unreadable \/ corrupt file/i)).not.toBeVisible();
    await expect(page.getByRole('button', { name: /remove corrupt files/i })).not.toBeVisible();
    await expect(page.getByText('valid-scene.png')).toBeVisible();

    expect(unhandledErrors).toHaveLength(0);
  });

  test('Error Injection: Corrupt Project Schema in IndexedDB and raw JSON recovery', async ({ page }) => {
    test.setTimeout(45000);
    const unhandledErrors: string[] = [];
    page.on('pageerror', (err) => unhandledErrors.push(err.message));

    await page.goto('/w/default');
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();

    // 1. Inject a corrupt project record directly into Dexie
    const corruptProjId = 'proj-corrupt-test-schema';
    await page.evaluate(async (id) => {
      // @ts-expect-error indexedDB access
      const request = indexedDB.open('kompanion-db');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['projects'], 'readwrite');
        const store = tx.objectStore('projects');
        store.put({
          id,
          schemaVersion: 1,
          workspaceId: 'default',
          name: 'Corrupted Injected Project',
          timeline: { clips: 'INVALID_CLIPS_FORMAT_STRING' }, // fails Zod schema
          settings: { canvas: '16:9' },
          updatedAt: Date.now(),
        });
      };
    }, corruptProjId);

    // 2. Reload projects grid and verify recovery banner appears
    await page.reload();
    await expect(page.getByText(/corrupt project detected/i)).toBeVisible();
    await expect(page.getByText(corruptProjId)).toBeVisible();

    // 3. Test Download Raw JSON
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download raw json/i }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(corruptProjId);

    // 4. Test Dismiss banner
    await page.getByRole('button', { name: new RegExp(`dismiss recovery banner for ${corruptProjId}`, 'i') }).click();
    await expect(page.getByText(/corrupt project detected/i)).not.toBeVisible();

    // 5. Navigate directly to corrupt project route -> CorruptProjectView appears
    await page.goto(`/w/default/p/${corruptProjId}`);
    await expect(page.getByText('Corrupt Project Data Detected')).toBeVisible();
    await page.getByRole('button', { name: /back to projects/i }).click();
    await expect(page).toHaveURL(/.*\/w\/default/);

    // Clean up injected corrupt project so it doesn't pollute subsequent test runs
    await page.evaluate(async (id) => {
      // @ts-expect-error indexedDB access
      const request = indexedDB.open('kompanion-db');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['projects'], 'readwrite');
        tx.objectStore('projects').delete(id);
      };
    }, corruptProjId);

    expect(unhandledErrors).toHaveLength(0);
  });

  test('Autosave Persistence & Mid-Export Cancellation Recovery', async ({ page }) => {
    test.setTimeout(60000);
    const unhandledErrors: string[] = [];
    page.on('pageerror', (err) => unhandledErrors.push(err.message));

    // 1. Create project with 2 clips and audio
    await page.goto('/w/default');
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill('M6 Autosave & Export Test');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/.*\/p\/proj-.*/);

    const imageFiles = [
      { name: 'scene-01.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
      { name: 'scene-02.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER },
    ];
    await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(imageFiles);

    const audioFile = {
      name: 'voice.wav',
      mimeType: 'audio/wav',
      buffer: createWavBuffer(4),
    };
    await page.locator('input[type="file"][accept*="audio"]').first().setInputFiles(audioFile);

    const script = `## Image 1 — 00:00–00:02\nNarration 1\n\n## Image 2 — 00:02–00:04\nNarration 2`;
    await page.getByLabel(/raw script text input/i).fill(script);
    await page.getByRole('button', { name: /proceed to script review/i }).first().click();
    await page.getByRole('button', { name: /accept and build timeline/i }).first().click();

    await expect(page.getByLabel('Timeline Canvas Preview')).toBeVisible();

    // 2. Select Clip #1 and perform timeline duplicate action
    const clip1 = page.locator('[data-clip-id]').first();
    await clip1.click();
    await page.getByRole('button', { name: /duplicate clip/i }).click();

    // Should now have 3 clips
    const countAfterSplit = await page.locator('[data-clip-id]').count();
    expect(countAfterSplit).toBe(3);

    // 3. Verify Autosave status transitions to 'Saved'
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // 4. Test Page Reload Persistence
    await page.reload();
    await expect(page.getByLabel('Timeline Canvas Preview')).toBeVisible();
    const countAfterReload = await page.locator('[data-clip-id]').count();
    expect(countAfterReload).toBe(3);
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // 5. Test Export Modal & Cancellation
    await page.getByRole('button', { name: 'Export Video' }).click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.getByRole('button', { name: /start export/i }).click();
    await expect(modal.getByRole('button', { name: /cancel export/i })).toBeVisible();

    // Cancel mid-export
    await modal.getByRole('button', { name: /cancel export/i }).click();
    await expect(modal.getByRole('button', { name: /start export/i })).toBeVisible();
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible();
    await expect(page.getByLabel('Timeline Canvas Preview')).toBeVisible();

    expect(unhandledErrors).toHaveLength(0);
  });

  test('Accessibility Audit across all routes and modals (WCAG 2.2 AA)', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('/w/default');
    await page.addScriptTag({ path: axeSourcePath });

    const audit = async (contextName: string) => {
      const results = await page.evaluate(async () => {
        // @ts-expect-error axe is injected globally
        return await window.axe.run(document.body, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
        });
      });
      const violations = results.violations.filter(
        (v: { impact: string }) => v.impact === 'critical' || v.impact === 'serious'
      );
      expect(violations, `Axe violations in ${contextName}`).toHaveLength(0);
    };

    // 1. Audit Home / Workspaces
    await audit('Workspaces Page');

    // 2. Audit Settings Modal
    await page.getByRole('button', { name: /open application settings/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await audit('Settings Modal');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
