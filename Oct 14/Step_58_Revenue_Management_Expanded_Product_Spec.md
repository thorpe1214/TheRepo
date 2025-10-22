# Revenue Management SaaS -- Step 58 Checkpoint (Expanded Product Spec)

## 1. System Overview

This system is a **rules-based multifamily revenue management tool**
designed to help operators set new lease and renewal pricing based on
transparent, math-driven logic. It is deliberately designed as a
**"walled garden"**: all pricing decisions are based only on the
property's own rent roll and internal performance metrics. No competitor
price scraping or external comps are used, ensuring legal defensibility
and transparency.

### Core Data Flow

1.  **Rent Roll Upload (CSV/Excel)** → The system reads unit-level data:
    floorplan code, unit ID, current rent, lease status (occupied,
    vacant, on notice), and expiration dates.
2.  **Floorplan Normalization & Mapping** → Uploaded floorplans are
    automatically matched against a persistent local mapping table.
    Operators can:
    -   Map CSV floorplan names to internal codes (e.g., "A1", "B2").
    -   Configure per-floorplan settings (unit count, buffer \$,
        low/high bands).
    -   Save settings for persistence across sessions.
3.  **Pricing Engine** → Applies community + floorplan trending logic,
    guardrails, seasonality, and renewal rules to compute new rents.
4.  **Explainability Layer** → Transparent debug chips and inline math
    show exactly why each price moved.
5.  **Export Layer** → Operators can export results to CSV/Excel for
    offline review or approvals.

------------------------------------------------------------------------

## 2. Customer-Facing Controls (Knobs)

These are the visible controls an operator sees in the SaaS UI:

### General

-   **Comfort Target**: Single trending occupancy % target (e.g., 95%).\
-   **Trending Horizon**: Fixed 120-day forward window (read-only
    label).

### Floorplan Settings

-   **Floorplan → Code Map**: Operator maps CSV labels to system codes.\
-   **Units**: Fixed per floorplan (used in weighting and occupancy
    calc).\
-   **Buffer (\$)**: Per-floorplan dollar stop, caps how far rent can
    move.\
-   **Bands (Low / High)**: Floorplan-level trending occupancy
    thresholds.\
-   **Draft vs Published**: Operators can test mappings/settings before
    committing.

### Pricing Behavior

-   **New Lease Pricing**:
    -   Comfort Target governs direction (up/down).
    -   Floorplan adjustments applied with sample-aware smoothing.
    -   Guardrails respect buffer \$ and band rules.
    -   Short-term premiums (baseline taper curve).
    -   Seasonality nudge (spring/summer ↑, fall/winter ↓).\
-   **Renewal Pricing**:
    -   If below new lease → move % toward new lease (percent-to-new
        rule).\
    -   If above new lease → optional decrease toggle with negative
        guardrails.\
    -   Cap-all-terms safeguard ensures fairness across expirations.

### Specials

-   **Vacancy Specials**: Automatic \$ off if unit vacant \>30/60/90
    days.\
-   **Visibility Toggle**: Whether to show special in marketing output.

### Floors

-   **Global Price Floors by Bedroom**: 0/1/2/3/4 BR min rent
    guardrail.\
-   **Floor Badges**: Displayed when floor prevented a decrease.

### Governance

-   **Change Cadence**: Weekly / bi-weekly recommendation frequency.\
-   **Review Required**: Flag large deltas for human approval.\
-   **Audit Trail**: Stores last 100 runs with timestamp + file hash.

------------------------------------------------------------------------

## 3. Rules & Math (Engine Internals)

### 3.1 Trending Occupancy (Community & Floorplan)

-   **Community Trending %** = (Occupied + Preleased − On Notice) ÷
    Total Units.\
-   **Floorplan Trending %** = same formula, floorplan-scoped.\
-   **Comfort Target Rule**:
    -   If Trending \< Target → price ↓.\
    -   If Trending \> Target → price ↑.\
    -   If Trending ≈ Target → conversion steering may apply.

### 3.2 Floorplan Smoothing (Sample-Aware)

Equation:\
- Low = 0.93 − 0.4427 / √n\
- High = 0.96 − 0.2530 / √n\
(where n = floorplan unit count).\
This tightens bands for small sample sizes.

### 3.3 Conversion Steering (Inside Band Only)

-   Conversion% = Apps ÷ Leads (30-day lookback).\
-   Compare to Target (25%) ± tolerance (2 pp).\
-   If above target → +1% nudge.\
-   If below target → −1% nudge.

### 3.4 Buffer Guardrail

-   Each floorplan has a \$ buffer (e.g., ±\$50).\
-   New rent = min(max(proposed, current − buffer), current + buffer).

### 3.5 Renewal Math

-   **Branch A (Below New)**:\
    Renewal Rent = Current + clamp((New Lease − Current) × %toNew, Min%,
    Max%).\
-   **Branch B (Above New)**:\
    Renewal Rent = Current × (1 + Guardrail%) with optional decrease
    toggle.

### 3.6 Specials

-   Vacant \>30d = −5%, \>60d = −10%, \>90d = −15%.

### 3.7 Floors

-   Rent cannot drop below global bedroom min.

### 3.8 Rounding

-   Rents rounded to nearest \$5 for display.

------------------------------------------------------------------------

## 4. Data Persistence & Workflow

-   **Local Storage**: Floorplan mappings + settings persist between
    uploads.\
-   **Draft vs Published**: Operators can stage changes before
    committing.\
-   **Run History**: Timestamp, file hash, rows processed, summary stats
    saved.

------------------------------------------------------------------------

## 5. Operator Workflow

1.  Upload Rent Roll.\
2.  Map floorplans (first time only).\
3.  Adjust buffers, bands, floors, and policies.\
4.  Generate pricing.\
5.  Review inline math & debug chips.\
6.  Export for approval.

------------------------------------------------------------------------

## 6. Roadmap Toward SaaS

-   **MVP Testing Mode (Now)**: Full edit rights, transparent math.\
-   **Client SaaS Mode (Later)**:
    -   Lock down floorplan codes & units.\
    -   Editable knobs limited to buffer \$, bands, and governance.\
    -   Admin backend for overrides & data storage.\
    -   Multi-property support with cloud persistence.\
-   **Future Pro Tier**:
    -   Scenario save/compare.\
    -   API integration with PMS/CRM.\
    -   AI-based description autofill for specials.

------------------------------------------------------------------------

## 7. Why It Matters

Operators get a **transparent, controllable pricing engine**:\
- No black-box AI.\
- No risky comp scraping.\
- Defensible, auditable, and math-first.\
- Gives staff time back by automating repetitive pricing tasks.\
- Helps residents by creating fair, consistent renewal offers.

------------------------------------------------------------------------

**Checkpoint Saved: Step 58 -- Expanded Product Spec (README).**
