/**
 * SIMULATOR DATA PROVIDER
 *
 * Purpose: Provide simulated unit data to the pricing engine
 *
 * This provider wraps the simulator and presents data in the format
 * expected by the pricing engine's PricingDataProvider interface.
 */
import { UnitSimulator, createInitialUnits } from '../sim/simulator';
import { classifyUnit, computeBoxScore, getCountsByFloorplan } from '../lib/classify';
/**
 * Implementation of PricingDataProvider using simulated data
 */
export class SimDataProvider {
    constructor(seed = 12345, floorplans = []) {
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
    getUnits() {
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
    getBoxScore() {
        const units = this.simulator.getUnits();
        const today = this.simulator.getCurrentDate();
        return computeBoxScore(units, today);
    }
    /**
     * Get leads and applications for a floorplan
     * Note: Simulated data - returns deterministic values
     */
    getLeadsApps(floorplan, days) {
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
    advanceDays(days) {
        for (let i = 0; i < days; i++) {
            this.simulator.tick();
        }
    }
    /**
     * Get current simulation date
     */
    getCurrentDate() {
        return this.simulator.getCurrentDate();
    }
    /**
     * Reset to initial state with new seed
     */
    reset(seed) {
        this.simulator.reset(seed);
        const initialUnits = createInitialUnits(this.propertyFloorplans, seed);
        this.simulator = new UnitSimulator(seed, initialUnits, []);
    }
    /**
     * Get simulator instance (for advanced usage)
     */
    getSimulator() {
        return this.simulator;
    }
    /**
     * Get floorplan-level counts
     */
    getFloorplanCounts() {
        const units = this.simulator.getUnits();
        const today = this.simulator.getCurrentDate();
        return getCountsByFloorplan(units, today);
    }
}
