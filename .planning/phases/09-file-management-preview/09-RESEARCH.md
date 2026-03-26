# Phase 9: File Management & Preview - Research

**Researched:** 2026-03-27
**Domain:** Next.js App Router page with file table, type-specific preview rendering, and delete workflow
**Confidence:** HIGH

## Summary

Phase 9 builds a dedicated `/files` page for browsing, previewing, and managing uploaded files. The phase is primarily a frontend undertaking: a split-panel layout with a sortable/paginated file table on the left and a type-specific preview panel on the right. Backend work is limited to a new paginated file-list API endpoint and a delete API endpoint (both lightweight extensions of existing patterns).

The project already has all major rendering dependencies installed: `react-markdown` v10.1, `remark-gfm` v4.0, and `react-syntax-highlighter` v16.1 are already in `package.json` and used in `chat-message.tsx`. The existing `FileChip` component provides reusable `getTypeIcon()` and `formatSize()` functions. The `Dialog` component (from `@base-ui/react`) is available for the delete confirmation. No new npm dependencies are required for the core phase, though `@tanstack/react-table` v8.21 is recommended for the sortable/paginated table rather than hand-rolling one.

The key architectural decision is how the `/files` page relates to the existing `(chat)` route group. The sidebar needs to be shared, but the main content area is completely different. Two approaches exist: (1) move the sidebar into a shared layout at the root level, or (2) create a new route group `(files)` that duplicates the sidebar layout. Approach 1 is cleaner long-term but requires refactoring the chat layout; approach 2 is safer for this phase.

**Primary recommendation:** Use `@tanstack/react-table` for the file list table (sortable, paginated), reuse existing `react-markdown` + `react-syntax-highlighter` for preview rendering, and create a new `(files)` route group with a duplicated sidebar layout to avoid refactoring the chat layout in this phase.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01**: Interface location -- independent page `/files`, not Dialog or sidebar panel. Add Files entry button (FolderOpen icon) below New chat button in sidebar.
- **D-02**: Layout -- left-right split: left file list table, right file preview panel. Default select first file or show empty state.
- **D-03**: Table columns -- all displayed: filename+type icon, file type (document/code/data), file size, upload time, extraction status (ready/processing/failed), actions (preview/delete). Need to build new Table UI component.
- **D-04**: Sort & pagination -- header click toggles sort (filename, size, time, type). Paginated load, 20 per page. Default sort by upload time descending.
- **D-05**: Type filter -- top filter bar supports filtering by fileType: all / document / code / data. Consistent with Phase 7 D-14 three-category enum.
- **D-06**: Preview rendering strategy -- by file type: documents (PDF/DOCX) render extractedMarkdown with react-markdown, code renders extractedContent with syntax highlighting (prismjs or shiki), data files (CSV/Excel) render extractedContent as table (JSON string parsed to table).
- **D-07**: Preview panel header -- shows filename, file type, file size, upload time, extraction status. Extraction failure shows errorMessage and retry button (calls existing `/api/files/[id]/extract` endpoint).
- **D-08**: Delete confirmation -- confirm Dialog: "Confirm delete {filename}? This action cannot be undone." Confirmed call to `deleteFile()` (deletes both DB record and storage file).
- **D-09**: Classification strategy -- reuse fileType three-category (document/code/data), content analysis in extraction phase corrects extension-based classification. E.g., `.json` files judged by content as code (config) or data (dataset). Correction written to files.classification field, does not affect fileType main classification.
- **D-10**: Empty state -- shows empty state illustration + "No files uploaded yet" text + "Upload first file" button (jumps to chat page, guides user to upload in conversation).
- **D-11**: Initial preview state -- right preview panel shows hint message (e.g., "Select a file to preview") when no file selected.

### Claude's Discretion
- Table component specific styling (row height, hover effect, border style)
- Sort icon specific styling
- Pagination control design (prev/next vs page numbers)
- react-markdown specific plugin configuration (GFM, code block styles etc.)
- Syntax highlighting library choice (prismjs vs shiki vs highlight.js)
- Preview panel width and ratio
- Content analysis specific rules and thresholds
- Empty state illustration specific style

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MGMT-01 | User can view a list of all uploaded files with metadata (filename, type, size, upload date, status) | `@tanstack/react-table` for sortable/paginated table; existing `getFilesByUser()` query to extend with pagination/sorting/filtering via Drizzle; existing `formatSize()` and `getTypeIcon()` from FileChip |
| MGMT-02 | User can delete uploaded files (removes both storage and database record) | Existing `deleteFile()` in `queries.ts` deletes DB record; `deleteFile()` in `storage/provider.ts` deletes storage file; new API endpoint `DELETE /api/files/[id]` following existing auth pattern |
| MGMT-03 | User can filter file list by file type category (document, code, data) | `@tanstack/react-table` column filters; Drizzle `eq()` + `ilike` for server-side filter; existing `FileTypeEnum` enum |
| MGMT-04 | User can preview extracted file content in a viewer panel (Markdown rendered for documents, syntax highlighted for code, table view for data files) | Existing `react-markdown` + `remark-gfm` for Markdown; existing `react-syntax-highlighter` (Prism + oneLight) for code; parse JSON string from `extractedContent` for data table |
| MGMT-05 | System auto-classifies uploaded files based on content analysis (not just file extension) | Content analysis runs during extraction phase; corrects `fileType` in DB; `classification` field on files table stores result |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.21.3 | Sortable, paginated data table | Industry standard headless table library; handles sorting, pagination, filtering state; no equivalent in project |
| react-markdown | 10.1.0 (installed) | Render Markdown for document previews | Already in project, used in chat-message.tsx |
| remark-gfm | 4.0.1 (installed) | GFM tables, strikethrough, etc. in Markdown | Already in project, used in chat-message.tsx |
| react-syntax-highlighter | 16.1.1 (installed) | Syntax highlighting for code file previews | Already in project, used in chat-message.tsx with Prism + oneLight style |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @base-ui/react Dialog | 1.3.0 (installed) | Delete confirmation dialog | Already in project as `src/components/ui/dialog.tsx` |
| lucide-react | 1.0.1 (installed) | Icons (FolderOpen, Trash2, Eye, AlertCircle, RefreshCw, etc.) | Already in project |
| drizzle-orm | 0.45.1 (installed) | Paginated queries with `limit`/`offset` + `asc()`/`desc()` | Already in project, need to extend queries.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tanstack/react-table | Hand-rolled table with useState | Hand-rolling sorting + pagination + filtering is ~300-500 LOC of edge-case-prone code; tanstack gives this for free with headless rendering |
| @tanstack/react-table | MUI DataGrid / AG Grid | Heavyweight, theming mismatch with shadcn/base-nova, bundle size concerns |
| react-syntax-highlighter | shiki | Shiki produces better highlights but is heavier; react-syntax-highlighter already in project and working |
| react-syntax-highlighter | prismjs directly | Would need to manage DOM refs and CSS; react-syntax-highlighter wraps this cleanly |

**Installation:**
```bash
npm install @tanstack/react-table
```

**Version verification:** `@tanstack/react-table@8.21.3` confirmed via `npm view` on 2026-03-27. All other packages already installed at versions shown in package.json.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── (files)/                    # New route group for files page
│       ├── layout.tsx              # Duplicated sidebar layout (same as (chat))
│       └── files/
│           └── page.tsx            # Main file management page
├── components/
│   ├── files/
│   │   ├── file-chip.tsx           # Existing - reusable getTypeIcon/formatSize
│   │   ├── file-table.tsx          # NEW: @tanstack/react-table file list
│   │   ├── file-table-columns.tsx  # NEW: column definitions
│   │   ├── file-preview-panel.tsx  # NEW: right panel with type-specific rendering
│   │   ├── file-preview-markdown.tsx  # NEW: document preview (react-markdown)
│   │   ├── file-preview-code.tsx   # NEW: code preview (syntax highlighting)
│   │   ├── file-preview-data.tsx   # NEW: data file preview (HTML table)
│   │   ├── file-delete-dialog.tsx  # NEW: delete confirmation dialog
│   │   └── file-empty-state.tsx    # NEW: empty state component
│   ├── ui/
│   │   └── table.tsx               # NEW: base Table UI component (shadcn-style)
│   └── sidebar/
│       └── sidebar.tsx             # MODIFY: add FolderOpen Files entry button
├── lib/
│   ├── db/
│   │   └── queries.ts              # MODIFY: add getFilesByUserPaginated()
│   └── extraction/
│       └── classifier.ts           # NEW: content-based file classification (MGMT-05)
└── app/api/files/
    ├── route.ts                    # NEW: GET /api/files (paginated list)
    └── [id]/
        ├── extract/route.ts        # Existing: POST retry extraction
        ├── status/route.ts         # Existing: GET extraction status
        └── route.ts                # NEW: DELETE /api/files/[id]
```

### Pattern 1: Route Group Layout Sharing

**What:** Next.js route groups `(files)` and `(chat)` can share the sidebar without URL impact.
**When to use:** When multiple pages need the same sidebar but different main content.
**Why duplicating instead of sharing root layout:** The `(chat)/layout.tsx` is a client component managing sidebar state. Moving sidebar to root layout would require refactoring the auth pages layout (login/register shouldn't have sidebar). Creating a `(files)` route group with a duplicated layout is safer for this phase and can be consolidated later.

**Note:** The middleware currently protects `'/'` and `'/chat'` routes. The `/files` route needs to be added to the middleware matcher. However, since the API pattern already checks `auth()` in each route handler, and the middleware protects all `/api/*` routes, the `/files` page should also be added to the middleware redirect for unauthenticated users.

```typescript
// src/middleware.ts - ADD to protected chat pages:
if (req.nextUrl.pathname === '/' || req.nextUrl.pathname.startsWith('/chat') || req.nextUrl.pathname.startsWith('/files')) {
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
```

### Pattern 2: Paginated Server-Side Query

**What:** Drizzle ORM supports `limit()`, `offset()`, `asc()`, `desc()`, and `eq()` for server-side pagination, sorting, and filtering.
**When to use:** File list API needs server-side pagination (not client-side) because the full file list could grow large.
**Example:**
```typescript
// Source: drizzle-orm docs, verified against project schema
import { eq, desc, asc, sql, ilike } from 'drizzle-orm';
import { files } from './schema';

export async function getFilesByUserPaginated(
  userId: string,
  options: {
    page?: number;      // 1-based
    pageSize?: number;  // default 20
    sortBy?: 'filename' | 'size' | 'createdAt' | 'fileType';
    sortOrder?: 'asc' | 'desc';
    fileType?: 'document' | 'code' | 'data' | 'all';
  } = {}
): Promise<{ files: File[]; total: number; page: number; totalPages: number }> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    fileType = 'all',
  } = options;

  const conditions = [eq(files.userId, userId)];
  if (fileType !== 'all') {
    conditions.push(eq(files.fileType, fileType));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(files)
    .where(whereClause);

  // Get paginated results
  const orderColumn = files[sortBy];
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const result = await db.select()
    .from(files)
    .where(whereClause)
    .orderBy(orderFn(orderColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    files: result,
    total: count,
    page,
    totalPages: Math.ceil(count / pageSize),
  };
}
```

### Pattern 3: Type-Specific Preview Rendering

**What:** Render file content differently based on `fileType`, consuming `extractedContent` and `extractedMarkdown` from the database.
**When to use:** The preview panel needs to switch rendering strategy per file type.
**Example:**
```typescript
// Document preview - reuse existing react-markdown pattern from chat-message.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// For document files: render extractedMarkdown
<ReactMarkdown remarkPlugins={[remarkGfm]}>{file.extractedMarkdown || ''}</ReactMarkdown>

// Code preview - reuse existing react-syntax-highlighter from chat-message.tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// For code files: render extractedContent with language from code-extractor LANGUAGE_MAP
<SyntaxHighlighter style={oneLight} language={language} PreTag="div">
  {file.extractedContent || ''}
</SyntaxHighlighter>

// Data preview: parse extractedContent (JSON string) and render as HTML table
const rows = JSON.parse(file.extractedContent || '[]');
// Render with standard HTML table element
```

### Pattern 4: Delete API Endpoint

**What:** New `DELETE /api/files/[id]` that removes both the database record and the storage file.
**When to use:** User confirms file deletion from the UI.
**Example:**
```typescript
// Following existing API route pattern from status/route.ts and extract/route.ts
import { auth } from '@/auth';
import { deleteFile as deleteDbFile } from '@/lib/db/queries';
import { deleteFile as deleteStorageFile } from '@/lib/storage/provider';
import { logAudit } from '@/lib/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const file = await getFileById(id);
  if (!file || file.userId !== session.user.id) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Delete storage file (fire-and-forget if it fails)
  await deleteStorageFile(file.storagePath).catch(() => {});

  // Delete database record (cascades to conversationFiles)
  const deleted = await deleteDbFile(id, session.user.id);
  if (!deleted) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Audit log (fire-and-forget per existing pattern)
  logAudit({
    userId: session.user.id,
    action: 'file_delete',
    resource: 'file',
    resourceId: id,
    metadata: { filename: file.filename },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
```

### Anti-Patterns to Avoid
- **Client-side pagination for file list:** All files must be fetched and held in memory. Use server-side pagination via Drizzle `limit()`/`offset()` instead.
- **Inline table markup:** Building a complex table with raw `<table>` elements and managing sort/pagination state manually. Use `@tanstack/react-table` which handles this cleanly.
- **Duplicating sidebar state across route groups:** The `(files)` and `(chat)` route groups will each have their own sidebar open/close state. This is acceptable for now; they are separate page visits.
- **Fetching extractedContent/extractedMarkdown in the list API:** These fields can be very large (entire file contents). The list API should return only metadata. The preview panel should fetch full file data separately when a file is selected.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable/paginated table | Custom useState for sort/page/columns with manual rendering | @tanstack/react-table | Headless table handles sorting state, pagination state, column visibility, row selection -- ~500 LOC of edge cases |
| Markdown rendering | Custom Markdown parser | react-markdown + remark-gfm (already installed) | Already in project, handles GFM tables, code blocks, links |
| Syntax highlighting | Custom CSS + regex highlighting | react-syntax-highlighter (already installed) | Already in project, 100+ languages, theme support |
| Delete confirmation | Custom modal with backdrop | Dialog component from `@base-ui/react` (already installed) | Already in project as `src/components/ui/dialog.tsx` |

**Key insight:** This phase is unusually well-positioned to avoid hand-rolling. Three of the four major features (Markdown rendering, syntax highlighting, confirmation dialog) have working implementations already in the codebase. The only new dependency needed is `@tanstack/react-table` for the data table.

## Common Pitfalls

### Pitfall 1: Fetching Large Content in List API
**What goes wrong:** The file list API returns `extractedContent` and `extractedMarkdown` along with metadata. For a 50MB Excel file, this means returning the entire parsed content for every file in the list.
**Why it happens:** The existing `getFilesByUser()` query uses `db.select().from(files)` which returns ALL columns.
**How to avoid:** The new paginated query should explicitly select only metadata columns (id, filename, mimeType, size, fileType, status, createdAt, errorMessage). Use Drizzle `select({ id: files.id, filename: files.filename, ... })` to exclude content fields.
**Warning signs:** List API response times > 1 second; browser network tab showing multi-MB responses.

### Pitfall 2: Middleware Not Protecting /files Route
**What goes wrong:** Unauthenticated users can access the `/files` page and see the UI (though API calls will fail with 401).
**Why it happens:** The middleware currently only protects `/` and `/chat` routes. The new `/files` route is not in the matcher.
**How to avoid:** Add `/files` to the middleware's protected route check.
**Warning signs:** Page renders briefly then shows errors; network tab shows 401 responses.

### Pitfall 3: Preview Panel Re-rendering on Every Keystroke/Click
**What goes wrong:** When the user clicks between files, the preview panel re-renders the entire Markdown or code block from scratch, causing visible flicker.
**Why it happens:** `react-markdown` and `react-syntax-highlighter` are relatively expensive to render. If the component tree is not properly memoized, selecting a new file triggers unnecessary re-renders.
**How to avoid:** Use `React.memo()` for preview sub-components. Consider `key={selectedFileId}` on the preview panel to force clean mounts rather than in-place updates.
**Warning signs:** Chrome DevTools Performance tab shows long render times; visible flicker when switching files.

### Pitfall 4: Deleting a File While Its Extraction Is In Progress
**What goes wrong:** User deletes a file that is currently being extracted. The extraction handler then tries to update a non-existent database record.
**Why it happens:** The extraction dispatcher (`extractFile`) is fire-and-forget. It reads the file record, starts extraction, then tries to save results. If the file is deleted between the read and save, the update fails.
**How to avoid:** The extraction dispatcher already handles this case -- see `dispatcher.ts` line 132: `catch { /* File may have been deleted mid-extraction */ }`. The delete endpoint should also gracefully handle the case where storage deletion fails (already suggested with `.catch(() => {})`).
**Warning signs:** Console errors about "File not found" during extraction; audit logs showing extraction failures for deleted files.

### Pitfall 5: JSON Parse Error for Data File Preview
**What goes wrong:** The data preview panel tries to `JSON.parse(file.extractedContent)` but the content is not valid JSON, causing a crash.
**Why it happens:** CSV files store content as JSON array string (`JSON.stringify(rows)`), but if extraction partially failed or the content is malformed, parsing will throw.
**How to avoid:** Wrap `JSON.parse()` in try-catch with a fallback error message. Validate that the parsed result is actually an array before rendering.
**Warning signs:** Preview panel shows blank or crashes when selecting a data file.

## Code Examples

Verified patterns from existing codebase:

### Reusable Type Icons (from file-chip.tsx)
```typescript
// Source: src/components/files/file-chip.tsx (existing, verified)
function getTypeIcon(fileType?: string, status?: string) {
  switch (fileType) {
    case 'document': return <FileText className="h-3.5 w-3.5" />;
    case 'code': return <FileCode className="h-3.5 w-3.5" />;
    case 'data': return <FileSpreadsheet className="h-3.5 w-3.5" />;
    default: return <FileText className="h-3.5 w-3.5" />;
  }
}
```

### File Size Formatting (from file-chip.tsx)
```typescript
// Source: src/components/files/file-chip.tsx (existing, verified)
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
```

### Markdown Rendering with Syntax Highlighting (from chat-message.tsx)
```typescript
// Source: src/components/chat/chat-message.tsx (existing, verified)
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      if (!props.inline && match) {
        return (
          <SyntaxHighlighter style={oneLight} language={match[1]} PreTag="div" {...props}>
            {codeString}
          </SyntaxHighlighter>
        );
      }
      return <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
    },
  }}
>
  {markdownContent}
</ReactMarkdown>
```

### Code File Language Detection (from code-extractor.ts)
```typescript
// Source: src/lib/extraction/extractors/code-extractor.ts (existing, verified)
// Use filename extension to determine language for syntax highlighting
const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
  '.py': 'python', '.java': 'java', '.go': 'go', '.rs': 'rust',
  '.c': 'c', '.h': 'c', '.cpp': 'cpp', '.css': 'css', '.html': 'html',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.md': 'markdown',
  '.sql': 'sql', '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
};
```

### Data File Content Format (from csv-extractor.ts)
```typescript
// Source: src/lib/extraction/extractors/csv-extractor.ts (existing, verified)
// Data files store extractedContent as JSON.stringify(rows)
// where rows is Record<string, unknown>[]
// Example: '[{"name":"Alice","age":30},{"name":"Bob","age":25}]'

// Excel extractor follows same pattern -- extractedContent = JSON.stringify(rows)
```

### @tanstack/react-table Basic Setup
```typescript
// Source: @tanstack/react-table v8 docs
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';

interface FileRow {
  id: string;
  filename: string;
  fileType: 'document' | 'code' | 'data';
  size: number;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  createdAt: string;
}

const columns: ColumnDef<FileRow>[] = [
  { accessorKey: 'filename', header: 'Name' },
  { accessorKey: 'fileType', header: 'Type' },
  { accessorKey: 'size', header: 'Size' },
  { accessorKey: 'createdAt', header: 'Uploaded' },
  { accessorKey: 'status', header: 'Status' },
];

function FileTable({ data }: { data: FileRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div>
      <table>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: ' ^', desc: ' v' }[header.column.getIsSorted() as string] ?? ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.header, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination controls */}
      <div>
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</button>
        <span>Page {table.getState().pagination.pageIndex + 1}</span>
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side pagination | Server-side pagination with URL params | Standard for any non-trivial data set | Reduces initial payload, enables large datasets |
| Raw HTML tables | Headless table libraries (@tanstack/react-table) | ~2020, now industry standard | Sorting, filtering, pagination handled declaratively |
| prismjs (direct) | react-syntax-highlighter (wrapper) | ~2019, stable | Cleaner React integration, theme support |

**Deprecated/outdated:**
- shadcn/ui `Table` component v0.x (based on Radix): This project uses `@base-ui/react` not Radix, so the shadcn Table component cannot be installed directly. Build a simple HTML table styled with Tailwind, driven by `@tanstack/react-table`.

## Open Questions

1. **Sidebar layout sharing strategy**
   - What we know: `(chat)/layout.tsx` has the sidebar; `/files` needs the same sidebar
   - What's unclear: Whether to refactor to a shared root layout or duplicate
   - Recommendation: Duplicate the layout in a `(files)` route group for this phase. Consolidate in a future refactoring phase.

2. **Code preview language detection**
   - What we know: `code-extractor.ts` has a `LANGUAGE_MAP` mapping extensions to languages. The code file's `extractedContent` is raw text (not wrapped in a code fence).
   - What's unclear: How to pass the language tag from the server to the preview component. Options: (a) infer from filename extension on client, (b) store language in the database during extraction.
   - Recommendation: Infer from filename extension on the client using the same `LANGUAGE_MAP`. No schema change needed.

3. **Auto-classification rules (MGMT-05, D-09)**
   - What we know: CONTEXT.md says content analysis corrects extension-based classification. The `classification` field exists on the files table.
   - What's unclear: What specific rules to apply (e.g., what makes a `.json` file "code" vs "data"?).
   - Recommendation: Simple heuristic rules: if JSON has `>`50 string values with `:` separators (key-value config), classify as code; if JSON is a homogeneous array of objects, classify as data. Run classification during extraction as a post-processing step. This is Claude's discretion per CONTEXT.md.

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies identified -- all dependencies are npm packages already installed or to be installed via npm)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 + jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/components/files/` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MGMT-01 | File list renders with metadata columns | unit | `npx vitest run tests/components/files/file-table.test.tsx -x` | No - Wave 0 |
| MGMT-01 | File list supports sorting by columns | unit | `npx vitest run tests/components/files/file-table.test.tsx -x` | No - Wave 0 |
| MGMT-01 | File list supports pagination | unit | `npx vitest run tests/components/files/file-table.test.tsx -x` | No - Wave 0 |
| MGMT-02 | Delete button triggers confirmation dialog | unit | `npx vitest run tests/components/files/file-delete-dialog.test.tsx -x` | No - Wave 0 |
| MGMT-02 | Confirming delete calls API | unit | `npx vitest run tests/components/files/file-delete-dialog.test.tsx -x` | No - Wave 0 |
| MGMT-03 | Filter by file type | unit | `npx vitest run tests/components/files/file-table.test.tsx -x` | No - Wave 0 |
| MGMT-04 | Document preview renders Markdown | unit | `npx vitest run tests/components/files/file-preview-markdown.test.tsx -x` | No - Wave 0 |
| MGMT-04 | Code preview renders with syntax highlighting | unit | `npx vitest run tests/components/files/file-preview-code.test.tsx -x` | No - Wave 0 |
| MGMT-04 | Data preview renders table from JSON | unit | `npx vitest run tests/components/files/file-preview-data.test.tsx -x` | No - Wave 0 |
| MGMT-05 | Content analysis corrects file type | unit | `npx vitest run tests/lib/extraction/classifier.test.ts -x` | No - Wave 0 |
| API | GET /api/files returns paginated list | unit | `npx vitest run tests/api/files.test.ts -x` | No - Wave 0 |
| API | DELETE /api/files/[id] deletes file | unit | `npx vitest run tests/api/files.test.ts -x` | No - Wave 0 |
| Query | getFilesByUserPaginated with sort/filter/page | unit | `npx vitest run tests/lib/db/queries-files.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/components/files/ tests/api/files.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/components/files/file-table.test.tsx` -- covers MGMT-01, MGMT-03 (file list, sort, filter, pagination)
- [ ] `tests/components/files/file-delete-dialog.test.tsx` -- covers MGMT-02 (delete confirmation)
- [ ] `tests/components/files/file-preview-markdown.test.tsx` -- covers MGMT-04 (document preview)
- [ ] `tests/components/files/file-preview-code.test.tsx` -- covers MGMT-04 (code preview)
- [ ] `tests/components/files/file-preview-data.test.tsx` -- covers MGMT-04 (data preview)
- [ ] `tests/lib/extraction/classifier.test.ts` -- covers MGMT-05 (auto-classification)
- [ ] `tests/api/files.test.ts` -- covers file list and delete API routes
- [ ] `tests/lib/db/queries-files.test.ts` -- covers paginated query

## Project Constraints (from CLAUDE.md)

- **Path alias:** `@/*` maps to `./src/*`
- **UI components:** shadcn/ui (base-nova style, lucide icons) in `src/components/ui/`. Use `cn()` from `src/lib/utils.ts` for class merging.
- **Streaming:** Chat API returns `text/plain; charset=utf-8` with `Transfer-Encoding: chunked`. (Not directly relevant to this phase but good to know.)
- **Audit logging:** `logAudit()` from `src/lib/audit.ts` is used throughout for security event tracking. Fire-and-forget pattern (`.catch(() => {})`). MUST use for file deletion audit events.
- **API route pattern:** `auth()` -> verify -> process -> respond. All new API endpoints MUST follow this pattern.
- **Database queries:** Drizzle ORM, `src/lib/db/queries.ts` centralized. New file queries MUST go in this file.
- **Enum definitions:** `const enum = [...] as const` pattern (FileTypeEnum, FileStatusEnum). Reference existing enums, don't redefine.
- **Test framework:** Vitest + jsdom, test files in `tests/`, setup in `tests/setup.ts`. Component tests use `@testing-library/react` with `@testing-library/jest-dom/vitest` matchers.
- **No emojis in code:** Avoid emojis unless explicitly requested.

## Sources

### Primary (HIGH confidence)
- Project source code: `src/lib/db/schema.ts`, `src/lib/db/queries.ts`, `src/lib/storage/provider.ts`, `src/lib/storage/types.ts`, `src/lib/extraction/dispatcher.ts`, `src/lib/extraction/extractors/*.ts`, `src/components/files/file-chip.tsx`, `src/components/chat/chat-message.tsx`, `src/components/ui/dialog.tsx`, `src/components/sidebar/sidebar.tsx`, `src/app/(chat)/layout.tsx`, `src/middleware.ts`
- `package.json` -- verified installed versions of all dependencies
- `CONTEXT.md` -- locked decisions D-01 through D-11

### Secondary (MEDIUM confidence)
- `@tanstack/react-table` v8.21.3 -- verified via `npm view` on 2026-03-27; widely adopted headless table library
- drizzle-orm v0.45.1 -- verified via `npm view`; pagination via `limit()`/`offset()` is core API
- react-markdown v10.1.0, remark-gfm v4.0.1, react-syntax-highlighter v16.1.1 -- all verified installed and working in existing chat-message.tsx

### Tertiary (LOW confidence)
- None identified -- all findings verified against source code or package registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages verified in package.json or npm registry; reuse pattern from existing codebase
- Architecture: HIGH - based on direct reading of existing source code and Next.js App Router patterns
- Pitfalls: HIGH - identified from direct analysis of codebase patterns and database schema

**Research date:** 2026-03-27
**Valid until:** 30 days (stable domain -- all libraries are mature, no fast-moving changes expected)
