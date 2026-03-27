'use client';

import { useState, useEffect, useCallback } from 'react';

export interface FileDetail {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  fileType: 'document' | 'code' | 'data';
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  createdAt: string;
  errorMessage: string | null;
  extractedContent: string | null;
  extractedMarkdown: string | null;
}

export interface FileDetailState {
  file: FileDetail | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFileDetail(fileId: string | null): FileDetailState {
  const [file, setFile] = useState<FileDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchCounter, setFetchCounter] = useState(0);

  const refetch = useCallback(() => {
    setFetchCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!fileId) {
      setFile(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchDetail() {
      setIsLoading(true);
      setError(null);
      setFile(null);

      try {
        const res = await fetch(`/api/files/${fileId}`);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: FileDetail = await res.json();

        if (!cancelled) {
          setFile(data);
        }
      } catch {
        if (!cancelled) {
          setError('无法加载文件内容。请重试。');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [fileId, fetchCounter]);

  return { file, isLoading, error, refetch };
}
