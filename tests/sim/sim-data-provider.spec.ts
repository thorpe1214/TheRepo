/**
 * SIM DATA PROVIDER TESTS
 *
 * Purpose: Verify SimDataProvider functionality
 */

import { describe, test, expect } from '@jest/globals';
import { SimDataProvider } from '../../src/data/SimDataProvider';

export {};

describe('SimDataProvider', () => {
  test('should create provider with floorplans', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
      { code: 'B2', count: 5, startingRent: 1800 },
    ]);

    const units = provider.getUnits();
    expect(units.length).toBe(15);
  });

  test('should return units in engine format', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 5, startingRent: 1500 },
    ]);

    const units = provider.getUnits();
    expect(units.length).toBe(5);
    
    for (const unit of units) {
      expect(unit.unitId).toBeDefined();
      expect(unit.floorplanCode).toBe('A1');
      expect(unit.currentRent).toBeGreaterThan(0);
      expect(unit.status).toBeDefined();
    }
  });

  test('should compute box score', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);

    const boxScore = provider.getBoxScore();
    
    expect(boxScore.totalUnits).toBe(10);
    expect(boxScore.occupied).toBeGreaterThanOrEqual(0);
    expect(boxScore.vacant).toBeGreaterThanOrEqual(0);
    expect(boxScore.occupancyRate).toBeGreaterThanOrEqual(0);
    expect(boxScore.occupancyRate).toBeLessThanOrEqual(1);
  });

  test('should provide leads and apps', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 5, startingRent: 1500 },
    ]);

    const leadsApps = provider.getLeadsApps('A1', 30);
    
    expect(leadsApps.leads).toBeGreaterThan(0);
    expect(leadsApps.apps).toBeGreaterThan(0);
  });

  test('should advance simulation', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);

    const date1 = provider.getCurrentDate();
    
    provider.advanceDays(5);
    
    const date2 = provider.getCurrentDate();
    expect(date2.getTime()).toBeGreaterThan(date1.getTime());
  });

  test('should be deterministic with same seed', () => {
    const provider1 = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);
    
    const provider2 = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);

    const units1 = provider1.getUnits();
    const units2 = provider2.getUnits();
    
    expect(units1.length).toBe(units2.length);
    expect(units1[0].unitId).toBe(units2[0].unitId);
    expect(units1[0].currentRent).toBe(units2[0].currentRent);
  });

  test('should return different units with different seeds', () => {
    const provider1 = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);
    
    const provider2 = new SimDataProvider(67890, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);

    const units1 = provider1.getUnits();
    const units2 = provider2.getUnits();
    
    expect(units1[0].currentRent).not.toBe(units2[0].currentRent);
  });

  test('should reset to initial state', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
    ]);

    const units1 = provider.getUnits();
    provider.advanceDays(10);
    const boxScore1 = provider.getBoxScore();
    
    // Reset
    provider.reset(12345);
    const units3 = provider.getUnits();
    
    // Should be back to similar state
    expect(units3.length).toBe(units1.length);
    expect(units3[0].unitId).toBe(units1[0].unitId);
  });

  test('should get floorplan counts', () => {
    const provider = new SimDataProvider(12345, [
      { code: 'A1', count: 10, startingRent: 1500 },
      { code: 'B2', count: 5, startingRent: 1800 },
    ]);

    const counts = provider.getFloorplanCounts();
    
    expect(counts.has('A1')).toBe(true);
    expect(counts.has('B2')).toBe(true);
    expect(counts.get('A1')?.totalUnits).toBe(10);
    expect(counts.get('B2')?.totalUnits).toBe(5);
  });
});

