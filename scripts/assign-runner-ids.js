const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESULTS_DIR = path.join(__dirname, '..', 'assets', 'results');
const WARNINGS_FILE = path.join(__dirname, '..', 'assets', 'runner-database-warnings.json');

const DEFAULT_AUTO_THRESHOLD = 0.92;
const WARNING_THRESHOLD = 0.85;
const TIME_VARIANCE_THRESHOLD = 0.40;

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  confidence: parseFloat(args.find(arg => arg.startsWith('--confidence='))?.split('=')[1] || DEFAULT_AUTO_THRESHOLD)
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().trim()
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

  let id = name.toLowerCase().trim()
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
    const clubPart = club.toLowerCase().trim()
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

function loadYearFiles() {
  console.log('Loading yearly results...');
  const yearFiles = {};
  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  for (const file of files) {
    const year = parseInt(file.replace('.json', ''), 10);
    const filePath = path.join(RESULTS_DIR, file);
    yearFiles[year] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`  ${year}: ${yearFiles[year].length} results`);
  }

  return yearFiles;
}

function categorizeResults(yearFiles) {
  console.log('\nCategorizing results...');

  const runnerGroups = {}; // Existing runner_id -> array of results
  const unassignedResults = [];
  const existingIds = new Set();

  for (const year in yearFiles) {
    for (const result of yearFiles[year]) {
      if (result.runner_id) {
        existingIds.add(result.runner_id);
        if (!runnerGroups[result.runner_id]) {
          runnerGroups[result.runner_id] = [];
        }
        runnerGroups[result.runner_id].push({ ...result, year: parseInt(year, 10) });
      } else {
        unassignedResults.push({ ...result, year: parseInt(year, 10) });
      }
    }
  }

  console.log(`  Existing runners: ${Object.keys(runnerGroups).length}`);
  console.log(`  Existing IDs: ${existingIds.size}`);
  console.log(`  Unassigned results: ${unassignedResults.length}`);

  return { runnerGroups, unassignedResults, existingIds };
}

function findBestMatch(result, runnerGroups, options) {
  let bestMatch = null;
  let bestScore = 0;

  const resultGender = getGender(result.Category);

  for (const runnerId in runnerGroups) {
    const group = runnerGroups[runnerId];
    const sampleResult = group[0];

    // Calculate similarity
    const similarity = calculateSimilarity(result.Name, sampleResult.Name);
    if (similarity < WARNING_THRESHOLD) continue;

    // Check first name
    if (!firstNameMatches(result.Name, sampleResult.Name)) continue;

    // Check gender
    const groupGender = getGender(sampleResult.Category);
    if (resultGender && groupGender && resultGender !== groupGender) continue;

    // Check time consistency with group
    let timeConsistent = true;
    for (const groupResult of group) {
      if (groupResult['Chip Time'] && result['Chip Time']) {
        if (!isReasonableTimeVariance(groupResult['Chip Time'], result['Chip Time'])) {
          timeConsistent = false;
          break;
        }
      }
    }
    if (!timeConsistent) continue;

    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = { runnerId, confidence: similarity };
    }
  }

  return bestMatch;
}

function assignRunnerIds(yearFiles, options) {
  console.log('\nAssigning runner IDs...\n');

  const { runnerGroups, unassignedResults, existingIds } = categorizeResults(yearFiles);

  // Track which IDs existed before this run
  const preExistingIds = new Set(existingIds);

  // Track all runner_id assignments by year-position
  const runnerIdAssignments = new Map(); // key: "year-position", value: runner_id

  const stats = {
    autoAssigned: 0,
    warnings: [],
    newRunners: 0,
    alreadyAssigned: Object.values(runnerGroups).reduce((sum, group) => sum + group.length, 0),
    runnerIdAssignments
  };

  // Phase 1: Match unassigned to existing groups
  const stillUnassigned = [];

  for (const result of unassignedResults) {
    const match = findBestMatch(result, runnerGroups, options);

    if (match && match.confidence >= options.confidence) {
      // Auto-assign
      result.runner_id = match.runnerId;
      runnerGroups[match.runnerId].push(result);
      runnerIdAssignments.set(`${result.year}-${result.Position}`, match.runnerId);
      stats.autoAssigned++;

      if (options.verbose) {
        console.log(`  ✓ ${result.Name} (${result.year}) → ${match.runnerId} (${(match.confidence * 100).toFixed(1)}%)`);
      }
    } else if (match && match.confidence >= WARNING_THRESHOLD) {
      // Add to warnings
      stats.warnings.push({
        result: { year: result.year, position: result.Position, name: result.Name },
        suggested_id: match.runnerId,
        confidence: match.confidence
      });
      stillUnassigned.push(result);
    } else {
      stillUnassigned.push(result);
    }
  }

  // Phase 2: Match unassigned to each other
  const grouped = [];
  const used = new Set();

  for (let i = 0; i < stillUnassigned.length; i++) {
    if (used.has(i)) continue;

    const group = [stillUnassigned[i]];
    used.add(i);

    for (let j = i + 1; j < stillUnassigned.length; j++) {
      if (used.has(j)) continue;

      const similarity = calculateSimilarity(stillUnassigned[i].Name, stillUnassigned[j].Name);
      const gender1 = getGender(stillUnassigned[i].Category);
      const gender2 = getGender(stillUnassigned[j].Category);

      if (similarity >= options.confidence &&
          firstNameMatches(stillUnassigned[i].Name, stillUnassigned[j].Name) &&
          (!gender1 || !gender2 || gender1 === gender2)) {
        group.push(stillUnassigned[j]);
        used.add(j);
      }
    }

    grouped.push(group);
  }

  // Phase 3: Assign new IDs to groups
  for (const group of grouped) {
    const newId = generateRunnerId(group[0].Name, existingIds, group[0].Club);
    existingIds.add(newId);

    for (const result of group) {
      result.runner_id = newId;
      runnerIdAssignments.set(`${result.year}-${result.Position}`, newId);
    }

    runnerGroups[newId] = group;
    stats.newRunners++;

    if (options.verbose || group.length > 1) {
      console.log(`  + New runner: ${newId} (${group.length} results)`);
    }
  }

  // Phase 4: Detect potential duplicates among assigned runners
  console.log('\nScanning for potential duplicates...');
  const potentialDuplicates = [];
  const duplicateResultKeys = new Set(); // Track year-position of results in duplicate pairs
  const runnerIds = Object.keys(runnerGroups);

  for (let i = 0; i < runnerIds.length; i++) {
    for (let j = i + 1; j < runnerIds.length; j++) {
      const id1 = runnerIds[i];
      const id2 = runnerIds[j];

      // Skip if both runners existed before this run (trust existing IDs)
      if (preExistingIds.has(id1) && preExistingIds.has(id2)) {
        continue;
      }

      const group1 = runnerGroups[id1];
      const group2 = runnerGroups[id2];

      const similarity = calculateSimilarity(group1[0].Name, group2[0].Name);

      // Only flag if similarity is high but not exact
      if (similarity >= 0.80 && similarity < 1.0) {
        // Check first name match
        if (!firstNameMatches(group1[0].Name, group2[0].Name)) continue;

        // Check gender match
        const gender1 = getGender(group1[0].Category);
        const gender2 = getGender(group2[0].Category);
        if (gender1 && gender2 && gender1 !== gender2) continue;

        // Build participations array with year/position for each runner
        const participations1 = group1.map(result => ({
          year: result.year,
          position: result.Position,
          name: result.Name,
          category: result.Category,
          club: result.Club || '',
          time: result['Chip Time'] || ''
        }));

        const participations2 = group2.map(result => ({
          year: result.year,
          position: result.Position,
          name: result.Name,
          category: result.Category,
          club: result.Club || '',
          time: result['Chip Time'] || ''
        }));

        // Mark all results in both groups as part of a duplicate pair
        group1.forEach(result => duplicateResultKeys.add(`${result.year}-${result.Position}`));
        group2.forEach(result => duplicateResultKeys.add(`${result.year}-${result.Position}`));

        potentialDuplicates.push({
          runner_ids: [id1, id2],
          names: [group1[0].Name, group2[0].Name],
          participations: [participations1, participations2],
          similarity: similarity,
          reason: 'Similar names with matching first name and gender'
        });
      }
    }
  }

  console.log(`  Found ${potentialDuplicates.length} potential duplicate pairs`);
  stats.potentialDuplicates = potentialDuplicates;
  stats.duplicateResultKeys = duplicateResultKeys;

  return stats;
}

function writeResults(yearFiles, stats, options) {
  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN - No files will be written');
    // Still write warnings file in dry-run
    const warnings = {
      potential_duplicates: stats.potentialDuplicates || [],
      uncertain_assignments: stats.warnings,
      summary: {
        auto_assigned: stats.autoAssigned,
        new_runners: stats.newRunners,
        already_assigned: stats.alreadyAssigned,
        needs_review: stats.warnings.length,
        potential_duplicates: (stats.potentialDuplicates || []).length
      }
    };
    fs.writeFileSync(WARNINGS_FILE, JSON.stringify(warnings, null, 2));
    console.log(`  ✓ Written warnings file (preview only): ${WARNINGS_FILE}`);
    return;
  }

  // Write runner_ids to yearly files (excluding potential duplicates)
  console.log('\nWriting runner_ids to yearly files...');
  const duplicateKeys = stats.duplicateResultKeys || new Set();
  const assignments = stats.runnerIdAssignments || new Map();
  let writtenCount = 0;
  let skippedCount = 0;

  for (const year in yearFiles) {
    for (const result of yearFiles[year]) {
      const key = `${year}-${result.Position}`;

      // Skip if this result is part of a potential duplicate pair
      if (duplicateKeys.has(key)) {
        // Remove runner_id if it was assigned (keep it unassigned for manual review)
        delete result.runner_id;
        skippedCount++;
      } else {
        // Apply runner_id from assignments map (if newly assigned)
        if (assignments.has(key)) {
          result.runner_id = assignments.get(key);
        }

        // Count if has runner_id (either pre-existing or newly assigned)
        if (result.runner_id) {
          writtenCount++;
        }
      }
    }

    const filename = `${year}.json`;
    const filePath = path.join(RESULTS_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(yearFiles[year], null, 2));
  }

  console.log(`  ✓ Written ${writtenCount} runner_ids`);
  console.log(`  ✓ Skipped ${skippedCount} results (part of potential duplicates)`);

  // Generate warnings file
  const warnings = {
    potential_duplicates: stats.potentialDuplicates || [],
    uncertain_assignments: stats.warnings,
    summary: {
      auto_assigned: stats.autoAssigned,
      new_runners: stats.newRunners,
      already_assigned: stats.alreadyAssigned,
      needs_review: stats.warnings.length,
      potential_duplicates: (stats.potentialDuplicates || []).length,
      written_to_files: writtenCount,
      awaiting_manual_review: skippedCount
    }
  };

  fs.writeFileSync(WARNINGS_FILE, JSON.stringify(warnings, null, 2));
  console.log(`  ✓ Written: ${WARNINGS_FILE}`);
}

function main() {
  console.log('========================================');
  console.log('Assign Runner IDs (Fresh Start)');
  console.log('========================================\n');
  console.log(`Auto-assign threshold: ${options.confidence}`);
  console.log(`Warning threshold: ${WARNING_THRESHOLD}`);
  console.log(`Dry run: ${options.dryRun}\n`);

  // Load all year files
  const yearFiles = loadYearFiles();

  // Assign runner IDs
  const stats = assignRunnerIds(yearFiles, options);

  // Write results
  writeResults(yearFiles, stats, options);

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Already had runner_id: ${stats.alreadyAssigned}`);
  console.log(`Auto-assigned: ${stats.autoAssigned}`);
  console.log(`New runners created: ${stats.newRunners}`);
  console.log(`Needs manual review: ${stats.warnings.length}`);
  console.log(`Potential duplicates found: ${(stats.potentialDuplicates || []).length}`);
  console.log('========================================\n');

  console.log('Next steps:');
  console.log('1. Review warnings: cat assets/runner-database-warnings.json');
  console.log('2. Review and assign IDs: npm run review-duplicates');
  console.log('3. Generate database: npm run generate-db\n');
}

// Run the script
try {
  main();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
