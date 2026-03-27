import type { FileApiResponse, InjectionResult, AttachmentFile } from './types';

/** Maximum total character count for all file blocks combined (D-02) */
export const MAX_TOTAL_CHARS = 10000;

/**
 * Format file size in human-readable form.
 * Duplicated from file-chip.tsx to avoid importing a React component module from a utility.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Fetch file metadata and content for a list of file IDs.
 * Calls GET /api/files/:id for each file ID in parallel.
 */
export async function fetchFileContents(
  fileIds: string[]
): Promise<{ files: FileApiResponse[]; skippedCount: number }> {
  const responses = await Promise.all(
    fileIds.map(id =>
      fetch(`/api/files/${id}`).then(r => r.json() as Promise<FileApiResponse>)
    )
  );

  let skippedCount = 0;
  for (const file of responses) {
    if (file.status !== 'ready' || !file.extractedMarkdown) {
      skippedCount++;
    }
  }

  return { files: responses, skippedCount };
}

/**
 * Format a single file as a delimited block per D-03.
 * Format: `\n\n---\n📎 {filename} ({fileType}, {size})\n{content}\n---\n`
 */
export function formatFileBlock(
  file: FileApiResponse,
  contentOverride?: string
): string {
  const content = contentOverride || file.extractedMarkdown || '';
  const type = file.fileType || 'unknown';
  return `\n\n---\n📎 ${file.filename} (${type}, ${formatSize(file.size)})\n${content}\n---\n`;
}

/**
 * Main entry point: fetch file contents, format blocks, apply truncation, and return enriched message.
 *
 * CHAT-01: Fetches file content and injects into message
 * CHAT-02: Uses D-03 delimiter format
 * CHAT-03: Concatenates multiple files in order
 * CHAT-04: Truncates at MAX_TOTAL_CHARS with warning
 *
 * @param message - The user's original message text
 * @param fileIds - Array of file IDs to attach
 * @param editedContents - Optional map of fileId -> user-edited content (overrides extractedMarkdown)
 */
export async function injectFileContent(
  message: string,
  fileIds: string[],
  editedContents?: Map<string, string>
): Promise<InjectionResult> {
  // No files: return original message
  if (!fileIds || fileIds.length === 0) {
    return { enrichedContent: message, attachments: [] };
  }

  // Fetch all file contents in parallel
  const { files, skippedCount } = await fetchFileContents(fileIds);

  // Filter to ready files with content
  const readyFiles = files.filter(
    f => f.status === 'ready' && f.extractedMarkdown
  );

  // ALL files skipped
  if (readyFiles.length === 0) {
    return {
      enrichedContent: message,
      attachments: [],
      warning: '所有文件仍在处理中，请稍后再试',
    };
  }

  // Build file blocks with truncation
  let enrichedContent = message;
  const attachments: AttachmentFile[] = [];
  let totalChars = 0;
  let truncated = false;

  for (const file of readyFiles) {
    const editedContent = editedContents?.get(file.id);
    const content = editedContent || file.extractedMarkdown || '';
    const type = file.fileType || 'unknown';
    const header = `\n\n---\n📎 ${file.filename} (${type}, ${formatSize(file.size)})\n`;
    const footer = '\n---\n';
    const fullBlock = header + content + footer;

    if (totalChars + fullBlock.length > MAX_TOTAL_CHARS) {
      // Truncate mid-file
      const remaining = MAX_TOTAL_CHARS - totalChars;
      if (remaining > header.length) {
        // We can fit at least the header and some content
        const contentBudget = remaining - header.length - footer.length;
        if (contentBudget > 0) {
          enrichedContent += header + content.slice(0, contentBudget) + footer;
          totalChars += header.length + contentBudget + footer.length;
        }
      }
      enrichedContent += '\n\n[Content truncated...]';
      truncated = true;
      // Still add this file to attachments since partial content was included
      attachments.push({
        id: file.id,
        filename: file.filename,
        fileType: type,
        size: file.size,
      });
      break;
    }

    enrichedContent += fullBlock;
    totalChars += fullBlock.length;
    attachments.push({
      id: file.id,
      filename: file.filename,
      fileType: type,
      size: file.size,
    });
  }

  // Build warning
  let warning: string | undefined;
  if (truncated) {
    warning = `\n\n文件内容过长，已截断显示前 ${totalChars} 字符`;
  } else if (skippedCount > 0) {
    warning = '部分文件仍在处理中，将不会包含在消息中';
  }

  return { enrichedContent, attachments, warning };
}
