# Adding New Year Results

This guide explains how to add results for a new race year to the Lough 5 website.

## Prerequisites

- Node.js and npm installed
- CSV or JSON file with race results
- Basic familiarity with command line

## Quick Workflow

```bash
# 1. Convert CSV to JSON (if needed)
node scripts/csv-to-json.js csv-results/2026.json assets/results/2026.json

# 2. Assign runner IDs
npm run assign-ids-new-year 2026

# 3. Review warnings (if any)
npm run review-warnings 2026

# 4. Regenerate all derived data
npm run generate-all

# 5. Test locally
npm start

# 6. Commit and deploy
git add assets/results/2026.json data/2026-disambiguation.json
git commit -m "Add 2026 race results"
```

## Detailed Steps

### Step 1: Prepare Results File

#### Option A: From CSV

If you have a CSV file:

```bash
node scripts/csv-to-json.js csv-results/2026.csv assets/results/2026.json
```

The CSV should have these columns (any order):
- Position / Pos
- Bib no. / Bib / Number
- Name
- Club (optional)
- Category / Cat
- Chip Time / Time
- Gun Time (optional)
- Lap of Lough (optional)

#### Option B: Manual JSON

Create `assets/results/2026.json` with this structure:

```json
[
  {
    "Position": 1,
    "Bib no.": 123,
    "Name": "John Smith",
    "Club": "Local AC",
    "Category": "MO",
    "Lap of Lough": "0:06:45",
    "Chip Time": "0:27:30",
    "Gun Time": "0:27:32"
  }
]
```

**Important**: Do NOT add `runner_id` fields manually - the scripts will add them.

### Step 2: Assign Runner IDs

This script matches runners from the new year to existing runners in the database:

```bash
npm run assign-ids-new-year 2026
```

**What it does:**
- Compares each runner against historical records
- Auto-assigns IDs when confident (>92% similarity)
- Flags uncertain matches for manual review
- Detects potential duplicates within the new year
- Creates `assets/runner-database-warnings.json` if issues found

**Dry run mode** (recommended first):
```bash
npm run assign-ids-new-year 2026 --dry-run
```

### Step 3: Review Warnings (If Any)

If the previous step flagged warnings:

```bash
npm run review-warnings 2026
```

**This interactive tool lets you:**
- Review uncertain cross-year matches
- Review potential duplicates within the new year
- Assign correct runner_id to each flagged person
- Save progress and resume later (press 's' to skip)

**How it works:**
- Shows runner details from database (history, times, clubs)
- Provides options: accept suggestion, enter custom ID, generate new ID
- Saves decisions to `data/2026-disambiguation.json`
- Updates `assets/results/2026.json` with assigned IDs

**Resume after interruption:**
```bash
npm run review-warnings 2026  # Continues from where you left off
```

### Step 4: Regenerate All Data

After IDs are assigned and reviewed:

```bash
npm run generate-all
```

**This regenerates:**
- `assets/runner-database.json` - Main runner database
- `assets/records/` - Masters records and fastest 50 lists
- `assets/runner-stats/` - Individual runner statistics (4000+ files)
- Position/award fields in all yearly results

**Takes 1-2 minutes** to complete.

### Step 5: Test Locally

Start the development server:

```bash
npm start
```

Visit http://localhost:5173 and verify:
- [ ] New year appears in results page dropdown
- [ ] Results load and display correctly
- [ ] Runner links work and show updated statistics
- [ ] Records page updates if any records were broken
- [ ] Search functionality works for new runners

### Step 6: Commit and Deploy

```bash
# Commit new year data
git add assets/results/2026.json
git add data/2026-disambiguation.json  # If it exists
git add assets/runner-database.json
git add assets/records/
git add assets/runner-stats/
git commit -m "Add 2026 race results

- Processed 1,200 runners
- Resolved X warnings
- Updated records and statistics"

# Push to repository
git push

# Deploy to production (see DEPLOYMENT.md)
npm run build
# ... follow deployment steps
```

## Troubleshooting

### Incorrect Runner ID Assignments

**Problem**: A runner was assigned the wrong ID (e.g., `john-smith-2` instead of `john-smith`)

**Solution 1** - Use disambiguation:
```bash
# The review-warnings tool will flag it if confidence is low
npm run review-warnings 2026
```

**Solution 2** - Manual fix:
```bash
# Edit assets/results/2026.json
# Change "runner_id": "john-smith-2" to "runner_id": "john-smith"
# Then regenerate:
npm run generate-all
```

### Name Variations Not Matching

**Problem**: "Patrick O'Neill" doesn't match "Pat O'Neill" from previous years

**The system handles this automatically:**
- Compares against ALL historical names for each runner
- "Pat", "Patrick", "Paddy" will all match if the runner used them before
- Unicode apostrophes (') are normalized to ASCII (')

**If still not matching**, use `data/name-changes.json` for exact name mappings:
```json
{
  "patrick-oneill": [
    "Pat O'Neill",
    "Paddy O'Neill"
  ]
}
```

### Time Variance Issues

**Problem**: Script creates new ID because times don't match

**The system is smart about this:**
- Only compares against recent years (last 5 years or 5 races)
- Allows 40% variance to account for injury, weather, age
- Example: 35:00 → 49:00 is allowed (40% variance)

**If a genuine runner is rejected**, the time difference is likely extreme. Use manual disambiguation via `review-warnings`.

### Duplicate Runners Within New Year

**Problem**: Same person appears twice with different times

**Common causes:**
- Typos in CSV (e.g., "John Smith" vs "John Smyth")
- Different bib numbers for same person
- Walker vs runner category

**Solution**:
```bash
npm run review-warnings 2026
# When prompted for duplicates:
# - Assign same runner_id to both if they're the same person
# - Assign different IDs if they're different people
```

### CSV Conversion Issues

**Problem**: CSV columns not recognized

**Check column names:**
```bash
head -1 csv-results/2026.csv
```

The script recognizes many variants:
- Position: "Position", "Pos", "#"
- Bib: "Bib no.", "Bib", "Number", "Bib Number"
- Time: "Chip Time", "Time", "Finish Time"
- Category: "Category", "Cat", "Age Group"

**If your CSV uses different names**, edit the CSV header row or use the mappings in `csv-to-json.js`.

## Data Quality Checks

### Before Committing

Run these checks:

```bash
# Check for duplicate runner IDs
npm run check-duplicates

# Verify year has data
jq 'length' assets/results/2026.json

# Check first/last entries
jq '.[0], .[-1]' assets/results/2026.json

# Verify all runners have IDs
jq '[.[] | select(.runner_id == null)] | length' assets/results/2026.json
# Should output: 0
```

### After Regeneration

```bash
# Check runner count
jq '.runners | length' assets/runner-database.json

# Verify 2026 is included
jq '.runners | to_entries | .[0].value.years' assets/runner-database.json | grep 2026

# Check for any errors
cat assets/runner-database-warnings.json
```

## Tips for Success

1. **Always start with `--dry-run`** to preview changes
2. **Review warnings carefully** - they catch legitimate issues
3. **Use the disambiguation file** - it's resumable and reusable
4. **Test thoroughly** before deploying - check multiple runners
5. **Commit incrementally** - results file, then generated data
6. **Keep CSV source files** in `csv-results/` for reference

## Advanced: Reprocessing After Fixes

If you fix issues and need to reprocess:

```bash
# Clear assigned IDs
jq '[.[] | del(.runner_id)]' assets/results/2026.json > tmp.json
mv tmp.json assets/results/2026.json

# Clear disambiguation
rm data/2026-disambiguation.json

# Reprocess
npm run assign-ids-new-year 2026
npm run review-warnings 2026
npm run generate-all
```

## Related Documentation

- **[Data Management Guide](DATA_MANAGEMENT.md)** - Runner database details
- **[Scripts Documentation](scripts/README.md)** - Technical script details
- **[Development Guide](DEVELOPMENT.md)** - Local development setup
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment

## Need Help?

- Check `assets/runner-database-warnings.json` for clues
- Review script output carefully - it's verbose for debugging
- See `scripts/README.md` for detailed algorithm explanations
- The disambiguation file in `data/` is your friend - use it liberally
