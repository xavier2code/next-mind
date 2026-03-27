import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock global.fetch before importing the module under test
const mockFetch = vi.fn();

describe('inject-file-content', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- formatSize tests ---

  describe('formatSize', () => {
    it('formats bytes correctly', async () => {
      const { formatSize } = await import('@/lib/chat/inject-file-content');
      expect(formatSize(0)).toBe('0B');
      expect(formatSize(500)).toBe('500B');
      expect(formatSize(1023)).toBe('1023B');
    });

    it('formats kilobytes correctly', async () => {
      const { formatSize } = await import('@/lib/chat/inject-file-content');
      expect(formatSize(1024)).toBe('1.0KB');
      expect(formatSize(1536)).toBe('1.5KB');
      expect(formatSize(1048575)).toBe('1024.0KB');
    });

    it('formats megabytes correctly', async () => {
      const { formatSize } = await import('@/lib/chat/inject-file-content');
      expect(formatSize(1048576)).toBe('1.0MB');
      expect(formatSize(5242880)).toBe('5.0MB');
    });
  });

  // --- fetchFileContents tests ---

  describe('fetchFileContents', () => {
    it('fetches multiple files in parallel', async () => {
      const mockFiles = [
        { id: 'f1', filename: 'a.txt', mimeType: 'text/plain', size: 100, fileType: 'document' as const, status: 'ready', extractedContent: null, extractedMarkdown: 'Content A' },
        { id: 'f2', filename: 'b.txt', mimeType: 'text/plain', size: 200, fileType: 'document' as const, status: 'ready', extractedContent: null, extractedMarkdown: 'Content B' },
      ];

      mockFetch.mockImplementation((url: string) => {
        const id = url.split('/').pop();
        const file = mockFiles.find(f => f.id === id);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(file),
        });
      });

      const { fetchFileContents } = await import('@/lib/chat/inject-file-content');
      const result = await fetchFileContents(['f1', 'f2']);

      expect(result.files).toHaveLength(2);
      expect(result.skippedCount).toBe(0);
      expect(result.files[0].id).toBe('f1');
      expect(result.files[1].id).toBe('f2');
    });

    it('counts non-ready files as skipped', async () => {
      mockFetch.mockImplementation((url: string) => {
        const id = url.split('/').pop();
        const status = id === 'f1' ? 'processing' : 'ready';
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id, filename: `${id}.txt`, mimeType: 'text/plain', size: 100,
            fileType: 'document', status, extractedContent: null,
            extractedMarkdown: status === 'ready' ? 'content' : null,
          }),
        });
      });

      const { fetchFileContents } = await import('@/lib/chat/inject-file-content');
      const result = await fetchFileContents(['f1', 'f2']);

      expect(result.files).toHaveLength(2);
      expect(result.skippedCount).toBe(1);
    });
  });

  // --- formatFileBlock tests ---

  describe('formatFileBlock', () => {
    it('formats file block with D-03 delimiter exactly', async () => {
      const { formatFileBlock } = await import('@/lib/chat/inject-file-content');
      const file = {
        id: 'f1',
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        fileType: 'document' as const,
        status: 'ready',
        extractedContent: null,
        extractedMarkdown: '# Report\n\nSome content',
      };

      const block = formatFileBlock(file);
      expect(block).toBe('\n\n---\n📎 report.pdf (document, 2.0KB)\n# Report\n\nSome content\n---\n');
    });

    it('uses "unknown" for null fileType', async () => {
      const { formatFileBlock } = await import('@/lib/chat/inject-file-content');
      const file = {
        id: 'f1',
        filename: 'file.xyz',
        mimeType: 'application/octet-stream',
        size: 512,
        fileType: null,
        status: 'ready',
        extractedContent: null,
        extractedMarkdown: 'content',
      };

      const block = formatFileBlock(file);
      expect(block).toContain('file.xyz (unknown, 512B)');
    });

    it('uses contentOverride when provided', async () => {
      const { formatFileBlock } = await import('@/lib/chat/inject-file-content');
      const file = {
        id: 'f1',
        filename: 'file.txt',
        mimeType: 'text/plain',
        size: 100,
        fileType: 'document' as const,
        status: 'ready',
        extractedContent: null,
        extractedMarkdown: 'original',
      };

      const block = formatFileBlock(file, 'edited content');
      expect(block).toContain('edited content');
      expect(block).not.toContain('original');
    });
  });

  // --- injectFileContent tests (main entry point) ---

  describe('injectFileContent', () => {
    it('returns original message with empty attachments when no fileIds', async () => {
      const { injectFileContent } = await import('@/lib/chat/inject-file-content');
      const result = await injectFileContent('Hello world', []);

      expect(result.enrichedContent).toBe('Hello world');
      expect(result.attachments).toEqual([]);
      expect(result.warning).toBeUndefined();
    });

    it('injects 1 ready file into message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'f1', filename: 'doc.pdf', mimeType: 'application/pdf', size: 1024,
          fileType: 'document', status: 'ready', extractedContent: null,
          extractedMarkdown: '# Doc\n\nContent here',
        }),
      });

      const { injectFileContent } = await import('@/lib/chat/inject-file-content');
      const result = await injectFileContent('Summarize this', ['f1']);

      expect(result.enrichedContent).toContain('Summarize this');
      expect(result.enrichedContent).toContain('📎 doc.pdf (document, 1.0KB)');
      expect(result.enrichedContent).toContain('# Doc\n\nContent here');
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0]).toEqual({ id: 'f1', filename: 'doc.pdf', fileType: 'document', size: 1024 });
      expect(result.warning).toBeUndefined();
    });

    it('concatenates multiple files in order', async () => {
      const files = [
        { id: 'f1', filename: 'a.txt', size: 100, fileType: 'code' as const, markdown: 'Code A' },
        { id: 'f2', filename: 'b.pdf', size: 200, fileType: 'document' as const, markdown: 'Doc B' },
        { id: 'f3', filename: 'c.csv', size: 300, fileType: 'data' as const, markdown: 'Data C' },
      ];

      mockFetch.mockImplementation((url: string) => {
        const id = url.split('/').pop();
        const f = files.find(x => x.id === id)!;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: f.id, filename: f.filename, mimeType: 'text/plain', size: f.size,
            fileType: f.fileType, status: 'ready', extractedContent: null,
            extractedMarkdown: f.markdown,
          }),
        });
      });

      const { injectFileContent } = await import('@/lib/chat/inject-file-content');
      const result = await injectFileContent('Analyze', ['f1', 'f2', 'f3']);

      // Verify order: a.txt before b.pdf before c.csv
      const idxA = result.enrichedContent.indexOf('a.txt');
      const idxB = result.enrichedContent.indexOf('b.pdf');
      const idxC = result.enrichedContent.indexOf('c.csv');
      expect(idxA).toBeLessThan(idxB);
      expect(idxB).toBeLessThan(idxC);
      expect(result.attachments).toHaveLength(3);
      expect(result.warning).toBeUndefined();
    });

    it('skips non-ready files and returns partial warning', async () => {
      const files = [
        { id: 'f1', status: 'ready', markdown: 'Ready content' },
        { id: 'f2', status: 'processing', markdown: null },
        { id: 'f3', status: 'ready', markdown: 'Also ready' },
      ];

      mockFetch.mockImplementation((url: string) => {
        const id = url.split('/').pop();
        const f = files.find(x => x.id === id)!;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: f.id, filename: `${f.id}.txt`, mimeType: 'text/plain', size: 100,
            fileType: 'document', status: f.status, extractedContent: null,
            extractedMarkdown: f.markdown,
          }),
        });
      });

      const { injectFileContent } = await import('@/lib/chat/inject-file-content');
      const result = await injectFileContent('Go', ['f1', 'f2', 'f3']);

      expect(result.attachments).toHaveLength(2);
      expect(result.enrichedContent).toContain('Ready content');
      expect(result.enrichedContent).toContain('Also ready');
      expect(result.warning).toBe('部分文件仍在处理中，将不会包含在消息中');
    });

    it('returns original message when all files are not ready', async () => {
      mockFetch.mockImplementation((url: string) => {
        const id = url.split('/').pop();
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id, filename: `${id}.txt`, mimeType: 'text/plain', size: 100,
            fileType: 'document', status: 'processing', extractedContent: null,
            extractedMarkdown: null,
          }),
        });
      });

      const { injectFileContent } = await import('@/lib/chat/inject-file-content');
      const result = await injectFileContent('Hello', ['f1', 'f2']);

      expect(result.enrichedContent).toBe('Hello');
      expect(result.attachments).toEqual([]);
      expect(result.warning).toBe('所有文件仍在处理中，请稍后再试');
    });

    it('truncates content exceeding MAX_TOTAL_CHARS with warning', async () => {
      // Create a file with content that exceeds 10000 chars
      const longContent = 'X'.repeat(15000);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'f1', filename: 'big.txt', mimeType: 'text/plain', size: 50000,
          fileType: 'document', status: 'ready', extractedContent: null,
          extractedMarkdown: longContent,
        }),
      });

      const { injectFileContent } = await import('@/lib/chat/inject-file-content');
      const result = await injectFileContent('Summarize', ['f1']);

      // The total chars should not exceed 10000 (for file blocks only, excluding original message)
      expect(result.enrichedContent).toContain('[Content truncated...]');
      expect(result.warning).toContain('文件内容过长');
      expect(result.warning).toContain('截断');
    });

    it('truncates mid-file and skips remaining files', async () => {
      // First file is so large that it gets truncated mid-content.
      // Second file should be entirely skipped.
      const firstContent = 'A'.repeat(15000);
      const secondContent = 'B'.repeat(5000);

      let callCount = 0;
      mockFetch.mockImplementation((url: string) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: 'f1', filename: 'first.txt', mimeType: 'text/plain', size: 20000,
              fileType: 'document', status: 'ready', extractedContent: null,
              extractedMarkdown: firstContent,
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'f2', filename: 'second.txt', mimeType: 'text/plain', size: 5000,
            fileType: 'document', status: 'ready', extractedContent: null,
            extractedMarkdown: secondContent,
          }),
        });
      });

      const { injectFileContent } = await import('@/lib/chat/inject-file-content');
      const result = await injectFileContent('Go', ['f1', 'f2']);

      // First file should be partially included and truncated
      expect(result.enrichedContent).toContain('first.txt');
      expect(result.enrichedContent).not.toContain('second.txt');
      expect(result.enrichedContent).toContain('[Content truncated...]');
      // Only first file in attachments (second was not included)
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].id).toBe('f1');
    });

    it('uses editedContent from editedContents map when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'f1', filename: 'doc.pdf', mimeType: 'application/pdf', size: 1024,
          fileType: 'document', status: 'ready', extractedContent: null,
          extractedMarkdown: 'Original extracted text',
        }),
      });

      const { injectFileContent } = await import('@/lib/chat/inject-file-content');
      const editedMap = new Map<string, string>();
      editedMap.set('f1', 'User edited version of the content');

      const result = await injectFileContent('Review', ['f1'], editedMap);

      expect(result.enrichedContent).toContain('User edited version of the content');
      expect(result.enrichedContent).not.toContain('Original extracted text');
    });

    it('handles empty fileIds array by returning original message', async () => {
      const { injectFileContent } = await import('@/lib/chat/inject-file-content');
      const result = await injectFileContent('Test', []);

      expect(result.enrichedContent).toBe('Test');
      expect(result.attachments).toEqual([]);
      expect(result.warning).toBeUndefined();
      // fetch should not be called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
