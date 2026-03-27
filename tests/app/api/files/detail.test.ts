import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/files/[id]/route';

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

describe('GET /api/files/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await GET(new Request('http://localhost/api/files/test-id'), {
      params: Promise.resolve({ id: 'test-id' }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when file belongs to different user', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'test-id',
      userId: 'user-2',
      filename: 'secret.pdf',
    });

    const response = await GET(new Request('http://localhost/api/files/test-id'), {
      params: Promise.resolve({ id: 'test-id' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('File not found');
  });

  it('returns 404 when file not found', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce(undefined);

    const response = await GET(new Request('http://localhost/api/files/nonexistent'), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('File not found');
  });

  it('returns full file record including extractedContent and extractedMarkdown', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-1',
      userId: 'user-1',
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      fileType: 'document',
      storagePath: 'user-1/file-1/report.pdf',
      status: 'ready',
      extractedContent: 'Full content here',
      extractedMarkdown: '# Report\n\nFull content here',
      classification: null,
      errorMessage: null,
      createdAt: '2026-03-27T10:00:00Z',
      updatedAt: '2026-03-27T10:00:00Z',
    });

    const response = await GET(new Request('http://localhost/api/files/file-1'), {
      params: Promise.resolve({ id: 'file-1' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('file-1');
    expect(body).toHaveProperty('extractedContent', 'Full content here');
    expect(body).toHaveProperty('extractedMarkdown', '# Report\n\nFull content here');
  });
});
