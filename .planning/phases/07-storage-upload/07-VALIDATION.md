---
phase: 7
slug: storage-upload
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | DB-01 | unit | `npx vitest run tests/lib/db/` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | DB-02 | unit | `npx vitest run tests/lib/db/` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | UPLD-07 | unit | `npx vitest run tests/lib/storage/` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | UPLD-03, UPLD-04 | unit | `npx vitest run tests/lib/validation/` | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 2 | UPLD-08, UPLD-01, UPLD-02 | unit | `npx vitest run tests/api/files/` | ❌ W0 | ⬜ pending |
| 07-05-01 | 05 | 3 | UPLD-05, UPLD-06 | unit | `npx vitest run tests/components/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/storage/storage.test.ts` — stubs for storage layer tests
- [ ] `tests/lib/validation/file-validation.test.ts` — stubs for file validation tests
- [ ] `tests/api/files/upload.test.ts` — stubs for upload API tests
- [ ] `tests/components/chat/file-upload.test.tsx` — stubs for upload UI component tests

*Existing infrastructure covers framework setup (vitest.config.ts, tests/setup.ts).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop file upload UX | UPLD-01 | Browser drag events hard to unit test | 1. Open chat page 2. Drag a PDF into input area 3. Verify border highlight + file chip appears |
| Attachment button click UX | UPLD-02 | File dialog interaction is browser-native | 1. Click paperclip button 2. Select a file 3. Verify file chip appears |
| Upload progress animation | UPLD-05 | Visual animation verification | 1. Upload a file >1MB 2. Verify progress bar fills and percentage updates |
| Error chip auto-fadeout | UPLD-04 | CSS transition timing | 1. Upload an .exe file 2. Verify red error chip appears 3. Wait 5s and verify fadeout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
