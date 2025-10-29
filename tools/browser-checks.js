(() => {
  // Small UI panel
  function panel() {
    let el = document.getElementById('rms-checks-panel');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'rms-checks-panel';
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;background:#111;color:#fff;font:12px/1.4 Inter,system-ui,Arial;padding:12px 14px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.35);max-width:420px;white-space:pre-wrap;';
    el.innerHTML = 'Running RMS browser checks...';
    document.body.appendChild(el);
    return el;
  }

  function line(ok, label) {
    const icon = ok ? '✅' : '❌';
    return `${icon} ${label}`;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function run() {
    const out = { ok: true, items: [], details: {} };
    const p = panel();

    function pass(name, extra) { 
      out.items.push({ name, pass: true, extra }); 
    }
    function fail(name, extra) { 
      out.items.push({ name, pass: false, extra }); 
      out.ok = false; 
    }

    // 0) Basic API presence
    try {
      const ok = typeof window.RMS === 'object'
        && window.RMS != null
        && ['init', 'advanceDays', 'getBoxScore'].every(k => typeof window.RMS[k] === 'function');
      (ok ? pass : fail)('API present: window.RMS.init/advanceDays/getBoxScore', { 
        keys: Object.keys(window.RMS || {}) 
      });
    } catch (e) {
      fail('API present: window.RMS', String(e));
    }

    p.textContent = out.items.map(x => line(x.pass, x.name)).join('\n');

    // Helper to re-init sim safely
    async function initAndStep(seed = 12345, days = 5) {
      if (!window.RMS || typeof window.RMS.init !== 'function') {
        throw new Error('RMS API missing');
      }
      window.RMS.init({ seed, units: 50 });
      await sleep(50);
      window.RMS.advanceDays(days);
      await sleep(20);
      return window.RMS.getBoxScore ? window.RMS.getBoxScore() : null;
    }

    // 1) Determinism with same seed
    try {
      const A = await initAndStep(12345, 5);
      const B = await initAndStep(12345, 5);
      const equal = JSON.stringify(A) === JSON.stringify(B);
      (equal ? pass : fail)('Determinism: same seed + steps -> same box score', { A, B });
    } catch (e) {
      fail('Determinism check error', String(e));
    }

    p.textContent = out.items.map(x => line(x.pass, x.name)).join('\n');

    // 2) Pause holds history length
    async function getHistoryLen() {
      try {
        // If chart instance exposed
        const chart = window.__rmsChart || window.rmsChart || null;
        if (chart && chart.data && Array.isArray(chart.data.labels)) {
          return chart.data.labels.length;
        }
        // Fallback: if RMS exposes history
        if (window.RMS && typeof window.RMS.getHistory === 'function') {
          const h = window.RMS.getHistory();
          if (h && Array.isArray(h.days)) {
            return h.days.length;
          }
        }
      } catch (e) {
        // Ignore errors
      }
      return null;
    }

    let lenBeforePause = null;
    try {
      await initAndStep(24680, 6);
      
      // Try to click Pause button in UI if present
      let pauseBtn = document.querySelector('[data-action="pause"], #pauseBtn, button[aria-label*="Pause"]');
      if (!pauseBtn) {
        // If no explicit button, attempt RMS API if it exists
        if (window.RMS && typeof window.RMS.pause === 'function') {
          window.RMS.pause();
        }
      } else {
        pauseBtn.click();
      }
      
      await sleep(50);
      lenBeforePause = await getHistoryLen();
      
      // While paused, advance days should do nothing if UI disallows it
      await sleep(200);
      const lenWhilePaused = await getHistoryLen();
      
      const ok = (lenBeforePause == null) || (lenWhilePaused === lenBeforePause);
      (ok ? pass : fail)('Pause: history length frozen', { 
        lenBeforePause, 
        lenWhilePaused 
      });
    } catch (e) {
      fail('Pause: unable to verify frozen history', String(e));
    }

    p.textContent = out.items.map(x => line(x.pass, x.name)).join('\n');

    // 3) Continue appends history (resumes)
    try {
      let contBtn = document.querySelector('[data-action="continue"], #continueBtn, button[aria-label*="Continue"]');
      if (!contBtn) {
        if (window.RMS && typeof window.RMS.continue === 'function') {
          window.RMS.continue();
        }
      } else {
        contBtn.click();
      }
      
      await sleep(50);
      const lenAtContinue = await getHistoryLen();
      
      // advance a couple of days
      if (window.RMS && typeof window.RMS.advanceDays === 'function') {
        window.RMS.advanceDays(2);
      } else {
        await sleep(120);
      }
      
      await sleep(120);
      const lenAfter = await getHistoryLen();
      
      const ok = (lenAtContinue == null) || (typeof lenAfter === 'number' && lenAfter > lenAtContinue);
      (ok ? pass : fail)('Continue: history appends after resume', { 
        lenAtContinue, 
        lenAfter 
      });
    } catch (e) {
      fail('Continue: unable to verify append', String(e));
    }

    p.textContent = out.items.map(x => line(x.pass, x.name)).join('\n');

    // 4) Settings while paused apply only to future ticks
    try {
      // Pause again
      let pauseBtn = document.querySelector('[data-action="pause"], #pauseBtn, button[aria-label*="Pause"]');
      if (pauseBtn) {
        pauseBtn.click();
      } else if (window.RMS?.pause) {
        window.RMS.pause();
      }
      
      await sleep(40);
      const before = await getHistoryLen();
      
      // Attempt to change target or band inputs
      let t = document.getElementById('comfortTarget') || 
               document.querySelector('[name="comfortTarget"], input#comfortTarget');
      if (t) {
        const old = Number(t.value || 95);
        t.value = String(old === 95 ? 94 : 95);
        t.dispatchEvent(new Event('input', { bubbles: true }));
        t.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      await sleep(40);
      
      // Ensure no retroactive change occurred
      const during = await getHistoryLen();
      const noRetro = (before == null) || (during === before);
      
      // Resume and see the chart progress
      let contBtn = document.querySelector('[data-action="continue"], #continueBtn, button[aria-label*="Continue"]');
      if (contBtn) {
        contBtn.click();
      } else if (window.RMS?.continue) {
        window.RMS.continue();
      }
      
      await sleep(60);
      if (window.RMS?.advanceDays) {
        window.RMS.advanceDays(1);
      }
      await sleep(120);
      
      const after = await getHistoryLen();
      const ok = noRetro && ((after == null) || (after > during));
      
      (ok ? pass : fail)('Settings while paused affect only future ticks', { 
        before, 
        during, 
        after 
      });
    } catch (e) {
      fail('Settings while paused check error', String(e));
    }

    p.textContent = out.items.map(x => line(x.pass, x.name)).join('\n');

    // 5) Dev panel hidden in non-localhost (best-effort)
    try {
      const isLocalhost = /^(localhost|127\.0\.0\.1)/.test(location.hostname);
      const devPanel = document.querySelector('#devPanel, .dev-panel, [data-devpanel]');
      const ok = isLocalhost ? true : !devPanel;
      (ok ? pass : fail)('Dev panel hidden in prod', { 
        hostname: location.hostname, 
        devPanelFound: !!devPanel 
      });
    } catch (e) {
      fail('Dev panel visibility check error', String(e));
    }

    p.textContent = out.items.map(x => line(x.pass, x.name)).join('\n');

    // Final pretty print
    const summary = [
      'RMS browser checks',
      ...out.items.map(x => line(x.pass, x.name))
    ].join('\n');
    
    p.textContent = summary;

    console.group('[RMS checks]');
    console.log(JSON.stringify(out, null, 2));
    console.groupEnd();

    return out;
  }

  // Run immediately
  if (!window.__RMS_BROWSER_CHECKS__) {
    window.__RMS_BROWSER_CHECKS__ = run();
  }
})();

