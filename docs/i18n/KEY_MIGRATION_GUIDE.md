# Key Migration Guide

**Generated**: 2025-11-27
**Project**: Expo CRM (crm-orbit)
**Status**: Phase 2.2 Complete

---

## Purpose

This guide explains how to use `KEY_MIGRATION_MAP.json` to migrate existing translations from the old JSON structure to the new improved structure while preserving 100% of translation data.

---

## Migration Map Structure

The migration map contains 6 sections:

### 1. Direct Migrations (120+ mappings)
Simple 1-to-1 key renames:
```json
{
  "migrations": {
    "buttons.save": "common.actions.save",
    "labels.call": "interactionTypes.call",
    "dashboard.loading": "common.states.loading"
  }
}
```

### 2. New Keys (90+ keys)
Keys added in the new structure with no old equivalent:
```json
{
  "newKeys": {
    "keys": [
      "common.actions.saveChanges",
      "common.counts.contact_one",
      "common.time.daysAgo_one"
    ]
  }
}
```

### 3. Removed Keys (15+ keys)
Keys removed from old structure (empty or duplicate):
```json
{
  "removedKeys": {
    "keys": [
      "common.cancel",
      "filters.*",
      "savedSearches.*"
    ]
  }
}
```

### 4. Plural Migrations (5 transformations)
Keys that need to be split into `_one`/`_other` forms:
```json
{
  "pluralMigrations": {
    "migrations": [
      {
        "oldKey": "analytics.interactions.uniqueContacts",
        "newKeys": {
          "_one": "common.counts.uniqueContact_one",
          "_other": "common.counts.uniqueContact_other"
        }
      }
    ]
  }
}
```

### 5. Case Changes (20 changes)
Keys where only casing changed (PascalCase → camelCase):
```json
{
  "caseChanges": {
    "changes": [
      {
        "old": "categories.Family",
        "new": "categories.family"
      }
    ]
  }
}
```

### 6. Special Cases (3 cases)
Keys requiring custom migration logic:
```json
{
  "specialCases": {
    "cases": [
      {
        "key": "settings.errors.*",
        "oldStructure": "{ title: 'Error', message: '...' }",
        "newStructure": "Just the message string",
        "migration": "Extract message value only, discard title"
      }
    ]
  }
}
```

---

## Migration Process

### Step 1: Load Old Translations

```javascript
import oldEn from '../test-fresh/src/locales/en.json';
import oldEs from '../test-fresh/src/locales/es.json';
import oldFr from '../test-fresh/src/locales/fr.json';
import oldDe from '../test-fresh/src/locales/de.json';
import oldZh from '../test-fresh/src/locales/zh-Hans.json';
```

### Step 2: Load Migration Map

```javascript
import migrationMap from '../locales/KEY_MIGRATION_MAP.json';
```

### Step 3: Apply Migrations

For each language file:

#### A. Direct Migrations
```javascript
function applyDirectMigrations(oldTranslations, newTranslations) {
  Object.entries(migrationMap.migrations).forEach(([oldKey, newKey]) => {
    const value = getNestedValue(oldTranslations, oldKey);
    if (value) {
      setNestedValue(newTranslations, newKey, value);
    }
  });
}
```

**Example**:
```javascript
// Old: { buttons: { save: "Save" } }
// New: { common: { actions: { save: "Save" } } }

const value = oldTranslations.buttons.save; // "Save"
newTranslations.common.actions.save = value; // "Save"
```

#### B. Case Changes
```javascript
function applyCaseChanges(oldTranslations, newTranslations) {
  migrationMap.caseChanges.changes.forEach(({ old, new: newKey }) => {
    const value = getNestedValue(oldTranslations, old);
    if (value) {
      setNestedValue(newTranslations, newKey, value);
    }
  });
}
```

**Example**:
```javascript
// Old: { categories: { Family: "Family" } }
// New: { categories: { family: "Family" } }

const value = oldTranslations.categories.Family; // "Family"
newTranslations.categories.family = value; // "Family"
```

#### C. Plural Migrations
```javascript
function applyPluralMigrations(oldTranslations, newTranslations, language) {
  migrationMap.pluralMigrations.migrations.forEach((migration) => {
    const oldValue = getNestedValue(oldTranslations, migration.oldKey);

    if (!oldValue) return;

    // For existing plural keys
    if (migration.oldKey.includes('_one') || migration.oldKey.includes('_other')) {
      setNestedValue(newTranslations, migration.newKey, oldValue);
    }
    // For non-plural keys that need to be split
    else {
      // Use existing value for both forms initially
      setNestedValue(newTranslations, migration.newKeys._one, oldValue);
      setNestedValue(newTranslations, migration.newKeys._other, oldValue);

      // Flag for manual review (translators need to add proper singular form)
      console.warn(`TODO: Review plural forms for ${migration.newKeys._one}`);
    }
  });
}
```

**Example 1** (existing plural):
```javascript
// Old: { settings: { security: { minutes_one: "1 min" } } }
// New: { common: { time: { minute_one: "1 min" } } }

const value = oldTranslations.settings.security.minutes_one; // "1 min"
newTranslations.common.time.minute_one = value; // "1 min"
```

**Example 2** (new plural):
```javascript
// Old: { analytics: { interactions: { uniqueContacts: "{{count}} unique contacts" } } }
// New (both forms): { common: { counts: {
//   uniqueContact_one: "{{count}} unique contact",
//   uniqueContact_other: "{{count}} unique contacts"
// } } }

const oldValue = "{{count}} unique contacts";

// Initial migration (use same for both)
newTranslations.common.counts.uniqueContact_one = oldValue;
newTranslations.common.counts.uniqueContact_other = oldValue;

// Translator will fix _one form later to be singular
```

#### D. Special Cases

**Case 1: Flatten Error Objects**
```javascript
function flattenErrors(oldTranslations, newTranslations) {
  // Old: { settings: { errors: { biometricToggle: { title: "Error", message: "Unable to..." } } } }
  // New: { settings: { errors: { biometric: "Unable to..." } } }

  const oldError = oldTranslations.settings.errors.biometricToggle;
  if (oldError && oldError.message) {
    newTranslations.settings.errors.biometric = oldError.message;
  }
}
```

**Case 2: Add New Interpolation Key**
```javascript
function addInterpolationKeys(newTranslations, language) {
  // New key with no old equivalent
  // Will need to be created based on language

  const templates = {
    en: "{{job}} at {{company}}",
    es: "{{job}} en {{company}}",
    de: "{{job}} bei {{company}}",
    fr: "{{job}} chez {{company}}",
    'zh-Hans': "{{company}}的{{job}}"
  };

  newTranslations.contact.jobAtCompany = templates[language];
  newTranslations.contact.jobOnly = "{{job}}";
  newTranslations.contact.companyOnly = "{{company}}";
}
```

#### E. Handle New Keys

New keys with no old equivalent need baseline English values:

```javascript
function fillNewKeys(newTranslations, language) {
  // For non-English languages, leave new keys empty initially
  if (language !== 'en') {
    migrationMap.newKeys.keys.forEach(key => {
      setNestedValue(newTranslations, key, ""); // Empty - needs translation
    });
  } else {
    // English already has values from NEW_STRUCTURE.json
    // No action needed
  }
}
```

### Step 4: Validate Migration

```javascript
function validateMigration(oldTranslations, newTranslations, language) {
  const report = {
    language,
    oldKeyCount: countKeys(oldTranslations),
    newKeyCount: countKeys(newTranslations),
    migratedKeys: 0,
    newKeys: 0,
    emptyKeys: 0,
    errors: []
  };

  // Count migrated vs new
  migrationMap.newKeys.keys.forEach(key => {
    const value = getNestedValue(newTranslations, key);
    if (!value || value === "") {
      report.emptyKeys++;
    } else {
      report.newKeys++;
    }
  });

  // Verify all old keys were migrated
  const allOldKeys = getAllKeys(oldTranslations);
  allOldKeys.forEach(oldKey => {
    const mapping = findMappingForOldKey(oldKey, migrationMap);
    if (!mapping && !isRemovedKey(oldKey, migrationMap)) {
      report.errors.push(`Unmapped key: ${oldKey}`);
    }
  });

  return report;
}
```

---

## Complete Migration Script Example

```javascript
// scripts/migrate-translations.js

import fs from 'fs';
import path from 'path';
import migrationMap from '../locales/KEY_MIGRATION_MAP.json';
import newStructure from '../locales/NEW_STRUCTURE.json';

const LANGUAGES = ['en', 'es', 'fr', 'de', 'zh-Hans'];
const OLD_DIR = '../test-fresh/src/locales';
const NEW_DIR = '../locales';

// Helper functions
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, obj);
  target[last] = value;
}

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function isRemovedKey(key, map) {
  return map.removedKeys.keys.some(pattern => {
    if (pattern.endsWith('.*')) {
      return key.startsWith(pattern.slice(0, -2));
    }
    return key === pattern;
  });
}

// Migration function
function migrateLanguage(language) {
  console.log(`\nMigrating ${language}...`);

  // Load old translations
  const oldPath = path.join(OLD_DIR, `${language}.json`);
  const oldTranslations = JSON.parse(fs.readFileSync(oldPath, 'utf8'));

  // Start with new structure (English only)
  let newTranslations = language === 'en' ? { ...newStructure } : {};

  // 1. Apply direct migrations
  Object.entries(migrationMap.migrations).forEach(([oldKey, newKey]) => {
    const value = getNestedValue(oldTranslations, oldKey);
    if (value) {
      setNestedValue(newTranslations, newKey, value);
      console.log(`  ✓ Migrated: ${oldKey} → ${newKey}`);
    }
  });

  // 2. Apply case changes
  migrationMap.caseChanges.changes.forEach(({ old, new: newKey }) => {
    const value = getNestedValue(oldTranslations, old);
    if (value) {
      setNestedValue(newTranslations, newKey, value);
      console.log(`  ✓ Case change: ${old} → ${newKey}`);
    }
  });

  // 3. Apply plural migrations
  migrationMap.pluralMigrations.migrations.forEach(migration => {
    if (migration.oldKey && migration.newKey) {
      // Simple rename
      const value = getNestedValue(oldTranslations, migration.oldKey);
      if (value) {
        setNestedValue(newTranslations, migration.newKey, value);
        console.log(`  ✓ Plural: ${migration.oldKey} → ${migration.newKey}`);
      }
    } else if (migration.oldKey && migration.newKeys) {
      // Split into _one/_other
      const value = getNestedValue(oldTranslations, migration.oldKey);
      if (value) {
        setNestedValue(newTranslations, migration.newKeys._one, value);
        setNestedValue(newTranslations, migration.newKeys._other, value);
        console.log(`  ⚠ Plural split: ${migration.oldKey} (needs manual review)`);
      }
    }
  });

  // 4. Flatten error structures
  const errorPaths = [
    'settings.errors.biometricToggle',
    'settings.errors.autoLockToggle',
    'settings.errors.autoLockTimeout',
    'settings.errors.swipeAction',
    'settings.errors.theme',
    'settings.errors.language',
    'settings.errors.featureToggle'
  ];

  errorPaths.forEach(oldPath => {
    const errorObj = getNestedValue(oldTranslations, oldPath);
    if (errorObj && errorObj.message) {
      const newPath = oldPath.replace(/Toggle|Timeout/, '').replace(/\.\w+$/, '');
      const finalKey = oldPath.split('.').pop();
      setNestedValue(newTranslations, `settings.errors.${finalKey}`, errorObj.message);
      console.log(`  ✓ Flattened error: ${oldPath}.message → settings.errors.${finalKey}`);
    }
  });

  // 5. Add interpolation templates (special case)
  if (!getNestedValue(newTranslations, 'contact.jobAtCompany')) {
    const templates = {
      en: "{{job}} at {{company}}",
      es: "{{job}} en {{company}}",
      de: "{{job}} bei {{company}}",
      fr: "{{job}} chez {{company}}",
      'zh-Hans': "{{company}}的{{job}}"
    };

    setNestedValue(newTranslations, 'contact.jobAtCompany', templates[language] || templates.en);
    setNestedValue(newTranslations, 'contact.jobOnly', "{{job}}");
    setNestedValue(newTranslations, 'contact.companyOnly', "{{company}}");
    console.log(`  ✓ Added interpolation: contact.jobAtCompany`);
  }

  // 6. Validate
  const allOldKeys = getAllKeys(oldTranslations);
  const allNewKeys = getAllKeys(newTranslations);

  console.log(`\n  Old keys: ${allOldKeys.length}`);
  console.log(`  New keys: ${allNewKeys.length}`);
  console.log(`  New unique strings: ~${migrationMap.newKeys.keys.length}`);

  // Check for unmapped keys
  const unmapped = allOldKeys.filter(key => {
    const hasMapping = migrationMap.migrations[key] ||
                       migrationMap.caseChanges.changes.some(c => c.old === key) ||
                       migrationMap.pluralMigrations.migrations.some(m => m.oldKey === key) ||
                       isRemovedKey(key, migrationMap);
    return !hasMapping;
  });

  if (unmapped.length > 0) {
    console.warn(`\n  ⚠ Unmapped keys (${unmapped.length}):`);
    unmapped.forEach(key => console.warn(`    - ${key}`));
  }

  // Write new file
  const newPath = path.join(NEW_DIR, `${language}.json`);
  fs.writeFileSync(newPath, JSON.stringify(newTranslations, null, 2), 'utf8');
  console.log(`  ✓ Wrote: ${newPath}`);

  return {
    language,
    oldKeys: allOldKeys.length,
    newKeys: allNewKeys.length,
    unmapped: unmapped.length
  };
}

// Run migration for all languages
console.log('Starting translation migration...\n');
const results = LANGUAGES.map(migrateLanguage);

console.log('\n=== Migration Summary ===');
results.forEach(r => {
  console.log(`${r.language}: ${r.oldKeys} → ${r.newKeys} keys (${r.unmapped} unmapped)`);
});
console.log('\n✅ Migration complete!\n');
```

---

## Migration Statistics

### Expected Results

| Language | Old Keys | New Keys | Migrated | New | Empty | Coverage |
|----------|----------|----------|----------|-----|-------|----------|
| English (en) | 203 | 132 | 132 | 0 | 0 | 100% |
| Spanish (es) | 178 | 132 | ~120 | ~12 | 0 | ~91% |
| French (fr) | 175 | 132 | ~118 | ~14 | 0 | ~89% |
| German (de) | 177 | 132 | ~119 | ~13 | 0 | ~90% |
| Chinese (zh) | 156 | 132 | ~105 | ~27 | 0 | ~80% |

**Notes**:
- "New" = Keys that don't exist in old translations (need translation)
- "Empty" = Keys with empty string values (incomplete features)
- Coverage = Percentage of keys with non-empty values

---

## Post-Migration Tasks

### 1. Manual Review (Priority: HIGH)

**Plural Forms** (5 keys):
- Review `common.counts.*_one` forms
- Ensure singular vs plural is correct in each language
- Add proper measure words for Chinese

**Interpolation** (3 keys):
- Review `contact.jobAtCompany` in all languages
- Verify prepositions are correct
- Check Chinese word order (company first)

### 2. Translation (Priority: MEDIUM)

**New Keys** (~90 keys):
- Translate new `common.*` namespace keys
- Most are simple (save, cancel, delete)
- Ensure consistency with existing translations

**Missing Features** (Chinese - 69 keys):
- Translate `analytics.*` namespace
- Translate `proximity.*` namespace
- Complete `contactDetail.*` missing keys

### 3. Quality Assurance (Priority: HIGH)

- Run all 5 language files through i18next validation
- Test pluralization with count = 0, 1, 2, 10
- Verify nesting references resolve correctly
- Check for any translation gaps

---

## Troubleshooting

### Issue: Unmapped Keys

**Symptom**: Migration script reports unmapped keys

**Solution**:
1. Check if key was removed intentionally (in `removedKeys`)
2. Check if key has a mapping in `migrations`
3. Check if it's a case change in `caseChanges`
4. If genuinely missing, add to migration map

### Issue: Missing Translations

**Symptom**: Empty values after migration

**Solution**:
1. Check if key is in `newKeys` list (expected to be empty)
2. Verify old file had a value for the key
3. Check migration map for correct mapping

### Issue: Plural Forms Don't Work

**Symptom**: Always shows same form regardless of count

**Solution**:
1. Verify key has `_one` and `_other` suffixes
2. Check i18next configuration has `pluralSeparator: '_'`
3. Ensure count is passed: `t('key', { count: n })`

---

## Next Steps

1. ✅ **Phase 2.2 Complete**: Migration map created
2. ⏭️ **Phase 2.3**: Design developer comments for PO files
3. ⏭️ **Phase 3**: Run migration script and generate PO files
4. ⏭️ **Phase 4**: Create TBX glossary
5. ⏭️ **Phase 5**: Update codebase

---

**Document Generated**: 2025-11-27
**Migration Map**: `locales/KEY_MIGRATION_MAP.json`
**Next**: Phase 2.3 - Developer Comments Design
