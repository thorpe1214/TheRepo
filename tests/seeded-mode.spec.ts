import { test, expect } from '@playwright/test';
import * as path from 'path';

const CURRENT_STEP = 'steps/Step 104 — Seeded single-property mode.html';
const SAMPLE_CSV = path.resolve(__dirname, '../data/rentroll_sample.csv');

test.describe('Seeded Single-Property Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to page first to establish context
    await page.goto(`http://localhost:8000/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');

    // Clear storage after page load
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('loads seeds when localStorage is empty', async ({ page }) => {
    // Check that seeds are loaded
    const seedsLoaded = await page.evaluate(() => {
      return !!(window.__seedPropertySetup && window.__seedFPMap);
    });
    expect(seedsLoaded).toBe(true);

    // Check that property setup is written to localStorage
    const propertySetup = await page.evaluate(() => {
      return localStorage.getItem('rm:propertySetup:floorplans');
    });
    expect(propertySetup).toBeTruthy();

    const parsedSetup = JSON.parse(propertySetup);
    expect(parsedSetup.property_id).toBe('thorpe-gardens');
    expect(parsedSetup.floorplans).toHaveLength(4);
  });

  test('auto-maps floorplan labels using seeds', async ({ page }) => {
    // Upload CSV with seeded floorplan labels
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(SAMPLE_CSV);

    // Should show confirm overlay (not mapping table)
    await expect(page.locator('#confirmOverlay')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Mapping loaded from seeds')).toBeVisible();

    // Should show detected columns
    await expect(page.locator('text=Detected Columns')).toBeVisible();
    await expect(page.locator('text=• Unit')).toBeVisible();
    await expect(page.locator('text=• Status')).toBeVisible();
    await expect(page.locator('text=• Floorplan Label')).toBeVisible();
  });

  test('shows mapping table for unmapped labels', async ({ page }) => {
    // Create a CSV with unmapped floorplan labels
    const unmappedCSV = `UnitID,Floorplan,Status,CurrentRent
101,Unknown Floorplan,Vacant,1200
102,Another Unknown,Occupied,1500`;

    // Upload via file input (simulate file upload)
    await page.evaluate(csvContent => {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test.csv', { type: 'text/csv' });
      const input = document.getElementById('file');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, unmappedCSV);

    // Should show mapping table (not confirm overlay)
    await expect(page.locator('text=Column Mapping')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#confirmOverlay')).not.toBeVisible();
  });

  test('confirm overlay allows proceeding with upload', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(SAMPLE_CSV);

    // Wait for confirm overlay
    await expect(page.locator('#confirmOverlay')).toBeVisible({ timeout: 5000 });

    // Click Confirm
    await page.locator('#confirmUpload').click();

    // Should proceed to normal flow
    await expect(page.locator('#confirmOverlay')).not.toBeVisible();
    await expect(page.locator('text=Trending Occupancy')).toBeVisible({ timeout: 5000 });
  });

  test('edit mapping returns to mapping table', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(SAMPLE_CSV);

    // Wait for confirm overlay
    await expect(page.locator('#confirmOverlay')).toBeVisible({ timeout: 5000 });

    // Click Edit Mapping
    await page.locator('#editMapping').click();

    // Should show mapping table
    await expect(page.locator('#confirmOverlay')).not.toBeVisible();
    await expect(page.locator('text=Column Mapping')).toBeVisible();
  });

  test('uses saved mapping on subsequent uploads', async ({ page }) => {
    // First upload - should use seeds
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(SAMPLE_CSV);

    await expect(page.locator('#confirmOverlay')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Mapping loaded from seeds')).toBeVisible();

    // Confirm first upload
    await page.locator('#confirmUpload').click();
    await page.waitForTimeout(1000);

    // Second upload - should use saved mapping
    await fileInput.setInputFiles(SAMPLE_CSV);

    await expect(page.locator('#confirmOverlay')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Mapping loaded')).toBeVisible();
    await expect(page.locator('text=Mapping loaded from seeds')).not.toBeVisible();
  });
});
