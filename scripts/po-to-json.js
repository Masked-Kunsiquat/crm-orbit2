/**
 * Convert PO files to JSON for i18next runtime
 *
 * This script:
 * 1. Reads PO files from locales/ directory
 * 2. Parses msgid/msgstr pairs
 * 3. Handles plural forms (msgstr[0], msgstr[1])
 * 4. Generates nested JSON structure
 * 5. Writes JSON files to test-fresh/src/locales/
 *
 * Usage: node scripts/po-to-json.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'locales');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'test-fresh', 'src', 'locales');

// Languages to convert
const LANGUAGES = ['en', 'es', 'fr', 'de', 'zh-Hans'];

/**
 * Parse PO file into entries
 */
function parsePOFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const entries = [];
  let currentEntry = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and metadata
    if (line.startsWith('#')) {
      continue;
    }

    // msgid
    if (line.startsWith('msgid ')) {
      if (currentEntry && currentEntry.msgid) {
        // Save previous entry
        entries.push(currentEntry);
      }
      currentEntry = {};
      currentEntry.msgid = line.substring(6).trim().replace(/^"|"$/g, '');
    }
    // msgid_plural
    else if (line.startsWith('msgid_plural ')) {
      if (currentEntry) {
        currentEntry.msgid_plural = line.substring(13).trim().replace(/^"|"$/g, '');
        currentEntry.isPlural = true;
      }
    }
    // msgstr (non-plural)
    else if (line.startsWith('msgstr ') && currentEntry && !currentEntry.isPlural) {
      currentEntry.msgstr = line.substring(7).trim().replace(/^"|"$/g, '');
    }
    // msgstr[n] (plural)
    else if (line.match(/^msgstr\[\d+\]/)) {
      if (!currentEntry.msgstr_plural) currentEntry.msgstr_plural = [];
      const index = parseInt(line.match(/\[(\d+)\]/)[1]);
      const value = line.replace(/^msgstr\[\d+\]\s*/, '').trim().replace(/^"|"$/g, '');
      currentEntry.msgstr_plural[index] = value;
    }
  }

  // Add last entry
  if (currentEntry && currentEntry.msgid) {
    entries.push(currentEntry);
  }

  // Filter out empty msgid (header) and entries without translations
  return entries.filter(e => e.msgid !== '' && (e.msgstr || e.msgstr_plural));
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Convert PO entries to nested JSON object
 */
function entriesToJSON(entries) {
  const json = {};

  entries.forEach(entry => {
    const key = entry.msgid;

    if (entry.isPlural) {
      // Plural form: create _one and _other keys
      // Detect if key already has _one/_other suffix
      if (key.endsWith('_one') || key.endsWith('_other')) {
        // Use msgstr_plural[0] for _one, msgstr_plural[1] for _other
        const value = entry.msgstr_plural && entry.msgstr_plural.length > 0
          ? entry.msgstr_plural[0] || entry.msgid
          : entry.msgid;
        setNestedValue(json, key, value);
      } else {
        // Create _one and _other keys
        const baseKey = key;
        const oneValue = entry.msgstr_plural && entry.msgstr_plural[0]
          ? entry.msgstr_plural[0]
          : entry.msgid;
        const otherValue = entry.msgstr_plural && entry.msgstr_plural[1]
          ? entry.msgstr_plural[1]
          : entry.msgid_plural;

        setNestedValue(json, `${baseKey}_one`, oneValue);
        setNestedValue(json, `${baseKey}_other`, otherValue);
      }
    } else {
      // Regular entry
      const value = entry.msgstr || entry.msgid;
      setNestedValue(json, key, value);
    }
  });

  return json;
}

/**
 * Convert a single PO file to JSON
 */
function convertPOtoJSON(language) {
  console.log(`\nConverting ${language}.po...`);

  const poPath = path.join(LOCALES_DIR, `${language}.po`);
  const jsonPath = path.join(OUTPUT_DIR, `${language}.json`);

  // Parse PO file
  const entries = parsePOFile(poPath);
  console.log(`  Parsed ${entries.length} entries`);

  // Convert to JSON
  const json = entriesToJSON(entries);

  // Count keys
  const keyCount = countKeys(json);
  console.log(`  Generated ${keyCount} keys`);

  // Write JSON file
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');
  console.log(`  ✓ Wrote: ${jsonPath}`);

  // File size
  const stats = fs.statSync(jsonPath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`  ✓ Size: ${sizeKB} KB`);

  return { entries: entries.length, keys: keyCount };
}

/**
 * Count total keys in nested object
 */
function countKeys(obj) {
  let count = 0;

  for (const key in obj) {
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }

  return count;
}

/**
 * Main execution
 */
function main() {
  console.log('=== PO to JSON Conversion ===\n');
  console.log(`Source: ${LOCALES_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`\nCreated output directory: ${OUTPUT_DIR}`);
  }

  const results = {};

  LANGUAGES.forEach(language => {
    try {
      results[language] = convertPOtoJSON(language);
    } catch (error) {
      console.error(`  ✗ Error converting ${language}:`, error.message);
      process.exit(1);
    }
  });

  // Summary
  console.log('\n=== Summary ===');

  let totalEntries = 0;
  let totalKeys = 0;

  LANGUAGES.forEach(language => {
    const result = results[language];
    totalEntries += result.entries;
    totalKeys += result.keys;
    console.log(`  ${language}: ${result.entries} entries → ${result.keys} keys`);
  });

  console.log(`\n✓ Converted ${LANGUAGES.length} PO files`);
  console.log(`✓ Total: ${totalEntries} entries → ${totalKeys} keys`);
  console.log(`✓ JSON files ready for i18next runtime`);

  console.log('\nNext steps:');
  console.log('1. Test app with new JSON files');
  console.log('2. Verify all translations display correctly');
  console.log('3. Check plural forms render properly');
}

// Run if executed directly
if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    main();
  }
}

export { parsePOFile, entriesToJSON, convertPOtoJSON };
