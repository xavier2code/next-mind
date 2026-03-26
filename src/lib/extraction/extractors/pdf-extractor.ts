/**
 * PDF content extractor using unpdf.
 *
 * Extracts raw text from PDF files and converts to Markdown
 * using rule-based text-to-Markdown heuristics (D-11).
 *
 * unpdf is loaded via dynamic import() per D-04 to bypass Turbopack.
 */

import type { Extractor, ExtractorResult } from '../types';
import { textToMarkdown } from '../markdown/pdf-to-markdown';

export class PdfExtractor implements Extractor {
  async extract(buffer: Buffer, filename: string): Promise<ExtractorResult> {
    const { extractText, getDocumentProxy } = await import('unpdf');

    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });

    return {
      extractedContent: text,
      extractedMarkdown: textToMarkdown(text),
    };
  }
}
