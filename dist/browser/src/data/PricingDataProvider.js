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
export function selectProvider(enableSimulation, realProvider, simProvider) {
    if (enableSimulation && simProvider) {
        console.log('[Provider] Using simulator provider');
        return simProvider;
    }
    console.log('[Provider] Using real data provider');
    return realProvider;
}
