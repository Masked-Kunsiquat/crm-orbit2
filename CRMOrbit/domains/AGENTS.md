# Agent instructions (scope: CRMOrbit/domains/)

## Scope and layout
- **This AGENTS.md applies to:** `CRMOrbit/domains/` and subdirectories.
- **Key paths:** `account.ts`, `contact.ts`, `note.ts`, `organization.ts`, `interaction.ts`, `audit.ts`, `code.ts`, `settings.ts`, `actions/`, `migrations/`, `persistence/`, `relations/`, `shared/`, `sync/`.

## Conventions
- **Locale-neutral models:** statuses/types/roles are i18n keys, never localized strings.
- **Pure helpers:** keep utilities deterministic and free of UI/persistence side effects.
- **No state mutation here:** reducers apply Automerge changes; domains define types and helpers.
- **Schema changes:** if you add/remove fields or change persisted structures, use the `data-migration` skill and update migrations.

## Do not
- Emit events or access the event log from this layer.
- Store derived UI labels or translated strings.
