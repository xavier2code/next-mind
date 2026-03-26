import { describe, it, expect } from 'vitest';
import { textToMarkdown } from '@/lib/extraction/markdown/pdf-to-markdown';

describe('textToMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(textToMarkdown('')).toBe('');
    expect(textToMarkdown('   ')).toBe('');
    expect(textToMarkdown(null as unknown as string)).toBe('');
    expect(textToMarkdown(undefined as unknown as string)).toBe('');
  });

  it('converts ALL-CAPS lines to headings', () => {
    const input = 'INTRODUCTION\n\nThis is some text.';
    const result = textToMarkdown(input);
    expect(result).toContain('## INTRODUCTION');
    expect(result).toContain('This is some text.');
  });

  it('ignores short ALL-CAPS lines (< 4 chars) as headings', () => {
    const input = 'ABC\nSome text after.';
    const result = textToMarkdown(input);
    // "ABC" is 3 chars, should NOT be a heading
    expect(result).not.toContain('## ABC');
  });

  it('converts numbered main headings (ALL-CAPS after number)', () => {
    const input = '1. INTRODUCTION\n\nThis is body text.';
    const result = textToMarkdown(input);
    expect(result).toContain('## 1. INTRODUCTION');
    expect(result).toContain('This is body text.');
  });

  it('converts numbered sub-headings (ALL-CAPS after number.number)', () => {
    const input = '1.1 OVERVIEW\n\nDetail text.';
    const result = textToMarkdown(input);
    expect(result).toContain('### 1.1 OVERVIEW');
    expect(result).toContain('Detail text.');
  });

  it('keeps numbered list items as-is when text is not ALL-CAPS', () => {
    const input = '1. First item\n2. Second item\n3. Third item';
    const result = textToMarkdown(input);
    expect(result).toContain('1. First item');
    expect(result).toContain('2. Second item');
    expect(result).toContain('3. Third item');
    // Should NOT be headings
    expect(result).not.toContain('## 1. First item');
  });

  it('preserves bullet list items', () => {
    const input = '- Item one\n- Item two\n* Star item\n* Another star';
    const result = textToMarkdown(input);
    expect(result).toContain('- Item one');
    expect(result).toContain('- Item two');
    expect(result).toContain('* Star item');
    expect(result).toContain('* Another star');
  });

  it('handles "o" bullet lists', () => {
    const input = 'o First circle item\no Second circle item';
    const result = textToMarkdown(input);
    expect(result).toContain('o First circle item');
    expect(result).toContain('o Second circle item');
  });

  it('separates paragraphs with blank lines', () => {
    const input = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const result = textToMarkdown(input);
    expect(result).toContain('First paragraph.');
    expect(result).toContain('Second paragraph.');
    expect(result).toContain('Third paragraph.');
    // Paragraphs should be separated by blank lines
    const lines = result.split('\n');
    const firstParaEnd = lines.indexOf('First paragraph.');
    const secondParaStart = lines.indexOf('Second paragraph.');
    expect(secondParaStart - firstParaEnd).toBeGreaterThanOrEqual(2);
  });

  it('handles mixed content with headings, lists, and paragraphs', () => {
    const input = `DOCUMENT TITLE

1. CHAPTER ONE

1.1 SECTION OVERVIEW

This is the first paragraph of the section.

- Bullet point one
- Bullet point two

This is the second paragraph.`;

    const result = textToMarkdown(input);

    expect(result).toContain('## DOCUMENT TITLE');
    expect(result).toContain('## 1. CHAPTER ONE');
    expect(result).toContain('### 1.1 SECTION OVERVIEW');
    expect(result).toContain('- Bullet point one');
    expect(result).toContain('- Bullet point two');
    expect(result).toContain('This is the first paragraph of the section.');
    expect(result).toContain('This is the second paragraph.');
  });

  it('handles lines that are only digits (should not crash)', () => {
    const input = '123\nSome text\n456';
    const result = textToMarkdown(input);
    expect(result).toContain('123');
    expect(result).toContain('Some text');
    expect(result).toContain('456');
  });

  it('handles trailing whitespace gracefully', () => {
    const input = 'Hello world  \n\n  Next line  ';
    const result = textToMarkdown(input);
    expect(result).toContain('Hello world');
    expect(result).toContain('Next line');
  });
});
