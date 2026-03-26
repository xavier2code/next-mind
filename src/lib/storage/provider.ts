import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';
import { getFileType } from './types';

let _storage: ReturnType<typeof createStorage> | null = null;

/**
 * Get or create the storage instance. Singleton pattern.
 * Driver selection is env-driven per D-09.
 */
export function getStorage() {
  if (_storage) return _storage;

  const driver = process.env.STORAGE_DRIVER || 'local';

  if (driver === 'local') {
    _storage = createStorage({
      driver: fsDriver({
        base: process.env.STORAGE_LOCAL_PATH || './data/uploads',
      }),
    });
  } else if (driver === 's3') {
    // S3 driver loaded dynamically to avoid bundling when not needed
    const s3Driver = require('unstorage/drivers/s3').default;
    _storage = createStorage({
      driver: s3Driver({
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
        endpoint: process.env.S3_ENDPOINT,
        bucket: process.env.S3_BUCKET!,
        region: process.env.S3_REGION || 'auto',
      }),
    });
  } else {
    throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
  }

  return _storage;
}

/**
 * Store a file and return the storage path key.
 * Storage key format: {userId}/{fileId}/{filename}
 * Never uses user-provided filename directly in paths (security).
 */
export async function storeFile(
  userId: string,
  fileId: string,
  filename: string,
  data: Buffer | Uint8Array
): Promise<string> {
  const storageKey = `${userId}/${fileId}/${filename}`;
  await getStorage().setItem(storageKey, data);
  return storageKey;
}

/**
 * Retrieve a file from storage.
 */
export async function getFile(storagePath: string): Promise<Buffer | null> {
  const data = await getStorage().getItem<Buffer | Uint8Array>(storagePath);
  if (!data) return null;
  return Buffer.from(data);
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  await getStorage().removeItem(storagePath);
}

/**
 * Check if a file exists in storage.
 */
export async function fileExists(storagePath: string): Promise<boolean> {
  return getStorage().hasItem(storagePath);
}

// Re-export for convenience
export { getFileType } from './types';
