---
phase: 7
slug: storage-upload
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
---

# Phase 7 -- Validation Strategy

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
| 07-01-T0 | 01 | 1 | (deps) | smoke | `node -e "const pkg = require('./package.json'); ['unstorage','busboy','nanoid','mime-types','file-type'].forEach(d => { if (!pkg.dependencies[d]) process.exit(1) }); console.log('OK')"` | N/A (npm) | pending |
| 07-01-T1 | 01 | 1 | DB-01, DB-02 | unit | `npx vitest run tests/lib/db/schema-files.test.ts` | tests/lib/db/schema-files.test.ts | pending |
| 07-01-T2 | 01 | 1 | UPLD-07 | unit | `npx vitest run tests/lib/storage/provider.test.ts` | tests/lib/storage/provider.test.ts | pending |
| 07-01-T3 | 01 | 1 | DB-01 | unit | `node -e "const q = require('./src/lib/db/queries'); ['createFile','getFile','getFilesByUser','deleteFile','linkFileToConversation','getFilesByConversation'].forEach(f => { if (typeof q[f] !== 'function') process.exit(1) }); console.log('OK')"` | N/A (queries) | pending |
| 07-01-T4 | 01 | 1 | (scaffolds) | unit | `npx vitest run tests/lib/db/schema-files.test.ts tests/lib/db/queries-files.test.ts tests/lib/storage/provider.test.ts tests/lib/validation/file-validation.test.ts tests/hooks/use-file-upload.test.ts tests/components/files/file-chip.test.tsx tests/components/files/file-upload-button.test.tsx tests/app/api/files/upload.test.ts` | 8 scaffold files | pending |
| 07-02-T1 | 02 | 2 | UPLD-03, UPLD-04 | unit | `npx vitest run tests/lib/validation/file-validation.test.ts` | tests/lib/validation/file-validation.test.ts | pending |
| 07-02-T2 | 02 | 2 | UPLD-08, UPLD-03 | unit | `npx vitest run tests/app/api/files/upload.test.ts` | tests/app/api/files/upload.test.ts | pending |
| 07-03-T1 | 03 | 3 | UPLD-06 | unit | `npx vitest run tests/components/files/file-chip.test.tsx` | tests/components/files/file-chip.test.tsx | pending |
| 07-03-T2 | 03 | 3 | UPLD-01, UPLD-02, UPLD-05 | unit | `npx vitest run tests/hooks/use-file-upload.test.ts tests/components/files/file-upload-button.test.tsx` | tests/hooks/use-file-upload.test.ts, tests/components/files/file-upload-button.test.tsx | pending |
| 07-03-T3 | 03 | 3 | UPLD-01, UPLD-06 | unit | `npx vitest run tests/components/files/file-chip.test.tsx tests/hooks/use-file-upload.test.ts tests/components/files/file-upload-button.test.tsx` | N/A (chat-input) | pending |
| 07-03-T4 | 03 | 3 | UPLD-01~06 | manual | (see checkpoint) | N/A | pending |

*Status: pending | green | red | flaky*

---

## Wave 0 Requirements

All Wave 0 scaffold files are created by Plan 01 Task 4 (07-01-T4):

- [x] `tests/lib/db/schema-files.test.ts` -- schema validation tests
- [x] `tests/lib/db/queries-files.test.ts` -- query function export tests
- [x] `tests/lib/storage/provider.test.ts` -- storage type/classification tests
- [x] `tests/lib/validation/file-validation.test.ts` -- validation scaffold (expanded in Plan 02)
- [x] `tests/hooks/use-file-upload.test.ts` -- hook scaffold (expanded in Plan 03)
- [x] `tests/components/files/file-chip.test.tsx` -- component scaffold (expanded in Plan 03)
- [x] `tests/components/files/file-upload-button.test.tsx` -- component scaffold (expanded in Plan 03)
- [x] `tests/app/api/files/upload.test.ts` -- API scaffold (expanded in Plan 02)

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
