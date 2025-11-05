/**
 * Script to find the fastest 50 male and female runners across all years
 *
 * This script reads all JSON files in the assets/results folder,
 * groups results by runner_id, finds each runner's fastest time,
 * and creates top 50 lists for each gender.
 */

const fs = require('fs');
const path = require('path');

// Path to results directory
const resultsDir = path.join(__dirname, '..', 'assets', 'results');

// Function to convert time string to seconds
function timeToSeconds(timeStr) {
  if (!timeStr) return Infinity;

  // Handle formats with decimal points (e.g., "01:02.33")
  timeStr = timeStr.replace(/\.\d+/, '');

  // Handle formats with commas (e.g., "32:40,0")
  timeStr = timeStr.replace(/,\d+/, '');

  const parts = timeStr.split(':');
  if (parts.length === 2) {
    // Format: "MM:SS"
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    // Format: "H:MM:SS"
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return Infinity;
}

// Function to convert seconds back to time string
function secondsToTime(seconds) {
  if (seconds === Infinity) return 'N/A';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // Use H:MM:SS format
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Function to extract gender from category
function getGender(category) {
  if (!category) return null;
  const upper = category.toUpperCase();
  if (upper.startsWith('M')) return 'M';
  if (upper.startsWith('F')) return 'F';
  return null;
}

// Main function to find fastest 50 runners
async function findFastest50() {
  console.log('Finding fastest 50 male and female runners...');

  // Object to store each runner's fastest time
  const maleRunners = {}; // runner_id -> { time, timeStr, name, club, category, year }
  const femaleRunners = {};

  try {
    // Get all JSON files in the results directory
    const files = fs.readdirSync(resultsDir).filter(file => file.endsWith('.json'));

    // Process each file
    for (const file of files) {
      const year = path.basename(file, '.json');
      const filePath = path.join(resultsDir, file);

      console.log(`Processing ${year} results...`);

      // Read and parse the JSON file
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Process each runner
      data.forEach(runner => {
        // Skip if no runner_id (shouldn't happen, but safety check)
        if (!runner.runner_id) {
          return;
        }

        const gender = getGender(runner.Category);
        if (!gender) return;

        const timeStr = runner["Chip Time"];
        if (!timeStr) return;

        const timeInSeconds = timeToSeconds(timeStr);
        if (timeInSeconds === Infinity) return;

        // Determine which collection to use based on gender
        const collection = gender === 'M' ? maleRunners : femaleRunners;

        // Update if this is the runner's first time or faster than their previous best
        if (!collection[runner.runner_id] || timeInSeconds < collection[runner.runner_id].time) {
          collection[runner.runner_id] = {
            time: timeInSeconds,
            timeStr: secondsToTime(timeInSeconds),
            name: runner.Name,
            club: runner.Club || '',
            category: runner.Category,
            year: year,
            runner_id: runner.runner_id
          };
        }
      });
    }

    console.log(`\nFound ${Object.keys(maleRunners).length} male runners`);
    console.log(`Found ${Object.keys(femaleRunners).length} female runners`);

    // Convert to arrays and sort by time, then by year (for tie-breaking)
    const maleArray = Object.values(maleRunners)
      .sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        return parseInt(a.year) - parseInt(b.year); // Earlier year first for ties
      })
      .slice(0, 50); // Take top 50

    const femaleArray = Object.values(femaleRunners)
      .sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        return parseInt(a.year) - parseInt(b.year); // Earlier year first for ties
      })
      .slice(0, 50); // Take top 50

    // Format the output with proper position handling (ties get same position)
    const maleRecords = [];
    let currentPosition = 1;
    for (let i = 0; i < maleArray.length; i++) {
      const runner = maleArray[i];

      // If this is not the first runner and time is different from previous, update position
      if (i > 0 && runner.time !== maleArray[i - 1].time) {
        currentPosition = i + 1;
      }

      maleRecords.push({
        "Position": currentPosition,
        "Year": parseInt(runner.year),
        "Name": runner.name,
        "Club": runner.club === 'Birmingham running and triathlon club' ? 'Birmingham run & tri' : runner.club,
        "Category": runner.category,
        "Finish Time": runner.timeStr,
        "runner_id": runner.runner_id
      });
    }

    const femaleRecords = [];
    currentPosition = 1;
    for (let i = 0; i < femaleArray.length; i++) {
      const runner = femaleArray[i];

      // If this is not the first runner and time is different from previous, update position
      if (i > 0 && runner.time !== femaleArray[i - 1].time) {
        currentPosition = i + 1;
      }

      femaleRecords.push({
        "Position": currentPosition,
        "Year": parseInt(runner.year),
        "Name": runner.name,
        "Club": runner.club,
        "Category": runner.category,
        "Finish Time": runner.timeStr,
        "runner_id": runner.runner_id
      });
    }

    // Output summary
    console.log('\nFastest 50 Runners:');
    console.log('====================================\n');

    console.log('Top 10 Male Runners:');
    maleRecords.slice(0, 10).forEach(record => {
      console.log(`${record.Position}. ${record.Name} (${record.Year}) - ${record["Finish Time"]}`);
    });

    console.log('\nTop 10 Female Runners:');
    femaleRecords.slice(0, 10).forEach(record => {
      console.log(`${record.Position}. ${record.Name} (${record.Year}) - ${record["Finish Time"]}`);
    });

    // Save results to JSON files
    const maleOutputPath = path.join(__dirname, '..', 'assets', 'records', 'fastest-50-male.json');
    fs.writeFileSync(maleOutputPath, JSON.stringify(maleRecords, null, 2));
    console.log(`\nMale results saved to ${maleOutputPath}`);

    const femaleOutputPath = path.join(__dirname, '..', 'assets', 'records', 'fastest-50-female.json');
    fs.writeFileSync(femaleOutputPath, JSON.stringify(femaleRecords, null, 2));
    console.log(`Female results saved to ${femaleOutputPath}`);

  } catch (error) {
    console.error('Error processing results:', error);
  }
}

// Run the main function
findFastest50();
