---
phase: 08-content-extraction
plan: 01
subsystem: extraction
tags: [unpdf, mammoth, turndown, typescript, vitest, strategy-pattern, dynamic-import]

# Dependency graph
requires:
  - phase: 07-storage-upload
    provides: File upload infrastructure, storage layer, file DB schema
provides:
  - ExtractorResult and Extractor interfaces for strategy pattern
  - PdfExtractor with unpdf text extraction + textToMarkdown conversion
  - DocxExtractor with mammoth HTML + turndown Markdown pipeline
  - textToMarkdown rule-based PDF text-to-Markdown converter (D-11)
  - htmlToMarkdown turndown wrapper with dynamic import (D-04)
affects: [08-02-extraction-coordinator, 09-file-management]

# Tech tracking
tech-stack:
  added: [unpdf, mammoth, turndown, papaparse, exceljs, @types/turndown, @types/papaparse]
  patterns: [strategy-pattern, dynamic-import, rule-based-conversion]

key-files:
  created:
    - src/lib/extraction/types.ts
    - src/lib/extraction/extractors/pdf-extractor.ts
    - src/lib/extraction/extractors/docx-extractor.ts
    - src/lib/extraction/markdown/pdf-to-markdown.ts
    - src/lib/extraction/markdown/html-to-markdown.ts
    - tests/lib/extraction/pdf-extractor.test.ts
    - tests/lib/extraction/docx-extractor.test.ts
    - tests/lib/extraction/pdf-to-markdown.test.ts
    - tests/lib/extraction/html-to-markdown.test.ts
  modified:
    - package.json

key-decisions:
  - "Sub-heading check (\\d+\\.\\d+) placed before ALL-CAPS check to correctly distinguish '1.1 OVERVIEW' (h3) from 'OVERVIEW' (h2)"
  - "mammoth warnings embedded as HTML comments per D-10 so downstream consumers can surface conversion losses"

patterns-established:
  - "Strategy pattern: each file type gets a dedicated Extractor class implementing common interface"
  - "Dynamic import() for all parsing libraries (unpdf, mammoth, turndown) to bypass Turbopack per D-04"
  - "D-10 convention: conversion warnings as HTML comments in extractedMarkdown for transparency"

requirements-completed: [EXTR-01, EXTR-02, EXTR-08, EXTR-09]

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 08 Plan 01: Core Extraction Types & Document Extractors Summary

**Strategy pattern type contracts, PDF extractor via unpdf + rule-based Markdown, DOCX extractor via mammoth + turndown with D-10 warning annotations**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T15:29:57Z
- **Completed:** 2026-03-26T15:32:40Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- ExtractorResult and Extractor interfaces define the strategy pattern contract for all file-type extractors
- PdfExtractor uses unpdf with dynamic import() and rule-based textToMarkdown() for PDF-to-Markdown conversion (D-11)
- DocxExtractor uses mammoth dynamic import() for DOCX-to-HTML then htmlToMarkdown() for HTML-to-Markdown (D-09)
- mammoth conversion warnings embedded as HTML comments in extractedMarkdown per D-10
- 33 unit tests covering all extractors and markdown utilities with mocked dependencies

## Task Commits

Each task was committed atomically:

1. **Task 0: Install extraction dependencies** - `1dcf8a9` (chore)
2. **Task 1: Define extraction types and markdown utilities** - `3721f4c` (feat)
3. **Task 2: Implement document extractors (PDF + DOCX)** - `7860cb8` (feat)

## Files Created/Modified
- `src/lib/extraction/types.ts` - ExtractorResult interface and Extractor strategy interface
- `src/lib/extraction/extractors/pdf-extractor.ts` - PDF text extraction via unpdf + textToMarkdown
- `src/lib/extraction/extractors/docx-extractor.ts` - DOCX-to-Markdown via mammoth + turndown with D-10 warnings
- `src/lib/extraction/markdown/pdf-to-markdown.ts` - Rule-based text-to-Markdown converter (D-11)
- `src/lib/extraction/markdown/html-to-markdown.ts` - turndown wrapper with dynamic import (D-04)
- `tests/lib/extraction/pdf-extractor.test.ts` - 6 tests for PdfExtractor with mocked unpdf
- `tests/lib/extraction/docx-extractor.test.ts` - 9 tests for DocxExtractor with mocked mammoth
- `tests/lib/extraction/pdf-to-markdown.test.ts` - 12 tests for textToMarkdown heuristics
- `tests/lib/extraction/html-to-markdown.test.ts` - 6 tests for htmlToMarkdown with mocked turndown
- `package.json` - Added unpdf, mammoth, turndown, papaparse, exceljs, @types/turndown, @types/papaparse

## Decisions Made
- Sub-heading pattern (`\d+\.\d+`) checked before ALL-CAPS heading to correctly distinguish "1.1 OVERVIEW" (h3) from "OVERVIEW" (h2) -- ordering matters in the rule chain
- mammoth warnings embedded as HTML comments (not stripped) so downstream consumers (LLMs, UI preview) can surface conversion losses transparently per D-10

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed heading detection order in textToMarkdown**
- **Found during:** Task 1 (Define extraction types and markdown utilities)
- **Issue:** "1.1 OVERVIEW" matched the ALL-CAPS heading check before reaching the sub-heading check, producing `## 1.1 OVERVIEW` instead of `### 1.1 OVERVIEW`
- **Fix:** Reordered checks: sub-heading (`\d+\.\d+` pattern) and main heading (`\d+.` pattern) checked BEFORE plain ALL-CAPS. Also updated test to use realistic ALL-CAPS text after sub-heading numbers.
- **Files modified:** `src/lib/extraction/markdown/pdf-to-markdown.ts`, `tests/lib/extraction/pdf-to-markdown.test.ts`
- **Committed in:** `3721f4c` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix necessary for correctness. PDF heading hierarchy depends on check ordering. No scope creep.

## Issues Encountered
None - all parsing libraries installed cleanly, all tests pass on first run after the heading order fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Extractor interface and PDF/DOCX extractors ready for dispatcher integration (Plan 02)
- All dependencies installed for code/CSV/Excel extractors (handled by Plan 02 in parallel)
- No blockers for Plan 03 (dispatcher) or Plan 04 (API endpoints)

## Self-Check: PASSED

All 10 files verified as present. All 3 commits verified as existing.

---
*Phase: 08-content-extraction*
*Completed: 2026-03-26*
