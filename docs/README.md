# Revenue Management System (RMS)

[![CI Quality Gates](https://github.com/thorpe1214/Revenue-Management-System/actions/workflows/ci.yml/badge.svg)](https://github.com/thorpe1214/Revenue-Management-System/actions/workflows/ci.yml)

## Overview
The Revenue Management System is a browser-based application designed to calculate and manage apartment pricing at both the **floorplan** and **unit** level. The goal is to give operators transparent, math-first controls over rent pricing, renewals, and guardrails, without relying on black-box algorithms.

This project is currently a **single-page HTML/JavaScript app** with logic externalized into modular JS files. It is not yet a full-stack application but has been structured for easy migration later (e.g., into Next.js).

### Operator Promises

This system is built on three core principles:

1. **Transparent Math** 📊  
   Every pricing calculation is visible and understandable. No black boxes. You see exactly how base rent, term premiums, amenity adjustments, and guardrails combine to produce the final price.

2. **Reason Chips** 💡  
   (Future enhancement) Every price will show "reason chips" explaining why it was set at that level (e.g., "Band adjustment +$5", "Tier gap floor applied", "Seasonality cap at 10%").

3. **Plain-English Deltas** 📝  
   Price changes show clear comparisons: "Proposed $1,350 vs Current $1,300 (↑$50 / +3.8%)". Operators can see impact before committing changes.

> **Note**: All sample data in this repository is synthetic and contains no Personally Identifiable Information (PII). Sample rent rolls are generated for testing purposes only.

---

## Testing Baseline

### Current Baseline
**Step 107-alpha — Simulation Infrastructure Complete (v1.07-alpha)**

This is the current stable baseline for all manual and automated testing. Use this Step file for:
- Manual smoke checks
- Regression testing before opening PRs
- Verifying new changes don't break existing functionality
- AI-friendly deterministic testing (seeded property setup)

### Key Features
- **Seeded Mode**: Property setup and floorplan mappings auto-load when localStorage is empty
- **Thorpe Gardens Pre-Configured**: 4 floorplans (S0, A1, B2, C3) with automatic CSV mapping
- **Strict Validation**: CSV uploads validated against property floorplan catalog
- **No Confirm Overlay**: Seamless CSV upload → auto-map → auto-confirm flow
- **Dashboard Stats**: Real-time occupancy and metrics display
- **Carry-Forward Mode**: Previous pricing baselines saved and reused between runs
- **Pure Pricing Engine**: All pricing calculations powered by pure, testable functions
- **Simulator Infrastructure**: Deterministic simulator for testing and demos (v1.07-alpha)

### Recent Milestones
- **Step 107-alpha — Simulation Infrastructure**: Complete simulator for testing/demos (Oct 27, 2025)
- **Step 106 — Engine Integration Complete**: Pricing engine powers all calculations (Oct 27, 2025)
- **Step 105 — Pricing Engine Extraction**: Pure math functions extracted and tested (Oct 27, 2025)
- **Step 104 — Seeded single-property mode**: Auto-loading property setup and mapping (Oct 25, 2025)
- **Step 102 — Fix vacancy age display and update Current to Previous**: Vacancy age pricing (Oct 24, 2025)

### Historical Baselines
- **Step 102 — Fix vacancy age display and update Current to Previous**: Previous stable version
- **Step 96 — Inline unit detail accordion**: Historical stable version
- **Step 89E — Stable Baseline (manual testing)**: Original stable baseline after JavaScript modularization

### Using the Testing Baseline
When developing a new Step:
1. Start from the current baseline Step file (Step 104)
2. Make your changes incrementally
3. Compare behavior against the baseline to verify no regressions
4. Run full smoke check before committing: `npm test`

---

## Contributing Workflow

We follow a **feature branch → PR → CI → merge → tag** workflow for all changes.

**Quick Start:**
1. Create feature branch: `git checkout -b feat/step-<NN>-<short-slug>`
2. Make changes and save new Step file
3. Run quality checks: `npm run lint && npm run test && npm run smoke`
4. Open PR with conventional title: `feat: Step <NN> — <short title>`
5. Wait for CI checks to pass (automated quality gates)
6. Merge and tag: `git tag -a v0.<NN> -m "Step <NN>: <notes>"`

**For detailed workflow and contribution guidelines**, see:
- [WORKFLOW.md](WORKFLOW.md) — Development process and step-by-step guide
- [CONTRIBUTING.md](CONTRIBUTING.md) — Code quality standards and PR checklist
- [GIT_WORKFLOW.md](GIT_WORKFLOW.md) — Git branching and release workflow

---

## 🏗️ Architecture

### Current Structure
```
/Users/brennanthorpe/Desktop/Thorpe Management/
├── steps/
│   └── Step 104 — Seeded single-property mode.html  # Latest production-ready version
├── src/
│   ├── js/
│   │   ├── pricing-helpers.js     # Shared utilities (formatMoney, dates, etc.)
│   │   ├── pricing-unit.js        # Unit-level pricing & rendering
│   │   ├── pricing-fp.js          # Floorplan-level pricing & rendering
│   │   ├── pricing-engine-adapter.js  # Bridge to pure pricing engine (Step 105)
│   │   ├── app-boot.js            # Application initialization
│   │   ├── seeds.js               # Property setup and floorplan mapping seeds
│   │   ├── validation.js          # CSV validation and strict mapping logic
│   │   └── dev-guards.js          # Development boundary checks
│   ├── pricing/                   # NEW: Pure pricing engine (Step 105)
│   │   ├── engine.ts              # Core pricing logic (TypeScript)
│   │   └── types.ts               # Type definitions
│   └── data/                      # NEW: Data provider layer (Step 105)
│       ├── PricingDataProvider.ts # Interface
│       └── RealDataProvider.ts    # Implementation
├── docs/
│   ├── README.md                  # This file
│   ├── WORKFLOW.md                 # Development process
│   ├── CONTRIBUTING.md             # Code standards
│   ├── ARCHITECTURE.md             # Detailed module documentation
│   ├── PRICING_ENGINE.md          # Pricing engine documentation (Step 105)
│   └── CHANGELOG.md                # Version history
├── data/
│   ├── thorpe_gardens_200_units.csv             # Primary test data (Thorpe Gardens)
│   ├── rent_roll_baseline.csv                   # Baseline test data
│   ├── rent_roll_negative_case.csv              # Negative test scenarios
│   ├── rentroll_profile.json                    # Rent roll profile schema
│   └── sample_rent_roll_300_units_statuses.csv  # Legacy test data
├── assets/
│   └── styles.css                 # Application styles
├── tests/                         # Automated test suite
│   ├── smoke.spec.ts              # End-to-end smoke tests
│   ├── unit-details.spec.ts       # Unit detail functionality tests
│   ├── boundaries.spec.ts         # Module boundary tests
│   ├── seeded-mode.spec.ts        # Seeded mode validation tests
│   ├── strict-mapping.spec.ts     # Strict mapping validation tests
│   └── validation.spec.ts         # CSV validation unit tests
└── schemas/                       # JSON schema validation
    ├── rent_roll_profile.schema.json  # Rent roll profile validation
    └── fpResults.schema.json          # Floorplan results validation
```

### Module Responsibilities

#### **`pricing-helpers.js`**
- Shared utility functions used across the application
- Date parsing, money formatting, percentage calculations
- Status determination, vacancy calculations
- **Public API**: `formatMoney()`, `formatPct()`, `unitStatus()`, `vacancyAgeDays()`, etc.
- **No dependencies**: Pure functions, no DOM manipulation

#### **`pricing-unit.js`**
- **Purpose**: Render unit-level pricing tables with filters and pagination
- **Inputs**: `window.mappedRows` (rent roll data), floorplan index from `buildFpIndex()`
- **Outputs**: Populated `#unitPricingSection` DOM, `window.__npUnitsFiltered` for detail overlay
- **Key Functions**:
  - `buildFpIndex()` - Creates floorplan pricing lookup
  - `buildUnitsAll()` - Retrieves all units from rent roll
  - `renderUnitPricingSection()` - Main rendering function
- **Filters**: Search, Vacant/On Notice toggles, pagination
- **Rules**:
  - Only shows Vacant and On Notice units on Unit Pricing tab
  - Groups units by floorplan code
  - Applies amenity adjustments to proposed pricing
  - Must NOT modify floorplan baseline logic

#### **`pricing-fp.js`**
- **Purpose**: Compute and render floorplan-level pricing with term premiums
- **Inputs**: `window.__fpResults` (floorplan pricing calculations), global settings
- **Outputs**: Populated `#fpPricingSection` DOM with pricing tables per floorplan
- **Key Functions**:
  - `renderNewLease()` - Renders floorplan pricing tables
  - Term premium calculations (2-14 months)
  - Seasonality and over-cap adjustments
- **Rules**:
  - Computes baseline per floorplan (referenceBase, referenceTerm)
  - Must NOT call unit rendering functions
  - Must NOT reach into unit DOM directly

#### **`app-boot.js`**
- Application initialization and tab navigation
- CSV upload and mapping logic
- Global state management
- Event listeners for main navigation

#### **`dev-guards.js`**
- Development-time boundary checks (warnings only, no behavior changes)
- Ensures separation between modules
- Example: Warns if floorplan code tries to call unit rendering

---

## 🚀 Run Locally

Get up and running in 3 steps:

### 1. Install Dependencies
```bash
# Clone or navigate to the project directory
cd "/Users/brennanthorpe/Desktop/Thorpe Management"

# Install all development dependencies (Node.js 18+ required)
npm install
```

### 2. Start Local Server
```bash
# Start a local HTTP server on port 8000
npm run serve

# Or use Python directly:
python3 -m http.server 8000
```

### 3. Open and Test
```bash
# In your browser, navigate to:
http://localhost:8080/steps/Step%20104%20—%20Seeded%20single-property%20mode.html

# Or open directly from file system (some features may not work):
open "steps/Step 104 — Seeded single-property mode.html"
```

### 4. Upload Sample Data (Seeded Mode - Automatic Setup)
1. Click **"Choose File"** and select `data/thorpe_gardens_200_units.csv`
2. CSV is automatically mapped and validated (no confirmation needed)
3. Observe occupancy stats update immediately (e.g., Trending Occupancy: 86.50%)
4. Property setup and floorplan mappings auto-load from seeds
5. Click **"Run New"** to generate pricing
6. Navigate to **"New Pricing"** tab → See Floorplan and Unit pricing
7. Click on any unit expand button (▼) to see full term pricing details
8. Click **"Run Renewals"** → Navigate to **"Renewals"** tab

**Note**: Step 104 uses **seeded mode** - property setup automatically loads when localStorage is empty, providing a deterministic testing environment for the Thorpe Gardens property.

### Run Tests
```bash
# Run all tests (module boundaries + smoke tests)
npm run test

# Run only smoke tests (Playwright)
npm run smoke

# Run only boundary tests (Jest)
npm run test:boundaries

# Check code quality
npm run lint
npm run format:check

# Run complete CI gate checks (same as GitHub Actions)
npm run lint && npm run validate && npm run smoke
```

**Expected test runtime**: <10 seconds for all tests

---

## 🧮 Pricing Engine (Step 105 - Beta)

**Status**: Engine complete ✅, UI integration pending 🔄

Step 105 introduces a pure, testable pricing engine extracted from the UI modules. The engine is implemented in TypeScript with comprehensive test coverage and follows a clean architecture pattern.

### Key Features
- ✅ **Pure Functions**: No side effects, easy to test
- ✅ **Type Safety**: TypeScript ensures correctness
- ✅ **100% Test Coverage**: 12/12 tests passing
- ✅ **Data Provider Pattern**: Supports future simulator mode
- ✅ **Inside-Band Damping**: Prevents oscillation around target
- ✅ **Carry-Forward Baselines**: Smooth pricing evolution over time

### Architecture
```
UI (pricing-fp.js, pricing-unit.js)
    ↓
Adapter (pricing-engine-adapter.js)
    ↓
Engine (src/pricing/engine.ts)
    ↓
Data Provider (RealDataProvider)
```

### Pricing Rules (Fixed Order)
1. **Trend Move** - Up/down based on occupancy vs target
2. **Conversion Nudge** - Inside band only, ±0.5%
3. **Carry-Forward** - Use prior approved rent as baseline
4. **Caps** - Limit downward moves to 5%/week
5. **Floors** - Never below 90% of current
6. **Tier Gap** - Minimum gap to lower bedroom tier
7. **Term Premiums** - Short-term, seasonality, vacancy age

### Test Results
```bash
npx jest tests/pricing/engine.spec.ts
# 12/12 passing ✅
# - 7 golden fixtures
# - 4 invariant tests
# - 1 carry-forward regression test
```

**📖 Full Documentation**: [docs/PRICING_ENGINE.md](PRICING_ENGINE.md)

---

## 🎮 Simulator Infrastructure (Step 107-alpha)

**Status**: Foundation complete ✅, UI integration pending 🔄

Step 107 introduces a deterministic simulator for testing and demos. The simulator generates realistic unit state evolution over time and integrates seamlessly with the pricing engine.

### Key Features
- ✅ **Deterministic**: Same seed produces identical results
- ✅ **Realistic Evolution**: 7 unit states with natural transitions
- ✅ **Integration**: Works with pricing engine out-of-the-box
- ✅ **Testing**: 47/47 tests passing
- ✅ **Zero Impact**: Feature flag OFF by default

### Architecture
```
Simulator (src/sim/simulator.ts)
    ↓
SimDataProvider (src/data/SimDataProvider.ts)
    ↓
Pricing Engine (src/pricing/engine.ts)
    ↓
Pricing Results
```

### States
1. **OCCUPIED** - Unit is rented
2. **ON_NOTICE** - Received move-out notice
3. **ON_NOTICE_RENTED** - Notice + pre-leased
4. **VACANT_NOT_READY** - Move-out complete, make-ready pending
5. **VACANT_READY** - Ready for new resident
6. **PRELEASED** - Pre-lease signed
7. **OFFLINE** - Maintenance/renovation

### Usage
```typescript
// Create simulator
const provider = new SimDataProvider(12345, [
  { code: 'A1', count: 10, startingRent: 1500 },
]);

// Advance 30 days
provider.advanceDays(30);

// Get units for pricing engine
const units = provider.getUnits();

// Get box score
const boxScore = provider.getBoxScore();
```

### Test Results
```bash
npx jest tests/sim/
# 47/47 passing ✅
# - PRNG tests (11/11)
# - Simulator tests (6/6)
# - Classifier tests (12/12)
# - SimDataProvider tests (9/9)
# - Integration tests (2/2)
# - Determinism tests (4/4)
# - Demo tests (3/3)
```

**📖 Full Documentation**: [docs/STEP_107_SUMMARY.md](STEP_107_SUMMARY.md)

---

## Core Concepts

### Floorplan Pricing
- Uses **comfort target occupancy** (single-threshold target, e.g., 95%).
- Movement:
  - If trending occupancy < target → decrease rent.
  - If trending occupancy > target → increase rent.
- Base rent per floorplan is adjusted first, then:
  - **Short-term premiums** (e.g., 2-month higher rent, tapering by 1% per month).
  - **Over-cap premiums** (higher pricing for terms above reference).
  - **Seasonality adjustments** (uplift only if positive, based on month).
- **Buffer Guardrails**: Prevents decreases that would cross buffer thresholds vs. next lower tier.
- Debug information shows reference term, target/gate line, and per-term notes.

### Unit Pricing
- Mirrors floorplan pricing but shown **per unit**.
- Units inherit floorplan baseline pricing, then add:
  - **Amenity adjustments** (per-unit premiums or discounts)
  - **Status-based filtering** (Vacant, On Notice, Occupied)
  - **Availability information** (vacant days, notice date)
- **Floorplan Code Mapping**: Automatically extracts short codes from full names (e.g., "S0 - Studio" → "S0")
- Example: A vacant unit in FP S0 inherits FP base of $1,337 + $50 amenity = $1,387 proposed.

### Renewal Pricing
Renewals are generated by comparing **current rent** to **new pricing baseline**.

#### Rules:
1. If **current rent < new baseline**:
   - Apply **percent-to-new** (default 50% move toward new rent).
   - Clamp between renewal min (e.g., 0%) and max (e.g., 8% increase).
   - Apply guardrails (cap all terms).
2. If **current rent >= new baseline**:
   - Allow decreases only if toggle is ON.
   - Min/max changes allowed (defaults: −10% to −5%).
   - If toggle OFF, clamp to 0% (no decrease).

#### Example:
- Current Rent = $1,000
- New Baseline = $1,100
- Percent-to-New = 50%
- Min = 0%, Max = 8%
- Result = $1,050 (clamped between $1,000 and $1,080).

---

## Data Flow

```
1. CSV Upload → Column Mapping → window.mappedRows
                                        ↓
2. Run New Pricing → Floorplan Calculations → window.__fpResults
                                                      ↓
3. Floorplan Pricing Tab ← renderNewLease() ← pricing-fp.js
                                                      ↓
4. Unit Pricing Tab ← renderUnitPricingSection() ← pricing-unit.js
                                                      ↓
5. Unit Detail Overlay (future) ← buildTermsHTML() ← pricing-unit.js
```

### Key Data Structures

**`window.mappedRows`** - Array of unit objects from CSV:
```javascript
{
  unit: "A101",
  floorplan_code: "S0 - Studio",
  status: "occupied (on-notice)",
  current_rent: 1300,
  lease_end_date: "2024-12-31",
  amenity_adj: 50,
  // ... other fields
}
```

**`window.__fpResults`** - Floorplan pricing results:
```javascript
[
  {
    code: "S0",
    referenceBase: 1337,
    referenceTerm: 14,
    tiers: [/* term calculations */]
  }
]
```

---

## Settings & Configuration

### Floorplan Settings (Settings Tab)
- **Code**: Short identifier (e.g., "S0", "A1", "B2")
- **Name**: Display name (e.g., "Studio", "1x1", "2x2")
- **Units**: Total units in property (0 for new floorplans)
- **Band Low %**: Lower bound of comfort band (e.g., 93%)
- **Band High %**: Upper bound of comfort band (e.g., 96%)
- **Min Gap to Next Tier $**: Minimum price difference from next lower tier (e.g., $100)
- **Stop-Down Buffer $**: Prevents decreases below this threshold (e.g., $100)

### Floorplan Map (Settings Tab)
- Maps CSV floorplan labels to internal codes
- Example: "S0 - Studio" → "S0"
- Auto-detected on CSV upload
- Locally persisted in `localStorage` under key `rm:fpmap`

### Property Configuration (Settings Tab)
- **Thorpe Gardens Property**: Pre-configured property profile with 4 locked floorplans
- **Strict Mapping Mode**: Validates CSV uploads against property floorplan catalog (default ON)
- **Floorplan Catalog Lock**: Ensures consistent floorplan codes across all uploads (default ON)
- **Property Status**: Shows configured status with floorplan count and lock status
- **Admin Controls**: Temporarily unlock floorplans for testing or special cases
- **Export Profile**: Download property profile for backup or multi-property setup

**Thorpe Gardens Floorplans:**
- `S0 - Studio` (0 bedrooms, ~50 units)
- `A1 1x1` (1 bedroom, ~100 units) 
- `B2 2x2` (2 bedrooms, ~40 units)
- `C3 3x2 Small` (3 bedrooms, ~10 units)

When strict mode is enabled:
- CSV uploads must contain all Thorpe Gardens floorplans
- Validation occurs before mapping confirmation
- Clear error messages for wrong property uploads
- Consistent testing environment for AI agents and operators

### Global Settings
- **Comfort Target Trend %**: Overall occupancy target (default 95%)
- **Pricing Adjustment Style**: Standard, Aggressive, or Custom
- **New Lease Terms (Months)**: Available lease lengths (default 2-14)

---

## If/Then Scenarios (Simplified)
- If occupancy < target → decrease base rent by step %.
- If occupancy > target → increase base rent by step %.
- If trending within comfort band → use conversion steering (based on leads/apps).
- If short-term lease (2–9 months) → apply short-term premium curve.
- If renewal below new → move % toward new rent, clamp with min/max.
- If renewal above new → allow or disallow decreases depending on toggle.
- If decrease would cross buffer threshold → block decrease (buffer guardrail).
- If floorplan gap < min gap → enforce minimum tier separation.

---

## Development Workflow
- **Cursor** = coder, **ChatGPT** = prompter/PM, **User** = visionary/operator.
- One small step at a time (Step 87, 88, 89...).
- Each change produces a new HTML file for testing (e.g., `Step 89E — Stable Baseline (manual testing).html`).
- All JavaScript progressively externalized into modular files with guards and docs.
- Testing done manually (upload CSV rent roll, check occupancy, confirm pricing outputs).
- **Zero Behavior Change Rule**: Each refactoring must preserve exact functionality.

### Recent Milestones
- **Step 87**: Unit term detail box + right-side toggle
- **Step 88**: Externalized CSS
- **Step 89A-E**: JavaScript modularization and architecture documentation
- **Step 90**: Repo hygiene & guardrails (testing infrastructure)
- **Step 91**: CI smoke tests on PRs with badges
- **Step 94**: Fix unit-level Details expand (accessibility + tests)
- **Step 95**: Unit detail term pricing from unit baseline
- **Step 96**: Inline unit detail accordion
- **Step 99**: Carry-forward mode for pricing evolution
- **Step 100**: Vacancy Age Pricing enhancement
- **Step 101**: UI improvements for vacancy age pricing
- **Step 102**: Fix vacancy age display and update Current to Previous
- **Step 103**: Strict mapping lock (single-property mode)
- **Step 104**: Seeded single-property mode **(current - v1.04)**

---

## Testing

### Manual Testing Checklist
1. ✅ Upload rent roll CSV (300 units, mixed statuses)
2. ✅ Confirm auto-detected column mapping
3. ✅ Navigate to Settings → verify floorplan settings persist
4. ✅ Navigate to Settings → confirm floorplan map
5. ✅ Click "Run New" → verify floorplan pricing tables render
6. ✅ Navigate to New Pricing → Floorplan Pricing tab
7. ✅ Navigate to New Pricing → Unit Pricing tab
8. ✅ Verify unit filters (Search, Vacant, On Notice)
9. ✅ Navigate to Renewals → verify renewal pricing
10. ✅ Navigate to Charts → verify occupancy trends
11. ✅ Navigate to History → verify no errors
12. ✅ Check browser console for errors

### Sample Data
Use `data/thorpe_gardens_200_units.csv` for testing (Step 104+):
- 200 units across 4 floorplans (S0, A1, B2, C3)
- Mixed statuses (Occupied, Vacant, On Notice)
- Trending occupancy at 86.50% with 94.0% current occupancy
- Varying rent levels and lease dates
- Includes amenity adjustments
- Matches Thorpe Gardens seeded property setup

Legacy test file: `sample_rent_roll_300_units_statuses.csv` (Step 102 and earlier)

---

## Roadmap

### Short-Term (Next Steps)
- ✅ Complete JavaScript modularization
- ✅ Add architectural documentation
- ✅ Fix floorplan code mapping bug
- 🔄 Add automated smoke tests (in progress)
- 🔄 Implement unit detail overlay with term options
- 📋 Add export to Excel with tabs (New Pricing, Renewals, Seasonality)

### Medium-Term
- Implement history restore functionality
- Add support for multiple properties
- Enhance renewal pricing with more sophisticated logic
- Add bulk edit capabilities for floorplan settings
- Implement data validation and error handling

### Long-Term
- Transition from static HTML → **Next.js** with backend
- Add user authentication and multi-tenant support
- Implement database persistence (PostgreSQL)
- Add API for integration with property management systems
- Build admin dashboard for system configuration
- Add advanced analytics and reporting

---

## Cursor's Role
- Follow prompts step by step.
- Never break working functionality.
- Externalize code in stages while preserving behavior.
- Run and verify browser tests after each change.
- Enforce boundaries between helpers, floorplan pricing, unit pricing, and app boot.
- Document all changes in code comments and architecture docs.
- Use development guards to prevent cross-module violations.

---

## Metaphor (Plain English)
Think of the app as a **spreadsheet with a brain**:
- **Floorplans** are like tabs with formulas (base rent logic).
- **Units** are rows linked to those formulas (individual apartments).
- **Renewals** are "what-if" calculations comparing last year's number to today's formula.
- **Settings** are the knobs operators can turn to steer the math safely.
- **Guards** are the rails that keep you from driving the spreadsheet off a cliff.

---

## Key Principles
- **Transparency**: Every number must be explainable with a reason chip.
- **Incremental**: Small, safe steps (new Step file for every change).
- **Operator-first**: UI shows plain English deltas, not hidden math.
- **Separation**: Floorplan vs unit vs renewals clearly divided in architecture.
- **Future-ready**: Modular enough to drop into Next.js later.
- **Zero Surprises**: No magic numbers, all calculations are traceable.
- **Local-First**: Works from filesystem, no server required (for now).

---

## Troubleshooting UI Interactions

### Unit Details Expand/Collapse
The unit-level detail expand/collapse feature allows you to view additional information about each unit:

- **Location**: Click the ▼ button in the rightmost column of any unit row in the Unit Pricing table
- **Implementation**: Event delegation on `#unitPricingSection` handles all expand buttons
- **Data Attributes**: Each button has `data-unit` attribute linking to unit ID
- **Accessibility**: Full keyboard support (Enter/Space) and ARIA attributes (`aria-expanded`, `aria-controls`)
- **Detail Box**: Modal overlay (`#unitDetailBox`) shows unit details with close button (X or Escape key)

**If expand buttons don't work:**
1. Check that unit pricing section has rendered with unit rows
2. Verify `#unitDetailBox` element exists in DOM
3. Ensure event delegation is wired after rendering
4. Check browser console for JavaScript errors

---

## Known Issues & Limitations

### Current Limitations
1. **No Persistence**: Data only stored in browser localStorage (cleared on cache clear)
2. **Single Property**: Cannot manage multiple properties simultaneously
3. **No History**: Previous pricing runs are not saved
4. **Manual CSV Upload**: Must re-upload rent roll each session
5. **No Authentication**: Anyone with file access can use the application
6. **Browser-Only**: Requires modern browser with JavaScript enabled

### Recently Fixed
- ✅ Unit pricing not rendering (floorplan code mismatch)
- ✅ Duplicate inline functions overriding externalized versions
- ✅ jQuery to vanilla JavaScript conversion
- ✅ Module boundary violations

---

## Technical Requirements

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### File System Access
- Must be served via HTTP server for proper CORS handling
- Recommended: `python3 -m http.server 8000` or similar
- Can use `file://` protocol but some features may be limited

### Data Format
CSV files must include minimum columns:
- `UnitID` or `Unit` (required)
- `Floorplan` (required)
- `Status` (required)
- `Current Rent` or `CurrentRent` (required)
- `Lease End` or `LeaseEnd` (optional but recommended)
- `AmenityAdj` (optional, defaults to 0)

---

## Troubleshooting

### Unit Pricing Not Showing
**Symptom**: Unit Pricing tab is empty after clicking  
**Cause**: Floorplan code mismatch between CSV data and settings  
**Solution**: Ensure CSV floorplan codes match settings, or use "Confirm Mapping" to auto-map

### Settings Not Saving
**Symptom**: Floorplan settings reset after refresh  
**Cause**: Browser localStorage is disabled or full  
**Solution**: Enable localStorage in browser settings, clear old data if needed

### Console Errors
**Symptom**: Red errors in browser console  
**Cause**: JavaScript loading order or missing dependencies  
**Solution**: Check that all script files load in correct order:
1. `pricing-helpers.js`
2. `pricing-unit.js`
3. `pricing-fp.js`
4. `app-boot.js`

---

## Contributing

### Code Style
- Use ES6+ syntax where appropriate
- Avoid jQuery (use vanilla JavaScript)
- Prefer pure functions over stateful code
- Document all public APIs in code comments
- Use meaningful variable names

### Commit Guidelines
- Each Step file represents a complete, working state
- Document all changes in Step file name
- Never delete previous Step files (they serve as history)
- Test thoroughly before committing

### Development Guards
Always check for boundary violations:
```javascript
// In pricing-unit.js
window.__RM_DEV_GUARDS?.assert(
  !window.__RM_DEV_GUARDS.hasFunction('renderNewLease'),
  'Unit code should not access floorplan rendering'
);
```

---

## License
Proprietary - Thorpe Management

## Contact
For questions or support, contact the development team.

---

*Last Updated: October 27, 2025*  
*Current Version: Step 107-alpha — Simulation Infrastructure (v1.07-alpha)*
