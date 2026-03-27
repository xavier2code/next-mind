'use client';

import { useState, useCallback, useEffect } from 'react';
import { validateFileClient } from '@/lib/validation/file-validation';
import { ACCEPTED_EXTENSIONS } from '@/lib/storage/types';
import { useFileExtractionStatus } from './use-file-extraction-status';

export interface PendingFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'ready' | 'error';
  progress: number;
  error?: string;
  extractedMarkdown?: string;  // Fetched when file becomes 'ready' (for inline editor)
  editedContent?: string;  // User-edited Markdown content (overrides extractedMarkdown)
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
  setEditedContent: (fileId: string, content: string) => void;
  getEditedContent: (fileId: string) => string | undefined;
  getExtractedMarkdown: (fileId: string) => string | undefined;
  getEditedContentsMap: () => Map<string, string>;
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
  const extractionStatus = useFileExtractionStatus();

  // Start extraction status polling when files finish uploading
  useEffect(() => {
    const uploadedFileIds = files
      .filter(f => f.status === 'uploaded' && f.uploadedFile)
      .map(f => f.uploadedFile!.id);
    if (uploadedFileIds.length > 0) {
      extractionStatus.startPolling(uploadedFileIds);
    }
  }, [files, extractionStatus]);

  // Sync extraction status to file state
  useEffect(() => {
    const newStatuses = Object.entries(extractionStatus.statuses);
    if (newStatuses.length === 0) return;

    setFiles(prev => prev.map(f => {
      if (!f.uploadedFile) return f;
      const extractionStatusValue = extractionStatus.statuses[f.uploadedFile.id];
      if (!extractionStatusValue) return f;
      if (f.status === 'uploaded' && extractionStatusValue === 'processing') {
        return { ...f, status: 'processing' };
      }
      if (f.status === 'processing' && extractionStatusValue === 'ready') {
        // Fetch extractedMarkdown for the inline editor
        fetch(`/api/files/${f.uploadedFile!.id}`)
          .then(r => r.json())
          .then(data => {
            setFiles(prev => prev.map(pf =>
              pf.id === f.id ? { ...pf, status: 'ready' as const, extractedMarkdown: data.extractedMarkdown } : pf
            ));
          })
          .catch(() => {
            setFiles(prev => prev.map(pf =>
              pf.id === f.id ? { ...pf, status: 'ready' as const } : pf
            ));
          });
        return f; // Don't update yet, will update after fetch
      }
      if (f.status === 'processing' && extractionStatusValue === 'failed') {
        return { ...f, status: 'error', error: 'Extraction failed' };
      }
      return f;
    }));
  }, [extractionStatus.statuses]);

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
      .filter(f => (f.status === 'uploaded' || f.status === 'ready') && f.uploadedFile)
      .map(f => f.uploadedFile!.id);
  }, [files]);

  // Set edited content for a specific file
  const setEditedContent = useCallback((fileId: string, content: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, editedContent: content } : f
    ));
  }, []);

  // Get edited content for a specific file
  const getEditedContent = useCallback((fileId: string): string | undefined => {
    const file = files.find(f => f.id === fileId);
    return file?.editedContent;
  }, [files]);

  // Get extractedMarkdown for a specific file
  const getExtractedMarkdown = useCallback((fileId: string): string | undefined => {
    const file = files.find(f => f.id === fileId);
    return file?.extractedMarkdown;
  }, [files]);

  // Build a map of fileId -> editedContent for all files that have edits
  const getEditedContentsMap = useCallback((): Map<string, string> => {
    const map = new Map<string, string>();
    for (const f of files) {
      if (f.editedContent) {
        map.set(f.uploadedFile?.id || f.id, f.editedContent);
      }
    }
    return map;
  }, [files]);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    retryFile,
    clearFiles,
    getUploadedFileIds,
    setEditedContent,
    getEditedContent,
    getExtractedMarkdown,
    getEditedContentsMap,
  };
}
