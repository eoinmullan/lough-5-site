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

### 1. assign-runner-ids.js

**Purpose**: Automatically assign runner_id to results using fuzzy matching.

**When to use**:
- Initial setup when starting fresh
- After adding new year's results without runner IDs
- When results have missing runner IDs

**What it does**:
- Reads all yearly results files
- **Respects existing `runner_id` values** (never overwrites)
- Uses fuzzy matching to assign IDs to unassigned results
- Auto-assigns high confidence matches (>0.92 similarity)
- Generates new IDs for unmatched results
- Detects potential duplicates (only among newly assigned runners)
- Writes runner_ids directly to yearly files

**Commands**:
```bash
npm run assign-runner-ids                    # Assign IDs to all unassigned results
npm run assign-runner-ids:dry-run            # Preview without writing
npm run assign-runner-ids -- --confidence=0.95  # Use stricter matching threshold
```

**Output**:
- Updated `assets/results/*.json` (with runner_id added)
- `assets/runner-database-warnings.json` (potential duplicates to review)

**Key Features**:
- Incremental & safe - only processes results without runner_id
- Trusts existing runner_ids - won't flag two pre-existing IDs as duplicates
- Handles edge cases like empty names (assigns `unknown-runner-1`, etc.)

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

### 3. review-duplicates.js

**Purpose**: Interactively review and resolve potential duplicate runners.

**When to use**:
- After `assign-runner-ids` generates potential duplicate warnings
- When you need to merge or separate runners manually

**What it does**:
- Loads warnings from `runner-database-warnings.json`
- Shows detailed comparison of each potential duplicate pair
- Lets you interactively:
  - **Mark as same person** → merge by assigning same runner_id
  - **Mark as different** → confirm separate IDs
  - **Fix name typos** (optional)
  - **Set canonical name/club** (optional)
- Updates yearly results files with your decisions

**Commands**:
```bash
npm run review-duplicates
```

**Interactive workflow**:
1. Shows Runner 1 vs Runner 2 details (years, races, times)
2. "Same person?" (y/n/s to skip remaining)
3. If yes: "Which ID to use?" (1/2/custom)
4. "Fix names?" (optional - correct typos)
5. "Mark canonical?" (optional - set preferred name/club)

---

## Helper Scripts

### 4. find-highest-participation.js

**Purpose**: Utility to find runners with most race participations.

**When to use**: For statistics or identifying most active participants.

---

### 5. generate-masters-records.js

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

### 6. generate-fastest-50.js

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

## Standard Workflows

### Initial Setup (Fresh Start)

```bash
# 1. Assign runner IDs to all results
npm run assign-runner-ids:dry-run    # Preview
npm run assign-runner-ids            # Apply

# 2. Review potential duplicates (if any)
cat assets/runner-database-warnings.json
npm run review-duplicates             # If duplicates found

# 3. Generate the database and records
npm run generate-all

# 4. Commit
git add assets/
git commit -m "Initialize runner database"
```

---

### Adding New Year Results (e.g., 2025)

```bash
# 1. Add 2025.json to assets/results/ (without runner_ids)

# 2. Assign runner IDs (respects existing IDs from previous years)
npm run assign-runner-ids

# 3. Review any potential duplicates
npm run review-duplicates             # If warnings generated

# 4. Regenerate database and records
npm run generate-all

# 5. Commit
git add assets/
git commit -m "Add 2025 results"
```

---

### Keeping Everything Up-to-Date

**After editing yearly results files** (fixing typos, updating names, etc.):
```bash
npm run generate-all             # Regenerate all database, records, and stats
```

**After manually merging/splitting runners** (editing runner_ids):
```bash
npm run generate-all             # Regenerate all database, records, and stats
```

**After adding new year's results**:
```bash
npm run assign-runner-ids        # Assign IDs to new results
npm run generate-all             # Regenerate all database, records, and stats
```

**When you suspect duplicates**:
```bash
# Remove runner_id from suspected duplicates in yearly files
npm run assign-runner-ids    # Will re-detect and flag them
npm run review-duplicates    # Review and resolve
npm run generate-db          # Regenerate
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

**All results missing runner_id?**
```bash
npm run assign-runner-ids    # Will assign IDs to all
```

**Some results missing runner_id?**
```bash
npm run assign-runner-ids    # Safe to re-run, only processes unassigned
```

**Too many auto-assignments creating false matches?**
```bash
# Remove questionable runner_ids from yearly files
npm run assign-runner-ids -- --confidence=0.95  # Stricter threshold
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
| Assign IDs to new results | `npm run assign-runner-ids` |
| Preview ID assignments | `npm run assign-runner-ids:dry-run` |
| Review duplicate warnings | `npm run review-duplicates` |
| Regenerate database | `npm run generate-db` |
| Update masters records | `npm run generate-masters-records` |
| Update fastest 50 lists | `npm run generate-fastest-50` |
| Generate runner statistics | `npm run generate-runner-stats` |
| **Generate all records/stats** | `npm run generate-all` |

**Remember**:
- Yearly files (`assets/results/*.json`) are the source of truth
- Always run `npm run generate-db` after editing yearly files
- Run `npm run generate-masters-records`, `npm run generate-fastest-50`, and `npm run generate-runner-stats` after adding new results or updating times
- `assign-runner-ids` is safe to re-run - it never overwrites existing IDs
