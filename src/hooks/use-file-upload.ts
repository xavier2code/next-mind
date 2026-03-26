'use client';

import { useState, useCallback } from 'react';
import { validateFileClient } from '@/lib/validation/file-validation';
import { ACCEPTED_EXTENSIONS } from '@/lib/storage/types';

export interface PendingFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  error?: string;
  uploadedFile?: {
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    fileType: 'document' | 'code' | 'data';
    storagePath: string;
    status: string;
  };
}

export interface FileUploadState {
  files: PendingFile[];
  isUploading: boolean;
  addFiles: (fileList: FileList) => void;
  removeFile: (id: string) => void;
  retryFile: (id: string) => void;
  clearFiles: () => void;
  getUploadedFileIds: () => string[];
}

const MAX_FILES = 5; // Per D-05

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function uploadFile(
  file: File,
  fileId: string,
  onProgress: (percent: number) => void
): Promise<PendingFile['uploadedFile']> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        // Round to nearest 5 for smoother UX
        onProgress(Math.round(percent / 5) * 5);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error || 'Upload failed. Please try again.'));
        } catch {
          reject(new Error('Upload failed. Please try again.'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed. Check your connection.'));
    });

    xhr.open('POST', '/api/files/upload');
    xhr.send(formData);
  });
}

export function useFileUpload(): FileUploadState {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((fileList: FileList) => {
    const fileArray = Array.from(fileList);

    // Use functional updater to access current files state
    setFiles(prevFiles => {
      const newFiles: PendingFile[] = [];
      const existingCount = prevFiles.filter(f => f.status !== 'error').length;

      for (const file of fileArray) {
        // Check max files (D-05) -- count existing + new non-error files
        const currentCount = existingCount + newFiles.filter(f => f.status !== 'error').length;
        if (currentCount >= MAX_FILES) {
        newFiles.push({
          id: generateTempId(),
          file,
          status: 'error',
          progress: 0,
          error: 'Maximum 5 files per message. Remove a file to add another.',
        });
        continue;
      }

      // Client-side validation (UPLD-03, UPLD-04)
      const validationError = validateFileClient(file);
      if (validationError) {
        newFiles.push({
          id: generateTempId(),
          file,
          status: 'error',
          progress: 0,
          error: validationError,
        });
        continue;
      }

      newFiles.push({
        id: generateTempId(),
        file,
        status: 'pending',
        progress: 0,
      });
    }

      const pendingFiles = newFiles.filter(f => f.status === 'pending');
      if (pendingFiles.length > 0) {
        setIsUploading(true);
        pendingFiles.forEach(pf => {
          uploadSingleFile(pf);
        });
      }

      return [...prevFiles, ...newFiles];
    });
  }, []);

  const uploadSingleFile = useCallback(async (pendingFile: PendingFile) => {
    const fileId = pendingFile.id;

    // Set to uploading
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'uploading' as const, progress: 0 } : f
    ));

    try {
      const result = await uploadFile(
        pendingFile.file,
        fileId,
        (progress) => {
          setFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, progress } : f
          ));
        }
      );

      // Set to uploaded
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'uploaded' as const, progress: 100, uploadedFile: result } : f
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'error' as const, error: errorMessage } : f
      ));
    } finally {
      // Check if all uploads are done
      setFiles(prev => {
        const stillUploading = prev.some(f => f.status === 'uploading');
        if (!stillUploading) setIsUploading(false);
        return prev;
      });
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      const stillUploading = updated.some(f => f.status === 'uploading');
      if (!stillUploading) setIsUploading(false);
      return updated;
    });
  }, []);

  const retryFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (!file) return prev;

      // Reset to pending and re-upload
      const updated = prev.map(f =>
        f.id === id ? { ...f, status: 'pending' as const, progress: 0, error: undefined } : f
      );

      // Trigger upload
      setTimeout(() => uploadSingleFile({ ...file, status: 'pending', progress: 0, error: undefined }), 0);
      setIsUploading(true);

      return updated;
    });
  }, [uploadSingleFile]);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setIsUploading(false);
  }, []);

  const getUploadedFileIds = useCallback(() => {
    return files
      .filter(f => f.status === 'uploaded' && f.uploadedFile)
      .map(f => f.uploadedFile!.id);
  }, [files]);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    retryFile,
    clearFiles,
    getUploadedFileIds,
  };
}
