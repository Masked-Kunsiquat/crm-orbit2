# Documentation layout (CRM Orbit)

There is no `docs/` folder. Documentation lives in the repo root and in a few
targeted module files.

```text
AGENTS.md                      (project rules and architecture)
README.md                      (project overview)

CRMOrbit/
  utils/
    LOGGING.md                 (logging conventions)
  domains/
    actions/
      README.md                (action layer conventions)
```

Notes:
- Add any future docs in `CRMOrbit/` only if they are scoped to a module.
- If a `docs/` folder is introduced later, update this map.
