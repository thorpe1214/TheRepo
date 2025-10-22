# Revenue Management SaaS Project — Full README

This README is the **master reference** for the Revenue Management project.  
It consolidates all product context, logic rules, workflow principles, UI structure, checkpoints, and collaboration charter.

---

## 1. Vision & Mission
We are building a **transparent, operator-first revenue management system for multifamily housing.**  
Unlike black-box RM systems, ours is:
- Math-first, fully explainable (chips, deltas, plain English reasoning).  
- Floorplan-aware: occupancy guardrails, buffers, spread rules.  
- Designed for property managers, not data scientists.  
- Compact UI, fast, lightweight, executive-friendly.  
- Exportable (CSV/Excel), no hidden logic.  

Our long-term goal is a SaaS platform with multi-property support, logins, and PMS integrations — starting from a **local HTML/JS prototype.**

---

## 2. Roles & Workflow

- **Visionary (User)**: Revenue management expert. Defines rules, bands, business reality. No coding required.  
- **Project Manager (ChatGPT)**: SaaS strategist. Sharpens ideas, pushes back when needed, translates into Codex briefs. Never writes HTML directly.  
- **Engineer (cursor)**: Senior dev. Executes briefs exactly, produces one new file per step.  

**Principles:**
1. One small change per step (Step NN). Never overwrite.  
2. Codex is the only one that edits code.  
3. Project Manager only produces Codex briefs.  
4. Visionary tests each file locally.  
5. Dev Notes added when introducing shims or placeholders.  

---

## 3. Architecture & File Workflow
- Prototype = single HTML file (`Step NN — description.html`).  
- Each new step increments by +1 and saves a new file.  
- Files are tested by drag-and-drop in browser.  
- No server required at MVP stage.  

---

## 4. Pricing Logic (Ruleset)

### 4.1 Community Level
- Comfort Target (single threshold, with hidden Low/High fallbacks).  
- Trending occupancy = (occupied + preleased – on-notice) ÷ total.  
- Conversion steering inside band (target 25%, tol ±2pp, step ±1%).  

### 4.2 Floorplan Level
- Floorplan smoothing (sample-aware).  
- Guardrails (max raise factor vs community, buffers between unit types).  
- Spread rules (e.g., studios cannot get within $100 of 1-bedrooms).  

### 4.3 Lease Terms
- Range = 2–14 months (default). Sanitized to [2–24].  
- Short-term premiums (baseline at 2mo, taper −10%/mo → 0% at 10+).  
- Seasonality steering (uplifts only if positive, only on over-cap terms).  

### 4.4 Renewals
- Branch A: Below new lease → percent-to-new (default 50%), min=0%, max=8%, cap-all-terms ON.  
- Branch B: Above new lease → allow-decrease toggle (default ON), min=−10%, max=−5%.  
- Anchored to baseline new rent (no premiums).  

### 4.5 Specials & Adjustments
- Vacancy specials (30d=5%, 60d=10%, 90d=15%).  
- Amenity adjustments (±$ by tag).  
- Optional rent adjustments by floorplan (applied at approvals).  

### 4.6 Governance & Floors
- Floors by bedroom size (0–4BR).  
- Safety flags (large change, hit floor, micro delta ignored).  
- Human-in-the-loop approval required for major moves.  

---

## 5. UI Structure
Tabs:
- **Home (🏠)**: Upload rent roll, run pricing, summary.  
- **New Pricing (💵)**: Floorplan grid + unit detail.  
- **Renewals (🔁)**: Renewal tables, branch A/B logic.  
- **Settings (⚙️)**: Bands, floors, buffers.  
- **Charts (📊)**: Trends, seasonality, history.  
- **History (🕒)**: Past runs, export, restore settings.  

UX Standards:
- Compact, executive-friendly.  
- Debug lines inline with each row (term premiums, over-cap, seasonality).  
- Chips for reasons (e.g., “trend +1%”, “conversion −1%”).  
- History anchored to approved bases.  

---

## 6. Checkpoints (Major Milestones)
- **Step 20**: Home-first layout established.  
- **Step 34**: Renewals anchored to baseline (no premiums).  
- **Step 41**: Renewals base clamp fix.  
- **Step 51**: Funnel lever multipliers preview.  
- **Step 59**: Starting Rent baseline logic introduced.  
- **Step 87**: Unit term detail box + right-side toggle.  
- **Step 88 (Planned)**: Ensure unit pricing shows all terms correctly.  

---

## 7. Collaboration Charter
- All briefs must follow the Codex brief template.  
- ChatGPT produces briefs only, never HTML.  
- Codex executes briefs, outputs Step NN files.  
- Visionary validates and feeds back.  

---

## 8. Next Steps
- Step 88: Fix unit pricing term display.  
- Step 89+: Add floorplan-level rent adjustments.  
- Step 90+: Improve charts/history auto-updates.  
- Step 100+: Multi-property selector prototype.  

---

## 9. Notes for Cursor Migration
- Bring over all Step files (latest is Step 87).  
- Bring this README as project root doc.  
- Cursor will act as Codex replacement (coding agent).  
- Keep ChatGPT in loop as strategist/brief-writer.  

---

END OF README
