'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from './model-selector';
import { FileUploadButton } from '@/components/files/file-upload-button';
import { FileChip } from '@/components/files/file-chip';
import { useFileUpload } from '@/hooks/use-file-upload';

interface ChatInputProps {
  onSend: (message: string, fileIds?: string[]) => void;
  modelId: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, modelId, onModelChange, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0); // Per 07-UI-SPEC: counter approach for child element dragleave fix
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const {
    files,
    isUploading,
    addFiles,
    removeFile,
    retryFile,
    clearFiles,
    getUploadedFileIds,
  } = useFileUpload();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && files.length === 0) || disabled || isUploading) return;

    const fileIds = getUploadedFileIds();
    onSend(input.trim(), fileIds.length > 0 ? fileIds : undefined);
    setInput('');
    clearFiles();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  // Drag-and-drop handlers (per 07-UI-SPEC Pitfall 4)
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);

  const hasUploadedFiles = files.some(f => f.status === 'uploaded' || f.status === 'uploading');
  const canSend = (input.trim() || hasUploadedFiles) && !disabled && !isUploading;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative border-t bg-white p-4 transition-colors ${
        isDragging
          ? 'border-blue-500 border-dashed'
          : 'border-zinc-200 border-solid'
      }`}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div
          role="region"
          aria-label="File drop zone"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-blue-50/80 dark:bg-blue-950/20 backdrop-blur-sm"
        >
          <p className="text-sm font-medium text-blue-600">Drop file here</p>
          <p className="text-xs text-blue-500">Release to upload</p>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2">
          <FileUploadButton
            onFilesSelected={addFiles}
            disabled={disabled || isUploading}
          />
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              disabled={disabled}
              className="min-h-[44px] max-h-[200px] resize-none"
              rows={1}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            className="h-11 w-11 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* File chips row */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {files.map((file) => (
              <FileChip
                key={file.id}
                filename={file.file.name}
                size={file.file.size}
                status={file.status}
                progress={file.progress}
                error={file.error}
                fileType={file.uploadedFile?.fileType}
                onRemove={() => removeFile(file.id)}
                onRetry={file.status === 'error' ? () => retryFile(file.id) : undefined}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <ModelSelector value={modelId} onChange={onModelChange} />
          <span className="text-xs text-zinc-400">
            Press Enter to send
          </span>
        </div>
      </div>
    </form>
  );
}
