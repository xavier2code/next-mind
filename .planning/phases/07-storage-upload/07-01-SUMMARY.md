---
phase: 07-storage-upload
plan: 01
subsystem: database, storage, infra
tags: [unstorage, drizzle-orm, postgres, busboy, nanoid, file-type]

# Dependency graph
requires:
  - phase: 06-visibility-polish
    provides: complete A2A agent system, existing DB schema patterns
provides:
  - files table with 13 columns (metadata + content extraction fields)
  - conversationFiles junction table (file-conversation-message linking)
  - Abstract storage layer via unstorage (local fs + S3 driver selection)
  - File CRUD query functions (create, get, list, delete, link)
  - Client-side file validation (extension + size)
  - File UI component stubs (FileChip, FileUploadButton, useFileUpload hook)
  - next.config.ts bodySizeLimit: 10mb
affects: [07-02-upload-api, 07-03-chat-integration]

# Tech tracking
tech-stack:
  added: [unstorage, busboy, nanoid, mime-types, file-type]
  patterns: [env-driven storage driver selection, UUID-based storage paths, file type classification enum]

key-files:
  created:
    - src/lib/storage/types.ts
    - src/lib/storage/provider.ts
    - src/lib/validation/file-validation.ts
    - src/hooks/use-file-upload.ts
    - src/components/files/file-chip.tsx
    - src/components/files/file-upload-button.tsx
    - tests/lib/db/schema-files.test.ts
    - tests/lib/db/queries-files.test.ts
    - tests/lib/storage/provider.test.ts
    - tests/lib/validation/file-validation.test.ts
    - tests/hooks/use-file-upload.test.ts
    - tests/components/files/file-chip.test.tsx
    - tests/components/files/file-upload-button.test.tsx
    - tests/app/api/files/upload.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/queries.ts
    - src/types/index.ts
    - next.config.ts
    - .env.example
    - package.json

key-decisions:
  - "Storage keys use {userId}/{fileId}/{filename} format (UUID-based, never user-provided)"
  - "S3 driver loaded dynamically via require() to avoid bundling when not needed"
  - "file-type v5.x (CommonJS) installed as specified in RESEARCH.md stack"
  - "Created stub modules for Plan 02/03 scaffolds to make tests pass (Rule 3)"

patterns-established:
  - "Storage abstraction via unstorage createStorage() with env-driven driver selection"
  - "File type classification: document (PDF/DOCX), code (TS/JS/Python/etc), data (CSV/XLSX)"
  - "Storage paths always include userId prefix for tenant isolation"

requirements-completed: [DB-01, DB-02, UPLD-07]

# Metrics
duration: 5min
completed: 2026-03-26
---

# Phase 7 Plan 01: Foundation (Schema, Storage, Queries) Summary

**File storage schema with Drizzle ORM (files + conversationFiles tables), unstorage abstraction layer with local/S3 driver selection, and file CRUD queries**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T13:32:40Z
- **Completed:** 2026-03-26T13:37:35Z
- **Tasks:** 4
- **Files modified:** 19

## Accomplishments
- `files` table (13 columns) and `conversationFiles` junction table (5 columns) with indexes and foreign keys
- Abstract storage layer using unstorage with env-driven driver selection (local filesystem / S3)
- File CRUD query functions following existing codebase patterns (createFile, getFile, getFilesByUser, deleteFile, linkFileToConversation, getFilesByConversation)
- Client-side file validation with extension whitelist and 100MB size limit
- next.config.ts bodySizeLimit: 10mb for server actions
- 29 passing tests across 8 test files

## Task Commits

Each task was committed atomically:

1. **Task 0: Install npm dependencies** - `7047e4c` (chore)
2. **Task 1: Database schema for files and conversation files** - `fe2960f` (feat)
3. **Task 2: Abstract storage layer with unstorage** - `f428413` (feat)
4. **Task 3: File CRUD queries and config updates** - `c08b838` (feat)
5. **Task 4: Create test scaffold files for Phase 7** - `2069fcd` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added files + conversationFiles tables, FileTypeEnum, FileStatusEnum, integer import, type exports
- `src/lib/storage/types.ts` - StorageConfig, UploadResponse, StorageError, ACCEPTED_EXTENSIONS, getFileType()
- `src/lib/storage/provider.ts` - getStorage(), storeFile(), getFile(), deleteFile(), fileExists()
- `src/lib/db/queries.ts` - 6 file CRUD query functions
- `src/types/index.ts` - Added file_upload, file_delete to AuditAction
- `next.config.ts` - Added serverActions.bodySizeLimit: '10mb'
- `.env.example` - Added STORAGE_DRIVER, STORAGE_LOCAL_PATH, S3 config vars
- `src/lib/validation/file-validation.ts` - validateFileClient() with extension + size validation
- `src/hooks/use-file-upload.ts` - useFileUpload() hook scaffold (stub for Plan 03)
- `src/components/files/file-chip.tsx` - FileChip component stub (stub for Plan 03)
- `src/components/files/file-upload-button.tsx` - FileUploadButton component stub (stub for Plan 03)

## Decisions Made
- Storage key format `{userId}/{fileId}/{filename}` ensures tenant isolation and avoids path traversal
- S3 driver loaded via `require()` (not static import) to avoid bundling AWS SDK when using local storage
- Created minimal stub modules for validation, hooks, and components to make Plan 03 scaffold tests pass (Rule 3 auto-fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created stub source modules for Plan 02/03 test scaffolds**
- **Found during:** Task 4 (Create test scaffold files)
- **Issue:** Plan specified scaffold tests that import modules not yet created (validateFileClient, useFileUpload, FileChip, FileUploadButton). These imports failed because the source files don't exist until Plans 02/03.
- **Fix:** Created minimal stub implementations for all four modules: `src/lib/validation/file-validation.ts` (fully functional validation), `src/hooks/use-file-upload.ts` (state management stub), `src/components/files/file-chip.tsx` (rendering stub), `src/components/files/file-upload-button.tsx` (file input stub). The validation module is fully functional; the other three are intentional stubs for Plan 03 to expand.
- **Files modified:** 4 new source files created
- **Verification:** All 29 tests pass across 8 test files

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Stub creation was necessary for tests to pass. No scope creep -- stubs are minimal and will be expanded by Plans 02/03.

## Known Stubs

| File | Line | Description | Resolution |
|------|------|-------------|------------|
| `src/hooks/use-file-upload.ts` | 24 | `upload()` function is a no-op placeholder | Plan 03 will implement full upload API integration |
| `src/components/files/file-chip.tsx` | - | Basic rendering stub, no file type icons or status indicators | Plan 03 will add full UI with icons and status |
| `src/components/files/file-upload-button.tsx` | - | Basic file input button, no drag-and-drop or progress | Plan 03 will add drag-and-drop and upload progress |

## Issues Encountered
None - plan executed smoothly.

## User Setup Required
None - no external service configuration required. STORAGE_DRIVER defaults to 'local'.

## Next Phase Readiness
- DB schema ready for `db:push` / migration (Plan 02 will handle)
- Storage layer functional for local filesystem storage
- File validation module ready for use in upload API
- Stub modules provide import targets for Plan 03 component development
- No blockers for Plan 02 (Upload API) or Plan 03 (Chat Integration)

---
*Phase: 07-storage-upload*
*Completed: 2026-03-26*
