# Module map (CRM Orbit)

Single Expo app with supporting tooling. Keep this short and scannable.

```markdown
## Modules / subprojects

| Module | Type | Path | What it owns | How to run | Tests | Docs | AGENTS |
|--------|------|------|--------------|------------|-------|------|--------|
| CRMOrbit | expo app | `CRMOrbit/` | App runtime, domains, reducers, views, tests | `cd CRMOrbit && npm run start` | `cd CRMOrbit && npm run test`, `npx tsc` | `README.md`, `AGENTS.md` | `AGENTS.md` |
| eslint-rules | eslint plugin | `CRMOrbit/eslint-rules/` | Custom lint rules for repo conventions | `cd CRMOrbit && npm run lint` | `-` | `README.md` | `AGENTS.md` |
```

Notes:
- "Type" is a quick hint (expo app, eslint plugin).
- Keep "How to run" high-level here; detailed commands live in `CRMOrbit/package.json`.
