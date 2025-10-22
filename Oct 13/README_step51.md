
# Revenue Management — README (MVP Upload Edition)

## 0) What this is
A self-contained, client-side web app for multifamily revenue management that runs from a single HTML file. It produces **New** and **Renewal** pricing and a **Status** dashboard from CSV uploads (rent roll, optional box score). Integrations (PMS APIs) are deferred to a Pro tier.

- **Primary inputs**: Rent roll CSV (+ statuses), optional **Box Score CSV** (leads/apps/approvals).
- **Primary outputs**: Renewal offers per term, optional New pricing, and Status-at-a-Glance KPIs/alerts. CSV export mirrors UI.
- **Core principles**: math-in-UI (transparent), reproducible runs, guardrails first, every change saved as a new “Step NN” file.

---

## 1) UI Map

Tabs:
- **Home**: Uploads, Run & Export shortcuts, **Status at a Glance** (forward-looking).
- **Settings**: Global strategy, seasonality, renewals controls, and **Funnel (Display) + Lever (Preview)** settings.
- **New Pricing**: (present if your build includes it) floorplan/term pricing table.
- **Renewals**: Unit-level renewal grid with per-term offers and debug notes.
- **Charts/History**: Optional visualizations / past runs (stub ok).

Cards on **Home**:
- **Upload Rent Roll** → parse/mapping → exposes live counts (occupied, on-notice, preleased, floorplans, stale).
- **Upload Box Score (optional)** → parse/mapping → feeds approvals7d, conversion band, and a multiplier **preview**.
- **Run & Export**: buttons for New & Renew.
- **Status at a Glance** (forward-first):
  - **Trending Occupancy** (headline: evergreen projection)
  - **Pacing to Target** (gap pp + homes needed)
  - **Undecided Renewals (30d)**
  - **Leasing Pacing (7d)** (shows source pill + funnel band + multiplier preview)
  - Alerts: **Struggling Floorplans** (projected < target) and **Stale Vacancies (≥30d)**

---

## 2) Data Schema (internal, client-side)

**From Rent Roll CSV** (mapped via UI; flexible headers):
```
UnitID, Floorplan, Status, LeaseEnd, VacantDays, Price(New), ...
PreleaseStart (optional true/false or date)
```
- `Status` buckets: **Occupied**, **On Notice**, **Vacant**, **Preleased** flag (inferred via `PreleaseStart` if present).
- A row is normalized into:
```js
{
  UnitID, Floorplan, Status, LeaseEnd, VacantDays,
  PreleaseStart, Price, // etc.
}
```
Stored as `window.mappedRows`.

**From Box Score CSV** (optional):
```
Date, Leads, Applications, Approvals, (optional) Denials, MoveInsScheduled
```
Normalized to:
```js
{ __date, __leads, __apps, __approvals /* +others if mapped later */ }
```
Stored as `window.boxScoreRows`.

**Global Config (persisted in localStorage)**:
```js
{
  // Strategy / Seasonality
  comfortTarget: 0.95,  // “Target Occupancy”
  // Renewals
  renPctToNew, renMinBelow, renMaxBelow, renMinAbove, renMaxAbove,
  renApplyGuardrailsAllTerms: false, // max% guardrail applies per term only when enabled
  // Status widget defaults
  convToMoveIn: 0.82,
  // Funnel (Display) settings (Step 49+)
  fs_windowDays: 28,
  fs_minLeads: 50,
  fs_thrWeak: 20,
  fs_thrCautious: 30,
  // Funnel Lever (Preview only, Step 51)
  fs_mulWeak: 0.2,
  fs_mulCautious: 0.5,
  fs_mulWatch: 0.8,
  fs_mulHealthy: 1.0,
  fs_useLever: false
}
```

---

## 3) Status-at-a-Glance — Logic

### 3.1 Trending Occupancy (Evergreen)
\[\n\\text{TrendingOcc}=\\frac{\\text{OccupiedNow}+\\text{Preleased}-\\text{OnNotice}}{\\text{TotalUnits}}\n\]
- **Today’s Occ** = OccupiedNow / TotalUnits (context only).
- **Color**: Green if TrendingOcc ≥ Target; Red otherwise.

#### How counts are derived from Rent Roll
- `OccupiedNow`: `Status` begins with “occupied” or includes “notice”.
- `OnNotice`: `Status` contains “notice”.
- `Preleased`: `PreleaseStart` present; clamped to ≤ (Vacant + OnNotice).
- `TotalUnits`: `mappedRows.length`.

### 3.2 Pacing to Target
\[\n\\text{GapPP}=(\\text{TargetOcc}-\\text{TrendingOcc})\\times 100\n\]\n\[\n\\text{HomesNeeded}=\\left\\lceil \\text{TotalUnits}\\times \\max(\\text{GapPP},0)/100\\right\\rceil\n\]
- **Color**: Green if GapPP ≤ 0; Red if > 0.

### 3.3 Undecided Renewals (30d)
- Minimal upload MVP: `expiring30d` = leases with `LeaseEnd ≤ today+30d`.
- `undecided30d` = `expiring30d` (until we ingest a renewal-status report).
- Tile color: Red if `undecided30d / expiring30d ≥ 0.4`.

### 3.4 Leasing Pacing (7d)
- From **Box Score** when uploaded (preferred); else stays neutral.
- `approvals7d = sum(Approvals last 7 days)`
- `convToMoveIn`:\n  - If box score uploaded: `conv28 = Approvals/Leads` over rolling **windowDays** (default 28d), min sample **minLeads**; else fallback to settings default (0.82).\n- `pacingPP ≈ 100 * (approvals7d * convToMoveIn * 30/7) / TotalUnits` (UI display only).\n- **Pills on tile:**\n  - **Source**: “Box Score” vs “Manual/None”.\n  - **Funnel Band**: **Weak**, **Cautious**, **Watch**, **Healthy** based on thresholds; label shows `(X%, n=leads, Nd)`. Display-only.\n  - **Multiplier (Preview)**: maps band to **raises ×M** preview using `fs_mul*`. **No pricing impact yet**.

### 3.5 Alerts
- **Struggling Floorplans**: compute `TrendingOcc` per floorplan; list those `< Target`, sorted by gap.\n- **Stale Vacancies**: units with `VacantDays ≥ 30`, top 5 by age.

---

## 4) Renewals — Algorithm (current shipped logic)

**Goal**: Generate renewal offers per lease term. Apply **renewal math** to compute **base rent** (no term premiums), **then** add premiums/seasonality to each term. Guardrails can cap **max% per term** (when enabled).

### Inputs per unit
- `current` rent, `todayNew` (new lease price baseline for this unit/floorplan), settings:\n  - `pctToNew` (when below new), `renMinBelow`, `renMaxBelow`\n  - `renMinAbove`, `renMaxAbove` (can be negative to allow decreases)\n  - `allowDecrease` toggle\n  - term premiums curve (2–9 mo short-term premiums; 10–14 mo zero premium by default)\n  - seasonality curve (optional, applied after term premium)\n  - guardrails toggle: **Apply to All Terms** means **max% cap per term only** (we do not clamp base by guardrails unless enabled for terms)

### Step A — Compute **Base** (no premiums)
- **Case 1: Below New** (`current < todayNew`)\n  \n  targetBase = current + clamp((todayNew - current)*pctToNew, minBelow%, maxBelow%) of current\n\n- **Case 2: Above New** (`current ≥ todayNew`)\n  - If `allowDecrease` is ON and `renMaxAbove` is **negative**, allow a decrease toward new:\n    \n    Δ = (todayNew - current)*pctToNew  (Δ ≤ 0)\n    \n    Clamp change to `[renMinAbove%, renMaxAbove%]` of current (both may be negative).\n  - Else, hold or small increase per min/max above-new (often 0/0 meaning hold).\n\n**Order-aware clamp**: compute the raw target then apply % bounds relative to **current**; do not overshoot beyond the allowed percent.

### Step B — Apply **Term math** to derive each term’s **Offer**
- **Offer(term)**:\n  1) Start from **Base** (A).\n  2) Add **term premium** (e.g., 2 mo +8%, 3 mo +7% … 10–14 mo +0%).\n  3) Add **seasonality %** (if any).\n  4) If **guardrails to all terms** is **ON**, apply **max% cap** (per term) vs **current** only on the final per-term increase. (No min guardrail on terms; max only.)\n- Notes column shows: `term premium X% & over cap (k) Y% & seasonality Z% = total W% → applied V%`.\n\n### Examples (common settings)\n- `pctToNew=50%`, `renMaxBelow=10%`, `allowDecrease=ON`, `renMaxAbove = -10%`\n  - If `current=1700`, `new=1500` → Base moves **down** toward 1500 by **50% of the gap** (−100) but clamped by **max above-new = −10%** ⇒ min allowed price 1530. Term premiums then scale from that base.

---

## 5) New Pricing — (scaffold & future)
- A simple, floorplan-level price can be seeded; short-term adders/seasonality mirror renewals’ term logic once base exists.\n- **Forward path** (later): floorplan “health nudge” (seed ± small slope by occupancy vs target) bounded by floors/ceilings and spread rules. Not implemented yet in the MVP file.

---

## 6) Guardrails & Floors (recommended philosophy)
- **Hard $ floor/ceiling**: never price beyond these (per FP; optional).\n- **Relative caps** (per cycle): **Max Raise %**, **Max Cut %** vs last published or vs current (we use vs current for renewals).\n- **Per-term guardrails**: only **max%** on the final term price (when enabled).\n- **Spread rules** (later): ensure minimum $ gaps between floorplans; adjust non-anchor FP minimally.

---

## 7) Box Score & Funnel Lever

### Box Score uploader (Step 47)
- Adds a Home card to upload CSV, map date/leads/apps/approvals, and compute:
  - `approvals7d`, `conv28 (lead→approval)`, sample size.
- Feeds Status widget only (no pricing).

### Funnel Band (Step 48–50)
- Settings define rolling window (default 28d), min sample (50 leads), and thresholds for **Weak** (<20%), **Cautious** (<30%), then **Watch** (<40%), else **Healthy**.\n- Status tile shows band pill with color and label.\n- Generates a **multiplier preview** (Step 51):\n  - Weak×0.2, Cautious×0.5, Watch×0.8, Healthy×1.0 (defaults).\n  - **Preview only**: no pricing math applied yet (`fs_useLever` OFF by default).\n\n**Planned** (future step): when `fs_useLever` is ON, apply multiplier to **raises only** (never increase cuts), propagate through renewals/new calculations after normal clamps, respecting max% guardrails.

---

## 8) Export / Debug
- **Exports** mirror UI values to CSV so numbers line up.\n- **Debug footers** under tables show:\n  - Current vs baseline-new, pct-to-new, max applied, and **base-formula** string (Step 42).\n  - Term rows show components: term premium, over-cap count, seasonality, applied %.

---

## 9) Implementation Notes

### 9.1 App structure
- Pure HTML/CSS/JS file (no bundler). Everything namespaced under IIFEs.\n- **Global state**:\n  - `window.mappedRows` (rent roll)\n  - `window.boxScoreRows` (box score)\n  - `window.totalUnits`, `occupiedNow`, `onNotice`, `preleased` (derived)\n  - `window.strugglingFPs`, `window.staleUnits30d` (derived)\n  - repaint functions: `repaintStatus45()` etc.\n- **Config** via `readCfg()`/`writeCfg()` into `localStorage`.

### 9.2 Event flow (Home)
1) Upload Rent Roll → Parse/Map → compute live counts → `repaintStatus45()`.\n2) (Optional) Upload Box Score → Parse/Map → compute `approvals7d`, `conv28`, `band`, `multiplier` → repaint Status.\n3) “Run Renewals/New” reads latest config and data; results populate tables + export buttons.

### 9.3 Defensive coding
- All DOM lookups optional; missing nodes don’t throw.\n- Tooltips or pills default to neutral when data absent.\n- CSV parser is light (no quoted comma support); acceptable for MVP.

---

## 10) CSV Templates

**Rent Roll (sample):**
```
UnitID,Floorplan,Status,LeaseEnd,VacantDays,Price,PreleaseStart
A101,A1,Occupied,2026-01-31,0,1650,
A102,A1,On Notice,2025-12-15,0,1650,
A103,A1,Vacant, ,14,1690,2025-11-01
...
```

**Box Score (sample):**
```
Date,Leads,Applications,Approvals
2025-10-03,30,12,8
2025-10-04,28,11,7
...
```

---

## 11) Step History (key checkpoints)

- **Step 37–41**: Renewal pipeline stabilized: **base → premiums**; removed “short-term chip” badge; guardrails as max% on terms; fixed above-new decreases clamp.
- **Step 42**: Added base-formula debug.
- **Step 43**: Removed old “Status at a Glance” card.
- **Step 45**: New forward-looking Status widget added (Trending, Pacing, Undecided, Pacing 7d + Alerts).
- **Step 46**: Visual polish + live data wiring from rent roll.
- **Step 47**: Box Score uploader + mapping (pacing only).
- **Step 48**: Funnel band (display only).
- **Step 49–50**: Funnel settings UI + fix, wired to band calculation.
- **Step 51**: Funnel lever multipliers (preview only) — **no pricing**.

**Current checkpoint:** **Step 51** ✅

---

## 12) How to run locally
- Open the latest `Step NN - ....html` in a modern browser.
- Force reload if cached: `Cmd–Shift–R` (Mac) / `Ctrl–F5` (Win).

---

## 13) Roadmap (next +1 steps)
1. **Step 52**: Apply funnel multiplier to **raises only**, behind `fs_useLever` toggle; respect guardrails.
2. **Step 53**: Source tooltips + data provenance chips on Status tiles.
3. **Step 54**: Export Status CSV (trending, gaps, FP list, stale list).
4. **Step 55**: True undecided renewals via optional Renewals export.
5. **Step 56**: Floorplan New Pricing “seed + guardrails” scaffold + spread rules preview.
