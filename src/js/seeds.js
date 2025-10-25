/**
 * Seeds for Thorpe Gardens single-property mode
 * Used when localStorage is empty to provide deterministic setup
 */

(function () {
  'use strict';

  // Property setup seeds
  window.__seedPropertySetup = {
    property_id: 'thorpe-gardens',
    property_name: 'Thorpe Gardens',
    floorplans: [
      { code: 'S0', name: 'Studio', bedrooms: 0, units: 50 },
      { code: 'A1', name: '1x1', bedrooms: 1, units: 100 },
      { code: 'B2', name: '2x2', bedrooms: 2, units: 40 },
      { code: 'C3', name: '3x2 Small', bedrooms: 3, units: 10 },
    ],
    metadata: {
      totalUnits: 200,
      preConfigured: true,
      seeded: true,
    },
  };

  // Floorplan mapping seeds (CSV labels → codes)
  // Supports both dash and space variants for real-world CSV flexibility
  window.__seedFPMap = {
    // S0 - Studio variations
    'S0 - Studio': 'S0',
    'S0 Studio': 'S0',
    Studio: 'S0',

    // A1 - 1x1 variations
    'A1 - 1x1': 'A1',
    'A1 1x1': 'A1',
    '1x1': 'A1',
    '1x1 A': 'A1',

    // B2 - 2x2 variations
    'B2 - 2x2': 'B2',
    'B2 2x2': 'B2',
    '2x2': 'B2',
    'Two Bedroom B': 'B2',

    // C3 - 3x2 Small variations
    'C3 - 3x2 Small': 'C3',
    'C3 3x2 Small': 'C3',
    '3x2 Small': 'C3',
    '3 Bedroom': 'C3',
  };

  console.log('[RM Seeds] Thorpe Gardens seeds loaded');
})();
