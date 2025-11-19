# Weblate Setup Guide

**Project**: CRM Orbit
**Date**: November 11, 2025
**Status**: Ready to Apply

---

## Pre-Application Checklist ✅

All Weblate libre hosting requirements have been met:

- [x] **Open-source license**: MIT License added
- [x] **Public repository**: github.com/Masked-Kunsiquat/crm-orbit2
- [x] **Translations in repo**: test-fresh/src/locales/*.json
- [x] **Active development**: 761+ commits over 2+ months
- [x] **README mentions Weblate**: Translation badges and contributing section added
- [x] **Reasonable contributions**: Active development visible
- [x] **Non-prohibited content**: Business CRM application

---

## Step-by-Step Setup

### Step 1: Sign Up for Weblate

1. Go to [https://hosted.weblate.org/](https://hosted.weblate.org/)
2. Click **"Sign Up"** (top right)
3. Create account with:
   - Email (or GitHub/GitLab OAuth)
   - Username
   - Password
4. Verify email address

### Step 2: Create a New Project

1. After login, click **"Add new translation project"** or go to Dashboard → **Start new translation**
2. Fill in project details:

```
Project name: CRM Orbit
Project slug: crm-orbit (will be used in URLs)
Project website: https://github.com/Masked-Kunsiquat/crm-orbit2
Instructions for translators: [optional - add context about the CRM app]

Translation process:
☑ Review all translations

Access control:
○ Public (recommended for open source)

Languages:
[x] English
[x] Spanish
[x] French
[x] German
[x] Chinese (Simplified)
```

3. Click **"Save"**

### Step 3: Add Translation Component

1. In your new **CRM Orbit** project, click **"Add new translation component"**
2. Configure component:

```
Component name: Mobile App
Component slug: mobile-app

Version control system: GitHub

Source code repository:
https://github.com/Masked-Kunsiquat/crm-orbit2.git

Repository branch: master

File mask:
test-fresh/src/locales/*.json

Template for new translations:
test-fresh/src/locales/en.json

File format:
i18next JSON file

Source language:
English

Translation languages:
[x] Spanish
[x] French
[x] German
[x] Chinese (Simplified)
```

3. Advanced settings (optional):
```
Language filter: ^(es|de|fr|zh)$
Translation flags: [leave default]
```

4. Click **"Save"**

### Step 4: Import Existing Translations

1. Weblate will automatically detect and import your existing translations from the repo
2. Wait for the import to complete (may take 1-2 minutes)
3. Verify in the component dashboard:
   - English: 269/269 (100%) - Base language
   - Spanish: 269/269 (100%)
   - German: 269/269 (100%)
   - French: 269/269 (100%)
   - Chinese (Simplified): 269/269 (100%)

### Step 5: Enable GitHub Integration

#### 5a. Configure Repository Push

1. Go to component settings → **Version control**
2. Enable:
   - ☑ **Push on commit** - Push changes when a translator commits
   - **Push branch**: `l10n_master` (Weblate will create this branch)
   - **Push URL**: (auto-filled from repo URL)

3. Add Weblate's SSH key to GitHub:
   - Copy the SSH public key from Weblate settings
   - Go to GitHub repo → Settings → Deploy keys
   - Click **"Add deploy key"**
   - Title: `Weblate`
   - Key: [paste SSH key]
   - ☑ **Allow write access**
   - Click **"Add key"**

#### 5b. Enable GitHub Pull Requests Addon

1. Go to component settings → **Add-ons**
2. Find **"GitHub pull requests"**
3. Click **"Install"**
4. Configure:
   - **GitHub repository**: `Masked-Kunsiquat/crm-orbit2`
   - **API token**: [Create GitHub Personal Access Token]
     - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
     - Generate new token with `repo` scope
     - Copy token and paste into Weblate
   - **Pull request title**: `Translations update from Weblate`
   - **Pull request message**: (leave default)
5. Click **"Save"**

#### 5c. Set Up GitHub Webhook (Bidirectional Sync)

1. Go to Weblate component → Settings → **Version control** → **Repository Maintenance**
2. Copy the **"Webhook URL"** (e.g., `https://hosted.weblate.org/hooks/github/`)
3. Go to GitHub repo → Settings → Webhooks → **"Add webhook"**
4. Configure:
   - **Payload URL**: [paste webhook URL from Weblate]
   - **Content type**: `application/json`
   - **Secret**: [Copy from Weblate settings]
   - **Which events**: Just the push event
   - ☑ **Active**
5. Click **"Add webhook"**

### Step 6: Request Project Approval

1. Go to your project dashboard on Weblate
2. Click **"Request project approval"** (button near top)
3. Fill in the approval request form:

```
Project name: CRM Orbit
Project URL: https://hosted.weblate.org/projects/crm-orbit/
Repository URL: https://github.com/Masked-Kunsiquat/crm-orbit2

Additional information:
Open-source mobile CRM application built with React Native and Expo.
All requirements met:
- MIT licensed (OSI approved)
- Active development (761+ commits over 2+ months)
- Translations in same repo (test-fresh/src/locales/)
- README mentions Weblate with badges
- 5 languages, 269 translation keys, 100% coverage

Thank you for providing this service to the open-source community!
```

4. Submit the request
5. You have **14 days trial** to set up before approval is required
6. Approval typically takes 1-3 days

---

## Workflow After Setup

### For Developers

1. **Add new translation key** in code:
   ```javascript
   t('new.feature.title')
   ```

2. **Update base language** (en.json):
   ```json
   {
     "new": {
       "feature": {
         "title": "New Feature"
       }
     }
   }
   ```

3. **Commit and push** to GitHub:
   ```bash
   git add test-fresh/src/locales/en.json
   git commit -m "feat: add new feature translation key"
   git push
   ```

4. **Weblate auto-detects** the change via webhook
5. **Translators translate** in Weblate web UI
6. **Weblate creates PR** with translations
7. **Review and merge** the PR

### For Translators

1. Go to [https://hosted.weblate.org/projects/crm-orbit/mobile-app/](https://hosted.weblate.org/projects/crm-orbit/mobile-app/)
2. Select your language
3. Click **"Translate"**
4. Fill in missing translations
5. Click **"Save"** (changes are committed to Weblate)
6. Weblate will automatically create a PR to GitHub

---

## Automated PR Merging (Optional)

### Option A: Manual Review (Recommended Initially)

- Review Weblate PRs manually
- Check translation quality
- Merge when satisfied

### Option B: GitHub Actions Auto-Merge

Create `.github/workflows/weblate-merge.yml`:

```yaml
name: Auto-merge Weblate PRs

on:
  pull_request:
    branches:
      - master
    paths:
      - 'test-fresh/src/locales/*.json'

jobs:
  auto-approve:
    if: github.actor == 'weblate'
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Approve Weblate PR
        uses: hmarr/auto-approve-action@v3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

  auto-merge:
    needs: auto-approve
    if: github.actor == 'weblate'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - name: Auto-merge Weblate PR
        uses: pascalgn/automerge-action@v0.15.6
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          MERGE_LABELS: ""
          MERGE_METHOD: squash
          MERGE_COMMIT_MESSAGE: "pull-request-title"
```

### Option C: Mergify (Alternative)

Create `.mergify.yml` in repo root:

```yaml
pull_request_rules:
  - name: Auto-merge Weblate PRs
    conditions:
      - author=weblate
      - files~=^test-fresh/src/locales/.*\.json$
      - check-success=build
    actions:
      merge:
        method: squash
        commit_message: title+body
```

---

## Translation Quality Checks

Weblate automatically runs quality checks:

✅ **Placeholder checks** - Ensures `{{variable}}` placeholders are preserved
✅ **Format checks** - Validates JSON syntax
✅ **Consistency checks** - Warns about inconsistent translations
✅ **Trailing/leading whitespace** - Detects unintended spaces
✅ **Unchanged translations** - Flags strings identical to source

Configure in component settings → **Translation** → **Quality checks**

---

## Monitoring Translation Progress

### Weblate Dashboard

View at: `https://hosted.weblate.org/projects/crm-orbit/mobile-app/`

Shows:
- Translation percentage per language
- Number of missing strings
- Recently changed strings
- Translation activity graph

### Translation Badges

Add to documentation:

**Single language status**:
```markdown
[![es translation](https://hosted.weblate.org/widget/crm-orbit/mobile-app/es/svg-badge.svg)](https://hosted.weblate.org/engage/crm-orbit/es/)
```

**Multi-language chart**:
```markdown
[![Translation status](https://hosted.weblate.org/widget/crm-orbit/mobile-app/multi-auto.svg)](https://hosted.weblate.org/engage/crm-orbit/)
```

**Horizontal status**:
```markdown
[![Translation status](https://hosted.weblate.org/widget/crm-orbit/mobile-app/horizontal-auto.svg)](https://hosted.weblate.org/engage/crm-orbit/)
```

### Local Coverage Check

Run anytime:
```bash
npm run i18n:check
```

---

## Adding a New Language

### In Weblate

1. Go to component settings → **Translation**
2. Click **"Start new translation"**
3. Select language from dropdown
4. Weblate creates a new locale file
5. Translators can begin translating

### In Your App

After translations are merged:

1. Update [src/i18n/index.js](../test-fresh/src/i18n/index.js):
```javascript
import newLang from '../locales/newLang.json';

i18n.init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    // ... existing
    newLang: { translation: newLang }, // Add this
  },
  supportedLngs: ['en', 'es', 'de', 'fr', 'zh', 'newLang'], // Add here
});
```

2. Update [app.json](../test-fresh/app.json:33-36):
```json
{
  "supportedLocales": {
    "ios": ["en", "es", "de", "fr", "zh", "newLang"],
    "android": ["en", "es", "de", "fr", "zh-Hans", "newLang"]
  }
}
```

3. Update language selector in Settings screen

---

## Troubleshooting

### Weblate Not Pulling Changes from GitHub

- Check webhook delivery in GitHub repo → Settings → Webhooks
- Verify webhook secret matches Weblate configuration
- Manually trigger pull: Component settings → Repository maintenance → **Update**

### Weblate Not Pushing Changes

- Verify SSH deploy key has write access
- Check push branch name (`l10n_master`)
- Review component settings → Version control → Push on commit

### PR Not Being Created

- Verify GitHub API token has `repo` scope
- Check GitHub pull requests addon is installed
- Ensure push branch differs from main branch

### Translation Keys Not Detected

- Verify file mask is correct: `test-fresh/src/locales/*.json`
- Check file format is set to "i18next JSON file"
- Manually trigger component update

---

## Best Practices

### For Developers

✅ **Use descriptive keys**: `settings.language.german` not `sl_g`
✅ **Group related keys**: Use nested objects for organization
✅ **Add context in comments**: Use i18next context feature for ambiguous strings
✅ **Test translations**: Always test with `npm run i18n:check`
✅ **Document placeholders**: Comment what `{{variable}}` represents

### For Translators

✅ **Read context**: Check where the string is used in the app
✅ **Preserve placeholders**: Keep `{{variable}}` intact
✅ **Match punctuation**: Follow source language style
✅ **Check consistency**: Use translation memory suggestions
✅ **Test length**: Consider UI space limitations (especially German/French)

---

## Resources

- **Weblate Documentation**: https://docs.weblate.org/
- **i18next Format**: https://docs.weblate.org/en/latest/formats/i18next.html
- **Weblate API**: https://docs.weblate.org/en/latest/api.html
- **GitHub Integration**: https://docs.weblate.org/en/latest/admin/continuous.html#github-setup

---

## Support

- **Weblate Support**: support@weblate.org
- **Documentation**: https://docs.weblate.org/
- **Forum**: https://github.com/WeblateOrg/weblate/discussions
- **Project Issues**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues

---

## Next Steps

1. ✅ All prerequisites met
2. ⏳ **Sign up for Weblate** → https://hosted.weblate.org/
3. ⏳ **Create project and component**
4. ⏳ **Configure GitHub integration**
5. ⏳ **Request project approval**
6. ⏳ **Announce to community** (optional)

**Estimated setup time**: 30-60 minutes

Good luck! 🚀
