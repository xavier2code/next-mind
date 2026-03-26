---
phase: 04
slug: smart-orchestration-communication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --grep "scheduler\|message-bus\|wave" --run` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --grep "scheduler\|message-bus" --run`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | ORCH-01 | unit | `vitest run tests/lib/agents/scheduler.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | ORCH-02 | unit | `vitest run tests/lib/agents/scheduler.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | ORCH-03 | unit | `vitest run tests/lib/agents/scheduler.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | ORCH-04 | unit | `vitest run tests/lib/agents/scheduler.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | ORCH-05 | unit | `vitest run tests/lib/agents/scheduler.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | COMM-01~05 | unit | `vitest run tests/lib/agents/message-bus.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | COMM-06 | unit | `vitest run tests/lib/db/queries-messages.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | ORCH-06 | integration | `vitest run tests/components/pipeline-view.test.tsx` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | SSE | integration | `vitest run tests/app/api/workflow-status.test.ts` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | ORCH-01 | unit | `vitest run tests/lib/agents/decomposition-deps.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/agents/scheduler.test.ts` — Wave scheduler with topological sort (ORCH-01~05)
- [ ] `tests/lib/agents/message-bus.test.ts` — Agent message bus (COMM-01~05)
- [ ] `tests/lib/db/queries-messages.test.ts` — Message persistence queries (COMM-06)
- [ ] `tests/lib/agents/decomposition-deps.test.ts` — Dependency-aware decomposition (ORCH-01)
- [ ] `tests/components/pipeline-view.test.tsx` — Pipeline visualization component (ORCH-06)
- [ ] `tests/app/api/workflow-status.test.ts` — SSE endpoint tests

*Existing infrastructure covers: executor, registry, types, db schema*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE connection in browser | ORCH-06 | Requires live browser EventSource | Open workflow page, verify real-time status updates appear without refresh |
| Cascade cancel visualization | ORCH-03 | Visual behavior in UI | Trigger task failure, verify dependent tasks show "cancelled" status in UI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
