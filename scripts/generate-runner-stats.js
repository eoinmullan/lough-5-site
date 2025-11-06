/**
 * Script to generate individual statistics JSON files for each runner
 *
 * This script reads all yearly results and record files to create
 * comprehensive statistics for each runner including:
 * - Total participations
 * - Complete results history
 * - Personal bests
 * - Badges and achievements
 */

const fs = require('fs');
const path = require('path');

// Paths
const resultsDir = path.join(__dirname, '..', 'assets', 'results');
const recordsDir = path.join(__dirname, '..', 'assets', 'records');
const statsDir = path.join(__dirname, '..', 'assets', 'runner-stats');

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

// Function to get position within a category for a given year
function getCategoryPosition(yearResults, runner, year) {
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

// Function to get position within gender for a given year
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

// Main function to generate runner statistics
async function generateRunnerStats() {
  console.log('Generating runner statistics...');

  // Ensure output directory exists
  if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir, { recursive: true });
  }

  // Load fastest-50 records to determine all-time rankings
  const fastest50Male = JSON.parse(
    fs.readFileSync(path.join(recordsDir, 'fastest-50-male.json'), 'utf8')
  );
  const fastest50Female = JSON.parse(
    fs.readFileSync(path.join(recordsDir, 'fastest-50-female.json'), 'utf8')
  );

  // Load masters records
  const mastersMen = JSON.parse(
    fs.readFileSync(path.join(recordsDir, 'masters-men.json'), 'utf8')
  );
  const mastersWomen = JSON.parse(
    fs.readFileSync(path.join(recordsDir, 'masters-women.json'), 'utf8')
  );

  // Create lookup maps for records
  const fastest50Map = {};
  fastest50Male.forEach(record => {
    if (record.runner_id) {
      fastest50Map[record.runner_id] = { position: record.Position, gender: 'M' };
    }
  });
  fastest50Female.forEach(record => {
    if (record.runner_id) {
      fastest50Map[record.runner_id] = { position: record.Position, gender: 'F' };
    }
  });

  const mastersMap = {};
  [...mastersMen, ...mastersWomen].forEach(record => {
    if (record.runner_id) {
      mastersMap[record.runner_id] = mastersMap[record.runner_id] || [];
      mastersMap[record.runner_id].push({
        category: record.Category,
        time: record["Finish Time"],
        year: record.Year
      });
    }
  });

  // Object to collect all runner data
  const runnerData = {};

  // Get all JSON files in the results directory
  const files = fs.readdirSync(resultsDir).filter(file => file.endsWith('.json'));

  // Process each year's results
  for (const file of files) {
    const year = parseInt(path.basename(file, '.json'));
    const filePath = path.join(resultsDir, file);

    console.log(`Processing ${year} results...`);

    const yearResults = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Process each runner in this year
    yearResults.forEach(runner => {
      if (!runner.runner_id) return;

      const runnerId = runner.runner_id;

      // Initialize runner data if first time seeing them
      if (!runnerData[runnerId]) {
        runnerData[runnerId] = {
          runner_id: runnerId,
          name: runner.Name,
          results: [],
          gender: getGender(runner.Category)
        };
      }

      // Get category position for this race
      const categoryPosition = getCategoryPosition(yearResults, runner, year);

      // Get gender position for this race
      const genderPosition = getGenderPosition(yearResults, runner);

      // Add this year's result
      runnerData[runnerId].results.push({
        year: year,
        position: runner.Position,
        category_position: categoryPosition,
        gender_position: genderPosition,
        club: runner.Club || '',
        category: runner.Category,
        chip_time: runner["Chip Time"],
        canonical_club: runner.canonical_club === true
      });
    });
  }

  console.log(`\nProcessing ${Object.keys(runnerData).length} runners...`);

  // Generate statistics for each runner
  let statsGenerated = 0;

  for (const [runnerId, data] of Object.entries(runnerData)) {
    // Sort results by year
    data.results.sort((a, b) => a.year - b.year);

    // Calculate statistics
    const totalRaces = data.results.length;

    // Find best time
    let bestTime = null;
    let bestTimeSeconds = Infinity;
    data.results.forEach(result => {
      const seconds = timeToSeconds(result.chip_time);
      if (seconds < bestTimeSeconds) {
        bestTimeSeconds = seconds;
        bestTime = {
          time: result.chip_time,
          year: result.year
        };
      }
    });

    // Find best position
    let bestPosition = null;
    let bestPositionValue = Infinity;
    data.results.forEach(result => {
      if (result.position && result.position < bestPositionValue) {
        bestPositionValue = result.position;
        bestPosition = {
          position: result.position,
          year: result.year
        };
      }
    });

    // Calculate average time
    const validTimes = data.results
      .map(r => timeToSeconds(r.chip_time))
      .filter(t => t !== Infinity);
    const avgSeconds = validTimes.length > 0
      ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
      : null;

    // Format average time
    let averageTime = null;
    if (avgSeconds !== null) {
      const hours = Math.floor(avgSeconds / 3600);
      const minutes = Math.floor((avgSeconds % 3600) / 60);
      const secs = Math.floor(avgSeconds % 60);
      averageTime = `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Years active
    const yearsActive = {
      first: data.results[0].year,
      last: data.results[data.results.length - 1].year
    };

    // Most frequent club - check for canonical_club first
    const canonicalClubResult = data.results.find(r => r.canonical_club);
    let mostFrequentClub = '';

    if (canonicalClubResult) {
      // Use the canonical club if one is marked
      mostFrequentClub = canonicalClubResult.club;
    } else {
      // Otherwise, find the most frequent club
      const clubCounts = {};
      data.results.forEach(r => {
        if (r.club) {
          clubCounts[r.club] = (clubCounts[r.club] || 0) + 1;
        }
      });
      mostFrequentClub = Object.entries(clubCounts).length > 0
        ? Object.entries(clubCounts).sort((a, b) => b[1] - a[1])[0][0]
        : '';
    }

    // Generate badges
    const badges = {};

    // Fastest all-time badge
    if (fastest50Map[runnerId]) {
      badges.fastest_all_time = {
        position: fastest50Map[runnerId].position,
        gender: fastest50Map[runnerId].gender
      };
    }

    // Overall podium finishes (1st, 2nd, 3rd overall within gender)
    const overallPodiums = data.results
      .filter(r => r.gender_position >= 1 && r.gender_position <= 3)
      .map(r => ({
        position: r.gender_position,
        year: r.year
      }));

    if (overallPodiums.length > 0) {
      badges.overall_podiums = overallPodiums;
    }

    // Category podium finishes (1st, 2nd, 3rd in category)
    // Exclude MO (Male Open) and FO (Female Open) as these are overall categories
    const categoryPodiums = data.results
      .filter(r => r.category_position >= 1 && r.category_position <= 3 && r.category !== 'MO' && r.category !== 'FO')
      .map(r => ({
        position: r.category_position,
        category: r.category,
        year: r.year
      }));

    if (categoryPodiums.length > 0) {
      badges.category_podiums = categoryPodiums;
    }

    // Age group records held
    if (mastersMap[runnerId]) {
      badges.age_group_records = mastersMap[runnerId];
    }

    // Build final statistics object
    const stats = {
      runner_id: runnerId,
      name: data.name,
      total_races: totalRaces,
      best_time: bestTime,
      best_position: bestPosition,
      average_time: averageTime,
      years_active: yearsActive,
      most_frequent_club: mostFrequentClub,
      results: data.results,
      badges: badges
    };

    // Write to individual JSON file
    const outputPath = path.join(statsDir, `${runnerId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));

    statsGenerated++;

    if (statsGenerated % 50 === 0) {
      console.log(`Generated ${statsGenerated} stat files...`);
    }
  }

  console.log(`\nComplete! Generated ${statsGenerated} runner statistics files.`);
  console.log(`Files saved to ${statsDir}`);
}

// Run the main function
generateRunnerStats().catch(error => {
  console.error('Error generating runner statistics:', error);
  process.exit(1);
});
