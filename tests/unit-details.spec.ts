import { test, expect } from '@playwright/test';

const CURRENT_STEP = 'Step 94 — Fix unit-level Details expand (a11y + test).html';

test.describe('Unit Details Expand/Collapse', () => {
  test('unit details toggle functionality exists', async ({ page }) => {
    // Navigate to current step
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');
    
    // Verify the unit detail box structure exists
    const unitDetailBox = page.locator('#unitDetailBox');
    await expect(unitDetailBox).toBeAttached();
    
    // Verify the close button exists
    const closeButton = page.locator('#udbClose');
    await expect(closeButton).toBeAttached();
    
    // Verify the detail box has proper ARIA attributes
    await expect(unitDetailBox).toHaveAttribute('role', 'dialog');
    await expect(unitDetailBox).toHaveAttribute('aria-modal', 'true');
    
    // Verify the unit pricing section exists
    const unitPricingSection = page.locator('#unitPricingSection');
    await expect(unitPricingSection).toBeAttached();
  });

  test('unit detail box CSS and accessibility attributes', async ({ page }) => {
    // Navigate to current step
    await page.goto(`/${CURRENT_STEP}`);
    await page.waitForLoadState('networkidle');
    
    // Check that the detail box is initially hidden
    const unitDetailBox = page.locator('#unitDetailBox');
    await expect(unitDetailBox).toHaveClass(/hidden/);
    
    // Verify close button has proper aria-label
    const closeButton = page.locator('#udbClose');
    await expect(closeButton).toHaveAttribute('aria-label', 'Close');
  });
});
