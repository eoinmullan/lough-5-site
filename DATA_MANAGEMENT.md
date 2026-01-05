# Data Management Guide

This guide covers the runner database system, adding race results, managing runner profiles, and data quality workflows.

## Runner Database System

The website uses a comprehensive runner identification system that tracks runners across years. See [`scripts/README.md`](scripts/README.md) for complete implementation details.

### Key Concepts

- Each runner has a unique `runner_id` stored in yearly results files
- The database is generated from these source files (deterministic)
- Fuzzy matching helps identify runners across years despite name variations
- Interactive tools help resolve potential duplicates

## Adding New Race Results

### Quick Start (Recommended for New Years)

1. Add new results file: `assets/results/YYYY.json` (without runner_ids)
   - If starting from CSV export: `node scripts/csv-to-json.js csv-results/YYYY.csv assets/results/YYYY.json`
   - See `csv-results/README.md` for CSV preparation details
2. Assign runner IDs using the new-year script: `npm run assign-ids-new-year YYYY [--dry-run]`
   - Only modifies the new year's file
   - Matches against all previous years (read-only)
   - Safer and faster than full reprocessing
3. Review warnings file for uncertain matches: `cat assets/runner-database-warnings.json`
4. Manually assign any uncertain/duplicate runner_ids in `assets/results/YYYY.json`
5. Re-run step 2 to process remaining unassigned results
6. Generate all databases and records: `npm run generate-all`

### Data Structure

New results should follow this structure (without `runner_id` - it will be assigned):

```json
[
  {
    "Position": 1,
    "Bib no.": 123,
    "Name": "Runner Name",
    "Category": "MO",
    "Club": "Club Name",
    "Lap of Lough": "0:05:59",
    "Chip Time": "0:25:15",
    "Gun Time": "0:25:15"
  }
]
```

**Note**: Some fields are optional and only present in certain years (e.g., "2 Miles", "Lap of Lough", "Gun Time").

After assignment, results will include a `runner_id` field:
```json
{
  "Position": 1,
  "Name": "Runner Name",
  "runner_id": "runner-name",
  "Category": "MO",
  "Chip Time": "0:25:15"
}
```

## Runner Profiles System

The website features hand-researched profiles for 95 notable runners (medal winners and record holders). Profiles are stored in `assets/runner-profiles.json` and merged into individual runner stats during generation.

### Profile Structure

```json
{
  "runner-id": {
    "headline": "Brief tagline (e.g., '2024 Champion and Olympian')",
    "power_of_10": "URL or null",
    "world_athletics": "URL or null",
    "additional_links": ["URL to news articles, etc."],
    "notable_achievements": [
      "Achievement 1",
      "Achievement 2"
    ],
    "above_the_fold": "~100 word biographical narrative"
  }
}
```

### Profile Criteria

- Runner must have at least one medal (overall podium, category podium, or age group record)
- Profiles focus on external achievements beyond Lough 5 statistics
- Age record holders receive ~100 word profiles
- Other medalists receive ~50 word profiles

### Managing Profiles

Generate list of runners needing profiles:
```bash
node generate-priority-candidates.js
```

This creates:
- `priority-profile-candidates.json` - Machine-readable list
- `priority-profile-candidates.md` - Human-readable list with criteria

The script identifies runners who:
1. Are in fastest 50 AND have a medal, OR
2. Hold an age category record

After adding profiles to `runner-profiles.json`, regenerate runner stats:
```bash
npm run generate-runner-stats
```

## Available NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run assign-ids-new-year YYYY [--dry-run]` | Assign IDs to a specific new year |
| `npm run generate-db` | Generate runner database from results files |
| `npm run generate-masters-records` | Generate masters age group records |
| `npm run generate-fastest-50` | Generate fastest 50 male/female lists |
| `npm run add-position-fields` | Add category_position, gender_position, awards, highlight to yearly results |
| `npm run generate-runner-stats` | Generate individual runner statistics files (includes profiles) |
| `npm run generate-all` | Run all generation scripts in sequence |
| `npm run check-duplicates` | Check for duplicate runner_ids within each results file |

## Common Workflows

### After adding new year results

```bash
npm run assign-ids-new-year 2025 --dry-run  # Preview first
npm run assign-ids-new-year 2025            # Assign IDs
# Manually fix any warnings in assets/results/2025.json
npm run generate-all                         # Regenerate all databases and records
```

### After fixing typos or updating data

```bash
npm run generate-all              # Regenerate everything from source files
```

### Checking data quality

```bash
npm run check-duplicates          # Find duplicate runner_ids in results files
```

This will identify:
- Same runner_id appearing twice in one year (data entry errors)
- Runners who may need different IDs (different people with same name)
- Unknown/missing runner entries

After fixing duplicates in source files, run `npm run generate-all`

### Finding participation patterns

```bash
node scripts/find-highest-participation.js
```

### Managing runner profiles

```bash
# Generate list of runners needing profiles
node generate-priority-candidates.js

# After adding profiles to runner-profiles.json
npm run generate-runner-stats
```

For detailed documentation on the runner database system and scripts, see [`scripts/README.md`](scripts/README.md).
