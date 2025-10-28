/**
 * FEATURE FLAGS
 *
 * Central configuration for enabling/disabling features.
 * Flags are OFF by default for production safety.
 */

export interface FeatureFlags {
  /** Enable simulator mode (fake property data) */
  enableSimulation: boolean;
  
  /** Enable trend override sliders per floorplan */
  enableTrendOverrides: boolean;
  
  /** Enable deterministic mode (seed-based) for reproducible results */
  enableDeterminism: boolean;
}

/**
 * Default flags (all features OFF)
 */
export const DEFAULT_FLAGS: FeatureFlags = {
  enableSimulation: false,
  enableTrendOverrides: false,
  enableDeterminism: true, // ON by default for reproducibility
};

/**
 * Get current feature flags from environment or defaults
 */
export function getFeatureFlags(): FeatureFlags {
  // Check environment variables if in Node
  if (typeof process !== 'undefined' && process.env) {
    return {
      enableSimulation: process.env.ENABLE_SIMULATION === 'true',
      enableTrendOverrides: process.env.ENABLE_TREND_OVERRIDES === 'true',
      enableDeterminism: process.env.ENABLE_DETERMINISM !== 'false',
    };
  }
  
  // In browser, check localStorage or defaults
  try {
    const stored = localStorage.getItem('rm:feature_flags');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_FLAGS, ...parsed };
    }
  } catch (e) {
    console.warn('[RM] Could not load feature flags from localStorage', e);
  }
  
  return DEFAULT_FLAGS;
}

/**
 * Set feature flags (browser only)
 */
export function setFeatureFlags(flags: Partial<FeatureFlags>): void {
  try {
    localStorage.setItem('rm:feature_flags', JSON.stringify(flags));
  } catch (e) {
    console.warn('[RM] Could not save feature flags to localStorage', e);
  }
}

