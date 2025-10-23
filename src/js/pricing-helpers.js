(function () {
  // Pure helper functions for pricing calculations and utilities

  function __np_escape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  window.__np_escape = __np_escape;

  function loadShowUnits() {
    try {
      return localStorage.getItem('np_showUnits_v1') === '1';
    } catch (e) {
      return false;
    }
  }
  window.loadShowUnits = loadShowUnits;

  function saveShowUnits(on) {
    try {
      localStorage.setItem('np_showUnits_v1', on ? '1' : '0');
    } catch (e) {}
  }
  window.saveShowUnits = saveShowUnits;

  function __np_debounce(fn, wait) {
    let t;
    return function () {
      const ctx = this,
        args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), wait);
    };
  }
  window.__np_debounce = __np_debounce;

  // Parse signed currency/number for amenity adjustments
  function __toNumberSigned(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    let s = String(v).trim();
    if (!s) return 0;
    const neg = /^\(.*\)$/.test(s);
    s = s.replace(/^\(|\)$/g, '');
    s = s.replace(/[$,]/g, '').replace(/^\+/, '');
    let n = parseFloat(s);
    if (!isFinite(n)) return 0;
    if (/^-/.test(String(v)) || neg) n = -Math.abs(Math.abs(n));
    return n;
  }
  window.__toNumberSigned = __toNumberSigned;

  function unitStatus(u) {
    const s = (u.status || '').toLowerCase();
    if (s.includes('notice')) return 'On Notice';
    if (s.includes('ready') || s.includes('vac')) return 'Vacant';
    // Not available to rent
    if (/(occ|leased|rent|renew|transfer|down|model|skip|hold|rescind|evict)/.test(s))
      return 'Other';
    return 'Other';
  }
  window.unitStatus = unitStatus;

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
  window.inferBedroomsFromCode = inferBedroomsFromCode;

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
  window.vacancyAgeDays = vacancyAgeDays;

  // Vacancy special percentage based on days vacant
  function vacancySpecialPct(vacantDays) {
    const days = Number(vacantDays) || 0;
    if (days >= 90) return 15; // 15% off for 90+ days
    if (days >= 60) return 10;  // 10% off for 60+ days
    if (days >= 30) return 5;   // 5% off for 30+ days
    return 0;                   // No special for <30 days
  }
  window.vacancySpecialPct = vacancySpecialPct;

  // Vacancy age pricing discount based on settings
  function vacancyAgeDiscount(vacantDays) {
    try {
      const settings = JSON.parse(localStorage.getItem('vacancyAgeSettings') || '{}');
      if (!settings.enabled) return 0;
      
      const days = Number(vacantDays) || 0;
      if (days < 30) return 0; // No discount before 30 days
      
      const configs = {
        minimal: { dailyRate: 0.1, maxDiscount: 5 },
        medium: { dailyRate: 0.2, maxDiscount: 10 },
        aggressive: { dailyRate: 0.3, maxDiscount: 15 }
      };
      
      const config = configs[settings.intensity] || configs.medium;
      const discount = Math.min(config.dailyRate * (days - 30), config.maxDiscount);
      return Math.max(0, discount);
    } catch (e) {
      return 0; // Fallback to no discount on error
    }
  }
  window.vacancyAgeDiscount = vacancyAgeDiscount;

  function onNoticeAvailDate(u) {
    if (unitStatus(u) !== 'On Notice') return null;
    return u.available_date ? new Date(u.available_date) : null;
  }
  window.onNoticeAvailDate = onNoticeAvailDate;

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
  window.sortUnitsForFp = sortUnitsForFp;

  function computeFpSortKey(fp) {
    const br = inferBedroomsFromCode(fp.code, fp.name);
    return [br, String(fp.code || '').toUpperCase()];
  }
  window.computeFpSortKey = computeFpSortKey;

  function formatMoney(n) {
    return isFinite(n) ? '$' + Math.round(n) : '—';
  }
  window.formatMoney = formatMoney;

  function formatPct(n) {
    return isFinite(n) ? (n >= 0 ? '+' : '') + Math.round(n * 10) / 10 + '%' : '—';
  }
  window.formatPct = formatPct;

  // Short-term premium calculation (2-9 mo lease terms)
  // Returns adjusted base with premium applied for short terms
  function shortTermAdj(base, term) {
    if (term >= 10) return base;
    const start = 0.08,
      taper = 0.01;
    const extra = Math.max(0, start - (term - 2) * taper);
    return base * (1 + extra);
  }
  window.shortTermAdj = shortTermAdj;

  // Get seasonality multiplier for a given month (0-11)
  function getSeasonalityMultiplier(monthIndex) {
    const a = window.__seasonalityArray__ || [];
    const v = Number(a[monthIndex]);
    const m = Number.isFinite(v) ? v : 1;
    return Math.min(1.2, Math.max(0.8, m));
  }
  window.getSeasonalityMultiplier = getSeasonalityMultiplier;
})();
