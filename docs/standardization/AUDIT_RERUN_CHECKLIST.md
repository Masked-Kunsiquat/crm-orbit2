# How to Rerun the Repo-Wide Audit

**Purpose**: This checklist guides you through rerunning the comprehensive repo-wide audit performed on 2026-01-10.

**When to rerun**:
- After major architectural changes
- When adding new entity types or layers
- After significant refactoring efforts
- Every 6 months for health checks
- When onboarding new team members (as a learning exercise)

---

## Prerequisites

Ensure you have:
- [ ] Claude Code CLI installed and configured
- [ ] Access to the repo at `c:\Users\blain\Documents\GitHub\expo-crm`
- [ ] Clean working directory (commit or stash changes)
- [ ] All dependencies installed (`npm install`)
- [ ] Tests passing (`npm test`)
- [ ] Linting passing (`npm run lint`)

---

## Phase 0: Prepare for Audit

### 1. Record Current State
```bash
cd c:\Users\blain\Documents\GitHub\expo-crm

# Record current commit
git log -1 --oneline > standardization/audit_baseline.txt

# Record current branch
git branch --show-current >> standardization/audit_baseline.txt

# Run tests to ensure baseline health
npm test 2>&1 | tee standardization/test_baseline.txt

# Run linter
npm run lint 2>&1 | tee standardization/lint_baseline.txt
```

### 2. Archive Previous Audit (if exists)
```bash
# Create archive directory with timestamp
ARCHIVE_DIR="standardization/archive/$(date +%Y%m%d)"
mkdir -p "$ARCHIVE_DIR"

# Move previous audit files
mv standardization/AUDIT_*.md "$ARCHIVE_DIR/" 2>/dev/null || true
mv standardization/REPO_AUDIT_CONTRACT.md "$ARCHIVE_DIR/" 2>/dev/null || true
```

---

## Phase 1: Run the Audit

### Option A: Using Claude Code CLI

Open Claude Code and paste the following prompt:

```
We are in a Claude Code / Codex-style environment with multiple skills available under `.codex/skills/`.

You are agent-organizer. You own planning, sequencing, delegation, and final synthesis.

context-manager is the authoritative source for:
- inferred repo conventions
- scope boundaries
- definitions (what is a violation vs acceptable variance)
- shared assumptions and glossary

All other skills are specialists and must operate within the constraints set by context-manager.

Goal:
Perform a repo-wide audit focused on:
1) Convention violations
2) Code reuse & duplication
3) Architectural hygiene
4) Workflow consistency (commits, migrations, i18n)

### Phase 0 — Establish the rules
Before any scanning or judgments:
- Ask context-manager to infer and produce a **Repo Audit Contract**, derived from:
  - existing code patterns
  - config files (eslint, prettier, tsconfig, etc.)
  - folder structure and module boundaries
  - existing commit / migration / i18n practices
- The contract must define:
  - naming conventions
  - layering expectations
  - what counts as a violation
  - severity levels (P0 / P1 / P2)
  - evidence requirements for findings

No findings may be recorded until this contract exists.

### Phase 1 — Execute audit passes
Run audit passes in this order, delegating to specialists where appropriate:

A) Conventions & structure
- file/folder naming
- exports, components, hooks, types
- formatting and lint expectations
- error handling and logging patterns

B) Code reuse & duplication
- duplicated utilities/helpers
- repeated business logic
- repeated UI patterns/components
- repeated data-access or query logic

C) Architecture & hygiene
- circular dependencies
- oversized or "god" files
- cross-layer leakage
- inconsistent state or data flow

D) Workflow & process consistency
- commit structure and messaging
- commit-work vs draft-commit-message alignment
- data-migration patterns and safety
- i18n-curator usage and translation conventions

### Operating rules
- Default to read-only investigation (Read / Grep / Glob).
- Do NOT refactor yet.
- Specialists must follow the Repo Audit Contract.
- No specialist may invent new conventions.

Each finding MUST include:
- severity (P0 / P1 / P2)
- file paths
- symbol / function / component name (or short snippet)
- why it violates the Repo Audit Contract
- a concrete remediation suggestion (no code changes yet)

### Output format
1) Repo Audit Contract (from context-manager)
2) Audit plan (passes + which skills were used)
3) Findings
   - Convention violations (grouped)
   - Duplication clusters (with suggested canonical + extraction target)
   - Architecture & hygiene issues
   - Workflow inconsistencies
4) Prioritized remediation plan
   - P0: correctness / safety
   - P1: high-leverage cleanup
   - P2: opportunistic improvements
5) Suggested repo documentation updates
   - CONVENTIONS.md outline (headers only)
   - optional: "How to rerun this audit" checklist

IMPORTANT: Pipe all audit documents (contract, passes, synthesis) to: standardization/
```

### Option B: Manual Agent Invocation

If you need more control, invoke agents individually:

```bash
# 1. Generate contract
claude-code agent context-manager "Infer and produce Repo Audit Contract..." > standardization/REPO_AUDIT_CONTRACT.md

# 2. Run audit passes (in parallel)
claude-code agent typescript-pro "Audit Pass A: Conventions & Structure..." > standardization/AUDIT_PASS_A_CONVENTIONS.md &
claude-code agent refactoring-specialist "Audit Pass B: Code Reuse & Duplication..." > standardization/AUDIT_PASS_B_DUPLICATION.md &
claude-code agent code-reviewer "Audit Pass C: Architecture & Hygiene..." > standardization/AUDIT_PASS_C_ARCHITECTURE.md &
claude-code agent technical-writer "Audit Pass D: Workflow & Process..." > standardization/AUDIT_PASS_D_WORKFLOW.md &
wait

# 3. Synthesize findings
claude-code agent agent-organizer "Synthesize all audit passes into prioritized remediation plan..." > standardization/AUDIT_SYNTHESIS_REPORT.md
```

---

## Phase 2: Review Findings

### 1. Read the Contract
```bash
# Open in your editor
code standardization/REPO_AUDIT_CONTRACT.md
```

**Check for**:
- [ ] Naming conventions match current codebase
- [ ] Layer definitions are accurate
- [ ] Violation definitions are fair
- [ ] Evidence requirements are clear

### 2. Review Each Audit Pass
```bash
# Open all passes
code standardization/AUDIT_PASS_A_CONVENTIONS.md
code standardization/AUDIT_PASS_B_DUPLICATION.md
code standardization/AUDIT_PASS_C_ARCHITECTURE.md
code standardization/AUDIT_PASS_D_WORKFLOW.md
```

**For each finding, verify**:
- [ ] File paths are correct
- [ ] Code snippets are accurate
- [ ] Severity is appropriate (P0/P1/P2)
- [ ] Contract references are valid
- [ ] Remediation suggestions are actionable

### 3. Review Synthesis Report
```bash
code standardization/AUDIT_SYNTHESIS_REPORT.md
```

**Check**:
- [ ] Findings are properly grouped by severity
- [ ] Remediation plan is prioritized
- [ ] Effort estimates are reasonable
- [ ] Success metrics are defined
- [ ] Long-term recommendations are actionable

---

## Phase 3: Validate Findings

### Run Quick Verification Commands

```bash
cd CRMOrbit

# Verify P0 findings (if any)
echo "Checking for cross-layer imports..."
grep -r "from.*reducers" views/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Verify P1 findings
echo "Checking for explicit any usage..."
grep -rn ": any" . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v eslint-disable

echo "Checking for console usage..."
grep -rn "console\." . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v utils/logger.ts

# Check test coverage
echo "Running tests with coverage..."
npm test -- --coverage

# Find large files
echo "Finding files >500 lines..."
find . -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20
```

### Spot-Check Random Findings

Pick 3-5 findings and manually verify:
```bash
# Example: Verify a specific finding
# If finding says "File X, line Y has violation Z"
code CRMOrbit/path/to/file.ts:linenumber
```

---

## Phase 4: Compare with Previous Audit

If this is not the first audit:

```bash
# Load previous archive
PREV_AUDIT="standardization/archive/[PREVIOUS_DATE]"

# Compare P0 findings
echo "=== P0 Findings Comparison ==="
grep "^### FINDING: P0" "$PREV_AUDIT/AUDIT_SYNTHESIS_REPORT.md" | wc -l
grep "^### FINDING: P0" "standardization/AUDIT_SYNTHESIS_REPORT.md" | wc -l

# Compare P1 findings
echo "=== P1 Findings Comparison ==="
grep "^#### P1-" "$PREV_AUDIT/AUDIT_SYNTHESIS_REPORT.md" | wc -l
grep "^#### P1-" "standardization/AUDIT_SYNTHESIS_REPORT.md" | wc -l

# Check if previous findings were resolved
echo "=== Checking for resolved findings ==="
# Manual review: compare finding IDs and descriptions
```

### Create Comparison Report

```bash
# Generate diff summary
cat > standardization/AUDIT_COMPARISON.md <<EOF
# Audit Comparison

**Previous Audit**: [DATE]
**Current Audit**: $(date +%Y-%m-%d)

## Findings Delta

| Severity | Previous | Current | Change |
|----------|----------|---------|--------|
| P0       | [N]      | [M]     | [±X]   |
| P1       | [N]      | [M]     | [±X]   |
| P2       | [N]      | [M]     | [±X]   |

## Resolved Findings
- [ ] P0-001: [Description]
- [ ] P1-003: [Description]

## New Findings
- [ ] P1-007: [Description]
- [ ] P2-015: [Description]

## Notes
- [Any observations about codebase health trends]
EOF

code standardization/AUDIT_COMPARISON.md
```

---

## Phase 5: Share Results

### 1. Create Summary for Team

```bash
# Generate one-page summary
cat > standardization/AUDIT_SUMMARY.md <<EOF
# Repo Audit Summary - $(date +%Y-%m-%d)

**Overall Grade**: [A-/B+/etc]
**Commit**: $(git log -1 --oneline)

## Key Metrics
- P0 Findings: [N]
- P1 Findings: [N]
- P2 Findings: [N]
- Estimated Remediation Effort: [N hours]

## Top 3 Priorities
1. [P0 or highest-impact P1 finding]
2. [Second priority]
3. [Third priority]

## Recommended Next Steps
1. [ ] Fix P0 findings immediately
2. [ ] Schedule P1 refactoring sprint
3. [ ] Review P2 findings for opportunistic fixes

See [AUDIT_SYNTHESIS_REPORT.md](./AUDIT_SYNTHESIS_REPORT.md) for full details.
EOF

code standardization/AUDIT_SUMMARY.md
```

### 2. Commit Audit Results

```bash
git add standardization/
git commit -m "docs(audit): complete repo-wide audit $(date +%Y-%m-%d)

- Generate Repo Audit Contract
- Execute 4-phase audit (conventions, duplication, architecture, workflow)
- Identify [N] P0, [N] P1, [N] P2 findings
- Create prioritized remediation plan

See standardization/AUDIT_SYNTHESIS_REPORT.md for details."
```

### 3. Create GitHub Issue (Optional)

If using GitHub Issues for tracking:

```markdown
Title: [Audit] Repo-Wide Audit Results - [DATE]

## Summary
A comprehensive 4-phase audit identified [N total] findings:
- **P0 (Critical)**: [N] findings requiring immediate action
- **P1 (High-Leverage)**: [N] maintainability improvements
- **P2 (Opportunistic)**: [N] polish items

**Overall Grade**: [A-/B+/etc]

## Full Report
See [standardization/AUDIT_SYNTHESIS_REPORT.md](../blob/master/standardization/AUDIT_SYNTHESIS_REPORT.md)

## Action Items
### Phase 0: Immediate (P0)
- [ ] [P0-001 description with link]

### Phase 1: High-Leverage (P1 - Next 2 Sprints)
- [ ] [P1-001 description]
- [ ] [P1-002 description]
...

### Phase 2: Opportunistic (P2 - Future)
- [ ] [P2-001 description]
...

## Labels
audit, technical-debt, documentation
```

---

## Phase 6: Track Remediation

### Create Remediation Tracking Doc

```bash
cat > standardization/REMEDIATION_TRACKER.md <<EOF
# Remediation Tracker

**Audit Date**: $(date +%Y-%m-%d)
**Last Updated**: $(date +%Y-%m-%d)

## Status Overview

| Phase | Status | Completed | Total | Progress |
|-------|--------|-----------|-------|----------|
| Phase 0 (P0) | In Progress | 0 | [N] | 0% |
| Phase 1 (P1) | Not Started | 0 | [N] | 0% |
| Phase 2 (P2) | Not Started | 0 | [N] | 0% |

## Detailed Status

### Phase 0: Immediate (P0)
- [ ] **P0-001**: [Description] - Assigned: [Name] - Due: [Date]
  - Branch: [branch-name]
  - PR: [#123]
  - Status: [In Progress/Blocked/Done]

### Phase 1: High-Leverage (P1)
- [ ] **P1-001**: [Description] - Assigned: [Name] - Due: [Date]
- [ ] **P1-002**: [Description] - Assigned: [Name] - Due: [Date]
...

### Phase 2: Opportunistic (P2)
- [ ] **P2-001**: [Description] - Assigned: [Name] - Due: [Date]
...

## Notes
- [Date]: [Status update]
- [Date]: [Status update]
EOF

code standardization/REMEDIATION_TRACKER.md
```

### Update After Each Fix

```bash
# Mark item complete
sed -i 's/\[ \] \*\*P0-001\*\*/\[x\] **P0-001**/' standardization/REMEDIATION_TRACKER.md

# Add note
echo "- $(date +%Y-%m-%d): P0-001 resolved in PR #123" >> standardization/REMEDIATION_TRACKER.md

# Commit
git add standardization/REMEDIATION_TRACKER.md
git commit -m "docs(audit): mark P0-001 as resolved"
```

---

## Phase 7: Schedule Next Audit

### Add Calendar Reminder

Based on audit results:
- **If Grade A or A-**: Schedule next audit in 6 months
- **If Grade B+ or B**: Schedule next audit in 3-4 months
- **If Grade B- or lower**: Schedule next audit in 1-2 months

### Update Checklist

```bash
# Add next audit date to this file
echo "" >> standardization/AUDIT_RERUN_CHECKLIST.md
echo "## Audit History" >> standardization/AUDIT_RERUN_CHECKLIST.md
echo "- $(date +%Y-%m-%d): Grade [X], Next audit: [DATE]" >> standardization/AUDIT_RERUN_CHECKLIST.md
```

---

## Troubleshooting

### Issue: Agent times out or fails

**Solution**: Run audit passes individually instead of in parallel.

### Issue: Findings seem incorrect

**Solution**:
1. Check if codebase changed since contract generation
2. Verify file paths in findings
3. Re-run specific audit pass: `claude-code agent [type] "[prompt]"`

### Issue: Too many findings

**Solution**:
1. Focus on P0 findings first
2. Group related P1 findings into themes
3. Accept P2 findings as future opportunities

### Issue: Contract doesn't match codebase

**Solution**: Regenerate contract with more specific examples:
```bash
claude-code agent context-manager "Infer Repo Audit Contract focusing on [specific area]..." > standardization/REPO_AUDIT_CONTRACT_v2.md
```

---

## Appendix: Quick Commands

```bash
# Generate contract only
claude-code agent context-manager "[contract prompt]" > standardization/REPO_AUDIT_CONTRACT.md

# Run single audit pass
claude-code agent typescript-pro "[audit pass A prompt]" > standardization/AUDIT_PASS_A_CONVENTIONS.md

# Verify findings
grep -r "from.*reducers" views/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Archive old audit
mkdir -p standardization/archive/$(date +%Y%m%d)
mv standardization/AUDIT_*.md standardization/archive/$(date +%Y%m%d)/

# Track remediation
git log --oneline --grep="audit" --since="2026-01-01"
```

---

## Audit History

- 2026-01-10: Grade A-, Next audit: Q3 2026 or after Phase 1 remediation

---

**Document Status**: Living Checklist
**Version**: 1.0
**Last Updated**: 2026-01-10
