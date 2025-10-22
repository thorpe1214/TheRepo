(function(){
  // Floorplan Settings CRUD and validation
  window.__RM_LOADED = window.__RM_LOADED || [];
  window.__RM_LOADED.push('settings-fp.js');
  function $(id){ return document.getElementById(id); }
  function clamp(x, lo, hi){ return Math.min(Math.max(x, lo), hi); }
  function toInt(v, d=0){ const n=Number(v); return Number.isFinite(n)? Math.round(n): d; }
  function normalizeCode(s){ return String(s||'').trim().replace(/\s+/g,' '); }
  const LS_KEY = 'rm:propertySetup:floorplans';

  // Initialize state
  window.propertySetup = window.propertySetup || {
    community_settings: { target_occupancy_pct: 95 },
    floorplans: []
  };

  // Helpers: compute duplicate codes map
  function dupMap(rows){ const m=new Map(); for(const r of rows){ const c=normalizeCode(r.code); if(!c) continue; m.set(c,(m.get(c)||0)+1);} return m; }
  function bandIssues(low, high){
    const out = { lowGtHigh:false, outOfRange:false };
    const l=Number(low), h=Number(high);
    if (Number.isFinite(l) && Number.isFinite(h) && l>h) out.lowGtHigh=true;
    if ((l && (l<70 || l>100)) || (h && (h<70 || h>100))) out.outOfRange = true;
    return out;
  }

  // Validity checks for saving
  function isRowValid(r){
    if (!String(r.code||'').trim()) return false;
    if (!String(r.name||'').trim()) return false;
    const l = Number(r.band_low_pct), h = Number(r.band_high_pct);
    if (!Number.isFinite(l) || !Number.isFinite(h)) return false;
    if (l<70 || l>100 || h<70 || h>100) return false;
    if (l>h) return false;
    if (Number(r.units)<0) return false;
    if (Number(r.gap_to_next_tier_dollars)<0) return false;
    if (Number(r.reference_ask)<0) return false;
    if (r.price_floor_dollars!=null && String(r.price_floor_dollars)!=='' && Number(r.price_floor_dollars)<0) return false;
    if (r.price_ceiling_dollars!=null && String(r.price_ceiling_dollars)!=='' && Number(r.price_ceiling_dollars)<0) return false;
    return true;
  }
  function isTableValid(){
    const rows = window.propertySetup.floorplans || [];
    const dups = dupMap(rows);
    for(const r of rows){ if (String(r.code||'') && dups.get(normalizeCode(r.code))>1) return false; }
    return rows.every(isRowValid);
  }

  function updateSavedChip(text){
    const chip = document.getElementById('fpSavedChip');
    if (!chip) return;
    if (text){ chip.textContent = text; chip.style.display='inline-block'; }
    else { chip.textContent=''; chip.style.display='none'; }
  }

  function saveFPsLocal(){
    try{
      const rows = (window.propertySetup.floorplans || []).map(r=>{
        const { stop_down_buffer_dollars, ...rest } = (r||{});
        return rest;
      });
      window.propertySetup.floorplans = rows; // normalize in-memory as well
      localStorage.setItem(LS_KEY, JSON.stringify(rows));
      const t = new Date().toLocaleTimeString();
      updateSavedChip('Saved locally ' + t);
    }catch(e){ /* ignore */ }
  }
  function maybeSaveLocal(){ if (isTableValid()) saveFPsLocal(); }
  function loadFPsLocal(){
    try{
      const rows = window.propertySetup.floorplans || [];
      if (rows.length) return;
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        window.propertySetup.floorplans = parsed.map(r=>{ const { stop_down_buffer_dollars, ...rest } = (r||{}); return rest; });
      }
    }catch(e){ /* ignore */ }
  }

  // Render table body from state
  function renderFPTable(){
    const tbody = $('fpTableBody'); if(!tbody) return;
    const rows = window.propertySetup.floorplans || [];
    const dups = dupMap(rows);
    const esc = s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
    // derive bedroom tiers once to disable gap field on lowest tier
    function _bedOf(code,name){
      const c=String(code||''); const s=(String(code||'')+' '+String(name||'')).toLowerCase();
      if (/\b(s0|studio|0x1)\b/i.test(c) || /\b(studio|0x1)\b/.test(String(name||'').toLowerCase())) return 0;
      if (/\b1x1\b/i.test(s) || /\b1\s*br\b/i.test(s)) return 1;
      if (/\b2x2\b/i.test(s) || /\b2\s*br\b/i.test(s)) return 2;
      if (/\b3x\d\b/i.test(s) || /\b3\s*br\b/i.test(s)) return 3;
      if (/\b4x\d\b/i.test(s) || /\b4\s*br\b/i.test(s)) return 4;
      if (/^a/i.test(c)) return 1; if (/^b/i.test(c)) return 2; if (/^c/i.test(c)) return 3;
      const m1=s.match(/(\d)\s*br/); if(m1) return parseInt(m1[1]); const m2=s.match(/(\d)\s*x\s*(\d)/); if(m2) return parseInt(m2[1]);
      return 1;
    }
    const minTier = rows.length ? Math.min(...rows.map(r=>_bedOf(r.code,r.name))) : 0;
    const maxTier = rows.length ? Math.max(...rows.map(r=>_bedOf(r.code,r.name))) : 0;

    tbody.innerHTML = rows.map((r,idx)=>{
      const code = normalizeCode(r.code);
      const issues = bandIssues(r.band_low_pct, r.band_high_pct);
      const badges = [];
      if (code && dups.get(code)>1) badges.push('<span class="badge danger">Duplicate code</span>');
      if (issues.lowGtHigh) badges.push('<span class="badge danger">Low > High</span>');
      if (issues.outOfRange) badges.push('<span class="badge warn">Outside range</span>');
      const reqClass = (v)=> (String(v||'').trim()? '' : 'invalid');
      return `<tr data-row="${idx}">
        <td style="color:#94a3b8">⋮⋮</td>
        <td>
          ${badges.join(' ')}
          <input type="text" maxlength="12" value="${esc(r.code)}" aria-label="Code" class="${reqClass(r.code)}" data-k="code" data-i="${idx}" data-fp-field="code" style="width:120px" />
        </td>
        <td>
          <input type="text" maxlength="40" value="${esc(r.name)}" aria-label="Name" class="${reqClass(r.name)}" data-k="name" data-i="${idx}" data-fp-field="name" style="width:160px" />
        </td>
        <td>
          <input type="number" step="1" min="0" value="${toInt(r.units,0)}" aria-label="Units" data-k="units" data-i="${idx}" data-fp-field="units" style="width:90px" />
        </td>
        <td>
          <input type="number" step="0.5" min="70" max="100" value="${Number(r.band_low_pct||0)}" aria-label="Band Low %" data-k="band_low_pct" data-i="${idx}" data-fp-field="bandlow" style="width:110px" />
        </td>
        <td>
          <input type="number" step="0.5" min="70" max="100" value="${Number(r.band_high_pct||0)}" aria-label="Band High %" data-k="band_high_pct" data-i="${idx}" data-fp-field="bandhigh" style="width:110px" />
        </td>
        <td>
          ${(_bedOf(r.code,r.name)===maxTier)
            ? `<input type="number" step="1" min="0" value="0" aria-label="Min Gap to Next Tier $" data-k="gap_to_next_tier_dollars" data-i="${idx}" data-fp-field="gapnew" style="width:170px" disabled readonly class="readonly" />`
            : `<input type=\"number\" step=\"1\" min=\"0\" value=\"${toInt(r.gap_to_next_tier_dollars||0,0)}\" aria-label=\"Min Gap to Next Tier $\" data-k=\"gap_to_next_tier_dollars\" data-i=\"${idx}\" data-fp-field=\"gapnew\" style=\"width:170px\" />`}
        </td>
        <td>
          <input type="number" step="1" min="0" value="${toInt(r.reference_ask||0,0)}" aria-label="Starting Rent $" data-k="reference_ask" data-i="${idx}" data-fp-field="refask" style="width:130px" />
        </td>
        <td>
          <input type="number" step="1" min="0" value="${(r.price_floor_dollars!=null&&String(r.price_floor_dollars)!=='')?toInt(r.price_floor_dollars,0):''}" aria-label="Price Floor ($)" data-k="price_floor_dollars" data-i="${idx}" data-fp-field="pfloor" style="width:120px" />
        </td>
        <td>
          <input type="number" step="1" min="0" value="${(r.price_ceiling_dollars!=null&&String(r.price_ceiling_dollars)!=='')?toInt(r.price_ceiling_dollars,0):''}" aria-label="Price Ceiling ($)" data-k="price_ceiling_dollars" data-i="${idx}" data-fp-field="pceil" style="width:120px" />
        </td>
        <td>
          <button class="btn xs" data-action="del" data-i="${idx}" aria-label="Delete row">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    // Wire inputs
    tbody.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input', onInputValidate);
      inp.addEventListener('change', onCommit);
      inp.addEventListener('blur', onCommit);
    });
    tbody.querySelectorAll('[data-action="del"]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{ e.preventDefault(); deleteFPRow(Number(btn.dataset.i)); });
    });
    try{ if (typeof window.__applyLockState==='function') window.__applyLockState(); }catch(e){}
  }

  function onInputValidate(e){
    const inp = e.target; const key = inp.dataset.k;
    if (inp.type==='text'){
      const v = String(inp.value||'').trim();
      inp.classList.toggle('invalid', v.length===0);
    } else if (inp.type==='number'){
      const v = inp.value;
      const isNum = v!=='' && !isNaN(Number(v));
      inp.classList.toggle('invalid', !isNum);
      if (isNum && (key==='band_low_pct' || key==='band_high_pct')){
        const n = Number(v);
        inp.classList.toggle('warn', n<70 || n>100);
      } else {
        inp.classList.remove('warn');
      }
    }
  }

  function onCommit(e){
    const inp = e.target; const idx = Number(inp.dataset.i); const key = inp.dataset.k;
    if (!key || Number.isNaN(idx)) return;
    let val = inp.type==='number' ? Number(inp.value) : inp.value;
    setFP(idx, key, val);
  }

  function addFPRow(){
    const rows = window.propertySetup.floorplans || (window.propertySetup.floorplans=[]);
    rows.push({ code:"", name:"", units:0, band_low_pct:93, band_high_pct:96, gap_to_next_tier_dollars:0, reference_ask:0, price_floor_dollars:'', price_ceiling_dollars:'' });
    renderFPTable();
    maybeSaveLocal();
  }

  function deleteFPRow(idx){
    const rows = window.propertySetup.floorplans || [];
    if (idx>=0 && idx<rows.length){ rows.splice(idx,1); renderFPTable(); }
    maybeSaveLocal();
  }

  function setFP(idx, key, value){
    const rows = window.propertySetup.floorplans || [];
    if (!rows[idx]) return;
    if (key==='code') value = normalizeCode(value).slice(0,12);
    if (key==='name') value = String(value||'').slice(0,40);
    if (key==='units' || key==='reference_ask' || key==='gap_to_next_tier_dollars' || key==='price_floor_dollars' || key==='price_ceiling_dollars'){
      if (String(value)===''){ rows[idx][key] = ''; renderFPTable(); return; }
      value = Math.max(0, toInt(value,0));
    }
    if (key==='band_low_pct' || key==='band_high_pct') value = clamp(Math.round(Number(value||0)*2)/2, 70, 100);
    rows[idx][key] = value;
    // Only re-render table (badges/validation). No other side effects.
    renderFPTable();
    maybeSaveLocal();
  }

  // Prefill from mapped rent roll if present
  function normalizeLabel(s){ return String(s||'').replace(/[×✕✖]/g,'x').trim().replace(/\s+/g,' ').toLowerCase(); }
  function firstToken(label){ const raw=String(label||'').replace(/[×✕✖]/g,'x').trim().replace(/\s+/g,' '); return (raw.split(/\s+/)[0]||'').replace(/[^A-Za-z0-9]/g,''); }
  function codeFromLabel(label){ const tok=firstToken(label); const sanitized = tok || String(label||'').replace(/[^A-Za-z0-9]/g,''); return (sanitized||'FP').slice(0,12); }
  function prefillFromRentRoll(){
    const mr = Array.isArray(window.mappedRows) ? window.mappedRows : null;
    if (!mr || !mr.length) return;
    const freq = new Map();
    for(const r of mr){ const lbl=String(r.Floorplan||'').trim(); const key=normalizeLabel(lbl); if (!key) continue; const cur=freq.get(key)||{label:lbl,units:0}; cur.units++; if(!cur.label) cur.label=lbl; freq.set(key,cur); }
    const out=[];
    for(const {label,units} of freq.values()){
      const code = codeFromLabel(label);
      const small = (units<15);
      out.push({ code, name: label, units, band_low_pct: small?92:93, band_high_pct: small?97:96, gap_to_next_tier_dollars:0, reference_ask:0, price_floor_dollars:'', price_ceiling_dollars:'' });
    }
    window.propertySetup.floorplans = out;
    renderFPTable();
    saveFPsLocal();
    try{ if (typeof window.__applyLockState==='function') window.__applyLockState(); }catch(e){}
  }

  function mergeFromRentRoll(){
    const mr = Array.isArray(window.mappedRows) ? window.mappedRows : null;
    if (!mr || !mr.length) return;
    const freq = new Map();
    for(const r of mr){ const lbl=String(r.Floorplan||'').trim(); const key=normalizeLabel(lbl); if (!key) continue; const cur=freq.get(key)||{label:lbl,units:0}; cur.units++; if(!cur.label) cur.label=lbl; freq.set(key,cur); }
    const rows = window.propertySetup.floorplans || (window.propertySetup.floorplans=[]);
    const byCode = new Map(rows.map((r,i)=>[String(r.code||'').toLowerCase(), {i,r}]));
    const byName = new Map(rows.map((r,i)=>[normalizeLabel(r.name||''), {i,r}]));
    const usedCodes = new Set(rows.map(r=>String(r.code||'').toLowerCase()).filter(Boolean));
    const add=[];
    for(const {label,units} of freq.values()){
      const tok = firstToken(label).toLowerCase();
      let t = byCode.get(tok) || byName.get(normalizeLabel(label));
      if (t){ rows[t.i].units = units; }
      else {
        let c = codeFromLabel(label); let base=c.toLowerCase(); let n=1; while(usedCodes.has(base)){ n++; c=(c+n).slice(0,12); base=c.toLowerCase(); }
        usedCodes.add(base);
        const small=(units<15);
        add.push({ code:c, name:label, units, band_low_pct: small?92:93, band_high_pct: small?97:96, gap_to_next_tier_dollars:0, reference_ask:0, price_floor_dollars:'', price_ceiling_dollars:'' });
      }
    }
    if (add.length) rows.push(...add);
    renderFPTable();
    saveFPsLocal();
    try{ if (typeof window.__applyLockState==='function') window.__applyLockState(); }catch(e){}
  }

  function initFPSettings(){
    const add = document.getElementById('addFPBtn'); if (add) add.addEventListener('click', addFPRow);
    const pf = document.getElementById('prefillFromRR');
    if (pf){
      if (Array.isArray(window.mappedRows) && window.mappedRows.length){ pf.style.display='inline'; pf.addEventListener('click', (e)=>{ e.preventDefault(); const rows=(window.propertySetup&&window.propertySetup.floorplans)||[]; if (!rows.length) prefillFromRentRoll(); else mergeFromRentRoll(); if (typeof window.renderFPMapCard==='function') window.renderFPMapCard(); if (typeof window.autoMapFromSettings==='function') window.autoMapFromSettings(); }); }
      else { pf.style.display = 'none'; }
    }
    // Local persistence controls
    const clear = document.getElementById('fpClearLocal');
    if (clear) clear.addEventListener('click', (e)=>{ e.preventDefault(); if (confirm('Clear locally saved data?')){ try{ localStorage.removeItem(LS_KEY);}catch(err){} try{ const ps=window.propertySetup||{}; const pid=ps.property_id||ps.property_name||'default'; localStorage.removeItem(`rm:fpmap:${pid}`); localStorage.removeItem(`rm:fpmap:candidates:${pid}`);}catch(err){} (window.propertySetup.floorplans=[]); renderFPTable(); try{ if (typeof window.renderFPMapCard==='function') window.renderFPMapCard(); }catch(err){} updateSavedChip('Cleared'); }});
    const reset = document.getElementById('fpResetDefaults');
    if (reset) reset.addEventListener('click', (e)=>{ e.preventDefault(); window.propertySetup.floorplans=[{ code:'A1', name:'1x1', units:0, band_low_pct:93, band_high_pct:96, reference_ask:0, price_floor_dollars:'', price_ceiling_dollars:'' }]; renderFPTable(); saveFPsLocal(); });

    // Load any local persisted rows if current state is empty
    loadFPsLocal();
    renderFPTable();
  }

  // Expose functions to global scope
  window.dupMap = dupMap;
  window.bandIssues = bandIssues;
  window.isRowValid = isRowValid;
  window.isTableValid = isTableValid;
  window.updateSavedChip = updateSavedChip;
  window.saveFPsLocal = saveFPsLocal;
  window.maybeSaveLocal = maybeSaveLocal;
  window.loadFPsLocal = loadFPsLocal;
  window.renderFPTable = renderFPTable;
  window.onInputValidate = onInputValidate;
  window.onCommit = onCommit;
  window.addFPRow = addFPRow;
  window.deleteFPRow = deleteFPRow;
  window.setFP = setFP;
  window.normalizeLabel = normalizeLabel;
  window.firstToken = firstToken;
  window.codeFromLabel = codeFromLabel;
  window.prefillFromRentRoll = prefillFromRentRoll;
  window.mergeFromRentRoll = mergeFromRentRoll;
  window.initFPSettings = initFPSettings;

  // Initialize on DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFPSettings);
  else initFPSettings();
})();
