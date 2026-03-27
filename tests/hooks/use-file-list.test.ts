import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFileList } from '@/hooks/use-file-list';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockFiles = [
  {
    id: 'file-1',
    filename: 'report.pdf',
    mimeType: 'application/pdf',
    size: 1024000,
    fileType: 'document',
    status: 'ready',
    createdAt: '2026-03-27T10:00:00Z',
    errorMessage: null,
  },
  {
    id: 'file-2',
    filename: 'script.py',
    mimeType: 'text/x-python',
    size: 5120,
    fileType: 'code',
    status: 'processing',
    createdAt: '2026-03-27T09:00:00Z',
    errorMessage: null,
  },
];

const mockResponse = {
  files: mockFiles,
  total: 42,
  page: 1,
  totalPages: 3,
};

describe('useFileList', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns expected state shape', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useFileList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty('files');
    expect(result.current).toHaveProperty('total');
    expect(result.current).toHaveProperty('page');
    expect(result.current).toHaveProperty('totalPages');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
  });

  it('fetches GET /api/files with default params on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(() => useFileList());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/api/files');
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).toContain('pageSize=20');
    expect(calledUrl).toContain('sortBy=createdAt');
    expect(calledUrl).toContain('sortOrder=desc');
    expect(calledUrl).toContain('fileType=all');
  });

  it('calls fetch with correct query params when options change', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { rerender } = renderHook(
      ({ page, sortBy, fileType }) => useFileList({ page, sortBy, fileType }),
      { initialProps: { page: 1, sortBy: 'createdAt', fileType: 'all' as const } }
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Change page and sort
    rerender({ page: 2, sortBy: 'filename', fileType: 'document' as const });

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    const lastCallUrl = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
    expect(lastCallUrl).toContain('page=2');
    expect(lastCallUrl).toContain('sortBy=filename');
    expect(lastCallUrl).toContain('fileType=document');
  });

  it('returns files and pagination state after successful fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useFileList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.files).toEqual(mockFiles);
    expect(result.current.total).toBe(42);
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.error).toBeNull();
  });

  it('sets error state on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    });

    const { result } = renderHook(() => useFileList());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toContain('无法加载文件列表');
  });

  it('sets error state on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFileList());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toContain('无法加载文件列表');
  });

  it('refetch triggers a new fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useFileList());

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
