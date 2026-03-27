import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFileDetail } from '@/hooks/use-file-detail';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockFileDetail = {
  id: 'file-1',
  filename: 'report.pdf',
  mimeType: 'application/pdf',
  size: 1024000,
  fileType: 'document',
  status: 'ready',
  createdAt: '2026-03-27T10:00:00Z',
  errorMessage: null,
  extractedContent: 'Full file content here...',
  extractedMarkdown: '# Report\n\nThis is the report content.',
};

describe('useFileDetail', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns expected state shape', () => {
    const { result } = renderHook(() => useFileDetail(null));

    expect(result.current).toHaveProperty('file');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
  });

  it('does NOT fetch on mount when fileId is null', () => {
    renderHook(() => useFileDetail(null));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null file when fileId is null', () => {
    const { result } = renderHook(() => useFileDetail(null));

    expect(result.current.file).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches GET /api/files/[id] when fileId is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFileDetail,
    });

    const { result } = renderHook(() => useFileDetail('file-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('/api/files/file-1');
    expect(result.current.file).toEqual(mockFileDetail);
    expect(result.current.error).toBeNull();
  });

  it('fetches when fileId changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockFileDetail,
    });

    const { rerender } = renderHook(
      ({ id }) => useFileDetail(id),
      { initialProps: { id: 'file-1' as string | null } }
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Change to a different file
    rerender({ id: 'file-2' });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    expect(mockFetch.mock.calls[1][0]).toContain('/api/files/file-2');
  });

  it('does not fetch when fileId changes to null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFileDetail,
    });

    const { rerender, result } = renderHook(
      ({ id }) => useFileDetail(id),
      { initialProps: { id: 'file-1' as string | null } }
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    rerender({ id: null });

    await waitFor(() => {
      expect(result.current.file).toBeNull();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1); // No additional fetch
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error state on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    });

    const { result } = renderHook(() => useFileDetail('nonexistent'));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toContain('无法加载文件内容');
    expect(result.current.file).toBeNull();
  });

  it('sets error state on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFileDetail('file-1'));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toContain('无法加载文件内容');
  });

  it('refetch triggers a new fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockFileDetail,
    });

    const { result } = renderHook(() => useFileDetail('file-1'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
