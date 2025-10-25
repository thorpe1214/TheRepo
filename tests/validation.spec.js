/**
 * Unit tests for validation.js functions
 * Tests strict mapping validation logic
 */

const {
  normalizeHeaders,
  compareProfile,
  compareCatalog,
  validateStrictMapping,
  formatValidationError
} = require('../src/js/validation.js');

describe('Validation Functions', () => {
  
  describe('normalizeHeaders', () => {
    test('should normalize headers correctly', () => {
      const headers = ['Unit ID', 'Floorplan', 'Current Rent', 'Status'];
      const normalized = normalizeHeaders(headers);
      expect(normalized).toEqual(['unit id', 'floorplan', 'current rent', 'status']);
    });

    test('should handle empty headers', () => {
      const headers = [];
      const normalized = normalizeHeaders(headers);
      expect(normalized).toEqual([]);
    });

    test('should trim whitespace', () => {
      const headers = ['  Unit ID  ', ' Floorplan ', 'Current Rent'];
      const normalized = normalizeHeaders(headers);
      expect(normalized).toEqual(['unit id', 'floorplan', 'current rent']);
    });

    test('should throw error for non-array input', () => {
      expect(() => normalizeHeaders('not an array')).toThrow('Headers must be an array');
    });

    test('should throw error for non-string header', () => {
      expect(() => normalizeHeaders([123, 'valid'])).toThrow('Invalid header type: number. Expected string.');
    });
  });

  describe('compareProfile', () => {
    const mockProfile = {
      headers: ['unit', 'floorplan', 'status', 'current rent'],
      mapping: {},
      floorplanCatalog: ['S0', 'A1', 'B2']
    };

    test('should validate matching headers', () => {
      const csvHeaders = ['Unit', 'Floorplan', 'Status', 'Current Rent'];
      const result = compareProfile(csvHeaders, mockProfile);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.missing).toEqual([]);
      expect(result.extra).toEqual([]);
    });

    test('should detect missing headers', () => {
      const csvHeaders = ['Unit', 'Floorplan']; // Missing Status, Current Rent
      const result = compareProfile(csvHeaders, mockProfile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Header mismatch detected');
      expect(result.missing).toEqual(['status', 'current rent']);
      expect(result.extra).toEqual([]);
    });

    test('should detect extra headers', () => {
      const csvHeaders = ['Unit', 'Floorplan', 'Status', 'Current Rent', 'Extra Column'];
      const result = compareProfile(csvHeaders, mockProfile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Header mismatch detected');
      expect(result.missing).toEqual([]);
      expect(result.extra).toEqual(['extra column']);
    });

    test('should handle missing profile', () => {
      const csvHeaders = ['Unit', 'Floorplan'];
      const result = compareProfile(csvHeaders, null);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No saved profile found. Please capture a profile first.');
      expect(result.expected).toEqual([]);
      expect(result.got).toEqual(csvHeaders);
    });

    test('should provide detailed comparison info', () => {
      const csvHeaders = ['Unit', 'Floorplan', 'Extra'];
      const result = compareProfile(csvHeaders, mockProfile);
      
      expect(result.details).toEqual({
        missingCount: 2,
        extraCount: 1,
        totalExpected: 4,
        totalGot: 3
      });
    });
  });

  describe('compareCatalog', () => {
    const mockProfile = {
      floorplanCatalog: ['S0', 'A1', 'B2']
    };

    test('should validate matching floorplan catalog', () => {
      const csvFloorplans = ['S0', 'A1', 'B2'];
      const result = compareCatalog(csvFloorplans, mockProfile);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.missing).toEqual([]);
      expect(result.extra).toEqual([]);
    });

    test('should detect missing floorplans', () => {
      const csvFloorplans = ['S0', 'A1']; // Missing B2
      const result = compareCatalog(csvFloorplans, mockProfile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Floorplan catalog mismatch detected');
      expect(result.missing).toEqual(['b2']);
      expect(result.extra).toEqual([]);
    });

    test('should detect extra floorplans', () => {
      const csvFloorplans = ['S0', 'A1', 'B2', 'C3'];
      const result = compareCatalog(csvFloorplans, mockProfile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Floorplan catalog mismatch detected');
      expect(result.missing).toEqual([]);
      expect(result.extra).toEqual(['c3']);
    });

    test('should handle missing profile gracefully', () => {
      const csvFloorplans = ['S0', 'A1'];
      const result = compareCatalog(csvFloorplans, null);
      
      expect(result.valid).toBe(true); // Optional validation
      expect(result.error).toBeNull();
    });

    test('should normalize floorplan codes', () => {
      const csvFloorplans = ['s0', 'A1', 'b2']; // Mixed case
      const result = compareCatalog(csvFloorplans, mockProfile);
      
      expect(result.valid).toBe(true);
      expect(result.got).toEqual(['s0', 'a1', 'b2']);
    });
  });

  describe('validateStrictMapping', () => {
    const mockProfile = {
      headers: ['unit', 'floorplan', 'status', 'current rent'],
      floorplanCatalog: ['S0', 'A1', 'B2']
    };

    const mockCsvData = {
      headers: ['Unit', 'Floorplan', 'Status', 'Current Rent'],
      rows: [
        { Unit: 'A101', Floorplan: 'S0', Status: 'Occupied', 'Current Rent': '1200' },
        { Unit: 'A102', Floorplan: 'S0', Status: 'Vacant', 'Current Rent': '1200' }
      ]
    };

    test('should validate successfully with matching data', () => {
      const result = validateStrictMapping(mockCsvData, mockProfile, {
        strictMode: true,
        lockCatalog: false,
        allowExtraColumns: true
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test('should return valid when strict mode is disabled', () => {
      const result = validateStrictMapping(mockCsvData, mockProfile, {
        strictMode: false
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    test('should detect header mismatches', () => {
      const badCsvData = {
        headers: ['Unit', 'Floorplan'], // Missing required headers
        rows: []
      };

      const result = validateStrictMapping(badCsvData, mockProfile, {
        strictMode: true,
        lockCatalog: false,
        allowExtraColumns: true
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Missing required columns');
    });

    test('should validate floorplan catalog when locked', () => {
      const badCsvData = {
        headers: ['Unit', 'Floorplan', 'Status', 'Current Rent'],
        rows: [
          { Unit: 'A101', Floorplan: 'S0', Status: 'Occupied', 'Current Rent': '1200' },
          { Unit: 'A102', Floorplan: 'C3', Status: 'Vacant', 'Current Rent': '1200' } // C3 not in catalog
        ]
      };

      const result = validateStrictMapping(badCsvData, mockProfile, {
        strictMode: true,
        lockCatalog: true,
        allowExtraColumns: true
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Unexpected floorplans'))).toBe(true);
    });

    test('should handle validation errors gracefully', () => {
      const result = validateStrictMapping(null, mockProfile, {
        strictMode: true
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Validation error');
    });
  });

  describe('formatValidationError', () => {
    test('should format validation errors correctly', () => {
      const validationResult = {
        valid: false,
        errors: ['Missing required columns: status, current rent'],
        warnings: ['Extra columns detected: extra column']
      };

      const formatted = formatValidationError(validationResult);
      
      expect(formatted).toContain('❌ Validation Errors:');
      expect(formatted).toContain('• Missing required columns: status, current rent');
      expect(formatted).toContain('⚠️ Warnings:');
      expect(formatted).toContain('• Extra columns detected: extra column');
    });

    test('should return empty string for valid result', () => {
      const validationResult = {
        valid: true,
        errors: [],
        warnings: []
      };

      const formatted = formatValidationError(validationResult);
      expect(formatted).toBe('');
    });

    test('should handle errors only', () => {
      const validationResult = {
        valid: false,
        errors: ['Missing required columns: status'],
        warnings: []
      };

      const formatted = formatValidationError(validationResult);
      
      expect(formatted).toContain('❌ Validation Errors:');
      expect(formatted).toContain('• Missing required columns: status');
      expect(formatted).not.toContain('⚠️ Warnings:');
    });

    test('should handle warnings only', () => {
      const validationResult = {
        valid: true,
        errors: [],
        warnings: ['Extra columns detected: extra column']
      };

      const formatted = formatValidationError(validationResult);
      
      expect(formatted).toContain('⚠️ Warnings:');
      expect(formatted).toContain('• Extra columns detected: extra column');
      expect(formatted).not.toContain('❌ Validation Errors:');
    });
  });
});

