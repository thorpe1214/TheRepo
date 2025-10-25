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
    if (days >= 60) return 10; // 10% off for 60+ days
    if (days >= 30) return 5; // 5% off for 30+ days
    return 0; // No special for <30 days
  }
  window.vacancySpecialPct = vacancySpecialPct;

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
        aggressive: { dailyRate: 0.3, maxDiscount: 15 },
      };

      const config = configs[settings.intensity] || configs.medium;
      const discount = Math.min(config.dailyRate * (days - 30), config.maxDiscount);
      return Math.max(0, discount);
    } catch (e) {
      return 0; // Fallback to no discount on error
    }
  }
  window.vacancyAgeDiscount = vacancyAgeDiscount;

  // ============================================================================
  // STRICT MAPPING PROFILE MANAGEMENT
  // ============================================================================

  /**
   * Load rent roll profile from localStorage
   * @returns {Object|null} Profile object or null if not found
   */
  function loadRentRollProfile() {
    try {
      const profile = localStorage.getItem('rentrollProfile');
      return profile ? JSON.parse(profile) : null;
    } catch (e) {
      console.warn('[RM] Failed to load rent roll profile:', e);
      return null;
    }
  }
  window.loadRentRollProfile = loadRentRollProfile;

  /**
   * Save rent roll profile to localStorage
   * @param {Object} profile - Profile object to save
   * @returns {boolean} Success status
   */
  function saveRentRollProfile(profile) {
    try {
      if (!profile || typeof profile !== 'object') {
        throw new Error('Invalid profile object');
      }

      // Validate required fields
      if (!profile.headers || !Array.isArray(profile.headers)) {
        throw new Error('Profile must have headers array');
      }
      if (!profile.mapping || typeof profile.mapping !== 'object') {
        throw new Error('Profile must have mapping object');
      }

      localStorage.setItem('rentrollProfile', JSON.stringify(profile));
      console.log('[RM] Saved rent roll profile:', profile);
      return true;
    } catch (e) {
      console.error('[RM] Failed to save rent roll profile:', e);
      return false;
    }
  }
  window.saveRentRollProfile = saveRentRollProfile;

  /**
   * Capture current mapping as a profile
   * @param {Object} csvData - Parsed CSV data
   * @param {Object} mapping - Current column mapping
   * @param {Object} options - Capture options
   * @returns {Object} Generated profile
   */
  function captureRentRollProfile(csvData, mapping, options = {}) {
    const {
      propertyId = 'default',
      createdBy = 'user',
      description = 'Auto-captured profile',
      tags = [],
    } = options;

    // Normalize headers for consistent comparison
    const normalizedHeaders =
      window.RMValidation?.normalizeHeaders(csvData.headers) || csvData.headers;

    // Extract floorplan catalog if available
    const floorplanCatalog =
      csvData.rows
        ?.map(row => {
          const fp = row.Floorplan || row.floorplan;
          return fp ? String(fp).trim() : null;
        })
        .filter(Boolean) || [];

    const uniqueFloorplans = [...new Set(floorplanCatalog)];

    const profile = {
      version: '1.0',
      headers: normalizedHeaders,
      mapping: { ...mapping },
      floorplanCatalog: uniqueFloorplans,
      createdAt: new Date().toISOString(),
      createdBy,
      propertyId,
      metadata: {
        description,
        tags,
        sampleRowCount: csvData.rows?.length || 0,
      },
    };

    return profile;
  }
  window.captureRentRollProfile = captureRentRollProfile;

  /**
   * Download profile as JSON file
   * @param {Object} profile - Profile to download
   * @param {string} filename - Optional filename
   */
  function downloadRentRollProfile(profile, filename = 'rentroll_profile.json') {
    try {
      const jsonStr = JSON.stringify(profile, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Use window.downloadFile if available (defined in Step HTML), otherwise fallback
      if (window.downloadFile) {
        window.downloadFile(url, filename);
      } else {
        console.warn('[RM] downloadFile not available, cannot download profile');
      }

      console.log('[RM] Downloaded rent roll profile:', filename);
    } catch (e) {
      console.error('[RM] Failed to download profile:', e);
    }
  }
  window.downloadRentRollProfile = downloadRentRollProfile;

  /**
   * Check if strict mapping mode is enabled
   * @returns {boolean} Strict mode status
   */
  function isStrictMappingEnabled() {
    try {
      // Check CI flag first
      if (typeof process !== 'undefined' && process.env?.STRICT_MAPPING === '1') {
        return true;
      }
      
      // Check localStorage setting, default to true for property-based approach
      const setting = localStorage.getItem('strictMappingEnabled');
      return setting === '1' || setting === 'true' || setting === null; // null = default true
    } catch (e) {
      return true; // Default to true on error
    }
  }
  window.isStrictMappingEnabled = isStrictMappingEnabled;

  /**
   * Set strict mapping mode
   * @param {boolean} enabled - Enable strict mode
   */
  function setStrictMappingEnabled(enabled) {
    try {
      localStorage.setItem('strictMappingEnabled', enabled ? '1' : '0');
      console.log('[RM] Strict mapping mode:', enabled ? 'enabled' : 'disabled');
    } catch (e) {
      console.error('[RM] Failed to set strict mapping mode:', e);
    }
  }
  window.setStrictMappingEnabled = setStrictMappingEnabled;

  /**
   * Check if floorplan catalog lock is enabled
   * @returns {boolean} Catalog lock status
   */
  function isCatalogLockEnabled() {
    try {
      const setting = localStorage.getItem('catalogLockEnabled');
      return setting === '1' || setting === 'true' || setting === null; // null = default true
    } catch (e) {
      return true; // Default to true on error
    }
  }
  window.isCatalogLockEnabled = isCatalogLockEnabled;

  /**
   * Set floorplan catalog lock
   * @param {boolean} enabled - Enable catalog lock
   */
  function setCatalogLockEnabled(enabled) {
    try {
      localStorage.setItem('catalogLockEnabled', enabled ? '1' : '0');
      console.log('[RM] Catalog lock:', enabled ? 'enabled' : 'disabled');
    } catch (e) {
      console.error('[RM] Failed to set catalog lock:', e);
    }
  }
  window.setCatalogLockEnabled = setCatalogLockEnabled;

  // ============================================================================
  // PROPERTY PROFILE MANAGEMENT
  // ============================================================================

  /**
   * Load property profile from localStorage
   * @returns {Object|null} Property profile or null if not found
   */
  function loadPropertyProfile() {
    try {
      const profile = localStorage.getItem('propertyProfile');
      return profile ? JSON.parse(profile) : null;
    } catch (e) {
      console.warn('[RM] Failed to load property profile:', e);
      return null;
    }
  }
  window.loadPropertyProfile = loadPropertyProfile;

  /**
   * Save property profile to localStorage
   * @param {Object} profile - Property profile to save
   * @returns {boolean} Success status
   */
  function savePropertyProfile(profile) {
    try {
      if (!profile || typeof profile !== 'object') {
        throw new Error('Invalid property profile object');
      }
      
      // Validate required fields
      if (!profile.floorplanCatalog || !Array.isArray(profile.floorplanCatalog)) {
        throw new Error('Property profile must have floorplanCatalog array');
      }
      
      localStorage.setItem('propertyProfile', JSON.stringify(profile));
      console.log('[RM] Saved property profile:', profile);
      return true;
    } catch (e) {
      console.error('[RM] Failed to save property profile:', e);
      return false;
    }
  }
  window.savePropertyProfile = savePropertyProfile;

  /**
   * Capture property profile from current mapping
   * @param {Object} csvData - Parsed CSV data
   * @param {Object} mapping - Current column mapping
   * @param {Object} options - Capture options
   * @returns {Object} Generated property profile
   */
  function capturePropertyProfile(csvData, mapping, options = {}) {
    const {
      propertyId = 'default-property',
      propertyName = 'Property',
      createdBy = 'admin',
      description = 'Property floorplan catalog'
    } = options;

    // Extract floorplan catalog from CSV
    const floorplanCatalog = csvData.rows?.map(row => {
      const fp = row.Floorplan || row.floorplan;
      return fp ? String(fp).trim() : null;
    }).filter(Boolean) || [];
    
    const uniqueFloorplans = [...new Set(floorplanCatalog)];

    // Extract floorplan details (name, bedrooms, units)
    const floorplanDetails = {};
    uniqueFloorplans.forEach(fpCode => {
      const fpRows = csvData.rows?.filter(row => 
        (row.Floorplan || row.floorplan) === fpCode
      ) || [];
      
      floorplanDetails[fpCode] = {
        name: fpCode, // Default to code, can be enhanced later
        bedrooms: inferBedroomsFromCode(fpCode, fpCode),
        units: fpRows.length,
        sampleRent: fpRows.length > 0 ? 
          parseFloat(fpRows[0]['Current Rent'] || fpRows[0]['current rent'] || 0) : 0
      };
    });

    const profile = {
      version: '1.0',
      propertyId,
      propertyName,
      floorplanCatalog: uniqueFloorplans,
      floorplanDetails,
      createdAt: new Date().toISOString(),
      createdBy,
      description,
      locked: true, // Property profiles are locked by default
      metadata: {
        sampleRowCount: csvData.rows?.length || 0,
        totalUnits: Object.values(floorplanDetails).reduce((sum, fp) => sum + fp.units, 0)
      }
    };

    return profile;
  }
  window.capturePropertyProfile = capturePropertyProfile;

  /**
   * Check if property profile exists and is locked
   * @returns {boolean} Property lock status
   */
  function isPropertyLocked() {
    try {
      const profile = loadPropertyProfile();
      return profile && profile.locked === true;
    } catch (e) {
      return false;
    }
  }
  window.isPropertyLocked = isPropertyLocked;

  /**
   * Temporarily unlock property floorplans (admin override)
   * @param {boolean} unlocked - Unlock status
   */
  function setPropertyUnlocked(unlocked) {
    try {
      const profile = loadPropertyProfile();
      if (profile) {
        profile.locked = !unlocked;
        profile.unlockedAt = unlocked ? new Date().toISOString() : null;
        profile.unlockedBy = unlocked ? 'operator' : null;
        savePropertyProfile(profile);
        console.log('[RM] Property floorplans:', unlocked ? 'unlocked' : 'locked');
      }
    } catch (e) {
      console.error('[RM] Failed to set property unlock status:', e);
    }
  }
  window.setPropertyUnlocked = setPropertyUnlocked;

  /**
   * Resolve mapping from seeds or saved profile
   * @param {Object} csvData - Parsed CSV data
   * @param {Object} mapping - Current column mapping
   * @returns {Object} Resolution result with mapping and source
   */
  function resolveMappingFromSeedsOrProfile(csvData, mapping) {
    try {
      const propertyId = window.__seedPropertySetup?.property_id || 'thorpe-gardens';
      const fpMapKey = `rm:fpmap:${propertyId}`;
      const savedFPMap = JSON.parse(localStorage.getItem(fpMapKey) || '{}');
      const seedFPMap = window.__seedFPMap || {};
      
      // Use saved map if available, otherwise use seeds
      const activeFPMap = Object.keys(savedFPMap).length > 0 ? savedFPMap : seedFPMap;
      const source = Object.keys(savedFPMap).length > 0 ? 'profile' : 'seeds';
      
      // Check if all floorplan labels are mapped
      const floorplanCol = mapping.Floorplan || mapping.floorplan;
      if (floorplanCol && csvData.rows && csvData.rows.length > 0) {
        const uniqueFloorplanLabels = Array.from(new Set(
          csvData.rows.map(row => row[floorplanCol]).filter(Boolean)
        ));
        
        const allMapped = uniqueFloorplanLabels.every(label => activeFPMap[label]);
        
        return {
          mapping: mapping,
          source: source,
          allMapped: allMapped,
          unmappedLabels: uniqueFloorplanLabels.filter(label => !activeFPMap[label]),
          floorplanLabels: uniqueFloorplanLabels
        };
      }
      
      return {
        mapping: mapping,
        source: 'auto',
        allMapped: true,
        unmappedLabels: [],
        floorplanLabels: []
      };
    } catch (e) {
      console.error('[RM] Failed to resolve mapping:', e);
      return {
        mapping: mapping,
        source: 'auto',
        allMapped: false,
        unmappedLabels: [],
        floorplanLabels: []
      };
    }
  }
  
  window.resolveMappingFromSeedsOrProfile = resolveMappingFromSeedsOrProfile;
})();
