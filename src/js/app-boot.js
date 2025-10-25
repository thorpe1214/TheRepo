(function () {
  // App boot wiring - DOMContentLoaded initialization and UI wiring

  // ============================================================================
  // SEED BOOTSTRAP - Load seeds when localStorage is empty
  // ============================================================================

  function loadSeedsIfEmpty() {
    try {
      // Check if property setup exists
      const existingPropertySetup = localStorage.getItem('rm:propertySetup:floorplans');
      if (!existingPropertySetup && window.__seedPropertySetup) {
        console.log('[RM Seeds] Loading property setup from seeds');

        // Write property setup to localStorage
        const propertySetup = {
          property_id: window.__seedPropertySetup.property_id,
          property_name: window.__seedPropertySetup.property_name,
          floorplans: window.__seedPropertySetup.floorplans,
          metadata: window.__seedPropertySetup.metadata,
        };
        localStorage.setItem('rm:propertySetup:floorplans', JSON.stringify(propertySetup));

        // Write property profile for validation
        const propertyProfile = {
          version: '1.0',
          propertyId: window.__seedPropertySetup.property_id,
          propertyName: window.__seedPropertySetup.property_name,
          floorplanCatalog: window.__seedPropertySetup.floorplans.map(fp => fp.code),
          floorplanDetails: {},
          createdAt: new Date().toISOString(),
          createdBy: 'seeds',
          description: 'Seeded Thorpe Gardens property profile',
          locked: true,
          metadata: window.__seedPropertySetup.metadata,
        };

        // Build floorplan details
        window.__seedPropertySetup.floorplans.forEach(fp => {
          propertyProfile.floorplanDetails[fp.code] = {
            name: fp.name,
            bedrooms: fp.bedrooms,
            units: fp.units,
            sampleRent: 0, // Will be populated from actual data
          };
        });

        localStorage.setItem('propertyProfile', JSON.stringify(propertyProfile));
      }

      // Check if FP map exists for this property
      const propertyId = window.__seedPropertySetup?.property_id || 'thorpe-gardens';
      const fpMapKey = `rm:fpmap:${propertyId}`;
      const existingFPMap = localStorage.getItem(fpMapKey);

      if (!existingFPMap && window.__seedFPMap) {
        console.log('[RM Seeds] Loading FP map from seeds');
        localStorage.setItem(fpMapKey, JSON.stringify(window.__seedFPMap));
      }

      return {
        propertySetupLoaded: !existingPropertySetup,
        fpMapLoaded: !existingFPMap,
      };
    } catch (e) {
      console.error('[RM Seeds] Failed to load seeds:', e);
      return { propertySetupLoaded: false, fpMapLoaded: false };
    }
  }

  // Expose to global scope
  window.loadSeedsIfEmpty = loadSeedsIfEmpty;

  /**
   * Open confirm overlay with mapping details
   * @param {Object} options - Overlay options
   * @param {Object} options.mapping - Column mapping
   * @param {string} options.source - Mapping source ('seeds', 'profile', 'auto')
   * @param {Function} options.onConfirm - Callback when confirmed
   */
  function openConfirmOverlay(options) {
    try {
      const { mapping, source, onConfirm } = options;

      // Check if strict mode should skip overlay
      const strictOn = window.isStrictMappingEnabled && window.isStrictMappingEnabled();
      const skipOverlay =
        strictOn && localStorage.getItem('skipConfirmOverlayWhenStrict') === 'true';

      if (skipOverlay) {
        console.log('[RM] Skipping confirm overlay in strict mode');
        if (onConfirm) onConfirm();
        return;
      }

      const overlay = document.getElementById('confirmOverlay');
      const detectedColumns = document.getElementById('detectedColumns');
      const mappingStatus = document.getElementById('mappingStatus');

      if (!overlay || !detectedColumns || !mappingStatus) {
        console.warn('[RM] Confirm overlay elements not found');
        if (onConfirm) onConfirm();
        return;
      }

      // Build detected columns from mapping
      const detectedCols = Object.entries(mapping)
        .filter(([key, value]) => value && value.trim())
        .map(([key, value]) => key);

      // Build floorplan summary
      const csvData = { rows: window.rawRows || [] };
      const floorplanCol = mapping.Floorplan || mapping.floorplan;
      let floorplanSummary = '';
      if (floorplanCol && csvData.rows.length > 0) {
        const uniqueFloorplans = Array.from(
          new Set(csvData.rows.map(row => row[floorplanCol]).filter(Boolean))
        );
        floorplanSummary = `${uniqueFloorplans.length} floorplans: ${uniqueFloorplans.join(', ')}`;
      }

      // Update overlay content
      detectedColumns.innerHTML = `
        <strong>Detected Columns:</strong><br>
        ${detectedCols.map(col => `• ${col}`).join('<br>')}
        ${floorplanSummary ? `<br><br><strong>Floorplans:</strong> ${floorplanSummary}` : ''}
      `;

      const sourceText =
        source === 'seeds'
          ? 'from seeds'
          : source === 'profile'
            ? 'from saved mapping'
            : 'auto-detected';

      mappingStatus.innerHTML = `
        <strong>Mapping Status:</strong> ${sourceText}<br>
        <small>All required columns have been mapped successfully</small>
      `;

      // Wire confirm button
      const confirmBtn = document.getElementById('confirmUpload');
      if (confirmBtn) {
        confirmBtn.onclick = () => {
          overlay.style.display = 'none';
          if (onConfirm) onConfirm();
        };
      }

      // Wire edit button
      const editBtn = document.getElementById('editMapping');
      if (editBtn) {
        editBtn.onclick = () => {
          overlay.style.display = 'none';
          document.getElementById('automap').style.display = 'block';
        };
      }

      // Show overlay
      overlay.style.display = 'flex';

      // Focus management and accessibility
      const firstButton = confirmBtn || editBtn;
      if (firstButton) {
        firstButton.focus();
      }

      // Store previous focus for restoration
      overlay._previousFocus = document.activeElement;
    } catch (e) {
      console.error('[RM] Failed to open confirm overlay:', e);
      if (options.onConfirm) options.onConfirm();
    }
  }

  window.openConfirmOverlay = openConfirmOverlay;

  function initAppBoot() {
    // Load seeds if localStorage is empty
    const seedResult = loadSeedsIfEmpty();
    if (seedResult.propertySetupLoaded || seedResult.fpMapLoaded) {
      console.log('[RM Seeds] Seeds loaded successfully');
    }

    // Compute tab mapping
    function cardFromHeading(h2) {
      // walk up to the enclosing .card
      let el = h2;
      while (el && !el.classList.contains('card')) el = el.parentElement;
      return el;
    }
    function computeCards() {
      const map = { home: [], settings: [], newPricing: [], renewals: [], charts: [], history: [] };
      document.querySelectorAll('h2[data-tab-scope]').forEach(h2 => {
        const scopes = (h2.getAttribute('data-tab-scope') || '').split(/\s+/).filter(Boolean);
        const card = cardFromHeading(h2);
        if (!card) return;
        scopes.forEach(sc => {
          if (map[sc]) map[sc].push(card);
        });
      });
      return map;
    }
    const tabMap = computeCards();

    // Main tab bar wiring
    function setTab(tab) {
      // buttons
      document
        .querySelectorAll('#tabBar [data-tab]')
        .forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
      // hide all cards first
      document.querySelectorAll('.card').forEach(c => c.classList.add('tab-hidden'));
      // show those mapped to tab
      const list = tabMap[tab] || [];
      list.forEach(c => c.classList.remove('tab-hidden'));
      window._activeTab = tab;
      // If History tab, trigger a gentle refresh on history UI (chart + list) if present
      if (tab === 'history') {
        try {
          const sel = document.getElementById('fpHistorySelect');
          if (sel) {
            // ensure at least one option is selected, then fire change
            if (!sel.value && sel.options && sel.options.length) {
              sel.value = sel.options[0].value;
            }
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (window.renderHistoryList) window.renderHistoryList();
        } catch (e) {}
      }
    }

    // Wire tab clicks
    document.querySelectorAll('#tabBar [data-tab]').forEach(btn => {
      btn.addEventListener('click', () => setTab(btn.getAttribute('data-tab')));
    });
    // Default tab
    setTab('settings');
    // Expose for console
    window.setTab = setTab;

    // Tab disabled state management
    function setTabDisabled(tab, disabled) {
      const b = document.querySelector('#tabBar [data-tab="' + tab + '"]');
      if (!b) return;
      b.classList.toggle('disabled', !!disabled);
    }
    function enableNew() {
      setTabDisabled('newPricing', false);
    }
    function enableRenew() {
      setTabDisabled('renewals', false);
    }

    function wireLocks() {
      // Disable on load
      setTabDisabled('newPricing', true);
      setTabDisabled('renewals', true);
      // Intercept clicks on disabled tabs (allow hover for tooltip)
      const bar = document.getElementById('tabBar');
      if (bar) {
        bar.addEventListener(
          'click',
          function (e) {
            const t = e.target.closest('[data-tab]');
            if (t && t.classList.contains('disabled')) {
              e.preventDefault();
              e.stopPropagation();
              t.classList.add('wiggle');
              setTimeout(() => t.classList.remove('wiggle'), 200);
            }
          },
          true
        );
      }
      // If user clicks underlying (hidden) buttons anywhere, unlock
      const rn = document.getElementById('runNew');
      const rr = document.getElementById('runRenew');
      if (rn) rn.addEventListener('click', enableNew);
      if (rr) rr.addEventListener('click', enableRenew);
      // Also unlock when Home buttons are used
      const hrn = document.getElementById('homeRunNew');
      const hrr = document.getElementById('homeRunRenew');
      if (hrn) hrn.addEventListener('click', enableNew);
      if (hrr) hrr.addEventListener('click', enableRenew);
    }
    wireLocks();

    // Home button wiring
    function gotoTab(name) {
      const btn = document.querySelector('#tabBar [data-tab="' + name + '"]');
      if (btn) btn.click();
    }
    function clickIf(id) {
      const el = document.getElementById(id);
      if (el) el.click();
    }

    function wire() {
      // Set active tab on body
      document.addEventListener('click', function (e) {
        const t = e.target.closest('#tabBar [data-tab]');
        if (t) document.body.dataset.activeTab = t.getAttribute('data-tab');
      });
      const active = document.querySelector('#tabBar .active[data-tab]');
      if (active) document.body.dataset.activeTab = active.getAttribute('data-tab');

      // Home buttons that call existing controls
      const map = {
        homeRunNew: 'runNew',
        homeExportNew: 'exportNew',
        homeRunRenew: 'runRenew',
        homeExportRenew: 'exportRenew',
      };
      Object.keys(map).forEach(hid => {
        const targetId = map[hid];
        const hb = document.getElementById(hid);
        if (hb) {
          hb.addEventListener('click', () => clickIf(targetId));
        }
      });

      // View links
      document.querySelectorAll('[data-goto]').forEach(el => {
        el.addEventListener('click', () => gotoTab(el.getAttribute('data-goto')));
      });
    }
    wire();

    // Settings card marking
    // Mark all Settings cards
    document.querySelectorAll('h2[data-tab-scope*="settings"]').forEach(h2 => {
      const card = cardFromHeading(h2);
      if (card) card.classList.add('settings-card');
    });

    // Reflow Strategy top row: move New Lease Terms dropdown to a third column
    try {
      const h2s = Array.from(document.querySelectorAll('h2[data-tab-scope="settings"]'));
      const strategyH2 = h2s.find(h => h.textContent.trim() === 'Strategy');
      if (strategyH2) {
        const card = cardFromHeading(strategyH2);
        const row = card ? card.querySelector('.row') : null;
        if (row) {
          row.classList.add('strategy-row');
          // Find the inline-compact NL terms block currently under High input
          const nlBlock = card.querySelector('.inline-compact');
          if (nlBlock && nlBlock.parentElement && nlBlock.parentElement !== row) {
            // Move it to be the third grid column
            row.appendChild(nlBlock);
            // Tidy its spacing
            nlBlock.style.marginTop = '0';
            nlBlock.style.justifyContent = 'flex-end';
          }
        }
      }
    } catch (e) {}

    // Make Home the landing tab
    const homeBtn = document.querySelector('#tabBar [data-tab="home"]');
    if (homeBtn) {
      homeBtn.click();
    }
  }

  // Expose initAppBoot to window
  window.initAppBoot = initAppBoot;

  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', initAppBoot);
})();
