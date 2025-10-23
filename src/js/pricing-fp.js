/**
 * FLOORPLAN PRICING MODULE
 *
 * Purpose: Computes and renders baseline pricing per floorplan type.
 *
 * Public API (functions attached to window):
 * - renderNewLease(cfg, norm, tState) - Main rendering function
 * - collectNewFloorplanPoints(cfg, norm, tState) - Summary data collection
 * - buildSetupByCode() - Floorplan setup helper
 * - computeDirSmooth(code, fpLabel, cfg, tState, setupByCode) - Direction calculation
 * - startingRentForCode(code) - Starting rent lookup
 *
 * Inputs Expected:
 * - window.propertySetup.floorplans - Floorplan configuration
 * - window.mappedRows - Rent roll data
 * - Configuration settings (comfort target, price response, etc.)
 * - Trending state from computeTrending()
 *
 * Outputs Produced:
 * - Floorplan cards rendered to #nlTables
 * - window.__fpResults - Floorplan baseline data for unit pricing
 * - window.__newPricingRows - Export data
 *
 * Rules of Separation:
 * - MAY: Compute/render baseline per floorplan (referenceBase, referenceTerm, counts)
 * - MAY: Read helpers and common state
 * - MUST NOT: Call unit overlay/detail functions or reach into unit DOM directly
 *
 * Do NOT:
 * - Call unit rendering functions directly (e.g., __renderUnitPricingSection)
 * - Access unit-specific DOM elements (e.g., #unitPricingSection)
 * - Mutate unit-specific state or data structures
 * - Trigger unit-level calculations or filtering
 */

(function () {
  // Carry-forward functionality for pricing evolution testing
  const CARRY_FORWARD_KEY = 'rm_carry_forward_baselines';
  
  function loadCarryForwardBaselines() {
    try {
      const stored = localStorage.getItem(CARRY_FORWARD_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn('[RM] Failed to load carry-forward baselines:', e);
      return null;
    }
  }
  
  function saveCarryForwardBaselines(fpBaselines) {
    try {
      const data = {
        fpBaselines: fpBaselines,
        at: new Date().toISOString(),
        scenario: 'Default'
      };
      localStorage.setItem(CARRY_FORWARD_KEY, JSON.stringify(data));
      console.log('[RM] Saved carry-forward baselines:', fpBaselines);
    } catch (e) {
      console.warn('[RM] Failed to save carry-forward baselines:', e);
    }
  }
  
  function resetCarryForwardBaselines() {
    try {
      localStorage.removeItem(CARRY_FORWARD_KEY);
      console.log('[RM] Reset carry-forward baselines');
    } catch (e) {
      console.warn('[RM] Failed to reset carry-forward baselines:', e);
    }
  }
  
  function getCarryForwardBaseline(code) {
    const stored = loadCarryForwardBaselines();
    return stored && stored.fpBaselines && stored.fpBaselines[code] 
      ? Number(stored.fpBaselines[code]) 
      : null;
  }

  // Helper functions used by floorplan pricing
  function buildSetupByCode() {
    const out = Object.create(null);
    try {
      const fps =
        window.propertySetup && Array.isArray(window.propertySetup.floorplans)
          ? window.propertySetup.floorplans
          : [];
      for (const fp of fps) {
        if (fp && fp.code) {
          out[String(fp.code)] = fp;
        }
      }
    } catch (e) {}
    return out;
  }

  function startingRentForCode(code) {
    try {
      const fps = (window.propertySetup && window.propertySetup.floorplans) || [];
      const fp = fps.find(x => String(x.code || '') === String(code || ''));
      const v = fp && Number(fp.starting_rent ?? fp.reference_ask);
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch (e) {
      return null;
    }
  }

  function buildLowerTierMap(fps) {
    function srOf(x) {
      return (
        Number((x && x.starting_rent) != null ? x.starting_rent : (x && x.reference_ask) || 0) || 0
      );
    }
    const byAsk = (fps || [])
      .filter(fp => srOf(fp) > 0)
      .slice()
      .sort((a, b) => srOf(a) - srOf(b));
    const map = new Map();
    for (let i = 0; i < byAsk.length; i++) {
      const fp = byAsk[i];
      const lower = i > 0 ? byAsk[i - 1] : null;
      map.set(fp.code, lower);
    }
    return map;
  }

  function computeDirSmooth(code, fpLabel, cfg, tState, setupByCode) {
    try {
      const row = (setupByCode && setupByCode[code]) || {};
      const low = Number(row.band_low_pct || 0) || Math.round((cfg.bandLow || 0.93) * 100);
      const high = Number(row.band_high_pct || 0) || Math.round((cfg.bandHigh || 0.96) * 100);
      const mid = (low + high) / 2;
      const occ_fp = Number(tState && (tState.tFP[code] ?? tState.tFP[fpLabel])) || 0; // 0..1
      const occ_site = Number(tState && tState.tComm) || 0; // 0..1
      const target_site = Number(cfg && cfg.comfortTarget) || 0.95;

      const dev_pp = occ_fp * 100 - mid; // percent-points
      const sign = dev_pp < 0 ? -1 : dev_pp > 0 ? +1 : 0;

      const S = { maxMove: 0.05, k: 1.4 }; // Balanced
      const pr = String((cfg && cfg.priceResponse) || 'standard').toLowerCase();
      if (pr === 'fast')
        S.maxMove = 0.08; // Aggressive: ±8%
      else if (pr === 'gentle')
        S.maxMove = 0.03; // Conservative: ±3%
      else S.maxMove = 0.05; // Standard/Balanced: ±5%

      // Normalize distance: 5pp => x=1
      const x = Math.abs(dev_pp) / 5;
      let mag = S.maxMove * Math.tanh(S.k * x); // 0..maxMove

      // Community bias
      const deltaSitePP = (occ_site - target_site) * 100;
      let biasMult = 1.0;
      if (deltaSitePP > 1 && sign > 0) {
        biasMult = 1 + Math.min(0.15 * deltaSitePP, 0.3);
      } else if (deltaSitePP < -1 && sign < 0) {
        biasMult = 1 + Math.min(0.15 * Math.abs(deltaSitePP), 0.3);
      }
      mag *= biasMult;

      if (sign < 0) {
        mag = -mag;
      }

      return {
        mid: mid,
        dev_pp: dev_pp,
        dir: mag,
        biasPct: (biasMult - 1) * 100,
      };
    } catch (e) {
      return { mid: 95, dev_pp: 0, dir: 0, biasPct: 0 };
    }
  }

  function shortTermAdj(base, term) {
    if (term >= 10) return base;
    const start = 0.08,
      taper = 0.01;
    const extra = Math.max(0, start - (term - 2) * taper);
    return base * (1 + extra);
  }

  function explain(chips) {
    const cap = chips.slice(0, 3);
    return `<div>${cap.map(c => `<span class="badge">${c}</span>`).join(' ')}</div>`;
  }

  function firstToken(label) {
    const raw = String(label || '')
      .replace(/[×✕✖]/g, 'x')
      .trim()
      .replace(/\s+/g, ' ');
    return (raw.split(/\s+/)[0] || '').replace(/[^A-Za-z0-9]/g, '');
  }

  function groupBy(arr, fn) {
    const m = new Map();
    for (const x of arr) {
      const k = fn(x);
      m.set(k, (m.get(k) || []).concat([x]));
    }
    return m;
  }

  function fmt(v) {
    return v == null || isNaN(v) ? '' : '$' + Math.round(v).toLocaleString();
  }

  function collectNewFloorplanPoints(cfg, norm, tState) {
    // returns summary points per floorplan (do not bake aged-vacancy into adjusted)
    const byFP = groupBy(norm, r => r.Floorplan || '(unknown)');
    const setupByCode = typeof buildSetupByCode === 'function' ? buildSetupByCode() : {};
    const out = [];
    for (const [fp, list] of byFP.entries()) {
      const avgCurr = list.reduce((s, r) => s + (r.CurrentRent || 0), 0) / Math.max(1, list.length);
      const code = String((list[0] && (list[0].FP_CODE || list[0].Floorplan)) || fp);
      const srVal = startingRentForCode(code);
      const sr = Number(srVal || 0);
      const base = sr && sr > 0 ? sr : avgCurr; // Starting Rent anchor by code; fallback to current avg
      const fpN = list.length;
      const fpTrend = tState.tFP[code] ?? tState.tFP[fp];
      const commTrend = tState.tComm;
      const smTop = computeDirSmooth(code, fp, cfg, tState, setupByCode);
      const dir = smTop.dir;
      let adjusted = base * (1 + dir);
      if (dir < 0) adjusted = Math.max(adjusted, base * (1 - cfg.maxWeeklyDec));
      const vacs = list.filter(r => r.Status === 'vacant').map(r => r.VacantDays || 0);
      let avgVacPct = 0;
      if (vacs.length) {
        const vacPct = vacs.map(v => (v >= 90 ? 0.15 : v >= 60 ? 0.1 : v >= 30 ? 0.05 : 0));
        avgVacPct = vacPct.reduce((a, b) => a + b, 0) / vacs.length;
      }
      out.push({
        fp: fp,
        code: code,
        base: base,
        dir: dir,
        adjusted: Math.round(adjusted),
        avgVacPct: avgVacPct,
        startingRent: sr && sr > 0 ? sr : null,
        price: Math.round(adjusted),
        baselineSource: sr && sr > 0 ? 'starting' : 'current',
      });
    }
    // stable sort by name for consistency
    out.sort((a, b) => a.fp.localeCompare(b.fp));
    return out;
  }

  function renderNewLease(cfg, norm, tState) {
    const wrap = document.getElementById('nlTables');
    wrap.innerHTML = '';
    // Footnote about guardrail
    wrap.insertAdjacentHTML(
      'beforeend',
      '<div class="note">Buffer guardrail blocks decreases that would cross a floorplan\'s buffer vs the next lower tier.</div>'
    );

    // Build floorplan setup maps once per run
    const setupRows =
      window.propertySetup && Array.isArray(window.propertySetup.floorplans)
        ? window.propertySetup.floorplans
        : [];
    const setupByCode = buildSetupByCode();
    const lowerMap = buildLowerTierMap(setupRows);
    const byFP = groupBy(norm, r => r.Floorplan || '(unknown)');
    // local helper to safely read saved FP map
    function _safeLoadFPMap() {
      try {
        const ps = window.propertySetup || {};
        const pid = ps.property_id || ps.property_name || 'default';
        return JSON.parse(localStorage.getItem(`rm:fpmap:${pid}`)) || {};
      } catch (e) {
        return {};
      }
    }
    // Helper: derive bedroom from code/name
    function _bed(code) {
      const row = setupByCode[code] || {};
      const name = String(row.name || '');
      const c = String(code || '');
      const s = (c + ' ' + name).toLowerCase();
      if (/\b(s0|studio|0x1)\b/i.test(c) || /\b(studio|0x1)\b/.test(name.toLowerCase())) return 0;
      if (/\b1x1\b/i.test(s) || /\b1\s*br\b/i.test(s)) return 1;
      if (/\b2x2\b/i.test(s) || /\b2\s*br\b/i.test(s)) return 2;
      if (/\b3x\d\b/i.test(s) || /\b3\s*br\b/i.test(s)) return 3;
      if (/\b4x\d\b/i.test(s) || /\b4\s*br\b/i.test(s)) return 4;
      if (/^a/i.test(c)) return 1;
      if (/^b/i.test(c)) return 2;
      if (/^c/i.test(c)) return 3;
      const m1 = s.match(/(\d)\s*br/);
      if (m1) return parseInt(m1[1]);
      const m2 = s.match(/(\d)\s*x\s*(\d)/);
      if (m2) return parseInt(m2[1]);
      return 1;
    }
    // Build current baselines and tier anchors by bedroom
    const baselineCurrentByCode = new Map();
    const bedByCode = new Map();
    const tierMaxCurrent = new Map();
    // Precompute gap-to-next per lower tier (max across floorplans in that tier)
    const gapToNextByBed = new Map();
    for (const [fp0, list0] of byFP.entries()) {
      const lbl0 = String(list0[0]?.Floorplan || fp0 || '').trim();
      const mapped0 = _safeLoadFPMap()[lbl0];
      const code0 = String(list0[0]?.FP_CODE || mapped0 || firstToken(lbl0) || lbl0).trim();
      const s0 = setupByCode[code0];
      const bed0 = (function () {
        const row = s0 || {};
        const name = String(row.name || '');
        const c = String(code0 || '');
        const s = (c + ' ' + name).toLowerCase();
        if (/\b(s0|studio|0x1)\b/i.test(c) || /\b(studio|0x1)\b/.test(name.toLowerCase())) return 0;
        if (/\b1x1\b/i.test(s) || /\b1\s*br\b/i.test(s)) return 1;
        if (/\b2x2\b/i.test(s) || /\b2\s*br\b/i.test(s)) return 2;
        if (/\b3x\d\b/i.test(s) || /\b3\s*br\b/i.test(s)) return 3;
        if (/\b4x\d\b/i.test(s) || /\b4\s*br\b/i.test(s)) return 4;
        if (/^a/i.test(c)) return 1;
        if (/^b/i.test(c)) return 2;
        if (/^c/i.test(c)) return 3;
        const m1 = s.match(/(\d)\s*br/);
        if (m1) return parseInt(m1[1]);
        const m2 = s.match(/(\d)\s*x\s*(\d)/);
        if (m2) return parseInt(m2[1]);
        return 1;
      })();
      const g = Number((s0 && s0.gap_to_next_tier_dollars) || 0) || 0;
      if (g > 0) {
        gapToNextByBed.set(bed0, Math.max(gapToNextByBed.get(bed0) || 0, g));
      }
    }

    for (const [fp, list] of byFP.entries()) {
      const lbl = String(list[0]?.Floorplan || fp || '').trim();
      const mapped = _safeLoadFPMap()[lbl];
      const code = String(list[0]?.FP_CODE || mapped || firstToken(lbl) || lbl).trim();
      const avgCurr = list.reduce((s, r) => s + (r.CurrentRent || 0), 0) / Math.max(1, list.length);
      const sRow = setupByCode[code];
      const sr = Number((sRow?.starting_rent ?? sRow?.reference_ask) || 0);
      const baseCurr = avgCurr && avgCurr > 0 ? avgCurr : sr > 0 ? sr : 0;
      baselineCurrentByCode.set(code, baseCurr);
      const bed = _bed(code);
      bedByCode.set(code, bed);
      const prev = tierMaxCurrent.get(bed) || 0;
      if (baseCurr > prev) tierMaxCurrent.set(bed, baseCurr);
    }
    const minTier = tierMaxCurrent.size ? Math.min(...Array.from(tierMaxCurrent.keys())) : 0;
    // Helper: seasonality multiplier from UI array (clamped)
    function getSeasonalityMultiplier(monthIndex) {
      const a = window.__seasonalityArray__ || [];
      const v = Number(a[monthIndex]);
      const m = Number.isFinite(v) ? v : 1;
      return Math.min(1.2, Math.max(0.8, m));
    }
    let spacingClampCountBase = 0;
    for (const [fp, list] of byFP.entries()) {
      const lbl = String(list[0]?.Floorplan || fp || '').trim();
      const mapped = _safeLoadFPMap()[lbl];
      const code = String(list[0]?.FP_CODE || mapped || firstToken(lbl) || lbl).trim();
      const avgCurr = list.reduce((s, r) => s + (r.CurrentRent || 0), 0) / Math.max(1, list.length);
      const s = setupByCode[code];
      const sr = Number((s?.starting_rent ?? s?.reference_ask) || 0);
      const base = sr > 0 ? sr : avgCurr; // Starting Rent anchor by code
      const baselineSource = sr > 0 ? 'starting' : 'current';
      const fpN = list.length;
      const fpTrend = tState.tFP[code] ?? tState.tFP[fp];
      const commTrend = tState.tComm;
      const smTop2 = computeDirSmooth(code, fp, cfg, tState, setupByCode);
      const dir = smTop2.dir;
      const T = typeof cfg?.comfortTarget === 'number' ? cfg.comfortTarget : 0.95;
      const DB = 0.005;
      // decide reference term = longest selected new-lease term
      const terms =
        cfg && Array.isArray(cfg.nlTerms) && cfg.nlTerms.length
          ? cfg.nlTerms
          : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      const refTerm = Math.max.apply(null, terms);
      var _refPrice = null; // will capture later
      var _refBasePrePremium = null; // capture base (pre-premiums) for reference term

      let adjusted = base * (1 + dir);
      if (dir < 0) adjusted = Math.max(adjusted, base * (1 - cfg.maxWeeklyDec));
      const vacs = list
        .filter(r => r.Status === 'vacant')
        .map(r => vacancySpecialPct(r.VacantDays || 0));
      const avgVac = vacs.length ? vacs.reduce((a, b) => a + b, 0) / vacs.length : 0; // apply only to short terms below

      let guardrailChip = '';
      try {
        const s = setupByCode[code];
        const lower = lowerMap.get(code);
        const B = Number((s && s.stop_down_buffer_dollars) || 0);
        const fpRef = Number(
          (s && s.starting_rent) != null ? s.starting_rent : (s && s.reference_ask) || 0
        );
        const L = Number(
          (lower && lower.starting_rent) != null
            ? lower.starting_rent
            : (lower && lower.reference_ask) || 0
        );
        const hasLower = !!lower;
        const isDecrease = adjusted < base; // stop-decrease only
        if (hasLower && B > 0 && L > 0 && fpRef > 0 && isDecrease) {
          const minAllowed = L + B;
          if (adjusted < minAllowed) {
            adjusted = minAllowed;
            const minInt = Math.round(minAllowed);
            const bInt = Math.round(B);
            guardrailChip = `<span class=\"badge\">🧱 Buffer guardrail: kept ≥ ${minInt} vs ${lower.code} + ${bInt}</span>`;
          }
        }
      } catch (e) {}
      adjusted =
        typeof clampBaseToFPCaps === 'function' ? clampBaseToFPCaps(adjusted, code) : adjusted;

      let trs = '';
      // Process ascending by bedroom
      const codesByBed = Array.from(byFP.entries())
        .map(([fpL, listL]) => {
          const lbl = String(listL[0]?.Floorplan || fpL || '').trim();
          const mapped = _safeLoadFPMap()[lbl];
          const code = String(listL[0]?.FP_CODE || mapped || firstToken(lbl) || lbl).trim();
          return { code, bed: bedByCode.get(code) ?? 1, list: listL };
        })
        .sort((a, b) => a.bed - b.bed);
      // Precompute sr, base, dir
      const srByCode = new Map();
      const dirByCode = new Map();
      for (const { code, list: listL } of codesByBed) {
        const sRow = setupByCode[code];
        const avgCurr =
          listL.reduce((s, r) => s + (r.CurrentRent || 0), 0) / Math.max(1, listL.length);
        const sr = Number((sRow?.starting_rent ?? sRow?.reference_ask) || 0);
        const base = sr > 0 ? sr : avgCurr;
        srByCode.set(code, sr);
        const fpN = listL.length;
        const fpTrend = tState.tFP[code] ?? tState.tFP[String(listL[0]?.Floorplan || '')];
        const commTrend = tState.tComm;
        const sm2 = computeDirSmooth(
          code,
          String(listL[0]?.Floorplan || ''),
          cfg,
          tState,
          setupByCode
        );
        dirByCode.set(code, sm2.dir);
      }
      // Helper: build baseFinal per code for a given term (seasonality-aware) and apply gap stopper
      function __buildBaseFinalByCodeForTerm(term) {
        const map = new Map();
        // Seasonality is not applied in Base; compute once without seas
        const seas = 1;
        for (const { code, bed } of codesByBed) {
          const srVal = Number(srByCode.get(code) || 0);
          // Use carry-forward baseline if available, otherwise fall back to starting rent or current baseline
          const carryForwardBaseline = getCarryForwardBaseline(code);
          const baseVal = carryForwardBaseline !== null ? carryForwardBaseline 
            : (srVal > 0 ? srVal : Number(baselineCurrentByCode.get(code) || 0));
          const dirVal = Number(dirByCode.get(code) || 0);
          let baseCand = baseVal * (1 + dirVal) * seas;
          if (dirVal < 0) baseCand = Math.max(baseCand, baseVal * (1 - cfg.maxWeeklyDec));
          if (bed > minTier) {
            const lowerBed = bed - 1;
            const lowerCodes = codesByBed.filter(x => x.bed === lowerBed).map(x => x.code);
            const lowerBases = lowerCodes.map(c => map.get(c)).filter(v => Number.isFinite(v));
            if (lowerBases.length) {
              const lowerMaxBase = Math.max.apply(null, lowerBases);
              const minGap = Math.max(Number(gapToNextByBed.get(lowerBed) || 0) || 0, 0);
              const stopper = lowerMaxBase + minGap;
              if (baseCand < stopper) {
                baseCand = stopper;
                spacingClampCountBase++;
              }
            }
          }
          baseCand =
            typeof clampBaseToFPCaps === 'function' ? clampBaseToFPCaps(baseCand, code) : baseCand;
          map.set(code, baseCand);
        }
        return map;
      }

      // kept as no‑op – legacy reference (remove in a later refactor)
      // Build base map WITHOUT tier-gap stopper (still respecting weekly dec cap and FP caps)
      function __buildBaseNoGapByCodeForTerm(term) {
        const map = new Map();
        const seas = 1;
        for (const { code } of codesByBed) {
          const srVal = Number(srByCode.get(code) || 0);
          const baseVal = srVal > 0 ? srVal : Number(baselineCurrentByCode.get(code) || 0);
          const dirVal = Number(dirByCode.get(code) || 0);
          let baseCand = baseVal * (1 + dirVal) * seas;
          if (dirVal < 0) baseCand = Math.max(baseCand, baseVal * (1 - cfg.maxWeeklyDec));
          baseCand =
            typeof clampBaseToFPCaps === 'function' ? clampBaseToFPCaps(baseCand, code) : baseCand;
          map.set(code, baseCand);
        }
        return map;
      }

      // Compute tier-gap uplift info on the reference term only (for explainability)
      const __refBaseNoGap = __buildBaseNoGapByCodeForTerm(refTerm);
      const __refBaseWithGap = __buildBaseFinalByCodeForTerm(refTerm);
      const tierGapDeltaByCode = new Map();
      const tierGapMetaByCode = new Map(); // {lowerCode, lowerRef, gap, requiredMin}
      // Precompute lower-tier anchors (which lower code sets the requirement)
      const byBedCodes = new Map();
      codesByBed.forEach(x => {
        const a = byBedCodes.get(x.bed) || [];
        a.push(x.code);
        byBedCodes.set(x.bed, a);
      });
      for (const { code, bed } of codesByBed) {
        const baseNoGap = Number(__refBaseNoGap.get(code) || 0);
        const baseWithGap = Number(__refBaseWithGap.get(code) || 0);
        const delta = Math.max(0, Math.round(baseWithGap - baseNoGap));
        if (bed > minTier && delta > 0) {
          const lowerBed = bed - 1;
          const lowerCodes = byBedCodes.get(lowerBed) || [];
          let bestLower = null,
            bestVal = -Infinity;
          lowerCodes.forEach(c => {
            const v = Number(__refBaseWithGap.get(c) || 0);
            if (Number.isFinite(v) && v > bestVal) {
              bestVal = v;
              bestLower = c;
            }
          });
          const gap = Math.max(Number(gapToNextByBed.get(lowerBed) || 0) || 0, 0);
          const requiredMin = Math.round(bestVal + gap);
          tierGapDeltaByCode.set(code, delta);
          tierGapMetaByCode.set(code, {
            lowerCode: bestLower || '',
            lowerRef: Math.round(bestVal),
            gap: Math.round(gap),
            requiredMin,
          });
        }
      }

      for (const term of terms) {
        // Base-first: long terms (>=10) anchor to moved base; short terms apply short-term premium
        const longTerm = term >= 10;
        const baseFinalByCode = __buildBaseFinalByCodeForTerm(term);
        const p0 = baseFinalByCode.get(code) ?? adjusted; // apply base stopper before per-term math

        const end = new Date();
        end.setMonth(end.getMonth() + term);
        const key = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0');
        const overCapCount = typeof overByKey === 'object' && overByKey ? overByKey[key] || 0 : 0;
        const overCapPct = (function () {
          const el = document.getElementById('seasonalityCurve');
          const mm =
            typeof seasonalityMultiplier === 'function' && el
              ? seasonalityMultiplier(el.value, key)
              : 1;
          return mm - 1;
        })();

        // Term adjustments combined on base: short + overCap (no aged vacancy in New Pricing)
        const shortPct = longTerm ? 0 : shortTermAdj(100, term) / 100 - 1;
        // Seasonality uplift only on over-cap terms and only if positive
        const seasArr = window.__seasonalityArray__ || [];
        const monthIdx = end.getMonth();
        const m = Number(seasArr[monthIdx]);
        const seasonalityPct = Number.isFinite(m) ? m - 1 : 0;
        const seasonalUplift = seasonalityPct > 0 && overCapCount > 0 ? seasonalityPct : 0;
        let p = p0 * (1 + (shortPct || 0) + (overCapPct || 0) + (seasonalUplift || 0));

        // Gap stopper already applied at base stage — do not clamp per term

        // capture reference term display price and base (pre-premiums)
        if (term === refTerm) {
          _refPrice = Math.round(p);
          _refBasePrePremium = Math.round(p0);
        }

        // format compact math: X% & over cap (N) Y% = Z%
        const x = shortPct * 100;
        const y = (overCapPct || 0) * 100;
        const seasPctOut = (seasonalUplift || 0) * 100;
        // Net vs BaseFinal after term adjustments
        const totalPct = (p / Math.max(1, p0) - 1) * 100;
        const signFmt = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%';
        const notes = `Term premium ${signFmt(x)} & over cap (${overCapCount}) ${signFmt(y)} +seasonal ${signFmt(seasPctOut)} = ${signFmt(totalPct)}`;

        // single row: term | price | notes (right-aligned)
        trs += `<tr>
                  <td>${term} mo</td>
                  <td>${fmt(p)}</td>
                  <td style="text-align:right; opacity:.9"><small>${notes}</small></td>
        </tr>`;

        // export includes Starting Rent anchor (only SR value in column 2)
        __newPricingRows.push([code || fp, Math.round(sr > 0 ? sr : 0), term, Math.round(p)]);
      }

      const arrow = dir > 0.0001 ? '↑' : dir < -0.0001 ? '↓' : '→';
      const smDbg = computeDirSmooth(code, fp, cfg, tState, setupByCode);
      const baseCandDbg = (sr > 0 ? sr : base) * (1 + dir);
      let _capTxt = '';
      try {
        const cl =
          typeof clampBaseToFPCaps === 'function'
            ? clampBaseToFPCaps(baseCandDbg, code)
            : baseCandDbg;
        if (cl > baseCandDbg) _capTxt = ' • cap:floor';
        else if (cl < baseCandDbg) _capTxt = ' • cap:ceiling';
      } catch (e) {}
      const dbgLine = `
        <div class="note" style="margin-top:6px;opacity:.9">
          Debug — ${arrow} reference: ${refTerm} mo @ ${fmt(_refPrice)}
          • Starting Rent ${fmt(sr > 0 ? sr : avgCurr)}
          • baseline = ${baselineSource}
          • move=${(dir * 100).toFixed(2)}%
          • mid=${Number(smDbg.mid).toFixed(1)}% • dev=${(Number(smDbg.dev_pp) >= 0 ? '+' : '') + Number(smDbg.dev_pp).toFixed(1)} pp • dir=${(Number(smDbg.dir) * 100).toFixed(1)}% • siteBias=${(Number(smDbg.biasPct) || 0).toFixed(0)}%
          • dir=${(dir * 100).toFixed(2)}% • sr=${Math.round(sr > 0 ? sr : base)} • base=${baseCandDbg.toFixed(1)}${_capTxt}
          • Target ${(T * 100).toFixed(1)}%
          • FP ${(fpTrend * 100).toFixed(1)}%
          • Comm ${(commTrend * 100).toFixed(1)}%
          • n=${fpN}
        </div>`;
      // Simple Target/Gate debug line (no extra helpers)
      const _gateDown = T - 0.02;
      const _gateUp = T + 0.01;
      const _fpVsT_pp = (fpTrend - T) * 100; // percent-points
      const _fpVsT_txt =
        Math.abs(_fpVsT_pp) < 0.05
          ? 'FP vs Target: 0.0pp'
          : 'FP vs Target: ' + (_fpVsT_pp > 0 ? '+' : '−') + Math.abs(_fpVsT_pp).toFixed(1) + 'pp';
      const _gate_txt =
        commTrend <= _gateDown
          ? 'Community gate: Blocked'
          : commTrend >= _gateUp
            ? 'Community gate: Boost'
            : 'Community gate: Neutral';
      const dbgLine2 = `
        <div class="note" style="margin-top:2px;opacity:.85">
          ${_fpVsT_txt} • ${_gate_txt}
        </div>`;

      // Optional tier-gap chip if applied on reference term
      const __tg = tierGapDeltaByCode.get(code) || 0;
      const __tgMeta = tierGapMetaByCode.get(code) || null;
      const tierGapChip =
        __tg > 0 && __tgMeta
          ? `<span class=\"badge\">tier gap +$${__tg} to maintain $${__tgMeta.gap} vs ${__tgMeta.lowerCode}</span>`
          : '';

      wrap.insertAdjacentHTML(
        'beforeend',
        `
        <div style="border:1px solid #0b2035;border-radius:10px;padding:10px;margin:8px 0">
          <div style="font-weight:600">${code} ${guardrailChip} ${tierGapChip}</div>
          <table class="basic" style="margin-top:6px">
            <thead><tr><th>Term</th><th>Price</th><th style="text-align:right;">Notes</th></tr></thead>
            <tbody>${trs}</tbody>
            <tfoot id="boxScoreFoot"><tr><td colspan="8" class="note">Totals will appear after you run.</td></tr></tfoot>
          </table>
          ${explain([
            (tState.tFP[code] ?? tState.tFP[fp]) >
            document.getElementById('comfortHigh').value / 100
              ? 'Trend above comfort'
              : 'Trend below/within comfort',
            'Price response: ' + document.getElementById('priceResponse').value,
            'Seasonality: ' + document.getElementById('seasonalityCurve').value,
          ])}
          ${dbgLine}
          ${__tg > 0 && __tgMeta ? `<div class=\"note\" style=\"margin-top:2px;opacity:.85\">• tierGap=+$${__tg} (need ≥ $${__tgMeta.lowerRef} + $${__tgMeta.gap} = $${__tgMeta.requiredMin})</div>` : ''}
        </div>`
      );
      // Collect reference/base per FP for unit pricing view
      try {
        window.__fpResults = Array.isArray(window.__fpResults) ? window.__fpResults : [];
        window.__fpResults.push({
          code,
          name: s?.name || code,
          startingRent: sr,
          referenceBase: Number(_refBasePrePremium || 0),
          referenceTerm: refTerm,
          price_ceiling_dollars:
            s && s.price_ceiling_dollars !== '' && s.price_ceiling_dollars != null
              ? Number(s.price_ceiling_dollars)
              : null,
        });
        
        // Save carry-forward baselines for next run
        const fpBaselines = {};
        window.__fpResults.forEach(result => {
          fpBaselines[result.code] = result.referenceBase;
        });
        saveCarryForwardBaselines(fpBaselines);
      } catch (e) {}
    }
    // Summary note for spacing clamps
    if (spacingClampCountBase > 0) {
      wrap.insertAdjacentHTML(
        'beforeend',
        `<div class="note" style="margin-top:6px">Spacing applied: Some floorplans were raised to maintain the minimum gap vs the lower bedroom tier's base.</div>`
      );
    }
    // Note: Unit section rendering is handled separately by the Unit Pricing module
  }

  // Expose functions to window for external use
  window.renderNewLease = renderNewLease;
  window.collectNewFloorplanPoints = collectNewFloorplanPoints;
  window.buildSetupByCode = buildSetupByCode;
  window.computeDirSmooth = computeDirSmooth;
  window.startingRentForCode = startingRentForCode;
  window.resetCarryForwardBaselines = resetCarryForwardBaselines;
  window.loadCarryForwardBaselines = loadCarryForwardBaselines;
  window.getCarryForwardBaseline = getCarryForwardBaseline;

  // Development boundary guards
  if (window.__RM_DEV_GUARDS) {
    window.__RM_DEV_GUARDS.assert(
      !window.__RM_DEV_GUARDS.hasFunction('__renderUnitPricingSection') ||
        typeof window.__renderUnitPricingSection !== 'function',
      'Floorplan code should not call unit rendering directly.'
    );
    window.__RM_DEV_GUARDS.assert(
      !window.__RM_DEV_GUARDS.hasElement('unitPricingSection'),
      'Floorplan code should not access unit DOM elements directly.'
    );
  }
})();
