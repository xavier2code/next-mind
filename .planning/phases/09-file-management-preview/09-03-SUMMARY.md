---
phase: "09"
plan: "03"
subsystem: "file-management"
tags: [ui, preview, delete-dialog, empty-state, page-assembly, sidebar]

dependency_graph:
  requires: [09-01, 09-02]
  provides: []
  affects: []
tech_stack:
  added: []
  patterns:
    - "Type-specific preview rendering with React.memo for performance"
    - "Split layout pattern (60% table / 40% preview)"
    - "Route group layout duplication from (chat) pattern"
    - "Counter-based refetch for imperative re-triggering"
key_files:
  created:
    - "src/components/files/file-preview-panel.tsx"
    - "src/components/files/file-preview-markdown.tsx"
    - "src/components/files/file-preview-code.tsx"
    - "src/components/files/file-preview-data.tsx"
    - "src/components/files/file-delete-dialog.tsx"
    - "src/components/files/file-empty-state.tsx"
    - "src/app/(files)/layout.tsx"
    - "src/app/(files)/files/page.tsx"
    - "tests/components/files/preview-panel.test.tsx"
    - "tests/components/files/markdown-preview.test.tsx"
    - "tests/components/files/code-preview.test.tsx"
    - "tests/components/files/data-preview.test.tsx"
    - "tests/app/files/page.test.tsx"
  modified:
    - "src/components/sidebar/sidebar.tsx"
    - "tests/hooks/use-file-list.test.ts"
    - "tests/hooks/use-file-detail.test.ts"
key_decisions:
  - id: "D-preview-memo"
    decision: "All preview sub-components wrapped with React.memo()"
    rationale: "Prevent re-rendering heavy syntax highlighters and markdown renderers when parent state changes (RESEARCH.md Pitfall 3)"
  - id: "D-key-reset"
    decision: "Use key={file.id} on preview content to force clean mount on file switch"
    rationale: "Ensures syntax highlighter and markdown renderer fully reset between different files"
  - id: "D-data-limit"
    decision: "DataPreview limits to 100 rows with footer showing total count"
    rationale: "Prevents browser freeze on large data files while informing user of truncation"
metrics:
  duration: "5min"
  completed_date: "2026-03-27"
  tasks_completed: 3
  files_created: 13
  files_modified: 3
  tests_added: 45
---

# Phase 09 Plan 03: Preview Panel, Delete Dialog & Files Page Assembly Summary

Preview panel with 3 type-specific renderers (Markdown/code/data), delete confirmation dialog, empty state, files page with 60/40 split layout, sidebar Files entry, and route group layout. Complete file management UI assembled and verified.

## What Was Built

### Task 1: Preview panel, 3 type-specific renderers, delete dialog, and empty state

- **MarkdownPreview** (`file-preview-markdown.tsx`): ReactMarkdown + remarkGfm + syntax highlighting via react-syntax-highlighter. Reuses same configuration as chat-message.tsx. Wrapped in ScrollArea.

- **CodePreview** (`file-preview-code.tsx`): react-syntax-highlighter with client-side language detection from filename extension (LANGUAGE_MAP with 20+ extensions). Shows filename tab above code block. Wrapped in ScrollArea.

- **DataPreview** (`file-preview-data.tsx`): Parses JSON content into HTML table. First row keys become column headers, zebra striping, 100-row limit with footer. Handles parse errors gracefully.

- **FilePreviewPanel** (`file-preview-panel.tsx`): Orchestrates type-specific rendering based on `file.fileType`. Shows initial state (Eye icon + "选择一个文件查看预览") when no file selected. Shows error state with retry button for failed files. Status bar with semantic icons (Loader2/CheckCircle2/AlertCircle).

- **FileDeleteDialog** (`file-delete-dialog.tsx`): Confirmation dialog with destructive styling. Shows filename, cancel/delete buttons. Loader2 spinner during deletion. Auto-focuses cancel button.

- **FileEmptyState** (`file-empty-state.tsx`): Centered layout with FolderOpen icon, "还没有上传文件" heading, and "上传第一个文件" CTA button navigating to chat page.

### Task 2: Files page assembly, route group layout, sidebar entry

- **(files)/layout.tsx**: Route group layout duplicating chat layout pattern (Sidebar + main content area).

- **files/page.tsx**: Main file management page with:
  - 60/40 split layout (FileTable left, FilePreviewPanel right)
  - Empty state fallback when total files is 0
  - File selection triggers preview panel update
  - Delete flow: dialog -> confirm -> DELETE API -> refresh list -> clear selection
  - Retry extraction flow: button -> POST API -> refresh detail + list
  - Filter change resets page and clears selection

- **Sidebar modification**: Added Files button with FolderOpen icon below "New chat". Active state styling (bg-accent) when pathname starts with /files. Also added active state to New chat button for consistency.

### Task 3: Human verification (checkpoint)

- User approved after visual review of the file management page.

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed parallel test pollution in hook tests**
- **Found during:** Pre-commit hook (full test suite)
- **Issue:** Both `use-file-detail.test.ts` and `use-file-list.test.ts` used `vi.stubGlobal('fetch', mockFetch)` at module level, causing cross-test pollution when running in parallel (one file's mock overwrites the other's)
- **Fix:** Moved `vi.stubGlobal('fetch', mockFetch)` into `beforeEach()` so each test file re-stubs before its tests run
- **Files modified:** tests/hooks/use-file-detail.test.ts, tests/hooks/use-file-list.test.ts
- **Committed in:** 8d366a6

## Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/components/files/preview-panel.test.tsx | 8 | All pass |
| tests/components/files/markdown-preview.test.tsx | 4 | All pass |
| tests/components/files/code-preview.test.tsx | 5 | All pass |
| tests/components/files/data-preview.test.tsx | 5 | All pass |
| tests/components/files/file-delete-dialog.test.tsx | 4 | All pass |
| tests/components/files/file-empty-state.test.tsx | 3 | All pass |
| tests/app/files/page.test.tsx | 8 | All pass |
| tests/hooks/use-file-list.test.ts | 7 | All pass (after fix) |
| tests/hooks/use-file-detail.test.ts | 9 | All pass (after fix) |
| **Total** | **53** | **All pass** |

## Known Stubs

None. All components are fully wired with real logic and props.

## Self-Check: PASSED

- [x] `src/components/files/file-preview-panel.tsx` exists and exports FilePreviewPanel
- [x] `src/components/files/file-preview-markdown.tsx` exists and exports MarkdownPreview
- [x] `src/components/files/file-preview-code.tsx` exists and exports CodePreview
- [x] `src/components/files/file-preview-data.tsx` exists and exports DataPreview
- [x] `src/components/files/file-delete-dialog.tsx` exists and exports FileDeleteDialog
- [x] `src/components/files/file-empty-state.tsx` exists and exports FileEmptyState
- [x] `src/app/(files)/layout.tsx` exists and exports FilesLayout
- [x] `src/app/(files)/files/page.tsx` exists and exports FilesPage
- [x] Sidebar has Files button with FolderOpen icon
- [x] Commit a482e8c: feat(09-03): preview panel with type-specific renderers, delete dialog, and empty state
- [x] Commit 611d499: feat(09-03): files page assembly, route group layout, and sidebar entry
- [x] Commit 8d366a6: fix(09-03): move fetch stubGlobal to beforeEach to prevent parallel test pollution
- [x] All 53 plan-specific tests pass

---
*Phase: 09-file-management-preview*
*Completed: 2026-03-27*
