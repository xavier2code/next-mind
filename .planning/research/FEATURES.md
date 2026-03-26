# Feature Research

**Domain:** Multi-Type File Upload, Processing, and Management for AI Chat Platform
**Researched:** 2026-03-26
**Confidence:** MEDIUM (file processing libraries well-documented; UX patterns from competitor observation; some integration specifics need prototyping)

---

## v1.2 File Processing Features

This section covers NEW features for the v1.2 milestone: adding multi-type file upload, content extraction, format conversion, smart classification, preview, content editing, file management, and chat integration to the existing Next.js 16 AI Agent collaboration platform.

### Executive Summary

Key findings from file processing research:

- **Four file categories map cleanly to extraction libraries** -- PDF (unpdf), Word (mammoth), code files (native fs), and data files (SheetJS + PapaParse). Each category has a clear, well-maintained library choice. No single library handles all four.
- **Converting all file types to a canonical format (Markdown) is the standard pattern** for AI chat platforms. ChatGPT, Claude, and similar tools extract text from uploads and present it as context to the LLM. Markdown is the natural canonical format because it preserves structure and renders well.
- **File upload UX in AI chat is highly standardized** -- drag-and-drop zone, attachment button (+/paperclip icon), file preview cards above input, progress indicators. Deviation from these patterns creates friction.
- **Server-side processing is required for content extraction** but upload can be direct-to-storage for large files. For a 100MB max with four focused file types, server-side streaming upload is practical and simpler than presigned URLs. Presigned URLs become worth the complexity at 500MB+.
- **The existing Skills system is the right integration point** for file processing. File extraction/conversion can be exposed as skills, making them available to both direct user interaction and agent workflows. The existing `FileProcessingSkills` class already has `file-read` and `file-list` skills.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any AI chat platform with file support. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **File Upload via Drag-and-Drop** | Every major AI chat platform (ChatGPT, Claude, Gemini) supports dropping files into the chat area. Users expect this without instruction. | MEDIUM | Need drag-and-drop zone in ChatInput component. Must handle drop events, prevent default browser behavior, show visual feedback during drag-over. |
| **File Upload via Button** | Not all users know drag-and-drop. A "+" or paperclip button next to the chat input is the universal fallback. | LOW | Simple file input trigger. Opens native OS file picker. |
| **File Type Validation** | Users expect the system to accept the file types it claims to support and reject others with a clear message. | LOW | Validate on both client (file extension, MIME type) and server (magic number check). Use `file-type` npm for server-side magic number detection. |
| **File Size Limit (100MB)** | Users expect some limit and need to know what it is upfront. Error on exceed. | LOW | Check `file.size` client-side before upload. Re-validate server-side. Show clear error message with the limit stated. |
| **Upload Progress Indicator** | For any file upload, users need visual feedback that something is happening, especially for larger files. | MEDIUM | Use `XMLHttpRequest` or `fetch` with `ReadableStream` for progress tracking. Show percentage or indeterminate progress bar. |
| **File Preview Cards** | After upload, users expect to see what they attached before sending. A card showing filename, type icon, and size. | MEDIUM | Small component rendered above chat input. Each card shows file metadata. Option to remove before sending. |
| **Content Extraction (Text)** | The core value of file upload in an AI chat is that the AI can "read" the file. Users expect text content to be extracted automatically. | HIGH | Different per file type: PDF needs `unpdf`, Word needs `mammoth`, code is native `fs.readFile`, CSV/Excel needs `SheetJS`. Each has different extraction quality characteristics. |
| **Chat Integration** | Users expect to reference uploaded files in conversation and get AI responses that demonstrate understanding of file content. | HIGH | The chat API must accept file references alongside messages. Extracted content must be injected into the LLM context. This is the most architecturally significant feature. |
| **File List / Management** | Users expect to see previously uploaded files, search/filter them, and delete ones they no longer need. | MEDIUM | Requires a `files` database table, a management UI (likely in sidebar), and CRUD API endpoints. |

### Differentiators (Competitive Advantage)

Features that set Next-Mind apart from generic AI chat tools. Not required, but valuable given the platform's team collaboration focus.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Smart Classification** | Automatically categorize uploaded files (document, code, data, configuration) based on content analysis, not just extension. | MEDIUM | Use `file-type` for binary type detection + content-based heuristics (e.g., detect CSV delimiter, detect programming language). Store classification in DB. Enables filtering and organization. |
| **Format Conversion to Markdown** | Convert PDF and Word documents to clean Markdown for display and editing. This preserves structure (headings, lists, tables) while being editable. | HIGH | Mammoth converts docx to HTML which can be piped through `turndown` for Markdown. PDF to Markdown is harder -- `unpdf` extracts raw text, but structure preservation requires additional processing (e.g., detecting headings by font size from pdfjs text layer). |
| **Content Editing** | Allow users to edit the extracted content before or after sending to the AI. Useful for correcting OCR errors, removing sensitive sections, or refining context. | HIGH | Requires a Markdown editor component. `@uiw/react-md-editor` is the simplest option -- provides split view editing/preview. MDXEditor is richer but heavier. The edited content replaces the extracted text in the LLM context. |
| **File-as-Skill Integration** | Expose file processing capabilities as Skills in the existing skills system, making them available to agent workflows. | MEDIUM | The existing `FileProcessingSkills` class has `file-read` and `file-list`. Add `file-extract`, `file-convert`, `file-classify` skills. These can be used by agents in multi-agent workflows. |
| **Multi-File Context** | Allow uploading multiple files and having the AI reason across them (e.g., "compare these two PDFs"). | MEDIUM | The chat API must handle an array of file references. Content from all files is concatenated into the LLM context with clear delimiters. Token budget management becomes important. |
| **File Version Awareness** | Track when a file was uploaded and by whom. Show this in the file management UI. | LOW | Already natural with the `files` DB table (userId, createdAt). Just needs UI display. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Explicitly avoid these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **OCR / Image-based PDF Processing** | Some PDFs are scanned documents that need OCR to extract text. | OCR is a separate domain with heavy dependencies (Tesseract.js is 20MB+). It's slow, inaccurate for CJK characters, and a scope creep from the four defined file types. | Defer to future milestone. For v1.2, document this limitation and show a clear error message for image-only PDFs (detectable via text extraction returning empty). |
| **Presigned URL / Direct-to-Cloud Upload** | Better performance for large files; server never touches bytes. | Adds significant complexity (cloud storage configuration, CORS, signed URL generation, upload callback). For 100MB max with four file types where server-side extraction is required anyway, the server must process the file. Presigned URLs only help if extraction happens in a background worker, which is premature for v1.2. | Server-side streaming upload with `Busboy` or Next.js native `request.formData()`. Revisit presigned URLs when file sizes exceed 500MB or cloud storage is integrated. |
| **Real-time Collaborative File Editing** | Multiple team members editing the same extracted content simultaneously. | Requires CRDTs (Yjs) or OT, WebSocket infrastructure for edits, conflict resolution. Massive scope increase. The platform already supports multi-user through conversations, not real-time co-editing. | Single-user content editing in v1.2. If collaborative editing is needed later, it becomes its own milestone. |
| **File Versioning / Diff History** | Track changes to file content over time, show diffs. | Requires storing multiple versions per file, diff computation, significantly more complex DB schema. Not a core need for an AI chat platform -- users re-upload if they have a new version. | Store only the latest extracted content. If the same file is re-uploaded, update the record. Version history is a future feature. |
| **In-Browser PDF Rendering / Viewer** | Show PDFs visually in the chat, not just extracted text. | Requires `react-pdf` or `pdfjs-dist` on the client side, which adds significant bundle size. The platform's value is AI understanding of file content, not file viewing. Users have PDF viewers. | Show extracted text/markdown content. For PDFs where visual layout matters, note this as a limitation. If PDF viewing is added later, use an iframe with native browser PDF viewer as the simplest approach. |

---

## Feature Dependencies

```
[File Upload (Drag-and-Drop + Button)]
    └──requires──> [File Type Validation]
                       └──requires──> [file-type library + MIME checks]
    └──requires──> [Storage Layer (DB table + disk/cloud)]

[Content Extraction]
    └──requires──> [File Upload] (file must be stored first)
    └──requires──> [PDF extraction: unpdf]
    └──requires──> [Word extraction: mammoth]
    └──requires──> [Code extraction: native fs]
    └──requires──> [Data extraction: SheetJS + PapaParse]

[Format Conversion (to Markdown)]
    └──requires──> [Content Extraction] (need raw text first)
    └──requires──> [mammoth for docx->HTML->Markdown]
    └──requires──> [turndown for HTML->Markdown conversion]
    └──enhances──> [Content Editing] (Markdown is editable)

[Smart Classification]
    └──requires──> [Content Extraction] (classify based on content, not just extension)
    └──enhances──> [File Management] (filter by category)

[Content Editing]
    └──requires──> [Format Conversion] (edit Markdown, not raw text)
    └──requires──> [Markdown editor component]

[File Preview]
    └──requires──> [Content Extraction] or [Format Conversion] (something to preview)
    └──enhances──> [Chat Integration] (preview before sending to AI)

[File Management (List/Search/Delete)]
    └──requires──> [Storage Layer] (DB table for file metadata)
    └──independent of──> [Content Extraction] (can manage files without extracting)

[Chat Integration]
    └──requires──> [File Upload] (files must be attached)
    └──requires──> [Content Extraction] (content must be available)
    └──requires──> [Chat API modification] (accept file references in messages)
    └──enhances──> [Multi-File Context] (reference multiple files)
```

### Dependency Notes

- **Content Extraction is the central dependency** -- almost everything else builds on it. It must be implemented first and designed for extensibility (strategy pattern per file type).
- **Format Conversion is optional for MVP** -- raw text extraction is sufficient for chat integration. Markdown conversion is needed for content editing and better previews, but can be added incrementally.
- **File Management is independent of extraction** -- the file metadata table and CRUD operations can be built in parallel with extraction logic.
- **Chat Integration is the user-facing culmination** -- it ties upload + extraction + the existing chat API together. Build it last, after extraction is working.
- **Smart Classification can be lightweight at first** -- start with extension-based + MIME type classification. Content-based classification (e.g., detecting CSV delimiter, programming language) can be added later.

---

## MVP Definition

### Launch With (v1.2 Core)

Minimum viable file processing -- what users need to upload a file and have the AI understand it.

- [ ] **File Upload (Drag-and-Drop + Button)** -- Users can upload PDF, Word, code, and CSV/Excel files via drag-and-drop or button click in the chat input area.
- [ ] **File Type & Size Validation** -- Client and server-side validation. Accept only supported types. Reject files over 100MB with clear error.
- [ ] **Upload Progress Indicator** -- Visual feedback during upload (progress bar or spinner).
- [ ] **File Preview Cards** -- Show uploaded files as cards above chat input before sending. Allow removal.
- [ ] **Content Extraction** -- Extract text from all four file types (PDF, Word, code, CSV/Excel). Store extracted content in database.
- [ ] **Files Database Table** -- New `files` table with metadata (id, userId, filename, mimeType, size, fileType category, storagePath, extractedContent, status).
- [ ] **Chat Integration** -- When a message includes file references, inject extracted content into LLM context. AI can reason about file content.
- [ ] **Basic File Management** -- List uploaded files, delete files. Accessible from sidebar or dedicated page.

### Add After Validation (v1.2.x)

Features to add once core upload + extraction + chat integration is working.

- [ ] **Format Conversion to Markdown** -- Convert PDF and Word to clean Markdown for display. Requires mammoth (docx->HTML) + turndown (HTML->Markdown). Trigger: users want to see nicely formatted file content, not raw text.
- [ ] **Content Editing** -- Markdown editor for extracted content. Users can correct, trim, or annotate before sending to AI. Trigger: users report needing to fix extraction artifacts or remove sensitive sections.
- [ ] **Smart Classification** -- Content-based file categorization beyond extension. Detect programming language for code files, CSV delimiter, document structure. Trigger: file list becomes cluttered and users need filtering.
- [ ] **Multi-File Context** -- Upload and reference multiple files in a single message. Trigger: users ask "compare these two files" and the system cannot handle it.
- [ ] **File-as-Skill Integration** -- Expose file extraction/conversion as Skills for agent workflows. Trigger: multi-agent workflows need to process files as part of tasks.
- [ ] **File Search** -- Full-text search across extracted file content. Trigger: users have many files and need to find specific ones.

### Future Consideration (v2+)

Features to defer until the file processing system is validated and stable.

- [ ] **OCR / Image-based PDF Processing** -- Tesseract.js integration for scanned documents. Heavy dependency, CJK accuracy concerns.
- [ ] **In-Browser PDF Viewer** -- Visual PDF rendering via `react-pdf` or iframe. Users can view PDF layout, not just text.
- [ ] **Presigned URL Uploads** -- Direct-to-cloud upload for better performance. Requires cloud storage integration.
- [ ] **File Versioning** -- Track multiple versions of the same file. Diff view between versions.
- [ ] **Real-time Collaborative Editing** -- Multiple users editing extracted content simultaneously. Requires CRDT infrastructure.
- [ ] **Excel Formula Evaluation** -- Parse and evaluate Excel formulas, not just read cell values.
- [ ] **PPTX Support** -- PowerPoint file extraction and conversion. Different structure from docx/pdf.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| File Upload (Drag-and-Drop + Button) | HIGH | MEDIUM | P1 |
| File Type & Size Validation | HIGH | LOW | P1 |
| Upload Progress Indicator | HIGH | MEDIUM | P1 |
| File Preview Cards | HIGH | MEDIUM | P1 |
| Content Extraction (all 4 types) | HIGH | HIGH | P1 |
| Files Database Table | HIGH | LOW | P1 |
| Chat Integration (file references) | HIGH | HIGH | P1 |
| Basic File Management (list/delete) | MEDIUM | MEDIUM | P1 |
| Format Conversion to Markdown | MEDIUM | HIGH | P2 |
| Content Editing | MEDIUM | HIGH | P2 |
| Smart Classification | MEDIUM | MEDIUM | P2 |
| Multi-File Context | MEDIUM | MEDIUM | P2 |
| File-as-Skill Integration | MEDIUM | MEDIUM | P2 |
| File Search | LOW | MEDIUM | P2 |
| In-Browser PDF Viewer | LOW | HIGH | P3 |
| OCR Processing | LOW | HIGH | P3 |
| Presigned URL Uploads | LOW | HIGH | P3 |
| File Versioning | LOW | HIGH | P3 |
| Collaborative Editing | LOW | HIGH | P3 |
| PPTX Support | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.2 launch
- P2: Should have, add once core is validated (v1.2.x)
- P3: Nice to have, future consideration (v2+)

---

## Competitor Feature Analysis

| Feature | ChatGPT | Claude | Next-Mind (Planned) |
|---------|---------|--------|---------------------|
| **File upload methods** | Drag-and-drop, + button | Drag-and-drop, paperclip button | Drag-and-drop, + button (same pattern) |
| **File preview before send** | File card with thumbnail | File card with type icon | File card with type icon + size |
| **Files per message** | Multiple | Up to 20 per session | Start with 1, extend to multiple (P2) |
| **Max file size** | 512MB (varies by plan) | 30MB per file | 100MB (sufficient for documents/code/data) |
| **PDF text extraction** | Excellent (GPT-4o vision) | Good (native extraction) | Good (unpdf/pdfjs quality) |
| **Word (.docx) extraction** | Good | Good | Good (mammoth -- some fragility on complex docs) |
| **CSV/Excel analysis** | Excellent (Code Interpreter) | Good (native CSV/Excel) | Good (SheetJS -- reads cell values, no formula evaluation) |
| **Code file understanding** | Excellent | Excellent | Excellent (native fs -- perfect for code) |
| **Content editing after extraction** | No (re-upload required) | No (re-upload required) | Yes (planned differentiator -- Markdown editor) |
| **Smart classification** | Auto-detected type | Auto-detected type | Extension + MIME + content-based (P2) |
| **File management UI** | Limited (per-conversation) | Limited (per-conversation) | Full management (list, search, delete) |
| **Agent workflow integration** | N/A | N/A | Yes (planned -- file processing as Skills) |

**Key differentiator opportunity:** Content editing of extracted files. Neither ChatGPT nor Claude allows users to edit the extracted content before or after AI processing. This is a meaningful differentiator for a team collaboration tool where users may need to correct extraction errors, redact sensitive sections, or refine context before sending to the AI.

**Secondary differentiator:** File management. Both ChatGPT and Claude tie files to individual conversations with no cross-conversation file management. A dedicated file management view (list all files, search, delete) is valuable for team use where files are reused across conversations.

---

## Integration Points with Existing System

### ChatInput Component (`src/components/chat/chat-input.tsx`)

Currently accepts only text input. Must be extended to:
- Add a "+" / paperclip button next to the textarea
- Add drag-and-drop event handlers on the input area
- Render file preview cards above the textarea when files are attached
- Pass file references alongside the text message to `onSend`

### Chat API (`src/app/api/chat/route.ts`)

Currently accepts `{ messages, modelId, conversationId }`. Must be extended to:
- Accept `fileIds: string[]` in the request body
- Look up files in the database, retrieve extracted content
- Inject file content into the messages array as system context (e.g., `[File: report.pdf]\n{extracted content}\n[/File]`)
- Apply token budget management to avoid exceeding model context limits

### File Processing Skills (`src/skills/file-processing.ts`)

Currently has `file-read` and `file-list` skills. Can be extended with:
- `file-extract` -- extract content from an uploaded file by ID
- `file-convert` -- convert extracted content to Markdown
- `file-classify` -- classify a file based on content analysis

### Database Schema (`src/lib/db/schema.ts`)

New `files` table needed:
- `id` (uuid, primary key)
- `userId` (text, references users)
- `conversationId` (text, nullable -- files can exist without being in a conversation)
- `filename` (text)
- `originalName` (text -- user-facing filename)
- `mimeType` (text)
- `size` (integer, bytes)
- `fileType` (text enum: 'pdf', 'docx', 'code', 'csv', 'xlsx', 'other')
- `storagePath` (text -- path on disk or object key)
- `extractedContent` (text -- extracted text content)
- `extractedMarkdown` (text, nullable -- converted Markdown, added in P2)
- `classification` (text, nullable -- smart category, added in P2)
- `status` (text enum: 'uploading', 'processing', 'ready', 'failed')
- `errorMessage` (text, nullable)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### Storage Layer

Abstract storage interface for local filesystem (v1.2) with future cloud storage swap:
- `uploadFile(buffer, metadata)` -- store file, return storage path
- `getFile(path)` -- retrieve file as buffer
- `deleteFile(path)` -- remove file
- Local implementation writes to a configurable directory (e.g., `./uploads/`)
- Cloud implementation (future) wraps S3-compatible API

---

## Sources

- [unpdf GitHub - PDF extraction and rendering across all runtimes](https://github.com/unjs/unpdf) -- HIGH confidence, official repo
- [Using pdf-parse on Vercel Is Wrong -- Here's What Actually Works](https://chudi.dev/blog/serverless-pdf-processing-unpdf-vs-pdfparse) -- HIGH confidence, comparison with benchmarks
- [7 PDF Parsing Libraries for Node.js - Strapi](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) -- MEDIUM confidence, comparison article
- [Mammoth npm package guide](https://generalistprogrammer.com/tutorials/mammoth-npm-package-guide) -- MEDIUM confidence, tutorial
- [Reliable document text extraction in Node.js 20 - Reddit](https://www.reddit.com/r/node/comments/1qaoknz/reliable_document_text_extraction_in_nodejs_20/) -- MEDIUM confidence, real-world experience report
- [Unstructured-ish DOCX Parsing in TypeScript/NodeJS](https://nguyenhuythanh.com/posts/unstructured-ish-docx-parsing/) -- MEDIUM confidence, technical blog
- [Top 5 JavaScript CSV Parsers - OneSchema](https://www.oneschema.co/blog/top-5-javascript-csv-parsers) -- HIGH confidence, PapaParse benchmark data
- [SheetJS vs ExcelJS vs node-xlsx (2026)](https://www.pkgpulse.com/blog/sheetjs-vs-exceljs-vs-node-xlsx-excel-files-node-2026) -- MEDIUM confidence, comparison article
- [How to Handle File Uploads in Next.js - OneUptime (Jan 2026)](https://oneuptime.com/blog/post/2026-01-24-nextjs-file-uploads/view) -- HIGH confidence, current best practices
- [What I Learned About File Uploads in Next.js - Medium](https://medium.com/codetodeploy/what-i-learned-about-file-uploads-in-next-js-and-the-mistakes-i-made-first-51481dab75fe) -- MEDIUM confidence, experience report
- [ChatGPT vs. Claude for File Upload & Reading Capabilities](https://www.datastudios.org/post/chatgpt-vs-claude-for-file-upload-reading-capabilities-full-comparison-and-report-models-file) -- MEDIUM confidence, competitor comparison
- [Best AI Chatbots with File Upload in 2026](https://textcortex.com/post/chatbots-with-file-upload) -- MEDIUM confidence, feature roundup
- [React PDF Viewers - The 2025 Guide](https://sudopdf.mintlify.app/blogs/pdf-viewer-guide) -- MEDIUM confidence, React component comparison
- [MDXEditor - Rich Text Markdown Editor](https://mdxeditor.dev/) -- HIGH confidence, official site
- [React Markdown Complete Guide 2025 - Strapi](https://strapi.io/blog/react-markdown-complete-guide-security-styling) -- MEDIUM confidence, security guide
- `file-type` npm package (sindresorhus) -- HIGH confidence, widely adopted, actively maintained
- Existing codebase analysis -- HIGH confidence, direct inspection of schema.ts, chat-input.tsx, file-processing.ts, chat/route.ts, skills/types.ts

---
*Feature research for: Next-Mind v1.2 File Processing*
*Researched: 2026-03-26*
