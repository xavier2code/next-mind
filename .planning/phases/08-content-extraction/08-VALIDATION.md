---
phase: 8
slug: content-extraction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 8 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/lib/extraction/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/lib/extraction/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | EXTR-01 | unit | `npx vitest run tests/lib/extraction/pdf-extractor.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | EXTR-02 | unit | `npx vitest run tests/lib/extraction/docx-extractor.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | EXTR-03 | unit | `npx vitest run tests/lib/extraction/code-extractor.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-04 | 01 | 1 | EXTR-04 | unit | `npx vitest run tests/lib/extraction/csv-extractor.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | EXTR-05 | unit | `npx vitest run tests/lib/extraction/excel-extractor.test.ts` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | EXTR-06 | unit | `npx vitest run tests/lib/extraction/dispatcher.test.ts` | ❌ W0 | ⬜ pending |
| 08-03-02 | 03 | 2 | EXTR-07 | unit | `npx vitest run tests/app/api/files/status.test.ts tests/app/api/files/extract.test.ts` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 3 | EXTR-07 | unit | `npx vitest run tests/hooks/use-file-extraction-status.test.ts` | ❌ W0 | ⬜ pending |
| 08-04-02 | 04 | 3 | EXTR-07 | unit | `npx vitest run tests/components/files/file-chip.test.tsx tests/hooks/use-file-upload.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 test stubs are created as part of Plan 01 Task 0 (dependency installation) and Tasks 1-2 (implementation with TDD). No separate Wave 0 plan is needed because Plan 01 uses TDD -- test files are created alongside their production counterparts in each task.

Test file locations (created by Plans 01-04):
- [ ] `tests/lib/extraction/pdf-extractor.test.ts` -- stubs for EXTR-02 (PDF extraction)
- [ ] `tests/lib/extraction/docx-extractor.test.ts` -- stubs for EXTR-03 (DOCX extraction)
- [ ] `tests/lib/extraction/code-extractor.test.ts` -- stubs for EXTR-04 (code file extraction)
- [ ] `tests/lib/extraction/csv-extractor.test.ts` -- stubs for EXTR-05 (CSV extraction)
- [ ] `tests/lib/extraction/excel-extractor.test.ts` -- stubs for EXTR-05 (Excel extraction)
- [ ] `tests/lib/extraction/dispatcher.test.ts` -- stubs for EXTR-06 (orchestrator)
- [ ] `tests/app/api/files/status.test.ts` -- stubs for EXTR-07 (status API)
- [ ] `tests/app/api/files/extract.test.ts` -- stubs for EXTR-07 (retry API)
- [ ] `tests/hooks/use-file-extraction-status.test.ts` -- stubs for EXTR-07 (polling hook)
- [ ] `tests/components/files/file-chip.test.tsx` -- stubs for EXTR-07 (FileChip states)
- [ ] `tests/hooks/use-file-upload.test.ts` -- stubs for EXTR-07 (upload hook integration)
- [ ] Install extraction dependencies: `unpdf mammoth turndown papaparse exceljs`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| mammoth dynamic import bypasses Turbopack | EXTR-03 | Turbopack behavior only testable at build time | Run `npm run build` and verify no Turbopack errors related to mammoth |
| PDF extraction quality on real documents | EXTR-02 | Subjective quality of Markdown output | Upload a multi-section PDF via API and inspect extracted Markdown structure |
| Large file timeout behavior | EXTR-06 | Requires file larger than timeout threshold | Upload a large PDF and verify 30s timeout triggers status='failed' |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
