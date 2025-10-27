/**
 * SIMULATOR DATA PROVIDER
 *
 * Purpose: Provide simulated unit data to the pricing engine
 *
 * This provider wraps the simulator and presents data in the format
 * expected by the pricing engine's PricingDataProvider interface.
 */

import type { UnitState } from '../pricing/types';
import { UnitSimulator, createInitialUnits } from '../sim/simulator';
import { classifyUnit, computeBoxScore, getCountsByFloorplan } from '../lib/classify';
import type { SimulatedUnit } from '../sim/types';

/**
 * Implementation of PricingDataProvider using simulated data
 */
export class SimDataProvider {
  private simulator: UnitSimulator;
  private readonly propertyFloorplans: Array<{
    code: string;
    count: number;
    startingRent: number;
  }>;

  constructor(
    seed: number = 12345,
    floorplans: Array<{ code: string; count: number; startingRent: number }> = []
  ) {
    this.propertyFloorplans = floorplans;
    const initialUnits = createInitialUnits(floorplans, seed);
    
    const configs = floorplans.map(fp => ({
      floorplanCode: fp.code,
      p_notice: 0.02, // 2% daily chance of notice
      p_prelease: 0.03, // 3% daily chance of prelease
      p_make_ready: 0.1, // 10% daily chance of make-ready completion
      max_make_ready_days: 14,
      max_prelease_days: 60,
    }));

    this.simulator = new UnitSimulator(seed, initialUnits, configs);
  }

  /**
   * Get units in engine format
   */
  getUnits(): UnitState[] {
    const simUnits = this.simulator.getUnits();
    const today = this.simulator.getCurrentDate();

    return simUnits.map(unit => ({
      unitId: unit.unitId,
      floorplanCode: unit.floorplanCode,
      floorplanLabel: `${unit.floorplanCode} - Simulated`,
      status: classifyUnit(unit, today),
      currentRent: unit.currentRent,
      leaseEndDate: unit.leaseEndDate || undefined,
      preleaseStartDate: unit.preleaseStart || undefined,
      vacantDays: unit.vacantDays,
      moveInDate: unit.moveInDate || undefined,
      amenityAdj: 0, // No amenity adjustments in simulation
    }));
  }

  /**
   * Get box score metrics
   */
  getBoxScore(): {
    totalUnits: number;
    occupied: number;
    vacant: number;
    onNotice: number;
    preleased: number;
    occupancyRate: number;
    projectedOccupancy: number;
  } {
    const units = this.simulator.getUnits();
    const today = this.simulator.getCurrentDate();
    return computeBoxScore(units, today);
  }

  /**
   * Get leads and applications for a floorplan
   * Note: Simulated data - returns deterministic values
   */
  getLeadsApps(
    floorplan: string,
    days: number
  ): { leads: number; apps: number } {
    // Simplified: return deterministic values based on floorplan
    const baseLeads = floorplan === 'A1' ? 10 : 5;
    const baseApps = floorplan === 'A1' ? 3 : 2;
    
    return {
      leads: baseLeads,
      apps: baseApps,
    };
  }

  /**
   * Advance simulation by N days
   */
  advanceDays(days: number): void {
    for (let i = 0; i < days; i++) {
      this.simulator.tick();
    }
  }

  /**
   * Get current simulation date
   */
  getCurrentDate(): Date {
    return this.simulator.getCurrentDate();
  }

  /**
   * Reset to initial state with new seed
   */
  reset(seed: number): void {
    this.simulator.reset(seed);
    const initialUnits = createInitialUnits(this.propertyFloorplans, seed);
    this.simulator = new UnitSimulator(seed, initialUnits, []);
  }

  /**
   * Get simulator instance (for advanced usage)
   */
  getSimulator(): UnitSimulator {
    return this.simulator;
  }

  /**
   * Get floorplan-level counts
   */
  getFloorplanCounts(): Map<string, ReturnType<typeof computeBoxScore>> {
    const units = this.simulator.getUnits();
    const today = this.simulator.getCurrentDate();
    return getCountsByFloorplan(units, today);
  }
}

