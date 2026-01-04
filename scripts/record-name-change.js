#!/usr/bin/env node
/**
 * Record a name change for a runner.
 *
 * This utility helps track when a runner has changed their name
 * (e.g., marriage, spelling correction, preferred name).
 * The data is used by assign-ids-to-new-year to better match runners
 * despite name variations.
 *
 * Usage:
 *   node scripts/record-name-change.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA_DIR = path.join(__dirname, '..', 'data');
const NAME_CHANGES_FILE = path.join(DATA_DIR, 'name-changes.json');
const RUNNER_DATABASE_FILE = path.join(__dirname, '..', 'assets', 'runner-database.json');

// Create readline interface for interactive prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Load runner database
function loadRunnerDatabase() {
  if (!fs.existsSync(RUNNER_DATABASE_FILE)) {
    console.error('Warning: runner-database.json not found. Runner ID validation disabled.');
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(RUNNER_DATABASE_FILE, 'utf8'));
    return data.runners || {};
  } catch (error) {
    console.error('Warning: Could not parse runner-database.json:', error.message);
    return null;
  }
}

// Load existing name changes
function loadNameChanges() {
  if (fs.existsSync(NAME_CHANGES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(NAME_CHANGES_FILE, 'utf8'));
    } catch (error) {
      console.error('Warning: Could not parse existing name-changes.json:', error.message);
      return {};
    }
  }
  return {};
}

// Save name changes
function saveNameChanges(nameChanges) {
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created directory: ${DATA_DIR}`);
  }

  fs.writeFileSync(NAME_CHANGES_FILE, JSON.stringify(nameChanges, null, 2) + '\n');
  console.log(`Saved to: ${NAME_CHANGES_FILE}`);
}

async function main() {
  console.log('========================================');
  console.log('Record Runner Name Change');
  console.log('========================================\n');

  // Load existing data
  const nameChanges = loadNameChanges();
  const runnerDatabase = loadRunnerDatabase();

  // Prompt for runner_id with validation
  let runnerId;
  let validRunner = null;

  while (true) {
    runnerId = await prompt('Enter runner_id: ');
    if (!runnerId) {
      console.error('Error: runner_id is required');
      rl.close();
      process.exit(1);
    }

    // Validate against database
    if (runnerDatabase) {
      validRunner = runnerDatabase[runnerId];

      if (validRunner) {
        console.log(`✓ Found: ${validRunner.canonical_name} (${validRunner.total_races} races, ${validRunner.years.join(', ')})`);
        break;
      } else {
        console.log(`✗ runner_id "${runnerId}" not found in database`);
        const retry = await prompt('Try again? (y/n): ');
        if (retry.toLowerCase() !== 'y') {
          const continueAnyway = await prompt('Continue with this ID anyway? (y/n): ');
          if (continueAnyway.toLowerCase() === 'y') {
            break;
          } else {
            console.log('Cancelled.');
            rl.close();
            process.exit(0);
          }
        }
      }
    } else {
      // Database not available, skip validation
      break;
    }
  }

  // Prompt for new name
  const newName = await prompt('Enter new name: ');
  if (!newName) {
    console.error('Error: name is required');
    rl.close();
    process.exit(1);
  }

  // Initialize array for this runner if it doesn't exist
  if (!nameChanges[runnerId]) {
    nameChanges[runnerId] = [];
  }

  // Check if this name is already recorded
  if (nameChanges[runnerId].includes(newName)) {
    console.log(`\n⚠️  Name "${newName}" is already recorded for ${runnerId}`);
    console.log(`Known names for ${runnerId}:`, nameChanges[runnerId]);

    const overwrite = await prompt('\nContinue anyway? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      rl.close();
      process.exit(0);
    }
  }

  // Add the new name
  nameChanges[runnerId].push(newName);

  // Show summary
  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`Runner ID: ${runnerId}`);
  if (validRunner) {
    console.log(`Current canonical name: ${validRunner.canonical_name}`);
  }
  console.log(`Known names (${nameChanges[runnerId].length}):`);
  nameChanges[runnerId].forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });

  // Confirm before saving
  const confirm = await prompt('\nSave this change? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    rl.close();
    process.exit(0);
  }

  // Save to file
  saveNameChanges(nameChanges);

  console.log('\n✓ Name change recorded successfully!\n');

  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
