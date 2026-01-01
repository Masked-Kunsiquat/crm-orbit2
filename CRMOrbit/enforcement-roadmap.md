# ESLint Architecture Enforcement Roadmap

## Executive Summary

This document outlines the strategy for implementing ESLint rules to enforce consistent architecture across the expo-crm codebase. Based on comprehensive codebase analysis, we identified 12 major inconsistencies and architectural gaps that can be prevented through automated linting.

**Date Created**: 2026-01-01
**Status**: In Progress
**Priority**: High - Prevents technical debt accumulation

---

## Current State Analysis

### Architectural Strengths
1. **Event Sourcing**: Clean, immutable state updates with full audit trail
2. **Centralized Navigation**: Single point of control for app navigation
3. **Type-Safe Hooks**: Public API through hooks prevents accidental mutations
4. **Modular Domain Layer**: Clear separation between business logic and UI
5. **Persistent State**: Background async persistence without blocking UI
6. **Reusable Patterns**: Most domain logic follows predictable patterns

### Architectural Weaknesses
1. **Tight Coupling in Details**: Detail screens import multiple store selectors (7+ per screen)
2. **No Error Recovery**: Failed persistence operations are silently logged
3. **No Caching Strategy**: Every selector re-evaluates on store changes
4. **Hard-coded Device ID**: "device-local" device ID in every action hook
5. **Type Safety Bypasses**: ~20+ instances of `as any` type assertions
6. **Code Duplication**: ~2000 lines of duplicated form/screen logic

### Consistency Score Summary

| Aspect | Status | Score | Notes |
|--------|--------|-------|-------|
| Consistency | Mostly Good | 7/10 | ~12 inconsistencies, mostly naming/location |
| Type Safety | Good | 7/10 | Some `as any` and loose payload typing |
| Code Duplication | Moderate | 6/10 | ~2000 lines could be extracted |
| Modularization | Good | 7/10 | Domain/UI separated but screens are monoliths |
| Navigation | Good | 8/10 | Well-structured, some type issues |
| Error Handling | Fair | 5/10 | Silent failures in persistence |
| Documentation | Minimal | 3/10 | Inline comments but no architecture docs |
| Test Coverage | None | 0/10 | No tests found |

---

## Major Inconsistencies Identified

### 1. Duplicate resolveEntityId Logic
- **Files**: `contact.reducer.ts:41-58`, `interaction.reducer.ts:13-30`
- **Shared version exists**: `domains/shared.ts`
- **Impact**: Maintenance burden, potential drift in implementations
- **Fix**: Custom ESLint rule `no-duplicate-helpers`

### 2. Navigation Type Casting Inconsistency
- **Files**: `RootStack.tsx` uses `as any` for component type casting (lines 27-73)
- **Impact**: Type safety loss for detail/form screens
- **Fix**: Remove `as any`, enforce with `@typescript-eslint/no-explicit-any: error`

### 3. Validation & Error Messaging
- **Pattern A**: ContactFormScreen, AccountFormScreen use English strings
- **Pattern B**: NoteFormScreen uses i18n translation keys
- **Impact**: Inconsistent internationalization
- **Fix**: Custom ESLint rule `enforce-i18n-validation`

### 4. Console Logging
- **Files**: OrganizationFormScreen has debug console.log (lines 139, 154, 158, 143)
- **Impact**: Debug code in production
- **Fix**: Upgrade `no-console` to error with allow list

### 5. Form State Management
- **Files**: All form screens have unused `_isDirty` state
- **Impact**: Dead code, unclear intent
- **Fix**: Custom ESLint rule `enforce-form-screen-pattern`

### 6. Event ID Generation Pattern
- **Inconsistency**: Different prefixes across action hooks
- **Impact**: Unclear naming conventions
- **Fix**: Custom ESLint rule `enforce-action-hook-pattern`

### 7. Reducer Dependency Validation
- **Issue**: No standardized approach to cascade/dependency validation
- **Impact**: Potential data integrity issues
- **Fix**: Custom ESLint rule `enforce-reducer-pattern`

### 8. Cross-Tab Navigation Type Safety
- **Files**: OrganizationDetailScreen:267 uses `navigation.navigate as any`
- **Impact**: Type safety bypassed
- **Fix**: Custom ESLint rule `no-cross-tab-any-navigation`

---

## Implementation Phases

### Phase 1: Immediate Wins (Existing ESLint Rules)
**Duration**: 1-2 hours
**Goal**: Enable stricter existing rules and fix violations

#### Rule 1.1: Upgrade `@typescript-eslint/no-explicit-any` to error
- **Current**: `"warn"`
- **New**: `"error"`
- **Expected violations**: 20+ instances
- **Files affected**: RootStack.tsx, OrganizationDetailScreen.tsx, etc.

#### Rule 1.2: Upgrade `no-console` to error with allow list
- **Current**: `"off"`
- **New**: `["error", { allow: ["warn", "error"] }]`
- **Expected violations**: 4-5 instances
- **Files affected**: OrganizationFormScreen.tsx

#### Rule 1.3: Add strict TypeScript rules
- `@typescript-eslint/no-unnecessary-type-assertion: error`
- `@typescript-eslint/strict-boolean-expressions: error`

#### Rule 1.4: Add import rules
- `import/no-cycle: error`
- `import/no-self-import: error`
- `import/order: warn` (with alphabetization)

---

### Phase 2: Custom Plugin Infrastructure
**Duration**: 2-3 hours
**Goal**: Set up scaffolding for custom rules

#### 2.1: Create Plugin Structure
```
CRMOrbit/
  eslint-rules/
    index.js                    # Plugin entry point
    rules/
      no-duplicate-helpers.js
      enforce-reducer-pattern.js
      enforce-action-hook-pattern.js
      enforce-i18n-validation.js
      no-cross-tab-any-navigation.js
      enforce-form-screen-pattern.js
```

#### 2.2: Configure Local Plugin
- Update `eslint.config.mjs` to load local plugin
- Test with simple "hello world" rule
- Validate rule execution

---

### Phase 3: Critical Custom Rules
**Duration**: 4-6 hours
**Goal**: Implement and fix violations for highest-impact rules

#### Rule 3.1: `no-duplicate-helpers`
**Purpose**: Prevent duplication of helper functions that exist in shared modules

**Implementation**:
```javascript
module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow duplicate helpers from shared modules" },
    messages: {
      duplicateHelper: "Function '{{name}}' should be imported from {{sharedPath}}",
    },
  },
  create(context) {
    const duplicates = { resolveEntityId: "domains/shared" };
    return {
      FunctionDeclaration(node) {
        const name = node.id?.name;
        if (duplicates[name]) {
          context.report({ node, messageId: "duplicateHelper", data: { name, sharedPath: duplicates[name] } });
        }
      },
    };
  },
};
```

**Expected violations**: 2 (contact.reducer.ts, interaction.reducer.ts)

**Fix strategy**:
1. Remove duplicate function definitions
2. Add import from `domains/shared`
3. Verify tests pass

---

#### Rule 3.2: `enforce-i18n-validation`
**Purpose**: Require all user-facing validation messages use i18n

**Implementation**:
```javascript
module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Validation messages must use i18n" },
    messages: {
      useI18nForValidation: "Use t() from useTranslation instead of hardcoded string",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "Alert" &&
          node.callee.property.name === "alert"
        ) {
          const messageArg = node.arguments[1];
          if (messageArg?.type === "Literal" &&
              /required|invalid|must|error/i.test(messageArg.value)) {
            context.report({ node: messageArg, messageId: "useI18nForValidation" });
          }
        }
      },
    };
  },
};
```

**Expected violations**: 4-6 (ContactFormScreen, AccountFormScreen, OrganizationFormScreen)

**Fix strategy**:
1. Add i18n keys to translation files
2. Replace hardcoded strings with `t()`
3. Import and use `useTranslation` hook

---

#### Rule 3.3: `no-cross-tab-any-navigation`
**Purpose**: Prevent type-unsafe cross-tab navigation

**Implementation**:
```javascript
module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Navigation must not use 'as any'" },
    messages: {
      noAnyNavigation: "Define proper types in navigation/types.ts instead of 'as any'",
    },
  },
  create(context) {
    return {
      TSAsExpression(node) {
        if (
          node.typeAnnotation.type === "TSAnyKeyword" &&
          node.expression.type === "MemberExpression" &&
          node.expression.object.name === "navigation"
        ) {
          context.report({ node, messageId: "noAnyNavigation" });
        }
      },
    };
  },
};
```

**Expected violations**: 3-5 (detail screens)

**Fix strategy**:
1. Extend navigation types in `types.ts`
2. Remove `as any` assertions
3. Use properly typed navigation

---

### Phase 4: Pattern Enforcement Rules
**Duration**: 6-8 hours
**Goal**: Standardize architectural patterns across modules

#### Rule 4.1: `enforce-reducer-pattern`
**Purpose**: Enforce consistent reducer structure

**Checks**:
- Reducer switch has default case that throws
- Uses shared helpers from `domains/shared`
- Exports reducer as default
- All cases handle payload properly

**Expected violations**: 0-2 (most reducers already follow pattern)

---

#### Rule 4.2: `enforce-action-hook-pattern`
**Purpose**: Enforce action hooks use useCallback and return DispatchResult

**Checks**:
- Action methods wrapped in useCallback
- Functions return DispatchResult type
- No hardcoded "device-local" strings

**Expected violations**: 5-8 (device ID hardcoding)

---

#### Rule 4.3: `enforce-form-screen-pattern`
**Purpose**: Ensure form screens follow consistent patterns

**Checks**:
- No unused `_isDirty` state variables
- Either use dirty tracking or remove it
- Suggest extraction to useEntityForm hook when >400 lines

**Expected violations**: 4 (all FormScreen files)

---

### Phase 5: Layer-Based Architectural Rules
**Duration**: 2-3 hours
**Goal**: Enforce separation of concerns between layers

#### 5.1: Domain Layer Isolation
```javascript
{
  files: ["domains/**/*.ts"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: ["**/views/**", "**/reducers/**"],
      message: "Domain layer cannot import from views or reducers",
    }],
  },
}
```

#### 5.2: Views Layer Restrictions
```javascript
{
  files: ["views/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: ["**/reducers/**"],
      message: "Views should use hooks instead of directly importing reducers",
    }],
  },
}
```

#### 5.3: Reducer Layer Standards
```javascript
{
  files: ["reducers/**/*.reducer.ts"],
  rules: {
    "local/enforce-reducer-pattern": "error",
    "local/no-duplicate-helpers": "error",
    "@typescript-eslint/switch-exhaustiveness-check": "error",
  },
}
```

#### 5.4: Navigation Type Strictness
```javascript
{
  files: ["views/navigation/**/*.tsx"],
  rules: {
    "local/no-cross-tab-any-navigation": "error",
    "@typescript-eslint/no-explicit-any": "error",
  },
}
```

**Expected violations**: 5-10 across layers

---

## Rule-by-Rule Implementation Plan

### Commit Strategy
Each rule will be implemented and violations fixed in a separate commit:

1. **Commit 1**: Upgrade `no-explicit-any` to error + fix violations
2. **Commit 2**: Upgrade `no-console` to error + fix violations
3. **Commit 3**: Add `no-duplicate-helpers` custom rule + fix violations
4. **Commit 4**: Add `enforce-i18n-validation` custom rule + fix violations
5. **Commit 5**: Add `no-cross-tab-any-navigation` custom rule + fix violations
6. **Commit 6**: Add `enforce-form-screen-pattern` custom rule + fix violations
7. **Commit 7**: Add layer-based architectural rules + fix violations
8. **Commit 8**: Add remaining custom rules + documentation

---

## Expected Violations Summary

| Rule | Expected Count | Primary Files |
|------|----------------|---------------|
| `@typescript-eslint/no-explicit-any` | 20+ | RootStack.tsx, detail screens |
| `no-console` | 4-5 | OrganizationFormScreen.tsx |
| `no-duplicate-helpers` | 2 | contact.reducer.ts, interaction.reducer.ts |
| `enforce-i18n-validation` | 4-6 | Form screens |
| `no-cross-tab-any-navigation` | 3-5 | Detail screens |
| `enforce-form-screen-pattern` | 4 | All FormScreen files |
| `enforce-action-hook-pattern` | 5-8 | Action hooks (device ID) |
| Layer boundary violations | 5-10 | Various |
| **TOTAL** | **48-70** | **Multiple modules** |

---

## Additional Tooling Recommendations

### Install Additional Plugins
```bash
npm install --save-dev \
  eslint-plugin-import \
  eslint-plugin-boundaries \
  eslint-plugin-react-hooks
```

### Benefits
- **eslint-plugin-import**: Enforce module import order, prevent cycles
- **eslint-plugin-boundaries**: Architectural layer enforcement
- **eslint-plugin-react-hooks**: Hook usage validation

---

## Success Metrics

### Immediate (Post-Implementation)
- [ ] All custom rules implemented and tested
- [ ] All violations fixed (0 ESLint errors)
- [ ] Documentation updated
- [ ] Team reviewed and approved

### Short-term (1-2 weeks)
- [ ] No new violations introduced in PRs
- [ ] CI/CD pipeline rejects PRs with violations
- [ ] Developers understand and follow patterns

### Long-term (1-3 months)
- [ ] Code consistency score improves from 7/10 to 9/10
- [ ] Type safety score improves from 7/10 to 9/10
- [ ] Reduced time debugging type-related issues
- [ ] Faster onboarding for new developers

---

## Maintenance Plan

### Weekly
- Review new ESLint warnings/errors
- Update custom rules for edge cases

### Monthly
- Audit codebase for new patterns to enforce
- Review and update this roadmap
- Team retrospective on rule effectiveness

### Quarterly
- Major version upgrades of ESLint and plugins
- Architecture review and rule refinement
- Add new custom rules as patterns emerge

---

## Risk Mitigation

### Risk: Too Many Violations, Team Overwhelmed
**Mitigation**: Implement rules gradually, one per day/week

### Risk: Custom Rules Too Strict, Block Development
**Mitigation**: Start with "warn" level, promote to "error" after team feedback

### Risk: False Positives in Custom Rules
**Mitigation**: Extensive testing, escape hatches with eslint-disable comments

### Risk: Performance Impact from Many Custom Rules
**Mitigation**: Profile ESLint execution time, optimize slow rules

---

## Resources

### Documentation
- [ESLint Custom Rules Guide](https://eslint.org/docs/latest/extend/custom-rules)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [ESLint Plugin Boundaries](https://github.com/javierbrea/eslint-plugin-boundaries)

### Tools
- [AST Explorer](https://astexplorer.net/) - Visualize AST for rule development
- [ESLint Rule Tester](https://eslint.org/docs/latest/integrate/nodejs-api#ruletester) - Unit test rules

---

## Conclusion

This roadmap provides a systematic approach to enforcing architectural consistency through ESLint. By implementing these rules gradually and fixing violations incrementally, we'll:

1. **Prevent future inconsistencies** through automated enforcement
2. **Improve type safety** by eliminating `as any` type bypasses
3. **Standardize patterns** across all modules
4. **Reduce technical debt** accumulation
5. **Improve developer experience** with clear, enforced conventions

**Next Steps**: Begin Phase 1 implementation, starting with Rule 1.1 (`no-explicit-any`).

---

**Document Version**: 1.0
**Last Updated**: 2026-01-01
**Owner**: Development Team
**Review Cycle**: Monthly
