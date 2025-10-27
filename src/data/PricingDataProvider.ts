/**
 * PRICING DATA PROVIDER INTERFACE
 *
 * Purpose: Abstract data access for pricing engine.
 *
 * This interface allows the pricing engine to work with different data sources:
 * - RealDataProvider: Uses actual rent roll uploads and user input
 * - SimulatorDataProvider: Uses simulated/projected data (future)
 * - TestDataProvider: Uses fixture data for testing
 *
 * The provider is responsible for:
 * 1. Loading unit data from rent roll
 * 2. Computing occupancy trends and metrics
 * 3. Fetching leads/apps data for conversion steering
 * 4. Loading carry-forward baselines from previous runs
 * 5. Loading starting rents and floorplan setup
 */

import type {
  UnitState,
  FloorplanTrend,
  CommunityMetrics,
  CarryForwardBaseline,
} from '../pricing/types';

/**
 * Box score data - trending occupancy and metrics
 */
export interface BoxScoreData {
  // Per-floorplan trends
  floorplanTrends: Record<string, FloorplanTrend>;

  // Community-level metrics
  communityMetrics: CommunityMetrics;

  // Timestamp
  calculatedAt: Date;
}

/**
 * Leads and applications data for conversion steering
 */
export interface LeadsAppsData {
  leads: number;
  apps: number;
  daysTracked: number;
}

/**
 * Pricing data provider interface
 *
 * All data providers must implement this interface.
 */
export interface PricingDataProvider {
  /**
   * Get all units from rent roll
   *
   * @returns Array of unit state objects
   */
  getUnits(): Promise<UnitState[]>;

  /**
   * Get box score data (trending occupancy and metrics)
   *
   * @returns Box score data with floorplan trends and community metrics
   */
  getBoxScore(): Promise<BoxScoreData>;

  /**
   * Get leads and applications data for a floorplan
   *
   * @param floorplanCode - Floorplan code (e.g., 'S0', 'A1')
   * @param days - Number of days to track (e.g., 30)
   * @returns Leads and apps data, or null if not available
   */
  getLeadsApps(floorplanCode: string, days: number): Promise<LeadsAppsData | null>;

  /**
   * Get carry-forward baselines from previous pricing run
   *
   * @returns Record of unit ID to carry-forward baseline
   */
  getCarryForwardBaselines(): Promise<Record<string, CarryForwardBaseline>>;

  /**
   * Get starting rents for each floorplan (fallback pricing)
   *
   * @returns Record of floorplan code to starting rent
   */
  getStartingRents(): Promise<Record<string, number>>;

  /**
   * Get floorplan setup data (codes, names, bedrooms, etc.)
   *
   * @returns Array of floorplan setup objects
   */
  getFloorplanSetup(): Promise<
    Array<{
      code: string;
      name: string;
      bedrooms: number;
      units: number;
    }>
  >;

  /**
   * Check if provider is ready to serve data
   *
   * @returns True if data is loaded and ready
   */
  isReady(): boolean;

  /**
   * Get provider type (for debugging and logging)
   *
   * @returns Provider type string
   */
  getProviderType(): 'real' | 'simulator' | 'test';
}

/**
 * Provider selector - chooses between real and simulator providers
 *
 * This function will be used to select the appropriate provider based on flags.
 * For now, it always returns the real provider.
 *
 * @param enableSimulation - Whether to use simulator mode
 * @param realProvider - Real data provider instance
 * @param simProvider - Simulator provider instance (optional, for future use)
 *
 * @returns The selected provider
 */
export function selectProvider(
  enableSimulation: boolean,
  realProvider: PricingDataProvider,
  simProvider?: PricingDataProvider
): PricingDataProvider {
  if (enableSimulation && simProvider) {
    console.log('[Provider] Using simulator provider');
    return simProvider;
  }

  console.log('[Provider] Using real data provider');
  return realProvider;
}
