'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface FileListItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  fileType: 'document' | 'code' | 'data';
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  createdAt: string;
  errorMessage: string | null;
}

export interface FileListResponse {
  files: FileListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface FileListState {
  files: FileListItem[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const DEFAULT_OPTIONS = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc' as const,
  fileType: 'all' as const,
};

export function useFileList(options: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  fileType?: 'all' | 'document' | 'code' | 'data';
} = {}): FileListState {
  const {
    page = DEFAULT_OPTIONS.page,
    pageSize = DEFAULT_OPTIONS.pageSize,
    sortBy = DEFAULT_OPTIONS.sortBy,
    sortOrder = DEFAULT_OPTIONS.sortOrder,
    fileType = DEFAULT_OPTIONS.fileType,
  } = options;

  const [files, setFiles] = useState<FileListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCounter, setFetchCounter] = useState(0);

  const refetch = useCallback(() => {
    setFetchCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          sortBy,
          sortOrder,
          fileType,
        });

        const res = await fetch(`/api/files?${params}`);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: FileListResponse = await res.json();

        if (!cancelled) {
          setFiles(data.files);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
      } catch {
        if (!cancelled) {
          setError('无法加载文件列表。请刷新页面重试。');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, sortBy, sortOrder, fileType, fetchCounter]);

  return { files, total, page, totalPages, isLoading, error, refetch };
}
