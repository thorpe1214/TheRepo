# Browser Checks for RMS Simulator

This directory contains automated checks for verifying Step 109 simulator functionality.

## Path A: Browser Tab Injection (Recommended)

Run checks directly in your open browser tab showing Step 109.

### Usage

1. **Open Step 109 in your browser** (local server or file URL)

2. **Open DevTools Console** (F12 or Cmd+Option+I)

3. **Copy and paste the entire contents of `tools/browser-checks.js`** into the console and press Enter

   OR if you have the file served:

   ```javascript
   // Load and execute
   const script = await fetch('/tools/browser-checks.js').then(r => r.text());
   eval(script);
   ```

4. **View Results:**
   - A floating black panel appears in the bottom-right corner with PASS/FAIL status
   - Detailed JSON summary is logged to the console

### What Gets Checked

- ✅ **API Presence**: Verifies `window.RMS.init`, `window.RMS.advanceDays`, and `window.RMS.getBoxScore` exist
- ✅ **Determinism**: Same seed + steps produces identical box scores
- ✅ **Pause Freeze**: History length doesn't grow while paused
- ✅ **Continue Append**: History grows again after resuming
- ✅ **Settings Forward-Only**: Settings changed while paused only affect future ticks, not past history
- ✅ **Dev Panel Hidden**: Dev panel retreats on non-localhost environments

### Re-running Checks

The script automatically prevents duplicate runs. To re-run, refresh the page first, or manually clear:

```javascript
delete window.__RMS_BROWSER_CHECKS__;
// Then paste the script again
```

---

## Path B: Playwright Automated Test

Run headless checks via Playwright (useful for CI or quick verification).

### Prerequisites

```bash
# Install dependencies if not already present
npm install

# Serve the repo root (in a separate terminal)
npx http-server -p 4173 .
# OR
pnpm dlx serve -l 4173 .
```

### Run Test

```bash
npm test -- tests/simulator.browser.spec.ts
# OR if using pnpm
pnpm test tests/simulator.browser.spec.ts
```

The test will:
- Open Step 109 in a headless browser
- Run all checks automatically
- Print JSON summary to console
- Fail the test suite if any check fails

---

## Troubleshooting

### "RMS API missing" errors

- Ensure Step 109 page is fully loaded before running checks
- Verify simulator is initialized (click "Init" button if needed)

### History length checks fail

- Checks infer history length from Chart.js data if available
- If chart isn't exposed globally, checks gracefully skip (PASS on null)
- This is expected behavior if `window.__rmsChart` isn't exposed

### Pause/Continue buttons not found

- Checks try multiple selectors: `[data-action="pause"]`, `#pauseBtn`, `button[aria-label*="Pause"]`
- Also attempts `window.RMS.pause()` and `window.RMS.continue()` if buttons aren't found
- If neither work, those checks will FAIL (expected if API isn't implemented)

### Dev panel check always passes on localhost

- This is intentional: dev panel SHOULD be visible on localhost
- Check only fails if dev panel is visible on non-localhost hosts

---

## Notes

- Checks are **non-invasive**: they only read values and make temporary UI changes
- No localStorage data is deleted
- Settings may be temporarily tweaked during checks but should auto-restore
- The floating panel persists until page refresh (intentional for review)

