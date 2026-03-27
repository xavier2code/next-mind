/** Attachment file metadata for display in the attachment bar (D-08) */
export interface AttachmentFile {
  id: string;
  filename: string;
  fileType: string;
  size: number;
}

/** Result of the file content injection process */
export interface InjectionResult {
  /** The final enriched message content (original + file blocks, or original if no files) */
  enrichedContent: string;
  /** Attachment metadata for the UI attachment bar */
  attachments: AttachmentFile[];
  /** Warning message if some/all files were skipped or content was truncated */
  warning?: string;
}

/** Shape returned by GET /api/files/:id (subset of File DB record) */
export interface FileApiResponse {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  fileType: 'document' | 'code' | 'data' | null;
  status: string;
  extractedContent: string | null;
  extractedMarkdown: string | null;
}
