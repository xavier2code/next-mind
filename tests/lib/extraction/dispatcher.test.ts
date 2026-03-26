import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DB queries
const mockGetFileById = vi.fn();
const mockUpdateFileStatus = vi.fn();
const mockUpdateFileExtraction = vi.fn();
vi.mock('@/lib/db/queries', () => ({
  getFileById: (...args: unknown[]) => mockGetFileById(...args),
  updateFileStatus: (...args: unknown[]) => mockUpdateFileStatus(...args),
  updateFileExtraction: (...args: unknown[]) => mockUpdateFileExtraction(...args),
}));

// Mock storage provider
const mockGetFile = vi.fn();
vi.mock('@/lib/storage/provider', () => ({
  getFile: (...args: unknown[]) => mockGetFile(...args),
}));

// Mock audit
const mockLogAudit = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

// Mock extractors -- use @/lib paths since dispatcher resolves from src/
const mockPdfExtract = vi.fn();
const mockDocxExtract = vi.fn();
const mockCodeExtract = vi.fn();
const mockCsvExtract = vi.fn();
const mockExcelExtract = vi.fn();

vi.mock('@/lib/extraction/extractors/pdf-extractor', () => ({
  PdfExtractor: class {
    extract = mockPdfExtract;
  },
}));

vi.mock('@/lib/extraction/extractors/docx-extractor', () => ({
  DocxExtractor: class {
    extract = mockDocxExtract;
  },
}));

vi.mock('@/lib/extraction/extractors/code-extractor', () => ({
  CodeExtractor: class {
    extract = mockCodeExtract;
  },
}));

vi.mock('@/lib/extraction/extractors/csv-extractor', () => ({
  CsvExtractor: class {
    extract = mockCsvExtract;
  },
}));

vi.mock('@/lib/extraction/extractors/excel-extractor', () => ({
  ExcelExtractor: class {
    extract = mockExcelExtract;
  },
}));

// Import after mocks are set up
import { extractFile } from '@/lib/extraction/dispatcher';
import { ExtractionSemaphore } from '@/lib/extraction/concurrency';

// Sample file record
const sampleFile = {
  id: 'file-uuid-1',
  userId: 'user-1',
  filename: 'test.pdf',
  mimeType: 'application/pdf',
  fileType: 'document',
  storagePath: 'user-1/file-uuid-1/test.pdf',
  size: 1024,
  status: 'uploaded' as const,
  extractedContent: null,
  extractedMarkdown: null,
  classification: null,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleBuffer = Buffer.from('test content');

const sampleResult = {
  extractedContent: 'raw text content',
  extractedMarkdown: '# Markdown Content\n\nSome text',
  warnings: [],
};

describe('ExtractionSemaphore', () => {
  it('limits concurrent operations to maxConcurrency', async () => {
    const semaphore = new ExtractionSemaphore(2);
    let activeCount = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 5 }, () =>
      semaphore.acquire().then(async () => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        await new Promise(resolve => setTimeout(resolve, 10));
        activeCount--;
        semaphore.release();
      })
    );

    await Promise.all(tasks);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('queues operations when at max concurrency', async () => {
    const semaphore = new ExtractionSemaphore(1);
    const order: number[] = [];

    const task1 = semaphore.acquire().then(async () => {
      order.push(1);
      await new Promise(resolve => setTimeout(resolve, 20));
      semaphore.release();
    });

    const task2 = semaphore.acquire().then(() => {
      order.push(2);
      semaphore.release();
    });

    await Promise.all([task1, task2]);
    expect(order).toEqual([1, 2]);
  });
});

describe('extractFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFile.mockResolvedValue(sampleBuffer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('transitions status: uploaded -> processing -> ready', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'uploaded' });
    mockPdfExtract.mockResolvedValueOnce(sampleResult);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileExtraction.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    expect(mockGetFileById).toHaveBeenCalledWith('file-uuid-1');
    expect(mockUpdateFileStatus).toHaveBeenCalledWith('file-uuid-1', 'processing');
    expect(mockUpdateFileExtraction).toHaveBeenCalledWith('file-uuid-1', {
      extractedContent: 'raw text content',
      extractedMarkdown: '# Markdown Content\n\nSome text',
      status: 'ready',
      errorMessage: null,
    });
  });

  it('sets failed status on extraction error', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'uploaded' });
    mockPdfExtract.mockRejectedValueOnce(new Error('PDF parse error'));
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'failed', errorMessage: 'PDF parse error' });

    await extractFile('file-uuid-1');

    expect(mockUpdateFileStatus).toHaveBeenCalledWith('file-uuid-1', 'failed', 'PDF parse error');
  });

  it('sets failed status when file not found in storage', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'uploaded' });
    mockGetFile.mockResolvedValueOnce(null);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'failed', errorMessage: 'Storage file user-1/file-uuid-1/test.pdf not found' });

    await extractFile('file-uuid-1');

    expect(mockUpdateFileStatus).toHaveBeenCalledWith('file-uuid-1', 'failed', 'Storage file user-1/file-uuid-1/test.pdf not found');
  });

  it('sets failed status when file record not found', async () => {
    mockGetFileById.mockResolvedValueOnce(undefined);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'failed', errorMessage: 'File file-uuid-1 not found' });

    await extractFile('file-uuid-1');

    expect(mockUpdateFileStatus).toHaveBeenCalledWith('file-uuid-1', 'failed', 'File file-uuid-1 not found');
  });

  it('skips files already in processing status', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });

    await extractFile('file-uuid-1');

    expect(mockUpdateFileStatus).not.toHaveBeenCalled();
    expect(mockGetFile).not.toHaveBeenCalled();
  });

  it('skips files already in ready status', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    expect(mockUpdateFileStatus).not.toHaveBeenCalled();
    expect(mockGetFile).not.toHaveBeenCalled();
  });

  it('allows retry for failed files', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'failed' });
    mockPdfExtract.mockResolvedValueOnce(sampleResult);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileExtraction.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    expect(mockUpdateFileStatus).toHaveBeenCalledWith('file-uuid-1', 'processing');
    expect(mockUpdateFileExtraction).toHaveBeenCalledWith('file-uuid-1', expect.objectContaining({ status: 'ready' }));
  });

  it('selects PDF extractor for application/pdf mimeType', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, mimeType: 'application/pdf' });
    mockPdfExtract.mockResolvedValueOnce(sampleResult);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileExtraction.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    expect(mockPdfExtract).toHaveBeenCalledWith(sampleBuffer, 'test.pdf');
  });

  it('selects DOCX extractor for docx mimeType', async () => {
    const docxFile = { ...sampleFile, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'test.docx' };
    mockGetFileById.mockResolvedValueOnce(docxFile);
    mockDocxExtract.mockResolvedValueOnce(sampleResult);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileExtraction.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    expect(mockDocxExtract).toHaveBeenCalledWith(sampleBuffer, 'test.docx');
  });

  it('selects code extractor for code fileType', async () => {
    const codeFile = { ...sampleFile, mimeType: 'text/plain', fileType: 'code', filename: 'test.ts' };
    mockGetFileById.mockResolvedValueOnce(codeFile);
    mockCodeExtract.mockResolvedValueOnce(sampleResult);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileExtraction.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    expect(mockCodeExtract).toHaveBeenCalledWith(sampleBuffer, 'test.ts');
  });

  it('selects CSV extractor for text/csv mimeType', async () => {
    const csvFile = { ...sampleFile, mimeType: 'text/csv', filename: 'test.csv' };
    mockGetFileById.mockResolvedValueOnce(csvFile);
    mockCsvExtract.mockResolvedValueOnce(sampleResult);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileExtraction.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    expect(mockCsvExtract).toHaveBeenCalledWith(sampleBuffer, 'test.csv');
  });

  it('selects Excel extractor for xlsx mimeType', async () => {
    const excelFile = { ...sampleFile, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: 'test.xlsx' };
    mockGetFileById.mockResolvedValueOnce(excelFile);
    mockExcelExtract.mockResolvedValueOnce(sampleResult);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileExtraction.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    expect(mockExcelExtract).toHaveBeenCalledWith(sampleBuffer, 'test.xlsx');
  });

  it('throws on unsupported mimeType', async () => {
    const unknownFile = { ...sampleFile, mimeType: 'application/unknown' };
    mockGetFileById.mockResolvedValueOnce(unknownFile);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'failed', errorMessage: 'Unsupported mimeType: application/unknown' });

    await extractFile('file-uuid-1');

    expect(mockUpdateFileStatus).toHaveBeenCalledWith('file-uuid-1', 'failed', 'Unsupported mimeType: application/unknown');
  });

  it('calls logAudit with file_extraction_start on extraction start', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'uploaded' });
    mockPdfExtract.mockResolvedValueOnce(sampleResult);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileExtraction.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    const startCall = mockLogAudit.mock.calls.find(
      (call: unknown[]) => (call[0] as { action: string }).action === 'file_extraction_start'
    );
    expect(startCall).toBeDefined();
    expect((startCall![0] as { action: string; userId: string }).userId).toBe('user-1');
  });

  it('calls logAudit with file_extraction_complete on success', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'uploaded' });
    mockPdfExtract.mockResolvedValueOnce(sampleResult);
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileExtraction.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    const completeCall = mockLogAudit.mock.calls.find(
      (call: unknown[]) => (call[0] as { action: string }).action === 'file_extraction_complete'
    );
    expect(completeCall).toBeDefined();
    expect((completeCall![0] as { action: string; userId: string }).userId).toBe('user-1');
  });

  it('calls logAudit with file_extraction_failed on error', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'uploaded' });
    mockPdfExtract.mockRejectedValueOnce(new Error('Extraction failed'));
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'failed', errorMessage: 'Extraction failed' });

    await extractFile('file-uuid-1');

    const failedCall = mockLogAudit.mock.calls.find(
      (call: unknown[]) => (call[0] as { action: string }).action === 'file_extraction_failed'
    );
    expect(failedCall).toBeDefined();
    expect((failedCall![0] as { action: string; userId: string; metadata: Record<string, unknown> }).metadata?.error).toBe('Extraction failed');
  });

  it('respects 30-second timeout', async () => {
    vi.useFakeTimers();
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'uploaded' });
    mockPdfExtract.mockReturnValueOnce(new Promise(() => {})); // Never resolves
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'failed', errorMessage: 'Extraction timed out after 30000ms' });

    const extractPromise = extractFile('file-uuid-1');

    await vi.advanceTimersByTimeAsync(35_000);

    await extractPromise;

    expect(mockUpdateFileStatus).toHaveBeenCalledWith('file-uuid-1', 'failed', 'Extraction timed out after 30000ms');

    vi.useRealTimers();
  });

  it('stores warnings in errorMessage when present', async () => {
    mockGetFileById.mockResolvedValueOnce({ ...sampleFile, status: 'uploaded' });
    mockPdfExtract.mockResolvedValueOnce({
      ...sampleResult,
      warnings: ['Font not found', 'Image skipped'],
    });
    mockUpdateFileStatus.mockResolvedValueOnce({ ...sampleFile, status: 'processing' });
    mockUpdateFileExtraction.mockResolvedValueOnce({ ...sampleFile, status: 'ready' });

    await extractFile('file-uuid-1');

    expect(mockUpdateFileExtraction).toHaveBeenCalledWith('file-uuid-1', expect.objectContaining({
      errorMessage: 'Font not found; Image skipped',
    }));
  });
});
