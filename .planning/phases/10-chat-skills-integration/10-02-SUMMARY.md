---
phase: "10"
plan: "02"
subsystem: "skills"
tags: ["skills", "file-processing", "database", "tdd"]
dependency_graph:
  requires: ["07-storage-upload", "08-content-extraction"]
  provides: ["file-extract", "file-convert", "file-classify", "updated-file-read", "updated-file-list"]
  affects: ["agent-workflows", "skills-registry"]
tech_stack:
  added: []
  patterns: ["@skill decorator", "database-backed skills", "ownership verification"]
key_files:
  created:
    - "tests/skills/file-processing.test.ts"
    - "src/lib/extraction/classifier.ts"
  modified:
    - "src/skills/file-processing.ts"
    - "src/lib/db/schema.ts"
    - "src/lib/db/queries.ts"
    - "tests/lib/skills/predefined.test.ts"
key_decisions:
  - "file-extract requires file.status === 'ready' before returning content"
  - "file-convert uses extractedMarkdown for markdown format, extractedContent for text/json"
  - "All 5 skills enforce ownership check: file.userId === context.userId"
  - "Updated file-read prefers extractedMarkdown over extractedContent"
  - "Updated file-list maps files to lightweight metadata objects (no content)"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-27"
  tasks_completed: 1
  files_changed: 6
---

# Phase 10 Plan 02: File Processing Skills Summary

5 database-backed file processing skills (3 new + 2 updated) with ownership verification, replacing filesystem-based implementations with database queries.

## Changes Made

### New Skills (SKIL-01, SKIL-02, SKIL-03)

1. **file-extract** (`extractFileContent`): Extracts content from uploaded files. Requires file status `ready`. Returns `extractedMarkdown` and `extractedContent`. Timeout: 35s.

2. **file-convert** (`convertFileFormat`): Converts file content to requested format (`markdown`, `text`, `json`). Maps to `extractedMarkdown` or `extractedContent` based on format. Depends on `file-extract`. Timeout: 35s.

3. **file-classify** (`classifyFile`): Classifies files using content analysis via `classifyByContent()`. Returns `correctedType` and `classification`. Timeout: 15s.

### Updated Skills (SKIL-04)

4. **file-read** (updated): Changed input from `{ path }` to `{ fileId }`. Now uses `getFileById()` with ownership check. Returns `{ fileId, filename, content }` preferring `extractedMarkdown` over `extractedContent`.

5. **file-list** (updated): Changed input from `{ path, pattern? }` to `{ fileType? }`. Now uses `getFilesByUser()` with optional `fileType` filter. Returns array of metadata objects.

### Infrastructure

- Added `files` table to `schema.ts` with `FileTypeEnum`, `FileStatusEnum`, and `File` type export
- Added `getFileById()` and `getFilesByUser()` to `queries.ts`
- Added `classifier.ts` stub module for content-based file classification
- Added `integer` import to `schema.ts` for file size column
- Updated `predefined.test.ts` to mock DB queries for file skills

### Removals

- Removed all `fs` imports (`import * as fs from 'fs'`, `readFile`, `access`, `stat`, `readdir`)
- Removed filesystem-based `readFile` and `listFiles` implementations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing files table in schema.ts**
- **Found during:** Task 1 (RED phase)
- **Issue:** `files` table and `File` type did not exist in the worktree schema (phases 7-9 not merged)
- **Fix:** Added `files` pgTable definition with all columns (id, userId, filename, mimeType, size, fileType, storagePath, status, extractedContent, extractedMarkdown, classification, errorMessage, createdAt, updatedAt), `FileTypeEnum`, `FileStatusEnum`, and `File`/`NewFile` type exports
- **Files modified:** `src/lib/db/schema.ts`
- **Commit:** `9a14c92`

**2. [Rule 3 - Blocking] Missing getFileById and getFilesByUser in queries.ts**
- **Found during:** Task 1 (RED phase)
- **Issue:** Query functions for file operations not present in the worktree
- **Fix:** Added `getFileById()` and `getFilesByUser()` stub implementations to `queries.ts`
- **Files modified:** `src/lib/db/queries.ts`
- **Commit:** `9a14c92`

**3. [Rule 3 - Blocking] Missing extraction/classifier.ts module**
- **Found during:** Task 1 (RED phase)
- **Issue:** `@/lib/extraction/classifier` module did not exist, causing import resolution failure in tests
- **Fix:** Created `classifier.ts` with `classifyByContent()` function matching the Phase 8 interface (`ClassificationResult` type, JSON content analysis logic)
- **Files created:** `src/lib/extraction/classifier.ts`
- **Commit:** `9a14c92`

**4. [Rule 1 - Bug] Missing `integer` import in schema.ts**
- **Found during:** Task 1 (GREEN phase, running predefined.test.ts)
- **Issue:** `files` table used `integer('size')` but `integer` was not imported from `drizzle-orm/pg-core`
- **Fix:** Added `integer` to the drizzle-orm/pg-core import statement
- **Files modified:** `src/lib/db/schema.ts`
- **Commit:** `fd1f1d8`

**5. [Rule 1 - Bug] predefined.test.ts failed with old API**
- **Found during:** Task 1 (GREEN phase, running predefined.test.ts)
- **Issue:** `predefined.test.ts` used old fs-based API (`{ path: '/etc/hosts' }`) and did not mock DB queries, causing `Cannot read properties of undefined (reading 'select')` errors
- **Fix:** Added `vi.mock('@/lib/db/queries')` and updated test cases to use `{ fileId }` input with mocked `getFileById`/`getFilesByUser` responses
- **Files modified:** `tests/lib/skills/predefined.test.ts`
- **Commit:** `197a6d3`

## Verification Results

All verification criteria from the plan passed:

- `npx vitest run tests/skills/file-processing.test.ts --reporter=verbose` -- 30/30 tests passed
- `grep -c "@skill" src/skills/file-processing.ts` -- returns 5
- `grep "import.*fs" src/skills/file-processing.ts` -- no results
- `grep "import.*getFileById" src/skills/file-processing.ts` -- found
- `grep "import.*classifyByContent" src/skills/file-processing.ts` -- found
- `grep "context.userId" src/skills/file-processing.ts` -- 6 occurrences (ownership checks)
- `npx vitest run tests/lib/skills/predefined.test.ts --reporter=verbose` -- 16/16 tests passed

## Self-Check: PASSED

- All created files exist
- All commits verified in git log
- No untracked files remaining
- All tests pass (46/46 across both test files)
