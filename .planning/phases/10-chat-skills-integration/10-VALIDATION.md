---
phase: 10
slug: chat-skills-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/ --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/ --reporter=verbose`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | CHAT-01 | unit | `npx vitest run tests/chat/inject-file-content.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | CHAT-02 | unit | `npx vitest run tests/chat/inject-file-content.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | CHAT-03, CHAT-04 | unit | `npx vitest run tests/chat/inject-file-content.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 1 | CHAT-05 | unit | `npx vitest run tests/components/file-chip-edit.test.tsx` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 1 | CHAT-01, DB-02 | unit | `npx vitest run tests/chat/attachment-bar.test.tsx` | ❌ W0 | ⬜ pending |
| 10-05-01 | 05 | 2 | SKIL-01 | unit | `npx vitest run tests/skills/file-extract.test.ts` | ❌ W0 | ⬜ pending |
| 10-06-01 | 06 | 2 | SKIL-02 | unit | `npx vitest run tests/skills/file-convert.test.ts` | ❌ W0 | ⬜ pending |
| 10-07-01 | 07 | 2 | SKIL-03 | unit | `npx vitest run tests/skills/file-classify.test.ts` | ❌ W0 | ⬜ pending |
| 10-08-01 | 08 | 2 | SKIL-04 | unit | `npx vitest run tests/skills/file-read-list.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/chat/inject-file-content.test.ts` — stubs for CHAT-01~04
- [ ] `tests/components/file-chip-edit.test.tsx` — stubs for CHAT-05
- [ ] `tests/chat/attachment-bar.test.tsx` — stubs for CHAT-01 attachment display
- [ ] `tests/skills/file-extract.test.ts` — stubs for SKIL-01
- [ ] `tests/skills/file-convert.test.ts` — stubs for SKIL-02
- [ ] `tests/skills/file-classify.test.ts` — stubs for SKIL-03
- [ ] `tests/skills/file-read-list.test.ts` — stubs for SKIL-04

*Existing infrastructure covers test framework and setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| File content appears in AI response | CHAT-01 | E2E visual flow | Upload file, send message with file, verify AI references file content |
| Attachment bar renders below user message | CHAT-01 | Visual component | Send message with file, verify attachment bar shows filename, icon, size |
| Multiple files all injected | CHAT-03 | E2E multi-file flow | Attach 3 files, send, verify all contents in AI response |
| Inline edit changes reflected in AI response | CHAT-05 | E2E edit flow | Edit file content in FileChip, send, verify AI uses edited version |
| Skills appear in skill registry | SKIL-01~04 | Agent integration | Check /api/skills returns file-extract, file-convert, file-classify |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
