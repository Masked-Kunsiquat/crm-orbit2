#!/usr/bin/env node

/**
 * Translation Coverage Checker
 *
 * Analyzes translation files to find:
 * - Missing keys in non-English locales
 * - Extra keys in non-English locales (unused)
 * - Coverage percentage per language
 * - Total key counts
 *
 * Usage:
 *   node scripts/check-translations.js
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const BASE_LANG = 'en';
const SUPPORTED_LANGS = ['en', 'es', 'de', 'fr', 'zh-Hans'];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function loadJSON(filename) {
  const filepath = path.join(LOCALES_DIR, filename);
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`${colors.red}Error loading ${filename}:${colors.reset}`, error.message);
    return null;
  }
}

function flattenKeys(obj, prefix = '') {
  let keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse into nested objects
      keys = keys.concat(flattenKeys(value, fullKey));
    } else {
      // Leaf node - actual translation key
      keys.push(fullKey);
    }
  }

  return keys;
}

function compareTranslations(baseKeys, targetKeys, baseLang, targetLang) {
  const baseSet = new Set(baseKeys);
  const targetSet = new Set(targetKeys);

  const missing = baseKeys.filter(key => !targetSet.has(key));
  const extra = targetKeys.filter(key => !baseSet.has(key));
  const common = baseKeys.filter(key => targetSet.has(key));

  const coverage = baseKeys.length > 0
    ? Math.round((common.length / baseKeys.length) * 100)
    : 0;

  return {
    missing,
    extra,
    common,
    coverage,
    total: baseKeys.length,
    translated: common.length,
  };
}

function printHeader() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Translation Coverage Report${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
}

function printSummary(results, baseKeyCount) {
  console.log(`${colors.blue}Base Language (${BASE_LANG}):${colors.reset} ${baseKeyCount} keys\n`);

  console.log(`${colors.blue}Coverage Summary:${colors.reset}`);
  console.log('─────────────────────────────────────────────────────────\n');

  const sortedResults = Object.entries(results)
    .filter(([lang]) => lang !== BASE_LANG)
    .sort((a, b) => b[1].coverage - a[1].coverage);

  sortedResults.forEach(([lang, data]) => {
    const coverageColor = data.coverage === 100 ? colors.green
      : data.coverage >= 90 ? colors.yellow
      : colors.red;

    const bar = '█'.repeat(Math.floor(data.coverage / 2)) +
                '░'.repeat(50 - Math.floor(data.coverage / 2));

    console.log(`  ${lang.padEnd(10)} ${coverageColor}${data.coverage}%${colors.reset} ${colors.gray}${bar}${colors.reset}`);
    console.log(`             ${data.translated}/${data.total} keys translated`);

    if (data.missing.length > 0) {
      console.log(`             ${colors.red}${data.missing.length} missing${colors.reset}`);
    }
    if (data.extra.length > 0) {
      console.log(`             ${colors.yellow}${data.extra.length} extra (unused)${colors.reset}`);
    }
    console.log('');
  });
}

function printDetails(results) {
  console.log(`\n${colors.blue}Detailed Issues:${colors.reset}`);
  console.log('─────────────────────────────────────────────────────────\n');

  let hasIssues = false;

  Object.entries(results)
    .filter(([lang]) => lang !== BASE_LANG)
    .forEach(([lang, data]) => {
      if (data.missing.length > 0 || data.extra.length > 0) {
        hasIssues = true;
        console.log(`${colors.cyan}${lang}:${colors.reset}`);

        if (data.missing.length > 0) {
          console.log(`  ${colors.red}Missing keys (${data.missing.length}):${colors.reset}`);
          data.missing.slice(0, 10).forEach(key => {
            console.log(`    - ${key}`);
          });
          if (data.missing.length > 10) {
            console.log(`    ${colors.gray}... and ${data.missing.length - 10} more${colors.reset}`);
          }
        }

        if (data.extra.length > 0) {
          console.log(`  ${colors.yellow}Extra keys (${data.extra.length}):${colors.reset}`);
          data.extra.slice(0, 10).forEach(key => {
            console.log(`    + ${key}`);
          });
          if (data.extra.length > 10) {
            console.log(`    ${colors.gray}... and ${data.extra.length - 10} more${colors.reset}`);
          }
        }

        console.log('');
      }
    });

  if (!hasIssues) {
    console.log(`  ${colors.green}✓ All translations are in sync!${colors.reset}\n`);
  }
}

function main() {
  printHeader();

  // Load base language
  const baseTranslations = loadJSON(`${BASE_LANG}.json`);
  if (!baseTranslations) {
    console.error(`${colors.red}Failed to load base language (${BASE_LANG})${colors.reset}`);
    process.exit(1);
  }

  const baseKeys = flattenKeys(baseTranslations);
  console.log(`${colors.gray}Loaded ${BASE_LANG}.json: ${baseKeys.length} keys${colors.reset}`);

  // Load and compare all other languages
  const results = {
    [BASE_LANG]: {
      coverage: 100,
      total: baseKeys.length,
      translated: baseKeys.length,
      missing: [],
      extra: [],
    },
  };

  SUPPORTED_LANGS.forEach(lang => {
    if (lang === BASE_LANG) return;

    const translations = loadJSON(`${lang}.json`);
    if (!translations) {
      results[lang] = {
        coverage: 0,
        total: baseKeys.length,
        translated: 0,
        missing: baseKeys,
        extra: [],
      };
      return;
    }

    const targetKeys = flattenKeys(translations);
    console.log(`${colors.gray}Loaded ${lang}.json: ${targetKeys.length} keys${colors.reset}`);

    results[lang] = compareTranslations(baseKeys, targetKeys, BASE_LANG, lang);
  });

  console.log(''); // Blank line

  // Print results
  printSummary(results, baseKeys.length);
  printDetails(results);

  // Exit code
  const allComplete = Object.values(results).every(r => r.coverage === 100);
  if (allComplete) {
    console.log(`${colors.green}✓ All translations are complete!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.yellow}⚠ Some translations are incomplete${colors.reset}\n`);
    process.exit(1);
  }
}

main();
