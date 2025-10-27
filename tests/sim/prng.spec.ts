/**
 * PRNG TESTS
 *
 * Purpose: Verify deterministic, seeded random number generation
 */

import { describe, test, expect } from '@jest/globals';
import { PRNG, createPRNG } from '../../src/sim/prng';

export {};

describe('PRNG', () => {
  test('should create PRNG with default seed', () => {
    const prng = createPRNG();
    expect(prng).toBeDefined();
  });

  test('should create PRNG with custom seed', () => {
    const prng = createPRNG(42);
    expect(prng.getSeed()).toBe(42);
  });

  test('should be deterministic with same seed', () => {
    const prng1 = createPRNG(12345);
    const prng2 = createPRNG(12345);
    
    const seq1 = Array(10).fill(0).map(() => prng1.random());
    const seq2 = Array(10).fill(0).map(() => prng2.random());
    
    expect(seq1).toEqual(seq2);
  });

  test('should produce different sequences with different seeds', () => {
    const prng1 = createPRNG(12345);
    const prng2 = createPRNG(67890);
    
    const seq1 = Array(10).fill(0).map(() => prng1.random());
    const seq2 = Array(10).fill(0).map(() => prng2.random());
    
    expect(seq1).not.toEqual(seq2);
  });

  test('random() should return values between 0 and 1', () => {
    const prng = createPRNG();
    
    for (let i = 0; i < 100; i++) {
      const value = prng.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test('randomInt() should return integers in range', () => {
    const prng = createPRNG();
    
    for (let i = 0; i < 100; i++) {
      const value = prng.randomInt(5, 10);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(10);
    }
  });

  test('randomChoice() should return element from array', () => {
    const prng = createPRNG();
    const array = ['a', 'b', 'c', 'd'];
    
    for (let i = 0; i < 10; i++) {
      const value = prng.randomChoice(array);
      expect(array).toContain(value);
    }
  });

  test('randomBoolean() should return booleans', () => {
    const prng = createPRNG();
    
    for (let i = 0; i < 100; i++) {
      const value = prng.randomBoolean();
      expect(typeof value).toBe('boolean');
    }
  });

  test('randomBoolean() should respect probability', () => {
    const prng = createPRNG();
    const results = Array(1000).fill(0).map(() => prng.randomBoolean(0.3));
    const trueCount = results.filter(b => b).length;
    
    // Should be roughly 30% true (within 10% tolerance)
    expect(trueCount).toBeGreaterThan(200);
    expect(trueCount).toBeLessThan(400);
  });

  test('should handle seed wrapping', () => {
    const prng = new PRNG(2147483647);
    expect(() => prng.next()).not.toThrow();
  });

  test('reset() should change seed', () => {
    const prng = createPRNG(12345);
    const seq1 = Array(5).fill(0).map(() => prng.random());
    
    prng.reset(67890);
    const seq2 = Array(5).fill(0).map(() => prng.random());
    
    // Should be different
    expect(seq1).not.toEqual(seq2);
    
    // Should be deterministic after reset
    prng.reset(67890);
    const seq3 = Array(5).fill(0).map(() => prng.random());
    
    expect(seq2).toEqual(seq3);
  });
});

