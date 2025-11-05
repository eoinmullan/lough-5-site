const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================================================
// CONFIGURATION
// ============================================================================

const WARNINGS_FILE = path.join(__dirname, '..', 'assets', 'runner-database-warnings.json');
const RESULTS_DIR = path.join(__dirname, '..', 'assets', 'results');

// ============================================================================
// READLINE INTERFACE
// ============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatParticipation(p, index) {
  return `    ${index}. ${p.year}: Position ${p.position}, ${p.category}, "${p.name}", ${p.club || 'No club'}`;
}

function getGender(category) {
  if (!category) return null;
  const upper = category.toUpperCase();
  if (upper.startsWith('M')) return 'M';
  if (upper.startsWith('F')) return 'F';
  return null;
}

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
 * Build runner data from yearly files by scanning for a specific runner_id
 */
function buildRunnerFromYearlyFiles(runnerId, yearFiles) {
  const participations = [];

  // Scan all year files for results with this runner_id
  for (const year in yearFiles) {
    const results = yearFiles[year];
    for (const result of results) {
      if (result.runner_id === runnerId) {
        participations.push({
          year: parseInt(year, 10),
          position: result.Position,
          category: result.Category,
          name: result.Name,
          club: result.Club || ''
        });
      }
    }
  }

  // Sort by year
  participations.sort((a, b) => a.year - b.year);

  // Calculate metadata
  const canonical_name = mostCommon(participations.map(p => p.name)) || 'Unknown';
  const most_common_club = mostCommon(participations.map(p => p.club).filter(c => c)) || '';
  const gender = mostCommon(participations.map(p => getGender(p.category)).filter(g => g));
  const years = [...new Set(participations.map(p => p.year))].sort((a, b) => a - b);

  return {
    runner_id: runnerId,
    canonical_name,
    gender,
    most_common_club,
    years,
    participations
  };
}

function displayRunner(runner, name) {
  console.log(`\n  Runner: ${name}`);
  console.log(`  ID: ${runner.runner_id}`);
  console.log(`  Gender: ${runner.gender}`);
  console.log(`  Most Common Club: ${runner.most_common_club}`);
  console.log(`  Total Races: ${runner.years.length}`);
  console.log(`  Years: ${runner.years.join(', ')}`);
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('Duplicate Runner Review Tool');
  console.log('========================================\n');

  // Load data
  console.log('Loading data files...');
  const warnings = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));

  const potentialDuplicates = warnings.potential_duplicates;
  console.log(`Found ${potentialDuplicates.length} potential duplicates to review.\n`);

  if (potentialDuplicates.length === 0) {
    console.log('No duplicates to review!');
    rl.close();
    return;
  }

  // Load all year files
  const yearFiles = {};
  const yearFilenames = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  for (const filename of yearFilenames) {
    const year = parseInt(filename.replace('.json', ''), 10);
    const filePath = path.join(RESULTS_DIR, filename);
    yearFiles[year] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  let changesMade = [];
  let reviewed = 0;
  let merged = 0;
  let skipped = 0;

  for (let i = 0; i < potentialDuplicates.length; i++) {
    const duplicate = potentialDuplicates[i];
    const [id1, id2] = duplicate.runner_ids;
    const [name1, name2] = duplicate.names;

    // Use participation data from warnings file
    const [participations1, participations2] = duplicate.participations || [[], []];

    // Build runner objects from participation data
    const runner1 = {
      runner_id: id1,
      canonical_name: mostCommon(participations1.map(p => p.name)) || name1,
      gender: mostCommon(participations1.map(p => getGender(p.category)).filter(g => g)),
      most_common_club: mostCommon(participations1.map(p => p.club).filter(c => c)) || '',
      years: [...new Set(participations1.map(p => p.year))].sort((a, b) => a - b),
      participations: participations1
    };

    const runner2 = {
      runner_id: id2,
      canonical_name: mostCommon(participations2.map(p => p.name)) || name2,
      gender: mostCommon(participations2.map(p => getGender(p.category)).filter(g => g)),
      most_common_club: mostCommon(participations2.map(p => p.club).filter(c => c)) || '',
      years: [...new Set(participations2.map(p => p.year))].sort((a, b) => a - b),
      participations: participations2
    };

    console.log('\n========================================');
    console.log(`Reviewing ${i + 1} of ${potentialDuplicates.length}`);
    console.log('========================================');
    console.log(`\nReason: ${duplicate.reason}`);
    console.log(`Similarity: ${(duplicate.similarity * 100).toFixed(1)}%`);

    // Display both runners
    console.log('\n--- Runner 1 ---');
    displayRunner(runner1, name1);

    console.log('\n--- Runner 2 ---');
    displayRunner(runner2, name2);

    // Ask if they're the same person
    console.log('\n');
    const answer = await question('Are these the same person? (y/n/s to skip all remaining): ');

    if (answer.toLowerCase() === 's') {
      console.log('\nSkipping all remaining duplicates.');
      skipped += (potentialDuplicates.length - i);
      break;
    }

    reviewed++;

    if (answer.toLowerCase() !== 'y') {
      console.log('  → Marked as different people. Assigning separate IDs...');

      // Assign runner_id to each runner's results to keep them separate
      for (const participation of runner1.participations) {
        const yearFile = yearFiles[participation.year];
        if (yearFile) {
          const result = yearFile.find(r => r.Position === participation.position);
          if (result) {
            result.runner_id = id1;
            changesMade.push({
              year: participation.year,
              position: participation.position,
              type: 'runner_id',
              runner_id: id1
            });
          }
        }
      }

      for (const participation of runner2.participations) {
        const yearFile = yearFiles[participation.year];
        if (yearFile) {
          const result = yearFile.find(r => r.Position === participation.position);
          if (result) {
            result.runner_id = id2;
            changesMade.push({
              year: participation.year,
              position: participation.position,
              type: 'runner_id',
              runner_id: id2
            });
          }
        }
      }

      console.log(`  ✓ Assigned ${runner1.participations.length} results to ${id1}`);
      console.log(`  ✓ Assigned ${runner2.participations.length} results to ${id2}`);
      skipped++;
      continue;
    }

    // They are the same person - ask which ID is correct
    console.log('\nThese runners will be merged.');
    console.log(`1. ${id1}`);
    console.log(`2. ${id2}`);
    console.log('3. Enter a different ID');

    const idChoice = await question('\nWhich runner ID should be used? (1/2/3): ');

    let chosenId;
    if (idChoice === '1') {
      chosenId = id1;
    } else if (idChoice === '2') {
      chosenId = id2;
    } else if (idChoice === '3') {
      chosenId = await question('Enter the runner ID: ');
    } else {
      console.log('  → Invalid choice. Skipping this duplicate.');
      skipped++;
      continue;
    }

    console.log(`\n  → Will use runner_id: "${chosenId}"`);

    // Collect all participations
    const allParticipations = [
      ...runner1.participations.map(p => ({...p, oldId: id1})),
      ...runner2.participations.map(p => ({...p, oldId: id2}))
    ].sort((a, b) => a.year - b.year);

    // Ask about fixing names
    console.log('\n--- Optional: Fix Names/Typos ---');
    console.log('Results to potentially update:');
    allParticipations.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.year} Position ${p.position}: "${p.name}"`);
    });

    const fixNames = await question('\nDo you want to fix any names/typos? (y/n): ');

    const nameFixes = {};
    if (fixNames.toLowerCase() === 'y') {
      const fixChoice = await question('Enter numbers to fix (comma-separated) or "all" or "none": ');

      if (fixChoice.toLowerCase() !== 'none') {
        let indicesToFix = [];
        if (fixChoice.toLowerCase() === 'all') {
          indicesToFix = allParticipations.map((_, i) => i);
        } else {
          indicesToFix = fixChoice.split(',').map(n => parseInt(n.trim(), 10) - 1);
        }

        for (const index of indicesToFix) {
          if (index >= 0 && index < allParticipations.length) {
            const p = allParticipations[index];
            const newName = await question(`Enter correct name for "${p.name}" (${p.year}): `);
            if (newName && newName.trim()) {
              nameFixes[`${p.year}-${p.position}`] = newName.trim();
            }
          }
        }
      }
    }

    // Ask about canonical marker
    console.log('\n--- Optional: Mark Canonical Result ---');
    console.log('Which result should be used for canonical name/club?');
    allParticipations.forEach((p, i) => {
      const displayName = nameFixes[`${p.year}-${p.position}`] || p.name;
      console.log(`  ${i + 1}. ${p.year} Position ${p.position}: "${displayName}", "${p.club}"`);
    });
    console.log('  s. Skip (use most common logic)');

    const canonicalChoice = await question('\nChoice: ');

    let canonicalIndex = -1;
    if (canonicalChoice.toLowerCase() !== 's') {
      canonicalIndex = parseInt(canonicalChoice, 10) - 1;
      if (canonicalIndex < 0 || canonicalIndex >= allParticipations.length) {
        console.log('  → Invalid choice. No canonical marker will be set.');
        canonicalIndex = -1;
      }
    }

    // Update the year files
    console.log(`\n  Updating ${allParticipations.length} results...`);

    for (let index = 0; index < allParticipations.length; index++) {
      const participation = allParticipations[index];
      const yearFile = yearFiles[participation.year];

      if (!yearFile) {
        console.log(`  ⚠️  Warning: Year file ${participation.year} not found`);
        continue;
      }

      // Find the result
      const result = yearFile.find(r => r.Position === participation.position);

      if (!result) {
        console.log(`  ⚠️  Could not find position ${participation.position} in ${participation.year}`);
        continue;
      }

      // Set runner_id
      result.runner_id = chosenId;

      // Fix name if requested
      const fixKey = `${participation.year}-${participation.position}`;
      if (nameFixes[fixKey]) {
        result.Name = nameFixes[fixKey];
        changesMade.push({
          year: participation.year,
          position: participation.position,
          type: 'name_fix',
          oldName: participation.name,
          newName: nameFixes[fixKey]
        });
      }

      // Set canonical markers if this is the chosen one
      if (index === canonicalIndex) {
        result.canonical_name = true;
        result.canonical_club = true;
        changesMade.push({
          year: participation.year,
          position: participation.position,
          type: 'canonical_marker'
        });
      }

      changesMade.push({
        year: participation.year,
        position: participation.position,
        type: 'runner_id',
        runner_id: chosenId
      });
    }

    console.log(`  ✓ Updated ${allParticipations.length} results`);
    merged++;
  }

  // Write all modified year files
  console.log('\nWriting updated year files...');
  for (const year in yearFiles) {
    const filename = `${year}.json`;
    const filePath = path.join(RESULTS_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(yearFiles[year], null, 2));
  }
  console.log('  ✓ All year files updated');

  // Summary
  console.log('\n========================================');
  console.log('REVIEW COMPLETE');
  console.log('========================================');
  console.log(`Total duplicates reviewed: ${reviewed}`);
  console.log(`Merged: ${merged}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total changes made: ${changesMade.length}`);

  // Organize changes by type
  const idChanges = changesMade.filter(c => c.type === 'runner_id');
  const nameFixes = changesMade.filter(c => c.type === 'name_fix');
  const canonicalMarkers = changesMade.filter(c => c.type === 'canonical_marker');

  console.log(`  Runner IDs assigned: ${idChanges.length}`);
  console.log(`  Names fixed: ${nameFixes.length}`);
  console.log(`  Canonical markers set: ${canonicalMarkers.length}`);

  if (nameFixes.length > 0) {
    console.log('\n--- Name Fixes ---');
    const fixesByYear = {};
    nameFixes.forEach(fix => {
      if (!fixesByYear[fix.year]) {
        fixesByYear[fix.year] = [];
      }
      fixesByYear[fix.year].push(fix);
    });

    for (const year in fixesByYear) {
      console.log(`\n${year}:`);
      fixesByYear[year].forEach(fix => {
        console.log(`  Position ${fix.position}: "${fix.oldName}" → "${fix.newName}"`);
      });
    }
  }

  if (canonicalMarkers.length > 0) {
    console.log('\n--- Canonical Markers ---');
    canonicalMarkers.forEach(marker => {
      console.log(`  ${marker.year} Position ${marker.position}`);
    });
  }

  console.log('\n========================================');
  console.log('NEXT STEPS');
  console.log('========================================');
  console.log('1. Review the changes with: git diff assets/results/');
  console.log('2. Commit if satisfied: git add assets/results/ && git commit');
  console.log('3. Run: npm run generate-db');
  console.log('4. Duplicates should now be merged correctly');
  console.log('========================================\n');

  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
