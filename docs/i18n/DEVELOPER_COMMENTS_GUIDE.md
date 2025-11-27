# Developer Comments Guide

**Generated**: 2025-11-27
**Project**: Expo CRM (crm-orbit)
**Status**: Phase 2.3 Complete

---

## Purpose

This guide explains how developer comments will be added to translation keys when converting to PO (gettext) format. Developer comments provide essential context for translators, improving translation quality and consistency.

---

## Why Developer Comments Matter

### Without Comments
Translator sees:
```po
msgid "contact.jobAtCompany"
msgstr "{{job}} at {{company}}"
```

**Problems**:
- What are `{{job}}` and `{{company}}`?
- Where is this displayed?
- Can I change word order?
- Are there character limits?
- What's an example with real data?

### With Comments
Translator sees:
```po
#. Display contact's job title and company name together
#. Variables: {{job}} = job title (e.g., 'Software Engineer'), {{company}} = company name (e.g., 'Google')
#. Example (English): 'Software Engineer at Google'
#. IMPORTANT: Word order MUST be adjusted for your language!
#.   - English: '{{job}} at {{company}}'
#.   - Spanish: '{{job}} en {{company}}'
#.   - German: '{{job}} bei {{company}}'
#.   - French: '{{job}} chez {{company}}'
#.   - Chinese: '{{company}}的{{job}}' (REVERSED! Company comes first)
#. Context: Contact cards, contact detail screen
#: src/components/ContactCard.js:28
#: src/screens/ContactDetailScreen.js:475
msgid "contact.jobAtCompany"
msgstr "{{job}} at {{company}}"
```

**Benefits**:
- ✅ Translator knows what variables represent
- ✅ Sees example output with real data
- ✅ Knows word order is flexible
- ✅ Gets guidance for specific languages
- ✅ Knows where it appears in the UI
- ✅ Can reference source code if needed

---

## Comment Structure

### PO File Comment Syntax

gettext PO files support several comment types:

```po
#  Translator comment (written by translators, preserved across updates)
#. Extracted comment (from source code, for translator guidance)
#: Reference (source code location)
#, Flag (fuzzy, no-c-format, etc.)
#| Previous msgid (for comparison during updates)
```

**We use**:
- `#.` for developer comments (guidance for translators)
- `#:` for source code locations (file:line references)

### Comment Format Template

```po
#. {one-line description}
#. {additional context}
#. {variable explanations}
#. {examples}
#. {special instructions}
#. {character limits}
#. {tone/style guidance}
#: {file1.js:line}
#: {file2.js:line}
msgid "{key}"
msgstr "{translation}"
```

---

## Comment Templates by Category

### 1. Action Buttons

**Template**:
```
#. Action button label: {action_description}
#. Context: {ui_location}
#. Tone: Imperative (command form)
#. Character limit: ~{N} characters
```

**Example**:
```po
#. Action button label: Save changes to contact
#. Context: Contact edit modal, Settings screens
#. Tone: Imperative, professional
#. Character limit: ~15 characters
#: src/components/EditContactModal.js:45
#: src/screens/SettingsScreen.js:120
msgid "common.actions.save"
msgstr "Save"
```

**Applied to**:
- `common.actions.save`
- `common.actions.cancel`
- `common.actions.delete`
- etc. (16 action keys)

---

### 2. State Indicators

**Template**:
```
#. Status indicator: {status_description}
#. Context: {where_shown}
#. Format: {format_notes}
```

**Example**:
```po
#. Status indicator: Data is being loaded from database
#. Context: Shown during screen initialization, data refresh
#. Format: Usually includes ellipsis (...) to indicate ongoing action
#: src/screens/ContactDetailScreen.js:156
#: src/screens/Dashboard.js:78
msgid "common.states.loading"
msgstr "Loading..."
```

**Applied to**:
- `common.states.loading`
- `common.states.error`
- `common.states.success`
- etc. (7 state keys)

---

### 3. Count Displays (with Pluralization)

**Template**:
```
#. Count display for {entity_name} ({SINGULAR/PLURAL} form)
#. Variables: {{count}} = {count_description}
#. Usage: {where_used}
#. IMPORTANT: Use proper plural forms for your language
#. NOTE FOR CHINESE: Add appropriate measure word (量词)
```

**Example (Singular)**:
```po
#. Count display for contacts (SINGULAR form)
#. Variables: {{count}} = number of contacts (will be 1 in this form)
#. Usage: Contact list headers, analytics, stats displays
#. IMPORTANT: This is the SINGULAR form (1 contact)
#. Example (English): '1 contact'
#. NOTE FOR CHINESE: Add measure word 个 (gè): '1个联系人'
#: src/screens/ContactsList.js:45
#: src/screens/Analytics.js:120
msgid "common.counts.contact_one"
msgid_plural "common.counts.contact_other"
msgstr[0] "{{count}} contact"
msgstr[1] "{{count}} contacts"
```

**Example (Plural)**:
```po
#. Count display for contacts (PLURAL form)
#. Variables: {{count}} = number of contacts (0, 2, 3, 5, 100, etc.)
#. Usage: Contact list headers, analytics, stats displays
#. IMPORTANT: This is the PLURAL form (0, 2+ contacts)
#. Example (English): '5 contacts', '0 contacts'
#. NOTE FOR CHINESE: Add measure word 个 (gè): '5个联系人'
```

**Special Instructions for Plurals**:
```po
#. IMPORTANT: Use proper plural forms for your language
#. English has 2 forms (_one for count=1, _other for count!=1)
#. Spanish has 2 forms (same as English)
#. Russian has 3 forms (_one, _few, _many)
#. Arabic has 6 forms (_zero, _one, _two, _few, _many, _other)
#. Chinese has 1 form (no inflection, but both keys required for i18next)
#.
#. NOTE FOR CHINESE TRANSLATORS:
#. Add appropriate measure words (量词):
#.   - People/contacts: 个 (gè) - Example: 5个联系人
#.   - Events/times: 次 (cì) - Example: 3次互动
#.   - Companies: 家 (jiā) - Example: 2家公司
#.   - Documents/notes: 份 (fèn) - Example: 10份文档
```

**Applied to**:
- `common.counts.contact_one/other`
- `common.counts.interaction_one/other`
- `common.counts.event_one/other`
- etc. (14 count types = 28 keys)

---

### 4. Interpolation Strings

**Template**:
```
#. {string_description}
#. Variables: {variable_list}
#. Example: {example_output}
#. IMPORTANT: {special_instructions}
#. Context: {ui_location}
```

**Example (Word-Order Critical)**:
```po
#. Display contact's job title and company name together
#. Variables: {{job}} = job title (e.g., 'Software Engineer'), {{company}} = company name (e.g., 'Google')
#. Example (English): 'Software Engineer at Google'
#. IMPORTANT: Word order MUST be adjusted for your language!
#.   - English: '{{job}} at {{company}}'
#.   - Spanish: '{{job}} en {{company}}'
#.   - German: '{{job}} bei {{company}}'
#.   - French: '{{job}} chez {{company}}'
#.   - Chinese: '{{company}}的{{job}}' (REVERSED! Company comes first)
#. Context: Contact cards, contact detail screen
#: src/components/ContactCard.js:28
#: src/screens/ContactDetailScreen.js:475
msgid "contact.jobAtCompany"
msgstr "{{job}} at {{company}}"
```

**Example (Possessive)**:
```po
#. Quick-fill title template for birthday events
#. Variables: {{name}} = contact's name
#. Example (English): 'John's Birthday'
#. IMPORTANT: Possessive structure varies by language
#.   - English: {{name}}'s Birthday (apostrophe-s)
#.   - Spanish: Cumpleaños de {{name}} (preposition 'de')
#.   - German: {{name}}s Geburtstag (suffix 's' without apostrophe)
#.   - French: Anniversaire de {{name}} (preposition 'de')
#.   - Chinese: {{name}}的生日 (particle 的)
#. Character limit: ~50 characters
#: src/components/AddEventModal.js:120
msgid "addEvent.quickTitles.birthday"
msgstr "{{name}}'s Birthday"
```

**Critical Instructions for Interpolation**:
```po
#. CRITICAL: These strings contain {{variables}} that will be replaced with data
#. You MUST keep the {{variable}} placeholders exactly as shown
#. You CAN change word order, add/remove words around variables
#. You CAN change prepositions, particles, grammar to fit your language
#. Example: '{{job}} at {{company}}' can become '{{company}}的{{job}}' in Chinese
```

**Applied to**:
- `contact.jobAtCompany`
- `addInteraction.quickTitles.*`
- `addEvent.quickTitles.*`
- etc. (15+ interpolation keys)

---

### 5. Ambiguous Terms

**Template**:
```
#. {part_of_speech}: {definition}
#. NOT: {what_its_not}
#. Context: {where_used}
#. Example: {example_usage}
```

**Example**:
```po
#. NOUN: A person in your contact list
#. NOT: The verb 'to contact someone'
#. Context: Entity name used throughout app (lists, forms, navigation)
#. Example: 'Add Contact' button, 'Contacts' tab
#. Character limit: ~15 characters
#: src/components/AddContactModal.js:10
#: src/navigation/index.js:25
msgid "common.entities.contact"
msgstr "Contact"
```

**Example (Call - Noun vs Verb)**:
```po
#. NOUN: Phone call - an interaction type
#. NOT: The verb 'to call someone'
#. Context: Interaction type selector, filter buttons, labels
#. Example usage: 'Type: Call'
#. Character limit: ~15 characters
#: src/screens/InteractionsScreen.js:78
#: src/components/AddInteractionModal.js:45
msgid "interactionTypes.call"
msgstr "Call"
```

**Applied to**:
- `common.entities.*` (contact, interaction, event)
- `interactionTypes.call`
- `interactionTypes.text`
- Other potentially ambiguous terms

---

### 6. Warnings and Destructive Actions

**Template**:
```
#. {action_type}: {description}
#. Context: {when_shown}
#. Tone: {tone_guidance}
#. IMPORTANT: {critical_instructions}
```

**Example**:
```po
#. WARNING: Destructive action confirmation message
#. Context: Shown before database reset (deletes ALL user data)
#. Tone: Serious, clear warning
#. IMPORTANT: Make it clear this is PERMANENT and CANNOT be undone
#. Character limit: ~200 characters
#: src/screens/SettingsScreen.js:234
msgid "settings.database.resetWarning"
msgstr "This will permanently delete ALL your data (contacts, interactions, events, notes). This action cannot be undone. Are you sure?"
```

**Applied to**:
- `settings.database.resetWarning`
- `contactDetail.deleteConfirm`
- `addInteraction.delete.message`
- etc.

---

### 7. Feature-Specific Terms

**Template**:
```
#. Feature name: {feature_name}
#. Definition: {what_it_means}
#. Note: {clarifications}
#. Context: {where_used}
```

**Example**:
```po
#. Feature name: Relationship Proximity
#. Definition: A calculated score (0-100) measuring relationship strength
#. Note: 'Proximity' here means relationship closeness, NOT physical distance
#. Context: Feature tab name, screen title
#. Character limit: ~30 characters
#: src/navigation/index.js:42
#: src/screens/ProximityScreen.js:15
msgid "proximity.title"
msgstr "Relationship Proximity"
```

**Applied to**:
- `proximity.title`
- `proximity.infoMessage`
- Feature-specific terminology

---

## Source Code References

### Format: `#: file.js:line`

**Purpose**: Links translation strings to source code locations

**Benefits**:
- Translators can see context in code
- Developers know where string is used
- QA can verify correct strings in UI

**Example**:
```po
#: src/components/ContactCard.js:28
#: src/screens/ContactDetailScreen.js:475
msgid "contact.jobAtCompany"
msgstr "{{job}} at {{company}}"
```

**How to Generate**:
```javascript
// Scan codebase for t() calls
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import glob from 'glob';

function extractReferences() {
  const references = {};

  // Find all JS/JSX files
  const files = glob.sync('src/**/*.{js,jsx}');

  files.forEach(file => {
    const code = fs.readFileSync(file, 'utf8');
    const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });

    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.name === 't') {
          const key = path.node.arguments[0].value;
          const line = path.node.loc.start.line;

          if (!references[key]) references[key] = [];
          references[key].push(`${file}:${line}`);
        }
      }
    });
  });

  return references;
}
```

---

## Character Limits

### Why Character Limits Matter

UI elements have space constraints:
- **Buttons**: ~12-15 characters
- **Tab labels**: ~15-20 characters
- **Form labels**: ~30 characters
- **Alert titles**: ~40 characters
- **Descriptions**: ~80-100 characters
- **Long explanations**: ~200-250 characters

**Example**:
```po
#. Action button label: Save changes
#. Context: Modal save buttons
#. Character limit: ~12 characters
#. Note: Keep concise, some languages expand (German often 30% longer than English)
msgid "common.actions.save"
msgstr "Save"
```

### Language Expansion Factors

| Language | Expansion |
|----------|-----------|
| English | 1.0x (baseline) |
| Spanish | 1.2x |
| French | 1.2x |
| German | 1.3x |
| Russian | 1.1x |
| Chinese | 0.7x (contracts) |

**Example**:
- English "Save" (4 chars) → German "Speichern" (10 chars) = 2.5x!
- Character limit of 12 is tight for German

---

## Tone and Style Guidance

### Action Buttons
- **Tone**: Imperative (command form)
- **Style**: Professional, concise
- **Examples**: "Save", "Cancel", "Delete"

### Errors/Warnings
- **Tone**: Clear, serious, non-technical
- **Style**: Polite but firm
- **Examples**: "Failed to save. Please try again."

### Informational
- **Tone**: Friendly, helpful
- **Style**: Conversational but professional
- **Examples**: "Start typing to search"

### Success Messages
- **Tone**: Positive, encouraging
- **Style**: Brief, celebratory
- **Examples**: "Contact added successfully!"

---

## Complete Example: Full PO Entry

```po
# Translator comments can go here (added by translators)
# These are preserved across updates
#. Display contact's job title and company name together
#. Variables: {{job}} = job title (e.g., 'Software Engineer'), {{company}} = company name (e.g., 'Google')
#. Example (English): 'Software Engineer at Google'
#. IMPORTANT: Word order MUST be adjusted for your language!
#.   - English: '{{job}} at {{company}}'
#.   - Spanish: '{{job}} en {{company}}'
#.   - German: '{{job}} bei {{company}}'
#.   - French: '{{job}} chez {{company}}'
#.   - Chinese: '{{company}}的{{job}}' (REVERSED! Company comes first)
#. Context: Contact cards, contact detail screen
#. Character limit: ~50 characters (with typical job/company names)
#: src/components/ContactCard.js:28
#: src/screens/ContactDetailScreen.js:475
msgid "contact.jobAtCompany"
msgstr "{{job}} at {{company}}"
```

---

## Implementation: PO File Generation

### Script: Generate PO with Comments

```javascript
// scripts/json-to-po-with-comments.js

import fs from 'fs';
import gettextParser from 'gettext-parser';
import newStructure from '../locales/NEW_STRUCTURE.json';
import comments from '../locales/DEVELOPER_COMMENTS.json';

function generatePO(language) {
  const po = {
    charset: 'UTF-8',
    headers: {
      'Language': language,
      'MIME-Version': '1.0',
      'Content-Type': 'text/plain; charset=UTF-8',
      'Content-Transfer-Encoding': '8bit',
      'Plural-Forms': getPluralForms(language)
    },
    translations: {
      '': {} // Default context
    }
  };

  // Iterate through all keys in new structure
  const allKeys = getAllKeys(newStructure);

  allKeys.forEach(key => {
    const value = getNestedValue(newStructure, key);
    const commentData = comments.comments[key];
    const references = extractReferences(key); // From source code scan

    const entry = {
      msgid: key,
      msgstr: [language === 'en' ? value : ''], // Empty for non-English
      comments: {}
    };

    // Add developer comments
    if (commentData) {
      entry.comments.extracted = commentData.comment.join('\n');

      // Add source references
      if (commentData.locations || references) {
        entry.comments.reference = (commentData.locations || references).join('\n');
      }
    }

    // Handle plurals
    if (key.endsWith('_one') || key.endsWith('_other')) {
      const baseKey = key.replace(/_one|_other$/, '');
      const otherKey = key.endsWith('_one') ? `${baseKey}_other` : `${baseKey}_one`;
      const otherValue = getNestedValue(newStructure, otherKey);

      entry.msgid_plural = otherKey;
      entry.msgstr = language === 'en'
        ? [value, otherValue]
        : ['', '']; // Empty for translation
    }

    po.translations[''][key] = entry;
  });

  // Write PO file
  const output = gettextParser.po.compile(po);
  fs.writeFileSync(`locales/${language}.po`, output);
}

function getPluralForms(language) {
  const forms = {
    en: 'nplurals=2; plural=(n != 1);',
    es: 'nplurals=2; plural=(n != 1);',
    fr: 'nplurals=2; plural=(n > 1);',
    de: 'nplurals=2; plural=(n != 1);',
    'zh-Hans': 'nplurals=1; plural=0;'
  };
  return forms[language] || forms.en;
}

// Generate for all languages
['en', 'es', 'fr', 'de', 'zh-Hans'].forEach(generatePO);
```

---

## Quality Checklist

### For Each Translation Key

- [ ] Has one-line description
- [ ] Explains context/location
- [ ] Lists all {{variables}} with examples
- [ ] Includes real example output
- [ ] Specifies character limits (if applicable)
- [ ] Notes tone/style guidance
- [ ] Warns about special cases (plurals, word-order, etc.)
- [ ] Includes source code references
- [ ] Flags ambiguous terms (NOUN vs VERB)
- [ ] Provides language-specific guidance (Chinese measure words, etc.)

### For Pluralization Keys

- [ ] Clearly marked as SINGULAR or PLURAL
- [ ] Explains when each form is used
- [ ] Notes language-specific plural rules
- [ ] Chinese: Includes measure word guidance
- [ ] Russian/Arabic: Notes additional forms needed

### For Interpolation Keys

- [ ] Lists ALL {{variables}}
- [ ] Explains what each variable represents
- [ ] Provides example with real data
- [ ] Warns that variables must be preserved
- [ ] Notes that word order can change
- [ ] Gives language-specific examples

---

## Summary Statistics

### Comment Coverage

| Category | Keys | Comments | Coverage |
|----------|------|----------|----------|
| Actions | 16 | 16 | 100% |
| States | 7 | 7 | 100% |
| Counts | 28 | 28 | 100% |
| Entities | 12 | 12 | 100% |
| Time | 16 | 16 | 100% |
| Interpolation | 15+ | 15+ | 100% |
| **Total** | **~132** | **~132** | **100%** |

**Every key will have developer comments!**

---

## Next Steps

1. ✅ **Phase 2.3 Complete**: Developer comments designed
2. ⏭️ **Phase 3**: Convert JSON → PO with comments
3. ⏭️ **Phase 4**: Create TBX glossary
4. ⏭️ **Phase 5**: Update codebase
5. ⏭️ **Phase 6**: Deploy to Weblate

---

**Document Generated**: 2025-11-27
**Comments File**: `locales/DEVELOPER_COMMENTS.json`
**Next**: Phase 3 - Generate PO Files with Comments
