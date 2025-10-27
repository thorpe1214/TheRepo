# Pricing Engine Architecture

## Overview

Step 105 introduces a pure, testable pricing engine extracted from the UI modules. The engine is implemented in TypeScript with comprehensive test coverage and a clear data provider pattern.

## Status: ✅ Engine Complete, UI Integration Pending

### What's Done
- ✅ Pure pricing engine (`src/pricing/engine.ts`)
- ✅ Type definitions (`src/pricing/types.ts`)
- ✅ Data provider interface (`src/data/PricingDataProvider.ts`)
- ✅ Real data provider (`src/data/RealDataProvider.ts`)
- ✅ Test fixtures (`tests/pricing/fixtures.ts`)
- ✅ Comprehensive tests (`tests/pricing/engine.spec.ts`) - 12/12 passing
- ✅ Engine adapter scaffold (`src/js/pricing-engine-adapter.js`)

### What's Pending
- 🔄 TypeScript build configuration for browser
- 🔄 UI integration (pricing-fp.js, pricing-unit.js)
- 🔄 Browser testing with Step 104 CSV

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser UI                            │
│  (Step 104 HTML + pricing-fp.js + pricing-unit.js)         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ (Future Integration)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Pricing Engine Adapter                      │
│         (src/js/pricing-engine-adapter.js)                  │
│  • Converts UI data → Engine format                         │
│  • Calls pure engine functions                              │
│  • Converts Engine results → UI format                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Pure Pricing Engine                        │
│              (src/pricing/engine.ts)                        │
│  • priceUnit(state, config, context)                        │
│  • priceFloorplan(units, config, context)                   │
│  • priceAllUnits(allUnits, config, context)                 │
│                                                             │
│  Rules: Trend → Conversion → Carry-Forward → Caps →        │
│         Floors → Tier Gap → Short-Term → Seasonality        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Provider Layer                        │
│                                                             │
│  Interface: PricingDataProvider                             │
│   • getUnits()                                              │
│   • getFloorplanSetups()                                    │
│   • getFloorplanTrends()                                    │
│   • getCommunityMetrics()                                   │
│   • getLeadsApps(fpCode, days)                              │
│   • getCarryForwardBaselines()                              │
│                                                             │
│  Implementations:                                            │
│   • RealDataProvider (from window.mappedRows, etc.)        │
│   • [Future] SimulatorDataProvider                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Pricing Rules (Fixed Order)

The engine applies pricing rules in a strict, deterministic order:

### 1. **Trend Move** (`computeTrendMove`)
- Calculates up/down move based on occupancy vs comfort band
- Formula: `tanh(distance / 5) * maxMove`
- **Inside-band damping**: Reduces move to 10% when inside comfort band
- Community bias: Amplifies move when site trends align

### 2. **Conversion Nudge** (`computeConversionNudge`)
- Only applied **inside comfort band**
- Strong conversion (>5%) → nudge up
- Weak conversion (<3%) → nudge down
- Magnitude: ±0.5%

### 3. **Baseline Determination** (`determineBaseline`)
- Priority: Carry-forward > Current rent > Starting rent
- Carry-forward allows smooth pricing evolution over time

### 4. **Apply Trend + Conversion**
- `baselineRent = baseline * (1 + trendMagnitude + conversionNudge)`

### 5. **Directional Cap** (`applyDirectionalCap`)
- Limits downward moves to `maxWeeklyDec` (default 5%)
- No cap on upward moves

### 6. **Floor Enforcement** (`applyFloor`)
- Prevents rent < 90% of current rent
- Absolute minimum: $500

### 7. **Tier Gap Enforcement** (`applyTierGap`)
- Ensures minimum gap to next lower bedroom tier
- Example: 1BR must be $150+ above Studio

### 8. **Term Pricing** (per term)
- Short-term premium (2-9 months)
- Over-cap seasonality (positive only)
- Vacancy age discount

---

## API Reference

### `priceUnit(unit, config, context): UnitPricingResult`

Prices a single unit with full rule application.

**Parameters:**
- `unit: UnitState` - Unit data (ID, floorplan, status, rent, etc.)
- `config: PricingConfig` - Pricing settings (response speed, caps, etc.)
- `context: PricingContext` - Market data (trends, baselines, date)

**Returns:**
```typescript
{
  unitId: string;
  floorplanCode: string;
  baselineRent: number;           // Base rent at reference term
  referenceRent: number;          // Rent at reference term (with premiums)
  referenceTerm: number;          // Reference term (e.g., 14)
  delta: {
    previous: number;             // Starting rent
    proposed: number;             // New proposed rent
    dollarChange: number;
    percentChange: number;
  };
  termPricing: TermPricing[];     // Pricing for all terms (2-14 mo)
  reasons: PriceReason[];         // Explanations
  flags: PriceFlags;              // Binary indicators
  debug?: { ... };                // Optional debug info
}
```

**Example:**
```typescript
const unit = {
  unitId: 'A101',
  floorplanCode: 'A1',
  floorplanLabel: 'A1 - 1x1',
  status: 'vacant',
  currentRent: 1500,
  vacantDays: 0,
  amenityAdj: 0,
};

const config = {
  priceResponse: 'standard',
  comfortTarget: 0.95,
  maxWeeklyDec: 0.05,
  // ... other settings
};

const context = {
  floorplanTrends: { 'A1': { trending: 0.92, ... } },
  communityMetrics: { trendingOccupancy: 0.93, ... },
  startingRents: { 'A1': 1500 },
  carryForwardBaselines: {},
  today: new Date(),
};

const result = priceUnit(unit, config, context);
console.log(`Proposed rent: $${result.baselineRent}`);
console.log(`Change: ${result.delta.percentChange.toFixed(1)}%`);
```

---

## Test Coverage

### Golden Fixtures (7)
Lock down expected behavior for specific scenarios:
1. High vacancy → cap clamp
2. Inside comfort → strong conversion nudge up
3. Inside comfort → weak conversion nudge down
4. Floor clamp (cap + floor both trigger)
5. Carry-forward baseline
6. Tier gap enforcement
7. Short-term premium structure

### Invariants (4)
Assert fundamental properties:
1. Floors never violated
2. Directional caps respected
3. Distance-to-target monotonicity
4. Short-term premiums monotonically decrease

### Regression Tests (1)
Ensure carry-forward works over time:
1. 30-day simulation with no snap-back

**Run tests:**
```bash
npx jest tests/pricing/engine.spec.ts
```

**Results:** 12/12 passing ✅

---

## Data Provider Pattern

The engine never reads from globals directly. All data access goes through the `PricingDataProvider` interface:

```typescript
interface PricingDataProvider {
  getUnits(): UnitRecord[];
  getFloorplanSetups(): FloorplanSetup[];
  getFloorplanTrends(): Record<string, FloorplanTrend>;
  getCommunityMetrics(): CommunityMetrics;
  getLeadsApps(fpCode: string, days: number): LeadsApps;
  getCarryForwardBaselines(): Record<string, CarryForwardBaseline>;
  getStartingRents(): Record<string, number>;
  getSeasonalityArray(): number[];
  getCurrentDate(): Date;
}
```

### Current Implementation: `RealDataProvider`

Reads from existing globals:
- `window.mappedRows` → units
- `window.propertySetup.floorplans` → setups
- `window.__fpResults` → trends
- `localStorage` → carry-forward baselines

### Future Implementation: `SimulatorDataProvider`

Will generate synthetic data for "what-if" scenarios:
- Override trends per floorplan
- Simulate occupancy changes
- Test pricing evolution over time

---

## Configuration Options

### Price Response
- `'fast'`: ±8% max move (aggressive)
- `'standard'`: ±5% max move (default)
- `'gentle'`: ±3% max move (conservative)

### Caps & Floors
- `maxWeeklyDec`: Max decrease per week (default: 5%)
- `minFloorVsCurrentRent`: Minimum floor (default: 90%)

### Vacancy Age Discounting
```typescript
vacancyAgePricing: {
  enabled: true,
  discountPerDay: 0.002,  // 0.2% per day
  maxDiscount: 0.10,      // 10% max
  thresholdDays: 30,
}
```

### Seasonality
```typescript
seasonalityEnabled: true,
seasonalityMultipliers: [
  1.0,  // Jan
  1.0,  // Feb
  1.05, // Mar
  1.08, // Apr
  1.10, // May
  1.12, // Jun  ← Peak
  1.10, // Jul
  1.08, // Aug
  1.05, // Sep
  1.02, // Oct
  1.0,  // Nov
  1.0,  // Dec
]
```

### Feature Flags
```typescript
flags: {
  enableSimulation: false,   // Future: simulator mode
  enableCarryForward: true,  // Use prior approved rents
}
```

---

## Integration Guide (Future)

### Step 1: Compile TypeScript to Browser JS

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",        // ← Change from "commonjs"
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist/browser",
    ...
  }
}
```

Compile:
```bash
npx tsc src/pricing/engine.ts --outDir dist/browser --module ES2020
```

### Step 2: Load Engine in Step 104 HTML

Add before `pricing-fp.js`:
```html
<script src="../dist/browser/pricing/engine.js"></script>
<script src="../src/js/pricing-engine-adapter.js"></script>
```

### Step 3: Wire Floorplan Pricing

In `pricing-fp.js`, replace the `__buildBaseFinalByCodeForTerm()` logic:

```javascript
// OLD (inline pricing):
let baseCand = baseVal * (1 + dirVal) * seas;
if (dirVal < 0) baseCand = Math.max(baseCand, baseVal * (1 - cfg.maxWeeklyDec));

// NEW (engine):
const config = window.__createPricingConfig();
const context = window.__createPricingContext();
const fpResults = window.__priceFloorplans(config, context);
```

### Step 4: Wire Unit Pricing

In `pricing-unit.js`, replace unit price calculation:

```javascript
// OLD (inline):
const proposed = fpBase + amenityAdj;

// NEW (engine):
const result = window.__priceUnit(unit, config, context);
const proposed = result.baselineRent + amenityAdj;
```

### Step 5: Test in Browser

1. Load Step 104 with `thorpe_gardens_200_units.csv`
2. Click "Run New"
3. Verify pricing matches expected values
4. Check console for engine logs

---

## Key Benefits

1. **Testability**: Engine is pure functions, easy to test
2. **Maintainability**: All pricing rules in one place
3. **Extensibility**: Data provider pattern allows future simulator mode
4. **Correctness**: 12/12 tests passing, bugs caught early
5. **Documentation**: Types and comments explain every rule

---

## Future Enhancements

### Simulator Mode
- Override trends per floorplan
- Test "what-if" scenarios
- Visualize pricing evolution over time

### Per-Unit Carry-Forward
- Currently: floorplan-level baselines
- Future: unit-level baselines for finer control

### Multi-Property Support
- Price multiple properties simultaneously
- Compare pricing strategies across portfolio

### API Endpoint
- Expose pricing engine as REST API
- Allow external tools to price units

---

## Technical Decisions

### Why TypeScript?
- Type safety catches bugs at compile time
- Better IDE support (autocomplete, refactoring)
- Self-documenting code with interfaces

### Why Pure Functions?
- Easier to test (no mocks needed)
- Deterministic (same inputs → same outputs)
- No side effects (no globals, no DOM)

### Why Data Provider Pattern?
- Decouples engine from data source
- Enables future simulator mode
- Makes testing easier (swap providers)

### Why Inside-Band Damping?
- Allows conversion steering to dominate when occupancy is healthy
- Prevents oscillation around target
- Tested extensively (Fixtures 2 & 3)

---

## Related Documentation

- `docs/STEP_105_PROGRESS.md` - Full progress report
- `docs/STEP_105_BUGS_FIXED.md` - Bug fix summary
- `tests/pricing/fixtures.ts` - Test data examples
- `src/pricing/types.ts` - Full type definitions

---

**Version:** Step 105 (v1.05-beta)  
**Status:** Engine complete, UI integration pending  
**Last Updated:** October 27, 2025

