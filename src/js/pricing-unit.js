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
        '<div style="overflow:auto"><table class="basic" style="width:100%"><thead><tr><th>Unit</th><th>FP</th><th>Status</th><th>Avail / Vacant Age</th><th>Current</th><th>Proposed (ref)</th><th>Δ $</th><th>Δ %</th><th>Amenities</th><th class="ta-right w-8">&nbsp;</th></tr></thead><tbody>';
      list.forEach(u => {
        const st = unitStatus(u);
        const cur = Number(u.current) || NaN;
        const refPrice = Number(fp.referenceBase) || NaN;
        const amen = Number(u.amenity_adj || 0);
        const proposedWithAmen = Math.max(0, (isFinite(refPrice) ? refPrice : 0) + amen);
        const d$ = isFinite(cur) && isFinite(proposedWithAmen) ? proposedWithAmen - cur : NaN;
        const dP = isFinite(cur) && cur > 0 ? (d$ / cur) * 100 : NaN;
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
        const key = `${fp.code}::${String(u.unit || '')}`;
        html +=
          `<tr class="unit-row" data-key="${key}" data-base="${isFinite(proposedWithAmen) ? proposedWithAmen : ''}" data-cur="${isFinite(cur) ? cur : ''}" data-fp="${fp.code}">` +
          `<td>${__np_escape(String(u.unit || ''))}</td>` +
          `<td>${fp.code}</td><td>${st}</td><td>${availTxt}</td><td>${isFinite(cur) ? formatMoney(cur) : '—'}</td><td>${isFinite(proposedWithAmen) ? formatMoney(proposedWithAmen) : '—'}</td><td>${isFinite(d$) ? formatMoney(d$) : '—'}</td><td>${isFinite(dP) ? formatPct(dP) : '—'}</td><td>${amenCell}</td></tr>`;
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
    // Detail box wiring (overlay) and builder
    // Ensure detail container exists once
    (function ensureDetailBox() {
      const hostBox = document.getElementById('unitDetailBox');
      if (hostBox) return;
      const box = document.createElement('div');
      box.id = 'unitDetailBox';
      box.className = 'unit-detail-box hidden';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'udbTitle');
      box.innerHTML =
        '<div class="udb-card"><div class="udb-header"><div id="udbTitle" class="udb-title"></div><button id="udbClose" class="btn-icon" aria-label="Close">✕</button></div><div class="udb-body"></div></div>';
      const sec = document.getElementById('unitPricingSection');
      if (sec) sec.appendChild(box);
      const closer = box.querySelector('#udbClose');
      if (closer && !closer.__wired) {
        closer.__wired = true;
        closer.addEventListener('click', closeUnitDetail);
      }
      if (!window.__npDetailEsc) {
        window.__npDetailEsc = true;
        document.addEventListener('keydown', e => {
          if (e.key === 'Escape') closeUnitDetail();
        });
      }
    })();

    // Close any expanded details on re-render
    closeUnitDetail();
    // Wire expand buttons (click + keyboard) - using event delegation
    const unitSection = document.getElementById('unitPricingSection');
    if (unitSection && !unitSection.__wired) {
      unitSection.__wired = true;
      unitSection.addEventListener('click', e => {
        const btn = e.target.closest('.unit-expand');
        if (btn) {
          const unitId = btn.getAttribute('data-unit');
          if (unitId) openUnitDetail(unitId);
        }
      });
      unitSection.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          const btn = e.target.closest('.unit-expand');
          if (btn) {
            e.preventDefault();
            const unitId = btn.getAttribute('data-unit');
            if (unitId) openUnitDetail(unitId);
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

  // Helper: close unit detail
  function closeUnitDetail() {
    const box = document.getElementById('unitDetailBox');
    if (box) box.classList.add('hidden');
    
    // Reset all expand button states
    document.querySelectorAll('.unit-expand').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '▼';
    });
  }

  // Helper: open unit detail
  function openUnitDetail(unitId) {
    const box = document.getElementById('unitDetailBox');
    if (!box) return;
    
    // Find the unit data
    const unitRow = document.querySelector(`tr[data-key*="${unitId}"]`);
    if (!unitRow) return;
    
    // Get unit data from row attributes
    const base = unitRow.getAttribute('data-base');
    const current = unitRow.getAttribute('data-cur');
    const fp = unitRow.getAttribute('data-fp');
    
    // Get unit details from the row cells
    const cells = unitRow.querySelectorAll('td');
    const unit = cells[0]?.textContent || unitId;
    const status = cells[2]?.textContent || 'Unknown';
    const avail = cells[3]?.textContent || '—';
    const currentRent = cells[4]?.textContent || '—';
    const proposed = cells[5]?.textContent || '—';
    const delta = cells[6]?.textContent || '—';
    const deltaPct = cells[7]?.textContent || '—';
    const amenities = cells[8]?.textContent || '—';
    
    // Update the detail box content
    const titleEl = document.getElementById('udbTitle');
    const bodyEl = box.querySelector('.udb-body');
    
    if (titleEl) titleEl.textContent = `Unit ${unit} Details`;
    
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div class="unit-detail-content">
          <div class="detail-grid">
            <div class="detail-item">
              <label>Unit:</label>
              <span>${unit}</span>
            </div>
            <div class="detail-item">
              <label>Floorplan:</label>
              <span>${fp}</span>
            </div>
            <div class="detail-item">
              <label>Status:</label>
              <span>${status}</span>
            </div>
            <div class="detail-item">
              <label>Availability:</label>
              <span>${avail}</span>
            </div>
            <div class="detail-item">
              <label>Current Rent:</label>
              <span>${currentRent}</span>
            </div>
            <div class="detail-item">
              <label>Proposed Rent:</label>
              <span>${proposed}</span>
            </div>
            <div class="detail-item">
              <label>Delta:</label>
              <span>${delta} (${deltaPct})</span>
            </div>
            <div class="detail-item">
              <label>Amenities:</label>
              <span>${amenities}</span>
            </div>
          </div>
        </div>
      `;
    }
    
    // Show the detail box
    box.classList.remove('hidden');
    
    // Update the expand button state
    const expandBtn = document.querySelector(`.unit-expand[data-unit="${unitId}"]`);
    if (expandBtn) {
      expandBtn.setAttribute('aria-expanded', 'true');
      expandBtn.innerHTML = '▲';
    }
    
    // Focus the close button for accessibility
    const closeBtn = box.querySelector('#udbClose');
    if (closeBtn) closeBtn.focus();
  }

  // Expose functions to window
  window.buildFpIndex = buildFpIndex;
  window.buildUnits = buildUnits;
  window.buildUnitsAll = buildUnitsAll;
  window.__renderUnitPricingSection = renderUnitPricingSection;

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
