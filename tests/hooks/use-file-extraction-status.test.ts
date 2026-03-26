import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileExtractionStatus } from '@/hooks/use-file-extraction-status';

describe('useFileExtractionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty statuses and isPolling false', () => {
    const { result } = renderHook(() => useFileExtractionStatus());
    expect(result.current.statuses).toEqual({});
    expect(result.current.isPolling).toBe(false);
  });

  it('should set isPolling true and set initial processing status when startPolling is called', () => {
    const { result } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1']);
    });

    expect(result.current.isPolling).toBe(true);
    expect(result.current.statuses['file-1']).toBe('processing');
  });

  it('should poll API and update status to ready', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ready' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1']);
    });

    // Wait for the initial poll to resolve
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/files/file-1/status');
    expect(result.current.statuses['file-1']).toBe('ready');
    // After ready, polling should stop for this file
    expect(result.current.isPolling).toBe(false);
  });

  it('should poll API and update status to failed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'failed' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1']);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.statuses['file-1']).toBe('failed');
    expect(result.current.isPolling).toBe(false);
  });

  it('should keep polling when status is processing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'processing' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1']);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.statuses['file-1']).toBe('processing');
    expect(result.current.isPolling).toBe(true);

    // Advance 2 seconds to trigger next poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should stop polling individual file when status is ready but keep polling others', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      const fileId = url.split('/').slice(-2, -1)[0];
      if (fileId === 'file-1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ready' }),
        });
      }
      // file-2 stays processing
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'processing' }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1', 'file-2']);
    });

    // Initial poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.statuses['file-1']).toBe('ready');
    expect(result.current.statuses['file-2']).toBe('processing');
    expect(result.current.isPolling).toBe(true);

    // Advance 2 seconds -- only file-2 should be polled
    const callsBefore = mockFetch.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // file-1 should not be polled again
    const callsAfter = mockFetch.mock.calls.length;
    expect(callsAfter).toBe(callsBefore + 1);
  });

  it('should set isPolling false when all files reach terminal state', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ready' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1', 'file-2']);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.statuses['file-1']).toBe('ready');
    expect(result.current.statuses['file-2']).toBe('ready');
    expect(result.current.isPolling).toBe(false);
  });

  it('should stopPolling clear interval and reset state', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'processing' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1']);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.isPolling).toBe(true);

    act(() => {
      result.current.stopPolling();
    });

    expect(result.current.isPolling).toBe(false);

    // Advance timers -- no more polls should happen
    const callsBefore = mockFetch.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(mockFetch.mock.calls.length).toBe(callsBefore);
  });

  it('should handle network error silently and retry next interval', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ready' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1']);
    });

    // First poll fails
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Status should still be processing (initial value set by startPolling)
    expect(result.current.statuses['file-1']).toBe('processing');
    expect(result.current.isPolling).toBe(true);

    // Next poll succeeds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.statuses['file-1']).toBe('ready');
    expect(result.current.isPolling).toBe(false);
  });

  it('should skip files with non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1']);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should still be processing since the response was not ok
    expect(result.current.statuses['file-1']).toBe('processing');
    expect(result.current.isPolling).toBe(true);
  });

  it('should cleanup interval on unmount', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'processing' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result, unmount } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1']);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    unmount();

    // Advance timers -- no more polls after unmount
    const callsBefore = mockFetch.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(mockFetch.mock.calls.length).toBe(callsBefore);
  });

  it('should support adding new file IDs to existing polling', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'processing' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useFileExtractionStatus());

    act(() => {
      result.current.startPolling(['file-1']);
    });

    // Add file-2 while file-1 is being polled
    act(() => {
      result.current.startPolling(['file-2']);
    });

    expect(result.current.statuses['file-1']).toBe('processing');
    expect(result.current.statuses['file-2']).toBe('processing');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // First poll only polled file-1 (was triggered before file-2 was added)
    // Next interval poll should pick up both
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Two polls total: initial (file-1 only) + interval (file-1 + file-2)
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
