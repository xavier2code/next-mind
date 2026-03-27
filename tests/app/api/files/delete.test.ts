import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/files/[id]/route';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// Mock DB queries
const mockGetFileById = vi.fn();
const mockDeleteDbFile = vi.fn();
vi.mock('@/lib/db/queries', () => ({
  getFileById: (...args: unknown[]) => mockGetFileById(...args),
  deleteFile: (...args: unknown[]) => mockDeleteDbFile(...args),
}));

// Mock storage provider
const mockDeleteStorageFile = vi.fn();
vi.mock('@/lib/storage/provider', () => ({
  deleteFile: (...args: unknown[]) => mockDeleteStorageFile(...args),
}));

// Mock audit
const mockLogAudit = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

describe('DELETE /api/files/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await DELETE(new Request('http://localhost/api/files/test-id', { method: 'DELETE' }), {
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
      storagePath: 'user-2/test-id/secret.pdf',
    });

    const response = await DELETE(new Request('http://localhost/api/files/test-id', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'test-id' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('File not found');
  });

  it('returns 404 when file not found', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce(undefined);

    const response = await DELETE(new Request('http://localhost/api/files/nonexistent', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('File not found');
  });

  it('deletes storage and DB record, returns success', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-1',
      userId: 'user-1',
      filename: 'report.pdf',
      storagePath: 'user-1/file-1/report.pdf',
    });
    mockDeleteStorageFile.mockResolvedValueOnce(undefined);
    mockDeleteDbFile.mockResolvedValueOnce({ id: 'file-1' });

    const response = await DELETE(new Request('http://localhost/api/files/file-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'file-1' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockDeleteStorageFile).toHaveBeenCalledWith('user-1/file-1/report.pdf');
    expect(mockDeleteDbFile).toHaveBeenCalledWith('file-1', 'user-1');
  });

  it('logs file_delete audit event', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-1',
      userId: 'user-1',
      filename: 'report.pdf',
      storagePath: 'user-1/file-1/report.pdf',
    });
    mockDeleteStorageFile.mockResolvedValueOnce(undefined);
    mockDeleteDbFile.mockResolvedValueOnce({ id: 'file-1' });
    mockLogAudit.mockResolvedValueOnce(undefined);

    await DELETE(new Request('http://localhost/api/files/file-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'file-1' }),
    });

    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'file_delete',
      resource: 'file',
      resourceId: 'file-1',
      metadata: { filename: 'report.pdf' },
    }));
  });

  it('gracefully handles storage deletion failure', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } });
    mockGetFileById.mockResolvedValueOnce({
      id: 'file-1',
      userId: 'user-1',
      filename: 'report.pdf',
      storagePath: 'user-1/file-1/report.pdf',
    });
    mockDeleteStorageFile.mockRejectedValueOnce(new Error('Storage not found'));
    mockDeleteDbFile.mockResolvedValueOnce({ id: 'file-1' });

    const response = await DELETE(new Request('http://localhost/api/files/file-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'file-1' }),
    });

    // Should still succeed -- storage failure is fire-and-forget
    expect(response.status).toBe(200);
    expect(mockDeleteDbFile).toHaveBeenCalled();
  });
});
