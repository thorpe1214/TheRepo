/**
 * Module Boundary Tests
 * 
 * These tests verify that modules respect architectural boundaries.
 * No pricing logic is tested here - only that modules don't cross boundaries.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Module Boundaries', () => {
  const srcDir = path.resolve(__dirname, '../src/js');

  const readModule = (filename: string): string => {
    const filePath = path.join(srcDir, filename);
    return fs.readFileSync(filePath, 'utf-8');
  };

  describe('pricing-unit.js', () => {
    it('should not directly call floorplan rendering functions', () => {
      const content = readModule('pricing-unit.js');
      
      // Should not call renderNewLease (FP rendering function)
      expect(content).not.toMatch(/renderNewLease\s*\(/);
      
      // Should not directly manipulate FP DOM
      expect(content).not.toMatch(/getElementById\s*\(\s*['"]fpPricingSection/);
    });

    it('should not import/require floorplan modules', () => {
      const content = readModule('pricing-unit.js');
      
      expect(content).not.toMatch(/require\s*\(\s*['"].*pricing-fp/);
      expect(content).not.toMatch(/import\s+.*from\s+['"].*pricing-fp/);
    });
  });

  describe('pricing-fp.js', () => {
    it('should not directly call unit rendering functions', () => {
      const content = readModule('pricing-fp.js');
      
      // Should not call renderUnitPricingSection
      expect(content).not.toMatch(/renderUnitPricingSection\s*\(/);
      expect(content).not.toMatch(/__renderUnitPricingSection\s*\(/);
      
      // Should not directly manipulate unit DOM
      expect(content).not.toMatch(/getElementById\s*\(\s*['"]unitPricingSection/);
    });

    it('should not import/require unit modules', () => {
      const content = readModule('pricing-fp.js');
      
      expect(content).not.toMatch(/require\s*\(\s*['"].*pricing-unit/);
      expect(content).not.toMatch(/import\s+.*from\s+['"].*pricing-unit/);
    });
  });

  describe('pricing-helpers.js', () => {
    it('should not access DOM directly', () => {
      const content = readModule('pricing-helpers.js');
      
      // Helpers should be pure functions, no DOM access
      expect(content).not.toMatch(/getElementById/);
      expect(content).not.toMatch(/querySelector/);
      expect(content).not.toMatch(/document\./);
      
      // Exception: May need window for global access, but not for DOM
      // This is OK: window.someGlobal
      // This is NOT OK: document.getElementById
    });

    it('should not call pricing-specific rendering', () => {
      const content = readModule('pricing-helpers.js');
      
      expect(content).not.toMatch(/renderNewLease/);
      expect(content).not.toMatch(/renderUnitPricingSection/);
    });
  });

  describe('app-boot.js', () => {
    it('should coordinate but not contain pricing logic', () => {
      const content = readModule('app-boot.js');
      
      // Should not have inline pricing calculations
      // (Simple check: shouldn't have complex pricing math)
      const hasPricingCalc = /baseline\s*=.*\*\s*\(1\s*[+-]/.test(content) ||
                            /referenceBase\s*=.*comfort/.test(content) ||
                            /tierGap\s*=.*buffer/.test(content);
      
      expect(hasPricingCalc).toBe(false);
    });
  });

  describe('Cross-Module Dependencies', () => {
    it('helpers should not depend on any other module', () => {
      const content = readModule('pricing-helpers.js');
      
      // No imports/requires from other local modules
      expect(content).not.toMatch(/require\s*\(\s*['"]\.\/pricing-/);
      expect(content).not.toMatch(/import\s+.*from\s+['"]\.\/pricing-/);
      expect(content).not.toMatch(/require\s*\(\s*['"]\.\/app-boot/);
      expect(content).not.toMatch(/import\s+.*from\s+['"]\.\/app-boot/);
    });

    it('modules should only reference each other through window globals', () => {
      const unitContent = readModule('pricing-unit.js');
      const fpContent = readModule('pricing-fp.js');
      
      // Unit and FP should not directly import each other
      expect(unitContent).not.toMatch(/require\s*\(\s*['"].*pricing-fp/);
      expect(fpContent).not.toMatch(/require\s*\(\s*['"].*pricing-unit/);
      
      // They can access each other via window globals (that's the architecture)
      // But they shouldn't call each other's rendering functions
    });
  });

  describe('Development Guards', () => {
    it('pricing-unit should have boundary guard checks', () => {
      const content = readModule('pricing-unit.js');
      
      // Should have dev guard assertions
      expect(content).toMatch(/__RM_DEV_GUARDS/);
    });

    it('pricing-fp should have boundary guard checks', () => {
      const content = readModule('pricing-fp.js');
      
      // Should have dev guard assertions
      expect(content).toMatch(/__RM_DEV_GUARDS/);
    });
  });
});

