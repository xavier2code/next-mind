# Phase 8: Content Extraction - Research

**Researched:** 2026-03-26
**Domain:** Server-side file content extraction (PDF, DOCX, code, CSV, Excel) with async processing, status tracking, and Markdown conversion
**Confidence:** HIGH

## Summary

Phase 8 builds the content extraction pipeline that runs after file upload (Phase 7). It transforms raw uploaded files into two formats: `extractedContent` (raw text or JSON for programmatic use) and `extractedMarkdown` (Markdown for human readability and LLM consumption). The extraction is triggered asynchronously after upload via fire-and-forget, with status tracking through the existing `FileStatusEnum` states (`uploaded` -> `processing` -> `ready`/`failed`).

The extraction module uses a strategy pattern with one extractor per file type. All parsing libraries (unpdf, mammoth, turndown, papaparse, exceljs) are loaded via dynamic `import()` to bypass Turbopack build-time parsing issues, particularly the known mammoth.js incompatibility (Next.js issue #72863). The mammoth DOCX pipeline goes through two stages: `mammoth.convertToHtml()` then `turndown.turndown()` to produce Markdown. PDF uses `unpdf.extractText()` followed by rule-based text-to-Markdown conversion. Data files (CSV/Excel) produce both Markdown tables and JSON strings per D-07.

The primary integration point is `src/app/api/files/upload/route.ts` where extraction is triggered after `createFile()`. Two new API endpoints are needed: status polling (`GET /api/files/[id]/status`) and manual retry (`POST /api/files/[id]/extract`). New DB query functions (`updateFileStatus`, `getFileById`) extend `src/lib/db/queries.ts`.

**Primary recommendation:** Build `src/lib/extraction/` with a strategy pattern dispatcher and per-type extractors. Use dynamic imports for all parsing libraries. Fire-and-forget extraction from the upload route. 30-second per-file timeout with concurrency limiting.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01**: Extraction trigger timing -- async fire-and-forget after upload API successfully stores file. Status starts at 'uploaded', transitions to 'processing', then 'ready' or 'failed'.

**D-02**: Failure handling -- manual retry only. No auto-retry. Failed files get status='failed' with errorMessage. Users trigger retry from file management UI.

**D-03**: Status polling -- client polls `GET /api/files/:id/status` periodically. Simple implementation matching existing project patterns.

**D-04**: Library loading -- all parsing libraries (unpdf, mammoth, turndown, papaparse, exceljs) loaded via dynamic `import()` to bypass Turbopack and reduce memory footprint.

**D-05**: Per-file timeout -- 30 seconds. On timeout, status='failed', errorMessage records timeout info.

**D-06**: mammoth Turbopack strategy -- dynamic `import()` to bypass Turbopack build-time parsing. Extraction runs in pure Node.js runtime (`runtime='nodejs'` in route handler). Verify this works; fallback to webpack override or alternative if needed.

**D-07**: CSV/Excel storage -- dual format: `extractedMarkdown` stores Markdown table (human-readable + LLM), `extractedContent` stores JSON string (programmatic + Phase 9 table view).

**D-08**: Row limit -- Excel/CSV limited to first 1000 rows. Overflow discarded with warning in errorMessage.

**D-09**: Multi-sheet -- only first Excel sheet read, others ignored.

**D-10**: Structure preservation -- Markdown preserves headings, tables (GFM), lists (ordered/unordered), bold/italic. Conversion losses marked with HTML comments (`<!-- [description] -->`).

**D-11**: PDF-to-Markdown -- rule-based text conversion after unpdf extraction. Simple rules for heading detection, paragraph splitting. No additional Markdown conversion library.

### Claude's Discretion

- Polling interval (suggest 2-3 seconds, stop when extraction completes)
- PDF heading detection rules (font size changes, all-caps lines, numbered patterns, etc.)
- Extraction module directory structure (suggest `src/lib/extraction/` with per-file-type strategy)
- Concurrency control (suggest max N concurrent extractions to prevent memory overflow)
- Error message formatting
- Markdown table column alignment
- Code file language detection (extension-based mapping)

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXTR-01 | System extracts text content from PDF files using unpdf | unpdf v1.4.0 `extractText()` API verified. Two-step: `getDocumentProxy(buffer)` then `extractText(pdf, { mergePages: true })`. Returns `{ totalPages, text }`. Serverless-optimized PDF.js build included. |
| EXTR-02 | System extracts text content from Word (.docx) files using mammoth | mammoth v1.12.0 `convertToHtml({ buffer })` API verified. Returns `{ value: html, messages: warnings[] }`. Must use dynamic import() per D-04/D-06. |
| EXTR-03 | System reads code files directly (native fs), detecting and preserving syntax | Code files read from storage via `getFile(storagePath)` returning Buffer. No parsing library needed. Language detection via file extension mapping. |
| EXTR-04 | System parses CSV files using papaparse into structured data | papaparse v5.5.3 `Papa.parse(buffer.toString(), { header: true })` returns `{ data: Record<string, string>[], errors, meta }`. Row limit 1000 per D-08. |
| EXTR-05 | System parses Excel (.xlsx) files using exceljs into structured data | exceljs v4.4.0 `workbook.xlsx.load(buffer)` then `worksheet.getRows()`. First sheet only per D-09. Row limit 1000 per D-08. |
| EXTR-06 | System runs content extraction asynchronously after upload to avoid request timeouts | Fire-and-forget pattern established in project (see `logAudit().catch(() => {})`). Upload route returns immediately after `createFile()`, then calls `extractFile(fileId)` without awaiting. |
| EXTR-07 | System tracks extraction status (uploading, processing, ready, failed) with error messages on failure | `FileStatusEnum` already defined in schema.ts: `['uploaded', 'processing', 'ready', 'failed']`. `errorMessage` column exists on `files` table. Status polling endpoint needed. |
| EXTR-08 | System converts PDF extracted text to Markdown format | Rule-based conversion per D-11. unpdf extracts raw text; post-processing adds Markdown headings/paragraphs based on heuristics (line length, capitalization, numbering). |
| EXTR-09 | System converts Word documents to Markdown via mammoth (docx->HTML) + turndown (HTML->Markdown) | mammoth v1.12.0 produces HTML; turndown v7.2.2 converts to Markdown. GFM tables supported via turndown plugin or built-in. Pipeline: `buffer -> mammoth.convertToHtml() -> turndown.turndown() -> Markdown`. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Path alias**: `@/*` maps to `./src/*` -- use in all imports
- **Testing**: Vitest + jsdom, test files in `tests/`, setup in `tests/setup.ts`
- **Audit logging**: `logAudit()` from `src/lib/audit.ts` for security events, fire-and-forget pattern (`.catch(() => {})`)
- **Monitoring**: `logger` from `src/lib/monitoring.ts`, `generateRequestId()` for request tracing
- **Database**: Drizzle ORM, queries in `src/lib/db/queries.ts`
- **Runtime**: Route handlers with `export const runtime = 'nodejs'` for busboy/extraction
- **API pattern**: `auth()` -> validate -> process -> respond; errors via `NextResponse.json({ error: 'msg' }, { status: N })`
- **Decorators**: `experimentalDecorators` enabled -- if extraction skills use decorators later
- **Singletons**: Various singletons exist (WaveScheduler, WorkflowController) -- extraction coordinator could use similar pattern but must note Redis limitation for multi-instance

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **unpdf** | 1.4.0 | PDF text extraction | Built by UnJS (same ecosystem as unstorage). Serverless-optimized PDF.js build. `extractText()` returns merged text with page count. Zero dependencies. Verified via npm registry 2026-03-26. |
| **mammoth** | 1.12.0 | DOCX to HTML conversion | Most popular .docx-to-HTML converter. ~50KB, no native deps. Configurable via style map. Verified via npm registry 2026-03-26. |
| **turndown** | 7.2.2 | HTML to Markdown conversion | De facto standard for HTML-to-Markdown in JS. Plugin architecture supports GFM tables. Verified via npm registry 2026-03-26. |
| **@types/turndown** | 5.0.6 | TypeScript types for turndown | Type definitions. Verified via npm registry 2026-03-26. |
| **papaparse** | 5.5.3 | CSV parsing | Industry standard. Streaming support, auto-detects delimiters, header mapping. ~30KB. Verified via npm registry 2026-03-26. |
| **exceljs** | 4.4.0 | Excel (.xlsx) reading | MIT-licensed, no feature gating. OOP API with streaming. Reads .xlsx/.xls. Verified via npm registry 2026-03-26. |
| **@types/papaparse** | 5.5.2 | TypeScript types for papaparse | Type definitions. Verified via npm registry 2026-03-26. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **unstorage** | (existing) | Read uploaded files via `getFile()` | Every extraction starts by reading the file from storage |
| **Drizzle ORM** | (existing) | Update file status in DB | Status transitions: uploaded->processing->ready/failed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| unpdf | pdf-parse (2.4.5) | pdf-parse relies on older pdf.js v2, has known debug worker issues, unmaintained |
| mammoth+turndown | docx2md | Less maintained, worse formatting preservation |
| exceljs | SheetJS community edition | Features moving behind commercial Pro license |
| Dynamic import() | webpack override for mammoth | More complex, fights Turbopack; dynamic import() is simpler and works per D-06 |

**Installation:**
```bash
npm install unpdf mammoth turndown papaparse exceljs
npm install -D @types/turndown @types/papaparse
```

**Version verification:** All versions verified via `npm view` on 2026-03-26. All match STACK.md recommendations.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    extraction/                  # NEW - Content extraction module
      types.ts                   # ExtractorResult interface, ExtractorType enum
      dispatcher.ts              # Main extraction coordinator (strategy dispatcher)
      extractors/
        pdf-extractor.ts         # PDF text extraction + Markdown conversion
        docx-extractor.ts        # DOCX -> HTML -> Markdown pipeline
        code-extractor.ts        # Code file direct read with language detection
        csv-extractor.ts         # CSV parsing with row limit
        excel-extractor.ts       # Excel parsing with row/sheet limit
      concurrency.ts             # Concurrency limiter (max N simultaneous)
      markdown/
        pdf-to-markdown.ts       # Rule-based PDF text -> Markdown converter
        html-to-markdown.ts      # mammoth HTML -> turndown Markdown wrapper
        table-formatter.ts       # JSON data -> Markdown table generator
    db/
      queries.ts                 # MODIFIED - add updateFileStatus(), getFileById()
  app/
    api/
      files/
        [id]/
          status/
            route.ts             # NEW - GET /api/files/:id/status
          extract/
            route.ts             # NEW - POST /api/files/:id/extract (manual retry)
        upload/
          route.ts               # MODIFIED - trigger extraction after createFile()
tests/
  lib/
    extraction/                  # NEW - Extraction unit tests
      pdf-extractor.test.ts
      docx-extractor.test.ts
      code-extractor.test.ts
      csv-extractor.test.ts
      excel-extractor.test.ts
      dispatcher.test.ts
```

### Pattern 1: Strategy Pattern Dispatcher

**What:** Each file type has a dedicated extractor implementing a common interface. A dispatcher routes files to the correct extractor based on `fileType` from the database record.

**When to use:** All content extraction operations. The upload route calls `extractFile(fileId)` which the dispatcher routes to the appropriate extractor.

**Example:**
```typescript
// src/lib/extraction/types.ts
export interface ExtractorResult {
  extractedContent: string;  // Raw text or JSON string
  extractedMarkdown: string; // Markdown format
  warnings?: string[];       // Non-fatal conversion issues
}

export interface Extractor {
  extract(buffer: Buffer, filename: string): Promise<ExtractorResult>;
}

// src/lib/extraction/dispatcher.ts
import { getFileType } from '@/lib/storage/types';
import type { Extractor, ExtractorResult } from './types';

export async function extractFile(fileId: string): Promise<void> {
  // 1. Get file record from DB
  const file = await getFileById(fileId);
  if (!file) throw new Error(`File ${fileId} not found`);

  // 2. Update status to 'processing'
  await updateFileStatus(fileId, 'processing');

  // 3. Read file from storage
  const buffer = await getFile(file.storagePath);
  if (!buffer) throw new Error(`Storage file ${file.storagePath} not found`);

  // 4. Route to correct extractor based on fileType
  const extractor = getExtractor(file.fileType);

  // 5. Extract with 30s timeout
  const result = await withTimeout(extractor.extract(buffer, file.filename), 30_000);

  // 6. Save results to DB
  await updateFileExtraction(fileId, {
    extractedContent: result.extractedContent,
    extractedMarkdown: result.extractedMarkdown,
    status: 'ready',
    errorMessage: result.warnings?.length ? result.warnings.join('; ') : null,
  });
}
```

### Pattern 2: Dynamic Import for Parsing Libraries

**What:** All parsing libraries are loaded via `import()` inside async functions, never at module top-level. This prevents Turbopack from attempting to bundle them at build time.

**When to use:** Every extractor that uses a third-party parsing library.

**Example:**
```typescript
// src/lib/extraction/extractors/docx-extractor.ts
import type { Extractor, ExtractorResult } from '../types';

export class DocxExtractor implements Extractor {
  async extract(buffer: Buffer, filename: string): Promise<ExtractorResult> {
    // Dynamic import to bypass Turbopack
    const mammoth = await import('mammoth');
    const { default: TurndownService } = await import('turndown');

    // Step 1: DOCX -> HTML
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) });
    const html = result.value;

    // Step 2: HTML -> Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    const markdown = turndownService.turndown(html);

    return {
      extractedContent: html,
      extractedMarkdown: markdown,
      warnings: result.messages.map(m => m.message),
    };
  }
}
```

### Pattern 3: Fire-and-Forget Extraction Trigger

**What:** After the upload route saves the file and creates the DB record, it calls `extractFile(fileId)` without awaiting. Errors are caught internally and set status='failed'. This matches the existing `logAudit().catch(() => {})` pattern.

**When to use:** Upload route integration point.

**Example:**
```typescript
// In upload/route.ts after createFile():
// Fire-and-forget extraction (per D-01)
extractFile(dbFile.id).catch((error) => {
  logger.error('upload', 'Extraction failed', error instanceof Error ? error : new Error(String(error)), { fileId: dbFile.id });
});

// Return immediately -- don't await extraction
return NextResponse.json({ ...result });
```

### Pattern 4: Timeout Wrapper

**What:** A generic `withTimeout()` utility that wraps any promise with a timeout. Used for the 30-second per-file extraction limit (D-05).

**When to use:** Wrapping every extractor call.

**Example:**
```typescript
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Extraction timed out after ${ms}ms`)), ms)
    ),
  ]);
}
```

### Anti-Patterns to Avoid

- **Synchronous extraction in upload handler:** Blocks the response for 5-30 seconds. Always fire-and-forget.
- **Top-level import of parsing libraries:** Causes Turbopack build failures (mammoth) and unnecessary bundling. Always dynamic import().
- **No concurrency control:** Multiple large file uploads could trigger parallel extractions, exhausting memory. Use a semaphore.
- **Storing full file buffer in extraction closure:** For Excel/CSV, process rows incrementally. Don't hold the full parsed result in memory longer than needed.
- **Ignoring mammoth warnings:** mammoth returns `{ messages: [...] }` with conversion warnings. Log these as extraction warnings.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | unpdf `extractText()` | PDF format is extremely complex; unpdf wraps PDF.js with serverless-optimized build |
| DOCX to HTML | Custom XML parser for OOXML | mammoth `convertToHtml()` | OOXML is deeply nested XML; mammoth handles paragraphs, runs, styles, tables |
| HTML to Markdown | Custom regex-based converter | turndown `TurndownService` | HTML-to-Markdown has many edge cases (nested tags, attributes, entities); turndown is battle-tested |
| CSV parsing | Custom delimiter/quote detection | papaparse `Papa.parse()` | CSV has RFC 4180 edge cases (quoted fields, escaped quotes, different delimiters); papaparse handles all |
| Excel reading | Custom ZIP+XML parser for XLSX | exceljs `workbook.xlsx.load()` | XLSX is ZIP of XML files with shared strings; exceljs handles cell types, dates, formulas |
| Timeout logic | Custom setTimeout with cleanup | `Promise.race()` pattern | Simple, composable, handles rejection correctly |
| Concurrency control | Custom queue with array manipulation | Simple semaphore with `Array.shift()` | A max-N semaphore is ~20 lines and sufficient for this use case |

**Key insight:** File format parsing is a solved problem with mature libraries. Hand-rolling any of these would introduce bugs, miss edge cases, and waste development time. The only custom code needed is the orchestration (strategy dispatcher, status management, timeout) and the PDF text-to-Markdown rule-based converter (D-11).

## Common Pitfalls

### Pitfall 1: mammoth.js Turbopack Build Failure

**What goes wrong:** Next.js dev server fails to start or build after adding mammoth.js. Turbopack cannot resolve mammoth's module structure (documented in Next.js issue #72863).

**Why it happens:** mammoth uses module patterns that Turbopack's resolver doesn't handle. The issue is at build/bundle time, not runtime.

**How to avoid:** Dynamic `import('mammoth')` inside an async function that only runs in a Node.js runtime route handler (`export const runtime = 'nodejs'`). This prevents Turbopack from analyzing mammoth at build time. The extraction route already uses `runtime = 'nodejs'` (inherited from the upload route pattern).

**Warning signs:** Dev server crash on startup after adding `import mammoth from 'mammoth'` at top of file. Build errors mentioning mammoth or its dependencies.

**Verification needed:** Must confirm that dynamic `import('mammoth')` works in a `runtime = 'nodejs'` route handler with Turbopack. If it doesn't, fallback: use `next.config.ts` `serverExternalPackages` to exclude mammoth from bundling.

### Pitfall 2: PDF Memory Exhaustion

**What goes wrong:** A large PDF (30+ MB) consumes several hundred MB during parsing, potentially causing OOM crashes.

**Why it happens:** unpdf's underlying PDF.js loads the document structure into memory. A 50 MB PDF can expand to 500 MB+ in parsed form.

**How to avoid:** The 30-second timeout (D-05) provides indirect protection. Additionally, consider setting a per-file size limit for PDF extraction (e.g., skip PDFs over 50 MB with a warning). The project already limits uploads to 100 MB.

**Warning signs:** Memory spikes during extraction, process OOM kills.

### Pitfall 3: Excel Memory Explosion

**What goes wrong:** A 5 MB .xlsx file consumes 500 MB+ of RAM during parsing because XLSX is a ZIP of XML.

**Why it happens:** exceljs loads the full workbook structure. Parsed objects are much larger than the compressed ZIP.

**How to avoid:** The 1000-row limit (D-08) limits the parsed data. Read only the first sheet (D-09). The 30-second timeout (D-05) catches slow parses. For additional safety, process rows one at a time rather than loading all rows into an array before formatting.

**Warning signs:** Parsing time exceeds 10 seconds for files under 5 MB.

### Pitfall 4: CSV Encoding Issues

**What goes wrong:** CSV files with non-UTF-8 encoding (GBK, Shift-JIS) produce garbled text.

**Why it happens:** papaparse assumes UTF-8 by default. Many Chinese CSV files use GBK encoding.

**How to avoid:** papaparse does not support encoding detection. For the initial implementation, assume UTF-8 (matching the project's Chinese LLM focus). If encoding issues arise, add a detection step using the `jschardet` library in a future iteration.

**Warning signs:** Chinese characters appear as garbled text in extracted content.

### Pitfall 5: Race Condition on Status Update

**What goes wrong:** Status updates from extraction conflict with other operations (e.g., user deletes file while extraction is running).

**Why it happens:** The fire-and-forget pattern has no coordination with other API operations.

**How to avoid:** Check file exists and status is 'uploaded' or 'failed' before starting extraction. Use atomic status update (only transition if current status matches expected). If file is deleted mid-extraction, the DB update will fail silently (file not found), which is acceptable.

**Warning signs:** Files stuck in 'processing' status forever, or 'ready' status on deleted files.

## Code Examples

Verified patterns from official sources:

### PDF Text Extraction (unpdf)
```typescript
// Source: https://github.com/unjs/unpdf (official README, verified 2026-03-26)
import { extractText, getDocumentProxy } from 'unpdf';

const pdf = await getDocumentProxy(new Uint8Array(buffer));
const { totalPages, text } = await extractText(pdf, { mergePages: true });
// text: full document text as single string
// totalPages: number of pages
```

### DOCX to Markdown (mammoth + turndown)
```typescript
// Source: mammoth npm README + turndown GitHub README (verified 2026-03-26)
const mammoth = await import('mammoth');
const { default: TurndownService } = await import('turndown');

// Step 1: DOCX buffer -> HTML
const result = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) });
const html = result.value;
const warnings = result.messages; // ConversionWarning[]

// Step 2: HTML -> Markdown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});
const markdown = turndownService.turndown(html);
```

### CSV Parsing (papaparse)
```typescript
// Source: papaparse npm README (verified 2026-03-26)
const Papa = await import('papaparse');
const result = Papa.parse(buffer.toString('utf-8'), {
  header: true,        // First row as headers
  skipEmptyLines: true,
  // Note: row limiting done post-parse (take first 1000)
});
// result.data: Record<string, string>[]
// result.errors: ParseError[]
// result.meta: { fields: string[], delimiter: string }
```

### Excel Parsing (exceljs)
```typescript
// Source: exceljs npm README (verified 2026-03-26)
const ExcelJS = await import('exceljs');
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);

// First sheet only (D-09)
const worksheet = workbook.worksheets[0];
if (!worksheet) throw new Error('Excel file has no sheets');

const rows: Record<string, unknown>[] = [];
const headerRow = worksheet.getRow(1);
const headers = headerRow.values as (string | undefined)[];

// Read rows with 1000-row limit (D-08)
let rowCount = 0;
for await (const row of worksheet.getRows(2, 1000) || []) {
  if (!row) continue;
  rowCount++;
  const values = row.values as (string | number | undefined)[];
  const record: Record<string, unknown> = {};
  for (let i = 1; i < headers.length; i++) {
    record[headers[i] || `col_${i}`] = values[i] ?? '';
  }
  rows.push(record);
}
```

### JSON to Markdown Table
```typescript
// For CSV/Excel dual-format storage (D-07)
function jsonToMarkdownTable(
  headers: string[],
  rows: Record<string, unknown>[],
  maxRows: number
): string {
  const displayRows = rows.slice(0, maxRows);
  const headerLine = '| ' + headers.join(' | ') + ' |';
  const separatorLine = '| ' + headers.map(() => '---').join(' | ') + ' |';
  const dataLines = displayRows.map(row =>
    '| ' + headers.map(h => String(row[h] ?? '')).join(' | ') + ' |'
  );
  return [headerLine, separatorLine, ...dataLines].join('\n');
}
```

### Concurrency Limiter (Simple Semaphore)
```typescript
// Limits parallel extractions to prevent memory overflow
class ExtractionSemaphore {
  private queue: (() => void)[] = [];
  private active = 0;

  constructor(private maxConcurrency: number = 3) {}

  async acquire(): Promise<void> {
    if (this.active < this.maxConcurrency) {
      this.active++;
      return;
    }
    return new Promise<void>(resolve => this.queue.push(resolve));
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) {
      this.active++;
      next();
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pdf-parse (unmaintained) | unpdf (active, serverless-optimized) | 2024-2025 | Better Node.js/Deno compatibility, smaller bundle |
| Top-level imports | Dynamic `import()` for heavy libs | Next.js 13+ App Router | Prevents Turbopack bundling issues |
| Synchronous extraction | Fire-and-forget async extraction | Modern pattern | Non-blocking upload response |
| Single extraction pipeline | Strategy pattern per file type | Standard pattern | Independently testable, extensible |

**Deprecated/outdated:**
- pdf-parse: Unmaintained since ~2021, relies on old pdf.js v2
- SheetJS community edition: Features moving to commercial Pro license
- Synchronous `fs.readFile` in extraction: Blocks event loop; use async storage layer instead

## Open Questions

1. **mammoth dynamic import() in Turbopack**
   - What we know: Dynamic import() in `runtime='nodejs'` route handlers should bypass Turbopack analysis. The upload route already uses this runtime.
   - What's unclear: Whether Turbopack still attempts to resolve dynamically imported modules at build time.
   - Recommendation: Implement with dynamic import() first. If Turbopack fails, add `mammoth` to `serverExternalPackages` in `next.config.ts`. Test early in Wave 0.

2. **Concurrency limit value**
   - What we know: Need some limit to prevent memory overflow. The agent workflow system uses MAX_CONCURRENCY=3.
   - What's unclear: Optimal value for extraction. PDF parsing is CPU-intensive; Excel is memory-intensive.
   - Recommendation: Start with max 2 concurrent extractions (conservative, matching CPU-bound nature of parsing). Adjust based on testing.

3. **PDF text-to-Markdown rule quality**
   - What we know: unpdf extracts raw text with minimal structure. Need heuristics to detect headings, paragraphs, lists.
   - What's unclear: How well simple rules (line length, capitalization, numbering) work across diverse PDF types (academic papers, reports, slides).
   - Recommendation: Start with basic rules. Accept that PDF Markdown quality will vary. Complex PDFs may need LLM-based post-processing in a future phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All extraction (runtime='nodejs') | Yes | (Darwin 25.3.0) | -- |
| PostgreSQL | File status updates | Yes | (via Drizzle) | -- |
| unstorage | Reading uploaded files | Yes | (installed in Phase 7) | -- |
| unpdf | EXTR-01, EXTR-08 | No | Not installed | Must install |
| mammoth | EXTR-02, EXTR-09 | No | Not installed | Must install |
| turndown | EXTR-09 | No | Not installed | Must install |
| papaparse | EXTR-04 | No | Not installed | Must install |
| exceljs | EXTR-05 | No | Not installed | Must install |
| @types/turndown | TypeScript types | No | Not installed | Must install |
| @types/papaparse | TypeScript types | No | Not installed | Must install |

**Missing dependencies with no fallback:**
- None -- all can be installed via npm.

**Missing dependencies with fallback:**
- None -- all are standard npm packages with no system-level requirements.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) + jsdom environment |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/lib/extraction/` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXTR-01 | Extract text from PDF buffer | unit | `npx vitest run tests/lib/extraction/pdf-extractor.test.ts` | No -- Wave 0 |
| EXTR-02 | Extract text from DOCX buffer | unit | `npx vitest run tests/lib/extraction/docx-extractor.test.ts` | No -- Wave 0 |
| EXTR-03 | Read code file and detect language | unit | `npx vitest run tests/lib/extraction/code-extractor.test.ts` | No -- Wave 0 |
| EXTR-04 | Parse CSV into structured data | unit | `npx vitest run tests/lib/extraction/csv-extractor.test.ts` | No -- Wave 0 |
| EXTR-05 | Parse Excel into structured data | unit | `npx vitest run tests/lib/extraction/excel-extractor.test.ts` | No -- Wave 0 |
| EXTR-06 | Extraction runs asynchronously | unit | `npx vitest run tests/lib/extraction/dispatcher.test.ts` | No -- Wave 0 |
| EXTR-07 | Status transitions correctly | unit | `npx vitest run tests/lib/extraction/dispatcher.test.ts` | No -- Wave 0 |
| EXTR-08 | PDF text converted to Markdown | unit | `npx vitest run tests/lib/extraction/pdf-extractor.test.ts` | No -- Wave 0 |
| EXTR-09 | DOCX converted to Markdown | unit | `npx vitest run tests/lib/extraction/docx-extractor.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/lib/extraction/`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/extraction/pdf-extractor.test.ts` -- covers EXTR-01, EXTR-08
- [ ] `tests/lib/extraction/docx-extractor.test.ts` -- covers EXTR-02, EXTR-09
- [ ] `tests/lib/extraction/code-extractor.test.ts` -- covers EXTR-03
- [ ] `tests/lib/extraction/csv-extractor.test.ts` -- covers EXTR-04
- [ ] `tests/lib/extraction/excel-extractor.test.ts` -- covers EXTR-05
- [ ] `tests/lib/extraction/dispatcher.test.ts` -- covers EXTR-06, EXTR-07
- [ ] `tests/lib/extraction/concurrency.test.ts` -- covers concurrency control
- [ ] Test fixtures: sample PDF, DOCX, CSV, XLSX files in `tests/fixtures/extraction/`
- [ ] Framework install: `npm install unpdf mammoth turndown papaparse exceljs` -- not yet installed

## Sources

### Primary (HIGH confidence)
- [unpdf GitHub README](https://github.com/unjs/unpdf) -- `extractText()`, `getDocumentProxy()` API verified. v1.4.0, MIT license, serverless-optimized PDF.js v5.4.394 build.
- [mammoth npm](https://www.npmjs.com/package/mammoth) -- `convertToHtml()` API verified. v1.12.0, permissive license.
- [turndown GitHub](https://github.com/mixmark-io/turndown) -- `TurndownService` API verified. v7.2.2, MIT license.
- [papaparse npm](https://www.npmjs.com/package/papaparse) -- `Papa.parse()` API verified. v5.5.3, MIT license.
- [exceljs npm](https://www.npmjs.com/package/exceljs) -- `Workbook.xlsx.load()` API verified. v4.4.0, MIT license.
- [npm registry](https://www.npmjs.com) -- All package versions verified via `npm view` on 2026-03-26.
- [.planning/research/STACK.md](/.planning/research/STACK.md) -- Pre-verified stack recommendations with version numbers.
- [.planning/research/PITFALLS.md](/.planning/research/PITFALLS.md) -- Pre-identified pitfalls for PDF memory, DOCX conversion loss, mammoth Turbopack, Excel memory.
- [Existing codebase](src/) -- Direct inspection of schema.ts, queries.ts, provider.ts, upload/route.ts, audit.ts, monitoring.ts.

### Secondary (MEDIUM confidence)
- [Next.js issue #72863](https://github.com/vercel/next.js/issues/72863) -- mammoth.js Turbopack incompatibility. No specific fix found in 2026 search; dynamic import() is the recommended workaround.
- [Next.js 16.2 Turbopack improvements](https://nextjs.org/blog/next-16-2-turbopack) -- 200+ bug fixes improved compatibility. No mention of mammoth specifically.
- [Strapi: 7 Best PDF Parsing Libraries (2025)](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) -- Confirms unpdf as modern, TypeScript-friendly option.

### Tertiary (LOW confidence)
- mammoth Turbopack fix status -- May have been silently resolved. No definitive source found. Must verify during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry. All APIs verified against official docs/READMEs.
- Architecture: HIGH - Strategy pattern is well-established. Integration points verified against existing codebase. Fire-and-forget pattern already used in project.
- Pitfalls: HIGH - Pre-identified in PITFALLS.md. mammoth Turbopack issue documented in official Next.js issue tracker. PDF/Excel memory issues well-documented.

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (30 days -- stable domain, no fast-moving dependencies)
