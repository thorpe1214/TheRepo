# Data Schemas

This directory contains JSON Schema definitions for the core data structures used in the Revenue Management System.

## Purpose

- **Document data formats**: Clear specification of expected structure
- **Validation**: Automated validation of data in tests and development
- **Contract**: Enforce consistency between modules and data sources

## Schemas

### `mappedRows.schema.json`
**Purpose**: Defines the structure of rent roll data after CSV upload and column mapping.

**Used by**:
- CSV upload and mapping logic
- Unit pricing calculations
- Renewal pricing calculations

**Key fields**:
- `unit`: Unit identifier
- `floorplan_code`: Floorplan code with display name
- `status`: Occupancy status (vacant, occupied, on-notice, preleased)
- `current_rent`: Current monthly rent
- `amenity_adj`: Unit-level amenity adjustment

**Source**: Created from `window.mappedRows` after CSV confirmation

---

### `fpResults.schema.json`
**Purpose**: Defines the structure of calculated floorplan baseline pricing by term.

**Used by**:
- Floorplan pricing rendering
- Unit pricing baseline lookups
- Pricing comparison and deltas

**Key fields**:
- `code`: Short floorplan code (e.g., 'S0', 'A1')
- `baseRent`: Base rent anchor
- `referenceBase`: Reference base after comfort adjustments
- `referenceTerm`: Reference term (typically 12 months)
- `terms[]`: Array of pricing by term length
- `guardrails`: Applied constraints (min/max, tier gaps)
- `comfort`: Comfort band adjustments
- `counts`: Unit counts (total, vacant, occupied, on-notice)

**Source**: Created from `window.__fpResults` after "Run New" pricing calculation

---

## Usage

### Development Validation

```bash
# Validate sample data against schemas
npm run validate
```

This command validates JSON files in `/tmp/` against schemas in `/schemas/`.

### Creating Validation Data

To validate your data structures:

1. **Extract data from browser console** (after running pricing):
```javascript
// In browser console after uploading CSV and running pricing
console.log(JSON.stringify(window.mappedRows.slice(0, 5), null, 2));
console.log(JSON.stringify(window.__fpResults, null, 2));
```

2. **Save to `/tmp/` directory**:
```bash
# Save console output to files
cat > tmp/mappedRows.json
# Paste JSON, then Ctrl+D

cat > tmp/fpResults.json
# Paste JSON, then Ctrl+D
```

3. **Run validation**:
```bash
npm run validate
```

### In Code Reviews

When reviewing PRs that modify data structures:

1. ✅ Check if schema needs updating
2. ✅ Validate sample data against updated schema
3. ✅ Update dependent modules if structure changed

---

## Schema Standards

### Required Fields
Mark fields as `required` if they are always present and needed for core functionality.

### Optional Fields
Allow `additionalProperties: true` for `mappedRows` (CSV may have extra columns).
Use `additionalProperties: false` for `fpResults` (strict internal format).

### Examples
Include realistic examples in each schema to document expected values.

### Descriptions
Provide clear descriptions for each field explaining purpose and constraints.

---

## Validation in Tests

The smoke tests automatically validate data structures during test runs. If data doesn't match schema, tests will fail with clear error messages.

---

## Updating Schemas

When modifying data structures:

1. **Update the schema** in this directory
2. **Update sample data** in `/tmp/` (if needed)
3. **Run validation** to ensure schema is valid
4. **Update tests** if assertions need to change
5. **Document changes** in PR and CHANGELOG.md

---

## Notes

- Schemas use JSON Schema Draft 07
- All sample data is synthetic (no PII)
- Schemas are for development/testing only (no runtime validation in production)
- Use `ajv-cli` for validation (installed as dev dependency)

---

*For more information on JSON Schema, see: https://json-schema.org/*


