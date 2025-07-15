/**
 * Script to find the fastest times by age category across all result files
 * 
 * This script reads all JSON files in the assets/results folder,
 * extracts runner information, and determines the fastest time
 * for each age category across all years.
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
    // Treat as "0:MM:SS" for consistency
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    // Format: "H:MM:SS"
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return Infinity;
}

// Function to convert seconds back to time string in H:MM:SS format
function secondsToTime(seconds) {
  if (seconds === Infinity) return 'N/A';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // Always use H:MM:SS format
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Function to normalize category names for consistent capitalization
function normalizeCategory(category) {
  if (!category) return '';

  // Convert to string in case it's a number
  category = String(category).trim();

  // Common category patterns
  const patterns = {
    // Male categories
    'm': 'M', 'mo': 'MO', 'm0': 'MO',
    // Female categories
    'f': 'F', 'fo': 'FO', 'f0': 'FO',
    // Age-specific categories with space
    'm u': 'M U', 'f u': 'F U'
  };

  // Convert to lowercase for comparison
  const lowerCategory = category.toLowerCase();

  // Check if the category matches any of our patterns
  for (const [pattern, replacement] of Object.entries(patterns)) {
    if (lowerCategory === pattern) {
      return replacement;
    }
  }

  // For age categories like M35, F40, etc.
  // Ensure first letter is capitalized and the rest is preserved
  if (/^[mf]\d+/i.test(lowerCategory)) {
    return lowerCategory.charAt(0).toUpperCase() + lowerCategory.slice(1);
  }

  // For categories with spaces like "M U19"
  if (lowerCategory.includes(' ')) {
    return lowerCategory.split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  // If no specific rule, capitalize first letter
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Main function to find fastest times
async function findFastestTimes() {
  console.log('Finding fastest times for masters age categories...');

  // Define the specific age categories we want to find records for
  const targetAges = [35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];

  // Object to store fastest times by category
  const fastestTimesMale = {};
  const fastestTimesFemale = {};

  // Initialize categories
  targetAges.forEach(age => {
    fastestTimesMale[`M${age}`] = {
      time: Infinity,
      timeStr: '',
      runner: '',
      club: '',
      year: ''
    };
    fastestTimesFemale[`F${age}`] = {
      time: Infinity,
      timeStr: '',
      runner: '',
      club: '',
      year: ''
    };
  });

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
        let category = runner.Category;
        if (!category) return;

        // Normalize category name to ensure consistent capitalization
        category = normalizeCategory(category);

        // Check if this is one of our target categories
        if (!targetAges.some(age => category === `M${age}` || category === `F${age}`)) {
          return;
        }

        // Use only Gun Time as per requirements
        const timeStr = runner["Gun Time"];
        if (!timeStr) return;

        const timeInSeconds = timeToSeconds(timeStr);

        // Determine which collection to use based on gender
        const collection = category.startsWith('M') ? fastestTimesMale : fastestTimesFemale;

        // Update if this is the fastest time for the category
        if (timeInSeconds < collection[category].time) {
          collection[category] = {
            time: timeInSeconds,
            timeStr: secondsToTime(timeInSeconds), // Use consistent H:MM:SS format
            runner: runner.Name,
            club: runner.Club || '',
            year: year
          };
        }
      });
    }

    // Create separate arrays for male and female records
    const maleRecords = [];
    const femaleRecords = [];
    let malePosition = 1;
    let femalePosition = 1;

    // Process male categories
    Object.keys(fastestTimesMale).forEach(category => {
      const record = fastestTimesMale[category];
      // Only include categories with valid times
      if (record.time !== Infinity) {
        maleRecords.push({
          "Position": malePosition,
          "Year": parseInt(record.year),
          "Name": record.runner,
          "Club": record.club,
          "Category": category,
          "Finish Time": record.timeStr
        });
        malePosition++;
      }
    });

    // Process female categories
    Object.keys(fastestTimesFemale).forEach(category => {
      const record = fastestTimesFemale[category];
      // Only include categories with valid times
      if (record.time !== Infinity) {
        femaleRecords.push({
          "Position": femalePosition,
          "Year": parseInt(record.year),
          "Name": record.runner,
          "Club": record.club,
          "Category": category,
          "Finish Time": record.timeStr
        });
        femalePosition++;
      }
    });

    // Output results
    console.log('\nFastest Times by Masters Age Category:');
    console.log('====================================\n');

    console.log('Male Records:');
    maleRecords.forEach(record => {
      console.log(`Category: ${record.Category}`);
      console.log(`Runner: ${record.Name}`);
      console.log(`Club: ${record.Club}`);
      console.log(`Time: ${record["Finish Time"]}`);
      console.log(`Year: ${record.Year}`);
      console.log('------------------------------\n');
    });

    console.log('Female Records:');
    femaleRecords.forEach(record => {
      console.log(`Category: ${record.Category}`);
      console.log(`Runner: ${record.Name}`);
      console.log(`Club: ${record.Club}`);
      console.log(`Time: ${record["Finish Time"]}`);
      console.log(`Year: ${record.Year}`);
      console.log('------------------------------\n');
    });

    // Save results to separate JSON files
    const maleOutputPath = path.join(__dirname, '..', 'assets', 'records', 'masters-men.json');
    fs.writeFileSync(maleOutputPath, JSON.stringify(maleRecords, null, 2));
    console.log(`Male results saved to ${maleOutputPath}`);

    const femaleOutputPath = path.join(__dirname, '..', 'assets', 'records', 'masters-women.json');
    fs.writeFileSync(femaleOutputPath, JSON.stringify(femaleRecords, null, 2));
    console.log(`Female results saved to ${femaleOutputPath}`);

  } catch (error) {
    console.error('Error processing results:', error);
  }
}

// Run the main function
findFastestTimes();
