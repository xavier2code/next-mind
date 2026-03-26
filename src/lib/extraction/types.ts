/**
 * Extraction module type contracts.
 * All per-file-type extractors implement the Extractor interface.
 */

export interface ExtractorResult {
  extractedContent: string;
  extractedMarkdown: string;
  warnings?: string[];
}

export interface Extractor {
  extract(buffer: Buffer, filename: string): Promise<ExtractorResult>;
}
