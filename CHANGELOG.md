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

