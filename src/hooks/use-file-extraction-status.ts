'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface FileExtractionStatus {
  [fileId: string]: 'processing' | 'ready' | 'failed';
}

export interface UseFileExtractionStatusReturn {
  statuses: FileExtractionStatus;
  isPolling: boolean;
  startPolling: (fileIds: string[]) => void;
  stopPolling: () => void;
}

const POLL_INTERVAL = 2000; // 2 seconds per 08-UI-SPEC

export function useFileExtractionStatus(): UseFileExtractionStatusReturn {
  const [statuses, setStatuses] = useState<FileExtractionStatus>({});
  const [isPolling, setIsPolling] = useState(false);
  const activeFileIds = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    const ids = Array.from(activeFileIds.current);
    if (ids.length === 0) {
      setIsPolling(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Poll each active file
    for (const fileId of ids) {
      try {
        const res = await fetch(`/api/files/${fileId}/status`);
        if (!res.ok) continue; // Skip on error, retry next interval
        const data = await res.json();

        setStatuses(prev => ({ ...prev, [fileId]: data.status }));

        // Stop polling terminal states
        if (data.status === 'ready' || data.status === 'failed') {
          activeFileIds.current.delete(fileId);
        }
      } catch {
        // Network error: silently retry next interval
      }
    }

    // Check if all files are terminal
    if (activeFileIds.current.size === 0) {
      setIsPolling(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, []);

  const startPolling = useCallback((fileIds: string[]) => {
    // Add new file IDs to active set
    for (const id of fileIds) {
      activeFileIds.current.add(id);
      setStatuses(prev => ({ ...prev, [id]: 'processing' }));
    }
    setIsPolling(true);

    // Start interval if not already running
    if (!intervalRef.current) {
      intervalRef.current = setInterval(poll, POLL_INTERVAL);
      // Poll immediately for first check
      poll();
    }
  }, [poll]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    activeFileIds.current.clear();
    setIsPolling(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { statuses, isPolling, startPolling, stopPolling };
}
