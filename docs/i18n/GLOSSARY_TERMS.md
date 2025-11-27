# i18n Glossary Terms

**Generated**: 2025-11-27
**Project**: Expo CRM (crm-orbit)
**Status**: Phase 1.3 Complete

---

## Purpose

This document identifies domain-specific terms that require consistent translation across all languages. These terms will be compiled into a **TBX (TermBase eXchange)** glossary file for use with Weblate, providing translators with:

- **Definitions**: What the term means in the context of this CRM app
- **Usage context**: Where and how the term appears
- **Translation guidance**: Specific instructions for each language
- **Do not translate**: Terms that should remain unchanged (e.g., "CRM", "PIN")

---

## Table of Contents

1. [Core Application Terms](#1-core-application-terms)
2. [Entity/Data Model Terms](#2-entitydata-model-terms)
3. [Feature-Specific Terms](#3-feature-specific-terms)
4. [Technical Terms](#4-technical-terms)
5. [Ambiguous Terms](#5-ambiguous-terms-requiring-context)
6. [Brand/Product Terms](#6-brandproduct-terms)
7. [Action Terms](#7-action-terms)

---

## 1. Core Application Terms

### CRM
**Part of Speech**: Noun (acronym)
**Definition**: Customer Relationship Management - the category of software this app belongs to
**Context**: App category, feature descriptions
**Translation Guidance**:
- **Keep as "CRM"** in all languages (industry-standard acronym)
- Do NOT expand to full phrase unless specifically needed for clarity

**Appears in**:
- App description
- Documentation
- Feature explanations

**TBX Entry**:
```xml
<termEntry>
  <descrip>Customer Relationship Management - the type of software. Keep as acronym in all languages.</descrip>
  <langSet xml:lang="en"><tig><term>CRM</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>CRM</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>CRM</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>CRM</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>CRM</term></tig></langSet>
</termEntry>
```

---

### Dashboard
**Part of Speech**: Noun
**Definition**: Main landing page showing overview of contacts, interactions, and events
**Context**: Navigation, screen title
**Translation Guidance**:
- Spanish: "Panel de control" (control panel)
- German: "Dashboard" (borrowed term, widely used)
- French: "Tableau de bord" (dashboard, instrument panel)
- Chinese: "控制面板" (control panel)

**Appears in**:
- `navigation.dashboard`
- `dashboard.title`

**Notes**:
- Some languages prefer the English term "Dashboard" as a tech term
- Others prefer native translations
- Be consistent throughout the app

**TBX Entry**:
```xml
<termEntry>
  <descrip>Main landing page or home screen. Shows overview of contacts and recent activity. Primary navigation hub.</descrip>
  <langSet xml:lang="en"><tig><term>Dashboard</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Panel de control</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Dashboard</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Tableau de bord</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>控制面板</term></tig></langSet>
</termEntry>
```

---

## 2. Entity/Data Model Terms

### Contact (noun)
**Part of Speech**: Noun
**Definition**: A person in your contact list whom you track relationships with
**Context**: Main entity in the app, not the verb "to contact someone"
**Translation Guidance**:
- **NOT**: "to contact" (verb)
- **IS**: "a contact" (noun - a person)

**Ambiguity Warning**:
- English: "Contact" can be both noun and verb
- Translators must use noun form only

**Appears in**:
- `navigation.contacts` (plural)
- `addContact.title` (singular)
- `contactDetail.title`
- Count displays throughout app

**TBX Entry**:
```xml
<termEntry>
  <descrip>A person in your contact list (noun). Not the verb "to contact someone". Refers to individuals you track relationships with.</descrip>
  <langSet xml:lang="en"><tig><term>Contact</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Contacto</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Kontakt</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Contact</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>联系人</term></tig></langSet>
</termEntry>
```

---

### Interaction
**Part of Speech**: Noun
**Definition**: A logged communication with a contact: call, text, email, or meeting. Specifically a tracked event in the app, not a general interaction.
**Context**: Activity tracking, timeline, history
**Translation Guidance**:
- This is a **logged activity**, not just any interaction
- More specific than casual "communication"
- Implies tracking/recording

**Appears in**:
- `navigation.interactions`
- `addInteraction.titleAdd`
- `contactDetail.recent`
- Analytics/statistics

**TBX Entry**:
```xml
<termEntry>
  <descrip>A logged communication with a contact: call, text, email, or meeting. Specifically a tracked event in the app, not a general interaction.</descrip>
  <langSet xml:lang="en"><tig><term>Interaction</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Interacción</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Interaktion</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Interaction</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>互动</term></tig></langSet>
</termEntry>
```

---

### Event
**Part of Speech**: Noun
**Definition**: A scheduled occurrence tied to a contact: birthday, anniversary, meeting, or deadline
**Context**: Calendar, reminders, scheduling
**Translation Guidance**:
- More formal than "appointment"
- Can be recurring (birthdays) or one-time (meetings)

**Appears in**:
- `navigation.events`
- `addEvent.titleAdd`
- `dashboard.upcomingEvents`

**TBX Entry**:
```xml
<termEntry>
  <descrip>A scheduled occurrence tied to a contact: birthday, anniversary, meeting, or deadline. Can be recurring or one-time.</descrip>
  <langSet xml:lang="en"><tig><term>Event</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Evento</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Ereignis</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Événement</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>事件</term></tig></langSet>
</termEntry>
```

---

### Company
**Part of Speech**: Noun
**Definition**: An organization that a contact is affiliated with
**Context**: Professional networking, B2B tracking
**Translation Guidance**:
- Formal business entity
- Can have industry, website, address

**Appears in**:
- `navigation.companies`
- `companies.add.title`
- Contact details (job at company)

**TBX Entry**:
```xml
<termEntry>
  <descrip>An organization that a contact is affiliated with. Business entity with industry, address, and other details.</descrip>
  <langSet xml:lang="en"><tig><term>Company</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Empresa</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Unternehmen</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Entreprise</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>公司</term></tig></langSet>
</termEntry>
```

---

### Category
**Part of Speech**: Noun
**Definition**: A label/tag to organize contacts (e.g., Family, Friends, Work, VIP)
**Context**: Filtering, organization
**Translation Guidance**:
- Similar to "tag" or "label"
- Used for grouping contacts
- Examples: Family, Friends, Work, Clients

**Appears in**:
- `addContact.sections.categories`
- Filter UI
- Contact organization

**TBX Entry**:
```xml
<termEntry>
  <descrip>A label/tag to organize contacts. Examples: Family, Friends, Work, VIP. Used for grouping and filtering.</descrip>
  <langSet xml:lang="en"><tig><term>Category</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Categoría</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Kategorie</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Catégorie</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>类别</term></tig></langSet>
</termEntry>
```

---

### Note
**Part of Speech**: Noun
**Definition**: Free-form text attached to a contact for reference
**Context**: Documentation, reminders, additional info
**Translation Guidance**:
- Text-based annotation
- Not the same as "interaction" (which is logged activity)

**Appears in**:
- Note creation UI
- Contact details
- Global search

**TBX Entry**:
```xml
<termEntry>
  <descrip>Free-form text attached to a contact for reference. Text-based note, not a logged interaction.</descrip>
  <langSet xml:lang="en"><tig><term>Note</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Nota</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Notiz</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Note</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>笔记</term></tig></langSet>
</termEntry>
```

---

## 3. Feature-Specific Terms

### Proximity (Relationship Proximity)
**Part of Speech**: Noun
**Definition**: A calculated score (0-100) measuring relationship strength based on interaction frequency, recency, and quality
**Context**: Analytics feature, relationship insights
**Translation Guidance**:
- Technical term specific to this app
- **NOT** physical proximity/distance
- **IS** relationship closeness/strength
- Spanish: "Proximidad de relación" (relationship proximity)
- German: "Beziehungsnähe" (relationship closeness)
- French: "Proximité relationnelle" (relationship proximity)
- Chinese: "关系亲密度" (relationship intimacy/closeness)

**Appears in**:
- `navigation.proximity`
- `proximity.title` = "Relationship Proximity"
- `proximitySettings.title`

**TBX Entry**:
```xml
<termEntry>
  <descrip>A calculated score (0-100) measuring relationship strength based on interaction frequency, recency, and quality. NOT physical proximity. Specific feature of this app.</descrip>
  <langSet xml:lang="en"><tig><term>Proximity</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Proximidad</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Nähe</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Proximité</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>亲密度</term></tig></langSet>
</termEntry>
```

---

### Radar (Proximity Radar)
**Part of Speech**: Noun
**Definition**: Visual representation showing contacts on concentric circles based on relationship strength
**Context**: Proximity feature visualization
**Translation Guidance**:
- Metaphor: like a radar screen
- Shows contacts arranged by proximity score
- Can use "Radar" in most languages (technical/borrowed term)

**Appears in**:
- `proximity.radarTitle`
- `proximity.radarInfo.title`

**TBX Entry**:
```xml
<termEntry>
  <descrip>Visual representation showing contacts on concentric circles based on relationship strength. Like a radar screen displaying relationship proximity.</descrip>
  <langSet xml:lang="en"><tig><term>Radar</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Radar</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Radar</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Radar</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>雷达</term></tig></langSet>
</termEntry>
```

---

### Analytics
**Part of Speech**: Noun
**Definition**: Data analysis and statistics about interactions, events, and contact activity
**Context**: Reports, statistics, insights
**Translation Guidance**:
- Technical term
- About data/statistics, not general "analysis"

**Appears in**:
- `analytics.title`
- Statistics screens

**TBX Entry**:
```xml
<termEntry>
  <descrip>Data analysis and statistics about interactions, events, and contact activity. Insights and reports feature.</descrip>
  <langSet xml:lang="en"><tig><term>Analytics</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Análisis</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Analytik</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Analytique</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>分析</term></tig></langSet>
</termEntry>
```

---

### Swipe Actions
**Part of Speech**: Noun phrase
**Definition**: Customizable gestures (left/right swipe) on contact list items to trigger actions
**Context**: Settings, gesture configuration
**Translation Guidance**:
- Mobile UI pattern: swipe left/right to reveal actions
- "Swipe" = finger gesture on screen

**Appears in**:
- `settings.sections.swipe`
- Swipe configuration UI

**TBX Entry**:
```xml
<termEntry>
  <descrip>Customizable gestures (left/right swipe) on contact list items to trigger actions like call or delete.</descrip>
  <langSet xml:lang="en"><tig><term>Swipe Actions</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Acciones de deslizamiento</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Wisch-Aktionen</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Actions de balayage</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>滑动操作</term></tig></langSet>
</termEntry>
```

---

## 4. Technical Terms

### PIN
**Part of Speech**: Noun (acronym)
**Definition**: Personal Identification Number - a 4-8 digit security code for app access
**Context**: Security, authentication
**Translation Guidance**:
- **Keep as "PIN"** in all languages
- Do NOT translate or expand to full phrase
- Industry-standard security term

**Appears in**:
- `settings.security.pinSetup`
- Authentication screens

**TBX Entry**:
```xml
<termEntry>
  <descrip>Personal Identification Number - a 4-8 digit security code for app access. Keep as "PIN" in all languages (industry standard).</descrip>
  <langSet xml:lang="en"><tig><term>PIN</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>PIN</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>PIN</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>PIN</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>PIN</term></tig></langSet>
</termEntry>
```

---

### Biometric
**Part of Speech**: Adjective/Noun
**Definition**: Authentication using fingerprint or face recognition
**Context**: Security settings
**Translation Guidance**:
- Technical term for fingerprint/face authentication
- Adjective: "biometric authentication"
- Noun: "use biometric"

**Appears in**:
- `settings.security.useBiometric`
- `settings.security.biometricDescription`

**TBX Entry**:
```xml
<termEntry>
  <descrip>Authentication using fingerprint or face recognition. Technical security term.</descrip>
  <langSet xml:lang="en"><tig><term>Biometric</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Biométrico</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Biometrie</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Biométrie</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>生物识别</term></tig></langSet>
</termEntry>
```

---

### Auto-Lock
**Part of Speech**: Noun/Verb
**Definition**: Automatic app locking after inactivity timeout
**Context**: Security settings
**Translation Guidance**:
- Compound term: "auto" (automatic) + "lock"
- Noun: "Auto-Lock feature"
- Verb: "auto-lock the app"

**Appears in**:
- `settings.security.autoLock`
- `settings.security.autoLockTimeout`

**TBX Entry**:
```xml
<termEntry>
  <descrip>Automatic app locking after inactivity timeout. Security feature.</descrip>
  <langSet xml:lang="en"><tig><term>Auto-Lock</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Bloqueo automático</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Automatische Sperre</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Verrouillage automatique</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>自动锁定</term></tig></langSet>
</termEntry>
```

---

### Database / Migration
**Part of Speech**: Noun
**Definition**:
- **Database**: Local SQLite storage for app data
- **Migration**: Schema update process for database changes
**Context**: Settings, data management
**Translation Guidance**:
- Technical terms
- "Migration" = database schema update (NOT user data migration)

**Appears in**:
- `settings.sections.database`
- `settings.database.runMigrations`

**TBX Entry (Database)**:
```xml
<termEntry>
  <descrip>Local SQLite storage for app data. Technical term.</descrip>
  <langSet xml:lang="en"><tig><term>Database</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Base de datos</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Datenbank</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Base de données</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>数据库</term></tig></langSet>
</termEntry>
```

**TBX Entry (Migration)**:
```xml
<termEntry>
  <descrip>Database schema update process. NOT user data migration. Technical term for database version updates.</descrip>
  <langSet xml:lang="en"><tig><term>Migration</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Migración</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Migration</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Migration</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>迁移</term></tig></langSet>
</termEntry>
```

---

## 5. Ambiguous Terms (Requiring Context)

### Call
**Part of Speech**: Noun OR Verb (ambiguous)
**Definition**:
- **Noun**: A phone call (interaction type)
- **Verb**: To make a phone call (action)
**Context**: Labels, actions, interaction types
**Translation Guidance**:
- Check context to determine noun vs. verb
- Noun: "Type: Call"
- Verb: "Call John"

**Appears in**:
- `labels.call` (used as both noun and verb in different contexts)
- Interaction type filters

**TBX Entries (2 entries needed)**:

**Call (Noun)**:
```xml
<termEntry>
  <descrip>Phone call - an interaction type. NOUN form. Example: "Type: Call" in interaction list.</descrip>
  <langSet xml:lang="en"><tig><term>Call</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Llamada</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Anruf</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Appel</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>通话</term></tig></langSet>
</termEntry>
```

**Call (Verb)**:
```xml
<termEntry>
  <descrip>To make a phone call - action button. VERB form. Example: "Call John" button in contact detail.</descrip>
  <langSet xml:lang="en"><tig><term>Call</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Llamar</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Anrufen</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Appeler</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>拨打</term></tig></langSet>
</termEntry>
```

---

### Text
**Part of Speech**: Noun OR Verb (ambiguous)
**Definition**:
- **Noun**: A text message (interaction type)
- **Verb**: To send a text message (action)
**Context**: Labels, actions, interaction types
**Translation Guidance**:
- Check context
- Noun: "Type: Text"
- Verb: "Text John"

**TBX Entries (2 entries)**:

**Text (Noun)**:
```xml
<termEntry>
  <descrip>Text message - an interaction type. NOUN form. Example: "Type: Text" in interaction list.</descrip>
  <langSet xml:lang="en"><tig><term>Text</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Mensaje</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Nachricht</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Texte</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>短信</term></tig></langSet>
</termEntry>
```

**Text (Verb)**:
```xml
<termEntry>
  <descrip>To send a text message - action button. VERB form. Example: "Text John" button.</descrip>
  <langSet xml:lang="en"><tig><term>Text</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Enviar mensaje</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Nachricht senden</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Envoyer texto</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>发短信</term></tig></langSet>
</termEntry>
```

---

### Filter
**Part of Speech**: Noun OR Verb
**Definition**:
- **Noun**: Criteria for narrowing down results
- **Verb**: To apply criteria to narrow results
**Context**: Search, list filtering
**Translation Guidance**:
- Noun: "Filters" (UI section title)
- Verb: "Filter by category"

**Appears in**:
- `filters.title`
- Filter UI components

---

## 6. Brand/Product Terms

### Orbit
**Part of Speech**: Proper noun (brand name)
**Definition**: The name of this CRM application
**Context**: App title, branding
**Translation Guidance**:
- **Do NOT translate** (brand name)
- Keep as "Orbit" in all languages

**TBX Entry**:
```xml
<termEntry>
  <descrip>The name of this CRM application. Brand name - do NOT translate.</descrip>
  <langSet xml:lang="en"><tig><term>Orbit</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Orbit</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Orbit</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Orbit</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>Orbit</term></tig></langSet>
</termEntry>
```

---

## 7. Action Terms

### Save / Cancel / Delete
**Part of Speech**: Verb (imperative)
**Definition**: Common actions throughout the app
**Translation Guidance**:
- Imperative mood (command form)
- Short button labels

**TBX Entries**:

**Save**:
```xml
<termEntry>
  <descrip>Save changes - action button. Imperative verb form. Generic save action used throughout app.</descrip>
  <langSet xml:lang="en"><tig><term>Save</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Guardar</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Speichern</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Enregistrer</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>保存</term></tig></langSet>
</termEntry>
```

**Cancel**:
```xml
<termEntry>
  <descrip>Cancel action - discard changes. Imperative verb form. Generic cancel action.</descrip>
  <langSet xml:lang="en"><tig><term>Cancel</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Cancelar</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Abbrechen</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Annuler</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>取消</term></tig></langSet>
</termEntry>
```

**Delete**:
```xml
<termEntry>
  <descrip>Delete item - remove permanently. Imperative verb form. Destructive action.</descrip>
  <langSet xml:lang="en"><tig><term>Delete</term></tig></langSet>
  <langSet xml:lang="es"><tig><term>Eliminar</term></tig></langSet>
  <langSet xml:lang="de"><tig><term>Löschen</term></tig></langSet>
  <langSet xml:lang="fr"><tig><term>Supprimer</term></tig></langSet>
  <langSet xml:lang="zh-Hans"><tig><term>删除</term></tig></langSet>
</termEntry>
```

---

## Summary Statistics

### Terms by Category

| Category | Term Count | Priority |
|----------|------------|----------|
| Core Application | 2 | HIGH |
| Entity/Data Model | 6 | HIGH |
| Feature-Specific | 4 | HIGH |
| Technical | 4 | MEDIUM |
| Ambiguous Terms | 3 | HIGH |
| Brand/Product | 1 | CRITICAL |
| Action Terms | 3 | MEDIUM |
| **Total** | **23** | - |

### Translation Approach by Term

| Do NOT Translate (8) | Translate (15) |
|---------------------|----------------|
| CRM | Contact |
| PIN | Interaction |
| Orbit (brand) | Event |
| Dashboard (optional) | Company |
| Radar (optional) | Category |
| Auto-Lock (optional compound) | Note |
| Database | Proximity |
| Migration | Analytics |
|  | Swipe Actions |
|  | Biometric |
|  | Call (noun/verb) |
|  | Text (noun/verb) |
|  | Filter |
|  | Save/Cancel/Delete |
|  | (others) |

---

## Next Steps (Phase 4)

1. ✅ **Complete Phase 1.3**: Glossary term identification (DONE)
2. ⏭️ **Phase 4**: Create TBX glossary file with all 23 terms
3. ⏭️ **Phase 4.1**: Add complete `<descrip>` explanations
4. ⏭️ **Phase 4.2**: Add all language entries with existing translations
5. ⏭️ **Phase 4.3**: Upload to Weblate as glossary component

---

**Report Generated**: 2025-11-27
**Next Phase**: Design New Structure (Phase 2)
