import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logAudit, getClientInfo } from '@/lib/audit';
import { storeFile } from '@/lib/storage/provider';
import { getFileType } from '@/lib/storage/types';
import { validateFileServer, getMimeType } from '@/lib/validation/file-validation';
import { createFile } from '@/lib/db/queries';
import { logger, generateRequestId } from '@/lib/monitoring';
import { Readable } from 'stream';
import Busboy from 'busboy';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs'; // REQUIRED for busboy
export const maxDuration = 60; // 60s for large file uploads

const SMALL_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * POST /api/files/upload
 * Unified upload endpoint with dual transport strategy.
 * Small files (<10MB): request.formData()
 * Large files (>=10MB): busboy streaming
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // 1. Auth check (following existing API route pattern)
  const session = await auth();
  if (!session?.user?.id) {
    logger.securityEvent('Unauthenticated upload attempt', undefined);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  logger.apiRequest(requestId, 'POST', '/api/files/upload', userId);

  try {
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    const useStreaming = contentLength >= SMALL_FILE_THRESHOLD;

    let result: {
      id: string;
      filename: string;
      size: number;
      mimeType: string;
      fileType: 'document' | 'code' | 'data';
      storagePath: string;
      status: string;
    };

    if (useStreaming) {
      result = await handleStreamingUpload(request, userId, requestId);
    } else {
      result = await handleFormDataUpload(request, userId, requestId);
    }

    const durationMs = Date.now() - startTime;
    logger.apiResponse(requestId, 'POST', '/api/files/upload', 200, durationMs);

    return NextResponse.json(result);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error(
      'api',
      'Upload API error',
      error instanceof Error ? error : new Error(String(error)),
      { requestId, userId, durationMs }
    );
    logger.apiResponse(requestId, 'POST', '/api/files/upload', 500, durationMs);

    if (error instanceof Error) {
      if (error.message === 'File too large') {
        return NextResponse.json({ error: 'File exceeds 100MB' }, { status: 413 });
      }
      if (error.message === 'Unsupported file type') {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}

/**
 * Handle small file upload via request.formData().
 * Used for files < 10MB.
 */
async function handleFormDataUpload(
  request: NextRequest,
  userId: string,
  requestId: string
) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    throw new Error('No file provided');
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Server-side validation (magic bytes)
  const validationError = await validateFileServer(buffer, file.name, file.type);
  if (validationError) {
    throw new Error(validationError);
  }

  // Generate file ID and store
  const fileId = randomUUID();
  const storagePath = await storeFile(userId, fileId, file.name, buffer);
  const fileType = getFileType(file.name);
  const mimeType = getMimeType(file.name);

  // Persist metadata in database
  const dbFile = await createFile(userId, {
    filename: file.name,
    mimeType,
    size: buffer.length,
    fileType,
    storagePath,
  });

  // Audit log (fire-and-forget per existing pattern)
  logAudit({
    userId,
    action: 'file_upload',
    resource: 'file',
    resourceId: dbFile.id,
    metadata: { filename: file.name, size: buffer.length, mimeType, fileType },
    ...getClientInfo(request),
  }).catch(() => {});

  logger.debug('upload', 'File uploaded via formData', { requestId, fileId, filename: file.name });

  return {
    id: dbFile.id,
    filename: dbFile.filename,
    size: dbFile.size,
    mimeType: dbFile.mimeType,
    fileType: dbFile.fileType as 'document' | 'code' | 'data',
    storagePath: dbFile.storagePath,
    status: dbFile.status,
  };
}

/**
 * Handle large file upload via busboy streaming.
 * Used for files >= 10MB.
 * Per RESEARCH.md: Converts Web API ReadableStream to Node.js stream via Readable.fromWeb().
 */
async function handleStreamingUpload(
  request: NextRequest,
  userId: string,
  requestId: string
) {
  return new Promise<{
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    fileType: 'document' | 'code' | 'data';
    storagePath: string;
    status: string;
  }>((resolve, reject) => {
    const nodeStream = Readable.fromWeb(request.body as ReadableStream);
    const headers = Object.fromEntries(request.headers);

    const busboy = Busboy({
      headers,
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
      },
    });

    let fileBuffer: Buffer[] = [];
    let filename = '';
    let totalSize = 0;

    busboy.on('file', (fieldname, file, info) => {
      filename = info.filename;

      file.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          file.destroy();
          reject(new Error('File too large'));
          return;
        }
        fileBuffer.push(chunk);
      });

      file.on('end', () => {
        busboy.emit('close');
      });

      file.on('error', (err) => {
        reject(err);
      });
    });

    busboy.on('close', async () => {
      try {
        if (fileBuffer.length === 0) {
          reject(new Error('No file provided'));
          return;
        }

        const buffer = Buffer.concat(fileBuffer);

        // Server-side validation (magic bytes)
        const validationError = await validateFileServer(buffer, filename, '');
        if (validationError) {
          reject(new Error(validationError));
          return;
        }

        // Generate file ID and store
        const fileId = randomUUID();
        const storagePath = await storeFile(userId, fileId, filename, buffer);
        const fileType = getFileType(filename);
        const mimeType = getMimeType(filename);

        // Persist metadata in database
        const dbFile = await createFile(userId, {
          filename,
          mimeType,
          size: buffer.length,
          fileType,
          storagePath,
        });

        // Audit log (fire-and-forget)
        logAudit({
          userId,
          action: 'file_upload',
          resource: 'file',
          resourceId: dbFile.id,
          metadata: { filename, size: buffer.length, mimeType, fileType, transport: 'streaming' },
          ...getClientInfo(request),
        }).catch(() => {});

        logger.debug('upload', 'File uploaded via streaming', { requestId, fileId, filename });

        resolve({
          id: dbFile.id,
          filename: dbFile.filename,
          size: dbFile.size,
          mimeType: dbFile.mimeType,
          fileType: dbFile.fileType as 'document' | 'code' | 'data',
          storagePath: dbFile.storagePath,
          status: dbFile.status,
        });
      } catch (err) {
        reject(err);
      }
    });

    busboy.on('error', (err) => {
      reject(err);
    });

    // Limit parsing to 120 seconds
    setTimeout(() => {
      busboy.destroy();
      reject(new Error('Upload timeout'));
    }, 120_000);

    nodeStream.pipe(busboy);
  });
}
