# Audit Pass B: Code Reuse & Duplication

**Date**: 2026-01-10
**Auditor**: refactoring-specialist
**Contract**: `standardization/REPO_AUDIT_CONTRACT.md` (commit 9bb169b)
**Scope**: Duplicated utilities/helpers, repeated business logic, repeated UI patterns, data-access/query logic, validation logic

---

## Executive Summary

Found **7 duplication clusters** with varying severity levels:
- **P1**: 4 findings (high-leverage maintainability issues)
- **P2**: 3 findings (opportunistic improvements)

Major patterns identified:
1. Nearly identical delete action implementations across 7 action hooks
2. Identical modal structure/layout duplicated 4 times for entity linking
3. Similar validation trim() logic repeated across 7+ form screens
4. Duplicated selector patterns for filtering/mapping entities
5. Repeated event-building boilerplate in action hooks
6. Similar linkId lookup logic in section components
7. Duplicate contact display name logic

---

## FINDINGS

### FINDING: P1 - Duplication cluster: Delete entity action pattern
**LOCATIONS**:
  1. `views/hooks/useAccountActions.ts:206-220` - deleteAccount
  2. `views/hooks/useContactActions.ts:128-142` - deleteContact
  3. `views/hooks/useNoteActions.ts:49-63` - deleteNote
  4. `views/hooks/useInteractionActions.ts:134-148` - deleteInteraction
  5. `views/hooks/useOrganizationActions.ts:90-104` - deleteOrganization
  6. `views/hooks/useAuditActions.ts:137-151` - deleteAudit
  7. `views/hooks/useCodeActions.ts:70-84` - deleteCode

**SIMILARITY**: Identical delete action structure - all follow pattern:
```typescript
const delete{Entity} = useCallback(
  ({entity}Id: EntityId): DispatchResult => {
    const event = buildEvent({
      type: "{entity}.deleted",
      entityId: {entity}Id,
      payload: { id: {entity}Id },
      deviceId,
    });
    return dispatch([event]);
  },
  [deviceId, dispatch],
);
```

**SUGGESTED_CANONICAL**: `views/hooks/` or `domains/actions/`
**EXTRACTION_TARGET**: `buildDeleteEvent` or generic `buildSimpleEntityEvent` helper
**CONTRACT**: Section B - Views layer can import from domains/actions/. Pattern reduces from 70+ lines to ~10 lines with helper.

**RATIONALE**:
- Each delete action is 14-15 lines of identical boilerplate
- Only variables: entity type string, parameter name
- 7 instances × 14 lines = 98 lines reducible to ~30 lines total
- Future entity types will copy-paste this pattern
- Centralized helper ensures consistency

---

### FINDING: P1 - Duplication cluster: Entity linking modal structure
**LOCATIONS**:
  1. `views/components/LinkNoteModal.tsx:1-226` - LinkNoteModal (226 lines)
  2. `views/components/LinkInteractionModal.tsx:1-244` - LinkInteractionModal (244 lines)
  3. `views/components/LinkEntityToNoteModal.tsx:1-361` - LinkEntityToNoteModal (361 lines)
  4. `views/components/LinkEntityToInteractionModal.tsx:1-362` - LinkEntityToInteractionModal (362 lines)

**SIMILARITY**:
- Identical modal overlay/shell structure (lines 80-178 in each)
- Same FlatList rendering pattern with existingIds check
- Same styles object (overlay, modal, title, listContent, cancelButton, etc.)
- Same modal presentation/dismissal logic
- Same useCallback patterns for handleLink, handleClose
- Same ConfirmDialog integration

**Common structure**:
- Modal > View (overlay) > Pressable (dismiss) > View (modal content)
- FlatList with item styling based on isLinked state
- Cancel button at bottom
- Identical StyleSheet definitions (~60 lines each)

**Differences**:
- LinkNote/LinkInteraction: Simple list of notes/interactions
- LinkEntityTo*: Two-tier selection (entity type, then entity list)
- Item rendering varies (note.title vs interaction.summary vs entity names)

**SUGGESTED_CANONICAL**: `views/components/`
**EXTRACTION_TARGET**:
- `BaseLinkModal` component accepting render props for items
- `useEntityLinkModal` hook for common state/logic
- Shared `linkModalStyles` StyleSheet

**CONTRACT**: Section A - Components in views/components/, Section D - NOT A VIOLATION (component organization preferences). However, 1200+ total lines with ~70% duplication (overlay, modal shell, cancel button, styles) warrants extraction.

**RATIONALE**:
- 1193 total lines across 4 files
- ~800 lines are structurally identical (modal shell, styles, cancel logic)
- Extracting shared `BaseLinkModal` + render props = ~600 line reduction
- New link modal types can reuse base (e.g., linking tags, categories)

---

### FINDING: P1 - Duplication cluster: Entity unlinking logic in section components
**LOCATIONS**:
  1. `views/components/NotesSection.tsx:51-65` - linkIdsByNoteId lookup
  2. `views/components/NotesSection.tsx:78-97` - handleUnlink function
  3. `views/components/InteractionsSection.tsx:56-70` - linkIdsByInteractionId lookup
  4. `views/components/InteractionsSection.tsx:72-91` - handleUnlink function

**SIMILARITY**: Nearly identical useMemo for building linkId lookup map:
```typescript
const linkIdsByNoteId = useMemo(() => {
  const entries = Object.entries(doc.relations.entityLinks);
  const map = new Map<EntityId, EntityId>();
  for (const [linkId, link] of entries) {
    if (
      link.linkType === "note" &&
      link.noteId &&
      link.entityType === entityType &&
      link.entityId === entityId
    ) {
      map.set(link.noteId, linkId);
    }
  }
  return map;
}, [doc.relations.entityLinks, entityId, entityType]);
```

Also similar handleUnlink function structure.

**SUGGESTED_CANONICAL**: `views/utils/` or custom hook `views/hooks/useEntityLinkMap.ts`
**EXTRACTION_TARGET**: `useEntityLinkMap(linkType, entityType, entityId)` hook
**CONTRACT**: Section B - Views can use custom hooks in views/hooks/

**RATIONALE**:
- Identical 14-line memoization logic duplicated 2+ times
- Likely to be needed in AuditsSection, CodesSection as they add linking
- Extracting to hook: 2 lines per usage instead of 14
- Centralizes entity link lookup logic

---

### FINDING: P2 - Duplication cluster: Contact display name logic
**LOCATIONS**:
  1. `domains/contact.utils.ts:7-20` - getContactDisplayName function
  2. `views/components/LinkEntityToNoteModal.tsx:84-92` - inline contact name logic
  3. `views/components/LinkEntityToInteractionModal.tsx:84-92` - inline contact name logic

**SIMILARITY**: Both modals duplicate the display name logic:
```typescript
const fullName = `${contact.firstName} ${contact.lastName}`.trim();
const primaryEmail = contact.methods.emails[0]?.value;
const displayName = fullName || primaryEmail || `Contact ${contact.id}`;
```

This logic already exists in `domains/contact.utils.ts:getContactDisplayName` but is not imported.

**SUGGESTED_CANONICAL**: `domains/contact.utils.ts` (already exists!)
**EXTRACTION_TARGET**: Import and use existing `getContactDisplayName(contact)`
**CONTRACT**: Section B - Views can import from domains/. Section D - "NOT A VIOLATION: Component organization preferences" - but this is actual logic duplication, not just organization.

**RATIONALE**:
- Utility already exists in canonical location
- Modals reimplementing instead of importing
- 6 lines per modal reducible to 1 line: `getContactDisplayName(contact)`
- Inconsistency risk: if logic changes in utils, modals diverge

---

### FINDING: P2 - Duplication cluster: Form field trim validation
**LOCATIONS**:
  1. `views/screens/accounts/AccountFormScreen.tsx:280` - `!name.trim()`
  2. `views/screens/organizations/OrganizationFormScreen.tsx:159` - `!name.trim()`
  3. `views/screens/codes/CodeFormScreen.tsx:240` - `!label.trim()`
  4. `views/screens/codes/CodeFormScreen.tsx:249` - `!codeValue.trim()`
  5. `views/screens/notes/NoteFormScreen.tsx:40` - `!title.trim()`
  6. `views/screens/contacts/ContactFormScreen.tsx:232` - `!firstName.trim() && !lastName.trim()`
  7. `views/screens/audits/AuditFormScreen.tsx:326` - `score.trim() && scoreValue === undefined`
  8. `views/screens/interactions/InteractionFormScreen.tsx:260` - `!summary.trim()`

**SIMILARITY**: All form screens validate required text fields with `.trim()` checks before save

**SUGGESTED_CANONICAL**: Could extract to `views/utils/validation.ts` or accept as acceptable duplication
**EXTRACTION_TARGET**: `validateRequired(value: string): boolean` or similar helpers
**CONTRACT**: Section D - Code Quality Standards. Pattern is simple and clear, duplication may be acceptable.

**RATIONALE**:
- Simple one-liner validation
- Clear intent at call site
- Extracting might reduce clarity
- **RECOMMENDATION**: Accept as acceptable variance unless validation becomes more complex
- If validation evolves (e.g., min length, pattern matching), then extract

---

### FINDING: P2 - Duplication cluster: Selector pattern for filtering by relation
**LOCATIONS**:
  1. `views/store/store.ts:187-198` - useContacts (filter accountContacts by accountId)
  2. `views/store/store.ts:210-221` - useCodes (filter accountCodes by accountId)
  3. `views/store/store.ts:349-370` - useContactsByOrganization (filter through accounts)
  4. `views/store/store.ts:409-420` - useAccountsByContact (filter accountContacts by contactId)

**SIMILARITY**: All follow pattern:
```typescript
const selector = (state: CrmStoreState) => {
  const {entity}Ids = Object.values(state.doc.relations.{relation})
    .filter((relation) => relation.{field} === {value})
    .map((relation) => relation.{targetField});

  return {entity}Ids
    .map(({entity}Id) => state.doc.{entities}[{entity}Id])
    .filter(({entity}): {entity} is {Entity} => Boolean({entity}));
};
```

**SUGGESTED_CANONICAL**: Accept as domain-specific or extract to shared selector builder
**EXTRACTION_TARGET**: `buildRelationSelector` utility if pattern becomes more complex
**CONTRACT**: Section B - Views layer, Section D - "NOT A VIOLATION: State management patterns"

**RATIONALE**:
- Pattern is clear and type-safe
- Each selector has slight variations (different relations, fields)
- Extracting might reduce type safety or clarity
- **RECOMMENDATION**: Accept as acceptable variance unless 5+ more selectors follow same pattern
- Monitor for increased complexity

---

### FINDING: P2 - Duplication cluster: buildEvent + dispatch pattern in action hooks
**LOCATIONS**:
  1. All action hooks (useAccountActions, useContactActions, etc.) - every action function
  2. Pattern appears 50+ times across 8 action hook files

**SIMILARITY**: Every action follows:
```typescript
const {action}Name = useCallback(
  ({params}): DispatchResult => {
    const event = buildEvent({
      type: "{entity}.{action}",
      entityId: {id},
      payload: { /* ... */ },
      deviceId,
    });
    return dispatch([event]);
  },
  [deviceId, dispatch],
);
```

**SUGGESTED_CANONICAL**: `domains/actions/` or accept as necessary boilerplate
**EXTRACTION_TARGET**: Could create higher-order function `createActionBuilder` but may reduce clarity
**CONTRACT**: Section B - Views can import from domains/actions/. Custom ESLint rule `enforce-action-hook-pattern` enforces this structure.

**RATIONALE**:
- Pattern is enforced by ESLint rule (domains/actions/README.md)
- Explicit structure aids debugging and consistency
- Type safety requires inline event building
- **RECOMMENDATION**: Accept as intentional pattern enforced by architecture
- ESLint rule already validates conformance (useCallback, deviceId parameter, DispatchResult return)
- Extracting would fight against existing architectural decision

---

## Recommendations by Priority

### High Priority (P1) - Implement Soon

1. **Extract delete entity helper** (Finding 1)
   - Create `domains/actions/entityHelpers.ts` with `buildDeleteEntityEvent(entityType, entityId, deviceId)`
   - Reduce 98 lines to ~30 lines
   - Estimated effort: 1-2 hours
   - Risk: Low (pure extraction, no behavior change)

2. **Extract base link modal component** (Finding 2)
   - Create `BaseLinkModal` with render props for item rendering
   - Extract shared styles to `linkModalStyles.ts`
   - Create `useEntityLinkModal` hook for common state
   - Reduce ~800 duplicate lines
   - Estimated effort: 4-6 hours
   - Risk: Medium (requires careful prop design, test all 4 modal flows)

3. **Create useEntityLinkMap hook** (Finding 3)
   - Extract linkId lookup logic to reusable hook
   - Reduce 14 lines to 2 per usage
   - Estimated effort: 1 hour
   - Risk: Low (pure extraction)

4. **Import getContactDisplayName** (Finding 4)
   - Replace inline logic with existing utility import
   - Fix: 2 lines changed per modal
   - Estimated effort: 15 minutes
   - Risk: Very low (utility already exists and tested)

### Low Priority (P2) - Monitor & Decide

5. **Form validation** (Finding 5)
   - **Decision**: Accept current duplication
   - Revisit if validation becomes more complex

6. **Selector patterns** (Finding 6)
   - **Decision**: Accept current duplication
   - Revisit if 5+ more selectors follow pattern

7. **buildEvent pattern** (Finding 7)
   - **Decision**: Accept as architectural pattern
   - Already enforced by ESLint rule
   - Do not extract

---

## Metrics

**Lines of code affected**: ~1,100 lines
**Potential reduction**: ~850 lines (77% reduction in duplicated code)
**Files affected**: 18 files
**Duplication clusters found**: 7
**High-priority items**: 4
**Estimated total effort**: 7-10 hours for all P1 items

---

## Contract Compliance

All findings reference `REPO_AUDIT_CONTRACT.md`:
- **Section A**: Naming Conventions (file patterns, component organization)
- **Section B**: Layering & Architecture (import boundaries, layer communication)
- **Section D**: Code Quality Standards (acceptable variance, state management patterns)

No P0 violations found - all duplication is maintainability-focused (P1/P2).

---

**Status**: COMPLETE
**Next Steps**: Review findings with team, prioritize P1 items for refactoring sprint
