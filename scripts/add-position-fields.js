/**
 * Script to add category_position and gender_position fields to yearly results
 *
 * This script updates each yearly results file to include:
 * - category_position: Position within the runner's age category
 * - gender_position: Position within the runner's gender (all male or all female categories)
 *
 * These fields enable the frontend to display medals/awards for podium finishes.
 */

const fs = require('fs');
const path = require('path');

// Paths
const resultsDir = path.join(__dirname, '..', 'assets', 'results');

// Function to convert time string to seconds for comparisons
function timeToSeconds(timeStr) {
  if (!timeStr) return Infinity;

  timeStr = timeStr.replace(/\.\d+/, '');
  timeStr = timeStr.replace(/,\d+/, '');

  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return Infinity;
}

// Function to get gender from category
function getGender(category) {
  if (!category) return null;
  const upper = category.toUpperCase();
  if (upper.startsWith('M')) return 'M';
  if (upper.startsWith('F')) return 'F';
  return null;
}

// Function to get position within a category
function getCategoryPosition(yearResults, runner) {
  // Filter runners in the same category
  const categoryRunners = yearResults
    .filter(r => r.Category === runner.Category)
    .sort((a, b) => {
      const timeA = timeToSeconds(a["Chip Time"]);
      const timeB = timeToSeconds(b["Chip Time"]);
      return timeA - timeB;
    });

  // Find the runner's position in their category
  const position = categoryRunners.findIndex(r => r.runner_id === runner.runner_id) + 1;
  return position > 0 ? position : null;
}

// Function to get position within gender
function getGenderPosition(yearResults, runner) {
  const runnerGender = getGender(runner.Category);
  if (!runnerGender) return null;

  // Filter runners of the same gender
  const genderRunners = yearResults
    .filter(r => getGender(r.Category) === runnerGender)
    .sort((a, b) => {
      const timeA = timeToSeconds(a["Chip Time"]);
      const timeB = timeToSeconds(b["Chip Time"]);
      return timeA - timeB;
    });

  // Find the runner's position within their gender
  const position = genderRunners.findIndex(r => r.runner_id === runner.runner_id) + 1;
  return position > 0 ? position : null;
}

// Function to determine awards for a runner
function getAwards(yearResults, runner) {
  const awards = [];
  const categoryPosition = getCategoryPosition(yearResults, runner);
  const genderPosition = getGenderPosition(yearResults, runner);

  // Overall podium (1st/2nd/3rd by gender)
  if (genderPosition >= 1 && genderPosition <= 3) {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const field = getGender(runner.Category) === 'M' ? 'Male' : 'Female';
    awards.push(`${medals[genderPosition]} ${field}`);
  }

  // Category podium (1st/2nd/3rd in age category, excluding MO/FO)
  if (categoryPosition >= 1 && categoryPosition <= 3 &&
      runner.Category !== 'MO' && runner.Category !== 'FO') {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    awards.push(`${medals[categoryPosition]} ${runner.Category}`);
  }

  return awards;
}

// Function to determine single highlight emoji (for mobile display)
function getHighlight(yearResults, runner) {
  const categoryPosition = getCategoryPosition(yearResults, runner);
  const genderPosition = getGenderPosition(yearResults, runner);
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };

  // Priority 1: Overall podium (1st/2nd/3rd by gender)
  if (genderPosition >= 1 && genderPosition <= 3) {
    return medals[genderPosition];
  }

  // Priority 2: Category podium (1st/2nd/3rd in age category, excluding MO/FO)
  if (categoryPosition >= 1 && categoryPosition <= 3 &&
      runner.Category !== 'MO' && runner.Category !== 'FO') {
    return medals[categoryPosition];
  }

  // No highlight
  return null;
}

// Main function
async function addPositionFields() {
  console.log('Adding position fields to yearly results...\n');

  // Get all JSON files in the results directory
  const files = fs.readdirSync(resultsDir).filter(file => file.endsWith('.json'));

  let totalUpdated = 0;

  // Process each year's results
  for (const file of files) {
    const year = parseInt(path.basename(file, '.json'));
    const filePath = path.join(resultsDir, file);

    console.log(`Processing ${year} results...`);

    const yearResults = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Add position fields to each runner
    yearResults.forEach(runner => {
      if (!runner.runner_id) return;

      // Calculate positions
      runner.category_position = getCategoryPosition(yearResults, runner);
      runner.gender_position = getGenderPosition(yearResults, runner);

      // Calculate awards
      runner.awards = getAwards(yearResults, runner);

      // Calculate highlight (single emoji for mobile)
      runner.highlight = getHighlight(yearResults, runner);

      totalUpdated++;
    });

    // Write updated results back to file
    fs.writeFileSync(filePath, JSON.stringify(yearResults, null, 2));
    console.log(`  Updated ${yearResults.length} results with position fields`);
  }

  console.log(`\n✓ Successfully updated ${totalUpdated} results across ${files.length} years`);
}

// Run the script
addPositionFields().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
