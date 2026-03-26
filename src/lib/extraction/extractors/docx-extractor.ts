/**
 * DOCX content extractor using mammoth + turndown.
 *
 * Pipeline: DOCX buffer -> mammoth.convertToHtml() -> htmlToMarkdown() -> Markdown
 *
 * mammoth conversion warnings are embedded as HTML comments in extractedMarkdown
 * per D-10 so users and LLMs know which content was simplified or lost.
 *
 * mammoth is loaded via dynamic import() per D-04/D-06 to bypass Turbopack.
 */

import type { Extractor, ExtractorResult } from '../types';
import { htmlToMarkdown } from '../markdown/html-to-markdown';

export class DocxExtractor implements Extractor {
  async extract(buffer: Buffer, filename: string): Promise<ExtractorResult> {
    const mammoth = await import('mammoth');

    const result = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) });
    const markdown = await htmlToMarkdown(result.value);

    // D-10: Embed conversion warnings as HTML comments in extractedMarkdown
    // so users and LLMs know which content was simplified or lost during conversion
    const warningComments = result.messages
      .map(m => `<!-- [Conversion warning: ${m.message}] -->`)
      .join('\n');
    const annotatedMarkdown = warningComments
      ? `${warningComments}\n${markdown}`
      : markdown;

    return {
      extractedContent: result.value,
      extractedMarkdown: annotatedMarkdown,
      warnings: result.messages.map(m => m.message),
    };
  }
}
