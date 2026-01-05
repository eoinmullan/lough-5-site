const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESULTS_DIR = path.join(__dirname, '..', 'assets', 'results');
const OUTPUT_FILE = path.join(__dirname, '..', 'assets', 'runner-database.json');
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const WARNINGS_FILE = path.join(TEMP_DIR, 'runner-database-warnings.json');

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose'),
  dryRun: args.includes('--dry-run'),
  years: args.find(arg => arg.startsWith('--years'))?.split('=')[1]
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract gender from category code
 */
function getGender(category) {
  if (!category) return null;
  const upper = category.toUpperCase();
  if (upper.startsWith('M')) return 'M';
  if (upper.startsWith('F')) return 'F';
  return null;
}

/**
 * Find most common element in array
 */
function mostCommon(arr) {
  if (!arr || arr.length === 0) return null;

  const counts = {};
  arr.forEach(item => {
    if (item) {
      counts[item] = (counts[item] || 0) + 1;
    }
  });

  if (Object.keys(counts).length === 0) return null;

  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

/**
 * Normalize club name
 */
function normalizeClub(club) {
  if (!club || typeof club !== 'string') return '';
  return club.trim();
}

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load all race results from JSON files
 */
function loadRaceResults(yearFilter = null) {
  console.log('Loading race results...');

  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  const allResults = [];
  const yearStats = {};

  for (const file of files) {
    const year = parseInt(file.replace('.json', ''), 10);

    // Apply year filter if specified
    if (yearFilter && !yearFilter.includes(year)) {
      continue;
    }

    const filePath = path.join(RESULTS_DIR, file);
    const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    yearStats[year] = {
      total: results.length,
      withId: 0,
      withoutId: 0
    };

    // Process each result
    results.forEach(result => {
      const processedResult = {
        year,
        position: result.Position,
        name: result.Name,
        category: result.Category,
        club: normalizeClub(result.Club) || '',
        runner_id: result.runner_id || null,
        canonical_name: result.canonical_name === true,
        canonical_club: result.canonical_club === true
      };

      if (processedResult.runner_id) {
        yearStats[year].withId++;
      } else {
        yearStats[year].withoutId++;
      }

      allResults.push(processedResult);
    });

    console.log(`  ${year}: ${results.length} results (${yearStats[year].withId} with ID, ${yearStats[year].withoutId} without)`);
  }

  console.log(`\nTotal results loaded: ${allResults.length}`);
  return { allResults, yearStats };
}

// ============================================================================
// RUNNER PROCESSING
// ============================================================================

/**
 * Group results by runner_id and calculate metadata
 */
function processRunners(allResults) {
  console.log('\nProcessing runners...');

  const runnerResults = {};
  const unassignedResults = [];

  // Group results by runner_id
  for (const result of allResults) {
    if (!result.runner_id) {
      unassignedResults.push(result);
      continue;
    }

    if (!runnerResults[result.runner_id]) {
      runnerResults[result.runner_id] = [];
    }

    runnerResults[result.runner_id].push(result);
  }

  const runners = {};

  // Calculate metadata for each runner
  for (const runnerId in runnerResults) {
    const results = runnerResults[runnerId];

    // Find canonical name
    const canonicalNameResult = results.find(r => r.canonical_name);
    const canonical_name = canonicalNameResult
      ? canonicalNameResult.name
      : mostCommon(results.map(r => r.name));

    // Find canonical club
    const canonicalClubResult = results.find(r => r.canonical_club);
    const most_common_club = canonicalClubResult
      ? canonicalClubResult.club
      : mostCommon(results.map(r => r.club).filter(c => c));

    // Determine gender
    const genders = results.map(r => getGender(r.category)).filter(g => g);
    const gender = mostCommon(genders);

    // Get years (sorted)
    const years = [...new Set(results.map(r => r.year))].sort((a, b) => a - b);

    runners[runnerId] = {
      runner_id: runnerId,
      canonical_name: canonical_name || 'Unknown',
      canonical_name_source: canonicalNameResult ? 'manual' : 'automatic',
      gender: gender || null,
      most_common_club: most_common_club || '',
      most_common_club_source: canonicalClubResult ? 'manual' : 'automatic',
      years,
      total_races: years.length
    };
  }

  console.log(`  Processed ${Object.keys(runners).length} unique runners`);
  console.log(`  Found ${unassignedResults.length} unassigned results`);

  return { runners, unassignedResults };
}

// ============================================================================
// WARNING GENERATION
// ============================================================================

/**
 * Generate warnings for potential issues
 */
function generateWarnings(runners, unassignedResults, allResults) {
  console.log('\nGenerating warnings...');

  const warnings = {
    unassigned_results: [],
    multiple_canonical_markers: [],
    suspicious_patterns: []
  };

  // Unassigned results
  unassignedResults.forEach(result => {
    warnings.unassigned_results.push({
      year: result.year,
      position: result.position,
      name: result.name,
      category: result.category,
      club: result.club
    });
  });

  // Check for multiple canonical markers per runner
  const runnerResults = {};
  allResults.forEach(result => {
    if (result.runner_id) {
      if (!runnerResults[result.runner_id]) {
        runnerResults[result.runner_id] = [];
      }
      runnerResults[result.runner_id].push(result);
    }
  });

  for (const runnerId in runnerResults) {
    const results = runnerResults[runnerId];
    const canonicalNameMarkers = results.filter(r => r.canonical_name);
    const canonicalClubMarkers = results.filter(r => r.canonical_club);

    if (canonicalNameMarkers.length > 1) {
      warnings.multiple_canonical_markers.push({
        runner_id: runnerId,
        issue: 'Multiple results marked as canonical_name',
        results: canonicalNameMarkers.map(r => ({ year: r.year, position: r.position }))
      });
    }

    if (canonicalClubMarkers.length > 1) {
      warnings.multiple_canonical_markers.push({
        runner_id: runnerId,
        issue: 'Multiple results marked as canonical_club',
        results: canonicalClubMarkers.map(r => ({ year: r.year, position: r.position }))
      });
    }

    // Check for gender inconsistencies
    const genders = [...new Set(results.map(r => getGender(r.category)).filter(g => g))];
    if (genders.length > 1) {
      warnings.suspicious_patterns.push({
        runner_id: runnerId,
        name: runners[runnerId].canonical_name,
        issue: 'Gender change detected',
        details: `Categories: ${results.map(r => r.category).join(', ')}`
      });
    }
  }

  console.log(`  Generated ${warnings.unassigned_results.length} unassigned result warnings`);
  console.log(`  Generated ${warnings.multiple_canonical_markers.length} canonical marker warnings`);
  console.log(`  Generated ${warnings.suspicious_patterns.length} suspicious pattern warnings`);

  return warnings;
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

function main() {
  console.log('========================================');
  console.log('Runner Database Generation Script');
  console.log('(ID-Based System)');
  console.log('========================================\n');

  // Parse year filter if provided
  let yearFilter = null;
  if (options.years) {
    const yearSpec = options.years;
    if (yearSpec.includes('-')) {
      const [start, end] = yearSpec.split('-').map(y => parseInt(y, 10));
      yearFilter = [];
      for (let y = start; y <= end; y++) {
        yearFilter.push(y);
      }
    } else {
      yearFilter = yearSpec.split(',').map(y => parseInt(y.trim(), 10));
    }
    console.log(`Year filter: ${yearFilter.join(', ')}\n`);
  }

  // Load race results
  const { allResults, yearStats } = loadRaceResults(yearFilter);

  // Process runners
  const { runners, unassignedResults } = processRunners(allResults);

  // Generate warnings
  const warnings = generateWarnings(runners, unassignedResults, allResults);

  // Prepare output
  const yearsIncluded = Object.keys(yearStats).map(y => parseInt(y, 10)).sort((a, b) => a - b);
  const totalParticipations = allResults.length;
  const totalAssigned = totalParticipations - unassignedResults.length;

  const output = {
    runners,
    metadata: {
      years_included: yearsIncluded,
      total_runners: Object.keys(runners).length,
      total_participations: totalParticipations,
      participations_with_id: totalAssigned,
      unassigned_results: unassignedResults.length
    }
  };

  // Write output
  if (!options.dryRun) {
    console.log('\nWriting output files...');

    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    fs.writeFileSync(WARNINGS_FILE, JSON.stringify(warnings, null, 2));
    console.log(`  ✓ Written: ${OUTPUT_FILE}`);
    console.log(`  ✓ Written: ${WARNINGS_FILE}`);
  }

  // Print summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total unique runners: ${Object.keys(runners).length}`);
  console.log(`Total participations: ${totalParticipations}`);
  console.log(`  With runner_id: ${totalAssigned}`);
  console.log(`  Without runner_id: ${unassignedResults.length}`);
  console.log(`\nWarnings:`);
  console.log(`  Unassigned results: ${warnings.unassigned_results.length}`);
  console.log(`  Multiple canonical markers: ${warnings.multiple_canonical_markers.length}`);
  console.log(`  Suspicious patterns: ${warnings.suspicious_patterns.length}`);

  // Show top participators
  const topRunners = Object.values(runners)
    .sort((a, b) => b.total_races - a.total_races)
    .slice(0, 10);

  console.log(`\nTop 10 Participators:`);
  topRunners.forEach((runner, i) => {
    console.log(`  ${i + 1}. ${runner.canonical_name}: ${runner.total_races} races`);
  });

  console.log('\n========================================');

  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN - No files were written');
  } else if (unassignedResults.length > 0) {
    console.log(`\n⚠️  ${unassignedResults.length} results without runner_id`);
    console.log('Run: npm run assign-ids --year YYYY to assign IDs to new results');
  }
}

// Run the script
try {
  main();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
