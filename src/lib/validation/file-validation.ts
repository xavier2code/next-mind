import { ACCEPTED_EXTENSIONS } from '@/lib/storage/types';
import { fileTypeFromBuffer } from 'file-type';
import mime from 'mime-types';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per UPLD-04

/**
 * Client-side file validation (runs in browser).
 * Checks extension whitelist and file size. Fast rejection.
 * Per UPLD-03: defense-in-depth, first layer.
 *
 * Returns null if valid, or a user-facing error string.
 */
export function validateFileClient(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();

  // Extension whitelist check
  if (!ACCEPTED_EXTENSIONS.includes(ext as typeof ACCEPTED_EXTENSIONS[number])) {
    return 'Unsupported file type';
  }

  // Size check per UPLD-04
  if (file.size > MAX_FILE_SIZE) {
    return 'File exceeds 100MB';
  }

  return null;
}

/**
 * Server-side file validation using magic byte inspection.
 * Security-critical: verifies uploaded files match their claimed type.
 * Per RESEARCH.md Pitfall 1: client-side checks are easily bypassed.
 *
 * Returns null if valid, or a user-facing error string.
 */
export async function validateFileServer(
  buffer: Buffer,
  originalFilename: string,
  declaredMimeType: string
): Promise<string | null> {
  // Magic byte validation
  // file-type v5 expects Uint8Array, not Node.js Buffer
  const detectedType = await fileTypeFromBuffer(new Uint8Array(buffer));

  if (detectedType) {
    const detectedExt = '.' + detectedType.ext;
    const fileExt = '.' + (originalFilename.split('.').pop() || '').toLowerCase();

    // Special handling for ZIP-based formats (DOCX, XLSX all start with PK)
    // file-type detects these as 'zip', but we accept .docx and .xlsx
    const zipBasedExtensions = ['.docx', '.xlsx'];
    const isZipBased = zipBasedExtensions.includes(fileExt);

    if (isZipBased) {
      // For ZIP-based formats, verify the detected type is 'zip' or the specific format
      if (detectedType.ext !== 'zip' && detectedType.ext !== 'docx' && detectedType.ext !== 'xlsx') {
        return 'Unsupported file type';
      }
    } else {
      // For non-ZIP formats, the extension should match the detected type
      const acceptedDetections: Record<string, string[]> = {
        '.pdf': ['pdf'],
        '.csv': ['csv', 'txt', 'plain'],
      };

      const allowedDetections = acceptedDetections[fileExt];
      if (allowedDetections && !allowedDetections.includes(detectedType.ext)) {
        return 'Unsupported file type';
      }
    }
  }

  // Size check (server-side, defense in depth)
  if (buffer.length > MAX_FILE_SIZE) {
    return 'File exceeds 100MB';
  }

  // Extension whitelist check (server-side, defense in depth)
  const ext = '.' + (originalFilename.split('.').pop() || '').toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext as typeof ACCEPTED_EXTENSIONS[number])) {
    return 'Unsupported file type';
  }

  return null;
}

/**
 * Get MIME type from file extension.
 * Falls back to 'application/octet-stream' for unknown types.
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop() || '';
  return mime.lookup(ext) || 'application/octet-stream';
}
