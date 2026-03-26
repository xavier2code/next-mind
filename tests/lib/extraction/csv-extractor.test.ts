import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockParse = vi.fn();

// Mock papaparse at module level so dynamic import('papaparse') resolves correctly
vi.mock('papaparse', () => ({
  parse: mockParse,
}));

import { CsvExtractor } from '@/lib/extraction/extractors/csv-extractor';

describe('CsvExtractor', () => {
  let extractor: CsvExtractor;

  beforeEach(() => {
    extractor = new CsvExtractor();
    vi.clearAllMocks();
  });

  it('produces Markdown table and JSON content from standard CSV', async () => {
    const csvText = 'name,age,city\nAlice,30,Beijing\nBob,25,Shanghai';
    const buffer = Buffer.from(csvText, 'utf-8');

    mockParse.mockReturnValue({
      data: [
        { name: 'Alice', age: '30', city: 'Beijing' },
        { name: 'Bob', age: '25', city: 'Shanghai' },
      ],
      meta: { fields: ['name', 'age', 'city'] },
      errors: [],
    });

    const result = await extractor.extract(buffer, 'data.csv');

    expect(result.extractedContent).toBe(
      JSON.stringify([
        { name: 'Alice', age: '30', city: 'Beijing' },
        { name: 'Bob', age: '25', city: 'Shanghai' },
      ]),
    );

    // Check Markdown table format
    expect(result.extractedMarkdown).toContain('| name | age | city |');
    expect(result.extractedMarkdown).toContain('| --- | --- | --- |');
    expect(result.extractedMarkdown).toContain('| Alice | 30 | Beijing |');
    expect(result.extractedMarkdown).toContain('| Bob | 25 | Shanghai |');
  });

  it('adds warning when rows exceed 1000 limit', async () => {
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < 1500; i++) {
      rows.push({ name: `user_${i}`, value: i });
    }

    mockParse.mockReturnValue({
      data: rows,
      meta: { fields: ['name', 'value'] },
      errors: [],
    });

    const buffer = Buffer.from('name,value\nheader', 'utf-8');
    const result = await extractor.extract(buffer, 'large.csv');

    expect(result.warnings).toBeDefined();
    expect(result.warnings).toContain('Only extracted first 1000 rows (total 1500 rows)');

    // JSON content should only have 1000 rows
    const parsed = JSON.parse(result.extractedContent);
    expect(parsed).toHaveLength(1000);
  });

  it('returns empty table for empty CSV', async () => {
    mockParse.mockReturnValue({
      data: [],
      meta: { fields: [] },
      errors: [],
    });

    const buffer = Buffer.from('', 'utf-8');
    const result = await extractor.extract(buffer, 'empty.csv');

    expect(result.extractedMarkdown).toBe('');
    expect(result.extractedContent).toBe('[]');
  });

  it('captures papaparse errors in warnings', async () => {
    mockParse.mockReturnValue({
      data: [{ name: 'Alice' }],
      meta: { fields: ['name'] },
      errors: [{ message: 'Quoted field unterminated', type: 'FieldMismatch', code: 'UnterminatedQuote', row: 1 }],
    });

    const buffer = Buffer.from('name\n"Alice', 'utf-8');
    const result = await extractor.extract(buffer, 'broken.csv');

    expect(result.warnings).toBeDefined();
    expect(result.warnings).toContain('CSV parse error: Quoted field unterminated');
  });

  it('calls papaparse with correct options', async () => {
    mockParse.mockReturnValue({
      data: [],
      meta: { fields: [] },
      errors: [],
    });

    const buffer = Buffer.from('a,b\n1,2', 'utf-8');
    await extractor.extract(buffer, 'test.csv');

    expect(mockParse).toHaveBeenCalledWith('a,b\n1,2', {
      header: true,
      skipEmptyLines: true,
    });
  });
});
