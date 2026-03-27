# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 — 文件处理

**Shipped:** 2026-03-27
**Phases:** 4 | **Plans:** 14 | **Timeline:** 3 days

### What Was Built
- Abstract storage layer (unstorage) with local/S3 driver switching
- Dual-transport file upload API (formData + busboy streaming)
- Content extraction engine (PDF/DOCX/Code/CSV/Excel → Markdown+JSON)
- Strategy-pattern extraction dispatcher with concurrency control
- File management UI (paginated list, preview panel, delete, auto-classification)
- Chat file integration (content injection, inline editor, attachment bar)
- 5 file processing skills (file-extract, file-convert, file-classify, file-read, file-list)

### What Worked
- Strategy pattern for extraction dispatchers — clean extensibility per file type
- Fire-and-forget extraction after upload avoids request timeouts
- Dynamic import() for heavy parsing libraries (papaparse, exceljs) keeps bundle lean
- Client-side content injection preserves streaming chat API without changes
- Hand-built HTML table wrappers avoided shadcn Table Radix incompatibility

### What Was Inefficient
- Phase 07 Plan 01 took 295 min (5 tasks, 19 files) — database schema + storage abstraction was heavy upfront
- REQUIREMENTS.md checkboxes not updated as code shipped — 12/28 requirements unchecked despite implementation
- Phase 09-03 and 10-04 summaries contained bug fix notes instead of accomplishment descriptions

### Patterns Established
- Factory function for column definitions (fileColumns(callbacks)) to avoid prop drilling
- Storage key format {userId}/{fileId}/{filename} for tenant isolation
- XHR over fetch for upload progress tracking
- Counter-based dragleave to prevent flicker on child elements
- Progress rounded to nearest 5% for smoother visual updates

### Key Lessons
1. Mark REQUIREMENTS.md checkboxes as code ships, not at milestone end — prevents 12 unchecked items
2. Abstract storage layers pay off early — switching between local/S3 requires zero business logic changes
3. Content extraction should be async-first — synchronous extraction blocks the request and fails on large files
4. Client-side injection is simpler than server-side for file content in streaming chat — avoids API changes

### Cost Observations
- Model mix: balanced profile (primarily sonnet)
- Sessions: ~10 sessions across 3 days
- Notable: Phase 07 P01 was the most expensive single plan (295 min), storage schema design is the bottleneck

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Days | Phases | Plans | Key Change |
|-----------|------|--------|-------|------------|
| v1.0 | 1 | 2 | 11 | Initial project setup, foundational patterns |
| v1.1 | 2 | 4 | 17 | Agent system, multi-phase coordination |
| v1.2 | 3 | 4 | 14 | File processing, storage abstraction |

### Cumulative Quality

| Milestone | Feature Commits | LOC Added | Tests |
|-----------|----------------|-----------|-------|
| v1.0 | ~11 | ~8,000 | 24 verified |
| v1.1 | ~17 | ~5,500 | 35 tasks |
| v1.2 | 30 | ~7,400 | 30 tasks |

### Top Lessons (Verified Across Milestones)

1. Async-first patterns prevent timeout issues (v1.1 workflow control, v1.2 extraction)
2. Abstract layers enable future flexibility (v1.2 storage layer, applicable to other concerns)
3. Keep summaries descriptive — bug fix notes in summaries don't help milestone reviews
4. Update requirements checkboxes incrementally, not retroactively
