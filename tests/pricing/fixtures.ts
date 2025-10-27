/**
 * TEST FIXTURES FOR PRICING ENGINE
 *
 * Purpose: Provide realistic test data for pricing engine tests.
 *
 * Fixtures include:
 * - Unit states (various occupancy scenarios)
 * - Floorplan trends (high/low occupancy, inside/outside bands)
 * - Configuration (standard, aggressive, conservative)
 * - Expected results (golden snapshots)
 */

import type {
  UnitState,
  PricingConfig,
  PricingContext,
  FloorplanTrend,
  CommunityMetrics,
  CarryForwardBaseline,
} from '../../src/pricing/types';

// ============================================================================
// STANDARD CONFIGURATION
// ============================================================================

export const standardConfig: PricingConfig = {
  priceResponse: 'standard',
  comfortTarget: 0.95,
  bandLow: 0.93,
  bandHigh: 0.96,
  maxWeeklyDec: 0.05,
  minFloorVsCurrentRent: 0.9,
  minGapToNextTier: {
    S0: 100,
    A1: 150,
    B2: 100,
  },
  stopDownBuffer: {
    S0: 50,
    A1: 75,
    B2: 50,
  },
  referenceTerm: 14,
  availableTerms: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  vacancyAgePricing: {
    enabled: true,
    discountPerDay: 0.002,
    maxDiscount: 0.1,
    thresholdDays: 30,
  },
  seasonalityEnabled: true,
  seasonalityMultipliers: [1.0, 1.0, 1.05, 1.08, 1.1, 1.12, 1.1, 1.08, 1.05, 1.02, 1.0, 1.0],
  trendOverridePctByFP: {}, // All zeros (no simulator overrides)
  flags: {
    enableSimulation: false,
    enableCarryForward: true,
  },
};

// ============================================================================
// FIXTURE 1: HIGH VACANCY - CAP CLAMP
// Scenario: Floorplan far below target, large down move, but capped
// ============================================================================

export const highVacancyFloorplanTrend: FloorplanTrend = {
  code: 'A1',
  trending: 0.75, // 75% occupancy (well below 93% band low)
  current: 0.76,
  bandLow: 0.93,
  bandHigh: 0.96,
  bedrooms: 1,
};

export const highVacancyCommunityMetrics: CommunityMetrics = {
  trendingOccupancy: 0.8, // Community also low
  currentOccupancy: 0.82,
  target: 0.95,
};

export const highVacancyUnit: UnitState = {
  unitId: 'A101',
  floorplanCode: 'A1',
  floorplanLabel: 'A1 - 1x1',
  status: 'vacant',
  currentRent: 1500,
  vacantDays: 15, // Below threshold (no discount)
  amenityAdj: 0,
};

export const highVacancyContext: PricingContext = {
  floorplanTrends: {
    A1: highVacancyFloorplanTrend,
  },
  communityMetrics: highVacancyCommunityMetrics,
  startingRents: {
    A1: 1500,
  },
  today: new Date('2025-01-15'),
};

// Expected: Large down move (5%+), but capped to 5% max decrease
// Baseline: 1500 * 0.95 = 1425 (capped at 5% down)

// ============================================================================
// FIXTURE 2: INSIDE COMFORT - STRONG CONVERSION NUDGE UP
// Scenario: Inside comfort band, strong conversion (>30%), nudge up
// ============================================================================

export const insideBandStrongConversionTrend: FloorplanTrend = {
  code: 'B2',
  trending: 0.94, // Inside band (93%-96%)
  current: 0.94,
  bandLow: 0.93,
  bandHigh: 0.96,
  bedrooms: 2,
};

export const insideBandStrongConversionCommunity: CommunityMetrics = {
  trendingOccupancy: 0.94,
  currentOccupancy: 0.94,
  target: 0.95,
};

export const insideBandStrongConversionUnit: UnitState = {
  unitId: 'B201',
  floorplanCode: 'B2',
  floorplanLabel: 'B2 - 2x2',
  status: 'vacant',
  currentRent: 1800,
  vacantDays: 10,
  amenityAdj: 50,
};

export const insideBandStrongConversionContext: PricingContext = {
  floorplanTrends: {
    B2: insideBandStrongConversionTrend,
  },
  communityMetrics: insideBandStrongConversionCommunity,
  leadsAppsData: {
    B2: {
      leads: 100,
      apps: 35, // 35% conversion (strong)
      daysTracked: 30,
    },
  },
  startingRents: {
    B2: 1800,
  },
  today: new Date('2025-01-15'),
};

// Expected: Small trend move (~0%), conversion nudge +0.5%, amenity +$50
// Baseline: 1800 * 1.005 = 1809, plus amenity adjustments per term

// ============================================================================
// FIXTURE 3: INSIDE COMFORT - WEAK CONVERSION NUDGE DOWN
// Scenario: Inside comfort band, weak conversion (<10%), nudge down
// ============================================================================

export const insideBandWeakConversionTrend: FloorplanTrend = {
  code: 'B2',
  trending: 0.95, // Inside band
  current: 0.95,
  bandLow: 0.93,
  bandHigh: 0.96,
  bedrooms: 2,
};

export const insideBandWeakConversionCommunity: CommunityMetrics = {
  trendingOccupancy: 0.95,
  currentOccupancy: 0.95,
  target: 0.95,
};

export const insideBandWeakConversionUnit: UnitState = {
  unitId: 'B202',
  floorplanCode: 'B2',
  floorplanLabel: 'B2 - 2x2',
  status: 'vacant',
  currentRent: 1800,
  vacantDays: 5,
  amenityAdj: -25, // Negative amenity adjustment
};

export const insideBandWeakConversionContext: PricingContext = {
  floorplanTrends: {
    B2: insideBandWeakConversionTrend,
  },
  communityMetrics: insideBandWeakConversionCommunity,
  leadsAppsData: {
    B2: {
      leads: 100,
      apps: 8, // 8% conversion (weak)
      daysTracked: 30,
    },
  },
  startingRents: {
    B2: 1800,
  },
  today: new Date('2025-01-15'),
};

// Expected: Small trend move (~0%), conversion nudge -0.5%, amenity -$25
// Baseline: 1800 * 0.995 = 1791, minus amenity adjustments per term

// ============================================================================
// FIXTURE 4: FLOOR CLAMP
// Scenario: Large down move would violate floor, clamped to 90% of current
// ============================================================================

export const floorClampFloorplanTrend: FloorplanTrend = {
  code: 'S0',
  trending: 0.7, // Very low occupancy
  current: 0.72,
  bandLow: 0.93,
  bandHigh: 0.96,
  bedrooms: 0,
};

export const floorClampCommunityMetrics: CommunityMetrics = {
  trendingOccupancy: 0.75,
  currentOccupancy: 0.77,
  target: 0.95,
};

export const floorClampUnit: UnitState = {
  unitId: 'S101',
  floorplanCode: 'S0',
  floorplanLabel: 'S0 - Studio',
  status: 'vacant',
  currentRent: 1200, // Current rent is HIGHER than starting rent (operator increased manually)
  vacantDays: 90, // Much longer vacancy → stronger discount → hits floor
  amenityAdj: 0,
};

export const floorClampContext: PricingContext = {
  floorplanTrends: {
    S0: floorClampFloorplanTrend,
  },
  communityMetrics: floorClampCommunityMetrics,
  startingRents: {
    S0: 1000, // Starting rent is LOWER than current (e.g., from carry-forward baseline)
  },
  carryForwardBaselines: {
    S101: {
      unitId: 'S101',
      floorplanCode: 'S0',
      priorApprovedRent: 1000, // Prior baseline is LOWER than current $1200
      priorApprovedDate: '2025-01-08',
      term: 14,
    },
  },
  today: new Date('2025-01-15'),
};

// Expected: Massive down move (8%+) on baseline $1000, capped to 5% = $950
// Then floor enforces 90% of current $1200 = $1080
// Final baseline: $1080 (floored)
// Plus vacancy age discount on term pricing: 60 days over * 0.2%/day = 12%

// ============================================================================
// FIXTURE 5: CARRY-FORWARD BASELINE
// Scenario: Use prior approved rent as baseline instead of current rent
// ============================================================================

export const carryForwardFloorplanTrend: FloorplanTrend = {
  code: 'A1',
  trending: 0.95, // Slightly above midpoint (94.5%)
  current: 0.95,
  bandLow: 0.93,
  bandHigh: 0.96,
  bedrooms: 1,
};

export const carryForwardCommunityMetrics: CommunityMetrics = {
  trendingOccupancy: 0.93,
  currentOccupancy: 0.93,
  target: 0.95,
};

export const carryForwardUnit: UnitState = {
  unitId: 'A102',
  floorplanCode: 'A1',
  floorplanLabel: 'A1 - 1x1',
  status: 'occupied',
  currentRent: 1400, // Current rent
  vacantDays: 0,
  amenityAdj: 0,
};

export const carryForwardBaseline: CarryForwardBaseline = {
  unitId: 'A102',
  floorplanCode: 'A1',
  priorApprovedRent: 1450, // Prior approved was higher
  priorApprovedDate: '2025-01-01',
  term: 14,
};

export const carryForwardContext: PricingContext = {
  floorplanTrends: {
    A1: carryForwardFloorplanTrend,
  },
  communityMetrics: carryForwardCommunityMetrics,
  carryForwardBaselines: {
    A102: carryForwardBaseline,
  },
  startingRents: {
    A1: 1400,
  },
  today: new Date('2025-02-15'), // 45 days later
};

// Expected: Use 1450 as baseline (not 1400), small up move
// Baseline: 1450 * 1.01 ≈ 1465

// ============================================================================
// FIXTURE 6: TIER GAP ENFORCEMENT
// Scenario: Lower tier pricing forces higher tier to maintain gap
// ============================================================================

export const tierGapS0Trend: FloorplanTrend = {
  code: 'S0',
  trending: 0.94,
  current: 0.94,
  bandLow: 0.93,
  bandHigh: 0.96,
  bedrooms: 0,
};

export const tierGapA1Trend: FloorplanTrend = {
  code: 'A1',
  trending: 0.94,
  current: 0.94,
  bandLow: 0.93,
  bandHigh: 0.96,
  bedrooms: 1,
};

export const tierGapCommunityMetrics: CommunityMetrics = {
  trendingOccupancy: 0.94,
  currentOccupancy: 0.94,
  target: 0.95,
};

export const tierGapS0Unit: UnitState = {
  unitId: 'S101',
  floorplanCode: 'S0',
  floorplanLabel: 'S0 - Studio',
  status: 'vacant',
  currentRent: 1200,
  vacantDays: 0,
  amenityAdj: 0,
};

export const tierGapA1Unit: UnitState = {
  unitId: 'A101',
  floorplanCode: 'A1',
  floorplanLabel: 'A1 - 1x1',
  status: 'vacant',
  currentRent: 1250, // Too close to S0
  vacantDays: 0,
  amenityAdj: 0,
};

export const tierGapContext: PricingContext = {
  floorplanTrends: {
    S0: tierGapS0Trend,
    A1: tierGapA1Trend,
  },
  communityMetrics: tierGapCommunityMetrics,
  startingRents: {
    S0: 1200,
    A1: 1250,
  },
  today: new Date('2025-01-15'),
};

// Expected: A1 must maintain $150 gap above S0
// If S0 prices at $1200, A1 must be at least $1350
// Even if trend suggests $1250, tier gap enforces $1350

// ============================================================================
// FIXTURE 7: SHORT-TERM PREMIUM
// Scenario: 2-month lease has 8% premium, 9-month has 1%, 10-month has 0%
// ============================================================================

export const shortTermFloorplanTrend: FloorplanTrend = {
  code: 'B2',
  trending: 0.94,
  current: 0.94,
  bandLow: 0.93,
  bandHigh: 0.96,
  bedrooms: 2,
};

export const shortTermCommunityMetrics: CommunityMetrics = {
  trendingOccupancy: 0.94,
  currentOccupancy: 0.94,
  target: 0.95,
};

export const shortTermUnit: UnitState = {
  unitId: 'B201',
  floorplanCode: 'B2',
  floorplanLabel: 'B2 - 2x2',
  status: 'vacant',
  currentRent: 2000,
  vacantDays: 0,
  amenityAdj: 0,
};

export const shortTermContext: PricingContext = {
  floorplanTrends: {
    B2: shortTermFloorplanTrend,
  },
  communityMetrics: shortTermCommunityMetrics,
  startingRents: {
    B2: 2000,
  },
  today: new Date('2025-01-15'),
};

// Expected:
// 2-month: baseline * 1.08 (8% premium)
// 3-month: baseline * 1.07 (7% premium)
// 9-month: baseline * 1.01 (1% premium)
// 10-month: baseline * 1.00 (no premium)
// 14-month: baseline * 1.00 (no premium)

// ============================================================================
// FIXTURE 8: SEASONALITY UPLIFT
// Scenario: Over-cap terms in high season get positive uplift only
// ============================================================================

export const seasonalityFloorplanTrend: FloorplanTrend = {
  code: 'A1',
  trending: 0.94,
  current: 0.94,
  bandLow: 0.93,
  bandHigh: 0.96,
  bedrooms: 1,
};

export const seasonalityCommunityMetrics: CommunityMetrics = {
  trendingOccupancy: 0.94,
  currentOccupancy: 0.94,
  target: 0.95,
};

export const seasonalityUnit: UnitState = {
  unitId: 'A101',
  floorplanCode: 'A1',
  floorplanLabel: 'A1 - 1x1',
  status: 'vacant',
  currentRent: 1500,
  vacantDays: 0,
  amenityAdj: 0,
};

// Test in June (month 5, high season: 1.12 = +12%)
export const seasonalityContextJune: PricingContext = {
  floorplanTrends: {
    A1: seasonalityFloorplanTrend,
  },
  communityMetrics: seasonalityCommunityMetrics,
  startingRents: {
    A1: 1500,
  },
  today: new Date('2025-01-15'), // Terms will end in different months
};

// Expected:
// Reference term (14): no seasonality (not over-cap)
// Over-cap terms ending in high season: +uplift
// Over-cap terms ending in low season: no uplift (positive only)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a minimal config with just the essentials
 */
export function createMinimalConfig(overrides: Partial<PricingConfig> = {}): PricingConfig {
  return {
    ...standardConfig,
    ...overrides,
  };
}

/**
 * Create a high-occupancy scenario (above band)
 */
export function createHighOccupancyScenario(): {
  unit: UnitState;
  config: PricingConfig;
  context: PricingContext;
} {
  const trend: FloorplanTrend = {
    code: 'A1',
    trending: 0.98, // Above 96% band high
    current: 0.98,
    bandLow: 0.93,
    bandHigh: 0.96,
    bedrooms: 1,
  };

  return {
    unit: {
      unitId: 'A101',
      floorplanCode: 'A1',
      floorplanLabel: 'A1 - 1x1',
      status: 'vacant',
      currentRent: 1500,
      vacantDays: 0,
      amenityAdj: 0,
    },
    config: standardConfig,
    context: {
      floorplanTrends: { A1: trend },
      communityMetrics: {
        trendingOccupancy: 0.97,
        currentOccupancy: 0.97,
        target: 0.95,
      },
      startingRents: { A1: 1500 },
      today: new Date('2025-01-15'),
    },
  };
}

/**
 * Create a low-occupancy scenario (below band)
 */
export function createLowOccupancyScenario(): {
  unit: UnitState;
  config: PricingConfig;
  context: PricingContext;
} {
  const trend: FloorplanTrend = {
    code: 'A1',
    trending: 0.85, // Below 93% band low
    current: 0.86,
    bandLow: 0.93,
    bandHigh: 0.96,
    bedrooms: 1,
  };

  return {
    unit: {
      unitId: 'A101',
      floorplanCode: 'A1',
      floorplanLabel: 'A1 - 1x1',
      status: 'vacant',
      currentRent: 1500,
      vacantDays: 0,
      amenityAdj: 0,
    },
    config: standardConfig,
    context: {
      floorplanTrends: { A1: trend },
      communityMetrics: {
        trendingOccupancy: 0.87,
        currentOccupancy: 0.88,
        target: 0.95,
      },
      startingRents: { A1: 1500 },
      today: new Date('2025-01-15'),
    },
  };
}
