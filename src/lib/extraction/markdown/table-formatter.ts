/**
 * Convert structured data (headers + rows) to a GFM Markdown table.
 * Per D-07: data files store dual formats -- Markdown table for human/LLM
 * consumption and JSON string for programmatic processing.
 */

const DEFAULT_MAX_ROWS = 1000;

export function jsonToMarkdownTable(
  headers: string[],
  rows: Record<string, unknown>[],
  maxRows: number = DEFAULT_MAX_ROWS,
): string {
  if (headers.length === 0) return '';

  const displayRows = rows.slice(0, maxRows);

  const headerLine = '| ' + headers.join(' | ') + ' |';
  const separatorLine = '| ' + headers.map(() => '---').join(' | ') + ' |';

  const dataLines = displayRows.map(row =>
    '| ' + headers.map(h => String(row[h] ?? '')).join(' | ') + ' |',
  );

  return [headerLine, separatorLine, ...dataLines].join('\n');
}
