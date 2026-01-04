#!/usr/bin/env node
/**
 * Generate and fix name typos in CSV results files.
 *
 * This script:
 * - Detects potential typos using pattern matching and frequency analysis
 * - Prompts user for manual verification
 * - Fixes typos in CSV file
 * - Tracks known typos and false positives in data/known-typos.json
 *
 * Usage:
 *   node scripts/generate-typos.js csv-results/2025.csv
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESULTS_DIR = path.join(__dirname, '..', 'assets', 'results');
const DATA_DIR = path.join(__dirname, '..', 'data');
const KNOWN_TYPOS_FILE = path.join(DATA_DIR, 'known-typos.json');

const RARE_THRESHOLD = 3;       // Names appearing < 3 times are considered rare
const COMMON_THRESHOLD = 5;     // Names appearing >= 5 times are considered common
const SIMILARITY_THRESHOLD = 0.7; // Minimum similarity for typo suggestion
const MAX_EDIT_DISTANCE = 2;    // Maximum edit distance for typo detection

// Parse command-line arguments
const args = process.argv.slice(2);
const csvFilePath = args[0];

if (!csvFilePath) {
  console.error('Usage: node scripts/generate-typos.js <csv-file>');
  console.error('Example: node scripts/generate-typos.js csv-results/2025.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`Error: File not found: ${csvFilePath}`);
  process.exit(1);
}

// Readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function normalizeName(name) {
  if (!name) return '';
  // Normalize for comparison: lowercase, remove accents, remove punctuation/spaces
  return name.toLowerCase()
    .replace(/[áàâäã]/gi, 'a')
    .replace(/[éèêë]/gi, 'e')
    .replace(/[íìîï]/gi, 'i')
    .replace(/[óòôöõ]/gi, 'o')
    .replace(/[úùûü]/gi, 'u')
    .replace(/[ñ]/gi, 'n')
    .replace(/[ç]/gi, 'c')
    .replace(/[^a-z0-9]/g, '');
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

function titleCase(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ============================================================================
// DATA LOADING
// ============================================================================

function loadKnownTypos() {
  if (!fs.existsSync(KNOWN_TYPOS_FILE)) {
    console.log('  No known-typos.json found, starting fresh');
    return {
      first_names: {},
      surnames: {},
      false_positives: {
        first_names: [],
        surnames: []
      }
    };
  }

  try {
    const data = JSON.parse(fs.readFileSync(KNOWN_TYPOS_FILE, 'utf8'));
    const firstCount = Object.keys(data.first_names || {}).length;
    const surnameCount = Object.keys(data.surnames || {}).length;
    const fpCount = (data.false_positives?.first_names?.length || 0) +
                    (data.false_positives?.surnames?.length || 0);
    console.log(`  Loaded ${firstCount} first name + ${surnameCount} surname typos, ${fpCount} false positives`);
    return data;
  } catch (error) {
    console.warn(`  Warning: Could not parse known-typos.json: ${error.message}`);
    return { first_names: {}, surnames: {}, false_positives: { first_names: [], surnames: [] } };
  }
}

function loadHistoricalData() {
  console.log('  Loading historical data for frequency analysis...');
  const allNames = { first_names: {}, surnames: {} };

  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  for (const file of files) {
    const filePath = path.join(RESULTS_DIR, file);
    try {
      const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      for (const result of results) {
        if (!result.Name) continue;

        // Parse "Firstname Lastname" or handle variations
        const parts = result.Name.trim().split(/\s+/);
        if (parts.length >= 2) {
          const firstName = parts[0];
          const surname = parts.slice(1).join(' ');

          const normalizedFirst = normalizeName(firstName);
          const normalizedSurname = normalizeName(surname);

          if (normalizedFirst) {
            allNames.first_names[firstName] = (allNames.first_names[firstName] || 0) + 1;
          }
          if (normalizedSurname) {
            allNames.surnames[surname] = (allNames.surnames[surname] || 0) + 1;
          }
        }
      }
    } catch (error) {
      console.warn(`    Warning: Could not parse ${file}: ${error.message}`);
    }
  }

  const firstCount = Object.keys(allNames.first_names).length;
  const surnameCount = Object.keys(allNames.surnames).length;
  console.log(`    Loaded ${firstCount} unique first names, ${surnameCount} unique surnames`);

  return allNames;
}

function parseCSV(filePath) {
  console.log('  Parsing CSV file...');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header
  const header = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row = {};
    header.forEach((col, idx) => {
      row[col] = values[idx] || '';
    });

    rows.push(row);
  }

  console.log(`    Parsed ${rows.length} rows`);
  return { header, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result.map(v => v.trim());
}

function writeCSV(filePath, header, rows) {
  const lines = [header.map(escapeCSVValue).join(',')];

  for (const row of rows) {
    const values = header.map(col => escapeCSVValue(row[col] || ''));
    lines.push(values.join(','));
  }

  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function escapeCSVValue(value) {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function saveKnownTypos(knownTypos) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(KNOWN_TYPOS_FILE, JSON.stringify(knownTypos, null, 2) + '\n');
  console.log(`  ✓ Saved: ${KNOWN_TYPOS_FILE}`);
}

// ============================================================================
// PREPROCESSING
// ============================================================================

function applyKnownTypos(csvData, knownTypos) {
  console.log('  Applying known typos to CSV...');
  let appliedCount = 0;

  for (const row of csvData.rows) {
    if (!row.Name) continue;

    const parts = row.Name.trim().split(/\s+/);
    if (parts.length < 2) continue;

    let firstName = parts[0];
    let surname = parts.slice(1).join(' ');
    let changed = false;

    // Check first name
    const normalizedFirst = normalizeName(firstName);
    if (knownTypos.first_names[normalizedFirst]) {
      firstName = knownTypos.first_names[normalizedFirst];
      changed = true;
      appliedCount++;
    }

    // Check surname
    const normalizedSurname = normalizeName(surname);
    if (knownTypos.surnames[normalizedSurname]) {
      surname = knownTypos.surnames[normalizedSurname];
      changed = true;
      appliedCount++;
    }

    if (changed) {
      row.Name = `${firstName} ${surname}`;
    }
  }

  console.log(`    Applied ${appliedCount} known typos`);
  return csvData;
}

function buildFrequencyMaps(csvData, historicalData) {
  console.log('  Building frequency maps...');

  // Start with historical data
  const maps = {
    first_names: { ...historicalData.first_names },
    surnames: { ...historicalData.surnames }
  };

  // Add CSV data
  for (const row of csvData.rows) {
    if (!row.Name) continue;

    const parts = row.Name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const surname = parts.slice(1).join(' ');

      maps.first_names[firstName] = (maps.first_names[firstName] || 0) + 1;
      maps.surnames[surname] = (maps.surnames[surname] || 0) + 1;
    }
  }

  return maps;
}

// ============================================================================
// TYPO DETECTION
// ============================================================================

function detectMcOPrefixIssues(name) {
  if (!name) return null;

  // Pattern 1: Mc followed by lowercase (e.g., Mcmullan → McMullan)
  if (/^Mc[a-z]/.test(name)) {
    return name.replace(/^Mc([a-z])/, (match, letter) => `Mc${letter.toUpperCase()}`);
  }

  // Pattern 2: Mc followed by space (e.g., Mc Mullan → McMullan)
  if (/^Mc\s+/.test(name)) {
    return name.replace(/^Mc\s+/, 'Mc');
  }

  // Pattern 3: O followed by uppercase then lowercase, no apostrophe (e.g., OKane → O'Kane)
  if (/^O[A-Z][a-z]/.test(name)) {
    return name.replace(/^O([A-Z])/, "O'$1");
  }

  // Pattern 4: O followed by space (e.g., O Kane → O'Kane)
  if (/^O\s+/.test(name)) {
    return name.replace(/^O\s+/, "O'");
  }

  // Pattern 5: O with backtick instead of apostrophe (e.g., O`Kane → O'Kane)
  if (/^O`/.test(name)) {
    return name.replace(/^O`/, "O'");
  }

  // Pattern 6: O' followed by lowercase (e.g., O'kane → O'Kane)
  if (/^O'[a-z]/.test(name)) {
    return name.replace(/^O'([a-z])/, (match, letter) => `O'${letter.toUpperCase()}`);
  }

  return null;
}

function detectCasingIssues(name) {
  if (!name) return null;

  // All lowercase
  if (name === name.toLowerCase() && /[a-z]/.test(name)) {
    return titleCase(name);
  }

  // All uppercase
  if (name === name.toUpperCase() && /[A-Z]/.test(name)) {
    return titleCase(name);
  }

  // Check for Mc/O prefix issues first (they take precedence)
  const mcOFix = detectMcOPrefixIssues(name);
  if (mcOFix) return mcOFix;

  return null;
}

function detectFrequencyBasedTypos(name, frequencyMap, nameType) {
  if (!name) return null;

  const frequency = frequencyMap[name] || 0;

  // Only check rare names
  if (frequency >= RARE_THRESHOLD) return null;

  const normalized = normalizeName(name);
  let bestMatch = null;
  let bestScore = 0;

  // Compare against common names
  for (const [commonName, commonFreq] of Object.entries(frequencyMap)) {
    if (commonFreq < COMMON_THRESHOLD) continue;
    if (commonName === name) continue;

    const normalizedCommon = normalizeName(commonName);
    const distance = levenshteinDistance(normalized, normalizedCommon);

    if (distance > MAX_EDIT_DISTANCE) continue;

    const similarity = calculateSimilarity(name, commonName);

    if (similarity >= SIMILARITY_THRESHOLD && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = {
        suggestion: commonName,
        similarity,
        frequency: commonFreq
      };
    }
  }

  return bestMatch;
}

function detectTypos(csvData, frequencyMaps, knownTypos) {
  console.log('  Detecting typos...');

  const suspects = {
    first_names: {},
    surnames: {}
  };

  for (const row of csvData.rows) {
    if (!row.Name) continue;

    const parts = row.Name.trim().split(/\s+/);
    if (parts.length < 2) continue;

    const firstName = parts[0];
    const surname = parts.slice(1).join(' ');

    // Check first name
    if (!knownTypos.false_positives.first_names.includes(normalizeName(firstName))) {
      // Try casing issues first
      let suggestion = detectCasingIssues(firstName);
      let reason = 'casing';

      // If no casing issue, try frequency-based
      if (!suggestion) {
        const freqMatch = detectFrequencyBasedTypos(firstName, frequencyMaps.first_names, 'first_name');
        if (freqMatch) {
          suggestion = freqMatch.suggestion;
          reason = `frequency (${freqMatch.frequency}×)`;
        }
      }

      if (suggestion && suggestion !== firstName) {
        const normalized = normalizeName(firstName);
        if (!suspects.first_names[normalized]) {
          suspects.first_names[normalized] = {
            original: firstName,
            suggestion,
            reason,
            count: 0,
            frequency: frequencyMaps.first_names[firstName] || 0
          };
        }
        suspects.first_names[normalized].count++;
      }
    }

    // Check surname
    if (!knownTypos.false_positives.surnames.includes(normalizeName(surname))) {
      // Try Mc/O prefix issues first
      let suggestion = detectMcOPrefixIssues(surname);
      let reason = 'Mc/O prefix';

      // If no prefix issue, try casing
      if (!suggestion) {
        suggestion = detectCasingIssues(surname);
        reason = 'casing';
      }

      // If no casing issue, try frequency-based
      if (!suggestion) {
        const freqMatch = detectFrequencyBasedTypos(surname, frequencyMaps.surnames, 'surname');
        if (freqMatch) {
          suggestion = freqMatch.suggestion;
          reason = `frequency (${freqMatch.frequency}×)`;
        }
      }

      if (suggestion && suggestion !== surname) {
        const normalized = normalizeName(surname);
        if (!suspects.surnames[normalized]) {
          suspects.surnames[normalized] = {
            original: surname,
            suggestion,
            reason,
            count: 0,
            frequency: frequencyMaps.surnames[surname] || 0
          };
        }
        suspects.surnames[normalized].count++;
      }
    }
  }

  const firstCount = Object.keys(suspects.first_names).length;
  const surnameCount = Object.keys(suspects.surnames).length;
  console.log(`    Found ${firstCount} first name + ${surnameCount} surname suspects`);

  return suspects;
}

// ============================================================================
// INTERACTIVE REVIEW
// ============================================================================

async function interactiveReview(suspects, frequencyMaps, knownTypos) {
  console.log('\n========================================');
  console.log('INTERACTIVE TYPO REVIEW');
  console.log('========================================\n');

  const corrections = {
    first_names: {},
    surnames: {}
  };

  const newFalsePositives = {
    first_names: [],
    surnames: []
  };

  let skipRemaining = false;

  // Review first names
  const firstNames = Object.entries(suspects.first_names);
  for (let i = 0; i < firstNames.length; i++) {
    if (skipRemaining) break;

    const [normalized, data] = firstNames[i];

    console.log(`\n[${i + 1}/${firstNames.length}] Found potential typo in FIRST NAME:`);
    console.log(`  Original: "${data.original}"`);
    console.log(`  Suggested: "${data.suggestion}"`);
    console.log(`  Reason: ${data.reason}`);
    console.log(`  Occurrences in CSV: ${data.count}`);
    console.log(`  Historical frequency: "${data.original}" = ${data.frequency}×`);

    const answer = await prompt('Fix this typo? (y/n/s=skip remaining): ');

    if (answer.toLowerCase() === 's') {
      skipRemaining = true;
      break;
    } else if (answer.toLowerCase() === 'y') {
      corrections.first_names[normalized] = data.suggestion;
      console.log(`  ✓ Will fix ${data.count} occurrence(s)`);
    } else {
      newFalsePositives.first_names.push(normalized);
      console.log(`  ✗ Marked as false positive`);
    }
  }

  // Review surnames
  skipRemaining = false;
  const surnames = Object.entries(suspects.surnames);
  for (let i = 0; i < surnames.length; i++) {
    if (skipRemaining) break;

    const [normalized, data] = surnames[i];

    console.log(`\n[${i + 1}/${surnames.length}] Found potential typo in SURNAME:`);
    console.log(`  Original: "${data.original}"`);
    console.log(`  Suggested: "${data.suggestion}"`);
    console.log(`  Reason: ${data.reason}`);
    console.log(`  Occurrences in CSV: ${data.count}`);
    console.log(`  Historical frequency: "${data.original}" = ${data.frequency}×`);

    const answer = await prompt('Fix this typo? (y/n/s=skip remaining): ');

    if (answer.toLowerCase() === 's') {
      skipRemaining = true;
      break;
    } else if (answer.toLowerCase() === 'y') {
      corrections.surnames[normalized] = data.suggestion;
      console.log(`  ✓ Will fix ${data.count} occurrence(s)`);
    } else {
      newFalsePositives.surnames.push(normalized);
      console.log(`  ✗ Marked as false positive`);
    }
  }

  return { corrections, newFalsePositives };
}

// ============================================================================
// APPLY CORRECTIONS
// ============================================================================

function applyCorrections(csvData, corrections) {
  console.log('\nApplying corrections to CSV...');
  let correctionCount = 0;

  for (const row of csvData.rows) {
    if (!row.Name) continue;

    const parts = row.Name.trim().split(/\s+/);
    if (parts.length < 2) continue;

    let firstName = parts[0];
    let surname = parts.slice(1).join(' ');
    let changed = false;

    // Apply first name corrections
    const normalizedFirst = normalizeName(firstName);
    if (corrections.first_names[normalizedFirst]) {
      firstName = corrections.first_names[normalizedFirst];
      changed = true;
      correctionCount++;
    }

    // Apply surname corrections
    const normalizedSurname = normalizeName(surname);
    if (corrections.surnames[normalizedSurname]) {
      surname = corrections.surnames[normalizedSurname];
      changed = true;
      correctionCount++;
    }

    if (changed) {
      row.Name = `${firstName} ${surname}`;
    }
  }

  console.log(`  ✓ Applied ${correctionCount} corrections`);
  return correctionCount;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('Generate and Fix Name Typos');
  console.log('========================================\n');
  console.log(`Input CSV: ${csvFilePath}\n`);

  // Step 1: Load data
  console.log('Step 1: Loading data...');
  const knownTypos = loadKnownTypos();
  const historicalData = loadHistoricalData();
  let csvData = parseCSV(csvFilePath);

  // Step 2: Apply known typos
  console.log('\nStep 2: Preprocessing...');
  csvData = applyKnownTypos(csvData, knownTypos);
  const frequencyMaps = buildFrequencyMaps(csvData, historicalData);

  // Step 3: Detect typos
  console.log('\nStep 3: Detecting typos...');
  const suspects = detectTypos(csvData, frequencyMaps, knownTypos);

  const totalSuspects = Object.keys(suspects.first_names).length +
                        Object.keys(suspects.surnames).length;

  if (totalSuspects === 0) {
    console.log('\n✓ No typos detected! CSV is clean.');
    rl.close();
    return;
  }

  // Step 4: Interactive review
  const { corrections, newFalsePositives } = await interactiveReview(suspects, frequencyMaps, knownTypos);

  // Step 5: Apply corrections
  console.log('\n========================================');
  console.log('APPLYING CHANGES');
  console.log('========================================');

  const correctionCount = applyCorrections(csvData, corrections);

  // Step 6: Save files
  console.log('\nSaving files...');

  // Write CSV
  writeCSV(csvFilePath, csvData.header, csvData.rows);
  console.log(`  ✓ Updated: ${csvFilePath}`);

  // Update known typos
  const updatedTypos = {
    first_names: { ...knownTypos.first_names, ...corrections.first_names },
    surnames: { ...knownTypos.surnames, ...corrections.surnames },
    false_positives: {
      first_names: [...knownTypos.false_positives.first_names, ...newFalsePositives.first_names],
      surnames: [...knownTypos.false_positives.surnames, ...newFalsePositives.surnames]
    }
  };
  saveKnownTypos(updatedTypos);

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Typos fixed: ${correctionCount}`);
  console.log(`False positives added: ${newFalsePositives.first_names.length + newFalsePositives.surnames.length}`);
  console.log(`Total known typos: ${Object.keys(updatedTypos.first_names).length + Object.keys(updatedTypos.surnames).length}`);
  console.log('========================================\n');

  console.log('Next steps:');
  console.log('1. Convert CSV to JSON: node scripts/csv-to-json.js');
  console.log('2. Assign runner IDs: npm run assign-ids-new-year YYYY\n');

  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
