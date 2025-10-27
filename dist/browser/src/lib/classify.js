/**
 * UNIT CLASSIFICATION AND BOX SCORE
 *
 * Purpose: Classify units into states and compute occupancy metrics
 *
 * This module provides functions to:
 * - Classify units into their current state
 * - Compute box score metrics (occupancy, vacancy, etc.)
 * - Aggregate totals across floorplans
 */
/**
 * Classify a unit into its current state
 * @param unit - Unit to classify
 * @param today - Reference date for classification
 * @returns Current state string
 */
export function classifyUnit(unit, today) {
    const todayStr = today.toISOString().split('T')[0];
    // Map simulator states to actual unit states
    switch (unit.state) {
        case 'OCCUPIED':
            return 'occupied';
        case 'ON_NOTICE':
            return 'on_notice';
        case 'ON_NOTICE_RENTED':
            if (unit.preleaseStart && todayStr >= unit.preleaseStart) {
                return 'preleased';
            }
            return 'on_notice';
        case 'VACANT_NOT_READY':
            return 'vacant';
        case 'VACANT_READY':
            return 'vacant';
        case 'PRELEASED':
            return 'preleased';
        case 'OFFLINE':
            return 'occupied'; // Treat offline as occupied for now
        default:
            return 'unknown';
    }
}
/**
 * Compute box score from units
 * @param units - Array of units
 * @param today - Reference date
 * @returns Box score metrics
 */
export function computeBoxScore(units, today) {
    const classification = units.map(u => classifyUnit(u, today));
    const totalUnits = units.length;
    const occupied = classification.filter(s => s === 'occupied').length;
    const vacant = classification.filter(s => s === 'vacant').length;
    const onNotice = classification.filter(s => s === 'on_notice').length;
    const preleased = classification.filter(s => s === 'preleased').length;
    const offline = classification.filter(s => s === 'offline').length;
    const occupancyRate = totalUnits > 0 ? occupied / totalUnits : 0;
    // Projected occupancy = occupied + preleased, accounting for move-outs
    const projectedOccupancy = totalUnits > 0
        ? (occupied + preleased - onNotice) / totalUnits
        : 0;
    return {
        totalUnits,
        occupied,
        vacant,
        onNotice,
        preleased,
        offline,
        occupancyRate: Math.max(0, Math.min(1, occupancyRate)),
        projectedOccupancy: Math.max(0, Math.min(1, projectedOccupancy)),
    };
}
/**
 * Get counts by floorplan
 * @param units - Array of units
 * @param today - Reference date
 * @returns Map of floorplan code to counts
 */
export function getCountsByFloorplan(units, today) {
    const byFP = new Map();
    for (const unit of units) {
        const arr = byFP.get(unit.floorplanCode) || [];
        arr.push(unit);
        byFP.set(unit.floorplanCode, arr);
    }
    const result = new Map();
    for (const [fp, fpUnits] of byFP.entries()) {
        result.set(fp, computeBoxScore(fpUnits, today));
    }
    return result;
}
