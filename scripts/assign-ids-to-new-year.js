const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESULTS_DIR = path.join(__dirname, '..', 'assets', 'results');
const WARNINGS_FILE = path.join(__dirname, '..', 'assets', 'runner-database-warnings.json');
const DATA_DIR = path.join(__dirname, '..', 'data');
const NAME_CHANGES_FILE = path.join(DATA_DIR, 'name-changes.json');

const DEFAULT_AUTO_THRESHOLD = 0.92;
const WARNING_THRESHOLD = 0.85;
const TIME_VARIANCE_THRESHOLD = 0.40;

// Parse command-line arguments
const args = process.argv.slice(2);
const targetYear = parseInt(args.find(arg => !arg.startsWith('--')), 10);

if (!targetYear || isNaN(targetYear)) {
  console.error('Usage: node assign-ids-to-new-year.js YEAR [--dry-run] [--verbose] [--confidence=0.92]');
  console.error('Example: node assign-ids-to-new-year.js 2025 --dry-run');
  process.exit(1);
}

const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  confidence: parseFloat(args.find(arg => arg.startsWith('--confidence='))?.split('=')[1] || DEFAULT_AUTO_THRESHOLD)
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function normalizeAccents(str) {
  if (!str) return '';
  // Normalize accented vowels to plain vowels
  return str
    .replace(/[áàâäã]/gi, 'a')
    .replace(/[éèêë]/gi, 'e')
    .replace(/[íìîï]/gi, 'i')
    .replace(/[óòôöõ]/gi, 'o')
    .replace(/[úùûü]/gi, 'u')
    .replace(/[ñ]/gi, 'n')
    .replace(/[ç]/gi, 'c')
    // Normalize Unicode quotation marks to ASCII apostrophe
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'");  // Single quotes
}

function normalizeName(name) {
  if (!name) return '';
  return normalizeAccents(name).toLowerCase().trim()
    .replace(/\s+/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
}

function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[len1][len2];
}

function calculateSimilarity(name1, name2) {
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);
  if (normalized1 === normalized2) return 1.0;

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  return 1 - (distance / maxLength);
}

function firstNameMatches(name1, name2) {
  const first1 = name1.trim().split(/\s+/)[0].substring(0, 3).toLowerCase();
  const first2 = name2.trim().split(/\s+/)[0].substring(0, 3).toLowerCase();
  return first1 === first2;
}

function getGender(category) {
  if (!category) return null;
  const upper = category.toUpperCase();
  if (upper.startsWith('M')) return 'M';
  if (upper.startsWith('F')) return 'F';
  return null;
}

function timeToSeconds(timeStr) {
  if (!timeStr) return null;
  const cleaned = timeStr.replace(/[,\.]/g, ':').trim();
  const parts = cleaned.split(':').map(p => parseInt(p, 10));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function isReasonableTimeVariance(time1Str, time2Str) {
  const time1 = timeToSeconds(time1Str);
  const time2 = timeToSeconds(time2Str);
  if (!time1 || !time2) return true;
  const variance = Math.abs(time1 - time2) / Math.min(time1, time2);
  return variance <= TIME_VARIANCE_THRESHOLD;
}

function generateRunnerId(name, existingIds, club = '') {
  // Handle empty or invalid names
  if (!name || !name.trim()) {
    let counter = 1;
    while (existingIds.has(`unknown-runner-${counter}`)) counter++;
    return `unknown-runner-${counter}`;
  }

  // Normalize accents before creating ID
  let id = normalizeAccents(name).toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');

  // If after cleaning the name is empty, treat as unknown
  if (!id) {
    let counter = 1;
    while (existingIds.has(`unknown-runner-${counter}`)) counter++;
    return `unknown-runner-${counter}`;
  }

  if (!existingIds.has(id)) return id;

  if (club) {
    const clubPart = normalizeAccents(club).toLowerCase().trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .split('-')[0];
    const idWithClub = `${id}-${clubPart}`;
    if (!existingIds.has(idWithClub)) return idWithClub;
  }

  let counter = 2;
  while (existingIds.has(`${id}-${counter}`)) counter++;
  return `${id}-${counter}`;
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

function loadNameChanges() {
  if (!fs.existsSync(NAME_CHANGES_FILE)) {
    console.log('  No name-changes.json found (this is optional)');
    return {};
  }

  try {
    const nameChanges = JSON.parse(fs.readFileSync(NAME_CHANGES_FILE, 'utf8'));
    const count = Object.keys(nameChanges).length;
    console.log(`  Loaded name changes for ${count} runner(s)`);
    return nameChanges;
  } catch (error) {
    console.warn(`  Warning: Could not parse name-changes.json: ${error.message}`);
    return {};
  }
}

function loadDisambiguation(year) {
  const disambiguationFile = path.join(DATA_DIR, `${year}-disambiguation.json`);

  if (!fs.existsSync(disambiguationFile)) {
    console.log(`  No disambiguation file found for ${year} (this is optional)`);
    return new Map();
  }

  try {
    const data = JSON.parse(fs.readFileSync(disambiguationFile, 'utf8'));

    if (data.year !== year) {
      console.warn(`  Warning: Disambiguation file is for year ${data.year}, not ${year}. Ignoring.`);
      return new Map();
    }

    // Build a map: "position:name" -> runner_id
    const disambiguationMap = new Map();
    for (const decision of data.decisions) {
      const key = `${decision.position}:${decision.name}`;
      disambiguationMap.set(key, decision.runner_id);
    }

    console.log(`  Loaded ${disambiguationMap.size} disambiguation decision(s) for ${year}`);
    return disambiguationMap;
  } catch (error) {
    console.warn(`  Warning: Could not parse disambiguation file: ${error.message}`);
    return new Map();
  }
}

function loadReferenceData() {
  console.log('Loading reference data from previous years...');
  const runnerGroups = {}; // runner_id -> array of results
  const existingIds = new Set();

  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => parseInt(f.replace('.json', ''), 10) < targetYear)
    .sort();

  for (const file of files) {
    const year = parseInt(file.replace('.json', ''), 10);
    const filePath = path.join(RESULTS_DIR, file);
    const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    console.log(`  ${year}: ${results.length} results`);

    for (const result of results) {
      if (result.runner_id) {
        existingIds.add(result.runner_id);
        if (!runnerGroups[result.runner_id]) {
          runnerGroups[result.runner_id] = [];
        }
        runnerGroups[result.runner_id].push({ ...result, year });
      }
    }
  }

  console.log(`  Total historical runners: ${Object.keys(runnerGroups).length}`);
  console.log(`  Total historical IDs: ${existingIds.size}`);

  return { runnerGroups, existingIds };
}

function loadTargetYear() {
  console.log(`\nLoading target year ${targetYear}...`);
  const filePath = path.join(RESULTS_DIR, `${targetYear}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ File not found: ${filePath}`);
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`  ${targetYear}: ${results.length} results`);

  const assigned = results.filter(r => r.runner_id).length;
  const unassigned = results.filter(r => !r.runner_id).length;
  console.log(`  Already assigned: ${assigned}`);
  console.log(`  Unassigned: ${unassigned}`);

  return results;
}

function findBestMatch(result, runnerGroups, nameChanges) {
  let bestMatch = null;
  let bestScore = 0;

  const resultGender = getGender(result.Category);

  for (const runnerId in runnerGroups) {
    const group = runnerGroups[runnerId];
    const sampleResult = group[0];

    // Check for known name change first (exact match)
    if (nameChanges[runnerId]) {
      const knownNames = nameChanges[runnerId];
      for (const knownName of knownNames) {
        // Normalize both names for comparison
        const normalizedResultName = normalizeName(result.Name);
        const normalizedKnownName = normalizeName(knownName);

        if (normalizedResultName === normalizedKnownName) {
          // Exact match with known name variation - still check gender and time
          const groupGender = getGender(sampleResult.Category);
          if (resultGender && groupGender && resultGender !== groupGender) continue;

          // Check time consistency - prefer recent years (last 5 years)
          let timeConsistent = true;
          const recentResults = group
            .filter(r => r.year && (targetYear - r.year) <= 5)
            .slice(-5);

          // If no recent results, fall back to checking all historical results
          const resultsToCheck = recentResults.length > 0 ? recentResults : group;

          for (const groupResult of resultsToCheck) {
            if (groupResult['Chip Time'] && result['Chip Time']) {
              if (!isReasonableTimeVariance(groupResult['Chip Time'], result['Chip Time'])) {
                timeConsistent = false;
                break;
              }
            }
          }

          if (timeConsistent) {
            // Perfect match due to known name change
            return { runnerId, confidence: 1.0, reason: 'known_name_change' };
          }
        }
      }
    }

    // Fall back to regular similarity matching
    // Collect all unique names used by this runner historically
    const historicalNames = [...new Set(group.map(r => r.Name))];

    // Calculate similarity against ALL historical names, use the best match
    let bestSimilarityForRunner = 0;
    let bestHistoricalName = null;

    for (const historicalName of historicalNames) {
      const similarity = calculateSimilarity(result.Name, historicalName);
      if (similarity > bestSimilarityForRunner) {
        bestSimilarityForRunner = similarity;
        bestHistoricalName = historicalName;
      }
    }

    // Use the best similarity found across all historical names
    if (bestSimilarityForRunner < WARNING_THRESHOLD) continue;

    // Check first name against the best matching historical name
    if (!firstNameMatches(result.Name, bestHistoricalName)) continue;

    // Check gender
    const groupGender = getGender(sampleResult.Category);
    if (resultGender && groupGender && resultGender !== groupGender) continue;

    // Check time consistency with group - prefer recent years (last 5 years)
    // Runners naturally improve or slow down over long periods
    let timeConsistent = true;
    const recentResults = group
      .filter(r => r.year && (targetYear - r.year) <= 5)
      .slice(-5); // Last 5 appearances

    // If no recent results, fall back to checking all historical results
    const resultsToCheck = recentResults.length > 0 ? recentResults : group;

    for (const groupResult of resultsToCheck) {
      if (groupResult['Chip Time'] && result['Chip Time']) {
        if (!isReasonableTimeVariance(groupResult['Chip Time'], result['Chip Time'])) {
          timeConsistent = false;
          break;
        }
      }
    }
    if (!timeConsistent) continue;

    if (bestSimilarityForRunner > bestScore) {
      bestScore = bestSimilarityForRunner;
      bestMatch = { runnerId, confidence: bestSimilarityForRunner };
    }
  }

  return bestMatch;
}

function assignIdsToNewYear(targetYearResults, runnerGroups, existingIds, nameChanges, disambiguation, options) {
  console.log(`\nAssigning runner IDs to ${targetYear}...\n`);

  const stats = {
    autoAssigned: 0,
    nameChangeMatches: 0,
    disambiguated: 0,
    newRunners: 0,
    needsReview: 0,
    alreadyAssigned: targetYearResults.filter(r => r.runner_id).length,
    warnings: [],
    duplicatesInNewYear: []
  };

  // Separate assigned and unassigned
  const unassignedResults = targetYearResults.filter(r => !r.runner_id);
  console.log(`Processing ${unassignedResults.length} unassigned results...`);

  // Phase 1: Match against historical runners
  const stillUnassigned = [];

  for (const result of unassignedResults) {
    // Check disambiguation first (position + name match)
    const disambiguationKey = `${result.Position}:${result.Name}`;
    if (disambiguation.has(disambiguationKey)) {
      const disambiguatedId = disambiguation.get(disambiguationKey);
      result.runner_id = disambiguatedId;
      stats.disambiguated++;
      if (options.verbose) {
        console.log(`  ✓ ${result.Name} → ${disambiguatedId} (from disambiguation)`);
      }
      continue;
    }

    const match = findBestMatch(result, runnerGroups, nameChanges);

    if (match && match.confidence >= options.confidence) {
      // Auto-assign to existing runner
      result.runner_id = match.runnerId;
      stats.autoAssigned++;

      if (match.reason === 'known_name_change') {
        stats.nameChangeMatches++;
        if (options.verbose) {
          console.log(`  ✓ ${result.Name} → ${match.runnerId} (known name change)`);
        }
      } else if (options.verbose) {
        console.log(`  ✓ ${result.Name} → ${match.runnerId} (${(match.confidence * 100).toFixed(1)}%)`);
      }
    } else if (match && match.confidence >= WARNING_THRESHOLD) {
      // Uncertain match - needs manual review
      stats.warnings.push({
        result: { year: targetYear, position: result.Position, name: result.Name },
        suggested_id: match.runnerId,
        confidence: match.confidence
      });
      stillUnassigned.push(result);
      stats.needsReview++;
    } else {
      stillUnassigned.push(result);
    }
  }

  console.log(`  ✓ Auto-assigned ${stats.autoAssigned} to existing runners`);
  if (stats.nameChangeMatches > 0) {
    console.log(`    ├─ ${stats.nameChangeMatches} via known name changes`);
  }
  if (stats.disambiguated > 0) {
    console.log(`    ├─ ${stats.disambiguated} via disambiguation decisions`);
  }
  console.log(`  ⚠ ${stats.warnings.length} uncertain matches need review`);
  console.log(`  → ${stillUnassigned.length} remaining unassigned`);

  // Phase 2: Detect duplicates within new year results
  console.log(`\nScanning for duplicates within ${targetYear}...`);
  const duplicatePairs = [];
  const inDuplicatePair = new Set(); // Positions that are part of a duplicate

  for (let i = 0; i < stillUnassigned.length; i++) {
    for (let j = i + 1; j < stillUnassigned.length; j++) {
      const result1 = stillUnassigned[i];
      const result2 = stillUnassigned[j];

      // Skip if either has been disambiguated (position+name check)
      const key1 = `${result1.Position}:${result1.Name}`;
      const key2 = `${result2.Position}:${result2.Name}`;
      if (disambiguation.has(key1) || disambiguation.has(key2)) {
        continue;
      }

      const similarity = calculateSimilarity(result1.Name, result2.Name);

      if (similarity >= 0.80 &&
          firstNameMatches(result1.Name, result2.Name)) {
        const gender1 = getGender(result1.Category);
        const gender2 = getGender(result2.Category);

        if (!gender1 || !gender2 || gender1 === gender2) {
          duplicatePairs.push({
            positions: [result1.Position, result2.Position],
            names: [result1.Name, result2.Name],
            similarity: similarity,
            reason: `Similar names within ${targetYear} - manual review required`
          });

          inDuplicatePair.add(result1.Position);
          inDuplicatePair.add(result2.Position);
        }
      }
    }
  }

  console.log(`  Found ${duplicatePairs.length} duplicate pairs in ${targetYear}`);
  stats.duplicatesInNewYear = duplicatePairs;

  // Phase 3: Assign new IDs to non-duplicate results
  const newRunners = [];
  for (const result of stillUnassigned) {
    if (!inDuplicatePair.has(result.Position)) {
      const newId = generateRunnerId(result.Name, existingIds, result.Club);
      result.runner_id = newId;
      existingIds.add(newId);
      newRunners.push({ id: newId, name: result.Name });
      stats.newRunners++;
    }
  }

  if (newRunners.length > 0) {
    console.log(`  ✓ Created ${newRunners.length} new runner IDs`);
    if (options.verbose) {
      newRunners.forEach(nr => console.log(`    + ${nr.id} (${nr.name})`));
    }
  }

  const resultsInDuplicatePairs = Array.from(inDuplicatePair).length;
  if (resultsInDuplicatePairs > 0) {
    console.log(`  ⚠ ${resultsInDuplicatePairs} results need manual review (potential duplicates)`);
  }

  return stats;
}

function writeResults(targetYearResults, stats, options) {
  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN - No files will be written');
  } else {
    console.log(`\nWriting results to ${targetYear}.json...`);
    const filePath = path.join(RESULTS_DIR, `${targetYear}.json`);
    fs.writeFileSync(filePath, JSON.stringify(targetYearResults, null, 2));

    const assigned = targetYearResults.filter(r => r.runner_id).length;
    const unassigned = targetYearResults.filter(r => !r.runner_id).length;
    console.log(`  ✓ Written ${assigned} with runner_id`);
    console.log(`  ✓ ${unassigned} awaiting manual review`);
  }

  // Write warnings file
  const warnings = {
    target_year: targetYear,
    uncertain_matches: stats.warnings,
    duplicates_in_new_year: stats.duplicatesInNewYear,
    summary: {
      already_assigned: stats.alreadyAssigned,
      auto_assigned: stats.autoAssigned,
      new_runners_created: stats.newRunners,
      needs_review: stats.needsReview + stats.duplicatesInNewYear.length * 2
    }
  };

  const warningsPath = options.dryRun ? WARNINGS_FILE + '.preview' : WARNINGS_FILE;
  fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
  console.log(`  ✓ Written: ${warningsPath}`);
}

function main() {
  console.log('========================================');
  console.log(`Assign Runner IDs to ${targetYear}`);
  console.log('========================================\n');
  console.log(`Target year: ${targetYear}`);
  console.log(`Auto-assign threshold: ${options.confidence}`);
  console.log(`Warning threshold: ${WARNING_THRESHOLD}`);
  console.log(`Dry run: ${options.dryRun}\n`);

  // Load name changes
  const nameChanges = loadNameChanges();

  // Load disambiguation decisions (if any)
  const disambiguation = loadDisambiguation(targetYear);

  // Load reference data (all previous years, read-only)
  const { runnerGroups, existingIds } = loadReferenceData();

  // Load target year (mutable)
  const targetYearResults = loadTargetYear();

  // Assign IDs
  const stats = assignIdsToNewYear(targetYearResults, runnerGroups, existingIds, nameChanges, disambiguation, options);

  // Write results
  writeResults(targetYearResults, stats, options);

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Already had runner_id: ${stats.alreadyAssigned}`);
  console.log(`Auto-assigned to existing: ${stats.autoAssigned}`);
  if (stats.nameChangeMatches > 0) {
    console.log(`  (including ${stats.nameChangeMatches} via known name changes)`);
  }
  if (stats.disambiguated > 0) {
    console.log(`Assigned via disambiguation: ${stats.disambiguated}`);
  }
  console.log(`New runners created: ${stats.newRunners}`);
  console.log(`Uncertain matches: ${stats.warnings.length}`);
  console.log(`Duplicates in ${targetYear}: ${stats.duplicatesInNewYear.length} pairs`);
  console.log(`Total needing review: ${stats.needsReview + stats.duplicatesInNewYear.length * 2}`);
  console.log('========================================\n');

  console.log('Next steps:');
  console.log(`1. Review warnings: cat ${WARNINGS_FILE}`);
  console.log('2. Manually assign IDs to uncertain/duplicate results');
  console.log('3. Run this script again to process any remaining unassigned');
  console.log('4. Generate database: npm run generate-all\n');
}

// Run the script
try {
  main();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
