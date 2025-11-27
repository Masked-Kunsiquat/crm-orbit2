# New Translation Structure Design

**Generated**: 2025-11-27
**Project**: Expo CRM (crm-orbit)
**Status**: Phase 2.1 Complete

---

## Executive Summary

This document describes the improved JSON translation structure that addresses all issues identified in Phase 1. The new structure:

- ✅ **Reduces key count by 35%** (203 → 132 unique strings via nesting)
- ✅ **Adds proper pluralization** (12+ entity types with _one/_other)
- ✅ **Eliminates duplication** (80+ duplicate instances removed)
- ✅ **Improves maintainability** (centralized common strings)
- ✅ **Fixes word-order issues** (interpolation templates)
- ✅ **Supports i18next nesting** ($t() references)

---

## Table of Contents

1. [New Structure Overview](#new-structure-overview)
2. [Common Namespace Design](#common-namespace-design)
3. [Pluralization Implementation](#pluralization-implementation)
4. [Nesting References](#nesting-references)
5. [Word-Order Fixes](#word-order-fixes)
6. [Key Changes Summary](#key-changes-summary)
7. [Benefits](#benefits)

---

## New Structure Overview

### File Location
`locales/NEW_STRUCTURE.json` - Baseline English structure

### Top-Level Namespaces (20)

```json
{
  "common": { ... },              // NEW - Reusable strings
  "navigation": { ... },
  "dashboard": { ... },
  "analytics": { ... },
  "search": { ... },
  "settings": { ... },
  "theme": { ... },               // NEW - Extracted from labels
  "industries": { ... },
  "companies": { ... },
  "interactions": { ... },
  "interactionTypes": { ... },    // NEW - Extracted for consistency
  "addInteraction": { ... },
  "events": { ... },
  "eventTypes": { ... },          // NEW - Extracted for consistency
  "addEvent": { ... },
  "contactDetail": { ... },
  "categories": { ... },
  "addContact": { ... },
  "contact": { ... },
  "editContact": { ... },
  "globalSearch": { ... },
  "proximity": { ... },
  "proximitySettings": { ... }
}
```

**Changes from old structure**:
- ❌ Removed: `buttons`, `labels` (merged into `common`)
- ❌ Removed: `filters`, `savedSearches` (incomplete features)
- ✅ Added: `common` (centralized reusable strings)
- ✅ Added: `theme`, `interactionTypes`, `eventTypes` (extracted for clarity)

---

## Common Namespace Design

The new `common` namespace contains **71 reusable strings** organized into 7 sub-categories:

### 1. Actions (16 strings)

**Purpose**: Reusable action button labels

```json
{
  "common": {
    "actions": {
      "save": "Save",                    // Generic save
      "saveChanges": "Save Changes",     // Contextual save
      "saveContact": "Save Contact",     // Specific save
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit",
      "add": "Add",
      "remove": "Remove",
      "close": "Close",
      "confirm": "Confirm",
      "retry": "Retry",
      "apply": "Apply",
      "clear": "Clear",
      "reset": "Reset",
      "update": "Update",
      "run": "Run"
    }
  }
}
```

**Usage in code**:
```javascript
// ✅ NEW
<Button onPress={handleSave}>{t('common.actions.save')}</Button>

// ❌ OLD (duplicated across 7 namespaces)
<Button onPress={handleSave}>{t('addContact.labels.save')}</Button>
```

**Impact**: Eliminates 35+ duplicate action strings

---

### 2. States (7 strings)

**Purpose**: Loading, error, and status indicators

```json
{
  "common": {
    "states": {
      "loading": "Loading...",
      "searching": "Searching...",
      "error": "Error",
      "success": "Success",
      "warning": "Warning",
      "info": "Info",
      "ok": "OK"
    }
  }
}
```

**Usage**:
```javascript
// ✅ NEW
<Text>{t('common.states.loading')}</Text>

// With nesting reference in JSON
{
  "dashboard": {
    "loading": "$t(common.states.loading)"
  }
}
```

**Impact**: Eliminates 15+ duplicate state strings

---

### 3. Counts (14 strings with pluralization)

**Purpose**: Count displays with proper plural forms

```json
{
  "common": {
    "counts": {
      "contact_one": "{{count}} contact",
      "contact_other": "{{count}} contacts",
      "interaction_one": "{{count}} interaction",
      "interaction_other": "{{count}} interactions",
      "event_one": "{{count}} event",
      "event_other": "{{count}} events",
      "company_one": "{{count}} company",
      "company_other": "{{count}} companies",
      "category_one": "{{count}} category",
      "category_other": "{{count}} categories",
      "note_one": "{{count}} note",
      "note_other": "{{count}} notes",
      "result_one": "{{count}} result",
      "result_other": "{{count}} results",
      "item_one": "{{count}} item",
      "item_other": "{{count}} items",
      "uniqueContact_one": "{{count}} unique contact",
      "uniqueContact_other": "{{count}} unique contacts"
    }
  }
}
```

**Usage in code**:
```javascript
// ✅ NEW - Automatic pluralization
<Text>{t('common.counts.contact', { count: contactCount })}</Text>

// i18next automatically selects _one or _other based on count
// count = 1 → "1 contact"
// count = 5 → "5 contacts"
```

**For other languages**:
```javascript
// Spanish (2 plural forms)
"contact_one": "{{count}} contacto",
"contact_other": "{{count}} contactos"

// Chinese (no inflection, but both keys required)
"contact_one": "{{count}}个联系人",    // Added measure word 个
"contact_other": "{{count}}个联系人"
```

**Impact**: Adds pluralization to 12+ count displays, fixes Chinese measure words

---

### 4. Entities (12 strings)

**Purpose**: Centralized entity name references (singular/plural)

```json
{
  "common": {
    "entities": {
      "contact": "Contact",
      "contacts": "Contacts",
      "interaction": "Interaction",
      "interactions": "Interactions",
      "event": "Event",
      "events": "Events",
      "company": "Company",
      "companies": "Companies",
      "note": "Note",
      "notes": "Notes",
      "category": "Category",
      "categories": "Categories"
    }
  }
}
```

**Usage with nesting**:
```json
{
  "navigation": {
    "contacts": "$t(common.entities.contacts)"
  },
  "addContact": {
    "sections": {
      "company": "$t(common.entities.company)"
    }
  }
}
```

**Impact**: Ensures consistent entity names across 25+ contexts

---

### 5. Time (16 strings with pluralization)

**Purpose**: Time-related strings with proper plurals

```json
{
  "common": {
    "time": {
      "today": "Today",
      "tomorrow": "Tomorrow",
      "yesterday": "Yesterday",
      "minute_one": "{{count}} minute",
      "minute_other": "{{count}} minutes",
      "hour_one": "{{count}} hour",
      "hour_other": "{{count}} hours",
      "day_one": "{{count}} day",
      "day_other": "{{count}} days",
      "week_one": "{{count}} week",
      "week_other": "{{count}} weeks",
      "daysAgo_one": "{{count}} day ago",
      "daysAgo_other": "{{count}} days ago",
      "minutesAgo_one": "{{count}} minute ago",
      "minutesAgo_other": "{{count}} minutes ago",
      "hoursAgo_one": "{{count}} hour ago",
      "hoursAgo_other": "{{count}} hours ago"
    }
  }
}
```

**Replaces hard-coded logic**:
```javascript
// ❌ OLD (dateUtils.js:588)
const plural = n === 1 ? '' : 's';
return `${n} day${plural} ago`;

// ✅ NEW
return t('common.time.daysAgo', { count: n });
```

**Impact**: Fixes hard-coded pluralization in dateUtils.js

---

### 6. Date Ranges (4 strings)

**Purpose**: Reusable date range filters

```json
{
  "common": {
    "dateRanges": {
      "allTime": "All Time",
      "last7Days": "Last 7 Days",
      "last30Days": "Last 30 Days",
      "last90Days": "Last 90 Days"
    }
  }
}
```

**Used in**: Analytics, filters, date pickers

---

### 7. Errors (7 strings)

**Purpose**: Common error messages

```json
{
  "common": {
    "errors": {
      "generic": "An error occurred",
      "network": "Network error",
      "notFound": "Not found",
      "unauthorized": "Unauthorized",
      "saveFailed": "Failed to save. Please try again.",
      "deleteFailed": "Failed to delete. Please try again.",
      "loadFailed": "Failed to load"
    }
  }
}
```

**Usage**:
```json
{
  "addInteraction": {
    "errors": {
      "saveFailed": "$t(common.errors.saveFailed)",
      "deleteFailed": "$t(common.errors.deleteFailed)"
    }
  }
}
```

**Impact**: Reduces error message duplication from 15+ instances

---

### 8. Labels (4 strings)

**Purpose**: Generic form labels

```json
{
  "common": {
    "labels": {
      "optional": "Optional",
      "required": "Required",
      "left": "Left",
      "right": "Right"
    }
  }
}
```

---

### 9. Filters (2 strings)

**Purpose**: Filter options

```json
{
  "common": {
    "filters": {
      "all": "All",
      "none": "None"
    }
  }
}
```

---

## Pluralization Implementation

### i18next Plural Rules

i18next uses suffixes to handle plurals:
- `_one` - Singular form (count = 1 in English)
- `_other` - Plural form (count != 1 in English)
- Additional forms for other languages: `_zero`, `_few`, `_many` (e.g., Russian, Arabic)

### Example: Contact Count

**JSON Structure**:
```json
{
  "common": {
    "counts": {
      "contact_one": "{{count}} contact",
      "contact_other": "{{count}} contacts"
    }
  }
}
```

**Code Usage**:
```javascript
// Automatic selection based on count
t('common.counts.contact', { count: 1 })  → "1 contact"
t('common.counts.contact', { count: 5 })  → "5 contacts"
t('common.counts.contact', { count: 0 })  → "0 contacts" (uses _other)
```

**Translations**:

**English** (2 forms):
```json
"contact_one": "{{count}} contact",
"contact_other": "{{count}} contacts"
```

**Spanish** (2 forms):
```json
"contact_one": "{{count}} contacto",
"contact_other": "{{count}} contactos"
```

**Chinese** (1 form, but 2 keys required):
```json
"contact_one": "{{count}}个联系人",    // Added measure word
"contact_other": "{{count}}个联系人"
```

**Russian** (3 forms - example):
```json
"contact_one": "{{count}} контакт",      // 1, 21, 31...
"contact_few": "{{count}} контакта",     // 2-4, 22-24...
"contact_other": "{{count}} контактов"   // 5+, 11-14...
```

### All Pluralized Keys

**Entities** (7 types):
- contact, interaction, event, company, category, note, result, item, uniqueContact

**Time units** (7 types):
- minute, hour, day, week, minutesAgo, hoursAgo, daysAgo

**Total**: 14 pluralized keys (28 strings in English, more for other languages)

---

## Nesting References

### What is i18next Nesting?

i18next allows referencing other translation keys using `$t()` syntax:

```json
{
  "common": {
    "actions": {
      "save": "Save"
    }
  },
  "addContact": {
    "labels": {
      "save": "$t(common.actions.save)"  // ← Reference
    }
  }
}
```

**Result**: `t('addContact.labels.save')` returns `"Save"`

### Benefits

1. **Single source of truth**: Change "Save" in one place → updates everywhere
2. **Reduced translation effort**: Translate "Save" once, not 7 times
3. **Consistency**: Guaranteed same translation across all contexts
4. **Smaller file size**: Less duplicate strings

### Nesting Examples in New Structure

#### Example 1: Action Buttons
```json
{
  "common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel"
    }
  },
  "addContact": {
    "labels": {
      "save": "$t(common.actions.saveContact)",  // More specific
      "cancel": "$t(common.actions.cancel)"
    }
  },
  "editContact": {
    "labels": {
      "save": "$t(common.actions.saveChanges)",  // Contextual
      "cancel": "$t(common.actions.cancel)"
    }
  }
}
```

#### Example 2: Entity Names
```json
{
  "common": {
    "entities": {
      "contacts": "Contacts",
      "contact": "Contact"
    }
  },
  "navigation": {
    "contacts": "$t(common.entities.contacts)"
  },
  "contactDetail": {
    "title": "$t(common.entities.contact)"
  }
}
```

#### Example 3: States
```json
{
  "common": {
    "states": {
      "loading": "Loading...",
      "error": "Error"
    }
  },
  "dashboard": {
    "loading": "$t(common.states.loading)"
  },
  "contactDetail": {
    "loading": "$t(common.states.loading)"
  },
  "globalSearch": {
    "searching": "$t(common.states.searching)"
  }
}
```

### When NOT to Use Nesting

❌ **Don't nest when context changes meaning**:
```json
// BAD - Different contexts need different translations
{
  "common": {
    "actions": {
      "save": "Save"  // Generic
    }
  },
  "addContact": {
    "labels": {
      "save": "$t(common.actions.save)"  // ← Should be "Save Contact"
    }
  }
}
```

✅ **Better - Provide contextual options**:
```json
{
  "common": {
    "actions": {
      "save": "Save",
      "saveContact": "Save Contact",
      "saveChanges": "Save Changes"
    }
  },
  "addContact": {
    "labels": {
      "save": "$t(common.actions.saveContact)"  // ← Specific
    }
  }
}
```

---

## Word-Order Fixes

### Problem: Hard-coded "X at Y" Pattern

**OLD (BAD)**:
```javascript
// ContactCard.js:28, ContactDetailScreen.js:475
const line = job && companyName
  ? `${job} at ${companyName}`  // ❌ Hard-coded English order
  : (job || companyName);
```

**NEW (GOOD)**:

**JSON**:
```json
{
  "contact": {
    "jobAtCompany": "{{job}} at {{company}}",
    "jobOnly": "{{job}}",
    "companyOnly": "{{company}}"
  }
}
```

**Code**:
```javascript
const line = job && companyName
  ? t('contact.jobAtCompany', { job, company: companyName })
  : job
    ? t('contact.jobOnly', { job })
    : t('contact.companyOnly', { company: companyName });
```

**Translations**:
```json
// English
"jobAtCompany": "{{job}} at {{company}}"

// Spanish
"jobAtCompany": "{{job}} en {{company}}"

// German
"jobAtCompany": "{{job}} bei {{company}}"

// French
"jobAtCompany": "{{job}} chez {{company}}"

// Chinese (REVERSED!)
"jobAtCompany": "{{company}}的{{job}}"
```

### Result
- ✅ Prepositions adapt to each language
- ✅ Chinese can reverse word order
- ✅ Translators have full flexibility

---

## Key Changes Summary

### Structure Changes

| Change Type | Old | New | Impact |
|-------------|-----|-----|--------|
| Add `common` namespace | N/A | 71 strings | Centralized reusables |
| Merge `buttons` | 2 keys | Into `common.actions` | Eliminated namespace |
| Merge `labels` | 8 keys | Into `common.*` | Eliminated namespace |
| Remove empty features | `filters`, `savedSearches` | Removed | Clean structure |
| Extract types | Inline | `interactionTypes`, `eventTypes` | Clarity |
| Add pluralization | 1 key | 28+ strings | Proper plurals |

### Key Count Reduction

| Category | Old Count | New Count | Reduction |
|----------|-----------|-----------|-----------|
| Action buttons | 35 instances | 16 unique | -54% |
| States | 15 instances | 7 unique | -53% |
| Entity names | 25 instances | 12 unique | -52% |
| Error titles | 15 instances | 7 unique | -53% |
| **Total** | **203 keys** | **~132 unique** | **-35%** |

### Code Changes Required

**Files to update** (3):
1. `src/components/ContactCard.js:28` - Use `t('contact.jobAtCompany')`
2. `src/screens/ContactDetailScreen.js:475` - Use `t('contact.jobAtCompany')`
3. `src/utils/dateUtils.js:588` - Use `t('common.time.daysAgo', { count })`

**Component updates** (35+):
- Replace `t('buttons.save')` → `t('common.actions.save')`
- Replace `t('addContact.labels.save')` → `t('common.actions.saveContact')`
- Replace `t('labels.call')` → `t('interactionTypes.call')`
- Add pluralization: `t('common.counts.contact', { count })`

---

## Benefits

### 1. Maintainability
- **Single source of truth**: Update "Save" once, changes everywhere
- **Clear organization**: Related strings grouped logically
- **Easy to find**: Predictable namespace structure

### 2. Translation Efficiency
- **Reduce workload**: 35% fewer unique strings to translate
- **Consistency**: Same strings guaranteed same translation
- **Context clarity**: Nesting shows relationships

### 3. Code Quality
- **DRY principle**: No duplicate strings in code
- **Type safety**: Centralized keys easier to validate
- **Refactor-friendly**: Change key names in one place

### 4. i18n Best Practices
- ✅ Proper pluralization (i18next `_one`/`_other`)
- ✅ No string concatenation
- ✅ Interpolation for word-order flexibility
- ✅ Nesting for reusability
- ✅ Context separation (actions, states, entities)

### 5. File Size
- **JSON reduction**: 203 keys → ~132 unique strings
- **Estimated savings**: ~30-40% smaller translation files
- **Bundle impact**: Smaller app bundle size

---

## Migration Strategy (Phase 5)

### Step 1: Generate PO Files from New Structure
- Convert `NEW_STRUCTURE.json` to `en.po`
- Add developer comments to ALL keys
- Mark nested references with special comments

### Step 2: Migrate Existing Translations
- Use `KEY_MIGRATION_MAP.json` (Phase 2.2) to map old → new keys
- Preserve all existing translations
- Fill new pluralization keys from singular forms

### Step 3: Update Code
- Replace 3 string concatenations with `t()` calls
- Update 35+ action button references
- Add pluralization to 12+ count displays

### Step 4: Test
- Verify all 5 languages load correctly
- Test pluralization with count = 0, 1, 2, 10
- Verify nesting references resolve
- Check word order in all languages

---

## Next Steps

1. ✅ **Phase 2.1 Complete**: New structure designed
2. ⏭️ **Phase 2.2**: Create key migration mapping (old → new)
3. ⏭️ **Phase 2.3**: Design developer comments for PO files
4. ⏭️ **Phase 3**: Generate PO files with comments
5. ⏭️ **Phase 4**: Create TBX glossary
6. ⏭️ **Phase 5**: Update codebase

---

**Document Generated**: 2025-11-27
**File**: `locales/NEW_STRUCTURE.json`
**Next**: Phase 2.2 - Key Migration Mapping
