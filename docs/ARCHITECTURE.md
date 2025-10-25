# Revenue Management Architecture

## Overview

The Revenue Management system is structured with clear separation between different pricing components to maintain modularity and prevent cross-contamination of logic.

## Seeded Single-Property Mode

### Overview

The seeded single-property mode provides deterministic initialization for automated testing and consistent operations. When localStorage is empty, the system automatically loads pre-configured property setup and floorplan mappings from code seeds.

### Seed Components

**Property Setup Seeds** (`window.__seedPropertySetup`):
- Property ID and name (thorpe-gardens)
- Floorplan catalog with codes, names, bedrooms, and unit counts
- Metadata including total units and configuration flags

**Floorplan Mapping Seeds** (`window.__seedFPMap`):
- Maps CSV floorplan labels to internal codes
- Covers common variations (e.g., "Studio" → "S0", "1x1 A" → "A1")
- Provides fallback mappings for different naming conventions

### Seed Loading Process

1. **Bootstrap Check**: On app initialization, `loadSeedsIfEmpty()` checks localStorage
2. **Property Setup**: If `rm:propertySetup:floorplans` is missing, writes seeds to localStorage
3. **Property Profile**: Creates validation profile for strict mapping
4. **FP Mapping**: If `rm:fpmap:thorpe-gardens` is missing, writes seed mappings
5. **Session Tracking**: Tracks whether seeds were used in current session

### Storage Keys

- `rm:propertySetup:floorplans` - Property configuration
- `propertyProfile` - Validation profile for strict mapping
- `rm:fpmap:thorpe-gardens` - Floorplan label mappings

### Operator Transition

**From Seeds to Custom Mapping**:
1. First upload uses seeds automatically
2. User edits mapping → localStorage overrides seeds
3. Subsequent uploads use saved mappings
4. Seeds are ignored once localStorage is populated

**Benefits**:
- Deterministic testing environment
- No manual setup required for first-time users
- Consistent floorplan mappings across sessions
- Clear separation between seeded and custom configurations

### Confirm Overlay

After auto-mapping, a confirm overlay displays:
- Detected CSV columns
- Mapping source (seeds vs saved)
- Option to proceed or edit mapping

This ensures users understand what was auto-mapped and can verify before proceeding.

## Component Architecture

### Floorplan Pricing (`pricing-fp.js`)

**Purpose**: Computes and renders baseline pricing per floorplan type.

**Scope**:
- Computes reference base and reference term for each floorplan
- Renders floorplan cards with pricing tables
- Handles floorplan-level calculations (seasonality, guardrails, tier gaps)
- Manages floorplan setup and configuration

**Inputs**:
- `window.propertySetup.floorplans` - Floorplan configuration
- `window.mappedRows` - Rent roll data
- Configuration settings (comfort target, price response, etc.)
- Trending state from `computeTrending()`

**Outputs**:
- Floorplan cards rendered to `#nlTables`
- `window.__fpResults` - Floorplan baseline data for unit pricing
- `window.__newPricingRows` - Export data

**Public API**:
- `window.renderNewLease(cfg, norm, tState)` - Main rendering function
- `window.collectNewFloorplanPoints(cfg, norm, tState)` - Summary data
- `window.buildSetupByCode()` - Floorplan setup helper
- `window.computeDirSmooth(code, fpLabel, cfg, tState, setupByCode)` - Direction calculation
- `window.startingRentForCode(code)` - Starting rent lookup

### Unit Pricing (`pricing-unit.js`)

**Purpose**: Renders individual unit lists with filtering, search, and pagination.

**Scope**:
- Renders unit tables grouped by floorplan
- Handles unit-level filtering (vacant, on notice)
- Manages search and pagination
- Shows unit details and amenity adjustments
- Uses floorplan baselines as foundation for unit calculations

**Inputs**:
- `window.__fpResults` - Floorplan baseline data from Floorplan Pricing
- `window.mappedRows` - Rent roll data
- Unit status and amenity data
- Filter and search state

**Outputs**:
- Unit tables rendered to `#unitPricingSection`
- `window.__npUnitsFiltered` - Filtered units for detail overlay
- Unit detail overlays (when enabled)

**Public API**:
- `window.__renderUnitPricingSection()` - Main rendering function
- `window.buildFpIndex()` - Floorplan index builder
- `window.buildUnits()` - Unit data builder
- `window.buildUnitsAll()` - All units builder

### Renewals (Inline)

**Purpose**: Computes renewal offers anchored to current rent.

**Scope**:
- Uses current rent as baseline (not floorplan baseline)
- Applies percent-to-new calculations
- Enforces min/max caps per renewal policy
- Handles term premiums and seasonality

**Anchor**: Current rent (not floorplan baseline)
**Method**: Percent-to-new + min/max caps

## Data Flow

```
Rent Roll Upload
    ↓
Floorplan Mapping & Normalization
    ↓
Floorplan Pricing (pricing-fp.js)
    ├── Computes floorplan baselines
    ├── Applies seasonality & guardrails
    └── Outputs: window.__fpResults
    ↓
Unit Pricing (pricing-unit.js)
    ├── Uses floorplan baselines as foundation
    ├── Adds amenity adjustments per unit
    ├── Applies term adjustments (when enabled)
    └── Renders unit tables
    ↓
Renewals (inline)
    ├── Anchored to current rent
    ├── Applies percent-to-new + caps
    └── Independent of floorplan baselines
```

## Rules of Separation

### Floorplan Pricing (`pricing-fp.js`)
- **MAY**: Compute/render baseline per floorplan (referenceBase, referenceTerm, counts)
- **MAY**: Read helpers and common state
- **MUST NOT**: Call unit overlay/detail functions or reach into unit DOM directly

### Unit Pricing (`pricing-unit.js`)
- **MAY**: Render unit list, filters, paging, and use floorplan baseline + amenities to show proposed and deltas
- **MAY**: Apply term math (if/when enabled) per-unit from the unit base
- **MAY**: Read helpers and common state
- **MUST NOT**: Mutate floorplan baseline logic or directly trigger FP rendering

### Renewals (Inline)
- **MAY**: Use current rent as anchor with percent-to-new & min/max caps
- **MUST NOT**: Depend on floorplan baseline calculations

## Development Guards

The system includes development-time boundary checks (`dev-guards.js`) that warn when separation rules are violated:

- Floorplan code should not call unit rendering directly
- Unit code should not reach into floorplan internals
- Guards only warn in console; no functional changes

## File Structure

```
src/js/
├── pricing-helpers.js    # Common utilities
├── pricing-fp.js         # Floorplan pricing logic
├── pricing-unit.js       # Unit pricing logic
├── app-boot.js          # Application initialization
└── dev-guards.js        # Development boundary checks

docs/
└── ARCHITECTURE.md      # This documentation
```

## Future Considerations

- ES modules migration (not implemented yet)
- Unit detail overlay externalization (pending)
- Enhanced boundary enforcement
- Performance optimization opportunities
