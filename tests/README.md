# Test Suite

## Overview
This directory contains automated tests for the Revenue Management System:
- **`smoke.spec.ts`**: Playwright end-to-end smoke tests
- **`boundaries.spec.ts`**: Jest module boundary tests

## Setup

### Prerequisites
- Node.js 18+ and npm 9+
- Python 3 (for local HTTP server)

### Installation

```bash
# From project root
npm install

# Install Playwright browsers (first time only)
npx playwright install chromium
```

**Note**: If you encounter npm cache permission errors, run:
```bash
sudo chown -R $(whoami) ~/.npm
```

## Running Tests

### All Tests
```bash
npm run test
```
This runs both boundary tests and smoke tests.

### Smoke Tests Only (Playwright)
```bash
npm run smoke
```
- Starts local HTTP server on port 8000
- Opens Step 90 HTML in Chromium
- Uploads sample CSV and verifies full workflow
- Expected runtime: ~5-8 seconds

### Boundary Tests Only (Jest)
```bash
npm run test:boundaries
```
- Verifies module separation (no cross-boundary calls)
- Checks that pricing-unit doesn't call pricing-fp and vice versa
- Expected runtime: <1 second

## Test Coverage

### Smoke Tests (`smoke.spec.ts`)

#### Test 1: Page Load
- ✅ HTML loads without errors
- ✅ Title and heading present
- ✅ No critical console errors

#### Test 2: CSV Upload & Mapping
- ✅ File upload works
- ✅ Column mapping auto-detects
- ✅ "Confirm Mapping" saves successfully
- ✅ Occupancy stats update

#### Test 3: New Pricing
- ✅ "Run New" generates pricing
- ✅ Floorplan cards render
- ✅ Term rows (2-14 months) display
- ✅ Unit Pricing tab switches
- ✅ Unit tables grouped by floorplan
- ✅ Filters (search, vacant, on-notice) present
- ✅ No console errors

#### Test 4: Renewals
- ✅ "Run Renewals" generates renewal pricing
- ✅ Renewals tab renders table
- ✅ Renewal rows display

### Boundary Tests (`boundaries.spec.ts`)

#### Module Separation Checks
- ✅ `pricing-unit.js` doesn't call floorplan rendering
- ✅ `pricing-fp.js` doesn't call unit rendering
- ✅ Helpers don't access DOM
- ✅ Modules only communicate via window globals
- ✅ Dev guards present in both modules

## Debugging Tests

### View Test Results
```bash
# Run with UI mode (interactive)
npx playwright test --ui

# Run with headed browser (visible)
npx playwright test --headed

# Debug specific test
npx playwright test --debug
```

### Common Issues

#### Port 8000 Already in Use
```bash
# Kill existing server
lsof -ti:8000 | xargs kill -9

# Or use different port in playwright.config.ts
```

#### Playwright Browsers Not Installed
```bash
npx playwright install chromium
```

#### Tests Timing Out
- Increase timeout in `playwright.config.ts`
- Check if local server started successfully
- Verify CSV file exists at project root

#### Module Boundary Test Fails
- Check if src/js files exist
- Verify no recent refactoring violated boundaries
- Review ARCHITECTURE.md for separation rules

## Writing New Tests

### Adding Smoke Tests
Edit `smoke.spec.ts`:
```typescript
test('new feature works', async ({ page }) => {
  await page.goto(`/${CURRENT_STEP}`);
  // ... test logic
});
```

### Adding Boundary Tests
Edit `boundaries.spec.ts`:
```typescript
describe('new-module.js', () => {
  it('should not call forbidden functions', () => {
    const content = readModule('new-module.js');
    expect(content).not.toMatch(/forbiddenFunction/);
  });
});
```

## CI/CD Integration

### GitHub Actions (Future)
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install chromium

- name: Run tests
  run: npm run test
```

### Pre-commit Hook
```bash
# Add to .git/hooks/pre-commit
npm run test:boundaries
npm run lint
```

## Performance

Target test runtimes:
- **Boundary tests**: <1 second
- **Smoke tests**: <10 seconds
- **Total**: <15 seconds

Actual runtimes may vary based on machine specs.

## Maintenance

### Update Current Step
When promoting a new Step to stable, update:
1. `CURRENT_STEP` constant in `smoke.spec.ts`
2. This README if test scenarios change
3. Add new test cases for new features

### Update Dependencies
```bash
# Check for updates
npm outdated

# Update Playwright
npm install --save-dev @playwright/test@latest

# Update Jest
npm install --save-dev jest@latest ts-jest@latest
```

---

*For more testing guidelines, see CONTRIBUTING.md*
