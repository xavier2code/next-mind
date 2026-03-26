---
phase: 8
slug: content-extraction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/unit/extraction/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit/extraction/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | EXTR-01 | unit | `npx vitest run tests/unit/extraction/strategy.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | EXTR-02 | unit | `npx vitest run tests/unit/extraction/pdf.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | EXTR-03 | unit | `npx vitest run tests/unit/extraction/docx.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-04 | 01 | 1 | EXTR-04 | unit | `npx vitest run tests/unit/extraction/code.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | EXTR-05 | unit | `npx vitest run tests/unit/extraction/csv.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | EXTR-05 | unit | `npx vitest run tests/unit/extraction/excel.test.ts` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | EXTR-06 | unit | `npx vitest run tests/unit/extraction/extractor.test.ts` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 2 | EXTR-07, EXTR-08 | unit | `npx vitest run tests/unit/extraction/trigger.test.ts` | ❌ W0 | ⬜ pending |
| 08-05-01 | 05 | 3 | EXTR-09 | unit | `npx vitest run tests/unit/api/file-status.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/extraction/strategy.test.ts` — stubs for EXTR-01 (strategy pattern interface)
- [ ] `tests/unit/extraction/pdf.test.ts` — stubs for EXTR-02 (PDF extraction)
- [ ] `tests/unit/extraction/docx.test.ts` — stubs for EXTR-03 (DOCX extraction)
- [ ] `tests/unit/extraction/code.test.ts` — stubs for EXTR-04 (code file extraction)
- [ ] `tests/unit/extraction/csv.test.ts` — stubs for EXTR-05 (CSV extraction)
- [ ] `tests/unit/extraction/excel.test.ts` — stubs for EXTR-05 (Excel extraction)
- [ ] `tests/unit/extraction/extractor.test.ts` — stubs for EXTR-06 (orchestrator)
- [ ] `tests/unit/extraction/trigger.test.ts` — stubs for EXTR-07, EXTR-08 (trigger + retry)
- [ ] `tests/unit/api/file-status.test.ts` — stubs for EXTR-09 (status API)
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
