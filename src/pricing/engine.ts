/**
 * PRICING ENGINE - Pure Math Functions
 * 
 * Purpose: Extract all pricing formulas into pure, testable functions.
 * 
 * Rule Order (FIXED - DO NOT REORDER):
 * 1. Trend move (up/down based on occupancy vs target)
 * 2. Conversion nudge (inside band only, based on leads/apps ratio)
 * 3. Carry-forward base (use prior approved if available)
 * 4. Short-term premiums (2-9 month lease terms)
 * 5. Seasonality (positive-only, over-cap terms)
 * 6. Directional caps vs prior approved
 * 7. Floor enforcement
 * 8. Tier gap enforcement (minimum gap to next lower tier)
 * 
 * Guarantees:
 * - Pure functions only (no DOM, no globals, deterministic)
 * - API parity with existing behavior
 * - Includes reasons and flags for explainability
 */

import type {
  UnitState,
  PricingConfig,
  PricingContext,
  UnitPricingResult,
  FloorplanPricingResult,
  PricingEngineState,
  PricingEngineResult,
  PriceReason,
  PriceFlags,
  TermPricing,
  PriceDelta,
} from './types';

// ============================================================================
// STEP 1: TREND MOVE
// ============================================================================

/**
 * Compute trend-based direction and magnitude for a floorplan
 * 
 * Inputs:
 * - floorplanCode: The floorplan to calculate for
 * - context: Trending data and community metrics
 * - config: Price response settings
 * 
 * Returns:
 * - direction: -1 (down), 0 (none), +1 (up)
 * - magnitude: 0..maxMove (e.g., 0.05 = 5%)
 * - reasons: Explanations
 */
function computeTrendMove(
  floorplanCode: string,
  context: PricingContext,
  config: PricingConfig
): { direction: number; magnitude: number; reasons: PriceReason[] } {
  const reasons: PriceReason[] = [];
  
  const fpTrend = context.floorplanTrends[floorplanCode];
  if (!fpTrend) {
    return { direction: 0, magnitude: 0, reasons };
  }
  
  // Comfort band midpoint
  const low = fpTrend.bandLow * 100; // e.g., 93
  const high = fpTrend.bandHigh * 100; // e.g., 96
  const mid = (low + high) / 2; // e.g., 94.5
  
  // Floorplan occupancy in percent-points
  const occ_fp = fpTrend.trending * 100; // e.g., 86.5
  const dev_pp = occ_fp - mid; // e.g., 86.5 - 94.5 = -8.0 pp
  const sign = dev_pp < 0 ? -1 : dev_pp > 0 ? +1 : 0;
  
  // Max move based on price response
  const priceResponse = config.priceResponse || 'standard';
  let maxMove = 0.05; // Standard: ±5%
  if (priceResponse === 'fast') maxMove = 0.08; // Aggressive: ±8%
  else if (priceResponse === 'gentle') maxMove = 0.03; // Conservative: ±3%
  
  // Smooth tanh function: 5pp => x=1, then tanh(1.4*x)
  const x = Math.abs(dev_pp) / 5;
  const k = 1.4;
  let mag = maxMove * Math.tanh(k * x); // 0..maxMove
  
  // Inside comfort band: apply dead zone (minimal movement to allow conversion nudge)
  const insideBand = occ_fp >= low && occ_fp <= high;
  if (insideBand) {
    // Dampen trend move to 10% of normal magnitude
    // This allows conversion steering to dominate inside the band
    mag = mag * 0.1;
  }
  
  // Community bias: amplify if community is also trending same direction (only outside band)
  const comm = context.communityMetrics;
  const deltaSitePP = (comm.trendingOccupancy - comm.target) * 100;
  let biasMult = 1.0;
  
  if (!insideBand) {
    // Only apply community bias outside comfort band
    if (deltaSitePP > 1 && sign > 0) {
      // Community above target, FP above band → amplify up move
      biasMult = 1 + Math.min(0.15 * deltaSitePP, 0.3);
    } else if (deltaSitePP < -1 && sign < 0) {
      // Community below target, FP below band → amplify down move
      biasMult = 1 + Math.min(0.15 * Math.abs(deltaSitePP), 0.3);
    }
  }
  
  mag *= biasMult;
  
  if (sign < 0) {
    mag = -mag;
  }
  
  // Record reasons
  if (mag !== 0) {
    const dirStr = mag > 0 ? 'up' : 'down';
    reasons.push({
      type: 'trend',
      description: `Trend ${dirStr} ${(Math.abs(mag) * 100).toFixed(1)}% (occ: ${occ_fp.toFixed(1)}% vs mid: ${mid.toFixed(1)}%)`,
      value: mag,
      applied: true,
    });
    
    if (biasMult !== 1.0) {
      reasons.push({
        type: 'trend',
        description: `Community bias ${((biasMult - 1) * 100).toFixed(1)}% (site: ${(comm.trendingOccupancy * 100).toFixed(1)}% vs ${(comm.target * 100).toFixed(1)}%)`,
        value: (biasMult - 1),
        applied: true,
      });
    }
  }
  
  return { direction: sign, magnitude: mag, reasons };
}

// ============================================================================
// STEP 2: CONVERSION NUDGE (Inside comfort band only)
// ============================================================================

/**
 * Compute conversion-based nudge (only applies inside comfort band)
 * 
 * Inputs:
 * - floorplanCode: The floorplan to calculate for
 * - isInsideBand: Whether FP occupancy is inside comfort band
 * - context: Leads/apps data
 * 
 * Returns:
 * - nudge: Small adjustment (e.g., ±0.5%)
 * - reasons: Explanations
 */
function computeConversionNudge(
  floorplanCode: string,
  isInsideBand: boolean,
  context: PricingContext
): { nudge: number; reasons: PriceReason[] } {
  const reasons: PriceReason[] = [];
  
  // Only apply if inside comfort band
  if (!isInsideBand) {
    return { nudge: 0, reasons };
  }
  
  const leadsApps = context.leadsAppsData?.[floorplanCode];
  if (!leadsApps || leadsApps.leads === 0) {
    return { nudge: 0, reasons };
  }
  
  const ratio = leadsApps.apps / leadsApps.leads;
  let nudge = 0;
  
  // Strong conversion (>30%) → nudge up 0.5%
  if (ratio > 0.30) {
    nudge = 0.005;
    reasons.push({
      type: 'conversion',
      description: `Strong conversion ${(ratio * 100).toFixed(1)}% → nudge up +0.5%`,
      value: nudge,
      applied: true,
    });
  }
  // Weak conversion (<10%) → nudge down 0.5%
  else if (ratio < 0.10) {
    nudge = -0.005;
    reasons.push({
      type: 'conversion',
      description: `Weak conversion ${(ratio * 100).toFixed(1)}% → nudge down -0.5%`,
      value: nudge,
      applied: true,
    });
  }
  
  return { nudge, reasons };
}

// ============================================================================
// STEP 3: CARRY-FORWARD BASE
// ============================================================================

/**
 * Determine the baseline rent for pricing calculations
 * 
 * Priority:
 * 1. Carry-forward baseline (if available and enabled)
 * 2. Current rent (from rent roll)
 * 3. Starting rent (fallback)
 * 
 * Returns:
 * - baseline: The rent to use as starting point
 * - source: 'carryForward' | 'currentRent' | 'startingRent'
 * - reasons: Explanations
 */
function determineBaseline(
  unit: UnitState,
  config: PricingConfig,
  context: PricingContext
): { baseline: number; source: string; reasons: PriceReason[] } {
  const reasons: PriceReason[] = [];
  
  // Check carry-forward first
  if (config.flags?.enableCarryForward && context.carryForwardBaselines) {
    const cfBaseline = context.carryForwardBaselines[unit.unitId];
    if (cfBaseline && cfBaseline.priorApprovedRent > 0) {
      reasons.push({
        type: 'carryForward',
        description: `Using prior approved rent $${Math.round(cfBaseline.priorApprovedRent)} (${cfBaseline.priorApprovedDate})`,
        value: cfBaseline.priorApprovedRent,
        applied: true,
      });
      return { baseline: cfBaseline.priorApprovedRent, source: 'carryForward', reasons };
    }
  }
  
  // Use current rent if available
  if (unit.currentRent > 0) {
    reasons.push({
      type: 'carryForward',
      description: `Using current rent $${Math.round(unit.currentRent)}`,
      value: unit.currentRent,
      applied: true,
    });
    return { baseline: unit.currentRent, source: 'currentRent', reasons };
  }
  
  // Fallback to starting rent
  const startingRent = context.startingRents[unit.floorplanCode] || 1000;
  reasons.push({
    type: 'carryForward',
    description: `Using starting rent $${Math.round(startingRent)} (fallback)`,
    value: startingRent,
    applied: true,
  });
  return { baseline: startingRent, source: 'startingRent', reasons };
}

// ============================================================================
// STEP 4: SHORT-TERM PREMIUMS
// ============================================================================

/**
 * Calculate short-term premium for 2-9 month leases
 * 
 * Premium structure:
 * - 2 mo: +8%
 * - 3 mo: +7%
 * - 4 mo: +6%
 * - ...
 * - 9 mo: +1%
 * - 10+ mo: 0%
 */
function shortTermPremium(term: number): number {
  if (term >= 10) return 0;
  const start = 0.08; // 8% for 2-month
  const taper = 0.01; // Decrease 1% per month
  return Math.max(0, start - (term - 2) * taper);
}

// ============================================================================
// STEP 5: SEASONALITY (Positive-only, over-cap terms)
// ============================================================================

/**
 * Calculate seasonality uplift for a given month
 * 
 * Rules:
 * - Only applied to over-cap terms (term > referenceTerm)
 * - Only positive uplifts (negative seasonality ignored)
 * - Clamped to reasonable bounds (0.8..1.2)
 */
function seasonalityUplift(
  term: number,
  referenceTerm: number,
  endMonth: number, // 0-11
  config: PricingConfig
): number {
  if (!config.seasonalityEnabled) return 0;
  if (term <= referenceTerm) return 0; // Only over-cap terms
  
  const mult = config.seasonalityMultipliers[endMonth] || 1.0;
  const clamped = Math.min(1.2, Math.max(0.8, mult));
  const uplift = clamped - 1;
  
  // Only positive uplifts
  return uplift > 0 ? uplift : 0;
}

// ============================================================================
// STEP 6: DIRECTIONAL CAPS VS PRIOR APPROVED
// ============================================================================

/**
 * Apply directional cap to prevent excessive decreases
 * 
 * Rules:
 * - If decreasing, cap to maxWeeklyDec (e.g., 5% max decrease)
 * - If increasing, no cap
 */
function applyDirectionalCap(
  proposedRent: number,
  baseline: number,
  config: PricingConfig
): { capped: number; wasCapped: boolean; reason?: PriceReason } {
  const maxDec = config.maxWeeklyDec;
  const minAllowed = baseline * (1 - maxDec);
  
  if (proposedRent < minAllowed) {
    return {
      capped: minAllowed,
      wasCapped: true,
      reason: {
        type: 'cap',
        description: `Capped to max ${(maxDec * 100).toFixed(0)}% decrease (was $${Math.round(proposedRent)}, capped to $${Math.round(minAllowed)})`,
        value: minAllowed - proposedRent,
        applied: true,
      },
    };
  }
  
  return { capped: proposedRent, wasCapped: false };
}

// ============================================================================
// STEP 7: FLOOR ENFORCEMENT
// ============================================================================

/**
 * Enforce minimum rent floor
 * 
 * Rules:
 * - Never go below minFloorVsCurrentRent * current (e.g., 90% of current)
 * - Absolute minimum: $500
 */
function applyFloor(
  proposedRent: number,
  currentRent: number,
  config: PricingConfig
): { floored: number; wasFloored: boolean; reason?: PriceReason } {
  const minFloorPct = config.minFloorVsCurrentRent;
  const minFloor = Math.max(500, currentRent * minFloorPct);
  
  if (proposedRent < minFloor) {
    return {
      floored: minFloor,
      wasFloored: true,
      reason: {
        type: 'floor',
        description: `Floored to ${(minFloorPct * 100).toFixed(0)}% of current rent (was $${Math.round(proposedRent)}, floored to $${Math.round(minFloor)})`,
        value: minFloor - proposedRent,
        applied: true,
      },
    };
  }
  
  return { floored: proposedRent, wasFloored: false };
}

// ============================================================================
// STEP 8: TIER GAP ENFORCEMENT
// ============================================================================

/**
 * Enforce minimum gap to next lower tier
 * 
 * This is a floorplan-level calculation, not per-unit.
 * For now, we'll include it but note it needs floorplan context.
 */
function applyTierGap(
  proposedRent: number,
  floorplanCode: string,
  lowerTierMaxRent: number | null,
  config: PricingConfig
): { gapped: number; wasGapped: boolean; reason?: PriceReason } {
  if (lowerTierMaxRent === null) {
    return { gapped: proposedRent, wasGapped: false };
  }
  
  const minGap = config.minGapToNextTier[floorplanCode] || 0;
  const minRequired = lowerTierMaxRent + minGap;
  
  if (proposedRent < minRequired) {
    return {
      gapped: minRequired,
      wasGapped: true,
      reason: {
        type: 'tierGap',
        description: `Enforced ${Math.round(minGap)} min gap to lower tier (was $${Math.round(proposedRent)}, raised to $${Math.round(minRequired)})`,
        value: minRequired - proposedRent,
        applied: true,
      },
    };
  }
  
  return { gapped: proposedRent, wasGapped: false };
}

// ============================================================================
// VACANCY AGE DISCOUNT
// ============================================================================

/**
 * Calculate vacancy age discount for units vacant > threshold days
 */
function vacancyAgeDiscount(
  vacantDays: number,
  config: PricingConfig
): { discount: number; reason?: PriceReason } {
  if (!config.vacancyAgePricing.enabled) {
    return { discount: 0 };
  }
  
  const threshold = config.vacancyAgePricing.thresholdDays;
  if (vacantDays <= threshold) {
    return { discount: 0 };
  }
  
  const daysOver = vacantDays - threshold;
  const discountPct = Math.min(
    daysOver * config.vacancyAgePricing.discountPerDay,
    config.vacancyAgePricing.maxDiscount
  );
  
  return {
    discount: discountPct,
    reason: {
      type: 'vacancyAge',
      description: `Vacancy age discount ${(discountPct * 100).toFixed(1)}% (${vacantDays} days vacant)`,
      value: -discountPct,
      applied: true,
    },
  };
}

// ============================================================================
// MAIN ENGINE ENTRY POINT
// ============================================================================

/**
 * Price a single unit with full rule order
 * 
 * This is the main entry point for unit pricing.
 * 
 * @param unit - Unit state
 * @param config - Pricing configuration
 * @param context - Pricing context (trends, baselines, etc.)
 * @param lowerTierMaxRent - Max rent of next lower tier (for gap enforcement)
 * 
 * @returns Complete unit pricing result with reasons and flags
 */
export function priceUnit(
  unit: UnitState,
  config: PricingConfig,
  context: PricingContext,
  lowerTierMaxRent: number | null = null
): UnitPricingResult {
  const reasons: PriceReason[] = [];
  const flags: PriceFlags = {
    trendUp: false,
    trendDown: false,
    insideComfortBand: false,
    conversionNudgeUp: false,
    conversionNudgeDown: false,
    carryForwardUsed: false,
    shortTermPremium: false,
    overCapPremium: false,
    seasonalUplift: false,
    capClamped: false,
    floorClamped: false,
    tierGapEnforced: false,
    bufferGuardrail: false,
  };
  
  // Step 1: Trend move
  const trendResult = computeTrendMove(unit.floorplanCode, context, config);
  reasons.push(...trendResult.reasons);
  flags.trendUp = trendResult.direction > 0;
  flags.trendDown = trendResult.direction < 0;
  
  // Check if inside comfort band
  const fpTrend = context.floorplanTrends[unit.floorplanCode];
  const isInsideBand = fpTrend
    ? fpTrend.trending >= fpTrend.bandLow && fpTrend.trending <= fpTrend.bandHigh
    : false;
  flags.insideComfortBand = isInsideBand;
  
  // Step 2: Conversion nudge (only if inside band)
  const convResult = computeConversionNudge(unit.floorplanCode, isInsideBand, context);
  reasons.push(...convResult.reasons);
  flags.conversionNudgeUp = convResult.nudge > 0;
  flags.conversionNudgeDown = convResult.nudge < 0;
  
  // Step 3: Determine baseline
  const baselineResult = determineBaseline(unit, config, context);
  reasons.push(...baselineResult.reasons);
  flags.carryForwardUsed = baselineResult.source === 'carryForward';
  
  // Apply trend + conversion to baseline
  const combinedMove = trendResult.magnitude + convResult.nudge;
  let baselineRent = baselineResult.baseline * (1 + combinedMove);
  
  // Step 6: Apply directional cap
  const capResult = applyDirectionalCap(baselineRent, baselineResult.baseline, config);
  if (capResult.wasCapped && capResult.reason) {
    reasons.push(capResult.reason);
    flags.capClamped = true;
  }
  baselineRent = capResult.capped;
  
  // Step 7: Apply floor
  const floorInputRent = unit.currentRent || baselineResult.baseline;
  const floorResult = applyFloor(baselineRent, floorInputRent, config);
  if (floorResult.wasFloored && floorResult.reason) {
    reasons.push(floorResult.reason);
    flags.floorClamped = true;
  }
  baselineRent = floorResult.floored;
  
  // Step 8: Apply tier gap
  const gapResult = applyTierGap(baselineRent, unit.floorplanCode, lowerTierMaxRent, config);
  if (gapResult.wasGapped && gapResult.reason) {
    reasons.push(gapResult.reason);
    flags.tierGapEnforced = true;
  }
  baselineRent = gapResult.gapped;
  
  // Calculate vacancy age discount
  const vacDiscount = vacancyAgeDiscount(unit.vacantDays || 0, config);
  if (vacDiscount.reason) {
    reasons.push(vacDiscount.reason);
  }
  
  // Build term pricing
  const termPricing: TermPricing[] = [];
  const referenceTerm = config.referenceTerm;
  let referenceRent = 0;
  
  for (const term of config.availableTerms) {
    const termReasons: PriceReason[] = [];
    
    // Step 4: Short-term premium
    const shortPct = shortTermPremium(term);
    if (shortPct > 0) {
      flags.shortTermPremium = true;
      termReasons.push({
        type: 'shortTerm',
        description: `Short-term premium +${(shortPct * 100).toFixed(1)}%`,
        value: shortPct,
        applied: true,
      });
    }
    
    // Over-cap check
    const isOverCap = term > referenceTerm;
    flags.overCapPremium = flags.overCapPremium || isOverCap;
    
    // Step 5: Seasonality (only if over-cap and positive)
    const endDate = new Date(context.today);
    endDate.setMonth(endDate.getMonth() + term);
    const endMonth = endDate.getMonth();
    const seasPct = seasonalityUplift(term, referenceTerm, endMonth, config);
    if (seasPct > 0) {
      flags.seasonalUplift = true;
      termReasons.push({
        type: 'seasonality',
        description: `Seasonal uplift +${(seasPct * 100).toFixed(1)}%`,
        value: seasPct,
        applied: true,
      });
    }
    
    // Calculate final price
    let price = baselineRent * (1 + shortPct + seasPct - vacDiscount.discount);
    price = Math.max(0, Math.round(price));
    
    // Build notes
    const parts: string[] = [];
    if (shortPct !== 0) parts.push(`Short: +${(shortPct * 100).toFixed(1)}%`);
    if (seasPct !== 0) parts.push(`Seasonal: +${(seasPct * 100).toFixed(1)}%`);
    if (vacDiscount.discount !== 0) parts.push(`Vacancy: -${(vacDiscount.discount * 100).toFixed(1)}%`);
    
    const notes = parts.length > 0 ? parts.join(' + ') : 'Base price';
    
    termPricing.push({
      term,
      price,
      notes,
      reasons: termReasons,
    });
    
    if (term === referenceTerm) {
      referenceRent = price;
    }
  }
  
  // Calculate delta
  const previous = baselineResult.baseline;
  const proposed = referenceRent;
  const delta: PriceDelta = {
    previous,
    proposed,
    dollarChange: proposed - previous,
    percentChange: previous > 0 ? ((proposed - previous) / previous) * 100 : 0,
  };
  
  return {
    unitId: unit.unitId,
    floorplanCode: unit.floorplanCode,
    baselineRent,
    referenceTerm,
    referenceRent,
    delta,
    termPricing,
    reasons,
    flags,
    debug: {
      trendDirection: trendResult.direction,
      trendMagnitude: trendResult.magnitude,
      vacancyAgeDiscount: vacDiscount.discount,
    },
  };
}

/**
 * Price all units for a given floorplan
 * 
 * @param units - All units for this floorplan
 * @param config - Pricing configuration
 * @param context - Pricing context
 * @param lowerTierMaxRent - Max rent of next lower tier
 * 
 * @returns Array of unit pricing results
 */
export function priceFloorplan(
  units: UnitState[],
  config: PricingConfig,
  context: PricingContext,
  lowerTierMaxRent: number | null = null
): UnitPricingResult[] {
  return units.map(unit => priceUnit(unit, config, context, lowerTierMaxRent));
}

/**
 * Price all units across all floorplans
 * 
 * This is the top-level entry point for the pricing engine.
 * 
 * @param state - Complete engine state
 * 
 * @returns Complete pricing engine result
 */
export function priceAllUnits(state: PricingEngineState): PricingEngineResult {
  const { units, config, context } = state;
  
  // Group units by floorplan
  const unitsByFP: Record<string, UnitState[]> = {};
  for (const unit of units) {
    if (!unitsByFP[unit.floorplanCode]) {
      unitsByFP[unit.floorplanCode] = [];
    }
    unitsByFP[unit.floorplanCode].push(unit);
  }
  
  // Sort floorplans by bedroom count for tier gap enforcement
  const fpCodes = Object.keys(unitsByFP);
  const fpTrends = context.floorplanTrends;
  fpCodes.sort((a, b) => {
    const bedsA = fpTrends[a]?.bedrooms || 0;
    const bedsB = fpTrends[b]?.bedrooms || 0;
    return bedsA - bedsB;
  });
  
  // Price each floorplan
  const unitPricing: Record<string, UnitPricingResult> = {};
  const floorplanPricing: Record<string, FloorplanPricingResult> = {};
  
  for (let i = 0; i < fpCodes.length; i++) {
    const code = fpCodes[i];
    const fpUnits = unitsByFP[code];
    
    // Determine lower tier max rent
    let lowerTierMaxRent: number | null = null;
    if (i > 0) {
      const lowerCode = fpCodes[i - 1];
      const lowerResults = Object.values(unitPricing).filter(r => r.floorplanCode === lowerCode);
      if (lowerResults.length > 0) {
        lowerTierMaxRent = Math.max(...lowerResults.map(r => r.referenceRent));
      }
    }
    
    // Price all units for this floorplan
    const results = priceFloorplan(fpUnits, config, context, lowerTierMaxRent);
    
    // Store results
    for (const result of results) {
      unitPricing[result.unitId] = result;
    }
    
    // Build floorplan summary
    const fpTrend = fpTrends[code];
    const trendResult = computeTrendMove(code, context, config);
    
    floorplanPricing[code] = {
      code,
      name: fpTrend?.code || code,
      bedrooms: fpTrend?.bedrooms || 0,
      baselineRent: results.length > 0 ? results[0].baselineRent : 0,
      referenceTerm: config.referenceTerm,
      trending: fpTrend?.trending || 0,
      trendDirection: trendResult.direction,
      trendMagnitude: trendResult.magnitude,
      totalUnits: fpUnits.length,
      vacantUnits: fpUnits.filter(u => u.status.toLowerCase().includes('vacant')).length,
      onNoticeUnits: fpUnits.filter(u => u.status.toLowerCase().includes('notice')).length,
      termPricing: results.length > 0 ? results[0].termPricing : [],
      reasons: trendResult.reasons,
      flags: results.length > 0 ? results[0].flags : {} as PriceFlags,
    };
  }
  
  return {
    unitPricing,
    floorplanPricing,
    calculatedAt: new Date(),
    configSnapshot: config,
  };
}

