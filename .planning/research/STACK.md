# Stack Research: v1.2 File Processing Additions

**Domain:** Multi-type file upload, content extraction, format conversion, preview, and management
**Researched:** 2026-03-26
**Confidence:** HIGH (npm versions verified directly, official docs consulted, patterns validated against Next.js App Router constraints)

## Context

This document covers stack additions needed exclusively for the v1.2 milestone: multi-type file upload, processing, and management. All existing stack decisions from v1.0/v1.1 remain unchanged -- this document specifies only what to ADD.

Existing stack: Next.js 16.2.1, TypeScript 5.8, PostgreSQL + Drizzle ORM, shadcn/ui, Zod, Auth.js v5.

Existing file capabilities: `FileProcessingSkills` class with `file-read` and `file-list` skills (local filesystem only, raw text only). `file-agent` agent card references these skills. No upload, no content extraction, no format conversion, no cloud storage.

---

## Recommended Stack Additions

### File Upload Transport

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Native `request.formData()`** | Web API (built-in) | Small file uploads (<10MB) | Zero dependencies. Next.js App Router Route Handlers support the Web API `Request.formData()`. Sufficient for most document/code/data files under 10MB. |
| **busboy** | 1.6.0 | Streaming large file uploads (10-100MB) | Only streaming multipart parser that works with Next.js App Router Route Handlers via `ReadableStream`. `multer` requires Express-style middleware (incompatible). `formidable` has compatibility issues with App Router. busboy never buffers entire file into memory -- critical for 100MB uploads. |

**Decision: Use `request.formData()` for files under 10MB, `busboy` for files 10-100MB.** Implement an abstraction layer (`FileUploader` interface) so the upload transport is swappable. Both write to the abstract storage layer (see below).

**Why NOT UploadThing:** UploadThing is a managed SaaS ($10/mo for 100GB). Next-Mind needs self-hosted control and an abstract storage layer. UploadThing's v7 locks files to their infrastructure. The PROJECT.md explicitly states "abstract storage layer (local/cloud switchable)" as a v1.2 deliverable, and "concrete cloud provider integration" is deferred to a future milestone. UploadThing would add a SaaS dependency that contradicts this goal.

**Why NOT TUS protocol:** TUS requires running a separate TUS server process (tus-node-server). Adds operational complexity for a mid-size team tool. Resumable uploads are valuable but overkill for 100MB max file size. Can revisit if requirements grow.

**next.config.ts change required:**
```typescript
const nextConfig: NextConfig = {
  typedRoutes: true,
  serverActions: {
    bodySizeLimit: '10mb', // Default is 1MB -- raise for small file uploads
  },
};
```

### Abstract Storage Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **unstorage** | 1.17.4 | Abstract key-value storage with pluggable drivers | Built by UnJS (same ecosystem as Nitro/Nuxt). Provides unified async API (`get`, `set`, `has`, `delete`, `getMeta`, `setMeta`, `keys`) across all drivers. Officially supports: Filesystem, S3 (any S3-compatible including Cloudflare R2, MinIO), Redis, Memory, MongoDB, SQL, Azure, Cloudflare KV/R2, and more. Multi-driver mounting lets you use local filesystem for development and S3 for production with zero code changes. Zero-dependency core. |

**Driver configuration:**
```typescript
// Development: local filesystem
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';

const storage = createStorage({
  driver: fsDriver({ base: './uploads' }),
});

// Production: S3-compatible (e.g., Cloudflare R2, MinIO, AWS S3)
import s3Driver from 'unstorage/drivers/s3';

const storage = createStorage({
  driver: s3Driver({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    endpoint: process.env.S3_ENDPOINT,    // e.g., https://<uid>.r2.cloudflarestorage.com
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,        // 'auto' for R2
  }),
});
```

**Why unstorage over custom abstraction:** Writing a custom storage abstraction is non-trivial (streaming, multipart upload to S3, presigned URLs, metadata). unstorage handles all of this. The driver model maps directly to the PROJECT.md requirement of "local/cloud switchable." Future cloud integration (deferred milestone) just means adding env vars and switching the driver.

**Why NOT raw AWS SDK:** `@aws-sdk/client-s3` (3.1017.0) is powerful but adds ~2MB to bundle and requires writing S3-specific code. unstorage's S3 driver uses `fetch` internally (lightweight) and provides the same API as filesystem. No S3-specific code in application logic.

**File path convention within storage:** Use keys structured as `{userId}/{fileId}/{filename}`. File IDs generated with `nanoid`. This enables per-user isolation and easy migration between drivers.

### File Identification and Metadata

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **nanoid** | 5.1.7 | Generate short, URL-safe unique file IDs | Already a common pattern. Non-sequential (security benefit). 21-char default is sufficient. No need for UUIDs (too long for URLs/filenames). |
| **mime-types** | 3.0.2 | Map file extensions to MIME types and vice versa | Standard Node.js library. Needed for content-type headers, file validation, and preview rendering decisions. |
| **zod** | 4.3.6 (already installed) | File metadata validation | Already in the project. Use for validating upload input schemas, file type constraints, size limits. No new dependency. |

### Content Extraction

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **unpdf** | 1.4.0 | PDF text extraction | Built by UnJS (same ecosystem as unstorage). Wraps PDF.js with a serverless-friendly build. Extracts text and images from PDFs. Works in Node.js, Deno, Bun. Lightweight, modern, actively maintained. Cleaner API than raw `pdfjs-dist`. |
| **mammoth** | 1.12.0 | DOCX to HTML conversion | Most popular `.docx` to HTML converter. Lightweight (~50KB). Handles bold, italic, tables, lists, headings. Configurable via style map. Works in Node.js and browser. |
| **turndown** | 7.2.2 | HTML to Markdown conversion | The de facto standard for HTML-to-Markdown in JavaScript. Needed because mammoth outputs HTML, but the project needs Markdown for LLM consumption and `react-markdown` rendering. Plugin architecture supports GFM tables. |
| **@types/turndown** | 5.0.6 | TypeScript types for turndown | Type definitions for turndown. |
| **papaparse** | 5.5.3 | CSV parsing and generation | Industry standard for CSV in JavaScript. Streaming support for large files. Auto-detects delimiters. Header row mapping. ~30KB. |
| **exceljs** | 4.4.0 | Excel (.xlsx) reading and writing | MIT-licensed (fully open source). OOP API with streaming support. Reads `.xlsx` and `.xls` formats. Converts sheets to JSON arrays. Better for structured data extraction than SheetJS community edition. |

**Content extraction pipeline:**

```
PDF  -> unpdf.extractText() -> raw text string
DOCX -> mammoth.convertToHtml() -> turndown service -> Markdown
CSV  -> PapaParse parse (streaming) -> JSON array of row objects
XLSX -> exceljs.workbook.xlsx.readFile() -> sheet to JSON -> structured data
Code -> fs.readFile() (already supported by file-read skill) -> raw text
```

**Why unpdf over pdf-parse:** pdf-parse (2.4.5) is popular but older and relies on pdf.js v2.x internally. unpdf uses a modern, serverless-optimized build of PDF.js and is part of the UnJS ecosystem we're already adopting for storage. pdf-parse has known issues with certain PDF encodings and has a larger dependency footprint.

**Why unpdf over pdfjs-dist (5.5.207):** pdfjs-dist is Mozilla's raw PDF.js distribution. Powerful but low-level -- requires ~50 lines of boilerplate for basic text extraction (document loading, page iteration, text content items). unpdf wraps this into a clean `extractText()` call. If we ever need PDF rendering (preview), pdfjs-dist can be added later for that specific use case.

**Why mammoth + turndown over alternatives:**
- **mammoth** outputs HTML, not Markdown. This is actually a strength -- HTML is a richer intermediate representation.
- **turndown** converts HTML to clean Markdown with GFM support.
- This two-step pipeline (DOCX -> HTML -> Markdown) gives better results than direct DOCX-to-Markdown tools.
- Alternative `docx2md` exists but is less maintained and has worse formatting preservation.
- **Pandoc** (CLI tool) would be more powerful but requires a system binary dependency -- not suitable for serverless/edge deployment.

**Why exceljs over SheetJS (xlsx):**
- SheetJS community edition (Apache 2.0) is moving features behind a commercial Pro license. The free tier has limited streaming and no styling support.
- exceljs is MIT-licensed with no feature gating. Streaming support is excellent.
- For this project's use case (reading Excel data as structured JSON), exceljs is more than sufficient.
- Both have similar download volumes (~4-5M/week). API quality is comparable.

**Why NOT Unstructured.io:** The v1.0 research listed Unstructured.io for document parsing. It supports 64+ file types with OCR. However: (1) it's a Python service requiring a separate server process or Docker container, (2) adds significant operational complexity for a mid-size team tool, (3) the v1.2 scope is limited to 4 specific file types (PDF, DOCX, code, CSV/Excel) which are all handled by the JavaScript libraries above, (4) image/scan OCR is explicitly out of scope per PROJECT.md. Unstructured.io may be reconsidered if future milestones add image processing or wider format support.

### Database Schema Additions

No new database libraries needed. Use existing **Drizzle ORM** (0.45.1) and **PostgreSQL**. New tables required:

| Table | Purpose |
|-------|---------|
| `files` | File metadata (id, userId, originalName, storedKey, mimeType, size, status, extractedText, extractedData, category, createdAt, updatedAt) |
| `conversation_files` | Junction table linking files to conversations (conversationId, fileId) |

These will be added to the existing `schema.ts` using Drizzle's `pgTable`.

### UI Components

| Technology | Purpose | Notes |
|----------|---------|-------|
| **shadcn/ui** (existing) | File upload dropzone, file list, preview panels | Use existing shadcn/ui base. Build custom components: `FileDropzone`, `FileList`, `FilePreview`. |
| **react-markdown** (existing, 10.1.0) | Render extracted Markdown content | Already in the project for chat messages. Reuse for file content preview. |
| **react-syntax-highlighter** (existing, 16.1.1) | Code file preview with syntax highlighting | Already in the project. Reuse for `.ts`, `.py`, `.js`, etc. preview. |
| **@base-ui/react** (existing, 1.3.0) | Dialog, tabs for file management UI | Already in the project. |

No new UI libraries needed. The existing shadcn/ui + markdown + syntax highlighting stack covers all preview needs.

---

## Installation

```bash
# Abstract storage layer
npm install unstorage

# File upload (streaming for large files)
npm install busboy

# File identification
npm install nanoid mime-types

# PDF text extraction
npm install unpdf

# DOCX -> HTML -> Markdown pipeline
npm install mammoth turndown
npm install -D @types/turndown

# CSV and Excel parsing
npm install papaparse exceljs
npm install -D @types/papaparse
```

**No new dev dependencies beyond types.** Total new runtime dependencies: 8 packages.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| unstorage | Custom storage abstraction | If you need fine-grained control over multipart S3 uploads, presigned URL generation, or custom retry logic that unstorage doesn't expose. |
| unstorage | MinIO JavaScript SDK directly | If you commit to MinIO as the only storage backend and want MinIO-specific features (versioning, lifecycle policies). |
| busboy + request.formData() | UploadThing v7 | If you want zero-upload-infrastructure code and are OK with a $10/mo SaaS dependency. Best for quick MVP without storage abstraction needs. |
| busboy | TUS protocol (tus-node-server) | If files exceed 100MB or users have unreliable connections requiring resumable uploads. Adds a separate server process. |
| mammoth + turndown | Pandoc (via CLI wrapper) | If you need lossless formatting preservation (complex tables, nested styles, images embedded in DOCX). Requires system binary. |
| exceljs | SheetJS (xlsx) community edition | If you need to read obscure spreadsheet formats (XLSB, XLSM macros, ODS) that exceljs doesn't support. |
| unpdf | pdf-parse | If you encounter PDFs that unpdf cannot handle (rare encoding issues). pdf-parse has a larger community for troubleshooting. |
| unpdf | pdfjs-dist directly | If you need PDF rendering (visual preview in browser) rather than just text extraction. pdfjs-dist has a canvas renderer. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **multer** | Requires Express-style `req`/`res` objects. Incompatible with Next.js App Router Route Handlers which use Web API `Request`/`Response`. No workaround without significant adaptation layer. | busboy (native streaming) or `request.formData()` |
| **formidable** | Has known compatibility issues with Next.js App Router. GitHub issues (#50147, #48164) show it fails silently or throws in certain App Router versions. | busboy |
| **UploadThing** | Managed SaaS dependency ($10/mo). Locks files to their infrastructure. Contradicts the abstract storage layer requirement. Future migration would be painful. | busboy + unstorage |
| **TUS protocol** | Requires running a separate TUS server process (tus-node-server). Over-engineered for 100MB max file size. Adds operational complexity disproportionate to the benefit. | busboy streaming (sufficient for 100MB) |
| **SheetJS Pro** | Commercial license with feature gating. Community edition has limited functionality. | exceljs (MIT, no feature gating) |
| **Unstructured.io** | Python service requiring Docker. Overkill for 4 file types. OCR is out of scope for v1.2. | unpdf + mammoth + papaparse + exceljs |
| **next/image for PDF preview** | Next.js Image Optimization doesn't handle PDFs. | Text-based preview (Markdown rendering) or dedicated pdfjs-dist if visual preview needed later |
| **Server Actions for large file uploads** | 1MB default limit. Even with `bodySizeLimit` raised, Server Actions buffer entire request body. Not suitable for streaming 100MB files. | Route Handlers with busboy for large files; Server Actions only for metadata operations |

---

## Stack Patterns by Variant

**If using local filesystem storage (development):**
```typescript
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';

const storage = createStorage({
  driver: fsDriver({ base: './data/uploads' }),
});
```
- Store files in `./data/uploads/` directory (gitignored)
- No external service dependencies
- Files persist across dev server restarts

**If using S3-compatible storage (production):**
```typescript
import { createStorage } from 'unstorage';
import s3Driver from 'unstorage/drivers/s3';

const storage = createStorage({
  driver: s3Driver({
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
    endpoint: process.env.S3_ENDPOINT!,
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION || 'auto',
  }),
});
```
- Works with AWS S3, Cloudflare R2, MinIO, Wasabi, DigitalOcean Spaces
- Environment variable switch -- no code changes between providers
- R2 recommended: no egress fees, S3-compatible API

**If upload size is under 10MB (documents, code files, small datasets):**
- Use `request.formData()` in Route Handler
- Simpler code, no streaming needed
- Entire file fits in memory

**If upload size is 10-100MB (large PDFs, big Excel files):**
- Use busboy streaming parser in Route Handler
- Stream directly to storage layer (no temp file)
- Pipe busboy file stream to unstorage `set()` or writable stream

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| unstorage 1.17.4 | Node.js 18+ | No issues with Next.js 16 / Node 20+ |
| busboy 1.6.0 | Node.js 18+ | Pure Node.js, no browser support (which is correct for server-side) |
| unpdf 1.4.0 | Node.js 18+, browser | Serverless-optimized PDF.js build |
| mammoth 1.12.0 | Node.js 16+, browser | Pure JS, no native dependencies |
| turndown 7.2.2 | Node.js, browser | Pure JS |
| papaparse 5.5.3 | Node.js, browser | Pure JS, supports Web Workers |
| exceljs 4.4.0 | Node.js 16+ | Uses Node.js streams internally |
| nanoid 5.1.7 | Node.js 18+, browser | ESM-only in v5 (matches Next.js) |
| mime-types 3.0.2 | Node.js, browser | Pure JS |

**ESM compatibility:** All recommended packages support ESM (required by Next.js 16). `exceljs` is CJS but works via Node.js interop. No ESM-only packages that would cause issues.

---

## Integration Points with Existing Code

### Skills System Integration
The existing `FileProcessingSkills` class (`src/skills/file-processing.ts`) has `file-read` and `file-list` skills using raw `fs` operations. These should be refactored to use the `unstorage` abstraction instead of `fs` directly. New skills to add:

| Skill ID | Name | Purpose |
|----------|------|---------|
| `file-extract-text` | Extract Text | Extract text content from PDF, DOCX, code files |
| `file-extract-data` | Extract Data | Parse CSV/Excel into structured JSON |
| `file-convert` | Convert Format | PDF/DOCX to Markdown, CSV to JSON |
| `file-upload` | Upload File | Upload file via storage abstraction |

### File Agent Integration
The existing `fileAgentCard` (`src/agents/file-agent.ts`) references `file-read` and `file-list`. Update `skillIds` to include new extraction/conversion skills and update the `systemPrompt` to describe the new capabilities.

### Database Integration
New tables (`files`, `conversation_files`) follow the existing Drizzle ORM patterns in `src/lib/db/schema.ts`. Use `uuid` for primary keys (consistent with agents/workflows/tasks tables), `timestamp` for dates, `jsonb` for extracted data.

### Chat Integration
Files uploaded in a conversation context should be linked via `conversation_files`. When a user references a file in chat, the message content can include the extracted text (for LLM context) and a file reference (for UI rendering).

---

## Sources

- **unstorage drivers documentation** - https://unstorage.unjs.io/drivers (verified 2026-03-26, lists all 18 built-in drivers)
- **unstorage S3 driver** - https://unstorage.unjs.io/drivers/s3 (verified 2026-03-26, S3-compatible providers confirmed)
- **unpdf GitHub** - https://github.com/unjs/unpdf (verified 2026-03-26)
- **mammoth npm** - https://www.npmjs.com/package/mammoth (verified 2026-03-26)
- **mammoth outputs HTML not Markdown** - GitHub README confirms `convertToHtml()` is primary API (MEDIUM confidence)
- **turndown GitHub** - https://github.com/mixmark-io/turndown (verified 2026-03-26)
- **papaparse npm** - https://www.npmjs.com/package/papaparse (verified 2026-03-26)
- **exceljs npm** - https://www.npmjs.com/package/exceljs (verified 2026-03-26)
- **SheetJS license** - https://docs.sheetjs.com/docs/miscellany/license/ (Apache 2.0 for CE, features moving to Pro)
- **busboy npm** - https://www.npmjs.com/package/busboy (verified 2026-03-26)
- **busboy + Next.js streaming** - https://dev.to/grimshinigami/how-to-handle-large-filefiles-streams-in-nextjs-13-using-busboymulter-25gb (practical guide, 2025)
- **Next.js serverActions bodySizeLimit** - https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions (official docs, verified 2026-03-26)
- **request.formData() memory limitation** - https://github.com/vercel/next.js/discussions/86985 (official GitHub discussion)
- **UploadThing v7 docs** - https://docs.uploadthing.com/v7 (verified 2026-03-26, confirmed SaaS model)
- **npm versions** - All versions verified directly via `npm view` on 2026-03-26
- **pdfjs-dist** - https://www.npmjs.com/package/pdfjs-dist (version 5.5.207, verified 2026-03-26)
- **pdf-parse** - https://www.npmjs.com/package/pdf-parse (version 2.4.5, verified 2026-03-26)

---
*Stack research for: v1.2 File Processing (Next-Mind)*
*Researched: 2026-03-26*
