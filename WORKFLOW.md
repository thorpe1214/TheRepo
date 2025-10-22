# Development Workflow

## Team Roles

### 👤 **User** (Visionary/Operator)
- Defines the vision and requirements
- Provides domain expertise (revenue management, property operations)
- Reviews and approves each step before moving forward
- Makes final decisions on feature priorities and UX

### 🤖 **ChatGPT** (Prompter/Project Manager)
- Translates vision into clear, actionable prompts
- Breaks down complex features into small steps
- Provides context and constraints to Cursor
- Reviews Cursor's work for completeness and accuracy

### 💻 **Cursor** (Coder/Implementation)
- Implements changes based on prompts
- Maintains code quality and consistency
- Runs tests and verifies functionality
- Documents changes in code and architecture

---

## The One-Small-Step Rule

### Core Principle
**Each change produces exactly ONE new Step file** that represents a complete, working state of the application.

### Step Naming Convention
```
Step [N] — [brief description].html
```

Examples:
- `Step 87 — Unit term detail box + right-side toggle.html`
- `Step 89E — Stable Baseline (manual testing).html`

### What Constitutes a "Step"?
✅ **Good Steps** (atomic, testable):
- Externalize a single module (e.g., pricing helpers)
- Add one UI component (e.g., search filter)
- Fix one specific bug (e.g., floorplan code mapping)
- Add one feature (e.g., CSV upload validation)

❌ **Bad Steps** (too large, risky):
- Refactor entire codebase at once
- Add multiple unrelated features
- Change behavior without documenting
- Mix refactoring with feature addition

---

## Step-by-Step Process

### 1. Planning Phase
```
User → ChatGPT: "I want to add [feature/fix]"
ChatGPT → Cursor: "Step N — [specific task]"
```

**ChatGPT prepares:**
- Clear objective for the step
- List of files to modify
- Expected behavior (before/after)
- Acceptance criteria

### 2. Implementation Phase
```
Cursor receives prompt → Implements → Saves new Step file
```

**Cursor must:**
- ✅ Read relevant source files
- ✅ Make targeted changes only
- ✅ Preserve existing functionality (unless explicitly told to change)
- ✅ Update inline documentation
- ✅ Save as new Step N file
- ✅ Test the changes

### 3. Smoke Check Phase
**Before committing, verify:**

```bash
# 1. Open the new Step file in browser
open "Step 89E — Stable Baseline (manual testing).html"

# 2. Run manual smoke test checklist
# (See CONTRIBUTING.md for full checklist)
```

**Critical checks:**
- [ ] Page loads without errors
- [ ] CSV upload works
- [ ] Floorplan pricing renders
- [ ] Unit pricing renders
- [ ] Settings persist
- [ ] No console errors
- [ ] Previous functionality intact

### 4. Commit Phase
**Only after smoke check passes:**

```bash
git add .
git commit -m "feat: Step 89E - stable baseline for manual testing"
git push origin main
```

---

## Working Directory Structure

### Active Development
```
/Users/brennanthorpe/Desktop/Thorpe Management/
├── Step 89E — Stable Baseline (manual testing).html  ← Current stable
├── Step 89F — [next feature].html                  ← New work
├── src/js/                                          ← Shared JS modules
├── assets/                                          ← Shared assets
└── docs/                                            ← Documentation
```

### Step File Lifecycle
1. **Current Stable**: Latest verified working version (e.g., `Step 89E — Stable Baseline`)
2. **In Progress**: New file being developed (e.g., `Step 89F`)
3. **Archive**: Previous steps kept for history (never deleted)

---

## Development Workflow Diagram

```
┌─────────────┐
│   Vision    │ User defines feature/fix
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Prompt    │ ChatGPT breaks down into step
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Implement  │ Cursor codes the change
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Smoke Check │ Test all critical paths
└──────┬──────┘
       │
       ├─ PASS ──→ Commit & push
       │
       └─ FAIL ──→ Fix & retest
```

---

## Smoke Check Requirements

### Minimum Tests (Every Step)
1. **Load Test**: Page loads without JavaScript errors
2. **Upload Test**: CSV file uploads and maps columns
3. **Render Test**: Both pricing views render correctly
4. **Persist Test**: Settings save to localStorage
5. **Console Test**: No red errors in developer console

### Conditional Tests (Feature-Specific)
- **New UI**: Verify all interactive elements work
- **Data Change**: Verify calculations produce correct results
- **Refactor**: Verify zero behavior change
- **Bug Fix**: Verify specific bug is resolved

---

## Emergency Rollback

If a step breaks functionality:

```bash
# 1. Identify last working step
# 2. Copy that file as the new current
cp "Step 89D — floorplan pricing externalized.html" \
   "Step 89E — revert broken changes.html"

# 3. Document what went wrong
# 4. Plan corrective step
```

**Never:**
- ❌ Edit Step files after they're committed
- ❌ Delete broken Step files (rename with `_BROKEN` suffix)
- ❌ Force push to main branch

---

## Communication Protocol

### User → ChatGPT
**Request Format:**
```
"I want to [specific goal]. 
Context: [any constraints or preferences].
Expected outcome: [what success looks like]."
```

### ChatGPT → Cursor
**Prompt Format:**
```
**Step N — [Title]**

**Context**: [What we're building on]
**Goal**: [Specific objective]
**Files to modify**: [Exact list]
**Expected behavior**: [Before/after comparison]
**Constraints**: [Any rules/limits]
**Deliverable**: Save as "Step N — [title].html"
```

### Cursor → User (via ChatGPT)
**Completion Format:**
```
✅ Step N completed
📝 Summary: [What was changed]
🔍 Files modified: [List]
✨ New functionality: [Description]
⚠️ Notes: [Any caveats or follow-ups]
```

---

## Best Practices

### Do's ✅
- **Start small**: One feature/fix per step
- **Test thoroughly**: Run full smoke check before commit
- **Document clearly**: Update inline comments and docs
- **Preserve history**: Keep all Step files
- **Communicate**: Ask questions if prompt is unclear

### Don'ts ❌
- **Don't rush**: Skip smoke check
- **Don't combine**: Multiple unrelated changes in one step
- **Don't assume**: Test even "simple" changes
- **Don't delete**: Previous Step files or working code
- **Don't break**: Existing functionality without explicit approval

---

## Version Control Strategy

### Branch Structure
```
main              ← Stable, tested steps only
└── feature/...   ← (Future) For experimental work
```

### Commit Strategy
- **One commit per Step**: Each Step file = one commit
- **Conventional commits**: Use standardized prefixes (see CONTRIBUTING.md)
- **Descriptive messages**: Reference Step number and brief description

### Example Commit History
```
feat: Step 89E - stable baseline for manual testing
fix: Step 89D - floorplan code mapping bug
refactor: Step 89C - externalize unit pricing
feat: Step 89B - externalize app boot logic
```

### Promote to Stable

When a Step represents a significant milestone and all tests pass, promote it to a stable release:

#### 1. Update Documentation
```bash
# Update README.md "Current stable" reference
# Change from: Step 89E — Stable Baseline (manual testing).html
# To:          Step 90 — Repo hygiene & guardrails upgrade.html
```

#### 2. Update CHANGELOG.md
Add an entry documenting what changed:
```markdown
## [1.1.0] - 2025-10-23

### Added - Step 91: Export to Excel
- Export pricing to Excel spreadsheet
- Downloadable format for operators
- Preserves formatting and calculations

### Changed
- No behavior changes in pricing logic
```

#### 3. Tag the Release
```bash
# Create an annotated tag with detailed release notes
git tag -a v1.1.0-stable -m "Stable Release: Step 91 with Excel export

Features:
- Excel export functionality
- All smoke tests passing
- Documentation updated

Breaking Changes:
- None

Known Issues:
- Large datasets (>500 units) may be slow"

# Push tag to GitHub
git push origin main --tags
```

#### 4. Never Edit Old Steps
**Important**: Once a Step is committed and tagged:
- ❌ Never modify the Step file itself
- ✅ Create a new Step for fixes/changes
- ✅ Keep old Steps for historical reference
- ✅ Update README to point to latest stable

#### 5. Stable Release Checklist
Before tagging as stable:
- [ ] All smoke tests pass (`npm run test`)
- [ ] Manual smoke check completed
- [ ] Code quality checks pass (`npm run lint`, `npm run format:check`)
- [ ] Module boundary tests pass (`npm run test:boundaries`)
- [ ] README updated with new "Current stable" reference
- [ ] CHANGELOG.md updated with release notes
- [ ] No console errors in browser
- [ ] Previous functionality verified intact
- [ ] Documentation reflects current state

#### 6. Versioning Convention
Use [Semantic Versioning](https://semver.org/):
- **Major** (v2.0.0): Breaking changes, major architecture shifts
- **Minor** (v1.1.0): New features, no breaking changes
- **Patch** (v1.0.1): Bug fixes only

#### Example: Promoting Step 90
```bash
# 1. Update README.md
sed -i '' 's/Step 89E/Step 90/g' README.md

# 2. Add CHANGELOG entry
cat >> CHANGELOG.md << 'EOF'

## [1.0.0] - 2025-10-22

### Added - Step 90: Repo hygiene & guardrails upgrade
- Playwright smoke tests
- ESLint and Prettier
- JSON schemas for data validation
- PR template and workflow docs
EOF

# 3. Commit documentation updates
git add README.md CHANGELOG.md
git commit -m "docs: promote Step 90 to stable v1.0.0"

# 4. Tag the release
git tag -a v1.0.0-stable -m "Stable baseline with testing infrastructure"

# 5. Push to GitHub
git push origin main --tags
```

---

## CI Quality Gates

### Automated Checks on Every PR

All pull requests to `main` must pass automated quality gates via GitHub Actions:

**CI Workflow** (`.github/workflows/ci.yml`):
```bash
✓ ESLint: Code quality and style checks
✓ Schema Validation: JSON data structure validation (optional)
✓ Smoke Tests: End-to-end Playwright tests
```

**Status**: Pull requests show a "quality-gates" check that must be green before merging.

**Runtime**: ~3-4 minutes on GitHub runners

### What Gets Checked

1. **ESLint (`npm run lint`)**
   - Checks all `.js` and `.ts` files for code quality issues
   - Enforces consistent code style
   - Catches common JavaScript errors

2. **Schema Validation (`npm run validate`)**
   - Validates sample JSON data against schemas
   - Optional: continues even if no sample data exists
   - Ensures data structure consistency

3. **Smoke Tests (`npm run smoke`)**
   - Opens Step file in browser
   - Uploads sample CSV
   - Verifies floorplan and unit pricing render
   - Checks renewals generate successfully
   - Detects console errors

### When CI Fails

If a PR fails CI checks:

1. **Review the failure**
   - Click on the "Details" link in the PR check
   - Look at the specific step that failed

2. **Common failures:**
   - **Lint fails**: Fix code style issues locally with `npm run lint:fix`
   - **Smoke test fails**: Download the Playwright report artifact to see screenshots
   - **Schema validation fails**: Update schemas or sample data

3. **Fix and re-push**
   ```bash
   # Fix the issue locally
   npm run lint:fix
   npm run smoke  # Test locally
   
   # Commit and push fix
   git add .
   git commit -m "fix: resolve CI failure"
   git push origin feature/your-branch
   ```

4. **Download test artifacts**
   - If smoke tests fail, GitHub uploads a Playwright report
   - Find it in the "Artifacts" section of the failed workflow run
   - Download and view `playwright-report/index.html` locally

### Running CI Checks Locally

Before opening a PR, run the same checks locally:

```bash
# Run the exact same commands as CI
npm run lint && npm run validate && npm run smoke

# Or run individually
npm run lint        # ESLint
npm run validate    # Schema validation
npm run smoke       # Playwright tests
```

**Pro tip**: Add this to your pre-commit workflow to catch issues early.

### CI Badge

The README displays a CI badge showing the current status of the `main` branch:

[![CI Quality Gates](https://github.com/thorpe1214/Revenue-Management-System/actions/workflows/ci.yml/badge.svg)](https://github.com/thorpe1214/Revenue-Management-System/actions/workflows/ci.yml)

- **Green**: All checks passing
- **Red**: One or more checks failing
- **Yellow**: Checks running

---

## Quality Gates

### Before Starting a Step
- [ ] Clear understanding of the requirement
- [ ] Prompt includes all necessary context
- [ ] Acceptance criteria defined

### During Implementation
- [ ] Changes limited to scope of Step
- [ ] No accidental modifications to unrelated code
- [ ] Inline comments updated
- [ ] Code follows existing patterns

### Before Committing
- [ ] All smoke checks pass
- [ ] No console errors
- [ ] Previous functionality verified intact
- [ ] New Step file saved with correct name

---

## Troubleshooting

### "Step seems too big"
**Solution**: Break into multiple sub-steps
```
Step 89F-1: [Part 1]
Step 89F-2: [Part 2]
Step 89F-3: [Part 3]
```

### "Smoke check failing"
**Solution**: 
1. Check browser console for errors
2. Verify all files loaded correctly
3. Compare with previous working Step
4. Fix issue and re-test

### "Unsure about implementation"
**Solution**: 
1. Cursor asks clarifying questions
2. ChatGPT provides additional context
3. User makes final decision

---

## Success Metrics

### Quality Indicators
- ✅ All steps pass smoke check on first try
- ✅ Zero regressions in existing functionality
- ✅ Clear commit history with descriptive messages
- ✅ Documentation stays up-to-date

### Red Flags 🚩
- ❌ Skipped smoke checks
- ❌ Console errors ignored
- ❌ Vague commit messages
- ❌ Documentation out of sync with code

---

## Continuous Improvement

### Retrospective Questions
After every 5-10 steps, review:
1. Are steps the right size?
2. Is smoke check catching issues?
3. Is communication clear?
4. Are we maintaining velocity?

### Process Updates
- Document lessons learned
- Update WORKFLOW.md as needed
- Share insights with team

---

*"Slow is smooth, smooth is fast. One small step at a time."*

