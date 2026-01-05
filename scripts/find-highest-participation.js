/**
 * Script to identify runners who have participated most frequently in the race
 * 
 * This script reads all JSON files in the assets/results folder,
 * tracks participation by runner name, and identifies potential name matches
 * across different years to account for inconsistencies in name entry.
 */

const fs = require('fs');
const path = require('path');

// Path to results directory
const resultsDir = path.join(__dirname, '..', 'assets', 'results');
// Path to output file
const outputPath = path.join(__dirname, '..', 'assets', 'highest-participation.json');

// Function to normalize a name for comparison
function normalizeName(name) {
  if (!name) return '';

  // Normalize for comparison: lowercase, accents, Unicode quotes, remove punctuation/spaces
  return name.toLowerCase().trim()
    // Normalize accented vowels
    .replace(/[áàâäã]/gi, 'a')
    .replace(/[éèêë]/gi, 'e')
    .replace(/[íìîï]/gi, 'i')
    .replace(/[óòôöõ]/gi, 'o')
    .replace(/[úùûü]/gi, 'u')
    .replace(/[ñ]/gi, 'n')
    .replace(/[ç]/gi, 'c')
    // Normalize Unicode quotes
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    // Remove all whitespace
    .replace(/\s+/g, '')
    // Remove punctuation
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
}

// Function to extract first and last name
function extractNames(fullName) {
  if (!fullName) return { first: '', last: '' };

  const normalized = normalizeName(fullName);
  const parts = normalized.split(' ');

  if (parts.length === 1) {
    return { first: parts[0], last: '' };
  }

  // Assume last part is the last name
  const lastName = parts[parts.length - 1];
  // Everything else is the first name
  const firstName = parts.slice(0, parts.length - 1).join(' ');

  return { first: firstName, last: lastName };
}

// Function to calculate similarity between two strings (Levenshtein distance)
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;

  const len1 = str1.length;
  const len2 = str2.length;

  // If either string is empty, the distance is the length of the other string
  if (len1 === 0) return 0;
  if (len2 === 0) return 0;

  // Initialize the distance matrix
  const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));

  // Initialize the first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  // Calculate similarity as 1 - (distance / max length)
  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  return 1 - distance / maxLength;
}

// Function to convert time string to a consistent format
function formatTime(timeStr) {
  if (!timeStr) return '';

  // Handle formats with decimal points (e.g., "01:02.33")
  timeStr = timeStr.replace(/\.\d+/, '');

  // Handle formats with commas (e.g., "32:40,0")
  timeStr = timeStr.replace(/,\d+/, '');

  const parts = timeStr.split(':');
  if (parts.length === 2) {
    // Format: "MM:SS" -> "0:MM:SS"
    return `0:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  } else if (parts.length === 3) {
    // Format: "H:MM:SS"
    return `${parts[0]}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  }

  return timeStr;
}

// Main function to find highest participation
async function findHighestParticipation() {
  console.log('Finding runners with highest participation...');

  // Object to store all runners and their participations
  const runners = {};

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
        const name = runner.Name;
        if (!name) return;

        const normalizedName = normalizeName(name);
        const { first: firstName, last: lastName } = extractNames(name);
        const club = runner.Club || '';
        const time = runner["Chip Time"] || '';

        // Check if this runner (or a similar name) already exists
        let found = false;
        let bestMatch = null;
        let bestSimilarity = 0;

        for (const existingName in runners) {
          // Extract first and last names for comparison
          const { first: existingFirst, last: existingLast } = extractNames(existingName);

          // Skip if first names are clearly different (e.g., Paul vs Paula)
          // This helps avoid matching different people with similar names
          if (firstName.length > 3 && existingFirst.length > 3) {
            // If first 3 characters don't match, likely different people
            if (firstName.substring(0, 3) !== existingFirst.substring(0, 3)) {
              continue;
            }

            // If one name is clearly longer than the other, likely different people
            if (Math.abs(firstName.length - existingFirst.length) > 2) {
              continue;
            }

            // Special check for gender-specific name differences
            // Common patterns like Paul vs Paula, John vs Joan, etc.
            const maleEndings = ['l', 'n', 'k', 'd', 'c', 'h'];
            const femaleEndings = ['la', 'na', 'ne', 'da', 'ca', 'ha'];

            // Check if one name ends with a male pattern and the other with a female pattern
            let isGenderDifferent = false;
            for (let i = 0; i < maleEndings.length; i++) {
              if ((firstName.endsWith(maleEndings[i]) && existingFirst.endsWith(femaleEndings[i])) ||
                  (existingFirst.endsWith(maleEndings[i]) && firstName.endsWith(femaleEndings[i]))) {
                isGenderDifferent = true;
                break;
              }
            }

            if (isGenderDifferent) {
              continue;
            }
          }

          // Calculate similarity for first and last names separately
          const firstNameSimilarity = calculateSimilarity(firstName, existingFirst);
          const lastNameSimilarity = calculateSimilarity(lastName, existingLast);

          // Overall similarity is weighted average, with last name being more important
          const overallSimilarity = (firstNameSimilarity * 0.4) + (lastNameSimilarity * 0.6);

          // Higher threshold for considering names as the same person
          if (overallSimilarity > 0.92 && overallSimilarity > bestSimilarity) {
            // Additional check: if we have time data for both runners, check if they're in a similar range
            // This helps distinguish different runners with similar names based on their performance
            const existingResults = runners[existingName].results;
            let timeCheck = true;

            if (time && existingResults.some(r => r.time)) {
              // Get average time for existing runner (in seconds)
              const existingTimes = existingResults
                .filter(r => r.time)
                .map(r => {
                  const parts = r.time.split(':');
                  if (parts.length === 3) {
                    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                  }
                  return 0;
                })
                .filter(t => t > 0);

              if (existingTimes.length > 0) {
                const avgExistingTime = existingTimes.reduce((a, b) => a + b, 0) / existingTimes.length;

                // Convert current time to seconds
                const currentTimeParts = time.split(':');
                let currentTimeSeconds = 0;
                if (currentTimeParts.length === 3) {
                  currentTimeSeconds = parseInt(currentTimeParts[0]) * 3600 + 
                                      parseInt(currentTimeParts[1]) * 60 + 
                                      parseInt(currentTimeParts[2]);
                }

                if (currentTimeSeconds > 0) {
                  // If times differ by more than 40%, likely different runners
                  // Using a higher threshold to account for age-related performance changes
                  const timeDiffPercent = Math.abs(currentTimeSeconds - avgExistingTime) / avgExistingTime;
                  if (timeDiffPercent > 0.4) {
                    timeCheck = false;
                  }
                }
              }
            }

            if (timeCheck) {
              bestMatch = existingName;
              bestSimilarity = overallSimilarity;

              // If exact match, no need to continue searching
              if (overallSimilarity > 0.99) {
                found = true;
                break;
              }
            }
          }
        }

        if (found || bestMatch) {
          // Use the existing name as the key
          const key = bestMatch || name;

          // Add this year's result to the runner's record
          runners[key].results.push({
            name: name,
            year: parseInt(year),
            club: club,
            time: formatTime(time)
          });

          // Sort results by year
          runners[key].results.sort((a, b) => a.year - b.year);

          // Update timesParticipated
          runners[key].timesParticipated = runners[key].results.length;
        } else {
          // Create a new entry for this runner
          runners[name] = {
            name: name,
            timesParticipated: 1,
            results: [{
              name: name,
              year: parseInt(year),
              club: club,
              time: formatTime(time)
            }]
          };
        }
      });
    }

    // Filter runners with 10 or more participations
    const frequentRunners = Object.values(runners)
      .filter(runner => runner.timesParticipated >= 5)
      .sort((a, b) => b.timesParticipated - a.timesParticipated);

    // Output results
    console.log('\nRunners with 10 or more participations:');
    console.log('=====================================\n');

    frequentRunners.forEach(runner => {
      console.log(`Name: ${runner.name}`);
      console.log(`Times Participated: ${runner.timesParticipated}`);
      console.log('Results:');
      runner.results.forEach(result => {
        console.log(`  ${result.year}: ${result.name} (${result.club}) - ${result.time}`);
      });
      console.log('------------------------------\n');
    });

    // Save results to a JSON file
    fs.writeFileSync(outputPath, JSON.stringify(frequentRunners, null, 2));
    console.log(`Results saved to ${outputPath}`);

  } catch (error) {
    console.error('Error processing results:', error);
  }
}

// Run the main function
findHighestParticipation();
