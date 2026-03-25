---
phase: 03
slug: foundation-task-decomposition
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | ATYPE-01 | unit | `npm run test -- --run tests/lib/agents/registry.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | ATYPE-02 | unit | `npm run test -- --run tests/lib/agents/types.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | DELEG-01 | unit | `npm run test -- --run tests/lib/db/schema-agents.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | DELEG-02~04 | unit | `npm run test -- --run tests/lib/agents/decomposer.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | INTG-01~05 | integration | `npm run test -- --run tests/lib/agents/skill-integration.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/agents/registry.test.ts` — stubs for ATYPE-01~07
- [ ] `tests/lib/agents/types.test.ts` — stubs for Agent Card types
- [ ] `tests/lib/db/schema-agents.test.ts` — stubs for database schema
- [ ] `tests/lib/agents/decomposer.test.ts` — stubs for DELEG-01~10
- [ ] `tests/lib/agents/skill-integration.test.ts` — stubs for INTG-01~05
- [ ] `tests/fixtures/agent-cards.ts` — test fixtures for Agent Cards

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LLM decomposition quality | DELEG-03 | Requires subjective evaluation of decomposition logic | Submit complex task, verify subtasks are sensible |
| Agent Card skill resolution | ATYPE-04 | Runtime behavior depends on live skill registry | Register agent with skill IDs, verify resolved capabilities |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
