const fs = require('fs');
const path = require('path');

// Check for duplicate runner_ids within the same results file
const resultsDir = path.join(__dirname, '..', 'assets', 'results');
const years = fs.readdirSync(resultsDir)
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''))
  .sort();

let totalDuplicates = 0;
const allDuplicates = [];

console.log('Checking for duplicate runner_ids within each results file...\n');

years.forEach(year => {
  const filePath = path.join(resultsDir, `${year}.json`);
  const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Count occurrences of each runner_id
  const runnerIdCounts = {};
  results.forEach((result, index) => {
    const runnerId = result.runner_id;
    if (!runnerId) {
      console.log(`⚠️  ${year}: Position ${result.Position} (${result.Name}) has no runner_id`);
      return;
    }

    if (!runnerIdCounts[runnerId]) {
      runnerIdCounts[runnerId] = [];
    }
    runnerIdCounts[runnerId].push({
      position: result.Position,
      name: result.Name,
      club: result.Club,
      time: result['Chip Time'],
      category: result.Category,
      arrayIndex: index
    });
  });

  // Find duplicates
  const duplicates = Object.entries(runnerIdCounts)
    .filter(([_, occurrences]) => occurrences.length > 1);

  if (duplicates.length > 0) {
    console.log(`\n❌ ${year}: Found ${duplicates.length} duplicate runner_id(s):`);
    duplicates.forEach(([runnerId, occurrences]) => {
      console.log(`\n  runner_id: "${runnerId}" appears ${occurrences.length} times:`);
      occurrences.forEach((occ, i) => {
        console.log(`    ${i + 1}. Position ${occ.position}: ${occ.name} (${occ.club}) - ${occ.time} - ${occ.category}`);
      });

      allDuplicates.push({
        year,
        runner_id: runnerId,
        occurrences
      });
    });
    totalDuplicates += duplicates.length;
  }
});

console.log('\n' + '='.repeat(80));
if (totalDuplicates === 0) {
  console.log('✅ No duplicate runner_ids found! All results files are clean.');
} else {
  console.log(`\n❌ TOTAL: Found ${totalDuplicates} duplicate runner_id(s) across all years.`);
  console.log('\nThese duplicates need to be fixed by:');
  console.log('1. Checking if they are truly the same person (likely data entry error)');
  console.log('2. If same person: Remove one entry or fix the position/time data');
  console.log('3. If different people: One needs a different runner_id');
  console.log('4. After fixing, run: npm run generate-all');
}
console.log('='.repeat(80) + '\n');
