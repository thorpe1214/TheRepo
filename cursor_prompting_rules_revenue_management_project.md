# Cursor Prompting Rules

Use this as your house style for Cursor. Keep prompts short, focused, and scoped to a single step. Avoid em dashes.

---

## .cursorrules (drop this file in repo root)

```
name: Revenue Management – Cursor Rules
version: 1.0

principles:
  - One small change per step. Do not refactor unrelated code.
  - Preserve existing pricing math and guardrails unless explicitly told otherwise.
  - Reuse helpers and modules. Do not duplicate logic.
  - Keep accessibility: keyboard focus, ARIA where present.
  - Keep tests green: lint, boundaries, smoke.

workflow:
  - Start from latest Step NN html listed in repo.
  - Make only the files listed under "files_to_change".
  - Do not edit files listed under "do_not_touch".
  - After changes, run: npm run lint && npm run test && npm run smoke.
  - Save new HTML as "Step NN — <short description>.html" and update CHANGELOG.md.

prompt_schema:
  sections:
    - context
    - goal
    - files_to_change
    - do_not_touch
    - requirements
    - tests
    - deliverables

style:
  - Keep instructions concise. Use lists.
  - No chips or verbose debug unless requested.
  - Use existing CSS classes and component patterns.
```

---

## Reusable Cursor Step Prompt Template

Copy, fill, and paste into Cursor Agent for each change.

```
Step <NN> — <short title> (Starting file: <exact step file>.html)

Context
- Briefly describe current state and what exists.

Goal
- Describe the outcome in one or two bullets.

Files to change
- <path1>
- <path2>
- <path3>

Do not touch
- List any files or areas that must not change.

Requirements
1) Bullet requirements that define done.
2) Keep short. Reuse existing helpers and patterns.
3) Accessibility stays correct.

Tests
- Add or update tests to cover the change.
- Ensure npm run lint, npm run test, npm run smoke pass.

Deliverables
- New file: Step <NN> — <short title>.html saved in repo root.
- CHANGELOG.md entry.
```

---

## Example - Unit Detail term pricing (short version)

```
Step 95 — Unit detail term pricing table (Starting file: Step 94 — Fix unit-level Details expand (a11y + test).html)

Context
- Unit detail opens and shows basic info only.

Goal
- Show a 2–14 month term pricing table for the selected unit, anchored to the unit's amenity-adjusted baseline, using the same multipliers and caps as floorplan pricing. No chips or debug in this table.

Files to change
- src/js/pricing-unit.js: add computeUnitBaseline, computeUnitTermPrices, renderUnitTermTable
- src/js/pricing-helpers.js: expose floorplan term multipliers if needed
- src/js/app-boot.js: call renderUnitTermTable on unit expand
- Step 95 — Unit detail term pricing table.html: add <section> with #unit-terms-container

Do not touch
- Core pricing math and guardrails, floorplan UI, global styles.

Requirements
1) Baseline = floorplan reference-term baseline + unit amenity delta.
2) For each term 2–14: price = baseline * (1 + total term pct), then apply caps/floors and over-cap logic.
3) Render columns Term, Price, Notes. Match floorplan table styling. Keep Notes short.
4) Compute on open using in-memory state.
5) Keep accessibility and keyboard behavior.

Tests
- Playwright: open a unit, assert 2 mo and 14 mo rows exist.
- Verify an amenity delta shifts prices by the expected amount subject to caps/floors.

Deliverables
- New step file saved and CHANGELOG.md updated. All tests green.
```

---

## Quick prompting tips for Cursor
- Keep prompts under ~200–300 words when possible.
- Always name the starting file and the exact files to edit.
- Include a "do not touch" list to prevent collateral edits.
- End with the commands or checks you expect Cursor to run.
- If the task is UI, reference existing classes rather than new styles.
- If smoke flakes on macOS, run WebKit: `npm run smoke:mac`.
