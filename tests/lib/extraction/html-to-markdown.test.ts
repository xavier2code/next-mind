import { describe, it, expect, vi } from 'vitest';
import { htmlToMarkdown } from '@/lib/extraction/markdown/html-to-markdown';

// Mock turndown to avoid bundling issues in test environment
vi.mock('turndown', () => ({
  default: class MockTurndownService {
    private options: { headingStyle: string; codeBlockStyle: string };
    constructor(options?: { headingStyle: string; codeBlockStyle: string }) {
      this.options = options ?? { headingStyle: 'atx', codeBlockStyle: 'fenced' };
    }
    turndown(html: string): string {
      // Simple HTML-to-Markdown conversion for testing
      return html
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1')
        .replace(/<ul[^>]*>|<\/ul>/gi, '')
        .replace(/<ol[^>]*>|<\/ol>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
    }
  },
}));

describe('htmlToMarkdown', () => {
  it('returns empty string for empty input', async () => {
    expect(await htmlToMarkdown('')).toBe('');
    expect(await htmlToMarkdown('   ')).toBe('');
  });

  it('converts simple HTML to Markdown', async () => {
    const html = '<h2>Title</h2><p>This is a paragraph.</p>';
    const result = await htmlToMarkdown(html);
    expect(result).toContain('## Title');
    expect(result).toContain('This is a paragraph.');
  });

  it('converts bold and italic tags', async () => {
    const html = '<p><strong>Bold text</strong> and <em>italic text</em></p>';
    const result = await htmlToMarkdown(html);
    expect(result).toContain('**Bold text**');
    expect(result).toContain('*italic text*');
  });

  it('converts list items', async () => {
    const html = '<ul><li>Item one</li><li>Item two</li></ul>';
    const result = await htmlToMarkdown(html);
    expect(result).toContain('- Item one');
    expect(result).toContain('- Item two');
  });

  it('handles complex HTML with multiple elements', async () => {
    const html = `
      <h1>Main Title</h1>
      <h2>Subtitle</h2>
      <p>First paragraph with <strong>bold</strong> text.</p>
      <p>Second paragraph.</p>
      <ul>
        <li>First item</li>
        <li>Second item</li>
      </ul>
    `;
    const result = await htmlToMarkdown(html);
    expect(result).toContain('# Main Title');
    expect(result).toContain('## Subtitle');
    expect(result).toContain('**bold**');
    expect(result).toContain('- First item');
    expect(result).toContain('- Second item');
  });

  it('handles HTML entities', async () => {
    const html = '<p>A &amp; B &lt; C &gt; D</p>';
    const result = await htmlToMarkdown(html);
    expect(result).toContain('A & B < C > D');
  });
});
