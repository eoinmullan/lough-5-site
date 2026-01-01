#!/usr/bin/env node
/**
 * Normalize field order in all yearly results files.
 *
 * This script rewrites all results JSON files with fields in a consistent order,
 * making git diffs cleaner and easier to review changes.
 *
 * Field order is based on 2025.json Position 1 record.
 *
 * Usage:
 *   node scripts/normalize-field-order.js
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '..', 'assets', 'results');

// Canonical field order (from 2025.json Position 1)
const FIELD_ORDER = [
  'Position',
  'Bib no.',
  'Name',
  'Club',
  'Category',
  '2 Miles',
  'Lap of Lough',
  'Chip Time',
  'Gun Time',
  'runner_id',
  'category_position',
  'gender_position',
  'awards',
  'highlight'
];

/**
 * Reorder object fields according to canonical order.
 * Only includes fields that exist in the object.
 */
function reorderFields(obj) {
  const reordered = {};

  // Add fields in canonical order (if they exist)
  for (const field of FIELD_ORDER) {
    if (field in obj) {
      reordered[field] = obj[field];
    }
  }

  // Add any unexpected fields at the end (defensive)
  for (const field in obj) {
    if (!(field in reordered)) {
      console.warn(`  ⚠️  Unexpected field found: "${field}"`);
      reordered[field] = obj[field];
    }
  }

  return reordered;
}

/**
 * Process all yearly results files
 */
function normalizeAllFiles() {
  console.log('Normalizing field order in all results files...\n');

  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  let totalProcessed = 0;

  for (const file of files) {
    const year = file.replace('.json', '');
    const filePath = path.join(RESULTS_DIR, file);

    console.log(`Processing ${year}...`);

    // Read file
    const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Reorder fields for each result
    const normalized = results.map(result => reorderFields(result));

    // Write back with consistent formatting
    fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2) + '\n');

    console.log(`  ✓ Normalized ${normalized.length} results`);
    totalProcessed += normalized.length;
  }

  console.log(`\n✓ Completed! Processed ${totalProcessed} results across ${files.length} years.`);
  console.log('\nField order is now consistent across all years.');
  console.log('You can now review changes with: git diff assets/results/');
}

// Run the script
try {
  normalizeAllFiles();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
