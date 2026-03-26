# Requirements: Next-Mind v1.2 文件处理

**Defined:** 2026-03-26
**Core Value:** 让团队成员通过统一的对话界面，高效处理文件、管理知识、调用工具，完成80%以上的日常工作任务

## v1.2 Requirements

Requirements for v1.2 milestone. Each maps to roadmap phases.

### Upload & Storage (UPLD)

- [ ] **UPLD-01**: User can upload files by dragging and dropping them into the chat input area
- [ ] **UPLD-02**: User can upload files by clicking an attachment button (+/paperclip icon) in the chat input
- [ ] **UPLD-03**: System validates file type on both client and server, accepting only PDF, Word (.docx), code files, CSV, and Excel (.xlsx)
- [ ] **UPLD-04**: System rejects files exceeding 100MB with a clear error message stating the limit
- [ ] **UPLD-05**: User sees upload progress indicator (progress bar or spinner) during file upload
- [ ] **UPLD-06**: User sees file preview cards (filename, type icon, size) above chat input after upload, and can remove a file before sending
- [ ] **UPLD-07**: System stores uploaded files via an abstract storage layer that supports both local filesystem and cloud storage (S3/R2) without changing business logic
- [ ] **UPLD-08**: System uses streaming upload (busboy) for files over 10MB to handle large files within Next.js App Router limits

### Content Extraction & Conversion (EXTR)

- [ ] **EXTR-01**: System extracts text content from PDF files using unpdf
- [ ] **EXTR-02**: System extracts text content from Word (.docx) files using mammoth
- [ ] **EXTR-03**: System reads code files directly (native fs), detecting and preserving syntax
- [ ] **EXTR-04**: System parses CSV files using papaparse into structured data
- [ ] **EXTR-05**: System parses Excel (.xlsx) files using exceljs into structured data
- [ ] **EXTR-06**: System runs content extraction asynchronously after upload to avoid request timeouts
- [ ] **EXTR-07**: System tracks extraction status (uploading, processing, ready, failed) with error messages on failure
- [ ] **EXTR-08**: System converts PDF extracted text to Markdown format
- [ ] **EXTR-09**: System converts Word documents to Markdown via mammoth (docx→HTML) + turndown (HTML→Markdown)

### File Management & Preview (MGMT)

- [ ] **MGMT-01**: User can view a list of all uploaded files with metadata (filename, type, size, upload date, status)
- [ ] **MGMT-02**: User can delete uploaded files (removes both storage and database record)
- [ ] **MGMT-03**: User can filter file list by file type category (document, code, data)
- [ ] **MGMT-04**: User can preview extracted file content in a viewer panel (Markdown rendered for documents, syntax highlighted for code, table view for data files)
- [ ] **MGMT-05**: System auto-classifies uploaded files based on content analysis (not just file extension)

### Chat Integration (CHAT)

- [ ] **CHAT-01**: User can attach files to chat messages and have the AI respond based on file content
- [ ] **CHAT-02**: System injects extracted file content into LLM context with clear delimiters when a message references files
- [ ] **CHAT-03**: User can attach multiple files to a single message and have the AI reason across all of them
- [ ] **CHAT-04**: System manages token budget when injecting file content, truncating if necessary to stay within model context limits
- [ ] **CHAT-05**: User can edit extracted file content (Markdown editor) before sending to the AI, and the AI uses the edited version

### Skills Integration (SKIL)

- [ ] **SKIL-01**: File content extraction is available as a Skill (file-extract) for agent workflows
- [ ] **SKIL-02**: File format conversion is available as a Skill (file-convert) for agent workflows
- [ ] **SKIL-03**: File classification is available as a Skill (file-classify) for agent workflows
- [ ] **SKIL-04**: Updated file-list and file-read Skills work with the new storage layer and database

### Database Schema (DB)

- [ ] **DB-01**: System has a `files` table storing metadata (id, userId, filename, mimeType, size, fileType, storagePath, extractedContent, extractedMarkdown, classification, status, errorMessage, timestamps)
- [ ] **DB-02**: System has a `conversationFiles` junction table linking files to conversations

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### RAG Knowledge Retrieval

- **RAG-01**: User can search across all uploaded file content using semantic search
- **RAG-02**: System automatically retrieves relevant file content based on conversation context
- **RAG-03**: User can manage knowledge bases from uploaded files

### Advanced File Processing

- **FILE-01**: System supports OCR for scanned/image-based PDFs (Tesseract.js)
- **FILE-02**: User can view PDF files visually in-browser (pdfjs-dist rendering)
- **FILE-03**: System supports PPTX file extraction and conversion
- **FILE-04**: System supports direct-to-cloud upload via presigned URLs for large files

### Collaboration

- **COLL-01**: Multiple users can collaboratively edit extracted file content in real-time

## Out of Scope

| Feature | Reason |
|---------|--------|
| 图片/扫描件处理 | OCR 是独立领域，依赖重（Tesseract.js 20MB+），CJK 准确度存疑，延后 |
| 文件版本控制 | 团队工具暂不需要多版本追踪，重新上传即可 |
| 实时协同编辑 | 需要 CRDT/OT 基础设施，复杂度过高，延后 |
| Presigned URL 直传 | 100MB 以下服务端流式上传足够，presigned URL 在 500MB+ 时才有价值 |
| Excel 公式计算 | 仅读取单元格值，公式求值延后 |
| 文件全文搜索 | 依赖未来 RAG 系统 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UPLD-01 | TBD | Pending |
| UPLD-02 | TBD | Pending |
| UPLD-03 | TBD | Pending |
| UPLD-04 | TBD | Pending |
| UPLD-05 | TBD | Pending |
| UPLD-06 | TBD | Pending |
| UPLD-07 | TBD | Pending |
| UPLD-08 | TBD | Pending |
| EXTR-01 | TBD | Pending |
| EXTR-02 | TBD | Pending |
| EXTR-03 | TBD | Pending |
| EXTR-04 | TBD | Pending |
| EXTR-05 | TBD | Pending |
| EXTR-06 | TBD | Pending |
| EXTR-07 | TBD | Pending |
| EXTR-08 | TBD | Pending |
| EXTR-09 | TBD | Pending |
| MGMT-01 | TBD | Pending |
| MGMT-02 | TBD | Pending |
| MGMT-03 | TBD | Pending |
| MGMT-04 | TBD | Pending |
| MGMT-05 | TBD | Pending |
| CHAT-01 | TBD | Pending |
| CHAT-02 | TBD | Pending |
| CHAT-03 | TBD | Pending |
| CHAT-04 | TBD | Pending |
| CHAT-05 | TBD | Pending |
| SKIL-01 | TBD | Pending |
| SKIL-02 | TBD | Pending |
| SKIL-03 | TBD | Pending |
| SKIL-04 | TBD | Pending |
| DB-01 | TBD | Pending |
| DB-02 | TBD | Pending |

**Coverage:**
- v1.2 requirements: 28 total
- Mapped to phases: 0
- Unmapped: 28 ⚠️

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after initial definition*
