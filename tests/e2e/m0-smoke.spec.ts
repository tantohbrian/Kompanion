import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');

test.describe('M0 Foundation Smoke & Accessibility', () => {
  test('loads application shell and renders workspaces page', async ({ page }) => {
    await page.goto('/');

    // Check application title and branding
    await expect(page).toHaveTitle(/Kompanion/);
    await expect(page.getByRole('heading', { name: 'Workspaces', level: 1 })).toBeVisible();

    // Check workspace cards
    await expect(page.getByText('Default Workspace')).toBeVisible();

    // Capture Workspaces View Screenshot
    await page.screenshot({ path: 'test-results/m0-workspaces.png' });

    // Inject axe-core and run accessibility audit
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

  test('navigates to project page and editor route', async ({ page }) => {
    // Navigate to projects view
    await page.goto('/w/default');
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
    await expect(page.getByText('Demo Project')).toBeVisible();

    // Capture Projects View Screenshot
    await page.screenshot({ path: 'test-results/m0-projects.png' });

    // Navigate to editor route
    await page.goto('/w/default/p/demo-1');
    // Switch to Timeline step to view canvas editor
    await page.getByRole('button', { name: '3. Timeline' }).click();
    await expect(page.getByText('Inspector')).toBeVisible();
    await expect(page.getByText('Timeline', { exact: true })).toBeVisible();
    await expect(page.getByText('1920 × 1080 (16:9) Canvas Preview')).toBeVisible();

    // Capture Editor View Screenshot
    await page.screenshot({ path: 'test-results/m0-editor.png' });
  });

  test('opens settings modal and checks theme controls', async ({ page }) => {
    await page.goto('/');

    // Open settings modal
    const settingsBtn = page.getByRole('button', { name: /open application settings/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    await expect(page.getByRole('heading', { name: 'Settings & Storage' })).toBeVisible();
    await expect(page.getByRole('button', { name: /dark/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /light/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /system/i })).toBeVisible();
    await expect(page.getByText('Storage Quota')).toBeVisible();

    // Capture Settings Modal Screenshot
    await page.screenshot({ path: 'test-results/m0-settings.png' });
  });
});
