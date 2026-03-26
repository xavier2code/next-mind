---
phase: 08-content-extraction
plan: 03
subsystem: extraction
tags: [typescript, semaphore, fire-and-forget, tdd, vitest, audit-logging]

# Dependency graph
requires:
  - phase: 08-01
    provides: "Extractor/ExtractorResult interfaces, PDF and DOCX extractors"
  - phase: 08-02
    provides: "CodeExtractor, CsvExtractor, ExcelExtractor, table-formatter"
provides:
  - ExtractionDispatcher with mimeType-based strategy routing
  - ExtractionSemaphore for concurrency limiting (max 2)
  - DB queries: getFileById, updateFileStatus, updateFileExtraction
  - Upload route fire-and-forget extraction trigger
  - GET /api/files/[id]/status polling endpoint
  - POST /api/files/[id]/extract manual retry endpoint
  - AuditAction extensions for extraction lifecycle events
affects: [08-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [strategy-dispatcher, fire-and-forget-extraction, semaphore-concurrency, withTimeout-promise-race]

key-files:
  created:
    - src/lib/extraction/dispatcher.ts
    - src/lib/extraction/concurrency.ts
    - src/app/api/files/[id]/status/route.ts
    - src/app/api/files/[id]/extract/route.ts
    - tests/lib/extraction/dispatcher.test.ts
    - tests/app/api/files/status.test.ts
    - tests/app/api/files/extract.test.ts
  modified:
    - src/lib/db/queries.ts
    - src/types/index.ts
    - src/app/api/files/upload/route.ts

key-decisions:
  - "Used AuditLogEntry object interface for logAudit calls (matching existing codebase pattern) instead of positional args shown in plan"
  - "Extractor mocks use @/lib paths (not relative) since dispatcher's dynamic import() resolves from src/"
  - "Semaphore default maxConcurrency=2 (conservative per RESEARCH.md Open Question 2)"

patterns-established:
  - "Fire-and-forget extraction: upload route calls extractFile() without awaiting, errors caught internally"
  - "Status transition guard: extractFile skips files already in processing/ready state"
  - "Extraction lifecycle audit: file_extraction_start/complete/failed events logged via logAudit().catch()"
  - "API route ownership check: both status and extract endpoints verify file.userId === session.user.id"

requirements-completed: [EXTR-06, EXTR-07]

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 8 Plan 03: Extraction Dispatcher and API Integration Summary

**Extraction dispatcher with mimeType-based strategy routing, 30-second timeout, concurrency semaphore, fire-and-forget upload trigger, and authenticated status/retry API endpoints.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T15:34:56Z
- **Completed:** 2026-03-26T15:37:48Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- ExtractionDispatcher routes files to correct extractor (PDF, DOCX, code, CSV, Excel) based on mimeType
- ExtractionSemaphore limits concurrent extractions to 2 to prevent memory overflow
- 30-second timeout per file via Promise.race wrapper (D-05)
- Upload route triggers extraction fire-and-forget after createFile (D-01)
- Status polling endpoint returns file status and errorMessage for authenticated users
- Retry endpoint re-triggers extraction for failed files only (D-02)
- All extraction lifecycle events logged via logAudit() fire-and-forget pattern
- 33 passing unit tests covering dispatcher, status, and extract behaviors

## Task Commits

Each task was committed atomically:

1. **Task 1: Concurrency limiter, DB queries, and extraction dispatcher** - `7a72ac2` (feat)
2. **Task 2: Upload trigger, status API, and retry API** - `aca5f07` (feat)

## Files Created/Modified
- `src/lib/extraction/dispatcher.ts` - Main extraction coordinator with strategy dispatch, timeout, audit logging
- `src/lib/extraction/concurrency.ts` - ExtractionSemaphore limiting parallel extractions to 2
- `src/lib/db/queries.ts` - Added getFileById, updateFileStatus, updateFileExtraction query functions
- `src/types/index.ts` - Extended AuditAction with file_extraction_start/complete/failed
- `src/app/api/files/upload/route.ts` - Added fire-and-forget extractFile() trigger after createFile
- `src/app/api/files/[id]/status/route.ts` - GET endpoint returning file status for authenticated user
- `src/app/api/files/[id]/extract/route.ts` - POST endpoint for manual retry of failed extractions
- `tests/lib/extraction/dispatcher.test.ts` - 20 tests for dispatcher (status transitions, timeout, audit, extractor selection)
- `tests/app/api/files/status.test.ts` - 6 tests for status endpoint (auth, ownership, all statuses)
- `tests/app/api/files/extract.test.ts` - 7 tests for retry endpoint (auth, ownership, status guards)

## Decisions Made
- Used the existing `logAudit(AuditLogEntry)` object interface (not positional args) to match the codebase's actual API signature from `src/lib/audit.ts`
- Mocked extractors using `@/lib/extraction/extractors/*` paths (not relative `./extractors/*`) because `vi.mock()` must match the resolved import path when the dispatcher's dynamic `import()` runs from `src/lib/extraction/`
- Both new API routes export `runtime = 'nodejs'` per CLAUDE.md pattern (extraction uses Node.js-only libraries)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Adapted logAudit calls to match actual codebase API**
- **Found during:** Task 1 (dispatcher implementation)
- **Issue:** Plan showed `logAudit('action', userId, { details })` but the actual `logAudit` function in `src/lib/audit.ts` takes an `AuditLogEntry` object with fields `{ userId, action, resource, resourceId, metadata, ... }`
- **Fix:** Used the correct `AuditLogEntry` interface with proper field names in all logAudit calls
- **Files modified:** src/lib/extraction/dispatcher.ts
- **Verification:** All audit tests pass, function signature matches existing codebase pattern

**2. [Rule 3 - Blocking] Fixed extractor mock paths in tests**
- **Found during:** Task 1 RED phase (initial test run showed actual PDF extraction running)
- **Issue:** Test mocks used relative paths (`./extractors/pdf-extractor`) but the dispatcher resolves from `src/lib/extraction/`, so the mocks weren't intercepted
- **Fix:** Changed mock paths to `@/lib/extraction/extractors/*` to match the resolved import paths
- **Files modified:** tests/lib/extraction/dispatcher.test.ts
- **Verification:** All 20 dispatcher tests pass with mocked extractors

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. logAudit adaptation matches existing codebase convention. Mock path fix is a test infrastructure issue. No scope creep.

## Issues Encountered
- `vi.mock()` for dynamic imports requires matching the resolved module path, not the relative path from the test file. The `@/` alias resolves to `src/`, so mocks must use `@/lib/...` when the source code uses relative imports from `src/lib/extraction/`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full extraction pipeline complete: upload -> fire-and-forget extractFile -> status tracking -> DB persistence
- Status and retry endpoints ready for Phase 9 file management UI
- Plan 04 (if any remaining work) can build on this dispatcher infrastructure

## Self-Check: PASSED

All 10 files verified present. All 2 commits verified in git history.

---
*Phase: 08-content-extraction*
*Completed: 2026-03-26*
