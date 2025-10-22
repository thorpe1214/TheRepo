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
- `Step 89E — architecture boundaries + docs (no behavior change).html`

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
open "Step 89E — architecture boundaries + docs (no behavior change).html"

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
git commit -m "feat: Step 89E - architecture boundaries + docs"
git push origin main
```

---

## Working Directory Structure

### Active Development
```
/Users/brennanthorpe/Desktop/Thorpe Management/
├── Step 89E — architecture boundaries + docs.html  ← Current stable
├── Step 89F — [next feature].html                  ← New work
├── src/js/                                          ← Shared JS modules
├── assets/                                          ← Shared assets
└── docs/                                            ← Documentation
```

### Step File Lifecycle
1. **Current Stable**: Latest verified working version (e.g., `Step 89E`)
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
feat: Step 89E - architecture boundaries + docs
fix: Step 89D - floorplan code mapping bug
refactor: Step 89C - externalize unit pricing
feat: Step 89B - externalize app boot logic
```

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

