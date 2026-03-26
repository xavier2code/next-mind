export interface StorageConfig {
  driver: 'local' | 's3';
  localPath?: string;
  s3Config?: {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    bucket: string;
    region?: string;
  };
}

export interface UploadResponse {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  fileType: 'document' | 'code' | 'data';
  storagePath: string;
  status: string;
}

export interface StorageError {
  code: 'NOT_FOUND' | 'STORAGE_ERROR' | 'QUOTA_EXCEEDED' | 'INVALID_CONFIG';
  message: string;
}

/** Accepted file extensions per UPLD-03 */
export const ACCEPTED_EXTENSIONS = [
  '.pdf', '.docx',
  '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.css', '.html', '.json', '.yaml', '.yml', '.md', '.sql', '.sh', '.bash', '.zsh',
  '.csv', '.xlsx',
] as const;

/** Map file extension to fileType category per D-14 */
export function getFileType(filename: string): 'document' | 'code' | 'data' {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  if (['.pdf', '.docx'].includes(ext)) return 'document';
  if (['.csv', '.xlsx'].includes(ext)) return 'data';
  return 'code';
}
