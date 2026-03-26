# Phase 7: Storage & Upload - Research

**Researched:** 2026-03-26
**Domain:** File upload infrastructure (abstract storage, streaming upload, DB schema, chat input UI)
**Confidence:** HIGH

## Summary

Phase 7 is the foundation for the entire v1.2 file processing milestone. It delivers three things: (1) an abstract storage layer using unstorage that supports local filesystem and future S3/R2 without changing business logic, (2) a streaming upload API (`POST /api/files/upload`) that handles files up to 100MB via busboy for large files and `request.formData()` for small files, and (3) database tables (`files` + `conversationFiles`) with Drizzle ORM following existing codebase patterns. The ChatInput component gets extended with a Paperclip button, drag-drop zone, and compact chip-style file previews with inline progress bars.

The most critical technical risk is busboy integration with Next.js 16 App Router, which requires converting Web API ReadableStream to Node.js streams and using `export const runtime = 'nodejs'`. The deployment target (self-hosted vs Vercel serverless) remains undecided but is not blocking for Phase 7 -- the self-hosted POST multipart strategy works now, and the abstract storage layer makes future cloud migration straightforward.

**Primary recommendation:** Build the storage abstraction first, then the DB schema, then the upload API, then the ChatInput UI extension. Each piece is independently testable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Upload Interaction Design**
- D-01: ChatGPT-style -- entire ChatInput area is drag-drop zone, attachment button + file preview chips
- D-02: Paperclip icon (lucide-react `Paperclip`) on Textarea left side
- D-03: Compact chips -- filename + type icon + file size + close button, horizontal row with overflow wrap
- D-04: Drag visual feedback -- ChatInput area border highlight + overlay prompt
- D-05: Max 5 files per message. Prompt user to remove some when exceeded.

**Progress & Error Handling**
- D-06: Inline progress bar inside chip + percentage text. Loading animation during upload, type icon when complete.
- D-07: Inline error on chip -- red border + error icon + reason text ("unsupported file type", "file exceeds 100MB"), auto-fade after 5 seconds.
- D-08: Manual retry only -- retry button on failed chip, no auto-retry.

**Storage Configuration & API Design**
- D-09: Env-driven storage: `STORAGE_DRIVER=local|s3`, local mode uses `STORAGE_LOCAL_PATH` for directory
- D-10: Unified endpoint `POST /api/files/upload`. Server auto-switches: small files (<10MB) use `request.formData()`, large files use busboy streaming.
- D-11: UUID file IDs, consistent with existing codebase (conversations, messages, workflows, tasks all use UUID + `defaultRandom()`)
- D-12: Full metadata response: `{ id, filename, size, mimeType, fileType, storagePath, status }`, initial status `"uploaded"`

**Database Schema**
- D-13: Single `files` table with metadata AND extracted content fields (not separated). Matches DB-01.
- D-14: 3-category fileType enum: `document` (PDF, DOCX), `code` (code files), `data` (CSV, Excel). Matches MGMT-03.
- D-15: `conversationFiles` junction includes `messageId` field (fileId + conversationId + messageId), supports associating files to specific messages for Phase 10.

### Claude's Discretion
- Attachment button hover/active animation details
- Drag overlay specific copy and animation
- Progress bar color scheme and animation details
- Error chip fade-out transition specifics
- Default local storage path when `STORAGE_LOCAL_PATH` is unset
- busboy streaming progress event granularity (percentage update frequency)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPLD-01 | Drag-and-drop upload into chat input area | Context D-01/D-04; existing ChatInput component pattern; standard `onDragOver`/`onDrop` React events |
| UPLD-02 | Attachment button (Paperclip icon) upload | Context D-02; lucide-react Paperclip available; hidden `<input type="file">` pattern |
| UPLD-03 | Client + server file type validation (PDF, DOCX, code, CSV, Excel) | Pitfall 1: magic byte validation required; extension whitelist as defense-in-depth; `file-type` npm package recommended |
| UPLD-04 | 100MB file size limit with clear error | Pitfall 2: busboy streaming prevents OOM; client-side pre-check; server-side Content-Length or stream size tracking |
| UPLD-05 | Upload progress indicator | Context D-06; XMLHttpRequest for progress events (fetch API lacks upload progress); busboy `on('progress')` for server-side tracking |
| UPLD-06 | File preview cards (filename, type icon, size) with remove | Context D-03; chip component pattern; lucide-react FileText/FileCode/FileSpreadsheet icons |
| UPLD-07 | Abstract storage layer (local + cloud) | unstorage 1.17.4; Ports & Adapters pattern; env-driven driver selection (D-09) |
| UPLD-08 | Streaming upload via busboy for files >10MB | busboy 1.6.0; ReadableStream-to-Node.js-stream conversion pattern; `export const runtime = 'nodejs'` |
| DB-01 | `files` table with metadata + content fields | Context D-13 (single table, not separated); Drizzle pgTable pattern; existing schema conventions |
| DB-02 | `conversationFiles` junction table | Context D-15 (includes messageId); references conversations.id + files.id |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| unstorage | 1.17.4 | Abstract key-value storage with pluggable drivers (fs, S3) | Built by UnJS; zero-dep core; unified API across 18+ drivers; env-switchable between local and cloud |
| busboy | 1.6.0 | Streaming multipart parser for large file uploads (10-100MB) | Only parser compatible with Next.js App Router via ReadableStream; never buffers entire body |
| nanoid | 5.1.7 | URL-safe unique file IDs (alternative to UUID for storage keys) | Shorter than UUID for storage paths; non-sequential for security; ESM-native v5 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mime-types | 3.0.2 | Map file extensions to MIME types and vice versa | Content-type headers, file type classification, preview rendering decisions |
| file-type | 5.0.0 | Magic byte validation (server-side file type verification) | Security-critical: verify uploaded files match their claimed type by inspecting binary signatures |
| zod | 3.25.76 | Upload input schema validation | Already installed. Validate file metadata, size limits, type constraints. NOTE: project uses 3.25.76, not 4.x |

### Not Needed in Phase 7 (deferred to Phase 8+)

| Library | Version | Purpose | Phase |
|---------|---------|---------|-------|
| unpdf | 1.4.0 | PDF text extraction | Phase 8 |
| mammoth | 1.12.0 | DOCX to HTML conversion | Phase 8 |
| turndown | 7.2.2 | HTML to Markdown conversion | Phase 8 |
| papaparse | 5.5.3 | CSV parsing | Phase 8 |
| exceljs | 4.4.0 | Excel reading | Phase 8 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| unstorage | Custom StorageProvider interface | Custom gives more control but adds significant implementation burden (S3 multipart, presigned URLs, streaming). unstorage handles all of this. |
| busboy | formidable | formidable has known App Router compatibility issues (GitHub #50147, #48164). busboy is the safer choice. |
| busboy | multer | multer requires Express-style req/res. Incompatible with Next.js App Router Route Handlers. |
| busboy | UploadThing v7 | Managed SaaS ($10/mo). Locks files to their infrastructure. Contradicts abstract storage requirement. |
| nanoid | crypto.randomUUID() | UUID is already the project convention for DB primary keys (D-11). Use UUID for DB, nanoid for storage path keys. |
| file-type | Manual magic byte checking | Manual checks are error-prone and incomplete. file-type covers 100+ formats with maintained signatures. |

**Installation (Phase 7 only):**
```bash
npm install unstorage busboy nanoid mime-types file-type
```

**Version verification:** All core packages verified via `npm view` on 2026-03-26:
- unstorage: 1.17.4
- busboy: 1.6.0
- nanoid: 5.1.7
- mime-types: 3.0.2

## Architecture Patterns

### Recommended Project Structure (Phase 7 scope)

```
src/
  lib/
    storage/                    # NEW -- Storage abstraction layer
      provider.ts               # StorageProvider interface + factory function
      local.ts                  # LocalStorageAdapter (filesystem driver via unstorage)
      types.ts                  # Storage types, config, error types
    db/
      schema.ts                 # MODIFIED -- add files + conversationFiles tables
      queries.ts                # MODIFIED -- add file CRUD queries
    audit.ts                    # MODIFIED -- add file-related AuditAction types
  types/
    index.ts                    # MODIFIED -- add 'file_upload' | 'file_delete' to AuditAction
  app/
    api/
      files/
        upload/
          route.ts              # NEW -- POST /api/files/upload
  components/
    chat/
      chat-input.tsx            # MODIFIED -- add Paperclip button, drag-drop, file chips
    files/
      file-chip.tsx             # NEW -- file preview chip with progress/error states
      file-upload-button.tsx    # NEW -- Paperclip button with hidden file input
  hooks/
    use-file-upload.ts          # NEW -- upload state management, progress tracking
```

### Pattern 1: Storage Provider (Ports & Adapters via unstorage)

**What:** Use unstorage's built-in driver system instead of building a custom StorageProvider interface. unstorage provides the abstraction directly -- factory function selects driver based on env var.

**When to use:** All file I/O. Never access filesystem directly from business logic.

**Key difference from upstream research:** The upstream ARCHITECTURE.md proposed a custom `StorageProvider` interface with `put()`/`get()`/`delete()`/`exists()` methods wrapping unstorage. Since unstorage already provides exactly this API, adding a custom wrapper adds an unnecessary indirection layer. Use unstorage directly through a factory-created instance.

**Example:**
```typescript
// src/lib/storage/provider.ts
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';

let _storage: ReturnType<typeof createStorage> | null = null;

export function getStorage() {
  if (_storage) return _storage;

  const driver = process.env.STORAGE_DRIVER || 'local';

  if (driver === 'local') {
    _storage = createStorage({
      driver: fsDriver({
        base: process.env.STORAGE_LOCAL_PATH || './data/uploads',
      }),
    });
  } else if (driver === 's3') {
    // S3 driver loaded dynamically to avoid bundling when not needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const s3Driver = require('unstorage/drivers/s3').default;
    _storage = createStorage({
      driver: s3Driver({
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
        endpoint: process.env.S3_ENDPOINT,
        bucket: process.env.S3_BUCKET!,
        region: process.env.S3_REGION || 'auto',
      }),
    });
  } else {
    throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
  }

  return _storage;
}
```

**unstorage API (verified):**
- `storage.setItem(key, value)` -- store data
- `storage.getItem(key)` -- retrieve data
- `storage.hasItem(key)` -- check existence
- `storage.removeItem(key)` -- delete
- `storage.getMeta(key)` / `storage.setMeta(key, meta)` -- metadata
- `storage.keys()` -- list keys
- `storage.clear()` -- clear all
- `storage.copy(src, dest)` -- copy
- `storage.watch(event)` -- watch for changes

### Pattern 2: Dual Upload Strategy (formData + busboy)

**What:** Single endpoint `POST /api/files/upload` that automatically switches transport based on file size. Small files (<10MB) use the simpler `request.formData()`. Large files (10-100MB) use busboy streaming.

**When to use:** All file uploads. The threshold (10MB) matches the `serverActions.bodySizeLimit` config.

**Critical implementation detail -- busboy + App Router:**
```typescript
// src/app/api/files/upload/route.ts
export const runtime = 'nodejs'; // REQUIRED for busboy

import { Readable } from 'stream';
import Busboy from 'busboy';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  // Check Content-Length to decide strategy
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  const useStreaming = contentLength > 10 * 1024 * 1024; // 10MB threshold

  if (useStreaming) {
    // busboy streaming path
    return handleStreamingUpload(request);
  } else {
    // request.formData() path (simpler, for small files)
    return handleFormDataUpload(request);
  }
}

async function handleStreamingUpload(request: NextRequest) {
  // Convert Web API ReadableStream to Node.js stream
  const nodeStream = Readable.fromWeb(request.body as ReadableStream);

  const busboy = Busboy({
    headers: Object.fromEntries(request.headers),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max
      files: 1,
    },
  });

  // ... pipe and collect file data
}
```

**Why `Readable.fromWeb()`:** Next.js App Router provides `request.body` as a Web API `ReadableStream`. busboy expects a Node.js `Readable` stream. The conversion is essential and non-obvious.

### Pattern 3: Database Schema (Single files Table)

**What:** Per D-13, a single `files` table stores both metadata and extracted content fields. This differs from the upstream ARCHITECTURE.md which recommended separating into `files` + `fileContents` tables. The user explicitly chose the single-table approach.

**When to use:** All file metadata and content storage.

**Example (following existing codebase patterns):**
```typescript
// Add to src/lib/db/schema.ts

export const FileTypeEnum = ['document', 'code', 'data'] as const;
export const FileStatusEnum = ['uploaded', 'processing', 'ready', 'failed'] as const;

export const files = pgTable('file', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // bytes
  fileType: text('file_type', { enum: FileTypeEnum }).notNull(),
  storagePath: text('storage_path').notNull(), // key in unstorage
  status: text('status', { enum: FileStatusEnum }).notNull().default('uploaded'),
  extractedContent: text('extracted_content'), // plain text (populated in Phase 8)
  extractedMarkdown: text('extracted_markdown'), // markdown (populated in Phase 8)
  classification: text('classification'), // auto-classification (populated in Phase 9)
  errorMessage: text('error_message'), // extraction error details
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('file_user_id_idx').on(table.userId),
  fileTypeIdx: index('file_type_idx').on(table.fileType),
  statusIdx: index('file_status_idx').on(table.status),
}));

export const conversationFiles = pgTable('conversation_file', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  messageId: text('message_id').references(() => messages.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  fileIdIdx: index('conversation_file_file_idx').on(table.fileId),
  conversationIdx: index('conversation_file_conv_idx').on(table.conversationId),
  messageIdx: index('conversation_file_msg_idx').on(table.messageId),
}));

// Type exports (following existing pattern)
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type ConversationFile = typeof conversationFiles.$inferSelect;
export type NewConversationFile = typeof conversationFiles.$inferInsert;
```

**Key decisions:**
- `id`: UUID via `defaultRandom()` -- matches agents/workflows/tasks convention (D-11)
- `conversationFiles.messageId`: nullable FK to messages -- supports Phase 10 (D-15)
- `storagePath`: stores the unstorage key (e.g., `userId/fileId/filename`), NOT a filesystem path
- `fileType`: 3-category enum per D-14 (document/code/data), NOT per-format (pdf/docx/csv etc.)

### Pattern 4: ChatInput Extension (useFileUpload hook)

**What:** Encapsulate all file upload state in a `useFileUpload` hook. The hook manages the file list, upload progress, errors, and retry. ChatInput consumes the hook and renders chips.

**When to use:** All file upload UI state management.

**Example hook interface:**
```typescript
// src/hooks/use-file-upload.ts
interface FileUploadState {
  files: PendingFile[];
  isUploading: boolean;
  addFiles: (fileList: FileList) => void;
  removeFile: (id: string) => void;
  retryFile: (id: string) => void;
  clearFiles: () => void;
}

interface PendingFile {
  id: string;              // temporary client ID
  file: File;              // browser File object
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;        // 0-100
  error?: string;          // error message
  uploadedFile?: {         // server response after successful upload
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    fileType: 'document' | 'code' | 'data';
    storagePath: string;
    status: string;
  };
}
```

**Upload progress implementation:**
Use `XMLHttpRequest` instead of `fetch` for the upload request. `XMLHttpRequest` supports `upload.onprogress` events, while the Fetch API does not expose upload progress. This is a well-known limitation.

```typescript
function uploadFile(file: File, onProgress: (percent: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.statusText));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.open('POST', '/api/files/upload');
    xhr.send(formData);
  });
}
```

### Anti-Patterns to Avoid

- **Custom StorageProvider interface wrapping unstorage:** unstorage already provides the abstraction. Adding a wrapper is unnecessary indirection. Use unstorage directly.
- **Using `fetch` for upload progress:** The Fetch API does not expose upload progress events. Use `XMLHttpRequest` which supports `xhr.upload.onprogress`.
- **Separate `fileContents` table:** The upstream research recommended this, but the user decided D-13 (single `files` table). Follow the user's decision.
- **Storing filesystem paths in the database:** Store unstorage keys (e.g., `userId/fileId/filename`), not absolute filesystem paths. This ensures portability between storage drivers.
- **Client-side only file type validation:** Always validate magic bytes server-side (Pitfall 1). Client-side checks are easily bypassed.
- **Buffering entire file for validation before storing:** For busboy streaming, validate as the stream comes in. Check Content-Length header first for early rejection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Storage abstraction | Custom `StorageProvider` with fs/S3 adapters | unstorage with fs/s3 drivers | Handles streaming, multipart upload, presigned URLs, 18+ drivers. Writing this correctly requires 500+ lines and edge case handling. |
| Streaming multipart parsing | Custom chunked body parser | busboy | The only parser compatible with Next.js App Router. Handles MIME boundary detection, header parsing, file streaming, field extraction. |
| File type detection | Manual magic byte comparison | file-type (npm) | Covers 100+ formats, maintained signatures, handles edge cases (e.g., ZIP-based formats like DOCX/XLSX that all start with `PK`). |
| MIME type mapping | Manual extension-to-MIME object | mime-types (npm) | Industry standard. Handles 1000+ mappings including obscure types. |
| File upload progress | Custom polling or chunked upload protocol | XMLHttpRequest `upload.onprogress` | Built-in browser API. No additional dependencies needed. |
| UUID generation | Custom random ID generator | `crypto.randomUUID()` or `defaultRandom()` from Drizzle | Already the project convention. Cryptographically random, collision-resistant. |

**Key insight:** The storage layer is the single most complex piece to hand-roll correctly. unstorage eliminates this entirely -- it handles filesystem operations, S3 multipart uploads, streaming, and metadata. Building a fraction of this functionality would be a week-long effort with subtle bugs.

## Common Pitfalls

### Pitfall 1: File Type Validation as Checkbox

**What goes wrong:** Relying solely on `file.type` (Content-Type header) or file extension for validation. Client-sent headers are trivially forged -- renaming `shell.php.jpg` or spoofing `Content-Type: application/pdf` bypasses checks.

**Why it happens:** Most tutorials show `if (file.type !== 'application/pdf')` and call it done. It works for honest users but fails for malicious payloads.

**How to avoid:**
1. Client-side: extension whitelist check (fast rejection, good UX)
2. Server-side: magic byte validation via `file-type` package (security)
3. For ZIP-based formats (DOCX, XLSX): all start with `PK` signature -- need to inspect internal `[Content_Types].xml` to differentiate

**Warning signs:** Validation only checks extension or Content-Type. No server-side binary inspection.

### Pitfall 2: Next.js App Router Body Size Limits

**What goes wrong:** Files silently fail for uploads >1-4.5MB depending on deployment. `request.formData()` buffers the entire body into memory before the handler runs. For 100MB files, this means 100MB+ memory per concurrent upload.

**Why it happens:** Developers copy Pages Router patterns. The old `export const config = { api: { bodyParser: { sizeLimit } } }` does NOT work in App Router.

**How to avoid:**
1. Set `serverActions: { bodySizeLimit: '10mb' }` in `next.config.ts` for small file path
2. Use busboy streaming for files >10MB (never buffers entire body)
3. Use `export const runtime = 'nodejs'` on the upload route (busboy requires Node.js APIs)
4. Vercel serverless has a hard 4.5MB body limit -- self-hosted deployment needed for 100MB uploads

**Warning signs:** Upload works for small files but silently fails or returns 413 for larger files.

### Pitfall 3: Storage Abstraction Leaking Filesystem Semantics

**What goes wrong:** Code assumes local filesystem behavior that doesn't apply to cloud storage: path-based operations, file locking, atomic renames, `fs.stat()` for existence checks.

**Why it happens:** Building the abstraction around `fs` operations and adding an S3 adapter later. S3 has fundamentally different semantics (eventual consistency, no directory listing, multipart upload requirements).

**How to avoid:**
- Design around unstorage's key-value API: `setItem()`/`getItem()`/`removeItem()`
- Store file metadata in PostgreSQL, not in the storage layer
- Use UUID-based storage keys, never user-provided filenames in storage paths
- The unstorage API is already storage-agnostic -- just use it consistently

**Warning signs:** Code outside `src/lib/storage/` imports `fs` or `path`. Storage keys contain user-provided filenames.

### Pitfall 4: Drag-and-Drop Event Handling

**What goes wrong:** Browser default behavior intercepts drag-and-drop. Dropping a file on the page opens it instead of triggering the upload handler. Events bubble unexpectedly between nested drop zones.

**Why it happens:** Browsers have built-in file drop behavior. Without `e.preventDefault()` on `dragover` and `drop`, the browser opens the dropped file.

**How to avoid:**
```typescript
// Must preventDefault on BOTH dragover and drop
onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
onDrop={(e) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
  const files = e.dataTransfer.files;
  if (files.length > 0) addFiles(files);
}}
```

**Warning signs:** Dropped files open in the browser instead of triggering upload. Drag state flickers.

### Pitfall 5: next.config.ts Missing bodySizeLimit

**What goes wrong:** The default Next.js serverActions body size limit is 1MB. Without explicit configuration, even moderately sized files (2-5MB) fail silently.

**How to avoid:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  typedRoutes: true,
  serverActions: {
    bodySizeLimit: '10mb', // Required for small file uploads via formData
  },
};
```

**Current state:** The project's `next.config.ts` only has `typedRoutes: true`. This MUST be updated.

## Code Examples

Verified patterns from official sources and existing codebase:

### Existing Codebase Pattern: API Route Handler

```typescript
// Source: src/app/api/chat/route.ts (existing)
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  const body = await request.json();

  // 3. Validate
  // 4. Process
  // 5. Respond
}
```

The upload route should follow this same pattern: auth -> validate -> process -> respond.

### Existing Codebase Pattern: Drizzle Schema

```typescript
// Source: src/lib/db/schema.ts (existing)
export const agents = pgTable('agent', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type', { enum: AgentTypeEnum }).notNull(),
  card: jsonb('card').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('agent_type_idx').on(table.type),
}));

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
```

### Existing Codebase Pattern: Database Query

```typescript
// Source: src/lib/db/queries.ts (existing)
import { eq, and, desc } from 'drizzle-orm';
import { db } from './schema';

export async function createWorkflow(conversationId: string): Promise<Workflow> {
  const [workflow] = await db.insert(workflows).values({
    conversationId,
    status: 'pending',
  }).returning();
  return workflow;
}
```

### Existing Codebase Pattern: Audit Logging

```typescript
// Source: src/lib/audit.ts (existing)
import { logAudit } from '@/lib/audit';
// Fire-and-forget pattern:
logAudit({ action: 'chat_message', resource: 'conversation', resourceId: conversationId })
  .catch(() => {});
```

### busboy + App Router Integration

```typescript
// Source: Verified via dev.to article (2025-08-13) and Next.js community patterns
import { Readable } from 'stream';
import Busboy from 'busboy';

export const runtime = 'nodejs';

async function parseMultipart(request: NextRequest): Promise<{ file: Buffer; filename: string }> {
  return new Promise((resolve, reject) => {
    const nodeStream = Readable.fromWeb(request.body as ReadableStream);
    const headers = Object.fromEntries(request.headers);
    const busboy = Busboy({ headers, limits: { fileSize: 100 * 1024 * 1024 } });

    let fileBuffer: Buffer[] = [];
    let filename = '';

    busboy.on('file', (fieldname, file, info) => {
      filename = info.filename;
      file.on('data', (chunk: Buffer) => fileBuffer.push(chunk));
      file.on('end', () => busboy.emit('close'));
    });

    busboy.on('close', () => {
      resolve({ file: Buffer.concat(fileBuffer), filename });
    });

    busboy.on('error', reject);
    nodeStream.pipe(busboy);
  });
}
```

**Note:** For files up to 100MB, collecting chunks into a Buffer array and concatenating is acceptable for the initial implementation. A true streaming-to-disk approach (pipe busboy file stream directly to unstorage) is more memory-efficient but significantly more complex. Given the 100MB limit and team-scale usage (10-50 users), the Buffer approach is sufficient for Phase 7.

### Client-Side File Validation

```typescript
// Accepted file types per UPLD-03
const ACCEPTED_EXTENSIONS = [
  '.pdf', '.docx', '.doc',  // documents
  '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.css', '.html', '.json', '.yaml', '.yml', '.md', '.sql', '.sh', '.bash', '.zsh',  // code
  '.csv', '.xlsx', '.xls',  // data
];

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/x-python',
  'application/javascript',
  'application/typescript',
  // ... etc
];

function validateFileClient(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return 'Unsupported file type';
  }
  if (file.size > 100 * 1024 * 1024) {
    return 'File exceeds 100MB';
  }
  return null; // valid
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `multer` for uploads | `busboy` for App Router | Next.js 13+ (2023) | multer requires Express-style middleware; busboy works with Web API ReadableStream |
| `export const config = { api: { bodyParser } }` | `serverActions.bodySizeLimit` in next.config.ts | Next.js 14+ | Pages Router config is deprecated in App Router |
| Custom storage abstraction | unstorage with pluggable drivers | UnJS ecosystem matured (2023+) | 18+ built-in drivers, zero-dep core, battle-tested |
| `fetch` for upload | `XMLHttpRequest` for progress | Ongoing | Fetch API lacks upload progress; XHR remains the standard for progress tracking |
| Separate fileContents table | Single files table with content columns | Per user decision D-13 | Simpler schema, acceptable for team scale; revisit if performance issues arise |

**Deprecated/outdated:**
- Pages Router body parser config: Does not work in App Router
- `multer`: Incompatible with App Router Route Handlers
- `formidable`: Known App Router compatibility issues

## Open Questions

1. **Deployment target: self-hosted vs Vercel serverless?**
   - What we know: Vercel has a 4.5MB body size limit on Hobby plan, 50MB on Pro. Self-hosted has no such limit.
   - What's unclear: The actual deployment target for this project.
   - Recommendation: Build for self-hosted (POST multipart via busboy). The abstract storage layer makes future cloud migration straightforward. If Vercel is later chosen, add presigned URL upload as an alternative transport in the same endpoint.

2. **busboy progress event granularity for client-side progress bar**
   - What we know: `XMLHttpRequest.upload.onprogress` provides byte-level progress on the client side. Server-side busboy has limited progress events.
   - What's unclear: Whether server-side progress is needed for large file streaming or if client-side XHR progress is sufficient.
   - Recommendation: Use XHR progress events on the client. This is simpler and provides smooth progress updates. Server-side busboy progress tracking is unnecessary for Phase 7.

3. **Default local storage path when STORAGE_LOCAL_PATH is unset**
   - What we know: Need a sensible default that works across platforms.
   - What's unclear: User preference for project-relative vs system temp directory.
   - Recommendation: Use `./data/uploads` (project-relative, gitignored). This keeps uploads in the project directory for easy inspection during development.

## Project Constraints (from CLAUDE.md)

- **Path alias:** `@/*` maps to `./src/*` -- use in all imports
- **UI components:** shadcn/ui base with lucide icons in `src/components/ui/`. Use `cn()` from `src/lib/utils.ts` for class merging.
- **Testing:** Vitest + jsdom, test files in `tests/`, setup in `tests/setup.ts`. Run with `npx vitest run tests/path/to/file.test.ts`.
- **Streaming:** Chat API uses `text/plain; charset=utf-8` with `Transfer-Encoding: chunked`. File upload API should return JSON, not streaming text.
- **Audit logging:** `logAudit()` fire-and-forget pattern `.catch(() => {})` -- use for file upload/delete events.
- **Auth:** All `/api/*` routes protected by middleware. Each route handler also calls `auth()` explicitly.
- **Database:** Drizzle ORM + PostgreSQL. Schema in `schema.ts` with `pgTable()`. Migrations via `npm run db:generate && npm run db:push`.
- **Dev server:** Uses `--turbopack` flag. Any library incompatible with Turbopack is a blocker (note: busboy is server-only so Turbopack does not apply to it).
- **No new UI libraries:** shadcn/ui + existing components cover all Phase 7 UI needs.

## Environment Availability

> External dependencies check for Phase 7.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | unstorage, busboy | Yes | (project uses Next.js 16 which requires 18+) | -- |
| PostgreSQL | Database schema | Yes | (existing project dependency) | -- |
| npm | Package installation | Yes | -- | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Step 2.6 note:** Phase 7 has no external tool/service dependencies beyond Node.js and PostgreSQL, which are both available. The new npm packages (unstorage, busboy, nanoid, mime-types, file-type) will be installed via `npm install`.

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
| UPLD-01 | Drag-and-drop triggers file selection | unit (component) | `npx vitest run tests/components/files/file-upload-button.test.ts` | No -- Wave 0 |
| UPLD-02 | Paperclip button opens file picker | unit (component) | `npx vitest run tests/components/files/file-upload-button.test.ts` | No -- Wave 0 |
| UPLD-03 | Client-side type/size validation rejects invalid files | unit | `npx vitest run tests/hooks/use-file-upload.test.ts` | No -- Wave 0 |
| UPLD-03 | Server-side magic byte validation rejects spoofed files | unit | `npx vitest run tests/app/api/files/upload.test.ts` | No -- Wave 0 |
| UPLD-04 | 100MB limit enforced with clear error | unit | `npx vitest run tests/app/api/files/upload.test.ts` | No -- Wave 0 |
| UPLD-05 | Progress updates during upload | unit | `npx vitest run tests/hooks/use-file-upload.test.ts` | No -- Wave 0 |
| UPLD-06 | File chip renders filename, icon, size, close button | unit (component) | `npx vitest run tests/components/files/file-chip.test.ts` | No -- Wave 0 |
| UPLD-07 | Storage abstraction stores and retrieves files | unit | `npx vitest run tests/lib/storage/provider.test.ts` | No -- Wave 0 |
| UPLD-07 | Storage driver selection via env var | unit | `npx vitest run tests/lib/storage/provider.test.ts` | No -- Wave 0 |
| UPLD-08 | Large file upload uses busboy streaming | integration | `npx vitest run tests/app/api/files/upload.test.ts` | No -- Wave 0 |
| DB-01 | files table schema correct (columns, types, indexes) | unit | `npx vitest run tests/lib/db/schema-files.test.ts` | No -- Wave 0 |
| DB-01 | File CRUD operations (create, read, update, delete) | unit | `npx vitest run tests/lib/db/queries-files.test.ts` | No -- Wave 0 |
| DB-02 | conversationFiles junction table with messageId | unit | `npx vitest run tests/lib/db/schema-files.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/path/to/file.test.ts` (targeted test for the task)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/storage/provider.test.ts` -- covers UPLD-07 (storage abstraction)
- [ ] `tests/lib/db/schema-files.test.ts` -- covers DB-01, DB-02 (schema validation)
- [ ] `tests/lib/db/queries-files.test.ts` -- covers DB-01 (CRUD operations)
- [ ] `tests/hooks/use-file-upload.test.ts` -- covers UPLD-01, UPLD-02, UPLD-03, UPLD-05
- [ ] `tests/components/files/file-chip.test.ts` -- covers UPLD-06
- [ ] `tests/components/files/file-upload-button.test.ts` -- covers UPLD-01, UPLD-02
- [ ] `tests/app/api/files/upload.test.ts` -- covers UPLD-03, UPLD-04, UPLD-08
- [ ] `tests/lib/storage/` directory does not exist yet
- [ ] `tests/components/files/` directory does not exist yet
- [ ] `tests/app/api/files/` directory does not exist yet

**Existing test infrastructure:** Vitest configured, jsdom environment, setup file with env var mocks. Existing test directories for `tests/lib/db/` (schema and queries tests), `tests/components/`, `tests/app/`. No new framework installation needed.

## Sources

### Primary (HIGH confidence)
- unstorage official docs -- https://unstorage.unjs.io/ (verified 2026-03-26, all 18 drivers confirmed)
- unstorage drivers -- https://unstorage.unjs.io/drivers/fs and /drivers/s3 (verified 2026-03-26)
- busboy npm -- https://www.npmjs.com/package/busboy (verified 2026-03-26, version 1.6.0)
- npm registry -- all package versions verified via `npm view` on 2026-03-26
- Existing codebase -- direct inspection of schema.ts, chat-input.tsx, route.ts, queries.ts, audit.ts, types/index.ts, next.config.ts, package.json
- Next.js App Router body size limits -- https://github.com/vercel/next.js/issues/34213
- OWASP File Upload Testing Guide -- https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/10-Business_Logic_Testing/09-Test_Upload_of_Malicious_Files

### Secondary (MEDIUM confidence)
- busboy + Next.js App Router integration -- https://dev.to/grimshinigami/how-to-handle-large-filefiles-streams-in-nextjs-13-using-busboymulter-25gb (2025-08-13)
- Next.js serverActions bodySizeLimit -- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions (official docs)
- XHR upload progress vs Fetch API -- well-documented browser API limitation

### Tertiary (LOW confidence)
- None -- all Phase 7 findings are verified against primary sources or existing codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all package versions verified via npm registry; unstorage/busboy APIs verified via official docs and community examples; ESM compatibility confirmed
- Architecture: HIGH -- patterns follow existing codebase conventions verified by direct code inspection; busboy+App Router integration verified via community guide
- Pitfalls: HIGH -- sources include official GitHub issues, OWASP guidelines, and verified codebase patterns

**Research date:** 2026-03-26
**Valid until:** 30 days (stable domain -- file upload patterns and library APIs are mature)
