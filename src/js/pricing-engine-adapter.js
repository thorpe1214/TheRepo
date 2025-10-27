/**
 * PRICING ENGINE ADAPTER
 * 
 * Purpose: Bridge between the pure pricing engine and the UI modules.
 * 
 * This adapter:
 * - Converts UI data structures to engine format
 * - Calls the pure pricing engine
 * - Converts engine results back to UI format
 * - Maintains backward compatibility with existing UI expectations
 * 
 * Public API (functions attached to window):
 * - window.__createPricingConfig() - Build PricingConfig from settings
 * - window.__createPricingContext() - Build PricingContext from current state
 * - window.__priceFloorplans() - Price all floorplans using engine
 * - window.__priceUnit() - Price a single unit using engine
 * 
 * Usage:
 * ```js
 * const config = window.__createPricingConfig();
 * const context = window.__createPricingContext();
 * const fpResults = window.__priceFloorplans(config, context);
 * ```
 */

(function () {
  'use strict';

  // Import engine functions (will be loaded via script tag)
  // These will be available once engine.ts is transpiled and loaded
  
  /**
   * Create PricingConfig from current UI settings
   */
  function createPricingConfig() {
    // Read settings from UI or localStorage
    const comfortTarget = Number(localStorage.getItem('rm:comfort_target') || 0.95);
    const priceResponse = localStorage.getItem('rm:price_response') || 'standard';
    const maxWeeklyDec = Number(localStorage.getItem('rm:max_weekly_dec') || 0.05);
    const minFloorVsCurrentRent = 0.90; // 90% floor
    const referenceTerm = 14; // months
    const availableTerms = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    
    // Get floorplan setup for tier gaps and buffers
    const setupByCode = window.__buildSetupByCode ? window.__buildSetupByCode() : {};
    const minGapToNextTier = {};
    const stopDownBuffer = {};
    
    if (window.propertySetup && window.propertySetup.floorplans) {
      for (const fp of window.propertySetup.floorplans) {
        if (fp && fp.code) {
          minGapToNextTier[fp.code] = fp.min_gap_to_next_tier_dollars || 0;
          stopDownBuffer[fp.code] = fp.stop_down_buffer_dollars || 0;
        }
      }
    }
    
    // Vacancy age pricing settings
    const vacancyAgePricing = {
      enabled: localStorage.getItem('rm:vacancy_age_enabled') === 'true',
      discountPerDay: 0.002, // 0.2% per day
      maxDiscount: 0.10, // 10% max
      thresholdDays: 30,
    };
    
    // Seasonality settings
    const seasonalityEnabled = localStorage.getItem('rm:seasonality_enabled') === 'true';
    const seasonalityMultipliers = JSON.parse(
      localStorage.getItem('rm:seasonality_multipliers') || 
      '[1.0, 1.0, 1.05, 1.08, 1.10, 1.12, 1.10, 1.08, 1.05, 1.02, 1.0, 1.0]'
    );
    
    // Feature flags
    const enableCarryForward = true; // Always enabled in this version
    const enableSimulation = false; // Not implemented yet
    
    return {
      priceResponse,
      comfortTarget,
      maxWeeklyDec,
      minFloorVsCurrentRent,
      minGapToNextTier,
      stopDownBuffer,
      referenceTerm,
      availableTerms,
      vacancyAgePricing,
      seasonalityEnabled,
      seasonalityMultipliers,
      trendOverridePctByFP: {}, // No overrides (for future simulator mode)
      flags: {
        enableSimulation,
        enableCarryForward,
      },
    };
  }
  
  /**
   * Create PricingContext from current application state
   */
  function createPricingContext() {
    // Get floorplan trends from window.__computedTrending or similar
    const floorplanTrends = {};
    
    if (window.__fpResults && Array.isArray(window.__fpResults)) {
      // Read from existing FP results if available
      for (const fp of window.__fpResults) {
        if (fp && fp.code) {
          floorplanTrends[fp.code] = {
            code: fp.code,
            trending: fp.trending || 0,
            current: fp.current || 0,
            bandLow: fp.bandLow || 0.93,
            bandHigh: fp.bandHigh || 0.96,
            bedrooms: fp.bedrooms || 0,
          };
        }
      }
    } else {
      // Compute from property setup and mapped rows
      const setupByCode = window.__buildSetupByCode ? window.__buildSetupByCode() : {};
      const byFP = window.__groupBy ? window.__groupBy(window.mappedRows || [], r => r.Floorplan || '') : {};
      
      for (const code in setupByCode) {
        const fp = setupByCode[code];
        const units = byFP[code] || [];
        const occupied = units.filter(u => u.Status && !u.Status.toLowerCase().includes('vacant')).length;
        const total = units.length;
        const current = total > 0 ? occupied / total : 0;
        
        floorplanTrends[code] = {
          code,
          trending: current, // Simplified: use current as trending
          current,
          bandLow: (fp.band_low_pct || 93) / 100,
          bandHigh: (fp.band_high_pct || 96) / 100,
          bedrooms: fp.bedrooms || 0,
        };
      }
    }
    
    // Get community metrics
    const communityMetrics = {
      trendingOccupancy: window.__trendingOccupancy || 0,
      currentOccupancy: window.__currentOccupancy || 0,
      target: Number(localStorage.getItem('rm:comfort_target') || 0.95),
    };
    
    // Get carry-forward baselines from localStorage
    const carryForwardBaselines = {};
    try {
      const stored = localStorage.getItem('rm_carry_forward_baselines');
      if (stored) {
        const data = JSON.parse(stored);
        if (data && data.fpBaselines) {
          // Convert FP baselines to unit-level baselines
          // For now, we'll apply the same baseline to all units of that floorplan
          for (const code in data.fpBaselines) {
            // This is a simplified approach - in a real implementation,
            // we'd store unit-level baselines
            carryForwardBaselines[`${code}_baseline`] = {
              unitId: `${code}_baseline`,
              floorplanCode: code,
              priorApprovedRent: Number(data.fpBaselines[code]),
              priorApprovedDate: data.at || new Date().toISOString(),
              term: 14,
            };
          }
        }
      }
    } catch (e) {
      console.warn('[RM Adapter] Failed to load carry-forward baselines:', e);
    }
    
    // Get starting rents per floorplan
    const startingRents = {};
    if (window.propertySetup && window.propertySetup.floorplans) {
      for (const fp of window.propertySetup.floorplans) {
        if (fp && fp.code) {
          startingRents[fp.code] = fp.starting_rent || 0;
        }
      }
    }
    
    // Current date
    const today = new Date();
    
    return {
      floorplanTrends,
      communityMetrics,
      carryForwardBaselines,
      startingRents,
      today,
    };
  }
  
  /**
   * Price all floorplans using the engine
   * 
   * This replaces the inline pricing logic in pricing-fp.js
   * 
   * @returns Array of floorplan pricing results in UI format
   */
  function priceFloorplans(config, context) {
    // Check if engine is loaded
    if (typeof window.__pricingEngine === 'undefined') {
      console.error('[RM Adapter] Pricing engine not loaded! Falling back to legacy pricing.');
      return null; // Signal to use legacy pricing
    }
    
    const results = [];
    
    // Group units by floorplan
    const mappedRows = window.mappedRows || [];
    const byFP = window.__groupBy ? window.__groupBy(mappedRows, r => r.Floorplan || '') : {};
    const setupByCode = window.__buildSetupByCode ? window.__buildSetupByCode() : {};
    
    // Price each floorplan
    for (const code in setupByCode) {
      const fp = setupByCode[code];
      const units = byFP[code] || [];
      
      if (units.length === 0) continue;
      
      // Convert units to engine format
      const unitStates = units.map(u => ({
        unitId: u.UnitID || u.Unit || `unit_${Math.random()}`,
        floorplanCode: code,
        floorplanLabel: u.Floorplan || code,
        status: u.Status || 'unknown',
        currentRent: Number(u.CurrentRent || u['Current Rent'] || 0),
        leaseEndDate: u.LeaseEnd || u['Lease End'] || '',
        preleaseStartDate: u.PreleaseStart || u['Prelease Start'] || '',
        vacantDays: Number(u.VacantDays || 0),
        moveInDate: u.MoveInDate || u['Move-In Date'] || '',
        amenityAdj: Number(u.AmenityAdj || 0),
      }));
      
      // Call engine to price all units for this floorplan
      // For now, we'll call priceUnit for each unit and aggregate
      // TODO: Use priceFloorplan() once implemented
      const unitResults = [];
      for (const unit of unitStates) {
        try {
          const result = window.__pricingEngine.priceUnit(unit, config, context);
          unitResults.push(result);
        } catch (e) {
          console.error(`[RM Adapter] Failed to price unit ${unit.unitId}:`, e);
        }
      }
      
      // Aggregate to floorplan level
      if (unitResults.length > 0) {
        const avgBaseline = unitResults.reduce((sum, r) => sum + r.baselineRent, 0) / unitResults.length;
        const refResult = unitResults.find(r => r.referenceTerm === config.referenceTerm) || unitResults[0];
        
        results.push({
          code,
          name: fp.name || code,
          bedrooms: fp.bedrooms || 0,
          referenceBase: Math.round(avgBaseline),
          referenceTerm: config.referenceTerm,
          trending: context.floorplanTrends[code]?.trending || 0,
          current: context.floorplanTrends[code]?.current || 0,
          bandLow: context.floorplanTrends[code]?.bandLow || 0.93,
          bandHigh: context.floorplanTrends[code]?.bandHigh || 0.96,
          // Additional fields for debugging
          _unitResults: unitResults, // Preserve unit-level results
        });
      }
    }
    
    return results;
  }
  
  /**
   * Price a single unit using the engine
   * 
   * This replaces the inline unit pricing logic in pricing-unit.js
   * 
   * @param unit - Unit data in UI format
   * @param config - Pricing configuration
   * @param context - Pricing context
   * @returns Unit pricing result in UI format
   */
  function priceUnit(unit, config, context) {
    // Check if engine is loaded
    if (typeof window.__pricingEngine === 'undefined') {
      console.error('[RM Adapter] Pricing engine not loaded! Cannot price unit.');
      return null;
    }
    
    // Convert unit to engine format
    const unitState = {
      unitId: unit.UnitID || unit.Unit || `unit_${Math.random()}`,
      floorplanCode: unit.floorplanCode || unit.Floorplan || '',
      floorplanLabel: unit.Floorplan || unit.floorplanCode || '',
      status: unit.Status || 'unknown',
      currentRent: Number(unit.CurrentRent || unit['Current Rent'] || 0),
      leaseEndDate: unit.LeaseEnd || unit['Lease End'] || '',
      preleaseStartDate: unit.PreleaseStart || unit['Prelease Start'] || '',
      vacantDays: Number(unit.VacantDays || 0),
      moveInDate: unit.MoveInDate || unit['Move-In Date'] || '',
      amenityAdj: Number(unit.AmenityAdj || 0),
    };
    
    try {
      return window.__pricingEngine.priceUnit(unitState, config, context);
    } catch (e) {
      console.error(`[RM Adapter] Failed to price unit ${unitState.unitId}:`, e);
      return null;
    }
  }
  
  // Attach to window for global access
  window.__createPricingConfig = createPricingConfig;
  window.__createPricingContext = createPricingContext;
  window.__priceFloorplans = priceFloorplans;
  window.__priceUnit = priceUnit;
  
  console.log('[RM Adapter] Pricing engine adapter loaded');
})();

