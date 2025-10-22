# Revenue Management — Comprehensive README (as of Step 42)

> **Purpose**: This document is a single-source reference for the full logic, math, data flow, UI/UX, and operating rules of the Revenue Management application. It is designed so a new developer could rebuild the system from scratch.

---

## 1) System Overview

**What it does**: The app computes **New Lease** and **Renewal** pricing for multifamily units using transparent, operator-tunable rules. It emphasizes clarity (math-in-UI), safety (guardrails), and control (per-term premiums, seasonality, occupancy targets), with exports and audit/debug overlays.

**Key pillars**:
- **Deterministic math** with readable breakdowns in the UI and exports.
- **Separation of concerns**: New pricing is independent from Renewal pricing; Renewals reference New only for the base.
- **Operator controls**: Percent-to-new, allow/disallow decreases above-new, min/max caps, guardrails, term ranges, seasonality, etc.
- **UI transparency**: Debug lines, badges, base-formula traces (Step 42), per-term notes mirroring New.
- **Versioned workflow**: Every change creates a new HTML checkpoint (Step NN) for safe iteration/rollback.

---

## 2) Data Inputs

- **Rent roll**: Unit-level rows with at least: `UnitID, Floorplan, CurrentRent, LeaseEnd` (+ optional metadata used in cards).
- **Calendar**: Current date (used to compute term end months for seasonality and over-cap counts).
- **Settings (cfg)**:
  - **Global / Renewals** (subset shown; full details below):
    - `pctToNew` (decimal) — When unit is **below new**, move this % of the gap toward New for the renewal base; also used when **above new** (move down by this percent of the gap).
    - `allowDecAbove` (boolean) — If **false**, do not allow renewal **base** to go below current when unit is above new.
    - **Below-new base caps**: `renMin`, `renMax` (decimals; lower/upper bounds on base % vs current).
    - **Above-new base caps**: `renAboveMin`, `renAboveMax` (decimals; can be negative to allow decreases). Order-agnostic clamping is applied.
    - **Guardrails toggle**: `capAllTerms` (boolean) — If **true**, apply **per-term MAX-only** cap to the **final** % after premiums.
    - **Renewal term range**: e.g., 2–14 months.
  - **Term premiums**:
    - **Short-term curve (New & Renewals)**: months 2–9 > 0%, months 10+ = 0%. Default curve: 2 mo +8%, then taper −1%/month down to +1% at 9 mo.
    - **Seasonality**: month-indexed multiplier from a `seasonalityCurve` (e.g., 1.02 = +2%).
    - **Over-cap indicator**: Over-cap counts per end-month can be displayed in notes (same convention as New); math typically folds into seasonality.

---

## 3) High-Level Algorithm

### 3.1 New Lease Pricing (reference)
New pricing is computed independently per floorplan/unit using the short-term curve and seasonality. Notes show: `term premium +X% & over cap (N) +Y% & seasonality +S% = +Z%`.

> **New is not modified by the renewal logic.**

### 3.2 Renewal Pricing (Step 42 rules)
**Pipeline**: **Base** → **Term premiums** → **(Optional) per-term guardrail**

1) **Base (renewalBase)**
   - Compute `isAboveNew = current > todayNew`.
   - **Below-new branch**:
     - `target = current + (todayNew - current) * pctToNew`
     - `rawPct = target/current - 1`
     - Clamp with order-aware `[renMin, renMax]` ⇒ `basePct`
     - `base = current * (1 + basePct)`
   - **Above-new branch**:
     - `toward = current - (current - todayNew) * pctToNew` (downward move)
     - `rawPct = toward/current - 1` (typically negative)
     - If `allowDecAbove === false`, `rawPct = max(0, rawPct)`
     - Clamp with order-aware `[renAboveMin, renAboveMax]` (often negative max to allow decreases) ⇒ `basePct`
     - `base = current * (1 + basePct)`

2) **Term premiums** (identical curve as New):
   - **Short-term**: `stPct(term)` = 0.08 − 0.01×(term−2) for 2–9; else 0.
   - **Seasonality**: `seasonPct(key) = seasonalityMultiplier(key) − 1` using month key of the **term end** date.
   - **Combine**: `termPremium = stPct + seasonPct (+ overCapPct if separate)`
   - **Raw term price** (implementation parity with New): multiply base by term multipliers; the UI presents components additively.

3) **Final % vs current**
   - `pctFinal = basePct + termPremium` (conceptually; actual code multiplies and converts back to % vs current).

4) **Guardrails toggle (`capAllTerms`)**
   - **OFF**: **No** per-term cap. If **above-new** and `allowDecAbove=false`, clamp `pctFinal = max(0, pctFinal)` to prevent net decreases—but **still allow increases from premiums**.
   - **ON**: Apply **MAX-only** cap **after premiums**:
     - **Below-new**: `pctFinal = min(pctFinal, renMax)`
     - **Above-new**: `pctFinal` limited to ±`|renAboveMax|`; if `allowDecAbove=false`, clamp negatives to 0.

5) **Offer**: `offer = round(current * (1 + pctFinal))`

6) **Renewal Notes (term rows)**
   - Must mirror New-style phrasing:
     - `term premium +X% & over cap (N) +Y% & seasonality +S% = +Z% → [max-cap W% →] applied V%`
   - Include `max-cap ...` only when guardrails are ON.

7) **Debug footer**
   - Standard chips: Below/Above baseline-new, Percent-to-new, Guardrails status.
   - **Step 42 addition**: Base-formula trace appended to Debug:
     - **Below-new example**: `Base (below-new): target = $1,650 = $1,500 + 50%×($1,800 − $1,500); raw +10.0% → clamp[+5.0%, +11.0%] = +10.0% → base $1,650`
     - **Above-new example**: `Base (above-new): toward = $1,444 = $1,534 − 50%×($1,534 − $1,354); raw −5.9% → clamp[0.0%, −10.0%] = −5.9% → base $1,444`

---

## 4) Settings Reference (cfg)

| Group | Key | Type | Meaning | Notes |
|---|---|---|---|---|
| Renewals | `pctToNew` | decimal | Portion of gap to move toward New when forming the base. | 0.50 = 50%. Used in both branches. |
| Renewals | `allowDecAbove` | boolean | If **false**, above-new base cannot go below current. | Term premiums can still raise prices unless guardrails ON. |
| Renewals | `renMin` | decimal | Minimum base % when below-new. | Order-aware with `renMax`. |
| Renewals | `renMax` | decimal | Maximum base % when below-new. | Also used as per-term MAX when guardrails ON & below-new. |
| Renewals | `renAboveMin` | decimal | Minimum base % when above-new. | Often 0. Can be negative.
| Renewals | `renAboveMax` | decimal | Maximum base % when above-new. | Can be **negative** (e.g., −0.10 to allow up to −10%). Used as ±MAX magnitude per-term when guardrails ON. |
| Renewals | `capAllTerms` | boolean | If **true**, apply per-term **MAX-only** cap to final % after premiums. | Below: cap at `renMax`; Above: cap magnitude at `|renAboveMax|`. |
| Renewals | `renTerms` | array<int> | Offered renewal terms (months). | Typically 2–14. |
| Term Premiums | Short-term curve | function | 2–9 mo taper from +8% down to +1%; 10+ = 0%. | Same for New & Renewals. |
| Seasonality | `seasonalityCurve` | map | Month key → multiplier (e.g., 1.02 = +2%). | Used by New & Renewals; also surfaces over-cap counts in notes. |
| Debug | `showRenewalBaseFormula` | boolean | (Planned in Step 43) Show/hide base-formula line in footer. | Default off. |

---

## 5) UI/UX Structure

- **Tabs/Sections**: Settings, New Pricing, Renewals, Charts, History (varies by step).
- **Cards** (unit-level or floorplan-level) showing:
  - Header: Unit, Floorplan, Lease End, Current.
  - Table of terms (2–14 mo): Offer + Notes.
  - Footer: Debug chips and (Step 42) base-formula.
- **Badges/Chips**:
  - Below/Above baseline-new, Percent-to-new, Guardrails On/Off. (No short-term chip on Renewals.)
- **Exports**:
  - For each term row:
    - UnitID, Floorplan, LeaseEnd, Term, Offer, Current, TodayNew, PctToNew, GuardrailMax (if any), BasePct, TermPremiumPct, FinalPct, GuardrailsOn, ShortTermPct, SeasonalityPct (and/or OverCapPct if separate).

---

## 6) Pseudocode (Renewals core)

```pseudo
for unit in units:
  current = unit.CurrentRent
  todayNew = computeNewBaseline(unit)  // independent New logic
  isAbove = current > todayNew

  // BASE
  if !isAbove:
    target = current + (todayNew - current) * pctToNew
    rawPct = target/current - 1
    basePct = clamp_orderaware(rawPct, renMin, renMax)
  else:
    toward = current - (current - todayNew) * pctToNew
    rawPct = toward/current - 1
    if !allowDecAbove: rawPct = max(0, rawPct)
    basePct = clamp_orderaware(rawPct, renAboveMin, renAboveMax)

  base = round(current * (1 + basePct))

  // TERMS
  for term in renTerms:
    stPct = short_term_pct(term)    // 2–9 positive; 10+ = 0
    seasonPct = seasonality_mult(endMonth(term)) - 1
    termPremium = stPct + seasonPct

    // Conceptual add; actual code multiplies base then compares vs current
    pctFinal = basePct + termPremium

    if capAllTerms:
      if !isAbove:
        pctFinal = min(pctFinal, renMax)
      else:
        if !allowDecAbove: pctFinal = max(0, pctFinal)
        pctFinal = clamp_magnitude(pctFinal, |renAboveMax|)
    else:
      if isAbove and !allowDecAbove:
        pctFinal = max(0, pctFinal)  // prevent net decrease, keep premium increases

    offer = round(current * (1 + pctFinal))
    render_row(term, offer, notes_from_components())
```

---

## 7) Edge Cases & Guarantees

- **Above-new & allowDecAbove=false & guardrails OFF**: BasePct ≥ 0%; premiums can raise terms; no per-term caps.
- **Above-new & allowDecAbove=true**: Base may decrease; magnitude bounded by `[renAboveMin, renAboveMax]` (negative allowed). If guardrails ON, each term is then MAX-capped by `|renAboveMax|` (negatives allowed unless allowDecAbove=false).
- **Below-new & guardrails ON**: Terms cannot exceed `renMax` after premiums.
- **Term range gaps**: If terms are misconfigured, default to [2…14].
- **Seasonality map holes**: Default multiplier = 1.00 (0%).
- **Rounding**: Offers are integers via `Math.round`.

---

## 8) Worked Examples

### Example A — Below-new, Guardrails OFF
- Current $1,400, New $1,750, pctToNew 50%, renMin 0, renMax 10%, season +2%.
- Base: +12.5% → clamped to +10% ⇒ $1,540.
- 2 mo: +8% +2% ≈ +20% total ⇒ ~ $1,680.
- 12 mo: +0% +2% ≈ +12% total ⇒ ~ $1,568.

### Example B — Below-new, Guardrails ON
- Same as A, guardrails ON ⇒ every term capped at +10% ⇒ all offers $1,540.

### Example C — Above-new, Decrease OFF, Guardrails OFF
- Current $1,900, New $1,750, pctToNew 50%.
- Raw base −3.95% ⇒ clamp to 0% (no decrease) ⇒ base $1,900.
- 2 mo +8% ⇒ $2,052; 12 mo +0% ⇒ $1,900.

### Example D — Above-new, Decrease ON, Guardrails OFF
- Current $1,700, New $1,500, pctToNew 50%, `renAboveMax = −0.10`.
- Raw base −5.9% → order-aware clamp within [0, −10%] ⇒ −5.9% ⇒ $1,600.
- 2 mo +8% ⇒ $1,728; 12 mo +0% ⇒ $1,600.

### Example E — Above-new, Decrease ON, Guardrails ON (±|renAboveMax|)
- Same as D plus guardrails ON.
- Final per-term % limited by 10% magnitude (neg allowed). If any term math yields < −10% or > +10%, clamp to −10%/+10%.

---

## 9) Implementation Notes

- **Parity with New**: Use the exact same short-term and seasonality helpers on Renewals to guarantee consistent notes.
- **Order-aware clamps**: Always apply `clamp(min, max)` with `min ≤ max` by normalizing the pair first (handles negative values and swapped inputs).
- **Guardrails semantics**: Guardrails only cap **maximum magnitude** after premiums (no minimum), applied per-term when toggled ON.
- **Notes**: Only include `max-cap …` fragment when guardrails are ON.
- **Debug**: Keep the footer chips and base formula (Step 42) for traceability.

---

## 10) Versioning & Workflow (Step Files)

- The repo keeps a series of standalone HTML checkpoints: `Step 34 ...html`, `Step 35 ...html`, … `Step 42 ...html`.
- **Rule**: Start from latest stable step, apply one small change, and save as a **new file**. Never overwrite older steps.
- Benefits: easy rollback, A/B testing, and precise provenance of changes.

---

## 11) Testing Checklist

- **Regression**: New pricing unchanged after any Renewal edits.
- **Above-new / below-new**: Validate base math at boundaries (0%, min/max, negative caps, etc.).
- **Guardrails OFF vs ON**: Verify that guardrails affect only per-term results when ON.
- **Short-term curve**: 2–9 positive, 10+ zero.
- **Seasonality**: Correct month keys based on term end dates.
- **Exports**: Columns reflect UI (BasePct, TermPremiumPct, FinalPct, flags).
- **UI**: Notes mirror New format; debug footer shows base formula when configured.

---

## 12) Glossary

- **Baseline-new (todayNew)**: Today’s new lease price for the same floorplan.
- **Percent-to-new**: Share of the gap moved toward New when creating the renewal base.
- **BasePct / Base**: Percent and dollar value of the renewal base vs current, before term premiums.
- **Term Premiums**: Short-term + seasonality (+ optional over-cap).
- **Guardrails**: MAX-only cap applied **after** premiums per term when enabled.

---

## 13) Plain-English Summary

This tool prices new leases and renewals for apartments. For **renewals**, it first picks a **base rent** by nudging the current rent toward today’s **new lease** price by a percentage you choose (e.g., 50%). If the resident is already paying **more than new**, you can allow the base to **decrease** (by up to a limit, like 10%) or block decreases entirely. Once the base is set, the app adds **short-term** and **seasonality** adjustments to create each term’s price (2–14 months). Shorter leases usually end up higher; longer ones are closer to the base. If you turn on **guardrails**, the app **caps how far** any term’s final price can move, but only on the **maximum** change. Throughout, the UI explains the math—for each term and at the bottom of each card—so operators can trust and audit every number. Exports mirror the UI for offline review.

---

**End of README**
