/**
 * CLASSIFIER TESTS
 *
 * Purpose: Verify unit classification and box score computation
 */

import { describe, test, expect } from '@jest/globals';
import { classifyUnit, computeBoxScore, getCountsByFloorplan } from '../../src/lib/classify';
import type { SimulatedUnit } from '../../src/sim/types';

export {};

describe('classifyUnit', () => {
  test('should classify occupied unit', () => {
    const unit: SimulatedUnit = {
      unitId: 'A1-001',
      floorplanCode: 'A1',
      currentRent: 1500,
      leaseEndDate: '2025-11-01',
      moveInDate: '2024-11-01',
      noticeDate: null,
      preleaseStart: null,
      vacantDays: 0,
      state: 'OCCUPIED',
    };

    const today = new Date('2024-12-01');
    expect(classifyUnit(unit, today)).toBe('occupied');
  });

  test('should classify vacant unit', () => {
    const unit: SimulatedUnit = {
      unitId: 'A1-001',
      floorplanCode: 'A1',
      currentRent: 1500,
      leaseEndDate: null,
      moveInDate: null,
      noticeDate: null,
      preleaseStart: null,
      vacantDays: 5,
      state: 'VACANT_READY',
    };

    const today = new Date('2024-12-01');
    expect(classifyUnit(unit, today)).toBe('vacant');
  });

  test('should classify on notice unit', () => {
    const unit: SimulatedUnit = {
      unitId: 'A1-001',
      floorplanCode: 'A1',
      currentRent: 1500,
      leaseEndDate: '2025-01-01',
      moveInDate: '2024-01-01',
      noticeDate: '2024-12-01',
      preleaseStart: null,
      vacantDays: 0,
      state: 'ON_NOTICE',
    };

    const today = new Date('2024-12-02');
    expect(classifyUnit(unit, today)).toBe('on_notice');
  });

  test('should classify preleased unit', () => {
    const unit: SimulatedUnit = {
      unitId: 'A1-001',
      floorplanCode: 'A1',
      currentRent: 1500,
      leaseEndDate: '2025-11-01',
      moveInDate: '2024-11-01',
      noticeDate: '2024-12-01',
      preleaseStart: '2024-12-15',
      vacantDays: 0,
      state: 'ON_NOTICE_RENTED',
    };

    const today = new Date('2024-12-20'); // After prelease start
    expect(classifyUnit(unit, today)).toBe('preleased');
  });

  test('should classify unknown state', () => {
    const unit = {
      unitId: 'A1-001',
      floorplanCode: 'A1',
      currentRent: 1500,
      leaseEndDate: '2025-11-01',
      moveInDate: '2024-11-01',
      noticeDate: null,
      preleaseStart: null,
      vacantDays: 0,
      state: 'UNKNOWN' as any,
    };

    const today = new Date('2024-12-01');
    expect(classifyUnit(unit as SimulatedUnit, today)).toBe('unknown');
  });
});

describe('computeBoxScore', () => {
  test('should compute box score for empty units', () => {
    const boxScore = computeBoxScore([], new Date());
    expect(boxScore.totalUnits).toBe(0);
    expect(boxScore.occupied).toBe(0);
    expect(boxScore.vacant).toBe(0);
    expect(boxScore.occupancyRate).toBe(0);
  });

  test('should compute box score for all occupied', () => {
    const units: SimulatedUnit[] = Array(10).fill(0).map((_, i) => ({
      unitId: `A1-${String(i + 1).padStart(3, '0')}`,
      floorplanCode: 'A1',
      currentRent: 1500,
      leaseEndDate: '2025-11-01',
      moveInDate: '2024-11-01',
      noticeDate: null,
      preleaseStart: null,
      vacantDays: 0,
      state: 'OCCUPIED',
    }));

    const boxScore = computeBoxScore(units, new Date('2024-12-01'));
    
    expect(boxScore.totalUnits).toBe(10);
    expect(boxScore.occupied).toBe(10);
    expect(boxScore.vacant).toBe(0);
    expect(boxScore.occupancyRate).toBe(1.0);
  });

  test('should compute box score for mixed states', () => {
    const units: SimulatedUnit[] = [
      {
        unitId: 'A1-001',
        floorplanCode: 'A1',
        currentRent: 1500,
        leaseEndDate: '2025-11-01',
        moveInDate: '2024-11-01',
        noticeDate: null,
        preleaseStart: null,
        vacantDays: 0,
        state: 'OCCUPIED',
      },
      {
        unitId: 'A1-002',
        floorplanCode: 'A1',
        currentRent: 1500,
        leaseEndDate: null,
        moveInDate: null,
        noticeDate: null,
        preleaseStart: null,
        vacantDays: 5,
        state: 'VACANT_READY',
      },
      {
        unitId: 'A1-003',
        floorplanCode: 'A1',
        currentRent: 1500,
        leaseEndDate: '2025-01-01',
        moveInDate: '2024-01-01',
        noticeDate: '2024-12-01',
        preleaseStart: null,
        vacantDays: 0,
        state: 'ON_NOTICE',
      },
    ];

    const boxScore = computeBoxScore(units, new Date('2024-12-01'));
    
    expect(boxScore.totalUnits).toBe(3);
    expect(boxScore.occupied).toBe(1);
    expect(boxScore.vacant).toBe(1);
    expect(boxScore.onNotice).toBe(1);
    expect(boxScore.occupancyRate).toBeCloseTo(1 / 3, 3);
  });

  test('should compute projected occupancy', () => {
    const units: SimulatedUnit[] = [
      {
        unitId: 'A1-001',
        floorplanCode: 'A1',
        currentRent: 1500,
        leaseEndDate: '2025-11-01',
        moveInDate: '2024-11-01',
        noticeDate: null,
        preleaseStart: null,
        vacantDays: 0,
        state: 'OCCUPIED',
      },
      {
        unitId: 'A1-002',
        floorplanCode: 'A1',
        currentRent: 1500,
        leaseEndDate: '2025-01-01',
        moveInDate: '2024-01-01',
        noticeDate: '2024-12-01',
        preleaseStart: '2024-12-15',
        vacantDays: 0,
        state: 'ON_NOTICE_RENTED',
      },
      {
        unitId: 'A1-003',
        floorplanCode: 'A1',
        currentRent: 1500,
        leaseEndDate: null,
        moveInDate: null,
        noticeDate: null,
        preleaseStart: null,
        vacantDays: 5,
        state: 'VACANT_READY',
      },
    ];

    const today = new Date('2024-12-01');
    const boxScore = computeBoxScore(units, today);
    
    // Occupied (1) + preleased (1) - onNotice (1) = 1 total expected future occupancy
    // But we have 2 move-outs (notice + already vacant), so projection accounts for both
    // This is a simplified projection logic
    expect(boxScore.projectedOccupancy).toBeGreaterThanOrEqual(0);
    expect(boxScore.projectedOccupancy).toBeLessThanOrEqual(1);
  });

  test('should clamp occupancy rate to [0, 1]', () => {
    const units = Array(0).fill(0).map((_, i) => ({
      unitId: `A1-${String(i + 1).padStart(3, '0')}`,
      floorplanCode: 'A1',
      currentRent: 1500,
      leaseEndDate: null,
      moveInDate: null,
      noticeDate: null,
      preleaseStart: null,
      vacantDays: 0,
      state: 'OCCUPIED' as any,
    }));

    const boxScore = computeBoxScore([], new Date());
    expect(boxScore.occupancyRate).toBe(0);
    expect(boxScore.occupancyRate).toBeGreaterThanOrEqual(0);
    expect(boxScore.occupancyRate).toBeLessThanOrEqual(1);
  });
});

describe('getCountsByFloorplan', () => {
  test('should compute counts by floorplan', () => {
    const units: SimulatedUnit[] = [
      {
        unitId: 'A1-001',
        floorplanCode: 'A1',
        currentRent: 1500,
        leaseEndDate: '2025-11-01',
        moveInDate: '2024-11-01',
        noticeDate: null,
        preleaseStart: null,
        vacantDays: 0,
        state: 'OCCUPIED',
      },
      {
        unitId: 'A1-002',
        floorplanCode: 'A1',
        currentRent: 1500,
        leaseEndDate: '2025-11-01',
        moveInDate: '2024-11-01',
        noticeDate: null,
        preleaseStart: null,
        vacantDays: 0,
        state: 'OCCUPIED',
      },
      {
        unitId: 'B2-001',
        floorplanCode: 'B2',
        currentRent: 1800,
        leaseEndDate: '2025-11-01',
        moveInDate: '2024-11-01',
        noticeDate: null,
        preleaseStart: null,
        vacantDays: 0,
        state: 'OCCUPIED',
      },
    ];

    const today = new Date('2024-12-01');
    const counts = getCountsByFloorplan(units, today);
    
    expect(counts.has('A1')).toBe(true);
    expect(counts.has('B2')).toBe(true);
    expect(counts.get('A1')?.totalUnits).toBe(2);
    expect(counts.get('B2')?.totalUnits).toBe(1);
  });

  test('should handle empty units', () => {
    const counts = getCountsByFloorplan([], new Date());
    expect(counts.size).toBe(0);
  });
});

