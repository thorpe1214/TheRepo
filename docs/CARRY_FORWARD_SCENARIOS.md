# Carry-Forward Mode & Scenario Simulator

This document defines how **Carry-Forward Mode** and the **Scenario Simulator** should be implemented in the Revenue Management System.

---

## 1. Carry-Forward Mode

### Purpose
Carry-forward mode ensures that each run's **final floorplan baselines** become the **starting rents** for the next run, rather than reverting to original seed values.

This creates compounding rent adjustments over time, better reflecting real-world revenue management.

### Behavior
- After each run, persist a map of final floorplan baselines (by code).  
- On the next run, if a prior baseline exists for the current property/scenario, it overrides the seed values.  
- Renewals continue to anchor to **current rent** in the rent roll, but the "new rent target" they move toward is based on the carried-forward FP baseline.

### Storage
Persist in localStorage (scoped by property & scenario):
```json
{
  "lastRun": {
    "fpBaselines": { "S0": 1530, "A1": 1795, "B2": 2320 },
    "at": "2025-10-21T16:44:28Z",
    "scenario": "Scenario A"
  }
}
```

### Edge Cases
- **New floorplan code**: initialize from seed for that FP.  
- **Removed floorplan**: drop from persisted baselines.  
- **Mapping change**: warn if stored FP codes don’t match uploaded roll.  
- **Property switch**: carry-forward state is scoped per property.  

### Reset
Provide a reset option in Settings → “Reset baselines to seed values.”

---

## 2. Scenario Simulator

### Purpose
The simulator allows fast-forward testing (e.g., simulate weeks/months in a single day) by stepping through **snapshots** while carrying forward baseline rents.

### Core Concepts
- **Snapshot** = one rent roll upload (with label like `2025-W07` or `2025-02`).  
- **Scenario** = a sequence of snapshots (A/B test branches allowed).  
- Each scenario has its own carry-forward chain.

### UI
Minimal ribbon in the app header or History tab:
```
[Scenario ▾] [◀ Previous | Label | Next ▶] [Run] [Autosave] [Export/Import]
```

### Data Flow
1. Select Scenario.  
2. Load snapshot (rent roll).  
3. Run New Pricing.  
4. Carry forward FP baselines.  
5. Save result to History.  
6. Repeat for next snapshot.  

### Storage
Scenarios and snapshots are persisted in localStorage:
```json
{
  "scenarios": {
    "A": {
      "snapshots": [
        { "label": "2025-W01", "fpBaselines": {...} },
        { "label": "2025-W02", "fpBaselines": {...} }
      ]
    },
    "B": { ... }
  }
}
```

### Export/Import
- Allow export of all scenarios as JSON.  
- Allow import to restore state or share across users.  

---

## 3. Future Levers (off by default)

- **Max Δ% per run**: limit FP baseline movement to X% up/down.  
- **Freeze FP**: checkbox to hold a floorplan’s baseline.  
- **Scenario branching**: copy a snapshot to start a new scenario branch.  

---

## 4. Acceptance Criteria

- Each run uses prior FP baselines as starting point (carry-forward).  
- History shows compounding baseline changes over multiple runs.  
- Scenario labels are shown in UI.  
- Reset button restores seed baselines.  
- Export/Import JSON round-trips scenarios successfully.  

---

## 5. Why This Matters

This upgrade transforms the tool from a **static calculator** into a **dynamic simulator**.  
Operators can now see not only “what happens this run” but “how prices evolve over time.”

