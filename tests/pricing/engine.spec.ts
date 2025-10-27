/**
 * PRICING ENGINE TESTS
 * 
 * Purpose: Comprehensive test suite for the pure pricing engine.
 * 
 * Test Categories:
 * 1. Golden Fixtures - Lock down expected outputs for specific scenarios
 * 2. Invariant Tests - Verify mathematical properties always hold
 * 3. Carry-Forward Regression - Test 30-day simulation with baseline evolution
 * 4. Contract Check - Compare old inline logic vs new engine (temporary)
 * 
 * All tests use the pure engine (no DOM, no globals, deterministic).
 */

import { describe, test, expect } from '@jest/globals';
import { priceUnit, priceFloorplan, priceAllUnits } from '../../src/pricing/engine';
import type { PricingEngineState, UnitPricingResult, UnitState, FloorplanTrend, PricingContext } from '../../src/pricing/types';
import * as fixtures from './fixtures';

// ============================================================================
// GOLDEN FIXTURES - Lock Expected Outputs
// ============================================================================

describe('Pricing Engine - Golden Fixtures', () => {
  
  test('Fixture 1: High vacancy → cap clamp', () => {
    // Scenario: 75% occupancy (well below target), large down move, capped at 5%
    const result = priceUnit(
      fixtures.highVacancyUnit,
      fixtures.standardConfig,
      fixtures.highVacancyContext
    );
    
    // Assertions
    expect(result.unitId).toBe('A101');
    expect(result.floorplanCode).toBe('A1');
    
    // Should have trend down flag
    expect(result.flags.trendDown).toBe(true);
    expect(result.flags.trendUp).toBe(false);
    
    // Should be capped
    expect(result.flags.capClamped).toBe(true);
    
    // Baseline should be capped to 95% of current (5% max decrease)
    // Current: 1500, cap: 1500 * 0.95 = 1425
    expect(result.baselineRent).toBeGreaterThanOrEqual(1425 - 1);
    expect(result.baselineRent).toBeLessThanOrEqual(1425 + 1);
    
    // Reference rent (14-month) should be close to baseline
    expect(result.referenceRent).toBeGreaterThanOrEqual(1420);
    expect(result.referenceRent).toBeLessThanOrEqual(1430);
    
    // Should have 13 term pricing results
    expect(result.termPricing).toHaveLength(13);
    
    // 2-month should have short-term premium (+8%)
    const twoMonth = result.termPricing.find(t => t.term === 2);
    expect(twoMonth).toBeDefined();
    expect(twoMonth!.price).toBeGreaterThan(result.referenceRent);
    
    // Should have reasons explaining the cap
    const capReason = result.reasons.find(r => r.type === 'cap');
    expect(capReason).toBeDefined();
    expect(capReason!.applied).toBe(true);
  });
  
  test('Fixture 2: Inside comfort → strong conversion nudge up', () => {
    // Scenario: 94% occupancy (inside band), 35% conversion (strong)
    const result = priceUnit(
      fixtures.insideBandStrongConversionUnit,
      fixtures.standardConfig,
      fixtures.insideBandStrongConversionContext
    );
    
    // Assertions
    expect(result.unitId).toBe('B201');
    expect(result.floorplanCode).toBe('B2');
    
    // Should be inside comfort band
    expect(result.flags.insideComfortBand).toBe(true);
    
    // Should have conversion nudge up
    expect(result.flags.conversionNudgeUp).toBe(true);
    expect(result.flags.conversionNudgeDown).toBe(false);
    
    // Should have small upward adjustment (~0.5%)
    // Current: 1800, nudge: 1800 * 1.005 = 1809
    expect(result.baselineRent).toBeGreaterThanOrEqual(1800);
    expect(result.baselineRent).toBeLessThanOrEqual(1820);
    
    // Should have conversion reason
    const convReason = result.reasons.find(r => r.type === 'conversion');
    expect(convReason).toBeDefined();
    expect(convReason!.value).toBeGreaterThan(0);
  });
  
  test('Fixture 3: Inside comfort → weak conversion nudge down', () => {
    // Scenario: 95% occupancy (inside band), 8% conversion (weak)
    const result = priceUnit(
      fixtures.insideBandWeakConversionUnit,
      fixtures.standardConfig,
      fixtures.insideBandWeakConversionContext
    );
    
    // Assertions
    expect(result.unitId).toBe('B202');
    
    // Should be inside comfort band
    expect(result.flags.insideComfortBand).toBe(true);
    
    // Should have conversion nudge down
    expect(result.flags.conversionNudgeDown).toBe(true);
    expect(result.flags.conversionNudgeUp).toBe(false);
    
    // Should have small downward adjustment (~0.5%)
    // Current: 1800, nudge: 1800 * 0.995 = 1791
    expect(result.baselineRent).toBeGreaterThanOrEqual(1785);
    expect(result.baselineRent).toBeLessThanOrEqual(1800);
    
    // Should have conversion reason
    const convReason = result.reasons.find(r => r.type === 'conversion');
    expect(convReason).toBeDefined();
    expect(convReason!.value).toBeLessThan(0);
  });
  
  test('Fixture 4: Floor clamp', () => {
    // Scenario: 70% occupancy (very low), massive down move, floored at 90% of current
    const result = priceUnit(
      fixtures.floorClampUnit,
      fixtures.standardConfig,
      fixtures.floorClampContext
    );
    
    // Assertions
    expect(result.unitId).toBe('S101');
    
    // Should have trend down
    expect(result.flags.trendDown).toBe(true);
    
    // Should be both capped and floored
    expect(result.flags.capClamped).toBe(true);
    expect(result.flags.floorClamped).toBe(true);
    
    // Floor: 1200 * 0.90 = 1080
    expect(result.baselineRent).toBeGreaterThanOrEqual(1080 - 1);
    expect(result.baselineRent).toBeLessThanOrEqual(1080 + 1);
    
    // Should have floor reason
    const floorReason = result.reasons.find(r => r.type === 'floor');
    expect(floorReason).toBeDefined();
    expect(floorReason!.applied).toBe(true);
    
    // Unit has 90 days vacant (60 over threshold)
    // Vacancy discount: 60 * 0.002 = 0.12 = 12%, but capped at 10%
    // Term pricing should apply this discount
    const refTerm = result.termPricing.find(t => t.term === 14);
    expect(refTerm).toBeDefined();
    // Reference rent should be baseline * (1 - 0.10) = 1080 * 0.90 = 972
    expect(refTerm!.price).toBeGreaterThanOrEqual(970);
    expect(refTerm!.price).toBeLessThanOrEqual(975);
  });
  
  test('Fixture 5: Carry-forward baseline', () => {
    // Scenario: Use prior approved rent (1450) instead of current (1400)
    const result = priceUnit(
      fixtures.carryForwardUnit,
      fixtures.standardConfig,
      fixtures.carryForwardContext
    );
    
    // Assertions
    expect(result.unitId).toBe('A102');
    
    // Should use carry-forward baseline
    expect(result.flags.carryForwardUsed).toBe(true);
    
    // Should have carry-forward reason
    const cfReason = result.reasons.find(r => r.type === 'carryForward');
    expect(cfReason).toBeDefined();
    expect(cfReason!.description).toContain('prior approved');
    
    // Baseline should start from 1450 (not 1400)
    // Inside band: 95% trending vs 94.5% mid → tiny up move (dampened to 10%)
    // Trend magnitude ≈ 0.1% (dampened), so 1450 * 1.001 ≈ 1451
    expect(result.baselineRent).toBeGreaterThanOrEqual(1448);
    expect(result.baselineRent).toBeLessThanOrEqual(1453);
    
    // Delta should compare proposed vs carry-forward baseline
    expect(result.delta.previous).toBe(1450);
    expect(result.delta.proposed).toBeGreaterThan(1450);
  });
  
  test('Fixture 6: Tier gap enforcement', () => {
    // Scenario: A1 must maintain $150 gap above S0
    
    // Price S0 first
    const s0Result = priceUnit(
      fixtures.tierGapS0Unit,
      fixtures.standardConfig,
      fixtures.tierGapContext,
      null // No lower tier
    );
    
    // Price A1 with S0 as lower tier
    const a1Result = priceUnit(
      fixtures.tierGapA1Unit,
      fixtures.standardConfig,
      fixtures.tierGapContext,
      s0Result.referenceRent // Pass S0 max rent
    );
    
    // Assertions
    expect(a1Result.unitId).toBe('A101');
    
    // A1 must be at least $150 above S0
    const minRequired = s0Result.referenceRent + 150;
    expect(a1Result.referenceRent).toBeGreaterThanOrEqual(minRequired);
    
    // If tier gap was enforced, should have flag
    if (a1Result.referenceRent >= minRequired) {
      // Gap may or may not be enforced depending on natural pricing
      // Just verify it's respected
      expect(a1Result.referenceRent - s0Result.referenceRent).toBeGreaterThanOrEqual(150);
    }
  });
  
  test('Fixture 7: Short-term premium structure', () => {
    // Scenario: Verify 8% → 1% → 0% premium taper
    const result = priceUnit(
      fixtures.shortTermUnit,
      fixtures.standardConfig,
      fixtures.shortTermContext
    );
    
    // Assertions
    expect(result.unitId).toBe('B201');
    expect(result.flags.shortTermPremium).toBe(true);
    
    // Get baseline (14-month reference, no premium)
    const refTerm = result.termPricing.find(t => t.term === 14);
    expect(refTerm).toBeDefined();
    const baseline = refTerm!.price;
    
    // 2-month: +8%
    const term2 = result.termPricing.find(t => t.term === 2);
    expect(term2).toBeDefined();
    expect(term2!.price).toBeGreaterThanOrEqual(baseline * 1.07);
    expect(term2!.price).toBeLessThanOrEqual(baseline * 1.09);
    
    // 9-month: +1%
    const term9 = result.termPricing.find(t => t.term === 9);
    expect(term9).toBeDefined();
    expect(term9!.price).toBeGreaterThanOrEqual(baseline * 1.00);
    expect(term9!.price).toBeLessThanOrEqual(baseline * 1.02);
    
    // 10-month: no premium (should equal baseline)
    const term10 = result.termPricing.find(t => t.term === 10);
    expect(term10).toBeDefined();
    expect(term10!.price).toBeGreaterThanOrEqual(baseline * 0.99);
    expect(term10!.price).toBeLessThanOrEqual(baseline * 1.01);
  });
});

// ============================================================================
// INVARIANT TESTS - Mathematical Properties
// ============================================================================

describe('Pricing Engine - Invariants', () => {
  
  test('Invariant: Floors never violated', () => {
    // Test across multiple scenarios
    const scenarios = [
      fixtures.createHighOccupancyScenario(),
      fixtures.createLowOccupancyScenario(),
      {
        unit: fixtures.floorClampUnit,
        config: fixtures.standardConfig,
        context: fixtures.floorClampContext,
      },
    ];
    
    for (const scenario of scenarios) {
      const result = priceUnit(scenario.unit, scenario.config, scenario.context);
      
      // Floor is 90% of current rent or $500 minimum
      const minFloor = Math.max(500, scenario.unit.currentRent * 0.90);
      
      // Baseline rent must never go below floor
      expect(result.baselineRent).toBeGreaterThanOrEqual(minFloor - 0.01);
      
      // All term pricing must respect floor (accounting for vacancy discount)
      for (const term of result.termPricing) {
        expect(term.price).toBeGreaterThanOrEqual(0); // Never negative
        // Note: Vacancy discount can push below floor in term pricing, that's ok
      }
    }
  });
  
  test('Invariant: Directional caps respected', () => {
    // Test that decreases never exceed maxWeeklyDec
    const lowOccScenario = fixtures.createLowOccupancyScenario();
    const result = priceUnit(
      lowOccScenario.unit,
      lowOccScenario.config,
      lowOccScenario.context
    );
    
    // If trending down, baseline should not decrease more than 5%
    if (result.flags.trendDown) {
      const maxDecreaseAllowed = lowOccScenario.unit.currentRent * (1 - 0.05);
      expect(result.baselineRent).toBeGreaterThanOrEqual(maxDecreaseAllowed - 0.01);
    }
    
    // If trending up, no cap (can increase freely)
    const highOccScenario = fixtures.createHighOccupancyScenario();
    const upResult = priceUnit(
      highOccScenario.unit,
      highOccScenario.config,
      highOccScenario.context
    );
    
    if (upResult.flags.trendUp) {
      // Should be able to go above current rent without cap
      expect(upResult.baselineRent).toBeGreaterThan(0);
    }
  });
  
  test('Invariant: Distance-to-target monotonicity', () => {
    // Larger negative distance should not produce smaller down move than smaller distance
    // (all else being equal)
    
    // Create two scenarios with different occupancy levels
    const scenario1 = fixtures.createLowOccupancyScenario(); // 85% occupancy
    scenario1.context.floorplanTrends['A1'].trending = 0.85;
    
    const scenario2 = fixtures.createLowOccupancyScenario(); // 80% occupancy (worse)
    scenario2.context.floorplanTrends['A1'].trending = 0.80;
    
    const result1 = priceUnit(scenario1.unit, scenario1.config, scenario1.context);
    const result2 = priceUnit(scenario2.unit, scenario2.config, scenario2.context);
    
    // result2 (worse occupancy) should have equal or larger magnitude down move
    const move1Pct = (result1.baselineRent - scenario1.unit.currentRent) / scenario1.unit.currentRent;
    const move2Pct = (result2.baselineRent - scenario2.unit.currentRent) / scenario2.unit.currentRent;
    
    // Both should be negative (down moves)
    expect(move1Pct).toBeLessThanOrEqual(0);
    expect(move2Pct).toBeLessThanOrEqual(0);
    
    // move2 should be more negative (larger down move) or equal due to cap
    expect(move2Pct).toBeLessThanOrEqual(move1Pct + 0.001); // Allow small floating point error
  });
  
  test('Invariant: Short-term premiums monotonically decrease', () => {
    // 2-month premium >= 3-month premium >= ... >= 9-month premium > 10-month premium === 0
    const result = priceUnit(
      fixtures.shortTermUnit,
      fixtures.standardConfig,
      fixtures.shortTermContext
    );
    
    const baseline = result.termPricing.find(t => t.term === 14)!.price;
    const premiums: { term: number; premium: number }[] = [];
    
    for (let term = 2; term <= 10; term++) {
      const termPrice = result.termPricing.find(t => t.term === term);
      expect(termPrice).toBeDefined();
      const premium = (termPrice!.price - baseline) / baseline;
      premiums.push({ term, premium });
    }
    
    // Verify monotonic decrease
    for (let i = 1; i < premiums.length; i++) {
      expect(premiums[i].premium).toBeLessThanOrEqual(premiums[i - 1].premium + 0.001);
    }
    
    // 10-month should have ~0 premium
    const term10Premium = premiums.find(p => p.term === 10)!.premium;
    expect(Math.abs(term10Premium)).toBeLessThan(0.01);
  });
});

// ============================================================================
// CARRY-FORWARD REGRESSION TEST
// ============================================================================

describe('Pricing Engine - 30-Day Carry-Forward Regression', () => {
  
  test('30-day simulation with carry-forward (no snap-back)', () => {
    // Simulate 30 days of pricing with carry-forward
    // Verify no sudden snap-back to starting rent
    
    const initialUnit: UnitState = {
      unitId: 'A101',
      floorplanCode: 'A1',
      floorplanLabel: 'A1 - 1x1',
      status: 'vacant',
      currentRent: 1500,
      vacantDays: 0,
      amenityAdj: 0,
    };
    
    const trend: FloorplanTrend = {
      code: 'A1',
      trending: 0.945, // At midpoint (inside comfort band, minimal moves)
      current: 0.945,
      bandLow: 0.93,
      bandHigh: 0.96,
      bedrooms: 1,
    };
    
    let currentBaseline = 1500;
    const dailyRents: number[] = [currentBaseline];
    
    // Simulate 30 days
    for (let day = 1; day <= 30; day++) {
      const context: PricingContext = {
        floorplanTrends: { 'A1': trend },
        communityMetrics: {
          trendingOccupancy: 0.945,
          currentOccupancy: 0.945,
          target: 0.95,
        },
        carryForwardBaselines: {
          'A101': {
            unitId: 'A101',
            floorplanCode: 'A1',
            priorApprovedRent: currentBaseline,
            priorApprovedDate: `2025-01-${String(day).padStart(2, '0')}`,
            term: 14,
          },
        },
        startingRents: { 'A1': 1500 },
        today: new Date(`2025-01-${String(day).padStart(2, '0')}`),
      };
      
      // Update unit's current rent to match the carried-forward baseline
      const unitForDay = { ...initialUnit, currentRent: currentBaseline };
      const result = priceUnit(unitForDay, fixtures.standardConfig, context);
      currentBaseline = result.referenceRent;
      dailyRents.push(currentBaseline);
      
      // Verify no snap-back
      if (day > 1) {
        const prevRent = dailyRents[day - 1];
        const change = Math.abs(currentBaseline - prevRent);
        const changePct = change / prevRent;
        
        // Change should be small (< 1% per day)
        expect(changePct).toBeLessThan(0.01);
        
        // Should be moving consistently in one direction (no oscillation)
        if (day > 2) {
          const prev2Rent = dailyRents[day - 2];
          const direction1 = currentBaseline - prevRent;
          const direction2 = prevRent - prev2Rent;
          
          // If both moves are significant, they should be same direction
          if (Math.abs(direction1) > 1 && Math.abs(direction2) > 1) {
            expect(direction1 * direction2).toBeGreaterThanOrEqual(0); // Same sign
          }
        }
      }
    }
    
    // After 30 days, rent should be stable (at midpoint of comfort band)
    // With minimal daily changes due to inside-band damping
    const finalRent = dailyRents[30];
    expect(finalRent).toBeGreaterThanOrEqual(1490); // Should stay close to initial
    expect(finalRent).toBeLessThanOrEqual(1510); // Minimal drift
    
    // Verify smooth evolution (no sudden jumps)
    for (let i = 1; i < dailyRents.length; i++) {
      const change = Math.abs(dailyRents[i] - dailyRents[i - 1]);
      expect(change).toBeLessThan(20); // Max $20 per day change
    }
  });
});

// ============================================================================
// HELPER FUNCTIONS FOR TESTS
// ============================================================================

/**
 * Helper: Assert a price is within a tolerance range
 */
function expectPriceNear(actual: number, expected: number, tolerance: number = 1) {
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
}

/**
 * Helper: Assert a percentage is within a tolerance range
 */
function expectPercentNear(actual: number, expected: number, tolerance: number = 0.01) {
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
}

