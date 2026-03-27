import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/files/route';
import { NextRequest } from 'next/server';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// Mock DB queries
const mockGetFilesByUserPaginated = vi.fn();
vi.mock('@/lib/db/queries', () => ({
  getFilesByUserPaginated: (...args: unknown[]) => mockGetFilesByUserPaginated(...args),
}));

describe('GET /api/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await GET(new NextRequest('http://localhost/api/files'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns paginated file list with default params', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFilesByUserPaginated.mockResolvedValueOnce({
      files: [
        { id: 'f1', filename: 'report.pdf', fileType: 'document', size: 1024, status: 'ready', createdAt: '2026-03-27T10:00:00Z' },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const response = await GET(new NextRequest('http://localhost/api/files?page=1&pageSize=20'));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.files).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    // Verify no extractedContent/extractedMarkdown in list response
    expect(body.files[0]).not.toHaveProperty('extractedContent');
    expect(body.files[0]).not.toHaveProperty('extractedMarkdown');
  });

  it('filters by fileType', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFilesByUserPaginated.mockResolvedValueOnce({
      files: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    const response = await GET(new NextRequest('http://localhost/api/files?fileType=code'));
    expect(response.status).toBe(200);

    expect(mockGetFilesByUserPaginated).toHaveBeenCalledWith('user-1', expect.objectContaining({
      fileType: 'code',
    }));
  });

  it('supports sorting by filename ascending', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFilesByUserPaginated.mockResolvedValueOnce({
      files: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    const response = await GET(new NextRequest('http://localhost/api/files?sortBy=filename&sortOrder=asc'));
    expect(response.status).toBe(200);

    expect(mockGetFilesByUserPaginated).toHaveBeenCalledWith('user-1', expect.objectContaining({
      sortBy: 'filename',
      sortOrder: 'asc',
    }));
  });
});
