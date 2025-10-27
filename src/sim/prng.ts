/**
 * PSEUDORANDOM NUMBER GENERATOR (PRNG)
 *
 * Purpose: Deterministic, seeded random number generation for simulation
 *
 * Uses Linear Congruential Generator (LCG) for simplicity and determinism
 * Formula: next = (a * seed + c) mod m
 * Constants chosen for good statistical properties
 *
 * Features:
 * - Seeded for reproducibility
 * - Deterministic sequence (same seed = same sequence)
 * - Fast and lightweight
 * - Sufficient quality for simulation purposes
 */

export class PRNG {
  private seed: number;

  // LCG parameters (Park-Miller parameters)
  private readonly a = 16807; // Multiplier
  private readonly c = 0; // Increment
  private readonly m = 2147483647; // Modulus (2^31 - 1)

  /**
   * Create a new PRNG with a seed
   * @param seed - Initial seed value (0 to 2^31-1)
   */
  constructor(seed: number = 12345) {
    this.seed = seed % this.m;
  }

  /**
   * Get the next pseudorandom integer
   * @returns Random integer between 0 and 2^31-1
   */
  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed;
  }

  /**
   * Get a random number between 0 and 1 (exclusive)
   * @returns Random number in range [0, 1)
   */
  random(): number {
    return this.next() / this.m;
  }

  /**
   * Get a random integer in a range [min, max]
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @returns Random integer in range [min, max]
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Get a random element from an array
   * @param array - Array to choose from
   * @returns Random element
   */
  randomChoice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Get a random boolean value
   * @param probability - Probability of true (0 to 1, default 0.5)
   * @returns Random boolean
   */
  randomBoolean(probability: number = 0.5): boolean {
    return this.random() < probability;
  }

  /**
   * Get current seed (for debugging)
   * @returns Current seed value
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Reset to a new seed
   * @param seed - New seed value
   */
  reset(seed: number): void {
    this.seed = seed % this.m;
  }
}

/**
 * Create a new PRNG instance
 * @param seed - Initial seed value
 * @returns New PRNG instance
 */
export function createPRNG(seed: number = 12345): PRNG {
  return new PRNG(seed);
}

