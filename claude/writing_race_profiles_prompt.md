# Writing Runner Profiles for Lough 5 Site

## Task Overview
Update all existing runner profiles in `assets/runner-profiles.json` to reflect the most recent race year, and add profiles for notable runners who don't yet have one.

## Step 1: Update Existing Profiles

### Process
1. Work through profiles in batches of 5 runners at a time using the alphabetical list in `temp/runner-profiles-alphabetical.txt`
2. For each runner:
   - Read their `assets/runner-stats/{runner_id}.json` file for current data
   - Check their current ranking in `assets/records/fastest-50-male.json`, `fastest-50-female.json`, `masters-men.json` or `masters-women.json`
   - Update rankings if they've changed (e.g., #37→#39)
   - Remove ranking references if they've fallen off the fastest 50 list
   - Add new race results from the most recent year if they competed. Refer to their power of 10 profile or world athletics profile if available from `assets/runner-profiles.json`. If not search the internet for them. You can search their power of 10 profile using the URL `https://www.thepowerof10.info/athletes/athleteslookup.aspx?surname=[surname]&firstname=[first_name]`.
   - Update appearance counts and year ranges (e.g., "2009-2024" → "2009-2025", "16→17 appearances")
   - Ensure consistency between `headline`, `notable_achievements`, and `above_the_fold` sections

### Key Points
- **Temporal references**: Look for any phrases referring to the previous year's race as "most recent" or similar - these need updating
- **Year ranges**: Update spans like "2010-2024" to include the new year
- **Appearance counts**: Increment for runners who competed in the new year
- **New achievements**: Add category titles, medals, records from the new race
- **Rankings**: All fastest 50 positions shift as new fast times are recorded

### Final Pass
After updating all profiles, do a final search-only pass (no tool use) through the entire file looking for outdated temporal references to the previous year.

## Step 2: Add New Profiles

### Identify Missing Profiles
Create a list in `temp/notable-runners-without-profiles.txt` of runners who:
- Are in the top 20 fastest all-time (male or female)
- Hold an age group record

Use:
```bash
# Get runner IDs from fastest 50 lists (top 20 only)
# Get runner IDs from masters records
# Compare against existing profiles using: jq -r '.profiles | keys[]'
```

### Writing New Profiles

#### Research Process
1. **Power of 10 search**: Use `https://www.thepowerof10.info/athletes/athleteslookup.aspx?surname=[surname]&firstname=[first_name]`
   - Match by club and approximate age to identify correct athlete
   - Profile URL format: `https://www.thepowerof10.info/athletes/profile.aspx?athleteid={id}`
   - Include link if found, set to `null` if not found

2. **World Athletics search**: Check for international-level athletes
   - Include link if found, set to `null` if not found

3. **Web search**: For additional context on achievements, particularly:
   - International competitions
   - Championship performances
   - Notable track/road times
   - Local/regional press coverage

#### Profile Structure
```json
"runner-id": {
  "headline": "Brief compelling description (e.g., 'M65 Age Record Holder')",
  "power_of_10": "URL or null",
  "world_athletics": "URL or null",
  "additional_links": [],
  "notable_achievements": [
    "Lough 5 specific achievements first",
    "Track PBs if relevant",
    "Road race PBs if relevant",
    "Championships/international appearances",
    "Club name last"
  ],
  "above_the_fold": "Narrative paragraph..."
}
```

#### Writing Guidelines

**Focus & Emphasis**:
- Primary focus: Lough 5 performances and history
- Secondary: External achievements that provide context (especially high-level/international)
- Emphasize: What makes them notable at Lough 5

**Tone**:
- Be factual and measured - avoid hyperbolic language
- ❌ "dominate the circuit" when they got 2nd and 3rd places
- ❌ "stunning", "remarkable", "extraordinary" unless truly warranted
- ✅ "strong season", "consistent improvement", "established the benchmark"
- Let the facts speak for themselves

**Achievement Descriptions**:
- Use specific results: "third place at the Letterkenny Half Marathon (1:23:00)"
- Avoid vague claims: "dominated the local circuit"
- Support any strong claims with evidence

**Athlete Verification**:
- Double-check runner_id matches the correct person
- Some runners have similar names with different IDs (e.g., "martin-mc-guigan" vs "martin-mcguigan-2")
- Verify club affiliations and race years match before attributing performances

**Profile Length**:
- Keep profiles concise - focus on what's relevant
- `above_the_fold` should be 4-6 sentences typically
- Don't pad with speculation about future performances

## File Structure Notes

- Profiles are stored under the `profiles` key in the JSON: `jq '.profiles | keys[]'`
- Profiles are alphabetically ordered by runner_id
- Insert new profiles in correct alphabetical position
- Use Edit tool (read file first) rather than Write tool for existing files

## Common Issues to Avoid

1. **Wrong runner attribution**: Always verify runner_id matches before attributing performances
2. **Outdated temporal language**: "most recent", "latest edition", "to date" phrases need updating
3. **Inconsistent data**: Ensure headline, achievements, and narrative all agree on rankings/times
4. **Over-selling**: Avoid marketing language - be factual and measured

## Example Session Flow

1. Update existing profiles in batches: "do 46-50", "next do 51-55", etc.
2. After completing all updates, final pass for temporal references
3. Generate list of missing notable profiles
4. Add new profiles, researching each one thoroughly
5. Keep tone measured and fact-based throughout
