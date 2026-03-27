---
phase: "09"
plan: "02"
subsystem: "file-management"
tags: [ui, table, hooks, react-table, pagination, filtering]
dependency_graph:
  requires: [09-01]
  provides: [09-03]
  affects: []
tech_stack:
  added:
    - "@tanstack/react-table@8.21.3"
  patterns:
    - "Headless table with @tanstack/react-table for sort/filter/pagination state management"
    - "Server-side pagination via manualPagination mode (no getPaginationRowModel)"
    - "Counter-based refetch pattern for imperative re-fetch in hooks"
key_files:
  created:
    - "src/components/ui/table.tsx"
    - "src/components/files/file-table-columns.tsx"
    - "src/components/files/file-table.tsx"
    - "src/hooks/use-file-list.ts"
    - "src/hooks/use-file-detail.ts"
    - "tests/components/files/file-table.test.tsx"
    - "tests/components/files/file-filter.test.tsx"
    - "tests/hooks/use-file-list.test.ts"
    - "tests/hooks/use-file-detail.test.ts"
  modified:
    - "src/components/files/file-chip.tsx"
    - "package.json"
    - "package-lock.json"
key_decisions:
  - id: "D-table-primitives"
    decision: "Hand-built HTML table wrappers instead of shadcn Table component (Radix-based, incompatible with base-nova)"
    rationale: "shadcn Table uses @radix-ui primitives; this project uses @base-ui/react. Hand-built wrappers with Tailwind are simpler and fully compatible."
  - id: "D-sort-default"
    decision: "Default sort toggles to desc first for unsorted columns (tanstack default behavior)"
    rationale: "@tanstack/react-table v8 default multi-sort toggle goes asc->desc for already-sorted columns, but desc for first click on unsorted columns. Matches most user expectations for date-default-desc tables."
  - id: "D-column-def-factory"
    decision: "Column definitions use factory function fileColumns(callbacks) instead of static array"
    rationale: "Column cell renderers need access to onSelectFile and onDeleteFile callbacks. Factory pattern avoids prop drilling through context or global state."
decisions: []
metrics:
  duration: "4min"
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_created: 9
  files_modified: 3
  tests_added: 44
---

# Phase 09 Plan 02: File Table UI & Data Hooks Summary

File table UI with @tanstack/react-table: sortable columns, type filter bar, server-side pagination, and data hooks for fetching file list and file detail. Built the core file browsing interface (left panel of the split layout per D-02).

## What Was Built

### Task 1: Base Table primitives, column definitions, and FileTable component

- **Table UI primitives** (`src/components/ui/table.tsx`): Hand-built HTML table wrappers styled with Tailwind -- Table, TableHeader, TableBody, TableRow, TableHead, TableCell. Compatible with base-nova design system (shadcn Table is Radix-based and incompatible).

- **Column definitions** (`src/components/files/file-table-columns.tsx`): 6 column definitions for @tanstack/react-table -- filename (type icon + truncated name), type badge (document/code/data in Chinese), size (formatted), createdAt (relative time via timeAgo utility), status (icon + text with semantic colors), actions (Eye + Trash2 ghost buttons). Includes `timeAgo()` helper for Chinese relative time display.

- **FileTable component** (`src/components/files/file-table.tsx`): Full-featured file table with:
  - Filter bar (4 toggle buttons: all/document/code/data, variant secondary for active)
  - Sortable column headers with ArrowUpDown/ArrowUp/ArrowDown icons
  - Server-side pagination (manualPagination mode, controlled via props)
  - Selected row highlighting (bg-accent + border-l-2 border-primary)
  - Keyboard accessibility (tabIndex, Enter/Space key handlers)
  - ARIA attributes (role="grid", aria-sort, aria-selected, aria-labels)
  - Loading and empty states

- **Exported utilities**: `getTypeIcon` and `formatSize` from `file-chip.tsx` for reuse across components.

### Task 2: useFileList and useFileDetail data hooks

- **useFileList** (`src/hooks/use-file-list.ts`): Server-side paginated hook fetching from `GET /api/files` with query params (page, pageSize, sortBy, sortOrder, fileType). Returns files array, pagination state, loading/error states, and refetch function. Default: page 1, pageSize 20, sortBy createdAt desc, fileType all.

- **useFileDetail** (`src/hooks/use-file-detail.ts`): Fetches full file data from `GET /api/files/[id]` including extractedContent and extractedMarkdown for preview. Only fetches when fileId is non-null. Resets state on fileId change. Returns file, loading/error states, and refetch function.

- Both hooks use Chinese error messages per UI-SPEC: "无法加载文件列表。请刷新页面重试。" and "无法加载文件内容。请重试。"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing file-chip test expected wrong formatSize output**
- **Found during:** Full suite verification
- **Issue:** `tests/components/files/file-chip.test.tsx` expects `'1KB'` for 1024 bytes but `formatSize` has always returned `'1.0KB'`. Verified this was pre-existing by stashing changes and running the test independently.
- **Fix:** Not fixed (pre-existing, out of scope per deviation rules). Logged for awareness.
- **Files:** tests/components/files/file-chip.test.tsx (not modified)

### No other deviations

The plan executed exactly as written. No architectural changes needed, no blocking issues, no auth gates encountered.

## Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/components/files/file-table.test.tsx | 25 | All pass |
| tests/components/files/file-filter.test.tsx | 3 | All pass |
| tests/hooks/use-file-list.test.ts | 7 | All pass |
| tests/hooks/use-file-detail.test.ts | 9 | All pass |
| **Total** | **44** | **All pass** |

## Known Stubs

None. All components are fully wired with real logic and props.

## Self-Check: PASSED

- [x] `src/components/ui/table.tsx` exists and exports Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- [x] `src/components/files/file-table-columns.tsx` exists and exports fileColumns, FileRow, timeAgo
- [x] `src/components/files/file-table.tsx` exists and exports FileTable
- [x] `src/hooks/use-file-list.ts` exists and exports useFileList, FileListItem, FileListState
- [x] `src/hooks/use-file-detail.ts` exists and exports useFileDetail, FileDetail, FileDetailState
- [x] `src/components/files/file-chip.tsx` exports getTypeIcon and formatSize
- [x] Commit ff749aa: feat(09-02): add base Table primitives, column definitions, and FileTable component
- [x] Commit 3c07ce5: feat(09-02): add useFileList and useFileDetail data hooks
- [x] All 44 plan-specific tests pass
