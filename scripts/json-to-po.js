/**
 * Convert JSON translation files to gettext PO format with developer comments
 *
 * This script:
 * 1. Reads NEW_STRUCTURE.json (baseline English)
 * 2. Adds developer comments from DEVELOPER_COMMENTS.json
 * 3. Generates monolingual PO files for all languages
 * 4. Includes proper pluralization support
 * 5. Adds source code references
 *
 * Usage: node scripts/json-to-po.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'locales');
const SRC_LOCALES_DIR = path.join(PROJECT_ROOT, 'test-fresh', 'src', 'locales');

// Load source files
const newStructure = JSON.parse(
  fs.readFileSync(path.join(LOCALES_DIR, 'NEW_STRUCTURE.json'), 'utf8')
);
const developerComments = JSON.parse(
  fs.readFileSync(path.join(LOCALES_DIR, 'DEVELOPER_COMMENTS.json'), 'utf8')
);

// Plural forms for each language
const PLURAL_FORMS = {
  en: {
    header: 'nplurals=2; plural=(n != 1);',
    count: 2
  },
  es: {
    header: 'nplurals=2; plural=(n != 1);',
    count: 2
  },
  fr: {
    header: 'nplurals=2; plural=(n > 1);',
    count: 2
  },
  de: {
    header: 'nplurals=2; plural=(n != 1);',
    count: 2
  },
  'zh-Hans': {
    header: 'nplurals=1; plural=0;',
    count: 1
  }
};

/**
 * Recursively get all keys from nested object
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else if (typeof value === 'string') {
      keys.push(fullKey);
    }
  }

  return keys;
}

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
 * Format multi-line strings for PO files
 */
function formatMultiline(str) {
  if (!str) return '""';

  const lines = str.split('\n');
  if (lines.length === 1 && str.length < 80) {
    return `"${escapePO(str)}"`;
  }

  // Multi-line format
  const formatted = lines.map(line => `"${escapePO(line)}\\n"`).join('\n');
  return `""\n${formatted}`;
}

/**
 * Check if key is a plural form
 */
function isPluralKey(key) {
  return key.endsWith('_one') || key.endsWith('_other');
}

/**
 * Get the base key for a plural form
 */
function getBasePluralKey(key) {
  return key.replace(/_one$|_other$/, '');
}

/**
 * Get the opposite plural form key
 */
function getOtherPluralKey(key) {
  if (key.endsWith('_one')) {
    return key.replace(/_one$/, '_other');
  } else if (key.endsWith('_other')) {
    return key.replace(/_other$/, '_one');
  }
  return null;
}

/**
 * Generate PO file header
 */
function generateHeader(language) {
  const pluralForm = PLURAL_FORMS[language] || PLURAL_FORMS.en;
  const timestamp = new Date().toISOString().split('T')[0];

  return `# Orbit CRM - ${language.toUpperCase()} Translations
# Generated: ${timestamp}
#
msgid ""
msgstr ""
"Project-Id-Version: Orbit CRM\\n"
"Language: ${language}\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: ${pluralForm.header}\\n"
"X-Generator: json-to-po.js\\n"

`;
}

/**
 * Generate PO entry for a translation key
 */
function generatePOEntry(key, value, language) {
  const lines = [];

  // Add developer comments
  const commentData = developerComments.comments[key];
  if (commentData && commentData.comment) {
    commentData.comment.forEach(line => {
      lines.push(`#. ${line}`);
    });
  }

  // Add source code locations
  if (commentData && commentData.locations) {
    commentData.locations.forEach(location => {
      lines.push(`#: ${location}`);
    });
  }

  // Handle plural forms
  if (isPluralKey(key)) {
    const otherKey = getOtherPluralKey(key);
    const otherValue = getNestedValue(newStructure, otherKey);

    // Only process _one keys (to avoid duplicates)
    if (!key.endsWith('_one')) {
      return null;
    }

    // Monolingual PO: msgid = key (without _one suffix), msgid_plural = key with _other
    const baseKey = getBasePluralKey(key);
    lines.push(`msgid "${baseKey}"`);
    lines.push(`msgid_plural "${baseKey}"`);

    // Add msgstr entries based on plural count
    const pluralCount = PLURAL_FORMS[language]?.count || 2;
    for (let i = 0; i < pluralCount; i++) {
      if (language === 'en') {
        // English: use actual values
        const msgstr = i === 0 ? value : (otherValue || value);
        lines.push(`msgstr[${i}] ${formatMultiline(msgstr)}`);
      } else {
        // Other languages: empty (needs translation)
        lines.push(`msgstr[${i}] ""`);
      }
    }
  } else {
    // Regular (non-plural) entry
    // Monolingual PO: msgid = key
    lines.push(`msgid ${formatMultiline(key)}`);

    if (language === 'en') {
      lines.push(`msgstr ${formatMultiline(value)}`);
    } else {
      lines.push(`msgstr ""`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate complete PO file content
 */
function generatePOFile(language) {
  console.log(`\nGenerating ${language}.po...`);

  const lines = [generateHeader(language)];
  const allKeys = getAllKeys(newStructure);

  let entryCount = 0;
  let pluralCount = 0;

  allKeys.forEach(key => {
    const value = getNestedValue(newStructure, key);

    // Skip if value is not a string or is a nesting reference
    if (typeof value !== 'string' || value.startsWith('$t(')) {
      return;
    }

    // Skip plural _other keys (only process _one keys which handle both forms)
    if (key.endsWith('_other')) {
      return;
    }

    const entry = generatePOEntry(key, value, language);
    if (entry) {
      lines.push(entry);
      lines.push(''); // Blank line between entries
      entryCount++;

      if (isPluralKey(key)) {
        pluralCount++;
      }
    }
  });

  console.log(`  ✓ Generated ${entryCount} entries (${pluralCount} plural pairs)`);

  return lines.join('\n');
}

/**
 * Write PO file to disk
 */
function writePOFile(language, content) {
  const outputPath = path.join(LOCALES_DIR, `${language}.po`);
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`  ✓ Wrote: ${outputPath}`);

  // Validate file size
  const stats = fs.statSync(outputPath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`  ✓ Size: ${sizeKB} KB`);
}

/**
 * Main execution
 */
function main() {
  console.log('=== JSON to PO Conversion ===\n');
  console.log(`Source: ${path.join(LOCALES_DIR, 'NEW_STRUCTURE.json')}`);
  console.log(`Comments: ${path.join(LOCALES_DIR, 'DEVELOPER_COMMENTS.json')}`);
  console.log(`Output: ${LOCALES_DIR}/`);

  const languages = ['en', 'es', 'fr', 'de', 'zh-Hans'];

  languages.forEach(language => {
    try {
      const poContent = generatePOFile(language);
      writePOFile(language, poContent);
    } catch (error) {
      console.error(`  ✗ Error generating ${language}.po:`, error.message);
      process.exit(1);
    }
  });

  console.log('\n=== Summary ===');
  console.log(`✓ Generated ${languages.length} PO files`);
  console.log('✓ All files include developer comments');
  console.log('✓ Pluralization support added');
  console.log('\nNext steps:');
  console.log('1. Run validation: node scripts/validate-po.js');
  console.log('2. Migrate existing translations: node scripts/migrate-translations.js');
  console.log('3. Test with msgfmt: msgfmt -c -o /dev/null locales/en.po');
}

// Run if executed directly
if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    main();
  }
}

export { generatePOFile, getAllKeys };
