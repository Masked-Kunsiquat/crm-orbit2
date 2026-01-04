# Codes Feature Implementation Plan

## Overview

This document outlines the implementation plan for adding a secure codes storage feature to the CRM. The feature will allow storing access codes (door codes, lockbox combinations, etc.) for accounts with proper security measures.

### Goals

1. **Secure Storage**: Store sensitive access codes with encryption
2. **Account-Specific**: Codes are linked only to accounts (not contacts/orgs)
3. **Typed Codes**: Support different code types (door, lockbox, alarm, gate, other)
4. **Biometric Protection**: Require fingerprint/PIN authentication to view codes
5. **User-Friendly**: Blur codes by default, tap to reveal with authentication

### Navigation Changes

We've restructured the bottom navigation to make room for this feature:

**Before:**
- Organizations | Accounts | Contacts | Notes | **Interactions**

**After:**
- Organizations | Accounts | Contacts | **Notes & Interactions** | **Misc** ⚡

The Misc tab will house Codes and other utility features.

---

## Implementation Phases

### ✅ Phase 1: Navigation Restructure (COMPLETED)

**Status:** Complete and committed (ae7ecc6)

**What we did:**
- Consolidated Notes + Interactions into single tab with landing screen
- Created new Misc tab infrastructure
- Landing screen shows entity counts instead of chevrons
- All TypeScript checks passing

**Files Created:**
- `CRMOrbit/views/screens/notes/NotesAndInteractionsLandingScreen.tsx`
- `CRMOrbit/views/screens/misc/MiscLandingScreen.tsx`
- `CRMOrbit/views/navigation/MiscStack.tsx`

**Files Modified:**
- `CRMOrbit/views/navigation/NotesStack.tsx` - now includes Interactions screens
- `CRMOrbit/views/navigation/RootTabs.tsx` - replaced Interactions with Misc
- `CRMOrbit/views/navigation/types.ts` - consolidated navigation types

**Files Removed:**
- `CRMOrbit/views/navigation/InteractionsStack.tsx`
- `CRMOrbit/views/screens/InteractionsScreen.tsx`

---

### 📋 Phase 2: Codes Data Model & Basic CRUD (No Security)

**Status:** Not started

**Objective:** Implement the core Codes feature with basic functionality (plaintext for now)

#### 2.1 Domain Model

**File:** `CRMOrbit/domains/code.ts`

```typescript
export interface Code extends Entity {
  accountId: EntityId;    // Codes belong to accounts only
  label: string;          // "Front Door", "Main Gate", "Lockbox #3"
  codeValue: string;      // The actual code (will be encrypted in Phase 4)
  type: CodeType;         // Type of code
  notes?: string;         // Additional context/instructions
}

export type CodeType =
  | "code.type.door"
  | "code.type.lockbox"
  | "code.type.alarm"
  | "code.type.gate"
  | "code.type.other";
```

#### 2.2 Database Schema & Events

**Files to update:**
- `CRMOrbit/domains/persistence/schema.ts` - already uses event sourcing
- `CRMOrbit/domains/events/index.ts` - add code events

**New Events:**
```typescript
- code.created
- code.updated
- code.deleted
```

**Store Updates:**
- Add codes to Automerge document: `doc.codes[id]`
- Add relation: `accountCodes` mapping

#### 2.3 Store Hooks & Actions

**File:** `CRMOrbit/views/store/store.ts`

**New Hooks:**
```typescript
export const useCodes = (accountId: EntityId): Code[]
export const useAllCodes = (): Code[]
export const useCode = (codeId: EntityId): Code | undefined
export const useCodeActions = (deviceId: string)
```

#### 2.4 Screens

**Files to create:**

1. **CodesList Screen**
   - `CRMOrbit/views/screens/codes/CodesListScreen.tsx`
   - Shows all codes across all accounts
   - Groups by account or shows flat list
   - FAB to create new code

2. **CodeDetail Screen**
   - `CRMOrbit/views/screens/codes/CodeDetailScreen.tsx`
   - Shows code details (label, type, value, notes)
   - Links to parent account
   - Edit and delete buttons
   - **Phase 2: Code visible in plaintext**
   - **Phase 4: Code blurred, tap to reveal with auth**

3. **CodeForm Screen**
   - `CRMOrbit/views/screens/codes/CodeFormScreen.tsx`
   - Create/edit code form
   - Fields: Account (picker), Label, Type (segmented), Code Value, Notes
   - Validation: account required, label required, code value required

#### 2.5 Navigation Updates

**Update:** `CRMOrbit/views/navigation/types.ts`

```typescript
export type MiscStackParamList = {
  MiscLanding: undefined;
  CodesList: undefined;
  CodeDetail: { codeId: EntityId };
  CodeForm: {
    codeId?: EntityId;
    accountId?: EntityId; // Pre-fill when creating from Account detail
  };
};
```

**Update:** `CRMOrbit/views/navigation/MiscStack.tsx`

Add Codes screens to stack navigator.

**Update:** `CRMOrbit/views/screens/misc/MiscLandingScreen.tsx`

Add "Codes" card (similar to Notes/Interactions landing screen).

#### 2.6 Account Detail Integration

**Update:** `CRMOrbit/views/screens/accounts/AccountDetailScreen.tsx`

Add new "Codes" tab or section showing:
- List of codes for this account
- "Add Code" button
- Navigate to CodeDetail when tapped

#### 2.7 i18n Translations

**Update:** `CRMOrbit/i18n/en.json`

```json
{
  "codes.title": "Codes",
  "codes.listTitle": "All Codes",
  "codes.emptyTitle": "No codes yet",
  "codes.emptyHint": "Tap the + button to create one",
  "codes.form.labelPlaceholder": "e.g., Front Door, Lockbox #3",
  "code.type.door": "Door",
  "code.type.lockbox": "Lockbox",
  "code.type.alarm": "Alarm",
  "code.type.gate": "Gate",
  "code.type.other": "Other",
  // ... etc
}
```

#### 2.8 Testing Checklist

- [ ] Create code from Codes list
- [ ] Create code from Account detail
- [ ] Edit existing code
- [ ] Delete code
- [ ] View code on Account detail
- [ ] Navigate between Codes and Accounts
- [ ] TypeScript checks pass
- [ ] No console errors

**Deliverable:** Functional Codes feature with basic CRUD, no security yet.

---

### 🔐 Phase 3: Local Authentication Foundation

**Status:** Not started

**Objective:** Add biometric/PIN authentication infrastructure

#### 3.1 Dependencies

**Install:**
```bash
npx expo install expo-local-authentication expo-secure-store
```

**Packages:**
- `expo-local-authentication` - Biometric (Face ID, Touch ID, fingerprint)
- `expo-secure-store` - Encrypted key-value storage

#### 3.2 Authentication Hook

**File:** `CRMOrbit/views/hooks/useLocalAuth.ts`

```typescript
export const useLocalAuth = () => {
  const authenticate = async (reason: string): Promise<boolean> => {
    // Check if biometrics available
    // Prompt for authentication
    // Return success/failure
  };

  const isAvailable = async (): Promise<boolean> => {
    // Check hardware support
  };

  return { authenticate, isAvailable };
};
```

#### 3.3 Authentication UX Strategy

**Selected Approach:** Blur codes by default, auth to reveal each one

**User Flow:**
1. User navigates to CodeDetailScreen
2. Code value displayed as `••••••••`
3. User taps on blurred code
4. Biometric prompt appears: "Authenticate to view code"
5. On success: Code revealed for 30 seconds, then auto-blur
6. On failure: Code remains blurred, retry option

**Additional Features:**
- Copy code to clipboard (also requires auth)
- Settings to configure auth timeout
- Fallback to device PIN if biometrics fail

#### 3.4 Settings Integration

**Optional:** Add settings screen for security preferences

**File:** `CRMOrbit/views/screens/settings/SecuritySettings.tsx`

Options:
- Enable/disable biometric auth for codes
- Auto-blur timeout (15s, 30s, 60s, never)
- Require auth on every code view vs. session-based

#### 3.5 Testing Checklist

- [ ] Biometric prompt appears when tapping blurred code
- [ ] Code reveals on successful authentication
- [ ] Code re-blurs after timeout
- [ ] Fallback to device PIN works
- [ ] Copy to clipboard requires auth
- [ ] Graceful handling when biometrics not available

**Deliverable:** Working authentication layer, ready for code encryption.

---

### 🔒 Phase 4: Encrypted Storage & Reveal UX

**Status:** Not started

**Objective:** Encrypt codes at rest, implement tap-to-reveal with biometrics

#### 4.1 Encryption Strategy

**Approach:** Use `expo-secure-store` for encryption key, encrypt codes before storing in SQLite

**Key Management:**
- Generate encryption key on first use
- Store key in `SecureStore` (hardware-backed on iOS/Android)
- Use key to encrypt/decrypt code values

**File:** `CRMOrbit/utils/encryption.ts`

```typescript
export const encryptCode = async (plaintext: string): Promise<string>
export const decryptCode = async (ciphertext: string): Promise<string>
```

**Considerations:**
- What happens if encryption key is lost? (Device reset, app reinstall)
- Should we support backup/export of codes? (encrypted JSON export)
- Key rotation strategy?

#### 4.2 Update Code Model

**File:** `CRMOrbit/domains/code.ts`

```typescript
export interface Code extends Entity {
  accountId: EntityId;
  label: string;
  codeValue: string;        // Now encrypted
  type: CodeType;
  notes?: string;
  isEncrypted: boolean;     // Flag for migration
}
```

#### 4.3 Migration Strategy

**Challenge:** Existing codes (from Phase 2) are plaintext

**Options:**
1. **Encrypt on first access** - When user views code, encrypt it
2. **One-time migration** - Encrypt all codes on Phase 4 upgrade
3. **Flag-based** - `isEncrypted` field, handle both cases

**Recommended:** Option 3 (safest, supports gradual migration)

#### 4.4 CodeDetail Screen Update

**File:** `CRMOrbit/views/screens/codes/CodeDetailScreen.tsx`

**Features:**
- Display code as `••••••••` by default
- Tap to reveal → biometric prompt → decrypt → show plaintext
- Auto-blur after timeout
- Copy button (also requires auth, copies decrypted value)
- Visual indicator when code is revealed (e.g., green border)

**Components:**
```typescript
<BlurredCode
  codeValue={code.codeValue}
  isEncrypted={code.isEncrypted}
  onReveal={handleReveal}
/>
```

#### 4.5 Security Audit

**Checklist:**
- [ ] Codes encrypted before storage in SQLite
- [ ] Encryption key never logged or exposed
- [ ] Decrypted values only in memory, never persisted
- [ ] No plaintext codes in crash logs
- [ ] Clipboard cleared after X seconds (optional)
- [ ] Screenshots disabled on code screens (iOS/Android)
- [ ] App background blur when codes visible (prevent task switcher leak)

#### 4.6 Error Handling

**Scenarios:**
- Encryption fails during code creation → Show error, don't save
- Decryption fails during code view → Show "Unable to decrypt" message
- Biometric auth canceled → Code stays blurred
- Encryption key lost (app reinstall) → Codes unrecoverable (warn user)

#### 4.7 Testing Checklist

- [ ] New codes encrypted on creation
- [ ] Codes decrypt correctly with authentication
- [ ] Auto-blur works after timeout
- [ ] Copy to clipboard requires auth
- [ ] Encryption key survives app restart
- [ ] Graceful handling when decryption fails
- [ ] Migration from plaintext codes works

**Deliverable:** Fully secure codes feature with encryption and biometric protection.

---

## Technical Decisions

### Why Not Use Notes for Codes?

**Considered:** Storing codes as a special type of Note

**Rejected because:**
1. **Security model differs** - Notes don't need encryption, codes do
2. **UI/UX differs** - Notes need rich text editing, codes need blur/reveal
3. **Data model differs** - Codes have specific fields (type, account-only linking)
4. **Mixing concerns** - Would complicate both features unnecessarily

### Why Account-Only, Not Contacts/Orgs?

**Decision:** Codes link only to Accounts

**Reasoning:**
- Codes are physical (door codes, lockboxes) → tied to physical locations (Accounts)
- Contacts can view account codes via account relationship
- Organizations can see all account codes via organization → accounts relationship
- Simpler data model, clearer ownership

### Why Typed Codes?

**Decision:** Support explicit code types (door, lockbox, alarm, gate, other)

**Benefits:**
1. **Better organization** - Filter by type in list view
2. **Visual distinction** - Icons/colors per type
3. **Future features** - Generate gate codes, check alarm codes, etc.
4. **User expectations** - Users naturally categorize codes this way

### Why Blur-and-Reveal vs. Auth-Per-Screen?

**Decision:** Show codes blurred by default, require auth to reveal each one

**Rationale:**
- **Most secure** - Each code reveal requires explicit authentication
- **User control** - User chooses when to authenticate
- **Industry standard** - Password managers (1Password, Bitwarden) use this pattern
- **Visual clarity** - User knows what's protected (blurred) vs. revealed

**Trade-off:** More taps required, but acceptable for sensitive data

---

## Future Enhancements (Post-Phase 4)

### Code History & Rotation
- Track code changes over time
- "Previous codes" list
- Code expiration dates
- Rotation reminders

### Code Sharing
- Share code temporarily with contacts
- Time-limited access
- Revoke access

### Code Templates
- Common code formats (4-digit, 6-digit, alphanumeric)
- Validation patterns
- Auto-formatting

### Code Generation
- Generate random codes
- Check against common/weak codes
- Strength indicator

### Export/Backup
- Encrypted export to file
- QR code for quick transfer
- Encrypted cloud backup

### Audit Log
- Track who accessed which codes and when
- Compliance/security monitoring

---

## Testing Strategy

### Unit Tests
- Encryption/decryption functions
- Code validation logic
- Authentication flow

### Integration Tests
- Code CRUD operations
- Navigation between screens
- Authentication integration

### Security Tests
- Verify encryption at rest
- Check no plaintext in logs
- Validate key storage
- Test biometric fallbacks

### User Acceptance Tests
- Create code from account
- View/edit/delete code
- Authentication flow
- Error handling

---

## Migration & Rollback

### Phase 2 → Phase 3 Migration
- No data changes, just adds auth layer
- Can disable auth if issues arise

### Phase 3 → Phase 4 Migration
- **Critical:** Encrypt existing plaintext codes
- **Approach:** Use `isEncrypted` flag
- **Rollback:** Keep plaintext as fallback during transition

### Disaster Recovery
- If encryption key lost, codes are unrecoverable
- **Mitigation:** Warn users to backup codes externally
- **Future:** Implement encrypted backup/export feature

---

## Timeline Estimate

**Note:** No specific timelines, just task ordering

### Phase 1: Navigation ✅
- Completed and committed

### Phase 2: Basic Codes
- Domain model: 1 session
- Screens & navigation: 2-3 sessions
- Integration & testing: 1 session

### Phase 3: Authentication
- Install dependencies: <1 session
- Auth hook implementation: 1 session
- UX integration: 1 session
- Testing: 1 session

### Phase 4: Encryption
- Encryption utilities: 1 session
- Code model updates: 1 session
- Migration logic: 1 session
- UI updates (blur/reveal): 1-2 sessions
- Security audit & testing: 1-2 sessions

**Total:** Approximately 12-15 working sessions across all phases

---

## Open Questions

1. **What happens if user reinstalls app?**
   - Encryption key is lost → codes unrecoverable
   - Should we warn user? Support encrypted backup?

2. **Should we support code sharing?**
   - Not in initial phases, but good future enhancement

3. **Multi-device sync?**
   - Automerge supports it, but encryption key sync is complex
   - Defer to future phases

4. **Should codes have expiration dates?**
   - Nice-to-have, not critical for MVP
   - Add in future enhancement

5. **Screenshot prevention?**
   - Possible on native platforms, adds security
   - Implement in Phase 4?

---

## Success Criteria

### Phase 2 Success
- [ ] Can create/view/edit/delete codes
- [ ] Codes linked to accounts correctly
- [ ] Codes visible on account detail
- [ ] All TypeScript checks pass
- [ ] No regressions in existing features

### Phase 3 Success
- [ ] Biometric auth prompts appear correctly
- [ ] Codes accessible only after authentication
- [ ] Fallback to device PIN works
- [ ] No crashes related to auth

### Phase 4 Success
- [ ] All codes encrypted at rest
- [ ] Decryption works with authentication
- [ ] No plaintext codes in database/logs
- [ ] Migration from plaintext successful
- [ ] Security audit passes

---

## References

### Expo Documentation
- [expo-local-authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)

### Security Best Practices
- OWASP Mobile Security Guidelines
- React Native Security Best Practices

### Similar Implementations
- 1Password mobile app
- Bitwarden mobile app
- LastPass mobile app

---

**Last Updated:** 2026-01-03
**Document Owner:** Development Team
**Status:** Phase 1 Complete, Phase 2-4 Planning
