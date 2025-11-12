# Localization Implementation Analysis

**Date**: November 11, 2025
**Branch**: `feat/localization`
**Status**: Analysis Complete

---

## Executive Summary

Your CRM app's localization implementation is **mostly aligned** with Expo's 2025 recommendations, with a few key differences:

✅ **What You're Doing Right:**
- Using `expo-localization` for device locale detection
- Using `react-i18next` (modern successor to `i18n-js`)
- Proper fallback language configuration
- Config plugin setup in app.json
- 5 languages supported (en, es, de, fr, zh-Hans)
- Organized locale files in JSON format

⚠️ **Key Differences from Expo Docs:**
- **Expo docs recommend `i18n-js`** (simpler, lighter)
- **You're using `react-i18next`** (more powerful, widely adopted)
- This is actually a **smart choice** for future scalability!

---

## Comparison: Your Implementation vs Expo Recommendations

### 1. Library Choice

#### Expo Documentation (localization.md)
```javascript
// Uses i18n-js (older, simpler)
import { I18n } from 'i18n-js';

const i18n = new I18n({
  en: { welcome: 'Hello' },
  ja: { welcome: 'こんにちは' },
});

i18n.locale = getLocales()[0].languageCode;
i18n.enableFallback = true;
```

#### Your Implementation
```javascript
// Uses react-i18next (modern, more features)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      // ...
    },
    lng: deviceLang,
    fallbackLng: 'en',
    // ...
  });
```

**Verdict**: ✅ **Your choice is better for production apps**

### 2. Locale Detection

#### Expo Recommendation
```javascript
import { getLocales } from 'expo-localization';
const deviceLanguage = getLocales()[0].languageCode;
```

#### Your Implementation
```javascript
import { getPrimaryLocale } from '../utils/dateUtils';
const deviceLocale = getPrimaryLocale();
const deviceLang = deviceLocale.split('-')[0];
```

**Verdict**: ⚠️ **Should verify `getPrimaryLocale()` uses `expo-localization`**

### 3. Config Plugin Setup

#### Expo Recommendation
```json
{
  "expo": {
    "plugins": ["expo-localization"]
  }
}
```

#### Your Implementation
```json
{
  "expo": {
    "plugins": [
      "expo-secure-store",
      "expo-localization",
      "expo-sqlite"
    ]
  }
}
```

**Verdict**: ✅ **Correct**

### 4. Supported Locales Declaration

#### Expo Recommendation (for per-app language selection)
```json
{
  "expo": {
    "plugins": [
      [
        "expo-localization",
        {
          "supportedLocales": {
            "ios": ["en", "ja"],
            "android": ["en", "ja"]
          }
        }
      ]
    ]
  }
}
```

#### Your Implementation
```json
{
  "expo": {
    "plugins": ["expo-localization"]
  }
}
```

**Verdict**: ⚠️ **Missing `supportedLocales` configuration** - Users can't select app language in system settings

---

## Recommendations

### 1. Add Supported Locales Declaration

**Why**: Enable per-app language selection in iOS/Android system settings

**How**: Update [app.json](../test-fresh/app.json:28-32):

```json
{
  "expo": {
    "plugins": [
      "expo-secure-store",
      [
        "expo-localization",
        {
          "supportedLocales": {
            "ios": ["en", "es", "de", "fr", "zh"],
            "android": ["en", "es", "de", "fr", "zh-Hans"]
          }
        }
      ],
      "expo-sqlite"
    ]
  }
}
```

**Impact**:
- Users can select CRM language in Settings → Apps → CRM → Language (iOS/Android 13+)
- Follows platform best practices
- No custom language picker needed in app

### 2. Verify `getPrimaryLocale()` Implementation

**Current**: Using custom [dateUtils.js](../test-fresh/src/utils/dateUtils.js) helper

**Should verify**:
```javascript
// dateUtils.js should use expo-localization
import { getLocales } from 'expo-localization';

export function getPrimaryLocale() {
  const locales = getLocales();
  return locales[0]?.languageTag || 'en-US';
}
```

**Action**: Check if this is already the case (likely it is)

### 3. Consider i18next-scanner for Weblate Integration

**Why**: Extract translation keys automatically from code

**Install**:
```bash
npm install --save-dev i18next-scanner
```

**Setup** (i18next-scanner.config.js):
```javascript
module.exports = {
  input: [
    'src/**/*.{js,jsx}',
    '!src/locales/**',
    '!**/node_modules/**',
  ],
  output: './',
  options: {
    debug: false,
    func: {
      list: ['t'],
      extensions: ['.js', '.jsx'],
    },
    lngs: ['en', 'es', 'de', 'fr', 'zh'],
    ns: ['translation'],
    defaultLng: 'en',
    defaultNs: 'translation',
    resource: {
      loadPath: 'src/locales/{{lng}}.json',
      savePath: 'src/locales/{{lng}}.json',
      jsonIndent: 2,
    },
  },
};
```

**Usage**:
```bash
# Extract keys from code → update JSON files
npx i18next-scanner
```

---

## Weblate Integration Plan

### Overview

**Weblate** is a web-based continuous localization platform that:
- Provides web UI for translators (no Git knowledge needed)
- Syncs bidirectionally with GitHub
- Supports i18next JSON format natively
- Can auto-create PRs when translations are updated
- Free hosted tier available at [weblate.org](https://weblate.org)

### Prerequisites

✅ You already have:
- [x] i18next JSON files in `src/locales/`
- [x] react-i18next setup
- [x] GitHub repository

### Setup Steps

#### Step 1: Prepare Your Repository

1. **Add i18next-scanner** (see Recommendation #3 above)

2. **Create `.weblate` configuration** (optional, for advanced settings):
```yaml
# .weblate
[weblate]
url = https://hosted.weblate.org/
translation_component = crm-orbit

[files]
base = src/locales/en.json
template = src/locales/en.json
```

3. **Add translation extraction script** to [package.json](../test-fresh/package.json:5-12):
```json
{
  "scripts": {
    "i18n:extract": "i18next-scanner",
    "i18n:missing": "i18next-scanner --config i18next-scanner.config.js"
  }
}
```

#### Step 2: Configure Weblate Project

1. **Sign up** at [hosted.weblate.org](https://hosted.weblate.org) (free for open source)

2. **Create new project**: "Expo CRM"

3. **Add component**: "Mobile App"
   - **Source code repository**: `https://github.com/Masked-Kunsiquat/crm-orbit2.git`
   - **Repository branch**: `master` (or `main`)
   - **File mask**: `test-fresh/src/locales/*.json`
   - **Base file**: `test-fresh/src/locales/en.json`
   - **File format**: "i18next JSON file"
   - **Source language**: English
   - **Translation languages**: Spanish, German, French, Chinese (Simplified)

4. **Enable GitHub integration**:
   - Settings → Addons → Enable "GitHub pull requests"
   - Settings → Version control → Push on commit: ✅
   - Settings → Version control → Push branch: `l10n_master`

#### Step 3: GitHub Webhook Setup

1. Go to GitHub repo → Settings → Webhooks → Add webhook
   - **Payload URL**: `https://hosted.weblate.org/hooks/github/` (provided by Weblate)
   - **Content type**: `application/json`
   - **Secret**: (from Weblate settings)
   - **Events**: Just the push event

#### Step 4: GitHub Actions (Optional Auto-Merge)

Create `.github/workflows/weblate-merge.yml`:
```yaml
name: Weblate Merge

on:
  pull_request:
    branches:
      - master
    paths:
      - 'test-fresh/src/locales/*.json'

jobs:
  auto-merge:
    if: github.actor == 'weblate'
    runs-on: ubuntu-latest
    steps:
      - name: Approve and merge Weblate PR
        uses: actions/github-script@v6
        with:
          script: |
            await github.rest.pulls.merge({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.payload.pull_request.number,
              merge_method: 'squash'
            });
```

### Workflow After Setup

1. **Developer adds new feature** with `t('new.translation.key')`
2. **Run extraction**: `npm run i18n:extract` → Updates `en.json` with placeholder
3. **Commit & push** to GitHub
4. **Weblate detects change** via webhook
5. **Translators translate** in Weblate web UI
6. **Weblate commits** translations to branch `l10n_master`
7. **Weblate creates PR** automatically
8. **Review & merge** PR (or auto-merge via GitHub Actions)

### Translation Coverage Tracking

Weblate provides:
- **Translation percentage** per language
- **Missing string reports**
- **Translation quality checks** (formatting, placeholders, etc.)
- **Glossary/terminology management**
- **Translation memory** (reuse across projects)

Example view: `https://hosted.weblate.org/projects/expo-crm/mobile-app/`

---

## Current Translation Status

### Files
```
src/locales/
├── en.json       12,087 bytes (baseline)
├── es.json       12,943 bytes (+7%)
├── de.json       13,362 bytes (+11%)
├── fr.json       13,499 bytes (+12%)
└── zh-Hans.json  11,719 bytes (-3%)
```

### Coverage Analysis Needed

To check translation completeness, run:
```bash
# Count keys in each file
for lang in en es de fr zh-Hans; do
  echo "$lang: $(cat src/locales/$lang.json | jq 'paths | length')"
done
```

**Action Item**: Run this to identify missing translations

---

## Benefits of Weblate Integration

### For Development Team
✅ **Automated workflow** - No manual JSON editing
✅ **Continuous sync** - Translations stay up-to-date with code
✅ **Quality checks** - Catch formatting errors, missing placeholders
✅ **Track progress** - Visual dashboard of translation coverage

### For Translators
✅ **Web interface** - No Git/JSON knowledge required
✅ **Context** - See where strings are used in app
✅ **Consistency** - Translation memory suggests previous translations
✅ **Collaboration** - Multiple translators can work simultaneously

### For Users
✅ **More languages** - Easier to add community translations
✅ **Better quality** - Professional translator-friendly tools
✅ **Faster updates** - New features get translated quickly

---

## Action Items

### Immediate (This PR)
- [ ] Add `supportedLocales` to [app.json](../test-fresh/app.json)
- [ ] Verify [getPrimaryLocale()](../test-fresh/src/utils/dateUtils.js) uses `expo-localization`
- [ ] Run coverage analysis to find missing translations

### Short Term (Next PR)
- [ ] Install `i18next-scanner`
- [ ] Create scanner config
- [ ] Run initial extraction
- [ ] Document translation key naming conventions

### Medium Term (Separate Project)
- [ ] Set up Weblate account
- [ ] Configure GitHub integration
- [ ] Create translator documentation
- [ ] Test full workflow with a sample translation

---

## Resources

### Official Documentation
- [Expo Localization Guide](https://docs.expo.dev/guides/localization/)
- [expo-localization API](https://docs.expo.dev/versions/latest/sdk/localization/)
- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Guide](https://react.i18next.com/)
- [Weblate i18next Format](https://docs.weblate.org/en/latest/formats/i18next.html)

### Tutorials
- [Continuous Translation with Weblate and i18next](https://alcalyn.github.io/set-up-continuous-translation-i18next-weblate/)
- [React Native Localization Best Practices 2025](https://www.autolocalise.com/blog/react-native-expo-localization-best-practice)

---

## Conclusion

Your localization setup is **solid and production-ready**. The choice of `react-i18next` over Expo's recommended `i18n-js` is actually **advantageous** for:
- Better ecosystem support
- More translation management tools (like Weblate)
- Richer feature set (context, plurals, interpolation)

**Primary gap**: Missing `supportedLocales` declaration for per-app language selection.

**Weblate integration** would be a natural next step to:
- Scale translation efforts
- Enable community contributions
- Maintain translation quality
- Track coverage systematically

Recommend proceeding with:
1. Fix `supportedLocales` (this PR)
2. Set up `i18next-scanner` (next PR)
3. Pilot Weblate integration (separate initiative)
