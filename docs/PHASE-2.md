# Expo CRM - Phase 2 Development Plan

**Created**: November 11, 2025
**Status**: In Progress - Test Coverage Expansion
**Previous Phase**: Helper Functions Migration (11/11 Complete - 551+ patterns eliminated)

---

## 📊 Progress Tracker

### Test Coverage Expansion (Workstream 1)

| Module | Priority | Estimated Tests | Status | Actual Tests | Completion Date | Commit |
|--------|----------|----------------|--------|--------------|-----------------|--------|
| **Week 1: Core Validation & String Helpers** |
| `validators.js` | 🔥 Critical | ~300 | ✅ Complete | 87 | Nov 11, 2025 | [87b54ef](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/87b54ef) |
| `stringHelpers.js` | 🔥 Critical | ~100 | ✅ Complete | 64 | Nov 11, 2025 | [4097eab](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/4097eab) |
| **Week 2: Contact & File Helpers** |
| `contactHelpers.js` | ⭐ High | ~80 | ✅ Complete | 60 | Nov 11, 2025 | [255ad3b](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/255ad3b) |
| `fileHelpers.js` | ⭐ High | ~50 | ✅ Complete | 48 | Nov 11, 2025 | [9e75e78](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/9e75e78) |
| **Week 3: SQL & Error Helpers** |
| `sqlHelpers.js` | 🔥 Critical | ~100 | ✅ Complete | 96 | Nov 11, 2025 | [d2b78bf](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/d2b78bf) |
| `errorLogger.js` | 🔥 Critical | ~80 | ✅ Complete | 49 | Nov 11, 2025 | [416ba44](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/416ba44) |
| `errorHandler.js` | 🔥 Critical | ~60 | ✅ Complete | 45 | Nov 11, 2025 | [3cbcd42](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/3cbcd42) |
| **Week 4: Query & Async Helpers** |
| `queryHelpers.js` | ⭐ High | ~50 | ✅ Complete | 41 | Nov 11, 2025 | [753f0fd](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/753f0fd) |
| `useAsyncOperation.js` | ⭐ High | ~80 | ✅ Complete | 49 | Nov 11, 2025 | [efea85a](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/efea85a) |
| **Week 5: Permission Helpers** |
| `permissionHelpers.js` | 🎯 Medium | ~40 | ✅ Complete | 48 | Nov 11, 2025 | [287e2db](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/287e2db) |
| **Existing Tests** |
| `dateUtils.test.js` | - | - | ✅ Exists | 109 | (Pre-Phase 2) | - |
| `arrayHelpers.test.js` | - | - | ✅ Exists | 38 | (Pre-Phase 2) | - |

**Summary**:
- **Total Test Files**: 12 planned (10/10 new ✅, 2 existing)
- **Total Tests**: 734 current → ~1,000+ target
- **Progress**: 587/~940 new tests (62%)
- **Current Coverage**: All 10 modules complete! ✅ Validators + StringHelpers + ContactHelpers + FileHelpers + SqlHelpers + ErrorLogger + ErrorHandler + QueryHelpers + UseAsyncOperation + PermissionHelpers

### Overall Phase 2 Progress

| Workstream | Status | Progress | Start Date | Target Completion |
|------------|--------|----------|------------|-------------------|
| 1. Test Coverage Expansion | ✅ Complete | 10/10 modules | Nov 11, 2025 | Nov 11, 2025 |
| 2. New User-Facing Screens | 🚧 In Progress | 2/3 screens | Nov 13, 2025 | Nov 13, 2025 |
| 3. Performance Optimization | ⏳ Not Started | 0/5 tasks | - | Month 2 |
| 4. Enhanced Search & Filtering | ⏳ Not Started | 0/4 features | - | Month 3 |
| 5. Data Sync & Export | ⏳ Not Started | 0/3 features | - | Month 3 |

---

## Executive Summary

Phase 1 focused on **code quality and maintainability** through systematic helper function migration. Phase 2 shifts focus to **feature completeness, test coverage, and performance optimization** to make the CRM production-ready.

**Current State**:
- ✅ 79 source files, 994 KB codebase
- ✅ 11/11 helper categories implemented (100% complete)
- ✅ Clean architecture with factory pattern
- ✅ Comprehensive error handling
- 🟡 11 test files (686 tests - validators, stringHelpers, contactHelpers, fileHelpers, sqlHelpers, errorLogger, errorHandler, queryHelpers, useAsyncOperation, dateUtils, arrayHelpers) - **539 new tests added!**
- ⚠️ Missing key user-facing features (Dashboard, Company Management, Analytics)
- ⚠️ No performance optimization (React.memo, pagination, lazy loading)
- ⚠️ Basic search/filtering capabilities

---

## Table of Contents

1. [Phase 2 Goals](#phase-2-goals)
2. [Priority Ranking](#priority-ranking)
3. [Workstream 1: Test Coverage Expansion](#workstream-1-test-coverage-expansion)
4. [Workstream 2: New User-Facing Screens](#workstream-2-new-user-facing-screens)
5. [Workstream 3: Performance Optimization](#workstream-3-performance-optimization)
6. [Workstream 4: Enhanced Search & Filtering](#workstream-4-enhanced-search--filtering)
7. [Workstream 5: Data Sync & Export](#workstream-5-data-sync--export)
8. [Implementation Timeline](#implementation-timeline)
9. [Success Metrics](#success-metrics)
10. [Risk Assessment](#risk-assessment)

---

## Phase 2 Goals

### Primary Objectives
1. **Increase test coverage** from 2 files to 12+ files (all critical helpers)
2. **Add missing core features** (Dashboard, Company Management, Analytics)
3. **Optimize performance** for large datasets (1000+ contacts)
4. **Enhance search capabilities** (global search, advanced filters)
5. **Improve data portability** (better export/import, cloud sync foundation)

### Success Criteria
- ✅ **80%+ test coverage** on all helper utilities
- ✅ **3+ new screens** shipped (Dashboard, Companies, Analytics)
- ✅ **Performance benchmarks** met (list rendering <100ms for 1000 items)
- ✅ **Zero regressions** in existing features
- ✅ **User-reported issues** < 5 per release

---

## Priority Ranking

### 🔥 **Tier 1: Critical (Must Have)**
**Focus**: Foundation for future work, catch regressions, enable safe refactoring

1. **Test Coverage Expansion** (Workstream 1)
   - Risk: HIGH if skipped (no safety net for future changes)
   - Effort: Medium (2-3 days per module)
   - ROI: Very High (prevents bugs, enables confident refactoring)

### ⭐ **Tier 2: High Value (Should Have)**
**Focus**: User-facing features that unlock business value

2. **Company Management Screen** (Workstream 2.1)
   - Risk: Medium (companies table exists but no UI)
   - Effort: Low-Medium (1-2 days)
   - ROI: High (B2B CRM feature completeness)

3. **Dashboard/Home Screen** (Workstream 2.2)
   - Risk: Low (app works without it)
   - Effort: Medium (2-3 days)
   - ROI: High (first impression, UX improvement)

### 🎯 **Tier 3: Medium Value (Nice to Have)**
**Focus**: Performance and power user features

4. **Performance Optimization** (Workstream 3)
   - Risk: Low (app works, just slower with large datasets)
   - Effort: Low-Medium (incremental)
   - ROI: Medium-High (better UX, scalability)

5. **Enhanced Search & Filtering** (Workstream 4)
   - Risk: Low (basic search exists)
   - Effort: Medium (3-5 days)
   - ROI: Medium (power user productivity)

### 🚀 **Tier 4: Future Work (Could Have)**
**Focus**: Advanced features for scale and enterprise

6. **Cloud Sync & Advanced Export** (Workstream 5)
   - Risk: Low (local-only works for MVP)
   - Effort: High (1-2 weeks)
   - ROI: High for multi-device users, low for single-device

---

## Workstream 1: Test Coverage Expansion

### Current State
- **2 test files**: `dateUtils.test.js`, `arrayHelpers.test.js`
- **147 tests total**: 109 dateUtils + 38 arrayHelpers
- **0 tests** for 10 new helper modules created in Phase 1

### Missing Test Coverage (Priority Order)

#### Week 1: Core Validation & String Helpers
**Day 1-2: validators.js (15+ functions)**
```javascript
// Test categories:
- Type checking (is.string, is.number, is.array, is.object, etc.)
- Format validation (isValidEmail, isValidPhone)
- Integer validation (isPositiveInteger, isNonNegativeInteger)
- Batch validation (validateRequired)
- Data validation (hasValue)

// Critical edge cases:
- Nullish values (null, undefined)
- Empty values ('', [], {})
- Invalid formats (malformed emails/phones)
- Boundary conditions (0, -1, Infinity, NaN)
```

**Day 3: stringHelpers.js (7 functions)**
```javascript
// Test categories:
- safeTrim (null safety, whitespace handling)
- normalizeTrimLowercase (Unicode, multi-byte)
- hasContent (empty detection)
- filterNonEmpty (array/object field filtering)
- capitalize (Unicode, edge cases)
- truncate (length validation, suffix handling)

// Critical edge cases:
- Null/undefined inputs
- Unicode strings (emoji, multi-byte)
- Empty strings vs whitespace-only
- Very long strings (performance)
```

#### Week 2: Contact & File Helpers
**Day 4: contactHelpers.js (4 functions)**
```javascript
// Test categories:
- getContactDisplayName (priority order, fallbacks)
- getInitials (Unicode support, emoji handling)
- normalizePhoneNumber (international formats)
- formatPhoneNumber (prefix preservation, tel: URLs)

// Critical edge cases:
- Missing first/last names
- Unicode characters in names
- International phone numbers (+1, +44, etc.)
- Empty/null contact objects
```

**Day 5: fileHelpers.js (3 functions)**
```javascript
// Test categories:
- getFileExtension (path parsing, edge cases)
- isImageFile (all supported formats: jpg, png, gif, webp, heic, heif, avif)
- formatFileSize (bytes to human-readable, decimals)

// Critical edge cases:
- No extension files
- Multiple dots in filename
- Very large file sizes (TB+)
- Invalid byte values (negative, NaN)
```

#### Week 3: SQL & Error Helpers
**Day 6-7: sqlHelpers.js (4 functions)**
```javascript
// Test categories:
- placeholders (count validation, SQL injection safety)
- pick (field filtering, allowed lists)
- buildUpdateSet (SQL generation, empty data)
- buildInsert (complete INSERT statements)

// Critical edge cases:
- Empty data objects
- Special characters in values
- SQL injection attempts
- Large data sets (performance)
```

**Day 8-9: errorLogger.js (5 functions) + errorHandler.js**
```javascript
// Test categories:
- logger.error (context capture, formatting)
- logger.success (dev-only behavior)
- logger.warn/info/debug
- showAlert.* (Alert.alert mocking)
- getUserFriendlyError (error message mapping)

// Critical edge cases:
- Non-Error objects
- Missing stack traces
- Production vs development behavior
- Alert callback handling
```

#### Week 4: Query & Async Helpers
**Day 10: queryHelpers.js (2 functions)**
```javascript
// Test categories:
- invalidateQueries (parallel invalidation)
- createMutationHandlers (onSuccess/onError, logging)

// Critical edge cases:
- Empty query key arrays
- Failed invalidations
- Missing queryClient
- Callback error handling
```

**Day 11: useAsyncOperation.js (2 hooks)**
```javascript
// Test categories:
- useAsyncOperation (loading, error, reset states)
- useAsyncLoading (simplified loading-only)

// Critical edge cases:
- Async function errors
- Callback execution order
- Multiple execute calls
- Cleanup on unmount
```

#### Week 5: Permission Helpers
**Day 12: permissionHelpers.js (2 functions)**
```javascript
// Test categories:
- requestPermission (user feedback, logging)
- checkPermission (status checking)

// Critical edge cases:
- Permission denied
- System errors
- Custom messages
- Alert integration
```

### Test Infrastructure Setup

**Required Dependencies** (already installed):
```json
{
  "jest": "29.7.0",
  "@testing-library/react-native": "12.9.0",
  "jest-expo": "54.0.3",
  "react-test-renderer": "19.1.0"
}
```

**Test File Pattern**:
```
src/utils/__tests__/
├── validators.test.js       (NEW - ~300 tests)
├── stringHelpers.test.js    (NEW - ~100 tests)
├── contactHelpers.test.js   (NEW - ~80 tests)
├── fileHelpers.test.js      (NEW - ~50 tests)
├── dateUtils.test.js        (EXISTS - 109 tests)
└── arrayHelpers.test.js     (EXISTS - 38 tests)

src/database/__tests__/
└── sqlHelpers.test.js       (NEW - ~100 tests)

src/errors/utils/__tests__/
├── errorLogger.test.js      (NEW - ~80 tests)
└── errorHandler.test.js     (NEW - ~60 tests)

src/hooks/queries/__tests__/
└── queryHelpers.test.js     (NEW - ~50 tests)

src/hooks/__tests__/
└── useAsyncOperation.test.js (NEW - ~80 tests)

src/utils/__tests__/
└── permissionHelpers.test.js (NEW - ~40 tests)
```

**Coverage Goals**:
- **Overall**: 80%+ coverage on all helper modules
- **Critical paths**: 100% coverage (validation, SQL building)
- **Edge cases**: All documented edge cases tested
- **Integration**: Key integration scenarios covered

**Testing Standards**:
```javascript
// Standard test file structure
import { functionName } from '../helperModule';

describe('helperModule', () => {
  describe('functionName', () => {
    it('handles normal case', () => {
      expect(functionName(input)).toBe(expected);
    });

    it('handles null/undefined', () => {
      expect(functionName(null)).toBe(fallback);
      expect(functionName(undefined)).toBe(fallback);
    });

    it('handles edge case', () => {
      expect(functionName(edgeInput)).toBe(edgeExpected);
    });

    it('throws on invalid input', () => {
      expect(() => functionName(invalid)).toThrow();
    });
  });
});
```

### Deliverables
- ✅ **12 new test files** with comprehensive coverage
- ✅ **~1000+ new tests** across all helper modules
- ✅ **80%+ code coverage** on utils/, hooks/, errors/utils/
- ✅ **CI/CD integration** (GitHub Actions with test runs)
- ✅ **Coverage reports** (HTML reports for visibility)

### Success Metrics
- All helper functions have 3+ test cases (normal, null, edge)
- Zero test failures on main branch
- Coverage reports show 80%+ on targeted modules
- Tests run in <10 seconds (fast feedback loop)

---

## Workstream 2: New User-Facing Screens

### 2.1 Company Management (Priority 1)

**Current Gap**: Companies table exists with full CRUD operations, but **no UI** to create/edit/view companies.

#### Database Schema (Already Exists)
```sql
CREATE TABLE companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  industry TEXT,
  logo_attachment_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (logo_attachment_id) REFERENCES attachments(id) ON DELETE SET NULL
);
```

#### Required Screens

**1. CompanyListScreen**
- Location: `src/screens/CompanyListScreen.js`
- Features:
  - List all companies with logo/name/industry
  - Search companies by name
  - Filter by industry
  - Add company FAB
  - Edit/delete actions (swipe or menu)
  - Pull-to-refresh
- Similar to: ContactsList.js

**2. AddCompanyModal**
- Location: `src/components/AddCompanyModal.js`
- Fields:
  - Company name (required)
  - Industry (dropdown: Technology, Finance, Healthcare, Retail, etc.)
  - Logo upload (image picker)
- Validation: Name required, max 200 chars
- Similar to: AddContactModal.js

**3. EditCompanyModal**
- Location: `src/components/EditCompanyModal.js`
- Same fields as Add modal
- Pre-populate with existing data
- Similar to: EditContactModal.js

**4. CompanyDetailScreen (Optional)**
- Location: `src/screens/CompanyDetailScreen.js`
- Show company info + list of contacts at company
- Edit/delete actions
- Similar to: ContactDetailScreen.js

#### Integration Points
- **ContactDetailScreen**: Add company picker/display
- **AddContactModal**: Add company selection dropdown
- **Navigation**: Add Companies tab to bottom navigation (optional) or sub-nav

#### TanStack Query Hooks
```javascript
// src/hooks/queries/useCompanyQueries.js (NEW)
export const companyKeys = {
  all: ['companies'],
  lists: () => [...companyKeys.all, 'list'],
  list: (filters) => [...companyKeys.lists(), filters],
  details: () => [...companyKeys.all, 'detail'],
  detail: (id) => [...companyKeys.details(), id],
};

export function useCompanies(options = {}) { /* ... */ }
export function useCompany(id) { /* ... */ }
export function useCreateCompany() { /* ... */ }
export function useUpdateCompany() { /* ... */ }
export function useDeleteCompany() { /* ... */ }
```

#### Estimated Effort
- **CompanyListScreen**: 4-6 hours
- **AddCompanyModal**: 3-4 hours
- **EditCompanyModal**: 2-3 hours
- **Integration**: 2-3 hours
- **Testing**: 2-3 hours
- **Total**: 1-2 days

#### Success Criteria
- Users can create/edit/delete companies
- Companies appear in contact detail/edit screens
- Logo upload works via image picker
- Industry filtering works
- Zero crashes or data loss

---

### 2.2 Dashboard/Home Screen (Priority 2) ✅ Complete

**Status**: ✅ Complete - Shipped Nov 13, 2025
**Branch**: `screens/dashboard`
**Commits**: [c29ba67](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/c29ba67), [465ccf8](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/465ccf8), [a003b6d](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/a003b6d), [b05b843](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/b05b843), [4f720f9](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/4f720f9), [7dabafa](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/7dabafa), [c7db76c](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/c7db76c)

**Completed Features**:

**1. Quick Stats Cards** ✅
- Three cards showing Contacts, Interactions, and Events counts
- Real-time data from TanStack Query hooks
- Material Design 3 theming with dynamic colors
- Responsive text sizing with `adjustsFontSizeToFit` to prevent overflow

**2. Upcoming Events Section** ✅
- Shows next 5 upcoming events
- Event date and time display
- Recurring event indicators
- Empty state handling
- Quick add event button

**3. Quick Actions** ✅
- Add Contact button
- Add Interaction button
- Add Event button
- Column layout for easy access
- Modal integration with proper callbacks

**4. Pull-to-Refresh** ✅
- Refreshes all dashboard data
- Parallel refetch of contacts, interactions, and events
- Loading state feedback

**5. Centered Navigation** ✅
- Dashboard tab centered in bottom navigation
- Larger icon size (26px vs 24px) for prominence
- Key-based navigation (stable across route reordering)
- Dynamic route insertion for Companies tab support

**Removed/Deferred**:
- ~~Recent Activity Feed~~ - Redundant with Interactions tab
- ~~Search Bar~~ - Will be implemented in Workstream 4 (Global Search)
- ~~Category Shortcuts~~ - Deferred to future iteration

#### Implementation Details

**File Created**: [src/screens/DashboardScreen.js](../test-fresh/src/screens/DashboardScreen.js)

**TanStack Query Hooks Used**:
```javascript
const { data: contacts = [], isLoading: loadingContacts, refetch: refetchContacts }
  = useContactsWithInfo();
const { data: events = [], isLoading: loadingEvents, refetch: refetchEvents }
  = useUpcomingEvents();
const { data: interactions = [], isLoading: loadingInteractions, refetch: refetchInteractions }
  = useInteractions();
```

**Navigation Integration** ([App.js](../test-fresh/App.js)):
```javascript
// Dashboard centered in bottom navigation (3rd position)
const routes = [
  { key: 'contacts', ... },
  { key: 'interactions', ... },
  { key: 'dashboard', ... },  // Center position
  { key: 'events', ... },
  { key: 'settings', ... }
];

// Key-based navigation (stable across route reordering)
const [activeKey, setActiveKey] = React.useState('dashboard');
const index = routes.findIndex(r => r.key === activeKey);
```

**i18n Support**: All 5 languages (en, es, fr, de, zh-Hans)

**Key Technical Achievements**:
1. Fixed text overflow in stat cards with `numberOfLines={1}` and `adjustsFontSizeToFit`
2. Refactored navigation from brittle numeric index to stable key-based system
3. Fixed modal callbacks from `onSave` to `onInteractionAdded`/`onEventAdded`
4. Added full i18n support including Companies tab
5. Implemented ScrollView with RefreshControl for pull-to-refresh

#### Actual Effort
- **Total**: 7 commits over 1 session
- **Time**: ~2-3 hours (including bug fixes and polish)

#### Success Criteria Met ✅
- ✅ Dashboard loads quickly with real-time data
- ✅ Stats are accurate (live counts from database)
- ✅ Quick actions work (modals open and refetch on save)
- ✅ Pull-to-refresh updates all sections in parallel
- ✅ Responsive layout with ScrollView
- ✅ No text overflow issues
- ✅ Stable navigation across route reordering
- ✅ Full internationalization support

---

### 2.3 Analytics/Reports Screen (Priority 3) ✅ Complete

**Status**: ✅ Complete - Shipped Nov 13, 2025
**Branch**: `screens/analytics`
**Commit**: [2f0e81a](https://github.com/Masked-Kunsiquat/crm-orbit2/commit/2f0e81a)

**Completed Features**:

**1. Overview Statistics** ✅
- Total contacts count with primary color theme
- Total interactions count with secondary color theme
- Total events count with tertiary color theme
- Three-column responsive grid layout

**2. Date Range Filtering** ✅
- Filter chips: All Time, Last 7 Days, Last 30 Days, Last 90 Days
- Dynamic data filtering based on selected range
- Applies to both interaction stats and top contacts

**3. Interaction Analytics** ✅
- Breakdown by type (call, text, email, meeting, other)
- Count display for each interaction type
- Unique contacts count indicator
- Leverages `interactionsStats.js` database queries

**4. Event Analytics** ✅
- Upcoming events count (future dates)
- Past events count (historical)
- Two-column layout with color-coded stats

**5. Top Contacts** ✅
- Top 5 most active contacts by interaction count
- Ranked list (#1, #2, #3, #4, #5)
- Display name and interaction count
- Empty state handling

**6. User Experience** ✅
- Pull-to-refresh functionality
- Loading states for all sections
- Empty state messages
- Back button navigation
- Accessible from Dashboard via header button

**Deferred Features** (can be added in future iterations):
- ~~Visual charts (pie, line, bar)~~ - Text-based stats sufficient for MVP
- ~~Export options~~ - Will be implemented in Workstream 5 (Data Sync & Export)
- ~~Contact growth trends~~ - Can be added when charting library is integrated
- ~~Busiest days/times analysis~~ - Advanced analytics for future iteration

#### Implementation Details

**File Created**: [src/screens/AnalyticsScreen.js](../test-fresh/src/screens/AnalyticsScreen.js)

**TanStack Query Hooks Created**: [src/hooks/queries/useAnalyticsQueries.js](../test-fresh/src/hooks/queries/useAnalyticsQueries.js)
```javascript
// Analytics-specific hooks with 2-minute stale time
useInteractionStats(filters, options)
useTopContacts(options, queryOptions)
useInteractionTrends(options, queryOptions)
useContactInteractionSummary(contactId, options)
```

**Database Queries Leveraged**:
```javascript
// src/database/interactionsStats.js functions used:
- getStatistics(options) // Total counts, by type, unique contacts
- getTopContacts(options) // Most active contacts by interaction count
- getInteractionTrends(options) // Time series data (not used in MVP)
- getContactInteractionSummary(contactId) // Per-contact breakdown (not used in MVP)
```

**Navigation Integration** ([App.js](../test-fresh/App.js)):
```javascript
// Added to Stack Navigator for modal-style presentation
<Stack.Screen name="Analytics" component={AnalyticsScreen} />

// Accessible from Dashboard header with chart-bar icon
<Appbar.Action icon="chart-bar" onPress={() => navigation.navigate('Analytics')} />
```

**i18n Support**: All 5 languages (en, es, fr, de, zh-Hans)

**Key Technical Achievements**:
1. No external chart dependencies required (text-based stats)
2. Efficient date range filtering with ISO date handling
3. Real-time calculation of interaction type breakdowns
4. Leveraged existing `interactionsStats.js` infrastructure
5. Pull-to-refresh with parallel query refetching

#### Actual Effort
- **Total**: 1 commit in ~2 hours
- **LoC**: 445 insertions (AnalyticsScreen + hooks + i18n)

#### Success Criteria Met ✅
- ✅ Analytics screen loads quickly with real-time data
- ✅ Date range filtering works correctly
- ✅ All stats are accurate (verified against database queries)
- ✅ Pull-to-refresh updates all sections in parallel
- ✅ Responsive layout with ScrollView
- ✅ Clean navigation from Dashboard
- ✅ Empty states handle no-data scenarios
- ✅ Full internationalization support

**Note**: Visual charts (pie, line, bar) deferred to future iteration. Text-based stats provide sufficient analytics for MVP while avoiding the complexity and dependencies of chart libraries.

---

## Workstream 3: Performance Optimization

### Current Performance Issues

**Problem Areas**:
1. **List rendering**: No virtualization for large datasets
2. **No memoization**: Components re-render unnecessarily
3. **No pagination**: Loading all records at once
4. **No lazy loading**: All screens loaded upfront
5. **No caching strategy tuning**: Default TanStack Query settings

### 3.1 React.memo Optimization

**Target Components** (8 components):
```javascript
// src/components/ContactCard.js
export default React.memo(ContactCard, (prev, next) => {
  return prev.contact.id === next.contact.id &&
         prev.contact.updated_at === next.contact.updated_at;
});

// src/components/InteractionCard.js
// src/components/ContactAvatar.js
// src/components/AddContactModal.js
// src/components/EditContactModal.js
// src/components/AddInteractionModal.js
// src/components/AddEventModal.js
// src/components/InteractionDetailModal.js
```

**Expected Impact**:
- 30-50% reduction in unnecessary re-renders
- Faster scrolling in long lists
- Better battery life

**Effort**: 1-2 hours per component (1 day total)

---

### 3.2 Database Pagination

**Current Problem**: Loading 1000+ contacts causes slow initial render.

**Solution**: Add pagination to database queries
```javascript
// src/database/contacts.js
async getAll({ limit = 50, offset = 0, ...filters } = {}) {
  const sql = `
    SELECT * FROM contacts
    WHERE 1=1
    ${filters.search ? 'AND display_name LIKE ?' : ''}
    ORDER BY display_name ASC
    LIMIT ? OFFSET ?
  `;
  const params = [
    ...(filters.search ? [`%${filters.search}%`] : []),
    limit,
    offset
  ];
  return execute(sql, params);
}
```

**UI Changes**: Infinite scroll with FlatList
```jsx
<FlatList
  data={contacts}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  ListFooterComponent={loading ? <ActivityIndicator /> : null}
/>
```

**Effort**: 2-3 hours per list screen (1 day total)

---

### 3.3 TanStack Query Cache Tuning

**Current Settings** (default):
```javascript
staleTime: 5 * 60 * 1000,  // 5 minutes
gcTime: 10 * 60 * 1000,    // 10 minutes (formerly cacheTime)
```

**Optimized Settings** (by use case):
```javascript
// Contacts (change infrequently)
staleTime: 10 * 60 * 1000,  // 10 minutes
gcTime: 30 * 60 * 1000,     // 30 minutes

// Interactions (update frequently)
staleTime: 1 * 60 * 1000,   // 1 minute
gcTime: 5 * 60 * 1000,      // 5 minutes

// Settings (rarely change)
staleTime: Infinity,        // Never stale
gcTime: Infinity,           // Never garbage collect
```

**Effort**: 1-2 hours

---

### 3.4 Lazy Loading Screens

**Current Problem**: All screens loaded upfront, slowing app startup.

**Solution**: Use React.lazy + Suspense
```javascript
// App.js
const ContactDetailScreen = React.lazy(() => import('./screens/ContactDetailScreen'));
const AddContactModal = React.lazy(() => import('./components/AddContactModal'));

<Suspense fallback={<ActivityIndicator />}>
  <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
</Suspense>
```

**Effort**: 2-3 hours

---

### 3.5 Image Optimization

**Current Problem**: Large avatar images not compressed/cached.

**Solution**: Add image caching + compression
```javascript
// src/services/fileService.js
import * as ImageManipulator from 'expo-image-manipulator';

async saveFile(uri, mimeType) {
  // Compress images before saving
  if (isImageFile(uri)) {
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    uri = compressed.uri;
  }
  // ... save logic
}
```

**Effort**: 2-3 hours

---

### Performance Testing

**Benchmarks to Track**:
```javascript
// src/utils/performance.js
export function measureRenderTime(componentName, fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`${componentName} render: ${end - start}ms`);
  return result;
}
```

**Target Metrics**:
- **List rendering**: <100ms for 1000 items
- **App startup**: <2 seconds to interactive
- **Navigation**: <300ms between screens
- **Search**: <500ms for 1000+ records

**Effort**: 1 day for setup + ongoing monitoring

---

## Workstream 4: Enhanced Search & Filtering

### Current State
- Basic search exists in ContactsList (display_name LIKE)
- No global search across entities
- No advanced filtering
- No saved searches
- No bulk actions

### 4.1 Global Search

**Features**:
- Search across contacts, companies, interactions, events, notes
- Type-ahead suggestions
- Recent searches history
- Search results grouped by entity type

**UI Design**:
```jsx
// src/screens/GlobalSearchScreen.js
<SearchBar
  placeholder="Search contacts, interactions, events..."
  value={query}
  onChangeText={setQuery}
/>

<SectionList
  sections={[
    { title: 'Contacts', data: contactResults },
    { title: 'Companies', data: companyResults },
    { title: 'Interactions', data: interactionResults },
    { title: 'Events', data: eventResults },
  ]}
  renderItem={({ item, section }) => (
    <SearchResultCard item={item} type={section.title} />
  )}
/>
```

**Database Implementation**:
```javascript
// src/database/globalSearch.js
export async function globalSearch(query, options = {}) {
  const results = await Promise.all([
    database.contacts.search(query, { limit: 10 }),
    database.companies.search(query, { limit: 10 }),
    database.interactions.search(query, { limit: 10 }),
    database.events.search(query, { limit: 10 }),
  ]);

  return {
    contacts: results[0],
    companies: results[1],
    interactions: results[2],
    events: results[3],
  };
}
```

**Effort**: 3-4 days

---

### 4.2 Advanced Filtering

**Contact Filters**:
- Multiple categories (AND/OR logic)
- Date added range
- Has/hasn't interacted in X days
- Has upcoming events
- By company

**Interaction Filters**:
- Date range (last 7/30/90 days, custom)
- Multiple types (calls, emails, meetings)
- By contact
- By location
- Has notes/attachments

**Event Filters**:
- Date range
- Event type
- Has reminder
- Recurring vs one-time

**UI Design**:
```jsx
// src/components/FilterBottomSheet.js
<BottomSheet visible={showFilters} onDismiss={closeFilters}>
  <View style={styles.filterSection}>
    <Text variant="titleMedium">Categories</Text>
    <View style={styles.chips}>
      {categories.map(cat => (
        <Chip
          key={cat.id}
          selected={selectedCategories.includes(cat.id)}
          onPress={() => toggleCategory(cat.id)}
        >
          {cat.name}
        </Chip>
      ))}
    </View>
  </View>

  <View style={styles.filterSection}>
    <Text variant="titleMedium">Date Added</Text>
    <DateRangePicker
      startDate={startDate}
      endDate={endDate}
      onChangeStart={setStartDate}
      onChangeEnd={setEndDate}
    />
  </View>

  <Button mode="contained" onPress={applyFilters}>
    Apply Filters
  </Button>
</BottomSheet>
```

**Effort**: 2-3 days

---

### 4.3 Saved Searches

**Features**:
- Save filter combinations with name
- Quick access to saved searches
- Edit/delete saved searches
- Share saved search configuration

**Database Schema**:
```sql
CREATE TABLE saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'contacts', 'interactions', 'events'
  filters TEXT NOT NULL, -- JSON string
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**Effort**: 1-2 days

---

### 4.4 Bulk Actions

**Features**:
- Select multiple contacts
- Bulk categorize
- Bulk delete
- Bulk export

**UI Design**:
```jsx
// ContactsList.js
const [selectedIds, setSelectedIds] = useState([]);
const [selectionMode, setSelectionMode] = useState(false);

// Show selection mode toolbar
{selectionMode && (
  <View style={styles.selectionToolbar}>
    <Text>{selectedIds.length} selected</Text>
    <IconButton icon="tag" onPress={() => bulkCategorize(selectedIds)} />
    <IconButton icon="delete" onPress={() => bulkDelete(selectedIds)} />
    <IconButton icon="export" onPress={() => bulkExport(selectedIds)} />
  </View>
)}
```

**Effort**: 2-3 days

---

## Workstream 5: Data Sync & Export

### 5.1 Enhanced Export

**Current State**: Basic backup to JSON exists.

**Enhancements**:
- **vCard export** for contacts (industry standard)
- **iCal export** for events (calendar import)
- **Excel export** for analytics
- **PDF reports** for interactions/events

**Implementation**:
```javascript
// src/services/exportService.js
export async function exportContactsAsVCard(contactIds) {
  const contacts = await database.contacts.getByIds(contactIds);
  const vcards = contacts.map(contact => `
BEGIN:VCARD
VERSION:3.0
FN:${contact.display_name}
N:${contact.last_name};${contact.first_name}
TEL;TYPE=MOBILE:${contact.primary_phone}
EMAIL:${contact.primary_email}
END:VCARD
  `).join('\n');

  return vcards;
}

export async function exportEventsAsICalendar(eventIds) {
  const events = await database.events.getByIds(eventIds);
  const ical = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Expo CRM//EN
${events.map(event => `
BEGIN:VEVENT
UID:${event.id}
DTSTAMP:${formatICalDate(event.created_at)}
DTSTART:${formatICalDate(event.event_date)}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
END:VEVENT
`).join('\n')}
END:VCALENDAR
  `;

  return ical;
}
```

**Dependencies**:
```bash
npm install react-native-file-viewer  # Open exported files
npm install react-native-share        # Share files
```

**Effort**: 3-4 days

---

### 5.2 Import Wizard

**Features**:
- Import from CSV with field mapping
- Import from other CRMs (Salesforce, HubSpot CSV exports)
- Duplicate detection
- Preview before import
- Undo import

**UI Flow**:
```
1. Select File → 2. Map Fields → 3. Preview → 4. Import → 5. Success
```

**Implementation**:
```javascript
// src/services/importService.js
export async function importContactsFromCSV(uri, fieldMapping) {
  // 1. Parse CSV
  const rows = await parseCSV(uri);

  // 2. Map fields
  const contacts = rows.map(row => ({
    first_name: row[fieldMapping.first_name],
    last_name: row[fieldMapping.last_name],
    email: row[fieldMapping.email],
    phone: row[fieldMapping.phone],
  }));

  // 3. Detect duplicates
  const { new: newContacts, duplicates } = await detectDuplicates(contacts);

  // 4. Return for preview
  return { newContacts, duplicates };
}
```

**Effort**: 4-5 days

---

### 5.3 Cloud Sync (Future - High Effort)

**Requirements**:
- Backend API (Node.js + Postgres or Supabase)
- Authentication (OAuth or JWT)
- Conflict resolution
- Offline queue
- Real-time sync

**Architecture**:
```
Mobile App (SQLite) ←→ Sync Service ←→ Cloud DB (Postgres)
                           ↓
                    Conflict Resolver
```

**Effort**: 2-3 weeks (backend + mobile client)

**Note**: Consider **Supabase** or **Firebase** for faster implementation:
```bash
npm install @supabase/supabase-js
```

---

## Implementation Timeline

### 3-Month Roadmap

#### Month 1: Foundation & Testing
**Week 1-2: Test Coverage (Workstream 1)**
- Days 1-2: validators.js + stringHelpers.js
- Days 3-4: contactHelpers.js + fileHelpers.js
- Days 5-7: sqlHelpers.js + errorLogger.js
- Days 8-10: errorHandler.js + queryHelpers.js + useAsyncOperation.js + permissionHelpers.js

**Week 3-4: Company Management (Workstream 2.1)**
- Days 1-2: CompanyListScreen + AddCompanyModal
- Days 3-4: EditCompanyModal + integration
- Day 5: Testing + bug fixes

#### Month 2: User Features
**Week 5-6: Dashboard (Workstream 2.2)**
- Days 1-2: Stats cards + layout
- Days 3-4: Recent activity + upcoming events
- Day 5: Quick actions + polish

**Week 7-8: Performance (Workstream 3)**
- Days 1-2: React.memo all components
- Days 3-4: Pagination implementation
- Day 5: TanStack Query tuning + lazy loading

#### Month 3: Advanced Features
**Week 9-10: Enhanced Search (Workstream 4)**
- Days 1-3: Global search
- Days 4-5: Advanced filtering
- Days 6-7: Saved searches + bulk actions

**Week 11-12: Export Enhancement (Workstream 5)**
- Days 1-2: vCard export
- Days 3-4: iCal export + Excel reports
- Days 5-7: Import wizard

---

### Agile Sprint Planning

**Sprint Structure**: 2-week sprints

**Sprint 1-2**: Test Coverage (Workstream 1)
- Goal: 80%+ coverage on all helpers
- Stories: 12 test files, ~1000 tests
- Demo: Coverage reports + CI integration

**Sprint 3**: Company Management (Workstream 2.1)
- Goal: Ship company CRUD UI
- Stories: 3 screens, integration, testing
- Demo: Create/edit/delete companies + assign to contacts

**Sprint 4**: Dashboard (Workstream 2.2)
- Goal: Ship home screen
- Stories: Stats, activity feed, events, quick actions
- Demo: Landing page with key metrics

**Sprint 5**: Performance (Workstream 3)
- Goal: Handle 1000+ contacts smoothly
- Stories: Memoization, pagination, lazy loading
- Demo: Performance benchmarks before/after

**Sprint 6**: Search (Workstream 4)
- Goal: Power user productivity
- Stories: Global search, filters, bulk actions
- Demo: Search across entities + bulk operations

**Sprint 7**: Export (Workstream 5)
- Goal: Data portability
- Stories: vCard, iCal, import wizard
- Demo: Export contacts to vCard + import from CSV

---

## Success Metrics

### Quantitative Metrics

**Test Coverage**:
- ✅ 80%+ overall coverage on helpers
- ✅ 100% coverage on critical paths (validation, SQL)
- ✅ Zero test failures on main branch

**Performance**:
- ✅ List rendering <100ms for 1000 items
- ✅ App startup <2 seconds
- ✅ Navigation <300ms between screens
- ✅ Search <500ms for large datasets

**Feature Completeness**:
- ✅ 3+ new screens shipped (Dashboard, Companies, Analytics)
- ✅ All database entities have UI (contacts, companies, interactions, events, notes)
- ✅ Export to 3+ formats (vCard, iCal, CSV)

**Code Quality**:
- ✅ Zero regressions in existing features
- ✅ <5 user-reported bugs per release
- ✅ All PRs pass CI/CD tests

### Qualitative Metrics

**User Experience**:
- Smooth scrolling in all lists
- Fast search results
- Intuitive navigation
- No crashes or data loss

**Developer Experience**:
- Easy to add new features
- Fast test feedback loop (<10s)
- Clear error messages
- Good documentation

---

## Risk Assessment

### High Risk

**1. Test Coverage Expansion**
- **Risk**: Writing 1000+ tests is time-consuming, may uncover bugs
- **Mitigation**: Start with most critical helpers (validators, SQL), fix bugs as found
- **Contingency**: Prioritize critical path coverage (80% vs 100%)

**2. Performance at Scale**
- **Risk**: App may still be slow with 10,000+ contacts
- **Mitigation**: Implement pagination early, test with large datasets
- **Contingency**: Add "Archive" feature to hide old contacts

### Medium Risk

**3. Cloud Sync Complexity**
- **Risk**: Backend development + conflict resolution is complex
- **Mitigation**: Use Supabase/Firebase for faster implementation
- **Contingency**: Ship local-only MVP first, add sync in Phase 3

**4. Import Wizard Edge Cases**
- **Risk**: Many CSV formats, duplicate detection is tricky
- **Mitigation**: Start with simple CSV format, add complexity iteratively
- **Contingency**: Manual import via backup/restore as fallback

### Low Risk

**5. New Screens**
- **Risk**: UI/UX may not meet user expectations
- **Mitigation**: Follow existing Material Design patterns, user testing
- **Contingency**: Iterate based on feedback

---

## Next Steps

### Immediate Actions (This Week)

1. **Review and approve** this Phase 2 plan
2. **Create feature branch**: `feat/phase-2-testing`
3. **Start with Workstream 1**: Write tests for validators.js
4. **Set up CI/CD**: GitHub Actions with test runs + coverage reports
5. **Create tracking board**: GitHub Projects or Jira for sprint planning

### Blocked On

- CodeRabbit review of Component Patterns PR
- User approval of Phase 2 priorities

### Questions for Stakeholders

1. **Priority confirmation**: Should we start with testing (recommended) or new features (quicker user value)?
2. **Cloud sync timeline**: Is this Phase 2 or Phase 3? Do we need backend development?
3. **Analytics priority**: Should we ship Dashboard before Analytics screen?
4. **Resource allocation**: Solo developer or team effort? Affects timeline.

---

**Document Version**: 1.0
**Created By**: Claude Code
**Next Review**: After Sprint 1 completion
**Status**: Awaiting Approval
