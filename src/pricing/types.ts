/**
 * TYPE DEFINITIONS FOR PRICING ENGINE
 *
 * Core types for the pure pricing calculation engine.
 * These types define inputs, outputs, and configuration for pricing calculations.
 */

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Unit state - current rent roll data for a single unit
 */
export interface UnitState {
  unitId: string;
  floorplanCode: string;
  floorplanLabel: string;
  status: string; // 'vacant', 'occupied', 'occupied (on-notice)', etc.
  currentRent: number;
  leaseEndDate?: string;
  preleaseStartDate?: string;
  vacantDays?: number;
  moveInDate?: string;
  amenityAdj?: number;
}

/**
 * Floorplan occupancy and trending metrics
 */
export interface FloorplanTrend {
  code: string;
  trending: number; // 0..1 (e.g., 0.86 = 86%)
  current: number; // 0..1
  bandLow: number; // e.g., 0.93 = 93%
  bandHigh: number; // e.g., 0.96 = 96%
  bedrooms: number;
}

/**
 * Community-level metrics
 */
export interface CommunityMetrics {
  trendingOccupancy: number; // 0..1
  currentOccupancy: number; // 0..1
  target: number; // 0..1 (e.g., 0.95 = 95%)
}

/**
 * Leads and applications data for conversion steering (inside comfort band)
 */
export interface LeadsAppsData {
  leads: number;
  apps: number;
  daysTracked: number;
}

/**
 * Carry-forward baseline from previous approved pricing
 */
export interface CarryForwardBaseline {
  unitId: string;
  floorplanCode: string;
  priorApprovedRent: number; // The rent that was approved in the previous run
  priorApprovedDate: string; // ISO date when it was approved
  term: number; // The term it was approved for (e.g., 14)
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Global pricing configuration
 */
export interface PricingConfig {
  // Price response style
  priceResponse: 'fast' | 'standard' | 'gentle'; // Determines maxMove (8%, 5%, 3%)

  // Comfort band thresholds (community-level)
  comfortTarget: number; // e.g., 0.95 = 95%
  bandLow?: number; // Optional override (defaults to 0.93)
  bandHigh?: number; // Optional override (defaults to 0.96)

  // Caps and floors
  maxWeeklyDec: number; // Max weekly decrease (e.g., 0.05 = 5%)
  minFloorVsCurrentRent: number; // Minimum floor vs current rent (e.g., 0.90 = 90%)

  // Tier gap enforcement
  minGapToNextTier: Record<string, number>; // { 'S0': 100, 'A1': 150, ... }
  stopDownBuffer: Record<string, number>; // { 'S0': 50, 'A1': 75, ... }

  // Reference term (anchor term for pricing calculations)
  referenceTerm: number; // e.g., 14

  // Available terms for new leases
  availableTerms: number[]; // e.g., [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

  // Vacancy age pricing
  vacancyAgePricing: {
    enabled: boolean;
    discountPerDay: number; // e.g., 0.002 = 0.2% per day
    maxDiscount: number; // e.g., 0.10 = 10% max
    thresholdDays: number; // e.g., 30 days
  };

  // Seasonality settings
  seasonalityEnabled: boolean;
  seasonalityMultipliers: number[]; // 12 months, e.g., [1.0, 1.0, 1.05, ...]

  // Future: Per-floorplan trend overrides for simulator mode
  trendOverridePctByFP?: Record<string, number>; // { 'S0': 0.02, 'A1': -0.03, ... }

  // Feature flags
  flags?: {
    enableSimulation?: boolean; // For future simulator mode
    enableCarryForward?: boolean; // Use prior approved rents as baselines
  };
}

/**
 * Context data needed for pricing calculations but not core config
 */
export interface PricingContext {
  // Floorplan trends
  floorplanTrends: Record<string, FloorplanTrend>;

  // Community-level metrics
  communityMetrics: CommunityMetrics;

  // Leads/apps data for conversion steering (optional)
  leadsAppsData?: Record<string, LeadsAppsData>;

  // Carry-forward baselines from previous run (optional)
  carryForwardBaselines?: Record<string, CarryForwardBaseline>;

  // Starting rents (fallback if no carry-forward)
  startingRents: Record<string, number>; // { 'S0': 1200, 'A1': 1400, ... }

  // Current date for calculations
  today: Date;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

/**
 * Price adjustment reason - explains why a price moved
 */
export interface PriceReason {
  type:
    | 'trend'
    | 'conversion'
    | 'carryForward'
    | 'shortTerm'
    | 'overCap'
    | 'seasonality'
    | 'vacancyAge'
    | 'cap'
    | 'floor'
    | 'tierGap';
  description: string; // Human-readable description
  value: number; // The percentage or dollar amount of adjustment
  applied: boolean; // Whether this adjustment was actually applied
}

/**
 * Price calculation flags - binary indicators for explainability
 */
export interface PriceFlags {
  trendUp: boolean; // Occupancy below target → increase rent
  trendDown: boolean; // Occupancy above target → decrease rent
  insideComfortBand: boolean; // Within comfort band (may apply conversion steering)
  conversionNudgeUp: boolean; // Strong conversion → nudge up
  conversionNudgeDown: boolean; // Weak conversion → nudge down
  carryForwardUsed: boolean; // Used prior approved rent as baseline
  shortTermPremium: boolean; // Applied short-term premium (2-9 months)
  overCapPremium: boolean; // Applied over-cap premium (term > reference)
  seasonalUplift: boolean; // Applied seasonal uplift (positive only)
  capClamped: boolean; // Capped to max decrease vs prior
  floorClamped: boolean; // Floored to minimum rent
  tierGapEnforced: boolean; // Enforced minimum gap to next lower tier
  bufferGuardrail: boolean; // Hit buffer guardrail (stop-down logic)
}

/**
 * Price delta - comparison between old and new pricing
 */
export interface PriceDelta {
  previous: number; // Previous rent (either current rent or carry-forward baseline)
  proposed: number; // New proposed rent
  dollarChange: number; // $ change
  percentChange: number; // % change
}

/**
 * Single term pricing result
 */
export interface TermPricing {
  term: number; // Lease term in months
  price: number; // Proposed rent for this term
  notes: string; // Human-readable notes explaining the price
  reasons: PriceReason[]; // Detailed reasons for each adjustment
}

/**
 * Complete unit pricing result
 */
export interface UnitPricingResult {
  unitId: string;
  floorplanCode: string;

  // Base pricing (reference term)
  baselineRent: number; // The baseline rent before term adjustments
  referenceTerm: number; // The reference term used (e.g., 14)
  referenceRent: number; // The rent at reference term

  // Deltas
  delta: PriceDelta;

  // All term pricing
  termPricing: TermPricing[];

  // Reasons and flags
  reasons: PriceReason[]; // Primary reasons for baseline calculation
  flags: PriceFlags; // Binary flags for explainability

  // Debug info (optional)
  debug?: {
    trendDirection: number; // -1, 0, +1
    trendMagnitude: number; // 0..maxMove
    conversionRatio?: number; // apps / leads
    vacancyAgeDiscount?: number; // Discount applied for vacancy age
  };
}

/**
 * Floorplan-level pricing summary
 */
export interface FloorplanPricingResult {
  code: string;
  name: string;
  bedrooms: number;

  // Baseline for this floorplan
  baselineRent: number; // The baseline rent at reference term
  referenceTerm: number;

  // Trend info
  trending: number; // 0..1
  trendDirection: number; // -1, 0, +1
  trendMagnitude: number; // e.g., 0.05 = 5%

  // Count of units
  totalUnits: number;
  vacantUnits: number;
  onNoticeUnits: number;

  // Term pricing for display
  termPricing: TermPricing[];

  // Reasons and flags
  reasons: PriceReason[];
  flags: PriceFlags;
}

// ============================================================================
// ENGINE STATE
// ============================================================================

/**
 * Complete pricing engine input state
 */
export interface PricingEngineState {
  units: UnitState[];
  config: PricingConfig;
  context: PricingContext;
}

/**
 * Complete pricing engine output
 */
export interface PricingEngineResult {
  // Per-unit pricing
  unitPricing: Record<string, UnitPricingResult>;

  // Per-floorplan summaries
  floorplanPricing: Record<string, FloorplanPricingResult>;

  // Metadata
  calculatedAt: Date;
  configSnapshot: PricingConfig;
}
