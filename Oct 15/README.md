# Revenue Management – Pricing Engine (Checkpoint 66U)

> **Scope:** New Pricing (authoritative) and current Renewals baseline.  
> **Version:** Checkpoint 66U – Base‑anchored terms, seasonality only on over‑cap, aged‑vacant disabled for New.  
> **Audience:** Developers building/maintaining the pricing engine. This doc is sufficient to re‑implement from scratch.

---

## 0) Vocabulary

- **FP** – Floorplan (e.g., S0 Studio, A1 1×1, B2 2×2)
- **Term** – Lease length in months (2–14)
- **SR** – Starting Rent (per FP) used by **New** pricing
- **Band** – Comfort band with low/high occupancy % (e.g., 88–96)
- **Mid** – Band midpoint = `(BandLow + BandHigh) / 2`
- **dir** – Signed movement percent from the movement model (e.g., `-0.027` = −2.7%)
- **Base** – FP price anchor used for all terms in New pricing after movement & guardrails
- **Short** – Short‑term premium % by term (mostly 2–9 mo)
- **OverCap** – Long‑term premium % by term (e.g., +12% on 11 mo)
- **SeasonalUplift** – Positive seasonality applied **only** to terms with OverCap > 0
- **Min Gap to Next Tier $** – Dollar spacing FP must maintain vs the next **lower** FP
- **Buffer $ (stop‑decrease)** – Optional per‑FP floor vs last published base (prevents over‑drops on that FP)

---

## 1) Inputs & Configuration

### 1.1 Global
- `settings.sensitivity`: `Conservative | Standard | Aggressive`
- `settings.targetOccPct`: site/global target occupancy (%)
- `settings.seasonalityPctByMonth`: list[12] of **percentage deltas**; neutral = `0.0%`

### 1.2 Floorplan Settings (per FP)
- `bandLowPct`, `bandHighPct` (e.g., 88–96)
- `minGapToLowerUSD` – required spacing vs the **lower** FP (applied after Base)
- `bufferStopDecreaseUSD` – optional; self‑floor vs last published base
- `startingRentUSD` – SR
- label mapping: rent‑roll labels → FP code

### 1.3 Term Policies
- `shortPctByTerm`: decimal percents for 2..9 (e.g., `{2:0.08, 3:0.07, …, 9:0.01}`)
- `overCapPctByTerm`: decimal percents (often `{10:0, 11:0.12, 12:0, 13:0, 14:0}`)
- **Rounding:** nearest dollar at the end of each term’s math

> **Aged‑vacant discounts are disabled in New pricing** (reserved for future unit‑level logic).

---

## 2) New Pricing – Pipeline (authoritative)

### 2.1 Movement (Option C – Smooth, centered on band midpoint)
Small moves near the band’s midpoint; larger moves as the FP occupancy drifts away; capped by sensitivity. We use a smooth `tanh` ramp.

```ts
type SensKnobs = { maxMove: number; k: number } // percentages as decimals

const KNOBS: Record<'Conservative'|'Standard'|'Aggressive', SensKnobs> = {
  Conservative: { maxMove: 0.03, k: 1.1 },
  Standard:     { maxMove: 0.05, k: 1.4 },
  Aggressive:   { maxMove: 0.08, k: 1.8 },
}

function computeDirCenteredSmooth(params: {
  occ_fp: number;        // FP occupancy %
  band_low: number;
  band_high: number;
  sensitivity: 'Conservative'|'Standard'|'Aggressive';
  occ_site?: number;     // optional site occupancy %
  target_site?: number;  // optional site target %
}) {
  const mid = (params.band_low + params.band_high) / 2
  const dev_pp = params.occ_fp - mid
  const sign = dev_pp < 0 ? -1 : (dev_pp > 0 ? +1 : 0)
  const { maxMove, k } = KNOBS[params.sensitivity || 'Standard']

  const x = Math.abs(dev_pp) / 5          // 5 pp from mid → x = 1
  let mag = maxMove * Math.tanh(k * x)    // 0..maxMove

  // Optional site bias (tunable). Set multiplier to 1.0 to neutralize globally.
  const deltaSite = (params.occ_site ?? mid) - (params.target_site ?? mid) // + above target
  const helps = (deltaSite > +1 && sign > 0) || (deltaSite < -1 && sign < 0)
  const biasMult = helps ? Math.min(1 + 0.15 * Math.abs(deltaSite), 1.30) : 1.0

  return sign * Math.min(mag * biasMult, maxMove)
}
```

### 2.2 Base (no seasonality here)
```ts
baseCandidate = SR * (1 + dir)          // SR from FP settings
baseAfterBuffer = applyBufferStopDecrease(baseCandidate, FP) // optional; self‑floor vs last published
baseFinal = applyMinGapToNextTier(baseAfterBuffer, FP)       // spacing vs lower tier
```
**Debug** prints: `dir=+x.x% • sr=$#### • base=$####`

### 2.3 Min Gap to Next Tier (spacing)
For each FP except the lowest tier:
```
baseFinal(FP) >= baseFinal(LowerFP) + minGapToLowerUSD(FP)
```
- Enforce after Base (never push lower tiers down).
- Show “Spacing applied …” in the UI footer when applied.

### 2.4 Buffer $ (stop‑decrease) — optional
Protects **this** FP from dropping more than Buffer $ vs its last published base:
```
baseAfterBuffer >= lastPublishedBase(FP) - bufferStopDecreaseUSD(FP)
```
Never pushes other FPs down. (Set to 0 for inert behavior.)

### 2.5 Term pricing (anchored to Base)
For each term `m ∈ [2..14]`:
```ts
const base = baseFinal

const short   = shortPctByTerm[m]   ?? 0  // decimal
const overCap = overCapPctByTerm[m] ?? 0  // decimal
const seasPct = seasonalityPctByMonth[monthIndex] ?? 0  // decimal

// Seasonality is positive‑only and only if over‑cap exists
const seasonalUplift = (seasPct > 0 && overCap > 0) ? seasPct : 0

let final = base * (1 + short + overCap + seasonalUplift)
final = roundToDollar(applyCapsIfAny(final))          // caps (if any) then rounding last
```
**Invariant:** With positive `short`, 2–9 mo must not undercut a neutral long term (10–14 with 0% over‑cap), modulo $1 rounding.

### 2.6 Notes & Debug
- **Per‑term Notes:**
  ```
  "Term premium +{short%} & over cap ({k}) +{over%} +seasonal +{seas%} = {netVsBase}%"
  netVsBase = ((final / base) - 1) * 100 (rounded to 0–1 dp)
  ```
  - `seas%` is >0 only when applied, else `+0.0%`.
  - `({k})` can be the over‑cap index or keep `(0)` for none.
- **FP Debug footer:** `dir • sr • base • mid • dev • (optional siteBias)`.

---

## 3) Seasonality (New pricing)

- Stored as **percent deltas** by month; **neutral = 0.0%**.
- Converted to a decimal **only at term time**.
- Applied **only** when `overCap > 0` **and** seasonality is **positive**.  
  (Negative seasonality is ignored for New pricing.)

**Example:** `base=$1,000`, `11 mo overCap +12%`, `seasonality +2%`  
→ `price = 1000 × (1 + 0.12 + 0.02) = $1,140`

---

## 4) Renewals (baseline – independent module)

Renewals are intentionally **decoupled** from New pricing guardrails.

### 4.1 Recommended minimal design
Pick one of the following policy styles (A is most common). Keep separate code paths from New.

**A) Unit‑anchored Renewal**
```ts
renewalBase = currentUnitRent
renewalDir  = renewalMovementFn(occ_fp, band, sensitivity)  // may reuse Option C or a simpler slope
price(term) = roundToDollar( renewalBase * (1 + renewalDir + renewalTermAdj(term)) )
```
**B) Market‑anchored Renewal**
```ts
renewalBase = NewPricing.baseFinal(FP)     // market anchor
capToUnit = clampPct(renewalBase / currentUnitRent - 1, minChangePct, maxChangePct)
price(term) = roundToDollar( currentUnitRent * (1 + capToUnit + renewalTermAdj(term)) )
```

- `renewalTermAdj(term)`: renewal term schedule (usually flatter).
- You may add **increase caps** (e.g., ±10%) and notice windows as policy allows.
- **No** min gap / buffer rules in renewals unless explicitly requested.

> If you already have a renewal engine, keep it unchanged; just ensure it does not read New guardrails.

---

## 5) Data Model (minimal)

```ts
type Settings = {
  targetOccPct: number
  sensitivity: 'Conservative'|'Standard'|'Aggressive'
  seasonalityPctByMonth: number[] // 12 entries, % deltas; neutral = 0.0
}

type Floorplan = {
  code: string
  name: string
  bandLowPct: number
  bandHighPct: number
  minGapToLowerUSD: number
  bufferStopDecreaseUSD: number
  startingRentUSD: number
  lastPublishedBaseUSD?: number
}

type TermPolicy = {
  shortPctByTerm: Record<number, number>   // 2..9
  overCapPctByTerm: Record<number, number> // e.g., {10:0, 11:0.12, 12:0, 13:0, 14:0}
}

type RunContext = {
  monthIndex: number
  siteOccPct?: number
  fpOccPct: Record<string, number> // FP → occ %, from rent roll
  mappedRows: any[]                // parsed data rows
}
```

---

## 6) Algorithm – Pseudocode (New)

```ts
function priceNew(settings: Settings, fps: Floorplan[], policy: TermPolicy, ctx: RunContext){
  // 1) dir per FP (movement)
  const dirByFP: Record<string, number> = {}
  for (const fp of fps){
    dirByFP[fp.code] = computeDirCenteredSmooth({
      occ_fp: ctx.fpOccPct[fp.code],
      band_low: fp.bandLowPct,
      band_high: fp.bandHighPct,
      sensitivity: settings.sensitivity,
      occ_site: ctx.siteOccPct,
      target_site: settings.targetOccPct,
    })
  }

  // 2) Base per FP (no seasonality) + guardrails (ascending order: lower → higher tiers)
  const baseByFP: Record<string, number> = {}
  for (const fp of fps){
    let base = fp.startingRentUSD * (1 + dirByFP[fp.code])
    if (fp.bufferStopDecreaseUSD > 0 && fp.lastPublishedBaseUSD != null){
      base = Math.max(base, fp.lastPublishedBaseUSD - fp.bufferStopDecreaseUSD)
    }
    const lower = getLowerFP(fp, fps)  // implementation detail: your sort + mapping
    if (lower){
      base = Math.max(base, (baseByFP[lower.code] ?? 0) + fp.minGapToLowerUSD)
    }
    baseByFP[fp.code] = base
    debug(fp.code, {dir: dirByFP[fp.code], sr: fp.startingRentUSD, base})
  }

  // 3) Terms (anchored to Base)
  const rows = []
  for (const fp of fps){
    for (let term = 2; term <= 14; term++){
      const base = baseByFP[fp.code]
      const short   = policy.shortPctByTerm[term]   ?? 0
      const overCap = policy.overCapPctByTerm[term] ?? 0
      const seasPct = settings.seasonalityPctByMonth[ctx.monthIndex] ?? 0
      const seasonalUplift = (seasPct > 0 && overCap > 0) ? seasPct : 0

      let price = base * (1 + short + overCap + seasonalUplift)
      price = roundToDollar(applyCapsIfAny(price))
      rows.push({ fp: fp.code, term, price })
    }
  }
  return rows
}
```

---

## 7) Customer‑Facing Controls → Math

- **Sensitivity** → changes tanh `k` and `maxMove` caps in movement.
- **Band Low / High** → sets midpoint; closer to mid → smaller moves.
- **Starting Rent $** → anchor for Base.
- **Min Gap to Next Tier $** → floor after Base (never pushes lower tiers down).
- **Buffer $ (stop‑decrease)** → optional self‑floor vs last published base.
- **Seasonality** → global month‑based % deltas; only affect terms with **over‑cap** and only when **positive**.
- **Term schedules** → Short (2–9) and OverCap (long) percents.
- **Renewals module** → separate; choose unit‑ or market‑anchored policy and caps.

---

## 8) Order of Operations (New)

1. SR  
2. **Movement** (`× (1 + dir)`)  
3. **Buffer stop‑decrease** (optional; self‑floor)  
4. **Min Gap to Next Tier** (floor vs lower tier)  
5. **Term adjustments** (Short + OverCap + SeasonalUplift)  
6. **Caps** (if any)  
7. **Rounding** (nearest dollar)

> No intermediate rounding; round once at the end of term math.

---

## 9) QA Playbook

- **Positive dir increases Base; negative dir decreases Base.**
- **Neutral longs = Base.** 10–14 mo with `overCap=0` equal (rounded) to Base.
- **Short ≥ Neutral** when short > 0 (allowing $1 rounding ties).
- **Seasonality only on over‑cap** and only when positive.
- **Spacing footer** appears when Min Gap lifts a higher tier to maintain spacing.

---

## 10) Extensibility (soon)

- **Approvals/Overrides** (with optional per‑FP reference rent nudge).
- **History/Audit** (persist inputs + outputs per run; diffs; rollback).
- **Unit‑level aged‑vacant** (re‑introduce after unit view exists).
- **Edge‑nudge & site bias** controls in Settings (optional GUI exposure).

---

## 11) Implementation Notes

- Keep **Renewals** in separate modules/services so guardrail changes in New never affect Renewal math unintentionally.
- Ensure **parsed rent‑roll → FP map** is correct; mis‑mapping yields wrong bands and gaps instantly.
- Always coerce/guard inputs: `Number(value)`, handle `NaN`, and fallback to neutral (0% for percents) when missing.
- Debugging: print a bottom line on each FP with `dir, sr, base, mid, dev` (and bias if enabled) for fast sanity checks.
