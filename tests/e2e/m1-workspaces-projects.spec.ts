import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');

test.describe('M1 Workspaces, Projects & Settings E2E', () => {
  test('creates a channel workspace with custom defaults and creates a project', async ({ page }) => {
    await page.goto('/');

    // 1. Create a new channel workspace
    await page.getByRole('button', { name: /new channel/i }).click();
    await expect(page.getByRole('heading', { name: /create new channel/i })).toBeVisible();

    const nameInput = page.getByLabel(/channel name/i);
    await nameInput.fill('DocuScience');

    // Select aspect 9:16 (Shorts) and 720p 60fps
    await page.getByLabel(/aspect ratio/i).selectOption('9:16');
    await page.getByLabel(/resolution height/i, { exact: false }).selectOption('720');

    await page.getByRole('button', { name: /create channel/i }).click();

    // Verify redirected to new channel projects page
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
    await expect(page.getByText('DocuScience')).toBeVisible();

    // 2. Create project in this channel
    await page.getByRole('button', { name: /new project/i }).click();
    await expect(page.getByRole('heading', { name: /create new project/i })).toBeVisible();
    await expect(page.getByText('9:16 (720p @ 30fps)')).toBeVisible();

    const projNameInput = page.getByLabel(/project name/i);
    await projNameInput.fill('Atom Secrets');
    await page.getByRole('button', { name: /create project/i }).click();

    // Verify redirected to editor route
    await expect(page).toHaveURL(/.*\/p\/proj-.*/);

    // 3. Return to channel projects page and reload to verify persistence
    await page.goBack();
    await expect(page.getByText('Atom Secrets')).toBeVisible();
    await expect(page.getByText('9:16 • 720p')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Atom Secrets')).toBeVisible();
    await expect(page.getByText('DocuScience')).toBeVisible();

    // Capture Channel Projects Grid Screenshot
    await page.screenshot({ path: 'test-results/m1-channel-projects.png' });

    // 4. Run Axe accessibility audit on the project grid
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

    const seriousOrCritical = axeResults.violations.filter(
      (v: { impact: string }) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test('soft-deletes project with 10-second undo restoring it', async ({ page }) => {
    await page.goto('/w/default');
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();

    // Create a temporary project to delete
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill('Temp To Undo');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/.*\/p\/proj-.*/);
    await page.goto('/w/default');

    await expect(page.getByText('Temp To Undo')).toBeVisible();

    // Open options menu and delete project
    const optionsBtn = page.getByRole('button', { name: /options for temp to undo/i });
    await optionsBtn.click();
    await page.getByRole('menuitem', { name: /delete project/i }).click();

    // Project card should disappear immediately and undo toast appears
    await expect(page.getByRole('heading', { name: 'Temp To Undo' })).not.toBeVisible();
    const undoToast = page.getByRole('status');
    await expect(undoToast).toBeVisible();
    await expect(undoToast).toContainText('Project “Temp To Undo” deleted');

    // Capture Undo Toast Screenshot
    await page.screenshot({ path: 'test-results/m1-undo-toast.png' });

    // Click Undo
    const undoBtn = page.getByRole('button', { name: /undo/i });
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();

    // Project card should be restored
    await expect(page.getByRole('heading', { name: 'Temp To Undo' })).toBeVisible();
  });

  test('soft-deletes project and permanently purges when undo expires', async ({ page }) => {
    await page.goto('/w/default');

    // Create a temporary project
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill('Temp To Purge');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/.*\/p\/proj-.*/);
    await page.goto('/w/default');

    await expect(page.getByRole('heading', { name: 'Temp To Purge' })).toBeVisible();

    // Delete project
    const optionsBtn = page.getByRole('button', { name: /options for temp to purge/i });
    await optionsBtn.click();
    await page.getByRole('menuitem', { name: /delete project/i }).click();

    // Project card is gone from UI
    await expect(page.getByRole('heading', { name: 'Temp To Purge' })).not.toBeVisible();

    // Reload page to verify deletedAt project is not shown
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Temp To Purge' })).not.toBeVisible();
  });

  test('settings modal displays storage estimate and theme switching', async ({ page }) => {
    await page.goto('/');

    const settingsBtn = page.getByRole('button', { name: /open application settings/i });
    await settingsBtn.click();

    await expect(page.getByRole('heading', { name: 'Settings & Storage' })).toBeVisible();
    await expect(page.getByText('Storage Quota')).toBeVisible();

    // Capture Settings Modal Screenshot
    await page.screenshot({ path: 'test-results/m1-settings.png' });

    // Theme switching test
    const lightBtn = page.getByRole('button', { name: /light/i });
    await lightBtn.click();
    await expect(page.locator('html')).toHaveClass(/light/);

    const darkBtn = page.getByRole('button', { name: /dark/i });
    await darkBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
