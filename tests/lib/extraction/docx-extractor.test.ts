import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocxExtractor } from '@/lib/extraction/extractors/docx-extractor';

// Mock mammoth module
const mockConvertToHtml = vi.fn();
vi.mock('mammoth', () => ({
  convertToHtml: (...args: unknown[]) => mockConvertToHtml(...args),
}));

// Mock html-to-markdown to verify it's called with correct HTML
const mockHtmlToMarkdown = vi.fn();
vi.mock('@/lib/extraction/markdown/html-to-markdown', () => ({
  htmlToMarkdown: (...args: unknown[]) => mockHtmlToMarkdown(...args),
}));

describe('DocxExtractor', () => {
  let extractor: DocxExtractor;

  beforeEach(() => {
    extractor = new DocxExtractor();
    vi.clearAllMocks();

    // Default mock: mammoth converts DOCX to HTML
    mockConvertToHtml.mockResolvedValue({
      value: '<h1>Title</h1><p>Content</p>',
      messages: [],
    });

    // Default mock: htmlToMarkdown converts HTML to Markdown
    mockHtmlToMarkdown.mockResolvedValue('# Title\n\nContent');
  });

  it('implements Extractor interface', () => {
    expect(extractor).toHaveProperty('extract');
    expect(typeof extractor.extract).toBe('function');
  });

  it('extracts HTML from DOCX and converts to markdown', async () => {
    const buffer = Buffer.from('fake-docx-content');
    const result = await extractor.extract(buffer, 'test.docx');

    expect(mockConvertToHtml).toHaveBeenCalledWith({
      buffer: Buffer.from(buffer),
    });
    expect(mockHtmlToMarkdown).toHaveBeenCalledWith('<h1>Title</h1><p>Content</p>');

    expect(result.extractedContent).toBe('<h1>Title</h1><p>Content</p>');
    expect(result.extractedMarkdown).toBe('# Title\n\nContent');
    expect(result.warnings).toEqual([]);
  });

  it('captures mammoth warnings in warnings array', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '<p>Text with embedded image</p>',
      messages: [
        { type: 'warning', message: 'Image not found: missing.png' },
        { type: 'warning', message: 'Unrecognized style: CustomStyle' },
      ],
    });

    const buffer = Buffer.from('docx-with-warnings');
    const result = await extractor.extract(buffer, 'warnings.docx');

    expect(result.warnings).toEqual([
      'Image not found: missing.png',
      'Unrecognized style: CustomStyle',
    ]);
  });

  it('embeds mammoth conversion warnings as HTML comments in extractedMarkdown (D-10)', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '<p>Content</p>',
      messages: [
        { type: 'warning', message: 'Image not found: missing.png' },
      ],
    });
    mockHtmlToMarkdown.mockResolvedValue('Content');

    const buffer = Buffer.from('docx-with-warning');
    const result = await extractor.extract(buffer, 'warning.docx');

    // D-10: warnings should appear as HTML comments in extractedMarkdown
    expect(result.extractedMarkdown).toContain('<!-- [Conversion warning: Image not found: missing.png] -->');
    expect(result.extractedMarkdown).toContain('Content');
  });

  it('handles multiple warnings as separate HTML comments', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '<p>Text</p>',
      messages: [
        { type: 'warning', message: 'First warning' },
        { type: 'warning', message: 'Second warning' },
      ],
    });
    mockHtmlToMarkdown.mockResolvedValue('Text');

    const buffer = Buffer.from('docx-multi-warnings');
    const result = await extractor.extract(buffer, 'multi.docx');

    expect(result.extractedMarkdown).toContain('<!-- [Conversion warning: First warning] -->');
    expect(result.extractedMarkdown).toContain('<!-- [Conversion warning: Second warning] -->');
  });

  it('does not add warning comments when no warnings', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '<p>Clean content</p>',
      messages: [],
    });
    mockHtmlToMarkdown.mockResolvedValue('Clean content');

    const buffer = Buffer.from('clean-docx');
    const result = await extractor.extract(buffer, 'clean.docx');

    expect(result.extractedMarkdown).not.toContain('<!-- [Conversion warning:');
    expect(result.extractedMarkdown).toBe('Clean content');
  });

  it('handles empty DOCX (no content, no warnings)', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '',
      messages: [],
    });
    mockHtmlToMarkdown.mockResolvedValue('');

    const buffer = Buffer.from('empty-docx');
    const result = await extractor.extract(buffer, 'empty.docx');

    expect(result.extractedContent).toBe('');
    expect(result.extractedMarkdown).toBe('');
    expect(result.warnings).toEqual([]);
  });

  it('propagates mammoth errors', async () => {
    mockConvertToHtml.mockRejectedValue(new Error('Invalid DOCX format'));

    const buffer = Buffer.from('corrupt-docx');
    await expect(extractor.extract(buffer, 'corrupt.docx')).rejects.toThrow(
      'Invalid DOCX format'
    );
  });

  it('creates fresh Buffer from input buffer for mammoth', async () => {
    const buffer = Buffer.from('docx-data');
    await extractor.extract(buffer, 'test.docx');

    expect(mockConvertToHtml).toHaveBeenCalledWith({
      buffer: expect.any(Buffer),
    });
    // The buffer should contain the same data
    const passedBuffer = mockConvertToHtml.mock.calls[0][0].buffer;
    expect(Buffer.from(passedBuffer).toString()).toBe('docx-data');
  });
});
