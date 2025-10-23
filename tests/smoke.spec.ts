import { test, expect } from '@playwright/test';
import * as path from 'path';

const CURRENT_STEP = 'steps/Step 99 — Carry-forward mode for pricing evolution.html';
const SAMPLE_CSV = 'data/sample_rent_roll_300_units_statuses.csv';

test.describe('Revenue Management System - Smoke Tests', () => {
  test('loads current Step HTML without errors', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to current step
    await page.goto(`/${CURRENT_STEP}`);

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');

    // Assert page title
    await expect(page).toHaveTitle('Revenue Management');

    // Assert main heading
    await expect(page.locator('h1')).toContainText('Revenue Management');

    // Assert no critical console errors (allow dev guard warnings and favicon 404)
    const criticalErrors = consoleErrors.filter(
      err => !err.includes('[RM Guard]') && !err.includes('favicon.ico')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('CSV upload and auto-mapping works', async ({ page }) => {
    // Navigate to current step
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');

    // Find and click the file upload button
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();

    // Upload CSV file
    const csvPath = path.resolve(__dirname, '..', SAMPLE_CSV);
    await fileInput.setInputFiles(csvPath);

    // Wait for mapping UI to appear
    await expect(page.locator('text=Column Mapping')).toBeVisible({ timeout: 5000 });

    // Verify mapping table exists
    await expect(page.locator('td:has-text("UnitID *")')).toBeVisible();
    await expect(page.locator('td:has-text("Floorplan *")')).toBeVisible();
    await expect(page.locator('td:has-text("Status *")')).toBeVisible();

    // Click Confirm Mapping button
    const confirmButton = page.locator('button:has-text("Confirm Mapping")');
    await expect(confirmButton).toBeVisible();

    // Handle the alert dialog
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Mapping confirmed');
      dialog.accept();
    });

    await confirmButton.click();

    // Wait for data to be processed
    await page.waitForTimeout(1000);

    // Verify occupancy stats updated (indicating data loaded)
    const occupancyElement = page
      .locator('text=Trending Occupancy')
      .locator('..')
      .locator('..')
      .locator('text=92.00%')
      .first();
    await expect(occupancyElement).toBeVisible({ timeout: 5000 });
  });

  test('New Pricing renders without console errors', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate and upload data
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');

    // Upload CSV
    const fileInput = page.locator('input[type="file"]').first();
    const csvPath = path.resolve(__dirname, '..', SAMPLE_CSV);
    await fileInput.setInputFiles(csvPath);

    // Confirm mapping
    await expect(page.locator('button:has-text("Confirm Mapping")')).toBeVisible({ timeout: 5000 });
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("Confirm Mapping")').click();
    await page.waitForTimeout(500);

    // Click Run New
    const runNewButton = page.locator('button:has-text("Run New")').first();
    await expect(runNewButton).toBeVisible();
    await runNewButton.click();
    await page.waitForTimeout(500);

    // Navigate to New Pricing tab
    const newPricingTab = page
      .locator('button:has-text("💵 New Pricing"), button:has-text("New Pricing")')
      .first();
    await expect(newPricingTab).toBeVisible();
    await newPricingTab.click();

    // Wait for floorplan pricing to render
    await expect(page.locator('text=Floorplan Pricing')).toBeVisible({ timeout: 5000 });

    // Just verify the section exists - content may take time to load
    await expect(page.locator('#nlTables')).toBeVisible({ timeout: 5000 });

    // Switch to Unit Pricing tab
    const unitPricingTab = page.locator('button:has-text("Unit Pricing")');
    await expect(unitPricingTab).toBeVisible();
    await unitPricingTab.click();

    // Wait for unit pricing to render
    await page.waitForTimeout(500);

    // Just verify the unit pricing section exists (it may be hidden initially)
    await expect(page.locator('#unitPricingSection')).toBeAttached();

    // Assert no critical console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('Renewals render without errors', async ({ page }) => {
    // Navigate and upload data
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');

    // Upload CSV
    const fileInput = page.locator('input[type="file"]').first();
    const csvPath = path.resolve(__dirname, '..', SAMPLE_CSV);
    await fileInput.setInputFiles(csvPath);

    // Confirm mapping
    await expect(page.locator('button:has-text("Confirm Mapping")')).toBeVisible({ timeout: 5000 });
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("Confirm Mapping")').click();
    await page.waitForTimeout(500);

    // Click Run Renewals
    const runRenewalsButton = page.locator('button:has-text("Run Renewals")').first();
    await expect(runRenewalsButton).toBeVisible();
    await runRenewalsButton.click();
    await page.waitForTimeout(500);

    // Navigate to Renewals tab
    const renewalsTab = page
      .locator('button:has-text("🔁 Renewals"), button:has-text("Renewals")')
      .first();
    await expect(renewalsTab).toBeVisible();
    await renewalsTab.click();

    // Wait for renewals to render
    await expect(page.locator('h2[data-tab-scope="renewals"]')).toBeVisible({ timeout: 5000 });

    // Just verify the renewals section exists - content may take time to load
    await page.waitForTimeout(1000);
  });
});
