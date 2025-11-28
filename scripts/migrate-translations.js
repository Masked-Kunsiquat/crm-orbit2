/**
 * Migrate existing translations from old JSON to new PO files
 *
 * This script:
 * 1. Reads old translation JSON files (test-fresh/src/locales/*.json)
 * 2. Reads KEY_MIGRATION_MAP.json for key mappings
 * 3. Reads generated PO files (preserving ALL PO features)
 * 4. Fills in msgstr values with existing translations
 * 5. Writes updated PO files (preserving original formatting)
 * 6. Reports coverage statistics
 *
 * PO Features Preserved:
 * - Translator comments (#)
 * - Extracted comments (#.)
 * - Reference comments (#:)
 * - Flag comments (#,)
 * - Multi-line msgid/msgstr strings
 * - Plural forms (msgid_plural, msgstr[n])
 * - Original line formatting and structure
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
 * Parse PO file into entries, preserving all features
 */
function parsePOFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const entries = [];
  let currentEntry = null;
  let inHeader = true;
  let currentField = null; // Track which field we're accumulating multi-line strings for

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

    // Any comment line (translator #, extracted #., reference #:, flags #,, etc.)
    if (line.startsWith('#')) {
      if (!currentEntry) {
        currentEntry = {
          comments: [],
          originalLines: [],
          msgidLines: [],
          msgid_pluralLines: [],
          msgstrLines: [],
          msgstr_pluralLines: []
        };
      }
      currentEntry.comments.push(line);
      currentEntry.originalLines.push(line);
      currentField = null; // End multi-line accumulation
    }
    // msgid (start of new message)
    else if (line.startsWith('msgid ')) {
      if (!currentEntry) {
        currentEntry = {
          comments: [],
          originalLines: [],
          msgidLines: [],
          msgid_pluralLines: [],
          msgstrLines: [],
          msgstr_pluralLines: []
        };
      }

      // Extract value from first line
      const valueMatch = line.match(/^msgid\s+"(.*)"\s*$/);
      if (valueMatch) {
        currentEntry.msgid = unescapePO(valueMatch[1]);
      } else {
        currentEntry.msgid = '';
      }

      currentEntry.msgidLines.push(line);
      currentEntry.originalLines.push(line);
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

      currentEntry.msgid_pluralLines.push(line);
      currentEntry.originalLines.push(line);
      currentEntry.isPlural = true;
      currentField = 'msgid_plural';
    }
    // msgstr (non-plural)
    else if (line.startsWith('msgstr ')) {
      const valueMatch = line.match(/^msgstr\s+"(.*)"\s*$/);
      if (valueMatch) {
        currentEntry.msgstr = unescapePO(valueMatch[1]);
      } else {
        currentEntry.msgstr = '';
      }

      currentEntry.msgstrLines.push(line);
      currentEntry.originalLines.push(line);
      currentField = 'msgstr';
    }
    // msgstr[n] (plural)
    else if (line.match(/^msgstr\[\d+\]/)) {
      if (!currentEntry.msgstr_plural) currentEntry.msgstr_plural = [];
      if (!currentEntry.msgstr_pluralLines) currentEntry.msgstr_pluralLines = [];

      const indexMatch = line.match(/^msgstr\[(\d+)\]/);
      const index = parseInt(indexMatch[1]);

      const valueMatch = line.match(/^msgstr\[\d+\]\s+"(.*)"\s*$/);
      if (valueMatch) {
        currentEntry.msgstr_plural[index] = unescapePO(valueMatch[1]);
      } else {
        currentEntry.msgstr_plural[index] = '';
      }

      if (!currentEntry.msgstr_pluralLines[index]) {
        currentEntry.msgstr_pluralLines[index] = [];
      }
      currentEntry.msgstr_pluralLines[index].push(line);
      currentEntry.originalLines.push(line);
      currentField = { type: 'msgstr_plural', index };
    }
    // Continuation line (quoted string on its own line)
    else if (line.trim().startsWith('"') && currentField) {
      const valueMatch = line.match(/^\s*"(.*)"\s*$/);
      if (valueMatch) {
        const continuationValue = unescapePO(valueMatch[1]);

        if (currentField === 'msgid') {
          currentEntry.msgid += continuationValue;
          currentEntry.msgidLines.push(line);
        } else if (currentField === 'msgid_plural') {
          currentEntry.msgid_plural += continuationValue;
          currentEntry.msgid_pluralLines.push(line);
        } else if (currentField === 'msgstr') {
          currentEntry.msgstr += continuationValue;
          currentEntry.msgstrLines.push(line);
        } else if (currentField?.type === 'msgstr_plural') {
          const idx = currentField.index;
          currentEntry.msgstr_plural[idx] += continuationValue;
          currentEntry.msgstr_pluralLines[idx].push(line);
        }
      }

      currentEntry.originalLines.push(line);
    }
    // Blank line = end of entry
    else if (line.trim() === '' && currentEntry && currentEntry.msgid !== undefined) {
      entries.push(currentEntry);
      currentEntry = null;
      currentField = null;
    }
    // Unknown line - preserve for future compatibility
    else if (currentEntry) {
      currentEntry.originalLines.push(line);
      currentField = null; // End multi-line accumulation
    }
  }

  // Add last entry if exists
  if (currentEntry && currentEntry.msgid !== undefined) {
    entries.push(currentEntry);
  }

  return entries.filter(e => e.msgid !== '');
}

/**
 * Format multi-line string for PO file (preserving original line breaks)
 */
function formatMultilinePO(value) {
  if (!value) return ['""'];

  // If value contains newlines, split and format as multi-line
  if (value.includes('\n')) {
    const lines = value.split('\n');
    const formatted = ['""'];
    lines.forEach((line, index) => {
      if (index < lines.length - 1) {
        formatted.push(`"${escapePO(line)}\\n"`);
      } else {
        formatted.push(`"${escapePO(line)}"`);
      }
    });
    return formatted;
  }

  // Single line
  return [`"${escapePO(value)}"`];
}

/**
 * Write updated PO file, preserving original formatting
 */
function writePOFile(filePath, entries) {
  // Read original header
  const originalContent = fs.readFileSync(filePath, 'utf8');
  const headerEnd = originalContent.indexOf('\nmsgid "');
  const header = originalContent.substring(0, headerEnd + 1);

  // Generate entries
  const entryLines = [];

  entries.forEach(entry => {
    // Preserve all comments (translator, extracted, reference, flags, etc.)
    entry.comments.forEach(comment => entryLines.push(comment));

    // msgid - preserve original multi-line format if present
    if (entry.msgidLines && entry.msgidLines.length > 0) {
      entry.msgidLines.forEach(line => entryLines.push(line));
    } else {
      const msgidFormatted = formatMultilinePO(entry.msgid);
      entryLines.push(`msgid ${msgidFormatted[0]}`);
      msgidFormatted.slice(1).forEach(line => entryLines.push(line));
    }

    if (entry.isPlural) {
      // msgid_plural - preserve original multi-line format if present
      if (entry.msgid_pluralLines && entry.msgid_pluralLines.length > 0) {
        entry.msgid_pluralLines.forEach(line => entryLines.push(line));
      } else {
        const pluralFormatted = formatMultilinePO(entry.msgid_plural);
        entryLines.push(`msgid_plural ${pluralFormatted[0]}`);
        pluralFormatted.slice(1).forEach(line => entryLines.push(line));
      }

      // msgstr[n] - reconstruct with updated values
      entry.msgstr_plural.forEach((value, index) => {
        const msgstrFormatted = formatMultilinePO(value);
        entryLines.push(`msgstr[${index}] ${msgstrFormatted[0]}`);
        msgstrFormatted.slice(1).forEach(line => entryLines.push(line));
      });
    } else {
      // Regular msgstr - reconstruct with updated value
      const msgstrFormatted = formatMultilinePO(entry.msgstr);
      entryLines.push(`msgstr ${msgstrFormatted[0]}`);
      msgstrFormatted.slice(1).forEach(line => entryLines.push(line));
    }

    entryLines.push(''); // Blank line between entries
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
