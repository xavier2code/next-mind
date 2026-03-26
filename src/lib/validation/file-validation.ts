import { ACCEPTED_EXTENSIONS } from '@/lib/storage/types';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Client-side file validation.
 * Returns null if valid, error message string if invalid.
 */
export function validateFileClient(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();

  if (!ACCEPTED_EXTENSIONS.includes(ext as typeof ACCEPTED_EXTENSIONS[number])) {
    return 'Unsupported file type';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File exceeds 100MB';
  }

  return null;
}
