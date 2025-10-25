/**
 * Playwright tests for strict mapping functionality
 * Tests end-to-end strict mapping behavior
 */

import { test, expect } from '@playwright/test';

const CURRENT_STEP = 'steps/Step 103 — Strict mapping lock (single-property mode).html';
const BASELINE_CSV = 'data/rent_roll_baseline.csv';
const NEGATIVE_CSV = 'data/rent_roll_negative_case.csv';

test.describe('Strict Mapping Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:8000/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');
  });

  test('should show Data Settings card in Settings tab', async ({ page }) => {
    // Navigate to Settings tab
    await page.click('[data-tab="settings"]');
    await page.waitForTimeout(500);

    // Check that Data Settings card is visible
    const dataSettingsCard = page.locator('#dataSettingsCard');
    await expect(dataSettingsCard).toBeVisible();

    // Check that strict mapping checkbox exists
    const strictCheckbox = page.locator('#strictMappingEnabled');
    await expect(strictCheckbox).toBeVisible();
    await expect(strictCheckbox).not.toBeChecked();

    // Check that controls are hidden initially
    const controlsDiv = page.locator('#strictMappingControls');
    await expect(controlsDiv).not.toBeVisible();
  });

  test('should enable strict mapping controls when checkbox is checked', async ({ page }) => {
    await page.click('[data-tab="settings"]');
    await page.waitForTimeout(500);

    // Check the strict mapping checkbox
    await page.check('#strictMappingEnabled');
    await page.waitForTimeout(200);

    // Verify controls are now visible
    const controlsDiv = page.locator('#strictMappingControls');
    await expect(controlsDiv).toBeVisible();

    // Check that catalog lock checkbox exists
    const catalogCheckbox = page.locator('#catalogLockEnabled');
    await expect(catalogCheckbox).toBeVisible();

    // Check that capture profile button exists
    const captureBtn = page.locator('#captureProfileBtn');
    await expect(captureBtn).toBeVisible();
  });

  test('should upload baseline CSV successfully when strict mode is disabled', async ({ page }) => {
    // Upload baseline CSV
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(BASELINE_CSV);
    await page.waitForTimeout(1000);

    // Should show mapping table
    const automapDiv = page.locator('#automap');
    await expect(automapDiv).toBeVisible();

    // Confirm mapping
    await page.click('#confirmMapping');
    await page.waitForTimeout(500);

    // Should show success message
    await expect(page.locator('text=Mapping confirmed')).toBeVisible();
  });

  test('should fail upload when strict mode is enabled but no profile exists', async ({ page }) => {
    // Enable strict mapping
    await page.click('[data-tab="settings"]');
    await page.waitForTimeout(500);
    await page.check('#strictMappingEnabled');
    await page.waitForTimeout(200);

    // Go back to home tab
    await page.click('[data-tab="home"]');
    await page.waitForTimeout(500);

    // Try to upload CSV
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(BASELINE_CSV);
    await page.waitForTimeout(1000);

    // Should show error alert
    const alertPromise = page.waitForEvent('dialog');
    const dialog = await alertPromise;
    expect(dialog.message()).toContain('Strict mapping is enabled but no validation profile found');
    await dialog.accept();
  });

  test('should capture profile successfully', async ({ page }) => {
    // First upload a CSV to establish mapping
    await page.click('[data-tab="home"]');
    await page.waitForTimeout(500);

    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(BASELINE_CSV);
    await page.waitForTimeout(1000);

    // Confirm mapping
    await page.click('#confirmMapping');
    await page.waitForTimeout(500);

    // Enable strict mapping
    await page.click('[data-tab="settings"]');
    await page.waitForTimeout(500);
    await page.check('#strictMappingEnabled');
    await page.waitForTimeout(200);

    // Capture profile
    await page.click('#captureProfileBtn');
    await page.waitForTimeout(500);

    // Should show success alert
    const alertPromise = page.waitForEvent('dialog');
    const dialog = await alertPromise;
    expect(dialog.message()).toContain('Profile captured successfully');
    await dialog.accept();

    // Should show profile status
    const profileStatus = page.locator('#profileStatus');
    await expect(profileStatus).toBeVisible();

    // Should show download and clear buttons
    const downloadBtn = page.locator('#downloadProfileBtn');
    const clearBtn = page.locator('#clearProfileBtn');
    await expect(downloadBtn).toBeVisible();
    await expect(clearBtn).toBeVisible();
  });

  test('should validate CSV against captured profile', async ({ page }) => {
    // First capture a profile (reuse from previous test setup)
    await page.click('[data-tab="home"]');
    await page.waitForTimeout(500);

    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(BASELINE_CSV);
    await page.waitForTimeout(1000);

    await page.click('#confirmMapping');
    await page.waitForTimeout(500);

    await page.click('[data-tab="settings"]');
    await page.waitForTimeout(500);
    await page.check('#strictMappingEnabled');
    await page.waitForTimeout(200);

    await page.click('#captureProfileBtn');
    await page.waitForTimeout(500);

    const alertPromise = page.waitForEvent('dialog');
    const dialog = await alertPromise;
    await dialog.accept();

    // Now try to upload the same CSV again
    await page.click('[data-tab="home"]');
    await page.waitForTimeout(500);

    const fileInput2 = page.locator('#file');
    await fileInput2.setInputFiles(BASELINE_CSV);
    await page.waitForTimeout(1000);

    // Should show mapping table (validation passed)
    const automapDiv = page.locator('#automap');
    await expect(automapDiv).toBeVisible();
  });

  test('should fail validation with mismatched CSV', async ({ page }) => {
    // First capture a profile
    await page.click('[data-tab="home"]');
    await page.waitForTimeout(500);

    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(BASELINE_CSV);
    await page.waitForTimeout(1000);

    await page.click('#confirmMapping');
    await page.waitForTimeout(500);

    await page.click('[data-tab="settings"]');
    await page.waitForTimeout(500);
    await page.check('#strictMappingEnabled');
    await page.waitForTimeout(200);

    await page.click('#captureProfileBtn');
    await page.waitForTimeout(500);

    const alertPromise = page.waitForEvent('dialog');
    const dialog = await alertPromise;
    await dialog.accept();

    // Now try to upload a different CSV (negative case)
    await page.click('[data-tab="home"]');
    await page.waitForTimeout(500);

    // Create a CSV with different headers
    const badCsvContent = 'Unit,Floorplan,Status\nA101,S0,Occupied\nA102,S0,Vacant';
    const blob = new Blob([badCsvContent], { type: 'text/csv' });
    const file = new File([blob], 'bad.csv', { type: 'text/csv' });

    // Upload the bad CSV
    const fileInput2 = page.locator('#file');
    await fileInput2.setInputFiles({
      name: 'bad.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(badCsvContent),
    });
    await page.waitForTimeout(1000);

    // Should show validation error
    const alertPromise2 = page.waitForEvent('dialog');
    const dialog2 = await alertPromise2;
    expect(dialog2.message()).toContain('Strict Mapping Validation Failed');
    await dialog2.accept();
  });

  test('should clear profile successfully', async ({ page }) => {
    // First capture a profile
    await page.click('[data-tab="home"]');
    await page.waitForTimeout(500);

    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(BASELINE_CSV);
    await page.waitForTimeout(1000);

    await page.click('#confirmMapping');
    await page.waitForTimeout(500);

    await page.click('[data-tab="settings"]');
    await page.waitForTimeout(500);
    await page.check('#strictMappingEnabled');
    await page.waitForTimeout(200);

    await page.click('#captureProfileBtn');
    await page.waitForTimeout(500);

    const alertPromise = page.waitForEvent('dialog');
    const dialog = await alertPromise;
    await dialog.accept();

    // Now clear the profile
    await page.click('#clearProfileBtn');
    await page.waitForTimeout(500);

    // Confirm clearing
    const confirmPromise = page.waitForEvent('dialog');
    const confirmDialog = await confirmPromise;
    expect(confirmDialog.message()).toContain('Are you sure you want to clear');
    await confirmDialog.accept();

    // Should show success message
    const successPromise = page.waitForEvent('dialog');
    const successDialog = await successPromise;
    expect(successDialog.message()).toContain('Profile cleared successfully');
    await successDialog.accept();

    // Profile status should be hidden
    const profileStatus = page.locator('#profileStatus');
    await expect(profileStatus).not.toBeVisible();
  });

  test('should toggle catalog lock setting', async ({ page }) => {
    await page.click('[data-tab="settings"]');
    await page.waitForTimeout(500);
    await page.check('#strictMappingEnabled');
    await page.waitForTimeout(200);

    // Check catalog lock checkbox
    const catalogCheckbox = page.locator('#catalogLockEnabled');
    await expect(catalogCheckbox).toBeVisible();
    await expect(catalogCheckbox).not.toBeChecked();

    // Check the catalog lock
    await page.check('#catalogLockEnabled');
    await page.waitForTimeout(200);

    // Verify it's checked
    await expect(catalogCheckbox).toBeChecked();

    // Uncheck it
    await page.uncheck('#catalogLockEnabled');
    await page.waitForTimeout(200);

    // Verify it's unchecked
    await expect(catalogCheckbox).not.toBeChecked();
  });

  test('should persist settings across page reloads', async ({ page }) => {
    // Enable strict mapping
    await page.click('[data-tab="settings"]');
    await page.waitForTimeout(500);
    await page.check('#strictMappingEnabled');
    await page.check('#catalogLockEnabled');
    await page.waitForTimeout(200);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to settings
    await page.click('[data-tab="settings"]');
    await page.waitForTimeout(500);

    // Verify settings are persisted
    const strictCheckbox = page.locator('#strictMappingEnabled');
    const catalogCheckbox = page.locator('#catalogLockEnabled');

    await expect(strictCheckbox).toBeChecked();
    await expect(catalogCheckbox).toBeChecked();

    const controlsDiv = page.locator('#strictMappingControls');
    await expect(controlsDiv).toBeVisible();
  });
});
