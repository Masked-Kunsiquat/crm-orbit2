# GitHub Issues Created for Audit Remediation

**Date**: 2026-01-11
**Total Issues Created**: 7

---

## Master Tracker

**#200** - [Audit] Master Tracking: Repo-Wide Audit Remediation Roadmap
- **URL**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues/200
- **Labels**: tech-debt, documentation
- **Purpose**: Central tracking issue linking all audit remediation work

---

## Phase 0: Immediate (P0 + Quick Wins)

### #193 - [Audit] Phase 0: Fix P0 Cross-Layer Import Violation
- **URL**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues/193
- **Labels**: tech-debt, refactor, backend-core
- **Priority**: P0 - CRITICAL
- **Effort**: 1-2 hours
- **Fix**: Move resolveEntityId from reducers/shared to domains/shared/entityUtils

### #194 - [Audit] Phase 0: Quick Wins (Logger, Contact Display Name)
- **URL**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues/194
- **Labels**: tech-debt, refactor, good first issue
- **Priority**: P1 - Quick Wins
- **Effort**: 30 minutes
- **Fixes**: P1-008 (logger), P1-005 (contact display name)

---

## Phase 1: High-Leverage Refactoring

### Phase 1A: Business Logic Consolidation

#### #195 - [Audit] Phase 1A: Extract TimelineSection Business Logic to Domain Utilities
- **URL**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues/195
- **Labels**: tech-debt, refactor, backend-core, breaking-change
- **Priority**: P1 - HIGH IMPACT
- **Effort**: 6-8 hours
- **Impact**: -400 LOC, eliminates logic drift risk

### Phase 1B: Code Duplication Elimination

#### #196 - [Audit] Phase 1B: Extract BaseLinkModal Component
- **URL**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues/196
- **Labels**: tech-debt, refactor, views, enhancement
- **Priority**: P1 - High Duplication
- **Effort**: 4-6 hours
- **Impact**: -600 LOC across 4 modal files

#### #197 - [Audit] Phase 1B: Extract Delete Entity Helper & useEntityLinkMap Hook
- **URL**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues/197
- **Labels**: tech-debt, refactor, backend-core, good first issue
- **Priority**: P1 - Structural Duplication
- **Effort**: 2-3 hours
- **Impact**: -95 LOC total

### Phase 1C: Type Safety & Testing

#### #198 - [Audit] Phase 1C: Type Navigation Props & Add Device Reducer Tests
- **URL**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues/198
- **Labels**: tech-debt, tests, enhancement
- **Priority**: P1 - Type Safety & Testing
- **Effort**: 4-6 hours
- **Impact**: 100% reducer test coverage, compile-time navigation safety

---

## Phase 2: Opportunistic Improvements

### #199 - [Audit] Phase 2: Opportunistic Improvements (P2 Findings)
- **URL**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues/199
- **Labels**: tech-debt, enhancement, good first issue
- **Priority**: P2 - Opportunistic
- **Effort**: 10-15 hours (incremental)
- **Includes**: Large file refactoring, process improvements, i18n namespacing

---

## Recommended Workflow

### Week 1: Phase 0 (Immediate)
1. Start with #193 (P0 fix) - 1-2 hours
2. Complete #194 (Quick wins) - 30 minutes
3. **Total**: ~2-3 hours

### Week 2-3: Phase 1A (High Impact)
4. Tackle #195 (TimelineSection) - 6-8 hours
5. **Impact**: -400 LOC, establishes domain utility pattern

### Week 4-5: Phase 1B (Duplication)
6. Complete #196 (BaseLinkModal) - 4-6 hours
7. Complete #197 (Delete helper + hook) - 2-3 hours
8. **Impact**: -695 LOC, reusable patterns

### Week 6: Phase 1C (Polish)
9. Complete #198 (Navigation typing + tests) - 4-6 hours
10. **Impact**: 100% test coverage, full type safety

### Ongoing: Phase 2 (Opportunistic)
11. Tackle #199 items incrementally during cleanup sprints

---

## Metrics & Targets

| Metric | Before | Target | Issue |
|--------|--------|--------|-------|
| Cross-layer imports | 1 | 0 | #193 |
| Navigation `any` usage | 9 | 0 | #198 |
| Reducer test coverage | 91% | 100% | #198 |
| Modal duplication | 800 LOC | <200 LOC | #196 |
| TimelineSection LOC | 1,177 | <700 | #195 |
| Total LOC reduction | - | ~1,200 | All |

---

## Labels Used

- **tech-debt**: All issues (cleanup/consistency)
- **refactor**: Architecture changes without behavior change
- **backend-core**: Affects core Automerge/event/reducer behavior
- **views**: UI/component changes
- **tests**: Test coverage improvements
- **enhancement**: New capabilities or improvements
- **good first issue**: Suitable for newcomers or quick wins
- **breaking-change**: May require data or consumer updates
- **documentation**: Documentation-only changes

---

## Next Steps

1. Review all issues: https://github.com/Masked-Kunsiquat/crm-orbit2/issues?q=is%3Aissue+label%3Atech-debt+is%3Aopen
2. Start with #193 (P0 critical)
3. Track progress in #200 (Master tracker)
4. Update checkboxes as work completes
5. Close issues when fully resolved and tested

---

## Quick Links

- **View all tech-debt issues**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues?q=is%3Aissue+label%3Atech-debt+is%3Aopen
- **Master tracker**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues/200
- **P0 critical**: https://github.com/Masked-Kunsiquat/crm-orbit2/issues/193
- **Audit report**: `standardization/AUDIT_SYNTHESIS_REPORT.md`
- **Conventions guide**: `standardization/CONVENTIONS.md`

---

**Created**: 2026-01-11
**By**: agent-organizer (Claude Sonnet 4.5)
**Audit Commit**: f07eb86
