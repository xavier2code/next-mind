---
phase: 01-core-foundation
plan: 04
subsystem: chat-ui
tags: [ui, chat, streaming, sidebar, model-selector, markdown]
requires: [01-01, 01-02, 01-03]
provides: [chat-interface, conversation-history, model-switching]
affects: []
tech-stack:
  added: [react-markdown, remark-gfm, react-syntax-highlighter]
  patterns: [useChat hook, localStorage persistence, PostgreSQL full-text search]
key-files:
  created:
    - src/app/(chat)/page.tsx
    - src/app/(chat)/layout.tsx
    - src/app/(chat)/[conversationId]/page.tsx
    - src/components/chat/chat-input.tsx
    - src/components/chat/chat-message.tsx
    - src/components/chat/chat-list.tsx
    - src/components/chat/model-selector.tsx
    - src/components/sidebar/sidebar.tsx
    - src/components/sidebar/conversation-list.tsx
    - src/components/sidebar/search-input.tsx
    - src/app/api/conversations/route.ts
    - src/app/api/conversations/[id]/route.ts
    - src/hooks/use-model-preference.ts
    - tests/chat.test.tsx
    - tests/search.test.ts
  modified: []
decisions:
  - Model preference persisted in localStorage for cross-session consistency
  - PostgreSQL full-text search with tsvector for conversation search
  - Collapsible sidebar (256px width) with ChatGPT-style pattern
  - Inline error display with retry option instead of toast notifications
  - Welcome screen with suggested prompts for empty state
metrics:
  duration: ~45 minutes
  tasks: 5
  files: 15
  commits: 2
  completed: 2026-03-24
---

# Phase 01 Plan 04: ChatGPT-Style Conversation UI Summary

ChatGPT-style conversation interface with collapsible sidebar, streaming responses, markdown rendering, model selection, conversation history, and full-text search functionality.

## Completed Tasks

| Task | Description | Status |
|------|-------------|--------|
| 1 | Create conversation API endpoints | DONE |
| 2 | Create chat layout and sidebar components | DONE |
| 3 | Create chat components (input, message, list) | DONE |
| 4 | Create main chat page with useChat hook | DONE |
| 5 | Human verification checkpoint | APPROVED |

## Implementation Details

### Task 1: Conversation API Endpoints
- **GET /api/conversations** - Lists conversations with optional full-text search using PostgreSQL tsvector
- **POST /api/conversations** - Creates new conversation with title and model ID
- **GET /api/conversations/[id]** - Returns conversation with all messages
- **DELETE /api/conversations/[id]** - Deletes conversation with ownership verification
- **PATCH /api/conversations/[id]** - Updates conversation title or model

### Task 2: Chat Layout and Sidebar
- Collapsible sidebar (256px width) with smooth transitions
- Sidebar header with app name and toggle button
- "New chat" button to start fresh conversations
- Search input with clear button for filtering conversations
- Conversation list with delete functionality and confirmation dialog

### Task 3: Chat Components
- **ModelSelector** - Dropdown with Qwen, GLM, MiniMax options, localStorage persistence
- **ChatMessage** - User/assistant messages with markdown rendering and code highlighting
- **ChatList** - Auto-scrolling message list with loading spinner
- **ChatInput** - Auto-resizing textarea with Enter to send, model selector integration

### Task 4: Main Chat Pages
- **Welcome screen** - Displayed when no active conversation with suggested prompts
- **Error handling** - Inline error display with retry button
- **Streaming** - Character-by-character response display via useChat hook
- **Conversation loading** - Existing conversations loaded with messages and model preference

## Key Decisions

1. **localStorage for model preference** - Simple, client-side persistence without server roundtrip
2. **PostgreSQL full-text search** - Native tsvector search with ranking for relevance
3. **Inline error display** - Errors shown in chat area with retry option for better UX
4. **Welcome screen prompts** - Three suggested prompts to guide new users

## Files Created

```
src/app/(chat)/
  page.tsx                    # Main chat page with welcome screen
  layout.tsx                  # Chat layout with sidebar
  [conversationId]/page.tsx   # Conversation detail page

src/components/chat/
  chat-input.tsx              # Message input with model selector
  chat-message.tsx            # Message rendering with markdown
  chat-list.tsx               # Message list with auto-scroll
  model-selector.tsx          # Model dropdown with persistence

src/components/sidebar/
  sidebar.tsx                 # Collapsible sidebar container
  conversation-list.tsx       # Conversation list with delete
  search-input.tsx            # Search input with clear button

src/app/api/conversations/
  route.ts                    # GET (list/search), POST (create)
  [id]/route.ts               # GET, DELETE, PATCH operations

src/hooks/
  use-model-preference.ts     # Model preference state hook

tests/
  chat.test.tsx               # Chat component tests
  search.test.ts              # Search query tests
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification

User verified:
- Sidebar appears with "New chat" button
- Messages send and receive with streaming
- Model switching works and persists across refresh
- Conversation history appears in sidebar
- Search filters conversations correctly
- Delete confirmation dialog works
- Error display with retry functions

## Next Steps

Proceed to **01-05: Security** for:
- Content filtering
- Audit logging
- State management
- Rate limiting
