---
phase: "02"
slug: tool-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing from Phase 1) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | MCP-01 | unit | `npm test -- mcp.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | MCP-02 | unit | `npm test -- tools.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | MCP-03 | unit | `npm test -- resources.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | MCP-04 | unit | `npm test -- prompts.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 2 | MCP-05 | unit | `npm test -- bash-sandbox.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 2 | MCP-06,07,08,09 | unit | `npm test -- security.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | SKILL-01 | unit | `npm test -- skills.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | SKILL-02 | unit | `npm test -- skill-registry.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | SKILL-03 | unit | `npm test -- orchestration.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 2 | SKILL-04,05 | unit | `npm test -- approval.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-05 | 02 | 3 | SKILL-06 | unit | `npm test -- discovery.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-06 | 02 | 3 | SKILL-07 | unit | `npm test -- versioning.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/mcp.test.ts` — MCP protocol tests (JSON-RPC 2.0 compliance)
- [ ] `tests/tools.test.ts` — Tool registry tests
- [ ] `tests/resources.test.ts` — Resource manager tests
- [ ] `tests/prompts.test.ts` — Prompt template tests
- [ ] `tests/bash-sandbox.test.ts` — Bash execution sandboxing tests
- [ ] `tests/security.test.ts` — MCP security tests (auth, validation, privileges)
- [ ] `tests/skills.test.ts` — Skills execution tests
- [ ] `tests/skill-registry.test.ts` — Skill registration and discovery tests
- [ ] `tests/orchestration.test.ts` — Skill orchestration tests
- [ ] `tests/approval.test.ts` — Approval flow tests
- [ ] `tests/discovery.test.ts` — Skill discovery UI tests
- [ ] `tests/versioning.test.ts` — Skill versioning tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inline approval UX in chat | SKILL-05 | Requires visual verification of chat flow | 1. Trigger destructive action via skill 2. Verify approval prompt appears inline 3. Click Approve, verify action executes |
| Skill discovery sidebar | SKILL-06 | Requires visual verification of UI layout | 1. Open chat interface 2. Verify skills panel visible in sidebar 3. Browse available skills |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
