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
| 10-01-00 | 01 | 1 | CHAT-01~04 | interface | `test -f src/lib/chat/types.ts && grep -q "AttachmentFile" src/lib/chat/types.ts` | N/A (scaffold) | ⬜ pending |
| 10-01-01 | 01 | 1 | CHAT-01~04 | unit (TDD) | `npx vitest run tests/chat/inject-file-content.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | SKIL-01~04 | unit (TDD) | `npx vitest run tests/skills/file-processing.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | CHAT-05 | unit | `npx vitest run tests/components/file-chip-edit.test.tsx` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 | 2 | CHAT-05 | unit | `npx vitest run tests/hooks/use-file-upload.test.ts` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 3 | CHAT-01~05, SKIL-01~04 | manual | echo "Manual verification checkpoint" | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/chat/inject-file-content.test.ts` — stubs for CHAT-01~04 (injection module)
- [ ] `tests/skills/file-processing.test.ts` — stubs for SKIL-01~04 (file processing skills)
- [ ] `tests/components/file-chip-edit.test.tsx` — stubs for CHAT-05 (FileChip inline editor)
- [ ] `tests/hooks/use-file-upload.test.ts` — stubs for CHAT-05 (editedContent tracking in hook)

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
