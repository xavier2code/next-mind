import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfExtractor } from '@/lib/extraction/extractors/pdf-extractor';

// Mock unpdf module
const mockExtractText = vi.fn();
const mockGetDocumentProxy = vi.fn();

vi.mock('unpdf', () => ({
  extractText: (...args: unknown[]) => mockExtractText(...args),
  getDocumentProxy: (...args: unknown[]) => mockGetDocumentProxy(...args),
}));

// Mock pdf-to-markdown to verify it's called with correct text
const mockTextToMarkdown = vi.fn();
vi.mock('@/lib/extraction/markdown/pdf-to-markdown', () => ({
  textToMarkdown: (...args: unknown[]) => mockTextToMarkdown(...args),
}));

describe('PdfExtractor', () => {
  let extractor: PdfExtractor;

  beforeEach(() => {
    extractor = new PdfExtractor();
    vi.clearAllMocks();

    // Default mock: getDocumentProxy returns a proxy object
    mockGetDocumentProxy.mockResolvedValue({ _pdf: 'mock-proxy' });

    // Default mock: extractText returns text
    mockExtractText.mockResolvedValue({ text: 'Hello World', totalPages: 1 });

    // Default mock: textToMarkdown returns the text as-is
    mockTextToMarkdown.mockImplementation((text: string) => `## Converted\n\n${text}`);
  });

  it('implements Extractor interface', () => {
    expect(extractor).toHaveProperty('extract');
    expect(typeof extractor.extract).toBe('function');
  });

  it('extracts text from PDF and converts to markdown', async () => {
    const buffer = Buffer.from('fake-pdf-content');
    const result = await extractor.extract(buffer, 'test.pdf');

    expect(mockGetDocumentProxy).toHaveBeenCalledWith(new Uint8Array(buffer));
    expect(mockExtractText).toHaveBeenCalledWith(
      { _pdf: 'mock-proxy' },
      { mergePages: true }
    );
    expect(mockTextToMarkdown).toHaveBeenCalledWith('Hello World');

    expect(result.extractedContent).toBe('Hello World');
    expect(result.extractedMarkdown).toBe('## Converted\n\nHello World');
    expect(result.warnings).toBeUndefined();
  });

  it('returns empty strings for PDF with no text', async () => {
    mockExtractText.mockResolvedValue({ text: '', totalPages: 0 });
    mockTextToMarkdown.mockReturnValue('');

    const buffer = Buffer.from('empty-pdf');
    const result = await extractor.extract(buffer, 'empty.pdf');

    expect(result.extractedContent).toBe('');
    expect(result.extractedMarkdown).toBe('');
  });

  it('handles multi-page PDF text', async () => {
    mockExtractText.mockResolvedValue({
      text: 'Page one content\n\nPage two content',
      totalPages: 2,
    });
    mockTextToMarkdown.mockReturnValue('## Page one content\n\nPage two content');

    const buffer = Buffer.from('multi-page-pdf');
    const result = await extractor.extract(buffer, 'multi.pdf');

    expect(result.extractedContent).toBe('Page one content\n\nPage two content');
    expect(mockExtractText).toHaveBeenCalledWith(
      expect.any(Object),
      { mergePages: true }
    );
  });

  it('propagates unpdf errors', async () => {
    mockGetDocumentProxy.mockRejectedValue(new Error('Invalid PDF'));

    const buffer = Buffer.from('corrupt-pdf');
    await expect(extractor.extract(buffer, 'corrupt.pdf')).rejects.toThrow(
      'Invalid PDF'
    );
  });

  it('ignores filename parameter (only buffer matters for PDF)', async () => {
    const buffer = Buffer.from('pdf-content');
    await extractor.extract(buffer, 'any-name.txt');

    expect(mockGetDocumentProxy).toHaveBeenCalledWith(new Uint8Array(buffer));
    // Filename is not passed to unpdf
  });
});
