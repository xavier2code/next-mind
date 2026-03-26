# Project Research Summary

**Project:** Next-Mind AI Agent Framework
**Domain:** Multi-type file upload, processing, and management for an existing Next.js 16 AI Agent collaboration platform
**Researched:** 2026-03-26
**Confidence:** HIGH

## Executive Summary

Next-Mind v1.2 adds multi-type file handling (PDF, DOCX, code, CSV/Excel) to an existing Next.js 16 AI Agent platform that already supports multi-agent workflows, MCP protocol, and a decorator-based skills system. The research converges on a clear approach: use an abstract storage layer (unstorage) for local/cloud switchability, implement file upload via busboy streaming (for large files) and request.formData() (for small files), extract content through type-specific libraries (unpdf for PDF, mammoth+turndown for DOCX-to-Markdown, exceljs for Excel, papaparse for CSV), and integrate file content into the existing chat flow by injecting extracted text into the LLM message context client-side -- avoiding modifications to the existing streaming chat API.

The key architectural insight is that files integrate at three levels: as new database tables (files, fileContents, conversationFiles), as new skills registered through the existing decorator system, and as content injected into the existing LLM streaming flow. Content extraction must be asynchronous (fire-and-forget after upload) because PDF parsing can take 5-30 seconds. The storage abstraction layer is the single most critical new component and must be designed around operations (put/get/delete), not filesystem semantics, to avoid abstraction leaks when migrating to cloud storage later.

The primary risks are (1) Next.js App Router body size limits making 100MB uploads impossible through standard route handlers without streaming, (2) PDF/Excel memory exhaustion during server-side parsing, (3) mammoth.js Turbopack incompatibility that could block development, and (4) token budget blindness when injecting large file content into LLM context. Mitigation strategies are well-documented: streaming uploads via busboy, async extraction with size limits, and content truncation with configurable token budgets.

## Key Findings

### Recommended Stack

Eight new runtime packages recommended, zero new UI libraries needed. All integrate cleanly with the existing Next.js 16 + TypeScript + Drizzle + shadcn/ui stack.

**Core technologies:**
- **unstorage** (1.17.4): Abstract key-value storage with pluggable drivers (filesystem, S3, R2) -- enables local/cloud switchability with zero code changes, the single most important new dependency
- **busboy** (1.6.0): Streaming multipart parser for large file uploads (10-100MB) -- the only parser compatible with Next.js App Router Route Handlers via ReadableStream
- **unpdf** (1.4.0): PDF text extraction -- serverless-optimized PDF.js wrapper from UnJS ecosystem, cleaner API than pdf-parse or raw pdfjs-dist
- **mammoth** (1.12.0) + **turndown** (7.2.2): DOCX-to-HTML-to-Markdown pipeline -- two-step conversion produces better results than direct DOCX-to-Markdown tools
- **exceljs** (4.4.0): Excel reading with streaming row-by-row support -- MIT-licensed (no feature gating like SheetJS Pro), avoids SheetJS memory explosion
- **papaparse** (5.5.3): CSV parsing with streaming support -- lightweight (~30KB), industry standard
- **nanoid** (5.1.7) + **mime-types** (3.0.2): File ID generation and MIME type mapping

**Critical version note:** All packages verified ESM-compatible with Next.js 16. exceljs is CJS but works via Node.js interop.

### Expected Features

**Must have (table stakes):**
- File upload via drag-and-drop and button -- users expect this in every AI chat platform
- File type validation (magic bytes, not just extensions) -- security baseline
- Upload progress indicator -- required for files > 1MB
- File preview cards before sending -- standard UX pattern
- Content extraction for all four file types -- the core value proposition
- Files database table with metadata -- enables management and search
- Chat integration (file content injected into LLM context) -- the user-facing culmination
- Basic file management (list/delete) -- users expect to manage their uploads

**Should have (competitive differentiators):**
- Format conversion to Markdown -- enables content editing and better previews
- Content editing of extracted text -- neither ChatGPT nor Claude offers this
- Multi-file context -- attach multiple files to a single message
- File-as-skill integration -- expose file processing to agent workflows
- Smart classification -- content-based categorization beyond file extension

**Defer (v2+):**
- OCR / image-based PDF processing -- heavy dependency (Tesseract.js 20MB+), CJK accuracy concerns
- Presigned URL direct-to-cloud upload -- overkill for 100MB max, adds significant complexity
- Real-time collaborative editing -- requires CRDT infrastructure (Yjs)
- File versioning / diff history -- not a core need for an AI chat platform
- In-browser PDF rendering -- adds significant bundle size, platform value is AI understanding not file viewing
- PPTX support -- different structure from DOCX/PDF, separate effort

### Architecture Approach

The file system adds three new subsystems that integrate deeply with existing infrastructure rather than bolting on the side. A StorageProvider interface (Ports & Adapters pattern) abstracts get/put/delete operations with factory-based provider selection via environment variable. A FileProcessingService uses the Strategy pattern with type-specific processors dispatched by MIME type. File content enters the chat flow through client-side injection into the message text, meaning the existing /api/chat route handler needs no modification.

Three new database tables (files for metadata, fileContents for extracted text separated for query performance, conversationFiles as junction table) follow existing Drizzle ORM patterns. New file skills register through the existing @skill() decorator system and are available to agent workflows via skillToMcpTool(). The upload flow returns immediately with status "processing" and extraction runs asynchronously (fire-and-forget), consistent with the existing logAudit() pattern.

**Major components:**
1. **StorageProvider** (interface + LocalAdapter + S3Adapter stub) -- abstracts all file I/O, factory selects via env var
2. **FileProcessingService** (strategy pattern with type-specific processors) -- extracts text from PDF/DOCX/CSV/Excel/code
3. **File Chat Integration** (client-side content injection) -- prepends extracted text to message before sending to /api/chat
4. **File API Routes** (upload, list, delete, content, preview, convert) -- new Route Handlers following existing patterns
5. **File UI Components** (ChatInput extension, FilePreviewPanel, FileManagerPanel) -- new components in components/files/

### Critical Pitfalls

1. **Next.js App Router body size limits** -- 100MB uploads will fail through standard route handlers. Must use busboy streaming (never buffer entire body). Vercel serverless has a hard 4.5MB limit requiring presigned URLs.
2. **PDF/Excel memory exhaustion** -- A 50MB PDF can consume several hundred MB during parsing. Must set per-type size limits (50MB for PDFs, 10MB for Excel), use async extraction with timeouts, and never parse in a request handler.
3. **mammoth.js Turbopack incompatibility** -- Confirmed Next.js GitHub issue (#72863). Since the project uses `npm run dev --turbopack`, this is a direct blocker that must be resolved before DOCX support can proceed.
4. **File type validation as a checkbox** -- Client-sent Content-Type headers are trivially forged. Must validate magic bytes server-side using file-type package, with extension whitelisting as defense-in-depth.
5. **Token budget blindness** -- A 50-page PDF extracts to ~25,000 tokens. Must implement content truncation (configurable max, e.g., 8,000 tokens) and show file content size indicators in the UI before the user sends.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Storage Foundation + Upload Infrastructure
**Rationale:** The storage abstraction layer gates everything else. All file I/O flows through it, so getting the interface right (operation-based, not filesystem-based) prevents costly refactoring when cloud storage is added later. Upload infrastructure (streaming via busboy, validation via magic bytes) must be solved first because every subsequent feature depends on files being safely stored.
**Delivers:** StorageProvider interface, LocalStorageAdapter, S3Adapter stub, POST /api/files upload endpoint with streaming and validation, busboy integration
**Addresses:** File upload (drag-and-drop + button), file type & size validation, upload progress indicator
**Avoids:** Pitfall 1 (magic byte validation), Pitfall 2 (streaming not buffering), Pitfall 7 (operation-based interface)

### Phase 2: Database Schema + File Management API
**Rationale:** The three-table schema (files, fileContents, conversationFiles) can be built in parallel with processing logic since file management (list/delete) is independent of content extraction. Getting the schema right early -- especially separating fileContents for query performance -- prevents the common anti-pattern of storing large text blobs in the metadata table.
**Delivers:** Drizzle schema migrations, file CRUD queries, GET /api/files (list with pagination), DELETE /api/files/[id], GET /api/files/[id]/content
**Addresses:** Files database table, basic file management (list/delete)
**Uses:** StorageProvider from Phase 1

### Phase 3: Content Extraction Pipeline
**Rationale:** This is the central dependency -- chat integration, preview, and conversion all build on extracted content. Each file type gets a dedicated processor following the Strategy pattern, making them independently testable and extensible. Async processing is critical: extraction runs fire-and-forget after upload to avoid request timeouts.
**Delivers:** FileProcessingService with PDF/DOCX/CSV/Excel/Code processors, async extraction triggered after upload, FileClassifierService, extracted text stored in fileContents table
**Addresses:** Content extraction (all 4 file types), smart classification (basic extension+MIME)
**Uses:** unpdf, mammoth+turndown, exceljs, papaparse
**Avoids:** Pitfall 3 (async PDF extraction with size limits), Pitfall 4 (Turbopack test for mammoth), Pitfall 5 (exceljs streaming, not SheetJS)

### Phase 4: Chat Integration
**Rationale:** This is the user-facing culmination that ties upload + extraction + the existing chat system together. The lowest-friction integration path is client-side content injection (prepend extracted text to the message before sending to /api/chat), which requires zero changes to the existing streaming chat API. Must include token budget management to prevent context window overflow.
**Delivers:** useFileUpload hook, ChatInput file attachment UI, client-side file content resolution in handleSend(), FileAttachment component in ChatMessage, token-aware content truncation
**Addresses:** Chat integration, file preview cards, multi-file context (basic)
**Implements:** File content as skill context extension pattern
**Avoids:** Pitfall 8 (token budget awareness)

### Phase 5: File Preview + Format Conversion
**Rationale:** Preview and conversion are independent of each other but both depend on the extraction pipeline from Phase 3. Grouping them makes sense because they share the same data source and both serve the same user goal: understanding file content. Preview reuses existing react-markdown and react-syntax-highlighter components.
**Delivers:** FilePreviewPanel, type-specific preview components (PreviewCode, PreviewData, PreviewMarkdown), FileConverterService (DOCX->MD, CSV->JSON), conversion API endpoint
**Addresses:** File preview, format conversion to Markdown, content editing (if Markdown editor added)
**Avoids:** Pitfall 6 (CSP headers, no dangerouslySetInnerHTML, sandboxed iframes)

### Phase 6: File Management UI + Skills Integration
**Rationale:** The file management UI (FileManagerPanel) depends only on the list/delete API from Phase 2 and can be built independently. Skills integration (exposing file processing as @skill() decorated methods) depends on Phase 3's processing pipeline. Grouping these as the final phase delivers the remaining P1 features and the key P2 differentiator (file-as-skill for agent workflows).
**Delivers:** FileManagerPanel component with search, new file skills (file-extract-text, file-convert, file-classify) registered via decorator system, MCP tool registration via skillToMcpTool(), enhanced file agent
**Addresses:** Full file management UI, file-as-skill integration
**Implements:** Decorator-based skill registration pattern

### Phase Ordering Rationale

- Phases 1-2 form the foundation (storage + persistence) and must come first because everything else depends on files being stored and tracked in the database
- Phase 3 (extraction) is the central dependency that enables Phases 4 and 5
- Phase 4 (chat integration) is the primary user-facing feature and should come before preview/conversion to deliver value early
- Phase 5 (preview + conversion) enhances the user experience but is not required for the core "upload file, ask AI about it" workflow
- Phase 6 (management UI + skills) completes the feature set and adds the agent workflow differentiator
- This ordering ensures each phase has testable output and delivers incremental user value

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Streaming upload with busboy in Next.js 16 App Router -- the integration pattern is well-documented but needs prototyping to verify chunk handling and progress events work correctly with the specific Next.js version
- **Phase 3:** mammoth.js Turbopack incompatibility is a confirmed blocker (Next.js GitHub issue #72863). Must research whether this has been resolved in newer versions, or identify a workaround (webpack override for specific route, alternative library), before planning DOCX extraction work

Phases with standard patterns (skip research-phase):
- **Phase 2:** Drizzle schema extensions and CRUD queries follow well-established patterns already in the codebase
- **Phase 4:** Client-side content injection into chat messages is a straightforward integration with the existing fetch-based chat flow
- **Phase 5:** File preview components reuse existing react-markdown and react-syntax-highlighter infrastructure
- **Phase 6:** Skills registration via @skill() decorator is an established pattern with multiple working examples in the codebase

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified via npm view. Official docs consulted. ESM compatibility confirmed. |
| Features | MEDIUM | File processing libraries well-documented. UX patterns validated against competitor analysis (ChatGPT, Claude). Some integration specifics (token budgeting thresholds, exact truncation strategy) need prototyping. |
| Architecture | HIGH | Patterns (Ports & Adapters, Strategy) are well-established. Integration points identified through direct codebase inspection. Data flow diagrams validated against existing architecture. |
| Pitfalls | HIGH | Sources include official GitHub issues, OWASP guidelines, PortSwigger research, and confirmed production incidents. mammoth.js Turbopack issue is documented in Next.js issue tracker. |

**Overall confidence:** HIGH

### Gaps to Address

- **mammoth.js Turbopack fix status:** Next.js issue #72863 documents the incompatibility. The fix status may have changed since the issue was filed. Must verify before Phase 3 planning whether this is still a blocker or if a workaround exists.
- **Token budget thresholds:** Research identifies the problem (large file content blowing through context windows) but does not prescribe exact truncation limits. Need to determine model-specific context budgets (Qwen3.5: 128K, GLM: varies) and set per-file and per-message content limits during Phase 4 planning.
- **busboy progress events in App Router:** The streaming upload pattern is well-documented for Node.js but the specific integration with Next.js 16 App Router ReadableStream and progress tracking for the client needs prototyping to confirm feasibility.
- **Serverless vs self-hosted upload strategy:** Architecture research identifies a critical fork -- self-hosted can use POST /api/files with multipart, but Vercel serverless requires presigned URLs. The deployment target must be confirmed before Phase 1 planning to avoid building the wrong upload strategy.

## Sources

### Primary (HIGH confidence)
- unstorage official docs -- https://unstorage.unjs.io/ (verified 2026-03-26, all 18 drivers confirmed)
- unpdf GitHub -- https://github.com/unjs/unpdf (verified 2026-03-26)
- mammoth npm -- https://www.npmjs.com/package/mammoth (verified 2026-03-26)
- exceljs npm -- https://www.npmjs.com/package/exceljs (verified 2026-03-26)
- papaparse npm -- https://www.npmjs.com/package/papaparse (verified 2026-03-26)
- busboy npm -- https://www.npmjs.com/package/busboy (verified 2026-03-26)
- Next.js App Router file upload body size limits -- https://github.com/vercel/next.js/issues/34213 (official issue)
- Next.js mammoth.js Turbopack incompatibility -- https://github.com/vercel/next.js/issues/72863 (official issue)
- OWASP File Upload Testing Guide -- https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/10-Business_Logic_Testing/09-Test_Upload_of_Malicious_Files
- PortSwigger File Upload Vulnerabilities -- https://portswigger.net/web-security/file-upload
- Next.js serverActions bodySizeLimit docs -- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
- SheetJS XLSX streaming limitation -- https://github.com/SheetJS/sheetjs/issues/2707 (maintainer confirmed)
- Existing codebase analysis -- direct inspection of schema.ts, chat-input.tsx, file-processing.ts, chat/route.ts, skills/types.ts

### Secondary (MEDIUM confidence)
- Next.js File Uploads Guide (Jan 2026) -- https://oneuptime.com/blog/post/2026-01-24-nextjs-file-uploads/view
- Storage Abstraction Pattern -- https://elasticscale.com/blog/abstracting-away-from-object-storage-like-s3-is-always-a-good-idea/
- Google SafeContentFrame pattern -- https://bughunters.google.com/blog/beyond-sandbox-domains-rendering-untrusted-web-content-with-safecontentframe
- SheetJS vs ExcelJS comparison (2026) -- https://www.pkgpulse.com/blog/sheetjs-vs-exceljs-vs-node-xlsx-excel-files-node-2026
- PapaParse benchmark data -- https://www.oneschema.co/blog/top-5-javascript-csv-parsers
- ChatGPT vs Claude file upload comparison -- https://www.datastudios.org/post/chatgpt-vs-claude-for-file-upload-reading-capabilities-full-comparison-and-report-models-file
- mammoth.js limitations issues -- #6, #71, #129, #187, #200, #213 on GitHub

### Tertiary (LOW confidence)
- Reddit: SheetJS 1.5MB file taking 50 seconds to parse -- anecdotal, may be hardware-dependent
- mammoth.js Turbopack fix status -- may have been resolved; verify before implementation

---
*Research completed: 2026-03-26*
*Ready for roadmap: yes*
