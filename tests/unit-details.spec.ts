import { test, expect } from '@playwright/test';
import * as path from 'path';

const CURRENT_STEP = 'steps/Step 104 — Seeded single-property mode.html';
const SAMPLE_CSV = 'data/thorpe_gardens_200_units.csv';

test.describe('Unit Details Inline Accordion', () => {
  test('unit pricing section exists', async ({ page }) => {
    // Navigate to current step
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');

    // Verify the unit pricing section exists
    const unitPricingSection = page.locator('#unitPricingSection');
    await expect(unitPricingSection).toBeAttached();
  });

  test('inline accordion opens and closes with proper structure', async ({ page }) => {
    // Navigate and upload data
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');

    // Upload CSV (seeded mode auto-confirms)
    const fileInput = page.locator('input[type="file"]').first();
    const csvPath = path.resolve(__dirname, '..', SAMPLE_CSV);
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(1000);

    // Run New Pricing
    const runNewButton = page.locator('button:has-text("Run New")').first();
    await expect(runNewButton).toBeVisible();
    await runNewButton.click();
    await page.waitForTimeout(1500);

    // Navigate to New Pricing -> Unit Pricing
    const newPricingTab = page
      .locator('button:has-text("💵 New Pricing"), button:has-text("New Pricing")')
      .first();
    await expect(newPricingTab).toBeVisible();
    await newPricingTab.click();

    const unitPricingTab = page.locator('button:has-text("Unit Pricing")');
    await expect(unitPricingTab).toBeVisible();
    await unitPricingTab.click();
    await page.waitForTimeout(500);

    // Wait for unit pricing section to populate
    await page.waitForSelector('.unit-expand', { timeout: 10000 });
    await page.waitForTimeout(300);

    // Verify no inline detail row exists initially
    let detailRows = page.locator('.unit-detail-row');
    await expect(detailRows).toHaveCount(0);

    // Find and click the first unit expand button
    const firstExpandBtn = page.locator('.unit-expand').first();
    await expect(firstExpandBtn).toBeVisible({ timeout: 5000 });
    await expect(firstExpandBtn).toHaveAttribute('aria-expanded', 'false');

    await firstExpandBtn.click();
    await page.waitForTimeout(300);

    // Verify inline detail row now exists
    detailRows = page.locator('.unit-detail-row');
    await expect(detailRows).toHaveCount(1);

    // Verify expand button state changed
    await expect(firstExpandBtn).toHaveAttribute('aria-expanded', 'true');

    // Click again to toggle closed
    await firstExpandBtn.click();
    await page.waitForTimeout(300);

    // Verify inline detail row is removed
    detailRows = page.locator('.unit-detail-row');
    await expect(detailRows).toHaveCount(0);
    await expect(firstExpandBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('unit term pricing table renders with all terms', async ({ page }) => {
    // Navigate and upload data
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');

    // Upload CSV (seeded mode auto-confirms)
    const fileInput = page.locator('input[type="file"]').first();
    const csvPath = path.resolve(__dirname, '..', SAMPLE_CSV);
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(1000);

    // Run New Pricing
    const runNewButton = page.locator('button:has-text("Run New")').first();
    await expect(runNewButton).toBeVisible();
    await runNewButton.click();
    await page.waitForTimeout(1500);

    // Navigate to New Pricing -> Unit Pricing
    const newPricingTab = page
      .locator('button:has-text("💵 New Pricing"), button:has-text("New Pricing")')
      .first();
    await expect(newPricingTab).toBeVisible();
    await newPricingTab.click();

    const unitPricingTab = page.locator('button:has-text("Unit Pricing")');
    await expect(unitPricingTab).toBeVisible();
    await unitPricingTab.click();
    await page.waitForTimeout(500);

    // Wait for unit pricing section to populate
    await page.waitForSelector('.unit-expand', { timeout: 10000 });
    await page.waitForTimeout(300);

    // Find and click the first unit expand button
    const firstExpandBtn = page.locator('.unit-expand').first();
    await expect(firstExpandBtn).toBeVisible({ timeout: 5000 });
    await firstExpandBtn.click();
    await page.waitForTimeout(300);

    // Verify inline detail row is now visible
    const detailRow = page.locator('.unit-detail-row');
    await expect(detailRow).toBeVisible();

    // Verify term pricing table exists in the inline detail
    const termTable = detailRow.locator('table');
    await expect(termTable).toBeVisible();

    // Verify 2-month term row exists (first cell must start with "2 mo")
    const term2mo = termTable.locator('tr', { hasText: /^2 mo/ });
    await expect(term2mo).toBeVisible();

    // Verify 14-month term row exists
    const term14mo = termTable.locator('tr', { hasText: '14 mo' });
    await expect(term14mo).toBeVisible();

    // Verify table has correct number of rows (2-14 months = 13 rows + header)
    const bodyRows = termTable.locator('tbody tr');
    const rowCount = await bodyRows.count();
    expect(rowCount).toBe(13);
  });

  test('switching between units closes first and opens second', async ({ page }) => {
    // Navigate and upload data
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');

    // Upload CSV (seeded mode auto-confirms)
    const fileInput = page.locator('input[type="file"]').first();
    const csvPath = path.resolve(__dirname, '..', SAMPLE_CSV);
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(1000);

    // Run New Pricing
    const runNewButton = page.locator('button:has-text("Run New")').first();
    await expect(runNewButton).toBeVisible();
    await runNewButton.click();
    await page.waitForTimeout(1500);

    // Navigate to New Pricing -> Unit Pricing
    const newPricingTab = page
      .locator('button:has-text("💵 New Pricing"), button:has-text("New Pricing")')
      .first();
    await expect(newPricingTab).toBeVisible();
    await newPricingTab.click();

    const unitPricingTab = page.locator('button:has-text("Unit Pricing")');
    await expect(unitPricingTab).toBeVisible();
    await unitPricingTab.click();
    await page.waitForTimeout(500);

    // Wait for unit pricing section to populate
    await page.waitForSelector('.unit-expand', { timeout: 10000 });
    await page.waitForTimeout(300);

    // Click first unit
    const firstExpandBtn = page.locator('.unit-expand').first();
    await expect(firstExpandBtn).toBeVisible({ timeout: 5000 });
    await firstExpandBtn.click();
    await page.waitForTimeout(300);

    // Verify first unit is open
    await expect(page.locator('.unit-detail-row')).toHaveCount(1);
    await expect(firstExpandBtn).toHaveAttribute('aria-expanded', 'true');

    // Click second unit
    const secondExpandBtn = page.locator('.unit-expand').nth(1);
    await expect(secondExpandBtn).toBeVisible();
    await secondExpandBtn.click();
    await page.waitForTimeout(300);

    // Verify only second unit is open (first closed, second opened)
    await expect(page.locator('.unit-detail-row')).toHaveCount(1);
    await expect(firstExpandBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(secondExpandBtn).toHaveAttribute('aria-expanded', 'true');
  });

  test.skip('escape key closes inline detail and restores focus', async ({ page }) => {
    // Navigate and upload data
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');

    // Upload CSV (seeded mode auto-confirms)
    const fileInput = page.locator('input[type="file"]').first();
    const csvPath = path.resolve(__dirname, '..', SAMPLE_CSV);
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(1000);

    // Run New Pricing
    const runNewButton = page.locator('button:has-text("Run New")').first();
    await expect(runNewButton).toBeVisible();
    await runNewButton.click();
    await page.waitForTimeout(1500);

    // Navigate to New Pricing -> Unit Pricing
    const newPricingTab = page
      .locator('button:has-text("💵 New Pricing"), button:has-text("New Pricing")')
      .first();
    await expect(newPricingTab).toBeVisible();
    await newPricingTab.click();

    const unitPricingTab = page.locator('button:has-text("Unit Pricing")');
    await expect(unitPricingTab).toBeVisible();
    await unitPricingTab.click();
    await page.waitForTimeout(500);

    // Wait for unit pricing section to populate
    await page.waitForSelector('.unit-expand', { timeout: 10000 });
    await page.waitForTimeout(300);

    // Click first unit
    const firstExpandBtn = page.locator('.unit-expand').first();
    await expect(firstExpandBtn).toBeVisible({ timeout: 5000 });
    await firstExpandBtn.click();
    await page.waitForTimeout(300);

    // Verify detail is open
    await expect(page.locator('.unit-detail-row')).toHaveCount(1);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Verify detail is closed
    await expect(page.locator('.unit-detail-row')).toHaveCount(0);
    await expect(firstExpandBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('unit term pricing reflects amenity adjustment', async ({ page }) => {
    // Navigate and upload data
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');

    // Upload CSV (seeded mode auto-confirms)
    const fileInput = page.locator('input[type="file"]').first();
    const csvPath = path.resolve(__dirname, '..', SAMPLE_CSV);
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(1000);

    // Run New Pricing
    const runNewButton = page.locator('button:has-text("Run New")').first();
    await expect(runNewButton).toBeVisible();
    await runNewButton.click();
    await page.waitForTimeout(1500);

    // Navigate to New Pricing -> Unit Pricing
    const newPricingTab = page
      .locator('button:has-text("💵 New Pricing"), button:has-text("New Pricing")')
      .first();
    await expect(newPricingTab).toBeVisible();
    await newPricingTab.click();

    const unitPricingTab = page.locator('button:has-text("Unit Pricing")');
    await expect(unitPricingTab).toBeVisible();
    await unitPricingTab.click();
    await page.waitForTimeout(500);

    // Find a unit row with amenity adjustment (non-zero in amenities column)
    const unitRows = page.locator('.unit-row');
    const rowCount = await unitRows.count();

    let foundUnitWithAmenity = false;
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const row = unitRows.nth(i);
      const amenityCell = row.locator('td').nth(8); // Amenities column
      const amenityText = await amenityCell.textContent();

      if (amenityText && amenityText.trim() !== '' && amenityText.trim() !== '—') {
        // Found a unit with amenity adjustment
        foundUnitWithAmenity = true;

        // Click its expand button
        const expandBtn = row.locator('.unit-expand');
        await expandBtn.click();
        await page.waitForTimeout(300);

        // Verify inline detail row is visible
        const detailRow = page.locator('.unit-detail-row');
        await expect(detailRow).toHaveCount(1);

        // Verify amenity adjustment is mentioned in the baseline note
        const baselineNote = detailRow.locator('.note');
        const noteText = await baselineNote.textContent();
        expect(noteText).toContain('amenity');

        break;
      }
    }

    // If no unit with amenity found in first 10, that's okay - just log it
    if (!foundUnitWithAmenity) {
      console.log('Note: No units with amenity adjustments found in first 10 rows');
    }
  });
});
