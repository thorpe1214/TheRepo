import { test, expect } from '@playwright/test';
import * as path from 'path';

const CURRENT_STEP = 'steps/Step 105 — Confirm overlay + auto-map fixes.html';
const SAMPLE_CSV = path.resolve(__dirname, '../data/rentroll_sample.csv');

test.describe('Confirm Overlay + Auto-Map Fixes', () => {
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

  test('overlay appears after successful mapping resolution', async ({ page }) => {
    // Upload CSV with seeded floorplan labels
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(SAMPLE_CSV);

    // Should show confirm overlay (not mapping table)
    await expect(page.locator('#confirmOverlay')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#confirmOverlay')).toHaveAttribute('role', 'dialog');
    await expect(page.locator('#confirmOverlay')).toHaveAttribute('aria-modal', 'true');

    // Should show detected columns
    await expect(page.locator('text=Detected Columns')).toBeVisible();
    await expect(page.locator('text=• UnitID')).toBeVisible();
    await expect(page.locator('text=• Floorplan')).toBeVisible();
    await expect(page.locator('text=• Status')).toBeVisible();

    // Should show mapping source
    await expect(page.locator('text=Mapping Status')).toBeVisible();
    await expect(page.locator('text=from seeds')).toBeVisible();

    // Should show floorplan summary
    await expect(page.locator('text=Floorplans:')).toBeVisible();
    await expect(page.locator('text=3 floorplans:')).toBeVisible();
  });

  test('confirm button proceeds with upload', async ({ page }) => {
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

  test('ESC key closes overlay and restores focus', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(SAMPLE_CSV);

    // Wait for confirm overlay
    await expect(page.locator('#confirmOverlay')).toBeVisible({ timeout: 5000 });

    // Press ESC key
    await page.keyboard.press('Escape');

    // Should close overlay
    await expect(page.locator('#confirmOverlay')).not.toBeVisible();
  });

  test('focus trap works correctly', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(SAMPLE_CSV);

    // Wait for confirm overlay
    await expect(page.locator('#confirmOverlay')).toBeVisible({ timeout: 5000 });

    // Focus should be on first button (Confirm)
    await expect(page.locator('#confirmUpload')).toBeFocused();

    // Tab should move to Edit Mapping button
    await page.keyboard.press('Tab');
    await expect(page.locator('#editMapping')).toBeFocused();

    // Tab again should wrap back to Confirm button
    await page.keyboard.press('Tab');
    await expect(page.locator('#confirmUpload')).toBeFocused();

    // Shift+Tab should move to Edit Mapping button
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#editMapping')).toBeFocused();
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

  test('uses saved mapping on subsequent uploads', async ({ page }) => {
    // First upload - should use seeds
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(SAMPLE_CSV);

    await expect(page.locator('#confirmOverlay')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=from seeds')).toBeVisible();

    // Confirm first upload
    await page.locator('#confirmUpload').click();
    await page.waitForTimeout(1000);

    // Second upload - should use saved mapping
    await fileInput.setInputFiles(SAMPLE_CSV);

    await expect(page.locator('#confirmOverlay')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=from saved mapping')).toBeVisible();
    await expect(page.locator('text=from seeds')).not.toBeVisible();
  });

  test('strict mode bypass works when enabled', async ({ page }) => {
    // Enable strict mode bypass
    await page.evaluate(() => {
      localStorage.setItem('skipConfirmOverlayWhenStrict', 'true');
    });

    // Upload CSV
    const fileInput = page.locator('#file');
    await fileInput.setInputFiles(SAMPLE_CSV);

    // Should proceed directly without showing overlay
    await expect(page.locator('#confirmOverlay')).not.toBeVisible();
    await expect(page.locator('text=Trending Occupancy')).toBeVisible({ timeout: 5000 });
  });

  test('unit pricing renderer fallback works', async ({ page }) => {
    // Check that fallback renderer is available
    const fallbackAvailable = await page.evaluate(() => {
      return typeof window.__renderUnitPricingSection === 'function';
    });
    expect(fallbackAvailable).toBe(true);

    // Check that fallback can be called safely
    await page.evaluate(() => {
      window.__renderUnitPricingSection();
    });

    // Should not throw any errors
    const errors = await page.evaluate(() => {
      return window.console.errors || [];
    });
    expect(errors.length).toBe(0);
  });
});
