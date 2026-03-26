import type { Extractor, ExtractorResult } from '../types';
import { jsonToMarkdownTable } from '../markdown/table-formatter';

const MAX_ROWS = 1000; // D-08

export class CsvExtractor implements Extractor {
  async extract(buffer: Buffer, filename: string): Promise<ExtractorResult> {
    const Papa = await import('papaparse');
    const csvText = buffer.toString('utf-8');
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = result.data as Record<string, unknown>[];
    const fields = result.meta.fields || [];
    const truncated = rows.length > MAX_ROWS;
    const displayRows = rows.slice(0, MAX_ROWS);

    const warnings: string[] = [];
    if (truncated) {
      warnings.push(`Only extracted first ${MAX_ROWS} rows (total ${rows.length} rows)`);
    }
    result.errors.forEach(err => {
      warnings.push(`CSV parse error: ${err.message}`);
    });

    return {
      extractedContent: JSON.stringify(displayRows),
      extractedMarkdown: jsonToMarkdownTable(fields, displayRows, MAX_ROWS),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
