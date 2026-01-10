# Feature map (CRM Orbit)

Keep it short and scannable. Prefer 8-12 entries for this repo.

```markdown
## Feature map

| Feature | Owner | Key paths | Entrypoints | Tests | Docs |
|--------|-------|-----------|-------------|-------|------|
| Organizations | domain+views | `CRMOrbit/domains/organization.ts`, `CRMOrbit/reducers/organization.reducer.ts`, `CRMOrbit/views/screens/organizations/` | `OrganizationsListScreen`, `OrganizationDetailScreen`, `useOrganizationActions` | `CRMOrbit/tests/organization.reducer.test.ts` | `AGENTS.md` |
| Accounts | domain+views | `CRMOrbit/domains/account.ts`, `CRMOrbit/reducers/account.reducer.ts`, `CRMOrbit/views/screens/accounts/` | `AccountsListScreen`, `AccountDetailScreen`, `useAccountActions` | `CRMOrbit/tests/account.reducer.test.ts` | `AGENTS.md` |
| Contacts | domain+views | `CRMOrbit/domains/contact.ts`, `CRMOrbit/reducers/contact.reducer.ts`, `CRMOrbit/views/screens/contacts/` | `ContactsListScreen`, `ContactDetailScreen`, `useContactActions` | `CRMOrbit/tests/contact.reducer.test.ts` | `AGENTS.md` |
| Audits + Floors Visited | domain+views | `CRMOrbit/domains/audit.ts`, `CRMOrbit/reducers/audit.reducer.ts`, `CRMOrbit/views/components/FloorsVisitedMatrix.tsx`, `CRMOrbit/views/screens/audits/` | `AuditsListScreen`, `AuditDetailScreen`, `AuditFormScreen` | `CRMOrbit/tests/audit.reducer.test.ts`, `CRMOrbit/tests/auditSchedule.test.ts` | `AGENTS.md` |
| Interactions | domain+views | `CRMOrbit/domains/interaction.ts`, `CRMOrbit/reducers/interaction.reducer.ts`, `CRMOrbit/views/screens/interactions/` | `InteractionsListScreen`, `InteractionDetailScreen`, `useInteractionActions` | `CRMOrbit/tests/interaction.reducer.test.ts` | `AGENTS.md` |
| Notes | domain+views | `CRMOrbit/domains/note.ts`, `CRMOrbit/reducers/note.reducer.ts`, `CRMOrbit/views/screens/notes/` | `NotesListScreen`, `NoteDetailScreen`, `useNoteActions` | `CRMOrbit/tests/note.reducer.test.ts` | `CRMOrbit/domains/actions/README.md` |
| Codes + Encryption | domain+views | `CRMOrbit/domains/code.ts`, `CRMOrbit/reducers/code.reducer.ts`, `CRMOrbit/utils/encryption.ts`, `CRMOrbit/views/screens/codes/` | `CodesListScreen`, `CodeDetailScreen`, `CodeFormScreen` | `CRMOrbit/tests/code.reducer.test.ts`, `CRMOrbit/tests/codeEncryptionMigration.test.ts` | `CRMOrbit/utils/LOGGING.md` |
| Sync (local/offline) | domain+views | `CRMOrbit/domains/sync/`, `CRMOrbit/events/ordering.ts`, `CRMOrbit/views/screens/SyncScreen.tsx` | `SyncScreen`, `syncOrchestrator` | `CRMOrbit/tests/sync*.test.ts` | `AGENTS.md` |
| Backup + Import | domain+views | `CRMOrbit/domains/persistence/backup.ts`, `CRMOrbit/domains/persistence/backupService.ts`, `CRMOrbit/views/screens/settings/BackupSettingsScreen.tsx` | `BackupSettingsScreen`, `useBackupOperations` | `CRMOrbit/tests/persistence.backup.test.ts` | `CRMOrbit/utils/LOGGING.md` |
| Randomizer | views | `CRMOrbit/views/screens/misc/RandomizerScreen.tsx`, `CRMOrbit/views/hooks/useRandomizer.ts`, `CRMOrbit/views/utils/randomizer.ts` | `RandomizerScreen`, `useRandomizer` | `-` | `AGENTS.md` |
```

Notes:
- "Owner" is a quick routing hint: domain, views, or both.
- "Entrypoints" are main screens/hooks.
- "Key paths" are the minimum set to navigate the feature quickly.
