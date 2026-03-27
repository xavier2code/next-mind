import { describe, it, expect } from 'vitest';

describe('classifyByContent', () => {
  it('returns code for JSON config file (key-value pattern)', async () => {
    const { classifyByContent } = await import('@/lib/extraction/classifier');
    const result = await classifyByContent(
      'config.json',
      '{"port": "3000", "host": "localhost", "env": "production"}',
      null
    );
    expect(result.correctedType).toBe('code');
    expect(result.classification).toContain('config');
  });

  it('returns data for JSON array of objects', async () => {
    const { classifyByContent } = await import('@/lib/extraction/classifier');
    const result = await classifyByContent(
      'data.json',
      '[{"name":"Alice","age":30},{"name":"Bob","age":25}]',
      null
    );
    expect(result.correctedType).toBe('data');
    expect(result.classification).toContain('array');
  });

  it('returns code for package.json', async () => {
    const { classifyByContent } = await import('@/lib/extraction/classifier');
    const result = await classifyByContent(
      'package.json',
      '{"name":"my-app","version":"1.0.0","dependencies":{}}',
      null
    );
    expect(result.correctedType).toBe('code');
    expect(result.classification).toContain('config');
  });

  it('returns null for CSV file (extension already correct)', async () => {
    const { classifyByContent } = await import('@/lib/extraction/classifier');
    const result = await classifyByContent(
      'report.csv',
      null,
      'Name,Age\nAlice,30\nBob,25'
    );
    // CSV extension already maps to 'data' -- no correction needed
    expect(result.correctedType).toBeNull();
  });

  it('returns null for TypeScript file (extension already correct)', async () => {
    const { classifyByContent } = await import('@/lib/extraction/classifier');
    const result = await classifyByContent(
      'code.ts',
      'function hello() { return "world"; }',
      null
    );
    // .ts extension already maps to 'code' -- no correction needed
    expect(result.correctedType).toBeNull();
  });

  it('returns null for PDF file (extension already correct)', async () => {
    const { classifyByContent } = await import('@/lib/extraction/classifier');
    const result = await classifyByContent(
      'report.pdf',
      null,
      '# Report\n\nSome content'
    );
    // .pdf extension already maps to 'document' -- no correction needed
    expect(result.correctedType).toBeNull();
  });

  it('returns null correction when classification matches current fileType', async () => {
    const { classifyByContent } = await import('@/lib/extraction/classifier');
    // For non-JSON files, classification is always null (no correction needed)
    const result = await classifyByContent(
      'readme.md',
      '# Readme\n\nContent here',
      null
    );
    // .md is not in the special cases (csv, code, pdf), so returns null
    expect(result.correctedType).toBeNull();
    expect(result.classification).toBeNull();
  });

  it('returns null for JSON file with numeric-dominant values (not config pattern)', async () => {
    const { classifyByContent } = await import('@/lib/extraction/classifier');
    const result = await classifyByContent(
      'numbers.json',
      '{"a": 1, "b": 2, "c": 3}',
      null
    );
    // All values are numbers, not strings, so < 50% string ratio => no correction
    expect(result.correctedType).toBeNull();
  });
});
