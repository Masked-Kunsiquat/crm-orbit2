# Agent instructions (scope: CRMOrbit/i18n/)

## Scope and layout
- **This AGENTS.md applies to:** `CRMOrbit/i18n/` and subdirectories.
- **Key files:** `en.json`, `events.ts`, `enums.ts`, locale files, `glossary/`.

## Conventions
- **Locale-neutral persistence:** domain state and events store keys, never translated strings.
- **Mapping tables:** keep `events.ts` and `enums.ts` in sync with event types and enum values.
- **Use the i18n skill:** when changing keys or translations, use the `i18n-curator` skill.
- **User-entered content stays raw:** names, notes, and summaries are never translated.
