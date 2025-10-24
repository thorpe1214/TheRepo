# Changelog

All notable changes to the Revenue Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

### Rollback - October 24, 2025: Reset to Step 102
- **Rollback Decision**: Reset development to Step 102 as clean checkpoint
- **Current Baseline**: Step 102 — Fix vacancy age display and update Current to Previous
- **Reason**: Clean slate for tomorrow's development session
- **Status**: All documentation updated to reflect Step 102 as current baseline
- **Git State**: Local repository reset to `v1.02` tag, remote remains at Step 103

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

