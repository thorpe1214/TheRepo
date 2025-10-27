# 🚀 Next Session: Complete Step 106 Integration

## Quick Start

```bash
cd "/Users/brennanthorpe/Desktop/Thorpe Management"
git status  # Should be clean
npm run smoke  # Should pass
```

## Current Progress

✅ **Completed (Phases 1-3b):**
- TypeScript build configured
- Engine compiled to `dist/browser/`
- Engine loaded in Step 104 HTML
- Adapter functions (`__createPricingConfig`, `__createPricingContext`)
- `USE_ENGINE` flag in pricing-fp.js
- All 6 commits clean
- All tests passing

🔄 **Remaining (Phases 3c-8):**
- Wire pricing-fp.js to call engine
- Wire pricing-unit.js to call engine
- Browser test with CSV
- Verify behavior parity
- Remove legacy code
- Documentation

## Session Goal

**Wire the engine so it powers ALL pricing calculations** while maintaining 100% behavior parity.

## Step-by-Step Plan

### Phase 3c: Wire pricing-fp.js (1-2 hours)

**What to do:**

1. Open `src/js/pricing-fp.js`
2. Find where floorplan pricing is calculated
3. If `USE_ENGINE=true`:
   ```javascript
   const config = window.__createPricingConfig();
   const context = window.__createPricingContext();
   const engineResults = window.__pricingEngine.priceFloorplan(units, config, context);
   ```
4. Convert engine results to `__fpResults` format
5. Keep UI rendering exactly the same

**Key files:**
- `src/js/pricing-fp.js` - Main wiring location
- Look for: Line 700+ where `window.__fpResults.push()` happens

### Phase 4: Wire pricing-unit.js (1 hour)

**What to do:**

1. Open `src/js/pricing-unit.js`
2. Find unit pricing calculation
3. For each unit:
   ```javascript
   const result = window.__pricingEngine.priceUnit(unitState, config, context);
   ```
4. Use result's proposed rent
5. Keep display identical

### Phase 5: Browser Test (30 mins)

**What to do:**

1. Open `http://localhost:8080/steps/Step 104...html`
2. Upload `data/thorpe_gardens_200_units.csv`
3. Click "Run New"
4. Check console logs for "[RM Step 106] Engine integration ACTIVE"
5. Verify pricing tables render correctly
6. Spot-check a few units

**Expected:**
- No console errors
- Pricing looks identical to before
- Floorplan cards render
- Unit tables render

### Phase 6: Verify Parity (30 mins)

**What to do:**

1. Run before engine integration (note baseline rents)
2. Run with engine integration
3. Compare baseline rents
4. Should match exactly (within $1)

### Phase 7: Clean Up (30 mins)

**What to do:**

1. Remove legacy inline pricing
2. Keep UI rendering code
3. Remove diagnostics (keep USE_ENGINE)
4. Run tests

### Phase 8: Document & Tag (30 mins)

**What to do:**

1. Update `docs/README.md`
2. Update `docs/CHANGELOG.md`
3. Create `docs/STEP_106_SUMMARY.md`
4. Tag as `v1.06`

---

## 🎯 Key Files

```
src/js/pricing-fp.js          → Wire here
src/js/pricing-unit.js         → Wire here
steps/Step 104...html          → Engine loader (done ✅)
docs/STEP_106_STATUS.md        → Current status (done ✅)
```

---

## 🧪 Testing Checklist

- [ ] `npm run smoke` passes
- [ ] Upload CSV works
- [ ] "Run New" completes without errors
- [ ] Floorplan tables render
- [ ] Unit tables render  
- [ ] Pricing numbers match before integration
- [ ] Console logs show engine usage
- [ ] No regression in any functionality

---

## 💡 Tips

**Data Conversion:**
- Engine format: `FloorplanPricingResult`
- UI format: `__fpResults` array
- Need to map: `code`, `referenceBase`, `referenceTerm`, etc.

**Testing:**
- Keep both old and new code initially
- Toggle with `USE_ENGINE` flag
- Compare outputs
- Remove old code once verified

**Debugging:**
- Check browser console for errors
- Log engine inputs/outputs
- Compare step-by-step calculations
- Use browser debugger

---

## ⏱️ Time Estimate

- Phase 3c: 1-2 hours
- Phase 4: 1 hour
- Phase 5: 30 mins
- Phase 6: 30 mins
- Phase 7: 30 mins
- Phase 8: 30 mins
- **Total: 4-5 hours**

---

## 🎉 Success Looks Like

When done, you should have:
- ✅ Engine powers ALL pricing
- ✅ Zero behavior changes
- ✅ All tests passing
- ✅ Cleaner code
- ✅ v1.06 tagged
- ✅ Complete documentation

**Ready to continue!** 🚀

