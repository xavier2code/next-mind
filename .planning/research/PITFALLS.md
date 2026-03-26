# Pitfalls Research: File Upload, Processing & Management

**Domain:** Adding multi-type file upload (PDF, Word, code files, CSV/Excel) to an existing Next.js 16 AI Agent platform
**Researched:** 2026-03-26
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: Treating File Type Validation as a Checkbox

**What goes wrong:**
Relying solely on file extension or `Content-Type` header to validate uploaded files. Attackers rename malicious payloads (e.g., `shell.php.jpg`) or spoof MIME headers to bypass checks. A polyglot file that passes as both a valid PDF and an executable can slip through naive validation and be served back to users or processed server-side.

**Why it happens:**
Browser-sent `Content-Type` headers are client-controlled and trivially forged. File extensions are cosmetic. Most tutorials show validation as `if (file.type !== 'application/pdf')` and call it done. The existing `content-filter.ts` only checks text content -- it has no awareness of binary file payloads.

**How to avoid:**
- Validate magic bytes (file signatures) server-side as the primary check: PDF starts with `%PDF-`, DOCX is a ZIP with `[Content_Types].xml`, XLSX same pattern
- Use the `file-type` npm package which reads buffers and identifies 100+ formats by magic bytes
- Keep extension whitelisting as a secondary defense layer (defense in depth)
- Reject files where extension and magic bytes disagree
- For the highest confidence, consider Google Magika (AI-powered detection trained on 25M+ files)

**Warning signs:**
- Validation logic only checks `file.name.endsWith('.pdf')` or `file.type === 'application/pdf'`
- No server-side inspection of file content beyond the header
- Test files pass when renamed to `.txt` but still uploaded as PDFs
- Missing validation in the API route handler (only client-side checks exist)

**Phase to address:** Phase 1 (File Upload Infrastructure) -- validation layer must exist before any storage

---

### Pitfall 2: Next.js App Router Body Size Limits

**What goes wrong:**
File uploads silently fail for files larger than ~1-4.5 MB depending on deployment. Next.js App Router route handlers use the Web API `Request` object, not Express. The old Pages Router `export const config = { api: { bodyParser: { sizeLimit } } }` pattern is **deprecated and does not work** in App Router. Vercel serverless functions have a hard 4.5 MB (Hobby) or 50 MB (Pro) payload limit.

This project targets 100 MB uploads per PROJECT.md. That will **never work** through a standard route handler on serverless infrastructure without special handling.

**Why it happens:**
Developers copy-paste Pages Router patterns into App Router route handlers. The `FormData` API in route handlers buffers the entire body into memory before your handler code runs. For a 100 MB file, this means 100+ MB of memory consumed per concurrent upload -- multiple simultaneous uploads will crash the process.

**How to avoid:**
- Use streaming uploads: `request.body` returns a `ReadableStream` in App Router -- read chunks incrementally, never buffer the whole file
- For production scale, implement presigned URL uploads: client uploads directly to S3/R2, server only stores metadata
- If streaming through the server, set `export const maxDuration = 60` (or higher) to prevent function timeouts during slow uploads
- Add client-side chunked upload with `tus` protocol for unreliable networks
- For local development, configure the Next.js dev server body parser or use streaming from the start

**Warning signs:**
- Upload works for small files (< 1 MB) but fails with 413 or silent errors for larger files
- `request.formData()` called on the full request body for large files
- No chunked or streaming upload implementation
- Body size limit configuration uses deprecated `export const config` pattern

**Phase to address:** Phase 1 (File Upload Infrastructure) -- must be resolved before any file type works at scale

---

### Pitfall 3: PDF Parsing Memory Exhaustion

**What goes wrong:**
Loading entire PDF files into memory as `Uint8Array` or `Buffer` for parsing. A 50 MB PDF can consume several hundred MB during parsing. `pdf-parse` depends on `pdfjs-dist` which loads the full document. `pdf-lib` is even worse for large files -- the GitHub issue tracker shows heap OOM crashes on documents with 20,000+ pages.

The `pdfjs-dist` dependency in `pdf-parse` has also caused silent crashes in production when the debug worker file is missing (documented real-world incident).

**Why it happens:**
PDF parsing libraries are designed around the assumption that the entire file fits in memory. There is no native streaming support for PDF parsing -- the file structure requires random access. Developers don't test with real-world large PDFs (scanned documents, textbooks, annual reports) and only validate with small test files.

**How to avoid:**
- Set a hard per-file size limit (e.g., 50 MB for PDFs, not the full 100 MB budget)
- Use worker threads for PDF parsing to isolate memory and prevent main thread blocking
- Implement timeout-based cancellation: if parsing takes > 30 seconds, abort and report error
- For very large PDFs, extract only text (skip images/annotations) using `pdf-parse` with `pagerender` option set to a text-only callback
- Never parse PDFs synchronously in a request handler -- queue extraction as a background task
- Pin `pdf-parse` and `pdfjs-dist` versions and verify the debug worker file is present in deployment

**Warning signs:**
- PDF parsing returns empty results for some files (silent failure from missing dependencies)
- Memory usage spikes during upload processing
- Processing time scales super-linearly with file size
- No timeout on PDF extraction operations

**Phase to address:** Phase 2 (Content Extraction) -- when adding PDF text extraction

---

### Pitfall 4: Word Document (DOCX) Conversion Loss

**What goes wrong:**
Converting DOCX to Markdown loses critical content: tables lose formatting, images have unreliable dimensions, footnotes/endnotes/headers/footers are silently dropped, and complex layouts (columns, text boxes, SmartArt) produce garbage output. The fundamental problem is that DOCX uses XML-based styling (runs, paragraphs, sections) that does not map cleanly to HTML/Markdown.

Additionally, mammoth.js has a known **Turbopack incompatibility** -- it fails during Next.js builds with Turbopack due to module resolution differences. Since this project uses `npm run dev` with `--turbopack`, this is a direct blocker.

**Why it happens:**
DOCX is an OOXML format with deeply nested XML structures. Conversion libraries (mammoth.js, docx4js) make opinionated choices about what to preserve. Mammoth.js explicitly ignores: footnotes, endnotes, headers, footers, page numbering, columns, text boxes, SmartArt, and nested tables. Documents created by Google Docs or LibreOffice produce different XML structures than Microsoft Word, leading to inconsistent output.

**How to avoid:**
- Document which DOCX features are NOT supported and communicate this to users
- Test with documents from multiple sources: Microsoft Word, Google Docs, LibreOffice, WPS Office
- For the Turbopack issue: either (a) bundle mammoth.js with webpack for the specific route, or (b) use a WASM-based alternative like `docx-preview` for rendering, or (c) consider server-side LibreOffice conversion for highest fidelity
- Always read from buffers (not file paths) in web server contexts -- this is a common mistake with mammoth.js + multer/buffers
- If tables are important (they are for data files), consider `mammoth-styled` fork or post-process table output with custom CSS

**Warning signs:**
- Next.js dev server fails to start or build after adding mammoth.js with Turbopack
- Users report missing content from their Word documents
- Table data appears as unformatted text
- Images from DOCX have broken dimensions or don't render

**Phase to address:** Phase 2 (Content Extraction) -- when adding Word document support

---

### Pitfall 5: Excel (XLSX) Memory Explosion

**What goes wrong:**
Loading entire Excel workbooks into memory. SheetJS (xlsx) loads the full workbook into a JS object. A 5 MB `.xlsx` file can consume 500 MB+ of RAM because XLSX is a ZIP archive containing XML -- the parsed object representation is far larger than the compressed file. Real-world reports show 1.5 MB files taking 50 seconds to parse.

The fundamental issue: **XLSX cannot be incrementally streamed for reads**. The ZIP format requires random access to internal file entries. There is no way to read row-by-row from a streaming source.

**Why it happens:**
SheetJS is the de facto standard for Excel parsing in JavaScript. Its API encourages loading the full workbook: `XLSX.read(buffer, { type: 'buffer' })` returns everything. Developers don't realize the memory amplification factor until they process real user data (multi-sheet workbooks with formulas, formatting, and embedded objects).

**How to avoid:**
- Use `exceljs` instead of SheetJS for reading -- it supports streaming row-by-row: `workbook.xlsx.createReadStream()` processes rows without loading the full workbook
- Set hard limits: reject files > 10 MB, limit to first N rows (configurable), limit to first sheet unless user specifies
- Parse in a worker thread or background queue -- never in a request handler
- For CSV files (the easier case), use `papaparse` in streaming mode or Node.js `readline` with streams
- Add memory monitoring: if RSS exceeds a threshold during parsing, abort

**Warning signs:**
- Node.js process OOM crashes during Excel processing
- Parsing time exceeds 10 seconds for files under 5 MB
- Memory usage grows proportionally to file size rather than staying constant
- No row/sheet limits configured

**Phase to address:** Phase 2 (Content Extraction) -- when adding Excel/CSV parsing

---

### Pitfall 6: File Preview XSS Attack Surface

**What goes wrong:**
Rendering user-uploaded files in the browser for preview creates XSS attack vectors. Malicious PDFs can execute JavaScript through PDF.js (documented exploits). Converted HTML from DOCX can contain injected scripts. Even CSV/Excel data rendered as HTML tables can include formula injection (`=cmd|'/C calc'!A0` in Excel).

The existing `content-filter.ts` checks for harmful text patterns but has **no awareness of binary payloads or script injection in rendered file content**.

**Why it happens:**
File preview requires rendering untrusted content in the browser. PDF.js is a JavaScript-based renderer -- malicious PDFs can trigger JavaScript execution within its runtime. Converting DOCX to HTML and rendering it with `dangerouslySetInnerHTML` is an obvious XSS vector. The sandbox attribute on iframes helps but has known bypass techniques (documented by PortSwigger).

**How to avoid:**
- For PDF preview: use sandboxed iframes with `sandbox="allow-scripts"` and block external URL fetches (configure CSP headers)
- For DOCX-to-Markdown conversion: never render raw HTML from DOCX; convert to Markdown first, then render Markdown through the existing `react-markdown` pipeline
- For CSV/Excel preview: sanitize cell values before rendering; escape HTML entities; detect and neutralize formula injection patterns
- Never use `dangerouslySetInnerHTML` with file-derived content
- Implement CSP headers on preview routes: `Content-Security-Policy: default-src 'none'; script-src 'none'; style-src 'unsafe-inline'`
- For the highest security, render previews in an iframe with `sandbox` attribute and use `postMessage` for size negotiation (Google's SafeContentFrame pattern)

**Warning signs:**
- File content rendered via `dangerouslySetInnerHTML`
- No CSP headers on file preview endpoints
- PDF preview using `<embed>` or `<object>` without sandbox
- CSV data rendered without HTML entity escaping

**Phase to address:** Phase 3 (File Preview) -- when adding in-browser preview rendering

---

### Pitfall 7: Abstract Storage Layer Leaking Abstraction

**What goes wrong:**
The PROJECT.md specifies an abstract storage layer (local/cloud switchable). The abstraction leaks when code assumes local filesystem semantics that don't apply to cloud storage: `fs.stat()` for file existence checks, path-based operations, file locking, atomic renames, or `fs.createReadStream()` without cloud SDK equivalents.

Migration from local to cloud later becomes painful because code is tightly coupled to filesystem APIs through the "abstraction."

**Why it happens:**
Developers build the abstraction around `fs` operations and add an S3 adapter later. The S3 adapter has fundamentally different semantics: eventual consistency, no directory listing in a single call, multipart upload requirements, different error types, no file locking, and presigned URL complexity for reads.

**How to avoid:**
- Design the interface around **operations** not **filesystem**: `upload(key, stream)`, `download(key)`, `delete(key)`, `getMetadata(key)`, `getPresignedUrl(key)`
- Never expose `fs`-specific concepts (paths, file descriptors, streams) through the abstraction
- Use `ReadableStream` as the universal interface -- both `fs.createReadStream` and S3 `GetObject` can produce one
- Implement local storage using a directory structure keyed by file ID (UUID), not user-provided paths
- Store file metadata (size, MIME type, upload date) in PostgreSQL (already in schema), not in the storage layer
- Test both implementations from day one, even if cloud storage isn't the default

**Warning signs:**
- Storage interface has methods like `getFilePath()` or `readDir()`
- Code outside the storage layer imports `fs` or `path`
- File identifiers are user-provided filenames instead of UUIDs
- No S3/R2 adapter exists, even as a stub

**Phase to address:** Phase 1 (File Upload Infrastructure) -- storage abstraction must be designed correctly from the start

---

### Pitfall 8: File-Chat Integration Token Budget Blindness

**What goes wrong:**
When users attach files to conversations, the extracted content is injected into the LLM context. A 50-page PDF extracts to ~25,000 tokens. An Excel file with 10,000 rows extracts to ~50,000 tokens. Combined with conversation history, system prompt, and MCP tool definitions, this blows through the model's context window.

The existing system has no concept of token budgeting -- messages are stored as plain text in PostgreSQL, and the chat API sends everything to the LLM.

**Why it happens:**
File content is treated like regular message text. There's no awareness of how many tokens the extracted content consumes relative to the model's context limit. Users don't understand that attaching a large file effectively fills their entire conversation context.

**How to avoid:**
- Track token counts for extracted file content and expose this in the UI
- Implement content truncation with a configurable max: e.g., first 8,000 tokens of extracted text, with a notice that content was truncated
- For structured data (CSV/Excel), send column headers + sample rows instead of full data
- Consider a separate RAG-style retrieval for large files: index content, retrieve relevant chunks on demand (deferred to future RAG milestone per PROJECT.md)
- Add a file content size indicator in the chat UI before the user sends the message
- Respect the model's actual context window: Qwen3.5 supports 128K tokens, GLM supports similar -- subtract conversation history and system prompt from the budget

**Warning signs:**
- File content appended directly to message text without size check
- No token counting for file content
- Users reporting "the AI stopped responding" or truncated answers after attaching large files
- API errors with context length exceeded after file attachments

**Phase to address:** Phase 4 (Chat Integration) -- when connecting uploaded files to conversation context

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems when adding file processing to an existing system:

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store files in `public/` directory | No storage setup needed | Files lost on redeployment, no access control, no cleanup | Never -- ephemeral storage |
| Parse files synchronously in API route | Simpler code path | Request timeouts, memory spikes, blocked event loop | Never for files > 1 MB |
| Use `request.formData()` for large files | Simplest Next.js API | Entire body buffered in memory, OOM risk | Only for files < 5 MB |
| Store extracted content only as message text | No new tables needed | No re-extraction, no search, no re-processing, no metadata | MVP only, migrate before v1.3 |
| Skip virus/malware scanning | Faster upload, no dependencies | Malicious files served to users, RCE risk | Acceptable for trusted team (10-50 users) but add scanning before public access |
| One extraction pipeline for all formats | Simpler code | Can't optimize per-format, can't add format-specific features | MVP only |
| No file deduplication | Simpler upload logic | Same file uploaded 10x = 10x storage used | Acceptable for team scale, add hashing before public scale |

---

## Integration Gotchas

Common mistakes when connecting file processing to the existing Next-Mind system:

| Integration Point | Common Mistake | Correct Approach |
|-------------------|----------------|-------------------|
| Existing `content-filter.ts` | Apply text filter to binary file content, or skip filtering entirely for files | Extract text first, then apply `isContentSafe()` to extracted text only; binary files need magic byte validation, not content filtering |
| Existing `skills/file-processing.ts` | Try to reuse `readFile` skill for uploaded files (it reads local filesystem paths) | Build new upload-specific skills; the existing skill reads server files by path, uploaded files are in abstract storage |
| Existing `audit.ts` | Only log upload events, not file access/preview/download | Log all file operations: upload, download, preview, delete, content extraction -- file access is security-sensitive |
| Existing `auth.ts` / middleware | File preview URLs accessible without auth if using direct file paths | All file access (including preview) must go through authenticated API routes; never serve files from `public/` |
| Existing `messages` table | Store file references as plain text in message content | Add file attachment relation (new table or JSONB field on messages); need structured metadata (fileId, filename, extractedTextSnippet) |
| Existing streaming chat (`api/chat`) | Send file content as part of the streamed response text | File content should be in the messages array sent to the LLM, not mixed into the streaming delta text |
| Existing MCP server | Try to expose file upload as an MCP tool directly | MCP tools should reference already-uploaded files by ID; upload itself is a separate HTTP endpoint |
| Existing `ApprovalStateMachine` | File operations bypass approval flow | Large file deletes, bulk operations, and content extraction should optionally require approval |

---

## Performance Traps

Patterns that work for a few test files but fail under real usage:

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous file extraction | API response times spike to 10-30 seconds | Process extraction asynchronously with job queue; return immediately, poll for status | Files > 2 MB or concurrent uploads > 3 |
| In-memory file buffering | Server RSS grows linearly, eventual OOM | Stream to disk/cloud immediately; never hold full file in memory | Files > 10 MB or concurrent uploads > 5 |
| No upload progress feedback | Users think upload is frozen, retry, create duplicates | Implement chunked upload with progress events; show progress bar | Files > 1 MB on any network |
| Full-text extraction for preview | Preview loading takes seconds for large documents | Extract preview separately: first page only, or first N KB; lazy-load full content | PDFs > 10 pages, Excel > 1000 rows |
| Database stores extracted content | PostgreSQL table bloat, slow queries | Store extracted content in separate table with full-text search index; or in object storage with reference | Files > 100, extracted text > 100 KB |
| No file cleanup | Disk fills up with orphaned files (uploaded but not referenced) | Background job to delete unreferenced files after TTL (e.g., 30 days); soft-delete with cleanup queue | > 1000 files or > 10 GB total storage |

---

## Security Mistakes

Domain-specific security issues beyond general web security for file upload systems:

| Mistake | Risk | Prevention |
|---------|------|------------|
| Polyglot file upload | File valid as both PDF and executable bypasses type checks | Magic byte validation + content structure validation (not just first bytes) |
| ZIP bomb in uploaded archive | 42 MB ZIP expands to 4.5 PB, causes OOM/DoS | Limit extraction depth and total extracted size; check compression ratio before extraction |
| Path traversal in filename | `../../../etc/passwd.docx` overwrites system files | Sanitize filenames, use UUID-based storage keys, never use user-provided filename in filesystem operations |
| File serving without auth | Direct URLs to uploaded files bypass authentication | All file access through authenticated API routes; never serve from `public/`; use presigned URLs with short TTL |
| CSV formula injection | `=cmd\|'/C calc'!A0` in CSV cell executes when opened in Excel | Sanitize cell values: prefix with `'` or escape `=`, `+`, `-`, `@` at start of values |
| Server-side request forgery via file URL | Stored file URL points to internal service (`http://localhost:3000/admin`) | Validate all URLs; never fetch URLs from uploaded file metadata; use allowlist for external resources |
| Metadata injection in Office files | Office XML can contain external resource references, template injections | Strip all metadata beyond core content during extraction; don't trust Office file metadata |

---

## UX Pitfalls

User experience mistakes specific to file upload and management in a chat-based AI platform:

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No upload progress for large files | User thinks upload failed, retries, creates duplicates | Chunked upload with progress bar; disable retry during active upload |
| File preview takes forever to load | User abandons the feature, goes back to downloading and reading locally | Lazy-load preview; show placeholder immediately; load content incrementally |
| Extracted text looks nothing like the original | User doesn't trust the AI's answers about their file | Show confidence indicator; allow user to view and edit extracted content; highlight what was lost in conversion |
| No indication of what was extracted | User doesn't know if the AI "saw" their tables, images, or formatting | Show extraction summary: "Extracted 15 pages of text, 3 tables, 0 images" |
| File attachment hidden in chat UI | User forgets file is attached, confused about AI's answers | Persistent file chip/pill in chat input area; file context panel showing attached files |
| Deleting a file breaks conversation history | Past messages referencing deleted file show errors | Soft-delete; keep extracted text in conversation; show "file no longer available" rather than broken references |
| No file search | User uploaded 50 files, can't find the one they need | Full-text search over file names and extracted content; filter by type and date |
| Large file upload silently fails | No error message, file just doesn't appear | Explicit error messages with actionable guidance ("File too large. Maximum size is 100 MB. Your file is 150 MB.") |

---

## "Looks Done But Isn't" Checklist

Things that appear complete when adding file processing but are missing critical pieces:

- [ ] **File validation:** Often missing magic byte check -- verify files are validated beyond extension and Content-Type header
- [ ] **Streaming upload:** Often missing for files > 5 MB -- verify large uploads don't buffer entire body in memory
- [ ] **Error recovery:** Often missing retry for failed uploads -- verify interrupted uploads can be resumed or retried without creating duplicates
- [ ] **Conversion fidelity:** Often missing for complex documents -- verify Word tables, PDF formatting, and Excel formulas are handled (or explicitly communicated as unsupported)
- [ ] **File preview security:** Often missing CSP headers and sandbox -- verify preview iframe has `sandbox` attribute and CSP blocks scripts
- [ ] **Extracted content token budget:** Often missing when injecting into chat -- verify file content doesn't blow through LLM context window
- [ ] **Orphan cleanup:** Often missing background job -- verify unreferenced files are eventually cleaned up
- [ ] **Concurrent upload handling:** Often missing -- verify multiple simultaneous uploads don't cause memory exhaustion or race conditions
- [ ] **File deletion cascading:** Often missing -- verify deleting a file doesn't break conversation messages that reference it
- [ ] **Storage abstraction test coverage:** Often missing cloud storage tests -- verify the abstraction works with both local and S3-like backends, not just local

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover:

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Body size limit hit in production | MEDIUM | Switch to presigned URL uploads; implement chunked client; no data loss since uploads fail before storage |
| PDF parsing OOM crashes | MEDIUM | Add file size limits retroactively; implement worker thread isolation; no data loss since parsing is post-upload |
| Storage abstraction leaks | HIGH | Refactor storage interface to operation-based; rewrite all consumers; may need data migration if file paths are stored |
| File content XSS in preview | HIGH | Immediately disable preview; add CSP headers and sandbox; audit all rendered file content for script injection |
| Token budget exceeded in chat | LOW | Add truncation logic to file content injection; reduce max file content sent to LLM; no data loss |
| DOCX conversion losing content | LOW | Document supported features; add conversion warnings in UI; consider LibreOffice for edge cases |
| Turbopack incompatibility (mammoth) | MEDIUM | Switch to alternative library or configure webpack override for the specific route; blocks development until resolved |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls for the v1.2 file processing milestone:

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| File type validation (Pitfall 1) | Phase 1 (Upload Infrastructure) | Upload `.txt` renamed to `.pdf` -- should be rejected |
| Body size limits (Pitfall 2) | Phase 1 (Upload Infrastructure) | Upload 50 MB file -- should succeed without OOM |
| PDF memory exhaustion (Pitfall 3) | Phase 2 (Content Extraction) | Upload 30 MB PDF -- extraction completes within timeout, no OOM |
| DOCX conversion loss (Pitfall 4) | Phase 2 (Content Extraction) | Test with Word, Google Docs, LibreOffice files; document gaps |
| Excel memory explosion (Pitfall 5) | Phase 2 (Content Extraction) | Upload 5 MB Excel file -- memory stays < 200 MB |
| Preview XSS (Pitfall 6) | Phase 3 (File Preview) | Upload malicious test PDF -- no script execution in preview |
| Storage abstraction leak (Pitfall 7) | Phase 1 (Upload Infrastructure) | Switch storage backend config -- no code changes outside storage module |
| Token budget blindness (Pitfall 8) | Phase 4 (Chat Integration) | Attach 50-page PDF to conversation -- AI responds normally, no truncation errors |

---

## Sources

### HIGH Confidence (Official Documentation / Direct Experience)

- [Next.js App Router File Upload -- body size limit deprecation](https://github.com/vercel/next.js/issues/34213) -- Official GitHub issue confirming Pages Router config does not work in App Router
- [Next.js GitHub Issue #72863 -- mammoth.js Turbopack incompatibility](https://github.com/vercel/next.js/issues/72863) -- Confirmed Turbopack module resolution failure with mammoth.js
- [SheetJS Issue #2707 -- XLSX cannot be streamed](https://github.com/SheetJS/sheetjs/issues/2707) -- Maintainer confirms: "XLSX is a ZIP-based file format and cannot be incrementally processed with a streaming data source"
- [pdf-lib Issue #197 -- Heap OOM on large PDFs](https://github.com/Hopding/pdf-lib/issues/197) -- Confirmed entire `Uint8Array` loaded into memory
- [pdf-parse missing debug file crash](https://medium.com/@mbmrajatit/how-a-missing-debug-file-in-pdf-parse-crashed-my-node-js-app-and-how-i-fixed-it-be5ba7077527) -- Real production crash from `pdfjs-dist` dependency issue
- [OWASP File Upload Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/10-Business_Logic_Testing/09-Test_Upload_of_Malicious_Files) -- Official security testing methodology for file uploads
- [PortSwigger: File Upload Vulnerabilities](https://portswigger.net/web-security/file-upload) -- Comprehensive guide on file upload attack vectors

### MEDIUM Confidence (Industry Research / Multiple Credible Sources)

- [Why Abstracting Away from Object Storage Like S3 is Always a Good Idea](https://elasticscale.com/blog/abstracting-away-from-object-storage-like-s3-is-always-a-good-idea/) -- Testing and abstraction rationale for S3
- [PortSwigger: Fickle PDFs -- Exploiting Browser Rendering Discrepancies](https://portswigger.net/research/fickle-pdfs-exploiting-browser-rendering-discrepancies) -- PDF-based security exploitation research
- [Google Bug Hunters: SafeContentFrame](https://bughunters.google.com/blog/beyond-sandbox-domains-rendering-untrusted-web-content-with-safecontentframe) -- Google's approach to rendering untrusted content
- [Transloadit: Secure API File Uploads with Magic Numbers](https://transloadit.com/devtips/secure-api-file-uploads-with-magic-numbers/) -- Magic byte validation implementation guide
- [Google Magika: AI-Powered File Type Detector](https://blog.logrocket.com/using-google-magika-build-ai-powered-file-type-detector/) -- Deep-learning file identification tool
- [pompelmi: File Scanner for Node.js](https://github.com/pompelmi/pompelmi) -- YARA-based malware scanning and ZIP bomb protection
- [Cloudmersive: Why ZIP Uploads are Dangerous](https://cloudmersive.com/article/Why-ZIP-Uploads-are-Dangerous) -- ZIP bomb and double-extension spoofing attacks
- [mammoth.js GitHub Issues #6, #71, #129, #187, #200, #213](https://github.com/mwilliamson/mammoth.js/issues) -- Documented limitations: tables, images, fragments, style mappings
- [Dromo: Best Practices for Handling Large CSV Files](https://dromo.io/blog/best-practices-handling-large-csv-files) -- Streaming and chunked processing patterns
- [Next.js file upload mistakes (Medium / Codetodeploy)](https://medium.com/codetodeploy/what-i-learned-about-file-uploads-in-next-js-and-the-mistakes-i-made-first-51481dab75fe) -- Real-world mistakes in Next.js file upload implementation

### LOW Confidence (Single Source / Unverified -- Flagged for Validation)

- Reddit: SheetJS 1.5 MB file taking 50 seconds to parse -- anecdotal, may be hardware-dependent
- Mammoth.js Turbopack fix status -- may have been resolved in newer Next.js/mammoth versions; verify before implementation

### Codebase-Specific Notes

- Existing `content-filter.ts` only checks text patterns, not binary payloads or script injection
- Existing `skills/file-processing.ts` reads local filesystem paths, incompatible with uploaded file storage
- Existing `messages` table has no file attachment field -- schema extension required
- Existing middleware protects `/api/*` routes but file preview URLs need specific attention
- Project uses Turbopack (`npm run dev --turbopack`) -- any library incompatible with Turbopack is a direct blocker

---

*Pitfalls research for: Next-Mind v1.2 File Upload, Processing & Management*
*Context: Adding multi-type file support to existing Next.js 16 AI Agent collaboration platform*
*Researched: 2026-03-26*
