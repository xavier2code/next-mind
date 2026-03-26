/**
 * Extraction dispatcher -- orchestrates content extraction for uploaded files.
 *
 * Routes files to the correct extractor based on mimeType from the database record,
 * applies a 30-second timeout (D-05), limits concurrency via semaphore, and tracks
 * status transitions: uploaded -> processing -> ready | failed.
 *
 * Audit events (file_extraction_start, file_extraction_complete, file_extraction_failed)
 * are logged using the fire-and-forget pattern per CLAUDE.md.
 */

import { getFileById, updateFileStatus, updateFileExtraction } from '@/lib/db/queries';
import { getFile } from '@/lib/storage/provider';
import { extractionSemaphore } from './concurrency';
import { logAudit } from '@/lib/audit';
import type { Extractor } from './types';

/** Timeout for single-file extraction in milliseconds (D-05). */
const EXTRACTION_TIMEOUT_MS = 30_000;

/**
 * Wrap a promise with a timeout. Rejects with an Error if the promise
 * does not resolve within the specified duration.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Extraction timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Main extraction entry point.
 *
 * 1. Acquires semaphore slot (limits concurrency)
 * 2. Loads file record from DB, verifies status
 * 3. Updates status to 'processing'
 * 4. Reads file buffer from storage
 * 5. Routes to correct extractor based on mimeType
 * 6. Saves extraction results to DB
 * 7. Updates status to 'ready' (success) or 'failed' (error)
 *
 * All errors are caught internally -- the caller should fire-and-forget.
 */
export async function extractFile(fileId: string): Promise<void> {
  await extractionSemaphore.acquire();

  let file: {
    id: string;
    userId: string;
    filename: string;
    storagePath: string;
    mimeType: string;
    fileType: string;
  } | undefined;

  try {
    file = await getFileById(fileId);
    if (!file) {
      await updateFileStatus(fileId, 'failed', `File ${fileId} not found`);
      return;
    }

    // Only extract if status is 'uploaded' or 'failed' (for retry)
    if (file.status !== 'uploaded' && file.status !== 'failed') {
      return; // Already processing or ready
    }

    await updateFileStatus(fileId, 'processing');

    // Audit: extraction started (fire-and-forget per CLAUDE.md)
    logAudit({
      userId: file.userId,
      action: 'file_extraction_start',
      resource: 'file',
      resourceId: fileId,
      metadata: { filename: file.filename, mimeType: file.mimeType },
    }).catch(() => {});

    const buffer = await getFile(file.storagePath);
    if (!buffer) {
      throw new Error(`Storage file ${file.storagePath} not found`);
    }

    // Select correct extractor based on mimeType
    let extractor: Extractor;
    if (file.mimeType === 'application/pdf') {
      const { PdfExtractor } = await import('./extractors/pdf-extractor');
      extractor = new PdfExtractor();
    } else if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { DocxExtractor } = await import('./extractors/docx-extractor');
      extractor = new DocxExtractor();
    } else if (file.fileType === 'code') {
      const { CodeExtractor } = await import('./extractors/code-extractor');
      extractor = new CodeExtractor();
    } else if (file.mimeType === 'text/csv') {
      const { CsvExtractor } = await import('./extractors/csv-extractor');
      extractor = new CsvExtractor();
    } else if (file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const { ExcelExtractor } = await import('./extractors/excel-extractor');
      extractor = new ExcelExtractor();
    } else {
      throw new Error(`Unsupported mimeType: ${file.mimeType}`);
    }

    const result = await withTimeout(
      extractor.extract(buffer, file.filename),
      EXTRACTION_TIMEOUT_MS
    );

    await updateFileExtraction(fileId, {
      extractedContent: result.extractedContent,
      extractedMarkdown: result.extractedMarkdown,
      status: 'ready',
      errorMessage: result.warnings?.length ? result.warnings.join('; ') : null,
    });

    // Audit: extraction completed (fire-and-forget per CLAUDE.md)
    logAudit({
      userId: file.userId,
      action: 'file_extraction_complete',
      resource: 'file',
      resourceId: fileId,
      metadata: { filename: file.filename },
    }).catch(() => {});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown extraction error';
    try {
      await updateFileStatus(fileId, 'failed', message);
    } catch {
      // File may have been deleted mid-extraction
    }

    // Audit: extraction failed (fire-and-forget per CLAUDE.md)
    if (file) {
      logAudit({
        userId: file.userId,
        action: 'file_extraction_failed',
        resource: 'file',
        resourceId: fileId,
        metadata: { filename: file.filename, error: message },
      }).catch(() => {});
    }
  } finally {
    extractionSemaphore.release();
  }
}
