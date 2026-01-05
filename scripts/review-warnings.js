#!/usr/bin/env node
/**
 * Review and resolve warnings from assign-ids-to-new-year.js
 *
 * This script:
 * - Loads warnings for uncertain matches and duplicates
 * - Prompts user to assign runner_id to each flagged result
 * - Updates the results file with assigned IDs
 * - Saves disambiguation decisions for future reprocessing
 *
 * Usage:
 *   node scripts/review-warnings.js YYYY
 *   npm run review-warnings YYYY
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================================================
// CONFIGURATION
// ============================================================================

const WARNINGS_FILE = path.join(__dirname, '..', 'assets', 'runner-database-warnings.json');
const RESULTS_DIR = path.join(__dirname, '..', 'assets', 'results');
const RUNNER_DATABASE_FILE = path.join(__dirname, '..', 'assets', 'runner-database.json');
const DATA_DIR = path.join(__dirname, '..', 'data');

// Parse command-line arguments
const args = process.argv.slice(2);
const targetYear = parseInt(args[0], 10);

if (!targetYear || isNaN(targetYear)) {
  console.error('Usage: node scripts/review-warnings.js YYYY');
  console.error('Example: node scripts/review-warnings.js 2025');
  process.exit(1);
}

const resultsFile = path.join(RESULTS_DIR, `${targetYear}.json`);
const disambiguationFile = path.join(DATA_DIR, `${targetYear}-disambiguation.json`);

// Readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[áàâäã]/gi, 'a')
    .replace(/[éèêë]/gi, 'e')
    .replace(/[íìîï]/gi, 'i')
    .replace(/[óòôöõ]/gi, 'o')
    .replace(/[úùûü]/gi, 'u')
    .replace(/[ñ]/gi, 'n')
    .replace(/[ç]/gi, 'c')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")  // Normalize Unicode quotes
    .replace(/[^a-z0-9]/g, '');
}

function generateRunnerId(name, existingIds, club) {
  const normalized = normalizeName(name);

  if (!normalized) {
    let counter = 1;
    let id = `unknown-runner-${counter}`;
    while (existingIds.has(id)) {
      counter++;
      id = `unknown-runner-${counter}`;
    }
    return id;
  }

  let baseId = normalized;
  if (club) {
    const clubPart = normalizeName(club).slice(0, 10);
    if (clubPart) {
      baseId = `${normalized}-${clubPart}`;
    }
  }

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let counter = 2;
  let id = `${baseId}-${counter}`;
  while (existingIds.has(id)) {
    counter++;
    id = `${baseId}-${counter}`;
  }
  return id;
}

// ============================================================================
// DATA LOADING
// ============================================================================

function loadWarnings() {
  if (!fs.existsSync(WARNINGS_FILE)) {
    console.error(`Error: Warnings file not found: ${WARNINGS_FILE}`);
    console.error('Run assign-ids-new-year first to generate warnings.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));

  // Check if this is the right year
  if (data.target_year && data.target_year !== targetYear) {
    console.error(`Error: Warnings file is for year ${data.target_year}, not ${targetYear}`);
    process.exit(1);
  }

  return data;
}

function loadResults() {
  if (!fs.existsSync(resultsFile)) {
    console.error(`Error: Results file not found: ${resultsFile}`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
}

function loadRunnerDatabase() {
  if (!fs.existsSync(RUNNER_DATABASE_FILE)) {
    return { runners: {} };
  }

  const data = JSON.parse(fs.readFileSync(RUNNER_DATABASE_FILE, 'utf8'));
  return data;
}

function saveResults(results) {
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2) + '\n');
}

function loadDisambiguation() {
  if (!fs.existsSync(disambiguationFile)) {
    console.log('  No existing disambiguation file found');
    return [];
  }

  const data = JSON.parse(fs.readFileSync(disambiguationFile, 'utf8'));

  if (data.year !== targetYear) {
    console.log(`  ⚠️  Existing disambiguation file is for year ${data.year}, not ${targetYear}`);
    return [];
  }

  console.log(`  Loaded ${data.decisions.length} existing disambiguation decision(s)`);
  return data.decisions || [];
}

function saveDisambiguation(decisions) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const data = {
    year: targetYear,
    decisions: decisions
  };

  fs.writeFileSync(disambiguationFile, JSON.stringify(data, null, 2) + '\n');
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

function displayRunner(runnerId, runnerData) {
  if (!runnerData) {
    console.log(`  Runner ID: ${runnerId} (not in database yet)`);
    return;
  }

  console.log(`  Runner ID: ${runnerId}`);
  console.log(`  Name: ${runnerData.canonical_name}`);
  console.log(`  Gender: ${runnerData.gender || 'Unknown'}`);
  console.log(`  Club: ${runnerData.most_common_club || 'None'}`);
  console.log(`  Races: ${runnerData.total_races}`);
  console.log(`  Years: ${runnerData.years.join(', ')}`);
}

// ============================================================================
// INTERACTIVE REVIEW
// ============================================================================

async function reviewUncertainMatches(warnings, results, runnerDatabase, decisions, existingIds) {
  if (!warnings || warnings.length === 0) {
    console.log('\n✓ No uncertain matches to review');
    return { skipped: false };
  }

  console.log('\n========================================');
  console.log('REVIEWING UNCERTAIN MATCHES');
  console.log('========================================');
  console.log(`Found ${warnings.length} uncertain cross-year matches\n`);

  // Build a map of position -> runner_id from decisions made in this session
  const sessionDecisions = new Map();
  for (const decision of decisions) {
    sessionDecisions.set(decision.position, decision.runner_id);
  }

  let skipRemaining = false;

  for (let i = 0; i < warnings.length; i++) {
    if (skipRemaining) break;

    const warning = warnings[i];
    const { position, name } = warning.result;
    const suggestedId = warning.suggested_id;
    const confidence = warning.confidence;

    // Find the result in the results array
    const result = results.find(r => r.Position === position);
    if (!result) {
      console.log(`\nWarning: Could not find position ${position} in results`);
      continue;
    }

    // Skip if already disambiguated in this session
    if (sessionDecisions.has(position)) {
      console.log(`\n[${i + 1}/${warnings.length}] Position ${position}: ${name} - ✓ Already assigned: ${sessionDecisions.get(position)}`);
      continue;
    }

    console.log(`\n[${i + 1}/${warnings.length}] Uncertain Match`);
    console.log('─────────────────────────────────────');
    console.log(`Position: ${position}`);
    console.log(`Name: ${name}`);
    console.log(`Category: ${result.Category}`);
    console.log(`Club: ${result.Club || '(none)'}`);
    console.log(`\nSuggested Match (${(confidence * 100).toFixed(1)}% confidence):`);
    displayRunner(suggestedId, runnerDatabase.runners[suggestedId]);

    console.log('\nOptions:');
    console.log('  y     - Accept suggested runner_id');
    console.log('  [id]  - Enter different runner_id');
    console.log('  new   - Generate new runner_id');
    console.log('  s     - Skip remaining');

    const answer = await prompt('\nAction: ');

    if (answer.toLowerCase() === 's') {
      skipRemaining = true;
      console.log('⚠️  Skipping remaining warnings');
      break;
    } else if (answer.toLowerCase() === 'y') {
      result.runner_id = suggestedId;
      existingIds.add(suggestedId);
      decisions.push({ position, name, runner_id: suggestedId });
      sessionDecisions.set(position, suggestedId);
      console.log(`✓ Assigned: ${suggestedId}`);
    } else if (answer.toLowerCase() === 'new') {
      const newId = generateRunnerId(result.Name, existingIds, result.Club);
      result.runner_id = newId;
      existingIds.add(newId);
      decisions.push({ position, name, runner_id: newId });
      sessionDecisions.set(position, newId);
      console.log(`✓ Generated new ID: ${newId}`);
    } else if (answer) {
      // Custom runner_id
      const customId = answer.toLowerCase();

      // Check if it exists in database
      if (runnerDatabase.runners[customId]) {
        console.log('\nRunner found in database:');
        displayRunner(customId, runnerDatabase.runners[customId]);
        const confirm = await prompt('Use this runner? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
          result.runner_id = customId;
          existingIds.add(customId);
          decisions.push({ position, name, runner_id: customId });
          sessionDecisions.set(position, customId);
          console.log(`✓ Assigned: ${customId}`);
        } else {
          console.log('✗ Skipped');
        }
      } else {
        // New ID not in database
        console.log(`⚠️  "${customId}" not found in database (will be a new runner)`);
        const confirm = await prompt('Use this ID anyway? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
          result.runner_id = customId;
          existingIds.add(customId);
          decisions.push({ position, name, runner_id: customId });
          sessionDecisions.set(position, customId);
          console.log(`✓ Assigned: ${customId}`);
        } else {
          console.log('✗ Skipped');
        }
      }
    } else {
      console.log('✗ Skipped');
    }
  }

  return { skipped: skipRemaining };
}

async function reviewDuplicatesInNewYear(duplicates, results, runnerDatabase, decisions, existingIds) {
  if (!duplicates || duplicates.length === 0) {
    console.log('\n✓ No duplicates within new year to review');
    return { skipped: false };
  }

  console.log('\n========================================');
  console.log('REVIEWING DUPLICATES IN NEW YEAR');
  console.log('========================================');
  console.log(`Found ${duplicates.length} potential duplicate groups\n`);

  // Build a map of position -> runner_id from decisions made in this session
  const sessionDecisions = new Map();
  for (const decision of decisions) {
    sessionDecisions.set(decision.position, decision.runner_id);
  }

  let skipRemaining = false;

  for (let i = 0; i < duplicates.length; i++) {
    if (skipRemaining) break;

    const duplicate = duplicates[i];
    const positions = duplicate.positions;
    const names = duplicate.names;
    const similarity = duplicate.similarity;

    console.log(`\n[${i + 1}/${duplicates.length}] Potential Duplicates (${(similarity * 100).toFixed(1)}% similar)`);
    console.log('─────────────────────────────────────');

    // Display each person in the group
    for (let j = 0; j < positions.length; j++) {
      const position = positions[j];
      const name = names[j];
      const result = results.find(r => r.Position === position);

      console.log(`\n[${String.fromCharCode(65 + j)}] Position ${position}: ${name}`);
      if (result) {
        console.log(`    Category: ${result.Category}`);
        console.log(`    Club: ${result.Club || '(none)'}`);
        console.log(`    Time: ${result['Chip Time'] || result['Gun Time'] || '(unknown)'}`);

        // Show if already disambiguated in this session
        if (sessionDecisions.has(position)) {
          console.log(`    ✓ Already assigned: ${sessionDecisions.get(position)}`);
        }
      }
    }

    console.log('\nThese appear to be similar names. Please assign runner_id to each:');

    // Prompt for each person in the group
    for (let j = 0; j < positions.length; j++) {
      const position = positions[j];
      const name = names[j];
      const result = results.find(r => r.Position === position);
      if (!result) continue;

      // Skip if already disambiguated in this session
      if (sessionDecisions.has(position)) {
        console.log(`\n[${String.fromCharCode(65 + j)}] ${name} (Position ${position}) - ✓ Already assigned: ${sessionDecisions.get(position)}`);
        continue;
      }

      console.log(`\n[${String.fromCharCode(65 + j)}] ${name} (Position ${position})`);
      console.log('Options:');
      console.log('  [id]  - Enter runner_id');
      console.log('  new   - Generate new runner_id');
      console.log('  s     - Skip remaining');

      const answer = await prompt('Action: ');

      if (answer.toLowerCase() === 's') {
        skipRemaining = true;
        console.log('⚠️  Skipping remaining warnings');
        break;
      } else if (answer.toLowerCase() === 'new') {
        const newId = generateRunnerId(result.Name, existingIds, result.Club);
        result.runner_id = newId;
        existingIds.add(newId);
        decisions.push({ position, name, runner_id: newId });
        sessionDecisions.set(position, newId);
        console.log(`✓ Generated new ID: ${newId}`);
      } else if (answer) {
        // Custom runner_id
        const customId = answer.toLowerCase();

        // Check if it exists in database
        if (runnerDatabase.runners[customId]) {
          console.log('\nRunner found in database:');
          displayRunner(customId, runnerDatabase.runners[customId]);
          const confirm = await prompt('Use this runner? (y/n): ');
          if (confirm.toLowerCase() === 'y') {
            result.runner_id = customId;
            existingIds.add(customId);
            decisions.push({ position, name, runner_id: customId });
            sessionDecisions.set(position, customId);
            console.log(`✓ Assigned: ${customId}`);
          } else {
            console.log('✗ Skipped');
          }
        } else {
          // New ID not in database
          console.log(`⚠️  "${customId}" not found in database (will be a new runner)`);
          const confirm = await prompt('Use this ID anyway? (y/n): ');
          if (confirm.toLowerCase() === 'y') {
            result.runner_id = customId;
            existingIds.add(customId);
            decisions.push({ position, name, runner_id: customId });
            sessionDecisions.set(position, customId);
            console.log(`✓ Assigned: ${customId}`);
          } else {
            console.log('✗ Skipped');
          }
        }
      } else {
        console.log('✗ Skipped');
      }
    }

    if (skipRemaining) break;
  }

  return { skipped: skipRemaining };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('Review Warnings from assign-ids-new-year');
  console.log('========================================\n');
  console.log(`Year: ${targetYear}\n`);

  // Load data
  console.log('Loading data...');
  const warnings = loadWarnings();
  const results = loadResults();
  const runnerDatabase = loadRunnerDatabase();
  const existingDisambiguations = loadDisambiguation();

  // Build set of existing IDs
  const existingIds = new Set();
  results.forEach(r => {
    if (r.runner_id) existingIds.add(r.runner_id);
  });
  Object.keys(runnerDatabase.runners).forEach(id => existingIds.add(id));

  // Start with existing disambiguation decisions
  const decisions = [...existingDisambiguations];

  // Apply existing disambiguations to results
  for (const decision of existingDisambiguations) {
    const result = results.find(r => r.Position === decision.position);
    if (result && result.Name === decision.name) {
      result.runner_id = decision.runner_id;
      existingIds.add(decision.runner_id);
    }
  }

  // Track new decisions made in this session
  const decisionsBeforeReview = decisions.length;

  // Review uncertain matches
  const uncertainResult = await reviewUncertainMatches(
    warnings.uncertain_matches,
    results,
    runnerDatabase,
    decisions,
    existingIds
  );

  // Review duplicates in new year (only if user didn't skip in previous section)
  let duplicatesResult = { skipped: false };
  if (!uncertainResult.skipped) {
    duplicatesResult = await reviewDuplicatesInNewYear(
      warnings.duplicates_in_new_year,
      results,
      runnerDatabase,
      decisions,
      existingIds
    );
  }

  const newDecisions = decisions.length - decisionsBeforeReview;
  const userSkipped = uncertainResult.skipped || duplicatesResult.skipped;

  // Save results if any decisions were made (new or existing)
  if (decisions.length > 0 && (newDecisions > 0 || userSkipped)) {
    console.log('\n========================================');
    console.log('SAVING CHANGES');
    console.log('========================================');

    if (userSkipped) {
      console.log('\n⚠️  User skipped remaining - saving partial progress');
    }

    console.log(`\nUpdating results file...`);
    saveResults(results);
    console.log(`✓ Updated: ${resultsFile}`);

    console.log(`\nSaving disambiguation decisions...`);
    saveDisambiguation(decisions);
    console.log(`✓ Saved: ${disambiguationFile}`);

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Total decisions: ${decisions.length}`);
    console.log(`New decisions this session: ${newDecisions}`);
    console.log(`Results file updated: ${resultsFile}`);
    console.log(`Disambiguation saved: ${disambiguationFile}`);
    console.log('\nNext steps:');
    console.log(`1. Re-run: npm run review-warnings ${targetYear} (to continue reviewing)`);
    console.log(`2. Re-run: npm run assign-ids-new-year ${targetYear}`);
    console.log(`3. Generate: npm run generate-all`);
  } else if (newDecisions === 0 && decisions.length === 0) {
    console.log('\n✓ No decisions made');
  } else {
    console.log('\n✓ No new decisions made this session');
  }

  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
