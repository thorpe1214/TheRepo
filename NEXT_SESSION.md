# 🚀 Next Session: Resume Step 105

## Quick Start

```bash
cd "/Users/brennanthorpe/Desktop/Thorpe Management"
git checkout feat/step-105-pricing-engine
git log --oneline -5
```

## Current Status

**Branch:** `feat/step-105-pricing-engine` (LOCAL ONLY - not pushed)  
**Test Results:** 11/12 passing (92%)  
**Phase Complete:** 1, 2, 4a  
**Phase Remaining:** 4b (fix bugs), 3 (UI), 5 (docs)

## What to Do First

### 1. Read the Progress Report (5 mins)
```bash
cat docs/STEP_105_PROGRESS.md
```

This file has EVERYTHING:
- What's done
- What's broken
- How to fix it
- Full debugging strategies

### 2. Run Tests to See Failures (1 min)
```bash
npm test -- tests/pricing/engine.spec.ts
```

You'll see 5 failing tests with exact error messages.

### 3. Fix Bugs (2-3 hours)

**Bug 1 & 2: Inside-band trend calculation**
- File: `src/pricing/engine.ts` 
- Function: `computeTrendMove()` (lines ~50-120)
- Fix: Add dead zone for inside comfort band
- Test: Fixtures 2 & 3

**Bug 3: Floor enforcement flag**
- File: `src/pricing/engine.ts`
- Function: `applyFloor()` (lines ~380-420)
- Fix: Ensure flag is set when floor applied
- Test: Fixture 4

**Bug 4 & 5: Carry-forward baseline**
- File: `src/pricing/engine.ts`
- Function: `determineBaseline()` (lines ~200-260)
- Fix: Use carry-forward baseline correctly
- Test: Fixtures 5 & 30-day simulation

### 4. Verify All Green (1 min)
```bash
npm test -- tests/pricing/engine.spec.ts
# Should show: 12/12 passing ✅
```

### 5. Commit Fixes
```bash
git add src/pricing/engine.ts
git commit -m "fix(engine): All tests passing - ready for UI integration

- Fix inside-band trend calculation (dead zone)
- Fix floor enforcement flag setting
- Fix carry-forward baseline usage
- All 12 tests now passing"
```

## Then Continue to UI Integration

See `docs/STEP_105_PROGRESS.md` for Phase 3 plan.

---

**Time Estimate:** 
- Fix bugs: 2-3 hours
- UI integration: 4-6 hours  
- Documentation: 1-2 hours
- **Total remaining: 7-11 hours**

**When Done:** Push branch, open PR, merge, tag v1.05

---

Good luck! The hard part (architecture) is done. Now it's debugging + wiring. 🎯

