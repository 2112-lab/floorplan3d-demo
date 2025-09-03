import { test, expect } from '@playwright/test';

test.describe('Component Panel - basic interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 30000 });
    // allow app to initialize
    await page.waitForTimeout(1000);
  });

  test('should render component panel and allow UI interactions', async ({ page }) => {
  // Switch to Component mode using nav button
  const compNav = page.getByTestId('nav-button-component');
  await expect(compNav).toBeVisible({ timeout: 10000 });
  await compNav.click();

  // Ensure the component panel is present
  const panel = page.getByTestId('component-panel').first();
  await expect(panel).toBeVisible({ timeout: 10000 });

    // Library select should be visible
    const libSelect = page.getByTestId('library-item-select');
    await expect(libSelect).toBeVisible();

    // Size radio buttons exist and can be toggled
    const smallRadio = page.getByTestId('size-small-radio');
    const mediumRadio = page.getByTestId('size-medium-radio');
    const largeRadio = page.getByTestId('size-large-radio');

    await expect(smallRadio).toBeVisible();
    await expect(mediumRadio).toBeVisible();
    await expect(largeRadio).toBeVisible();

    // Click large and verify it becomes checked
    await largeRadio.click();
    await expect(largeRadio).toBeChecked();

    // Load button should exist and be interactable
    const loadBtn = page.getByTestId('load-component-btn');
    await expect(loadBtn).toBeVisible();
    // Try clicking load (the app will handle event) - ensure no exception
    await loadBtn.click();

    // Basic smoke: check Reset button exists (no testid) by text
    await expect(page.getByRole('button', { name: /Reset/i })).toBeVisible();
  });
});

test.describe('Wiring viewport - export smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 30000 });
    await page.waitForTimeout(1000);
  });

  test('should open wiring export window from viewport controls', async ({ page }) => {
  // Switch to Wiring mode using nav button
  const wiringNav = page.getByTestId('nav-button-wiring');
  await expect(wiringNav).toBeVisible({ timeout: 10000 });
  await wiringNav.click();

  // Wait for wiring mode panel to appear
  await expect(page.getByTestId('wiring-mode-panel').first()).toBeVisible({ timeout: 10000 });

  // Click the export button inside the wiring viewport controls (use first instance)
  const exportBtn = page.getByTestId('wiring-viewport-export-btn').first();
  await expect(exportBtn).toBeVisible();
  await exportBtn.click();

    // Expect the export dialog title to appear
  const exportTitle = page.getByTestId('wiring-export-title').first();
  await expect(exportTitle).toBeVisible({ timeout: 5000 });

    // Verify a few export format controls exist (if present in UI)
  const svgOpt = page.getByTestId('wiring-export-format-svg').first();
  const jsonOpt = page.getByTestId('wiring-export-format-json').first();
  await expect(svgOpt).toBeVisible();
  await expect(jsonOpt).toBeVisible();

    // Close the dialog if the close button exists
    const closeBtn = page.getByTestId('wiring-export-close-btn').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(exportTitle).not.toBeVisible({ timeout: 3000 });
    }
  });
});
