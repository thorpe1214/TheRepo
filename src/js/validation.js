/**
 * Validation utilities for strict mapping mode
 * Professional SaaS-grade validation with comprehensive error reporting
 */

/**
 * Normalize CSV headers for consistent comparison
 * @param {string[]} headers - Raw CSV headers
 * @returns {string[]} Normalized headers (trimmed, lowercase)
 */
function normalizeHeaders(headers) {
  if (!Array.isArray(headers)) {
    throw new Error('Headers must be an array');
  }

  return headers.map(header => {
    if (typeof header !== 'string') {
      throw new Error(`Invalid header type: ${typeof header}. Expected string.`);
    }
    return header.trim().toLowerCase();
  });
}

/**
 * Compare CSV headers against saved profile
 * @param {string[]} csvHeaders - Current CSV headers
 * @param {Object} profile - Saved rent roll profile
 * @returns {Object} Comparison result with detailed error info
 */
function compareProfile(csvHeaders, profile) {
  if (!profile || !profile.headers) {
    return {
      valid: false,
      error: 'No saved profile found. Please capture a profile first.',
      expected: [],
      got: csvHeaders,
      missing: csvHeaders,
      extra: [],
    };
  }

  const normalizedCsv = normalizeHeaders(csvHeaders);
  const expectedHeaders = normalizeHeaders(profile.headers);

  const csvSet = new Set(normalizedCsv);
  const expectedSet = new Set(expectedHeaders);

  const missing = expectedHeaders.filter(h => !csvSet.has(h));
  const extra = normalizedCsv.filter(h => !expectedSet.has(h));

  const valid = missing.length === 0 && extra.length === 0;

  return {
    valid,
    error: valid ? null : `Header mismatch detected`,
    expected: expectedHeaders,
    got: normalizedCsv,
    missing,
    extra,
    details: {
      missingCount: missing.length,
      extraCount: extra.length,
      totalExpected: expectedHeaders.length,
      totalGot: normalizedCsv.length,
    },
  };
}

/**
 * Compare floorplan catalog against saved profile
 * @param {string[]} csvFloorplans - Floorplan codes from CSV
 * @param {Object} profile - Saved rent roll profile
 * @returns {Object} Comparison result
 */
function compareCatalog(csvFloorplans, profile) {
  if (!profile || !profile.floorplanCatalog) {
    return {
      valid: true, // Optional validation
      error: null,
      expected: [],
      got: csvFloorplans,
      missing: [],
      extra: [],
    };
  }

  const csvSet = new Set(csvFloorplans.map(fp => String(fp).trim().toLowerCase()));
  const expectedSet = new Set(profile.floorplanCatalog.map(fp => String(fp).trim().toLowerCase()));

  const missing = Array.from(expectedSet).filter(fp => !csvSet.has(fp));
  const extra = Array.from(csvSet).filter(fp => !expectedSet.has(fp));

  const valid = missing.length === 0 && extra.length === 0;

  return {
    valid,
    error: valid ? null : `Floorplan catalog mismatch detected`,
    expected: Array.from(expectedSet),
    got: Array.from(csvSet),
    missing,
    extra,
    details: {
      missingCount: missing.length,
      extraCount: extra.length,
      totalExpected: expectedSet.size,
      totalGot: csvSet.size,
    },
  };
}

/**
 * Validate CSV data against strict mapping requirements
 * @param {Object} csvData - Parsed CSV data
 * @param {Object} profile - Saved rent roll profile
 * @param {Object} options - Validation options
 * @returns {Object} Comprehensive validation result
 */
function validateStrictMapping(csvData, profile, options = {}) {
  const { strictMode = true, lockCatalog = false, allowExtraColumns = true } = options;

  if (!strictMode) {
    return { valid: true, warnings: [], errors: [] };
  }

  const errors = [];
  const warnings = [];

  try {
    // Validate headers
    const headerResult = compareProfile(csvData.headers, profile);
    if (!headerResult.valid) {
      if (headerResult.missing.length > 0) {
        errors.push(`Missing required columns: ${headerResult.missing.join(', ')}`);
      }
      if (headerResult.extra.length > 0 && !allowExtraColumns) {
        errors.push(`Unexpected columns: ${headerResult.extra.join(', ')}`);
      } else if (headerResult.extra.length > 0) {
        warnings.push(`Extra columns detected: ${headerResult.extra.join(', ')}`);
      }
    }

    // Validate floorplan catalog if locked
    if (lockCatalog && profile.floorplanCatalog) {
      const floorplans =
        csvData.rows?.map(row => row.Floorplan || row.floorplan).filter(Boolean) || [];
      const catalogResult = compareCatalog(floorplans, profile);
      if (!catalogResult.valid) {
        if (catalogResult.missing.length > 0) {
          errors.push(`Missing floorplans: ${catalogResult.missing.join(', ')}`);
        }
        if (catalogResult.extra.length > 0) {
          errors.push(`Unexpected floorplans: ${catalogResult.extra.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        headerResult,
        catalogResult: lockCatalog ? compareCatalog([], profile) : null,
        strictMode,
        lockCatalog,
        allowExtraColumns,
      },
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${error.message}`],
      warnings: [],
      details: { error: error.message },
    };
  }
}

/**
 * Generate user-friendly error message for validation failures
 * @param {Object} validationResult - Result from validateStrictMapping
 * @returns {string} Formatted error message
 */
function formatValidationError(validationResult) {
  if (validationResult.valid && validationResult.warnings.length === 0) {
    return '';
  }

  const parts = [];

  if (validationResult.errors.length > 0) {
    parts.push('❌ Validation Errors:');
    validationResult.errors.forEach(error => {
      parts.push(`  • ${error}`);
    });
  }

  if (validationResult.warnings.length > 0) {
    parts.push('⚠️ Warnings:');
    validationResult.warnings.forEach(warning => {
      parts.push(`  • ${warning}`);
    });
  }

  return parts.join('\n');
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeHeaders,
    compareProfile,
    compareCatalog,
    validateStrictMapping,
    formatValidationError,
  };
}

// Expose to window for browser usage
if (typeof window !== 'undefined') {
  window.RMValidation = {
    normalizeHeaders,
    compareProfile,
    compareCatalog,
    validateStrictMapping,
    formatValidationError,
  };
}
