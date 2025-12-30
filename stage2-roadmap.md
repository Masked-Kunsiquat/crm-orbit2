### **Phase 9 – Persistence & Local Storage Integration**

1. **SQLite/Drizzle Integration**

   * Finalize the Drizzle ORM schema for `automerge_snapshots` and `event_log` tables. Ensure write‑through semantics so that every event append and Automerge document update persists immediately.
   * Implement migrations and seed functions for local development/testing.
2. **Persistence Adapter Tests**

   * Add unit tests confirming that snapshots and events are saved/loaded correctly (no business logic).

### **Phase 10 – Sync Service (Device‑to‑Device)**

1. **Sync Protocol Design**

   * Define a minimal sync protocol based on timestamps and device IDs (the roadmap already hints at merge testing utilities). Decide how documents and event logs are exchanged between devices (e.g. Wi-Fi direct, Bluetooth, or future server).
   * Document how conflicts are resolved purely by Automerge (no UI decisions).
2. **Sync Implementation**

   * Build a lightweight sync service layer that can discover peers and exchange Automerge changesets.
   * Add tests simulating divergent devices and ensuring convergence.
3. **Sync UI Hooks**

   * Expose manual “Sync now” triggers and background sync toggles (even if the actual UI isn’t built yet).

### **Phase 11 – Front‑end Scaffolding (Expo + Zustand)**

1. **State Hooks & Selectors**

   * Implement Zustand stores that subscribe to the Automerge doc and expose selectors such as `useAccounts()`, `useContacts(accountId)`, `useNotes(entityId)`, and timeline queries.
   * Ensure these stores are read‑only; mutations must dispatch events through the event dispatcher.
2. **Initial Screens**

   * Build bare‑bones screens for Organizations, Accounts, Contacts, Notes, and Interactions.
   * Wire up dispatch functions that generate the appropriate events and reducers update the Automerge doc.
   * Add optimistic UI feedback while event processing and Automerge updates are pending.

### **Phase 12 – Internationalization & Weblate Setup**

1. **Integrate i18n Framework**

   * Configure a lightweight i18n library (e.g. i18next) with Weblate as the translation management backend.
   * Create locale‑neutral keys for statuses, roles and event descriptions so that the UI renders the correct translations without storing localized strings in the backend.
2. **Translation Keys Mapping**

   * Populate `/crm-core/i18n/enums.ts` and `/crm-core/i18n/events.ts` with all the keys used across domains.
   * Ensure Weblate workflows are set up for translators to contribute.

### **Phase 13 – Core Feature Expansion**

1. **Audit Timeline UI**

   * Build a timeline view that aggregates events, notes and interactions for a given entity (person, account, organization).
   * Implement filters and sorting for event types and date ranges.
2. **Search & Filtering**

   * Add local (client‑side) search over names, notes and interactions.
   * Provide filters such as “show only active accounts” or “show all notes for this contact.”
3. **Attachments & Rich Notes (Optional)**

   * Define an attachment entity for photos or documents associated with notes.
   * Handle offline storage and eventual sync of binary data.

### **Phase 14 – Multi‑User & Permissions (Future‑Proofing)**

1. **User Identity & Authentication**

   * Introduce a `User` entity and extend events with a `userId` field so that future multi‑user collaboration can be layered on top.
2. **Permissions & Sharing**

   * Design a permission model that governs who can view or modify organizations, accounts or contacts (even if only one user is active now).
   * Keep this decoupled so it’s easy to activate when server‑side sync is added.

### **Phase 15 – Space/Tenant Modeling (Deferred)**

1. **Space & Occupancy Entities**

   * When ready, implement a `Space` entity (floor or suite) and an `Occupancy` entity that tracks which tenant occupies which space over time.
   * Follow the same event‑driven pattern: events to activate/deactivate spaces, start/end occupancy, etc.
2. **UI & Timeline Integration**

   * Add UI components for assigning spaces to accounts and recording occupancy changes.
   * Extend timeline and search to include space‑level notes and interactions.

---

This second‑phase roadmap keeps the focus on making the backend usable through a minimal UI and sync layer, while future‑proofing for multi‑user collaboration, localization, and more advanced domain modelling.
