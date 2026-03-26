---
phase: 5
slug: control-verification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run test:coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | CTRL-01 | unit | `vitest run tests/lib/agents/scheduler.test.ts -t pause` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | CTRL-02 | unit | `vitest run tests/lib/agents/scheduler.test.ts -t cancel` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | CTRL-04 | unit | `vitest run tests/lib/agents/checkpoint.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | CTRL-05 | unit | `vitest run tests/lib/agents/checkpoint.test.ts -t resume` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 2 | CTRL-06 | unit | `vitest run tests/lib/skills/executor.test.ts -t timeout` | ✅ | ⬜ pending |
| 05-03-01 | 03 | 2 | RSLT-05 | unit | `vitest run tests/lib/agents/result-display.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | CTRL-01,02 | integration | `vitest run tests/app/api/workflow-control.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/agents/checkpoint.test.ts` — checkpoint save/load tests (CTRL-04, CTRL-05)
- [ ] `tests/lib/agents/result-display.test.ts` — source label formatting (RSLT-05)
- [ ] `tests/app/api/workflow-control.test.ts` — API endpoint tests (CTRL-01, CTRL-02)
- [ ] Extend `tests/lib/agents/scheduler.test.ts` — add pause/cancel test cases
- [ ] `tests/lib/db/schema-checkpoint.test.ts` — verify checkpoint column migration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UI button interaction | CTRL-01~03 | Complex user interaction flows | 1. Start workflow 2. Click pause 3. Verify wave stops 4. Click resume 5. Verify continues |
| Pause/resume across refresh | CTRL-05 | Browser state persistence | 1. Pause workflow 2. Refresh page 3. Verify paused state persists 4. Resume |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
