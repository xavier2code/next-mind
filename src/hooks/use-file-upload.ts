'use client';

import { useState, useCallback } from 'react';

interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

/**
 * Hook for file upload functionality.
 * Will be expanded in Plan 03 with full upload API integration.
 */
export function useFileUpload() {
  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(async (file: File) => {
    setState({ isUploading: true, progress: 0, error: null });
    // Placeholder -- will be implemented in Plan 03
    setState({ isUploading: false, progress: 100, error: null });
  }, []);

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return { ...state, upload, reset };
}
