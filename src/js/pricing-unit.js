/**
 * UNIT PRICING MODULE
 *
 * Purpose: Renders individual unit lists with filtering, search, and pagination.
 *
 * Public API (functions attached to window):
 * - __renderUnitPricingSection() - Main rendering function
 * - buildFpIndex() - Floorplan index builder
 * - buildUnits() - Unit data builder
 * - buildUnitsAll() - All units builder
 *
 * Inputs Expected:
 * - window.__fpResults - Floorplan baseline data from Floorplan Pricing
 * - window.mappedRows - Rent roll data
 * - Unit status and amenity data
 * - Filter and search state
 *
 * Outputs Produced:
 * - Unit tables rendered to #unitPricingSection
 * - window.__npUnitsFiltered - Filtered units for detail overlay
 * - Unit detail overlays (when enabled)
 *
 * Rules of Separation:
 * - MAY: Render unit list, filters, paging, and use floorplan baseline + amenities to show proposed and deltas
 * - MAY: Apply term math (if/when enabled) per-unit from the unit base
 * - MAY: Read helpers and common state
 * - MUST NOT: Mutate floorplan baseline logic or directly trigger FP rendering
 *
 * Do NOT:
 * - Call floorplan rendering functions directly (e.g., renderNewLease)
 * - Mutate floorplan baseline calculations or state
 * - Trigger floorplan-level computations
 * - Access floorplan-specific DOM elements (e.g., #nlTables)
 */

(function () {
  'use strict';

  // Helper to get best term for FP
  function getBestTermForFp(fp) {
    return { termMonths: fp.referenceTerm || 14, price: fp.referenceBase };
  }

  // Build FP index from __fpResults or by scraping DOM
  function buildFpIndex() {
    const idx = new Map();
    if (Array.isArray(window.__fpResults)) {
      window.__fpResults.forEach(r => {
        if (r && r.code)
          idx.set(String(r.code), {
            code: r.code,
            name: r.name || r.code,
            referenceBase: r.referenceBase,
            referenceTerm: r.referenceTerm || 14,
          });
      });
    } else {
      // Fallback scrape: find "reference: N mo @ $X" in FP debug lines
      document.querySelectorAll('#nlTables .card').forEach(card => {
        const title = card.querySelector('div[style*="font-weight:600"],h2,h3');
        if (!title) return;
        const code = (title.textContent || '').trim().split(/\s+/)[0];
        const dbg = Array.from(card.querySelectorAll('.note,div,p')).find(x =>
          /reference:\s*\d+\s*mo\s*@\s*\$?/i.test(x.textContent || '')
        );
        let ref = null;
        if (dbg) {
          const m = (dbg.textContent || '').match(/reference:\s*(\d+)\s*mo\s*@\s*\$?([0-9,]+)/i);
          if (m) {
            ref = Number(String(m[2]).replace(/,/g, ''));
          }
        }
        if (code && isFinite(ref))
          idx.set(code, {
            code,
            name: code,
            referenceBase: ref,
            referenceTerm: Number((dbg?.match?.(/(\d+)\s*mo/) || [])[1]) || 14,
          });
      });
    }
    return idx;
  }

  // Build units for vacant/on notice (for FP tab)
  function buildUnits() {
    const rows =
      Array.isArray(window.normRows) && window.normRows.length
        ? window.normRows
        : Array.isArray(window.mappedRows)
          ? window.mappedRows
          : [];
    const map = (function () {
      try {
        const ps = window.propertySetup || {};
        const pid = ps.property_id || ps.property_name || 'default';
        return JSON.parse(localStorage.getItem(`rm:fpmap:${pid}`)) || {};
      } catch (e) {
        return {};
      }
    })();
    const AMENITY_KEYS = [
      'AmenityAdj',
      'Amenity_Adjustment',
      'AmenityAdjustment',
      'Amenity Delta',
      'Amenity_Delta',
      'Amenity Rent',
      'Amenity_Rent',
      'Amenities',
      'Amenity',
      'UnitAdj',
      'Unit_Adjustment',
      'Unit Adjustment',
      'Unit Premium',
      'Premium',
      'Surcharge',
      'AddlRent',
      'Addl_Rent',
      'Additional Rent',
      'Other Rent',
      'Other_Rent',
    ];
    const list = rows
      .map(r => ({
        unit: r.UnitID || r.Unit || r.UnitNbr || r.UnitNumber || '',
        floorplan_code:
          r.FP_CODE || map[String(r.Floorplan || '').trim()] || String(r.Floorplan || '').trim(),
        status: r.Status || r.status || '',
        vacant_date: r.VacantDate || r.vacant_date || null,
        available_date: r.PreleaseStart || r.available_date || null,
        lease_end_date:
          r.LeaseEnd ||
          r.Lease_End ||
          r.LeaseEndDate ||
          r.Lease_End_Date ||
          r['Lease End'] ||
          r['Lease End Date'] ||
          r.MoveOut ||
          r.Move_Out ||
          r.MoveOutDate ||
          r.Move_Out_Date ||
          r['Move Out'] ||
          r['Move Out Date'] ||
          null,
        amenity_adj: (function () {
          let tot = 0;
          for (const k of AMENITY_KEYS) {
            if (Object.prototype.hasOwnProperty.call(r, k)) tot += __toNumberSigned(r[k]);
            const lk = k.toLowerCase();
            for (const kk in r) {
              if (kk && kk.toLowerCase() === lk) {
                tot += __toNumberSigned(r[kk]);
                break;
              }
            }
          }
          return tot;
        })(),
        current: r.Price || r.CurrentRent || null,
      }))
      .filter(u => String(u.unit || '').trim());
    return list.filter(u => {
      const s = unitStatus(u);
      return s === 'Vacant' || s === 'On Notice';
    });
  }

  // FP map helpers (shared)
  function __fpMapKey() {
    try {
      const ps = window.propertySetup || {};
      return 'rm:fpmap:' + (ps.property_id || ps.property_name || 'default');
    } catch (e) {
      return 'rm:fpmap:default';
    }
  }
  function __loadFPMap() {
    try {
      const raw = localStorage.getItem(__fpMapKey());
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  // Build all units (no status filter) for Unit sub-tab
  function buildUnitsAll() {
    // Prefer normalized rows (already FP_CODE) if available
    if (Array.isArray(window.normRows) && window.normRows.length) {
      const AMENITY_KEYS = [
        'AmenityAdj',
        'Amenity_Adjustment',
        'AmenityAdjustment',
        'Amenity Delta',
        'Amenity_Delta',
        'Amenity Rent',
        'Amenity_Rent',
        'Amenities',
        'Amenity',
        'UnitAdj',
        'Unit_Adjustment',
        'Unit Adjustment',
        'Unit Premium',
        'Premium',
        'Surcharge',
        'AddlRent',
        'Addl_Rent',
        'Additional Rent',
        'Other Rent',
        'Other_Rent',
      ];
      return window.normRows
        .map(r => ({
          unit: r.UnitID || r.Unit || r.UnitNbr || r.UnitNumber || '',
          floorplan_code: r.FP_CODE || String(r.Floorplan || '').trim(),
          status: r.Status || r.status || '',
          vacant_date: r.VacantDate || r.vacant_date || null,
          available_date: r.PreleaseStart || r.available_date || null,
          lease_end_date:
            r.LeaseEnd ||
            r.Lease_End ||
            r.LeaseEndDate ||
            r.Lease_End_Date ||
            r['Lease End'] ||
            r['Lease End Date'] ||
            r.MoveOut ||
            r.Move_Out ||
            r.MoveOutDate ||
            r.Move_Out_Date ||
            r['Move Out'] ||
            r['Move Out Date'] ||
            null,
          amenity_adj: (function () {
            let tot = 0;
            for (const k of AMENITY_KEYS) {
              if (Object.prototype.hasOwnProperty.call(r, k)) tot += __toNumberSigned(r[k]);
              const lk = k.toLowerCase();
              for (const kk in r) {
                if (kk && kk.toLowerCase() === lk) {
                  tot += __toNumberSigned(r[kk]);
                  break;
                }
              }
            }
            return tot;
          })(),
          current: r.Price || r.CurrentRent || null,
        }))
        .filter(u => String(u.unit || '').trim());
    } else if (Array.isArray(window.mappedRows)) {
      // Fallback to mappedRows with manual mapping
      const map = __loadFPMap();
      const AMENITY_KEYS = [
        'AmenityAdj',
        'Amenity_Adjustment',
        'AmenityAdjustment',
        'Amenity Delta',
        'Amenity_Delta',
        'Amenity Rent',
        'Amenity_Rent',
        'Amenities',
        'Amenity',
        'UnitAdj',
        'Unit_Adjustment',
        'Unit Adjustment',
        'Unit Premium',
        'Premium',
        'Surcharge',
        'AddlRent',
        'Addl_Rent',
        'Additional Rent',
        'Other Rent',
        'Other_Rent',
      ];
      const out = window.mappedRows
        .map(r => ({
          unit: r.UnitID || r.Unit || r.UnitNbr || r.UnitNumber || '',
          floorplan_code: map[String(r.Floorplan || '').trim()] || String(r.Floorplan || '').trim(),
          status: r.Status || r.status || '',
          vacant_date: r.VacantDate || r.vacant_date || null,
          available_date: r.PreleaseStart || r.available_date || null,
          lease_end_date:
            r.LeaseEnd ||
            r.Lease_End ||
            r.LeaseEndDate ||
            r.Lease_End_Date ||
            r['Lease End'] ||
            r['Lease End Date'] ||
            r.MoveOut ||
            r.Move_Out ||
            r.MoveOutDate ||
            r.Move_Out_Date ||
            r['Move Out'] ||
            r['Move Out Date'] ||
            null,
          amenity_adj: (function () {
            let tot = 0;
            for (const k of AMENITY_KEYS) {
              if (Object.prototype.hasOwnProperty.call(r, k)) tot += __toNumberSigned(r[k]);
              const lk = k.toLowerCase();
              for (const kk in r) {
                if (kk && kk.toLowerCase() === lk) {
                  tot += __toNumberSigned(r[kk]);
                  break;
                }
              }
            }
            return tot;
          })(),
          current: r.Price || r.CurrentRent || null,
        }))
        .filter(u => String(u.unit || '').trim());
      return out;
    }
    return [];
  }

  // Render Unit Pricing Section - Complete Implementation
  function renderUnitPricingSection() {
    const host = document.getElementById('unitPricingSection');
    if (!host) return;
    const isUnitTab = typeof getNPSubtab === 'function' ? getNPSubtab() === 'unit' : false;
    if (!isUnitTab && !loadShowUnits()) {
      host.innerHTML = '';
      return;
    }
    const fpIdx = buildFpIndex();
    if (!fpIdx.size) {
      host.innerHTML = '<div class="note">No floorplan bases available yet.</div>';
      return;
    }

    const unitsRaw = isUnitTab ? buildUnitsAll() : buildUnits();
    // Available-only gating on Unit tab: keep Vacant / On Notice only
    const units = isUnitTab
      ? unitsRaw.filter(u => {
          const st = unitStatus(u);
          return st === 'Vacant' || st === 'On Notice';
        })
      : unitsRaw;
    const today = new Date();
    const totalUnits = units.length;
    // Capture current control state from DOM if present; fall back to memory state
    const sEl = document.getElementById('unitSearch');
    const vacEl = document.getElementById('fltVac');
    const notEl = document.getElementById('fltNotice');
    const searchValRaw =
      sEl && typeof sEl.value === 'string' ? sEl.value : window.__npUnitsState.search || '';
    const fltVac =
      vacEl && typeof vacEl.checked === 'boolean'
        ? vacEl.checked
        : window.__npUnitsState.vac !== false;
    const fltNotice =
      notEl && typeof notEl.checked === 'boolean'
        ? notEl.checked
        : window.__npUnitsState.notice !== false;
    // Update memory state now so filtering uses it
    window.__npUnitsState.search = searchValRaw;
    window.__npUnitsState.vac = !!fltVac;
    window.__npUnitsState.notice = !!fltNotice;
    const searchVal = searchValRaw.trim().toLowerCase();
    let filtered = units.filter(u => {
      const st = unitStatus(u); // will be Vacant or On Notice only in Unit tab
      const hit =
        !searchVal ||
        String(u.unit).toLowerCase().includes(searchVal) ||
        String(u.floorplan_code || '')
          .toLowerCase()
          .includes(searchVal);
      if (st === 'Vacant') return fltVac && hit;
      if (st === 'On Notice') return fltNotice && hit;
      return false; // never include Others
    });

    // Make filtered units available to the detail overlay renderer
    window.__npUnitsFiltered = filtered;

    // Global pagination if >500
    // Paging state
    const PER = 100;
    const needsPaging = filtered.length > 500;
    const pages = needsPaging ? Math.ceil(filtered.length / PER) : 1;
    if (window.__npUnitsState.page == null) window.__npUnitsState.page = 1;
    window.__npUnitsPage = Math.min(Math.max(window.__npUnitsState.page, 1), pages);
    const page = window.__npUnitsPage;
    const sliceStart = (page - 1) * PER,
      sliceEnd = needsPaging ? sliceStart + PER : filtered.length;
    const paged = needsPaging ? filtered.slice(sliceStart, sliceEnd) : filtered;

    // Group by FP using only paged units to avoid heavy DOM
    const byFP = new Map();
    let hasUnmapped = false;
    for (const u of paged) {
      // Extract short code from full floorplan name (e.g., "S0 - Studio" -> "S0")
      const shortCode = String(u.floorplan_code || '').split(' - ')[0];
      if (!fpIdx.has(shortCode)) {
        hasUnmapped = true;
        continue;
      }
      const arr = byFP.get(shortCode) || [];
      arr.push(u);
      byFP.set(shortCode, arr);
    }
    const fps = Array.from(byFP.keys()).map(code => ({
      code,
      name:
        (window.propertySetup?.floorplans || []).find(x => String(x.code) === String(code))?.name ||
        code,
      referenceBase: fpIdx.get(code)?.referenceBase || null,
      referenceTerm: fpIdx.get(code)?.referenceTerm || 14,
    }));
    fps.sort((a, b) => {
      const ka = computeFpSortKey(a),
        kb = computeFpSortKey(b);
      return ka[0] - kb[0] || ka[1].localeCompare(kb[1]);
    });

    let html = '';
    // Filters row
    html += '<div class="actions" style="gap:8px; align-items:center; margin-bottom:8px">';
    html += `<input type="text" id="unitSearch" placeholder="Search unit or FP code" style="max-width:220px" value="${__np_escape(searchValRaw)}" />`;
    html += `<label><input type="checkbox" id="fltVac" ${fltVac ? 'checked' : ''} /> Vacant</label>`;
    html += `<label><input type="checkbox" id="fltNotice" ${fltNotice ? 'checked' : ''} /> On Notice</label>`;
    if (needsPaging) {
      html += `<span class="badge" style="margin-left:auto">${filtered.length} units</span>`;
    }
    html += '</div>';
    if (hasUnmapped)
      html +=
        '<div class="note" style="margin-bottom:6px">Some units are unmapped — fix in Settings → Floorplan Map.</div>';

    // Groups
    fps.forEach(fp => {
      const list = sortUnitsForFp(byFP.get(fp.code) || [], today);
      const btnId = `fpUnits_${fp.code}`;
      html += `<section class="card" style="margin:8px 0;">`;
      html += `<div class="actions" style="justify-content:space-between"><button class="btn xs" aria-expanded="true" data-coll="${btnId}">FP ${fp.code} — ${list.length} available</button><div class="pill">Ref: ${formatMoney(fp.referenceBase)} (${fp.referenceTerm} mo)</div></div>`;
      html += `<div id="${btnId}" style="margin-top:6px">`;
      html +=
        '<div style="overflow:auto"><table class="basic" style="width:100%"><thead><tr><th>Unit</th><th>FP</th><th>Status</th><th>Avail / Vacant Age</th><th>Previous</th><th>Proposed (final)</th><th>Δ $</th><th>Δ %</th><th>Amenities</th><th class="ta-right w-8">&nbsp;</th></tr></thead><tbody>';
      list.forEach(u => {
        const st = unitStatus(u);
        const cur = Number(u.current) || NaN;
        const refPrice = Number(fp.referenceBase) || NaN;
        const amen = Number(u.amenity_adj || 0);
        const proposedWithAmen = Math.max(0, (isFinite(refPrice) ? refPrice : 0) + amen);
        
        // Apply vacancy age discount for vacant units
        let finalProposedPrice = proposedWithAmen;
        let vacancyDiscount = 0;
        let vacancyDiscountPct = 0;
        let isDiscounted = false;
        
        if (st === 'Vacant') {
          const vacantDays = vacancyAgeDays(u, new Date());
          vacancyDiscountPct = vacancyAgeDiscount(vacantDays);
          if (vacancyDiscountPct > 0) {
            vacancyDiscount = (proposedWithAmen * vacancyDiscountPct) / 100;
            finalProposedPrice = Math.max(0, proposedWithAmen - vacancyDiscount);
            isDiscounted = true;
          }
        }
        
        // Use carry-forward baseline as "Previous" if available, otherwise use current rent
        const carryForwardBaseline = getCarryForwardBaseline(fp.code);
        const previousPrice = carryForwardBaseline !== null ? carryForwardBaseline : (isFinite(cur) ? cur : refPrice);
        const d$ = isFinite(previousPrice) && isFinite(finalProposedPrice) ? finalProposedPrice - previousPrice : NaN;
        const dP = isFinite(previousPrice) && previousPrice > 0 ? (d$ / previousPrice) * 100 : NaN;
        let availTxt = '—';
        if (st === 'Vacant') {
          const age = vacancyAgeDays(u, today);
          availTxt = `Vacant ${age} days`;
        } else if (st === 'On Notice') {
          const dt = onNoticeAvailDate(u);
          availTxt = dt ? 'Avail ' + dt.toISOString().slice(0, 10) : 'On Notice';
        }
        let amenCell = '';
        if (amen !== 0) {
          const sign = amen > 0 ? '+' : '-';
          amenCell = sign + formatMoney(Math.abs(amen));
        }
        
        // Format proposed price with vacancy age discount styling
        let proposedPriceDisplay = '';
        if (isFinite(finalProposedPrice)) {
          if (isDiscounted) {
            proposedPriceDisplay = `<span style="color: #dc2626; font-weight: 600;">${formatMoney(finalProposedPrice)} 🏷️</span><br><small style="color: #6b7280;">Ref: ${formatMoney(proposedWithAmen)} (-${vacancyDiscountPct.toFixed(1)}%)</small>`;
          } else {
            proposedPriceDisplay = formatMoney(finalProposedPrice);
          }
        } else {
          proposedPriceDisplay = '—';
        }
        
        const key = `${fp.code}::${String(u.unit || '')}`;
        html +=
          `<tr class="unit-row" data-key="${key}" data-base="${isFinite(finalProposedPrice) ? finalProposedPrice : ''}" data-cur="${isFinite(previousPrice) ? previousPrice : ''}" data-fp="${fp.code}">` +
          `<td>${__np_escape(String(u.unit || ''))}</td>` +
          `<td>${fp.code}</td><td>${st}</td><td>${availTxt}</td><td>${isFinite(previousPrice) ? formatMoney(previousPrice) : '—'}</td><td>${proposedPriceDisplay}</td><td>${isFinite(d$) ? formatMoney(d$) : '—'}</td><td>${isFinite(dP) ? formatPct(dP) : '—'}</td><td>${amenCell}</td></tr>`;
        // Append right-side toggle
        html = html.replace(
          /<\/tr>$/,
          `<td class=\"ta-right\"><button type=\"button\" class=\"btn-icon unit-expand\" aria-expanded=\"false\" aria-controls=\"unit-detail-${__np_escape(String(u.unit || ''))}\" aria-label=\"Show details for unit ${__np_escape(String(u.unit || ''))}\" data-unit=\"${__np_escape(String(u.unit || ''))}\">▼<\/button><\/td><\/tr>`
        );
      });
      html += '</tbody></table></div>';
      html += '</div></section>';
    });

    // Global pager
    if (needsPaging) {
      html += '<div class="actions" style="justify-content:flex-end; gap:8px; margin-top:8px">';
      html += `<button id="npPrev" class="btn xs" ${page <= 1 ? 'disabled' : ''}>Prev</button>`;
      html += `<span class="badge">${page} / ${pages}</span>`;
      html += `<button id="npNext" class="btn xs" ${page >= pages ? 'disabled' : ''}>Next</button>`;
      html += '</div>';
    }

    host.innerHTML = html;
    // Wire filter events
    const reRenderDebounced = __np_debounce(() => {
      const s2 = document.getElementById('unitSearch');
      const v2 = document.getElementById('fltVac');
      const n2 = document.getElementById('fltNotice');
      window.__npUnitsState.search = s2 ? s2.value : '';
      window.__npUnitsState.vac = v2 ? !!v2.checked : true;
      window.__npUnitsState.notice = n2 ? !!n2.checked : true;
      window.__npUnitsState.page = 1;
      window.__renderUnitPricingSection();
    }, 150);
    const s = document.getElementById('unitSearch');
    if (s && !s.__wired) {
      s.__wired = true;
      s.addEventListener('input', reRenderDebounced);
    }
    const a = document.getElementById('fltVac');
    if (a && !a.__wired) {
      a.__wired = true;
      a.addEventListener('change', reRenderDebounced);
    }
    const b = document.getElementById('fltNotice');
    if (b && !b.__wired) {
      b.__wired = true;
      b.addEventListener('change', reRenderDebounced);
    }
    host.querySelectorAll('button[data-coll]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-coll');
        const el = document.getElementById(id);
        const exp = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!exp));
        if (el) el.style.display = exp ? 'none' : 'block';
      });
    });
    const prev = document.getElementById('npPrev'),
      next = document.getElementById('npNext');
    if (prev)
      prev.onclick = () => {
        window.__npUnitsState.page = Math.max(1, (window.__npUnitsState.page || 1) - 1);
        window.__renderUnitPricingSection();
      };
    if (next)
      next.onclick = () => {
        window.__npUnitsState.page = Math.min(pages, (window.__npUnitsState.page || 1) + 1);
        window.__renderUnitPricingSection();
      };
    // Close any expanded inline details on re-render
    closeInlineUnitDetail();
    
    // Wire expand buttons (click + keyboard) - using event delegation for inline accordion
    const unitSection = document.getElementById('unitPricingSection');
    if (unitSection && !unitSection.__wiredInline) {
      unitSection.__wiredInline = true;
      
      // Click handler
      unitSection.addEventListener('click', e => {
        const btn = e.target.closest('.unit-expand');
        if (btn) {
          const unitId = btn.getAttribute('data-unit');
          if (unitId) toggleInlineUnitDetail(unitId);
        }
      });
      
      // Keyboard handler
      unitSection.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          const btn = e.target.closest('.unit-expand');
          if (btn) {
            e.preventDefault();
            const unitId = btn.getAttribute('data-unit');
            if (unitId) toggleInlineUnitDetail(unitId);
          }
        }
        
        // Escape key closes inline detail when focused inside
        if (e.key === 'Escape') {
          const detailRow = e.target.closest('.unit-detail-row');
          if (detailRow) {
            // Find the associated expand button and close
            const detailId = detailRow.id;
            const expandBtn = document.querySelector(`[aria-controls="${detailId}"]`);
            closeInlineUnitDetail();
            if (expandBtn) expandBtn.focus();
          }
        }
      });
    }
    // Restore focus nicety
    if (document.activeElement && document.activeElement.id === 'unitSearch') {
      const s3 = document.getElementById('unitSearch');
      if (s3) {
        s3.focus();
        const len = s3.value.length;
        try {
          s3.setSelectionRange(len, len);
        } catch (e) {}
      }
    }
  }

  // Helper: format percentage
  function formatPct(n) {
    return isFinite(n) ? Math.round(n * 10) / 10 + '%' : '—';
  }

  // Helper: escape HTML
  function __np_escape(s) {
    return String(s || '').replace(
      /[&<>"']/g,
      m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
    );
  }

  // Helper: determine unit status
  function unitStatus(u) {
    const s = String(u.status || '').toLowerCase();
    if (s.startsWith('vacant')) return 'Vacant';
    if (s.includes('on-notice') || s.includes('on notice')) return 'On Notice';
    if (s.startsWith('occupied')) return 'Occupied';
    return 'Unknown';
  }

  // Helper: format money
  function formatMoney(n) {
    return isFinite(n) ? '$' + Math.round(n) : '—';
  }

  // Helper: format date
  function fmtDate(s) {
    const d = new Date(s);
    return isNaN(d) ? '—' : d.toLocaleDateString();
  }

  // Helper: vacancy age in days
  function vacancyAgeDays(u, today) {
    if (unitStatus(u) !== 'Vacant') return 0;
    const vd = u.vacant_date ? new Date(u.vacant_date) : null;
    let base = vd;
    if (!base && u.lease_end_date) {
      const le = new Date(u.lease_end_date);
      if (!isNaN(le)) base = le;
    }
    if (!base || isNaN(base)) return 0;
    return Math.max(0, Math.floor((today - base) / 86400000));
  }

  // Helper: on notice available date
  function onNoticeAvailDate(u) {
    if (unitStatus(u) !== 'On Notice') return null;
    return u.available_date ? new Date(u.available_date) : null;
  }

  // Helper: sort units for floorplan
  function sortUnitsForFp(units, today) {
    const vac = [],
      notice = [];
    units.forEach(u => (unitStatus(u) === 'Vacant' ? vac : notice).push(u));
    vac.sort((a, b) => vacancyAgeDays(b, today) - vacancyAgeDays(a, today));
    notice.sort((a, b) => {
      const da = onNoticeAvailDate(a),
        db = onNoticeAvailDate(b);
      if (da && db) return da - db;
      if (da && !db) return -1;
      if (!da && db) return 1;
      return 0;
    });
    return vac.concat(notice);
  }

  // Helper: compute floorplan sort key
  function computeFpSortKey(fp) {
    const br = inferBedroomsFromCode(fp.code, fp.name);
    return [br, String(fp.code || '').toUpperCase()];
  }

  // Helper: infer bedrooms from code
  function inferBedroomsFromCode(code, name) {
    const s = String(code || '').toUpperCase() + ' ' + String(name || '').toUpperCase();
    if (/\bS(?:TUDIO)?\b|\bS0\b|^S\b/.test(s)) return 0;
    const m = s.match(/\b([0-4])\s*BR\b|\b([0-4])\s*BED\b|^([0-4])\b/);
    if (m) {
      const n = Number(m[1] || m[2] || m[3]);
      if (isFinite(n)) return n;
    }
    if (/^A\d/.test(s)) return 1;
    if (/^B\d/.test(s)) return 2;
    if (/^C\d/.test(s)) return 3;
    if (/^D\d/.test(s)) return 4;
    return 1;
  }

  // Helper: debounce function
  function __np_debounce(fn, wait) {
    let t;
    return function () {
      const ctx = this,
        args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), wait);
    };
  }

  /**
   * Compute unit baseline: floorplan baseline + amenity adjustment
   * @param {string} fpCode - Floorplan code
   * @param {number} amenityAdj - Amenity adjustment (can be +/-)
   * @param {number} referenceTerm - Reference term in months (default 14)
   * @returns {object} {baseline, fpBaseline, amenityAdj, referenceTerm}
   */
  function computeUnitBaseline(fpCode, amenityAdj, referenceTerm) {
    const fpIdx = buildFpIndex();
    const fp = fpIdx.get(fpCode);
    
    if (!fp || !isFinite(fp.referenceBase)) {
      return { baseline: 0, fpBaseline: 0, amenityAdj: 0, referenceTerm: referenceTerm || 14 };
    }
    
    const fpBaseline = Number(fp.referenceBase) || 0;
    const amenity = Number(amenityAdj) || 0;
    const baseline = Math.max(0, fpBaseline + amenity);
    
    return {
      baseline,
      fpBaseline,
      amenityAdj: amenity,
      referenceTerm: fp.referenceTerm || referenceTerm || 14,
    };
  }

  /**
   * Compute unit prices for all lease terms (2-14 months)
   * Applies short-term premium, over-cap premium, seasonality, and vacancy age discount
   * @param {number} unitBaseline - Unit baseline (FP base + amenity)
   * @param {number} referenceTerm - Reference term (usually 14)
   * @param {object} unit - Unit object for vacancy age calculation
   * @returns {array} Array of {term, price, notes} objects
   */
  function computeUnitTermPrices(unitBaseline, referenceTerm, unit = null) {
    const terms = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const results = [];
    
    // Calculate vacancy age discount if unit is provided
    let vacancyAgeDiscountPct = 0;
    if (unit && unitStatus(unit) === 'Vacant') {
      const vacantDays = vacancyAgeDays(unit, new Date());
      vacancyAgeDiscountPct = vacancyAgeDiscount(vacantDays) / 100; // Convert percentage to decimal
    }
    
    for (const term of terms) {
      const longTerm = term >= 10;
      
      // Calculate end date for this term
      const end = new Date();
      end.setMonth(end.getMonth() + term);
      const monthIdx = end.getMonth();
      
      // Short-term premium (2-9 months)
      const shortPct = longTerm ? 0 : (shortTermAdj(100, term) / 100 - 1);
      
      // Over-cap calculation (terms beyond reference)
      const isOverCap = term > referenceTerm;
      const overCapPct = isOverCap ? 0.02 : 0; // 2% premium for over-cap terms
      
      // Seasonality (only if positive and over-cap)
      const seasonalityMult = getSeasonalityMultiplier(monthIdx);
      const seasonalityPct = seasonalityMult - 1;
      const seasonalUplift = seasonalityPct > 0 && isOverCap ? seasonalityPct : 0;
      
      // Calculate final price (apply vacancy age discount)
      let price = unitBaseline * (1 + shortPct + overCapPct + seasonalUplift - vacancyAgeDiscountPct);
      price = Math.max(0, Math.round(price));
      
      // Build notes
      const parts = [];
      if (shortPct !== 0) {
        parts.push(`Short-term: ${(shortPct * 100).toFixed(1)}%`);
      }
      if (overCapPct !== 0) {
        parts.push(`Over-cap: +${(overCapPct * 100).toFixed(1)}%`);
      }
      if (seasonalUplift !== 0) {
        parts.push(`Seasonal: +${(seasonalUplift * 100).toFixed(1)}%`);
      }
      if (vacancyAgeDiscountPct !== 0) {
        parts.push(`Vacancy age: -${(vacancyAgeDiscountPct * 100).toFixed(1)}%`);
      }
      
      const totalPct = (price / Math.max(1, unitBaseline) - 1) * 100;
      const notes = parts.length > 0 
        ? `${parts.join(' + ')} = ${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)}%`
        : 'Base price';
      
      results.push({
        term,
        price,
        notes,
      });
    }
    
    return results;
  }

  /**
   * Render unit term pricing table
   * @param {HTMLElement} container - Container element to render into
   * @param {object} unit - Unit data object
   * @param {string} fpCode - Floorplan code
   */
  function renderUnitTermTable(container, unit, fpCode) {
    if (!container || !unit) return;
    
    // Get unit baseline data
    const amenityAdj = Number(unit.amenity_adj) || 0;
    const baselineData = computeUnitBaseline(fpCode, amenityAdj, 14);
    
    if (!baselineData.baseline || baselineData.baseline === 0) {
      container.innerHTML = '<div class="note">No baseline available for this unit.</div>';
      return;
    }
    
    // Compute term prices
    const termPrices = computeUnitTermPrices(baselineData.baseline, baselineData.referenceTerm, unit);
    
    // Build table HTML
    let html = '<div class="unit-terms-section">';
    html += `<h4>Term Pricing</h4>`;
    html += `<div class="note" style="margin-bottom: 8px;">`;
    html += `Unit baseline: ${formatMoney(baselineData.baseline)} `;
    html += `(FP: ${formatMoney(baselineData.fpBaseline)}`;
    if (amenityAdj !== 0) {
      const sign = amenityAdj > 0 ? '+' : '';
      html += ` ${sign}${formatMoney(amenityAdj)} amenity`;
    }
    html += `)`;
    
    // Add vacancy age discount information if applicable
    if (unit && unitStatus(unit) === 'Vacant') {
      const vacantDays = vacancyAgeDays(unit, new Date());
      const vacancyDiscount = vacancyAgeDiscount(vacantDays);
      if (vacancyDiscount > 0) {
        html += `<br><small style="color: #dc2626;">Vacancy age discount: ${vacancyDiscount.toFixed(1)}% (${vacantDays} days vacant)</small>`;
      }
    }
    html += `</div>`;
    
    html += '<table class="basic" style="width:100%">';
    html += '<thead><tr><th>Term</th><th>Price</th><th style="text-align:right;">Notes</th></tr></thead>';
    html += '<tbody>';
    
    termPrices.forEach(t => {
      html += `<tr>`;
      html += `<td>${t.term} mo</td>`;
      html += `<td>${formatMoney(t.price)}</td>`;
      html += `<td style="text-align:right;opacity:0.9"><small>${__np_escape(t.notes)}</small></td>`;
      html += `</tr>`;
    });
    
    html += '</tbody></table>';
    html += '</div>';
    
    container.innerHTML = html;
  }

  /**
   * Mount inline unit panel (accordion style)
   * @param {HTMLElement} parentEl - Parent element to mount into
   * @param {object} unit - Unit data object
   * @param {string} fpCode - Floorplan code
   */
  function mountInlineUnitPanel(parentEl, unit, fpCode) {
    if (!parentEl || !unit) return;
    
    // Clear any existing content
    parentEl.innerHTML = '';
    
    // Create container for term pricing
    const container = document.createElement('div');
    container.className = 'inline-unit-detail-content';
    container.style.padding = '16px';
    container.style.backgroundColor = '#f8f9fa';
    
    // Render term pricing table
    renderUnitTermTable(container, unit, fpCode);
    
    parentEl.appendChild(container);
  }

  // Helper: close all inline unit details
  function closeInlineUnitDetail() {
    // Remove any existing inline detail rows
    document.querySelectorAll('.unit-detail-row').forEach(row => row.remove());
    
    // Reset all expand button states
    document.querySelectorAll('.unit-expand').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '▼';
    });
    
    // Track closed state
    window.__currentOpenUnit = null;
  }

  // Helper: toggle inline unit detail (accordion style)
  function toggleInlineUnitDetail(unitId) {
    // Find the unit row
    const unitRow = document.querySelector(`tr.unit-row[data-key*="${unitId}"]`);
    if (!unitRow) return;
    
    // Get the expand button
    const expandBtn = unitRow.querySelector('.unit-expand');
    if (!expandBtn) return;
    
    // Check if this unit is already open
    const isCurrentlyOpen = window.__currentOpenUnit === unitId;
    
    // Close any open unit detail
    closeInlineUnitDetail();
    
    // If this was already open, just close it (toggle off)
    if (isCurrentlyOpen) {
      // Focus back on the button
      if (expandBtn) expandBtn.focus();
      return;
    }
    
    // Get unit data
    const fp = unitRow.getAttribute('data-fp');
    const unitData = (window.__npUnitsFiltered || []).find(u => String(u.unit) === unitId);
    
    if (!unitData || !fp) return;
    
    // Create inline detail row
    const detailRow = document.createElement('tr');
    detailRow.className = 'unit-detail-row';
    const detailId = `unit-detail-${unitId}`;
    detailRow.id = detailId;
    
    // Create cell that spans all columns
    const detailCell = document.createElement('td');
    detailCell.setAttribute('colspan', '100');
    detailCell.setAttribute('role', 'region');
    detailCell.setAttribute('aria-label', `Unit ${unitId} term pricing details`);
    
    // Insert after the unit row
    unitRow.parentNode.insertBefore(detailRow, unitRow.nextSibling);
    detailRow.appendChild(detailCell);
    
    // Mount the inline panel
    mountInlineUnitPanel(detailCell, unitData, fp);
    
    // Update button state
    if (expandBtn) {
      expandBtn.setAttribute('aria-expanded', 'true');
      expandBtn.setAttribute('aria-controls', detailId);
      expandBtn.innerHTML = '▲';
    }
    
    // Track open state
    window.__currentOpenUnit = unitId;
    
    // Focus management - move focus into the detail panel
    const firstFocusable = detailCell.querySelector('h4, button, a, input, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
  }

  // Expose functions to window
  window.buildFpIndex = buildFpIndex;
  window.buildUnits = buildUnits;
  window.buildUnitsAll = buildUnitsAll;
  window.__renderUnitPricingSection = renderUnitPricingSection;
  window.computeUnitBaseline = computeUnitBaseline;
  window.computeUnitTermPrices = computeUnitTermPrices;
  window.renderUnitTermTable = renderUnitTermTable;
  window.mountInlineUnitPanel = mountInlineUnitPanel;
  window.toggleInlineUnitDetail = toggleInlineUnitDetail;
  window.closeInlineUnitDetail = closeInlineUnitDetail;

  // Development boundary guards
  if (window.__RM_DEV_GUARDS) {
    window.__RM_DEV_GUARDS.assert(
      !window.__RM_DEV_GUARDS.hasFunction('renderNewLease') ||
        typeof window.renderNewLease !== 'function',
      'Unit code should not call floorplan rendering directly.'
    );
    window.__RM_DEV_GUARDS.assert(
      !window.__RM_DEV_GUARDS.hasElement('nlTables'),
      'Unit code should not access floorplan DOM elements directly.'
    );
  }
})();
