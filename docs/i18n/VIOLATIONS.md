# i18next Best Practice Violations

**Generated**: 2025-11-27
**Project**: Expo CRM (crm-orbit)
**Status**: Phase 1.2 Complete

---

## Executive Summary

This document identifies violations of i18next best practices found in the Expo CRM codebase and translation files. Each violation includes:
- **Code location** (file:line)
- **Current implementation** (BAD example)
- **Recommended fix** (GOOD example)
- **Impact severity** (HIGH/MEDIUM/LOW)
- **Affected languages**

**Total Violations Found**: 65+ instances across 7 categories

---

## Table of Contents

1. [Pluralization Issues](#1-pluralization-issues)
2. [Word-Order Issues](#2-word-order-issues)
3. [String Concatenation](#3-string-concatenation)
4. [Duplication & Nesting](#4-duplication--nesting)
5. [Missing Context](#5-missing-context)
6. [Hard-coded Strings](#6-hard-coded-strings)
7. [Inconsistent Structure](#7-inconsistent-structure)

---

## 1. Pluralization Issues

### ❌ Violation 1.1: Hard-coded Plurals in Code

**Severity**: HIGH
**Affected Languages**: All
**Impact**: Incorrect grammar for non-English languages

#### Location
```
File: test-fresh/src/utils/dateUtils.js
Line: 588
```

#### Current Implementation (BAD)
```javascript
// ❌ BAD - Hard-coded English plural suffix
const plural = n === 1 ? '' : 's';
return `${n} day${plural} ago`;
```

#### Recommended Fix (GOOD)
```javascript
// ✅ GOOD - Use i18next pluralization
import { t } from 'i18next';

return t('common.time.daysAgo', { count: n });
```

**Translation files**:
```json
{
  "common": {
    "time": {
      "daysAgo_one": "{{count}} day ago",
      "daysAgo_other": "{{count}} days ago"
    }
  }
}
```

**Why this matters**:
- Russian has 3 plural forms: 1 (one), 2-4 (few), 5+ (many)
- Arabic has 6 plural forms
- Chinese has no plural inflection (measure words instead)
- Spanish/French have different rules for 0 vs 1

---

### ❌ Violation 1.2: Missing Plural Keys for Counts

**Severity**: HIGH
**Affected Languages**: All
**Impact**: 12+ instances of count displays without pluralization

#### Instances Found

```json
// ❌ BAD - No pluralization support
"analytics.interactions.uniqueContacts": "{{count}} unique contacts"
"analytics.topContacts.interactionCount": "{{count}} interactions"
"contactDetail.viewMore": "View {{count}} more..."
```

**Problem**: Always shows "contacts" even if count = 1

#### Recommended Fix (GOOD)

```json
{
  "analytics": {
    "interactions": {
      "uniqueContacts_one": "{{count}} unique contact",
      "uniqueContacts_other": "{{count}} unique contacts"
    },
    "topContacts": {
      "interactionCount_one": "{{count}} interaction",
      "interactionCount_other": "{{count}} interactions"
    }
  },
  "contactDetail": {
    "viewMore_one": "View {{count}} more item",
    "viewMore_other": "View {{count}} more items"
  }
}
```

**Code change**:
```javascript
// ❌ OLD
<Text>{t('analytics.interactions.uniqueContacts', { count: uniqueCount })}</Text>

// ✅ NEW (i18next automatically selects _one or _other)
<Text>{t('analytics.interactions.uniqueContacts', { count: uniqueCount })}</Text>
```

---

### ❌ Violation 1.3: Inconsistent Plural Implementation

**Severity**: MEDIUM
**Affected Languages**: German (missing _one), Chinese (missing both)
**Impact**: 1 instance (settings.security.minutes_*)

#### Current State

```json
// English (en.json)
"settings.security.minutes_one": "{{count}} min",
"settings.security.minutes_other": "{{count}} min"

// Spanish (es.json)
"settings.security.minutes_one": "{{count}} minuto",
"settings.security.minutes_other": "{{count}} minutos"

// French (fr.json)
"settings.security.minutes_one": "{{count}} minute",
"settings.security.minutes_other": "{{count}} minutes"

// German (de.json)
"settings.security.minutes_one": "{{count}} minute",  // Should be "Minute"
"settings.security.minutes_other": "{{count}} minuten"  // Should be "Minuten"

// Chinese (zh-Hans.json)
"settings.security.minutes_other": "{{count}} 分钟"
// ❌ MISSING: minutes_one
```

#### Issues
1. **German**: lowercase "minute" should be capitalized "Minute/Minuten"
2. **Chinese**: Missing `_one` key (even though Chinese doesn't inflect, i18next requires it)
3. **All**: English has same text for _one and _other (should be "1 min" vs "2 mins")

#### Recommended Fix (GOOD)

```json
// English
"minutes_one": "{{count}} minute",
"minutes_other": "{{count}} minutes",

// German
"minutes_one": "{{count}} Minute",
"minutes_other": "{{count}} Minuten",

// Chinese (same for both, but both keys required)
"minutes_one": "{{count}} 分钟",
"minutes_other": "{{count}} 分钟"
```

---

## 2. Word-Order Issues

### ❌ Violation 2.1: Hard-coded "X at Y" Pattern

**Severity**: HIGH
**Affected Languages**: All (especially Chinese)
**Impact**: 2 instances

#### Location 1
```
File: test-fresh/src/components/ContactCard.js
Line: 28
```

#### Location 2
```
File: test-fresh/src/screens/ContactDetailScreen.js
Line: 475
```

#### Current Implementation (BAD)

```javascript
// ❌ BAD - Hard-coded English word order
const line = job && companyName
  ? `${job} at ${companyName}`
  : (job || companyName);

// Example output: "Software Engineer at Google"
```

**Problem**:
- English: "Software Engineer **at** Google"
- Spanish: "Software Engineer **en** Google"
- German: "Software Engineer **bei** Google"
- French: "Software Engineer **chez** Google"
- Chinese: "Google**的**Software Engineer" ← **Reversed!**

#### Recommended Fix (GOOD)

```javascript
// ✅ GOOD - Use i18next interpolation
const line = job && companyName
  ? t('contact.jobAtCompany', { job, company: companyName })
  : job
    ? t('contact.jobOnly', { job })
    : t('contact.companyOnly', { company: companyName });
```

**Translation files**:
```json
{
  "contact": {
    "jobAtCompany": "{{job}} at {{company}}",  // en
    "jobOnly": "{{job}}",
    "companyOnly": "{{company}}"
  }
}
```

**Translations**:
```
en: "{{job}} at {{company}}"           → "Software Engineer at Google"
es: "{{job}} en {{company}}"           → "Software Engineer en Google"
de: "{{job}} bei {{company}}"          → "Software Engineer bei Google"
fr: "{{job}} chez {{company}}"         → "Software Engineer chez Google"
zh: "{{company}}的{{job}}"             → "Google的Software Engineer"
```

**Developer comment (for PO file)**:
```po
#. Displayed on contact cards and contact detail screen.
#. Shows contact's job title and company name together.
#. Variables: {{job}} = job title (e.g., "Software Engineer"), {{company}} = company name (e.g., "Google")
#. IMPORTANT: Word order must be adjusted for your language!
#. English: "Software Engineer at Google"
#. Chinese may prefer: "Google的Software Engineer" (company first)
#: src/components/ContactCard.js:28
#: src/screens/ContactDetailScreen.js:475
msgid "contact.jobAtCompany"
msgstr "{{job}} at {{company}}"
```

---

### ❌ Violation 2.2: Possessive Word Order

**Severity**: MEDIUM
**Affected Languages**: All
**Impact**: 5 instances (birthday/event titles)

#### Current Implementation (BAD)

```json
// ❌ POTENTIALLY PROBLEMATIC
"addEvent.quickTitles.birthday": "{{name}}'s Birthday"
```

**Problem**:
- English: "John'**s** Birthday"
- Spanish: "Cumpleaños **de** John"
- German: "John**s** Geburtstag"
- French: "Anniversaire **de** John"
- Chinese: "John**的**生日"

Different languages use different possessive structures:
- English: apostrophe-s ('s)
- Spanish/French: preposition (de)
- German: suffix (s without apostrophe)
- Chinese: particle (的)

#### Current State (GOOD NEWS)

```json
// ✅ ALREADY USES INTERPOLATION (good!)
"addEvent.quickTitles.birthday": "{{name}}'s Birthday"
```

**Why it works**: Translators can adjust to their language's possessive structure:
```
en: "{{name}}'s Birthday"
es: "Cumpleaños de {{name}}"
de: "{{name}}s Geburtstag"
fr: "Anniversaire de {{name}}"
zh: "{{name}}的生日"
```

#### Recommendation
✅ **No code change needed**
⚠️ **Action required**: Add developer comment in PO file explaining possessive variation

**Developer comment**:
```po
#. Quick-fill title template for birthday events
#. Variable: {{name}} = contact's name
#. NOTE: Possessive structure varies by language
#. English: "John's Birthday" (apostrophe-s)
#. Spanish: "Cumpleaños de Juan" (preposition)
#. German: "Johns Geburtstag" (no apostrophe)
#. Chinese: "张三的生日" (particle 的)
msgid "addEvent.quickTitles.birthday"
msgstr "{{name}}'s Birthday"
```

---

### ❌ Violation 2.3: Verb Tense in Titles

**Severity**: MEDIUM
**Affected Languages**: All
**Impact**: 2 instances

#### Current Implementation (POTENTIALLY PROBLEMATIC)

```json
// ❌ VERB TENSE VARIES
"addInteraction.quickTitles.text": "Texted {{name}}"
"addInteraction.quickTitles.email": "Emailed {{name}}"
```

**Problem**: Past tense verbs ("Texted", "Emailed") may not translate well:
- English: "Texted John" (simple past)
- Spanish: "Envié mensaje a John" (preterite + preposition) or "Mensaje a John" (noun form)
- German: "SMS an John gesendet" (past participle + preposition)
- French: "SMS à John" (noun form preferred)
- Chinese: "给John发短信了" (complex aspect marker)

#### Recommended Fix (GOOD)

**Option A: Use noun forms instead of verbs**
```json
// ✅ BETTER - Noun forms are more universal
"addInteraction.quickTitles.text": "Text message to {{name}}"
"addInteraction.quickTitles.email": "Email to {{name}}"
```

**Option B: Keep verb form but add developer note**
```json
// ✅ ACCEPTABLE - If verb form is preferred, add translation note
"addInteraction.quickTitles.text": "Texted {{name}}"
```

**Developer comment**:
```po
#. Quick-fill title for text message interaction
#. Variable: {{name}} = contact name
#. NOTE: You may use past tense ("Texted John") or noun form ("Text to John")
#. Choose what sounds natural in your language
msgid "addInteraction.quickTitles.text"
msgstr "Texted {{name}}"
```

---

### ❌ Violation 2.4: Measure Words (Chinese)

**Severity**: HIGH
**Affected Languages**: Chinese
**Impact**: 8+ count displays

#### Problem
Chinese requires **measure words** (量词) between numbers and nouns:
- ❌ Incorrect: "5 contacts" → "5联系人"
- ✅ Correct: "5 contacts" → "5**个**联系人" (个 = general measure word)

Different entities use different measure words:
- Contacts, people: 个 (gè)
- Events, times: 次 (cì)
- Companies: 家 (jiā)
- Notes, documents: 份 (fèn)
- Days: 天 (tiān)

#### Current Implementation (BAD)

```json
// zh-Hans.json
"analytics.interactions.uniqueContacts": "{{count}}独特接触"
// ❌ MISSING measure word!
```

#### Recommended Fix (GOOD)

```json
// English
"uniqueContacts_one": "{{count}} unique contact",
"uniqueContacts_other": "{{count}} unique contacts",

// Chinese
"uniqueContacts_one": "{{count}}个独特联系人",   // Added 个
"uniqueContacts_other": "{{count}}个独特联系人"  // Added 个
```

**Developer comment for PO file**:
```po
#. Display count of unique contacts in analytics
#. Variable: {{count}} = number of contacts
#. NOTE FOR CHINESE: Add appropriate measure word (量词):
#. - For people/contacts: use 个 (gè)
#. - Example: "5个联系人" not "5联系人"
msgid "analytics.interactions.uniqueContacts"
msgid_plural "analytics.interactions.uniqueContacts"
msgstr[0] "{{count}} unique contact"
msgstr[1] "{{count}} unique contacts"
```

---

## 3. String Concatenation

### ❌ Violation 3.1: Date/Time Concatenation

**Severity**: HIGH
**Already documented in Violation 1.1**
See: [Pluralization Issues - Violation 1.1](#-violation-11-hard-coded-plurals-in-code)

---

### ❌ Violation 3.2: No Other Concatenations Found ✅

**Good news**: Code analysis found only 3 instances of string concatenation:
1. ✅ Job + Company (covered in Violation 2.1)
2. ✅ Plural suffix (covered in Violation 1.1)
3. ✅ All other dynamic strings use proper `t()` interpolation

**Recommendation**: Fix the 2 violations listed above, no additional work needed.

---

## 4. Duplication & Nesting

### ❌ Violation 4.1: Duplicate Action Strings

**Severity**: MEDIUM
**Affected Languages**: All
**Impact**: 35+ instances of duplicate save/cancel/delete strings

#### Current Implementation (BAD)

```json
// ❌ BAD - "Save" repeated 7+ times
{
  "buttons": {
    "save": "Save"
  },
  "common": {
    "save": ""  // ← Empty!
  },
  "addContact": {
    "labels": {
      "save": "Save Contact"
    }
  },
  "editContact": {
    "labels": {
      "save": "Save Changes"
    }
  },
  "addInteraction": {
    "labels": {
      "save": "Save"
    }
  },
  "addEvent": {
    "labels": {
      "save": "Save"
    }
  }
}
```

**Problems**:
1. "Save" duplicated 7 times across namespaces
2. `common.save` is empty (unused)
3. Some use generic "Save", others use contextual "Save Contact"
4. Translators must translate "Save" 7 times (inconsistency risk)

#### Recommended Fix (GOOD)

**Option A: Use nesting references** (i18next `$t()` syntax)
```json
{
  "common": {
    "actions": {
      "save": "Save",
      "saveChanges": "Save Changes",
      "cancel": "Cancel",
      "delete": "Delete"
    }
  },
  "addContact": {
    "labels": {
      "save": "$t(common.actions.save)"  // ← Reference!
    }
  },
  "editContact": {
    "labels": {
      "save": "$t(common.actions.saveChanges)"  // ← Reference!
    }
  }
}
```

**Option B: Use common namespace directly in code**
```javascript
// ❌ OLD
<Button onPress={handleSave}>{t('addContact.labels.save')}</Button>

// ✅ NEW
<Button onPress={handleSave}>{t('common.actions.save')}</Button>
```

**Recommendation**: Use **Option B** (change code to use common namespace)
- Cleaner structure
- Easier to maintain
- Reduced translation file size
- Less nesting references (better for PO conversion)

---

### ❌ Violation 4.2: Duplicate Error Titles

**Severity**: LOW
**Affected Languages**: All
**Impact**: 15+ instances of "Error" title

#### Current Implementation (BAD)

```json
{
  "settings": {
    "errors": {
      "biometricToggle": {
        "title": "Error",  // ← Repeated 10+ times
        "message": "Unable to update biometric setting..."
      },
      "autoLockToggle": {
        "title": "Error",  // ← Duplicate
        "message": "Unable to update auto-lock setting..."
      }
      // ... 8 more with "title": "Error"
    }
  },
  "companies": {
    "add": {
      "error": {
        "title": "Error",  // ← Duplicate
        "message": "Failed to create company"
      }
    }
  }
}
```

#### Recommended Fix (GOOD)

```json
{
  "common": {
    "errors": {
      "genericTitle": "Error",
      "successTitle": "Success",
      "warningTitle": "Warning"
    }
  },
  "settings": {
    "errors": {
      "biometricToggle": {
        "title": "$t(common.errors.genericTitle)",
        "message": "Unable to update biometric setting..."
      }
    }
  }
}
```

**OR** (simpler - use in code):
```javascript
// ✅ Use common error title directly
showAlert.error(
  t('common.errors.genericTitle'),  // "Error"
  t('settings.errors.biometricToggle.message')
);
```

---

## 5. Missing Context

### ❌ Violation 5.1: No Developer Comments

**Severity**: HIGH
**Affected Languages**: All
**Impact**: 203 keys with NO context for translators

#### Problem
Translators see:
```json
"contact.jobAtCompany": "{{job}} at {{company}}"
```

**Without context, they don't know**:
- What are `{{job}}` and `{{company}}`? (variable types)
- Where is this displayed? (UI location)
- Are there character limits? (constraints)
- Can word order change? (flexibility)
- What's an example? (sample data)

#### Recommended Fix (GOOD)

When converting to PO format, add **developer comments** to EVERY key:

```po
#. Displayed on contact cards and contact detail screen.
#. Shows contact's job title and company name together.
#. Variables: {{job}} = job title (e.g., "Software Engineer"), {{company}} = company name (e.g., "Google")
#. Character limit: ~50 characters
#. IMPORTANT: Word order must be adjusted for your language!
#: src/components/ContactCard.js:28
#: src/screens/ContactDetailScreen.js:42
msgid "contact.jobAtCompany"
msgstr "{{job}} at {{company}}"
```

**Comment template**:
1. **Where**: UI location (screen, component)
2. **What**: Purpose of the string
3. **Variables**: Explain each `{{variable}}`
4. **Examples**: Sample values
5. **Constraints**: Character limits, tone, special requirements
6. **Notes**: Word order, cultural considerations

---

### ❌ Violation 5.2: Ambiguous Keys

**Severity**: MEDIUM
**Affected Languages**: All
**Impact**: 5+ instances

#### Examples

```json
"labels.call": "Call"
```
**Ambiguous**: Is this:
- Verb: "Call John" (action button)
- Noun: "Call from John" (interaction type)
- Both?

```json
"labels.text": "Text"
```
**Ambiguous**:
- Verb: "Text John"
- Noun: "Text message"
- Noun: "Text (vs. other content types)"

```json
"common.all": "All"
```
**Ambiguous**:
- Adjective: "All contacts"
- Filter option: "Show all"
- Quantifier: "All items selected"

#### Recommended Fix (GOOD)

**Option A: Split ambiguous keys**
```json
{
  "actions": {
    "call": "Call",  // Verb
    "sendText": "Text"  // Verb
  },
  "labels": {
    "callType": "Call",  // Noun (interaction type)
    "textMessageType": "Text",  // Noun
    "selectAll": "All"  // Filter option
  }
}
```

**Option B: Add developer comments** (for PO file)
```po
#. VERB - Action button to initiate a phone call
#. Example: "Call John" button
msgid "actions.call"
msgstr "Call"

#. NOUN - Interaction type label for phone calls
#. Example: "Type: Call" in interaction list
msgid "labels.callType"
msgstr "Call"
```

---

## 6. Hard-coded Strings

### ❌ Violation 6.1: Feature Flags with Hard-coded English

**Severity**: LOW
**Affected Languages**: None (English-only feature)
**Impact**: 2 instances (company management feature toggle)

#### Location
```
Features: settings.features.companyManagement.enabled/disabled
```

#### Current Implementation

```json
{
  "settings": {
    "features": {
      "companyManagement": {
        "enabled": "Company management enabled. Restart the app to see the Companies tab.",
        "disabled": "Company management disabled."
      }
    }
  }
}
```

**Status**: ✅ Already properly structured for translation
**Note**: These ARE in translation files, just need to be translated

---

### ✅ No Other Hard-coded Strings Found

**Good news**: Grep analysis found no hard-coded UI strings in code. All display text uses `t()` function.

---

## 7. Inconsistent Structure

### ❌ Violation 7.1: Inconsistent Empty Values

**Severity**: LOW
**Affected Languages**: All
**Impact**: 23 keys (incomplete features)

#### Current Implementation (BAD)

```json
{
  "common": {
    "all": "All",
    "cancel": "",  // ❌ Empty!
    "save": "",    // ❌ Empty!
    "none": "None"
  },
  "filters": {
    "title": "",  // ❌ Empty!
    "categories": "",
    "categoryLogic": "",
    // ... all 14 keys empty
  },
  "savedSearches": {
    "title": "",  // ❌ Empty!
    // ... all 9 keys empty
  }
}
```

**Problems**:
1. `common.cancel` and `common.save` are empty, but `buttons.cancel` and `buttons.save` have values
2. Entire namespaces (`filters`, `savedSearches`) have empty values
3. Inconsistent: some languages have values, others don't (e.g., Spanish has some filter translations)

#### Recommended Fix (GOOD)

**For `common.*` namespace**:
```json
{
  "common": {
    "all": "All",
    "cancel": "Cancel",  // ✅ Fill from buttons.cancel
    "save": "Save",      // ✅ Fill from buttons.save
    "none": "None"
  }
}
```

**For incomplete features** (`filters`, `savedSearches`):

**Option A**: Remove empty keys until feature is complete
```json
// Remove entire namespace until implemented
// (Prevents translation errors)
```

**Option B**: Fill with placeholder values and mark as TODO
```json
{
  "filters": {
    "title": "Filters",  // TODO: Implement filters feature
    "categories": "Categories",
    // ...
  }
}
```

**Recommendation**: Use **Option A** - remove incomplete features from translation files until they're implemented.

---

### ❌ Violation 7.2: Inconsistent Nesting Depth

**Severity**: LOW
**Affected Languages**: All
**Impact**: Organizational issue

#### Current State

**Shallow nesting** (2 levels):
```json
"buttons.save": "Save"
"labels.call": "Call"
```

**Deep nesting** (4 levels):
```json
"settings.errors.biometricToggle.title": "Error"
```

**Inconsistent placement**:
- Action buttons in: `buttons.*`, `common.*`, `{section}.labels.*`
- States in: `labels.*`, `dashboard.*`, various sections
- Errors in: `settings.errors.*`, `{section}.error.*`, `{section}.errors.*`

#### Recommended Fix (GOOD)

**Standardize to 2-3 levels maximum**:

```json
{
  "common": {
    "actions": { "save": "Save", "cancel": "Cancel" },
    "states": { "loading": "Loading...", "error": "Error" },
    "entities": { "contact": "Contact", "interaction": "Interaction" }
  },
  "settings": {
    "errors": {
      "biometric": "Unable to update biometric setting",  // Remove nested .title/.message
      "autoLock": "Unable to update auto-lock setting"
    }
  }
}
```

**Pattern**: `{section}.{category}.{item}` (max 3 levels)

---

## Summary of Violations

| # | Violation | Severity | Instances | Priority |
|---|-----------|----------|-----------|----------|
| 1.1 | Hard-coded plurals in code | HIGH | 1 | 🔴 P0 |
| 1.2 | Missing plural keys | HIGH | 12+ | 🔴 P0 |
| 1.3 | Inconsistent plural implementation | MEDIUM | 1 | 🟡 P1 |
| 2.1 | Hard-coded "X at Y" pattern | HIGH | 2 | 🔴 P0 |
| 2.2 | Possessive word order | MEDIUM | 5 | 🟡 P1 |
| 2.3 | Verb tense in titles | MEDIUM | 2 | 🟡 P1 |
| 2.4 | Missing measure words (Chinese) | HIGH | 8+ | 🔴 P0 |
| 4.1 | Duplicate action strings | MEDIUM | 35+ | 🟡 P1 |
| 4.2 | Duplicate error titles | LOW | 15+ | 🟢 P2 |
| 5.1 | No developer comments | HIGH | 203 | 🔴 P0 |
| 5.2 | Ambiguous keys | MEDIUM | 5+ | 🟡 P1 |
| 7.1 | Inconsistent empty values | LOW | 23 | 🟢 P2 |
| 7.2 | Inconsistent nesting depth | LOW | All | 🟢 P2 |

**Priority Levels**:
- 🔴 **P0 (Critical)**: Fix during Phase 3-5 (PO conversion + code refactor)
- 🟡 **P1 (Important)**: Fix during Phase 2-3 (new structure design)
- 🟢 **P2 (Nice-to-have)**: Fix during Phase 6 (cleanup)

---

## Action Plan by Phase

### Phase 2: Design New Structure
- ✅ Fix Violation 4.1: Create `common.actions` namespace
- ✅ Fix Violation 4.2: Create `common.errors` namespace
- ✅ Fix Violation 7.1: Remove empty keys for incomplete features
- ✅ Fix Violation 7.2: Standardize nesting to 2-3 levels
- ✅ Design proper pluralization structure (all keys)

### Phase 3: Convert JSON → PO
- ✅ Fix Violation 5.1: Add developer comments to ALL keys
- ✅ Fix Violation 5.2: Add disambiguation notes for ambiguous keys
- ✅ Add pluralization support (_one/_other suffixes)
- ✅ Add word-order notes for interpolated strings
- ✅ Add measure word notes for Chinese

### Phase 4: Update Codebase
- ✅ Fix Violation 1.1: Replace plural concatenation with `t()` + count
- ✅ Fix Violation 2.1: Replace job+company concatenation with `t()` + interpolation
- ✅ Update code to use `common.actions.*` instead of duplicate keys
- ✅ Add pluralization to all count displays (12+ instances)

### Phase 5: Translation Updates
- ✅ Fix Violation 1.3: Complete plural forms for German/Chinese
- ✅ Fix Violation 2.4: Add measure words to Chinese translations
- ✅ Translate English-only features (analytics, proximity) to all languages

---

**Report Generated**: 2025-11-27
**Next Report**: GLOSSARY_TERMS.md (Phase 1.3)
