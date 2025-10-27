/**
 * COMPLETE SIMULATOR DEMO
 *
 * Purpose: Demonstrate full simulator capabilities
 * This test shows the simulator in action with realistic scenarios
 */

import { describe, test, expect } from '@jest/globals';
import { SimDataProvider } from '../../src/data/SimDataProvider';
import type { PricingEngineState } from '../../src/pricing/types';
import { priceAllUnits } from '../../src/pricing/engine';

export {};

describe('Complete Simulator Demo', () => {
  test('30-day simulation with pricing evolution', () => {
    // Create simulator for Thorpe Gardens
    const provider = new SimDataProvider(12345, [
      { code: 'S0', count: 7, startingRent: 1200 },  // Studios
      { code: 'A1', count: 12, startingRent: 1650 },  // 1BR
      { code: 'B2', count: 6, startingRent: 2150 },   // 2BR  
      { code: 'C3', count: 2, startingRent: 2650 },    // 3BR
    ]);

    // Initial state
    const initialBoxScore = provider.getBoxScore();
    expect(initialBoxScore.totalUnits).toBe(27);
    expect(initialBoxScore.occupancyRate).toBeGreaterThan(0.8);
    expect(initialBoxScore.occupancyRate).toBeLessThanOrEqual(1.0);

    // Simulate 30 days
    for (let day = 0; day < 30; day++) {
      provider.advanceDays(1);
    }

    // Final state
    const finalBoxScore = provider.getBoxScore();
    expect(finalBoxScore.totalUnits).toBe(27); // No units lost
    
    // Occupancy should evolve naturally
    console.log(`[Demo] Initial occupancy: ${(initialBoxScore.occupancyRate * 100).toFixed(1)}%`);
    console.log(`[Demo] Final occupancy: ${(finalBoxScore.occupancyRate * 100).toFixed(1)}%`);
    console.log(`[Demo] Vacant units: ${finalBoxScore.vacant}`);
    console.log(`[Demo] On notice: ${finalBoxScore.onNotice}`);
  });

  test('simulator with pricing engine integration', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
      { code: 'B2', count: 5, startingRent: 1800 },
    ]);

    // Get simulated units
    const units = provider.getUnits();
    const boxScore = provider.getBoxScore();

    // Build config
    const config = {
      priceResponse: 'standard' as const,
      comfortTarget: 0.95,
      maxWeeklyDec: 0.05,
      minFloorVsCurrentRent: 0.9,
      minGapToNextTier: {},
      stopDownBuffer: {},
      referenceTerm: 14,
      availableTerms: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      vacancyAgePricing: {
        enabled: true,
        discountPerDay: 0.002,
        maxDiscount: 0.1,
        thresholdDays: 30,
      },
      seasonalityEnabled: false,
      seasonalityMultipliers: [],
      trendOverridePctByFP: {},
      flags: {
        enableSimulation: true,
        enableCarryForward: false,
      },
    };

    // Build context
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
        'B2': {
          code: 'B2',
          trending: boxScore.occupancyRate,
          current: boxScore.occupied / boxScore.totalUnits,
          bandLow: 0.93,
          bandHigh: 0.96,
          bedrooms: 2,
        },
      },
      communityMetrics: {
        trendingOccupancy: boxScore.projectedOccupancy,
        currentOccupancy: boxScore.occupancyRate,
        target: 0.95,
      },
      startingRents: {
        'A1': 1500,
        'B2': 1800,
      },
      today: provider.getCurrentDate(),
    };

    // Price with engine
    const state: PricingEngineState = {
      units,
      config,
      context,
    };

    const result = priceAllUnits(state);
    
    console.log(`[Demo] Pricing ${units.length} simulated units`);
    console.log(`[Demo] Generated ${Object.keys(result.floorplanPricing).length} floorplan results`);
    
    // Verify results
    expect(result).toBeDefined();
    expect(result.unitPricing).toBeDefined();
    expect(Object.keys(result.floorplanPricing).length).toBeGreaterThan(0);
    
    // Show sample results
    for (const code in result.floorplanPricing) {
      const fp = result.floorplanPricing[code];
      console.log(`[Demo] ${code}: baseline=$${fp.baselineRent.toFixed(0)}, trend=${(fp.trendMagnitude * 100).toFixed(1)}%`);
    }
  });

  test('deterministic evolution across multiple days', () => {
    const provider1 = new SimDataProvider(12345, [
      { code: 'A1', count: 20, startingRent: 1500 },
    ]);
    
    const provider2 = new SimDataProvider(12345, [
      { code: 'A1', count: 20, startingRent: 1500 },
    ]);

    // Run 30 days on both
    for (let day = 0; day < 30; day++) {
      provider1.advanceDays(1);
      provider2.advanceDays(1);
    }

    const bs1 = provider1.getBoxScore();
    const bs2 = provider2.getBoxScore();
    
    // Results should be identical
    expect(bs1.occupied).toBe(bs2.occupied);
    expect(bs1.vacant).toBe(bs2.vacant);
    expect(bs1.onNotice).toBe(bs2.onNotice);
    
    console.log(`[Demo] Deterministic: ${bs1.occupied} occupied, ${bs1.vacant} vacant`);
  });
});

