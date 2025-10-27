/**
 * UNIT STATE SIMULATOR
 *
 * Purpose: Simulate unit state transitions over time for testing and demos
 *
 * Features:
 * - Deterministic state transitions based on seeded PRNG
 * - Daily tick advances unit states and dates
 * - Configurable transition probabilities per floorplan
 * - Guardrails prevent invalid state transitions
 */
import { createPRNG } from './prng';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/**
 * Simulator class for managing unit state transitions
 */
export class UnitSimulator {
    /**
     * Create a new simulator
     * @param seed - Random seed for reproducibility
     * @param initialUnits - Array of initial unit states
     * @param floorplanConfigs - Configuration per floorplan
     */
    constructor(seed = 12345, initialUnits = [], floorplanConfigs = []) {
        this.prng = createPRNG(seed);
        this.state = {
            seed,
            currentDate: new Date(),
            tickRate: 1,
            isRunning: false,
            units: [...initialUnits],
            floorplanConfigs: new Map(floorplanConfigs.map(config => [config.floorplanCode, config])),
        };
    }
    /**
     * Advance simulation by one tick
     */
    tick() {
        const newDate = new Date(this.state.currentDate.getTime() + MS_PER_DAY);
        this.state.currentDate = newDate;
        for (const unit of this.state.units) {
            this.processUnit(unit, newDate);
        }
    }
    /**
     * Process a single unit for state transitions
     */
    processUnit(unit, today) {
        const config = this.state.floorplanConfigs.get(unit.floorplanCode);
        if (!config)
            return;
        const todayStr = today.toISOString().split('T')[0];
        switch (unit.state) {
            case 'OCCUPIED':
                // Check for notice
                if (this.shouldReceiveNotice(config.p_notice)) {
                    unit.state = 'ON_NOTICE';
                    unit.noticeDate = todayStr;
                }
                break;
            case 'ON_NOTICE':
                // Check for prelease
                if (this.shouldPrelease(config.p_prelease)) {
                    unit.state = 'ON_NOTICE_RENTED';
                    unit.preleaseStart = todayStr;
                }
                // Move to lease end (when lease expires)
                break;
            case 'ON_NOTICE_RENTED':
                // Lease ends, move to vacant
                if (unit.leaseEndDate && todayStr >= unit.leaseEndDate) {
                    unit.state = 'VACANT_READY';
                    unit.vacantDays = 0;
                    unit.leaseEndDate = null;
                }
                break;
            case 'VACANT_NOT_READY':
                // Make-ready complete
                if (this.shouldCompleteMakeReady(config.p_make_ready)) {
                    unit.state = 'VACANT_READY';
                }
                unit.vacantDays++;
                break;
            case 'VACANT_READY':
                // Check for move-in
                if (this.shouldMoveIn()) {
                    unit.state = 'OCCUPIED';
                    unit.moveInDate = todayStr;
                    unit.leaseEndDate = addMonths(todayStr, 12); // 12-month lease
                    unit.noticeDate = null;
                    unit.preleaseStart = null;
                }
                else {
                    unit.vacantDays++;
                }
                break;
            case 'PRELEASED':
                // Move to occupied
                if (unit.preleaseStart && todayStr >= unit.preleaseStart) {
                    unit.state = 'OCCUPIED';
                    unit.moveInDate = todayStr;
                    unit.leaseEndDate = addMonths(todayStr, 12);
                }
                break;
            case 'OFFLINE':
                // Stay offline (maintenance, renovation, etc.)
                break;
        }
    }
    /**
     * Check if unit should receive notice
     */
    shouldReceiveNotice(probability) {
        return this.prng.randomBoolean(probability);
    }
    /**
     * Check if unit should prelease
     */
    shouldPrelease(probability) {
        return this.prng.randomBoolean(probability);
    }
    /**
     * Check if make-ready should complete
     */
    shouldCompleteMakeReady(probability) {
        return this.prng.randomBoolean(probability);
    }
    /**
     * Check if unit should receive move-in
     */
    shouldMoveIn() {
        // Simplified: higher probability for longer vacancies
        const probability = Math.min(0.05 + this.prng.random() * 0.1, 0.5);
        return this.prng.randomBoolean(probability);
    }
    /**
     * Get current simulator state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get current date
     */
    getCurrentDate() {
        return new Date(this.state.currentDate);
    }
    /**
     * Get all units
     */
    getUnits() {
        return this.state.units.map(u => ({ ...u }));
    }
    /**
     * Reset simulator with new seed
     */
    reset(seed) {
        this.state.seed = seed;
        this.prng.reset(seed);
        this.state.currentDate = new Date();
        this.state.isRunning = false;
    }
    /**
     * Set tick rate (ticks per day)
     */
    setTickRate(rate) {
        this.state.tickRate = Math.max(1, rate);
    }
    /**
     * Start simulation
     */
    start() {
        this.state.isRunning = true;
    }
    /**
     * Stop simulation
     */
    stop() {
        this.state.isRunning = false;
    }
}
/**
 * Add months to a date string
 */
function addMonths(dateStr, months) {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
}
/**
 * Create initial units from real data or template
 */
export function createInitialUnits(floorplans, seed = 12345) {
    const prng = createPRNG(seed);
    const units = [];
    const today = new Date();
    for (const fp of floorplans) {
        for (let i = 0; i < fp.count; i++) {
            const unitId = `${fp.code}-${String(i + 1).padStart(3, '0')}`;
            // Random start date (past 30-180 days)
            const daysAgo = prng.randomInt(30, 180);
            const leaseStart = new Date(today.getTime() - daysAgo * MS_PER_DAY);
            const leaseEnd = addMonths(leaseStart.toISOString().split('T')[0], 12);
            units.push({
                unitId,
                floorplanCode: fp.code,
                currentRent: fp.startingRent + prng.randomInt(-50, 50),
                leaseEndDate: leaseEnd,
                moveInDate: leaseStart.toISOString().split('T')[0],
                noticeDate: null,
                preleaseStart: null,
                vacantDays: 0,
                state: 'OCCUPIED',
            });
        }
    }
    return units;
}
