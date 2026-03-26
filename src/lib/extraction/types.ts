/**
 * Content extraction type contracts.
 *
 * All file-type extractors implement the Extractor interface.
 * The dispatcher (Plan 02) routes files to the correct extractor
 * based on file type from the database record.
 */

/** Result of extracting content from a file. */
export interface ExtractorResult {
  /** Raw text or JSON string (programmatic use). */
  extractedContent: string;
  /** Markdown-formatted content (human-readable + LLM consumption). */
  extractedMarkdown: string;
  /** Non-fatal conversion warnings (e.g., mammoth conversion losses). */
  warnings?: string[];
}

/** Strategy pattern interface -- one implementation per file type. */
export interface Extractor {
  extract(buffer: Buffer, filename: string): Promise<ExtractorResult>;
}
