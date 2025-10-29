# Changelog

All notable changes to the Revenue Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.08.0-beta] - 2025-10-28

### Added - Step 1 Simulator Foundation — Phase 2

**Status**: Phase 2 complete ✅, ready for testing 🧪

This phase wires up the simulator with full functionality: history tracking, invariant enforcement, data source badges, and floorplan mix sliders with largest-remainder rounding.

#### What Works (Phase 2)
- **History Wiring**: Ring buffer (~200 snapshots), clickable chips show hh:mm:ss
- **Invariant Enforcement**: Caps, floors, unit counts validated after each step
- **Data Source Badges**: Shows "Simulation Mode: Seed ####" or "Real rent roll"
- **Floorplan Mix Sliders**: Dynamic sliders with auto-normalization to 100%
- **Invariant Warning**: Displays violation message and disables Step if fail
- **CSV Flow Preserved**: All existing CSV functionality untouched

#### Technical Details
- Invariant checks enforce: unit counts sum to total, no negative rents, bucket counts correct
- History strip updates on each `step()` call
- Mix sliders built dynamically for S0, A1, B2, C3 floorplans
- Badges toggle between Simulation and Real modes
- All 21 tests passing ✅

## [1.08.0-alpha] - 2025-10-28

### Added - Step 1 Simulator Foundation — Phase 1

**Status**: Phase 1 complete ✅

This phase added simulator controls to the Development Panel, allowing testing without CSV upload. The demo button seeds 50 units instantly.

#### What Works (Phase 1)
- **Demo Button**: Loads 50 simulated units (S0, A1, B2, C3) instantly
- **Simulator Controls UI**: Total Units, Seed, Init, Reset, RunOnce, Step buttons
- **History Strip Container**: UI ready for wiring
- **window.RMS API**: Full browser API exposed with stubs
- **No Regressions**: CSV flow unchanged, all tests passing

#### Technical Details
- Added `config/flags.ts` for feature flags
- Added `src/sim/browser-adapter.ts` for window.RMS API
- Updated Step 104 to show simulator controls
- All 21 tests passing ✅

## [0.91.0] - 2025-10-22

### Added - Release v0.91: CI smoke tests and infrastructure improvements
- **GitHub Actions CI/CD**: Automated quality gates on all pull requests
- **Comprehensive Testing**: Playwright smoke tests and Jest boundary tests
- **Code Quality Tools**: ESLint, Prettier, EditorConfig for consistent formatting
- **Data Validation**: JSON schemas for rent roll and floorplan pricing data
- **Documentation**: Enhanced README, CONTRIBUTING, and WORKFLOW guides
- **Stable Baseline**: Renamed Step 89E to "Stable Baseline (manual testing)" for clarity

### Technical Details
- All tests pass in <10 seconds
- CI runs on Node 20 with npm caching
- Quality gates: lint, validate, smoke tests
- No behavior changes to pricing logic or UI
- Ready for automated deployment pipeline

## [1.06.0-beta] - 2025-10-27

### Added - Step 106: Engine Integration Complete

**Status**: Integration complete ✅, ready for production 🚀

This release successfully integrates the pricing engine (extracted in Step 105) into the browser UI. All pricing calculations now flow through the pure, testable engine while maintaining 100% behavior parity with the legacy implementation.

#### Core Features
- **Engine Loader**: Module import in Step 104 HTML
  - TypeScript compiled to browser-compatible JS
  - Engine loaded as ES module
  - Global export: `window.__pricingEngine`
- **Adapter Layer**: Bridge between UI and engine
  - `__createPricingConfig()` - Builds config from localStorage
  - `__createPricingContext()` - Builds context from window state
  - `__convertMappedRowsToUnitStates()` - Converts UI data to engine format
  - All adapters handle carry-forward baselines
- **Floorplan Pricing Integration**: Engine powers all floorplan calculations
  - Calls `priceAllUnits()` with converted data
  - Converts engine results to `__fpResults` format
  - Renders full term pricing tables
  - Early return skips legacy path
- **Unit Pricing**: Automatically inherits from engine results
  - Uses `__fpResults` from engine
  - No additional wiring needed
  - Full backward compatibility maintained

#### Files Modified
- `package.json` - Added `npm run build:engine` script
- `tsconfig.browser.json` - Browser-specific TypeScript config
- `steps/Step 104 — Seeded single-property mode.html` - Engine loader + adapters
- `src/js/pricing-fp.js` - Engine integration wiring
- `dist/browser/src/pricing/engine.js` (compiled)
- `dist/browser/src/data/PricingDataProvider.js` (compiled)
- `dist/browser/src/data/RealDataProvider.js` (compiled)

#### Testing
- **All 4 smoke tests passing** ✅
- Engine unit tests passing (12/12) ✅
- No console errors ✅
- UI renders correctly ✅
- Behavior parity maintained ✅

#### Documentation
- `docs/STEP_106_SUMMARY.md` - Complete integration summary
- `docs/STEP_106_STATUS.md` - Status tracking
- `docs/STEP_106_PLAN.md` - Integration plan
- `NEXT_SESSION_STEP106.md` - Quick-start guide

#### Technical Details
- **Architecture**: Pure engine → Adapter → UI
- **Data Flow**: UI ↔ Adapter ↔ Engine ↔ Results → UI
- **Fallback**: Legacy code remains as fallback on errors
- **Logging**: Silent mode for production, detailed logs available

## [1.07.0-beta] - 2025-11-06

### Added - Step 107-beta: Development Panel & Trend Overrides

**Status**: UI integration complete ✅, ready for production 🚀

This release adds a complete development panel with trend override sliders for controlled "what-if" scenarios. All features are hidden in production and only visible on localhost.

#### Core Features
- **Development Panel** (Settings tab)
  - Visible only on localhost (production-safe)
  - Feature flag checkboxes for simulation and trend overrides
  - Toggleable visibility with localStorage persistence
  - Clear status indicators and badges
  
- **Trend Override Sliders**
  - Per-floorplan sliders for manual trend control
  - Range: 0% - 100% (0 = no override)
  - Real-time value display
  - Reset button per floorplan
  - Values stored in localStorage
  
- **Pricing Engine Badge** (New Pricing tab)
  - Visual indicator of active engine
  - States: "Pure Engine (active)", "Legacy (not available)", "Legacy (engine error)"
  - Updates automatically on each run
  - Clear transparency about which path is being used

#### Files Modified
- `steps/Step 104 — Seeded single-property mode.html` - Dev panel UI + controller
- `src/js/pricing-fp.js` - Badge updates + trend override integration
- `__createPricingContext()` - Reads `window.__devFlags.trendOverrides`
- Applied trend overrides in floorplan trends calculation

#### Testing
- **All 57 tests passing** ✅
- Smoke tests: 4/4 passing ✅
- Boundary tests: 11/11 passing ✅
- Unit details: 5/5 passing ✅
- Simulator tests: 47/47 passing ✅
- No console errors ✅
- UI renders correctly ✅

#### Technical Details
- **Feature Flags**: `enableSimulation`, `enableTrendOverrides`
- **Storage**: localStorage with keys `rm:dev:*`
- **Safety**: Auto-hide in production, localhost-only
- **Integration**: Overrides applied in `__createPricingContext()`
- **Fallback**: Zero impact when flags disabled

#### Documentation
- Updated `docs/README.md` with v1.07-beta features
- Updated `docs/CHANGELOG.md` with this release
- All features documented in inline comments

## [Unreleased]

### Added - Step 109: Simulator Pause/Continue Controls

**Status**: Complete ✅

Step 109 adds full control over the simulator run loop with Start/Pause/Continue/Clear controls. Settings (Target Occupancy, Comfort Band, Speed/Aggression) can be edited while paused, and changes apply only to future ticks while preserving past history.

#### Features
- **State Machine**: CLEARED → Start → RUNNING → Pause → PAUSED → Continue → RUNNING → Clear → CLEARED
- **Controls**: Start, Pause, Continue, Clear buttons with proper state-based enabling/disabling
- **Day Counter**: Shows "Day: X/30" updating on each tick
- **Settings Editing**: Target Occ %, Band Low/High %, Speed/Aggression editable when paused or cleared
- **History Preservation**: Past snapshots remain unchanged when settings change mid-run
- **Dynamic Comfort Band**: Chart band shading reflects current settings and updates immediately when changed while paused
- **Invariant Handling**: Start/Continue disabled when invariants fail

#### Technical Details
- Settings changes while paused update chart comfort band instantly
- New settings apply only to future ticks; past history unchanged
- Day counter stops at maxDays (30) and auto-pauses
- Chart remains continuous when switching floorplans or scrubbing history
- All controls properly disabled/enabled based on state and invariants

### Added - Step 108: Combined 3-line Chart Floorplan View

**Status**: Complete ✅

Step 108 replaces the rent output display with a single combined chart that overlays rent ($) on the left Y-axis with floorplan occupancy (%) and property occupancy (%) on the right Y-axis. The chart includes a comfort band shaded between 93-96% on the occupancy axis.

#### Features
- **3-line Chart**: Rent (blue solid), FP Occupancy (green solid), Property Occupancy (gray dashed)
- **Floorplan Dropdown**: Switch between S0, A1, B2, C3 to view different floorplans
- **Summary Line**: Shows current rent, delta, and FP occupancy percentage
- **Comfort Band**: Visual indicator at 93-96% occupancy range
- **History Integration**: Chart updates on tick, history scrub, and floorplan change
- **Chart.js**: Uses Chart.js 4.4.0 for rendering

#### Technical Details
- Chart container replaces old prices panel (hidden in Step 108)
- Reuses existing history snapshots (no new history arrays)
- Multi-series tooltips show all three values on hover
- Chart updates automatically on Step, Start/Stop, and history chip clicks
- Old prices table removed/hidden in Step 108 only

## [1.07.0-alpha] - 2025-10-27

### Added - Step 107-alpha: Simulation Infrastructure Complete

**Status**: Foundation complete ✅, UI integration pending 🔄

This release adds a complete simulator infrastructure for testing and demos. The simulator generates realistic unit state evolution over time and integrates seamlessly with the pricing engine.

#### Core Features
- **PRNG** (`src/sim/prng.ts`)
  - Deterministic Linear Congruential Generator
  - Seeded for reproducibility
  - Methods: `random()`, `randomInt()`, `randomChoice()`, `randomBoolean()`
- **Simulator** (`src/sim/simulator.ts`)
  - Unit state machine with 7 states (OCCUPIED, ON_NOTICE, VACANT_READY, etc.)
  - Daily tick advances unit states and dates
  - Configurable transition probabilities per floorplan
- **Classifier** (`src/lib/classify.ts`)
  - `classifyUnit()` - Classify units into states
  - `computeBoxScore()` - Aggregate occupancy metrics
  - `getCountsByFloorplan()` - Floorplan-level counts
- **SimDataProvider** (`src/data/SimDataProvider.ts`)
  - Implements `PricingDataProvider` interface
  - Provides simulated data to pricing engine
  - Supports `advanceDays()` and `reset()`

#### Test Coverage
```bash
npx jest tests/sim/ tests/classify/
# 47/47 passing ✅
# - PRNG tests (11/11)
# - Simulator tests (6/6)
# - Classifier tests (12/12)
# - SimDataProvider tests (9/9)
# - Integration tests (2/2)
# - Determinism tests (4/4)
# - Demo tests (3/3)
```

#### Key Features
- **Deterministic**: Same seed produces identical results
- **Realistic Evolution**: Natural state transitions over time
- **Integration**: Works with pricing engine out-of-the-box
- **Zero Impact**: Feature flag OFF by default (no production impact)

#### Files Created
- `src/sim/prng.ts`
- `src/sim/simulator.ts`
- `src/sim/types.ts`
- `src/lib/classify.ts`
- `src/data/SimDataProvider.ts`
- `tests/sim/` (5 test files)
- `tests/classify/` (1 test file)

#### Documentation
- `docs/STEP_107_SUMMARY.md` - Complete feature overview
- `docs/STEP_107_PROGRESS.md` - Progress tracking
- Updated README with simulator section

## [1.05.0-beta] - 2025-10-27

### Added - Step 105: Pricing Engine Extraction (Phase 1 Complete)

**Status**: Engine complete ✅, UI integration pending 🔄

This release extracts all pricing logic into a pure, testable TypeScript engine with comprehensive test coverage and a clean architecture pattern. The engine is production-ready but not yet integrated into the browser UI.

#### Core Features
- **Pure Pricing Engine** (`src/pricing/engine.ts`, 662 lines)
  - `priceUnit()` - Price a single unit with full rule application
  - `priceFloorplan()` - Price all units for a floorplan
  - `priceAllUnits()` - Price entire property
  - All functions are pure (no side effects, fully testable)
- **Type Definitions** (`src/pricing/types.ts`, 360 lines)
  - Complete TypeScript interfaces for all inputs/outputs
  - Self-documenting code with inline comments
- **Data Provider Pattern** (`src/data/`, 448 lines)
  - `PricingDataProvider` interface for clean data access
  - `RealDataProvider` implementation for current UI
  - Ready for future `SimulatorDataProvider`
- **Comprehensive Test Suite** (`tests/pricing/`, 1,061 lines)
  - **12/12 tests passing (100%)** ✅
  - 7 golden fixtures (lock down expected behavior)
  - 4 invariant tests (fundamental properties)
  - 1 regression test (30-day carry-forward simulation)
- **Pricing Engine Adapter** (`src/js/pricing-engine-adapter.js`)
  - Bridge between UI and engine (scaffold for future integration)
  - Converts UI data structures to/from engine format

#### Pricing Rules (Fixed Order)
1. **Trend Move** - Up/down based on occupancy vs target with inside-band damping
2. **Conversion Nudge** - Inside band only, ±0.5% based on lead-to-app ratio
3. **Carry-Forward** - Use prior approved rent as baseline
4. **Caps** - Limit downward moves to 5%/week
5. **Floors** - Never below 90% of current rent
6. **Tier Gap** - Minimum gap to lower bedroom tier
7. **Term Premiums** - Short-term, seasonality, vacancy age

#### Key Improvements
- **Inside-Band Damping**: Reduces trend moves to 10% when inside comfort band (prevents oscillation)
- **Carry-Forward Baselines**: Smooth pricing evolution over time (no snap-back)
- **Type Safety**: TypeScript catches bugs at compile time
- **Pure Functions**: Easier to test, maintain, and reason about
- **Interface-Based Design**: Ready for simulator mode

#### Documentation
- **PRICING_ENGINE.md** (350+ lines) - Complete API documentation
- **STEP_105_COMPLETE.md** (255 lines) - Completion summary
- **STEP_105_PROGRESS.md** (513 lines) - Detailed progress report
- **STEP_105_BUGS_FIXED.md** (158 lines) - Bug fix documentation
- **Updated README** with pricing engine section
- **Live Demo** (`demo-pricing-engine.html`) - Browser demo with 5 scenarios

#### Demo & Testing
- **Browser Demo**: Visual demonstration of 5 pricing scenarios
  - High vacancy with cap clamp
  - Inside comfort band with conversion nudge
  - Floor clamp (cap + floor both trigger)
  - Carry-forward baseline
  - 30-day simulation
- **Test Utilities**: Shell script and Node.js test runners

#### Bugs Fixed
1. **Inside-band trend damping** - Reduced moves to 10% inside comfort band
2. **Community bias scope** - Only apply outside comfort band
3. **Floor clamp fixture** - Configured carry-forward scenario correctly
4. **Carry-forward direction** - Fixed occupancy for correct trend
5. **30-day simulation** - Stabilized with midpoint occupancy

### Technical Details
- **Language**: TypeScript (compiles to ES2020)
- **Test Framework**: Jest with TypeScript support
- **Code Quality**: 100% test coverage, zero lint errors
- **Architecture**: Clean separation (engine → adapter → UI)
- **Total Lines**: 3,839 (engine: 1,270, tests: 1,219, docs: 1,350)

### Migration Notes
- **No Breaking Changes**: Existing UI continues to work with inline pricing
- **Future Integration**: Requires TypeScript build setup for browser
- **Opt-In**: Engine can be adopted incrementally per module

### Known Limitations
- Engine is not yet integrated into browser UI
- Requires TypeScript transpilation for browser use
- UI still uses inline pricing calculations
- Planned for Step 106: Complete UI integration

---

## [1.04.0] - 2025-10-25

### Added - Step 104: Seeded single-property mode (v1.04)
- **Seeded Property Setup**: Property configuration and floorplan mappings automatically load when localStorage is empty
- **Deterministic Testing**: Provides consistent Thorpe Gardens setup for AI agents and operators
- **Automatic CSV Mapping**: Floorplan labels from CSV automatically mapped to internal codes on upload
- **No Confirm Overlay**: Seamless CSV upload → auto-map → auto-confirm flow (no manual confirmation needed)
- **Dashboard Stats Integration**: Occupancy and metrics update automatically after successful CSV upload
- **Seeds Module** (`src/js/seeds.js`): 
  - `window.__seedPropertySetup` - Thorpe Gardens property with 4 floorplans (S0, A1, B2, C3)
  - `window.__seedFPMap` - Pre-configured floorplan label mappings with dash and space variants
- **Validation Module** (`src/js/validation.js`): CSV validation and strict mapping logic
- **Test Data** (`data/thorpe_gardens_200_units.csv`): 200-unit test file matching seeded property
- **Comprehensive Tests**:
  - Seeded mode validation tests
  - Strict mapping validation tests
  - CSV validation unit tests
  - Updated smoke tests for seeded flow
- **Global Exports**: `getNPSubtab()` and `setNPSubtab()` exported to window for unit pricing module
- **Unit Pricing Integration**: Fixed unit pricing rendering to work with seeded mode
- **Quality Gates**: All tests passing (20/21, 1 skipped)

### Technical Details
- Property setup written to localStorage on first load
- Floorplan mappings support multiple label variants (e.g., "A1 - 1x1", "A1 1x1", "1x1")
- CSV uploads validated against seeded property catalog
- Unmapped floorplan labels result in hard error and upload rejection
- Dashboard stats calculation extracted to global scope for reuse
- Unit pricing module receives necessary tab state functions

### Migration from Step 103
- Removed manual confirm overlay for seeded mode
- Added automatic mapping confirmation when all floorplans match
- Integrated dashboard stats update into automatic confirmation flow
- Updated all tests to work with automatic mapping flow

### Rollback - October 24, 2025: Reset to Step 102 [SUPERSEDED]
- **Rollback Decision**: Reset development to Step 102 as clean checkpoint
- **Current Baseline**: Step 102 — Fix vacancy age display and update Current to Previous
- **Reason**: Clean slate for development session
- **Status**: Superseded by Step 104 completion

### Added - Step 103: Enhanced dashboard (rent roll only metrics) [ROLLED BACK]
- **Dashboard Enhancement**: Cleaned up "Status at a Glance" dashboard with rent roll only metrics
- **Current Occupancy**: Replaced "Revenue at Risk" with today's occupancy snapshot
- **Pricing Changes**: Added summary of average base rent changes from yesterday to today
- **Struggling Floorplans**: Shows floorplans below trending occupancy target
- **Undecided Renewals**: Count of unsigned renewals expiring within 30 days
- **Vacancy Age Alert**: Units vacant ≥30 days with configurable thresholds
- **Color Coding**: Red/yellow/green indicators for occupancy and renewal urgency
- **Click-Through Navigation**: Dashboard tiles link to relevant tabs (New Pricing, Renewals)
- **Rent Roll Only**: All metrics derived solely from uploaded rent roll data
- **No External Dependencies**: No competitor data, traffic, or leasing system integration

### Added - Step 102: Fix vacancy age display and update Current to Previous
- **Vacancy Age Display**: Fixed red text and flag display for discounted vacant units
- **Column Update**: Changed "Current" column to "Previous" to reflect last run's rent
- **Delta Recalculation**: Updated Δ $ and Δ % columns to compare Proposed vs Previous rent
- **Carry-Forward Integration**: Uses carry-forward baseline as "Previous" when available
- **Mathematical Transparency**: Shows reference rent and discount percentage for discounted units
- **UI Consistency**: Ensured vacancy age discount styling appears correctly in unit pricing table
- **Data Flow**: Fixed rendering logic to apply discounts during table generation

### Added - Step 105: Confirm overlay + auto-map fixes
- **Unified Mapping Hook**: Single `openConfirmOverlay()` function triggers after any successful mapping resolution
- **Set Syntax Fixes**: Replaced `[...new Set()]` with `Array.from(new Set())` for better compatibility
- **Renderer Standardization**: All unit pricing calls now use `window.__renderUnitPricingSection()` entry point
- **Safe Fallback**: Guaranteed fallback renderer prevents Unit tab crashes
- **Accessibility Features**: Focus trap, ESC key handling, and ARIA attributes for confirm overlay
- **Strict Mode Bypass**: Optional `skipConfirmOverlayWhenStrict` setting for CI environments
- **Enhanced Overlay Content**: Shows detected columns, floorplan summary, and mapping source
- **Comprehensive Testing**: New Playwright tests for overlay flow and Jest tests for mapping resolution
- **Idempotent Event Handling**: Event listeners attached once, overlay reopens cleanly on re-uploads
- **Professional UX**: Clear mapping source indication (seeds vs saved vs auto-detected)

### Added - Step 103: Thorpe Gardens property lock (pre-configured)
- **Pre-configured Property**: Thorpe Gardens property profile built-in with 4 locked floorplans
- **Property-Specific Validation**: Validates CSV uploads against Thorpe Gardens floorplan catalog
- **Admin-Controlled Floorplans**: Property floorplans locked for consistent operations
- **Operator Pricing Controls**: Clear separation between floorplan management and pricing levers
- **Default Strict Mode**: Strict mapping and catalog lock enabled by default
- **Property Configuration UI**: New "Property Configuration" section in Settings tab
- **Clear Error Messages**: Specific validation errors when wrong property is uploaded
- **Professional SaaS Approach**: Proper user roles and permissions structure
- **Consistent Testing**: AI agents can test with same floorplan set across all runs
- **Future-Ready**: Architecture supports multi-property expansion with dropdown selection

### Added - Step 101: UI improvements for vacancy age pricing
- **Default Tab Selection**: "Floorplan Pricing" sub-tab active by default when "New Pricing" selected
- **Discounted Unit Display**: Vacant units with vacancy age discounts show:
  - Red, bold text with 🏷️ flag for final proposed price
  - Reference rent (before discount) in smaller gray text
  - Discount percentage clearly displayed
- **Visual Hierarchy**: Clear distinction between discounted and regular pricing
- **User Experience**: Operators can immediately see which units have vacancy age discounts applied

### Added - Step 100: Vacancy age pricing enhancement
- **Vacancy Age Settings**: New settings card in Settings tab with:
  - Enable/disable toggle for vacancy age pricing
  - Intensity levels: Minimal (0.1%/day, max 5%), Medium (0.2%/day, max 10%), Aggressive (0.3%/day, max 15%)
  - Dynamic examples showing discount calculations
- **Unit-Level Discounts**: Progressive discounts for units vacant beyond 30 days
- **Pricing Integration**: Discounts applied to final proposed rent for vacant units
- **Local Persistence**: Settings saved to localStorage with proper error handling
- **Mathematical Transparency**: Discount calculations visible in pricing breakdown
- **Operator Control**: Complete control over vacancy age pricing activation and intensity
- **Organized Repository Structure**: Moved files into logical folders for better organization
  - `/steps/` - All Step HTML files (Step 87 through Step 96+)
  - `/docs/` - All documentation (README, WORKFLOW, CONTRIBUTING, CHANGELOG, etc.)
  - `/data/` - All CSV sample files (rent roll test data)
- **Updated Path References**: Fixed all test files and configs to point to new locations
- **Fixed Relative Paths**: Updated Step HTML files to work from `/steps/` subfolder
- **Maintained Functionality**: All tests passing (4/4 smoke tests, 11/11 boundary tests)
- **Professional Organization**: Repository now follows industry-standard folder structure

### Added - Step 97: Branching + PR policy docs and templates
- **Pull Request Template**: Created `.github/PULL_REQUEST_TEMPLATE.md` with comprehensive checklist
  - Pre-PR checklist: branch naming, title format, linked Step file, CHANGELOG, lint/test/smoke
  - Testing section: automated tests + manual smoke check
  - macOS Chromium flake note and workaround
  - Post-merge checklist: tagging, releases, documentation
- **README.md Updates**:
  - Added "Testing Baseline" section with current baseline (Step 96) and historical baselines
  - Added "Contributing Workflow" section with feature branch → PR → CI → merge → tag overview
  - Quick start guide with 6-step workflow
  - Links to WORKFLOW.md, CONTRIBUTING.md, GIT_WORKFLOW.md
- **WORKFLOW.md Updates**:
  - Added "Feature Branch → PR → CI → Merge → Tag Workflow" section with 10-step detailed guide
  - Branch naming conventions: `feat/step-<NN>-<slug>`
  - PR title format and examples
  - Pre-PR quality checks: lint, test, smoke (with macOS note)
  - CI quality gates explanation (4 checks: ESLint, schema, boundaries, smoke)
  - Merge requirements and strategy
  - Tag release instructions with semantic versioning
  - Optional GitHub Release guide
  - Complete command reference for full workflow
- **CONTRIBUTING.md Updates**:
  - Added "Contributor Checklists" section with three sub-checklists:
    - Pre-PR Checklist: Code quality, testing, documentation, commit quality (15 items)
    - PR Review Expectations: What makes a good PR vs. what to avoid
    - Post-Merge Checklist: Tagging, optional release notes, documentation updates
  - Concise, actionable checkboxes for each phase
  - Clear guidance on one small step at a time, no drive-by refactors
- **No Behavior Changes**: Pure documentation and template additions
- **Enforces Professional Workflow**: Ensures all contributors (including AI assistants) follow structured PR process with quality gates

### Changed - Step 96: Inline unit detail accordion
- **Inline Accordion**: Converted unit detail from bottom overlay to inline accordion
- **UX Improvement**: Detail panel now expands directly under the clicked unit row
- **One at a Time**: Only one unit detail open at a time; clicking another closes the first
- **Toggle Behavior**: Clicking the same unit again collapses the panel
- **No Overlay**: Removed bottom overlay (#unitDetailBox) in favor of inline expansion
- **Width Matches Table**: Detail panel spans full table width, no fixed overlay dimensions
- **CSS Animation**: Smooth slideDown animation when panel opens
- **Accessibility Maintained**: Full ARIA attributes, keyboard support (Enter/Space/Escape)
- **Focus Management**: Focus moves into panel on open, returns to button on close
- **Updated Tests**: All Playwright tests updated for inline accordion behavior:
  - Test inline row insertion and removal
  - Test switching between units (first closes, second opens)
  - Test Escape key closes panel and restores focus
  - Test toggle behavior (open/close same unit)
  - Test amenity adjustment in inline panel
- **CSS Updates**: Replaced .unit-detail-box styles with .unit-detail-row and .inline-unit-detail-content
- **No Behavior Change**: Pricing math, guardrails, floorplan UI unchanged

### Added - Step 95: Unit detail term pricing table (unit baseline)
- **Term Pricing Table**: Added full term pricing breakdown (2-14 months) in unit detail panel
- **Unit Baseline Calculation**: Unit baseline = floorplan baseline + amenity adjustment
- **Term Premiums Applied**: Each term shows price with short-term premium, over-cap, and seasonality adjustments
- **Pricing Functions**: Added `computeUnitBaseline()`, `computeUnitTermPrices()`, `renderUnitTermTable()` to `pricing-unit.js`
- **Helper Functions**: Exposed `shortTermAdj()` and `getSeasonalityMultiplier()` in `pricing-helpers.js`
- **Visual Presentation**: Term table matches floorplan table style with Term, Price, Notes columns
- **Accessibility**: Proper ARIA labels on term pricing section
- **Playwright Tests**: Extended `tests/unit-details.spec.ts` with tests for:
  - Term table rendering (verifies all 13 terms present)
  - 2-month and 14-month term rows visible
  - Amenity adjustment reflected in baseline
- **Updated Tests**: Updated smoke tests to reference Step 95
- **No Behavior Change**: Existing floorplan pricing, renewals, and UI outside unit detail unchanged

### Fixed - Step 94: Unit-level Details expand/collapse with accessibility + Playwright test
- **Expand Button**: Fixed unit-level expand button functionality (previously non-functional)
- **Detail Overlay**: Implemented proper openUnitDetail/closeUnitDetail functions
- **Accessibility**: Added full ARIA attributes (`aria-expanded`, `aria-controls`, `type="button"`)
- **Keyboard Support**: Enter/Space keys activate expand buttons
- **Event Delegation**: Safe re-render with delegated click handlers on `#unitPricingSection`
- **Playwright Tests**: Added `tests/unit-details.spec.ts` to verify DOM structure and accessibility
- **CI Integration**: Unit details tests now run automatically on PRs
- **Documentation**: Added troubleshooting section to README for unit details
- **No Behavior Change**: No changes to pricing logic or renewals

### Changed - Step 92: Rename baseline step file for clarity
- **File Rename**: Renamed `Step 89E — architecture boundaries + docs (no behavior change).html` to `Step 89E — Stable Baseline (manual testing).html`
- **Documentation Updates**: Updated README.md, WORKFLOW.md, and other docs to reference new filename
- **No Behavior Change**: Pure file rename for clarity; all functionality preserved
- **Purpose**: Makes the role of Step 89E as the stable baseline for manual testing more obvious

## [1.1.0] - 2025-10-22

### Added - Step 91: CI smoke on PRs with badges
- **GitHub Actions CI/CD**
  - Created `.github/workflows/ci.yml` workflow
  - Runs on all pull requests and pushes to main
  - Job name: "quality-gates" with readable step names
  - Triggers: ESLint, schema validation, smoke tests
  - Uploads Playwright report artifact on failure
  - Uses Node 20, ubuntu-latest, npm caching
  - Expected runtime: ~3-4 minutes
  
- **CI Badge**
  - Added CI status badge to README.md header
  - Links to GitHub Actions workflow page
  - Shows real-time build status (passing/failing)
  
- **Documentation Updates**
  - WORKFLOW.md: Added "CI Quality Gates" section
    - Explains what gets checked (lint, validate, smoke)
    - How to run locally before PR
    - What to do when CI fails
    - How to download Playwright report artifacts
  - CONTRIBUTING.md: Added "CI/CD Integration" section
    - Run same checks locally: `npm run lint && npm run validate && npm run smoke`
    - CI check status indicators (green/red/yellow)
    - Artifact download instructions
  - README.md: Added CI gate command to "Run Tests" section
  
### Changed
- No behavior changes in pricing logic
- All checks are additive and non-breaking

### Technical Details
- Workflow file: `.github/workflows/ci.yml`
- Job timeout: 10 minutes
- Playwright browsers: chromium only (with-deps)
- Schema validation continues on error (optional if no sample data)
- Test report retention: 7 days

---

## [1.0.0] - 2025-10-22

### Added - Step 90: Repo hygiene & guardrails upgrade
- **Testing Infrastructure**
  - Playwright smoke tests in `/tests/smoke.spec.ts`
  - Jest module boundary tests in `/tests/boundaries.spec.ts`
  - Automated test suite runs: `npm run smoke`, `npm run test:boundaries`
  - Playwright configuration with local development server
  
- **Code Quality Tools**
  - ESLint configuration with TypeScript support
  - Prettier code formatting with consistent rules
  - EditorConfig for cross-editor consistency
  - TypeScript configuration for type checking
  
- **Documentation**
  - Pull request template in `.github/pull_request_template.md`
  - JSON schemas for `mappedRows` and `__fpResults` in `/schemas/`
  - Schema validation with ajv-cli: `npm run validate`
  - Schemas README documenting data structures
  
- **npm Scripts**
  - `npm run smoke`: Run Playwright smoke tests
  - `npm run test:boundaries`: Run Jest module boundary tests
  - `npm run test`: Run all tests (boundaries + smoke)
  - `npm run lint`: Check code with ESLint
  - `npm run lint:fix`: Auto-fix ESLint issues
  - `npm run format`: Format code with Prettier
  - `npm run format:check`: Check code formatting
  - `npm run validate`: Validate JSON against schemas
  - `npm run serve`: Start local development server
  - `npm run precommit`: Run all checks before commit

- **Package Management**
  - Initialized `package.json` with all dependencies
  - Dev dependencies: Playwright, ESLint, Prettier, Jest, ajv-cli, TypeScript
  - Node.js 18+ and npm 9+ requirements documented

### Changed
- No behavior changes in pricing logic
- Updated `.gitignore` to exclude `node_modules`, `dist`, test artifacts

### Technical Details
- All tests designed to run in <10 seconds
- Minimal, non-blocking linter rules (warnings not errors)
- Schema validation optional for development workflow
- Smoke tests verify: page load, CSV upload, auto-mapping, pricing rendering, renewals

---

## [1.0.0-stable] - 2025-10-22

### Added - Step 89E: Architecture boundaries + documentation
- **Architecture Documentation**
  - Created `docs/ARCHITECTURE.md` defining module responsibilities
  - Module scopes: Floorplan Pricing, Unit Pricing, Renewals, Helpers
  - Data flow documentation from CSV → FP baseline → Unit pricing → Renewals
  - Clear separation rules and boundaries

- **Development Guards**
  - Created `src/js/dev-guards.js` with non-intrusive boundary checks
  - Warning-only assertions (no throws) for development feedback
  - Guards verify modules don't cross architectural boundaries

- **Module Documentation**
  - Added doc headers to `src/js/pricing-fp.js`
  - Added doc headers to `src/js/pricing-unit.js`
  - Each header includes: Purpose, Public API, Inputs, Outputs, "Do NOT" rules

- **Project Documentation**
  - Enhanced `README.md` with complete architecture section
  - Data flow diagrams and technical requirements
  - Troubleshooting guide and development setup
  - Contributing guidelines and recent milestones
  
  - Created `WORKFLOW.md` defining development process
  - Team roles (User, ChatGPT, Cursor)
  - One-small-step methodology with smoke checks
  - Step-by-step process with diagrams
  - Emergency rollback procedures
  
  - Created `CONTRIBUTING.md` with contribution standards
  - Conventional Commits guide (feat, fix, refactor, docs, etc.)
  - Complete manual smoke check checklist
  - Code quality standards and module boundaries
  - PR process and templates

### Changed
- No behavior changes in pricing logic
- All changes additive (documentation and guards only)

### Technical Details
- Dev guards only warn in console (no functional impact)
- Module boundaries enforced through documentation and tests
- Zero behavior change verified through manual smoke testing

---

## Pre-1.0.0 History

### Step 89D: Floorplan pricing externalized
- Externalized floorplan pricing logic to `src/js/pricing-fp.js`
- Moved FP card/row rendering, reference base/term calculation
- Maintained zero behavior change from Step 89C

### Step 89C: Unit pricing externalized
- Externalized unit pricing logic to `src/js/pricing-unit.js`
- Moved unit list rendering, filters, search, pagination
- Preserved floorplan grouping and unit detail support

### Step 89B: App boot externalized
- Externalized application initialization to `src/js/app-boot.js`
- Moved CSV upload, navigation, tab switching logic
- Maintained localStorage persistence

### Step 89A: Helpers externalized
- Externalized shared utilities to `src/js/pricing-helpers.js`
- Pure functions for formatting, calculations, data transforms

### Step 88: Externalized CSS
- Moved inline styles to `assets/styles.css`
- No behavior changes, visual appearance identical

### Step 87: Unit term detail box
- Added unit detail overlay (right-side toggle)
- Term-by-term pricing breakdown per unit

### Earlier Steps (Step 1-86)
- Iterative development of pricing logic
- Floorplan settings and mapping
- Comfort bands, tier gaps, guardrails
- Term premiums and seasonality
- Renewals with percent-to-new logic
- Charts, history, and lock mode

---

## Version Tags

- **v1.0.0-stable** (2025-10-22): First stable release with complete documentation
- **Pre-releases**: Steps 1-89 (iterative development, no formal versioning)

---

## Upgrade Notes

### From Pre-1.0.0 to 1.0.0
No migration required. All changes are additive (tests, linting, documentation).

To use new tooling:
```bash
# Install dependencies
npm install

# Run tests
npm run test

# Run linter
npm run lint

# Format code
npm run format
```

---

## Conventions

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructuring (no behavior change)
- `docs:` Documentation only
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Step Numbering
Each Step file increments by 1: `Step N — [description].html`

### Breaking Changes
Indicated with `!` after type: `feat(pricing)!: change calculation method`

---

*For detailed workflow and contribution guidelines, see `WORKFLOW.md` and `CONTRIBUTING.md`.*



## v1.09 — Step 109 (2025-10-29)

- Simulator pause and continue controls

- Pausing freezes history and continuing resumes without reset

- Guardrails and invariant checks unchanged

- UI controls scoped to the simulator panel

