# 🏷️ Git Tagging Checklist - MANDATORY FOR EVERY STEP

## ⚠️ CRITICAL: Every Step MUST Be Tagged

**This is not optional.** Every step requires a git tag for:
- Clean rollback points
- Version history
- Stable checkpoints for testing
- Professional release management

## 📋 Step Completion Checklist

After completing any step, you MUST:

### 1. ✅ Complete the Step
- [ ] Code changes implemented
- [ ] Tests passing (`npm run smoke`)
- [ ] Manual verification completed
- [ ] Step HTML file saved

### 2. ✅ Commit Changes
```bash
git add .
git commit -m "feat: Step <NN> — <description>"
git push origin main
```

### 3. ✅ Create Tag (MANDATORY)
```bash
# Pull latest main
git checkout main
git pull origin main

# Create annotated tag
git tag -a v1.<NN> -m "Step <NN>: <short description>

Features:
- <Feature 1>
- <Feature 2>

Testing:
- All CI checks passing
- Smoke tests verified

Changes:
- See CHANGELOG.md for details"

# Push tag to GitHub
git push origin main --tags
```

### 4. ✅ Verify Tag Created
```bash
git tag -l | sort -V
# Should show your new tag (e.g., v1.02, v1.03, etc.)
```

## 🏷️ Versioning Convention

- **`v1.<NN>`** for Step releases (e.g., `v1.02`, `v1.03`)
- **`v1.0.0`** for major stable releases
- **`v1.1.0`** for minor feature releases
- **`v1.0.1`** for patch/bug fix releases

## 🔄 Accessing Previous Steps

```bash
# Go to any previous step
git checkout v1.02  # Step 102
git checkout v0.97  # Step 97
git checkout v0.96  # Step 96 (stable baseline)

# Return to current development
git checkout main
```

## 🚨 What Happens If You Forget?

**If you forget to tag a step:**
1. **Don't panic** - git history is preserved
2. **Create the tag retroactively:**
   ```bash
   git tag -a v1.<NN> <commit-hash> -m "Step <NN>: <description>"
   git push origin main --tags
   ```
3. **Update this checklist** to prevent future occurrences

## 📝 Example: Step 103

```bash
# After completing Step 103
git add .
git commit -m "feat: Step 103 — Add export to Excel functionality"
git push origin main

# Create tag
git tag -a v1.03 -m "Step 103: Add export to Excel functionality

Features:
- Excel export for pricing data
- Downloadable format for operators
- Preserves formatting and calculations

Testing:
- All CI checks passing
- Smoke tests verified
- Manual export testing completed"

# Push tag
git push origin main --tags

# Verify
git tag -l | sort -V
```

---

## 🎯 Remember: **NO STEP IS COMPLETE WITHOUT A TAG**

Every step must be tagged. This is a non-negotiable requirement for:
- Professional development practices
- Clean rollback capabilities
- Version history tracking
- Stable checkpoint management

**Tag first, ask questions later.**
