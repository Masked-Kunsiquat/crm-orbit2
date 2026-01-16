# Agent instructions (scope: CRMOrbit/views/)

## Scope and layout
- **This AGENTS.md applies to:** `CRMOrbit/views/` and subdirectories.
- **Key directories:** `components/`, `hooks/`, `navigation/`, `screens/`, `services/`, `store/`, `timeline/`, `utils/`.

## Conventions (Audit Pass A)
- **No reducer imports:** use action hooks from `views/hooks/` instead of `reducers/`.
- **No explicit `any`:** use navigation types from `views/navigation/types.ts`.
- **i18n for user strings:** wrap user-visible strings with `t()` and keep stored values locale-neutral.
- **Action hooks:** accept `deviceId: string` consistently.
- **No hardcoded colors:** use theme tokens from `@domains/shared/theme/colors` via `useTheme` or `views/utils/calendarTheme.ts`. Add new tokens there instead of inline hex/rgb/rgba values.

## Do not
- Mutate Automerge docs directly or emit events here.
- Store localized strings in state or event payloads.
