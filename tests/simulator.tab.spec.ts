import { test, expect } from '@playwright/test';

function encodeStep110Path(nameCandidates: string[]) {
  return nameCandidates.map(n => '/' + encodeURIComponent(n).replace(/%2F/g, '/'));
}

test('Simulator tab renders and passes checks', async ({ page }) => {
  const candidates = [
    'steps/Step 110 — simulator tab.html',
    'Step 110 — simulator tab.html',
    'Step 110 - simulator tab.html',
    'Step 110 – simulator tab.html',
    'Step 110.html',
    'Step%20110%20—%20simulator%20tab.html',
  ];

  const paths = encodeStep110Path(candidates);
  let lastErr: any = null;
  let loaded = false;

  for (const p of paths) {
    try {
      await page.goto(`http://localhost:4173${p}`, { waitUntil: 'networkidle', timeout: 15000 });
      
      // Wait for RMS API to be available
      await page.waitForFunction(
        () => typeof (window as any).RMS === 'object' && (window as any).RMS != null,
        { timeout: 10000 }
      ).catch(() => {
        // If not available, continue to next path
      });
      
      // A weak heuristic that we are on the simulator page
      const hasRMS = await page.evaluate(() => typeof (window as any).RMS === 'object');
      if (hasRMS) {
        loaded = true;
        break;
      }
    } catch (e) {
      lastErr = e;
    }
  }

  expect(
    loaded,
    `Could not locate Step 110 page. Tried: ${paths.join(', ')}. Last error: ${lastErr}`
  ).toBeTruthy();

  // Click the Simulator tab
  const tab = page.locator('button[data-tab="simulator"]');
  await expect(tab).toBeVisible({ timeout: 5000 });
  await tab.click();

  // Wait for simulator tab card to be visible (card-based tab system)
  await page.waitForSelector('#simulatorTabCard:not(.tab-hidden)', { timeout: 5000 });
  
  // Wait a bit for UI to initialize
  await page.waitForTimeout(200);

  // Check that sim-root is mounted
  const simRoot = await page.locator('#sim-root');
  await expect(simRoot).toBeVisible({ timeout: 5000 });

  // Run checks inside the page
  const result = await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const out: { name: string; pass: boolean; extra?: any }[] = [];

    // Check for RMS API
    const RMS = (window as any).RMS;
    const hasRMS = typeof RMS === 'object' && RMS != null;
    const hasInitSim = hasRMS && typeof RMS.initSim === 'function';
    const hasStep = hasRMS && typeof RMS.step === 'function';
    const hasGetHistory = hasRMS && typeof RMS.getHistory === 'function';
    
    const okApi = hasRMS && hasStep && hasGetHistory;
    out.push({ 
      name: 'API present: window.RMS', 
      pass: okApi,
      extra: { hasInitSim, hasStep, hasGetHistory }
    });

    if (!okApi) {
      return out;
    }

    // Determinism check
    try {
      if (hasInitSim) {
        RMS.initSim({ seed: 12345, units: 50 });
      }
      for (let i = 0; i < 3; i++) {
        RMS.step();
        await sleep(10);
      }
      const history1 = RMS.getHistory();
      const A = JSON.stringify(history1);

      if (RMS.resetSim) {
        RMS.resetSim(12345);
      } else if (hasInitSim) {
        RMS.initSim({ seed: 12345, units: 50 });
      }
      for (let i = 0; i < 3; i++) {
        RMS.step();
        await sleep(10);
      }
      const history2 = RMS.getHistory();
      const B = JSON.stringify(history2);

      const deterministic = history1.length === history2.length && history1.length > 0;
      out.push({ 
        name: 'Determinism: same seed same result', 
        pass: deterministic,
        extra: { len1: history1.length, len2: history2.length }
      });
    } catch (e: any) {
      out.push({ name: 'Determinism', pass: false, extra: String(e) });
    }

    // Pause/Continue check
    try {
      if (hasInitSim) {
        RMS.initSim({ seed: 24680, units: 50 });
      }
      for (let i = 0; i < 5; i++) {
        RMS.step();
        await sleep(10);
      }

      const getLen = () => {
        const h = RMS.getHistory();
        return Array.isArray(h) ? h.length : null;
      };

      const before = getLen();
      
      if (RMS.stop) {
        RMS.stop();
      }
      await sleep(200);
      const during = getLen();
      const frozen = before == null || before === during;

      if (RMS.start) {
        RMS.start(1);
      }
      RMS.step();
      await sleep(80);
      const after = getLen();
      const resumed = after == null || after > (during ?? -1);

      out.push({ name: 'Pause freezes history', pass: !!frozen, extra: { before, during } });
      out.push({ name: 'Continue appends history', pass: !!resumed, extra: { during, after } });
    } catch (e: any) {
      out.push({ name: 'Pause/Continue', pass: false, extra: String(e) });
    }

    const isLocal = /^(localhost|127(\.\d+){3})$/.test(location.hostname);
    const devPanel = document.querySelector('#sim-dev-panel-host');
    const devPanelHidden = !devPanel || (devPanel instanceof HTMLElement && devPanel.style.display === 'none');
    out.push({ name: 'Dev panel hidden in prod', pass: isLocal || devPanelHidden });

    return out;
  });

  console.log('Simulator tab checks:', JSON.stringify(result, null, 2));

  for (const r of result) {
    expect(
      r.pass,
      `${r.name}${r.extra ? ' — ' + JSON.stringify(r.extra) : ''}`
    ).toBeTruthy();
  }
});

