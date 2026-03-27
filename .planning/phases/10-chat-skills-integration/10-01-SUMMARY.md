---
phase: 10
plan: 01
subsystem: chat
tags: [file-injection, chat, content-formatting, truncation]
requirements: [CHAT-01, CHAT-02, CHAT-03, CHAT-04]
dependency_graph:
  requires: []
  provides: [10-02, 10-03]
  affects: []
tech_stack:
  added: []
  patterns: [pure-utility-module, client-side-injection, tdd]
key_files:
  created:
    - src/lib/chat/types.ts
    - src/lib/chat/inject-file-content.ts
    - tests/chat/inject-file-content.test.ts
  modified: []
decisions:
  - id: format-size-duplication
    summary: "Duplicated formatSize from file-chip.tsx to avoid React component import in utility module"
    rationale: "file-chip.tsx is a 'use client' component; importing it from a pure utility would break server-side compatibility and add unnecessary React dependency"
  - id: max-total-chars
    summary: "Set MAX_TOTAL_CHARS to 10000 characters as the truncation threshold"
    rationale: "Research recommended 8000-12000 chars; 10000 is conservative for all supported models (Qwen, GLM, MiniMax) covering CJK and Latin text"
metrics:
  duration: "4 min"
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
  tests_added: 17
---

# Phase 10 Plan 01: File Content Injection Module Summary

Client-side file content injection utility for enriching chat messages with extracted file content before sending to the streaming chat API. Implements CHAT-01 through CHAT-04 requirements with full test coverage.

## What Was Built

**Pure utility module** (`src/lib/chat/inject-file-content.ts`) that:
- Fetches file metadata via `GET /api/files/:id` in parallel using `Promise.all`
- Formats each file into D-03 delimited blocks: `\n\n---\n📎 filename (type, size)\ncontent\n---\n`
- Applies character-based truncation at 10000 chars with `[Content truncated...]` marker
- Supports user-edited content via optional `Map<string, string>` override
- Returns enriched content, attachment metadata, and warning messages

**Shared types** (`src/lib/chat/types.ts`) for `AttachmentFile`, `InjectionResult`, and `FileApiResponse`.

**17 automated tests** covering all requirements and edge cases (no files, single file, multiple files, partial ready, all not ready, truncation, mid-file truncation, edited content).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed truncation test data to match realistic content sizes**
- **Found during:** Task 1 GREEN phase
- **Issue:** Test used 9500-char first file content which fit entirely within the 10000-char budget (including block wrapper), causing the second file's header to appear before truncation. Test asserted `not.toContain('second.txt')` which was incorrect for this content size.
- **Fix:** Changed first file content to 15000 chars to ensure mid-first-file truncation, correctly testing the "skip remaining files" behavior.
- **Files modified:** `tests/chat/inject-file-content.test.ts`
- **Commit:** `88764f4` (included in GREEN phase commit)

## Known Stubs

None -- all implemented functions are fully wired with real logic and tested.

## Key Decisions

1. **formatSize duplication** -- Duplicated from `file-chip.tsx` to keep the utility module free of React/component imports. The function is small (3 lines) and stable.

2. **MAX_TOTAL_CHARS = 10000** -- Character-based threshold (not token-based) avoids tokenizer dependency. Conservative for all supported LLM providers including CJK text.

3. **Partial file inclusion on truncation** -- When truncation occurs at a file boundary, the current file's header + partial content is included (not zero content). This maximizes useful context for the LLM.

## Verification

- All 17 tests pass (`npx vitest run tests/chat/inject-file-content.test.ts`)
- Exports match plan spec: `injectFileContent`, `fetchFileContents`, `formatFileBlock`, `formatSize`, `MAX_TOTAL_CHARS`
- No React/component imports in the utility module

## Self-Check: PASSED

- `src/lib/chat/types.ts` -- FOUND (exports AttachmentFile, InjectionResult, FileApiResponse)
- `src/lib/chat/inject-file-content.ts` -- FOUND (exports all required functions)
- `tests/chat/inject-file-content.test.ts` -- FOUND (17 tests, all passing)
- Commit `ff13e70` -- FOUND (Task 0: types)
- Commit `b2c1eea` -- FOUND (Task 1 RED: failing tests)
- Commit `88764f4` -- FOUND (Task 1 GREEN: implementation + passing tests)
