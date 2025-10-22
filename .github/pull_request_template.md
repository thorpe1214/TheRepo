# Pull Request

## Step Information
**Step Number**: Step [N]  
**Step Title**: [Brief description]  
**Previous Step**: Step [N-1]

## Type of Change
- [ ] New feature (feat)
- [ ] Bug fix (fix)
- [ ] Refactoring (refactor - no behavior change)
- [ ] Documentation (docs)
- [ ] Performance improvement (perf)
- [ ] Testing (test)
- [ ] Chore/maintenance (chore)

## Description
Brief description of what this Step accomplishes and why.

## Changes Made
List the specific changes:
- Modified `[file]` - [what changed]
- Created `[file]` - [what it does]
- Updated `[file]` - [what changed]

## Smoke Check Results ✅
**All items must be checked before merging**

### Critical Path
- [ ] Page loads with no console errors (except favicon 404 and dev guards)
- [ ] CSV upload works (sample_rent_roll_300_units_statuses.csv)
- [ ] Auto-mapping detects columns correctly
- [ ] "Confirm Mapping" saves successfully
- [ ] Occupancy stats update after mapping
- [ ] "Run New" generates pricing without errors
- [ ] Floorplan pricing renders (all floorplan cards visible)
- [ ] Unit pricing renders (tables grouped by floorplan)
- [ ] Search and filter controls work
- [ ] "Run Renewals" generates renewal pricing
- [ ] Renewals tab renders renewal table
- [ ] No critical console errors (red errors)

### Step-Specific Checks
- [ ] [Add any Step-specific verification items here]

## Behavior Change
- [ ] **ZERO behavior change** (refactor/docs only)
- [ ] **Approved behavior change** (documented below)

**If behavior changed, describe:**
- What changed:
- Why it changed:
- How to test the new behavior:

## Step File Naming
- [ ] Step file increment is correct (+1 from previous)
- [ ] File name matches pattern: `Step N — [description].html`
- [ ] Previous Step files remain unchanged

## Testing
**Commands run:**
```bash
npm run test:boundaries   # Module boundary tests
npm run smoke             # Playwright smoke tests
npm run lint              # ESLint checks
npm run format:check      # Prettier formatting
```

**Results:**
- [ ] `test:boundaries` passed
- [ ] `smoke` passed
- [ ] `lint` passed (or only warnings)
- [ ] `format:check` passed

## Screenshots (if applicable)
Add screenshots for UI changes

## Module Boundaries
- [ ] No cross-module violations (pricing-unit ↔ pricing-fp)
- [ ] Dev guards in place if needed
- [ ] Helpers remain pure functions (no DOM access)

## Schema Validation (if data structures changed)
- [ ] Updated `/schemas/` if data format changed
- [ ] Validation passes: `npm run validate`
- [ ] Sample data in `/tmp/` for validation

## Documentation Updated
- [ ] Inline code comments added/updated
- [ ] README.md updated (if architecture/setup changed)
- [ ] ARCHITECTURE.md updated (if module responsibilities changed)
- [ ] CHANGELOG.md entry added
- [ ] WORKFLOW.md updated (if process changed)
- [ ] CONTRIBUTING.md updated (if standards changed)

## Breaking Changes
- [ ] No breaking changes
- [ ] **Breaking changes documented below**

**If breaking:**
- What breaks:
- Migration path:
- Affected users/code:

## Rollback Plan
If this Step breaks production:
1. Revert to Step [N-1]
2. [Any specific rollback steps]

## Checklist Before Merge
- [ ] All smoke checks pass
- [ ] No new linter errors
- [ ] Code formatted with Prettier
- [ ] Module boundaries respected
- [ ] Documentation updated
- [ ] Commit message follows Conventional Commits
- [ ] Step file saved with correct name
- [ ] No behavior change (unless explicitly approved)
- [ ] Reviewer approved

## Notes for Reviewers
[Any specific areas to focus on or context needed]

## Related Issues
Fixes #[issue number]  
Related to #[issue number]

---

**Reviewer Checklist:**
- [ ] Smoke check verified locally
- [ ] Code quality acceptable
- [ ] Module boundaries respected
- [ ] Documentation sufficient
- [ ] No regressions detected
- [ ] Commit message appropriate

