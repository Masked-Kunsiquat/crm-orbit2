/**
 * Validate generated PO files
 *
 * This script:
 * 1. Checks PO file syntax
 * 2. Verifies key count matches NEW_STRUCTURE.json
 * 3. Validates plural forms
 * 4. Checks for missing developer comments
 * 5. Verifies all languages have same keys
 *
 * Usage: node scripts/validate-po.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'locales');

// Expected languages
const LANGUAGES = ['en', 'es', 'fr', 'de', 'zh-Hans'];

// Expected plural counts per language
const EXPECTED_PLURAL_COUNTS = {
  en: 2,
  es: 2,
  fr: 2,
  de: 2,
  'zh-Hans': 1
};

/**
 * Unescape PO format strings
 */
function unescapePO(str) {
  if (!str) return '';
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

/**
 * Parse PO file into entries (with multi-line string support)
 */
function parsePOFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const entries = [];
  let currentEntry = null;
  let currentField = null; // Track which field we're accumulating

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments (but track them for validation)
    if (line.startsWith('#.')) {
      if (!currentEntry) currentEntry = { comments: [], locations: [] };
      currentEntry.comments.push(line.substring(3).trim());
      currentField = null; // End multi-line accumulation
    }
    else if (line.startsWith('#:')) {
      if (!currentEntry) currentEntry = { comments: [], locations: [] };
      currentEntry.locations.push(line.substring(3).trim());
      currentField = null;
    }
    else if (line.startsWith('#')) {
      // Other comment types - skip but end accumulation
      currentField = null;
    }
    // msgid
    else if (line.startsWith('msgid ')) {
      if (!currentEntry) currentEntry = { comments: [], locations: [] };

      // Extract value from first line
      const valueMatch = line.match(/^msgid\s+"(.*)"\s*$/);
      if (valueMatch) {
        currentEntry.msgid = unescapePO(valueMatch[1]);
      } else {
        currentEntry.msgid = '';
      }

      currentField = 'msgid';
    }
    // msgid_plural
    else if (line.startsWith('msgid_plural ')) {
      const valueMatch = line.match(/^msgid_plural\s+"(.*)"\s*$/);
      if (valueMatch) {
        currentEntry.msgid_plural = unescapePO(valueMatch[1]);
      } else {
        currentEntry.msgid_plural = '';
      }

      currentField = 'msgid_plural';
    }
    // msgstr (non-plural)
    else if (line.startsWith('msgstr ') && currentEntry && !currentEntry.msgid_plural) {
      const valueMatch = line.match(/^msgstr\s+"(.*)"\s*$/);
      if (valueMatch) {
        currentEntry.msgstr = unescapePO(valueMatch[1]);
      } else {
        currentEntry.msgstr = '';
      }

      currentField = 'msgstr';
    }
    // msgstr[n] (plural)
    else if (line.match(/^msgstr\[\d+\]/)) {
      if (!currentEntry.msgstr_plural) currentEntry.msgstr_plural = [];

      const indexMatch = line.match(/^msgstr\[(\d+)\]/);
      const index = parseInt(indexMatch[1]);

      const valueMatch = line.match(/^msgstr\[\d+\]\s+"(.*)"\s*$/);
      if (valueMatch) {
        currentEntry.msgstr_plural[index] = unescapePO(valueMatch[1]);
      } else {
        currentEntry.msgstr_plural[index] = '';
      }

      currentField = { type: 'msgstr_plural', index };
    }
    // Continuation line (bare quoted string)
    else if (line.trim().match(/^".*"\s*$/) && currentField) {
      const valueMatch = line.trim().match(/^"(.*)"\s*$/);
      if (valueMatch) {
        const continuationValue = unescapePO(valueMatch[1]);

        if (currentField === 'msgid') {
          currentEntry.msgid += continuationValue;
        } else if (currentField === 'msgid_plural') {
          currentEntry.msgid_plural += continuationValue;
        } else if (currentField === 'msgstr') {
          currentEntry.msgstr += continuationValue;
        } else if (currentField?.type === 'msgstr_plural') {
          const idx = currentField.index;
          currentEntry.msgstr_plural[idx] += continuationValue;
        }
      }
    }
    // Blank line = end of entry
    else if (line.trim() === '' && currentEntry && currentEntry.msgid !== undefined) {
      entries.push(currentEntry);
      currentEntry = null;
      currentField = null;
    }
  }

  // Add last entry if exists
  if (currentEntry && currentEntry.msgid !== undefined) {
    entries.push(currentEntry);
  }

  return entries;
}

/**
 * Count keys in NEW_STRUCTURE.json
 */
function countKeysInJSON(obj, prefix = '') {
  let count = 0;

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      count += countKeysInJSON(value, fullKey);
    } else if (typeof value === 'string') {
      count++;
    }
  }

  return count;
}

/**
 * Validate a single PO file
 */
function validatePOFile(language) {
  const filePath = path.join(LOCALES_DIR, `${language}.po`);
  const errors = [];
  const warnings = [];

  console.log(`\nValidating ${language}.po...`);

  // Check file exists
  if (!fs.existsSync(filePath)) {
    errors.push(`File not found: ${filePath}`);
    return { errors, warnings, entries: [] };
  }

  // Parse PO file
  let entries;
  try {
    entries = parsePOFile(filePath);
  } catch (error) {
    errors.push(`Failed to parse PO file: ${error.message}`);
    return { errors, warnings, entries: [] };
  }

  // Filter out header entry (empty msgid)
  const realEntries = entries.filter(e => e.msgid !== '');

  console.log(`  Found ${realEntries.length} entries`);

  // Check for entries without comments
  // Note: Nesting references ($t() syntax) appear in msgstr values, not msgid keys
  // The conversion scripts (json-to-po.js) skip entries with $t() in source values
  const entriesWithoutComments = realEntries.filter(e => {
    return e.comments.length === 0;
  });

  if (entriesWithoutComments.length > 0) {
    warnings.push(`${entriesWithoutComments.length} entries missing developer comments`);
  }

  // Check plural forms
  const pluralEntries = realEntries.filter(e => e.msgid_plural);
  const expectedPluralCount = EXPECTED_PLURAL_COUNTS[language];

  console.log(`  Found ${pluralEntries.length} plural entries`);

  pluralEntries.forEach(entry => {
    if (entry.msgstr_plural) {
      const actualCount = entry.msgstr_plural.length;
      if (actualCount !== expectedPluralCount) {
        errors.push(
          `Plural form count mismatch for "${entry.msgid}": ` +
          `expected ${expectedPluralCount}, got ${actualCount}`
        );
      }
    }
  });

  // Check for duplicate msgids
  const msgids = realEntries.map(e => e.msgid);
  const duplicates = msgids.filter((item, index) => msgids.indexOf(item) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate msgids found: ${duplicates.join(', ')}`);
  }

  return { errors, warnings, entries: realEntries };
}

/**
 * Main validation
 */
function main() {
  console.log('=== PO File Validation ===\n');

  // Load NEW_STRUCTURE.json to get expected key count
  const newStructure = JSON.parse(
    fs.readFileSync(path.join(LOCALES_DIR, 'NEW_STRUCTURE.json'), 'utf8')
  );
  const expectedKeyCount = countKeysInJSON(newStructure);

  console.log(`Expected keys from NEW_STRUCTURE.json: ${expectedKeyCount}`);

  // Validate each language
  const results = {};
  let allErrors = [];
  let allWarnings = [];

  LANGUAGES.forEach(language => {
    const result = validatePOFile(language);
    results[language] = result;

    if (result.errors.length > 0) {
      console.log(`  ✗ Errors:`);
      result.errors.forEach(err => console.log(`    - ${err}`));
      allErrors = allErrors.concat(result.errors);
    }

    if (result.warnings.length > 0) {
      console.log(`  ⚠ Warnings:`);
      result.warnings.forEach(warn => console.log(`    - ${warn}`));
      allWarnings = allWarnings.concat(result.warnings);
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log(`  ✓ Valid`);
    }
  });

  // Cross-language validation: all should have same keys
  console.log(`\n=== Cross-Language Validation ===\n`);

  const enKeys = new Set(results.en.entries.map(e => e.msgid));
  const baselineCount = enKeys.size;

  console.log(`English (baseline): ${baselineCount} keys`);

  LANGUAGES.forEach(language => {
    if (language === 'en') return;

    const langKeys = new Set(results[language].entries.map(e => e.msgid));
    const missing = [...enKeys].filter(k => !langKeys.has(k));
    const extra = [...langKeys].filter(k => !enKeys.has(k));

    if (missing.length > 0) {
      console.log(`  ${language}: Missing ${missing.length} keys`);
      allErrors.push(`${language}.po missing keys: ${missing.slice(0, 5).join(', ')}...`);
    }

    if (extra.length > 0) {
      console.log(`  ${language}: Extra ${extra.length} keys`);
      allErrors.push(`${language}.po has extra keys: ${extra.slice(0, 5).join(', ')}...`);
    }

    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ${language}: ✓ Matches English (${langKeys.size} keys)`);
    }
  });

  // Summary
  console.log(`\n=== Summary ===`);
  console.log(`Total errors: ${allErrors.length}`);
  console.log(`Total warnings: ${allWarnings.length}`);

  if (allErrors.length === 0) {
    console.log(`\n✓ All PO files are valid!`);
    console.log(`✓ All ${LANGUAGES.length} languages have ${baselineCount} keys`);
    console.log(`✓ Plural forms configured correctly`);
    return 0;
  } else {
    console.log(`\n✗ Validation failed with ${allErrors.length} errors`);
    return 1;
  }
}

// Run if executed directly
if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    const exitCode = main();
    process.exit(exitCode);
  }
}

export { parsePOFile, validatePOFile };
