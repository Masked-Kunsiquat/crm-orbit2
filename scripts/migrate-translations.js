/**
 * Migrate existing translations from old JSON to new PO files
 *
 * This script:
 * 1. Reads old translation JSON files (test-fresh/src/locales/*.json)
 * 2. Reads KEY_MIGRATION_MAP.json for key mappings
 * 3. Reads generated PO files
 * 4. Fills in msgstr values with existing translations
 * 5. Writes updated PO files
 * 6. Reports coverage statistics
 *
 * Usage: node scripts/migrate-translations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'locales');
const OLD_LOCALES_DIR = path.join(PROJECT_ROOT, 'test-fresh', 'src', 'locales');

// Languages (skip English since it's already filled)
const LANGUAGES = ['es', 'fr', 'de', 'zh-Hans'];

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Escape special characters for PO format
 */
function escapePO(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * Parse PO file into entries
 */
function parsePOFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const entries = [];
  let currentEntry = null;
  let inHeader = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip until we find first real entry
    if (inHeader && line.startsWith('msgid ""')) {
      inHeader = true;
      continue;
    }
    if (inHeader && line.startsWith('msgstr ""')) {
      inHeader = false;
      continue;
    }

    // Developer comment
    if (line.startsWith('#.')) {
      if (!currentEntry) currentEntry = { comments: [], locations: [], originalLines: [] };
      currentEntry.comments.push(line);
      currentEntry.originalLines.push(line);
    }
    // Source location
    else if (line.startsWith('#:')) {
      if (!currentEntry) currentEntry = { comments: [], locations: [], originalLines: [] };
      currentEntry.locations.push(line);
      currentEntry.originalLines.push(line);
    }
    // msgid
    else if (line.startsWith('msgid ')) {
      if (!currentEntry) currentEntry = { comments: [], locations: [], originalLines: [] };
      currentEntry.msgid = line.substring(6).trim().replace(/^"|"$/g, '');
      currentEntry.msgidLine = line;
      currentEntry.originalLines.push(line);
    }
    // msgid_plural
    else if (line.startsWith('msgid_plural ')) {
      currentEntry.msgid_plural = line.substring(13).trim().replace(/^"|"$/g, '');
      currentEntry.msgid_pluralLine = line;
      currentEntry.originalLines.push(line);
      currentEntry.isPlural = true;
    }
    // msgstr (non-plural)
    else if (line.startsWith('msgstr ') && !currentEntry.isPlural) {
      currentEntry.msgstr = line.substring(7).trim().replace(/^"|"$/g, '');
      currentEntry.msgstrLine = line;
      currentEntry.originalLines.push(line);
    }
    // msgstr[n] (plural)
    else if (line.match(/^msgstr\[\d+\]/)) {
      if (!currentEntry.msgstr_plural) currentEntry.msgstr_plural = [];
      const index = parseInt(line.match(/\[(\d+)\]/)[1]);
      const value = line.replace(/^msgstr\[\d+\]\s*/, '').trim().replace(/^"|"$/g, '');
      currentEntry.msgstr_plural[index] = value;
      currentEntry.msgstr_pluralLines = currentEntry.msgstr_pluralLines || [];
      currentEntry.msgstr_pluralLines[index] = line;
      currentEntry.originalLines.push(line);
    }
    // Blank line = end of entry
    else if (line.trim() === '' && currentEntry && currentEntry.msgid) {
      entries.push(currentEntry);
      currentEntry = null;
    } else if (currentEntry) {
      currentEntry.originalLines.push(line);
    }
  }

  // Add last entry if exists
  if (currentEntry && currentEntry.msgid) {
    entries.push(currentEntry);
  }

  return entries.filter(e => e.msgid !== '');
}

/**
 * Write updated PO file
 */
function writePOFile(filePath, entries) {
  // Read original header
  const originalContent = fs.readFileSync(filePath, 'utf8');
  const headerEnd = originalContent.indexOf('\nmsgid "');
  const header = originalContent.substring(0, headerEnd + 1);

  // Generate entries
  const entryLines = [];

  entries.forEach(entry => {
    // Comments
    entry.comments.forEach(comment => entryLines.push(comment));
    entry.locations.forEach(location => entryLines.push(location));

    // msgid
    entryLines.push(entry.msgidLine);

    if (entry.isPlural) {
      // Plural form
      entryLines.push(entry.msgid_pluralLine);

      // msgstr[n]
      entry.msgstr_plural.forEach((value, index) => {
        entryLines.push(`msgstr[${index}] "${escapePO(value)}"`);
      });
    } else {
      // Regular form
      entryLines.push(`msgstr "${escapePO(entry.msgstr)}"`);
    }

    entryLines.push(''); // Blank line
  });

  const content = header + '\n' + entryLines.join('\n');
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Migrate translations for a single language
 */
function migrateLanguage(language) {
  console.log(`\nMigrating ${language}...`);

  // Load old translations
  const oldJsonPath = path.join(OLD_LOCALES_DIR, `${language}.json`);
  const oldTranslations = JSON.parse(fs.readFileSync(oldJsonPath, 'utf8'));

  // Load migration map
  const migrationMap = JSON.parse(
    fs.readFileSync(path.join(LOCALES_DIR, 'KEY_MIGRATION_MAP.json'), 'utf8')
  );

  // Load PO file
  const poPath = path.join(LOCALES_DIR, `${language}.po`);
  const entries = parsePOFile(poPath);

  console.log(`  Loaded ${entries.length} entries from PO file`);

  let migratedCount = 0;
  let skippedCount = 0;

  // Migrate each entry
  entries.forEach(entry => {
    const newKey = entry.msgid;

    // Skip if already has translation
    if (entry.msgstr && entry.msgstr !== '') {
      return;
    }
    if (entry.msgstr_plural && entry.msgstr_plural.some(v => v !== '')) {
      return;
    }

    // Find old key that maps to this new key
    let oldKey = null;
    for (const [old, mapped] of Object.entries(migrationMap.migrations)) {
      if (mapped === newKey) {
        oldKey = old;
        break;
      }
    }

    // Try direct lookup if no migration mapping
    if (!oldKey) {
      oldKey = newKey;
    }

    // Get old translation
    const oldValue = getNestedValue(oldTranslations, oldKey);

    if (oldValue && typeof oldValue === 'string') {
      if (entry.isPlural) {
        // For plural forms, use old value for both forms
        // Translators will need to refine this
        entry.msgstr_plural = entry.msgstr_plural.map(() => oldValue);
      } else {
        entry.msgstr = oldValue;
      }
      migratedCount++;
    } else {
      skippedCount++;
    }
  });

  // Write updated PO file
  writePOFile(poPath, entries);

  console.log(`  ✓ Migrated ${migratedCount} translations`);
  console.log(`  ⚠ Skipped ${skippedCount} entries (no old translation found)`);

  const coveragePercent = ((migratedCount / entries.length) * 100).toFixed(1);
  console.log(`  Coverage: ${coveragePercent}%`);

  return { migratedCount, skippedCount, totalCount: entries.length };
}

/**
 * Main execution
 */
function main() {
  console.log('=== Translation Migration ===\n');
  console.log(`Old translations: ${OLD_LOCALES_DIR}`);
  console.log(`New PO files: ${LOCALES_DIR}`);

  const results = {};

  LANGUAGES.forEach(language => {
    try {
      results[language] = migrateLanguage(language);
    } catch (error) {
      console.error(`  ✗ Error migrating ${language}:`, error.message);
      process.exit(1);
    }
  });

  // Summary
  console.log('\n=== Summary ===');

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalEntries = 0;

  LANGUAGES.forEach(language => {
    const result = results[language];
    totalMigrated += result.migratedCount;
    totalSkipped += result.skippedCount;
    totalEntries += result.totalCount;

    const coverage = ((result.migratedCount / result.totalCount) * 100).toFixed(1);
    console.log(`  ${language}: ${result.migratedCount}/${result.totalCount} (${coverage}%)`);
  });

  const overallCoverage = ((totalMigrated / totalEntries) * 100).toFixed(1);

  console.log(`\n✓ Migrated ${totalMigrated} translations total`);
  console.log(`⚠ ${totalSkipped} entries need manual translation`);
  console.log(`Overall coverage: ${overallCoverage}%`);

  console.log('\nNext steps:');
  console.log('1. Review migrated translations for accuracy');
  console.log('2. Fill in missing translations (marked with empty msgstr)');
  console.log('3. Refine plural forms (currently using singular value for all)');
  console.log('4. Deploy to Weblate for collaborative translation');
}

// Run if executed directly
if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    main();
  }
}

export { migrateLanguage, parsePOFile, writePOFile };
