import type { Extractor, ExtractorResult } from '../types';
import { jsonToMarkdownTable } from '../markdown/table-formatter';

const MAX_ROWS = 1000; // D-08

export class ExcelExtractor implements Extractor {
  async extract(buffer: Buffer, filename: string): Promise<ExtractorResult> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    // D-09: Only first sheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel file has no worksheets');
    }

    // Extract headers from first row (index 1 in exceljs)
    const headerRow = worksheet.getRow(1);
    const rawHeaders = headerRow.values as (string | number | undefined)[];
    const headers = rawHeaders.slice(1).map(h => String(h ?? '')); // Skip column 0 (undefined in exceljs)

    // Read data rows with limit (D-08)
    const rows: Record<string, unknown>[] = [];
    const totalRows = worksheet.rowCount - 1; // Exclude header

    let rowCount = 0;
    for (let rowNum = 2; rowNum <= worksheet.rowCount && rowCount < MAX_ROWS; rowNum++) {
      const row = worksheet.getRow(rowNum);
      if (!row || row.values === undefined) continue;

      const values = row.values as (string | number | undefined)[];
      const record: Record<string, unknown> = {};
      for (let i = 0; i < headers.length; i++) {
        record[headers[i] || `col_${i}`] = values[i + 1] ?? ''; // +1 because values[0] is undefined
      }
      rows.push(record);
      rowCount++;
    }

    const warnings: string[] = [];
    if (totalRows > MAX_ROWS) {
      warnings.push(`Only extracted first ${MAX_ROWS} rows (total ${totalRows} rows)`);
    }

    return {
      extractedContent: JSON.stringify(rows),
      extractedMarkdown: jsonToMarkdownTable(headers, rows, MAX_ROWS),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
