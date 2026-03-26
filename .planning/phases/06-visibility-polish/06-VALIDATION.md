---
phase: 6
slug: visibility-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run test:coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | VIS-03 | unit | `vitest run tests/components/workflow-progress.test.tsx` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | VIS-03 | unit | `vitest run tests/components/workflow-progress.test.tsx` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | VIS-01 | unit | `vitest run tests/components/agent-status-list.test.tsx` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | VIS-02 | unit | `vitest run tests/components/agent-status-list.test.tsx` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | VIS-04 | unit | `vitest run tests/components/collapsible-log-section.test.tsx` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | VIS-04 | unit | `vitest run tests/lib/db/queries-logs.test.ts` | ❌ W0 | ⬜ pending |
| 06-04-01 | 04 | 2 | VIS-05 | unit | `vitest run tests/components/workflow-panel.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/components/workflow-progress.test.tsx` — stubs for VIS-03
- [ ] `tests/components/agent-status-list.test.tsx` — stubs for VIS-01, VIS-02
- [ ] `tests/components/collapsible-log-section.test.tsx` — stubs for VIS-04
- [ ] `tests/lib/db/queries-logs.test.ts` — log query function tests
- [ ] `tests/components/workflow-panel.test.tsx` — stubs for VIS-05

*Reference: `tests/components/pipeline-view.test.tsx` for existing patterns*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE real-time connection | VIS-01, VIS-03 | Requires live server | 1. Start dev server 2. Trigger workflow 3. Verify status updates in real-time |
| Progress bar animation | VIS-03 | Visual animation | 1. Trigger workflow 2. Observe smooth progress bar transition |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
