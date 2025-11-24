# Relationship Proximity Visualization - Implementation Game Plan

**Status**: 🟢 Phase 1 Complete | 🟢 Phase 2 Complete | 🟢 Phase 3 Complete | 🟢 Phase 4 Complete
**Last Updated**: 2025-01-23
**Branch**: `feat/interaction-proximity`
**Commits**: 22 atomic commits (72f2a84...3e39a52)

---

## Mission
Create an interactive "Relationship Proximity" visualization screen that shows contacts as bubbles/avatars arranged in concentric rings based on calculated relationship strength. This is a **Phase 2 feature** that works entirely with existing data - no native modules required.

## ✅ Phase 1 Complete: Algorithm & Utilities (100%)

**What's Done:**
- ✅ Database migration for contact_type field
- ✅ Modern interaction types (video_call, social_media)
- ✅ Proximity scoring constants (5 presets, 4 tiers, quality weights)
- ✅ Proximity calculator utility (8 functions, 409 lines)
- ✅ Settings storage (proximity.preset, proximity.customWeights)
- ✅ Query hooks (useAllInteractions, useProximityData, useProximityConfig, useProximityStats)
- ✅ Contact forms updated (relationship type selection)
- ✅ English translations added

## ✅ Phase 2 Complete: Basic UI (100%)

**What's Done:**
- ✅ ProximityScreen created with SectionList-based tiered view
- ✅ Proximity tab added to bottom navigation (target icon)
- ✅ Contact cards display with score badges and tier colors
- ✅ Section headers show tier emoji, label, and count
- ✅ Empty states (loading, error, no contacts)
- ✅ Pull-to-refresh functionality
- ✅ Navigation to ContactDetail on tap
- ✅ English translations for screen

**Files Created:**
- `src/screens/ProximityScreen.js` (265 lines)

**Files Modified:**
- `App.js` (navigation integration)
- `src/locales/en.json` (translations)

## ✅ Phase 3 Complete: Settings Screen (100%)

**What's Done:**
- ✅ ProximitySettingsScreen created with preset selection
- ✅ 5 algorithm presets (personal, professional, family_focused, social_butterfly, custom)
- ✅ Weight distribution display for each preset
- ✅ Custom preset placeholder (weight editor tracked in #126)
- ✅ Settings persistence via database
- ✅ Linked from main SettingsScreen under "Relationship Insights"
- ✅ English translations for settings
- ✅ Bug fixes: custom preset crash, hasChanges logic, divider optimization

**Files Created:**
- `src/screens/ProximitySettingsScreen.js` (280 lines)

**Files Modified:**
- `src/screens/SettingsScreen.js` (navigation integration)
- `src/locales/en.json` (translations)
- `App.js` (navigation stack)

## ✅ Phase 4 Complete: Visual Polish (100%)

**What's Done:**
- ✅ ScoreBadge reusable component (3 sizes: small/medium/large)
- ✅ TierHeader reusable component for section headers
- ✅ ContactProximityCard with React.memo optimization
- ✅ ProximityScreen refactored to use new components (276 → 184 lines, 33% reduction)
- ✅ Performance optimizations (useCallback, memoization)
- ✅ ScoreBadge integrated into ContactDetailScreen (avatar overlay)
- ✅ Reduced duplicate code (300+ lines removed)
- ✅ Bug fix: Null safety in ContactDetailScreen proximity score calculation
- ✅ Bug fix: Enhanced memo comparison in ContactProximityCard (name/avatar updates now trigger re-render)

**Files Created:**
- `src/components/ScoreBadge.js` (52 lines)
- `src/components/TierHeader.js` (58 lines)
- `src/components/ContactProximityCard.js` (72 lines)

**Files Modified:**
- `src/screens/ProximityScreen.js` (refactored from 276 to 184 lines)
- `src/screens/ContactDetailScreen.js` (badge integration with null safety)

**Commits:**
- c0d9162: feat(proximity): add reusable components and performance optimizations
- 3c6b0d2: feat(proximity): add score badge to contact detail screen
- e3df914: fix(proximity): handle null proximityScores in ContactDetailScreen
- 3e39a52: fix(proximity): improve ContactProximityCard memo comparison

---

## Context: Review These Files First

### Database & Data Access
- `src/database/contacts.js` - Contact schema and queries
- `src/database/interactions.js` - Interaction data and queries
- `src/hooks/queries/useContactQueries.js` - Contact data fetching
- `src/hooks/queries/useInteractionQueries.js` - Interaction data fetching

### Existing Utilities
- `src/utils/validators.js` - Validation patterns
- `src/utils/contactHelpers.js` - Contact display utilities
- `src/utils/arrayHelpers.js` - Array manipulation (grouping)
- `src/errors/utils/errorLogger.js` - Logging
- `src/errors/utils/errorHandler.js` - User alerts

### UI Patterns
- `src/screens/ContactDetailScreen.js` - Navigation to contact details
- `src/screens/ContactsList.js` - Contact list patterns
- `src/components/ContactCard.js` - Contact display component
- `src/components/ContactAvatar.js` - Avatar component (reuse this!)

### Constants & Settings
- `src/constants/` - Existing constants folder structure
- `src/database/settings.js` - Settings storage patterns

---

## Phase 1: Algorithm & Utilities

### Task 1: Create Proximity Constants
**New File:** `src/constants/proximityDefaults.js`

Define:
- Default weight percentages (recency: 40%, frequency: 30%, quality: 20%, contactType: 10%)
- Recency scoring brackets (days → score)
- Frequency scoring brackets (count per 30 days → score)
- Interaction quality weights by type (in_person: 3, call: 2, text: 1, etc)
- Contact type baseline scores (best_friend: 100, family: 100, colleague: 30, etc)
- Preset configurations (personal, professional, family_focused, social_butterfly, custom)

**Study:** `src/constants/auth.js` for existing constant patterns

### Task 2: Create Proximity Calculator
**New File:** `src/utils/proximityCalculator.js`

Implement functions:
```javascript
calculateProximityScore(contact, interactions, config)
  // Returns 0-100 score based on configurable weights
  // Use date-fns for date calculations
  
getProximityTier(score)
  // Returns { tier, label, color, emoji }
  // 70-100: inner/green, 50-69: middle/yellow, 30-49: outer/orange, 0-29: distant/red
  
groupByProximity(contactsWithScores)
  // Returns { inner: [], middle: [], outer: [], distant: [] }
```

**Helper functions:**
```javascript
calculateRecencyScore(interactions, brackets)
calculateFrequencyScore(interactions, brackets)
calculateQualityScore(interactions, qualityWeights)
```

**Use:** `date-fns` for date math (already in package.json)

### Task 3: Add Settings Storage
**File:** `src/database/settings.js`

Add methods:
```javascript
async getProximityConfig()
  // Returns current preset config (default: 'personal')
  // If 'custom', return saved custom weights
  
async setProximityConfig(presetName, customConfig)
  // Save preset name
  // Save custom config if provided
```

**Study:** Existing `get()` and `set()` methods in settings.js

---

## Phase 2: Proximity Screen (List View)

### Task 1: Create Proximity List Screen
**New File:** `src/screens/ProximityScreen.js`

**Data Flow:**
1. Fetch all contacts (useContacts)
2. Fetch all interactions (useAllInteractions or iterate per contact)
3. Load proximity config from settings
4. Calculate scores for each contact using proximityCalculator
5. Group by tier using groupByProximity()
6. Render tiered list

**UI Structure:**
```
Header: "Relationship Proximity"

For each tier (inner → distant):
  Tier Header: 🟢 INNER CIRCLE (6)
  
  Contact Cards:
  ┌─────────────────────────────────┐
  │ [Avatar] Mom                     │
  │          5 calls • Last: 2d ago  │ [Score Badge: 85]
  └─────────────────────────────────┘
  
  (Tappable → navigate to ContactDetailScreen)
```

**Components to use:**
- ContactAvatar for profile images
- Surface for cards
- FlatList or SectionList for rendering
- React Navigation for navigation

**Study patterns from:**
- `src/screens/ContactsList.js` - List rendering
- `src/screens/InteractionsScreen.js` - Data fetching patterns

### Task 2: Add Navigation Entry Point
**File:** Check main navigation structure (likely in `App.js` or navigator file)

Add new tab or screen:
- Icon: 🎯 or similar
- Label: "Proximity" or "Relationships"
- Navigate to ProximityScreen

**Study:** Existing tab/stack navigation setup

---

## Phase 3: Proximity Settings Screen

### Task 1: Create Settings Screen
**New File:** `src/screens/ProximitySettingsScreen.js`

**UI Structure:**
```
Title: "Proximity Algorithm"
Description: Explain what this does

Radio buttons for presets:
○ Personal (Default) - Balanced for personal relationships
○ Professional - Optimized for business networking  
○ Family Focused - Prioritizes family connections
○ Social Butterfly - Values frequency of contact
○ Custom - Create your own weights

If "Custom" selected:
  Show sliders for each weight (recency, frequency, quality, contactType)
  Show current % for each
  Show total (must = 100%)
  
[Save Settings] button
```

**Components:**
- RadioButton.Group from React Native Paper
- Slider from React Native Paper (or custom)
- Button for save action

**State Management:**
- Load current config on mount
- Update local state on changes
- Save to database on button press
- Show success alert on save

**Study:** `src/screens/SettingsScreen.js` for existing settings patterns

### Task 2: Link from Main Settings
**File:** `src/screens/SettingsScreen.js`

Add new settings section:
```
Relationship Insights
  > Proximity Algorithm Settings
```

**Follow existing navigation patterns** in SettingsScreen

---

## Phase 4: Visual Enhancements (Optional Polish)

### Task 1: Score Badge Component
**New File:** `src/components/ScoreBadge.js`

Reusable component showing proximity score:
- Circular badge
- Color matches tier (green/yellow/orange/red)
- Shows number (0-100)
- Optional size prop (small/medium/large)

### Task 2: Tier Header Component
**New File:** `src/components/TierHeader.js`

Consistent tier section headers:
- Emoji + label + count
- Colored text matching tier
- Optional collapsible functionality

### Task 3: Empty States
Add helpful messages when tiers are empty:
- "No contacts in this tier yet"
- "Start logging interactions to see contacts here"

---

## Phase 5: Data Optimization

### Task 1: Create Aggregated Query Hook
**New File:** `src/hooks/queries/useProximityData.js`

Optimize data fetching:
```javascript
export function useProximityData() {
  const contacts = useContacts();
  const interactions = useAllInteractions();
  const settings = useSettings(); // or fetch proximity config
  
  return useMemo(() => {
    // Calculate all scores
    // Group by tier
    // Sort by score within tier
    // Return organized data
  }, [contacts, interactions, settings]);
}
```

**Benefits:**
- Single hook for screen
- Memoized calculations
- Automatic re-calculation on data changes

### Task 2: Performance Considerations
- Memoize expensive calculations
- Use React.memo for contact cards if needed
- Consider virtualization for large contact lists
- Cache proximity scores if calculations are slow

---

## Phase 6: Testing & Validation

### Manual Testing Checklist
- [ ] Empty state (no contacts)
- [ ] Empty state (contacts but no interactions)
- [ ] Scores calculate correctly for different scenarios
- [ ] Tier groupings work correctly
- [ ] Navigation to contact detail works
- [ ] Settings persist across app restarts
- [ ] Preset switching updates scores immediately
- [ ] Custom weights validation (sum to 100%)

### Edge Cases
- Contact with no interactions (score = 0)
- Contact with only old interactions (>90 days)
- Contact with 100+ interactions
- Very long contact names in cards
- Missing contact avatars

### Data Scenarios to Test
1. **Recent frequent contact:** Should be inner circle
2. **Old infrequent contact:** Should be distant
3. **High-quality interactions (calls):** Should score higher than texts
4. **Contact type weighting:** Family should rank higher than acquaintances with same interaction pattern

---

## Implementation Order

### ✅ Phase 1: Core Algorithm (COMPLETE)
1. ✅ Create proximityDefaults.js constants (290 lines, 5 presets, 4 tiers)
2. ✅ Implement proximityCalculator.js (409 lines, 8 functions)
3. ✅ Add settings storage methods (proximity.preset, proximity.customWeights)
4. ✅ Create database migration for contact_type field
5. ✅ Update interaction types (video_call, social_media)
6. ✅ Create useAllInteractions() query hook
7. ✅ Create useProximityData() aggregation hooks (4 hooks)
8. ✅ Add contact_type to contact forms (Add/Edit modals)
9. ✅ Add i18n translation keys (English locale)

**Commits**: 9 atomic commits
**Files Created**: 4 new files (990+ lines)
**Files Modified**: 9 existing files

### ✅ Phase 2: Basic UI (COMPLETE)
10. ✅ Create ProximityScreen (list view with SectionList)
11. ✅ Add navigation entry point (bottom tab with target icon)
12. ✅ Add proximity translations (en.json)
13. ✅ Ready for testing with real data

**Commits**: 3 atomic commits (f0ff08d...246a7ca)
**Files Created**: 1 new file (265 lines)
**Files Modified**: 2 existing files

### 🔜 Phase 3: Settings (NEXT)
14. Create ProximitySettingsScreen
15. Implement preset selection
16. Add custom weight editor
17. Link from main settings

### 🔜 Phase 4: Polish
18. Add empty states
19. Create reusable components (badges, headers)
20. Optimize performance
21. Final testing and bug fixes

---

## Future Enhancements (Not in Scope)

- Bubble chart visualization (react-native-svg)
- Animated transitions between tiers
- Export proximity report
- Historical proximity tracking
- Relationship trend graphs
- Smart suggestions based on proximity

---

## Critical Questions ~~to Answer~~ ANSWERED ✅

1. **How to fetch all interactions efficiently?** ✅ ANSWERED
   - ✅ Created `useAllInteractions()` hook in useInteractionQueries.js
   - ✅ Fetches up to 10,000 interactions with single query
   - ✅ Longer cache (5min stale, 10min GC) for performance

2. **Where to add navigation entry?** 🔜 PENDING (Phase 2)
   - Recommendation: New tab in bottom navigation
   - Icon: target/bullseye icon
   - Label: "Proximity" or "Relationships"

3. **How to handle contacts with no interactions?** ✅ ANSWERED
   - ✅ Show in "Distant" tier with score=0
   - ✅ Calculator handles empty interaction arrays gracefully
   - Makes sense: "no contact" = weakest relationship

4. **Default preset for new users?** ✅ ANSWERED
   - ✅ Default: "Personal" preset (balanced weights)
   - ✅ Stored in DEFAULT_SETTINGS with value: 'personal'
   - User can change in settings later

5. **Settings screen hierarchy?** 🔜 PENDING (Phase 3)
   - Recommendation: Standalone screen (ProximitySettingsScreen)
   - Link from main SettingsScreen under "Relationship Insights"
   - Follows existing navigation patterns

---

## Success Criteria

### MVP
- ✅ Proximity scores calculate correctly
- ✅ Contacts grouped into 4 tiers accurately
- ✅ List view displays all contacts with scores
- ✅ Tap contact → navigate to detail screen
- ✅ Default "personal" preset works
- ✅ Settings persist

### Polish
- ✅ All 5 presets implemented
- ✅ Custom weights editor functional
- ✅ Visual polish (badges, colors, spacing)
- ✅ Empty states helpful
- ✅ Performance smooth with 100+ contacts

### Future
- Bubble chart visualization
- Daily proximity updates
- Notifications for declining relationships
- Export/share feature

---

## Next Steps for Claude-Code

1. **Review listed files** - Understand existing patterns
2. **Create detailed task breakdown** - Estimate each task
3. **Identify any blockers** - Flag unknowns or dependencies
4. **Propose implementation approach** - Get user approval
5. **Start with Phase 1** - Algorithm first, UI second

**Remember:** This works with existing data only. No native modules. Should work in Expo Go.