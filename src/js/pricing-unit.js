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

(function(){
  'use strict';

  // Helper to get best term for FP
  function getBestTermForFp(fp){ 
    return { termMonths: fp.referenceTerm||14, price: fp.referenceBase }; 
  }

  // Build FP index from __fpResults or by scraping DOM
  function buildFpIndex(){
    const idx=new Map();
    if (Array.isArray(window.__fpResults)){
      window.__fpResults.forEach(r=>{ 
        if(r&&r.code) idx.set(String(r.code), { 
          code:r.code, 
          name:r.name||r.code, 
          referenceBase:r.referenceBase, 
          referenceTerm:r.referenceTerm||14 
        }); 
      });
    } else {
      // Fallback scrape: find "reference: N mo @ $X" in FP debug lines
      document.querySelectorAll('#nlTables .card').forEach(card=>{
        const title = card.querySelector('div[style*="font-weight:600"],h2,h3');
        if (!title) return; 
        const code=(title.textContent||'').trim().split(/\s+/)[0];
        const dbg = Array.from(card.querySelectorAll('.note,div,p')).find(x=>/reference:\s*\d+\s*mo\s*@\s*\$?/i.test(x.textContent||''));
        let ref=null; 
        if(dbg){ 
          const m=(dbg.textContent||'').match(/reference:\s*(\d+)\s*mo\s*@\s*\$?([0-9,]+)/i); 
          if(m){ 
            ref=Number(String(m[2]).replace(/,/g,'')); 
          }
        }
        if(code && isFinite(ref)) idx.set(code, { 
          code, 
          name:code, 
          referenceBase:ref, 
          referenceTerm:Number((dbg?.match?.(/(\d+)\s*mo/)||[])[1])||14 
        });
      });
    }
    return idx;
  }

  // Build units for vacant/on notice (for FP tab)
  function buildUnits(){
    const rows = Array.isArray(window.normRows)&&window.normRows.length? window.normRows : (Array.isArray(window.mappedRows)? window.mappedRows:[]);
    const map = (function(){ try{ const ps=window.propertySetup||{}; const pid=ps.property_id||ps.property_name||'default'; return JSON.parse(localStorage.getItem(`rm:fpmap:${pid}`))||{}; }catch(e){ return {}; } })();
    const AMENITY_KEYS = [
      'AmenityAdj','Amenity_Adjustment','AmenityAdjustment','Amenity Delta','Amenity_Delta','Amenity Rent','Amenity_Rent',
      'Amenities','Amenity','UnitAdj','Unit_Adjustment','Unit Adjustment','Unit Premium','Premium','Surcharge',
      'AddlRent','Addl_Rent','Additional Rent','Other Rent','Other_Rent'
    ];
    const list = rows.map(r=>({
      unit: r.UnitID||r.Unit||r.UnitNbr||r.UnitNumber||'',
      floorplan_code: r.FP_CODE || map[String(r.Floorplan||'').trim()] || String(r.Floorplan||'').trim(),
      status: r.Status || r.status || '',
      vacant_date: r.VacantDate || r.vacant_date || null,
      available_date: r.PreleaseStart || r.available_date || null,
      lease_end_date: (r.LeaseEnd || r.Lease_End || r.LeaseEndDate || r.Lease_End_Date || r['Lease End'] || r['Lease End Date'] || r.MoveOut || r.Move_Out || r.MoveOutDate || r.Move_Out_Date || r['Move Out'] || r['Move Out Date'] || null),
      amenity_adj: (function(){ let tot=0; for(const k of AMENITY_KEYS){ if(Object.prototype.hasOwnProperty.call(r,k)) tot+=__toNumberSigned(r[k]); const lk=k.toLowerCase(); for(const kk in r){ if(kk && kk.toLowerCase()===lk){ tot+=__toNumberSigned(r[kk]); break; } } } return tot; })(),
      current: r.Price || r.CurrentRent || null
    })).filter(u=> String(u.unit||'').trim());
    return list.filter(u=>{ const s=unitStatus(u); return s==='Vacant' || s==='On Notice'; });
  }

  // FP map helpers (shared)
  function __fpMapKey(){ 
    try{ 
      const ps=window.propertySetup||{}; 
      return 'rm:fpmap:' + (ps.property_id||ps.property_name||'default'); 
    }catch(e){ 
      return 'rm:fpmap:default'; 
    } 
  }
  function __loadFPMap(){ 
    try{ 
      const raw=localStorage.getItem(__fpMapKey()); 
      return raw? JSON.parse(raw): {}; 
    }catch(e){ 
      return {}; 
    } 
  }

  // Build all units (no status filter) for Unit sub-tab
  function buildUnitsAll(){
    // Prefer normalized rows (already FP_CODE) if available
    if (Array.isArray(window.normRows) && window.normRows.length){
      const AMENITY_KEYS = [
        'AmenityAdj','Amenity_Adjustment','AmenityAdjustment','Amenity Delta','Amenity_Delta','Amenity Rent','Amenity_Rent',
        'Amenities','Amenity','UnitAdj','Unit_Adjustment','Unit Adjustment','Unit Premium','Premium','Surcharge',
        'AddlRent','Addl_Rent','Additional Rent','Other Rent','Other_Rent'
      ];
      return window.normRows.map(r=>({
        unit: r.UnitID||r.Unit||r.UnitNbr||r.UnitNumber||'',
        floorplan_code: r.FP_CODE || String(r.Floorplan||'').trim(),
        status: r.Status || r.status || '',
        vacant_date: r.VacantDate || r.vacant_date || null,
        available_date: r.PreleaseStart || r.available_date || null,
        lease_end_date: (r.LeaseEnd || r.Lease_End || r.LeaseEndDate || r.Lease_End_Date || r['Lease End'] || r['Lease End Date'] || r.MoveOut || r.Move_Out || r.MoveOutDate || r.Move_Out_Date || r['Move Out'] || r['Move Out Date'] || null),
        amenity_adj: (function(){ let tot=0; for(const k of AMENITY_KEYS){ if(Object.prototype.hasOwnProperty.call(r,k)) tot+=__toNumberSigned(r[k]); const lk=k.toLowerCase(); for(const kk in r){ if(kk && kk.toLowerCase()===lk){ tot+=__toNumberSigned(r[kk]); break; } } } return tot; })(),
        current: r.Price || r.CurrentRent || null
      })).filter(u=> String(u.unit||'').trim());
    } else if (Array.isArray(window.mappedRows)){
      // Fallback to mappedRows with manual mapping
      const map = __loadFPMap();
      const AMENITY_KEYS = [
        'AmenityAdj','Amenity_Adjustment','AmenityAdjustment','Amenity Delta','Amenity_Delta','Amenity Rent','Amenity_Rent',
        'Amenities','Amenity','UnitAdj','Unit_Adjustment','Unit Adjustment','Unit Premium','Premium','Surcharge',
        'AddlRent','Addl_Rent','Additional Rent','Other Rent','Other_Rent'
      ];
      const out = window.mappedRows.map(r=>({
        unit: r.UnitID||r.Unit||r.UnitNbr||r.UnitNumber||'',
        floorplan_code: map[String(r.Floorplan||'').trim()] || String(r.Floorplan||'').trim(),
        status: r.Status || r.status || '',
        vacant_date: r.VacantDate || r.vacant_date || null,
        available_date: r.PreleaseStart || r.available_date || null,
        lease_end_date: (r.LeaseEnd || r.Lease_End || r.LeaseEndDate || r.Lease_End_Date || r['Lease End'] || r['Lease End Date'] || r.MoveOut || r.Move_Out || r.MoveOutDate || r.Move_Out_Date || r['Move Out'] || r['Move Out Date'] || null),
        amenity_adj: (function(){ let tot=0; for(const k of AMENITY_KEYS){ if(Object.prototype.hasOwnProperty.call(r,k)) tot+=__toNumberSigned(r[k]); const lk=k.toLowerCase(); for(const kk in r){ if(kk && kk.toLowerCase()===lk){ tot+=__toNumberSigned(r[kk]); break; } } } return tot; })(),
        current: r.Price || r.CurrentRent || null
      })).filter(u=> String(u.unit||'').trim());
      return out;
    }
    return [];
  }

  // Render Unit Pricing Section (stub for now - will be populated with actual rendering logic)
  function renderUnitPricingSection(){
    const container = document.getElementById('unitPricingSection');
    if (!container) return;
    
    // Get state from window
    const state = window.__npUnitsState || { search:'', vac:true, notice:true, page:1 };
    const searchValRaw = state.search || '';
    const fltVac = state.vac !== false;
    const fltNotice = state.notice !== false;
    
    // Build units
    const allUnits = buildUnitsAll();
    if (!allUnits || allUnits.length === 0){
      container.innerHTML = '<div class="note">No units found. Upload a rent roll first.</div>';
      return;
    }
    
    // Apply filters
    let filtered = allUnits;
    
    // Status filter
    filtered = filtered.filter(u=>{
      const st = unitStatus(u);
      if (state.vac && st==='Vacant') return true;
      if (state.notice && st==='On Notice') return true;
      if (!state.vac && !state.notice) return st==='Occupied'; // fallback
      return false;
    });
    
    // Search filter
    if (state.search && state.search.trim()){
      const q = state.search.toLowerCase().trim();
      filtered = filtered.filter(u=>{
        const unit = String(u.unit||'').toLowerCase();
        const fp = String(u.floorplan_code||'').toLowerCase();
        return unit.includes(q) || fp.includes(q);
      });
    }
    
    // Store filtered for external use
    window.__npUnitsFiltered = filtered;
    
    // Render unit table with proper implementation
    let html = '';
    
    // Filters row
    html += '<div class="actions" style="gap:8px; align-items:center; margin-bottom:8px">';
    html += `<input type="text" id="unitSearch" placeholder="Search unit or FP code" style="max-width:220px" value="${searchValRaw}" />`;
    html += `<label class="inline-flex items-center" style="gap:4px"><input type="checkbox" id="fltVac" ${fltVac?'checked':''}> Vacant</label>`;
    html += `<label class="inline-flex items-center" style="gap:4px"><input type="checkbox" id="fltNotice" ${fltNotice?'checked':''}> On Notice</label>`;
    html += '</div>';

    // Summary row
    html += `<div class="note" style="margin-bottom:8px">Found ${totalUnits} units matching filters.`;
    if (hasUnmapped) html += ' Some units have unmapped floorplan codes.';
    html += '</div>';

    // Paging controls if needed
    if (needsPaging) {
      html += '<div class="actions" style="gap:8px; margin-bottom:8px">';
      html += `<button class="btn sm" ${page<=1?'disabled':''} onclick="window.__npUnitsState.page=${page-1}; __renderUnitPricingSection();">← Prev</button>`;
      html += `<span>Page ${page} of ${pages}</span>`;
      html += `<button class="btn sm" ${page>=pages?'disabled':''} onclick="window.__npUnitsState.page=${page+1}; __renderUnitPricingSection();">Next →</button>`;
      html += '</div>';
    }

    // Floorplan groups
    for(const fp of fps){
      const units = byFP.get(fp.code) || [];
      const sortedUnits = sortUnitsForFp(units, today);
      html += `<div style="border:1px solid #0b2035; border-radius:8px; padding:8px; margin-bottom:8px">`;
      html += `<div style="font-weight:600; margin-bottom:4px">${fp.code} - ${fp.name} (${units.length} units)</div>`;
      html += '<table class="basic" style="margin:0">';
      html += '<thead><tr><th>Unit</th><th>Status</th><th>Current Rent</th><th>Available</th><th>Actions</th></tr></thead>';
      html += '<tbody>';
      for(const u of sortedUnits){
        const st = unitStatus(u);
        const vacDays = vacancyAgeDays(u, today);
        const availDate = onNoticeAvailDate(u);
        const availText = st === 'Vacant' ? (vacDays > 0 ? `${vacDays} days` : 'Ready') : (availDate ? fmtDate(availDate) : '—');
        html += `<tr>
          <td>${u.unit}</td>
          <td><span class="badge ${st==='Vacant'?'badge-red':st==='On Notice'?'badge-yellow':''}">${st}</span></td>
          <td>${formatMoney(u.current_rent)}</td>
          <td>${availText}</td>
          <td><button class="btn sm unit-expand" data-unit="${u.unit}" aria-label="View details for unit ${u.unit}">Details</button></td>
        </tr>`;
      }
      html += '</tbody></table></div>';
    }

    container.innerHTML = html;

    // Wire up event handlers
    const searchEl = document.getElementById('unitSearch');
    if (searchEl && !searchEl.__wired) {
      searchEl.__wired = true;
      searchEl.addEventListener('input', __np_debounce(() => {
        window.__npUnitsState.search = searchEl.value;
        __renderUnitPricingSection();
      }, 300));
    }

    const vacEl = document.getElementById('fltVac');
    if (vacEl && !vacEl.__wired) {
      vacEl.__wired = true;
      vacEl.addEventListener('change', () => {
        window.__npUnitsState.vac = vacEl.checked;
        __renderUnitPricingSection();
      });
    }

    const notEl = document.getElementById('fltNotice');
    if (notEl && !notEl.__wired) {
      notEl.__wired = true;
      notEl.addEventListener('change', () => {
        window.__npUnitsState.notice = notEl.checked;
        __renderUnitPricingSection();
      });
    }

    // Ensure detail box exists
    (function ensureDetailBox(){
      const hostBox = document.getElementById('unitDetailBox');
      if (hostBox) return;
      const box = document.createElement('div'); box.id='unitDetailBox'; box.className='unit-detail-box hidden'; box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-labelledby','udbTitle');
      box.innerHTML = '<div class="udb-card"><div class="udb-header"><div id="udbTitle" class="udb-title"></div><button id="udbClose" class="btn-icon" aria-label="Close">✕</button></div><div class="udb-body"></div></div>';
      const sec = document.getElementById('unitPricingSection'); if (sec) sec.appendChild(box);
      const closer = box.querySelector('#udbClose'); if (closer && !closer.__wired){ closer.__wired=true; closer.addEventListener('click', closeUnitDetail); }
      if (!window.__npDetailEsc){ window.__npDetailEsc=true; document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') closeUnitDetail(); }); }
    })();

    // Close any expanded details on re-render
    closeUnitDetail();
    // Wire expand buttons (click + keyboard) - using event delegation
    const unitSection = document.getElementById('unitPricingSection');
    if (unitSection && !unitSection.__wired) {
      unitSection.__wired = true;
      unitSection.addEventListener('click', (e) => {
        const btn = e.target.closest('.unit-expand');
        if (btn) {
          const unitId = btn.getAttribute('data-unit');
          if (unitId) openUnitDetail(unitId);
        }
      });
      unitSection.addEventListener('keydown', (e) => {
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
  }

  // Helper: determine unit status
  function unitStatus(u){
    const s = String(u.status||'').toLowerCase();
    if (s.startsWith('vacant')) return 'Vacant';
    if (s.startsWith('occupied') && u.lease_end_date) return 'On Notice';
    if (s.startsWith('occupied')) return 'Occupied';
    return 'Unknown';
  }

  // Helper: format money
  function formatMoney(n){ 
    return isFinite(n)? ('$'+Math.round(n)):'—'; 
  }

  // Helper: format date
  function fmtDate(s){ 
    const d=new Date(s); 
    return isNaN(d)? "—" : d.toLocaleDateString(); 
  }

  // Helper: vacancy age in days
  function vacancyAgeDays(u, today){
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
  function onNoticeAvailDate(u){ 
    if(unitStatus(u)!=='On Notice') return null; 
    return u.available_date? new Date(u.available_date):null; 
  }

  // Helper: sort units for floorplan
  function sortUnitsForFp(units, today){ 
    const vac=[], notice=[]; 
    units.forEach(u=> (unitStatus(u)==='Vacant'?vac:notice).push(u)); 
    vac.sort((a,b)=>vacancyAgeDays(b,today)-vacancyAgeDays(a,today)); 
    notice.sort((a,b)=>{ 
      const da=onNoticeAvailDate(a), db=onNoticeAvailDate(b); 
      if(da&&db) return da-db; 
      if(da&&!db) return -1; 
      if(!da&&db) return 1; 
      return 0; 
    }); 
    return vac.concat(notice); 
  }

  // Helper: compute floorplan sort key
  function computeFpSortKey(fp){ 
    const br=inferBedroomsFromCode(fp.code, fp.name); 
    return [br, String(fp.code||'').toUpperCase()]; 
  }

  // Helper: infer bedrooms from code
  function inferBedroomsFromCode(code,name){ 
    const s=(String(code||'').toUpperCase()+' '+String(name||'').toUpperCase()); 
    if(/\bS(?:TUDIO)?\b|\bS0\b|^S\b/.test(s)) return 0; 
    const m=s.match(/\b([0-4])\s*BR\b|\b([0-4])\s*BED\b|^([0-4])\b/); 
    if(m){ 
      const n=Number(m[1]||m[2]||m[3]); 
      if(isFinite(n)) return n; 
    } 
    if(/^A\d/.test(s)) return 1; 
    if(/^B\d/.test(s)) return 2; 
    if(/^C\d/.test(s)) return 3; 
    if(/^D\d/.test(s)) return 4; 
    return 1; 
  }

  // Helper: debounce function
  function __np_debounce(fn, wait){ 
    let t; 
    return function(){ 
      const ctx=this, args=arguments; 
      clearTimeout(t); 
      t=setTimeout(()=>fn.apply(ctx,args), wait); 
    }; 
  }

  // Helper: close unit detail (placeholder)
  function closeUnitDetail(){
    const box = document.getElementById('unitDetailBox');
    if (box) box.classList.add('hidden');
  }

  // Helper: open unit detail (placeholder)
  function openUnitDetail(unitId){
    console.log('Opening unit detail for:', unitId);
    // Placeholder - detail functionality would go here
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
