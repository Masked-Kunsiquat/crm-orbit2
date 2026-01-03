# Detail Screen Refactor & Entity Linking Implementation Plan

## Overview
This plan refactors Contact, Organization, and Account detail screens to use tabs, adds entity linking for notes and interactions, and fixes the architectural issue where change detection is embedded in events.

## User Requirements Summary
- **Tabs**: Overview / Details / Notes / Activity
- **Entity Linking**: Notes and interactions can link to accounts, contacts, organizations
- **Linking UI**: Modal-based (consistent with account linking pattern)
- **Infrastructure**: Reuse note linking (rename noteLinks → entityLinks)
- **Architecture Fix**: Move change detection from events to view layer

---

## Phase 1: Architecture Fix - Remove Change Detection from Events

### Problem
Currently `detect*Changes()` functions attach a `changes` field to event payloads, violating event immutability. Events should be semantic and immutable; change detection belongs in the view layer.

### Solution
Move change detection to timeline rendering time by comparing consecutive events.

### Files to Modify:

**1. Create new view-layer change detection**
- `CRMOrbit/views/timeline/changeDetection.ts` (NEW)
  - Move all `detect*Changes()` functions from `utils/historyChanges.ts`
  - Create `computeChangesForEvent(event, previousState)` function
  - Called at render time by TimelineSection

**2. Update action hooks (remove `changes` from payloads)**
- `CRMOrbit/views/hooks/useAccountActions.ts`
  - Remove `detectAccountChanges` import and call
  - Remove `...(changes && changes.length > 0 && { changes })` from payload

- `CRMOrbit/views/hooks/useContactActions.ts`
  - Remove `detectContactChanges` import and call
  - Remove `...(changes && changes.length > 0 && { changes })` from payload

- `CRMOrbit/views/hooks/useOrganizationActions.ts`
  - Remove `detectOrganizationChanges` import and call
  - Remove `...(changes && changes.length > 0 && { changes })` from payload

- `CRMOrbit/views/hooks/useInteractionActions.ts`
  - Remove `detectInteractionChanges` import and call
  - Remove `...(changes && changes.length > 0 && { changes })` from payload

- `CRMOrbit/views/hooks/useNoteActions.ts`
  - Remove `detectNoteChanges` import and call (if exists)
  - Remove `...(changes && changes.length > 0 && { changes })` from payload

**3. Update TimelineSection component**
- `CRMOrbit/views/components/TimelineSection.tsx`
  - Import change detection functions
  - For each timeline event, compute changes by comparing with previous entity state
  - Pass computed changes to timeline item renderer
  - Build entity state cache from events for efficient lookups

**4. Delete old file**
- `CRMOrbit/utils/historyChanges.ts` (DELETE after migration)

---

## Phase 2: Rename noteLinks → entityLinks

### Infrastructure Changes

**1. Domain model update**
- `CRMOrbit/domains/relations/noteLink.ts`
  - Rename file to `entityLink.ts`
  - Rename `NoteLink` → `EntityLink`
  - Rename `NoteLinkEntityType` → `EntityLinkType`
  - Add `linkType: "note" | "interaction"` field to distinguish link types

**2. Schema update**
- `CRMOrbit/automerge/schema.ts`
  - Rename `noteLinks` → `entityLinks`
  - Update type references

**3. Reducer updates**
- `CRMOrbit/reducers/noteLink.reducer.ts`
  - Rename to `entityLink.reducer.ts`
  - Support both note and interaction linking
  - Update event type handlers to work with `linkType` field

**4. Event types**
- `CRMOrbit/events/eventTypes.ts`
  - Add: `"interaction.linked"`, `"interaction.unlinked"`
  - Keep existing note events for backwards compatibility

**5. Reducer registry**
- `CRMOrbit/reducers/registry.ts`
  - Route interaction link events to entityLink reducer

**6. Store selectors**
- `CRMOrbit/views/store/selectors.ts`
  - Rename `getNotesForEntity` → `getLinkedEntities`
  - Add `getNotesForEntity` wrapper for backwards compat
  - Add `getInteractionsForEntity` wrapper
  - Update `getEntitiesForNote` to use entityLinks
  - Add `getEntitiesForInteraction` function

**7. Store hooks**
- `CRMOrbit/views/store/store.ts`
  - Update hooks to use new selector names
  - Add `useInteractions(entityType, entityId)` hook
  - Update `useEntitiesForNote` to use entityLinks

**8. Actions**
- Create `CRMOrbit/views/hooks/useEntityLinkActions.ts` (NEW)
  - `linkNote(noteId, entityType, entityId)`
  - `unlinkNote(linkId)`
  - `linkInteraction(interactionId, entityType, entityId)`
  - `unlinkInteraction(linkId)`
  - Unified linking logic

---

## Phase 3: Create Reusable Tab Component

**Create `CRMOrbit/views/components/DetailTabs.tsx`**
- Props: `tabs`, `activeTab`, `onTabChange`
- Uses SegmentedOptionGroup internally
- Consistent styling for all detail screens
- State management pattern: `const [activeTab, setActiveTab] = useState("overview")`

---

## Phase 4: Create Linking Modal Components

**1. Create `CRMOrbit/views/components/LinkNoteModal.tsx`**
- Props: `visible`, `onClose`, `entityType`, `entityId`, `existingNoteIds`
- Lists all notes, disables already-linked ones
- Calls `linkNote` on selection
- Confirmation on success

**2. Create `CRMOrbit/views/components/LinkInteractionModal.tsx`**
- Props: `visible`, `onClose`, `entityType`, `entityId`, `existingInteractionIds`
- Lists all interactions, disables already-linked ones
- Calls `linkInteraction` on selection
- Shows interaction type, summary, date

**3. Update `CRMOrbit/views/components/NotesSection.tsx`**
- Add "Link Existing" button
- Show LinkNoteModal
- Display linked notes with unlink button
- Handle both creation and linking

**4. Create `CRMOrbit/views/components/InteractionsSection.tsx`** (NEW)
- Similar to NotesSection
- "Add Interaction" navigates to InteractionForm with entityToLink
- "Link Existing" shows LinkInteractionModal
- List interactions with unlink button

---

## Phase 5: Refactor ContactDetailScreen

**File: `CRMOrbit/views/screens/contacts/ContactDetailScreen.tsx`**

### Header Section (no changes)
- Contact name
- Edit button
- Title and type displayed inline

### Tab Structure
```
Overview Tab:
- Emails section
- Phones section

Details Tab:
- Linked Accounts section (existing linking UI)

Notes Tab:
- NotesSection component (updated with linking)

Activity Tab:
- TimelineSection component
```

### Changes:
1. Import DetailTabs component
2. Add `const [activeTab, setActiveTab] = useState("overview")`
3. Render tab selector below header
4. Conditionally render content based on activeTab
5. Move contact type to use existing i18n labels (contact.type.internal, etc.)

---

## Phase 6: Refactor OrganizationDetailScreen

**File: `CRMOrbit/views/screens/organizations/OrganizationDetailScreen.tsx`**

### Header Section
- Organization name + status (inline, remove "Status:" label)
- Edit button
- Remove created date section (now in Activity tab)

### Tab Structure
```
Overview Tab:
- Contacts section (existing)
- Accounts section (existing)

Details Tab:
- Website field
- Social media links section

Notes Tab:
- NotesSection component

Activity Tab:
- TimelineSection component
```

### Changes:
1. Update header to show status inline: `{org.name} • {t(org.status)}`
2. Remove created date Section
3. Add DetailTabs component
4. Organize existing content into tabs
5. Add InteractionsSection to Notes tab

---

## Phase 7: Refactor AccountDetailScreen

**File: `CRMOrbit/views/screens/accounts/AccountDetailScreen.tsx`**

### Header Section
- Organization name + status (inline)
- Edit button

### Tab Structure
```
Overview Tab:
- Contacts section (with type filter as sub-tabs or filter buttons)

Details Tab:
- Website field
- Site address
- Parking address
- Social media links section

Notes Tab:
- NotesSection component
- InteractionsSection component

Activity Tab:
- TimelineSection component
```

### Changes:
1. Update header to show status: `{org.name} • {t(account.status)}`
2. Add DetailTabs component
3. Keep contact filter within Overview tab (current implementation)
4. Move website/addresses/social to Details tab
5. Add NotesSection and InteractionsSection to Notes tab

---

## Phase 8: Update InteractionDetailScreen

**File: `CRMOrbit/views/screens/interactions/InteractionDetailScreen.tsx`**

### Add "Linked To" Section
- Similar to NoteDetailScreen
- Show linked accounts, contacts, organizations
- Pressable to navigate
- Unlink button per entity
- Use `useEntitiesForInteraction` hook

### Keep Existing
- Header with interaction type, summary, dates
- Timeline section
- Delete button

---

## Phase 9: Update InteractionFormScreen

**File: `CRMOrbit/views/screens/interactions/InteractionFormScreen.tsx`**

### Add entityToLink Support
- Accept `entityToLink?: { entityId, entityType }` in route params
- After creating interaction, link it to entity
- Handle linking errors with confirmation dialog (keep unlinked or delete)
- Similar pattern to NoteFormScreen

---

## Phase 10: i18n Additions

**File: `CRMOrbit/i18n/en.json`**

Add translations for:
```json
{
  "tabs.overview": "Overview",
  "tabs.details": "Details",
  "tabs.notes": "Notes",
  "tabs.activity": "Activity",

  "interactions.linkedTo": "Linked To",
  "interactions.linkExisting": "Link Existing",
  "interactions.linkTitle": "Link Interaction",
  "interactions.unlinkTitle": "Unlink Interaction",
  "interactions.unlinkConfirmation": "Are you sure you want to unlink this interaction from \"{name}\"?",

  "notes.linkExisting": "Link Existing",
  "notes.linkTitle": "Link Note",

  "events.interaction.linked": "Linked interaction",
  "events.interaction.unlinked": "Unlinked interaction"
}
```

---

## Phase 11: Navigation Type Updates

**File: `CRMOrbit/views/navigation/types.ts`**

Update InteractionForm route params:
```typescript
InteractionForm: {
  interactionId?: EntityId;
  entityToLink?: {
    entityId: EntityId;
    entityType: EntityLinkType;
  };
};
```

---

## Critical Files Summary

### New Files:
1. `CRMOrbit/views/timeline/changeDetection.ts`
2. `CRMOrbit/domains/relations/entityLink.ts` (renamed from noteLink.ts)
3. `CRMOrbit/reducers/entityLink.reducer.ts` (renamed from noteLink.reducer.ts)
4. `CRMOrbit/views/hooks/useEntityLinkActions.ts`
5. `CRMOrbit/views/components/DetailTabs.tsx`
6. `CRMOrbit/views/components/LinkNoteModal.tsx`
7. `CRMOrbit/views/components/LinkInteractionModal.tsx`
8. `CRMOrbit/views/components/InteractionsSection.tsx`

### Modified Files:
- `CRMOrbit/automerge/schema.ts`
- `CRMOrbit/events/eventTypes.ts`
- `CRMOrbit/reducers/registry.ts`
- `CRMOrbit/views/store/selectors.ts`
- `CRMOrbit/views/store/store.ts`
- `CRMOrbit/views/components/TimelineSection.tsx`
- `CRMOrbit/views/components/NotesSection.tsx`
- `CRMOrbit/views/screens/contacts/ContactDetailScreen.tsx`
- `CRMOrbit/views/screens/organizations/OrganizationDetailScreen.tsx`
- `CRMOrbit/views/screens/accounts/AccountDetailScreen.tsx`
- `CRMOrbit/views/screens/interactions/InteractionDetailScreen.tsx`
- `CRMOrbit/views/screens/interactions/InteractionFormScreen.tsx`
- All action hooks (remove change detection)
- `CRMOrbit/i18n/en.json`
- `CRMOrbit/views/navigation/types.ts`

### Deleted Files:
- `CRMOrbit/utils/historyChanges.ts`

---

## Implementation Order

1. **Phase 1** - Fix architecture issue (change detection)
2. **Phase 2** - Rename noteLinks → entityLinks
3. **Phase 3** - Create DetailTabs component
4. **Phase 4** - Create linking modal components
5. **Phases 5-7** - Refactor detail screens (can do in parallel)
6. **Phase 8-9** - Update interaction screens
7. **Phase 10-11** - i18n and navigation updates

Each phase should be tested, linted, and committed separately.
