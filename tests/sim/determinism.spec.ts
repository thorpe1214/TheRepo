/**
 * DETERMINISM TESTS
 *
 * Purpose: Verify simulator produces identical results with same seed
 */

import { describe, test, expect } from '@jest/globals';
import { SimDataProvider } from '../../src/data/SimDataProvider';

export {};

describe('Simulator Determinism', () => {
  test('same seed produces identical units', () => {
    const provider1 = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);
    
    const provider2 = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);

    const units1 = provider1.getUnits();
    const units2 = provider2.getUnits();
    
    expect(units1.length).toBe(units2.length);
    
    // Compare first few units
    for (let i = 0; i < Math.min(5, units1.length); i++) {
      expect(units1[i].unitId).toBe(units2[i].unitId);
      expect(units1[i].currentRent).toBe(units2[i].currentRent);
      expect(units1[i].status).toBe(units2[i].status);
    }
  });

  test('same seed produces identical box score evolution', () => {
    const provider1 = new SimDataProvider(12345, [
      { code: 'A1', count: 20, startingRent: 1500 },
    ]);
    
    const provider2 = new SimDataProvider(12345, [
      { code: 'A1', count: 20, startingRent: 1500 },
    ]);

    // Advance both by same number of days
    for (let day = 0; day < 10; day++) {
      provider1.advanceDays(1);
      provider2.advanceDays(1);
      
      const bs1 = provider1.getBoxScore();
      const bs2 = provider2.getBoxScore();
      
      expect(bs1.totalUnits).toBe(bs2.totalUnits);
      expect(bs1.occupied).toBe(bs2.occupied);
      expect(bs1.vacant).toBe(bs2.vacant);
      expect(bs1.onNotice).toBe(bs2.onNotice);
    }
  });

  test('different seeds produce different results', () => {
    const provider1 = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);
    
    const provider2 = new SimDataProvider(67890, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);

    const units1 = provider1.getUnits();
    const units2 = provider2.getUnits();
    
    // Lengths should match
    expect(units1.length).toBe(units2.length);
    
    // But values should be different
    expect(units1[0].currentRent).not.toBe(units2[0].currentRent);
  });

  test('reset returns to initial state', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);

    const units1 = provider.getUnits();
    provider.advanceDays(10);
    const units2 = provider.getUnits();
    
    // State changed
    const boxScore2 = provider.getBoxScore();
    expect(boxScore2).toBeDefined();

    // Reset
    provider.reset(12345);
    const units3 = provider.getUnits();
    
    // Should be similar (not identical due to dates)
    expect(units3.length).toBe(units1.length);
    expect(units3[0].unitId).toBe(units1[0].unitId);
  });
});

