# Pull Request: Step [N] — [Short Title]

## Type of Change
<!-- Mark the relevant option with an [x] -->
- [ ] New feature (`feat:`)
- [ ] Bug fix (`fix:`)
- [ ] Refactoring (no behavior change)
- [ ] Documentation update (`docs:`)
- [ ] Testing additions (`test:`)
- [ ] Maintenance (`chore:`)

---

## Pre-PR Checklist
<!-- Verify all items before opening this PR -->
- [ ] Feature branch named `feat/step-<NN>-<slug>` (e.g., `feat/step-97-pr-policy-docs`)
- [ ] PR title follows format: `feat: Step <NN> — <short title>`
- [ ] Linked Step HTML file (e.g., `Step 97 — [title].html`) saved in repo
- [ ] `CHANGELOG.md` updated with Step entry under `[Unreleased]`
- [ ] `npm run lint` passes locally (or `npm run lint:fix` applied)
- [ ] `npm run test` passes locally (11/11 boundary tests)
- [ ] `npm run smoke` attempted locally (macOS Chromium may flake; use WebKit if needed)
- [ ] Manual smoke check completed (see CONTRIBUTING.md checklist)
- [ ] No console errors in browser DevTools

---

## What Changed

### Summary
<!-- Brief description of what this Step accomplishes -->

### Files Modified
<!-- List main files changed -->
- Updated: 
- Added: 
- Removed (if any): 

### Behavior Changes
<!-- If this introduces new behavior, describe it. If refactoring, state "No behavior change." -->

---

## Testing

### Automated Tests
<!-- Mark what passed locally -->
- [ ] `npm run lint` — ESLint checks
- [ ] `npm run test:boundaries` — 11/11 Jest boundary tests
- [ ] `npm run smoke` — Playwright smoke tests (or `npm run smoke:mac` with WebKit)

### Manual Smoke Check
<!-- Confirm critical paths tested -->
- [ ] Page loads without errors
- [ ] CSV upload and mapping works
- [ ] Floorplan pricing renders
- [ ] Unit pricing renders
- [ ] Settings persist after refresh
- [ ] No red errors in browser console

### Feature-Specific Testing
<!-- If applicable, describe additional testing done for this Step -->

---

## Screenshots or Step File Link
<!-- Attach screenshots for UI changes, or provide link/path to Step HTML file -->
- Step File: `Step [N] — [title].html`
- Screenshots: (if applicable)

---

## Notes for Reviewers

### macOS Chromium Flake
<!-- If smoke tests failed locally due to known macOS Chromium issue -->
- [ ] Local smoke tests failed due to macOS Sequoia Chromium compatibility
- [ ] Confirmed tests are correctly written and will pass in CI (ubuntu-latest)
- [ ] No code bugs; environmental issue only

### Additional Context
<!-- Any specific areas to focus on or caveats -->

---

## Breaking Changes
<!-- If this PR introduces breaking changes, describe them here -->
- None / [Describe breaking changes if any]

---

## Related Issues
<!-- Link to any related issues -->
- Fixes # 
- Related to # 

---

## Post-Merge Checklist
<!-- Complete after PR is merged -->
- [ ] Tag release: `git tag -a v0.<NN> -m "Step <NN>: <short notes>"`
- [ ] Push tags: `git push origin main --tags`
- [ ] Optional: Create GitHub Release with Step HTML attached
- [ ] Update README.md "Current Version" footer (if this is a milestone)

---

**Ready for Review**: This PR is ready for automated CI checks and review.
