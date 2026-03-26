import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockXlsxLoad = vi.fn();
const mockWorkbook = {
  worksheets: [] as ReturnType<typeof createMockWorksheet>[],
  xlsx: { load: mockXlsxLoad },
};

// Mock exceljs Workbook as a class constructor
vi.mock('exceljs', () => ({
  Workbook: vi.fn(function () {
    return mockWorkbook;
  }),
}));

import { ExcelExtractor } from '@/lib/extraction/extractors/excel-extractor';

function createMockWorksheet(
  headers: string[],
  dataRows: (string | number | undefined)[][],
) {
  const rows = [
    // Row 1 (header) -- index 0 is undefined in exceljs
    { values: [undefined, ...headers] },
    // Data rows
    ...dataRows.map(row => ({ values: [undefined, ...row] })),
  ];
  return {
    rowCount: rows.length,
    getRow: vi.fn((rowNum: number) => rows[rowNum - 1] || { values: undefined }),
    values: rows.map(r => r.values),
  };
}

describe('ExcelExtractor', () => {
  let extractor: ExcelExtractor;

  beforeEach(() => {
    extractor = new ExcelExtractor();
    vi.clearAllMocks();
    mockXlsxLoad.mockResolvedValue(undefined);
  });

  it('produces Markdown table and JSON content from standard Excel', async () => {
    const worksheet = createMockWorksheet(
      ['name', 'age', 'city'],
      [
        ['Alice', 30, 'Beijing'],
        ['Bob', 25, 'Shanghai'],
      ],
    );
    mockWorkbook.worksheets = [worksheet];

    const buffer = Buffer.from('fake-xlsx-binary');
    const result = await extractor.extract(buffer, 'data.xlsx');

    expect(result.extractedMarkdown).toContain('| name | age | city |');
    expect(result.extractedMarkdown).toContain('| --- | --- | --- |');
    expect(result.extractedMarkdown).toContain('| Alice | 30 | Beijing |');
    expect(result.extractedMarkdown).toContain('| Bob | 25 | Shanghai |');

    const parsed = JSON.parse(result.extractedContent);
    expect(parsed).toEqual([
      { name: 'Alice', age: 30, city: 'Beijing' },
      { name: 'Bob', age: 25, city: 'Shanghai' },
    ]);
  });

  it('reads only first worksheet and ignores others', async () => {
    const firstSheet = createMockWorksheet(['a'], [[1]]);
    const secondSheet = createMockWorksheet(['b'], [[2]]);
    mockWorkbook.worksheets = [firstSheet, secondSheet];

    const buffer = Buffer.from('fake-xlsx');
    const result = await extractor.extract(buffer, 'multi.xlsx');

    const parsed = JSON.parse(result.extractedContent);
    expect(parsed).toEqual([{ a: 1 }]);
  });

  it('adds warning when rows exceed 1000 limit', async () => {
    const headers = ['col'];
    const dataRows: (string | number)[][] = [];
    for (let i = 1; i <= 1500; i++) {
      dataRows.push([i]);
    }
    const worksheet = createMockWorksheet(headers, dataRows);
    mockWorkbook.worksheets = [worksheet];

    const buffer = Buffer.from('fake-xlsx');
    const result = await extractor.extract(buffer, 'large.xlsx');

    expect(result.warnings).toBeDefined();
    expect(result.warnings).toContain('Only extracted first 1000 rows (total 1500 rows)');

    const parsed = JSON.parse(result.extractedContent);
    expect(parsed).toHaveLength(1000);
  });

  it('returns empty table for worksheet with only headers', async () => {
    const worksheet = createMockWorksheet(['h1', 'h2'], []);
    mockWorkbook.worksheets = [worksheet];

    const buffer = Buffer.from('fake-xlsx');
    const result = await extractor.extract(buffer, 'headers-only.xlsx');

    expect(result.extractedMarkdown).toContain('| h1 | h2 |');
    expect(result.extractedContent).toBe('[]');
  });

  it('throws error when no worksheets exist', async () => {
    mockWorkbook.worksheets = [];

    const buffer = Buffer.from('fake-xlsx');
    await expect(extractor.extract(buffer, 'empty.xlsx')).rejects.toThrow(
      'Excel file has no worksheets',
    );
  });

  it('handles null cell values as empty strings', async () => {
    const worksheet = createMockWorksheet(['name', 'email'], [
      ['Alice', null],
      [undefined, 'bob@test.com'],
    ]);
    mockWorkbook.worksheets = [worksheet];

    const buffer = Buffer.from('fake-xlsx');
    const result = await extractor.extract(buffer, 'sparse.xlsx');

    const parsed = JSON.parse(result.extractedContent);
    expect(parsed).toEqual([
      { name: 'Alice', email: '' },
      { name: '', email: 'bob@test.com' },
    ]);
  });
});
