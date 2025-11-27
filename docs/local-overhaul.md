# Complete i18n Overhaul Gameplan for Claude Code

## 🎯 Goals
1. **Switch from JSON → Monolingual PO** (better plurals, context, industry standard)
2. **Implement i18next best practices** (nesting, proper plurals, fix word-order issues)
3. **Create TBX glossary** (domain-specific terms with explanations)
4. **Preserve 95% translation progress** (no data loss)

---

## 📋 Phase 1: Audit Current State

### 1.1 Inventory Current Translations
**Action:** Analyze all 5 JSON files

**What to document:**
- Total key count
- Keys by category (navigation, settings, contacts, etc.)
- Duplicate strings (candidates for nesting)
- Count-based text (needs pluralization)
- String concatenation patterns (word-order issues)
- Domain-specific terms (glossary candidates)

**Output:** `docs/i18n/AUDIT_REPORT.md`

---

### 1.2 Identify Best Practice Violations

**Find and document:**

**Pluralization issues:**
```javascript
// BAD - found in code
{contacts.length === 1 ? '1 contact' : `${contacts.length} contacts`}

// Should use
t('common.contact', { count: contacts.length })
```

**Word-order issues:**
```javascript
// BAD - in ContactCard.js and ContactDetailScreen.js
`${job} at ${company}`

// Should use
t('contact.jobAtCompany', { job, company })
```

**Duplication:**
```json
// Appears in 10+ places
"save": "Save",
"cancel": "Cancel"
```

**Output:** `docs/i18n/VIOLATIONS.md`

---

### 1.3 Identify Glossary Terms

**Look for:**
- Domain-specific terms: CRM, Dashboard, Interaction, Contact, Event
- Ambiguous words: Open (verb vs adjective), Contact (noun vs verb)
- Brand names: Orbit (app name)
- Technical terms with specific meaning in your app
- Terms that need consistent translation

**Output:** `docs/i18n/GLOSSARY_TERMS.md`

---

## 📝 Phase 2: Design New Structure

### 2.1 Create Improved Key Structure

**Design new JSON structure with:**

**Common reusable elements:**
```json
{
  "common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit",
      "add": "Add",
      "close": "Close",
      "confirm": "Confirm"
    },
    "states": {
      "loading": "Loading...",
      "error": "Error",
      "success": "Success"
    },
    "counts": {
      "contact": "{{count}} contact",
      "interaction": "{{count}} interaction",
      "event": "{{count}} event",
      "result": "{{count}} result",
      "item": "{{count}} item"
    }
  }
}
```

**Proper interpolation templates:**
```json
{
  "contact": {
    "jobAtCompany": "{{job}} at {{company}}",
    "jobOnly": "{{job}}",
    "companyOnly": "{{company}}"
  }
}
```

**With nesting references:**
```json
{
  "modals": {
    "addContact": {
      "title": "Add Contact",
      "submit": "$t(common.actions.save)",
      "cancel": "$t(common.actions.cancel)"
    }
  }
}
```

**Output:** `locales/NEW_STRUCTURE.json`

---

### 2.2 Map Old Keys → New Keys

**Create migration mapping:**
```json
{
  "migrations": {
    "modals.addContact.save": "common.actions.save",
    "modals.editContact.save": "common.actions.save",
    "settings.save": "common.actions.save"
  }
}
```

**Output:** `locales/KEY_MIGRATION_MAP.json`

---

### 2.3 Design Developer Comments

**For each key, prepare context:**
```javascript
{
  "contact.jobAtCompany": {
    "comment": [
      "Displayed on contact cards and contact detail screen.",
      "Shows contact's job title and company name together.",
      "Variables: {{job}} = job title (e.g., 'Software Engineer'), {{company}} = company name (e.g., 'Acme Corp')",
      "IMPORTANT: Word order must be adjusted for your language!",
      "English: 'Software Engineer at Google'",
      "Chinese may prefer: 'Google的Software Engineer' (company first)"
    ],
    "locations": [
      "src/components/ContactCard.js:25",
      "src/screens/ContactDetailScreen.js:42"
    ]
  }
}
```

**Output:** `locales/DEVELOPER_COMMENTS.json`

---

## 🔄 Phase 3: Generate PO Files

### 3.1 Convert JSON → PO with Enhancements

**Script logic:**
```javascript
// scripts/convert-to-po.js

// For each language:
// 1. Load current JSON
// 2. Apply NEW_STRUCTURE (with key migrations)
// 3. Convert plurals: _one/_other → msgstr[0]/msgstr[1]
// 4. Add developer comments from DEVELOPER_COMMENTS.json
// 5. Write monolingual PO file
```

**Example output (en.po):**
```po
# Orbit CRM - English Translations
msgid ""
msgstr ""
"Language: en\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=UTF-8\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\n"

#. Generic save button used throughout the app
#. Appears on: Add/Edit modals, Settings, Profile
#. Character limit: ~12 characters
#: src/components/AddContactModal.js:45
#: src/components/EditContactModal.js:38
msgid "common.actions.save"
msgstr "Save"

#. Displayed on contact cards and contact detail screen
#. Shows contact's job title and company name together
#. Variables: {{job}} = job title, {{company}} = company name
#. IMPORTANT: Word order must be adjusted for your language!
#: src/components/ContactCard.js:25
#: src/screens/ContactDetailScreen.js:42
msgid "contact.jobAtCompany"
msgstr "{{job}} at {{company}}"

#. Contact count display
#. Used in: Contact list header, search results, stats
msgid "common.counts.contact"
msgid_plural "common.counts.contact"
msgstr[0] "{{count}} contact"
msgstr[1] "{{count}} contacts"
```

**Output:** 
- `locales/en.po`
- `locales/es.po`
- `locales/de.po`
- `locales/fr.po`
- `locales/zh-Hans.po`

---

### 3.2 Validate PO Files

**Checks:**
```bash
# Syntax validation
msgfmt -c -o /dev/null locales/en.po
msgfmt -c -o /dev/null locales/es.po
# ... for all languages

# Key count verification
# Ensure all 5 PO files have same number of msgid entries

# Translation preservation check
# Compare translation counts: JSON vs PO
```

**Output:** `docs/i18n/VALIDATION_REPORT.md`

---

## 🗂️ Phase 4: Create Glossary

### 4.1 Generate TBX Glossary File

**Create `locales/glossary.tbx`:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE martif PUBLIC "ISO 12200:1999A//DTD MARTIF core (DXFcdV04)//EN" "TBXcdv04.dtd">
<martif type="TBX" xml:lang="en">
  <martifHeader>
    <fileDesc>
      <sourceDesc>
        <p>Orbit CRM Glossary</p>
      </sourceDesc>
    </fileDesc>
  </martifHeader>
  <text>
    <body>
      <!-- CRM -->
      <termEntry>
        <descrip>Customer Relationship Management - the type of software. Keep as acronym in all languages.</descrip>
        <langSet xml:lang="en">
          <tig>
            <term>CRM</term>
          </tig>
        </langSet>
        <langSet xml:lang="es">
          <tig>
            <term>CRM</term>
          </tig>
        </langSet>
        <langSet xml:lang="de">
          <tig>
            <term>CRM</term>
          </tig>
        </langSet>
        <langSet xml:lang="fr">
          <tig>
            <term>CRM</term>
          </tig>
        </langSet>
        <langSet xml:lang="zh-Hans">
          <tig>
            <term>CRM</term>
          </tig>
        </langSet>
      </termEntry>

      <!-- Contact (noun) -->
      <termEntry>
        <descrip>A person in your contact list (noun). Not the verb "to contact someone". Refers to individuals you track relationships with.</descrip>
        <langSet xml:lang="en">
          <tig>
            <term>Contact</term>
          </tig>
        </langSet>
        <langSet xml:lang="es">
          <tig>
            <term>Contacto</term>
          </tig>
        </langSet>
      </termEntry>

      <!-- Interaction -->
      <termEntry>
        <descrip>A logged communication with a contact: call, text, email, or meeting. Specifically a tracked event in the app, not a general interaction.</descrip>
        <langSet xml:lang="en">
          <tig>
            <term>Interaction</term>
          </tig>
        </langSet>
        <langSet xml:lang="es">
          <tig>
            <term>Interacción</term>
          </tig>
        </langSet>
      </termEntry>

      <!-- Dashboard -->
      <termEntry>
        <descrip>Main landing page or home screen. Shows overview of contacts and recent activity. Primary navigation hub.</descrip>
        <langSet xml:lang="en">
          <tig>
            <term>Dashboard</term>
          </tig>
        </langSet>
        <langSet xml:lang="es">
          <tig>
            <term>Panel de control</term>
          </tig>
        </langSet>
      </termEntry>

      <!-- Add 10-20 more key terms -->
    </body>
  </text>
</martif>
```

**Key terms to include:**
- CRM
- Contact (noun)
- Interaction
- Event
- Dashboard
- Category
- Swipe Actions
- PIN (authentication)
- Biometric
- Settings
- Navigation
- Favorite/Starred
- Archive

**Output:** `locales/glossary.tbx`

---

## 💻 Phase 5: Update Codebase

### 5.1 Fix Word-Order Issues

**Find and replace:**

**ContactCard.js:**
```javascript
// BEFORE
const line = job && companyName 
  ? `${job} at ${companyName}` 
  : (job || companyName);

// AFTER
const line = job && companyName 
  ? t('contact.jobAtCompany', { job, company: companyName })
  : job 
    ? t('contact.jobOnly', { job })
    : t('contact.companyOnly', { company: companyName });
```

**ContactDetailScreen.js:** (same pattern)

**Output:** Updated component files

---

### 5.2 Convert Plural Logic

**Find patterns like:**
```javascript
{count === 1 ? '1 contact' : `${count} contacts`}
```

**Replace with:**
```javascript
{t('common.counts.contact', { count })}
```

**Files to update:**
- ContactsList.js
- InteractionsScreen.js
- EventsList.js
- Any stats/summary displays

**Output:** Updated component/screen files

---

### 5.3 Apply Nesting for Repeated Strings

**Replace direct translation keys with nested ones:**

```javascript
// BEFORE
<Button onPress={handleSave}>{t('modals.addContact.save')}</Button>
<Button onPress={onClose}>{t('modals.addContact.cancel')}</Button>

// AFTER
<Button onPress={handleSave}>{t('common.actions.save')}</Button>
<Button onPress={onClose}>{t('common.actions.cancel')}</Button>
```

**Apply to:**
- All modal components
- Settings screens
- Form submissions

**Output:** Updated component files

---

### 5.4 Update i18n Configuration

**Option A: Build-time PO → JSON conversion (Recommended for React Native)**

```javascript
// scripts/po-to-json.js
// Converts PO files to JSON at build time
// Keeps bundle small, runtime stays the same

import { po2json } from 'gettext-parser';
import fs from 'fs';

const languages = ['en', 'es', 'de', 'fr', 'zh-Hans'];

languages.forEach(lang => {
  const poContent = fs.readFileSync(`src/locales/${lang}.po`, 'utf8');
  const parsed = po2json(poContent);
  
  // Convert to i18next JSON format
  const i18nextFormat = convertToI18nextFormat(parsed);
  
  fs.writeFileSync(
    `src/locales/${lang}.json`,
    JSON.stringify(i18nextFormat, null, 2)
  );
});
```

**Add to package.json:**
```json
{
  "scripts": {
    "prebuild": "node scripts/po-to-json.js",
    "prestart": "node scripts/po-to-json.js"
  }
}
```

**Keep i18n/index.js mostly the same:**
```javascript
// src/i18n/index.js - stays almost identical
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getPrimaryLocale } from '../utils/dateUtils';

// Still import JSON (generated from PO)
import en from '../locales/en.json';
import es from '../locales/es.json';
// ... etc

// Rest stays the same
```

**Output:** 
- `scripts/po-to-json.js`
- Updated `package.json`

---

## 🚀 Phase 6: Deploy to Weblate

### 6.1 Backup Current Translations

```bash
# Download from Weblate as safety net
# Files → Download → ZIP of all languages
```

**Output:** `backups/weblate-json-backup-YYYY-MM-DD.zip`

---

### 6.2 Delete Existing Glossary in Weblate

**Steps:**
1. Go to your glossary component in Weblate
2. Settings → Removal
3. Delete the component
4. (You'll recreate it properly with TBX)

---

### 6.3 Push PO Files to Repo

```bash
# Commit new structure
git add src/locales/*.po
git add locales/glossary.tbx
git add scripts/po-to-json.js
git add docs/i18n/

git commit -m "Migrate to monolingual PO format with best practices

- Convert JSON to PO format with developer comments
- Implement nesting for common strings (save, cancel, etc)
- Add proper pluralization support
- Fix word-order issues (job/company display)
- Create TBX glossary with domain-specific terms
- Add build-time PO→JSON conversion script
"

git push
```

---

### 6.4 Update Main Translation Component in Weblate

**Component Settings:**
- File format: `i18next JSON` → `gettext PO file (monolingual)`
- File mask: `src/locales/*.json` → `src/locales/*.po`
- Monolingual base language file: `src/locales/en.po`
- Template for new translations: (leave empty)

**Save and trigger update:**
- Repository → Update from Git

**Verify:**
- Check translation percentages match (~95%)
- Spot-check 5-10 strings
- Developer comments visible to translators

---

### 6.5 Create Glossary Component

**Add new component:**
- Name: "Glossary"
- File mask: `locales/glossary.tbx`
- File format: `TermBase eXchange format`
- ✅ **Enable "Use as a glossary"**

**Save and verify:**
- Glossary terms appear in sidebar when translating main component
- Explanations visible

---

## ✅ Phase 7: Testing & Validation

### 7.1 Local Testing

```bash
# Install dependencies
npm install

# Build (runs po-to-json script)
npm run prebuild

# Start app
npm start
```

**Test checklist:**
- [ ] App builds successfully
- [ ] All 5 languages load
- [ ] Language switching works
- [ ] Plurals work (test with 0, 1, 2, 10 items)
- [ ] Nesting works (action buttons show correct labels)
- [ ] Word order looks natural in all languages
- [ ] No missing translation warnings

---

### 7.2 Weblate Testing

**As translator:**
- [ ] Developer comments visible
- [ ] Glossary terms show in sidebar
- [ ] Can add new translations
- [ ] Can edit existing translations

---

## 📦 Phase 8: Documentation

### 8.1 Update Project Docs

**README.md:**
```markdown
## Localization

Orbit uses gettext PO files for translations, managed via Weblate.

### File Structure
```
locales/
├── en.po              # English (source)
├── es.po              # Spanish
├── de.po              # German
├── fr.po              # French
├── zh-Hans.po         # Chinese Simplified
└── glossary.tbx       # Glossary terms
```

### Adding New Strings
1. Add to `locales/en.po` with developer comment
2. Use in code: `t('your.key.here')`
3. Run `npm run prebuild` to generate JSON
4. Push to repo - Weblate auto-syncs

### Developer Comments Format
```po
#. Brief description of where/how string is used
#. Character limits, tone, or special instructions
#. Variable explanations
msgid "your.key"
msgstr "Your translation"
```
```

**Output:** Updated `README.md`, new `docs/LOCALIZATION.md`

---

## 🧹 Phase 9: Cleanup

### 9.1 Remove Old JSON Files (After 1-2 Weeks)

```bash
# Once confident PO workflow is stable
git rm src/locales/en.json
git rm src/locales/es.json
git rm src/locales/de.json
git rm src/locales/fr.json
git rm src/locales/zh-Hans.json

git commit -m "Remove deprecated JSON locale files"
git push
```

---

## ⏱️ Time Estimates

- **Phase 1** (Audit): 2-3 hours
- **Phase 2** (Design): 2-3 hours
- **Phase 3** (Generate PO): 2-3 hours
- **Phase 4** (Glossary): 1-2 hours
- **Phase 5** (Update code): 3-4 hours
- **Phase 6** (Deploy): 1 hour
- **Phase 7** (Testing): 2 hours
- **Phase 8** (Docs): 1 hour

**Total: ~15-20 hours** (mostly automated)

---

## 🎯 Success Criteria

- ✅ All 5 PO files generated with 0 data loss
- ✅ Translation completion stays at ~95%
- ✅ App works with PO→JSON build step
- ✅ Glossary visible in Weblate sidebar
- ✅ Developer comments visible to translators
- ✅ Plurals work in all languages
- ✅ Nesting reduces key count by 20-30%
- ✅ No word-order issues remain
- ✅ All tests pass

---

## 🔄 Maintenance Workflow (Ongoing)

**When adding new strings:**
1. Add to `locales/en.po` with comment
2. Run `npm run prebuild`
3. Use in code
4. Push to Git
5. Weblate syncs automatically

**When adding glossary terms:**
1. Add to `locales/glossary.tbx`
2. Push to Git
3. Weblate syncs automatically