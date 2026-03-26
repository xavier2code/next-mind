# Architecture Research: File Upload, Processing, and Management for v1.2

**Domain:** Multi-type file handling integrated into existing Next.js 16 AI Agent platform
**Researched:** 2026-03-26
**Confidence:** HIGH

---

## Executive Summary

This document describes how file upload, processing, format conversion, preview, management, and chat integration features integrate with the existing Next-Mind architecture. The existing codebase uses Next.js 16 App Router with Route Handlers, PostgreSQL + Drizzle ORM, a decorator-based Skills system, and a per-session MCP server with a ToolRegistry. The file system must add three new subsystems -- a Storage Abstraction Layer (local/cloud), a File Processing Pipeline (extract/convert/classify), and a File Chat Integration layer -- while extending existing database schema, API routes, skills registry, and chat UI components.

The key architectural insight is that files are NOT a new domain bolted onto the side. They integrate deeply at three levels: (1) as new database tables linked to users and conversations, (2) as new skills registered through the existing decorator system, and (3) as content injected into the existing LLM streaming chat flow. The storage abstraction layer is the most critical new component because it gates all other file features and must be built first.

---

## System Overview

### Architecture Diagram (v1.2 additions highlighted)

```
+------------------------------------------------------------------+
|                        Next.js App Router                         |
+------------------------------------------------------------------+
|  +------------+  +------------+  +------------+  +--------------+ |
|  | /api/chat  |  | /api/mcp   |  |/api/skills |  |/api/approval | |
|  +-----+------+  +-----+------+  +-----+------+  +-------+------+ |
|        |              |               |                   |        |
|  +-----+------+  +-----+------+  +-----+------+  +-------+------+ |
|  | /api/files |  |/api/files/ |  |/api/preview|  |/api/convert|  |
|  |   [NEW]    |  |:id/content|  |   [NEW]    |  |   [NEW]     |  |
|  |   upload   |  |   [NEW]    |  |            |  |             |  |
|  |   list     |  |   download |  |            |  |             |  |
|  |   delete   |  |            |  |            |  |             |  |
|  +-----+------+  +-----+------+  +-----+------+  +-------+------+ |
|        |              |               |                   |        |
+--------|--------------|---------------|-------------------|--------+
         |              |               |                   |
+--------v--------------v---------------v-------------------v--------+
|                            Core Services                           |
+-------------------------------------------------------------------+
|  +----------+  +-----------+  +-----------+  +-----------------+  |
|  |LLM Gate- |  | MCP Server|  |  Skills   |  | Approval State  |  |
|  |   way    |  |(JSON-RPC) |  |  System   |  |    Machine      |  |
|  +----------+  +-----------+  +-----------+  +-----------------+  |
|                                                                    |
|  +------------------+  +------------------+  +-----------------+  |
|  | Storage Provider |  | File Processor   |  | File Classifier |  |
|  |    [NEW]         |  |    [NEW]         |  |    [NEW]        |  |
|  | - LocalAdapter   |  | - PDF extract    |  | - Type-based    |  |
|  | - S3Adapter      |  | - DOCX extract  |  | - Content-based |  |
|  | - R2Adapter      |  | - CSV parse      |  |   auto-tag      |  |
|  +------------------+  | - Excel parse    |  +-----------------+  |
|                         | - Code read      |                       |
|                         +------------------+                       |
+-------------------------------------------------------------------+
|                          Data Layer                               |
+-------------------------------------------------------------------+
|  +-----------------+  +------------------+  +-------------------+ |
|  |   PostgreSQL    |  |   Drizzle ORM    |  |   File Storage    | |
|  | [existing]      |  |   [extended]     |  |   [NEW]           | |
|  | + files         |  | + fileSchema     |  |   local disk or   | |
|  | + fileContents  |  |                  |  |   S3 / R2 bucket  | |
|  | + conversation- |  |                  |  |                   | |
|  |   Files (join)  |  |                  |  |                   | |
|  +-----------------+  +------------------+  +-------------------+ |
+-------------------------------------------------------------------+
```

### Component Responsibility Table

| Component | Responsibility | Location | Type |
|-----------|---------------|----------|------|
| StorageProvider (interface) | Abstract get/put/delete/exists operations | `src/lib/storage/provider.ts` | NEW - interface |
| LocalStorageAdapter | Local filesystem storage (dev/default) | `src/lib/storage/local.ts` | NEW |
| S3StorageAdapter | AWS S3 / S3-compatible storage | `src/lib/storage/s3.ts` | NEW (future) |
| FileProcessorService | Extract text from PDF/DOCX/CSV/Excel/code | `src/lib/files/processor.ts` | NEW |
| FileConverterService | Convert between formats (PDF->MD, DOCX->MD, etc.) | `src/lib/files/converter.ts` | NEW |
| FileClassifierService | Auto-classify files by type and content | `src/lib/files/classifier.ts` | NEW |
| FileQueries | Database CRUD for file metadata | `src/lib/db/queries.ts` | MODIFIED - add file queries |
| File Schema | Drizzle table definitions for files | `src/lib/db/schema.ts` | MODIFIED - add tables |
| `/api/files` | Upload, list, delete files | `src/app/api/files/route.ts` | NEW |
| `/api/files/[id]/content` | Download/get file content | `src/app/api/files/[id]/content/route.ts` | NEW |
| `/api/preview` | Get preview-ready content | `src/app/api/preview/route.ts` | NEW |
| `/api/convert` | Convert file format | `src/app/api/convert/route.ts` | NEW |
| FileSkills (decorator) | File skills registered with existing system | `src/skills/file-processing.ts` | MODIFIED - add new skills |
| ChatInput (component) | Add file attachment to chat messages | `src/components/chat/chat-input.tsx` | MODIFIED - add upload trigger |
| ChatMessage (component) | Render file attachments in messages | `src/components/chat/chat-message.tsx` | MODIFIED - add file card |
| FilePreviewPanel (component) | In-conversation file preview | `src/components/files/preview-panel.tsx` | NEW |
| FileManagerPanel (component) | Standalone file management UI | `src/components/files/manager-panel.tsx` | NEW |

---

## Recommended Project Structure

```
src/
  lib/
    storage/                    # NEW - Storage abstraction layer
      provider.ts               # StorageProvider interface + factory
      local.ts                  # LocalStorageAdapter (filesystem)
      s3.ts                     # S3StorageAdapter (future, placeholder)
      types.ts                  # Storage types, config
    files/                      # NEW - File processing pipeline
      processor.ts              # Text extraction per file type
      converter.ts              # Format conversion (PDF->MD, etc.)
      classifier.ts             # Auto-classification logic
      types.ts                  # FileType enum, processing results
      errors.ts                 # File-specific error types
    db/
      schema.ts                 # MODIFIED - add files, fileContents, conversationFiles tables
      queries.ts                # MODIFIED - add file CRUD queries
    skills/
      types.ts                  # MODIFIED - extend SkillCategory if needed
      registry.ts               # MODIFIED - register new file skills
    mcp/
      tools/
        bash.ts                 # EXISTING - no changes
  skills/
    file-processing.ts          # MODIFIED - add extract/convert/classify skills
    data-analysis.ts            # EXISTING - no changes
    web-search.ts               # EXISTING - no changes
  app/
    api/
      files/                    # NEW
        route.ts                # POST upload, GET list
        [id]/
          content/
            route.ts            # GET file content/download
          route.ts              # DELETE file
      preview/
        route.ts                # GET preview-ready content
      convert/
        route.ts                # POST convert format
  components/
    chat/
      chat-input.tsx            # MODIFIED - file attachment trigger
      chat-message.tsx          # MODIFIED - file attachment rendering
      file-attachment.tsx       # NEW - file chip in message
    files/
      preview-panel.tsx         # NEW - inline file preview
      preview-pdf.tsx           # NEW - PDF viewer (client-only)
      preview-code.tsx          # NEW - code with syntax highlighting
      preview-data.tsx          # NEW - CSV/Excel table view
      preview-markdown.tsx      # NEW - converted content viewer
      upload-button.tsx         # NEW - file upload trigger component
      upload-progress.tsx       # NEW - upload progress indicator
      file-card.tsx             # NEW - file metadata display card
      file-manager-panel.tsx    # NEW - standalone file list/search/delete
      file-search.tsx           # NEW - file search input
  hooks/
    use-file-upload.ts          # NEW - upload state management hook
    use-file-manager.ts         # NEW - file list/query hook
    use-file-preview.ts         # NEW - preview state hook
```

### Structure Rationale

- **`lib/storage/`** is a separate top-level module because the StorageProvider interface is used by upload routes, processing pipeline, and potentially by the MCP server for file-access tools. Keeping it isolated enables easy mocking in tests.
- **`lib/files/`** contains pure logic for file processing -- no API or DB dependencies. This makes it testable in isolation and reusable from skills, API routes, or background workers.
- **`api/files/`** follows the existing App Router pattern (see `/api/conversations/`, `/api/workflow-control/`). Using nested `[id]/content` follows REST conventions and keeps the upload endpoint clean.
- **`components/files/`** is a new directory because file components are a distinct domain from chat or workflow. They share nothing with `components/chat/` except being imported by chat components.
- **`hooks/use-file-*.ts`** follows the existing pattern of `use-model-preference.ts` -- custom hooks for complex client state.

---

## Architectural Patterns

### Pattern 1: Storage Provider (Ports & Adapters)

**What:** Define a `StorageProvider` interface that abstracts read/write/delete operations. Implement `LocalStorageAdapter` for development and local deployment. Add `S3StorageAdapter` (or R2) later.

**When to use:** All file I/O throughout the application goes through this interface. Never access the filesystem directly from business logic.

**Trade-offs:** Adds one layer of indirection. But the PROJECT.md explicitly calls for an abstract storage layer (local/cloud switchable), and the v1.1 codebase already notes "local storage, cloud storage integration pending." This pattern directly addresses that technical debt.

**Example:**

```typescript
// src/lib/storage/provider.ts
export interface StorageProvider {
  /** Store a file. Returns the storage key (path/URL). */
  put(key: string, data: Buffer | ReadableStream, options?: StoragePutOptions): Promise<string>;
  /** Retrieve a file. Returns a Buffer. */
  get(key: string): Promise<Buffer>;
  /** Check if a file exists. */
  exists(key: string): Promise<boolean>;
  /** Delete a file. */
  delete(key: string): Promise<void>;
  /** Get a temporary signed URL for direct download (for previews). */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

export interface StoragePutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

// Factory function reads env var to select provider
export function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'local';
  switch (provider) {
    case 'local':
      return new LocalStorageAdapter({
        basePath: process.env.STORAGE_LOCAL_PATH || './uploads',
      });
    case 's3':
      return new S3StorageAdapter({
        bucket: process.env.S3_BUCKET!,
        region: process.env.S3_REGION!,
        // ...
      });
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}
```

**Why this matters for the codebase:** The existing `FileProcessingSkills.readFile()` in `src/skills/file-processing.ts` accesses the filesystem directly with `readFile(input.path, 'utf-8')`. This MUST be migrated to use the StorageProvider so skills can access uploaded files regardless of whether they are stored locally or in S3.

### Pattern 2: File Processing Pipeline (Strategy Pattern)

**What:** Each file type has a dedicated processor strategy. A dispatcher routes files to the correct processor based on MIME type.

**When to use:** All file content extraction and format conversion.

**Trade-offs:** More classes than a single monolithic processor. But each processor is independently testable and new file types are added by creating one new strategy class.

**Example:**

```typescript
// src/lib/files/types.ts
export type SupportedFileType = 'pdf' | 'docx' | 'csv' | 'xlsx' | 'code';

// src/lib/files/processor.ts
export interface FileProcessor {
  /** Check if this processor can handle the given MIME type. */
  canProcess(mimeType: string): boolean;
  /** Extract text content from the file. */
  extract(buffer: Buffer, fileName: string): Promise<FileExtractResult>;
}

export interface FileExtractResult {
  text: string;
  metadata: {
    pageCount?: number;
    sheetNames?: string[];
    rowCount?: number;
    language?: string;
    encoding?: string;
  };
}

// Dispatcher
export class FileProcessingService {
  private processors: FileProcessor[] = [];

  registerProcessor(processor: FileProcessor): void {
    this.processors.push(processor);
  }

  async extract(buffer: Buffer, fileName: string, mimeType: string): Promise<FileExtractResult> {
    const processor = this.processors.find(p => p.canProcess(mimeType));
    if (!processor) {
      throw new UnsupportedFileTypeError(mimeType, fileName);
    }
    return processor.extract(buffer, fileName);
  }
}
```

### Pattern 3: File Content as Skill Context Extension

**What:** When a user attaches a file to a chat message, the file's extracted text is prepended to the message content before being sent to the LLM. This follows the existing pattern where the chat API receives `{ messages, modelId, conversationId }` -- we extend the message content to include file context.

**When to use:** Every chat message that references one or more uploaded files.

**Trade-offs:** Increases token count per message. But this is the simplest integration path that does not require changing the LLM gateway, streaming logic, or MCP server. It works with all three LLM providers (Qwen, GLM, MiniMax) because it only changes the message text.

**Example:**

```typescript
// In the conversation page, when user sends a message with attached files:
async function handleSend(content: string, attachedFileIds: string[]) {
  // Fetch file contents for each attached file
  const fileContents = await Promise.all(
    attachedFileIds.map(async (id) => {
      const res = await fetch(`/api/files/${id}/content`);
      const data = await res.json();
      return `--- File: ${data.fileName} (${data.fileType}) ---\n${data.textContent}\n--- End of ${data.fileName} ---`;
    })
  );

  // Prepend file contents to message
  const enrichedContent = fileContents.length > 0
    ? `${fileContents.join('\n\n')}\n\nUser question: ${content}`
    : content;

  // Send to existing /api/chat endpoint -- no changes needed on server side
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [...messages, { role: 'user', content: enrichedContent }],
      modelId,
      conversationId,
    }),
  });
  // ... existing streaming logic
}
```

**Why this matters:** This approach means the `/api/chat` route handler does NOT need modification for file chat integration. The file content is resolved client-side and injected into the message text. This is the lowest-friction integration path.

**Alternative (more sophisticated, higher effort):** Pass file IDs alongside messages and have the server-side chat handler resolve file contents. This keeps file content out of the client and enables server-side token counting and truncation. This is recommended as a follow-up optimization but NOT for the initial implementation.

### Pattern 4: File Skills Registration via Decorators

**What:** New file skills (extract-text, convert-format, classify-file) are added as `@skill()` decorated methods in the existing `FileProcessingSkills` class or a new `FileManagementSkills` class. They register automatically through the existing `initializeSkillRegistry()` flow.

**When to use:** When files need to be processed as part of agent workflows (A2A multi-agent system from v1.1).

**Trade-offs:** None -- this is the established pattern. The decorator infrastructure is already built and working.

**Example:**

```typescript
// src/skills/file-processing.ts (EXTENDED)
export class FileProcessingSkills {
  // ... existing readFile, listFiles ...

  @skill({
    id: 'file-extract-text',
    name: 'Extract File Text',
    description: 'Extract text content from an uploaded file (PDF, DOCX, CSV, Excel, code)',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'extract', 'text', 'pdf', 'docx', 'csv'],
    inputSchema: {
      fileId: z.string().describe('ID of the uploaded file'),
    },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 30000, // PDF extraction can be slow
  })
  async extractFileText(
    input: { fileId: string },
    context: SkillContext
  ): Promise<SkillResult> {
    // Use FileProcessingService to extract text
    // Return extracted text as SkillResult
  }
}
```

---

## Data Flow

### Flow 1: File Upload

```
User selects file in ChatInput
    |
    v
UploadButton component -> useFileUpload hook
    |
    v
POST /api/files (multipart/form-data)
    |
    v
Route Handler:
  1. auth() check (existing pattern from /api/chat)
  2. request.formData() to get file
  3. Validate: type, size (<=100MB), MIME
  4. Generate storage key: `{userId}/{date}/{uuid}-{filename}`
  5. StorageProvider.put(key, buffer)
  6. FileProcessingService.extract(buffer, filename, mimeType)
  7. FileClassifierService.classify(filename, mimeType, extractedText)
  8. Insert into `files` table (metadata)
  9. Insert extracted text into `fileContents` table
  10. logAudit() (existing pattern)
    |
    v
Response: { fileId, fileName, fileType, size, status: 'completed' }
    |
    v
Client: FileAttachment chip appears in ChatInput, ready to send with message
```

**Key detail:** The extraction happens synchronously during upload. For a 100MB file this could take several seconds. The response should be fast (file saved), and extraction should happen asynchronously. See Anti-Pattern 1 for why.

**Revised Flow 1 (async extraction):**

```
POST /api/files
    |
    v
Route Handler:
  1-5. Same as above (save file, validate)
  6. Insert into `files` table with status: 'processing'
  7. Return { fileId, status: 'processing' } immediately
  8. Fire-and-forget: processFileAsync(fileId)
      |
      v
    processFileAsync():
      a. StorageProvider.get(key) -> buffer
      b. FileProcessingService.extract(buffer, ...)
      c. FileClassifierService.classify(...)
      d. Update `files` table: status -> 'completed', add metadata
      e. Insert into `fileContents` table
      f. logAudit()
```

### Flow 2: Chat with File Attachment

```
User types message + clicks send (with attached file IDs)
    |
    v
ConversationPage.handleSend(content, attachedFileIds)
    |
    v
Client-side:
  1. GET /api/files/{id}/content for each attachedFileId
  2. Construct enriched message: file content + user question
  3. POST /api/chat with enriched message (existing endpoint)
    |
    v
Server: existing streaming chat flow (no changes)
    |
    v
Client: display response + file attachment chips in message bubble
```

### Flow 3: File Preview

```
User clicks file chip in chat message
    |
    v
FilePreviewPanel opens (client component)
    |
    v
GET /api/preview?fileId={id}&format={previewFormat}
    |
    v
Route Handler:
  1. auth() check
  2. Verify file belongs to user
  3. Look up fileContents table for extracted text
  4. If PDF: return { type: 'pdf', url: signedDownloadUrl }
  5. If code: return { type: 'code', language, content }
  6. If data: return { type: 'table', headers, rows }
  7. If markdown: return { type: 'markdown', content }
    |
    v
Client: route to appropriate preview component
  - PreviewPdf (pdfjs-dist, ssr: false)
  - PreviewCode (existing react-syntax-highlighter)
  - PreviewData (HTML table or data grid)
  - PreviewMarkdown (existing react-markdown + remark-gfm)
```

### Flow 4: Format Conversion

```
User requests conversion (e.g., "convert to markdown")
    |
    v
POST /api/convert { fileId, targetFormat: 'markdown' }
    |
    v
Route Handler:
  1. auth() check
  2. Verify file ownership
  3. FileConverterService.convert(buffer, sourceType, targetFormat)
  4. Return converted content as text/plain or JSON
    |
    v
Client: display converted content in PreviewMarkdown panel
```

### Flow 5: File Management (List/Search/Delete)

```
User opens FileManagerPanel (sidebar or modal)
    |
    v
GET /api/files?search={query}&type={fileType}&page={n}
    |
    v
Route Handler:
  1. auth() check
  2. Query files table WHERE userId = currentUser
  3. Optional: filter by type, search by name
  4. Return paginated list
    |
    v
Client: display file cards with name, type, size, date
    |
    v
User clicks delete
    |
    v
DELETE /api/files/{id}
    |
    v
Route Handler:
  1. auth() check
  2. Verify file ownership
  3. StorageProvider.delete(key)
  4. Delete from files table (CASCADE to fileContents)
  5. logAudit()
```

---

## Database Schema Extensions

### New Tables (add to `src/lib/db/schema.ts`)

```typescript
// File type enum
export const FileTypeEnum = ['pdf', 'docx', 'csv', 'xlsx', 'code'] as const;

// File processing status
export const FileStatusEnum = ['uploading', 'processing', 'completed', 'failed'] as const;

// Files table - metadata for uploaded files
export const files = pgTable('file', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  fileType: text('file_type', { enum: FileTypeEnum }).notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(), // bytes
  storageKey: text('storage_key').notNull(), // path in storage provider
  status: text('status', { enum: FileStatusEnum }).notNull().default('uploading'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(), // extracted metadata
  checksum: text('checksum'), // SHA-256 for dedup
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('file_user_id_idx').on(table.userId),
  fileTypeIdx: index('file_type_idx').on(table.fileType),
  statusIdx: index('file_status_idx').on(table.status),
  createdAtIdx: index('file_created_at_idx').on(table.createdAt),
}));

// File contents table - extracted text content (separate for size management)
export const fileContents = pgTable('file_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }).unique(),
  textContent: text('text_content'), // NULL if extraction failed or pending
  convertedMarkdown: text('converted_markdown'), // pre-converted markdown (optional)
  extractedAt: timestamp('extracted_at'),
}, (table) => ({
  fileIdIdx: index('file_content_file_id_idx').on(table.fileId),
}));

// Conversation-File junction table - links files to conversations
export const conversationFiles = pgTable('conversation_file', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index('conversation_file_conv_idx').on(table.conversationId),
  fileIdIdx: index('conversation_file_file_idx').on(table.fileId),
  uniqueConvFile: index('conversation_file_unique_idx').on(table.conversationId, table.fileId),
}));
```

### Why Three Tables Instead of One

1. **`files`** stores metadata only. This keeps the file list query fast (no need to load potentially large text content).
2. **`fileContents`** is separated because text content from a 100MB PDF could be several MB of text. Keeping it in a separate table allows the files list endpoint to be fast and avoids loading large text blobs when only metadata is needed.
3. **`conversationFiles`** is a junction table because a file can be referenced in multiple conversations. This avoids duplicating file metadata and enables "find all conversations that mention file X."

### Why `textContent` is `text` not `jsonb`

Text content from PDF/DOCX extraction is plain text or markdown. Using PostgreSQL `text` type is more efficient for large strings than JSONB (no JSON parsing overhead). The `convertedMarkdown` field is also plain text. If structured extraction results (like tables with headers) are needed, they go in the `files.metadata` JSONB field.

---

## Integration Points with Existing Systems

### 1. Chat Integration (MODIFIED existing components)

| Existing Component | Modification | Risk |
|--------------------|-------------|------|
| `ChatInput` | Add file attachment trigger button | LOW - additive UI change |
| `ChatMessage` | Add file chip rendering in user messages | LOW - additive UI change |
| `ConversationPage` | `handleSend()` accepts file IDs, resolves content client-side | MEDIUM - changes message construction logic |
| `/api/chat` | NO CHANGES for initial implementation | NONE |
| Messages table | NO CHANGES -- file references are in conversationFiles junction | NONE |

### 2. Skills System Integration (MODIFIED existing components)

| Existing Component | Modification | Risk |
|--------------------|-------------|------|
| `FileProcessingSkills` class | Add `extractFileText`, `convertFileFormat`, `classifyFile` skills | LOW - follows existing decorator pattern |
| `SkillCategory` type | Add `'document'` if needed (or reuse `'file'`) | LOW - type addition |
| `initializeSkillRegistry()` | No changes -- auto-discovers from imported modules | NONE |

### 3. MCP Tool Registration (NEW tools, existing pattern)

| Component | Change | Notes |
|-----------|--------|-------|
| MCP ToolRegistry | Register `file-extract`, `file-convert` tools | Uses existing `skillToMcpTool()` adapter |
| MCP session | No structural changes | Tools are session-scoped per existing pattern |

### 4. Auth & Middleware (NO CHANGES)

All new API routes (`/api/files/*`, `/api/preview`, `/api/convert`) are protected by the existing middleware pattern -- they start with `/api/` and are not `/api/auth/`, so they are automatically protected. Each route handler also calls `auth()` explicitly (following the pattern in `/api/chat/route.ts`).

### 5. Audit Logging (NEW audit actions)

Add these to the existing `logAudit()` calls:
- `file_upload` -- when a file is uploaded
- `file_download` -- when file content is accessed
- `file_delete` -- when a file is deleted
- `file_convert` -- when format conversion is requested

### 6. Agent Workflow Integration (v1.1 compatibility)

The existing `SubAgentExecutor` wraps `SkillExecutor` and uses `createSkillContext()`. The new file skills (extract, convert, classify) work within this framework without modification because they follow the `SkillFunction` signature: `(input: unknown, context: SkillContext) => Promise<SkillResult>`.

The existing `file` agent type (from `AgentTypeEnum`) can be enhanced to use the new file skills for agent-driven file processing within multi-agent workflows.

---

## Anti-Patterns

### Anti-Pattern 1: Synchronous Extraction During Upload

**What people do:** Extract text from the uploaded file in the same request handler that saves it, then return the result.

**Why it's wrong:** PDF text extraction can take 5-30 seconds for large documents. The upload response would timeout (Next.js default 30s maxDuration, current chat route uses 30s). The user would stare at a spinner for 30+ seconds with no feedback.

**Do this instead:** Save the file and return immediately with `status: 'processing'`. Process asynchronously (fire-and-forget pattern, consistent with existing `logAudit().catch(() => {})` pattern). Poll or use SSE for status updates.

### Anti-Pattern 2: Storing File Content in the Files Table

**What people do:** Add a `textContent` column directly to the `files` table.

**Why it's wrong:** File list queries (`GET /api/files`) would load megabytes of text for every file, making pagination painfully slow. The `files` table would bloat quickly.

**Do this instead:** Separate `fileContents` table. Only join when content is actually needed (preview, chat attachment, conversion).

### Anti-Pattern 3: Client-Side File Parsing

**What people do:** Send the file to the client browser and parse it with JavaScript (e.g., client-side PDF.js).

**Why it's wrong:** Increases client bundle size significantly (pdfjs-dist is ~2MB). Requires shipping WASM binaries. Security risk -- exposes raw file content to client-side JavaScript. Cannot persist extracted text for later use (RAG, search).

**Do this instead:** Parse server-side in the processing pipeline. Only send extracted text to the client for display.

### Anti-Pattern 4: File Path in Message Content

**What people do:** Store the file path (e.g., `/uploads/user123/file.pdf`) directly in the `messages.content` text field.

**Why it's wrong:** Couples message content to storage implementation. If the storage path changes (local -> S3), all historical messages break. Makes it impossible to search file content independently.

**Do this instead:** Use the `conversationFiles` junction table to link files to conversations. Resolve file content at render time or at message send time using file IDs.

### Anti-Pattern 5: Using External Libraries for Simple Operations

**What people do:** Pull in a heavy library (e.g., SheetJS full bundle) just to parse a CSV file.

**Why it's wrong:** SheetJS is ~500KB. For CSV parsing, PapaParse (~40KB) is sufficient. For code files, native `fs.readFile` with the existing `react-syntax-highlighter` is all that is needed.

**Do this instead:** Match library to complexity. CSV = PapaParse. Excel = SheetJS. PDF = pdf-parse (simple) or pdfjs-dist (if rendering needed). DOCX = mammoth. Code = native fs + syntax highlighter.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users (current target: mid-size teams 10-50) | Local filesystem storage. Single PostgreSQL instance. No CDN. Processing happens in-route async. |
| 1k-100k users | Move to S3/R2 with presigned URLs for uploads/downloads. Add CDN for static file serving. Consider a processing queue (BullMQ + Redis) instead of fire-and-forget. |
| 100k+ users | Dedicated processing workers. Object storage with lifecycle policies. Full-text search on file contents (pg_trgm or dedicated search index). Consider separate file service microservice. |

### Scaling Priorities

1. **First bottleneck:** Disk space on local filesystem. A team of 50 uploading 10 files/day at 10MB average = 5GB/month. Manageable for a year on a single server, but add monitoring and cleanup policies from day one.
2. **Second bottleneck:** PDF extraction CPU/memory. Large PDFs are CPU-intensive. The async processing pattern protects the upload endpoint, but a burst of uploads could exhaust server resources. A simple job queue (even in-process with concurrency limit) would help.
3. **Third bottleneck:** PostgreSQL text content storage. If the team uploads many large documents, the `fileContents.textContent` column could grow to GBs. Consider adding a retention policy or archiving old content.

### Serverless Considerations

If deployed on Vercel serverless:
- **Body size limit:** 4.5MB per function invocation. Files up to 100MB (project requirement) MUST use direct-to-storage upload with presigned URLs, not route through the Next.js server.
- **Function duration:** 30s max (current `maxDuration = 30` in chat route). File extraction must be async and not block the upload response.
- **Local filesystem:** Not persistent across invocations. The `LocalStorageAdapter` only works in self-hosted deployments. For Vercel, S3/R2 is mandatory.

This is a critical decision point. The PROJECT.md says "initially public cloud" but the current deployment model appears self-hosted. The abstract storage layer handles both, but the upload strategy differs:
- **Self-hosted:** `POST /api/files` with multipart/form-data, save to local disk
- **Vercel serverless:** `POST /api/files` returns presigned URL, client uploads directly to S3/R2, then `POST /api/files/confirm` to register the file in the database

---

## Build Order (Dependency-Based)

The following order minimizes rework and ensures each phase has testable output:

### Phase 1: Storage Foundation
**Prerequisites:** None (new module)
**Build:**
1. `StorageProvider` interface + factory
2. `LocalStorageAdapter` implementation
3. `S3StorageAdapter` stub (throws "not implemented")
4. Unit tests for storage layer
**Deliverable:** Files can be saved and retrieved via a clean interface.

### Phase 2: Database Schema + Queries
**Prerequisites:** Phase 1 (need storage key format decided)
**Build:**
1. Add `files`, `fileContents`, `conversationFiles` tables to `schema.ts`
2. Run `npm run db:generate && npm run db:push`
3. Add file CRUD queries to `queries.ts`
4. Unit tests for queries
**Deliverable:** File metadata can be persisted and queried.

### Phase 3: File Upload API
**Prerequisites:** Phase 1 + Phase 2
**Build:**
1. `POST /api/files/route.ts` -- upload with validation, save to storage, insert metadata
2. `DELETE /api/files/[id]/route.ts` -- delete from storage + database
3. `GET /api/files/route.ts` -- list files with pagination
4. `GET /api/files/[id]/content/route.ts` -- get file content/download
5. Integration tests for upload flow
**Deliverable:** Users can upload, list, view, and delete files via API.

### Phase 4: File Processing Pipeline
**Prerequisites:** Phase 3 (files must be stored to process them)
**Build:**
1. `FileProcessingService` with type-specific processors
2. PDF processor (pdf-parse)
3. DOCX processor (mammoth)
4. CSV processor (papaparse)
5. Excel processor (SheetJS/xlsx)
6. Code processor (native, syntax detection)
7. `FileClassifierService`
8. Async processing triggered after upload
9. Unit tests for each processor
**Deliverable:** Uploaded files are automatically processed, text extracted, and classified.

### Phase 5: Chat Integration
**Prerequisites:** Phase 4 (file content must exist to attach to messages)
**Build:**
1. `useFileUpload` hook
2. `UploadButton` + `UploadProgress` components
3. Modify `ChatInput` to support file attachments
4. Client-side file content resolution in `handleSend()`
5. `FileAttachment` component for message rendering
6. Modify `ChatMessage` to show file chips
7. E2E test: upload file, send message, verify response references file content
**Deliverable:** Users can attach files to chat messages and get AI responses that reference file content.

### Phase 6: File Preview
**Prerequisites:** Phase 4 (needs extracted content) + Phase 5 (needs to be triggered from chat)
**Build:**
1. `GET /api/preview/route.ts`
2. `FilePreviewPanel` component
3. `PreviewPdf` (client-only, pdfjs-dist with `next/dynamic ssr: false`)
4. `PreviewCode` (reuse existing `react-syntax-highlighter`)
5. `PreviewData` (HTML table component)
6. `PreviewMarkdown` (reuse existing `react-markdown` + `remark-gfm`)
**Deliverable:** Users can preview uploaded files inline in the chat interface.

### Phase 7: Format Conversion
**Prerequisites:** Phase 4 (processing pipeline must exist)
**Build:**
1. `FileConverterService` (PDF->MD, DOCX->MD, CSV->JSON, etc.)
2. `POST /api/convert/route.ts`
3. Conversion UI in preview panel
4. Unit tests for conversions
**Deliverable:** Users can convert files between formats.

### Phase 8: File Management UI
**Prerequisites:** Phase 3 (list/delete API exists)
**Build:**
1. `useFileManager` hook
2. `FileManagerPanel` component
3. `FileCard` component
4. `FileSearch` component
5. Sidebar integration or modal trigger
**Deliverable:** Users can browse, search, and manage their uploaded files.

### Phase 9: Skills + MCP Integration
**Prerequisites:** Phase 4 (processing pipeline) + existing skills system
**Build:**
1. Add `extractFileText`, `convertFileFormat`, `classifyFile` skills to `FileProcessingSkills`
2. Register via existing `skillToMcpTool()` adapter
3. Integration with agent workflow system (file agent uses new skills)
**Deliverable:** Agent workflows can process files as part of multi-agent tasks.

### Phase Dependencies Graph

```
Phase 1 (Storage)
    |
    v
Phase 2 (Database)
    |
    v
Phase 3 (Upload API) ---------> Phase 8 (Management UI)
    |
    v
Phase 4 (Processing) ---------> Phase 7 (Conversion)
    |                                |
    v                                v
Phase 5 (Chat Integration)    Phase 6 (Preview)
    |
    v
Phase 9 (Skills + MCP)
```

Phases 8, 7, and 6 can be built in parallel after Phase 4. Phase 9 depends on Phase 5 being complete (for end-to-end testing of file skills in chat context).

---

## Sources

- [Next.js File Uploads Guide (2026)](https://oneuptime.com/blog/post/2026-01-24-nextjs-file-uploads/view) -- HIGH confidence, Jan 2026 publication
- [Next.js 16 Route Handlers](https://strapi.io/blog/nextjs-16-route-handlers-explained-3-advanced-usecases) -- HIGH confidence, official Next.js patterns
- [Vercel 4.5MB Body Size Limit KB](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) -- HIGH confidence, official Vercel documentation
- [PDF Parsing Libraries Comparison (Strapi, 2025)](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) -- MEDIUM confidence
- [pdf-parse NPM](https://www.npmjs.com/package/pdf-parse) -- HIGH confidence, official package page
- [Mammoth.js DOCX to Markdown](https://gitcode.csdn.net/66d1d4a8e2ce0119e0a19f35.html) -- MEDIUM confidence, community guide
- [SheetJS vs ExcelJS vs node-xlsx (2026)](https://www.pkgpulse.com/blog/sheetjs-vs-exceljs-vs-node-xlsx-excel-files-node-2026) -- MEDIUM confidence, 2026 comparison
- [Storage Abstraction Pattern](https://elasticscale.com/blog/abstracting-away-from-object-storage-like-s3-is-always-a-good-idea/) -- MEDIUM confidence, architecture pattern discussion
- [React-PDF with Next.js App Router](https://blog.react-pdf.dev/how-to-build-a-react-pdf-viewer-for-nextjs-in-minutes) -- MEDIUM confidence, implementation guide
- [tus Protocol for Resumable Uploads](https://tus.io/) -- HIGH confidence, official protocol specification
- [Next.js App Router PDF Integration](https://github.com/react-pdf-kit/starter-rp-nextjs-app-router-js) -- MEDIUM confidence, starter repository
- [Existing codebase analysis](https://github.com/xavier/next-mind) -- HIGH confidence, direct code inspection

---

*Architecture research for: v1.2 File Upload, Processing, and Management*
*Researched: 2026-03-26*
*Focus: Integration with existing Next.js 16 + Drizzle ORM + MCP + Skills architecture*
