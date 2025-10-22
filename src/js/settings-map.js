(function () {
  // Settings mapping functionality
  window.__RM_LOADED = window.__RM_LOADED || [];
  window.__RM_LOADED.push('settings-map.js');
  function $(id) {
    return document.getElementById(id);
  }

  // Step 59R: Autocapture labels (unified candidates key)
  function uniqueLabels(rows) {
    const s = new Set();
    (rows || []).forEach(r => {
      const v = String(r.Floorplan || '').trim();
      if (v) s.add(v);
    });
    return Array.from(s);
  }
  function fpMapCandidatesKey() {
    const ps = window.propertySetup || {};
    const pid = ps.property_id || ps.property_name || 'default';
    return `rm:fpmap:candidates:${pid}`;
  }
  function loadFPCandidates() {
    try {
      const raw = localStorage.getItem(fpMapCandidatesKey());
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function saveFPCandidates(list) {
    try {
      localStorage.setItem(fpMapCandidatesKey(), JSON.stringify(list || []));
    } catch (e) {}
  }

  // Storage keys (canonical names)
  function fpMapStorageKey() {
    const ps = window.propertySetup || {};
    const pid = ps.property_id || ps.property_name || 'default';
    return `rm:fpmap:${pid}`;
  }
  function loadFPMap() {
    try {
      return JSON.parse(localStorage.getItem(fpMapStorageKey())) || {};
    } catch (e) {
      return {};
    }
  }
  function saveFPMap(map) {
    try {
      localStorage.setItem(fpMapStorageKey(), JSON.stringify(map || {}));
    } catch (e) {}
  }
  function clearFPMap() {
    try {
      localStorage.removeItem(fpMapStorageKey());
    } catch (e) {}
  }
  function clearFPCandidates() {
    try {
      localStorage.removeItem(fpMapCandidatesKey());
    } catch (e) {}
  }
  function getFPNameByCode(code) {
    try {
      const list = (window.propertySetup && window.propertySetup.floorplans) || [];
      const fp = list.find(x => String(x.code || '') === String(code || ''));
      return fp ? fp.name || '' : '';
    } catch (e) {
      return '';
    }
  }
  function getCodes() {
    try {
      return ((window.propertySetup && window.propertySetup.floorplans) || [])
        .map(fp => String(fp.code || '').trim())
        .filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  // Session upload flag
  const SS_FLAG = 'rm:session:hasUpload';
  function setHasUpload() {
    try {
      sessionStorage.setItem(SS_FLAG, '1');
    } catch (e) {}
  }
  function hasUpload() {
    try {
      return sessionStorage.getItem(SS_FLAG) === '1';
    } catch (e) {
      return false;
    }
  }

  // Capture labels from latest upload (mappedRows), suggest defaults, and refresh card
  function captureFPLabelsFromUpload() {
    try {
      const rows = window.mappedRows || [];
      const labels = Array.from(
        new Set(rows.map(r => String(r.Floorplan || '').trim()).filter(Boolean))
      ).sort();
      saveFPCandidates(labels);
      autoMapFromSettings();
      if (typeof renderFPMapCard === 'function') renderFPMapCard();
    } catch (e) {}
  }

  // Auto-map based on Settings codes (exact or first-token)
  function autoMapFromSettings() {
    try {
      const labels = loadFPCandidates();
      if (!labels || !labels.length) return;
      const codes = getCodes();
      if (!codes.length) return;
      const codeLC = codes.map(c => String(c).toLowerCase());
      const map = loadFPMap();
      let changed = false;
      const firstTok = s =>
        (
          String(s || '')
            .replace(/[×✕✖]/g, 'x')
            .trim()
            .split(/\s+/)[0] || ''
        ).toLowerCase();
      labels.forEach(lbl => {
        if (map[lbl]) return;
        const n = String(lbl || '')
          .trim()
          .toLowerCase();
        const t = firstTok(lbl);
        const idxExact = codeLC.indexOf(n);
        const idxTok = codeLC.indexOf(t);
        if (idxExact >= 0) {
          map[lbl] = codes[idxExact];
          changed = true;
        } else if (idxTok >= 0) {
          map[lbl] = codes[idxTok];
          changed = true;
        }
      });
      if (changed) {
        saveFPMap(map);
        const chip = document.getElementById('fpMapSavedChip');
        if (chip) chip.textContent = 'Saved locally ' + new Date().toLocaleTimeString();
        if (typeof renderFPMapCard === 'function') renderFPMapCard();
      }
    } catch (e) {}
  }

  // Render mapping card using candidates; hide if no upload this session
  function renderFPMapCard() {
    const tbody = $('fpMapTableBody');
    const empty = $('fpMapEmptyAlt');
    if (!tbody || !empty) return;
    const labels = loadFPCandidates();
    const map = loadFPMap();
    const codes = getCodes();
    tbody.innerHTML = '';
    if (!hasUpload() || !labels.length) {
      empty.textContent = 'No rent roll uploaded yet.';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    labels.forEach(lbl => {
      const tr = document.createElement('tr');
      const tdL = document.createElement('td');
      tdL.textContent = lbl;
      tr.appendChild(tdL);
      const tdS = document.createElement('td');
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', `Map ${lbl} to code`);
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = '(Select code)';
      sel.appendChild(opt0);
      codes.forEach(c => {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        sel.appendChild(o);
      });
      sel.value = map[lbl] || '';
      sel.addEventListener('change', () => {
        const m = loadFPMap();
        if (sel.value) m[lbl] = sel.value;
        else delete m[lbl];
        saveFPMap(m);
        renderFPMapCard();
        const chip = $('fpMapSavedChip');
        if (chip) chip.textContent = 'Saved locally ' + new Date().toLocaleTimeString();
      });
      tdS.appendChild(sel);
      tr.appendChild(tdS);
      const tdP = document.createElement('td');
      const code = map[lbl] || '';
      const name = code ? getFPNameByCode(code) : '';
      tdP.textContent = code ? (name ? `${code} — ${name}` : code) : '—';
      tr.appendChild(tdP);
      tbody.appendChild(tr);
    });
    try {
      if (typeof window.__applyLockState === 'function') window.__applyLockState();
    } catch (e) {}
  }

  function bindFPMapButtons() {
    const save = $('fpMapSaveBtn');
    const clr = $('fpMapClearBtn');
    const clrLegacy = $('fpMapClear');
    if (save)
      save.addEventListener('click', () => {
        const chip = $('fpMapSavedChip');
        if (chip) chip.textContent = 'Saved locally ' + new Date().toLocaleTimeString();
      });
    const doClear = () => {
      if (!confirm('Clear all label→code mappings for this property?')) return;
      clearFPMap();
      clearFPCandidates();
      renderFPMapCard();
      const chip = $('fpMapSavedChip');
      if (chip) chip.textContent = 'Cleared';
    };
    if (clr) clr.addEventListener('click', doClear);
    if (clrLegacy) clrLegacy.addEventListener('click', doClear);
  }

  // Step 56: Floorplan CODE mapping + normalization and New Pricing override
  const MAP_NS = 'rm:fpmap:';
  function getFPMapKey() {
    const ps = window.propertySetup || {};
    return MAP_NS + (ps.property_id || ps.property_name || 'default');
  }
  function getAllCodes() {
    try {
      return (window.propertySetup.floorplans || []).map(f => String(f.code || '')).filter(Boolean);
    } catch (e) {
      return [];
    }
  }
  function loadFPMapLegacy() {
    try {
      const raw = localStorage.getItem(getFPMapKey());
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveFPMapLegacy(map) {
    try {
      localStorage.setItem(getFPMapKey(), JSON.stringify(map || {}));
    } catch (e) {}
  }
  function clearFPMapLegacy() {
    try {
      localStorage.removeItem(getFPMapKey());
    } catch (e) {}
  }
  function applyFPMapToRows(rows, map, codes) {
    const out = [];
    const unm = new Set();
    const set = new Set(codes || []);
    (rows || []).forEach(r => {
      const lbl = String(r.Floorplan || '').trim();
      let code = map && map[lbl];
      if (!code && set.has(lbl)) code = lbl;
      if (code) out.push(Object.assign({}, r, { FP_CODE: code, FloorplanLabel: lbl }));
      else {
        unm.add(lbl);
        out.push(Object.assign({}, r, { FloorplanLabel: lbl }));
      }
    });
    return { rows: out, unmapped: unm };
  }

  function normalizeRentRoll() {
    const rows = Array.isArray(window.mappedRows) ? window.mappedRows : [];
    const map = loadFPMapLegacy();
    const codes = getAllCodes();
    const res = applyFPMapToRows(rows, map, codes);
    window.normRows = res.rows;
    window.unmappedLabels = Array.from(res.unmapped || []);
    try {
      // Step 67: Auto-refresh charts from rent roll if mapping is valid
      if (Array.isArray(window.normRows) && window.normRows.length) {
        if (typeof window.refreshChartsFromRentRoll === 'function')
          window.refreshChartsFromRentRoll();
        const unm = window.unmappedLabels || [];
        if (typeof window.hasUpload === 'function' && window.hasUpload() && unm.length === 0) {
          if (typeof setTabDisabled === 'function') setTabDisabled('charts', false);
        }
      }
    } catch (e) {}
  }

  // Capture labels from upload
  function capture() {
    try {
      const rows = Array.isArray(window.mappedRows) ? window.mappedRows : [];
      const labels = uniqueLabels(rows);
      if (labels.length) {
        saveFPCandidates(labels);
        if (typeof renderFPMapCard === 'function') renderFPMapCard();
      }
    } catch (e) {}
  }

  // Expose functions to global scope
  window.uniqueLabels = uniqueLabels;
  window.fpMapCandidatesKey = fpMapCandidatesKey;
  window.loadFPCandidates = loadFPCandidates;
  window.saveFPCandidates = saveFPCandidates;
  window.fpMapStorageKey = fpMapStorageKey;
  window.loadFPMap = loadFPMap;
  window.saveFPMap = saveFPMap;
  window.clearFPMap = clearFPMap;
  window.clearFPCandidates = clearFPCandidates;
  window.getFPNameByCode = getFPNameByCode;
  window.getCodes = getCodes;
  window.setHasUpload = setHasUpload;
  window.hasUpload = hasUpload;
  window.captureFPLabelsFromUpload = captureFPLabelsFromUpload;
  window.autoMapFromSettings = autoMapFromSettings;
  window.renderFPMapCard = renderFPMapCard;
  window.bindFPMapButtons = bindFPMapButtons;
  window.getFPMapKey = getFPMapKey;
  window.getAllCodes = getAllCodes;
  window.loadFPMapLegacy = loadFPMapLegacy;
  window.saveFPMapLegacy = saveFPMapLegacy;
  window.clearFPMapLegacy = clearFPMapLegacy;
  window.applyFPMapToRows = applyFPMapToRows;
  window.normalizeRentRoll = normalizeRentRoll;
  window.capture = capture;

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    try {
      renderFPMapCard();
      bindFPMapButtons();
      normalizeRentRoll();
    } catch (e) {}
  });

  // Wire confirm mapping button
  const cm = document.getElementById('confirmMapping');
  if (cm) {
    cm.addEventListener('click', () => {
      setTimeout(() => {
        try {
          if (typeof setHasUpload === 'function') setHasUpload();
          captureFPLabelsFromUpload();
          normalizeRentRoll();
          if (typeof window.refreshChartsFromRentRoll === 'function')
            window.refreshChartsFromRentRoll();
        } catch (e) {}
      }, 60);
    });
  }

  // Auto-capture on data changes
  let lastSig = '';
  const iv = setInterval(() => {
    const rows = Array.isArray(window.mappedRows) ? window.mappedRows : null;
    if (!rows || rows.length === 0) return;
    const sig = rows.length + ':' + Object.keys(rows[0] || {}).join(',');
    if (sig === lastSig) return;
    lastSig = sig;
    capture();
  }, 400);

  // Guard New run if unmapped
  if (typeof window.canRun === 'function') {
    const _old = window.canRun;
    window.canRun = function () {
      const ok = _old();
      if (!ok) return false;
      try {
        normalizeRentRoll();
      } catch (e) {}
      const unm = window.unmappedLabels || [];
      if (unm.length) {
        const nl = $('nlTables');
        if (nl) {
          nl.innerHTML = `<div class=\"note\" style=\"border:1px solid #7f1d1d;background:#1b0f12;color:#fca5a5;padding:8px;border-radius:8px;\">Unmapped floorplan labels: ${unm.slice(0, 12).join(', ')}. <a href=\"#\" id=\"goMap\">Map them on Settings → Floorplan Map</a>.</div>`;
          setTimeout(() => {
            const a = $('goMap');
            if (a)
              a.onclick = e => {
                e.preventDefault();
                if (typeof setTab === 'function') setTab('settings');
                const card = $('fpMapCard');
                if (card) card.scrollIntoView({ behavior: 'smooth' });
              };
          }, 0);
        }
        return false;
      }
      return true;
    };
  }

  // Normalize New Pricing to use FP_CODE grouping while preserving UI
  if (typeof window.renderNewLease === 'function') {
    const _origRender = window.renderNewLease;
    window.renderNewLease = function (cfg, norm, tState) {
      const rows =
        Array.isArray(window.normRows) && window.normRows.some(r => r.FP_CODE)
          ? window.normRows.map(r => Object.assign({}, r, { Floorplan: r.FP_CODE }))
          : norm || [];
      _origRender(cfg, rows, tState);
      // Add normalization footnote
      const wrap = $('nlTables');
      if (wrap) {
        wrap.insertAdjacentHTML(
          'afterbegin',
          '<div class="note">Floorplans normalized to codes; CSV labels shown for reference only.</div>'
        );
      }
    };
  }
})();
