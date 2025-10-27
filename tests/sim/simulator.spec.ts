/**
 * SIMULATOR TESTS
 *
 * Purpose: Verify unit state simulator functionality
 */

import { describe, test, expect } from '@jest/globals';
import { UnitSimulator, createInitialUnits } from '../../src/sim/simulator';
import type { SimulatedUnit, FloorplanConfig } from '../../src/sim/types';

export {};

describe('UnitSimulator', () => {
  test('should create simulator with initial units', () => {
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
    ];

    const simulator = new UnitSimulator(12345, units, []);
    expect(simulator.getUnits()).toHaveLength(1);
  });

  test('should advance time on tick', () => {
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
    ];

    const simulator = new UnitSimulator(12345, units, []);
    const date1 = simulator.getCurrentDate();
    
    simulator.tick();
    
    const date2 = simulator.getCurrentDate();
    expect(date2.getTime()).toBeGreaterThan(date1.getTime());
  });

  test('should be deterministic with same seed', () => {
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
    ];

    const config: FloorplanConfig = {
      floorplanCode: 'A1',
      p_notice: 0.02,
      p_prelease: 0.03,
      p_make_ready: 0.1,
      max_make_ready_days: 14,
      max_prelease_days: 60,
    };

    const sim1 = new UnitSimulator(12345, units, [config]);
    const sim2 = new UnitSimulator(12345, units, [config]);

    // Run 10 ticks
    for (let i = 0; i < 10; i++) {
      sim1.tick();
      sim2.tick();
    }

    const units1 = sim1.getUnits();
    const units2 = sim2.getUnits();

    expect(units1[0].state).toBe(units2[0].state);
    expect(units1[0].leaseEndDate).toBe(units2[0].leaseEndDate);
  });

  test('should create initial units', () => {
    const floorplans = [
      { code: 'A1', count: 5, startingRent: 1500 },
      { code: 'B2', count: 3, startingRent: 1800 },
    ];

    const units = createInitialUnits(floorplans, 12345);
    
    expect(units).toHaveLength(8);
    expect(units.filter(u => u.floorplanCode === 'A1')).toHaveLength(5);
    expect(units.filter(u => u.floorplanCode === 'B2')).toHaveLength(3);
    
    for (const unit of units) {
      expect(unit.state).toBe('OCCUPIED');
      expect(unit.leaseEndDate).toBeDefined();
    }
  });

  test('should handle start/stop', () => {
    const simulator = new UnitSimulator();
    expect(simulator.getState().isRunning).toBe(false);
    
    simulator.start();
    expect(simulator.getState().isRunning).toBe(true);
    
    simulator.stop();
    expect(simulator.getState().isRunning).toBe(false);
  });

  test('should reset with new seed', () => {
    const simulator = new UnitSimulator(12345);
    const state1 = simulator.getState();
    
    simulator.reset(67890);
    const state2 = simulator.getState();
    
    expect(state2.seed).toBe(67890);
    expect(state2.seed).not.toBe(state1.seed);
  });
});

