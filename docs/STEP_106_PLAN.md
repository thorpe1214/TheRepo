# Step 106 Plan — Complete UI Integration

## 🎯 Goal

Wire the pure pricing engine into the browser UI, replacing the inline pricing calculations with calls to the engine. Maintain 100% behavior parity—no visual changes or pricing differences.

---

## 📋 Baseline

**From:** Step 105 (v1.05-beta) - Pure pricing engine complete, fully tested, documented  
**To:** Step 106 (v1.06) - Engine integrated into UI, legacy inline code removed  
**Status:** Engine ready ✅, UI integration pending 🔄

---

## 🧬 Surgical Approach (Following Step 105 Pattern)

### Principles
1. **Surgical Changes** - Modify only what's necessary, preserve behavior
2. **Test-Drive** - Verify each change with browser tests
3. **Incremental** - One phase at a time, commit after each phase
4. **Preserve Structure** - Keep existing UI flow and DOM manipulation
5. **Zero Behavior Change** - Math must be identical, output must match exactly

### Method
1. Phase by phase (8 phases)
2. Run tests after each phase
3. Commit frequently (atomic commits)
4. Document as we go
5. Measure before/after for verification

---

## 📦 Phase 1: Set Up TypeScript Build for Browser

**Goal:** Compile `engine.ts` → `engine.js` that can be loaded in browser

**Tasks:**
1. Update `tsconfig.json` to output ES2020 modules for browser
2. Add build script to package.json
3. Compile engine to `dist/browser/engine.js`
4. Test that it can be imported in browser context

**Success Criteria:**
- ✅ Engine compiles cleanly
- ✅ Output is single browser-compatible file
- ✅ Can be loaded via `<script>` tag

---

## 📦 Phase 2: Load Engine in Step 104 HTML

**Goal:** Add compiled engine to Step 104 HTML file

**Tasks:**
1. Add `<script src="../dist/browser/engine.js">` to Step 104
2. Initialize engine globally: `window.__pricingEngine = { ... }`
3. Expose adapter: `window.__createPricingConfig`, etc.
4. Test that `window.__pricingEngine` is accessible

**Success Criteria:**
- ✅ Engine loads without errors
- ✅ Global functions available on window
- ✅ Console shows "Engine loaded" message

---

## 📦 Phase 3: Wire pricing-fp.js to Call Engine

**Goal:** Replace inline pricing in `renderNewLease()` with engine calls

**Tasks:**
1. Read current `renderNewLease()` logic
2. Build config using `window.__createPricingConfig()`
3. Build context using `window.__createPricingContext()`
4. Call `window.__priceFloorplans(config, context)`
5. Convert engine results to existing `__fpResults` format
6. Keep UI rendering exactly the same

**Success Criteria:**
- ✅ Floorplan cards render identically
- ✅ Baseline rents match (before/after comparison)
- ✅ Reference terms and prices unchanged
- ✅ No console errors

---

## 📦 Phase 4: Wire pricing-unit.js to Call Engine

**Goal:** Replace inline unit pricing with engine calls

**Tasks:**
1. Read current unit pricing logic
2. For each unit, call `window.__priceUnit(unit, config, context)`
3. Convert engine results to existing unit display format
4. Keep amenities, term pricing, deltas the same

**Success Criteria:**
- ✅ Unit tables render identically
- ✅ Proposed rents match (before/after comparison)
- ✅ Term prices unchanged
- ✅ Amenity adjustments still apply

---

## 📦 Phase 5: Browser Test with Real CSV

**Goal:** Test end-to-end with actual rent roll

**Tasks:**
1. Load Step 104 HTML in browser
2. Upload `thorpe_gardens_200_units.csv`
3. Click "Run New"
4. Verify dashboard stats update
5. Check floorplan pricing tables
6. Check unit pricing tables
7. Spot-check several units for accuracy

**Success Criteria:**
- ✅ CSV uploads successfully
- ✅ All floorplans render with correct baselines
- ✅ All units render with correct proposed rents
- ✅ Term pricing is correct
- ✅ Deltas make sense

---

## 📦 Phase 6: Verify Pricing Matches Exactly

**Goal:** Ensure engine output matches legacy output

**Tasks:**
1. Run pricing with engine (after changes)
2. Capture baseline rents for each floorplan
3. Compare to previous run (before changes)
4. Verify they match exactly
5. Document any differences (should be zero)

**Success Criteria:**
- ✅ All baseline rents match (within $1)
- ✅ All unit rents match (within $1)
- ✅ All term pricing matches
- ✅ No unexplained differences

---

## 📦 Phase 7: Remove Legacy Inline Pricing Logic

**Goal:** Clean up old code, keep only engine calls

**Tasks:**
1. Remove inline trend calculations from pricing-fp.js
2. Remove inline cap/floor logic
3. Remove inline conversion nudge logic
4. Keep UI rendering code (DOM manipulation)
5. Keep helper functions (formatMoney, etc.)

**Success Criteria:**
- ✅ Code is cleaner (less duplication)
- ✅ Pricing still works correctly
- ✅ No performance regression
- ✅ Tests still pass

---

## 📦 Phase 8: Documentation & Release

**Goal:** Document integration, tag release

**Tasks:**
1. Update README.md with engine integration notes
2. Update CHANGELOG.md with Step 106 details
3. Create STEP_106_SUMMARY.md
4. Run full test suite
5. Tag as v1.06

**Success Criteria:**
- ✅ All documentation updated
- ✅ All tests passing
- ✅ Tag created and pushed
- ✅ Summary of changes documented

---

## 🔧 Technical Details

### Build Setup

**tsconfig.json changes:**
```json
{
  "compilerOptions": {
    "module": "ES2020",      // ← Change from "commonjs"
    "outDir": "./dist/browser",
    "target": "ES2020",
    "lib": ["ES2020", "DOM"]
  }
}
```

**package.json build script:**
```json
{
  "scripts": {
    "build:engine": "tsc src/pricing/engine.ts --outDir dist/browser --module ES2020"
  }
}
```

### Integration Pattern

**pricing-fp.js (before):**
```javascript
let baseCand = baseVal * (1 + dirVal) * seas;
if (dirVal < 0) baseCand = Math.max(baseCand, baseVal * (1 - cfg.maxWeeklyDec));
```

**pricing-fp.js (after):**
```javascript
const config = window.__createPricingConfig();
const context = window.__createPricingContext();
const fpResults = window.__priceFloorplans(config, context);
// Convert fpResults to __fpResults format
```

### Data Flow

```
UI (pricing-fp.js)
  ↓ (calls)
Adapter (pricing-engine-adapter.js)
  ↓ (calls)
Engine (dist/browser/engine.js)
  ↓ (returns)
Adapter (converts to UI format)
  ↓ (returns)
UI (renders to DOM)
```

---

## 🧪 Testing Strategy

### Before Starting
1. Run full test suite: `npm test`
2. Note baseline rents for key floorplans
3. Screenshot floorplan pricing tables
4. Screenshot unit pricing tables

### After Each Phase
1. Run tests: `npm test`
2. Load browser: `open steps/Step\ 104*.html`
3. Upload CSV, verify pricing
4. Compare to baseline

### Acceptance Criteria
- ✅ All smoke tests pass
- ✅ All pricing tests pass
- ✅ Rent numbers unchanged
- ✅ UI looks identical
- ✅ No console errors

---

## 📊 Success Metrics

### Code Quality
- ✅ Zero linting errors
- ✅ All tests passing
- ✅ No performance regression
- ✅ Cleaner code (less duplication)

### Functionality
- ✅ Pricing identical to legacy
- ✅ UI unchanged
- ✅ CSV upload works
- ✅ Dashboard stats work

### Architecture
- ✅ Engine powers all pricing
- ✅ UI is pure presentation
- ✅ Adapter bridges cleanly
- ✅ Ready for simulator mode

---

## ⚠️ Risks & Mitigations

### Risk: Build Tooling Issues
**Mitigation:** Keep legacy code side-by-side until engine works, then remove

### Risk: Performance Regression
**Mitigation:** Profile before/after, optimize if needed

### Risk: Behavior Differences
**Mitigation:** Extensive before/after comparison, test every floorplan

### Risk: TypeScript Complexity
**Mitigation:** Incremental approach, one module at a time

---

## 📝 Documentation Deliverables

1. **STEP_106_SUMMARY.md** - Complete integration summary
2. **Updated README.md** - Engine now powers UI
3. **Updated CHANGELOG.md** - Step 106 release notes
4. **Integration guide** - How engine connects to UI

---

## 🎯 Final Goal

**Complete UI integration where:**
- Engine powers all pricing calculations
- UI is pure presentation layer
- Zero behavior changes
- Code is cleaner and more maintainable
- Ready for simulator mode
- Fully documented

---

**Estimated Time:** 6-8 hours  
**Complexity:** Medium (build tooling)  
**Risk:** Low (engine already tested, UI preserved)  
**Value:** High (complete architecture, ready for simulator)

