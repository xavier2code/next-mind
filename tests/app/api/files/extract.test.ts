import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/files/[id]/extract/route';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// Mock DB queries
const mockGetFileById = vi.fn();
vi.mock('@/lib/db/queries', () => ({
  getFileById: (...args: unknown[]) => mockGetFileById(...args),
}));

// Mock dispatcher
const mockExtractFile = vi.fn();
vi.mock('@/lib/extraction/dispatcher', () => ({
  extractFile: (...args: unknown[]) => mockExtractFile(...args),
}));

describe('POST /api/files/[id]/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await POST(new Request('http://localhost/api/files/test-id/extract', { method: 'POST' }), {
      params: Promise.resolve({ id: 'test-id' }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when file not found', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce(undefined);

    const response = await POST(new Request('http://localhost/api/files/test-id/extract', { method: 'POST' }), {
      params: Promise.resolve({ id: 'test-id' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('File not found');
  });

  it('returns 404 when file owned by different user', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'test-id',
      userId: 'user-2',
      status: 'failed',
    });

    const response = await POST(new Request('http://localhost/api/files/test-id/extract', { method: 'POST' }), {
      params: Promise.resolve({ id: 'test-id' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('File not found');
  });

  it('returns 409 when file status is not failed', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-id-1',
      userId: 'user-1',
      status: 'ready',
    });

    const response = await POST(new Request('http://localhost/api/files/file-id-1/extract', { method: 'POST' }), {
      params: Promise.resolve({ id: 'file-id-1' }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('Only failed files can be retried');
    expect(mockExtractFile).not.toHaveBeenCalled();
  });

  it('returns 409 when file status is processing', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-id-2',
      userId: 'user-1',
      status: 'processing',
    });

    const response = await POST(new Request('http://localhost/api/files/file-id-2/extract', { method: 'POST' }), {
      params: Promise.resolve({ id: 'file-id-2' }),
    });

    expect(response.status).toBe(409);
    expect(mockExtractFile).not.toHaveBeenCalled();
  });

  it('returns 200 and triggers extraction for failed file', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-id-3',
      userId: 'user-1',
      status: 'failed',
      errorMessage: 'Extraction failed',
    });
    mockExtractFile.mockResolvedValueOnce(undefined);

    const response = await POST(new Request('http://localhost/api/files/file-id-3/extract', { method: 'POST' }), {
      params: Promise.resolve({ id: 'file-id-3' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      id: 'file-id-3',
      status: 'processing',
    });
    expect(mockExtractFile).toHaveBeenCalledWith('file-id-3');
  });

  it('returns 409 when file status is uploaded', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-id-4',
      userId: 'user-1',
      status: 'uploaded',
    });

    const response = await POST(new Request('http://localhost/api/files/file-id-4/extract', { method: 'POST' }), {
      params: Promise.resolve({ id: 'file-id-4' }),
    });

    expect(response.status).toBe(409);
    expect(mockExtractFile).not.toHaveBeenCalled();
  });
});
