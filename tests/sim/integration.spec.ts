/**
 * SIMULATOR INTEGRATION TESTS
 *
 * Purpose: Verify simulator integrates with pricing engine
 */

import { describe, test, expect } from '@jest/globals';
import { SimDataProvider } from '../../src/data/SimDataProvider';
import type { PricingEngineState } from '../../src/pricing/types';
import { priceAllUnits } from '../../src/pricing/engine';

export {};

describe('Simulator Integration', () => {
  test('should create SimDataProvider', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
      { code: 'B2', count: 5, startingRent: 1800 },
    ]);

    expect(provider).toBeDefined();
    const units = provider.getUnits();
    expect(units.length).toBe(15);
  });

  test('should provide data to pricing engine', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);

    const units = provider.getUnits();
    const boxScore = provider.getBoxScore();

    // Verify we have units
    expect(units.length).toBeGreaterThan(0);
    
    // Verify box score
    expect(boxScore.totalUnits).toBeGreaterThan(0);
    
    // Can call pricing engine
    const config = {
      priceResponse: 'standard' as const,
      comfortTarget: 0.95,
      maxWeeklyDec: 0.05,
      minFloorVsCurrentRent: 0.9,
      minGapToNextTier: {},
      stopDownBuffer: {},
      referenceTerm: 14,
      availableTerms: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      vacancyAgePricing: { enabled: false, discountPerDay: 0.002, maxDiscount: 0.1, thresholdDays: 30 },
      seasonalityEnabled: false,
      seasonalityMultipliers: [],
      trendOverridePctByFP: {},
      flags: { enableSimulation: true, enableCarryForward: false },
    };

    const context = {
      floorplanTrends: {
        'A1': {
          code: 'A1',
          trending: boxScore.occupancyRate,
          current: boxScore.occupied / boxScore.totalUnits,
          bandLow: 0.93,
          bandHigh: 0.96,
          bedrooms: 1,
        },
      },
      communityMetrics: {
        trendingOccupancy: boxScore.projectedOccupancy,
        currentOccupancy: boxScore.occupancyRate,
        target: 0.95,
      },
      startingRents: { 'A1': 1500 },
      today: new Date(),
    };

    const state: PricingEngineState = {
      units,
      config,
      context,
    };

    const result = priceAllUnits(state);
    
    expect(result).toBeDefined();
    expect(Object.keys(result.floorplanPricing).length).toBeGreaterThan(0);
  });
});

