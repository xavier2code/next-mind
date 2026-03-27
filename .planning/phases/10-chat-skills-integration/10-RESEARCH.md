# Phase 10: Chat & Skills Integration - Research

**Researched:** 2026-03-27
**Domain:** Client-side file content injection into chat messages + Skills system integration for file processing
**Confidence:** HIGH

## Summary

Phase 10 connects two previously independent subsystems: the file upload/extraction pipeline (Phases 7-9) and the chat conversation UI. The core approach is **client-side content injection** -- the chat page fetches extracted file content via existing API, concatenates it into the user's message text, and sends the enriched message to the unchanged streaming chat API. This avoids any modifications to the streaming `POST /api/chat` route.

On the Skills side, four new skills must be registered in the existing `FileProcessingSkills` class: `file-extract`, `file-convert`, `file-classify`, and updated `file-read`/`file-list`. These wrap existing extraction, classification, and query functions from `src/lib/extraction/` and `src/lib/db/queries.ts`. The current `file-read` and `file-list` skills use raw `fs` calls and must be migrated to database-backed operations.

**Critical finding:** Messages are NOT persisted to the `messages` table. The chat API (`POST /api/chat`) is stateless -- it streams LLM responses without saving user or assistant messages. The `conversationFiles` junction table has a `messageId` column (DB-02), but there are no messageIds to link to. D-04 requires message-level file association, which requires either (a) adding message persistence to the chat API, or (b) deferring message-level linking and using conversation-level only. This is a planner decision.

**Primary recommendation:** Implement client-side file content injection with batch file content fetch API, add attachment bar to ChatMessage, extend FileChip with inline editing, and register 4 new file-processing skills wrapping existing infrastructure.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01**: Injection position -- client-side concatenation. Chat page handleSend receives fileIds, fetches extractedMarkdown via GET /api/files/:id, concatenates into user message content. Does NOT modify streaming chat API route.
- **D-02**: Token budget management -- client-side truncation. Client checks total character count of file contents, truncates if threshold exceeded, informs user "file content too long, showing first N characters". Threshold fixed or based on model config.
- **D-03**: Content injection format -- block delimiters. Append file content blocks after user message text, each file wrapped with delimiters: `\n\n---\n📎 {filename} ({type}, {size})\n{extractedMarkdown}\n---\n`. Clear separation, LLM can identify which content belongs to which file.
- **D-04**: File association granularity -- message-level association. After sending message, client calls linkFileToConversation(fileId, conversationId, messageId). messageId obtained after AI reply creation, requires modifying handleSend flow.
- **D-05**: Content editing -- inline Markdown editor. CHAT-05 requires user can edit extracted content before sending. Add "edit" button to FileChip, clicking expands inline Markdown editor. AI uses edited version.
- **D-06**: Skills scope -- implement all 4. All 4 Skills requirements covered: file-extract (SKIL-01), file-convert (SKIL-02), file-classify (SKIL-03), updated file-read/file-list (SKIL-04).
- **D-07**: file-convert positioning -- wraps extractors. file-convert receives fileId + targetFormat, internally calls corresponding extractor and returns conversion result. Wraps existing extractFile, not an independent format conversion tool.
- **D-08**: Attachment display -- attachment bar. Below user messages, show attachment row: filename + type icon + size, compact horizontal layout. Click to navigate to file management preview. Does NOT display file content directly in message.
- **D-09**: AI reply references -- no special handling. AI replies don't show file reference identifiers. User knows what they sent, AI naturally references file content in replies.

### Claude's Discretion
- Client truncation specific threshold (suggest 8000-12000 characters, based on model context window size)
- Batch file content fetch API design (single request per file vs batch endpoint)
- Inline Markdown editor implementation (textarea vs lightweight editor library)
- file-extract Skill input parameter design (fileId vs fileId+options)
- file-classify Skill return value detail level
- Updated file-read/file-list Skills permission model (can only read own files?)
- Skills registration category ('file' already exists in SkillMetadata)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | User can attach files to chat messages and AI responds based on file content | Client-side injection (D-01/D-03): fetch extractedMarkdown, concatenate into message text, send to existing chat API. Existing GET /api/files/:id returns full file record including extractedMarkdown. |
| CHAT-02 | System injects extracted file content into LLM context with clear delimiters | D-03 specifies exact delimiter format. Client concatenates file blocks into message.content before sending to POST /api/chat. No server-side changes needed. |
| CHAT-03 | User can attach multiple files to single message, AI reasons across all | handleSend already receives fileIds array. Client iterates all fileIds, fetches each, concatenates all blocks. MAX_FILES=5 already enforced by useFileUpload. |
| CHAT-04 | System manages token budget, truncating if necessary | D-02: client-side truncation with user notification. Threshold is at planner's discretion (recommend 10000 chars). Simple substring truncation is sufficient. |
| CHAT-05 | User can edit extracted content before sending, AI uses edited version | D-05: inline Markdown editor on FileChip. useFileUpload already tracks uploadedFile metadata. Need to track editedContent per file. |
| SKIL-01 | File content extraction available as Skill (file-extract) for agent workflows | Wrap existing extractFile(fileId) from dispatcher.ts. Return extractedMarkdown + extractedContent. |
| SKIL-02 | File format conversion available as Skill (file-convert) for agent workflows | D-07: wrap extractors, input fileId + targetFormat, output converted result. |
| SKIL-03 | File classification available as Skill (file-classify) for agent workflows | Wrap existing classifyByContent() from classifier.ts. |
| SKIL-04 | Updated file-list and file-read Skills work with new storage layer and database | Current file-read/file-list use raw fs. Must migrate to getFileById() and getFilesByUser(). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| No new libraries | -- | -- | All functionality uses existing codebase infrastructure |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing codebase | -- | File fetching, content injection, skills system | All phase work builds on existing modules |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| textarea for inline editing | @uiw/react-md-editor or Milkdown | Full editors add ~50KB+ bundle. textarea is sufficient for CHAT-05 -- user edits raw Markdown text. Rich editing can be added in v2. |
| Per-file GET requests for batch content | New batch endpoint POST /api/files/batch | Batch endpoint reduces N round-trips to 1 but requires new API route. Per-file fetches work with existing GET /api/files/:id and Promise.all. For 5 files max, the overhead is minimal. Recommendation: per-file with Promise.all initially. |
| Conversation-level file linking only | Message-level file linking | D-04 requires message-level, but messages aren't persisted (see Critical Finding). Planner must decide whether to add message persistence or relax D-04. |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended File Changes

```
src/
├── app/(chat)/page.tsx                    # MODIFY: handleSend accepts fileIds, fetches+injects content
├── app/(chat)/[conversationId]/page.tsx   # MODIFY: handleSend accepts fileIds, fetches+injects content
├── app/api/files/batch/route.ts           # NEW (optional): batch file content fetch
├── components/chat/chat-message.tsx        # MODIFY: add attachment bar below user messages
├── components/chat/chat-list.tsx           # MODIFY: pass file metadata to ChatMessage
├── components/files/file-chip.tsx          # MODIFY: add edit button + inline Markdown editor
├── hooks/use-file-upload.ts                # MODIFY: track editedContent per file
├── lib/db/queries.ts                       # MODIFY: add getFilesByIds(), getFilesByMessage()
├── skills/file-processing.ts               # MODIFY: add 4 new skills, update file-read/file-list
└── types/
    └── chat.ts                             # NEW (optional): shared chat message type with attachments
```

### Pattern 1: Client-Side File Content Injection (CHAT-01/02/03/04)

**What:** The chat page's `handleSend` function fetches extracted file content and concatenates it into the user message before sending to the chat API.

**When to use:** Every message send that includes fileIds.

**Flow:**
1. User types message + attaches files via ChatInput
2. ChatInput calls `onSend(messageText, fileIds)`
3. `handleSend` receives `content` and `fileIds`
4. If `fileIds.length > 0`:
   a. `Promise.all(fileIds.map(id => fetch(\`/api/files/${id}\`)))`
   b. Filter files with `status === 'ready'` and `extractedMarkdown`
   c. Concatenate file blocks using D-03 format
   d. Apply truncation per D-02
   e. Set `enrichedContent = messageText + fileBlocks`
5. Send `enrichedContent` (or plain `messageText` if no files) to `POST /api/chat`
6. Store file metadata in client message state for attachment bar display

**Example:**
```typescript
// In page.tsx handleSend
async function handleSend(content: string, fileIds?: string[]) {
  let enrichedContent = content;
  const attachmentFiles: AttachmentFile[] = [];

  if (fileIds && fileIds.length > 0) {
    // Fetch all file contents in parallel
    const fileResults = await Promise.all(
      fileIds.map(id => fetch(`/api/files/${id}`).then(r => r.json()))
    );

    const MAX_TOTAL_CHARS = 10000;
    let totalChars = 0;

    for (const file of fileResults) {
      if (file.status !== 'ready' || !file.extractedMarkdown) continue;

      attachmentFiles.push({
        id: file.id,
        filename: file.filename,
        fileType: file.fileType,
        size: file.size,
      });

      const block = `\n\n---\n📎 ${file.filename} (${file.fileType}, ${formatSize(file.size)})\n${file.extractedMarkdown}\n---\n`;

      if (totalChars + block.length > MAX_TOTAL_CHARS) {
        const remaining = MAX_TOTAL_CHARS - totalChars;
        enrichedContent += block.slice(0, remaining) + '\n\n[Content truncated...]';
        break;
      }

      enrichedContent += block;
      totalChars += block.length;
    }
  }

  // Store attachments in user message for display
  const userMessage = {
    id: crypto.randomUUID(),
    role: 'user' as const,
    content: enrichedContent,
    attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
  };

  // Continue with existing chat API call...
}
```

### Pattern 2: Attachment Bar Display (D-08)

**What:** Compact horizontal row of file metadata chips below user message bubbles.

**When to use:** User messages that have attached files.

**Example:**
```tsx
// In chat-message.tsx, after the prose div
{isUser && message.attachments && message.attachments.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mt-2">
    {message.attachments.map(att => (
      <Link
        key={att.id}
        href={`/files?id=${att.id}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-xs text-zinc-600 hover:bg-zinc-200"
      >
        {getTypeIcon(att.fileType)}
        <span className="truncate max-w-[160px]">{att.filename}</span>
        <span>{formatSize(att.size)}</span>
      </Link>
    ))}
  </div>
)}
```

### Pattern 3: Skills Registration (SKIL-01/02/03/04)

**What:** Add new skill methods to the existing `FileProcessingSkills` class using the `@skill()` decorator pattern.

**When to use:** All new file-processing skills follow the same decorator + Zod inputSchema pattern.

**Example:**
```typescript
// In src/skills/file-processing.ts

@skill({
  id: 'file-extract',
  name: 'Extract File Content',
  description: 'Extract text content from an uploaded file',
  version: '1.0.0',
  category: 'file',
  tags: ['file', 'extract', 'content'],
  inputSchema: { fileId: z.string().uuid() },
  requiresApproval: false,
  destructiveActions: [],
  dependencies: [],
  timeout: 35000, // extraction can take up to 30s
})
async extractFileSkill(
  input: { fileId: string },
  context: SkillContext
): Promise<SkillResult> {
  const file = await getFileById(input.fileId);
  if (!file) return { success: false, error: `File not found: ${input.fileId}` };
  if (file.status !== 'ready') return { success: false, error: `File not ready (status: ${file.status})` };
  if (file.userId !== context.userId) return { success: false, error: 'Access denied' };

  return {
    success: true,
    data: {
      fileId: file.id,
      filename: file.filename,
      fileType: file.fileType,
      extractedContent: file.extractedContent,
      extractedMarkdown: file.extractedMarkdown,
    },
  };
}

@skill({
  id: 'file-convert',
  name: 'Convert File Format',
  description: 'Convert file content to specified output format',
  version: '1.0.0',
  category: 'file',
  tags: ['file', 'convert', 'format'],
  inputSchema: {
    fileId: z.string().uuid(),
    targetFormat: z.enum(['markdown', 'text', 'json']),
  },
  requiresApproval: false,
  destructiveActions: [],
  dependencies: ['file-extract'],
  timeout: 35000,
})
async convertFileSkill(
  input: { fileId: string; targetFormat: 'markdown' | 'text' | 'json' },
  context: SkillContext
): Promise<SkillResult> {
  const file = await getFileById(input.fileId);
  if (!file) return { success: false, error: `File not found: ${input.fileId}` };
  if (file.userId !== context.userId) return { success: false, error: 'Access denied' };

  switch (input.targetFormat) {
    case 'markdown':
      return { success: true, data: { format: 'markdown', content: file.extractedMarkdown } };
    case 'text':
      return { success: true, data: { format: 'text', content: file.extractedContent } };
    case 'json':
      return { success: true, data: { format: 'json', content: file.extractedContent } };
  }
}
```

### Anti-Patterns to Avoid

- **Modifying the streaming chat API route**: D-01 explicitly forbids this. The API returns `text/plain` with chunked transfer. Adding file handling there would break the streaming contract.
- **Sending file content separately from message**: The LLM needs the file content in-context with the user's question. Separate messages would lose the association.
- **Using raw `fs` in skills**: Current `file-read`/`file-list` use `fs.readdir` and `fs.readFile`. Must migrate to database-backed `getFileById()` and `getFilesByUser()`.
- **Storing edited content server-side for CHAT-05**: The edit is ephemeral -- user edits content before sending, but the edited version is only used for the current message injection. The canonical extractedMarkdown in the DB stays unchanged.
- **Rendering file content inside chat messages**: D-08 says only show file name/icon/size. Showing full content would make messages unreadably long.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File content fetching | Custom HTTP wrapper | Existing `GET /api/files/:id` | Already returns `extractedMarkdown`, handles auth, ownership check |
| Skill registration | Manual registry entries | `@skill()` decorator + `discoverSkillsFromModules()` | Existing pattern with validation, auto-discovery |
| Input validation | Custom checks | Zod schemas in `inputSchema` | Already enforced by `SkillExecutor.validateInput()` |
| File type icons | Custom SVG set | Existing `getTypeIcon()` from `file-chip.tsx` | Handles all file types with proper lucide icons |
| File size formatting | Custom calculation | Existing `formatSize()` from `file-chip.tsx` | Already tested and used throughout |
| Content extraction | Custom per-type handlers | Existing `extractFile()` dispatcher | Already handles PDF, DOCX, code, CSV, Excel with strategy pattern |

**Key insight:** This phase is primarily an integration phase. Almost everything needed already exists -- the work is connecting existing pieces with thin glue code, not building new infrastructure.

## Critical Finding: Message Persistence Gap

**Issue:** D-04 requires `linkFileToConversation(fileId, conversationId, messageId)` -- message-level file association. However, the current `POST /api/chat` route does NOT persist messages to the `messages` table. It is stateless: receives messages array, streams LLM response, returns. The `[conversationId]/page.tsx` loads messages from DB but would find none (unless another mechanism persists them).

**Evidence:**
- `src/app/api/chat/route.ts`: No `db.insert(messages)` call anywhere in the file
- Grep for `db.insert.*messages` across entire `src/`: No results (only `agentMessages`)
- The `messages` table schema exists in `schema.ts` but has no insert queries
- The `conversationFiles` table has a `messageId` FK column but nothing populates it

**Options for the planner:**
1. **Add message persistence** to the chat API (or a sidecar) so that messageIds exist for linking. This is a prerequisite task.
2. **Relax D-04** to conversation-level linking only (`linkFileToConversation(fileId, conversationId)` without messageId). Simpler but loses per-message file granularity.
3. **Client-generated messageIds**: The client already generates `crypto.randomUUID()` for messages. These could be sent to the server for file linking, even if messages aren't persisted.

**Recommendation:** Option 3 is simplest -- use client-generated messageIds for the `linkFileToConversation` call. The `messageId` column is nullable in the schema. This avoids adding message persistence while still supporting the attachment bar display (which uses client state, not DB queries).

## Common Pitfalls

### Pitfall 1: File Not Ready When User Sends
**What goes wrong:** User attaches a file, extraction hasn't completed yet, chat sends with empty content.
**Why it happens:** `useFileUpload` tracks extraction status via polling, but the user could send before status reaches 'ready'.
**How to avoid:** In `handleSend`, check each file's status. Only include files with `status === 'ready'` and non-empty `extractedMarkdown`. Show a warning if some files are still processing: "Files still processing will not be included."
**Warning signs:** AI responds without file context even though files were attached.

### Pitfall 2: Token Budget Calculation Units
**What goes wrong:** Truncation threshold is set in tokens but measured in characters, or vice versa.
**Why it happens:** LLMs count tokens, but string length is characters. For CJK text (Chinese LLMs), 1 token can be 1-3 characters. For English, ~4 chars/token.
**How to avoid:** Use a character-based threshold (simpler, no tokenizer dependency). Recommend 10000 characters (~2500-7500 tokens depending on language). This is conservative enough for all supported models.
**Warning signs:** API returns context-length-exceeded errors, or AI responses ignore file content.

### Pitfall 3: File Content in Conversation History
**What goes wrong:** When the conversation history is sent to the LLM on subsequent messages, file content is duplicated (once in the original enriched user message, once in the history).
**Why it happens:** The chat API receives the full message history. If the enriched content (with file blocks) is stored in client state and sent back, it works correctly -- the file blocks are part of the user message content. This is actually the correct behavior.
**How to avoid:** No action needed -- the client-side injection approach naturally handles this because the enriched content IS the message content.
**Warning signs:** Unexpected token usage growth in long conversations with files.

### Pitfall 4: Skills Accessing Files Across Users
**What goes wrong:** file-extract/file-convert/file-classify skills called with a fileId belonging to another user.
**Why it happens:** The `SkillContext` has `userId`, but the current skill implementations need to check ownership.
**How to avoid:** All new skills MUST verify `file.userId === context.userId` before returning data. The existing `getFileById()` query does not filter by userId -- ownership check must be done in the skill.
**Warning signs:** Data leak in multi-user environment.

### Pitfall 5: Updated file-read/file-list Breaking Existing Workflows
**What goes wrong:** Changing file-read from fs-based to database-backed breaks existing agent workflows that expect filesystem paths.
**Why it happens:** Current `file-read` takes `{ path: string }` as input. Database-backed version would need `{ fileId: string }`.
**How to avoid:** Create new skill IDs (`file-read-db`, `file-list-db`) and deprecate old ones, OR accept `fileId` parameter and look up from DB. Since the old fs-based skills are only useful in single-user local development, migration is safe.
**Warning signs:** Existing test fixtures reference `path: string` inputs.

## Code Examples

Verified patterns from existing codebase:

### Existing File Fetch API (for content injection)
```typescript
// Source: src/app/api/files/[id]/route.ts
// GET /api/files/:id returns full file record including extractedMarkdown
// Already authenticated, ownership-checked
const file = await getFileById(id);
if (!file || file.userId !== session.user.id) {
  return NextResponse.json({ error: 'File not found' }, { status: 404 });
}
return NextResponse.json(file);
// Response shape: { id, userId, filename, mimeType, size, fileType, storagePath, status, extractedContent, extractedMarkdown, classification, errorMessage, createdAt, updatedAt }
```

### Existing Skill Decorator Pattern
```typescript
// Source: src/skills/file-processing.ts
// Pattern: @skill decorator with Zod inputSchema, SkillContext, SkillResult
@skill({
  id: 'file-read',  // Must be unique
  name: 'Read File',
  description: 'Read content from a file',
  version: '1.0.0',  // Must be semver
  category: 'file',
  tags: ['file', 'read'],
  inputSchema: { path: z.string() },
  requiresApproval: false,
  destructiveActions: [],
  dependencies: [],
  timeout: 10000,
})
async readFile(input: { path: string }, context: SkillContext): Promise<SkillResult> {
  // ...
}
```

### Existing handleSend Pattern (current, without files)
```typescript
// Source: src/app/(chat)/page.tsx
async function handleSend(content: string) {
  const userMessage = { id: crypto.randomUUID(), role: 'user' as const, content };
  setMessages(prev => [...prev, userMessage]);
  setIsLoading(true);

  // Create conversation if needed
  let convId = conversationId;
  if (!convId) {
    const response = await fetch('/api/conversations', { method: 'POST', ... });
    const data = await response.json();
    convId = data.conversation.id;
    setConversationId(convId);
  }

  // Stream chat response
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
      modelId,
      conversationId: convId,
    }),
  });
  // ...read stream...
}
```

### Existing linkFileToConversation
```typescript
// Source: src/lib/db/queries.ts
export async function linkFileToConversation(
  fileId: string,
  conversationId: string,
  messageId?: string  // Optional! Can be called without messageId
): Promise<ConversationFile> {
  const [link] = await db.insert(conversationFiles).values({
    fileId,
    conversationId,
    messageId: messageId || null,
  }).returning();
  return link;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side file injection | Client-side file injection | Phase 10 (this phase) | No changes to streaming chat API, simpler architecture |
| fs-based file skills | Database-backed file skills | Phase 10 (this phase) | Skills work with uploaded files, not local filesystem |

**Deprecated/outdated:**
- Current `file-read` skill (fs-based): Must be updated to database-backed for SKIL-04. Keep as deprecated or remove.
- Current `file-list` skill (fs-based): Must be updated to database-backed for SKIL-04.

## Open Questions

1. **Message persistence for D-04**
   - What we know: Messages are NOT persisted to DB. `messageId` column exists but is never populated. `linkFileToConversation` accepts optional messageId.
   - What's unclear: Whether to add message persistence or use client-generated IDs.
   - Recommendation: Use client-generated messageIds (crypto.randomUUID()) for file linking. No message persistence needed for this phase. The attachment bar uses client state.

2. **Batch file content API vs per-file fetches**
   - What we know: MAX_FILES=5 per message. GET /api/files/:id already works.
   - What's unclear: Whether 5 parallel fetches is acceptable UX/performance.
   - Recommendation: Use `Promise.all` with per-file GET requests initially. Add batch endpoint only if performance testing shows issues. 5 requests is negligible.

3. **Inline Markdown editor complexity**
   - What we know: CHAT-05 requires editing extractedMarkdown before sending.
   - What's unclear: Whether a plain `<textarea>` is sufficient or a rich editor is needed.
   - Recommendation: Use `<textarea>` for Phase 10. The content is Markdown source, not rendered output. Users comfortable editing Markdown will prefer source editing. Rich editing is v2 scope.

4. **file-convert targetFormat values**
   - What we know: D-07 says file-convert wraps extractors. The extractors produce text/markdown.
   - What's unclear: What targetFormat values make sense given current extractors all produce extractedContent + extractedMarkdown.
   - Recommendation: `targetFormat: 'markdown' | 'text' | 'json'`. 'markdown' returns extractedMarkdown, 'text' returns extractedContent, 'json' returns extractedContent (same as text for now, distinguishes intent).

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified -- all work is code-only changes within existing infrastructure)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/path/to/file.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | File content fetched and injected into message | unit | `npx vitest run tests/chat/inject-file-content.test.ts -x` | No -- Wave 0 |
| CHAT-02 | File blocks use correct delimiter format | unit | `npx vitest run tests/chat/inject-file-content.test.ts -x` | No -- Wave 0 |
| CHAT-03 | Multiple files concatenated in correct order | unit | `npx vitest run tests/chat/inject-file-content.test.ts -x` | No — Wave 0 |
| CHAT-04 | Content truncated when exceeding character threshold | unit | `npx vitest run tests/chat/inject-file-content.test.ts -x` | No — Wave 0 |
| CHAT-05 | Edited file content used instead of extracted | unit | `npx vitest run tests/hooks/use-file-upload.test.ts -x` | Partial (hook exists, edit not yet) |
| SKIL-01 | file-extract skill returns extracted content | unit | `npx vitest run tests/skills/file-processing.test.ts -x` | No — Wave 0 |
| SKIL-02 | file-convert skill converts format | unit | `npx vitest run tests/skills/file-processing.test.ts -x` | No — Wave 0 |
| SKIL-03 | file-classify skill returns classification | unit | `npx vitest run tests/skills/file-processing.test.ts -x` | No — Wave 0 |
| SKIL-04 | Updated file-read/file-list use database | unit | `npx vitest run tests/skills/file-processing.test.ts -x` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/chat/ tests/skills/ tests/hooks/`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/chat/inject-file-content.test.ts` — covers CHAT-01~04 (injection, formatting, truncation)
- [ ] `tests/components/file-chip-edit.test.tsx` — covers CHAT-05 (FileChip inline editor)
- [ ] `tests/skills/file-processing.test.ts` — covers SKIL-01/02/03/04 (all new + updated skills)
- [ ] `tests/hooks/use-file-upload.test.ts` — extend existing for CHAT-05 (editedContent tracking)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/app/api/chat/route.ts`, `src/app/api/files/[id]/route.ts`, `src/lib/db/queries.ts`, `src/lib/db/schema.ts`, `src/skills/file-processing.ts`, `src/lib/skills/decorator.ts`, `src/lib/skills/executor.ts`, `src/lib/skills/discovery.ts`, `src/lib/extraction/dispatcher.ts`, `src/lib/extraction/classifier.ts`
- `10-CONTEXT.md` — locked decisions and integration points
- `REQUIREMENTS.md` — CHAT-01~05, SKIL-01~04 definitions
- `CLAUDE.md` — project conventions and architecture

### Secondary (MEDIUM confidence)
- Phase 7-9 context files (design patterns from prior phases)
- `STATE.md` — accumulated decisions

### Tertiary (LOW confidence)
- None — all research based on direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, all existing codebase
- Architecture: HIGH - patterns directly observed in existing code
- Pitfalls: HIGH - all identified through code analysis, not hypothetical
- Critical finding (message persistence): HIGH - verified by codebase grep, no `db.insert(messages)` found

**Research date:** 2026-03-27
**Valid until:** 30 days (stable domain, no fast-moving dependencies)
