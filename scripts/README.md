# Race Results Processing Scripts

## Overview

This directory contains scripts for managing runner identification and database generation. The system uses **yearly results files as the source of truth**, with each result containing a `runner_id` field that uniquely identifies runners across years.

## Key Concepts

- **runner_id**: Unique identifier stored in yearly results files (e.g., `"eoin-mullan"`)
- **canonical_name**: Optional flag to override name display (`"canonical_name": true`)
- **canonical_club**: Optional flag to override club display (`"canonical_club": true`)
- **Deterministic**: Once IDs are assigned, same yearly files → same database (no fuzzy matching during generation)
- **Overall vs Category Podiums**:
  - Overall podiums: Top 3 positions within gender (all male or all female categories combined)
  - Category podiums: Top 3 positions within specific age categories (M35, F40, etc., excluding MO/FO)

---

## Core Scripts

### 1. assign-ids-to-new-year.js

**Purpose**: Assign runner_ids to a specific new year's results, using all previous years as read-only reference.

**When to use**:
- **Recommended** for adding new year's results (e.g., 2025)
- When you want to keep previous years untouched
- For safer, faster ID assignment

**What it does**:
- Loads all previous years as read-only reference (never modifies them)
- Only processes and modifies the specified target year
- Matches new results against historical runners
- Auto-assigns high confidence matches (>0.92 similarity)
- Flags uncertain matches for manual review
- Detects duplicates within the new year only
- Generates warnings for manual resolution

**Commands**:
```bash
npm run assign-ids-new-year 2025                    # Assign IDs to 2025 results
npm run assign-ids-new-year 2025 --dry-run          # Preview without writing
npm run assign-ids-new-year 2025 --confidence=0.95  # Use stricter threshold
npm run assign-ids-new-year 2025 --verbose          # Show detailed matching
```

**Output**:
- Updated `assets/results/YYYY.json` (specified year only, with runner_id added)
- `assets/runner-database-warnings.json` (uncertain matches and duplicates)

**Key Features**:
- **Safe**: Previous years never modified
- **Fast**: Only processes one year
- **Clear**: Explicit about which year is being updated
- **Predictable**: Only one file changes

**Workflow**:
```bash
# 1. Preview first
npm run assign-ids-new-year 2025 --dry-run

# 2. Assign IDs
npm run assign-ids-new-year 2025

# 3. Review warnings
cat assets/runner-database-warnings.json

# 4. Manually fix uncertain/duplicate results in assets/results/2025.json

# 5. Re-run to process remaining unassigned
npm run assign-ids-new-year 2025

# 6. Generate database
npm run generate-all
```

---

### 2. generate-runner-database.js

**Purpose**: Generate the runner database from yearly results files.

**When to use**:
- After assigning runner IDs
- After manually editing yearly files
- Whenever you need to regenerate the database

**What it does**:
- Reads all yearly results files
- Groups results by `runner_id`
- Calculates metadata:
  - Canonical name (most common, or flagged with `canonical_name: true`)
  - Gender (from category codes)
  - Most common club (or flagged with `canonical_club: true`)
  - Years participated
  - Total race count
- Validates data integrity (checks for missing IDs, gender inconsistencies)

**Commands**:
```bash
npm run generate-db                # Generate database
npm run generate-db:dry-run        # Preview without writing
npm run generate-db:verbose        # Show detailed output
```

**Output**:
- `assets/runner-database.json` (the main database)
- `assets/runner-database-warnings.json` (validation issues)

**Note**: This is deterministic - no fuzzy matching, just reads the runner_ids already in yearly files.

---

## Helper Scripts

### 3. find-highest-participation.js

**Purpose**: Utility to find runners with most race participations.

**When to use**: For statistics or identifying most active participants.

---

### 4. generate-masters-records.js

**Purpose**: Generate masters (age-group) record lists from yearly results.

**When to use**: After adding new results or updating yearly files.

**What it does**:
- Scans all yearly results files for master age categories (M35-M90, F35-F90)
- Finds the fastest time for each age category across all years
- Includes runner_id from the source results
- Generates separate files for men and women

**Commands**:
```bash
npm run generate-masters-records
```

**Output**:
- `assets/records/masters-men.json`
- `assets/records/masters-women.json`

---

### 5. generate-fastest-50.js

**Purpose**: Generate lists of the fastest 50 male and female runners.

**When to use**: After adding new results or updating yearly files.

**What it does**:
- Scans all yearly results files
- Groups results by runner_id
- Finds each runner's personal best time
- Selects top 50 fastest runners for each gender
- Each runner appears only once (their fastest time)

**Commands**:
```bash
npm run generate-fastest-50
```

**Output**:
- `assets/records/fastest-50-male.json`
- `assets/records/fastest-50-female.json`

**Note**: This is based on personal bests, not individual race times, so each runner appears at most once.

---

### 6. add-position-fields.js

**Purpose**: Add category_position, gender_position, awards, and highlight fields to yearly results.

**When to use**: After adding new results or updating yearly files (part of `generate-all` pipeline).

**What it does**:
- Reads all yearly results files
- Calculates position within category (category_position)
- Calculates position within gender (gender_position)
- Generates awards array (overall podiums, category podiums)
- Generates highlight field (single emoji for mobile display)
- Writes updated fields back to yearly results files

**Commands**:
```bash
npm run add-position-fields
```

**Output**:
- Updates `assets/results/*.json` files with position/award fields

**Note**: This script modifies source files directly, adding computed fields for frontend display.

---

### 7. generate-runner-stats.js

**Purpose**: Generate individual statistics JSON files for each runner in the database.

**When to use**: After adding new results or updating yearly files.

**What it does**:
- Reads all yearly results files
- Groups results by runner_id
- Calculates comprehensive statistics for each runner:
  - Total number of races
  - Complete results history (position, club, category, time, category position)
  - Personal best time with year
  - Best overall position with year
  - Average time across all races
  - Years active (first and last)
  - Most frequent club
  - Badges and achievements:
    - All-time fastest ranking (position in fastest-50 lists)
    - Overall podium finishes (1st/2nd/3rd among all male or female runners)
    - Category podium finishes (1st/2nd/3rd in age category, excluding MO/FO)
    - Age group records held (masters records)
- Writes individual JSON file for each runner

**Commands**:
```bash
npm run generate-runner-stats
```

**Output**:
- `assets/runner-stats/{runner_id}.json` (one file per runner)

**Use case**: Powers individual runner statistics pages on the website.

---

## Utility Scripts

### csv-to-json.js

**Purpose**: Convert CSV race results exports to JSON format matching the schema used by the website.

**When to use**: When importing new year's results from Herbie's Excel exports.

**What it does**:
- Parses CSV files (handles quotes, commas in quoted fields)
- Normalizes field names using configurable aliases
- Converts "Lastname, Firstname" format to "Firstname Lastname"
- Normalizes times to H:MM:SS format
- Cleans and validates data (removes N/A, null values)
- Outputs JSON array matching yearly results schema

**Commands**:
```bash
node scripts/csv-to-json.js input.csv [output.json] [--pretty] [--verbose]

# Example: Convert 2025 CSV export to JSON
node scripts/csv-to-json.js csv-results/2025.csv assets/results/2025.json --pretty
```

**Workflow**: See `csv-results/README.md` for CSV preparation steps (removing title rows, fixing categories, etc.)

**Note**: Output JSON will not have runner_ids - run `npm run assign-ids-new-year YYYY` after conversion.

---

### generate-fastest-500-times.js

**Purpose**: Generate markdown files listing the 500 fastest individual race performances (not personal bests).

**When to use**: For analysis or documentation purposes.

**What it does**:
- Collects all race performances across all years
- Sorts by time (fastest first)
- Takes top 500 performances for each gender
- Same runner can appear multiple times (unlike fastest-50 which uses PBs)
- Generates human-readable markdown tables

**Commands**:
```bash
node scripts/generate-fastest-500-times.js
```

**Output**:
- `fastest-500-male.md` - Top 500 male performances
- `fastest-500-female.md` - Top 500 female performances

---

### generate-interesting-stats.js

**Purpose**: Generate markdown files with various statistical analyses and achievements.

**When to use**: For analysis, documentation, or interesting insights.

**What it does**:
Analyzes runners with 3+ races and generates statistics in multiple categories:
- **Mr./Ms. Consistent**: Lowest variation in times
- **Most Improved**: Biggest improvement from first to last race
- **Time Catches Everyone**: Biggest decline from first to last
- **The Rollercoaster**: Widest range in times (5+ races)
- **Fastest Average**: Best average over 5+ races
- **Aged Like Fine Wine**: Best time in final third of career
- **One Hit Wonder**: One race far better than others
- **Iron Man/Woman**: Longest consecutive year streaks
- **The Dedicated**: Most race appearances
- **Slowest Medal/Win**: Slowest times that won medals
- **Fastest 4th Place**: Just missed the podium
- **Fastest No Medal**: Fast times that didn't medal

**Commands**:
```bash
node scripts/generate-interesting-stats.js
```

**Output**:
- `interesting-stats-male.md` - Male runner statistics
- `interesting-stats-female.md` - Female runner statistics

---

## Standard Workflows

### Adding New Year Results (e.g., 2025)

```bash
# 1. Convert CSV export to JSON (if starting from CSV)
node scripts/csv-to-json.js csv-results/2025.csv assets/results/2025.json --pretty
# See csv-results/README.md for CSV preparation steps

# 2. Preview ID assignments
npm run assign-ids-new-year 2025 --dry-run

# 3. Assign runner IDs (only modifies 2025, uses previous years as reference)
npm run assign-ids-new-year 2025

# 4. Review warnings and manually fix uncertain/duplicate results
cat assets/runner-database-warnings.json
# Edit assets/results/2025.json to assign IDs to flagged results

# 5. Re-run to process any remaining unassigned
npm run assign-ids-new-year 2025

# 6. Regenerate database and records
npm run generate-all

# 7. Commit
git add assets/
git commit -m "Add 2025 results"
```

### Keeping Everything Up-to-Date

**After editing yearly results files** (fixing typos, updating names, etc.):
```bash
npm run generate-all             # Regenerate all database, records, and stats
```

**After manually merging/splitting runners** (editing runner_ids):
```bash
npm run generate-all             # Regenerate all database, records, and stats
```

---

## Manual Corrections

### Fix a name typo
```javascript
// Edit assets/results/2024.json
{
  "Position": 100,
  "Name": "John Smith",  // Fixed from "John Smyth"
  "runner_id": "john-smith"
}

// Then regenerate
npm run generate-db
```

### Set canonical name (override most common)
```javascript
// Edit the result you want to use as canonical
{
  "Name": "John Smith",
  "runner_id": "john-smith",
  "canonical_name": true,      // Use THIS name in database
  "canonical_club": true       // Use THIS club in database
}

npm run generate-db
```

### Merge two runners
```javascript
// Change all occurrences in yearly files:
"runner_id": "john-smith-2"
// To:
"runner_id": "john-smith"

// They're now merged
npm run generate-db
```

### Split a runner
```javascript
// Change some results from:
"runner_id": "john-smith"
// To:
"runner_id": "john-smith-belfast"

// Now separate runners
npm run generate-db
```

---

## Data Structures

### runner-database.json
```json
{
  "runners": {
    "eoin-mullan": {
      "runner_id": "eoin-mullan",
      "canonical_name": "Eoin Mullan",
      "canonical_name_source": "automatic",
      "gender": "M",
      "most_common_club": "Omagh Harriers",
      "most_common_club_source": "manual",
      "years": [2009, 2018, 2019, 2024],
      "total_races": 4
    }
  },
  "metadata": {
    "generated": "2025-11-05T...",
    "total_runners": 4301,
    "total_participations": 8442,
    "unassigned_results": 0
  }
}
```

### Yearly Result (with runner_id)
```json
{
  "Position": 1,
  "Bib no.": 7,
  "Name": "Eoin Mullan",
  "Category": "M40",
  "Club": "Omagh Harriers",
  "Chip Time": "0:25:15",
  "runner_id": "eoin-mullan",
  "canonical_name": true,
  "canonical_club": true
}
```

### Runner Statistics (runner-stats/{runner_id}.json)
```json
{
  "runner_id": "eoin-mullan",
  "name": "Eoin Mullan",
  "total_races": 4,
  "best_time": {
    "time": "0:25:03",
    "year": 2019
  },
  "best_position": {
    "position": 1,
    "year": 2024
  },
  "average_time": "0:26:23",
  "years_active": {
    "first": 2009,
    "last": 2024
  },
  "most_frequent_club": "Omagh Harriers",
  "results": [
    {
      "year": 2024,
      "position": 1,
      "category_position": 1,
      "gender_position": 1,
      "club": "Omagh Harriers",
      "category": "M40",
      "chip_time": "0:25:15"
    }
  ],
  "badges": {
    "fastest_all_time": {
      "position": 6,
      "gender": "M"
    },
    "overall_podiums": [
      {
        "position": 1,
        "year": 2024
      }
    ],
    "category_podiums": [
      {
        "position": 1,
        "category": "M40",
        "year": 2024
      }
    ],
    "age_group_records": [
      {
        "category": "M40",
        "time": "0:25:15",
        "year": 2024
      }
    ]
  }
}
```

---

## Troubleshooting

**New year results missing runner_id?**
```bash
npm run assign-ids-new-year YYYY    # Assign IDs to specific year
```

**Some results in new year still unassigned?**
```bash
# Check warnings file for uncertain matches
cat assets/runner-database-warnings.json
# Manually assign IDs in assets/results/YYYY.json
# Then re-run
npm run assign-ids-new-year YYYY
```

**Database shows wrong name/club for a runner?**
```javascript
// Find the correct result in yearly files and add:
"canonical_name": true,
"canonical_club": true

// Then regenerate
npm run generate-db
```

**Made a mistake?**
```bash
git checkout -- assets/results/    # Revert yearly files
# Or fix manually in yearly files and regenerate
npm run generate-db
```

**Want to merge manually identified duplicates?**
```javascript
// Edit yearly files, change all instances of:
"runner_id": "wrong-id"
// To:
"runner_id": "correct-id"

npm run generate-db
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Convert CSV to JSON | `node scripts/csv-to-json.js input.csv output.json` |
| **Assign IDs to new year** | `npm run assign-ids-new-year YYYY [--dry-run]` |
| Regenerate database | `npm run generate-db` |
| Update masters records | `npm run generate-masters-records` |
| Update fastest 50 lists | `npm run generate-fastest-50` |
| Add position/award fields | `npm run add-position-fields` |
| Generate runner statistics | `npm run generate-runner-stats` |
| **Generate all records/stats** | `npm run generate-all` |
| Find duplicates in results | `npm run check-duplicates` |
| Generate fastest 500 markdown | `node scripts/generate-fastest-500-times.js` |
| Generate interesting stats | `node scripts/generate-interesting-stats.js` |

**Remember**:
- Yearly files (`assets/results/*.json`) are the source of truth
- Always run `npm run generate-db` after editing yearly files
- Run `npm run generate-masters-records`, `npm run generate-fastest-50`, `npm run add-position-fields`, and `npm run generate-runner-stats` after adding new results or updating times
- Or use `npm run generate-all` to run all generation scripts in sequence
- `assign-ids-new-year` is safe to re-run - it only modifies the target year
