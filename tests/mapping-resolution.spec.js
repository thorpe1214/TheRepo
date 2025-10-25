/**
 * Jest tests for mapping resolution functionality
 */

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window globals
global.window = {
  __seedPropertySetup: {
    property_id: 'thorpe-gardens',
    floorplans: [
      { code: 'S0', name: 'Studio' },
      { code: 'A1', name: '1x1' },
      { code: 'B2', name: '2x2' },
    ],
  },
  __seedFPMap: {
    Studio: 'S0',
    '1x1 A': 'A1',
    'Two Bedroom B': 'B2',
  },
};

// Import the function to test
import { resolveMappingFromSeedsOrProfile } from '../src/js/pricing-helpers.js';

describe('Mapping Resolution', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  test('resolveMappingFromSeedsOrProfile returns correct structure', () => {
    const csvData = {
      headers: ['UnitID', 'Floorplan', 'Status'],
      rows: [
        { UnitID: '101', Floorplan: 'Studio', Status: 'Vacant' },
        { UnitID: '102', Floorplan: '1x1 A', Status: 'Occupied' },
      ],
    };

    const mapping = {
      UnitID: 'UnitID',
      Floorplan: 'Floorplan',
      Status: 'Status',
    };

    // Mock empty saved map (should use seeds)
    localStorageMock.getItem.mockReturnValue('{}');

    const result = resolveMappingFromSeedsOrProfile(csvData, mapping);

    expect(result).toHaveProperty('mapping');
    expect(result).toHaveProperty('source');
    expect(result).toHaveProperty('allMapped');
    expect(result).toHaveProperty('unmappedLabels');
    expect(result).toHaveProperty('floorplanLabels');

    expect(result.mapping).toEqual(mapping);
    expect(result.source).toBe('seeds');
    expect(result.allMapped).toBe(true);
    expect(result.floorplanLabels).toEqual(['Studio', '1x1 A']);
    expect(result.unmappedLabels).toEqual([]);
  });

  test('resolveMappingFromSeedsOrProfile detects unmapped labels', () => {
    const csvData = {
      headers: ['UnitID', 'Floorplan', 'Status'],
      rows: [
        { UnitID: '101', Floorplan: 'Unknown Floorplan', Status: 'Vacant' },
        { UnitID: '102', Floorplan: 'Another Unknown', Status: 'Occupied' },
      ],
    };

    const mapping = {
      UnitID: 'UnitID',
      Floorplan: 'Floorplan',
      Status: 'Status',
    };

    // Mock empty saved map (should use seeds)
    localStorageMock.getItem.mockReturnValue('{}');

    const result = resolveMappingFromSeedsOrProfile(csvData, mapping);

    expect(result.allMapped).toBe(false);
    expect(result.unmappedLabels).toEqual(['Unknown Floorplan', 'Another Unknown']);
    expect(result.floorplanLabels).toEqual(['Unknown Floorplan', 'Another Unknown']);
  });

  test('resolveMappingFromSeedsOrProfile uses saved mapping when available', () => {
    const csvData = {
      headers: ['UnitID', 'Floorplan', 'Status'],
      rows: [{ UnitID: '101', Floorplan: 'Studio', Status: 'Vacant' }],
    };

    const mapping = {
      UnitID: 'UnitID',
      Floorplan: 'Floorplan',
      Status: 'Status',
    };

    // Mock saved map
    const savedMap = {
      Studio: 'S0',
      'Custom Floorplan': 'A1',
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedMap));

    const result = resolveMappingFromSeedsOrProfile(csvData, mapping);

    expect(result.source).toBe('profile');
    expect(result.allMapped).toBe(true);
  });

  test('resolveMappingFromSeedsOrProfile handles missing floorplan column', () => {
    const csvData = {
      headers: ['UnitID', 'Status'],
      rows: [{ UnitID: '101', Status: 'Vacant' }],
    };

    const mapping = {
      UnitID: 'UnitID',
      Status: 'Status',
    };

    localStorageMock.getItem.mockReturnValue('{}');

    const result = resolveMappingFromSeedsOrProfile(csvData, mapping);

    expect(result.source).toBe('auto');
    expect(result.allMapped).toBe(true);
    expect(result.floorplanLabels).toEqual([]);
    expect(result.unmappedLabels).toEqual([]);
  });

  test('resolveMappingFromSeedsOrProfile handles errors gracefully', () => {
    const csvData = null; // Invalid data
    const mapping = {};

    // Mock localStorage error
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const result = resolveMappingFromSeedsOrProfile(csvData, mapping);

    expect(result.source).toBe('auto');
    expect(result.allMapped).toBe(false);
  });
});
