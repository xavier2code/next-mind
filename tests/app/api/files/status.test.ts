import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/files/[id]/status/route';

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

describe('GET /api/files/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await GET(new Request('http://localhost/api/files/test-id/status'), {
      params: Promise.resolve({ id: 'test-id' }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when file not found', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce(undefined);

    const response = await GET(new Request('http://localhost/api/files/test-id/status'), {
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
      status: 'uploaded',
      errorMessage: null,
    });

    const response = await GET(new Request('http://localhost/api/files/test-id/status'), {
      params: Promise.resolve({ id: 'test-id' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('File not found');
  });

  it('returns 200 with file status for authenticated user', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-id-1',
      userId: 'user-1',
      status: 'ready',
      errorMessage: null,
    });

    const response = await GET(new Request('http://localhost/api/files/file-id-1/status'), {
      params: Promise.resolve({ id: 'file-id-1' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      id: 'file-id-1',
      status: 'ready',
      errorMessage: null,
    });
  });

  it('returns 200 with failed status and errorMessage', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-id-2',
      userId: 'user-1',
      status: 'failed',
      errorMessage: 'Extraction timed out after 30000ms',
    });

    const response = await GET(new Request('http://localhost/api/files/file-id-2/status'), {
      params: Promise.resolve({ id: 'file-id-2' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      id: 'file-id-2',
      status: 'failed',
      errorMessage: 'Extraction timed out after 30000ms',
    });
  });

  it('returns 200 with processing status', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-id-3',
      userId: 'user-1',
      status: 'processing',
      errorMessage: null,
    });

    const response = await GET(new Request('http://localhost/api/files/file-id-3/status'), {
      params: Promise.resolve({ id: 'file-id-3' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('processing');
  });
});
