# Revenue Management — README (Hybrid Developer + Plain English)

## 0) What this is
A self-contained web app for multifamily revenue management that runs in-browser. It produces **New** and **Renewal** pricing, plus status dashboards, from CSV uploads (rent roll, optional box score). Each property has its own **floorplan setup** (bands, buffers, codes), and all runs are reproducible and transparent.

- **Primary inputs**: Rent roll CSV (+ statuses), optional Box Score CSV.
- **Primary outputs**: Renewal offers per term, New pricing grid, and Status metrics.
- **Core principles**: math-in-UI, transparency (debug chips), reproducible runs, guardrails first, client-specific setup.

---

## 1) UI Map
Tabs:
- **Home**: Uploads, Run/Export shortcuts, Status widget.
- **Settings**: Global controls, floorplan setup (bands, buffers, names).
- **New Pricing**: Floorplan/term pricing table.
- **Renewals**: Unit-level grid with per-term offers and inline notes.
- **Charts/History**: Optional (visuals and archives).

Cards on Home:
- Rent Roll uploader (validation + mapping).
- Box Score uploader (optional).
- Run & Export.
- Status widget: trending occupancy, pacing to target, alerts.

---

## 2) Data Schema

**Rent Roll CSV** (normalized):
```js
{
  UnitID, Floorplan, Bedrooms, Status,
  LeaseStart, LeaseEnd, VacantDays,
  PreleaseStart, MoveInDate, AmenityAdj,
  CurrentRent
}
```

**Box Score CSV** (optional):
```js
{ date, leads, apps, approvals, moveInsScheduled }
```

**Config (per property)**:
```js
{
  communityTarget: 0.95,
  floorplans: {
    A1: { low: 0.92, high: 0.96, buffer: 100 },
    B2: { low: 0.91, high: 0.95, buffer: 150 },
    ...
  },
  globalCaps: { maxRaise: 10%, maxCut: -10% },
  renewal: { pctToNew: 50%, minBelow: 0%, maxBelow: 8%, minAbove: 0%, maxAbove: -10% },
  seasonality: { monthlyWeights: [...] }
}
```

---

## 3) Pricing Math (Developer)

### 3.1 Trending Occupancy
- **Formula (floorplan):**
  ```
  occ_fp = (Occupied + Preleased - OnNotice) ÷ TotalUnits_fp
  ```
- **Formula (community):**
  ```
  occ_comm = (Σ Occupied + Preleased - OnNotice) ÷ TotalUnits_comm
  ```

### 3.2 Community target
- Single % (e.g., 95%).  
- If `occ_comm < target` → blocks increases.  
- If `occ_comm > target` → suppresses or blocks decreases.  

### 3.3 Floorplan comfort bands
- Each FP has Low% and High%.  
- If `occ_fp < Low%` → downward nudge.  
- If `occ_fp > High%` → upward nudge.  
- Inside band → neutral unless conversion steering active.  

### 3.4 Hybrid logic
- Floorplans drive movement; community acts as gate + magnitude:
  - FP above band but community < target → **no increases**.  
  - FP below band but community > target → **no decreases**.  

### 3.5 Buffers
- **Stop-down buffer ($):**
  ```
  minAllowed_high = finalBase[low] + buffer_low
  if finalBase[high] < minAllowed_high → clamp to minAllowed_high
  ```
- Prevents a floorplan from dropping within X$ of the next lower-tier.  
- **Pairwise buffer (future):** ensures spacing between multiple floorplans.  

### 3.6 Global caps
- `Δ% ≤ maxRaise`  
- `Δ% ≥ maxCut`  

### 3.7 Term premiums
- Example curve: 2 months = +10%, taper linearly to 10+ months = 0%.  
- Formula:
  ```
  premium(term) = max(0, basePremium - taper*(term-2))
  ```

### 3.8 Seasonality
- Monthly multiplier applied to avoid stacking leases.  
- If month_weight > avg → add +%.  
- If month_weight < avg → subtract %.  

### 3.9 Renewals
- Case A: **Below New**
  ```
  renewal = current + pctToNew * (newPrice - current)
  renewal = clamp(renewal, current*(1+minBelow), current*(1+maxBelow))
  ```
- Case B: **At/Above New**
  ```
  renewal = current + pctToNew * (newPrice - current) // pctToNew often = 0
  renewal = clamp(renewal, current*(1+minAbove), current*(1+maxAbove))
  ```

### 3.10 Transparency
- All adjustments shown as chips: “trend +X%”, “seasonality -Y%”, “buffer clamp +$Z”, etc.

---

## 4) Status Logic

- **Trending Occupancy** = (Occupied + Preleased − OnNotice) ÷ Total.  
- **Pacing to Target** = (target - occ_comm) × total units.  
- **Alerts**:
  - Struggling floorplans (below band).  
  - Stale vacancies (30+ days).  
- **Box Score (optional):**
  - Conversion% = approvals ÷ leads.  
  - Funnel band preview.  

---

## 5) Export / Persistence

- **Exports**: CSV/XLSX for New and Renewals tables (numbers match UI).  
- **Config persistence**: currently localStorage (prototype); future SaaS → database per property.  
- **Setup validation**: mismatched floorplans between rent roll and setup → error.  

---

## 6) Implementation Notes

- Pure HTML/JS prototype.  
- Global state: `mappedRows` (rent roll), `config` (per property).  
- Functions: parse CSV, compute trending, apply pricing, render tables.  
- Defensive coding: missing values default safe/neutral.  

---

## 7) Plain English — What This Software Does

This tool helps apartment managers **set rents automatically** with confidence.

- Each property is set up once with its floorplans, target occupancies, and guardrails.  
- Managers upload a rent roll.  
- The software calculates how full each floorplan is, compares to targets, and recommends price changes.  
- **Floorplans** decide direction (raise or lower), but the **community** blocks unsafe moves.  
- Guardrails ensure:
  - Studios never price too close to 1BRs.  
  - Rents never fall below safe minimums.  
  - Increases never exceed allowed %s.  
- Renewals are handled fairly:
  - If rent is below new, renewal moves halfway toward new.  
  - If rent is above new, it can go down slightly — but never too far.  
- Managers get clear tables and notes showing *why* each price changed.

👉 The result: **higher revenue, healthier occupancy, and prices that staff and residents can understand.**

---

✅ Checkpoint: **Step 56 – Floorplan CODE Mapping & Normalization**
