# Contributing Guide

## Welcome! 🎉

Thank you for contributing to the Revenue Management System. This guide will help you understand our development process and quality standards.

---

## Core Principles

### 1. No Behavior Change (Unless Stated)
**Default assumption**: All changes preserve existing functionality exactly.

✅ **Allowed by default**:
- Code refactoring (same input → same output)
- Moving code to new files (zero behavior change)
- Adding documentation
- Fixing bugs (with clear before/after description)

⚠️ **Requires explicit approval**:
- Changing calculation logic
- Modifying UI behavior
- Altering data structures
- Adding/removing features

### 2. One Small Step at a Time
Each Step file should be:
- **Atomic**: Complete and self-contained
- **Testable**: Can be verified independently
- **Reversible**: Can roll back without breaking system

### 3. Test Before Commit
Never commit code that hasn't passed the smoke check.

---

## Commit Message Format

We use **Conventional Commits** for clear, structured commit history.

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

#### **feat**: New feature or enhancement
```bash
git commit -m "feat: add CSV column validation"
git commit -m "feat(pricing): implement term premium calculator"
git commit -m "feat: Step 90 - add unit detail overlay"
```

#### **fix**: Bug fix
```bash
git commit -m "fix: resolve floorplan code mapping issue"
git commit -m "fix(unit-pricing): handle empty amenity adjustments"
git commit -m "fix: Step 95 - unit term pricing calculation"
```

#### **refactor**: Code restructuring (no behavior change)
```bash
git commit -m "refactor: extract pricing helpers to separate file"
git commit -m "refactor(app-boot): simplify initialization logic"
git commit -m "refactor: Step 89C - externalize unit pricing"
```

#### **docs**: Documentation only
```bash
git commit -m "docs: update README with architecture section"
git commit -m "docs: add inline comments to pricing-fp.js"
git commit -m "docs: create WORKFLOW.md and CONTRIBUTING.md"
```

#### **style**: Code style changes (formatting, whitespace)
```bash
git commit -m "style: fix indentation in pricing-unit.js"
git commit -m "style: remove trailing whitespace"
```

#### **test**: Adding or updating tests
```bash
git commit -m "test: add smoke test for unit pricing"
git commit -m "test: create automated test suite"
```

#### **chore**: Maintenance tasks
```bash
git commit -m "chore: update .gitignore"
git commit -m "chore: remove deprecated Step files"
```

#### **perf**: Performance improvements
```bash
git commit -m "perf: optimize unit rendering for large datasets"
git commit -m "perf(floorplan): cache calculation results"
```

### Scopes (Optional)
Add scope to specify which module/area changed:
- `pricing-fp`: Floorplan pricing
- `pricing-unit`: Unit pricing
- `pricing-helpers`: Shared utilities
- `app-boot`: Application initialization
- `ui`: User interface
- `data`: Data structures or flow

### Examples

#### Simple commit
```bash
git commit -m "feat: Step 91 - add export to Excel"
```

#### Detailed commit
```bash
git commit -m "fix(pricing-unit): resolve floorplan code mismatch

Unit pricing was not rendering due to floorplan code format mismatch.
CSV contains full names like 'S0 - Studio' but index uses short codes
like 'S0'.

Solution: Extract short code before lookup using split(' - ')[0].

Fixes: #42"
```

#### Breaking change
```bash
git commit -m "feat(pricing)!: change calculation method for term premiums

BREAKING CHANGE: Term premium calculation now uses exponential curve
instead of linear taper. Existing pricing results will differ.

Migration: Re-run 'Run New' to generate updated pricing with new logic."
```

---

## Manual Smoke Check Checklist

Run this checklist **before every commit**. All items must pass.

### 🟢 Critical Path (Must Pass)

#### 1. Page Load
```
[ ] Page loads without JavaScript errors
[ ] All CSS/JS files load successfully
[ ] No 404 errors in Network tab
[ ] Page renders within 3 seconds
```

#### 2. CSV Upload & Mapping
```
[ ] "Choose File" button works
[ ] CSV file uploads successfully
[ ] Column mapping auto-detects correctly
[ ] "Confirm Mapping" saves successfully
[ ] Rent roll data visible in UI (occupancy stats update)
```

#### 3. Settings Persistence
```
[ ] Navigate to Settings tab
[ ] Modify a floorplan setting (e.g., Band Low %)
[ ] Refresh page
[ ] Verify setting persisted (same value after refresh)
[ ] Check floorplan map is saved
```

#### 4. New Pricing - Floorplan View
```
[ ] Click "Run New" button
[ ] Navigate to New Pricing tab
[ ] Verify Floorplan Pricing is default view
[ ] All floorplan cards render (S0, A1, B2, etc.)
[ ] Pricing tables show all term rows (2-14 months)
[ ] Reference base and term display correctly
[ ] Debug info shows (if enabled)
```

#### 5. New Pricing - Unit View
```
[ ] Click "Unit Pricing" tab
[ ] Unit table renders with data
[ ] Search box is present and functional
[ ] Vacant checkbox filters correctly
[ ] On Notice checkbox filters correctly
[ ] Units grouped by floorplan code
[ ] Proposed pricing displays for each unit
[ ] Delta (Δ) calculations are correct
```

#### 6. Renewals
```
[ ] Navigate to Renewals tab
[ ] Renewal pricing table renders
[ ] Current rent vs proposed shown
[ ] Percentage increases/decreases calculated
[ ] Min/max guardrails applied
```

#### 7. Charts
```
[ ] Navigate to Charts tab
[ ] Occupancy trend chart renders
[ ] No JavaScript errors
[ ] Data displays correctly
```

#### 8. History
```
[ ] Navigate to History tab
[ ] No errors or crashes
[ ] (Future: verify saved runs display)
```

#### 9. Console Check
```
[ ] Open browser DevTools (F12)
[ ] Check Console tab
[ ] Verify NO red errors
[ ] [RM Guard] warnings are OK (dev-only)
[ ] 404 for favicon.ico is OK (non-critical)
```

### 🟡 Feature-Specific Checks

Run these based on what you changed:

#### New UI Component
```
[ ] Component renders in correct location
[ ] All interactive elements work (buttons, inputs, etc.)
[ ] Component follows existing design patterns
[ ] Mobile responsive (if applicable)
[ ] Accessible (keyboard navigation, ARIA labels)
```

#### Data/Calculation Change
```
[ ] Verify output matches expected values
[ ] Test edge cases (empty data, zero values, negatives)
[ ] Compare with previous Step file output
[ ] Document calculation logic in code comments
```

#### Refactor (Zero Behavior Change)
```
[ ] Run complete smoke check
[ ] Compare output with previous Step
[ ] Verify NO visual differences
[ ] Verify NO calculation differences
[ ] Check that all events still fire correctly
```

#### Bug Fix
```
[ ] Verify original bug is resolved
[ ] Test the specific scenario that was broken
[ ] Verify fix doesn't introduce new bugs
[ ] Add test case for regression prevention (future)
```

---

## Code Quality Standards

### JavaScript Style

#### Prefer Vanilla JavaScript
```javascript
// ✅ Good
document.getElementById('myElement');
element.addEventListener('click', handler);

// ❌ Avoid
$('#myElement');
$(element).on('click', handler);
```

#### Use ES6+ Features
```javascript
// ✅ Good
const units = [...filteredUnits];
const { code, name } = floorplan;
const result = units.filter(u => u.status === 'Vacant');

// ❌ Avoid
var units = filteredUnits.slice();
var code = floorplan.code;
var result = units.filter(function(u) { return u.status === 'Vacant'; });
```

#### Document Public APIs
```javascript
/**
 * Render Unit Pricing Section
 * 
 * Purpose: Renders the unit-level pricing table with filters and pagination.
 * 
 * Public API: window.__renderUnitPricingSection()
 * 
 * Inputs:
 *  - window.mappedRows (array): Rent roll data from CSV
 *  - window.__npUnitsState (object): Filter/pagination state
 * 
 * Outputs:
 *  - Populates #unitPricingSection DOM element
 *  - Sets window.__npUnitsFiltered for detail overlay
 * 
 * Side Effects:
 *  - Updates localStorage for state persistence
 *  - Attaches event listeners to filter controls
 */
function renderUnitPricingSection() {
  // Implementation...
}
```

#### Handle Errors Gracefully
```javascript
// ✅ Good
function buildFpIndex() {
  try {
    const results = window.__fpResults;
    if (!results || !Array.isArray(results)) {
      console.warn('No floorplan results available');
      return new Map();
    }
    // Process results...
  } catch (error) {
    console.error('Error building floorplan index:', error);
    return new Map();
  }
}

// ❌ Avoid
function buildFpIndex() {
  const results = window.__fpResults;
  // Assumes results exists and is valid
  return results.map(r => /* ... */);
}
```

### HTML/DOM Best Practices

#### Semantic HTML
```html
<!-- ✅ Good -->
<section class="card">
  <header>
    <h3>Floorplan S0</h3>
  </header>
  <table class="basic">
    <thead>
      <tr><th>Unit</th><th>Status</th></tr>
    </thead>
    <tbody>
      <!-- data rows -->
    </tbody>
  </table>
</section>

<!-- ❌ Avoid -->
<div class="card">
  <div class="title">Floorplan S0</div>
  <div class="table">
    <div class="row header">
      <div>Unit</div><div>Status</div>
    </div>
    <!-- data rows -->
  </div>
</div>
```

#### Accessible Forms
```html
<!-- ✅ Good -->
<label for="unitSearch">Search Units:</label>
<input type="text" id="unitSearch" 
       placeholder="Search unit or FP code"
       aria-label="Search units by unit number or floorplan code">

<!-- ❌ Avoid -->
<input type="text" placeholder="Search">
```

### Performance Considerations

#### Avoid N+1 Queries
```javascript
// ✅ Good - Build lookup once
const fpIndex = buildFpIndex();
units.forEach(u => {
  const fp = fpIndex.get(u.floorplan_code);
  // Use fp...
});

// ❌ Avoid - Lookup on every iteration
units.forEach(u => {
  const fp = findFloorplan(u.floorplan_code); // Searches array each time
  // Use fp...
});
```

#### Batch DOM Updates
```javascript
// ✅ Good - Single innerHTML assignment
let html = '';
items.forEach(item => {
  html += `<div>${item}</div>`;
});
container.innerHTML = html;

// ❌ Avoid - Multiple DOM manipulations
items.forEach(item => {
  container.innerHTML += `<div>${item}</div>`; // Reflows on each iteration
});
```

---

## Schema Validation

### Data Structure Contracts

All core data structures have JSON Schema definitions in `/schemas/`:

- **`mappedRows.schema.json`**: Rent roll data after CSV upload and mapping
- **`fpResults.schema.json`**: Floorplan pricing results after "Run New" calculation

### When to Validate

#### During Development
```bash
# After making pricing changes, extract sample data from browser console:
# 1. Open browser DevTools (F12)
# 2. After running pricing, copy data:
console.log(JSON.stringify(window.mappedRows.slice(0, 5), null, 2));
console.log(JSON.stringify(window.__fpResults, null, 2));

# 3. Save to tmp/ directory
cat > tmp/mappedRows.json   # Paste JSON
cat > tmp/fpResults.json    # Paste JSON

# 4. Run validation
npm run validate
```

#### In Code Reviews
When reviewing PRs that modify data structures:

```markdown
**Schema Validation Checklist:**
- [ ] Verified schema files updated if data structure changed
- [ ] Sample data extracted and saved to `/tmp/`
- [ ] `npm run validate` passes without errors
- [ ] Schema README updated if new fields added
- [ ] Dependent modules updated to handle new structure
```

### Updating Schemas

If you change data structure (e.g., add new field to floorplan results):

1. **Update Schema**
   ```bash
   # Edit schemas/fpResults.schema.json
   # Add new field with type, description, examples
   ```

2. **Document Change**
   ```markdown
   # In schemas/README.md
   ## Recent Changes
   - 2025-10-22: Added `seasonalityApplied` boolean to fpResults
   ```

3. **Update Tests**
   ```typescript
   // In tests/smoke.spec.ts or boundaries.spec.ts
   // Add assertions for new field if critical
   ```

4. **Validate Sample Data**
   ```bash
   # Extract fresh data from browser
   # Save to tmp/
   # Run validation
   npm run validate
   ```

### Schema Standards

When adding fields to schemas:

#### Required vs Optional
```json
{
  "required": ["unit", "floorplan_code", "status"],  // Must be present
  "properties": {
    "amenity_adj": {  // Optional field
      "type": "number"
    }
  }
}
```

#### Clear Descriptions
```json
{
  "referenceBase": {
    "type": "number",
    "description": "Reference base rent after comfort band adjustments",
    "minimum": 0,
    "examples": [1305, 1755, 2110]
  }
}
```

#### Realistic Examples
Include examples that match actual data:
```json
{
  "status": {
    "type": "string",
    "enum": ["vacant", "occupied", "occupied (on-notice)", "preleased"],
    "examples": ["vacant", "occupied", "occupied (on-notice)"]
  }
}
```

### Validation Errors

Common schema validation errors and fixes:

#### Missing Required Field
```
Error: data should have required property 'floorplan_code'
Fix: Ensure CSV mapping includes floorplan column
```

#### Wrong Type
```
Error: data.current_rent should be number
Fix: Convert string to number during CSV parsing
```

#### Invalid Enum Value
```
Error: data.status should be equal to one of the allowed values
Fix: Normalize status strings (lowercase, handle variations)
```

### Benefits

Schema validation provides:
- ✅ **Documentation**: Clear spec of expected data format
- ✅ **Early Detection**: Catch structural issues before runtime
- ✅ **Contract Enforcement**: Ensure modules agree on format
- ✅ **Regression Prevention**: Detect unintended changes

### Resources

- Schema files: `/schemas/`
- Schema docs: `/schemas/README.md`
- Sample data: `/tmp/` (gitignored)
- Validation tool: `ajv-cli` (installed as dev dependency)

---

## Module Boundaries

### Rules of Separation

#### `pricing-helpers.js` (Utilities)
✅ **Can**: Provide pure functions, format data, perform calculations  
❌ **Cannot**: Access DOM, modify global state, call other modules

#### `pricing-unit.js` (Unit Pricing)
✅ **Can**: Render unit tables, use helpers, read floorplan index  
❌ **Cannot**: Call floorplan rendering, modify floorplan baseline

#### `pricing-fp.js` (Floorplan Pricing)
✅ **Can**: Render floorplan tables, compute baselines, use helpers  
❌ **Cannot**: Call unit rendering, access unit DOM directly

#### `app-boot.js` (Application)
✅ **Can**: Coordinate modules, manage navigation, handle CSV upload  
❌ **Cannot**: Contain pricing logic, duplicate module responsibilities

### Development Guards
Use guards to enforce boundaries:

```javascript
// At end of pricing-unit.js
if (window.__RM_DEV_GUARDS) {
  window.__RM_DEV_GUARDS.assert(
    typeof window.renderNewLease !== 'function',
    'Unit code should not access floorplan rendering directly'
  );
}
```

---

## Contributor Checklists

### Pre-PR Checklist
Complete **all items** before opening a pull request:

#### Code Quality
- [ ] Feature branch created: `feat/step-<NN>-<slug>`
- [ ] Changes limited to one small Step (atomic change)
- [ ] New Step HTML file saved (e.g., `Step 97 — [title].html`)
- [ ] Code follows existing patterns and style guide
- [ ] No accidental modifications to unrelated code
- [ ] Inline comments updated where needed

#### Testing
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm run lint:fix` applied if needed
- [ ] `npm run test:boundaries` passes (11/11 tests)
- [ ] `npm run smoke` attempted (macOS may use WebKit if Chromium flakes)
- [ ] Manual smoke check completed (see checklist below)
- [ ] No console errors in browser DevTools
- [ ] Previous functionality verified intact (regression check)

#### Documentation
- [ ] `CHANGELOG.md` updated under `[Unreleased]` section
- [ ] Step file linked in PR description
- [ ] README.md updated if architecture changed
- [ ] ARCHITECTURE.md updated if module boundaries changed

#### Commit Quality
- [ ] Conventional commit format: `feat: Step <NN> — <short title>`
- [ ] Clear, descriptive commit message
- [ ] No merge conflicts with main branch

---

### PR Review Expectations

#### What Makes a Good PR
✅ **One small step at a time:**
- Single feature, bug fix, or refactor
- Complete and self-contained
- Easy to review and test
- Clear before/after description

✅ **Quality standards:**
- All CI checks pass (green checkmark)
- Manual smoke check completed
- Documentation updated
- No drive-by refactors or unrelated changes

✅ **Communication:**
- Clear PR title and description
- Screenshots for UI changes
- Notes for reviewers highlighting key areas
- Responsive to feedback

#### What to Avoid
❌ **Large, multi-feature PRs:**
- Combining multiple unrelated changes
- Refactoring + new feature in same PR
- Changes that span multiple modules without clear justification

❌ **Incomplete testing:**
- Skipped smoke checks
- Ignored console errors
- No manual verification
- Relying solely on CI without local testing

❌ **Poor documentation:**
- No CHANGELOG entry
- Vague commit messages
- Missing Step file reference
- No explanation of behavior changes

---

### Post-Merge Checklist
Complete **after PR is merged** to main:

#### Tagging
- [ ] Pull latest main: `git checkout main && git pull origin main`
- [ ] Create annotated tag: `git tag -a v0.<NN> -m "Step <NN>: <short notes>"`
- [ ] Push tag to GitHub: `git push origin main --tags`

#### Optional Release Notes
- [ ] Create GitHub Release (for milestone Steps)
- [ ] Attach Step HTML file as release asset
- [ ] Copy CHANGELOG entry to release description
- [ ] Link to PR and any related issues

#### Documentation
- [ ] Update README "Current Version" footer (if milestone)
- [ ] Update README "Testing Baseline" section (if new stable baseline)
- [ ] Announce in team chat/email (if applicable)

---

## Pull Request Process

### Before Opening PR
1. ✅ Complete Pre-PR Checklist (see above)
2. ✅ Complete smoke check (all items pass)
3. ✅ Update documentation if needed
4. ✅ Add descriptive commit message
5. ✅ Verify no merge conflicts

### PR Title Format
Follow same convention as commits:
```
feat: Step 95 - Add unit detail term pricing
fix: Resolve floorplan mapping bug in Step 94
docs: Update ARCHITECTURE.md with data flow
```

### PR Description Template
```markdown
## Step Number
Step 90

## Type of Change
- [ ] New feature
- [x] Bug fix
- [ ] Refactoring (no behavior change)
- [ ] Documentation update

## Description
Brief description of what this Step accomplishes.

## Changes Made
- Modified `src/js/pricing-unit.js` - Added detail overlay logic
- Updated `Step 94.html` → `Step 95.html`
- Added inline documentation

## Testing Done
- [x] All smoke check items pass
- [x] Tested on Chrome, Firefox, Safari
- [x] No console errors
- [x] Previous functionality verified intact

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Related Issues
Fixes #42
Related to #35

## Breaking Changes
None / [Describe if any]

## Notes for Reviewers
[Any specific areas to focus on]
```

### Review Checklist
Reviewer should verify:
- [ ] Smoke check passed
- [ ] Code follows style guide
- [ ] Module boundaries respected
- [ ] Documentation updated
- [ ] Commit message follows convention
- [ ] No regressions in functionality

---

## Getting Help

### Questions About
- **Requirements**: Ask User for clarification
- **Implementation**: Ask ChatGPT for guidance
- **Technical Issues**: Check docs, then ask team

### Resources
- `README.md`: Project overview and architecture
- `ARCHITECTURE.md`: Detailed module documentation
- `WORKFLOW.md`: Development process
- Browser DevTools: Debugging and inspection

---

## Code of Conduct

### Do's ✅
- **Be clear**: Ask questions if requirements are unclear
- **Be thorough**: Test changes completely before committing
- **Be respectful**: Review feedback professionally
- **Be collaborative**: Share knowledge and insights

### Don'ts ❌
- **Don't rush**: Quality over speed
- **Don't assume**: Test even "obvious" changes
- **Don't break**: Existing functionality without approval
- **Don't bypass**: Smoke checks or review process

---

## Recognition

Great contributions demonstrate:
- ✨ Clean, readable code
- 🧪 Thorough testing
- 📚 Clear documentation
- 🎯 Focused, atomic changes
- 🤝 Collaborative spirit

Thank you for maintaining our high standards! 🙌

---

## CI/CD Integration

### Automated Quality Gates

All pull requests automatically run quality checks via GitHub Actions:

**The CI workflow runs:**
```bash
npm run lint        # ESLint checks
npm run validate    # Schema validation (optional)
npm run smoke       # Playwright tests
```

**Before opening a PR**, run the same checks locally:
```bash
# Run all CI checks locally
npm run lint && npm run validate && npm run smoke

# Or fix issues automatically
npm run lint:fix
```

**Expected runtime**: ~3-4 minutes on GitHub Actions

### CI Check Status

Pull requests show a **"Quality Gates"** check:
- ✅ **Green**: All checks passed, ready to merge
- ❌ **Red**: One or more checks failed, needs fixes
- 🟡 **Yellow**: Checks are running

### If CI Fails

1. **Click "Details"** on the failed check to see what broke
2. **Common fixes:**
   - Lint errors: `npm run lint:fix`
   - Test failures: Download Playwright report artifact from GitHub
   - Schema errors: Update schemas or sample data
3. **Test locally** before pushing again
4. **Push fix**: CI will automatically re-run

### Artifacts on Failure

When smoke tests fail, CI uploads a Playwright report:
- Go to the failed workflow run on GitHub
- Scroll to "Artifacts" section
- Download `playwright-report`
- Open `index.html` to see screenshots and error details

---

## Quick Reference

### Before You Start
```bash
# 1. Pull latest
git pull origin main

# 2. Create new Step file
cp "Step 95 — [old].html" "Step 96 — [new].html"

# 3. Make changes in Step 96
```

### After Implementation
```bash
# 1. Run smoke check (see checklist above)

# 2. Stage changes
git add .

# 3. Commit with conventional format
git commit -m "feat: Step 90 - [description]"

# 4. Push to GitHub
git push origin main
```

### If Something Breaks
```bash
# 1. Check console for errors
# 2. Compare with previous Step
# 3. Fix and re-test
# 4. Document what went wrong
```

---

*Questions? Check WORKFLOW.md or ask the team!*

---

*Last Updated: October 22, 2025*  
*Version: 1.0*

