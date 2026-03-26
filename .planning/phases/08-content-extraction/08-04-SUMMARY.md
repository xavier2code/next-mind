---
phase: 08-content-extraction
plan: 04
subsystem: ui
tags: [react, hooks, polling, file-extraction, lucide-react, vitest]

# Dependency graph
requires:
  - phase: 08-03
    provides: "Extraction dispatcher, status/retry API endpoints, extraction lifecycle in upload route"
provides:
  - useFileExtractionStatus polling hook with 2s interval and terminal-state detection
  - FileChip processing/ready extraction states with correct colors and accessibility
  - useFileUpload integration with extraction status polling and state syncing
affects: [09-file-management-preview]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Polling hook pattern: useState + useRef(activeSet) + setInterval with per-file terminal detection"
    - "Extraction error chips stay visible (no auto-fade) vs upload error chips (auto-fade with onRetry)"

key-files:
  created:
    - src/hooks/use-file-extraction-status.ts
    - tests/hooks/use-file-extraction-status.test.ts
  modified:
    - src/components/files/file-chip.tsx
    - src/hooks/use-file-upload.ts
    - tests/components/files/file-chip.test.tsx
    - tests/hooks/use-file-upload.test.ts

key-decisions:
  - "Auto-fade only for upload errors (with onRetry); extraction errors (no onRetry) stay visible per 08-UI-SPEC"
  - "Polling interval 2s per UI spec; silent retry on network error (non-critical UX)"

patterns-established:
  - "Extraction status lifecycle: uploaded -> processing -> ready/failed synced via useEffect watching extractionStatus.statuses"

requirements-completed: [EXTR-07]

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 08 Plan 04: Extraction Status UI Summary

**Polling hook with 2s interval drives FileChip through processing spinner, ready checkmark, or failed error states after file upload**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T15:44:26Z
- **Completed:** 2026-03-26T15:46:36Z
- **Tasks:** 3 (2 auto + 1 checkpoint verification)
- **Files modified:** 6

## Accomplishments
- useFileExtractionStatus hook polls GET /api/files/:id/status every 2s, stops per-file on terminal states, cleans up on unmount
- FileChip extended with processing (blue Loader2 spinner, "Processing...", no close button) and ready (emerald CheckCircle2, file size, close button) states
- useFileUpload starts extraction polling after upload completes and syncs status transitions back to PendingFile state
- Extraction error chips do NOT auto-fade (stay visible for user action); upload error chips still auto-fade after 5s

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useFileExtractionStatus hook** - `dd83979` (feat)
2. **Task 2: Extend FileChip and useFileUpload with extraction states** - `59a8495` (feat)
3. **Task 3: Verify extraction status UI end-to-end** - `e20c7b2` (fix)

**Plan metadata:** (to be committed with docs commit)

## Files Created/Modified
- `src/hooks/use-file-extraction-status.ts` - Polling hook with 2s interval, per-file terminal detection, cleanup
- `src/components/files/file-chip.tsx` - Extended with processing/ready states, extraction-error no-auto-fade fix
- `src/hooks/use-file-upload.ts` - Extraction status polling integration after upload, status sync
- `tests/hooks/use-file-extraction-status.test.ts` - 11 tests covering all polling behaviors
- `tests/components/files/file-chip.test.tsx` - 22 tests including extraction states and auto-fade distinction
- `tests/hooks/use-file-upload.test.ts` - 10 tests including extraction integration mock

## Decisions Made
- Auto-fade gated on `onRetry` presence: upload errors (retriable) auto-fade, extraction errors (not retriable from chip) persist
- Extraction failure mapped to 'error' status in PendingFile with error message "Extraction failed" for consistent FileChip rendering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extraction error chips incorrectly auto-fade**
- **Found during:** Task 3 (verification code review)
- **Issue:** All error chips auto-fade after 5s regardless of error type. 08-UI-SPEC requires extraction errors to stay visible for user action.
- **Fix:** Gate auto-fade on `onRetry` prop -- only upload errors (with onRetry) auto-fade; extraction errors (no onRetry) persist.
- **Files modified:** src/components/files/file-chip.tsx, tests/components/files/file-chip.test.tsx
- **Verification:** 2 new tests confirm extraction errors don't auto-fade and upload errors still do
- **Committed in:** e20c7b2

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for UI spec compliance. No scope creep.

## Issues Encountered
None - all planned tasks executed cleanly. The auto-fade bug was caught during code review verification.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete extraction pipeline: upload -> extract -> poll status -> display result in chip
- Ready for Phase 9 (File Management & Preview) which will add retry from management UI
- getUploadedFileIds returns both 'uploaded' and 'ready' files for chat integration

## Self-Check: PASSED

All files exist. All commits verified.

---
*Phase: 08-content-extraction*
*Completed: 2026-03-26*
