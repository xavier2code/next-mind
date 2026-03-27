---
phase: 10-chat-skills-integration
plan: 03
subsystem: ui, api
tags: [react, nextjs, file-upload, inline-editor, attachment-bar, chat-integration]

# Dependency graph
requires:
  - phase: 10-01
    provides: "injectFileContent function, AttachmentFile type, InjectionResult type"
provides:
  - "FileChip with inline Markdown editor (D-05, CHAT-05)"
  - "Attachment bar below user messages in ChatMessage (D-08, D-09)"
  - "POST /api/conversations/files/link API route (D-04)"
  - "useFileUpload with editedContent tracking"
  - "ChatInput wired with getEditedContentsMap for injection pipeline"
affects: [chat-ui, file-management, conversation-persistence]

# Tech tracking
tech-stack:
  added: []
  patterns: [edited-contents-via-callback-props, fire-and-forget-file-linking, attachment-bar-per-user-message]

key-files:
  created:
    - src/app/api/conversations/files/link/route.ts
    - tests/components/file-chip-edit.test.tsx
  modified:
    - src/hooks/use-file-upload.ts
    - src/components/files/file-chip.tsx
    - src/components/chat/chat-input.tsx
    - src/components/chat/chat-message.tsx
    - src/components/chat/chat-list.tsx
    - src/app/(chat)/page.tsx
    - src/app/(chat)/[conversationId]/page.tsx
    - tests/hooks/use-file-upload.test.ts

key-decisions:
  - "Extended onSend signature to include editedContents Map from ChatInput to page handleSend"
  - "Used plain button elements styled with Tailwind for Save/Cancel in FileChip editor (no shadcn Button import in leaf component)"
  - "ChatInput manages editingFileId state for single-file edit enforcement"

patterns-established:
  - "Edited contents flow: FileChip editor -> setEditedContent -> getEditedContentsMap -> onSend -> injectFileContent"
  - "Fire-and-forget file linking after message send with client-generated messageId"

requirements-completed: [CHAT-01, CHAT-03, CHAT-05, DB-02]

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 10 Plan 3: Chat Integration Wiring Summary

**File content injection pipeline wired into chat UI with inline Markdown editor on FileChip, attachment bar on user messages, and fire-and-forget file-conversation linking via new POST endpoint**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-27T02:14:40Z
- **Completed:** 2026-03-27T02:22:50Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Extended useFileUpload hook with editedContent and extractedMarkdown tracking, plus setEditedContent/getEditedContent/getExtractedMarkdown/getEditedContentsMap functions
- Added inline Markdown editor to FileChip with Pencil button, textarea, save/cancel controls, and blue indicator for edited files
- Created POST /api/conversations/files/link endpoint wrapping linkFileToConversation with auth and audit logging
- Added attachment bar to ChatMessage showing file type icons, filenames, and sizes for user messages only
- Wired injectFileContent into both chat pages with editedContents map flowing through ChatInput's onSend callback
- Linked files to conversations after sending with client-generated messageId (fire-and-forget pattern)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend useFileUpload hook with editedContent tracking and tests** - `9a60d22` (feat)
2. **Task 2: Extend FileChip with inline Markdown editor and wire into ChatInput** - `2353c8c` (feat)
3. **Task 3: Create file-link API route, add attachment bar to ChatMessage, and wire injection + file linking into chat pages** - `dead086` (feat)

## Files Created/Modified
- `src/hooks/use-file-upload.ts` - Added editedContent/extractedMarkdown fields, setEditedContent/getEditedContent/getExtractedMarkdown/getEditedContentsMap functions, status sync fetch for extractedMarkdown
- `src/components/files/file-chip.tsx` - Added Pencil edit button, inline textarea editor, save/cancel controls, extended FileChipProps with edit-related props
- `src/components/chat/chat-input.tsx` - Added editingFileId state, wired setEditedContent/getEditedContentsMap, extended onSend signature with editedContents Map
- `src/components/chat/chat-message.tsx` - Added attachment bar with Link, getTypeIcon, formatSize for user messages
- `src/components/chat/chat-list.tsx` - Updated ChatListProps message type with optional attachments
- `src/app/(chat)/page.tsx` - Wired injectFileContent and file linking into handleSend, updated messages state type
- `src/app/(chat)/[conversationId]/page.tsx` - Same injection and linking wiring for existing conversations
- `src/app/api/conversations/files/link/route.ts` - New POST endpoint wrapping linkFileToConversation with auth
- `tests/hooks/use-file-upload.test.ts` - Added 9 tests for editedContent tracking
- `tests/components/file-chip-edit.test.tsx` - New test file with 13 tests for FileChip editor

## Decisions Made
- Extended `onSend` signature in ChatInput from `(message, fileIds?)` to `(message, fileIds?, editedContents?)` to pass the edited contents map from the hook (inside ChatInput) to the page's handleSend function. This avoids duplicating useFileUpload state in the page component.
- Used plain `<button>` elements with Tailwind classes for Save/Cancel in the FileChip inline editor instead of importing shadcn's Button component. FileChip is a leaf component and should avoid unnecessary dependencies.
- ChatInput manages the `editingFileId` state to enforce the "only one file in edit mode at a time" constraint (D-05).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended ChatInput onSend signature to pass editedContents map**
- **Found during:** Task 3 (wire injection into chat pages)
- **Issue:** Plan specified `getEditedContentsMap()` should be called in the page's handleSend, but `useFileUpload` is inside ChatInput, not accessible from the page. Without passing the map, user-edited file content would never flow to `injectFileContent`.
- **Fix:** Extended ChatInputProps.onSend to accept a third optional `editedContents?: Map<string, string>` parameter. ChatInput calls `getEditedContentsMap()` in handleSubmit and passes it through. Both page handleSend functions accept and forward it to `injectFileContent`.
- **Files modified:** src/components/chat/chat-input.tsx, src/app/(chat)/page.tsx, src/app/(chat)/[conversationId]/page.tsx
- **Committed in:** `dead086` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for CHAT-05 correctness -- edited content must flow from FileChip to injectFileContent. No scope creep.

## Issues Encountered
- Worktree was based on an old commit missing phases 7-10 files. Resolved by working directly from the main project directory which had the latest merged code.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- File content injection pipeline fully wired from UI to chat API
- FileChip editor, attachment bar, and file-conversation linking all functional
- Plan 10-04 can build on this foundation for any remaining chat integration features

---
*Phase: 10-chat-skills-integration*
*Completed: 2026-03-27*

## Self-Check: PASSED

All 10 files verified present. All 3 commits verified in git log. SUMMARY.md created successfully.
